// Portefeuille : outils communs (client, vendeur, livreur).
const API = "https://mprusmdpirucpcwqssfg.supabase.co";
const KEY = "sb_publishable_OqgLY_ICZBtu1-C_yN_hCA_J4U2zluA";
const TOKEN_KEY = "mego_customer_token";

export async function rpc(name, body) {
  const r = await fetch(API + "/rest/v1/rpc/" + name, {
    method: "POST",
    headers: { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  return r.json();
}

// Compte connecte dans l'application mobile (livreur / vendeur) : jeton transmis par l'APK, sans connexion.
export function injectedToken() {
  try {
    return typeof window !== "undefined" && window.__MEGO_TOKEN__ ? String(window.__MEGO_TOKEN__) : "";
  } catch (e) {
    return "";
  }
}
export const isInjected = () => !!injectedToken();

// Portefeuille client de ce navigateur (visiteur venu d'un lien partage, sans application).
export function customerToken() {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) || "" : "";
  } catch (e) {
    return "";
  }
}
export function saveCustomerToken(t) {
  try {
    if (typeof window === "undefined") return;
    if (t) window.localStorage.setItem(TOKEN_KEY, t);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch (e) {}
}

// Portefeuille utilise pour payer : celui de l'application (livreur / vendeur), sinon celui du client.
export const activeToken = () => injectedToken() || customerToken();

export async function myWallet(token) {
  try {
    return await rpc("my_wallet", { p_token: token });
  } catch (e) {
    return { ok: false, error: "Connexion impossible" };
  }
}

export const loginCustomer = (phone, pin) => rpc("login_account", { p_kind: "customer", p_phone: phone, p_pin: pin });
export const registerCustomer = (phone, pin, name) => rpc("register_customer", { p_phone: phone, p_pin: pin, p_name: name });

export async function startDeposit(payload) {
  try {
    const r = await fetch("/api/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    return d && typeof d === "object" ? d : { ok: false, error: "Depot indisponible" };
  } catch (e) {
    return { ok: false, error: "Connexion au paiement impossible" };
  }
}

export async function verifyDeposit(depositId) {
  try {
    const r = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deposit_id: depositId }),
    });
    const d = await r.json();
    return { paid: !!(d && d.paid), status: (d && d.status) || "" };
  } catch (e) {
    return { paid: false, status: "" };
  }
}
