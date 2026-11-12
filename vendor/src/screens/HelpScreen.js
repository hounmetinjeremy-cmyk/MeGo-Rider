import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator } from "react-native";
import ScreenHeader from "../components/ScreenHeader";
import EmptyState from "../components/EmptyState";
import Icon from "../components/Icon";
import { Card, SectionTitle, Button, Input, Badge } from "../components/Kit";
import colors from "../theme/colors";
import { listHelpTopics, listTickets, createTicket } from "../lib/db";

/** Aide : questions frequentes et contact du support. */
export default function HelpScreen({ vendor, onMenuPress, onBack }) {
  const [topics, setTopics] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [openSlug, setOpenSlug] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ subject: "", message: "" });

  const load = useCallback(async () => {
    try {
      setError(null);
      const [t, k] = await Promise.all([
        listHelpTopics(),
        vendor && vendor.id ? listTickets(vendor.id) : Promise.resolve([]),
      ]);
      setTopics(t || []);
      setTickets(k || []);
    } catch (e) {
      setError(e.message || "Chargement impossible");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [vendor]);

  useEffect(() => {
    load();
  }, [load]);

  const send = async () => {
    if (!vendor || !vendor.id) return;
    if (!form.subject.trim() || !form.message.trim()) {
      setError("Sujet et message obligatoires");
      return;
    }
    setSaving(true);
    try {
      setError(null);
      const created = await createTicket(vendor.id, form.subject.trim(), form.message.trim());
      setTickets((prev) => [created, ...(prev || [])]);
      setForm({ subject: "", message: "" });
    } catch (e) {
      setError(e.message || "Envoi impossible");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader title="Aide" onBack={onBack} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
      >
        <SectionTitle>Questions frequentes</SectionTitle>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : topics.length === 0 ? (
          <EmptyState icon="help" message="Aucune question disponible." />
        ) : (
          topics.map((t) => {
            const key = t.slug || t.id;
            const open = openSlug === key;
            return (
              <Card key={key}>
                <Pressable onPress={() => setOpenSlug(open ? null : key)} className="flex-row items-center justify-between">
                  <Text className="flex-1 pr-3 text-[14px] font-bold text-ink">{t.title}</Text>
                  <Icon name={open ? "chevronRight" : "chevronRight"} size={16} color={colors.muted} />
                </Pressable>
                {open ? (
                  <Text className="mt-2 text-[13px] leading-5 text-muted">
                    {t.answer || t.question || "Reponse a venir."}
                  </Text>
                ) : null}
              </Card>
            );
          })
        )}

        <SectionTitle>Contacter le support</SectionTitle>
        <Card>
          <Input
            label="Sujet"
            value={form.subject}
            onChangeText={(v) => setForm((f) => ({ ...f, subject: v }))}
            placeholder="Ex : Retrait non recu"
          />
          <Input
            label="Message"
            value={form.message}
            onChangeText={(v) => setForm((f) => ({ ...f, message: v }))}
            placeholder="Decrivez votre probleme"
          />
          <Button label="Envoyer" icon="help" onPress={send} loading={saving} />
        </Card>

        {error ? <Text className="mb-3 text-[12px] text-red-500">{error}</Text> : null}

        <SectionTitle>Mes demandes</SectionTitle>
        {tickets.length === 0 ? (
          <EmptyState icon="help" message="Aucune demande envoyee." />
        ) : (
          tickets.map((k) => (
            <Card key={k.id}>
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-[14px] font-bold text-ink">{k.subject}</Text>
                  <Text className="mt-0.5 text-[12px] text-muted">{k.message}</Text>
                </View>
                <Badge label={k.status || "Ouvert"} tone="chip" />
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}
