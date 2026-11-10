import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import ScreenHeader from "../components/ScreenHeader";
import Icon from "../components/Icon";
import { getRiderLanguage, setRiderLanguage } from "../lib/db";

const LANGUAGES = [
  { code: "fr", label: "Français", hint: "France / Bénin" },
  { code: "en", label: "English", hint: "International" },
  { code: "fon", label: "Fon", hint: "Bénin" },
  { code: "yo", label: "Yoruba", hint: "Bénin / Nigeria" },
];

/**
 * Écran Langue : lit et écrit riders.language dans Supabase.
 */
export default function LanguageScreen({ riderId, onBack }) {
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!riderId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setCurrent(await getRiderLanguage(riderId));
      setError(null);
    } catch (e) {
      setError(e.message || "Lecture impossible");
    } finally {
      setLoading(false);
    }
  }, [riderId]);

  useEffect(() => {
    load();
  }, [load]);

  const choose = useCallback(
    async (code) => {
      if (!riderId) return;
      const previous = current;
      setCurrent(code);
      setSaving(code);
      try {
        await setRiderLanguage(riderId, code);
        setError(null);
      } catch (e) {
        setCurrent(previous);
        setError(e.message || "Enregistrement impossible");
      } finally {
        setSaving(null);
      }
    },
    [riderId, current]
  );

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader title="Langue" onBack={onBack} />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#76D865" />
        </View>
      ) : (
        <ScrollView contentContainerClassName="p-4">
          <Text className="mb-3 text-[13px] text-muted">
            Choisissez la langue de l'application. Le choix est enregistré sur votre profil livreur.
          </Text>
          {LANGUAGES.map((lang) => {
            const active = current === lang.code;
            return (
              <Pressable
                key={lang.code}
                onPress={() => choose(lang.code)}
                className={`mb-3 flex-row items-center rounded-xl bg-white p-4 shadow-sm ${active ? "border border-primary" : ""}`}
              >
                <View className="h-10 w-10 items-center justify-center rounded-full bg-chip">
                  <Icon name="globe" size={20} color={active ? "#76D865" : "#7E8B9B"} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-[15px] font-bold text-ink">{lang.label}</Text>
                  <Text className="text-[12px] text-muted">{lang.hint}</Text>
                </View>
                {saving === lang.code ? (
                  <ActivityIndicator size="small" color="#76D865" />
                ) : active ? (
                  <Icon name="check" size={20} color="#76D865" />
                ) : null}
              </Pressable>
            );
          })}
          {error ? <Text className="mt-2 text-[12px] text-red-500">{error}</Text> : null}
        </ScrollView>
      )}
    </View>
  );
}
