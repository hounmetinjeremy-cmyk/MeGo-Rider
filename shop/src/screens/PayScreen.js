import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator } from "react-native";
import { money } from "../lib/shop";

// Paiement Mobile Money dans l'application : pays -> operateur -> numero -> PAYER (le client valide ensuite sur son telephone).
// Meme parcours que Chap-money (pays/operateurs FedaPay sans redirection).
const COUNTRIES = [
  { id: "bj", flag: "🇧🇯", name: "Benin", dial: "229", len: 10, ph: "01XXXXXXXX", ops: [["MTN", "mtn_open"], ["MOOV", "moov"], ["CELTIIS", "sbin"]] },
  { id: "tg", flag: "🇹🇬", name: "Togo", dial: "228", len: 8, ph: "90123456", ops: [["MOOV", "moov_tg"], ["Togocom", "togocel"]] },
  { id: "ci", flag: "🇨🇮", name: "Cote d'Ivoire", dial: "225", len: 10, ph: "0712345678", ops: [["MTN", "mtn_ci"]] },
  { id: "ne", flag: "🇳🇪", name: "Niger", dial: "227", len: 8, ph: "96123456", ops: [["Airtel", "airtel_ne"]] },
  { id: "sn", flag: "🇸🇳", name: "Senegal", dial: "221", len: 9, ph: "771234567", ops: [["Free", "free_sn"]] },
  { id: "gn", flag: "🇬🇳", name: "Guinee", dial: "224", len: 9, ph: "621234567", ops: [["MTN", "mtn_open_gn"]] },
];

export default function PayScreen({ order, sandbox, onPay, onCancel }) {
  const [cid, setCid] = useState("bj");
  const [op, setOp] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const country = COUNTRIES.find((c) => c.id === cid) || COUNTRIES[0];
  const ops = sandbox ? [...country.ops, ["Momo Test", "momo_test"]] : country.ops;

  const submit = async () => {
    setError("");
    let clean = phone.replace(/\D/g, "");
    if (clean.startsWith(country.dial) && clean.length > country.len) clean = clean.slice(country.dial.length);
    if (!op) return setError("Choisis ton operateur");
    if (clean.length !== country.len) return setError("Le numero doit avoir " + country.len + " chiffres (ex : " + country.ph + ")");
    setBusy(true);
    const r = await onPay({ country: country.id, operator: op, phone: clean });
    setBusy(false);
    if (r && r.ok === false) setError(r.error || "Paiement impossible");
  };

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View className="rounded-2xl bg-navy p-5">
        <Text className="text-[12px] text-white">Montant a payer</Text>
        <Text className="mt-1 text-[28px] font-extrabold text-white">{money(order ? order.total : 0)}</Text>
        {order && order.code ? <Text className="mt-1 text-[12px] text-white">Commande {order.code}</Text> : null}
      </View>

      <View className="mt-4 rounded-2xl bg-white p-4">
        <Text className="text-[13px] font-bold text-ink">1. Ton pays</Text>
        <View className="mt-2 flex-row flex-wrap">
          {COUNTRIES.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => { setCid(c.id); setOp(""); setPhone(""); }}
              className={`mb-2 mr-2 rounded-xl border px-3 py-2 ${cid === c.id ? "border-primary bg-primary-soft" : "border-line bg-white"}`}
            >
              <Text className="text-[13px] font-semibold text-ink">{c.flag} +{c.dial}</Text>
            </Pressable>
          ))}
        </View>

        <Text className="mt-3 text-[13px] font-bold text-ink">2. Ton operateur</Text>
        <View className="mt-2 flex-row flex-wrap">
          {ops.map(([label, mode]) => (
            <Pressable
              key={mode}
              onPress={() => setOp(mode)}
              className={`mb-2 mr-2 rounded-xl border px-4 py-3 ${op === mode ? "border-primary bg-primary" : "border-line bg-white"}`}
            >
              <Text className={`text-[13px] font-bold ${op === mode ? "text-white" : "text-ink"}`}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <Text className="mt-3 text-[13px] font-bold text-ink">3. Ton numero Mobile Money</Text>
        <View className="mt-2 flex-row items-center rounded-xl border border-line bg-white">
          <Text className="px-3 text-[14px] font-semibold text-ink">{country.flag} +{country.dial}</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder={country.ph}
            keyboardType="phone-pad"
            className="flex-1 py-3 pr-3 text-[15px] text-ink"
          />
        </View>

        {error ? <Text className="mt-3 text-[12px] text-red-600">{error}</Text> : null}

        <Pressable onPress={submit} disabled={busy} className="mt-4 items-center rounded-full bg-primary py-4 active:opacity-80">
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-[16px] font-extrabold text-white">PAYER</Text>}
        </Pressable>
        <Text className="mt-2 text-center text-[11px] text-muted">
          Tu recevras une demande sur ton telephone : valide-la avec ton code Mobile Money. Securise par FedaPay.
        </Text>
      </View>

      {onCancel ? (
        <Pressable onPress={onCancel} className="mt-3 items-center py-2 active:opacity-70">
          <Text className="text-[13px] text-muted">Annuler</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}
