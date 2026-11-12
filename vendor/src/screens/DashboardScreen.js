import React from "react";
import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import AppHeader from "../components/AppHeader";
import StatCard from "../components/StatCard";
import OrderCard from "../components/OrderCard";
import EmptyState from "../components/EmptyState";
import { STATUS, computeStats, updateOrderStatus } from "../lib/orders";

export default function DashboardScreen({ vendor, orders, loading, error, onRefresh, onMenuPress }) {
  const list = orders || [];
  const stats = computeStats(list);
  const total = stats.total != null ? stats.total : list.length;
  const inProgress = list.filter((o) => o.status === STATUS.IN_PROGRESS).length;
  const recent = list.slice(0, 3);

  const change = async (order, status) => {
    try {
      await updateOrderStatus(order.id, status);
      if (onRefresh) onRefresh();
    } catch (e) {}
  };

  return (
    <View className="flex-1">
      <AppHeader title="Tableau de bord" subtitle={vendor?.name || "Ma boutique"} onMenuPress={onMenuPress} />
      <ScrollView className="flex-1" refreshControl={<RefreshControl refreshing={!!loading} onRefresh={onRefresh} />}>
        <View className="flex-row gap-3 px-4 pt-4">
          <StatCard icon="package" label="Commandes" value={String(total)} />
          <StatCard icon="truck" label="En cours" value={String(inProgress)} tint="#F59E0B" />
        </View>
        <View className="flex-row gap-3 px-4 pt-3">
          <StatCard icon="check" label="Livrees" value={String(stats.delivered || 0)} />
          <StatCard icon="dollar" label="Revenus" value={String(stats.revenue || 0) + " F"} />
        </View>
        <Text className="px-4 pt-5 pb-2 text-base font-semibold text-ink">Dernieres commandes</Text>
        {error ? <Text className="px-4 pb-2 text-sm text-red-500">{String(error)}</Text> : null}
        {loading && !list.length ? <ActivityIndicator className="py-6" color="#76D865" /> : null}
        {!loading && !recent.length ? <EmptyState message="Aucune commande pour le moment !" /> : null}
        <View className="px-4 pb-6">
          {recent.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              onAccept={o.status === STATUS.NEW ? () => change(o, STATUS.IN_PROGRESS) : undefined}
              onDeliver={o.status === STATUS.IN_PROGRESS ? () => change(o, STATUS.DELIVERED) : undefined}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
