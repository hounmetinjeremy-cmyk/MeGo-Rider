import http from "node:http";
import crypto from "node:crypto";
import { handleChat } from "./chat.js";

// Serveur MeGo (Fly.io) : paiement FedaPay Mobile Money dans l'application (meme logique que Chap-money) + assistant IA des boutiques.
// Secrets Fly requis : FEDAPAY_SECRET_KEY, FEDAPAY_MODE (sandbox | live), FEDAPAY_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Facultatifs : FEDAPAY_CUSTOMER_EMAIL, FEDAPAY_CUSTOMER_FIRSTNAME, FEDAPAY_CUSTOMER_LASTNAME, OLLAMA_URL
const env = process.env;
const PORT = Number(env.PORT || 8080);
const LIVE = (env.FEDAPAY_MODE || "sandbox") === "live";
const FEDA = LIVE ? "https://api.fedapay.com/v1" : "https://sandbox-api.fedapay.com/v1";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Operateurs FedaPay sans redirection, par pays (identiques a Chap-money)
const ALLOWED = {
  bj: ["mtn_open", "moov", "sbin", "momo_test"],
  tg: ["moov_tg", "togocel", "momo_test"],
  ci: ["mtn_ci", "momo_test"],
  ne: ["airtel_ne", "momo_test"],
  sn: ["free_sn", "momo_test"],
  gn: ["mtn_open_gn", "momo_test"],
};

for (const k of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
  if (!env[k]) console.warn(`[config] secret manquant : ${k}`);
}
for (const k of ["FEDAPAY_SECRET_KEY", "FEDAPAY_WEBHOOK_SECRET"]) {
  if (!env[k]) console.warn(`[config] secret paiement manquant : ${k}`);
}

