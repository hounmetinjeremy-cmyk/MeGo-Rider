import "./global.css";
import { registerRootComponent } from "expo";

import App from "./App";
import WalletApp from "./src/WalletApp";

// /?wallet=1 : page "Mon portefeuille" seule (depot d'argent), ouverte depuis les applications Livreur et Vendeur.
const walletMode = typeof window !== "undefined" && /[?&]wallet=1(&|$)/.test(window.location.search || "");

registerRootComponent(walletMode ? WalletApp : App);
