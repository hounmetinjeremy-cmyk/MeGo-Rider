import React from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import AppHeader from "../components/AppHeader";
import Icon from "../components/Icon";
import colors from "../theme/colors";
import { formatMoney } from "../lib/orders";

function Row({ icon, label, value }) {
  return (
    <View className="flex-row items-center border-b border-line px-4 py-3.5">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-chip">
        <Icon name={icon} size={16} color={colors.muted} />
      </View>
      <Text className="ml-3 flex-1 text-[14px] text-muted">{label}</Text>
      <Text className="text-[14px] font-semibold text-ink">{value}</Text>
    </View>
  );
}

/** Onglet Profil : informations du livreur + déconnexion. */
export default function ProfileScreen({
  rider,
  refreshing,
  onRefresh,
  onMenuPress,
  onLogout,
}) {
  const initials = rider
    ? rider.name
        .split(" ")
        .filter(Boolean)
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "JS";

  return (
    <View className="flex-1 bg-gray-50">
      <AppHeader title="Profil" onMenuPress={onMenuPress} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View className="items-center bg-primary px-4 pb-6 pt-6">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-white">
            <Text className="text-[24px] font-bold text-primary">{initials}</Text>
          </View>
          <Text className="mt-3 text-[17px] font-bold text-ink">
            {rider ? rider.name : "Nom du livreur"}
          </Text>
          <Text className="mt-0.5 text-[12px] text-ink/70">
            {rider ? rider.code : "rider id"}
          </Text>
        </View>

        <View className="mt-4 bg-white">
          <Row icon="bike" label="Véhicule" value={rider ? rider.vehicle : "Moto"} />
          <Row
            icon="wallet"
            label="Solde"
            value={formatMoney(rider ? rider.wallet : 0)}
          />
          <Row
            icon="dollar"
            label="Total gagné"
            value={formatMoney(rider ? rider.earnings : 0)}
          />
          <Row
            icon="check"
            label="Disponibilité"
            value={rider && rider.available ? "Actif" : "Inactif"}
          />
        </View>

        <Pressable
          onPress={onLogout}
          className="mx-4 mt-6 flex-row items-center justify-center rounded-xl bg-navy py-3.5"
        >
          <Icon name="logout" size={18} color="#FFFFFF" />
          <Text className="ml-2 text-[14px] font-semibold text-white">
            Déconnexion
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
