-- Probe for 20261123100000_users_email_lookup_index.sql. Run as postgres
-- AFTER the migration (supabase db query --linked -f <this file>). One
-- transaction, rolled back: it writes nothing. Each check raises on failure.
-- Run it BEFORE the migration too: the first check must raise there.
begin;

-- 1. The index exists and is valid (a failed CONCURRENTLY build leaves an
--    INVALID index behind; drop it with the rollback file and re-run).
do $$
declare ok boolean;
begin
  select i.indisvalid into ok
    from pg_index i join pg_class c on c.oid = i.indexrelid
   where c.relname = 'users_email_or_data_email_lower_idx';
  if ok is null then raise exception 'index users_email_or_data_email_lower_idx is missing'; end if;
  if not ok then raise exception 'index exists but is INVALID: run the rollback, then the migration again'; end if;
end $$;

-- 2. The planner uses it for the function's own expression.
do $$
declare plan text;
begin
  -- A small table may still get a seq scan; the probe forbids it so the
  -- check reads the index's usability, not the planner's cost guess.
  set local enable_seqscan = off;
  -- EXPLAIN returns one row per line; check every line.
  for plan in execute $q$explain (format text)
    select exists (select 1 from public.users u
      where lower(coalesce(nullif(u.email, ''), u.data->>'email')) = lower(trim('nobody@example.com')))$q$
  loop
    if plan ilike '%users_email_or_data_email_lower_idx%' then return; end if;
  end loop;
  raise exception 'the email check does not use users_email_or_data_email_lower_idx';
end $$;
reset enable_seqscan;

-- 3. The function still answers correctly, as anon, for a row inserted
--    inside this transaction (rolled back below).
insert into public.users (username, password_hash, salt, email, data)
  values ('probe_email_idx_20261123', 'x', 'x', '', '{"email":"Probe.Email.Idx@Example.com"}'::jsonb);

set local role anon;
do $$
begin
  if not public.sq_email_registered(' probe.email.idx@example.com ') then
    raise exception 'email check: false negative (data->>email, mixed case, padded)';
  end if;
  if public.sq_email_registered('nobody-probe-20261123@example.com') then
    raise exception 'email check: false positive';
  end if;
  raise notice 'email check: index present, used, answers correct';
end $$;
reset role;

rollback;
