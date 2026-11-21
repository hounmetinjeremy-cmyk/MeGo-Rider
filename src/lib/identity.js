import { useEffect, useState } from "react";

// Identite Google de la session en cours (jeton d'identite + e-mail), gardee en MEMOIRE uniquement, jamais stockee.
// Le meme objet est partage par toutes les copies de ce fichier (racine et vendor) via globalThis.
// Elle reste valable 24 h. Le jeton Google lui-meme dure ~1 h : googleAuth.js le renouvelle sans rien afficher.
const G = typeof globalThis !== "undefined" ? globalThis : {};
if (!G.__MEGO_ID__) G.__MEGO_ID__ = { value: null, subs: [] };
const S = G.__MEGO_ID__;
const MAX_AGE = 24 * 60 * 60 * 1000;

export function getIdentity() {
  const v = S.value;
  if (v && Date.now() - v.at > MAX_AGE) {
    S.value = null;
    return null;
  }
  return v;
}

export function setIdentity(v) {
  S.value = v ? { ...v, at: Date.now() } : null;
  S.subs.slice().forEach((f) => f());
}

export function useIdentity() {
  const [v, setV] = useState(getIdentity);
  useEffect(() => {
    const f = () => setV(getIdentity());
    S.subs.push(f);
    return () => {
      S.subs = S.subs.filter((x) => x !== f);
    };
  }, []);
  return v;
}
