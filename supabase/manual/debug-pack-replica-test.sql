-- LOCAL SCRATCH DATABASE ONLY — never run against production.
--
-- The Debug pack (2026-11-23): debugPackOwned is server-owned
-- (supabase/migrations/20261123150000_debug_pack_server_owned.sql).
-- Builds a replica of public.users, applies the account-access migrations in
-- production order up to 20261122130000 (billingIssue), then the Debug-pack
-- migration, and asserts as the anon role — the way every browser saves:
--   r1. a client save cannot SET debugPackOwned on a row without it;
--   r2. a client save cannot CLEAR it (a save that omits it keeps the row's);
--   r3. a client save cannot REPLACE it with a forged record;
--   r4. a NEW row never starts with one from the request;
--   r5. a guest's pack follows the guest into a NEW account only with the
--       guest's own secret — no secret, or a wrong one, carries nothing;
--   r6. Pro is untouched by all of it (a pack owner's row stays not-Pro; a
--       Pro row's plan survives) and the rest of each save lands;
--   r7. the service role writes and clears it (the webhook's path);
--   r8. the precondition refuses to run twice over the wrong body, and the
--       rollback restores 20261122130000's body (a client save can then
--       write the field — which is exactly the gap this migration closes),
--       then forward again.
--
-- Run (from the repo root, against a throwaway local cluster):
--   psql -v ON_ERROR_STOP=1 -h 127.0.0.1 -p <port> -U postgres -d postgres -f supabase/manual/debug-pack-replica-test.sql

\set ON_ERROR_STOP 1

drop schema if exists public cascade;
drop schema if exists auth cascade;
create schema public;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
grant usage on schema public to anon, authenticated, service_role;
-- Supabase's default privileges: every new table and function in public is
-- granted to anon and authenticated. The migration must revoke them itself.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

create schema auth;
grant usage on schema auth to anon, authenticated;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

create table public.users (
  username text primary key,
  password_hash text not null,
  salt text not null,
  data jsonb default '{}'::jsonb,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  email text,
  personal_ref_code text
);
alter table public.users enable row level security;
create policy "Allow all" on public.users for all to public using (true) with check (true);
grant select, insert, update, delete on public.users to anon, authenticated;

create table public.ai_usage (id bigserial primary key, username text, date date, call_count int, plan_type text, created_at timestamptz default now(), updated_at timestamptz default now());
alter table public.ai_usage enable row level security;
create policy "Service role full access" on public.ai_usage for all to public using (true);



\ir ../migrations/20260913130000_account_access_functions.sql
\ir ../migrations/20260914100000_server_owned_account_fields.sql
\ir ../migrations/20260922120000_account_read_one_row.sql
\ir ../migrations/20260922160000_save_regression_guard.sql
\ir ../migrations/20260923100000_account_session_tokens.sql
\ir ../migrations/20260924100000_session_token_gaps.sql
\ir ../migrations/20260925100000_session_token_cut_prep.sql
\ir ../migrations/20261122130000_billing_issue_server_owned.sql

-- The gap, before the migration: a client save writes the field.
insert into public.users (username, password_hash, salt, email, data) values
  ('gap', repeat('g', 64), 'saltgap001', null, '{"xp":0}');
set role anon;
select public.sq_save_user('gap', '{"xp":1,"debugPackOwned":{"at":"2026-11-23T00:00:00Z","sessionId":"cs_forged"}}'::jsonb);
reset role;
do $$ begin
  if not (select data ? 'debugPackOwned' from public.users where username = 'gap') then
    raise exception 'pre: expected the gap (a client save sets debugPackOwned before the migration) — the replica is not the production body';
  end if;
  raise notice 'pre: before the migration a client save sets debugPackOwned (the gap)';
end $$;
delete from public.users where username = 'gap';

\ir ../migrations/20261123150000_debug_pack_server_owned.sql

insert into public.users (username, password_hash, salt, email, data) values
  ('owner', repeat('o', 64), 'saltowner1', null,
   '{"xp":10,"solvedChallenges":[91,92],"proStatus":false,"debugPackOwned":{"at":"2026-11-23T10:00:00.000Z","sessionId":"cs_test_owner","paymentIntent":"pi_owner","amount":900,"currency":"usd"}}'),
  ('free', repeat('f', 64), 'saltfree01', null, '{"xp":10,"solvedChallenges":[91],"proStatus":false}'),
  ('pro', repeat('p', 64), 'saltpro001', null,
   '{"xp":10,"proStatus":true,"proType":"annual","proExpiry":"2027-11-01T00:00:00.000Z","stripeCustomerId":"cus_p","stripeSessionId":"cs_pro"}');

set role anon;
-- r1: set on a row without it
select public.sq_save_user('free', '{"xp":11,"solvedChallenges":[91,92],"debugPackOwned":{"at":"2026-11-23T00:00:00Z","sessionId":"cs_forged","paymentIntent":"pi_x","amount":0,"currency":"usd"}}'::jsonb);
-- r2: a save that omits it
select public.sq_save_user('owner', '{"xp":11,"solvedChallenges":[91,92,93]}'::jsonb);
reset role;

do $$ begin
  if (select data ? 'debugPackOwned' from public.users where username = 'free') then
    raise exception 'r1 FAILED: a client save set debugPackOwned';
  end if;
  if (select (data->>'xp')::int from public.users where username = 'free') <> 11 then
    raise exception 'r1 FAILED: the rest of the save did not land';
  end if;
  raise notice 'r1: a client save cannot set it; the rest lands (good)';
  if (select data->'debugPackOwned'->>'sessionId' from public.users where username = 'owner') is distinct from 'cs_test_owner' then
    raise exception 'r2 FAILED: a client save without the field cleared it';
  end if;
  if (select jsonb_array_length(data->'solvedChallenges') from public.users where username = 'owner') <> 3 then
    raise exception 'r2 FAILED: the rest of the save did not land';
  end if;
  raise notice 'r2: a client save cannot clear it (good)';
end $$;

set role anon;
-- r3: replace with a forged record; and an explicit null
select public.sq_save_user('owner', '{"xp":12,"solvedChallenges":[91,92,93],"debugPackOwned":{"at":"2020-01-01T00:00:00Z","sessionId":"cs_forged","paymentIntent":"pi_forged","amount":0,"currency":"usd"}}'::jsonb);
select public.sq_save_user('owner', '{"xp":13,"solvedChallenges":[91,92,93],"debugPackOwned":null}'::jsonb);
-- r4: a new row
select public.sq_save_user('guest_r4new', '{"xp":0,"debugPackOwned":{"at":"2026-11-23T00:00:00Z","sessionId":"cs_forged"}}'::jsonb);
-- r6: Pro row saved by a client claiming not-Pro and claiming a pack
select public.sq_save_user('pro', '{"xp":20,"proStatus":false,"proType":null,"debugPackOwned":{"at":"x","sessionId":"cs_forged"}}'::jsonb);
reset role;

do $$ begin
  if (select data->'debugPackOwned'->>'sessionId' from public.users where username = 'owner') is distinct from 'cs_test_owner'
     or (select data->'debugPackOwned'->>'paymentIntent' from public.users where username = 'owner') is distinct from 'pi_owner' then
    raise exception 'r3 FAILED: a client save replaced or nulled debugPackOwned: %', (select data->'debugPackOwned' from public.users where username = 'owner');
  end if;
  raise notice 'r3: a forged record or a null is ignored (good)';
  if (select data ? 'debugPackOwned' from public.users where username = 'guest_r4new') then
    raise exception 'r4 FAILED: a new row started with debugPackOwned';
  end if;
  raise notice 'r4: a new row never starts with one (good)';
  if (select data->>'proStatus' from public.users where username = 'owner') <> 'false' then
    raise exception 'r6 FAILED: the pack owner is Pro';
  end if;
  if (select data->>'proStatus' from public.users where username = 'pro') <> 'true'
     or (select data->>'proType' from public.users where username = 'pro') <> 'annual'
     or (select data->>'stripeSessionId' from public.users where username = 'pro') <> 'cs_pro' then
    raise exception 'r6 FAILED: a Pro row lost its plan';
  end if;
  if (select data ? 'debugPackOwned' from public.users where username = 'pro') then
    raise exception 'r6 FAILED: a Pro row took a forged pack';
  end if;
  if (select (data->>'xp')::int from public.users where username = 'pro') <> 20 then
    raise exception 'r6 FAILED: the rest of the Pro row save did not land';
  end if;
  raise notice 'r6: Pro fields untouched, the rest lands (good)';
end $$;

-- r5: the guest carry. A guest that bought the pack, with its secret.
insert into public.users (username, password_hash, salt, email, data) values
  ('guest_buyer', '', '', null,
   '{"xp":5,"proStatus":false,"debugPackOwned":{"at":"2026-11-23T11:00:00.000Z","sessionId":"cs_test_guest","paymentIntent":"pi_guest","amount":300,"currency":"usd"}}');
insert into public.guest_secrets (username, secret_hash)
values ('guest_buyer', encode(sha256(convert_to('guest-secret-1', 'UTF8')), 'hex'));

set role anon;
-- no secret
select public.sq_save_user('acct_nosecret', '{"xp":5}'::jsonb, repeat('n', 64), 'saltn00001', null, 'guest_buyer', null, null);
-- a wrong secret
select public.sq_save_user('acct_wrong', '{"xp":5}'::jsonb, repeat('w', 64), 'saltw00001', null, 'guest_buyer', null, 'not-the-secret');
-- the right secret
select public.sq_save_user('acct_right', '{"xp":5,"debugPackOwned":{"at":"x","sessionId":"cs_forged"}}'::jsonb, repeat('r', 64), 'saltr00001', null, 'guest_buyer', null, 'guest-secret-1');
reset role;

do $$ begin
  if (select data ? 'debugPackOwned' from public.users where username = 'acct_nosecret') then
    raise exception 'r5 FAILED: the pack was carried without the guest''s secret';
  end if;
  if (select data ? 'debugPackOwned' from public.users where username = 'acct_wrong') then
    raise exception 'r5 FAILED: the pack was carried with a wrong secret';
  end if;
  if (select data->'debugPackOwned'->>'sessionId' from public.users where username = 'acct_right') is distinct from 'cs_test_guest' then
    raise exception 'r5 FAILED: the guest''s own pack did not follow it into the new account (got %)', (select data->'debugPackOwned' from public.users where username = 'acct_right');
  end if;
  if (select data->>'proStatus' from public.users where username = 'acct_right') <> 'false' then
    raise exception 'r5 FAILED: carrying the pack made the account Pro';
  end if;
  raise notice 'r5: the pack follows the guest only with its secret, and never as Pro (good)';
end $$;

-- r7: the service role (the webhook) writes and clears it.
set role service_role;
update public.users set data = data || '{"debugPackOwned":{"at":"2026-11-23T12:00:00.000Z","sessionId":"cs_test_free","paymentIntent":"pi_free","amount":900,"currency":"usd"}}'::jsonb where username = 'free';
reset role;
do $$ begin
  if (select data->'debugPackOwned'->>'sessionId' from public.users where username = 'free') is distinct from 'cs_test_free' then
    raise exception 'r7 FAILED: the service role could not write it';
  end if;
end $$;
set role anon;
select public.sq_save_user('free', '{"xp":12,"solvedChallenges":[91,92]}'::jsonb);
reset role;
do $$ begin
  if (select data->'debugPackOwned'->>'sessionId' from public.users where username = 'free') is distinct from 'cs_test_free' then
    raise exception 'r7 FAILED: a client save after the webhook''s write lost it';
  end if;
end $$;
set role service_role;
update public.users set data = data - 'debugPackOwned' where username = 'free';
reset role;
do $$ begin
  if (select data ? 'debugPackOwned' from public.users where username = 'free') then
    raise exception 'r7 FAILED: the service role could not clear it';
  end if;
  raise notice 'r7: the service role writes and clears it; a client save between keeps it (good)';
end $$;

-- r8: the rollback, then forward again.
\ir 20261123_debug_pack_server_owned_rollback.sql
set role anon;
select public.sq_save_user('free', '{"xp":13,"solvedChallenges":[91,92],"debugPackOwned":{"at":"x","sessionId":"cs_after_rollback"}}'::jsonb);
reset role;
do $$ begin
  if not (select data ? 'debugPackOwned' from public.users where username = 'free') then
    raise exception 'r8 FAILED: after the rollback the old body should accept the field (the rollback did not restore 20261122130000)';
  end if;
  raise notice 'r8: the rollback restores the old body (the gap is back, as expected)';
end $$;
update public.users set data = data - 'debugPackOwned' where username = 'free';
\ir ../migrations/20261123150000_debug_pack_server_owned.sql
set role anon;
select public.sq_save_user('free', '{"xp":14,"solvedChallenges":[91,92],"debugPackOwned":{"at":"x","sessionId":"cs_after_forward"}}'::jsonb);
reset role;
do $$ begin
  if (select data ? 'debugPackOwned' from public.users where username = 'free') then
    raise exception 'r8 FAILED: forward again did not close the gap';
  end if;
  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'sq_save_user') <> 1 then
    raise exception 'r8 FAILED: more than one sq_save_user';
  end if;
  raise notice 'r8: forward again closes it; one sq_save_user (good)';
end $$;

\echo 'debug-pack replica test: ALL CHECKS PASSED'
