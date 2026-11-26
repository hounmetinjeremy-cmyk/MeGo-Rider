import { json, CORS_PREFLIGHT, ALLOWED, mobilePush, sbHeaders, sbUrl } from "../_shared.js";

// POST /api/deposit { token, amount, country, operator, phone } : depot dans le portefeuille (client, vendeur ou livreur)
// par Mobile Money FedaPay. Le jeton de session identifie le portefeuille ; la base verifie le jeton et le montant
// (500 a 500 000 F). Le credit du solde n'a lieu qu'apres confirmation de FedaPay (webhook ou /api/verify).
export const onRequestOptions = () => CORS_PREFLIGHT();

// Garde la raison d'un echec sur le depot (colonne deposits.error) : visible dans la base, sans fouiller les logs.
async function recordFailure(env, depositId, message) {
  try {
    await fetch(sbUrl(env, "/rest/v1/rpc/fail_deposit"), {
      method: "POST",
      headers: sbHeaders(env),
      body: JSON.stringify({ p_deposit_id: depositId, p_error: String(message || "echec") }),
    });
  } catch (e) {}
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.FEDAPAY_SECRET_KEY || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      return json({ ok: false, error: "Paiement non configure" }, 500);
    }
    const body = await request.json().catch(() => ({}));
    const token = String(body.token ?? "");
    const amount = Math.round(Number(body.amount));
    const country = String(body.country ?? "").toLowerCase();
    const operator = String(body.operator ?? "");
    const phone = String(body.phone ?? "").replace(/\D/g, "");

    if (!token || token.length > 200) return json({ ok: false, error: "Connecte-toi a ton portefeuille" }, 401);
    if (!(amount >= 500 && amount <= 500000)) return json({ ok: false, error: "Depot entre 500 et 500 000 F" }, 400);
    if (!ALLOWED[country] || !ALLOWED[country].includes(operator)) return json({ ok: false, error: "Pays ou operateur invalide" }, 400);
    if (phone.length < 8 || phone.length > 10) return json({ ok: false, error: "Numero de telephone invalide" }, 400);

    // 1) la base cree le depot (verifie le jeton et le montant)
    const sr = await fetch(sbUrl(env, "/rest/v1/rpc/start_deposit"), {
      method: "POST",
      headers: sbHeaders(env),
      body: JSON.stringify({ p_token: token, p_amount: amount }),
    });
    const sd = await sr.json().catch(() => ({}));
    if (!sd || sd.ok !== true) return json({ ok: false, error: (sd && sd.error) || "Depot impossible" }, 400);

    // 2) demande Mobile Money envoyee sur le telephone
    let txId;
    try {
      txId = await mobilePush(env, {
        amount: Math.round(Number(sd.amount)),
        description: "Depot portefeuille MeGo",
        phone,
        country,
        operator,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Paiement indisponible";
      await recordFailure(env, sd.deposit_id, msg);
      return json({ ok: false, error: msg }, 502);
    }

    // 3) on memorise la transaction sur le depot (la confirmation arrive par le webhook ou /api/verify)
    const ar = await fetch(sbUrl(env, "/rest/v1/rpc/attach_deposit"), {
      method: "POST",
      headers: sbHeaders(env),
      body: JSON.stringify({ p_deposit_id: sd.deposit_id, p_ref: String(txId) }),
    });
    const att = await ar.json().catch(() => ({}));
    if (!att || att.ok !== true) {
      // la demande est deja partie chez FedaPay : on garde la reference pour que le webhook puisse quand meme crediter
      return json({ ok: false, error: (att && att.error) || "Depot non enregistre" }, 500);
    }

    return json({ ok: true, deposit_id: sd.deposit_id, transactionId: txId, message: "Demande envoyee sur ton telephone. Valide avec ton code." });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "Erreur serveur" }, 500);
  }
}
