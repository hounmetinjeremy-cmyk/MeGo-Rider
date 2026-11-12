import React from "react";
import { View, Text, Pressable, TextInput, ActivityIndicator } from "react-native";
import Icon from "./Icon";
import colors from "../theme/colors";

/** Bloc blanc arrondi reutilise par tous les ecrans. */
export function Card({ children, className = "" }) {
  return (
    <View className={`mb-3 rounded-2xl border border-line bg-white p-4 ${className}`}>
      {children}
    </View>
  );
}

/** Titre de section avec action optionnelle a droite. */
export function SectionTitle({ children, right }) {
  return (
    <View className="mb-2 flex-row items-center justify-between">
      <Text className="text-[13px] font-bold uppercase tracking-wide text-muted">{children}</Text>
      {right || null}
    </View>
  );
}

/** Ligne libelle / valeur, cliquable si onPress est fourni. */
export function Row({ label, value, icon, onPress, right }) {
  const content = (
    <View className="flex-row items-center justify-between py-2.5">
      <View className="flex-1 flex-row items-center">
        {icon ? <Icon name={icon} size={16} color={colors.muted} /> : null}
        <Text className={`text-[13px] text-muted ${icon ? "ml-2" : ""}`}>{label}</Text>
      </View>
      {right || <Text className="ml-3 text-[13px] font-semibold text-ink">{value}</Text>}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} className="active:opacity-70">
      {content}
    </Pressable>
  );
}

/** Bouton principal (vert), sombre ou discret. */
export function Button({ label, onPress, variant = "primary", disabled = false, loading = false, icon }) {
  const bg = { primary: "bg-primary", dark: "bg-navy", ghost: "bg-chip" };
  const fg = variant === "ghost" ? colors.ink : "#FFFFFF";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`flex-row items-center justify-center rounded-xl py-3.5 ${bg[variant] || bg.primary} ${disabled ? "opacity-50" : "active:opacity-80"}`}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={16} color={fg} /> : null}
          <Text className={`text-[14px] font-bold ${variant === "ghost" ? "text-ink" : "text-white"} ${icon ? "ml-2" : ""}`}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/** Petite pastille d'etat. */
export function Badge({ label, tone = "chip" }) {
  const tones = {
    chip: "bg-chip text-muted",
    primary: "bg-primarySoft text-primary",
    navy: "bg-navy text-white",
    warn: "bg-chip text-ink",
  };
  return (
    <View className={`rounded-full px-2.5 py-1 ${(tones[tone] || tones.chip).split(" ")[0]}`}>
      <Text className={`text-[11px] font-bold ${(tones[tone] || tones.chip).split(" ")[1]}`}>{label}</Text>
    </View>
  );
}

/** Champ de saisie avec libelle. */
export function Input({ label, value, onChangeText, placeholder, keyboardType = "default", multiline = false, secureTextEntry = false, autoCapitalize = "sentences" }) {
  return (
    <View className="mb-3">
      {label ? <Text className="mb-1.5 text-[12px] font-semibold text-muted">{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        className={`rounded-xl border border-line bg-white px-3.5 py-3 text-[14px] text-ink ${multiline ? "h-24" : ""}`}
      />
    </View>
  );
}

export default Card;
