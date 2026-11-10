import React, { useState } from "react";
import { View, Text, FlatList, RefreshControl, ActivityIndicator } from "react-native";
import AppHeader from "../components/AppHeader";
import TopTabBar from "../components/TopTabBar";
import OrderCard from "../components/OrderCard";
import EmptyState from "../components/EmptyState";
import { TABS, acceptOrder, markDelivered } from "../lib/orders";

const EMPTY_MESSAGES = {
  "Nouvel Ordre": "Aucune nouvelle commande pour le moment !",
  "En traitement": "Aucune commande en traitement pour le moment !",
  "Livré": "Aucune commande livrée pour le moment !",
};

export default function OrdersScreen({
  rider,
  byTab,
  loading,
  error,
  refreshing,
  onRefresh,
  onReload,
  onMenuPress,
}) {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const groups = byTab || { "Nouvel Ordre": [], "En traitement": [], "Livré": [] };
  const list = groups[activeTab] || [];
  const counts = {
    "Nouvel Ordre": groups["Nouvel Ordre"].length,
    "En traitement": groups["En traitement"].length,
    "Livré": groups["Livré"].length,
  };

  const run = async (id, fn) => {
    try {
      setBusyId(id);
      setActionError(null);
      await fn();
      if (onReload) await onReload();
    } catch (e) {
      setActionError(e && e.message ? e.message : "Action impossible");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View className="flex-1 bg-surface">
      <AppHeader
        title="Commandes"
        subtitle={rider ? `${rider.name} · ${rider.code}` : "Chargement du profil…"}
        onMenuPress={onMenuPress}
        onRefresh={onRefresh}
      />
      <TopTabBar activeTab={activeTab} onChange={setActiveTab} counts={counts} />
      {error ? <Text className="px-4 pt-3 text-[12px] text-red-500">{error}</Text> : null}
      {actionError ? <Text className="px-4 pt-3 text-[12px] text-red-500">{actionError}</Text> : null}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#76D865" />
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 24, flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor="#76D865" />
          }
          ListEmptyComponent={
            <EmptyState
              icon={activeTab === "Livré" ? "check" : "package"}
              message={EMPTY_MESSAGES[activeTab]}
            />
          }
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              busy={busyId === item.id}
              onAccept={
                item.status === "NEW" && rider
                  ? () => run(item.id, () => acceptOrder(item.id, rider.id))
                  : undefined
              }
              onDeliver={
                item.status === "IN_PROGRESS" && rider && item.riderId === rider.id
                  ? () => run(item.id, () => markDelivered(item.id))
                  : undefined
              }
            />
          )}
        />
      )}
    </View>
  );
}
