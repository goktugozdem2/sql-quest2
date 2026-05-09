// Internationalization registry — added May 2026 after Elena's "filtreler
// kafa karıştırıcı, bazı kelimeler Türkçe bazı İngilizce" feedback.
//
// Single source of truth for every translatable string in the app.
// Designed to scale: adding a new language is a single new top-level
// entry plus a new SUPPORTED_LANGS row. Strings are organized by
// namespace ('common', 'nav', 'practice', etc.) so a future split into
// per-section JSON files is mechanical.
//
// USAGE:
//   import { t, setLang, useLanguage } from './utils/i18n.js';
//   t('practice', 'search')            // → "Search by name, id..." (en) / "İsim..." (tr)
//   t('common', 'showing', { n: 12, total: 198 })  // → "Showing 12 of 198"
//   setLang('tr')                       // → switches and notifies subscribers
//
// FALLBACK CHAIN:
//   1. requested language + namespace + key
//   2. English (canonical) namespace + key
//   3. the key itself (so missing translations are still readable)
//
// To add a new language (e.g. Spanish):
//   1. Add `es: { common: {...}, ... }` block to TRANSLATIONS below.
//   2. Add `{ code: 'es', label: 'Español', flag: '🇪🇸' }` to SUPPORTED_LANGS.
//   3. That's it — switcher picks it up automatically.

// ─── Supported languages ───────────────────────────────────────────────
//
// `wip: true` flags a language as work-in-progress: it shows in the
// language menu but with a "(beta)" tag and English fallbacks fill any
// missing strings. Use this when a translation is partially complete.
export const SUPPORTED_LANGS = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'tr', label: 'Türkçe',  flag: '🇹🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸', wip: true },
];

const FALLBACK_LANG = 'en';

