import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Linking, Platform } from "react-native";
import Icon from "../components/Icon";
import { money, getStatus, getOrderQr } from "../lib/shop";

const LABEL = {
  WAITING_PAYMENT: "Paiement en attente",
  SEARCHING: "Recherche d'un livreur",
  OFFERED: "Livreur contacte",
  ASSIGNED: "Livreur en route",
  PICKED: "Commande recuperee",
  DELIVERED: "Livree",
  NO_RIDER: "Aucun livreur disponible",
};

// Carte gratuite : OpenStreetMap + Leaflet (aucune cle, aucun abonnement).
// Pour changer de fournisseur de tuiles plus tard (si le trafic grandit), modifier seulement TILES.
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

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
    "add(P.pickup,'Vendeur','#e67e22');add(P.drop,'Vous','#2980b9');add(P.rider,'Livreur','#0a7d4b');" +
    "if(pts.length>1)map.fitBounds(pts,{padding:[40,40]});else if(pts.length==1)map.setView(pts[0],15);else map.setView([6.37,2.39],11);" +
    "</script></body></html>"
  );
}

function LiveMap({ st }) {
  const pt = (la, ln) => (la != null && ln != null ? [Number(la), Number(ln)] : null);
  const key = [st.rider_lat, st.rider_lng, st.pickup_lat, st.pickup_lng, st.delivery_lat, st.delivery_lng].join("|");
  const html = useMemo(
    () =>
      mapHtml({
        rider: pt(st.rider_lat, st.rider_lng),
        pickup: pt(st.pickup_lat, st.pickup_lng),
        drop: pt(st.delivery_lat, st.delivery_lng),
      }),
    [key]
  );
  if (Platform.OS !== "web") return null;
  return React.createElement("iframe", {
    srcDoc: html,
    title: "Carte de livraison",
    style: { width: "100%", height: 300, border: 0, borderRadius: 16, marginTop: 12 },
  });
}

function minutesAgo(iso) {
  if (!iso) return null;
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  return m >= 0 ? m : null;
}

export default function OrderScreen({ orderId, onBack, onNew }) {
  const [st, setSt] = useState(null);
  const [busy, setBusy] = useState(true);
  const [qr, setQr] = useState(null);

  const refresh = async () => {
    setBusy(true);
    const r = await getStatus(orderId);
    setBusy(false);
    if (r && r.ok !== false) setSt(r);
    const q = await getOrderQr(orderId);
    if (q) setQr(q);
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 10000);
    return () => clearInterval(t);
  }, [orderId]);

  const dispatch = st ? st.dispatch : null;
  const label = st ? LABEL[dispatch] || st.status || "En cours" : "Chargement";
  const done = dispatch === "DELIVERED";
  const hasRider = st && st.rider_lat != null && st.rider_lng != null && !done;
  const showMap = st && !done && (hasRider || (st.pickup_lat != null && st.pickup_lng != null));
  const age = st ? minutesAgo(st.rider_updated_at) : null;

  const openGoogle = () => {
    Linking.openURL(
      "https://www.google.com/maps/search/?api=1&query=" + st.rider_lat + "," + st.rider_lng
    ).catch(() => {});
  };

  return (
    <View className="flex-1 bg-surface">
      <View className="flex-row items-center bg-navy px-4 pb-4 pt-6">
        <Pressable onPress={onBack} className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-white/10 active:opacity-70">
          <Icon name="chevronRight" size={18} color="#FFFFFF" />
        </Pressable>
        <Text className="text-[16px] font-bold text-white">Suivi de commande</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View className="items-center rounded-2xl bg-white p-5">
          <View className={`h-14 w-14 items-center justify-center rounded-full ${done ? "bg-primary-soft" : "bg-chip"}`}>
            <Icon name={done ? "check" : "truck"} size={24} color={done ? "#76D865" : "#7E8B9B"} />
          </View>
          <Text className="mt-3 text-[16px] font-bold text-ink">{label}</Text>
          {st && st.code ? (
            <Text className="mt-1 text-[13px] text-muted">Commande {st.code}</Text>
          ) : null}
          {busy ? <ActivityIndicator className="mt-3" color="#76D865" /> : null}
        </View>

        {st && st.rider_name ? (
          <View className="mt-3 flex-row items-center rounded-2xl bg-white p-4">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-soft">
              <Icon name="bike" size={18} color="#76D865" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[14px] font-bold text-ink">{st.rider_name}</Text>
              <Text className="text-[12px] text-muted">Livreur</Text>
            </View>
            {st.rider_phone ? (
              <Text className="text-[13px] font-semibold text-primary">{st.rider_phone}</Text>
            ) : null}
          </View>
        ) : null}

        {showMap ? <LiveMap st={st} /> : null}
        {hasRider ? (
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-[11px] text-muted">
              {age != null ? "Position du livreur mise a jour il y a " + age + " min" : "Position du livreur"}
            </Text>
            <Pressable onPress={openGoogle} className="active:opacity-70">
              <Text className="text-[12px] font-semibold text-primary">Ouvrir dans Google Maps</Text>
            </Pressable>
          </View>
        ) : null}

        {qr && qr.qr_code && !done ? (
          <View className="mt-3 items-center rounded-2xl bg-white p-4">
            <Text className="text-[13px] font-bold text-ink">Code de livraison</Text>
            <Text className="mt-1 text-center text-[12px] text-muted">
              Donne ce code au livreur pour confirmer la reception.
            </Text>
            <Text className="mt-3 text-[22px] font-extrabold tracking-widest text-primary">
              {qr.qr_code}
            </Text>
          </View>
        ) : null}
        <View className="mt-3 rounded-2xl bg-white p-4">
          <Text className="mb-2 text-[13px] font-bold text-ink">Recapitulatif</Text>
          {(st && st.items ? st.items : []).map((it, i) => (
            <View key={i} className="flex-row justify-between py-1">
              <Text className="flex-1 text-[13px] text-muted">{it.qty} x {it.name}</Text>
              <Text className="text-[13px] font-semibold text-ink">{money(it.qty * it.price)}</Text>
            </View>
          ))}
          <View className="mt-2 flex-row justify-between border-t border-line pt-2">
            <Text className="text-[13px] text-muted">Livraison</Text>
            <Text className="text-[13px] font-semibold text-ink">{money(st ? st.delivery_fee : 0)}</Text>
          </View>
          <View className="mt-1 flex-row justify-between">
            <Text className="text-[14px] font-bold text-ink">Total</Text>
            <Text className="text-[14px] font-extrabold text-primary">{money(st ? st.total : 0)}</Text>
          </View>
        </View>

        <Pressable onPress={refresh} className="mt-4 flex-row items-center justify-center rounded-2xl bg-white py-3 active:opacity-70">
          <Icon name="refresh" size={16} color="#1D1D1D" />
          <Text className="ml-2 text-[14px] font-semibold text-ink">Actualiser</Text>
        </Pressable>

        <Pressable onPress={onNew} className="mt-3 items-center rounded-2xl bg-primary py-3.5 active:opacity-80">
          <Text className="text-[15px] font-bold text-white">Commander a nouveau</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
