import React from "react";
import { View, Text, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

export const NAV_ITEMS = [
  { key: "Accueil", icon: "home-variant-outline", activeIcon: "home-variant" },
  { key: "Portefeuille", icon: "wallet-outline", activeIcon: "wallet" },
  { key: "Revenus", icon: "currency-usd-circle-outline", activeIcon: "currency-usd-circle" },
  { key: "Profil", icon: "account-outline", activeIcon: "account" },
];

/**
 * Barre de navigation inferieure : icone + libelle pour chaque onglet.
 * L'onglet actif passe en vert (#76D865).
 */
export default function BottomNavBar({ activeItem = "Accueil", onChange }) {
  return (
    <View className="flex-row items-center justify-around rounded-t-3xl bg-navy px-2 pb-3 pt-2">
      {NAV_ITEMS.map((item) => {
        const isActive = item.key === activeItem;
        const tint = isActive ? colors.primary : "#8A97A8";
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange && onChange(item.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            className="flex-1 items-center py-1"
          >
            <MaterialCommunityIcons
              name={isActive ? item.activeIcon : item.icon}
              size={24}
              color={tint}
            />
            <Text
              className="mt-1 text-[11px]"
              style={{ color: tint, fontWeight: isActive ? "600" : "400" }}
            >
              {item.key}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
