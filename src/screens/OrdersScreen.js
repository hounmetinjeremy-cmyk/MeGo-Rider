import React, { useState } from "react";
import { View, Text } from "react-native";
import AppHeader from "../components/AppHeader";
import TopTabBar from "../components/TopTabBar";
import EmptyState from "../components/EmptyState";
import BottomNavBar from "../components/BottomNavBar";

const TABS = ["Nouvel Ordre", "En traitement", "Livré"];

const EMPTY_MESSAGES = {
  "Nouvel Ordre": "Aucune nouvelle commande pour le moment !",
  "En traitement": "Aucune commande en traitement pour le moment !",
  "Livré": "Aucune commande livrée pour le moment !",
};

/**
 * Écran 1 : Gestion des Commandes.
 * Header burger + top tabs + état vide + bottom navigation.
 */
export default function OrdersScreen({ onOpenDrawer }) {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [activeNav, setActiveNav] = useState("Accueil");

  return (
    <View className="flex-1 bg-white">
      <AppHeader title="Commandes" onMenuPress={onOpenDrawer} />

      <TopTabBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      <View className="flex-1">
        <EmptyState message={EMPTY_MESSAGES[activeTab]} />
      </View>

      <BottomNavBar activeKey={activeNav} onChange={setActiveNav} />
    </View>
  );
}
