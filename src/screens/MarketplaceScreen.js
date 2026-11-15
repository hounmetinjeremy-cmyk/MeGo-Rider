import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, FlatList, TextInput, Image, Linking, StyleSheet, ActivityIndicator } from "react-native";

// Accueil : fil de publications façon réseau social. Chaque produit publié par un vendeur
// (dont l'interrupteur marketplace est activé) apparaît ici pour tous les utilisateurs.
// Toucher une publication ouvre la boutique complète du vendeur (panier + paiement).
const API = "https://mprusmdpirucpcwqssfg.supabase.co";
const KEY = "sb_publishable_OqgLY_ICZBtu1-C_yN_hCA_J4U2zluA";
const SHOP = (process.env.EXPO_PUBLIC_SHOP_URL || "https://mego-shop.pages.dev").replace(/\/+$/, "");
const MEM = "d-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
const PAGE = 10;

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

const money = (n) => Number(n || 0).toLocaleString("fr-FR") + " FCFA";

function ago(d) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (!(s >= 0) || s < 60) return "a l'instant";
  if (s < 3600) return Math.floor(s / 60) + " min";
  if (s < 86400) return Math.floor(s / 3600) + " h";
  return Math.floor(s / 86400) + " j";
}

const openShop = (slug) => Linking.openURL(SHOP + "/" + slug).catch(() => {});

