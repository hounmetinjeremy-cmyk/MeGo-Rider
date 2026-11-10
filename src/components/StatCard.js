import React from "react";
import { View, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

/**
 * Petite carte de statistique reutilisable (icone + libelle + valeur).
 */
export default function StatCard({ icon, label, value, tint = colors.primary }) {
  return (
    <View className="flex-1 rounded-2xl border border-line bg-white p-3">
      <View
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: colors.chip }}
      >
        <MaterialCommunityIcons name={icon} size={18} color={tint} />
      </View>
      <Text className="mt-2 text-[11px] text-muted">{label}</Text>
      <Text className="mt-0.5 text-[15px] font-bold text-ink">{value}</Text>
    </View>
  );
}
