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
