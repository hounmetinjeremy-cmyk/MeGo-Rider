import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';

const BROADCAST_INTERVAL = 5000; // 5 s : position éphémère, non stockée

/**
 * Diffuse la position du livreur en temps réel via Supabase Realtime (broadcast).
 * Aucune écriture en base : la persistance reste assurée par useRiderLocation.
 * La position n'est envoyée qu'une fois le canal connecté (sinon elle serait perdue).
 *
 * @param {{riderId?:string, orderId?:string|null, enabled?:boolean}} options
 * @returns {{position:object|null, error:string|null}}
 */
export default function useRiderBroadcast({ riderId, orderId = null, enabled = true }) {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const channelRef = useRef(null);
  const subRef = useRef(null);

  useEffect(() => {
    if (!enabled || !riderId) return undefined;
    let cancelled = false;
    let ready = false;
    let last = null;

    const send = (payload) => {
      const channel = channelRef.current;
      if (!channel) return;
      channel.send({ type: 'broadcast', event: 'location', payload }).catch(() => {});
    };

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== 'granted') {
          setError('Permission de localisation refusée');
          return;
        }

        const channel = supabase.channel(`rider-live:${riderId}`, {
          config: { broadcast: { self: false, ack: false } },
        });
        channelRef.current = channel;
        channel.subscribe((s) => {
          ready = s === 'SUBSCRIBED';
          if (ready && last) send(last);
        });

        const sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: BROADCAST_INTERVAL,
            distanceInterval: 5,
          },
          (loc) => {
            if (cancelled) return;
            const payload = {
              rider_id: riderId,
              order_id: orderId,
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
              heading: loc.coords.heading ?? null,
              speed: loc.coords.speed ?? null,
              accuracy: loc.coords.accuracy ?? null,
              ts: Date.now(),
            };
            last = payload;
            setPosition(payload);
            setError(null);
            if (ready) send(payload);
          }
        );
        if (cancelled) {
          sub.remove?.();
          return;
        }
        subRef.current = sub;
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Localisation indisponible');
      }
    })();

    return () => {
      cancelled = true;
      if (subRef.current) {
        subRef.current.remove?.();
        subRef.current = null;
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [riderId, orderId, enabled]);

  return { position, error };
}
