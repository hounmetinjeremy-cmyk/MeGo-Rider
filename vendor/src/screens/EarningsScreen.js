import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import AppHeader from "../components/AppHeader";
import StatCard from "../components/StatCard";
import { Card, SectionTitle, Button } from "../components/Kit";
import colors from "../theme/colors";
import { STATUS } from "../lib/orders";

function money(value, currency) {
  const n = Number(value || 0);
  return `${n.toLocaleString("fr-FR")} ${currency || "FCFA"}`;
}

/** Revenus : chiffres cles de la boutique. Le depot et le retrait d'argent sont dans l'onglet Portefeuille. */
export default function EarningsScreen({ vendor, orders, onMenuPress, onRefresh, onGoWallet }) {
  const [refreshing, setRefreshing] = useState(false);

  const stats = useMemo(() => {
    const list = orders || [];
    const delivered = list.filter((o) => o.status === STATUS.DELIVERED);
    const revenue = delivered.reduce((sum, o) => sum + Number(o.amount || 0), 0);
    return {
      total: list.length,
      delivered: delivered.length,
      pending: list.filter((o) => o.status === STATUS.NEW).length,
      revenue,
    };
  }, [orders]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      if (onRefresh) await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View className="flex-1 bg-surface">
      <AppHeader title="Revenus" subtitle={vendor ? vendor.name : undefined} onMenuPress={onMenuPress} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <SectionTitle>Vue d'ensemble</SectionTitle>
        <View className="mb-3 flex-row gap-3">
          <StatCard icon="wallet" label="Solde" value={money(vendor ? vendor.wallet_balance : 0)} tint={colors.primary} />
          <StatCard icon="trend" label="Total gagné" value={money(vendor ? vendor.total_earnings : 0)} tint={colors.navy} />
        </View>
        <View className="mb-3 flex-row gap-3">
          <StatCard icon="check" label="Livrées" value={String(stats.delivered)} tint={colors.primary} />
          <StatCard icon="clock" label="En attente" value={String(stats.pending)} tint="#F59E0B" />
        </View>

        <Card>
          <Text className="text-[12px] text-muted">Chiffre d'affaires des commandes livrées</Text>
          <Text className="mt-1 text-[22px] font-bold text-ink">{money(stats.revenue)}</Text>
        </Card>

        <SectionTitle>Portefeuille</SectionTitle>
        <Card>
          <Text className="mb-3 text-[13px] text-muted">
            Pour déposer de l'argent, en retirer ou voir l'historique de tes retraits, ouvre l'onglet Portefeuille.
          </Text>
          <Button label="Ouvrir le portefeuille" icon="wallet" variant="dark" onPress={onGoWallet} />
        </Card>
      </ScrollView>
    </View>
  );
}
