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
      eligibility bar. Stop and look. (Unchanged.)
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
- **Verdict** _pending_
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
- **Verdict** _pending_

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
- **Verdict** _pending_
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
- **Verdict** _pending_
### paywall: ask fewer people, at most twice, and never the ones who came to learn
- **Claimed** 2026-09-08 — **NOT YET SHIPPED.** Ships after the cold-start read
  on **2026-09-29**, because `purchases` is a directional guardrail on both
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
- **Metric** the goal split under `paywall_ask_efficiency`.
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
- **Verdict** _pending_

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
- **Verdict** _pending_

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
- **Verdict** _pending_

---

## Closed

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

