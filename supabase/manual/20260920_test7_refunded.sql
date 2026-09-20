-- test7: refunded, but still Pro (founder QA 2026-09-20, P0 item 1).
--
-- The $29.00 test charge (ch_3UHldyKfw2tJmZR50fwpBVr2) was refunded in full
-- at 17:30 today. The webhook branch that revokes access on a refund shipped
-- and deployed at 18:0x, and the Stripe endpoint only subscribed to
-- charge.refunded at 18:0x — so the refund event was never delivered to us,
-- and Stripe will not retro-deliver an event to a destination that was not
-- subscribed when it fired. Every refund from here on is handled
-- automatically; this row is the one that fell in the gap.
--
-- Plan fields are server-owned (migration 20260914100000), so a client write
-- cannot do this — it has to be service role.
--
--   supabase db query --linked -f supabase/manual/20260920_test7_refunded.sql

update public.users
   set data = data || jsonb_build_object(
                'proStatus', false,
                -- proType is KEPT on purpose: pro-access.js uses it to tell a
                -- lapsed subscriber from someone who never had Pro.
                'proExpiry', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                'proAutoRenew', false,
                'proGrantReason', 'refunded_20260920'),
       updated_at = now()
 where username = 'test7';

select username, data->>'proStatus' as pro_status, data->>'proType' as pro_type,
       data->>'proExpiry' as pro_expiry, data->>'proGrantReason' as reason
  from public.users where username = 'test7';
