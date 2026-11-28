# India checkout — where each India-priced clicker stopped (2026-11-28)

The question, from the 2026-11-28 segment read
(`docs/reads/segment-profiles-2026-11-28.md` §3): India-price plan clicks
became 1 trial in 16, against 3 in 14 for default-price clicks outside the
company segment. Why do India-priced checkouts not complete? This read
follows every India-priced person who clicked a plan, step by step, so the
founder can choose a fix. It builds on `docs/reads/india-checkout-2026-11-22.md`
and does not repeat that read's code walk (its §6). Nothing here proposes or
changes a price.

## Verdict (5 lines)

1. **No new India-priced person has ever completed a checkout. The "1 trial" is a returning payer.** Since sessions went live (09-30), 11 India-priced people clicked a plan. One completed: a $9 on-session purchase on 10-01, after 3 card declines. The segment read's "1 trial" is that same person coming back on 11-17. The other 10 reached a USD trial session and left without paying. Default price over the same dates: 9 of 20 (company door 6 of 11, everyone else 3 of 9).
2. **The offer and the plumbing are not the cause.** The trial was offered at the same rate in both regions (≥ 99% of modal views). Every India clicker got a Stripe session (0 server failures). Two were sent to an INR Payment Link by the old 8 s timeout, both before the 11-20 fix; none since. All 17 India clickers were on desktop. Every India session was monthly.
3. **The 10 stopped on Stripe's page, with no card failure on record:** 0 declines and 0 card-setup failures. 5 came back to the app 21–234 s after the click; 5 closed the tab. This step is not visible in our data. `setup_intent.setup_failed` has never fired for anyone in any region, so "0 failures" cannot be read as "0 attempts" until the Stripe endpoint is checked.
4. **New since 11-22: an India card cannot be charged when the buyer is away.** The one India card was charged off-session twice, at the 11-01 renewal and at the 11-24 day-7 trial charge. Both failed with `attempt_count 0` and no retry scheduled. Every failed default-price charge was counted and retried, and 2 default trials were charged successfully on day 7. So a better checkout page alone would still bring no recurring India revenue. This fits Stripe's documented RBI e-mandate rule, but it is **one card**.
5. **n:** 0 of 10 India trial sessions against 9 of 20 default is p ≈ 0.01 (Fisher, one-sided). Against non-company default (3 of 9) it is p ≈ 0.09. Three more India trial-session clickers with no trial would make it < 0.05 against a 21% rate. **FOUNDER DECISION** (§6): an India checkout with no off-session charge, and the 15-minute Stripe dashboard read that is still open.

## How it was read

- Production `pro_events`, read-only MCP, 2026-09-26 00:00 → 2026-11-28 12:00
  UTC (09-26 is when the regional price shipped; sessions went live 09-30).
  Metadata double-encoded, read as `(metadata #>> '{}')::jsonb`.
- **Person** = `coalesce(meta->>'aid', username)`. The person's server rows
  (`checkout_session`, `stripe_webhook`) are joined through every username
  that person's client rows carry, from 1 minute before their first plan click.
- **Humans only:** the exclusion block of `scripts/scorecard-weekly.sql`
  (as in `funnel-by-segment-2026-11-26.md`), restricted to plan clickers.
  It removed 1 internal account and 1 `app1lang` browser. **Trap found
  porting it:** written as `WHERE NOT (a OR b …)`, a person with no `bot`
  stamp (pre-stamp rows → NULL) evaluates to NULL and is silently dropped.
  That cost 15 of 41 clickers on the first try. The original uses
  `CASE WHEN`, which is safe. Use `COALESCE(…, false)` (Q1).
- **Region** = `priceRegion` on the person's plan clicks (any `IN` → India).
  n = **17** India, 24 default. The segment read's 16 is a cohort with a
  first open inside its own window. The 11-22 read also had 17.
- Labels I1–I17 and D1–D24 are by first click. No usernames, emails, aids or
  Stripe ids appear in this file.

## 1. Per-person paths — India price (all 17)

"Back" = `pro_checkout_returned.secondsAway` (starts at the click, so it
includes ~6 s of session creation). "—" = never came back to the app tab.
All 17 were on desktop and none arrived through a company page.

