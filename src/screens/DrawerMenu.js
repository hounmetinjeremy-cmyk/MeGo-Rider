import React from "react";
import { View, ScrollView } from "react-native";
import RiderProfileBanner from "../components/RiderProfileBanner";
import MenuItem from "../components/MenuItem";

const MENU_GROUPS = [
  [{ key: "home", label: "Accueil", icon: "home" }],
  [
    { key: "language", label: "Langue", icon: "globe" },
    { key: "vehicle", label: "Type de véhicule", icon: "bike" },
    { key: "schedule", label: "Emploi du temps", icon: "clock" },
    { key: "banking", label: "Gestion bancaire", icon: "card" },
  ],
  [
    { key: "help", label: "Aide", icon: "help" },
    { key: "profile", label: "Profil", icon: "user" },
    { key: "about", label: "À propos de nous", icon: "info" },
    { key: "privacy", label: "Politique de confidentialité", icon: "shield" },
    { key: "product", label: "Page du produit", icon: "package" },
  ],
  [{ key: "logout", label: "Déconnexion", icon: "logout" }],
];

/** Écran 2 : menu latéral (drawer) / profil livreur. */
export default function DrawerMenu({
  rider,
  activeKey = "home",
  onSelect,
  onClose,
  onToggleAvailability,
}) {
  return (
    <View className="flex-1 bg-white">
      <RiderProfileBanner
        riderName={rider ? rider.name : "Nom du livreur"}
        riderCode={rider ? rider.code : "rider id"}
        available={!!(rider && rider.available)}
        onToggleAvailability={onToggleAvailability}
        onClose={onClose}
      />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        {MENU_GROUPS.map((group, groupIndex) => (
          <View key={groupIndex} className={groupIndex > 0 ? "border-t border-line" : ""}>
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
