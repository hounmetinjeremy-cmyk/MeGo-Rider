import React from "react";
import { View, Text, ScrollView, Switch } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AppHeader from "../components/AppHeader";
import BottomNavBar from "../components/BottomNavBar";
import { colors } from "../theme/colors";

const INFOS = [
  { key: "phone", icon: "phone-outline", label: "Telephone", value: "+229 00 00 00 00" },
  { key: "vehicle", icon: "motorbike", label: "Vehicule", value: "Moto - 125 cc" },
  { key: "zone", icon: "map-marker-outline", label: "Zone", value: "Abomey-Calavi" },
  { key: "bank", icon: "card-outline", label: "Paiement", value: "Mobile Money" },
];

/**
 * Onglet Profil : informations du livreur et disponibilite.
 */
export default function ProfileScreen({
  onMenuPress,
  activeNav,
  onChangeNav,
  available = true,
  onToggleAvailability,
}) {
  return (
    <View className="flex-1 bg-white">
      <AppHeader title="Profil" onMenuPress={onMenuPress} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <View className="items-center rounded-3xl bg-primary-soft p-5">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-white">
            <Text className="text-xl font-bold text-primary">JS</Text>
          </View>
          <Text className="mt-3 text-[16px] font-bold text-ink">Nom du livreur</Text>
          <Text className="text-xs text-muted">rider id</Text>
        </View>

        <View className="mt-4 flex-row items-center rounded-2xl border border-line px-4 py-3">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-chip">
            <MaterialCommunityIcons name="power" size={18} color={colors.ink} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-sm text-ink">Disponibilite</Text>
            <Text className="text-[11px] text-muted">
              {available ? "Vous recevez des commandes" : "Vous ne recevez aucune commande"}
            </Text>
          </View>
          <Switch
            value={available}
            onValueChange={onToggleAvailability}
            trackColor={{ false: "#C9D2DC", true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>

        <View className="mt-4 rounded-2xl border border-line">
          {INFOS.map((item, index) => (
            <View
              key={item.key}
              className={
                "flex-row items-center px-4 py-3 " +
                (index < INFOS.length - 1 ? "border-b border-line" : "")
              }
            >
              <View className="h-9 w-9 items-center justify-center rounded-full bg-chip">
                <MaterialCommunityIcons name={item.icon} size={18} color={colors.ink} />
              </View>
              <Text className="ml-3 flex-1 text-sm text-ink">{item.label}</Text>
              <Text className="text-xs text-muted">{item.value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <BottomNavBar activeItem={activeNav} onChange={onChangeNav} />
    </View>
  );
}