| | First click (UTC) | Path | Plan | Trial offered / asked | Modal reason @ solves | Stripe | Stopped at | Back (s) |
|---|---|---|---|---|---|---|---|---|
| I1 | 09-26 03:17 | Payment Link (INR) | monthly | no (pre-trial) | free_quota @17 | 1 link, expired | Stripe page, no attempt | — |
| I2 | 09-26 05:32 | Payment Link (INR) | monthly | no | free_quota @47 | 1 link, expired | Stripe page, no attempt | 7 |
| I3 | 09-26 08:11 | Payment Link (INR) | annual + monthly | no | free_quota @10 | 2 links, expired | Stripe page, no attempt | — (last step 77) |
| I4 | 09-26 09:59 | Payment Link (INR) | monthly | no | free_quota @10 | 1 link, expired | Stripe page, no attempt | 9 |
| I5 | 09-26 12:44 | Payment Link (INR) | monthly | no | free_quota @95 | 1 link, expired | Stripe page, no attempt | 11 |
| I6 | 09-27 02:46 | Payment Link (INR) | monthly | no | free_quota @138 | 1 link, expired | Stripe page, no attempt | — |
| **I7** | 10-01 05:38 | session; 1st click fell back to a Payment Link (timeout) | monthly | no (flag not yet on) | milestone @6 | 6 sessions expired; **3 declines, paid $9 on-session at 06:47** (69 min) | **Completed.** Then: **11-01 renewal failed** (attempt 0, no retry) → revoked → cancelled 11-16; **11-17 returned, IN trial**; **11-24 day-7 charge failed** (attempt 0, no retry) → revoked | 18, 224, 169 |
| I8 | 10-01 13:12 | session | monthly | yes / yes | free_quota @10 | expired (source not yet stamped) | Stripe page, no attempt | — |
| I9 | 10-05 17:24 | session | monthly | yes / yes | free_quota @10 | IN/trial, expired | Stripe page, no attempt | — |
| I10 | 10-08 14:16 | 2 sessions + 1 timeout fallback to an INR Payment Link | monthly | yes / yes | milestone @112 | 3 expired | Stripe page, no attempt | — (last step 22) |
| I11 | 10-11 08:52 | session | monthly | yes / yes | milestone @10 | IN/trial, expired | Stripe page, no attempt | — |
| I12 | 10-11 13:37 | session | monthly | yes / yes | free_quota @10 | IN/trial, expired | Stripe page, no attempt | — |
| I13 | 10-12 13:39 | session (London tz, geo IN) | clicked annual + monthly; session monthly | yes / yes | hard_challenge @6 | IN/trial, expired | Stripe page, no attempt | — |
| I14 | 10-28 09:38 | session | monthly | yes / yes | interview_locked @0 | IN/trial, expired | Stripe page, no attempt | 21 |
| I15 | 11-01 16:34 | session | monthly | yes / yes | free_quota @10 | IN/trial, expired | Stripe page, no attempt | 25 |
| I16 | 11-17 13:51 | session | clicked annual + monthly; session monthly | yes / yes | milestone @6 | IN/trial, expired | Stripe page, no attempt | 39 |
| I17 | 11-24 13:57 | session | monthly | yes / yes | milestone @6 | IN/trial, expired | Stripe page, no attempt | 234 |

"No attempt" means none on record: no `pro_payment_failed {subscription_create}`
and no `pro_card_setup_failed`. See §3 for why that is weaker than it reads.

## 2. Terminal states by region

### Session era (first plan click 09-30 → 11-28)

