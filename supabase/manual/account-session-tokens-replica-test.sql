-- LOCAL SCRATCH DATABASE ONLY — never run against production.
--
-- Session tokens, step 1 (supabase/migrations/20260923100000_account_session_tokens.sql).
-- Builds a replica of public.users, applies the account-access migrations in
-- production order up to the regression guard, then the token migration, and
-- asserts as the anon role:
--   * an old client (no p_token) still loads and saves exactly as before, and
--     leaves one 'missing' row an hour in session_token_misses;
--   * a registered account's valid token is 'ok', a wrong one is recorded
--     'invalid' — and in this step neither is refused;
--   * a new guest row takes its secret on the first save; an existing guest
--     row takes the first secret presented (trust on first use); a second,
--     different secret is 'invalid';
--   * the regression guard and the server-owned plan fields still hold;
--   * anon cannot read or write the three new tables or call the check;
--   * exactly one sq_save_user and one sq_load_account exist;
--   * the rollback restores the old signatures and an old client still works.
-- Then the gaps before the cut (20260924100000_session_token_gaps.sql,
-- 2026-09-24): the "username taken" function, the carried plan checked
-- against the guest's secret, the email reset ending sessions, logout's
-- sq_end_session — and that migration's rollback and re-apply.
--
-- Run (from the repo root, against a throwaway local cluster):
--   psql -v ON_ERROR_STOP=1 -h 127.0.0.1 -p <port> -U postgres -d postgres -f supabase/manual/account-session-tokens-replica-test.sql

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

insert into public.users (username, password_hash, salt, email, data) values
  ('alice', repeat('a', 64), 'saltalice1', 'alice@example.com',
   '{"xp":500,"solvedChallenges":[1,2,3,4,5],"proStatus":true,"proType":"annual","stripeCustomerId":"cus_a"}'),
  ('guest_old', '', '', null, '{"xp":3}');

\ir ../migrations/20260913130000_account_access_functions.sql
\ir ../migrations/20260914100000_server_owned_account_fields.sql
\ir ../migrations/20260922120000_account_read_one_row.sql
\ir ../migrations/20260922160000_save_regression_guard.sql

-- ── before: an old client ──
set role anon;
do $$ begin
  perform public.sq_save_user('alice', '{"xp":510,"solvedChallenges":[1,2,3,4,5]}'::jsonb);
  if (select count(*) from public.sq_load_account('alice')) <> 1 then raise exception 'pre: load broken'; end if;
end $$;
reset role;

-- ── the token migration ──
\ir ../migrations/20260923100000_account_session_tokens.sql

do $$ begin
  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'sq_save_user') <> 1 then raise exception 'more than one sq_save_user'; end if;
  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'sq_load_account') <> 1 then raise exception 'more than one sq_load_account'; end if;
end $$;

-- a session minted the way account-login mints it (service role, hash only)
insert into public.account_sessions (username, token_hash)
values ('alice', encode(sha256(convert_to('alice-token-0123456789abcdef', 'UTF8')), 'hex'));

