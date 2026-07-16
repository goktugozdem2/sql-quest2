-- Email lifecycle measurement + cron repair (2026-07-16)
--
-- 1) email_events: one row per send (event='sent', written by the sender
--    edge functions) plus one row per Resend webhook event (delivered/
--    opened/clicked/bounced/complained, written by resend-webhook, joined
--    by resend_id).
-- 2) Cron repair: welcome-back / streak-reminder / skill-decay jobs were
--    failing EVERY DAY with a misleading "Out of memory" — their URLs were
--    missing the https:// scheme, which pg_net cannot parse. welcome-back
--    had a working duplicate (welcome-back-daily); the other two never ran.
-- 3) New schedules: weekly-digest (Mon 09:00 UTC), checkout-abandon (15:00 UTC).

-- ── 1) measurement table ────────────────────────────────────────────────
create table if not exists public.email_events (
  id bigint generated always as identity primary key,
  username   text,
  email      text,
  template   text not null,
  event      text not null default 'sent',
  resend_id  text,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists email_events_username_idx on public.email_events (username, created_at desc);
create index if not exists email_events_template_idx on public.email_events (template, event);
create index if not exists email_events_resend_id_idx on public.email_events (resend_id);
-- Server-only table: RLS on, no anon policies. Edge functions use the
-- service role, which bypasses RLS.
alter table public.email_events enable row level security;

-- ── 2) remove the broken (scheme-less URL) cron jobs ────────────────────
do $$
begin
  perform cron.unschedule('welcome-back');
exception when others then null; -- already removed
end $$;
do $$
begin
  perform cron.unschedule('streak-reminder');
exception when others then null;
end $$;
do $$
begin
  perform cron.unschedule('skill-decay');
exception when others then null;
end $$;

-- ── 3) (re)schedule with correct https:// URLs ──────────────────────────
-- The Bearer token below is the project's PUBLIC anon key (same one the
-- other working jobs use); verify_jwt on the functions accepts it.
select cron.schedule(
  'streak-reminder',
  '0 18 * * *',
  $job$
  select net.http_post(
    url := 'https://abmgtjafghpupaqsjnwe.supabase.co/functions/v1/streak-reminder',
    headers := jsonb_build_object('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFibWd0amFmZ2hwdXBhcXNqbndlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MzIzMjMsImV4cCI6MjA4NDUwODMyM30.8KS-UKN1r8YANggQ9HqsQmSHY95ghRL1Oq_d5LO19y4'),
    body := '{}'::jsonb
  );
  $job$
);

select cron.schedule(
  'skill-decay',
  '0 10 * * *',
  $job$
  select net.http_post(
    url := 'https://abmgtjafghpupaqsjnwe.supabase.co/functions/v1/skill-decay',
    headers := jsonb_build_object('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFibWd0amFmZ2hwdXBhcXNqbndlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MzIzMjMsImV4cCI6MjA4NDUwODMyM30.8KS-UKN1r8YANggQ9HqsQmSHY95ghRL1Oq_d5LO19y4'),
    body := '{}'::jsonb
  );
  $job$
);

select cron.schedule(
  'weekly-digest',
  '0 9 * * 1',
  $job$
  select net.http_post(
    url := 'https://abmgtjafghpupaqsjnwe.supabase.co/functions/v1/weekly-digest',
    headers := jsonb_build_object('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFibWd0amFmZ2hwdXBhcXNqbndlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MzIzMjMsImV4cCI6MjA4NDUwODMyM30.8KS-UKN1r8YANggQ9HqsQmSHY95ghRL1Oq_d5LO19y4'),
    body := '{}'::jsonb
  );
  $job$
);

select cron.schedule(
  'checkout-abandon',
  '0 15 * * *',
  $job$
  select net.http_post(
    url := 'https://abmgtjafghpupaqsjnwe.supabase.co/functions/v1/checkout-abandon',
    headers := jsonb_build_object('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFibWd0amFmZ2hwdXBhcXNqbndlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MzIzMjMsImV4cCI6MjA4NDUwODMyM30.8KS-UKN1r8YANggQ9HqsQmSHY95ghRL1Oq_d5LO19y4'),
    body := '{}'::jsonb
  );
  $job$
);
