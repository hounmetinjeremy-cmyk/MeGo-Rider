import { json, CORS_PREFLIGHT, fedaBase, sbHeaders, sbUrl } from "../_shared.js";

// POST /api/verify { order_id } ou { deposit_id } : filet de securite du webhook.
// Demande a FedaPay si la transaction (commande ou depot) est approuvee (statut + montant re-verifies chez FedaPay),
// et dans ce cas valide la commande / credite le portefeuille. Sans danger si on l'appelle plusieurs fois.
export const onRequestOptions = () => CORS_PREFLIGHT();

const UUID = /^[0-9a-f-]{36}$/i;

// Statut d'une transaction chez FedaPay (jamais cru sur parole).
async function fedaStatus(env, ref) {
  const vr = await fetch(`${fedaBase(env)}/transactions/${encodeURIComponent(ref)}`, {
    headers: { Authorization: `Bearer ${env.FEDAPAY_SECRET_KEY}` },
  });
  const vd = await vr.json().catch(() => ({}));
  const real = vd["v1/transaction"] ?? vd.transaction ?? vd;
  if (!vr.ok) return { status: "unknown", amount: 0 };
  return { status: real?.status ?? "unknown", amount: Number(real?.amount) };
}

async function rpcCall(env, fn, body) {
  const r = await fetch(sbUrl(env, `/rest/v1/rpc/${fn}`), { method: "POST", headers: sbHeaders(env), body: JSON.stringify(body) });
  return await r.json().catch(() => ({}));
}

async function readOne(env, path) {
  const r = await fetch(sbUrl(env, path), { headers: sbHeaders(env) });
  const rows = await r.json().catch(() => []);
  return Array.isArray(rows) ? rows[0] : null;
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.FEDAPAY_SECRET_KEY || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      return json({ ok: false, error: "Paiement non configure" }, 500);
    }
    const body = await request.json().catch(() => ({}));

    // --- depot dans un portefeuille ---
    if (body.deposit_id !== undefined) {
      const depositId = String(body.deposit_id ?? "");
      if (!UUID.test(depositId)) return json({ ok: false, error: "deposit_id invalide" }, 400);
      const dep = await readOne(env, `/rest/v1/deposits?id=eq.${depositId}&select=status,ref,amount&limit=1`);
      if (!dep) return json({ ok: false, error: "Depot introuvable" }, 404);
      if (dep.status === "CONFIRMED") return json({ ok: true, paid: true });
      if (dep.status !== "PENDING" || !dep.ref) return json({ ok: true, paid: false });
      const f = await fedaStatus(env, dep.ref);
      if (f.status !== "approved") return json({ ok: true, paid: false, status: f.status });
      const out = await rpcCall(env, "confirm_deposit_ref", { p_ref: String(dep.ref), p_amount: f.amount });
      return json({ ok: true, paid: !!(out && out.ok), status: "approved" });
    }

    // --- paiement d'une commande ---
    const orderId = String(body.order_id ?? "");
    if (!UUID.test(orderId)) return json({ ok: false, error: "order_id invalide" }, 400);
    const order = await readOne(env, `/rest/v1/orders?id=eq.${orderId}&select=payment_status,payment_ref&limit=1`);
    if (!order) return json({ ok: false, error: "Commande introuvable" }, 404);
    if (order.payment_status === "PAID") return json({ ok: true, paid: true });
    if (order.payment_status !== "PENDING" || !order.payment_ref || order.payment_ref === "TEST") {
      return json({ ok: true, paid: false });
    }
    const f = await fedaStatus(env, order.payment_ref);
    if (f.status !== "approved") return json({ ok: true, paid: false, status: f.status });
    const out = await rpcCall(env, "confirm_payment_ref", { p_ref: String(order.payment_ref), p_amount: f.amount });
    return json({ ok: true, paid: !!(out && out.ok), status: "approved" });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "Erreur serveur" }, 500);
  }
}
