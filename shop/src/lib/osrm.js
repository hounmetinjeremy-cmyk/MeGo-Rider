// Routage OSRM (serveur public de demonstration) : distance, duree, trace.
const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

/**
 * Calcule un itineraire routier entre deux points.
 * @param {{lat:number,lng:number}} from
 * @param {{lat:number,lng:number}} to
 * @returns {Promise<{distance:number,duration:number,coordinates:{lat:number,lng:number}[]}|null>}
 */
export async function fetchRoute(from, to, { signal } = {}) {
  if (!from || !to) return null;
  if (!isFinite(from.lat) || !isFinite(from.lng) || !isFinite(to.lat) || !isFinite(to.lng)) return null;

  const url =
    OSRM_BASE +
    "/" + from.lng + "," + from.lat + ";" + to.lng + "," + to.lat +
    "?overview=full&geometries=geojson&steps=false&alternatives=false";

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("OSRM " + res.status);

  const json = await res.json();
  const route = json && json.routes && json.routes[0];
  if (!route) return null;

  const coords = (route.geometry && route.geometry.coordinates) || [];
  return {
    distance: route.distance, // metres
    duration: route.duration, // secondes
    coordinates: coords.map((c) => ({ lat: c[1], lng: c[0] })),
  };
}

/** Distance a vol d'oiseau en metres (repli si OSRM indisponible). */
export function haversine(a, b) {
  if (!a || !b) return null;
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function formatDistance(meters) {
  if (meters == null || !isFinite(meters)) return "-";
  if (meters < 1000) return Math.round(meters) + " m";
  return (meters / 1000).toFixed(meters < 10000 ? 1 : 0) + " km";
}

export function formatDuration(seconds) {
  if (seconds == null || !isFinite(seconds)) return "-";
  const min = Math.round(seconds / 60);
  if (min < 1) return "< 1 min";
  if (min < 60) return min + " min";
  const h = Math.floor(min / 60);
  const rest = min % 60;
  return rest ? h + " h " + rest + " min" : h + " h";
}
