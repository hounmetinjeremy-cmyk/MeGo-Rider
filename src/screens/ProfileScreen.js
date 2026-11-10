import React from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import AppHeader from "../components/AppHeader";
import Icon from "../components/Icon";
import colors from "../theme/colors";
import { formatMoney } from "../lib/orders";
import { initialsOf } from "../components/RiderProfileBanner";

function Row({ icon, label, value }) {
  return (
    <View className="flex-row items-center border-b border-line px-4 py-3.5">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-chip">
        <Icon name={icon} size={18} color={colors.ink} />
      </View>
      <Text className="ml-3 flex-1 text-[14px] text-muted">{label}</Text>
      <Text className="text-[14px] font-semibold text-ink">{value}</Text>
    </View>
  );
}

export default function ProfileScreen({ rider, refreshing, onRefresh, onMenuPress, onLogout }) {
  const available = !!(rider && rider.available);
  return (
    <View className="flex-1 bg-surface">
      <AppHeader
        title="Profil"
        subtitle="Informations du livreur"
        onMenuPress={onMenuPress}
        onRefresh={onRefresh}
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor="#76D865" />}
      >
        <View className="mx-4 mt-4 items-center rounded-2xl border border-line bg-white p-5">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-primary">
            <Text className="text-[20px] font-bold text-white">
              {initialsOf(rider ? rider.name : "")}
            </Text>
          </View>
          <Text className="mt-3 text-[16px] font-bold text-ink">
            {rider ? rider.name : "Nom du livreur"}
          </Text>
          <Text className="text-[12px] text-muted">{rider ? rider.code : "rider id"}</Text>
          <View className={`mt-3 rounded-full px-3 py-1 ${available ? "bg-primary-soft" : "bg-chip"}`}>
            <Text className={`text-[11px] font-semibold ${available ? "text-primary" : "text-muted"}`}>
              {available ? "Disponible" : "Indisponible"}
            </Text>
          </View>
        </View>
        <View className="mx-4 mt-4 overflow-hidden rounded-2xl border border-line bg-white">
          <Row icon="user" label="Nom complet" value={rider ? rider.name : "—"} />
          <Row icon="package" label="Code livreur" value={rider ? rider.code : "—"} />
          <Row icon="phone" label="Téléphone" value={rider && rider.phone ? rider.phone : "—"} />
          <Row icon="bike" label="Véhicule" value={rider ? rider.vehicle : "—"} />
          <Row icon="wallet" label="Portefeuille" value={formatMoney(rider ? rider.wallet : 0)} />
          <Row icon="dollar" label="Total gagné" value={formatMoney(rider ? rider.earnings : 0)} />
        </View>
        <Pressable
          onPress={onLogout}
          className="mx-4 mt-4 flex-row items-center justify-center rounded-2xl bg-navy py-3.5 active:opacity-80"
        >
          <Icon name="logout" size={18} color={colors.white} />
          <Text className="ml-2 text-[14px] font-semibold text-white">Déconnexion</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
