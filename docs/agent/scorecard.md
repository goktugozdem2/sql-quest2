# Scorecard — the founder's metric frame, with measured baselines (2026-09-23)

The frame is the founder's (chat, 2026-09-23): five groups, 30-day targets,
a backward calculation from the 2026-12-08 objective, and five numbers read
every week. His own warning stands: at four subscribers every money ratio is
noise; the targets set direction, they are not evidence, and the industry
ranges are general knowledge, not a read done today.

What this file adds: every "today" measured on the same definitions, and the
rows the frame marked "not measured" that already were. Windows: people by
`aid`, internal accounts out, the rendering crawler of 09-17 → 09-23 out
(metrics.md, `first_solve_10m` trap). Cohort rows use people whose first
`app_opened` fell 2026-08-17 → 09-16 (n = 1,177) so each had seven days to
act; flow rows use the 30 days to 2026-09-23.

## 1. Activation

| Metric | Frame said | Measured | 30-day target | Metric |
|---|---|---|---|---|
| First open → correct solve in 10 min | 12.4% | **15.5%** | 20% | `first_solve_10m` |
| First open → opened a challenge (ever) | 59% | **58.0%** | 75% | `first_solve_10m` (secondary) |
| Opened → solved (people) | 41% | **51.8%** | 60% | `first_solve_10m` (secondary) |
| Challenge opened → first run (new) | — | from 09-23 | measure, then target | `open_to_first_run` |

12.4% was the 08-24 → 09-20 baseline; 15.5% is the later, overlapping
window. Both stand; read the trend from here on one definition.

**Where activation actually leaks (measured 09-23).** Of 5,505
person-challenge opens in 30 days, 73% were solved. Of the 1,482 that were
not, **92% never ran a submit** — no SQL error, no wrong result. Only 4.5%
ended after a wrong result and 3.2% after an SQL error. The leak is between
opening a challenge and running anything, which is why `challenge_first_run`
exists from today. The first screen test (`firstScreenChallenge`, queue row
2) and the diagnosis panel (`diagnosisHints`, row 1) are the two flags aimed
at this.

## 2. Product quality

| Metric | Frame said | Measured | Target | Metric |
|---|---|---|---|---|
| Wrong result → solves the same challenge | not measured | **88.7%** of challenge pairs (people, 24 h: 87.4%) | 60% | `hint_to_solve` |
| SQL error → solves the same challenge | — | **81.8%** | — | `hint_to_solve` (errored arm) |
| Solves without opening the hint | not measured | from 09-23 | track | `hint_opened_rate` |

The 60% target is already beaten by a wide margin, so it is not the lever:
people who get feedback mostly finish. The ones who leave never ask for
feedback — see §1.

## 3. The middle of the funnel

| Metric | Frame said | Measured (30 d) | Target | Metric |
|---|---|---|---|---|
| Solver → sees the price modal | not measured | **52.3%** (cohort) | 20% | `modal_click_rate` family |
| Modal → sent to Stripe | not measured | **2.3%** (6 of 257 people) | 30% | `checkout_abandonment` |
| Stripe → paid | not measured | **33%** (2 of 6) | 50% | `checkout_abandonment` |
| Visitor → payer, end to end | ~0.25% | **0.05%** (2 of 3,864) | 1% | `visitor_to_payer` |

All of these events existed (`pro_modal_shown`, `pro_plan_clicked`,
`pro_checkout_clicked`, `pro_checkout_returned`, `pro_checkout_expired`,
`pro_purchase_completed`); no new event was needed. The measured shape moves
the priority: people see the modal far more than the target asks (52%), and
almost nobody goes from the modal to Stripe (2.3% against 30%). **The middle
leak is modal → Stripe**, not activated → modal. 0.25% end to end was four
payers over ~1,577 visitors; the 30-day window has two payers
(`stripe_webhook`) over 3,864 people who viewed a landing page or opened the
app. That count still includes crawler landing views, so treat 0.05% as a
floor.

## 4. Revenue and retention

| Metric | Frame said | Measured | Target | Source |
|---|---|---|---|---|
| Active subscribers | 4 | **3**: sergelafarge (annual), harinivr02 (annual), jeromezhao (monthly, cancel intent, access to 10-01). sab3r ended 09-22. | — | Stripe; `users.data` read 09-23 |
| Annual share | 2/4 | **2/3** | 50% | same |
| Second-month churn | not measured | both monthly payers cancelled or tried to before renewal (2 of 2 by intent) | < 30% | `payer_churn` |
| Refunds | 0% | 0 real (test7 was a test) | < 5% | `pro_refunded` |
| Second session within 7 days | not measured | **16.2%** | 25% | `second_session_7d` |

