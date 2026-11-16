import { json, CORS_PREFLIGHT, ALLOWED, fedapay, sbHeaders, sbUrl } from "../_shared.js";

// POST /api/checkout : paiement Mobile Money DANS l'application (meme enchainement que Chap-money).
// Le MONTANT est lu dans la base (jamais envoye par le navigateur).
export const onRequestOptions = () => CORS_PREFLIGHT();

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));
    const orderId = String(body.order_id ?? "");
    const country = String(body.country ?? "").toLowerCase();
    const operator = String(body.operator ?? "");
    const phone = String(body.phone ?? "").replace(/\D/g, "");

    if (!/^[0-9a-f-]{36}$/i.test(orderId)) return json({ error: "order_id invalide" }, 400);
    if (!ALLOWED[country] || !ALLOWED[country].includes(operator)) return json({ error: "Pays ou operateur invalide" }, 400);
    if (phone.length < 8 || phone.length > 10) return json({ error: "Numero de telephone invalide" }, 400);

    const or = await fetch(sbUrl(env, `/rest/v1/orders?id=eq.${orderId}&select=id,amount,order_code,payment_status&limit=1`), { headers: sbHeaders(env) });
    const rows = await or.json();
    const order = Array.isArray(rows) ? rows[0] : null;
    if (!order) return json({ error: "Commande introuvable" }, 404);
    if (order.payment_status !== "PENDING") return json({ error: "Commande deja payee ou fermee" }, 409);
    const amount = Math.round(Number(order.amount));
    if (!(amount > 0)) return json({ error: "Montant invalide" }, 400);

    // 1) transaction
    let tx;
    try {
      const created = await fedapay(env, "/transactions", {
        description: `MeGo ${order.order_code ?? ""}`.trim(),
        amount,
        currency: { iso: "XOF" },
        customer: {
          firstname: env.FEDAPAY_CUSTOMER_FIRSTNAME || "Client",
          lastname: env.FEDAPAY_CUSTOMER_LASTNAME || "MeGo",
          email: env.FEDAPAY_CUSTOMER_EMAIL || "hounmetinjeremy@gmail.com",
          phone_number: { number: phone, country },
        },
        mode: operator,
      });
      tx = created["v1/transaction"] ?? created.transaction ?? created;
    } catch (e) {
      throw new Error(`[etape 1 - creation] ${e.message}`);
    }
    const txId = tx?.id;
    if (!txId) throw new Error("ID transaction FedaPay introuvable");

    // 2) token
    let token;
    try {
      const t = await fedapay(env, `/transactions/${txId}/token`, {});
      token = typeof t.token === "string" ? t.token : t.token?.token;
      if (!token) throw new Error("Token FedaPay introuvable");
    } catch (e) {
      throw new Error(`[etape 2 - token] ${e.message}`);
    }

    // 3) demande envoyee sur le telephone du client
    try {
      await fedapay(env, `/${operator}`, { token, phone_number: { number: phone, country } });
    } catch (e) {
      throw new Error(`[etape 3 - envoi telephone] ${e.message}`);
    }

    // 4) on memorise la transaction sur la commande (la confirmation arrive par le webhook)
    const ar = await fetch(sbUrl(env, "/rest/v1/rpc/attach_payment"), {
      method: "POST",
      headers: sbHeaders(env),
      body: JSON.stringify({ p_order_id: order.id, p_ref: String(txId) }),
    });
    const att = await ar.json().catch(() => ({}));
    if (!att?.ok) return json({ error: att?.error ?? "Paiement non enregistre" }, 500);

    return json({ ok: true, transactionId: txId, message: "Demande envoyee sur ton telephone. Valide avec ton code." });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erreur serveur" }, 500);
  }
}
