import { json, CORS_PREFLIGHT, ALLOWED, mobilePush, sbHeaders, sbUrl } from "../_shared.js";

// POST /api/ai-subscribe : le vendeur connecte paie l'abonnement mensuel de l'assistant IA (Mobile Money via FedaPay).
// Le prix vient de la base (reglage ai_subscription_price) ; l'activation (30 jours) se fait au webhook, apres confirmation du paiement.
export const onRequestOptions = () => CORS_PREFLIGHT();

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = String(body.token ?? "");
    const country = String(body.country ?? "").toLowerCase();
    const operator = String(body.operator ?? "");
    const phone = String(body.phone ?? "").replace(/\D/g, "");

    if (token.length < 20) return json({ error: "Session invalide" }, 401);
    if (!ALLOWED[country] || !ALLOWED[country].includes(operator)) return json({ error: "Pays ou operateur invalide" }, 400);
    if (phone.length < 8 || phone.length > 10) return json({ error: "Numero de telephone invalide" }, 400);

    const sr = await fetch(sbUrl(env, "/rest/v1/rpc/session_info"), { method: "POST", headers: sbHeaders(env), body: JSON.stringify({ p_token: token }) });
    const session = await sr.json().catch(() => ({}));
    if (!session?.ok || session.kind !== "vendor") return json({ error: "Connecte-toi comme vendeur" }, 401);

    const pr = await fetch(sbUrl(env, "/rest/v1/app_settings?key=eq.ai_subscription_price&select=value&limit=1"), { headers: sbHeaders(env) });
    const prow = await pr.json().catch(() => []);
    const amount = Math.round(Number(Array.isArray(prow) && prow[0] ? prow[0].value : 500));
    if (!(amount > 0)) return json({ error: "Prix invalide" }, 500);

    const txId = await mobilePush(env, { amount, description: "MeGo Assistant IA (30 jours)", phone, country, operator });

    const ir = await fetch(sbUrl(env, "/rest/v1/ai_subscriptions"), {
      method: "POST",
      headers: { ...sbHeaders(env), Prefer: "return=minimal" },
      body: JSON.stringify({ vendor_id: session.owner_id, amount, payment_ref: String(txId) }),
    });
    if (!ir.ok) return json({ error: "Abonnement non enregistre" }, 500);

    return json({ ok: true, transactionId: txId, message: "Demande envoyee sur ton telephone. Valide avec ton code." });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erreur serveur" }, 500);
  }
}
