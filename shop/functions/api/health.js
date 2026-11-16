import { json } from "../_shared.js";

// GET /api/health : verifie que les fonctions Pages sont bien deployees et que les secrets sont presents (sans les afficher)
export async function onRequestGet({ env }) {
  const need = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "FEDAPAY_SECRET_KEY", "FEDAPAY_WEBHOOK_SECRET", "FEDAPAY_MODE", "AI_URL", "AI_SECRET"];
  const missing = need.filter((k) => !env[k]);
  return json({ status: "ok", mode: (env.FEDAPAY_MODE || "sandbox") === "live" ? "live" : "sandbox", missing_secrets: missing });
}
