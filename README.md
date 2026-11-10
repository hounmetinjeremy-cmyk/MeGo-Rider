# MeGo Rider — UI (React Native / Expo + NativeWind)

Reproduction de l'interface livreur : écran **Commandes** + **menu latéral (drawer profil)**.

## Palette
| Rôle | Hex |
| --- | --- |
| Primaire (vert) | `#76D865` |
| Vert clair (item actif) | `#EBF9E8` |
| Fond sombre nav | `#1A2433` |
| Texte principal | `#1D1D1D` |
| Texte secondaire | `#7E8B9B` |
| Bordures | `#E5E7EB` |
| Fond icônes | `#F4F5F7` |

## Structure
```
App.js                     -> état global (drawer ouvert/fermé)
src/theme/colors.js        -> palette
src/components/AppHeader.js    -> header + burger vert
src/components/TopTabBar.js    -> onglets + indicateur vert
src/components/EmptyState.js   -> icône portefeuille + message
src/components/BottomNavBar.js -> nav sombre 4 items
src/screens/OrdersScreen.js    -> Écran 1 (état des onglets)
src/screens/DrawerMenu.js      -> Écran 2 (profil + 11 options)
```

## Lancer
```bash
npm install
npx expo start
```
