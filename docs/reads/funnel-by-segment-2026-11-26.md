# Funnel by segment — is 1.2% open → plan a traffic problem or a product problem? (B1 extra, 2026-11-26)

The founder's question: of ~4,250 people who opened a challenge in 90 days,
only 52 clicked a plan (~1.2%). Are most visitors learners who will never
buy (traffic), or does the product lose the buyers too (product)?

Read-only: production `pro_events` and `users` through the read-only
Supabase MCP. No code, flag or data changed. Aggregates only; the payers
are P1…P16, with no username, email or aid in this file.

## Verdict (5 lines)

1. **The denominator is 2,099 people, not ~4,250.** 5,609 browsers opened a challenge in the 90 days; 3,510 of them are crawlers or internal accounts, and they account for 2 of the 52 plan clickers (1 internal, 1 `app1lang`). For humans, 40 of 2,099 clicked a plan after their first open (1.9%), and 12 started a trial or paid (0.57%).
2. **Per 100 interview-target openers** (they arrived from a company page, a `?company=` link or the readiness test; n = 302), 55 run a query, 49 solve, 26 see a price, 3.6 click a plan and **2.0 start a trial or pay**. **Per 100 of everyone else** (n = 1,797), 57 run, 51 solve, 22 see a price, 1.6 click and **0.33 pay**.
3. **The loss before the price is the same in both groups**, so that part is product. About 45% open a challenge and never run a query, about half never solve one, and about three in four never see a price. Arriving to buy does not get anyone through this stretch any better.
4. **After the price, interview-target people convert at a materially different rate.** Modal → plan is 14% against 7% (p ≈ 0.03), and openers → trial or paid is about 6× (2.0 against 0.35 per 100, Fisher p ≈ 0.004). They are 15% of openers and 7 of the 12 payers. Interview people outside India convert after a plan click (5 of 10). Interview people on the India price never did (0 of 8).
5. **Answer: both, and they multiply.** The low average is mostly traffic mix: 85% of openers are not interview-target, and they almost never pay. But the largest loss inside the buying group is product: 3 of 4 interview-target openers leave before they see a price. More company-door traffic and a better open → run → solve stretch each multiply the same 2%. Neither fix replaces the other.

## How it was read

- **Window:** first `challenge_opened` from 2026-08-28 00:00 to 2026-11-26
  00:00 UTC (90 days). Every later step counts **at or after that first open**
  and before the window ends, so the last weeks' cohorts have less time to
  convert. That understates the money step a little, the same way in every
  segment.
- **Person** = `coalesce(meta->>'aid', username)`; metadata read as
  `(metadata #>> '{}')::jsonb`. Every client row in the window carries `aid`.
