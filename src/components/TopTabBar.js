import React from "react";
import { View, Text, Pressable } from "react-native";
import { TABS } from "../lib/orders";

export default function TopTabBar({ activeTab, onChange, counts = {} }) {
  return (
    <View className="flex-row items-center border-b border-line bg-white px-2">
      {TABS.map((tab) => {
        const isActive = tab === activeTab;
        const count = counts[tab] || 0;
        return (
          <Pressable
            key={tab}
            onPress={() => onChange && onChange(tab)}
            className="flex-1 items-center py-3 active:opacity-70"
          >
            <Text className={`text-[13px] ${isActive ? "font-semibold text-primary" : "text-muted"}`}>
              {tab}
              {count ? ` (${count})` : ""}
            </Text>
            <View className={`mt-2 h-0.5 w-8 rounded-full ${isActive ? "bg-primary" : "bg-transparent"}`} />
          </Pressable>
        );
      })}
    </View>
  );
}
