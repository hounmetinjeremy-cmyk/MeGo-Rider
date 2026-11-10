import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

/**
 * Item de navigation du drawer.
 * - icône dans un cercle gris clair (#F4F5F7)
 * - libellé au centre
 * - chevron gris à droite
 * - fond vert clair (#EBF9E8) quand l'item est actif
 * - bordure ultra-fine (#E5E7EB) en bas (désactivable pour le dernier item d'un groupe)
 */
export default function MenuItem({
  icon,
  label,
  active = false,
  onPress,
  showSeparator = true,
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`flex-row items-center px-4 py-3.5 ${
        active ? "bg-primary-soft" : "bg-white"
      }`}
    >
      <View className="h-9 w-9 items-center justify-center rounded-full bg-chip">
        <Ionicons
          name={icon}
          size={18}
          color={active ? colors.primary : colors.ink}
        />
      </View>

      <Text
        className={`ml-3 flex-1 text-[15px] ${
          active ? "font-semibold text-ink" : "text-ink"
        }`}
      >
        {label}
      </Text>

      <Ionicons name="chevron-forward" size={18} color={colors.muted} />

      {showSeparator ? (
        <View className="absolute bottom-0 left-4 right-4 h-px bg-line" />
      ) : null}
    </Pressable>
  );
}
