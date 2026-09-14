-- Who looks Pro, and who paid (2026-09-14)
--
-- Founder: "test2 pro gözüküyor ama ödemesi yok… sadece ödeme yapanlar pro
-- gözükmeli ve ödeme fail olursa pro free'ye dönmeli."
--
-- MEASURED, read-only, on the day:
--
--   57  accounts carry data->>'proStatus' = 'true'
--    4  of them have a pro_purchase_completed row with reason='stripe_webhook'
--   51  are past their proExpiry — resolveProAccess() already denies them Pro,
--       so the raw flag lies but the product does not
--    6  people actually SEE Pro right now:
--
--       jeromezhao    monthly  exp 2026-10-01   PAID
--       sab3r         monthly  exp 2026-09-22   PAID
--       sergelafarge  annual   exp 2027-07-22   PAID
--       test2         monthly  exp 2026-10-07   no payment — internal account
--       adinajoshi    monthly  exp 2026-09-30   no payment — 112 solves
--       muluken       lifetime exp 2099-12-31   no payment — 5 solves
--
-- None of the three unpaid accounts has a stripeCustomerId or a
-- stripeSessionId, so none of them ever reached checkout. They are the
-- documented 2026-09-07 population: the client's auto-renew branch pushed
-- proExpiry forward on every login until it was removed (src/utils/
-- pro-access.js, and the `lapsed-pro` note in CLAUDE.md). adinajoshi is the
-- account that note names — "the single most engaged account on the site,
-- 112 solves, labelled monthly, never asked to buy, never charged a cent".
--
-- The FUTURE is already closed: plan fields became server-owned in
-- 20260914100000_server_owned_account_fields.sql, so no client save can grant
-- Pro, and the webhook now revokes on a payment-failure cancellation
-- (supabase/functions/stripe-webhook). This file is only about the rows that
-- pre-date both.
--
-- Apply: supabase db query --linked -f supabase/manual/20260914_pro_without_payment.sql
-- The agent does not run this. Read each section and decide.

begin;

-- ── 1. The internal account. Ours, safe, no decision needed. ──────────────
update public.users
   set data = data
            || jsonb_build_object('proStatus', false, 'proAutoRenew', false,
                                  'proGrantReason', 'internal_cleanup_20260914'),
       updated_at = now()
 where username = 'test2'
   and coalesce(data->>'proStatus','false') = 'true';

-- ── 2. The 51 expired rows. Makes the raw flag honest. ────────────────────
--
-- Changes NOTHING a user sees: resolveProAccess() already treats an expired
-- plan as free, which is why only 6 of 57 see Pro. What it fixes is every
-- query that reads proStatus directly — including anything written in a hurry
-- during an incident. proType and proExpiry are kept on purpose: they are how
-- a lapsed subscriber is told apart from someone who never had Pro, and the
-- win-back copy depends on that difference.
update public.users
   set data = data || jsonb_build_object('proStatus', false, 'proAutoRenew', false),
       updated_at = now()
 where coalesce(data->>'proStatus','false') = 'true'
   and coalesce(data->>'proType','') <> 'lifetime'
   and (data->>'proExpiry') ~ '^\d{4}-'
   and (data->>'proExpiry')::timestamptz < now() - interval '3 days';  -- past grace

commit;

-- ── 3. THE TWO REAL PEOPLE — the founder's decision, not a default. ───────
--
-- Deliberately NOT in the transaction above. Both have had working Pro for
-- months because of our bug, not their action:
--
--   adinajoshi  since 2026-07-01, 112 solves, expires 2026-09-30 anyway
--   muluken     since 2026-04-19, 5 solves, "lifetime" to 2099
--
-- adinajoshi's plan expires in 16 days on its own. Doing nothing costs 16
-- days of access to the most engaged person on the site; revoking it today
-- takes something away that we gave, without telling them. The cheaper and
-- more honest move is to let it lapse and send the note — the copy exists in
-- supabase/functions/lapsed-pro, and CLAUDE.md says it must be rewritten
-- first to say we were giving them Pro and stopped, which is what happened.
--
-- muluken is the one that matters: "lifetime" to 2099 with no payment never
-- expires by itself.
--
-- Uncomment only what you decide:
--
-- update public.users
--    set data = data || jsonb_build_object('proStatus', false, 'proAutoRenew', false,
--                                          'proGrantReason', 'no_payment_20260914'),
--        updated_at = now()
--  where username in ('muluken');            -- and 'adinajoshi' if you mean it
--
-- Or, if either was a comp you gave on purpose, record that instead so the
-- next audit does not ask again:
--
-- update public.users
--    set data = data || jsonb_build_object('proGrantReason', 'founder_comp'),
--        updated_at = now()
--  where username in ('muluken');

-- ── Verify (run after either section) ─────────────────────────────────────
--
-- select count(*) filter (where (data->>'proStatus')='true') as flagged,
--        count(*) filter (where (data->>'proStatus')='true' and exists (
--          select 1 from public.pro_events e where e.username = u.username
--            and e.event='pro_purchase_completed' and e.reason='stripe_webhook')) as paid
--   from public.users u;
