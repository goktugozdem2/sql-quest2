# BACKLOG — ranked by impact (audit of 2026-10-06)

Concrete issues found in the repo and the production data, highest impact
first. Each line says what is wrong, the evidence, and where to start. The
work order is `docs/PLAN.md`; the founder's open feature list is
`docs/plans/backlog-2026-09-21.md`. Numbers were measured on the date above —
re-measure before acting on one.

## Progress — the autonomous run from 2026-11-22

The founder's instruction (2026-11-22): keep developing without asking,
close the open items one by one, keep this file current. One item, one
branch, one PR. All of #77–#96 merged 2026-11-22 on the founder's "merge et hepsini";
main rebuilt clean, 2,709 tests, lint 0 errors. Each item below
carries its own **DONE** / **Status** line.

| # | item | PR | state |
|---|---|---|---|
| 6 | Capital One read + page | #77 | merged 11-22 |
| 11 | CDN pins + SRI | #78 | merged 11-22 |
| 28 | landing rows: crawler fingerprints | #79 | merged 11-22 |
| 19 | stale root copies | #80 | merged 11-22 |
| 22 | root notes → docs/archive | #81 | merged 11-22 |
| 14 | lint app.jsx (2 live ReferenceErrors) | #82 | merged 11-22 |
| 23 | build leaves the tree clean | #83 | merged 11-22 |
| — | overdue ledger reads (5) + this table | #84 | merged 11-22 |
| 10 | measure /app boot before splitting data.js | #85 | merged 11-22 |
| 12 | users_public readers | #84 | audited, no action |
| 9 | Google + Bing view (`search_weekly`) | #86 | merged 11-22 — founder applies the migration |
| 5 | tutor spend | #84 | volume read; dollars in the console (founder) |
| 20 | inline mirrors | — | already removed |
| 21 | lapsed-pro held until its copy is rewritten | #87 | merged 11-22 — founder deploys |
| 13 | resend-webhook signature, executed | #88 | merged 11-22 — founder deploys |
| 24 | CLAUDE.md: five sections to the archive | #89 | merged 11-22 |
| 13 | account-password, executed | #91 | merged 11-22 |
| 29 | (new) one SHA-256 for passwords | #91 | written up — founder's call |
| 17 | Quiz JSON-LD on question pages | — | closed, not doing (no rich result for SQL) |
| 15 | quota wall checked in a real browser (smoke) | #92 | merged 11-22 |
| — | `guest_resumed.solvedCount` was 0 on all 755 rows | #93 | merged 11-22 |
| — | syntax errors get the line that fixes them | #94 | merged 11-22 |
| idea 1 | quota wall headline says the trial | #95 | merged 11-22 |
| idea 3 | column mismatch gets one fix line | #96 | merged 11-22 |
| 8 | Google brand searches | #84 | read: demand, not ranking |
| — | P1 reads: diff panel FLAT, tutor HIT/MISS, picker MISS | #84 | written |
| — | `weakSkillNext` off (its falsification fired) | #90 | merged 11-22 |
| 16 | faq_open / scroll_depth | — | already fixed |
| 7 | Bing question pages | — | superseded by #72 |
| — | account ask at the 3rd solve (`signupAskAtThree`), ladder never asks twice | #98 | merged 11-22 |
| — | **first screen A/B over: challenge arm ships** (fs10 37.2% vs 15.5%, n 527/536) | #99 | merged 11-22 |
| — | deep link to a locked Hard → free Hard of the same kind (cold start) | #100 | merged 11-22 |
| — | Run / Submit on an empty editor run the starter (the first click was dead) | #101 | merged 11-22 |
| — | syntax / column errors get the one line that fixes them (`near "X"`, the missing column) | #94, #96 | merged 11-22 |
| — | quota wall headline says the trial ("Try Pro free for 7 days") | #95 | merged 11-22 |
| — | no tenth-solve ask in front of the quota wall (72% closed it in < 3 s) | #104 | merged 11-22 |
| — | ledger: tutor nudge HIT, guest continuity HIT/confounded, explain-approach MISS | #105 | merged 11-22 |
| — | "Explain your approach" box only on the live round | #106 | merged 11-22 |
| — | **monetization plan: 12 ranked ideas** (`docs/plans/monetization-ideas-2026-11-22.md`) | #107 | merged 11-22 |
| M-04 | "Try Pro free" in the header for free people with 3+ solves (`headerProButton`) | #108 | merged 11-22 |
| M-02 | company page hero names question 1 (32 pages) | #110 | merged 11-22 |
| M-06 | currency warning only on the Payment Link path (part 1; descriptor line waits on a receipt) | #111 | merged 11-22 |
| M-10 | last 48 h of a Stripe trial: date, price, what is left, Manage plan (`trialEndingLine`) | #112 | merged 11-22 |
| M-12 | quota wall names the person's company (`quotaWallCompany`) | #113 | merged 11-22 |
| M-07 | quota wall once a day, then inline — A/B by aid (`quotaWallInline`) | #114 | merged 11-22 |
| — | ledger: streak card (headline fired, split clears the card), access revoke HIT, users writes day-30 HIT | #109, #115 | merged 11-22 |

Founder decisions surfaced, not taken: the free quota's 10-09 rule fired
(2 < 3 → quota to 20) and was never asked; the session-token cut (item 1);
the Stripe endpoint's `setup_intent.setup_failed` subscription (item 2).

