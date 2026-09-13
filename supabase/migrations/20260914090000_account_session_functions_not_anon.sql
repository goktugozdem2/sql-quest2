-- The two Supabase-Auth-session functions are for signed-in sessions only.
-- Supabase's default privileges grant EXECUTE on new public functions to anon
-- directly, which `revoke ... from public` in 20260913130000 does not remove.
-- Neither function does anything without a session email (both raise), so
-- this is tightening, not a fix. The ref-code trigger function is left alone
-- on purpose (CLAUDE.md: never revoke anything a users trigger touches).
--
-- Apply: supabase db query --linked -f supabase/migrations/20260914090000_account_session_functions_not_anon.sql

revoke execute on function public.sq_mark_email_verified() from anon;
revoke execute on function public.sq_set_password_for_session_email(text, text) from anon;
