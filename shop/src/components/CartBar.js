import React from "react";
import { View, Text, Pressable } from "react-native";
import Icon from "./Icon";

export default function CartBar({ count, total, onPress }) {
  if (!count) return null;
  return (
    <Pressable
      onPress={onPress}
      className="absolute bottom-4 left-4 right-4 flex-row items-center justify-between rounded-2xl bg-navy px-4 py-3 active:opacity-90">
      <View className="flex-row items-center">
        <Icon name="card" size={18} color="#FFFFFF" />
        <Text className="ml-2 text-[14px] font-bold text-white">Voir le panier ({count})</Text>
      </View>
      <Text className="text-[14px] font-extrabold text-primary">
        {Number(total || 0).toLocaleString("fr-FR")} F
      </Text>
    </Pressable>
  );
}
