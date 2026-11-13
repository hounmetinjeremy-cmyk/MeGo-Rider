import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator } from "react-native";
import Icon from "../components/Icon";
import { money } from "../lib/shop";

export default function CheckoutScreen({ shop, cart, onBack, onPlaced }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const products = shop.products || [];
  const lines = products.filter((p) => cart[p.id]);
  const subtotal = lines.reduce((a, p) => a + cart[p.id] * Number(p.price || 0), 0);
  const fee = Number(shop.delivery_fee || 0);
  const total = subtotal + fee;

  const submit = async () => {
    if (!name.trim() || !phone.trim() || !address.trim()) {
      setErr("Nom, telephone et adresse sont obligatoires.");
      return;
    }
    setBusy(true);
    setErr("");
    const res = await onPlaced({ name, phone, address, note });
    setBusy(false);
    if (!res || res.ok === false) setErr((res && res.error) || "Commande impossible");
  };

  const Field = ({ label, value, set, placeholder, keyboard, multiline }) => (
    <View className="mb-3">
      <Text className="mb-1 text-[12px] font-semibold text-muted">{label}</Text>
      <TextInput
        value={value}
        onChangeText={set}
        placeholder={placeholder}
        keyboardType={keyboard || "default"}
        multiline={!!multiline}
        className="rounded-xl border border-line bg-white px-3 py-2.5 text-[14px] text-ink"
      />
    </View>
  );

  return (
    <View className="flex-1 bg-surface">
      <View className="flex-row items-center bg-navy px-4 py-4">
        <Pressable onPress={onBack} className="mr-3 active:opacity-70">
          <Icon name="chevronRight" size={20} color="#FFFFFF" />
        </Pressable>
        <Text className="text-[16px] font-bold text-white">Ma commande</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View className="mb-3 rounded-2xl bg-white p-4">
          <Text className="mb-2 text-[13px] font-bold text-ink">Recapitulatif</Text>
          {lines.map((p) => (
            <View key={p.id} className="mb-1 flex-row justify-between">
              <Text className="flex-1 text-[13px] text-ink">{cart[p.id]} x {p.name}</Text>
              <Text className="text-[13px] font-semibold text-ink">{money(cart[p.id] * Number(p.price || 0))}</Text>
            </View>
          ))}
          <View className="mt-2 border-t border-line pt-2">
            <View className="flex-row justify-between">
              <Text className="text-[13px] text-muted">Sous-total</Text>
              <Text className="text-[13px] text-ink">{money(subtotal)}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[13px] text-muted">Livraison</Text>
              <Text className="text-[13px] text-ink">{money(fee)}</Text>
            </View>
            <View className="mt-1 flex-row justify-between">
              <Text className="text-[14px] font-bold text-ink">Total</Text>
              <Text className="text-[14px] font-extrabold text-primary">{money(total)}</Text>
            </View>
          </View>
        </View>

        <View className="rounded-2xl bg-white p-4">
          <Text className="mb-2 text-[13px] font-bold text-ink">Livraison</Text>
          <Field label="Nom" value={name} set={setName} placeholder="Ton nom" />
          <Field label="Telephone" value={phone} set={setPhone} placeholder="+229 ..." keyboard="phone-pad" />
          <Field label="Adresse" value={address} set={setAddress} placeholder="Quartier, repere" multiline />
          <Field label="Note (optionnel)" value={note} set={setNote} placeholder="Sans piment..." multiline />
        </View>

        {err ? <Text className="mt-3 text-[13px] font-semibold text-red-500">{err}</Text> : null}

        <Pressable
          onPress={submit}
          disabled={busy}
          className="mt-4 flex-row items-center justify-center rounded-2xl bg-primary py-3.5 active:opacity-80">
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-[15px] font-bold text-white">Commander - {money(total)}</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}
