-- Get It Out — initial schema
-- profiles, user_preferences, conversations, messages, audio_recordings,
-- subscriptions, safety_events — with Row Level Security scoping every
-- row to its owning user, plus the triggers that keep them in sync.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------

create type public.storage_preference as enum (
  'save_audio_and_transcript',
  'transcript_only',
  'delete_after_session'
);

create type public.message_role as enum ('user', 'assistant');

create type public.response_mode as enum ('vent', 'unpack', 'action');

create type public.subscription_plan as enum ('standard', 'founding');

create type public.subscription_status as enum ('trialing', 'active', 'canceled', 'expired');

create type public.safety_risk_type as enum (
  'self_harm',
  'harm_to_others',
  'medical',
  'intoxication_risk'
);

-- ---------------------------------------------------------------------
-- Shared trigger functions
-- ---------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- profiles
-- One row per user: display name, 18+ confirmation, country. Created
-- automatically when someone signs up (see handle_new_user below).
-- ---------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  age_confirmed boolean not null default false,
  country text not null default 'AU',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- user_preferences
-- The user's default storage choice, editable in Settings.
-- ---------------------------------------------------------------------

create table public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  storage_preference public.storage_preference not null default 'save_audio_and_transcript',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

create policy "Users can view own preferences"
  on public.user_preferences for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can update own preferences"
  on public.user_preferences for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger set_user_preferences_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- conversations
-- A session/thread: optional title, pinned flag, timestamps.
-- ---------------------------------------------------------------------

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create index conversations_user_id_idx on public.conversations (user_id);
create index conversations_user_last_message_idx
  on public.conversations (user_id, last_message_at desc);

alter table public.conversations enable row level security;

create policy "Users can view own conversations"
  on public.conversations for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own conversations"
  on public.conversations for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own conversations"
  on public.conversations for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own conversations"
  on public.conversations for delete
  to authenticated
  using (auth.uid() = user_id);

create trigger set_conversations_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- messages
-- Each turn in a conversation — transcript/typed text or assistant
-- reply, plus which of the three response modes was chosen.
-- user_id is denormalised from conversations for simpler, faster RLS.
-- ---------------------------------------------------------------------

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.message_role not null,
  content text not null,
  response_mode public.response_mode,
  created_at timestamptz not null default now()
);

create index messages_conversation_id_idx on public.messages (conversation_id);
create index messages_user_id_idx on public.messages (user_id);

alter table public.messages enable row level security;

create policy "Users can view own messages"
  on public.messages for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own messages"
  on public.messages for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

create policy "Users can delete own messages"
  on public.messages for delete
  to authenticated
  using (auth.uid() = user_id);

-- Keep conversations.last_message_at accurate without relying on the client.
create function public.bump_conversation_last_message_at()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.conversations
  set last_message_at = new.created_at,
      updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger on_message_inserted
  after insert on public.messages
  for each row execute function public.bump_conversation_last_message_at();

-- ---------------------------------------------------------------------
-- audio_recordings
-- Metadata + private Storage path for a saved recording, tied to the
-- single message it belongs to (never to a whole conversation) — a
-- follow-up recording must never overwrite an earlier one.
-- ---------------------------------------------------------------------

create table public.audio_recordings (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  duration_seconds numeric,
  format text not null default 'm4a',
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index audio_recordings_message_id_idx on public.audio_recordings (message_id);
create unique index audio_recordings_active_per_message_idx
  on public.audio_recordings (message_id)
  where deleted_at is null;

alter table public.audio_recordings enable row level security;

create policy "Users can view own audio recordings"
  on public.audio_recordings for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own audio recordings"
  on public.audio_recordings for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.messages m
      where m.id = message_id and m.user_id = auth.uid()
    )
  );

create policy "Users can update own audio recordings"
  on public.audio_recordings for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own audio recordings"
  on public.audio_recordings for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- subscriptions
-- Plan, status, trial/period dates, RevenueCat customer ID. Unused
-- until Checkpoint 6; writes will come from a trusted server context
-- (RevenueCat webhook via Edge Function), so there is no client-side
-- insert/update/delete policy — only read access to your own row.
-- ---------------------------------------------------------------------

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan public.subscription_plan,
  status public.subscription_status,
  revenuecat_customer_id text,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_user_id_idx on public.subscriptions (user_id);

alter table public.subscriptions enable row level security;

create policy "Users can view own subscription"
  on public.subscriptions for select
  to authenticated
  using (auth.uid() = user_id);

create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- safety_events
-- A minimal audit record when the safety system triggers. Kept
-- deliberately thin (no transcript dump) and NOT cascade-deleted when
-- the source conversation/message is removed — it survives as an
-- audit trail (references are nulled instead).
-- ---------------------------------------------------------------------

create table public.safety_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  message_id uuid references public.messages (id) on delete set null,
  risk_type public.safety_risk_type not null,
  action_taken text,
  detected_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index safety_events_user_id_idx on public.safety_events (user_id);

alter table public.safety_events enable row level security;

create policy "Users can view own safety events"
  on public.safety_events for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own safety events"
  on public.safety_events for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- New user bootstrap: create profile + default preferences row on signup.
-- ---------------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.user_preferences (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
