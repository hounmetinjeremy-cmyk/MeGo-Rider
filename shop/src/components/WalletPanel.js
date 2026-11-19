import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, TextInput, ActivityIndicator } from "react-native";
import { money } from "../lib/shop";
import { COUNTRIES } from "../lib/countries";
import {
  rpc,
  activeToken,
  isInjected,
  saveCustomerToken,
  myWallet,
  loginCustomer,
  registerCustomer,
  startDeposit,
  verifyDeposit,
} from "../lib/wallet";

const KIND = { customer: "Client", vendor: "Vendeur", rider: "Livreur" };
const QUICK = [1000, 2000, 5000, 10000];

// Petits composants definis HORS de l'ecran (sinon les champs perdent le focus a chaque lettre tapee).
function Input({ value, onChangeText, placeholder, keyboardType, secure, maxLength }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      keyboardType={keyboardType || "default"}
      secureTextEntry={!!secure}
      maxLength={maxLength}
      className="mb-3 rounded-xl border border-line bg-white px-3 py-3 text-[15px] text-ink"
    />
  );
}

function Btn({ label, onPress, busy, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy || disabled}
      className={`mt-2 items-center rounded-full py-4 active:opacity-80 ${disabled ? "bg-chip" : "bg-primary"}`}
    >
      {busy ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text className={`text-[15px] font-extrabold ${disabled ? "text-muted" : "text-white"}`}>{label}</Text>
      )}
    </Pressable>
  );
}

function Link({ label, onPress }) {
  return (
    <Pressable onPress={onPress} className="mt-3 items-center py-1 active:opacity-70">
      <Text className="text-[13px] font-semibold text-muted">{label}</Text>
    </Pressable>
  );
}

/**
 * Portefeuille MeGo, pour tout le monde (client, vendeur, livreur, visiteur venu d'un lien partage) :
 * 1) on cree / on ouvre son portefeuille (numero + code secret) ;
 * 2) on y DEPOSE de l'argent par Mobile Money (FedaPay) ;
 * 3) la boutique PRELEVE ensuite sur le solde. Si `order` est donne, le bouton PAYER debite la commande.
 * Aucune permission du vendeur n'est necessaire : le portefeuille est independant de la boutique.
 */
