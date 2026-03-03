// ============================================================
// SQL Quest - Feature Flags & A/B Testing
// ============================================================
// 
// HOW TO USE:
// 1. Toggle features by changing true/false values below
// 2. Deploy to enable/disable features instantly
// 3. Use URL params for testing: ?ff_tabs_community=true
// 4. A/B tests auto-assign users to variants
//
// ============================================================

window.FEATURE_FLAGS = {
  
  // ==================== MAIN TABS ====================
  // Set to false to hide a tab completely
  tabs: {
    guide: false,          // 🧠 Learn - DISABLED
    quests: true,          // ⚔️ Practice - Challenges, exercises
    trials: true,          // 💼 Interview - Mock interviews
    leaderboard: true,     // 🏅 Ranks - Leaderboard
    hero: true,            // 📊 Stats - Progress & achievements
    // === NEW TABS (disabled by default) ===
    community: false,      // 👥 Community - Forums, discussions
    courses: false,        // 📚 Courses - Structured learning paths
    compete: false,        // 🎮 Compete - 1v1 battles
  },
  
  // ==================== PRACTICE SUBTABS ====================
  practiceSubtabs: {
    challenges: true,      // 🏆 Solve - SQL challenges
    speedRun: false,       // ⚡ Blitz - DISABLED
    skillForge: false,     // 🎯 Train - DISABLED
    exercises: true,       // 📝 Drills - Practice exercises
    explain: false,        // 🔍 Read - DISABLED
    // === NEW SUBTABS ===
    sandbox: false,        // 🧪 Sandbox - Free SQL playground
    daily: false,          // 📅 Daily - Daily challenges (if separate)
  },
  
  // ==================== STATS SUBTABS ====================
  statsSubtabs: {
    stats: true,           // 🏆 Achievements
    skills: true,          // 📊 Skill Radar
    reports: true,         // 📈 Weekly Reports
    // === NEW SUBTABS ===
    insights: false,       // 🔍 AI Insights
    history: false,        // 📜 Full History
  },
  
  // ==================== FEATURES ====================
  features: {
    // --- Core Features ---
    aiTutor: true,
    dailyChallenge: true,
    thirtyDayChallenge: true,
    mockInterviews: true,
    bossBattles: true,
    streakSystem: true,
    achievements: true,
    leaderboardFeature: true,
    
    // --- Pro Features ---
    proSubscription: true,
    stripePayments: true,
    
    // --- Enhancement Features ---
    smartErrorFeedback: true,   // Show helpful error suggestions
    socialSharing: true,        // Share achievements
    emailReminders: true,       // Streak reminders
    soundEffects: true,         // Sound on achievements
    confetti: true,             // Confetti animations
    
    // --- New Features (Disabled) ---
    voiceMode: false,           // Text-to-speech
    darkModeToggle: false,      // Manual theme switch
    offlineMode: false,         // PWA offline support
    aiCodeReview: false,        // AI reviews queries
    multiLanguage: false,       // i18n support
    liveCompete: false,         // Real-time battles
  },
  
  // ==================== UI OPTIONS ====================
  ui: {
    showBetaBadges: true,       // Show "Beta" on new features
    showNewIndicators: true,   // "New!" badges
    compactMode: false,         // Compact layout
    animations: true,           // UI animations
  }
};

// ============================================================
// A/B TESTING EXPERIMENTS
// ============================================================