**Waiting on the founder (the session's permission classifier refuses
these to the agent):**
- `supabase functions deploy lapsed-pro resend-webhook` — the lapsed-pro
  hold (#87) and the constant-time Svix compare (#88) are merged but not
  live until deployed.
- `supabase db query --linked -f supabase/migrations/20261122100000_search_weekly_view.sql`,
  then the probe in `supabase/manual/20261122_search_weekly_view_probe.sql` (#86).
- The Anthropic console: this month's tutor spend against the $10 cap (item 5).
- Monetization items that need money, Stripe or deploys (plan doc, M-01/03/05/06 part 2/08/09/11): the day-7 charge fix (`stripe-webhook` deploy + `billingIssue` server-owned field + Smart Retries), the India one-time pass, the portal's cancellation reasons, the statement descriptor check from one receipt, annual-default trial, card-free trial, the expired-session recovery link.
- Stripe by hand: one mid-October trial may be paying two subscriptions (refund / dispute risk).
- Vercel Hobby build limit was hit on 11-22 ("retry in 24 hours"); merges #107–#115 deploy when it clears — check `/app.js` for `headerProButton` afterwards.

## Verdict follow-ups — B2, 2026-11-22 (each from a ledger verdict written today)

B2 builds none of these; each names the lane that owns it.

- **C1 — question pages: CTA above the description, schema below the fold.**
  Pre-written action of "question pages…" (falsification fired: 1.5%
  solved-one, 11 of 744 landers, vs 27.8% on `/sql-exercises/`). Read the
  Bing noindex claim (reads 2027-01-08) before shipping, so the two do not
  land in one window.
- **C1 — company pages: test the readiness block below the FAQ.** The
  company-template verdict's letter fired (9.6% < 25%), but its baseline was
  on another definition (same query before: 12.3%) — a test, not a settled
  fix.
- **B3 — tiebreakers in reference solutions, prompts that state the order.**
  The grader verdict (FLAT, falsification fired): tie rejections were rare;
  the next lever is content.
- **A2 — does the First 90 Days card render for a hired person?** One status
  set (10-19), zero `ticket_opened` rows ever.
- **B1 — `app_opened` per person halved (2.13 → 1.13) and
  `second_session_7d` fell to 6.9%.** Check whether #49 (10-08) changed what
  fires on a return visit before anyone reads retention (scorecard, 11-22).
- **B1 — three events that never fire:** `pro_modal_shown {reason:
  'email_link'}` (0 rows ever, though 80 activated notes went out),
  `cta_practice_validate_ai_sql_*` and `editorial_claudequest_click` (0 rows,
  14 app opens from that page).

## Content QA findings — Q1, 2026-11-22 (docs/reads/content-qa-2026-11-22.md)

D1 (challenge 323's example range) is fixed in #167. These are the author
lanes' calls:

- **DONE 2026-11-23: Easy cards that need a window function (D2).** The
  orchestrator decided it (#222, `orchestrator-decisions.md`): 320 and 321
  stay Easy as window on-ramps. Q1's check 5 now allows one Easy shape, a
  single window function over one table (PARTITION BY / ORDER BY only, no
  frame, CTE, subquery or join). Reverse rule: if either card's solve-through
  is more than 15 points below the Easy median on 2026-12-20, relabel both
  Medium.
- **B3 — on-ramp cards hand over the method and the query (D3).** Spot-checking
  the Chime set: the hints of 172, 174, 289 and 291 contain the query or most
  of it, and the prompts of 172 (LAG), 275 (strftime), 289 and 291 (CTE /
  LEFT JOIN / COALESCE) name the method. This is the 168–179 on-ramp and
  275–299 card-analytics style, and it conflicts with check 6 and with the
  company-page card rule. Start by counting the cards whose hint parses as
  SQL. Then decide, per set, whether the method text moves behind
  `practiceNote` the way the Capital One prompts did on 2026-09-19.
- **C1 — the rollup page's engine table has no dated read (D4).** PostgreSQL,
  SQL Server, Oracle, Snowflake, MySQL WITH ROLLUP and SQLite have no
  `docs/reads/` file. Fetch the vendor docs from the laptop, write the read,
  and cite it in `src/data/sql-rollup.js`.

## Routed by C7, question mining — 2026-11-22 (docs/reads/questions-2026-11-22.md)

- **C6: UPDATE with values from another table** (UPDATE … FROM in SQLite 3.33+, the correlated-subquery form, and MySQL's / SQL Server's spellings). Seven threads in run 1's sources (Quora, sqlite.org forum). Challenges 180–185 practise DML, but no page explains it. This is C6's DML item #1; the read has the links.
- **B3/C6 practice gap: a consecutive-calendar-day streak.** The window tutorial now works it on `logins` (5-day streaks for customers 4 and 8, the March-6 double login, the month boundary). No challenge asks it: challenge 68 is a ≤7-day-gap streak on orders, a different shape. One Medium/Hard challenge on `logins` with DISTINCT as the trap.
- **Q1/C1: hard-coded count on the window tutorial.** "SQL Quest has 68 window-function-specific challenges" and the related link "68 window function challenges" are literal numbers that `tests/site-counts.test.js` doesn't bind. Re-measure, then move them to a helper or drop the number. Left alone in the C7 PR because it isn't a question answer.
## GEO gaps — G1, 2026-11-22 (docs/reads/geo-2026-11-22.md)

G1 builds none of these. Each one names the lane that owns it. Baseline:
- Perplexity named or cited us in 3 of the 5 prompts it answered; it named us in 1 (a sign-in wall stopped it after 5 of 15).
- 0 of 15 prompts in the search proxy's top 10.

- **C2 — a page for "SQL practice with an AI tutor that explains my mistakes" (panel #8).** No page answers it, and neither console shows a matching query. The search proxy gives the slot to DataCamp's blog and academic papers. On the 2026-09-06 panel this was the family we won (4/4). The page shows the diagnosis on a real wrong query; `/vs-chatgpt/` already holds the rules for claims about AI.
- **C2 — a general "timed SQL mock interview" page (panel #11).** The mocks sit inside the Capital One and Revolut pages. dbSyntax, DataDriven and Exponent each have a dedicated page in the top 10. Say "Pro" and the free general mock, as the homepage FAQ does.
- **C2 — a general 2-week SQL interview plan (panel #13).** Only the Amazon page has one. The top 10 is Exponent, Coursera, datadriven.io and LearnSQL.
- **C2 — a Turkish interview-prep page (panel #15).** `/turkce-sql-ogren/` is a learn-SQL page. The Turkish top 10 is DataCamp TR, Guru99 TR and Techcareer.
- **C2 — `/meta-sql-interview/` ranks 20.1 on "meta sql interview questions" (GSC, 14 imp, 28 d; panel #10).** Fix the page's answer-first summary before building anything new.
- **C3 — third-party lists cited for panel prompts that do not name us.** Each was checked on 2026-11-22.
  - The lists: boot.dev best-sql-practice-sites (#1, #2), prepshotz best-sites and datalemur-alternatives (#1, #2), unchaindata best-sql-practice-sites (#1, #2), onjob.io sql-practice-sites (#1), tensortonic datalemur- and stratascratch-alternatives (#4, #5), analyticsinsight's 2026 top 10 (#2).
  - What C3 does: drafts only, behind the founder. A correction or suggestion note to each list's author, with facts from llms.txt.
  - The only list that names us is thequerylab.com, so it needs no note.
- **C3 — alternativeto.net lists DataLemur's alternatives (cited for #4) and does not list SQL Quest.** It is a user-submitted directory. C3 drafts the listing text; the founder submits it.

## Company research — R1, 2026-11-22 (docs/reads/companies/)

R1 builds none of these; each names the lane that owns it. Dossiers:
`capital-one.md`, `revolut.md`, `stripe.md`, `wise.md`, `jpmorgan.md`;
batch 2: `plaid.md`, `ramp.md`, `morgan-stanley.md`; batch 3:
`goldman-sachs.md`, `amazon.md`, `snowflake.md`; coverage and queue in
`INDEX.md`.

- **C1 — Capital One page + blog: cite the vendor, tighten the count.**
  CodeSignal's own help page (support.codesignal.com article 4407377178647)
  describes the Data Analytics Assessment as 70 minutes, **14 quiz + 1
  coding**, CSV data in any tool. That is the shape candidates report for
  Capital One. The page's "around 14 to 15 questions … plus one or a few
  written SQL" can become "15 items: 14 multiple choice + 1 coding". Add the
  vendor as a source row, and say that it does not name Capital One. New and
  page-ready: the 200–600 score scale, no published cut-off, and two retakes
  in 180 days (article 4407377197847). This also answers the Bing query
  "does capital one codesignal allow sql?": any tool for the CSV questions;
  the coding question is done in the platform.
- **C1 — Capital One page: say which role it is for.** Data scientists get a
  different CodeSignal: 4 Python/pandas tasks in 90 minutes (PracHub, interview
  Aug 2026, plus one aced.io report; medium). Capital One's own business
  analyst page describes cases, not a test (first-party). One line on the
  page stops DS and BA searchers from preparing for the wrong screen.
- **B3 — Capital One mock: 12 + 2 against the vendor's 14 + 1.**
  `capital-one-codesignal` runs 12 multiple choice + 2 written SQL. The
  vendor's assessment is 14 multiple choice + 1 coding. The 12 + 2 split was
  the founder's QA call on 2026-09-19, so changing it needs the founder's go.
  The page and the mock should at least not contradict the cited source.
- **C1 — Revolut page: second source, and two caveats.** Add PracHub's Data
  Analyst report (interview Feb 2026, published 2026-08-25): a four-question
  SQL technical screen after the HR call. With Interview Query, the round is
  now medium confidence. Also add Revolut's careers page (stage order:
  intro → coding challenges → technical → culture fit → team fit). Update
  "27 candidate reports" to Interview Query's current 30. Say that the live
  round's length disagrees inside one publisher (45 vs 60 min). Mark "top
  10%" and "MAU" as single-family; no second source confirms them.
- **C1 — Stripe page: from general to sourced.** Three dated candidate
  reports, Oct 2025 – Q4 2026, put live SQL in the Data Scientist and Data
  Analyst loops (high). The first round is a hiring-manager conversation with
  no coding (high). The DS loop has a one-week take-home: SQL or Python, a deck
  plus code (high that it exists; details from one report). These go in
  `SOURCED_FORMATS` or a template entry. The DA round's platform (HackerRank)
  and length (45 min) come from one report and must be worded as one
  candidate's account. Do not cite the "Stripe Candidate Recruiting Resource"
  Google Doc: it is engineering-only and its origin is unverified.
- **C1 — Wise page: one first-party row.** wise.jobs/analytics-case-study:
  the analyst take-home is returned within 7 days, about 2 hours suggested,
  no more than 3 hours. It is scored on analysis, problem solving and
  presentation, and names no SQL or tool. Other first-party lines: interviews
  default to Zoom, and AI use is allowed on the take-home if disclosed. **Do
  not state a "30-minute SQL interview"** (a Bing query asks for one). No
  source describes one; the 30-minute round on record is the recruiter/phone
  screen.
- **C1 — JPMorgan page: no change.** Nothing page-ready. Next step: a hand
  read in a browser of JPMorganChase's application PDF
  (`/content/dam/jpmorganchase/documents/careers/jpmc-ec-application-reflection.pdf`,
  over 10 MB, too large for the fetcher). Its search snippet names HireVue
  and HackerRank.
- **B3 — "define the metric, then query it" (no challenge has this form).**
  It is reported for Revolut (PracHub Feb 2026: success of a subscription
  launch; Interview Query: a new plan with no defined metric) and Stripe
  (S3: an abnormal metric; S8: choosing the metric was the hard part). That
  is 4 sources from 3 publishers. Every challenge in the bank states its
  metric. A two-step challenge on `finans_neobank` would fit: choose the
  metric that answers "did the premium tier launch work?", then compute it.
- **B3 — click-through rate from an event log.** Revolut, PracHub Feb 2026
  (low, one report): views and clicks per product, a ratio guarded against
  zero views, top 1. The bank has no event-log (view/click) table in any
  fintech dataset, and no CTR challenge.
- **B3 — combine fraud rules into one review list.** Revolut, PracHub
  Feb 2026 (low): write several rules, such as login country ≠ registration
  country or an amount or burst threshold, then flag the transactions with
  the rule that fired. Challenges 270–273 each teach one rule alone; none
  combines them.
- **B3 — reconcile two sources.** Find the rows missing on either side, and
  the matching keys whose amounts differ. Stripe data engineer (S10,
  synthesis) and JPMorgan analyst (J5, reconcile figures across reports):
  low–medium. No challenge does both-direction anti-join or full-outer
  reconciliation.
- Covered already, no B3 needed: completed spend within N days of sign-up
  (303, 311), chargeback rate per merchant (280), decline rate (305),
  top 10% by volume (302), MAU (301). The Stripe variants add a trailing
  30-day window and a per-day split; those are content edits to 280 and 305,
  not new shapes.
- **C1 — companies with demand and no page: none found.** About 60 large
  employers were checked in gsc_daily and bing_stats over 90 days; no
  interview-intent query turned up. GSC cannot see queries for pages we lack,
  so take C7's clusters instead and re-check monthly (`INDEX.md`).

### R1 batch 2, 2026-11-22: Plaid, Ramp, Morgan Stanley

- **C1 — Ramp page: wait for one more source, then make it sourced.** Two
  dated candidate sources from two publishers put a **live SQL round** in
  Ramp's loops (medium):
  - Interview Query, Data Analyst, interviewed Q4 2025 (offer): SQL with
    date wrangling and edge cases, after a take-home case presented to a
    panel.
  - DataDriven thread, analytics engineer, 2026-08-27: a live CodeSignal
    session, 8 SQL questions + 3 follow-ups.

  Do not state yet: the platform (one AE thread, possibly a Blind repost),
  the take-home or the "AI interview + one-hour assessment" (one report
  each). If C1 wants a line now, it can say that candidates for analyst and
  analytics-engineering roles report a live SQL round, citing both, and
  nothing more. Otherwise keep "no dated public source" until a third source
  is found. The postings' "SQL (preferably Redshift, Snowflake, BigQuery)"
  is a first-party fact about the job, usable in the topic sentence.
- **C1 — Plaid page: no change.** No candidate report was opened. The only
  facts are first-party job text: every data posting names SQL, with dbt
  for analytics engineering and DBT/Airflow/Redshift for data engineering.
  The page's "no dated public source" stays true.
- **C1 — Morgan Stanley page: no change.** The one opened SQL-test report
  (GfG, data engineer, 2021: a 2-hour HackerRank test with an SQL section)
  is too old and too single to state. The first-party video-interview line
  names no vendor. The data-analyst reports are on Glassdoor and Interview
  Query, both unreadable this run.
- **B3 — a calendar spine (fill the missing days) on a fintech dataset.**
  Ramp's DA report (Q4 2025, low) names date wrangling with edge cases as
  the hard part. The bank has date math, rolling windows (50, 319) and
  streaks, but no challenge builds a day-by-day series with zero-activity
  days (a recursive date CTE LEFT JOINed to activity). Only 44, 81 and 274
  use a recursive CTE, and none for dates. Fit: daily card spend per
  account on `finans_neobank` with gaps, then a trailing 7-day sum that
  counts the empty days.
- **B3 — rolling distinct active users (trailing 7 days, per day).** A
  Dataford snippet (not opened) names it for Ramp DA. PracHub's Ramp and
  Plaid templates (low) name trailing-window rates. Challenge 60 counts
  daily distinct actives and 50 smooths revenue, but none counts *distinct*
  users over a trailing window, which cannot be a window COUNT(DISTINCT) in
  SQLite. Low; build only if B3 has a slot.
- **B3 — success rate per counterparty over a trailing window.** Plaid
  (PracHub template, low): API-call success per institution over 7 days.
  The fintech datasets have no request/attempt log. The nearest is the
  decline rate (305). If built, put it on `finans_neobank` card
  authorisations (approve/decline per merchant, trailing 7 days).
- **B3 — "how many rows does this join return?" as a mock MCQ.** Morgan
  Stanley DE (GfG 2021, low): predict each join type's row count when the
  key repeats on both sides. Challenges 291/298 and `/sql-join-fan-out/`
  teach the fan-out by writing a query; no MCQ asks for the count. That is a
  mock-question edit, not a new challenge.
- Covered already, no B3 needed:
  - nth-highest and top-N per department (29, 48, 89, 163);
  - median without PERCENTILE (72; none on fintech data, a minor gap);
  - cohort retention (88, 303);
  - period-over-period (84, 126).
- Plaid's settlement reconciliation by currency (PracHub, low) joins the
  existing **"reconcile two sources"** B3 line above as a third report.

### Batch 3, 2026-11-22: Goldman Sachs, Amazon, Snowflake

Dossiers: `goldman-sachs.md`, `amazon.md`, `snowflake.md`.

- **C1: Amazon page, add Amazon's own BIE process.** Amazon's BIE
  interview-prep page (atoz.amazon, 301 from amazon.jobs `bie-interview-prep`;
  first-party, undated) names an **online assessment** with a SQL challenge,
  a "Working with SQL" part and a Work Styles survey, open for 7 days. It
  also names a 60-minute phone screen with a senior leader (SQL, technical,
  Leadership Principles), a loop of **five 55-minute interviews**, and four
  competencies: SQL and scripting, analytical problem solving,
  visualisation/metrics/reporting, and business acumen.
  `SOURCED_FORMATS.amazon` has no OA row and cites only Blind and Exponent
  for the stages. Add the first-party source and an OA row. "About five
  rounds … 45 minutes to an hour" can become "five interviews of 55 minutes
  (Amazon)". Keep the 75-minute phone-screen reports as candidate reports
  (Blind 2025; PracHub Sep 2026, where it ended at about 60).
- **C1: Amazon page, "three SQL problems in an hour" now has two reports.**
  These are the round reported to us (BIE, Oct 2026) and PracHub's Business
  Analyst screen (Jul 2026, published 2026-09-05: three SQL questions, a
  behavioural deep-dive and a business case). Medium, across two roles, so
  the row can say "two candidates in 2026" and name both roles. A dashboard
  design task (PracHub BIE, Sep 2026) matches Amazon's named visualisation
  competency. One line, medium.
- **C1: Amazon page sits at position 36–46** for "amazon interview questions
  on sql" (82 impressions / 90 days) and "amazon sql interview questions"
  (29). It has demand and no rank. Adding the first-party facts above is the
  content side; C1 owns the rest.
- **C1: Goldman page, say whose "Analyst" it is, and cite three reports.**
  Every readable report is an engineering-division **Analyst**, which is
  Goldman's corporate title, not the data-analyst role. That holds for
  GfG 2024 (on the page), GfG campus (last updated 2023-01-02) and
  lets-code.co.in Summer Analyst (interviews 2025-07-16). In all three, SQL
  comes inside live mixed rounds next to DSA problems, and the OA has no SQL
  (GfG ×2 + LinkJob). Fixes: the page's "Where SQL appears" row (one source
  today) can cite three; the description "the analyst process" should say
  engineering Analyst; and the page should say that no data-analyst report
  could be read. The Goldman page has 5 impressions in 28 days and no
  query, so this is accuracy, not traffic.
- **C1: Snowflake page, no interview-format section.** All 11 clicks in
  90 days came from dialect queries ("snowflake sql practice", position
  2.0). Snowflake's own hiring page covers engineering only and does not
  mention SQL, and every analyst or analytics-engineer report is on
  Glassdoor, Blind or Interview Query, which are unreadable. Keep the page
  dialect-first. Do not add "How the interview runs (sourced)" until an
  analyst report can be read. (Note: the title's "95 Runnable Challenges"
  is a count. Check it against the site-count helpers; that is C1's lane,
  not R1's.)
- **B3: effective-dated salary history.** Goldman (GfG 2024, medium with the
  September read): employees + salary history with start/end dates +
  departments. Find each active employee's current salary, then the top
  three departments by average. The `employees` dataset is one table with
  no history, so **no challenge picks "the row that is current" from a
  date range**. Fit: a new `salary_history` table, or account-tier history
  on `finans_neobank`.
- **B3: share threshold against a company benchmark, year over year.**
  Amazon BIE (PracHub, Sep 2026; low, one report): departments where more
  than half of employees beat their quarterly target but sales growth is
  below the company average. The pieces exist separately (30 YoY,
  108 above-average, 169 share), and nothing combines a conditional-
  aggregation share, a company-level CTE and YoY in one HAVING. There is no
  targets table.
- **B3: a bridge table and the fan-out it causes.** Two companies, low each.
  Amazon's follow-up asks about an employee in two departments. Snowflake's
  campus round (GfG 2023) asks for employees on at least one project and the
  department with the most active projects. No dataset has an
  employee–project or employee–department assignment table. Teach EXISTS
  vs JOIN (no duplicated employees) and count after dedupe. This joins the
  `/sql-join-fan-out/` trap.
- **B3: UNION with a source tag (the trap).** Goldman campus (GfG 2023,
  low): return the distinct rows of two tables with a column naming the
  source. Challenge 27 does UNION ALL with a source column, but no challenge
  shows that a tag added before UNION keeps the cross-table duplicates.
  Small; mock MCQ or a Medium.
- Covered already, no B3 needed: dedupe keep-one (183, 73); nth-highest
  (29, 89); earns more than manager (17, 149, 315); consecutive days (318,
  319); above department average (131, 171); running totals (24, 173).

## SEO sentinel — S1, 2026-11-22 (docs/reads/seo-sentinel-2026-11.md)

- **C1 — RED: Bing index at 1.94 × the sitemap (`in_index` 833 vs 429
  URLs; `blocked_by_robots` 828, still +9 on 11-21).** This is the starting
  condition, diagnosed in `docs/reads/bing-drop-2026-11-22.md`.
  - The fix, #138 (the bingbot group), is live: robots.txt is byte-equal to
    main from the 12:15 UTC deploy on 11-22. No Bing data after it yet.
  - Under SEO-loop rule 1, no new page ships while red.
  - Watch: `blocked_by_robots` should stop rising by **11-26**, then fall
    with `in_index`. If it is still rising on 11-26, re-check that bingbot
    matches the group, for example with Bing's robots.txt tester (FOUNDER).
  - Red ends the day the ratio falls below 1.3.
  - The Bing clicks rule cannot fire while weekly Bing clicks are below 50
    (now 32 a week); the index ratio is the rule that sees the drop.
- **C1 — watch: Google positions on the `/sql-exercises/` queries.**
  - `sql practice exercises with solutions` 4.2 → 7.9 and `sql exercises`
    18.1 → 23.5, weeks 11-08 → 11-14 vs 11-15 → 11-21, on 12–27 impressions.
  - Confounded by #65's title change on 11-20. Change nothing on the page
    before #65's read on 12-12.
  - Escalate if the first query stays below position 7 for two more weeks.
- **A0 / orchestrator — amber: page PRs rate-limited on Vercel stay off the
  site when only docs merges follow.**
  - #144 and #146 show "Deployment rate limited", so production is still at
    35afda6d (#143). The live sitemap has 330 lastmods behind main.
  - `scripts/vercel-ignore.sh` diffs `HEAD^..HEAD` only, so every docs-only
    merge since then skips the build.
  - Fix: diff against the last deployed sha (Vercel documents
    `VERCEL_GIT_PREVIOUS_SHA` for this step; check it before relying on it),
    or push one non-docs commit after a rate-limited page merge.
  - This is a code change to the deploy path, so it goes to A1/A0.

## Funnel findings — B1, 2026-11-22 (docs/reads/funnel-2026-11-22.md)

Six-solvers 209 → 57 (first solvers 500 → 222, reach-six 41.8% → 25.7%;
windows 09-02 → 10-02 vs 10-23 → 11-22). ~62% of the drop is fewer people
solving anything; the `/sql-exercises/` Bing door alone is ~half of it.
Measurement ruled out (#49 changes nothing for real people). B1 builds
nothing for traffic; these lines are for the owning lanes.

- **C1 — Bing `/sql-exercises/` collapsed on impressions, not CTR.** Bing
  page slice, 4 weeks to 10-02 vs to 11-21: clicks 674 → 114, impressions
  11,296 → 3,290, position 6.0 → 7.3; site clicks 292/wk (09-21) → 21/wk
  (11-16). Every query fell together: `sql practice questions` 821 → 390
  impr (pos 5.0 → 6.3), `sql practice exercises` 279 → 132 (2.3 → 4.0),
  `sql practice` 2,545 → 609 (8 → 10), `sql exercises` 209 → 94 (3.0 →
  6.5), brand `sql quest` 360 → 177 (3.5 → 4.0). Site-level, not one
  query. Bing `in_index` rose 195 → 830 over the same weeks (the
  `/questions/` pages) — check whether the fall tracks the index bloat
  (#72's bingbot noindex, 11-20, is the live test; its read is 2027-01-08 —
  pull a 4-week interim on Bing impressions by 12-20). Also: Bing reports the
  homepage as `https://www.sqlquest.app/` (88 → 22 clicks), not the bare
  host — check which host Bing treats as canonical. This door made
  117 of 209 six-solvers in September; nothing in the app can replace it.
  **C1 read 11-22** (`docs/reads/bing-drop-2026-11-22.md`): the index growth
  is mostly not the question pages — `in_index` 830 vs a 422-URL sitemap;
  the robots-blocked `/app/?` URLs (0 → 819 from the 09-23 rule) fill the
  gap, and clicks peaked the week the rule shipped. Host, canonical, crawl
  status and the page's own edits ruled out. Code PR: bingbot may fetch the
  app URLs to read their noindex (A1). #72's `in_index` check is now
  confounded — read its own URLs.
- **C1 — the homepage lost half its views** (`landing_view` on `/`
  157–197/wk mid-September → 71–95/wk) while Google clicks stayed flat
  (~150/wk): find which Google/Bing queries used to land on `/`.
- **B1 (own, next run 11-24 / 12-01) — read the 11-23+ cohorts** on 1 → 3,
  3 → 6 and #94 → #95, split by `signupAskAtThree` exposure. #90
  (`weakSkillNext` off) and #98 (account ask at 3) landed the same day on
  the same step. Rules written in the read (§4): ≥ 36% 1 → 6 → the gap is
  traffic only; < 30% with #94 → #95 under 75% → B1's experiment is the
  post-solve handoff; 3 → 6 down only among people shown the ask → the ask
  goes back to the 10th solve.
- **B4 / FOUNDER — the quota halved returns.** Return within 7 days among
  people with 6+ first-day solves 56.3% → 26.9%, all groups down, step at
  the 09-28 cohort (first week under the 10-solve quota). It costs few
  six-solvers (most reach six in the first session) but it is the quota's
  retention cost; read it with the quota's 10-09 rule, not as activation.
- **FOUNDER (Stripe dashboard, ~15 min) — India checkout dies on Stripe's
  page before any card attempt** (`docs/reads/india-checkout-2026-11-22.md`).
  India-priced clickers: 17 in 90 days → 1 trial-or-paid (the same returning
  payer); rest 9 of 29. Since 10-08: 8 new India session starters, 0 trials,
  0 declines, 0 `pro_card_setup_failed` (0 rows ever, any region); median
  click → return 11 s (n = 7) vs ~76 s elsewhere. Open those 8 sessions and
  record: any payment/setup attempt, which methods were shown, RuPay under
  Cards, `setup_intent.setup_failed` on the endpoint. ≥ 3 of 8 with a
  declined attempt → issuer/3DS block (fix 3, on-session India pay); ≤ 2 →
  B1 builds the India card line + the return-reason tap (fix 2). Also read
  the one India trial's day-7 charge (due ~11-24 18:00 UTC) on 11-25.

## Decisions taken 2026-11-22 (founder: "kararlar sana ait olsun")

| Decision | Data | Next read |
|---|---|---|
| **Free quota stays at 10.** The 10-09 rule (2 < 3 → move to 20) is retired, not executed. | Since 09-26: 141 met the wall, 18 clicked (12.8%), 5 trials + 1 sale within 7 days — the wall is the surface that sells. Moving it to 20 would halve how many reach it. | quota_wall, 2026-12-20 |
| **`weakSkillNext` off** (#90). | Its own falsification: take rate 40.8% → 17.3% (29.3% → 15.7% under 10 solves). | — |
| **`diagnosisHints` stays on.** The written revert is not taken. | FLAT (84.9% vs 84.9%): no cost, no gain; the list it would restore says less. The rule's useful half — "read which kinds stall" — is done: `syntax_error` (75.1%) and `column_set` (69.7%) stall; #94 answers the first. | syntax claim, 12-20 |
| **Activation flag queue paused** (rows 3, 6, 7). | Row 3 reaches ~1.5 goal starters a week (12 in 8 weeks); rows 6–7 add questions before the first solve while `first_solve_10m` sits at its long-run ~13%. Work goes to the surfaces people actually reach: the challenge list, the quota wall, company pages. | revisit 12-20 |
| **No second AI-comparison page, no next trap batch, no blog exit.** | /vs-chatgpt/ 10 impressions; trap pages 352 / 500; blog 7 practice clicks — all pre-registered falsifications. | — |

Merging: the agent's merge call is refused by the session's permission classifier; PRs wait for the founder's merge (or a permission rule).

## Ideas — proposed 2026-11-22, each from a number read today

Ranked by expected effect on payers (O1: 50 a month by 12-08). Each would get a ledger claim when built.

1. **[BUILT — #95] Trial-first at the quota wall.** The wall sells (12.8% click) and the trial is how people buy (9 trials, most sales after a trial). Make "Start 7 days free" the wall modal's primary button, the plans second. Metric `quota_wall` trial starts per person; target 2× in 28 days.
2. **[PARKED 11-22 — the door is too small] A free first question of the Capital One mock.** Measured: ~3 clicks a month on the page's mock buttons, so even a 10× lift is a handful of people; the mock engine change is not worth its risk yet. Revisit if the Capital One page's clicks (#77) grow. 0 Pro modals from the Capital One / trap-page mock links in 28 days, 3 clicks on the page's mock buttons — the mock is a locked door with no window. Let question 1 of the 70-minute mock run free, then the modal (`mock_link`). Capital One is 2 of the first 3 payers.
3. **[BUILT — #96] `column_set` gets its own line** (69.7% recovery, the weakest kind): name the extra / missing column against the expected header (`SELECT *` → list them). Same pattern as #94.
4. **[PARKED 11-22 — measured small] Count AI-grounded impressions.** Measured: chat-shaped queries are ≤ 38 impressions per page in 28 days (the query explainer, the trap pages, two blog posts) and a crude classifier mixes in real Turkish searches; not worth a metric yet. Original idea: GSC query slices for trap and company pages are chat turns ("давай", "rispondi", pasted exam questions). A weekly count of chat-shaped queries per page (`ai_grounded_impressions`) tells which pages assistants retrieve — the channel two payers came through — and where an answer-first summary would be quoted.
5. **[READ 11-22 — hold, re-read 12-20] Company-set guardrail split.** Split done: Capital One / Revolut arrivals (gated) 45 people → 13 solved one, **1 reached six (2.3%)**, 10 met the set wall, 1 clicked, 1 trial-or-paid; every other company 216 → 42 → **16 (7.4%)**. The gated group reaches six less, but 1 / 44 against 7.4% is inside noise (Fisher p ≈ 0.25) and the gate has sold once. No money change on that n. Original idea: Reach-6 fell to 5.8% (12.4% before). Split by "met the set wall" before touching the gate; if the wall is the cost, open 5 of the Capital One set instead of 3 (that set's arrivals are the most valuable).
6. **[READ 11-22 — not built, population too small] Tutor ladder: bypass at 52%.** Read `docs/reads/tutor-ladder-2026-11-22.md`: 112 of 209 Help opens bypassed (median 29 s after the open), but only **21 people** bypassed on two or more challenges in 30 days (rule: ~30), and bypassers solve within the hour at **72.3%** vs 60.5% on rung 1 and 66.7% at rung 2+ — the bypass does not cost the solve. Found instead: the panel's rung count skips the silent opener, so the first typed follow-up gets rung 1 again; fixing that count is the smaller, everyone-wide change (own claim). Original idea: Half of Help opens skip to the answer. A/B rung 2 (the clause) as the opener for people who bypassed before — keep the 72% open→solve.
7. **Password hashing to PBKDF2 on next sign-in** (item 29): dual-scheme, account-login re-hashes after a successful check. Defence in depth; no user-visible change.
8. **Split data.js** only if `app_boot` (#85) shows `dataJsMs` ≥ 40% of boot at p75 in a band (read ~12-06).
9. **Brand demand** fell with mail volume (sends ~350 → 84–245 a week). A monthly "new questions for your company" note to engaged non-payers is the test — outward email, so it needs the founder's words.
10. **The `guest_resumed` fix (#93) unlocks a real continuity read:** how many solves people bring back on day 2+, and whether a "save your progress" ask at 3 solves (88% never sign up) moves sign-ups.

**Monetization ideas M-01…M-12 (2026-11-22)** — full write-ups with data, metric, falsification and test plan in `docs/plans/monetization-ideas-2026-11-22.md`; competitor read in `docs/reads/monetization-competitors-2026-11-22.md`. AGENT-NOW = ships without the founder; FOUNDER = price, Stripe setting, deploy, migration or outward email.

11. **M-01 [FOUNDER] The day-7 charge gets a self-serve fix** — 2 of 4 trials that reached day 7 failed the first charge (1 lost, $99); the failure email says "reply to me". Invoice link in the email + a past_due line in the app + Stripe Smart Retries. Also: check one possible double subscription by hand.
12. **M-02 [AGENT-NOW] Company pages hand off to the app** — the best money door (2.3% trial-or-paid per arrival) loses 81% of landing people before the app; hero CTA names question 1.
13. **M-03 [FOUNDER] India pays once, not by subscription** — a third of modal viewers; trial sessions start 1 of 8; the RBI e-mandate fails off-session charges. A $39 one-payment 12-month pass for IN only.
14. **M-04 [AGENT-NOW] A "Try Pro free" header button for free users at 3+ solves** — person-opened modals click 27–32% vs 3–13% for automatic asks; free users have no Pro button in the header.
15. **M-05 [FOUNDER] Cancellation reasons + one save offer in the Stripe portal** — 4 of 8 matured trials cancelled, reasons unknown. Dashboard only.
16. **M-06 [AGENT-NOW] Two untrue lines on the paying surface** — "Datrick, Inc." vs the SQLQUEST.APP descriptor; a local-currency warning the session path no longer needs. Founder confirms the descriptor from a receipt.
17. **M-07 [AGENT-NOW, A/B] The quota wall asks once a day, then waits inline** — 53% of wall people saw the modal 3+ times.
18. **M-08 [FOUNDER] The trial button defaults to annual (A/B)** — annual trial sessions start trials at 50% vs 25% monthly; clicks are 78% monthly.
19. **M-09 [FOUNDER] Card-free trial** — the 11-22 money-read proposal; build after M-01 (same add-a-card link).
20. **M-10 [AGENT-NOW] Trial ending line from 48 h before the charge** — date, price, what Pro still holds; fewer surprise charges and disputes.
21. **M-11 [FOUNDER] Expired Stripe sessions get their recovery link** — 23 expired / 30 d, 7 abandon mails; Stripe `after_expiration.recovery`.
22. **M-12 [AGENT-NOW] The wall's sub-line names the person's company** — small population (≤ 20 of 142 wall people); cheap.

## The activation read of 2026-11-22 (what the four PRs above answer)

New people 11-08 → 11-21, bots and crawler window sizes out: 394 → 271
opened a challenge (69%) → **119 ran a query (44% of openers)** → 98
solved (82% of runners). The leak is the first run. Three causes found
and fixed: the quiz-first screen (the A/B said so, 2.4× on first_solve_10m),
a dead Run/Submit on the empty editor, and an Easy starter offered to
people who linked in for a Hard. Next to read (12-20): `open_to_first_run`
and `first_solve_10m` after these three; the guest sign-up rate after #98.

## The money read of 2026-11-22 — where paying stops

30 days to 11-22: 120 people saw the Pro modal → 17 clicked a plan (14%)
→ ~20 Stripe sessions → **17 expired unpaid** → 5 trials + 3 purchases.
**15 of the 17 expired sessions were trial sessions** (12 default region,
3 India): the trial asks for a card ("nothing is charged today"), and most
stop at the card. The modal-to-click step (14%) and the card step are the
two leaks; the abandon mails run (7 `checkout_abandon`, 53
`modal_abandon` in 45 days; click tracking reads 0, so judge by returns).

**Proposal — a card-free trial (founder's call: money + deploy).** Stripe
can start a trial without a card (`payment_method_collection:
'if_required'`, `trial_settings.end_behavior.missing_payment_method:
'cancel'` is already set). It only pays if the person can add a card before
day 7, and today nothing lets them: no billing portal, and the trial
reminder links a Payment Link (a second subscription). Three pieces, one
flag (`cardlessTrial`, off):
1. `create-checkout-session`: `if_required` when the flag is on and the
   session is a trial.
2. A `billing-portal` edge function (Stripe Customer Portal session for
   the person's customer) and an "Add a card to keep Pro" line in the app
   from day 5 of a card-free trial.
3. `trial-reminder-cron` links the portal, not a Payment Link, for those.
Read: trial starts per Stripe session (today ~25%) and day-7 conversion
(today: every trial has a card). Falsification: day-7 conversion of
card-free trials under 20% → card-free trials only move the start number;
off. Not built autonomously: it needs two deploys and a money decision.

## Competitor watch — B6, 2026-11-22 (docs/reads/competitors-2026-11-22.md)

Ranked by expected money per hour. B6 builds none of these; each names its lane.
Every competitor fact cited must come from that read (URL + date).

1. **C5 — Capital One assessment block on the blog guide.** SERP for the
   assessment is Blind, Glassdoor, IQ and Dataford guides; nobody offers a
   timed rehearsal. Fetched, dated candidate reports → the mock → question 1.
2. **C5 (+B3) — Wise sourced format section + a 4-question / 60-minute set.**
   No page about Wise's SQL screen ranks; DataLemur's hit is WiseTech. Our
   page has no sourced format section.
3. **C1 — 301 `sql-quest2.vercel.app` → `sqlquest.app`.** The vercel.app host
   is indexed with $19 / 200+ / May 2026 copy. Check Supabase Auth Site URL
   and redirect URLs first (`src/data/config.js` names the vercel.app host).
4. **C2 — drop the AI-coach exclusivity on the comparison pages.** "No other
   platform has it" is stale: StrataAI tutor (10-27), LDS Socratic mentor,
   Aced AI feedback. Keep the specific, still-true claims.
5. **C5 — Revolut: cite the two PracHub candidate reports** (0 today) and put
   the Revolut mock above the fold.
6. **C5 / C1 — Monzo: question 1 and readiness test above the fold;** C1
   checks why the page is absent from an empty SERP.
7. **B4 — price landscape for the monthly read.** $10–15/mo annual cluster,
   Dataford annual = $99 = ours, three lifetimes, LeetCode Black Friday code.
   No agent changes a price.
8. **C2 / C5 — say what a free account gets after a wrong answer** (the
   diagnosis, from `freeTierSentence`); the market's top complaint is
   paywalled solutions. No competitor named.
9. **C6 — cohort retention + funnel conversion topic funnel** (Revolut,
   Chime reports); C7 confirms demand.
10. **backlog (orchestrator) — mock follow-up question** after a correct
    answer, graded by the diagnosis. AI mocks are table stakes in the set.
- **C3 (founder's hand)** — alternativeto.net and the dev.to post state
  $19 / 200+ / 10 categories.

## P0 — security and money

1. **Any account's data can still be overwritten with the public anon key.**
   Session tokens are recorded but not enforced (step 4 of
   `docs/plans/account-session-tokens-2026-09-22.md`, "the cut"). In the 7
   days to 2026-10-06, `session_token_misses` logged 50 calls without a token
   from 33 usernames — the cut would refuse those, so the client paths that
   still send none must be found first. Needs the founder's go.
2. **A trial's card failure is invisible.** The webhook handles
   `setup_intent.setup_failed` (since 2026-10-02), but the Stripe endpoint is
   not subscribed to it (dashboard, founder). With `checkoutTrial` on since
   10-01, a 3D Secure failure on a trial leaves no row anywhere.
3. **No trial has started yet** (0 `pro_trial_started` to 2026-10-03, 1 trial
   plan click). The first trial and its day-7 charge must be checked by hand
   (earliest 2026-10-08). If a trial conversion is disputed, `checkoutTrial`
   goes off the same day (ledger rule).
   **Status 2026-11-22:** 9 trials started through the webhook; checked by
   hand per trial in the payer reads. Open only as a watch item.
4. **The modal → checkout step is still the leak.** Milestone ask: 178
   shown → 14 clicked (7.9%, up from 3.4%), but 2 paid in 30 days. The plan
   mix is 19 monthly / 2 annual choosers. There is no single document of the
   funnel's events (PLAN item 1): they exist (`pro_modal_shown`,
   `pro_plan_clicked`, `pro_checkout_clicked`, `checkout_session_fallback`,
   `pro_checkout_expired`, `pro_trial_started`, `pro_purchase_completed`,
   `pro_payment_failed`, `pro_card_setup_failed`) but are spread across
   `docs/agent/metrics.md` and the code. **`docs/funnel.md` written
   2026-10-06** (PLAN item 1), with a new server-side stage 4
   (`pro_checkout_started`); the leak itself is PLAN item 2.
   **Status 2026-11-22:** the `modalPlansFirst` A/B reads 0.91× control at
   100 / 110 viewers (ledger interim) — the fold is not the friction; the
   Stripe-step fix of 11-20 (#70) is the next thing to read.
5. **The AI tutor runs on a $10/month workspace.** The live nudge reaches
   browsers since 2026-10-03 (it never did before — CORS); ~100 wrong submits
   a day, capped at two nudges per challenge. A spend limit took the tutor
   down for three days on 2026-09-27. Check spend weekly until a month of
   data exists.
   **Status 2026-11-22:** `ai_usage` holds steady at ~200 calls a week for
   six weeks (178–283; ~65% are `#nudge` calls), 45–55 people a week, on
   `claude-sonnet-5-5`. The dollars are only in the Anthropic console: the
   founder checks the month's spend against the $10 cap there — at this
   volume on this model the cap may be close.

## P1 — the pages that bring buyers

6. **Capital One page (2 of the first 3 payers prepared for it):** cards
   give the solution shape away, the page quotes six different counts, and
   both mock buttons are Pro without saying so. Frozen until the 2026-10-12
   read; the exact changes are written in
   `docs/plans/capital-one-2026-10-12.md` (section E).
   **DONE 2026-11-22** (branch `feat/capital-one-1012`): read taken —
   branch 3, the blog owns the queries (641 imp, 39 clicks) — section E plus
   steps A–C applied, freeze lifted; ledger "Capital One: the 10-12 read",
   read 2026-12-20.
7. **135 `/questions/` pages have never been crawled by Bing** (all 135 of
   the never-crawled sitemap URLs, `bing_url_status`, 2026-10-01). Bing sends
   about as much traffic as Google. The automatic submitter can re-send them
   from Monday 2026-10-12 (14-day cooldown). Recount on 10-08.
   **Superseded 2026-11-20** (#72): the 307 question pages carry `bingbot`
   noindex, follow — they leave Bing's index on purpose. Closed.
8. **Google brand searches fell from 2026-09-27** (homepage landers from
   Google 127 → 21 week on week). Not explained yet; read `gsc_daily` by query
   before changing any page.
   **Read 2026-11-22** (`gsc_daily` query slice, Friday weeks): not a ranking
   loss — brand (`sql ?quest`) position went 7.9 (Sep 1–26) → 2.6 after.
   Fewer people search the name: brand impressions 99–177 a week in
   September → 22–63 in October–November, brand clicks 47–56 → 5–28.
   Non-brand visible clicks held (11–25 a week). Same weeks, mail sent fell
   ~350 → 84–245 a week (lifetime caps and cooldowns, by design). Not
   proven as the cause; nothing on a page explains it. Watch item, no page
   change.
9. **PLAN item 6 conflicts with what was built.** Bing data lives in its own
   tables (`bing_site_daily`, `bing_stats`, `bing_crawl_daily`,
   `bing_url_status`, `bing_submissions`), not in `gsc_daily` with an
   `engine` column — Bing's query/page rows are weekly buckets, Google's are
   daily, so one table would mix grains. Recommend a read-only view
   (`search_daily` with `engine`) over both instead of a migration; decide
   before session 6.
   **DONE 2026-11-22** (branch `feat/search-weekly-view`, #86): the view,
   at the grain both honour — `public.search_weekly` (engine, Friday
   `week_end`, slice, days), security_invoker, metrics_reader only.
   Migration + rollback + rolled-back probe; **the founder applies it.**

## P2 — performance

10. **`/app` downloads ~1 MB gzipped of JavaScript before it is useful:**
    `public/app.js` 1.39 MB (376 KB gz) and `public/data.js` 2.47 MB
    (646 KB gz, every dataset and the whole bank, needed or not). Split
    `data.js` by dataset and load a dataset when its first challenge opens;
    measure LCP/INP on `/app` first (the homepage is measured, `/app` is not).
    **Status 2026-11-22** (branch `feat/app-boot-timing`): the measuring
    half — `app_opened` carries `bootMs`, `renderMs`, `lcpMs`, `appJsMs`,
    `dataJsMs`, `net`; metric `app_boot` with the split rule written before
    the data. The split waits for 14 days of rows.
11. **React and ReactDOM load from unpkg.com** (`src/app.html`), a
    third-party CDN in the critical path, without integrity attributes.
    Self-host the two UMD files or add SRI.
    **DONE 2026-11-22** (branch `fix/cdn-pins-sri`): SRI on all 16 CDN
    tags + the dynamic sql.js loader, and two moving versions found and
    pinned — `lucide@latest` → 1.77.0, `supabase-js@2` → 2.119.2.
    `tests/cdn-pins.test.js`. Self-hosting is still open (one fewer
    origin), not needed for integrity.
12. **`users_public` computes its JSON for every row** — any sorted or
    filtered read through it rebuilds the table (the leaderboard cost ~39 h of
    DB time in nine days). The fix pattern exists (`leaderboard_public`);
    audit the remaining readers.
    **Status 2026-11-22:** audited on `ops.query_stats_daily` (24 h to
    11-21): no `users_public` sort in the top eight any more; the client
    reads one row through `rpc/sq_load_account`. The heaviest statement now
    is the email senders' scan of `users` (username, email, data) — 40 calls,
    94 s a day, ~2.4 s each. Not urgent; the fix is a narrow view or a
    column filter in the senders (edge-function deploy, founder).

## P3 — missing tests

13. **No test file for `create-checkout-session`** (the function that makes
    every paid session; its price env var once pointed at the old $19 price),
    **`resend-webhook`**, or **`account-password`**. The `ai-tutor` function's
    rate limiting and buckets are pinned only by source greps
    (`tests/live-nudge.test.js`), not run.
    **Status 2026-11-22:** `resend-webhook` — DONE (#88): its Svix check is
    lifted out of the real file and executed in Node, and the compare is now
    constant-time. `account-password` — DONE (#91): its hash helpers and
    the browser's `hashPassword` run on the same inputs, so a format drift
    would fail CI before it locks out a sign-in. `create-checkout-session`
    has `tests/checkout-session.test.js`. Remaining: the tutor's buckets.
14. **`src/app.jsx` is not linted** (`npm run lint` covers `src/utils/` and
    `tests/`). 41,000 lines, the file most edited. Lint it with a separate,
    looser config first; 41 known warnings in the linted part.
    **DONE 2026-11-22** (branch `chore/lint-app-jsx`): `npm run lint` now
    covers app.jsx with a crash-only block (no-undef, rules-of-hooks, dupe
    keys…), 0 errors. The first run found two live ReferenceErrors (a
    referral check dead since 09-08, the guest AI-limit message) and one
    handler named like a hook; all fixed. Tighten one rule at a time.
15. **Most app behaviour is pinned by source guards** (regexes over
    app.jsx), not by rendering. They catch removals, not regressions in
    logic. The smoke test (28 checks) is the only render-level coverage;
    paywall moments (PLAN item 3) have none.
    **Status 2026-11-22** (branch `test/smoke-quota-wall`): the quota wall —
    the paywall that sells most (141 met it, 18 clicked) — now has a render
    check in the smoke: a guest resumed at 10 solves deep-links to an
    unsolved Easy and must get the `challenge_quota` lock, the Pro modal
    under `free_quota` with both plans, and the 10-of-10 counter. 30/30
    locally. Paywall moments (`paywallMoments`, dark) get theirs when the
    flag flips.

## P4 — SEO gaps

16. **`faq_open` and `scroll_depth` are still discarded** — they go to
    Vercel custom events, which the Hobby plan drops. Move them to
    `[data-track]` / `track.js`.
    **DONE before 2026-11-22** (found already fixed): both go through
    `window.sqTrack` (`FIRST_PARTY_ONLY` on the four landing pages) — 22
    `faq_open` and 103 `scroll_depth` rows in the 60 days to 11-18.
17. **Question pages carry `LearningResource` + `BreadcrumbList` but no
    per-question `Quiz`/`Question` structured data**, and the template is
    frozen until 2026-10-27 (template change rule). Plan it for that date.
    **Closed, not doing (2026-11-22):** Google's Education Q&A (Quiz)
    markup feeds a carousel keyed to established curriculum frameworks
    (Common Core, UK National Curriculum —
    developers.google.com/search/docs/appearance/structured-data/education-qa);
    nothing supports SQL interview questions as a subject, so the markup
    would buy no result type. The question pages' snippet was already
    rewritten under the 10-27 rule (#63).
18. **DMARC aggregate reports bounce** (`rua` points at an address with no
    routing rule). Harmless at `p=none`; needed before tightening the policy.

## P5 — dead code and repo hygiene

19. **Stale copies at the repo root, all tracked:** `app.jsx` (883 KB, an
    April copy of `src/app.jsx`), `ai-tutor.ts`, `stripe-webhook.ts`,
    `sql-quest-code-fixes.js`, `plan.md`, plus `src/data/challenges.js.bak`
    and `dist/`. A grep for a function name finds the wrong file first.
    Delete after confirming nothing imports them (nothing in `scripts/`,
    `tests/` or `vite.config.js` does today).
    **DONE 2026-11-22** (branch `chore/remove-stale-root-copies`): all
    seven removed after a `git grep` found no reference outside comments;
    Vercel serves `public/` only. They stay in git history.
20. **Inline mirrors in app.jsx** — the weekly report (~190 lines) and the
    skill-drill helpers duplicate `src/utils/weekly-report.js` and
    `skill-drill.js`; orphan Skill Forge helpers remain.
    **Mostly done before 2026-11-22** (found): both mirrors are gone —
    app.jsx imports `buildWeeklyReport` / `buildDrillQueue` from the
    utils. What remains is a few unused imports (`DRILL_SIZE`,
    `prioritizeBySector`, …), which the app.jsx lint (#82) can catch once
    `no-unused-vars` is turned on for it.
21. **`lapsed-pro` sender exists with copy that is false for part of its
    audience** ("your trial ended" to people whose access we withdrew). It is
    unscheduled; rewrite or delete before anyone runs it.
    **Held 2026-11-22** (branch `fix/lapsed-pro-hold`): a real send now
    returns 423 before reading users or calling Resend; `?dry=1` still
    previews. Takes effect on the founder's next `supabase functions deploy
    lapsed-pro`. The copy rewrite is the founder's (outward email).
22. **Twenty analysis/setup `.md` files at the root** (AI_TUTOR_ANALYSIS,
    SOUND-FIXES, UX-SIMPLIFICATION-GUIDE, …) predate the current product and
    contradict it in places. Move to `docs/archive/` with a dated note.
    **DONE 2026-11-22** (branch `chore/archive-root-docs`): 17 moved with a
    dated `docs/archive/README.md`; `ARCHITECTURE.md` and `TODOS.md` stay
    (linked from README and the ledger); `plan.md` goes with item 19.
23. **`public/weekly/` changes on every build** (date-stamped), so the tree
    is never clean after a build and a careless `git add` ships it.
    **DONE 2026-11-22** (branch `fix/weekly-deterministic`): `/weekly/`
    builds only through `npm run build:weekly` (0 people and 1 Google click
    in 90 days — not worth a daily diff), refreshed once to W47 with the
    footer it never got; llms.txt dated by the lastmod manifest and built
    last. Two consecutive builds now leave the same tree.
24. **`CLAUDE.md` is 1,400 lines** of operating history with stale lines
    (fixed four on 2026-10-06). Keep the repo map at the top current; prune
    sections whose features were removed.
    **Status 2026-11-22** (branch `docs/claude-md-prune`): five historical
    sections moved verbatim to `docs/archive/claude-md-history-2026-11-22.md`
    with one-line pointers (shipped skill-calc fixes, the Public Profile
    deploy notes, the goal gate that was off the same night, the April
    notifications changelog, the done inline mirrors); the free-tier
    section's "all dark" corrected. −3.6 KB. The rest is still operating
    knowledge; prune further only with the founder.

## P6 — data quality traps (for anyone reading numbers)

25. `users.data.lastActive` is epoch-ms on some rows and ISO on others; SQL
    over it needs both branches.
26. `users.created_at` was overwritten on every save before 2026-09-12; use
    `users.data.createdAt` for cohorts.
27. Email `opened` events are structurally zero (open tracking off at send);
    judge campaigns by return within 48 h.
28. **Landing reads counted crawlers as readers** (found 2026-11-22): a
    `landing_view` carried no viewport, so the window-size fingerprints the
    app has stamped since 10-07 could not apply — 941 Shanghai + 855 LA
    no-source "readers" in 30 days against ~250 real blog readers.
    **DONE 2026-11-22** (branch `fix/landing-bot-fingerprint`): track.js
    writes `viewport` and stamps the app's fingerprints; metrics.md says how
    to read across the date.
29. **Passwords are stored as one SHA-256 of salt + password** (found
    2026-11-22 while testing account-password). Fast hash: if `users` ever
    leaked, the hashes are cheap to brute-force. Anon can no longer read
    them (sq_load_account strips them, 09-22), so this is defence in depth,
    not an open hole. Fix shape: account-login re-hashes with PBKDF2 (Web
    Crypto, ≥ 100k iterations) on the next successful sign-in and marks the
    row's scheme; account-password writes the new scheme. Founder's call —
    it touches every sign-in.

## Competitor watch — B6 run 2, 2026-11-23 (docs/reads/competitors-2026-11-23.md)

New items only; run 1's ten (PR #179) keep their numbers, progress in §4 of
the read. Every competitor fact cited must come from that read (URL + date).

- **N1 · C5 — Capital One blog guide answers IQ's 11-16 guide.** IQ's
  `/guides/capital-one-data-analyst` (updated 2026-11-16, AI mock button
  above the fold) holds our best payer query twice. Fold into run-1 #1: first
  screen names the reported format from R1's dossier and offers our 70-min,
  14-question timed mock by its specifics; show a visible updated date.
- **N2 · C5 / B3 — the OA bottleneck is multi-file joins and rates under a
  clock.** Confirm the `capital-one-codesignal` mock has a multi-table rate
  question and the guide says so in our words; if not, B3 adds one.
- **N3 · C2 — raise run-1 #4 (AI-coach exclusivity) above run-1 #5.**
  `src/best-sql-practice-sites.html` L102/L635 still claim "the only
  platform … with … an AI Coach"; two more dated counter-examples today
  (IQ AI mock, Prepfully AI Wingman).
- **N4 · B4 — price inputs.** Big Tech Interviews $359.99/yr and $949.99/yr;
  LearnSQL $39 per course, $599 lifetime; Prepfully $99–$279 per coaching
  session. No agent changes a price.
- **N5 · C5 (+B3) — Monzo "debug this query" item** on `/monzo-sql-interview/`,
  framed by the Monzo blog citation already on the page. Prepfully holds the
  SERP with 6 paginated DS bank URLs and no runnable SQL.
- **N6 · C1 (laptop) — check Revolut/Monzo index status and queries before
  any content answer to pagination.** We do not paginate.
- **N7 · C6 — `/sql-exercises/` vs "sql practice questions" intent**
  (LearnSQL blog #1). Add only what our page lacks; no copying.
- **N8 · C5 — one line on the Capital One guide separating the DA
  assessment from the general coding assessment** quantvault.org describes.
  Fold into N1.
