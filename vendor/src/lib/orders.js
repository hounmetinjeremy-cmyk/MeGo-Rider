import { supabase } from "./supabaseClient";

export const TABS = ["Nouvelles", "En préparation", "Livré"];

export const STATUS = {
  NEW: "NEW",
  IN_PROGRESS: "IN_PROGRESS",
  DELIVERED: "DELIVERED",
};

export const STATUS_LABEL = {
  NEW: "Nouvelle",
  IN_PROGRESS: "En traitement",
  DELIVERED: "Livrée",
};

export const STATUS_COLOR = {
  NEW: "#F59E0B",
  IN_PROGRESS: "#3B82F6",
  DELIVERED: "#76D865",
};

export async function fetchVendorOrders(vendorId) {
  let query = supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (vendorId) query = query.eq("vendor_id", vendorId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function updateOrderStatus(orderId, status) {
  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId);
  if (error) throw error;
  return true;
}

export function groupByStatus(orders) {
  const byTab = { "Nouvel Ordre": [], "En traitement": [], "Livré": [] };
  (orders || []).forEach((order) => {
    if (order.status === STATUS.NEW) byTab["Nouvel Ordre"].push(order);
    else if (order.status === STATUS.IN_PROGRESS) byTab["En traitement"].push(order);
    else byTab["Livré"].push(order);
  });
  return byTab;
}

export function computeStats(orders) {
  const list = orders || [];
  const delivered = list.filter((o) => o.status === STATUS.DELIVERED);
  const pending = list.filter((o) => o.status === STATUS.NEW);
  const revenue = delivered.reduce(
    (sum, o) => sum + Number(o.total || o.amount || 0),
    0
  );
  return {
    total: list.length,
    pending: pending.length,
    delivered: delivered.length,
    revenue,
  };
}

/**
 * Formate un montant en devise (ex: 4500 -> "4 500 XAF").
 * @param {number|string} amount - Montant brut.
 * @param {string} currency - Code devise (defaut XAF).
 * @returns {string} Montant formate.
 */
export function formatMoney(amount, currency = "XAF") {
  const value = Number(amount || 0);
  const safe = Number.isFinite(value) ? value : 0;
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency || "XAF",
      maximumFractionDigits: 0,
    }).format(safe);
  } catch (e) {
    return `${safe.toLocaleString("fr-FR")} ${currency || "XAF"}`;
  }
}

/**
 * Formate une date ISO en date courte francaise (ex: "12 nov. 2026").
 * @param {string|Date} value - Date ISO ou objet Date.
 * @returns {string} Date formatee, ou chaine vide si invalide.
 */
export function formatDate(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch (e) {
    return date.toISOString().slice(0, 10);
  }
}
