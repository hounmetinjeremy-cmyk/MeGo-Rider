-- ============================================================
-- MeGo — schéma v5 : visibilité marketplace, frais de livraison par zone, onglet Découverte
-- À exécuter APRÈS schema_v4.sql, dans Supabase → SQL Editor (idempotent).
-- CAS A : is_marketplace_visible = false  → la boutique reste accessible par son lien (vitrine privée).
-- CAS B : is_marketplace_visible = true   → la boutique apparaît dans le flux global / Découverte.
-- ============================================================

-- 1. Visibilité marketplace -----------------------------------------------------------------------------
alter table public.vendors add column if not exists is_marketplace_visible boolean not null default false;
alter table public.vendors add column if not exists marketplace_visible_at timestamptz;
create index if not exists vendors_marketplace_idx on public.vendors (is_marketplace_visible, is_open);

-- 2. Frais de livraison par zone (saisis par le vendeur) -------------------------------------------------
create table if not exists public.vendor_zones (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  name text not null,
  fee numeric not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists vendor_zones_vendor_idx on public.vendor_zones (vendor_id, is_active);
alter table public.vendor_zones enable row level security;  -- aucune politique : accès via les fonctions ci-dessous

-- Zone par défaut d'une boutique : reprend le réglage global delivery_fee.
create or replace function public.vendor_default_zone(p_vendor_id uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce((select min(z.fee) from public.vendor_zones z
                    where z.vendor_id = p_vendor_id and z.is_active), public.setting('delivery_fee', '500')::numeric)
$$;

-- 3. Découverte : likes et commentaires ----------------------------------------------------------------
create table if not exists public.shop_likes (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  device_id text not null,
  created_at timestamptz not null default now(),
  unique (vendor_id, device_id)
);
create index if not exists shop_likes_vendor_idx on public.shop_likes (vendor_id);
alter table public.shop_likes enable row level security;

create table if not exists public.shop_comments (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  device_id text,
  author_name text,
  body text not null,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists shop_comments_vendor_idx on public.shop_comments (vendor_id, created_at desc);
alter table public.shop_comments enable row level security;

-- 4. Page boutique : ajoute visibilité, zones, likes et commentaires ------------------------------------
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
                                 'is_open', coalesce(v.is_open, true),
                                 'is_marketplace_visible', coalesce(v.is_marketplace_visible, false)),
    'delivery_fee', public.vendor_default_zone(v.id),
    'zones', coalesce((
      select jsonb_agg(jsonb_build_object('id', z.id, 'name', z.name, 'fee', z.fee) order by z.fee, z.name)
        from public.vendor_zones z where z.vendor_id = v.id and z.is_active), '[]'::jsonb),
    'likes_count', (select count(*) from public.shop_likes l where l.vendor_id = v.id),
    'comments', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'author_name', c.author_name, 'body', c.body, 'created_at', c.created_at)
                       order by c.created_at desc)
        from (select * from public.shop_comments c
               where c.vendor_id = v.id and c.is_hidden is not true
               order by c.created_at desc limit 30) c), '[]'::jsonb),
    'products', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'description', p.description, 'price', p.price,
                                          'currency', p.currency, 'category', p.category, 'image_url', p.image_url)
                       order by p.category nulls last, p.created_at desc)
        from public.vendor_products p
       where p.vendor_id = v.id and p.is_available is not false), '[]'::jsonb));
end $$;

-- 5. Commande : le frais vient de la zone choisie (sinon zone par défaut) -------------------------------
create or replace function public.place_order(
  p_slug text, p_items jsonb, p_customer_name text, p_customer_phone text,
  p_address text, p_lat double precision, p_lng double precision, p_note text default null,
  p_zone_id uuid default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v public.vendors%rowtype; it jsonb; prod public.vendor_products%rowtype; qty int;
  subtotal numeric := 0; fee numeric; lines jsonb := '[]'::jsonb; oid uuid; code text; zname text;
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

  if p_zone_id is not null then
    select z.fee, z.name into fee, zname from public.vendor_zones z
     where z.id = p_zone_id and z.vendor_id = v.id and z.is_active;
    if not found then return jsonb_build_object('ok', false, 'error', 'Zone de livraison invalide'); end if;
  else
    fee := public.vendor_default_zone(v.id);
  end if;

  for it in select * from jsonb_array_elements(p_items) loop
    qty := coalesce((it ->> 'qty')::int, 0);
    if qty < 1 or qty > 50 then return jsonb_build_object('ok', false, 'error', 'Quantité invalide'); end if;
    select * into prod from public.vendor_products
     where id::text = (it ->> 'id') and vendor_id = v.id and is_available is not false;
    if not found then return jsonb_build_object('ok', false, 'error', 'Un produit n''est plus disponible'); end if;
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
                            'zone_name', zname, 'total', subtotal + fee,
                            'test_payments', public.setting('test_payments', 'false') = 'true');
end $$;

