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
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

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
*/

window.gameLevels = [
  { name: 'Novice', minXP: 0 },
  { name: 'Apprentice', minXP: 100 },
  { name: 'Developer', minXP: 300 },
  { name: 'Engineer', minXP: 600 },
  { name: 'Architect', minXP: 1000 },
  { name: 'Master', minXP: 1500 },
  { name: 'SQL Wizard', minXP: 2500 },
];

window.gameAchievements = [
  { id: 'first_query', name: 'First Steps', desc: 'Run your first SQL query', icon: 'Star', xp: 10 },
  { id: 'streak_3', name: 'On Fire!', desc: '3 correct in a row', icon: 'Flame', xp: 25 },
  { id: 'streak_5', name: 'Unstoppable', desc: '5 correct in a row', icon: 'Zap', xp: 50 },
  { id: 'data_explorer', name: 'Data Explorer', desc: 'Try 3 different datasets', icon: 'Database', xp: 30 },
  { id: 'csv_master', name: 'CSV Master', desc: 'Upload your own dataset', icon: 'Upload', xp: 40 },
  { id: 'query_50', name: 'Query Machine', desc: 'Run 50 queries', icon: 'Code', xp: 50 },
  { id: 'analyst', name: 'Data Analyst', desc: 'Use GROUP BY with HAVING', icon: 'BarChart3', xp: 35 },
  { id: 'challenge_5', name: 'Challenger', desc: 'Solve 5 challenges', icon: 'Target', xp: 40 },
  { id: 'challenge_10', name: 'Problem Solver', desc: 'Solve 10 challenges', icon: 'Award', xp: 75 },
  { id: 'challenge_20', name: 'SQL Expert', desc: 'Solve 20 challenges', icon: 'Zap', xp: 100 },
  { id: 'challenge_all', name: 'Challenge Master', desc: 'Solve all 30 challenges', icon: 'Trophy', xp: 200 },
  { id: 'graduate', name: 'Graduate', desc: 'Complete all AI lessons', icon: 'Trophy', xp: 100 },
  // Interview Achievements
  { id: 'first_interview', name: 'Interview Ready', desc: 'Complete your first mock interview', icon: 'Briefcase', xp: 50 },
  { id: 'interview_pass', name: 'Hired!', desc: 'Pass a mock interview', icon: 'CheckCircle', xp: 75 },
  { id: 'perfect_interview', name: 'Perfect Candidate', desc: 'Score 100% on any interview', icon: 'Crown', xp: 150 },
  { id: 'speed_demon', name: 'Speed Demon', desc: 'Pass an interview using less than 50% of time', icon: 'Zap', xp: 100 },
  { id: 'no_hints', name: 'Self-Reliant', desc: 'Pass an interview without using hints', icon: 'Brain', xp: 75 },
  { id: 'comeback_king', name: 'Comeback King', desc: 'Pass an interview after failing it', icon: 'TrendingUp', xp: 100 },
  { id: 'interview_streak', name: 'Interview Marathon', desc: 'Complete 3 interviews in one day', icon: 'Flame', xp: 100 },
  { id: 'all_interviews', name: 'Interview Master', desc: 'Pass all available interviews', icon: 'Trophy', xp: 300 },
];
