import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchOrders,
  subscribeOrders,
  tabForStatus,
  isVisibleNewOrder,
  reassignExpiredOffers,
} from "../lib/orders";

/**
 * Commandes + temps réel Supabase.
 * Répartition par onglet :
 *  - Nouvel Ordre  : status = NEW ET course proposée à CE livreur (offre non expirée),
 *                    ou ancienne commande sans recherche automatique (visible par tous)
 *  - En traitement : status = IN_PROGRESS et rider_id = livreur courant
 *  - Livré         : status = DELIVERED et rider_id = livreur courant
 */
export default function useOrders(riderId) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    try {
      setError(null);
      const rows = await fetchOrders();
      setOrders(rows);
    } catch (e) {
      setError(e && e.message ? e.message : "Erreur de chargement des commandes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    let unsubscribe;
    try {
      unsubscribe = subscribeOrders(() => load());
    } catch (e) {
      // temps réel indisponible : le rafraîchissement manuel reste possible
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [load]);

  // Toutes les 5 s : on réévalue les offres (une offre expirée disparaît de l'écran).
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  // Toutes les 20 s : on relance la recherche pour les offres expirées, puis on recharge.
  useEffect(() => {
    const t = setInterval(async () => {
      await reassignExpiredOffers();
      load();
    }, 20000);
    return () => clearInterval(t);
  }, [load]);

  const byTab = useMemo(() => {
    const now = Date.now();
    const groups = { "Nouvel Ordre": [], "En traitement": [], "Livré": [] };
    orders.forEach((order) => {
      const tab = tabForStatus(order.status);
      if (tab === "Nouvel Ordre") {
        if (isVisibleNewOrder(order, riderId, now)) groups[tab].push(order);
      } else if (riderId && order.riderId === riderId) {
        groups[tab].push(order);
      }
    });
    return groups;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, riderId, tick]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await reassignExpiredOffers();
    await load();
    setRefreshing(false);
  }, [load]);

  return { orders, byTab, loading, error, refreshing, reload: load, refresh };
}
