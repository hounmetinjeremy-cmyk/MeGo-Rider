import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  Image,
  Switch,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Icon from "./Icon";
import { Card, Input, Button, SectionTitle } from "./Kit";
import colors from "../theme/colors";
import { createProduct, updateProduct } from "../lib/db";
import { uploadProductImage } from "../lib/storage";

const EMPTY = {
  name: "",
  description: "",
  price: "",
  currency: "FCFA",
  category: "",
  stock: "",
  is_available: true,
};

/** Modale d'ajout / modification d'un produit, avec photo. */
export default function ProductFormModal({ visible, onClose, vendor, product, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [asset, setAsset] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setAsset(null);
    if (product) {
      setForm({
        name: product.name || "",
        description: product.description || "",
        price: product.price != null ? String(product.price) : "",
        currency: product.currency || "FCFA",
        category: product.category || "",
        stock: product.stock != null ? String(product.stock) : "",
        is_available: product.is_available !== false,
      });
    } else {
      setForm(EMPTY);
    }
  }, [visible, product]);

  const pick = async () => {
    try {
      setError(null);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm && perm.granted === false) {
        setError("Autorise l'acces aux photos pour ajouter une image.");
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });
      if (res.canceled) return;
      const picked = res.assets && res.assets[0];
      if (picked) setAsset(picked);
    } catch (e) {
      setError(e.message || "Selection de photo impossible");
    }
  };

  const save = async () => {
    if (!vendor || !vendor.id) return;
    if (!form.name.trim() || !form.price) {
      setError("Nom et prix obligatoires");
      return;
    }
    setSaving(true);
    try {
      setError(null);
      let imageUrl = product ? product.image_url : null;
      if (asset) imageUrl = await uploadProductImage(vendor.id, asset);
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price) || 0,
        currency: form.currency.trim() || "FCFA",
        category: form.category.trim() || null,
        stock: Number(form.stock) || 0,
        is_available: form.is_available !== false,
        image_url: imageUrl,
      };
      const saved = product
        ? await updateProduct(product.id, payload)
        : await createProduct(vendor.id, payload);
      if (onSaved) onSaved(saved);
      onClose();
    } catch (e) {
      setError(e.message || "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  const preview = asset ? asset.uri : product && product.image_url ? product.image_url : null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[92%] rounded-t-3xl bg-surface">
          <View className="flex-row items-center justify-between border-b border-line px-4 py-3.5">
            <Text className="text-[15px] font-bold text-ink">
              {product ? "Modifier le produit" : "Nouveau produit"}
            </Text>
            <Pressable onPress={onClose} className="rounded-full bg-chip p-2 active:opacity-70">
              <Icon name="close" size={16} color={colors.ink} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
            <SectionTitle>Photo du produit</SectionTitle>
            <Card>
              <Pressable onPress={pick} className="active:opacity-80">
                {preview ? (
                  <Image
                    source={{ uri: preview }}
                    style={{ width: "100%", height: 170, borderRadius: 14 }}
                    resizeMode="cover"
                  />
                ) : (
                  <View className="h-[170px] items-center justify-center rounded-2xl border border-dashed border-line bg-chip">
                    <Icon name="package" size={26} color={colors.muted} />
                    <Text className="mt-2 text-[12px] text-muted">Ajouter une photo</Text>
                  </View>
                )}
              </Pressable>
              <View className="mt-3 flex-row items-center">
                <Pressable
                  onPress={pick}
                  className="mr-2 flex-1 flex-row items-center justify-center rounded-lg bg-chip py-2.5 active:opacity-70"
                >
                  <Icon name="refresh" size={14} color={colors.ink} />
                  <Text className="ml-2 text-[12px] font-semibold text-ink">
                    {preview ? "Changer la photo" : "Choisir une photo"}
                  </Text>
                </Pressable>
                {preview ? (
                  <Pressable
                    onPress={() => setAsset(null)}
                    className="items-center justify-center rounded-lg bg-chip px-3 py-2.5 active:opacity-70"
                  >
                    <Icon name="close" size={14} color={colors.ink} />
                  </Pressable>
                ) : null}
              </View>
            </Card>

            <SectionTitle>Informations</SectionTitle>
            <Card>
              <Input
                label="Nom"
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                placeholder="Ex : Attieke poisson"
              />
              <Input
                label="Description"
                value={form.description}
                onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                placeholder="Courte description"
                multiline
              />
              <Input
                label="Prix"
                value={form.price}
                onChangeText={(v) => setForm((f) => ({ ...f, price: v.replace(/[^0-9]/g, "") }))}
                placeholder="1500"
                keyboardType="numeric"
              />
              <Input
                label="Devise"
                value={form.currency}
                onChangeText={(v) => setForm((f) => ({ ...f, currency: v }))}
                placeholder="FCFA"
                autoCapitalize="characters"
              />
              <Input
                label="Categorie"
                value={form.category}
                onChangeText={(v) => setForm((f) => ({ ...f, category: v }))}
                placeholder="Plats"
              />
              <Input
                label="Stock"
                value={form.stock}
                onChangeText={(v) => setForm((f) => ({ ...f, stock: v.replace(/[^0-9]/g, "") }))}
                placeholder="10"
                keyboardType="numeric"
              />
              <View className="mb-1 flex-row items-center justify-between py-1">
                <Text className="text-[13px] text-muted">Disponible a la vente</Text>
                <Switch
                  value={form.is_available !== false}
                  onValueChange={(v) => setForm((f) => ({ ...f, is_available: v }))}
                  trackColor={{ true: colors.primary, false: "#D9D9D9" }}
                />
              </View>
            </Card>

            {error ? <Text className="mb-3 text-[12px] text-red-500">{error}</Text> : null}

            <Button
              label={product ? "Enregistrer" : "Ajouter le produit"}
              icon="check"
              onPress={save}
              loading={saving}
            />
            {saving ? (
              <View className="mt-3 flex-row items-center justify-center">
                <ActivityIndicator color={colors.primary} />
                <Text className="ml-2 text-[12px] text-muted">Envoi de la photo...</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
