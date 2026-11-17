import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const STALE_MS = 20000;

/**
 * Ecoute la position temps reel du livreur (Supabase Realtime broadcast).
 * Aucune lecture en base : le broadcast est ephemere.
 */
export default function useRiderLive({ riderId, orderId = null, enabled = true }) {
  const [live, setLive] = useState(null);
  const [online, setOnline] = useState(false);
  const lastTs = useRef(0);

  useEffect(() => {
    if (!enabled || !riderId) {
      setLive(null);
      setOnline(false);
      return undefined;
    }

    lastTs.current = 0;
    const channel = supabase.channel(`rider-live:${riderId}`, {
      config: { broadcast: { self: false } },
    });

    channel.on('broadcast', { event: 'location' }, ({ payload }) => {
      if (!payload) return;
      if (orderId && payload.order_id && payload.order_id !== orderId) return;
      const lat = Number(payload.lat);
      const lng = Number(payload.lng);
      if (!isFinite(lat) || !isFinite(lng)) return;
      lastTs.current = Date.now();
      setLive({
        lat,
        lng,
        heading: payload.heading ?? null,
        speed: payload.speed ?? null,
        ts: payload.ts || Date.now(),
      });
      setOnline(true);
    });

    channel.subscribe();

    const timer = setInterval(() => {
      setOnline(lastTs.current > 0 && Date.now() - lastTs.current < STALE_MS);
    }, 5000);

    return () => {
      clearInterval(timer);
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        // canal deja ferme
      }
    };
  }, [riderId, orderId, enabled]);

  return { live, online };
}
