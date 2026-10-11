-- metrics_reader: a read-only login for metric reads from a cloud session
-- (2026-10-11, founder: "evet migration'ı yaz").
--
-- Why: cloud sessions (claude.ai/code) cannot read production, so every
-- "last 7 days vs the 7 before" waits for a laptop session. The service role
-- key would answer it, but it bypasses RLS and can write; it never goes into a
-- cloud environment. This role can only SELECT, only the analytics tables,
-- and sees account rows only through metrics.users, a view without
-- credentials, email or payment ids.
--
-- What it can read:
--   metrics.users  — public.users minus passwordHash, salt, email,
--                    unsubToken, stripeCustomerId, stripeSessionId,
--                    stripeSubscriptionId (the users_public strip list + one)
--   the analytics tables in ANALYTICS_TABLES below, where they exist
-- What it can never read: public.users itself, account_sessions,
--   account_login_attempts, guest_secrets, session_token_misses,
--   email_captures (raw addresses).
--
-- The role's search_path is `metrics, public`, so the existing report SQL
-- (scripts/funnel-report.sql, cohort-report.sql, seo-dashboard.sql), which
-- names `users` unqualified, reads metrics.users without a change.
--
-- No password here. After applying, the founder sets one in the SQL editor
-- (never in git, never in chat):
--   alter role metrics_reader with login password '<generated>';
-- and stores the pooler connection string as METRICS_DATABASE_URL in the
-- cloud environment's secrets.
--
-- Rollback: supabase/manual/20261011_metrics_reader_rollback.sql
-- Probe (rolled back): supabase/manual/20261011_metrics_reader_probe.sql
-- Guards: tests/metrics-reader-role.test.js

begin;

-- 1. The role. NOLOGIN until the founder sets a password.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'metrics_reader') then
    create role metrics_reader nologin noinherit nocreatedb nocreaterole noreplication nobypassrls connection limit 3;
  end if;
end $$;

-- A session can turn this off for itself, so it is a seatbelt, not the
-- guard. The guard is that nothing below grants INSERT, UPDATE, DELETE or
-- TRUNCATE. Functions executable by PUBLIC (sq_save_user and friends) stay
-- callable, exactly as they are for anon with the key every browser carries,
-- so this role adds no write path anon does not already have.
alter role metrics_reader set default_transaction_read_only = on;
-- The leaderboard view once cost ~39 h of DB time in nine days; a stray
-- report must not. 60 s covers every section of funnel-report.sql.
alter role metrics_reader set statement_timeout = '60s';
alter role metrics_reader set idle_in_transaction_session_timeout = '60s';
alter role metrics_reader set search_path = metrics, public;

-- 2. The credential-free account view, in its own schema.
create schema if not exists metrics;
revoke all on schema metrics from public;
grant usage on schema metrics to metrics_reader;

create or replace view metrics.users
with (security_invoker = false) as
select
  u.username,
  case when jsonb_typeof(u.data) = 'object'
       then u.data - 'passwordHash' - 'salt' - 'email' - 'unsubToken'
                   - 'stripeCustomerId' - 'stripeSessionId' - 'stripeSubscriptionId'
       else '{}'::jsonb end as data,
  u.created_at,
  u.updated_at
from public.users u;

comment on view metrics.users is
  'public.users without credentials, email or payment ids, for metrics_reader only. See 20261011100000_metrics_reader_role.sql.';

revoke all on metrics.users from public, anon, authenticated;
grant select on metrics.users to metrics_reader;

-- 3. The analytics tables: SELECT, plus a read policy where RLS is on (a role
--    without BYPASSRLS sees zero rows of an RLS table that has no policy for
--    it). Tables created by hand (pro_events, tutor_events, ai_usage, …) may
--    or may not carry RLS, so each is checked, not assumed.
revoke all on schema public from metrics_reader;
grant usage on schema public to metrics_reader;

do $$
declare
  t text;
  analytics_tables text[] := array[
    'pro_events', 'email_events', 'tutor_events', 'ai_usage', 'feedback',
    'referrals', 'public_profiles',
    'gsc_daily', 'gsc_index_status',
    'bing_site_daily', 'bing_stats', 'bing_crawl_daily', 'bing_url_status', 'bing_submissions'
  ];
begin
  foreach t in array analytics_tables loop
    if to_regclass('public.' || t) is null then
      raise notice 'metrics_reader: public.% does not exist, skipped', t;
      continue;
    end if;
    execute format('grant select on public.%I to metrics_reader', t);
    if (select relrowsecurity from pg_class where oid = to_regclass('public.' || t))
       and not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'metrics_reader_select') then
      execute format('create policy metrics_reader_select on public.%I for select to metrics_reader using (true)', t);
    end if;
  end loop;
end $$;

commit;
