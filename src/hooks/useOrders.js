import { useCallback, useEffect, useState } from "react";
import { fetchOrders, subscribeOrders } from "../lib/orders";

export default function useOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const rows = await fetchOrders();
      setOrders(rows);
    } catch (e) {
      setError(e && e.message ? e.message : "Impossible de charger les commandes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    let unsubscribe = () => {};
    try {
      unsubscribe = subscribeOrders(() => {
        load();
      });
    } catch (e) {
      // temps réel indisponible : le rafraîchissement manuel reste possible
    }

    return () => unsubscribe();
  }, [load]);

  return { orders, loading, error, reload: load };
}
