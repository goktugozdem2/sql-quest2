-- Index for the sign-up "is this email taken" check, sq_email_registered
-- (20260913130000_account_access_functions.sql). The function matches on
--   lower(coalesce(nullif(u.email, ''), u.data->>'email'))
-- and no index covered that expression, so it read the whole users table.
-- This index is the same expression, so the planner can use it.
--
-- Written by the agent, NOT applied. The founder applies it:
--   supabase db query --linked -f supabase/migrations/20261123100000_users_email_lookup_index.sql
-- then runs the probe: supabase/manual/20261123_users_email_lookup_index_probe.sql
-- Rollback: supabase/manual/20261123_users_email_lookup_index_rollback.sql
--
-- CONCURRENTLY so sign-ups and saves are not blocked while it builds. It
-- cannot run inside a transaction: keep this file to this one statement.
create index concurrently if not exists users_email_or_data_email_lower_idx
  on public.users (lower(coalesce(nullif(email, ''), data->>'email')));
