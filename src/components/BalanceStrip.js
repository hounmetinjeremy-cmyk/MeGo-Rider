import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";

// Bandeau des soldes, visible sur tous les ecrans : "Disponible" (retirable) et "En attente" (bloque jusqu'a la validation du code client).
const API = "https://mprusmdpirucpcwqssfg.supabase.co";
const KEY = "sb_publishable_OqgLY_ICZBtu1-C_yN_hCA_J4U2zluA";
const fmt = (n) => Number(n || 0).toLocaleString("fr-FR") + " FCFA";

export default function BalanceStrip({ kind }) {
  const [b, setB] = useState(null);

  useEffect(() => {
    let alive = true;
    let owner = null;
    const headers = { apikey: KEY, Authorization: "Bearer " + KEY };
    const tick = async () => {
      try {
        const t = localStorage.getItem("mego_session_" + kind);
        if (!t) return;
        if (!owner) {
          const r = await fetch(API + "/rest/v1/rpc/session_info", {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ p_token: t }),
          });
          const s = await r.json();
          if (!s || !s.ok) return;
          owner = s.owner_id;
        }
        const table = kind === "vendor" ? "vendors" : "riders";
        const r2 = await fetch(API + "/rest/v1/" + table + "?id=eq." + owner + "&select=wallet_balance,pending_balance", { headers });
        const d = await r2.json();
        if (alive && Array.isArray(d) && d[0]) setB(d[0]);
      } catch (e) {}
    };
    tick();
    const i = setInterval(tick, 15000);
    return () => {
      alive = false;
      clearInterval(i);
    };
  }, [kind]);

  if (!b) return null;
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: "#0b1422", paddingHorizontal: 14, paddingVertical: 6 }}>
      <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "700" }}>Disponible : {fmt(b.wallet_balance)}</Text>
      <Text style={{ color: "#f5b942", fontSize: 12, fontWeight: "700" }}>En attente : {fmt(b.pending_balance)}</Text>
    </View>
  );
}
