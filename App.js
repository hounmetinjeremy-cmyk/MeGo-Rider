import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Modal, Pressable, Animated, Easing, Dimensions } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import BottomNavBar from "./src/components/BottomNavBar";
import DrawerMenu from "./src/screens/DrawerMenu";
import OrdersScreen from "./src/screens/OrdersScreen";
import WalletScreen from "./src/screens/WalletScreen";
import EarningsScreen from "./src/screens/EarningsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import LanguageScreen from "./src/screens/LanguageScreen";
import VehicleScreen from "./src/screens/VehicleScreen";
import ScheduleScreen from "./src/screens/ScheduleScreen";
import BankScreen from "./src/screens/BankScreen";
import HelpScreen from "./src/screens/HelpScreen";
import AboutScreen from "./src/screens/AboutScreen";
import PrivacyScreen from "./src/screens/PrivacyScreen";
import ProductScreen from "./src/screens/ProductScreen";
import useRider from "./src/hooks/useRider";
import useOrders from "./src/hooks/useOrders";

const DRAWER_WIDTH = Math.min(340, Dimensions.get("window").width * 0.82);

/** Onglets principaux : ce sont les seuls à afficher la barre du bas. */
const MAIN_TABS = ["home", "wallet", "earnings", "profile"];

/**
 * Application livreur MeGo Rider.
 *
 * État global :
 * - activeNav : onglet / écran courant (home, wallet, earnings, profile,
 *   language, vehicle, schedule, bank, help, about, privacy, product)
 * - drawerOpen : ouverture du menu latéral
 */
export default function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("home");
  const lastTab = useRef("home");

  const {
    rider,
    loading: riderLoading,
    error: riderError,
    reload: reloadRider,
    setAvailability,
  } = useRider();

  const {
    orders,
    byTab,
    loading,
    error,
    refreshing,
    refresh,
    reload,
  } = useOrders(rider ? rider.id : null);

  const slide = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fade = useRef(new Animated.Value(0)).current;

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    if (!drawerOpen) return;
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
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [drawerOpen, slide, fade]);

  const handleToggleAvailability = useCallback(
    async (value) => {
      try {
        await setAvailability(value);
      } catch (e) {
        // l'état est déjà revenu en arrière dans le hook
      }
    },
    [setAvailability]
  );

  const handleRefresh = useCallback(async () => {
    await Promise.all([reloadRider(), refresh()]);
  }, [reloadRider, refresh]);

  const handleMenuSelect = useCallback(
    (key) => {
      if (key === "logout") {
        setActiveNav("home");
      } else {
        setActiveNav(key);
      }
      closeDrawer();
    },
    [closeDrawer]
  );

  const handleLogout = useCallback(() => {
    setActiveNav("home");
    closeDrawer();
  }, [closeDrawer]);

  const goBack = useCallback(() => setActiveNav(lastTab.current), []);

  // Mémorise le dernier onglet principal pour le bouton retour.
  useEffect(() => {
    if (MAIN_TABS.includes(activeNav)) lastTab.current = activeNav;
  }, [activeNav]);

  const riderId = rider ? rider.id : null;
  const isMainTab = MAIN_TABS.includes(activeNav);

  let screen = null;

  if (activeNav === "wallet") {
    screen = (
      <WalletScreen
        rider={rider}
        orders={orders}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onMenuPress={openDrawer}
      />
    );
  } else if (activeNav === "earnings") {
    screen = (
      <EarningsScreen
        rider={rider}
        orders={orders}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onMenuPress={openDrawer}
      />
    );
  } else if (activeNav === "profile") {
    screen = (
      <ProfileScreen
        rider={rider}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onMenuPress={openDrawer}
        onLogout={handleLogout}
      />
    );
  } else if (activeNav === "language") {
    screen = <LanguageScreen riderId={riderId} onBack={goBack} />;
  } else if (activeNav === "vehicle") {
    screen = <VehicleScreen riderId={riderId} onBack={goBack} />;
  } else if (activeNav === "schedule") {
    screen = <ScheduleScreen riderId={riderId} onBack={goBack} />;
  } else if (activeNav === "bank") {
    screen = <BankScreen riderId={riderId} onBack={goBack} />;
  } else if (activeNav === "help") {
    screen = <HelpScreen riderId={riderId} onBack={goBack} />;
  } else if (activeNav === "about") {
    screen = <AboutScreen onBack={goBack} />;
  } else if (activeNav === "privacy") {
    screen = <PrivacyScreen onBack={goBack} />;
  } else if (activeNav === "product") {
    screen = <ProductScreen onBack={goBack} />;
  } else {
    screen = (
      <OrdersScreen
        rider={rider}
        byTab={byTab}
        loading={loading || riderLoading}
        error={error || riderError}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onMenuPress={openDrawer}
        onReload={reload}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1 bg-surface" edges={["top", "bottom"]}>
        <View className="flex-1">{screen}</View>

        {isMainTab ? (
          <BottomNavBar activeKey={activeNav} onChange={setActiveNav} />
        ) : null}

        <Modal
          visible={drawerOpen}
          transparent
          animationType="none"
          onRequestClose={closeDrawer}
        >
          <View className="flex-1 flex-row">
            <Animated.View
              style={{ width: DRAWER_WIDTH, transform: [{ translateX: slide }] }}
            >
              <DrawerMenu
                rider={rider}
                activeKey={activeNav}
                onSelect={handleMenuSelect}
                onClose={closeDrawer}
                onToggleAvailability={handleToggleAvailability}
              />
            </Animated.View>

            <Animated.View style={{ flex: 1, opacity: fade }}>
              <Pressable
                className="flex-1 bg-black/40"
                onPress={closeDrawer}
              />
            </Animated.View>
          </View>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
