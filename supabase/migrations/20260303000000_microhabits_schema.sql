-- ─── MicroHabits schema ───────────────────────────────────────────────────────
-- Run via: supabase db push
-- All tables have RLS; users can only read/write their own data.

-- ── day_records ───────────────────────────────────────────────────────────────
-- One row per user per calendar date.  All complex data stored as JSONB so the
-- app schema can evolve without additional migrations.

create table if not exists public.day_records (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  slots       jsonb not null default '{}',
  today_tasks jsonb not null default '[]',
  tomorrow_tasks jsonb not null default '[]',
  evening_review jsonb,
  updated_at  timestamptz not null default now(),
  constraint day_records_user_date_unique unique (user_id, date)
);

create index if not exists idx_day_records_user_date
  on public.day_records (user_id, date desc);

-- Auto-update updated_at on every row change
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger day_records_updated_at
  before update on public.day_records
  for each row execute function public.set_updated_at();

-- ── app_settings ──────────────────────────────────────────────────────────────
-- One row per user. Stores the full AppSettings JSON blob.

create table if not exists public.app_settings (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create trigger app_settings_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table public.day_records enable row level security;
alter table public.app_settings enable row level security;

-- day_records policies
create policy "select own day_records"
  on public.day_records for select
  using (auth.uid() = user_id);

create policy "insert own day_records"
  on public.day_records for insert
  with check (auth.uid() = user_id);

create policy "update own day_records"
  on public.day_records for update
  using (auth.uid() = user_id);

create policy "delete own day_records"
  on public.day_records for delete
  using (auth.uid() = user_id);

-- app_settings policies
create policy "select own app_settings"
  on public.app_settings for select
  using (auth.uid() = user_id);

create policy "insert own app_settings"
  on public.app_settings for insert
  with check (auth.uid() = user_id);

create policy "update own app_settings"
  on public.app_settings for update
  using (auth.uid() = user_id);

-- ── Realtime ─────────────────────────────────────────────────────────────────
-- Allow the client to subscribe to its own row changes.

alter publication supabase_realtime add table public.day_records;
alter publication supabase_realtime add table public.app_settings;