| Terminal state | India (11) | Default (20) | Default, company door (11) | Default, other doors (9) |
|---|---|---|---|---|
| Trial started (and later paid or still trialing) | **0 new** (+ I7's return trial, which failed at day 7) | 9 | 6 | 3 |
| Paid on-session at checkout | 1 (I7, after 3 declines) | 0 (D9 paid later, on a second subscription) | 0 | 0 |
| Expired, no recorded attempt | **10** | 11 | 5 | 6 |
| — of which bounced to a Payment Link by timeout | 1 (I10; plus I7's first click) | 2 (D12, D18) | 1 | 1 |
| Declined at checkout (`at_checkout`) | 3 rows, I7 only | 0 | 0 | 0 |
| Card setup failed (trial, 3DS) | 0 | 0 | 0 | 0 |
| Phone at the click | 0 | 2 (both expired) | 1 | 1 |
| Clicked annual | 2 (sessions were monthly) | 5 | 2 | 3 |
| Trial offered at the click | 10 of 10 after 10-01 | 19 of 20 (D5 before the flag) | 11 | 8 |

Time from click to the last step before leaving:
- **India, expired:** 2–39 s, with one at 234 s (I17).
- **Default, expired:** 0–139 s.
- **Default, trial started:** 32–278 s, median ~70 s (n = 6). Three needed a later visit (D6 at ~95 min, D19 at ~73 min, D9 on another day).

The bounce times overlap, so dwell time does not separate India from the
others. What separates them is that India has no completers at all.

### Session level (`pro_checkout_started`, logged from 10-06)

| Region / trial | Sessions | Completed | Expired |
|---|---|---|---|
| IN / trial | 10 (9 users) | 1 (I7's return trial) | 9 |
| default / trial | 29 (26 users) | 9 | 20 (1 still open) |
| default / no trial | 1 | 1 | 0 |

### Payment Link era (first click 09-26 → 09-29, before sessions)

India 6 (I1–I6) → 0, all on INR Payment Links (Adaptive Pricing is "Always
on" for links, per CLAUDE.md). Back in 7–11 s. Default 4 (D1–D4) → 0.

### Default-price clickers, for reference (D1–D24, no identifiers)

| | First click | Door | Path | Outcome |
|---|---|---|---|---|
| D1–D4 | 09-26 → 09-29 | other | Payment Link (D1 later a session too) | expired ×4 |
| D5 | 09-30 | other | session, no trial (flag off) | expired |
| D6 | 10-06 | other | session, trial | **trial** (second visit) |
| D7 | 10-08 | company | session, trial | expired |
| D8 | 10-11 | other | session, trial, annual | expired |
| D9 | 10-11 | company | 3 sessions | **trial**, later a paid monthly |
| D10 | 10-12 | company | 2 sessions | **trial** |
| D11 | 10-18 | other | 2 sessions, annual + monthly (Istanbul tz, `email_link`, 0 solves — may be a founder walk; kept by the filter) | expired |
| D12 | 10-19 | other | session + timeout → Payment Link | expired |
| D13 | 10-20 | company | session | **trial → paid $29** |
| D14 | 10-23 | company | session | expired |
| D15 | 10-27 | company | session, phone | expired |
| D16 | 10-28 | other | session | expired |
| D17 | 11-08 | other | session, phone | expired |
| D18 | 11-13 | company | session + timeout → Payment Link | expired |
| D19 | 11-13 | other | 2 sessions | **trial** |
| D20 | 11-14 | other | session, annual | **trial → paid $99** |
| D21 | 11-15 | company | session, annual | **trial** |
| D22 | 11-20 | company | session | expired |
| D23 | 11-25 | company | session | **trial** |
| D24 | 11-27 | company | session | **trial** |

## 3. What the evidence says about the cause

**a) Not the modal, not the offer, not the session plumbing.** From 10-02,
`pro_modal_shown.trialOffered` was true on 228 of 229 India views (84
people) and 499 of 501 default views (205 people). Plan-click rates per
modal viewer are similar: India ~10 of 84, default ~20 of 205; the 11-22
read had 11.5% vs 12.7%. India sessions start as fast as default ones
(11-22 read: median 5.7 s vs 7.0 s). Since the 20 s timeout and the warm-up
(11-20), nobody in either region has fallen back to a Payment Link.

**b) The Payment Link fallback in INR.** 2 India people were bounced to a
link in the session era (I7's first click on 10-01, I10 on 10-08), both by
the old 8 s timeout. I7 went back to sessions and paid there. I10 left.
Neither shows a decline on the link. With n = 2, INR is not the explanation,
and the link era (I1–I6, all INR) failed the same way the USD sessions did.

**c) Decline codes and 3DS share: there are none to read.** The only India
card failures in the window are I7's 3 `subscription_create` declines on
10-01. Those rows carry no decline code: the webhook's at-checkout branch
does not record one, now or then. CLAUDE.md records, from a dashboard look,
that they were 3D Secure failures. So 3 of 3 known India checkout declines
were 3DS (source: CLAUDE.md, not data). `pro_card_setup_failed` has **0 rows
ever, in any region**, against 39 trial sessions. Either no card setup ever
failed, or the endpoint is not subscribed to `setup_intent.setup_failed`.
The second is a dashboard setting CLAUDE.md says the founder must add.

**d) The off-session wall (new evidence since 11-22).** Every off-session
charge since 09-26, by price:

| Charge | Price | Result |
|---|---|---|
| I7 renewal, 11-01 | $9 IN monthly | failed, `attempt_count 0`, no retry → revoked |
| I7 day-7 trial charge, 11-24 | $9 IN monthly | failed, `attempt_count 0`, no retry → revoked within the hour |
| Default day-7 charges | $29, $99 | 2 paid (11-02, 11-21) |
| Default failed renewals / day-7 | $29 monthly, $99 annual | counted attempts 1 → 5, retries scheduled; one recovered, one gave up after 5 |

Stripe treated both India charges differently from every default one. It
never counted an attempt and never scheduled a retry, which is the shape of
a charge that waits for the customer to authenticate. That matches the rule
the 11-22 ideas file read in Stripe's India docs: an off-session charge on
an Indian card needs a registered e-mandate, or it is declined. **n = 1
card, 2 charges.** The same card paid when the buyer was present (10-01,
3DS). So:
- an India **trial** cannot turn into money as built, because the day-7
  charge is off-session;
- an India **monthly subscription** pays once, then fails at the first
  renewal;
- only an **on-session** payment has ever succeeded on an Indian card here.

The 11-24 revoke itself was the bug #355 fixed. `failedChargeState` now
calls this case `waiting`, not `gave_up`. The deployed webhook carries
`charge_state` from 11-27, so a repeat would not revoke today. It would
leave an open invoice and send a mail pointing to it. Paying that invoice
page is on-session, so it may work for India. That is untested.

**e) Why the 10 never tried a card: still unknown.** The data cannot
separate "no UPI/RuPay on the page", "debit card not enabled for
international payments" and "won't give a card for a free trial". The 11-22
read's analysis (§6–7 there) stands. The Stripe dashboard can answer it
directly. That 15-minute look (fix 1 of the 11-22 read) is still open: the
11-24 funnel read lists it as the open thread.

