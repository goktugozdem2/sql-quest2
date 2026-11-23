# Ledger — did the change do what it said?

Every entry starts as a claim made at merge time and ends as a verdict measured
on the read date. The verifier (`scripts/agent/tasks/verify.md`) appends the
verdict; nobody edits a claim after the fact.

**Why this file is the point of the whole agent system.** Without it the fleet
only produces more pull requests, and "we shipped a lot" is not the same as
"the numbers moved". The ledger is also the input that lets triage rank work:
if content fixes keep moving numbers, do more; if they do not, stop.

## Verdicts

| verdict | meaning |
|---|---|
| `HIT` | reached or beat the target |
| `MOVED` | moved in the right direction, short of target |
| `FLAT` | inside noise |
| `MISS` | moved the wrong way |
| `UNREADABLE` | n too small, or the window is confounded — say why |
| `UNDEFINED` | the metric is not in `docs/agent/metrics.md`; nothing was measured |

`UNREADABLE` is a real and frequent outcome at this scale. It is not a failure
of the verifier and must never be rounded to `FLAT`.

---

## Open

### State-graded DML/DDL: the first five (challenges 325-329, C6)

- **Claimed** 2026-11-22 · **Shipped** on merge (no flag) · **Read** 2026-12-20.
- **Change** A new challenge type, `grade: 'state'` (`src/utils/state-grade.js`):
  the person's statements run on a fresh in-memory copy of the dataset, never
  the shared `db`, behind a statement allow-list (DROP, ATTACH, PRAGMA and
  foreign tables always refused), and are graded on what the table holds
  afterwards through the app's comparator. First set, all on `ecommerce` /
  `employees`: 325 "Build the VIP Mailing List" (Easy, INSERT from a query),
  326 "A Raise for the Best-Rated Department" (Medium, UPDATE from a
  subquery), 327 "The Sync Ran Twice" (Medium, delete copies, keep the
  lowest id), 328 "Roll February's Units into the Totals" (Medium, upsert),
  329 "A Refunds Table That Says No" (Medium, CREATE TABLE with PK, FK and
  CHECK; three bad rows must be rejected). Tag `DDL/DML`, unmapped in
  SKILL_TO_RADAR: they count as solves and move no Skillmap axis.
- **Metric** `challenge_solve_through` (docs/agent/metrics.md) per card, read
  within its band (Easy for 325, Medium for 326-329). `topic_funnel` is
  defined the same day for C6's topic doors; this set has no topic door yet
  (no guide or hub), so it is not read here.
- **Baseline** Not readable from the cloud session (no production data). The
  read takes it in the same window: the median solve-through of every Easy
  and every Medium card with 10+ openers, 2026-11-23 → 2026-12-20, same
  shared filters.
- **Target** 325 at or above the Easy median; 326-329 pooled within 5 points
  of the Medium median or above.
- **Falsification** Pooled 326-329 more than 10 points under the Medium
  median, or any card with 10+ openers under 40%: read that card's
  `challenge_errored` messages first (a refusal message or a syntax error is
  a tooling problem, not a content one). Fewer than 10 openers on a card is
  `UNREADABLE` for that card; under 30 pooled openers the claim is
  `UNREADABLE`.
- **Guardrail** `challenge_errored` on 325-329: a refusal is logged there
  with the gate's message. More than a third of submits refused means the
  gate is too tight (e.g. a table function or schema-qualified name a person
  can fairly use), and the allow-list is the fix.
- **Confound** 326 and 327 also join the subqueries topic page's scalar/IN
  section, so they get that page's openers too. Read the door beside the rate.


### a company arrival opens question 1 (`companyDirectOpen`, A/B)

- **Claimed** 2026-11-22 · **Shipped** dark (flag `companyDirectOpen: false`); A0 may flip it no earlier than **2026-12-19** (flag-queue row 16) · **Read** 2027-01-30, or at the minimum n if that comes later (hard stop 2027-02-27).
- **Change** an A/B by aid (`company_direct_v1`, murmur-finalised hash, independent of the first-screen, company-ask, quota-wall-inline and modal-layout arms). A person with **zero solves** who arrives through `/app/?company=X` with no `?challenge=` or `?interview=` (the hero of 33 of 34 company pages) gets one of two arms. `direct`: they land in the question the company banner's button would open (`companyBannerNext()`: same locks, same `openChallenge`, `openedFrom: 'company_direct'`). `list`: today's list and banner, unchanged. The arm is assigned once (`company_direct_assigned {testId, arm, company, nextId}`). Nothing is asked, gated or priced. src/utils/company-direct.js; tests/company-direct.test.js.
- **Why** (docs/reads/onboarding-walk-2026-11-22.md): of five doors walked at 375 and 1366, the general company door is the only one with two presses before the editor. The hero promises "Solve <Company> question 1 now: <title>". The app shows a list and asks for the same promise a second time, at the fold on a phone, under ~16 lines of text. Company arrivals are the best money door (2.3% trial-or-paid per arrival). 63 of 149 company search arrivals opened nothing (35 days to 11-20).
- **Metric** `company_direct_split` (metrics.md): `first_solve_10m` measured from assignment, by arm. Secondary: first run within 10 minutes. `open_to_first_run` is **not** the read here: the direct arm opens the challenge for everyone, so its denominator moves with the arm.
- **Baseline** the `list` arm, run alongside (concurrent control). The pre-flip company-door `first_solve_10m` is a laptop read, to be filled in at the flip. This cloud session has no production data and states no number for it.
- **Target** `direct` ≥ `list` + 8 points on first_solve_10m, at ≥ 120 assigned people per arm (bots and crawler window sizes out).
- **Guardrails** (both arms):
  - 3 solves within 24 h of assignment: `direct` must not trail `list` by more than 5 points.
  - plan clicks and trial-or-paid within 14 days: read the counts. A `direct` arm with 0 against ≥ 4 for `list` holds the ship.
- **Stop rule, written before the data:**
  - **Early harm check at 60 per arm:** `direct` trails `list` by ≥ 10 points on first_solve_10m → flag off the same day; MISS.
  - **At 120 per arm:**
    - `direct` ≥ `list` + 8 → HIT. Ship `direct` as the default and remove the `list` branch.
    - within ± 8 → FLAT. Flag off and delete the branch (the banner claim stands).
    - `direct` < `list` − 3 → MISS. Flag off.
  - Fewer than 120 per arm by 2027-02-27 → UNREADABLE. Flag off; do not extend a second time.
- **Confounds** the banner claim ("a company arrival gets a first question to press", read 12-18) sits on the same arrivals, which is why the flip waits until 12-19. M-02's hero copy (read 12-20) is upstream of assignment and lands in both arms equally. `quotaWallInline` and `modalLayout` are independent arms. #99's first screen never shows on a `?company=` arrival.
### /for-teams/ is published — the seat door's 30-day test starts

- **Claimed** 2026-11-22 · **Shipped** on merge (founder's go in chat: "evet, /for-teams/ yayına al") · **Read** 2026-12-22.
- **Change** `/for-teams/` goes from noindex to `index, follow`, enters the sitemap, and is linked from the footers of `/after-bootcamp/` and `/after-the-sql-course/` (the instructor-facing doors; the homepage footer stays at its 32-link cap). The page is unchanged otherwise: one button writing `team_interest {seats, email?}`, no price, no checkout. Guards `tests/for-teams.test.js` (breaks caught: restoring noindex; dropping the after-bootcamp link). P1 (partnerships) points pilots and replies at it.
- **Why** `docs/plans/monetization-2026-09-24.md` row 6 — seats for instructors and bootcamps, tested as a door with a counter before anything is built. 0 `team_interest` rows while it was hidden; P1's 11-22 read found a school (SPTech, Moodle) already sending students unasked.
- **Metric** `team_interest` rows (people by aid, bots out) and the seats they state; P1 pipeline stage moves.
- **Baseline** 0 rows (page hidden 09-26 → 11-22).
- **Target** ≥ 3 `team_interest` rows by 2026-12-22.
- **Falsification, stated in advance (the plan's own kill rule):** fewer than 3 rows in the 30 days → drop the page and write it down; seats are then sold only through P1's direct conversations.

### one SQL Quest entity in the structured data, and the 15 buyer questions in llms.txt (G1)

- **Claimed** 2026-11-22 · **Shipped** on merge (static pages + llms.txt, no flag) · **Read** 2026-12-23.
- **Change**
  1. **JSON-LD on `/`, `/sql-practice-comparison/`, `/best-sql-practice-sites/` and `/sql-exercises/`.**
     - Every SQL Quest author, publisher and provider now carries the Organization's `@id` and `url`. Before, they were bare name-only nodes.
     - The SoftwareApplication sits at `https://sqlquest.app/` and is published by the Organization.
     - The Course and the WebSite no longer point at `/app.html`, which is a 308.
     - The SearchAction for a `?q=` search the app does not have is removed.
  2. **`/llms.txt` gets "Questions people ask, and the page that answers".** It covers the 15 prompts of G1's panel in the person's words, each linked to sitemap pages.
  3. **Guards:** `tests/entity-schema.test.js` and the "buyer questions" block in `tests/llms-txt.test.js`.
- **Why:** `docs/reads/geo-2026-11-22.md`.
  - Perplexity named us in the prose of 1 of 5 answered prompts and cited a URL in 3.
  - It cited our `/stratascratch-alternatives/` for a general "best website" question, which is a page that does not answer it.
  - llms.txt had no line for any of the 15 buyer questions.
- **Metric**
  - **Primary:** `ai_mention_share`, Perplexity lane, on G1's panel: named-or-cited ÷ answered, from the table in `docs/reads/geo-<date>.md` (metrics.md, G1 note).
  - **Guard:** `ai_landings_month`.
- **Baseline (2026-11-22)**
  - Perplexity: named or cited 3/5 answered, named in prose 1/5. 10 of 15 were unread behind a sign-in wall.
  - `ai_landings_month`: 99 people in the 30 days to 11-22 (ChatGPT 81, Gemini 16, Claude 1, Perplexity 1).
- **Target (read 2026-12-23, the last two weekly reads pooled)**
  - Named or cited in at least 60% of the prompts Perplexity answered.
  - Named in prose on at least 2 prompts.
  - At least one panel prompt outside #1–#5 cites a page listed for it in the new block.
  - `ai_landings_month` for the 30 days to 12-23 at least 99.
- **Falsification (written before the data)**
  - **No effect:** named in prose stays at 1 or fewer, and no prompt cites the page llms.txt lists for it. Then the plumbing changed nothing an assistant shows. Keep it, because it is correctness (a 308 and a false SearchAction), but move G1's next fix effort to the C3 off-site lists, the only lever the baseline points at.
  - **Wrong direction:** `ai_landings_month` falls below 79 (−20%). Look at Bing first (C1): ChatGPT and Copilot ground on it.
- **Confounds**
  - C2's AI-visibility pass shipped the same day, on the same metric and similar pages. These two cannot be told apart; read them together.
  - Perplexity reads only about 5 prompts a week before its wall, so one answer is 20 points. A single-week move is `UNREADABLE`.
  - Gemini is invisible to `ai_landings_month`.
### C7 run 1: five mined question shapes answered on three existing pages

- **Claimed** 2026-11-22 · **Shipped** on merge (static pages, no flag) ·
  **Read** 2026-12-20.
- **Change** Answers in our own words, every query run on the app's
  datasets and pinned in `tests/question-answers-2026-11-22.test.js`:
  Nth-highest salary with ties (`/blog/row-number-vs-rank-vs-dense-rank/`),
  latest row per group, month-over-month change and consecutive-day
  streaks (`/blog/window-functions-tutorial/`), deleting duplicates when
  there is no id column (`/sql-find-duplicates/`). The two blogs' visible
  FAQ now equals their JSON-LD (10 baseline lines retired). Read:
  `docs/reads/questions-2026-11-22.md`.
- **Metric** `gsc_page_clicks` (metrics.md), impressions on the three
  pages, page slice; plus the query×page slice filtered to the five shapes
  (`nth|second highest|latest|most recent|month over month|consecutive|streak|no id|rowid`).
- **Baseline** not read: the cloud session has no production data. The
  laptop reads the 28 days to 2026-11-21 for the three pages and writes it
  here.
- **Target** the three pages' impressions for the 28 days to 2026-12-17 at
  or above the baseline + 20%, and at least one query from the five shapes
  with impressions on the page that answers it.
- **Falsification** (written before the data) impressions at or below the
  baseline and no shape query on its page → answers inside long existing
  posts don't move search demand. C7 stops adding sections and only adds
  FAQ entries until a read shows a shape query landing.
- **Confounds** the window tutorial and ranking blog also gained a visible
  FAQ (same text as their schema); a Google core update in the window
  would show on every page, so compare against the blog's other posts.
### UI/UX: no critical layout defect, a third fewer major (A4 first run)

- **Claimed** 2026-11-22 · **Shipped** on merge of #143, #144, #145, #146,
  #147, #149 (no flag) · **Read** 2026-12-20.
- **Change**
  - #143: the mock list and a timed mock fit a phone; Quit is reachable.
  - #144: blog tables, Amazon and the SQL quiz no longer scroll sideways.
  - #145: the footer passes AA, with 44 px links and 12 px text.
  - #146: the nav button keeps its colour; nav targets are 44 px.
  - #147: company card text is 12 px, and the format link is readable.
  - #149: muted app text is DESIGN.md's `--text-muted`.

  Each fix has a guard test proven by one deliberate break.
- **Why** `docs/reads/uiux-audit-2026-11-22.md`. 7 pages scrolled sideways
  or hid a control on a phone, among them the timed mock's only exit and
  the Interview tab. Footer, nav and app grey text failed WCAG AA sitewide.
- **Metric** `uiux_findings` (critical + major per full audit run;
  metrics.md as of this claim).
- **Baseline** critical **56**, major **20,506** → **20,562** (main at
  523aa1d, 1,596 runs). Measured with all six merged on a scratch branch:
  critical 0, major 13,707.
- **Target** by 12-20, on main: critical **0**, and `uiux_findings` ≤
  **14,000** on the same surface list (pages added since are reported
  separately).
- **Falsification, stated in advance:** (a) a person reports a layout bug
  (sideways scroll, a control they cannot reach or read, text cut off) on
  a covered surface within 28 days of the last merge → **MISS** for the
  audit's coverage, whatever the count says. Add the case to the harness
  before fixing it. (b) critical > 0 on main at the read → **MISS**. (c) a
  run without the six PRs merged → **UNREADABLE**.

### the Revolut guide: a sourced blog door for the best fintech page (C5)

- **Claimed** 2026-11-22 · **Shipped** on merge · **Read** 2026-12-20 (28 d) and 2027-01-17 (56 d).
- **Change** `/blog/revolut-data-analyst-sql-screen/`: both Revolut SQL
  rounds as interviewquery's 2026 guide reports them (one dated source, read
  2026-09-12, quotes pinned verbatim against `interview-archetypes.js`),
  three traps worked on `finans_neobank` (transfer legs, AVG over NULL,
  a nested funnel), a 2-week plan, links to Revolut question 1, the readiness
  test and the Pro mock. It solves neither the mock's written tasks nor any
  set challenge. Linked from the Revolut page, the interview hub and the blog
  index; in the sitemap.
- **Why Revolut, why a guide:** Revolut and Wise are the two fintech pages
  with proven clicks (seo-2026-11-13: 18.6% / 27% CTR); Revolut has 4.6× the
  query impressions (company-research-2026-11-20: 87 vs 19) and is the only
  one with a sourced format, a signed set and a Pro mock to sell. M-02's hero
  already names question 1 on both, so menu item 1 is spent there; the
  Capital One read (branch 3) says the blog is the door.
- **Metric** `landing_to_trial` (defined today in metrics.md) on the guide
  and on `/revolut-sql-interview/`; `gsc_daily` for the guide; `pro_modal_shown`
  with `linkSrc` `revolut-blog`.
- **Baseline** for the laptop to fill before 12-20: Revolut page landing
  people and trial-or-paid, 28 days to 2026-11-22. The guide's baseline is 0.
- **Target** at 28 d: the guide ≥ 150 impressions and ≥ 8 clicks, with the
  Revolut page's clicks not below 90% of its own prior 28 d. At 56 d: ≥ 1
  trial or purchase from a person whose first landing was the guide, and
  ≥ 3 Pro modals from `revolut-blog`.
- **Falsification, written now:** the Revolut page's clicks fall more than
  20% while the guide takes its queries → cannibalised; noindex the guide
  (`seo-prune.json`) and move its traps onto the page. At 56 d, ≥ 150 guide
  landers and 0 app opens from it → the guide is not a door; one improvement
  run, then the kill rule.

### related links for thinly linked pages (C1)

- **Claimed** 2026-11-22 · **Shipped** on merge (static pages, no flag) ·
  **Read** 2026-12-20.
- **Change:** `scripts/build-related-links.mjs` adds one contextual
  "related" line to 16 source pages. The targets are 13 pages that had
  0–3 distinct linking pages outside `/questions/`. Before → after:
  `docs/reads/internal-links-2026-11-22.md`. The guard is
  `tests/internal-links.test.js`: fewer than 2 linking pages fails.
- **Page set, fixed now:**
  - `/weekly/`
  - `/datalemur-karsilastirma/`
  - `/stratascratch-alternatives/`
  - `/datalemur-alternatives/`
  - `/learn-sql-for-beginners/`
  - `/after-bootcamp/`
  - `/after-the-sql-course/`
  - `/sql-for-the-ai-era/`
  - `/blog/validate-ai-generated-sql/`
  - `/challenges/string-functions/`
  - `/sql-rollup-interview-questions/`
  - `/paypal-sql-interview/`
  - `/coinbase-sql-interview/`
  - `/chime-sql-interview/`
  - `/monzo-sql-interview/`
- **Metric:** `bing_crawled_share` / `linked_page_impressions`
  (`docs/agent/metrics.md`, defined in this PR).
- **Baseline:** laptop read before the deploy. It has three parts:
  - `bing_url_status` for the 15 URLs: `last_crawled`, `checked_at`,
    `anchor_count`;
  - GSC page-slice impressions for the 28 days before the deploy;
  - how many of the 15 are in `gsc_index_status` as indexed.

  A cloud session has no production data, so this PR ships no number.
- **Target:**
  - ≥ 12 of the 15 crawled by Bing on or after the deploy date, with
    `checked_at` after it.
  - Page-slice impressions for the set up ≥ 25% over the prior 28 days,
    counting pages at zero.
- **Falsification:**
  - **MISS:** fewer than 8 of 15 crawled since the deploy, among those
    checked after it.
  - **FLAT:** impressions within ±10%, with no page going from 0 to
    > 0. That would say links from these pages carry no crawl signal at
    this authority.
  - **UNREADABLE:** under 10 of the 15 checked after the deploy. Do not
    round that to FLAT.
- **Confounds:**
  - `/weekly/` changes lastmod on every `build:weekly`.
  - #162 rewrites the snippets of 7 company pages in the same window. None
    of the 15 is among them, but the set's impressions share the
    Google-wide trend, so read it against the site's page-slice total for
    the same windows.

### AI-visibility pass: answer-first summaries, honest competitor facts, llms.txt entry points (C2)

- **Claimed** 2026-11-22 · **Shipped** on merge (static pages + llms.txt,
  no flag) · **Read** 2026-12-20.
- **Change** (1) `/llms.txt`: a "Start here" list of nine entry points, one
  line each; the free tier in `freeTierSentence`'s words; the fintech
  company pages (Capital One, Revolut, Wise, Stripe, PayPal, Monzo; Chime
  joins automatically when its page exists); the competitor grid that
  marked every rival "No" on AI and hints removed (the 2026-09-13 read
  contradicts it). (2) StrataScratch's prices moved to the 2026-11-22 read
  ($24 / $139 / $289) on five pages; "verified provenance" removed
  everywhere. (3) An answer-first summary with a practise link at the top
  of `/vs-datalemur/`, `/best-sql-practice-sites/`,
  `/datalemur-alternatives/`. Guards: `tests/competitor-facts.test.js`,
  `tests/llms-txt.test.js`, `tests/alternatives-pages.test.js`.
- **Metric** `ai_landings_month` (metrics.md, defined in this PR), with the
  door split for the three pages; Copilot citations (Bing Webmaster Tools,
  AI Performance) read by hand beside it.
- **Baseline** not read: the cloud session has no production data. The
  laptop reads the 30 days to 2026-11-22 before the merge and writes it
  here.
- **Target** `ai_landings_month` for the 30 days to 2026-12-20 at or above
  the baseline + 25%, and at least one `ai:*` person landing on one of the
  three pages' doors.
- **Falsification** (written before the data) at or below the baseline,
  with no `ai:*` arrival on the three doors → the answer-first blocks did
  nothing measurable; keep the fact fixes (they are correctness, not a
  bet) and stop adding summaries to more pages until a panel read
  (`ai_mention_share`) shows a citation of one of them.
- **Confounds** Gemini is invisible to the metric; a single month of single
  digits reads `UNREADABLE`, not `FLAT`; PR #134 (Chime) changes llms.txt
  the same month.

### the Chime company page (Nubank and N26 deferred)

- **Claimed** 2026-11-22 · **Shipped** on merge (agent C1, founder's order of 2026-11-22: "find the SEO pages that bring customers, and build them") · **Read** 2026-12-20.
- **Change** `/chime-sql-interview/` from the company template: a sourced
  format section (three PracHub candidate reports, interviews Oct–Nov 2025,
  fetched 2026-11-22; research `docs/reads/company-research-2026-11-22.md`),
  a 16-challenge set (5 Easy / 7 Medium / 4 Hard) with one line of reasoning
  per challenge, the fintech ring, the hub, the app's `?company=` list and
  the intake list. Company-page count 33 → 34. Nubank and N26 were researched
  and deferred (reasons in the read). Same commit: the "Accessed" line on the
  PayPal, Coinbase and Monzo pages now shows 20 Nov 2026 (was a hard-coded
  13 Sep 2026).
- **Why** company pages are the best money door (2.3% trial-or-paid per
  arrival vs 0.5% for `/sql-exercises/`, monetization-ideas §1f); Chime is
  consumer fintech with a large US candidate pool and no DataLemur or
  StrataScratch page (both 404 on 2026-11-22).
- **Metric** `company_page_door` for `page` = `chime-sql-interview` (people
  by `aid`, bots out: landing → app within 1 hour, first solve), plus
  `gsc_daily` page-slice clicks and impressions for `/chime-sql-interview/`.
- **Baseline** 0 (the page does not exist).
- **Target** by 2026-12-20: indexed, ≥ 150 Google impressions and ≥ 5 clicks
  in the 28 days to the read, and ≥ 3 people into the app from the page.
- **Falsification, stated in advance:** indexed and under 50 impressions →
  MISS, and Chime-shaped (no-incumbent, consumer fintech) pages stop being
  the next batch's default; not indexed by the read → UNREADABLE (request
  indexing by hand first, re-read 2027-01-17). 4 weeks is short for a new
  page: a MISS on clicks with impressions above target is FLAT, not MISS.
  The P4 prune rule applies at eight weeks (no impressions → noindex).

### five Easy on-ramps: Window, Date and NULL (challenges 320-324)

- **Claimed** 2026-11-22 · **Shipped** on merge · **Read** 2026-12-20.
- **Change** Five Easy cards appended to the core bank, on shipped datasets:
  320 "Every Employee Next to Their Department's Top Salary" and 321 "Number
  Each Customer's Orders" (Window Functions), 322 "Hires per Year" and 323
  "Weekend Logins" (Date Functions), 324 "Ages on Record by Class" (NULL
  Handling). Measured that morning through `challengeMatchesSkill` over the
  198 core cards: Window 3 Easy / 35 Hard, Date 2 Easy, NULL 3 Easy. After:
  Window 5, Date 4, NULL 4 Easy. Prompts name the outcome, never the method;
  every solution is run and pinned, and one common wrong answer per card fails
  through the app's own grader (`tests/challenges-320-324.test.js`), also
  walked headless in the built app on sql.js.
- **Metric** `challenge_solve_through` (docs/agent/metrics.md), per card, read
  within the Easy band.
- **Baseline** Not readable from the cloud session (no production data). The
  read takes it in the same window: the median solve-through of every Easy
  card with 10+ openers, 2026-11-23 → 2026-12-20, same shared filters.
- **Target** Each new card with 10+ openers at or above that Easy median; the
  five together (pooled openers) within 5 points of it or above.
- **Falsification** Pooled solve-through more than 10 points under the Easy
  median, or any one card with 10+ openers under 50%: that card's prompt or
  data is the problem, rewrite it before writing more. Fewer than 10 openers
  on a card is `UNREADABLE` for that card, not `FLAT`; under 30 pooled
  openers the whole claim is `UNREADABLE`.
- **Confound** 322 and 324 also join the aggregation topic page's GROUP BY
  section and 321 the ranking pages, so their openers arrive from more doors
  than the other three. Read the door (`linkSrc` / `src`) beside the rate.

### Bing reads the app shell's noindex (bingbot may fetch /app/?…)

- **Claimed** 2026-11-22 · **Shipped** on merge (robots.txt, no flag) ·
  **Read** 2026-12-20.
- **Change** `public/robots.txt` gets a `User-agent: bingbot` group: the
  default list without `/app/?`, `/app?`, `/app.html`. Every other crawler
  keeps the 09-23 rule. The shell stays `noindex, follow`. Guard:
  `tests/robots.test.js`.
- **Why** `docs/reads/bing-drop-2026-11-22.md`. From the 09-23 robots rule,
  Bing's `blocked_by_robots` went 0 → 819 and `in_index` 163 → 830 in step,
  against a 422-URL sitemap and 416 URLs fetched with a 200: ≥ 408 indexed
  URLs are outside the sitemap, and the blocked app URLs (1,173 distinct
  query strings linked from the site) are the only population that size.
  Bing clicks peaked the week the rule shipped (280, from 09-19) and fell
  every week after, to 37 (from 11-07); every practice query lost position
  together, and untouched pages fell with them. Hypothesis: hundreds of bare,
  contentless URLs in the index weigh on how Bing rates the site.
- **Metric** `bing_blocked_urls` (mechanism) and `bing_weekly_clicks`
  (outcome), both in metrics.md as of this claim.
- **Baseline** `blocked_by_robots` **819**, `in_index` **830** (11-20);
  weekly Bing clicks **37** (week from 11-07), 25 in the 6 days from 11-14.
- **Target** by 12-20: `blocked_by_robots` ≤ 400 (Bing re-read the URLs),
  and weekly Bing clicks ≥ 60 for two consecutive weeks.
- **Guardrail** sitemap URLs crawled in the last 28 days (`bing_url_status`,
  `last_crawled >= checked_at - 28 days`) not below **131 of 419** — the app
  URLs must not starve the real pages of crawls.
- **Falsification, stated in advance:** (a) `blocked_by_robots` ≤ 400 and
  clicks still ≤ 40 a week for the three weeks after it got there → the
  stubs were not the cause; **MISS**, and put the `/app/?` lines back in the
  bingbot group (crawl budget was the rule's reason). (b) the guardrail falls
  below 100 → revert at once, whatever clicks do. (c) `blocked_by_robots`
  has not fallen by ≥ 200 at the read → **UNREADABLE** (Bing has not
  re-read them), extend four weeks.
- **Confounds** #72 (bingbot noindex on the 307 question pages, 11-20) works
  on the same mechanism in the same weeks: a click recovery cannot be split
  between the two, and #72's own `in_index` check (down ≥ 250) will now be
  met by the app URLs leaving — #72 should read its own URLs in
  `bing_url_status` / URL Inspection instead. #65 (the `/sql-exercises/`
  title, 11-20, read 12-12) moves that page's CTR in the same window. December
  seasonality. Read the three as one Bing window and say so.

### challenge 27 loads the table it borrows (employees on ecommerce)

- **Claimed** 2026-11-22 · **Shipped** on merge · **Read** 2026-12-20.
- **Change** Challenge 27 "UNION ALL Dedup: Cross-Dataset Search" lists
  `employees` + `customers` on `dataset: "ecommerce"`; ecommerce has no
  `employees` table, and the app loaded one dataset per challenge. On a fresh
  session the Expected Output never rendered (console: "Error backfilling
  expected output … no such table: employees") and Run/Submit answered "no
  such table: employees" to the reference solution itself — reproduced
  headless on the origin/main build. Now every challenge-load site (14:
  challenge open, the expected-output backfill, the mutating-challenge
  reloads, daily, mock questions) goes through `loadChallengeDatasets`:
  the challenge's own dataset whole, then only the listed tables it lacks,
  from the one dataset that has them (`src/utils/challenge-datasets.js`).
  The schema / sample panels and the question page show the borrowed table
  too. A full audit of the bank (307 incl. sector), the 30 daily cores and
  the 65 mock questions found #27 the only mismatch; `scripts/lint-content.mjs`
  had carried it as baselined BROKEN since July — removed from the baseline.
- **Why** C1, 60 days to 2026-11-22: 24 people opened #27, 3 ran it, 3 solved
  it. A run could only succeed when an earlier screen (speed run, an
  employees-dataset challenge) had already loaded the employees table.
- **Metric** `open_to_first_run` and `challenge_solve_through` (metrics.md),
  both for challenge 27, people as `coalesce(aid, username)`, shared filters.
- **Baseline** 24 opened → 3 first run (12.5%) → 3 solved (12.5%), 60 days.
- **Target** from the deploy to 2026-12-20: open → first run ≥ 40% and
  solve-through ≥ 30%, and **zero** `challenge_errored`
  rows for challengeId 27 whose message says "no such table".
- **Falsification, stated in advance:** (a) any post-deploy "no such table"
  error on #27 → the fix did not reach a load path; **MISS**, find the path.
  (b) ≥ 8 openers and open → first run still < 25% → the run gap was not the
  table; the drop-off is in the card (description, difficulty), and the next
  change is content, not loading. (c) fewer than 8 openers in the window
  (24 per 60 days ≈ 11 per 28) → **UNREADABLE**, extend to 2027-01-17.
- **Confounds** none known on #27; the fix also touches the daily and mock
  load paths, which no other challenge needed (the audit), so nothing else
  should move.

### the challenge tour no longer opens on the challenge just solved (A2)

- **Claimed** 2026-11-22 · **Shipped** on merge, no flag (a correctness fix) · **Read** 2026-12-20.
- **Change** the 6-step challenge tour's auto-start returns early when the open challenge is already solved. Since #99 the first screen is challenge 91, and the first solve is what ends the first-run shell the tour was waiting on — so the tour opened "Read the problem" on the solved challenge 600 ms after the win, on top of the intent ask (3 s later) and the archetype card; at 375 px its card covered the ask's "Just exploring". Now it waits for the next unsolved challenge (verified: "Next Question" → #92 opens it). Guards: tests/onboarding-tour-gate.test.js and the smoke step "first-screen challenge arm" (`tourAfterSolve`).
- **Why** A2 live QA walk of 2026-11-22: reproduced on production at 1366×800 and 375×812 with real mouse input, fresh storage, every time.
- **Metric** `second_session_7d`, restricted to people whose first solve was challenge 91.
- **Baseline** first opens 2026-11-01 → 11-14: 7 / 45 = 15.6%. Side read: the intent ask was answered by 33 / 40 people whose first solve was 91 (82.5%, 14 days to 11-22) against 41 / 54 for other first solves — the collision did not visibly cost answers.
- **Target** no harm: ≥ 15% at ≥ 45 people (first opens 11-23 → 12-12). This is a fix for what a person sees, not a growth bet.
- **Falsification, stated in advance:** below 10% at ≥ 45 people → read whether the tour on the next challenge (now the first one a person meets it on) is what changed; the fix itself stays unless the tour's move is the cause. Fewer than 45 → UNREADABLE.

### a page for rollup interview questions

- **Claimed** 2026-11-22 · **Shipped** on merge · **Read** 2026-12-27.
- **Change** New page /sql-rollup-interview-questions/ (generated by
  `scripts/build-rollup-page.mjs` from `src/data/sql-rollup.js`): what a
  rollup question asks, ROLLUP / CUBE / GROUPING SETS and which engines have
  them, labelling total rows with `GROUPING()`, and five worked questions —
  each standard query beside the SQLite `UNION ALL` form, the last a rollup up
  an org chart with a recursive CTE. Every SQLite result is run on the bank's
  `ecommerce` / `employees` tables and pinned by `tests/sql-rollup.test.js`;
  the standard queries were checked once by hand on PostgreSQL 18 with the
  same rows. No bank or mock solution on the page; FAQ JSON-LD equals the
  visible FAQ; one tracked CTA (`cta_rollup_practice`,
  `/app/?challenge=169&src=rollup-interview-questions`). Linked in the same
  commit from /sql-exercises/, /challenges/aggregation/, /challenges/cte/ and
  the five question pages it cites, with a line above the problem on
  /questions/recursive-team-size-rollup/; in the sitemap.
- **Why** `gsc_daily` [query, page], 28 days to 2026-11-22: "rollup interview
  questions" — **657 impressions, 0 clicks, position 8.9**, all of it on
  /questions/recursive-team-size-rollup/, a recursive-CTE question that does
  not answer the query. No page on the site targeted rollups; no other query
  with "rollup", "subtotal", "grouping sets" or "cube" had a row.
- **Founder action:** request indexing in GSC for
  `https://sqlquest.app/sql-rollup-interview-questions/` (URL Inspection →
  Request Indexing) after the deploy, and note the date here; the window
  below starts from it.
- **Metric** `gsc_page_clicks` (metrics.md, registered with this claim):
  clicks on the new page from the `gsc_daily` page slice, plus the [query,
  page] rows for "rollup interview questions".
- **Baseline** 0 clicks / 657 impressions for the query, on the mismatched
  page; the new page has no rows.
- **Target** ≥ 15 clicks on /sql-rollup-interview-questions/ in the 28 days
  after Google first shows it (first impression in the page slice, or the
  recorded indexing date).
- **Falsification, stated in advance:** (a) the page is shown for "rollup
  interview questions" at position ≤ 10 for 28 days and gets < 5 clicks → the
  query's searchers do not want a worked page either; build no more
  single-query pages from one zero-click row. (b) Google shows the page but
  below position 20 for the query → the page lost to the question page or to
  competitors on authority; the recursive question page keeps the impressions
  and we read that as a ranking problem, not a content one. (c) Google has not
  shown the page by 2026-12-13 → **UNREADABLE** on 12-27 (indexing, not
  content), and the founder re-requests indexing.
- **Confounds** the 2026-11-19 claim "four striking-distance snippets…" reads
  the same query on /questions/recursive-team-size-rollup/ (its snippet now
  says "not GROUP BY ROLLUP"). Read both on the same [query, page] rows and
  never credit one click twice: a click on the question page belongs to that
  claim, a click on the new page to this one.

### the inline Help ladder counts its own first read

- **Claimed** 2026-11-22 · **Shipped** 2026-11-22 · **Read** 2026-12-20.
- **Change** The inline panel's automatic first read (`inlineOpenerMessage`, sent `silent`) is answered as rung 1 but never entered the message list as a user turn, so `hintRequestNumber` counted only typed turns and the person's first typed question went out as rung 1 AGAIN; the clause (rung 2) came only on their second question. `ladderRequestNumber(priorMessages, silentAnswered)` (src/utils/tutor-context.js) counts silent requests the tutor answered (`inlineSilentAnsweredRef`, reset when the panel opens and when the challenge changes). No prompt change, no extra tutor calls. Guards `tests/tutor-ladder-count.test.js` (breaks caught: dropping the silent term from the count — 2 tests; dropping the increment on a silent answer — 1 test).
- **Why** docs/reads/tutor-ladder-2026-11-22.md: 112 of 209 Help opens (54%) were followed by "Show me the answer" within 60 min, half of them within 30 s; after a diagnosis opener the median wait before the bypass was 61 s — the first typed question got a second round of words where it should have got the clause.
- **Metric** `tutor_ladder` (metrics.md): `tutor_bypass_clicked` ÷ `inline_help_opened`, restricted to opens with `opener = diagnosis`; guardrail `hint_to_solve`.
- **Baseline** 54% bypass over all opens (112 / 209, 30 days to 11-22); the diagnosis-opener subset is read at the verdict from the same query.
- **Target** the diagnosis-opener bypass rate falls ≥ 8 points from its 30-day baseline; `hint_to_solve` does not fall more than 3 points.
- **Falsification, stated in advance:** bypass rate within ±3 points of baseline → people bypass for the answer itself, not because the ladder repeated itself; no further ladder work. `hint_to_solve` down > 3 points → revert.

### an expired Stripe session gets its recovery link (M-11)

- **Claimed** 2026-11-22 · **Shipped** NOT YET — the code is on branch `feat/mon-session-recovery`; it goes live only when the founder deploys `create-checkout-session`, `stripe-webhook` and `checkout-abandon`. **The clock starts at the founder's deploy**: no session expired before that date counts toward the verdict. · **Read** 2026-12-20 (expect UNREADABLE at that date — ~1 recovery-link mail a week; the verdict needs ≥ 20 recovery-link mails, re-read then).
- **Change** (1) `create-checkout-session` asks for `after_expiration: { recovery: { enabled: true, allow_promotion_codes } }` — promotion codes on the recovered copy unless the session already carries a discount (Stripe refuses both on one session). `consent_collection` stays off. (2) `stripe-webhook`, `checkout.session.expired`: `pro_checkout_expired` carries `recovery_url` (kept only if https on checkout.stripe.com or buy.stripe.com), `recovery_expires_at` (Stripe: 30 days), and booleans `stripe_email_present` / `prefilled_email` / `promotions_consent` — never an address. `checkout.session.completed` rows (`pro_trial_started`, `pro_purchase_pending`, `pro_purchase_completed`) carry `recovered_from`. (3) `checkout-abandon`, segment 1: when the person's latest expired session from that click has a live recovery link, read back from Stripe at send time (session id, username and `expired` status must match; nobody with a trial or purchase on record, since a recovered copy carries the trial), the button opens it; otherwise today's app link. `email_events.meta.recovery_link`. `?dry=1` lists each candidate with `path`, `recovery`, `why`, and — fixed here — no longer mails segment 1. Mailing an address only Stripe holds: written, OFF (`MAIL_STRIPE_ONLY_ADDRESSES = false`). Pure half `supabase/functions/_shared/checkout-recovery.ts`; guards `tests/checkout-recovery.test.js`.
- **Why** (docs/plans/monetization-ideas-2026-11-22.md, M-11 and 1b): 23 sessions expired unpaid in 30 days; 7 `checkout_abandon` mails sent; the mail returns 21% within 48 h but produces ~1 trial-or-paid per 112 mailed — the button sent people to the app, where the plan had to be picked again.
- **Metric** `checkout_abandonment` (metrics.md, the recovery-link block).
- **Baseline** 7 mailed / 23 expired; 1 trial-or-paid per 112 abandon mails (60 d to 2026-11-22).
- **Target** ≥ 15 of 23 expired sessions mailed; ≥ 2 recoveries (trial or paid within 7 days of a recovery-link mail) in 60 days.
- **Falsification, stated in advance:** 0 recoveries from ≥ 20 recovery-link mails → the session was not the obstacle; stop (no further work on the abandon mail's link). Note at the read: the "≥ 15 of 23 mailed" half depends on reaching people we hold no address for, which stays OFF until the founder's consent decision — while it is off, read that half as not attempted, not as missed.

### the day-7 charge gets a self-serve fix (M-01)

- **Claimed** 2026-11-22 · **Shipped** NOT YET — the code is on branch `feat/mon-failed-charge-fix`; it goes live only when the founder applies the migration `20261122130000_billing_issue_server_owned.sql` and deploys `stripe-webhook`. **The clock starts at the founder's deploy**: no failure before that date counts toward the verdict. App half flag `billingIssueLine` **on** (renders nothing until the webhook writes the field). · **Read** 2026-12-20 (expect UNREADABLE: ~1 failed charge a month; re-read after 6 failures).
- **Change** (1) `invoice.payment_failed` email (supabase/functions/stripe-webhook/payment-failed-email.ts): a "Fix it in Stripe" button to the invoice's own `hosted_invoice_url` (https://invoice.stripe.com only, else no button), the Customer Portal as the second line, "reply to this email" last; the first `subscription_cycle` charge after a trial says the free week ended and the first charge didn't go through, everything else says renewal; the subject names the founder, signed Göktuğ / Founder, SQL Quest. The checkout-decline rule (no email) and the per-invoice dedupe are unchanged. `pro_payment_failed` carries `after_trial`; the `email_events` row carries `kind` and `invoice_link`. (2) `customer.subscription.updated` → `past_due` writes `users.data.billingIssue = { since, invoiceUrl, subscriptionId }` (the latest invoice's link); `active` and `customer.subscription.deleted` clear it (only for the subscription that set it). Server-owned: `sq_save_user` keeps the row's value. (3) The app shows one line under the header on every tab, "Your card didn't go through — fix it in Stripe" → the invoice page; events `billing_issue_shown {days, isPro, plan}` (once per page session), `billing_issue_clicked`. Pure halves src/utils/billing-issue.js and payment-failed-email.ts; guards tests/billing-issue.test.js, tests/stripe-webhook-payment-failed.test.js, tests/stripe-webhook.test.js (M-01 block), tests/account-access.test.js (billingIssue block).
- **Why** (docs/plans/monetization-ideas-2026-11-22.md, 1c): of the 4 trials that reached the day-7 charge without cancelling (10-01 → 11-22), 2 first charges failed; 1 recovered after 16 days, 1 ($99 annual) is still lost; the one India renewal of the period failed with no retry. The email said "reply and I'll send you a link" and called a trial's first charge a renewal; the app said nothing.
- **Metric** `failed_charge_recovery` (metrics.md).
- **Baseline** 1 of 3 recovered (2026-10-01 → 11-22), median 16 days.
- **Target** ≥ 2 of 3 recovered within 7 days, over the next 6 failures after the deploy.
- **Falsification, stated in advance:** after 6 failures, ≤ 1 recovered within 14 days → the card itself is the block (India mandates, prepaid cards), not the link; stop here and move effort to M-03 (India one-time pass) / M-09 (card-free trial). Confound to state at the read: Stripe's own Smart Retries and failed-payment emails (M-01 part 3, a dashboard setting) may be switched on the same week — note the date of each and say the verdict covers the bundle.

### the quota wall asks once a day, then waits inline — an A/B (M-07)

- **Claimed** 2026-11-22 · **Shipped** on merge, flag `quotaWallInline` **on**, test `quota_wall_inline_v1` (half of browsers by `aid`, murmur-finalised hash, independent of first-screen / company-ask / modal-layout by test) · **Read** 2026-12-20.
- **Change** inline arm: the first quota-wall hit of the app's day opens the Pro modal as before; a later hit the same day shows a non-blocking card — "10 free solves used." (or the M-12 company line), "Try Pro free for 7 days" (opens the same modal by the person's click, `via: 'inline'`) and the modal's two free roads back (today's daily, the Coach). Control: the modal on every hit. `content_lock_reached` fires on every hit with `modal` and `quotaWallArm`. Pure half src/utils/quota-wall-inline.js; guards tests/quota-wall-inline.test.js.
- **Why** (docs/plans/monetization-ideas-2026-11-22.md, 1e): 142 wall people since 09-26, median 3 lock hits; 53% saw the modal 3+ times; `modal_dismissed` rows outnumber people 3 : 1 — a person asked a third time learns to swat (the tier-10 ask: 72% closed in under 3 s).
- **Metric** `quota_wall`, per arm (metrics.md).
- **Baseline** 12.8% plan click, 4.3% trial-or-paid within 7 d, 33% later-day return (09-26 → 11-21).
- **Target** inline arm: clicks ≥ control − 2 points, later-day return ≥ control + 8 points, at ≥ 60 wall people per arm (likely not before the 12-20 read — say UNREADABLE then and re-read at 60 per arm).
- **Falsification, stated in advance:** inline-arm clicks < 0.7× control at ≥ 60 per arm → the repeats were selling; turn `quotaWallInline` off (the modal on every hit). Confounds to state: #95's headline and M-12's company line sit on the same wall in both arms (equal across arms, so the split is clean; the pooled rate is not).

### the quota wall names the person's company (M-12)

- **Claimed** 2026-11-22 · **Shipped** on merge, flag `quotaWallCompany` **on** · **Read** 2026-12-20 (interim; the population is ~10 a month — the verdict needs ≥ 25 company-present wall people, expected no earlier than 2027-01-17).
- **Change** a person whose `prepTarget.company` has a plan target (`findPlanTarget`) meets the quota wall with "The rest of the <Company> set and the <mock title> are in Pro." (signed archetype: Capital One, Revolut) or "The rest of the <Company> set is in Pro." (tagged only — no mock, no number) as the first line under the headline, in place of "You've solved N — the free quota is N." The headline (#95) is unchanged. `pro_modal_shown` carries `wallCompany` / `wallCompanyKind`. Pure half `quotaWallCompanyLine` (src/utils/checkout-session.js); guards tests/checkout-session.test.js.
- **Why** (docs/plans/monetization-ideas-2026-11-22.md, M-12): company-set clickers converted 2 of 2 since 10-01; the wall spoke to everyone in the same generic words.
- **Metric** `quota_wall`, split by company (metrics.md).
- **Baseline** company-present (proxy, 09-26 → 11-21) 5 / 26 = 19.2% clicked; company-absent 14 / 118 = 11.9%.
- **Target** company-present clicks ≥ 1.3× their own baseline (≥ 25%) at ≥ 25 people; company-absent unchanged (it sees the same words as before).
- **Falsification, stated in advance:** below their baseline (19.2%) at ≥ 25 people → the company is not the lever at the wall; turn the flag off. Fewer than 25 by 2027-01-17 → UNREADABLE; keep it (it is true) and stop reading it. Confound: #95's headline read sits on the same wall — split it by `wallCompany`.

### the last 48 hours of a trial say the date, the price and what is left (M-10)

- **Claimed** 2026-11-22 · **Shipped** on merge, flag `trialEndingLine` **on** · **Read** 2026-12-20 (the verdict needs 8 matured trials; at ~5 trials a month expect UNREADABLE on 12-20 and a re-read by 2027-01-31).
- **Change** a person in a Stripe trial (`proTrial` + `proTrialEnd`, written by stripe-webhook) sees, from 48 h before the end, one line on the Coach and the challenge list: "Your free week ends on <day>. Then <price>/<month|year>." (price from `planPrices(priceRegion)`), "Still ahead in Pro: <n> Hard challenges you haven't solved, <the company mock | every timed mock>." and "Manage plan" (the Stripe portal). Events `trial_day5_shown {plan, hoursLeft, surface, priceRegion}` (once a day), `trial_day5_manage_clicked`. Pure half src/utils/trial-ending.js; guards tests/trial-ending.test.js.
- **Why** (docs/plans/monetization-ideas-2026-11-22.md, 1c): of 8 trials that reached day 7 since 10-01, 3 paid, 4 cancelled, 1 day-7 charge failed and never recovered; 2 of the 4 that reached the charge failed it first. In the app nothing said the date or the amount.
- **Metric** `trial_funnel` step 3 (trial → paid) and the failed first charges (`pro_payment_failed {billing_reason: subscription_cycle}` after a trial).
- **Baseline** 3 of 8 matured trials paid; 2 of 4 first charges failed.
- **Target** over the next 8 matured trials: ≥ 3 paid and ≤ 1 failed first charge.
- **Falsification, stated in advance:** cancellations reach ≥ 6 of the next 8 matured trials → the line pushes people out; reword to the "still ahead" half only (drop the date/price sentence) — the trial reminder email still carries the date.

### the modal stops warning of a currency switch that will not happen (M-06, part 1)

- **Claimed** 2026-11-22 · **Shipped** on merge; the line follows the existing `checkoutSessions` flag (off → the warning returns) · **Read** 2026-12-20.
- **Change** "Billed in USD; your local currency may be shown at checkout." renders only when checkout goes through a Payment Link (`currencyLine`, src/utils/checkout-session.js). With `checkoutSessions` on (since 2026-09-30) the session is created with `adaptive_pricing: { enabled: false }` (create-checkout-session/index.ts) and charges USD, so the warning was untrue there. The session request still falls back to a Payment Link on failure — 4 of 61 checkout clicks in 60 days to 11-22 — and those buyers go without the warning, as every link buyer did before 09-20. **Not changed:** the card-statement line ("Billed by Datrick, Inc."), which waits for the founder to confirm the descriptor from a real receipt (part 2).
- **Why** (docs/plans/monetization-ideas-2026-11-22.md, M-06): a line at the payment moment that warns of a switch that will not happen is friction; a line that does not match the statement is a dispute.
- **Metric** `checkout_disputes` (metrics.md); guardrail `trial_funnel` step 1.
- **Baseline** 0 disputes, 1 refund ever; `trial_funnel` step 1 as read 2026-11-22.
- **Target** no dispute from a trial conversion through 2027-01-31; modal → trial checkout click not lower than the 30 days before.
- **Falsification, stated in advance:** a buyer on the session path reports or disputes a non-USD charge → the premise (session = USD) is wrong; restore the line unconditionally the same day. Modal → checkout click falls by a third at n ≥ 60 viewers → not this line (it was below the plans), but read it before part 2 ships.

### company pages name question 1 in the hero (M-02)

- **Claimed** 2026-11-22 · **Shipped** on merge (static pages; revert by setting `HERO_NAMES_FIRST_QUESTION = false` in scripts/build-company-pages.mjs and rebuilding, or reverting the commit) · **Read** 2026-12-20.
- **Change** the hero's primary button on 32 company pages (all but Capital One, whose hero already opens challenge 275) reads "Solve <Company> question 1 now: <title> — free, no sign-up". The title is the question the app's company banner opens for a cold visitor (`companyFirstQuestion`, src/utils/company-first-question.js: curriculum order, Hard locks, the company set gate). The link is unchanged; the 23 older pages' hero button gains `data-track="cta_hero_primary"`. Guards tests/company-hero-cta.test.js.
- **Why** (docs/plans/monetization-ideas-2026-11-22.md, 1f): company arrivals are the best money door (2.3% trial-or-paid per arrival vs 0.5% for /sql-exercises/), but 81% of company-page landing people never open the app.
- **Metric** `company_page_door`, page → app step (metrics.md): landing people on `*-sql-interview` pages → `app_opened` (same aid) within 1 h.
- **Baseline** 19.1% (247 / 1,290, 2026-10-08 → 11-22).
- **Target** ≥ 25% at ≥ 600 landing people; guardrail: company arrivals' first-solve rate not below 27%.
- **Falsification, stated in advance:** under 21% at ≥ 600 landing people → the button's words are not what keeps people on the page; revert the copy and look at scroll depth before the hero instead. Confound to state at the read: the 11-20 banner claim (read 12-18) sits on the same arrivals, downstream of this step.

### the header's Pro button — a door a free person can press (M-04)

- **Claimed** 2026-11-22 · **Shipped** on merge, flag `headerProButton` **on** · **Read** 2026-12-20.
- **Change** a non-Pro person with 3+ solves (outside the first-run and lesson shells) sees "Try Pro free" (when the trial is offered; "Pro" otherwise; "Try Pro" under 400 px) beside the identity chip; it opens the Pro modal under the new reason `header` (the `pricing_link` headline). Events `header_pro_shown` (once per person), `header_pro_clicked {solves, trialOffered}`. Pure half `headerProCta` in src/utils/paywall-moments.js; guards tests/header-pro.test.js.
- **Why** (docs/plans/monetization-ideas-2026-11-22.md, 1d, 60 days): a person-opened modal clicks a plan at 26.7% (`pricing_link`) / 31.8% (`generic`) vs 3.2% (`milestone_solves`) and 13.2% (`free_quota`); a free person had no Pro entry in the header since 2026-09-14.
- **Metric** `header_pro` (metrics.md): shown → pressed → plan click → trial or paid within 7 days.
- **Baseline** none (new surface); comparison `pricing_link` 26.7% modal → plan click.
- **Target** ≥ 10 presses in 30 days; ≥ 20% press → plan click; `quota_wall` click rate not below 10%.
- **Falsification, stated in advance:** < 5 presses in 30 days → nobody looks for it; turn the flag off. Quota-wall clicks fall below 10% while header clicks rise → it moved clicks rather than adding them; turn the flag off.
- **Amended 2026-11-22 (A2 live QA, PR `qa/mobile-header-overflow`):** on phones the button shipped half off-screen — at 375 px the header row ran 62 px past the screen ("Try Pro" cut in half, the Guest chip off-screen); at 390/414 px the row overflowed even before the button. Fixed on merge: below `sm` the wordmark, level bar, XP coin and separators wait for `sm`. At the 12-20 read, split `header_pro_shown` / `header_pro_clicked` by the event's viewport (mobile vs desktop) and count mobile only from the merge date; a mobile press before it was a press on half a button.

### no tenth-solve ask in front of the quota wall

- **Claimed** 2026-11-22 · **Shipped** on merge (no flag; follows `freeQuota`) · **Read** 2026-12-20.
- **Change** the milestone ask's tier 10 is skipped while the free quota is on (`milestoneTier`, src/utils/free-tier-boundary.js); the next unsolved open meets the quota wall, which names the reason and leads with the trial (#95). Tiers 6, 25, 50 unchanged.
- **Why** (45 days to 2026-11-22, bots out): tier 10 shown to 65 people, **47 closed it in under 3 s (72%)**, 5 clicked a plan; tier 6: 123 people, 28 under 3 s (23%), 5 clicked. Two asks one open apart, and people swat the first.
- **Metric** people reaching 10 solves (non-Pro): plan click within 7 days of the 10th solve (any modal reason); guardrail: trials + purchases from the same people.
- **Baseline** 45 days: tier-10 ask 5 / 65 clicked; the quota wall's clicks counted separately (#84, #95).
- **Target** plan clicks among 10-solvers not below the baseline sum of tier-10 + wall clicks; trials/purchases from them not lower.
- **Falsification, stated in advance:** clicks among 10-solvers fall by more than a third at n ≥ 40 → the tier-10 ask was selling on its own; restore it.

### the first click on an empty editor runs the starter

- **Claimed** 2026-11-22 · **Shipped** on merge (no flag) · **Read** 2026-12-20.
- **Change** a first-time opener (no solves) sees an empty editor whose placeholder reads "Start here: SELECT * FROM <table> LIMIT 5;". Run and Submit on that empty editor did **nothing** — silent no-ops on the product's two main buttons. Now Run writes the starter into the editor and runs it (`challenge_first_run {via: 'starter'}`); Submit does the same and is not graded. src/utils/starter-query.js builds the hint and parses it back, so they cannot drift.
- **Why** (new people 11-08 → 11-21, bots out): 394 new people, 271 opened a challenge, **119 ran a query (44% of openers)**, 98 solved — the run is where the funnel leaks; once people run, 82% solve. Challenge 91, the one opener that is pre-filled, runs far more (the shipped first-screen arm: 51% ran).
- **Metric** `open_to_first_run` (metrics.md): people who open a challenge → `challenge_first_run` (any `via`) — split `via = 'starter'` from the rest.
- **Baseline** 44% of openers ran (119 / 271).
- **Target** ≥ 55% of openers run; solve-after-run not below 70% (82% now — starter runs must not dilute it into nothing).
- **Falsification, stated in advance:** openers-who-run unchanged (± 3 points) at n ≥ 200 → the dead button was not why they left; look at time-to-leave. Solve-after-run below 70% → the starter run is a dead end; keep it but add the next-step line.

### a deep link to a locked Hard opens a free Hard of the same kind

- **Claimed** 2026-11-22 · **Shipped** on merge (no flag; only deep links, only at cold start, only Hard) · **Read** 2026-12-20.
- **Change** a visitor who has solved nothing and arrives through `/app/?challenge=<id>` on a locked Hard (topic pages, /challenges/advanced/, question pages, shares) is put into the unsolved free Hard preview sharing the most tags with it (`previewSwapFor`, src/utils/paid-wall.js), with one line above the editor naming the Pro question. In-app clicks still get the cold-start dialog; nothing is sold to a zero-solve person either way. Event `deeplink_preview_swap {from, to}`; the lock row is still written first.
- **Why** (30 days to 2026-11-22, bots and crawler window sizes out): ~75 people arrived from topic pages on a locked Hard with zero solves and met the cold-start dialog — which offers an EASY starter to someone who asked for Hard; 3 opened anything afterwards, 1 solved. /challenges/advanced/ alone: ~14 real people a month, 0 opened.
- **Metric** people with `content_lock_reached {wall: cold_start}` or `deeplink_preview_swap` whose `arrivalSrc` is a page: share who run a query (`challenge_first_run`) and who solve within 60 minutes.
- **Baseline** opened-anything-after 4% (3 / ~75), solved 1.3%.
- **Target** ≥ 40% run a query, ≥ 10% solve, in the 28 days after merge.
- **Falsification, stated in advance:** run-rate under 15% at n ≥ 30 → a Hard preview is too far for a cold arrival too; send them to the topic's Easy instead. n < 30 by 12-20 → extend.

### the account ask at the third solve (`signupAskAtThree`)

- **Claimed** 2026-11-22 · **Flipped** on merge (decided under the founder's delegation, "kararlar sana ait olsun") · **Read** 2026-12-20.
- **Change** the guest ladder's account prompt (username + email + password, dismissible — never a wall) moves from the 10th solve to the 3rd; the soft email capture it replaced at 3 is skipped once the account rung has fired. Built 2026-09-14 (feature-flags.js has the reasoning); dark until now.
- **Why** (30 days to 2026-11-22, bots out): 132 guests reached 3 solves and **31 signed up on their own (23.5%)**; the account prompt at the tenth solve reached **20** people. An account is what the lifecycle mail, the cross-device save and the checkout email all need; the brand read (BACKLOG item 8) ties fewer sends to fewer people coming back.
- **Metric** guests reaching 3 solves → `signup_completed` within 7 days (by aid); guardrail: people reaching 3 solves who reach 6 (`challenge_solved`, distinct ids).
- **Baseline** 23.5% (31 / 132); guardrail 43.5% (64 / 147) reach 6 from 3.
- **Target** ≥ 35% sign up; 3 → 6 not below 38.5%.
- **Falsification, stated in advance:** 3 → 6 below 38.5% at n ≥ 100 → the ask costs the second session's solves; flag off the same day. Sign-up under 27% → the ask is not the reason guests stay guests; flag off, keep the email capture at 3.

### a column mismatch gets the one line that fixes it

- **Claimed** 2026-11-22 · **Shipped** on merge (no flag; first line of the column diagnoses, which primaryHint shows) · **Read** 2026-12-20.
- **Change** `columnFixLine` in src/utils/diagnose.js names the difference instead of printing both header lists: the expression to name (`COUNT(*) AS txn_count`), the column to rename, add or drop, names that differ only by case (the grader matches exactly), or the order to use; "SELECT * brings every column" when three or more extras arrive. The two lists stay as hints 2–3.
- **Why** (read 2026-11-22, 09-30 → 11-21, bots out): `column_set` is the slowest wrong-submit kind to recover — **69.7%** of 132 person-challenges solved within the hour, against 83–95% for the result-shape kinds.
- **Metric** `hint_to_solve` restricted to `challenge_error_pattern.primary = 'column_set'`.
- **Baseline** 69.7% (n = 132).
- **Target** ≥ 78% at n ≥ 80 in the 28 days after merge.
- **Falsification, stated in advance:** under 72% at n ≥ 80 → naming the difference is not the block; look at which challenges carry the column_set misses before writing more. n < 80 by 12-20 → extend 28 days.
### the quota wall's headline says the trial ("Try Pro free for 7 days")

- **Claimed** 2026-11-22 · **Shipped** on merge (no flag; only where the trial is already offered) · **Read** 2026-12-20, extend to 2027-01-17 if n is short.
- **Change** reason `free_quota`: the headline "10 free solves done. Pro opens the rest." becomes "10 free solves done. Try Pro free for 7 days." whenever `trialOfferOn` (the same value the plan cards' "7 days free, then billed …" reads). Price, plans, terms and gate unchanged.
- **Why** (read 2026-11-22): the wall is the surface that sells — 141 people met it 09-26 → 11-21, 18 clicked a plan, 6 trialled or paid within 7 days — and 97 of the 98 people shown its modal since 10-02 were offered the trial, but only in grey under each price. Most purchases since 10-01 started as trials.
- **Metric** `quota_wall` (metrics.md): people meeting the wall → `pro_trial_started` / `pro_purchase_completed` (stripe_webhook) within 7 days; clicks per person at the wall as the guardrail.
- **Baseline** 10-02 → 11-21: 97 people shown the free_quota modal; 6 of the 141 wall people trialled or paid within 7 days (4.3%); 12.8% clicked a plan.
- **Target** ≥ 8% of wall people start a trial or pay within 7 days, clicks at the wall not below 10%.
- **Falsification, stated in advance:** clicks below 10% → the headline costs the click; revert. Trial-or-pay share at or under 4.3% at n ≥ 50 → the headline is not the lever; leave it (it is true) and look at the Stripe step. n < 50 by 12-20 → extend to 01-17.
### a syntax error gets the line that fixes it (`near "X"` read against the query)

- **Claimed** 2026-11-22 · **Shipped** on merge (no flag; shows wherever the diagnosis panel does — `diagnosisHints` is on) · **Read** 2026-12-20.
- **Change** `syntaxNearHint` in src/utils/diagnose.js puts one specific line first for a SQL syntax error, checked against the query: no TOP in SQLite → LIMIT n; a comma before FROM / WHERE / …; two commas; an unclosed '(' or quote; a query that stops mid-condition; IN without parentheses; FROM with no table; ORDER / GROUP without BY; DESC after LIMIT; a clause out of order (WHERE → GROUP BY → HAVING → ORDER BY → LIMIT, outer query only); two names in a row in SELECT; the Turkish İ / ı in a keyword (`no such column: LİMİT` was in production). No match → the old generic lines.
- **Why** (read 2026-11-22, 09-30 → 11-21, bots out): `syntax_error` is the most common wrong-submit kind — 341 person-challenges — and the slowest to recover: **75.1%** solved within the hour, against 83–95% for every result-shape kind (only `column_set`, 69.7%, is lower). Top SQLite tokens: near WHERE 44, ORDER 43, FROM 27, "(" 23, a number 25.
- **Metric** `hint_to_solve` restricted to `challenge_error_pattern.primary = 'syntax_error'`: person-challenges solved within 60 minutes.
- **Baseline** 75.1% (n = 341, 09-30 → 11-21).
- **Target** ≥ 82% at n ≥ 150 in the 28 days after merge.
- **Falsification, stated in advance:** under 77% at n ≥ 150 → the line is not what stalls them; read which tokens still stall before adding rules. n < 150 by 12-20 → extend 28 days.
### Capital One: the 10-12 read, branch 3 — the blog is the door, the page is the product

- **Claimed** 2026-11-22 · **Shipped** on merge (the founder's 09-25 plan, "12 Ekim'de ilk iş bu"; 41 days late) · **Read** 2026-12-20.
- **The read** (`gsc_daily`, 28 days to 2026-11-20): the blog post
  `/blog/capital-one-codesignal-data-analyst-assessment/` 641 impressions,
  39 clicks (6.1%), position 7.4, every visible `capital one …` query; the
  company page 109 impressions, 9 clicks, position 6.2, and no
  `capital one sql interview*` query at all. That is branch 3 of
  docs/plans/capital-one-2026-10-12.md.
- **Change** company page title/meta transactional ("Capital One SQL
  Interview (2026): 25 Questions + Mock", the 25 bound to the tag count by
  `tests/snippet-length.test.js`); section E of the plan (cards say
  "Measures:", one number in the hero, both mock buttons say Pro, the
  sourced section headed "How the interview runs (sourced)", the shared
  topic block with the dialect sentence); the five trap pages link to the
  page (step B); the blog's skip-ahead box gains the timed mock link
  (`src=capital-one-blog`, step C). The freeze is lifted in the generator,
  the blurb script and the tests. **Not done on purpose:** the blog title —
  it is the page earning 6.1% CTR; changing a working title would confound
  the read.
- **Baseline** (28 days to 2026-11-22): 110 real readers of the two pages
  (`landing_view`, bots and Asia/Shanghai out), 3 clicks on the page's mock
  buttons, 0 Pro modals from a Capital One or trap-page mock link, 0
  checkout clicks from them.
- **Metric** `gsc_daily` for both pages (clicks, CTR, any `capital one sql*`
  query on the company page); money side `pattern_to_checkout` and
  `pro_modal_shown` with `modalReason` `mock_link` / `pattern_mock` and
  `linkSrc` `capital-one-*` / `pattern-*`.
- **Target** the company page ≥ 20 clicks in 28 days (from 9) with the blog
  holding ≥ 30; ≥ 5 Pro modals from these mock links.
- **Falsification, stated in advance:** blog clicks fall below 25 → the
  blog's box change cost it, revert the box; company page CTR falls at the
  same position → restore the old title. No modal from the mock links in 28
  days → the mock is not what Capital One readers want; stop pointing at it.

### four more snippets that fit the window

- **Claimed** 2026-11-20 · **Shipped** on merge (founder's Go: "senin önerilerin iyi onları yap") · **Read** 2026-12-18.
- **Change** titles cut to ≤ 70 characters and descriptions to 120–170 on four
  pages that rank on Google's first page but are rarely clicked; og/twitter
  tags and the Article headline follow. Same rule and guard as the 09-29
  batch (`tests/snippet-length.test.js`, `SNIPPET_PAGES`).
- **Baseline** (`gsc_daily` page slice, 28 days to 2026-11-19):
  | page | impressions | clicks | CTR | position |
  |---|---|---|---|---|
  | `/best-sql-practice-sites/` | 1,774 | 26 | 1.5% | 8.3 |
  | `/sql-practice-comparison/` | 438 | 7 | 1.6% | 6.9 |
  | `/blog/row-number-vs-rank-vs-dense-rank/` | 294 | 1 | 0.3% | 8.0 |
  | `/blog/null-handling-mistakes/` | 730 | 4 | 0.5% | 6.6 |
  Old titles were 78–87 characters (Google cut them mid-promise).
- **Metric** `gsc_daily` page slice: CTR per page at an unchanged position.
- **Target** the four together from 38 clicks / 3,236 impressions (1.2%) to
  ≥ 2.5%; per page HIT when CTR at least doubles with position within ±2.
- **Falsification, stated in advance:** a page whose position moved more than
  2 places → UNREADABLE for that page (the snippet is not what changed); a
  page whose CTR fell at the same position → MISS, restore its old title.
  The 09-29 batch read 2 HIT / 3 rank losses — expect the same mix.

### a company arrival gets a first question to press

- **Claimed** 2026-11-20 · **Shipped** on merge (no flag; founder's Go on the funnel plan, item 5) · **Read** 2026-12-18.
- **Change** the company banner in the Challenges view (`?company=X`, the
  CTA of every company page) gets one primary button: "Start with question
  1: <title>" (then "Next <Company> question: …"), opening the set's first
  open, unsolved challenge in curriculum order behind the list rows' locks.
  `challenge_opened.openedFrom = 'company_banner'`.
- **Why** 35 days to 2026-11-20: 149 people arrived in the app from a company
  page via search (`app_opened`, arrivalSrc `company:*` or `*-sql-interview`,
  landingSrc `search:*`, no bot stamp). **63 opened no challenge at all**;
  57 of them were intent-routed and then did nothing. The set's list starts
  ~1,000px down under the generic learning-path cards; the banner said "pick
  any one to start" with nothing to press. Of those who opened an Easy, 34 of
  67 solved.
- **Metric** on that same population: share who fire `challenge_opened`
  within 30 minutes of the first `app_opened` (baseline **86 / 149 = 58%**),
  and who fire `challenge_solved` (baseline **42 / 149 = 28%**). Not yet a
  named metric in `docs/agent/metrics.md` — register it before the read.
- **Target** opened ≥ 75% and solved ≥ 35%, with `company_banner` the
  `openedFrom` on most first opens.
- **Falsification, stated in advance:** opened under 62% → MISS (the button
  is not what was missing); fewer than 40 arrivals in the window →
  UNREADABLE, extend. Guardrail: company arrivals' `pro_plan_clicked` must not
  fall (it was 4 people in the baseline window — read the counts).

### three more fintech company pages: PayPal, Coinbase, Monzo

- **Claimed** 2026-11-20 · **Shipped** on merge (founder's Go on the funnel plan, item 1) · **Read** 2027-01-15 (Google needs 3–6 weeks to index and settle a new page).
- **Change** `/paypal-sql-interview/`, `/coinbase-sql-interview/`,
  `/monzo-sql-interview/` from the company template, each with a sourced
  format section (fetched, dated sources; research
  `docs/reads/company-research-2026-11-20.md`), a 16-challenge tagged set
  (Easy → Hard; the Revolut set stays Revolut-only), the fintech cross-link
  ring, the interview hub, the app's `?company=` list and the intake list.
  Robinhood, Klarna and Adyen were researched and deferred (reasons in the
  read). Company-page count 30 → 33 on every page that states it.
- **Why** company pages are the best door we have: 222 search/AI visitors in
  28 days, 55% to the app (topic pages 75%, blog 12%); Wise (CTR 27%, position
  3.6) and Revolut (18.8%, 4.4) are the model, and 2 of the first 3 payers came
  through a company door.
- **Metric** `gsc_daily` page slice clicks for the three pages, and
  `app_opened` with `arrivalSrc` `company:PayPal|Coinbase|Monzo` or the
  three slugs.
- **Target** together ≥ 40 Google clicks in the 28 days to the read and ≥ 20
  people into the app from them.
- **Falsification, stated in advance:** under 10 clicks in total with the
  pages indexed → MISS, and the next company batch waits; a page not indexed
  by the read → UNREADABLE for that page (request indexing by hand first).
  Brand accents were set from memory, not fetched — fix by eye if one is off.

### Bing: the question pages leave Bing's index (bingbot noindex, follow)

- **Claimed** 2026-11-20 · **Shipped** on merge (generator change, no flag;
  founder's Go in chat, "ne önerirsen o olsun") · **Read** 2027-01-08.
- **Change** every `/questions/<slug>/` page (307) carries
  `<meta name="bingbot" content="noindex, follow">`. `robots` stays
  `index, follow`, so Google is untouched; the `/questions/` hub stays
  indexed on both; every page stays in the sitemap so Bing recrawls it and
  reads the tag. Generator: `scripts/build-question-pages.mjs`
  (`BINGBOT_QUESTION_META`); guard: `tests/question-pages.test.js`.
- **Why** Bing weekly clicks (`bing_stats` page slice, Sat→Fri buckets) fell
  258 / 270 (weeks to 09-25 / 10-02) → 180 → 163 → 90 → 73 → 69 → **33**
  (week to 11-13) while Google stayed flat. 305 of 416 sitemap URLs were
  question pages; Bing crawled 261 of them and they drew **1 impression** in
  four weeks. Hypothesis: hundreds of thin pages with no Bing demand weigh on
  how Bing rates the whole site, and the pages that do earn Bing clicks
  (`/sql-exercises/` first) lose with them.
- **Metric** `bing_indexed` (`bing_crawl_daily.in_index`, baseline **825** on
  2026-11-18) as the mechanism check, and weekly Bing clicks on the page slice
  of `bing_stats` (baseline **33**, week to 2026-11-13; the four weeks before:
  163, 90, 73, 69). Weekly clicks are not yet a named metric in
  `docs/agent/metrics.md` — register them there before the read or the click
  half reads UNDEFINED.
- **Guardrail** Google clicks to `/questions/` pages (`gsc_daily` page slice)
  do not fall over the same window — Google must not have read the tag.
- **Target** `in_index` down by ≥ 250 (Bing processed the tag) AND weekly
  Bing clicks back at ≥ 70 (the late-October level) for two consecutive weeks
  inside the window.
- **Falsification, stated in advance:** `in_index` drops ≥ 250 and weekly
  clicks stay ≤ 40 for the four weeks after the drop → MISS; take the tag
  off (delete the line in `head()`, rebuild). `in_index` has not dropped by
  ≥ 150 at the read → UNREADABLE (Bing has not processed it), extend four
  weeks. December seasonality confounds any rise; say so in the verdict.

### the wait between a plan click and Stripe says what is happening, and never drops a slow session

- **Claimed** 2026-11-20 · **Shipped** client on merge (no flag: the fix to a
  measured defect, founder's "acilen çöz") · server half (warm-up + timing
  log) on `supabase functions deploy create-checkout-session` · **Read**
  2026-12-18.
- **Change** the clicked plan card shows "Opening checkout…" and every card
  is disabled until Stripe opens; the client timeout goes 8 s → 20 s (re-entry
  window 12 s → 25 s); the Pro modal sends a `{ warm: true }` request so the
  function opens its connection to Stripe before the click; the function logs
  `timing pre=… stripe=…` per session.
- **Why** 2026-11-13 → 11-20: all 8 session clicks took 7–9 s from
  `pro_checkout_clicked` to the function's `pro_checkout_started` (boot was
  45 ms; the time is inside the Stripe call), against an 8 s timeout. Every
  buyer clicked the card 5–25 more times; one (11-13) was thrown onto the
  Payment Link 1 s before his session was ready and did not buy.
- **Metric** `trial_funnel` step 2 and `checkout_session_fallback` rows.
  Baseline: 1 fallback in 8 session clicks; `pro_plan_clicked` rows per
  `pro_checkout_clicked` 57 : 8 (rage clicks).
- **Target** zero `checkout_session_fallback {reason: 'timeout'}`;
  `pro_plan_clicked` per `pro_checkout_clicked` under 1.5; the logged
  `stripe=` time under 3 s on a warmed session.
- **Falsification, stated in advance:** any timeout fallback with a session
  logged inside 20 s → MISS (the window is still too short); fewer than 5
  session clicks by the read → UNREADABLE. Not expected to move
  `visitor_to_payer` on its own.
- **Correction 2026-11-20 (after the server deploy).** The "Why" above was
  wrong about where the time goes. The first logged session read `timing
  pre=8449ms stripe=447ms` (warm-up 261 ms, 204): Stripe takes under half a
  second; the ~8 s is `trialAlreadyUsed` scanning all of `pro_events`
  (141,944 rows, no index on `username`; EXPLAIN ANALYZE 2.0 s from cache).
  The warm-up stays (harmless, one request per modal) but cannot help. Fix:
  partial index `idx_pro_events_webhook_username` (migration
  20261120150000, the founder applies it). Target added: logged `pre=` under
  500 ms after the index.

### paywall moments: every Pro surface a free person meets offers the way in (`paywallMoments`)

- **Claimed** 2026-11-14 · **Flipped** _pending the founder's go_ · **Read**
  flip + 28 days.
- **Change** PLAN item 3 (src/utils/paywall-moments.js). The three soft
  gates (30-day path day 11+, Medium/Hard daily, the Coach's Hard rows) keep
  their toast and add a "See what Pro opens" button, the person's own click;
  the 30-day Pro tiles stop being `disabled` (the gate never ran); a locked
  mock card's body opens the plans; the tutor's two "Upgrade" links open the
  plans instead of the Profile tab; the Profile plan button, the Interview
  tab button and the Coach strip name their reason; `thirty_day`,
  `daily_difficulty`, `interview_locked` / `interview_tab` and `hard_challenge`
  get modal copy of their own. Nothing free becomes Pro; no price changes.
- **Why** an audit of every Pro surface (2026-10-17) found surfaces that
  named Pro and offered nothing, or did nothing on a click.
- **Metric** `paywall_moment_reach` (metrics.md). Baseline there: reach is
  small (60 d: thirty_day 0, daily_difficulty 1, interview 76 people).
- **Target** on `interview` (the only surface with n): modal → plan click
  at ≥ 2× the baseline's 2 of 53; on the others, every person who meets the
  gate and clicks the button sees the modal (a wiring check, not a rate).
- **Falsification, stated in advance:** fewer than 20 people on a surface at
  the read → `UNREADABLE` for that surface, expected for all but `interview`;
  `interview` modal → plan inside ±1 person of baseline → `FLAT`. This change
  is hygiene; it is not expected to move `visitor_to_payer`, and a read that
  claims it did should be treated as noise.
### the question pages' snippet fits the window (the 10-27 rule)

- **Claimed** 2026-11-13 · **Shipped** in PR `seo/question-snippets`, under the
  rule pre-registered in docs/plans/seo-october-2026-09-29.md §3 ("if CTR
  stays under 1.5% at position ≤ 10, the lever is the generator's
  title/description template — one change for 300 pages, made after the
  read") · **Read** 2026-12-15.
- **Change** `questionSnippet` in scripts/build-question-pages.mjs, applied to
  all 304 question pages:
  - **Title:** `<name> — SQL Interview Question | SQLQuest.app` when it
    fits in 70 characters. Otherwise `— SQL Question`, otherwise the name
    alone. It was `<name> — SQL Interview Question (<Difficulty>) |
    SQLQuest.app`, 70–95 characters.
  - **Description:** 120–170 characters. It leads with the problem's task
    sentence (never a column list or an ordering rule), then "A medium JOIN
    question: write the query in the browser, graded on the result." It was
    the first 138 characters of the problem cut by "…" plus a tail Google
    never showed.
  - **Hub title:** 72 → 61 characters.
  - The body is unchanged. The page still publishes no solution and no Pro
    hint.
- **Why** 28 days to 11-10: 4,490 impressions at position 7.6, 29 clicks
  (0.65%). Without the one off-intent page (`recursive-team-size-rollup`
  for "rollup interview questions", 588 impressions), CTR is 0.74%.
- **Metric** `gsc_position` (metrics.md) on the page slice of `gsc_daily`
  for `/questions/<slug>/`, comparing the 28 days to 12-13 with the 28 days
  to 11-10.
- **Target** CTR ≥ 1.5% at a position no more than 1.0 worse.
- **Falsification, stated in advance:**
  - CTR below 1.0% at the same position → the snippet was not the cause.
    The searchers want a solution, which these pages will not publish, so
    no more template work goes here.
  - Position down more than 2 → revert the template. The old title
    carried the difficulty, the new one does not.
- **Confounds**
  - Brand demand halved over October (homepage queries), but the question
    pages do not rank for brand queries.
  - Google takes 2–4 weeks to show a new title. The read date allows for
    that.
### four striking-distance snippets say what the searcher typed (rollup, JOIN examples, govern AI SQL, SQLBolt)

- **Claimed** 2026-11-19 (PR `seo/striking-distance-2026-11`, not merged
  without the founder's go) · **Read** ship + 28 days, GSC's own lag
  included — 2026-12-17 if it ships 2026-11-19; move the date with the merge.
- **Change** title + description (og/twitter equal to both) of four pages,
  bodies untouched except one FAQ entry and one methodology sentence on
  /vs-sqlbolt/ and the H1 of the JOINs post:
  /questions/recursive-team-size-rollup/ → "Recursive CTE Question: Org Chart
  Team Size (Hard)", description opens "A recursive roll-up, not GROUP BY
  ROLLUP" (one per-slug override in scripts/build-question-pages.mjs, the
  template unchanged for every other page, URL unchanged);
  /blog/sql-joins-explained/ → "SQL JOIN Examples: INNER, LEFT, Anti-Join,
  Self Join"; /blog/validate-ai-generated-sql/ → "Govern AI-Generated SQL
  Before Production: 7 Checks"; /vs-sqlbolt/ → "SQLBolt: 18 Lessons, 53
  Exercises, and What Comes Next" plus the FAQ "How many lessons does SQLBolt
  have?" (both counts from docs/reads/sqlbolt-2026-11-19.md, re-counted that
  day). Bound by tests/snippet-length.test.js.
- **Why** GSC, 28 days to 2026-11-14 ([query, page] slice of `gsc_daily`):
  "rollup interview questions" 624 impressions at 8.9, 0 clicks (wrong
  intent — those searchers want GROUP BY ROLLUP); "sql join examples" 506 at
  27.7 (Bing 469, 1 click); "how to govern ai-generated sql before it
  reaches production" 158 at 3.4, 0 clicks; "sqlbolt" 283 at 14.6, "sql bolt"
  58 at 9.6, "how many lessons does sqlbolt have" 57 at 6.1.
- **Metric** `gsc_position` (metrics.md), per query on the [query, page]
  slice: impressions, clicks, CTR and average position of each query above
  to its page, 28 days after vs the 28 days before the ship date.
- **Target, stated in advance:**
  - "rollup interview questions" → /questions/recursive-team-size-rollup/:
    success is honesty, not clicks — impressions fall by half or more, or
    CTR > 0. Impressions flat with 0 clicks = the snippet change did nothing.
  - "sql join examples" → /blog/sql-joins-explained/: position up ≥ 5
    (27.7 → ≤ 22.7) and ≥ 1 click.
  - the "govern AI-generated SQL" query → /blog/validate-ai-generated-sql/:
    ≥ 3% CTR at position ≤ 5 (from 0 on 158 impressions).
  - "sqlbolt" + "sql bolt" + "how many lessons does sqlbolt have" →
    /vs-sqlbolt/: ≥ 1% CTR combined (from 0 on ~400 impressions), position
    no worse than 1.0 down on any of the three.
- **Falsification, stated in advance:** zero clicks on all four groups at
  ≥ 1,000 combined impressions → the snippets were not what held clicks
  back. Any page's position down > 2 on its query → revert that page's
  title. Confound to check before reading: any other change to these four
  pages, or a Google core update, inside either window.
### /sql-exercises/ title names both nouns and "With Solutions"

- **Claimed** 2026-11-14 · **Shipped** on the founder's ask in chat
  ("sql-exercises başlık PR'ını aç") · **Read** 2026-12-12 (ship + 28 days;
  Bing's query rows are weekly buckets).
- **Change** title "SQL Practice Questions — 300+ Exercises With Solutions"
  → "SQL Practice Questions & Exercises With Solutions" (68 chars raw);
  description says "questions and exercises with solutions"; og/twitter
  title and description equal to them (og:description also lost
  "skill-radar"). H1 and body untouched.
- **Why** Bing, the page slice of `bing_stats`: 227 clicks / 3,686
  impressions in the week ending 10-02, 46 / 1,119 in the week ending
  11-06, position 6 → 7. Most of the fall is impressions (−70%), which no
  title fixes; CTR fell too (6.2% → 4.1%). Per query, Sept vs 10-17 on:
  "sql practice exercises" 43 → 7 clicks at position ~3 (CTR 14% → 7%),
  "sql exercises" 23 → 5, "sql practice questions" 43 → 19 (CTR held best).
  Google's best-clicked query for the page is "sql practice exercises with
  solutions" (15 clicks, position 7.1, last 56 days).
- **Metric** `bing_page_ctr` (metrics.md) on /sql-exercises/, plus the
  [query] slice of `bing_stats` for "sql practice exercises", "sql
  exercises", "sql practice questions"; Google's [query, page] slice for
  "sql practice exercises with solutions". 28 days after vs 28 days before.
- **Target** page CTR on Bing back to ≥ 5% (from 4.1%); "sql practice
  questions" CTR not below 4%.
- **Falsification, stated in advance:** CTR flat or down at a comparable
  position → the title was not the cause, and the decline is demand
  (impressions) — work on new pages, not this snippet. "sql practice
  questions" position down > 2 or CTR < 3% → revert to the old title. A
  confound: impressions are still falling; read CTR, never clicks.
- **Verdict** _pending_

### a 7-day trial at checkout: "nothing is charged today" (checkoutTrial)

- **Claimed** 2026-10-01, before the flip · **Flipped** 2026-10-01 (founder's
  Go in chat: "go") · **Reads** 2026-10-09 (the first trials reach day 7)
  and 2026-10-22 (three weeks).
- **Change** with `checkoutSessions` and `checkoutTrial` both on, a person
  with no trial on their record sees "7 days free, then billed
  monthly/yearly" on the plan cards and one line under them: "7-day free
  trial: a card is required and nothing is charged today. Cancel before day
  7 and you pay nothing." The plan click creates a session with a 7-day
  trial (one per username, decided by the server). Prices, plans, the modal's
  triggers and the Payment Link fallback are unchanged. Stripe's page, read
  before the flip on three live sessions: "7 days free — Then $29.00 per
  month starting October 8, 2026", "$99.00 per year", India "$9.00 per
  month"; USD; the button reads "Start trial".
- **Why** docs/reads/checkout-clickers-2026-10-01.md: from 09-22 to 10-01
  thirteen people clicked a plan and one paid, and until that one nobody had
  typed a card. Where the card is not the obstacle (priceRegion `default`),
  54 people saw the modal after the quota flip, 5 clicked, 0 paid. "Pay now
  for something not yet seen from the inside" is the explanation a trial
  tests; it does nothing for a card that fails 3D Secure.
- **Metric** `trial_funnel` (metrics.md): of people with `pro_checkout_clicked
  {trial: true}`, the share with `pro_trial_started`; and of trials at least
  8 days old, the share with `pro_purchase_completed {after_trial: true}`.
  Second line, `modal_click_rate` by `trialOffered` (new field on
  `pro_modal_shown` from this flip). **Baseline** click → Pro without a
  trial, 09-22 → 10-01: 1 of 13 (7.7%); `default` region 0 of 5. Modal →
  click since the quota flip: `default` 5 of 54 (9.3%), `IN` 7 of 36 (19.4%).
- **Target** by 10-22: click → trial started ≥ 25% on at least 15 clickers,
  and trial → paid ≥ 40% on at least 5 trials old enough to have been charged.
- **Falsification, stated in advance:** ≥ 15 clickers and fewer than 3 trials
  → "pay now" was not the obstacle; the trial goes off and the next step is
  the payment method, not the offer. Trials start but < 25% of ≥ 8 matured
  ones pay → it attracts people who were never going to pay; off, unless the
  money per modal viewer still beats pay-now. **Any dispute or chargeback
  from a trial conversion → off the same day**, whatever the rates.
- **Not verified live at the flip:** a real trial start and its day-7 charge
  through the webhook (nobody here can type a card). The code path was read
  line by line; the first `pro_trial_started` is checked by hand — the user
  row must show Pro to the trial end — and the first conversion on day 7 the
  same way. Stripe's own trial messaging is a dashboard setting and the
  founder's: read at the flip (Settings → Billing → Subscriptions and
  emails), "Send a reminder email 7 days before a trial ends" and "Add a
  one-time 'trial over' message to the statement descriptor" were both
  OFF. Stripe describes them as the settings that meet the card networks'
  free-trial rules; the first trial's charge is 10-08 at the earliest.
  **Both switched on 2026-10-01 17:5x UTC** (founder: "stripe'taki iki ayarı
  aç"), read back after a reload. Left as found, and worth the founder's
  look: the reminder email's link for a customer to update their payment
  details is the legacy custom link `https://datrick.com/` ("Use a mix of
  both"), not a Stripe-hosted page; and "Include a link for customers to
  manage their subscriptions" is off, so the reminder carries no way to
  cancel. **The manage link was switched on the same evening** (Stripe
  customer portal; founder: "ikisini de yap"). The payment-update link was
  NOT changed: Stripe's dialog says the move from "a mix of both (Legacy)"
  to a Stripe-hosted page "cannot be reversed", which the founder had not
  been told — it waits for a yes that names that. **Confirmed by the founder and switched
  on 2026-10-02** ("geri alınamaz olanı da onayla"): the legacy option is
  gone, every customer email now links to Stripe's own page.
- **Confounds** not randomised: everyone eligible sees it from 10-01. The
  quota wall (09-26), the P1 flags (09-30) and the hero CTA test (10-04)
  move who reaches the modal; read the funnel per click, not per visitor.
  India's 3D Secure failures sit between a click and a trial exactly as
  they sat between a click and a payment.
- **Verdict** **HIT** (B2, read 2026-11-22 over 10-01 → 11-21; bots, internal accounts and the founder's 11-20 checkout test out): click → trial **9 of 29** people with `pro_checkout_clicked {trial: true}` (31%, target ≥ 25% on ≥ 15 clickers; inside the claim's own window to 10-22 it was 4 of 14, 29%, one clicker short of n). Trial → paid on the **7 trials at least 8 days old: 3 paid (43%, target ≥ 40%)** — two `after_trial` conversions (11-02 monthly, 11-21 annual) and one whose day-7 charge failed and who paid through a new checkout on 10-23; 3 cancelled inside the week; 1 annual has failed its charge four times since 11-06. Strictly `after_trial` rows only: 2 of 7 (29%). Disputes: no webhook event exists for them; `checkout_disputes` reads 0 by the founder's hand to 11-22. Every payer since 10-01 except the India sale of that morning came through a trial. **Keep `checkoutTrial` on.** Confounds as written (quota wall, P1 flags, company-set wall move who clicks; read per click). The failed day-7 charges (2 of 7 matured trials) are M-01's claim, not this one.

### "Explain your approach" in every live / talk-through mock

- **Claimed** 2026-09-29 · **Live** on push (no flag) · **Read** 2026-10-20 (21 days).
- **Change** the "Explain your approach" box (free text + a 2–3 sentence tutor
  read, never points) moves from one mock-level flag on `capital-one-live-sql`
  to a per-question flag, `explainApproach: true`
  (src/utils/mock-approach.js). It is on for every written question of the
  seven generic practice mocks (39 questions) and the four of
  `capital-one-live-sql` — 43 questions in 8 mocks. It stays OFF, with the
  reason in the data file, on the two written questions of
  `capital-one-codesignal` and the two of `revolut-analytics-screen`: both
  are sourced as timed online screens with nobody to talk to (Blind reports
  2021–2025 and prep guides for the CodeSignal screen; interviewquery's Q3
  2026 reports for the HackerRank screen — the Revolut talk-through is round
  two, which has no mock). No MCQ ever carries it. Scores unchanged. The box's
  copy and the feedback prompt were already generic (question, query,
  reference — no company or dataset); tested to stay so. New event
  `mock_approach_submitted` once per written answer in an enabled question,
  `chars` 0 when the box stayed empty. Guards: tests/mock-approach.test.js
  (deliberate breaks: a flag on an MCQ, a flag missing from a generic
  question, a flag on the CodeSignal written question — each failed by name).
- **Why** a live SQL round grades the reasoning, not only the query
  (docs/plans/explain-approach-mocks-2026-09-21.md, founder-approved
  2026-09-29, backlog #5). The box shipped in one mock nobody arm's-length
  has sat; the generic mocks are where written answers actually happen.
- **Metric** `approach_box_use` — share of written answers in enabled mocks
  with a non-empty note, per `interviewId` (metrics.md). **Baseline** none:
  no per-answer event existed before 2026-09-29, and the one live mock had
  1 start / 0 completions / 1 feedback click, all internal (`test2`). The
  share is undefined before this date, not 0%.
- **Target** on 2026-10-20, over the eight enabled mocks: at least 20 written
  answers from arm's-length people, and a note in ≥ 25% of them in at least
  one mock with ≥ 10 answers.
- **Falsification, stated in advance:** ≥ 20 answers and < 10% with a note
  in every mock → nobody writes in an optional box under a timer; the next
  step is not more mocks with the box but making the explanation part of
  the answer (asked before Submit on the live-round mock only), or removing
  it from the timed generic mocks. Fewer than 20 answers → UNREADABLE; extend
  to 2026-11-10, and the finding is about mock traffic, not the box.
- **Confounds** the `mockDoor` / `goalWallEarly` flips (10-12) change who
  reaches a mock; read the share per mock and per arrival week, and note the
  flip date in the read. The free mock will dominate rows — never sum.
- **Verdict** **MISS — the falsification fired** (read 2026-11-22, 09-29 → 11-21, internal accounts out): `mock_approach_submitted` 1,574 written answers; the free mock (`sql-fundamentals-free`) carries almost all — 1,544 from 46 people, **8 with a note (0.5%)**; the two others 30 answers, 0 notes. As written: nobody writes in an optional box under a timer. The written next step — keep the box only where a live round grades the reasoning (`capital-one-live-sql`), take it off the timed screens — is queued as a product change.

### the plans above the fold: the Pro modal shows the price first (`modalPlansFirst`, A/B)

- **Claimed** 2026-10-08 · **Flipped** 2026-10-08 (founder's go in chat:
  "50 merge et ve bayrağı aç, go") · **Read** 2026-10-29 (flip + 21 days),
  or at 150 modal viewers per arm, whichever is later.
- **Change** PLAN item 2. Half of browsers by aid (`modal_layout_v1`, murmur-
  finalised hash, independent of the first-screen and company-ask tests) see
  the headline, then the two plan cards, the trial line and the currency
  note, then "What you get with Pro". The other half see today's modal. No
  copy, price or plan order changes.
- **Why** measured 2026-10-08: on a 1366x768 laptop the cards began at
  y = 630 of 768 (the trial line and the buttons below the fold); on the
  1272x588 and 1528x732 windows real visitors use they were off screen; on a
  375-px phone at y = 1,203. Plans-first: 247 on the laptop, 378 on the
  phone, both cards and the trial line in view. 95% of modal viewers are on
  desktop. 30 days to 10-06: 298 saw the modal, 22 picked a plan; 41% of
  closes came inside 3 s.
- **Metric** `modal_layout_split` (metrics.md).
- **Target** `plans_first` picks a plan at ≥ 1.5× control's rate.
- **Falsification, stated in advance:** inside ±20% of control at the read →
  the fold was not the friction; keep control, and the next suspect is the
  Stripe page (20 of 21 checkout returns came back after ~32 s there).
  `plans_first` lower than control → the list was doing the selling; revert.
- **Verdict** _pending_ — **interim 2026-11-22, not the read:** first modal per aid from the 10-08 flip, bots out: control 100 people → 13 picked a plan (13.0%), `plans_first` 110 → 13 (11.8%), **0.91× control** against a 1.5× target; webhook trial/purchase 4 vs 2. The pre-registered read waits for 150 viewers per arm (~mid-December at this rate). On this trend the 1.5× target is out of reach and the result sits inside the ±20% band whose rule is "keep control; the next suspect is the Stripe page".
- **Verdict (B2, 2026-11-22)** **UNREADABLE — n too small, re-read 2026-12-20.** The read was pre-registered as "flip + 21 days or 150 modal viewers per arm, whichever is later"; at 100 (control) and 110 (`plans_first`) first-modal people neither arm has 150. The interim line above is the current number (0.91× control); if it holds at 150 per arm, the ±20% rule keeps control and the next suspect is the Stripe page.

### First 90 Days: a hired status and five PM tickets, so Pro has a job after the interview

- **Claimed** 2026-10-04 · **Live** on push, no flag (reachable only by a
  person's own answer) · **Reads** 2026-11-04 (`ticket_completion`, 30 days)
  and 60 days after the first payer sets the status (`post_hire_retention`).
- **Change** `post-hire-track-2026-09-21.md` + `ticket-exercises-2026-09-21.md`,
  first slice. Status: intent `hired` through `setUserIntent` — set by
  "Did you get the offer?" after `?outcome=passed`, or by "Got the offer?" on
  the Coach for interview people; "Back to interview prep" undoes it. A hired
  person never gets the first-run quiz; the Coach opens on First 90 Days: five
  tickets in a stakeholder's words on the neobank and card-fraud data (card
  declines, UK spend, referral KYC, chargeback rate by risk tier — the join
  fan-out trap — and money in dispute). Graded on the figures, not the shape
  (`src/utils/ticket-grade.js`: tolerance, percent as fraction, ≤ 25 rows,
  labels never values), on its own sql.js database. After a pass, a one-line
  reply to the stakeholder, reviewed by the tutor. First ticket free, the rest
  Pro (modal reason `post_hire`, "Pro keeps working after the offer.").
- **Why** the 10-03 read: 19 of 21 plan choosers took monthly, and a monthly
  payer whose interview is over cancels (sabar2001). Annual emphasis was the
  other answer and was not built; this keeps the monthly payer instead.
- **Metric** `ticket_completion`, `post_hire_retention` (both new, defined in
  metrics.md); guardrail `interview_outcome` response rate.
- **Target** ≥ 50% of unlocked ticket openers solve it; ≥ 1 locked-ticket
  open leads to a plan click within 30 days; any hired payer still subscribed
  60 days on.
- **Falsification, stated in advance:** nobody sets the status in 30 days →
  the door is wrong (the outcome note reaches too few); move the ask into the
  Interview tab after a passed date before adding content. Openers who do not
  solve (< 30%) → the tickets are too open; add the grain hint ("one row per
  tier") before more tickets.
- **Verdict** **UNREADABLE — n too small** (B2, read 2026-11-22 over 10-04 → 11-21): **one** person set the hired status (10-19, from the Coach; `interview_outcome` wrote no row in the window, so the outcome note's door produced nobody), and `ticket_opened` has **no row ever**, locked or not — `ticket_completion` has no denominator and no locked open led to a plan click. The literal falsification ("nobody sets the status") missed by one person; its reading — the door is what is short, not the content — is what the numbers say. No payer has the status, so `post_hire_retention` has not started. One status and zero opens also needs a check that the First 90 Days card actually renders for a hired person (BACKLOG, owner A2). Re-read 2027-01-04.

### the live tutor nudge reaches the browser, speaks to the person, and Help's first answer stays on rung 1

- **Claimed** 2026-10-03 · **Live** on push + `ai-tutor` deployed the same hour
  · **Read** 2026-10-17 (14 days).
- **Found** (founder asked: does the AI work, is it personal?) The nudge after
  a wrong submit sent an `apikey` header the function's CORS list did not
  allow: the browser dropped every one, 0 reached a person in 60 days, while
  the smoke check (Node, no CORS) passed daily. Guests shared one rate bucket
  per challenge (`guest_<id>`). The nudge carried no mastery or goal. And the
  inline Help's first answer on challenge 107 wrote the aggregates and the
  HAVING clause: its opener asked for "every fix it needs", which the model
  read over the Socratic ladder's rung 1.
- **Change** CORS list + client headers (`src/utils/live-nudge.js`, bound to
  the function's list by test); the person's own id and a separate `#nudge`
  bucket (12 a day) so a nudge never spends a guest's five hints; at most two
  nudges per challenge open, the second only on a new diagnosis kind (~100
  wrong submits a day against the $10 tutor budget); mastery + goal lines in
  the nudge and a prompt that uses REPEAT / mastery / date; Help's opener and
  fixes line on rung 1 are words only (`inlineOpenerMessage`,
  `diagnosisFixesLine`). The smoke check now asks the CORS preflight for the
  app's headers first. Walked in the browser: two nudges on 107, the third
  refused by the cap, Help's first answer named every problem with no SQL and
  opened on the REPEAT line.
- **Metric** `tutor_nudge_reach` (new, baseline 0%); secondary `hint_to_solve`
  (87.4%, week to 09-29 — confounded by the 09-30 P1 flags, read together).
- **Target** ≥ 80% of people with a wrong submit see a nudge; `tutor_nudge_failed`
  under 5% of attempts; tutor spend stays inside the $10 workspace.
- **Falsification, stated in advance:** reach under 80% → read the
  `tutor_nudge_failed` statuses before anything else. Spend over budget → cap
  to one nudge per challenge. `hint_to_solve` down by more than 3 points →
  the nudge is noise; turn it to the local (non-AI) nudge.
- **Verdict** **HIT** (read 2026-11-22, 30 days, bots out): 166 of 184 people with a wrong submit saw a nudge (**90.2%**, target ≥ 80%); `tutor_nudge_failed` 2 of ~508 attempts (0.4%: one status 0, one 429; target < 5%). `hint_to_solve` 84.9% after the 09-30 flags vs 87.4% the week before — 2.5 points down, inside the 3-point line. Spend: only the Anthropic console has it (founder; ~200 tutor calls a week, ~65% nudges).

### "Why not just ask ChatGPT?" — /vs-chatgpt/ and one homepage block

- **Claimed** 2026-10-03 · **Live** on push · **Read** 2026-10-24 (21 days).
- **Change** `/vs-chatgpt/` (`scripts/build-vs-chatgpt.mjs`, rules in
  `docs/reads/ai-chat-comparison-2026-10-03.md`): what a chat assistant does
  better first (any dialect, your own work queries, already open), then a
  seven-row side-by-side on the workflow the interview grades (a checked
  answer, a result diff, a record of the weakest skill, the clock), the five
  trap pages' "runs and returns the wrong number" queries, how to use both,
  six FAQs. No claim about ChatGPT's features, limits, prices or error rate
  (tested). On the homepage, one block under the comparison table with one
  link (`data-track="home_vs_chatgpt"`), no button — still three Start free.
  Linked from the footer, both alternatives pages, the comparison hub, the
  ranked review, /sql-for-the-ai-era/ and llms.txt. Backlog plan
  `landing-comparison-2026-09-21.md`, shipped the day before the hero CTA test
  arms (2026-10-04) as that plan required.
- **Why** the question an AI-referred visitor brings is "why not just ask
  ChatGPT?", and nothing on the site answered it; search demand is small and
  Bing-only ("sql query practice ai", 2 impressions, 1 click, 90 days).
- **Metric** `seo_page_funnel` for `/vs-chatgpt/` (gsc_daily + bing_stats page
  slices; `landing_view` on the page); guardrail `home_door`.
- **Target** 21 days from publication: the page indexed on both engines, 100+
  impressions across them, and 5+ people reaching the app from it
  (`cta_vs_chatgpt_*` or arrival src `vs_chatgpt`). `home_door` stays at or
  above 51.9%.
- **Falsification, stated in advance:** not indexed on Bing by 10-24 → a link
  problem, not a content problem (check in-links, submit by hand). Indexed with
  under 100 impressions → the query is too small for a page; keep it for the
  AI door, write no second AI-comparison page. `home_door` below 51.9% →
  remove the homepage block first (the page stays).
- **Confounds** the hero CTA test arms 2026-10-04 on the same homepage
  (randomised by aid, so the split reads cleanly); the block lands the day
  before.
- **Verdict** **MISS — the falsification fired** (read 2026-11-22): `gsc_daily` 10 impressions in the 21 days (12 in the last 28), 0 clicks; 2 non-crawler readers since 10-03, 0 `cta_vs_chatgpt_*` people (target 100+ impressions, 5+ people to the app). As written: the query is too small for a page — keep it for the AI door, write no second AI-comparison page.

### five SQL trap pages, linked into the graph (the first pattern batch)

- **Claimed** 2026-09-25 · **Live** on push · **Read** 2026-10-23 (28 days).
- **Change** `/sql-not-in-null/`, `/sql-join-fan-out/`, `/sql-between-timestamp/`,
  `/sql-average-of-averages/`, `/sql-left-join-where-filter/` — generated by
  `scripts/build-pattern-pages.mjs` from `src/data/sql-patterns.js`: the trap
  in one sentence, the query that looks right and what it returns, why, one
  or two fixes and what they return, the mock question that tests it, 2–4
  practice questions, the other traps. Every number is re-run against
  `finans_fraud` in CI (tests/sql-patterns.test.js). The examples are NOT the
  Capital One mock's questions — the mock is Pro, so the pages teach the same
  trap on a different question and never show its answer (tested). Inbound
  links: the 15 cited question pages, the NULL / joins / CTE blog posts, and
  in the app a "Read this trap in detail" link on a wrong mock answer (the
  feedback, the results, Study with AI; event `pattern_link_clicked`).
  Article schema, no FAQ. Sitemap resubmitted, IndexNow sent, indexing
  requested by hand for all five the same day.
- **Why** the September lift came from pages that answer a search and sit in
  the link graph (topic pages 47.1 → 14.3 in position), not from page count;
  pattern pages need no dated source.
- **Metric** gsc_daily page slice for the five: impressions, clicks,
  impression-weighted position, 28 days from publication.
- **Target (founder's)** at least two of the five in the top 20, and at least
  500 impressions in total.
- **Falsification, stated in advance:** below either bar → the format does
  not work here; go to the second-tier company pages (with a source read).
  Both met → the next five: RANK vs DENSE_RANK vs ROW_NUMBER, COUNT(column)
  vs COUNT(*), WHERE vs HAVING, top N per group, LAG without PARTITION BY.
- **Confounds** Shopify retitle and Tesla re-indexing the same day (other
  pages); none of the five URLs existed before.
- **Verdict** **MISS on reach — the falsification fired** (read 2026-11-22, `gsc_daily` page slice, 28 days from publication 09-25 → 10-22): all five rank inside the top 20 (positions 5.9–7.1 — that bar HIT), but **352 impressions** in total against 500 (left-join-where 163, between-timestamp 78, join-fan-out 51, not-in-null 44, average-of-averages 16), 4 clicks. The last 28 days: 461 impressions, 2 clicks, positions 5.0–6.8. As written: below either bar → the format does not work here; the next five trap pages are not written. Why they are not clicked: the query slice (56 days) is mostly not searches but assistant follow-ups grounded through Google — "давай", "rispondi", "so yes or no?", "ответь на мой вопрос", pasted multiple-choice exam questions. These pages are retrieved by AI answers (the GenAI door in CLAUDE.md), which answer in place; a snippet rewrite would not change that. Read them as AI-citation pages, not as search pages.

### the Shopify page's title and description say what the page is

- **Claimed** 2026-09-25 · **Live** on push · **Read** 2026-10-23 (28 days).
- **Change** `/shopify-sql-interview/` `<title>` / og / twitter: "Shopify SQL
  Interview Questions — Practice Merchant & GMV Analytics" → "Shopify SQL
  Interview Questions (2026): 15 Practice Problems"; description (all three)
  from "Practice the SQL patterns Shopify tests in …" — an unsourced claim
  about Shopify's interview — to "15 runnable SQL interview practice problems
  on e-commerce data: merchant metrics, GMV, conversion funnels, cohort
  retention. In the browser, instant feedback, no setup. Free." H1 and body
  untouched. The "15" is bound to the tagged-challenge count
  (tests/technical-seo.test.js). The year-and-count pattern is the one
  `/best-sql-practice-sites/` carries (2,527 impressions, 3.0% CTR, 6.4).
- **Why** 28 days to 09-23: 297 impressions, 0 clicks, position 6.8 — while
  Revolut (6.9) took 14.4% and Wise (6.3) 17.8%. Clicks stopped on 08-26;
  only ~10% of the impressions carry a visible query (the largest:
  "shopify data science sql question leaked", 18). Not in the 10-12 title
  read, so it confounds nothing there. `/google-sql-interview/` was NOT
  touched: its description is in the 10-12 read (W3, 09-17), and its 7.0
  average is flattered by our own brand query "sqlquest" at position 1 (58
  impressions, sitelinks) — "google sql interview questions" sits at 25.
- **Metric** gsc_daily page slice for the page: CTR and clicks, 28 days.
- **Target** ≥ 3 clicks and CTR ≥ 1% at a position within ±2 of 6.8.
- **Falsification, stated in advance:** still 0 clicks at ≥ 150 impressions
  → the impressions are intent the page cannot serve (like the competitor
  brand queries); stop spending titles on it. Position worse by > 3 →
  revert the title.
- **Verdict** **MISS in its window, then clicks** (read 2026-11-22): 28 days from 09-25: 54 impressions, 0 clicks, position 9.2 (target ≥ 3 clicks, CTR ≥ 1% within ±2 of 6.8; the 0-click falsification needed ≥ 150 impressions — not reached). The last 28 days: 65 impressions, **7 clicks (10.8%)** at position 18.2. The title earns the click when shown; the ranking slipped. Not reverted.

### one question after the first solve: which company (the company ask)

- **Claimed** 2026-09-25 · **Flips** on the founder's go, after the founder
  walks the flow in production (`/app/?ff_features_intakeAfterFirstSolve=true`)
  · **Read** flip + 7 days (founder's plan: one week, then decide).
- **Change** behind `intakeAfterFirstSolve` (off): at a person's FIRST
  correct solve they are assigned an arm by a hash of their aid
  (`company_ask_assigned {arm, test: 'company_ask_v1'}`; the hash has a
  finalizer, so the arm is independent of the first-screen test — without it
  the two tests' arms were exact opposites). Arm `ask`: one inline line under
  the result — "Which company are you preparing for?", search over the 30
  companies, "Not sure yet", Skip; not a modal; the first-solve intent modal
  stays shut on that solve (one question, not two; `intent_ask_suppressed`).
  Unanswered → asked once more at the third solve, then silent. A company
  → `prepTarget.company` (+ intent `interview` when none was declared), which
  already fills the Coach's "Your {company} plan" and pins the company on the
  Interview tab; the confirmation links to both (`company_ask_payoff_clicked`).
  Arm `control`: today's product, intent modal included. Events per step:
  `intake_shown` / `intake_answered` / `intake_skipped` with `step:'company',
  surface:'post_solve', askNumber`. `src/utils/company-ask.js`,
  tests/company-ask.test.js; preview-verified 2026-09-25 (ask arm: line at
  solve 1, no intent modal, Capital One → plan card + Interview pin; skip →
  nothing at solve 2 → line at solve 3 → "not sure yet"; control: no line,
  intent modal as today).
- **Why** 8 accounts in the product's history carry a company (2026-09-24);
  the plan card and the company pin exist and almost nobody reaches them.
  The mandatory door screen that tried to fix this was withdrawn the same
  night because it sits in front of the first solve.
- **Metric** `company_ask_split` (docs/agent/metrics.md).
- **Target** ask arm: ≥ 40% of people shown the line answer it (a company or
  "not sure yet") across the two asks; ≥ 25% name a company.
- **Guardrail** (founder: "first_solve_10m düşmesin, %12,4'ün altına inerse
  geri al"): the ask comes after the first solve, so `first_solve_10m`
  cannot move by construction — it is still read, overall, as the founder
  asked. The guardrail that CAN move is what happens after the ask: second
  solve within 24 h of assignment, ask arm vs control, must not be more than
  3 points lower.
- **Falsification, stated in advance:** answer rate < 20% → the question or
  its moment is wrong; do not build item 4. Second-solve rate down > 3 points
  in the ask arm → the line costs momentum; revert (flag off). Answered well
  and no cost → keep, and build items 4 and 5 (founder's order).
- **Confounds** control keeps the first-solve intent modal and the ask arm
  does not, by design; read the intent series split by arm from the flip.
  Localhost preview rows 2026-09-25 (aids `0da741eb…`, `f2777777…`) carry
  arms: exclude.
- **Verdict** _pending_

### every person states a goal before using the app (the goal gate)

- **Claimed** 2026-09-25 · **Live** 2026-09-25, flag `goalGate` on, by the
  founder's directive ("herkese hedef belirttirelim … zorunlu olsun bu
  zorunlu") · **Read** 2026-10-09 (14 days) and 2026-10-23 (28 days).
- **Change** a required overlay for every person, guest or registered, new
  or returning: goal (interview / job-ready / SQL in general), deadline
  (2 weeks · 1 month · 3 months · 6 months · a date), target level
  (Foundations / Intermediate / Advanced / Interview-ready), industry (ten),
  and the company when the goal is an interview (optional). No close, no
  skip, no Escape. Shown at every session start and re-checked every ten
  minutes until complete; asked again, prefilled, when the deadline passes;
  never over a running timed mock. Answers land in the intent, the Coach goal
  (only when none is active), `prepTarget.date/company`, `userGoals`
  (`targetLevel`, `industry`, and `sector` where the industry has one) and
  `userData.goalProfile`. "Edit goal" on the Coach reopens it.
  `src/utils/goal-gate.js`, tests/goal-gate.test.js; preview-verified
  2026-09-25 (new guest, empty submit, Escape, fill + save, reload, expired
  deadline, Turkish).
- **Why** 2 accounts in the product's history had ever set a date and 8 a
  company (2026-09-24), so every deadline-shaped feature — the countdown,
  `deadlineOffer`, the daily quota, the outcome note — had an audience of
  about zero (docs/plans/monetization-2026-09-24.md, finding 3).
- **Metric** `goal_gate_funnel` (docs/agent/metrics.md): people shown →
  completed, median seconds, answers by field. Coverage: share of active
  people (7 days) with a complete profile.
- **Target** ≥ 85% of people shown complete it; ≥ 70% of people active in
  the last 7 days carry a complete profile by 10-09; date holders 2 → ≥ 300.
- **Guardrail, the cost of a required screen before the first solve:**
  `first_solve_10m` was 12.4% (08-24 → 09-20, n 1,465 first opens). A drop
  of more than 3 points in the 14 days after 09-25, against the 14 days
  before, is the stop signal. Also watch the share of first opens that end
  on the gate (`goal_gate_shown` with no `goal_gate_completed` and no later
  event).
- **Falsification, stated in advance:** `first_solve_10m` down > 3 points
  AND more than 30% of new visitors leave on the gate → the founder decides
  between keeping it (goal coverage is worth the loss) and moving the first
  ask after the first solve; the numbers go to the founder, the agent reverts
  nothing. Completion ≥ 85% and the guardrail inside 3 points → HIT.
- **Confounds** it lands 5 days before `diagnosisHints` (queue row 1), which
  moves the same metric: the flag queue's 7-day spacing now counts from
  09-25, so row 1 flips no earlier than 10-02. Localhost preview rows on
  2026-09-24/25 (aid `c39bd4ca5fbb4664…`) carry goal_gate events: exclude.
- **Withdrawn 2026-09-25, before any read.** The founder replaced it the same
  night with a skippable, inline question after the first solve
  (`intakeAfterFirstSolve`, dark, A/B), because a required screen at the door
  is exactly what puts `first_solve_10m` at risk. `goalGate` is off; the only
  `goal_gate_shown` row in production was the localhost preview. The
  component stays as the candidate for the one required screen, after
  payment (plan item 6). The 7-day spacing note above no longer applies.
- **Verdict** `UNREADABLE` — withdrawn before it reached anyone.

### a plan click goes straight to Stripe (modal → Stripe, item 1)

- **Claimed** 2026-09-23 · **Flipped** 2026-09-23 on the founder's go ("bugün
  yapılacakları yap") · **Read** 2026-10-23.
- **Change** flag `directCheckout` (on): a plan click with no email on file
  goes to Stripe (`launchCheckout(plan, '')`, event
  `checkout_email_step_bypassed`) instead of "Where should your receipt
  go?". `false` restores the step. Preview-verified: one click, Stripe page.
- **Why** 30 days to 09-23: 10 people clicked a plan; the 6 with an email on
  file reached Stripe, the 4 without one all stopped at the step (no capture,
  no skip). docs/plans/modal-to-stripe-2026-09-23.md.
- **Metric** `checkout_abandonment` — people with `pro_plan_clicked`
  `hadEmailOnFile=false` who reach `pro_checkout_clicked`.
- **Target** ≥ 3 of 4 (≥ 75%) such people reach Stripe in the 30 days.
- **Falsification, stated in advance:** under half reach Stripe → the step
  was not what stopped them; look at the modal close timing
  (`modal_dismissed.msOpen`) for those people. Fewer than 4 such people in
  the window → UNREADABLE with the n, extend 30 days.
- **Cost, stated:** a guest who abandons on Stripe now leaves no email for
  `checkout-abandon` (it read the click event's email).
- **Noise:** one live Stripe session opened from the localhost preview on
  2026-09-23 (guest, monthly, abandoned) — exclude its `pro_checkout_expired`.
- **Verdict** **HIT** (read 2026-11-22 over the claim's window, 09-23 → 10-23): 10 people clicked a plan with `hadEmailOnFile=false`, **9 reached checkout** (`pro_checkout_clicked` / `checkout_email_step_bypassed` / `pro_checkout_started`) — 90% against ≥ 75%. Before the flag, 0 of 4.

### Bing crawls what the link graph and a recrawl signal hand it

- **Claimed** 2026-09-23 · **Read** 2026-10-07.
- **Change** scripts/build-question-pages.mjs: related questions as a ring
  (every question linked from six skill siblings, was min 1 / median 6
  inbound), the breadcrumb links the topic page, each question links one
  topic guide and the three SQL tools; the hub links the seven weakest
  guides; tests/link-graph.test.js holds the floors. Plus 99 URLs through
  Bing URL Submission on 09-23 (24 uncrawled top-level/topic pages, the
  questions hub, 74 question pages) and IndexNow on the deploy.
- **Why** Bing (the channel that produces solvers) had 211 of 405 sitemap
  URLs indexed; the 09-13 batch sat at "discovered but not crawled". Bing
  last crawled `sql-exercises` on 09-12, before its links to the new pages
  existed. Plan: docs/plans/internal-links-bing-2026-09-23.md.
- **Metric** `bing_indexed` (docs/agent/metrics.md).
- **Target** ≥ 300 indexed on 2026-10-07, and at least 6 of the 12 sampled
  URLs indexed.
- **Falsification, stated in advance:** under 250 indexed on 10-07 → links
  and submissions are not Bing's constraint; read the 93 "SEO/GEO issues"
  warnings before building or submitting anything more. 250–299 → extend
  to 10-21, keep submitting, change nothing else.
- **Verdict** **HIT** (B2, read 2026-11-22 from `bing_crawl_daily` — the API series, not the Site Explorer bar the baseline came from; the two were never compared on one day): `in_index` **512 on 10-07** (163 on 09-23, 319 on 09-30) against ≥ 300; 830 on 11-20. The fixed sample through `bing_url_status`: 11 of 12 crawled by 11-21 (`/questions/top-failure-mode-by-quality/` never), 5 of them on 09-28/29, inside the window. Crawled is not "indexed", so the 6-of-12 half is read as crawl, not index. Confound: the IndexNow automation (09-30) landed inside the window. An index this size says nothing about clicks; read `bing_stats` for those.

### the first screen is a challenge, not a quiz

- **Claimed** 2026-09-23 · **Flips** from docs/agent/flag-queue.md (row 2,
  after `diagnosisHints`), by the founder's merge · **Read** flip + 21 days.
- **Change** behind `firstScreenChallenge` (off): a first-run visitor on the
  Learning Path start screen — no deep link, no level chosen, no intake or
  lesson on screen — is assigned an arm by a hash of their aid, once
  (`first_screen_assigned {arm, test: 'first_screen_v1'}`, sticky in
  `localStorage.sqlquest_first_screen_v1`). Arm `quiz`: today's four-question
  "Find your SQL starting point". Arm `challenge`: straight into challenge 91
  in the editor, the zero-SQL lesson skipped — the door the quiz's "Start from
  zero" already opens. `src/utils/first-screen.js`, tests/first-screen.test.js;
  preview-verified both arms, flag off and a `?challenge=` deep link.
- **Why** measured 2026-09-23 over first opens 08-24 → 09-20: 646 of 1,533
  people (42%) never opened a challenge. 406 of them saw the quiz screen in
  their first minute; 15 finished it. Mobile never-open 64% (n 140), desktop
  40% (n 1,323). No other flag in the queue reaches these people.
- **Metric** `first_screen_split` (docs/agent/metrics.md): `first_solve_10m`
  by arm, among people assigned within two minutes of their first
  `app_opened`. Secondary: opened-a-challenge-in-10-minutes by arm, split by
  device.
- **Target** challenge arm ≥ quiz arm + 5 points on first_solve_10m at
  n ≥ 300 per arm.
- **Falsification, stated in advance:** challenge arm flat or lower at n ≥ 300
  per arm → the quiz was not the wall; keep the quiz, and the next question
  is load and first paint (86% of never-openers left within 30 s by their
  event trail). Challenge arm up but `pct_ever_solved` down (a forced first
  challenge that people fail and leave) → revert. n < 300 per arm at the read
  → extend by 14 days, change nothing.
- **Confounds** `diagnosisHints` (row 1) is live by then for both arms alike —
  randomised, so it shifts both; the cold-start dialog stays as it is.
  Localhost preview rows (2026-09-23) carry arms too: exclude localhost aids.
- **Verdict** **HIT — shipped 2026-11-22** (read 2026-11-22; people assigned within 2 minutes of their first `app_opened`, 09-26 → 11-21, bots and crawler window sizes out): `first_solve_10m` **37.2% (challenge, n 527) vs 15.5% (quiz, n 536)** — +21.7 points against a +5 target; ever solved 42.7% vs 26.3% (the falsification needed it to fall; it rose); mobile 30.6% (n 36) vs 2.2% (n 46). Every new assignment is the challenge arm from the merge of `feat/first-screen-challenge-shipped`; browsers already holding the quiz arm keep it. `first_screen_assigned` keeps firing (arm `challenge` only), so the series has a denominator but no comparison after that date.

### interview-first: the plan is the product for people with a date

- **Claimed** 2026-09-17 · **Flips** 2026-09-21 by the scheduled task that
  flips `interviewCountdown` (the card this moves) · **Read** 2026-10-12.
- **Change** two things, both dark. (1) Flag `features.interviewFirst`: for
  an interview person — `isInterviewPerson` in src/utils/interview-first.js:
  declared intent interview / job_ready, a countdown date or company
  (`prepTarget`), the `interview-prep` Coach goal, a `company:` arrival, or
  any interview history; the Interview tab's own population
  (interview-nav.js) plus the countdown target, test-bound to agree — the
  daily-reward calendar never opens, achievement toasts do not render (the
  achievement is still awarded and saved), the header's lives and coin are
  not drawn, and the countdown card renders ABOVE the Coach's next-step card.
  One helper in app.jsx (`interviewFirstOn(surface)`, six call sites, pinned
  by tests/interview-first.test.js) reads the flag; nobody else sees a byte
  of difference. `interview_first_applied {reason}` fires once a session.
  (2) A plan target for every company, live with the countdown card
  (`findPlanTarget` in src/utils/interview-prep.js): a signed archetype
  returns the existing target as `kind: 'archetype'`; any other company with
  ≥ 5 tagged challenges returns `kind: 'tagged'` — its tagged challenges, the
  generic Pro mock (`pickProMockId`), and the note "Built from the N
  questions tagged X and your weakest skills — not X's process." The picker
  lists the signed two first, then the tagged companies by count (all 30 in
  the map clear the bar; the thinnest is Morgan Stanley at 12). The readiness
  NUMBER stays archetype-only — a tagged target shows the plan and the note,
  no score. `prep_target_set` and `prep_plan_viewed` carry `kind`.
  (3, 2026-09-18) The status strip: WHO · WHEN · WHERE I AM · HOW FAR in
  one line under the header on every tab for an interview person — the
  seventh call site (`status_strip`), model `interviewStatusModel` in
  src/utils/interview-first.js fed by the card's own plan; the WHERE cell is
  always labelled (readiness / check score / set coverage), the accent only
  at ≤ 7 days; events `interview_status_shown` (once a session:
  hasCompany, hasDate, whereKind, proLeft) and `interview_status_clicked
  {cell}`; every cell goes to the Coach card, never into locked content.
- **Why** docs/plans/interview-first-2026-09-17.md: every real purchase in
  the product's history was interview-shaped — **3 of 3** (`stripe_webhook`,
  internal excluded); modal → plan click in the 30 days to 09-15 was
  **9.3%** for declared interview intent (4/43) against **0 of 81** with no
  intent. Two signed archetypes cannot serve the Snowflake / Revolut / Wise /
  Stripe arrivals of a month; a person with a date at an unsigned company was
  handed an empty picker.
- **Metric** `interview_prep_funnel` (docs/agent/metrics.md), read from the
  flip time and split by `kind` and by `interview_first_applied.reason`;
  `interview_cohort_funnel` — the Friday task defines it (arrivals → plan →
  Pro item met → paid, for intent interview/job_ready, a date, or a
  `company:` arrival). Guardrail: `weekly_engaged` for the non-interview
  population, which must not move (it sees no change, by construction).
- **Baseline** 30 days to 2026-09-17 (pro_events, internal excluded, people
  by aid): **357 interview-cohort people** — 205 by declared intent, 175 by a
  `company:` arrival (23 both); **with a date: 0** by event (the intake and
  the countdown are both dark; one registered account carries a
  `prepTarget.date`); **with a company: 175** by arrival (three registered
  accounts carry a `prepTarget.company`). Of the cohort 126 saw the Pro
  modal, 5 clicked checkout, 1 purchased. Every `prep_*` and
  `interview_first_applied` count is **0 by construction** until the flip.
- **Target** ≥ 40% of interview people with a date open a plan item
  (`prep_plan_item_opened`) within 7 days of the flip; ≥ 3 purchases from
  the interview cohort in the 30 days after it (the cohort produced 1 in the
  30 days before).
- **Falsification, stated in advance:** < 20% of interview people with a date
  open a plan item → the plan is not the product, the door is; revert the
  card position (the `coach_card_above` mount), keep the flag and the tagged
  tier — the game surfaces staying hidden is not what this claim reads.
- **Confounds**
  - `freeQuota` and `deadlineOffer` flip the same day (09-21). The
    milestone ask and the quota wall change for the same interview person in
    the same window; the purchase target above cannot be attributed to this
    change alone, and the read says so.
  - The intentRouting read (2026-10-16) becomes the read of the
    interview-first batch, not of the tab alone — amended in that entry.
  - `interviewCountdown` and this flip together by design: the card this
    moves does not exist without it. `prep_*` events date from the flip.
- **Verdict** **NOT FLIPPED — nothing to read** (checked 2026-11-22): `interviewFirst` is still `false` on main; the flag queue (docs/agent/flag-queue.md, row 7) holds it as `queued`. The read date above is void; a new one is set on the day it flips.

### the outcome is asked after the date: one question, three clicks (2026-09-19)

- **Claimed** 2026-09-19 · **Live** on push (the app door); the sender is
  deployed and NOT scheduled — the founder runs it · **Read** 2026-11-24,
  with the goal-setting read, or the first time ten dates have passed.
- **Change** `supabase/functions/interview-outcome-note`: to a registered,
  reachable person whose `prepTarget.date` passed 1–14 days ago, once per
  date, one founder-voice email — "How did it go?" — with three plain links
  `/app/?src=outcome_note&outcome=passed|failed|moved` and a reply for
  anything else; cap 20 a run, quiet 24 h, service-role gate, `sent` row
  with `meta {company, date, daysSince}`, `outcome_note_sent {company,
  daysSince}`. The app door (src/app.jsx): the click records
  `interview_outcome {outcome, source:'link', src, company, daysSince}` —
  never the date — stores `prepTarget.outcome {value, at}` and takes the
  past date off the record; the company stays. Guards:
  tests/interview-outcome-note.test.js.
- **Why** the interview chain is measured to "paid" and then goes dark: the
  only outcome we have ever learned (harinivr02, a Stripe round, "wasn't
  entirely happy") came from a hand-written reply. Without the outcome the
  frame's own promise — this prepares you for the screen — is never read.
- **Metric** `interview_outcome` (docs/agent/metrics.md): answered / noted,
  by outcome; replies by hand recorded with that provenance.
- **Baseline** 0 notes, 0 outcomes, 0 dates on record (2026-09-19; the
  intake that produces dates flips 09-21).
- **Target** ≥ 50% of people noted answer by link within 7 days; ≥ 1 in 3
  names the question in a reply.
- **Falsification** < 25% answer → the question is asked too late or to the
  wrong people; move MIN_DAYS_AFTER to 0 (the evening of) before changing
  the words. Zero replies naming a question over ten notes → the reply ask
  is dropped, the links stay.
- **Confounds** the date is self-reported and may not be the screen's date;
  `moved` is also the honest answer to "I never had one". Read `moved`
  separately and never as a miss.
- **Verdict** _pending_

### the free quota: ten solves, then Pro (founder's week-1 plan, item 2)

- **Claimed** 2026-09-12 · **Flips** 2026-09-21 by scheduled task, after the
  paywall-surfaces read (09-20) is written — the free Hard previews that read
  measures sit behind this wall for anyone past ten solves · **Read**
  2026-10-12 (flip + 21 days).
- **Change** behind `freeQuota` (off): once a non-Pro person has solved
  `FREE_SOLVE_QUOTA` (10) challenges, opening any unsolved challenge meets a
  wall — `content_lock_reached {surface: 'challenge_quota', wall:
  'free_quota', used, quota}`, the cold-start diversion (moot at ten), then
  the Pro modal under reason `free_quota` ("10 free solves done. Pro opens
  the rest."). Every unsolved row wears the lock; the list header counts
  "N of 10 free solves used". Solved challenges, lessons, warm-ups, the
  daily and the Coach stay free. Pure half `quotaGate` in
  src/utils/free-tier-boundary.js.
- **Why** the founder's decision (2026-09-12): a free quota a little above
  the activation threshold. The plan doc had argued against a content cap
  (docs/plans/free-tier-boundary-2026-09-12.md, "Who would a content cut
  hit"); the founder read it and chose the quota. This claim therefore reads
  the cost that argument named, not only the gain.
- **Metric** `quota_wall` (docs/agent/metrics.md): people who meet the
  quota wall, clicks per person at it, purchases within 7 days of meeting
  it. **Cost guardrails, read in the same table:** returned-next-day share
  among people at 10+ solves (baseline read at the flip over the prior 21
  days); `weekly_engaged` (5+ solves — unaffected by construction, so a
  move there is a leak); and the 20–39 / 40+ solve buckets per month
  (47 / 11 people in the 30 days to 09-12), which the wall must shrink and
  the claim must say so.
- **Baseline** 30 days to 2026-09-12: 58 people passed 10 solves (the 6–19
  bucket's upper half plus 20+); milestone asks 203 shown → 7 clicked → 2
  paid.
- **Target** ≥ 10% of people meeting the quota wall click, ≥ 2 purchases
  attributed to it in 21 days, and returned-next-day among 10+ solvers down
  by no more than 10 points.
- **Falsification, stated in advance:** clicks at the wall < 4% at n ≥ 50
  people → the wall does not sell, it only stops; move the quota to 15 and
  re-read once, then revert. Returned-next-day among 10+ solvers down > 15
  points with < 2 purchases → the quota is spending the retention base for
  nothing; revert. Purchases attributed ≥ 2 but `weekly_engaged` down > 10%
  → the wall leaks into the activation window; find how before keeping it.
- **Confounds** `quietEarlyAsks` (09-29) and `deadlineOffer` (10-06) change
  the milestone ask inside this window; read the quota wall's own reason
  and surface, never the modal total. Company-set gate (10-14) walls the
  fourth of a set — a person can meet both; read `wall` values separately.
- **Confound added 2026-09-16:** `deadlineOffer` now flips in the same commit
  (founder moved it from 10-06). It changes only `reason='milestone_solves'`
  for people with a date inside 45 days; this claim reads `wall='free_quota'`
  and `reason='free_quota'`, never the modal total.
- **Flipped 2026-09-25 22:41 UTC** (founder's Go, with five other flags in
  one commit — docs/agent/flag-queue.md), not 09-21 as planned above.
- **Interim rule for 2026-10-09, written 2026-10-02 before that data**
  (founder: "yap"). What the first week showed (Friday read,
  docs/reads/weekly-funnel-2026-10-02.md): 56 people met the wall, 10 of
  them clicked a plan (18%, past the 10% target), 1 paid; solves fell 1,675
  → 693 a week and three quarters of the fall is the wall itself (solves
  past the tenth: 798 → 29); of 46 people who met it two or more days
  before, 7 came back. The leg after the click changed under it — Checkout
  Sessions in USD from 09-30, the 7-day trial from 10-01, two checkout bugs
  fixed 10-01 — so the purchase leg of this claim has had two days, not a
  week. **The rule:** count people who met the wall between 2026-09-26 and
  2026-10-09 and then started a trial (`pro_trial_started`) or paid
  (`pro_purchase_completed`, `stripe_webhook`). **≥ 3 → the quota stays as
  it is to the 10-12 read. < 3 → the quota moves to 20** (the founder's Go
  is asked on 10-09 with the count in hand; it is a money flag). Nothing
  else about the free tier changes before 10-09.
- **The wall leaked until 2026-10-02** (commit 00581d44): a `?challenge=`
  link opened the challenge before a returning guest's record had loaded,
  so the quota read zero. Three non-Pro people solved 26 challenges past
  their tenth between 09-26 and 10-02. The wall's numbers before the fix
  are therefore slightly low on reach, and its cost slightly understated.
- **Added 2026-10-02: the free road back.** The wall's modal now shows,
  under the plans, "Or keep practising free today: Today's daily challenge ·
  Lessons and your Coach plan" (`quota_wall_free_path {to}`). Read with the
  10-09 rule: of people who meet the wall, the share who take it, and the
  share who come back the next day — against the 7 of 46 before. It must
  not lower clicks at the wall; if clicks per person at the wall fall below
  10% with the road back on, the road back goes, not the wall.
- **Verdict** **MOVED** (read 2026-11-22, 09-26 → 11-21, bots out): **141 people met the wall, 18 clicked a plan at it (12.8%, target ≥ 10% — HIT)**; within 7 days of meeting it, 5 started a trial or paid; 1 purchase ever followed (target ≥ 2 purchases — short). Guardrails not re-read here (returned-next-day among 10+ solvers, weekly_engaged) — they need the solve-level query in metrics.md before this becomes final. **The 10-09 interim rule fired and was never acted on:** people who met the wall 09-26 → 10-09 and then trialled or paid = **2 (< 3) → "the quota moves to 20, the founder's Go is asked on 10-09".** The Go was never asked; `FREE_SOLVE_QUOTA` is still 10. **Decided 2026-11-22 under the founder's delegation ("kararlar sana ait olsun"): the quota stays at 10** — the rule's premise (the wall does not sell) is contradicted by everything since: 18 of 141 clicked, 6 trialled or paid. The 10-09 rule is retired, not executed.

### the sixth-solve ask waits for the celebration (founder's item 1, live 2026-09-12)

- Not a claim to read on its own: a 1.8-second delay between the sixth
  "Accepted" and the milestone modal, the delay the company set-complete ask
  already used, so the confetti lands before the price. The trigger point
  did not move — it was already the sixth solve, on the same render as the
  success screen (docs/reads/checkout-clickers-2026-09-12.md §3: six of the
  eight clicks in 30 days came at exactly six solves from this modal). Read
  inside `paywall_ask_efficiency` on 11-24 as a copy-level note, nothing
  more.

### item 4 of the week-1 plan: the Pro list against Stripe, corrected the same evening (2026-09-12)

- Not a claim; a read — docs/reads/checkout-clickers-2026-09-12.md §4. Two
  corrections to what this ledger and objectives.md carried until tonight:
  (1) the 07-10 "payer" was the founder's own test subscription, so real
  payers ever are **three** and gross is **$157**; (2) `proAutoRenew=false`
  on both monthly payers was written by the app's pre-09-03 cancel button,
  not by Stripe. Stripe on 09-12: sab3r cancels 09-23 (placed by hand after
  he emailed — the in-app press never reached Stripe), **jeromezhao is
  active and bills $29 on 10-01** for a subscription he most likely tried to
  cancel in his first days. Founder action before 10-01: a Gmail draft is
  ready, not sent.
- **2026-10-02 — the charge happened.** On 09-15 jeromezhao was told in
  writing "I've now cancelled it on Stripe myself. There will be no charge
  on October 1 or after." No cancellation was ever placed: on 10-02 the
  subscription read **Active, next invoice 2 Nov**, and at 23:06 UTC on
  10-01 Stripe charged US$29 (`pro_renewal_completed`). He had not opened
  the app since 09-16. Owed: a full refund (the founder's click — a full
  refund makes the webhook revoke Pro and cancel the subscription), a check
  on Stripe's own page that it reads Canceled, and the apology (drafted in
  the thread). The rule this writes: **"cancelled" is said only after
  reading the status back from Stripe** — a sentence in an email is not a
  cancellation. Not a payer, not a renewal: this row must not be counted in
  either when the refund lands (`pro_refunded`).
  **Closed 2026-10-02 06:12 UTC:** the founder refunded the US$29 in full;
  the webhook logged `pro_refunded {full, revoked, subscription_cancelled}`
  and `pro_subscription_cancelled {ended}`, the user row reads Pro off, and
  Stripe's subscription page — read back, not assumed — says Cancelled,
  Ended, payment Refunded, no upcoming invoice.
- **Measurement debt, owned here:** `customer.subscription.deleted` writes
  no `pro_events` row, and a scheduled cancel (`cancel_at_period_end`) is
  invisible to us until it takes effect. Next intentional deploy of
  stripe-webhook adds `pro_subscription_cancelled {plan, days_since_purchase,
  scheduled|ended}` from both `subscription.updated` and
  `subscription.deleted`; until then the Friday table's churn column is read
  from Stripe → Subscriptions by hand and says so.
- **Built the same evening, awaiting the founder's deploy:** stripe-webhook
  now handles `customer.subscription.updated` (a scheduled cancel writes the
  flag and a dated `pro_subscription_cancelled {scheduled}` row; an undo
  writes `pro_subscription_reactivated`), `customer.subscription.deleted`
  writes `pro_subscription_cancelled {ended}`, and `checkout.session.expired`
  writes `pro_checkout_expired` (week-2 item 9). Source guards in
  tests/stripe-webhook.test.js. Two steps only the founder can take: deploy
  the function, and add the two new events to the Stripe endpoint.

### the homepage, company-first (founder: "rewrite it around what we are strong at", 2026-09-12)

- **Claimed** 2026-09-12 · **Live** on push — a static page, one variant tag,
  no flag · **Read** 2026-10-03 (21 days).
- **Change** `src/index.html` rewritten around the doors search and the
  assistants already send people through. The hero and the first section are
  the company sets — Revolut, Capital One, Stripe, Wise, JPMorgan, Snowflake,
  each with its tagged count and, for two, the timed mock — the second is the
  practice hub (`/sql-exercises/` and the nine topic pages), the tutor and the
  Coach come third; FAANG stays linked and stops leading. Title `SQL Quest —
  SQL Interview Practice by Company, With a Tutor Built In`; JSON-LD and a
  ten-question FAQ rewritten to match, so the FAQ schema now describes what
  the page shows (nine baseline lines retired from
  scripts/faq-schema-baseline.txt). `LANDING_VARIANT = 'company_first_v1'`.
- **Why** docs/reads/keywords-2026-09-08.md and google-position-2026-09-11.md:
  the company pages that convert from search are mid-size fintech (Revolut
  14.4% CTR, Wise 13.7%, Stripe, JPMorgan, Snowflake) and the FAANG pages do
  not (1.6–1.8%, their query space belongs to Redshift and BigQuery);
  `/sql-exercises/` is the door Bing sends 263 of 356 arrivals to; Copilot
  cites us on "sql interview preparation" at 31%; two of the three payers
  prepared for Capital One; practice-shaped doors convert at 29–37% against
  editorial's 9%. The old hero ("AI can write a query. Can you tell if it's
  right?") was positioned on a page that appears in none of those tables.
- **Metric** `home_door` (docs/agent/metrics.md): people by `aid` with
  `landing_view` page=home → `app_opened` → solved one → reached six, in the
  21 days, with the hero-click share and the new `cta_set_*` clicks beside it.
- **Baseline** 2026-09-06 → 09-12, the first clean week after the tracking
  repair: 185 landed → 55 clicked the hero (29.7%) → 96 opened the app
  (51.9%) → 44 solved one (23.8%) → 19 reached six (10.3%); 26 were shown a
  Pro modal, 24 signed up.
- **Target** app-open ≥ 55% and solved-one ≥ 28% of home landers over the 21
  days, reached-six not below 10%, and company-card clicks ≥ 10% of landers.
- **Falsification, stated in advance:** solved-one below 20% at n ≥ 300
  landers → the company-first hero narrows the door (people who are not
  interviewing bounce); restore the practice-first hero and keep the sets
  section. App-open up and solved-one down → the page sells a set the app does
  not open on (check that `?company=` lands on the filtered list, not on the
  placement quiz). Both flat within ±3 points → the homepage was never the
  constraint; stop rewriting it.
- **Confounds** `onboardingIntake` flips 09-16 and `freeQuota` 09-21 inside
  the window; both move first-run behaviour for every door, so read
  `/sql-exercises/` as the control (same events, untouched page) and judge
  the homepage on the difference, not the level. Assistant-recommended
  arrivals land here with no referrer, so a burst from Gemini or ChatGPT reads
  as homepage lift — split on `landingSrc` before crediting the copy.
- **Verdict** **FLAT** over 21 days to 10-03: 400 landed → opened 50.0% (51.9%) → solved one 24.3% (23.8%) → six 10.5% (10.3%), all inside ±3 → per the falsification, the homepage is not the constraint; stop rewriting it. Last week's dip is mix (Google brand landers 127 → 21). Item 15: no revert — the modal rose. Read: docs/reads/home-price-story-2026-10-03.md.
- **Revised the same evening, on the founder's 16-item list.** Variant
  `interview_promise_v1` replaces `company_first_v1` (which lived a few
  hours): one promise in the hero ("Pass the SQL interview."), the "free
  forever / no trial clock / free is the product" phrases gone, two CTA
  labels only (Start free / See pricing), one bank number (299), Pricing in
  the nav and the Pro section moved under the Coach mock in outcome
  language, a usage line under the hero (5,745 accepted solutions since
  June, 1,195 people in 30 days, measured 09-12), the Turkish banner by
  country (`/api/geo`), English sector params, a four-item nav with the mega
  menu in the footer, the comparison table re-checked (StrataScratch now
  shows an AI evaluator and a real free tier). **The founder's two watch
  metrics (item 15) replace the target above:** home→app must not fall
  below **51.9%**, and modal→checkout (people who clicked a plan or checkout
  ÷ people shown the modal) must rise from **3.4%**. If the second falls,
  the wrong work was done: revert the page and the modal to the 09-12 noon
  state (commit e6e5069 for the page, the pre-437f72e modal) — the
  founder's rule, not a judgement call. Read 2026-10-03; watched every
  Friday by `weekly-funnel-friday`.
- **Design pass, 2026-09-13 (the founder's 17-item list), same variant.**
  One company section (the logo strip and the "question shapes" are gone),
  the nine-topic grid moved to /sql-exercises/, industry tracks as one line,
  section padding halved, three accents only (purple brand, yellow action,
  green status — orange, cyan, red and the pink gradient purged), grey
  eyebrows, plain-white H2s outside the hero and the final, line icons for
  every emoji, a full six-line query in the mockup, the proof line inside
  the hero under the H1, clickable pricing cards (`?pro=1&plan=annual|monthly`,
  modal reason `pricing_link`), three "Start free" buttons (hero, pricing,
  final), a purple one-line banner in body type, FAQ at six. **Measured
  before → after:** height 10,857 → 6,659 px at 1024 wide (6,633 at 1440;
  target was under 6,000 — the Coach mock alone is ~1,000 px and its radar is
  test-bound to this page, so the last 750 px need a content decision, not a
  trim); Lighthouse desktop 93 → 100, LCP 1,582 → 495 ms, FCP 843 → 495 ms,
  CLS 0.009 → 0.004, page 159 → 153 KB. home→app: the 09-06→09-12 baseline
  is 51.9%; the first seven days of the new page are read on the Friday of
  2026-09-18 (`weekly-funnel-friday`), not here. Item 15 (a Preply photo in
  "built in public") waits for the file; item 9's usage line is refreshed by
  the Friday task.
- **Positioning, 2026-09-13 (founder's SEO plan, P0.3), variant
  `personalized_v1`.** H1 "Personalized SQL interview practice.", subline "An
  AI coach that finds your SQL skill gaps — and builds your practice around
  them.", the Skillmap (the nine-skill radar, renamed site-wide) as the first
  section after the hero, the industry strip removed. Same two watch lines;
  the Friday table splits home→app by variant.

### hero CTA copy test, interview-goal intake, company set match, later login asks (founder's SEO plan P3.18–P3.21, 2026-09-13)

- **Claimed** 2026-09-13 · **Live** three parts, dated separately:
  (1) the hero CTA test **arms itself on 2026-10-04** (a date gate in
  `src/track.js`), after the 10-03 homepage read closes, because three of its
  five arms do not go to `/app/` and would move that read's home→app watch
  line by construction; (2) the intake's company and level steps ride
  `onboardingIntake` (flip 09-16); (3) `companySetMatch` flips with it by the
  same task; (4) the login-ask fixes are live on push, no flag.
- **Change** (1) `data-cta-test="hero"` on the homepage primary button; arm by
  hash of `aid`, five arms — control "Start free" → app, "Start Practicing" →
  app, "Test My SQL Skills" → /sql-quiz/, "Check My Interview Readiness" and
  "Build My Interview Plan" → the readiness test (same destination, so that
  pair isolates the words). Every event on the page carries `ctaArm` and
  `ctaTest='hero_cta_v1'`. (2) An interview goal adds "which company" (the
  30 `?company=` names → `prepTarget.company`) and "what level" (entry / mid /
  senior → `userGoals.level`); both skippable; `intake_completed` carries
  both. (3) Coach card for a named company with no interview archetype: half
  set coverage, half Skillmap weighted by the set's skills, weakest demanded
  skill, next free challenge in the set — never called readiness
  (`src/utils/company-set-match.js`). (4) Login audit: an unresolved
  `?challenge=`/`?interview=` no longer strands a cold visitor on Sign In; the
  first-solve email ask is once per browser instead of once per page load
  (guests resume since 09-12); stale "guest sessions reset" copy fixed; the
  free AI-call label said 10/day, the server allows 20.
- **Metric** `hero_cta_test`, `company_set_match` (docs/agent/metrics.md);
  the intake parts read inside the existing `intake_funnel`.
- **Baseline** homepage hero: arrivalSrc=home first solves per landing
  person in the 28 days before 10-04 (compute at arming; the 09-12 read's
  51.9% home→app is the reference). Set match: new, zero.
- **Target** by 11-01 (four weeks armed): identify the arm with the highest
  people-who-solved-one-within-7-days per homepage landing person, at
  n ≥ 150 per arm; set-match card → next-challenge click ≥ 20% of people
  shown a score.
- **Falsification, stated in advance:** no arm beats control by ≥ 3
  points on solved-one at n ≥ 150 per arm → keep "Start free", end the test,
  record FLAT. An arm that wins on clicks but loses on solved-one is a MISS
  for that arm, not a win. Set-match next clicks under 10% → the card is
  noise on the Coach; remove it.
- **Confounds** `freeQuota` (09-21) and `quietEarlyAsks` (09-29) change what
  happens after the click for every arm equally; the per-arm comparison holds,
  the absolute levels do not compare with September.
- **Verdict** **UNREADABLE — n too small, re-read 2026-12-20** (B2, read 2026-11-22; armed 10-04 → 11-21, first armed homepage landing per aid, bots out, `challenge_solved` within 7 days): no arm has 150 people — control 120, start 107, plan 102, readiness 113, skills 127. Solved-one: control **13.3%**, start 14.0%, plan 12.7%, readiness 9.7%, skills 8.7% — no arm ahead of control by 3 points. **"Test My SQL Skills" is already a MISS for its arm** by the rule written in advance: the most clicks (31 of 127) and the lowest solved-one. At ~17 people per arm a week, 150 lands around 12-20; if nothing beats control by 3 points then, keep "Start free" and end the test (FLAT). Parts 2–3 never went live (`onboardingIntake` off: 0 `intake_*`, 0 `company_set_match_*` rows) — nothing to read. Part 4 shipped as correctness.

### free SQL tools, alternatives pages, and the outreach kit (founder's SEO plan P2.13–P2.17, 2026-09-13)

- **Claimed** 2026-09-13 · **Live** on push, no flag · **Read** 2026-11-24
  (the T2 read date in docs/plans/backlinks-2026-09-11.md; links take months).
- **Change** (1) `/sql-query-checker/`, `/sql-query-explainer/`,
  `/sql-query-optimizer/` and the `/sql-tools/` hub
  (`scripts/build-sql-tools.mjs` over `src/utils/sql-tools.js`): static,
  in-browser analysis — nothing is sent anywhere; event `tool_used {tool,
  found, kinds}`, never the query. `/sql-quiz/` is now titled "Free SQL
  Skill Test". (2) `/datalemur-alternatives/` and
  `/stratascratch-alternatives/` (`scripts/build-alternatives-pages.mjs`):
  every competitor fact from `docs/reads/alternatives-facts-2026-09-13.md`,
  dated and linked, and SQL Quest's section lists what it is worse at.
  (3) Outreach kit, nothing sent: `docs/marketing/backlink-prospects-
  2026-09-13.md` (100 URLs, fit-scored), `backlink-outreach-2026-09-13.md`
  (5 PRs, 3 AlternativeTo listings, 7 author notes, tracker),
  `distribution-drafts-2026-09-13.md` (Reddit and LinkedIn).
- **Why** a list of free resources adds a free tool far more readily than a
  product (the 09-11 plan's T2 bar), and "X alternatives" is the query family
  where the prospect list found us absent from every editorial page.
- **Metric** `external_links` (docs/agent/metrics.md) for the links;
  `tool_page_door` for what the tools do once people arrive.
- **Baseline** 3 real linking domains (09-11 plan). Tools and alternatives
  pages: zero, new.
- **Target** by 11-24: ≥ 5 links merged or accepted from the outreach kit;
  ≥ 150 `tool_used` people; tool-page door → readiness or app click ≥ 10%.
- **Falsification, stated in advance:** under 2 accepted links after all 15
  kit items were sent → the free-tool pitch does not clear editors' bar;
  stop outreach and move the effort to T3 (publish a measured finding).
  `tool_used` people under 30 by 11-24 → the tools do not rank or get
  shared; fold them into one page and stop building more tools.
- **Confounds** none of these doors existed before; the founder's send dates
  are the treatment and must be written into the tracker.
- **Verdict** _pending_

### question pages, two more topic pages, and the internal link graph (founder's SEO plan P1.7–P1.12, 2026-09-13)

- **Claimed** 2026-09-13 · **Live** on push, no flag · **Read** 2026-10-27
  (six weeks: 300 new URLs on a low-authority domain index slowly).
- **Change** (1) `/questions/<slug>/` for all 299 challenges plus a
  `/questions/` hub (`scripts/build-question-pages.mjs`, in `npm run build`):
  problem, schema with three sample rows, difficulty, concepts linked to the
  topic pages, the company sets that include it, the hint (free challenges
  only, and never a hint that spells out the query), related questions, a
  "Solve it in the browser editor" link into the app and the readiness test.
  No reference solution is published — `tests/question-pages.test.js` fails
  on any. (2) `/challenges/ranking-functions/` and `/challenges/advanced/`
  (`scripts/build-topic-extra.mjs`), bound by the same TOPIC_PAGES rules as
  the nine hand-written pages. (3) Links: every topic-page card title and
  every company page's set now link the question pages; the readiness
  result links its recommended question; homepage footer, `/challenges/` and
  `/sql-exercises/` link the new pages. (4) Schema: BreadcrumbList +
  LearningResource on question pages, + FAQPage on the two new topic pages.
- **Why** practice-shaped doors convert to a first solve at 29–37% against
  ~9% for editorial ones, and a single named question ("second highest
  salary sql", "top n per group sql") is the most practice-shaped query
  there is. Before this, each challenge lived only inside the app, where
  nothing indexes it.
- **Metric** `question_page_door` (docs/agent/metrics.md).
- **Baseline** zero: the URLs did not exist. Sitemap 97 → 399 URLs.
- **Target** by 10-27: ≥ 100 question pages indexed in GSC; ≥ 30 earning
  impressions; question-page door solved-one ≥ 30% at n ≥ 50 people.
- **Falsification, stated in advance:** fewer than 25 indexed at 10-27 after
  the sitemap was read → Google treats them as thin; add each page's own
  worked explanation to the top-traffic 30 and noindex the rest (P4 prune
  rule). Solved-one below 20% at n ≥ 50 → the page answers the question
  well enough that nobody opens the editor; move the schema below the fold
  and the CTA above the description.
- **Confounds** `onboardingIntake` (09-16) and `freeQuota` (09-21) move every
  first-run door; read against `/sql-exercises/` as control.
- **Interim, 2026-09-25 (gsc_daily, not a verdict):** 210 question pages
  earned impressions since 09-13 (target ≥ 30 by 10-27), 1,901 impressions,
  19 clicks, position 17.2; last 7 days 1,353 · 16. URL Inspection: 399 of
  the 410 sitemap URLs indexed (the 5 newest question pages unknown to
  Google on 09-25). Their own click share is small — of September's +10.4
  clicks/day over August, question pages carry +0.8 — but the topic pages
  they link into moved 47.1 → 14.3 in position and blog 31.4 → 16.2. The
  index and impression targets are met early; the conversion target
  (`question_page_door`) is still the read on 10-27.
- **Verdict** **HIT on index and impressions, MISS on the door — the falsification fired** (B2, read 2026-11-22; door = first `landing_view` on `/questions/<slug>/`, 09-13 → 10-27, bots and the LA no-referrer crawler out, a solve within 7 days): the index and impression targets were met by 09-25 (interim above). **Solved-one 1.5% (11 of 744 people)**; 47 (6.3%) clicked "Solve it"; the hub 0 of 49; control `/sql-exercises/` **27.8%** (303 of 1,091) in the same window. Below 20% at n ≥ 50 → the page answers the question and nobody opens the editor. Pre-written action: **move the schema below the fold and the CTA above the description** — BACKLOG, owner C1. Confound: the 744 may hold crawler rows no fingerprint catches; at half the denominator the rate is still under 5%.

### the company template, seven new company pages, and the readiness funnel (founder's SEO plan P0.4–P0.6, 2026-09-13)

- **Claimed** 2026-09-13 · **Live** on push, no flag · **Read** 2026-10-13
  (30 days; new pages need two to three weeks to index).
- **Change** (1) `scripts/build-company-pages.mjs` + `src/data/company-
  interviews.js`: one template for "{Company} SQL Interview Questions" —
  format as candidates report it (each row citing dated sources, disagreements
  stated), the SQL that comes up (reported, next to our set's composition),
  difficulty, paraphrased question shapes with sources, the real tagged
  challenges, a Skillmap/readiness block, topic links, FAQ. Seven new pages:
  DoorDash, Goldman Sachs, Walmart, TikTok, LinkedIn, Microsoft, Bloomberg
  (16–18 tagged challenges each, Easy → Hard). The 23 older pages keep their
  copy and gain the readiness block and topic links. (2)
  `/sql-interview-readiness-test/` (`scripts/build-readiness-test.mjs`): ten
  questions, no signup, a Skillmap per skill, an overall score weighted by the
  company's tagged-set skill mix when `?company=` is given, the weakest skill,
  and "Build My Personalized Practice Plan" opening the gentlest free
  challenge on that skill (from the company's set when it has one) in the app;
  the app's `?src=readiness` hook sets the prep target company. (3) Every blog
  post opens with a practice box (topic page + readiness test).
- **Why** editorial doors convert at ~9% to a first solve vs 29–37% for
  practice-shaped doors (docs/reads/editorial-vs-practice-doors-2026-09-09.md);
  company-intent queries are the long tail we win (keywords-2026-09-08). The
  seven names came from the founder; research said defer on Microsoft (SQL
  Server intent) and Bloomberg (format thinly reported) — shipped with that
  stated, first in line for the P4 prune rule.
- **Metric** `readiness_funnel` and `company_page_door` (docs/agent/metrics.md).
- **Baseline** company pages 2026-08-14 → 09-11: 309 people landed, 29.4%
  solved one, 11.0% reached six (editorial-vs-practice read). Readiness test:
  new, zero. Blog door: 46 people in 90 days, 8.7% solved one.
- **Target** by 10-13: the seven new pages indexed and earning impressions
  (≥ 5 of 7); company-page door solved-one ≥ 30% held with the readiness block
  in place; readiness_completed ≥ 40% of readiness_started and
  readiness_plan_clicked ≥ 35% of completed; blog door solved-one ≥ 15%.
- **Falsification, stated in advance:** company-page solved-one below 25% at
  n ≥ 200 → the readiness block pulls people away from the set; move it below
  the FAQ. Plan clicks below 15% of completed → the result does not sell the
  next step; rewrite the result card before adding tools. A new page with zero
  impressions at 10-13 after indexing was requested → it goes on the P4 prune
  list.
- **Confounds** `onboardingIntake` (09-16) and `freeQuota` (09-21) move every
  first-run door; read company pages against `/sql-exercises/` as control.
- **Verdict** **HIT on indexing, MISS on the doors** (B2, read 2026-11-22; 09-13 → 10-13, door = first `landing_view`, bots out, a solve within 7 days): **7 of 7** new pages earned impressions by 10-13 (5–51 each, 197 together, 4 clicks). Company-page solved-one **9.6%** on the older pages (408 people) and 3.6% on the seven new ones (55) — under 25% at n ≥ 200, so the falsification's letter fires (move the readiness block below the FAQ). **But the 29.4% baseline was not this registry's definition:** the same query over 08-14 → 09-11 reads **12.3%** (357), so the real move is −2.7 points while `/sql-exercises/` held (28.8% → 28.4%) — small, and confounded with the 09-25 quota. Readiness: 23 started → 5 completed (**22%**, target 40% — MISS) → 5 plan clicks (100%, target 35%) → 5 arrived; the 15% plan-click rule does not fire. Blog door **1.7%** (350 people) against 15% (1.8% before). The readiness-below-FAQ move goes to BACKLOG as a test for C1, not as a settled fix, because the line it failed was drawn on another definition.

### the streak card: reward a solved question, not a visit (founder QA 2026-09-21)

**What changed.** The Daily Reward modal opened over the Learning Path on the
first visit of the day and paid up to 90 XP for opening the app. It read a
visit streak (`loginStreak`) and, on the same card, the month's visit total,
so it could say "1 day streak" and "5 days logged" at once. The header already
held the right number — `dailyStreak`, moved only by a correct submit — and the
modal ignored it. Now: no modal; the header streak is a chip; a card (not a
modal: no backdrop) opens from it and slides in once after the day's first
solve, waiting for the radar / achievement / Pro surfaces to clear. +10 XP
flat, claimable only after a solve. The visit is still recorded (profile "Last
login", the perfect_week / monthly_legend achievements), just not rewarded.
Pure half `src/utils/streak-card.js`; guards `tests/streak-card.test.js` and
guard (a) in `tests/interview-first.test.js`.

**Claim.** Taking a blocking modal off the first screen of the day and moving
the reward from the visit to the solve does not cost next-day practice, and
should add to it: the only thing the card asks for is the thing that counts.

**Metric** `practice_next_day`. **Baseline** 42.8% (151 / 353 solver-days,
2026-08-24 → 09-20). **Guardrail** ≥ 40%. **Hope** ≥ 46%.
**Falsification**: below 38% over the four weeks to the read — at n ≈ 350 that
is ~2 standard errors down, not noise — and the modal comes back while we
find out why.

**Read 2026-10-19.** Confounded by design and on purpose written down now:
`interviewFirst`, `deadlineOffer` and `freeQuota` are all scheduled to flip on
2026-09-21, the same day. Read the metric split by interview person (who get
the streak but no XP handout) vs everyone else; if only one side moves, the
card is not the reason.

- **Verdict** **the headline falsification fired, and the split clears the card** (read 2026-11-22, registered solvers as defined in metrics.md; guests by `guest_*` username, bots and crawler window sizes out). `practice_next_day` **30.7%** (238 solver-days, 09-21 → 10-18) against the 38% line, 26.0% after (77). Split by solves on the day (the interview-person split was not computable from events): registered **10+ solves 54.0% → 48.8% → 48.1%**; registered **under 10 solves 35.0% → 17.8% → 14.0%**. Guests lost the same modal on the same day and did not move: under 10, **5.9% → 8.8% → 6.5%** (355 / 400 / 248 solver-days). The fall is in who registers, not in what the card pays: registered solver-days fell from 367 in the base four weeks to 230, since guest progress persists (09-12) and the account ask moved; the early registrants who are left are a different, colder group. **The modal does not come back** (decided under the founder's delegation). Read the next-day habit on guests + registered together from here; the registered-only series no longer measures a stable population.

### access comes back off (founder QA 2026-09-20, P0 items 1-4)

**Claim.** The money path could grant access and could not withdraw it, so
some people held Pro they had stopped paying for. Closing that costs nothing
in revenue (nobody pays more) and removes an unbounded liability.

**Measured before the change.** `test7` had been refunded in full at 17:30 and
still read `proStatus: true, proExpiry: 2026-10-20` at 18:00 — a month of
access on money that had been given back. On the annual plan the same bug is
a year. The Stripe endpoint was subscribed to FOUR events; the two written on
2026-09-12 (`checkout.session.expired`, `customer.subscription.updated`) had
never been added in the dashboard, so that code had never once run in
production.

**What shipped.** `charge.refunded` (full refund revokes and cancels the
subscription; partial does neither), a revoke on the final payment failure,
and status handling on `customer.subscription.updated`. Endpoint now
subscribed to seven events; function deployed; `test7` corrected by hand
(`supabase/manual/20260920_test7_refunded.sql`) because Stripe will not
retro-deliver an event to a destination that was not subscribed when it
fired.

**Verified end to end.** Scheduling test7's cancellation at 17:59 produced
`pro_subscription_cancelled {scheduled: true, cancel_at: 2026-10-20}` in
`pro_events` 3 seconds later, through the newly subscribed event and the
newly deployed function.

**Falsification.** A `pro_refunded` row with `matched_user: false`, or a
`pro_access_revoked` row for someone whose payment had in fact succeeded,
means this is revoking the wrong people. Read 2026-10-21 with the rest of the
billing series; metric `pro_revoked`.

- **Verdict** **HIT** (read 2026-11-22, 09-20 → 11-21): three rows. `pro_refunded` 1, `matched_user: true`, followed by `pro_subscription_cancelled`. `pro_access_revoked` 2 (`subscription_incomplete_expired` 10-02, `payment_failed_final` 11-01); neither account had a succeeded payment within 3 days of the revoke, and neither has one since (the second started a new trial later). No `matched_user: false` row, no wrong revoke.

**Still open, deliberately.** A full refund cancels the subscription
outright. If the founder ever wants "here is this month back, please stay",
that needs its own path — the current rule is written down in the handler.

### the price story: page and modal tell it the same way (founder's items 3, 5, 16 — 2026-09-12)

- **Amended 2026-09-20 (founder's first real walk through Stripe).** Three
  things the buyer read at the moment of paying, none of them visible from
  inside the app:
  1. The modal said SAVE 72% and the Stripe product said 57%. Ours is the
     true one ($29 x 12 = $348 -> $99). Stripe's name is left over from the
     $19 month ($228 -> $99 = 57%) and is the founder's to change in the
     dashboard; `tests/checkout-surface.test.js` now binds our badge to our
     own prices so the two can't drift again on our side.
  2. The card statement reads "Datrick, Inc." The modal says so now, above
     the plan cards' fold, so the name on the statement is never a surprise
     (a surprise there is a chargeback).
  3. "Just completed payment? -> Verify Payment" sat next to the price. It
     is gone from the buying surface. **Measured the same day:** for all
     four real purchases the `stripe_webhook` row lands 3-6 seconds BEFORE
     the buyer's browser returns (sergelafarge 6s, sab3r 5s, jeromezhao 4s,
     harinivr02 3s), and the button never activated anyone — zero
     `pro_purchase_completed` rows with source `existing_user_data` or
     `pending_subscription`, ever. The same logic now sits on the pending
     screen, which is reached only after six failed polls (~12s), i.e. only
     when the sentence is true.
- **Amended again 2026-09-21:** "most people choose this" removed from the
  annual card on the modal and the homepage — 2 of 4 real subscriptions are
  annual, so the line was false. Same read, one more change inside its window.
- **What this does to the 10-03 read:** `modal_click_rate` (3.4% baseline,
  15% target) is measured on a modal that changed on 09-20. If it moves,
  that is this change plus the 09-13 rewrite, not the rewrite alone. The
  removal is the one to watch: it takes a line OUT of the buying surface,
  so a drop would be surprising and worth reverting.

- **Claimed** 2026-09-12 · **Live** on push, no flag · **Read** 2026-10-03.
- **Change** the Pro modal sells two plans — annual first and highlighted
  ($99, "most people choose this"), monthly beside it ($29) — and the $199
  lifetime card is gone (zero purchases in the product's history, two clicks
  ever, and it undercut two years of annual). The "What you get" list speaks
  in outcomes tied to the interview: the Hard question on the day, the
  screen sat before the screen, help that does not stall the night before;
  "unlimited" is no longer claimed (the tutor cap is lifted, not removed).
  The homepage pricing section says the same three things in the same
  order. Every page that quoted the lifetime price (43 files) now quotes two
  plans; legal pages keep the lifetime clause for existing holders and say
  it is no longer sold. `tests/site-counts.test.js` and
  `tests/llms-txt.test.js` bind the site to a two-plan modal.
- **Why** the founder's decision ("remove or $349"): removal, because the
  plan had no buyers, a $349 card would need a Stripe price the agent cannot
  create, and two plans match item 7's "fewer asks". The modal changes now
  rather than in week 2 because item 16 says the modal and the page must
  tell one story in the same week.
- **Metric** clicks per person shown on the milestone ask
  (`pro_plan_clicked` or `pro_checkout_clicked` ÷ `pro_modal_shown`, people
  by `aid`, `reason='milestone_solves'` only), and the plan mix of clicks
  (annual ÷ all).
- **Baseline** 30 days to 2026-09-12: 203 shown → 7 clicked → **3.4%**; 2
  paid; annual share of purchases 1 of 3 ever.
- **Target** ≥ 5% clicks per person shown over 21 days, and annual ≥ half of
  plan clicks.
- **Falsification, stated in advance (the founder's rule, item 15):** below
  3.4% at n ≥ 150 shown → revert the modal's order and copy to the 09-12
  noon state (keep the two plans — the lifetime removal is a pricing
  decision, not a copy test). Annual under a third of clicks → the
  "most people choose this" line is not earning its place; drop it.
- **Confounds** `freeQuota` flips 09-21 and adds `free_quota` asks — read
  `milestone_solves` only; `quietEarlyAsks` (09-29) lands inside the window's
  last four days — cut the read at 09-28 if it moves the milestone reason.
- **Verdict** **HIT** on clicks (milestone ask 178 shown → 14 clicked, **7.9%** vs 3.4% baseline, target 5%), **MISS** on the plan mix (19 monthly / 2 annual / 2 quarterly choosers vs "annual ≥ half"). Read 2026-10-04: docs/reads/home-price-story-2026-10-03.md. The annual-emphasis half of the backlog plan is not built.

### the second ask: one email to the activated non-payers (founder's week-2 item 8, built 2026-09-12)

- **Claimed** 2026-09-12 · **Sends** when the founder runs
  `activated-note` (deploy, then `?dry=1`, then one batch of 40 a day
  until drained) · **Read** 14 days after the last batch.
- **Change** `supabase/functions/activated-note`: registered accounts with
  six or more distinct solves and no `stripe_webhook` purchase, an address,
  not opted out, not internal, not mailed by any campaign in the prior 7
  days, once per person ever. Founder in every subject (three variants
  chosen by username), the body names the person's solve count, the lowest
  line on their radar when the record has one, and the company they named;
  one CTA, `/app/?src=activated_note&pro=1`, which opens the Pro modal
  (reason `email_link`, headline "The interview run, before the
  interview."). Reply-to the founder. Guards in tests/activated-note.test.js.
- **Why** every purchase came at 6–10 solves in a first session; these 136
  passed that point, were asked once by the modal on the day, and never
  again. The homepage and the modal now make one promise; this is the same
  promise to the people who already did the work.
- **Metric** `activated_note` (docs/agent/metrics.md): sends, returned_48h,
  `pro_modal_shown` with reason `email_link`, clicks after it, purchases
  within 14 days, by username.
- **Baseline** 136 people, 0 asked by email; the segment has produced 0
  purchases in the product's history by construction.
- **Target** ≥ 3 purchases from the segment within 14 days of its batch,
  and modal→click on `email_link` ≥ 5%.
- **Falsification, stated in advance:** 0–1 purchases and `email_link`
  modal→click below 3.4% after the whole segment is mailed → the activated
  non-payer does not buy on a second ask; never mail this segment again and
  say so in objectives.md. Returned_48h below the campaign floor with
  bounces above 2% → the list is stale, stop the batches.
- **Confounds** the modal's two-plan rewrite (same day) is what they see —
  read the `email_link` reason on its own, never against the milestone
  rate. `freeQuota` (09-21) walls the bank at ten for these people the
  moment they return; a batch after 09-21 is a different offer — note the
  batch dates in the read.
- **Batch 1:** 2026-09-12 20:57Z, 40 sent, 40 delivered within 15 seconds
  (Resend webhook), 0 failed; the function was on version 2 (the opener fix)
  when it ran. 37 remain reachable now; 70 more enter as their 7-day quiet
  window passes. Read of batch 1: 2026-09-26.
- **Verdict** **MISS — the falsification fired** (B2, read 2026-11-22; last batch 10-01, read due 10-15): **80 sent** (09-12 40, 10-01 40), 79 delivered, 1 bounce (1.3%). Back within 48 h: **2 of 80**. A plan click within 14 days: 1. Trials or purchases within 14 days: **0** (0 since, either). `pro_modal_shown {reason: 'email_link'}` has **no row at all**, so modal → click cannot be read and the 3.4% half is unchecked — an instrumentation gap of its own. 0–1 purchases → as written: the activated non-payer does not buy on a second ask; **this segment is not mailed again**, the ~56 never reached included (recorded in objectives.md; sending is the founder's call).

### three hand-written founder emails to the checkout abandoners of 09-04 / 09-06 — **HIT**

- **Sent** 2026-09-12 evening by the founder from Gmail (drafts written by the
  agent; addresses deliberately not in git). Three people who clicked a plan
  and left Stripe Checkout without submitting a card (Stripe checked the same
  day: no failed or incomplete payment exists): `alexis_montesdeoca`
  (lifetime, 25 min on the page, 12 solves since), `harinivr02` (monthly,
  `company:Stripe`, 28 solves since), `rereremin` (monthly, Moscow, 24 s on
  the page, not seen since). One question each — what stopped you — no
  pitch, no follow-up, per the email rule in CLAUDE.md.
- **Contact load, known before sending:** each had already received the
  automated `checkout_abandon` note (09-05 / 09-07 / 09-08), a `streak_save`,
  a `weekly_digest`, and two of them a `skill_decay_lesson` at 10:00Z the
  same morning. This is the third to fifth email in eight days. If nobody
  answers, that is one candidate reason; read it before reading "the
  question was wrong".
- **Metric** `outreach_replies` (metrics.md): replies within 7 days, by
  name, verbatim. **Read** 2026-09-19.
- **Target** 1 of 3 replies. **Falsification:** 0 of 3 → the abandonment
  reason stays unknown; do not mail these three again, and do not build the
  merchant-of-record change on an assumption — read the M1 wall's
  `pro_checkout_returned.outcome` split by `tz` instead.
- **Verdict, 2026-09-19 — HIT, 1 of 3 replied, and the reply became the
  fourth payer.** Read from the founder's inbox (Gmail thread, subject "From
  SQL Quest's founder — the Stripe prep, and the page you closed") and
  `pro_events` / `users_public`, internal excluded.
  - `harinivr02` — replied 2026-09-14 04:56Z, day 2. Verbatim on the
    question asked: "The main reason I closed the checkout was the price."
    Also: had just sat a Stripe SQL round and "wasn't entirely happy with my
    performance"; asked for a discounted monthly; attached a CV. The founder
    answered the same morning with a personal code (HARINI49, $49 first
    year, expiring 09-21); she bought the annual plan 2026-09-19 02:19Z
    (`pro_purchase_completed`, `stripe_webhook`, 4,900 cents) — day 7 of
    this read, the fourth real purchase in the product's history, interview-
    shaped like the other three. Within six hours of paying: 70 attempts, all
    three Easy window-function questions solved (the gap named in the
    founder's email), Window Functions 0 → 20. Reply drafted 09-19.
  - `alexis_montesdeoca` — no reply. Kept solving: 18 solves since the
    send (29 total), last active 2026-09-19 00:58Z. Still free.
  - `rereremin` — no reply, not seen since 2026-09-06 (before the send).
  - Contact load did not silence the one who was active. The abandonment
    reason we have is one person's and it is **price of the monthly**, given
    by someone who then paid $49 for a year — consistent with the price-story
    claim's premise (annual first) and with the 09-12 finding that purchases
    are first-session decisions only when the price fits the moment.
  - The rule stands: none of the three is mailed by any campaign again
    (`FOUNDER_MAILED_BY_HAND` in goal-note). The founder's own thread with
    Harini continues by hand.
  - Not a read of the merchant-of-record question: n=1, and the answer was
    price, not card.

### Revolut membership: everything but the signature — **SIGNED 2026-09-12**

- **Signed** 2026-09-12 by Göktuğ, in chat ("imzaladım, revolut'u kayda
  taşı"); the block moved into `INTERVIEW_ARCHETYPES` as the second
  archetype (`neobank-analyst` on `finans_neobank`), the registry test now
  asserts two. This is the pre-registered "a second value in `company`"
  trigger firing, by design: from this date every prep read splits by
  company, and the two rows are never summed.
- **Written** 2026-09-12. Not a claim to read; a state to sign. The registry
  checklist (src/data/interview-archetypes.js) is met on every point a script
  may meet: a dated source (interviewquery's 2026 guide, 27 candidate reports
  stamped Q3 2026), a ledger of the sourced shape (`finans_neobank`), twelve
  challenges on it tagged Revolut (300-311), a mock keyed to the exact name
  running on that ledger and nothing else (`revolut-analytics-screen`: 6
  multiple choice whose correct options are computed from the data + 2
  written tasks, 60 minutes), the page section with a `Sources:` line
  (src/revolut-sql-interview.html, now in `SOURCED_PAGES`), and the
  archetype + member block — `PENDING_INTERVIEW_ARCHETYPES`, `declaredBy:
  null`. tests/revolut-mock.test.js proves that with a placeholder signature
  every other validator check passes and `eligibleTargets` returns Capital
  One and Revolut.
- **To sign** (the founder, in one commit): set `declaredOn` / `declaredBy`,
  move the block into `INTERVIEW_ARCHETYPES`, change the "exactly one
  archetype and one member today" assertion in tests/interview-prep.test.js
  to two. That commit fires the pre-registered stop-and-look on
  `interview_prep_funnel` — a second value in its `company` column — so read
  the funnel split by company from that date, and keep the two companies'
  rows separate in every prep read.
- **What changes for a person when it is signed:** a Revolut arrival with a
  named target gets the prep flow (readiness, the day plan, the mock offer)
  that only Capital One arrivals get today. Until then the page already
  links the mock and the twelve challenges directly.

### weak skills come back at 3, 7 and 14 days (P2 spaced retrieval + daily quota)

- **Claimed** 2026-09-12 · **Flips** 2026-10-12 by the same scheduled task
  as the interview-prep wall (Coach surface; after the Coach-trust read
  10-11) · **Read** 2026-11-02 (flip + 21 days).
- **Change** behind `spacedRetrievalCard` (off): a "Due today · spaced
  retrieval" card on the Coach tab, between the radar and the countdown.
  A canonical skill is due when it has been practised, its mastery is below
  70, and the days since its `lastPracticed` (the user_skill row) reach
  3 / 7 / 14 for its first / second / later review; up to two skills, each
  with one unsolved challenge at the level the person has shown on it
  (`src/utils/spaced-retrieval.js`). Start opens it; the solve credits the
  review (`retrievalLog`, `retrieval_completed`). Events
  `retrieval_due_shown`, `retrieval_started`, `retrieval_completed`. Behind
  `dailyQuota` (off, same flip): the days-left chip on the Coach reads "12
  days left · 6 a day" — unsolved challenge steps on the active goal (or the
  interview-prep goal as the reference plan) over the days left.
- **Why** the landing has promised "Tomorrow · spaced retrieval" since the
  Coach shipped, and nothing was behind it outside a goal's own
  retrieval_check steps and the lesson-1 review. The founder's P2 list.
- **Metric** `retrieval_funnel` (metrics.md): people shown the card, share
  who start, share who complete; and the retrieved skill's mastery 14 days
  after the review vs matched non-reviewed weak skills. Guardrail:
  `coach_page_take_rate` on the next-step card (the card must not steal the
  Coach's one answer).
- **Baseline** structurally 0 (events born at the flip). Weak-skill
  regression baseline: measured at the flip — mean mastery change over 14
  days for skills with mastery < 70 and no practice.
- **Target** ≥ 40% of people shown start one; ≥ 60% of starts complete;
  reviewed skills hold or gain over 14 days while non-reviewed weak skills
  decay.
- **Falsification, stated in advance:** starts < 20% at n ≥ 60 shown → the
  card is ignored; move the due item into the Coach's next-step card as a
  step type rather than a second card. Next-step take rate falls > 10 points
  in the same window → the card competes; revert.
- **Confounds** the interview-prep wall (M2) flips the same day on the same
  tab; split on goal. The quota chip is display only and is read by
  `intake_funnel` (dates) rather than its own metric.
- **Verdict** **NOT FLIPPED — nothing to read** (checked 2026-11-22): `spacedRetrievalCard` / `dailyQuota` is still `false` on main; the flag queue (docs/agent/flag-queue.md, row — (not in the queue)) holds it as `off since built`. The read date above is void; a new one is set on the day it flips.

### the weekly digest says what moved and one thing to do (P2, live)

- **Claimed** 2026-09-12 · **Deployed** when `supabase functions deploy
  weekly-digest` lands (see the deploy note in the report) · **Read**
  2026-10-13 (three Monday sends).
- **Change** live in the function: two lines under the stats strip —
  "Moved most: Joins +9 (42 → 51)" from the canonical user_skill rows on
  `users.data.skillMastery` against the prior report's snapshot, and "One
  thing this week: three challenges on <weakest practised skill> (n/100)"
  with a tagged link (`weekly_digest_one_thing`). Rows without a numeric
  mastery (the old record, on accounts that have not loaded the new bundle)
  are ignored, so nobody is told a made-up number.
- **Metric** `returned_48h` for `weekly_digest` (scripts/funnel-report.sql
  §5–6), and clicks on the `weekly_digest_one_thing` utm vs the CTA.
- **Baseline** read from `email_events` for the three sends before deploy.
- **Target** returned_48h up ≥ 5 points over three sends.
- **Falsification:** flat at n ≥ 100 sends → the lines are decoration;
  keep the mastery line, drop the recommendation.
- **Deployed at** 2026-09-12 (the founder ran `supabase functions deploy
  weekly-digest`; verified on the project as version 6 with the new source —
  a first attempt earlier the same day had not landed, the keychain prompt
  had stopped it). First send with the new lines: Monday 2026-09-14 09:00Z.
- **Verdict** **UNREADABLE — n too small, and will stay so** (B2, read 2026-11-22): the falsification needs n ≥ 100 sends; the digest reaches 1–10 people a week (24 sends 09-14 → 11-16). Back within 48 h: the three sends before the deploy (08-24 → 09-07) 12 of 15 (80%), the three after (09-14 → 09-28) 14 of 17 (82%), everything after 18 of 24 (75%) — recipients are already active, so the rate sits at 75–80% either way. No `weekly_digest_one_thing` utm has ever reached `pro_events`, so the recommendation line's clicks are unmeasured. At this volume 100 sends is a year away; not re-read, the digest stays as it is.

### the wrong-answer panel says what is wrong, and one hint (P1 diff engine)

- **Claimed** 2026-09-12 · **Flips** 2026-09-30 by scheduled task, after the
  cold-start read (09-29) is written — the panel is the solve surface that
  read measures · **Read** 2026-10-21 (flip + 21 days).
- **Change** behind `diagnosisHints` (off): on a wrong submit the panel's
  second line is the diff engine's sentence ("Wrong number of rows —
  expected 12, got 30") instead of "Your output doesn't match the expected
  result. Try again!", and the diagnosis block shows ONE hint chosen for the
  diagnosis kind and the query as written (`primaryHint` in
  src/utils/diagnose.js: a missing GROUP BY when the query aggregates without
  one, a LEFT JOIN when rows are missing behind an INNER JOIN, `IS NULL`
  when the query says `= NULL`, the ORDER BY column lifted from the
  description) instead of the fixed three. Live regardless of the flag: the
  new `row_set` diagnosis kind — right count, wrong rows, reported as extra
  and missing rows rather than as "wrong values".
- **Why** the founder's P1 list: "remove the fixed hint list; one hint per
  diagnosis type; 'Try again!' → a diagnosis sentence". The engine already
  knew what was wrong; the panel told the student to try again.
- **Metric** `hint_to_solve` (docs/agent/metrics.md): of people who get a
  wrong submit on a challenge, the share who solve THAT challenge within the
  same session, split by the flag; secondary: wrong submits per eventual
  solve. Baseline read at the flip over the prior 21 days.
- **Target** wrong→solve same session up ≥ 5 points at n ≥ 300 wrong-submit
  people; never a drop in first-contact solve (the cold-start guardrail).
- **Falsification, stated in advance:** wrong→solve flat or down at n ≥ 300
  → the sentence was not the constraint; keep the row_set kind, revert the
  panel to the list, and read which diagnosis kinds stall. n < 300 by 10-21
  → extend to 11-11.
- **Confounds** the tutor ladder and the weak-skill picker flip the same
  day on different surfaces; a wrong submit that opens the tutor is read
  under the ladder claim, not here (split on `inline_help_opened` /
  `tutor_bypass_clicked`).
- **Verdict** **FLAT — the falsification fired** (read 2026-11-22; the flag flipped for everyone 09-30, so pre/post, bots out): wrong submit → the same challenge solved within 60 min, 84.9% (958 / 1,129 person-challenges, 301 people, 09-12 → 09-29) vs **84.9%** (864 / 1,018, 391 people, 09-30 → 11-20). As written: the sentence was not the constraint. The written action — revert the panel to the list, keep `row_set`, read which kinds stall — is a flag change for the founder; not taken here. Confound: the quota (09-26) sits in the pre window's last 3 days.

### the tutor speaks to the query, climbs a ladder, and remembers the habit (P1 tutor)

- **Amended 2026-09-19 (founder QA round 4, item 1), before the flip.** The
  challenge Help panel's diagnosis opener is now LIVE for everyone, not
  behind `socraticLadder`: it opens on the diagnosis (every window fix named),
  then the tutor reads the query, the fixes and the rows lost or added; the
  static topic lesson is gone and the panel sits under the diagnosis. What
  the 09-30 flip still changes is the ladder (defect → clause → full query)
  and the bypass. The 10-21 read therefore measures the ladder against a
  baseline that already has the diagnosis opener; `inline_help_opened.opener`
  carries `diagnosis | query | empty` from this date (was `diagnosis | topic`).

- **Claimed** 2026-09-12 · **Flips** 2026-09-30 with the panel claim ·
  **Read** 2026-10-21. Live from 2026-09-12 regardless of the flag: the
  enriched context (both tutor doors carry the student's query as written,
  the just-failed diagnosis, user_skill rows for the challenge's skills,
  the error patterns of the last ten wrong submits with a REPEAT line at
  three or more, the Coach goal and days to the interview date), and error-
  pattern recording (`challenge_error_pattern {kind, primary, patterns,
  repeat}`; store `userData.errorPatterns`; src/utils/error-patterns.js).
- **Change** behind `socraticLadder` (off): the inline help panel opens on a
  diagnosis of THEIR query (the diff sentence plus the one hint) instead of
  the static topic explanation; both doors follow a ladder — request 1 names
  the defect at clause level, request 2 gives the exact clause, request 3+
  the full corrected query with one line on why; asking for the answer
  outright bypasses the ladder, and a "Show me the answer" button does the
  asking. Flag off, the tutor never reveals the solution, as today.
- **Why** the founder's P1 list, and the measured state of the doors: the
  panel users actually see opened with `TOPIC_EXPLANATIONS[topic]` — the
  same paragraph for everyone on that topic — and the hint chain's prompt
  carried no query, no mastery and no history of mistakes. "This is the
  third time" was impossible: nothing counted.
- **Metric** `tutor_ladder` (metrics.md): of people who open the inline
  panel on a challenge (`inline_help_opened`), the share who solve it in
  the session, split by flag and by `opener`; bypass rate
  (`tutor_bypass_clicked` ÷ opens); REPEAT lines shown (people whose
  `challenge_error_pattern.repeat ≥ 3`).
- **Baseline** read at the flip over the prior 21 days: panel opens, solves
  after open. `challenge_error_pattern` is born 2026-09-12.
- **Target** open→solve same session ≥ 55% under the ladder (baseline TBD
  at flip); bypass ≤ 40% of opens.
- **Falsification, stated in advance:** open→solve under the ladder below
  the no-ladder arm at n ≥ 80 opens → the ladder gives away too much or too
  little; read bypass rate to tell which, then move rung 3 to rung 4 (too
  much) or rung 2's snippet to rung 1 (too little). Bypass > 60% → the
  first two rungs are not worth asking for; make rung 2 the opener.
- **Confounds** the free AI cap (20/day) — a person who hits it mid-ladder
  is read as unresolved; exclude `rate_limit` shows. The live nudge
  (`live_nudge` mode) also carries the REPEAT line from 09-12.
- **Verdict** **HIT on the solve, MISS on bypass** (read 2026-11-22, pre/post 09-30, bots out): inline Help open → that challenge solved within 60 min **72.3%** (284 / 393) vs 70.0% before (205 / 293) — target ≥ 55%, and not below the no-ladder level. Bypass: **204 of 395 opens (52%)** were followed by `tutor_bypass_clicked` — target ≤ 40%, under the 60% line that would make rung 2 the opener. Keep the ladder; the bypass is the next thing to look at.

### the next quest is the weakest skill, one step up (P1 picker)

- **Claimed** 2026-09-12 · **Flips** 2026-09-30 with the panel claim ·
  **Read** 2026-10-21.
- **Change** behind `weakSkillNext` (off): after a solve, the "Next quest"
  strip recommends a challenge on the person's WEAKEST canonical skill (by
  the user_skill mastery row), one difficulty above the highest they have
  solved on that skill (Easy if none; Hard only once mastery ≥ 50), in
  curriculum order — `pickNextBySkill` in src/utils/user-skill.js, never
  raw id order. The strip says why ("Weakest skill · Joins (42/100) · one
  step up"); `next_rec_started {source, skill}` on the click. Flag off, the
  strip picks curriculum-next at the same difficulty, as today.
- **Why** the founder's P1 list. Today's pick ignores the radar entirely.
- **Metric** `next_rec_take` (metrics.md): clicks on the strip ÷ solves
  that showed it, and solve rate of the recommended challenge within the
  session, split by `source`.
- **Baseline** `next_rec_started` is born 2026-09-12; the strip's take
  rate before the flip is read from it over 09-12 → 09-30.
- **Target** take rate ≥ the curriculum arm at n ≥ 200 strips shown, with
  the recommended solve rate ≥ 60%.
- **Falsification, stated in advance:** recommended solve rate < 45% → "one
  step up" is a cliff; drop the tier to same-as-highest-solved and re-read.
  Take rate < 70% of the curriculum arm → people do not want the weakest
  skill after a win; revert and keep the picker for the Coach's drill only.
- **Confounds** the intent-routing read (10-13) reads reach-6 over the same
  weeks; this moves what the second solve is. Noted on that entry.
- **Verdict** **MISS — the falsification fired** (read 2026-11-22, pre/post 09-30, bots out): take rate on the post-solve strip **40.8% → 17.3%** (curriculum 1,223 / 2,999 → weak_skill 410 / 2,374); among solves by people under 10 solves (clear of the quota wall) **29.3% → 15.7%** — 54% of the curriculum arm, below the 70% line. Recommended challenge solved in-session: 80.7% → 51.8% (target ≥ 60%; not under the 45% cliff line). As written: people do not want the weakest skill after a win — **revert, keep the picker for the Coach's drill only**: `weakSkillNext` off in branch `flags/weak-skill-next-off` (founder merges).

### company sets: three free, then Pro (free-tier boundary M1)

- **Amended 2026-09-20 (founder QA round 5, item 5), before the flip.** The
  gate applies ONLY where the set was authored for that company — a signed
  archetype member, today Capital One and Revolut
  (`archetypeForCompany`, src/data/interview-archetypes.js). Every other
  company's set is topical fit: SQL Quest challenges matched to the topics
  candidates report, which is now said in the app as well as on the page
  (`companySetMatched` / `companySetSourced`). Walling the fourth question of
  a topical set would sell a boundary we cannot defend. The read therefore
  covers two companies, not thirty; if that n is too small on 10-14, the
  honest move is to postpone, not to widen the gate.

- **Claimed** 2026-09-12 · **Flips** 2026-10-14 by scheduled task — after the
  intent-routing read (10-13) on `reach_6_rate`, which this moves for company
  arrivals by design · **Read** 2026-11-04 (flip + 21 days).
- **Change** behind `companySetGate` (off): in a company view the first three
  of the set are free, whatever their difficulty, and the fourth meets a wall
  — `content_lock_reached {surface: 'challenge_set', wall: 'company_set',
  setPosition, setSize, freeCount, solvedInSet}`, the cold-start diversion,
  then the Pro modal under reason `company_set` naming the set, the count and
  (M5) the company's mock when one exists. The banner says "3 of Stripe's 35
  are free to try" before anyone clicks; locked rows wear the Pro lock; the
  set-complete ask fires on the third solve. A solved challenge is never
  taken back, and every question stays reachable one by one from the general
  list — the curated set is what Pro buys. Pure half
  `src/utils/free-tier-boundary.js`; company-page copy ("21 free") changes at
  the flip, count guards enforcing it.
- **Why** measured 2026-09-12: the company page is the highest-intent door
  (169 arrivals in 30 days; 11% hit a wall vs 6.5% from the homepage) and the
  product it promises — "Stripe's SQL questions" — is mostly free: Snowflake
  53 free / 42 locked, Stripe 23 / 12, Plaid 25 / 9, Capital One 19 / 6.
  Amazon (10 / 24) is the one mostly-Pro set, and it produced a payer
  (sergelafarge, $99 annual, via `company:Amazon`) and a checkout click.
  harinivr02 arrived via `company:Stripe`, solved 6, clicked, did not pay —
  with 23 free Stripe questions there was nothing to pay for.
- **Metric** `company_set_wall` (docs/agent/metrics.md): company arrivals
  (`app_opened.arrivalSrc` like `company:%`) reaching the set wall, clicks
  per person at it, and purchases whose `arrivalSrc` is a company, all by
  `aid`. Guardrail: company-arrival reach-6 share.
- **Baseline** 30 days to 2026-09-12: 169 company arrivals, 45 solved
  anything, 21 reached six (12.4%), 19 hit a wall, 2 clicked, 0 paid.
  All-time company-arrival purchases: 1.
- **Target** ≥ 10% of company arrivals reach the set wall, ≥ 8% of those
  click, and ≥ 1 purchase attributed to a company arrival in the 21 days,
  with company-arrival reach-6 ≥ 8%.
- **Falsification, stated in advance:** company-arrival reach-6 below 8%
  with no purchase in the window → the door was worth more open; revert.
  Wall reached by < 5% → the wall is not where they are; read where company
  arrivals actually stop before touching it. 1 purchase at n < 100 arrivals
  → UNREADABLE, extend to 2026-11-25.
- **Confounds** the intent-routing read (10-13, `reach_6_rate`) — this flips
  after it for that reason. M2 flips 10-12 on the Coach; a company arrival
  holding the interview-prep goal is on both surfaces, split on goal. The
  payment-geography finding (0 of 7 non-US checkouts paid) caps what any
  wall can show in purchases; read clicks before purchases. Stripe checked
  2026-09-12: no failed or incomplete payment since 09-01 — the three
  non-payers left Checkout without submitting a card (abandonment, not a
  decline).
- **Verdict** **MOVED, guardrail breached** (read 2026-11-22, 09-26 → 11-21, bots out): 293 company arrivals, **40 reached the set wall (13.7%, target ≥ 10%)**, **6 of them clicked (15%, target ≥ 8%)**, 3 company arrivals trialled or paid (target ≥ 1). **Guardrail: company-arrival reach-6 = 17 / 293 = 5.8%**, below the 8% line and the 12.4% baseline (whose denominator still held unstamped crawlers, so the true fall is larger). Not the falsification (that needs no purchase as well), but the cost is real and confounded with the 10-solve quota that flipped the same night. Next: split reach-6 by whether the person ever met the set wall, before touching either gate.

### the interview-prep goal meets the wall at step 4 (free-tier boundary M2)

- **Claimed** 2026-09-12 · **Flips** 2026-10-12 by scheduled task, after the
  Coach-trust read (10-11) — it changes what that goal's first steps ARE ·
  **Read** 2026-11-02 (flip + 21 days).
- **Change** behind `goalWallEarly` (off): the interview-prep curriculum is
  reordered at read time (`withEarlyWall`, one resolver for the engine and
  the card): positions 1–2 unchanged, 3 = the free Hard preview (iv-5,
  challenge 23), 4 = a locked Hard (iv-7, challenge 71, Top-N per Category),
  then the rest in its original order; with `mockDoor` (M5) the free mock at
  5 and a Pro mock at 6. The locked-step card says which step is Pro and
  offers "Set aside for now" — `coachState.stepsSkipped`, which the engine
  passes over without counting (never progress, returns when removed);
  event `coach_step_skipped`. The registry file is untouched.
- **Why** measured 2026-09-12: the first locked step was 11 and the goal held
  no mock, so a first session — where every purchase has happened — never
  met the paid good. Of 79 interview-intent people, 39 reached six solves
  and were asked, **68 never opened a Hard challenge, 0 opened a mock**.
- **Metric** `goal_wall_early` (metrics.md): of people who start the
  interview-prep goal after the flip, the share who open a Hard challenge or
  a mock within 24h of the goal start; skip rate on the locked step;
  guardrail `coach_goal_to_step` for that goal.
- **Baseline** interview-intent people opening a Hard in 30 days: 11 of 79
  (14%); a mock: 0. Goal-holder baseline read at the flip from
  `coach_step_started` on the goal.
- **Target** ≥ 50% of new interview-prep goal holders open a Hard or a mock
  within 24h; ≥ 1 click on `coach_path` or `coach_mock` from them.
- **Falsification, stated in advance:** first-24h Hard/mock opens < 25% →
  the reorder did not reach them; read where they stop (step 1–2 solve
  rate) before touching the order. `coach_goal_to_step` for the goal falls
  below its no-flag arm by > 10 points → the wall is costing the step, revert.
  Fewer than 40 goal starters by 11-02 → UNREADABLE, extend to 11-23.
- **What this must not become** a wall with no way past: the skip is by
  test, and a skipped step is never credited. Nor a change to the other two
  goals — same reference, by test.
- **Confounds** the intake flip (09-16) hands this goal to intake-goal
  holders (`coachState.source='intake'`); split on source. M5 ships with it
  — same surface, same read; the mock steps are read as their own line.
- **Verdict** **UNREADABLE — n too small, and will stay so** (read 2026-11-22, 09-26 → 11-21, bots out): **12** people started the interview-prep goal in eight weeks (the rule: fewer than 40 by 11-02 → extend to 11-23; at 1.5 a week, 40 is out of reach by any date). Of the 12, 2 opened a Hard or a mock within 24 h (17%), 0 used the skip. All goal picks in the window: fundamentals 18, analyst-day-one 12, interview-prep 12. The finding is the denominator: the goal path is not where people are; reads of the wall belong on the challenge list (the quota and the company set), where 141 and 40 people met it.

### the six-solve ask speaks to the deadline (free-tier boundary M3)

- **Claimed** 2026-09-12 · **Flips** 2026-10-06 by scheduled task, after the
  intake read (09-30) that gives it dates · **Read** 2026-11-24, joined to
  the `paywall_ask_efficiency` read (n is small — ~7 milestone clicks a
  month; a 21-day read would be UNREADABLE by construction).
- **Change** behind `deadlineOffer` (off): when the milestone modal fires
  for a person whose date — the intake's or the countdown card's, as
  `prepTarget.date` — is inside 45 days, the ask leads with the date ("12
  days to your interview.") and names what stands between them and it: the
  count of locked Hard challenges and the company's mock (or "a scored
  mock"). `pro_modal_shown` carries `deadline` and `daysOut` (the integer;
  the date never leaves). No date, past 45 days, or flag off: today's modal.
- **Why** every purchase was a first-session decision at 6–10 solves, two of
  them at this exact modal in 31 seconds and 7 minutes; the buyers were
  deadline-driven ("interview coming up"). The modal has never mentioned the
  deadline it is being bought for.
- **Metric** `deadline_offer_split` (metrics.md): milestone_solves clicks per
  person shown, split by `deadline` true/false, by `aid`. Mechanism check
  2026-10-20: `deadline=true` shows > 0.
- **Baseline** milestone_solves 30 days to 2026-09-12: 171 people shown, 7
  clicked (4.1%), 2 paid. With a date: structurally 0 before the intake.
- **Target** deadline arm ≥ 10% clicks per person shown at n ≥ 30 shown.
- **Falsification, stated in advance:** deadline arm ≤ the no-date arm at
  n ≥ 30 → the date is a marker, not a lever; revert the copy, keep the
  event. n < 30 by 11-24 → UNREADABLE; the intake is not producing dates,
  read its verdict first. Never widen the window past 45 days to get n.
- **Confounds** M4 (flips 09-29) removes low-value shows and raises clicks
  per shown mechanically — this reads milestone_solves only, which M4 never
  touches. The 09-29 copy fix on the modal ("50+ tutor calls a day" for
  "unlimited") lands before this flips.
- **Rescheduled 2026-09-16 by the founder** ("evet, 21 Eylül'e çek"): flips
  2026-09-21 in the same commit as `freeQuota`, no longer after the intake
  read. Why: one to three plan clicks a week — the two could not be read
  apart before the 10-09 checkpoint anyway, and interview-intent people
  click at 9.3% (4 / 43, 30 days to 09-15) against 0 / 81 for people with
  no intent, so the ask that names their date is the one to put in front of
  them first. Cost, accepted: the milestone ask at 10 solves now shares the
  stage with the quota wall — read `reason='milestone_solves'` only, and say
  in the verdict that `freeQuota` flipped the same minute. Mechanism check
  moves to 2026-10-05; the Read stays 2026-11-24. `mockDoor` did NOT move:
  it acts only inside `withEarlyWall`, i.e. with `goalWallEarly` on, and that
  stays 10-12 behind the Coach-trust read.
- **Verdict** _pending_

### quiet the asks that have never sold (free-tier boundary M4)

- **Claimed** 2026-09-12 · **Flips** 2026-09-29 by scheduled task, after the
  cold-start read (09-29) is written · **Read** 2026-10-13 (flip + 14 days).
- **Change** behind `quietEarlyAsks` (off): the streak modal
  (`milestone_streak`) never fires; a company Hard wall (`company_hard`) at
  three solves or fewer gets the free-preview catcher instead of the modal;
  a locked mock at three solves or fewer opens the free mock instead
  (`interview_lock_nudged`, a toast). The lock rows are still written.
  Live from 2026-09-12 regardless of the flag: the locked-mock ask is stamped
  `interview_locked` instead of inheriting `generic` (metrics.md, reason
  discontinuity). User-initiated asks — the header button, the Coach strip —
  are untouched: they asked.
- **Why** measured 2026-09-12, 30 days: `milestone_streak` 13 people, 0
  clicks, none ever; `company_hard` 12 people at an average of 1.8 solves,
  1 click; `generic` at ≤3 solves 25 of 45 people, 0 clicks — most of them
  locked-mock clicks wearing the wrong label. Fifty people a month, no sale
  in the product's history from any of them, and the surface burns: 1.9
  shows per person, 43 people asked three or more times (60d to 09-08).
- **Metric** `early_ask_quiet` (metrics.md): `pro_modal_shown` per person
  shown, people shown 3+ times, and shows under the three quieted reasons;
  guardrail: `pro_plan_clicked` + `pro_checkout_clicked` people unchanged or
  up, and `interview_lock_nudged` → free-mock `interview_started` share.
- **Baseline** 380 shows / 203 people = 1.87 per person; quieted-reason
  people: 13 + 12 + ~25 = ~50 a month; clicks 10 people.
- **Target** ≤ 1.3 shows per person, people asked 3+ times < 10 a month,
  clicks per month ≥ 10; ≥ 40% of nudged mock clicks start the free mock.
- **Falsification, stated in advance:** clicks per month fall below 7 → one
  of the quieted asks was selling after all; read which reason's clicks
  vanished and restore that one only. Nudged-to-free-mock starts < 20% →
  the nudge is a dismissal, not a door; replace it with the plain ask.
- **Confounds** M1 (10-14) changes the company wall; this reads to 10-13.
  Fewer shows raise every "per shown" ratio mechanically — the guardrail is
  absolute clicks, never a rate.
- **Verdict** **NOT FLIPPED — nothing to read** (checked 2026-11-22): `quietEarlyAsks` is still `false` on main; the flag queue (docs/agent/flag-queue.md, row 9) holds it as `needs Go`. The read date above is void; a new one is set on the day it flips.

### the mocks get a door (free-tier boundary M5)

- **Claimed** 2026-09-12 · **Flips** 2026-10-12 with M2 (it is M2's steps
  5–6) · **Read** 2026-11-02, as its own line in the M2 read.
- **Change** behind `mockDoor` (off, read only when `goalWallEarly` is on):
  the free mock (`sql-fundamentals-free`) becomes step 5 of interview-prep
  and a Pro mock step 6 — the company the person named, when it has a mock,
  else the generic `top-10-most-asked`; never a company nobody typed. A
  curriculum mock step completes on a sitting (`interviewHistory` after the
  goal start), starts through `startInterview` — the one gate — and never
  spends the Coach's once-per-session offer flag. The company wall (M1) names
  the company's mock. Engine: `isStepComplete` for `mock_interview`.
- **Why** the Interview tab was reached by 3 people in 30 days; 0 of 79
  interview-intent people opened a mock. "Full mock interview bank" has been
  a bullet on a modal nobody could find the door to.
- **Metric** `goal_wall_early` mock line: interview-prep goal holders who
  start the free mock within 7 days of the goal start; `coach_mock` clicks;
  `interview_reach` for the goal's holders.
- **Baseline** interview-intent people opening a mock: 0 of 79 (30d).
- **Target** ≥ 30% of new goal holders sit the free mock within 7 days.
- **Falsification, stated in advance:** < 10% start it → a mock is not what
  a step-5 person wants; move it to the end of Phase B and keep the door on
  the company wall only. `coach_mock` dismissed with no skip and no start by
  > 60% → the Pro mock step is a dead end; drop step 6, keep step 5.
- **Confounds** the `interviewCountdown` flag (off) owns the synthetic
  offer; its once-per-session flag is untouched by curriculum mocks, by
  test. Intent routing (09-13) opens the Interview tab to hiring-intent
  people — a second door in the same window; split mock starts by
  `coach_step_started type=mock_interview` vs the tab.
- **Verdict** **UNREADABLE** with M2 (read 2026-11-22): 1 of the 12 interview-prep goal starters sat the free mock within 7 days. Same denominator problem as M2.

### the Coach stops asking twice: a first-run placement is a placement

- **Claimed** 2026-09-12 · **Flips** 2026-09-27 by scheduled task, after the
  Coach page read (09-26) and only if that claim was not extended · **Read**
  2026-10-11 (flip + 14 days).
- **Change** behind `coachTrustQuizPlacement` (off): a Coach goal started by
  someone the first run already placed — the four-question quiz or a level
  picked by hand — no longer gets the Coach's own five-challenge placement
  check. At both goal doors (the Coach picker, the onboarding intake) the
  first-run record is read and the placement is written `skipped: true,
  skippedBy: 'first_run_quiz'`; a goal that already holds a pending check
  when the quiz completes is marked the same way. The tier becomes **seed
  floors** that only the engine's `skipIf` clauses see
  (`src/utils/coach.js` `applySeedFloors`): Foundations none; Intermediate
  Querying Basics 70; Advanced + Aggregation 60, Joins 60; Interview-ready
  70/70/70 and 60 on Conditional Logic, Subqueries & CTEs, Window Functions
  — exactly the goals' own thresholds (no goal skips on NULL Handling, so no
  floor there), so a tier skips the
  intro lessons on what it evidences and nothing more. The radar keeps
  showing what was measured, graduation reads the radar, challenges still
  gate, and "Retake placement" on the Coach still works. Event
  `coach_placement_skipped {by, level, tier, goalId, at: goal_start |
  placement, placementSource}`. Pure half `src/utils/placement.js`;
  engine tests in `tests/placement.test.js` (floors pass a skipIf lesson,
  never a goal, never write the radar).
- **Why** measured 2026-09-12 on the users table: **102 goal starters were
  handed the placement check. 50 never attempted one of its five
  challenges, 43 stopped inside it, 4 finished it, 5 skipped it — and 4 of
  the 102 ever completed a curriculum step.** The placement check is where
  the Coach loses cold goal-starters, and from 09-16 the onboarding intake
  hands a Coach goal to every new person who answers it, all cold, all at
  this wall, minutes after they have just answered the first-run quiz that
  exists to place them. Asking twice is the product not trusting its own
  question.
- **Metric** `coach_goal_to_step` (docs/agent/metrics.md): of people who
  start a Coach goal (`coachState.startedAt` after the flip), the share with
  at least one curriculum step completed within 14 days; mechanism
  `coach_step_started` with `type ≠ placement_check` within 7 days of the
  goal start, and `coach_placement_skipped` volume against goal starts.
  Guardrail: the first Coach challenge step's solve rate within 24h
  (`coach_step_started type=challenge` → `challenge_solved` same id), split
  by whether the goal holds seed floors — a floor that sends someone to a
  step they cannot do would show here first.
- **Baseline** 4 of 102 (3.9%) all-time, 4 of 82 since 2026-07-01.
  `coach_placement_skipped` is structurally 0 until the flip.
- **Target** ≥ **25%** of goal starters complete a curriculum step within
  14 days, at n ≥ 60 goal starters; first-step solve rate with floors
  ≥ **50%**.
- **Falsification, stated in advance:** < 10% → the placement check was not
  the wall, the first curriculum step is; read which step people stall on
  before touching anything else. 10–25% → inconclusive, extend to
  2026-10-25, change nothing. First-step solve rate with floors < 35% while
  the no-floor arm is above 50% → the floors are too generous; drop the
  Advanced and Interview-ready floors to the gte-60 thresholds only, keep
  the skip. Fewer than 60 goal starters by 10-11 → the intake is not
  producing goals; read its 09-30 verdict before this one.
- **What this must not become** a fabricated radar: floors never write
  `weaknessTracking`, by test, and never enter `isGoalGraduated`. Nor a
  removal of the Coach placement for everyone — a warm-account goal-picker
  with no first-run record still gets the Coach's own check, unchanged.
- **Confounds** the Coach page claim (reads 09-26) measures the take rate
  of the full-shell Coach split by first-step type; this changes what the
  first step IS for quiz-placed people, hence the flip after that read. The
  intake (09-16) supplies the population and is read on 09-30 on the start
  screen, not here. Adaptive placement (10-01) changes which tier the quiz
  assigns to a 4/4 — the floors follow the tier, so from 10-01 the
  Interview-ready floors appear; note it in the read.
- **Verdict** **NOT FLIPPED — nothing to read** (checked 2026-11-22): `coachTrustQuizPlacement` is still `false` on main; the flag queue (docs/agent/flag-queue.md, row 3) holds it as `queued`. The read date above is void; a new one is set on the day it flips.

### adaptive placement: interview-ready is earned on a second round, not declared

- **Claimed** 2026-09-12 · **Flips** 2026-10-01 by scheduled task, after the
  intake read (09-30) and only if that claim was not extended · **Read**
  2026-10-15 (flip + 14 days), extend to 10-22 if the interview-ready arm has
  not reached n ≥ 30.
- **Change** behind `adaptivePlacement` (off): a full score on the four
  recognition questions opens a **second round of four** — a window function
  (RANK OVER), a CTE, a NULL comparison (`<> 5` drops the NULLs), the
  anti-join (LEFT JOIN … IS NULL) — and only a pass there (3 of 4) places
  someone on the interview-ready track (`foundations-advanced`, opener
  challenge 1, unchanged). Everyone else lands where the 08-14 cap put them:
  0–1 Foundations (`brand-new`), 2 Intermediate (`basics`), 3 or a failed
  round 2 Advanced (`working`, the 105 opener). Four tiers named on the four
  ids that already exist; the manual "I already know my level" list keeps
  every level and now shows the tier. With the flag off the quiz returns
  byte-for-byte what it returned before (`tests/placement.test.js` pins all
  five scores). Events either way: `placement_completed {source: quiz |
  manual, levelId, tier, score1, score2, round2}` — scores, never answers —
  and `placement_round2_started {score1}`. Pure half `src/utils/placement.js`;
  smoke step for both flag states. P0-2 on the founder's 2026-09-12 list.
- **Why** the 08-14 cap (ledger, Closed, HIT) was right and incomplete. It
  stopped a four-question recognition quiz from declaring people
  interview-ready — challenge 1 had been the front door for half of all first
  contacts and 75% never finished it — but it left the interview-ready track
  reachable only by self-declaration. Measured 08-14 → 09-11: **25 people
  declared it and 44.0% activated on challenge 1**, against 35.2% (n=261)
  when the quiz sent everyone there. A self-report is a weak instrument; four
  more recognition questions on the things an interview asks are a stronger
  one, and the people who pass them are the population the Capital One and
  interview-intent signals say we should be able to place well.
- **Metric** `first_contact_activation(1)` for the **quiz-placed** arm —
  people whose `placement_completed` carries `source='quiz'` and
  `tier='Interview-ready'`, joined by aid to their first contact — against
  the **self-declared** arm (`source='manual', levelId='advanced'`) in the
  same window: same seat, two doors. Mechanism: `placement_mix`
  (docs/agent/metrics.md) — the tier split of quiz completions and round-2
  completion among round-2 starters. Guardrail `first_run_reach` against
  the post-intake baseline the 09-30 read records.
- **Baseline** challenge 1 as opener, self-declared only, 08-14 → 09-11:
  **44.0%** (n=25). Quiz-placed arm structurally 0; the round-2 events are
  born at the flip. Tier mix before the flip: `placement_completed` fires
  from this deploy with the flag off, so the 10-01 flip has a two-week
  baseline of the four-question split.
- **Target** quiz-placed Interview-ready opener activation ≥ **60%** at
  n ≥ 30; round-2 completion ≥ **80%** of round-2 starters; `first_run_reach`
  within 3 points of its post-intake baseline.
- **Falsification, stated in advance:** quiz-placed ≤ **44%** (no better than
  a self-report) → the four recognition questions do not identify readiness
  either; restore the cap (round 2 stays as data, its pass no longer routes).
  44–60% → inconclusive, extend to 2026-10-29, change nothing. Round-2
  completion < 60% → the second round costs more than it tells; cut it to
  two questions or drop it, whatever the opener number says.
  `first_run_reach` down > 3 points → the quiz got longer for exactly the
  people most likely to leave; read next to round-2 completion before
  blaming the opener.
- **What this must not become** a third swap of the 'working' opener (its
  own claim closed 09-13; the seat is untouched here) or a reopening of the
  cap by the back door: a 4/4 still lands on 105 unless round 2 says
  otherwise, by test.
- **Confounds** the onboarding intake (flips 09-16, reads 09-30) sits on the
  same start screen — the flips are sequential by design and the intake read
  closes first. The 'working' seat loses its 4/4-then-pass people to the
  interview-ready track from 10-01, so 105's activation can drift down for a
  mix reason after its claim has closed; say so if anyone re-reads it. The
  Coach's own five-challenge placement (`COACH_PLACEMENT_CHALLENGE_IDS`) is
  a different instrument and is untouched.
- **Verdict** **NOT FLIPPED — nothing to read** (checked 2026-11-22): `adaptivePlacement` is still `false` on main; the flag queue (docs/agent/flag-queue.md, row 12) holds it as `needs Go`. The read date above is void; a new one is set on the day it flips.

### onboarding intake: three optional questions before the quiz

- **Claimed** 2026-09-12 · **Flips** 2026-09-16 by scheduled task, after the
  105 verdict and only if that claim was not extended · **Read** 2026-09-30
  (flip + 14 days; ~28 first-run viewers a day, so n ≈ 390).
- **Change** three OPTIONAL questions in front of the placement quiz, for
  first-run users on the Learning Path tab, behind `onboardingIntake` (off):
  what brings you here (an interview / job-ready / SQL in general), by when
  (a date), and what you do (six fixed roles). Every step has a skip; skipping
  all three is a completed intake and nobody is asked twice. Each answer lands
  in the store that already owns it — the goal writes the intent key the
  post-solve ask writes (`sqlquest_user_intent`, so the Interview door and
  every event's `intent` stamp agree) and the Coach goal it maps to
  (`interview-prep` / `analyst-day-one` / `fundamentals`), stamped
  `coachState.source = 'intake'`; the date goes to `prepTarget.date`, the
  countdown card's own store, and is shown back as "🗓 N days left" on the
  Coach radar panel; the role goes to `userGoals.role` as a key. A skipped
  goal still gets the one-question ask after the first solve, as today; an
  answered one gets the same `applyIntentRouting` the modal would apply, at
  the same moment — after the first solve, never before it, and tagged
  `source='intake'`. Pure half `src/utils/onboarding-intake.js`, 40 tests
  and source guards in `tests/onboarding-intake.test.js`, smoke step in
  `scripts/smoke-test.js`. P0-1 on the founder's 2026-09-12 list; the goal is
  optional by the founder's instruction.
- **Why** the goal was collected in three places and none of them before the
  quiz (the post-solve ask, the Coach picker, the mentor chat — dead
  `FIRST_RUN_GOALS` sat next to the quiz and rendered nowhere); the date
  existed only behind `interviewCountdown`; the role was free text from a
  chat. Of the people who answer the post-solve ask, 73% declare a hiring or
  learning intent (60 days to 09-12: interview 98, job_ready 98, learning 83,
  "just exploring" 103 people), and the product asks them only after they
  have already been routed by a quiz that knows nothing about it. The
  landing pages promise a Coach that knows the goal; P0-4 made the Coach page
  show one; this is where it comes from for a new person.
- **Metric** `intake_funnel` (docs/agent/metrics.md): of the people shown the
  intake, the share who answer the goal (not skipped), the date, the role,
  and who complete it. **Guardrail** `first_run_reach`: of first-run shell
  viewers (`coach_tab_viewed shell='first_run'`, first per aid), the share
  with a `first_challenge_started` within 24h — the intake sits exactly on
  this stretch. Second guardrail `cold_first_solve_rate`, both arms, split at
  the flip timestamp.
- **Baseline** `first_run_reach` **56.7%** (444 of 783 first-run viewers, 28
  days to 2026-09-12; 30.9% solve within 24h; 217 viewers in the last 7).
  The intake events are structurally 0 until the flip; the flip's deploy
  timestamp is their birth.
- **Target** (i) ≥ **50%** of people shown the intake answer the goal, at
  n ≥ 150 shown; (ii) `first_run_reach` in the 14 days after the flip
  ≥ **52%** (baseline − 5 points) at n ≥ 300 viewers.
- **Falsification, stated in advance:** goal answered < 30% → the question
  is not wanted at the door; move the ask back to after the first solve (the
  modal exists) and keep the record format. `first_run_reach` < 47% (−10)
  while the warm arm of `cold_first_solve_rate` is flat → the intake costs
  first contacts; take it off the start screen the same day, whatever the
  answer rate. 47–52% → inconclusive, extend to 2026-10-14, change nothing.
  Both conditions met → keep; the next question is whether an intake goal
  changes what people do after the first solve (Interview-tab reach by
  `reason='intent'`), which is the 10-13 intentRouting read's to answer.
- **Guardrails, and what this must not be used for** the goal is never a
  step toward checkout — the block renders nothing about Pro, by test — and
  an intake-mapped Coach goal is not a chosen one: the 11-24 goal split
  under `paywall_ask_efficiency` must exclude `coachState.source='intake'`,
  or the "every payer had set a goal" marker is manufactured exactly the way
  the goal-setting entry below warns against. `goal_selected` /
  `goal_picker_shown` are untouched (the intake fires neither), so the Coach
  page claim's picker secondary keeps its meaning; but from 09-16 that
  claim's denominator (full shell, hasGoal) gains intake goals —
  `coach_tab_viewed` now carries `goalSource`, split on it. 105's seat is
  after the intake and its activation is per opener, so it cannot move for
  a reason that lives here; `first_contact_share` can, if fewer people reach
  any opener — that is what `first_run_reach` is for.
- **Confounds** flips after `intentRouting` — which went on at
  2026-09-15T22:18Z, not 09-13 as first written here (that task stalled) —
  and both feed the Interview tab: separated by `intent_routed.source`
  ('ask' / 'intake') and `interview_tab_viewed.reason`; the intentRouting
  read (now 2026-10-16) must split by source. The intake itself waits for
  the 105 read, extended to 2026-09-20; it is scheduled for 2026-09-21
  14:00 Istanbul. The 09-29 cold-start read is untouched by construction: a
  deep-linked challenge opener never sees the start screen, and the
  cold-start dialog is unchanged. Guest continuity (09-26): an intake record
  rides the guest blob into the account like any other field.
- **Amended 2026-09-17 — the goal is required from the flip.** By the
  founder's directive of 09-17 ("hedefsiz adam istemiyoruz": ask the goal
  at once, measure where they stand on it, plan it, monetise along the plan)
  the goal step has no skip when this flips on 09-21; date, role, company
  and level stay skippable; a record cannot exist without a goal
  (`buildIntakeRecord` returns null; `tests/onboarding-intake.test.js`).
  Target (i) above is therefore answered by construction — the goal answer
  rate is 100% of completers — and the read moves to `first_run_reach`,
  which now measures **the cost of a required question**, not of an
  optional one: a fall there is people who left rather than name a goal.
  The falsification stands as written (−10 → off the start screen the same
  day); the "goal answered < 30%" arm is void, replaced by the measure's own
  entry ("the goal is asked, measured and planned before the first solve"),
  which makes the required goal skippable again if `first_run_reach` falls
  more than 15 points.
- **Verdict** **NOT FLIPPED — nothing to read** (checked 2026-11-22): `onboardingIntake` is still `false` on main; the flag queue (docs/agent/flag-queue.md, row 6) holds it as `queued`. The read date above is void; a new one is set on the day it flips.

### the Coach page shows the goal, the step, the challenge and the radar

- **Claimed** 2026-09-12 · **Read** 2026-09-26 (14 days).
- **Change** the full-shell Coach now carries what the landing mockup
  (`scripts/coach-mock-snippet.html`, embedded in `/after-the-sql-course/`
  and `/after-bootcamp/`) has promised since 09-07: a **step counter** ("Step
  N of M", exact for curriculum steps, absent for the synthetic placement /
  preview / mock steps); the next step **named** — the challenge or lesson
  title, a difficulty chip, up to three topic chips and the bank's own
  `xpReward` — where the card used to say "Challenge"; an **up next** line
  showing the following curriculum step, display only; and a **9-axis radar
  panel** with archetype, overall, weakest three, streak, solves and XP, read
  from `weaknessTracking.skillLevels` (already computed on every solve —
  nothing calls the expensive recompute; 1,179 people render this tab). The
  mockup's invented "~4 min" became the XP chip the live card actually shows.
  **Display only:** the engine call, `handleCoachStepStart`, the hard-preview
  stamping (`openedFrom='preview_coach'`) and the locked-step branch are
  untouched, and `tests/coach-page.test.js` fails the build if any of them
  move. P0-4 on the founder's 2026-09-12 list.
- **Why** the ad showed a product the tab did not have. Live before this: a
  typed card, a percentage, no counter, no name, and no radar anywhere in the
  shipped app except Profile → Skills (the header mini-radar sits inside the
  dead legacy nav and never renders). Measured over the 14 days to 09-12:
  **25 people saw the full Coach with a goal** (68 viewer-days); **16 (64%)
  opened a challenge or lesson the same day** — a proxy, because the click on
  the card itself was never recorded.
- **Metric** `coach_page_take_rate` (docs/agent/metrics.md): people with
  `coach_step_started` ÷ people with `coach_tab_viewed` shell=full,
  hasGoal=true, same day. Secondary: `goal_selected` ÷ `goal_picker_shown`,
  which this change does not touch — a move there is mix or the radar
  changing picker behaviour, and either way is to be said, not banked.
- **Baseline** the event is structural 0; the proxy is 16/25 = 64%.
- **Target** ≥ **60%** of full-with-goal viewers take the card's step the
  same day, at n ≥ 20 viewers. Below 20, UNREADABLE, extend.
- **Guardrails** `preview_open_to_solve` (09-20 read) keeps its mechanism:
  the preview offer is still the only path that stamps `preview_coach`. The
  first-run shell is untouched, so `first_contact_activation` cannot move.
- **Falsification, stated in advance:** < 40% → naming the step is not what
  was missing; the card is not what people take even when it says what it
  is, and the next move is the first-run shell (where most Coach viewers
  are), not more of this. 40–60% → inconclusive, extend to 2026-10-10,
  change nothing. Picker conversion moves ≥ 10 points either way → say so
  and read the radar's effect on goal choice before crediting anything.
- **Confounds** ships the evening before the 105 read (full shell only; the
  first-run shell is the read's surface and is untouched). `intentRouting`
  flips 09-13 on the same returning population. The countdown card
  (`interviewCountdown`, after 09-20) will render on this tab below the
  radar panel; that is its own claim. **Added 2026-09-12:** the onboarding
  intake (above) flips 09-16 and maps a Coach goal for new people who answer
  it, so from that day the full-with-goal denominator holds goals nobody
  chose on the picker; `coach_tab_viewed` carries `goalSource` — read the
  picker goals and the intake goals as two rows. A date set at the intake
  also adds a small "days left" chip to the radar panel's stats line.
  **Added 2026-09-12 (evening):** "the Coach stops asking twice" (above)
  flips 09-27, the day after this read closes, and changes what the first
  step is for quiz-placed people; nothing about it is live during this
  window.
- **Verdict** **MISS — the falsification fired** (B2, read 2026-11-22 over 09-12 20:00Z → 09-26): **34** people viewed the full Coach with a goal; **7 started the card's step the same day (20.6%)** against ≥ 60% and the 40% line (the 64% baseline was a proxy — any challenge or lesson that day — not the card's own event). As written: naming the step was not what was missing; the next move is the first-run shell, not more of this card — which is where the work went (the first screen is a challenge for everyone from 11-22). Picker conversion not re-read.

### anonymous progress survives the reload and follows the login

- **Claimed** 2026-09-12 · **Read** 2026-09-26 (14 days), and the 30-day
  returning-solver number again at the O1 day-30 read on 2026-10-09.
- **Change** three things, one module. A browser keeps one guest identity
  (`localStorage.sqlquest_guest_user`); `startGuestMode` resumes it from the
  LOCAL blob when it holds progress and was active in the last 90 days,
  else mints a fresh one. Login folds the guest blob into the account before
  the session loads (`mergeGuestIntoAccount` → `src/utils/progress-merge.js`,
  a pure union: the account wins identity, money and every scalar it holds;
  collections union; XP only for solves the account did not have; idempotent).
  The auth-modal register path carries the blob the same way — until now it
  wrote `xp: 0, solvedChallenges: []` and lost every solve; only the
  post-solve prompt carried progress. Events: `guest_resumed`,
  `guest_progress_merged`, `signup_completed.carriedSolves`. 22 unit tests
  and source guards in `tests/progress-merge.test.js`. Verified in the local
  preview: solve 91 as a fresh guest, reload `/app/` plainly → same
  `guest_*` name, 210 XP in the header, the solve kept, no quiz.
- **Why** every page load minted `guest_<Date.now()>` and reset the state
  (objectives.md: 4,989 guest rows that were page loads, not people), and
  `loadUserSession` replaced state wholesale on login, discarding whatever a
  guest had in hand. Measured 2026-09-12 over 30 days, people by `aid` with
  `isGuest=true`: **265 guests solved at least one challenge; 30 of them
  solved on two or more distinct days, 9 on three or more** — every one of
  those returns started from the placement quiz with zero solves. P0-3 on
  the founder's 2026-09-12 list; the only item on it with no read-calendar
  conflict.
- **Metric** `guest_continuity` (docs/agent/metrics.md): `resumed_people`,
  `merges_with_solves`, `signups_carrying_solves` since the deploy; and the
  30-day count of guests solving on 2+ distinct days, which is the number
  this should move.
- **Baseline** structural 0 for the three events. Returning guest solvers:
  **30 / 30 days** (2+ days), 9 (3+ days).
- **Target** by 09-26: `resumed_people` ≥ **30** in 14 days (returning
  browsers with progress, whether or not they solve again), and
  `merges_with_solves + signups_carrying_solves` ≥ **5**. By 10-09: guests
  solving on 2+ distinct days ≥ **45 / 30 days** (from 30).
- **Guardrails** `first_contact_activation` must not move — structurally it
  cannot (a first contact is an aid's first open, which a resumed browser
  already had; noted on the 105 claim as confound iii). The 09-19 "users
  writes restored" read counts rows, not fields; the register path still
  writes one row.
- **Falsification, stated in advance:** `resumed_people` < 10 in 14 days →
  the returning population was smaller than the row count implied and the
  rows were bounces; keep the change on correctness grounds (a reload must
  not erase work) and stop expecting a retention effect from it. 2+-day
  solvers flat at 10-09 with resumes ≥ 30 → keeping progress does not bring
  people back to solve; the return is driven by something upstream (email,
  habit), not by state. Any `guest_progress_merged` with `newSolves` > 0
  followed by a login whose record lacks those solves → the force-save is
  not landing; read `postgres_logs` before anything else.
- **Confounds** ships the evening before the 105 read closes (returning
  browsers only; first contacts untouched by construction). The 09-13
  `intentRouting` flip lands the next day on the same returning population;
  `guest_resumed` is not conditioned on intent, so the two are separable by
  `intent_captured`.
- **Verdict** **HIT on continuity, MISS on multi-day guest solvers — confounded** (read 2026-11-22, 30 days): 95 people resumed (target ≥ 30 in 14 days), 2 merges + 14 sign-ups carrying solves (target ≥ 5 together). Guests solving on 2+ distinct days: **17 / 30 days** (baseline 30, target 45) — but since 09-26 the free quota stops a guest at ten solves and from 11-22 the account ask moves to the third (#98), both pulling multi-day solvers out of the guest pool; the number now measures the quota, not continuity. (`guest_resumed.solvedCount` was 0 on every row until #93.)

### users writes restored: the referral trigger blocked every registered save for four days — **HIT** (7-day read; day-30 line HIT 2026-11-22)

- **Claimed** 2026-09-12 · **Read** 2026-09-19 (seven days of restored
  writes), and again inside the O1 day-30 read on 2026-10-09.
- **What broke** `20260908b_referral_codes_are_assigned.sql` was applied
  2026-09-08 08:53:32Z. Its last lines revoke EXECUTE on `gen_ref_code()`
  from `anon`, and it installs a SECURITY INVOKER `BEFORE INSERT` trigger on
  `public.users` that calls that function. Every client save is a PostgREST
  upsert sent with the anon key; upserts fire BEFORE INSERT triggers; so
  every non-guest write failed with `permission denied for function
  gen_ref_code` — 1,103 times on 09-08, 40–115 an hour every hour since.
  Guests skip the loop, so guest rows kept flowing and the tables looked
  like a quiet week. Reproduced 2026-09-12 with a rolled-back insert as
  `anon`: `users_assign_ref_code() line 9 at assignment`.
- **Blast radius, measured 2026-09-12 10:40Z** last successful registered
  write 2026-09-08 08:53:26 — six seconds before the first failure. Since
  then 0 registered rows created or updated. 36 people completed the signup
  form and were told "Your XP, streak, and solves are saved to your account"
  with no row written: `supabaseFetch` returns `null` on a 403, and
  `_flushCloudSave` read `null` as success, so `saveUserData({ force: true })`
  — whose contract is "throws on failure" — resolved. 57 registered accounts
  were active, 27 of them solving; none of it reached the cloud. 12 logins.
  0 purchases in the window against ~0.3 expected at the 30-day rate, so
  money is not readable here.
- **Change** database:
  `20260912100000_ref_code_trigger_must_not_block_user_writes.sql` — grant
  `anon` EXECUTE on the generator, make the trigger SECURITY DEFINER, and
  wrap its loop so any failure yields a row with a null code instead of no
  row. Applied by the founder with `supabase db query --linked -f …` (the
  agent's write was stopped by the permission classifier; the agent wrote
  the file and the probe). Client, same day: `supabaseFetch` gains
  `throwOnError`, `_flushCloudSave` passes it so a rejected write comes back
  as `{ ok: false }`; `created_at` is dropped from the upsert payload
  (merge-duplicates was overwriting it on every save). Guard:
  `tests/cloud-save-contract.test.js`.
- **Metric** two daily counts, internal accounts excluded: registered rows
  whose `updated_at` falls on the day (`users`, `username not like
  'guest%'`), and people completing signup who have a `users` row within
  five minutes (`signup_completed` by aid, joined to `users` on the
  `newUsername` in metadata).
- **Baseline** 09-09..09-12: 0 and 0 per day. The week before the break,
  09-01..09-07: 4–17 registered rows/day, 5–9 signups/day.
- **Target** within one hour of apply, a registered `updated_at` newer than
  the apply time exists. By 09-19, ≥8 registered rows/day and ≥5 signups/day
  with rows — back inside the pre-break band.
- **Applied 2026-09-12 ~10:58:30Z** by the founder. Verified within minutes:
  the `anon` probe now reaches its own RAISE (the insert passes the trigger;
  no probe row left behind); `gen_ref_code` ACL carries `anon=X`;
  `users_assign_ref_code` is SECURITY DEFINER with `search_path=public`; the
  last `permission denied` in `postgres_logs` is 10:58:12Z after 202 in the
  preceding two hours; the first registered write in four days landed at
  10:58:46Z, 34 seconds after the last error. The first-hour target is met.
- **Falsification** still 0 an hour after apply → the fix is insufficient;
  look at RLS on `users` and the postgres error log before anything else.
  Signups-with-rows under 3/day across the week → a client path is still
  lying; read `feedback` verbatims and `postgres_logs` severity ERROR before
  touching paywall or traffic work.
- **Recovery** automatic for anyone who returns on the same browser: the
  client sends the whole `data` blob, so the next save re-creates or catches
  up the row. Anyone who signed up on one device and logged in on another
  has no account, and the 36 cannot be written to — no row, no email.
- **Effect on other reads** the 09-13 105-opener read uses `pro_events`
  only and is unaffected. O1's day-0 baseline (2026-09-09) was measured
  inside the outage; treat 09-08 08:53Z → apply as a hole in the signups
  column at the day-30 read, and say so there.
- **Verdict, 2026-09-19 (seven days) — HIT.** Read with the two counts
  above, internal excluded (`users` directly; the read-only MCP).
  - Signups completing with a `users` row within five minutes: **09-13 5/5,
    09-14 10/10, 09-15 6/6, 09-16 10/11, 09-17 7/7, 09-18 5/5** — 43 of 44,
    every day ≥ 5, against the target ≥ 5/day and the falsification < 3/day.
    Before the fix, 09-08..09-11: 0 of 68.
  - Registered rows written per day: **09-13 6, 09-14 5, 09-15 55, 09-16 12,
    09-17 8, 09-18 21.** Four of six days clear the ≥ 8 line; the two that do
    not are the first weekend after the fix (Sat/Sun) and both sit inside the
    pre-break band (4–17). 09-15's 55 is not traffic: it is the founder's
    run of `20260914_pro_without_payment.sql`, which rewrote the plan fields
    on the 57 flagged accounts and bumped `updated_at`. Excluding it the band
    is 5–21, i.e. the week before the break.
  - Recovery of the 68 outage signups: 4 have a row today (1 from 09-08, 3
    from 09-11 — same-browser returns). 64 accounts were never created; no
    row, no email, nothing to write to. Carry this as the hole in the O1
    day-30 signups column (2026-10-09), as the entry says.
  - Postgres error log: no `permission denied for function gen_ref_code`
    since 2026-09-12 10:58:12Z.

- **Day-30 line** **HIT** (read 2026-11-22, late against the 10-09 date): registered rows written every week since, never a zero week — 26 / 31 / 21 / 18 / 29 in the five weeks from 10-19 (guest rows 241–585 a week); `postgres_logs` over the last 24 hours holds no ERROR and no `permission denied` row. The outage did not come back.

### validate AI-generated SQL: a non-brand answer door with a practice handoff

- **Claimed** 2026-09-09. The page is new, so its baseline is zero by
  construction. In GSC's 90-day exact-query filter, `validate ai generated
  sql` had **0 impressions and 0 clicks** before publication.
- **Change** publish `/blog/validate-ai-generated-sql/`: a seven-check,
  source-backed workflow with three SQLite-tested queries, one named practice
  handoff repeated at the worked example and close, three contextual SQLQuest
  links, and one tracked,
  editorial SQLQuest → ClaudeQuest link. `/blog/` and
  `/sql-for-the-ai-era/` link back to it in the same change.
- **Why** 81% of search clicks were still branded at the 2026-09-08 traffic
  read. This page answers a task-shaped, non-brand query close to the product's
  actual value: detecting when plausible SQL is wrong. It is a search and GEO
  door first, not a claim that editorial traffic will convert like practice
  traffic.
- **Metric** GSC impressions and clicks for the page/query cluster, plus
  `blog_practice_exit` for attributed app opens and first solves. Identity and
  exclusions follow that metric's existing definition. The practice events are
  `cta_practice_validate_ai_sql_mid` and
  `cta_practice_validate_ai_sql_end`; the CTA source is
  `validate-ai-generated-sql`; the cross-product event is
  `editorial_claudequest_click`.
- **Index check** 2026-09-16. Not indexed means a discovery/distribution
  failure, not a content verdict.
- **Read date** 2026-10-07, 28 days after publication.
- **Target and falsification:**
  - **0 non-brand impressions** by day 28 → acquisition/query hypothesis
    falsified. Do not clone or translate the page.
  - **1–29 impressions** → `UNREADABLE`; reread on day 56.
  - **≥30 impressions** → read CTR, average position and actual query match.
  - Once **≥30 attributed app opens** exist, **<5% first-solve** means the
    handoff failed; **≥9%** holds the existing editorial baseline.
  - **Amended 2026-09-09, before any data exists**, because the band between
    those two numbers had no verdict and a 7% result would have left the claim
    unresolved. **5–9% → the handoff works and is no better than the blog
    average.** In that case the page keeps its place on search and GEO grounds
    alone; do not cite it as evidence that editorial traffic converts, and do
    not build the next two articles on that premise.
  - **Expect `UNREADABLE` on the handoff side at the 10-07 read.** Every post
    under `/blog/` together produced **46 arrivals in 90 days** (measured
    2026-09-09, `door_solve_rate` by arrival door). One article reaching 30
    attributed app opens in 28 days would be roughly twice the entire blog's
    current rate. The impressions side already has its 1–29 → UNREADABLE rule;
    the solve-rate side needs the same discipline, so do not read a 3-of-11 as
    a percentage.
  - A verified AI citation or an `ai:*` arrival is a separate GEO success
    signal. It does not replace GSC evidence.
- **Risk if wrong** is bounded: one new article, two internal discovery links,
  and one contextual cross-product link. Removal is a page-and-links revert;
  no product or paywall behavior changes.
- Full publication decisions and checks:
  `docs/reads/validate-ai-sql-publish-decisions-2026-09-09.md`.
- **Verdict** **HIT on search, UNREADABLE on the handoff** (B2, read 2026-11-22): GSC page slice to 10-07 (day 28): **128 impressions, 7 clicks (5.5%), position 6.0** — the ≥ 30 band; the page keeps its place on search grounds. Last 28 days: 469 impressions, 4 clicks, position 3.6. Handoff: 14 people opened the app with this page as source over its whole life — under the 30-open floor, so no solve rate is read, as the claim expected. `cta_practice_validate_ai_sql_*` and `editorial_claudequest_click` have **no row ever** although app opens from the page exist: the CTA events are not firing. Query match not read here (C1 / C2).

### blog posts get a real exit: one named challenge, at the moment the idea lands

- **Claimed** 2026-09-08 — built and tested; ships with the next static-page
  deploy. No flag: it is HTML on 21 pages, live the moment `public/` publishes.
  The deploy timestamp dates every event here.
- **Change** every post under `src/blog/` now ends its core idea with a link to
  **one named challenge that exercises exactly what the post just taught**, and
  repeats it in the closing card with a single secondary "keep going" link (a
  topic page, the `/challenges/` hub, or the matching track). Two exits per
  post, no more. Ten short posts already had a specific-challenge link before
  the FAQ tail — those kept their position, gained a unique `data-track`, and
  three had their challenge corrected (`where-vs-having` pointed at GROUP BY
  Basics, which contains no HAVING; `sql-anti-join` and
  `row-number-vs-rank-vs-dense-rank` pointed at challenges one rung off their
  subject). Eleven long posts had **no** specific exit at all and now have two.
  Nothing any post teaches was changed; no price is quoted; no challenge count
  was added anywhere `tests/site-counts.test.js` binds.
- **Why** the practice pages convert five to twenty-five times better than the
  posts, and the difference is what the reader is handed at the end. Measured
  2026-09-08 over 30 days: `sql-exercises` 360 visitors → 94 solved (26.1%),
  `sql-interview-prep` 25.0%, `learn-sql` 21.4% — against
  `blog/faang-sql-interview-guide` 8.3%, `blog/sql-for-fraud-analytics` 5.0%,
  `blog/sql-cte-tutorial` 3.8%, `blog/null-handling-mistakes` **0.0%**.
  `door_solve_rate` reads the same thing from the app side: blog brought 37
  arrivals in 28 days and 5% of them solved. The posts rank and bring readers;
  a reader who has just understood one idea was being handed a homepage.
- **Metric** `blog_practice_exit` (docs/agent/metrics.md), distinct people by
  `COALESCE(aid, username)`. **Baseline**, the four posts above, 30 days to
  2026-09-08: **171 readers, 8 solved, 4.7%**; `took_an_exit` is **0 by
  construction** — the events are born with this change.
- **Read date 2026-10-08**, over the 30 days from the deploy.
- **Target.** Three rungs, in order:
  1. **≥ 40 `cta_practice_*` clicks from ≥ 30 distinct browsers** across all 21
     posts. A plumbing check, not a hypothesis: if it misses, the exits are not
     being seen and the finding is about placement, not about readers.
  2. **The four baseline posts, combined, ≥ 9% view-to-solve** — roughly 16 of
     ~170 rather than 8. Sized as a doubling of 4.7% that still lands at about a
     third of the practice pages' 25%, because a blog reader arrived to read and
     a `/sql-exercises/` visitor arrived to practise. Predicting parity would be
     predicting that the exit changes the intent, which it cannot.
  3. **≥ 6 people solve the specific challenge their post's exit points at**,
     within 7 days of the click, joined by `aid`. This is the rung that says the
     exit did the work rather than something else that moved in the same month.
- **Risk if it is wrong**: two extra links per post on 21 pages. The pages are
  otherwise unchanged, so a revert is a revert of this diff. The live risk is
  editorial, not technical — a post that reads like an ad break loses the
  readers it currently keeps. That is why the count is capped at two and why the
  mid exit is a single inline line, not a card.
- **Falsification, stated in advance:**
  - **≥ 40 clicks, view-to-solve inside noise of 4.7%** → the exit is not the
    bottleneck; the reader clicks, arrives inside a challenge, and stops there.
    The next move is the first thirty seconds in the editor, **not** a third
    exit and not louder copy. Verdict `FLAT` on rung 2 with rung 1 met.
  - **Fewer than 15 `cta_practice_*` clicks in 30 days across all 21 posts,
    while `landing_view` on those posts is unchanged and `cta_blog` — the nav
    button, deliberately untouched by this change — is also near zero** → **the
    exit was never the problem.** Two exits per post, one of them at the exact
    moment the idea lands, in front of several hundred readers, producing under
    fifteen clicks is not a placement failure: it is an audience that came for
    the answer, got it, and left. Pre-registered so that outcome cannot be
    re-described afterwards as "wrong wording" or "wrong challenge". The move
    then is to stop treating blog readers as a practice funnel — measure the
    blog on impressions and rankings, put the effort into the pages whose
    readers already arrive wanting to practise — and **not** to add a third
    exit.
  - **Under 15 clicks but `cta_blog` is healthy on the same pages** → the
    opposite reading: readers do click, just not these. That is placement or
    copy, and the exits move or get rewritten.
  - **The four posts' rate rises and their `landing_view` count rises with it**
    → a traffic-mix move. Blog traffic is search-driven and seasonal; check the
    per-page split and the query mix before crediting anything. `UNREADABLE` if
    the mix moved materially.
  - **Only `blog/sql-for-fraud-analytics` and
    `blog/capital-one-codesignal-data-analyst-assessment` move** → those two
    point into the `finans_fraud` card ledger, which has its own live claim and
    its own content shipping. Confounded; do not credit the exit.
  - **`content_lock_reached` rises on the `blog-recursive` door** → the one
    deliberately Pro exit (challenge 81, the only recursive CTE in the bank) is
    functioning as a wall. Repoint it at 179 regardless of every other number.
  - **Any post stays under ~30 readers in the window** → `UNREADABLE` for that
    post on its own; it is only readable inside the four-post total.

#### Cohort B — the comparison pages get the same exit

- **Added 2026-09-08**, the same day the claim above was made and before either
  cohort had produced a single event. This is an extension of an unread claim,
  not an edit to a measured one; nothing above was changed.
- **The two cohorts are read separately, and their numbers are never pooled.**
  A tutorial reader arrived to understand one idea; a comparison reader arrived
  to decide between products and is mid-decision when the exit appears. Same
  button, two different questions, and no reason to expect them to move
  together — so cohort A's rungs stay blog-only (`page LIKE 'blog/%'`) and
  cohort B has its own baseline, its own rungs and its own verdict. A
  `cta_practice_*` count taken with no page filter is now a mix of both and is
  a reading of neither.
- **Change** — six pages (`vs-datalemur`, `vs-stratascratch`, `vs-leetcode-sql`,
  `sql-practice-comparison`, plus the two siblings `vs-hackerrank-sql` and
  `best-sql-practice-sites`) each gained **one mid-page exit at the point the
  argument resolves** — after the wrong-answer code demo, after the "5 things"
  grid, after the decision tree, after the final verdict — and **one in the
  closing card**, plus a single secondary link to the topic page or hub that
  fits. Both exits on a page point at the **same named free challenge**; each
  carries its own `data-track`; each uses the page's **existing** `?src` door,
  so no new door series was invented. Purely additive: **66 lines inserted, 0
  deleted** across the six files. No competitor figure, no price, no count and
  no existing link was touched — including the four pre-existing untracked
  `/app/?src=` links, which are deliberately left as the control.
- **Page → challenge**, one line of reasoning each; all six free, all six
  distinct, none of them the target of a cohort-A exit so that "did anyone
  solve the challenge this page pointed at" stays attributable:
  `vs-datalemur` → **106** (its near-miss, `COUNT(*)` giving 1 where 0 is
  right, is the exact shape of the diagnostic this page demos);
  `vs-stratascratch` → **51** (a percentage-per-group question of the kind
  their Premium bank is bought for, free here, and its wrong answers —
  integer division, no rounding — are what a "here is the expected table"
  platform cannot explain); `vs-leetcode-sql` → **161** (LeetCode #185's shape,
  and RANK vs DENSE_RANK vs ROW_NUMBER is the tie-handling near-miss SQL
  specialisation can actually name); `sql-practice-comparison` → **144** (the
  quickest in the set, for the least-committed reader on the page with the most
  traffic and the second-worst open rate); `vs-hackerrank-sql` → **113** (the
  pivot pattern a certificate does not test and an interview does);
  `best-sql-practice-sites` → **157** (WHERE-vs-HAVING, the most common
  intermediate error, whose near-miss is a wrong row set rather than a wrong
  number).
- **Metric** `blog_practice_exit`, cohort B (docs/agent/metrics.md), distinct
  people by `COALESCE(aid, username)`, `page` in the four slugs.
  **Baseline**, 30 days to 2026-09-08, measured before any exit existed:
  `sql-practice-comparison` 123 → 12, `vs-datalemur` 44 → 4,
  `vs-stratascratch` 41 → 5, `vs-leetcode-sql` 39 → 1 —
  **247 readers, 22 app opens, 8.9%**, against 74% on `/sql-exercises/`.
  Of the openers these pages do send, **42-50% go on to solve**, at or above
  `/sql-exercises/`'s 35%: the reader is not the problem, the page never
  invited them. `took_an_exit` is **0 by construction**.
  `vs-stratascratch`'s row is reconstructed by subtraction (it was below the
  cut of the printed table) — re-measure it directly rather than quoting it.
  The two siblings are outside the denominator: `vs-hackerrank-sql` has **no**
  pre-period row at all (verdict `UNDEFINED` for that page, never `FLAT`), and
  `best-sql-practice-sites` was already at **58 of 188 (31%)**, the best of the
  family, so counting it here would flatter the change with a page that
  already worked.
- **Read date 2026-10-08**, the same as cohort A, over the 30 days from the
  deploy.
- **Target.** Four rungs, in order:
  1. **≥ 20 `cta_practice_*` clicks from ≥ 15 distinct browsers** across the
     four pages. Plumbing: 15 of 247 readers is 6%, and a miss means the exits
     are not being seen.
  2. **The four together, ≥ 16% landed → opened**, roughly 40 of ~247 rather
     than 22. A doubling, which still leaves them at a fifth of
     `/sql-exercises/`'s 74%, because a comparison reader arrived to decide and
     not to practise. **This rung is not independent of rung 1** — the exit
     links straight into `/app/`, so clicks mechanically produce opens. It is
     the size check, not the hypothesis.
  3. **The openers' solve rate holds at ≥ 40%** while that volume rises. This
     is the rung that can actually fail: if the extra people the exit sends in
     solve at half the rate of the ones who used to arrive unprompted, the exit
     manufactured clicks rather than practice, and rungs 1-2 mean nothing.
  4. **≥ 6 people solve the specific challenge their page pointed at**, within
     7 days of the click, joined by `aid`.
- **Risk if it is wrong**: three added links per page on six pages, all
  additive, so a revert is a revert of this diff. The editorial risk is larger
  here than on the blog: these pages earn their traffic by being an honest
  comparison that concedes when the competitor wins, and a reader who smells an
  ad break stops believing the concessions too. That is why the mid exit is one
  quiet outline button and a line of grey text rather than a card, why the
  count is capped at two, and why nothing in the added copy states a count, a
  price or anything at all about a competitor.
- **Falsification, stated in advance:**
  - **Rungs 1-2 met, rung 3 collapses below ~25%** → the exit is sending in
    people who were never going to practise. The invitation is doing volume,
    not work. The move is to change *which* challenge each page points at
    (shorter, or free-er, or closer to the argument) — **not** to add exits.
  - **Fewer than 8 `cta_practice_*` clicks in 30 days across the four pages
    while their `landing_view` is unchanged** → the exit is not the missing
    piece for a comparison reader. Pre-registered so it cannot later be
    re-described as "wrong challenge" or "wrong copy": a reader who has just
    read a verdict, is offered one named question, and does not take it in
    front of ~250 readers is telling us the page's job ends at the verdict.
    The move then is to stop treating comparison traffic as a practice funnel.
  - **Clicks are healthy but the four pages' `app_opened` from their own doors
    does not rise** → the exit cannibalised the untracked hero/closing buttons
    rather than adding anyone. Same people, better instrumented. `FLAT`, and
    the honest report is that we learned what the existing CTAs were worth.
  - **Only `best-sql-practice-sites` moves** → confounded. It was at 31% before
    this change and is outside the cohort; it must never be used to carry the
    cohort's verdict.
  - **Any of the four stays under ~40 readers in the window** → `UNREADABLE`
    for that page alone. `vs-leetcode-sql`'s entire pre-period is one app
    opener, so it has no readable per-page verdict at any outcome.

### interview countdown: a company, a date, and a plan between now and it
- **Claimed** 2026-09-08 — built, tested and merged to `main`; **NOT LIVE**.
  Ships behind `FEATURE_FLAGS.features.interviewCountdown = false`.
- **The flag flip is part of this claim.** The card renders at the top of the
  Interview Prep tab and sends people into the same free/Pro challenge boundary
  the open "paywall surfaces" claim below is reading until **2026-09-20**. One
  surface, one change at a time (docs/data-driven-product.md P7). The flip
  lands **after** that read, and the deploy timestamp of the flip is what dates
  every event here — not the merge, not `min(created_at)`.
- **Change** a card (never a modal): pick a company, pick a date, get back a
  readiness number **with its three parts shown** and today's list of work. It
  shipped at the top of the Interview Prep tab on 2026-09-08 and moved to the
  Coach the same day — see the amendment below. Logic is pure and tested —
  `src/utils/interview-prep.js`, `tests/interview-prep.test.js`, 93 tests
  (83 at the merge; the Coach move and the archetype change added the rest).
  EN + TR. The target date is a plain preference (browser mirror + the user
  record); no new network call, and no event carries the date.
- **Nothing here predicts an interview outcome.** The number is progress
  through our own material: coverage of the target's own 10 challenges (0.45),
  the radar weighted by what that set demands (0.30), and the timed mock
  (0.25, reallocated rather than zeroed when the mock has not been sat, so a
  free user is not capped at 75 by a paywall). Nobody has ever told this
  product whether they got a job, so a pass probability has no data behind it
  and is not offered. A source guard in `tests/interview-prep.test.js` fails
  the build on prediction words in either language, and was mutation-verified.
- **Only one company is offerable, and it is computed — from editorial input.**
  **AMENDED 2026-09-08, same claim, no change to the target or the read date.**
  The third conjunct used to be a computed exclusivity share: ≥ 0.9 of the
  dataset's company tags had to be the target's. That is a proxy, and it
  punished the honest case — the card ledger is the shape of *every* card
  issuer's analyst screen, so co-tagging those ten challenges for a second
  issuer took Capital One to 0.5 and dropped **both** companies out of the
  flow. It is now an **archetype**: a written, dated, signed claim in
  `src/data/interview-archetypes.js` that a dataset is shaped like a particular
  kind of company's screen, with named members and a checklist for adding one
  (a citable, dated source for the screen format; a confirmed data-shape match;
  the page section). `eligibleTargets` asks three things — is the company a
  **declared member**, does a mock keyed to its exact name run on the
  archetype's dataset, are ≥ 8 challenges on that dataset tagged for it — and
  Capital One clears all three (`card-payments-analyst`, `finans_fraud`, 10
  challenges). The other 22 tagged companies are members of nothing and are
  refused. A tag can never grant membership, and a member whose content has
  gone missing now fails the **build** (`archetypeProblems`) instead of
  dropping out of the picker in silence. The registry is asserted at exactly
  one archetype and one member, so adding a second is a reviewed diff — and it
  is the thing that would fire the "a second value in `company`" trigger below.
- **Why** both payers we can name were preparing for one company. The content
  for it shipped 2026-09-07 and the way in did not exist: no date anywhere in
  the codebase, the company chip buried among the difficulty filters, and a
  goal picker with three goals and no company in it.
- **Metric** `interview_prep_funnel` (docs/agent/metrics.md) — distinct people
  by `COALESCE(aid, username)`: `reached_card` → `set_a_target` → `saw_a_plan`
  → `opened_an_item`. **Baseline 0 on all four, structurally**: the events do
  not exist before the flag flip.
- **THE BIGGEST RISK IN THIS CLAIM WAS DISCOVERY, NOT THE CARD. IT IS NOW
  RESOLVED — see the amendment below.** `showLegacyPrimaryNav` is hard-coded
  `false` in `src/app.jsx`, so the shipped primary nav is two tabs and
  `activeTab === 'trials'` is reachable only via the `?interview=<id>` deep
  link on the company pages and the onboarding `goal === 'interview'` branch.
  Measured 2026-09-08, shared filters: **22 accounts in the product's whole
  history carry any `interviewHistory` row**, and the tab has never had an
  impression event. `prep_readiness_shown` is the first measurement this
  surface has ever had. **A decision was owed before the flip**: either restore
  the Interview Prep nav entry, or move this card to the Coach tab (965 people
  viewed it in the 31 days to 2026-09-07). Flipping the flag without making
  that decision would produce an `UNREADABLE` verdict by construction, and that
  outcome would be the process failing, not the feature.
- **Target — SUPERSEDED 2026-09-08, kept here because a claim is not edited
  away.** In an 18-day window ending on the read date: ≥ 10 people reach the
  card, ≥ 4 of them set a target, ≥ 2 open something from the plan. Its own
  text conceded the problem: *"Against the tab as it stands today, 17 accounts
  have ever reached the interview surface at all, so the honest prediction
  without a nav change is 0-2 and ≥ 10 is not achievable."* **That target was
  written for a surface nobody could reach.** It is not a target, it is a
  prediction of an `UNREADABLE`, and it is replaced below.

- **AMENDMENT 2026-09-08 — the surface changed, so the target and the
  falsification are re-sized against the Coach.** Same claim, same flag, same
  read date; a second claim would double-count one feature.
  - **What changed.** The card moved out of the Interview Prep tab and into the
    Coach, below the next-step card and above the Pro strip. The nav entry was
    **not** restored — that reverses a deliberate onboarding decision and was
    explicitly not on the table. Both existing doors into the trials tab (the
    `?interview=` deep link, the onboarding `goal === 'interview'` branch) are
    untouched and guarded by tests. The Coach also gained an offer of its own:
    a `mock_interview` step type (`src/utils/coach.js`, `pickMockInterviewStep`)
    that surfaces the timed rehearsal as the Coach's next step when five
    conditions hold at once — the flag, **Pro**, a named target, the
    `interview-prep` exit criteria met at 80% of every threshold, and no
    sitting of that mock in 14 days. It is inert for everyone else, and that
    inertness is the tested invariant, not a comment: `tests/coach.test.js`
    asserts byte-identical `computeNextStep` output across a matrix of user
    states for any caller that does not opt in, and the assertion was
    mutation-verified by defaulting the flag on (2 tests fail by name).
  - **The mock is never offered to a free user, on purpose.** The Coach's
    next-step card is not a list, it is the single thing the Coach says to do
    next; a Pro wall there would *displace* a doable curriculum step rather
    than sit beside free work the way the prep card's plan rows do, and it
    would add a second `content_lock_reached` source on the surface the
    paywall-surfaces claim below is reading. It also follows a decision this
    feature already made one level down: `companyReadiness` reallocates the
    mock's weight rather than scoring an untaken Pro mock as zero, so the
    readiness number is not a paywall lever. Free users keep the path they
    have: the plan places the mock on the last planned day, and starting it
    goes through `startInterview`, which owns the one gate.
  - **New target, 18 days to the read date.** **≥ 200 people reach the card**,
    **≥ 8 of them set a target**, **≥ 4 open something from the plan.** Sizing:
    965 distinct people viewed the Coach in the 31 days to 2026-09-07;
    discounted for an 18-day window and for the first-run shell (which
    suppresses the card until the first solve), 200 is a plumbing check, not a
    hypothesis — if it is missed, the render gate is the finding. The two
    numbers that carry information are the ones after it. 155 people declared
    an `interview` or `job_ready` intent in those 31 days and 83 reached the
    5-solve evidence bar; ≥ 8 is roughly a tenth of the 18-day share of that
    83, which is the honest guess for how many are interviewing at **the one
    company on the list** rather than somewhere else.
  - **No target on `coach_step_mock_offered`.** Pro-only, five conditions, and
    three people have ever paid. A zero there is expected and is not evidence
    about anything; a non-zero number alongside a rise in
    `content_lock_reached` on the `interview` surface would mean the `isPro`
    gate is broken, which is a bug report, not a metric.
  - **Falsification, re-sized:**
    - **`reached_card` < 200** → the render gate, not the card and not the nav.
      Check the first-run-shell and guest distribution before anything else.
      Verdict `UNREADABLE` on the funnel; the finding is about the gate.
    - **≥ 200 reached, < 8 set a target** → this is the read the old surface
      could never produce, and it is now interpretable. The picker is one
      company long and that is visible on the card by design. Next move is
      content for a second target — 8+ challenges tagged on an archetype's
      dataset, a mock on it, and a written membership with a dated source —
      never widening the eligibility bar and never louder copy.
    - **≥ 200 reached, `set_a_target` at or near 0, and nothing in `feedback`
      about it** → the honest reading is that the card is noise on the Coach
      for the ~98% who are not interviewing anywhere. The move then is to make
      it conditional on declared intent (`intent in ('interview','job_ready')`)
      or to take it off the Coach — **not** to make it bigger or move it above
      the next-step card. Pre-registered so that outcome cannot be
      re-described later as a placement problem.
    - **≥ 8 set a target, < 4 open an item** → the plan is not credible or not
      actionable. Read `prep_plan_viewed.status` first; a run of `past` is a
      different bug.
    - **The Coach's own funnel moves down** — `goal_picker_shown` → `goal_selected`
      conversion falls against the pre-flip fortnight — → the card is
      displacing the Coach's primary job. Revert the placement regardless of
      the prep numbers. The Coach is the surface 1,179 people see; it is not
      ours to spend.
    - **`opened_an_item` concentrated on `kind='mock'` with a
      `content_lock_reached` spike** → this shipped as a paywall funnel. Revert
      the mock from the plan regardless of the other numbers. (Unchanged.)
    - **A second value ever appears in `company`** → content changed under the
      eligibility bar. Stop and look. (Unchanged.) **Fired 2026-09-12:**
      Revolut signed as the second member (`neobank-analyst` on
      `finans_neobank`, 12 challenges, mock `revolut-analytics-screen`).
      From that date read this funnel split by company; never sum the rows.
    - **Any prediction wording appears on the card or in the Coach offer** →
      revert immediately, regardless of the numbers. (Unchanged; the guard now
      covers the Coach offer's copy in both languages too.)
- **Guardrail** `content_lock_reached` on the `interview` surface, directional
  only: the plan's last item is a Pro mock, and a spike there would mean this
  card is functioning as a paywall funnel rather than a study plan. And
  `purchases`, directional only.
- **Read on** **2026-10-12**
- **Falsification, stated in advance:**
  - **`reached_card` < 10** → discovery, not the card, and the next move is the
    nav decision above — **not** copy, **not** the eligibility bar, **not**
    lowering the 5-solve evidence gate. Verdict `UNREADABLE`; say why.
  - **≥ 10 reached, < 4 set a target** → the picker is the barrier. Most likely
    cause, and it is visible on the card by design: the list is one company
    long, and a person preparing for anywhere else is told so honestly and then
    has nothing to click. Next move is content for a second target (8+
    challenges on its own dataset AND a mock), never widening the bar.
  - **≥ 4 set a target, < 2 open an item** → the plan is not credible or not
    actionable. Read `prep_plan_viewed.status` first: a run of `past` means
    people are entering dates that have gone by, which is a different bug.
  - **`opened_an_item` concentrated on `kind='mock'` with a `content_lock_reached`
    spike** → this shipped as a paywall funnel. Revert the mock from the plan
    regardless of the other numbers.
  - **A second value ever appears in `company`** → content changed under the
    eligibility bar. Stop and look at what changed before reading anything.
    **Fired 2026-09-12** (Revolut signed; see "Revolut membership" above):
    the change is a second archetype on a second ledger, not a change to
    Capital One's set — read Capital One's rows as before and Revolut's as a
    new series born that day.
  - **Any prediction wording appears on the card** → revert immediately,
    regardless of the numbers. That is not a metric question.
- **Confounds** (i) The flip lands days after the paywall-surfaces read closes,
  and the plan routes people into free-vs-Pro challenges — a shift in
  `content_lock_reached` across the flip has two candidate causes. (i-b, added
  2026-09-08) The Coach is also where the hard-preview offer from that same
  claim lives. The two cannot both fire — the preview rule is non-Pro only and
  the mock offer is Pro only — and the engine checks the preview first so the
  ordering holds even if a gate is relaxed. But they now share the same card,
  so any post-flip reading of the Coach's next-step card belongs to both
  claims and should be reported to both. (ii) The
  target set (ids 275-284) shipped 2026-09-07 with **0 solves by anyone**, so
  the `coverage` part starts at 0 for every user and the first fortnight of
  `bucket` measures the radar part alone. (iii) The review-ask flag is
  scheduled to flip in the same window on an adjacent surface; record which
  flipped first. (iv) The Capital One landing page also shipped 2026-09-07 and
  had 1 visitor to 2026-09-08 — any traffic growth on that door during the
  window is the page's, not this card's. (v) The ten target challenges have no
  `title_tr`, so a Turkish user reads Turkish chrome around English challenge
  titles; that is pre-existing content debt, but it lands inside this card for
  the first time.
- **Verdict** **MISS — the pre-registered falsification fired** (read 2026-11-22, 30 days to 11-21). `cta_practice_*` clicks: **7, from 6 browsers** (rung 1 asked ≥ 40 from ≥ 30; the falsification line was < 15). Real readers ≈ 248: 687 blog `landing_view` people, 439 of them Asia/Shanghai with no source (the 800x600 / 1280x1200 crawler, unstamped on landing rows until `fix/landing-bot-fingerprint`). App arrivals with `arrivalSrc` blog*: 143, ~113 the same crawler; ~20 real, 14 opened a challenge, 2 solved. As written in advance: the exit was never the problem — readers take the answer and leave. Blog readers are not treated as a practice funnel; no third exit (a "solve this now" card was proposed 11-21 and not built).
- **2026-09-08, before the flag ever flipped: the plan had holes in it.** The
  card set grew from 10 challenges to 25 the same day, and that exposed a
  slicing bug `planToDate` had carried since it was written. It divided the
  work by a fixed ceiling — `Math.ceil(items / planDays)` — so 22 items over
  14 days filled eleven days at two apiece and left days twelve and thirteen
  **empty**, with the mock alone on the last one. Three days of nothing, in a
  plan whose entire promise is what to do before a date. It could not appear
  while the set was small: with ten challenges `work.length <= planDays` made
  every day a one-item day and the ceiling was always 1. The remainder is now
  spread over the first days, front-loaded on purpose, because the days
  nearest the decision to start are the ones a person actually has.
  Consequence for the read: `prep_plan_viewed` and `prep_plan_item_opened`
  measure a materially different artefact than they would have on 09-07. The
  same 14-day window that drew 7 items over 7 days and then stopped a full
  week short of the interview now draws 22 items plus the mock across all 14.
  Nobody saw either version — the flag has never been on — so this is a
  correction to the instrument, not a confound, and the baseline stays zero.
### review ask: give real users a way to say something in public
- **Claimed** 2026-09-07 — built, tested and merged to `main`; **NOT LIVE**.
  Ships behind `FEATURE_FLAGS.features.reviewAsk = false`.
- **The flag flip is part of this claim.** The card renders in the post-solve
  success panel, which is the same surface and the same population the open
  "paywall surfaces" claim below is reading until **2026-09-20**. One surface,
  one change at a time (docs/data-driven-product.md P7). The flag flips
  **after** that read lands, and the deploy timestamp of the flip is what
  dates every event below — not the merge, not `min(created_at)`.
- **Change** a card (never a modal, never an interruption) in the post-solve
  success panel, above "What's next", offering two doors side by side: leave a
  public review on Trustpilot, or send a private note instead (the existing
  feedback widget, preset to a `review` topic). Plus dismiss. Eligibility is a
  pure, tested function — `src/utils/review-ask.js`: 15+ lifetime solves, 2+
  distinct active days, once per browser ever, a permanent dismissal, a 7-day
  do-not-stack-asks cooldown, and never in a session that hit a paid wall.
  EN + TR. Also: the profile share link is surfaced on the same card, and the
  feedback flow gains an optional, default-off, separately-worded consent to
  be quoted (checkbox + display name + consent timestamp;
  `supabase/migrations/20260907_feedback_quote_consent.sql`, **applied —
  verified against the live schema 2026-09-08**).
- **Nothing is offered in exchange for a review** — no discount, no XP, no Pro
  days, no badge. FTC 16 CFR Part 255 and every platform's terms; a source
  guard in `tests/review-ask.test.js` fails the build if an incentive word
  reaches the copy, in either language, and was mutation-verified.
- **Why** the product has never once asked anybody anything. 318 public
  profiles auto-published, `profile_link_copied` **zero rows ever**, the
  peer-to-peer referral loop at zero personal-code rows in its whole history,
  5 rows in `feedback`. (Corrected 2026-09-08: "referral functions at zero
  events" was wrong — `referrals` holds 103 rows over 37 codes since
  2026-04-29, all of them marketing campaign codes. The *personal* half is
  what has never produced a row, and the cause is a missing column and a
  missing RPC, not apathy — see the cold diagnosis in
  `supabase/migrations/20260908_referral_personal_codes.sql`.) There is no
  third-party text about SQL Quest for Google or an AI assistant to read, and
  the AI-recommendation channel is the only one that has produced a paying
  customer (payer #2, Gemini, 2026-08-28). Related finding, measured
  2026-09-07: the share buttons on Profile → Skills have produced **zero**
  interactions of any kind — 0 `profile_link_copied`, 0 `profile_opened`, and
  0 of the 14 `radar_png_copied` rows, all 14 of which came from the
  post-solve radar toast (`surface='radar_pop'`, 8 people, 08-07..09-03).
  That is why the ask lives in the post-solve panel and not on the profile.
- **Metric** `review_ask_funnel` (docs/agent/metrics.md) — distinct people,
  by `COALESCE(aid, username)`: `shown` → `clicked_public` / `chose_private` /
  `dismissed`. **Baseline 0 on all four, structurally**: the events do not
  exist before the flag flip, and absence before it is the flag, not apathy.
- **Secondary, and the only one that is actually the point:** the number of
  reviews visible on `https://www.trustpilot.com/evaluate/sqlquest.app`'s
  public page. Baseline **0** (verified 2026-09-03: the profile is claimed and
  unfilled). Read **by hand** and recorded with that provenance — Trustpilot
  gives us no callback, and the card promises the user we cannot see who wrote
  what. `clicked_public` is an intent; it must never be reported as a review.
- **Guardrail** `feedback_failed` stays at 0 (a row there is someone who tried
  to reach us and could not), and `purchases`, directional only.
- **Target**, sized from the population rather than a wish: in an 18-day window
  ending on the read date, **≥ 25 people shown**, **≥ 4 of them take either
  door**, of which **≥ 2 click the public review**, and **≥ 1 review actually
  visible on the Trustpilot page**. Sizing: 75 people have ever met the
  eligibility rule; 45 of them solved a challenge while already eligible in
  the 18 days to 2026-09-07, which is the ceiling on `shown` for a comparable
  window (measured, shared filters, people by aid).
- **Read on** **2026-10-08**
- **Falsification, stated in advance:**
  - **< 15 shown** → the gate, not the card. Either the eligibility rule is
    too tight or wall-hitters are eating the population (a session that fires
    `content_lock_reached` can never fire this). Next move is to instrument
    the `REVIEW_ASK_REASONS` distribution and read it — **not** to rewrite the
    copy, and **not** to lower the thresholds before knowing which branch is
    firing.
  - **≥ 25 shown and 0 clicks of either kind** → people do not want to be
    asked at this moment. Next move is placement (weekly digest email, or the
    profile after a milestone), not copy. The already-asked cohort is spent —
    once-ever means there is no second attempt at these same people, ever.
  - **≥ 25 shown, ≥ 4 clicks, 0 reviews on Trustpilot after 14 days** → the
    ask is not the barrier; Trustpilot's own signup wall is. Next move is a
    destination with no account requirement, or dropping the public door and
    keeping the private one.
  - **1-3 clicks on ≥ 25 shown** → inconclusive at this n. Extend to the next
    read; change nothing. `UNREADABLE` is the honest verdict, not `FLAT`.
  - **Any incentive appears anywhere near this feature** → revert immediately,
    regardless of the numbers. That is not a metric question.
- **Confounds** (i) The flag flip lands days after the paywall-surfaces read
  closes, on the same panel — a shift in post-solve behaviour across 09-20 has
  two candidate causes and the `openedFrom`-stamped preview metric is the only
  one isolated from this. (ii) The profile share link moves onto this card in
  the same change, so a first-ever `profile_link_copied` row is attributable to
  the review card and to nothing else — which is the point, but it means the
  old profile-banner surface is not being tested. (iii) The quote-consent
  checkbox ships to the feedback widget for everyone, not only review-card
  arrivals, so `feedback_submitted` volume is exposed to it independently.
  (iv) AlternativeTo and G2 are off; if the founder lists on either during the
  window, `clicked_public` gains a destination mid-read — record the date.
  **Recorded: AlternativeTo was submitted 2026-08-27 and paid into the
  priority queue, confirmed 2026-09-08; the listing is expected live
  2026-09-09..09-15.** That is BEFORE this claim's 18-day window opens (it
  ends 2026-10-08, so it starts ~09-20), and before the flag flip, which
  itself waits on the 09-20 paywall read. So the listing is part of the
  baseline this claim is measured against, not a mid-read change — provided
  it lands on schedule. If it slips past 09-20, it becomes a live confound
  and this note must be revisited.
  (v) **The Trustpilot secondary is already contaminated, before this ships.**
  Four hand-written review invitations went out on 2026-09-07 (sab3r,
  tausif1122, luciej, supertrunker — logged under the outreach claim in
  Closed). Any review that appears on the public page during this window may
  be theirs and not the card's, and there is no way to tell: Trustpilot gives
  us no attribution and the card promises the user we cannot see who wrote
  what. So the **primary is `review_ask_funnel`**, which only the card can
  produce; the Trustpilot count is context, and a review from one of those
  four must not be credited to this change. Check the four names against the
  invitation list before reading the public page.
- **Verdict** **NOT FLIPPED — nothing to read** (B2, checked 2026-11-22): `reviewAsk` is still `false` on main and no `review_ask_*` row exists. The read date above is void; a new one is set on the day it flips.

### paywall surfaces: lead people to the free Hard previews
- **Claimed** 2026-09-06 — commit `2bab2b2`, deployed 2026-09-06 14:17Z
  (Vercel; verified: `/app/` serves `app.js?v=a85e3aa2`, the bundle the
  23/23 smoke ran against, `preview_dialog` present)
- **Change** three entry surfaces for the six free Hard previews, none of
  which existed before (plan: `docs/plans/paywall-surfaces-plan.md`):
  (i) the Hard list pins the previews first, tags them, dims locked rows and
  carries a counts-from-bank banner; (ii) clicking a locked Hard challenge
  opens a collision catcher — the unsolved previews in curriculum order, Pro
  as a muted footer — in place of the "keep solving Easy + Medium" soft
  toast (the `companyFilter` wall branch is untouched); (iii) the Coach may
  offer the first unsolved preview as its next step, once per session, when
  an advanced radar skill is ≥ 65. Plus a win-state line per preview solved,
  the banner's 6/6 flip to "Unlock Hard", and the `content_lock_reached`
  multi-fire dedupe (2s per user+challenge). Every surface is hidden for Pro.
- **Why** the 08-21 lock read: 16 people hit a paid wall in 6 days, **15 of
  16 with all 6 previews untouched** — targeted share LOW, so moving the wall
  changes nothing until something leads people to it. Payer #2 bought "to
  unlock the harder questions". Build order fixed then: surfaces first,
  radar indicator second (separate PR), wall placement only after this read.
- **Metric** `preview_open_to_solve` — people with `openedFrom` stamped on
  `challenge_opened` (`preview_list` / `preview_dialog` / `preview_coach`)
  who then `challenge_solved` the same id. Baseline **0**: the field is born
  at ship; absence is organic by design.
- **Also** the lock-time secondary under the same metric: share of
  `content_lock_reached` people whose LAST lock in the window has
  `freeHardPreviewsUnsolved < 6`. Baseline **1/16 (6%)**. Declared
  confounded — it moves only on repeat collisions, since a first-time hitter
  is stamped before any surface could reach them.
- **Guardrail** `purchases`, directional only — single-digit n in any
  two-week window cannot carry a gate.
- **Target** ≥ **15 people** open a preview via a new surface in 14 days
  AND ≥ **40%** of them solve one.
- **Read on** **2026-09-20** (deploy + 14 days)
- **Falsification, stated in advance:** < 15 people in 14 days → the
  surfaces are not being seen: findability, not desire. Next move is
  placement / traffic, not copy. ≥ 15 people but < 25% solve → the previews
  are the wrong six (all Window/CTE cluster) → re-curate; the TODOS item
  exists. 25-40% → inconclusive, extend, no copy change.
- **Confounds** three surfaces ship in one PR; attribution lives in
  `openedFrom` only, and the lock-time secondary reads the combined effect.
  The 105-opener and grader-ordering changes ship in the same push and
  touch other surfaces (first contacts; grading across the whole bank) —
  neither can produce a stamped open, so the primary is the read; the
  secondary and the guardrail are not isolated from them.
- **Verdict** **HIT** (B2, read 2026-11-22 over the claim's window 09-06 14:17Z → 09-20 14:17Z, internal accounts out): **44 people** opened a free Hard preview from a stamped surface (`preview_list` / `preview_dialog` / `preview_coach`) and **24 solved that challenge (54.5%)** — target ≥ 15 people and ≥ 40%. Since 09-25 the ten-solve quota folds the previews into the ten free solves, so this verdict covers the 14 days it was written for. Lock-time secondary not re-read.
- **Mid-window check, 2026-09-07** (day 1 of 14, not a verdict). The
  instrumentation is sound and the surfaces are being reached; nobody has
  taken them yet:
  - **The `openedFrom` stamp works end to end.** Verified against the live
    bundle with `npm run smoke` (23/23): clicking "Try this one free" in the
    catcher emits exactly one `challenge_opened` carrying
    `openedFrom='preview_dialog'` with the card's own challenge id. So the
    **zero** stamped opens in production are zero *clicks*, not lost rows —
    do not read the metric as UNREADABLE on 09-20 for want of a stamp.
  - **The catcher fires:** 8 `content_lock_reached` rows,
    `wall='preview_dialog'`, **4 people**, 09-06 14:23Z → 09-07 08:35Z. The
    old `soft_toast` branch caught 2 more people (the `companyFilter` wall,
    untouched by design).
  - **Preview opens:** 2, one each on ids 50 and 86, **both unstamped** —
    i.e. reached from the ordinary challenge list, not from any of the three
    new surfaces. The stamp is conditional on the call site by design
    (`preview_dialog` / `preview_list` / `preview_coach`), so an unstamped
    preview open is a real "found it another way", not a defect.
  - Reading of the day: 4 people saw the catcher, 0 clicked a preview inside
    it. n is far too small to act on — stated here only so the 09-20 read
    compares against a known-good instrument.
- **Mid-window check, 2026-09-08** (day 2 of 14, not a verdict). Read at
  2026-09-07 22:43Z, covering 09-06 13:42Z → now: 12 lock rows / **8 people**,
  2 stamped preview opens / **1 person**.
  - **The primary metric is non-zero.** aid `58762b91`, 09-07: solved 37,
    then opened **23 from `preview_list`** at 18:07:51 and **solved it at
    18:11:58** — 4m07s — then opened **24 from `preview_list`**. So
    `preview_open_to_solve` stands at **1 person, 1 of 2 stamped opens
    converted**. Yesterday's note recorded zero; the surface produces real
    rows in production, not just in `npm run smoke`.
  - **Feasibility arithmetic, stated now so the 09-20 verdict is not a
    surprise.** 8 people reached a wall in 1.4 days ≈ 5.7/day ≈ **80 people
    over the 14**. The target of ≥ 15 preview-openers therefore needs ≈ **19%
    of wall-hitters to click a preview**. The rate so far is 1/8 = 12.5%.
    Reachable, not comfortable. This is arithmetic on the denominator, not a
    verdict on the claim.
  - **The secondary is repeating 08-21 exactly: `freeHardPreviewsUnsolved`
    is 6 on all 12 rows — 8 of 8 people.** Baseline was 1/16 (6%); we are at
    **0/8**. Nobody who has met a wall had touched a preview first. The
    surfaces are still not upstream of the wall for anyone.
  - **The most informative single user.** aid `ef5885e6` (19 solves, door
    `sql-interview-prep`) hit the catcher on challenge **3 four times in 23
    seconds** (00:24:46, :51, 00:25:02, :05) and then challenge 12, taking no
    preview. Our most engaged wall-hitter bounced off the same locked door
    four times. The catcher gave that person nothing to do.
  - **Measurement note for the 09-20 read — use people, not rows.** Those
    four repeats are 4 legitimate rows: the T3 dedupe is 2s per
    user+challenge and every gap was 2.8-10.7s. So `lock_rows` (12)
    overstates `lock_people` (8) by 50% in this window. The denominator on
    09-20 is **people**.
  - **Two rows still carry `wall='soft_toast'`** (09-06 15:01 and 21:45, both
    on challenge 31) *after* the 13:42Z deploy, while a 20:10 row on the same
    challenge carries `preview_dialog`. Stale cached bundles, not a second
    code path. Expect a small `soft_toast` tail in the 09-20 read and count
    those people as catcher-eligible-but-not-served.
  - **Two of the eight had `solvedCount = 0`** — aid `2eb0db72` (door
    `company:Snowflake`, challenge 89, `wall='company_modal'`, i.e. a buyable
    Pro modal) and aid `e7914d44` (door `challenges-window-functions`,
    `surface='interview'`). Asking for money from someone who has solved
    nothing inverts "satisfy first, then ask" (docs/data-driven-product.md).
    Being fixed under the cold-start entry below; **that fix removes 0-solve
    people from the catcher population mid-window**, which shrinks this
    claim's denominator by ~25% and makes the ≥ 15 target harder, not easier.
    Recorded here, before the fix ships, so the 09-20 verdict is read against
    the change and not against a denominator nobody wrote down.
### cold start: nobody is asked to pay before they have solved anything

- **Amended 2026-09-20 (founder QA round 6), nine days before the read.** The
  rule was "never SELL to someone who has solved nothing"; in practice the
  gate also REFUSED someone who came to buy. A new free account pressed
  "Unlock Pro" on a locked mock, met the starter dialog, and had no way to
  the plans at all. The dialog now carries a secondary button — "Unlock Pro
  anyway" — under the starter, and says the threshold out loud (one free
  solve). Nothing offers: the modal only opens on that click, with its own
  reason `cold_start_anyway` plus the event `cold_start_pro_anyway`, so the
  09-29 read can separate a buyer who insisted from a person who was sold to.
  Read both: the claim is unharmed if `cold_start_anyway` shows and converts,
  and it is only broken if the STARTER stops being taken.
- **Claimed** 2026-09-08
- **Change** `src/utils/paid-wall.js`: a person with zero solves never sees a
  Pro ask. All four gates (`challenge_hard`, `interview`, `thirty_day`,
  `daily_difficulty`) call `openColdStartInstead()` between their
  `trackLockReached` and whatever asks for money; the collision is still
  written, under the new `wall='cold_start'`. They get a dialog naming one
  free challenge picked in curriculum order — no price, no "Pro", no Hard
  preview. Its CTA opens that challenge with **no `openedFrom` stamp**, so it
  cannot forge rows into `preview_open_to_solve`. 16 unit tests + a source
  guard (mutation-verified: removing one `openColdStartInstead` fails it by
  name) + a new smoke step that asserts `wall='cold_start'` and that the
  dialog mentions neither Pro nor a price.
- **Why** measured 2026-09-07 over 45 days: **38 people met a paid wall having
  solved nothing, and 3 of them ever solved anything (7.9%).** For 22 of the
  38 the lock event is the last thing they ever did. `docs/data-driven-product.md`
  states the order — satisfy first, then ask — and this population was the
  product doing the reverse to roughly two people a day. The live example:
  aid 2eb0db72 arrived on /snowflake-sql-interview/, clicked Hard challenge
  89 with zero solves, and got the **buyable** company modal.
- **Metric** `cold_start_first_solve` (docs/agent/metrics.md). Baseline
  **3/38 = 7.9%** over the 45 days to 2026-09-07; **3/21 = 14.3%** excluding
  the 08-26 cluster.
- **Guardrail** `purchases`, directional only. This change can only reduce
  asks, so a fall in `pro_modal_shown` is the mechanism working, not a
  regression — but a fall in *purchases* would mean some of those asks were
  converting, and that would be worth knowing.
- **Target** ≥ **25%** of cold-start people solve at least one challenge.
- **Read on** **2026-09-29** (deploy + 21 days; ~2 cold-start people a day, so
  21 days buys n ≈ 40 — 14 would have left the read on a dozen people).
- **Falsification, stated in advance:** < 15% → the dialog is not the lever
  and the next move is **placement**, not copy: a zero-solve visitor should
  not be able to reach a locked Hard from a company page at all, and the fix
  is upstream in what those pages link to. 15-25% → inconclusive, extend to
  2026-10-13, change nothing. ≥ 25% but `purchases` falls below 2 in the
  window → the ask was doing work we just removed; re-open the threshold
  question (`COLD_START_SOLVE_THRESHOLD`) rather than reverting.
- **Confounds** it lands mid-flight in the paywall-surfaces claim reading to
  2026-09-20 and **shrinks that claim's denominator by ~25%** (2 of its 8
  wall-hitters were zero-solve). Recorded in that claim's 09-08 mid-window
  note as well. The two must be read together, and the ≥ 15 preview-opener
  target there is now harder to reach for a reason that has nothing to do
  with the surfaces.
- **Verdict, read 2026-09-29 (deploy 09-08 → 09-28): INCONCLUSIVE — extended
  to 2026-10-13, nothing changes.** 118 people met `wall='cold_start'`; 74 of
  them are the rendering crawler of 09-17 → 09-23 (the `first_solve_10m` trap:
  no landingSrc, LA/1920×1080 or UTC/1280×720, arriving through
  `challenges-advanced` links; none opened a challenge afterwards). Of the
  **44 people**, 19 opened a challenge after the dialog and **10 solved one —
  22.7%**, against 7.9% (14.3% without the 08-26 cluster) before the change
  and the 25% target. Inside the 15–25% band the rule says extend. The lock
  was the last event for 17 of 44 (39%; 22 of 38 = 58% before). "Unlock Pro
  anyway" (added 09-20): 3 people pressed it, 0 reached checkout, 0 bought —
  the starter is still what gets taken. Purchases in the window: 1
  (stripe_webhook, 09-19); the guardrail only applies at ≥ 25%. Where the
  44 came from: the topic pages' `?challenge=` links (advanced, aggregation,
  ranking, dates — 0 of 24 solved) and company pages (Revolut, Snowflake,
  Databricks — 3 of 7 solved). That split is the falsification branch's
  hint even before the verdict lands: the topic-page links hand a
  zero-solve visitor a locked Hard. **Confound for the extension:**
  `diagnosisHints` flips 2026-09-30 (flag-queue row 1) and changes the
  wrong-answer panel every cold-start solver meets — read the 10-13 window
  split at the flip. Re-read 2026-10-13 on the 09-08 → 10-12 cohort, crawler
  excluded.
- **Verdict, re-read (due 2026-10-13), B2 2026-11-22: HIT.** Cohort 09-08 → 10-12, people who met `wall='cold_start'`, crawlers out — the 09-17 → 09-23 renderer, the four crawler viewports, `desktop:1280x720` UTC, and a randomized-viewport wave 10-01 → 10-12 (width 1,075–1,400 × height 900–1,850, Hong Kong / Singapore / Shanghai / Mexico City / LA / UTC; 177 people, of 194 non-fingerprinted in that fortnight only 14 ever opened a challenge): **52 people, 14 solved a challenge after the dialog (26.9%)** against 25%. Split at the 09-30 `diagnosisHints` flip: 9 / 35 (25.7%) before, 5 / 17 (29.4%) after. Guardrail: 2 purchases in the window (09-19, 10-01) — not below 2. Keep the gate. Caveat: n = 52 behind a hand-made crawler filter; two people either way moves it across 25%.
### paywall: ask fewer people, at most twice, and never the ones who came to learn
- **Claimed** 2026-09-08 — **NOT YET SHIPPED.** Ships after the cold-start read
  on **2026-09-29** (read: inconclusive, extended to 2026-10-13 — this waits
  with it), because `purchases` is a directional guardrail on both
  that claim and the paywall-surfaces claim reading 09-20, and changing who
  sees the Pro modal moves it. Plan:
  `docs/plans/signup-to-subscriber-2026-09-08.md`.
- **Change** three things to the milestone Pro modal, together: never shown to
  `learning` intent; shown to people with no captured intent only after asking
  for the intent instead; and a hard lifetime cap of **two shows per person**.
- **Why** measured 2026-09-08. Over 60 days the modal reached 282 people and
  produced 12 checkout clicks (4.3%), of which 4 paid — a third of clickers
  buy, so the bottom of the funnel is fine and the top is growing (+94%
  signups, engaged share 55% → 64.5%). The break is shown→click, and two
  things explain it. **Intent:** of people with a recorded intent, `interview`
  went 41 shown → 4 clicked and `job_ready` 48 → 2, while `learning` (41) and
  no-intent (52) produced **zero clicks between them** — 93 people, no
  exception. **Fatigue:** 1.91 shows per person, **43 people saw it three or
  more times and one saw it eight**, against a 95% dismiss rate. Solve count,
  the thing the trigger is built on, does not predict clicking at all —
  clickers averaged 11.4 solves against 13.4 for everyone shown.
- **Metric** `paywall_ask_efficiency` (docs/agent/metrics.md). Baseline
  **12 clicks / 282 people shown = 4.3%** over the 60 days to 2026-09-08.
- **Guardrail** absolute `pro_checkout_clicked` people must not fall, and
  `purchases`, directional only.
- **Target** over the 8 weeks after ship: **shown→click ≥ 8.6%** (double)
  **AND absolute clicks ≥ 12**, i.e. the same number of clicks from roughly
  half the asks.
- **Read on** **2026-11-24** (ship 09-29 + 8 weeks). Eight weeks, not two: the
  baseline rests on 12 clicks, and a two-week window on this n reads noise.
- **Falsification, stated in advance:**
  - **Absolute clicks fall below 12** → the gate is cutting buyers we cannot
    identify in advance. Revert the intent gate, keep the frequency cap, and
    re-read the cap alone. The cap is the half of this change that cannot cost
    us a buyer.
  - **Rate below 6%** → intent is not the axis. Next move is moment, not
    audience — i.e. move 2 of the plan, driven by the 09-20 read, not more
    copy.
  - **6-8.6% with clicks held** → inconclusive at this n, extend to 2026-12-22,
    change nothing.
  - **Any discount, urgency or scarcity appears in this modal** → revert
    regardless of the numbers. Our buyers are deadline-driven, not
    price-shopping, and we have never tested otherwise.
- **Confounds** (i) it ships after two other paywall changes land, so the
  09-20 and 09-29 verdicts must be written before this one starts. (ii) The
  intent gate changes the *population* shown, so `shown` is not comparable
  across the ship date — only clicks are. (iii) If the founder mails the 61
  dismissers (move 4 of the plan) during the window, some of them may return
  and buy for a reason that is not this change; record the send dates.
- **Verdict** _pending_

### goal-setting: a marker of a deadline, or something we can manufacture?
- **Claimed** 2026-09-08 — **observation, not an intervention.** Nothing ships
  for it. It exists so the tempting move is written down before somebody makes
  it.
- **The finding** among engaged users (5+ solves) over 90 days: 75 have a
  Coach goal and 216 do not. Shown the modal: 52 vs 78. Clicked: 3 (5.8%) vs
  6 (7.7%) — goal-setters click *less*. Paid: **3 vs 0.** Every paying
  engaged customer had set a goal.
- **Why it is not an instruction to make people set goals.** n = 3; Fisher
  exact on 3/3 vs 0/6 gives **p ≈ 0.08**. And the causal reading matters more
  than the p-value: a goal most plausibly *marks* somebody with a real
  deadline rather than *causing* them to pay. Make goal-setting a step toward
  checkout and it stops meaning "I chose this" and starts meaning "I clicked
  past a gate" — the correlation would not survive its own exploitation.
- **What to do instead** ask goal-less engaged users to set one because the
  Coach works better with one (94 of 652 active users have a goal; 216 engaged
  users do not), then watch whether the paid-vs-goal association survives the
  larger population. If it holds at n ≥ 10 payers, it is real and worth
  building on. If it dissolves, it was a marker and we learned that cheaply.
- **Metric** the goal split under `paywall_ask_efficiency`. **From the
  2026-09-16 intake flip, exclude `coachState.source='intake'`** — a goal the
  onboarding intake mapped from a one-tap answer is not the deliberate choice
  this observation is about, and counting it would manufacture the marker.
- **Read on** **2026-11-24**, alongside the claim above, or the first time
  cumulative payers reach 10 — whichever is later.
- **Falsification, stated in advance:** if by then goal-holders and
  goal-less engaged users convert within a factor of two of each other, the
  3/0 was noise and no offer should ever be conditioned on a goal.
- **Verdict** _pending_

### grader: ties inside an ORDER BY no longer fail a correct query
- **Claimed** 2026-09-06 — deployed 2026-09-06 13:42Z
- **Change** `src/utils/grade.js` ordered mode is tie-tolerant: the SEQUENCE
  of sort-key tuples must match the reference exactly and the multiset of
  full rows must match; tied rows may come in any order. Keys are resolved
  from the solution's final ORDER BY to output columns (plain identifiers,
  aliases, positions; qualifiers and NULLS FIRST/LAST stripped). 27 and 69
  use expression keys and stay strict. All nine grading sites now pass the
  reference columns. 12 new tests incl. the 121 fixture.
- **Why** feedback #6 (2026-09-02, hakko504, 131 solves, job_ready) on 121
  "Multi-Month Active Customers": `ORDER BY distinct_months DESC,
  total_orders DESC`, no tiebreaker — tied customers land in engine order
  and a correct query with a different tie order was marked wrong; he
  abandoned 121. Same class as payer #2's complaint (REPLY #2) one week
  earlier. **175 of 185 solutions carry a top-level ORDER BY**, so the
  exposure is the whole bank, not one challenge.
- **Metric** pooled `challenge_solve_through` (person-challenge pairs, 28
  days) by band. Baselines to 09-06: hard bank 1-90 **66.5%** (489/735);
  bridge+ 106-185 **75.9%** (975/1284); beginner 91-105 **78.0%**
  (1332/1707) — the control: short single-key outputs, ties rare. 121
  alone: 55.6% (5/9), direction only.
- **Target** hard bank ≥ 70% and bridge+ ≥ 78% over the 28 days after
  deploy, with beginner flat (± 3 pts).
- **Read on** **2026-10-04** — deployed 2026-09-06 13:42Z (tie parser verified
  in the served bundle)
- **Falsification, stated in advance:** if hard and bridge+ move < 3 pts
  while beginner is flat → tie rejections were rare in practice; the two
  complaints were the visible tail, not a mass leak. Keep the fix (it is
  correctness), stop spending on grading, and the next lever is content
  (tiebreakers in solutions, prompts that state the order). If all three
  bands move together → traffic mix, UNREADABLE — extend.
- **Confounds** the 08-28 unordered fix and the 105 opener ship in the
  same push. 105 touches first contacts only (beginner band); the
  unordered fix touches the 10 solutions without ORDER BY — negligible in
  the hard and bridge+ bands, which are the read.
- **Verdict** **FLAT — the falsification fired** (B2, read 2026-11-22; person-challenge pairs by username, shared filters, crawler viewports out; 28 days before the 09-06 13:42Z deploy vs after it, the after-window cut at the 09-25 22:41Z quota flip because the quota locks unsolved opens): hard 1–90 **66.4% → 67.1%** (773 → 799 pairs), bridge+ 106–185 **75.6% → 72.3%** (1,080 → 1,200), beginner 91–105 74.9% → 77.4% (control, inside ±3). Neither read band rose 3 points (bridge moved 3.3 the wrong way). The full 28 days to 10-04 read 64.3% / 69.7% / 74.5%, lower again because the quota locks opens. As written: tie rejections were rare; keep the fix (correctness), stop spending on grading; the next lever is content — tiebreakers in reference solutions and prompts that state the order (BACKLOG, owner B3).

### intent routing: a handle on the interview door

- **Amended 2026-09-20 (founder QA round 7), 26 days before the read.** The
  tab's solve floor is gone: it required one solve, so a person arriving from
  a company page for a named mock saw a challenge list and NO interview
  surface at all — no mock, no Pro, no price — until they solved something.
  That is a conversion floor of zero for exactly the arrivals this claim is
  about. From today the tab is open while the flag is on; `interview_tab_viewed`
  carries `reason='open'` for a person with no hiring signal, so the 10-16 read
  splits the population into the old one (intent / history / goal / company)
  and the one the change added. The interview-FIRST surfaces did not move:
  `isInterviewPerson` still reads the hiring signal, and a person with none
  still gets today's product byte for byte (tests/interview-first.test.js).
  Second change the same day: "Unlock Pro" on a locked mock card opens the
  price modal directly instead of the cold-start gate — a click on a price
  button is a request, not a collision (see the cold-start entry).
- **Claimed** 2026-09-16, written and baselined before the flip · flag
  `features.intentRouting` flipped 2026-09-16 (the 09-13 task stalled before
  writing anything) · **flipped at 2026-09-15T22:18Z** (b33df19 pushed;
  01:18 on 09-16 Istanbul time). The read window starts there, never at
  `min(created_at)`.
- **Change** the flag, built and shipped dark 2026-09-12, turns on three
  things already in the code: (1) `applyIntentRouting` — an interview /
  job_ready answer to the post-first-solve intent modal sets the Practice path
  filter to the whole bank and applies the company from
  `sqlquest_arrival_src`, and fires `intent_routed {intent, company, source}`;
  it does not move the person to the Interview tab. (2) A third primary-nav
  tab, **Interview** (`data-onboarding="nav-trials"`), shown only when
  `shouldShowInterviewNav` holds (`src/utils/interview-nav.js`): flag on, at
  least one solve, and one of declared intent interview/job_ready, interview
  history, the `interview-prep` Coach goal, or a `company:` arrival. Nobody
  else sees it. (3) `interview_tab_viewed` (once per user per day; `entry`,
  `reason`, `intent`, `solvedCount`, `hasHistory`), `interview_started`,
  `interview_completed` (both with `interviewId`). Nothing about what the tab
  shows or locks changes.
- **Why now** the Interview Prep surface had no navigation entry from
  2026-05-19 on — reachable only by `?interview=` deep link or one onboarding
  branch — and 22 accounts carry any interview history, lifetime. Meanwhile
  176 people in 30 days told the intent modal they are here for an interview
  or a job, under copy that promises "Your answer shapes what we recommend
  next", and the answer shaped nothing. The founder chose this over roadmapV2
  on 2026-09-12 as the one change on this stretch.
- **Metric** `interview_reach` (docs/agent/metrics.md) → `reached_tab`
  people in the 30 days after the flip time, split by `reason` (history /
  intent / goal / company) and by intent arm (interview vs job_ready).
  **Secondary** `started_a_mock`, `finished_a_mock`, and
  `content_lock_reached` people with `surface='interview'`. The lock count is
  expected to rise: that is the surface being reached, not a paywall change —
  seven of the eight mocks were already Pro-locked, and the wall is untouched.
- **Baseline** 30 days ending at the flip (queried at ~22:15Z on 2026-09-15,
  three minutes before the 22:18Z push, over the window 2026-08-16 22:30Z →
  2026-09-15 22:30Z, so in effect 30 days to the flip; internal accounts
  excluded; people by `aid`, latest `intent_captured` per person):
  - `reach_6_rate`, **routed arm** (interview + job_ready): **49.4%** (87 of
    176) — interview 46.6% (41/88), job_ready 52.3% (46/88).
    **Control arm** (learning): **43.1%** (28 of 65). (exploring, not an arm:
    44.2%, 34/77.)
  - People who captured each intent: interview **88**, job_ready **88**,
    learning **65**, exploring 77.
  - `content_lock_reached` with `surface='interview'`: **2 people** in 30
    days, **0** of them in the routed arm (one of the two is an
    Europe/Istanbul desktop deep link on 09-13 21:58Z, very likely QA).
  - Pro modal shown → checkout clicked, routed arm: **91 shown, 5 clicked
    (5.5%)** — interview 43 → 3, job_ready 48 → 2. Recorded as a guardrail
    context only; nothing here touches the modal.
  - Interview-surface reach before the flip is a **stock, not a flow: 22
    accounts lifetime** with any interview history
    (docs/designs/hiring-readiness-module.md). The three events did not exist
    in production before the flip, so there is no 30-day baseline for them and
    none is invented. One `interview_tab_viewed` row predates the flip (09-13
    21:58Z, `entry='deeplink'`, the same Istanbul aid as above): the event
    fires on deep links whether or not the flag is on, which is why the
    mechanism check below keys on `entry='nav'`.
- **Mechanism check** within a day of the flip: `intent_routed` rows appear
  and track `intent_captured` for the two hiring intents, and
  `interview_tab_viewed` rows appear with `entry='nav'`. Split `intent_routed`
  by `source` from the start — `'ask'` from the post-solve modal, `'intake'`
  from the onboarding intake, which may flip later today by its own task (see
  Confounds). If either the `'ask'` rows or the `nav` rows are absent, the
  flag did not reach the surface and the read is UNREADABLE — check the
  served bundle before anything else.
- **Guardrails** `first_contact_activation` must not move (structurally it
  cannot: the intent ask fires after the first solve and the tab needs a
  solve; read it anyway). Routed arm `reach_6_rate` must not fall more than 3
  points below 49.4%; control arm `reach_6_rate` must stay inside 43.1% ± 3.
- **Target** at least **60 people reach the tab** in the 30 days after the
  flip time (the design doc's own line: under 60 means routing did not solve
  discovery and the door is somewhere else) **AND at least 25 of them start a
  mock**.
- **Read on** **2026-10-16** — flip plus 30 days (window 2026-09-15T22:18Z →
  2026-10-15T22:18Z). It was 2026-10-13 when the
  flip was planned for 09-13; the scheduled run that day measured baselines
  and stalled before writing anything, so the flag flipped three days late
  and the 30-day window moves with it.
- **Falsification, stated in advance:**
  (a) fewer than 60 reach the tab → the gate is the constraint or the intent
  ask is not reaching people; the next move is the intent ask's own reach,
  not the tab.
  (b) 60 or more reach but fewer than 15 start a mock → the eight-item list is
  the wrong landing (the design doc's open question: seven of eight mocks are
  generic); the next move is landing a routed person on their company's mock.
  (c) routed arm `reach_6_rate` down 5 points or more → the tab pulls
  second-solve users off the ladder; move it behind the sixth solve.
- **Confounds**
  - **The 105-opener read was extended** to 2026-09-20 (verdict (c),
    59.6% on n=94). This flips anyway: it cannot touch first contacts.
  - **Cold start** ("cold start: nobody is asked to pay before they have
    solved anything", reads 09-29): the tab cannot enter its denominator —
    there is no tab at zero solves.
  - **Paywall surfaces** ("paywall surfaces: lead people to the free Hard
    previews", 09-20): its primary `preview_open_to_solve` is stamp-based and
    cannot be touched by this.
  - **Onboarding intake** (flag `onboardingIntake`, ledger claim "onboarding
    intake: three optional questions before the quiz", built 2026-09-12, off)
    flips by the scheduled task `flip-onboarding-intake` — on 2026-09-16 if
    the 105 read closed, otherwise after the extended read; as of this
    writing that read is extended, so not before 09-21. It writes the same
    intent key BEFORE the first solve and applies `applyIntentRouting` after
    the first solve with `source='intake'`. `intent_routed` carries `source`
    ('ask' / 'intake') and `interview_tab_viewed` carries `reason`; the read
    must split by both and never sum across the intake flip time.
  - **roadmapV2** stays off (amended below); nothing else on the Practice
    path filter changes in the window.
  - **Interview-first** (2026-09-17, flag `interviewFirst`, flips 09-21 with
    `interviewCountdown`; ledger "interview-first: the plan is the product
    for people with a date"): from 09-21 a routed person also sees the
    countdown card first on the Coach and none of the game surfaces. The
    10-16 read of this entry is therefore the read of the interview-first
    batch, not of the tab alone (docs/plans/interview-first-2026-09-17.md);
    split the window at the 09-21 flip time and never sum across it.
- **Verdict** **HIT** (B2, read 2026-11-22 over 09-15 22:18Z → 10-15 22:18Z, bots out): **221 people reached the Interview tab** (196 from the nav) against ≥ 60 — 133 by `reason='open'` (the 09-20 amendment's population), the rest by the original reasons (intent 88, history 11, goal 3); **61 started a mock** (≥ 25), 33 finished. `intent_routed`: 215 people from the ask, 225 from links, 1 from the intake. Guardrails, reach-6 among people with a solve: routed arm **47.0%** (119 / 253) vs 49.4% — inside the 3-point line; control (learning) **39.4%** (41 / 104) vs 43.1% — 3.7 down, just outside ±3, in the window the ten-solve quota flipped (09-25), which caps every arm. No split at 09-21: `interviewFirst` never flipped (its entry above).

### the recommended path stops hand-listing 38 of 287 challenges
- **Claimed** 2026-09-09, **shipped behind `features.roadmapV2 = false`**.
  The claim is written now, before the flag is flipped, because a target
  invented after seeing the data is not a target.
- **Why now** `SQL_ROADMAP_STAGES` hand-listed 38 challenge ids, and the
  Practice tab's path filter defaults to `'recommended'`, which resolves to the
  user's *current* stage. So the default view of a 287-challenge bank showed
  between 2 and 7 challenges. Measured 2026-09-09 across 299 engaged users
  (5+ solves): **66.1% of every solve lands on those 38 ids**, and the average
  engaged user has solved **17.1 of 213 free challenges**. No sector challenge
  (200-299) was reachable from any stage, and String Functions and Date
  Functions — two of the nine canonical skills — had no stage at all.
- **Change** `src/utils/roadmap.js` grows each stage from the live bank by the
  stage's own canonical skills and a difficulty ceiling, plus two new stages for
  the two missing skills. Verified in the browser: 38 → **134 of the 219 free
  challenges**, Foundations 2 → 14 exercises, 20 sector challenges reachable.
  Curated ids stay first in their authored order (prefix test + mutation test),
  so first contact is untouched.
- **Metric** `reach_6_rate` — of people who solve at least one challenge in the
  window, the share who reach six distinct solves. Six is the rung the milestone
  modal fires on and the only surface that has produced a sale since 07-23, so
  it is the activation number that touches revenue.
  **Baseline: 47.4% (149 of 314), 30 days to 2026-09-09, people by `aid`.**
- **Mechanism check, and it must pass before the outcome is read:**
  `share_of_solves_on_the_38` must fall from **66.1%**. If it does not, the
  wider path never reached anybody and the outcome number is measuring traffic
  mix. Same shape as the 105 claim's `first_contact_share(99)` check.
- **Control** first-contact activation must not move. This change appends only;
  it never reorders a curated id and never touches `FIRST_RUN_PATHS`. If first
  contacts move at all, something appended is being served as an opener and the
  change is not what it claims to be.
- **Target** `reach_6_rate` ≥ **55%** at n ≥ 250 solvers, with
  `share_of_solves_on_the_38` below 50%.
- **Read on** **2026-10-13**, and not before — the flag cannot be flipped until
  the 105-opener claim reads on 09-13, because both act on the same stretch of
  funnel. Thirty days of post-flip data from a 09-13 flip lands on 10-13.
- **Falsification, stated in advance:**
  (a) `reach_6_rate` ≥ 55% with the mechanism check passing → discoverability
  was a real constraint on depth; next is raising the per-stage cap of 14 and
  giving the two new stages lessons.
  (b) mechanism passes, `reach_6_rate` within ±3 points of 47.4% → **people were
  not short of findable work.** This is the outcome I expect to be most likely,
  because the nine users who cleared 30+ of the 38 all found their way off the
  roadmap unaided, averaging 44 off-roadmap solves. Keep the change on
  correctness grounds — 85% of the bank being unreachable by default is a defect
  either way — and stop spending on discoverability. The next lever is the goal
  picker: 230 people were shown it in 30 days and **51 set a goal**, and goal
  setters reach six solves at 68.6% against 35.2% for people who saw the picker
  and did not. That gap is confounded by self-selection and is the largest
  unexplained gap in the funnel.
  (c) mechanism fails → UNREADABLE, the flag did not reach the surface. Check
  the three render sites that read the stage list; two of them were reading the
  raw constant on 2026-09-09 and the flag did nothing there until it was fixed.
- **Confounds** none intended — it ships alone, after the 105 read closes. If
  anything else lands on the Practice tab in the read window, say so here.
- **Amended 2026-09-16 — not flipped.** The founder chose intentRouting on
  09-12 as the one change on this stretch of funnel. The read date is void
  until the flag flips; recompute as flip plus 30 days.
- **Verdict** **NOT FLIPPED — nothing to read** (B2, checked 2026-11-22): `roadmapV2` is still `false` on main (the 09-16 amendment). The read date is void; a new one is set on the day it flips.

### subscription management hands off to Stripe — no more client-side "cancel"
- **Claimed** 2026-09-03 — correctness + measurement, no target on purpose
- **Change** the "Auto-Renew ON/OFF" toggle (Pro panel and profile) flipped
  a localStorage flag and never reached Stripe — a user who clicked it saw
  "your subscription will not renew" while the card kept being charged;
  "reactivate" granted 30 Pro days client-side with no payment. Both now
  open Stripe's Customer Portal (`STRIPE_CUSTOMER_PORTAL_URL` — empty
  09-03..09-07; the no-code link was activated in Stripe on 2026-09-07 with
  cancel-at-period-end on, and ships with the next deploy, so `portal=true`
  rows exist only from that deploy on) or a pre-filled support@ email,
  and write `manage_subscription_clicked` {intent, portal}. Found while
  building the cancel path payer #2 asked for; the localhost analytics
  guard (D10) shipped in the same commit.
- **Metric** `manage_subscription_clicked` people, 30 days — how many Pro
  users look for the door, and via which route. Baseline unknown: the old
  toggle recorded nothing. No target — the count decides whether the portal
  link is worth its setup, and the honest hand-off is the floor either way.
- **Read on** 2026-10-03
- **Falsification** none that would revert this: a client-side "cancel"
  that lies is not an option to go back to. The read only ranks the portal
  link against other work.
- **Verdict** **READ, no target — the door works** (B2, read 2026-11-22): 0 `manage_subscription_clicked` rows in the window to 10-03; since then **4 people** (5 rows), all `intent='cancel'` with `portal=true` (10-06 → 11-17), and the webhook wrote 4 `pro_trial_cancelled {scheduled}` in the same weeks — each press reached Stripe. The portal link earned its setup.

### working-track opener: 105 replaces 99 as the first contact
- **Claimed** 2026-09-02
- **Change** every `'working'` first-run track (`FIRST_RUN_PATHS` zero /
  interview / business / weak-spots) and the `FIRST_RUN_LEVELS` fallback now
  open on **105 "Your First JOIN"**; 99 drops to step 2. All five moved
  together — the 08-06 note records that fixing one list "looked right and
  changed nothing" because the tracks override the level.
- **Why now** 99 is the front door for **52% of all first contacts** (221 of
  425, 28 days to 09-02) and activates **47.1%** of them. Its track siblings
  read 73-83% solve-through as later steps (105: 82.7%, 100: 77%, 98: 73%).
  Last-7 overall activation fell to 37% (67/179) from 52% the week before;
  this seat is the largest single leak in the funnel.
- **The trap, stated before the read:** this seat has been swapped once
  already. On 08-06, 100 activated 27% as the opener and 99 read 85% as a
  later step, so 99 was moved in front — and fell to 47%, while 100,
  demoted, now reads 77%. The seat may be what's hard (the 'working'
  self-placement collects over-claimers and cold bouncers), not the
  challenge. This claim is designed to tell those two apart.
- **Metric** `first_contact_activation(105)` — 105 in the opener seat.
  Baseline for the seat: 99 at **47.1%** (n=221). Mechanism check:
  `first_contact_share(99)` must fall from 52% toward zero and 105's share
  rise to match; if it does not, the change never reached the front door.
- **Also** overall `first_contact_activation` (last-7) — baseline **37%**.
  Control: 91 as the brand-new opener, 71% (n=45) — should not move.
- **Target** 105 as opener ≥ **60%** activation at n ≥ 60; overall last-7
  activation ≥ 48%.
- **Read on** **2026-09-13** — deployed 2026-09-06 13:42Z (Vercel, verified
  live: `[105,99,100,98]` in the served bundle); the 09-09 date written at
  claim time is void, the change sat unpushed until 09-06.
- **Amended 2026-09-06, before deploy, after one more week of baseline:**
  with NO code change live, 99-as-opener read 48.6% (n=72) one week and
  63.3% (n=79) the next, and overall activation swung 36% → 58%, because
  the low-intent `(none)`-door surge of 08-23→30 receded. The seat-level
  metric moves ~15 points with traffic mix alone. So: (i) baseline is the
  **28-day** figure, 47.1%, not one week; (ii) the same-week **91 control**
  is part of the verdict — if 91 moved ≥ 10 points in the read week, the
  week is a mix week and the read is UNREADABLE-mix, extend; (iii) n ≥ 60
  first contacts on 105 before any verdict. Thresholds below unchanged.
- **Pre-read note, 2026-09-11 (two days early, deliberately written BEFORE the
  read so it cannot be selected afterwards).** Both target conditions are
  currently met and one of them hides a tension:
  - 105 as opener: **61.3%** activation, n=**75**. Target was ≥60% at n≥60, so
    both halves clear. 99 no longer appears in the opener seat at all, which
    confirms the swap took mechanically.
  - Overall last-7 activation: **53.7%** (94/175). Target was ≥48%, so it
    clears.
  - **But the seven days BEFORE the deploy read 57.2%** (83/145), and the
    window since the deploy reads 52.1% (76/146). So the site-wide number did
    not rise — it drifted down — while 105's own seat performs well above the
    line it was given.
  The honest reading on 09-13 is therefore not a clean HIT on both halves. 105
  beat its target in its seat; the funnel it sits in did not improve. Decide on
  09-13 whether the claim's second condition (≥48% overall) was too weak to be
  informative, and say so in the verdict rather than banking a number that
  passed a bar set below the prior week's actual.
- **Falsification, two-sided, stated in advance:**
  (a) 105-as-opener ≥ 60% → the *challenge* was the constraint: 99's
  five-column exact-alias prompt is too much for a first contact. Keep 105
  in front, rewrite 99 for step 2.
  (b) 105-as-opener ≤ 50%, i.e. within noise of 99's 47% → the *seat* is
  the constraint. **Do not swap a third time.** The next move is the entry
  experience of the 'working' level itself: a placement check instead of a
  self-report, or a lesson-first ramp like brand-new gets.
  (c) 50-60% → inconclusive; extend one week, no other change to the track.
- **Confounds** (i) The grader-ordering fix (`20a5779`) ships in the same
  push. 105's solution carries a top-level ORDER BY, so its grading is
  unchanged by that fix; 99's result is a single row, so it is unchanged
  too. Overall activation could still get a small lift from other unordered
  first contacts — read 105-as-opener as the primary, overall as secondary.
  (ii) Traffic mix is shifting fast (+51% new people, `(none)` door 22→92);
  the seat-level read is mix-independent, the overall rate is not.
  (iii) Added 2026-09-12, the evening before the read: guest progress now
  survives a reload (ledger: "anonymous progress survives the reload").
  Returning browsers keep their solves and no longer re-run the opener; a
  first contact is an aid's FIRST `challenge_opened`, which such a browser
  already had, so neither the seat metric nor its denominator moves. Said
  here so the read does not discover it.
- **Mechanism check, 2026-09-09 (NOT a verdict).** Run early on purpose: if
  the deploy had not reached the front door there would still have been time
  to fix it before the read window closed. It reached it. Since the 09-06
  13:42Z deploy, **105 holds 37.4% of first contacts (40 of 107)** and **99
  no longer appears in the top twelve** — its 52% share is gone, which is
  exactly the substitution the metric demanded. Control 91 reads 75% (n=8)
  against its 71% baseline, inside the ±10 mix band, but n=8 cannot carry
  that test and the real control reading is due on 09-13.
  **n=40 of the required 60**, accumulated in three days, so 60 arrives
  around 09-11 and the 09-13 date holds. 105-as-opener is running at 55.0%,
  which is inside the (c) inconclusive band and **is not to be acted on** —
  the claim fixed n≥60 in advance and 40 is not 60. Recorded so the read is
  known to be readable, not to pre-empt it.
- **Verdict** INCONCLUSIVE, falsification branch (c) — **EXTENDED one week,
  extended read date 2026-09-20.** Not a closed word, and not rounded up.
  Read 2026-09-16 on the fixed window 2026-09-06 13:42Z → 2026-09-13 13:42Z
  (the 09-13 run stalled before writing; the window was not widened), solves
  counted up to the window close — what the read would have seen on the day.
  - **105 as opener: 59.6%** (56 of **94**; n ≥ 60 holds). Below the 60% line
    by less than one person. Counting solves that landed after the close it
    is 60.6% (57/94) — the extra one is a guest who started 09-12 11:38Z and
    first solved 09-13 21:53Z, eight hours after the read time. That does not
    count: the rule was fixed in advance and one late solve on n=94 is not
    information either way. Against the 28-day baseline for the seat (99,
    47.1%) it is +12.5 points; against 99 in the seat the week before the
    deploy (**63.4%**, 52/82) it is −3.8 — the ±15-point mix swing the 09-06
    amendment warned about, sitting on both sides of the same number.
  - **Mechanism: passed.** First-contact share since the deploy: 99 **0.5%**
    (1 of 184; 53.9% the week before, 82/152), 105 **51.1%** (94/184; 1.3%
    the week before). The swap reached the front door completely.
  - **Control 91: 72.7%** (8/11) against its 71% baseline — inside ±10, so
    by the rule this is not a mix week. n=11 cannot carry that test well; the
    week before read 81.3% (13/16), −8.6 against that, still inside the band.
  - **Overall last-7: 50.0%** (92/184). It clears the 48% target and says
    nothing by doing so: the week before the deploy read **58.6%** (89/152 on
    today's recount; 57.2%, 83/145, in the 09-11 note — late-arriving rows),
    so the site-wide rate fell 8.6 points while the seat rose against its
    baseline. The 48% bar was set against a one-week 37% that had already
    receded by deploy day; it was below the prior week's actual and was too
    weak to be informative. Recorded as passed-but-uninformative, not as half
    a HIT. Part of the fall is the tail: openers other than 105 and 91 went
    from 44.4% (24/54) to 35.4% (28/79) as deep-linked first contacts
    (question and company pages, 09-13) grew.
  - **Extension, stated before the data:** read on **2026-09-20** on the
    cumulative window 2026-09-06 13:42Z → 2026-09-20 13:42Z, solves counted to
    the close, second week also reported alone; same thresholds (a)/(b)/(c),
    same 91 control, no other change to the track. Known in that week:
    `intentRouting` flips 2026-09-16 (post-first-solve only, cannot reach an
    opener); the homepage (`personalized_v1`, 09-13) shifts the mix, which is
    what the control is for. `onboardingIntake` does NOT flip while this read
    is open — its task waits on this entry.
- **Verdict, extended read (due 2026-09-20), B2 2026-11-22: UNREADABLE-mix by its own rule — closed.** Cumulative 09-06 13:42Z → 09-20 13:42Z: 105 as opener **61.7% (113 of 183)**, the second week alone 62.9% (56 of 89) — above 60% at n ≥ 60. But the control rule was fixed in advance: 91 read **88.9% (16 of 18) in the second week**, +17.9 against its 71% baseline (cumulative 82.8%, 24 / 29), so it is a mix week. Not extended again: from 09-25 the first-screen test sent half of new people straight into challenge 91, and from 11-22 all of them, so the 'working' opener seat no longer gets the first contacts this claim measured. 105 stays in front; nothing argues for a third swap.

---

## Closed

### the /vs-datalemur/ snippet fits the result (the "datalemur" zero-click query) — **FLAT**

- **Claimed** 2026-10-11 · **Shipped** on the founder's ask in chat ("datalemur
  title ve meta'yı düzelt") · **Read** 2026-11-09 (ship + 28 days, GSC's own
  lag included).
- **Change** /vs-datalemur/'s title 72 → 65 characters ("DataLemur SQL
  Practice: Is It Free? Pricing (2026)"), description 300 → 145 (DataLemur's
  $15/mo · $60/yr from docs/reads/alternatives-facts-2026-09-13.md, said to
  come from a competitor), og/twitter equal to both. Body untouched. Bound by
  tests/snippet-length.test.js like the five pages of 09-29.
- **Why** GSC weekly 09-28 → 10-04: "datalemur" 381 impressions at 5.2 and
  "data lemur sql" 136 at 6.7, zero clicks on both; the page has 979
  impressions at 5.7. The old title was cut at ~60 characters and the
  description at ~160 of 300. Caveat written now: "datalemur" is a
  navigational query, most of its searchers want datalemur.com, so a
  ceiling of a few percent CTR is the honest expectation.
- **Metric** `gsc_position` (metrics.md), read per query on the
  [query, page] slice of `gsc_daily`: clicks and CTR of "datalemur" +
  "data lemur sql" + "datalemur sql practice" to /vs-datalemur/, 28 days
  after vs the 28 days before 2026-10-11.
- **Target** ≥ 1% CTR on those three queries combined (from 0 on ~550
  impressions a week), position no worse than 1.0 down.
- **Falsification, stated in advance:** still zero clicks at ≥ 1,500
  impressions → the snippet was not the cause; the query is navigational
  and the page is not worth more title work. Position down > 2 → revert the
  title (the old one carried "Free Tier" and "SQL Practice" both).
- **Verdict** **FLAT**, read 2026-11-19 on `gsc_daily` [query, page],
  28 days each side of 10-11 (09-13 → 10-10 vs 10-11 → 11-08). The three
  claimed queries: 1,853 → 1,836 impressions, 0 → 3 clicks (CTR 0% →
  0.16%; target was ≥ 1%). "datalemur" position 5.6 → 6.8 (down 1.2, inside
  the 2-place revert line). Three clicks on ~1,800 impressions is inside
  noise, not a move. Outside the claim, "datalemur sql" went 5 → 0 clicks
  (1,456 → 1,029 impressions), which this change may or may not have
  caused. **Conclusion, as the falsification said:** the query is
  navigational; no more title work on /vs-datalemur/. The title stays (no
  revert: position held inside the line).
  An earlier read of the same claim (2026-11-13, docs/reads/seo-2026-11-13.md
  §3, same numbers to within a day's window) labelled it MISS. Same
  conclusion; FLAT is the label the verdict table gives three clicks on
  ~1,800 impressions (inside noise, not a move the wrong way). One entry kept.

### hand-written founder check-ins replace the automated engagement email — **UNREADABLE**
- **Claimed** 2026-08-21 (design: `cgozdemm-main-design-20260818-013802.md`)
- **Metric** `outreach_replies` — baseline **0** (never sent before today)
- **Target** 3 replies from the first 10 hand-written emails
- **Read on** 2026-09-01
- **Falsification, stated in advance:** fewer than 2 replies from 10 means the
  problem is not the channel or the wording — these users do not want to talk
  to us, and the paywall decision gets made from behavioural data alone.
- **Send log:**
  - 2026-08-21 · Digvijay (guest, feedback #4/#5, schema-columns report) —
    reply confirming the bug + fix shipped, one question
  - 2026-08-21 · sagepati (feedback #3, layout overload) — honest no-fix-yet,
    one question (what were you trying to do)
  - 2026-08-25 · sab3r (payer #2 — first funnel-sourced sale) — thank-you +
    one question: "what was the moment you decided it was worth paying?"
    Answer tests the milestone/momentum theory directly.
  - 2026-09-02 08:50Z · jeromezhao (payer #3 — second milestone-modal sale,
    32s from modal to purchase, arrivalSrc='home') — thank-you + one
    question: "what brought you to SQL Quest?" — the channel, the one thing
    the data cannot show. Sent to an Apple Hide-My-Email relay address.
- **REPLY #1 — 2026-08-25 20:17Z, sab3r, ~24h after send.** Verbatim core:
  enjoyed "the UI and the progression of questions and wanted to unlock the
  harder questions. Hence bought it!!", "Have an interview coming up so I
  needed the practice", and "AI recommended me to the site — you must have
  some good GenAI SEO". Three decision-grade facts: (1) purchase MOTIVE was
  Hard access — the milestone modal was the moment, Hard unlock was the why;
  do not give Hard away on the DataLemur argument without weighing this.
  (2) Deadline intent (interview) was the accelerant. (3) Acquisition channel
  was an AI assistant's recommendation — invisible in analytics: his
  arrivalSrc reads 'home' because AI apps strip referrers. GenAI-recommended
  traffic hides inside the 'home' door; today's record 95-person day with
  flat landing traffic is consistent with more of it.
- **Thread continued (2026-08-26/27):** sab3r is cancelling — reason stated
  plainly: "not too well on money right now", NOT product dissatisfaction;
  will keep practicing through the paid month and "spread the word". He then
  had to EMAIL to cancel: **there is no self-serve cancellation path in the
  app** (his screenshot shows him looking for one). Product gap logged in
  TODOS.md — for a US customer this also touches the FTC click-to-cancel
  rule. Churn effective 2026-09-22; MRR returns to Serge-only after that.
  Handled by founder: cancel-at-period-end in the Stripe dashboard.
- **REPLY #2 — 2026-08-28 02:00Z, sab3r, 3 minutes after the cancellation
  confirmation.** Unprompted product feedback plus channel detail:
  (1) **"The grader is too strict sometimes on ordering. Some questions
  prompts don't specify the correct order. That's my only complaint."**
  Confirmed in code the same night: every grader compares
  `JSON.stringify(values)` strictly — main challenge (`app.jsx` ~20134),
  speed run (~7690), interview (~8865), daily (~19236) — so row order always
  matters even when neither the prompt nor the solution demands an ORDER BY.
  A paying user was told "wrong" for correct queries. Logged in TODOS.md.
  (2) AI tutor "a little erroneous" — he attributes it to the model, low
  heat. (3) **Retention despite churn:** "will definitely be using it even
  after my subscription ends" — the free tier keeps him as a user and a
  word-spreader. (4) **Channel named:** the AI that sent him was **Gemini**,
  and the query context was **analytics prep** — first time the GenAI channel
  has a vendor and a query space attached, not just "AI recommended".
- **Read** 2026-09-07 (due 09-01; read six days late, by hand — the verifier
  is still not installed). Gmail checked the same day.
- **Measured:** 4 emails sent, not 10 — 08-21 ×2 (Digvijay, sagepati; both
  feedback-widget users), 08-25 (sab3r, payer #2), 09-02 (jeromezhao, payer
  #3, Apple Hide-My-Email relay). Replies: **1 person of 4** — sab3r, five
  messages across two threads. Digvijay, sagepati and jeromezhao: silent as of
  09-07 (17, 17 and 5 days). Only 3 of the 4 were sent by the read date.
- **Verdict** UNREADABLE — n. The target ("3 of the first 10") and the
  falsifier ("fewer than 2 of 10") were both written on a denominator that was
  never sent; 1/4 sits between them and, at this n, nothing separates the two
  readings. What the read did produce, and no counter captures: the one reply
  carried four decision-grade facts (purchase motive = Hard access; deadline
  intent; the Gemini / analytics-prep channel; the strict-ordering grader
  bug), exposed the missing self-serve cancel path, and led to three shipped
  fixes (unordered grader 08-28, tie-tolerant grader 09-06, cancel path 09-06).
  The value of this channel is in the *content* of a reply, not the count.
- **Decision:** the ritual stays as a standing practice — one hand-written
  email after every purchase and every feedback-widget message, send log
  continued here — but it carries no metric claim. Re-open as a claim only
  once 10 sends have accumulated, same 3/10 line, read 30 days after the
  tenth send. Sends 5 and 6, both 2026-09-07, both by the founder from
  goktug@datrick.com: sab3r (in-thread — cancel path and the tie-tolerant
  grader are live, one question: what did you ask Gemini) and hakko504
  (new thread — feedback #6, challenge 121 tie order fixed, one question:
  did the grader fight you elsewhere). Six sends now; re-open the claim as
  written after the tenth.
- **REPLY #3 — 2026-09-07 10:57Z, sab3r**, two hours after the founder asked
  what he had actually typed into Gemini. Verbatim core: *"I asked it about
  the company I am interviewing for and it pointed me to SQL Quest."* The
  trigger is a **company-name interview query**, not the generic "analytics
  prep" phrasing recorded on 2026-08-28 — that was his paraphrase, this is
  the query shape. Decision-grade, because it says which of our pages the
  channel actually feeds: the 23 company pages, not the homepage and not the
  comparison hub. It also raises the value of the Capital One work (page,
  card-transaction challenges, CodeSignal mock) from "the payers asked for
  it" to "this is the query shape an assistant answers". Gemini still cannot
  be probed (personalised UI), so this reply is the only evidence of its
  behaviour we will get; treat it as n=1 and do not model a rate from it.
- **Review invitations, 2026-09-07 — logged here, deliberately NOT counted
  toward the 3/10 line.** Four hand-written emails went out the same day
  asking for a public Trustpilot review: sab3r (in-thread, he had offered to
  spread the word), tausif1122 (114 solves, 20-day streak, the longest active
  streak on the site), luciej (105 solves, 14-day streak) and supertrunker
  (102 solves, active the day before). Selected on **usage, not on predicted
  sentiment** — screening for who is likely to be positive before inviting is
  the manipulation regulators name, and inviting the heaviest users is not.
  No incentive offered, no wording suggested, and each says plainly that an
  honest criticism is welcome and that there will be no follow-up.
  They are excluded from `outreach_replies` because the ask is different in
  kind: "answer my question" and "please review us" do not share a reply
  rate, and folding them into one denominator would make both unreadable.
  Their own measurement is the `review_ask` claim (read 2026-10-08).
  hakko504 and adinajoshi were deliberately left out — both had already
  received a different email from the founder that day.

### /sql-exercises/ on Google — the page that ranks 6 on Bing and 24.5 here — **OPEN**
- **Claimed** 2026-09-11 · **Read** 2026-10-12
- **The observation that opened it:** the same page, same content, ranks
  **6.36 on Bing with 11,400 impressions and 489 clicks** and **24.5 on Google
  with 1,250 impressions and 20 clicks** over the same three months. Rank
  governs how often you are shown at all, so Google gives our best door nine
  times fewer impressions than Bing does. Every other page of ours sits at
  Google 6.7-13.2; this one is the outlier, and it is the one that matters.
- **Change** two things shipped 2026-09-11, both cheap and both aimed here:
  internal links to the page went **31 → 132 of 141 pages** (it had fewer than
  `terms.html`), and its title now carries "practice questions", the phrase
  that was our largest Bing query and appeared nowhere on the page.
- **Metric** `gsc_position('/sql-exercises/')` — baseline **24.5**
  (1,250 impressions, 20 clicks, 1.6% CTR, 3 months to 2026-09-08).
- **Target** ≤ **15** — the top of page two, i.e. evidence the page moved at
  all. Page one is not a 30-day ask.
- **Falsification** still above **22** → internal links and title were not what
  was holding it, the constraint is domain authority, and the honest response is
  that `docs/plans/backlinks-2026-09-11.md` is the only remaining lever and it
  runs in quarters. Say that rather than shipping another title.
- **Note on what is NOT being claimed:** the site-wide average position of 15.7
  is an artifact of 17,029 competitor-brand impressions at 0% CTR and is not a
  target. See `docs/reads/google-position-2026-09-11.md`.

### Bing T1 — /sql-exercises/ answers the query it actually ranks for — **OPEN**
- **Claimed** 2026-09-11 · **Read** 2026-10-09 (with O1's day-30 checkpoint)
- **Change** title / og / twitter / meta description / h1 on
  `src/sql-exercises.html` now carry "practice questions" alongside
  "exercises". Reason, from the first Bing Webmaster Tools read ever done on
  this site: our single largest query is **`sql practice questions`, 1,200
  impressions at position 7.44 and 2.93% CTR**, and the phrase appeared **zero
  times** on the page it ranks. Exact-word queries against the same page clear
  8.07% (`sql exercises`), 16.30% (`sql exercises for practice`) and 27.91%
  (`sql practice problems`).
- **Metric** `bing_page_ctr('/sql-exercises/')` — baseline **4.28%** at
  position 6.36 (11.4K impressions, 489 clicks, 3 months to 2026-09-08).
- **Target** ≥ **6.0%** over the 21 days after propagation.
- **Guardrail** landing→solve for the page must not fall. A broader title that
  buys clicks from people who bounce has cost us, not earned.
- **Falsification** below **5.0%** → the title was not the constraint and the
  position is, which is a slower and different job (links, not words). Say so
  and stop editing titles on this page.
- **Confound, stated in advance** this is the door feeding `door_solve_rate`
  and, indirectly, the 09-29 cold-start read. Bing title propagation runs 1-3
  weeks, so the effect should land after that read closes. If the cold-start
  numbers move oddly in early October, check here first.

### Bing T2 — the competitor-brand queries we rank for and never convert — **OPEN**
- **Claimed** 2026-09-11 · **Read** 2026-10-12
- **Change** `/vs-datalemur/` retitled from "SQL Quest vs DataLemur: …" to
  "Is DataLemur Free? 2026 Pricing, Free Tier & SQL Practice". Someone
  searching a competitor's name is not looking for ours, and a title that
  opens with ours reads as an advertisement. The description now discloses in
  its own words that a competitor wrote the page, which the old title did
  implicitly and the new one does not.
- **Metric** clicks on `datalemur`, `datalemur sql practice`, `sql bolt
  exercises`, `sqlzoo practice exercises` — baseline **0 clicks against 452
  impressions** across 3 months, positions 6.91-8.68.
- **Target** ≥ **15 clicks** in 30 days.
- **Falsification** under **5** → competitor-brand searchers do not leave for
  a comparison page whatever the title says.
- **Amended the same day, and the amendment is the honest part.** The
  falsification above originally read "…and the two unbuilt pages (SQLBolt,
  SQLZoo) in the plan should not be built". The founder asked for both pages
  immediately, so this read no longer gates them and the claim is weaker for
  it: we now learn *from* those pages rather than *about* whether to build
  them. Shipped 2026-09-11 as `/vs-sqlbolt/` and `/vs-sqlzoo/`, with internal
  links in the same commit.
- **What the two new pages add to the read.** `sql bolt exercises` (74
  impressions, position 7.47, 0 clicks) and `sqlzoo practice exercises` (57,
  6.91, 0 clicks) currently rank on `/best-sql-practice-sites/` alone. Both now
  have a dedicated page whose title leads with the competitor's name. If those
  two queries move and the two DataLemur queries do not, the lever is a
  dedicated page, not a title — which is a more useful thing to learn than the
  original claim would have told us.
- **A note on what these pages could not argue.** SQLBolt and SQLZoo are both
  free with no paid tier, verified by fetching them on 2026-09-11. The free-tier
  comparison every other vs- page leads with does not exist here, so both pages
  say so in the first screen and argue the surrounding product instead. A
  comparison page that cannot find an honest advantage should say that rather
  than manufacture one.

### Bing T3 — get the other 44 pages into the index — **OPEN**
- **Claimed** 2026-09-11 · **Read** 2026-10-12
- **Change** `npm run indexnow -- --all` submitted all 87 sitemap URLs,
  HTTP 200. No quota on IndexNow; Bing's URL Submission holds 100/day in
  reserve, thirty times Google's.
- **Also submitted 2026-09-11 02:03** via Bing's URL Submission panel, which is
  a separate queue from IndexNow: `/vs-sqlbolt/` and `/vs-sqlzoo/`, the two new
  pages. Quota went 100 → 98, so both consumed a slot rather than only appearing
  in the table.
- **Metric** pages with ≥1 Bing impression — baseline **41 of 85 built pages**
  (3 months to 09-08). The two new pages raise the denominator to 87, so read
  the target against 87 rather than 85.
- **Target** ≥ **60**.
- **Falsification** under **50** → submission was never the constraint, and
  those pages have a quality or duplication problem. That is worth knowing
  before writing more of them, which is the whole reason this is a claim
  rather than a chore.

### schema columns on the challenge card (first-run shell had none) — **MISS**
- **Claimed** 2026-08-21 · **Read** 2026-08-30 (window 08-21→08-29 per protocol)
- **Change** `app.jsx` ~32022: the always-rendered "Tables used" card now lists
  each table's columns as chips. Root cause: the schema sidebar is gated behind
  `!showFirstRunSimpleShell`, and `isFirstRunUser = zero solves` — so the
  coldest users were the only ones who could not see any table's columns, on
  any viewport, and could not graduate out of the shell without the solve the
  missing schema was blocking. Reported by feedback #4/#5 (2026-08-18, mobile
  guest, 384px): "I dont see the input table columns".
- **Metric** `challenge_solve_through(99)` — baseline **46%** (39/85 openers,
  window 08-14→08-21). Target was ≥55%.
- **Measured:** 08-21→08-29: **43.8%** (42/96 openers). Through 08-30:
  44.8% (47/105). By calendar week: 08-16→23 45.9% (39/85), 08-23→30
  45.6% (36/79). Flat within noise — the fix did not move the metric.
- **Control:** 91 held at 73% (44/60) vs 73% baseline — the front door
  itself didn't shift, so this is not a cohort-mix artifact.
- **Verdict** MISS, per the falsification stated in advance: the missing
  schema was NOT the binding constraint on 99. Next candidate named at claim
  time: prompt complexity — 99 demands five computed columns with exact
  aliases and ROUND. Note: 99's solution is a single-row aggregate, so the
  2026-08-28 grader-ordering fix cannot move it either — whatever is failing
  people on 99 is in the writing of the query, not the comparison of results.
  The schema card stays (it is correct UX and cost nothing), but it earned no
  metric claim.
- **Amended 2026-09-11 — the verdict was right about its instrument and wrong
  about the change.** The fix removed the schema from *first-run users on any
  challenge*. `challenge_solve_through(99)` measures *one challenge, all
  users*, and 99's openers are mostly warm — the treated population barely
  appears in the denominator, so the metric could not have moved even if the
  fix worked perfectly. Re-read on `cold_first_solve_rate` (registered in
  metrics.md the same day, with the warm arm as a control): cold browsers went
  **39.7% → 46.0%** across this deploy (269/678 → 184/400, z = 2.0) while the
  warm control held at **86.8% → 85.4%**. The MISS process was sound — the
  falsification was written in advance and honoured — but the instrument was
  chosen badly ten days earlier. **A claim on a per-challenge metric cannot
  test a change scoped to a user state.** Match the instrument's population to
  the change's population before writing the target down. Full working:
  `docs/reads/signup-growth-cause-2026-09-11.md`.

### instrument the paid walls before moving them — **HIT**
- **Claimed** 2026-08-15 · **Read** 2026-08-21, one day early at the founder's
  request (6 of 7 collection days), by hand — verifier still not installed
- **Claim as made:** measurement-only; `lock_reach_rate` and
  `targeted_lock_share` baselines unknown, no target on purpose. Decision it
  feeds: the 2026-08-14 packaging call — move the wall off content and onto
  targeting (competitors give Hard away; LeetCode monetises company targeting).
- **Measured** (excluding the founder-test aid): **16 people** collided with a
  paid wall in 6 days, all on `challenge_hard` — 12 via `soft_toast` (browse),
  4 via `company_modal` (inside a deliberately-chosen company filter).
  47 raw events for those 16 people: the multi-fire defect (~3 events per
  click, 192ms apart) is real — **count people, never hits** until fixed.
- **`targeted_lock_share`:** 4/16 (25%) in company context. Weakest-skill
  match: 0 by exact string; **2/16 after resolving `category` through
  SKILL_TO_RADAR by hand** (both Joins). Combined targeted share ~25-37%.
  That is **LOW** — most wall-hitters are browsing the Hard list and bumping
  into locks, not arriving with specific intent.
- **But the targeted minority carries all the money signal.** The only Stripe
  checkout arrival ever measured (chaand, 08-18, monthly) was a wall-hitter:
  wall → offer → plan click → Stripe, end-to-end. 10 of 16 wall-hitters saw
  the offer afterward; 1 clicked.
- **The free-preview finding, the sharpest in the read:** **15 of 16 people
  hit a wall with all 6 free Hard previews untouched** — the previews are
  invisible where the collision happens. Exactly 1 person had used all 6 and
  came back for more; that profile is the strongest buy signal in the data.
- **Verdict** HIT — the instrumentation shipped, survived a week, and answered
  the question it was built to answer.
- **Decision, per the rule stated in advance:** the share is low, so **moving
  the wall now changes nothing** — people must first be LED to targeted
  moments. Build order confirmed: (1) surface the 6 free Hard previews at the
  collision point and in the Coach, (2) radar "remaining X are Hard"
  indicator, (3) only then revisit wall placement. Also fix the multi-fire
  before the next read.
- **Carried-forward exclusions:** founder-test aid
  `4a07da304d844d2e96795d4151699219` (the 08-15 verification click) and
  browse-session aid `d937d99161eb470a8ff28cce04f668eb` (08-21, Digvijay
  repro: `app_opened`, `challenge_opened` #91, first-run tour events — no lock
  clicks). Deploy was confirmed 08-16 against the production bundle.


### placement quiz tops out at 'working', not 'advanced' — **HIT**
- **Claimed** 2026-08-14 · **Read** 2026-08-21, on the date, by hand (verifier
  still not installed)
- **Claim as made:** `first_contact_share(1)` baseline **50.7%**, target below
  15%. Also `challenge_solve_through(91)` baseline 69% on 35 openers, target
  91 recovers >=35 openers/week.
- **Measured** (window 08-14 12:00Z → 08-21): challenge 1 first-contact share
  **50.7% → 8.6%** (14 of 163). Challenge 91: **64 openers** in the week
  (target >=35) at **73% solve-through** (47/64), up from the 66-69% band.
- **Verdict** HIT on both. The falsification test failed to fire: the share did
  not stay above 40%, so the quiz WAS the route feeding challenge 1 — the
  08-14 diagnosis was correct.
- **Read** The front door is now challenge **99** at **47.2%** of first
  contacts, converting **46%** as a first contact (39/85). Better than
  challenge 1's 24%, and consistent with the known "easy in context, hard as
  first contact" pattern already recorded in the working-track reorder entry.
  99-as-front-door is now the single worst conversion point among high-traffic
  challenges and is the natural next content fix — a follow-up, not a revert.

### offer gate stops trusting a stale proStatus flag — **UNREADABLE**
- **Claimed** 2026-08-07 · **Read** 2026-08-21, on the date, by hand (verifier
  still not installed)
- **Claim as made:** `engaged_never_asked` baseline **47**, target falls by at
  least 4 among 30d-active users. Scope stated in advance: recovers only the 4
  users whose trial expiry had already passed (apriwaymw, thurai, jhn_vinz,
  subhan); does not reach the auto-renew four.
- **Measured** `staleProRecovered` fired **0** times in 14 days. But all four
  in-scope users have emitted **zero events since 2026-07-10** — none returned
  at any point in the measurement window, so the gate never had a chance to
  fire. `engaged_never_asked` moved 47 → **53**, but the engaged denominator
  grew 127 → 152 over the same days; the raw count cannot carry a verdict.
- **Verdict** UNREADABLE — zero exposure, not zero effect. Per this file's own
  rule, not rounded to FLAT.
- **Read** The mechanism is deployed and untested by reality. It stays in place
  at no cost; if any of the four ever returns, the flag will show it. The real
  finding is about the segment: users whose trial expired in early July and
  who have been gone 6+ weeks are unreachable by any in-app change — that was
  the stated case for `lapsed-pro`, which remains deliberately unscheduled.
  No re-read date; the flag is its own tripwire.

### challenge-1 rewrite + recommendation routing — **MISS**
- **Claimed** 2026-08-05 · **Read** 2026-08-14 (2 days late; verifier not yet installed)
- **Measured** solve-through **31% pre → 25% post** (45→75 openers). Target was >=40%.
- **Measured** first-contact share **35.1% → 50.7%** (39 → 68 first-contacts). Target was "falls toward zero".
- **Verdict** MISS on both. The share moved the *wrong way*: challenge 1 is now
  the front door for **half** of all first contacts, up from a third.
- **Read** The rewrite and the routing fix were both real, and the routing bug
  was real — but neither fed this. Root cause found 2026-08-14 by walking the
  live flow: the 4-question placement quiz scores 4/4 as `advanced`
  (`app.jsx:19530`), and the advanced first-run track is `[1, 6, 7, 10]`.
  55 of the 68 post-fix first-contacts arrive directly after `coach_tab_viewed`,
  which is the quiz screen. The quiz asks recognition questions — what SELECT
  returns, which clause filters, what COUNT counts, what a JOIN is for — and
  anyone who has read one tutorial answers all four. Challenge 1 then demands
  *production*: a GROUP BY with aliases. Recognition is being treated as
  interview-readiness, and 75% of the people it routes there do not finish.
- **Next** Fix the quiz-to-level mapping, not challenge 1. A 4/4 on recognition
  is `working` at most. This is a one-line threshold change plus a re-read.

### first-run layout + Run/Submit pinned on mobile — **FLAT**
- **Claimed** 2026-08-07 · **Read** 2026-08-14
- **Measured** challenge 91 solve-through **66% pre → 69% post** (21/32 → 24/35).
  Target was >=80%.
- **Verdict** FLAT. A 3-point move on ~35 openers is inside noise; do not read
  it as an improvement.
- **Read** The layout fix is verified to work mechanically — one click puts the
  editor, Run and Submit on a 375x812 screen — but 91's traffic **collapsed**
  from 42 first-contacts to 14 over the same period, because the quiz now sends
  those users to challenge 1 instead. The fix may be fine; it barely got tested.
  Re-read after the quiz threshold is corrected.

### working-track reorder: #99 before #100 — **HIT**
- **Claimed** 2026-08-07 · **Read** 2026-08-14
- **Measured** #100 first-contacts **20 → 0**. #99 took the slot with 28.
- **Verdict** HIT. #100 no longer appears as anyone's first challenge.
- **Read** The intended change landed exactly. But the replacement is only
  partly better: #99 as a *first* challenge runs **37% solve-through** (14/38),
  against #100's 25%. #99 measures 85% mid-curriculum, so this is the same
  lesson as #100 — a challenge that is easy in context is hard as a first
  contact. Worth a follow-up, not a revert.
