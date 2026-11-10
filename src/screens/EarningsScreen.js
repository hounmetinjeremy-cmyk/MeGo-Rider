import React from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import AppHeader from "../components/AppHeader";
import StatCard from "../components/StatCard";
import EmptyState from "../components/EmptyState";
import colors from "../theme/colors";
import { formatMoney, formatDate } from "../lib/orders";

/** Onglet Revenus : total gagné + historique des livraisons. */
export default function EarningsScreen({
  rider,
  orders = [],
  refreshing,
  onRefresh,
  onMenuPress,
}) {
  const delivered = orders.filter((o) => o.status === "DELIVERED");
  const inProgress = orders.filter((o) => o.status === "IN_PROGRESS");

  return (
    <View className="flex-1 bg-gray-50">
      <AppHeader
        title="Revenus"
        subtitle={rider ? rider.name : undefined}
        onMenuPress={onMenuPress}
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View className="rounded-xl bg-white p-5 shadow-sm">
          <Text className="text-[12px] text-muted">Total gagné</Text>
          <Text className="mt-1 text-[28px] font-bold text-ink">
            {formatMoney(rider ? rider.earnings : 0)}
          </Text>
        </View>

        <View className="mt-3 flex-row">
          <View className="mr-2 flex-1">
            <StatCard
              icon="check"
              label="Livraisons"
              value={String(delivered.length)}
              tint={colors.primary}
            />
          </View>
          <View className="ml-2 flex-1">
            <StatCard
              icon="clock"
              label="En cours"
              value={String(inProgress.length)}
              tint={colors.navy}
            />
          </View>
        </View>

        <Text className="mb-3 mt-6 text-[15px] font-bold text-ink">
          Historique
        </Text>

        {delivered.length === 0 ? (
          <EmptyState icon="dollar" message="Aucun revenu pour le moment !" />
        ) : (
          delivered.map((o) => (
            <View
              key={o.id}
              className="mb-3 flex-row items-center justify-between rounded-xl bg-white p-4 shadow-sm"
            >
              <View className="flex-1">
                <Text className="text-[14px] font-semibold text-ink">
                  {o.code}
                </Text>
                <Text className="text-[12px] text-muted">
                  {formatDate(o.createdAt || o.created_at)}
                </Text>
              </View>
              <Text className="text-[14px] font-bold text-primary">
                +{formatMoney(o.amount, o.currency)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
