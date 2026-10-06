-- Checkpoint 6 — subscriptions (RevenueCat), Founding Members, usage metering.
--
-- Commercial rules this implements (approved 2026-09-29):
--   * One paid plan, monthly or annual, with a 7-day free trial (configured
--     on the store products, not here). No free tier.
--   * The first 500 PAYING subscribers become Founding Members. Trials don't
--     count until they convert. Founder numbers are never reused, even if a
--     founder later deletes their account or loses founder status.
--   * Founders keep founder pricing (the "founder" store products) while
--     eligible, and can switch monthly <-> annual without losing status.
--   * When a founder's subscription actually ends (EXPIRATION), they have a
--     90-day grace period to resubscribe and keep their founder status.
--   * Founder slots are briefly held while someone is at checkout or in a
--     trial on a founder product, so founder products are never sold to more
--     than 500 people.
--
-- Writes to every table here come only from Edge Functions using the
-- service role (the RevenueCat webhook and the subscription function), so
-- none of them has a client-side insert/update/delete policy.

-- ---------------------------------------------------------------------
-- subscriptions: extend the Checkpoint 3 table with the state the
-- RevenueCat webhook maintains. One row per user.
-- ---------------------------------------------------------------------

alter table public.subscriptions
  add column entitlement_active boolean not null default false,
  add column product_id text,
  add column store text,
  add column period_type text,
  add column environment text,
  add column will_renew boolean,
  add column billing_issue_at timestamptz,
  add column founder_number integer unique,
  add column founder_since timestamptz,
  add column founder_lapsed_at timestamptz,
  add column last_event_at timestamptz,
  add constraint subscriptions_user_id_key unique (user_id);

-- The old non-unique index is redundant with the unique constraint above.
drop index if exists public.subscriptions_user_id_idx;

-- ---------------------------------------------------------------------
-- founder_program: single-row counter. next_number only ever goes up, so
-- a founder number is never handed out twice.
-- ---------------------------------------------------------------------

create table public.founder_program (
  id boolean primary key default true check (id),
  cap integer not null default 500,
  next_number integer not null default 1,
  closed_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.founder_program (id) values (true);

alter table public.founder_program enable row level security;

create trigger set_founder_program_updated_at
  before update on public.founder_program
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- founder_holds: a reserved founder slot for someone at checkout
-- ('checkout', short-lived) or in a free trial on a founder product
-- ('trial', until the trial ends). Holds are counted against the cap
-- before founder products are offered to anyone new.
-- ---------------------------------------------------------------------

create table public.founder_holds (
  user_id uuid primary key references auth.users (id) on delete cascade,
  kind text not null check (kind in ('checkout', 'trial')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.founder_holds enable row level security;

-- ---------------------------------------------------------------------
-- revenuecat_events: idempotency log for the webhook (RevenueCat retries
-- deliveries). Holds no purchase details beyond type and timing.
-- ---------------------------------------------------------------------

create table public.revenuecat_events (
  id text primary key,
  type text not null,
  user_id uuid references auth.users (id) on delete set null,
  received_at timestamptz not null default now()
);

alter table public.revenuecat_events enable row level security;

-- ---------------------------------------------------------------------
-- usage_events: internal metering for cost tracking and fair-use limits.
-- Never shown to users as a quota. Holds counts only — no content.
-- ---------------------------------------------------------------------

create table public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('transcription', 'ai_response')),
  audio_seconds numeric,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now()
);

create index usage_events_user_created_idx on public.usage_events (user_id, created_at desc);

alter table public.usage_events enable row level security;

-- ---------------------------------------------------------------------
-- Founder helpers. security definer + execute revoked from client roles:
-- only Edge Functions (service role) can call them.
-- ---------------------------------------------------------------------

-- Is this user a founder right now (including the 90-day grace period)?
create function public.founder_is_eligible(p_user uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = p_user
      and founder_number is not null
      and (founder_lapsed_at is null or founder_lapsed_at > now() - interval '90 days')
  );
$$;

-- Which offering should this user see: 'founder' or 'standard'? Reserves a
-- short checkout hold when it hands out a new founder offer.
create function public.claim_founder_offer(p_user uuid)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  program public.founder_program;
  held integer;
begin
  select * into program from public.founder_program where id for update;

  if exists (select 1 from public.subscriptions where user_id = p_user and founder_number is not null) then
    return case when public.founder_is_eligible(p_user) then 'founder' else 'standard' end;
  end if;

  if program.next_number > program.cap then
    return 'standard';
  end if;

  -- An existing hold for this user (checkout or trial) keeps its slot.
  if exists (select 1 from public.founder_holds where user_id = p_user and expires_at > now()) then
    update public.founder_holds
      set expires_at = greatest(expires_at, now() + interval '1 hour')
      where user_id = p_user;
    return 'founder';
  end if;

  select count(*) into held from public.founder_holds where expires_at > now();
  if (program.next_number - 1) + held >= program.cap then
    return 'standard';
  end if;

  insert into public.founder_holds (user_id, kind, expires_at)
    values (p_user, 'checkout', now() + interval '1 hour')
    on conflict (user_id) do update
      set kind = 'checkout', expires_at = excluded.expires_at, created_at = now();
  return 'founder';
end;
$$;

-- Give this user the next founder number if they don't have one and the
-- program is still open. Returns their founder number, or null.
create function public.assign_founder_number(p_user uuid)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  program public.founder_program;
  existing integer;
begin
  select * into program from public.founder_program where id for update;

  select founder_number into existing from public.subscriptions where user_id = p_user;
  if existing is not null then
    return existing;
  end if;

  if program.next_number > program.cap then
    return null;
  end if;

  update public.subscriptions
    set founder_number = program.next_number, founder_since = now(), founder_lapsed_at = null
    where user_id = p_user;
  if not found then
    return null;
  end if;

  update public.founder_program
    set next_number = next_number + 1,
        closed_at = case when next_number + 1 > cap then now() else closed_at end
    where id;

  delete from public.founder_holds where user_id = p_user;
  return program.next_number;
end;
$$;

revoke execute on function public.founder_is_eligible(uuid) from public, anon, authenticated;
revoke execute on function public.claim_founder_offer(uuid) from public, anon, authenticated;
revoke execute on function public.assign_founder_number(uuid) from public, anon, authenticated;
grant execute on function public.founder_is_eligible(uuid) to service_role;
grant execute on function public.claim_founder_offer(uuid) to service_role;
grant execute on function public.assign_founder_number(uuid) to service_role;

-- ---------------------------------------------------------------------
-- 18+ confirmation: record it at signup from the auth metadata, so it is
-- saved even when email confirmation means signup returns no session.
-- ---------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, age_confirmed)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'age_confirmed', '') = 'true');
  insert into public.user_preferences (user_id) values (new.id);
  return new;
end;
$$;
