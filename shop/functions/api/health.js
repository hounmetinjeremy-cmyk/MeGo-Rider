import { json } from "../_shared.js";

// GET /api/health : verifie que les fonctions Pages sont bien deployees et quels secrets manquent (sans les afficher)
// "a_remplacer" = secrets encore sur la valeur provisoire A_REMPLACER (la vraie cle n'est pas encore saisie).
export async function onRequestGet({ env }) {
  const need = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "FEDAPAY_SECRET_KEY", "FEDAPAY_WEBHOOK_SECRET", "FEDAPAY_MODE", "OPENROUTER_API_KEY"];
  const missing = need.filter((k) => !env[k]);
  const placeholder = need.filter((k) => env[k] === "A_REMPLACER");
  return json({ status: "ok", mode: (env.FEDAPAY_MODE || "sandbox") === "live" ? "live" : "sandbox", missing_secrets: missing, a_remplacer: placeholder });
}