// ─── Translation registry ──────────────────────────────────────────────
const TRANSLATIONS = {
  en: {
    // App-wide common labels
    common: {
      all: 'All', save: 'Save', cancel: 'Cancel', close: 'Close',
      ok: 'OK', back: 'Back', next: 'Next', previous: 'Previous',
      submit: 'Submit', clear: 'Clear', loading: 'Loading…',
      yes: 'Yes', no: 'No',
      showing: 'Showing {n} of {total} {label}',
      challenges: 'challenges', search: 'Search',
      free: 'Free', pro: 'Pro',
      language: 'Language',
      wipBadge: 'working on it',
    },

    // Top navigation tabs + the row of utility buttons (Daily/WarmUp/etc.)
    nav: {
      coach: 'Coach', practice: 'Practice', interview: 'Interview',
      board: 'Board', profile: 'Profile',
      daily: 'Daily', dailyDone: 'Done',
      warmup: 'Warm Up', weekly: 'Weekly',
      thirtyDay: '30-Day', dayN: 'Day {n}',
      goals: 'Goals',
      practiceLabel: 'Practice', coachLabel: 'Coach',
    },

    // Welcome-back card on the practice/home dashboard
    welcome: {
      title: '👋 Welcome back',
      titleShort: 'Welcome back!',
      lastSessionDaysAgo: 'Last session — {n} days ago',
      lastSessionToday: 'Last session — today',
      lastSessionYesterday: 'Last session — yesterday',
      attempted: 'ATTEMPTED', solved: 'SOLVED', topFocus: 'TOP FOCUS',
      level: 'Level {n}',
      resumeLabel: 'Resume where you left off:',
      pickUpHint: 'Pick up where you left off.',
      jumpBackIn: 'Jump back in',
      continueColon: 'Continue:',
      continuePrefix: '▶ Continue: {title}',
    },

    // SQL Challenges section header + meta
    challenges: {
      title: 'SQL Challenges',
      subtitle: 'LeetCode-style problems to test your skills',
      solvedCount: 'Solved: {n}/{total}',
      // Sub-tabs inside the Practice tab
      tabChallenges: 'Challenges',
      tabSpeedMode: 'Speed Mode',
      tabDrills: 'Drills',
      tabReadSQL: 'Read SQL',
    },

    // Practice tab — covered fully (was tPractice)
    practice: {
      view: 'View', allChallenges: 'All Challenges', learningPath: 'Learning Path',
      difficulty: 'Difficulty', status: 'Status',
      easy: 'Easy', medium: 'Medium', hard: 'Hard',
      unsolved: 'Unsolved', started: 'Started', solved: 'Solved',
      moreFilters: 'More filters', moreFiltersHide: 'Hide filters',
      company: 'Company', sector: 'Sector',
      activeFilters: 'Active filters', clearAll: 'Clear all',
      noResults: 'No challenges match these filters',
      noResultsHint: 'Try clearing one of the active filters above.',
      search: 'Search by name, id, skill, or company',
      searchClear: 'Clear search',
      noSearchResults: 'No challenges match',
      noSearchHint: 'Try a shorter query, an id like 27, or a skill like "join distinct".',
      backToChallenges: 'Back to Challenges',
      tutorOff: 'Tutor: Off', tutorSmart: 'Tutor: Smart', tutorCoach: 'Tutor: Coach',
      tutorOffMsg: "Live Tutor turned off — you're flying solo.",
      tutorSmartMsg: "Smart mode: I'll only nudge after a wrong submit.",
      tutorCoachMsg: "Coach mode: I'll watch you type and warn on common traps.",
      // Active challenge view chrome — surfaced after Tuncay's #3 wedge
      // (Türkçe seçtim, soruları İngilizce gördüm) on the labels too,
      // not just the challenge content.
      exitDrill: 'Exit Drill',
      prevButton: 'Previous',
      nextQuestion: 'Next Question',
      finishDrill: 'Finish Drill',
      drillNext: 'Next ({n}/{total})',
      positionOf: 'of',
      solvedBadge: '✅ Solved',
      problem: 'Problem',
      tablesUsed: 'Tables used:',
      skillsPracticedShow: 'Show skills practiced ({n})',
      skillsPracticedShown: 'Skills practiced:',
      reveal: 'Reveal',
      hideShort: 'Hide',
      example: 'Example:',
      exampleInput: 'Input:',
      exampleOutput: 'Output:',
      yourSolution: 'Your Solution',
      showStructure: 'Show Structure',
      hideStructure: 'Hide Structure',
      showHint: 'Show Hint',
      hideHint: 'Hide Hint',
      tableSchema: 'Table Schema',
      sampleData: 'Sample Data',
      firstNRows: '(first 3 rows)',
      // Editor + result chrome
      run: 'Run',
      submit: 'Submit',
      helpShort: 'Help',
      hideAlt: 'Hide',
      editorPlaceholder: 'Write your SQL solution here...',
      expectedOutput: 'Expected Output ({n} rows)',
      // Header / guest banner
      logIn: 'Log in',
      logInTooltip: 'Already have an account? Log in to save your progress.',
      playingAsGuest: 'Playing as Guest',
      progressNotSaved: "Your progress won't be saved. Create a free account to keep it!",
      saveProgressBtn: 'Save Progress',
      // Skill radar / panel chrome
      allSkills: 'All Skills (weakest → strongest)',
      newScoreTag: 'New',
      fix5: 'Fix 5 →',
      fix5Tooltip: 'Fix {topic} — 5 focused challenges',
      studyWithTutor: 'Study with AI tutor',
      last30Days: 'Your last 30 days',
      last30Empty: 'Solve a few challenges and come back — the 30-day trajectory of your practice per skill will show up here as sparklines.',
      cumulativePerSkill: 'Cumulative solves per skill',
      sparklineHelp: "Each sparkline shows your cumulative solves over the last 30 days. A steepening curve means you're ramping up on that skill.",
      improvementTips: 'Improvement Tips',
      drillInCoach: 'Drill in Coach →',
      allSkillsAbove50: 'All skills above 50%! Keep practicing to master them.',
      // Mock interview free-trial banner
      freeTrialAvailable: 'Free Trial Available',
      freeTrialSub: 'Try our SQL Fundamentals interview for free! Upgrade to Pro for unlimited access to all interviews.',
      // Score explainer panel
      whatNumbersMean: 'What these numbers mean',
      scoringIntro: 'Each skill is scored 0–100 based on five signals:',
      signalSuccessRate: 'Success rate',
      signalSuccessRateDesc: 'ratio of your passing submissions to total attempts',
      signalDifficulty: 'Difficulty',
      signalDifficultyDesc: 'harder challenges count more',
      signalCoverage: 'Coverage',
      signalCoverageDesc: "% of challenges for this skill you've solved",
      signalSpeed: 'Speed',
      signalSpeedDesc: 'how quickly you solve',
      signalHintPenalty: 'Hint penalty',
      signalHintPenaltyDesc: 'small deduction per hint used (capped at 20)',
      tierUnpracticed: "Haven't practiced yet",
      tierBuilding: 'Building competence',
      tierReady: 'Interview-ready',
      basedOnSolves: 'Based on {n} solves across {sessions} practice sessions.',
      decayNote: 'Scores decay over time if you stop practicing (spaced-repetition aware).',
      cumulativeSolveCount: '{n} solves',
      cumulativeSolveCountOne: '1 solve',
      // Practice tab challenge cards
      xpEarned: '+{n} XP earned',
      xpToEarn: '+{n} XP',
      startedTag: '🟠 Started',
      proLockedBadge: '🔒 Pro',
      skillDrillHeader: 'Skill Drill',
      questionLabel: 'Question',
      // Submit feedback
      acceptedTitle: '✅ Accepted!',
      acceptedDescXP: 'Your solution is correct. +{n} XP',
      showStructurePenalty: '(used Show Structure, -15%)',
      wrongTitle: '❌ Wrong Answer',
      wrongDesc: "Your output doesn't match the expected result. Try again!",
      // What's next + tour prompt
      whatsNext: "What's Next?",
      nextSameDiff: 'Next {difficulty} →',
      tryHarderDiff: 'Try {difficulty} ⬆',
      speedModeBtn: '⚡ Speed Mode',
      appTourPrompt: 'Nice! Want a quick tour of the rest of SQL Quest?',
      appTourPromptSub: '60 seconds — Coach, Interview, Board, Profile.',
      takeTourBtn: 'Take tour',
      // Boot / loading screen
      bootSettingUp: 'Setting up SQL Quest',
      bootLoadingEngine: 'Loading SQL engine',
      bootPreparingDatasets: 'Preparing datasets',
      bootReadyToGo: 'Ready to go',
      // Generic result panel
      resultErrorLabel: 'Error',
      resultNoResults: 'No results',
      // Misc daily / achievement
      allDoneToday: 'All Done for Today!',
      newRankAchieved: 'New rank achieved!',
      achievementBadge: 'Achievement!',
      // Auth modal sub-line
      practiceWithRealData: 'Practice SQL with real data. JOINs, Window Functions, CTEs and more.',
      // Profile / overall stats
      overallStats: 'Overall Stats',
      totalXp: 'Total XP',
      challengesSolvedLabel: 'Challenges Solved',
      queriesRun: 'Queries Run',
      dayStreak: 'Day Streak',
      aiTutorProgress: 'AI Tutor Progress',
      lessonsCompleted: 'Lessons Completed',
    },

    // Coach tab landing
    coach: {
      title: 'Coach', subtitle: 'Adaptive learning path',
      pickGoal: 'Pick a goal', startNow: 'Start now',
      yourNextStep: 'Your next step', allCaughtUp: "You're all caught up — pick a new goal.",
      // Quick Drill card (auto-targets weakest skill)
      quickDrill: 'QUICK DRILL', yourWeakestSkill: 'YOUR WEAKEST SKILL',
      drillIt: 'Drill it →',
      drillSubtitle: 'One focused challenge. Solves here count {mult}× on the radar.',
      // Focus Tracks card
      focusTracks: 'Focus Tracks',
      focusTracksHelp: 'Curated challenge paths for mastering a specific skill. Solve in order for the smoothest ramp from fundamentals to interview-level.',
      solvedFraction: '{n} / {total} solved',
      // Your goal card
      yourGoal: 'Your goal',
      takePlacement: 'Take placement', retakePlacement: 'Retake placement',
      changeGoal: 'Change goal',
      changeGoalConfirm: 'Change goal? Your radar stays, but this goal\'s step progress resets.',
      pctComplete: '{n}% complete',
      forYou: 'For you:',
    },

    // Auth screens
    auth: {
      login: 'Log in', signup: 'Sign up', logout: 'Log out',
      username: 'Username', password: 'Password',
      forgotPassword: 'Forgot password?',
      orContinueAs: 'Or continue as guest',
      welcome: 'Welcome to SQL Quest',
    },

    // Settings
    settings: {
      title: 'Settings', preferences: 'Preferences',
      languageHelp: 'Choose your preferred language. App restarts automatically.',
    },

    // Profile tab — sub-tabs, archetype card, proficiency, skill map
    profile: {
      tabSkills: 'Skills', tabAchievements: 'Achievements', tabReports: 'Reports',
      skillMapTitle: 'SQL Skill Map',
      yourArchetype: 'YOUR ARCHETYPE',
      profileBtn: 'Profile', shareBtn: 'Share',
      proficiency: 'SQL Proficiency',
      proficiencyBeginner: 'Beginner', proficiencyIntermediate: 'Intermediate',
      proficiencyAdvanced: 'Advanced', proficiencyExpert: 'Expert',
      countStrong: 'Strong', countModerate: 'Moderate',
      countWeak: 'Weak', countNew: 'New',
      yourShape: 'YOUR SHAPE',
      // Profile modal — header + stat tiles + share/invite/subscription
      modalTitle: '👤 Profile',
      guestUser: 'Guest User',
      notSaved: '⚠️ Not saved',
      synced: '☁️ Synced',
      localOnly: '💾 Local',
      progressNotSaved: "Your progress isn't saved",
      progressNotSavedDesc: 'Create a free account to keep your {xp} XP and {n} solved challenges forever.',
      createAccountCTA: 'Create Account & Save Progress',
      statQueries: 'Queries', statChallenges: 'Challenges',
      statAiLessons: 'AI Lessons', statAchievements: 'Achievements',
      shareSectionTitle: '📤 Share Your Progress',
      shareSectionSubtitle: 'Show off your SQL skills and inspire others to learn!',
      btnProgressCard: '📊 Progress Card',
      btnStreakBadge: '🔥 Streak Badge',
      btnCertificate: '🏆 30-Day Certificate',
      inviteSectionTitle: '🎁 Invite Friends — Earn XP',
      inviteSectionSubtitle: 'You and your friend each get +250 XP when they sign up!',
      copy: 'Copy', copied: 'Referral link copied!',
      friendsJoined: '👥 {n} friends joined',
      friendJoined: '👥 1 friend joined',
      viewReferralHub: 'View Referral Hub →',
      subscriptionTitle: '💳 Subscription',
      planFree: 'Free Plan',
      planMonthly: 'Monthly', planAnnual: 'Annual', planLifetime: 'Lifetime',
      planValidForever: 'Valid forever',
      planRenewsOn: 'Renews on {date} ({n} days)',
      planExpiresOn: 'Expires on {date} ({n} days)',
      autoRenewLabel: 'Auto-renew:',
      autoRenewOn: 'ON', autoRenewOff: 'OFF',
      planUpgrade: 'Upgrade',
      planManage: 'Manage',
      planUpgradePrompt: 'Upgrade to unlock all mock interviews',
      recentQueries: 'Recent Queries',
      noQueries: 'No queries yet',
      changePassword: 'Change Password',
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      confirmPassword: 'Confirm New Password',
      cancelChange: 'Cancel',
      // Radar axis labels — kept as is (these are SQL skill names, brand-neutral)
      // but we still surface short forms in the dictionary so a contributor
      // could localize them (e.g. JOIN → BAĞLAMA) if desired. For now keep en.
    },

    // Archetype identities (SkillRadar). Each archetype has a stable id;
    // the helper exports the id so the UI can localize name+tagline here.
    archetypes: {
      explorer_name: 'The Explorer',
      explorer_tagline: 'Mapping the territory. Every solve sharpens the shape.',
      explorer_taglineEmpty: 'Fresh start. Your shape begins with your next solve.',
      window_wizard_name: 'The Window Wizard',
      window_wizard_tagline: 'ROW_NUMBER, RANK, LAG — you see the patterns others miss.',
      join_master_name: 'The Join Master',
      join_master_tagline: "You weave tables together like it's breathing.",
      aggregation_ace_name: 'The Aggregation Ace',
      aggregation_ace_tagline: 'COUNT, SUM, GROUP — the numbers bend to you.',
      logic_surgeon_name: 'The Logic Surgeon',
      logic_surgeon_tagline: 'Conditional logic, nested precision. Every edge case accounted for.',
      null_whisperer_name: 'The NULL Whisperer',
      null_whisperer_tagline: 'Where others get tripped up, you see the empty cells clearly.',
      data_wrangler_name: 'The Data Wrangler',
      data_wrangler_tagline: 'Strings and dates are putty in your hands.',
      full_stack_name: 'The Full-Stack Analyst',
      full_stack_tagline: 'Strong across the board. No weak spots.',
      journey_person_name: 'The Journey-Person',
      journey_person_tagline: 'Broad footing, leveling up every skill.',
      apprentice_name: 'The Apprentice',
      apprentice_tagline: 'The basics are locking in. Momentum building.',
    },

    // Daily Challenge modal — header, reminder setup, difficulty selector,
    // struggling alert, progress steps, stats bar.
    daily: {
      title: 'Daily Challenge',
      headerMeta: '{day} • {topic} • {difficulty}',
      streakLabel: '{n} day streak',
      reminderSettings: 'Reminder settings',
      reminderTitle: 'Never Miss a Challenge',
      reminderSubtitle: 'Daily at 11:00 AM (GMT+3)',
      browserNotify: 'Browser Notify',
      notificationsOn: '✓ Notifications On',
      googleCalendar: 'Google Calendar',
      notificationsEnabled: '✅ Browser notifications enabled!',
      recommendedDifficulty: 'Recommended Difficulty',
      basedOnPerformance: 'Based on your challenge performance',
      easy: 'Easy', medium: 'Medium', hard: 'Hard',
      recommendedHint: '★ Recommended: {diff} • You can always adjust',
      strugglingTitle: 'Having a tough week?',
      strugglingMsg: "No worries - that's how we learn! Want to try an easier challenge today to rebuild momentum?",
      tryEasy: 'Yes, try Easy',
      keepDifficulty: 'Keep current difficulty',
      stepWarmup: 'Warm-up',
      stepChallenge: 'Challenge',
      stepWarmupBadge: 'Step 1: Warm-up',
      stepWarmupTime: '30 seconds',
      stepChallengeBadge: 'Step 2: SQL Challenge',
      avgSolve: '⏱️ Avg solve: {range} min',
      solveRate: '📊 {pct}% solve rate',
      xpAward: '+{n} XP',
      shareProgress: '📤 Share Progress',
      checkAnswer: 'Check Answer',
      continueToChallenge: 'Continue to Challenge →',
    },

    // Leaderboard / Board tab
    board: {
      title: 'Global Leaderboard',
      shareBtn: 'Share', inviteBtn: 'Invite',
      rankGrandmaster: 'Grandmaster', rankMaster: 'Master',
      rankExpert: 'Expert', rankAdvanced: 'Advanced',
      rankIntermediate: 'Intermediate', rankBeginner: 'Beginner',
    },

    // Speed Run / Hız Modu screen
    speedRun: {
      title: 'Speed Run Challenge',
      subtitle: 'Test your SQL skills! Solve as many challenges as you can in 5 minutes. Fast thinking, faster coding!',
      ptsEasy: '10 pts', ptsMedium: '20 pts', ptsHard: '30 pts',
      labelEasy: 'Easy', labelMedium: 'Medium', labelHard: 'Hard',
      bonusSpeed: '+5 pts speed bonus (under 15s)',
      bonusCombo3: '1.5x combo at 3 streak',
      bonusCombo5: '2x combo at 5 streak',
      keyboardHint: 'Tab to skip, Ctrl+Enter to submit',
      modeAll: 'All Difficulties',
      modeEasyOnly: 'Easy Only', modeMediumOnly: 'Medium Only', modeHardOnly: 'Hard Only',
    },

    // Goals (Hedefler) modal
    goals: {
      title: 'Weekly Goals',
      empty: 'No goals set yet. Add one below!',
      addNew: 'Add a new goal (max 3 active):',
      passInterviews: 'Pass 2 Interviews',
      solveChallenges: 'Solve 5 Challenges',
      earnXP: 'Earn 500 XP',
      streak5: '5-Day Streak',
      close: 'Close',
    },

    // Lesson list sidebar (Coach + AI tutor) + 10 canonical AI lesson titles.
    // Lesson titles are looked up by `lesson_${id}` so the data file
    // (src/data/exercises.js) keeps its English `title` field as the
    // canonical source — UI substitutes the localized version at render.
    lessons: {
      title: 'Lessons',
      lesson_1: 'Introduction to SQL',
      lesson_2: 'SELECT Statement',
      lesson_3: 'Filtering with WHERE',
      lesson_4: 'Combining Conditions',
      lesson_5: 'Sorting Results',
      lesson_6: 'Aggregate Functions',
      lesson_7: 'GROUP BY',
      lesson_8: 'HAVING Clause',
      lesson_9: 'JOIN Basics',
      lesson_10: 'Advanced Queries',
      // Lesson topic subtitles (shown under the title in lesson header).
      // Same fallback rule: UI uses i18n_t result if a key exists, otherwise
      // falls back to data-file `topic`.
      topic_1: 'What is SQL and why it matters',
      topic_2: 'Retrieving data from tables',
      topic_3: 'Using conditions to filter data',
      topic_4: 'Using AND, OR to combine filters',
      topic_5: 'Ordering data with ORDER BY',
      topic_6: 'Calculating statistics with COUNT, SUM, AVG, MIN, MAX',
      topic_7: 'Grouping data for aggregate analysis',
      topic_8: 'Filtering grouped data',
      topic_9: 'Combining data from multiple tables',
      topic_10: 'Subqueries and complex analysis',
    },

    // AI SQL Tutor hub — landing card + sidebar + skill mastery panel
    aiTutor: {
      // Hub landing
      hubTitle: 'AI SQL Tutor',
      hubSubtitle: 'Learn SQL interactively with your personal AI tutor. Each lesson includes teaching, examples, and practice questions with real-time feedback.',
      welcomeBack: 'Welcome back! 🎉',
      completedFraction: "You've completed {n} of {total} lessons",
      continueLearning: 'Continue Learning →',
      startOver: 'Start Over',
      startLearning: 'Start Learning →',
      reviewLessons: 'Review Lessons 🔄',
      allDone: '🏆 All lessons completed!',
      // Stat tiles
      statLessons: 'Lessons',
      statInteractive: 'Interactive',
      statInteractiveSub: 'Teaching',
      statRealtime: 'Real-time',
      statRealtimeSub: 'Feedback',
      statXpPerLesson: 'Per Lesson',
      // Sidebar (lesson list panel)
      aiLessonsHeader: 'AI Lessons',
      aiTutorActive: '🤖 AI Tutor Active',
      dailyAiCalls: 'Daily AI Calls',
      upgradeForMore: '⬆ Upgrade for more calls',
      lessonsCompletedFraction: '{n}/{total} completed',
      currentSession: 'Current Session',
      coding: 'Coding:',
      totalAsked: 'Total asked:',
      concepts: 'Concepts:',
      attempts: 'Attempts:',
      phase: 'Phase:',
      phaseConceptCheck: '🧠 Concept Check',
      phaseReview: '📝 Review',
      get3InRowPractice: 'Get 3 correct in a row to advance!',
      get3CorrectComplete: 'Get 3 correct to complete lesson!',
      // Skill mastery panel
      yourSqlSkills: 'Your SQL Skills',
      totalPractice: 'Total Practice:',
      questionsCount: '{n} questions',
      successRate: 'Success Rate:',
      // Lesson header (when a lesson is open) + chat + sandbox
      lessonPrefix: 'Lesson {n}',
      backToLessons: '← Back to Lessons',
      studySession: '📚 Study Session',
      tutorBadge: 'AI Tutor',
      send: 'Send',
      restart: '↺ Restart',
      continueConvo: 'Continue the conversation...',
      placeholderIntro: "Say 'ready' to start learning...",
      placeholderTeaching: "Ask questions or say 'practice' when ready...",
      placeholderPractice: 'Use the SQL Sandbox below, or ask for hints...',
      placeholderFeedback: "Continue or click 'Start Comprehension Check'...",
      placeholderComprehension: 'Explain the concept in your own words...',
      sandboxTitle: 'SQL Sandbox',
      sandboxSubtitle: 'Test queries anytime • Table: {table}',
      sandboxPlaceholder: 'Write SQL here to explore the data... (Ctrl+Enter to run)',
      sandboxRun: 'Run',
      sandboxUseAsAnswer: '📋 Use as Answer',
      runQueryHint: 'Run a query to see results here',
      availableColumns: 'Available columns:',
      // Submit Answer card
      submitTitle: '✍️ Submit Your Answer',
      submitSubtitle: 'Use the SQL Sandbox below to test first!',
      submitDesc: "When you're confident in your answer, paste it here and submit for AI feedback.",
      submitPlaceholder: 'Paste your final SQL answer here...',
      btnTest: 'Test',
      btnSubmit: 'Submit Answer',
      // Phase badges
      phaseHook: '🪝 Hook',
      phaseProbe: '🔍 Gauging',
      phaseAttempt: '💪 Try It',
      phaseDiscover: '🧭 Discovering',
      phaseReveal: '💡 The Concept',
      phasePractice: '✍️ Practice',
      phaseFeedback: '💬 Feedback',
      phaseMastery: '🏆 Mastery',
      phaseIntro: '👋 Introduction',
      phaseTeaching: '📖 Learning',
      phaseComprehension: '🧠 Comprehension',
      phaseStudy: '📚 Studying',
      phaseComplete: '✅ Complete',
      phaseDefault: '📝 Review',
      // Quick action buttons in chat row
      btnReady: "I'm ready! →",
      btnReadyToPractice: 'Ready to practice →',
      btnNextQuestion: 'Next question →',
      btnNextLesson: 'Next Lesson →',
      btnHint: 'Get a hint 💡',
      btnHintShort: 'Hint 💡',
      btnIDontKnow: "I don't know 🤷",
      btnShowAnswer: 'Show me the answer',
      btnBuildStepByStep: '🔨 Build step by step',
      btnStartMasteryCheck: 'Start Mastery Check 🏆',
      btnTeachItBack: '🏆 Teach it back to prove you own it',
      streakLabel: 'Streak: {n}/3 🔥',
      discoveryLabel: 'Discovery {n}/2',
      buildingStep: '🔨 Building step {n}/6',
      exitGuided: 'Exit guided mode',
      tryWritingHint: '✨ Try writing SQL above or ask for help!',
    },

    // Coach next-step card — step-type labels + dynamic reasons +
    // placement check inline state.
    coachNext: {
      label: 'Next step',
      lesson: '📖 Lesson',
      challenge: '⚔️ Challenge',
      drill: '🎯 Drill: {skill}',
      mastery: '💪 Mastery Check: {skill}',
      retrieval: '⏳ Retrieval Check',
      reasonLesson: 'Learn this concept first — it unlocks the next challenges.',
      reasonChallenge: "Apply what you've learned on a real challenge.",
      reasonDrillScored: 'Drill {skill} — your radar shows {score}/100.',
      reasonDrillBlind: 'Drill {skill} with 5 focused challenges.',
      reasonMastery: 'Prove mastery of {skill} — solve {n} fresh challenges{level}.',
      reasonMasteryLevel: ' at {level}+',
      reasonRetrieval: 'Come back tomorrow and solve a challenge on this skill — retrieval beats re-reading.',
      reasonGeneric: 'Next step.',
      placementBadge: '🎯 Placement Check · calibrates your radar',
      placementAnswered: '{n} of {total} answered',
      skipPlacement: 'Skip placement',
      startCTA: 'Start →',
      continueCTA: 'Continue →',
      graduated: '🎉 You graduated!',
    },

    // Onboarding tour — frame + 5 nav step contents
    tour: {
      stepXofY: 'Step {n} of {total}',
      skipTour: 'Skip tour',
      next: 'Next →',
      gotIt: "Got it, let's go!",
      coachTitle: '🧭 Coach',
      coachBody: "Your personal AI learning path. It picks the next challenge, lesson, or drill based on what you know and where you're going.",
      practiceTitle: '📝 Practice',
      practiceBody: "All 126 challenges. Filter by difficulty or topic. This is where you'll spend most of your time — SQL is a muscle you build by writing queries.",
      interviewTitle: '💼 Interview',
      interviewBody: "Timed mock interviews modeled on real FAANG + top-tier company rounds. When you're close to ready for a job, this is your proving ground.",
      boardTitle: '🏅 Board',
      boardBody: 'Streaks, XP, achievements, leaderboard. Daily consistency is what actually builds SQL mastery — this is where you see yourself progress.',
      profileTitle: '👤 Profile',
      profileBody: 'Your public skill radar. A shareable proof-of-skill you can put on LinkedIn, Twitter, or your resume. Recruiters can see exactly what you can do.',
    },

    // Notifications popup (top-right bell)
    notifications: {
      title: 'Notifications',
      allCaughtUp: 'All caught up!',
      dismiss: 'Dismiss',
      useFreeze: '🧊 Use Freeze',
    },

    // Daily Login Reward modal — first thing users see after login. The
    // 7-day streak dots, monthly calendar with milestone icons (Day 7/14/
    // 21/28), reward claim CTA. Plus the share toasts that fire after
    // level-ups / achievements.
    streakModal: {
      title: '🎁 Daily Reward!',
      weeklyMilestone: '🎉 Weekly Milestone!',
      daysToBonus: '{n} days to bonus',
      dayStreak: 'day streak',
      bestPrefix: 'best:',
      daysLogged: '{n} days logged',
      milestoneDay: 'Day {n}',
      milestoneDone: '✓ Done',
      yourReward: 'Your Reward',
      streakBonus: 'Includes +{n} streak bonus!',
      claimReward: 'Claim Reward! 🎉',
      xpClaimed: '✓ +{n} XP Claimed!',
      // Calendar — month names + weekday letters in case we want to swap
      // alphabets later. Default keeps Jan-Dec / S-M-T-W-T-F-S.
      monthJan: 'January', monthFeb: 'February', monthMar: 'March',
      monthApr: 'April', monthMay: 'May', monthJun: 'June',
      monthJul: 'July', monthAug: 'August', monthSep: 'September',
      monthOct: 'October', monthNov: 'November', monthDec: 'December',
      weekdayS: 'S', weekdayM: 'M', weekdayT: 'T', weekdayW: 'W', weekdayF: 'F',
    },

    // Share-progress toast (slides up after level-ups / achievements /
    // certificates). The title is dynamic ("Level Up: {name}!", "Achievement
    // Unlocked: {name}!"); the subtitle + share action labels are static.
    shareToast: {
      shareYourProgress: 'Share your progress!',
      btnTwitter: '𝕏',
      btnLinkedin: 'in',
      btnReddit: '↗ Reddit',
      btnCopy: '📋 Copy',
      // Title prefixes (the dynamic name comes from data files)
      levelUp: 'Level Up: {name}!',
      achievementUnlocked: 'Achievement Unlocked: {name}!',
      certificate: '30-Day Master Certificate!',
      learningSql: 'Learning SQL!',
    },

    // Drills tab (Practice → Alıştırmalar) — lesson list + exercise card +
    // table reference. Reuses lessons.lesson_N for titles. Mirrors
    // aiTutor's submit/sandbox shape but a separate namespace because the
    // copy is tuned for "drill" mode (no AI feedback, exact-string match).
    drills: {
      overallProgress: 'Overall Progress',
      exercisesCompleted: 'Exercises Completed',
      tableLabel: 'Table:',
      exerciseXofY: 'Exercise {n} of {total}',
      diffEasy: '🟢 Easy', diffMedium: '🟡 Medium', diffHard: '🔴 Hard',
      completedBadge: '✓ Completed',
      tablesToJoin: '🔗 Tables to JOIN:',
      joinKey: '💡 Join key: {key}',
      expectedOutput: '📋 Expected Output ({n} rows)',
      queryPlaceholder: 'Write your SQL query here...',
      btnTest: 'Test',
      btnSubmit: 'Submit Answer',
      correctXP: '✅ Correct! +{n} XP',
      notQuiteRight: '⚠️ Not quite right. Check your query.',
      yourOutput: 'Your Output ({n} rows):',
      errorPrefix: '❌ Error: {msg}',
      errorChecking: 'Error checking result.',
      availableTables: '📋 Available Tables & Columns',
    },

    // Speed Run "Your Best Runs" history block (shown above the difficulty
    // selector when the user has at least 1 run logged).
    speedRunStats: {
      yourBestRuns: '🏆 Your Best Runs',
      runSolved: '{n} solved',
      runPoints: '{n} pts',
      paused: 'Paused',
      pausedHint: 'Switch back to this tab to resume',
      timeUsed: 'Time Used',
      playAgain: '⚡ Play Again',
      back: 'Back',
      firstTimeHint: '💡 First time? Choose a difficulty above to start your first speed run. Your best scores will appear here!',
    },

    // Mock Interview list — filter chips + card chrome (Best Score / X
    // attempts / Retry / Practice / Pass: N% / min / questions / +N more)
    interviewList: {
      filterAll: 'All',
      filterEasy: 'Easy',
      filterMedium: 'Medium',
      filterHard: 'Hard',
      filterSolved: 'Solved',
      filterUnsolved: 'Unsolved',
      badgeFree: 'FREE',
      badgePro: 'PRO',
      meta: '{min} min · {q} questions · Pass: {pct}%',
      minutesLabel: '{n} min',
      questionsLabel: '{n} questions',
      passLabel: 'Pass: {pct}%',
      moreSkills: '+{n} more',
      bestScore: 'Best Score',
      attemptsOne: '{n} attempt',
      attemptsMany: '{n} attempts',
      btnRetry: 'Retry',
      btnPractice: '🧘 Practice',
      btnPracticeMode: '🧘 Practice Mode',
      btnStart: 'Start Interview',
      btnUnlockPro: 'Unlock Pro',
    },

    // Interview tab
    interview: {
      title: 'SQL Mock Interviews',
      subtitle: 'Practice with timed, real-world interview questions',
      proMember: 'PRO Member',
      interviewsCompleted: 'Interviews Completed', passed: 'Passed',
      avgScore: 'Avg Score', analytics: 'Analytics',
      recommendedForYou: 'Recommended for You',
      retryToImprove: 'Retry "{title}" to improve your score from {pct}%',
      focusAreas: 'Focus areas: {list}',
      startNow: 'Start Now',
      questionsToReview: 'Questions to Review ({n} remaining)',
      viewAllPast: 'View all past interviews →',
    },
  },

  tr: {
    common: {
      all: 'Tümü', save: 'Kaydet', cancel: 'İptal', close: 'Kapat',
      ok: 'Tamam', back: 'Geri', next: 'İleri', previous: 'Önceki',
      submit: 'Gönder', clear: 'Temizle', loading: 'Yükleniyor…',
      yes: 'Evet', no: 'Hayır',
      showing: '{total} {label}\'den {n} tanesi gösteriliyor',
      challenges: 'soru', search: 'Ara',
      free: 'Ücretsiz', pro: 'Pro',
      language: 'Dil',
      wipBadge: 'yakında',
    },

    nav: {
      coach: 'Koç', practice: 'Pratik', interview: 'Mülakat',
      board: 'Skor', profile: 'Profil',
      daily: 'Günlük', dailyDone: 'Bitti',
      warmup: 'Isınma', weekly: 'Haftalık',
      thirtyDay: '30 Gün', dayN: 'Gün {n}',
      goals: 'Hedefler',
      practiceLabel: 'Pratik', coachLabel: 'Koç',
    },

    welcome: {
      title: '👋 Tekrar hoş geldin',
      titleShort: 'Tekrar hoş geldin!',
      lastSessionDaysAgo: 'Son oturum — {n} gün önce',
      lastSessionToday: 'Son oturum — bugün',
      lastSessionYesterday: 'Son oturum — dün',
      attempted: 'DENENEN', solved: 'ÇÖZÜLEN', topFocus: 'ODAK',
      level: 'Seviye {n}',
      resumeLabel: 'Kaldığın yerden devam:',
      pickUpHint: 'Kaldığın yerden devam et.',
      jumpBackIn: 'Geri dön',
      continueColon: 'Devam:',
      continuePrefix: '▶ Devam: {title}',
    },

    challenges: {
      title: 'SQL Soruları',
      subtitle: 'Becerilerini sınayan LeetCode-tarzı sorular',
      solvedCount: 'Çözülen: {n}/{total}',
      tabChallenges: 'Sorular',
      tabSpeedMode: 'Hız Modu',
      tabDrills: 'Alıştırmalar',
      tabReadSQL: 'SQL Oku',
    },

    practice: {
      view: 'Görünüm', allChallenges: 'Tüm Sorular', learningPath: 'Öğrenme Yolu',
      difficulty: 'Zorluk', status: 'Durum',
      easy: 'Kolay', medium: 'Orta', hard: 'Zor',
      unsolved: 'Çözülmedi', started: 'Başladım', solved: 'Çözüldü',
      moreFilters: 'Daha fazla filtre', moreFiltersHide: 'Filtreleri gizle',
      company: 'Şirket', sector: 'Sektör',
      activeFilters: 'Aktif filtreler', clearAll: 'Hepsini temizle',
      noResults: 'Bu filtrelere uyan soru yok',
      noResultsHint: 'Yukarıdaki filtrelerden birini kaldırmayı dene.',
      search: 'İsim, id, beceri veya şirket ile ara',
      searchClear: 'Aramayı temizle',
      noSearchResults: 'Eşleşen soru yok',
      noSearchHint: 'Daha kısa bir sorgu, "27" gibi bir id, ya da "join distinct" gibi bir beceri dene.',
      backToChallenges: 'Sorulara Dön',
      tutorOff: 'Koç: Kapalı', tutorSmart: 'Koç: Akıllı', tutorCoach: 'Koç: Tam',
      tutorOffMsg: 'Canlı Koç kapatıldı — şimdi tek başına uçuyorsun.',
      tutorSmartMsg: 'Akıllı mod: yalnız yanlış cevap sonrası söyleyeceğim.',
      tutorCoachMsg: 'Tam mod: yazarken seni izleyip yaygın tuzakları uyaracağım.',
      exitDrill: 'Drill\'den Çık',
      prevButton: 'Önceki',
      nextQuestion: 'Sonraki Soru',
      finishDrill: 'Drill\'i Bitir',
      drillNext: 'Sonraki ({n}/{total})',
      positionOf: '/',
      solvedBadge: '✅ Çözüldü',
      problem: 'Soru',
      tablesUsed: 'Kullanılan tablolar:',
      skillsPracticedShow: 'Pratiği yapılan beceriler ({n})',
      skillsPracticedShown: 'Pratiği yapılan beceriler:',
      reveal: 'Göster',
      hideShort: 'Gizle',
      example: 'Örnek:',
      exampleInput: 'Giriş:',
      exampleOutput: 'Çıktı:',
      yourSolution: 'Çözümünüz',
      showStructure: 'Yapıyı Göster',
      hideStructure: 'Yapıyı Gizle',
      showHint: 'İpucunu Göster',
      hideHint: 'İpucunu Gizle',
      tableSchema: 'Tablo Şeması',
      sampleData: 'Örnek Veri',
      firstNRows: '(ilk 3 satır)',
      run: 'Çalıştır',
      submit: 'Gönder',
      helpShort: 'Yardım',
      hideAlt: 'Gizle',
      editorPlaceholder: 'SQL çözümünü buraya yaz...',
      expectedOutput: 'Beklenen Çıktı ({n} satır)',
      logIn: 'Giriş Yap',
      logInTooltip: 'Hesabın var mı? İlerlemeni kaydetmek için giriş yap.',
      playingAsGuest: 'Misafir Modu',
      progressNotSaved: 'İlerlemen kaydedilmeyecek. Saklamak için ücretsiz hesap oluştur!',
      saveProgressBtn: 'İlerlemeyi Kaydet',
      allSkills: 'Tüm Beceriler (en zayıf → en güçlü)',
      newScoreTag: 'Yeni',
      fix5: '5 Soru Çöz →',
      fix5Tooltip: '{topic} eksiğini kapat — 5 odaklı soru',
      studyWithTutor: 'AI Tutor ile çalış',
      last30Days: 'Son 30 günün',
      last30Empty: 'Birkaç soru çöz ve geri dön — son 30 gündeki beceri pratiğin burada sparkline olarak görünecek.',
      cumulativePerSkill: 'Beceri başına kümülatif çözüm',
      sparklineHelp: 'Her sparkline son 30 gündeki kümülatif çözümlerini gösterir. Eğri dikleşiyorsa o beceride hızlanıyorsun demektir.',
      improvementTips: 'Geliştirme İpuçları',
      drillInCoach: "Coach'ta Pratik Yap →",
      allSkillsAbove50: 'Tüm becerilerin %50 üstünde! Ustalaşmak için pratiğe devam.',
      freeTrialAvailable: 'Ücretsiz Deneme Mevcut',
      freeTrialSub: 'SQL Fundamentals mülakatını ücretsiz dene! Tüm mülakatlara sınırsız erişim için Pro\'ya geç.',
      whatNumbersMean: 'Bu sayılar ne anlama geliyor',
      scoringIntro: 'Her beceri beş sinyale göre 0–100 arası puanlanır:',
      signalSuccessRate: 'Başarı oranı',
      signalSuccessRateDesc: 'doğru gönderimlerinin toplam denemelere oranı',
      signalDifficulty: 'Zorluk',
      signalDifficultyDesc: 'zor sorular daha çok sayar',
      signalCoverage: 'Kapsam',
      signalCoverageDesc: 'bu beceriden çözdüğün soruların yüzdesi',
      signalSpeed: 'Hız',
      signalSpeedDesc: 'ne kadar çabuk çözüyorsun',
      signalHintPenalty: 'İpucu cezası',
      signalHintPenaltyDesc: 'her ipucu için küçük düşüş (max 20)',
      tierUnpracticed: 'Henüz pratik yapılmamış',
      tierBuilding: 'Yetkinlik geliştiriliyor',
      tierReady: 'Mülakata hazır',
      basedOnSolves: '{n} çözüm, {sessions} pratik oturumu temel alındı.',
      decayNote: 'Pratik durdurulursa puanlar zamanla düşer (spaced-repetition farkındalıklı).',
      cumulativeSolveCount: '{n} çözüm',
      cumulativeSolveCountOne: '1 çözüm',
      xpEarned: '+{n} XP kazanıldı',
      xpToEarn: '+{n} XP',
      startedTag: '🟠 Başladı',
      proLockedBadge: '🔒 Pro',
      skillDrillHeader: 'Beceri Drilli',
      questionLabel: 'Soru',
      acceptedTitle: '✅ Kabul Edildi!',
      acceptedDescXP: 'Çözümün doğru. +{n} XP',
      showStructurePenalty: '(Yapıyı Göster kullanıldı, -%15)',
      wrongTitle: '❌ Yanlış Cevap',
      wrongDesc: 'Çıktın beklenen sonucu eşlemiyor. Tekrar dene!',
      whatsNext: 'Sıradaki?',
      nextSameDiff: 'Sonraki {difficulty} →',
      tryHarderDiff: '{difficulty} dene ⬆',
      speedModeBtn: '⚡ Hız Modu',
      appTourPrompt: 'Süper! SQL Quest\'in geri kalanını hızlıca gezdireyim mi?',
      appTourPromptSub: '60 saniye — Coach, Mülakat, Liderlik, Profil.',
      takeTourBtn: 'Tura başla',
      bootSettingUp: 'SQL Quest hazırlanıyor',
      bootLoadingEngine: 'SQL motoru yükleniyor',
      bootPreparingDatasets: 'Veri kümeleri hazırlanıyor',
      bootReadyToGo: 'Hazır',
      resultErrorLabel: 'Hata',
      resultNoResults: 'Sonuç yok',
      allDoneToday: 'Bugünkü görevler tamam!',
      newRankAchieved: 'Yeni rütbe açıldı!',
      achievementBadge: 'Başarı!',
      practiceWithRealData: 'Gerçek veriyle SQL pratiği. JOIN\'ler, Window Function\'lar, CTE\'ler ve daha fazlası.',
      overallStats: 'Genel İstatistikler',
      totalXp: 'Toplam XP',
      challengesSolvedLabel: 'Çözülen Sorular',
      queriesRun: 'Çalıştırılan Sorgular',
      dayStreak: 'Günlük Seri',
      aiTutorProgress: 'AI Tutor İlerlemesi',
      lessonsCompleted: 'Tamamlanan Dersler',
    },

    coach: {
      title: 'Koç', subtitle: 'Adaptif öğrenme yolu',
      pickGoal: 'Hedef seç', startNow: 'Şimdi başla',
      yourNextStep: 'Sıradaki adımın', allCaughtUp: 'Tamamladın — yeni bir hedef seç.',
      quickDrill: 'HIZLI ALIŞTIRMA', yourWeakestSkill: 'EN ZAYIF BECERİN',
      drillIt: 'Çalış →',
      drillSubtitle: 'Tek odaklı soru. Buradaki çözümler radarda {mult}× sayılır.',
      focusTracks: 'Odak Yolları',
      focusTracksHelp: 'Belirli bir beceriyi ustalaşmak için seçilmiş soru patikaları. Sırayla çöz: temellerden mülakat seviyesine en pürüzsüz geçiş.',
      solvedFraction: '{n} / {total} çözüldü',
      yourGoal: 'Hedefin',
      takePlacement: 'Seviye testi', retakePlacement: 'Seviyeyi yenile',
      changeGoal: 'Hedefi değiştir',
      changeGoalConfirm: 'Hedefi değiştirmek mi? Radarın kalır ama bu hedefteki adımların sıfırlanır.',
      pctComplete: '%{n} tamamlandı',
      forYou: 'Senin için:',
    },

    auth: {
      login: 'Giriş yap', signup: 'Kayıt ol', logout: 'Çıkış',
      username: 'Kullanıcı adı', password: 'Şifre',
      forgotPassword: 'Şifremi unuttum',
      orContinueAs: 'Ya da misafir olarak devam et',
      welcome: 'SQL Quest\'e hoş geldin',
    },

    settings: {
      title: 'Ayarlar', preferences: 'Tercihler',
      languageHelp: 'Tercih ettiğin dili seç. Uygulama otomatik olarak yenilenecek.',
    },

    profile: {
      tabSkills: 'Beceriler', tabAchievements: 'Başarımlar', tabReports: 'Raporlar',
      skillMapTitle: 'SQL Beceri Haritası',
      yourArchetype: 'TARZIN',
      profileBtn: 'Profil', shareBtn: 'Paylaş',
      proficiency: 'SQL Yetkinliği',
      proficiencyBeginner: 'Başlangıç', proficiencyIntermediate: 'Orta',
      proficiencyAdvanced: 'İleri', proficiencyExpert: 'Uzman',
      countStrong: 'Güçlü', countModerate: 'Orta',
      countWeak: 'Zayıf', countNew: 'Yeni',
      yourShape: 'ŞEKLİN',
      modalTitle: '👤 Profil',
      guestUser: 'Misafir Kullanıcı',
      notSaved: '⚠️ Kaydedilmedi',
      synced: '☁️ Eşitlendi',
      localOnly: '💾 Yerel',
      progressNotSaved: 'İlerlemen kaydedilmiyor',
      progressNotSavedDesc: 'Ücretsiz hesap aç, {xp} XP\'ni ve {n} çözdüğün soruyu kalıcı tut.',
      createAccountCTA: 'Hesap Aç ve İlerlemeyi Kaydet',
      statQueries: 'Sorgu', statChallenges: 'Soru',
      statAiLessons: 'AI Dersi', statAchievements: 'Başarım',
      shareSectionTitle: '📤 İlerlemeni Paylaş',
      shareSectionSubtitle: 'SQL becerilerini sergile, başkalarına öğrenme ilhamı ver!',
      btnProgressCard: '📊 İlerleme Kartı',
      btnStreakBadge: '🔥 Seri Rozeti',
      btnCertificate: '🏆 30 Günlük Sertifika',
      inviteSectionTitle: '🎁 Arkadaş Davet Et — XP Kazan',
      inviteSectionSubtitle: 'Arkadaşın kayıt olduğunda her ikiniz de +250 XP kazanırsınız!',
      copy: 'Kopyala', copied: 'Davet bağlantısı kopyalandı!',
      friendsJoined: '👥 {n} arkadaş katıldı',
      friendJoined: '👥 1 arkadaş katıldı',
      viewReferralHub: 'Davet Merkezi →',
      subscriptionTitle: '💳 Abonelik',
      planFree: 'Ücretsiz Plan',
      planMonthly: 'Aylık', planAnnual: 'Yıllık', planLifetime: 'Ömür Boyu',
      planValidForever: 'Süresiz geçerli',
      planRenewsOn: '{date} tarihinde yenilenir ({n} gün)',
      planExpiresOn: '{date} tarihinde sona erer ({n} gün)',
      autoRenewLabel: 'Otomatik yenileme:',
      autoRenewOn: 'AÇIK', autoRenewOff: 'KAPALI',
      planUpgrade: 'Yükselt',
      planManage: 'Yönet',
      planUpgradePrompt: 'Tüm mülakatların kilidini açmak için Pro\'ya geç',
      recentQueries: 'Son Sorgular',
      noQueries: 'Henüz sorgu yok',
      changePassword: 'Şifreyi Değiştir',
      currentPassword: 'Mevcut Şifre',
      newPassword: 'Yeni Şifre',
      confirmPassword: 'Yeni Şifreyi Onayla',
      cancelChange: 'İptal',
    },

    archetypes: {
      explorer_name: 'Kâşif',
      explorer_tagline: 'Araziyi haritalandırıyorsun. Her çözüm şeklini biraz daha keskinleştirir.',
      explorer_taglineEmpty: 'Yeni başlangıç. Şeklin bir sonraki çözümünle ortaya çıkacak.',
      window_wizard_name: 'Pencere Büyücüsü',
      window_wizard_tagline: 'ROW_NUMBER, RANK, LAG — başkalarının kaçırdığı örüntüleri görürsün.',
      join_master_name: 'JOIN Ustası',
      join_master_tagline: 'Tabloları nefes alır gibi birleştiriyorsun.',
      aggregation_ace_name: 'Toplama Şampiyonu',
      aggregation_ace_tagline: 'COUNT, SUM, GROUP — sayılar sana boyun eğer.',
      logic_surgeon_name: 'Mantık Cerrahı',
      logic_surgeon_tagline: 'Koşullu mantık, iç içe hassasiyet. Her uç durum hesaba katılmış.',
      null_whisperer_name: 'NULL Fısıldayıcısı',
      null_whisperer_tagline: 'Başkalarının takıldığı yerde sen boş hücreleri açıkça görürsün.',
      data_wrangler_name: 'Veri Sihirbazı',
      data_wrangler_tagline: 'String\'ler ve tarihler ellerinde balmumu gibi.',
      full_stack_name: 'Tam Donanımlı Analist',
      full_stack_tagline: 'Her alanda güçlüsün. Zayıf nokta yok.',
      journey_person_name: 'Yolcu',
      journey_person_tagline: 'Geniş tabanlı, her beceride seviye atlıyorsun.',
      apprentice_name: 'Çırak',
      apprentice_tagline: 'Temeller oturuyor. Momentum biriyor.',
    },

    daily: {
      title: 'Günlük Soru',
      headerMeta: '{day} • {topic} • {difficulty}',
      streakLabel: '{n} günlük seri',
      reminderSettings: 'Hatırlatma ayarları',
      reminderTitle: 'Bir Günü Bile Kaçırma',
      reminderSubtitle: 'Her gün 11:00 (GMT+3)',
      browserNotify: 'Tarayıcı Bildirimi',
      notificationsOn: '✓ Bildirimler Açık',
      googleCalendar: 'Google Takvim',
      notificationsEnabled: '✅ Tarayıcı bildirimleri açıldı!',
      recommendedDifficulty: 'Önerilen Zorluk',
      basedOnPerformance: 'Performansına göre',
      easy: 'Kolay', medium: 'Orta', hard: 'Zor',
      recommendedHint: '★ Önerilen: {diff} • İstediğin zaman değiştirebilirsin',
      strugglingTitle: 'Zor bir hafta mı?',
      strugglingMsg: 'Sorun değil — böyle öğreniriz! Bugün momentumu yeniden kurmak için daha kolay bir soru denemek ister misin?',
      tryEasy: 'Evet, Kolay deneyeyim',
      keepDifficulty: 'Mevcut zorluğu koru',
      stepWarmup: 'Isınma',
      stepChallenge: 'Soru',
      stepWarmupBadge: 'Adım 1: Isınma',
      stepWarmupTime: '30 saniye',
      stepChallengeBadge: 'Adım 2: SQL Sorusu',
      avgSolve: '⏱️ Ort. çözüm: {range} dk',
      solveRate: '📊 %{pct} çözüm oranı',
      xpAward: '+{n} XP',
      shareProgress: '📤 İlerlemeyi Paylaş',
      checkAnswer: 'Cevabı Kontrol Et',
      continueToChallenge: 'Soruya Devam →',
    },

    board: {
      title: 'Küresel Sıralama',
      shareBtn: 'Paylaş', inviteBtn: 'Davet et',
      rankGrandmaster: 'Büyük Usta', rankMaster: 'Usta',
      rankExpert: 'Uzman', rankAdvanced: 'İleri',
      rankIntermediate: 'Orta', rankBeginner: 'Başlangıç',
    },

    speedRun: {
      title: 'Hız Koşusu',
      subtitle: 'SQL becerilerini sınayın! 5 dakikada olabildiğince çok soru çözün. Hızlı düşün, daha hızlı yaz!',
      ptsEasy: '10 puan', ptsMedium: '20 puan', ptsHard: '30 puan',
      labelEasy: 'Kolay', labelMedium: 'Orta', labelHard: 'Zor',
      bonusSpeed: '+5 puan hız bonusu (15sn altında)',
      bonusCombo3: '3 seri art arda 1.5x kombo',
      bonusCombo5: '5 seri art arda 2x kombo',
      keyboardHint: 'Atlamak için Tab, göndermek için Ctrl+Enter',
      modeAll: 'Tüm Zorluklar',
      modeEasyOnly: 'Sadece Kolay', modeMediumOnly: 'Sadece Orta', modeHardOnly: 'Sadece Zor',
    },

    goals: {
      title: 'Haftalık Hedefler',
      empty: 'Henüz hedef yok. Aşağıdan bir tane ekle!',
      addNew: 'Yeni hedef ekle (en fazla 3 aktif):',
      passInterviews: '2 Mülakat Geç',
      solveChallenges: '5 Soru Çöz',
      earnXP: '500 XP Kazan',
      streak5: '5 Günlük Seri',
      close: 'Kapat',
    },

    lessons: {
      title: 'Dersler',
      lesson_1: 'SQL\'e Giriş',
      lesson_2: 'SELECT Komutu',
      lesson_3: 'WHERE ile Filtreleme',
      lesson_4: 'Koşulları Birleştirme',
      lesson_5: 'Sonuçları Sıralama',
      lesson_6: 'Toplama Fonksiyonları',
      lesson_7: 'GROUP BY',
      lesson_8: 'HAVING Cümlesi',
      lesson_9: 'JOIN Temelleri',
      lesson_10: 'İleri Seviye Sorgular',
      topic_1: 'SQL nedir ve neden önemli',
      topic_2: 'Tablolardan veri çekmek',
      topic_3: 'Koşullarla veri filtrelemek',
      topic_4: 'AND, OR ile filtreleri birleştirmek',
      topic_5: 'ORDER BY ile veri sıralamak',
      topic_6: 'COUNT, SUM, AVG, MIN, MAX ile istatistik hesaplamak',
      topic_7: 'Toplu analiz için veriyi gruplamak',
      topic_8: 'Gruplanmış veriyi filtrelemek',
      topic_9: 'Birden fazla tablodan veri birleştirmek',
      topic_10: 'Alt sorgular ve karmaşık analiz',
    },

    aiTutor: {
      hubTitle: 'AI SQL Koçu',
      hubSubtitle: 'Kişisel AI koçunla SQL\'i interaktif öğren. Her ders öğretim, örnekler ve gerçek zamanlı geri bildirimle pratik sorular içerir.',
      welcomeBack: 'Tekrar hoş geldin! 🎉',
      completedFraction: '{total} dersten {n} tanesini tamamladın',
      continueLearning: 'Öğrenmeye Devam →',
      startOver: 'Baştan Başla',
      startLearning: 'Öğrenmeye Başla →',
      reviewLessons: 'Dersleri Tekrar Et 🔄',
      allDone: '🏆 Tüm dersler tamamlandı!',
      statLessons: 'Ders',
      statInteractive: 'İnteraktif',
      statInteractiveSub: 'Öğretim',
      statRealtime: 'Gerçek Zamanlı',
      statRealtimeSub: 'Geri Bildirim',
      statXpPerLesson: 'Ders Başına',
      aiLessonsHeader: 'AI Dersleri',
      aiTutorActive: '🤖 AI Koç Aktif',
      dailyAiCalls: 'Günlük AI Hakkı',
      upgradeForMore: '⬆ Daha fazla hak için Pro\'ya geç',
      lessonsCompletedFraction: '{n}/{total} tamamlandı',
      currentSession: 'Mevcut Oturum',
      coding: 'Kodlama:',
      totalAsked: 'Toplam soru:',
      concepts: 'Kavramlar:',
      attempts: 'Denemeler:',
      phase: 'Aşama:',
      phaseConceptCheck: '🧠 Kavram Kontrolü',
      phaseReview: '📝 İnceleme',
      get3InRowPractice: 'İlerlemek için art arda 3 doğru cevap ver!',
      get3CorrectComplete: 'Dersi tamamlamak için 3 doğru cevap ver!',
      yourSqlSkills: 'SQL Becerilerin',
      totalPractice: 'Toplam Pratik:',
      questionsCount: '{n} soru',
      successRate: 'Başarı Oranı:',
      lessonPrefix: 'Ders {n}',
      backToLessons: '← Derslere Dön',
      studySession: '📚 Çalışma Oturumu',
      tutorBadge: 'AI Koç',
      send: 'Gönder',
      restart: '↺ Yeniden Başla',
      continueConvo: 'Sohbete devam et...',
      placeholderIntro: 'Başlamak için "hazırım" yaz...',
      placeholderTeaching: 'Soru sor ya da hazır olduğunda "pratik" yaz...',
      placeholderPractice: 'Aşağıdaki SQL Alanını kullan ya da ipucu iste...',
      placeholderFeedback: 'Devam et ya da "Kavram Kontrolünü Başlat" tıkla...',
      placeholderComprehension: 'Kavramı kendi cümlenle anlat...',
      sandboxTitle: 'SQL Alanı',
      sandboxSubtitle: 'İstediğin zaman sorgu dene • Tablo: {table}',
      sandboxPlaceholder: 'Veriyi keşfetmek için buraya SQL yaz... (Ctrl+Enter ile çalıştır)',
      sandboxRun: 'Çalıştır',
      sandboxUseAsAnswer: '📋 Cevap Olarak Kullan',
      runQueryHint: 'Sonuçları görmek için bir sorgu çalıştır',
      availableColumns: 'Mevcut sütunlar:',
      submitTitle: '✍️ Cevabını Gönder',
      submitSubtitle: 'Önce aşağıdaki SQL Alanında test et!',
      submitDesc: 'Cevabından eminsen buraya yapıştır ve AI geri bildirimi için gönder.',
      submitPlaceholder: 'Son SQL cevabını buraya yapıştır...',
      btnTest: 'Test Et',
      btnSubmit: 'Cevabı Gönder',
      phaseHook: '🪝 Kanca',
      phaseProbe: '🔍 Yoklama',
      phaseAttempt: '💪 Dene',
      phaseDiscover: '🧭 Keşfet',
      phaseReveal: '💡 Kavram',
      phasePractice: '✍️ Pratik',
      phaseFeedback: '💬 Geri Bildirim',
      phaseMastery: '🏆 Ustalık',
      phaseIntro: '👋 Giriş',
      phaseTeaching: '📖 Öğrenme',
      phaseComprehension: '🧠 Kavrama',
      phaseStudy: '📚 Çalışma',
      phaseComplete: '✅ Tamamlandı',
      phaseDefault: '📝 İnceleme',
      btnReady: 'Hazırım! →',
      btnReadyToPractice: 'Pratiğe hazırım →',
      btnNextQuestion: 'Sonraki soru →',
      btnNextLesson: 'Sonraki Ders →',
      btnHint: 'İpucu al 💡',
      btnHintShort: 'İpucu 💡',
      btnIDontKnow: 'Bilmiyorum 🤷',
      btnShowAnswer: 'Cevabı göster',
      btnBuildStepByStep: '🔨 Adım adım kur',
      btnStartMasteryCheck: 'Ustalık Sınavını Başlat 🏆',
      btnTeachItBack: '🏆 Sahip olduğunu kanıtlamak için bana öğret',
      streakLabel: 'Seri: {n}/3 🔥',
      discoveryLabel: 'Keşif {n}/2',
      buildingStep: '🔨 Adım {n}/6 kuruluyor',
      exitGuided: 'Rehberli moddan çık',
      tryWritingHint: '✨ Yukarıya SQL yazmayı dene ya da yardım iste!',
    },

    coachNext: {
      label: 'Sıradaki adım',
      lesson: '📖 Ders',
      challenge: '⚔️ Soru',
      drill: '🎯 Alıştırma: {skill}',
      mastery: '💪 Ustalık Sınavı: {skill}',
      retrieval: '⏳ Hatırlama Kontrolü',
      reasonLesson: 'Önce bu kavramı öğren — sonraki soruları kilidini açacak.',
      reasonChallenge: 'Öğrendiklerini gerçek bir soruda uygula.',
      reasonDrillScored: '{skill} alıştırması — radarın {score}/100 gösteriyor.',
      reasonDrillBlind: '{skill} için 5 odaklı soru çöz.',
      reasonMastery: '{skill} ustalığını kanıtla — {n} yeni soru çöz{level}.',
      reasonMasteryLevel: ', en az {level} seviyesinde',
      reasonRetrieval: 'Yarın gel ve bu beceriden bir soru çöz — hatırlama tekrar okumaktan iyidir.',
      reasonGeneric: 'Sıradaki adım.',
      placementBadge: '🎯 Seviye Tespiti · radarını kalibre eder',
      placementAnswered: '{total} sorudan {n} tanesi cevaplandı',
      skipPlacement: 'Seviye testini atla',
      startCTA: 'Başla →',
      continueCTA: 'Devam →',
      graduated: '🎉 Mezun oldun!',
    },

    tour: {
      stepXofY: 'Adım {n} / {total}',
      skipTour: 'Turu atla',
      next: 'İleri →',
      gotIt: 'Anladım, başlayalım!',
      coachTitle: '🧭 Koç',
      coachBody: 'Kişisel AI öğrenme yolun. Bildiklerine ve nereye gittiğine göre sıradaki soruyu, dersi veya alıştırmayı seçer.',
      practiceTitle: '📝 Pratik',
      practiceBody: '126 sorunun tamamı. Zorluk veya konuya göre filtrele. Zamanın çoğunu burada geçireceksin — SQL sorgu yazarak gelişen bir kas.',
      interviewTitle: '💼 Mülakat',
      interviewBody: 'FAANG ve üst seviye şirket mülakatlarına göre tasarlanmış süreli denemeler. İşe hazır olmaya yaklaştığında ispat alanın burası.',
      boardTitle: '🏅 Skor',
      boardBody: 'Seriler, XP, başarımlar, sıralama. Günlük tutarlılık SQL ustalığını gerçekten kuran şey — burada kendi ilerlemeni görürsün.',
      profileTitle: '👤 Profil',
      profileBody: 'Halka açık beceri radarın. LinkedIn, Twitter veya CV\'ne koyabileceğin paylaşılabilir bir yetkinlik kanıtı. İşverenler tam olarak ne yapabildiğini görür.',
    },

    notifications: {
      title: 'Bildirimler',
      allCaughtUp: 'Hepsi temizlendi!',
      dismiss: 'Kapat',
      useFreeze: '🧊 Donma Kullan',
    },

    streakModal: {
      title: '🎁 Günlük Ödül!',
      weeklyMilestone: '🎉 Haftalık Dönüm Noktası!',
      daysToBonus: 'Bonusa {n} gün',
      dayStreak: 'günlük seri',
      bestPrefix: 'rekor:',
      daysLogged: '{n} gün kayıtlı',
      milestoneDay: 'Gün {n}',
      milestoneDone: '✓ Tamam',
      yourReward: 'Ödülün',
      streakBonus: '+{n} seri bonusu dahil!',
      claimReward: 'Ödülü Al! 🎉',
      xpClaimed: '✓ +{n} XP alındı!',
      monthJan: 'Ocak', monthFeb: 'Şubat', monthMar: 'Mart',
      monthApr: 'Nisan', monthMay: 'Mayıs', monthJun: 'Haziran',
      monthJul: 'Temmuz', monthAug: 'Ağustos', monthSep: 'Eylül',
      monthOct: 'Ekim', monthNov: 'Kasım', monthDec: 'Aralık',
      weekdayS: 'P', weekdayM: 'P', weekdayT: 'S', weekdayW: 'Ç', weekdayF: 'C',
    },

    shareToast: {
      shareYourProgress: 'İlerlemeni paylaş!',
      btnTwitter: '𝕏',
      btnLinkedin: 'in',
      btnReddit: '↗ Reddit',
      btnCopy: '📋 Kopyala',
      levelUp: 'Seviye Atlandı: {name}!',
      achievementUnlocked: 'Başarım Kazanıldı: {name}!',
      certificate: '30 Günlük Usta Sertifikası!',
      learningSql: 'SQL Öğreniyorum!',
    },

    drills: {
      overallProgress: 'Genel İlerleme',
      exercisesCompleted: 'Alıştırma Tamamlandı',
      tableLabel: 'Tablo:',
      exerciseXofY: '{total} alıştırmadan {n}.',
      diffEasy: '🟢 Kolay', diffMedium: '🟡 Orta', diffHard: '🔴 Zor',
      completedBadge: '✓ Tamamlandı',
      tablesToJoin: '🔗 JOIN edilecek tablolar:',
      joinKey: '💡 JOIN anahtarı: {key}',
      expectedOutput: '📋 Beklenen Çıktı ({n} satır)',
      queryPlaceholder: 'SQL sorgunu buraya yaz...',
      btnTest: 'Test Et',
      btnSubmit: 'Cevabı Gönder',
      correctXP: '✅ Doğru! +{n} XP',
      notQuiteRight: '⚠️ Tam değil. Sorgunu kontrol et.',
      yourOutput: 'Senin Çıktın ({n} satır):',
      errorPrefix: '❌ Hata: {msg}',
      errorChecking: 'Sonuç kontrol edilirken hata oluştu.',
      availableTables: '📋 Mevcut Tablolar ve Sütunlar',
    },

    speedRunStats: {
      yourBestRuns: '🏆 En İyi Koşuların',
      runSolved: '{n} çözüldü',
      runPoints: '{n} puan',
      paused: 'Duraklatıldı',
      pausedHint: 'Devam etmek için bu sekmeye geri dön',
      timeUsed: 'Geçen Süre',
      playAgain: '⚡ Tekrar Oyna',
      back: 'Geri',
      firstTimeHint: '💡 İlk kez mi? Yukarıdan zorluk seç ve ilk hız koşunu başlat. En iyi skorların burada görünecek!',
    },

    interviewList: {
      filterAll: 'Tümü',
      filterEasy: 'Kolay',
      filterMedium: 'Orta',
      filterHard: 'Zor',
      filterSolved: 'Çözülen',
      filterUnsolved: 'Çözülmeyen',
      badgeFree: 'ÜCRETSİZ',
      badgePro: 'PRO',
      meta: '{min} dk · {q} soru · Geçme: %{pct}',
      minutesLabel: '{n} dk',
      questionsLabel: '{n} soru',
      passLabel: 'Geçme: %{pct}',
      moreSkills: '+{n} daha',
      bestScore: 'En İyi Skor',
      attemptsOne: '{n} deneme',
      attemptsMany: '{n} deneme',
      btnRetry: 'Yeniden Dene',
      btnPractice: '🧘 Pratik',
      btnPracticeMode: '🧘 Pratik Modu',
      btnStart: 'Mülakatı Başlat',
      btnUnlockPro: 'Pro Aç',
    },

    interview: {
      title: 'SQL Mülakat Provaları',
      subtitle: 'Süreli, gerçek mülakat sorularıyla pratik yap',
      proMember: 'PRO Üye',
      interviewsCompleted: 'Tamamlanan Mülakat', passed: 'Geçilen',
      avgScore: 'Ort. Skor', analytics: 'Analiz',
      recommendedForYou: 'Senin İçin Önerilen',
      retryToImprove: '"{title}"\'yi yeniden dene — skorunu %{pct} üstüne çıkar',
      focusAreas: 'Odak konuları: {list}',
      startNow: 'Şimdi Başla',
      questionsToReview: 'Gözden Geçirilecek Sorular ({n} kaldı)',
      viewAllPast: 'Tüm geçmiş mülakatları gör →',
    },
  },

  // Spanish placeholder. WIP — most strings fall back to English until
  // a Spanish-speaking contributor fills them in. Adding even a few key
  // namespaces (nav, common) is enough for an MVP Spanish UX.
  es: {
    common: {
      all: 'Todos', save: 'Guardar', cancel: 'Cancelar', close: 'Cerrar',
      yes: 'Sí', no: 'No', loading: 'Cargando…',
      language: 'Idioma',
      wipBadge: 'en desarrollo',
    },
    nav: {
      coach: 'Coach', practice: 'Práctica', interview: 'Entrevista',
      board: 'Ranking', profile: 'Perfil',
    },
    // Other namespaces fall back to English.
  },
};

