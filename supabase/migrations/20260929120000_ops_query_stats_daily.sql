-- Smoke bot, daily database check (docs/plans/smoke-bot-rollback-2026-09-21.md,
-- founder 2026-09-22): any statement with a mean above 200 ms AND more than
-- 1,000 calls in the last 24 hours. pg_stat_statements is cumulative since
-- its last reset (2026-01-20), so the check keeps one snapshot a day and
-- reads the delta between the newest two. Never resets anything.
--
-- Applied by the founder: supabase db query --linked -f <this file>
-- Rollback: supabase/manual/20260929_ops_query_stats_daily_rollback.sql
-- Caller: scripts/smoke/db-slow-queries.mjs → rpc/ops_capture_query_stats
begin;

create schema if not exists ops;

-- No API access to the schema itself: PostgREST exposes `public` only, and
-- anon/authenticated get nothing here either way.
revoke all on schema ops from public, anon, authenticated;
grant usage on schema ops to service_role;

create table if not exists ops.query_stats_daily (
  captured_at      timestamptz not null default now(),
  queryid          bigint      not null,
  query_sha        text        not null,          -- sha256 of the normalised text; stable across a queryid change
  query_head       text        not null,          -- first 200 chars, for the alert; never the parameters
  calls            bigint      not null,
  total_exec_time  double precision not null,     -- ms, cumulative, as pg_stat_statements reports it
  rows             bigint      not null default 0,
  constraint query_stats_daily_pk primary key (captured_at, queryid)
);
create index if not exists query_stats_daily_queryid_idx on ops.query_stats_daily (queryid, captured_at desc);

alter table ops.query_stats_daily enable row level security;
revoke all on ops.query_stats_daily from public, anon, authenticated;
grant select, insert on ops.query_stats_daily to service_role;

-- One call = one snapshot + the offenders since the previous snapshot.
-- SECURITY DEFINER because pg_stat_statements is readable by pg_monitor
-- (postgres has it; service_role does not). A queryid that was reset or
-- restarted between snapshots shows a negative delta and is skipped: a
-- delta is only meaningful when the counters grew. Thresholds are
-- parameters with the founder's numbers as defaults so the script and this
-- function cannot silently disagree — tests/smoke-workflow.test.js pins both.
create or replace function ops.capture_query_stats(
  p_min_mean_ms   double precision default 200,
  p_min_calls     bigint           default 1000,
  p_window_hours  integer          default 24
)
returns table (
  queryid        bigint,
  query_head     text,
  calls_delta    bigint,
  mean_ms        double precision,
  since          timestamptz,
  until          timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, ops, extensions
as $$
declare
  v_now  timestamptz := now();
  v_prev timestamptz;
begin
  -- The newest snapshot before this one, but only if it is recent enough
  -- to be a 24 h read (up to 1.5× the window, so a late cron still reads).
  select max(captured_at) into v_prev
    from ops.query_stats_daily
   where captured_at < v_now
     and captured_at > v_now - make_interval(hours => p_window_hours * 3 / 2);

  -- pg_stat_statements keeps one row per (userid, dbid, toplevel, queryid):
  -- the same statement run by anon and by service_role is two rows. The
  -- snapshot is per queryid, so the roles are summed — the check asks how
  -- the statement behaves, not who ran it.
  insert into ops.query_stats_daily (captured_at, queryid, query_sha, query_head, calls, total_exec_time, rows)
  select v_now,
         s.queryid,
         encode(sha256(convert_to(min(s.query), 'UTF8')), 'hex'),
         left(min(s.query), 200),
         sum(s.calls),
         sum(s.total_exec_time),
         sum(s.rows)
    from extensions.pg_stat_statements s
   where s.queryid is not null
     and s.calls > 0
   group by s.queryid;

  if v_prev is null then
    return;  -- first snapshot: nothing to compare against yet
  end if;

  -- LEFT JOIN: a statement first seen since the previous snapshot has no
  -- previous row, and everything it has done is inside the window — an
  -- inner join would report a brand-new hot query a day late (found on the
  -- local replica proof, 2026-09-29). A reset between snapshots shows as a
  -- negative delta and drops out of the calls filter.
  return query
    select cur.queryid,
           cur.query_head,
           (cur.calls - coalesce(prev.calls, 0))                                       as calls_delta,
           (cur.total_exec_time - coalesce(prev.total_exec_time, 0))
             / (cur.calls - coalesce(prev.calls, 0))                                    as mean_ms,
           v_prev                                                                       as since,
           v_now                                                                        as until
      from ops.query_stats_daily cur
      left join ops.query_stats_daily prev
        on prev.queryid = cur.queryid and prev.captured_at = v_prev
     where cur.captured_at = v_now
       and cur.calls - coalesce(prev.calls, 0) > p_min_calls
       and (cur.total_exec_time - coalesce(prev.total_exec_time, 0))
             / (cur.calls - coalesce(prev.calls, 0)) > p_min_mean_ms
     order by 4 desc;  -- positional: plpgsql would read a bare `mean_ms` as the OUT variable
end;
$$;

revoke all on function ops.capture_query_stats(double precision, bigint, integer) from public, anon, authenticated;
grant execute on function ops.capture_query_stats(double precision, bigint, integer) to service_role;

-- PostgREST reaches `public` only, so the RPC door is a thin wrapper there.
-- Same gate: service role only. The client's anon key gets 42501 (tested by
-- the founder with the `set role anon` probe in the rollback file's header).
create or replace function public.ops_capture_query_stats(
  p_min_mean_ms   double precision default 200,
  p_min_calls     bigint           default 1000,
  p_window_hours  integer          default 24
)
returns table (
  queryid        bigint,
  query_head     text,
  calls_delta    bigint,
  mean_ms        double precision,
  since          timestamptz,
  until          timestamptz
)
language sql
security definer
set search_path = pg_catalog, ops
as $$
  select * from ops.capture_query_stats(p_min_mean_ms, p_min_calls, p_window_hours);
$$;

revoke all on function public.ops_capture_query_stats(double precision, bigint, integer) from public, anon, authenticated;
grant execute on function public.ops_capture_query_stats(double precision, bigint, integer) to service_role;

commit;
