-- ============================================================
-- MeGo Rider — schéma Supabase (application livreur)
-- À exécuter dans Supabase → SQL Editor (idempotent)
-- ============================================================

-- 1. Statuts de commande
 do $$ begin
  create type order_status as enum ('NEW', 'IN_PROGRESS', 'DELIVERED');
exception when duplicate_object then null; end $$;

-- 2. Table riders (profils livreurs)
create table if not exists public.riders (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  rider_code text,
  phone text,
  is_available boolean not null default false,
  vehicle_type text,
  wallet_balance numeric(12,2) not null default 0,
  total_earnings numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.riders
  add column if not exists full_name text,
  add column if not exists rider_code text,
  add column if not exists is_available boolean not null default false,
  add column if not exists vehicle_type text,
  add column if not exists wallet_balance numeric(12,2) not null default 0,
  add column if not exists total_earnings numeric(12,2) not null default 0;

-- 3. Table orders (commandes)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text,
  rider_id uuid references public.riders(id) on delete set null,
  vendor_name text,
  pickup_address text,
  delivery_address text,
  amount numeric(12,2) not null default 0,
  status order_status not null default 'NEW',
  created_at timestamptz not null default now()
);

alter table public.orders
  add column if not exists order_code text,
  add column if not exists rider_id uuid references public.riders(id) on delete set null,
  add column if not exists vendor_name text,
  add column if not exists pickup_address text,
  add column if not exists delivery_address text,
  add column if not exists amount numeric(12,2) not null default 0;

-- 4. Reprise des anciennes colonnes (reference, customer_name, address, total)
update public.riders
   set full_name = coalesce(full_name, name),
       vehicle_type = coalesce(vehicle_type, vehicle)
 where full_name is null or vehicle_type is null;

update public.orders
   set order_code = coalesce(order_code, reference),
       vendor_name = coalesce(vendor_name, customer_name),
       delivery_address = coalesce(delivery_address, address),
       amount = coalesce(amount, total)
 where order_code is null or vendor_name is null
    or delivery_address is null or amount is null;

-- 5. Index
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_rider_idx on public.orders (rider_id);

-- 6. RLS + politiques (démo : accès public ; à restreindre en production)
alter table public.riders enable row level security;
alter table public.orders enable row level security;

drop policy if exists riders_all on public.riders;
create policy riders_all on public.riders for all using (true) with check (true);

drop policy if exists orders_all on public.orders;
create policy orders_all on public.orders for all using (true) with check (true);

-- 7. Temps réel sur orders
do $$ begin
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object then null; end $$;

-- 8. Jeu de données de démonstration
insert into public.riders (full_name, rider_code, phone, vehicle_type, is_available, wallet_balance, total_earnings)
values ('Koffi Adjovi', 'RID-001', '+229 90 12 34 56', 'Moto', true, 12500, 48000)
on conflict do nothing;

insert into public.orders (order_code, vendor_name, pickup_address, delivery_address, amount, status)
values
  ('CMD-1001', 'Boutique Chez Rita', 'Marché Dantokpa, Cotonou', 'Fidjrossè, rue 12', 4500, 'NEW'),
  ('CMD-1002', 'Pharmacie du Lac', 'Akpakpa, Cotonou', 'Sainte-Rita, Cotonou', 3200, 'NEW')
on conflict do nothing;
