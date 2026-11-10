import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const RIDER_COLUMNS =
  "id, full_name, name, rider_code, phone, is_available, vehicle_type, vehicle, wallet_balance, total_earnings, created_at";

export function normalizeRider(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.full_name || row.name || "Nom du livreur",
    code: row.rider_code || "rider id",
    phone: row.phone || "",
    available: !!row.is_available,
    vehicle: row.vehicle_type || row.vehicle || "Moto",
    wallet: Number(row.wallet_balance || 0),
    earnings: Number(row.total_earnings || 0),
  };
}

/**
 * Profil du livreur connecté.
 * Sans écran de connexion, on prend le livreur EXPO_PUBLIC_RIDER_ID
 * s'il est défini, sinon le premier de la table riders.
 */
export default function useRider() {
  const [rider, setRider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const preferred = process.env.EXPO_PUBLIC_RIDER_ID;
      let query = supabase.from("riders").select(RIDER_COLUMNS).limit(1);
      if (preferred) {
        query = supabase.from("riders").select(RIDER_COLUMNS).eq("id", preferred).limit(1);
      }
      const { data, error: err } = await query;
      if (err) throw err;
      setRider(normalizeRider(data && data[0]));
    } catch (e) {
      setError(e && e.message ? e.message : "Erreur de chargement du profil");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Bascule le switch Disponibilité -> riders.is_available */
  const setAvailability = useCallback(
    async (value) => {
      if (!rider) return;
      setRider((r) => (r ? { ...r, available: value } : r));
      const { error: err } = await supabase
        .from("riders")
        .update({ is_available: value })
        .eq("id", rider.id);
      if (err) {
        setRider((r) => (r ? { ...r, available: !value } : r));
        throw err;
      }
    },
    [rider]
  );

  return { rider, loading, error, reload: load, setAvailability };
}
