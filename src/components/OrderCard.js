import React from "react";
import { View, Text, Pressable, ActivityIndicator, Linking } from "react-native";
import Icon from "./Icon";
import colors from "../theme/colors";
import { formatMoney, formatDate } from "../lib/orders";
import { supabase } from "../lib/supabaseClient";

const STATUS_STYLE = {
  NEW: { label: "Nouveau", bg: "bg-primary-soft", text: "text-primary" },
  IN_PROGRESS: { label: "En cours", bg: "bg-chip", text: "text-ink" },
  DELIVERED: { label: "Livré", bg: "bg-chip", text: "text-muted" },
};

/** Ouvre l'itinéraire (Google Maps) vers le vendeur (pickup) ou le client (delivery). */
async function openRoute(orderId, target, fallbackText) {
  let lat = null;
  let lng = null;
  try {
    const { data } = await supabase
      .from("orders")
      .select("pickup_lat,pickup_lng,delivery_lat,delivery_lng")
      .eq("id", orderId)
      .single();
    if (data) {
      lat = target === "pickup" ? data.pickup_lat : data.delivery_lat;
      lng = target === "pickup" ? data.pickup_lng : data.delivery_lng;
    }
  } catch (e) {
    // on retombe sur l'adresse texte
  }
  const hasCoords = lat != null && lng != null;
  if (!hasCoords && !fallbackText) return;
  const dest = hasCoords ? lat + "," + lng : encodeURIComponent(fallbackText);
  Linking.openURL("https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=" + dest).catch(() => {});
}

/** Carte de commande : bloc blanc arrondi avec ombre légère. */
export default function OrderCard({ order, onAccept, onDecline, onDeliver, busy }) {
  const style = STATUS_STYLE[order.status] || STATUS_STYLE.NEW;
  const created = order.createdAt || order.created_at;
  const offered = order.dispatch === "OFFERED" && !!onAccept;
  const inProgress = order.status === "IN_PROGRESS";

  return (
    <View className="mb-4 rounded-xl bg-white p-4 shadow-sm">
      <View className="flex-row items-center justify-between">
        <Text className="text-[15px] font-bold text-ink">{order.code}</Text>
        <View className={`rounded-full px-2.5 py-1 ${style.bg}`}>
          <Text className={`text-[11px] font-semibold ${style.text}`}>
            {style.label}
          </Text>
        </View>
      </View>

      <Text className="mt-1 text-[13px] text-muted">{order.vendor}</Text>

      {offered ? (
        <Text className="mt-2 text-[12px] font-semibold text-primary">
          Course proposée pour toi : réponds vite, elle passe au livreur suivant sinon.
        </Text>
      ) : null}

      <View className="mt-3">
        <View className="flex-row items-start">
          <Icon name="package" size={16} color={colors.muted} />
          <Text className="ml-2 flex-1 text-[13px] text-ink">
            {order.pickup || "—"}
          </Text>
        </View>
        <View className="mt-2 flex-row items-start">
          <Icon name="home" size={16} color={colors.muted} />
          <Text className="ml-2 flex-1 text-[13px] text-ink">
            {order.delivery || "—"}
          </Text>
        </View>
      </View>

      {inProgress ? (
        <View className="mt-3 flex-row">
          <Pressable
            onPress={() => openRoute(order.id, "pickup", order.pickup || order.vendor)}
            className="mr-2 flex-1 items-center rounded-lg bg-primary-soft py-2.5 active:opacity-70"
          >
            <Text className="text-[12px] font-semibold text-primary">Aller chez le vendeur</Text>
          </Pressable>
          <Pressable
            onPress={() => openRoute(order.id, "delivery", order.delivery)}
            className="flex-1 items-center rounded-lg bg-primary-soft py-2.5 active:opacity-70"
          >
            <Text className="text-[12px] font-semibold text-primary">Aller chez le client</Text>
          </Pressable>
        </View>
      ) : null}

      <View className="mt-3 flex-row items-center justify-between border-t border-line pt-3">
        <Text className="text-[15px] font-bold text-ink">
          {formatMoney(order.amount, order.currency)}
        </Text>
        <Text className="text-[11px] text-muted">{formatDate(created)}</Text>
      </View>

      {onAccept || onDeliver ? (
        <View className="mt-3">
          {onAccept ? (
            <View className="flex-row">
              <Pressable
                onPress={onAccept}
                disabled={busy}
                className="flex-1 items-center rounded-lg bg-primary py-3"
              >
                {busy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-[14px] font-semibold text-white">
                    Accepter la livraison
                  </Text>
                )}
              </Pressable>
              {onDecline ? (
                <Pressable
                  onPress={onDecline}
                  disabled={busy}
                  className="ml-2 items-center justify-center rounded-lg bg-chip px-4 py-3"
                >
                  <Text className="text-[14px] font-semibold text-ink">Refuser</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {onDeliver ? (
            <Pressable
              onPress={onDeliver}
              disabled={busy}
              className="mt-2 items-center rounded-lg bg-navy py-3"
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-[14px] font-semibold text-white">
                  Valider la livraison (code client)
                </Text>
              )}
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
