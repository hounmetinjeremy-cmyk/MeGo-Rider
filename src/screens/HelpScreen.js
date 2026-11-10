import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, RefreshControl } from "react-native";
import ScreenHeader from "../components/ScreenHeader";
import Icon from "../components/Icon";
import { fetchHelpTopics, fetchMyTickets, createSupportTicket } from "../lib/db";

/**
 * Écran Aide : sujets lus dans help_topics, tickets écrits dans support_tickets.
 */
export default function HelpScreen({ riderId, onBack }) {
  const [topics, setTopics] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [openTopic, setOpenTopic] = useState(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [t, k] = await Promise.all([
        fetchHelpTopics(),
        riderId ? fetchMyTickets(riderId) : Promise.resolve([]),
      ]);
      setTopics(t || []);
      setTickets(k || []);
    } catch (e) {
      setError(e.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [riderId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const send = useCallback(async () => {
    if (!riderId || !message.trim()) return;
    try {
      setSending(true);
      setError(null);
      await createSupportTicket(riderId, {
        subject: openTopic ? openTopic.title : "Demande d'aide",
        message: message.trim(),
      });
      setMessage("");
      setSent(true);
      await load();
    } catch (e) {
      setError(e.message || "Envoi impossible");
    } finally {
      setSending(false);
    }
  }, [riderId, message, openTopic, load]);

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader title="Aide" onBack={onBack} />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#76D865" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {error ? (
            <Text className="mb-3 text-[12px] text-red-500">{error}</Text>
          ) : null}

          <Text className="mb-2 text-[13px] font-bold text-ink">Questions fréquentes</Text>
          {topics.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setOpenTopic(openTopic && openTopic.id === t.id ? null : t)}
              className="mb-2 rounded-xl bg-white p-4 shadow-sm"
            >
              <View className="flex-row items-center justify-between">
                <Text className="flex-1 pr-2 text-[14px] font-semibold text-ink">{t.title}</Text>
                <Icon name="chevronRight" size={18} color="#7E8B9B" />
              </View>
              {openTopic && openTopic.id === t.id ? (
                <Text className="mt-2 text-[13px] leading-5 text-muted">{t.answer}</Text>
              ) : null}
            </Pressable>
          ))}

          <Text className="mb-2 mt-4 text-[13px] font-bold text-ink">
            {openTopic ? `Écrire à propos de : ${openTopic.title}` : "Écrire au support"}
          </Text>
          <View className="rounded-xl bg-white p-4 shadow-sm">
            <TextInput
              value={message}
              onChangeText={(v) => {
                setMessage(v);
                setSent(false);
              }}
              placeholder="Décrivez votre problème..."
              placeholderTextColor="#7E8B9B"
              multiline
              className="min-h-[90px] rounded-lg bg-surface p-3 text-[14px] text-ink"
            />
            <Pressable
              onPress={send}
              disabled={sending || !message.trim()}
              className={`mt-3 items-center rounded-lg py-3 ${sending || !message.trim() ? "bg-gray-300" : "bg-primary"}`}
            >
              <Text className="text-[14px] font-bold text-white">
                {sending ? "Envoi..." : "Envoyer"}
              </Text>
            </Pressable>
            {sent ? (
              <Text className="mt-2 text-[12px] text-primary">Message envoyé au support.</Text>
            ) : null}
          </View>

          {tickets.length > 0 ? (
            <>
              <Text className="mb-2 mt-4 text-[13px] font-bold text-ink">Mes demandes</Text>
              {tickets.map((k) => (
                <View key={k.id} className="mb-2 rounded-xl bg-white p-4 shadow-sm">
                  <View className="flex-row items-center justify-between">
                    <Text className="flex-1 pr-2 text-[14px] font-semibold text-ink">{k.subject}</Text>
                    <Text className="text-[11px] font-bold text-primary">
                      {k.status === "open" ? "Ouvert" : k.status === "pending" ? "En cours" : "Résolu"}
                    </Text>
                  </View>
                  <Text className="mt-1 text-[13px] text-muted">{k.message}</Text>
                </View>
              ))}
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
