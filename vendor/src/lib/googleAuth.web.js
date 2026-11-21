// Version web : la connexion Google n'existe que dans l'APK. Ce fichier evite d'embarquer la bibliotheque native dans le site web.
export const googleAvailable = false;

export function signInWithGoogle() {
  return Promise.resolve({ ok: false, error: "Connexion Google disponible dans l'application uniquement" });
}
