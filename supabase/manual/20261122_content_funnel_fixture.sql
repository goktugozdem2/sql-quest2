-- Local fixture for scripts/content-funnel.sql (2026-11-22, B2).
-- LOCAL THROWAWAY POSTGRES ONLY: it creates public.pro_events and the
-- Supabase roles. Never run it against production.
--
--   createdb cf && psql -d cf -f supabase/manual/20261122_content_funnel_fixture.sql
--   psql -d cf -f supabase/migrations/20261122160000_content_funnel_view.sql
--   psql -d cf -c "select * from public.content_funnel order by 1, 2"
--
-- metadata is stored double-encoded (a jsonb string holding JSON text), the
-- way the client writes it, so the SQL's `(metadata #>> '{}')::jsonb` is
-- exercised as in production.
--
-- Expected (window_days, page: landing, opened, run, solve, 3 solves,
-- signup, modal, plan, trials, purchases, trial_or_purchase):
--   7  blog-x               1 1 1 1 1 1 1 1 1 0 1   person A, the full path
--   7  page-y               1 0 0 0 0 0 0 0 0 0 0   person F, first touch in 7 days
--   7  page-z               1 0 0 0 0 0 0 0 0 0 0   person H: solved BEFORE landing, so 0
--   7  revolut-sql-interview 2 1 0 0 0 0 0 0 0 1 1  B (opened) + I (bought, second browser)
--   28 blog-x               1 1 1 1 1 1 1 1 1 0 1
--   28 page-y               1 0 0 0 0 0 0 0 0 0 0
--   28 page-z               1 0 0 0 0 0 0 0 0 0 0
--   28 revolut-sql-interview 2 1 0 0 0 0 0 0 0 1 1
--   60 blog-x               1 1 1 1 1 1 1 1 1 0 1
--   60 page-x               1 0 0 0 0 0 0 0 0 0 0   F's first touch 40 days ago
--   60 page-z               1 0 0 0 0 0 0 0 0 0 0
--   60 revolut-sql-interview 2 1 0 0 0 0 0 0 0 1 1
-- Out: C (renderer, landing_view only), D (bot viewport), E (browser that
-- wrote a row as test2), G (founder checkout test 2026-11-20), K (bot stamp).
-- Verified on PostgreSQL 16.15, 2026-11-22: the view returned exactly these
-- 12 rows, and the probe's anon check raised insufficient_privilege.

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

