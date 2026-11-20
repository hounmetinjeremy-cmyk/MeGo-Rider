import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, Pressable, Platform, Linking } from "react-native";
import AppHeader from "../components/AppHeader";
import EmptyState from "../components/EmptyState";
import ShopWebView from "../components/ShopWebView";
import { Card, Button, Input, Badge } from "../components/Kit";
import colors from "../theme/colors";
import { listWithdrawals, requestWithdrawal, listPayoutMethods } from "../lib/db";
import { getToken } from "../lib/session";

const SHOP = (process.env.EXPO_PUBLIC_SHOP_URL || "https://mego-shop.pages.dev").replace(/\/+$/, "");
const WITHDRAW_LABEL = { PENDING: "En attente", PAID: "Payé", REJECTED: "Refusé" };
const TABS = [
  { key: "deposit", label: "Déposer" },
  { key: "withdraw", label: "Retirer" },
  { key: "history", label: "Historique" },
];

function money(value, currency) {
  const n = Number(value || 0);
  return `${n.toLocaleString("fr-FR")} ${currency || "FCFA"}`;
}

function shortDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

// Defini HORS de l'ecran (un composant declare dans un autre est recree a chaque rendu).
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
            <Text className={`text-[13px] ${active ? "font-bold text-ink" : "font-semibold text-muted"}`}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Step({ n, text }) {
  return (
    <View className="mb-2 flex-row items-start">
      <View className="mr-3 h-6 w-6 items-center justify-center rounded-full bg-primarySoft">
        <Text className="text-[12px] font-bold text-ink">{n}</Text>
      </View>
      <Text className="flex-1 text-[13px] text-ink">{text}</Text>
    </View>
  );
}

/** Portefeuille du vendeur : solde, depot d'argent (Mobile Money), retrait et historique, dans un onglet a part. */
export default function WalletScreen({ vendor, onMenuPress, onRefresh }) {
  const [tab, setTab] = useState("deposit");
  const [withdrawals, setWithdrawals] = useState([]);
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [depositUrl, setDepositUrl] = useState("");

  const load = useCallback(async () => {
    if (!vendor || !vendor.id) return;
    try {
      setError(null);
      const [w, m] = await Promise.all([listWithdrawals(vendor.id), listPayoutMethods(vendor.id)]);
      setWithdrawals(w || []);
      setMethods(m || []);
    } catch (e) {
      setError(e.message || "Chargement impossible");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [vendor]);

  useEffect(() => {
    load();
  }, [load]);

  // Depot : la page "Mon portefeuille" de la boutique s'ouvre DANS l'application (bouton Retour), sans Chrome.
  const openDeposit = () => {
    const u = SHOP + "/?wallet=1";
    if (Platform.OS === "web") {
      let t = null;
      try {
        t = getToken("vendor");
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

  const request = async () => {
    if (!vendor || !vendor.id) return;
    const value = Number(amount);
    if (!value || value <= 0) {
      setError("Montant invalide");
      return;
    }
    const method = methods.find((m) => m.is_default) || methods[0];
    if (!method) {
      setError("Ajoutez d'abord un moyen de paiement dans Compte bancaire (menu)");
      return;
    }
    setSaving(true);
    try {
      setError(null);
      const created = await requestWithdrawal(vendor.id, value, method.id);
      setWithdrawals((prev) => [created, ...(prev || [])]);
      setAmount("");
      setTab("history");
    } catch (e) {
      setError(e.message || "Demande impossible");
    } finally {
      setSaving(false);
    }
  };

  const method = methods.find((m) => m.is_default) || methods[0];

  return (
    <View className="flex-1 bg-surface">
      <AppHeader title="Portefeuille" subtitle={vendor ? vendor.name : undefined} onMenuPress={onMenuPress} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
              if (onRefresh) onRefresh();
            }}
          />
        }
      >
        <View className="mb-4 rounded-2xl bg-navy p-5">
          <Text className="text-[12px] text-white">Solde disponible</Text>
          <Text className="mt-1 text-[28px] font-bold text-white">{money(vendor ? vendor.wallet_balance : 0)}</Text>
          <Text className="mt-2 text-[12px] text-white">
            Sert à payer dans les boutiques des autres, et se retire par Mobile Money.
          </Text>
        </View>

        <Segmented value={tab} onChange={setTab} />

        {tab === "deposit" ? (
          <Card>
            <Text className="mb-3 text-[15px] font-bold text-ink">Déposer de l'argent</Text>
            <Step n="1" text="Touche le bouton ci-dessous et choisis le montant (de 500 à 500 000 F)." />
            <Step n="2" text="Choisis ton opérateur Mobile Money et valide la demande sur ton téléphone." />
            <Step n="3" text="Ton solde augmente tout seul dès que le paiement est confirmé." />
            <View className="mt-2">
              <Button label="Déposer de l'argent" icon="wallet" onPress={openDeposit} />
            </View>
            <Text className="mt-3 text-center text-[11px] text-muted">Paiement sécurisé par FedaPay.</Text>
          </Card>
        ) : null}

        {tab === "withdraw" ? (
          <Card>
            <Text className="mb-3 text-[15px] font-bold text-ink">Retirer de l'argent</Text>
            <Input
              label="Montant"
              value={amount}
              onChangeText={(v) => setAmount(v.replace(/[^0-9]/g, ""))}
              placeholder="5000"
              keyboardType="numeric"
            />
            <Text className="mb-3 text-[12px] text-muted">
              {method
                ? `Versé sur : ${method.provider || "Mobile Money"}`
                : "Aucun moyen de paiement : ajoutes-en un dans Compte bancaire (menu)."}
            </Text>
            {error ? <Text className="mb-3 text-[12px] text-red-500">{error}</Text> : null}
            <Button label="Envoyer la demande" icon="card" onPress={request} loading={saving} />
          </Card>
        ) : null}

        {tab === "history" ? (
          <View>
            {error ? <Text className="mb-3 text-[12px] text-red-500">{error}</Text> : null}
            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
            ) : withdrawals.length === 0 ? (
              <EmptyState icon="wallet" message="Aucun retrait pour le moment." />
            ) : (
              withdrawals.map((w) => (
                <Card key={w.id}>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="text-[14px] font-bold text-ink">{money(w.amount, w.currency)}</Text>
                      <Text className="mt-0.5 text-[12px] text-muted">{shortDate(w.requested_at)}</Text>
                    </View>
                    <Badge label={WITHDRAW_LABEL[w.status] || w.status} tone={w.status === "PAID" ? "primary" : "chip"} />
                  </View>
                </Card>
              ))
            )}
          </View>
        ) : null}
      </ScrollView>
      <ShopWebView url={depositUrl} onClose={closeDeposit} />
    </View>
  );
}
