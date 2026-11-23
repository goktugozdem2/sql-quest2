-- Rollback for supabase/migrations/20261123100000_users_email_lookup_index.sql
drop index concurrently if exists public.users_email_or_data_email_lower_idx;
