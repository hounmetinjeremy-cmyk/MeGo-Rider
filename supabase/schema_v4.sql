-- ============================================================
-- MeGo — schéma v4 : boutique publique, commande client, livreur le plus proche
-- À exécuter dans Supabase → SQL Editor (idempotent : on peut le relancer sans risque).
-- Paiement : pas encore branché. Tant que app_settings.test_payments = 'true', la page boutique propose un
-- bouton « Payer (test) » qui simule la confirmation du paiement. Le vrai paiement appellera confirm_payment().
-- Les règles d'accès (RLS) des anciennes tables restent ouvertes (démo) : à durcir AVANT d'accepter de l'argent réel.
-- ============================================================

-- 1. Réglages -------------------------------------------------------------------------------------------
create table if not exists public.app_settings (
  key text primary key,
  value text not null
);
alter table public.app_settings enable row level security;  -- aucune politique : seules les fonctions ci-dessous la lisent

insert into public.app_settings (key, value) values
  ('delivery_fee', '500'),               -- frais de livraison (XOF)
  ('test_payments', 'true'),             -- 'true' = bouton « Payer (test) » actif ; mettre 'false' avant la mise en ligne
  ('offer_seconds', '60'),               -- délai de réponse du livreur
  ('max_offer_attempts', '8'),           -- nombre de livreurs essayés au maximum
  ('rider_location_max_age_min', '15')   -- un livreur sans position récente n'est pas proposé
on conflict (key) do nothing;

create or replace function public.setting(p_key text, p_default text)
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select value from public.app_settings where key = p_key), p_default)
$$;

-- 2. Boutique : lien public (nom court) et position -----------------------------------------------------
alter table public.vendors add column if not exists slug text;
alter table public.vendors add column if not exists latitude double precision;
alter table public.vendors add column if not exists longitude double precision;
alter table public.vendors add column if not exists shop_description text;
create unique index if not exists vendors_slug_key on public.vendors (slug);

create or replace function public.slugify(txt text) returns text language sql immutable as $$
  select btrim(regexp_replace(lower(translate(coalesce(txt, ''),
    'àâäáãåçéèêëíìîïñóòôöõúùûüýÿÀÂÄÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝ',
    'aaaaaaceeeeiiiinooooouuuuyyaaaaaaceeeeiiiinooooouuuuy')), '[^a-z0-9]+', '-', 'g'), '-')
$$;

create or replace function public.vendors_set_slug() returns trigger language plpgsql as $$
declare base text; candidate text; n int := 1;
begin
  if new.slug is null or btrim(new.slug) = '' then
    base := public.slugify(new.name);
    if base = '' then base := 'boutique'; end if;
    candidate := base;
    while exists (select 1 from public.vendors v where v.slug = candidate and v.id is distinct from new.id) loop
      n := n + 1;
      candidate := base || '-' || n;
    end loop;
    new.slug := candidate;
  else
    new.slug := public.slugify(new.slug);
  end if;
  return new;
end $$;

drop trigger if exists vendors_slug_trg on public.vendors;
create trigger vendors_slug_trg before insert or update of name, slug on public.vendors
  for each row execute function public.vendors_set_slug();

update public.vendors set name = name where slug is null;   -- crée le lien des boutiques existantes

-- 3. Livreurs : position ------------------------------------------------------------------------------------
alter table public.riders add column if not exists latitude double precision;
alter table public.riders add column if not exists longitude double precision;
alter table public.riders add column if not exists location_updated_at timestamptz;

-- 4. Commandes : client, paiement, offre au livreur ---------------------------------------------------------
alter table public.orders add column if not exists vendor_id uuid;
alter table public.orders add column if not exists items jsonb;
alter table public.orders add column if not exists note text;
alter table public.orders add column if not exists delivery_lat double precision;
alter table public.orders add column if not exists delivery_lng double precision;
alter table public.orders add column if not exists delivery_fee numeric default 0;
alter table public.orders add column if not exists payment_status text;        -- PENDING, PAID (vide pour les anciennes commandes)
alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders add column if not exists payment_ref text;
alter table public.orders add column if not exists dispatch_status text;       -- WAITING_PAYMENT, SEARCHING, OFFERED, ASSIGNED, NO_RIDER
alter table public.orders add column if not exists offered_rider_id uuid;
alter table public.orders add column if not exists offer_expires_at timestamptz;
alter table public.orders add column if not exists offer_attempts int not null default 0;
alter table public.orders add column if not exists declined_rider_ids uuid[] not null default '{}';
alter table public.orders add column if not exists assigned_at timestamptz;
create index if not exists orders_dispatch_idx on public.orders (status, dispatch_status);
create index if not exists orders_vendor_idx on public.orders (vendor_id);
create sequence if not exists public.order_code_seq start 2000;

