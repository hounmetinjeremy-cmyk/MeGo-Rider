import { supabase } from "./supabase";

export const TABS = ["Nouvel Ordre", "En traitement", "Livré"];

// Statuts Supabase -> onglets de l'écran Commandes.
const STATUS_TO_TAB = {
  pending: "Nouvel Ordre",
  new: "Nouvel Ordre",
  created: "Nouvel Ordre",
  accepted: "En traitement",
  processing: "En traitement",
  in_progress: "En traitement",
  picked_up: "En traitement",
  on_the_way: "En traitement",
  delivered: "Livré",
  completed: "Livré",
};

const ORDER_COLUMNS =
  "id, reference, customer_name, customer_phone, address, total, currency, status, created_at";

export function tabForStatus(status) {
  const key = String(status || "").trim().toLowerCase();
  return STATUS_TO_TAB[key] || "Nouvel Ordre";
}

export async function fetchOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

// Rechargement automatique à chaque changement dans la table orders.
export function subscribeOrders(onChange) {
  const channel = supabase
    .channel("orders-stream")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      onChange
    )
    .subscribe();

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch (e) {
      // canal déjà fermé : rien à faire
    }
  };
}
