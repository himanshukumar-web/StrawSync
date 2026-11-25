-- StrawSync Supabase Foundation Schema, Auth Triggers, and Row Level Security
-- Safe to run in Supabase SQL Editor or via `supabase db push` / `supabase migration up`.

-- ---------------------------------------------------------------------------
-- 1. Private schema for SECURITY DEFINER helpers (not exposed via Data API)
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Core domain tables
-- ---------------------------------------------------------------------------

-- User profiles 1:1 with auth.users. Role & status live here (never trust raw_user_meta_data).
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  role text not null default 'farmer'
    check (role in ('farmer', 'buyer', 'logistics', 'admin')),
  account_status text not null default 'active'
    check (account_status in ('active', 'suspended')),
  organization text,
  location text,
  lat double precision,
  lng double precision,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_status_idx
  on public.profiles (role, account_status);

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function private.touch_updated_at();

-- Farmgate agricultural residue listings
create table if not exists public.farmer_listings (
  id bigint generated always as identity primary key,
  farmer_id uuid not null references public.profiles(id) on delete cascade,
  residue_type text not null
    check (residue_type in ('paddy', 'wheat', 'mustard', 'sugarcane', 'cotton', 'maize')),
  crop_name text,
  land_area_acres numeric(10,2) check (land_area_acres is null or land_area_acres > 0),
  estimated_gross_tonnes numeric(12,2) check (estimated_gross_tonnes is null or estimated_gross_tonnes >= 0),
  quantity numeric(12,2) not null check (quantity > 0),
  moisture_percentage numeric(5,2) check (moisture_percentage is null or (moisture_percentage >= 0 and moisture_percentage <= 100)),
  bale_type text not null default 'baled'
    check (bale_type in ('baled', 'loose', 'chopped')),
  price numeric(12,2) not null check (price >= 0),
  location text not null,
  village text,
  district text,
  state text,
  lat double precision,
  lng double precision,
  quality text not null default 'B'
    check (quality in ('A', 'B', 'C')),
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'matched', 'sold', 'rejected')),
  harvest_date date,
  collection_start_date date,
  collection_end_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists farmer_listings_farmer_id_idx
  on public.farmer_listings (farmer_id);
create index if not exists farmer_listings_status_residue_idx
  on public.farmer_listings (status, residue_type);

create trigger farmer_listings_touch_updated_at
  before update on public.farmer_listings
  for each row execute function private.touch_updated_at();