export default function WalletPanel({ order, sandbox, onPaid }) {
  const total = order ? Number(order.total) || 0 : 0;
  const [token, setToken] = useState(activeToken());
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(!!activeToken());
  const [notice, setNotice] = useState("");

  const [aMode, setAMode] = useState("register");
  const [aPhone, setAPhone] = useState("");
  const [aPin, setAPin] = useState("");
  const [aName, setAName] = useState("");
  const [aBusy, setABusy] = useState(false);
  const [aErr, setAErr] = useState("");

  const [showDep, setShowDep] = useState(false);
  const [amount, setAmount] = useState("");
  const [cid, setCid] = useState("bj");
  const [op, setOp] = useState("");
  const [dPhone, setDPhone] = useState("");
  const [dBusy, setDBusy] = useState(false);
  const [dErr, setDErr] = useState("");
  const [dep, setDep] = useState(null);

  const [pBusy, setPBusy] = useState(false);
  const [pErr, setPErr] = useState("");

  const refresh = useCallback(async (t) => {
    const w = await myWallet(t);
    if (w && w.ok === true) {
      setWallet({ kind: w.kind, available: Number(w.available) || 0, pending: Number(w.pending) || 0 });
      return w;
    }
    if (w && w.error === "Session expiree" && !isInjected()) {
      saveCustomerToken("");
      setToken("");
      setWallet(null);
    }
    return null;
  }, []);

  useEffect(() => {
    if (!token) {
      setWallet(null);
      setLoading(false);
      return undefined;
    }
    let alive = true;
    setLoading(true);
    refresh(token).then(() => {
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [token, refresh]);

  // Apres un depot : on interroge FedaPay toutes les 4 s jusqu'a la confirmation (5 min maximum).
  useEffect(() => {
    if (!dep) return undefined;
    let stop = false;
    const tick = async () => {
      if (stop) return;
      const v = await verifyDeposit(dep.id);
      const w = await refresh(token);
      if (stop) return;
      if (v.paid || (w && Number(w.available) > dep.before)) {
        setDep(null);
        setShowDep(false);
        setNotice("Depot recu : " + money(dep.amount) + " ajoutes a ton portefeuille.");
        return;
      }
      if (Date.now() - dep.started > 5 * 60 * 1000) {
        setDep(null);
        setNotice("Le depot n'a pas ete confirme. Verifie ton telephone puis reessaie.");
      }
    };
    const timer = setInterval(tick, 4000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [dep, token, refresh]);

  const submitAuth = async () => {
    setAErr("");
    setABusy(true);
    let r = null;
    try {
      r = aMode === "login" ? await loginCustomer(aPhone, aPin) : await registerCustomer(aPhone, aPin, aName);
    } catch (e) {
      r = null;
    }
    setABusy(false);
    if (!r || r.ok === false || !r.token) {
      setAErr((r && r.error) || "Connexion impossible, verifie internet");
      return;
    }
    saveCustomerToken(r.token);
    setToken(r.token);
    setAPin("");
  };

  const logout = () => {
    saveCustomerToken("");
    setToken("");
    setWallet(null);
    setShowDep(false);
    setDep(null);
    setNotice("");
  };

  const openDeposit = () => {
    setDErr("");
    setNotice("");
    const need = order && wallet ? Math.max(0, total - wallet.available) : 0;
    setAmount(need > 0 ? String(Math.max(500, Math.ceil(need / 100) * 100)) : "");
    setShowDep(true);
  };

  const country = COUNTRIES.find((c) => c.id === cid) || COUNTRIES[0];
  const ops = sandbox ? [...country.ops, ["Momo Test", "momo_test"]] : country.ops;

  const submitDeposit = async () => {
    setDErr("");
    const amt = Math.round(Number(String(amount).replace(/\D/g, "")));
    if (!(amt >= 500) || amt > 500000) return setDErr("Depot entre 500 et 500 000 F");
    let clean = dPhone.replace(/\D/g, "");
    if (clean.startsWith(country.dial) && clean.length > country.len) clean = clean.slice(country.dial.length);
    if (!op) return setDErr("Choisis ton operateur");
    if (clean.length !== country.len) return setDErr("Le numero doit avoir " + country.len + " chiffres (ex : " + country.ph + ")");
    setDBusy(true);
    const r = await startDeposit({ token, amount: amt, country: country.id, operator: op, phone: clean });
    setDBusy(false);
    if (!r || r.ok !== true) return setDErr((r && r.error) || "Depot impossible");
    setDep({ id: r.deposit_id, before: wallet ? wallet.available : 0, amount: amt, started: Date.now() });
  };

  const pay = async () => {
    setPErr("");
    setPBusy(true);
    try {
      const r = await rpc("pay_order_with_wallet", { p_token: token, p_order_id: order.order_id });
      if (r && r.ok === true) {
        setPBusy(false);
        if (onPaid) onPaid();
        return;
      }
      setPErr((r && r.error) || "Paiement impossible");
      if (r && r.balance != null) setWallet((w) => (w ? { ...w, available: Number(r.balance) || 0 } : w));
    } catch (e) {
      setPErr("Paiement impossible");
    }
    setPBusy(false);
  };

  // ---------- pas de portefeuille ouvert : creation / connexion ----------
  if (!token) {
    return (
      <View className="mt-4 rounded-2xl bg-white p-4">
        <Text className="text-[15px] font-extrabold text-ink">Mon portefeuille MeGo</Text>
        <Text className="mt-1 mb-3 text-[12px] text-muted">
          Pour payer, charge d'abord ton portefeuille par Mobile Money (FedaPay) : la boutique preleve ensuite sur ton solde.
          {aMode === "register" ? " Cree-le en quelques secondes avec ton numero." : ""}
        </Text>
        {aMode === "register" ? <Input value={aName} onChangeText={setAName} placeholder="Ton nom" /> : null}
        <Input value={aPhone} onChangeText={setAPhone} placeholder="Ton numero (ex : +22997000000)" keyboardType="phone-pad" />
        <Input
          value={aPin}
          onChangeText={(v) => setAPin(v.replace(/[^0-9]/g, ""))}
          placeholder={aMode === "register" ? "Choisis un code secret (4 a 6 chiffres)" : "Ton code secret"}
          keyboardType="number-pad"
          secure
          maxLength={6}
        />
        {aErr ? <Text className="text-[12px] text-red-600">{aErr}</Text> : null}
        <Btn label={aMode === "register" ? "CREER MON PORTEFEUILLE" : "ME CONNECTER"} onPress={submitAuth} busy={aBusy} />
        <Link
          label={aMode === "register" ? "J'ai deja un portefeuille : me connecter" : "Pas de portefeuille ? En creer un"}
          onPress={() => {
            setAErr("");
            setAMode(aMode === "register" ? "login" : "register");
          }}
        />
      </View>
    );
  }

  if (loading || !wallet) {
    return (
      <View className="mt-4 items-center rounded-2xl bg-white p-6">
        <ActivityIndicator color="#76D865" />
        <Text className="mt-2 text-[12px] text-muted">Chargement de ton portefeuille...</Text>
      </View>
    );
  }

  const missing = order ? Math.max(0, total - wallet.available) : 0;
  const enough = order ? wallet.available >= total : false;

  // ---------- portefeuille ouvert ----------
  return (
    <View className="mt-4 rounded-2xl bg-white p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-[13px] font-bold text-ink">Mon portefeuille ({KIND[wallet.kind] || "Client"})</Text>
        {!isInjected() ? (
          <Pressable onPress={logout} className="active:opacity-70">
            <Text className="text-[12px] font-semibold text-muted">Deconnexion</Text>
          </Pressable>
        ) : null}
      </View>
      <Text className="mt-2 text-[12px] text-muted">Solde disponible</Text>
      <Text className="text-[26px] font-extrabold text-ink">{money(wallet.available)}</Text>
      {wallet.pending > 0 ? (
        <Text className="mt-1 text-[12px] text-muted">Bloque jusqu'a la livraison : {money(wallet.pending)}</Text>
      ) : null}

      {notice ? <Text className="mt-3 text-[13px] font-semibold text-ink">{notice}</Text> : null}

      {dep ? (
        <View className="mt-3 rounded-xl bg-amber-100 p-3">
          <Text className="text-[13px] font-bold text-ink">Valide le depot sur ton telephone</Text>
          <Text className="mt-1 text-[12px] text-muted">
            Une demande Mobile Money de {money(dep.amount)} t'a ete envoyee. Des qu'elle est validee, ton solde se met a jour tout seul.
          </Text>
          <ActivityIndicator style={{ marginTop: 8 }} color="#76D865" />
          <Link label="Annuler l'attente" onPress={() => setDep(null)} />
        </View>
      ) : showDep ? (
        <View className="mt-3">
          <Text className="text-[13px] font-bold text-ink">Deposer de l'argent</Text>
          <View className="mt-2 flex-row flex-wrap">
            {QUICK.map((q) => (
              <Pressable key={q} onPress={() => setAmount(String(q))} className="mb-2 mr-2 rounded-xl border border-line bg-white px-3 py-2">
                <Text className="text-[13px] font-semibold text-ink">{money(q)}</Text>
              </Pressable>
            ))}
          </View>
          <Input value={amount} onChangeText={setAmount} placeholder="Montant (500 a 500 000 F)" keyboardType="number-pad" />

          <Text className="text-[12px] font-bold text-muted">Ton pays</Text>
          <View className="mt-2 flex-row flex-wrap">
            {COUNTRIES.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => {
                  setCid(c.id);
                  setOp("");
                  setDPhone("");
                }}
                className={`mb-2 mr-2 rounded-xl border px-3 py-2 ${cid === c.id ? "border-primary bg-primary-soft" : "border-line bg-white"}`}
              >
                <Text className="text-[13px] font-semibold text-ink">{c.flag} +{c.dial}</Text>
              </Pressable>
            ))}
          </View>

          <Text className="text-[12px] font-bold text-muted">Ton operateur</Text>
          <View className="mt-2 flex-row flex-wrap">
            {ops.map(([label, mode]) => (
              <Pressable
                key={mode}
                onPress={() => setOp(mode)}
                className={`mb-2 mr-2 rounded-xl border px-4 py-3 ${op === mode ? "border-primary bg-primary" : "border-line bg-white"}`}
              >
                <Text className={`text-[13px] font-bold ${op === mode ? "text-white" : "text-ink"}`}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <Text className="text-[12px] font-bold text-muted">Ton numero Mobile Money</Text>
          <View className="mt-2 mb-1 flex-row items-center rounded-xl border border-line bg-white">
            <Text className="px-3 text-[14px] font-semibold text-ink">{country.flag} +{country.dial}</Text>
            <TextInput
              value={dPhone}
              onChangeText={setDPhone}
              placeholder={country.ph}
              keyboardType="phone-pad"
              className="flex-1 py-3 pr-3 text-[15px] text-ink"
            />
          </View>
          {sandbox ? (
            <Text className="mt-1 text-[11px] text-muted">Mode test : choisis « Momo Test » et un numero de test FedaPay (ex : 64000001).</Text>
          ) : null}

          {dErr ? <Text className="mt-2 text-[12px] text-red-600">{dErr}</Text> : null}
          <Btn label="DEPOSER" onPress={submitDeposit} busy={dBusy} />
          <Text className="mt-2 text-center text-[11px] text-muted">
            Tu recevras une demande sur ton telephone : valide-la avec ton code Mobile Money. Securise par FedaPay.
          </Text>
          <Link label="Annuler" onPress={() => setShowDep(false)} />
        </View>
      ) : (
        <View className="mt-2">
          {order ? (
            enough ? (
              <>
                {pErr ? <Text className="mb-1 text-[12px] text-red-600">{pErr}</Text> : null}
                <Btn label={"PAYER " + money(total)} onPress={pay} busy={pBusy} />
                <Text className="mt-2 text-center text-[11px] text-muted">
                  L'argent reste bloque jusqu'a ce que le livreur scanne ton code.
                </Text>
                <Link label="Deposer plus d'argent" onPress={openDeposit} />
              </>
            ) : (
              <>
                <Text className="text-[13px] font-semibold text-red-600">
                  Solde insuffisant : il te manque {money(missing)} pour payer {money(total)}.
                </Text>
                <Btn label="DEPOSER DE L'ARGENT" onPress={openDeposit} />
              </>
            )
          ) : (
            <Btn label="DEPOSER DE L'ARGENT" onPress={openDeposit} />
          )}
        </View>
      )}
    </View>
  );
}
