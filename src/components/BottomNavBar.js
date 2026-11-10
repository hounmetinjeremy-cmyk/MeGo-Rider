import React from "react";
import { View, Text, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

export const NAV_ITEMS = [
  { key: "Accueil", icon: "home-variant-outline" },
  { key: "Portefeuille", icon: "wallet-outline" },
  { key: "Revenus", icon: "currency-usd-circle-outline" },
  { key: "Profil", icon: "account-outline" },
];

/**
 * Barre de navigation inférieure sombre, coins arrondis en haut.
 */
export default function BottomNavBar({ activeItem = "Accueil", onChange }) {
  return (
    <View className="flex-row items-center justify-around rounded-t-3xl bg-navy px-2 pb-6 pt-3">
      {NAV_ITEMS.map((item) => {
        const isActive = item.key === activeItem;
        const tint = isActive ? colors.primary : colors.muted;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange && onChange(item.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            className="flex-1 items-center"
          >
            <MaterialCommunityIcons name={item.icon} size={24} color={tint} />
            <Text
              className={
                "mt-1 text-[11px] " +
                (isActive ? "font-semibold text-primary" : "text-muted")
              }
            >
              {item.key}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
