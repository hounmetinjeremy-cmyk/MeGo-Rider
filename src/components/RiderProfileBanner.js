import React from "react";
import { View, Text, Switch } from "react-native";
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
 * En-tête du drawer : bannière verte (#76D865) avec avatar à initiales,
 * nom du livreur, rider id et switch de disponibilité (Actif / Inactif).
 */
export default function RiderProfileBanner({
  riderName = "Nom du livreur",
  riderId = "rider id",
  available = true,
  onToggleAvailability,
}) {
  const initials = getInitials(riderName);

  return (
    <View className="bg-primary px-4 pb-5 pt-6">
      <View className="flex-row items-center">
        <View className="h-14 w-14 items-center justify-center rounded-full bg-white">
          <Text className="text-lg font-bold text-primary">{initials}</Text>
        </View>

        <View className="ml-3 flex-1">
          <Text className="text-base font-bold text-ink">{riderName}</Text>
          <Text className="text-xs text-ink/60">{riderId}</Text>
        </View>

        <View className="items-end">
          <Text className="mb-1 text-xs font-semibold text-ink/70">
            Disponibilité
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
