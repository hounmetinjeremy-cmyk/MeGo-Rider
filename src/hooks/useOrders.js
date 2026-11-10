import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchOrders, subscribeOrders, tabForStatus } from "../lib/orders";

/**
 * Commandes + temps réel Supabase.
 * Répartition par onglet :
 *  - Nouvel Ordre  : status = NEW (toutes)
 *  - En traitement : status = IN_PROGRESS et rider_id = livreur courant
 *  - Livré         : status = DELIVERED et rider_id = livreur courant
 */
export default function useOrders(riderId) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

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

  const byTab = useMemo(() => {
    const groups = { "Nouvel Ordre": [], "En traitement": [], "Livré": [] };
    orders.forEach((order) => {
      const tab = tabForStatus(order.status);
      if (tab === "Nouvel Ordre") {
        groups[tab].push(order);
      } else if (riderId && order.riderId === riderId) {
        groups[tab].push(order);
      }
    });
    return groups;
  }, [orders, riderId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return { orders, byTab, loading, error, refreshing, reload: load, refresh };
}
