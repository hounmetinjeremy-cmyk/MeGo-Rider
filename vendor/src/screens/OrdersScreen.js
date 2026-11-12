import React, { useMemo, useState } from "react";
import { View, ScrollView, RefreshControl } from "react-native";
import AppHeader from "../components/AppHeader";
import TopTabBar from "../components/TopTabBar";
import OrderCard from "../components/OrderCard";
import EmptyState from "../components/EmptyState";
import { TABS, STATUS, groupByStatus, updateOrderStatus } from "../lib/orders";

/** Commandes du vendeur : onglets Nouvel Ordre / En traitement / Livre. */
export default function OrdersScreen({ vendor, orders, setOrders, onMenuPress, onBack }) {
  const [tab, setTab] = useState(TABS[0]);
  const [busyId, setBusyId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const grouped = useMemo(() => groupByStatus(orders), [orders]);
  const list = grouped[tab] || [];

  const change = async (order, status) => {
    setBusyId(order.id);
    try {
      await updateOrderStatus(order.id, status);
      setOrders((prev) => (prev || []).map((o) => (o.id === order.id ? { ...o, status } : o)));
    } catch (e) {
      // silencieux : l'ecran se rafraichit au prochain chargement
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View className="flex-1 bg-surface">
      <AppHeader title="Commandes" subtitle={vendor ? vendor.name : undefined} onMenuPress={onMenuPress} />
      <TopTabBar activeTab={tab} onChange={setTab} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(false)} />
        }
      >
        {list.length === 0 ? (
          <EmptyState icon="package" message="Aucune nouvelle commande client pour le moment !" />
        ) : (
          list.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              busy={busyId === order.id}
              onAccept={
                order.status === STATUS.NEW ? () => change(order, STATUS.IN_PROGRESS) : undefined
              }
              onDeliver={
                order.status === STATUS.IN_PROGRESS
                  ? () => change(order, STATUS.DELIVERED)
                  : undefined
              }
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
