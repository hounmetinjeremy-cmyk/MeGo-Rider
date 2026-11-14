import { supabase } from "./supabaseClient";

export const TABS = ["Nouvel Ordre", "En traitement", "Livré"];

export const STATUS = {
  NEW: "NEW",
  IN_PROGRESS: "IN_PROGRESS",
  DELIVERED: "DELIVERED",
};

// "*" : fonctionne avec ou sans les colonnes ajoutées par supabase/schema_v4.sql.
const ORDER_COLUMNS = "*";

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
    items: Array.isArray(row.items) ? row.items : [],
    dispatch: row.dispatch_status || null,
    offeredRiderId: row.offered_rider_id || null,
    offerExpiresAt: row.offer_expires_at || null,
  };
}

/**
 * Une commande NEW est visible dans « Nouvel Ordre » :
 *  - si elle n'a pas de recherche de livreur (anciennes commandes) : tout livreur peut l'accepter ;
 *  - sinon seulement pour le livreur auquel le système l'a proposée, tant que l'offre n'a pas expiré.
 */
export function isVisibleNewOrder(order, riderId, now = Date.now()) {
  if (!order.dispatch) return true;
  if (!riderId || order.offeredRiderId !== riderId) return false;
  if (!order.offerExpiresAt) return true;
  return new Date(order.offerExpiresAt).getTime() > now;
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

function isMissingFunction(error) {
  const text = String((error && (error.code || error.message)) || "");
  return /PGRST202|42883|could not find the function|does not exist/i.test(text);
}

/**
 * Le livreur accepte la course : statut IN_PROGRESS + rider_id.
 * Passe par accept_order (vérifie que l'offre est bien pour lui et n'a pas expiré) ;
 * sur une base pas encore mise à jour, retombe sur l'ancienne mise à jour directe.
 */
export async function acceptOrder(orderId, riderId) {
  const rpc = await supabase.rpc("accept_order", { p_order_id: orderId, p_rider_id: riderId });
  if (!rpc.error) {
    if (rpc.data === false) throw new Error("Cette course n'est plus disponible.");
    const { data, error } = await supabase.from("orders").select(ORDER_COLUMNS).eq("id", orderId).single();
    if (error) throw error;
    return normalizeOrder(data);
  }
  if (!isMissingFunction(rpc.error)) throw rpc.error;
  const { data, error } = await supabase
    .from("orders")
    .update({ status: STATUS.IN_PROGRESS, rider_id: riderId })
    .eq("id", orderId)
    .select(ORDER_COLUMNS)
    .single();
  if (error) throw error;
  return normalizeOrder(data);
}

/** Le livreur refuse l'offre : le système propose la course au livreur suivant. */
export async function declineOrder(orderId, riderId) {
  const { error } = await supabase.rpc("decline_order", { p_order_id: orderId, p_rider_id: riderId });
  if (error) throw error;
  return true;
}

/** Relance la recherche pour les offres expirées (sans effet si la base n'est pas à jour). */
export async function reassignExpiredOffers() {
  try {
    await supabase.rpc("reassign_expired_offers");
  } catch (e) {
    // sans importance : la tâche automatique de la base fait le même travail
  }
}

/** Envoie la position du livreur (sert à trouver le plus proche du vendeur). */
export async function updateRiderLocation(riderId, latitude, longitude) {
  try {
    const rpc = await supabase.rpc("update_rider_location", {
      p_rider_id: riderId,
      p_lat: latitude,
      p_lng: longitude,
    });
    if (rpc.error && isMissingFunction(rpc.error)) return false;
    return !rpc.error;
  } catch (e) {
    return false;
  }
}

/** Le livreur valide la livraison avec le code client : libère le séquestre. */
export async function confirmDeliveryQr(orderId, riderId, code) {
  const clean = String(code || "").trim().toUpperCase();
  if (!clean) throw new Error("Saisis le code de livraison du client.");
  const { data, error } = await supabase.rpc("confirm_delivery_qr", {
    p_order_id: orderId,
    p_rider_id: riderId,
    p_code: clean,
  });
  if (error) throw error;
  if (data && data.ok === false) {
    throw new Error(data.message || "Code de livraison invalide.");
  }
  return data;
}
/** Repli : marque la commande livrée sans code (séquestre non libéré). */
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
