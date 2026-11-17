import React, { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

import RiderApp from "./App";
import VendorApp from "./vendor/App";
import RoleSelect from "./src/screens/RoleSelect";

export default function AppShell() {
  const [role, setRole] = useState(null);

  const selectRole = useCallback((next) => {
    setRole(next);
  }, []);

  const switchRole = useCallback(() => {
    setRole(null);
  }, []);

  if (!role) {
    return <RoleSelect onSelect={selectRole} />;
  }

  return (
    <View style={styles.root}>
      {role === "vendor" ? <VendorApp /> : <RiderApp />}
      <Pressable style={styles.switchBtn} onPress={switchRole} hitSlop={10}>
        <Text style={styles.switchTxt}>⇄</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  switchBtn: {
    position: "absolute",
    top: 44,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  switchTxt: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
