import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

import RiderApp from "./App";
import VendorApp from "./vendor/App";
import RoleSelect from "./src/screens/RoleSelect";
import GoogleGate from "./src/screens/GoogleGate";
import { googleAvailable, googleIdentity } from "./src/lib/googleAuth";
import { getIdentity } from "./src/lib/identity";
import { loadToken } from "./src/lib/session";

// Verification LOCALE seulement (aucun appel reseau) : l'ecran Google s'affiche tout de suite.
// Un compte deja connecte n'a pas a se reconnecter avec Google ; chaque espace reverifie sa session au moment d'y entrer.
async function hasLocalSession() {
  for (const kind of ["rider", "vendor"]) {
    try {
      if (await loadToken(kind)) return true;
    } catch (e) {}
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
      const ok = await hasLocalSession();
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
    return <View style={styles.blank} />;
  }

  if (step === "google") {
    return <GoogleGate onPress={connect} busy={busy} error={error} />;
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
  blank: { flex: 1, backgroundColor: "#FFFFFF" },
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
