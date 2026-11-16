import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, TextInput, ActivityIndicator, StyleSheet } from "react-native";

// Abonnement de l'assistant IA de la boutique (500 FCFA / mois par defaut), paye en Mobile Money dans l'application.
const API = "https://mprusmdpirucpcwqssfg.supabase.co";
const KEY = "sb_publishable_OqgLY_ICZBtu1-C_yN_hCA_J4U2zluA";
const headers = { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json" };
const rpc = (n, b) => fetch(API + "/rest/v1/rpc/" + n, { method: "POST", headers, body: JSON.stringify(b || {}) }).then((r) => r.json());

const COUNTRIES = [
  { id: "bj", flag: "🇧🇯", dial: "229", len: 10, ph: "01XXXXXXXX", ops: [["MTN", "mtn_open"], ["MOOV", "moov"], ["CELTIIS", "sbin"]] },
  { id: "tg", flag: "🇹🇬", dial: "228", len: 8, ph: "90123456", ops: [["MOOV", "moov_tg"], ["Togocom", "togocel"]] },
  { id: "ci", flag: "🇨🇮", dial: "225", len: 10, ph: "0712345678", ops: [["MTN", "mtn_ci"]] },
  { id: "ne", flag: "🇳🇪", dial: "227", len: 8, ph: "96123456", ops: [["Airtel", "airtel_ne"]] },
  { id: "sn", flag: "🇸🇳", dial: "221", len: 9, ph: "771234567", ops: [["Free", "free_sn"]] },
  { id: "gn", flag: "🇬🇳", dial: "224", len: 9, ph: "621234567", ops: [["MTN", "mtn_open_gn"]] },
];

const token = () => {
  try {
    return localStorage.getItem("mego_session_vendor");
  } catch (e) {
    return null;
  }
};

export default function AiAssistantCard() {
  const [st, setSt] = useState(null);
  const [cfg, setCfg] = useState({});
  const [cid, setCid] = useState("bj");
  const [op, setOp] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    try {
      const t = token();
      if (!t) return;
      const [s, c] = await Promise.all([rpc("get_ai_status", { p_token: t }), rpc("get_payment_config")]);
      if (s && s.ok) setSt(s);
      setCfg(c || {});
    } catch (e) {}
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!st) return null;
  const country = COUNTRIES.find((c) => c.id === cid) || COUNTRIES[0];
  const ops = cfg.sandbox ? [...country.ops, ["Momo Test", "momo_test"]] : country.ops;
  const until = st.expires_at ? new Date(st.expires_at).toLocaleDateString("fr-FR") : null;

  const testActivate = async () => {
    setBusy(true);
    const r = await rpc("test_activate_ai", { p_token: token() });
    setBusy(false);
    setMsg(r && r.ok ? "Assistant active (test) pour 30 jours." : (r && r.error) || "Echec");
    load();
  };

  const pay = async () => {
    setMsg("");
    let clean = phone.replace(/\D/g, "");
    if (clean.startsWith(country.dial) && clean.length > country.len) clean = clean.slice(country.dial.length);
    if (!op) return setMsg("Choisis ton operateur");
    if (clean.length !== country.len) return setMsg("Le numero doit avoir " + country.len + " chiffres (ex : " + country.ph + ")");
    if (!cfg.server) return setMsg("Paiement non configure");
    setBusy(true);
    try {
      const r = await fetch(cfg.server.replace(/\/+$/, "") + "/ai-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token(), country: country.id, operator: op, phone: clean }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) setMsg(d.error || "Paiement impossible");
      else {
        setMsg("Valide la demande sur ton telephone. L'assistant s'active tout seul des que le paiement est confirme.");
        setShowForm(false);
        let n = 0;
        const i = setInterval(() => {
          load();
          if (++n > 12) clearInterval(i);
        }, 10000);
      }
    } catch (e) {
      setMsg("Connexion impossible");
    }
    setBusy(false);
  };

  const testMode = cfg.test === true;
  return (
    <View style={s.card}>
      <Text style={s.title}>Assistant IA de ma boutique</Text>
      <Text style={s.sub}>
        {st.enabled
          ? "Actif jusqu'au " + until + ". Tes clients peuvent poser leurs questions sur tes produits."
          : "Un assistant repond aux questions de tes clients sur tes produits et tes prix. " + Number(st.price).toLocaleString("fr-FR") + " FCFA / mois."}
      </Text>

      {testMode ? (
        <Pressable onPress={testActivate} disabled={busy} style={s.btn}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>{st.enabled ? "Prolonger de 30 jours (test)" : "Activer (test)"}</Text>}
        </Pressable>
      ) : showForm ? (
        <View>
          <View style={s.row}>
            {COUNTRIES.map((c) => (
              <Pressable key={c.id} onPress={() => { setCid(c.id); setOp(""); setPhone(""); }} style={[s.chip, cid === c.id && s.chipOn]}>
                <Text style={s.chipTxt}>{c.flag} +{c.dial}</Text>
              </Pressable>
            ))}
          </View>
          <View style={s.row}>
            {ops.map(([label, mode]) => (
              <Pressable key={mode} onPress={() => setOp(mode)} style={[s.chip, op === mode && s.chipOn]}>
                <Text style={[s.chipTxt, op === mode && { color: "#fff" }]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput value={phone} onChangeText={setPhone} placeholder={country.ph} keyboardType="phone-pad" style={s.input} />
          <Pressable onPress={pay} disabled={busy} style={s.btn}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Payer {Number(st.price).toLocaleString("fr-FR")} FCFA</Text>}
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={() => setShowForm(true)} style={s.btn}>
          <Text style={s.btnTxt}>{st.enabled ? "Renouveler" : "Activer l'assistant IA"}</Text>
        </Pressable>
      )}
      {msg ? <Text style={s.msg}>{msg}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: "#E5E7EB" },
  title: { fontSize: 15, fontWeight: "700", color: "#111827" },
  sub: { fontSize: 12, color: "#6B7280", marginTop: 4, marginBottom: 10, lineHeight: 17 },
  row: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  chip: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginRight: 6, marginBottom: 6 },
  chipOn: { backgroundColor: "#0a7d4b", borderColor: "#0a7d4b" },
  chipTxt: { fontSize: 12, fontWeight: "700", color: "#111827" },
  input: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, fontSize: 14 },
  btn: { backgroundColor: "#0a7d4b", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  btnTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },
  msg: { fontSize: 12, color: "#6B7280", marginTop: 8 },
});
