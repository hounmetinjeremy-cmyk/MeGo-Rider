import React from "react";
import { View, Text } from "react-native";
import Icon from "./Icon";
import colors from "../theme/colors";
import { formatMoney, formatDate, orderState } from "../lib/orders";

/**
 * Carte de commande côté vendeur, en lecture seule : le vendeur voit ce qu'il doit préparer
 * et où en est la livraison. Le livreur est choisi automatiquement par le système.
 */
export default function OrderCard({ order }) {
  const state = orderState(order);
  const created = order.createdAt || order.created_at;
  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <View className="mb-4 rounded-xl bg-white p-4 shadow-sm">
      <View className="flex-row items-center justify-between">
        <Text className="text-[15px] font-bold text-ink">{order.code}</Text>
        <View className={`rounded-full px-2.5 py-1 ${state.bg}`}>
          <Text className={`text-[11px] font-semibold ${state.text}`}>{state.label}</Text>
        </View>
      </View>

      {order.customer ? (
        <Text className="mt-1 text-[13px] text-muted">
          {order.customer}
          {order.phone ? ` · ${order.phone}` : ""}
        </Text>
      ) : null}

      {items.length ? (
        <View className="mt-3 rounded-lg bg-chip px-3 py-2">
          <Text className="mb-1 text-[11px] font-semibold uppercase text-muted">À préparer</Text>
          {items.map((it, i) => (
            <Text key={`${it.id || i}-${i}`} className="text-[13px] text-ink">
              {it.qty} × {it.name}
            </Text>
          ))}
        </View>
      ) : null}

      <View className="mt-3">
        <View className="flex-row items-start">
          <Icon name="home" size={16} color={colors.muted} />
          <Text className="ml-2 flex-1 text-[13px] text-ink">{order.delivery || "—"}</Text>
        </View>
      </View>

      <View className="mt-3 flex-row items-center justify-between border-t border-line pt-3">
        <Text className="text-[15px] font-bold text-ink">
          {formatMoney(order.amount, order.currency)}
        </Text>
        <Text className="text-[11px] text-muted">{formatDate(created)}</Text>
      </View>
    </View>
  );
}
