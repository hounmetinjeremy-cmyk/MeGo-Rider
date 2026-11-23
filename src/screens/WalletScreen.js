import React, { useState } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable, Platform, Linking } from "react-native";
import AppHeader from "../components/AppHeader";
import Icon from "../components/Icon";
import EmptyState from "../components/EmptyState";
import ShopWebView from "../components/ShopWebView";
import colors from "../theme/colors";
import { formatMoney, formatDate } from "../lib/orders";
import { getToken } from "../lib/session";

const SHOP = (process.env.EXPO_PUBLIC_SHOP_URL || "https://mego-shop.pages.dev").replace(/\/+$/, "");

/** Onglet Portefeuille : solde, depot d'argent (Mobile Money) et transactions. */
export default function WalletScreen({
  rider,
  orders = [],
  refreshing,
  onRefresh,
  onMenuPress,
}) {
  const delivered = orders.filter((o) => o.status === "DELIVERED");
  // « Solde en attente » : bloqué jusqu'à la confirmation de livraison ; « Solde retirable » : seul solde utilisable pour Retirer.
  const pendingBalance = rider ? Number(rider.pending_balance || 0) : 0;
  const withdrawableBalance = rider
    ? Number(rider.wallet_balance != null ? rider.wallet_balance : rider.wallet || 0)
    : 0;
  const [depositUrl, setDepositUrl] = useState("");

  // Depot : la page "Mon portefeuille" de la boutique s'ouvre DANS l'application (bouton Retour), sans Chrome.
  // Le compte livreur connecte est reconnu automatiquement ; le solde se met a jour au retour.
  const openDeposit = () => {
    const u = SHOP + "/?wallet=1";
    if (Platform.OS === "web") {
      let t = null;
      try {
        t = getToken("rider");
      } catch (e) {}
      Linking.openURL(u + (t ? "#mego=" + encodeURIComponent(String(t)) : "")).catch(() => {});
    } else {
      setDepositUrl(u);
    }
  };

  const closeDeposit = () => {
    setDepositUrl("");
    if (onRefresh) onRefresh();
  };

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
        <View className="mb-4 flex-row items-start rounded-xl bg-amber-50 p-3">
          <Icon name="wallet" size={16} color={colors.primary} />
          <Text className="ml-2 flex-1 text-[12px] text-ink">
            Le « Solde en attente » est bloqué tant que la livraison n'est pas confirmée.
          </Text>
        </View>

        <View className="rounded-xl bg-navy p-5">
          <Text className="text-[12px] text-white/70">Solde en attente</Text>
          <Text className="mt-1 text-[22px] font-bold text-white/80">
            {formatMoney(pendingBalance)}
          </Text>
          <Text className="mt-4 text-[12px] text-white/70">Solde retirable</Text>
          <Text className="mt-1 text-[28px] font-bold text-white">
            {formatMoney(withdrawableBalance)}
          </Text>
          <View className="mt-4 flex-row items-center">
            <Icon name="wallet" size={16} color={colors.primary} />
            <Text className="ml-2 text-[12px] text-white/70">
              {delivered.length} livraison(s) payée(s)
            </Text>
          </View>
          <Pressable
            onPress={openDeposit}
            className="mt-4 items-center rounded-full bg-primary py-3 active:opacity-80"
          >
            <Text className="text-[14px] font-bold text-white">Déposer de l'argent</Text>
          </Pressable>
          <Text className="mt-2 text-[11px] text-white/70">
            Le « Solde retirable » sert à payer dans les boutiques et à retirer. S'il est insuffisant, dépose de l'argent par Mobile Money.
          </Text>
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
      <ShopWebView url={depositUrl} onClose={closeDeposit} />
    </View>
  );
}
