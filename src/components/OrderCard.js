import React from "react";
import { View, Text, Pressable } from "react-native";
import Icon from "./Icon";
import colors from "../theme/colors";
import { formatMoney, formatDate } from "../lib/orders";

const STATUS_STYLE = {
  NEW: { label: "Nouveau", bg: "bg-primary-soft", text: "text-primary" },
  IN_PROGRESS: { label: "En cours", bg: "bg-chip", text: "text-navy" },
  DELIVERED: { label: "Livré", bg: "bg-chip", text: "text-muted" },
};

export default function OrderCard({ order, onAccept, onDeliver, busy = false }) {
  const style = STATUS_STYLE[order.status] || STATUS_STYLE.NEW;
  return (
    <View className="mb-3 rounded-2xl border border-line bg-white p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-[15px] font-bold text-ink">{order.code}</Text>
        <View className={`rounded-full px-2.5 py-1 ${style.bg}`}>
          <Text className={`text-[11px] font-semibold ${style.text}`}>{style.label}</Text>
        </View>
      </View>
      <Text className="mt-1 text-[13px] font-semibold text-ink">{order.vendor}</Text>
      <View className="mt-3">
        <View className="flex-row items-start">
          <Icon name="pin" size={15} color={colors.primary} />
          <Text className="ml-2 flex-1 text-[12px] text-muted">{order.pickup || "Point de retrait"}</Text>
        </View>
        <View className="mt-1.5 flex-row items-start">
          <Icon name="truck" size={15} color={colors.navy} />
          <Text className="ml-2 flex-1 text-[12px] text-muted">{order.delivery || "Adresse de livraison"}</Text>
        </View>
      </View>
      <View className="mt-3 flex-row items-center justify-between border-t border-line pt-3">
        <Text className="text-[15px] font-bold text-ink">{formatMoney(order.amount, order.currency)}</Text>
        <Text className="text-[11px] text-muted">{formatDate(order.createdAt)}</Text>
      </View>
      {onAccept || onDeliver ? (
        <View className="mt-3 flex-row">
          {onAccept ? (
            <Pressable
              onPress={onAccept}
              disabled={busy}
              className="flex-1 flex-row items-center justify-center rounded-xl bg-primary py-2.5 active:opacity-80"
            >
              <Icon name="check" size={16} color={colors.white} />
              <Text className="ml-2 text-[13px] font-semibold text-white">Accepter la livraison</Text>
            </Pressable>
          ) : null}
          {onDeliver ? (
            <Pressable
              onPress={onDeliver}
              disabled={busy}
              className="flex-1 flex-row items-center justify-center rounded-xl bg-navy py-2.5 active:opacity-80"
            >
              <Icon name="check" size={16} color={colors.white} />
              <Text className="ml-2 text-[13px] font-semibold text-white">Marquer comme livrée</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
