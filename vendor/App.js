import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Modal, Pressable, Animated, Easing, Dimensions } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import BottomNavBar from "./src/components/BottomNavBar";
import DrawerMenu from "./src/screens/DrawerMenu";
import DashboardScreen from "./src/screens/DashboardScreen";
import OrdersScreen from "./src/screens/OrdersScreen";
import ProductsScreen from "./src/screens/ProductsScreen";
import EarningsScreen from "./src/screens/EarningsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import ZonesScreen from "./src/screens/ZonesScreen";
import useVendor from "./src/hooks/useVendor";

const DRAWER_WIDTH = Math.min(300, Dimensions.get("window").width * 0.82);
const MAIN_TABS = ["home", "orders", "products", "earnings", "profile"];

/**
 * Application vendeur MeGo Vendor : même structure que l'application livreur
 * (en-tête, contenu, barre d'onglets en bas, menu latéral). Seules les fonctions changent.
 * Le vendeur ajoute ses produits et partage le lien de sa boutique ; le livreur est choisi par le système.
 */
export default function App() {
  const [activeNav, setActiveNav] = useState("home");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const slide = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const lastTab = useRef("home");
  const { vendor, orders, loading, error, reload, toggleOpen } = useVendor();

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    if (!drawerOpen) return;
    slide.setValue(-DRAWER_WIDTH);
    fade.setValue(0);
    Animated.parallel([
      Animated.timing(slide, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [drawerOpen, slide, fade]);

  useEffect(() => {
    if (MAIN_TABS.includes(activeNav)) lastTab.current = activeNav;
  }, [activeNav]);

  const handleNav = useCallback((key) => { setActiveNav(key); closeDrawer(); }, [closeDrawer]);
  const goBack = useCallback(() => setActiveNav(lastTab.current), []);

  const renderScreen = () => {
    switch (activeNav) {
      case "orders":
        return <OrdersScreen vendor={vendor} orders={orders} onRefresh={reload} onMenuPress={openDrawer} onBack={goBack} />;
      case "products":
        return <ProductsScreen vendor={vendor} onMenuPress={openDrawer} onBack={goBack} />;
      case "earnings":
        return <EarningsScreen vendor={vendor} orders={orders} onMenuPress={openDrawer} onBack={goBack} />;
      case "zones":
        return <ZonesScreen vendor={vendor} onMenuPress={openDrawer} onBack={goBack} />;
      case "profile":
        return <ProfileScreen vendor={vendor} onMenuPress={openDrawer} onBack={goBack} />;
      default:
        return <DashboardScreen vendor={vendor} orders={orders} loading={loading} error={error} onRefresh={reload} onMenuPress={openDrawer} onBack={goBack} />;
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top", "bottom"]}>
        <View className="flex-1">
          {renderScreen()}
          <BottomNavBar activeKey={activeNav} onChange={setActiveNav} />
        </View>
        <Modal visible={drawerOpen} transparent animationType="none" onRequestClose={closeDrawer}>
          <View className="flex-1 flex-row">
            <Animated.View style={{ width: DRAWER_WIDTH, transform: [{ translateX: slide }] }} className="h-full bg-white">
              <DrawerMenu vendor={vendor} activeKey={activeNav} onNavigate={handleNav} onClose={closeDrawer} onToggleOpen={toggleOpen} />
            </Animated.View>
            <Animated.View style={{ opacity: fade }} className="flex-1 bg-black/40">
              <Pressable className="flex-1" onPress={closeDrawer} />
            </Animated.View>
          </View>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
