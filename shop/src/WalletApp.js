import React, { useEffect, useState } from "react";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import WalletScreen from "./screens/WalletScreen";
import { rpc } from "./lib/wallet";

// Page "Mon portefeuille" seule (sans boutique) : le retour est assure par la fenetre de l'application (bouton Retour).
export default function WalletApp() {
  const [sandbox, setSandbox] = useState(false);

  useEffect(() => {
    rpc("get_payment_config")
      .then((cfg) => setSandbox(!!(cfg && cfg.sandbox === true)))
      .catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-surface">
        <WalletScreen sandbox={sandbox} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
