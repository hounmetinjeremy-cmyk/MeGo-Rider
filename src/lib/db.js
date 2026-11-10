import { supabase } from "./supabaseClient";

/* ------------------------------------------------------------------ *
 * Référentiels (listes fixes côté app, valeurs stockées en base)
 * ------------------------------------------------------------------ */
export const LANGUAGES = [
  { code: "fr", label: "Français", hint: "Langue par défaut" },
  { code: "en", label: "English", hint: "English (UK)" },
  { code: "fon", label: "Fon", hint: "Bénin" },
  { code: "yo", label: "Yoruba", hint: "Bénin / Nigeria" },
];

export const VEHICLES = [
  { code: "moto", label: "Moto", icon: "bike", hint: "Rapide en ville" },
  { code: "scooter", label: "Scooter", icon: "bike", hint: "Idéal pour les courses" },
  { code: "velo", label: "Vélo", icon: "bike", hint: "Écologique" },
  { code: "voiture", label: "Voiture", icon: "truck", hint: "Gros volumes" },
];

export const WEEK_DAYS = [
  { day: 1, label: "Lundi" },
  { day: 2, label: "Mardi" },
  { day: 3, label: "Mercredi" },
  { day: 4, label: "Jeudi" },
  { day: 5, label: "Vendredi" },
  { day: 6, label: "Samedi" },
  { day: 7, label: "Dimanche" },
];

/* ------------------------------------------------------------------ *
 * Livreur
 * ------------------------------------------------------------------ */
export async function updateRider(riderId, patch) {
  const { data, error } = await supabase
    .from("riders")
    .update(patch)
    .eq("id", riderId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/* ------------------------------------------------------------------ *
 * Emploi du temps
 * ------------------------------------------------------------------ */
export async function fetchSchedules(riderId) {
  const { data, error } = await supabase
    .from("rider_schedules")
    .select("*")
    .eq("rider_id", riderId)
    .order("day_of_week", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function saveSchedule(riderId, day, patch) {
  const { data, error } = await supabase
    .from("rider_schedules")
    .upsert(
      { rider_id: riderId, day_of_week: day, ...patch },
      { onConflict: "rider_id,day_of_week" }
    )
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/* ------------------------------------------------------------------ *
 * Gestion bancaire
 * ------------------------------------------------------------------ */
export async function fetchPayoutMethods(riderId) {
  const { data, error } = await supabase
    .from("payout_methods")
    .select("*")
    .eq("rider_id", riderId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addPayoutMethod(riderId, method) {
  const { data, error } = await supabase
    .from("payout_methods")
    .insert({ rider_id: riderId, ...method })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deletePayoutMethod(id) {
  const { error } = await supabase.from("payout_methods").delete().eq("id", id);
  if (error) throw error;
  return true;
}

export async function fetchWithdrawals(riderId) {
  const { data, error } = await supabase
    .from("withdrawals")
    .select("*")
    .eq("rider_id", riderId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data || [];
}

export async function requestWithdrawal(riderId, amount, methodId) {
  const { data, error } = await supabase
    .from("withdrawals")
    .insert({
      rider_id: riderId,
      amount,
      payout_method_id: methodId || null,
      status: "PENDING",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/* ------------------------------------------------------------------ *
 * Aide / support
 * ------------------------------------------------------------------ */
export async function fetchHelpTopics() {
  const { data, error } = await supabase
    .from("help_topics")
    .select("*")
    .order("position", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchMyTickets(riderId) {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("rider_id", riderId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createSupportTicket(riderId, subject, message) {
  const { data, error } = await supabase
    .from("support_tickets")
    .insert({ rider_id: riderId, subject, message, status: "OPEN" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/* ------------------------------------------------------------------ *
 * Notifications
 * ------------------------------------------------------------------ */
export async function fetchNotifications(riderId) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("rider_id", riderId)
    .order("created_at", { ascending: false })
    .limit(50);
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
