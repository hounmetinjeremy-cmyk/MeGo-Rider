import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator, Image } from "react-native";
import AppHeader from "../components/AppHeader";
import EmptyState from "../components/EmptyState";
import Icon from "../components/Icon";
import { Card, SectionTitle, Badge } from "../components/Kit";
import ProductFormModal from "../components/ProductFormModal";
import colors from "../theme/colors";
import { listProducts, updateProduct, deleteProduct } from "../lib/db";

function money(value, currency) {
  const n = Number(value || 0);
  return `${n.toLocaleString("fr-FR")} ${currency || "FCFA"}`;
}

/** Catalogue de la boutique : ajout avec photo, disponibilite, suppression. */
export default function ProductsScreen({ vendor, onMenuPress, onBack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

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

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setModalOpen(true);
  };

  const onSaved = (saved) => {
    if (!saved) {
      load();
      return;
    }
    setItems((prev) => {
      const list = prev || [];
      const exists = list.some((p) => p.id === saved.id);
      return exists ? list.map((p) => (p.id === saved.id ? { ...p, ...saved } : p)) : [saved, ...list];
    });
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
        <Pressable
          onPress={openNew}
          className="mb-4 flex-row items-center justify-center rounded-xl bg-primary py-3.5 active:opacity-80"
        >
          <Icon name="package" size={16} color="#FFFFFF" />
          <Text className="ml-2 text-[13px] font-bold text-white">Ajouter un produit</Text>
        </Pressable>

        {error ? <Text className="mb-3 text-[12px] text-red-500">{error}</Text> : null}

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
              <View className="flex-row items-center">
                {item.image_url ? (
                  <Image
                    source={{ uri: item.image_url }}
                    style={{ width: 56, height: 56, borderRadius: 12, marginRight: 12 }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    className="mr-3 items-center justify-center rounded-xl bg-chip"
                    style={{ width: 56, height: 56 }}
                  >
                    <Icon name="package" size={20} color={colors.muted} />
                  </View>
                )}
                <View className="flex-1 pr-2">
                  <Text className="text-[14px] font-bold text-ink">{item.name}</Text>
                  <Text className="mt-0.5 text-[12px] text-muted">
                    {money(item.price, item.currency)}
                    {item.category ? ` - ${item.category}` : ""}
                  </Text>
                  <Text className="mt-0.5 text-[11px] text-muted">Stock : {item.stock != null ? item.stock : 0}</Text>
                </View>
                <Badge
                  label={item.is_available ? "Disponible" : "Indisponible"}
                  tone={item.is_available ? "primary" : "chip"}
                />
              </View>
              <View className="mt-3 flex-row items-center">
                <Pressable
                  onPress={() => openEdit(item)}
                  className="mr-2 flex-1 flex-row items-center justify-center rounded-lg bg-chip py-2.5 active:opacity-70"
                >
                  <Icon name="refresh" size={14} color={colors.ink} />
                  <Text className="ml-2 text-[12px] font-semibold text-ink">Modifier</Text>
                </Pressable>
                <Pressable
                  onPress={() => toggle(item)}
                  disabled={busyId === item.id}
                  className="mr-2 flex-1 flex-row items-center justify-center rounded-lg bg-chip py-2.5 active:opacity-70"
                >
                  <Icon name="check" size={14} color={colors.ink} />
                  <Text className="ml-2 text-[12px] font-semibold text-ink">
                    {item.is_available ? "Indisponible" : "Disponible"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => remove(item)}
                  disabled={busyId === item.id}
                  className="items-center justify-center rounded-lg bg-chip px-3 py-2.5 active:opacity-70"
                >
                  <Icon name="close" size={14} color={colors.ink} />
                </Pressable>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      <ProductFormModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        vendor={vendor}
        product={editing}
        onSaved={onSaved}
      />
    </View>
  );
}
