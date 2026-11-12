import React from "react";
import { View, Text } from "react-native";
import Icon from "./Icon";
import colors from "../theme/colors";

export default function EmptyState({ icon = "package", message = "Aucune commande pour le moment !" }) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-chip">
        <Icon name={icon} size={30} color={colors.muted} />
      </View>
      <Text className="mt-4 text-center text-sm text-muted">{message}</Text>
    </View>
  );
}
