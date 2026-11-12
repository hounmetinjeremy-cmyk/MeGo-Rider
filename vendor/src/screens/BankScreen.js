import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator } from "react-native";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import Icon from "../components/Icon";
import { Card, SectionTitle, Button, Input, Badge } from "../components/Kit";
import colors from "../theme/colors";
import { PAYOUT_PROVIDERS, listPayoutMethods, addPayoutMethod, deletePayoutMethod } from "../lib/db";

/** Banque : moyens de paiement pour recevoir les retraits. */
export default function BankScreen({ vendor, onMenuPress, onBack }) {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [form, setForm] = useState({ provider: "", account_name: "", account_number: "" });

  const load = useCallback(async () => {
    if (!vendor || !vendor.id) return;
    try {
      setError(null);
      const rows = await listPayoutMethods(vendor.id);
      setMethods(rows || []);
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

  const add = async () => {
    if (!vendor || !vendor.id) return;
    if (!form.provider.trim() || !form.account_number.trim()) {
      setError("Fournisseur et numero obligatoires");
      return;
    }
    setSaving(true);
    try {
      setError(null);
      const created = await addPayoutMethod(vendor.id, {
        method: "mobile_money",
        provider: form.provider.trim(),
        account_name: form.account_name.trim() || null,
        account_number: form.account_number.trim(),
        is_default: methods.length === 0,
      });
      setMethods((prev) => [created, ...(prev || [])]);
      setForm({ provider: "", account_name: "", account_number: "" });
    } catch (e) {
      setError(e.message || "Ajout impossible");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item) => {
    setBusyId(item.id);
    try {
      await deletePayoutMethod(item.id);
      setMethods((prev) => (prev || []).filter((m) => m.id !== item.id));
    } catch (e) {
      setError(e.message || "Suppression impossible");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader title="Banque" onBack={onBack} />
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
        <SectionTitle>Ajouter un moyen de paiement</SectionTitle>
        <Card>
          <Text className="mb-2 text-[12px] text-muted">Fournisseur</Text>
          <View className="mb-3 flex-row flex-wrap">
            {(PAYOUT_PROVIDERS || []).map((p) => {
              const value = typeof p === "string" ? p : p.label || p.value || p.code;
              const active = form.provider === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => setForm((f) => ({ ...f, provider: value }))}
                  className={`mb-2 mr-2 rounded-full px-3 py-1.5 ${active ? "bg-primary" : "bg-chip"}`}
                >
                  <Text className={`text-[12px] font-semibold ${active ? "text-white" : "text-ink"}`}>
                    {value}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Input
            label="Nom du titulaire"
            value={form.account_name}
            onChangeText={(v) => setForm((f) => ({ ...f, account_name: v }))}
            placeholder="Ex : KOFFI Jean"
          />
          <Input
            label="Numero de compte"
            value={form.account_number}
            onChangeText={(v) => setForm((f) => ({ ...f, account_number: v }))}
            placeholder="Ex : 0197000000"
            keyboardType="phone-pad"
          />
          <Button label="Ajouter" icon="card" onPress={add} loading={saving} />
        </Card>

        {error ? <Text className="mb-3 text-[12px] text-red-500">{error}</Text> : null}

        <SectionTitle>Mes moyens de paiement</SectionTitle>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : methods.length === 0 ? (
          <EmptyState icon="card" message="Aucun moyen de paiement enregistre." />
        ) : (
          methods.map((m) => (
            <Card key={m.id}>
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-[14px] font-bold text-ink">{m.provider || m.method}</Text>
                  <Text className="mt-0.5 text-[12px] text-muted">
                    {m.account_name ? `${m.account_name} - ` : ""}
                    {m.account_number}
                  </Text>
                </View>
                {m.is_default ? <Badge label="Par defaut" tone="primary" /> : null}
              </View>
              <Pressable
                onPress={() => remove(m)}
                disabled={busyId === m.id}
                className="mt-3 flex-row items-center justify-center rounded-lg bg-chip py-2.5"
              >
                <Icon name="close" size={14} color={colors.ink} />
                <Text className="ml-2 text-[12px] font-semibold text-ink">Supprimer</Text>
              </Pressable>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}
