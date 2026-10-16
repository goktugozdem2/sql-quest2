-- Replica test for migration 20261016100000_increment_ai_usage.sql.
-- LOCAL Postgres only:  psql -v ON_ERROR_STOP=1 -d <scratch db> -f this file
-- Recreates the two roles and the table shape it needs, applies the
-- migration, and asserts the limit and the grants.
\set ON_ERROR_STOP 1
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
end $$;
drop table if exists ai_usage cascade;
create table ai_usage (
  id uuid default gen_random_uuid() primary key,
  username text not null, date date not null default current_date,
  call_count int default 0, plan_type text default 'free',
  created_at timestamptz default now(), updated_at timestamptz default now(),
  unique (username, date)
);
\i supabase/migrations/20261016100000_increment_ai_usage.sql

do $$
declare r json; i int;
begin
  -- limit 3: three allowed (1, 2, 3), the fourth and fifth refused at 3
  for i in 1..3 loop
    r := increment_ai_usage('u', date '2026-10-16', 'guest', 3);
    assert (r->>'was_limited')::boolean = false, format('call %s should pass: %s', i, r);
    assert (r->>'new_count')::int = i, format('call %s count: %s', i, r);
  end loop;
  for i in 4..5 loop
    r := increment_ai_usage('u', date '2026-10-16', 'guest', 3);
    assert (r->>'was_limited')::boolean = true, format('call %s should be limited: %s', i, r);
    assert (r->>'new_count')::int = 3, format('call %s must not count: %s', i, r);
  end loop;
  -- another day, another bucket (the #nudge suffix is just another username)
  r := increment_ai_usage('u', date '2026-10-17', 'guest', 3);
  assert (r->>'new_count')::int = 1 and (r->>'was_limited')::boolean = false, r::text;
  r := increment_ai_usage('u#nudge', date '2026-10-16', 'guest', 12);
  assert (r->>'new_count')::int = 1, r::text;
  -- a nonsense limit refuses
  r := increment_ai_usage('v', date '2026-10-16', 'guest', 0);
  assert (r->>'was_limited')::boolean = true, r::text;
  -- grants: service role only
  assert has_function_privilege('service_role', 'increment_ai_usage(text,date,text,int)', 'execute');
  assert not has_function_privilege('anon', 'increment_ai_usage(text,date,text,int)', 'execute'), 'anon must not execute';
  assert not has_function_privilege('authenticated', 'increment_ai_usage(text,date,text,int)', 'execute'), 'authenticated must not execute';
  raise notice 'increment_ai_usage replica test: all assertions passed';
end $$;