set role anon;
do $$
declare d jsonb;
begin
  -- an old client: no token, both calls work unchanged
  perform public.sq_save_user('alice', '{"xp":520,"solvedChallenges":[1,2,3,4,5]}'::jsonb);
  perform public.sq_save_user('alice', '{"xp":521,"solvedChallenges":[1,2,3,4,5]}'::jsonb, '', '', null);
  select l.data into d from public.sq_load_account('alice') l;
  if (d->>'xp')::int <> 521 then raise exception 'old-client save/load broken: %', d; end if;

  -- the six-argument call by name, as PostgREST sends it
  perform public.sq_save_user(p_username => 'alice', p_data => '{"xp":522,"solvedChallenges":[1,2,3,4,5]}'::jsonb,
                              p_password_hash => '', p_salt => '', p_email => null, p_carry_pro_from => null);

  -- a valid token
  perform public.sq_save_user(p_username => 'alice', p_data => '{"xp":530,"solvedChallenges":[1,2,3,4,5]}'::jsonb,
                              p_token => 'alice-token-0123456789abcdef');
  select l.data into d from public.sq_load_account('alice', 'alice-token-0123456789abcdef') l;
  if (d->>'xp')::int <> 530 then raise exception 'token save/load broken: %', d; end if;

  -- a wrong token: recorded, NOT refused in step 1
  perform public.sq_save_user(p_username => 'alice', p_data => '{"xp":531,"solvedChallenges":[1,2,3,4,5]}'::jsonb,
                              p_token => 'not-alices-token');
  select l.data into d from public.sq_load_account('alice', 'not-alices-token') l;
  if (d->>'xp')::int <> 531 then raise exception 'step 1 refused a wrong token: %', d; end if;

  -- the plan fields and the regression guard are unchanged
  if d->>'proStatus' <> 'true' or d->>'proType' <> 'annual' then raise exception 'plan fields lost: %', d; end if;
  begin
    perform public.sq_save_user(p_username => 'alice', p_data => '{"xp":0,"solvedChallenges":[]}'::jsonb,
                                p_token => 'alice-token-0123456789abcdef');
    raise exception 'regression guard did not fire';
  exception when sqlstate 'P0001' then
    if sqlerrm not like 'regression refused%' then raise; end if;
  end;

  -- guests: a new row takes its secret on the first save
  perform public.sq_save_user(p_username => 'guest_new', p_data => '{"xp":1}'::jsonb, p_token => 'guest-new-secret');
  perform public.sq_save_user(p_username => 'guest_new', p_data => '{"xp":2}'::jsonb, p_token => 'guest-new-secret');
  -- an existing guest row with no secret: trust on first use
  perform public.sq_save_user(p_username => 'guest_old', p_data => '{"xp":4}'::jsonb, p_token => 'guest-old-secret');
  -- a stranger's secret on a claimed row: recorded, not refused, not stored
  perform public.sq_save_user(p_username => 'guest_old', p_data => '{"xp":5}'::jsonb, p_token => 'someone-else');
  -- an old guest client: no token, still saves
  perform public.sq_save_user('guest_nosecret', '{"xp":1}'::jsonb);
  perform public.sq_save_user('guest_nosecret', '{"xp":2}'::jsonb);
  -- a read of a guest row nobody has claimed does not claim it
  perform * from public.sq_load_account('guest_nosecret', 'reader-secret');

  -- a read of a username that does not exist records nothing
  perform * from public.sq_load_account('nobody_at_all', null);

  -- anon cannot touch the new tables or the check
  begin perform 1 from public.account_sessions; raise exception 'anon can read account_sessions';
  exception when insufficient_privilege then null; end;
  begin insert into public.account_sessions (username, token_hash) values ('alice', 'x'); raise exception 'anon can mint a session';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.guest_secrets; raise exception 'anon can read guest_secrets';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.session_token_misses; raise exception 'anon can read session_token_misses';
  exception when insufficient_privilege then null; end;
  begin perform public.sq_session_token_check('alice', 'x', true); raise exception 'anon can call the check';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

do $$
declare r record;
begin
  if (select (data->>'xp')::int from public.users where username = 'guest_old') <> 5 then raise exception 'guest save refused'; end if;
  if (select secret_hash from public.guest_secrets where username = 'guest_new')
     <> encode(sha256(convert_to('guest-new-secret', 'UTF8')), 'hex') then raise exception 'new guest secret not stored'; end if;
  if (select secret_hash from public.guest_secrets where username = 'guest_old')
     <> encode(sha256(convert_to('guest-old-secret', 'UTF8')), 'hex') then raise exception 'first-use secret not stored, or overwritten'; end if;
  if exists (select 1 from public.guest_secrets where username = 'guest_nosecret') then raise exception 'a read claimed a guest row'; end if;
  if exists (select 1 from public.guest_secrets where secret_hash = encode(sha256(convert_to('someone-else', 'UTF8')), 'hex')) then
    raise exception 'a stranger secret was stored';
  end if;

  -- misses: alice's first miss was 'missing' and the hour's limit held it at one row
  if (select count(*) from public.session_token_misses where username = 'alice') <> 1 then
    raise exception 'alice misses not rate-limited: %', (select count(*) from public.session_token_misses where username = 'alice');
  end if;
  if (select kind from public.session_token_misses where username = 'alice') <> 'missing' then raise exception 'alice miss kind wrong'; end if;
  if (select kind from public.session_token_misses where username = 'guest_old') <> 'invalid' then raise exception 'stranger guest secret not recorded invalid'; end if;
  if (select count(*) from public.session_token_misses where username = 'guest_nosecret') <> 1 then raise exception 'guest missing not recorded once'; end if;
  if exists (select 1 from public.session_token_misses where username in ('nobody_at_all', 'guest_new')) then raise exception 'miss recorded where none belongs'; end if;

  -- after the hour, an 'invalid' is recorded as its own row
  update public.session_token_misses set at = now() - interval '2 hours' where username = 'alice';
