import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

/**
 * Header / App Bar : titre centré + icône burger verte à gauche.
 */
export default function AppHeader({ title = "Commandes", onMenuPress }) {
  return (
    <View className="h-14 flex-row items-center justify-between bg-white px-3">
      <Pressable
        onPress={onMenuPress}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Ouvrir le menu"
        className="h-10 w-10 items-center justify-center rounded-full active:bg-chip"
      >
        <Ionicons name="menu" size={26} color={colors.primary} />
      </Pressable>

      <Text className="text-lg font-bold text-ink">{title}</Text>

      {/* Espace miroir pour garder le titre parfaitement centré */}
      <View className="h-10 w-10" />
    </View>
  );
}
