import React from "react";
import { View, Text, Pressable } from "react-native";

export const ORDER_TABS = ["Nouvel Ordre", "En traitement", "Livré"];

/**
 * Barre d'onglets supérieure : onglet actif en texte sombre + soulignement vert.
 */
export default function TopTabBar({ tabs = ORDER_TABS, activeTab, onChange }) {
  return (
    <View className="flex-row border-b border-line bg-white">
      {tabs.map((tab) => {
        const isActive = tab === activeTab;
        return (
          <Pressable
            key={tab}
            onPress={() => onChange && onChange(tab)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            className="flex-1 items-center pt-3"
          >
            <Text
              className={
                isActive
                  ? "text-sm font-semibold text-ink"
                  : "text-sm font-medium text-muted"
              }
            >
              {tab}
            </Text>
            <View
              className={
                "mt-2 h-[3px] w-full rounded-full " +
                (isActive ? "bg-primary" : "bg-transparent")
              }
            />
          </Pressable>
        );
      })}
    </View>
  );
}