// ─── State + subscribers ───────────────────────────────────────────────
//
// `currentLang` is the cached active language. We also track listeners
// so React components can re-render on switch without a full reload.
let currentLang = null;
const listeners = new Set();

/**
 * Resolve the active language. Order:
 *   1. Cached value (set by a previous setLang or first call)
 *   2. localStorage `sqlquest_lang` (sticky from URL ?lang=tr or switcher)
 *   3. Browser locale (navigator.language) — TR for tr-TR / tr-CY users
 *   4. FALLBACK_LANG (English)
 */
export function getCurrentLang() {
  if (currentLang) return currentLang;
  try {
    const stored = (typeof localStorage !== 'undefined' && localStorage.getItem('sqlquest_lang')) || null;
    if (stored && TRANSLATIONS[stored]) {
      currentLang = stored;
      return stored;
    }
    if (typeof navigator !== 'undefined' && navigator.language) {
      const browser = navigator.language.toLowerCase();
      // Match prefix so "tr-TR", "tr-CY", "tr" all map to 'tr'.
      const match = SUPPORTED_LANGS.find(l => browser.startsWith(l.code) && !l.wip);
      if (match) {
        currentLang = match.code;
        return match.code;
      }
    }
  } catch (_) { /* localStorage / navigator not available */ }
  currentLang = FALLBACK_LANG;
  return FALLBACK_LANG;
}

