-- Account reads and writes move behind functions — step 2 of 2.
--
-- APPLY ONLY AFTER the client release that uses public.users_public,
-- public.sq_save_user and the account-login / account-password functions is
-- live AND verified (checklist in the PR: a guest save, a sign-up, a login by
-- username and by email, a password change, the leaderboard). Applying this
-- first breaks every save for every open tab.
--
-- Apply:    supabase db query --linked -f supabase/manual/20260913b_users_direct_access_off.sql
-- Roll back: supabase db query --linked -f supabase/manual/20260913b_users_direct_access_off_rollback.sql
--
-- Edge functions use the service role and are unaffected. Every definer
-- function that reads public.users (referral RPCs, the ref-code trigger, the
-- functions in step 1) keeps working: it runs as its owner.

begin;

drop policy if exists "Allow all" on public.users;
revoke all on table public.users from anon, authenticated;

-- RLS stays enabled with no client policy: only the service role and definer
-- functions reach the table.
alter table public.users enable row level security;

commit;

-- Probe (run separately; must fail for anon, succeed through the view):
--   begin; set local role anon; select count(*) from public.users; rollback;          -- expect: permission denied
--   begin; set local role anon; select count(*) from public.users_public; rollback;   -- expect: a number
--   begin; set local role anon; select public.sq_email_registered('nobody@example.com'); rollback; -- expect: false