function send(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json", ...CORS });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let b = "";
    req.on("data", (c) => {
      b += c;
      if (b.length > 1_000_000) {
        reject(new Error("Corps trop grand"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(b));
    req.on("error", reject);
  });
}

async function fedapay(path, body) {
  if (!env.FEDAPAY_SECRET_KEY) throw new Error("FEDAPAY_SECRET_KEY non configuree");
  const r = await fetch(`${FEDA}${path}`, {
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

const sbHeaders = () => ({
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
});
const sbUrl = (p) => `${String(env.SUPABASE_URL || "").replace(/\/$/, "")}${p}`;

// POST /checkout : le MONTANT est lu dans la base (jamais envoye par le navigateur)
async function checkout(req, res) {
  let body = {};
  try {
    body = JSON.parse((await readBody(req)) || "{}");
  } catch {
    return send(res, 400, { error: "JSON invalide" });
  }
  const orderId = String(body.order_id ?? "");
  const country = String(body.country ?? "").toLowerCase();
  const operator = String(body.operator ?? "");
  const phone = String(body.phone ?? "").replace(/\D/g, "");

  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return send(res, 400, { error: "order_id invalide" });
  if (!ALLOWED[country] || !ALLOWED[country].includes(operator)) return send(res, 400, { error: "Pays ou operateur invalide" });
  if (phone.length < 8 || phone.length > 10) return send(res, 400, { error: "Numero de telephone invalide" });

  const or = await fetch(sbUrl(`/rest/v1/orders?id=eq.${orderId}&select=id,amount,order_code,payment_status&limit=1`), { headers: sbHeaders() });
  const rows = await or.json();
  const order = Array.isArray(rows) ? rows[0] : null;
  if (!order) return send(res, 404, { error: "Commande introuvable" });
  if (order.payment_status !== "PENDING") return send(res, 409, { error: "Commande deja payee ou fermee" });
  const amount = Math.round(Number(order.amount));
  if (!(amount > 0)) return send(res, 400, { error: "Montant invalide" });

  // 1) transaction
  let tx;
  try {
    const created = await fedapay("/transactions", {
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
    const t = await fedapay(`/transactions/${txId}/token`, {});
    token = typeof t.token === "string" ? t.token : t.token?.token;
    if (!token) throw new Error("Token FedaPay introuvable");
  } catch (e) {
    throw new Error(`[etape 2 - token] ${e.message}`);
  }

  // 3) demande envoyee sur le telephone du client
  try {
    await fedapay(`/${operator}`, { token, phone_number: { number: phone, country } });
  } catch (e) {
    throw new Error(`[etape 3 - envoi telephone] ${e.message}`);
  }

  // 4) on memorise la transaction sur la commande (la confirmation arrive par le webhook)
  const ar = await fetch(sbUrl("/rest/v1/rpc/attach_payment"), {
    method: "POST",
    headers: sbHeaders(),
    body: JSON.stringify({ p_order_id: order.id, p_ref: String(txId) }),
  });
  const att = await ar.json().catch(() => ({}));
  if (!att?.ok) return send(res, 500, { error: att?.error ?? "Paiement non enregistre" });

  return send(res, 200, { ok: true, transactionId: txId, message: "Demande envoyee sur ton telephone. Valide avec ton code." });
}

// Signature FedaPay : en-tete "t=...,v1=..." ; HMAC-SHA256 de "<t>.<corps brut>" avec le secret du webhook (comme Chap-money)
function verifySignature(raw, header, secret) {
  const parts = Object.fromEntries(header.split(",").map((p) => p.trim().split("=")));
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(v1, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

// POST /webhook : confirme la commande SI FedaPay confirme "approved" ET que le montant correspond
async function webhook(req, res) {
  const secret = env.FEDAPAY_WEBHOOK_SECRET;
  if (!secret || !env.FEDAPAY_SECRET_KEY) return send(res, 500, { error: "Secrets FedaPay non configures" });

  const raw = await readBody(req);
  if (!verifySignature(raw, String(req.headers["x-fedapay-signature"] || ""), secret)) {
    return send(res, 401, { error: "Signature invalide" });
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return send(res, 400, { error: "JSON invalide" });
  }

  const event = String(payload.event ?? payload.name ?? "");
  if (event !== "transaction.approved") return send(res, 200, { received: true, ignored: event });

  const data = payload.data ?? payload.entity ?? {};
  const tx = data["v1/transaction"] ?? data.transaction ?? data;
  const id = tx?.id;
  if (!id) return send(res, 400, { error: "Transaction manquante" });

  // Re-verification aupres de FedaPay (on ne se fie pas au seul contenu du webhook)
  const vr = await fetch(`${FEDA}/transactions/${id}`, { headers: { Authorization: `Bearer ${env.FEDAPAY_SECRET_KEY}` } });
  const vd = await vr.json().catch(() => ({}));
  const real = vd["v1/transaction"] ?? vd.transaction ?? vd;
  if (!vr.ok || real?.status !== "approved") return send(res, 409, { error: "Transaction non approuvee chez FedaPay" });

  const r = await fetch(sbUrl("/rest/v1/rpc/confirm_payment_ref"), {
    method: "POST",
    headers: sbHeaders(),
    body: JSON.stringify({ p_ref: String(id), p_amount: Number(real.amount) }),
  });
  const out = await r.json().catch(() => ({}));
  return send(res, r.ok ? 200 : 500, { received: true, result: out });
}

http
  .createServer(async (req, res) => {
    try {
      const { pathname } = new URL(req.url, "http://localhost");
      if (req.method === "OPTIONS") {
        res.writeHead(204, CORS);
        return res.end();
      }
      if (req.method === "GET" && (pathname === "/health" || pathname === "/")) return send(res, 200, { status: "ok", mode: LIVE ? "live" : "sandbox" });
      if (req.method === "POST" && pathname === "/checkout") return await checkout(req, res);
      if (req.method === "POST" && pathname === "/webhook") return await webhook(req, res);
      if (req.method === "POST" && pathname === "/chat") {
        let body = {};
        try {
          body = JSON.parse((await readBody(req)) || "{}");
        } catch {
          return send(res, 400, { error: "JSON invalide" });
        }
        const ip = String(req.headers["fly-client-ip"] || req.socket.remoteAddress || "?");
        return await handleChat({ body, ip, env, sbHeaders, sbUrl, send, res });
      }
      return send(res, 404, { error: "Route inconnue" });
    } catch (e) {
      console.error("[erreur]", e);
      return send(res, 500, { error: e instanceof Error ? e.message : "Erreur serveur" });
    }
  })
  .listen(PORT, "0.0.0.0", () => console.log(`MeGo serveur sur le port ${PORT} (${LIVE ? "live" : "sandbox"})`));
