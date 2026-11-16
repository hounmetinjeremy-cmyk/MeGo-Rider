// Webhook FedaPay (Cloudflare Pages Function) : en-tete X-FEDAPAY-SIGNATURE = "t=...,v1=...",
// HMAC-SHA256 de "<t>.<corps brut>" avec le secret du webhook.
// Secrets Cloudflare : FEDAPAY_WEBHOOK_SECRET, FEDAPAY_SECRET_KEY, FEDAPAY_MODE (sandbox | live),
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// En plus de la signature, on RE-VERIFIE la transaction aupres de FedaPay (statut + montant)
// avant de valider la commande.
const enc = new TextEncoder();

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

async function hmacHex(key, msg) {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = await crypto.subtle.sign("HMAC", k, enc.encode(msg));
  return [...new Uint8Array(s)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function verifySignature(raw, header, secret) {
  const parts = Object.fromEntries(header.split(",").map((p) => p.trim().split("=")));
  const t = parts["t"];
  const v1 = (parts["v1"] ?? "").toLowerCase();
  if (!t || !v1) return false;
  const expected = await hmacHex(secret, `${t}.${raw}`);
  return safeEqual(v1, expected);
}

export async function onRequest({ request, env }) {
  if (request.method !== "POST") return json({ error: "POST uniquement" }, 405);

  const secret = env.FEDAPAY_WEBHOOK_SECRET;
  const sk = env.FEDAPAY_SECRET_KEY;
  if (!secret || !sk || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "Secrets FedaPay non configures" }, 500);
  }

  const raw = await request.text();
  const sig = request.headers.get("x-fedapay-signature") ?? "";
  if (!(await verifySignature(raw, sig, secret))) return json({ error: "Signature invalide" }, 401);

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

  // Re-verification aupres de FedaPay (on ne fait pas confiance au seul contenu du webhook)
  const api = (env.FEDAPAY_MODE || "sandbox") === "live" ? "https://api.fedapay.com/v1" : "https://sandbox-api.fedapay.com/v1";
  const vr = await fetch(`${api}/transactions/${id}`, { headers: { Authorization: `Bearer ${sk}` } });
  const vd = await vr.json().catch(() => ({}));
  const real = vd["v1/transaction"] ?? vd.transaction ?? vd;
  if (!vr.ok || real?.status !== "approved") return json({ error: "Transaction non approuvee chez FedaPay" }, 409);

  const base = String(env.SUPABASE_URL).replace(/\/$/, "");
  const srk = env.SUPABASE_SERVICE_ROLE_KEY;
  const r = await fetch(`${base}/rest/v1/rpc/confirm_payment_ref`, {
    method: "POST",
    headers: { apikey: srk, Authorization: `Bearer ${srk}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_ref: String(id), p_amount: Number(real.amount) }),
  });
  const out = await r.json().catch(() => ({}));
  return json({ received: true, result: out }, r.ok ? 200 : 500);
}