## 5. Health

| Metric | Target | Where it is read |
|---|---|---|
| Daily payment-path smoke | 100% | VPS fleet (not yet installed) |
| Queries > 200 ms with > 1,000 calls | 0 | the 09-23 check task, then the smoke bot's daily check |
| Interactive in | < 3 s | smoke bot's first check (docs/plans/smoke-bot-rollback) |

## The backward calculation, on measured numbers

Per month now: ~1,200 new people × 15.5% activated ≈ **185 activated** ×
~1.1% activated → payer ≈ **2 payers**. The objective (50/month) needs, for
example, 4,000 × 25% × 5% = 50. The founder's order holds — activation, then
the funnel, then traffic — with one amendment from the data: inside "the
funnel", the step to fix is modal → Stripe (2.3%), not reaching the modal.

## The five numbers, every week

Read in the Friday table (`weekly-funnel-friday`), same windows each week:

1. `first_solve_10m`
2. `visitor_to_payer`
3. `hint_to_solve` (wrong result → solved)
4. `second_session_7d`
5. Active subscribers (Stripe)

Everything else is diagnosis, read when one of the five moves.

## The Friday table

One row per read, same definitions as the sections above unless the row
says otherwise; bots out (`metadata.bot`, viewports `tablet:800x600`,
`desktop:1280x1200`, `desktop:1919x992`, `ref:aocr.org`), internal accounts
out. The O2 columns are defined in `docs/agent/objectives.md`.

| Read | `first_solve_10m` | `visitor_to_payer` | `hint_to_solve` | `second_session_7d` | Active subscribers | O2: payers / 30 d | O2: six-solvers / 30 d |
|---|---|---|---|---|---|---|---|
| 2026-09-23 (the frame) | 15.5% (first opens 30 d) | 0.05% (2 ÷ 3,864) | 88.7% (pairs, any later solve) | 16.2% (first opens 08-17 → 09-16) | 3 (Stripe) | 2 | — |
| **2026-11-22 — Sunday extra read (B2), not a Friday** | **14.8%** (first opens 11-08 → 11-21, n 379; 11.6% the two weeks before, n 558) | **0.05%** (2 ÷ 3,970, 10-24 → 11-22; a floor — landing views still hold unfingerprinted crawlers) | **80.3%** (367 / 457 wrong submits → that challenge solved within 60 min, 10-24 → 11-22 — the 60-minute form the 11-22 P1 verdicts use, 84.9% for 09-30 → 11-20) | **6.9%** (first opens 11-01 → 11-14, n 390; 7.9% the two weeks before, n 559) | **5** (3 annual, 2 monthly; `users.data` + webhook rows, not Stripe) | **3** at 09:29Z (2 from 16:37Z) | **64** (day 0, 11-10: 72) |
| **2026-11-27 — Friday, first on the human block (B2)** | **23.8%** (36 / 151 new human openers 11-20 → 26; 15.3%, 23 / 150, the week before; p 0.08) | **0.10%** (2 ÷ 2,090 human visitors, 30 d to 11-26; 6 trials, not added; 0.09%, 2 ÷ 2,110, 30 d to 11-19) | **73.3%** (77 / 105 person-challenges, 49 people, 11-20 → 26, wrong submit → solved ≤ 60 min; 82.3%, 116 / 141, the week before) | **12.0%** (18 / 150, cohort 11-13 → 19; 14.6%, 18 / 123, cohort 11-06 → 12) | **4** (1 monthly, 3 annual; MRR $49.58; 1 in trial; Query 3) | — | — |

Notes on the 11-22 row:

