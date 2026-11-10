import React from "react";
import { View, ScrollView } from "react-native";
import RiderProfileBanner from "../components/RiderProfileBanner";
import MenuItem from "../components/MenuItem";

/**
 * Ecran 2 : menu lateral (drawer) / profil livreur.
 * Les options sont regroupees ; chaque groupe est separe par une ligne fine.
 */
export const MENU_GROUPS = [
  [{ key: "home", label: "Accueil", icon: "home-outline" }],
  [
    { key: "language", label: "Langue", icon: "language-outline" },
    { key: "vehicle", label: "Type de vehicule", icon: "bicycle-outline" },
    { key: "schedule", label: "Emploi du temps", icon: "time-outline" },
    { key: "banking", label: "Gestion bancaire", icon: "card-outline" },
  ],
  [
    { key: "help", label: "Aide", icon: "help-circle-outline" },
    { key: "profile", label: "Profil", icon: "person-outline" },
    { key: "about", label: "A propos de nous", icon: "information-circle-outline" },
    { key: "privacy", label: "Politique de confidentialite", icon: "shield-checkmark-outline" },
    { key: "product", label: "Page du produit", icon: "grid-outline" },
  ],
  [{ key: "logout", label: "Deconnexion", icon: "log-out-outline" }],
];

export default function DrawerMenu({
  riderName = "Nom du livreur",
  riderId = "rider id",
  available = true,
  onToggleAvailability,
  activeKey = "home",
  onSelect,
  onClose,
}) {
  return (
    <View className="flex-1 bg-white">
      <RiderProfileBanner
        riderName={riderName}
        riderId={riderId}
        available={available}
        onToggleAvailability={onToggleAvailability}
        onClose={onClose}
      />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        {MENU_GROUPS.map((group, groupIndex) => (
          <View
            key={groupIndex}
            className={groupIndex > 0 ? "border-t border-line" : ""}
          >
            {group.map((item, itemIndex) => (
              <MenuItem
                key={item.key}
                icon={item.icon}
                label={item.label}
                active={item.key === activeKey}
                onPress={() => onSelect && onSelect(item.key)}
                showSeparator={itemIndex < group.length - 1}
              />
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
