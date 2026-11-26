# Moving up and the current stack — plan (2026-11-25)

Founder's request, 2026-11-25: "yükselme ve güncel stack — burayı planla".
Sister plan: `first-90-days-2026-11-25.md`. Objective: O2, 10 paying
customers per 30 days by 2027-02-08.

## 1. The finding in one paragraph

We do not know who among our people already works with SQL, because no
question asks it. The current-stack content we shipped this week has no
recorded opens: the Debug set and the state-graded DDL/DML items. Interest in
other engines is real but small. About 7% of solvers open the dialect notes,
and search demand for stacks is a rounding error next to "SQL practice".
dbt, Python and Spark are what job ads name, not what our people ask for or
what our buyers paid for.

So the plan has a clear order:
1. Make what exists reachable.
2. Ask who works.
3. Only then build a goal from existing content.
4. Leave new engines out of O2.

## 2. Who it is for, and how many (measured 2026-11-25)

Read-only, production, same filters as the sister plan.

| What | Number | Source |
|---|---|---|
| Solvers, 90 days | 1,081 people; 406 reached 6 distinct solves; 63 reached 20; **36 solved 3+ Hard**; 2 solved 10+ Hard | `challenge_solved` |
| People who opened the dialect notes (SQLite / PostgreSQL / MySQL / Snowflake), 90 days | **96** (77 of them solvers, ≈ 7% of solvers) | `dialect_notes_opened` |
| Opens of the Debug set (331–342), flag on since 2026-11-23 ~22:20 UTC | **0** | `challenge_opened` |
| Opens of the DDL/DML items (325–329, 355–359) | **0**. No `challenge_opened` above id 321 at all since 2026-11-15, internal traffic included | `challenge_opened` |
| People who said they already work with SQL | **unknown**: the intent question has no such answer (interview / job_ready / learning / exploring); the intake's role field is on 12 rows | `users.data` |
| "Moving up" or "SQL with AI" Coach goal | does not exist; both are pending the founder | — |
| PostgreSQL mode | dark; a money flag; the memory fix is open (`postgres-mode-2026-11-22.md`) | `feature-flags.js` |
| Team interest | 0 `team_interest` rows | `monetization-ideas-2026-11-22.md` |

**Search demand.** GSC query slice, 90 days, about 35,600 impressions in
all. GSC lists only the queries we already rank for, so treat these as a
floor.

| Stack or theme | Impressions / clicks |
|---|---|
| AI + SQL | 262 / 1 |
| Performance (index, explain, optimise) | 243 / 4 |
| DDL/DML | 178 / 0 |
| SQL Server | 120 / 0 |
| Snowflake | 83 / 10 |
| Senior / advanced | 68 / 1 |
| dbt | 33 / 0 |
| MySQL | 29 / 0 |
| PostgreSQL | 23 / 0 |
| BigQuery | 18 / 0 |
| Spark | 13 / 0 |
| Python | 4 / 0 |

**What hiring names** (from `docs/reads/companies/`, 19 dossiers, and
`docs/reads/market-demand-2026-11-22.md`):

- **Python.** Mentioned in 14 of 19 dossiers, mostly in data-science loops
  and job text. It is in 31–53% of analyst postings and 57% of data-science
  postings.
- **dbt.** Named in 4 of 19 dossiers (Plaid, Ramp, Revolut, Snowflake), and
  in every case as job text, never as an interview round. One SERP summary
  mentions dbt/Airflow questions for Wise (`competitors-2026-11-25.md`; the
  page was not opened). dbt does not appear in any analyst posting table in
  the demand read.
- **Spark.** In 11.7% of data-science postings and 3 dossiers. Databricks
  names no SQL round for analyst roles.
- **Metric and case rounds.** In 14 of 19 dossiers.
- **Reading or fixing someone else's query.** Reported at Shopify and TikTok,
  and in the Wise, Monzo and Chime candidate pattern.
- **AI-use rules.** One line, in Google's DS loops: no AI tools in the
  interview (a guide, low confidence).

## 3. The problem in their words

**We have almost none.**
- Of 3,389 tutor questions from 657 people, one names a database engine
  (MySQL). None names dbt, Python, Spark, Snowflake, BigQuery, PostgreSQL or
  an AI assistant.
- None of the 15 feedback messages does either.
- The closest first-hand line is one grader complaint about a dialect,
  already fixed (`inbox-review-2026-11-23.md`).

