import React from "react";
import { View, Text, Pressable } from "react-native";
import Icon from "./Icon";
import colors from "../theme/colors";

export default function AppHeader({ title = "Commandes", subtitle, onMenuPress, onRefresh }) {
  return (
    <View className="flex-row items-center bg-white px-4 py-3.5">
      <Pressable
        onPress={onMenuPress}
        hitSlop={10}
        className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-primary-soft active:opacity-70"
      >
        <Icon name="menu" size={22} color={colors.primary} />
      </Pressable>
      <View className="flex-1">
        <Text className="text-[17px] font-bold text-ink">{title}</Text>
        {subtitle ? <Text className="text-[11px] text-muted">{subtitle}</Text> : null}
      </View>
      {onRefresh ? (
        <Pressable
          onPress={onRefresh}
          hitSlop={10}
          className="h-9 w-9 items-center justify-center rounded-full bg-chip active:opacity-70"
        >
          <Icon name="refresh" size={18} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}
