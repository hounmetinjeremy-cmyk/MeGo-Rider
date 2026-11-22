import { Platform } from "react-native";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { getIdentity, setIdentity } from "./identity";

// Connexion Google dans l'APK. Scopes de base uniquement : openid, email, profile (valeur par defaut de la bibliotheque,
// aucun scope supplementaire n'est demande). Le Web client ID est injecte a la construction de l'APK
// (variable EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, voir le workflow GitHub).
//
// Deux etapes, comme la creation d'une page Facebook :
//  1) googleIdentity()   : l'utilisateur choisit son compte Google (rien n'est envoye au serveur). L'identite est gardee en memoire 24 h.
//  2) loginWithIdToken() : apres le choix "vendeur" ou "livreur", le serveur verifie le jeton et cree / retrouve le compte de ce role.
//     Le jeton Google dure ~1 h : au-dela de 40 min on le renouvelle sans rien afficher a l'utilisateur.
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";
const SHOP = (process.env.EXPO_PUBLIC_SHOP_URL || "https://mego-shop.pages.dev").replace(/\/+$/, "");
const STALE_MS = 40 * 60 * 1000;

export const googleAvailable = Platform.OS === "android" && !!WEB_CLIENT_ID;

let configured = false;
let inFlight = null;

// Un seul appel a la fois, jamais de nouvelle tentative automatique.
function once(fn) {
  if (inFlight) return inFlight;
  inFlight = fn().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

function message(e) {
  const code = String((e && e.code) != null ? e.code : "");
  if (code === String(statusCodes.SIGN_IN_CANCELLED)) return null; // l'utilisateur a ferme la fenetre : pas d'erreur
  if (code === String(statusCodes.IN_PROGRESS)) return "Connexion Google deja en cours";
  if (code === String(statusCodes.PLAY_SERVICES_NOT_AVAILABLE)) return "Google Play Services indisponible ou a mettre a jour";
  if (code === "10" || code === "DEVELOPER_ERROR") return "Configuration Google invalide (SHA-1 ou package de l'APK)";
  if (code === "7" || code === "NETWORK_ERROR") return "Pas de connexion internet";
  return "Connexion Google impossible";
}

function configure() {
  if (!configured) {
    GoogleSignin.configure({ webClientId: WEB_CLIENT_ID, offlineAccess: false });
    configured = true;
  }
}

// Etape 1 : choix du compte Google -> jeton d'identite.
// force = true : on se deconnecte d'abord pour reafficher le choix du compte (changer de compte). Sinon on va droit au but (plus rapide).
async function pick(force) {
  try {
    configure();
    if (force) {
      try {
        await GoogleSignin.signOut();
      } catch (e) {}
    }

    const res = await GoogleSignin.signIn();
    const idToken = res && (res.idToken || (res.data && res.data.idToken));
    if (!idToken) return { ok: false, error: "Connexion Google impossible" };
    const user = (res && (res.user || (res.data && res.data.user))) || {};
    return { ok: true, idToken, email: user.email || "", name: user.name || "" };
  } catch (e) {
    const m = message(e);
    if (m === null) return { ok: false, cancelled: true };
    return { ok: false, error: m };
  }
}

// Renouvelle en silence le jeton Google s'il a plus de 40 min (aucune fenetre). null = impossible, il faut se reconnecter.
async function freshToken(idToken) {
  const id = getIdentity();
  if (!id || Date.now() - id.at < STALE_MS) return idToken;
  try {
    configure();
    const res = await GoogleSignin.signInSilently();
    const t = res && (res.idToken || (res.data && res.data.idToken));
    if (!t) return null;
    const user = (res && (res.user || (res.data && res.data.user))) || {};
    setIdentity({ idToken: t, email: user.email || id.email, name: user.name || id.name });
    return t;
  } catch (e) {
    return null;
  }
}

// Etape 2 : le serveur verifie le jeton Google et cree / retrouve le compte du role choisi.
async function exchange(kind, idToken, link) {
  try {
    // Un seul envoi, delai maximum 15 s.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    let d = null;
    try {
      const payload = { id_token: idToken, kind };
      if (link) payload.link = { phone: String(link.phone || ""), pin: String(link.pin || "") };
      const r = await fetch(SHOP + "/api/google-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      d = await r.json().catch(() => null);
    } finally {
      clearTimeout(timer);
    }
    if (!d || d.ok !== true || !d.token) {
      return { ok: false, error: (d && d.error) || "Connexion Google refusee", code: d && d.code };
    }
    return { ok: true, token: d.token, owner_id: d.owner_id, created: !!d.created, linked: !!d.linked };
  } catch (e) {
    if (e && e.name === "AbortError") return { ok: false, error: "Le serveur ne repond pas, reessaie plus tard" };
    return { ok: false, error: "Connexion Google impossible" };
  }
}

const NO = { ok: false, error: "Connexion Google indisponible" };
const validKind = (k) => k === "vendor" || k === "rider";

/** Renvoie { ok, idToken, email, name } | { ok:false, error } | { ok:false, cancelled:true }. Garde l'identite en memoire. */
export function googleIdentity() {
  if (!googleAvailable) return Promise.resolve(NO);
  return once(async () => {
    const r = await pick(false);
    if (r.ok) setIdentity({ idToken: r.idToken, email: r.email, name: r.name });
    return r;
  });
}

/** idToken deja obtenu avec googleIdentity(). link = { phone, pin } lie un ancien compte (telephone + code). */
export function loginWithIdToken(kind, idToken, link) {
  if (!googleAvailable) return Promise.resolve(NO);
  if (!validKind(kind) || !idToken) return Promise.resolve({ ok: false, error: "Connexion Google impossible" });
  return once(async () => {
    const t = await freshToken(idToken);
    if (!t) return { ok: false, error: "Ta connexion Google a expire : reconnecte-toi.", code: "invalid_token" };
    return exchange(kind, t, link);
  });
}

/** Les deux etapes d'un coup (sans passer par l'ecran de choix). Reaffiche le choix du compte Google. */
export function signInWithGoogle(kind, link) {
  if (!googleAvailable) return Promise.resolve(NO);
  if (!validKind(kind)) return Promise.resolve({ ok: false, error: "Type de compte invalide" });
  return once(async () => {
    const p = await pick(true);
    if (!p.ok) return p;
    const r = await exchange(kind, p.idToken, link);
    if (!r.ok) {
      try {
        await GoogleSignin.signOut();
      } catch (e) {}
    }
    return r;
  });
}