/**
 * Switch language. Persists to localStorage AND notifies all subscribers
 * so any React component using `useLanguage()` re-renders. Returns true
 * on success, false if the requested code isn't in TRANSLATIONS.
 */
export function setLang(code) {
  if (!TRANSLATIONS[code]) return false;
  currentLang = code;
  try { localStorage.setItem('sqlquest_lang', code); } catch (_) {}
  // Notify all React subscribers so the tree re-renders.
  listeners.forEach(fn => {
    try { fn(code); } catch (_) {}
  });
  return true;
}

/**
 * Translate a key. `vars` substitutes {placeholders} in the string.
 *
 * Lookup chain:
 *   1. TRANSLATIONS[currentLang][namespace][key]
 *   2. TRANSLATIONS[FALLBACK_LANG][namespace][key]
 *   3. The key itself (so unmapped keys are still readable)
 */
export function t(namespace, key, vars = null) {
  const lang = getCurrentLang();
  const dict = TRANSLATIONS[lang] || TRANSLATIONS[FALLBACK_LANG];
  const fallback = TRANSLATIONS[FALLBACK_LANG];
  let str =
    (dict[namespace] && dict[namespace][key]) ||
    (fallback[namespace] && fallback[namespace][key]) ||
    key;

  if (vars && typeof str === 'string') {
    Object.entries(vars).forEach(([k, v]) => {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    });
  }
  return str;
}

