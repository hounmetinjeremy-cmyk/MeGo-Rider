import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, ScrollView, StyleSheet, Platform } from "react-native";
import { getToken, loadToken, saveToken } from "../lib/session";
import { googleAvailable, signInWithGoogle, loginWithIdToken } from "../lib/googleAuth";
import { useIdentity, setIdentity } from "../lib/identity";

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
  const [linkMode, setLinkMode] = useState(false);
  const [otherTok, setOtherTok] = useState(null);
  const identity = useIdentity();

  const isVendor = kind === "vendor";
  const otherKind = isVendor ? "rider" : "vendor";

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

  // Session de l'autre espace (vendeur <-> livreur) : permet de basculer sans redemander Google.
  useEffect(() => {
    let alive = true;
    loadToken(otherKind)
      .then((t) => {
        if (alive) setOtherTok(t || null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [otherKind]);

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
  // 1) Si l'autre espace est deja connecte (compte Google), on bascule / on cree cet espace sans redemander Google.
  // 2) Sinon, si l'utilisateur s'est deja connecte avec Google au demarrage (identity), on cree / retrouve son compte de ce role.
  const googleBusy = useRef(false);
  const google = async () => {
    if (googleBusy.current || busy) return;
    if (linkMode && (!phone.trim() || !pin.trim())) {
      setError("Numero et code secret obligatoires pour lier ton ancien compte");
      return;
    }
    googleBusy.current = true;
    setError("");
    setBusy(true);
    try {
      if (!linkMode && !identity && otherTok) {
        const r = await rpc("switch_role", { p_token: otherTok, p_kind: kind });
        if (r && r.ok === true) {
          await saveToken(kind, r.token);
          setOwner(r.owner_id);
          setState("in");
        } else {
          // l'autre espace n'est pas lie a Google, ou sa session a expire : on passera par Google au prochain appui
          setOtherTok(null);
          setError(
            r && r.code === "needs_google"
              ? "Connecte-toi avec Google pour creer cet espace."
              : "Reconnecte-toi avec Google pour continuer."
          );
        }
      } else {
        const link = linkMode ? { phone, pin } : undefined;
        const r = identity
          ? await loginWithIdToken(kind, identity.idToken, link)
          : await signInWithGoogle(kind, link);
        if (r && r.cancelled) {
          // fenetre fermee par l'utilisateur : rien a afficher
        } else if (!r || r.ok !== true) {
          if (identity && r && r.code === "invalid_token") {
            setIdentity(null); // jeton Google expire : on redemande la connexion Google
            setError("Ta connexion Google a expire : reconnecte-toi.");
          } else {
            setError((r && r.error) || "Connexion Google impossible");
          }
        } else {
          await saveToken(kind, r.token);
          setOwner(r.owner_id);
          setState("in");
        }
      }
    } catch (e) {
      setError("Connexion impossible, verifie internet");
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

  // APK : connexion Google OBLIGATOIRE avant de creer ou d'utiliser un compte vendeur / livreur.
  // Un ancien compte (telephone + code) est d'abord lie a Google, puis il ne sert plus qu'avec Google.
  if (googleAvailable) {
    const role = isVendor ? "vendeur" : "livreur";
    const switching = !linkMode && !identity && !!otherTok;
    return (
      <ScrollView style={s.screen} contentContainerStyle={s.box} keyboardShouldPersistTaps="handled">
        <Text style={s.brand}>MeGo {isVendor ? "Vendeur" : "Livreur"}</Text>
        <Text style={s.sub}>
          {linkMode
            ? "Lie ton ancien compte a Google"
            : identity
            ? "Connecte avec " + (identity.email || "Google")
            : switching
            ? "Passe d'un espace a l'autre"
            : "Connecte-toi avec Google pour continuer"}
        </Text>

        {linkMode ? (
          <>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Numero de telephone de ton ancien compte"
              keyboardType="phone-pad"
              style={s.input}
            />
            <TextInput
              value={pin}
              onChangeText={(v) => setPin(v.replace(/[^0-9]/g, ""))}
              placeholder="Code secret de ton ancien compte"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
              style={s.input}
            />
            <Text style={s.hint}>
              Une seule fois : ensuite tu te connectes uniquement avec Google, ton solde et tes commandes sont conserves.
            </Text>
          </>
        ) : (
          <Text style={s.hint}>
            {identity
              ? "Ton espace " + role + " est cree automatiquement avec ce compte Google."
              : switching
              ? "Ton espace " + role + " est cree ou retrouve avec le meme compte Google, sans te reconnecter."
              : "Pas besoin de numero ni de code : ton compte " + role + " est cree avec ton compte Google."}
          </Text>
        )}

        {error ? <Text style={s.error}>{error}</Text> : null}

        <Pressable onPress={google} disabled={busy} style={s.btn}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.btnTxt}>
              {linkMode
                ? identity || switching
                  ? "Lier et continuer"
                  : "Lier et continuer avec Google"
                : identity
                ? "Continuer en tant que " + role
                : switching
                ? "Passer en tant que " + role
                : "Continuer avec Google"}
            </Text>
          )}
        </Pressable>
        <Pressable
          onPress={() => {
            setError("");
            setLinkMode(!linkMode);
          }}
          style={{ marginTop: 16 }}
        >
          <Text style={s.link}>
            {linkMode ? "Retour" : "J'ai deja un compte (telephone + code) : le lier a Google"}
          </Text>
        </Pressable>
        {identity ? (
          <Pressable
            onPress={() => {
              setError("");
              setIdentity(null);
            }}
            style={{ marginTop: 12 }}
          >
            <Text style={s.link}>Changer de compte Google</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    );
  }

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
});
