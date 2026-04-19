// SQL Quest - Game Configuration
// Contains levels, achievements, and other game settings

// ============ SUPABASE CONFIGURATION ============
// To enable cloud sync across devices:
// 1. Create a free account at https://supabase.com
// 2. Create a new project
// 3. Run the SQL below in the SQL Editor to create the users table
// 4. Get your Project URL and anon key from Settings → API
// 5. Fill in the values below

window.SUPABASE_URL = 'https://abmgtjafghpupaqsjnwe.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFibWd0amFmZ2hwdXBhcXNqbndlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MzIzMjMsImV4cCI6MjA4NDUwODMyM30.8KS-UKN1r8YANggQ9HqsQmSHY95ghRL1Oq_d5LO19y4';

/*
SQL to run in Supabase SQL Editor:

CREATE TABLE users (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  email TEXT UNIQUE,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add email column if table exists (for existing installations)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for email lookups (important for login by email)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Make email unique (optional but recommended)
-- ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON users FOR ALL USING (true);

-- For login attempts tracking
CREATE TABLE login_attempts (
  username TEXT PRIMARY KEY,
  attempts INT DEFAULT 0,
  lockout_count INT DEFAULT 0,
  locked_until TIMESTAMP,
  permanent_lock BOOLEAN DEFAULT FALSE
);

CREATE POLICY "Allow all attempts" ON login_attempts FOR ALL USING (true);

-- ============ SUPABASE AUTH SETUP (REQUIRED) ============
-- 
-- 1. Go to Authentication → Providers → Email
--    - Enable Email provider
--    - Enable "Confirm email" to require email verification
--
-- 2. Go to Authentication → URL Configuration
--    - Site URL: https://sql-quest2.vercel.app (your app URL)
--    - Redirect URLs: Add https://sql-quest2.vercel.app
--
-- 3. Go to Authentication → Email Templates (optional)
--    - Customize the Confirm signup email template
--    - Customize the Reset password email template
--
-- 4. Email rate limits (default is fine for most cases):
--    - Supabase limits to 4 emails per hour per user by default
*/

window.gameLevels = [
  { name: 'Bronze', minXP: 0, icon: '🥉' },
  { name: 'Silver', minXP: 100, icon: '🥈' },
  { name: 'Gold', minXP: 300, icon: '🥇' },
  { name: 'Platinum', minXP: 600, icon: '💎' },
  { name: 'Diamond', minXP: 1000, icon: '💠' },
  { name: 'Master', minXP: 3000, icon: '🏆' },
  { name: 'Grandmaster', minXP: 10000, icon: '👑' },
  { name: 'Challenger', minXP: 30000, icon: '⚡' },
];

