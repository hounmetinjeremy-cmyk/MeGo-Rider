-- MeGo Rider — schéma v3 : tables des écrans du menu latéral
-- À exécuter dans Supabase → SQL Editor → Run

-- 1. Comptes bancaires du livreur
create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.riders(id) on delete cascade,
  holder_name text not null,
  bank_name text not null,
  account_number text not null,
  is_default boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. Sujets d'aide
create table if not exists public.help_topics (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  question text not null,
  answer text not null,
  position int not null default 0
);

-- 3. Tickets de support
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid references public.riders(id) on delete set null,
  subject text not null,
  message text not null,
  status text not null default 'OPEN',
  created_at timestamptz not null default now()
);

-- 4. Notifications livreur
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid references public.riders(id) on delete cascade,
  title text not null,
  body text,
  order_id uuid references public.orders(id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- 5. Demandes de retrait
create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.riders(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'PENDING',
  created_at timestamptz not null default now()
);

-- Index
create index if not exists bank_accounts_rider_idx on public.bank_accounts(rider_id);
create index if not exists notifications_rider_idx on public.notifications(rider_id, is_read);
create index if not exists withdrawals_rider_idx on public.withdrawals(rider_id);

-- RLS + accès (à durcir quand l'authentification sera en place)
alter table public.bank_accounts enable row level security;
alter table public.help_topics enable row level security;
alter table public.support_tickets enable row level security;
alter table public.notifications enable row level security;
alter table public.withdrawals enable row level security;

do $$
declare t text;
begin
  foreach t in array array['bank_accounts','help_topics','support_tickets','notifications','withdrawals'] loop
    execute format('drop policy if exists %I_all on public.%I', t, t);
    execute format('create policy %I_all on public.%I for all using (true) with check (true)', t, t);
  end loop;
end $$;

-- Sujets d'aide par défaut
insert into public.help_topics (slug, question, answer, position) values
  ('accept', 'Comment accepter une livraison ?', 'Ouvrez l''onglet Nouvel Ordre puis appuyez sur « Accepter la livraison ». La commande passe en traitement et vous est assignée.', 1),
  ('deliver', 'Comment marquer une commande livrée ?', 'Dans l''onglet En traitement, appuyez sur « Marquer comme livrée ». Le montant est crédité sur votre portefeuille.', 2),
  ('wallet', 'Quand suis-je payé ?', 'Chaque livraison terminée crédite immédiatement votre portefeuille. Le retrait se demande depuis l''écran Revenus.', 3),
  ('availability', 'À quoi sert le switch Disponibilité ?', 'En position Disponible, vous recevez les nouvelles commandes. En Inactif, vous n''en recevez plus.', 4)
on conflict (slug) do nothing;
