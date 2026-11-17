// Construit le HTML Leaflet affiche dans l'iframe (web) ou la WebView (mobile).
// Les mises a jour arrivent ensuite par postMessage { type: 'mego:update', data }.

export function buildMapHtml({ rider = null, pickup = null, delivery = null, route = null } = {}) {
  const initial = JSON.stringify({
    rider,
    pickup,
    delivery,
    route: (route && route.coordinates) || [],
  });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>html,body,#map{height:100%;margin:0;padding:0;background:#0f172a}</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var DATA = ${initial};
var map = L.map('map', { zoomControl: false, attributionControl: false });
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

function dot(color) {
  return L.divIcon({
    className: '',
    html: '<div style="width:16px;height:16px;border-radius:50%;background:' + color + ';border:3px solid #fff;box-shadow:0 0 0 2px rgba(0,0,0,.25)"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
}

function clearDynamic() {
  map.eachLayer(function (layer) {
    if (layer instanceof L.Marker || layer instanceof L.Polyline) map.removeLayer(layer);
  });
}

function render() {
  clearDynamic();
  var pts = [];
  if (DATA.pickup) {
    L.marker([DATA.pickup.lat, DATA.pickup.lng], { icon: dot('#22c55e') }).addTo(map);
    pts.push([DATA.pickup.lat, DATA.pickup.lng]);
  }
  if (DATA.delivery) {
    L.marker([DATA.delivery.lat, DATA.delivery.lng], { icon: dot('#ef4444') }).addTo(map);
    pts.push([DATA.delivery.lat, DATA.delivery.lng]);
  }
  if (DATA.route && DATA.route.length) {
    L.polyline(DATA.route.map(function (p) { return [p.lat, p.lng]; }), {
      color: '#2563eb', weight: 5, opacity: 0.85
    }).addTo(map);
  }
  if (DATA.rider) {
    L.marker([DATA.rider.lat, DATA.rider.lng], { icon: dot('#2563eb') }).addTo(map);
    pts.push([DATA.rider.lat, DATA.rider.lng]);
  }
  if (pts.length) {
    map.fitBounds(L.latLngBounds(pts).pad(0.25));
  } else {
    map.setView([6.3654, 2.4183], 13);
  }
}

render();

window.addEventListener('message', function (e) {
  try {
    var msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
    if (!msg || msg.type !== 'mego:update') return;
    DATA = Object.assign({}, DATA, msg.data || {});
    render();
  } catch (err) {}
});
</script>
</body>
</html>`;
}
