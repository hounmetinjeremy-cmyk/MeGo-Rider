import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";

import RiderApp from "./App";
import VendorApp from "./vendor/App";
import RoleSelect from "./src/screens/RoleSelect";
import { googleAvailable, googleIdentity } from "./src/lib/googleAuth";
import { getIdentity } from "./src/lib/identity";
import { loadToken } from "./src/lib/session";

const API = "https://mprusmdpirucpcwqssfg.supabase.co";
const KEY = "sb_publishable_OqgLY_ICZBtu1-C_yN_hCA_J4U2zluA";

// Un compte deja connecte (jeton enregistre et encore valide) n'a pas a se reconnecter avec Google a chaque ouverture.
async function hasValidSession() {
  for (const kind of ["rider", "vendor"]) {
    let t = null;
    try {
      t = await loadToken(kind);
    } catch (e) {}
    if (!t) continue;
    try {
      const r = await fetch(API + "/rest/v1/rpc/session_info", {
        method: "POST",
        headers: { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ p_token: t }),
      }).then((x) => x.json());
      if (r && r.ok && r.kind === kind) return true;
    } catch (e) {
      return true; // pas de reseau : on laisse entrer, chaque espace reverifie sa session
    }
  }
  return false;
}

// Ordre voulu : 1) connexion Google, 2) choix Vendeur / Livreur, 3) application du role.
// Sur le web (pas de Google), on passe directement au choix du role.
export default function AppShell() {
  const [role, setRole] = useState(null);
  const [step, setStep] = useState(googleAvailable ? "boot" : "role");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!googleAvailable) return undefined;
    let alive = true;
    (async () => {
      // Identite deja choisie dans cette session, ou compte deja connecte : on ne redemande pas Google.
      if (getIdentity()) {
        if (alive) setStep("role");
        return;
      }
      const ok = await hasValidSession();
      if (alive) setStep(ok ? "role" : "google");
    })();
    return () => {
      alive = false;
    };
  }, []);

  const connect = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await googleIdentity();
      if (r && r.ok) {
        setStep("role");
      } else if (!r || !r.cancelled) {
        setError((r && r.error) || "Connexion Google impossible");
      }
    } catch (e) {
      setError("Connexion Google impossible");
    }
    setBusy(false);
  }, [busy]);

  const selectRole = useCallback((next) => {
    setRole(next);
  }, []);

  const switchRole = useCallback(() => {
    setRole(null);
  }, []);

  if (step === "boot") {
    return (
      <View style={styles.gate}>
        <ActivityIndicator color="#FFFFFF" size="large" />
      </View>
    );
  }

  if (step === "google") {
    return (
      <View style={styles.gate}>
        <Text style={styles.title}>MeGo</Text>
        <Text style={styles.sub}>Connecte-toi avec Google pour continuer</Text>
        <Pressable onPress={connect} disabled={busy} style={[styles.btn, busy && styles.btnOff]}>
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.btnTxt}>Continuer avec Google</Text>
          )}
        </Pressable>
        {error ? <Text style={styles.err}>{error}</Text> : null}
      </View>
    );
  }

  if (!role) {
    return <RoleSelect onSelect={selectRole} />;
  }

  return (
    <View style={styles.root}>
      {role === "vendor" ? <VendorApp /> : <RiderApp />}
      <Pressable style={styles.switchBtn} onPress={switchRole} hitSlop={10}>
        <Text style={styles.switchTxt}>⇄</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  gate: {
    flex: 1,
    backgroundColor: "#0B1220",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: { color: "#FFFFFF", fontSize: 40, fontWeight: "800" },
  sub: { color: "#B7C0CC", fontSize: 15, marginTop: 8, textAlign: "center" },
  btn: {
    marginTop: 24,
    backgroundColor: "#0a7d4b",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    minWidth: 240,
    alignItems: "center",
  },
  btnOff: { opacity: 0.6 },
  btnTxt: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  err: { color: "#FF6B6B", fontSize: 13, marginTop: 14, textAlign: "center" },
  switchBtn: {
    position: "absolute",
    top: 44,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  switchTxt: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
