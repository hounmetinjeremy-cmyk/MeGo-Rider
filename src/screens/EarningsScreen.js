import React from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import AppHeader from "../components/AppHeader";
import StatCard from "../components/StatCard";
import EmptyState from "../components/EmptyState";
import { formatMoney, formatDate } from "../lib/orders";

export default function EarningsScreen({ rider, orders = [], refreshing, onRefresh, onMenuPress }) {
  const delivered = orders.filter((o) => o.status === "DELIVERED");
  const total = rider ? rider.earnings : 0;
  const average = delivered.length ? total / delivered.length : 0;
  return (
    <View className="flex-1 bg-surface">
      <AppHeader
        title="Revenus"
        subtitle="Gains et statistiques"
        onMenuPress={onMenuPress}
        onRefresh={onRefresh}
      />
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor="#76D865" />}
      >
        <View className="mt-4 flex-row">
          <StatCard icon="dollar" label="Total gagné" value={formatMoney(total)} />
          <View className="w-3" />
          <StatCard icon="check" label="Livraisons" value={String(delivered.length)} tint="#1A2433" />
        </View>
        <View className="mt-3 flex-row">
          <StatCard icon="trend" label="Gain moyen / course" value={formatMoney(average)} />
          <View className="w-3" />
          <StatCard
            icon="wallet"
            label="Solde portefeuille"
            value={formatMoney(rider ? rider.wallet : 0)}
            tint="#1A2433"
          />
        </View>
        <Text className="mb-2 mt-6 text-[13px] font-semibold text-ink">Historique des livraisons</Text>
        {delivered.length === 0 ? (
          <EmptyState icon="dollar" message="Aucun revenu enregistré pour le moment !" />
        ) : (
          delivered.map((o) => (
            <View
              key={o.id}
              className="mb-2 flex-row items-center justify-between rounded-xl border border-line bg-white p-3.5"
            >
              <View className="flex-1">
                <Text className="text-[13px] font-semibold text-ink">
                  {o.code} · {o.vendor}
                </Text>
                <Text className="text-[11px] text-muted">{formatDate(o.createdAt)}</Text>
              </View>
              <Text className="text-[13px] font-bold text-primary">
                +{formatMoney(o.amount, o.currency)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