drop view if exists public.content_funnel;
drop table if exists public.pro_events;
create table public.pro_events (
  id bigserial primary key,
  event text not null,
  username text,
  reason text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
grant select on public.pro_events to anon, authenticated, service_role;
\set QUIET on
\o /dev/null

create or replace function pg_temp.ev(p_event text, p_reason text, p_user text, p_ago interval, p_meta jsonb)
returns void language sql as $$
  insert into public.pro_events (event, reason, username, metadata, created_at)
  values (p_event, p_reason, p_user, to_jsonb(p_meta::text), now() - p_ago);
$$;

-- A: blog-x → the whole funnel, trial through the webhook (username only).
select pg_temp.ev('landing_view',        'landing',           'guest',  '3 days',          '{"aid":"a1","page":"blog-x"}');
select pg_temp.ev('landing_engaged',     'landing',           'guest',  '3 days',          '{"aid":"a1","page":"blog-x"}');
select pg_temp.ev('app_opened',          'activation_funnel', 'guest',  '3 days' - interval '5 min', '{"aid":"a1","arrivalSrc":"blog-x"}');
select pg_temp.ev('challenge_first_run', 'activation_funnel', 'guest_1','3 days' - interval '6 min', '{"aid":"a1","challengeId":91}');
select pg_temp.ev('challenge_solved',    'activation_funnel', 'guest_1','3 days' - interval '7 min', '{"aid":"a1","challengeId":91}');
select pg_temp.ev('challenge_solved',    'activation_funnel', 'guest_1','3 days' - interval '8 min', '{"aid":"a1","challengeId":92}');
select pg_temp.ev('challenge_solved',    'activation_funnel', 'guest_1','3 days' - interval '9 min', '{"aid":"a1","challengeId":92}');
select pg_temp.ev('challenge_solved',    'activation_funnel', 'guest_1','3 days' - interval '10 min','{"aid":"a1","challengeId":93}');
select pg_temp.ev('signup_completed',    'activation_funnel', 'alice',  '3 days' - interval '11 min','{"aid":"a1"}');
select pg_temp.ev('pro_modal_shown',     'activation_funnel', 'alice',  '3 days' - interval '12 min','{"aid":"a1","reason":"quota"}');
select pg_temp.ev('pro_plan_clicked',    'activation_funnel', 'alice',  '3 days' - interval '13 min','{"aid":"a1","plan":"annual"}');
select pg_temp.ev('pro_trial_started',   'stripe_webhook',    'alice',  '3 days' - interval '20 min','{"plan_type":"annual"}');

-- B: revolut page, landing_view only, then the app (engaged by a non-landing event).
select pg_temp.ev('landing_view',        'landing',           'guest',  '2 days', '{"aid":"b1","page":"revolut-sql-interview"}');
select pg_temp.ev('app_opened',          'activation_funnel', 'guest',  '2 days' - interval '1 min', '{"aid":"b1"}');

-- C: renderer — landing_view and nothing else. Not a landing person.
select pg_temp.ev('landing_view',        'landing',           'guest',  '1 day',  '{"aid":"c1","page":"revolut-sql-interview"}');

-- D: crawler viewport.
select pg_temp.ev('landing_engaged',     'landing',           'guest',  '1 day',  '{"aid":"d1","page":"blog-x","viewport":"desktop:1919x992"}');

-- E: a browser that once wrote a row as an internal account.
select pg_temp.ev('landing_engaged',     'landing',           'guest',  '1 day',  '{"aid":"e1","page":"blog-x"}');
select pg_temp.ev('app_opened',          'activation_funnel', 'test2',  '1 day' - interval '1 min', '{"aid":"e1"}');

-- F: page-x 40 days ago, page-y 3 days ago.
select pg_temp.ev('landing_engaged',     'landing',           'guest',  '40 days','{"aid":"f1","page":"page-x"}');
select pg_temp.ev('landing_engaged',     'landing',           'guest',  '3 days', '{"aid":"f1","page":"page-y"}');

-- G: the founder's checkout test, 2026-11-20 (fixed date).
insert into public.pro_events (event, reason, username, metadata, created_at) values
  ('landing_engaged', 'landing',           'guest',        to_jsonb('{"aid":"g1","page":"blog-x"}'::text), '2026-11-20 10:00Z'),
  ('pro_modal_shown', 'activation_funnel', 'guest_99',     to_jsonb('{"aid":"g1","reason":"email_link","solvedCount":0}'::text), '2026-11-20 10:01Z');

-- H: solved BEFORE landing on page-z; the solve must not count.
select pg_temp.ev('challenge_solved',    'activation_funnel', 'guest_h','5 days', '{"aid":"h1","challengeId":91}');
select pg_temp.ev('landing_engaged',     'landing',           'guest',  '4 days', '{"aid":"h1","page":"page-z"}');

-- I: lands on revolut in browser i1 as 'ivan', pays later from browser i2.
select pg_temp.ev('landing_engaged',     'landing',           'ivan',   '2 days', '{"aid":"i1","page":"revolut-sql-interview"}');
select pg_temp.ev('pro_modal_shown',     'activation_funnel', 'ivan',   '1 day',  '{"aid":"i2","reason":"quota"}');
select pg_temp.ev('pro_purchase_completed','stripe_webhook',  'ivan',   '1 day' - interval '5 min', '{"plan_type":"monthly"}');

-- K: a bot stamp on any row marks the browser.
select pg_temp.ev('landing_engaged',     'landing',           'guest',  '1 day',  '{"aid":"k1","page":"blog-x","bot":"ua:headless"}');
\o
