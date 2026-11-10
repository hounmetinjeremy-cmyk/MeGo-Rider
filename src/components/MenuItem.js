import React from "react";
import { View, Text, Pressable } from "react-native";
import Icon from "./Icon";
import colors from "../theme/colors";

export default function MenuItem({ icon, label, active = false, onPress, showSeparator = true }) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center px-4 py-3.5 ${active ? "bg-primary-soft" : "bg-white"} active:opacity-80`}
    >
      <View className="h-9 w-9 items-center justify-center rounded-full bg-chip">
        <Icon name={icon} size={18} color={active ? colors.primary : colors.ink} />
      </View>
      <Text className={`ml-3 flex-1 text-[15px] ${active ? "font-semibold text-primary" : "text-ink"}`}>
        {label}
      </Text>
      <Icon name="chevronRight" size={18} color={colors.muted} />
      {showSeparator ? <View className="absolute bottom-0 left-4 right-4 h-px bg-line" /> : null}
    </Pressable>
  );
}
