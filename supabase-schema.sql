-- World Cup 2026 — Supabase schema
-- Paste into Supabase SQL editor and run.

-- ═══════════════════════════════════════════════════════════
-- profiles — one row per authenticated user
-- ═══════════════════════════════════════════════════════════
create table if not exists public.profiles (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  display_name     text,
  avatar_url       text,
  favorite_team_id text,                -- e.g. "af-team-6" (Brazil)
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Anyone can read profiles (so we can show "supporting 🇧🇷" badges later)
drop policy if exists profiles_read_all on public.profiles;
create policy profiles_read_all on public.profiles
  for select using (true);

-- Only the owner can insert/update their own profile
drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════
-- brackets — one row per user, JSON blob of picks
-- ═══════════════════════════════════════════════════════════
create table if not exists public.brackets (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  group_picks  jsonb not null default '{}'::jsonb,
  -- shape: { "A": { "first": "af-team-16", "second": "af-team-1531" }, ... }
  ko_picks     jsonb not null default '{}'::jsonb,
  -- shape: { "r32-1": "af-team-6", "r16-1": "af-team-6", ..., "final": "af-team-6" }
  updated_at   timestamptz not null default now()
);

alter table public.brackets enable row level security;

-- Brackets are public-readable (leaderboards later); only owner can write
drop policy if exists brackets_read_all on public.brackets;
create policy brackets_read_all on public.brackets
  for select using (true);

drop policy if exists brackets_insert_self on public.brackets;
create policy brackets_insert_self on public.brackets
  for insert with check (auth.uid() = user_id);

drop policy if exists brackets_update_self on public.brackets;
create policy brackets_update_self on public.brackets
  for update using (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════
-- Auto-create profile row on first sign-in
-- ═══════════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (user_id) do nothing;

  insert into public.brackets (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ═══════════════════════════════════════════════════════════
-- updated_at auto-touch on profiles + brackets
-- ═══════════════════════════════════════════════════════════
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists brackets_touch on public.brackets;
create trigger brackets_touch before update on public.brackets
  for each row execute function public.touch_updated_at();
