// Version web : la connexion Google n'existe que dans l'APK. Ce fichier evite d'embarquer la bibliotheque native dans le site web.
export const googleAvailable = false;

const NO = { ok: false, error: "Connexion Google disponible dans l'application uniquement" };

export function googleIdentity() {
  return Promise.resolve(NO);
}

export function loginWithIdToken() {
  return Promise.resolve(NO);
}

export function signInWithGoogle() {
  return Promise.resolve(NO);
}
