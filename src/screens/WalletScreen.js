import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
  Linking,
} from "react-native";
import AppHeader from "../components/AppHeader";
import Icon from "../components/Icon";
import EmptyState from "../components/EmptyState";
import ShopWebView from "../components/ShopWebView";
import colors from "../theme/colors";
import { formatMoney, formatDate } from "../lib/orders";
import { getToken } from "../lib/session";
import { fetchPayoutMethods, fetchWithdrawals, requestWithdrawal } from "../lib/db";

const SHOP = (process.env.EXPO_PUBLIC_SHOP_URL || "https://mego-shop.pages.dev").replace(/\/+$/, "");
const WITHDRAW_LABEL = { PENDING: "En attente", APPROVED: "Approuvé", PAID: "Payé", REJECTED: "Refusé" };
const TABS = [
  { key: "deposit", label: "Déposer" },
  { key: "withdraw", label: "Retirer" },
  { key: "history", label: "Historique" },
];

// Définis HORS de l'écran (un composant déclaré dans un autre est recréé à chaque rendu).
function Segmented({ value, onChange }) {
  return (
    <View className="mb-4 flex-row rounded-xl bg-chip p-1">
      {TABS.map((t) => {
        const active = t.key === value;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            className={`flex-1 items-center rounded-lg py-2.5 ${active ? "bg-white" : ""}`}
          >
            <Text className={`text-[13px] ${active ? "font-bold text-ink" : "font-semibold text-muted"}`}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Step({ n, text }) {
  return (
    <View className="mb-2 flex-row items-start">
      <View className="mr-3 h-6 w-6 items-center justify-center rounded-full bg-primary-soft">
        <Text className="text-[12px] font-bold text-ink">{n}</Text>
      </View>
      <Text className="flex-1 text-[13px] text-ink">{text}</Text>
    </View>
  );
}

function Box({ children }) {
  return <View className="mb-3 rounded-2xl border border-line bg-white p-4">{children}</View>;
}

function ActionButton({ label, onPress, loading }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      className={`items-center rounded-xl bg-primary py-3.5 ${loading ? "opacity-50" : "active:opacity-80"}`}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text className="text-[14px] font-bold text-white">{label}</Text>
      )}
    </Pressable>
  );
}

/** Portefeuille du livreur : soldes, dépôt (Mobile Money), retrait et historique, comme chez le vendeur. */
export default function WalletScreen({
  rider,
  orders = [],
  refreshing,
  onRefresh,
  onMenuPress,
  onGoBank,
}) {
  const [tab, setTab] = useState("deposit");
  const [withdrawals, setWithdrawals] = useState([]);
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [depositUrl, setDepositUrl] = useState("");

  const delivered = orders.filter((o) => o.status === "DELIVERED");
  // « Solde en attente » : bloqué jusqu'à la confirmation de livraison ; « Solde retirable » : seul solde utilisable pour Retirer.
  const pendingBalance = rider ? Number(rider.pending_balance || 0) : 0;
  const withdrawableBalance = rider
    ? Number(rider.wallet_balance != null ? rider.wallet_balance : rider.wallet || 0)
    : 0;
  const riderId = rider ? rider.id : null;

  const load = useCallback(async () => {
    if (!riderId) return;
    try {
      setError(null);
      const [w, m] = await Promise.all([fetchWithdrawals(riderId), fetchPayoutMethods(riderId)]);
      setWithdrawals(w || []);
      setMethods(m || []);
    } catch (e) {
      setError(e.message || "Chargement impossible");
    } finally {
      setLoading(false);
    }
  }, [riderId]);

  useEffect(() => {
    load();
  }, [load]);

  // Dépôt : la page "Mon portefeuille" de la boutique s'ouvre DANS l'application (bouton Retour), sans Chrome.
  // Le compte livreur connecté est reconnu automatiquement ; le solde se met à jour au retour.
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

  const method = methods.find((m) => m.is_default) || methods[0];

  const request = async () => {
    if (!riderId) return;
    const value = Number(amount);
    if (!value || value <= 0) {
      setError("Montant invalide");
      return;
    }
    if (value > withdrawableBalance) {
      setError("Montant supérieur à ton « Solde retirable »");
      return;
    }
    if (!method) {
      setError("Ajoute d'abord un moyen de paiement");
      return;
    }
    setSaving(true);
    try {
      setError(null);
      const created = await requestWithdrawal(riderId, value, method.id);
      if (created) setWithdrawals((prev) => [created, ...(prev || [])]);
      setAmount("");
      setTab("history");
      if (onRefresh) onRefresh();
    } catch (e) {
      setError(e.message || "Demande impossible");
    } finally {
      setSaving(false);
    }
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
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={() => {
              load();
              if (onRefresh) onRefresh();
            }}
            tintColor={colors.primary}
          />
        }
      >
        <View className="mb-4 rounded-xl bg-chip p-3">
          <Text className="text-[12px] text-ink">
            Le « Solde en attente » est bloqué tant que la livraison n'est pas confirmée.
          </Text>
        </View>

        <View className="mb-4 rounded-2xl bg-navy p-5">
          <Text className="text-[12px] text-white">Solde en attente</Text>
          <Text className="mt-1 text-[22px] font-bold text-white">{formatMoney(pendingBalance)}</Text>
          <Text className="mt-4 text-[12px] text-white">Solde retirable</Text>
          <Text className="mt-1 text-[28px] font-bold text-white">{formatMoney(withdrawableBalance)}</Text>
          <View className="mt-3 flex-row items-center">
            <Icon name="wallet" size={16} color={colors.primary} />
            <Text className="ml-2 text-[12px] text-white">{delivered.length} livraison(s) payée(s)</Text>
          </View>
          <Text className="mt-2 text-[12px] text-white">
            Le « Solde retirable » sert à payer dans les boutiques et se retire par Mobile Money.
          </Text>
        </View>

        <Segmented value={tab} onChange={setTab} />

        {tab === "deposit" ? (
          <Box>
            <Text className="mb-3 text-[15px] font-bold text-ink">Déposer de l'argent</Text>
            <Step n="1" text="Touche le bouton ci-dessous et choisis le montant (de 500 à 500 000 F)." />
            <Step n="2" text="Choisis ton opérateur Mobile Money et valide la demande sur ton téléphone." />
            <Step n="3" text="Ton solde augmente tout seul dès que le paiement est confirmé." />
            <View className="mt-2">
              <ActionButton label="Déposer de l'argent" onPress={openDeposit} />
            </View>
            <Text className="mt-3 text-center text-[11px] text-muted">Paiement sécurisé par FedaPay.</Text>
          </Box>
        ) : null}

        {tab === "withdraw" ? (
          <Box>
            <Text className="mb-3 text-[15px] font-bold text-ink">Retirer de l'argent</Text>
            <Text className="mb-3 text-[12px] text-muted">
              Disponible au retrait : {formatMoney(withdrawableBalance)}
            </Text>
            <Text className="mb-1.5 text-[12px] font-semibold text-muted">Montant</Text>
            <TextInput
              className="mb-3 rounded-xl border border-line bg-white px-3.5 py-3 text-[14px] text-ink"
              value={amount}
              onChangeText={(v) => setAmount(v.replace(/[^0-9]/g, ""))}
              placeholder="5000"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
            />
            <Text className="mb-3 text-[12px] text-muted">
              {method
                ? `Versé sur : ${method.provider || method.label || "Mobile Money"} · ${method.account_number || ""}`
                : "Aucun moyen de paiement enregistré."}
            </Text>
            {error ? <Text className="mb-3 text-[12px] text-red-500">{error}</Text> : null}
            {method ? (
              <ActionButton label="Envoyer la demande" onPress={request} loading={saving} />
            ) : (
              <ActionButton label="Ajouter un moyen de paiement" onPress={onGoBank} />
            )}
          </Box>
        ) : null}

        {tab === "history" ? (
          <View>
            {error ? <Text className="mb-3 text-[12px] text-red-500">{error}</Text> : null}
            <Text className="mb-2 text-[13px] font-bold uppercase text-muted">Retraits</Text>
            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
            ) : withdrawals.length === 0 ? (
              <EmptyState icon="wallet" message="Aucun retrait pour le moment." />
            ) : (
              withdrawals.map((w) => (
                <Box key={w.id}>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="text-[14px] font-bold text-ink">{formatMoney(w.amount, w.currency)}</Text>
                      <Text className="mt-0.5 text-[12px] text-muted">{formatDate(w.created_at)}</Text>
                    </View>
                    <Text className="text-[12px] font-bold text-primary">
                      {WITHDRAW_LABEL[w.status] || w.status}
                    </Text>
                  </View>
                </Box>
              ))
            )}

            <Text className="mb-2 mt-4 text-[13px] font-bold uppercase text-muted">Livraisons payées</Text>
            {delivered.length === 0 ? (
              <EmptyState icon="wallet" message="Aucune transaction pour le moment !" />
            ) : (
              delivered.map((o) => (
                <Box key={o.id}>
                  <View className="flex-row items-center">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-chip">
                      <Icon name="dollar" size={18} color={colors.primary} />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-[14px] font-semibold text-ink">{o.code}</Text>
                      <Text className="text-[12px] text-muted">{formatDate(o.createdAt || o.created_at)}</Text>
                    </View>
                    <Text className="text-[14px] font-bold text-primary">
                      +{formatMoney(o.amount, o.currency)}
                    </Text>
                  </View>
                </Box>
              ))
            )}
          </View>
        ) : null}
      </ScrollView>
      <ShopWebView url={depositUrl} onClose={closeDeposit} />
    </View>
  );
}
