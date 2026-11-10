import React from "react";
import { View, Text, Pressable, Switch } from "react-native";
import Icon from "./Icon";
import colors from "../theme/colors";

export function initialsOf(name = "") {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return initials || "JS";
}

export default function RiderProfileBanner({
  riderName = "Nom du livreur",
  riderCode = "rider id",
  available = false,
  onToggleAvailability,
  onClose,
}) {
  return (
    <View className="bg-primary px-4 pb-5 pt-6">
      <View className="flex-row items-start">
        <View className="h-14 w-14 items-center justify-center rounded-full bg-white">
          <Text className="text-[18px] font-bold text-primary">{initialsOf(riderName)}</Text>
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[16px] font-bold text-ink">{riderName}</Text>
          <Text className="text-[12px] text-ink/70">{riderCode}</Text>
        </View>
        <Pressable
          onPress={onClose}
          hitSlop={10}
          className="h-8 w-8 items-center justify-center rounded-full bg-white/40 active:opacity-70"
        >
          <Icon name="close" size={18} color={colors.ink} />
        </Pressable>
      </View>
      <View className="mt-4 flex-row items-center justify-between">
        <Text className="text-[13px] font-semibold text-ink/80">Disponibilité</Text>
        <View className="flex-row items-center">
          <Text className="mr-2 text-[11px] font-semibold text-ink/70">
            {available ? "Actif" : "Inactif"}
          </Text>
          <Switch
            value={available}
            onValueChange={onToggleAvailability}
            trackColor={{ false: "#C9D2DC", true: colors.navy }}
            thumbColor={colors.white}
          />
        </View>
      </View>
    </View>
  );
}
