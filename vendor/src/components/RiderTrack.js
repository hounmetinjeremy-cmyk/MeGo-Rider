import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Platform } from "react-native";

// Suivi du livreur par le vendeur : etat de la course + carte gratuite (OpenStreetMap + Leaflet).
const API = "https://mprusmdpirucpcwqssfg.supabase.co";
const KEY = "sb_publishable_OqgLY_ICZBtu1-C_yN_hCA_J4U2zluA";
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

const LABEL = {
  SEARCHING: "Recherche d'un livreur",
  OFFERED: "Livreur contacte",
  ASSIGNED: "Livreur en route",
  DELIVERED: "Livree",
  NO_RIDER: "Aucun livreur disponible",
  REFUND_DUE: "Annulee : remboursement du client",
};

async function getStatus(orderId) {
  const r = await fetch(API + "/rest/v1/rpc/get_order_status", {
    method: "POST",
    headers: { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ p_order_id: orderId }),
  });
  return r.json();
}

function mapHtml(p) {
  return (
    '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css">' +
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js"></script>' +
    "<style>html,body,#m{height:100%;margin:0}</style></head><body><div id=\"m\"></div><script>" +
    "var P=" + JSON.stringify(p) + ";" +
    "var map=L.map('m');" +
    "L.tileLayer('" + TILES + "',{maxZoom:18,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);" +
    "var pts=[];" +
    "function add(c,label,color){if(!c)return;pts.push(c);" +
    "L.circleMarker(c,{radius:9,color:'#fff',weight:2,fillColor:color,fillOpacity:1}).addTo(map)" +
    ".bindTooltip(label,{permanent:true,direction:'top'});}" +
    "add(P.pickup,'Ma boutique','#e67e22');add(P.drop,'Client','#2980b9');add(P.rider,'Livreur','#0a7d4b');" +
    "if(pts.length>1)map.fitBounds(pts,{padding:[40,40]});else if(pts.length==1)map.setView(pts[0],15);else map.setView([6.37,2.39],11);" +
    "</script></body></html>"
  );
}

export default function RiderTrack({ orderId }) {
  const [st, setSt] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const r = await getStatus(orderId);
      if (r && r.ok !== false) setSt(r);
    } catch (e) {}
  }, [orderId]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [refresh]);

  const pt = (la, ln) => (la != null && ln != null ? [Number(la), Number(ln)] : null);
  const key = st ? [st.rider_lat, st.rider_lng, st.pickup_lat, st.pickup_lng, st.delivery_lat, st.delivery_lng].join("|") : "";
  const html = useMemo(
    () =>
      st
        ? mapHtml({
            rider: pt(st.rider_lat, st.rider_lng),
            pickup: pt(st.pickup_lat, st.pickup_lng),
            drop: pt(st.delivery_lat, st.delivery_lng),
          })
        : "",
    [key]
  );

  if (!st || st.dispatch === "DELIVERED" || !st.dispatch) return null;
  const live = st.rider_lat != null && st.rider_lng != null;
  const age = st.rider_updated_at ? Math.max(0, Math.floor((Date.now() - new Date(st.rider_updated_at).getTime()) / 60000)) : null;

  return (
    <View style={{ backgroundColor: "#fff", borderRadius: 14, padding: 12, marginTop: -8, marginBottom: 16, borderWidth: 1, borderColor: "#E5E7EB" }}>
      <Text style={{ fontSize: 13, fontWeight: "700", color: "#111827" }}>{LABEL[st.dispatch] || st.dispatch}</Text>
      {st.rider_name ? (
        <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
          Livreur : {st.rider_name}{st.rider_phone ? " - " + st.rider_phone : ""}
        </Text>
      ) : null}
      {live ? (
        <Text style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
          Position mise a jour il y a {age != null ? age : "?"} min
        </Text>
      ) : null}
      {live && Platform.OS === "web"
        ? React.createElement("iframe", {
            srcDoc: html,
            title: "Suivi du livreur",
            style: { width: "100%", height: 220, border: 0, borderRadius: 12, marginTop: 8 },
          })
        : null}
    </View>
  );
}
