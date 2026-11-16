// Assistant IA des boutiques (Qwen 2.5 0.5B via Ollama, serveur prive sur Fly.io).
// Le serveur lit lui-meme les donnees de la boutique dans Supabase : le client ne peut pas injecter de faux prix ou de faux produits.
const OLLAMA_URL = (process.env.OLLAMA_URL || "http://plateforme-ia-backend.internal:11434").replace(/\/$/, "");
const MODEL = process.env.OLLAMA_MODEL || "qwen2.5:0.5b";

const hits = new Map(); // limite simple : 20 questions / minute / adresse IP
function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 20;
}

const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function pickProducts(products, question) {
  const words = norm(question).split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  const scored = products
    .map((p) => ({ p, s: words.filter((w) => norm(p.name).includes(w) || norm(p.description || "").includes(w)).length }))
    .sort((a, b) => b.s - a.s);
  const hit = scored.filter((x) => x.s > 0).slice(0, 3).map((x) => x.p);
  return hit.length ? hit : products.slice(0, 4);
}

function buildPrompt(vendor, items, question) {
  const data = items
    .map((p) => `- ${p.name} : ${Number(p.price)} FCFA, ${Number(p.stock) > 0 ? "disponible" : "epuise"}`)
    .join("\n");
  return `Tu es l'assistant poli de la boutique "${vendor.name}". Reponds au client en francais, en 1 ou 2 phrases courtes.
REGLES :
1. N'invente RIEN : prix, produits, stock et adresse viennent uniquement des DONNEES ci-dessous. Si l'information manque, dis-le poliment.
2. Si la question touche la vie privee du vendeur (vie amoureuse, famille, secrets), ne donne aucune information personnelle et reponds avec humour sans rien reveler, par exemple : "Ici on vend des plats, pas les secrets du coeur !"
DONNEES :
${data || "- (aucun produit)"}
Adresse : ${vendor.address || "non renseignee"}
Question : "${question}"
Reponse :`;
}

export async function handleChat({ body, ip, env, sbHeaders, sbUrl, send, res }) {
  if (limited(ip)) return send(res, 429, { error: "Trop de questions, reessaie dans une minute" });
  const slug = String(body.slug ?? "");
  const question = String(body.question ?? "").trim().slice(0, 300);
  if (!/^[a-z0-9-]{2,80}$/.test(slug) || question.length < 2) return send(res, 400, { error: "Question invalide" });

  const vr = await fetch(sbUrl(`/rest/v1/vendors?slug=eq.${slug}&select=id,name,address,chat_ai_enabled,chat_ai_expires_at&limit=1`), { headers: sbHeaders() });
  const vrows = await vr.json();
  const vendor = Array.isArray(vrows) ? vrows[0] : null;
  if (!vendor) return send(res, 404, { error: "Boutique introuvable" });
  const active = vendor.chat_ai_enabled === true && (!vendor.chat_ai_expires_at || new Date(vendor.chat_ai_expires_at) > new Date());
  if (!active) return send(res, 403, { error: "Assistant non active pour cette boutique" });

  const pr = await fetch(sbUrl(`/rest/v1/vendor_products?vendor_id=eq.${vendor.id}&is_available=neq.false&select=name,description,price,stock&limit=50`), { headers: sbHeaders() });
  const products = await pr.json();
  const items = pickProducts(Array.isArray(products) ? products : [], question);

  try {
    const r = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        prompt: buildPrompt(vendor, items, question),
        stream: false,
        options: { num_ctx: 512, num_predict: 60, temperature: 0.1, num_thread: 2 },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const d = await r.json();
    const answer = String(d.response || "").trim();
    if (!r.ok || !answer) throw new Error("Reponse vide");
    return send(res, 200, { ok: true, answer });
  } catch (e) {
    console.error("[chat] service IA :", e);
    return send(res, 200, { ok: true, answer: "Desole, notre assistant rencontre une petite perturbation technique. Que puis-je faire pour vous ?" });
  }
}
