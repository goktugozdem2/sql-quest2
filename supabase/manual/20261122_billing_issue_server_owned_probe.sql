-- Probe for supabase/migrations/20261122130000_billing_issue_server_owned.sql
-- (M-01). Run as postgres (supabase db query --linked -f <this file>); ONE
-- transaction, ROLLED BACK — the two probe rows, the saves and any
-- session_token_misses rows they record all disappear.
--
-- BEFORE the migration it must FAIL at check 1 ("billingIssue lost"): a
-- client save that does not carry the field writes it away — the gap.
-- AFTER the migration every check passes:
--   1. an anon save without the field keeps the row's billingIssue;
--   2. an anon save carrying a forged billingIssue keeps the row's own;
--   3. a row without the field does not take one from an anon save;
--   4. a NEW row created by an anon save never starts with one.
-- Saves go through public.sq_save_user exactly as the browser sends them
-- (set local role anon, no session token: step 1 records the miss and refuses
-- nothing). Not for use after the session-token cut — tokenless anon saves
-- are refused there by design.

begin;

insert into public.users (username, password_hash, salt, email, data) values
  ('probe_m01_held', repeat('a', 64), 'probeSalt01', null,
   '{"xp":0,"billingIssue":{"since":"2026-11-22T00:00:00.000Z","invoiceUrl":"https://invoice.stripe.com/i/acct_probe/test_probe","subscriptionId":"sub_probe"}}'),
  ('probe_m01_clear', repeat('b', 64), 'probeSalt02', null, '{"xp":0}');

set local role anon;
select public.sq_save_user('probe_m01_held', '{"xp":1}'::jsonb);
reset role;

do $$ declare v jsonb; begin
  select data->'billingIssue' into v from public.users where username = 'probe_m01_held';
  if v is null then raise exception 'check 1 FAILED: billingIssue lost — a client save without the field wrote it away'; end if;
  if v->>'invoiceUrl' <> 'https://invoice.stripe.com/i/acct_probe/test_probe' then
    raise exception 'check 1 FAILED: billingIssue changed to %', v;
  end if;
  raise notice 'check 1: kept through a save without it (good)';
end $$;

set local role anon;
select public.sq_save_user('probe_m01_held',
  '{"xp":2,"billingIssue":{"since":"2020-01-01T00:00:00.000Z","invoiceUrl":"https://evil.example/pay","subscriptionId":"sub_x"}}'::jsonb);
reset role;

do $$ declare v jsonb; begin
  select data->'billingIssue' into v from public.users where username = 'probe_m01_held';
  if v->>'invoiceUrl' is distinct from 'https://invoice.stripe.com/i/acct_probe/test_probe'
     or v->>'subscriptionId' is distinct from 'sub_probe' then
    raise exception 'check 2 FAILED: a client save replaced billingIssue with %', v;
  end if;
  if (select (data->>'xp')::int from public.users where username = 'probe_m01_held') <> 2 then
    raise exception 'check 2 FAILED: the rest of the save did not land';
  end if;
  raise notice 'check 2: a forged value is ignored, the rest of the save lands (good)';
end $$;

set local role anon;
select public.sq_save_user('probe_m01_clear',
  '{"xp":1,"billingIssue":{"since":"2026-11-22T00:00:00.000Z","invoiceUrl":"https://invoice.stripe.com/i/acct_probe/forged","subscriptionId":"sub_y"}}'::jsonb);
select public.sq_save_user('guest_probe_m01_new',
  '{"xp":0,"billingIssue":{"since":"2026-11-22T00:00:00.000Z","invoiceUrl":"https://invoice.stripe.com/i/acct_probe/forged","subscriptionId":"sub_z"}}'::jsonb);
reset role;

do $$ begin
  if (select data ? 'billingIssue' from public.users where username = 'probe_m01_clear') then
    raise exception 'check 3 FAILED: a row without billingIssue took one from a client save';
  end if;
  raise notice 'check 3: a row without the field does not take one (good)';
  if not exists (select 1 from public.users where username = 'guest_probe_m01_new') then
    raise exception 'check 4 FAILED: the new-row save did not create the row';
  end if;
  if (select data ? 'billingIssue' from public.users where username = 'guest_probe_m01_new') then
    raise exception 'check 4 FAILED: a new row started with billingIssue';
  end if;
  raise notice 'check 4: a new row never starts with one (good)';
end $$;

rollback;
