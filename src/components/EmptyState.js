import React from "react";
import { View, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

/**
 * État vide centré : icône portefeuille (contour noir épais) + message.
 */
export default function EmptyState({
  message = "Aucune nouvelle commande pour le moment !",
}) {
  return (
    <View className="flex-1 items-center justify-center px-10">
      <MaterialCommunityIcons
        name="wallet-outline"
        size={96}
        color={colors.ink}
      />
      <Text className="mt-6 text-center text-sm text-muted">{message}</Text>
    </View>
  );
}
