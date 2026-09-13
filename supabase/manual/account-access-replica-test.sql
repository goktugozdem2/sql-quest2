-- LOCAL SCRATCH DATABASE ONLY — never run against production.
--
-- Builds a replica of public.users (columns, grants, the ref-code trigger),
-- applies
-- 20260913130000_account_access_functions.sql and then
-- 20260913b_users_direct_access_off.sql, and asserts what the anon role can
-- and cannot do at each step. Any failed assertion raises and stops psql.
--
-- Run (from the repo root, against a throwaway local cluster):
--   psql -v ON_ERROR_STOP=1 -h 127.0.0.1 -p <port> -U postgres -d postgres -f supabase/manual/account-access-replica-test.sql

\set ON_ERROR_STOP 1

drop schema if exists public cascade;
drop schema if exists auth cascade;
create schema public;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
grant usage on schema public to anon, authenticated;

-- auth.jwt() the way Supabase defines it: the request's JWT claims.
create schema auth;
grant usage on schema auth to anon, authenticated;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

-- ── production shape ──
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

create function public.users_assign_ref_code() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.username like 'guest%' or new.personal_ref_code is not null then return new; end if;
  new.personal_ref_code := substr(md5(new.username), 1, 8);
  return new;
end $$;
create trigger users_assign_ref_code_trg before insert on public.users for each row execute function public.users_assign_ref_code();

insert into public.users (username, password_hash, salt, email, data) values
  ('alice', repeat('a', 64), 'saltalice1', 'alice@example.com',
   '{"passwordHash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","salt":"saltalice1","email":"alice@example.com","xp":10,"unsubToken":"tok-a","stripeCustomerId":"cus_a","emailVerified":false}'),
  ('guest_1', '', '', null, '{"xp":3}');

create table public.ai_usage (id bigserial primary key, username text, date date, call_count int, plan_type text, created_at timestamptz default now(), updated_at timestamptz default now());
alter table public.ai_usage enable row level security;
create policy "Service role full access" on public.ai_usage for all to public using (true);
grant select, insert, update, delete on public.ai_usage to anon, authenticated;
insert into public.ai_usage (username, date, call_count, plan_type) values ('alice', current_date, 20, 'free');

-- ── step 1 ──
\ir ../migrations/20260913130000_account_access_functions.sql

set role anon;
do $$
declare d jsonb;
begin
  -- the view hides every protected key
  select data into d from public.users_public where username = 'alice';
  if d ? 'passwordHash' or d ? 'salt' or d ? 'email' or d ? 'unsubToken' or d ? 'stripeCustomerId' then
    raise exception 'users_public leaks a protected key: %', d;
  end if;
  if (d->>'xp')::int <> 10 then raise exception 'users_public lost progress'; end if;

  if not public.sq_email_registered('ALICE@example.com ') then raise exception 'email check: false negative'; end if;
  if public.sq_email_registered('nobody@example.com') then raise exception 'email check: false positive'; end if;
  if not public.sq_username_registered('alice') then raise exception 'username check: false negative'; end if;
  if public.sq_username_registered('guest_1') then raise exception 'username check: a guest is not registered'; end if;

  -- a save from a client that loaded the sanitized row (no secrets in data)
  perform public.sq_save_user('alice', '{"xp":20}'::jsonb, '', '', null);
  -- a save carrying different credential and payment fields (must be ignored)
  perform public.sq_save_user('alice', jsonb_build_object('xp', 21, 'passwordHash', repeat('b', 64), 'salt', 'evil', 'email', 'evil@example.com', 'stripeCustomerId', 'cus_evil'), repeat('b', 64), 'evil', 'evil@example.com');
  -- a new guest row
  perform public.sq_save_user('guest_2', '{"xp":1}'::jsonb);
  -- a new registration
  perform public.sq_save_user('bob', jsonb_build_object('xp', 0, 'passwordHash', repeat('c', 64), 'salt', 'saltbob123', 'email', 'Bob@Example.com'), repeat('c', 64), 'saltbob123', 'Bob@Example.com');