function Post({ post, role }) {
  const [liked, setLiked] = useState(!!post.liked);
  const [likes, setLikes] = useState(Number(post.likes_count || 0));
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState(null);
  const [count, setCount] = useState(Number(post.comments_count || 0));
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const toggleLike = async () => {
    try {
      const r = await rpc("toggle_product_like", { p_product_id: post.id, p_device_id: deviceId() });
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
        const d = await rpc("get_product_comments", { p_product_id: post.id });
        setComments(Array.isArray(d) ? d : []);
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
      const r = await rpc("add_product_comment", { p_product_id: post.id, p_device_id: deviceId(), p_author: role, p_body: body });
      if (r && r.ok) {
        setComments((c) => [{ id: r.comment_id, author_name: role, body }, ...(c || [])]);
        setCount((n) => n + 1);
        setText("");
      }
    } catch (e) {}
    setBusy(false);
  };

  return (
    <View style={s.card}>
      <Pressable onPress={() => openShop(post.vendor_slug)} style={s.head}>
        {post.vendor_logo ? (
          <Image source={{ uri: post.vendor_logo }} style={s.avatar} />
        ) : (
          <View style={[s.avatar, s.avatarFallback]}>
            <Text style={s.avatarTxt}>{(post.vendor_name || "?").slice(0, 1).toUpperCase()}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={s.vendor}>{post.vendor_name}</Text>
          <Text style={s.muted}>{ago(post.created_at)}{post.vendor_category ? " · " + post.vendor_category : ""}</Text>
        </View>
      </Pressable>

      <Pressable onPress={() => openShop(post.vendor_slug)}>
        <Text style={s.title}>{post.name}</Text>
        {post.description ? <Text style={s.desc}>{post.description}</Text> : null}
        {post.image_url ? <Image source={{ uri: post.image_url }} style={s.photo} resizeMode="cover" /> : null}
        <Text style={s.price}>{money(post.price)}</Text>
      </Pressable>

      <View style={s.counts}>
        <Text style={s.muted}>{likes} j'aime</Text>
        <Text style={s.muted}>{count} commentaire{count > 1 ? "s" : ""}</Text>
      </View>
      <View style={s.actions}>
        <Pressable onPress={toggleLike} style={s.action}>
          <Text style={[s.actionTxt, liked && { color: "#e0245e" }]}>{liked ? "♥" : "♡"} J'aime</Text>
        </Pressable>
        <Pressable onPress={toggleComments} style={s.action}>
          <Text style={s.actionTxt}>💬 Commenter</Text>
        </Pressable>
        <Pressable onPress={() => openShop(post.vendor_slug)} style={[s.action, s.actionMain]}>
          <Text style={s.actionMainTxt}>Voir la boutique</Text>
        </Pressable>
      </View>

      {open ? (
        <View style={s.comments}>
          <View style={s.row}>
            <TextInput value={text} onChangeText={setText} placeholder="Écrire un commentaire…" style={s.input} />
            <Pressable onPress={send} style={s.send}>
              <Text style={s.actionMainTxt}>Envoyer</Text>
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

export default function MarketplaceScreen({ role = "Membre", onMenuPress, onClose }) {
  const [posts, setPosts] = useState(null);
  const [more, setMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchPage = async (offset) => {
    const d = await rpc("get_feed", { p_limit: PAGE, p_offset: offset, p_device_id: deviceId() });
    return Array.isArray(d) ? d : [];
  };

  const load = useCallback(async () => {
    setError("");
    try {
      const list = await fetchPage(0);
      setPosts(list);
      setMore(list.length === PAGE);
    } catch (e) {
      setError("Impossible de charger le fil.");
      setPosts([]);
    }
  }, []);

  const loadMore = async () => {
    if (!more || loadingMore || !posts) return;
    setLoadingMore(true);
    try {
      const list = await fetchPage(posts.length);
      setPosts((p) => [...(p || []), ...list.filter((x) => !(p || []).some((y) => y.id === x.id))]);
      setMore(list.length === PAGE);
    } catch (e) {}
    setLoadingMore(false);
  };

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={s.screen}>
      <View style={s.header}>
        {onMenuPress ? (
          <Pressable onPress={onMenuPress} style={s.menu}>
            <Text style={s.menuTxt}>☰</Text>
          </Pressable>
        ) : null}
        <Text style={[s.pageTitle, { flex: 1 }]}>Accueil</Text>
        {onClose ? (
          <Pressable onPress={onClose} style={s.menu}>
            <Text style={s.menuTxt}>✕</Text>
          </Pressable>
        ) : null}
      </View>
      {posts === null ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(x) => x.id}
          renderItem={({ item }) => <Post post={item} role={role} />}
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ margin: 16 }} /> : null}
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: 40 }}
          ListEmptyComponent={<Text style={[s.muted, { textAlign: "center", marginTop: 40 }]}>{error || "Aucune publication pour le moment."}</Text>}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f0f2f5" },
  header: { flexDirection: "row", alignItems: "center", padding: 12, backgroundColor: "#fff" },
  pageTitle: { fontSize: 22, fontWeight: "800", color: "#0a7d4b" },
  menu: { backgroundColor: "#f0efe9", borderRadius: 20, width: 40, height: 40, alignItems: "center", justifyContent: "center", marginRight: 8 },
  menuTxt: { fontSize: 18, color: "#1a1a1a" },
  card: { backgroundColor: "#fff", marginBottom: 10, paddingTop: 12 },
  head: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, marginBottom: 8 },
  avatar: { width: 42, height: 42, borderRadius: 21, marginRight: 10, backgroundColor: "#e4e6eb" },
  avatarFallback: { alignItems: "center", justifyContent: "center", backgroundColor: "#0a7d4b" },
  avatarTxt: { color: "#fff", fontWeight: "700", fontSize: 17 },
  vendor: { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
  muted: { color: "#6b6b6b", fontSize: 12 },
  title: { fontSize: 16, fontWeight: "700", color: "#1a1a1a", paddingHorizontal: 12 },
  desc: { color: "#333", paddingHorizontal: 12, marginTop: 2, marginBottom: 8 },
  photo: { width: "100%", height: 260, marginTop: 6, backgroundColor: "#e4e6eb" },
  price: { fontSize: 17, fontWeight: "800", color: "#0a7d4b", paddingHorizontal: 12, paddingTop: 8 },
  counts: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 8 },
  actions: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#eee", paddingVertical: 6, paddingHorizontal: 8, alignItems: "center" },
  action: { flex: 1, alignItems: "center", paddingVertical: 8 },
  actionTxt: { fontWeight: "600", color: "#444", fontSize: 13 },
  actionMain: { backgroundColor: "#0a7d4b", borderRadius: 10, marginLeft: 6 },
  actionMainTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },
  comments: { paddingHorizontal: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 8 },
  row: { flexDirection: "row", alignItems: "center" },
  input: { flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  send: { backgroundColor: "#0a7d4b", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, marginLeft: 6 },
  comment: { marginTop: 6, color: "#333" },
  bold: { fontWeight: "700" },
});
