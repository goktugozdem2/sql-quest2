// SQL Quest - Game Configuration
// Contains levels, achievements, and other game settings

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
];
