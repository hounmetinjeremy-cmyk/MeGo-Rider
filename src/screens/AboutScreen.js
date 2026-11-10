import React from "react";
import { View, Text, ScrollView, Pressable, Linking } from "react-native";
import ScreenHeader from "../components/ScreenHeader";
import Icon from "../components/Icon";
import colors from "../theme/colors";

const APP_VERSION = "1.0.0";

const VALUES = [
  {
    icon: "truck",
    title: "Livraison rapide",
    text: "Des courses prises en charge en quelques minutes, partout à Abomey-Calavi et Cotonou.",
  },
  {
    icon: "shield",
    title: "Paiement sécurisé",
    text: "Chaque livraison est tracée et chaque revenu est crédité automatiquement sur votre portefeuille.",
  },
  {
    icon: "trend",
    title: "Revenus transparents",
    text: "Vous voyez en temps réel ce que vous gagnez, commande par commande.",
  },
];

/**
 * Écran « À propos de nous ».
 * Contenu statique (aucune donnée à stocker) + contact réel par e-mail.
 */
export default function AboutScreen({ onBack }) {
  const openMail = () => {
    Linking.openURL("mailto:contact@mego.app?subject=MeGo%20Rider").catch(
      () => {}
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader title="À propos de nous" onBack={onBack} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        <View className="mb-4 items-center rounded-xl bg-white p-6 shadow-sm">
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <Icon name="truck" size={32} color={colors.white} />
          </View>
          <Text className="mt-3 text-[18px] font-bold text-ink">MeGo Rider</Text>
          <Text className="mt-1 text-[13px] text-muted">
            Version {APP_VERSION}
          </Text>
          <Text className="mt-3 text-center text-[13px] leading-5 text-muted">
            L'application des livreurs MeGo : recevez les commandes, gérez vos
            livraisons et suivez vos revenus en temps réel.
          </Text>
        </View>

        {VALUES.map((v) => (
          <View
            key={v.title}
            className="mb-3 flex-row rounded-xl bg-white p-4 shadow-sm"
          >
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-chip">
              <Icon name={v.icon} size={20} color={colors.navy} />
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-bold text-ink">{v.title}</Text>
              <Text className="mt-1 text-[13px] leading-5 text-muted">
                {v.text}
              </Text>
            </View>
          </View>
        ))}

        <Pressable
          onPress={openMail}
          className="mt-2 flex-row items-center justify-between rounded-xl bg-white p-4 shadow-sm"
        >
          <View className="flex-row items-center">
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-chip">
              <Icon name="mail" size={20} color={colors.navy} />
            </View>
            <View>
              <Text className="text-[15px] font-bold text-ink">Nous contacter</Text>
              <Text className="text-[12px] text-muted">contact@mego.app</Text>
            </View>
          </View>
          <Icon name="chevronRight" size={18} color={colors.muted} />
        </Pressable>

        <Text className="mt-6 text-center text-[12px] text-muted">
          © {new Date().getFullYear()} MeGo. Tous droits réservés.
        </Text>
      </ScrollView>
    </View>
  );
}
