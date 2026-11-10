# MeGo Rider — UI livreur (React Native / Expo + Tailwind)

Interface mobile du profil livreur, reproduite d'après la maquette :

- **Écran 1 — Commandes** : header burger vert, top tabs (Nouvel Ordre / En traitement / Livré), état vide, bottom nav navy.
- **Écran 2 — Drawer profil** : bannière verte (avatar JS, disponibilité + switch), liste de 11 options avec séparateurs.

## Palette

| Rôle | Hex |
|---|---|
| Primaire | `#76D865` |
| Primaire clair | `#EBF9E8` |
| Navy (bottom nav) | `#1A2433` |
| Texte | `#1D1D1D` |
| Texte secondaire | `#7E8B9B` |
| Bordures | `#E5E7EB` |
| Fond icônes | `#F4F5F7` |

## Structure

```
App.js                     # état global : onglet actif, drawer, disponibilité
src/theme/colors.js        # palette JS (icônes vectorielles)
src/components/AppHeader.js
src/components/TopTabBar.js
src/components/EmptyState.js
src/components/BottomNavBar.js
src/components/MenuItem.js
src/screens/OrdersScreen.js
src/screens/DrawerMenu.js
```

## Lancer

```bash
npm install
npx expo start
```

Tailwind via NativeWind v4 (`tailwind.config.js` + `global.css`).
