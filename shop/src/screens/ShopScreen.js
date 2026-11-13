import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, Image } from "react-native";
import Icon from "../components/Icon";
import ProductCard from "../components/ProductCard";
import CartBar from "../components/CartBar";

export default function ShopScreen({ shop, cart, add, remove, onCheckout }) {
  const [cat, setCat] = useState("Tout");
  const vendor = shop.vendor || {};
  const products = shop.products || [];
  const cats = useMemo(() => {
    const s = [];
    products.forEach((p) => {
      if (p.category && s.indexOf(p.category) === -1) s.push(p.category);
    });
    return ["Tout"].concat(s);
  }, [products]);
  const list = cat === "Tout" ? products : products.filter((p) => p.category === cat);
  const count = Object.keys(cart).reduce((a, k) => a + cart[k], 0);
  const total = products.reduce((a, p) => a + (cart[p.id] || 0) * Number(p.price || 0), 0);
  const open = vendor.is_open !== false;

  return (
    <View className="flex-1 bg-surface">
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="bg-navy px-4 pb-5 pt-6">
          <View className="flex-row items-center">
            {vendor.logo_url ? (
              <Image source={{ uri: vendor.logo_url }} className="h-14 w-14 rounded-2xl" />
            ) : (
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                <Icon name="package" size={24} color="#FFFFFF" />
              </View>
            )}
            <View className="ml-3 flex-1">
              <Text className="text-[18px] font-extrabold text-white">{vendor.name}</Text>
              <Text className="mt-0.5 text-[12px] text-white/70">{vendor.address || "Cotonou"}</Text>
            </View>
          </View>
          <View className="mt-3 flex-row items-center">
            <View className={"rounded-full px-2.5 py-1 " + (open ? "bg-primary/20" : "bg-red-500/20")}>
              <Text className={"text-[11px] font-bold " + (open ? "text-primary" : "text-red-300")}>
                {open ? "Ouvert" : "Fermé"}
              </Text>
            </View>
            {vendor.phone ? (
              <Text className="ml-3 text-[12px] text-white/70">{vendor.phone}</Text>
            ) : null}
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3 px-4">
          {cats.map((c) => (
            <Pressable key={c} onPress={() => setCat(c)} className={"mr-2 rounded-full px-3 py-1.5 " + (c === cat ? "bg-navy" : "bg-white")}>
              <Text className={"text-[12px] font-semibold " + (c === cat ? "text-white" : "text-ink")}>{c}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View className="mt-3 px-4">
          {list.length === 0 ? (
            <View className="items-center rounded-2xl bg-white py-10">
              <Icon name="package" size={26} color="#7E8B9B" />
              <Text className="mt-2 text-[13px] text-muted">Aucun produit pour le moment</Text>
            </View>
          ) : (
            list.map((p) => (
              <ProductCard key={p.id} product={p} qty={cart[p.id] || 0} onAdd={() => add(p)} onRemove={() => remove(p)} />
            ))
          )}
        </View>
      </ScrollView>

      <CartBar count={count} total={total} onPress={onCheckout} />
    </View>
  );
}
