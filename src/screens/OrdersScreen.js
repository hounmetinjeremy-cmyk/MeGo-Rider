import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Pressable,
} from "react-native";
import AppHeader from "../components/AppHeader";
import TopTabBar from "../components/TopTabBar";
import OrderCard from "../components/OrderCard";
import EmptyState from "../components/EmptyState";
import colors from "../theme/colors";
import {
  TABS,
  acceptOrder,
  declineOrder,
  confirmDeliveryQr,
} from "../lib/orders";

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
  const [codeFor, setCodeFor] = useState(null);
  const [code, setCode] = useState("");

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
                  ? () => {
                      setCode("");
                      setCodeFor(item);
                    }
                  : undefined
              }
            />
          )}
        />
      )}

      <Modal
        visible={!!codeFor}
        transparent
        animationType="fade"
        onRequestClose={() => setCodeFor(null)}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full rounded-2xl bg-white p-5">
            <Text className="text-[16px] font-bold text-ink">Code de livraison</Text>
            <Text className="mt-1 text-[12px] text-muted">
              Demande au client le code affiche sur son suivi de commande.
            </Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="MEGO-XXXXXX"
              placeholderTextColor="#9AA5B1"
              className="mt-3 rounded-lg border border-line px-3 py-3 text-[15px] text-ink"
            />
            <View className="mt-4 flex-row">
              <Pressable
                onPress={() => setCodeFor(null)}
                className="flex-1 items-center rounded-lg bg-chip py-3"
              >
                <Text className="text-[14px] font-semibold text-ink">Annuler</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  const target = codeFor;
                  setCodeFor(null);
                  if (target && rider) {
                    await run(target.id, () =>
                      confirmDeliveryQr(target.id, rider.id, code)
                    );
                  }
                }}
                disabled={!code.trim()}
                className={`ml-2 flex-1 items-center rounded-lg py-3 ${
                  code.trim() ? "bg-primary" : "bg-chip"
                }`}
              >
                <Text
                  className={`text-[14px] font-semibold ${
                    code.trim() ? "text-white" : "text-muted"
                  }`}
                >
                  Valider
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
