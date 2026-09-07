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
  `src/utils/interview-prep.js`, `tests/interview-prep.test.js`, 83 tests.
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
- **Only one company is offerable, and it is computed, not listed.**
  `eligibleTargets` requires a mock keyed to the company's own name running on
  ONE dataset, ≥ 8 tagged challenges on that dataset, and ≥ 0.9 of that
  dataset's company tags. Capital One clears it (finans_fraud, 10 challenges,
  100%); the other 22 tagged companies are tag filters over the generic bank
  (best exclusivity on `ecommerce` is 10%) and are refused. A tag alone can
  never qualify a company — tested.
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
      content for a second target (8+ challenges on its own dataset AND a mock
      on it), never widening the eligibility bar and never louder copy.
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
  `supabase/migrations/20260907_feedback_quote_consent.sql`, **which the
  founder must still apply**).
- **Nothing is offered in exchange for a review** — no discount, no XP, no Pro
  days, no badge. FTC 16 CFR Part 255 and every platform's terms; a source
  guard in `tests/review-ask.test.js` fails the build if an incentive word
  reaches the copy, in either language, and was mutation-verified.
- **Why** the product has never once asked anybody anything. 318 public
  profiles auto-published, `profile_link_copied` **zero rows ever**, referral
  functions at zero events for months, 5 rows in `feedback`. There is no
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

