import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  ActivityIndicator,
} from "react-native";
import ScreenHeader from "../components/ScreenHeader";
import Icon from "../components/Icon";
import colors from "../theme/colors";
import { WEEK_DAYS, fetchSchedules, saveSchedule } from "../lib/db";

/**
 * Écran « Emploi du temps » : le livreur active ses jours de travail
 * et règle ses heures de début / fin. Tout est écrit dans rider_schedules.
 */
export default function ScheduleScreen({ riderId, onBack }) {
  const [rows, setRows] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyDay, setBusyDay] = useState(null);

  const load = useCallback(async () => {
    if (!riderId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSchedules(riderId);
      const map = {};
      (data || []).forEach((r) => {
        map[r.day_of_week] = r;
      });
      setRows(map);
    } catch (e) {
      setError(e.message || "Impossible de charger l'emploi du temps.");
    } finally {
      setLoading(false);
    }
  }, [riderId]);

  useEffect(() => {
    load();
  }, [load]);

  const patchDay = useCallback(
    async (day, patch) => {
      const current = rows[day] || {
        day_of_week: day,
        is_active: false,
        start_time: "08:00",
        end_time: "18:00",
      };
      const next = { ...current, ...patch };
      setRows((prev) => ({ ...prev, [day]: next }));
      setBusyDay(day);
      setError(null);
      try {
        const saved = await saveSchedule(riderId, day, {
          is_active: next.is_active,
          start_time: next.start_time,
          end_time: next.end_time,
        });
        if (saved) setRows((prev) => ({ ...prev, [day]: saved }));
      } catch (e) {
        setRows((prev) => ({ ...prev, [day]: current }));
        setError(e.message || "Enregistrement impossible.");
      } finally {
        setBusyDay(null);
      }
    },
    [rows, riderId]
  );

  const shift = useCallback(
    (day, field, delta) => {
      const row = rows[day] || { start_time: "08:00", end_time: "18:00" };
      const [h, m] = String(row[field] || "08:00").split(":");
      let hour = parseInt(h, 10) + delta;
      if (hour < 0) hour = 23;
      if (hour > 23) hour = 0;
      const value = `${String(hour).padStart(2, "0")}:${m || "00"}`;
      patchDay(day, { [field]: value });
    },
    [rows, patchDay]
  );

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader title="Emploi du temps" onBack={onBack} />

      {error ? (
        <Text className="px-4 pt-3 text-[12px] text-red-500">{error}</Text>
      ) : null}

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        >
          <Text className="mb-3 text-[13px] text-ink/60">
            Activez les jours où vous travaillez et ajustez vos horaires.
          </Text>

          {WEEK_DAYS.map((day) => {
            const row = rows[day.key] || {};
            const active = !!row.is_active;
            return (
              <View
                key={day.key}
                className="mb-3 rounded-xl bg-white p-4 shadow-sm"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-chip">
                      <Icon name="clock" size={18} color={colors.navy} />
                    </View>
                    <Text className="text-[15px] font-semibold text-ink">
                      {day.label}
                    </Text>
                  </View>
                  <Switch
                    value={active}
                    onValueChange={(v) => patchDay(day.key, { is_active: v })}
                    trackColor={{ false: "#C9D2DC", true: colors.primary }}
                    thumbColor={colors.white}
                  />
                </View>

                {active ? (
                  <View className="mt-3 flex-row items-center justify-between">
                    <TimeBox
                      label="Début"
                      value={row.start_time || "08:00"}
                      onMinus={() => shift(day.key, "start_time", -1)}
                      onPlus={() => shift(day.key, "start_time", 1)}
                    />
                    <Text className="px-2 text-[13px] text-ink/50">→</Text>
                    <TimeBox
                      label="Fin"
                      value={row.end_time || "18:00"}
                      onMinus={() => shift(day.key, "end_time", -1)}
                      onPlus={() => shift(day.key, "end_time", 1)}
                    />
                  </View>
                ) : null}

                {busyDay === day.key ? (
                  <Text className="mt-2 text-[11px] text-ink/50">
                    Enregistrement…
                  </Text>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function TimeBox({ label, value, onMinus, onPlus }) {
  return (
    <View className="flex-1 items-center rounded-lg bg-surface py-2">
      <Text className="text-[11px] text-ink/50">{label}</Text>
      <View className="mt-1 flex-row items-center">
        <Pressable onPress={onMinus} hitSlop={8} className="px-2">
          <Text className="text-[16px] font-bold text-ink/60">−</Text>
        </Pressable>
        <Text className="px-1 text-[15px] font-bold text-ink">{value}</Text>
        <Pressable onPress={onPlus} hitSlop={8} className="px-2">
          <Text className="text-[16px] font-bold text-ink/60">+</Text>
        </Pressable>
      </View>
    </View>
  );
}