- **Humans only:** the exclusion block of `scripts/scorecard-weekly.sql`
  (PR #387, still open). The same rules are in the appendix base, reformatted and with `MATERIALIZED` added. One row
  marks the whole browser: internal usernames, the founder's walks and tests,
  `bot`/`wd`/`uaBot`, the four crawler viewports, `aocr.org`/`verify-test`,
  `app1lang`, `topic1lang`, `prestamp_fp`, `utc1280`, `cn_app`, `langs2`.
  The landing-only rules (including `google_ua`) cannot match someone who
  opened a challenge.
- **Steps:** ran = `challenge_first_run` **or** `challenge_solved` (the
  first-run event exists only from 2026-09-23, and a solve implies a run);
  first solve; 6 solves = 6 distinct challenges solved (lifetime);
  `pro_modal_shown`; `pro_plan_clicked`; `pro_checkout_clicked`; trial or
  purchase = `reason = 'stripe_webhook'` rows only, bridged to the person as
  described in §2.
- **Money attribution:** each webhook username is credited to **one** cohort
  person, the one whose first open came first. Without that rule, accounts
  used on two browsers were counted twice (14 instead of 12).

### The segments, precisely

A person goes in the first segment whose test they pass.

| Segment | Signals used (any row of the person up to the window end, plus `users.data` through any username the browser carried) |
|---|---|
| **A — interview with a target** (company or date) | `arrivalSrc` is a company page (`*-sql-interview`), a `company:<Name>` link (`?company=`), `blog-capital-one` or `readiness`; `intent_captured` carrying a `company`; `company_direct_assigned`; any `readiness_*` event; `interview_started` on a company mock (not `General`); a `pro_modal_shown` reason that only a company view or a company mock link produces (`company_set`, `company_hard`, `company_set_complete`, `company_modal`, `mock_link`); a `pro_modal_shown` with `daysOut`; `users.data.prepTarget.company` or `.date` |
| **B — interview, no target** | `intent = 'interview'` on any row (`intent_captured` or the intent stamped on every app event); any `interview_started`; arrival from `sql-interview-prep`, `analyst-interview` or `blog-faang`; a `pattern_mock` or `interview_locked` modal; `users.data.intent = 'interview'` |
| **C1 — job-ready** | latest stated intent `job_ready` (row or `users.data`) |
| **C2 — learning** | latest stated intent `learning` |
| **C3 — unknown / other** | none of the above (`hired` is in here, n ≈ 1) |

**Two versions:**
- **Entry** (A / B / C): only signals present at or before the first open
  (+60 s): the arrival door, a `?company=` intent, readiness, an intent
  already stored. This version is **fair for every step**, because it is
  fixed before the person does anything.
- **Ever** (A / B / C1 / C2 / C3) uses every signal. Use it **only from the
  modal on.** The app asks for intent after the first solve, so B, C1 and
  C2 are selected on having solved: their run and solve rates read 90–99%
  by construction. C3 is largely the people who left before anyone asked.

**Dates do not exist as a signal.** `prep_target_set` has 0 rows in 90 days,
`pro_modal_shown.daysOut` is never set, and `users.data.prepTarget.date`
is set on 7 accounts in all of `users`. Segment A is therefore almost
entirely "named a company", and "with a date" cannot be read separately.

## 1. The 90-day funnel

### Raw vs human (Query 0)

| | Opened a challenge | …and clicked a plan in the window | Plan clickers |
|---|---|---|---|
| raw | 5,609 | 46 | 52 |
| **human** | **2,099** | **44** | **50** |
| filtered: `viewport` | 1,221 | 0 | 0 |
| `utc1280` | 846 | 0 | 0 |
| `cn_app` | 538 | 0 | 0 |
| `app1lang` | 487 | 1 | 1 |
| `prestamp_fp` | 161 | 0 | 0 |
| `bot_stamp` | 137 | 0 | 0 |
| `langs2` | 114 | 0 | 0 |
| founder / internal / `topic1lang` | 3 / 2 / 1 | 0 / 1 / 0 | 0 / 1 / 0 |

Below, the plan step counts 40 of the 44: four people clicked a plan before
their first challenge open in the window (for example, from a company
page's mock link).

### By segment, entry version: fair at every step (Query 1)

| Entry segment | Opened | Ran | Solved | 6 solves | Saw modal | Plan click | Checkout click | Trial | Paid | **Trial or paid** |
|---|---|---|---|---|---|---|---|---|---|---|
| **A** (target at entry) | 302 | 165 | 147 | 51 | 77 | 11 | 10 | 5 | 3 | **6** |
| **B** (interview at entry) | 74 | 59 | 58 | 25 | 23 | 3 | 3 | 0 | 0 | **0** |
| **C** (everyone else) | 1,723 | 972 | 862 | 348 | 381 | 26 | 24 | 5 | 3 | **6** |
| **All** | **2,099** | **1,196** | **1,067** | **424** | **481** | **40** | **37** | **10** | **6** | **12** |

**Per 100 openers:**

| Entry segment | Ran | Solved | 6 solves | Saw modal | Plan | Checkout | **Trial / paid** (95% CI) | Modal → plan |
|---|---|---|---|---|---|---|---|---|
| A | 54.6 | 48.7 | 16.9 | 25.5 | 3.6 | 3.3 | **2.0** (0.9–4.3) | 14.3% |
| B (n = 74) | 79.7 | 78.4 | 33.8 | 31.1 | 4.1 | 4.1 | 0 (0–4.9) | 13.0% |
| C | 56.4 | 50.0 | 20.2 | 22.1 | 1.5 | 1.4 | **0.35** (0.16–0.76) | 6.8% |
| All | 57.0 | 50.8 | 20.2 | 22.9 | 1.9 | 1.8 | 0.57 (0.33–1.0) | 8.3% |

Fisher exact, one-sided, A vs C: trial or paid p = 0.004; plan click
p = 0.015; modal → plan p = 0.03. Open → ran is **55% vs 56%**: no
difference at all.

**Where each group loses its people (entry, per 100):**

| Leak | A | C |
|---|---|---|
| open → never run | **45** | **44** |
| ran → never solve | 6 | 6 |
| solved but never saw a price | 23\* | 28\* |
| saw a price → no plan click | 22 | 21 |
| plan click → no trial or paid | 1.6 | 1.2 |

\*Modals also fire before a solve (company set wall at 3 solves, pricing
link, cold start), so "saw a price" is not strictly a subset of "solved".
This row is solved minus saw-modal, as an order of magnitude.

So 74 of every 100 interview-target openers never get to a price, against 78
of everyone else. The two groups only separate once a price is
on screen.

### By segment, ever version: read from the modal on (Query 1)

| Ever segment | Opened | Ran | Solved | 6 solves | Saw modal | Plan | Checkout | Trial | Paid | **Trial or paid** | Modal → plan | Modal → trial/paid |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **A** interview + target | 314 | 173 | 155 | 55 | 83 | 12 | 11 | 6 | 3 | **7** | 14.5% | **8.4%** |
| **B** interview, no target | 280 | 256 | 252 | 125 | 138 | 13 | 12 | 0 | 0 | **0** | 9.4% | 0% |
| **C1** job-ready | 213 | 211 | 211 | 98 | 101 | 7 | 7 | 3 | 1 | **3** | 6.9% | 3.0% |
| **C2** learning | 204 | 203 | 202 | 79 | 82 | 4 | 3 | 0 | 0 | **0** | 4.9% | 0% |
| **C3** unknown | 1,088 | 353 | 247 | 67 | 77 | 4 | 4 | 1 | 2 | **2** | 5.2% | 2.6% |

- **Learners really do not buy**: C2 is 0 of 82 who saw a price. That is
  the "traffic" half of the answer, and it is real.
- **B is an outlier: interview intent, clicks plans at 9.4%, and 0
  conversions.** Query 5 explains most of it. Of the 24 plan clickers with an
  interview intent, 8 were on the India price and none of them converted;
  in the default region 5 of 10 did. Across all intents, India-priced plan
  clickers converted 1 in 17 and default-region clickers 10 in 25. B is
  where the India checkout problem (`docs/reads/funnel-2026-11-24.md` §3)
  lands.
- **C3 (1,088, 52% of openers) is mostly people who left before anyone
  asked them anything**: 32% ran and 23% solved. Their intent is unknown
  because they left, not because they are learners.

### By arrival door (Query 1)

The door is the `arrivalSrc` / `landingSrc` on the person's first
`challenge_opened` in the window. AI = `landingSrc` `ai:*` or
`utm:copilot.com`, and it takes precedence. Company = a company page or a
`?company=` link. Exercises/topic = `/sql-exercises/`, `/challenges/*`,
`/questions/*` and trap pages.

| Door | Opened | Ran | Solved | 6 solves | Saw modal | Plan | Trial/paid | Per 100: ran / modal / plan / **trial-paid** | Modal → plan |
|---|---|---|---|---|---|---|---|---|---|
| **company** | 284 | 155 | 140 | 48 | 74 | 10 | **6** | 55 / 26 / 3.5 / **2.1** | 13.5% |
| exercises/topic | 1,114 | 634 | 558 | 238 | 252 | 16 | 3 | 57 / 23 / 1.4 / 0.27 | 6.3% |
| other | 354 | 202 | 180 | 69 | 82 | 9 | 2 | 57 / 23 / 2.5 / 0.56 | 11.0% |
| homepage | 249 | 159 | 150 | 60 | 60 | 4 | 1 | 64 / 24 / 1.6 / 0.40 | 6.7% |
| AI (chatgpt, gemini, perplexity, copilot, meta.ai…) | 98 | 46 | 39 | 9 | 13 | 1 | 0 | 47 / 13 / 1.0 / 0 | (n = 13) |

- The company door is 14% of human openers and produced half of the
  paying people (6 of 12). Per opener, it pays about 8× the
  exercises/topic door, which is the largest door (53% of openers).
- Open → run is the same across doors (55–64%), apart from AI arrivals
  (47%). The leak before the price does not depend on the door either.
- Entry segment × door (Query 1, group 5): entry-A is almost entirely the
  company door (284 of 302), and entry-C on the exercises/topic door is
  1,087 openers → 3 trial or paid.

## 2. The join: linking trials and payments back to the first open (Queries 2 and 4)

**The money rows.** Webhook rows, internal usernames out, all time: 10
`pro_purchase_completed` rows on 9 usernames, and 10 `pro_trial_started` rows
on 10 usernames. That is 16 usernames in all (3 started a trial and later
paid), and **15 people**, because one person bought on a second account
(P10 + P12). (The brief said "10 purchasers / 20 trial starters"; the
webhook has 20 money rows in all, on 9 paying usernames and 10 trial
usernames.) In
the 90-day window: P4–P16, i.e. **13 usernames and 12 people**.

**The bridge, best available:**
1. Every client row carries both `aid` and `username`. The buyer's account
   username appears on their own client rows (`same_username`), which links
   14 of the 16 usernames.
2. `signup_completed.newUsername` with the row's `aid` links the guest
   browser that registered (12 of 16, all of them also linked by 1).
3. `guest_progress_merged.account` (7 rows in 90 days) linked **none** of
   them.
4. `users.data` has no aid. It was used only for segment signals.

**Result: 12 of the 12 people with a trial or payment in the window (13 of 13
usernames) link back to a first challenge open in the window**, all human.
One payer's username also has a second browser flagged `app1lang`; the
browser that opened was human. All time, 14 of 16 usernames link. P1 and P2
paid in July, before `aid` existed (P2 is still traceable by username to a
`company:Amazon` arrival).

### The paths (90-day window; P3 paid on 2026-08-23, before it)

| P | First money | Kind | Door at first arrival | Segment (ever / entry) | First modal (reason @ solves) | Modal at the buying click | Solves at that click | Days, first open → money | Active days before |
|---|---|---|---|---|---|---|---|---|---|
| P4 | 09-01 | paid, monthly | homepage (mobile) | C3 / C | milestone_solves @ 6 | no plan-click row | — | 0.0 | 1 |
| P5 | 09-19 | paid, annual | `company:Stripe` | A / A | milestone_solves @ 6 | not stamped (pre-09-25) | 26 | 13.5 | 9 |
| P6 | 10-01 | trial → paid, monthly | /sql-exercises/ (Bing) | C1 / C | milestone_solves @ 6 | generic | 10 | 3.5 | 2 |
| P7 | 10-06 | trial, monthly | /sql-exercises/ (DuckDuckGo) | C1 / C | milestone_solves @ 6 | free_quota | 10 | 5.9 | 4 |
| P8 | 10-11 | trial → paid, monthly | `company:Snowflake` (Google) | A / A | milestone_solves @ 6 | generic | 6 | 1.1 | 3 |
| P9 | 10-12 | trial, monthly | `company:Revolut` (Google) | A / A | company_set_complete @ 3 | free_quota | 10 | 1.5 | 4 |
| P10 = P12 | 10-20 trial, 11-02 paid on a second account | trial, then paid, monthly | `company:Amazon` (Google) | A / A | company_set @ 3 | company_set | 3 | 11.1 (trial) | 4–5 |
| P11 | 10-30 | trial, annual | no source (mobile) | C1 / C | milestone_solves @ 6 | milestone_solves | 10 | 0.8 | 2 |
| P13 | 11-14 | trial, monthly | /sql-exercises/ | A (named Capital One later) / C | milestone_solves @ 6 | free_quota | 10 | 0.1 | 2 |
| P14 | 11-14 | trial → paid, annual | sql-tutorial, from meta.ai | C3 / C | pricing_link @ 0 | pricing_link | 0 | 0.0 | 1 |
| P15 | 11-15 | trial, annual | `company:Meta` (Google) | A / A | milestone_solves @ 6 | company_hard | 9 | 3.7 | 2 |
| P16 | 11-25 | trial, monthly | `company:Stripe` (Google) | A / A | milestone_solves @ 6 | milestone_solves | 6 | 1.0 | 2 |

- **Fast deciders.** The median from first open to first money is **1.3
  days**; 9 of 12 decided within 4 days, over 1–4 active days. The two slow
  ones (P5, P10/12) are company-door people who came back many times.
- **They had practised.** 10 of 12 bought at 6 or more solves (five of them at
  10, the free-quota wall). The exceptions are P10/12, at the 3-question
  company-set wall, and P14, who came from an AI assistant and went to
  pricing with 0 solves.
- **Buying modal:** free_quota 3, generic 2, milestone_solves 2,
  company_set 1, company_hard 1, pricing_link 1, unstamped 2. Nine of the
  twelve first saw the price at the 6-solve milestone modal. It was the
  buying modal for only two of them (P11, P16), plus P4, who paid the same
  day with no plan-click row.
- **Doors:** company 6, /sql-exercises/ 3, homepage 1, AI 1, no source 1.
  P14's AI referrer is stamped `ref:l.meta.ai`, not `ai:*`, so the door
  table in §1 puts P14 under "other". The AI door's 0 there is a stamping
  gap, not proof that AI arrivals do not pay.
  Segment (ever): A 7, C1 job-ready 3, C3 unknown 2, **B 0, C2 learning 0**.

## 3. Plan-click rate per modal reason, within each segment (Query 3)

People shown that modal reason at or after their first open, and those of
them with a `pro_plan_clicked` carrying the same `modalReason`. ⚠ = fewer
than 10 people shown (do not read the rate).

| Modal reason | A shown → clicked | B | C1 | C2 | C3 | **All** |
|---|---|---|---|---|---|---|
| **milestone_solves** (6 solves) | 49 → 4 (8%) | 117 → 2 (1.7%) | 98 → 2 (2.0%) | 76 → 0 | 65 → 0 | **405 → 8 (2.0%)** |
| **free_quota** (10-solve wall) | 16 → 2 (12.5%) | 43 → 6 (14.0%) | 33 → 5 (15.2%) | 30 → 3 (10.0%) | 27 → 3 (11.1%) | **149 → 19 (12.8%)** |
| company_set (company wall at 3) | 25 → 2 (8%) | — | — | — | — | 25 → 2 (8%) |
| generic | 4 → 2 ⚠ | 13 → 1 (7.7%) | 10 → 1 (10%) | 6 → 0 ⚠ | 7 → 1 ⚠ | 40 → 5 (12.5%) |
| company_hard | 10 → 1 (10%) | — | — | — | — | 10 → 1 |
| interview_locked | 6 → 1 ⚠ | 7 → 1 ⚠ | — | — | — | 13 → 2 ⚠ (n per cell < 10) |
| company_set_complete | 4 → 0 ⚠ | — | — | — | — | 4 → 0 ⚠ |
| cold_start_anyway | 2 → 1 ⚠ | 1 → 0 ⚠ | 1 → 0 ⚠ | — | 3 → 0 ⚠ | 7 → 1 ⚠ |
| milestone_streak, hard_challenge, header, rate_limit, pattern_mock, coach_path, pricing_link | all ⚠ (1–5 each); clicks only on hard_challenge (B 1/3) and pricing_link (C3 1/1) | | | | | |
| **any modal → any plan click** | **83 → 12 (14.5%)** | **138 → 13 (9.4%)** | **101 → 7 (6.9%)** | **82 → 4 (4.9%)** | **77 → 4 (5.2%)** | **481 → 40 (8.3%)** |

- **The 6-solve milestone modal is where most people first meet the price,
  and it converts 2% of them** (8 of 405). It does a little better for
  interview-target people (8%) and close to nothing for anyone else. **At
  the 10-solve free-quota wall, 13% click**, and here the segments hardly
  differ (10–15%). That is not causal: a person at the wall has chosen to
  solve ten. It does say the first price sight is early for anyone who is
  not already shopping.
- Plan clicks do not always carry the reason of the modal on screen (some
  rows predate `modalReason`, 2026-09-25). The per-reason columns can sum
  to more or less than the "any" row.

## What this does and does not say

- **It does not say "the traffic is the problem, stop fixing the product."**
  The buying segment loses 45 of every 100 people before their first run, the
  same as learners. A runnable first screen (`runnableStarter`,
  `companyDirectOpen`, both live on that cell) is worth about as much per
  company-door visitor as anything after the modal.
- **It does say the company door is the money door**: 14% of openers, half
  the payers, 6× per opener (n = 6 vs 6, and the 95% intervals do not
  overlap). More people through it (C1 search, company pages) is
  the traffic lever, and it is sound.
- **Learners (stated `learning`) bought nothing in 90 days** (0 of 82 who
  saw a price, 4 plan clicks). Job-ready people bought a little (3 of 101).
  Treat a learner's high activation as a cost of the free tier, not as
  pipeline.
- **Interview people on the India price are the one place where the buying
  segment clicks and then does not pay** (0 of 8). That is a B4/FOUNDER
  item (checkout in India), not a funnel-copy item.
- **Small numbers.** Every money cell is 0–7 people. The A vs C difference
  passes a one-sided Fisher test (p = 0.004), but the A rate's 95% interval
  is 0.9–4.3 per 100. Read the direction, not the decimal.

## Papercuts found on the way

- **The human-filter base times out without `SET enable_nestloop = off`.**
  The CTE row estimates are 1–200 for ~20k people and 150k rows, so the
  planner nests `person × evp` (about 3·10⁹ row visits) and hits the 2-minute
  `statement_timeout`. All queries below start with that `SET`.
  `scripts/scorecard-weekly.sql` (PR #387) will hit the same wall as soon as
  someone joins events back to `person`.
- `scripts/scorecard-weekly.sql`, which the fleet README and recent reads
  cite as the filter, is **not on `main`** (it is only on PR #387's branch).
- `pro_checkout_clicked` metadata carries an **`email`** key (77 rows in 90
  days): personal data in the analytics table that every read touches.
- Some rows carry `intent = 'cancel'` (seen on 3 payers' browsers). It is not
  one of the intent values the docs list; it looks like a cancel answer being
  stored as an intent.

## Appendix: every query

All queries run as-is in the Supabase MCP `execute_sql` (read-only).
Queries 0, 1, 3 and 4 share one base; it is printed once, and each query is
`base + its tail`. Query 0 uses the base only up to `person`.

### Base (human filter + cohort + segments + steps)

```sql
-- Run with: SET enable_nestloop = off;  (the CTE row estimates are 1-200, so the planner
-- otherwise nests person x evp and times out)
WITH params AS (
  SELECT timestamptz '2026-11-26 00:00+00' AS t,      -- window end (exclusive)
         timestamptz '2026-08-28 00:00+00' AS t0      -- 90 days before
),
-- ---- human filter: scripts/scorecard-weekly.sql (PR #387) base, unchanged ----
evp AS MATERIALIZED (
  SELECT e.event, e.reason, e.username, e.created_at, x.m,
         COALESCE(x.m->>'aid', e.username) AS pid
  FROM public.pro_events e
  CROSS JOIN LATERAL (SELECT (e.metadata #>> '{}')::jsonb AS m) x
  WHERE e.created_at <= (SELECT t FROM params)
),
facts AS (
  SELECT pid,
    bool_or(COALESCE(username, '') ~* '^(test|qa_|fabletest|linktest|internalroutine|sqlquest$|elena$)') AS f_internal,
    bool_or(m->>'aid' IN ('363dfb2bc1314757acc88c8438c4d2ea')
            OR m->>'aid' LIKE 'e5fcbad1a022%'
            OR (event = 'pro_modal_shown' AND m->>'reason' = 'email_link'
                AND created_at >= '2026-11-20' AND created_at < '2026-11-21'
                AND username ILIKE 'guest%' AND COALESCE(m->>'solvedCount', '0') = '0')
            OR (m->>'tz' = 'Europe/Istanbul' AND m->>'viewport' = 'mobile:375x812'
                AND created_at >= '2026-11-24 11:00+00' AND created_at < '2026-11-24 11:08+00')) AS f_founder,
    bool_or(COALESCE(m->>'bot', '') NOT IN ('', 'false') OR m->>'wd' = 'true' OR m->>'uaBot' = 'true') AS f_stamp,
    bool_or(m->>'viewport' IN ('tablet:800x600', 'desktop:1280x1200', 'desktop:1919x992', 'desktop:1024x1024')) AS f_viewport,
    bool_or(COALESCE(m->>'landingSrc', '') ~* '^ref:(.+\.)?aocr\.org$' OR COALESCE(m->>'arrivalSrc', '') ~* 'aocr\.org' OR m->>'arrivalSrc' = 'verify-test') AS f_ref,
    bool_or(event = 'app_opened') AS any_open,
    bool_or(event = 'landing_view') AS any_landing,
    bool_or(event = 'landing_view' AND m->>'tz' = 'UTC' AND created_at >= '2026-11-22') AS utc_landing,
    bool_or(reason = 'landing' AND m->>'tz' = 'Asia/Shanghai') AS cn_landing,
    bool_or(event = 'app_opened' AND m->>'langs' = '2' AND COALESCE(m->>'landingSrc', '') = '') AS langs2_open,
    bool_or(event = 'landing_view' AND m->>'ua' ~ '(GoogleOther|Google-NotebookLM)') AS google_ua,
    bool_or(event = 'landing_view' AND m->>'ua' ~ 'Google-NotebookLM') AS notebooklm,
    (array_agg(m ORDER BY created_at) FILTER (WHERE event = 'app_opened'))[1] AS fo
  FROM evp WHERE pid IS NOT NULL GROUP BY pid
),
person AS MATERIALIZED (   -- excl IS NULL = human
  SELECT pid, CASE
    WHEN f_internal THEN 'internal' WHEN f_founder THEN 'founder' WHEN f_stamp THEN 'bot_stamp'
    WHEN f_viewport THEN 'viewport' WHEN f_ref THEN 'ref_spam'
    WHEN COALESCE(fo->>'landingSrc', '') = '' AND fo->>'langs' = '1' AND NOT any_landing THEN 'app1lang'
    WHEN COALESCE(fo->>'landingSrc', '') = '' AND fo->>'langs' = '1' AND fo->>'arrivalSrc' LIKE 'challenges-%' THEN 'topic1lang'
    WHEN COALESCE(fo->>'landingSrc', '') = '' AND fo->>'tz' = 'America/Los_Angeles' AND fo->>'viewport' = 'desktop:1920x1080' THEN 'prestamp_fp'
    WHEN fo->>'tz' = 'UTC' AND fo->>'viewport' = 'desktop:1280x720' AND NOT any_landing THEN 'utc1280'
    WHEN COALESCE(fo->>'landingSrc', '') = '' AND NOT any_landing AND fo->>'tz' IN ('Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Singapore') THEN 'cn_app'
    WHEN utc_landing AND NOT any_open THEN 'utc_landing'
    WHEN cn_landing AND NOT any_open THEN 'cn_reader'
    WHEN google_ua AND NOT any_open AND notebooklm THEN 'google_ua:notebooklm'
    WHEN google_ua AND NOT any_open THEN 'google_ua'
    WHEN langs2_open AND NOT any_landing THEN 'langs2'
  END AS excl
  FROM facts
),
-- ---- the cohort: human people with >= 1 challenge_opened in the window ----
op AS MATERIALIZED (   -- first challenge open in the window, and the door it came through
  SELECT DISTINCT ON (e.pid) e.pid, e.created_at AS t_open,
         e.m->>'arrivalSrc' AS arr, COALESCE(e.m->>'landingSrc', '') AS lsrc
  FROM evp e JOIN person p ON p.pid = e.pid AND p.excl IS NULL
  WHERE e.event = 'challenge_opened'
    AND e.created_at >= (SELECT t0 FROM params) AND e.created_at < (SELECT t FROM params)
  ORDER BY e.pid, e.created_at
),
clean AS MATERIALIZED (   -- every row of a cohort member up to the window end, with t_open
  SELECT e.*, op.t_open FROM evp e JOIN op USING (pid) WHERE e.created_at < (SELECT t FROM params)
),
door AS (
  SELECT pid, CASE
    WHEN lsrc ~ '^ai:' OR lsrc = 'utm:copilot.com'                                  THEN 'ai'
    WHEN arr ~ '-sql-interview$' OR arr ~ '^company:' OR arr = 'blog-capital-one'   THEN 'company'
    WHEN arr ~ '^(sql-exercises|challenges-|question-|pattern-)'                    THEN 'exercises_topic'
    WHEN arr = 'home'                                                               THEN 'homepage'
    ELSE 'other' END AS door
  FROM op
),
unames AS MATERIALIZED (   -- every username the person's rows carried (guest and account): the bridge
  SELECT DISTINCT pid, username FROM clean WHERE username IS NOT NULL
),
udata AS (   -- users.data, through any of those usernames
  SELECT u.pid,
    bool_or(COALESCE(us.data->'prepTarget'->>'company', '') <> '') AS pt_company,
    bool_or(COALESCE(us.data->'prepTarget'->>'date', '') <> '')    AS pt_date,
    bool_or(us.data->>'intent' = 'interview')                      AS u_interview,
    max(us.data->>'intent')                                        AS u_intent
  FROM unames u JOIN public.users us ON us.username = u.username GROUP BY u.pid
),
sig AS (   -- *_ever: any row to the window end; *_entry: at or before the first open + 60 s
  SELECT pid,
    bool_or(  m->>'arrivalSrc' ~ '-sql-interview$' OR m->>'arrivalSrc' ~ '^company:'
           OR m->>'arrivalSrc' IN ('blog-capital-one', 'readiness')
           OR (event = 'intent_captured' AND COALESCE(m->>'company', '') <> '')
           OR event IN ('company_direct_assigned', 'readiness_arrived', 'readiness_started',
                        'readiness_completed', 'readiness_plan_clicked')
           OR (event = 'interview_started' AND COALESCE(m->>'company', 'General') NOT IN ('General', ''))
           OR (event = 'pro_modal_shown' AND m->>'reason' IN
                 ('company_set', 'company_hard', 'company_set_complete', 'company_modal', 'mock_link'))
           OR (event = 'pro_modal_shown' AND COALESCE(m->>'daysOut', 'null') <> 'null')) AS co_ever,
    bool_or(created_at <= t_open + interval '60 seconds' AND (
              m->>'arrivalSrc' ~ '-sql-interview$' OR m->>'arrivalSrc' ~ '^company:'
           OR m->>'arrivalSrc' IN ('blog-capital-one', 'readiness')
           OR (event = 'intent_captured' AND COALESCE(m->>'company', '') <> '')
           OR event IN ('company_direct_assigned', 'readiness_arrived', 'readiness_started',
                        'readiness_completed', 'readiness_plan_clicked')))           AS co_entry,
    bool_or(  m->>'intent' = 'interview' OR event = 'interview_started'
           OR m->>'arrivalSrc' IN ('sql-interview-prep', 'analyst-interview', 'blog-faang')
           OR (event = 'pro_modal_shown' AND m->>'reason' IN ('pattern_mock', 'interview_locked'))) AS iv_ever,
    bool_or(created_at <= t_open + interval '60 seconds' AND (
              m->>'intent' = 'interview'
           OR m->>'arrivalSrc' IN ('sql-interview-prep', 'analyst-interview', 'blog-faang')))  AS iv_entry,
    (array_agg(m->>'intent' ORDER BY created_at DESC)
        FILTER (WHERE m->>'intent' IN ('job_ready', 'learning', 'hired')))[1]        AS other_intent
  FROM clean GROUP BY pid
),
seg AS (
  SELECT op.pid,
    CASE WHEN s.co_ever OR COALESCE(ud.pt_company OR ud.pt_date, false) THEN 'A_interview_target'
         WHEN s.iv_ever OR COALESCE(ud.u_interview, false)               THEN 'B_interview_no_target'
         WHEN COALESCE(s.other_intent, ud.u_intent) = 'job_ready'        THEN 'C1_job_ready'
         WHEN COALESCE(s.other_intent, ud.u_intent) = 'learning'         THEN 'C2_learning'
         ELSE 'C3_unknown_other' END AS seg_ever,
    CASE WHEN s.co_entry THEN 'A' WHEN s.iv_entry THEN 'B' ELSE 'C' END AS seg_entry
  FROM op LEFT JOIN sig s USING (pid) LEFT JOIN udata ud USING (pid)
),
solved AS (SELECT pid, m->>'challengeId' AS cid, min(created_at) AS at FROM clean
           WHERE event = 'challenge_solved' AND m->>'challengeId' IS NOT NULL GROUP BY 1, 2),
solve6 AS (SELECT pid, (array_agg(at ORDER BY at))[6] AS at6 FROM solved GROUP BY pid),
money_u AS (   -- each webhook username credited to ONE cohort person: the one whose first open came first
  SELECT u.username, u.pid,
         row_number() OVER (PARTITION BY u.username ORDER BY op.t_open) AS rn
  FROM unames u JOIN op USING (pid)
  WHERE u.username IN (SELECT username FROM public.pro_events WHERE reason = 'stripe_webhook')
),
money AS (   -- stripe_webhook is the only money truth; keyed by username, bridged through unames
  SELECT mu.pid,
    min(e.created_at) FILTER (WHERE e.event = 'pro_trial_started')      AS t_trial,
    min(e.created_at) FILTER (WHERE e.event = 'pro_purchase_completed') AS t_paid
  FROM money_u mu JOIN public.pro_events e ON e.username = mu.username AND e.reason = 'stripe_webhook'
  WHERE mu.rn = 1 AND e.created_at < (SELECT t FROM params)
    AND COALESCE(e.username, '') !~* '^(test|qa_|fabletest|linktest|internalroutine|sqlquest$|elena$)'
  GROUP BY mu.pid
),
steps AS (   -- each step at or after the first open in the window
  SELECT pid,
    -- challenge_first_run exists from 2026-09-23; a solve implies a run, so ran = either
    bool_or(event IN ('challenge_first_run', 'challenge_solved') AND created_at >= t_open) AS ran,
    bool_or(event = 'challenge_solved'     AND created_at >= t_open) AS solved1,
    bool_or(event = 'pro_modal_shown'      AND created_at >= t_open) AS modal,
    bool_or(event = 'pro_plan_clicked'     AND created_at >= t_open) AS plan,
    bool_or(event = 'pro_checkout_clicked' AND created_at >= t_open) AS checkout
  FROM clean GROUP BY pid
),
f AS (
  SELECT op.pid, op.t_open, seg.seg_ever, seg.seg_entry, d.door,
    COALESCE(st.ran, false) ran, COALESCE(st.solved1, false) solved1, COALESCE(st.modal, false) modal,
    COALESCE(st.plan, false) plan, COALESCE(st.checkout, false) checkout,
    (s6.at6 IS NOT NULL) AS six,
    COALESCE(mo.t_trial >= op.t_open - interval '1 day', false) AS trial,
    COALESCE(mo.t_paid  >= op.t_open - interval '1 day', false) AS paid
  FROM op JOIN seg USING (pid) JOIN door d USING (pid) LEFT JOIN steps st USING (pid)
  LEFT JOIN solve6 s6 USING (pid) LEFT JOIN money mo USING (pid)
)
```

### Query 0: raw vs human openers and plan clickers (base up to `person`, then)

```sql
raw_op AS (   -- every person (raw) with a challenge_opened or a plan click in the window
  SELECT e.pid, p.excl, bool_or(e.event = 'pro_plan_clicked') AS pc, bool_or(e.event = 'challenge_opened') AS co
  FROM evp e JOIN person p USING (pid)
  WHERE e.created_at >= (SELECT t0 FROM params) AND e.created_at < (SELECT t FROM params)
    AND e.event IN ('challenge_opened', 'pro_plan_clicked')
  GROUP BY 1, 2
)
SELECT COALESCE(excl, 'HUMAN') AS excl, count(*) FILTER (WHERE co) AS openers,
       count(*) FILTER (WHERE co AND pc) AS open_and_plan, count(*) FILTER (WHERE pc) AS plan_clickers
FROM raw_op GROUP BY ROLLUP (COALESCE(excl, 'HUMAN')) ORDER BY 2 DESC;
```

### Query 1: the funnel by segment, door and entry segment × door (base +)

```sql
-- Query 1: the funnel by segment (ever / entry), by door, and segment x door
SELECT g, k, count(*) AS opened,
  count(*) FILTER (WHERE ran) AS ran, count(*) FILTER (WHERE solved1) AS solved1,
  count(*) FILTER (WHERE six) AS six, count(*) FILTER (WHERE modal) AS modal,
  count(*) FILTER (WHERE plan) AS plan, count(*) FILTER (WHERE checkout) AS checkout,
  count(*) FILTER (WHERE trial) AS trial, count(*) FILTER (WHERE paid) AS paid,
  count(*) FILTER (WHERE trial OR paid) AS trial_or_paid
FROM (SELECT f.*, x.g, x.k FROM f CROSS JOIN LATERAL (VALUES
        ('1 all', 'all'), ('2 ever', seg_ever), ('3 entry', seg_entry), ('4 door', door),
        ('5 entry_x_door', seg_entry || ' | ' || door)) x(g, k)) z
GROUP BY g, k ORDER BY g, k;
```

### Query 2: the bridge and the payer paths (standalone)

```sql
-- Query 2: the bridge. Every stripe_webhook trial / purchase username (all time, internal out),
-- linked to browser ids (aid) through (a) any client row with that username, (b) signup_completed
-- newUsername, (c) guest_progress_merged account; then every row those aids wrote (guest
-- names included). Output is anonymised: P1..Pn by first money event, no username, no aid.
SET enable_nestloop = off;
WITH ev AS MATERIALIZED (
  SELECT e.event, e.reason, e.username, e.created_at, (e.metadata #>> '{}')::jsonb AS m
  FROM public.pro_events e
),
money AS (
  SELECT username,
    min(created_at) FILTER (WHERE event = 'pro_trial_started')      AS t_trial,
    min(created_at) FILTER (WHERE event = 'pro_purchase_completed') AS t_paid,
    bool_or(event = 'pro_purchase_completed' AND m->>'after_trial' = 'true') AS paid_after_trial,
    max(m->>'plan_type') AS plan_type
  FROM ev WHERE reason = 'stripe_webhook' AND event IN ('pro_trial_started', 'pro_purchase_completed')
    AND COALESCE(username, '') !~* '^(test|qa_|fabletest|linktest|internalroutine|sqlquest$|elena$)'
  GROUP BY username
),
link AS (   -- (money username, aid, how)
  SELECT mo.username AS mu, e.m->>'aid' AS aid, 'same_username' AS how
  FROM money mo JOIN ev e ON e.username = mo.username WHERE e.m->>'aid' IS NOT NULL
  UNION
  SELECT mo.username, e.m->>'aid', 'signup_completed'
  FROM money mo JOIN ev e ON e.event = 'signup_completed' AND e.m->>'newUsername' = mo.username
  WHERE e.m->>'aid' IS NOT NULL
  UNION
  SELECT mo.username, e.m->>'aid', 'guest_merge'
  FROM money mo JOIN ev e ON e.event = 'guest_progress_merged' AND e.m->>'account' = mo.username
  WHERE e.m->>'aid' IS NOT NULL
),
rows_ AS MATERIALIZED (  -- every row written by any linked aid, or by the money username itself
  SELECT DISTINCT l.mu, e.event, e.reason, e.created_at, e.m
  FROM (SELECT DISTINCT mu, aid FROM link) l JOIN ev e ON e.m->>'aid' = l.aid
  UNION
  SELECT mo.username, e.event, e.reason, e.created_at, e.m
  FROM money mo JOIN ev e ON e.username = mo.username AND e.reason <> 'stripe_webhook'
),
per AS (
  SELECT mo.username, mo.t_trial, mo.t_paid, mo.paid_after_trial, mo.plan_type,
    (SELECT count(DISTINCT aid) FROM link l WHERE l.mu = mo.username)                AS aids,
    (SELECT string_agg(DISTINCT how, '+') FROM link l WHERE l.mu = mo.username)       AS bridge,
    (SELECT min(created_at) FROM rows_ r WHERE r.mu = mo.username)                     AS t_first_row,
    (SELECT min(created_at) FROM rows_ r WHERE r.mu = mo.username AND event = 'challenge_opened') AS t_first_open,
    (SELECT r.m->>'arrivalSrc' FROM rows_ r WHERE r.mu = mo.username AND event IN ('app_opened', 'challenge_opened')
       ORDER BY created_at LIMIT 1)                                                    AS first_arrival,
    (SELECT r.m->>'landingSrc' FROM rows_ r WHERE r.mu = mo.username AND event IN ('app_opened', 'challenge_opened')
       ORDER BY created_at LIMIT 1)                                                    AS first_landing,
    (SELECT r.m->>'viewport' FROM rows_ r WHERE r.mu = mo.username AND event IN ('app_opened', 'challenge_opened')
       ORDER BY created_at LIMIT 1)                                                    AS first_vp,
    (SELECT min(created_at) FROM rows_ r WHERE r.mu = mo.username AND event = 'pro_modal_shown') AS t_first_modal,
    (SELECT r.m->>'reason' FROM rows_ r WHERE r.mu = mo.username AND event = 'pro_modal_shown'
       ORDER BY created_at LIMIT 1)                                                    AS first_modal_reason,
    (SELECT r.m->>'solvedCount' FROM rows_ r WHERE r.mu = mo.username AND event = 'pro_modal_shown'
       ORDER BY created_at LIMIT 1)                                                    AS solves_at_first_modal,
    (SELECT r.m->>'modalReason' FROM rows_ r WHERE r.mu = mo.username AND event IN ('pro_plan_clicked', 'pro_checkout_clicked')
       AND r.created_at <= COALESCE(LEAST(mo.t_trial, mo.t_paid), now()) ORDER BY created_at DESC LIMIT 1) AS buy_modal_reason,
    (SELECT r.m->>'solvedCount' FROM rows_ r WHERE r.mu = mo.username AND event IN ('pro_plan_clicked', 'pro_checkout_clicked')
       AND r.created_at <= COALESCE(LEAST(mo.t_trial, mo.t_paid), now()) ORDER BY created_at DESC LIMIT 1) AS solves_at_buy_click,
    (SELECT count(*) FROM rows_ r WHERE r.mu = mo.username AND event = 'pro_modal_shown'
       AND r.created_at <= COALESCE(LEAST(mo.t_trial, mo.t_paid), now()))              AS modals_before_money,
    (SELECT string_agg(DISTINCT r.m->>'intent', ',') FROM rows_ r WHERE r.mu = mo.username AND r.m->>'intent' IS NOT NULL) AS intents,
    (SELECT string_agg(DISTINCT r.m->>'company', ',') FROM rows_ r WHERE r.mu = mo.username
       AND COALESCE(r.m->>'company', '') NOT IN ('', 'General'))                        AS companies_named,
    (SELECT count(DISTINCT date_trunc('day', created_at)) FROM rows_ r WHERE r.mu = mo.username
       AND created_at <= COALESCE(LEAST(mo.t_trial, mo.t_paid), now()) AND reason <> 'landing') AS active_days_before
  FROM money mo
)
SELECT 'P' || row_number() OVER (ORDER BY LEAST(t_trial, t_paid)) AS p,
  to_char(LEAST(t_trial, t_paid), 'YYYY-MM-DD') AS first_money,
  CASE WHEN t_trial IS NOT NULL AND t_paid IS NOT NULL THEN 'trial→paid'
       WHEN t_trial IS NOT NULL THEN 'trial' ELSE 'paid' END AS kind,
  plan_type, aids, bridge,
  to_char(t_first_row, 'YYYY-MM-DD') AS first_row, to_char(t_first_open, 'YYYY-MM-DD') AS first_open,
  first_arrival, first_landing, first_vp,
  round(extract(epoch FROM LEAST(t_trial, t_paid) - t_first_open) / 86400.0, 1) AS days_open_to_money,
  first_modal_reason, solves_at_first_modal, buy_modal_reason, solves_at_buy_click,
  modals_before_money, intents, companies_named, active_days_before
FROM per ORDER BY LEAST(t_trial, t_paid);
```

### Query 3: plan-click rate per modal reason × segment (base +)

```sql
-- Query 3: plan-click rate per pro_modal_shown reason within each segment. A person counts once
-- per reason shown at or after the first open; "clicked" = a pro_plan_clicked whose modalReason
-- is that reason. The (any) row: shown any modal / any plan click, whatever its modalReason.
, mr AS (SELECT pid, m->>'reason' AS reason FROM clean
         WHERE event = 'pro_modal_shown' AND created_at >= t_open GROUP BY 1, 2),
pc AS (SELECT pid, m->>'modalReason' AS reason FROM clean
       WHERE event = 'pro_plan_clicked' AND created_at >= t_open GROUP BY 1, 2),
q3 AS (
  SELECT COALESCE(f.seg_ever, 'ALL') AS segment, COALESCE(mr.reason, '(any)') AS reason,
         count(DISTINCT mr.pid) AS shown_people, count(DISTINCT pc.pid) AS clicked_people
  FROM mr JOIN f USING (pid) LEFT JOIN pc ON pc.pid = mr.pid AND pc.reason = mr.reason
  GROUP BY ROLLUP (f.seg_ever, mr.reason)
),
anyclick AS (
  SELECT f.seg_ever, count(DISTINCT mr.pid) AS shown, count(DISTINCT p2.pid) AS clicked
  FROM mr JOIN f USING (pid) LEFT JOIN (SELECT DISTINCT pid FROM pc) p2 ON p2.pid = mr.pid
  GROUP BY ROLLUP (f.seg_ever)
)
SELECT q3.segment, q3.reason, q3.shown_people,
       CASE WHEN q3.reason = '(any)' THEN a.clicked ELSE q3.clicked_people END AS plan_clicked_people
FROM q3 LEFT JOIN anyclick a ON q3.reason = '(any)' AND COALESCE(a.seg_ever, 'ALL') = q3.segment
ORDER BY 1, 3 DESC;
```

### Query 4: payers' place in the cohort (base +)

```sql
-- Query 4: where each webhook trialist / payer sits in the cohort (labels P1..Pn match Query 2)
, lab AS (
  SELECT username, 'P' || row_number() OVER (ORDER BY min(created_at)) AS p
  FROM public.pro_events
  WHERE reason = 'stripe_webhook' AND event IN ('pro_trial_started', 'pro_purchase_completed')
    AND COALESCE(username, '') !~* '^(test|qa_|fabletest|linktest|internalroutine|sqlquest$|elena$)'
  GROUP BY username
)
SELECT lab.p, (mu.pid IS NOT NULL) AS in_cohort, f.seg_ever, f.seg_entry, f.door,
       f.ran, f.solved1, f.six, f.modal, f.plan, f.checkout, f.trial, f.paid,
       (SELECT count(DISTINCT u2.pid) FROM unames u2 WHERE u2.username = lab.username) AS cohort_pids_on_username,
       (SELECT count(DISTINCT lab2.p) FROM money_u m2 JOIN lab lab2 ON lab2.username = m2.username
         WHERE m2.pid = mu.pid AND m2.rn = 1)                                         AS usernames_on_same_person,
       (SELECT string_agg(DISTINCT COALESCE(p.excl, 'human'), ',') FROM evp e JOIN person p USING (pid)
         WHERE e.username = lab.username)                                             AS filter_status_of_linked_rows
FROM lab LEFT JOIN money_u mu ON mu.username = lab.username AND mu.rn = 1
LEFT JOIN f ON f.pid = mu.pid
ORDER BY length(lab.p), lab.p;
```

### Query 5: plan clickers by intent and price region (standalone)

```sql
-- Query 5: every plan clicker in the window (internal usernames out, no crawler filter: a plan
-- click is a human act — 2 of 52 raw clickers are filtered by the full rule), by the intent and
-- price region on the click, and whether any username their browser carried got a webhook
-- trial or purchase.
SET enable_nestloop = off;
WITH ev AS MATERIALIZED (SELECT username, event, reason, created_at, (metadata #>> '{}')::jsonb m FROM public.pro_events),
pc AS (
  SELECT COALESCE(m->>'aid', username) pid, m->>'intent' intent, COALESCE(m->>'priceRegion', '(none)') region, m->>'viewport' vp
  FROM ev WHERE event = 'pro_plan_clicked' AND created_at >= '2026-08-28' AND created_at < '2026-11-26'
    AND COALESCE(username, '') !~* '^(test|qa_|fabletest|linktest|internalroutine|sqlquest$|elena$)'
),
pids AS (SELECT DISTINCT pid FROM pc),
un AS (SELECT DISTINCT p.pid, e.username FROM pids p JOIN ev e ON COALESCE(e.m->>'aid', e.username) = p.pid WHERE e.username IS NOT NULL),
mon AS (SELECT DISTINCT un.pid FROM un JOIN ev w ON w.username = un.username AND w.reason = 'stripe_webhook'
        AND w.event IN ('pro_trial_started', 'pro_purchase_completed')),
per AS (SELECT pid, max(intent) intent, max(region) region, bool_or(vp LIKE 'mobile%') mobile FROM pc GROUP BY pid)
SELECT COALESCE(intent, '(none)') intent, region, count(*) people, count(mon.pid) money_people, count(*) FILTER (WHERE mobile) mobile
FROM per LEFT JOIN mon USING (pid) GROUP BY 1, 2 ORDER BY 1, 2;
```
