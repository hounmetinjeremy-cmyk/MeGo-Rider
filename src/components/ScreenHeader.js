import React from "react";
import { View, Text, Pressable } from "react-native";
import Icon from "./Icon";

/**
 * En-tête des écrans secondaires (ouverts depuis le menu latéral).
 * Flèche de retour à gauche, titre centré.
 */
export default function ScreenHeader({ title, onBack }) {
  return (
    <View className="flex-row items-center justify-between border-b border-line bg-white px-4 py-3.5">
      <Pressable
        onPress={onBack}
        hitSlop={10}
        className="h-10 w-10 items-center justify-center rounded-full bg-chip"
      >
        <Icon name="chevronLeft" size={20} color="#1D1D1D" />
      </Pressable>
      <Text className="text-[17px] font-bold text-ink">{title}</Text>
      <View className="h-10 w-10" />
    </View>
  );
}
