import React, { useState } from "react";
import { View, ScrollView } from "react-native";
import RiderProfileBanner from "../components/RiderProfileBanner";
import MenuItem from "../components/MenuItem";

/**
 * Groupes d'options du menu (l'ordre suit la maquette).
 * Un séparateur plein (#E5E7EB) est dessiné entre chaque groupe.
 */
const MENU_GROUPS = [
  [{ key: "home", label: "Accueil", icon: "home-outline" }],
  [
    { key: "lang", label: "Langue", icon: "language-outline" },
    { key: "vehicle", label: "Type de véhicule", icon: "bicycle-outline" },
    { key: "schedule", label: "Emploi du temps", icon: "time-outline" },
    { key: "bank", label: "Gestion bancaire", icon: "card-outline" },
  ],
  [
    { key: "help", label: "Aide", icon: "help-circle-outline" },
    { key: "profile", label: "Profil", icon: "person-outline" },
    { key: "about", label: "À propos de nous", icon: "information-circle-outline" },
    {
      key: "privacy",
      label: "Politique de confidentialité",
      icon: "shield-checkmark-outline",
    },
    { key: "product", label: "Page du produit", icon: "grid-outline" },
  ],
  [{ key: "logout", label: "Déconnexion", icon: "log-out-outline" }],
];

/**
 * Écran 2 : Menu latéral (drawer) / profil livreur.
 * L'état de disponibilité est contrôlé par le parent (App) via `available`.
 */
export default function DrawerMenu({
  riderName = "Nom du livreur",
  riderId = "rider id",
  available = true,
  onToggleAvailability,
  onSelect,
}) {
  const [activeKey, setActiveKey] = useState("home");

  const handlePress = (key) => {
    setActiveKey(key);
    if (onSelect) onSelect(key);
  };

  return (
    <View className="flex-1 bg-white">
      <RiderProfileBanner
        riderName={riderName}
        riderId={riderId}
        available={available}
        onToggleAvailability={onToggleAvailability}
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {MENU_GROUPS.map((group, groupIndex) => (
          <View key={`group-${groupIndex}`}>
            {groupIndex > 0 ? <View className="h-px bg-line" /> : null}

            {group.map((item, itemIndex) => (
              <MenuItem
                key={item.key}
                icon={item.icon}
                label={item.label}
                active={activeKey === item.key}
                onPress={() => handlePress(item.key)}
                showSeparator={itemIndex < group.length - 1}
              />
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
