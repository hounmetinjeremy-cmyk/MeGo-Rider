import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import AppHeader from "../components/AppHeader";
import { Card } from "../components/Kit";
import { getVendorLanguage, setVendorLanguage } from "../lib/db";

const LANGS = [
  { code: "fr", label: "Francais" },
  { code: "en", label: "English" },
];

export default function LanguageScreen({ vendor, onMenuPress, onBack }) {
  const [lang, setLang] = useState("fr");

  useEffect(() => {
    (async () => {
      if (!vendor?.id) return;
      try {
        const value = await getVendorLanguage(vendor.id);
        if (value) setLang(value);
      } catch (e) {
        // erreur ignoree
      }
    })();
  }, [vendor?.id]);

  const choose = async (code) => {
    setLang(code);
    try {
      await setVendorLanguage(vendor.id, code);
    } catch (e) {
      // erreur ignoree
    }
  };

  return (
    <View className="flex-1">
      <AppHeader title="Langue" subtitle={vendor?.name} onMenuPress={onMenuPress} />
      <ScrollView className="flex-1 px-4 pt-4">
        {LANGS.map((l) => (
          <Pressable key={l.code} onPress={() => choose(l.code)}>
            <Card>
              <Text className="text-[15px] text-ink">{l.label}</Text>
              {lang === l.code ? (
                <Text className="text-[12px] text-primary">Selectionne</Text>
              ) : null}
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
