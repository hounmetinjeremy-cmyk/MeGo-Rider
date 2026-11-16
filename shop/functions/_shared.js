// Outils communs des fonctions Cloudflare Pages (paiement FedaPay + assistant IA). Les secrets viennent de Cloudflare Pages > Settings > Variables et secrets.
export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

export const CORS_PREFLIGHT = () =>
  new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });

// Operateurs FedaPay sans redirection, par pays (identiques a Chap-money)
export const ALLOWED = {
  bj: ["mtn_open", "moov", "sbin", "momo_test"],
  tg: ["moov_tg", "togocel", "momo_test"],
  ci: ["mtn_ci", "momo_test"],
  ne: ["airtel_ne", "momo_test"],
  sn: ["free_sn", "momo_test"],
  gn: ["mtn_open_gn", "momo_test"],
};

export const fedaBase = (env) =>
  (env.FEDAPAY_MODE || "sandbox") === "live" ? "https://api.fedapay.com/v1" : "https://sandbox-api.fedapay.com/v1";

export async function fedapay(env, path, body) {
  if (!env.FEDAPAY_SECRET_KEY) throw new Error("FEDAPAY_SECRET_KEY non configuree");
  const r = await fetch(`${fedaBase(env)}${path}`, {
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

export const sbHeaders = (env) => ({
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
});
export const sbUrl = (env, p) => `${String(env.SUPABASE_URL || "").replace(/\/$/, "")}${p}`;

const enc = new TextEncoder();
export async function hmacHex(key, msg) {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = await crypto.subtle.sign("HMAC", k, enc.encode(msg));
  return [...new Uint8Array(s)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
