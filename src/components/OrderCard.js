import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../theme/colors";

const STATUS_LABELS = {
  pending: "Nouvel Ordre",
  new: "Nouvel Ordre",
  created: "Nouvel Ordre",
  accepted: "Acceptée",
  processing: "En traitement",
  in_progress: "En cours",
  picked_up: "Récupérée",
  on_the_way: "En route",
  delivered: "Livrée",
  completed: "Livrée",
  cancelled: "Annulée",
};

function formatAmount(total, currency) {
  if (total === null || total === undefined || total === "") return "—";
  const value = Number(total);
  if (Number.isNaN(value)) return String(total);
  const rounded = Math.round(value).toString();
  const spaced = rounded.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return spaced + " " + (currency || "FCFA");
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return day + "/" + month + " à " + hours + ":" + minutes;
}

export default function OrderCard({ order }) {
  const statusKey = String(order.status || "").trim().toLowerCase();
  const statusLabel = STATUS_LABELS[statusKey] || order.status || "Nouvel Ordre";
  const isDelivered = statusKey === "delivered" || statusKey === "completed";
  const isCancelled = statusKey === "cancelled";

  const badgeClass = isDelivered
    ? "bg-[#EBF9E8]"
    : isCancelled
    ? "bg-[#F4F5F7]"
    : "bg-[#EBF9E8]";

  const badgeTextClass = isDelivered
    ? "text-primary"
    : isCancelled
    ? "text-muted"
    : "text-primary";

  return (
    <View className="mb-3 rounded-2xl border border-line bg-white p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-bold text-ink">
          {order.reference || "Commande"}
        </Text>
        <View className={"rounded-full px-3 py-1 " + badgeClass}>
          <Text className={"text-[11px] font-semibold " + badgeTextClass}>
            {statusLabel}
          </Text>
        </View>
      </View>

      <View className="mt-3 flex-row items-center">
        <Ionicons name="person-outline" size={16} color={colors.muted} />
        <Text className="ml-2 flex-1 text-sm text-ink" numberOfLines={1}>
          {order.customer_name || "Client"}
        </Text>
      </View>

      <View className="mt-2 flex-row items-center">
        <Ionicons name="location-outline" size={16} color={colors.muted} />
        <Text className="ml-2 flex-1 text-sm text-muted" numberOfLines={2}>
          {order.address || "Adresse non renseignée"}
        </Text>
      </View>

      <View className="mt-3 flex-row items-center justify-between border-t border-line pt-3">
        <Text className="text-sm font-bold text-ink">
          {formatAmount(order.total, order.currency)}
        </Text>
        <Text className="text-[11px] text-muted">{formatDate(order.created_at)}</Text>
      </View>
    </View>
  );
}
