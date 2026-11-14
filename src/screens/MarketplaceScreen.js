import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, FlatList, TextInput, Linking, StyleSheet, ActivityIndicator, Platform } from "react-native";

// Marketplace sociale : boutiques visibles + produits, likes, commentaires.
// Source : fonction get_discovery (boutiques dont l'interrupteur is_marketplace_visible est active).
const API = "https://mprusmdpirucpcwqssfg.supabase.co";
const KEY = "sb_publishable_OqgLY_ICZBtu1-C_yN_hCA_J4U2zluA";
const SHOP = (process.env.EXPO_PUBLIC_SHOP_URL || "https://mego-shop.pages.dev").replace(/\/+$/, "");
const MEM = "d-" + Math.random().toString(36).slice(2) + Date.now().toString(36);

async function rpc(name, body) {
  const r = await fetch(API + "/rest/v1/rpc/" + name, {
    method: "POST",
    headers: { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  return r.json();
}

function deviceId() {
  try {
    let d = localStorage.getItem("mego_dev");
    if (!d) {
      d = MEM;
      localStorage.setItem("mego_dev", d);
    }
    return d;
  } catch (e) {
    return MEM;
  }
}

const money = (n) => Number(n || 0).toLocaleString("fr-FR") + " F";

function ShopCard({ shop, role }) {
  const [liked, setLiked] = useState(!!shop.liked);
  const [likes, setLikes] = useState(Number(shop.likes_count || 0));
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const toggleLike = async () => {
    try {
      const r = await rpc("toggle_shop_like", { p_slug: shop.slug, p_device_id: deviceId() });
      if (r && r.ok) {
        setLiked(!!r.liked);
        setLikes(Number(r.likes_count || 0));
      }
    } catch (e) {}
  };

  const toggleComments = async () => {
    const next = !open;
    setOpen(next);
    if (next && comments === null) {
      try {
        const d = await rpc("get_shop", { p_slug: shop.slug });
        setComments((d && d.comments) || []);
      } catch (e) {
        setComments([]);
      }
    }
  };

  const send = async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      const r = await rpc("add_shop_comment", { p_slug: shop.slug, p_device_id: deviceId(), p_author: role, p_body: body });
      if (r && r.ok) {
        setComments((c) => [{ id: r.comment_id, author_name: role, body }, ...(c || [])]);
        setText("");
      }
    } catch (e) {}
    setBusy(false);
  };

  const products = (shop.products || []).slice(0, 4);
  return (
    <View style={s.card}>
      <Text style={s.name}>{shop.name}</Text>
      {shop.category ? <Text style={s.muted}>{shop.category}</Text> : null}
      {shop.description ? <Text style={s.desc}>{shop.description}</Text> : null}
      <View style={s.chips}>
        {products.map((p) => (
          <View key={p.id} style={s.chip}>
            <Text style={s.chipTxt}>{p.name} · {money(p.price)}</Text>
          </View>
        ))}
      </View>
      <View style={s.row}>
        <Pressable onPress={toggleLike} style={s.btnGhost}>
          <Text style={s.btnGhostTxt}>{liked ? "♥" : "♡"} {likes}</Text>
        </Pressable>
        <Pressable onPress={toggleComments} style={s.btnGhost}>
          <Text style={s.btnGhostTxt}>💬 {comments ? comments.length : Number(shop.comments_count || 0)}</Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(SHOP + "/" + shop.slug).catch(() => {})} style={s.btn}>
          <Text style={s.btnTxt}>Voir la boutique</Text>
        </Pressable>
      </View>
      {open ? (
        <View style={s.comments}>
          <View style={s.row}>
            <TextInput value={text} onChangeText={setText} placeholder="Écrire un commentaire…" style={s.input} />
            <Pressable onPress={send} style={s.btn}>
              <Text style={s.btnTxt}>Envoyer</Text>
            </Pressable>
          </View>
          {comments === null ? <ActivityIndicator /> : null}
          {(comments || []).map((c) => (
            <Text key={c.id} style={s.comment}>
              <Text style={s.bold}>{c.author_name || "Membre"} </Text>
              {c.body}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function MarketplaceScreen({ role = "Membre", onClose }) {
  const [shops, setShops] = useState(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const d = await rpc("get_discovery", { p_limit: 30, p_offset: 0, p_device_id: deviceId() });
      setShops(Array.isArray(d) ? d : (d && d.shops) || []);
    } catch (e) {
      setError("Impossible de charger la marketplace.");
      setShops([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Text style={s.title}>Marketplace</Text>
        <Pressable onPress={onClose} style={s.btnGhost}>
          <Text style={s.btnGhostTxt}>Fermer ✕</Text>
        </Pressable>
      </View>
      {shops === null ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={shops}
          keyExtractor={(x) => x.slug}
          renderItem={({ item }) => <ShopCard shop={item} role={role} />}
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          ListEmptyComponent={<Text style={s.muted}>{error || "Aucune boutique n'est visible pour le moment."}</Text>}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f4f4f2", paddingTop: Platform.OS === "web" ? 0 : 44 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "700", color: "#1a1a1a" },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 12 },
  name: { fontSize: 17, fontWeight: "700", color: "#1a1a1a" },
  muted: { color: "#6b6b6b", fontSize: 13 },
  desc: { color: "#333", marginTop: 4 },
  chips: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  chip: { backgroundColor: "#f0efe9", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, marginRight: 6, marginBottom: 6 },
  chipTxt: { fontSize: 12, color: "#1a1a1a" },
  row: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  btn: { backgroundColor: "#0a7d4b", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, marginLeft: 6 },
  btnTxt: { color: "#fff", fontWeight: "600", fontSize: 13 },
  btnGhost: { backgroundColor: "#f0efe9", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginRight: 6 },
  btnGhostTxt: { color: "#1a1a1a", fontWeight: "600", fontSize: 13 },
  comments: { marginTop: 8, borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  comment: { marginTop: 6, color: "#333" },
  bold: { fontWeight: "700" },
});
