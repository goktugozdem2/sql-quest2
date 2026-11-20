-- Rollback for supabase/migrations/20261120150000_pro_events_webhook_username_idx.sql
drop index concurrently if exists public.idx_pro_events_webhook_username;
