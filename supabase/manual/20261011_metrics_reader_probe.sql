-- Probe for 20261011100000_metrics_reader_role.sql. Run as postgres AFTER the
-- migration; everything happens inside one transaction that is rolled back.
-- Each check raises if the role can do more, or less, than it should.
begin;
set local role metrics_reader;
-- A real login gets these from the role; `set role` does not apply them.
set local search_path = metrics, public;

do $$
declare n bigint; leaked boolean;
begin
  -- It reads the analytics tables and the stripped account view.
  select count(*) into n from pro_events;
  raise notice 'pro_events rows visible: %', n;
  if n = 0 then raise exception 'metrics_reader sees no pro_events rows (RLS without a policy?)'; end if;
  select count(*) into n from users;          -- resolves to metrics.users
  raise notice 'users rows visible (metrics.users): %', n;

  -- The view carries no credential or address.
  select exists (select 1 from users where data ? 'passwordHash' or data ? 'salt' or data ? 'email') into leaked;
  if leaked then raise exception 'metrics.users leaks a private key'; end if;

  -- It cannot read the base table.
  begin
    perform 1 from public.users limit 1;
    raise exception 'metrics_reader can read public.users';
  exception when insufficient_privilege then raise notice 'public.users: denied (good)';
  end;

  -- It cannot read the credential tables.
  begin
    perform 1 from public.account_sessions limit 1;
    raise exception 'metrics_reader can read account_sessions';
  exception when insufficient_privilege or undefined_table then raise notice 'account_sessions: denied (good)';
  end;

  -- It cannot write anywhere. Checked on the grants, not by attempting an
  -- insert: an insert into a serial table is refused on the sequence first,
  -- which hid a table INSERT grant in the first version of this probe.
  select exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'metrics') and c.relkind in ('r', 'v', 'm', 'p')
      and has_table_privilege('metrics_reader', c.oid, 'INSERT, UPDATE, DELETE, TRUNCATE')
  ) into leaked;
  if leaked then raise exception 'metrics_reader holds a write grant on a table'; end if;
  raise notice 'no write grant on any table (good)';
end $$;

rollback;
