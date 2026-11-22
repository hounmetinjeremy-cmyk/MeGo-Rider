import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, StatusBar } from "react-native";

// Choix de l'espace apres la connexion Google, comme la creation d'une page : boutique (vendeur) ou livreur.
// Styles STATIQUES (pas de fonction dans `style`) : avec NativeWind, un style en fonction est ignore.
const GREEN = "#0a7d4b";
const INK = "#0B1220";
const MUTED = "#5B6675";

const ROLES = [
  {
    key: "vendor",
    icon: "🏪",
    title: "Vendeur",
    desc: "Crée ta boutique, publie tes produits et gère tes commandes.",
    cta: "Créer ma boutique",
  },
  {
    key: "rider",
    icon: "🛵",
    title: "Livreur",
    desc: "Accepte des courses, suis le GPS et gagne de l'argent.",
    cta: "Devenir livreur",
  },
];

export default function RoleSelect({ onSelect }) {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.logo}>
          <Text style={styles.logoTxt}>M</Text>
        </View>
        <Text style={styles.title}>Choisis ton espace</Text>
        <Text style={styles.subtitle}>
          Tu peux créer les deux et passer de l'un à l'autre quand tu veux.
        </Text>

        {ROLES.map((r) => (
          <Pressable
            key={r.key}
            style={styles.card}
            android_ripple={{ color: "#D9EFE2" }}
            onPress={() => onSelect(r.key)}
          >
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>{r.icon}</Text>
            </View>
            <View style={styles.body}>
              <Text style={styles.cardTitle}>{r.title}</Text>
              <Text style={styles.cardDesc}>{r.desc}</Text>
              <Text style={styles.cta}>{r.cta} →</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 32 },
  logo: {
    alignSelf: "center",
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },
  logoTxt: { color: "#FFFFFF", fontSize: 34, fontWeight: "800" },
  title: { color: INK, fontSize: 26, fontWeight: "800", textAlign: "center", marginTop: 18 },
  subtitle: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 28,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F6F8FA",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E3E8EE",
    padding: 16,
    marginBottom: 14,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E4F4EA",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  icon: { fontSize: 28 },
  body: { flex: 1 },
  cardTitle: { color: INK, fontSize: 18, fontWeight: "800" },
  cardDesc: { color: MUTED, fontSize: 13, lineHeight: 18, marginTop: 3 },
  cta: { color: GREEN, fontSize: 14, fontWeight: "700", marginTop: 8 },
});
