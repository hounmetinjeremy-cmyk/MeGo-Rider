import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { Pressable } from "react-native";

// Bandeau des soldes (livreur), visible sur tous les ecrans :
// Disponible (retirable), En attente (bloque jusqu'a la validation du code client) et Garantie (caution exigee pour recevoir des courses).
const API = "https://mprusmdpirucpcwqssfg.supabase.co";
const KEY = "sb_publishable_OqgLY_ICZBtu1-C_yN_hCA_J4U2zluA";
const fmt = (n) => Number(n || 0).toLocaleString("fr-FR") + " F";
const headers = { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json" };

export default function BalanceStrip({ kind }) {
  const [b, setB] = useState(null);
  const [testMode, setTestMode] = useState(false);
  const [msg, setMsg] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    let owner = null;
    const run = async () => {
      try {
        const t = localStorage.getItem("mego_session_" + kind);
        if (!t) return;
        if (!owner) {
          const r = await fetch(API + "/rest/v1/rpc/session_info", { method: "POST", headers, body: JSON.stringify({ p_token: t }) });
          const s = await r.json();
          if (!s || !s.ok) return;
          owner = s.owner_id;
        }
        const table = kind === "vendor" ? "vendors" : "riders";
        const cols = kind === "vendor" ? "wallet_balance,pending_balance" : "wallet_balance,pending_balance,guarantee_balance";
        const r2 = await fetch(API + "/rest/v1/" + table + "?id=eq." + owner + "&select=" + cols, { headers });
        const d = await r2.json();
        if (alive && Array.isArray(d) && d[0]) setB(d[0]);
      } catch (e) {}
    };
    run();
    const i = setInterval(run, 15000);
    return () => {
      alive = false;
      clearInterval(i);
    };
  }, [kind, tick]);

  useEffect(() => {
    if (kind !== "rider") return;
    fetch(API + "/rest/v1/rpc/get_payment_config", { method: "POST", headers, body: "{}" })
      .then((r) => r.json())
      .then((c) => setTestMode(!!(c && c.test)))
      .catch(() => {});
  }, [kind]);

  const topup = async () => {
    setMsg("");
    try {
      const t = localStorage.getItem("mego_session_rider");
      const r = await fetch(API + "/rest/v1/rpc/test_topup_guarantee", { method: "POST", headers, body: JSON.stringify({ p_token: t, p_amount: 20000 }) });
      const d = await r.json();
      setMsg(d && d.ok ? "+20 000 F de garantie (test)" : (d && d.error) || "Echec");
      setTick((x) => x + 1);
    } catch (e) {
      setMsg("Echec");
    }
  };

  if (!b) return null;
  const rider = kind === "rider";
  return (
    <View style={{ backgroundColor: "#0b1422", paddingHorizontal: 14, paddingVertical: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "700" }}>Disponible : {fmt(b.wallet_balance)}</Text>
        <Text style={{ color: "#f5b942", fontSize: 12, fontWeight: "700" }}>En attente : {fmt(b.pending_balance)}</Text>
      </View>
      {rider ? (
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 3 }}>
          <Text style={{ color: "#7fd6a1", fontSize: 12, fontWeight: "700" }}>Garantie : {fmt(b.guarantee_balance)}</Text>
          {testMode ? (
            <Pressable onPress={topup}>
              <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "700", textDecorationLine: "underline" }}>{msg || "+ Garantie (test)"}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
