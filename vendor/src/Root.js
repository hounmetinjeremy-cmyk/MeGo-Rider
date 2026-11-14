import React, { useState } from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import App from "../App";
import MarketplaceScreen from "./screens/MarketplaceScreen";

// Enveloppe l'application : ajoute l'acces a la Marketplace (flux social des boutiques)
// pour les vendeurs. Le bouton flottant est visible sur tous les ecrans.
const ROLE = "Vendeur";

export default function Root() {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ flex: 1 }}>
      <App />
      <Pressable onPress={() => setOpen(true)} style={s.fab}>
        <Text style={s.fabTxt}>🛍️ Marketplace</Text>
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <MarketplaceScreen role={ROLE} onClose={() => setOpen(false)} />
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  fab: { position: "absolute", right: 14, bottom: 92, zIndex: 50, backgroundColor: "#0a7d4b", borderRadius: 24, paddingHorizontal: 14, paddingVertical: 10, elevation: 6 },
  fabTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