window.AB_TESTS = {
  
  // --- Tab Naming Test ---
  tabNames: {
    id: 'tab_names_v1',
    enabled: false,  // Set true to activate
    variants: {
      control: {
        guide: '🧠 Learn',
        quests: '⚔️ Practice', 
        trials: '💼 Interview',
        leaderboard: '🏅 Ranks',
        hero: '📊 Stats'
      },
      questTheme: {
        guide: '🧙 Guide',
        quests: '⚔️ Quests',
        trials: '🏆 Trials', 
        leaderboard: '👑 Ranks',
        hero: '🦸 Hero'
      },
      simple: {
        guide: '📖 Learn',
        quests: '💪 Practice',
        trials: '🎯 Interview',
        leaderboard: '🏆 Leaderboard', 
        hero: '👤 Profile'
      }
    },
    weights: { control: 34, questTheme: 33, simple: 33 }
  },
  
  // --- Onboarding Flow Test ---
  onboarding: {
    id: 'onboarding_v1',
    enabled: false,
    variants: {
      none: { show: false },
      quick: { show: true, steps: 3 },
      full: { show: true, steps: 7 }
    },
    weights: { none: 33, quick: 34, full: 33 }
  },
  
  // --- Pricing Display Test ---  
  pricing: {
    id: 'pricing_v1',
    enabled: false,
    variants: {
      monthlyFirst: { order: ['monthly', 'annual', 'lifetime'] },
      annualFirst: { order: ['annual', 'monthly', 'lifetime'] },
      lifetimeFirst: { order: ['lifetime', 'annual', 'monthly'] }
    },
    weights: { monthlyFirst: 33, annualFirst: 34, lifetimeFirst: 33 }
  },

  // --- CTA Button Test ---
  ctaButton: {
    id: 'cta_v1', 
    enabled: false,
    variants: {
      start: { text: 'Start Learning', color: 'purple' },
      free: { text: 'Try Free', color: 'green' },
      join: { text: 'Join Now', color: 'blue' }
    },
    weights: { start: 34, free: 33, join: 33 }
  }
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

window.FF = {
  
  // Check if feature/tab is enabled
  isEnabled(category, key) {
    return window.FEATURE_FLAGS?.[category]?.[key] ?? false;
  },
  
  // Shortcuts
  tab(id) { return this.isEnabled('tabs', id); },
  feature(id) { return this.isEnabled('features', id); },
  ui(id) { return this.isEnabled('ui', id); },
  
  // Get enabled items from a category
  getEnabled(category) {
    const flags = window.FEATURE_FLAGS?.[category] || {};
    return Object.entries(flags)
      .filter(([_, enabled]) => enabled)
      .map(([key]) => key);
  },
  
  // Toggle (for dev/admin)
  toggle(category, key) {
    if (window.FEATURE_FLAGS?.[category]) {
      window.FEATURE_FLAGS[category][key] = !window.FEATURE_FLAGS[category][key];
      console.log(`[FF] ${category}.${key} = ${window.FEATURE_FLAGS[category][key]}`);
      return window.FEATURE_FLAGS[category][key];
    }
  },
  
  // Load overrides from URL (?ff_tabs_community=true)
  loadURLOverrides() {
    const params = new URLSearchParams(window.location.search);
    params.forEach((value, key) => {
      if (key.startsWith('ff_')) {
        const [_, category, flag] = key.split('_');
        if (window.FEATURE_FLAGS?.[category]) {
          window.FEATURE_FLAGS[category][flag] = value === 'true';
          console.log(`[FF URL] ${category}.${flag} = ${value}`);
        }
      }
    });
  }
};

// ============================================================
// A/B TESTING UTILITIES  
// ============================================================

window.AB = {
  STORAGE_PREFIX: 'sqlquest_ab_',
  
  // Get user's variant for an experiment
  getVariant(testId) {
    const test = window.AB_TESTS?.[testId];
    if (!test?.enabled) return null;
    
    // Check stored variant
    const key = this.STORAGE_PREFIX + test.id;
    let variant = localStorage.getItem(key);
    
    // Assign if not exists
    if (!variant || !test.variants[variant]) {
      variant = this._assignVariant(test);
      localStorage.setItem(key, variant);
      this._trackAssignment(testId, variant);
    }
    
    return variant;
  },
  
  // Get variant's config
  getConfig(testId) {
    const variant = this.getVariant(testId);
    return variant ? window.AB_TESTS[testId]?.variants[variant] : null;
  },
  
  // Assign variant based on weights
  _assignVariant(test) {
    const rand = Math.random() * 100;
    let sum = 0;
    for (const [variant, weight] of Object.entries(test.weights)) {
      sum += weight;
      if (rand < sum) return variant;
    }
    return Object.keys(test.weights)[0];
  },
  
  // Track assignment (for analytics)
  _trackAssignment(testId, variant) {
    console.log(`[AB] Assigned ${testId}: ${variant}`);
    // Add your analytics here (GA, Mixpanel, etc.)
    if (window.gtag) {
      window.gtag('event', 'ab_assignment', { test: testId, variant });
    }
  },
  
  // Track conversion event
  trackEvent(testId, event, value) {
    const variant = this.getVariant(testId);
    if (!variant) return;
    console.log(`[AB] Event ${testId}/${variant}: ${event}`, value);
    if (window.gtag) {
      window.gtag('event', event, { test: testId, variant, value });
    }
  },
  
  // Force variant (for testing)
  force(testId, variant) {
    const test = window.AB_TESTS?.[testId];
    if (test?.variants[variant]) {
      localStorage.setItem(this.STORAGE_PREFIX + test.id, variant);
      console.log(`[AB] Forced ${testId} = ${variant}`);
    }
  },
  
  // Reset all assignments
  reset() {
    Object.values(window.AB_TESTS).forEach(test => {
      localStorage.removeItem(this.STORAGE_PREFIX + test.id);
    });
    console.log('[AB] All tests reset');
  },
  
  // Get all active tests with user's variants
  getActive() {
    const active = {};
    Object.entries(window.AB_TESTS).forEach(([key, test]) => {
      if (test.enabled) {
        active[key] = this.getVariant(key);
      }
    });
    return active;
  }
};

// Initialize URL overrides
window.FF.loadURLOverrides();

// Log active state
console.log('[Feature Flags] Loaded');
console.log('[AB Tests] Active:', window.AB.getActive());
