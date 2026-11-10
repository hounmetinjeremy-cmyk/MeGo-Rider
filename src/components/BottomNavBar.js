import React from "react";
import { View, Text, Pressable } from "react-native";
import Icon from "./Icon";
import colors from "../theme/colors";

export const NAV_ITEMS = [
  { key: "home", label: "Accueil", icon: "home" },
  { key: "wallet", label: "Portefeuille", icon: "wallet" },
  { key: "earnings", label: "Revenus", icon: "dollar" },
  { key: "profile", label: "Profil", icon: "user" },
];

export default function BottomNavBar({ activeKey = "home", onChange }) {
  return (
    <View className="flex-row items-center justify-between border-t border-line bg-white px-2 pb-2 pt-2">
      {NAV_ITEMS.map((item) => {
        const isActive = item.key === activeKey;
        const tint = isActive ? colors.primary : colors.muted;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange && onChange(item.key)}
            className="flex-1 items-center py-1 active:opacity-70"
          >
            <Icon name={item.icon} size={22} color={tint} strokeWidth={isActive ? 2.4 : 2} />
            <Text className={`mt-1 text-[11px] ${isActive ? "font-semibold text-primary" : "text-muted"}`}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
