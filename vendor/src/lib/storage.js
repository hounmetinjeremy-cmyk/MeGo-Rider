import { supabase } from "./supabaseClient";

export const PRODUCT_BUCKET = "vendor-products";

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Decode une chaine base64 en octets (fonctionne web + natif, sans dependance). */
function base64ToBytes(input) {
  const clean = String(input || "").replace(/[^A-Za-z0-9+/=]/g, "");
  const lookup = new Uint8Array(256);
  for (let i = 0; i < B64.length; i += 1) lookup[B64.charCodeAt(i)] = i;
  const len = clean.length;
  let size = (len * 3) / 4;
  if (clean[len - 1] === "=") size -= 1;
  if (clean[len - 2] === "=") size -= 1;
  const bytes = new Uint8Array(size);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const e1 = lookup[clean.charCodeAt(i)];
    const e2 = lookup[clean.charCodeAt(i + 1)];
    const e3 = lookup[clean.charCodeAt(i + 2)];
    const e4 = lookup[clean.charCodeAt(i + 3)];
    bytes[p++] = (e1 << 2) | (e2 >> 4);
    if (p < size) bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    if (p < size) bytes[p++] = ((e3 & 3) << 6) | (e4 & 63);
  }
  return bytes;
}

function extensionFor(mime, uri) {
  const m = String(mime || "").toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  if (m.includes("gif")) return "gif";
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  const fromUri = String(uri || "").split("?")[0].split(".").pop();
  if (fromUri && fromUri.length <= 4 && /^[a-z0-9]+$/i.test(fromUri)) return fromUri.toLowerCase();
  return "jpg";
}

/**
 * Envoie une photo produit dans le bucket public et renvoie son URL publique.
 * `asset` vient de expo-image-picker (uri, mimeType, base64).
 */
export async function uploadProductImage(vendorId, asset) {
  if (!asset || !asset.uri) return null;
  const mime = asset.mimeType || "image/jpeg";
  const ext = extensionFor(mime, asset.uri);
  const folder = vendorId || "public";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  let payload;
  if (asset.base64) {
    payload = base64ToBytes(asset.base64);
  } else {
    const res = await fetch(asset.uri);
    payload = await res.arrayBuffer();
  }

  const { error } = await supabase.storage
    .from(PRODUCT_BUCKET)
    .upload(path, payload, { contentType: mime, upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(path);
  return (data && data.publicUrl) || null;
}

export default uploadProductImage;
