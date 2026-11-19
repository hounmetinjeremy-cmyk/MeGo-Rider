import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { money } from "../lib/shop";
import WalletPanel from "../components/WalletPanel";

// Paiement : TOUT passe par le portefeuille. Le client (ou le vendeur / le livreur) depose d'abord de l'argent
// par Mobile Money (FedaPay), puis la boutique preleve la commande sur son solde.
export default function PayScreen({ order, sandbox, onWalletPaid, onCancel }) {
  return (
    <ScrollView className="flex-1 bg-surface" contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <View className="rounded-2xl bg-navy p-5">
        <Text className="text-[12px] text-white">Montant a payer</Text>
        <Text className="mt-1 text-[28px] font-extrabold text-white">{money(order ? order.total : 0)}</Text>
        {order && order.code ? <Text className="mt-1 text-[12px] text-white">Commande {order.code}</Text> : null}
      </View>

      <WalletPanel order={order} sandbox={sandbox} onPaid={onWalletPaid} />

      {onCancel ? (
        <Pressable onPress={onCancel} className="mt-3 items-center py-2 active:opacity-70">
          <Text className="text-[13px] text-muted">Annuler</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}
