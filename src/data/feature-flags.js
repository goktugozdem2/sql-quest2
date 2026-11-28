// SQL Quest - Feature Flags & A/B Testing
// Edit values here to enable/disable features

window.FEATURE_FLAGS = {
  // MAIN TABS
  tabs: {
    guide: true,           // 🧭 Coach — adaptive goal-driven learning (houses AI Tutor + Coach engine)
    quests: true,          // 📝 Practice
    trials: true,          // 💼 Interview Prep
    leaderboard: true,     // 🏅 Leaderboard
    hero: true,            // 👤 Profile
  },
  
  // PRACTICE SUBTABS
  practiceSubtabs: {
    challenges: true,      // 🏆 Challenges
    speedRun: true,        // ⚡ Speed Mode - ENABLED
    // skillForge: retired — folded into the Coach as the Quick Drill card
    exercises: true,       // 📝 Drills
    explain: false,        // 📖 Read SQL - DISABLED
  },
  
  // STATS SUBTABS
  statsSubtabs: {
    stats: true,
    skills: true,
    reports: true,
  },
  
  // FEATURES
  features: {
    aiTutor: true,
    // Onboarding intake — three OPTIONAL questions in front of the placement
    // quiz for first-run users on the Learning Path tab: what brings you here
    // (interview / job-ready / general), by when, and what you do. P0-1 on
    // the founder's 2026-09-12 list. Each answer lands in a store that
    // already exists — the intent key the post-solve ask writes, the Coach
    // goal it maps to (stamped source='intake'), prepTarget.date, and
    // userGoals.role — so there is no fourth profile to reconcile. Skipping
    // the optional steps is a completed intake; nobody is asked twice.
    // SINCE 2026-09-17 THE GOAL IS REQUIRED (founder: "hedefsiz adam
    // istemiyoruz") — the goal step has no skip; the cost of that question
    // is read on `first_run_reach` (ledger amendment of the same date).
    //
    // SHIPPED OFF (2026-09-12). It sits on the first-contact stretch that the
    // "105 opener" ledger claim reads until 2026-09-13, so it flips on
    // 2026-09-16 by scheduled task — after that verdict, and only if the
    // claim was not extended. Claim, baseline (783 first-run viewers in 28
    // days, 56.7% reach a first challenge within 24h) and falsification:
    // docs/agent/ledger.md, "onboarding intake". Never a step toward
    // checkout: the block renders nothing about Pro, by test.
    onboardingIntake: false,
    // The goal gate (founder, 2026-09-25): goal, deadline, target level,
    // industry — required from every user at session start. Live for a few
    // hours on 2026-09-25, then OFF on the founder's decision the same day:
    // the ask moves after the first solve, inline and skippable
    // (`intakeAfterFirstSolve`), because a required screen at the door puts
    // `first_solve_10m` (12.4%) at risk. Kept, not deleted: the same component
    // is the candidate for the one required screen, after payment (plan
    // item 6). src/utils/goal-gate.js, tests/goal-gate.test.js.
    goalGate: false,
    // The company ask (founder's plan, 2026-09-25, P0 1–3): one inline
    // question after the FIRST correct solve — which company? — asked again
    // at the third solve if unanswered, then silent. When on, an A/B by aid
    // (arm `ask` | `control`, assigned at the first solve). SHIPPED OFF; one
    // week on, then the founder decides. src/utils/company-ask.js,
    // tests/company-ask.test.js; ledger "one question after the first solve".
    intakeAfterFirstSolve: false,
    // One layer at a time after a solve on phones (2026-11-23, rank 3 of
    // docs/plans/mobile-acquisition-2026-11-23.md). When on, an A/B by aid
    // (arm `one` | `control`, assigned at the first correct submit on a narrow
    // touch screen, `mobile_one_layer_assigned`). The `one` arm shows the ask,
    // then holds the achievement / level-up / Skillmap / share / streak
    // layers until the next challenge opens; 44×44 close targets. Desktop and
    // `control` unchanged. Shipped off; ON at 50/50 2026-11-24 (orchestrator
    // decision row, after an iOS Simulator + production walk: PASS).
    // src/utils/mobile-one-layer.js,
    // tests/mobile-one-layer.test.js; ledger "One layer at a time after a
    // solve on phones".
    mobileOneLayer: true,
    // Company practice-set match on the Coach (SEO plan P3.21, 2026-09-13):
    // for a named prepTarget.company that has NO interview archetype, how the
    // Skillmap matches what that company's practice set asks, plus the next
    // free challenge in the set on the weakest of those skills. Never called
    // readiness (src/utils/company-set-match.js says why). The intake's new
    // company step (P3.20) and the readiness test both write the company it
    // reads. SHIPPED OFF; flips with onboardingIntake on 2026-09-16 by the
    // same scheduled task, because the intake is what feeds it.
    companySetMatch: false,
    // The Coach stops asking twice — a first-run placement (the quiz, or a
    // level picked by hand) IS a placement. ON, a Coach goal started by
    // someone the first run already placed skips the Coach's own five-
    // challenge placement check, and the tier becomes seed floors that only
    // the engine's skipIf clauses see; the radar and graduation read what
    // was measured. "Retake placement" on the Coach still works.
    //
    // Measured 2026-09-12 on the users table: of 102 goal starters handed
    // the placement check, 50 never attempted one of its challenges, 43
    // stopped inside it, 4 finished, and 4 ever completed a curriculum step.
    // From 09-16 the onboarding intake hands a Coach goal to every new
    // person who answers it — all cold, all at this wall.
    //
    // SHIPPED OFF (2026-09-12). The Coach page claim reads the full-shell
    // Coach until 2026-09-26 (take rate, split by first-step type); this
    // changes what that first step IS, so it flips on 2026-09-27 by
    // scheduled task, after that verdict and only if it was not extended.
    // Claim, baseline and falsification: docs/agent/ledger.md, "the Coach
    // stops asking twice".
    coachTrustQuizPlacement: false,
    // Adaptive placement — a full score on the four recognition questions
    // opens a second round of four (window functions, a CTE, NULL comparison,
    // the anti-join); only a pass there (3 of 4) places someone on the
    // interview-ready track. Four tiers on the four ids that already exist:
    // Foundations / Intermediate / Advanced / Interview-ready. P0-2 on the
    // founder's 2026-09-12 list. Pure half: src/utils/placement.js. OFF, the
    // quiz returns exactly what the 08-14 cap returned (4/4 → 'working');
    // the `placement_completed` event fires either way, so the tier mix has
    // a baseline before the flip.
    //
    // SHIPPED OFF (2026-09-12). Same surface as the onboarding intake above,
    // which flips 09-16 and reads 09-30 on first_run_reach — one change per
    // surface per read, so this flips on 2026-10-01 by scheduled task, after
    // that verdict and only if it was not extended. Claim, the 44% baseline
    // for the self-declared interview-ready opener, and the falsification:
    // docs/agent/ledger.md, "adaptive placement".
    adaptivePlacement: false,
    // Intent routing — make the declared intent actually change what the
    // product recommends, and give the people who said "interview" a way to
    // reach the Interview Prep tab. The intent modal's own copy promises
    // "Your answer shapes what we recommend next"; until 2026-09-11 it shaped
    // nothing — getUserIntent() was read in two analytics payloads and nowhere
    // else, so 413 people in 60 days answered a question the product ignored.
    //
    // ON, this flag does three things:
    //   1. applyIntentRouting: interview / job_ready answers open the whole
    //      bank instead of the ladder and apply the company they arrived on.
    //   2. A third primary-nav tab, Interview, for people with hiring intent,
    //      interview history, the interview-prep goal, or a company-page
    //      arrival — and only after their first solve. Rules and the reason
    //      for each: src/utils/interview-nav.js. Until 2026-09-13 that tab
    //      had no navigation entry at all (22 accounts lifetime).
    //   3. interview_tab_viewed / interview_started / interview_completed
    //      events, so the surface can be read (metrics.md: interview_reach).
    //
    // 2026-09-12, found in the preview before the flip: applyIntentRouting had
    // been written INSIDE getUserIntent, after its return — unreachable, so
    // every call would have thrown a swallowed ReferenceError and the flip
    // would have read UNREADABLE on its own mechanism check. Fixed; guarded
    // in tests/interview-nav.test.js.
    // SHIPPED OFF (2026-09-11), dark until the 105-opener read closes on
    // 2026-09-13. Not because it can touch first contacts — the intent ask
    // fires after the first solve and the tab needs a solve — but because it
    // moves reach_6_rate, and the roadmap-v2 claim reads that same metric and
    // says "it ships alone". Flip THIS or roadmapV2, never both. The founder
    // chose this one on 2026-09-12. See docs/agent/ledger.md.
    // Flipped 2026-09-16 (the 09-13 task stalled before writing anything), after the 105-opener read came back (c) inconclusive and was extended to 09-20; ledger claim "intent routing: a handle on the interview door".
    intentRouting: true,
    // Roadmap v2 — the recommended path stops hand-listing 38 challenge ids
    // and grows each stage from the live bank, plus two new stages for the
    // two canonical skills that had none (String Functions, Date Functions).
    // Coverage goes from 38 of 287 to 134 of the 219 free challenges, and 20
    // sector challenges become reachable for the first time.
    //
    // SHIPPED OFF ON PURPOSE (2026-09-09), same reasoning as reviewAsk below.
    // It changes what the Practice tab recommends, which is the same stretch
    // of funnel the open "105 opener" ledger claim measures until its read on
    // 2026-09-13. One surface, one change at a time
    // (docs/data-driven-product.md P7). Flip to true AFTER that verdict.
    //
    // Turning it on does NOT move anyone's first contact: every stage's
    // authored ids stay first in their authored order, and
    // tests/roadmap.test.js fails if that prefix is ever disturbed.
    roadmapV2: false,
    dailyChallenge: true,
    mockInterviews: true,
    smartErrorFeedback: true,
    soundEffects: true,
    // Review ask — the post-solve card that offers a public review or a
    // private note. SHIPPED OFF ON PURPOSE (2026-09-07).
    //
    // It renders in the same post-solve success panel, for the same
    // population, that the open "paywall surfaces" ledger claim is measuring
    // until its read on 2026-09-20. One surface, one change at a time
    // (docs/data-driven-product.md P7). Flip this to true AFTER that read
    // lands — the ledger claim for the review ask says so in as many words.
    reviewAsk: false,

    // Interview countdown — name a company, name a date, get a plan and a
    // readiness number with its parts. SHIPPED OFF ON PURPOSE (2026-09-08).
    //
    // Same reason as reviewAsk above, one surface further along: the card
    // renders at the top of the Interview Prep tab, and the challenges it
    // sends people into are the same Pro/free boundary the open "paywall
    // surfaces" ledger claim is reading until 2026-09-20. One surface, one
    // change at a time (docs/data-driven-product.md P7). Flip this to true
    // AFTER that read lands — the ledger claim for the countdown says so, and
    // the flip's deploy timestamp is what dates every prep_* event.
    //
    // Logic + the eligibility bar: src/utils/interview-prep.js. Exactly one
    // company clears that bar today, computed from the bank rather than
    // listed — flipping this flag does not turn on 23 company flows.
    interviewCountdown: false,

    // Interview-first (2026-09-17) — the frame everything else sits in:
    // docs/plans/interview-first-2026-09-17.md. Every real purchase in the
    // product's history (3 of 3) was interview-shaped; modal → plan click
    // was 9.3% for declared interview intent against 0 of 81 with no intent.
    // ON, for an interview person ONLY (src/utils/interview-first.js
    // isInterviewPerson: intent interview/job_ready, a countdown date or
    // company, the interview-prep goal, a company-page arrival, or any
    // interview history — the Interview tab's own population plus the
    // countdown target): the daily-reward calendar never opens, achievement
    // toasts do not render (the achievement is still awarded and saved),
    // the header's lives and coin are not drawn, and the countdown card
    // renders ABOVE the Coach's next-step card. Everyone else sees exactly
    // today's product; nothing is deleted. One helper in app.jsx reads this
    // flag — `interviewFirstOn(surface)` — and tests/interview-first.test.js
    // pins its call sites. Fires `interview_first_applied {reason}` once a
    // session. 2026-09-18: the status strip (WHO · WHEN · WHERE I AM · HOW
    // FAR, one line on every tab) is the seventh call site, `status_strip`.
    // SHIPPED OFF; flips 2026-09-21 by the same scheduled task as
    // interviewCountdown (the card it moves). Ledger: "interview-first: the
    // plan is the product for people with a date".
    interviewFirst: false,

    // Goal measure (2026-09-17, the founder's directive: "ask the goal at
    // once, measure where they stand ON THAT GOAL, show it honestly, plan it,
    // monetise along the plan — we do not want a goalless person"). ON:
    //   (B) right after the onboarding intake, the ten-question readiness
    //       check the public /sql-interview-readiness-test/ asks — the same
    //       questions, from src/data/readiness-questions.js, scored the same
    //       way: per skill, overall weighted by the named company's tagged-set
    //       skill mix (equal weights otherwise). The result screen is the gap
    //       ("On the skills the Snowflake set asks for, you are at 43/100.
    //       Weakest: …") with the public test's own disclaimer, never a pass
    //       prediction; stored as `sqlquest_readiness_v1` in the page's shape,
    //       mirrored to userData.readiness; per-skill seed floors for the
    //       Coach's skipIf only (placement.js seedFloorsFromReadiness). A
    //       fresh (< 7 d) result is shown back, not asked again. "Build my
    //       plan" places the person from the result (one assessment, not two)
    //       and lands an interview person with a plan target on the Coach's
    //       countdown card; anyone else continues the first-run path.
    //   (D) `?goal=interview|job_ready|learning` on /app/ writes the intent
    //       the way the intake does (never over a declared one), fires
    //       `intent_captured {source:'link'}`, pre-answers the intake's goal
    //       step and continues into the check.
    //   (E) the returning ask: a session with ≥ 1 solve and no goal on record
    //       gets the intake's goal screen once (required), then the check
    //       (skippable), then goes back to where it was. Never at 0 solves,
    //       never twice, never over an open challenge.
    // Events: goal_measure_started / _completed / _skipped /
    // _plan_clicked, goal_ask_returning_shown; metric `goal_measure_funnel`;
    // the cost line is `first_run_reach`. SHIPPED OFF; flips 2026-09-21 with
    // onboardingIntake by the same scheduled task. Ledger: "the goal is
    // asked, measured and planned before the first solve".
    goalMeasure: false,

    // ── The goal-note date ask (2026-11-22) ──────────────────────────────
    // The goal-note email's `goal=interview` answer, with no interview date
    // on record, gets one inline, skippable line after the goal is recorded:
    // "When is it?" (a date picker). It writes prepTarget.date through the
    // intake date's own writer. Never a modal, never while the intake shows.
    // Events goal_note_date_ask_shown / goal_note_date_set {daysOut} /
    // goal_note_date_skipped, each with `m` (the email's mode); metric
    // `goal_note_new`. Pure half src/utils/goal-note-date-ask.js. DARK.
    goalNoteDateAsk: false,

    // ── The quarterly plan (2026-09-14) ──────────────────────────────────
    // $49 every 3 months, between monthly and annual. The founder's call:
    // three packages, 1 month / 3 months / 1 year. Annual stays the
    // highlighted card (the 09-12 decision is unchanged by adding a tier).
    //
    // WHY a third tier at all: $29/month is the wrong unit for interview
    // prep. A job hunt is measured in months, and our own numbers say the
    // decision is made in the first session at 6-10 solves.
    //
    // It existed for about an hour as a ONE-TIME "Interview Pass" before the
    // founder changed it to recurring. That Stripe link is deactivated, not
    // deleted; every trace of the one-time shape is gone from the code,
    // because a plan that renews and a plan that does not need opposite
    // answers on grace, auto-renew and the "Renews / Ends" label.
    //
    // RELEASE ORDER, and it is not optional:
    //   1. deploy stripe-webhook (it must map price_1UFXQPKfw2tJmZR5lqAHNfQw
    //      -> quarterly/90 days, for ACTIVATION and for RENEWAL)
    //   2. set STRIPE_PRICE_QUARTERLY + STRIPE_PRODUCT_QUARTERLY
    //   3. only then flip this
    // Flip first and a subscriber pays every 3 months while the old renewal
    // branch — which knew only monthly and annual — extends them by nothing.
    //
    // FLIPPED 2026-09-14 15:31 +03, after verifying the deployed function
    // rather than the claim. The first "deployed it" was version 11 from
    // 09-12 23:54 — the old code, with no quarterly anywhere. Flipping then
    // would have granted 30 days to a $49 buyer and extended their renewal by
    // zero. The live source now carries PLAN_DAYS{quarterly:90}, the
    // STRIPE_*_QUARTERLY maps, the >=4900 band, PLAN_DAYS[proType] on
    // renewal, ONE_TIME_PLANS={lifetime} and the payment-failure revoke
    // (stripe-webhook v14, 15:27:56).
    //
    // OFF again 2026-09-19 (founder QA item 20, "one price architecture"):
    // the modal sold a $49 quarter that the homepage, the pricing section and
    // every landing page do not show. In five days: 2 quarterly clicks, 0
    // purchases (stripe_webhook). The webhook keeps its quarterly branch, so
    // turning this back on is one line — but only together with the pages.
    quarterlyPlan: false,
    // Regional price (founder's written Go, 2026-09-26): a visitor whom
    // Vercel's country header places in India sees $9/month and $39/year and
    // is sent to those Payment Links; everyone else sees $29 / $99 exactly as
    // before. src/utils/regional-price.js; prices under the existing Stripe
    // products (docs/plans/monetization-2026-09-24.md). Events carry
    // `priceRegion`. Read: India shown → plan click (3.6%, 90 d) → ≥ 8%, and
    // non-India purchases must not fall.
    regionalPrice: true,
    // Direct checkout (2026-09-23, founder's go the same day): a plan click
    // without an email on file goes straight to Stripe instead of the
    // "Where should your receipt go?" step, which lost 4 of 4 such buyers in
    // 30 days. `false` restores the step. Ledger: "a plan click goes straight
    // to Stripe"; docs/plans/modal-to-stripe-2026-09-23.md item 1.
    directCheckout: true,
    // Server-created Stripe Checkout Sessions (founder's written go 2026-09-26,
    // "deploy'unu yap" 2026-09-30): a plan click asks
    // supabase/functions/create-checkout-session for a session with Adaptive
    // Pricing OFF, so the buyer pays the USD the modal showed (Payment Links
    // force the local currency - 0 of 11 checkouts paid in the week to 09-29).
    // ANY failure falls back to the Payment Link (launchWithFallback).
    // Verified live 2026-09-30 before the flip: US$29/mo, US$99/yr, India
    // US$39/yr, no currency switch; stripe-webhook v23 knows every price.
    checkoutSessions: true,
    // Card-required 7-day free trial on the session path (founder's Go
    // 2026-10-01, after the first session purchase was seen through the
    // webhook that morning). The plan cards say "7 days free, then billed
    // monthly/yearly" and one line under them states the terms
    // (TRIAL_CARD_COPY / TRIAL_TERMS, src/utils/checkout-session.js); one
    // trial per username, decided by create-checkout-session. Stripe's page
    // read before the flip: "7 days free — Then $29.00 per month starting
    // October 8", $99.00 per year, India $9.00, USD, "Start trial".
    // NOT YET SEEN LIVE: a trial start and its conversion through the
    // webhook — check the first `pro_trial_started` by hand. Ledger: "a
    // 7-day trial at checkout"; `false` restores pay-now.
    checkoutTrial: true,

    // ── The Pro modal: plans above the fold (2026-10-08, PLAN item 2) ────
    // A/B by aid (src/utils/modal-layout.js): `plans_first` shows the plan
    // cards, the trial line and the currency note right under the headline
    // and moves "What you get with Pro" below them; `control` is today's
    // modal. On a 1366x768 laptop the cards began at y=630 of 768; on a
    // phone at y=1,203. Money surface: ON 2026-10-08 on the founder's go
    // ("50 merge et ve bayrağı aç, go"). Ledger "the plans above the fold",
    // metric `modal_layout_split`.
    modalPlansFirst: true,

    // ── Paywall moments (2026-10-17, PLAN item 3) ─────────────────────────
    // Every point where a free person meets Pro offers the way in
    // (src/utils/paywall-moments.js): the three soft-gate toasts carry "See
    // what Pro opens", the 30-day path's Pro tiles and a locked mock card
    // open the modal instead of doing nothing, the tutor's two "Upgrade"
    // links open the plans instead of the Profile tab, the three reasonless
    // openers name their reason, and the reasons without copy get their own.
    // Free stays free. Money surface: dark until the founder's go. Ledger
    // "paywall moments", metric `paywall_moment_reach`.
    paywallMoments: false,

    // ── The account ask at the third solve (2026-09-14) ──────────────────
    // Founder: move the registration wall to the 3rd solve. Measured before
    // agreeing, because the premise needed checking:
    //
    //   1,217 active / 197 registered-active in 30 days is 16%, but only 349
    //   of those 1,217 ever solved anything — a rung at solve 3 cannot touch
    //   the other 868. Of the 260 who DID reach 3 solves, 140 are already
    //   registered. The addressable pool is ~120 guests a month, and ~39 of
    //   them register on their own. So the ceiling is +41% on registered
    //   users, not 3x.
    //
    // Where the 3x instinct IS right: the ASK's reach. 260 people reach 3
    // solves a month against 100 who reach 10 — 2.6x more people asked.
    //
    // And the founder's second argument holds outright: 98 of the 209 people
    // shown the Pro modal in 30 days were guests, and every one of them meets
    // an email-capture step before checkout. An account removes that step.
    //
    // This flag ONLY moves the account rung from 10 to 3. It is a prompt, not
    // a wall — nobody is blocked from solving. A hard wall was not built: 65%
    // of people who reach 3 solves go on to 6, and every purchase in our
    // history was a first-session decision at 6-10 solves, so a wall would
    // stand directly in front of the population that pays.
    //
    // The LADDER BUG it rides with is fixed live, not behind this flag: the
    // rungs counted a session-only useState(0), so "the tenth solve" meant
    // ten in one unbroken sitting. That is why the prompt reached 28 people.
    //
    // ON 2026-11-22 (decided under the founder's delegation; ledger "the
    // account ask at the third solve"). 30 days to 11-22: 132 guests reached
    // 3 solves, 31 signed up on their own (23.5%); the account prompt at the
    // tenth solve reached 20 people. Guardrail: 3 → 6 solves (43.5%).
    signupAskAtThree: true,

    // ── The free-tier boundary (2026-09-12) ──────────────────────────────
    // Five moves from docs/plans/free-tier-boundary-2026-09-12.md. The
    // finding: the free tier is not too big, it is in front of the paid good
    // — the locked Hard set is opened by 9% of people who open anything,
    // the mocks by 3 people a month and by none of 79 interview-intent
    // people. Every purchase in our history was a first-session decision at
    // 6–10 solves, so each move puts the paid good on a deadline person's
    // path INSIDE the first session, or stops an ask that has never sold.
    // None of them cuts Easy/Medium. Pure half: src/utils/free-tier-boundary.js;
    // guards: tests/free-tier-boundary.test.js. All five SHIPPED OFF: nothing
    // monetisation-adjacent flips before 2026-09-29 (objectives.md, the
    // constraint that outranks the objective); each flips by scheduled task
    // on its own date, one surface per read, `purchases` the guardrail.
    //
    // M1 — the company view frees the first three of a company's set and
    // walls the fourth, whatever its difficulty. Today Stripe's arrival
    // gets 23 free Stripe questions and never needs Pro; Amazon (10 free /
    // 24 locked) is the one set that produced a payer. The challenges stay
    // reachable one by one from the general list — the curated set is what
    // Pro buys. New wall value `company_set`, reason `company_set`.
    // Flips 2026-09-29 (with M4, a different surface). Ledger: "company
    // sets: three free, then Pro".
    companySetGate: true,
    // M2 — the interview-prep goal meets the wall at step 4, not 11: the
    // free Hard preview (challenge 23) moves to 3, a locked Hard (71, Top-N
    // per Category) to 4. A free user can set the locked step aside
    // (`coachState.stepsSkipped`, engine: passed over, never counted). Of
    // 79 interview-intent people in 30 days, 68 never opened a Hard.
    // Flips 2026-10-12, after the Coach-trust read (10-11) — it changes
    // what that goal's first steps ARE. Ledger: "the wall at step 4".
    goalWallEarly: true,
    // M3 — the milestone modal leads with the date. A person whose
    // intake / countdown date is inside 45 days sees "N days to your
    // interview" and what stands between them and it (the locked Hard set,
    // the company's mock), not the feature list. `pro_modal_shown` carries
    // deadline/daysOut so the ask-efficiency read splits on it. Was to flip
    // 2026-10-06 after the intake read; the founder moved it on 2026-09-16
    // to flip WITH freeQuota on 2026-09-21 (same scheduled task).
    // Ledger: "the six-solve ask speaks to the deadline".
    deadlineOffer: true,
    // M4 — the asks that have never sold go quiet: the streak modal (13
    // people/30d, 0 clicks ever) never fires; a company Hard wall or a
    // locked mock at ≤3 solves gets the free-preview catcher or the free
    // mock instead of a price. Measured 2026-09-12: 50 people a month, no
    // sale in the product's history from any of them, and they burn the
    // surface (43 people asked 3+ times). Flips 2026-09-29 (with M1).
    // Ledger: "quiet the asks that have never sold".
    quietEarlyAsks: false,
    // M5 — the mocks get a door: with M2 on, the free mock becomes step 5
    // of interview-prep and the named company's Pro mock (or the generic
    // one) step 6; the company wall (M1) names the company's mock. The
    // Interview tab was reached by 3 people in 30 days. Flips 2026-10-12
    // with M2 (it is M2's steps 5–6). Ledger: "the mocks get a door".
    mockDoor: true,

    // ── P1 (2026-09-12): skill model, diff engine, tutor ─────────────────
    // Built the same day as the free-tier boundary; LIVE parts: the user_skill
    // row (canonical, fed by attempts), the skill filter on Practice, error-
    // pattern recording, and the tutor's enriched context. The three below
    // change what a person SEES on the solve surface, so they wait for the
    // cold-start read (09-29) and flip together on 2026-09-30 by scheduled
    // task; each has a ledger claim and reads 2026-10-21.
    //
    // The post-solve "Next quest" picks the weakest canonical skill and one
    // difficulty above what the person has solved on it (src/utils/
    // user-skill.js pickNextBySkill), instead of curriculum-next at the same
    // difficulty. Strip carries the why; `next_rec_started` carries source.
    // OFF 2026-11-22 — its pre-registered falsification fired (ledger "the
    // next quest is the weakest skill"): take rate 40.8% → 17.3%, 29.3% →
    // 15.7% under 10 solves (clear of the quota) — below 70% of the
    // curriculum arm. The written action: revert, keep the picker for the
    // Coach's drill only.
    weakSkillNext: false,
    // The wrong-answer panel says WHAT is wrong (the diagnosis headline) in
    // place of "Try again!", and shows ONE hint chosen for the diagnosis
    // and the query (diagnose.js primaryHint) instead of the fixed three.
    // The new `row_set` diagnosis kind (right count, wrong rows) is live
    // either way — it is a truer report, not a different surface.
    diagnosisHints: true,
    // Feedback capture points 2-4 (E2, 2026-11-22; src/utils/feedback-prompts.js).
    // One question each, skippable, one prompt a session at most, never in a
    // mock, written to the existing `feedback` table (context.kind/trigger).
    // Ledger: "the reasons are asked where they happen"; metric `feedback_capture`.
    // exitReasonAsk sits on the paywall: it shows only AFTER the Pro modal or
    // quota wall is closed with no plan click, once a day. A0 turns it on only
    // after A1 confirms it never shows before/over the plans and changes no
    // price or gate. stuckAsk and day2Ask are not money surfaces.
    // ON 2026-11-23 (A0, orchestrator-decisions 2026-11-22): exitReasonAsk
    // and day2Ask. stuckAsk waits until 2026-12-20 (it would move
    // open_to_first_run under #99/#101/companyDirectOpen). Reverse rules in
    // the ledger entries "the reasons are asked where they happen".
    exitReasonAsk: true,
    stuckAsk: false,
    day2Ask: true,
    // IR-2 (E2, 2026-11-23; src/utils/feedback-context.js): the 💬 widget,
    // opened on a challenge, writes the challenge id, the last query (cut to
    // ~1,000 chars) and the last diagnosis kind into the row's `context`, and
    // shows one line pointing at the inline tutor. Default ON: an inbound-
    // channel fix, not money and not paywall-adjacent. Event
    // `feedback_tutor_redirect`. Ledger: "a feedback row says which challenge".
    feedbackContext: true,
    // The first screen test (2026-09-23, src/utils/first-screen.js): half of
    // first-run visitors land in challenge 91's editor instead of the
    // four-question placement quiz (42% of first visitors never opened a
    // challenge, 08-24 → 09-20; 15 of the 406 who saw the quiz in their first
    // minute finished it). Split by aid hash, sticky; `first_screen_assigned`.
    // Flips from docs/agent/flag-queue.md. Ledger: "the first screen is a
    // challenge, not a quiz"; metric `first_screen_split`.
    firstScreenChallenge: true,
    // The inline tutor's ladder: request 1 names the defect in THEIR query,
    // 2 gives the exact clause, 3+ the full corrected query; asking for the
    // answer outright bypasses the ladder. Off, the tutor never reveals the
    // solution (today's rule 1). Bypass button on the panel is flag-only.
    socraticLadder: true,

    // ── P2 (2026-09-12): retention ─────────────────────────────────────────
    // A "Due today · spaced retrieval" card on the Coach tab: weak canonical
    // skills (mastery < 70) come back 3, 7 and 14 days after they were last
    // practised, each with one challenge at the level the person has shown
    // on that skill (src/utils/spaced-retrieval.js). The landing has promised
    // "Tomorrow · spaced retrieval" since the Coach shipped; this is what is
    // behind it. Coach surface → flips 2026-10-12 with goalWallEarly (same
    // task), reads 2026-11-02. Ledger: "weak skills come back at 3, 7, 14".
    spacedRetrievalCard: false,
    // "12 days · 6 a day" next to the days-left chip on the Coach and on the
    // countdown card: what is left on the active goal divided by the days to
    // the date the person gave us (dailyQuota in spaced-retrieval.js). Same
    // surface and date as the card above.
    dailyQuota: false,

    // ── The free quota (founder's plan, week of 2026-09-12, item 2) ───────
    // Ten free solves, then the bank is Pro: opening an unsolved challenge
    // once the solve count has reached FREE_SOLVE_QUOTA (src/utils/free-tier-
    // boundary.js) meets a wall — `wall: 'free_quota'`, reason `free_quota`
    // — and every unsolved row wears the lock. Solved challenges, lessons,
    // warm-ups, the daily and the Coach stay free. The founder set the
    // number "a little above the activation threshold" (six). The plan doc
    // argued against a content cap; the founder decided otherwise, and the
    // claim reads the cost it named: retention of the 10+ solvers.
    // SHIPPED OFF 2026-09-12; flips 2026-09-21 by scheduled task, after the
    // paywall-surfaces read (09-20) — the previews it measures sit behind
    // this wall for anyone past ten solves. Ledger: "the free quota: ten
    // solves, then Pro".
    freeQuota: true,
    // The free-quota holdout (2026-11-25, founder's written go in chat:
    // "Full holdout (Recommended)"). A browser whose FIRST app open falls in
    // the four-week enrolment window is split 50/50 by a murmur-finalised
    // hash of its aid: `quota` keeps today's free tier, `holdout` reads
    // `freeQuota` OFF — no wall, no "N of 10" counter, the pre-09-26 in-app
    // wording. Returning browsers and accounts created before the window keep
    // the quota. App only: the static pages keep today's wording. Off → nobody
    // is enrolled and holdout browsers get the quota back (the kill switch).
    // src/utils/free-quota-holdout.js; metric `free_quota_holdout`; ledger
    // "the free-quota holdout"; enrol 2026-11-28 → 12-25, read 2027-01-02.
    freeQuotaHoldout: true,

    // ── The header's Pro button (M-04, 2026-11-22) ────────────────────────
    // "Try Pro free" (or "Pro" when no trial is offered) beside the identity
    // chip, for a non-Pro person with 3+ solves, outside the first-run and
    // lesson shells; opens the modal under reason `header`. Person-opened
    // modals click a plan at 26.7-31.8% vs 3.2-13.2% for automatic asks
    // (docs/plans/monetization-ideas-2026-11-22.md, 1d). UX, no price:
    // ships ON. Turn off if the 12-20 read falls (ledger "the header's Pro
    // button"): < 5 presses in 30 days, or the quota wall's click rate
    // under 10% while this one rises.
    headerProButton: true,

    // ── The last 48 hours of a Stripe trial (M-10, 2026-11-22) ────────────
    // On the Coach and the challenge list, a person in a Stripe trial
    // (`proTrial` + `proTrialEnd` from the webhook) sees the date the free
    // week ends, the price that follows (planPrices), what Pro still holds
    // and "Manage plan" (the Stripe portal). Honest disclosure, no price
    // change: ships ON. Off if cancellations reach 6 of the next 8 matured
    // trials (ledger "the last 48 hours of a trial say the date").
    trialEndingLine: true,

    // ── The quota wall speaks to the person's company (M-12, 2026-11-22) ──
    // A person whose prepTarget.company has a plan target meets the wall
    // with "The rest of the <Company> set and the <mock> are in Pro." (signed
    // archetype) or "The rest of the <Company> set is in Pro." (tagged)
    // under the unchanged headline. Copy, no price: ships ON. Off if the
    // company-present click rate falls below its own baseline at 25+ people
    // (ledger "the quota wall names the person's company").
    quotaWallCompany: true,

    // ── The quota wall asks once a day, then waits inline (M-07) ──────────
    // An A/B by aid (quota_wall_inline_v1, murmur-finalised hash): in the
    // `inline` arm the first wall hit of the person's day opens the Pro
    // modal as today; later hits that day show a small non-blocking card
    // (the trial button opens the same modal by the person's click, plus
    // the modal's two free roads back). `control`: the modal on every hit.
    // No price, no plan: ON from 2026-11-22. Off if the inline arm's clicks
    // fall below 0.7x control at 60+ wall people per arm (ledger "the quota
    // wall asks once a day").
    quotaWallInline: true,

    // ── A failed charge gets its fix link in the app (M-01, 2026-11-22) ───
    // A person whose record carries `billingIssue` (written by stripe-webhook
    // when the subscription goes past_due, cleared on active / deleted;
    // server-owned) sees one line under the header on every tab: "Your card
    // didn't go through — fix it in Stripe" → the open invoice's own page
    // (https://invoice.stripe.com only). Without the field it renders
    // nothing, so it is ON before the webhook deploy. Events
    // billing_issue_shown / billing_issue_clicked; ledger "the day-7 charge
    // gets a self-serve fix", metric failed_charge_recovery.
    billingIssueLine: true,

    // ── PostgreSQL mode — spike, dark (2026-11-22) ───────────────────────
    // A "SQLite / PostgreSQL" toggle on the challenge page. PostgreSQL runs
    // in PGlite (PostgreSQL 18.6 as WASM, ~5.4 MB gzipped), fetched from
    // jsDelivr with SRI only when the person picks it; each challenge gets
    // its own instance, graded with the same comparator, on the allow-list
    // src/data/postgres-allowlist.json (301 of 312). The verdict is shown,
    // never recorded — no solve, XP or quota. Preview:
    // /app/?ff_features_postgresMode=true. Plan and recommendation:
    // docs/plans/postgres-mode-2026-11-22.md.
    postgresMode: false,

    // ── A company-page arrival opens question 1 (B5, 2026-11-22) ──────────
    // An A/B by aid (company_direct_v1, murmur-finalised hash): a person with
    // zero solves who arrives through `/app/?company=X` (no ?challenge=, no
    // ?interview=) lands in the question the company banner would open, in
    // the `direct` arm; the `list` arm keeps today's list + banner. Nothing
    // is asked, gated or priced. DARK: flip no earlier than 2026-12-19 — the
    // banner's own claim reads 12-18 on the same arrivals ("a company
    // arrival gets a first question to press"). src/utils/company-direct.js;
    // ledger "a company arrival opens question 1"; metric company_direct_split.
    // ON 2026-11-23 at 50/50 (A0, orchestrator-decisions 2026-11-22: "ON at
    // 50/50 after #156 merges"), ahead of the 12-19 date above. The 12-18
    // banner claim is read on the `list` arm and non-test arrivals only.
    companyDirectOpen: true,

    // ── Run stays on screen on phones (rank 1 of the mobile plan, 2026-11-23)
    // An A/B by aid (mobile_run_bar_v1, murmur-finalised hash), assigned at
    // the first challenge open on a narrow touch screen and written once as
    // `mobile_run_bar_assigned {arm}`. The `bar` arm pins the challenge's
    // Run / Submit bar to the bottom of the viewport below `md` (above the
    // keyboard where visualViewport is supported); `control` keeps today's
    // sticky bar. Desktop is untouched in both arms. Shipped off; ON at 50/50
    // 2026-11-25 (orchestrator decision row, after an iOS Simulator +
    // production walk on the bundle with #299's iOS fixes: PASS).
    // src/utils/mobile-run-bar.js; ledger "Run stays on screen on phones";
    // metric open_to_first_run, mobile band.
    // Plan: docs/plans/mobile-acquisition-2026-11-23.md §4.
    mobileRunBar: true,

    // ── The Debug question type (design PR #248, 2026-11-23) ──────────────
    // "An AI assistant wrote this for the task below. It returns the wrong
    // answer." Twelve items, ids 331-342, in src/data/debug-challenges.js,
    // which appends them to the bank (and their TikTok / Shopify tags to the
    // company map) ONLY while this is true. Off: no item, chip, line or count
    // anywhere. On: the Practice "Debug" chip, line numbers + the optional
    // spot step, the AI's query prefilled when no draft is saved, the bug
    // line on a solve, debugStats on the profile and the Coach. A solve
    // counts toward the 10 free solves like any challenge. Never a
    // /questions/ page in v1. src/utils/debug-questions.js; ledger "the
    // Debug set"; metric debug_solve_through. The orchestrator flips it in
    // its own decision row. ON 2026-11-23 (orchestrator-decisions.md).
    debugQuestions: true,

    // ── Sector datasets load on demand (builder, 2026-11-24) ──────────────
    // The five sector datasets (finans_banking, finans_fraud, finans_neobank,
    // gayrimenkul_nyc, uretim_industrial) are ~half of data.js gzipped and
    // every /app visit loads them. On: data.js leaves them out and the app
    // fetches each one (public/data/<file>?v=<hash>) the first time a
    // challenge, mock, ticket or first-run sector preview needs it, with a
    // loading line and Run held until it arrives. BUILD-TIME: the bundler
    // reads this value (scripts/bundle-data.js), so a URL override cannot
    // switch it — flipping is a rebuild. Off: data.js byte for byte as before.
    // src/utils/lazy-datasets.js; tests/lazy-datasets.test.js.
    lazySectorData: false,

    // ── The Coach's Debug door (orchestrator 2026-11-25, decision row in PR #372) ──
    // One card near the top of the Coach (under "Your plan", above the
    // roadmap; the goal next-step slot measured ~2,400-2,750 px down), "Fix a query an AI
    // wrote": its button opens the next unsolved Debug item the person may
    // open (curriculum order; through openChallenge, so the free quota and
    // the Pro locks apply exactly), "See all N" opens Practice with the Debug
    // chip on. Shown only with debugQuestions on, >= 1 solve, an unsolved
    // Debug item, and not for a hired person (First 90 Days). A door, not a
    // funnel-step A/B, so it ships ON. src/utils/coach-debug-door.js; events
    // coach_debug_door_shown / coach_debug_door_clicked; metric
    // coach_debug_door; ledger "the Coach's Debug door".
    coachDebugDoor: true,

    // Run is not Submit (2026-11-23, src/utils/run-submit-nudge.js): an A/B
    // by aid (run_submit_nudge_v1, murmur-finalised hash). A person with ZERO
    // solves whose Run returns rows on an unsolved challenge is assigned once
    // (`run_submit_nudge_assigned`); the `nudge` arm sees one line in the
    // output panel saying Submit completes it ("This matches the expected
    // output…" when it does). Acts only after the first run, so it does not
    // touch open_to_first_run (read to 12-20). DARK: flag-queue row 17, the
    // orchestrator decides the flip (companyDirectOpen "runs alone").
    // Ledger "Run is not Submit"; read first_solve_10m from assignment by arm.
    runSubmitNudge: false,

    // ── A runnable starter in the editor (desktop A/B, 2026-11-26) ────────
    // An A/B by aid (runnable_starter_v1, murmur-finalised hash), assigned at
    // the first challenge open that would show an empty editor (no solve, no
    // draft, not #91, not a Debug item) on a DESKTOP screen (≥ 1024 wide,
    // fine pointer) and written once as `runnable_starter_assigned {arm,
    // challengeId, viewport}`. `starter`: the editor holds a comment line
    // and `SELECT * FROM <first table> LIMIT 5;` as real text, selected on
    // focus, plus one grey line "Press Run to see the data first."; `control`
    // keeps the grey placeholder. Grading unchanged; the untouched starter is
    // never a solve. Phones are out (their cell is full, orchestrator
    // 2026-11-24). DARK on merge; the founder approved ON at 50/50 after
    // merge (chat, 2026-11-26). src/utils/runnable-starter.js; ledger "a
    // runnable starter in the editor"; metric runnable_starter_split.
    runnableStarter: true,
    // ── The tutor-limit signup ask says why (A3, 2026-11-27) ──────────────
    // When a guest's tutor calls run out (ai-tutor 429, plan 'guest'), the
    // signup modal shows "More AI help with a free account" / "Guest AI help
    // is used up for today…" instead of the solve-count praise. The ask is
    // counted (`signup_prompt_shown {ai_limit}`) whatever this flag says.
    // DARK on merge (funnel-step rule); flips only through its own row in
    // orchestrator-decisions.md. Ledger "the tutor-limit signup ask is
    // counted and says why"; metric ai_limit_ask.
    aiLimitAskCopy: false,

    // ── The first-session tournament (2026-11-26, PR 1 of 4: the frame) ───
    // New visitors only (a browser's FIRST app open; returning browsers and
    // `?interview=` / `?profile=` first opens never enter) are split by aid
    // (first_session_tournament_v1, murmur-finalised hash) across the ACTIVE
    // arms of src/data/tournament-arms.js, equal weights: A_control (today,
    // permanent), B_single_path, D_interview_sprint; C_proof_first queued.
    // Written once (`sqlquest_tournament_v1` + userData.tournament), never
    // re-armed; `tournament_assigned` once; `tArm` / `tArmV` on every row.
    // PR 1 builds no arm UI: B and D run A_control's behaviour (`built:
    // false`), so a flag-on preview is an A/A of the plumbing. DARK; the
    // flip is a separate PR after the plan's §2.4 gates, on 2026-12-12
    // (orchestrator 2026-11-27, after the holdout's halfway money read),
    // with the founder's go on the §7 money strings.
    // src/utils/tournament.js; metric first_session_tournament; read
    // scripts/tournament-read.sql. Off = the kill switch: nobody new is
    // enrolled and enrolled browsers get today's product.
    firstSessionTournament: false,
  },
};

// Utility functions
window.FF = {
  isEnabled(category, key) {
    return window.FEATURE_FLAGS?.[category]?.[key] ?? true;
  },
  tab(id) { return this.isEnabled('tabs', id); },
  feature(id) { return this.isEnabled('features', id); },
  toggle(category, key) {
    if (window.FEATURE_FLAGS?.[category]) {
      window.FEATURE_FLAGS[category][key] = !window.FEATURE_FLAGS[category][key];
      console.log(`[FF] ${category}.${key} = ${window.FEATURE_FLAGS[category][key]}`);
    }
  },
  loadURLOverrides() {
    const params = new URLSearchParams(window.location.search);
    params.forEach((value, key) => {
      if (key.startsWith('ff_')) {
        const [_, category, flag] = key.split('_');
        if (window.FEATURE_FLAGS?.[category]) {
          window.FEATURE_FLAGS[category][flag] = value === 'true';
        }
      }
    });
  }
};

window.FF.loadURLOverrides();
console.log('[Feature Flags] Loaded');
