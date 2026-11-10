import React from "react";
import { View, Text, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AppHeader from "../components/AppHeader";
import BottomNavBar from "../components/BottomNavBar";
import StatCard from "../components/StatCard";
import { colors } from "../theme/colors";

const DAYS = [
  { day: "Lun", value: 3200 },
  { day: "Mar", value: 4100 },
  { day: "Mer", value: 2600 },
  { day: "Jeu", value: 3800 },
  { day: "Ven", value: 5200 },
  { day: "Sam", value: 6100 },
  { day: "Dim", value: 2400 },
];

/**
 * Onglet Revenus : totaux et repartition par jour.
 */
export default function EarningsScreen({ onMenuPress, activeNav, onChangeNav }) {
  const max = Math.max(...DAYS.map((d) => d.value));

  return (
    <View className="flex-1 bg-white">
      <AppHeader title="Revenus" onMenuPress={onMenuPress} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <View className="rounded-3xl bg-primary-soft p-5">
          <Text className="text-xs text-ink/70">Revenus du mois</Text>
          <Text className="mt-1 text-3xl font-bold text-ink">74 300 F</Text>
          <View className="mt-2 flex-row items-center">
            <MaterialCommunityIcons name="trending-up" size={16} color={colors.primary} />
            <Text className="ml-1 text-xs font-semibold text-ink/70">
              +12 % par rapport au mois dernier
            </Text>
          </View>
        </View>

        <View className="mt-4 flex-row">
          <StatCard icon="motorbike" label="Courses livrees" value="128" />
          <View className="w-3" />
          <StatCard icon="star-outline" label="Note moyenne" value="4,8" />
        </View>

        <Text className="mt-6 mb-3 text-[15px] font-semibold text-ink">
          Cette semaine
        </Text>

        <View className="flex-row items-end justify-between rounded-2xl border border-line p-4">
          {DAYS.map((item) => (
            <View key={item.day} className="items-center">
              <View
                className="w-6 rounded-full bg-primary"
                style={{ height: Math.max(8, Math.round((item.value / max) * 90)) }}
              />
              <Text className="mt-2 text-[10px] text-muted">{item.day}</Text>
            </View>
          ))}
        </View>

        <View className="mt-4 rounded-2xl border border-line p-4">
          <Text className="text-sm font-semibold text-ink">Prochain versement</Text>
          <Text className="mt-1 text-xs text-muted">
            Vendredi - Mobile Money - 18 900 F
          </Text>
        </View>
      </ScrollView>

      <BottomNavBar activeItem={activeNav} onChange={onChangeNav} />
    </View>
  );
}
