-- `public.referrals.referrer_username` — the column track-referral already
-- writes to, and which has never existed.
--
-- ── Why this is urgent rather than tidy ─────────────────────────────────────
-- supabase/functions/track-referral/index.ts inserts, unconditionally:
--
--     .insert({ ref_code, referrer_username, event_type, username, … })
--
-- `referrals` is (id, ref_code, event_type, username, email, plan_type,
-- amount_cents, user_agent, referrer_url, ip_hash, metadata, created_at).
-- PostgREST answers an unknown column with PGRST204 and rejects the whole
-- insert — so deploying that function as it stands today would break EVERY
-- referral row, including the campaign half that currently works and has been
-- working since 2026-04-29 (103 rows, 37 codes).
--
-- The only reason nothing is broken right now is that the deployed copy of
-- track-referral is OLDER than the source in this repo. That is a landmine,
-- not a safety margin: the next `supabase functions deploy track-referral`
-- disarms nothing and detonates it.
--
-- ── Why keep the column rather than drop it from the insert ─────────────────
-- It is the right shape. Resolving a peer referral means matching a code to a
-- user, and storing the answer makes every per-user rollup a direct filter
-- instead of a join back through `users.personal_ref_code`. The function's own
-- comment says as much. Null for partner/campaign codes, which is the honest
-- value — those have no referrer on our side.

alter table public.referrals add column if not exists referrer_username text;

-- Every per-user question ("how many signups did THIS person send") filters on
-- exactly this, and the table only grows.
create index if not exists referrals_referrer_username_idx
  on public.referrals (referrer_username)
  where referrer_username is not null;

comment on column public.referrals.referrer_username is
  'The username whose personal_ref_code matched this row''s ref_code, lowercased. NULL for campaign/partner codes, which have no referrer on our side. Written by the track-referral edge function.';