end $$;

set role anon;
do $$ begin
  perform public.sq_save_user(p_username => 'alice', p_data => '{"xp":532,"solvedChallenges":[1,2,3,4,5]}'::jsonb, p_token => 'wrong-again');
end $$;
reset role;
do $$ begin
  if (select count(*) from public.session_token_misses where username = 'alice' and kind = 'invalid') <> 1 then raise exception 'invalid not recorded after the hour'; end if;
end $$;

-- ── rollback ──
\ir 20260923_account_session_tokens_rollback.sql

set role anon;
do $$
declare d jsonb;
begin
  perform public.sq_save_user('alice', '{"xp":540,"solvedChallenges":[1,2,3,4,5]}'::jsonb, '', '', null, null);
  select l.data into d from public.sq_load_account('alice') l;
  if (d->>'xp')::int <> 540 then raise exception 'rollback broke the old client: %', d; end if;
  begin
    perform public.sq_save_user(p_username => 'alice', p_data => '{"xp":541}'::jsonb, p_token => 'x');
    raise exception 'rollback left the token parameter';
  exception when undefined_function then null;
  end;
  begin
    perform public.sq_save_user('alice', '{"xp":0,"solvedChallenges":[]}'::jsonb);
    raise exception 'rollback lost the regression guard';
  exception when sqlstate 'P0001' then
    if sqlerrm not like 'regression refused%' then raise; end if;
  end;
end $$;
reset role;

-- ── and forward again (idempotent: tables are kept) ──
\ir ../migrations/20260923100000_account_session_tokens.sql
set role anon;
do $$ begin
  perform public.sq_save_user(p_username => 'guest_old', p_data => '{"xp":6}'::jsonb, p_token => 'guest-old-secret');
end $$;
reset role;

-- ══ the gaps before the cut (20260924100000_session_token_gaps.sql) ══
-- Proves, as the roles that will call them:
--   1. sq_username_registered answers "is this name taken" for anon with no
--      token, and calls a guest row free (why the client reserves guest_*);
--   2. a carried plan needs the guest's own secret: a match carries, no
--      stored secret carries and records 'missing' against the guest, no
--      p_carry_token carries (old client) and records 'missing', a WRONG
--      secret does not carry and records 'invalid'; an old client's call
--      shapes still resolve; exactly one sq_save_user;
--   3. an email reset ends every session of the reset account, and only its;
--   4. sq_end_session ends the one row matching username AND token, and
--      nothing without the token;
--   and the rollback puts back the seven-argument save and drops sq_end_session.

\ir ../migrations/20260924100000_session_token_gaps.sql

do $$ begin
  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'sq_save_user') <> 1 then raise exception 'gaps: more than one sq_save_user'; end if;
end $$;

-- fixtures, as the service role would leave them
delete from public.session_token_misses;
insert into public.users (username, password_hash, salt, email, data) values
  ('bob', repeat('b', 64), 'saltbob123', 'bob@example.com', '{"xp":50,"solvedChallenges":[1]}'),
  ('guest_paid', '', '', null, '{"xp":9,"proStatus":true,"proType":"annual","proExpiry":"2027-09-24","stripeCustomerId":"cus_g"}'),
  ('guest_paid2', '', '', null, '{"xp":9,"proStatus":true,"proType":"monthly"}'),
  ('guest_paid_nosecret', '', '', null, '{"xp":9,"proStatus":true,"proType":"monthly"}'),
  ('guest_free', '', '', null, '{"xp":9,"proStatus":false}');
insert into public.guest_secrets (username, secret_hash) values
  ('guest_paid', encode(sha256(convert_to('paid-guest-secret', 'UTF8')), 'hex')),
  ('guest_paid2', encode(sha256(convert_to('paid2-guest-secret', 'UTF8')), 'hex')),
  ('guest_free', encode(sha256(convert_to('free-guest-secret', 'UTF8')), 'hex'));
delete from public.account_sessions;
insert into public.account_sessions (username, token_hash) values
  ('alice', encode(sha256(convert_to('alice-t1', 'UTF8')), 'hex')),
  ('alice', encode(sha256(convert_to('alice-t2', 'UTF8')), 'hex')),
  ('alice', encode(sha256(convert_to('alice-t3', 'UTF8')), 'hex')),
  ('bob',   encode(sha256(convert_to('bob-t1', 'UTF8')), 'hex'));

