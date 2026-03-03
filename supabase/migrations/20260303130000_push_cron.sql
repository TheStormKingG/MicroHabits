-- ─── Push notification cron job ───────────────────────────────────────────────
-- Enables pg_cron and pg_net (both available on all Supabase projects),
-- then schedules the send-push Edge Function to run every minute.

create extension if not exists pg_net  with schema extensions;
create extension if not exists pg_cron with schema extensions;

-- Grant cron usage to postgres role
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- Schedule: every minute, POST to the send-push Edge Function
-- The service_role JWT authorises the call (bypasses auth on the function).
select cron.schedule(
  'send-push-every-minute',
  '* * * * *',
  $$
  select
    net.http_post(
      url     := 'https://zjitygdluivlhzbhhtfn.supabase.co/functions/v1/send-push',
      headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqaXR5Z2RsdWl2bGh6YmhodGZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU1ODIwMiwiZXhwIjoyMDg4MTM0MjAyfQ.zHqTjBuaD7oCAWyyMWizM5sBx6C-jfvRTrRHeHfJFzk"}'::jsonb,
      body    := '{}'::jsonb
    ) as request_id
  $$
);
