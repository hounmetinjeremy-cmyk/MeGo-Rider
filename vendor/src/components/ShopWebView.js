import React from "react";
import { Modal, View, Text, Pressable, Platform, Linking, ActivityIndicator, SafeAreaView, StyleSheet } from "react-native";
import { getToken } from "../lib/session";

// react-native-webview n'existe que dans l'APK (pas dans le build web du vendeur) : chargement optionnel.
let WebView = null;
try {
  WebView = require("react-native-webview").WebView;
} catch (e) {
  WebView = null;
}

// Ouvre une boutique A L'INTERIEUR de l'application (fenetre plein ecran), sans Chrome.
// Les liens de la boutique (meme site) restent dedans ; WhatsApp, telephone, etc. s'ouvrent normalement.
export default function ShopWebView({ url, onClose }) {
  const noWebView = Platform.OS !== "web" && !WebView;

  // Securite : si le composant WebView manquait, on retombe sur le navigateur plutot que de ne rien faire.
  React.useEffect(() => {
    if (url && noWebView) {
      Linking.openURL(url).catch(() => {});
      if (onClose) onClose();
    }
  }, [url, noWebView]);

  if (!url || Platform.OS === "web" || noWebView) return null;
  const origin = url.split("/").slice(0, 3).join("/");

  // Compte connecte dans l'application (vendeur) : la boutique l'utilise pour debiter son portefeuille.
  let token = null;
  try {
    token = getToken("vendor");
  } catch (e) {}
  const inject = token ? "window.__MEGO_TOKEN__ = " + JSON.stringify(String(token)) + "; true;" : "true;";

  const allow = (req) => {
    const u = (req && req.url) || "";
    if (u.indexOf(origin) === 0 || u === "about:blank") return true;
    Linking.openURL(u).catch(() => {});
    return false;
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.wrap}>
        <View style={s.bar}>
          <Pressable onPress={onClose} style={s.back}>
            <Text style={s.backTxt}>{"\u2190  Retour"}</Text>
          </Pressable>
        </View>
        <WebView
          source={{ uri: url }}
          style={{ flex: 1 }}
          javaScriptEnabled
          injectedJavaScriptBeforeContentLoaded={inject}
          domStorageEnabled
          geolocationEnabled
          setSupportMultipleWindows={false}
          onShouldStartLoadWithRequest={allow}
          startInLoadingState
          renderLoading={() => <ActivityIndicator style={s.loader} size="large" color="#0a7d4b" />}
        />
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#fff" },
  bar: { flexDirection: "row", alignItems: "center", padding: 10, borderBottomWidth: 1, borderBottomColor: "#eee" },
  back: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, backgroundColor: "#f0efe9" },
  backTxt: { fontWeight: "700", color: "#1a1a1a", fontSize: 14 },
  loader: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0 },
});
