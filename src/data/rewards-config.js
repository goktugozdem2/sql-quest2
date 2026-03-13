// ============================================================
// SQL Quest - Rewards & XP Configuration
// ============================================================
//
// 🎯 EDIT THIS FILE TO CHANGE ALL XP REWARDS IN ONE PLACE
//
// After editing, run: node scripts/bundle-data.js
// Then deploy to apply changes
//
// ============================================================

window.REWARDS = {
  
  // ==================== CHALLENGE XP ====================
  challenges: {
    // By difficulty
    easy: 15,
    medium: 25,
    hard: 40,
    expert: 60,
    
    // Bonuses
    firstTryBonus: 10,      // Extra XP for solving on first attempt
    noHintBonus: 5,         // Extra XP for not using hints
    speedBonus: 10,         // Extra XP for fast completion
  },
  
  // ==================== DAILY CHALLENGE XP ====================
  daily: {
    warmup: 10,             // Warmup question
    core: 30,               // Main SQL challenge
    insight: 10,            // Insight question
    total: 50,              // Total possible per day
    
    // Streak bonuses
    streak3: 15,            // Bonus at 3-day streak
    streak7: 30,            // Bonus at 7-day streak  
    streak14: 50,           // Bonus at 14-day streak
    streak30: 100,          // Bonus at 30-day streak
  },
  
  // ==================== INTERVIEW XP ====================
  interviews: {
    perQuestion: 20,        // XP per correct answer
    completion: 30,         // Bonus for completing interview
    passing: 50,            // Bonus for passing (70%+)
    perfect: 100,           // Bonus for 100% score
    
    // Time bonuses
    fastCompletion: 25,     // Using <50% of time
    noHints: 20,            // Not using any hints
  },
  
  // ==================== EXERCISE XP ====================
  exercises: {
    complete: 10,           // Per exercise completed
    perfectStreak: 5,       // Bonus per consecutive correct
  },
  
  // ==================== 30-DAY CHALLENGE XP ====================
  thirtyDay: {
    perDay: 25,             // XP per day completed
    weekBonus: 50,          // Bonus for completing a week
    completionBonus: 500,   // Bonus for finishing all 30 days
  },
  
  // ==================== WORKOUT XP ====================
  workout: {
    base: 20,               // Base XP for workout
    perCorrect: 15,         // XP per correct answer
    // Formula: base + (correctCount * perCorrect)
  },
  
  // ==================== MISC XP ====================
  misc: {
    firstQuery: 5,          // First query ever run
    datasetExplore: 5,      // Exploring a new dataset
    csvUpload: 10,          // Uploading custom CSV
    loginStreak: 10,        // Daily login reward
    referralBonus: 250,     // Referral reward (both users)
    bossBattle: 50,         // Defeating a boss
  },
  
  // ==================== MULTIPLIERS ====================
  multipliers: {
    proUser: 1.0,           // Pro users get same XP (change to 1.5 for 50% bonus)
    weekend: 2.0,           // Weekend multiplier - 2x XP on weekends!
    event: 1.0,             // Special event multiplier
  },
  
  // ==================== LEVEL THRESHOLDS ====================
  // XP required for each level (also in config.js as gameLevels)
  levels: [
    { name: 'Novice', minXP: 0 },
    { name: 'Apprentice', minXP: 100 },
    { name: 'Developer', minXP: 300 },
    { name: 'Engineer', minXP: 600 },
    { name: 'Architect', minXP: 1000 },
    { name: 'Master', minXP: 1500 },
    { name: 'SQL Wizard', minXP: 2500 },
  ],
};

