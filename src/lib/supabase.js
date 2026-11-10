import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";

// Clé publishable : publique par nature, elle peut vivre dans le code.
// Surchargeable via .env (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY).
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || "https://mprusmdpirucpcwqssfg.supabase.co";

const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_OqgLY_ICZBtu1-C_yN_hCA_J4U2zluA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

export default supabase;
