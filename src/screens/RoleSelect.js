import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";

export default function RoleSelect({ onSelect }) {
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>MeGo</Text>
        <Text style={styles.subtitle}>Choisis ton espace</Text>

        <Pressable
          style={({ pressed }) => [styles.card, styles.rider, pressed && styles.pressed]}
          onPress={() => onSelect("rider")}
        >
          <Text style={styles.icon}>🛵</Text>
          <Text style={styles.cardTitle}>Rider</Text>
          <Text style={styles.cardDesc}>Livraisons, GPS et courses</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.card, styles.vendor, pressed && styles.pressed]}
          onPress={() => onSelect("vendor")}
        >
          <Text style={styles.icon}>🏪</Text>
          <Text style={styles.cardTitle}>Vendor</Text>
          <Text style={styles.cardDesc}>Boutique, produits et commandes</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0B1220" },
  content: { flexGrow: 1, justifyContent: "center", padding: 24 },
  title: {
    color: "#FFFFFF",
    fontSize: 40,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 1,
  },
  subtitle: {
    color: "#9AA5B1",
    fontSize: 15,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 32,
  },
  card: {
    borderRadius: 18,
    padding: 22,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  rider: { backgroundColor: "#0F2A1F" },
  vendor: { backgroundColor: "#1B1F3B" },
  pressed: { opacity: 0.75 },
  icon: { fontSize: 30, marginBottom: 8 },
  cardTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "700" },
  cardDesc: { color: "#B7C0CC", fontSize: 13, marginTop: 4 },
});
