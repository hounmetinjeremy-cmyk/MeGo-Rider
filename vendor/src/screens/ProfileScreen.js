import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Switch } from "react-native";
import AppHeader from "../components/AppHeader";
import MarketplaceToggle from "../components/MarketplaceToggle";
import { Card, SectionTitle, Button, Input, Row } from "../components/Kit";
import colors from "../theme/colors";
import { updateVendor, setVendorOpen } from "../lib/db";

/** Profil de la boutique : informations et ouverture / fermeture. */
export default function ProfileScreen({ vendor, onMenuPress, onBack }) {
  const [form, setForm] = useState({
    name: "",
    owner_name: "",
    phone: "",
    email: "",
    address: "",
    category: "",
  });
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!vendor) return;
    setForm({
      name: vendor.name || "",
      owner_name: vendor.owner_name || "",
      phone: vendor.phone || "",
      email: vendor.email || "",
      address: vendor.address || "",
      category: vendor.category || "",
    });
    setIsOpen(vendor.is_open === true);
  }, [vendor]);

  const save = async () => {
    if (!vendor || !vendor.id) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await updateVendor(vendor.id, {
        name: form.name.trim(),
        owner_name: form.owner_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        category: form.category.trim(),
      });
      setMessage("Profil enregistre");
    } catch (e) {
      setError(e.message || "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  const toggleOpen = async (value) => {
    if (!vendor || !vendor.id) return;
    setIsOpen(value);
    try {
      await setVendorOpen(vendor.id, value);
    } catch (e) {
      setIsOpen(!value);
      setError(e.message || "Changement impossible");
    }
  };

  return (
    <View className="flex-1 bg-surface">
      <AppHeader title="Profil" subtitle={vendor ? vendor.name : undefined} onMenuPress={onMenuPress} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Card>
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-[14px] font-bold text-ink">Boutique ouverte</Text>
              <Text className="mt-0.5 text-[12px] text-muted">
                {isOpen ? "Vous recevez des commandes" : "Vous etes ferme"}
              </Text>
            </View>
            <Switch
              value={isOpen}
              onValueChange={toggleOpen}
              trackColor={{ false: colors.line, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
            <MarketplaceToggle vendor={vendor} />
          </View>
        </Card>

        <SectionTitle>Informations</SectionTitle>
        <Card>
          <Input label="Nom de la boutique" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
          <Input label="Responsable" value={form.owner_name} onChangeText={(v) => setForm((f) => ({ ...f, owner_name: v }))} />
          <Input label="Telephone" value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} keyboardType="phone-pad" />
          <Input label="Email" value={form.email} onChangeText={(v) => setForm((f) => ({ ...f, email: v }))} keyboardType="email-address" />
          <Input label="Adresse" value={form.address} onChangeText={(v) => setForm((f) => ({ ...f, address: v }))} />
          <Input label="Categorie" value={form.category} onChangeText={(v) => setForm((f) => ({ ...f, category: v }))} />
          <Button label="Enregistrer" icon="check" onPress={save} loading={saving} />
        </Card>

        {message ? <Text className="mb-3 text-[12px] text-primary">{message}</Text> : null}
        {error ? <Text className="mb-3 text-[12px] text-red-500">{error}</Text> : null}

        <SectionTitle>Compte</SectionTitle>
        <Card>
          <Row label="Note" value={vendor && vendor.rating ? String(vendor.rating) : "-"} icon="trend" />
          <Row label="Langue" value={vendor && vendor.language ? vendor.language.toUpperCase() : "FR"} icon="globe" />
          <Row label="Identifiant" value={vendor ? String(vendor.id).slice(0, 8) : "-"} icon="shield" />
        </Card>
      </ScrollView>
    </View>
  );
}
