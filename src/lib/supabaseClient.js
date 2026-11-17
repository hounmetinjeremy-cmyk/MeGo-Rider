import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import { getToken } from "./session";

// Clé publishable : publique par nature, elle peut vivre dans le code.
// Surchargeable via .env (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY).
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || "https://mprusmdpirucpcwqssfg.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_OqgLY_ICZBtu1-C_yN_hCA_J4U2zluA";

// Chaque requete porte le jeton de session du livreur (en-tete x-mego-token) :
// la base ne renvoie que SES donnees (ses commandes, son profil, ses retraits...).
// Le jeton vient de session.js : localStorage sur le web, stockage securise du telephone dans l'APK.
function fetchWithSession(input, init) {
  const token = getToken("rider");
  const headers = new Headers((init && init.headers) || (typeof input !== "string" && input && input.headers) || {});
  if (token) headers.set("x-mego-token", token);
  return fetch(input, { ...(init || {}), headers });
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  global: { fetch: fetchWithSession },
  realtime: {
    params: { eventsPerSecond: 5 },
  },
});

export default supabase;