-- Industrial biomass buyer procurement requests
create table if not exists public.buyer_requests (
  id bigint generated always as identity primary key,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  company_name text,
  industry_type text,
  residue_type text not null
    check (residue_type in ('paddy', 'wheat', 'mustard', 'sugarcane', 'cotton', 'maize')),
  quantity numeric(12,2) not null check (quantity > 0),
  fulfilled_quantity numeric(12,2) not null default 0 check (fulfilled_quantity >= 0),
  budget numeric(12,2) not null check (budget >= 0),
  max_moisture_percentage numeric(5,2) check (max_moisture_percentage is null or (max_moisture_percentage >= 0 and max_moisture_percentage <= 100)),
  delivery_location text not null,
  district text,
  state text,
  lat double precision,
  lng double precision,
  deadline_date date,
  status text not null default 'active'
    check (status in ('active', 'partially_fulfilled', 'fulfilled', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists buyer_requests_buyer_id_idx
  on public.buyer_requests (buyer_id);
create index if not exists buyer_requests_status_residue_idx
  on public.buyer_requests (status, residue_type);

create trigger buyer_requests_touch_updated_at
  before update on public.buyer_requests
  for each row execute function private.touch_updated_at();

-- Matched purchase orders
create table if not exists public.orders (
  id bigint generated always as identity primary key,
  order_number text not null unique,
  farmer_id uuid not null references public.profiles(id) on delete restrict,
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  listing_id bigint not null references public.farmer_listings(id) on delete restrict,
  request_id bigint references public.buyer_requests(id) on delete set null,
  residue_type text not null
    check (residue_type in ('paddy', 'wheat', 'mustard', 'sugarcane', 'cotton', 'maize')),
  quantity numeric(12,2) not null check (quantity > 0),
  farmgate_rate numeric(12,2) not null default 0 check (farmgate_rate >= 0),
  freight_rate numeric(12,2) not null default 0 check (freight_rate >= 0),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  co2_saved_tonnes numeric(10,2) not null default 0,
  order_status text not null default 'requested'
    check (order_status in (
      'requested', 'accepted', 'logistics_assigned', 'pickup_en_route',
      'loaded_and_weighed', 'in_transit', 'delivered', 'settled', 'cancelled', 'disputed'
    )),
  cancelled_reason text,
  dispute_notes text,
  dispute_status text not null default 'none'
    check (dispute_status in ('none', 'open', 'resolved')),
  adjustments numeric(12,2) not null default 0,
  estimated_delivery_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_farmer_id_idx on public.orders (farmer_id);
create index if not exists orders_buyer_id_idx on public.orders (buyer_id);
create index if not exists orders_listing_id_idx on public.orders (listing_id);
create index if not exists orders_request_id_idx on public.orders (request_id);
create index if not exists orders_status_idx on public.orders (order_status);

create trigger orders_touch_updated_at
  before update on public.orders
  for each row execute function private.touch_updated_at();

-- Certified logistics partners & fleet vehicles
create table if not exists public.logistics_partners (
  id bigint generated always as identity primary key,
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  vehicle_type text not null,
  vehicle_number text not null unique,
  capacity numeric(10,2) not null check (capacity > 0),
  availability boolean not null default true,
  service_region text,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists logistics_partners_user_id_idx
  on public.logistics_partners (user_id);

create trigger logistics_partners_touch_updated_at
  before update on public.logistics_partners
  for each row execute function private.touch_updated_at();

-- Order deliveries & weighbridge proof tracking
create table if not exists public.deliveries (
  id bigint generated always as identity primary key,
  order_id bigint not null unique references public.orders(id) on delete cascade,
  logistics_partner_id bigint references public.logistics_partners(id) on delete set null,
  pickup_location text not null,
  pickup_lat double precision,
  pickup_lng double precision,
  delivery_location text not null,
  delivery_lat double precision,
  delivery_lng double precision,
  distance_km numeric(8,2),
  delivery_status text not null default 'unassigned'
    check (delivery_status in (
      'unassigned', 'assigned', 'accepted', 'pickup_en_route',
      'loaded_and_weighed', 'in_transit', 'delivered', 'rejected', 'cancelled'
    )),
  proof_url text,
  proof_note text,
  tracking_timeline jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists deliveries_order_id_idx
  on public.deliveries (order_id);
create index if not exists deliveries_partner_id_idx
  on public.deliveries (logistics_partner_id);
create index if not exists deliveries_status_idx
  on public.deliveries (delivery_status);

create trigger deliveries_touch_updated_at
  before update on public.deliveries
  for each row execute function private.touch_updated_at();

-- Financial escrow and settlement ledger
create table if not exists public.transactions (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders(id) on delete restrict,
  payer_id uuid not null references public.profiles(id) on delete restrict,
  receiver_id uuid not null references public.profiles(id) on delete restrict,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'INR',
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'escrowed', 'released', 'refunded', 'disputed', 'failed')),
  provider_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_order_id_idx on public.transactions (order_id);
create index if not exists transactions_payer_id_idx on public.transactions (payer_id);
create index if not exists transactions_receiver_id_idx on public.transactions (receiver_id);

create trigger transactions_touch_updated_at
  before update on public.transactions
  for each row execute function private.touch_updated_at();

-- User alerts & dispatch notifications
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info'
    check (type in ('info', 'success', 'warning', 'alert')),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_read_idx
  on public.notifications (user_id, is_read, created_at desc);

-- Immutable administrative audit trail
create table if not exists public.admin_audit_logs (
  id bigint generated always as identity primary key,
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null
    check (target_type in ('user', 'listing', 'request', 'order', 'logistics', 'delivery', 'transaction', 'settings')),
  target_id text not null,
  previous_value text,
  new_value text,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_admin_id_idx
  on public.admin_audit_logs (admin_id);
create index if not exists admin_audit_logs_target_idx
  on public.admin_audit_logs (target_type, target_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 3. Authorization helpers & anti-escalation triggers (server-enforced)
-- ---------------------------------------------------------------------------

-- Check active admin status in DB profiles table (never raw_user_meta_data).
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
      and account_status = 'active'
  );
$$;

revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated, service_role;

create or replace function private.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.profiles
  where id = (select auth.uid())
    and account_status = 'active'
  limit 1;
$$;

revoke all on function private.current_user_role() from public, anon;
grant execute on function private.current_user_role() to authenticated, service_role;

create or replace function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and account_status = 'active'
  );
$$;

revoke all on function private.is_active_user() from public, anon;
grant execute on function private.is_active_user() to authenticated, service_role;

-- Create profile on Auth signup; publicly blocks registering as 'admin'.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text;
  safe_role text;
begin
  requested_role := lower(coalesce(new.raw_user_meta_data->>'role', 'farmer'));
  safe_role := case
    when requested_role in ('farmer', 'buyer', 'logistics') then requested_role
    else 'farmer'
  end;

  insert into public.profiles (
    id,
    full_name,
    email,
    phone,
    role,
    account_status,
    organization,
    location,
    is_verified
  )
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(coalesce(new.email, 'User'), '@', 1)),
    coalesce(new.email, ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'phone', '')), ''),
    safe_role,
    'active',
    nullif(trim(coalesce(new.raw_user_meta_data->>'organization', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'location', '')), ''),
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Prevent browser clients from elevating role, status, or verification.
create or replace function private.guard_profile_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not private.is_admin() then
    if new.id is distinct from old.id
      or new.role is distinct from old.role
      or new.account_status is distinct from old.account_status
      or new.is_verified is distinct from old.is_verified then
      raise exception 'Forbidden: privileged profile attributes can only be updated by administrators';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_privileged on public.profiles;
create trigger profiles_guard_privileged
  before update on public.profiles
  for each row execute function private.guard_profile_update();

-- Prevent farmers from self-verifying listings or changing ownership.
create or replace function private.guard_listing_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not private.is_admin() then
    if tg_op = 'INSERT' then
      new.status := 'pending';
    elsif tg_op = 'UPDATE' then
      if new.farmer_id is distinct from old.farmer_id then
        raise exception 'Forbidden: listing ownership cannot be reassigned';
      end if;
      if new.status = 'verified' and old.status <> 'verified' then
        raise exception 'Forbidden: listings require administrator verification';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists farmer_listings_guard_write on public.farmer_listings;
create trigger farmer_listings_guard_write
  before insert or update on public.farmer_listings
  for each row execute function private.guard_listing_write();

-- Prevent logistics partners from self-verifying fleet status.
create or replace function private.guard_logistics_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not private.is_admin() then
    if tg_op = 'INSERT' then
      new.is_verified := false;
    elsif tg_op = 'UPDATE' then
      if new.user_id is distinct from old.user_id then
        raise exception 'Forbidden: logistics user ownership cannot be reassigned';
      end if;
      if new.is_verified is distinct from old.is_verified then
        raise exception 'Forbidden: fleet verification requires administrator approval';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists logistics_partners_guard_write on public.logistics_partners;
create trigger logistics_partners_guard_write
  before insert or update on public.logistics_partners
  for each row execute function private.guard_logistics_write();

-- Prevent non-admin users from altering immutable order parties, totals, or invalid statuses.
create or replace function private.guard_order_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is not null and not private.is_admin() then
    if new.farmer_id is distinct from old.farmer_id
      or new.buyer_id is distinct from old.buyer_id
      or new.listing_id is distinct from old.listing_id
      or new.request_id is distinct from old.request_id
      or new.total_amount is distinct from old.total_amount
      or new.farmgate_rate is distinct from old.farmgate_rate
      or new.freight_rate is distinct from old.freight_rate
      or new.adjustments is distinct from old.adjustments then
      raise exception 'Forbidden: order parties and totals cannot be modified directly';
    end if;

    if new.order_status is distinct from old.order_status then
      if new.order_status = 'settled' then
        raise exception 'Forbidden: order settlement requires administrator authorization';
      end if;
      if caller_id = old.buyer_id and caller_id <> old.farmer_id then
        if not (
          (old.order_status in ('requested', 'accepted') and new.order_status = 'cancelled')
          or (old.order_status in ('in_transit', 'delivered') and new.order_status = 'disputed')
        ) then
          raise exception 'Forbidden: buyer cannot transition order from % to %', old.order_status, new.order_status;
        end if;
      elsif caller_id = old.farmer_id and caller_id <> old.buyer_id then
        if not (
          (old.order_status = 'requested' and new.order_status in ('accepted', 'cancelled'))
          or (old.order_status in ('in_transit', 'delivered') and new.order_status = 'disputed')
        ) then
          raise exception 'Forbidden: farmer cannot transition order from % to %', old.order_status, new.order_status;
        end if;
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_guard_update on public.orders;
create trigger orders_guard_update
  before update on public.orders
  for each row execute function private.guard_order_update();

-- Secure bootstrap function to promote the FIRST admin only (run from SQL Editor or service_role).
create or replace function private.promote_first_admin(target_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid;
begin
  if exists (select 1 from public.profiles where role = 'admin') then
    raise exception 'Bootstrap rejected: an admin account already exists';
  end if;

  select id into target_id
  from public.profiles
  where lower(email) = lower(trim(target_email))
  limit 1;

  if target_id is null then
    raise exception 'No profile found for email %. Register the user in Auth first.', target_email;
  end if;

  update public.profiles
  set role = 'admin',
      account_status = 'active',
      is_verified = true
  where id = target_id;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
  where id = target_id;

  insert into public.admin_audit_logs (admin_id, action, target_type, target_id, new_value, reason)
  values (target_id, 'FIRST_ADMIN_BOOTSTRAPPED', 'user', target_id::text, 'role: admin', 'Initial server-side bootstrap');

  return target_id;
end;
$$;

revoke all on function private.promote_first_admin(text) from public, anon, authenticated;
grant execute on function private.promote_first_admin(text) to service_role;

-- ---------------------------------------------------------------------------
-- 4. Explicit Data API privileges (least privilege)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
revoke all on all tables in schema public from public, anon;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.farmer_listings to authenticated;
grant select, insert, update, delete on public.buyer_requests to authenticated;
grant select, insert, update on public.orders to authenticated;
grant select, insert, update on public.logistics_partners to authenticated;
grant select, update on public.deliveries to authenticated;
grant select on public.transactions to authenticated;
grant select, update on public.notifications to authenticated;
grant select, insert on public.admin_audit_logs to authenticated;

grant usage, select on all sequences in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- ---------------------------------------------------------------------------
-- 5. Row Level Security (RLS) policies on all tables
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.farmer_listings enable row level security;
alter table public.buyer_requests enable row level security;
alter table public.orders enable row level security;
alter table public.logistics_partners enable row level security;
alter table public.deliveries enable row level security;
alter table public.transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.admin_audit_logs enable row level security;

-- profiles policies
create policy profiles_select_own_or_admin
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id or (select private.is_admin()));

create policy profiles_update_own_or_admin
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id or (select private.is_admin()))
  with check ((select auth.uid()) = id or (select private.is_admin()));

-- farmer_listings policies
create policy farmer_listings_select_policy
  on public.farmer_listings for select
  to authenticated
  using (
    (select auth.uid()) = farmer_id
    or (select private.is_admin())
    or (
      (select private.current_user_role()) = 'buyer'
      and status in ('verified', 'matched')
    )
  );

create policy farmer_listings_insert_own
  on public.farmer_listings for insert
  to authenticated
  with check (
    (
      (select auth.uid()) = farmer_id
      and (select private.current_user_role()) = 'farmer'
    )
    or (select private.is_admin())
  );

create policy farmer_listings_update_own_or_admin
  on public.farmer_listings for update
  to authenticated
  using (
    ((select auth.uid()) = farmer_id and (select private.is_active_user()))
    or (select private.is_admin())
  )
  with check (
    ((select auth.uid()) = farmer_id and (select private.is_active_user()))
    or (select private.is_admin())
  );

create policy farmer_listings_delete_own_or_admin
  on public.farmer_listings for delete
  to authenticated
  using (
    ((select auth.uid()) = farmer_id and (select private.is_active_user()))
    or (select private.is_admin())
  );

-- buyer_requests policies
create policy buyer_requests_select_policy
  on public.buyer_requests for select
  to authenticated
  using (
    (select auth.uid()) = buyer_id
    or (select private.is_admin())
    or (
      (select private.current_user_role()) = 'farmer'
      and status in ('active', 'partially_fulfilled')
    )
  );

create policy buyer_requests_insert_own
  on public.buyer_requests for insert
  to authenticated
  with check (
    (
      (select auth.uid()) = buyer_id
      and (select private.current_user_role()) = 'buyer'
    )
    or (select private.is_admin())
  );

create policy buyer_requests_update_own_or_admin
  on public.buyer_requests for update
  to authenticated
  using (
    ((select auth.uid()) = buyer_id and (select private.is_active_user()))
    or (select private.is_admin())
  )
  with check (
    ((select auth.uid()) = buyer_id and (select private.is_active_user()))
    or (select private.is_admin())
  );

create policy buyer_requests_delete_own_or_admin
  on public.buyer_requests for delete
  to authenticated
  using (
    ((select auth.uid()) = buyer_id and (select private.is_active_user()))
    or (select private.is_admin())
  );

-- orders policies
create policy orders_select_participants_or_admin
  on public.orders for select
  to authenticated
  using (
    (select auth.uid()) = farmer_id
    or (select auth.uid()) = buyer_id
    or (select private.is_admin())
    or exists (
      select 1
      from public.deliveries d
      join public.logistics_partners lp on lp.id = d.logistics_partner_id
      where d.order_id = orders.id
        and lp.user_id = (select auth.uid())
    )
  );

create policy orders_insert_buyer_or_admin
  on public.orders for insert
  to authenticated
  with check (
    (
      (select auth.uid()) = buyer_id
      and (select private.current_user_role()) = 'buyer'
      and order_status = 'requested'
    )
    or (select private.is_admin())
  );

create policy orders_update_participants_or_admin
  on public.orders for update
  to authenticated
  using (
    ((select auth.uid()) in (farmer_id, buyer_id) and (select private.is_active_user()))
    or (select private.is_admin())
  )
  with check (
    ((select auth.uid()) in (farmer_id, buyer_id) and (select private.is_active_user()))
    or (select private.is_admin())
  );

-- logistics_partners policies
create policy logistics_partners_select_own_or_admin
  on public.logistics_partners for select
  to authenticated
  using ((select auth.uid()) = user_id or (select private.is_admin()));

create policy logistics_partners_insert_own_or_admin
  on public.logistics_partners for insert
  to authenticated
  with check (
    (
      (select auth.uid()) = user_id
      and (select private.current_user_role()) = 'logistics'
    )
    or (select private.is_admin())
  );

create policy logistics_partners_update_own_or_admin
  on public.logistics_partners for update
  to authenticated
  using (
    ((select auth.uid()) = user_id and (select private.is_active_user()))
    or (select private.is_admin())
  )
  with check (
    ((select auth.uid()) = user_id and (select private.is_active_user()))
    or (select private.is_admin())
  );

-- deliveries policies
create policy deliveries_select_assigned_or_participant
  on public.deliveries for select
  to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1
      from public.logistics_partners lp
      where lp.id = deliveries.logistics_partner_id
        and lp.user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.orders o
      where o.id = deliveries.order_id
        and (select auth.uid()) in (o.farmer_id, o.buyer_id)
    )
  );