-- 6. Flux global / Découverte : boutiques visibles uniquement ------------------------------------------
create or replace function public.get_discovery(p_limit int default 20, p_offset int default 0, p_device_id text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare lim int := least(greatest(coalesce(p_limit, 20), 1), 50); off int := greatest(coalesce(p_offset, 0), 0);
begin
  return coalesce((
    select jsonb_agg(x order by x ->> 'name')
      from (
        select jsonb_build_object(
          'name', v.name, 'slug', v.slug, 'logo_url', v.logo_url, 'category', v.category,
          'address', v.address, 'description', v.shop_description,
          'is_open', coalesce(v.is_open, true),
          'delivery_fee', public.vendor_default_zone(v.id),
          'likes_count', (select count(*) from public.shop_likes l where l.vendor_id = v.id),
          'comments_count', (select count(*) from public.shop_comments c where c.vendor_id = v.id and c.is_hidden is not true),
          'liked', case when p_device_id is null then false else exists (
                     select 1 from public.shop_likes l where l.vendor_id = v.id and l.device_id = p_device_id) end,
          'products', coalesce((
            select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'price', p.price, 'currency', p.currency,
                                                'image_url', p.image_url, 'category', p.category)
                              order by p.created_at desc)
              from (select * from public.vendor_products p
                     where p.vendor_id = v.id and p.is_available is not false
                     order by p.created_at desc limit 4) p), '[]'::jsonb)
        ) as x
          from public.vendors v
         where coalesce(v.is_marketplace_visible, false) = true
         order by (select count(*) from public.shop_likes l where l.vendor_id = v.id) desc, v.name
         limit lim offset off
      ) s), '[]'::jsonb);
end $$;

-- 7. Like / commentaire depuis la page boutique ---------------------------------------------------------
create or replace function public.toggle_shop_like(p_slug text, p_device_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare vid uuid; liked boolean;
begin
  if btrim(coalesce(p_device_id, '')) = '' then return jsonb_build_object('ok', false, 'error', 'Appareil inconnu'); end if;
  select id into vid from public.vendors where slug = lower(btrim(p_slug));
  if not found then return jsonb_build_object('ok', false, 'error', 'Boutique introuvable'); end if;
  if exists (select 1 from public.shop_likes where vendor_id = vid and device_id = p_device_id) then
    delete from public.shop_likes where vendor_id = vid and device_id = p_device_id;
    liked := false;
  else
    insert into public.shop_likes (vendor_id, device_id) values (vid, p_device_id) on conflict do nothing;
    liked := true;
  end if;
  return jsonb_build_object('ok', true, 'liked', liked,
                            'likes_count', (select count(*) from public.shop_likes where vendor_id = vid));
end $$;

create or replace function public.add_shop_comment(p_slug text, p_device_id text, p_author text, p_body text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare vid uuid; cid uuid;
begin
  if length(btrim(coalesce(p_body, ''))) < 2 then return jsonb_build_object('ok', false, 'error', 'Commentaire trop court'); end if;
  if length(btrim(p_body)) > 500 then return jsonb_build_object('ok', false, 'error', 'Commentaire trop long'); end if;
  select id into vid from public.vendors where slug = lower(btrim(p_slug));
  if not found then return jsonb_build_object('ok', false, 'error', 'Boutique introuvable'); end if;
  insert into public.shop_comments (vendor_id, device_id, author_name, body)
  values (vid, nullif(btrim(coalesce(p_device_id, '')), ''), nullif(btrim(coalesce(p_author, '')), ''), btrim(p_body))
  returning id into cid;
  return jsonb_build_object('ok', true, 'comment_id', cid);
end $$;

-- 8. Côté vendeur : basculer la visibilité et gérer les zones -------------------------------------------
create or replace function public.set_marketplace_visibility(p_vendor_id uuid, p_visible boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  update public.vendors
     set is_marketplace_visible = coalesce(p_visible, false),
         marketplace_visible_at = case when coalesce(p_visible, false) then now() else null end
   where id = p_vendor_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'Boutique introuvable'); end if;
  return jsonb_build_object('ok', true, 'is_marketplace_visible', coalesce(p_visible, false));
end $$;

create or replace function public.upsert_vendor_zone(p_vendor_id uuid, p_zone_id uuid, p_name text, p_fee numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare zid uuid;
begin
  if btrim(coalesce(p_name, '')) = '' then return jsonb_build_object('ok', false, 'error', 'Nom de zone obligatoire'); end if;
  if coalesce(p_fee, -1) < 0 then return jsonb_build_object('ok', false, 'error', 'Frais invalides'); end if;
  if p_zone_id is null then
    insert into public.vendor_zones (vendor_id, name, fee) values (p_vendor_id, btrim(p_name), p_fee) returning id into zid;
  else
    update public.vendor_zones set name = btrim(p_name), fee = p_fee
     where id = p_zone_id and vendor_id = p_vendor_id returning id into zid;
    if zid is null then return jsonb_build_object('ok', false, 'error', 'Zone introuvable'); end if;
  end if;
  return jsonb_build_object('ok', true, 'zone_id', zid);
end $$;

create or replace function public.delete_vendor_zone(p_vendor_id uuid, p_zone_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  delete from public.vendor_zones where id = p_zone_id and vendor_id = p_vendor_id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.get_vendor_zones(p_vendor_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', z.id, 'name', z.name, 'fee', z.fee, 'is_active', z.is_active)
                            order by z.fee, z.name), '[]'::jsonb)
    from public.vendor_zones z where z.vendor_id = p_vendor_id
$$;
