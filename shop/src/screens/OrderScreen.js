import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import Icon from "../components/Icon";
import { money, getStatus } from "../lib/shop";

const LABEL = {
  WAITING_PAYMENT: "Paiement en attente",
  SEARCHING: "Recherche d'un livreur",
  OFFERED: "Livreur contacte",
  ASSIGNED: "Livreur en route",
  PICKED: "Commande recuperee",
  DELIVERED: "Livree",
  NO_RIDER: "Aucun livreur disponible",
};

export default function OrderScreen({ orderId, onBack, onNew }) {
  const [st, setSt] = useState(null);
  const [busy, setBusy] = useState(true);

  const refresh = async () => {
    setBusy(true);
    const r = await getStatus(orderId);
    setBusy(false);
    if (r && r.ok !== false) setSt(r);
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 10000);
    return () => clearInterval(t);
  }, [orderId]);

  const dispatch = st ? st.dispatch : null;
  const label = st ? LABEL[dispatch] || st.status || "En cours" : "Chargement";
  const done = dispatch === "DELIVERED";

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
