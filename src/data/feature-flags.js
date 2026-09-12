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
