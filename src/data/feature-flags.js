// SQL Quest - Feature Flags & A/B Testing
// Edit values here to enable/disable features

window.FEATURE_FLAGS = {
  // MAIN TABS
  tabs: {
    guide: true,           // 🤖 AI Tutor - ENABLED
    quests: true,          // 📝 Practice
    trials: true,          // 💼 Interview Prep
    leaderboard: true,     // 🏅 Leaderboard
    hero: true,            // 👤 Profile
  },
  
  // PRACTICE SUBTABS
  practiceSubtabs: {
    challenges: true,      // 🏆 Challenges
    speedRun: true,        // ⚡ Speed Mode - ENABLED
    skillForge: true,      // 🎯 Recommended - ENABLED
    exercises: true,       // 📝 Drills
    explain: true,         // 📖 Read SQL - ENABLED
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
    dailyChallenge: true,
    mockInterviews: true,
    smartErrorFeedback: true,
    soundEffects: true,
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
