import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import AppHeader from "../components/AppHeader";
import TopTabBar from "../components/TopTabBar";
import OrderCard from "../components/OrderCard";
import EmptyState from "../components/EmptyState";
import colors from "../theme/colors";
import { TABS, acceptOrder, declineOrder, markDelivered } from "../lib/orders";

const EMPTY_MESSAGES = {
  "Nouvel Ordre": "Aucune nouvelle commande pour le moment !",
  "En traitement": "Aucune commande en traitement pour le moment !",
  "Livré": "Aucune commande livrée pour le moment !",
};

/** Écran 1 : gestion des commandes (onglets + liste). */
export default function OrdersScreen({
  rider,
  byTab = {},
  loading,
  error,
  refreshing,
  onRefresh,
  onMenuPress,
}) {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const list = byTab[activeTab] || [];

  const run = async (id, fn) => {
    setBusyId(id);
    setActionError(null);
    try {
      await fn();
      if (onRefresh) await onRefresh();
    } catch (e) {
      setActionError(e && e.message ? e.message : "Action impossible");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <AppHeader
        title="Commandes"
        subtitle={rider ? rider.name : undefined}
        onMenuPress={onMenuPress}
      />
      <TopTabBar activeTab={activeTab} onChange={setActiveTab} />

      {error ? (
        <Text className="px-4 pt-3 text-[12px] text-red-500">{error}</Text>
      ) : null}
      {actionError ? (
        <Text className="px-4 pt-3 text-[12px] text-red-500">{actionError}</Text>
      ) : null}

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          className="flex-1"
          data={list}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={!!refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
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
              onDecline={
                item.status === "NEW" && rider && item.offeredRiderId === rider.id
                  ? () => run(item.id, () => declineOrder(item.id, rider.id))
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
