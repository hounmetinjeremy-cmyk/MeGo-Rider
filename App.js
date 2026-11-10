import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Modal,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import "./global.css";

import OrdersScreen from "./src/screens/OrdersScreen";
import WalletScreen from "./src/screens/WalletScreen";
import EarningsScreen from "./src/screens/EarningsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import DrawerMenu from "./src/screens/DrawerMenu";
import { colors } from "./src/theme/colors";

const DRAWER_WIDTH = Math.min(
  340,
  Math.round(Dimensions.get("window").width * 0.82)
);

/**
 * Racine de l'application :
 * - etat global : drawer ouvert/ferme, disponibilite du livreur,
 *   onglet de navigation basse (activeNav) et onglet de commandes (activeTab)
 * - le drawer glisse depuis la gauche (Animated) et se ferme par la croix,
 *   par le clic a cote (backdrop) ou par le bouton retour Android.
 */
export default function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [available, setAvailable] = useState(true);
  const [activeNav, setActiveNav] = useState("Accueil");
  const [activeTab, setActiveTab] = useState("Nouvel Ordre");
  const [drawerKey, setDrawerKey] = useState("home");

  const slide = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fade = useRef(new Animated.Value(0)).current;

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    slide.setValue(-DRAWER_WIDTH);
    fade.setValue(0);
    Animated.parallel([
      Animated.timing(slide, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, slide]);

  const closeDrawer = useCallback(() => {
    Animated.parallel([
      Animated.timing(slide, {
        toValue: -DRAWER_WIDTH,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setDrawerOpen(false);
    });
  }, [fade, slide]);

  const handleSelect = useCallback(
    (key) => {
      setDrawerKey(key);
      if (key === "home") setActiveNav("Accueil");
      if (key === "profile") setActiveNav("Profil");
      closeDrawer();
    },
    [closeDrawer]
  );

  const screen = (() => {
    switch (activeNav) {
      case "Portefeuille":
        return (
          <WalletScreen
            onMenuPress={openDrawer}
            activeNav={activeNav}
            onChangeNav={setActiveNav}
          />
        );
      case "Revenus":
        return (
          <EarningsScreen
            onMenuPress={openDrawer}
            activeNav={activeNav}
            onChangeNav={setActiveNav}
          />
        );
      case "Profil":
        return (
          <ProfileScreen
            onMenuPress={openDrawer}
            activeNav={activeNav}
            onChangeNav={setActiveNav}
            available={available}
            onToggleAvailability={setAvailable}
          />
        );
      default:
        return (
          <OrdersScreen
            onMenuPress={openDrawer}
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            activeNav={activeNav}
            onChangeNav={setActiveNav}
          />
        );
    }
  })();

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View className="flex-1 bg-white">
        <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
          {screen}
        </SafeAreaView>

        <Modal
          visible={drawerOpen}
          transparent
          animationType="none"
          statusBarTranslucent
          onRequestClose={closeDrawer}
        >
          <View style={styles.overlay}>
            <Animated.View style={[styles.backdropWrap, { opacity: fade }]}>
              <Pressable
                style={styles.backdrop}
                onPress={closeDrawer}
                accessibilityRole="button"
                accessibilityLabel="Fermer le menu"
              />
            </Animated.View>

            <Animated.View
              style={[
                styles.drawer,
                { width: DRAWER_WIDTH, transform: [{ translateX: slide }] },
              ]}
            >
              <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
                <DrawerMenu
                  riderName="Nom du livreur"
                  riderId="rider id"
                  available={available}
                  onToggleAvailability={setAvailable}
                  activeKey={drawerKey}
                  onSelect={handleSelect}
                  onClose={closeDrawer}
                />
              </SafeAreaView>
            </Animated.View>
          </View>
        </Modal>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: "row" },
  backdropWrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  backdrop: { flex: 1 },
  drawer: { height: "100%", backgroundColor: colors.white },
});