The candidate pattern in `competitors-2026-11-25.md` §6 ("speed without an
editor, and reading someone else's SQL") is the best second-hand statement of
the need.

## 4. What to build, ranked (smallest useful first)

There is no new engine. Every step uses content that is already in the bank.

### U1 · Make the shipped stack content reachable, and prove it — S

- **The problem.** No open has been recorded for ids above 321 since
  2026-11-15. That covers the Debug set (flag on), DDL/DML 325–329 and
  355–359, and it includes our own walks.
- **What.**
  - Walk production: Practice list, Debug chip, `/sql-debugging-practice/`,
    a question page link.
  - Find where these items drop out: the deployed `data.js`, a list filter,
    or the event.
  - Fix it in one PR, with a source guard so the bank's top ids stay listed.
- **Why first.** "The Debug set" claim reads on 2026-12-22. A claim on an
  unreachable surface reads as a failure of the format when it is a failure
  of the door.
- **Metric.** `stack_content_reach` (new).

### U2 · Ask who already works with SQL — S (measurement)

- **What.** Add a fifth answer to the existing intent question: "I use SQL at
  work and want to move up". The value is `at_work`, written by the one
  writer, `setUserIntent`.
- **Routing.** `at_work` is not a hiring intent (`HIRING_INTENTS` is
  unchanged), and it routes like `learning` until U3 exists. No other screen
  changes.
- **Why.** Every later step depends on a number we do not have. P6: instrument
  before you build.
- **Volume.** In 28 days (10-01 → 10-29), 241 solvers answered the intent
  question. So 10% would be about 24 people, and one window is readable.
- **Metric.** `at_work_share` (new).

### U3 · The "Moving up" Coach goal, built from what exists — M (founder approval)

- **Gate.** Only if U2 shows `at_work` ≥ 10% of intent answers.
- **What.** One `goals.js` entry, framed as the next interview (a senior
  analyst or analytics-engineer screen), because payers are
  interview-shaped. It is not framed as on-the-job learning. Its steps:
  - Hard Window Functions and Subqueries & CTEs (32 and 34 Hard in the bank);
  - the Debug set (read someone else's query);
  - the DDL/DML items (state-graded);
  - the dialect notes, as a line on each step;
  - the Metrics & Case round set, if #174 has merged.
- **The two authoring traps** (CLAUDE.md, Coach engine):
  - canonical skill names only;
  - no `retrieval_check` on a lesson reached only through `skipIf`;
  - and DDL/DML has no radar axis (orchestrator decision 2026-11-22), so
    those steps carry no `skipIf` and no `exitCriteria`.
- **Why a goal and not a new feature.** The goal picker maps
  `window.coachGoals`, so a goal needs no UI work. And the closest existing
  goal, Analyst Day-One, has the best step rate of the three: 15 of 64
  holders, against 1 of 67 for Interview Prep.

### U4 · The "SQL with AI" Coach goal — S (founder approval)

- **Gate.** Only after `debug_solve_through` reads on 2026-12-22 with
  openers ≥ 20.
- **What.** A short goal: the 12 Debug items, the trap pages' wrong-answer
  shapes, and the `/sql-for-the-ai-era/` and `/blog/validate-ai-generated-sql/` pages as
  reading. Its promise is to review AI-written SQL before it ships. Its claims
  are bound by the `/vs-chatgpt/` rules: no claim about any AI product's
  error rate.
- **Why after the read.** A goal built on a set with zero openers repeats the
  Interview Prep goal: 67 holders and 1 step.

### U5 · PostgreSQL mode for Pro — M (founder, money flag)

- **What.** Ship the spike's recommendation once the
  one-instance-per-session memory fix holds a session under ~700 MB.
- **Who it serves.** The person Pro sells to: a date and a named engine.
  Signal: 96 dialect-note openers in 90 days.
- **Why last.** It is a money flag, the fix is not written, and it
  benefits from U1's doors being sound first.

## 5. What NOT to build now, and why

| Not now | Why (data) |
|---|---|
| **dbt** | 33 impressions and 0 clicks in 90 days, 0 tutor questions. Named in job text at 4 of 19 companies, never as an interview round. It needs a project, Jinja and a warehouse: a new engine. Our buyers paid for an SQL screen. |
| **Python / pandas** | The largest adjacent demand (31–53% of analyst postings, 14 of 19 dossiers), but a new engine (Pyodide), a new grader and a new bank, in a contested market at $15–34 a month. It cannot ship and sell before 2027-02-08. Our people ask about it zero times. Revisit as its own objective after O2's day-60 read (2027-01-09), starting with the demand read's "10 questions + waitlist" test, not a build. |
| **Spark / Databricks** | 13 impressions. Databricks names no SQL round for analysts. Spark is in 11.7% of data-science postings. |
| **Snowflake / BigQuery engines** | Neither runs in a browser. The dialect notes cover both. Snowflake's 10 clicks are dialect intent, and the company page already serves them. |
| **Query performance (EXPLAIN, indexes)** | SQLite's plans do not transfer to the engines people use at work. 243 impressions, 4 clicks. |
| **A 10th Skillmap axis for DDL/DML** | Decided against on 2026-11-22. Revisit at ≥ 15 items and 28 days of solves. |
| **A team / company plan** | `/for-teams/` has been live since 2026-09-26 with 0 `team_interest` rows. Its pre-registered rule (< 3 rows in 30 days → drop, `monetization-2026-09-24.md` row 6) has fired. |

## 6. How it connects to revenue

- **Pro value.** Every step adds to Pro rather than to a new price:
  - the Hard items and Hard Debug items are already Pro;
  - U5 is Pro-only by the spike's design;
  - the separate Debug price was withdrawn on 2026-11-23 to measure use
    first, and that rule stands.
- **Retention after the interview.** An employed person has a reason to keep
  Pro past one screen. The next screen (promotion or a switch) is the frame,
  and it also argues for annual.
- **Ability to pay.** A person in work can often claim a learning budget. A
  receipt that shows the business name already exists (Stripe, DBA SQL
  Quest). Nothing else to build until U2 shows these people exist.
- **B2B.** Not now; see the table above.
- **Ceiling, stated plainly.** U1 protects the 12-22 read and the content
  already paid for in agent hours. U2 is a number. Only U3–U5 can move
  payers, and only if U2 finds the people.

## 7. Metrics (defined in `docs/agent/metrics.md` in this PR, rule 6b)

| Step | Metric | Baseline (2026-11-25) |
|---|---|---|
| U1 | `stack_content_reach` (new): openers per 28 days of Debug, DDL/DML, and dialect notes | 0 / 0 / 96 in 90 days |
| U1, U4 | `debug_solve_through` (exists) | flip 2026-11-23; read 2026-12-22 |
| U2 | `at_work_share` (new): share of intent answers that are `at_work`, and those people's reach-6 and payer counts | answer does not exist |
| U3, U4 | `moving_up_goal` (new): goal selected → 1 step in 14 days → 5 steps, per goal id | goals do not exist; comparison: Analyst Day-One 15 of 64 holders with a step |

## 8. Kill criteria (written before the data)

- **U1.**
  - **Read:** 14 days after the fix merges.
  - **Done when** each set has ≥ 1 non-internal open.
  - **If the sets are reachable and still have fewer than 20 openers
    combined in 28 days:** no further current-stack content is written (no
    more Debug or DDL/DML items) until a door to them (a hub, the Practice
    chip, a company page) is shown to send people. The bank does not grow
    behind a closed door.
- **U2.**
  - **Read:** 28 days after the flip (2027-01-01 if it merges by 12-04).
  - **Unreadable:** fewer than 100 intent answers in the window → extend
    once.
  - **Kill:** `at_work` < 5% of answers → this track stops at U1 and U2.
    No "Moving up" goal is built, and we write down that our audience is
    pre-job.
  - **Build U3:** ≥ 10% of answers, and their reach-6 ≥ the `interview`
    group's.
  - **Between 5% and 10%:** read again at 56 days.
- **U3 and U4.**
  - **Read:** 28 days after each goal ships.
  - **Kill:** fewer than 2 of the first 15 starters complete a step within
    14 days. That is below Analyst Day-One's rate (15 of 64, about 23%),
    with room for small n. Then the goal is removed from the picker; holders
    keep it.
  - **Unreadable:** fewer than 15 starters in 28 days → extend once, then
    remove.
- **U5.** The spike's own rule: drop it if the memory fix cannot hold a
  session under ~700 MB on a 375-wide Chromium after five switches.

## 9. Founder decisions needed

1. **Approve the "Moving up" goal** (U3), framed as the next interview, and
   only if U2 clears 10%.
2. **Approve the "SQL with AI" goal** (U4), after the 12-22 Debug read.
3. **The `at_work` answer** (U2). It adds a fifth option to a question every
   new person sees. That is a first-screen change, so `first_solve_10m` is
   its guardrail.
4. **PostgreSQL mode** (U5). Pro-only is a money flag; it is your go, after
   the memory fix.
5. **Python.** Agree that it stays out of O2, or ask for the waitlist test
   now. The test is one page and a counter; it is not a build.

## 10. First three tasks (BACKLOG)

1. **U1 walk + fix:** find why no id above 321 has an open since 11-15;
   fix it with a source guard (A2 walk, then the owning lane). Before
   2026-12-08, so the Debug read has two weeks of real opens.
2. **U2 measure PR:** the `at_work` intent value, its event value and the
   routing fallback, behind a flag, with the claim on `at_work_share`.
3. **U3 draft goal** in a branch, built only from existing ids. It is not
   merged until U2 reads ≥ 10% and the founder approves.
