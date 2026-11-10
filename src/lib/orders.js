import { supabase } from "./supabaseClient";

export const TABS = ["Nouvel Ordre", "En traitement", "Livré"];

export const STATUS = {
  NEW: "NEW",
  IN_PROGRESS: "IN_PROGRESS",
  DELIVERED: "DELIVERED",
};

const ORDER_COLUMNS =
  "id, order_code, reference, rider_id, vendor_name, customer_name, customer_phone, pickup_address, delivery_address, address, amount, total, currency, status, created_at";

/** Normalise une ligne Supabase vers le modèle utilisé par l'UI. */
export function normalizeOrder(row) {
  return {
    id: row.id,
    code: row.order_code || row.reference || String(row.id).slice(0, 8),
    vendor: row.vendor_name || row.customer_name || "Boutique",
    customer: row.customer_name || "",
    phone: row.customer_phone || "",
    pickup: row.pickup_address || "",
    delivery: row.delivery_address || row.address || "",
    amount: Number(row.amount != null ? row.amount : row.total || 0),
    currency: row.currency || "XOF",
    status: String(row.status || "NEW").toUpperCase(),
    riderId: row.rider_id || null,
    createdAt: row.created_at,
  };
}

/** Statut Supabase -> onglet de l'écran Commandes. */
export function tabForStatus(status) {
  const s = String(status || "").toUpperCase();
  if (s === "DELIVERED" || s === "COMPLETED") return "Livré";
  if (s === "IN_PROGRESS" || s === "ACCEPTED" || s === "PICKED_UP" || s === "ON_THE_WAY") {
    return "En traitement";
  }
  return "Nouvel Ordre";
}

/** Charge les commandes (les plus récentes d'abord). */
export async function fetchOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data || []).map(normalizeOrder);
}

/** Le livreur accepte la course : statut IN_PROGRESS + rider_id. */
export async function acceptOrder(orderId, riderId) {
  const { data, error } = await supabase
    .from("orders")
    .update({ status: STATUS.IN_PROGRESS, rider_id: riderId })
    .eq("id", orderId)
    .select(ORDER_COLUMNS)
    .single();
  if (error) throw error;
  return normalizeOrder(data);
}

/** Le livreur marque la commande comme livrée. */
export async function markDelivered(orderId) {
  const { data, error } = await supabase
    .from("orders")
    .update({ status: STATUS.DELIVERED })
    .eq("id", orderId)
    .select(ORDER_COLUMNS)
    .single();
  if (error) throw error;
  return normalizeOrder(data);
}

/** Abonnement temps réel sur la table orders. */
export function subscribeOrders(onChange) {
  const channel = supabase
    .channel("orders-stream")
    .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, onChange)
    .subscribe();
  return () => {
    try {
      supabase.removeChannel(channel);
    } catch (e) {
      // canal déjà fermé
    }
  };
}

export function formatMoney(value, currency = "XOF") {
  const n = Number(value || 0);
  let formatted;
  try {
    formatted = n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
  } catch (e) {
    formatted = String(Math.round(n));
  }
  return `${formatted} ${currency}`;
}

export function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return d.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return d.toISOString().slice(0, 16).replace("T", " ");
  }
}
