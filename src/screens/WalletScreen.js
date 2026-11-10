import React from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import AppHeader from "../components/AppHeader";
import Icon from "../components/Icon";
import EmptyState from "../components/EmptyState";
import colors from "../theme/colors";
import { formatMoney, formatDate } from "../lib/orders";

export default function WalletScreen({ rider, orders = [], refreshing, onRefresh, onMenuPress }) {
  const delivered = orders.filter((o) => o.status === "DELIVERED");
  return (
    <View className="flex-1 bg-surface">
      <AppHeader
        title="Portefeuille"
        subtitle="Solde et mouvements"
        onMenuPress={onMenuPress}
        onRefresh={onRefresh}
      />
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor="#76D865" />}
      >
        <View className="mt-4 rounded-2xl bg-navy p-5">
          <Text className="text-[12px] text-white/70">Solde disponible</Text>
          <Text className="mt-1 text-[26px] font-bold text-white">
            {formatMoney(rider ? rider.wallet : 0)}
          </Text>
          <View className="mt-4 flex-row items-center">
            <Icon name="wallet" size={16} color={colors.primary} />
            <Text className="ml-2 text-[12px] text-white/70">Synchronisé avec Supabase</Text>
          </View>
        </View>
        <Text className="mb-2 mt-6 text-[13px] font-semibold text-ink">Dernières livraisons</Text>
        {delivered.length === 0 ? (
          <EmptyState icon="wallet" message="Aucun mouvement pour le moment !" />
        ) : (
          delivered.map((o) => (
            <View
              key={o.id}
              className="mb-2 flex-row items-center justify-between rounded-xl border border-line bg-white p-3.5"
            >
              <View className="flex-1">
                <Text className="text-[13px] font-semibold text-ink">{o.code}</Text>
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
