import React from "react";
import { View, Text, Pressable } from "react-native";
import { TABS } from "../lib/orders";

/** Onglets de l'écran Commandes (Nouvel Ordre / En traitement / Livré). */
export default function TopTabBar({ activeTab, onChange }) {
  return (
    <View className="flex-row border-b border-line bg-white">
      {TABS.map((tab) => {
        const isActive = tab === activeTab;
        return (
          <Pressable
            key={tab}
            onPress={() => onChange && onChange(tab)}
            className="flex-1 items-center pt-3"
          >
            <Text
              className={`text-[13px] ${
                isActive ? "font-semibold text-primary" : "text-muted"
              }`}
            >
              {tab}
            </Text>
            <View
              className={`mt-2 h-0.5 w-8 rounded-full ${
                isActive ? "bg-primary" : "bg-transparent"
              }`}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
