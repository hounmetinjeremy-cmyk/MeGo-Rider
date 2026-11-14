import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator } from "react-native";
import AppHeader from "../components/AppHeader";
import { Card, SectionTitle } from "../components/Kit";
import { supabase } from "../lib/supabaseClient";

export default function ZonesScreen({ vendor, onMenuPress, onBack }) {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [fee, setFee] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!vendor || !vendor.id) return;
    setLoading(true);
    const { data, error: err } = await supabase.rpc("get_vendor_zones", { p_vendor_id: vendor.id });
    setLoading(false);
    if (err) { setError(err.message); return; }
    const list = data && data.ok === false ? [] : data;
    setZones(Array.isArray(list) ? list : (list && list.zones) || []);
    if (data && data.ok === false) setError(data.error || "");
  }, [vendor]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!vendor || !vendor.id) return;
    if (name.trim().length < 2) { setError("Nom de zone trop court"); return; }
    setBusy(true); setError("");
    const { data, error: err } = await supabase.rpc("upsert_vendor_zone", {
      p_vendor_id: vendor.id, p_zone_id: null, p_name: name.trim(), p_fee: Number(fee) || 0,
    });
    setBusy(false);
    if (err || (data && data.ok === false)) { setError((data && data.error) || err.message); return; }
    setName(""); setFee(""); load();
  };

  const remove = async (id) => {
    setBusy(true);
    const { data, error: err } = await supabase.rpc("delete_vendor_zone", { p_vendor_id: vendor.id, p_zone_id: id });
    setBusy(false);
    if (err || (data && data.ok === false)) { setError((data && data.error) || err.message); return; }
    load();
  };

  return (
    <View className="flex-1 bg-surface">
      <AppHeader title="Zones de livraison" onMenuPress={onMenuPress} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <SectionTitle>Ajouter une zone</SectionTitle>
        <Card>
          <TextInput value={name} onChangeText={setName} placeholder="Quartier / zone (ex : Calavi centre)"
            className="mb-3 rounded-xl border border-line bg-white px-3 py-2 text-[14px] text-ink" />
          <TextInput value={fee} onChangeText={setFee} placeholder="Frais de livraison (FCFA)" keyboardType="numeric"
            className="mb-3 rounded-xl border border-line bg-white px-3 py-2 text-[14px] text-ink" />
          <Pressable onPress={add} disabled={busy} className="items-center rounded-xl bg-primary py-3">
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-[14px] font-bold text-white">Ajouter</Text>}
          </Pressable>
        </Card>
        {error ? <Text className="mt-3 text-[13px] text-red-600">{error}</Text> : null}
        <SectionTitle>Mes zones</SectionTitle>
        {loading ? <ActivityIndicator color="#76D865" /> : zones.length === 0 ? (
          <Card><Text className="text-[13px] text-muted">Aucune zone : les frais globaux de la boutique s'appliquent.</Text></Card>
        ) : zones.map((z) => (
          <Card key={z.id}>
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-[15px] font-bold text-ink">{z.name}</Text>
                <Text className="text-[13px] text-muted">{Number(z.fee || 0).toLocaleString("fr-FR")} FCFA</Text>
              </View>
              <Pressable onPress={() => remove(z.id)} className="rounded-xl bg-red-500/10 px-3 py-2">
                <Text className="text-[13px] font-bold text-red-600">Supprimer</Text>
              </Pressable>
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}
