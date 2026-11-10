import React from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import AppHeader from "../components/AppHeader";
import Icon from "../components/Icon";
import EmptyState from "../components/EmptyState";
import colors from "../theme/colors";
import { formatMoney, formatDate } from "../lib/orders";

/** Onglet Portefeuille : solde + transactions. */
export default function WalletScreen({
  rider,
  orders = [],
  refreshing,
  onRefresh,
  onMenuPress,
}) {
  const delivered = orders.filter((o) => o.status === "DELIVERED");

  return (
    <View className="flex-1 bg-gray-50">
      <AppHeader
        title="Portefeuille"
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
        <View className="rounded-xl bg-navy p-5">
          <Text className="text-[12px] text-white/70">Solde disponible</Text>
          <Text className="mt-1 text-[28px] font-bold text-white">
            {formatMoney(rider ? rider.wallet : 0)}
          </Text>
          <View className="mt-4 flex-row items-center">
            <Icon name="wallet" size={16} color={colors.primary} />
            <Text className="ml-2 text-[12px] text-white/70">
              {delivered.length} livraison(s) payée(s)
            </Text>
          </View>
        </View>

        <Text className="mb-3 mt-6 text-[15px] font-bold text-ink">
          Transactions
        </Text>

        {delivered.length === 0 ? (
          <EmptyState icon="wallet" message="Aucune transaction pour le moment !" />
        ) : (
          delivered.map((o) => (
            <View
              key={o.id}
              className="mb-3 flex-row items-center rounded-xl bg-white p-4 shadow-sm"
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-chip">
                <Icon name="dollar" size={18} color={colors.primary} />
              </View>
              <View className="ml-3 flex-1">
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
