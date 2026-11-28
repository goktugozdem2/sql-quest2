# Who our customers are, what they want, where they stop — segment profiles (B1, 2026-11-28)

The founder, 2026-11-28: "optimize the funnel — we need to understand every
customer type: what is their purpose, what is their target, where do they
stop." This read answers that for each canonical segment
(`src/utils/segment.js`, PR #439) over 90 days of first opens, and ranks
one lever per segment by the trials and payments it could add each month.

Read-only: production `pro_events` and `users` through the read-only
Supabase MCP. No code, flag or data changed. Aggregates only; no username,
email or aid appears in this file.

## Verdict (6 lines)

1. **2,855 humans opened the app for the first time in the 90 days; 13 started a trial or paid (0.46 per 100, 95% CI 0.27–0.78).** The last 30 days brought 621, a 44% lower pace than the 60 days before (1,117 a month), but the company-door share rose from 15% to 25%.
2. **Mix (ever):** unknown 59%, interview_company 17%, learner 8%, job_ready 8%, interview_general 8%, interview_dated **0** (nobody has a future interview date), at_work 1 person. **interview_company is 17% of people and 8 of the 13 trials/payments** (1.6 per 100 vs 0.06 for unknown).
3. **Two different places to stop.** unknown and interview_company lose most people *before the first Run* (80 and 65 of every 100); company arrivals on a phone ran a query 2 times in 74. The people who told us a goal (interview_general, job_ready, learner) nearly all solve, come back within 7 days 37–44% of the time, and stop *at the price*: 90–97% of those who see it do not click a plan.
4. **Targets:** company people name Revolut (96), Wise (87), Snowflake (76) most, but Amazon, Stripe and Meta convert better (4 of 59 vs 3 of 259; directional). Nobody gives a date. Job-hunters without a company are 53–60% on Indian time, and their 14 India-price plan clicks became 1 trial (all 17 company plan clicks were on the default price: 8 trials/payments).
5. **At the 10-solve wall** (144 people): 51% left with nothing, 35% came back on a later day, 21% took the free path (nearly all to the daily), 12.5% clicked a plan, 5 started a trial or paid.
6. **Levers:** the company open → run and 1 → 3 leaks are already under test (`companyDirectOpen`, `runnableStarter`, `mobileRunBar`, tournament B/D from 12-12), so no new test there. The uncovered money is the India checkout (≈ +0.5–1.0 trials/payers a month, **founder decision**), more company-page traffic (≈ +0.8 per +50 company openers), and a company-specific price moment at 6 solves (≈ +0.4, money copy, founder's go). Learners need no test slot.

## How it was read

- **Cohort:** humans whose **first-ever** `app_opened` or `challenge_opened`
  fell in 2026-08-30 00:00 → 2026-11-28 00:00 UTC (90 days). This differs
  from #409, which took the first `challenge_opened` *inside* its window;
  here everyone is new, and "opened" means opened the app (2,064 of the
  2,855 opened a question). Every later step counts at or after the first
  open and before the window end.
- **Person** = `coalesce(meta->>'aid', username)`, metadata read as
  `(metadata #>> '{}')::jsonb`. **Humans only:** the exclusion block of
  `scripts/scorecard-weekly.sql` as `scripts/segment-mix-baseline.sql` uses
  it (internal, founder walks incl. `a2a2%`, bot stamps, crawler viewports,
  ref spam, `app1lang`, `topic1lang`, `prestamp_fp`, `utc1280`, `cn_app`,
  `langs2`), written as a CASE so a missing first `app_opened` never
  excludes. All queries start with `SET enable_nestloop = off`.
- **Segment, two versions** (the #409 split):
  - **Ever** = `segmentOf`'s rules in its order, re-derived exactly as
    `scripts/segment-mix-baseline.sql` does (latest stated intent on any row
    or `users.data.intent`; `prepTarget` date ≥ 2026-11-28 / company from
    `users.data`; company doors, `intent_captured.company`,
    `company_direct_assigned`, company mocks; readiness; Coach goal from
    `users.data` and `goal_selected`), on every signal up to the window end.
    **Read it from the price on only:** the app asks for intent after the
    first solve, so interview_general, job_ready and learner are selected on
    having solved (their run and solve rates read 95–98% by construction),
    and unknown is mostly the people who left before anyone asked.
  - **Entry** = the same rules on what was known by the first open + 60 s
    (the door, an intent already on the row, a `?company=` intent, readiness).
    `users.data` and dates do not exist then. **Fair at every step**, but it
    only separates interview_company from everyone else; the three
    intent-at-entry segments have n = 30–34.
- **Steps:** ran = `challenge_first_run` or `challenge_solved`; 1 / 3 / 6
  solves = distinct `challengeId` solved; **wall** = `content_lock_reached
  {wall: free_quota}` or `pro_modal_shown {reason: free_quota}`; price =
  `pro_modal_shown`; plan = `pro_plan_clicked`; checkout =
  `pro_checkout_clicked`; **trial or paid** = `stripe_webhook` rows only,
  each webhook username credited to one cohort person (the earliest first
  open), the #409 rule; **return 7 d** = any non-landing, non-webhook event
  on a later UTC day than the first open and within 7 days (the scorecard's
  `returned_7d` rule), over people with 7 full days (first open before
  11-21; n shown as "base").
- **Price region:** `priceRegion` on the plan click (`IN` vs default) for
  the money split; `tz` Asia/Kolkata or Asia/Calcutta on the first open as
  the "India tz" share for everyone (most never see a price).
- **Per month at today's traffic** = the last 30 days of first opens (621).
- 95% intervals are Wilson. A rate on fewer than 30 people is "not readable".

## 1. The segments: size and the funnel

### The mix (ever / entry)

| Segment | Ever n | Ever share | Ever n, last 30 d | Entry n | Entry n, last 30 d |
|---|---|---|---|---|---|
| unknown | 1,691 | 59.2% | 347 | 2,283 | 437 |
| interview_company | 486 | 17.0% | 158 | 474 | 154 |
| learner | 228 | 8.0% | 40 | 34 | 10 |
| job_ready | 226 | 7.9% | 38 | 30 | 9 |
| interview_general | 223 | 7.8% | 38 | 34 | 11 |
| interview_dated | **0** | 0% | 0 | — (no date at entry) | — |
| at_work | 1 | 0.04% | 0 | 0 | 0 |
| **all** | **2,855** | | **621** | 2,855 | 621 |

The last-30-day ever counts of the three asked segments are low partly
because recent people have had less time to solve and be asked.

### Entry version — fair at every step (Query 1), per 100 openers

| Entry segment | n | Ran | 1 solve | 3 solves | 6 solves | Wall | Saw price | Plan | Checkout | **Trial / paid** (95% CI) [count] | Return 7 d (base) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **interview_company** | 474 | 34.6 | 30.8 | 18.4 | 9.7 | 2.1 | 18.6 | 2.7 | 2.5 | **1.48** (0.72–3.0) [7] | 16.8% (13.6–20.6; 434) |
| **unknown** (everyone else) | 2,283 | 40.1 | 35.2 | 23.7 | 13.6 | 5.0 | 16.6 | 1.3 | 1.2 | **0.22** (0.09–0.51) [5] | 18.7% (17.1–20.4; 2,168) |
| interview_general | 34 | 94.1 | 91.2 | 50.0 | 38.2 | 14.7 | 38.2 | 8.8 | 8.8 | 0 (0–10) [0] | 7 of 31 |
| learner | 34 | 91.2 | 88.2 | 50.0 | 20.6 | 14.7 | 38.2 | 5.9 | 5.9 | 2.9 (0.5–15) [1] | 5 of 32 |
| job_ready | 30 | 90.0 | 86.7 | 56.7 | 30.0 | 30.0 | 46.7 | 0 | 0 | 0 (0–11) [0] | 10 of 27 |
| **all** | **2,855** | **41.0** | **36.3** | **23.8** | **13.5** | **5.0** | **17.7** | **1.6** | **1.5** | **0.46** (0.27–0.78) [13] | **18.6%** (17.2–20.1; 2,692) |

The three intent-at-entry rows (n 30–34) are **not readable**; they are
shown for completeness.

- Fixed at the door, company arrivals reach a run *less* often than everyone
  else (34.6 vs 40.1 per 100) and return a little less (16.8% vs 18.7%), yet
  pay 7× as often (1.48 vs 0.22 per 100). Same shape as #409 (A 2.0 vs C
  0.35), on a cohort of new people only.
- The gap at Run is phones and the list landing: company arrivals on a phone
  ran 2 of 73 (3%, 1–9); on desktop 162 of 399 (41%).

### Ever version — read from the price on (Query 1), per 100

| Ever segment | n | Ran | 1 solve | 3 solves | 6 solves | Wall | Saw price | Plan | Checkout | **Trial / paid** (95% CI) [count] | Price → plan | Return 7 d (base) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **interview_company** | 486 | 35.0 | 31.3 | 18.9 | 10.3 | 2.5 | 19.5 | 3.5 | 3.1 | **1.65** (0.84–3.2) [8] | 17.9% (11.5–26.8) | 17.8% (14.5–21.6; 445) |
| interview_general | 223 | 97.8 | 97.3 | 67.7 | 46.2 | 13.5 | 50.2 | 4.9 | 4.5 | 0.90 (0.25–3.2) [2] | 9.8% (5.6–16.7) | 36.7% (30.6–43.3; 218) |
| job_ready | 226 | 96.0 | 95.1 | 71.2 | 42.0 | 18.1 | 48.7 | 4.4 | 4.4 | 0.88 (0.24–3.2) [2] | 9.1% (5.0–15.9) | 44.4% (38.0–51.1; 216) |
| learner | 228 | 95.2 | 94.7 | 67.5 | 36.4 | 16.2 | 43.4 | 1.3 | 1.3 | **0** (0–1.7) [0] | 3.0% (1.0–8.5) | 39.2% (33.0–45.7; 222) |
| unknown | 1,691 | 20.5 | 14.0 | 7.1 | 3.1 | 1.4 | 5.3 | 0.3 | 0.3 | 0.06 (0.01–0.33) [1] | 5.6% (n 89) | 9.9% (8.6–11.5; 1,590) |
| interview_dated | 0 | — | — | — | — | — | — | — | — | not readable | — | — |
| at_work | 1 | — | — | — | — | — | — | — | — | not readable | — | — |

Plan click → trial or paid, by segment (Query 3b): interview_company **8 of
17** (47%, 26–69), job_ready 2 of 10, unknown 1 of 5, interview_general **0
of 11**, learner 0 of 3. Two interview_general trials came with no plan-click
row in the window (as P4 in #409).

## 2. The profiles

Shares below are of the segment's own n (ever version, Query 2). "Leak"
is people lost between two steps per 100 of the segment, so leaks of
different steps compare directly.

### interview_company — preparing for a named company (n 486; 158 a month now)

**Purpose.** They came for one company's interview. 457 (94%) arrived on a
company page or a `?company=` link (315 from Google, 101 with no referrer,
29 from Bing), 13 from an AI assistant. Stated intent: `interview` 335
(69%), none 142 (29%: they left before the ask), learning 5, other 4. A
Coach goal is almost never set (13, 2.7%).

**Target.**
- **Companies** (top 8): Revolut 96, Wise 87, Snowflake 76, Capital One 27,
  Amazon 22, Stripe 19, Meta 18, Google 16 (then JPMorgan 13, Apple 12).
  Per company the money is 0–2 people, so only directional: Amazon, Stripe
  and Meta together are 59 people → 4 trials/payments (6.8 per 100, 2.7–16.2)
  and 7 plan clicks; Revolut, Wise and Snowflake are 259 → 3 (1.2, 0.4–3.3).
  Capital One 27 → 1.
- **Deadline:** 1 person ever set a date (15–30 days out, now past). Not
  readable; this is why interview_dated is empty.
- **Level:** 472 of 486 skip placement (the company door goes straight to
  questions); 10 placed Advanced.
- **Device:** phone 74 (15%), the highest phone share of any segment.
- **Region:** India tz 109 (22%), the lowest. Every one of the 17 plan
  clicks was on the default price.

**Where they stop** (per 100): opened 100 → **ran 35** → 1 solve 31 → 3
solves 19 → 6 solves 10 → saw a price 20 → plan 3.5 → checkout 3.1 →
**trial or paid 1.65**. Return in 7 days: 17.8%.
- **Biggest leak: open → first run, 65 per 100.** 37 never opened a
  question (app opened, landed on the company list, left) and 28 opened
  one and never pressed Run. On a phone: 72 arrivals before 11-23, 30
  opened a question, **2 ran**. On desktop before 11-23: 39.5% ran
  (34.7–44.6, n 372); from 11-23, when `companyDirectOpen` went 50/50:
  15 of 27 (56%, 37–72), directional only.
- **Second: saw a price and did not click a plan, 16 per 100** (78 of 95).
  The price they met first was the 6-solve milestone modal for 45 of the
  95, and it converted 3 of 48 (6%, 2–17). The company-set wall converted 3
  of 26 (12%), the quota wall 2 of 12, `mock_link` 0 of 7. Once they click,
  they pay: 8 of 17.
- First solve → 3 solves loses 12 per 100 (40% of solvers stop before 3).

**What they use** (share of the 486): company-set signal 19% (a lower
bound — see papercuts), tutor (inline help) 9.5%, lesson 1 9.3%, hints
8.8%, mock 4.7%, Coach action 3.7%, daily 2.7%.

**After the wall:** 12 met the 10-solve wall; 6 came back on a later day, 1
took a free path, 2 clicked a plan, 2 paid. Not readable at n 12.

### interview_general — interview prep, no company, no date (n 223; ~38 a month)

**Purpose.** "Preparing for an interview" said after the first solve (202,
91%), or the SQL Interview Prep Coach goal (29). Doors: /sql-exercises/ 103
(46%; 61 Bing, 16 other search, 11 Google), topic/question/trap pages 39,
homepage 35, other 22, AI 14, readiness test 2.

**Target.** No company named by 3 or more; no dates. Placement: Advanced
77, Intermediate 8, Foundations 1, none 137. Desktop 96% (phone 8). **India
tz 60%** (133), the highest of any segment; of the 56 whose price modal
carried a region (stamped from 09-26), 34 saw the India price.

**Where they stop** (per 100, selected on solving): 1 solve 97 → 3 solves
68 → 6 solves 46 → saw a price 50 → plan 4.9 → checkout 4.5 → trial or
paid 0.9. Return in 7 days 36.7%.
- **Biggest leak: saw a price and did not click, 45 per 100** (101 of 112).
  The 6-solve milestone modal converted 2 of 103 (1.9%, 0.5–6.8); the
  10-solve quota wall 5 of 30 (17%, 7–34).
- **Second: first solve → 3 solves, 30 per 100** (66 of 217).
- And the clicks did not pay: **0 of 11 plan clickers**, 8 of them on the
  India price (0 of 8, 0–32%).

**What they use:** lesson 1 31%, tutor 30%, hints 26%, Coach action 19%,
mock 12.6% (the highest mock use of any segment), daily 7.6%.

**After the wall** (30): came back on a later day 14 (47%, 30–64), free path
7 (23%), plan click 5 (17%), trial or paid 1, left with nothing 11 (37%).

### job_ready — getting ready for an analyst job (n 226; ~38 a month)

**Purpose.** "Getting job-ready" (219, 97%); Analyst Day-One goal for 15.
Doors: /sql-exercises/ 114 (50%; 58 Bing), topic pages 29, homepage 29,
other 24, AI 13.

**Target.** No companies, no dates. Placement: Advanced 97, Intermediate 7,
Foundations 4, none 118. Desktop 93%. India tz 53% (120); 6 of 10 plan
clickers on the India price.

**Where they stop:** 1 solve 95 → 3 solves 71 → 6 solves 42 → saw a price
49 → plan 4.4 → trial or paid 0.9. Return in 7 days **44.4%**, the highest.
- **Biggest leak: saw a price, no plan click, 44 per 100** (100 of 110).
  Milestone modal 3 of 104 (2.9%, 1.0–8.1); quota wall 6 of 41 (15%, 7–28).
- **Second: 3 → 6 solves, 29 per 100** (66 of 161).
- Plan → trial or paid: 1 of 6 on the India price, 1 of 4 on the default.

**What they use:** lesson 1 33%, tutor 33%, hints 33%, Coach action 17%,
daily 16%, mock 6.6%.

**After the wall** (41): came back 15 (37%, 24–52), free path 7 (17%), plan
6 (15%), trial or paid 2, left 21 (51%, 36–66).

### learner — learning SQL (n 228; ~40 a month)

**Purpose.** "Learning SQL" (214, 94%); Fundamentals goal for 27. Doors:
/sql-exercises/ 103 (45%), homepage 46 (20%), other 29, topic pages 26.

**Target.** No companies, no dates. Placement Advanced 83, Intermediate 8.
Desktop 94%. India tz 37%.

**Where they stop:** 1 solve 95 → 3 solves 68 → 6 solves 36 → saw a price
43 → plan 1.3 → **trial or paid 0** (0 of 99 who saw a price, 0–4%).
Return in 7 days 39.2%.
- **Biggest leak: saw a price, no plan click, 42 per 100** (96 of 99).
- **Second: 3 → 6 solves, 31 per 100.**
- The same as #409 (0 of 82): learners do not buy.

**What they use:** the most of everything free — lesson 1 39%, tutor 35%,
hints 36%, Coach action 20%, daily 13%.

**After the wall** (37): came back 12 (32%), free path 9 (24%, the highest),
plan 3, paid 0, left 20 (54%).

### unknown — never told us (n 1,691; ~347 a month)

**Purpose.** 1,527 (90%) have no stated intent because they left before
the question (it comes after the first solve); 164 answered "just
exploring". Doors: /sql-exercises/ 645 (38%; Bing 324), topic/question/trap
pages 381 (23%), homepage 220, other 197, no source 144, **AI 84** (ChatGPT
54, Gemini 17, Copilot 7), blog 20.

**Target.** No companies or dates (7 have a Capital One signal from a mock
or wall, not a canonical company signal). 81% never placed. Phone 12%.
India tz 42%.

**Where they stop:** opened 100 → **ran 20.5** → 1 solve 14 → 3 solves 7 →
6 solves 3 → saw a price 5.3 → plan 0.3 → trial or paid 0.06 (1 person).
Return in 7 days 9.9%.
- **Biggest leak: open → first run, 80 per 100**: 35 never opened a
  question, 44 opened one and never ran. Phones: 209 → 16 ran. AI
  arrivals: 84 → 8 ran.
- **Second: solved once and stopped before 3 (6.9 per 100)**, about level
  with ran-but-never-solved (6.6).

**What they use:** almost nothing past the first screen: hints 8%, lesson 1
7%, tutor 5%, mock 1.2%, Coach action 0.5%.

**After the wall** (23, not readable): 17 left, 5 took the free path.

### interview_dated (n 0) and at_work (n 1)

- **interview_dated: n = 0.** No cohort member has a `prepTarget.date`
  today or later; 2 have any date (both past). `pro_modal_shown.daysOut`
  is set for nobody. Not readable. Arm D's 14-day sprint writes
  `userData.sprint`, not `prepTarget.date` (tournament plan §4), so this
  segment will stay empty after 12-12 unless people type a date.
- **at_work: n = 1** (said "hired"). Not readable.

## 3. Cross-cutting findings

### The India price clicks and does not pay (founder decision)

| Plan clickers (on the click's `priceRegion`) | People | Checkout | Trial or paid |
|---|---|---|---|
| India price | 16 | 16 | **1** (6%, 1–28) |
| Default price, interview_company | 17 | 15 | **8** (47%, 26–69) |
| Default price, everyone else | 14 | 13 | **3** (21%, 8–48) |

- India-price clickers are interview_general 8, job_ready 6, learner 2.
  Every one of them reached checkout; 1 came back with a trial.
- Part of the old "1 in 17 vs 10 in 25" gap (#409 Q5) is mix: the company
  people, who convert best, are almost never on the India price. Against
  non-company default clickers the gap is 6% vs 21%, and the intervals
  overlap. Direction consistent across two reads; size not settled.
- **Founder decision** (B4 / checkout in India); nothing in this read
  changes a price or a money flag.

### The 6-solve milestone is where most people first see a price, and it converts least

| First / any price moment | interview_company | interview_general | job_ready | learner | unknown |
|---|---|---|---|---|---|
| milestone_solves (6) shown → plan | 48 → 3 (6%) | 103 → 2 (2%) | 104 → 3 (3%) | 93 → 0 | 62 → 0 |
| free_quota (10) shown → plan | 12 → 2 | 30 → 5 (17%) | 41 → 6 (15%) | 37 → 3 (8%) | 23 → 1 |
| company_set (3) shown → plan | 26 → 3 (12%) | — | — | — | — |

As #409 said, a person at the wall has chosen to solve ten, so this is not
causal. It says the milestone modal rarely sells to anyone who is not
already shopping. Moving or quieting it is money exposure (M4
`quietEarlyAsks` is dark, H7 waits on the holdout): founder decision.

### Phones

311 of 2,855 first opens (11%) were phones; 40 ran a query (13%, 10–17),
against 44% on desktop. It is worst exactly where the money is: company
arrivals on a phone, 2 of 74. `mobileRunBar` and `companyDirectOpen` both
sit on this cell (open → first run, phones: full); their reads should be cut
by segment.

### Doors

| Door (first open) | Openers | Ran | Trial / paid |
|---|---|---|---|
| /sql-exercises/ | 969 (Bing 508) | 47% | 3 |
| topic / question / trap pages | 478 | 42% | 0 |
| company page or `?company=` | 457 | 34% | **7** |
| homepage | 334 | 42% | 1 |
| other | 274 | 39% | 0 |
| no source | 186 | 28% | 1 |
| AI assistant (ChatGPT 80, Gemini 27, Copilot 14, Perplexity 5, meta.ai 2, Claude 1) | 129 | 36% | 1 (meta.ai) |
| blog | 25 | 32% | 0 |
| readiness test | 3 | — | 0 |

## 4. The free path after the wall (all segments, Query 1)

144 people met the 10-solve quota wall in the window.

| After the first wall | People | Share (95% CI) |
|---|---|---|
| came back on a later UTC day (to 11-28) | 50 | 34.7% (27.4–42.8) |
| …within 7 days | 42 | 29.2% |
| took a `quotaFreePaths` link | 30 | 20.8% (15.0–28.2) — 26 to the daily, the rest to the Coach |
| solved another challenge after the wall | 9 | 6.2% |
| clicked a plan after the wall | 18 | 12.5% (8.1–18.9) |
| started a trial or paid (any time) | 5 | 3.5% (1.5–7.9) |
| **left: none of the four above** | **74** | **51.4%** |

By segment: interview_general left 37% (11 of 30), job_ready 51% (21 of
41), learner 54% (20 of 37), unknown 74% (17 of 23), interview_company 5
of 12. The free path is used most by learners (24%) and is a daily-challenge
path in practice (26 of 30).

## 5. The optimization — one lever per segment, ranked

### Test cells today (11-24 cap: at most 2 live A/Bs per funnel step × device)

| Cell | Live / queued | Room |
|---|---|---|
| open → first run, desktop | `companyDirectOpen` + `runnableStarter` | **full** |
| open → first run, phones | `companyDirectOpen` + `mobileRunBar` | **full** |
| first run → solve | `runSubmitNudge` (merged, dark) | 1 |
| after a solve, phones | `mobileOneLayer` | 1 |
| after a solve, desktop | `nextUpFirst` queued (B1, 11-24) | 1–2 |
| quota wall → plan, all | `quotaWallInline` + `modalPlansFirst` | **full**, and locked by the holdout |
| first open → 7-day return, all | `freeQuotaHoldout` (11-28 → 12-25, read 2027-01-02) | locked |
| milestone modal (6 solves) → plan | none found (`modalPlansFirst` acts on `free_quota` asks only) | empty, but any change is money copy |
| new visitors, whole first session | first-session tournament A / B / D from **2026-12-12** | — |

### Arithmetic (per month at today's traffic: 621 first opens a month; the 90-day pace was 952)

| # | Segment | Lever | Arithmetic | Extra trials / payers a month | Metric (docs/agent/metrics.md) | Covered? |
|---|---|---|---|---|---|---|
| 1 | interview_general, job_ready (India) | **India checkout completion** | India-price plan clicks: 16 per 90 d = 5.3 a month at the 90-day pace × 621/952 = **3.5 a month**. Today 1 of 16 (6%) turns into a trial. At the non-company default rate (21%): 3.5 × 0.15 = **+0.5**; at the all-default rate (35%): 3.5 × 0.29 = **+1.0** | **+0.5 – 1.0** | `checkout_abandonment` and `trial_funnel`, split by `priceRegion` — **no metric reads plan → trial by region (flag)** | **Founder decision** (B4): checkout/price path, not a test this lane may run |
| 2 | interview_company | **More company-page arrivals** (content: B3/C1, not a funnel test) | 1.65 trials/payers per 100 company openers vs 0.22 for entry-unknown; +50 company openers a month × 0.0165 | **+0.8 per +50 openers** | `company_page_door` | Not a test. Directional: the pages that pay best are Amazon, Stripe, Meta (6.8 per 100, n 59), not the three biggest (1.2, n 259) |
| 3 | interview_company | Open → first run (desktop list landing, phones) | 158 company openers a month; ran 35%. +10 pp = 15.8 runners × 4.7% (8 of 170 runners paid) | +0.7 | `open_to_first_run`, `company_direct_split`, `runnable_starter_split` | **Yes** — `companyDirectOpen`, `runnableStarter`, `mobileRunBar`, tournament B/D. Do not add a test; cut their reads by segment |
| 4 | interview_company | 1 → 3 solves | 158 × 31.3% = 49.5 solvers a month; +10 pp reaching 3 = 4.9 × 8.7% (8 of 92 three-solvers paid) | +0.4 (one third of it inside arm D) | `first_session_tournament`, `reach_6_rate` | **Yes** — arm D (interview sprint) from 12-12 |
| 5 | interview_company | **Company-specific price at the 6-solve milestone** ("your Revolut set: N more") | Company people seeing the milestone modal: 48 of 486 → 15.6 a month. Milestone → plan 6% (3 of 48); lift to the company-set wall's 11.5% = +0.83 plan clicks × 47% plan → trial/paid | +0.4 (0.2 – 0.6) | `plan_click_rate` on `milestone_solves`, `modal_click_rate` | Cell empty, but the copy is money copy: **founder's go** (tournament §7 rule) |
| 6 | unknown | Open → first run | Entry-unknown 437 a month; +10 pp = 43.7 runners × 0.55% (5 of 916 runners paid) | +0.24 | `open_to_first_run`, `first_session_tournament` | **Yes** — same live tests; tournament arm B |
| 7 | interview_general, job_ready | Keep solvers going 1 → 3 → 6 | ~73 solvers a month; +5 pp reaching 6 = 3.6 × 2.0% (4 of 198 six-solvers paid) | +0.07 | `reach_6_rate`, `next_rec_take` | Queued — `nextUpFirst` (after a solve, desktop) |
| 8 | all wall-hitters | Tomorrow's question at the wall (H8) | ~31 wall-hitters a month at today's traffic, 51% leave; +20 pp returning = +6 returners a month. Money per returner not readable (5 of 144) | not readable (returns only) | `quota_wall`, `second_session_7d` | **Locked** — wall cell full and the holdout reads to 2027-01-02 |
| 9 | learner | none | 0 of 99 who saw a price; return 39% | 0 | `second_session_7d` only | Do not spend a slot |
| — | interview_dated | none | n = 0 | — | `segment_mix` (**not on main yet**, PR #439) | — |
| — | at_work | none | n = 1 | — | — | — |

**Ranked by expected extra trials / payers a month:**
1. India checkout completion — +0.5 to +1.0 — **founder decision**.
2. More company-page arrivals — +0.8 per +50 openers — content lane.
3. Company open → first run — +0.7 — already under test; protect the reads.
4. Company 1 → 3 solves — +0.4 — tournament arm D covers it.
5. Company-specific milestone price — +0.4 — **founder's go** (money copy).
6. Unknown open → first run — +0.24 — already under test.
7. Solver continuation for interview_general / job_ready — +0.07 — `nextUpFirst` queued.
8. Wall return path (H8) — returns, money not readable — locked until 2027-01-02.
9. Learners — none.

Together the non-founder, non-covered levers add well under one trial a
month at today's traffic. The two largest numbers are a founder decision
(India checkout) and traffic (company pages). That is the honest answer to
"optimize the funnel": the funnel steps that matter for the paying segment
are already under test; what remains is who arrives and whether India
checkout completes.

## 6. What this does and does not say

- **Small n everywhere money is.** 13 trials/payments in the cohort; every
  per-segment money cell is 0–8. Read directions, not decimals. The
  company vs unknown difference (1.65 vs 0.06 per 100 ever; 1.48 vs 0.22
  entry) has non-overlapping 95% intervals; nothing finer does.
- The ever segments are selected on behaviour (asked after a solve), so
  "job_ready returns 44%" says who answers, not what the answer causes.
- "What they use" mixes cause and selection: people who use more also solve
  more. B1's 11-27 retention read found the tutor, lessons and the Coach
  predict nothing once solves and session length are held.
- The money joins by webhook username; a guest who never registered can
  only be counted through the bridge (#409 §2). Same rule, same blind spot.
- The cohort ends 11-28, so the last 30 days have had less time to convert;
  that understates money for the newest, company-heavier, month.

## Papercuts found on the way

1. **No event for the daily challenge itself.** "Daily" use is a proxy
   (`streak_solve_started`, `daily_reward_claimed`, a `quota_wall_free_path`
   to the daily). The one free path half the wall-hitters could take is not
   measured where it is used.
2. **`coach_tab_viewed` fires for 85% of all openers** (it is the landing
   tab), so it is not a use signal. Coach use here = `coach_step_started`,
   `goal_selected`, `plan_item_started`, the debug door or the free path to
   the Coach (5.4% of openers).
3. **interview_dated has no population and will not get one from arm D.**
   0 future dates in 2,855 people; the sprint end lives in
   `userData.sprint`, not `prepTarget.date`. `segment_mix` will read 0% for
   the first segment of `segmentOf` until a date surface ships
   (`interviewCountdown` is dark).
4. **`challenge_opened` carries no company filter**, so "used a company
   set" is a lower bound built from `openedFrom`, `content_lock_reached`
   `companyFilter`, company walls and plan items.
5. **`segment_mix` is not in `docs/agent/metrics.md` on main** (it comes
   with PR #439). There is also **no metric for plan click → trial by
   `priceRegion`**, the step where the India gap sits.
6. **Traffic fell 44%** (621 first opens in the last 30 days against 1,117
   a month in the 60 before). Any read of a live test whose clock spans
   this must compare arms, never periods.

## Appendix: every query

All run as-is in the Supabase MCP `execute_sql` (read-only). Queries 1–3
share one base (printed once); each query is `SET enable_nestloop = off;` +
base + its tail. Queries 0a/0b are the event and metadata inventories used
to pick the event names.

### Query 0a: event inventory (standalone)

```sql
SELECT event, count(*) n, count(DISTINCT COALESCE(((metadata #>> '{}')::jsonb)->>'aid', username)) people
FROM public.pro_events WHERE created_at >= '2026-08-30' AND created_at < '2026-11-28'
GROUP BY event ORDER BY people DESC LIMIT 200;
```

### Query 0b: metadata values that define the steps (standalone)

```sql
WITH s AS (SELECT event, (metadata #>> '{}')::jsonb m FROM public.pro_events WHERE created_at >= '2026-08-30'
           AND event IN ('challenge_opened','content_lock_reached','pro_modal_shown','quota_wall_free_path',
                         'placement_completed','intent_captured','coach_tab_viewed'))
SELECT 'openedFrom' k, m->>'openedFrom' v, count(*) FROM s WHERE event='challenge_opened' GROUP BY 2
UNION ALL SELECT 'lock_wall', m->>'wall', count(*) FROM s WHERE event='content_lock_reached' GROUP BY 2
UNION ALL SELECT 'lock_surface', m->>'surface', count(*) FROM s WHERE event='content_lock_reached' GROUP BY 2
UNION ALL SELECT 'lock_companyFilter_set', (COALESCE(m->>'companyFilter','') NOT IN ('','null'))::text, count(*) FROM s WHERE event='content_lock_reached' GROUP BY 2
UNION ALL SELECT 'modal_reason', m->>'reason', count(*) FROM s WHERE event='pro_modal_shown' GROUP BY 2
UNION ALL SELECT 'freepath_to', m->>'to', count(*) FROM s WHERE event='quota_wall_free_path' GROUP BY 2
UNION ALL SELECT 'tier', m->>'tier' || '/' || COALESCE(m->>'levelId','') || '/' || COALESCE(m->>'source',''), count(*) FROM s WHERE event='placement_completed' GROUP BY 2
UNION ALL SELECT 'ic_source', m->>'source' || '/' || COALESCE(m->>'intent',''), count(*) FROM s WHERE event='intent_captured' GROUP BY 2
UNION ALL SELECT 'coach_goalSource', m->>'goalSource' || '/' || COALESCE(m->>'shell',''), count(*) FROM s WHERE event='coach_tab_viewed' GROUP BY 2
ORDER BY 1, 3 DESC;
```

### Base (cohort, human filter, canonical segment ever / entry, steps, use, wall)

```sql
-- Run with: SET enable_nestloop = off;  (#409 papercut: the planner otherwise nests person x evp and times out)
WITH params AS (
  SELECT timestamptz '2026-11-28 00:00+00' AS t,      -- window end (exclusive)
         timestamptz '2026-08-30 00:00+00' AS t0,     -- 90 days before
         date '2026-11-28' AS today                   -- segmentOf's "date today or later"
),
cand AS MATERIALIZED (   -- anyone with an app or challenge open in the window
  SELECT DISTINCT COALESCE(((e.metadata #>> '{}')::jsonb)->>'aid', e.username) AS pid
  FROM public.pro_events e
  WHERE e.event IN ('app_opened', 'challenge_opened')
    AND e.created_at >= (SELECT t0 FROM params) AND e.created_at < (SELECT t FROM params)
),
evp AS MATERIALIZED (   -- every row those people ever wrote, to the window end
  SELECT e.event, e.reason, e.username, e.created_at, x.m, COALESCE(x.m->>'aid', e.username) AS pid
  FROM public.pro_events e
  CROSS JOIN LATERAL (SELECT (e.metadata #>> '{}')::jsonb AS m) x
  WHERE e.created_at < (SELECT t FROM params)
    AND COALESCE(x.m->>'aid', e.username) IN (SELECT pid FROM cand)
),
-- ---- human filter: scripts/scorecard-weekly.sql base (as in segment-mix-baseline.sql), CASE form so a NULL never excludes ----
facts AS (
  SELECT pid,
    bool_or(COALESCE(username, '') ~* '^(test|qa_|fabletest|linktest|internalroutine|sqlquest$|elena$)') AS f_internal,
    bool_or(m->>'aid' IN ('363dfb2bc1314757acc88c8438c4d2ea') OR m->>'aid' LIKE 'e5fcbad1a022%' OR m->>'aid' LIKE 'a2a2%'
            OR m->>'aid' = 'd9fe96e2bdf44aefa9195673a6496888'
            OR (event = 'pro_modal_shown' AND m->>'reason' = 'email_link' AND created_at >= '2026-11-20' AND created_at < '2026-11-21'
                AND username ILIKE 'guest%' AND COALESCE(m->>'solvedCount', '0') = '0')
            OR (m->>'tz' = 'Europe/Istanbul' AND m->>'viewport' = 'mobile:375x812'
                AND created_at >= '2026-11-24 11:00+00' AND created_at < '2026-11-24 11:08+00')) AS f_founder,
    bool_or(COALESCE(m->>'bot', '') NOT IN ('', 'false') OR m->>'wd' = 'true' OR m->>'uaBot' = 'true') AS f_stamp,
    bool_or(m->>'viewport' IN ('tablet:800x600', 'desktop:1280x1200', 'desktop:1919x992', 'desktop:1024x1024')) AS f_viewport,
    bool_or(COALESCE(m->>'landingSrc', '') ~* '^ref:(.+\.)?aocr\.org$' OR COALESCE(m->>'arrivalSrc', '') ~* 'aocr\.org' OR m->>'arrivalSrc' = 'verify-test') AS f_ref,
    bool_or(event = 'landing_view') AS any_landing,
    bool_or(event = 'app_opened' AND m->>'langs' = '2' AND COALESCE(m->>'landingSrc', '') = '') AS langs2_open,
    min(created_at) FILTER (WHERE event IN ('app_opened', 'challenge_opened')) AS t_first,
    (array_agg(m ORDER BY created_at) FILTER (WHERE event = 'app_opened'))[1] AS fo,
    (array_agg(m ORDER BY created_at) FILTER (WHERE event IN ('app_opened', 'challenge_opened')))[1] AS fm
  FROM evp GROUP BY pid
),
human AS MATERIALIZED (   -- first-ever open inside the window, human
  SELECT pid, t_first, fm FROM facts
  WHERE t_first >= (SELECT t0 FROM params)
    AND (CASE
      WHEN f_internal OR f_founder OR f_stamp OR f_viewport OR f_ref THEN 1
      WHEN COALESCE(fo->>'landingSrc', '') = '' AND fo->>'langs' = '1' AND NOT any_landing THEN 1                       -- app1lang
      WHEN COALESCE(fo->>'landingSrc', '') = '' AND fo->>'langs' = '1' AND fo->>'arrivalSrc' LIKE 'challenges-%' THEN 1 -- topic1lang
      WHEN COALESCE(fo->>'landingSrc', '') = '' AND fo->>'tz' = 'America/Los_Angeles' AND fo->>'viewport' = 'desktop:1920x1080' THEN 1 -- prestamp_fp
      WHEN fo->>'tz' = 'UTC' AND fo->>'viewport' = 'desktop:1280x720' AND NOT any_landing THEN 1                       -- utc1280
      WHEN COALESCE(fo->>'landingSrc', '') = '' AND NOT any_landing AND fo->>'tz' IN ('Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Singapore') THEN 1 -- cn_app
      WHEN langs2_open AND NOT any_landing THEN 1                                                                          -- langs2
      ELSE 0 END) = 0
),
clean AS MATERIALIZED (SELECT e.*, h.t_first FROM evp e JOIN human h USING (pid)),
-- ---- the canonical segment (src/utils/segment.js), re-derived as scripts/segment-mix-baseline.sql does ----
unames AS MATERIALIZED (SELECT DISTINCT pid, username FROM clean WHERE username IS NOT NULL AND username <> 'guest'),
ud AS (
  SELECT u.pid,
    bool_or(COALESCE(us.data->'prepTarget'->>'date', '') ~ '^\d{4}-\d{2}-\d{2}$' AND (us.data->'prepTarget'->>'date')::date >= (SELECT today FROM params)) AS dated,
    max(CASE WHEN COALESCE(us.data->'prepTarget'->>'date', '') ~ '^\d{4}-\d{2}-\d{2}$' THEN (us.data->'prepTarget'->>'date')::date END) AS pt_date,
    max(NULLIF(us.data->'prepTarget'->>'company', '')) AS pt_company,
    max(COALESCE(us.data->'intent'->>'goal', CASE WHEN jsonb_typeof(us.data->'intent') = 'string' THEN us.data->>'intent' END)) AS u_intent,
    max(us.data->'coachState'->>'goalId') AS u_goal,
    bool_or(us.data->'coachState'->>'goalId' = 'interview-prep') AS g_interview,
    bool_or(us.data->'coachState'->>'goalId' = 'analyst-day-one') AS g_dayone,
    bool_or(us.data->'coachState'->>'goalId' = 'fundamentals') AS g_fund
  FROM unames u JOIN public.users us ON us.username = u.username GROUP BY u.pid
),
li AS (
  SELECT DISTINCT ON (pid) pid, m->>'intent' AS intent
  FROM clean WHERE m->>'intent' IN ('interview', 'job_ready', 'learning', 'exploring', 'hired', 'at_work')
  ORDER BY pid, created_at DESC
),
sgr AS (
  SELECT c.pid, c.event, c.created_at, c.t_first, c.m,
    (c.m->>'arrivalSrc' ~ '-sql-interview$' OR c.m->>'arrivalSrc' ~ '^company:' OR c.m->>'arrivalSrc' = 'blog-capital-one'
      OR (c.event = 'intent_captured' AND COALESCE(c.m->>'company', '') <> '') OR c.event = 'company_direct_assigned'
      OR (c.event = 'interview_started' AND COALESCE(c.m->>'company', 'General') NOT IN ('General', ''))) AS co_sig,
    (c.m->>'arrivalSrc' = 'readiness' OR c.event IN ('readiness_arrived', 'readiness_completed')) AS rd_sig,
    (c.created_at <= c.t_first + interval '60 seconds') AS at_entry
  FROM clean c
),
sg AS (
  SELECT pid,
    bool_or(co_sig) AS co, bool_or(rd_sig) AS rd,
    bool_or(co_sig AND at_entry) AS co_entry, bool_or(rd_sig AND at_entry) AS rd_entry,
    (array_agg(m->>'intent' ORDER BY created_at DESC) FILTER (WHERE at_entry
        AND m->>'intent' IN ('interview', 'job_ready', 'learning', 'exploring', 'hired', 'at_work')))[1] AS entry_intent,
    bool_or(event = 'goal_selected' AND m->>'goalId' = 'interview-prep') AS e_ginterview,
    bool_or(event = 'goal_selected' AND m->>'goalId' = 'analyst-day-one') AS e_gdayone,
    bool_or(event = 'goal_selected' AND m->>'goalId' = 'fundamentals') AS e_gfund,
    (array_agg(m->>'goalId' ORDER BY created_at DESC) FILTER (WHERE event = 'goal_selected'))[1] AS e_goal
  FROM sgr GROUP BY pid
),
seg AS (
  SELECT h.pid,
    CASE   -- EVER: segmentOf's rules, in its order, on every signal to the window end
      WHEN COALESCE(li.intent, ud.u_intent) = 'hired' THEN 'at_work'
      WHEN ud.dated THEN 'interview_dated'
      WHEN ud.pt_company IS NOT NULL OR sg.co THEN 'interview_company'
      WHEN COALESCE(li.intent, ud.u_intent) = 'interview' OR ud.g_interview OR sg.e_ginterview OR sg.rd THEN 'interview_general'
      WHEN COALESCE(li.intent, ud.u_intent) = 'at_work' THEN 'at_work'
      WHEN COALESCE(li.intent, ud.u_intent) = 'job_ready' THEN 'job_ready'
      WHEN COALESCE(li.intent, ud.u_intent) = 'learning' THEN 'learner'
      WHEN ud.g_dayone OR sg.e_gdayone THEN 'job_ready'
      WHEN ud.g_fund OR sg.e_gfund THEN 'learner'
      ELSE 'unknown' END AS seg_ever,
    CASE   -- ENTRY: the same rules on what was known by the first open + 60 s (no users.data, no date: neither exists then)
      WHEN sg.entry_intent = 'hired' THEN 'at_work'
      WHEN sg.co_entry THEN 'interview_company'
      WHEN sg.entry_intent = 'interview' OR sg.rd_entry THEN 'interview_general'
      WHEN sg.entry_intent = 'at_work' THEN 'at_work'
      WHEN sg.entry_intent = 'job_ready' THEN 'job_ready'
      WHEN sg.entry_intent = 'learning' THEN 'learner'
      ELSE 'unknown' END AS seg_entry,
    COALESCE(li.intent, ud.u_intent) AS stated_intent,
    COALESCE(ud.u_goal, sg.e_goal) AS coach_goal,
    ud.pt_date, ud.pt_company
  FROM human h LEFT JOIN ud USING (pid) LEFT JOIN li USING (pid) LEFT JOIN sg USING (pid)
),
-- ---- money: stripe_webhook only, each webhook username credited to ONE cohort person (the earliest first open) ----
money_u AS (
  SELECT u.username, u.pid, row_number() OVER (PARTITION BY u.username ORDER BY h.t_first) AS rn
  FROM unames u JOIN human h USING (pid)
  WHERE u.username IN (SELECT username FROM public.pro_events WHERE reason = 'stripe_webhook')
),
money AS (
  SELECT mu.pid,
    min(e.created_at) FILTER (WHERE e.event IN ('pro_trial_started', 'pro_purchase_completed')) AS t_money
  FROM money_u mu JOIN public.pro_events e ON e.username = mu.username AND e.reason = 'stripe_webhook'
  WHERE mu.rn = 1 AND e.created_at < (SELECT t FROM params)
    AND COALESCE(e.username, '') !~* '^(test|qa_|fabletest|linktest|internalroutine|sqlquest$|elena$)'
  GROUP BY mu.pid
),
-- ---- per-person steps, use and targets ----
st AS (
  SELECT pid,
    bool_or(event IN ('challenge_first_run', 'challenge_solved')) AS ran,
    count(DISTINCT m->>'challengeId') FILTER (WHERE event = 'challenge_solved') AS solves,
    min(created_at) FILTER (WHERE (event = 'content_lock_reached' AND m->>'wall' = 'free_quota')
                               OR (event = 'pro_modal_shown' AND m->>'reason' = 'free_quota')) AS t_wall,
    bool_or(event = 'pro_modal_shown') AS modal,
    bool_or(event = 'pro_plan_clicked') AS plan,
    bool_or(event = 'pro_checkout_clicked') AS checkout,
    bool_or(event NOT IN ('landing_view', 'landing_engaged') AND COALESCE(reason, '') NOT IN ('landing', 'stripe_webhook')
            AND created_at::date > t_first::date AND created_at < t_first + interval '7 days') AS ret7,
    bool_or(event = 'challenge_opened') AS opened_challenge,
    bool_or(event = 'coach_tab_viewed') AS u_coach_seen,
    bool_or(event IN ('coach_step_started', 'goal_selected', 'plan_item_started', 'coach_debug_door_clicked')
            OR (event = 'quota_wall_free_path' AND m->>'to' = 'coach')) AS u_coach,
    bool_or(event = 'interview_started') AS u_mock,
    bool_or((event = 'challenge_opened' AND m->>'openedFrom' IN ('company_direct', 'company_banner'))
            OR (event = 'content_lock_reached' AND (COALESCE(m->>'companyFilter', '') NOT IN ('', 'null') OR m->>'wall' IN ('company_set', 'company_modal')))
            OR (event = 'pro_modal_shown' AND m->>'reason' IN ('company_set', 'company_hard', 'company_set_complete'))
            OR event = 'company_set_match_shown'
            OR (event = 'plan_item_started' AND COALESCE(m->>'company', '') <> '')) AS u_company_set,
    bool_or(event IN ('inline_help_opened', 'tutor_bypass_clicked')) AS u_tutor,
    bool_or(event = 'tutor_nudge_shown') AS u_nudge_seen,
    bool_or(event = 'challenge_hint_opened') AS u_hint,
    bool_or(event = 'lesson1_started') AS u_lesson,
    bool_or(event IN ('streak_solve_started', 'daily_reward_claimed') OR (event = 'quota_wall_free_path' AND m->>'to' = 'daily')) AS u_daily,
    (array_agg(m->>'tier' ORDER BY created_at) FILTER (WHERE event = 'placement_completed'))[1] AS tier,
    max(m->>'priceRegion') FILTER (WHERE event = 'pro_modal_shown') AS modal_region,
    max(NULLIF(m->>'daysOut', 'null')) FILTER (WHERE event = 'pro_modal_shown') AS modal_days_out,
    (array_agg(lower(COALESCE(NULLIF(m->>'company', ''), NULLIF(m->>'wallCompany', ''))) ORDER BY created_at DESC)
       FILTER (WHERE COALESCE(NULLIF(m->>'company', ''), NULLIF(m->>'wallCompany', '')) IS NOT NULL
               AND lower(COALESCE(NULLIF(m->>'company', ''), m->>'wallCompany')) NOT IN ('general', 'null')))[1] AS ev_company
  FROM clean GROUP BY pid
),
wall AS (   -- what happened after the first quota wall
  SELECT c.pid,
    bool_or(c.event NOT IN ('landing_view', 'landing_engaged') AND COALESCE(c.reason, '') NOT IN ('landing', 'stripe_webhook')
            AND c.created_at::date > s.t_wall::date) AS back_later_day,
    bool_or(c.event NOT IN ('landing_view', 'landing_engaged') AND COALESCE(c.reason, '') NOT IN ('landing', 'stripe_webhook')
            AND c.created_at::date > s.t_wall::date AND c.created_at < s.t_wall + interval '7 days') AS back_7d,
    bool_or(c.event = 'quota_wall_free_path' AND c.created_at >= s.t_wall) AS free_path,
    bool_or(c.event = 'quota_wall_free_path' AND c.created_at >= s.t_wall AND c.m->>'to' = 'daily') AS free_path_daily,
    bool_or(c.event = 'challenge_solved' AND c.created_at > s.t_wall) AS solved_after_wall,
    bool_or(c.event = 'pro_plan_clicked' AND c.created_at >= s.t_wall) AS plan_after_wall
  FROM clean c JOIN st s USING (pid) WHERE s.t_wall IS NOT NULL GROUP BY c.pid
),
f AS (
  SELECT h.pid, h.t_first, sg.seg_ever, sg.seg_entry, sg.stated_intent, sg.coach_goal, sg.pt_date, sg.pt_company,
    CASE
      WHEN COALESCE(h.fm->>'landingSrc', '') ~ '^ai:' OR h.fm->>'landingSrc' = 'utm:copilot.com'
           OR COALESCE(h.fm->>'landingSrc', '') ~* '^ref:.*(chatgpt|openai|perplexity|gemini|meta\.ai|copilot|claude\.ai)' THEN 'ai'
      WHEN h.fm->>'arrivalSrc' ~ '-sql-interview$' OR h.fm->>'arrivalSrc' ~ '^company:' OR h.fm->>'arrivalSrc' = 'blog-capital-one' THEN 'company_page'
      WHEN h.fm->>'arrivalSrc' ~ 'readiness' THEN 'readiness_test'
      WHEN h.fm->>'arrivalSrc' = 'sql-exercises' THEN 'sql_exercises'
      WHEN h.fm->>'arrivalSrc' ~ '^(challenges-|question-|pattern-|sql-)' THEN 'topic_question_trap'
      WHEN h.fm->>'arrivalSrc' ~ '^blog' THEN 'blog'
      WHEN h.fm->>'arrivalSrc' = 'home' THEN 'homepage'
      WHEN COALESCE(h.fm->>'arrivalSrc', '') = '' THEN 'none'
      ELSE 'other' END AS door,
    COALESCE(h.fm->>'landingSrc', '') AS lsrc, h.fm->>'arrivalSrc' AS arr,
    CASE WHEN h.fm->>'viewport' LIKE 'mobile%' THEN 'phone' WHEN h.fm->>'viewport' LIKE 'tablet%' THEN 'tablet' ELSE 'desktop' END AS device,
    (h.fm->>'tz' IN ('Asia/Kolkata', 'Asia/Calcutta')) AS india_tz,
    COALESCE(s.ran, false) AS ran, COALESCE(s.solves, 0) AS solves, (s.t_wall IS NOT NULL) AS wall,
    COALESCE(s.modal, false) AS modal, COALESCE(s.plan, false) AS plan, COALESCE(s.checkout, false) AS checkout,
    COALESCE(mo.t_money >= h.t_first - interval '1 day', false) AS money,
    COALESCE(s.ret7, false) AS ret7, (h.t_first < (SELECT t FROM params) - interval '7 days') AS ret_eligible,
    (h.t_first >= (SELECT t FROM params) - interval '30 days') AS last30,
    COALESCE(s.opened_challenge, false) AS opened_challenge,
    s.u_coach_seen, s.u_coach, s.u_mock, s.u_company_set, s.u_tutor, s.u_nudge_seen, s.u_hint, s.u_lesson, s.u_daily,
    s.tier, s.modal_region, s.modal_days_out,
    lower(regexp_replace(COALESCE(sg.pt_company, s.ev_company,
      CASE WHEN h.fm->>'arrivalSrc' ~ '^company:' THEN substring(h.fm->>'arrivalSrc' FROM '^company:(.*)$')
           WHEN h.fm->>'arrivalSrc' ~ '-sql-interview$' THEN regexp_replace(h.fm->>'arrivalSrc', '-sql-interview$', '')
           WHEN h.fm->>'arrivalSrc' = 'blog-capital-one' THEN 'capital-one' END), '[^A-Za-z0-9]+', '-', 'g')) AS company,
    w.back_later_day, w.back_7d, w.free_path, w.free_path_daily, w.solved_after_wall, w.plan_after_wall
  FROM human h JOIN seg sg USING (pid) LEFT JOIN st s USING (pid) LEFT JOIN money mo USING (pid) LEFT JOIN wall w USING (pid)
)
```

### Query 1: the step funnel, use and the after-the-wall paths (base +)

```sql
-- Query 1: the step funnel, use and the after-the-wall paths, per segment (ever / entry / all)
SELECT v, seg, count(*) n, count(*) FILTER (WHERE last30) n_last30,
  count(*) FILTER (WHERE opened_challenge) opened_challenge,
  count(*) FILTER (WHERE ran) ran, count(*) FILTER (WHERE solves >= 1) s1, count(*) FILTER (WHERE solves >= 3) s3,
  count(*) FILTER (WHERE solves >= 6) s6, count(*) FILTER (WHERE wall) wall, count(*) FILTER (WHERE modal) modal,
  count(*) FILTER (WHERE plan) plan, count(*) FILTER (WHERE checkout) checkout, count(*) FILTER (WHERE money) trial_or_paid,
  count(*) FILTER (WHERE ret_eligible) ret_n, count(*) FILTER (WHERE ret_eligible AND ret7) ret7,
  count(*) FILTER (WHERE u_coach_seen) coach_seen, count(*) FILTER (WHERE u_coach) coach_used, count(*) FILTER (WHERE u_mock) mock,
  count(*) FILTER (WHERE u_company_set) company_set, count(*) FILTER (WHERE u_tutor) tutor, count(*) FILTER (WHERE u_nudge_seen) nudge_seen,
  count(*) FILTER (WHERE u_hint) hint, count(*) FILTER (WHERE u_lesson) lesson, count(*) FILTER (WHERE u_daily) daily,
  count(*) FILTER (WHERE device = 'phone') phone, count(*) FILTER (WHERE india_tz) india_tz,
  count(*) FILTER (WHERE wall AND back_later_day) wall_back, count(*) FILTER (WHERE wall AND back_7d) wall_back7,
  count(*) FILTER (WHERE wall AND free_path) wall_freepath, count(*) FILTER (WHERE wall AND free_path_daily) wall_fp_daily,
  count(*) FILTER (WHERE wall AND solved_after_wall) wall_solved_after, count(*) FILTER (WHERE wall AND plan_after_wall) wall_plan,
  count(*) FILTER (WHERE wall AND money) wall_money,
  count(*) FILTER (WHERE wall AND NOT COALESCE(back_later_day, false) AND NOT COALESCE(free_path, false) AND NOT COALESCE(plan_after_wall, false) AND NOT money) wall_left
FROM f CROSS JOIN LATERAL (VALUES ('ever', seg_ever), ('entry', seg_entry), ('all', 'all')) x(v, seg)
GROUP BY v, seg ORDER BY v, n DESC;
```

### Query 2: purpose and target in long format (base +)

```sql
-- Query 2: purpose and target, long format: one row per (version, segment, dimension, value) with its funnel
, dims AS (
  SELECT x.v, x.seg, d.dim, d.val, f.ran, f.solves, f.modal, f.plan, f.money
  FROM f CROSS JOIN LATERAL (VALUES ('ever', f.seg_ever), ('entry', f.seg_entry), ('all', 'all')) x(v, seg)
  CROSS JOIN LATERAL (VALUES
    ('door', f.door),
    ('door_engine', CASE WHEN f.door IN ('sql_exercises', 'topic_question_trap', 'company_page', 'homepage', 'blog', 'none', 'other')
       THEN f.door || '|' || CASE WHEN f.lsrc ~* 'bing' THEN 'bing' WHEN f.lsrc ~* 'google' THEN 'google'
                                  WHEN f.lsrc ~* 'duckduckgo|yahoo|yandex|ecosia|brave|baidu|naver' THEN 'other_search'
                                  WHEN f.lsrc = '' THEN 'no_landingSrc' ELSE 'other' END END),
    ('ai_src', CASE WHEN f.door = 'ai' THEN f.lsrc END),
    ('intent', COALESCE(f.stated_intent, '(none)')),
    ('coach_goal', COALESCE(f.coach_goal, '(none)')),
    ('tier', COALESCE(f.tier, '(no placement)')),
    ('device', f.device),
    ('region', CASE WHEN f.modal_region IS NOT NULL THEN 'modal:' || f.modal_region WHEN f.india_tz THEN 'tz:india' ELSE 'tz:other' END),
    ('india_tz', f.india_tz::text),
    ('date', CASE WHEN f.pt_date IS NULL THEN '(none)' WHEN f.pt_date < f.t_first::date THEN 'before_first_open'
                  WHEN f.pt_date - f.t_first::date <= 7 THEN '0-7d' WHEN f.pt_date - f.t_first::date <= 14 THEN '8-14d'
                  WHEN f.pt_date - f.t_first::date <= 30 THEN '15-30d' WHEN f.pt_date - f.t_first::date <= 60 THEN '31-60d' ELSE '61d+' END),
    ('date_vs_today', CASE WHEN f.pt_date IS NULL THEN '(none)' WHEN f.pt_date >= date '2026-11-28' THEN 'future' ELSE 'past' END),
    ('modal_days_out', CASE WHEN f.modal_days_out IS NOT NULL THEN 'set' END),
    ('company', f.company)
  ) d(dim, val)
  WHERE d.val IS NOT NULL
)
SELECT v, seg, dim, val, count(*) n, count(*) FILTER (WHERE ran) ran, count(*) FILTER (WHERE solves >= 1) s1,
       count(*) FILTER (WHERE modal) modal, count(*) FILTER (WHERE plan) plan, count(*) FILTER (WHERE money) trial_or_paid
FROM dims GROUP BY 1, 2, 3, 4
HAVING dim <> 'company' OR count(*) >= 3
ORDER BY 1, 2, 3, 5 DESC;
```

### Query 3: device × period, plan clicks by price region, modal reasons (base +)

```sql
-- Query 3: (a) segment x device x period (before / from the companyDirectOpen flip, 2026-11-23 UTC),
-- (b) plan clickers by the price region stamped on their plan click, (c) the modal reasons each segment met
, pcr AS (
  SELECT pid, bool_or(m->>'priceRegion' = 'IN') AS clicked_in, bool_or(COALESCE(m->>'priceRegion', 'default') <> 'IN') AS clicked_default
  FROM clean WHERE event = 'pro_plan_clicked' GROUP BY pid
),
mr AS (SELECT pid, m->>'reason' AS reason FROM clean WHERE event = 'pro_modal_shown' GROUP BY 1, 2),
pc AS (SELECT pid, m->>'modalReason' AS reason FROM clean WHERE event = 'pro_plan_clicked' GROUP BY 1, 2),
fm1 AS (SELECT DISTINCT ON (pid) pid, m->>'reason' AS first_reason FROM clean WHERE event = 'pro_modal_shown' ORDER BY pid, created_at)
SELECT 'a_device_period' AS part, x.v, x.seg, f.device AS k1,
       CASE WHEN f.t_first >= '2026-11-23' THEN 'from_11-23' ELSE 'before_11-23' END AS k2,
       count(*) n, count(*) FILTER (WHERE f.opened_challenge) c_opened_challenge, count(*) FILTER (WHERE f.ran) c_ran,
       count(*) FILTER (WHERE f.solves >= 1) c_s1, count(*) FILTER (WHERE f.modal) c_modal, count(*) FILTER (WHERE f.plan) c_plan,
       count(*) FILTER (WHERE f.money) c_money
FROM f CROSS JOIN LATERAL (VALUES ('ever', f.seg_ever), ('entry', f.seg_entry)) x(v, seg)
GROUP BY 1, 2, 3, 4, 5
UNION ALL
SELECT 'b_plan_region', 'ever', f.seg_ever,
       CASE WHEN p.clicked_in AND p.clicked_default THEN 'both' WHEN p.clicked_in THEN 'IN' ELSE 'default' END, NULL,
       count(*), count(*) FILTER (WHERE f.checkout), count(*) FILTER (WHERE f.money), NULL, NULL, NULL, NULL
FROM f JOIN pcr p USING (pid) GROUP BY 1, 2, 3, 4
UNION ALL
SELECT 'c_modal_reason', 'ever', f.seg_ever, mr.reason, NULL,
       count(DISTINCT mr.pid), count(DISTINCT pc.pid), count(DISTINCT mr.pid) FILTER (WHERE fm1.first_reason = mr.reason),
       count(DISTINCT mr.pid) FILTER (WHERE f.money), NULL, NULL, NULL
FROM mr JOIN f USING (pid) LEFT JOIN pc ON pc.pid = mr.pid AND pc.reason = mr.reason LEFT JOIN fm1 ON fm1.pid = mr.pid
GROUP BY 1, 2, 3, 4
ORDER BY 1, 2, 3, 4, 5;
-- part b columns: n = plan clickers, c_opened_challenge = checkout clickers, c_ran = trial or paid
-- part c columns: n = people shown that reason, c_opened_challenge = clicked a plan from it, c_ran = it was their FIRST modal, c_s1 = trial or paid (any time)
```