## 4. Is n enough?

- India trial sessions 0 of 10 (new people) vs default 9 of 20: one-sided
  Fisher p ≈ 0.012. Vs non-company default 3 of 9: p ≈ 0.087. 95% Wilson
  intervals: India 0–28%, default 26–66%, non-company default 12–65%.
- If India's true rate equalled the non-company default (21%), 0 in 13 would
  happen < 5% of the time. **3 more India trial-session clickers with no
  trial** settle "India completes below the non-company default rate". At
  this autumn's pace (~5 a month in Oct, 3 in Nov) that is about 3–4 weeks.
- The off-session finding does not get firmer with more checkout clicks. It
  needs more India **charges**, which will not happen while no India trial
  starts. Until then the Stripe docs and the dashboard (the 11-01 and 11-24
  invoices' failure reasons) are the stronger evidence.

## 5. What changes the ranking of the 11-22 fixes

The 11-22 read ranked: (1) dashboard read, (2) an India-only line before
Stripe, (3) India pays on-session, (4) a local method. The 11-24 day-7
failure moves (3) up. Fix (2) alone would turn page-leavers into trials, but
those trials then die at day 7 and the founder gets $0. Any India fix that
leaves an off-session charge in the path is capped at the first payment.

## 6. Options — FOUNDER DECISION (nothing below was built or changed)

**FOUNDER DECISION 1 · Stripe dashboard read (15 min, no code).** Covers the
11-22 read's fix 1, plus two invoices.
- For each of the 10 India sessions (10-01 → 11-24): was any setup attempt
  made, and which payment methods were on the page?
- Does the webhook endpoint list `setup_intent.setup_failed`?
- What failure reason does Stripe give on I7's 11-01 and 11-24 invoices
  (e.g. `authentication_required`, or a mandate decline)?
- *Changes:* nothing for buyers. It confirms or kills the off-session
  hypothesis (n = 1 today) and splits "never tried" from "tried and refused".

**FOUNDER DECISION 2 · India on-session only: a one-time payment (`mode:
'payment'`), no trial, no renewal.** This is M-03 in
`docs/plans/monetization-ideas-2026-11-22.md`; the amount and the term are
the founder's.
- *Changes:* the only India path with no off-session charge, so the e-mandate
  rule cannot block it. India loses the trial, which today converts to $0
  anyway.
- *Needs:* new Stripe prices; deploys of `create-checkout-session` and
  `stripe-webhook`; it changes the one-price architecture.

**FOUNDER DECISION 3 · India subscription, trial off (`checkoutTrial` off
for `region IN`).**
- *Changes:* the first charge is on-session with 3DS, the one kind that has
  worked. Renewals stay off-session: I7's 11-01 says they fail. With #355
  deployed, each failure becomes a `waiting` invoice plus a mail to pay it
  by hand.
- *Cost:* weaker than 2 — likely one month per buyer unless people pay the
  invoice every month. Money flag.

**FOUNDER DECISION 4 · Keep the India trial and let #355 handle day 7.**
- *Changes:* no code. The next India trial's day-7 charge would become
  `waiting` with an invoice-page mail instead of a revoke.
- *What it tests:* whether a mailed invoice link turns an India trial into a
  payment. n arrives at India's trial rate, which is currently 0. Cheapest,
  slowest.

**FOUNDER DECISION 5 · An India-only line before Stripe.** This is the 11-22
read's fix 2: card only, international payments on, an OTP is coming.
- *Changes:* expectations at the card field. It only pays off combined with
  2 or 3 (see §5). Money-surface copy, so the founder's go.

**FOUNDER DECISION 6 · Measurement (webhook deploy).**
- Record the failure reason on `pro_payment_failed`, both at checkout and
  off-session: the PaymentIntent's `last_payment_error.code` /
  `decline_code`.
- On `pro_checkout_expired`, record whether the session ever saw a payment
  or setup attempt.
- *Changes:* the next read can say "tried and refused (3DS / mandate)"
  instead of "no attempt on record". It touches the money path, so it is
  deployed with the founder's go.

A local method (UPI / RuPay through another provider, the 11-22 read's
fix 4) stays last. It is the only option that removes "card only", and the
most expensive.

## 7. Papercuts found on the way

- **The human-filter NULL trap** (above): `NOT (a OR b)` over `bool_or`
  flags drops every person whose `bot` flag is NULL. The scorecard and
  segment reads use `CASE WHEN` and are fine. Anyone who ports the rules into
  a `WHERE` loses pre-stamp people without noticing.
- **I7's 10-01 declines are written under a different username.** That
  username has 19 rows, all `stripe_webhook`, and no client rows ever, from
  09-21 on. They are: 10 expiries, I7's three $9 declines, a $29 renewal
  retry series (10-18 → 10-29), three status changes, and a
  `pro_access_revoked` at 10-02 05:34:31. That revoke is one second before
  one of I7's own expiries. The webhook's customer → username lookup maps at
  least one Stripe customer to a row that is not the buyer, so a
  per-username money read misses or mis-assigns these rows. **FOUNDER:**
  check in Stripe which customer(s) that username's `stripeCustomerId`
  belongs to.
- `pro_payment_failed {at_checkout}` stores no decline code, so checkout
  card friction can be counted but never explained (FOUNDER DECISION 6).
- `pro_card_setup_failed` has 0 rows ever; the endpoint subscription is
  unverified (FOUNDER DECISION 1).
- Expiry rows before 10-02 carry no `source` / `region`, and
  `pro_checkout_started` exists only from 10-06. For I8 the path is read
  from the client's `via = session` alone.

## Appendix — queries

All run read-only through the Supabase MCP on 2026-11-28.

### Q1 · Per-person path (human plan clickers, 09-26 → 11-28 12:00 UTC)

```sql
WITH params AS (SELECT timestamptz '2026-09-26 00:00+00' AS t0, timestamptz '2026-11-28 12:00+00' AS t1),
evp AS MATERIALIZED (
  SELECT e.id, e.event, e.reason, e.username, e.created_at, x.m, COALESCE(x.m->>'aid', e.username) AS pid
  FROM public.pro_events e CROSS JOIN LATERAL (SELECT (e.metadata #>> '{}')::jsonb AS m) x
  WHERE e.created_at < (SELECT t1 FROM params)
),
clk AS (SELECT DISTINCT pid FROM evp WHERE event = 'pro_plan_clicked' AND created_at >= (SELECT t0 FROM params)),
facts AS (   -- human filter: scripts/scorecard-weekly.sql base, restricted to plan clickers
  SELECT e.pid,
    bool_or(COALESCE(username, '') ~* '^(test|qa_|fabletest|linktest|internalroutine|sqlquest$|elena$)') AS f_internal,
    bool_or(m->>'aid' IN ('363dfb2bc1314757acc88c8438c4d2ea') OR m->>'aid' LIKE 'e5fcbad1a022%'
            OR (event = 'pro_modal_shown' AND m->>'reason' = 'email_link' AND created_at >= '2026-11-20' AND created_at < '2026-11-21' AND username ILIKE 'guest%' AND COALESCE(m->>'solvedCount', '0') = '0')
            OR (m->>'tz' = 'Europe/Istanbul' AND m->>'viewport' = 'mobile:375x812' AND created_at >= '2026-11-24 11:00+00' AND created_at < '2026-11-24 11:08+00')) AS f_founder,
    bool_or(COALESCE(m->>'bot', '') NOT IN ('', 'false') OR m->>'wd' = 'true' OR m->>'uaBot' = 'true') AS f_stamp,
    bool_or(m->>'viewport' IN ('tablet:800x600', 'desktop:1280x1200', 'desktop:1919x992', 'desktop:1024x1024')) AS f_viewport,
    bool_or(COALESCE(m->>'landingSrc', '') ~* '^ref:(.+\.)?aocr\.org$' OR COALESCE(m->>'arrivalSrc', '') ~* 'aocr\.org' OR m->>'arrivalSrc' = 'verify-test') AS f_ref,
    bool_or(event = 'app_opened') AS any_open, bool_or(event = 'landing_view') AS any_landing,
    (array_agg(m ORDER BY created_at) FILTER (WHERE event = 'app_opened'))[1] AS fo
  FROM evp e JOIN clk USING (pid) GROUP BY e.pid
),
human AS (   -- COALESCE: a NULL flag must not drop the person
  SELECT pid FROM facts WHERE NOT COALESCE(COALESCE(f_internal,false) OR COALESCE(f_founder,false) OR COALESCE(f_stamp,false) OR COALESCE(f_viewport,false) OR COALESCE(f_ref,false)
    OR (COALESCE(fo->>'landingSrc', '') = '' AND fo->>'langs' = '1' AND NOT any_landing)
    OR (COALESCE(fo->>'landingSrc', '') = '' AND fo->>'langs' = '1' AND fo->>'arrivalSrc' LIKE 'challenges-%')
    OR (COALESCE(fo->>'landingSrc', '') = '' AND fo->>'tz' = 'America/Los_Angeles' AND fo->>'viewport' = 'desktop:1920x1080')
    OR (fo->>'tz' = 'UTC' AND fo->>'viewport' = 'desktop:1280x720' AND NOT any_landing)
    OR (COALESCE(fo->>'landingSrc', '') = '' AND NOT any_landing AND fo->>'tz' IN ('Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Singapore'))
    OR (fo->>'langs' = '2' AND COALESCE(fo->>'landingSrc', '') = '' AND NOT any_landing), false)
),
unames AS (SELECT DISTINCT e.pid, e.username FROM evp e JOIN human USING (pid) WHERE e.username IS NOT NULL),
client AS (
  SELECT e.*, min(e.created_at) FILTER (WHERE e.event = 'pro_plan_clicked' AND e.created_at >= (SELECT t0 FROM params)) OVER (PARTITION BY e.pid) AS t_click
  FROM evp e JOIN human USING (pid)
),
server AS (   -- server + webhook rows on any username the person used, from 1 min before the first click
  SELECT u.pid, e.event, e.reason, e.created_at, e.m
  FROM evp e JOIN unames u ON u.username = e.username
  WHERE e.reason IN ('checkout_session', 'stripe_webhook')
    AND e.created_at >= (SELECT min(t_click) FROM client c WHERE c.pid = u.pid) - interval '1 minute'
),
per AS (
  SELECT c.pid, min(c.t_click) AS t_click,
    CASE WHEN bool_or(c.event = 'pro_plan_clicked' AND c.m->>'priceRegion' = 'IN') THEN 'IN' ELSE 'default' END AS region,
    string_agg(DISTINCT c.m->>'plan', '+') FILTER (WHERE c.event = 'pro_plan_clicked' AND c.created_at >= c.t_click) AS plans,
    count(*) FILTER (WHERE c.event = 'pro_plan_clicked' AND c.created_at >= c.t_click) AS n_plan,
    count(*) FILTER (WHERE c.event = 'pro_checkout_clicked' AND c.created_at >= c.t_click) AS n_cc,
    string_agg(DISTINCT c.m->>'via', '+') FILTER (WHERE c.event = 'pro_checkout_clicked' AND c.created_at >= c.t_click) AS via,
    string_agg(DISTINCT c.m->>'trial', '+') FILTER (WHERE c.event = 'pro_checkout_clicked' AND c.created_at >= c.t_click) AS cc_trial,
    (array_agg(c.m->>'trialOffered' ORDER BY c.created_at DESC) FILTER (WHERE c.event = 'pro_modal_shown' AND c.created_at <= c.t_click))[1] AS modal_trial,
    (array_agg(c.m->>'modalReason' ORDER BY c.created_at) FILTER (WHERE c.event = 'pro_plan_clicked' AND c.created_at >= c.t_click))[1] AS modal_reason,
    (array_agg(c.m->>'viewport' ORDER BY c.created_at) FILTER (WHERE c.event = 'pro_plan_clicked' AND c.created_at >= c.t_click))[1] AS vp,
    (array_agg(c.m->>'tz' ORDER BY c.created_at) FILTER (WHERE c.event = 'pro_plan_clicked' AND c.created_at >= c.t_click))[1] AS tz,
    (array_agg(c.m->>'intent' ORDER BY c.created_at) FILTER (WHERE c.event = 'pro_plan_clicked' AND c.created_at >= c.t_click))[1] AS intent,
    (array_agg(c.m->>'solvedCount' ORDER BY c.created_at) FILTER (WHERE c.event = 'pro_plan_clicked' AND c.created_at >= c.t_click))[1] AS solves,
    string_agg(DISTINCT c.m->>'reason', '+') FILTER (WHERE c.event = 'checkout_session_fallback' AND c.created_at >= c.t_click) AS fallback,
    string_agg((c.m->>'outcome') || ':' || (c.m->>'secondsAway'), ' ' ORDER BY c.created_at) FILTER (WHERE c.event = 'pro_checkout_returned' AND c.created_at >= c.t_click) AS returned,
    max(c.created_at) FILTER (WHERE c.event IN ('pro_plan_clicked','pro_checkout_clicked','checkout_session_fallback','pro_checkout_returned','pro_trial_started','pro_purchase_completed')) AS t_last_client
  FROM client c GROUP BY c.pid
),
srv AS (
  SELECT pid,
    count(*) FILTER (WHERE event = 'pro_checkout_started') AS n_sess,
    string_agg(DISTINCT (m->>'region') || '/' || (m->>'trial') || CASE WHEN jsonb_array_length(COALESCE(m->'notes','[]'::jsonb)) > 0 THEN '/' || (m->'notes')::text ELSE '' END, ' ') FILTER (WHERE event = 'pro_checkout_started') AS sess,
    count(*) FILTER (WHERE event = 'pro_checkout_session_failed') AS n_sfail,
    count(*) FILTER (WHERE event = 'pro_checkout_expired') AS n_exp,
    string_agg(DISTINCT COALESCE(m->>'source','link') || '/' || COALESCE(m->>'region','-') || '/' || COALESCE(m->>'trial','-') || '/' || COALESCE(m->>'plan_type','-'), ' ') FILTER (WHERE event = 'pro_checkout_expired') AS exp,
    count(*) FILTER (WHERE event = 'pro_payment_failed' AND m->>'billing_reason' = 'subscription_create') AS n_decl,
    count(*) FILTER (WHERE event = 'pro_card_setup_failed') AS n_setup,
    bool_or(event = 'pro_trial_started') AS trial,
    bool_or(event = 'pro_purchase_completed' AND COALESCE(m->>'after_trial','false') <> 'true') AS paid_now,
    bool_or(event = 'pro_purchase_completed' AND m->>'after_trial' = 'true') AS paid_after,
    string_agg(DISTINCT (m->>'amount_cents'), '+') FILTER (WHERE event = 'pro_purchase_completed') AS amt,
    count(*) FILTER (WHERE event = 'pro_payment_failed' AND m->>'billing_reason' = 'subscription_cycle') AS n_renew_fail,
    max(created_at) FILTER (WHERE event IN ('pro_checkout_started','pro_payment_failed','pro_trial_started','pro_purchase_completed','pro_card_setup_failed')
                         AND created_at < (SELECT min(t_click) FROM client c WHERE c.pid = server.pid) + interval '1 day') AS t_last_srv
  FROM server GROUP BY pid
)
SELECT concat_ws(' | ', p.region, to_char(p.t_click, 'MM-DD HH24:MI'), p.plans, 'plan' || p.n_plan, 'cc' || p.n_cc,
  'via=' || p.via, 'cctrial=' || p.cc_trial, 'mtrial=' || p.modal_trial, p.modal_reason, p.vp, p.tz, p.intent, 's' || p.solves,
  'fb=' || p.fallback, 'ret=' || p.returned, 'sess' || s.n_sess, s.sess, 'sfail' || s.n_sfail, 'exp' || s.n_exp, s.exp,
  'decl' || s.n_decl, 'setup' || s.n_setup, 'trial=' || s.trial, 'paid=' || s.paid_now, 'paidafter=' || s.paid_after,
  s.amt, 'renewfail' || s.n_renew_fail,
  'secs=' || round(extract(epoch FROM greatest(p.t_last_client, s.t_last_srv) - p.t_click))) AS row
FROM per p LEFT JOIN srv s USING (pid)
ORDER BY p.region DESC, p.t_click;
```

The door (company vs other) for D-rows comes from the same `facts.fo->>'arrivalSrc'`
(`company:*` = company door).

### Q2 · I7's full money timeline (identifiers stripped)

```sql
WITH p AS (
  SELECT DISTINCT COALESCE((metadata #>> '{}')::jsonb->>'aid', username) pid FROM public.pro_events
  WHERE event = 'pro_plan_clicked' AND created_at BETWEEN '2026-10-01 05:38' AND '2026-10-01 05:39'
    AND (metadata #>> '{}')::jsonb->>'priceRegion' = 'IN'
), u AS (
  SELECT DISTINCT e.username FROM public.pro_events e
  JOIN p ON COALESCE((e.metadata #>> '{}')::jsonb->>'aid', e.username) = p.pid WHERE e.username IS NOT NULL
)
SELECT to_char(e.created_at, 'MM-DD HH24:MI:SS') t, e.event, e.reason,
  ((e.metadata #>> '{}')::jsonb - 'invoice_id' - 'stripe_subscription_id' - 'stripe_session_id' - 'stripe_customer_id'
     - 'aid' - 'email' - 'recovery_url' - 'arrivalSrc' - 'landingSrc' - 'tz' - 'viewport') m
FROM public.pro_events e
WHERE (e.username IN (SELECT username FROM u) AND e.reason IN ('stripe_webhook', 'checkout_session'))
   OR (e.created_at BETWEEN '2026-10-01 05:30' AND '2026-10-01 07:00' AND e.event LIKE 'pro_%' AND e.reason = 'stripe_webhook')
ORDER BY e.created_at;
```

### Q3 · Every money row since the regional price, by amount (India = 900 / 3900 cents)

```sql
SELECT event, m->>'amount_cents' amt_paid, m->>'amount_due_cents' amt_due, m->>'billing_reason' br,
       m->>'after_trial' after_trial, m->>'attempt_count' att, m->>'will_retry' retry, m->>'charge_state' cs,
       count(*) n, count(DISTINCT username) u, min(created_at)::date first, max(created_at)::date last
FROM (SELECT event, username, created_at, (metadata #>> '{}')::jsonb m FROM public.pro_events
      WHERE reason = 'stripe_webhook' AND created_at >= '2026-09-26'
        AND event IN ('pro_purchase_completed', 'pro_payment_failed', 'pro_access_revoked')) x
WHERE COALESCE(username, '') !~* '^(test|qa_|fabletest|linktest|internalroutine|sqlquest$|elena$)'
GROUP BY 1,2,3,4,5,6,7,8 ORDER BY 1,2,3;
```

### Q4 · Trial offered at the modal, by price region (from 10-02)

```sql
SELECT m->>'priceRegion' region, m->>'trialOffered' trial_offered, count(*) shows,
       count(DISTINCT COALESCE(m->>'aid', username)) people
FROM (SELECT username, (metadata #>> '{}')::jsonb m FROM public.pro_events
      WHERE event = 'pro_modal_shown' AND created_at >= '2026-10-02' AND created_at < '2026-11-28 12:00+00'
        AND COALESCE(username, '') !~* '^(test|qa_|fabletest|linktest|internalroutine|sqlquest$|elena$)') x
GROUP BY 1,2 ORDER BY 1,2;
```

### Q5 · Session outcome by region (server sessions, joined to the webhook by session id)

```sql
WITH s AS (
  SELECT username, created_at, (metadata #>> '{}')::jsonb m FROM public.pro_events
  WHERE event = 'pro_checkout_started' AND created_at < '2026-11-28 12:00+00'
    AND COALESCE(username, '') !~* '^(test|qa_|fabletest|linktest|internalroutine|sqlquest$|elena$)'
), w AS (
  SELECT event, (metadata #>> '{}')::jsonb m FROM public.pro_events
  WHERE reason = 'stripe_webhook' AND event IN ('pro_trial_started', 'pro_purchase_completed', 'pro_checkout_expired')
    AND created_at >= '2026-10-06'
)
SELECT s.m->>'region' region, s.m->>'trial' trial, count(*) sessions, count(DISTINCT s.username) users,
  count(*) FILTER (WHERE EXISTS (SELECT 1 FROM w WHERE w.event = 'pro_checkout_expired' AND w.m->>'stripe_session_id' = s.m->>'session_id')) expired,
  count(*) FILTER (WHERE EXISTS (SELECT 1 FROM w WHERE w.event IN ('pro_trial_started', 'pro_purchase_completed') AND w.m->>'stripe_session_id' = s.m->>'session_id')) completed
FROM s GROUP BY 1,2 ORDER BY 1,2;
```

### Q6 · Card-failure rows, all time

```sql
SELECT event, created_at, username IS NOT NULL has_user,
  (metadata #>> '{}')::jsonb - 'invoice_id' - 'stripe_subscription_id' - 'stripe_customer_id' AS m
FROM public.pro_events
WHERE event IN ('pro_card_setup_failed', 'pro_payment_failed', 'pro_checkout_session_failed')
ORDER BY created_at;
```

### Statistics

Fisher one-sided = hypergeometric P(0 India successes). India 0/10 vs
default 9/20: `C(21,10)/C(30,10)` = 0.0117. Vs non-company default 3/9:
`C(16,10)/C(19,10)` = 0.0867. The run length for 21% is the smallest n with
0.79^n < 0.05, which is 13.
