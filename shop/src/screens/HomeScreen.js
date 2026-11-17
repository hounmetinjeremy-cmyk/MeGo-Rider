import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, FlatList, TextInput, Image, Linking, StyleSheet, ActivityIndicator } from "react-native";
import { supabase } from "../lib/supabaseClient";
import { deviceId } from "../lib/shop";

// ACCUEIL PUBLIC : tout ce que chaque vendeur a publie, pour tout le monde (clients, vendeurs, livreurs).
// Toucher une publication ouvre la boutique complete du vendeur : on peut y ajouter au panier et payer.
const PAGE = 10;
const VENDOR_APP = "https://mego-vendor.pages.dev";
const RIDER_APP = "https://mego-rider.pages.dev";
const money = (n) => Number(n || 0).toLocaleString("fr-FR") + " FCFA";

function ago(d) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (!(s >= 0) || s < 60) return "a l'instant";
  if (s < 3600) return Math.floor(s / 60) + " min";
  if (s < 86400) return Math.floor(s / 3600) + " h";
  return Math.floor(s / 86400) + " j";
}

const openShop = (slug) => {
  try {
    window.location.href = "/" + slug;
  } catch (e) {}
};

function Post({ post }) {
  const [liked, setLiked] = useState(!!post.liked);
  const [likes, setLikes] = useState(Number(post.likes_count || 0));
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState(null);
  const [count, setCount] = useState(Number(post.comments_count || 0));
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const toggleLike = async () => {
    const { data } = await supabase.rpc("toggle_product_like", { p_product_id: post.id, p_device_id: deviceId() || null });
    if (data && data.ok) {
      setLiked(!!data.liked);
      setLikes(Number(data.likes_count || 0));
    }
  };

  const toggleComments = async () => {
    const next = !open;
    setOpen(next);
    if (next && comments === null) {
      const { data } = await supabase.rpc("get_product_comments", { p_product_id: post.id });
      setComments(Array.isArray(data) ? data : []);
    }
  };

  const send = async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    const { data } = await supabase.rpc("add_product_comment", { p_product_id: post.id, p_device_id: deviceId() || null, p_author: "Client", p_body: body });
    setBusy(false);
    if (data && data.ok) {
      setComments((c) => [{ id: data.comment_id, author_name: "Client", body }, ...(c || [])]);
      setCount((n) => n + 1);
      setText("");
    }
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
          <Text style={s.actionMainTxt}>Acheter</Text>
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

export default function HomeScreen({ onBack }) {
  const [posts, setPosts] = useState(null);
  const [more, setMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchPage = async (offset) => {
    const { data, error: err } = await supabase.rpc("get_feed", { p_limit: PAGE, p_offset: offset, p_device_id: deviceId() || null });
    if (err) throw err;
    return Array.isArray(data) ? data : [];
  };

  const load = useCallback(async () => {
    setError("");
    try {
      const list = await fetchPage(0);
      setPosts(list);
      setMore(list.length === PAGE);
    } catch (e) {
      setError("Impossible de charger les publications.");
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
        {onBack ? (
          <Pressable onPress={onBack} style={s.back}>
            <Text style={s.backTxt}>←</Text>
          </Pressable>
        ) : null}
        <Text style={[s.pageTitle, { flex: 1 }]}>MeGo</Text>
      </View>
      {posts === null ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(x) => x.id}
          renderItem={({ item }) => <Post post={item} />}
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            <View style={{ padding: 16, alignItems: "center" }}>
              {loadingMore ? <ActivityIndicator /> : null}
              <Text style={s.muted}>Tu vends ou tu livres ?</Text>
              <View style={{ flexDirection: "row", marginTop: 6 }}>
                <Pressable onPress={() => Linking.openURL(VENDOR_APP).catch(() => {})} style={s.cta}>
                  <Text style={s.ctaTxt}>Devenir vendeur</Text>
                </Pressable>
                <Pressable onPress={() => Linking.openURL(RIDER_APP).catch(() => {})} style={s.cta}>
                  <Text style={s.ctaTxt}>Devenir livreur</Text>
                </Pressable>
              </View>
            </View>
          }
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
  back: { backgroundColor: "#f0efe9", borderRadius: 20, width: 40, height: 40, alignItems: "center", justifyContent: "center", marginRight: 8 },
  backTxt: { fontSize: 18, color: "#1a1a1a" },
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
  cta: { backgroundColor: "#f0efe9", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 4 },
  ctaTxt: { fontWeight: "700", color: "#1a1a1a", fontSize: 13 },
});