end $$;
reset role;

do $$
declare r public.users%rowtype;
begin
  select * into r from public.users where username = 'alice';
  if r.password_hash <> repeat('a', 64) or r.data->>'passwordHash' <> repeat('a', 64) then raise exception 'hash was replaced by a client save'; end if;
  if r.salt <> 'saltalice1' or r.data->>'salt' <> 'saltalice1' then raise exception 'salt was replaced'; end if;
  if r.email <> 'alice@example.com' or r.data->>'email' <> 'alice@example.com' then raise exception 'email was replaced'; end if;
  if r.data->>'unsubToken' <> 'tok-a' or r.data->>'stripeCustomerId' <> 'cus_a' then raise exception 'server keys lost: %', r.data; end if;
  if (r.data->>'xp')::int <> 21 then raise exception 'progress not saved'; end if;
  if r.personal_ref_code is null then raise exception 'ref-code trigger did not run for alice'; end if;

  select * into r from public.users where username = 'bob';
  if r.password_hash <> repeat('c', 64) or r.email <> 'bob@example.com' then raise exception 'registration not written: %', row_to_json(r); end if;
  if r.personal_ref_code is null then raise exception 'ref-code trigger did not run on registration'; end if;

  if not exists (select 1 from public.users where username = 'guest_2') then raise exception 'guest save not written'; end if;
end $$;

-- the Supabase Auth session flows
set role authenticated;
select set_config('request.jwt.claims', '{"email":"alice@example.com","role":"authenticated"}', false);
do $$ begin
  if public.sq_mark_email_verified() <> 'alice' then raise exception 'verify flow did not match alice'; end if;
  if public.sq_set_password_for_session_email('newsalt123', repeat('d', 64)) <> 'alice' then raise exception 'reset flow did not match alice'; end if;
end $$;
select set_config('request.jwt.claims', '', false);
do $$ begin
  begin
    perform public.sq_set_password_for_session_email('newsalt123', repeat('e', 64));
    raise exception 'reset without a session email must fail';
  exception when sqlstate '28000' then null;
  end;
end $$;
reset role;
do $$ begin
  if (select password_hash from public.users where username = 'alice') <> repeat('d', 64) then raise exception 'reset did not write'; end if;
  if (select data->>'emailVerified' from public.users where username = 'alice') <> 'true' then raise exception 'verify did not write'; end if;
end $$;

-- anon cannot call the session-only functions
set role anon;
do $$ begin
  begin
    perform public.sq_set_password_for_session_email('x', repeat('f', 64));
    raise exception 'anon must not execute the reset function';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- ── server-owned plan fields (20260914100000) ──
update public.users set data = data || '{"proStatus":true,"proType":"annual","proExpiry":"2027-09-01","proAutoRenew":true,"stripeCustomerId":"cus_a"}' where username = 'alice';
insert into public.users (username, password_hash, salt, data) values
  ('guest_paid', '', '', '{"xp":4,"proStatus":true,"proType":"monthly","proExpiry":"2026-10-14","proAutoRenew":true,"stripeCustomerId":"cus_g"}');
\ir ../migrations/20260914100000_server_owned_account_fields.sql

