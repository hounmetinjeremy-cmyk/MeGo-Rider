import { supabase } from "./supabaseClient";

// Le slug de la boutique est lu dans l'URL : /boutique-chez-rita ou /?b=boutique-chez-rita
export function readSlug() {
  if (typeof window === "undefined") return "";
  const q = new URLSearchParams(window.location.search);
  const fromQuery = q.get("b") || q.get("slug") || q.get("boutique");
  if (fromQuery) return fromQuery.trim().toLowerCase();
  const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
  if (!path || path === "index.html") return "";
  return decodeURIComponent(path).trim().toLowerCase();
}

export async function loadShop(slug) {
  const { data, error } = await supabase.rpc("get_shop", { p_slug: slug });
  if (error) return { ok: false, error: error.message };
  return data || { ok: false, error: "Boutique introuvable" };
}

export async function placeOrder({ slug, items, name, phone, address, lat, lng, note, zoneId }) {
  const { data, error } = await supabase.rpc("place_order", {
    p_slug: slug,
    p_items: items,
    p_customer_name: name,
    p_customer_phone: phone,
    p_address: address,
    p_lat: lat,
    p_lng: lng,
    p_note: note || null,
    p_zone_id: zoneId || null,
  });
  if (error) return { ok: false, error: error.message };
  return data || { ok: false, error: "Commande impossible" };
}

// Paiement simulé (tant que test_payments est activé dans les réglages).
export async function payOrder(orderId) {
  const { data, error } = await supabase.rpc("test_pay_order", { p_order_id: orderId });
  if (error) return { ok: false, error: error.message };
  return data || { ok: false, error: "Paiement impossible" };
}

export async function getStatus(orderId) {
  const { data, error } = await supabase.rpc("get_order_status", { p_order_id: orderId });
  if (error) return { ok: false, error: error.message };
  return data || { ok: false, error: "Commande introuvable" };
}

const KEY = "mego_last_order";

export function saveLastOrder(id) {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, id);
  } catch (e) {}
}

export function readLastOrder() {
  try {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(KEY) || "";
  } catch (e) {
    return "";
  }
}

export function money(n) {
  return Number(n || 0).toLocaleString("fr-FR") + " F";
}

/** Code de livraison (QR) de la commande, cote client. */
export async function getOrderQr(orderId) {
  const { data, error } = await supabase.rpc("get_order_qr", {
    p_order_id: orderId,
  });
  if (error || !data) return null;
  if (typeof data === "string") return { qr_code: data };
  return data;
}

const DEVICE_KEY = "mego_device_id";
export function deviceId() {
  try {
    if (typeof window === "undefined") return "";
    let v = window.localStorage.getItem(DEVICE_KEY);
    if (!v) {
      v = "d" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      window.localStorage.setItem(DEVICE_KEY, v);
    }
    return v;
  } catch (e) { return ""; }
}
export async function loadDiscovery(limit = 20, offset = 0) {
  const { data, error } = await supabase.rpc("get_discovery", {
    p_limit: limit, p_offset: offset, p_device_id: deviceId() || null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, shops: Array.isArray(data) ? data : (data && data.shops) || [] };
}
export async function toggleLike(slug) {
  const { data, error } = await supabase.rpc("toggle_shop_like", {
    p_slug: slug, p_device_id: deviceId() || null,
  });
  if (error) return { ok: false, error: error.message };
  return data || { ok: false, error: "Like impossible" };
}
export async function addComment(slug, author, body) {
  const { data, error } = await supabase.rpc("add_shop_comment", {
    p_slug: slug, p_device_id: deviceId() || null, p_author: author || null, p_body: body,
  });
  if (error) return { ok: false, error: error.message };
  return data || { ok: false, error: "Commentaire impossible" };
}
