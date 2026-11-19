import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, Linking, Share, Platform } from "react-native";
import { supabase } from "../lib/supabaseClient";

// GPS du telephone (APK / iOS). Absent = on retombe sur le navigateur.
let Location = null;
try {
  Location = require("expo-location");
} catch (e) {
  Location = null;
}

const SHOP_BASE = (
  process.env.EXPO_PUBLIC_SHOP_URL || "https://mego-shop.pages.dev"
).replace(/\/+$/, "");

/**
 * Carte « Ma boutique » : le lien à partager avec les clients (WhatsApp, Facebook, copie)
 * et la position de la boutique, utilisée pour trouver le livreur le plus proche.
 * Le nom court (slug) est créé automatiquement par la base à partir du nom de la boutique.
 */
export default function ShopLinkCard({ vendor }) {
  const [slug, setSlug] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | missing
  const [copied, setCopied] = useState(false);
  const [hasPosition, setHasPosition] = useState(false);
  const [posBusy, setPosBusy] = useState(false);
  const [posMsg, setPosMsg] = useState("");

  useEffect(() => {
    let alive = true;
    if (!vendor || !vendor.id) return undefined;
    setStatus("loading");
    supabase
      .from("vendors")
      .select("slug, latitude, longitude")
      .eq("id", vendor.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return;
        if (error || !data || !data.slug) {
          setStatus("missing");
        } else {
          setSlug(data.slug);
          setHasPosition(data.latitude != null && data.longitude != null);
          setStatus("ready");
        }
      })
      .catch(() => alive && setStatus("missing"));
    return () => {
      alive = false;
    };
  }, [vendor && vendor.id]);

  const url = slug ? `${SHOP_BASE}/${slug}` : "";
  const message = `Commande chez ${vendor && vendor.name ? vendor.name : "ma boutique"} et fais-toi livrer : ${url}`;

  const copy = useCallback(async () => {
    try {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        await Share.share({ message: url });
      }
    } catch (e) {
      // copie refusée par le navigateur : le lien reste affiché, on peut le sélectionner
    }
  }, [url]);

  const whatsapp = useCallback(() => {
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`).catch(() => {});
  }, [message]);

  const facebook = useCallback(() => {
    Linking.openURL(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
    ).catch(() => {});
  }, [url]);

  const share = useCallback(() => {
    Share.share({ message }).catch(() => {});
  }, [message]);

  /** Enregistre la position actuelle comme position de la boutique (le livreur vient la chercher ici). */
  const savePosition = useCallback(async () => {
    if (!vendor || !vendor.id) return;
    setPosBusy(true);
    setPosMsg("");

    const store = async (lat, lng) => {
      const { error } = await supabase.from("vendors").update({ latitude: lat, longitude: lng }).eq("id", vendor.id);
      setPosBusy(false);
      if (error) {
        setPosMsg("Enregistrement impossible, réessaie.");
      } else {
        setHasPosition(true);
        setPosMsg("Position de la boutique enregistrée.");
      }
    };

    // APK / iOS : GPS du telephone (navigator.geolocation n'est pas fiable sur mobile).
    if (Platform.OS !== "web") {
      try {
        if (!Location) throw new Error("localisation indisponible");
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status !== "granted") {
          setPosBusy(false);
          setPosMsg("Position refusée : autorise la localisation pour l'application, puis réessaie.");
          return;
        }
        const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        await store(p.coords.latitude, p.coords.longitude);
      } catch (e) {
        setPosBusy(false);
        setPosMsg("Position indisponible. Active le GPS du téléphone, puis réessaie.");
      }
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setPosBusy(false);
      setPosMsg("Position indisponible sur cet appareil.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        store(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setPosBusy(false);
        setPosMsg("Position refusée : autorise la localisation dans le navigateur, puis réessaie.");
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, [vendor && vendor.id]);

  return (
    <View className="mx-4 mt-4 rounded-xl bg-white p-4 shadow-sm">
      <Text className="text-[15px] font-bold text-ink">Ma boutique</Text>
      {status === "loading" ? (
        <Text className="mt-2 text-[13px] text-muted">Chargement du lien…</Text>
      ) : null}
      {status === "missing" ? (
        <Text className="mt-2 text-[13px] text-muted">
          Le lien de ta boutique n'est pas encore disponible. Il apparaît dès que la base de données est mise à jour.
        </Text>
      ) : null}
      {status === "ready" ? (
        <View>
          <Text selectable className="mt-2 rounded-lg bg-chip px-3 py-2 text-[13px] text-ink">
            {url}
          </Text>
          <Text className="mt-2 text-[12px] text-muted">
            Partage ce lien à tes clients : ils choisissent leurs produits et commandent, un livreur vient chez toi.
          </Text>
          <View className="mt-3 flex-row">
            <Pressable onPress={copy} className="mr-2 flex-1 items-center rounded-lg bg-navy py-2.5 active:opacity-80">
              <Text className="text-[12px] font-semibold text-white">{copied ? "Copié" : "Copier"}</Text>
            </Pressable>
            <Pressable onPress={whatsapp} className="mr-2 flex-1 items-center rounded-lg bg-primary py-2.5 active:opacity-80">
              <Text className="text-[12px] font-semibold text-white">WhatsApp</Text>
            </Pressable>
            <Pressable onPress={facebook} className="mr-2 flex-1 items-center rounded-lg bg-chip py-2.5 active:opacity-80">
              <Text className="text-[12px] font-semibold text-ink">Facebook</Text>
            </Pressable>
            <Pressable onPress={share} className="flex-1 items-center rounded-lg bg-chip py-2.5 active:opacity-80">
              <Text className="text-[12px] font-semibold text-ink">Autre</Text>
            </Pressable>
          </View>

          <View className="mt-4 border-t border-line pt-3">
            <Text className="text-[13px] font-semibold text-ink">
              Position de la boutique : {hasPosition ? "enregistrée" : "non enregistrée"}
            </Text>
            <Text className="mt-1 text-[12px] text-muted">
              Le livreur le plus proche de cette position vient récupérer les commandes. Fais-le depuis ta boutique.
            </Text>
            <Pressable
              onPress={savePosition}
              disabled={posBusy}
              className="mt-2 items-center rounded-lg bg-chip py-2.5 active:opacity-80"
            >
              <Text className="text-[12px] font-semibold text-ink">
                {posBusy ? "Recherche de ta position…" : "Utiliser ma position actuelle"}
              </Text>
            </Pressable>
            {posMsg ? <Text className="mt-2 text-[12px] text-muted">{posMsg}</Text> : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}
