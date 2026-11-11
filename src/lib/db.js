import { supabase } from "./supabaseClient";

export const LANGUAGES = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "fon", label: "Fon" },
  { code: "yo", label: "Yoruba" },
];

export const VEHICLES = ["Scooter", "Moto", "Vélo", "Voiture"];

// weekday : 0 = dimanche ... 6 = samedi (colonne rider_schedules.weekday)
export const WEEK_DAYS = [
  { key: 0, label: "Dimanche" },
  { key: 1, label: "Lundi" },
  { key: 2, label: "Mardi" },
  { key: 3, label: "Mercredi" },
  { key: 4, label: "Jeudi" },
  { key: 5, label: "Vendredi" },
  { key: 6, label: "Samedi" },
];

const TICKET_STATUS = { OPEN: "open", ANSWERED: "pending", CLOSED: "resolved" };

export async function getRider(riderId) {
  if (!riderId) return null;
  const { data, error } = await supabase.from("riders").select("*").eq("id", riderId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { ...data, vehicle: data.vehicle_type || data.vehicle || null };
}

export async function updateRider(riderId, patch = {}) {
  const row = { ...patch };
  if (row.vehicle !== undefined && row.vehicle_type === undefined) row.vehicle_type = row.vehicle;
  delete row.vehicle;
  const { data, error } = await supabase.from("riders").update(row).eq("id", riderId).select("*").maybeSingle();
  if (error) throw error;
  return data ? { ...data, vehicle: data.vehicle_type || data.vehicle || null } : null;
}

export async function getRiderLanguage(riderId) {
  if (!riderId) return "fr";
  const { data, error } = await supabase.from("riders").select("language").eq("id", riderId).maybeSingle();
  if (error) throw error;
  return (data && data.language) || "fr";
}

export async function setRiderLanguage(riderId, code) {
  const { error } = await supabase.from("riders").update({ language: code }).eq("id", riderId);
  if (error) throw error;
  return code;
}

export async function fetchSchedules(riderId) {
  if (!riderId) return [];
  const { data, error } = await supabase
    .from("rider_schedules")
    .select("id, rider_id, weekday, start_time, end_time, is_active")
    .eq("rider_id", riderId)
    .order("weekday", { ascending: true });
  if (error) throw error;
  return (data || []).map((r) => ({ ...r, day_of_week: r.weekday }));
}

export async function saveSchedule(riderId, day, patch = {}) {
  const row = {
    rider_id: riderId,
    weekday: Number(day),
    is_active: !!patch.is_active,
    start_time: patch.start_time || "08:00",
    end_time: patch.end_time || "18:00",
  };
  const { data, error } = await supabase
    .from("rider_schedules")
    .upsert(row, { onConflict: "rider_id,weekday" })
    .select("id, rider_id, weekday, start_time, end_time, is_active")
    .maybeSingle();
  if (error) throw error;
  return data ? { ...data, day_of_week: data.weekday } : null;
}

function mapPayoutMethod(m) {
  if (!m) return null;
  return { ...m, method_type: m.method, label: m.provider || m.account_name || m.method };
}

export async function fetchPayoutMethods(riderId) {
  if (!riderId) return [];
  const { data, error } = await supabase
    .from("payout_methods")
    .select("*")
    .eq("rider_id", riderId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapPayoutMethod);
}

export async function addPayoutMethod(riderId, method) {
  const input = typeof method === "string" ? { method } : method || {};
  const row = {
    rider_id: riderId,
    method: input.method || input.method_type || "mobile_money",
    provider: input.provider || input.label || null,
    account_name: input.account_name || null,
    account_number: input.account_number || null,
    is_default: !!input.is_default,
  };
  const { data, error } = await supabase.from("payout_methods").insert(row).select("*").maybeSingle();
  if (error) throw error;
  return mapPayoutMethod(data);
}

export async function deletePayoutMethod(id) {
  const { error } = await supabase.from("payout_methods").delete().eq("id", id);
  if (error) throw error;
  return true;
}

export async function fetchWithdrawals(riderId) {
  if (!riderId) return [];
  const { data, error } = await supabase
    .from("withdrawals")
    .select("*")
    .eq("rider_id", riderId)
    .order("requested_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data || []).map((w) => ({ ...w, created_at: w.requested_at || w.created_at }));
}

export async function requestWithdrawal(riderId, amount, methodId) {
  const row = {
    rider_id: riderId,
    amount: Number(amount),
    currency: "XOF",
    status: "PENDING",
    requested_at: new Date().toISOString(),
  };
  if (methodId) row.payout_method_id = methodId;
  const { data, error } = await supabase.from("withdrawals").insert(row).select("*").maybeSingle();
  if (error) throw error;
  return data ? { ...data, created_at: data.requested_at || data.created_at } : null;
}

export async function fetchHelpTopics() {
  const { data, error } = await supabase.from("help_topics").select("*").order("sort_order", { ascending: true });
  if (error) throw error;
  return (data || []).map((t) => ({
    ...t,
    title: t.title || t.question || "",
    question: t.question || t.title || "",
    answer: t.answer || t.body || "",
  }));
}

export async function fetchMyTickets(riderId) {
  if (!riderId) return [];
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("rider_id", riderId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((t) => ({ ...t, status: TICKET_STATUS[t.status] || String(t.status || "").toLowerCase() }));
}

export async function createSupportTicket(riderId, subject, message) {
  const { data, error } = await supabase
    .from("support_tickets")
    .insert({ rider_id: riderId, subject: subject || "Demande d'aide", message, status: "OPEN" })
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? { ...data, status: TICKET_STATUS[data.status] || String(data.status || "").toLowerCase() } : null;
}

export async function fetchNotifications(riderId) {
  if (!riderId) return [];
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("rider_id", riderId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function markNotificationsRead(riderId) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("rider_id", riderId)
    .eq("is_read", false);
  if (error) throw error;
  return true;
}
