# MeGo Rider

Application mobile du livreur (React Native / Expo + NativeWind), connectée à Supabase.

## Démarrage

```bash
npm install
npx expo start
```

## Structure

- `App.js` — état global : drawer, onglet de navigation, profil livreur, commandes.
- `src/components/` — `Icon` (SVG inline, style Lucide), `AppHeader`, `BottomNavBar`, `MenuItem`,
  `RiderProfileBanner`, `TopTabBar`, `OrderCard`, `EmptyState`, `StatCard`.
- `src/screens/` — `OrdersScreen`, `WalletScreen`, `EarningsScreen`, `ProfileScreen`, `DrawerMenu`.
- `src/hooks/` — `useRider` (profil + disponibilité), `useOrders` (commandes + temps réel).
- `src/lib/` — `supabaseClient.js` (client), `orders.js` (requêtes, mapping, formatage).
- `supabase/schema.sql` — script SQL complet (tables, index, RLS, temps réel, démo).

## Base de données

Exécuter `supabase/schema.sql` dans Supabase → SQL Editor.

Variables d'environnement optionnelles (`.env`) :

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_RIDER_ID=...   # livreur courant (sinon le premier de la table)
```

## Fonctionnalités

- Switch **Disponibilité** → met à jour `riders.is_available`.
- Commandes en **temps réel** (`supabase.channel`) : onglets Nouvel Ordre / En traitement / Livré.
- Actions sur les cartes : **Accepter la livraison** (`IN_PROGRESS` + `rider_id`) et
  **Marquer comme livrée** (`DELIVERED`).
- Portefeuille et revenus lus depuis `riders.wallet_balance` / `riders.total_earnings`.

## Déploiement web

Cloudflare Pages : build `npm install && npx expo export --platform web`, dossier `dist`.
