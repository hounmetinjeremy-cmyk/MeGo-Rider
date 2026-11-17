import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Linking } from "react-native";
import Icon from "../components/Icon";
import LiveMap from "../components/LiveMap";
import { money, getStatus, getOrderQr } from "../lib/shop";
import useRiderLive from "../hooks/useRiderLive";
import { fetchRoute, formatDistance, formatDuration } from "../lib/osrm";

const LABEL = {
  WAITING_PAYMENT: "Paiement en attente",
  SEARCHING: "Recherche d'un livreur",
  OFFERED: "Livreur contacte",
  ASSIGNED: "Livreur en route",
  PICKED: "Commande recuperee",
  DELIVERED: "Livree",
  NO_RIDER: "Aucun livreur disponible",
};

function minutesAgo(iso) {
  if (!iso) return null;
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  return m >= 0 ? m : null;
}

function point(lat, lng) {
  if (lat == null || lng == null) return null;
  const la = Number(lat);
  const ln = Number(lng);
  if (!isFinite(la) || !isFinite(ln)) return null;
  return { lat: la, lng: ln };
}

// Arrondi a ~100 m : evite de recalculer l'itineraire a chaque position recue.
function round3(n) {
  return n == null ? null : Math.round(Number(n) * 1000) / 1000;
}

export default function OrderScreen({ orderId, onBack, onNew }) {
  const [st, setSt] = useState(null);
  const [busy, setBusy] = useState(true);
  const [qr, setQr] = useState(null);
  const [route, setRoute] = useState(null);

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
  const done = dispatch === "DELIVERED";
  const riderId = st ? st.rider_id : null;

  // Position temps reel du livreur (Supabase Realtime broadcast, non stockee).
  const { live, online } = useRiderLive({
    riderId,
    orderId,
    enabled: !!riderId && !done,
  });

  const pickup = st ? point(st.pickup_lat, st.pickup_lng) : null;
  const drop = st ? point(st.delivery_lat, st.delivery_lng) : null;
  const rider = live
    ? { lat: live.lat, lng: live.lng }
    : st
    ? point(st.rider_lat, st.rider_lng)
    : null;

  const rLat = rider ? round3(rider.lat) : null;
  const rLng = rider ? round3(rider.lng) : null;
  const dLat = drop ? round3(drop.lat) : null;
  const dLng = drop ? round3(drop.lng) : null;

  // Itineraire routier livreur -> client (OSRM), repli silencieux si indisponible.
  useEffect(() => {
    if (rLat == null || rLng == null || dLat == null || dLng == null) {
      setRoute(null);
      return undefined;
    }
    const ctrl = new AbortController();
    let cancelled = false;
    fetchRoute({ lat: rLat, lng: rLng }, { lat: dLat, lng: dLng }, { signal: ctrl.signal })
      .then((r) => {
        if (!cancelled) setRoute(r);
      })
      .catch(() => {
        if (!cancelled) setRoute(null);
      });
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [rLat, rLng, dLat, dLng]);

  const label = st ? LABEL[dispatch] || st.status || "En cours" : "Chargement";
  const hasRider = !!rider && !done;
  const showMap = st && !done && (hasRider || !!pickup);
  const age = st ? minutesAgo(st.rider_updated_at) : null;
  const liveAge = live && live.ts ? Math.max(0, Math.floor((Date.now() - live.ts) / 1000)) : null;

  const openGoogle = () => {
    if (!rider) return;
    Linking.openURL(
      "https://www.google.com/maps/search/?api=1&query=" + rider.lat + "," + rider.lng
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
              <Text className="text-[12px] text-muted">
                Livreur{online ? " · en direct" : ""}
              </Text>
            </View>
            {st.rider_phone ? (
              <Text className="text-[13px] font-semibold text-primary">{st.rider_phone}</Text>
            ) : null}
          </View>
        ) : null}

        {showMap ? (
          <LiveMap rider={rider} pickup={pickup} delivery={drop} route={route} />
        ) : null}

        {hasRider ? (
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-[11px] text-muted">
              {liveAge != null
                ? "Position en direct, il y a " + liveAge + " s"
                : age != null
                ? "Position du livreur mise a jour il y a " + age + " min"
                : "Position du livreur"}
            </Text>
            <Pressable onPress={openGoogle} className="active:opacity-70">
              <Text className="text-[12px] font-semibold text-primary">Ouvrir dans Google Maps</Text>
            </Pressable>
          </View>
        ) : null}

        {route && hasRider ? (
          <View className="mt-2 flex-row items-center justify-between rounded-2xl bg-white px-4 py-3">
            <Text className="text-[12px] text-muted">Distance restante</Text>
            <Text className="text-[13px] font-bold text-ink">
              {formatDistance(route.distance)} · {formatDuration(route.duration)}
            </Text>
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
