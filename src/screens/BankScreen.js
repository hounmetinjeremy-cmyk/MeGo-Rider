import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import ScreenHeader from "../components/ScreenHeader";
import Icon from "../components/Icon";
import {
  fetchPayoutMethods,
  addPayoutMethod,
  deletePayoutMethod,
  fetchWithdrawals,
  requestWithdrawal,
} from "../lib/db";

const METHODS = [
  { key: "mobile_money", label: "Mobile Money", hint: "Numéro (ex. +229 96 00 00 00)" },
  { key: "bank", label: "Compte bancaire", hint: "IBAN / numéro de compte" },
];

function formatMoney(v) {
  const n = Number(v || 0);
  return `${n.toLocaleString("fr-FR")} FCFA`;
}

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Écran : Gestion bancaire.
 * - liste les moyens de paiement du livreur (payout_methods)
 * - ajoute / supprime un moyen de paiement
 * - demande un retrait (withdrawals) et affiche l'historique
 */
export default function BankScreen({ rider, onBack, onChanged }) {
  const riderId = rider ? rider.id : null;
  const [methods, setMethods] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [methodType, setMethodType] = useState(METHODS[0].key);
  const [label, setLabel] = useState("");
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState("");

  const load = useCallback(async () => {
    if (!riderId) return;
    try {
      setError(null);
      const [m, w] = await Promise.all([
        fetchPayoutMethods(riderId),
        fetchWithdrawals(riderId),
      ]);
      setMethods(m || []);
      setWithdrawals(w || []);
    } catch (e) {
      setError(e.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [riderId]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleAdd = useCallback(async () => {
    if (!riderId || !account.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await addPayoutMethod(riderId, {
        method_type: methodType,
        label: label.trim() || METHODS.find((m) => m.key === methodType).label,
        account_number: account.trim(),
      });
      setLabel("");
      setAccount("");
      await load();
    } catch (e) {
      setError(e.message || "Ajout impossible");
    } finally {
      setBusy(false);
    }
  }, [riderId, methodType, label, account, load]);

  const handleDelete = useCallback(
    async (id) => {
      setBusy(true);
      setError(null);
      try {
        await deletePayoutMethod(id);
        await load();
      } catch (e) {
        setError(e.message || "Suppression impossible");
      } finally {
        setBusy(false);
      }
    },
    [load]
  );

  const handleWithdraw = useCallback(async () => {
    if (!riderId) return;
    const value = Number(String(amount).replace(/[^0-9.]/g, ""));
    if (!value || value <= 0) {
      setError("Montant invalide");
      return;
    }
    if (methods.length === 0) {
      setError("Ajoute d'abord un moyen de paiement");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await requestWithdrawal(riderId, value, methods[0].id);
      setAmount("");
      await load();
      if (onChanged) onChanged();
    } catch (e) {
      setError(e.message || "Demande impossible");
    } finally {
      setBusy(false);
    }
  }, [riderId, amount, methods, load, onChanged]);

  const balance = rider ? Number(rider.wallet || 0) : 0;

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader title="Gestion bancaire" onBack={onBack} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
      >
        <View className="mb-4 rounded-xl bg-white p-4 shadow-sm">
          <Text className="text-[12px] text-muted">Solde disponible</Text>
          <Text className="mt-1 text-[24px] font-bold text-ink">
            {formatMoney(balance)}
          </Text>
          <View className="mt-3 flex-row items-center">
            <TextInput
              className="mr-2 flex-1 rounded-lg border border-line px-3 py-2.5 text-[14px] text-ink"
              placeholder="Montant à retirer"
              placeholderTextColor="#7E8B9B"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
            <Pressable
              className="rounded-lg bg-primary px-4 py-2.5"
              onPress={handleWithdraw}
              disabled={busy}
            >
              <Text className="text-[13px] font-bold text-white">Retirer</Text>
            </Pressable>
          </View>
        </View>

        {error ? (
          <Text className="mb-3 text-[12px] text-red-500">{error}</Text>
        ) : null}

        <Text className="mb-2 text-[13px] font-bold text-ink">
          Moyens de paiement
        </Text>

        {loading ? (
          <ActivityIndicator color="#76D865" className="my-6" />
        ) : methods.length === 0 ? (
          <View className="mb-4 rounded-xl bg-white p-4 shadow-sm">
            <Text className="text-[13px] text-muted">
              Aucun moyen de paiement enregistré.
            </Text>
          </View>
        ) : (
          methods.map((m) => (
            <View
              key={m.id}
              className="mb-2 flex-row items-center rounded-xl bg-white p-4 shadow-sm"
            >
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-chip">
                <Icon name="card" size={18} color="#1A2433" />
              </View>
              <View className="flex-1">
                <Text className="text-[14px] font-bold text-ink">
                  {m.label || m.method_type}
                </Text>
                <Text className="text-[12px] text-muted">
                  {m.account_number}
                </Text>
              </View>
              <Pressable onPress={() => handleDelete(m.id)} disabled={busy}>
                <Icon name="close" size={18} color="#7E8B9B" />
              </Pressable>
            </View>
          ))
        )}

        <View className="mt-4 rounded-xl bg-white p-4 shadow-sm">
          <Text className="mb-3 text-[13px] font-bold text-ink">
            Ajouter un moyen de paiement
          </Text>
          <View className="mb-3 flex-row">
            {METHODS.map((m) => (
              <Pressable
                key={m.key}
                onPress={() => setMethodType(m.key)}
                className={`mr-2 rounded-lg px-3 py-2 ${
                  methodType === m.key ? "bg-primary-soft" : "bg-chip"
                }`}
              >
                <Text
                  className={`text-[12px] font-bold ${
                    methodType === m.key ? "text-primary-dark" : "text-muted"
                  }`}
                >
                  {m.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            className="mb-2 rounded-lg border border-line px-3 py-2.5 text-[14px] text-ink"
            placeholder="Libellé (ex. MTN MoMo)"
            placeholderTextColor="#7E8B9B"
            value={label}
            onChangeText={setLabel}
          />
          <TextInput
            className="mb-3 rounded-lg border border-line px-3 py-2.5 text-[14px] text-ink"
            placeholder={
              METHODS.find((m) => m.key === methodType).hint
            }
            placeholderTextColor="#7E8B9B"
            value={account}
            onChangeText={setAccount}
          />
          <Pressable
            className="items-center rounded-lg bg-primary py-3"
            onPress={handleAdd}
            disabled={busy}
          >
            <Text className="text-[14px] font-bold text-white">
              {busy ? "Enregistrement..." : "Enregistrer"}
            </Text>
          </Pressable>
        </View>

        <Text className="mb-2 mt-5 text-[13px] font-bold text-ink">
          Historique des retraits
        </Text>
        {withdrawals.length === 0 ? (
          <View className="rounded-xl bg-white p-4 shadow-sm">
            <Text className="text-[13px] text-muted">
              Aucun retrait pour le moment.
            </Text>
          </View>
        ) : (
          withdrawals.map((w) => (
            <View
              key={w.id}
              className="mb-2 flex-row items-center justify-between rounded-xl bg-white p-4 shadow-sm"
            >
              <View>
                <Text className="text-[14px] font-bold text-ink">
                  {formatMoney(w.amount)}
                </Text>
                <Text className="text-[12px] text-muted">
                  {formatDate(w.created_at)}
                </Text>
              </View>
              <Text className="text-[12px] font-bold text-primary-dark">
                {w.status}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
