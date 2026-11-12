import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import AppHeader from "../components/AppHeader";
import StatCard from "../components/StatCard";
import EmptyState from "../components/EmptyState";
import { Card, SectionTitle, Button, Input, Badge } from "../components/Kit";
import colors from "../theme/colors";
import { STATUS } from "../lib/orders";
import { listWithdrawals, requestWithdrawal, listPayoutMethods } from "../lib/db";

const WITHDRAW_LABEL = { PENDING: "En attente", PAID: "Paye", REJECTED: "Refuse" };

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

/** Revenus : chiffres cles, solde et demandes de retrait. */
export default function EarningsScreen({ vendor, orders, onMenuPress, onBack }) {
  const [withdrawals, setWithdrawals] = useState([]);
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const stats = useMemo(() => {
    const list = orders || [];
    const delivered = list.filter((o) => o.status === STATUS.DELIVERED);
    const revenue = delivered.reduce((sum, o) => sum + Number(o.amount || 0), 0);
    return {
      total: list.length,
      delivered: delivered.length,
      pending: list.filter((o) => o.status === STATUS.NEW).length,
      revenue,
    };
  }, [orders]);

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

  const request = async () => {
    if (!vendor || !vendor.id) return;
    const value = Number(amount);
    if (!value || value <= 0) {
      setError("Montant invalide");
      return;
    }
    const method = methods.find((m) => m.is_default) || methods[0];
    if (!method) {
      setError("Ajoutez d'abord un moyen de paiement dans Banque");
      return;
    }
    setSaving(true);
    try {
      setError(null);
      const created = await requestWithdrawal(vendor.id, value, method.id);
      setWithdrawals((prev) => [created, ...(prev || [])]);
      setAmount("");
    } catch (e) {
      setError(e.message || "Demande impossible");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-surface">
      <AppHeader title="Revenus" subtitle={vendor ? vendor.name : undefined} onMenuPress={onMenuPress} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
      >
        <View className="mb-3 flex-row">
          <View className="mr-2 flex-1">
            <StatCard icon="wallet" label="Solde" value={money(vendor ? vendor.wallet_balance : 0)} tint={colors.primary} />
          </View>
          <View className="flex-1">
            <StatCard icon="trend" label="Total gagne" value={money(vendor ? vendor.total_earnings : 0)} tint={colors.navy} />
          </View>
        </View>
        <View className="mb-3 flex-row">
          <View className="mr-2 flex-1">
            <StatCard icon="check" label="Livrees" value={String(stats.delivered)} tint={colors.primary} />
          </View>
          <View className="flex-1">
            <StatCard icon="clock" label="En attente" value={String(stats.pending)} tint="#F59E0B" />
          </View>
        </View>

        <SectionTitle>Demander un retrait</SectionTitle>
        <Card>
          <Input
            label="Montant"
            value={amount}
            onChangeText={(v) => setAmount(v.replace(/[^0-9]/g, ""))}
            placeholder="5000"
            keyboardType="numeric"
          />
          <Text className="mb-3 text-[12px] text-muted">
            {methods.length > 0
              ? `Verse sur : ${(methods.find((m) => m.is_default) || methods[0]).provider || "Mobile Money"}`
              : "Aucun moyen de paiement : ajoutez-en un dans Banque."}
          </Text>
          <Button label="Envoyer la demande" icon="card" onPress={request} loading={saving} />
        </Card>

        {error ? <Text className="mb-3 text-[12px] text-red-500">{error}</Text> : null}

        <SectionTitle>Historique</SectionTitle>
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
      </ScrollView>
    </View>
  );
}
