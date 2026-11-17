import { Platform } from "react-native";

// Jeton de session du compte (en-tete x-mego-token).
// - Web : localStorage.
// - APK / iOS : stockage securise du telephone. localStorage n'existe pas sur mobile : sans cela le jeton
//   n'etait ni garde ni envoye, et la base ne renvoyait aucune donnee (profil, commandes, GPS...).
// Le jeton est aussi garde en memoire pour que chaque requete le lise sans attendre.
let SecureStore = null;
try {
  SecureStore = require("expo-secure-store");
} catch (e) {
  SecureStore = null;
}

const isWeb = Platform.OS === "web";
const mem = {};
const keyOf = (kind) => "mego_session_" + kind;

/** Lecture immediate (sur mobile, apres loadToken). */
export function getToken(kind) {
  if (mem[kind] !== undefined) return mem[kind];
  if (isWeb) {
    try {
      return localStorage.getItem(keyOf(kind));
    } catch (e) {}
  }
  return null;
}

/** Charge le jeton enregistre (a appeler au demarrage). */
export async function loadToken(kind) {
  try {
    const value = isWeb
      ? localStorage.getItem(keyOf(kind))
      : SecureStore
      ? await SecureStore.getItemAsync(keyOf(kind))
      : null;
    mem[kind] = value || null;
  } catch (e) {
    if (mem[kind] === undefined) mem[kind] = null;
  }
  return mem[kind];
}

/** Enregistre le jeton (ou l'efface si token est vide). */
export async function saveToken(kind, token) {
  mem[kind] = token || null;
  try {
    if (isWeb) {
      if (token) localStorage.setItem(keyOf(kind), token);
      else localStorage.removeItem(keyOf(kind));
    } else if (SecureStore) {
      if (token) await SecureStore.setItemAsync(keyOf(kind), String(token));
      else await SecureStore.deleteItemAsync(keyOf(kind));
    }
  } catch (e) {}
}
