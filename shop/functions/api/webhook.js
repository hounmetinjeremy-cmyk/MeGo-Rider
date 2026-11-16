import { json, fedaBase, sbHeaders, sbUrl, hmacHex, safeEqual } from "../_shared.js";

// POST /api/webhook : webhook FedaPay (a declarer dans FedaPay : https://<ton-site>/api/webhook).
// Signature : en-tete X-FEDAPAY-SIGNATURE = "t=...,v1=..." ; HMAC-SHA256 de "<t>.<corps brut>" avec le secret du webhook (comme Chap-money).
// En plus, on RE-VERIFIE la transaction chez FedaPay (statut + montant) avant de valider une commande OU un abonnement IA.
export async function onRequestPost({ request, env }) {
  const secret = env.FEDAPAY_WEBHOOK_SECRET;
  if (!secret || !env.FEDAPAY_SECRET_KEY) return json({ error: "Secrets FedaPay non configures" }, 500);

  const raw = await request.text();
  const header = request.headers.get("x-fedapay-signature") ?? "";
  const parts = Object.fromEntries(header.split(",").map((p) => p.trim().split("=")));
  const t = parts.t;
  const v1 = (parts.v1 ?? "").toLowerCase();
  if (!t || !v1 || !safeEqual(v1, await hmacHex(secret, `${t}.${raw}`))) return json({ error: "Signature invalide" }, 401);

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json({ error: "JSON invalide" }, 400);
  }

  const event = String(payload.event ?? payload.name ?? "");
  if (event !== "transaction.approved") return json({ received: true, ignored: event });

  const data = payload.data ?? payload.entity ?? {};
  const tx = data["v1/transaction"] ?? data.transaction ?? data;
  const id = tx?.id;
  if (!id) return json({ error: "Transaction manquante" }, 400);

  const vr = await fetch(`${fedaBase(env)}/transactions/${id}`, { headers: { Authorization: `Bearer ${env.FEDAPAY_SECRET_KEY}` } });
  const vd = await vr.json().catch(() => ({}));
  const real = vd["v1/transaction"] ?? vd.transaction ?? vd;
  if (!vr.ok || real?.status !== "approved") return json({ error: "Transaction non approuvee chez FedaPay" }, 409);

  const call = async (fn) => {
    const r = await fetch(sbUrl(env, `/rest/v1/rpc/${fn}`), {
      method: "POST",
      headers: sbHeaders(env),
      body: JSON.stringify({ p_ref: String(id), p_amount: Number(real.amount) }),
    });
    return { ok: r.ok, out: await r.json().catch(() => ({})) };
  };

  // 1) paiement d'une commande ?
  let res = await call("confirm_payment_ref");
  // 2) sinon : abonnement de l'assistant IA ?
  if (res.ok && res.out && res.out.ok === false && String(res.out.error || "").startsWith("Aucune commande")) {
    res = await call("confirm_ai_subscription");
  }
  return json({ received: true, result: res.out }, res.ok ? 200 : 500);
}
