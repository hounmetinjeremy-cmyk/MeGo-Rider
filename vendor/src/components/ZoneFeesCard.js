import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, TextInput, ActivityIndicator } from "react-native";
import { Card, SectionTitle } from "./Kit";
import { supabase } from "../lib/supabaseClient";

const INPUT = "rounded-xl border border-line bg-white px-3 py-2 text-[14px] text-ink";

/**
 * Frais de livraison par zone, fixés par le vendeur lui-même.
 * Le client paie : prix du produit + frais de la zone choisie.
 * Chaque modification est enregistrée tout de suite (indépendamment du bouton du produit).
 */
export default function ZoneFeesCard({ vendor }) {
  const [zones, setZones] = useState([]);
  const [fees, setFees] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [fee, setFee] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    if (!vendor || !vendor.id) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("get_vendor_zones", { p_vendor_id: vendor.id });
    setLoading(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    const list = data && data.ok === false ? [] : data;
    setZones(Array.isArray(list) ? list : (list && list.zones) || []);
    setFees({});
  }, [vendor]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (id, zoneName, value) => {
    setBusy(true);
    setMsg("");
    const { data, error } = await supabase.rpc("upsert_vendor_zone", {
      p_vendor_id: vendor.id,
      p_zone_id: id,
      p_name: zoneName,
      p_fee: Number(value) || 0,
    });
    setBusy(false);
    if (error || (data && data.ok === false)) {
      setMsg((data && data.error) || error.message);
      return false;
    }
    setMsg("Frais enregistres.");
    await load();
    return true;
  };

  const add = async () => {
    if (name.trim().length < 2) {
      setMsg("Nom de zone trop court");
      return;
    }
    const ok = await save(null, name.trim(), fee);
    if (ok) {
      setName("");
      setFee("");
    }
  };

  const remove = async (id) => {
    setBusy(true);
    const { data, error } = await supabase.rpc("delete_vendor_zone", { p_vendor_id: vendor.id, p_zone_id: id });
    setBusy(false);
    if (error || (data && data.ok === false)) {
      setMsg((data && data.error) || error.message);
      return;
    }
    load();
  };

  return (
    <View>
      <SectionTitle>Frais de livraison par zone</SectionTitle>
      <Card>
        <Text className="mb-3 text-[12px] text-muted">
          Tu fixes toi-meme les frais de livraison de chaque zone (ex : Calavi, Cotonou). Le client paie le prix du produit + les frais de la zone qu'il choisit. Le livreur recoit exactement ces frais.
        </Text>
        {loading ? <ActivityIndicator color="#76D865" /> : null}
        {!loading && zones.length === 0 ? (
          <Text className="mb-3 text-[13px] text-muted">Aucune zone : ajoutes-en une ci-dessous.</Text>
        ) : null}
        {zones.map((z) => (
          <View key={z.id} className="mb-3 flex-row items-center">
            <Text className="mr-2 flex-1 text-[14px] font-semibold text-ink">{z.name}</Text>
            <TextInput
              value={fees[z.id] !== undefined ? fees[z.id] : String(z.fee ?? 0)}
              onChangeText={(v) => setFees((f) => ({ ...f, [z.id]: v.replace(/[^0-9]/g, "") }))}
              keyboardType="numeric"
              className={`${INPUT} w-24 text-right`}
            />
            <Text className="mx-1 text-[12px] text-muted">FCFA</Text>
            <Pressable
              disabled={busy}
              onPress={() => save(z.id, z.name, fees[z.id] !== undefined ? fees[z.id] : z.fee)}
              className="rounded-xl bg-primary px-3 py-2"
            >
              <Text className="text-[12px] font-bold text-white">OK</Text>
            </Pressable>
            <Pressable disabled={busy} onPress={() => remove(z.id)} className="ml-1 rounded-xl bg-red-500/10 px-2 py-2">
              <Text className="text-[12px] font-bold text-red-600">X</Text>
            </Pressable>
          </View>
        ))}
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Nouvelle zone (ex : Cotonou)"
          className={`${INPUT} mb-3`}
        />
        <TextInput
          value={fee}
          onChangeText={(v) => setFee(v.replace(/[^0-9]/g, ""))}
          placeholder="Frais de livraison (FCFA)"
          keyboardType="numeric"
          className={`${INPUT} mb-3`}
        />
        <Pressable onPress={add} disabled={busy} className="items-center rounded-xl bg-primary py-3">
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-[14px] font-bold text-white">Ajouter la zone</Text>}
        </Pressable>
        {msg ? <Text className="mt-2 text-[12px] text-muted">{msg}</Text> : null}
      </Card>
    </View>
  );
}
