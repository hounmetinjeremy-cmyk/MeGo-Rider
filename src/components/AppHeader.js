import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

/**
 * Header / App Bar : icone burger verte (#76D865) a gauche, titre centre.
 */
export default function AppHeader({ title = "Commandes", onMenuPress }) {
  return (
    <View className="h-14 flex-row items-center bg-white px-3">
      <Pressable
        onPress={onMenuPress}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Ouvrir le menu"
        className="h-10 w-10 items-center justify-center rounded-full active:bg-chip"
      >
        <Ionicons name="menu" size={26} color={colors.primary} />
      </Pressable>

      <Text className="flex-1 text-center text-[17px] font-semibold text-ink">
        {title}
      </Text>

      <View className="h-10 w-10" />
    </View>
  );
}