-- 5. Page boutique : lecture publique (nom, produits publiés) ---------------------------------------------
create or replace function public.get_shop(p_slug text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v public.vendors%rowtype;
begin
  select * into v from public.vendors where slug = lower(btrim(p_slug));
  if not found then return jsonb_build_object('ok', false, 'error', 'Boutique introuvable'); end if;
  return jsonb_build_object(
    'ok', true,
    'vendor', jsonb_build_object('name', v.name, 'slug', v.slug, 'logo_url', v.logo_url, 'category', v.category,
                                 'address', v.address, 'phone', v.phone, 'description', v.shop_description,
                                 'is_open', coalesce(v.is_open, true)),
    'delivery_fee', public.setting('delivery_fee', '500')::numeric,
    'products', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'description', p.description, 'price', p.price,
                                          'currency', p.currency, 'category', p.category, 'image_url', p.image_url)
                       order by p.category nulls last, p.created_at desc)
        from public.vendor_products p
       where p.vendor_id = v.id and p.is_available is not false), '[]'::jsonb));
end $$;

-- 6. Commande du client : le serveur recalcule TOUT (les prix du téléphone ne comptent jamais) ---------
create or replace function public.place_order(
  p_slug text, p_items jsonb, p_customer_name text, p_customer_phone text,
  p_address text, p_lat double precision, p_lng double precision, p_note text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v public.vendors%rowtype; it jsonb; prod public.vendor_products%rowtype; qty int;
  subtotal numeric := 0; fee numeric := public.setting('delivery_fee', '500')::numeric;
  lines jsonb := '[]'::jsonb; oid uuid; code text;
begin
  select * into v from public.vendors where slug = lower(btrim(p_slug));
  if not found then return jsonb_build_object('ok', false, 'error', 'Boutique introuvable'); end if;
  if v.is_open is false then return jsonb_build_object('ok', false, 'error', 'La boutique est fermée pour le moment'); end if;
  if btrim(coalesce(p_customer_name, '')) = '' or length(regexp_replace(coalesce(p_customer_phone, ''), '[^0-9]', '', 'g')) < 8 then
    return jsonb_build_object('ok', false, 'error', 'Nom et téléphone obligatoires');
  end if;
  if btrim(coalesce(p_address, '')) = '' then
    return jsonb_build_object('ok', false, 'error', 'Adresse de livraison obligatoire');
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 40 then
    return jsonb_build_object('ok', false, 'error', 'Panier vide');
  end if;
  for it in select * from jsonb_array_elements(p_items) loop
    qty := coalesce((it ->> 'qty')::int, 0);
    if qty < 1 or qty > 50 then return jsonb_build_object('ok', false, 'error', 'Quantité invalide'); end if;
    select * into prod from public.vendor_products
     where id::text = (it ->> 'id') and vendor_id = v.id and is_available is not false;
    if not found then return jsonb_build_object('ok', false, 'error', 'Un produit n''est plus disponible'); end if;
    -- stock : 0 ou vide = non suivi
    if coalesce(prod.stock, 0) > 0 and qty > prod.stock then
      return jsonb_build_object('ok', false, 'error', 'Stock insuffisant pour ' || prod.name);
    end if;
    subtotal := subtotal + coalesce(prod.price, 0) * qty;
    lines := lines || jsonb_build_object('id', prod.id, 'name', prod.name, 'price', prod.price, 'qty', qty);
  end loop;

  code := 'CMD-' || nextval('public.order_code_seq');
  insert into public.orders (order_code, vendor_id, vendor_name, pickup_address, delivery_address, customer_name, customer_phone,
                             items, amount, delivery_fee, currency, note, delivery_lat, delivery_lng,
                             status, payment_status, dispatch_status)
  values (code, v.id, v.name, v.address, btrim(p_address), btrim(p_customer_name), btrim(p_customer_phone),
          lines, subtotal + fee, fee, 'XOF', nullif(btrim(coalesce(p_note, '')), ''), p_lat, p_lng,
          'NEW', 'PENDING', 'WAITING_PAYMENT')
  returning id into oid;

  return jsonb_build_object('ok', true, 'order_id', oid, 'code', code, 'subtotal', subtotal, 'delivery_fee', fee,
                            'total', subtotal + fee, 'test_payments', public.setting('test_payments', 'false') = 'true');
end $$;

-- 7. Recherche du livreur le plus proche du VENDEUR et envoi de l'offre (délai limité) -----------------
create or replace function public.dispatch_order(p_order_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  o public.orders%rowtype; v_lat double precision; v_lng double precision; rid uuid;
  secs int := public.setting('offer_seconds', '60')::int;
  maxatt int := public.setting('max_offer_attempts', '8')::int;
  age int := public.setting('rider_location_max_age_min', '15')::int;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or o.status <> 'NEW' or o.payment_status is distinct from 'PAID' then return 'skip'; end if;
  if o.offer_attempts >= maxatt or o.created_at < now() - interval '45 minutes' then
    update public.orders set dispatch_status = 'NO_RIDER', offered_rider_id = null, offer_expires_at = null where id = o.id;
    return 'no_rider';
  end if;

  select latitude, longitude into v_lat, v_lng from public.vendors where id = o.vendor_id;
  v_lat := coalesce(v_lat, o.delivery_lat);
  v_lng := coalesce(v_lng, o.delivery_lng);

  select cand.id into rid from (
    select ri.id, ri.location_updated_at,
           case when v_lat is null or v_lng is null then 0 else
             6371 * 2 * asin(least(1, sqrt(
               power(sin(radians(ri.latitude - v_lat) / 2), 2) +
               cos(radians(v_lat)) * cos(radians(ri.latitude)) * power(sin(radians(ri.longitude - v_lng) / 2), 2)))) end as km
      from public.riders ri
     where ri.is_available = true
       and ri.latitude is not null and ri.longitude is not null
       and ri.location_updated_at > now() - make_interval(mins => age)
       and not (ri.id = any (o.declined_rider_ids))
       and not exists (select 1 from public.orders x
                        where x.id <> o.id
                          and ((x.rider_id = ri.id and x.status = 'IN_PROGRESS')
                            or (x.offered_rider_id = ri.id and x.status = 'NEW' and x.offer_expires_at > now())))
     order by km asc, ri.location_updated_at desc
     limit 1
       for update of ri skip locked
  ) cand;

  if rid is null then
    update public.orders set dispatch_status = 'SEARCHING', offered_rider_id = null, offer_expires_at = null where id = o.id;
    return 'searching';
  end if;

  update public.orders
     set offered_rider_id = rid, offer_expires_at = now() + make_interval(secs => secs),
         offer_attempts = offer_attempts + 1, dispatch_status = 'OFFERED'
   where id = o.id;
  return 'offered';
end $$;

-- 8. Paiement confirmé -> on cherche le livreur ----------------------------------------------------------
create or replace function public.confirm_payment(p_order_id uuid, p_ref text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  update public.orders set payment_status = 'PAID', paid_at = now(), payment_ref = p_ref, dispatch_status = 'SEARCHING'
   where id = p_order_id and payment_status = 'PENDING';
  if not found then return jsonb_build_object('ok', false, 'error', 'Commande introuvable ou déjà payée'); end if;
  return jsonb_build_object('ok', true, 'dispatch', public.dispatch_order(p_order_id));
end $$;

-- Paiement simulé (tests uniquement, désactivable avec app_settings.test_payments = 'false')
create or replace function public.test_pay_order(p_order_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if public.setting('test_payments', 'false') <> 'true' then
    return jsonb_build_object('ok', false, 'error', 'Paiement de test désactivé');
  end if;
  return public.confirm_payment(p_order_id, 'TEST');
end $$;

-- 9. Le livreur répond à l'offre -------------------------------------------------------------------------------
create or replace function public.accept_order(p_order_id uuid, p_rider_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update public.orders
     set status = 'IN_PROGRESS', rider_id = p_rider_id, dispatch_status = 'ASSIGNED', assigned_at = now(),
         offered_rider_id = null, offer_expires_at = null
   where id = p_order_id and status = 'NEW'
     and ((offered_rider_id = p_rider_id and offer_expires_at > now()) or dispatch_status is null);
  return found;
end $$;

create or replace function public.decline_order(p_order_id uuid, p_rider_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update public.orders
     set declined_rider_ids = array_append(declined_rider_ids, p_rider_id),
         offered_rider_id = null, offer_expires_at = null, dispatch_status = 'SEARCHING'
   where id = p_order_id and status = 'NEW' and offered_rider_id = p_rider_id;
  if found then
    perform public.dispatch_order(p_order_id);
    return true;
  end if;
  return false;
end $$;

-- Offres expirées ou sans livreur : on passe au suivant (appelée chaque minute, et par les applications)
create or replace function public.reassign_expired_offers() returns int
language plpgsql security definer set search_path = public as $$
declare o record; n int := 0;
begin
  for o in
    select id, offered_rider_id from public.orders
     where status = 'NEW' and payment_status = 'PAID'
       and ((dispatch_status = 'OFFERED' and offer_expires_at < now()) or dispatch_status = 'SEARCHING')
     limit 50
       for update skip locked
  loop
    if o.offered_rider_id is not null then
      update public.orders set declined_rider_ids = array_append(declined_rider_ids, o.offered_rider_id), offered_rider_id = null
       where id = o.id;
    end if;
    perform public.dispatch_order(o.id);
    n := n + 1;
  end loop;
  return n;
end $$;

-- 10. Position du livreur --------------------------------------------------------------------------------------
create or replace function public.update_rider_location(p_rider_id uuid, p_lat double precision, p_lng double precision)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then return false; end if;
  update public.riders set latitude = p_lat, longitude = p_lng, location_updated_at = now() where id = p_rider_id;
  return found;
end $$;

-- 11. Suivi de commande côté client (l'identifiant de la commande sert de clé) ---------------------------
create or replace function public.get_order_status(p_order_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype; r public.riders%rowtype;
begin
  select * into o from public.orders where id = p_order_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'Commande introuvable'); end if;
  if o.rider_id is not null then select * into r from public.riders where id = o.rider_id; end if;
  return jsonb_build_object('ok', true, 'code', o.order_code, 'status', o.status::text, 'dispatch', o.dispatch_status,
                            'payment', o.payment_status, 'total', o.amount, 'vendor', o.vendor_name,
                            'rider_name', r.full_name, 'rider_phone', r.phone);
end $$;

-- 12. Droits : les fonctions sensibles ne sont PAS appelables par le public ---------------------------------
revoke all on function public.dispatch_order(uuid) from public, anon, authenticated;
revoke all on function public.confirm_payment(uuid, text) from public, anon, authenticated;
revoke all on function public.setting(text, text) from public, anon, authenticated;
grant execute on function public.get_shop(text) to anon, authenticated;
grant execute on function public.place_order(text, jsonb, text, text, text, double precision, double precision, text) to anon, authenticated;
grant execute on function public.test_pay_order(uuid) to anon, authenticated;
grant execute on function public.get_order_status(uuid) to anon, authenticated;
grant execute on function public.accept_order(uuid, uuid) to anon, authenticated;
grant execute on function public.decline_order(uuid, uuid) to anon, authenticated;
grant execute on function public.update_rider_location(uuid, double precision, double precision) to anon, authenticated;
grant execute on function public.reassign_expired_offers() to anon, authenticated;

-- 13. Tâche chaque minute (si l'extension pg_cron est disponible ; sinon les applications relancent la recherche) -
do $$ begin
  create extension if not exists pg_cron;
  perform cron.schedule('mego-reassign-offers', '* * * * *', 'select public.reassign_expired_offers()');
exception when others then
  raise notice 'pg_cron indisponible : %', sqlerrm;
end $$;

-- 14. Données de test : positions à Cotonou (uniquement là où elles sont vides) --------------------------
update public.vendors set latitude = 6.3703, longitude = 2.3912 where latitude is null;
update public.riders set latitude = 6.3650, longitude = 2.4180, location_updated_at = now() where latitude is null;