set role anon;
do $$ begin
  -- a free user cannot grant themselves a plan
  perform public.sq_save_user('bob', '{"xp":5,"proStatus":true,"proType":"lifetime","proExpiry":"2126-01-01"}'::jsonb);
  -- a paying user's stale tab cannot take the plan away
  perform public.sq_save_user('alice', '{"xp":40,"proStatus":false,"proType":null,"proExpiry":null,"emailOptOut":false}'::jsonb);
  -- a brand-new account cannot be created on a plan
  perform public.sq_save_user('carol', jsonb_build_object('xp', 0, 'proStatus', true, 'proType', 'lifetime', 'passwordHash', repeat('9', 64), 'salt', 'saltcarol1'), repeat('9', 64), 'saltcarol1', 'carol@example.com');
  -- a guest who paid keeps the plan when the account is created (copied from the guest row)
  perform public.sq_save_user('dave', jsonb_build_object('xp', 4, 'proStatus', true, 'proType', 'lifetime', 'passwordHash', repeat('8', 64), 'salt', 'saltdave12'), repeat('8', 64), 'saltdave12', 'dave@example.com', 'guest_paid');
  -- naming a non-guest or unpaid row carries nothing
  perform public.sq_save_user('erin', '{"xp":0}'::jsonb, repeat('7', 64), 'salterin12', 'erin@example.com', 'alice');
  -- the old five-argument call still works
  perform public.sq_save_user('guest_4', '{"xp":1}'::jsonb, '', '', null);
  if (select count(*) from public.ai_usage) <> 0 then raise exception 'anon can still read ai_usage rows'; end if;
  delete from public.ai_usage;
end $$;
reset role;
do $$
declare r jsonb;
begin
  select data into r from public.users where username = 'bob';
  if coalesce(r->>'proStatus', 'false') <> 'false' or r ? 'proType' and r->>'proType' is not null then raise exception 'free user granted a plan: %', r; end if;
  select data into r from public.users where username = 'alice';
  if r->>'proStatus' <> 'true' or r->>'proType' <> 'annual' or r->>'proExpiry' <> '2027-09-01' or r->>'stripeCustomerId' <> 'cus_a' then raise exception 'plan taken away by a client save: %', r; end if;
  if (r->>'xp')::int <> 40 then raise exception 'progress lost on a plan row'; end if;
  select data into r from public.users where username = 'carol';
  if r->>'proStatus' <> 'false' or r->>'proType' is not null then raise exception 'new account created on a plan: %', r; end if;
  select data into r from public.users where username = 'dave';
  if r->>'proStatus' <> 'true' or r->>'proType' <> 'monthly' or r->>'proExpiry' <> '2026-10-14' or r->>'stripeCustomerId' <> 'cus_g' then raise exception 'paid guest plan not carried from the guest row: %', r; end if;
  select data into r from public.users where username = 'erin';
  if r->>'proStatus' <> 'false' then raise exception 'carried a plan from a non-guest row'; end if;
  if not exists (select 1 from public.users where username = 'guest_4') then raise exception 'five-argument call broken'; end if;
  if (select call_count from public.ai_usage where username = 'alice') <> 20 then raise exception 'anon deleted or changed ai_usage rows'; end if;
end $$;

-- ── step 2 ──
\ir 20260913b_users_direct_access_off.sql

set role anon;
do $$ begin
  begin
    perform 1 from public.users limit 1;
    raise exception 'anon can still read public.users after step 2';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.users (username, password_hash, salt, data) values ('mallory', '', '', '{}') on conflict (username) do nothing;
    raise exception 'anon can still write public.users after step 2';
  exception when insufficient_privilege then null;
  end;
  if (select count(*) from public.users_public) < 3 then raise exception 'view unreadable after step 2'; end if;
  perform public.sq_save_user('guest_3', '{"xp":2}'::jsonb);
  perform public.sq_save_user('alice', '{"xp":30}'::jsonb);
  if not public.sq_email_registered('alice@example.com') then raise exception 'email check broken after step 2'; end if;
end $$;
reset role;
do $$ begin
  if not exists (select 1 from public.users where username = 'guest_3') then raise exception 'save through the function broken after step 2'; end if;
  if (select (data->>'xp')::int from public.users where username = 'alice') <> 30 then raise exception 'progress save broken after step 2'; end if;
  if (select personal_ref_code from public.users where username = 'guest_3') is not null then raise exception 'guest got a ref code'; end if;
end $$;

-- ── rollback restores the old state ──
\ir 20260913b_users_direct_access_off_rollback.sql
set role anon;
do $$ begin perform 1 from public.users limit 1; end $$;
reset role;

select 'account access replica test: all assertions passed' as result;
