import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator } from "react-native";
import Icon from "../components/Icon";
import { money } from "../lib/shop";
import { supabase } from "../lib/supabaseClient";
import { GoogleButton } from "../lib/googleWeb";

// Defini HORS de l'ecran : un composant declare dans un autre est recree a chaque frappe,
// ce qui fait perdre le focus au champ et fermer le clavier.
function Field({ label, value, set, placeholder, keyboard, multiline }) {
  return (
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
}

// Position GPS du client : sert a calculer automatiquement les frais de livraison
// (distance entre la boutique et le client).
function getPosition() {
  return new Promise((resolve) => {
    const none = { lat: null, lng: null };
    try {
      if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(none);
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(none),
        { timeout: 8000, maximumAge: 60000 }
      );
    } catch (e) {
      resolve(none);
    }
  });
}

export default function CheckoutScreen({ shop, cart, onBack, onPlaced, needGoogle, onGoogleToken }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [zoneId, setZoneId] = useState("");
  const zones = (shop && shop.zones) || [];
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [gErr, setGErr] = useState("");
  const [gBusy, setGBusy] = useState(false);
  const [quote, setQuote] = useState(null);
  const [quoteBusy, setQuoteBusy] = useState(true);
  const [quoteErr, setQuoteErr] = useState("");
  const slug = (shop && shop.vendor && shop.vendor.slug) || "";
  const products = shop.products || [];
  const lines = products.filter((p) => cart[p.id]);
  const subtotal = lines.reduce((a, p) => a + cart[p.id] * Number(p.price || 0), 0);
  const zone = zones.find((z) => z.id === zoneId);
  // Livraison : calculee automatiquement par le GPS ; a defaut (pas de GPS) zone choisie ou frais par defaut.
  const fee = quote ? quote.fee : zone ? Number(zone.fee || 0) : Number(shop.delivery_fee || 0);
  const total = subtotal + fee;
  const showZones = !quote && !quoteBusy && zones.length > 0;

  const calcFee = async () => {
    setQuoteBusy(true);
    setQuoteErr("");
    const pos = await getPosition();
    if (pos.lat == null || pos.lng == null) {
      setQuote(null);
      setQuoteErr("Position GPS indisponible : active la localisation de ton telephone.");
      setQuoteBusy(false);
      return;
    }
    try {
      const { data, error } = await supabase.rpc("quote_delivery", { p_slug: slug, p_lat: pos.lat, p_lng: pos.lng });
      if (error || !data || data.ok !== true) {
        setQuote(null);
        setQuoteErr((data && data.error) || (error && error.message) || "Calcul de la livraison impossible");
      } else {
        setQuote({ fee: Number(data.fee || 0), km: Number(data.distance_km || 0) });
      }
    } catch (e) {
      setQuote(null);
      setQuoteErr("Calcul de la livraison impossible");
    }
    setQuoteBusy(false);
  };

  useEffect(() => {
    calcFee();
  }, [slug]);

  useEffect(() => {
    if (!zoneId && zones.length === 1) setZoneId(zones[0].id);
  }, [zones.length]);

  // Lien web : connexion Google avant la validation finale, pour rattacher la commande au client.
  const onToken = async (credential) => {
    setGErr("");
    setGBusy(true);
    const r = onGoogleToken ? await onGoogleToken(credential) : null;
    setGBusy(false);
    if (!r || r.ok !== true) setGErr((r && r.error) || "Connexion Google impossible");
  };

  const submit = async () => {
    if (needGoogle) {
      setErr("Connecte-toi avec Google pour valider ta commande.");
      return;
    }
    if (quoteBusy) {
      setErr("Calcul de la livraison en cours, patiente un instant.");
      return;
    }
    if (!quote && zones.length > 0 && !zoneId) {
      setErr("Active ta position GPS ou choisis ta zone de livraison.");
      return;
    }
    if (!name.trim() || !phone.trim() || !address.trim()) {
      setErr("Nom, telephone et adresse sont obligatoires.");
      return;
    }
    setBusy(true);
    setErr("");
    const res = await onPlaced({ name, phone, address, note, zoneId });
    setBusy(false);
    if (!res || res.ok === false) setErr((res && res.error) || "Commande impossible");
  };

  return (
    <View className="flex-1 bg-surface">
      <View className="flex-row items-center bg-navy px-4 py-4">
        <Pressable onPress={onBack} className="mr-3 active:opacity-70">
          <Icon name="chevronRight" size={20} color="#FFFFFF" />
        </Pressable>
        <Text className="text-[16px] font-bold text-white">Ma commande</Text>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
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
              <Text className="text-[13px] text-ink">{quoteBusy ? "..." : money(fee)}</Text>
            </View>
            <View className="mt-1 flex-row justify-between">
              <Text className="text-[14px] font-bold text-ink">Total</Text>
              <Text className="text-[14px] font-extrabold text-primary">{money(total)}</Text>
            </View>
          </View>
        </View>

        <View className="rounded-2xl bg-white p-4">
          <Text className="mb-2 text-[13px] font-bold text-ink">Livraison</Text>
          <View className="mb-3 rounded-xl bg-surface p-3">
            {quoteBusy ? (
              <View className="flex-row items-center">
                <ActivityIndicator color="#76D865" />
                <Text className="ml-2 text-[12px] text-muted">Calcul de la livraison avec ta position...</Text>
              </View>
            ) : quote ? (
              <Text className="text-[13px] font-semibold text-ink">
                Livraison calculee : {money(quote.fee)} ({quote.km.toLocaleString("fr-FR")} km)
              </Text>
            ) : (
              <View>
                <Text className="text-[12px] text-red-500">{quoteErr}</Text>
                <Pressable onPress={calcFee} className="mt-2 self-start rounded-full bg-navy px-3 py-1.5 active:opacity-80">
                  <Text className="text-[12px] font-bold text-white">Reessayer avec ma position</Text>
                </Pressable>
              </View>
            )}
          </View>
          {showZones && (
            <View className="mb-3">
              <Text className="mb-2 text-[12px] font-bold text-muted">Zone de livraison</Text>
              <View className="flex-row flex-wrap">
                {zones.map((z) => (
                  <Pressable key={z.id} onPress={() => setZoneId(z.id)} className={"mb-2 mr-2 rounded-full px-3 py-1.5 " + (zoneId === z.id ? "bg-navy" : "bg-slate-100")}>
                    <Text className={"text-[12px] font-bold " + (zoneId === z.id ? "text-white" : "text-ink")}>{z.name} - {z.fee} F</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
          <Field label="Nom" value={name} set={setName} placeholder="Ton nom" />
          <Field label="Telephone" value={phone} set={setPhone} placeholder="+229 ..." keyboard="phone-pad" />
          <Field label="Adresse" value={address} set={setAddress} placeholder="Quartier, repere" multiline />
          <Field label="Note (optionnel)" value={note} set={setNote} placeholder="Sans piment..." multiline />
        </View>

        {needGoogle ? (
          <View className="mt-3 rounded-2xl bg-white p-4">
            <Text className="mb-1 text-[13px] font-bold text-ink">Connexion requise</Text>
            <Text className="mb-3 text-[12px] text-muted">
              Connecte-toi avec Google pour valider ta commande. Elle sera rattachee a ton compte.
            </Text>
            {gBusy ? <ActivityIndicator color="#76D865" /> : <GoogleButton onToken={onToken} onError={setGErr} />}
            {gErr ? <Text className="mt-2 text-[12px] text-red-500">{gErr}</Text> : null}
          </View>
        ) : null}

        {err ? <Text className="mt-3 text-[13px] font-semibold text-red-500">{err}</Text> : null}

        <Pressable
          onPress={submit}
          disabled={busy || !!needGoogle}
          className={"mt-4 flex-row items-center justify-center rounded-2xl bg-primary py-3.5 active:opacity-80" + (needGoogle ? " opacity-50" : "")}>
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
