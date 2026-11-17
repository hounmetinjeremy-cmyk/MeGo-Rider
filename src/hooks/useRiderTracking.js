import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Écoute la position diffusée par le livreur (côté client / vendeur).
 *
 * @param {{riderId?:string, orderId?:string|null, staleAfter?:number}} options
 * @returns {{rider:object|null, online:boolean}}
 */
export default function useRiderTracking({ riderId, orderId = null, staleAfter = 20000 }) {
  const [rider, setRider] = useState(null);
  const [online, setOnline] = useState(false);
  const lastRef = useRef(0);

  useEffect(() => {
    if (!riderId) return undefined;

    const channel = supabase.channel(`rider-live:${riderId}`, {
      config: { broadcast: { self: false } },
    });

    channel.on('broadcast', { event: 'location' }, ({ payload }) => {
      if (!payload || !isFinite(payload.lat) || !isFinite(payload.lng)) return;
      if (orderId && payload.order_id && payload.order_id !== orderId) return;
      lastRef.current = Date.now();
      setRider(payload);
      setOnline(true);
    });

    channel.subscribe();

    const timer = setInterval(() => {
      if (lastRef.current && Date.now() - lastRef.current > staleAfter) setOnline(false);
    }, 5000);

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [riderId, orderId, staleAfter]);

  return { rider, online };
}
