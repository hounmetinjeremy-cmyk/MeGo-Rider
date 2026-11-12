import { supabase } from "./supabaseClient";

export const LANGUAGES = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "fon", label: "Fon" },
  { code: "yo", label: "Yoruba" },
];

export const WEEKDAYS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 0, label: "Dimanche" },
];

export const PAYOUT_PROVIDERS = [
  "MTN MoMo",
  "Moov Money",
  "Celtiis Cash",
  "Virement bancaire",
];

export const VENDOR_COLUMNS =
  "id, name, owner_name, phone, email, address, category, logo_url, is_open, rating, wallet_balance, total_earnings, language, created_at";

/* ---------------------------------------------------------------- boutique */

export async function getVendor(vendorId) {
  let query = supabase.from("vendors").select(VENDOR_COLUMNS);
  if (vendorId) query = query.eq("id", vendorId);
  const { data, error } = await query.limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateVendor(vendorId, patch) {
  const { data, error } = await supabase
    .from("vendors")
    .update(patch)
    .eq("id", vendorId)
    .select(VENDOR_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function setVendorOpen(vendorId, isOpen) {
  return updateVendor(vendorId, { is_open: isOpen });
}

export async function getVendorLanguage(vendorId) {
  const { data, error } = await supabase
    .from("vendors")
    .select("language")
    .eq("id", vendorId)
    .maybeSingle();
  if (error) throw error;
  return (data && data.language) || "fr";
}

export async function setVendorLanguage(vendorId, language) {
  const { error } = await supabase
    .from("vendors")
    .update({ language })
    .eq("id", vendorId);
  if (error) throw error;
  return true;
}

/* ---------------------------------------------------------------- produits */

export async function listProducts(vendorId) {
  const { data, error } = await supabase
    .from("vendor_products")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createProduct(vendorId, product) {
  const { data, error } = await supabase
    .from("vendor_products")
    .insert({ ...product, vendor_id: vendorId })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateProduct(productId, patch) {
  const { data, error } = await supabase
    .from("vendor_products")
    .update(patch)
    .eq("id", productId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProduct(productId) {
  const { error } = await supabase
    .from("vendor_products")
    .delete()
    .eq("id", productId);
  if (error) throw error;
  return true;
}

/* ------------------------------------------------------------ horaires */

export async function listSchedule(vendorId) {
  const { data, error } = await supabase
    .from("vendor_schedules")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("weekday", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function saveSchedule(vendorId, weekday, patch) {
  const { data, error } = await supabase
    .from("vendor_schedules")
    .upsert(
      { vendor_id: vendorId, weekday, ...patch },
      { onConflict: "vendor_id,weekday" }
    )
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/* --------------------------------------------------------------- banque */

export async function listPayoutMethods(vendorId) {
  const { data, error } = await supabase
    .from("vendor_payout_methods")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addPayoutMethod(vendorId, method) {
  const { data, error } = await supabase
    .from("vendor_payout_methods")
    .insert({ ...method, vendor_id: vendorId })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deletePayoutMethod(methodId) {
  const { error } = await supabase
    .from("vendor_payout_methods")
    .delete()
    .eq("id", methodId);
  if (error) throw error;
  return true;
}

/* ------------------------------------------------------------- retraits */

export async function listWithdrawals(vendorId) {
  const { data, error } = await supabase
    .from("vendor_withdrawals")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("requested_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function requestWithdrawal(vendorId, amount, methodId) {
  const { data, error } = await supabase
    .from("vendor_withdrawals")
    .insert({
      vendor_id: vendorId,
      amount,
      currency: "XOF",
      status: "PENDING",
      payout_method_id: methodId || null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/* ----------------------------------------------------------------- aide */

export async function listHelpTopics() {
  const { data, error } = await supabase
    .from("help_topics")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function listTickets(vendorId) {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createTicket(vendorId, subject, message) {
  const { data, error } = await supabase
    .from("support_tickets")
    .insert({
      vendor_id: vendorId,
      subject,
      message,
      status: "OPEN",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/* -------------------------------------------------------- notifications */

export async function listNotifications(vendorId) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function markNotificationRead(id) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);
  if (error) throw error;
  return true;
}
