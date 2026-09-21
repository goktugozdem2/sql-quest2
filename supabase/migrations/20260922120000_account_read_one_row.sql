-- One account row at a time (2026-09-22). Step 1 of 2.
--
-- The founder asked what users_public shows to the anon key — the key in every
-- browser. Measured the same day: one unfiltered request lists all 7,251 rows,
-- and each row carries everything but the six stripped keys: the queries a
-- person wrote (queryHistory, challengeQueries), their attempts, their plan
-- status (proStatus / proType / proExpiry), and — where set — their intake
-- (487 rows) and interview target (20 rows). 417 of the rows are named
-- accounts.
--
-- The client only ever needs ONE row: its own, by username (the session load
-- and the "does this account exist" check). This function returns exactly that
-- and nothing more, so the table can no longer be dumped in one request.
-- Step 2 (supabase/manual/20260922b_users_public_anon_off.sql) revokes anon's
-- SELECT on the view once the client reads through this function.
--
-- What this does NOT fix, and why it matters more: reads and writes are still
-- keyed by username alone — there is no session secret. Anyone who knows a
-- username can read that row, and sq_save_user will overwrite that row's data.
-- That needs a session token minted at sign-in; it is planned, not done
-- (docs/plans/account-session-tokens-2026-09-22.md), because it signs every
-- returning user out once and that is the founder's call.
--
-- Also here: leaderboard_public shows the top 50 only. It exposed every
-- username in the table, which made step 1 easy to walk around.

create or replace function public.sq_load_account(p_username text)
returns table (username text, data jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select v.username, v.data
    from public.users_public v
   where v.username = p_username
   limit 1;
$$;

revoke all on function public.sq_load_account(text) from public;
grant execute on function public.sq_load_account(text) to anon, authenticated;

create or replace view public.leaderboard_public
  with (security_invoker = false) as
select u.username,
       u.data -> 'xp' as xp,
       case when jsonb_typeof(u.data -> 'solvedChallenges') = 'array'
            then jsonb_array_length(u.data -> 'solvedChallenges')
            else 0 end as solved
  from public.users u
 where u.data -> 'xp' is not null
 order by u.data -> 'xp' desc nulls last
 limit 50;

notify pgrst, 'reload schema';
