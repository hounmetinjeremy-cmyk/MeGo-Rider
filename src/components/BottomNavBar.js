import React from "react";
import { View, Text, Pressable } from "react-native";
import Icon from "./Icon";
import BalanceStrip from "./BalanceStrip";
import colors from "../theme/colors";

const ITEMS = [
  { key: "marketplace", label: "Accueil", icon: "home" },
  { key: "home", label: "Courses", icon: "truck" },
  { key: "wallet", label: "Portefeuille", icon: "wallet" },
  { key: "earnings", label: "Revenus", icon: "dollar" },
];

/** Barre de navigation basse, avec le bandeau des soldes (disponible / en attente) au-dessus. */
export default function BottomNavBar({ activeKey = "home", onChange }) {
  return (
    <View>
      <BalanceStrip kind="rider" />
      <View className="flex-row items-center justify-around border-t border-line bg-navy px-2 pb-2 pt-2">
        {ITEMS.map((item) => {
          const isActive = item.key === activeKey;
          return (
            <Pressable
              key={item.key}
              onPress={() => onChange && onChange(item.key)}
              className="flex-1 items-center py-1"
            >
              <Icon
                name={item.icon}
                size={22}
                color={isActive ? colors.primary : colors.muted}
              />
              <Text
                className={`mt-1 text-[11px] ${
                  isActive ? "font-semibold text-primary" : "text-muted"
                }`}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
