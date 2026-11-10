import React from "react";
import { View, Text, ScrollView } from "react-native";
import ScreenHeader from "../components/ScreenHeader";
import Icon from "../components/Icon";

const FEATURES = [
  {
    icon: "package",
    title: "Livraison à la demande",
    text: "Recevez les commandes de votre zone en temps réel et acceptez celles qui vous conviennent.",
  },
  {
    icon: "trend",
    title: "Revenus transparents",
    text: "Suivez chaque livraison, votre solde et vos gains cumulés directement dans l'application.",
  },
  {
    icon: "card",
    title: "Retraits rapides",
    text: "Demandez le versement de votre solde sur votre compte Mobile Money ou bancaire.",
  },
  {
    icon: "clock",
    title: "Horaires flexibles",
    text: "Activez votre disponibilité quand vous le souhaitez et définissez votre emploi du temps.",
  },
];

const STEPS = [
  "Activez votre disponibilité depuis le menu.",
  "Acceptez une commande dans l'onglet Nouvel Ordre.",
  "Récupérez le colis chez le vendeur.",
  "Livrez le client et marquez la commande comme livrée.",
];

/**
 * Écran « Page du produit » : présentation de l'application livreur.
 */
export default function ProductScreen({ onBack }) {
  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader title="Page du produit" onBack={onBack} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        <View className="rounded-xl bg-white p-4 shadow-sm">
          <View className="flex-row items-center">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-primary-soft">
              <Icon name="package" size={24} color="#76D865" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[17px] font-bold text-ink">MeGo Rider</Text>
              <Text className="text-[13px] text-muted">
                L'application des livreurs partenaires
              </Text>
            </View>
          </View>
          <Text className="mt-3 text-[13px] leading-5 text-muted">
            MeGo Rider connecte les livreurs indépendants aux commandes des
            commerçants et des clients de leur ville. Une interface simple pour
            accepter, livrer et suivre ses revenus.
          </Text>
        </View>

        <Text className="mb-2 mt-5 text-[13px] font-bold uppercase text-muted">
          Fonctionnalités
        </Text>
        {FEATURES.map((f) => (
          <View
            key={f.title}
            className="mb-3 flex-row rounded-xl bg-white p-4 shadow-sm"
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-chip">
              <Icon name={f.icon} size={20} color="#1A2433" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[15px] font-bold text-ink">{f.title}</Text>
              <Text className="mt-1 text-[13px] leading-5 text-muted">
                {f.text}
              </Text>
            </View>
          </View>
        ))}

        <Text className="mb-2 mt-5 text-[13px] font-bold uppercase text-muted">
          Comment ça marche
        </Text>
        <View className="rounded-xl bg-white p-4 shadow-sm">
          {STEPS.map((s, i) => (
            <View key={s} className="mb-3 flex-row last:mb-0">
              <View className="h-6 w-6 items-center justify-center rounded-full bg-primary">
                <Text className="text-[12px] font-bold text-white">{i + 1}</Text>
              </View>
              <Text className="ml-3 flex-1 text-[13px] leading-5 text-ink">
                {s}
              </Text>
            </View>
          ))}
        </View>

        <Text className="mt-5 text-center text-[12px] text-muted">
          Version 1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}
