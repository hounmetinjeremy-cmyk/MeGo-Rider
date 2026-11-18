import { json, CORS_PREFLIGHT, fedaBase, sbHeaders, sbUrl } from "../_shared.js";

// POST /api/verify { order_id } : filet de securite du webhook.
// Demande a FedaPay si la transaction de la commande est approuvee (statut + montant re-verifies chez FedaPay),
// et dans ce cas valide la commande. Sans danger si on l'appelle plusieurs fois (deja payee = ok, rien ne change).
export const onRequestOptions = () => CORS_PREFLIGHT();

export async function onRequestPost({ request, env }) {
  try {
    if (!env.FEDAPAY_SECRET_KEY || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      return json({ ok: false, error: "Paiement non configure" }, 500);
    }
    const body = await request.json().catch(() => ({}));
    const orderId = String(body.order_id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(orderId)) return json({ ok: false, error: "order_id invalide" }, 400);

    const or = await fetch(sbUrl(env, `/rest/v1/orders?id=eq.${orderId}&select=payment_status,payment_ref&limit=1`), { headers: sbHeaders(env) });
    const rows = await or.json();
    const order = Array.isArray(rows) ? rows[0] : null;
    if (!order) return json({ ok: false, error: "Commande introuvable" }, 404);
    if (order.payment_status === "PAID") return json({ ok: true, paid: true });
    if (order.payment_status !== "PENDING" || !order.payment_ref || order.payment_ref === "TEST") {
      return json({ ok: true, paid: false });
    }

    const vr = await fetch(`${fedaBase(env)}/transactions/${encodeURIComponent(order.payment_ref)}`, {
      headers: { Authorization: `Bearer ${env.FEDAPAY_SECRET_KEY}` },
    });
    const vd = await vr.json().catch(() => ({}));
    const real = vd["v1/transaction"] ?? vd.transaction ?? vd;
    if (!vr.ok) return json({ ok: true, paid: false, status: "unknown" });
    if (real?.status !== "approved") return json({ ok: true, paid: false, status: real?.status ?? "unknown" });

    const r = await fetch(sbUrl(env, "/rest/v1/rpc/confirm_payment_ref"), {
      method: "POST",
      headers: sbHeaders(env),
      body: JSON.stringify({ p_ref: String(order.payment_ref), p_amount: Number(real.amount) }),
    });
    const out = await r.json().catch(() => ({}));
    return json({ ok: true, paid: !!(out && out.ok), status: "approved" });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "Erreur serveur" }, 500);
  }
}
