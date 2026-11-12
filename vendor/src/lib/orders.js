import { supabase } from "./supabaseClient";

export const TABS = ["Nouvel Ordre", "En traitement", "Livré"];

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
