import { json, CORS_PREFLIGHT, fedaBase } from "../_shared.js";

// SONDE TEMPORAIRE - a supprimer apres le test.
// GET /api/feda-probe?key=mego-probe-2026 : cree un payout sandbox pour chaque mode et renvoie le statut HTTP + le corps complet.
// Aucune donnee en base n'est touchee : appel direct a FedaPay, sans /payouts/start.

export const onRequestOptions = () => CORS_PREFLIGHT();

const CASES = [
  { mode: "moov", phone: "0164000001" },
  { mode: "moov_bj", phone: "0164000001" },
  { mode: "mtn_open", phone: "0166000001" },
  { mode: "mtn", phone: "0166000001" },
  { mode: "mtn_bj", phone: "0166000001" },
];

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (url.searchParams.get("key") !== "mego-probe-2026") {
    return json({ ok: false, error: "cle invalide" }, 403);
  }
  if (!env.FEDAPAY_SECRET_KEY) return json({ ok: false, error: "FEDAPAY_SECRET_KEY absente" }, 500);

  const base = fedaBase(env);
  const out = [];
  for (const c of CASES) {
    const body = {
      amount: 100,
      currency: { iso: "XOF" },
      mode: c.mode,
      customer: {
        firstname: "Test",
        lastname: "MeGo",
        email: env.FEDAPAY_CUSTOMER_EMAIL || "hounmetinjeremy@gmail.com",
        phone_number: { number: c.phone, country: "bj" },
      },
    };
    let status = 0;
    let text = "";
    try {
      const r = await fetch(`${base}/payouts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.FEDAPAY_SECRET_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      status = r.status;
      text = await r.text();
    } catch (e) {
      text = e instanceof Error ? e.message : "erreur";
    }
    out.push({ mode: c.mode, phone: c.phone, status, body: text });
  }
  return json({ ok: true, base, results: out });
}
