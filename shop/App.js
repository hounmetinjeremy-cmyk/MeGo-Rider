import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Pressable, ScrollView } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import Icon from "./src/components/Icon";
import ShopScreen from "./src/screens/ShopScreen";
import CheckoutScreen from "./src/screens/CheckoutScreen";
import OrderScreen from "./src/screens/OrderScreen";
import { readSlug, loadShop, placeOrder, payOrder } from "./src/lib/shop";
import DiscoveryScreen from "./src/screens/DiscoveryScreen";

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

  // CAS A (false) : vitrine privee, aucun acces vers le flux global / devenir vendeur / livreur.
  // CAS B (true) : bouton discret vers la marketplace.
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
    const res = await placeOrder({ slug, items, name, phone, address, lat: null, lng: null, note, zoneId });
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
