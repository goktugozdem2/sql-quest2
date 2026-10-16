-- The tutor's atomic rate limit (2026-10-16).
--
-- supabase/functions/ai-tutor calls rpc/increment_ai_usage on every request.
-- The function was never created in production: every call answered 404 and
-- the tutor fell back to a read-then-write count, which a burst of parallel
-- calls can overrun. The definition in the old ai-usage-setup.sql could not
-- limit anyone either: at count = limit its CASE stopped counting and it then
-- reported was_limited = false, forever.
--
-- Semantics: a call is allowed iff the day's count is below the limit before
-- it; an allowed call increments, a refused one does not. One statement, so
-- two concurrent calls cannot both take the last slot.
--
-- Callable by the service role only. PostgREST exposes public functions to
-- anon by default; anon calling this for someone else's username would spend
-- their tutor for the day.
--
-- Proof (local Postgres 18): supabase/manual/increment-ai-usage-replica-test.sql
-- Rollback: drop function public.increment_ai_usage(text, date, text, int);

create or replace function public.increment_ai_usage(
  p_username text,
  p_date date,
  p_plan_type text,
  p_daily_limit int
) returns json
language plpgsql
set search_path = public
as $$
declare
  v_count int;
begin
  if p_daily_limit is null or p_daily_limit < 1 then
    return json_build_object('new_count', 0, 'was_limited', true);
  end if;

  insert into ai_usage (username, date, call_count, plan_type, updated_at)
  values (p_username, p_date, 1, p_plan_type, now())
  on conflict (username, date) do update
    set call_count = ai_usage.call_count + 1,
        plan_type  = excluded.plan_type,
        updated_at = now()
    where ai_usage.call_count < p_daily_limit
  returning call_count into v_count;

  if v_count is null then
    -- the row existed and was already at the limit: nothing was written
    select call_count into v_count from ai_usage where username = p_username and date = p_date;
    return json_build_object('new_count', v_count, 'was_limited', true);
  end if;
  return json_build_object('new_count', v_count, 'was_limited', false);
end;
$$;

revoke all on function public.increment_ai_usage(text, date, text, int) from public, anon, authenticated;
grant execute on function public.increment_ai_usage(text, date, text, int) to service_role;
