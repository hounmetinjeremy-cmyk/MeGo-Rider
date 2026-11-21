# MeGo-Rider — notes

## But
APK : connexion Google d'abord, puis choix Vendeur / Livreur, sans redemander le compte.

## Fait
- `src/lib/googleAuth.js` : `googleIdentity()` (etape 1, choix du compte, identite gardee en memoire via `identity.js`) et `loginWithIdentity(kind)` (etape 2, ouvre la session du role avec le jeton deja obtenu). `run(kind, link, presetToken)` accepte un jeton prealable.
- `src/lib/googleAuth.web.js` : `googleIdentity()` ajoute (stub web, Google = APK seulement).
- `AppShell.js` : ecran Google -> `RoleSelect` -> app du role ; si l'identite est deja en memoire, on saute l'ecran Google.
- `src/components/AuthGate.js` : si une identite Google existe, utilise `loginWithIdentity` au lieu de rouvrir la fenetre Google (evite le doublon).
- `vendor/src/lib/*` et `vendor/src/components/AuthGate.js` : copies synchronisees.
- Supabase verifie : `public.accounts` (kind, phone, google_sub, unique (kind, phone)), RPC `google_login(p_id_token, p_kind, p_link)` -> cree/retrouve le compte vendeur ou livreur et renvoie `{ok, token, owner_id, kind}`.

## Reste a faire
- Build APK (EAS) pour tester la fenetre Google reelle.
- Verifier le flux vendeur de bout en bout dans l'APK.

## Chemins utiles
- `AppShell.js` (racine, monte par `index.js`), `App.js` (livreur), `vendor/App.js` (vendeur)
- `src/lib/googleAuth.js`, `src/lib/identity.js`, `src/components/AuthGate.js`, `src/screens/RoleSelect.js`
- `shop/functions/api/google-login.js` (verifie le jeton Google cote serveur)
