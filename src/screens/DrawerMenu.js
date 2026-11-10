import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Switch } from "react-native";
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import { colors } from "../theme/colors";

const MENU_ITEMS = [
  { key: "home", label: "Accueil", icon: "home-outline", lib: "ion" },
  { key: "lang", label: "Langue", icon: "language-outline", lib: "ion" },
  { key: "vehicle", label: "Type de véhicule", icon: "bicycle-outline", lib: "ion" },
  { key: "schedule", label: "Emploi du temps", icon: "time-outline", lib: "ion" },
  { key: "bank", label: "Gestion bancaire", icon: "card-outline", lib: "ion" },
  { key: "help", label: "Aide", icon: "help-circle-outline", lib: "ion" },
  { key: "profile", label: "Profil", icon: "person-outline", lib: "ion" },
  { key: "about", label: "À propos de nous", icon: "information-circle-outline", lib: "ion" },
  { key: "privacy", label: "Politique de confidentialité", icon: "shield-checkmark-outline", lib: "ion" },
  { key: "product", label: "Page du produit", icon: "grid-outline", lib: "ion" },
  { key: "logout", label: "Déconnexion", icon: "log-out-outline", lib: "ion" },
];

function MenuIcon({ item }) {
  return (
    <View className="h-9 w-9 items-center justify-center rounded-full bg-chip">
      <Ionicons name={item.icon} size={18} color={colors.ink} />
    </View>
  );
}

function MenuRow({ item, active, onPress, last }) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center px-4 py-3.5 ${active ? "bg-primary-soft" : "bg-white"}`}
    >
      <MenuIcon item={item} />
      <Text className="ml-3 flex-1 text-[15px] text-ink">{item.label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      {!last ? (
        <View className="absolute bottom-0 left-4 right-4 h-px bg-line" />
      ) : null}
    </Pressable>
  );
}

/**
 * Écran 2 : Menu latéral (drawer) / profil livreur.
 */
export default function DrawerMenu({ riderName = "Nom du livreur", riderId = "rider id" }) {
  const [available, setAvailable] = useState(true);
  const [activeKey, setActiveKey] = useState("home");

  const initials = riderName
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <View className="flex-1 bg-white">
      {/* Banner profil */}
      <View className="bg-primary px-4 pb-5 pt-6">
        <View className="flex-row items-center">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-white">
            <Text className="text-lg font-bold text-primary">{initials}</Text>
          </View>

          <View className="ml-3 flex-1">
            <Text className="text-base font-bold text-ink">{riderName}</Text>
            <Text className="text-xs text-ink/60">{riderId}</Text>
          </View>

          <View className="items-end">
            <Text className="mb-1 text-xs font-semibold text-ink/70">Disponibilité</Text>
            <Switch
              value={available}
              onValueChange={setAvailable}
              trackColor={{ false: "#C9D2DC", true: colors.navy }}
              thumbColor={colors.white}
            />
          </View>
        </View>
      </View>

      {/* Liste d'options */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {MENU_ITEMS.map((item, index) => (
          <MenuRow
            key={item.key}
            item={item}
            active={activeKey === item.key}
            last={index === MENU_ITEMS.length - 1}
            onPress={() => setActiveKey(item.key)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
