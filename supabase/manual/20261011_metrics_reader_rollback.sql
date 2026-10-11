-- Rollback for 20261011100000_metrics_reader_role.sql: removes the role, its
-- read policies and the metrics schema. Nothing else depends on them.
begin;

do $$
declare r record;
begin
  for r in select tablename from pg_policies where schemaname = 'public' and policyname = 'metrics_reader_select' loop
    execute format('drop policy metrics_reader_select on public.%I', r.tablename);
  end loop;
end $$;

drop view if exists metrics.users;
drop schema if exists metrics;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'metrics_reader') then
    execute 'reassign owned by metrics_reader to postgres';
    execute 'drop owned by metrics_reader';
    execute 'drop role metrics_reader';
  end if;
end $$;

commit;