- **`second_session_7d` is the number that moved:** 6.9–7.9% against the
  16.2% baseline, on the same query. It is read over every first
  `app_opened`, so it includes guests who never solved; the first-screen
  claim's people (assigned within 2 minutes) are a different population.
  Diagnose before acting: `app_opened` rows per first-open person halved
  (2.13 for the 08-17 → 09-16 cohort, 1.13 for 11-01 → 11-14) while the
  share who ever solved fell less (35.1% → 26.3%). An `app_opened` that
  stopped firing on a return visit — the 10-08 bot-stamping change (#49) is
  the one commit since September that touches the event — would read
  exactly like this. BACKLOG line, owner B1.
- `first_solve_10m` here is all first opens; the first-screen verdict's
  37.2% is the challenge arm among people assigned within two minutes of
  their first open. Both stand on their own definitions.
- The O2 day-0 row, the factor that is short (six-solvers, 4–5×) and the
  12-10 gap are in `docs/agent/objectives.md`.

Notes on the 11-27 row (`docs/reads/scorecard-2026-11-27.md`):

- **A new series from here.** Every number is on the person-level
  exclusion block of `scripts/scorecard-weekly.sql` (plus A2's walk aids,
  this read), so the 11-22 row's rates are not on it. Read week over week
  from this row.
- **6+ distinct solves in 7 days** (the tournament's decision metric):
  **11.3%** (17 / 150, cohort 11-13 → 19) vs 12.2% (15 / 123, 11-06 →
  12); the plan's baseline 11.8% holds.
- **Interview-target vs everyone else** (#409, entry version):
  first_solve_10m 23.5% (8 / 34) vs 23.9% (28 / 117) this week, 7.1%
  (3 / 42) vs 18.5% (20 / 108) the week before; 6+ in 7 d 9.5% (4 / 42)
  vs 12.0% (13 / 108); second_session_7d 11.9% (5 / 42) vs 12.0%
  (13 / 108).
- No change is beyond noise at n ≈ 150 (largest: first_solve_10m, p 0.08,
  carried by the interview-target segment in the week `companyDirectOpen`
  went live — whose own read does not show `direct` ahead).

## The A01 human scorecard (investor plan, from 2026-11-25)

One table on bot-filtered **people**, every Friday (B2), from
`scripts/scorecard-weekly.sql`; definitions in `docs/agent/metrics.md`
(`human_visitors`, `scorecard_weekly`). Weeks are complete ISO weeks,
Monday 00:00 UTC. Each Friday appends a new block with all eight weeks
re-read — earlier blocks are not edited, and a block read with a changed
exclusion list says so.

### 2026-11-27 — A01 human scorecard (first)

Read 2026-11-25 (Wednesday) through the read-only MCP, file as committed
with this block. Weeks W40 (09-28) → W47 (11-16 → 11-22); W48 is not
complete and is not shown.

**google_ua excluded (C8 11-25).** Re-read the same day on the new rule
(PR #391): a `landing_view` whose `ua` names GoogleOther or
Google-NotebookLM, never an `app_opened`. It removes 48–182 "people" a week
from human visitors (W47: 715 → 569) and changes nothing else: none of
them ever opened the app, so every opener, solver, modal and money column
is as first read (W47 `activated_7d` 49 → 50 is the open runway filling).

**Visitors and the product funnel (people).**

| Week | Raw visitors | Human | Not human | App openers | New openers | Activated ≤ 7 d | Solvers | New six-solvers | Day-0 solvers → back ≤ 7 d | Modal | Checkout click |
|---|---|---|---|---|---|---|---|---|---|---|---|
| W40 09-28 | 2,326 | 663 | 71.5% | 368 | 275 | 103 (37.5%) | 117 | 42 | 98 → 25 (25.5%) | 71 | 5 |
| W41 10-05 | 1,989 | 795 | 60.0% | 368 | 306 | 92 (30.1%) | 100 | 36 | 87 → 28 (32.2%) | 52 | 8 |
| W42 10-12 | 1,703 | 826 | 51.5% | 238 | 183 | 73 (39.9%) | 89 | 30 | 71 → 19 (26.8%) | 44 | 3 |
| W43 10-19 | 1,425 | 587 | 58.8% | 216 | 171 | 59 (34.5%) | 67 | 13 | 55 → 11 (20.0%) | 35 | 4 |
| W44 10-26 | 1,531 | 512 | 66.6% | 200 | 150 | 54 (36.0%) | 60 | 11 | 52 → 11 (21.2%) | 24 | 4 |
| W45 11-02 | 2,050 | 504 | 75.4% | 177 | 131 | 46 (35.1%) | 55 | 15 | 45 → 8 (17.8%) | 31 | 1 |
| W46 11-09 | 1,002 | 510 | 49.1% | 172 | 138 | 49 (35.5%) | 53 | 18 | 43 → 9 (20.9%) | 32 | 5 |
| **W47 11-16** | **1,199** | **569** | **52.5%** | **188** | **148** | **50 (33.8%)\*** | **59** | **14** | **46 → 7 (15.2%)\*** | **29** | **3** |

\* W47's 7-day window is still open (runway ends 11-29): floors.

**Money (`reason = 'stripe_webhook'` only; trials and payments never added).**

| Week | Trials started | Payments (first charge) | Paid | Renewals | Refunds | Failed charges (invoices) |
|---|---|---|---|---|---|---|
| W40 | 0 | 1 | $9 | 1 | 1 | 2 |
| W41 | 2 | 0 | — | 0 | 0 | 0 |
| W42 | 1 | 0 | — | 0 | 0 | 1 |
| W43 | 1 | 1 | $29 | 0 | 0 | 1 |
| W44 | 1 | 0 | — | 0 | 0 | 2 |
| W45 | 0 | 1 | $29 (a trial's conversion) | 0 | 0 | 1 |
| W46 | 3 | 0 | — | 0 | 0 | 1 |
| **W47** | **1** | **1** | **$99** (a trial's conversion) | 0 | 0 | **1** |

**MRR snapshot (2026-11-25): $49.58** — 4 paying subscribers (1 monthly,
3 annual) at the price each pays; 1 more inside a free trial; 1 live
lifetime grant outside MRR. The 11-22 row's fifth subscriber (monthly) went
`past_due` on 11-23 and its paid period has ended, so it is out. Not the
Stripe dashboard read (A02).

**Human visitors by source — people (of them solved in the week).**

| Week | search:google | search:bing | ai | direct/home | other |
|---|---|---|---|---|---|
| W40 | 171 (32) | 182 (57) | 28 (4) | 192 (4) | 90 (20) |
| W41 | 227 (38) | 156 (39) | 16 (2) | 319 (8) | 77 (13) |
| W42 | 190 (30) | 111 (43) | 5 (0) | 460 (9) | 60 (7) |
| W43 | 192 (26) | 93 (25) | 18 (3) | 232 (6) | 52 (7) |
| W44 | 190 (25) | 75 (17) | 20 (4) | 182 (7) | 45 (5) |
| W45 | 173 (21) | 57 (13) | 32 (7) | 207 (7) | 35 (7) |
| W46 | 198 (24) | 43 (9) | 29 (2) | 214 (10) | 26 (8) |
| **W47** | **231 (34)** | **38 (10)** | **21 (1)** | **244 (4)** | **35 (9)** |

**By country (zone proxy; top 5 over the eight weeks) — people (solved).**

| Week | IN | US | GB | HK | SG | other |
|---|---|---|---|---|---|---|
| W40 | 242 (65) | 125 (17) | 26 (6) | 28 (0) | 26 (0) | 216 (29) |
| W41 | 239 (51) | 213 (10) | 37 (5) | 43 (0) | 37 (3) | 226 (31) |
| W42 | 166 (41) | 333 (7) | 27 (7) | 48 (1) | 61 (3) | 191 (30) |
| W43 | 145 (28) | 172 (8) | 27 (1) | 14 (0) | 29 (1) | 200 (29) |
| W44 | 118 (16) | 117 (9) | 21 (4) | 47 (0) | 37 (3) | 172 (26) |
| W45 | 101 (22) | 129 (9) | 24 (2) | 27 (0) | 22 (0) | 201 (22) |
| W46 | 88 (12) | 157 (10) | 22 (5) | 20 (0) | 20 (0) | 203 (26) |
| **W47** | **98 (17)** | **143 (8)** | **27 (7)** | **21 (0)** | **31 (0)** | **249 (26)** |

**By first landing page — people (solved).**

| Week | company | /sql-exercises/ | topic / question | blog | home | other | app only |
|---|---|---|---|---|---|---|---|
| W40 | 54 (7) | 208 (65) | 102 (10) | 34 (0) | 84 (14) | 81 (13) | 100 (8) |
| W41 | 82 (8) | 188 (42) | 170 (22) | 44 (5) | 78 (11) | 106 (5) | 127 (7) |
| W42 | 69 (8) | 142 (46) | 348 (9) | 44 (1) | 54 (5) | 120 (6) | 49 (14) |
| W43 | 70 (9) | 110 (23) | 121 (11) | 42 (2) | 75 (12) | 127 (6) | 42 (4) |
| W44 | 87 (10) | 76 (15) | 136 (17) | 48 (1) | 51 (5) | 69 (6) | 45 (4) |
| W45 | 68 (13) | 68 (14) | 106 (9) | 54 (1) | 57 (6) | 120 (9) | 31 (3) |
| W46 | 67 (7) | 48 (10) | 105 (13) | 79 (4) | 67 (12) | 114 (6) | 30 (1) |
| **W47** | **107 (12)** | **39 (8)** | **133 (13)** | **64 (0)** | **60 (10)** | **127 (9)** | **39 (6)** |

**The raw-vs-human gap, by the first rule that removed each person (Query 4).**

| Week | Human | viewport | ref_spam (aocr) | cn_reader | cn_app | utc1280 | app1lang | utc_landing | bot_stamp | google_ua | google_ua:notebooklm | langs2 | rest |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| W40 | 663 | 3 | 0 | 154 | 101 | **1,347** | 0 | 0 | 0 | 31 | 17 | 2 | 8 |
| W41 | 795 | 569 | 0 | 186 | 359 | 3 | 1 | 0 | 2 | 29 | 23 | 20 | 2 |
| W42 | 826 | 397 | 0 | 264 | 109 | 0 | 5 | 0 | 4 | 52 | 10 | 33 | 3 |
| W43 | 587 | 331 | 0 | 355 | 30 | 0 | 1 | 0 | 1 | 91 | 11 | 18 | 0 |
| W44 | 512 | 210 | 189 | 315 | 114 | 0 | 5 | 0 | 2 | 125 | 15 | 44 | 0 |
| W45 | 504 | 488 | **627** | 218 | 48 | 0 | 3 | 0 | 4 | 130 | 5 | 23 | 0 |
| W46 | 510 | 48 | 0 | 188 | 13 | 0 | 49 | 0 | 0 | **172** | 10 | 12 | 0 |
| W47 | 569 | 48 | 0 | 196 | 28 | 0 | 86 | 72 | 41 | 135 | 11 | 11 | 2 |

"rest" = internal accounts, the LA/1920x1080 pre-stamp shape, `topic1lang`.
`google_ua` = GoogleOther; `google_ua:notebooklm` = a NotebookLM fetch,
which a person asked for: an AI-assistant signal, not a visit.

**Notes.**

- **Raw vs human.** 49–75% of the people the site records in a week are
  not people. Raw visitors swing 1,002 → 2,326 with crawler waves while
  human visitors stay in a 504–826 band; any raw series (Vercel included)
  reads crawler weather, not demand. Three waves were new to this read and
  are now rules (metrics.md shared traps, README rule 2): `utc1280` —
  1,347 app "openers" with a spoofed `search:google` in W40, which alone
  would have read as 2,111 human visitors that week — `cn_app`, and
  `google_ua` (C8 11-25: GoogleOther 29 → 172 a week, all in
  `direct/home` and the US row).
- **Human visitors is a ceiling, app openers the firm count.** Still inside
  "human": HK / SG landing-only readers (HK opened the app once in eight
  weeks) and US no-source landing rows, which is most of `direct/home`
  (244 people, 4 solvers in W47; it was 390 before `google_ua`). C8 owns
  fingerprinting them.
- **What the table says.** Human visitors fell from ~800 (W41–42) to
  ~500–570 (W44–47); before `google_ua` the series looked flat because
  GoogleOther rose as people fell. App openers halved from W40–41 (368)
  to W45–47 (172–188), and new six-solvers went 42 → 11–18. The loss is
  the Bing `/sql-exercises/` door (search:bing 182 → 38 people, 57 → 10
  solvers) while Google held (171 → 231 people). Company pages grew
  54 → 107 people (not 59 → 186: the rest was GoogleOther) with ~10
  solvers a week — consistent with the 11-22 funnel read. Activation of
  new openers held at 33–40%; the day-0 solvers' 7-day return fell from
  25–32% (W40–41) to 18–21% (W43–46).
- **Reproduction.** New six-solvers match B1's 11-22 weekly "Solve 6"
  column in all eight weeks (42, 36, 30, 13, 11, 15, 18, 14); trials and
  purchases match its webhook columns; modal people are within 4.
- **Money is tiny and lumpy:** 4 first charges in eight weeks ($166), 9
  trial starts, 1 refund (W40, a September monthly payer, full), 9 failed
  invoices. At n = 0–3 a week no money ratio is readable; read the counts.

### 2026-11-27 (Friday) — A01 human scorecard, re-read on the A2 rule

Read 2026-11-27 ~12:45 UTC, file as committed with this block: the
exclusion block now also drops A2's live-QA walk aids (every `aid`
starting `a2a2`, plus `d9fe96e2…`; README rule 2). **Query 1 reproduced
the 11-25 block's W40–W47 table exactly, in every column** — the A2 aids
all fall in W48 (11-26), which is not complete — and Query 3 reads the
same snapshot (4 paying, MRR $49.58, 1 in trial, 1 lifetime). Queries 2
and 4 were not re-run: their W40–W47 inputs are the same rows under the
same rules. W47's `activated_7d` (50) and `returned_7d` (7) are still
floors; its runway closes 11-30. The first week to carry the A2 rule is
W48, in the 12-04 block. The five numbers of this Friday are in the
Friday table above (`docs/reads/scorecard-2026-11-27.md`).

