import React, { useMemo, useState } from "react";
import { View, Text, FlatList, RefreshControl } from "react-native";
import AppHeader from "../components/AppHeader";
import TopTabBar, { ORDER_TABS } from "../components/TopTabBar";
import EmptyState from "../components/EmptyState";
import OrderCard from "../components/OrderCard";
import BottomNavBar from "../components/BottomNavBar";
import useOrders from "../hooks/useOrders";
import { tabForStatus } from "../lib/orders";
import { colors } from "../theme/colors";

const EMPTY_MESSAGES = {
  "Nouvel Ordre": "Aucune nouvelle commande pour le moment !",
  "En traitement": "Aucune commande en traitement pour le moment !",
  Livre: "Aucune commande livree pour le moment !",
};

/**
 * Ecran 1 : Commandes (onglets + liste Supabase + navigation basse).
 */
export default function OrdersScreen({
  onMenuPress,
  activeTab,
  onChangeTab,
  activeNav,
  onChangeNav,
}) {
  const { orders, loading, error, reload } = useOrders();
  const [refreshing, setRefreshing] = useState(false);

  const visibleOrders = useMemo(
    () => orders.filter((order) => tabForStatus(order.status) === activeTab),
    [orders, activeTab]
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  return (
    <View className="flex-1 bg-white">
      <AppHeader title="Commandes" onMenuPress={onMenuPress} />
      <TopTabBar tabs={ORDER_TABS} activeTab={activeTab} onChange={onChangeTab} />

      <View className="flex-1">
        {loading && orders.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-sm text-muted">Chargement...</Text>
          </View>
        ) : error ? (
          <EmptyState message={"Impossible de charger les commandes.\n" + error} />
        ) : (
          <FlatList
            data={visibleOrders}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => <OrderCard order={item} />}
            contentContainerStyle={{ padding: 16, paddingBottom: 24, flexGrow: 1 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <EmptyState message={EMPTY_MESSAGES[activeTab]} />
            }
          />
        )}
      </View>

      <BottomNavBar activeItem={activeNav} onChange={onChangeNav} />
    </View>
  );
}