// ==================== ACHIEVEMENTS ====================
// Achievement XP rewards (also editable here for quick reference)
window.ACHIEVEMENT_XP = {
  // Basics
  first_query: 10,
  streak_3: 25,
  streak_5: 50,
  data_explorer: 30,
  csv_master: 40,
  query_50: 50,
  analyst: 35,
  
  // Challenges
  challenge_5: 40,
  challenge_10: 75,
  challenge_20: 100,
  challenge_30: 150,
  challenge_all: 250,
  string_master: 100,
  
  // Learning
  graduate: 100,
  
  // Interviews
  first_interview: 50,
  interview_pass: 75,
  perfect_interview: 150,
  speed_demon: 100,
  no_hints: 75,
  comeback_king: 100,
  interview_streak: 100,
  all_interviews: 300,
  
  // 30-Day Challenge
  sql_master_30: 500,
  
  // Skill Training
  weakness_first: 50,
  weakness_5: 150,
  weakness_10: 300,
  skill_70: 200,
  review_streak: 100,
  
  // Referrals
  referral_1: 50,
  referral_3: 150,
  referral_10: 500,
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

window.Rewards = {
  
  // Get XP for a challenge by difficulty
  getChallenge(difficulty) {
    return window.REWARDS.challenges[difficulty] || window.REWARDS.challenges.medium;
  },
  
  // Calculate challenge XP with bonuses
  calcChallengeXP(difficulty, { firstTry = false, noHint = false, fast = false } = {}) {
    let xp = this.getChallenge(difficulty);
    if (firstTry) xp += window.REWARDS.challenges.firstTryBonus;
    if (noHint) xp += window.REWARDS.challenges.noHintBonus;
    if (fast) xp += window.REWARDS.challenges.speedBonus;
    return this.applyMultipliers(xp);
  },
  
  // Get daily challenge XP
  getDaily(part) {
    return window.REWARDS.daily[part] || 0;
  },
  
  // Get streak bonus
  getStreakBonus(streakDays) {
    const { streak3, streak7, streak14, streak30 } = window.REWARDS.daily;
    if (streakDays >= 30) return streak30;
    if (streakDays >= 14) return streak14;
    if (streakDays >= 7) return streak7;
    if (streakDays >= 3) return streak3;
    return 0;
  },
  
  // Calculate interview XP
  calcInterviewXP(correctCount, totalQuestions, { passed = false, perfect = false, fast = false, noHints = false } = {}) {
    let xp = correctCount * window.REWARDS.interviews.perQuestion;
    xp += window.REWARDS.interviews.completion;
    if (passed) xp += window.REWARDS.interviews.passing;
    if (perfect) xp += window.REWARDS.interviews.perfect;
    if (fast) xp += window.REWARDS.interviews.fastCompletion;
    if (noHints) xp += window.REWARDS.interviews.noHints;
    return this.applyMultipliers(xp);
  },
  
  // Calculate workout XP
  calcWorkoutXP(correctCount) {
    const { base, perCorrect } = window.REWARDS.workout;
    return this.applyMultipliers(base + (correctCount * perCorrect));
  },
  
  // Apply any active multipliers
  applyMultipliers(xp) {
    const { proUser, weekend, event } = window.REWARDS.multipliers;
    let multiplier = 1;
    
    // Check if weekend
    const day = new Date().getDay();
    if (day === 0 || day === 6) multiplier *= weekend;
    
    // Apply event multiplier
    multiplier *= event;
    
    // Apply pro multiplier (would need user context)
    // multiplier *= proUser;
    
    return Math.round(xp * multiplier);
  },
  
  // Get achievement XP
  getAchievementXP(achievementId) {
    return window.ACHIEVEMENT_XP[achievementId] || 0;
  },
  
  // Get level from XP
  getLevel(xp) {
    const levels = window.REWARDS.levels;
    for (let i = levels.length - 1; i >= 0; i--) {
      if (xp >= levels[i].minXP) return levels[i];
    }
    return levels[0];
  },
  
  // Get XP to next level
  getXPToNextLevel(xp) {
    const levels = window.REWARDS.levels;
    for (let i = 0; i < levels.length; i++) {
      if (xp < levels[i].minXP) {
        return levels[i].minXP - xp;
      }
    }
    return 0; // Max level
  }
};

// ============================================================
// QUICK EDIT GUIDE
// ============================================================
/*

🎯 TO CHANGE REWARDS:

1. Daily Challenge XP:
   window.REWARDS.daily.core = 50;  // Change from 30 to 50

2. Challenge Difficulty XP:
   window.REWARDS.challenges.hard = 50;  // Change from 40 to 50

3. Add a 2x Weekend Event:
   window.REWARDS.multipliers.weekend = 2.0;

4. Change Achievement XP:
   window.ACHIEVEMENT_XP.first_query = 20;  // Change from 10 to 20

5. After editing, rebuild and deploy:
   node scripts/bundle-data.js
   vercel --prod

*/

console.log('[Rewards] Configuration loaded');
