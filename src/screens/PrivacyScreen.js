import React from "react";
import { View, Text, ScrollView } from "react-native";
import ScreenHeader from "../components/ScreenHeader";

const SECTIONS = [
  {
    title: "1. Données collectées",
    body:
      "Nous collectons uniquement les données nécessaires à la livraison : nom, numéro de téléphone, type de véhicule, position pendant une course active et historique des commandes livrées.",
  },
  {
    title: "2. Utilisation des données",
    body:
      "Ces données servent à vous attribuer des commandes, à calculer vos revenus et à vous verser vos gains. Elles ne sont jamais vendues à des tiers.",
  },
  {
    title: "3. Position géographique",
    body:
      "Votre position est utilisée seulement lorsque vous êtes en ligne et pendant une livraison en cours. Elle est désactivée dès que vous passez en indisponible.",
  },
  {
    title: "4. Conservation",
    body:
      "Les données de livraison sont conservées 12 mois pour la comptabilité, puis supprimées automatiquement.",
  },
  {
    title: "5. Vos droits",
    body:
      "Vous pouvez demander la consultation, la correction ou la suppression de vos données depuis l'écran Aide, ou par e-mail à privacy@mego.app.",
  },
  {
    title: "6. Sécurité",
    body:
      "Les échanges sont chiffrés (HTTPS) et l'accès à la base est restreint par des règles de sécurité au niveau des lignes (RLS).",
  },
];

/**
 * Écran : Politique de confidentialité.
 */
export default function PrivacyScreen({ onBack }) {
  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader title="Politique de confidentialité" onBack={onBack} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        <View className="rounded-xl bg-white p-4 shadow-sm">
          <Text className="text-[13px] leading-5 text-ink/70">
            Dernière mise à jour : novembre 2026. Cette politique explique quelles
            données MeGo Rider collecte et comment elles sont protégées.
          </Text>
        </View>

        {SECTIONS.map((section) => (
          <View key={section.title} className="mt-3 rounded-xl bg-white p-4 shadow-sm">
            <Text className="text-[15px] font-bold text-ink">{section.title}</Text>
            <Text className="mt-1.5 text-[13px] leading-5 text-ink/70">
              {section.body}
            </Text>
          </View>
        ))}

        <Text className="mt-4 text-center text-[12px] text-muted">
          © 2026 MeGo — Tous droits réservés
        </Text>
      </ScrollView>
    </View>
  );
}
