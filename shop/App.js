import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Pressable, ScrollView, Linking } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import Icon from "./src/components/Icon";
import ShopScreen from "./src/screens/ShopScreen";
import CheckoutScreen from "./src/screens/CheckoutScreen";
import OrderScreen from "./src/screens/OrderScreen";
import PayScreen from "./src/screens/PayScreen";
import WalletScreen from "./src/screens/WalletScreen";
import ChatWidget from "./src/components/ChatWidget";
import { readSlug, loadShop, placeOrder, payOrder } from "./src/lib/shop";
import DiscoveryScreen from "./src/screens/DiscoveryScreen";

const VENDOR_APP = "https://mego-vendor.pages.dev";
const RIDER_APP = "https://mego-rider.pages.dev";
const API = "https://mprusmdpirucpcwqssfg.supabase.co";
const KEY = "sb_publishable_OqgLY_ICZBtu1-C_yN_hCA_J4U2zluA";

async function rpc(name, body) {
  const r = await fetch(API + "/rest/v1/rpc/" + name, {
    method: "POST",
    headers: { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  return r.json();
}

// Position du client (pour que le livreur sache ou livrer) : demandee a la commande, 6 s maximum.
function getPosition() {
  return new Promise((resolve) => {
    const none = { lat: null, lng: null };
    try {
      if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(none);
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(none),
        { timeout: 6000, maximumAge: 60000 }
      );
    } catch (e) {
      resolve(none);
    }
  });
}

/**
 * Filet de securite : si un ecran plante, on affiche le message d'erreur
 * au lieu d'une page blanche (indispensable sur mobile, ou la console est invisible).
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error) {
    if (typeof console != "undefined") console.error("MeGo Shop:", error);
  }
  render() {
    if (this.state.error) {
      return (
        <SafeAreaView className="flex-1 items-center justify-center bg-surface px-8">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-chip">
            <Icon name="info" size={24} color="#7E8B9B" />
          </View>
          <Text className="mt-3 text-center text-[15px] font-bold text-ink">
            La boutique n'a pas pu s'afficher
          </Text>
          <ScrollView className="mt-2 max-h-40 w-full">
            <Text className="text-center text-[12px] text-muted">
              {String((this.state.error && this.state.error.message) || this.state.error)}
            </Text>
          </ScrollView>
          <Pressable
            onPress={() => this.setState({ error: null })}
            className="mt-5 rounded-2xl bg-primary px-5 py-3 active:opacity-80"
          >
            <Text className="text-[14px] font-bold text-white">Reessayer</Text>
          </Pressable>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

function ShopApp() {
  const [slug, setSlug] = useState("");
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [screen, setScreen] = useState("shop");
  const [cart, setCart] = useState({});
  const [orderId, setOrderId] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [payOrderInfo, setPayOrderInfo] = useState(null);
  const [sandbox, setSandbox] = useState(false);
  const [serverUrl, setServerUrl] = useState("");
  const [chatOn, setChatOn] = useState(false);

  const boot = useCallback(async () => {
    const s = readSlug();
    setSlug(s);
    if (!s) {
      setLoading(false);
      setError("Lien incomplet : il manque le nom de la boutique.");
      return;
    }
    setLoading(true);
    const data = await loadShop(s);
    setLoading(false);
    if (!data || data.ok === false) {
      setError((data && data.error) || "Boutique introuvable");
      return;
    }
    setError("");
    setShop(data);
    try {
      const [cs, cfg] = await Promise.all([rpc("get_chat_status", { p_slug: s }), rpc("get_payment_config")]);
      setChatOn(!!(cs && cs.enabled));
      if (cfg && cfg.server) setServerUrl(cfg.server);
      setSandbox(!!(cfg && cfg.sandbox === true));
    } catch (e) {}
  }, []);

  useEffect(() => {
    boot();
  }, [boot]);

  // Le client arrive TOUJOURS directement dans la boutique du vendeur (ses produits), sans fenetre qui s'ouvre toute seule.
  // CAS A (interrupteur desactive) : rien d'autre, le client achete et paie.
  // CAS B (interrupteur active) : un bouton FLOTTANT reste sur le cote de la boutique ; il deplie un petit menu
  // (voir les autres boutiques, devenir vendeur, devenir livreur).
  // Le bouton "Mon portefeuille" est TOUJOURS la, que le vendeur ait active l'interrupteur ou non.
  const marketplaceOpen = !!(shop && shop.vendor && shop.vendor.is_marketplace_visible === true);

  const add = (p) => setCart((c) => ({ ...c, [p.id]: (c[p.id] || 0) + 1 }));

  const remove = (p) =>
    setCart((c) => {
      const n = { ...c };
      if (!n[p.id]) return n;
      n[p.id] -= 1;
      if (n[p.id] <= 0) delete n[p.id];
      return n;
    });

  const onPlaced = async ({ name, phone, address, note, zoneId }) => {
    const items = Object.keys(cart).map((id) => ({ id, qty: cart[id] }));
    const pos = await getPosition();
    const res = await placeOrder({ slug, items, name, phone, address, lat: pos.lat, lng: pos.lng, note, zoneId });
    if (!res || res.ok === false) return res || { ok: false, error: "Commande impossible" };

    let cfg = null;
    try {
      cfg = await rpc("get_payment_config");
    } catch (e) {}

    setOrderId(res.order_id);
    setCart({});
    if (cfg && cfg.provider === "fedapay" && cfg.test !== true && cfg.server) {
      // Paiement reel : tout passe par le portefeuille (depot Mobile Money FedaPay, puis prelevement sur le solde)
      setServerUrl(cfg.server);
      setSandbox(cfg.sandbox === true);
      setPayOrderInfo({ order_id: res.order_id, total: res.total, code: res.code });
      setScreen("pay");
    } else {
      // Mode simulation (test_payments actif ou paiement non configure)
      setScreen("order");
      await payOrder(res.order_id);
    }
    return res;
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator color="#76D865" size="large" />
        <Text className="mt-3 text-[13px] text-muted">Chargement de la boutique...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface px-8">
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-chip">
          <Icon name="info" size={24} color="#7E8B9B" />
        </View>
        <Text className="mt-3 text-center text-[15px] font-bold text-ink">{error}</Text>
        <Text className="mt-1 text-center text-[13px] text-muted">
          Demande le bon lien au vendeur, ou scanne son QR code.
        </Text>
        <Pressable onPress={boot} className="mt-5 rounded-2xl bg-primary px-5 py-3 active:opacity-80">
          <Text className="text-[14px] font-bold text-white">Reessayer</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (screen === "checkout") {
    return (
      <SafeAreaView className="flex-1 bg-surface">
        <CheckoutScreen
          shop={shop}
          cart={cart}
          onBack={() => setScreen("shop")}
          onPlaced={onPlaced}
        />
      </SafeAreaView>
    );
  }

  if (screen === "pay" && payOrderInfo) {
    return (
      <SafeAreaView className="flex-1 bg-surface">
        <PayScreen
          order={payOrderInfo}
          sandbox={sandbox}
          onWalletPaid={() => setScreen("order")}
          onCancel={() => setScreen("shop")}
        />
      </SafeAreaView>
    );
  }

  if (screen === "wallet") {
    return (
      <SafeAreaView className="flex-1 bg-surface">
        <WalletScreen sandbox={sandbox} onBack={() => setScreen("shop")} />
      </SafeAreaView>
    );
  }

  if (screen === "discovery" && marketplaceOpen) {
    return (
      <SafeAreaView className="flex-1 bg-surface">
        <DiscoveryScreen onBack={() => setScreen("shop")} />
      </SafeAreaView>
    );
  }
  if (screen === "order") {
    return (
      <SafeAreaView className="flex-1 bg-surface">
        <OrderScreen
          orderId={orderId}
          onBack={() => setScreen("shop")}
          onNew={() => setScreen("shop")}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <ShopScreen
        shop={shop}
        cart={cart}
        add={add}
        remove={remove}
        onCheckout={() => setScreen("checkout")}
      />
      {chatOn && serverUrl ? <ChatWidget slug={slug} serverUrl={serverUrl} /> : null}

      <Pressable
        onPress={() => setScreen("wallet")}
        className="absolute bottom-24 left-4 rounded-full bg-navy px-4 py-3 shadow-lg active:opacity-80"
      >
        <Text className="text-[13px] font-bold text-white">Mon portefeuille</Text>
      </Pressable>

      {marketplaceOpen ? (
        <View pointerEvents="box-none" className="absolute bottom-24 right-4 items-end">
          {menuOpen ? (
            <View className="mb-2 items-end">
              <Pressable
                onPress={() => {
                  setMenuOpen(false);
                  setScreen("discovery");
                }}
                className="mb-2 rounded-full bg-primary px-4 py-2.5 shadow-lg active:opacity-80"
              >
                <Text className="text-[13px] font-bold text-white">Voir les autres boutiques</Text>
              </Pressable>
              <Pressable
                onPress={() => Linking.openURL(VENDOR_APP).catch(() => {})}
                className="mb-2 rounded-full bg-white px-4 py-2.5 shadow-lg active:opacity-80"
              >
                <Text className="text-[13px] font-semibold text-ink">Devenir vendeur</Text>
              </Pressable>
              <Pressable
                onPress={() => Linking.openURL(RIDER_APP).catch(() => {})}
                className="rounded-full bg-white px-4 py-2.5 shadow-lg active:opacity-80"
              >
                <Text className="text-[13px] font-semibold text-ink">Devenir livreur</Text>
              </Pressable>
            </View>
          ) : null}
          <Pressable
            onPress={() => setMenuOpen((v) => !v)}
            className="h-14 w-14 items-center justify-center rounded-full bg-navy shadow-lg active:opacity-80"
          >
            <Text className="text-[22px] font-bold text-white">{menuOpen ? "✕" : "☰"}</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <ShopApp />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
