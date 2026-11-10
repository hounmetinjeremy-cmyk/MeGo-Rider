import React from "react";
import { View, Text, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AppHeader from "../components/AppHeader";
import BottomNavBar from "../components/BottomNavBar";
import StatCard from "../components/StatCard";
import { colors } from "../theme/colors";

const TRANSACTIONS = [
  { id: "t1", label: "Course #1042", date: "Aujourd'hui - 14:20", amount: "+ 1 500 F", positive: true },
  { id: "t2", label: "Retrait Mobile Money", date: "Hier - 18:05", amount: "- 5 000 F", positive: false },
  { id: "t3", label: "Course #1039", date: "Hier - 11:40", amount: "+ 1 200 F", positive: true },
  { id: "t4", label: "Bonus semaine", date: "Lundi - 09:00", amount: "+ 2 000 F", positive: true },
];

/**
 * Onglet Portefeuille : solde, actions rapides et historique.
 */
export default function WalletScreen({ onMenuPress, activeNav, onChangeNav }) {
  return (
    <View className="flex-1 bg-white">
      <AppHeader title="Portefeuille" onMenuPress={onMenuPress} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <View className="rounded-3xl bg-navy p-5">
          <Text className="text-xs text-white/70">Solde disponible</Text>
          <Text className="mt-1 text-3xl font-bold text-white">12 450 F</Text>
          <View className="mt-4 flex-row">
            <View className="mr-2 flex-1 flex-row items-center justify-center rounded-xl bg-primary py-2.5">
              <MaterialCommunityIcons name="cash-plus" size={18} color={colors.navy} />
              <Text className="ml-2 text-sm font-semibold text-navy">Retirer</Text>
            </View>
            <View className="flex-1 flex-row items-center justify-center rounded-xl bg-white/10 py-2.5">
              <MaterialCommunityIcons name="history" size={18} color={colors.white} />
              <Text className="ml-2 text-sm font-semibold text-white">Historique</Text>
            </View>
          </View>
        </View>

        <View className="mt-4 flex-row">
          <StatCard icon="calendar-today" label="Gains du jour" value="2 700 F" />
          <View className="w-3" />
          <StatCard icon="calendar-week" label="Cette semaine" value="18 900 F" />
        </View>

        <Text className="mt-6 mb-2 text-[15px] font-semibold text-ink">
          Transactions recentes
        </Text>

        <View className="rounded-2xl border border-line">
          {TRANSACTIONS.map((item, index) => (
            <View
              key={item.id}
              className={
                "flex-row items-center px-4 py-3 " +
                (index < TRANSACTIONS.length - 1 ? "border-b border-line" : "")
              }
            >
              <View className="h-9 w-9 items-center justify-center rounded-full bg-chip">
                <MaterialCommunityIcons
                  name={item.positive ? "arrow-down-left" : "arrow-up-right"}
                  size={18}
                  color={item.positive ? colors.primary : colors.muted}
                />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-sm text-ink">{item.label}</Text>
                <Text className="text-[11px] text-muted">{item.date}</Text>
              </View>
              <Text
                className="text-sm font-semibold"
                style={{ color: item.positive ? colors.primary : colors.ink }}
              >
                {item.amount}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <BottomNavBar activeItem={activeNav} onChange={onChangeNav} />
    </View>
  );
}
