import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator } from "react-native";
import AppHeader from "../components/AppHeader";
import EmptyState from "../components/EmptyState";
import Icon from "../components/Icon";
import { Card, SectionTitle, Button, Input, Badge } from "../components/Kit";
import colors from "../theme/colors";
import { listProducts, createProduct, updateProduct, deleteProduct } from "../lib/db";

function money(value, currency) {
  const n = Number(value || 0);
  return `${n.toLocaleString("fr-FR")} ${currency || "FCFA"}`;
}

/** Catalogue de la boutique : ajout, disponibilite, suppression. */
export default function ProductsScreen({ vendor, onMenuPress, onBack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", price: "", category: "" });

  const load = useCallback(async () => {
    if (!vendor || !vendor.id) return;
    try {
      setError(null);
      const rows = await listProducts(vendor.id);
      setItems(rows || []);
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
    if (!form.name.trim() || !form.price) {
      setError("Nom et prix obligatoires");
      return;
    }
    setSaving(true);
    try {
      setError(null);
      const created = await createProduct(vendor.id, {
        name: form.name.trim(),
        price: Number(form.price),
        category: form.category.trim() || null,
        currency: "FCFA",
        is_available: true,
      });
      setItems((prev) => [created, ...(prev || [])]);
      setForm({ name: "", price: "", category: "" });
    } catch (e) {
      setError(e.message || "Ajout impossible");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (item) => {
    setBusyId(item.id);
    try {
      const next = !item.is_available;
      await updateProduct(item.id, { is_available: next });
      setItems((prev) => (prev || []).map((p) => (p.id === item.id ? { ...p, is_available: next } : p)));
    } catch (e) {
      setError(e.message || "Mise a jour impossible");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (item) => {
    setBusyId(item.id);
    try {
      await deleteProduct(item.id);
      setItems((prev) => (prev || []).filter((p) => p.id !== item.id));
    } catch (e) {
      setError(e.message || "Suppression impossible");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View className="flex-1 bg-surface">
      <AppHeader title="Produits" subtitle={vendor ? vendor.name : undefined} onMenuPress={onMenuPress} />
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
        <SectionTitle>Nouveau produit</SectionTitle>
        <Card>
          <Input
            label="Nom"
            value={form.name}
            onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
            placeholder="Ex : Attieke poisson"
          />
          <Input
            label="Prix"
            value={form.price}
            onChangeText={(v) => setForm((f) => ({ ...f, price: v.replace(/[^0-9]/g, "") }))}
            placeholder="1500"
            keyboardType="numeric"
          />
          <Input
            label="Categorie"
            value={form.category}
            onChangeText={(v) => setForm((f) => ({ ...f, category: v }))}
            placeholder="Plats"
          />
          <Button label="Ajouter" icon="check" onPress={add} loading={saving} />
        </Card>

        {error ? (
          <Text className="mb-3 text-[12px] text-red-500">{error}</Text>
        ) : null}

        <SectionTitle right={<Text className="text-[12px] text-muted">{items.length} article(s)</Text>}>
          Mon catalogue
        </SectionTitle>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : items.length === 0 ? (
          <EmptyState icon="package" message="Aucun produit pour le moment." />
        ) : (
          items.map((item) => (
            <Card key={item.id}>
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-[14px] font-bold text-ink">{item.name}</Text>
                  <Text className="mt-0.5 text-[12px] text-muted">
                    {money(item.price, item.currency)}
                    {item.category ? ` - ${item.category}` : ""}
                  </Text>
                </View>
                <Badge label={item.is_available ? "Disponible" : "Indisponible"} tone={item.is_available ? "primary" : "chip"} />
              </View>
              <View className="mt-3 flex-row items-center">
                <Pressable
                  onPress={() => toggle(item)}
                  disabled={busyId === item.id}
                  className="mr-2 flex-1 flex-row items-center justify-center rounded-lg bg-chip py-2.5"
                >
                  <Icon name="refresh" size={14} color={colors.ink} />
                  <Text className="ml-2 text-[12px] font-semibold text-ink">
                    {item.is_available ? "Rendre indisponible" : "Rendre disponible"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => remove(item)}
                  disabled={busyId === item.id}
                  className="items-center justify-center rounded-lg bg-chip px-3 py-2.5"
                >
                  <Icon name="close" size={14} color={colors.ink} />
                </Pressable>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}
