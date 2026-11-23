-- Probe for supabase/migrations/20261123150000_debug_pack_server_owned.sql
-- (the Debug pack, 2026-11-23). Run as postgres (supabase db query --linked
-- -f <this file>); ONE transaction, ROLLED BACK — the probe rows, the saves
-- and any session_token_misses rows they record all disappear.
--
-- BEFORE the migration it must FAIL at check 1 ("set by a client save"): a
-- client save can write debugPackOwned and unlock the Debug set for free.
-- AFTER the migration every check passes:
--   1. an anon save carrying debugPackOwned does not set it on a row without it;
--   2. an anon save without the field keeps the row's debugPackOwned;
--   3. an anon save carrying a forged debugPackOwned keeps the row's own;
--   4. a NEW row created by an anon save never starts with one.
-- Saves go through public.sq_save_user exactly as the browser sends them
-- (set local role anon, no session token: step 1 records the miss and refuses
-- nothing). Not for use after the session-token cut — tokenless anon saves
-- are refused there by design. The local replica with the guest carry and
-- the rollback is supabase/manual/debug-pack-replica-test.sql.

begin;

insert into public.users (username, password_hash, salt, email, data) values
  ('probe_dp_free', repeat('a', 64), 'probeSaltD1', null, '{"xp":0}'),
  ('probe_dp_owner', repeat('b', 64), 'probeSaltD2', null,
   '{"xp":0,"debugPackOwned":{"at":"2026-11-23T00:00:00.000Z","sessionId":"cs_probe_owner","paymentIntent":"pi_probe","amount":900,"currency":"usd"}}');

set local role anon;
select public.sq_save_user('probe_dp_free',
  '{"xp":1,"debugPackOwned":{"at":"2026-11-23T00:00:00.000Z","sessionId":"cs_forged","paymentIntent":"pi_forged","amount":0,"currency":"usd"}}'::jsonb);
reset role;

do $$ begin
  if (select data ? 'debugPackOwned' from public.users where username = 'probe_dp_free') then
    raise exception 'check 1 FAILED: debugPackOwned set by a client save — the Debug set would open for free';
  end if;
  if (select (data->>'xp')::int from public.users where username = 'probe_dp_free') <> 1 then
    raise exception 'check 1 FAILED: the rest of the save did not land';
  end if;
  raise notice 'check 1: a client save cannot set it (good)';
end $$;

set local role anon;
select public.sq_save_user('probe_dp_owner', '{"xp":1}'::jsonb);
reset role;

do $$ begin
  if (select data->'debugPackOwned'->>'sessionId' from public.users where username = 'probe_dp_owner') is distinct from 'cs_probe_owner' then
    raise exception 'check 2 FAILED: a client save without the field wrote it away';
  end if;
  raise notice 'check 2: kept through a save without it (good)';
end $$;

set local role anon;
select public.sq_save_user('probe_dp_owner',
  '{"xp":2,"debugPackOwned":{"at":"2020-01-01T00:00:00.000Z","sessionId":"cs_forged","paymentIntent":"pi_forged","amount":0,"currency":"usd"}}'::jsonb);
select public.sq_save_user('guest_probe_dp_new',
  '{"xp":0,"debugPackOwned":{"at":"2026-11-23T00:00:00.000Z","sessionId":"cs_forged"}}'::jsonb);
reset role;

do $$ begin
  if (select data->'debugPackOwned'->>'sessionId' from public.users where username = 'probe_dp_owner') is distinct from 'cs_probe_owner' then
    raise exception 'check 3 FAILED: a client save replaced debugPackOwned';
  end if;
  if (select (data->>'xp')::int from public.users where username = 'probe_dp_owner') <> 2 then
    raise exception 'check 3 FAILED: the rest of the save did not land';
  end if;
  raise notice 'check 3: a forged value is ignored, the rest lands (good)';
  if not exists (select 1 from public.users where username = 'guest_probe_dp_new') then
    raise exception 'check 4 FAILED: the new-row save did not create the row';
  end if;
  if (select data ? 'debugPackOwned' from public.users where username = 'guest_probe_dp_new') then
    raise exception 'check 4 FAILED: a new row started with debugPackOwned';
  end if;
  raise notice 'check 4: a new row never starts with one (good)';
end $$;

rollback;