/**
 * Subscribe to language changes. Returns an unsubscribe function.
 * Used by React's useLanguage() hook in app.jsx.
 */
export function subscribeLang(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Reset the cache. Used by tests; rarely needed in app code.
 */
export function _resetLangCache() {
  currentLang = null;
}

/**
 * Return a copy of a challenge with localized text fields, falling back
 * to English when a translation is missing. The challenge object stays
 * the same shape so existing render code keeps working — only `title`,
 * `description`, `hint`, and `example.input` / `example.output` are
 * swapped.
 *
 * Why a separate helper instead of wrapping the whole `currentChallenge`
 * state at the source: AI Tutor / Coach prompts feed the challenge into
 * Claude in English (Claude's SQL reasoning is sharper in English, and
 * we don't want to translate then re-translate). So we keep two views:
 *   - `currentChallenge` (raw, English) → AI prompt context
 *   - `displayChallenge` (localized) → JSX render points
 *
 * Schema convention: each translatable field gets a `_<lang>` suffix
 * inline on the challenge object, e.g. `description_tr`. Missing fields
 * pass through unchanged. `solution`, `tables`, `skills`, `category`,
 * `dataset`, `difficulty`, `xpReward` stay raw — those are technical
 * identifiers, not display text.
 */
export function localizeChallenge(challenge, lang = getCurrentLang()) {
  if (!challenge || lang === FALLBACK_LANG) return challenge;
  const titleK = `title_${lang}`;
  const descK = `description_${lang}`;
  const hintK = `hint_${lang}`;
  const exampleK = `example_${lang}`;
  // Only rebuild if at least one localization exists — avoids
  // shallow-cloning every challenge on every render when no TR yet.
  if (
    !challenge[titleK] &&
    !challenge[descK] &&
    !challenge[hintK] &&
    !challenge[exampleK]
  ) {
    return challenge;
  }
  return {
    ...challenge,
    title: challenge[titleK] || challenge.title,
    description: challenge[descK] || challenge.description,
    hint: challenge[hintK] || challenge.hint,
    example: challenge[exampleK] || challenge.example,
  };
}

/**
 * Same idea as localizeChallenge but for mock-interviews. Swaps the
 * card-level fields (title, description, role) when the interview
 * object has matching `*_<lang>` versions. Skills, difficulty, and
 * timing/scoring fields stay in their canonical English shape so
 * existing render code and skill-matching logic keep working.
 */
export function localizeInterview(interview, lang = getCurrentLang()) {
  if (!interview || lang === FALLBACK_LANG) return interview;
  const titleK = `title_${lang}`;
  const descK = `description_${lang}`;
  const roleK = `role_${lang}`;
  if (!interview[titleK] && !interview[descK] && !interview[roleK]) {
    return interview;
  }
  return {
    ...interview,
    title: interview[titleK] || interview.title,
    description: interview[descK] || interview.description,
    role: interview[roleK] || interview.role,
  };
}

// Default export for convenience: just the t() helper.
export default t;
