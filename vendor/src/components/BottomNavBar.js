import React from "react";
import { View, Text, Pressable } from "react-native";
import Icon from "./Icon";
import BalanceStrip from "./BalanceStrip";
import colors from "../theme/colors";

const ITEMS = [
  { key: "marketplace", label: "Accueil", icon: "home" },
  { key: "home", label: "Gestion", icon: "package" },
  { key: "orders", label: "Commandes", icon: "truck" },
  { key: "products", label: "Produits", icon: "card" },
  { key: "wallet", label: "Portefeuille", icon: "wallet" },
  { key: "earnings", label: "Revenus", icon: "dollar" },
];

/** Barre de navigation basse, avec le bandeau des soldes (disponible / en attente) au-dessus. */
export default function BottomNavBar({ activeKey = "home", onChange }) {
  return (
    <View>
      <BalanceStrip kind="vendor" />
      <View className="flex-row items-center justify-around border-t border-line bg-navy px-1 pb-2 pt-2">
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
                numberOfLines={1}
                adjustsFontSizeToFit
                className={`mt-1 text-[10px] ${
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
