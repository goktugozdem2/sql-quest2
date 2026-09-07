-- Quotable testimonials: explicit, separate, revocable-by-asking consent.
--
-- NOT APPLIED. The founder must paste this into the Supabase SQL editor for
-- the production project (abmgtjafghpupaqsjnwe). Until then the client sends
-- these three keys and PostgREST drops them silently on a table that has no
-- such columns — the message itself still lands, which is the failure mode we
-- want if the order of operations slips.
--
-- WHY
--
-- 2026-09-07: 318 public profiles auto-published, `profile_link_copied` never
-- fired once, referral functions at zero events for months, and this table
-- holding 5 rows. There is nothing third-party for Google or an AI assistant
-- to read about us, and the AI-recommendation channel is the only one that has
-- produced a paying customer. The review ask (src/utils/review-ask.js) sends
-- people to Trustpilot; this column set is the other half — a person who tells
-- us something good in the private channel may, if they choose to, let us
-- quote it.
--
-- THE CONSENT RULES, which are why these are three columns and not one:
--
--   * `quote_consent` is a DISTINCT checkbox, default off. Sending feedback is
--     not consent to be quoted. Silence is not consent. A NULL here means the
--     person was never asked (every row written before this migration) and
--     must be read as "no", never as "unknown, ask forgiveness later".
--   * `quote_name` is the display name THE PERSON chose. It is not their
--     username, not their email local-part, and not derived from anything.
--     A consent with no name is a consent to be quoted anonymously.
--   * `quote_consent_at` is stamped client-side at the moment the box was
--     ticked. `created_at` is when the message was sent; they are usually
--     seconds apart, and keeping them separate is what lets us answer "when
--     did this person consent" without inferring it.
--
-- Nothing here is incentivised. There is no reward for ticking the box, and
-- the product offers none — see the FTC/endorsement note at the top of
-- src/utils/review-ask.js.
--
-- SECURITY POSTURE IS UNCHANGED, deliberately:
--   * The existing INSERT-only anon policy (`anon_can_submit_feedback`) still
--     covers these columns; adding columns to a table does not add a policy.
--   * NO select policy is added. The shipped anon key still cannot read a
--     single feedback row back out, and that stays true for consent state and
--     display names, which are the most identifying fields on the table.
--   * All three are NULLABLE with no default other than NULL. Backfilling
--     `quote_consent` to `false` would be harmless but dishonest: false reads
--     as "they were asked and declined". NULL reads as "never asked", which is
--     what the 5 existing rows actually are.

alter table public.feedback
  add column if not exists quote_consent    boolean,
  add column if not exists quote_name       text,
  add column if not exists quote_consent_at timestamptz;

-- A display name is a display name, not an essay. Same shape of guard as
-- feedback_contact_len. Written as a NOT VALID-free plain constraint because
-- every existing row is NULL and passes.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'feedback_quote_name_len'
  ) then
    alter table public.feedback
      add constraint feedback_quote_name_len
      check (quote_name is null or char_length(quote_name) between 1 and 80);
  end if;
end $$;

-- A name or a timestamp without consent is a bug in the client, not a
-- quotable row. Reject it at the edge rather than discovering it when someone
-- pastes a "testimonial" onto the homepage.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'feedback_quote_consent_coherent'
  ) then
    alter table public.feedback
      add constraint feedback_quote_consent_coherent
      check (
        quote_consent is true
        or (quote_name is null and quote_consent_at is null)
      );
  end if;
end $$;

-- The read the founder actually runs before quoting anybody. Consent is the
-- filter; the verbatim is the point. n will be small — read them, don't
-- aggregate them (docs/data-driven-product.md P9).
--
--   select created_at, quote_consent_at, quote_name, message,
--          context->>'solvedCount' as solves, context->>'topic' as topic
--   from feedback
--   where quote_consent is true
--   order by created_at desc;
