import { useCallback, useEffect, useState } from "react";
import { getVendor, setVendorOpen } from "../lib/db";
import { fetchVendorOrders } from "../lib/orders";

export default function useVendor(vendorId) {
  const [vendor, setVendor] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const shop = await getVendor(vendorId);
      setVendor(shop);
      const list = await fetchVendorOrders(shop ? shop.id : vendorId);
      setOrders(list);
    } catch (err) {
      setError(err.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleOpen = useCallback(async () => {
    if (!vendor) return;
    const next = !vendor.is_open;
    setVendor({ ...vendor, is_open: next });
    try {
      await setVendorOpen(vendor.id, next);
    } catch (err) {
      setVendor({ ...vendor, is_open: !next });
      setError(err.message || "Mise à jour impossible");
    }
  }, [vendor]);

  return {
    vendor,
    orders,
    loading,
    error,
    reload: load,
    setVendor,
    setOrders,
    toggleOpen,
  };
}
