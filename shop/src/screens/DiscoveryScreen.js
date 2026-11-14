import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Image, TextInput, ActivityIndicator, RefreshControl } from "react-native";
import Icon from "../components/Icon";
import { loadDiscovery, toggleLike, addComment, money } from "../lib/shop";

function ShopCard({ shop, onOpen, onLike, onComment }) {
  const [open, setOpen] = useState(false);
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const products = shop.products || [];
  const comments = shop.comments || [];

  const send = async () => {
    if (busy) return;
    setBusy(true);
    setErr("");
    const res = await onComment(shop.slug, author, body);
    setBusy(false);
    if (!res || res.ok === false) {
      setErr((res && res.error) || "Commentaire impossible");
      return;
    }
    setBody("");
  };

  return (
    <View className="mb-3 rounded-2xl bg-white p-4">
      <Pressable onPress={() => onOpen(shop.slug)} className="flex-row items-center">
        {shop.logo_url ? (
          <Image source={{ uri: shop.logo_url }} className="h-14 w-14 rounded-2xl" />
        ) : (
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-chip">
            <Icon name="package" size={24} color="#7E8B9B" />
          </View>
        )}
        <View className="ml-3 flex-1">
          <Text className="text-[16px] font-bold text-ink" numberOfLines={1}>
            {shop.name || "Boutique"}
          </Text>
          <Text className="text-[12px] text-muted" numberOfLines={1}>
            {[shop.category, shop.address].filter(Boolean).join(" · ") || "MeGo"}
          </Text>
        </View>
      </Pressable>

      {shop.description ? (
        <Text className="mt-2 text-[13px] text-muted" numberOfLines={2}>
          {shop.description}
        </Text>
      ) : null}

      {products.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
          {products.map((p) => (
            <View key={p.id} className="mr-2 w-28 rounded-xl bg-surface p-2">
              {p.image_url ? (
                <Image source={{ uri: p.image_url }} className="h-16 w-full rounded-lg" />
              ) : (
                <View className="h-16 w-full items-center justify-center rounded-lg bg-chip">
                  <Icon name="package" size={18} color="#7E8B9B" />
                </View>
              )}
              <Text className="mt-1 text-[12px] font-bold text-ink" numberOfLines={1}>
                {p.name}
              </Text>
              <Text className="text-[11px] text-muted">{money(p.price)}</Text>
            </View>
          ))}
        </ScrollView>
      ) : null}

      <View className="mt-3 flex-row items-center">
        <Pressable onPress={() => onLike(shop.slug)} className="mr-2 flex-row items-center rounded-full bg-surface px-3 py-1.5">
          <Icon name="check" size={14} color={shop.liked ? "#76D865" : "#7E8B9B"} />
          <Text className="ml-1 text-[12px] font-bold text-ink">{shop.likes_count || 0}</Text>
        </Pressable>
        <Pressable onPress={() => setOpen((v) => !v)} className="flex-row items-center rounded-full bg-surface px-3 py-1.5">
          <Icon name="info" size={14} color="#7E8B9B" />
          <Text className="ml-1 text-[12px] font-bold text-ink">{comments.length}</Text>
        </Pressable>
        <View className="flex-1" />
        <Pressable onPress={() => onOpen(shop.slug)} className="rounded-full bg-navy px-4 py-1.5">
          <Text className="text-[12px] font-bold text-white">Voir la boutique</Text>
        </Pressable>
      </View>

      {open ? (
        <View className="mt-3 rounded-xl bg-surface p-3">
          {comments.length === 0 ? (
            <Text className="text-[12px] text-muted">Aucun commentaire pour le moment.</Text>
          ) : (
            comments.map((c) => (
              <View key={c.id} className="mb-2">
                <Text className="text-[12px] font-bold text-ink">{c.author || "Client"}</Text>
                <Text className="text-[12px] text-muted">{c.body}</Text>
              </View>
            ))
          )}
          <TextInput
            value={author}
            onChangeText={setAuthor}
            placeholder="Ton nom"
            className="mt-2 rounded-lg bg-white px-3 py-2 text-[13px] text-ink"
          />
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Ton commentaire"
            multiline
            className="mt-2 rounded-lg bg-white px-3 py-2 text-[13px] text-ink"
          />
          {err ? <Text className="mt-1 text-[12px] text-red-500">{err}</Text> : null}
          <Pressable onPress={send} disabled={busy} className="mt-2 items-center rounded-lg bg-navy py-2">
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-[13px] font-bold text-white">Publier</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export default function DiscoveryScreen({ onBack, onOpenShop }) {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const data = await loadDiscovery(30, 0);
    if (Array.isArray(data)) {
      setShops(data);
    } else if (data && data.ok === false) {
      setError(data.error || "Chargement impossible");
      setShops([]);
    } else {
      setShops([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onLike = async (slug) => {
    const res = await toggleLike(slug);
    if (!res || res.ok === false) return;
    setShops((list) =>
      list.map((s) =>
        s.slug === slug
          ? { ...s, liked: res.liked === true, likes_count: res.likes_count != null ? res.likes_count : s.likes_count }
          : s
      )
    );
  };

  const onComment = async (slug, author, body) => {
    const res = await addComment(slug, author, body);
    if (res && res.ok !== false) await load();
    return res;
  };

  const open = (slug) => {
    if (typeof onOpenShop === "function") onOpenShop(slug);
  };

  return (
    <View className="flex-1 bg-surface">
      <View className="flex-row items-center bg-navy px-4 pb-4 pt-6">
        <Pressable onPress={onBack} className="mr-3">
          <Icon name="close" size={22} color="#FFFFFF" />
        </Pressable>
        <Text className="text-[16px] font-bold text-white">Découverte</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#76D865" size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        >
          {error ? <Text className="mb-3 text-[13px] text-red-500">{error}</Text> : null}
          {shops.length === 0 && !error ? (
            <View className="items-center rounded-2xl bg-white py-10">
              <Icon name="info" size={24} color="#7E8B9B" />
              <Text className="mt-2 text-[13px] text-muted">Aucune boutique dans le flux pour le moment.</Text>
            </View>
          ) : (
            shops.map((s) => (
              <ShopCard key={s.id || s.slug} shop={s} onOpen={open} onLike={onLike} onComment={onComment} />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
