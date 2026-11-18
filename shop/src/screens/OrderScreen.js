import React, { useEffect, useRef, useState } from "react";
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

// Ordre impose : Portefeuille en premier.
const TABS = [
  { key: "wallet", label: "Portefeuille", icon: "wallet" },
  { key: "map", label: "Suivi GPS", icon: "pin" },
  { key: "qr", label: "Code QR", icon: "shield" },
  { key: "receipt", label: "Détails & Reçu", icon: "package" },
];

const PRIMARY = "#76D865";
const MUTED = "#7E8B9B";

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
  const [tab, setTab] = useState(0);
  const [w, setW] = useState(0);
  const pager = useRef(null);

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

  const goTo = (i) => {
    setTab(i);
    if (pager.current && w > 0) pager.current.scrollTo({ x: i * w, animated: true });
  };

  const onPagerScroll = (e) => {
    if (w <= 0) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / w);
    if (i >= 0 && i < TABS.length && i !== tab) setTab(i);
  };

  const dispatch = st ? st.dispatch : null;
  const done = dispatch === "DELIVERED";
  const waiting = dispatch === "WAITING_PAYMENT";
  const noRider = dispatch === "NO_RIDER";
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
  const total = st ? st.total : 0;

  const openGoogle = () => {
    if (!rider) return;
    Linking.openURL(
      "https://www.google.com/maps/search/?api=1&query=" + rider.lat + "," + rider.lng
    ).catch(() => {});
  };

  // Etat de l'argent (sequestre) pour l'onglet Portefeuille.
  let wallet;
  if (done) {
    wallet = {
      title: "Montant libere",
      icon: "check",
      state: "Paiement transmis au vendeur et au livreur",
      hint: "La livraison est confirmee. Merci !",
    };
  } else if (noRider) {
    wallet = {
      title: "Montant a rembourser",
      icon: "refresh",
      state: "Aucun livreur disponible",
      hint: "Ton argent te sera rembourse.",
    };
  } else if (waiting) {
    wallet = {
      title: "Montant a payer",
      icon: "clock",
      state: "Paiement en attente",
      hint: "Valide la demande Mobile Money sur ton telephone.",
    };
  } else {
    wallet = {
      title: "Montant bloque",
      icon: "shield",
      state: "Argent garde en securite",
      hint: "Il est libere au vendeur et au livreur quand le livreur scanne ton code.",
    };
  }

  const pageProps = {
    style: { width: w },
    contentContainerStyle: { padding: 16, paddingBottom: 24 },
  };

  return (
    <View className="flex-1 bg-surface">
      <View className="flex-row items-center bg-navy px-4 pb-4 pt-6">
        <Pressable
          onPress={onBack}
          className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-white/10 active:opacity-70"
        >
          <Icon name="chevronRight" size={18} color="#FFFFFF" />
        </Pressable>
        <Text className="text-[16px] font-bold text-white">Suivi de commande</Text>
      </View>

      <View className="flex-row items-center bg-white px-4 py-3">
        <View
          className={`h-10 w-10 items-center justify-center rounded-full ${
            done ? "bg-primary-soft" : "bg-chip"
          }`}
        >
          <Icon name={done ? "check" : "truck"} size={20} color={done ? PRIMARY : MUTED} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[15px] font-bold text-ink">{label}</Text>
          {st && st.code ? (
            <Text className="text-[12px] text-muted">Commande {st.code}</Text>
          ) : null}
        </View>
        {busy ? <ActivityIndicator color={PRIMARY} /> : null}
      </View>

      <View className="flex-1" onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {w > 0 ? (
          <ScrollView
            ref={pager}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onPagerScroll}
            scrollEventThrottle={16}
            style={{ flex: 1 }}
          >
            {/* 1. Portefeuille */}
            <ScrollView {...pageProps}>
              <View className="rounded-2xl bg-white p-5">
                <Text className="text-[12px] text-muted">{wallet.title}</Text>
                <Text className="mt-1 text-[28px] font-extrabold text-primary">
                  {money(total)}
                </Text>
                <View className="mt-3 flex-row items-center">
                  <Icon name={wallet.icon} size={18} color={PRIMARY} />
                  <Text className="ml-2 flex-1 text-[13px] font-semibold text-ink">
                    {wallet.state}
                  </Text>
                </View>
                <Text className="mt-2 text-[12px] text-muted">{wallet.hint}</Text>
              </View>

              <View className="mt-3 rounded-2xl bg-white p-4">
                <Text className="mb-2 text-[13px] font-bold text-ink">Remboursement</Text>
                <Text className="text-[12px] text-muted">
                  Si le livreur ne scanne jamais ton code, l'argent bloque te est rembourse au
                  bout du delai prevu. Aucun livreur trouve : remboursement aussi.
                </Text>
              </View>
            </ScrollView>

            {/* 2. Suivi GPS (carte) */}
            <ScrollView {...pageProps}>
              {st && st.rider_name ? (
                <View className="mb-3 flex-row items-center rounded-2xl bg-white p-4">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-soft">
                    <Icon name="bike" size={18} color={PRIMARY} />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-[14px] font-bold text-ink">{st.rider_name}</Text>
                    <Text className="text-[12px] text-muted">
                      Livreur{online ? " · en direct" : ""}
                    </Text>
                  </View>
                  {st.rider_phone ? (
                    <Text className="text-[13px] font-semibold text-primary">
                      {st.rider_phone}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {showMap ? (
                <LiveMap rider={rider} pickup={pickup} delivery={drop} route={route} />
              ) : (
                <View className="items-center rounded-2xl bg-white p-6">
                  <Icon name="pin" size={24} color={MUTED} />
                  <Text className="mt-2 text-center text-[13px] text-muted">
                    {done
                      ? "Livraison terminee."
                      : "Le suivi GPS demarre des qu'un livreur prend ta commande."}
                  </Text>
                </View>
              )}

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
                    <Text className="text-[12px] font-semibold text-primary">
                      Ouvrir dans Google Maps
                    </Text>
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
            </ScrollView>

            {/* 3. Code QR / Validation */}
            <ScrollView {...pageProps}>
              {qr && qr.qr_code && !done ? (
                <View className="items-center rounded-2xl bg-white p-6">
                  <Icon name="shield" size={28} color={PRIMARY} />
                  <Text className="mt-2 text-[13px] font-bold text-ink">Code de livraison</Text>
                  <Text className="mt-1 text-center text-[12px] text-muted">
                    Donne ce code au livreur pour confirmer la reception. Il debloque le
                    paiement.
                  </Text>
                  <Text className="mt-4 text-[32px] font-extrabold tracking-widest text-primary">
                    {qr.qr_code}
                  </Text>
                </View>
              ) : (
                <View className="items-center rounded-2xl bg-white p-6">
                  <Icon name={done ? "check" : "clock"} size={28} color={done ? PRIMARY : MUTED} />
                  <Text className="mt-2 text-center text-[13px] text-muted">
                    {done
                      ? "Livraison confirmee, le code a ete valide."
                      : "Ton code apparaitra ici des que le paiement est valide."}
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* 4. Details & Recu */}
            <ScrollView {...pageProps}>
              <View className="rounded-2xl bg-white p-4">
                <Text className="mb-2 text-[13px] font-bold text-ink">Recapitulatif</Text>
                {(st && st.items ? st.items : []).map((it, i) => (
                  <View key={i} className="flex-row justify-between py-1">
                    <Text className="flex-1 text-[13px] text-muted">
                      {it.qty} x {it.name}
                    </Text>
                    <Text className="text-[13px] font-semibold text-ink">
                      {money(it.qty * it.price)}
                    </Text>
                  </View>
                ))}
                <View className="mt-2 flex-row justify-between border-t border-line pt-2">
                  <Text className="text-[13px] text-muted">Livraison</Text>
                  <Text className="text-[13px] font-semibold text-ink">
                    {money(st ? st.delivery_fee : 0)}
                  </Text>
                </View>
                <View className="mt-1 flex-row justify-between">
                  <Text className="text-[14px] font-bold text-ink">Total</Text>
                  <Text className="text-[14px] font-extrabold text-primary">
                    {money(total)}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={refresh}
                className="mt-4 flex-row items-center justify-center rounded-2xl bg-white py-3 active:opacity-70"
              >
                <Icon name="refresh" size={16} color="#1D1D1D" />
                <Text className="ml-2 text-[14px] font-semibold text-ink">Actualiser</Text>
              </Pressable>

              <Pressable
                onPress={onNew}
                className="mt-3 items-center rounded-2xl bg-primary py-3.5 active:opacity-80"
              >
                <Text className="text-[15px] font-bold text-white">Commander a nouveau</Text>
              </Pressable>
            </ScrollView>
          </ScrollView>
        ) : null}
      </View>

      {/* Barre d'onglets */}
      <View className="flex-row border-t border-line bg-white pb-2 pt-1">
        {TABS.map((t, i) => {
          const active = tab === i;
          return (
            <Pressable
              key={t.key}
              onPress={() => goTo(i)}
              className="flex-1 items-center px-1 py-2 active:opacity-70"
            >
              <Icon name={t.icon} size={20} color={active ? PRIMARY : MUTED} />
              <Text
                numberOfLines={2}
                style={{
                  marginTop: 2,
                  fontSize: 10,
                  textAlign: "center",
                  fontWeight: active ? "700" : "500",
                  color: active ? PRIMARY : MUTED,
                }}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
