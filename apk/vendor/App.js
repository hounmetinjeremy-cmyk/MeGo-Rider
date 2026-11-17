import React, { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, View, Text, Pressable, ActivityIndicator, Linking, StyleSheet, Platform, StatusBar } from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";

// Application Android MeGo Vendeur : une coque qui ouvre l'application web (memes ecrans, memes comptes, memes donnees).
// Avantage : toute amelioration publiee sur le site apparait tout de suite dans l'application, sans la reinstaller.
const APP_URL = "https://mego-vendor.pages.dev";
const APP_HOST = "mego-vendor.pages.dev";

export default function App() {
  const ref = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // La position est utilisee a l'inscription (les livreurs trouvent la boutique) : on demande l'autorisation des le demarrage
  useEffect(() => {
    Location.requestForegroundPermissionsAsync().catch(() => {});
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack && ref.current) {
        ref.current.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [canGoBack]);

  const onShouldStart = useCallback((req) => {
    const url = String(req.url || "");
    if (url.startsWith("about:") || url.startsWith("blob:") || url.startsWith("data:")) return true;
    try {
      const host = url.replace(/^[a-z]+:\/\//i, "").split(/[/?#]/)[0];
      if (url.startsWith("https://") && (host === APP_HOST || host.endsWith(".supabase.co") || host.endsWith(".fedapay.com"))) return true;
    } catch (e) {}
    // Tout le reste (WhatsApp, telephone, cartes, autres sites, boutiques clients) s'ouvre dans l'application du telephone
    Linking.openURL(url).catch(() => {});
    return false;
  }, []);

  if (failed) {
    return (
      <View style={s.center}>
        <Text style={s.title}>Pas de connexion</Text>
        <Text style={s.sub}>Verifie ton internet puis reessaie.</Text>
        <Pressable
          onPress={() => {
            setFailed(false);
            setReloadKey((k) => k + 1);
          }}
          style={s.btn}
        >
          <Text style={s.btnTxt}>Reessayer</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <WebView
        key={reloadKey}
        ref={ref}
        source={{ uri: APP_URL }}
        style={{ flex: 1 }}
        javaScriptEnabled
        domStorageEnabled
        geolocationEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={s.center}>
            <ActivityIndicator size="large" color="#0a7d4b" />
          </View>
        )}
        setSupportMultipleWindows={false}
        onNavigationStateChange={(st) => setCanGoBack(!!st.canGoBack)}
        onShouldStartLoadWithRequest={onShouldStart}
        onError={() => setFailed(true)}
        onHttpError={(e) => {
          if (e && e.nativeEvent && e.nativeEvent.statusCode >= 500) setFailed(true);
        }}
        applicationNameForUserAgent="MeGoApp"
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#ffffff", paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#ffffff", padding: 24 },
  title: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  sub: { fontSize: 14, color: "#6b6b6b", marginTop: 6, textAlign: "center" },
  btn: { marginTop: 18, backgroundColor: "#0a7d4b", borderRadius: 12, paddingHorizontal: 22, paddingVertical: 12 },
  btnTxt: { color: "#fff", fontWeight: "700" },
});