set role anon;
do $$
declare d jsonb;
begin
  -- ── gap 1 ──
  if public.sq_username_registered('alice') is not true then raise exception 'gap1: alice not registered'; end if;
  if public.sq_username_registered(' Alice ') is not true then raise exception 'gap1: not normalised'; end if;
  if public.sq_username_registered('nobody_here') is not false then raise exception 'gap1: invented name taken'; end if;
  if public.sq_username_registered('guest_paid') is not false then raise exception 'gap1: guest rows are expected to read free'; end if;

  -- ── gap 2 ──
  -- the owner's secret: carried
  perform public.sq_save_user(p_username => 'carol_ok', p_data => '{"xp":0}'::jsonb, p_password_hash => repeat('c', 64), p_salt => 'saltcarol1',
                              p_carry_pro_from => 'guest_paid', p_carry_token => 'paid-guest-secret');
  -- a stranger's secret: not carried
  perform public.sq_save_user(p_username => 'carol_wrong', p_data => '{"xp":0,"proStatus":true,"proType":"annual"}'::jsonb, p_password_hash => repeat('c', 64), p_salt => 'saltcarol2',
                              p_carry_pro_from => 'guest_paid', p_carry_token => 'not-the-secret');
  -- an old client (no p_carry_token, 20260923 shape by name): still carried
  perform public.sq_save_user(p_username => 'carol_old', p_data => '{"xp":0}'::jsonb, p_password_hash => repeat('c', 64), p_salt => 'saltcarol3',
                              p_carry_pro_from => 'guest_paid2', p_token => null);
  -- a guest that never stored a secret: carried, recorded
  perform public.sq_save_user(p_username => 'carol_tofu', p_data => '{"xp":0}'::jsonb, p_password_hash => repeat('c', 64), p_salt => 'saltcarol4',
                              p_carry_pro_from => 'guest_paid_nosecret', p_carry_token => 'whatever-it-holds');
  -- an unpaid guest, the right secret: nothing to carry, nothing recorded
  perform public.sq_save_user(p_username => 'carol_free', p_data => '{"xp":0}'::jsonb, p_password_hash => repeat('c', 64), p_salt => 'saltcarol5',
                              p_carry_pro_from => 'guest_free', p_carry_token => 'wrong-for-free');
  -- an invented guest: nothing recorded
  perform public.sq_save_user(p_username => 'carol_ghost', p_data => '{"xp":0}'::jsonb, p_password_hash => repeat('c', 64), p_salt => 'saltcarol6',
                              p_carry_pro_from => 'guest_does_not_exist', p_carry_token => 'x');
  -- the old positional six- and seven-argument calls still resolve
  perform public.sq_save_user('dave6', '{"xp":0}'::jsonb, '', '', null, null);
  perform public.sq_save_user('dave7', '{"xp":0}'::jsonb, '', '', null, null, null);
  perform public.sq_save_user('bob', '{"xp":60,"solvedChallenges":[1]}'::jsonb, '', '', null, null, 'bob-t1', null);

  -- ── gap 4 ──
  perform public.sq_end_session('alice', 'not-a-token');     -- wrong token: nothing
  perform public.sq_end_session('bob', 'alice-t1');          -- right token, wrong name: nothing
  perform public.sq_end_session('alice', null);              -- no token: nothing
  perform public.sq_end_session('alice', '');                -- empty token: nothing
  perform public.sq_end_session('alice', 'alice-t1');        -- the one row
  perform public.sq_end_session('alice', 'alice-t1');        -- twice: harmless

  -- anon still cannot reach the tables, or the reset
  begin perform 1 from public.account_sessions; raise exception 'gaps: anon can read account_sessions';
  exception when insufficient_privilege then null; end;
  begin perform public.sq_set_password_for_session_email('saltsalt99', repeat('e', 64)); raise exception 'gaps: anon can reset';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