create policy deliveries_update_assigned_or_admin
  on public.deliveries for update
  to authenticated
  using (
    (select private.is_admin())
    or (
      (select private.is_active_user())
      and exists (
        select 1
        from public.logistics_partners lp
        where lp.id = deliveries.logistics_partner_id
          and lp.user_id = (select auth.uid())
      )
    )
  )
  with check (
    (select private.is_admin())
    or (
      (select private.is_active_user())
      and exists (
        select 1
        from public.logistics_partners lp
        where lp.id = deliveries.logistics_partner_id
          and lp.user_id = (select auth.uid())
      )
    )
  );

-- Admin-only insert/delete on deliveries (handled via server/admin)
create policy deliveries_admin_insert
  on public.deliveries for insert
  to authenticated
  with check ((select private.is_admin()));

-- transactions policies (read-only for participants; financial state writes restricted to admin / service_role)
create policy transactions_select_parties_or_admin
  on public.transactions for select
  to authenticated
  using (
    (select auth.uid()) in (payer_id, receiver_id)
    or (select private.is_admin())
  );

-- notifications policies
create policy notifications_select_own_or_admin
  on public.notifications for select
  to authenticated
  using ((select auth.uid()) = user_id or (select private.is_admin()));

create policy notifications_update_own_or_admin
  on public.notifications for update
  to authenticated
  using ((select auth.uid()) = user_id or (select private.is_admin()))
  with check ((select auth.uid()) = user_id or (select private.is_admin()));

-- admin_audit_logs policies (strictly admin read/append only)
create policy admin_audit_logs_select_admin
  on public.admin_audit_logs for select
  to authenticated
  using ((select private.is_admin()));

create policy admin_audit_logs_insert_admin
  on public.admin_audit_logs for insert
  to authenticated
  with check ((select private.is_admin()) and admin_id = (select auth.uid()));
