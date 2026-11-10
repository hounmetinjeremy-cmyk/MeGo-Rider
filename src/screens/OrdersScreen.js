import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import AppHeader from "../components/AppHeader";
import TopTabBar from "../components/TopTabBar";
import EmptyState from "../components/EmptyState";
import BottomNavBar from "../components/BottomNavBar";
import OrderCard from "../components/OrderCard";
import useOrders from "../hooks/useOrders";
import { TABS, tabForStatus } from "../lib/orders";
import colors from "../theme/colors";

const EMPTY_MESSAGES = {
  "Nouvel Ordre": "Aucune nouvelle commande pour le moment !",
  "En traitement": "Aucune commande en traitement pour le moment !",
  "Livré": "Aucune commande livrée pour le moment !",
};

/**
 * Écran 1 : Gestion des Commandes.
 * Header burger + top tabs + liste Supabase + bottom navigation.
 */
export default function OrdersScreen({ onOpenDrawer }) {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [activeNav, setActiveNav] = useState("Accueil");
  const [refreshing, setRefreshing] = useState(false);
  const { orders, loading, error, reload } = useOrders();

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
      <AppHeader title="Commandes" onMenuPress={onOpenDrawer} />
      <TopTabBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      <View className="flex-1">
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={colors.primary} />
            <Text className="mt-3 text-sm text-muted">
              Chargement des commandes…
            </Text>
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-center text-sm text-muted">{error}</Text>
            <Pressable
              onPress={reload}
              className="mt-4 rounded-full bg-primary px-5 py-2"
            >
              <Text className="text-sm font-semibold text-white">Réessayer</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={visibleOrders}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => <OrderCard order={item} />}
            contentContainerStyle={{
              padding: 16,
              paddingBottom: 24,
              flexGrow: 1,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={<EmptyState message={EMPTY_MESSAGES[activeTab]} />}
          />
        )}
      </View>

      <BottomNavBar activeKey={activeNav} onChange={setActiveNav} />
    </View>
  );
}