do $$
declare d jsonb;
begin
  select data into d from public.users where username = 'carol_ok';
  if d->>'proStatus' <> 'true' or d->>'proType' <> 'annual' or d->>'stripeCustomerId' <> 'cus_g' then raise exception 'gap2: owner carry lost: %', d; end if;
  select data into d from public.users where username = 'carol_wrong';
  if d->>'proStatus' <> 'false' or d ? 'stripeCustomerId' or d->'proType' <> 'null'::jsonb then raise exception 'gap2: a wrong secret carried Pro: %', d; end if;
  if not exists (select 1 from public.users where username = 'carol_wrong') then raise exception 'gap2: a wrong secret refused the account itself'; end if;
  select data into d from public.users where username = 'carol_old';
  if d->>'proStatus' <> 'true' or d->>'proType' <> 'monthly' then raise exception 'gap2: old client carry lost: %', d; end if;
  select data into d from public.users where username = 'carol_tofu';
  if d->>'proStatus' <> 'true' then raise exception 'gap2: no-secret guest carry lost: %', d; end if;
  select data into d from public.users where username = 'carol_free';
  if d->>'proStatus' <> 'false' then raise exception 'gap2: unpaid guest carried: %', d; end if;

  if (select kind from public.session_token_misses where username = 'guest_paid') <> 'invalid' then raise exception 'gap2: wrong secret not recorded invalid'; end if;
  if (select kind from public.session_token_misses where username = 'guest_paid2') <> 'missing' then raise exception 'gap2: old client not recorded missing'; end if;
  if (select kind from public.session_token_misses where username = 'guest_paid_nosecret') <> 'missing' then raise exception 'gap2: no-secret guest not recorded missing'; end if;
  if exists (select 1 from public.session_token_misses where username in ('guest_free', 'guest_does_not_exist', 'carol_ok', 'carol_wrong', 'bob')) then
    raise exception 'gap2: a miss recorded where none belongs';
  end if;
  if exists (select 1 from public.guest_secrets where username = 'guest_paid_nosecret') then raise exception 'gap2: a carry claimed a guest'; end if;
  if (select (data->>'xp')::int from public.users where username = 'bob') <> 60 then raise exception 'gap2: eight-arg positional save lost'; end if;

  if exists (select 1 from public.account_sessions where token_hash = encode(sha256(convert_to('alice-t1', 'UTF8')), 'hex')) then raise exception 'gap4: logout did not end the row'; end if;
  if (select count(*) from public.account_sessions where username = 'alice') <> 2 then raise exception 'gap4: logout ended more than its own row'; end if;
  if (select count(*) from public.account_sessions where username = 'bob') <> 1 then raise exception 'gap4: another account touched'; end if;
end $$;

-- ── gap 3: an email reset, as the recovery session would call it ──
set role authenticated;
select set_config('request.jwt.claims', '{"email":"alice@example.com"}', false);
do $$ begin
  if public.sq_set_password_for_session_email('saltreset1', repeat('f', 64)) <> 'alice' then raise exception 'gap3: reset did not answer alice'; end if;
end $$;
select set_config('request.jwt.claims', '', false);
reset role;
do $$ begin
  if exists (select 1 from public.account_sessions where username = 'alice') then raise exception 'gap3: reset left alice sessions'; end if;
  if (select count(*) from public.account_sessions where username = 'bob') <> 1 then raise exception 'gap3: reset ended another account'; end if;
  if (select password_hash from public.users where username = 'alice') <> repeat('f', 64) then raise exception 'gap3: reset did not write the hash'; end if;
end $$;

-- ── rollback of the gaps ──
\ir 20260924_session_token_gaps_rollback.sql

do $$ begin
  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'sq_save_user') <> 1 then raise exception 'gaps rollback: more than one sq_save_user'; end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'sq_end_session') then raise exception 'gaps rollback: sq_end_session left'; end if;
end $$;
set role anon;
do $$ begin
  perform public.sq_save_user(p_username => 'bob', p_data => '{"xp":61,"solvedChallenges":[1]}'::jsonb, p_token => 'bob-t1');
  begin
    perform public.sq_save_user(p_username => 'bob', p_data => '{"xp":62,"solvedChallenges":[1]}'::jsonb, p_carry_token => 'x');
    raise exception 'gaps rollback left p_carry_token';
  exception when undefined_function then null;
  end;
end $$;
reset role;

-- ── and forward again ──
\ir ../migrations/20260924100000_session_token_gaps.sql
set role anon;
do $$ begin
  perform public.sq_end_session('bob', 'bob-t1');
end $$;
reset role;
do $$ begin
  if exists (select 1 from public.account_sessions where username = 'bob') then raise exception 'gaps forward-again: sq_end_session broken'; end if;
end $$;

select 'account session tokens replica test: all assertions passed' as result;
