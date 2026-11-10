import React, { useCallback, useEffect, useRef, useState } from "react";
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
import DrawerMenu from "./src/screens/DrawerMenu";
import OrdersScreen from "./src/screens/OrdersScreen";
import WalletScreen from "./src/screens/WalletScreen";
import EarningsScreen from "./src/screens/EarningsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import BottomNavBar from "./src/components/BottomNavBar";
import useRider from "./src/hooks/useRider";
import useOrders from "./src/hooks/useOrders";
import colors from "./src/theme/colors";

const DRAWER_WIDTH = Math.min(320, Dimensions.get("window").width * 0.82);

export default function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("home");
  const slide = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fade = useRef(new Animated.Value(0)).current;

  const { rider, setAvailability, reload: reloadRider } = useRider();
  const { orders, byTab, loading, error, refreshing, reload, refresh } = useOrders(
    rider ? rider.id : null
  );

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    if (!drawerOpen) return;
    slide.setValue(-DRAWER_WIDTH);
    fade.setValue(0);
    Animated.parallel([
      Animated.timing(slide, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
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
    await Promise.all([reloadRider(), reload()]);
  }, [reloadRider, reload]);

  const handleMenuSelect = useCallback(
    (key) => {
      if (key === "home") setActiveNav("home");
      else if (key === "wallet") setActiveNav("wallet");
      else if (key === "earnings") setActiveNav("earnings");
      else if (key === "profile") setActiveNav("profile");
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
        onRefresh={refresh}
        onMenuPress={openDrawer}
      />
    );
  } else if (activeNav === "earnings") {
    screen = (
      <EarningsScreen
        rider={rider}
        orders={orders}
        refreshing={refreshing}
        onRefresh={refresh}
        onMenuPress={openDrawer}
      />
    );
  } else if (activeNav === "profile") {
    screen = (
      <ProfileScreen
        rider={rider}
        refreshing={refreshing}
        onRefresh={refresh}
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
        onRefresh={refresh}
        onReload={reload}
        onMenuPress={openDrawer}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
        <View className="flex-1">
          {screen}
          <BottomNavBar activeKey={activeNav} onChange={setActiveNav} />
        </View>

        <Modal
          visible={drawerOpen}
          transparent
          animationType="none"
          onRequestClose={closeDrawer}
        >
          <View style={styles.overlay}>
            <Animated.View style={[styles.drawer, { transform: [{ translateX: slide }] }]}>
              <DrawerMenu
                rider={rider}
                activeKey={activeNav}
                onSelect={handleMenuSelect}
                onClose={closeDrawer}
                onToggleAvailability={handleToggleAvailability}
              />
            </Animated.View>
            <Animated.View style={[styles.backdropWrap, { opacity: fade }]}>
              <Pressable style={styles.backdrop} onPress={closeDrawer} />
            </Animated.View>
          </View>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: "row", backgroundColor: "rgba(0,0,0,0.35)" },
  drawer: { width: DRAWER_WIDTH, backgroundColor: colors.white },
  backdropWrap: { flex: 1 },
  backdrop: { flex: 1 },
});
