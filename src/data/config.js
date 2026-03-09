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
  { id: 'data_explorer', name: 'Data Explorer', desc: 'Try 3 different datasets', icon: '🗺️', xp: 30 },
  { id: 'csv_master', name: 'CSV Master', desc: 'Upload your own dataset', icon: '📤', xp: 40 },
  { id: 'query_50', name: 'Query Machine', desc: 'Run 50 queries', icon: '⚙️', xp: 50 },
  { id: 'analyst', name: 'Data Analyst', desc: 'Use GROUP BY with HAVING', icon: '📊', xp: 35 },
  
  // === Streaks ===
  { id: 'streak_3', name: 'On Fire!', desc: '3 correct in a row', icon: '🔥', xp: 25 },
  { id: 'streak_5', name: 'Unstoppable', desc: '5 correct in a row', icon: '⚡', xp: 50 },
  { id: 'streak_10', name: 'Dominating', desc: '10 correct in a row', icon: '💥', xp: 100 },
  
  // === Challenge Milestones ===
  { id: 'challenge_5', name: 'Challenger', desc: 'Solve 5 challenges', icon: '🎯', xp: 40 },
  { id: 'challenge_10', name: 'Problem Solver', desc: 'Solve 10 challenges', icon: '🏅', xp: 75 },
  { id: 'challenge_20', name: 'SQL Expert', desc: 'Solve 20 challenges', icon: '💪', xp: 100 },
  { id: 'challenge_30', name: 'SQL Pro', desc: 'Solve 30 challenges', icon: '🎖️', xp: 150 },
  { id: 'challenge_all', name: 'Challenge Master', desc: 'Solve all challenges', icon: '👑', xp: 250 },
  { id: 'string_master', name: 'String Wizard', desc: 'Complete all String Function challenges', icon: '🧙', xp: 100 },
  { id: 'graduate', name: 'Graduate', desc: 'Complete all AI lessons', icon: '🎓', xp: 100 },
  
  // === Interview Achievements ===
  { id: 'first_interview', name: 'Interview Ready', desc: 'Complete your first mock interview', icon: '💼', xp: 50 },
  { id: 'interview_pass', name: 'Hired!', desc: 'Pass a mock interview', icon: '✅', xp: 75 },
  { id: 'perfect_interview', name: 'Perfect Candidate', desc: 'Score 100% on any interview', icon: '💎', xp: 150 },
  { id: 'speed_demon', name: 'Speed Demon', desc: 'Pass an interview in less than 50% of time', icon: '🏎️', xp: 100 },
  { id: 'no_hints', name: 'Self-Reliant', desc: 'Pass an interview without using hints', icon: '🧠', xp: 75 },
  { id: 'comeback_king', name: 'Comeback King', desc: 'Pass an interview after failing it', icon: '🔄', xp: 100 },
  { id: 'interview_streak', name: 'Interview Marathon', desc: 'Complete 3 interviews in one day', icon: '🏃', xp: 100 },
  { id: 'all_interviews', name: 'Interview Master', desc: 'Pass all available interviews', icon: '🏆', xp: 300 },
  
  // === 30-Day Challenge ===
  { id: 'sql_master_30', name: '30-Day SQL Master', desc: 'Complete all 30 days of the SQL Master Challenge', icon: '🐲', xp: 500 },
  
  // === Skill Training ===
  { id: 'weakness_first', name: 'Self Improver', desc: 'Master your first weakness', icon: '🎯', xp: 50 },
  { id: 'weakness_5', name: 'Weakness Crusher', desc: 'Master 5 weaknesses', icon: '🛡️', xp: 150 },
  { id: 'weakness_10', name: 'Skill Master', desc: 'Master 10 weaknesses', icon: '⚔️', xp: 300 },
  { id: 'skill_70', name: 'Well Rounded', desc: 'Reach 70%+ on all skill areas', icon: '🌟', xp: 200 },
  { id: 'review_streak', name: 'Consistent Learner', desc: 'Complete 7 spaced repetition reviews', icon: '📅', xp: 100 },
  
  // === Referral ===
  { id: 'referral_1', name: 'Recruiter', desc: 'Invite your first friend', icon: '🤝', xp: 50 },
  { id: 'referral_3', name: 'Squad Builder', desc: 'Invite 3 friends', icon: '👥', xp: 150 },
  { id: 'referral_10', name: 'Community Champion', desc: 'Invite 10 friends', icon: '🏰', xp: 500 },
  
  // === Daily Engagement (NEW) ===
  { id: 'early_bird', name: 'Early Bird', desc: 'Practice before 8am', icon: '🌅', xp: 25 },
  { id: 'night_owl', name: 'Night Owl', desc: 'Practice after 10pm', icon: '🦉', xp: 25 },
  { id: 'weekend_warrior', name: 'Weekend Warrior', desc: 'Practice on Saturday and Sunday', icon: '🗡️', xp: 50 },
  { id: 'perfect_week', name: 'Perfect Week', desc: 'Complete a 7-day streak', icon: '📆', xp: 100 },
  { id: 'monthly_legend', name: 'Monthly Legend', desc: 'Complete a 30-day streak', icon: '🗓️', xp: 300 },
  
  // === Speed & Skill (NEW) ===
  { id: 'lightning_fast', name: 'Lightning Fast', desc: 'Solve a challenge in under 30 seconds', icon: '⚡', xp: 50 },
  { id: 'perfectionist', name: 'Perfectionist', desc: 'Get 10 challenges correct on first try', icon: '💯', xp: 150 },
  { id: 'no_mistakes', name: 'Flawless', desc: 'Complete 5 challenges without any errors', icon: '✨', xp: 100 },
  
  // === Special (NEW) ===
  { id: 'comeback_kid', name: 'Comeback Kid', desc: 'Return after 7+ days away', icon: '🔙', xp: 50 },
  { id: 'unicorn', name: 'Unicorn', desc: 'First try, no hints, under 1 minute', icon: '🦄', xp: 200 },
  { id: 'join_master', name: 'JOIN Master', desc: 'Complete 20 JOIN queries', icon: '🔗', xp: 75 },
  { id: 'subquery_ninja', name: 'Subquery Ninja', desc: 'Complete 10 subqueries', icon: '🥷', xp: 75 },
];
