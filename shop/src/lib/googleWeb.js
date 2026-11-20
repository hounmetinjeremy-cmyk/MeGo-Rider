import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";

// Connexion Google sur le lien web (Google Identity Services). Scopes de base uniquement : openid, email, profile.
// Le Web client ID est lu a la construction du site (variable EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, Cloudflare Pages).
// Il doit etre le MEME que GOOGLE_WEB_CLIENT_ID cote serveur, et l'adresse du site doit etre dans les
// "Origines JavaScript autorisees" de ce client OAuth dans Google Cloud Console.
export const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";

let gsiPromise = null;

function loadGsi() {
  if (typeof window === "undefined" || typeof document === "undefined") return Promise.reject(new Error("no dom"));
  if (window.google && window.google.accounts && window.google.accounts.id) return Promise.resolve(window.google);
  if (gsiPromise) return gsiPromise;
  gsiPromise = new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = "https://accounts.google.com/gsi/client";
    el.async = true;
    el.defer = true;
    el.onload = () => resolve(window.google);
    el.onerror = () => {
      gsiPromise = null; // on pourra reessayer a la main (nouvel affichage), jamais en boucle
      reject(new Error("gsi"));
    };
    document.head.appendChild(el);
  });
  return gsiPromise;
}

export function GoogleButton({ onToken, onError }) {
  const holder = useRef(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (Platform.OS !== "web" || !googleClientId) return undefined;
    let alive = true;
    loadGsi()
      .then((google) => {
        if (!alive || !holder.current) return;
        google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (resp) => {
            if (resp && resp.credential && cb.current) cb.current(resp.credential);
          },
          auto_select: false,
        });
        google.accounts.id.renderButton(holder.current, { theme: "outline", size: "large", text: "continue_with", width: 280 });
      })
      .catch(() => {
        if (alive && onError) onError("Google indisponible, verifie ta connexion internet");
      });
    return () => {
      alive = false;
    };
  }, []);

  if (Platform.OS !== "web" || !googleClientId) return null;
  return React.createElement("div", { ref: holder, style: { display: "flex", justifyContent: "center", minHeight: 44 } });
}
