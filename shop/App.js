import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Pressable, ScrollView, Modal, Linking } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import Icon from "./src/components/Icon";
import ShopScreen from "./src/screens/ShopScreen";
import CheckoutScreen from "./src/screens/CheckoutScreen";
import OrderScreen from "./src/screens/OrderScreen";
import { readSlug, loadShop, placeOrder, payOrder } from "./src/lib/shop";
import DiscoveryScreen from "./src/screens/DiscoveryScreen";

const VENDOR_APP = "https://mego-vendor.pages.dev";
const RIDER_APP = "https://mego-rider.pages.dev";

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
  const [welcome, setWelcome] = useState(false);

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
  }, []);

  useEffect(() => {
    boot();
  }, [boot]);

  // CAS A (interrupteur desactive) : le client reste sur la page web de la boutique et paie, sans rien d'autre.
  // CAS B (interrupteur active) : le client entre dans l'application : pop-up d'accueil + acces a la Decouverte.
  const marketplaceOpen = !!(shop && shop.vendor && shop.vendor.is_marketplace_visible === true);

  useEffect(() => {
    if (!marketplaceOpen) return;
    try {
      const key = "mego_welcome_" + slug;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        setWelcome(true);
      }
    } catch (e) {
      setWelcome(true);
    }
  }, [marketplaceOpen, slug]);

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
    setOrderId(res.order_id);
    setCart({});
    setScreen("order");
    await payOrder(res.order_id);
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
      {marketplaceOpen ? (
        <Pressable
          onPress={() => setScreen("discovery")}
          className="absolute bottom-24 right-4 rounded-full bg-navy px-4 py-3"
        >
          <Text className="text-[13px] font-bold text-white">Decouverte</Text>
        </Pressable>
      ) : null}

      <Modal visible={welcome && marketplaceOpen} transparent animationType="fade" onRequestClose={() => setWelcome(false)}>
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full rounded-3xl bg-white p-5">
            <Text className="text-center text-[17px] font-bold text-ink">
              Bienvenue chez {shop && shop.vendor ? shop.vendor.name : "nous"}
            </Text>
            <Text className="mt-2 text-center text-[13px] text-muted">
              Commande ici, ou decouvre les produits des autres boutiques.
            </Text>
            <Pressable
              onPress={() => {
                setWelcome(false);
                setScreen("discovery");
              }}
              className="mt-4 items-center rounded-2xl bg-primary py-3 active:opacity-80"
            >
              <Text className="text-[14px] font-bold text-white">Decouvrir les boutiques</Text>
            </Pressable>
            <Pressable
              onPress={() => Linking.openURL(VENDOR_APP).catch(() => {})}
              className="mt-2 items-center rounded-2xl bg-chip py-3 active:opacity-80"
            >
              <Text className="text-[14px] font-semibold text-ink">Devenir vendeur</Text>
            </Pressable>
            <Pressable
              onPress={() => Linking.openURL(RIDER_APP).catch(() => {})}
              className="mt-2 items-center rounded-2xl bg-chip py-3 active:opacity-80"
            >
              <Text className="text-[14px] font-semibold text-ink">Devenir livreur</Text>
            </Pressable>
            <Pressable onPress={() => setWelcome(false)} className="mt-3 items-center py-2 active:opacity-70">
              <Text className="text-[13px] text-muted">Continuer ma commande</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
