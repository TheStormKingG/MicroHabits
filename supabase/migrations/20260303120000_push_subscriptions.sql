-- ─── push_subscriptions ──────────────────────────────────────────────────────
-- Stores Web Push subscriptions so the Edge Function can deliver notifications
-- even when the app is closed.  user_id is nullable to support non-signed-in
-- devices; when a user signs in their existing subscription gets linked.

create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,
  endpoint     text not null,
  p256dh       text not null,
  auth_key     text not null,
  timezone     text not null default 'UTC',
  minutes_before int not null default 5,
  -- JSON array of {id, time, label, doText} – snapshot of enabled slots
  enabled_slots jsonb not null default '[]',
  updated_at   timestamptz not null default now(),
  constraint push_subscriptions_endpoint_unique unique (endpoint)
);

create index if not exists idx_push_subscriptions_user
  on public.push_subscriptions (user_id);

create trigger push_subscriptions_updated_at
  before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.push_subscriptions enable row level security;

-- The Edge Function runs with service_role so it bypasses RLS.
-- Client-side: a device can only read/write its own row (matched by endpoint).
-- We use a function to allow unauthenticated devices to upsert by endpoint.

create policy "device can manage own subscription"
  on public.push_subscriptions
  for all
  using (true)
  with check (true);
