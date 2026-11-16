// Paiement Mobile Money FedaPay (Cloudflare Pages Function) : meme enchainement que la fonction Supabase
// "fedapay-checkout" : 1) transaction  2) token  3) demande envoyee sur le telephone du client.
// Le MONTANT est lu dans la base (jamais envoye par le client).
// Secrets Cloudflare (Settings > Variables and Secrets, type Secret) :
//   FEDAPAY_SECRET_KEY, FEDAPAY_MODE (sandbox | live), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Facultatifs : FEDAPAY_CUSTOMER_EMAIL, FEDAPAY_CUSTOMER_FIRSTNAME, FEDAPAY_CUSTOMER_LASTNAME

// Operateurs FedaPay sans redirection, par pays
const ALLOWED = {
  bj: ["mtn_open", "moov", "sbin", "momo_test"],
  tg: ["moov_tg", "togocel", "momo_test"],
  ci: ["mtn_ci", "momo_test"],
  ne: ["airtel_ne", "momo_test"],
  sn: ["free_sn", "momo_test"],
  gn: ["mtn_open_gn", "momo_test"],
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function apiBase(env) {
  return (env.FEDAPAY_MODE || "sandbox") === "live"
    ? "https://api.fedapay.com/v1"
    : "https://sandbox-api.fedapay.com/v1";
}

async function fedapay(env, path, body) {
  if (!env.FEDAPAY_SECRET_KEY) throw new Error("FEDAPAY_SECRET_KEY non configuree");
  const r = await fetch(`${apiBase(env)}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.FEDAPAY_SECRET_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let data = {};
  try {
    if (text.trim()) data = JSON.parse(text);
  } catch {
    /* reponse non JSON */
  }
  if (!r.ok) throw new Error(`FedaPay [${r.status}] ${data?.message ?? data?.error ?? text.trim().slice(0, 300)}`);
  return data;
}

export async function onRequest({ request, env }) {
  if (request.method !== "POST") return json({ error: "POST uniquement" }, 405);

  // Appel autorise uniquement depuis la boutique elle-meme (meme origine)
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return json({ error: "Origine non autorisee" }, 403);

  try {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return json({ error: "Paiement non configure" }, 500);

    const body = await request.json().catch(() => ({}));
    const orderId = String(body.order_id ?? "");
    const country = String(body.country ?? "").toLowerCase();
    const operator = String(body.operator ?? "");
    const phone = String(body.phone ?? "").replace(/\D/g, "");

    if (!/^[0-9a-f-]{36}$/i.test(orderId)) return json({ error: "order_id invalide" }, 400);
    if (!ALLOWED[country] || !ALLOWED[country].includes(operator)) return json({ error: "Pays ou operateur invalide" }, 400);
    if (phone.length < 8 || phone.length > 10) return json({ error: "Numero de telephone invalide" }, 400);

    const base = String(env.SUPABASE_URL).replace(/\/$/, "");
    const srk = env.SUPABASE_SERVICE_ROLE_KEY;
    const sb = { apikey: srk, Authorization: `Bearer ${srk}`, "Content-Type": "application/json" };

    const or = await fetch(
      `${base}/rest/v1/orders?id=eq.${orderId}&select=id,amount,order_code,payment_status&limit=1`,
      { headers: sb }
    );
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
          email: env.FEDAPAY_CUSTOMER_EMAIL || "client@mego-shop.pages.dev",
          phone_number: { number: phone, country },
        },
        mode: operator,
      });
      tx = created["v1/transaction"] ?? created.transaction ?? created;
    } catch (e) {
      throw new Error(`[etape 1 - creation] ${e instanceof Error ? e.message : String(e)}`);
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
      throw new Error(`[etape 2 - token] ${e instanceof Error ? e.message : String(e)}`);
    }

    // 3) demande envoyee sur le telephone du client
    try {
      await fedapay(env, `/${operator}`, { token, phone_number: { number: phone, country } });
    } catch (e) {
      throw new Error(`[etape 3 - envoi telephone] ${e instanceof Error ? e.message : String(e)}`);
    }

    // 4) on memorise la transaction sur la commande (la confirmation arrive par le webhook)
    const ar = await fetch(`${base}/rest/v1/rpc/attach_payment`, {
      method: "POST",
      headers: sb,
      body: JSON.stringify({ p_order_id: order.id, p_ref: String(txId) }),
    });
    const att = await ar.json().catch(() => ({}));
    if (!att?.ok) return json({ error: att?.error ?? "Paiement non enregistre" }, 500);

    return json({ ok: true, transactionId: txId, message: "Demande envoyee sur ton telephone. Valide avec ton code." });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erreur serveur" }, 500);
  }
}
