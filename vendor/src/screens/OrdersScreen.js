import React, { useMemo, useState } from "react";
import { View, ScrollView, RefreshControl } from "react-native";
import AppHeader from "../components/AppHeader";
import TopTabBar from "../components/TopTabBar";
import OrderCard from "../components/OrderCard";
import EmptyState from "../components/EmptyState";
import { TABS, groupByStatus } from "../lib/orders";

const EMPTY_MESSAGES = {
  "Nouvel Ordre": "Aucune nouvelle commande pour le moment !",
  "En traitement": "Aucune commande en traitement pour le moment !",
  "Livré": "Aucune commande livrée pour le moment !",
};

/** Commandes du vendeur (lecture seule) : onglets Nouvel Ordre / En traitement / Livré. */
export default function OrdersScreen({ vendor, orders, onRefresh, onMenuPress }) {
  const [tab, setTab] = useState(TABS[0]);
  const [refreshing, setRefreshing] = useState(false);

  const grouped = useMemo(() => groupByStatus(orders), [orders]);
  const list = grouped[tab] || [];

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
      <AppHeader title="Commandes" subtitle={vendor ? vendor.name : undefined} onMenuPress={onMenuPress} />
      <TopTabBar activeTab={tab} onChange={setTab} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {list.length === 0 ? (
          <EmptyState icon="package" message={EMPTY_MESSAGES[tab]} />
        ) : (
          list.map((order) => <OrderCard key={order.id} order={order} />)
        )}
      </ScrollView>
    </View>
  );
}
