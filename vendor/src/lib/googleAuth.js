import { Platform } from "react-native";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { getIdentity, setIdentity } from "./identity";

// Connexion Google dans l'APK. Scopes de base uniquement : openid, email, profile (valeur par defaut de la bibliotheque,
// aucun scope supplementaire n'est demande). Le Web client ID est injecte a la construction de l'APK
// (variable EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, voir le workflow GitHub).
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";
const SHOP = (process.env.EXPO_PUBLIC_SHOP_URL || "https://mego-shop.pages.dev").replace(/\/+$/, "");

export const googleAvailable = Platform.OS === "android" && !!WEB_CLIENT_ID;

let configured = false;
let inFlight = null;

function message(e) {
  const code = String((e && e.code) != null ? e.code : "");
  if (code === String(statusCodes.SIGN_IN_CANCELLED)) return null; // l'utilisateur a ferme la fenetre : pas d'erreur
  if (code === String(statusCodes.IN_PROGRESS)) return "Connexion Google deja en cours";
  if (code === String(statusCodes.PLAY_SERVICES_NOT_AVAILABLE)) return "Google Play Services indisponible ou a mettre a jour";
  if (code === "10" || code === "DEVELOPER_ERROR") return "Configuration Google invalide (SHA-1 ou package de l'APK)";
  if (code === "7" || code === "NETWORK_ERROR") return "Pas de connexion internet";
  return "Connexion Google impossible";
}

async function run(kind, link, presetToken) {
  try {
    let idToken = presetToken || "";
    if (!idToken) {
      if (!configured) {
        GoogleSignin.configure({ webClientId: WEB_CLIENT_ID, offlineAccess: false });
        configured = true;
      }
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      try {
        await GoogleSignin.signOut(); // force le choix du compte, evite un ancien etat bloque
      } catch (e) {}
      const res = await GoogleSignin.signIn();
      idToken = res && (res.idToken || (res.data && res.data.idToken));
      if (!idToken) return { ok: false, error: "Connexion Google impossible" };
    }

    // Un seul envoi au serveur, delai maximum 15 s, aucune nouvelle tentative automatique.
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
      try {
        await GoogleSignin.signOut();
      } catch (e) {}
      return { ok: false, error: (d && d.error) || "Connexion Google refusee" };
    }
    return { ok: true, token: d.token, owner_id: d.owner_id, created: !!d.created, linked: !!d.linked };
  } catch (e) {
    const m = message(e);
    if (m === null) return { ok: false, cancelled: true };
    if (e && e.name === "AbortError") return { ok: false, error: "Le serveur ne repond pas, reessaie plus tard" };
    return { ok: false, error: m };
  }
}

/**
 * Renvoie { ok, token, owner_id } | { ok:false, error } | { ok:false, cancelled:true }. Un seul appel a la fois.
 * link = { phone, pin } : lie un ancien compte (telephone + code) a l'identite Google.
 */
export function signInWithGoogle(kind, link) {
  if (!googleAvailable) return Promise.resolve({ ok: false, error: "Connexion Google indisponible" });
  if (kind !== "vendor" && kind !== "rider") return Promise.resolve({ ok: false, error: "Type de compte invalide" });
  if (inFlight) return inFlight;
  inFlight = run(kind, link).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/**
 * Etape 1 (avant le choix du role) : choisit le compte Google et garde l'identite en memoire.
 * Aucun envoi au serveur ici : le role n'est pas encore connu.
 * Renvoie { ok, id_token, email, name } | { ok:false, error } | { ok:false, cancelled:true }.
 */
let identityInFlight = null;
export function googleIdentity() {
  if (!googleAvailable) return Promise.resolve({ ok: false, error: "Connexion Google indisponible" });
  if (identityInFlight) return identityInFlight;
  identityInFlight = (async () => {
    try {
      if (!configured) {
        GoogleSignin.configure({ webClientId: WEB_CLIENT_ID, offlineAccess: false });
        configured = true;
      }
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      try {
        await GoogleSignin.signOut(); // force le choix du compte, evite un ancien etat bloque
      } catch (e) {}
      const res = await GoogleSignin.signIn();
      const idToken = res && (res.idToken || (res.data && res.data.idToken));
      if (!idToken) return { ok: false, error: "Connexion Google impossible" };
      const user = (res && res.user) || (res && res.data && res.data.user) || {};
      const v = { id_token: idToken, email: user.email || "", name: user.name || "" };
      setIdentity(v);
      return { ok: true, id_token: v.id_token, email: v.email, name: v.name };
    } catch (e) {
      const m = message(e);
      if (m === null) return { ok: false, cancelled: true };
      return { ok: false, error: m };
    }
  })().finally(() => {
    identityInFlight = null;
  });
  return identityInFlight;
}

/**
 * Etape 2 (apres le choix du role) : ouvre la session du role avec l'identite deja choisie,
 * sans redemander le compte Google.
 */
export function loginWithIdentity(kind, link) {
  if (kind !== "vendor" && kind !== "rider") return Promise.resolve({ ok: false, error: "Type de compte invalide" });
  const id = getIdentity();
  if (!id || !id.id_token) return Promise.resolve({ ok: false, error: "Identite Google absente" });
  if (inFlight) return inFlight;
  inFlight = run(kind, link, id.id_token).finally(() => {
    inFlight = null;
  });
  return inFlight;
}
