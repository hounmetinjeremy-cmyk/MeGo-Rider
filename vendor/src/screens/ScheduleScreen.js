import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Switch, RefreshControl, ActivityIndicator } from "react-native";
import ScreenHeader from "../components/ScreenHeader";
import { Card, SectionTitle, Button, Input } from "../components/Kit";
import colors from "../theme/colors";
import { WEEKDAYS, listSchedule, saveSchedule } from "../lib/db";

/** Horaires d'ouverture par jour de la semaine. */
export default function ScheduleScreen({ vendor, onMenuPress, onBack }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [busyDay, setBusyDay] = useState(null);

  const load = useCallback(async () => {
    if (!vendor || !vendor.id) return;
    try {
      setError(null);
      const data = await listSchedule(vendor.id);
      const byDay = {};
      (data || []).forEach((r) => {
        byDay[r.weekday] = r;
      });
      setRows(
        (WEEKDAYS || []).map((d) => {
          const found = byDay[d.value] || {};
          return {
            weekday: d.value,
            label: d.label,
            open_time: found.open_time || found.start_time || "08:00",
            close_time: found.close_time || found.end_time || "20:00",
            is_closed: found.is_closed === true,
          };
        })
      );
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

  const patch = (weekday, changes) => {
    setRows((prev) => (prev || []).map((r) => (r.weekday === weekday ? { ...r, ...changes } : r)));
  };

  const save = async (row) => {
    if (!vendor || !vendor.id) return;
    setBusyDay(row.weekday);
    try {
      setError(null);
      await saveSchedule(vendor.id, row.weekday, {
        open_time: row.open_time,
        close_time: row.close_time,
        is_closed: row.is_closed,
      });
    } catch (e) {
      setError(e.message || "Enregistrement impossible");
    } finally {
      setBusyDay(null);
    }
  };

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader title="Horaires" onBack={onBack} />
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
        <SectionTitle>Ouverture de la boutique</SectionTitle>
        {error ? <Text className="mb-3 text-[12px] text-red-500">{error}</Text> : null}
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : (
          rows.map((row) => (
            <Card key={row.weekday}>
              <View className="flex-row items-center justify-between">
                <Text className="text-[14px] font-bold text-ink">{row.label}</Text>
                <View className="flex-row items-center">
                  <Text className="mr-2 text-[12px] text-muted">
                    {row.is_closed ? "Ferme" : "Ouvert"}
                  </Text>
                  <Switch
                    value={!row.is_closed}
                    onValueChange={(v) => patch(row.weekday, { is_closed: !v })}
                    trackColor={{ false: colors.line, true: colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>
              {row.is_closed ? null : (
                <View className="mt-3 flex-row">
                  <View className="mr-2 flex-1">
                    <Input
                      label="Ouverture"
                      value={row.open_time}
                      onChangeText={(v) => patch(row.weekday, { open_time: v })}
                      placeholder="08:00"
                    />
                  </View>
                  <View className="flex-1">
                    <Input
                      label="Fermeture"
                      value={row.close_time}
                      onChangeText={(v) => patch(row.weekday, { close_time: v })}
                      placeholder="20:00"
                    />
                  </View>
                </View>
              )}
              <Button
                label="Enregistrer"
                variant="ghost"
                onPress={() => save(row)}
                loading={busyDay === row.weekday}
              />
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}
