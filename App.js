import React, { useState } from "react";
import { View, Modal, Pressable, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import "./global.css";

import OrdersScreen from "./src/screens/OrdersScreen";
import DrawerMenu from "./src/screens/DrawerMenu";
import { colors } from "./src/theme/colors";

export default function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [available, setAvailable] = useState(true);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View className="flex-1 bg-white">
        <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
          <OrdersScreen onMenuPress={() => setDrawerOpen(true)} />
        </SafeAreaView>

        <Modal
          visible={drawerOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setDrawerOpen(false)}
        >
          <View style={styles.overlay}>
            <Pressable
              style={styles.backdrop}
              onPress={() => setDrawerOpen(false)}
            />
            <View style={styles.drawer}>
              <DrawerMenu
                available={available}
                onToggleAvailability={setAvailable}
                onSelect={(key) => {
                  if (key === "logout") setDrawerOpen(false);
                }}
              />
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: "row", backgroundColor: "rgba(0,0,0,0.35)" },
  backdrop: { flex: 1 },
  drawer: { width: "82%", maxWidth: 340, backgroundColor: colors.white },
});
