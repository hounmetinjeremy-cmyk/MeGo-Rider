import { useEffect } from "react";
import { updateRiderLocation } from "../lib/orders";

/**
 * Envoie la position du livreur toutes les 30 secondes tant qu'il est « Disponible ».
 * Sert à choisir le livreur le plus proche du vendeur. Version web : navigator.geolocation
 * (le navigateur demande l'autorisation une fois). Sans position, le livreur n'est pas proposé.
 */
export default function useRiderLocation(rider) {
  const riderId = rider ? rider.id : null;
  const available = !!(rider && rider.available);

  useEffect(() => {
    if (!riderId || !available) return undefined;
    if (typeof navigator === "undefined" || !navigator.geolocation) return undefined;
    let stopped = false;
    const send = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!stopped) updateRiderLocation(riderId, pos.coords.latitude, pos.coords.longitude);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
      );
    };
    send();
    const timer = setInterval(send, 30000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [riderId, available]);
}
