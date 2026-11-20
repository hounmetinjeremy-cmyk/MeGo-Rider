import { json, CORS_PREFLIGHT, sbHeaders, sbUrl } from "../_shared";

// Connexion Google (APK et lien web) : le client envoie le jeton d'identite Google (id_token) obtenu avec le Web client ID.
// Le serveur verifie la signature (cles publiques Google), l'audience, l'emetteur et l'expiration, puis cree ou retrouve
// le compte dans Supabase et renvoie une session. Seuls les scopes de base sont utilises (openid, email, profile).
//  - kind "vendor" / "rider" : APK. Avec link {phone, pin}, lie un ancien compte (telephone + PIN) a l'identite Google.
//  - kind "customer" : lien web, le client se connecte avant de valider sa commande.
// Variable Cloudflare Pages requise : GOOGLE_WEB_CLIENT_ID (le Web client ID, ex : 123-abc.apps.googleusercontent.com).

const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
let certCache = { keys: null, exp: 0 };

function b64uToBytes(s) {
  let b = String(s).replace(/-/g, "+").replace(/_/g, "/");
  while (b.length % 4) b += "=";
  const bin = atob(b);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function googleKeys(force) {
  if (!force && certCache.keys && Date.now() < certCache.exp) return certCache.keys;
  const r = await fetch("https://www.googleapis.com/oauth2/v3/certs");
  if (!r.ok) throw new Error("certs indisponibles");
  const d = await r.json();
  certCache = { keys: d.keys || [], exp: Date.now() + 3600 * 1000 };
  return certCache.keys;
}

async function verifyGoogleIdToken(idToken, audience) {
  const parts = String(idToken || "").split(".");
  if (parts.length !== 3) throw new Error("jeton invalide");
  const dec = new TextDecoder();
  let header;
  let payload;
  try {
    header = JSON.parse(dec.decode(b64uToBytes(parts[0])));
    payload = JSON.parse(dec.decode(b64uToBytes(parts[1])));
  } catch (e) {
    throw new Error("jeton illisible");
  }
  if (header.alg !== "RS256" || !header.kid) throw new Error("algorithme refuse");

  let jwk = (await googleKeys(false)).find((k) => k.kid === header.kid);
  if (!jwk) jwk = (await googleKeys(true)).find((k) => k.kid === header.kid); // une seule relecture des cles
  if (!jwk) throw new Error("cle inconnue");

  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    b64uToBytes(parts[2]),
    new TextEncoder().encode(parts[0] + "." + parts[1])
  );
  if (!ok) throw new Error("signature invalide");

  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== audience) throw new Error("audience incorrecte");
  if (ISSUERS.indexOf(payload.iss) < 0) throw new Error("emetteur incorrect");
  if (!(Number(payload.exp) > now - 30)) throw new Error("jeton expire");
  if (!payload.sub) throw new Error("compte absent");
  if (payload.email_verified !== true && payload.email_verified !== "true") throw new Error("email non verifie");
  return payload;
}

export const onRequestOptions = CORS_PREFLIGHT;

export async function onRequestPost({ request, env }) {
  try {
    let body = null;
    try {
      body = await request.json();
    } catch (e) {
      return json({ ok: false, error: "Requete invalide", code: "bad_request" }, 400);
    }
    const kind = body && body.kind;
    if (kind !== "vendor" && kind !== "rider" && kind !== "customer") {
      return json({ ok: false, error: "Type de compte invalide", code: "bad_kind" }, 400);
    }
    if (!env.GOOGLE_WEB_CLIENT_ID) {
      return json({ ok: false, error: "Connexion Google non configuree", code: "not_configured" }, 500);
    }

    let claims;
    try {
      claims = await verifyGoogleIdToken(body.id_token, env.GOOGLE_WEB_CLIENT_ID);
    } catch (e) {
      // 401 : le client ne doit PAS reessayer automatiquement
      return json({ ok: false, error: "Connexion Google refusee", code: "invalid_token" }, 401);
    }

    const link = body.link && typeof body.link === "object" ? body.link : null;
    let fn = "google_login";
    let args = {
      p_kind: kind,
      p_sub: String(claims.sub),
      p_email: claims.email ? String(claims.email) : null,
      p_name: claims.name ? String(claims.name) : null,
    };
    if (link) {
      if (kind === "customer") return json({ ok: false, error: "Type de compte invalide", code: "bad_kind" }, 400);
      fn = "google_link";
      args = {
        p_kind: kind,
        p_sub: String(claims.sub),
        p_email: claims.email ? String(claims.email) : null,
        p_phone: String(link.phone || ""),
        p_pin: String(link.pin || ""),
      };
    }

    const r = await fetch(sbUrl(env, "/rest/v1/rpc/" + fn), {
      method: "POST",
      headers: sbHeaders(env),
      body: JSON.stringify(args),
    });
    const out = await r.json().catch(() => null);
    if (!r.ok || !out) return json({ ok: false, error: "Service indisponible, reessaie plus tard", code: "backend" }, 502);
    return json(out, out.ok === true ? 200 : 400);
  } catch (e) {
    return json({ ok: false, error: "Erreur serveur", code: "server" }, 500);
  }
}
