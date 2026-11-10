import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import ScreenHeader from "../components/ScreenHeader";
import Icon from "../components/Icon";
import { getRider, updateRider } from "../lib/db";

const VEHICLES = [
  { key: "Scooter", icon: "bike", desc: "Rapide en ville, idéal pour les petites courses" },
  { key: "Moto", icon: "bike", desc: "Pour les livraisons plus lourdes" },
  { key: "Vélo", icon: "bike", desc: "Économique, pour les courtes distances" },
  { key: "Voiture", icon: "truck", desc: "Pour les gros volumes" },
];

export default function VehicleScreen({ riderId, onBack }) {
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!riderId) {
      setLoading(false);
      return;
    }
    try {
      const row = await getRider(riderId);
      setCurrent(row ? row.vehicle_type : null);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [riderId]);

  useEffect(() => {
    load();
  }, [load]);

  const choose = useCallback(
    async (key) => {
      if (!riderId || saving) return;
      setSaving(key);
      const previous = current;
      setCurrent(key);
      try {
        await updateRider(riderId, { vehicle_type: key });
        setError(null);
      } catch (e) {
        setCurrent(previous);
        setError(e.message);
      } finally {
        setSaving(null);
      }
    },
    [riderId, saving, current]
  );

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader title="Type de véhicule" onBack={onBack} />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#76D865" />
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
          {error ? (
            <Text className="mb-3 text-[12px] text-red-500">{error}</Text>
          ) : null}
          {VEHICLES.map((v) => {
            const active = current === v.key;
            return (
              <Pressable
                key={v.key}
                onPress={() => choose(v.key)}
                className={`mb-3 flex-row items-center rounded-xl border p-4 ${
                  active ? "border-primary bg-primary-soft" : "border-line bg-white"
                }`}
              >
                <View className="h-11 w-11 items-center justify-center rounded-full bg-chip">
                  <Icon name={v.icon} size={22} color={active ? "#76D865" : "#1A2433"} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-[15px] font-bold text-ink">{v.key}</Text>
                  <Text className="text-[12px] text-muted">{v.desc}</Text>
                </View>
                {saving === v.key ? (
                  <ActivityIndicator color="#76D865" />
                ) : active ? (
                  <Icon name="check" size={20} color="#76D865" />
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
