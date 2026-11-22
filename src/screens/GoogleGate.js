import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, StatusBar } from "react-native";

// Ecran d'accueil de l'APK : connexion Google (fond blanc). Affiche ce que MeGo permet de faire et un seul bouton.
const GREEN = "#0a7d4b";
const INK = "#0B1220";
const MUTED = "#5B6675";

const FEATURES = [
  { icon: "🏪", title: "Ouvre ta boutique", desc: "Publie tes produits et reçois des commandes." },
  { icon: "🛵", title: "Deviens livreur", desc: "Accepte des courses près de toi et gagne de l'argent." },
  { icon: "🔒", title: "Paiements sécurisés", desc: "Mobile Money : l'argent est bloqué jusqu'à la livraison." },
];

export default function GoogleGate({ onPress, busy, error }) {
  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <View style={s.logo}>
            <Text style={s.logoTxt}>M</Text>
          </View>
          <Text style={s.brand}>MeGo</Text>
          <Text style={s.tagline}>Vends. Livre. Gagne.</Text>
        </View>

        <Text style={s.h1}>Bienvenue 👋</Text>
        <Text style={s.lead}>
          Crée ton espace vendeur ou livreur en quelques secondes avec ton compte Google.
        </Text>

        <View style={s.cards}>
          {FEATURES.map((f) => (
            <View key={f.title} style={s.card}>
              <View style={s.iconWrap}>
                <Text style={s.icon}>{f.icon}</Text>
              </View>
              <View style={s.cardBody}>
                <Text style={s.cardTitle}>{f.title}</Text>
                <Text style={s.cardDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={s.footer}>
        {error ? <Text style={s.err}>{error}</Text> : null}
        <Pressable
          onPress={onPress}
          disabled={busy}
          style={({ pressed }) => [s.gbtn, (pressed || busy) && s.gbtnOn]}
        >
          {busy ? (
            <ActivityIndicator color={GREEN} />
          ) : (
            <>
              <View style={s.gIcon}>
                <Text style={s.gLetter}>G</Text>
              </View>
              <Text style={s.gTxt}>Continuer avec Google</Text>
            </>
          )}
        </Pressable>
        <Text style={s.legal}>🔒 On accède seulement à ton nom et à ton e-mail.</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 16 },
  hero: { alignItems: "center", marginBottom: 28 },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  logoTxt: { color: "#FFFFFF", fontSize: 40, fontWeight: "800" },
  brand: { color: INK, fontSize: 34, fontWeight: "800", marginTop: 14, letterSpacing: 0.5 },
  tagline: { color: GREEN, fontSize: 15, fontWeight: "700", marginTop: 4 },
  h1: { color: INK, fontSize: 24, fontWeight: "800", textAlign: "center" },
  lead: { color: MUTED, fontSize: 15, lineHeight: 22, textAlign: "center", marginTop: 8, marginBottom: 24 },
  cards: { marginTop: 4 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F6F8FA",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#E4F4EA",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  icon: { fontSize: 22 },
  cardBody: { flex: 1 },
  cardTitle: { color: INK, fontSize: 15, fontWeight: "700" },
  cardDesc: { color: MUTED, fontSize: 13, marginTop: 2, lineHeight: 18 },
  footer: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 28, backgroundColor: "#FFFFFF" },
  err: { color: "#C0392B", fontSize: 13, textAlign: "center", marginBottom: 12 },
  gbtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#DADCE0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  gbtnOn: { opacity: 0.7 },
  gIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  gLetter: { color: "#4285F4", fontSize: 21, fontWeight: "800" },
  gTxt: { color: INK, fontSize: 16, fontWeight: "700" },
  legal: { color: MUTED, fontSize: 12, textAlign: "center", marginTop: 14 },
});
