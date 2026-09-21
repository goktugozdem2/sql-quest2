-- Step 2 of 20260922120000_account_read_one_row.sql: the anon key can no longer
-- read users_public. Apply ONLY after the client that reads through
-- rpc/sq_load_account is live and verified (a returning account loads).
-- The function is security definer, so it keeps working after this.
-- Rollback: supabase/manual/20260922b_users_public_anon_off_rollback.sql
revoke select on public.users_public from anon, authenticated;
notify pgrst, 'reload schema';
