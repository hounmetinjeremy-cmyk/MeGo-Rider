import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import WalletPanel from "../components/WalletPanel";

// Ecran "Mon portefeuille" : ouvrir son portefeuille, y deposer de l'argent par Mobile Money et voir son solde.
// Accessible a tout le monde (client, vendeur, livreur, visiteur venu d'un lien partage).
export default function WalletScreen({ sandbox, onBack }) {
  return (
    <View className="flex-1 bg-surface">
      <View className="flex-row items-center bg-navy px-4 py-4">
        <Pressable onPress={onBack} className="mr-3 rounded-full bg-white/10 px-3 py-1.5 active:opacity-70">
          <Text className="text-[13px] font-bold text-white">{"\u2190  Retour"}</Text>
        </Pressable>
        <Text className="text-[16px] font-bold text-white">Mon portefeuille</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <WalletPanel sandbox={sandbox} />
      </ScrollView>
    </View>
  );
}
