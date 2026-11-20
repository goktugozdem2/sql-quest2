-- The trial check in create-checkout-session (trialAlreadyUsed) asks, on
-- every plan click: has this username a webhook-recorded trial or purchase?
--   pro_events WHERE event IN (...) AND reason = 'stripe_webhook'
--              AND username = $1 LIMIT 1
-- pro_events had only (id) and (created_at) indexes, so that was a full scan
-- of the table (141,944 rows, 62 MB on 2026-11-20): EXPLAIN ANALYZE 2.0 s
-- from cache, and the function's own log read `timing pre=8449ms
-- stripe=447ms` — the person waited ~9 s at "Opening checkout…", and ~8.4 s
-- of it was this lookup, not Stripe.
--
-- Partial index: only webhook rows (a few hundred), so it is tiny and costs
-- nothing on the ~140k client event inserts, which never carry that reason.
--
-- CONCURRENTLY so event inserts are not blocked while it builds. It cannot
-- run inside a transaction: keep this file to this one statement.
-- Rollback: supabase/manual/20261120_pro_events_webhook_username_idx_rollback.sql
create index concurrently if not exists idx_pro_events_webhook_username
  on public.pro_events (username)
  where reason = 'stripe_webhook';
