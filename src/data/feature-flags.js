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
    // all three is a completed intake; nobody is asked twice; a skipped goal
    // still gets the one-question ask after the first solve, as today.
    //
    // SHIPPED OFF (2026-09-12). It sits on the first-contact stretch that the
    // "105 opener" ledger claim reads until 2026-09-13, so it flips on
    // 2026-09-16 by scheduled task — after that verdict, and only if the
    // claim was not extended. Claim, baseline (783 first-run viewers in 28
    // days, 56.7% reach a first challenge within 24h) and falsification:
    // docs/agent/ledger.md, "onboarding intake". Never a step toward
    // checkout: the block renders nothing about Pro, by test.
    onboardingIntake: false,
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
    intentRouting: false,
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
    companySetGate: false,
    // M2 — the interview-prep goal meets the wall at step 4, not 11: the
    // free Hard preview (challenge 23) moves to 3, a locked Hard (71, Top-N
    // per Category) to 4. A free user can set the locked step aside
    // (`coachState.stepsSkipped`, engine: passed over, never counted). Of
    // 79 interview-intent people in 30 days, 68 never opened a Hard.
    // Flips 2026-10-12, after the Coach-trust read (10-11) — it changes
    // what that goal's first steps ARE. Ledger: "the wall at step 4".
    goalWallEarly: false,
    // M3 — the milestone modal leads with the date. A person whose
    // intake / countdown date is inside 45 days sees "N days to your
    // interview" and what stands between them and it (the locked Hard set,
    // the company's mock), not the feature list. `pro_modal_shown` carries
    // deadline/daysOut so the ask-efficiency read splits on it. Flips
    // 2026-10-06, after the intake read (09-30) that gives it dates.
    // Ledger: "the six-solve ask speaks to the deadline".
    deadlineOffer: false,
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
    mockDoor: false,

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
    weakSkillNext: false,
    // The wrong-answer panel says WHAT is wrong (the diagnosis headline) in
    // place of "Try again!", and shows ONE hint chosen for the diagnosis
    // and the query (diagnose.js primaryHint) instead of the fixed three.
    // The new `row_set` diagnosis kind (right count, wrong rows) is live
    // either way — it is a truer report, not a different surface.
    diagnosisHints: false,
    // The inline tutor's ladder: request 1 names the defect in THEIR query,
    // 2 gives the exact clause, 3+ the full corrected query; asking for the
    // answer outright bypasses the ladder. Off, the tutor never reveals the
    // solution (today's rule 1). Bypass button on the panel is flag-only.
    socraticLadder: false,

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
