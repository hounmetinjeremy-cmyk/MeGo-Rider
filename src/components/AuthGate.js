import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, ScrollView, StyleSheet, Platform } from "react-native";
import { getToken, loadToken, saveToken } from "../lib/session";
import { googleAvailable, signInWithGoogle } from "../lib/googleAuth";

// Connexion / inscription par numero de telephone + code secret (4 a 8 chiffres).
// Chaque vendeur et chaque livreur a son propre compte : plus de "premier de la table".
const API = "https://mprusmdpirucpcwqssfg.supabase.co";
const KEY = "sb_publishable_OqgLY_ICZBtu1-C_yN_hCA_J4U2zluA";

// GPS du telephone (APK / iOS). Absent = on retombe sur le navigateur.
let Location = null;
try {
  Location = require("expo-location");
} catch (e) {
  Location = null;
}

async function rpc(name, body) {
  const r = await fetch(API + "/rest/v1/rpc/" + name, {
    method: "POST",
    headers: { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  return r.json();
}

const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(null), ms))]);

// Position de la boutique a l'inscription du vendeur.
// APK / iOS : GPS du telephone (navigator.geolocation n'est pas fiable sur mobile).
async function getPosition() {
  const none = { lat: null, lng: null };
  try {
    if (Platform.OS !== "web") {
      if (!Location) return none;
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") return none;
      let p = await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        12000
      );
      if (!p) p = await Location.getLastKnownPositionAsync();
      return p ? { lat: p.coords.latitude, lng: p.coords.longitude } : none;
    }
    return await new Promise((resolve) => {
      try {
        if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(none);
        navigator.geolocation.getCurrentPosition(
          (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
          () => resolve(none),
          { timeout: 8000, maximumAge: 0, enableHighAccuracy: true }
        );
      } catch (e) {
        resolve(none);
      }
    });
  } catch (e) {
    return none;
  }
}

/** children(ownerId, logout) est appele une fois connecte. kind = "vendor" ou "rider". */
export default function AuthGate({ kind, children }) {
  const [state, setState] = useState("loading");
  const [owner, setOwner] = useState(null);
  const [mode, setMode] = useState("login");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isVendor = kind === "vendor";

  useEffect(() => {
    let alive = true;
    (async () => {
      const t = await loadToken(kind);
      if (!t) {
        if (alive) setState("out");
        return;
      }
      try {
        const r = await rpc("session_info", { p_token: t });
        if (!alive) return;
        if (r && r.ok && r.kind === kind) {
          setOwner(r.owner_id);
          setState("in");
        } else {
          await saveToken(kind, null);
          setState("out");
        }
      } catch (e) {
        if (alive) setState("out");
      }
    })();
    return () => {
      alive = false;
    };
  }, [kind]);

  const logout = useCallback(async () => {
    const t = getToken(kind);
    await saveToken(kind, null);
    setOwner(null);
    setPin("");
    setState("out");
    if (t) rpc("logout_account", { p_token: t }).catch(() => {});
  }, [kind]);

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      let r;
      if (mode === "login") {
        r = await rpc("login_account", { p_kind: kind, p_phone: phone, p_pin: pin });
      } else {
        const pos = isVendor ? await getPosition() : { lat: null, lng: null };
        r = await rpc("register_account", {
          p_kind: kind,
          p_phone: phone,
          p_pin: pin,
          p_name: name,
          p_lat: pos.lat,
          p_lng: pos.lng,
          p_address: address || null,
        });
      }
      if (!r || r.ok === false) {
        setError((r && r.error) || "Echec, reessaie");
      } else {
        await saveToken(kind, r.token);
        setOwner(r.owner_id);
        setState("in");
      }
    } catch (e) {
      setError("Connexion impossible, verifie internet");
    }
    setBusy(false);
  };

  // Connexion Google (APK) : un seul appel a la fois, jamais de nouvelle tentative automatique.
  const googleBusy = useRef(false);
  const google = async () => {
    if (googleBusy.current || busy) return;
    googleBusy.current = true;
    setError("");
    setBusy(true);
    try {
      const r = await signInWithGoogle(kind);
      if (r && r.cancelled) {
        // fenetre fermee par l'utilisateur : rien a afficher
      } else if (!r || r.ok !== true) {
        setError((r && r.error) || "Connexion Google impossible");
      } else {
        await saveToken(kind, r.token);
        setOwner(r.owner_id);
        setState("in");
      }
    } catch (e) {
      setError("Connexion Google impossible");
    }
    setBusy(false);
    googleBusy.current = false;
  };

  if (state === "loading") {
    return (
      <View style={[s.screen, { justifyContent: "center" }]}>
        <ActivityIndicator color="#0a7d4b" size="large" />
      </View>
    );
  }
  if (state === "in") return children(owner, logout);

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.box} keyboardShouldPersistTaps="handled">
      <Text style={s.brand}>MeGo {isVendor ? "Vendeur" : "Livreur"}</Text>
      <Text style={s.sub}>{mode === "login" ? "Connecte-toi" : "Cree ton compte"}</Text>

      {mode === "register" ? (
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={isVendor ? "Nom de la boutique" : "Ton nom complet"}
          style={s.input}
        />
      ) : null}
      <TextInput
        value={phone}
        onChangeText={setPhone}
        placeholder="Numero de telephone (ex : +22997000000)"
        keyboardType="phone-pad"
        style={s.input}
      />
      <TextInput
        value={pin}
        onChangeText={(v) => setPin(v.replace(/[^0-9]/g, ""))}
        placeholder="Code secret (4 a 8 chiffres)"
        keyboardType="number-pad"
        secureTextEntry
        maxLength={8}
        style={s.input}
      />
      {mode === "register" && isVendor ? (
        <>
          <TextInput value={address} onChangeText={setAddress} placeholder="Adresse de la boutique (quartier, ville)" style={s.input} />
          <Text style={s.hint}>
            Autorise la localisation quand elle est demandee : les livreurs s'en servent pour trouver ta boutique.
          </Text>
        </>
      ) : null}

      {error ? <Text style={s.error}>{error}</Text> : null}

      <Pressable onPress={submit} disabled={busy} style={s.btn}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>{mode === "login" ? "Se connecter" : "Creer mon compte"}</Text>}
      </Pressable>
      {googleAvailable ? (
        <Pressable onPress={google} disabled={busy} style={s.gbtn}>
          <Text style={s.gbtnTxt}>Continuer avec Google</Text>
        </Pressable>
      ) : null}
      <Pressable onPress={() => { setError(""); setMode(mode === "login" ? "register" : "login"); }} style={{ marginTop: 16 }}>
        <Text style={s.link}>{mode === "login" ? "Pas de compte ? Creer un compte" : "J'ai deja un compte : me connecter"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f4f4f2" },
  box: { padding: 24, paddingTop: 64 },
  brand: { fontSize: 28, fontWeight: "800", color: "#0a7d4b", textAlign: "center" },
  sub: { fontSize: 15, color: "#6b6b6b", textAlign: "center", marginTop: 4, marginBottom: 24 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#ddd", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12, fontSize: 15 },
  hint: { fontSize: 12, color: "#6b6b6b", marginBottom: 12 },
  error: { color: "#c0392b", marginBottom: 12, fontSize: 13 },
  btn: { backgroundColor: "#0a7d4b", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  btnTxt: { color: "#fff", fontWeight: "700", fontSize: 15 },
  link: { color: "#0a7d4b", textAlign: "center", fontWeight: "600" },
  gbtn: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#dadce0", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 12 },
  gbtnTxt: { color: "#1a1a1a", fontWeight: "700", fontSize: 15 },
});
