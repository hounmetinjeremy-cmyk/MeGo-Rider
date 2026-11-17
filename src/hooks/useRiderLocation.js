import { useEffect } from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";
import { updateRiderLocation } from "../lib/orders";

/**
 * Envoie la position du livreur toutes les 30 secondes tant qu'il est « Disponible ».
 * Sert à choisir le livreur le plus proche du vendeur.
 * - APK Android / iOS : expo-location (GPS du téléphone).
 * - Version web : navigator.geolocation.
 * Sans position, le livreur n'est pas proposé.
 */
async function getPosition() {
  if (Platform.OS === "web") {
    return new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }),
        () => resolve(null),
        { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
      );
    });
  }

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    };
  } catch (e) {
    return null;
  }
}

export default function useRiderLocation(rider) {
  const riderId = rider ? rider.id : null;
  const available = !!(rider && rider.available);

  useEffect(() => {
    if (!riderId || !available) return undefined;

    let stopped = false;

    const send = async () => {
      const pos = await getPosition();
      if (stopped || !pos) return;
      await updateRiderLocation(riderId, pos.latitude, pos.longitude);
    };

    send();
    const timer = setInterval(send, 30000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [riderId, available]);
}
