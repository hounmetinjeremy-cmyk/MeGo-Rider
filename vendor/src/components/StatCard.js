import React from "react";
import { View, Text } from "react-native";
import Icon from "./Icon";
import colors from "../theme/colors";

export default function StatCard({ icon = "trend", label, value, tint = colors.primary }) {
  return (
    <View className="flex-1 rounded-2xl border border-line bg-white p-4">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-chip">
        <Icon name={icon} size={18} color={tint} />
      </View>
      <Text className="mt-3 text-[11px] text-muted">{label}</Text>
      <Text className="mt-0.5 text-[16px] font-bold text-ink">{value}</Text>
    </View>
  );
}
