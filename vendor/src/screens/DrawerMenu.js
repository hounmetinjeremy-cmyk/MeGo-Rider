import React from "react";
import { View, ScrollView } from "react-native";
import VendorProfileBanner from "../components/VendorProfileBanner";
import MenuItem from "../components/MenuItem";

const ITEMS = [
  { key: "home", icon: "home", label: "Tableau de bord" },
  { key: "orders", icon: "package", label: "Commandes" },
  { key: "products", icon: "card", label: "Produits" },
  { key: "earnings", icon: "dollar", label: "Revenus" },
  { key: "profile", icon: "user", label: "Profil" },
  { key: "bank", icon: "card", label: "Compte bancaire" },
  { key: "schedule", icon: "clock", label: "Horaires" },
  { key: "language", icon: "globe", label: "Langue" },
  { key: "help", icon: "help", label: "Aide" },
  { key: "about", icon: "info", label: "A propos" },
  { key: "logout", icon: "logout", label: "Deconnexion" },
];

export default function DrawerMenu({ vendor, activeKey, onNavigate, onClose, onToggleOpen }) {
  return (
    <View className="flex-1 bg-white">
      <VendorProfileBanner
        riderName={vendor?.name || "Ma boutique"}
        riderCode={vendor?.id ? String(vendor.id).slice(0, 8) : "vendor id"}
        available={!!vendor?.is_open}
        onToggleAvailability={onToggleOpen}
        onClose={onClose}
      />
      <ScrollView className="flex-1">
        {ITEMS.map((it) => (
          <MenuItem key={it.key} icon={it.icon} label={it.label} active={activeKey === it.key} onPress={() => onNavigate(it.key)} />
        ))}
      </ScrollView>
    </View>
  );
}