window.gameAchievements = [
  // === Getting Started ===
  { id: 'first_query', name: 'Liftoff!', desc: 'Run your first SQL query', icon: '🚀', xp: 10 },
  { id: 'query_50', name: 'Query Machine', desc: 'Run 50 queries', icon: '⚙️', xp: 50 },

  // === Streaks ===
  { id: 'streak_3', name: 'On Fire!', desc: '3 correct in a row', icon: '🔥', xp: 25 },
  { id: 'streak_5', name: 'Unstoppable', desc: '5 correct in a row', icon: '⚡', xp: 50 },
  { id: 'streak_10', name: 'Dominating', desc: '10 correct in a row', icon: '💥', xp: 100 },

  // === Challenge Milestones ===
  { id: 'challenge_5', name: 'Challenger', desc: 'Solve 5 challenges', icon: '🎯', xp: 40 },
  { id: 'challenge_10', name: 'Problem Solver', desc: 'Solve 10 challenges', icon: '🏅', xp: 75 },
  { id: 'challenge_20', name: 'SQL Expert', desc: 'Solve 20 challenges', icon: '💪', xp: 100 },
  { id: 'challenge_30', name: 'SQL Pro', desc: 'Solve 30 challenges', icon: '🎖️', xp: 150 },
  { id: 'challenge_all', name: 'Challenge Master', desc: 'Solve every challenge in the bank', icon: '👑', xp: 250 },
  { id: 'string_master', name: 'String Wizard', desc: 'Complete all String Function challenges', icon: '🧙', xp: 100 },
  { id: 'graduate', name: 'Graduate', desc: 'Complete all AI lessons', icon: '🎓', xp: 100 },

  // === Radar Archetypes (NEW — tied to Skill Map identity) ===
  { id: 'archetype_window_wizard',   name: 'The Window Wizard',      desc: 'Reach 70%+ on Window Functions',    icon: '🪟', xp: 150 },
  { id: 'archetype_join_master',     name: 'The Join Master',        desc: 'Reach 70%+ on Joins + 60%+ on Subqueries & CTEs', icon: '🔗', xp: 150 },
  { id: 'archetype_aggregation_ace', name: 'The Aggregation Ace',    desc: 'Reach 70%+ on Aggregation & Grouping', icon: '📊', xp: 150 },
  { id: 'archetype_logic_surgeon',   name: 'The Logic Surgeon',      desc: 'Reach 70%+ on Conditional Logic + 60%+ on Subqueries & CTEs', icon: '🔀', xp: 150 },
  { id: 'archetype_null_whisperer',  name: 'The NULL Whisperer',     desc: 'Reach 70%+ on NULL Handling',       icon: '⁇',  xp: 150 },
  { id: 'archetype_data_wrangler',   name: 'The Data Wrangler',      desc: 'Reach 70%+ on Date or String Functions', icon: '✂️', xp: 150 },
  { id: 'archetype_full_stack',      name: 'The Full-Stack Analyst', desc: 'Average 65%+ across all 9 skills',  icon: '🎯', xp: 300 },
  { id: 'skill_70',                  name: 'Well Rounded',           desc: 'Reach 70%+ on every skill',         icon: '🌟', xp: 400 },

  // === Radar Shape Play (NEW — fun ones that keep users moving) ===
  { id: 'shape_shipped',   name: 'Shape Shipped',   desc: 'Share your radar as a PNG or link',    icon: '📣', xp: 75 },
  { id: 'radar_climber',   name: 'Radar Climber',   desc: 'Move your overall score by +20 in one week', icon: '📈', xp: 200 },
  { id: 'drill_sergeant',  name: 'Drill Sergeant',  desc: 'Complete 5 skill drill sessions',       icon: '🥁', xp: 100 },
  { id: 'polyglot',        name: 'SQL Polyglot',    desc: 'Earn 3 different archetype badges',     icon: '🧭', xp: 250 },

  // === Interview Achievements ===
  { id: 'first_interview',   name: 'Interview Ready',    desc: 'Complete your first mock interview',              icon: '💼', xp: 50 },
  { id: 'interview_pass',    name: 'Hired!',             desc: 'Pass a mock interview',                           icon: '✅', xp: 75 },
  { id: 'perfect_interview', name: 'Perfect Candidate',  desc: 'Score 100% on any interview',                     icon: '💎', xp: 150 },
  { id: 'speed_demon',       name: 'Speed Demon',        desc: 'Pass an interview in under 50% of the time limit', icon: '🏎️', xp: 100 },
  { id: 'no_hints',          name: 'Self-Reliant',       desc: 'Pass an interview without using hints',           icon: '🧠', xp: 75 },
  { id: 'interview_streak',  name: 'Interview Marathon', desc: 'Complete 3 interviews in one day',                icon: '🏃', xp: 100 },
  { id: 'all_interviews',    name: 'Interview Master',   desc: 'Pass all available interviews',                   icon: '🏆', xp: 300 },

  // === 30-Day Challenge ===
  { id: 'sql_master_30', name: '30-Day SQL Master', desc: 'Complete all 30 days of the SQL Master Challenge', icon: '🐲', xp: 500 },

  // === Daily Engagement ===
  { id: 'early_bird',      name: 'Early Bird',       desc: 'Practice before 8am',                        icon: '🌅', xp: 25 },
  { id: 'night_owl',       name: 'Night Owl',        desc: 'Practice after 10pm',                        icon: '🦉', xp: 25 },
  { id: 'weekend_warrior', name: 'Weekend Warrior',  desc: 'Practice on Saturday AND Sunday',            icon: '🗡️', xp: 50 },
  { id: 'perfect_week',    name: 'Perfect Week',     desc: 'Complete a 7-day streak',                    icon: '📆', xp: 100 },
  { id: 'monthly_legend',  name: 'Monthly Legend',   desc: 'Complete a 30-day streak',                   icon: '🗓️', xp: 300 },
  { id: 'review_streak',   name: 'Consistent Learner', desc: 'Complete 7 spaced repetition reviews',     icon: '📅', xp: 100 },

  // === Speed & Precision ===
  { id: 'lightning_fast', name: 'Lightning Fast', desc: 'Solve a challenge in under 30 seconds',     icon: '⚡', xp: 50 },
  { id: 'perfectionist',  name: 'Perfectionist',  desc: 'Get 10 challenges correct on first try',    icon: '💯', xp: 150 },
  { id: 'no_mistakes',    name: 'Flawless',       desc: 'Complete 5 challenges without any errors',  icon: '✨', xp: 100 },
  { id: 'unicorn',        name: 'Unicorn',        desc: 'First try, no hints, under 1 minute',       icon: '🦄', xp: 200 },

  // === Query Volume ===
  { id: 'query_100', name: 'Century Club',   desc: 'Run 100 queries', icon: '💯', xp: 75 },
  { id: 'query_250', name: 'Query Veteran',  desc: 'Run 250 queries', icon: '🎖️', xp: 150 },
  { id: 'query_500', name: 'Query Legend',   desc: 'Run 500 queries', icon: '🏛️', xp: 300 },

  // === Daily Challenge Mastery ===
  { id: 'daily_first',      name: 'Daily Debut',       desc: 'Complete your first daily challenge',  icon: '📰', xp: 30 },
  { id: 'daily_streak_7',   name: 'Daily Devotee',     desc: 'Complete 7 daily challenges',          icon: '🔁', xp: 100 },
  { id: 'daily_streak_30',  name: 'Daily Dominator',   desc: 'Complete 30 daily challenges',         icon: '📅', xp: 300 },
  { id: 'daily_perfect',    name: 'Daily Perfection',  desc: 'Score 100% on a daily challenge',      icon: '🌟', xp: 75 },

  // === Persistence & Grit ===
  { id: 'try_again',        name: 'Never Give Up',   desc: 'Retry a failed challenge and succeed',         icon: '💪', xp: 40 },
  { id: 'error_50',         name: 'Battle Scarred',  desc: 'Hit 50 SQL errors (learning from mistakes!)',  icon: '🩹', xp: 50 },
  { id: 'marathon_session', name: 'Marathon Runner', desc: 'Spend 60+ minutes in a single session',        icon: '🏃‍♂️', xp: 75 },
  { id: 'comeback_kid',     name: 'Comeback Kid',    desc: 'Return after 7+ days away',                    icon: '🔙', xp: 50 },

  // === Challenge Difficulty ===
  { id: 'first_hard',     name: 'Brave Soul',     desc: 'Complete your first Hard challenge',  icon: '🫡', xp: 50 },
  { id: 'easy_sweep',     name: 'Easy Sweep',     desc: 'Complete all Easy challenges',        icon: '🧹', xp: 75 },
  { id: 'medium_master',  name: 'Medium Master',  desc: 'Complete all Medium challenges',      icon: '⚖️', xp: 150 },
  { id: 'hard_hero',      name: 'Hard Hero',      desc: 'Complete all Hard challenges',        icon: '🦸', xp: 250 },

  // === XP Tiers ===
  { id: 'xp_1000',          name: 'XP Thousandaire',   desc: 'Earn 1,000 total XP',                  icon: '💰', xp: 50 },
  { id: 'xp_5000',          name: 'XP Tycoon',         desc: 'Earn 5,000 total XP',                  icon: '💎', xp: 100 },
  { id: 'xp_10000',         name: 'XP Mogul',          desc: 'Earn 10,000 total XP',                 icon: '👑', xp: 200 },

  // === Meta (unlocked by unlocking others) ===
  { id: 'half_achievements',   name: 'Halfway There',       desc: 'Unlock 50% of all achievements',   icon: '⏳', xp: 150 },
  { id: 'achievement_hunter',  name: 'Achievement Hunter',  desc: 'Unlock 75% of all achievements',   icon: '🏹', xp: 300 },
];
