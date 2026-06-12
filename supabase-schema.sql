-- World Cup 2026 — Supabase schema
-- Idempotent: safe to run multiple times. No DROP statements.
-- Paste into Supabase SQL editor and click Run.

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

-- Row-level policies (skipped silently if they already exist)
do $$ begin
  create policy profiles_read_all on public.profiles
    for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy profiles_insert_self on public.profiles
    for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy profiles_update_self on public.profiles
    for update using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;


-- ═══════════════════════════════════════════════════════════
-- brackets — one row per user, JSON blob of picks
-- ═══════════════════════════════════════════════════════════
create table if not exists public.brackets (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  group_picks  jsonb not null default '{}'::jsonb,
  -- shape: { "A": { "first": "af-team-16", "second": "af-team-1531" }, ... }
  ko_picks     jsonb not null default '{}'::jsonb,
  -- shape: { "r32-1": "af-team-6", ..., "final": "af-team-6" }
  updated_at   timestamptz not null default now()
);

alter table public.brackets enable row level security;

do $$ begin
  create policy brackets_read_all on public.brackets
    for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy brackets_insert_self on public.brackets
    for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy brackets_update_self on public.brackets
    for update using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;


-- ═══════════════════════════════════════════════════════════
-- Auto-create profile + bracket rows on first sign-in
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

do $$ begin
  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
exception when duplicate_object then null; end $$;


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

do $$ begin
  create trigger profiles_touch before update on public.profiles
    for each row execute function public.touch_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger brackets_touch before update on public.brackets
    for each row execute function public.touch_updated_at();
exception when duplicate_object then null; end $$;


-- ═══════════════════════════════════════════════════════════
-- live_status — one row per fixture, refreshed by the cron job
-- ═══════════════════════════════════════════════════════════
create table if not exists public.live_status (
  fixture_id   text primary key,                -- "af-1489369"
  status_short text not null,                   -- 'NS','1H','HT','2H','ET','FT','AET','PEN','PST','CANC'
  status_long  text,
  elapsed      int,                             -- minute in match; null when not running
  added_minute int,                             -- stoppage minute
  score_home   int,
  score_away   int,
  ht_home      int,                             -- half-time score
  ht_away      int,
  has_lineups  boolean not null default false,  -- starting XI published?
  updated_at   timestamptz not null default now()
);

alter table public.live_status enable row level security;

-- Public read; writes are done by the cron handler using the service-role key
-- (service role bypasses RLS by design).
do $$ begin
  create policy live_status_read_all on public.live_status
    for select using (true);
exception when duplicate_object then null; end $$;


-- ═══════════════════════════════════════════════════════════
-- match_events — append-only timeline (goals, cards, subs, var)
-- ═══════════════════════════════════════════════════════════
create table if not exists public.match_events (
  id           bigserial primary key,
  fixture_id   text not null,                   -- e.g. "af-1489369"
  -- A stable key derived from (fixture_id, minute, type, player_id, detail)
  -- so cron upserts don't create duplicates on every poll.
  event_key    text not null,
  minute       int not null,
  added_minute int,
  type         text not null,                   -- 'Goal' | 'Card' | 'subst' | 'Var' | 'Lineup'
  detail       text,                            -- 'Normal Goal' | 'Yellow Card' | 'Red Card' | ...
  team_id      text,                            -- "af-team-16"
  team_name    text,
  player_id    text,
  player_name  text,
  assist_id    text,
  assist_name  text,
  comments     text,
  created_at   timestamptz not null default now(),
  unique (fixture_id, event_key)
);

create index if not exists match_events_fixture_idx
  on public.match_events(fixture_id, minute, added_minute);

alter table public.match_events enable row level security;

do $$ begin
  create policy match_events_read_all on public.match_events
    for select using (true);
exception when duplicate_object then null; end $$;


-- ═══════════════════════════════════════════════════════════
-- Auto-touch updated_at on live_status changes
-- ═══════════════════════════════════════════════════════════
do $$ begin
  create trigger live_status_touch before update on public.live_status
    for each row execute function public.touch_updated_at();
exception when duplicate_object then null; end $$;


-- ═══════════════════════════════════════════════════════════
-- Verify (returns 4 rows on success)
-- ═══════════════════════════════════════════════════════════
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('profiles', 'brackets', 'live_status', 'match_events')
order by table_name;
