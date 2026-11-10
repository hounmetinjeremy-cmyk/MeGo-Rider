import React from "react";
import { View, Text, Pressable, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

function getInitials(name) {
  return (name || "")
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * En-tete du drawer : fond vert, avatar avec initiales, nom, rider id,
 * switch Disponibilite fonctionnel et bouton de fermeture (croix).
 */
export default function RiderProfileBanner({
  riderName = "Nom du livreur",
  riderId = "rider id",
  available = true,
  onToggleAvailability,
  onClose,
}) {
  return (
    <View className="bg-primary px-4 pb-5 pt-4">
      <Pressable
        onPress={onClose}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Fermer le menu"
        className="absolute right-3 top-3 z-10 h-8 w-8 items-center justify-center rounded-full bg-white/70"
      >
        <Ionicons name="close" size={18} color={colors.ink} />
      </Pressable>

      <View className="flex-row items-center pr-9">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-white">
          <Text className="text-base font-bold text-primary">
            {getInitials(riderName)}
          </Text>
        </View>

        <View className="ml-3 flex-1">
          <Text className="text-[15px] font-bold text-ink" numberOfLines={1}>
            {riderName}
          </Text>
          <Text className="text-xs text-ink/60" numberOfLines={1}>
            {riderId}
          </Text>
        </View>

        <View className="items-end">
          <Text className="mb-1 text-xs font-semibold text-ink/70">
            Disponibilite
          </Text>
          <Switch
            value={available}
            onValueChange={onToggleAvailability}
            trackColor={{ false: "#C9D2DC", true: colors.navy }}
            thumbColor={colors.white}
          />
          <Text className="mt-1 text-[10px] font-semibold text-ink/70">
            {available ? "Actif" : "Inactif"}
          </Text>
        </View>
      </View>
    </View>
  );
}
