import { useEffect, useRef, useState } from 'react';
import { fetchRoute, haversine } from '../lib/osrm';

const REFRESH_MS = 20000;

/**
 * Itinéraire OSRM entre le livreur et une destination, rafraîchi périodiquement.
 * Repli automatique sur la distance à vol d'oiseau si OSRM est indisponible.
 *
 * @param {{from?:{lat:number,lng:number}, to?:{lat:number,lng:number}, enabled?:boolean}} options
 */
export default function useOsrmRoute({ from, to, enabled = true }) {
  const [route, setRoute] = useState(null);
  const [error, setError] = useState(null);
  const lastKeyRef = useRef('');

  const fromLat = from?.lat;
  const fromLng = from?.lng;
  const toLat = to?.lat;
  const toLng = to?.lng;

  useEffect(() => {
    if (!enabled || fromLat == null || fromLng == null || toLat == null || toLng == null) return undefined;

    let cancelled = false;
    const controller = new AbortController();

    const run = async () => {
      const key = `${fromLat.toFixed(4)},${fromLng.toFixed(4)}>${toLat.toFixed(4)},${toLng.toFixed(4)}`;
      if (key === lastKeyRef.current) return;
      lastKeyRef.current = key;
      try {
        const r = await fetchRoute(
          { lat: fromLat, lng: fromLng },
          { lat: toLat, lng: toLng },
          { signal: controller.signal }
        );
        if (cancelled) return;
        if (r) {
          setRoute(r);
          setError(null);
        } else {
          setRoute(null);
        }
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return;
        const d = haversine({ lat: fromLat, lng: fromLng }, { lat: toLat, lng: toLng });
        setRoute(d == null ? null : { distance: d, duration: (d / 1000 / 25) * 3600, coordinates: [] });
        setError(e?.message || 'Itinéraire indisponible');
      }
    };

    run();
    const timer = setInterval(run, REFRESH_MS);

    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(timer);
    };
  }, [enabled, fromLat, fromLng, toLat, toLng]);

  return { route, error };
}
