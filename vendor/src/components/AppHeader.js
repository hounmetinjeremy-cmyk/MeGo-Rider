import React from "react";
import { View, Text, Pressable } from "react-native";
import Icon from "./Icon";
import colors from "../theme/colors";

/**
 * En-tête fixe : burger vert à gauche, titre centré.
 * Layout en flex-row (pas de position absolue) : aucun chevauchement possible.
 */
export default function AppHeader({ title = "Commandes", subtitle, onMenuPress }) {
  return (
    <View className="flex-row items-center justify-between border-b border-line bg-white px-4 py-3.5">
      <Pressable
        onPress={onMenuPress}
        hitSlop={10}
        className="h-10 w-10 items-center justify-center rounded-full"
      >
        <Icon name="menu" size={24} color={colors.primary} />
      </Pressable>

      <View className="flex-1 items-center px-2">
        <Text className="text-[17px] font-bold text-ink">{title}</Text>
        {subtitle ? (
          <Text className="mt-0.5 text-[12px] text-muted">{subtitle}</Text>
        ) : null}
      </View>

      <View className="h-10 w-10" />
    </View>
  );
}
