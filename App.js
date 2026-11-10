import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Modal, Pressable, Animated, Easing, Dimensions } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import DrawerMenu from "./src/screens/DrawerMenu";
import OrdersScreen from "./src/screens/OrdersScreen";
import WalletScreen from "./src/screens/WalletScreen";
import EarningsScreen from "./src/screens/EarningsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import BottomNavBar from "./src/components/BottomNavBar";
import useRider from "./src/hooks/useRider";
import useOrders from "./src/hooks/useOrders";

const DRAWER_WIDTH = Math.min(340, Math.round(Dimensions.get("window").width * 0.82));

/**
 * Racine de l'application livreur.
 * - activeNav : onglet de la barre du bas (home / wallet / earnings / profile)
 * - drawerOpen : ouverture du menu latéral
 */
export default function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("home");

  const { rider, reload: reloadRider, setAvailability } = useRider();
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

  const closeDrawer = useCallback(() => {
    Animated.parallel([
      Animated.timing(slide, {
        toValue: -DRAWER_WIDTH,
        duration: 220,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => setDrawerOpen(false));
  }, [slide, fade]);

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
        // le hook a déjà remis l'état précédent
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
      } else if (key === "home") {
        setActiveNav("home");
      } else if (key === "profile") {
        setActiveNav("profile");
      }
      closeDrawer();
    },
    [closeDrawer]
  );

  const handleLogout = useCallback(() => {
    setActiveNav("home");
    closeDrawer();
  }, [closeDrawer]);

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
  } else {
    screen = (
      <OrdersScreen
        rider={rider}
        byTab={byTab}
        loading={loading}
        error={error}
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
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top", "left", "right"]}>
        <View className="flex-1">{screen}</View>
        <BottomNavBar activeKey={activeNav} onChange={setActiveNav} />
      </SafeAreaView>

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
              className="flex-1"
              style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
              onPress={closeDrawer}
            />
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaProvider>
  );
}
