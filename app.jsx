const { useState, useEffect, useRef } = React;

// Fallback icon component for when Lucide isn't loaded
const FallbackIcon = ({size = 24, className = ''}) => (
  React.createElement('span', {
    className: className,
    style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size }
  }, '•')
);

// Get icons from global or use fallback
const getIcon = (name) => (window.LucideIcons && window.LucideIcons[name]) || FallbackIcon;
const ChevronRight = getIcon('ChevronRight');
const ChevronLeft = getIcon('ChevronLeft');
const Play = getIcon('Play');
const CheckCircle = getIcon('CheckCircle');
const BookOpen = getIcon('BookOpen');
const Database = getIcon('Database');
const Code = getIcon('Code');
const Trophy = getIcon('Trophy');
const Star = getIcon('Star');
const Zap = getIcon('Zap');
const Target = getIcon('Target');
const Award = getIcon('Award');
const Heart = getIcon('Heart');
const Flame = getIcon('Flame');
const Lock = getIcon('Lock');
const Gift = getIcon('Gift');
const Upload = getIcon('Upload');
const Ship = getIcon('Ship');
const Film = getIcon('Film');
const Flower2 = getIcon('Flower2');
const ShoppingCart = getIcon('ShoppingCart');
const Users = getIcon('Users');
const Table = getIcon('Table');
const BarChart3 = getIcon('BarChart3');
const User = getIcon('User');
const LogOut = getIcon('LogOut');
const Save = getIcon('Save');
const History = getIcon('History');
const Crown = getIcon('Crown');
const Medal = getIcon('Medal');
const Calendar = getIcon('Calendar');
const Clock = getIcon('Clock');
const Sun = getIcon('Sun');
const Bell = getIcon('Bell');
const Mail = getIcon('Mail');
const MessageCircle = getIcon('MessageCircle');
const Link = getIcon('Link');
const Copy = getIcon('Copy');
const Settings = getIcon('Settings');
const AlertCircle = getIcon('AlertCircle');
const Shield = getIcon('Shield');

// Format cell values - numbers to 2 decimal places
const formatCell = (cell, maxLength = null) => {
  if (cell === null || cell === undefined) return null;
  
  // Check if it's a number or a numeric string
  const numValue = typeof cell === 'number' ? cell : (typeof cell === 'string' && !isNaN(cell) && cell.trim() !== '' ? parseFloat(cell) : null);
  
  if (numValue !== null && typeof numValue === 'number' && !isNaN(numValue)) {
    // Format numbers: if it has decimals, round to 2
    if (!Number.isInteger(numValue)) {
      const formatted = numValue.toFixed(2);
      return maxLength ? formatted.slice(0, maxLength) : formatted;
    }
    return maxLength ? String(numValue).slice(0, maxLength) : String(numValue);
  }
  return maxLength ? String(cell).slice(0, maxLength) : String(cell);
};

// ============ USER STORAGE HELPERS ============

// Production-ready password hashing with fallback for non-HTTPS environments
const generateSalt = () => {
  try {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    // Fallback for environments without crypto
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
};

// Simple but effective hash function (works everywhere)
const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  // Make it longer and more secure-looking
  const hex = Math.abs(hash).toString(16);
  return hex.padStart(8, '0') + hex.split('').reverse().join('').padStart(8, '0');
};

// Try to use Web Crypto API, fall back to simple hash
const hashPassword = async (password, salt) => {
  try {
    if (window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(salt + password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.warn('Web Crypto not available, using fallback');
  }
  // Fallback
  return simpleHash(salt + password + salt);
};

const verifyPassword = async (password, salt, storedHash) => {
  const hash = await hashPassword(password, salt);
  return hash === storedHash;
};

// Password strength checker
const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: '', color: '', feedback: [] };
  
  let score = 0;
  const feedback = [];
  
  // Length checks
  if (password.length >= 6) score += 1;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  
  // Character type checks
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  
  // Feedback
  if (password.length < 8) feedback.push('Use at least 8 characters');
  if (!/[a-z]/.test(password)) feedback.push('Add lowercase letters');
  if (!/[A-Z]/.test(password)) feedback.push('Add uppercase letters');
  if (!/[0-9]/.test(password)) feedback.push('Add numbers');
  if (!/[^a-zA-Z0-9]/.test(password)) feedback.push('Add special characters (!@#$%)');
  
  // Determine strength level
  let label, color;
  if (score <= 2) {
    label = 'Weak';
    color = 'red';
  } else if (score <= 4) {
    label = 'Fair';
    color = 'orange';
  } else if (score <= 5) {
    label = 'Good';
    color = 'yellow';
  } else {
    label = 'Strong';
    color = 'green';
  }
  
  return { score, label, color, feedback, percent: Math.min((score / 7) * 100, 100) };
};

// ============ SUPABASE HELPERS ============
const isSupabaseConfigured = () => {
  return window.SUPABASE_URL && window.SUPABASE_ANON_KEY && 
         window.SUPABASE_URL.length > 0 && window.SUPABASE_ANON_KEY.length > 0;
};

const supabaseFetch = async (endpoint, options = {}) => {
  if (!isSupabaseConfigured()) return null;
  
  try {
    const response = await fetch(`${window.SUPABASE_URL}/rest/v1/${endpoint}`, {
      ...options,
      headers: {
        'apikey': window.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': options.method === 'POST' ? 'return=minimal' : 'return=representation',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase error:', response.status, errorText);
      return null;
    }
    
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } catch (err) {
    console.error('Supabase fetch error:', err);
    return null;
  }
};

// ============ USER DATA FUNCTIONS ============
const saveUserData = async (username, data) => {
  // Always save to localStorage first (for offline/fast access)
  try {
    localStorage.setItem(`sqlquest_user_${username}`, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
  
  // If Supabase is configured, also save to cloud
  if (isSupabaseConfigured()) {
    try {
      // Check if user exists in cloud
      const existing = await supabaseFetch(`users?username=eq.${encodeURIComponent(username)}`);
      
      const cloudData = {
        username,
        password_hash: data.passwordHash || '',
        salt: data.salt || '',
        data: data,
        updated_at: new Date().toISOString()
      };
      
      if (existing && existing.length > 0) {
        // Update existing user
        await supabaseFetch(`users?username=eq.${encodeURIComponent(username)}`, {
          method: 'PATCH',
          body: JSON.stringify(cloudData)
        });
      } else {
        // Insert new user
        cloudData.created_at = new Date().toISOString();
        await supabaseFetch('users', {
          method: 'POST',
          body: JSON.stringify(cloudData)
        });
      }
      console.log('✓ Synced to cloud');
    } catch (err) {
      console.error('Failed to sync to cloud:', err);
    }
  }
  
  return true;
};

const loadUserData = async (username) => {
  // Try cloud first if configured
  if (isSupabaseConfigured()) {
    try {
      const cloudData = await supabaseFetch(`users?username=eq.${encodeURIComponent(username)}`);
      
      if (cloudData && cloudData.length > 0) {
        const userData = cloudData[0].data;
        // Also update localStorage with cloud data
        localStorage.setItem(`sqlquest_user_${username}`, JSON.stringify(userData));
        console.log('✓ Loaded from cloud');
        return userData;
      }
    } catch (err) {
      console.error('Failed to load from cloud:', err);
    }
  }
  
  // Fall back to localStorage
  try {
    const result = localStorage.getItem(`sqlquest_user_${username}`);
    return result ? JSON.parse(result) : null;
  } catch (err) {
    console.error('Failed to load user data:', err);
    return null;
  }
};

const saveToLeaderboard = async (username, xp, solvedCount) => {
  // Save locally
  try {
    const leaderboard = JSON.parse(localStorage.getItem('sqlquest_leaderboard') || '{}');
    leaderboard[username] = { username, xp, solvedCount, timestamp: Date.now() };
    localStorage.setItem('sqlquest_leaderboard', JSON.stringify(leaderboard));
  } catch (err) {
    console.error('Failed to save to leaderboard:', err);
  }
  return true;
};

const loadLeaderboard = async () => {
  // If Supabase configured, load from cloud
  if (isSupabaseConfigured()) {
    try {
      const cloudUsers = await supabaseFetch('users?select=username,data&order=data->>xp.desc&limit=50');
      if (cloudUsers && cloudUsers.length > 0) {
        return cloudUsers.map(u => ({
          username: u.username,
          xp: u.data?.xp || 0,
          solvedCount: u.data?.solvedChallenges?.length || 0,
          timestamp: Date.now()
        })).sort((a, b) => b.xp - a.xp);
      }
    } catch (err) {
      console.error('Failed to load cloud leaderboard:', err);
    }
  }
  
  // Fall back to local leaderboard
  try {
    const leaderboard = JSON.parse(localStorage.getItem('sqlquest_leaderboard') || '{}');
    return Object.values(leaderboard).sort((a, b) => b.xp - a.xp);
  } catch (err) {
    console.error('Failed to load leaderboard:', err);
    return [];
  }
};

// ============ LOAD EXTERNAL DATA ============
// Data is loaded from separate files in /data folder
const publicDatasets = window.publicDatasetsData || {};
const challenges = window.challengesData || [];
const levels = window.gameLevels || [{ name: 'Novice', minXP: 0 }];
const achievements = window.gameAchievements || [];
const dailyChallenges = window.dailyChallengesData || [];

// Daily Challenge helpers - Resets at 11:00 GMT+3 daily
const getDailyChallengeDate = () => {
  const now = new Date();
  // Convert to GMT+3 (add 3 hours to UTC)
  const gmt3 = new Date(now.getTime() + (3 * 60 * 60 * 1000));
  const hours = gmt3.getUTCHours();
  
  // If before 11:00 GMT+3, use previous day
  if (hours < 11) {
    gmt3.setUTCDate(gmt3.getUTCDate() - 1);
  }
  
  return gmt3;
};

const getTodayString = () => {
  const date = getDailyChallengeDate();
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
};

const getTodaysChallenge = (difficulty = null) => {
  if (dailyChallenges.length === 0) return null;
  const date = getDailyChallengeDate();
  // Use day of year to cycle through challenges
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
  const diff = date - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  
  // Filter by difficulty if specified
  let availableChallenges = dailyChallenges;
  if (difficulty) {
    // Group similar difficulties
    const difficultyGroups = {
      'Easy': ['Easy'],
      'Easy-Medium': ['Easy', 'Easy-Medium'],
      'Medium': ['Medium', 'Easy-Medium'],
      'Medium-Hard': ['Medium', 'Medium-Hard', 'Hard'],
      'Hard': ['Hard', 'Medium-Hard']
    };
    const allowedDifficulties = difficultyGroups[difficulty] || [difficulty];
    availableChallenges = dailyChallenges.filter(c => allowedDifficulties.includes(c.difficulty));
    
    // Fallback to all challenges if no matches
    if (availableChallenges.length === 0) {
      availableChallenges = dailyChallenges;
    }
  }
  
  const challengeIndex = dayOfYear % availableChallenges.length;
  return availableChallenges[challengeIndex];
};

const getTimeUntilReset = () => {
  const now = new Date();
  // Convert to GMT+3
  const gmt3 = new Date(now.getTime() + (3 * 60 * 60 * 1000));
  const hours = gmt3.getUTCHours();
  const minutes = gmt3.getUTCMinutes();
  
  let hoursUntil, minutesUntil;
  if (hours >= 11) {
    // Next reset is tomorrow at 11:00
    hoursUntil = 24 - hours + 11 - 1;
    minutesUntil = 60 - minutes;
    if (minutesUntil === 60) {
      minutesUntil = 0;
      hoursUntil++;
    }
  } else {
    // Reset is today at 11:00
    hoursUntil = 11 - hours - 1;
    minutesUntil = 60 - minutes;
    if (minutesUntil === 60) {
      minutesUntil = 0;
      hoursUntil++;
    }
  }
  
  return { hours: hoursUntil, minutes: minutesUntil };
};

// ============ TOPIC DETECTION & RECOMMENDATION HELPERS ============

// Extract table names used in SQL query
const extractTablesFromSql = (sql, datasetTables) => {
  if (!sql || !datasetTables) return [];
  const upperSql = sql.toUpperCase();
  const tableNames = Object.keys(datasetTables);
  return tableNames.filter(table => {
    const upperTable = table.toUpperCase();
    // Check for FROM table, JOIN table, or table. references
    const patterns = [
      new RegExp(`FROM\\s+${upperTable}\\b`, 'i'),
      new RegExp(`JOIN\\s+${upperTable}\\b`, 'i'),
      new RegExp(`${upperTable}\\.`, 'i')
    ];
    return patterns.some(p => p.test(upperSql));
  });
};

// Format seconds to MM:SS
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Detect SQL topic from query/solution
const detectSqlTopic = (sql) => {
  if (!sql) return 'General';
  const upperSql = sql.toUpperCase();
  
  // Check in order of specificity
  if (upperSql.includes('WINDOW') || upperSql.includes('OVER(') || upperSql.includes('OVER (')) return 'Window Functions';
  if (upperSql.includes('EXISTS') || upperSql.includes('NOT EXISTS')) return 'EXISTS';
  if (upperSql.includes('HAVING')) return 'GROUP BY & HAVING';
  if (upperSql.includes('GROUP BY')) return 'GROUP BY';
  if (upperSql.includes('LEFT JOIN') || upperSql.includes('LEFT OUTER JOIN')) return 'LEFT JOIN';
  if (upperSql.includes('RIGHT JOIN') || upperSql.includes('RIGHT OUTER JOIN')) return 'RIGHT JOIN';
  if (upperSql.includes('FULL JOIN') || upperSql.includes('FULL OUTER JOIN')) return 'FULL JOIN';
  if (upperSql.includes('INNER JOIN') || upperSql.includes('JOIN')) return 'JOIN';
  if (upperSql.includes('UNION')) return 'UNION';
  if (upperSql.includes('CASE WHEN') || upperSql.includes('CASE\n')) return 'CASE';
  if (upperSql.includes('LIKE')) return 'LIKE';
  if (upperSql.includes('IN (SELECT') || upperSql.includes('IN(SELECT')) return 'Subqueries';
  if (upperSql.includes('BETWEEN')) return 'BETWEEN';
  if (upperSql.includes('ORDER BY')) return 'ORDER BY';
  if (upperSql.includes('DISTINCT')) return 'DISTINCT';
  if (upperSql.includes('COUNT(') || upperSql.includes('SUM(') || upperSql.includes('AVG(') || upperSql.includes('MAX(') || upperSql.includes('MIN(')) return 'Aggregation';
  if (upperSql.includes('WHERE')) return 'WHERE';
  return 'SELECT';
};

// Map difficulty strings to numeric values for comparison
const difficultyOrder = {
  'Easy': 1,
  'Easy-Medium': 2,
  'Medium': 3,
  'Medium-Hard': 4,
  'Hard': 5
};

// Calculate recommended difficulty based on challenge performance
const calculateRecommendedDifficulty = (solvedChallenges, allChallenges, challengeAttempts = []) => {
  if (!allChallenges || allChallenges.length === 0) return 'Easy';
  
  // Count solved by difficulty
  const stats = {
    'Easy': { solved: 0, total: 0 },
    'Medium': { solved: 0, total: 0 },
    'Hard': { solved: 0, total: 0 }
  };
  
  allChallenges.forEach(c => {
    // Normalize difficulty to Easy/Medium/Hard
    let diff = c.difficulty;
    if (diff === 'Easy-Medium') diff = 'Easy';
    else if (diff === 'Medium-Hard') diff = 'Medium';
    
    if (stats[diff]) {
      stats[diff].total++;
      if (solvedChallenges.has(c.id)) {
        stats[diff].solved++;
      }
    }
  });
  
  // Calculate success rates
  const easyRate = stats.Easy.total > 0 ? stats.Easy.solved / stats.Easy.total : 0;
  const mediumRate = stats.Medium.total > 0 ? stats.Medium.solved / stats.Medium.total : 0;
  const hardRate = stats.Hard.total > 0 ? stats.Hard.solved / stats.Hard.total : 0;
  
  // Determine recommendation
  // Need minimum 3 solved and >50% rate to move up
  if (stats.Hard.solved >= 2 && hardRate >= 0.4) {
    return 'Hard';
  } else if (stats.Medium.solved >= 3 && mediumRate >= 0.5) {
    return 'Medium-Hard';
  } else if (stats.Easy.solved >= 3 && easyRate >= 0.6) {
    return 'Medium';
  } else if (stats.Easy.solved >= 1) {
    return 'Easy-Medium';
  }
  return 'Easy';
};

// Check if user is struggling (3+ fails in last 5 daily challenges)
const checkIfStruggling = (dailyHistory) => {
  if (!dailyHistory || dailyHistory.length < 3) return { struggling: false };
  
  const recent = dailyHistory.slice(-5);
  const fails = recent.filter(d => !d.success).length;
  
  if (fails >= 3) {
    // Find most common failed topic
    const failedTopics = recent.filter(d => !d.success).map(d => d.topic);
    const topicCounts = {};
    failedTopics.forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; });
    const struggleTopic = Object.entries(topicCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    
    return { struggling: true, topic: struggleTopic, failCount: fails };
  }
  
  return { struggling: false };
};

// Get topic performance stats for weekly report
const getTopicStats = (challengeAttempts, solvedChallenges, allChallenges) => {
  const topicStats = {};
  
  // Initialize from all challenges
  allChallenges.forEach(c => {
    const topic = c.topic || detectSqlTopic(c.solution);
    if (!topicStats[topic]) {
      topicStats[topic] = { attempts: 0, successes: 0, challenges: [], solved: 0, total: 0 };
    }
    topicStats[topic].total++;
    if (solvedChallenges.has(c.id)) {
      topicStats[topic].solved++;
    }
  });
  
  // Add attempt data
  challengeAttempts.forEach(a => {
    const topic = a.topic;
    if (!topicStats[topic]) {
      topicStats[topic] = { attempts: 0, successes: 0, challenges: [], solved: 0, total: 0 };
    }
    topicStats[topic].attempts++;
    if (a.success) topicStats[topic].successes++;
  });
  
  // Calculate rates and sort
  return Object.entries(topicStats)
    .map(([topic, stats]) => ({
      topic,
      ...stats,
      successRate: stats.attempts > 0 ? Math.round((stats.successes / stats.attempts) * 100) : (stats.solved > 0 ? 100 : 0),
      coverage: stats.total > 0 ? Math.round((stats.solved / stats.total) * 100) : 0
    }))
    .sort((a, b) => b.successRate - a.successRate);
};

// Map topic to AI Tutor lesson index
const getAiLessonForTopic = (topic) => {
  const topicToLesson = {
    'SELECT': 0,
    'WHERE': 1,
    'ORDER BY': 2,
    'DISTINCT': 2,
    'Aggregation': 3,
    'GROUP BY': 4,
    'GROUP BY & HAVING': 4,
    'JOIN': 5,
    'LEFT JOIN': 6,
    'RIGHT JOIN': 6,
    'FULL JOIN': 6,
    'Subqueries': 7,
    'CASE': 8,
    'Window Functions': 9
  };
  return topicToLesson[topic] ?? 0;
};

// Generate Google Calendar link for daily reminder at 11:00 GMT+3
const getGoogleCalendarLink = () => {
  const title = encodeURIComponent("☀️ SQL Quest Daily Challenge");
  const details = encodeURIComponent("Your daily SQL challenge is live! Practice SQL and maintain your streak.\n\nOpen: " + window.location.href);
  // Recurring daily at 11:00 GMT+3 (08:00 UTC)
  const recur = encodeURIComponent("RRULE:FREQ=DAILY");
  // Start time: 08:00 UTC (11:00 GMT+3)
  const dates = "20240101T080000Z/20240101T081500Z";
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${dates}&recur=${recur}`;
};

// Request browser notification permission
const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    alert("This browser doesn't support notifications");
    return false;
  }
  
  if (Notification.permission === "granted") {
    return true;
  }
  
  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }
  
  return false;
};

// Show browser notification
const showDailyNotification = () => {
  if (Notification.permission === "granted") {
    new Notification("☀️ SQL Quest Daily Challenge", {
      body: "Today's challenge is live! Keep your streak going.",
      icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎯</text></svg>",
      tag: "daily-challenge"
    });
  }
};

// Helper to get icon component by name (for data files that store icon names as strings)
const getIconForData = (iconName) => {
  const icons = { Ship, Film, Users, ShoppingCart, Star, Flame, Zap, Database, Upload, Code, BarChart3, Target, Award, Trophy };
  return icons[iconName] || Star;
};

// Process datasets to convert icon strings to components
Object.keys(publicDatasets).forEach(key => {
  if (typeof publicDatasets[key].icon === 'string') {
    publicDatasets[key].icon = getIconForData(publicDatasets[key].icon);
  }
});

// Process achievements to convert icon strings to components
achievements.forEach(a => {
  if (typeof a.icon === 'string') {
    a.icon = getIconForData(a.icon);
  }
});

// ============ COMPONENTS ============
function XPBar({ current, max, level }) {
  const pct = Math.min(((current - level.minXP) / (max - level.minXP)) * 100, 100);
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="font-bold text-purple-300">{level.name}</span>
        <span className="text-gray-400">{current} XP</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function AchievementPopup({ achievement, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  const Icon = achievement.icon;
  return (
    <div className="fixed top-4 right-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-4 rounded-xl shadow-2xl animate-bounce z-50 flex items-center gap-3">
      <Icon size={24} /><div><p className="text-xs opacity-80">Achievement Unlocked!</p><p className="font-bold">{achievement.name}</p></div>
    </div>
  );
}

function ResultsTable({ columns, rows, error }) {
  if (error) return <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">❌ {error}</div>;
  if (!rows?.length) return <p className="text-gray-400 italic">No results</p>;
  return (
    <div className="overflow-auto max-h-72">
      <table className="min-w-full text-sm border border-green-500/30">
        <thead className="bg-green-500/20 sticky top-0">
          <tr>{columns.map((c,i) => <th key={i} className="px-3 py-2 text-left font-medium text-green-300 border-b border-green-500/30">{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.slice(0,100).map((row,i) => (
            <tr key={i} className="hover:bg-green-500/10">
              {row.map((cell,j) => <td key={j} className="px-3 py-2 border-b border-green-500/20 text-gray-300">{cell === null ? <span className="text-gray-500">NULL</span> : formatCell(cell)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 100 && <p className="text-xs text-gray-500 mt-2">Showing 100 of {rows.length} rows</p>}
    </div>
  );
}

function SQLEditor({ value, onChange, onRun, disabled }) {
  return (
    <div className="relative">
      <textarea value={value} onChange={e => onChange(e.target.value)} onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); onRun(); }}}
        placeholder="Write SQL here... (Ctrl+Enter to run)" disabled={disabled}
        className="w-full h-32 p-3 font-mono text-sm bg-gray-900 text-green-400 rounded-lg border-2 border-gray-600 focus:border-purple-500 focus:outline-none resize-none" spellCheck={false} />
      <button onClick={onRun} disabled={disabled} className="absolute bottom-3 right-3 flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm font-bold rounded-lg disabled:opacity-50 shadow-lg">
        <Play size={14} /> Run
      </button>
    </div>
  );
}

// ============ MAIN APP ============
function SQLQuest() {
  // User state
  const [currentUser, setCurrentUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [showAuth, setShowAuth] = useState(true);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [queryHistory, setQueryHistory] = useState([]);
  const [showProfile, setShowProfile] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [signupPromptReason, setSignupPromptReason] = useState('');
  const [guestActionsCount, setGuestActionsCount] = useState(0);
  
  // Change password state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changePasswordSuccess, setChangePasswordSuccess] = useState('');
  
  // Admin state
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [adminError, setAdminError] = useState('');
  const [selectedUserForReset, setSelectedUserForReset] = useState(null);
  const [newPasswordForReset, setNewPasswordForReset] = useState('');
  const [adminTab, setAdminTab] = useState('users'); // 'users' or 'challenges'
  
  // Daily Challenge Admin state
  const [adminChallenges, setAdminChallenges] = useState([]);
  const [editingChallenge, setEditingChallenge] = useState(null);
  const [showChallengeForm, setShowChallengeForm] = useState(false);
  const [challengeForm, setChallengeForm] = useState({
    day: 'Monday',
    difficulty: 'Easy',
    topic: '',
    avgSolveTime: 3,
    solveRate: 70,
    warmup: { type: 'mcq', question: '', options: ['', '', '', ''], correct: 0, explanation: '' },
    core: { title: '', description: '', dataset: 'titanic', hint: '', solution: '', concept: '' },
    insight: { type: 'mcq', question: '', options: ['', '', '', ''], correct: 0, explanation: '' }
  });
  // Admin password (change this to your desired admin password)
  const ADMIN_PASSWORD = 'adminadmin';
  
  // API Key state
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('sqlquest_api_key') || '');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [useAI, setUseAI] = useState(() => !!localStorage.getItem('sqlquest_api_key'));
  
  // Database state
  const [db, setDb] = useState(null);
  const [dbReady, setDbReady] = useState(false);
  const [currentDataset, setCurrentDataset] = useState('titanic');
  const [customTables, setCustomTables] = useState({});
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ columns: [], rows: [], error: null });
  const [activeTab, setActiveTab] = useState('learn');
  const [xp, setXP] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [queryCount, setQueryCount] = useState(0);
  const [datasetsUsed, setDatasetsUsed] = useState(new Set(['titanic']));
  const [unlockedAchievements, setUnlockedAchievements] = useState(new Set());
  const [showAchievement, setShowAchievement] = useState(null);
  const [solvedChallenges, setSolvedChallenges] = useState(new Set());
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [challengeQuery, setChallengeQuery] = useState('');
  const [challengeQueries, setChallengeQueries] = useState({}); // Store queries per challenge ID
  const [challengeResult, setChallengeResult] = useState({ columns: [], rows: [], error: null });
  const [challengeExpected, setChallengeExpected] = useState({ columns: [], rows: [] });
  const [challengeStatus, setChallengeStatus] = useState(null);
  const [showChallengeHint, setShowChallengeHint] = useState(false);
  const [challengeFilter, setChallengeFilter] = useState('all');
  const fileInputRef = useRef(null);
  
  // Daily Challenge state
  const [showDailyChallenge, setShowDailyChallenge] = useState(false);
  const [dailyChallengeQuery, setDailyChallengeQuery] = useState('');
  const [dailyChallengeResult, setDailyChallengeResult] = useState({ columns: [], rows: [], error: null });
  const [dailyChallengeStatus, setDailyChallengeStatus] = useState(null);
  
  // 3-Step Daily Challenge State
  const [dailyStep, setDailyStep] = useState(0); // 0=warmup, 1=core, 2=insight, 3=complete
  const [warmupAnswer, setWarmupAnswer] = useState(null);
  const [warmupResult, setWarmupResult] = useState(null); // null, 'correct', 'wrong'
  const [insightAnswer, setInsightAnswer] = useState(null);
  const [insightResult, setInsightResult] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [coreCompleted, setCoreCompleted] = useState(false);
  const [completedDailyChallenges, setCompletedDailyChallenges] = useState({}); // { "2024-01-17": true }
  const [dailyStreak, setDailyStreak] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showReminderSetup, setShowReminderSetup] = useState(false);
  
  // Daily Challenge Timer & Hint State
  const [dailyTimer, setDailyTimer] = useState(0); // seconds elapsed
  const [dailyTimerActive, setDailyTimerActive] = useState(false);
  const [dailyHintUsed, setDailyHintUsed] = useState(false);
  const [dailyAnswerShown, setDailyAnswerShown] = useState(false);
  const [dailySolveTime, setDailySolveTime] = useState(null); // final solve time
  const [showWeeklyReport, setShowWeeklyReport] = useState(false);
  const [weakTopicForTutor, setWeakTopicForTutor] = useState(null); // Topic to practice in AI Tutor
  
  // AI Learning state
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [currentAiLesson, setCurrentAiLesson] = useState(0);
  const [aiLessonPhase, setAiLessonPhase] = useState('intro'); // 'intro', 'teaching', 'practice', 'feedback'
  const [aiQuestionCount, setAiQuestionCount] = useState(0);
  const [aiCorrectCount, setAiCorrectCount] = useState(0);
  const [aiExpectedQuery, setAiExpectedQuery] = useState('');
  const [aiExpectedResult, setAiExpectedResult] = useState({ columns: [], rows: [] });
  const [aiUserResult, setAiUserResult] = useState({ columns: [], rows: [], error: null });
  const [showAiComparison, setShowAiComparison] = useState(false);
  const [completedAiLessons, setCompletedAiLessons] = useState(new Set());
  const [showSqlSandbox, setShowSqlSandbox] = useState(true);
  const [sandboxQuery, setSandboxQuery] = useState('');
  const [sandboxResult, setSandboxResult] = useState({ columns: [], rows: [], error: null });
  const [comprehensionCount, setComprehensionCount] = useState(0);
  const [comprehensionCorrect, setComprehensionCorrect] = useState(0);
  const [lessonAttempts, setLessonAttempts] = useState(0);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [comprehensionConsecutive, setComprehensionConsecutive] = useState(0);
  const [expectedResultMessageId, setExpectedResultMessageId] = useState(-1);
  const [askedQuestions, setAskedQuestions] = useState([]); // Track asked questions to avoid repetition
  const [currentHintLevel, setCurrentHintLevel] = useState(0); // 0 = no hint, 1 = small hint, 2 = big hint, 3 = show answer
  // Exercise state
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [exerciseCorrect, setExerciseCorrect] = useState(0);
  const [exerciseAttempted, setExerciseAttempted] = useState(false);
  // Exercises Tab state
  const [selectedExerciseLesson, setSelectedExerciseLesson] = useState(0);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [exerciseQuery, setExerciseQuery] = useState('');
  const [exerciseResult, setExerciseResult] = useState({ columns: [], rows: [], error: null });
  const [exerciseExpectedResult, setExerciseExpectedResult] = useState({ columns: [], rows: [] });
  const [showExerciseResult, setShowExerciseResult] = useState(false);
  const [completedExercises, setCompletedExercises] = useState(new Set()); // format: "lessonId-exerciseIndex"

  // Performance Tracking State (for recommendations)
  const [challengeAttempts, setChallengeAttempts] = useState([]); // Array of { challengeId, difficulty, topic, success, timestamp, firstTry, hintsUsed }
  const [dailyChallengeHistory, setDailyChallengeHistory] = useState([]); // Array of { date, difficulty, topic, success, warmupCorrect, coreCorrect, insightCorrect }
  const [recommendedDifficulty, setRecommendedDifficulty] = useState('Easy');
  const [showDifficultySelector, setShowDifficultySelector] = useState(false);
  const [selectedDailyDifficulty, setSelectedDailyDifficulty] = useState(null);
  const [showStrugglingAlert, setShowStrugglingAlert] = useState(false);
  const [weeklyReports, setWeeklyReports] = useState([]); // Array of weekly report objects

  // Check for existing session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('sqlquest_user');
    if (savedUser) {
      loadUserSession(savedUser);
    }
    
    // Check notification settings
    const notifEnabled = localStorage.getItem('sqlquest_notifications') === 'true';
    setNotificationsEnabled(notifEnabled);
    
    // Show notification if enabled and daily challenge not completed
    if (notifEnabled && Notification.permission === 'granted') {
      const today = getTodayString();
      const completed = JSON.parse(localStorage.getItem('sqlquest_daily_notified') || '{}');
      if (!completed[today]) {
        setTimeout(() => {
          showDailyNotification();
          completed[today] = true;
          localStorage.setItem('sqlquest_daily_notified', JSON.stringify(completed));
        }, 2000);
      }
    }
    
    // Check for admin URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true') {
      setShowAdminPanel(true);
    }
    
    // Admin keyboard shortcut: Ctrl+Shift+A
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setShowAdminPanel(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Save user progress whenever key stats change
  useEffect(() => {
    if (currentUser && dbReady) {
      (async () => {
        // Preserve existing passwordHash
        const existingData = await loadUserData(currentUser);
        const userData = {
          passwordHash: existingData?.passwordHash,
          salt: existingData?.salt,
          username: currentUser,
          xp,
          streak,
          lives,
          queryCount,
          solvedChallenges: [...solvedChallenges],
          unlockedAchievements: [...unlockedAchievements],
          datasetsUsed: [...datasetsUsed],
          queryHistory: queryHistory.slice(-50),
          challengeQueries, // Save challenge queries
          completedDailyChallenges, // Save daily challenge completions
          dailyStreak, // Save daily streak
          // Performance tracking data
          challengeAttempts: challengeAttempts.slice(-100), // Keep last 100 attempts
          dailyChallengeHistory: dailyChallengeHistory.slice(-60), // Keep ~2 months
          weeklyReports,
          // AI Tutor progress
          aiTutorProgress: {
            currentAiLesson,
            aiMessages,
            aiLessonPhase,
            aiQuestionCount,
            aiCorrectCount,
            aiExpectedQuery,
            completedAiLessons: [...completedAiLessons],
            comprehensionCount,
            comprehensionCorrect,
            lessonAttempts,
            consecutiveCorrect,
            comprehensionConsecutive,
            completedExercises: [...completedExercises]
          },
          lastActive: Date.now()
        };
        saveUserData(currentUser, userData);
        saveToLeaderboard(currentUser, xp, solvedChallenges.size);
      })();
    }
  }, [xp, solvedChallenges, unlockedAchievements, queryCount, aiMessages, aiLessonPhase, currentAiLesson, completedAiLessons, comprehensionCount, comprehensionCorrect, consecutiveCorrect, comprehensionConsecutive, completedExercises, challengeQueries, completedDailyChallenges, dailyStreak, challengeAttempts, dailyChallengeHistory, weeklyReports]);

  // Load leaderboard periodically
  useEffect(() => {
    if (currentUser) {
      loadLeaderboard().then(setLeaderboard);
      const interval = setInterval(() => {
        loadLeaderboard().then(setLeaderboard);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // Daily Challenge Timer
  useEffect(() => {
    let interval;
    if (dailyTimerActive && !isDailyCompleted) {
      interval = setInterval(() => {
        setDailyTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [dailyTimerActive, isDailyCompleted]);

  // Save daily challenge progress when state changes (auto-save)
  useEffect(() => {
    if (currentUser && showDailyChallenge && !isDailyCompleted) {
      const todayStr = getTodayString();
      const progress = {
        date: todayStr,
        difficulty: selectedDailyDifficulty || recommendedDifficulty,
        step: dailyStep,
        query: dailyChallengeQuery,
        timer: dailyTimer,
        hintUsed: dailyHintUsed,
        answerShown: dailyAnswerShown,
        warmupAnswer,
        warmupResult,
        insightAnswer,
        insightResult,
        coreCompleted,
        savedAt: Date.now()
      };
      localStorage.setItem(`sqlquest_daily_progress_${currentUser}`, JSON.stringify(progress));
    }
  }, [dailyStep, dailyChallengeQuery, dailyTimer, dailyHintUsed, dailyAnswerShown, warmupAnswer, warmupResult, insightAnswer, insightResult, coreCompleted, showDailyChallenge]);

  // Load saved daily progress
  const loadDailyProgress = () => {
    if (!currentUser) return null;
    try {
      const saved = localStorage.getItem(`sqlquest_daily_progress_${currentUser}`);
      if (!saved) return null;
      const progress = JSON.parse(saved);
      // Only restore if it's from today and not completed
      if (progress.date === getTodayString() && !isDailyCompleted) {
        return progress;
      }
      // Clear old progress
      localStorage.removeItem(`sqlquest_daily_progress_${currentUser}`);
      return null;
    } catch (e) {
      return null;
    }
  };

  // Clear daily progress after completion
  const clearDailyProgress = () => {
    if (currentUser) {
      localStorage.removeItem(`sqlquest_daily_progress_${currentUser}`);
    }
  };

  // Restore AI expected result when db is ready and there's a saved query
  useEffect(() => {
    if (db && aiExpectedQuery && aiMessages.length > 0) {
      const lesson = aiLessons[currentAiLesson];
      // Load the appropriate dataset first
      if (lesson) {
        if (lesson.practiceTable === 'passengers') loadDataset(db, 'titanic');
        else if (lesson.practiceTable === 'movies') loadDataset(db, 'movies');
        else if (lesson.practiceTable === 'employees') loadDataset(db, 'employees');
        else loadDataset(db, 'ecommerce');
      }
      
      // Recalculate expected result
      try {
        const result = db.exec(aiExpectedQuery);
        if (result.length > 0) {
          setAiExpectedResult({ columns: result[0].columns, rows: result[0].values });
        }
      } catch (err) {
        console.error('Error restoring expected result:', err);
      }
    }
  }, [db, aiExpectedQuery]);

  const loadUserSession = async (username) => {
    const userData = await loadUserData(username);
    if (userData) {
      setCurrentUser(username);
      setXP(userData.xp || 0);
      setStreak(userData.streak || 0);
      setLives(userData.lives || 3);
      setQueryCount(userData.queryCount || 0);
      setSolvedChallenges(new Set(userData.solvedChallenges || []));
      setUnlockedAchievements(new Set(userData.unlockedAchievements || []));
      setDatasetsUsed(new Set(userData.datasetsUsed || ['titanic']));
      setQueryHistory(userData.queryHistory || []);
      setChallengeQueries(userData.challengeQueries || {}); // Restore challenge queries
      setCompletedDailyChallenges(userData.completedDailyChallenges || {}); // Restore daily challenges
      setDailyStreak(userData.dailyStreak || 0); // Restore daily streak
      
      // Restore performance tracking data
      setChallengeAttempts(userData.challengeAttempts || []);
      setDailyChallengeHistory(userData.dailyChallengeHistory || []);
      setWeeklyReports(userData.weeklyReports || []);
      
      // Calculate recommended difficulty
      const solved = new Set(userData.solvedChallenges || []);
      const recommended = calculateRecommendedDifficulty(solved, challenges, userData.challengeAttempts || []);
      setRecommendedDifficulty(recommended);
      
      // Check if struggling
      const struggleCheck = checkIfStruggling(userData.dailyChallengeHistory || []);
      if (struggleCheck.struggling) {
        setShowStrugglingAlert(true);
      }
      
      // Restore AI Tutor progress
      if (userData.aiTutorProgress) {
        setCurrentAiLesson(userData.aiTutorProgress.currentAiLesson || 0);
        setAiMessages(userData.aiTutorProgress.aiMessages || []);
        setAiLessonPhase(userData.aiTutorProgress.aiLessonPhase || 'intro');
        setAiQuestionCount(userData.aiTutorProgress.aiQuestionCount || 0);
        setAiCorrectCount(userData.aiTutorProgress.aiCorrectCount || 0);
        setAiExpectedQuery(userData.aiTutorProgress.aiExpectedQuery || '');
        setCompletedAiLessons(new Set(userData.aiTutorProgress.completedAiLessons || []));
        setComprehensionCount(userData.aiTutorProgress.comprehensionCount || 0);
        setComprehensionCorrect(userData.aiTutorProgress.comprehensionCorrect || 0);
        setLessonAttempts(userData.aiTutorProgress.lessonAttempts || 0);
        setConsecutiveCorrect(userData.aiTutorProgress.consecutiveCorrect || 0);
        setComprehensionConsecutive(userData.aiTutorProgress.comprehensionConsecutive || 0);
        setCompletedExercises(new Set(userData.aiTutorProgress.completedExercises || []));
      }
      
      setShowAuth(false);
      localStorage.setItem('sqlquest_user', username);
    } else {
      setCurrentUser(username);
      setShowAuth(false);
      localStorage.setItem('sqlquest_user', username);
    }
  };

  // ============ GUEST MODE FUNCTIONS ============
  const startGuestMode = () => {
    setCurrentUser('guest_' + Date.now());
    setIsGuest(true);
    setXP(0);
    setStreak(0);
    setLives(3);
    setQueryCount(0);
    setSolvedChallenges(new Set());
    setUnlockedAchievements(new Set());
    setDatasetsUsed(new Set(['titanic']));
    setQueryHistory([]);
    setChallengeQueries({});
    setCompletedDailyChallenges({});
    setDailyStreak(0);
    setGuestActionsCount(0);
    setChallengeAttempts([]);
    setDailyChallengeHistory([]);
    setWeeklyReports([]);
    setRecommendedDifficulty('Easy');
    setShowStrugglingAlert(false);
    setShowAuth(false);
  };

  const triggerSignupPrompt = (reason) => {
    if (isGuest && !showSignupPrompt) {
      setSignupPromptReason(reason);
      setShowSignupPrompt(true);
    }
  };

  const convertGuestToUser = async (username, password) => {
    // Hash password
    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);
    
    // Save current guest progress to the new account
    const userData = {
      passwordHash,
      salt,
      username,
      xp,
      streak,
      lives,
      queryCount,
      solvedChallenges: [...solvedChallenges],
      unlockedAchievements: [...unlockedAchievements],
      datasetsUsed: [...datasetsUsed],
      queryHistory,
      challengeQueries,
      completedDailyChallenges,
      dailyStreak,
      // Performance tracking data
      challengeAttempts,
      dailyChallengeHistory,
      weeklyReports,
      aiTutorProgress: {
        currentAiLesson,
        aiMessages,
        aiLessonPhase,
        aiQuestionCount,
        aiCorrectCount,
        aiExpectedQuery,
        completedAiLessons: [...completedAiLessons],
        comprehensionCount,
        comprehensionCorrect,
        lessonAttempts,
        consecutiveCorrect,
        comprehensionConsecutive,
        completedExercises: [...completedExercises]
      },
      createdAt: Date.now()
    };
    
    await saveUserData(username, userData);
    
    // Update state
    setCurrentUser(username);
    setIsGuest(false);
    setShowSignupPrompt(false);
    localStorage.setItem('sqlquest_user', username);
    
    // Save to leaderboard
    saveToLeaderboard(username, xp, solvedChallenges.size);
    
    return true;
  };

  // ============ LOGIN SECURITY FUNCTIONS ============
  const getLoginAttempts = (username) => {
    try {
      const data = JSON.parse(localStorage.getItem('sqlquest_login_attempts') || '{}');
      return data[username.toLowerCase()] || { attempts: 0, lockoutCount: 0, lockedUntil: null, permanentLock: false };
    } catch {
      return { attempts: 0, lockoutCount: 0, lockedUntil: null, permanentLock: false };
    }
  };

  const setLoginAttempts = (username, data) => {
    try {
      const allData = JSON.parse(localStorage.getItem('sqlquest_login_attempts') || '{}');
      allData[username.toLowerCase()] = data;
      localStorage.setItem('sqlquest_login_attempts', JSON.stringify(allData));
    } catch (err) {
      console.error('Error saving login attempts:', err);
    }
  };

  const resetLoginAttempts = (username) => {
    const data = getLoginAttempts(username);
    data.attempts = 0;
    data.lockedUntil = null;
    // Don't reset lockoutCount or permanentLock - only admin can do that
    setLoginAttempts(username, data);
  };

  const recordFailedAttempt = (username) => {
    const data = getLoginAttempts(username);
    data.attempts += 1;
    
    // After 5 failed attempts, lock for 15 minutes
    if (data.attempts >= 5) {
      data.lockoutCount += 1;
      data.lockedUntil = Date.now() + (15 * 60 * 1000); // 15 minutes
      data.attempts = 0;
      
      // After 3 lockouts, permanent lock
      if (data.lockoutCount >= 3) {
        data.permanentLock = true;
      }
    }
    
    setLoginAttempts(username, data);
    return data;
  };

  const checkLockoutStatus = (username) => {
    const data = getLoginAttempts(username);
    
    if (data.permanentLock) {
      return { locked: true, permanent: true, message: '🔒 Account permanently locked due to too many failed attempts. Please contact the administrator to unlock your account.' };
    }
    
    if (data.lockedUntil && Date.now() < data.lockedUntil) {
      const remainingMs = data.lockedUntil - Date.now();
      const remainingMins = Math.ceil(remainingMs / 60000);
      return { locked: true, permanent: false, message: `🔒 Account temporarily locked. Try again in ${remainingMins} minute${remainingMins > 1 ? 's' : ''}.`, remainingMins };
    }
    
    // If lockout period has passed, reset attempts
    if (data.lockedUntil && Date.now() >= data.lockedUntil) {
      data.lockedUntil = null;
      data.attempts = 0;
      setLoginAttempts(username, data);
    }
    
    return { locked: false, attemptsRemaining: 5 - data.attempts, lockoutCount: data.lockoutCount };
  };

  const handleLogin = async () => {
    if (!authUsername.trim()) {
      setAuthError('Please enter a username');
      return;
    }
    if (authUsername.length < 3) {
      setAuthError('Username must be at least 3 characters');
      return;
    }
    if (!authPassword) {
      setAuthError('Please enter a password');
      return;
    }
    if (authPassword.length < 6) {
      setAuthError('Password must be at least 6 characters');
      return;
    }
    
    const username = authUsername.trim().toLowerCase();
    
    // Check if account is locked
    const lockStatus = checkLockoutStatus(username);
    if (lockStatus.locked) {
      setAuthError(lockStatus.message);
      return;
    }
    
    const userData = await loadUserData(username);
    
    if (authMode === 'login') {
      if (!userData) {
        const attemptData = recordFailedAttempt(username);
        if (attemptData.permanentLock) {
          setAuthError('🔒 Account permanently locked due to too many failed attempts. Please contact the administrator.');
        } else if (attemptData.lockedUntil) {
          setAuthError(`🔒 Too many failed attempts. Account locked for 15 minutes. (Lockout ${attemptData.lockoutCount}/3)`);
        } else {
          const remaining = 5 - attemptData.attempts;
          setAuthError(`Invalid username or password. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`);
        }
        return;
      }
      
      const isValid = await verifyPassword(authPassword, userData.salt, userData.passwordHash);
      if (!isValid) {
        const attemptData = recordFailedAttempt(username);
        if (attemptData.permanentLock) {
          setAuthError('🔒 Account permanently locked due to too many failed attempts. Please contact the administrator.');
        } else if (attemptData.lockedUntil) {
          setAuthError(`🔒 Too many failed attempts. Account locked for 15 minutes. (Lockout ${attemptData.lockoutCount}/3)`);
        } else {
          const remaining = 5 - attemptData.attempts;
          setAuthError(`Invalid username or password. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`);
        }
        return;
      }
      
      // Successful login - reset attempts
      resetLoginAttempts(username);
    }
    
    if (authMode === 'register') {
      if (userData) {
        setAuthError('Username already exists');
        return;
      }
      const salt = generateSalt();
      const passwordHash = await hashPassword(authPassword, salt);
      const newUserData = {
        salt,
        passwordHash,
        xp: 0,
        streak: 0,
        queryCount: 0,
        solvedChallenges: [],
        unlockedAchievements: [],
        queryHistory: [],
        createdAt: Date.now()
      };
      await saveUserData(username, newUserData);
    }
    
    await loadUserSession(username);
    setAuthError('');
    setAuthPassword('');
  };

  const handleChangePassword = async () => {
    setChangePasswordError('');
    setChangePasswordSuccess('');
    
    // Validate inputs
    if (!currentPassword) {
      setChangePasswordError('Please enter your current password');
      return;
    }
    if (!newPassword) {
      setChangePasswordError('Please enter a new password');
      return;
    }
    if (newPassword.length < 6) {
      setChangePasswordError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangePasswordError('New passwords do not match');
      return;
    }
    if (currentPassword === newPassword) {
      setChangePasswordError('New password must be different from current password');
      return;
    }
    
    // Check password strength
    const strength = getPasswordStrength(newPassword);
    if (strength.score < 3) {
      setChangePasswordError('Please choose a stronger password');
      return;
    }
    
    try {
      // Verify current password
      const userData = await loadUserData(currentUser);
      if (!userData) {
        setChangePasswordError('User data not found');
        return;
      }
      
      const isValid = await verifyPassword(currentPassword, userData.salt, userData.passwordHash);
      if (!isValid) {
        setChangePasswordError('Current password is incorrect');
        return;
      }
      
      // Generate new hash
      const newSalt = generateSalt();
      const newHash = await hashPassword(newPassword, newSalt);
      
      // Update user data
      userData.salt = newSalt;
      userData.passwordHash = newHash;
      await saveUserData(currentUser, userData);
      
      // Clear form and show success
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setChangePasswordSuccess('Password changed successfully!');
      
      // Hide success after 3 seconds
      setTimeout(() => {
        setChangePasswordSuccess('');
        setShowChangePassword(false);
      }, 2000);
    } catch (err) {
      console.error('Error changing password:', err);
      setChangePasswordError('An error occurred. Please try again.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setShowAuth(true);
    setXP(0);
    setStreak(0);
    setLives(3);
    setQueryCount(0);
    setSolvedChallenges(new Set());
    setUnlockedAchievements(new Set());
    setQueryHistory([]);
    setChallengeQueries({}); // Reset challenge queries
    setCompletedDailyChallenges({}); // Reset daily challenges
    setDailyStreak(0); // Reset daily streak
    // Reset performance tracking
    setChallengeAttempts([]);
    setDailyChallengeHistory([]);
    setWeeklyReports([]);
    setRecommendedDifficulty('Easy');
    setShowStrugglingAlert(false);
    // Reset AI Tutor state
    setAiMessages([]);
    setCurrentAiLesson(0);
    setAiLessonPhase('intro');
    setAiQuestionCount(0);
    setAiCorrectCount(0);
    setAiExpectedQuery('');
    setAiExpectedResult({ columns: [], rows: [] });
    setExpectedResultMessageId(-1);
    setCompletedAiLessons(new Set());
    setComprehensionCount(0);
    setComprehensionCorrect(0);
    setLessonAttempts(0);
    setConsecutiveCorrect(0);
    setComprehensionConsecutive(0);
    setCompletedExercises(new Set());
    setIsGuest(false);
    setGuestActionsCount(0);
    localStorage.removeItem('sqlquest_user');
  };

  // ============ ADMIN FUNCTIONS ============
  const authenticateAdmin = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true);
      setAdminError('');
      loadAllUsers();
    } else {
      setAdminError('Invalid admin password');
    }
  };

  const loadAllUsers = () => {
    try {
      const users = [];
      const loginAttempts = JSON.parse(localStorage.getItem('sqlquest_login_attempts') || '{}');
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sqlquest_user_')) {
          const username = key.replace('sqlquest_user_', '');
          const userData = JSON.parse(localStorage.getItem(key) || '{}');
          const attemptData = loginAttempts[username] || { attempts: 0, lockoutCount: 0, permanentLock: false };
          
          users.push({
            username,
            xp: userData.xp || 0,
            challengesSolved: userData.solvedChallenges?.length || 0,
            dailyStreak: userData.dailyStreak || 0,
            lastActive: userData.lastActive ? new Date(userData.lastActive).toLocaleString() : 'Never',
            hasPassword: !!userData.passwordHash,
            createdAt: userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'Unknown',
            // Security info
            failedAttempts: attemptData.attempts || 0,
            lockoutCount: attemptData.lockoutCount || 0,
            isLocked: attemptData.permanentLock || (attemptData.lockedUntil && Date.now() < attemptData.lockedUntil),
            isPermanentLock: attemptData.permanentLock || false
          });
        }
      }
      // Sort by XP descending
      users.sort((a, b) => b.xp - a.xp);
      setAllUsers(users);
    } catch (err) {
      console.error('Error loading users:', err);
      setAdminError('Error loading users');
    }
  };

  const unlockUser = (username) => {
    try {
      const allData = JSON.parse(localStorage.getItem('sqlquest_login_attempts') || '{}');
      allData[username.toLowerCase()] = { attempts: 0, lockoutCount: 0, lockedUntil: null, permanentLock: false };
      localStorage.setItem('sqlquest_login_attempts', JSON.stringify(allData));
      loadAllUsers();
      alert(`Account "${username}" has been unlocked.`);
    } catch (err) {
      console.error('Error unlocking user:', err);
      setAdminError('Error unlocking user');
    }
  };

  const deleteUser = async (username) => {
    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return;
    }
    try {
      localStorage.removeItem(`sqlquest_user_${username}`);
      // Also remove from leaderboard
      const leaderboardData = JSON.parse(localStorage.getItem('sqlquest_leaderboard') || '{}');
      delete leaderboardData[username];
      localStorage.setItem('sqlquest_leaderboard', JSON.stringify(leaderboardData));
      loadAllUsers();
      alert(`User "${username}" has been deleted.`);
    } catch (err) {
      console.error('Error deleting user:', err);
      setAdminError('Error deleting user');
    }
  };

  const resetUserPassword = async (username) => {
    if (!newPasswordForReset || newPasswordForReset.length < 6) {
      setAdminError('New password must be at least 6 characters');
      return;
    }
    try {
      const userData = JSON.parse(localStorage.getItem(`sqlquest_user_${username}`) || '{}');
      
      // Generate new salt and hash using the same method as registration
      const salt = generateSalt();
      const passwordHash = await hashPassword(newPasswordForReset, salt);
      
      userData.salt = salt;
      userData.passwordHash = passwordHash;
      
      localStorage.setItem(`sqlquest_user_${username}`, JSON.stringify(userData));
      
      setSelectedUserForReset(null);
      setNewPasswordForReset('');
      setAdminError('');
      alert(`Password reset successfully for "${username}"`);
    } catch (err) {
      console.error('Error resetting password:', err);
      setAdminError('Error resetting password');
    }
  };

  const exportUserData = (username) => {
    try {
      const userData = localStorage.getItem(`sqlquest_user_${username}`);
      if (userData) {
        const blob = new Blob([userData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sqlquest_${username}_backup.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error exporting user data:', err);
    }
  };

  const exportAllUsers = () => {
    try {
      const allData = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sqlquest_')) {
          allData[key] = JSON.parse(localStorage.getItem(key) || '{}');
        }
      }
      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sqlquest_full_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting all data:', err);
    }
  };

  const closeAdminPanel = () => {
    setShowAdminPanel(false);
    setIsAdminAuthenticated(false);
    setAdminPassword('');
    setAdminError('');
    setSelectedUserForReset(null);
    setNewPasswordForReset('');
    setAdminTab('users');
    setEditingChallenge(null);
    setShowChallengeForm(false);
  };

  // ============ DAILY CHALLENGE ADMIN FUNCTIONS ============
  const loadAdminChallenges = () => {
    // Load custom challenges from localStorage, merge with defaults
    const customChallenges = JSON.parse(localStorage.getItem('sqlquest_custom_challenges') || '[]');
    const defaultChallenges = window.dailyChallengesData || [];
    
    // Mark custom challenges
    const allChallenges = [
      ...defaultChallenges.map(c => ({ ...c, isCustom: false })),
      ...customChallenges.map(c => ({ ...c, isCustom: true }))
    ];
    
    setAdminChallenges(allChallenges);
  };

  const saveCustomChallenges = (challenges) => {
    const customOnly = challenges.filter(c => c.isCustom);
    localStorage.setItem('sqlquest_custom_challenges', JSON.stringify(customOnly));
    
    // Update the global dailyChallengesData
    const defaultChallenges = window.dailyChallengesData || [];
    window.dailyChallengesData = [...defaultChallenges, ...customOnly];
  };

  const resetChallengeForm = () => {
    setChallengeForm({
      day: 'Monday',
      difficulty: 'Easy',
      topic: '',
      avgSolveTime: 3,
      solveRate: 70,
      warmup: { type: 'mcq', question: '', options: ['', '', '', ''], correct: 0, explanation: '' },
      core: { title: '', description: '', dataset: 'titanic', hint: '', solution: '', concept: '' },
      insight: { type: 'mcq', question: '', options: ['', '', '', ''], correct: 0, explanation: '' }
    });
  };

  const openNewChallengeForm = () => {
    resetChallengeForm();
    setEditingChallenge(null);
    setShowChallengeForm(true);
  };

  const openEditChallengeForm = (challenge) => {
    setChallengeForm({
      ...challenge,
      warmup: { ...challenge.warmup, options: [...(challenge.warmup?.options || ['', '', '', ''])] },
      core: { ...challenge.core },
      insight: { ...challenge.insight, options: [...(challenge.insight?.options || ['', '', '', ''])] }
    });
    setEditingChallenge(challenge);
    setShowChallengeForm(true);
  };

  const saveChallengeForm = () => {
    if (!challengeForm.topic || !challengeForm.core.title || !challengeForm.core.solution) {
      setAdminError('Please fill in required fields: Topic, Challenge Title, and Solution');
      return;
    }

    const newChallenge = {
      ...challengeForm,
      id: editingChallenge?.id || Date.now(),
      isCustom: true
    };

    let updatedChallenges;
    if (editingChallenge) {
      // Update existing
      updatedChallenges = adminChallenges.map(c => 
        c.id === editingChallenge.id ? newChallenge : c
      );
    } else {
      // Add new
      updatedChallenges = [...adminChallenges, newChallenge];
    }

    setAdminChallenges(updatedChallenges);
    saveCustomChallenges(updatedChallenges);
    setShowChallengeForm(false);
    setEditingChallenge(null);
    resetChallengeForm();
    setAdminError('');
  };

  const deleteChallenge = (challengeId) => {
    const challenge = adminChallenges.find(c => c.id === challengeId);
    if (!challenge?.isCustom) {
      alert('Cannot delete default challenges. You can only edit or delete custom challenges.');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this challenge?')) return;
    
    const updatedChallenges = adminChallenges.filter(c => c.id !== challengeId);
    setAdminChallenges(updatedChallenges);
    saveCustomChallenges(updatedChallenges);
  };

  const duplicateChallenge = (challenge) => {
    const newChallenge = {
      ...challenge,
      id: Date.now(),
      topic: challenge.topic + ' (Copy)',
      isCustom: true,
      warmup: { ...challenge.warmup, options: [...(challenge.warmup?.options || [])] },
      core: { ...challenge.core },
      insight: { ...challenge.insight, options: [...(challenge.insight?.options || [])] }
    };
    
    const updatedChallenges = [...adminChallenges, newChallenge];
    setAdminChallenges(updatedChallenges);
    saveCustomChallenges(updatedChallenges);
  };

  const exportChallenges = () => {
    const blob = new Blob([JSON.stringify(adminChallenges, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sqlquest_challenges_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importChallenges = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (Array.isArray(imported)) {
          const newChallenges = imported.map(c => ({ ...c, id: Date.now() + Math.random(), isCustom: true }));
          const updatedChallenges = [...adminChallenges, ...newChallenges];
          setAdminChallenges(updatedChallenges);
          saveCustomChallenges(updatedChallenges);
          alert(`Imported ${newChallenges.length} challenges!`);
        }
      } catch (err) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const addToHistory = (sql, success, context) => {
    const entry = { sql, success, context, timestamp: Date.now() };
    setQueryHistory(prev => [...prev.slice(-49), entry]);
  };

  // AI Learning Lessons
  // Load lessons from external file (exercises.js)
  const aiLessons = window.aiLessonsData || [];

  const callAI = async (messages, systemPrompt) => {
    // If no API key, return null to use static content
    if (!apiKey || !useAI) {
      return null;
    }
    
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: messages
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("API error:", errorData);
        if (response.status === 401) {
          setApiKey('');
          setUseAI(false);
          localStorage.removeItem('sqlquest_api_key');
          return null; // Fall back to static
        }
        return null;
      }
      
      const data = await response.json();
      return data.content?.[0]?.text || null;
    } catch (err) {
      console.error("AI API error:", err);
      return null; // Fall back to static content
    }
  };

  // Save API key handler
  const saveApiKey = (key) => {
    if (key && key.startsWith('sk-ant-')) {
      setApiKey(key);
      setUseAI(true);
      localStorage.setItem('sqlquest_api_key', key);
      setShowApiKeyModal(false);
    } else if (key === '') {
      setApiKey('');
      setUseAI(false);
      localStorage.removeItem('sqlquest_api_key');
      setShowApiKeyModal(false);
    }
  };


  // Load pre-written lesson content from external file
  const lessonContent = window.lessonContentData || {};

  const getStaticResponse = (lessonId, phase, questionIndex = 0) => {
    const content = lessonContent[lessonId];
    if (!content) return "Let's continue learning!";
    
    if (phase === 'intro') return content.intro;
    if (phase === 'teaching') return content.teaching;
    if (phase === 'practice' && content.practice[questionIndex]) {
      const q = content.practice[questionIndex];
      return `QUESTION: ${q.question}\n\n[EXPECTED_SQL]${q.expected}[/EXPECTED_SQL]`;
    }
    if (phase === 'comprehension' && content.comprehension[questionIndex % 3]) {
      return `QUESTION: ${content.comprehension[questionIndex % 3]}`;
    }
    return "Great job! Let's continue.";
  };

  const getAISystemPrompt = (lesson, phase, context = {}) => {
    const tableInfo = lesson.practiceTable === 'passengers' 
      ? `Table: passengers (passenger_id, survived, pclass, name, sex, age, sibsp, parch, fare, embarked) - Titanic passenger data. survived: 0=died, 1=survived. pclass: 1=first, 2=second, 3=third class.`
      : lesson.practiceTable === 'movies'
      ? `Table: movies (id, title, year, genre, rating, votes, revenue_millions, runtime, director) - Top 100 movies with ratings and box office.`
      : lesson.practiceTable === 'employees'
      ? `Table: employees (emp_id, name, department, position, salary, hire_date, manager_id, performance_rating) - 50 company employees.`
      : `Table: orders (order_id, customer_id, product, category, quantity, price, order_date, country) and customers (customer_id, name, email, join_date, membership, total_orders)`;

    const askedQuestionsInfo = context.askedQuestions && context.askedQuestions.length > 0 
      ? `\n\nPREVIOUSLY ASKED (DO NOT REPEAT THESE):\n${context.askedQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      : '';
    
    const hintLevelInfo = context.hintLevel > 0 
      ? `\nHINT LEVEL: ${context.hintLevel} (1=small hint, 2=detailed example, 3=show full answer)`
      : '';

    const userAnswerInfo = context.userAnswer 
      ? `\nSTUDENT'S ANSWER: "${context.userAnswer}"`
      : '';

    const expectedQueryInfo = context.expectedQuery 
      ? `\nCORRECT ANSWER: ${context.expectedQuery}`
      : '';

    return `You are an EXPERT SQL tutor with years of teaching experience. You are patient, encouraging, and excellent at explaining concepts.

Lesson: "${lesson.title}" - ${lesson.topic}
Concepts: ${lesson.concepts.join(", ")}
${tableInfo}
${askedQuestionsInfo}
${hintLevelInfo}
${userAnswerInfo}
${expectedQueryInfo}

IMPORTANT RULES:
1. NO markdown formatting (no **, no ##, no backticks for code)
2. Use CAPS for SQL keywords and emphasis
3. Keep responses concise but helpful
4. Be encouraging - celebrate small wins
5. NEVER repeat a question you've already asked

Phase: ${phase}

${phase === 'intro' ? `
INTRO PHASE:
- Welcome the student warmly
- Briefly explain what they'll learn (1-2 sentences)
- Mention a real-world use case
- Ask if they're ready to start
Keep it friendly and under 60 words.` : ''}

${phase === 'teaching' ? `
TEACHING PHASE:
- Explain the concept clearly with a simple analogy
- Show ONE practical example with the actual table
- Walk through what each part does
- End by asking if they want to try a practice question
Keep it under 100 words. Make the example relevant and interesting.` : ''}

${phase === 'practice' ? `
PRACTICE PHASE - CRITICAL INSTRUCTIONS:

1. Create a NEW, UNIQUE question that tests: ${lesson.concepts.join(" or ")}
2. Make it progressively harder based on question count (current: ${context.questionCount || 0})
3. DO NOT ask any question similar to previously asked ones

MANDATORY FORMAT - Your response MUST include:
[EXPECTED_SQL]your_correct_query_here[/EXPECTED_SQL]

Question Variety Examples:
- Count queries: "How many X where Y?"
- Aggregation: "What is the average/sum/max/min of X?"
- Filtering: "Find all X where Y and Z"
- Grouping: "Show X grouped by Y"
- Sorting: "List top N by X"
- Combined: "Find the average X for each Y where Z"

Start with "QUESTION:" then ask your question.
Remember: The [EXPECTED_SQL] tag is REQUIRED!` : ''}

${phase === 'feedback' ? `
FEEDBACK PHASE - ANALYZING STUDENT'S ANSWER:

Analyze the student's SQL answer carefully:
${userAnswerInfo}
${expectedQueryInfo}

RESPONSE STRATEGY:
1. If CORRECT or functionally equivalent:
   - Start with "Correct!" or "Great job!" or "Well done!"
   - Briefly explain WHY it works
   - Mention any alternative approaches

2. If PARTIALLY CORRECT (has some right elements):
   - Start with "Almost there!" or "Good start!"
   - Point out what they got RIGHT first
   - Identify the SPECIFIC issue
   - Give a CONCRETE EXAMPLE showing the fix
   - Example: "You have the SELECT right, but for counting we need COUNT(*). Like this: SELECT COUNT(*) FROM passengers"

3. If INCORRECT:
   - Start with "Not quite, but let's work through this!"
   - Break down what they tried to do
   - Explain the concept they're missing with an EXAMPLE
   - Show a simpler version first, then build up
   - Example: "I see you tried X. The issue is Y. Let me show you: [simple example]. Now for your question: [applied example]"

4. If SYNTAX ERROR:
   - Be specific about the error
   - Show the correct syntax with an example
   - Common fixes: missing quotes, wrong keyword, missing FROM, etc.

ALWAYS provide educational value - don't just say wrong, TEACH!
End by asking if they want another question or need more explanation.
Keep under 120 words but be thorough on explanations.` : ''}

${phase === 'comprehension' ? `
COMPREHENSION PHASE:
Ask a conceptual question about: ${lesson.concepts.join(", ")}
- Ask them to explain IN THEIR OWN WORDS
- No code needed - test understanding
- Examples: "Why would you use X instead of Y?", "When would X be useful?", "What happens if you forget X?"
Keep the question clear and under 40 words.` : ''}

${phase === 'comprehension_feedback' ? `
COMPREHENSION FEEDBACK:
${userAnswerInfo}

RESPONSE STRATEGY:
1. If they explained well (shows understanding):
   - Say "That's right!" or "Exactly!"
   - Add a small insight they might not have mentioned

2. If PARTIAL understanding:
   - Acknowledge what's correct
   - Fill in the gaps with a clear example
   - "You're on the right track! You mentioned X which is correct. Let me add: [explanation with example]"

3. If they're confused:
   - Don't criticize
   - Use an analogy from everyday life
   - Give a concrete example
   - "Think of it like [analogy]. For example, [concrete SQL example showing the concept]"

Keep under 80 words but ensure they understand.` : ''}`;
  };

  const startAiLesson = async (lessonIndex, isRestart = false) => {
    const lesson = aiLessons[lessonIndex];
    setCurrentAiLesson(lessonIndex);
    setAiLessonPhase('intro');
    setAiMessages([]);
    setAiQuestionCount(0);
    setAiCorrectCount(0);
    setConsecutiveCorrect(0);
    setAiExpectedQuery('');
    setAiExpectedResult({ columns: [], rows: [] });
    setExpectedResultMessageId(-1);
    setAiUserResult({ columns: [], rows: [], error: null });
    setShowAiComparison(false);
    setSandboxQuery('');
    setSandboxResult({ columns: [], rows: [], error: null });
    setComprehensionCount(0);
    setComprehensionCorrect(0);
    setComprehensionConsecutive(0);
    setAskedQuestions([]); // Reset asked questions for new lesson
    setCurrentHintLevel(0); // Reset hint level
    // Reset exercise state
    setExerciseIndex(0);
    setExerciseCorrect(0);
    setExerciseAttempted(false);
    if (isRestart) {
      setLessonAttempts(prev => prev + 1);
    } else {
      setLessonAttempts(0);
    }
    setQuery('');
    setResults({ columns: [], rows: [], error: null });
    setAiLoading(true);

    // Load the appropriate dataset
    if (db) {
      if (lesson.practiceTable === 'passengers') loadDataset(db, 'titanic');
      else if (lesson.practiceTable === 'movies') loadDataset(db, 'movies');
      else if (lesson.practiceTable === 'employees') loadDataset(db, 'employees');
      else loadDataset(db, 'ecommerce');
    }

    // Try real AI first, fall back to static content
    let response = await callAI(
      [{ role: "user", content: "Start the lesson please!" }],
      getAISystemPrompt(lesson, 'intro', {})
    );
    
    // Fall back to static if AI not available
    if (!response) {
      response = getStaticResponse(lesson.id, 'intro');
    }
    
    setAiMessages([{ role: "assistant", content: response }]);
    setAiLoading(false);
  };

  // Helper to send a quick message directly (for buttons)
  const sendQuickMessage = async (message, targetPhase) => {
    if (aiLoading) return;
    
    // IMMEDIATELY clear expected result when getting a new practice question
    if (targetPhase === 'practice') {
      setAiExpectedResult({ columns: [], rows: [] });
      setAiExpectedQuery('');
      setExpectedResultMessageId(-1);
      setAiUserResult({ columns: [], rows: [], error: null });
      setResults({ columns: [], rows: [], error: null });
      setQuery('');
      setShowAiComparison(false);
      setCurrentHintLevel(0); // Reset hint level for new question
    }
    
    setAiMessages(prev => [...prev, { role: "user", content: message }]);
    setAiLoading(true);
    setAiInput('');

    const lesson = aiLessons[currentAiLesson];
    
    // Reset streak when starting a new section
    if (targetPhase === 'practice' && aiLessonPhase === 'teaching') {
      setConsecutiveCorrect(0);
    } else if (targetPhase === 'comprehension' && aiLessonPhase === 'feedback') {
      setComprehensionConsecutive(0);
    }
    
    setAiLessonPhase(targetPhase);

    // Build context for AI
    const context = {
      askedQuestions,
      questionCount: aiQuestionCount,
      hintLevel: currentHintLevel
    };

    // Try real AI first
    const conversationHistory = [
      ...aiMessages.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: message }
    ];
    
    let response = await callAI(conversationHistory, getAISystemPrompt(lesson, targetPhase, context));
    
    // Fall back to static content if AI not available
    if (!response) {
      const questionIdx = targetPhase === 'practice' ? aiQuestionCount % 3 : comprehensionCount % 3;
      response = getStaticResponse(lesson.id, targetPhase, questionIdx);
    }

    // Check for expected SQL and update expected result
    const sqlMatch = (response || '').match(/\[EXPECTED_SQL\]([\s\S]*?)\[\/EXPECTED_SQL\]/);
    if (sqlMatch && sqlMatch[1] && db) {
      const expectedSql = sqlMatch[1].trim();
      setAiExpectedQuery(expectedSql);
      try {
        const result = db.exec(expectedSql);
        if (result.length > 0) {
          setAiExpectedResult({ columns: result[0].columns, rows: result[0].values });
          setExpectedResultMessageId(aiMessages.length + 1);
        }
      } catch (err) {
        console.error('Error running expected SQL:', err);
        setExpectedResultMessageId(-1);
      }
      
      // Track the question to avoid repetition
      const questionMatch = (response || '').match(/QUESTION:\s*(.+?)(?:\n|$)/i);
      if (questionMatch && questionMatch[1]) {
        setAskedQuestions(prev => [...prev, questionMatch[1].trim()]);
      }
    } else {
      setExpectedResultMessageId(-1);
    }

    const cleanResponse = (response || '').replace(/\[EXPECTED_SQL\][\s\S]*?\[\/EXPECTED_SQL\]/g, '').trim();
    
    setAiMessages(prev => [...prev, { role: "assistant", content: cleanResponse }]);
    setAiLoading(false);
  };

  const sendAiMessage = async () => {
    if (!aiInput.trim() || aiLoading) return;
    
    const userMessage = aiInput.trim();
    setAiInput('');
    setAiMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setAiLoading(true);
    setShowAiComparison(false);

    const lesson = aiLessons[currentAiLesson];
    let newPhase = aiLessonPhase;

    // Determine phase transitions based on user input
    const lowerInput = userMessage.toLowerCase();
    if (aiLessonPhase === 'intro' && (lowerInput.includes('yes') || lowerInput.includes('ready') || lowerInput.includes('start') || lowerInput.includes('let\'s go'))) {
      newPhase = 'teaching';
    } else if (aiLessonPhase === 'teaching' && (lowerInput.includes('practice') || lowerInput.includes('ready') || lowerInput.includes('try') || lowerInput.includes('question'))) {
      newPhase = 'practice';
      setConsecutiveCorrect(0);
      setCurrentHintLevel(0);
    } else if (aiLessonPhase === 'practice') {
      newPhase = 'feedback';
      setAiQuestionCount(prev => prev + 1);
    } else if (aiLessonPhase === 'feedback') {
      // Check if user is asking for hint or more help
      if (lowerInput.includes('hint') || lowerInput.includes('help') || lowerInput.includes('stuck')) {
        newPhase = 'feedback'; // Stay in feedback to give more help
        setCurrentHintLevel(prev => Math.min(prev + 1, 3));
      } else if (consecutiveCorrect >= 3) {
        newPhase = 'comprehension';
        setComprehensionConsecutive(0);
        setAiExpectedResult({ columns: [], rows: [] });
        setAiExpectedQuery('');
        setCurrentHintLevel(0);
      } else {
        newPhase = 'practice';
        setCurrentHintLevel(0);
      }
    } else if (aiLessonPhase === 'comprehension') {
      newPhase = 'comprehension_feedback';
      setComprehensionCount(prev => prev + 1);
    } else if (aiLessonPhase === 'comprehension_feedback') {
      if (comprehensionConsecutive >= 3) {
        newPhase = 'comprehension_feedback';
      } else {
        newPhase = 'comprehension';
      }
    }

    setAiLessonPhase(newPhase);

    // Clear old expected result when transitioning to practice phase
    if (newPhase === 'practice' && aiLessonPhase !== 'practice') {
      setAiExpectedResult({ columns: [], rows: [] });
      setAiExpectedQuery('');
      setExpectedResultMessageId(-1);
      setAiUserResult({ columns: [], rows: [], error: null });
      setResults({ columns: [], rows: [], error: null });
      setQuery('');
      setShowAiComparison(false);
    }

    // Build context for smarter AI responses
    const context = {
      askedQuestions,
      questionCount: aiQuestionCount,
      hintLevel: currentHintLevel,
      userAnswer: (newPhase === 'feedback' || newPhase === 'comprehension_feedback') ? userMessage : null,
      expectedQuery: aiExpectedQuery
    };

    // Try real AI first
    const conversationHistory = [
      ...aiMessages.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: userMessage }
    ];
    
    let response = await callAI(conversationHistory, getAISystemPrompt(lesson, newPhase, context));
    
    // Fall back to static content if AI not available
    if (!response) {
      const questionIdx = newPhase === 'practice' ? aiQuestionCount % 3 : comprehensionCount % 3;
      
      if (newPhase === 'feedback') {
        // Smart comparison of user SQL vs expected
        const userSql = (userMessage || '').toLowerCase().replace(/\s+/g, ' ').trim();
        const expectedSql = (aiExpectedQuery || '').toLowerCase().replace(/\s+/g, ' ').trim();
        
        // Check for exact match or close match
        const isExactMatch = expectedSql && userSql === expectedSql;
        
        // Check for partial correctness (has some key elements)
        const hasSelect = userSql.includes('select');
        const hasFrom = userSql.includes('from');
        const hasCorrectTable = expectedSql && userSql.includes(expectedSql.match(/from\s+(\w+)/)?.[1] || '');
        const hasGroupBy = expectedSql.includes('group by') ? userSql.includes('group by') : true;
        const hasOrderBy = expectedSql.includes('order by') ? userSql.includes('order by') : true;
        const hasCount = expectedSql.includes('count') ? userSql.includes('count') : true;
        
        const partialScore = [hasSelect, hasFrom, hasCorrectTable, hasGroupBy, hasOrderBy, hasCount].filter(Boolean).length;
        
        if (isExactMatch) {
          response = "Correct! Excellent work! You nailed it. Ready for the next question?";
          setAiCorrectCount(prev => prev + 1);
          setConsecutiveCorrect(prev => prev + 1);
        } else if (partialScore >= 5) {
          // Very close - minor issue
          response = `Almost there! Your query structure is good. The issue might be a small detail.\n\nYour answer: ${userMessage}\nExpected: ${aiExpectedQuery}\n\nCompare them carefully - often it's just a column name or condition. Want to try again or see the next question?`;
          setConsecutiveCorrect(0);
        } else if (partialScore >= 3) {
          // Partially correct - explain what's missing
          const missing = [];
          if (!hasGroupBy && expectedSql.includes('group by')) missing.push('GROUP BY clause');
          if (!hasCount && expectedSql.includes('count')) missing.push('COUNT() function');
          if (!hasOrderBy && expectedSql.includes('order by')) missing.push('ORDER BY clause');
          
          response = `Good start! You have the basic structure right.\n\nWhat's missing: ${missing.join(', ') || 'some details'}\n\nExample: If you want to count items per category, you need:\nSELECT category, COUNT(*) FROM table GROUP BY category\n\nThe correct answer was:\n${aiExpectedQuery}\n\nLet's try another one!`;
          setConsecutiveCorrect(0);
        } else {
          // Needs more help
          response = `Not quite, but don't worry - this is how we learn!\n\nLet me break it down:\n1. SELECT - choose what columns to show\n2. FROM - specify the table\n3. WHERE - filter rows (optional)\n4. GROUP BY - group for aggregations (optional)\n\nThe correct answer was:\n${aiExpectedQuery || 'SELECT * FROM passengers LIMIT 3'}\n\nWant a hint for the next question? Just ask!`;
          setConsecutiveCorrect(0);
        }
      } else if (newPhase === 'comprehension_feedback') {
        const answerLength = (userMessage || '').length;
        const hasKeywords = lesson.concepts.some(c => userMessage.toLowerCase().includes(c.toLowerCase().split(' ')[0]));
        
        if (answerLength > 50 && hasKeywords) {
          response = "That's right! Excellent explanation. You clearly understand the concept.";
          setComprehensionCorrect(prev => prev + 1);
          setComprehensionConsecutive(prev => prev + 1);
        } else if (answerLength > 20) {
          response = `You're on the right track! Let me add some detail:\n\n${lesson.concepts[0]} is used when you want to ${lesson.topic.toLowerCase()}.\n\nFor example, if you want to count how many items are in each category, you'd use GROUP BY to organize the data first, then COUNT to tally each group.\n\nDoes that help clarify?`;
          setComprehensionConsecutive(0);
        } else {
          response = `Could you explain a bit more? Try to describe:\n- WHAT the concept does\n- WHEN you would use it\n- WHY it's useful\n\nThink of a real example where you'd need ${lesson.concepts[0]}.`;
          setComprehensionConsecutive(0);
        }
      } else {
        response = getStaticResponse(lesson.id, newPhase, questionIdx);
      }
    } else {
      // AI responded - check for correct/incorrect feedback
      if (newPhase === 'feedback' || aiLessonPhase === 'practice') {
        const respLower = response.toLowerCase();
        if (respLower.includes('correct') || respLower.includes('great job') || respLower.includes('well done') || respLower.includes('perfect') || respLower.includes('excellent')) {
          setAiCorrectCount(prev => prev + 1);
          setConsecutiveCorrect(prev => prev + 1);
        } else if (respLower.includes('not quite') || respLower.includes('incorrect') || respLower.includes('try again') || respLower.includes('almost')) {
          setConsecutiveCorrect(0);
        }
      }
      if (newPhase === 'comprehension_feedback' || aiLessonPhase === 'comprehension') {
        const respLower = response.toLowerCase();
        if (respLower.includes("that's right") || respLower.includes("correct") || respLower.includes("well explained") || respLower.includes("exactly") || respLower.includes("excellent")) {
          setComprehensionCorrect(prev => prev + 1);
          setComprehensionConsecutive(prev => prev + 1);
        } else if (respLower.includes('not quite') || respLower.includes('incorrect') || respLower.includes('more detail')) {
          setComprehensionConsecutive(0);
        }
      }
    }

    // Check for expected SQL in response and update expected result
    const sqlMatch = (response || '').match(/\[EXPECTED_SQL\]([\s\S]*?)\[\/EXPECTED_SQL\]/);
    if (sqlMatch && sqlMatch[1] && db) {
      const expectedSql = sqlMatch[1].trim();
      setAiExpectedQuery(expectedSql);
      try {
        const result = db.exec(expectedSql);
        if (result.length > 0) {
          setAiExpectedResult({ columns: result[0].columns, rows: result[0].values });
          setExpectedResultMessageId(aiMessages.length + 1);
        } else {
          setAiExpectedResult({ columns: [], rows: [] });
          setExpectedResultMessageId(-1);
        }
      } catch (err) {
        console.error('Error running expected SQL:', err);
        setAiExpectedResult({ columns: [], rows: [] });
        setExpectedResultMessageId(-1);
      }
      setAiUserResult({ columns: [], rows: [], error: null });
      setShowAiComparison(false);
      setQuery('');
      
      // Track the question to avoid repetition
      const questionMatch = (response || '').match(/QUESTION:\s*(.+?)(?:\n|$)/i);
      if (questionMatch && questionMatch[1]) {
        setAskedQuestions(prev => [...prev, questionMatch[1].trim()]);
      }
    } else if (newPhase === 'comprehension') {
      setAiExpectedResult({ columns: [], rows: [] });
      setAiExpectedQuery('');
      setExpectedResultMessageId(-1);
    } else {
      setExpectedResultMessageId(-1);
    }

    const cleanResponse = (response || '').replace(/\[EXPECTED_SQL\][\s\S]*?\[\/EXPECTED_SQL\]/g, '').trim();

    setTimeout(() => {
      setAiMessages(prev => [...prev, { role: "assistant", content: cleanResponse || 'Let me help you with that!' }]);
      setAiLoading(false);
    }, 300);
  };

  const runAiQuery = () => {
    if (!query.trim() || !db) return;
    
    try {
      const result = db.exec(query);
      const userResult = result.length > 0 
        ? { columns: result[0].columns, rows: result[0].values, error: null }
        : { columns: [], rows: [], error: null };
      
      setAiUserResult(userResult);
      setResults(userResult);
      setShowAiComparison(true);
      addToHistory(query, true, 'ai-learning');
    } catch (err) {
      setResults({ columns: [], rows: [], error: err.message });
      setAiUserResult({ columns: [], rows: [], error: err.message });
      setShowAiComparison(true);
      addToHistory(query, false, 'ai-learning');
    }
  };

  const runSandboxQuery = () => {
    if (!sandboxQuery.trim() || !db) return;
    
    try {
      const result = db.exec(sandboxQuery);
      const queryResult = result.length > 0 
        ? { columns: result[0].columns, rows: result[0].values, error: null }
        : { columns: [], rows: [], error: null };
      
      setSandboxResult(queryResult);
      addToHistory(sandboxQuery, true, 'ai-sandbox');
    } catch (err) {
      setSandboxResult({ columns: [], rows: [], error: err.message });
      addToHistory(sandboxQuery, false, 'ai-sandbox');
    }
  };

  const copySandboxToAnswer = () => {
    setQuery(sandboxQuery);
  };

  const submitAiQuery = async () => {
    if (!query.trim() || !db) return;
    
    try {
      const result = db.exec(query);
      const userResult = result.length > 0 
        ? { columns: result[0].columns, rows: result[0].values, error: null }
        : { columns: [], rows: [], error: null };
      
      setAiUserResult(userResult);
      setResults(userResult);
      setShowAiComparison(true);
      
      // Only compare if we have expected results
      const hasExpected = aiExpectedResult.rows.length > 0;
      const isCorrect = hasExpected && 
        JSON.stringify(userResult.rows) === JSON.stringify(aiExpectedResult.rows);
      
      const output = result.length > 0 
        ? `Query executed successfully! Returned ${result[0].values.length} rows.\nColumns: ${result[0].columns.join(', ')}\nFirst few rows:\n${result[0].values.slice(0, 3).map(r => r.join(', ')).join('\n')}`
        : 'Query executed but returned no results.';
      
      // Don't bias AI negatively if we don't have expected results
      let evalMessage = `I wrote this SQL query:\n\`\`\`sql\n${query}\n\`\`\`\n\nResult: ${output}`;
      if (hasExpected && isCorrect) {
        evalMessage += `\n\nThe results MATCH the expected output - this is CORRECT!`;
      } else if (hasExpected) {
        evalMessage += `\n\nThe results do NOT match expected output.`;
      } else {
        evalMessage += `\n\nPlease evaluate if this query correctly answers the question.`;
      }
      
      setAiInput('');
      setAiMessages(prev => [...prev, { role: "user", content: evalMessage }]);
      setAiLoading(true);
      setAiLessonPhase('feedback');
      setAiQuestionCount(prev => prev + 1);

      const lesson = aiLessons[currentAiLesson];
      
      // Build context for smarter feedback
      const context = {
        askedQuestions,
        questionCount: aiQuestionCount,
        hintLevel: currentHintLevel,
        userAnswer: query,
        expectedQuery: aiExpectedQuery
      };
      
      const conversationHistory = [
        ...aiMessages.map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: evalMessage }
      ];

      const response = await callAI(
        conversationHistory,
        getAISystemPrompt(lesson, 'feedback', context)
      );

      // Handle AI response or fall back to static
      let feedbackResponse = response;
      if (!feedbackResponse) {
        // Smart static fallback with detailed feedback
        if (isCorrect) {
          feedbackResponse = "Correct! Excellent work! Your query returned exactly the expected results. Ready for the next question?";
        } else if (hasExpected) {
          // Analyze what went wrong
          const userCols = userResult.columns || [];
          const expectedCols = aiExpectedResult.columns || [];
          const colMatch = JSON.stringify(userCols) === JSON.stringify(expectedCols);
          const rowCountMatch = userResult.rows.length === aiExpectedResult.rows.length;
          
          if (!colMatch) {
            feedbackResponse = `Almost there! Your query runs, but the columns don't quite match.\n\nYour columns: ${userCols.join(', ')}\nExpected: ${expectedCols.join(', ')}\n\nHint: Check your SELECT clause - are you selecting the right columns?\n\nThe expected query was:\n${aiExpectedQuery}`;
          } else if (!rowCountMatch) {
            feedbackResponse = `Good structure! But your query returned ${userResult.rows.length} rows instead of ${aiExpectedResult.rows.length}.\n\nHint: Check your WHERE clause or GROUP BY - you might be filtering too much or too little.\n\nThe expected query was:\n${aiExpectedQuery}`;
          } else {
            feedbackResponse = `So close! Your query structure looks right, but the values don't match.\n\nHint: Double-check the column names and any conditions in your WHERE clause.\n\nThe expected query was:\n${aiExpectedQuery}`;
          }
        } else {
          feedbackResponse = "Your query executed successfully! Let's move on to the next question.";
        }
      }

      // Track consecutive correct
      const respLower = (feedbackResponse || '').toLowerCase();
      if (isCorrect || respLower.includes('correct') || respLower.includes('great job') || respLower.includes('well done') || respLower.includes('perfect') || respLower.includes("that's right") || respLower.includes('excellent')) {
        setAiCorrectCount(prev => prev + 1);
        setConsecutiveCorrect(prev => prev + 1);
      } else if (respLower.includes('not quite') || respLower.includes('incorrect') || respLower.includes('not correct') || respLower.includes('almost')) {
        setConsecutiveCorrect(0);
      }

      setAiMessages(prev => [...prev, { role: "assistant", content: feedbackResponse }]);
      setAiLoading(false);
      addToHistory(query, true, 'ai-learning');
    } catch (err) {
      setResults({ columns: [], rows: [], error: err.message });
      setAiUserResult({ columns: [], rows: [], error: err.message });
      setShowAiComparison(true);
      setConsecutiveCorrect(0); // Reset streak on error
      
      // Send error to AI with helpful context
      const errorMessage = `I tried this query but got an error:\n\`\`\`sql\n${query}\n\`\`\`\nError: ${err.message}`;
      setAiMessages(prev => [...prev, { role: "user", content: errorMessage }]);
      setAiLoading(true);

      const lesson = aiLessons[currentAiLesson];
      
      // Build context for error help
      const context = {
        askedQuestions,
        questionCount: aiQuestionCount,
        hintLevel: currentHintLevel + 1, // Increase hint level on error
        userAnswer: query,
        expectedQuery: aiExpectedQuery
      };
      
      const conversationHistory = [
        ...aiMessages.map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: errorMessage }
      ];

      const response = await callAI(
        conversationHistory,
        getAISystemPrompt(lesson, 'feedback', context) + "\n\nIMPORTANT: The student's query had a SYNTAX ERROR. Help them understand what went wrong with a specific example of how to fix it."
      );

      // Detailed static error feedback
      let errorResponse = response;
      if (!errorResponse) {
        const errLower = err.message.toLowerCase();
        if (errLower.includes('no such column')) {
          const colMatch = err.message.match(/no such column: (\w+)/i);
          errorResponse = `Column not found! The column "${colMatch?.[1] || 'specified'}" doesn't exist in this table.\n\nAvailable columns: Check the table schema on the right.\n\nExample fix: If you typed "name" but the column is "passenger_name", change it to:\nSELECT passenger_name FROM table_name`;
        } else if (errLower.includes('no such table')) {
          errorResponse = `Table not found! Make sure you're using the correct table name.\n\nFor this lesson, use: ${lesson.practiceTable}\n\nExample:\nSELECT * FROM ${lesson.practiceTable} LIMIT 5`;
        } else if (errLower.includes('syntax error')) {
          errorResponse = `Syntax error detected. Common causes:\n\n1. Missing comma between columns: SELECT col1 col2 → SELECT col1, col2\n2. Missing FROM keyword: SELECT * table → SELECT * FROM table\n3. Typo in keywords: SELEC → SELECT\n\nYour query: ${query}\n\nTry fixing the syntax and submit again!`;
        } else {
          errorResponse = `There's an error in your query: "${err.message}"\n\nLet me help:\n1. Check spelling of table and column names\n2. Make sure you have SELECT, FROM in the right order\n3. Check for missing commas or quotes\n\nThe expected structure was:\n${aiExpectedQuery || 'SELECT columns FROM table WHERE condition'}`;
        }
      }
      
      setAiMessages(prev => [...prev, { role: "assistant", content: errorResponse }]);
      setAiLoading(false);
      addToHistory(query, false, 'ai-learning');
    }
  };

  // Submit exercise answer
  const submitExercise = () => {
    if (!query.trim() || !db) return;
    
    const lesson = aiLessons[currentAiLesson];
    const currentExercise = lesson.exercises[exerciseIndex];
    
    try {
      // Run user's query
      const userResult = db.exec(query);
      const userValues = userResult.length > 0 ? JSON.stringify(userResult[0].values) : '[]';
      
      // Run expected query
      const expectedResult = db.exec(currentExercise.sql);
      const expectedValues = expectedResult.length > 0 ? JSON.stringify(expectedResult[0].values) : '[]';
      
      // Compare results
      const isCorrect = userValues === expectedValues;
      
      setAiUserResult(userResult.length > 0 
        ? { columns: userResult[0].columns, rows: userResult[0].values, error: null }
        : { columns: [], rows: [], error: null });
      setResults(userResult.length > 0 
        ? { columns: userResult[0].columns, rows: userResult[0].values, error: null }
        : { columns: [], rows: [], error: null });
      setShowAiComparison(true);
      setExerciseAttempted(true);
      
      if (isCorrect) {
        const newCorrect = exerciseCorrect + 1;
        setExerciseCorrect(newCorrect);
        addToHistory(query, true, 'ai-exercise');
        
        // Check if all exercises complete
        if (exerciseIndex >= 4) {
          // All 5 exercises done!
          setXP(prev => prev + 100);
          setCompletedAiLessons(prev => new Set([...prev, lesson.id]));
          addToHistory(`Completed AI Lesson: ${lesson.title}`, true, 'ai-learning');
          setAiLessonPhase('complete');
          
          // Add congratulation message
          setAiMessages(prev => [...prev, { 
            role: "assistant", 
            content: `🎉 CONGRATULATIONS! You've completed all 5 exercises perfectly!\n\nYou've mastered "${lesson.title}" and earned 100 XP!\n\n${currentAiLesson < aiLessons.length - 1 ? "Ready for the next lesson? Click 'Next Lesson' to continue your SQL journey!" : "Amazing! You've completed all lessons in SQL Quest!"}`
          }]);
        } else {
          // Move to next exercise
          setExerciseIndex(prev => prev + 1);
          setExerciseAttempted(false);
          setQuery('');
          setAiUserResult({ columns: [], rows: [], error: null });
          setResults({ columns: [], rows: [], error: null });
          setShowAiComparison(false);
        }
      } else {
        addToHistory(query, false, 'ai-exercise');
      }
    } catch (err) {
      setResults({ columns: [], rows: [], error: err.message });
      setAiUserResult({ columns: [], rows: [], error: err.message });
      setShowAiComparison(true);
      addToHistory(query, false, 'ai-exercise');
    }
  };

  useEffect(() => {
    const initSQL = async () => {
      try {
        console.log('Initializing SQL.js...');
        const SQL = await window.initSqlJs({ locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${f}` });
        console.log('SQL.js loaded, creating database...');
        const database = new SQL.Database();
        setDb(database);
        loadDataset(database, 'titanic');
        console.log('Database ready!');
        setDbReady(true);
      } catch (err) { 
        console.error('SQL.js init failed:', err); 
        // Still show the app even if DB fails
        setDbReady(true);
      }
    };
    
    // Check if script already loaded
    if (window.initSqlJs) {
      initSQL();
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js';
    script.onload = () => {
      console.log('sql-wasm.js loaded');
      initSQL();
    };
    script.onerror = (err) => {
      console.error('Failed to load sql-wasm.js:', err);
      setDbReady(true); // Show app anyway
    };
    document.head.appendChild(script);
    return () => { if (document.head.contains(script)) document.head.removeChild(script); };
  }, []);

  const loadDataset = (database, key) => {
    if (!database || !publicDatasets[key]) return;
    Object.entries(publicDatasets[key].tables).forEach(([tableName, tableData]) => {
      try {
        database.run(`DROP TABLE IF EXISTS ${tableName}`);
        const colTypes = tableData.columns.map((_, i) => {
          const sample = tableData.data[0]?.[i];
          return typeof sample === 'number' ? (Number.isInteger(sample) ? 'INTEGER' : 'REAL') : 'TEXT';
        });
        database.run(`CREATE TABLE ${tableName} (${tableData.columns.map((c, i) => `${c} ${colTypes[i]}`).join(', ')})`);
        const ph = tableData.columns.map(() => '?').join(', ');
        tableData.data.forEach(row => database.run(`INSERT INTO ${tableName} VALUES (${ph})`, row));
      } catch (err) { console.error(`Table ${tableName} error:`, err); }
    });
  };

  const selectDataset = (key) => {
    setCurrentDataset(key);
    if (db) {
      loadDataset(db, key);
      const newUsed = new Set([...datasetsUsed, key]);
      setDatasetsUsed(newUsed);
      if (newUsed.size >= 3 && !unlockedAchievements.has('data_explorer')) unlockAchievement('data_explorer');
    }
    setQuery(''); setResults({ columns: [], rows: [], error: null });
  };

  const unlockAchievement = (id) => {
    if (unlockedAchievements.has(id)) return;
    const ach = achievements.find(a => a.id === id);
    if (ach) { setUnlockedAchievements(prev => new Set([...prev, id])); setXP(prev => prev + ach.xp); setShowAchievement(ach); }
  };

  const runQuery = (customQuery, context = 'practice') => {
    const q = customQuery || query;
    if (!db || !q.trim()) return null;
    try {
      const result = db.exec(q);
      setResults(result.length ? { columns: result[0].columns, rows: result[0].values, error: null } : { columns: [], rows: [], error: null });
      const newCount = queryCount + 1; setQueryCount(newCount);
      if (!unlockedAchievements.has('first_query')) unlockAchievement('first_query');
      if (newCount >= 50 && !unlockedAchievements.has('query_50')) unlockAchievement('query_50');
      if (q.toLowerCase().includes('group by') && q.toLowerCase().includes('having') && !unlockedAchievements.has('analyst')) unlockAchievement('analyst');
      addToHistory(q, true, context);
      return { success: true, result };
    } catch (err) { 
      setResults({ columns: [], rows: [], error: err.message }); 
      addToHistory(q, false, context);
      return { success: false, error: err.message }; 
    }
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !db) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const lines = ev.target.result.split('\n').filter(l => l.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase());
        const data = lines.slice(1).map(line => { const vals = []; let cur = '', inQ = false; for (const c of line) { if (c === '"') inQ = !inQ; else if (c === ',' && !inQ) { vals.push(cur.trim()); cur = ''; } else cur += c; } vals.push(cur.trim()); return vals; });
        const tableName = file.name.replace(/\.csv$/i, '').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
        db.run(`DROP TABLE IF EXISTS ${tableName}`);
        db.run(`CREATE TABLE ${tableName} (${headers.map(h => `${h} TEXT`).join(', ')})`);
        const ph = headers.map(() => '?').join(', ');
        data.forEach(row => { if (row.length === headers.length) db.run(`INSERT INTO ${tableName} VALUES (${ph})`, row); });
        setCustomTables(prev => ({ ...prev, [tableName]: { columns: headers, rowCount: data.length } }));
        setQuery(`SELECT * FROM ${tableName} LIMIT 10`);
        if (!unlockedAchievements.has('csv_master')) unlockAchievement('csv_master');
        alert(`✅ Uploaded "${tableName}" with ${data.length} rows!`);
      } catch (err) { alert('CSV Error: ' + err.message); }
    };
    reader.readAsText(file);
  };

  // Daily Challenge functions
  const activeDailyDifficulty = selectedDailyDifficulty || recommendedDifficulty;
  const todaysChallenge = getTodaysChallenge(activeDailyDifficulty);
  const todayString = getTodayString();
  const isDailyCompleted = completedDailyChallenges[todayString] === true;
  const timeUntilReset = getTimeUntilReset();
  
  const openDailyChallenge = () => {
    const savedProgress = loadDailyProgress();
    const difficultyToUse = savedProgress?.difficulty || activeDailyDifficulty;
    const challenge = getTodaysChallenge(difficultyToUse);
    if (!challenge || !db) return;
    setShowDailyChallenge(true);
    
    if (isDailyCompleted) {
      // Already completed - show completion screen
      setDailyStep(3);
      setShowDifficultySelector(false);
    } else if (savedProgress) {
      // Restore saved progress
      setSelectedDailyDifficulty(savedProgress.difficulty);
      setDailyStep(savedProgress.step);
      setDailyChallengeQuery(savedProgress.query || '');
      setDailyTimer(savedProgress.timer || 0);
      setDailyTimerActive(savedProgress.step === 1); // Resume timer if on SQL challenge step
      setDailyHintUsed(savedProgress.hintUsed || false);
      setDailyAnswerShown(savedProgress.answerShown || false);
      setWarmupAnswer(savedProgress.warmupAnswer);
      setWarmupResult(savedProgress.warmupResult);
      setInsightAnswer(savedProgress.insightAnswer);
      setInsightResult(savedProgress.insightResult);
      setCoreCompleted(savedProgress.coreCompleted || false);
      setShowDifficultySelector(savedProgress.step === 0); // Show selector only on warmup step
      setDailyChallengeResult({ columns: [], rows: [], error: null });
      setDailyChallengeStatus(null);
      setDailySolveTime(null);
    } else {
      // Fresh start
      setDailyChallengeQuery('');
      setDailyChallengeResult({ columns: [], rows: [], error: null });
      setDailyChallengeStatus(null);
      setDailyStep(0);
      setWarmupAnswer(null);
      setWarmupResult(null);
      setInsightAnswer(null);
      setInsightResult(null);
      setCoreCompleted(false);
      setSelectedDailyDifficulty(null);
      setShowDifficultySelector(true);
      setDailyTimer(0);
      setDailyTimerActive(false);
      setDailyHintUsed(false);
      setDailyAnswerShown(false);
      setDailySolveTime(null);
    }
    
    // Load the appropriate dataset
    if (challenge.core && challenge.core.dataset) {
      loadDataset(db, challenge.core.dataset);
    }
  };
  
  const runDailyChallengeQuery = () => {
    if (!db || !dailyChallengeQuery.trim()) return;
    try {
      const result = db.exec(dailyChallengeQuery);
      if (result.length > 0) {
        setDailyChallengeResult({ columns: result[0].columns, rows: result[0].values, error: null });
      } else {
        setDailyChallengeResult({ columns: [], rows: [], error: null });
      }
    } catch (err) {
      setDailyChallengeResult({ columns: [], rows: [], error: err.message });
    }
  };
  
  const submitDailyChallenge = () => {
    if (!db || !dailyChallengeQuery.trim() || !todaysChallenge) return;
    try {
      const userResult = db.exec(dailyChallengeQuery);
      const expectedResult = db.exec(todaysChallenge.core.solution);
      
      const userRows = userResult.length > 0 ? JSON.stringify(userResult[0].values) : '[]';
      const expectedRows = expectedResult.length > 0 ? JSON.stringify(expectedResult[0].values) : '[]';
      
      if (userRows === expectedRows) {
        setDailyChallengeStatus('success');
        setCoreCompleted(true);
        // XP is now awarded after completing all 3 steps in the insight check
      } else {
        setDailyChallengeStatus('error');
      }
    } catch (err) {
      setDailyChallengeResult({ columns: [], rows: [], error: err.message });
      setDailyChallengeStatus('error');
    }
  };

  // Challenge functions
  const openChallenge = (challenge) => {
    setCurrentChallenge(challenge);
    // Load saved query for this challenge, or empty string
    setChallengeQuery(challengeQueries[challenge.id] || '');
    setChallengeResult({ columns: [], rows: [], error: null });
    setChallengeStatus(null);
    setShowChallengeHint(false);
    
    // Load the appropriate dataset
    if (db && challenge.dataset) {
      loadDataset(db, challenge.dataset);
      
      // Calculate expected result
      try {
        const result = db.exec(challenge.solution);
        if (result.length > 0) {
          setChallengeExpected({ columns: result[0].columns, rows: result[0].values });
        } else {
          setChallengeExpected({ columns: [], rows: [] });
        }
      } catch (err) {
        console.error('Error calculating expected:', err);
        setChallengeExpected({ columns: [], rows: [] });
      }
    }
  };
  
  // Save challenge query when it changes
  const updateChallengeQuery = (query) => {
    setChallengeQuery(query);
    if (currentChallenge) {
      setChallengeQueries(prev => ({ ...prev, [currentChallenge.id]: query }));
    }
  };

  const runChallengeQuery = () => {
    if (!db || !challengeQuery.trim()) return;
    try {
      const result = db.exec(challengeQuery);
      if (result.length > 0) {
        setChallengeResult({ columns: result[0].columns, rows: result[0].values, error: null });
      } else {
        setChallengeResult({ columns: [], rows: [], error: null });
      }
      setChallengeStatus(null);
      addToHistory(challengeQuery, true, 'challenge');
    } catch (err) {
      setChallengeResult({ columns: [], rows: [], error: err.message });
      setChallengeStatus(null);
      addToHistory(challengeQuery, false, 'challenge');
    }
  };

  const submitChallenge = () => {
    if (!db || !challengeQuery.trim() || !currentChallenge) return;
    try {
      const userResult = db.exec(challengeQuery);
      const expectedResultData = db.exec(currentChallenge.solution);
      
      const userValues = userResult.length ? JSON.stringify(userResult[0].values) : '[]';
      const expectedValues = expectedResultData.length ? JSON.stringify(expectedResultData[0].values) : '[]';
      
      const isSuccess = userValues === expectedValues;
      const isFirstTry = !solvedChallenges.has(currentChallenge.id);
      
      // Track this attempt
      const attempt = {
        challengeId: currentChallenge.id,
        difficulty: currentChallenge.difficulty,
        topic: currentChallenge.topic || detectSqlTopic(currentChallenge.solution),
        success: isSuccess,
        timestamp: Date.now(),
        firstTry: isFirstTry && isSuccess,
        hintsUsed: showChallengeHint ? 1 : 0
      };
      setChallengeAttempts(prev => [...prev, attempt]);
      
      // Update recommended difficulty after tracking
      if (isSuccess && isFirstTry) {
        const newSolved = new Set([...solvedChallenges, currentChallenge.id]);
        const newRecommended = calculateRecommendedDifficulty(newSolved, challenges, [...challengeAttempts, attempt]);
        setRecommendedDifficulty(newRecommended);
      }
      
      if (isSuccess) {
        setChallengeStatus('success');
        addToHistory(challengeQuery, true, `challenge #${currentChallenge.id} ✓`);
        if (!solvedChallenges.has(currentChallenge.id)) {
          const newSolved = new Set([...solvedChallenges, currentChallenge.id]);
          setSolvedChallenges(newSolved);
          setXP(prev => prev + currentChallenge.xpReward);
          setStreak(prev => {
            const ns = prev + 1;
            if (ns >= 3 && !unlockedAchievements.has('streak_3')) unlockAchievement('streak_3');
            if (ns >= 5 && !unlockedAchievements.has('streak_5')) unlockAchievement('streak_5');
            return ns;
          });
          
          // Challenge achievements
          if (newSolved.size >= 5 && !unlockedAchievements.has('challenge_5')) unlockAchievement('challenge_5');
          if (newSolved.size >= 10 && !unlockedAchievements.has('challenge_10')) unlockAchievement('challenge_10');
          if (newSolved.size >= 20 && !unlockedAchievements.has('challenge_20')) unlockAchievement('challenge_20');
          if (newSolved.size >= challenges.length && !unlockedAchievements.has('challenge_all')) unlockAchievement('challenge_all');
          
          // Guest signup prompt - after first challenge or every 3 challenges
          if (isGuest) {
            const newCount = guestActionsCount + 1;
            setGuestActionsCount(newCount);
            if (newCount === 1) {
              setTimeout(() => triggerSignupPrompt('first_challenge'), 1500);
            } else if (newCount % 3 === 0) {
              setTimeout(() => triggerSignupPrompt('progress'), 1500);
            }
          }
        }
        if (userResult.length > 0) {
          setChallengeResult({ columns: userResult[0].columns, rows: userResult[0].values, error: null });
        }
      } else {
        setChallengeStatus('wrong');
        setStreak(0);
        addToHistory(challengeQuery, false, `challenge #${currentChallenge.id} ✗`);
        if (userResult.length > 0) {
          setChallengeResult({ columns: userResult[0].columns, rows: userResult[0].values, error: null });
        } else {
          setChallengeResult({ columns: [], rows: [], error: null });
        }
      }
    } catch (err) {
      setChallengeResult({ columns: [], rows: [], error: err.message });
      setChallengeStatus('wrong');
      setStreak(0);
    }
  };

  const getFilteredChallenges = () => {
    return challenges.filter(c => {
      if (challengeFilter === 'all') return true;
      if (challengeFilter === 'easy') return c.difficulty === 'Easy';
      if (challengeFilter === 'medium') return c.difficulty === 'Medium';
      if (challengeFilter === 'hard') return c.difficulty === 'Hard';
      if (challengeFilter === 'solved') return solvedChallenges.has(c.id);
      if (challengeFilter === 'unsolved') return !solvedChallenges.has(c.id);
      return true;
    });
  };

  const currentLevel = levels.reduce((acc, l) => xp >= l.minXP ? l : acc, levels[0]);
  const nextLevel = levels.find(l => l.minXP > xp) || levels[levels.length - 1];
  const dataset = publicDatasets[currentDataset];

  // Auth Screen
  if (showAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        {/* Admin Panel Modal - accessible even when not logged in */}
        {showAdminPanel && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={closeAdminPanel}>
            <div className="bg-gray-900 rounded-2xl border border-red-500/30 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-red-400">🔐 Admin Panel</h2>
                <button onClick={closeAdminPanel} className="text-gray-400 hover:text-white text-xl">✕</button>
              </div>
              
              {!isAdminAuthenticated ? (
                <div className="max-w-md mx-auto">
                  <p className="text-gray-400 mb-4 text-center">Enter admin password to access user management.</p>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && authenticateAdmin()}
                    placeholder="Admin password"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white mb-3 focus:border-red-500 focus:outline-none"
                    autoFocus
                  />
                  {adminError && <p className="text-red-400 text-sm mb-3">{adminError}</p>}
                  <button
                    onClick={authenticateAdmin}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-lg font-bold transition-all"
                  >
                    Access Admin Panel
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4 p-3 bg-gray-800/50 rounded-lg">
                    <div className="text-sm text-gray-400">
                      <span className="font-bold text-white">{allUsers.length}</span> registered users
                    </div>
                    <div className="flex gap-2">
                      <button onClick={loadAllUsers} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm">🔄 Refresh</button>
                      <button onClick={exportAllUsers} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm">📥 Export All</button>
                    </div>
                  </div>
                  
                  {adminError && <p className="text-red-400 text-sm mb-3 p-2 bg-red-500/10 rounded">{adminError}</p>}
                  
                  {selectedUserForReset && (
                    <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <h4 className="font-bold text-yellow-400 mb-2">Reset Password for "{selectedUserForReset}"</h4>
                      <div className="flex gap-2">
                        <input type="text" value={newPasswordForReset} onChange={(e) => setNewPasswordForReset(e.target.value)} placeholder="New password (min 6 chars)" className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:border-yellow-500 focus:outline-none" />
                        <button onClick={() => resetUserPassword(selectedUserForReset)} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded text-sm font-medium">Reset</button>
                        <button onClick={() => { setSelectedUserForReset(null); setNewPasswordForReset(''); }} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm">Cancel</button>
                      </div>
                    </div>
                  )}
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700 text-left">
                          <th className="py-3 px-2 text-gray-400">Username</th>
                          <th className="py-3 px-2 text-gray-400">XP</th>
                          <th className="py-3 px-2 text-gray-400">Challenges</th>
                          <th className="py-3 px-2 text-gray-400">Status</th>
                          <th className="py-3 px-2 text-gray-400">Last Active</th>
                          <th className="py-3 px-2 text-gray-400">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allUsers.map((user, idx) => (
                          <tr key={user.username} className={`border-b border-gray-800 ${idx % 2 === 0 ? 'bg-gray-800/30' : ''}`}>
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-xs font-bold">{user.username.charAt(0).toUpperCase()}</div>
                                <span className="font-medium">{user.username}</span>
                                {user.hasPassword && <span className="text-green-400 text-xs">🔒</span>}
                              </div>
                            </td>
                            <td className="py-3 px-2 text-yellow-400 font-medium">{user.xp.toLocaleString()}</td>
                            <td className="py-3 px-2">{user.challengesSolved}</td>
                            <td className="py-3 px-2">
                              {user.isPermanentLock ? (
                                <span className="text-red-400 text-xs font-medium">🚫 LOCKED</span>
                              ) : user.isLocked ? (
                                <span className="text-yellow-400 text-xs">⏳ Temp Lock</span>
                              ) : user.lockoutCount > 0 ? (
                                <span className="text-orange-400 text-xs">⚠️ {user.lockoutCount}/3</span>
                              ) : (
                                <span className="text-green-400 text-xs">✓ OK</span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-gray-400 text-xs">{user.lastActive}</td>
                            <td className="py-3 px-2">
                              <div className="flex gap-1">
                                {user.isLocked && (
                                  <button onClick={() => unlockUser(user.username)} className="px-2 py-1 bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded text-xs" title="Unlock account">🔓</button>
                                )}
                                <button onClick={() => setSelectedUserForReset(user.username)} className="px-2 py-1 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 rounded text-xs" title="Reset password">🔑</button>
                                <button onClick={() => exportUserData(user.username)} className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded text-xs" title="Export">📥</button>
                                <button onClick={() => deleteUser(user.username)} className="px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded text-xs" title="Delete">🗑️</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {allUsers.length === 0 && <div className="text-center py-8 text-gray-500">No users found</div>}
                  </div>
                  
                  <div className="mt-6 p-4 bg-gray-800/50 rounded-lg text-xs text-gray-500">
                    <p><strong>Note:</strong> User data is stored in browser localStorage. Passwords are hashed with SHA-256 + salt.</p>
                    <p className="mt-1"><strong>Security:</strong> 5 failed attempts = 15min lock. 3 lockouts = permanent lock (admin unlock required).</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="bg-black/50 backdrop-blur-sm rounded-2xl border border-purple-500/30 p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-4xl">
              🎯
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">SQL Quest</h1>
            <p className="text-gray-400 mt-2">{authMode === 'login' ? 'Sign in to continue' : 'Create your account'}</p>
          </div>
          
          <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Username</label>
              <input
                type="text"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                placeholder="Enter username"
                autoComplete="username"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">Password</label>
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              />
              
              {/* Password Strength Meter - only on register */}
              {authMode === 'register' && authPassword && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          getPasswordStrength(authPassword).color === 'red' ? 'bg-red-500' :
                          getPasswordStrength(authPassword).color === 'orange' ? 'bg-orange-500' :
                          getPasswordStrength(authPassword).color === 'yellow' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${getPasswordStrength(authPassword).percent}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${
                      getPasswordStrength(authPassword).color === 'red' ? 'text-red-400' :
                      getPasswordStrength(authPassword).color === 'orange' ? 'text-orange-400' :
                      getPasswordStrength(authPassword).color === 'yellow' ? 'text-yellow-400' :
                      'text-green-400'
                    }`}>
                      {getPasswordStrength(authPassword).label}
                    </span>
                  </div>
                  {getPasswordStrength(authPassword).feedback.length > 0 && (
                    <p className="text-xs text-gray-500">
                      Tips: {getPasswordStrength(authPassword).feedback.slice(0, 2).join(', ')}
                    </p>
                  )}
                </div>
              )}
              
              {/* Forgot Password - only on login */}
              {authMode === 'login' && (
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs text-purple-400 hover:text-purple-300 mt-2"
                >
                  Forgot password?
                </button>
              )}
            </div>
            
            {/* Forgot Password Modal */}
            {showForgotPassword && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-400 text-sm font-medium mb-2">🔑 Password Reset</p>
                <p className="text-gray-300 text-sm mb-3">
                  To reset your password, please contact the administrator. They can reset it for you in the Admin Panel.
                </p>
                <p className="text-gray-400 text-xs mb-3">
                  Admin access: Add <code className="bg-gray-800 px-1 rounded">?admin=true</code> to the URL
                </p>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="text-sm text-gray-400 hover:text-white"
                >
                  ← Back to login
                </button>
              </div>
            )}
            
            {authError && (
              <p className="text-red-400 text-sm">{authError}</p>
            )}
            
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-bold text-white transition-all"
            >
              {authMode === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button 
                type="button"
                onClick={() => { 
                  setAuthMode(authMode === 'login' ? 'register' : 'login'); 
                  setAuthError(''); 
                  setShowForgotPassword(false);
                }}
                className="text-purple-400 hover:text-purple-300 font-medium"
              >
                {authMode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
          
          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-black/50 text-gray-500">or</span>
            </div>
          </div>
          
          {/* Guest Mode Button */}
          <button
            type="button"
            onClick={startGuestMode}
            className="w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-gray-500 rounded-lg font-medium text-gray-300 transition-all flex items-center justify-center gap-2"
          >
            <Play size={18} />
            Continue as Guest
          </button>
          <p className="text-center text-xs text-gray-500 mt-2">No signup required • Progress saved locally</p>
        </div>
      </div>
    );
  }

  if (!dbReady) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-pulse">🗄️</div>
        <p className="text-white text-xl">Loading SQL Engine...</p>
        <p className="text-gray-400 text-sm mt-2">Initializing datasets...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      {showAchievement && <AchievementPopup achievement={showAchievement} onClose={() => setShowAchievement(null)} />}
      
      {/* Guest Signup Prompt Modal */}
      {showSignupPrompt && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowSignupPrompt(false)}>
          <div className="bg-gradient-to-br from-gray-900 to-purple-900 rounded-2xl border border-purple-500/50 p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
                {signupPromptReason === 'first_challenge' ? '🎉' : '💪'}
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {signupPromptReason === 'first_challenge' ? 'Great job!' : 'You\'re on fire!'}
              </h2>
              <p className="text-gray-300">
                {signupPromptReason === 'first_challenge' 
                  ? 'You just solved your first challenge!' 
                  : `You've earned ${xp} XP and solved ${solvedChallenges.size} challenges!`}
              </p>
            </div>
            
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
              <p className="text-yellow-400 font-medium flex items-center gap-2 mb-2">
                <AlertCircle size={18} /> Your progress isn't saved yet
              </p>
              <p className="text-gray-400 text-sm">Create a free account to save your XP, streaks, and achievements forever.</p>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target;
              const username = form.username.value.trim();
              const password = form.password.value;
              
              if (username.length < 3) {
                setAuthError('Username must be at least 3 characters');
                return;
              }
              if (password.length < 6) {
                setAuthError('Password must be at least 6 characters');
                return;
              }
              
              // Check if username exists
              const existing = await loadUserData(username);
              if (existing && existing.passwordHash) {
                setAuthError('Username already taken');
                return;
              }
              
              await convertGuestToUser(username, password);
            }} className="space-y-4">
              <div>
                <input
                  name="username"
                  type="text"
                  placeholder="Choose a username"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                  required
                  minLength={3}
                />
              </div>
              <div>
                <input
                  name="password"
                  type="password"
                  placeholder="Create a password"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                  required
                  minLength={6}
                />
              </div>
              
              {authError && <p className="text-red-400 text-sm">{authError}</p>}
              
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-bold text-white transition-all"
              >
                Create Account & Save Progress
              </button>
            </form>
            
            <button
              onClick={() => setShowSignupPrompt(false)}
              className="w-full mt-3 py-2 text-gray-400 hover:text-white text-sm transition-all"
            >
              Continue as guest (progress may be lost)
            </button>
            
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Shield size={12} /> Secure</span>
              <span className="flex items-center gap-1"><Zap size={12} /> Free forever</span>
              <span className="flex items-center gap-1"><Trophy size={12} /> Keep your XP</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Daily Challenge Modal - 3 Step Format */}
      {showDailyChallenge && todaysChallenge && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowDailyChallenge(false)}>
          <div className="bg-gray-900 rounded-2xl border border-yellow-500/50 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
                  <Sun size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-yellow-400">Daily Challenge</h2>
                  <p className="text-sm text-gray-400">{todaysChallenge.day} • {todaysChallenge.topic} • {todaysChallenge.difficulty}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {dailyStreak > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-orange-500/20 rounded-full">
                    <Flame size={16} className="text-orange-400" />
                    <span className="text-orange-400 font-bold">{dailyStreak} day streak</span>
                  </div>
                )}
                <button 
                  onClick={() => setShowReminderSetup(!showReminderSetup)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${showReminderSetup ? 'bg-yellow-500/30 text-yellow-400' : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                  title="Reminder settings"
                >
                  <Settings size={18} />
                </button>
                <button onClick={() => setShowDailyChallenge(false)} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
              </div>
            </div>
            
            {/* Reminder Setup Panel */}
            {showReminderSetup && (
              <div className="mb-4 p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl border border-yellow-500/30">
                <h3 className="font-bold text-yellow-400 mb-3 flex items-center gap-2">
                  <Bell size={18} /> Never Miss a Challenge
                </h3>
                <p className="text-sm text-gray-400 mb-4">Daily at 11:00 AM (GMT+3)</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={async () => {
                      const granted = await requestNotificationPermission();
                      if (granted) {
                        setNotificationsEnabled(true);
                        localStorage.setItem('sqlquest_notifications', 'true');
                        alert('✅ Browser notifications enabled!');
                      }
                    }}
                    className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${notificationsEnabled ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-gray-800 border-gray-700 hover:border-yellow-500/50'}`}
                  >
                    <Bell size={18} />
                    <span className="text-sm">{notificationsEnabled ? '✓ Notifications On' : 'Browser Notify'}</span>
                  </button>
                  <a href={getGoogleCalendarLink()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-lg border bg-gray-800 border-gray-700 hover:border-yellow-500/50 text-gray-300">
                    <Calendar size={18} />
                    <span className="text-sm">Google Calendar</span>
                  </a>
                </div>
              </div>
            )}
            
            {/* Difficulty Selector - Show before starting challenge */}
            {showDifficultySelector && dailyStep === 0 && !isDailyCompleted && (
              <div className="mb-4 p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl border border-purple-500/30">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-purple-400 flex items-center gap-2">
                    <Target size={18} /> Recommended Difficulty
                  </h3>
                  <span className="text-xs text-gray-500">Based on your challenge performance</span>
                </div>
                
                {/* Performance Summary */}
                <div className="mb-3 p-2 bg-gray-800/50 rounded-lg text-xs text-gray-400">
                  {(() => {
                    const stats = { Easy: { solved: 0, total: 0 }, Medium: { solved: 0, total: 0 }, Hard: { solved: 0, total: 0 } };
                    challenges.forEach(c => {
                      let diff = c.difficulty;
                      if (diff === 'Easy-Medium') diff = 'Easy';
                      else if (diff === 'Medium-Hard') diff = 'Medium';
                      if (stats[diff]) {
                        stats[diff].total++;
                        if (solvedChallenges.has(c.id)) stats[diff].solved++;
                      }
                    });
                    return (
                      <div className="flex gap-4">
                        <span>Easy: <span className="text-green-400">{stats.Easy.solved}/{stats.Easy.total}</span></span>
                        <span>Medium: <span className="text-yellow-400">{stats.Medium.solved}/{stats.Medium.total}</span></span>
                        <span>Hard: <span className="text-red-400">{stats.Hard.solved}/{stats.Hard.total}</span></span>
                      </div>
                    );
                  })()}
                </div>
                
                {/* Difficulty Buttons */}
                <div className="flex gap-2 flex-wrap">
                  {['Easy', 'Easy-Medium', 'Medium', 'Medium-Hard', 'Hard'].map(diff => {
                    const isRecommended = diff === recommendedDifficulty;
                    const isSelected = selectedDailyDifficulty === diff || (!selectedDailyDifficulty && isRecommended);
                    return (
                      <button
                        key={diff}
                        onClick={() => {
                          setSelectedDailyDifficulty(diff);
                          // Reset challenge state for new difficulty
                          setWarmupAnswer(null);
                          setWarmupResult(null);
                          setInsightAnswer(null);
                          setInsightResult(null);
                          setDailyChallengeQuery('');
                          setDailyChallengeResult({ columns: [], rows: [], error: null });
                          setDailyChallengeStatus(null);
                          setCoreCompleted(false);
                          // Reset timer and hint
                          setDailyTimer(0);
                          setDailyTimerActive(false);
                          setDailyHintUsed(false);
                          setDailyAnswerShown(false);
                          setDailySolveTime(null);
                          // Load new dataset
                          const newChallenge = getTodaysChallenge(diff);
                          if (newChallenge?.core?.dataset && db) {
                            loadDataset(db, newChallenge.core.dataset);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all relative ${
                          isSelected 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        {diff}
                        {isRecommended && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full" title="Recommended"></span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  ★ Recommended: <span className="text-purple-400">{recommendedDifficulty}</span> • You can always adjust
                </p>
              </div>
            )}
            
            {/* Struggling Alert */}
            {showStrugglingAlert && dailyStep === 0 && !isDailyCompleted && (
              <div className="mb-4 p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-xl border border-orange-500/30">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">💪</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-orange-400 mb-1">Having a tough week?</h3>
                    <p className="text-sm text-gray-400 mb-3">
                      No worries - that's how we learn! Want to try an easier challenge today to rebuild momentum?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedDailyDifficulty('Easy');
                          setShowStrugglingAlert(false);
                          // Reset challenge state for new difficulty
                          setWarmupAnswer(null);
                          setWarmupResult(null);
                          setInsightAnswer(null);
                          setInsightResult(null);
                          setDailyChallengeQuery('');
                          setDailyChallengeResult({ columns: [], rows: [], error: null });
                          setDailyChallengeStatus(null);
                          setCoreCompleted(false);
                          // Reset timer and hint
                          setDailyTimer(0);
                          setDailyTimerActive(false);
                          setDailyHintUsed(false);
                          setDailyAnswerShown(false);
                          setDailySolveTime(null);
                          // Load new dataset
                          const newChallenge = getTodaysChallenge('Easy');
                          if (newChallenge?.core?.dataset && db) {
                            loadDataset(db, newChallenge.core.dataset);
                          }
                        }}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium"
                      >
                        Yes, try Easy
                      </button>
                      <button
                        onClick={() => setShowStrugglingAlert(false)}
                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
                      >
                        Keep current difficulty
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Progress Steps */}
            <div className="flex items-center gap-2 mb-6">
              {['Warm-up', 'Challenge', 'Insight'].map((step, i) => (
                <div key={i} className="flex items-center flex-1">
                  <div className={`flex-1 h-2 rounded-full transition-all ${dailyStep > i ? 'bg-green-500' : dailyStep === i ? 'bg-yellow-500' : 'bg-gray-700'}`} />
                  <span className={`ml-2 text-xs ${dailyStep >= i ? 'text-yellow-400' : 'text-gray-500'}`}>{step}</span>
                </div>
              ))}
            </div>
            
            {/* Stats Bar */}
            <div className="flex items-center justify-between mb-4 p-3 bg-gray-800/50 rounded-lg text-sm">
              <span className="text-gray-400">⏱️ Avg solve: {
                todaysChallenge.difficulty === 'Easy' ? '1-2' :
                todaysChallenge.difficulty === 'Easy-Medium' ? '2' :
                todaysChallenge.difficulty === 'Medium' ? '2-3' :
                todaysChallenge.difficulty === 'Medium-Hard' ? '3' :
                todaysChallenge.difficulty === 'Hard' ? '3-4' : '2-3'
              } min</span>
              <span className="text-gray-400">📊 {todaysChallenge.solveRate}% solve rate</span>
              <span className="text-yellow-400 font-medium">+50 XP</span>
            </div>
            
            {isDailyCompleted ? (
              /* Already Completed */
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-2xl font-bold text-green-400 mb-2">Challenge Completed!</h3>
                <p className="text-gray-400 mb-4">You've crushed today's challenge.</p>
                <div className="flex items-center justify-center gap-2 text-yellow-400 mb-4">
                  <Clock size={18} />
                  <span>New challenge in {timeUntilReset.hours}h {timeUntilReset.minutes}m</span>
                </div>
                {dailyStreak > 0 && (
                  <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 rounded-full">
                    <Flame size={20} className="text-orange-400" />
                    <span className="text-orange-400 font-bold">{dailyStreak} day streak! 🔥</span>
                  </div>
                )}
              </div>
            ) : dailyStep === 0 ? (
              /* Step 1: Warm-up MCQ */
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <span className="px-3 py-1 bg-blue-500/30 rounded-full text-blue-300 text-sm font-medium">Step 1: Warm-up</span>
                  <span className="text-gray-500 text-sm">30 seconds</span>
                </div>
                
                <div className="bg-gray-800/50 rounded-xl p-5 mb-4">
                  {todaysChallenge.warmup.type === 'debug' && todaysChallenge.warmup.code && (
                    <pre className="bg-gray-900 p-3 rounded-lg text-sm text-gray-300 font-mono mb-4 overflow-x-auto">{todaysChallenge.warmup.code}</pre>
                  )}
                  <p className="text-lg font-medium mb-4">{todaysChallenge.warmup.question}</p>
                  
                  <div className="space-y-2">
                    {todaysChallenge.warmup.type === 'truefalse' ? (
                      ['True', 'False'].map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => !warmupResult && setWarmupAnswer(i === 0)}
                          disabled={warmupResult !== null}
                          className={`w-full p-3 rounded-lg text-left transition-all border ${
                            warmupResult !== null
                              ? (i === 0) === todaysChallenge.warmup.correct
                                ? 'bg-green-500/20 border-green-500 text-green-300'
                                : warmupAnswer === (i === 0)
                                  ? 'bg-red-500/20 border-red-500 text-red-300'
                                  : 'bg-gray-700/50 border-gray-700 text-gray-400'
                              : warmupAnswer === (i === 0)
                                ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300'
                                : 'bg-gray-700/50 border-gray-700 hover:border-gray-600 text-gray-300'
                          }`}
                        >
                          {opt}
                        </button>
                      ))
                    ) : (
                      todaysChallenge.warmup.options.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => !warmupResult && setWarmupAnswer(i)}
                          disabled={warmupResult !== null}
                          className={`w-full p-3 rounded-lg text-left transition-all border ${
                            warmupResult !== null
                              ? i === todaysChallenge.warmup.correct
                                ? 'bg-green-500/20 border-green-500 text-green-300'
                                : warmupAnswer === i
                                  ? 'bg-red-500/20 border-red-500 text-red-300'
                                  : 'bg-gray-700/50 border-gray-700 text-gray-400'
                              : warmupAnswer === i
                                ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300'
                                : 'bg-gray-700/50 border-gray-700 hover:border-gray-600 text-gray-300'
                          }`}
                        >
                          <span className="mr-2 text-gray-500">{String.fromCharCode(65 + i)}.</span> {opt}
                        </button>
                      ))
                    )}
                  </div>
                </div>
                
                {warmupResult && (
                  <div className={`p-4 rounded-lg mb-4 ${warmupResult === 'correct' ? 'bg-green-500/20 border border-green-500/50' : 'bg-red-500/20 border border-red-500/50'}`}>
                    <p className={`font-bold mb-1 ${warmupResult === 'correct' ? 'text-green-400' : 'text-red-400'}`}>
                      {warmupResult === 'correct' ? '✓ Correct!' : '✗ Not quite'}
                    </p>
                    <p className="text-gray-300 text-sm">{todaysChallenge.warmup.explanation}</p>
                  </div>
                )}
                
                <button
                  onClick={() => {
                    if (warmupResult) {
                      setDailyStep(1);
                      setDailyTimerActive(true); // Start timer when entering SQL challenge
                    } else if (warmupAnswer !== null) {
                      const isCorrect = todaysChallenge.warmup.type === 'truefalse'
                        ? warmupAnswer === todaysChallenge.warmup.correct
                        : warmupAnswer === todaysChallenge.warmup.correct;
                      setWarmupResult(isCorrect ? 'correct' : 'wrong');
                    }
                  }}
                  disabled={warmupAnswer === null}
                  className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 rounded-lg font-bold transition-all"
                >
                  {warmupResult ? 'Continue to Challenge →' : 'Check Answer'}
                </button>
              </div>
            ) : dailyStep === 1 ? (
              /* Step 2: Core SQL Challenge */
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-yellow-500/30 rounded-full text-yellow-300 text-sm font-medium">Step 2: SQL Challenge</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded-lg">
                    <Clock size={16} className="text-yellow-400" />
                    <span className="font-mono text-yellow-400 font-bold">{formatTime(dailyTimer)}</span>
                  </div>
                </div>
                
                <div className="bg-gray-800/50 rounded-xl p-4 mb-4">
                  <h3 className="font-bold text-lg mb-2 text-yellow-400">{todaysChallenge.core.title}</h3>
                  <p className="text-gray-300 mb-3" dangerouslySetInnerHTML={{ __html: todaysChallenge.core.description.replace(/\*\*(.*?)\*\*/g, '<strong class="text-yellow-300">$1</strong>') }} />
                  <div className="flex items-center gap-3 text-sm">
                    <span className="px-2 py-1 bg-purple-500/30 rounded text-purple-300">📊 {todaysChallenge.core.dataset}</span>
                    <span className="px-2 py-1 bg-blue-500/30 rounded text-blue-300">💡 {todaysChallenge.core.concept}</span>
                  </div>
                </div>
                
                {/* Table Schema Info - Only relevant tables */}
                <div className="bg-gray-800/30 rounded-xl p-4 mb-4 border border-gray-700">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">📋 Table & Columns</h4>
                  {(() => {
                    const datasetInfo = window.publicDatasetsData?.[todaysChallenge.core.dataset];
                    if (!datasetInfo) return <p className="text-gray-500 text-sm">Loading table info...</p>;
                    
                    // Extract only tables used in the solution
                    const usedTables = extractTablesFromSql(todaysChallenge.core.solution, datasetInfo.tables);
                    const tablesToShow = usedTables.length > 0 ? usedTables : Object.keys(datasetInfo.tables).slice(0, 1);
                    
                    return (
                      <div className="space-y-2">
                        {tablesToShow.map(tableName => (
                          <div key={tableName}>
                            <span className="text-yellow-400 font-mono font-bold">{tableName}</span>
                            <span className="text-gray-500 ml-2 text-xs">
                              ({datasetInfo.tables[tableName]?.columns.join(', ')})
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                
                {/* Expected Output Preview */}
                <div className="bg-green-500/10 rounded-xl p-4 mb-4 border border-green-500/30">
                  <h4 className="text-sm font-medium text-green-400 mb-2">🎯 Expected Output (preview)</h4>
                  {(() => {
                    if (!db || !todaysChallenge.core.solution) return <p className="text-gray-500 text-sm">Loading...</p>;
                    try {
                      const result = db.exec(todaysChallenge.core.solution);
                      if (result.length === 0) return <p className="text-gray-500 text-sm">No results</p>;
                      const cols = result[0].columns;
                      const rows = result[0].values.slice(0, 3); // Show first 3 rows
                      const totalRows = result[0].values.length;
                      return (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm font-mono">
                            <thead>
                              <tr className="border-b border-green-500/30">
                                {cols.map((col, i) => (
                                  <th key={i} className="text-left py-1 px-2 text-green-300 font-medium">{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((row, ri) => (
                                <tr key={ri} className="border-b border-gray-800">
                                  {row.map((cell, ci) => (
                                    <td key={ci} className="py-1 px-2 text-gray-300">{cell ?? 'NULL'}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {totalRows > 3 && (
                            <p className="text-xs text-gray-500 mt-2">...and {totalRows - 3} more row{totalRows - 3 > 1 ? 's' : ''}</p>
                          )}
                        </div>
                      );
                    } catch (e) {
                      return <p className="text-gray-500 text-sm">Unable to preview</p>;
                    }
                  })()}
                </div>
                
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-gray-400">Your SQL Query</label>
                    <div className="flex items-center gap-3">
                      {/* Hint button or status */}
                      {dailyHintUsed ? (
                        <span className="text-xs text-gray-500">✓ Hint used (-20% XP)</span>
                      ) : (
                        <button 
                          onClick={() => setDailyHintUsed(true)} 
                          className="text-xs text-yellow-400 hover:text-yellow-300"
                          disabled={dailyAnswerShown}
                        >
                          💡 Hint (-20%)
                        </button>
                      )}
                      
                      <span className="text-gray-600">|</span>
                      
                      {/* Show Answer button or status */}
                      {dailyAnswerShown ? (
                        <span className="text-xs text-red-400">👁️ Answer shown (0 XP)</span>
                      ) : (
                        <button 
                          onClick={() => { 
                            if (confirm('Are you sure? You will receive 0 XP for this challenge.')) {
                              setDailyAnswerShown(true);
                            }
                          }} 
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          👁️ Show Answer (0 XP)
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Hint Box - shown permanently when hint used */}
                  {dailyHintUsed && !dailyAnswerShown && (
                    <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <p className="text-xs text-yellow-400 mb-1">💡 Hint:</p>
                      <p className="text-sm text-yellow-200">{todaysChallenge.core.hint}</p>
                    </div>
                  )}
                  
                  {/* Show Answer Box */}
                  {dailyAnswerShown && (
                    <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-xs text-red-400 mb-2">📖 Solution (0 XP for this challenge):</p>
                      <pre className="text-sm text-red-300 font-mono bg-gray-900 p-2 rounded overflow-x-auto">{todaysChallenge.core.solution}</pre>
                    </div>
                  )}
                  
                  <textarea
                    value={dailyChallengeQuery}
                    onChange={(e) => setDailyChallengeQuery(e.target.value)}
                    placeholder="SELECT ... FROM ..."
                    className="w-full h-32 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono text-sm placeholder-gray-500 focus:border-yellow-500 focus:outline-none resize-none"
                    onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) runDailyChallengeQuery(); }}
                  />
                </div>
                
                <div className="flex gap-2 mb-4">
                  <button onClick={runDailyChallengeQuery} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-all flex items-center justify-center gap-2">
                    <Play size={16} /> Run Query
                  </button>
                  <button
                    onClick={() => {
                      submitDailyChallenge();
                      if (dailyChallengeStatus === 'success' || coreCompleted) {
                        setCoreCompleted(true);
                      }
                    }}
                    disabled={!dailyChallengeQuery.trim()}
                    className="flex-1 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 rounded-lg font-bold transition-all"
                  >
                    Submit
                  </button>
                </div>
                
                {dailyChallengeStatus === 'success' && (
                  <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 mb-4">
                    <p className="text-green-400 font-bold text-lg mb-2">✓ Correct!</p>
                    <button onClick={() => {
                      if (todaysChallenge.insight) {
                        setDailyStep(2);
                        // Stop timer when moving to insight (SQL challenge done)
                        setDailyTimerActive(false);
                        setDailySolveTime(dailyTimer);
                      } else {
                        // No insight check, complete directly
                        setDailyStep(3);
                        setDailyTimerActive(false);
                        setDailySolveTime(dailyTimer);
                        if (!isDailyCompleted) {
                          // Calculate XP: 0 if answer shown, -20% if hint used, full otherwise
                          const baseXP = 50;
                          const xpReward = dailyAnswerShown ? 0 : (dailyHintUsed ? Math.floor(baseXP * 0.8) : baseXP);
                          const newXP = xp + xpReward;
                          setXP(newXP);
                          const newCompleted = { ...completedDailyChallenges, [todayString]: true };
                          setCompletedDailyChallenges(newCompleted);
                          const newStreak = dailyStreak + 1;
                          setDailyStreak(newStreak);
                          
                          // Track daily challenge history
                          const dailyHistory = {
                            date: todayString,
                            difficulty: selectedDailyDifficulty || todaysChallenge.difficulty,
                            topic: todaysChallenge.topic,
                            success: true,
                            warmupCorrect: warmupResult === 'correct',
                            coreCorrect: true,
                            insightCorrect: null, // No insight check
                            solveTime: dailyTimer,
                            hintUsed: dailyHintUsed,
                            answerShown: dailyAnswerShown,
                            xpEarned: xpReward
                          };
                          setDailyChallengeHistory(prev => [...prev, dailyHistory]);
                          
                          // Clear saved progress after completion
                          clearDailyProgress();
                          
                          const userData = JSON.parse(localStorage.getItem(`sqlquest_user_${currentUser}`) || '{}');
                          userData.xp = newXP;
                          userData.completedDailyChallenges = newCompleted;
                          userData.dailyStreak = newStreak;
                          userData.lastDailyChallenge = todayString;
                          userData.dailyChallengeHistory = [...(userData.dailyChallengeHistory || []), dailyHistory];
                          saveUserData(currentUser, userData);
                          saveToLeaderboard(currentUser, newXP, solvedChallenges.size);
                        }
                      }
                    }} className="text-yellow-400 hover:text-yellow-300 font-medium">
                      {todaysChallenge.insight ? 'Continue to Insight Check →' : 'Complete Challenge! 🎉'}
                    </button>
                  </div>
                )}
                
                {dailyChallengeStatus === 'error' && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-4">
                    <p className="text-red-400 font-bold">Not quite right. Check your query!</p>
                  </div>
                )}
                
                {dailyChallengeResult.error && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4">
                    <p className="text-red-400 font-mono text-sm">{dailyChallengeResult.error}</p>
                  </div>
                )}
                
                {dailyChallengeResult.rows.length > 0 && (
                  <div className="bg-gray-800/50 rounded-xl p-4">
                    <p className="text-sm text-gray-400 mb-2">Result ({dailyChallengeResult.rows.length} rows)</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-700">
                            {dailyChallengeResult.columns.map((col, i) => (
                              <th key={i} className="text-left py-2 px-3 text-yellow-400">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {dailyChallengeResult.rows.slice(0, 8).map((row, i) => (
                            <tr key={i} className="border-b border-gray-800">
                              {row.map((cell, j) => (
                                <td key={j} className="py-2 px-3 text-gray-300">{formatCell(cell)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {dailyChallengeResult.rows.length > 8 && <p className="text-xs text-gray-500 mt-2">Showing 8 of {dailyChallengeResult.rows.length}</p>}
                    </div>
                  </div>
                )}
              </div>
            ) : dailyStep === 2 && todaysChallenge.insight ? (
              /* Step 3: Insight Check */
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <span className="px-3 py-1 bg-purple-500/30 rounded-full text-purple-300 text-sm font-medium">Step 3: Insight Check</span>
                  <span className="text-gray-500 text-sm">30 seconds</span>
                </div>
                
                <div className="bg-gray-800/50 rounded-xl p-5 mb-4">
                  <p className="text-lg font-medium mb-4">{todaysChallenge.insight?.question}</p>
                  
                  <div className="space-y-2">
                    {(todaysChallenge.insight?.options || []).map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => !insightResult && setInsightAnswer(i)}
                        disabled={insightResult !== null}
                        className={`w-full p-3 rounded-lg text-left transition-all border ${
                          insightResult !== null
                            ? i === todaysChallenge.insight?.correct
                              ? 'bg-green-500/20 border-green-500 text-green-300'
                              : insightAnswer === i
                                ? 'bg-red-500/20 border-red-500 text-red-300'
                                : 'bg-gray-700/50 border-gray-700 text-gray-400'
                            : insightAnswer === i
                              ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300'
                              : 'bg-gray-700/50 border-gray-700 hover:border-gray-600 text-gray-300'
                        }`}
                      >
                        <span className="mr-2 text-gray-500">{String.fromCharCode(65 + i)}.</span> {opt}
                      </button>
                    ))}
                  </div>
                </div>
                
                {insightResult && (
                  <div className={`p-4 rounded-lg mb-4 ${insightResult === 'correct' ? 'bg-green-500/20 border border-green-500/50' : 'bg-red-500/20 border border-red-500/50'}`}>
                    <p className={`font-bold mb-1 ${insightResult === 'correct' ? 'text-green-400' : 'text-red-400'}`}>
                      {insightResult === 'correct' ? '✓ Correct!' : '✗ Not quite'}
                    </p>
                    <p className="text-gray-300 text-sm">{todaysChallenge.insight?.explanation || ''}</p>
                  </div>
                )}
                
                <button
                  onClick={() => {
                    if (insightResult) {
                      // Complete the daily challenge
                      setDailyStep(3);
                      if (!isDailyCompleted) {
                        // Calculate XP: 0 if answer shown, -20% if hint used, full otherwise
                        const baseXP = 50;
                        const xpReward = dailyAnswerShown ? 0 : (dailyHintUsed ? Math.floor(baseXP * 0.8) : baseXP);
                        const newXP = xp + xpReward;
                        setXP(newXP);
                        const newCompleted = { ...completedDailyChallenges, [todayString]: true };
                        setCompletedDailyChallenges(newCompleted);
                        const newStreak = dailyStreak + 1;
                        setDailyStreak(newStreak);
                        
                        // Track daily challenge history
                        const dailyHistory = {
                          date: todayString,
                          difficulty: selectedDailyDifficulty || todaysChallenge.difficulty,
                          topic: todaysChallenge.topic,
                          success: true,
                          warmupCorrect: warmupResult === 'correct',
                          coreCorrect: coreCompleted,
                          insightCorrect: insightResult === 'correct',
                          solveTime: dailySolveTime || dailyTimer,
                          hintUsed: dailyHintUsed,
                          answerShown: dailyAnswerShown,
                          xpEarned: xpReward
                        };
                        setDailyChallengeHistory(prev => [...prev, dailyHistory]);
                        
                        // Clear saved progress after completion
                        clearDailyProgress();
                        
                        // Check if should update recommended difficulty
                        const newRecommended = calculateRecommendedDifficulty(solvedChallenges, challenges, challengeAttempts);
                        setRecommendedDifficulty(newRecommended);
                        
                        // Save to user data
                        const userData = JSON.parse(localStorage.getItem(`sqlquest_user_${currentUser}`) || '{}');
                        userData.xp = newXP;
                        userData.completedDailyChallenges = newCompleted;
                        userData.dailyStreak = newStreak;
                        userData.lastDailyChallenge = todayString;
                        userData.dailyChallengeHistory = [...(userData.dailyChallengeHistory || []), dailyHistory];
                        saveUserData(currentUser, userData);
                        saveToLeaderboard(currentUser, newXP, solvedChallenges.size);
                      }
                    } else if (insightAnswer !== null) {
                      const isCorrect = insightAnswer === todaysChallenge.insight?.correct;
                      setInsightResult(isCorrect ? 'correct' : 'wrong');
                    }
                  }}
                  disabled={insightAnswer === null}
                  className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 rounded-lg font-bold transition-all"
                >
                  {insightResult ? 'Complete Challenge! 🎉' : 'Check Answer'}
                </button>
              </div>
            ) : (
              /* Step 4: Completed */
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-2xl font-bold text-green-400 mb-2">Challenge Complete!</h3>
                
                {/* Time and XP Summary */}
                <div className="flex items-center justify-center gap-6 mb-4">
                  {dailySolveTime !== null && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 rounded-full">
                      <Clock size={18} className="text-blue-400" />
                      <span className="text-blue-400 font-bold">Solved in {formatTime(dailySolveTime)}</span>
                    </div>
                  )}
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${dailyAnswerShown ? 'bg-red-500/20' : 'bg-yellow-500/20'}`}>
                    <span className={`font-bold ${dailyAnswerShown ? 'text-red-400' : 'text-yellow-400'}`}>
                      +{dailyAnswerShown ? '0' : (dailyHintUsed ? '40' : '50')} XP
                    </span>
                    {dailyAnswerShown && <span className="text-gray-400 text-sm">(answer shown)</span>}
                    {!dailyAnswerShown && dailyHintUsed && <span className="text-gray-400 text-sm">(hint used)</span>}
                  </div>
                </div>
                
                <div className="bg-gray-800/50 rounded-xl p-4 mb-6 text-left">
                  <h4 className="font-bold text-yellow-400 mb-2">💡 Solution</h4>
                  <pre className="bg-gray-900 p-3 rounded-lg text-sm text-green-300 font-mono overflow-x-auto">{todaysChallenge.core.solution}</pre>
                  {todaysChallenge.core.alternativeSolution && (
                    <>
                      <h4 className="font-bold text-blue-400 mt-4 mb-2">🔄 Alternative</h4>
                      <pre className="bg-gray-900 p-3 rounded-lg text-sm text-blue-300 font-mono overflow-x-auto">{todaysChallenge.core.alternativeSolution}</pre>
                    </>
                  )}
                </div>
                
                {dailyStreak > 0 && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 rounded-full mb-4">
                    <Flame size={20} className="text-orange-400" />
                    <span className="text-orange-400 font-bold">{dailyStreak} day streak! 🔥</span>
                  </div>
                )}
                
                <div className="flex items-center justify-center gap-2 text-gray-400">
                  <Clock size={18} />
                  <span>Next challenge in {timeUntilReset.hours}h {timeUntilReset.minutes}m</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Weekly Report Modal */}
      {showWeeklyReport && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowWeeklyReport(false)}>
          <div className="bg-gray-900 rounded-2xl border border-blue-500/30 p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <BarChart3 size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-blue-400">Weekly Progress Report</h2>
                  <p className="text-sm text-gray-400">Your SQL learning journey</p>
                </div>
              </div>
              <button onClick={() => setShowWeeklyReport(false)} className="text-gray-400 hover:text-white text-2xl">×</button>
            </div>
            
            {(() => {
              // Calculate weekly stats
              const now = new Date();
              const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              const recentDaily = dailyChallengeHistory.filter(d => new Date(d.date) >= oneWeekAgo);
              const recentAttempts = challengeAttempts.filter(a => a.timestamp >= oneWeekAgo.getTime());
              
              // Topic performance
              const topicPerf = {};
              recentDaily.forEach(d => {
                if (!topicPerf[d.topic]) topicPerf[d.topic] = { correct: 0, total: 0 };
                topicPerf[d.topic].total++;
                if (d.coreCorrect) topicPerf[d.topic].correct++;
              });
              recentAttempts.forEach(a => {
                if (!topicPerf[a.topic]) topicPerf[a.topic] = { correct: 0, total: 0 };
                topicPerf[a.topic].total++;
                if (a.success) topicPerf[a.topic].correct++;
              });
              
              const topicStats = Object.entries(topicPerf).map(([topic, stats]) => ({
                topic,
                rate: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
                total: stats.total,
                correct: stats.correct
              })).sort((a, b) => a.rate - b.rate);
              
              const strongTopics = topicStats.filter(t => t.rate >= 70);
              const weakTopics = topicStats.filter(t => t.rate < 70 && t.total >= 1);
              
              // Stats summary
              const totalXP = recentDaily.reduce((sum, d) => sum + (d.xpEarned || 0), 0);
              const avgSolveTime = recentDaily.length > 0 
                ? Math.round(recentDaily.reduce((sum, d) => sum + (d.solveTime || 0), 0) / recentDaily.length)
                : 0;
              const hintsUsed = recentDaily.filter(d => d.hintUsed).length;
              
              return (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-4 text-center">
                      <div className="text-3xl font-bold text-yellow-400">{recentDaily.length}</div>
                      <div className="text-xs text-gray-400">Daily Challenges</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-4 text-center">
                      <div className="text-3xl font-bold text-green-400">+{totalXP}</div>
                      <div className="text-xs text-gray-400">XP Earned</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl p-4 text-center">
                      <div className="text-3xl font-bold text-blue-400">{formatTime(avgSolveTime)}</div>
                      <div className="text-xs text-gray-400">Avg Solve Time</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-4 text-center">
                      <div className="text-3xl font-bold text-purple-400">{dailyStreak}</div>
                      <div className="text-xs text-gray-400">Day Streak</div>
                    </div>
                  </div>
                  
                  {/* Strong Topics */}
                  {strongTopics.length > 0 && (
                    <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30">
                      <h3 className="font-bold text-green-400 mb-3 flex items-center gap-2">
                        <CheckCircle size={18} /> Strong Topics
                      </h3>
                      <div className="space-y-2">
                        {strongTopics.map(t => (
                          <div key={t.topic} className="flex items-center justify-between">
                            <span className="text-gray-300">{t.topic}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 rounded-full" style={{ width: `${t.rate}%` }} />
                              </div>
                              <span className="text-green-400 text-sm w-12 text-right">{t.rate}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Weak Topics - with AI Tutor links */}
                  {weakTopics.length > 0 && (
                    <div className="bg-orange-500/10 rounded-xl p-4 border border-orange-500/30">
                      <h3 className="font-bold text-orange-400 mb-3 flex items-center gap-2">
                        <Target size={18} /> Topics to Practice
                      </h3>
                      <div className="space-y-3">
                        {weakTopics.map(t => (
                          <div key={t.topic} className="flex items-center justify-between">
                            <div className="flex-1">
                              <span className="text-gray-300">{t.topic}</span>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                                  <div className="h-full bg-orange-500 rounded-full" style={{ width: `${t.rate}%` }} />
                                </div>
                                <span className="text-orange-400 text-sm w-12">{t.rate}%</span>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setWeakTopicForTutor(t.topic);
                                setShowWeeklyReport(false);
                                setActiveTab('learn');
                                // Navigate to the appropriate lesson
                                const lessonIndex = getAiLessonForTopic(t.topic);
                                setCurrentAiLesson(lessonIndex);
                                setAiLessonPhase('intro');
                                setAiMessages([{
                                  role: 'assistant',
                                  content: `👋 I noticed you've been working on **${t.topic}** challenges. Let me help you strengthen this skill!\n\nLet's review the key concepts and practice together. Ready to begin?`
                                }]);
                              }}
                              className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-medium flex items-center gap-1"
                            >
                              <BookOpen size={14} /> Practice
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* No data message */}
                  {topicStats.length === 0 && (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">📊</div>
                      <p className="text-gray-400">Complete some daily challenges to see your progress report!</p>
                    </div>
                  )}
                  
                  {/* Recent Daily Challenges */}
                  {recentDaily.length > 0 && (
                    <div className="bg-gray-800/50 rounded-xl p-4">
                      <h3 className="font-bold text-gray-300 mb-3">Recent Daily Challenges</h3>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {recentDaily.slice().reverse().map((d, i) => (
                          <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-gray-700 last:border-0">
                            <div className="flex items-center gap-3">
                              <span className="text-gray-500">{d.date}</span>
                              <span className="text-gray-300">{d.topic}</span>
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                d.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                                d.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>{d.difficulty}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-gray-400">{formatTime(d.solveTime || 0)}</span>
                              <span className={`font-medium ${d.xpEarned > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>+{d.xpEarned || 0} XP</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Recommendation */}
                  {weakTopics.length > 0 && (
                    <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl p-4 border border-purple-500/30">
                      <h3 className="font-bold text-purple-400 mb-2">💡 Recommendation</h3>
                      <p className="text-gray-300 text-sm">
                        Focus on <span className="text-orange-400 font-medium">{weakTopics[0]?.topic}</span> this week. 
                        The AI Tutor has a personalized lesson ready for you!
                      </p>
                      <button
                        onClick={() => {
                          const topic = weakTopics[0]?.topic;
                          setWeakTopicForTutor(topic);
                          setShowWeeklyReport(false);
                          setActiveTab('learn');
                          const lessonIndex = getAiLessonForTopic(topic);
                          setCurrentAiLesson(lessonIndex);
                          setAiLessonPhase('intro');
                          setAiMessages([{
                            role: 'assistant',
                            content: `👋 Based on your weekly progress, I recommend we work on **${topic}** together.\n\nThis is a skill that will unlock many advanced SQL techniques. Ready to level up?`
                          }]);
                        }}
                        className="mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium flex items-center gap-2"
                      >
                        <Zap size={16} /> Start Personalized Lesson
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
      
      {/* Admin Panel Modal */}
      {showAdminPanel && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={closeAdminPanel}>
          <div className="bg-gray-900 rounded-2xl border border-red-500/30 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-red-400">🔐 Admin Panel</h2>
              <button onClick={closeAdminPanel} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>
            
            {!isAdminAuthenticated ? (
              <div className="max-w-md mx-auto">
                <p className="text-gray-400 mb-4 text-center">Enter admin password to access user management.</p>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && authenticateAdmin()}
                  placeholder="Admin password"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white mb-3 focus:border-red-500 focus:outline-none"
                />
                {adminError && <p className="text-red-400 text-sm mb-3">{adminError}</p>}
                <button
                  onClick={authenticateAdmin}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-lg font-bold transition-all"
                >
                  Access Admin Panel
                </button>
              </div>
            ) : (
              <div>
                {/* Admin Tabs */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => { setAdminTab('users'); loadAllUsers(); }}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${adminTab === 'users' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                  >
                    👥 Users
                  </button>
                  <button
                    onClick={() => { setAdminTab('challenges'); loadAdminChallenges(); }}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${adminTab === 'challenges' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                  >
                    📅 Daily Challenges
                  </button>
                </div>
                
                {adminError && <p className="text-red-400 text-sm mb-3 p-2 bg-red-500/10 rounded">{adminError}</p>}
                
                {adminTab === 'users' ? (
                  <>
                    {/* Admin Actions Bar */}
                    <div className="flex items-center justify-between mb-4 p-3 bg-gray-800/50 rounded-lg">
                      <div className="text-sm text-gray-400">
                        <span className="font-bold text-white">{allUsers.length}</span> registered users
                      </div>
                      <div className="flex gap-2">
                        <button onClick={loadAllUsers} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm">🔄 Refresh</button>
                        <button onClick={exportAllUsers} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm">📥 Export All</button>
                      </div>
                    </div>
                    
                    {/* Password Reset Modal */}
                    {selectedUserForReset && (
                      <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <h4 className="font-bold text-yellow-400 mb-2">Reset Password for "{selectedUserForReset}"</h4>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newPasswordForReset}
                            onChange={(e) => setNewPasswordForReset(e.target.value)}
                            placeholder="New password (min 6 chars)"
                            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:border-yellow-500 focus:outline-none"
                          />
                          <button onClick={() => resetUserPassword(selectedUserForReset)} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded text-sm font-medium">Reset</button>
                          <button onClick={() => { setSelectedUserForReset(null); setNewPasswordForReset(''); }} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm">Cancel</button>
                        </div>
                      </div>
                    )}
                    
                    {/* Users Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-700 text-left">
                            <th className="py-3 px-2 text-gray-400 font-medium">Username</th>
                            <th className="py-3 px-2 text-gray-400 font-medium">XP</th>
                            <th className="py-3 px-2 text-gray-400 font-medium">Challenges</th>
                            <th className="py-3 px-2 text-gray-400 font-medium">Status</th>
                            <th className="py-3 px-2 text-gray-400 font-medium">Last Active</th>
                            <th className="py-3 px-2 text-gray-400 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allUsers.map((user, idx) => (
                            <tr key={user.username} className={`border-b border-gray-800 ${idx % 2 === 0 ? 'bg-gray-800/30' : ''}`}>
                              <td className="py-3 px-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-xs font-bold">
                                    {user.username.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <span className="font-medium">{user.username}</span>
                                    {user.hasPassword && <span className="ml-1 text-green-400 text-xs">🔒</span>}
                                    {user.username === currentUser && <span className="ml-1 text-yellow-400 text-xs">(you)</span>}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-2 text-yellow-400 font-medium">{user.xp.toLocaleString()}</td>
                              <td className="py-3 px-2">{user.challengesSolved}</td>
                              <td className="py-3 px-2">
                                {user.isPermanentLock ? (
                                  <span className="text-red-400 text-xs font-medium">🚫 LOCKED</span>
                                ) : user.isLocked ? (
                                  <span className="text-yellow-400 text-xs">⏳ Temp Lock</span>
                                ) : user.lockoutCount > 0 ? (
                                  <span className="text-orange-400 text-xs">⚠️ {user.lockoutCount}/3</span>
                                ) : (
                                  <span className="text-green-400 text-xs">✓ OK</span>
                                )}
                              </td>
                              <td className="py-3 px-2 text-gray-400 text-xs">{user.lastActive}</td>
                              <td className="py-3 px-2">
                                <div className="flex gap-1">
                                  {user.isLocked && (
                                    <button onClick={() => unlockUser(user.username)} className="px-2 py-1 bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded text-xs" title="Unlock">🔓</button>
                                  )}
                                  <button onClick={() => setSelectedUserForReset(user.username)} className="px-2 py-1 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 rounded text-xs" title="Reset password">🔑</button>
                                  <button onClick={() => exportUserData(user.username)} className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded text-xs" title="Export">📥</button>
                                  <button onClick={() => deleteUser(user.username)} className="px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded text-xs" title="Delete" disabled={user.username === currentUser}>🗑️</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {allUsers.length === 0 && <div className="text-center py-8 text-gray-500">No users found</div>}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Daily Challenges Management */}
                    <div className="flex items-center justify-between mb-4 p-3 bg-gray-800/50 rounded-lg">
                      <div className="text-sm text-gray-400">
                        <span className="font-bold text-white">{adminChallenges.length}</span> daily challenges
                        <span className="ml-2 text-yellow-400">({adminChallenges.filter(c => c.isCustom).length} custom)</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={openNewChallengeForm} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm font-medium">➕ Add New</button>
                        <button onClick={exportChallenges} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm">📥 Export</button>
                        <label className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-sm cursor-pointer">
                          📤 Import
                          <input type="file" accept=".json" onChange={importChallenges} className="hidden" />
                        </label>
                      </div>
                    </div>
                    
                    {/* Challenge Form Modal */}
                    {showChallengeForm && (
                      <div className="mb-4 p-4 bg-gray-800/80 border border-yellow-500/30 rounded-xl">
                        <h4 className="font-bold text-yellow-400 mb-4">{editingChallenge ? '✏️ Edit Challenge' : '➕ New Challenge'}</h4>
                        
                        {/* Basic Info */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Day</label>
                            <select value={challengeForm.day} onChange={e => setChallengeForm({...challengeForm, day: e.target.value})} className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm">
                              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => <option key={d}>{d}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Difficulty</label>
                            <select value={challengeForm.difficulty} onChange={e => setChallengeForm({...challengeForm, difficulty: e.target.value})} className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm">
                              {['Easy', 'Easy-Medium', 'Medium', 'Medium-Hard', 'Hard', 'Mixed'].map(d => <option key={d}>{d}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Topic *</label>
                            <input value={challengeForm.topic} onChange={e => setChallengeForm({...challengeForm, topic: e.target.value})} placeholder="e.g. JOIN Basics" className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Dataset</label>
                            <select value={challengeForm.core.dataset} onChange={e => setChallengeForm({...challengeForm, core: {...challengeForm.core, dataset: e.target.value}})} className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm">
                              {['titanic', 'movies', 'employees', 'ecommerce'].map(d => <option key={d}>{d}</option>)}
                            </select>
                          </div>
                        </div>
                        
                        {/* Warm-up Section */}
                        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                          <h5 className="font-medium text-blue-400 mb-2">🔥 Warm-up Question</h5>
                          <div className="mb-2">
                            <label className="block text-xs text-gray-400 mb-1">Type</label>
                            <select value={challengeForm.warmup.type} onChange={e => setChallengeForm({...challengeForm, warmup: {...challengeForm.warmup, type: e.target.value}})} className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm">
                              <option value="mcq">Multiple Choice</option>
                              <option value="truefalse">True/False</option>
                              <option value="debug">Debug Code</option>
                            </select>
                          </div>
                          <div className="mb-2">
                            <label className="block text-xs text-gray-400 mb-1">Question</label>
                            <input value={challengeForm.warmup.question} onChange={e => setChallengeForm({...challengeForm, warmup: {...challengeForm.warmup, question: e.target.value}})} placeholder="Enter warm-up question" className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm" />
                          </div>
                          {challengeForm.warmup.type !== 'truefalse' && (
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              {challengeForm.warmup.options.map((opt, i) => (
                                <div key={i} className="flex items-center gap-1">
                                  <input type="radio" name="warmupCorrect" checked={challengeForm.warmup.correct === i} onChange={() => setChallengeForm({...challengeForm, warmup: {...challengeForm.warmup, correct: i}})} />
                                  <input value={opt} onChange={e => { const opts = [...challengeForm.warmup.options]; opts[i] = e.target.value; setChallengeForm({...challengeForm, warmup: {...challengeForm.warmup, options: opts}}); }} placeholder={`Option ${i+1}`} className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs" />
                                </div>
                              ))}
                            </div>
                          )}
                          {challengeForm.warmup.type === 'truefalse' && (
                            <div className="flex gap-4 mb-2">
                              <label className="flex items-center gap-2"><input type="radio" name="warmupTF" checked={challengeForm.warmup.correct === true} onChange={() => setChallengeForm({...challengeForm, warmup: {...challengeForm.warmup, correct: true}})} /> True</label>
                              <label className="flex items-center gap-2"><input type="radio" name="warmupTF" checked={challengeForm.warmup.correct === false} onChange={() => setChallengeForm({...challengeForm, warmup: {...challengeForm.warmup, correct: false}})} /> False</label>
                            </div>
                          )}
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Explanation</label>
                            <input value={challengeForm.warmup.explanation} onChange={e => setChallengeForm({...challengeForm, warmup: {...challengeForm.warmup, explanation: e.target.value}})} placeholder="Explain the answer" className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm" />
                          </div>
                        </div>
                        
                        {/* Core Challenge Section */}
                        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                          <h5 className="font-medium text-yellow-400 mb-2">💻 SQL Challenge</h5>
                          <div className="grid grid-cols-2 gap-3 mb-2">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Title *</label>
                              <input value={challengeForm.core.title} onChange={e => setChallengeForm({...challengeForm, core: {...challengeForm.core, title: e.target.value}})} placeholder="e.g. Find Top Customers" className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Concept</label>
                              <input value={challengeForm.core.concept} onChange={e => setChallengeForm({...challengeForm, core: {...challengeForm.core, concept: e.target.value}})} placeholder="e.g. GROUP BY with HAVING" className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm" />
                            </div>
                          </div>
                          <div className="mb-2">
                            <label className="block text-xs text-gray-400 mb-1">Description (use **bold** for emphasis)</label>
                            <textarea value={challengeForm.core.description} onChange={e => setChallengeForm({...challengeForm, core: {...challengeForm.core, description: e.target.value}})} placeholder="Describe the challenge..." rows={2} className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm" />
                          </div>
                          <div className="mb-2">
                            <label className="block text-xs text-gray-400 mb-1">Solution SQL *</label>
                            <textarea value={challengeForm.core.solution} onChange={e => setChallengeForm({...challengeForm, core: {...challengeForm.core, solution: e.target.value}})} placeholder="SELECT ... FROM ..." rows={2} className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm font-mono" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Hint</label>
                            <input value={challengeForm.core.hint} onChange={e => setChallengeForm({...challengeForm, core: {...challengeForm.core, hint: e.target.value}})} placeholder="A helpful hint for users" className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm" />
                          </div>
                        </div>
                        
                        {/* Insight Check Section */}
                        <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                          <h5 className="font-medium text-purple-400 mb-2">🧠 Insight Check</h5>
                          <div className="mb-2">
                            <label className="block text-xs text-gray-400 mb-1">Question</label>
                            <input value={challengeForm.insight.question} onChange={e => setChallengeForm({...challengeForm, insight: {...challengeForm.insight, question: e.target.value}})} placeholder="Test conceptual understanding" className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm" />
                          </div>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            {challengeForm.insight.options.map((opt, i) => (
                              <div key={i} className="flex items-center gap-1">
                                <input type="radio" name="insightCorrect" checked={challengeForm.insight.correct === i} onChange={() => setChallengeForm({...challengeForm, insight: {...challengeForm.insight, correct: i}})} />
                                <input value={opt} onChange={e => { const opts = [...challengeForm.insight.options]; opts[i] = e.target.value; setChallengeForm({...challengeForm, insight: {...challengeForm.insight, options: opts}}); }} placeholder={`Option ${i+1}`} className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs" />
                              </div>
                            ))}
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Explanation</label>
                            <input value={challengeForm.insight.explanation} onChange={e => setChallengeForm({...challengeForm, insight: {...challengeForm.insight, explanation: e.target.value}})} placeholder="Explain why this is correct" className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm" />
                          </div>
                        </div>
                        
                        {/* Form Actions */}
                        <div className="flex gap-2">
                          <button onClick={saveChallengeForm} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-medium">💾 Save Challenge</button>
                          <button onClick={() => { setShowChallengeForm(false); setEditingChallenge(null); resetChallengeForm(); setAdminError(''); }} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded">Cancel</button>
                        </div>
                      </div>
                    )}
                    
                    {/* Challenges List */}
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {adminChallenges.map((challenge, idx) => (
                        <div key={challenge.id} className={`p-3 rounded-lg border ${challenge.isCustom ? 'bg-yellow-500/5 border-yellow-500/30' : 'bg-gray-800/50 border-gray-700'}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-white">#{idx + 1}</span>
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  challenge.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                                  challenge.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                  challenge.difficulty === 'Hard' ? 'bg-red-500/20 text-red-400' :
                                  'bg-gray-500/20 text-gray-400'
                                }`}>{challenge.difficulty}</span>
                                <span className="text-gray-400 text-xs">{challenge.day}</span>
                                {challenge.isCustom && <span className="px-1.5 py-0.5 bg-yellow-500/30 text-yellow-400 rounded text-xs">Custom</span>}
                              </div>
                              <p className="font-medium text-yellow-400">{challenge.core?.title || challenge.topic}</p>
                              <p className="text-xs text-gray-400 mt-1">{challenge.topic} • {challenge.core?.dataset}</p>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <button onClick={() => openEditChallengeForm(challenge)} className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded text-xs" title="Edit">✏️</button>
                              <button onClick={() => duplicateChallenge(challenge)} className="px-2 py-1 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 rounded text-xs" title="Duplicate">📋</button>
                              {challenge.isCustom && (
                                <button onClick={() => deleteChallenge(challenge.id)} className="px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded text-xs" title="Delete">🗑️</button>
                              )}
                            </div>
                          </div>
                          
                          {/* Expandable Details */}
                          <details className="mt-2">
                            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">View details</summary>
                            <div className="mt-2 p-2 bg-gray-900/50 rounded text-xs space-y-2">
                              <div>
                                <span className="text-blue-400">Warm-up:</span>
                                <span className="text-gray-300 ml-1">{challenge.warmup?.question}</span>
                              </div>
                              <div>
                                <span className="text-yellow-400">Challenge:</span>
                                <span className="text-gray-300 ml-1">{challenge.core?.description}</span>
                              </div>
                              <div>
                                <span className="text-green-400">Solution:</span>
                                <code className="text-green-300 ml-1 bg-gray-800 px-1 rounded">{challenge.core?.solution}</code>
                              </div>
                              <div>
                                <span className="text-purple-400">Insight:</span>
                                <span className="text-gray-300 ml-1">{challenge.insight?.question}</span>
                              </div>
                            </div>
                          </details>
                        </div>
                      ))}
                      
                      {adminChallenges.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          No challenges found. Click "Add New" to create one!
                        </div>
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="mt-4 p-3 bg-gray-800/50 rounded-lg text-xs text-gray-500">
                      <p><strong>💡 Tip:</strong> Custom challenges are stored in your browser. Export them to save a backup!</p>
                      <p className="mt-1"><strong>📅 Schedule:</strong> Challenges cycle through in order. Add more to extend the rotation.</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowProfile(false)}>
          <div className="bg-gray-900 rounded-2xl border border-purple-500/30 p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">👤 Profile</h2>
              <button onClick={() => setShowProfile(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            
            {/* User Info */}
            <div className="flex items-center gap-4 mb-6 p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-2xl font-bold">
                {isGuest ? '👤' : currentUser?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold">{isGuest ? 'Guest User' : currentUser}</h3>
                <p className="text-purple-300">{currentLevel.name} • {xp} XP</p>
              </div>
              {/* Status Badge */}
              {isGuest ? (
                <div className="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
                  ⚠️ Not saved
                </div>
              ) : (
                <div className={`px-2 py-1 rounded-full text-xs ${isSupabaseConfigured() ? 'bg-green-500/20 text-green-400' : 'bg-gray-600/50 text-gray-400'}`}>
                  {isSupabaseConfigured() ? '☁️ Synced' : '💾 Local'}
                </div>
              )}
            </div>
            
            {/* Guest Mode Warning */}
            {isGuest && (
              <div className="mb-4 p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl">
                <p className="text-yellow-400 font-medium mb-2 flex items-center gap-2">
                  <AlertCircle size={18} /> Your progress isn't saved
                </p>
                <p className="text-gray-400 text-sm mb-3">Create a free account to keep your {xp} XP and {solvedChallenges.size} solved challenges forever.</p>
                <button
                  onClick={() => {
                    setShowProfile(false);
                    setSignupPromptReason('profile');
                    setShowSignupPrompt(true);
                  }}
                  className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-bold text-white transition-all"
                >
                  Create Account & Save Progress
                </button>
              </div>
            )}
            
            {/* Cloud Sync Info - Only show if not guest and not configured */}
            {!isGuest && !isSupabaseConfigured() && (
              <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-xs text-yellow-400 font-medium mb-1">⚠️ Local Storage Only</p>
                <p className="text-xs text-gray-400">Your progress is saved on this device only. To sync across devices, set up cloud sync in config.js</p>
              </div>
            )}
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-gray-800/50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-purple-400">{queryCount}</p>
                <p className="text-xs text-gray-400">Queries</p>
              </div>
              <div className="bg-gray-800/50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-400">{solvedChallenges.size}</p>
                <p className="text-xs text-gray-400">Challenges</p>
              </div>
              <div className="bg-gray-800/50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-cyan-400">{completedAiLessons.size}</p>
                <p className="text-xs text-gray-400">AI Lessons</p>
              </div>
              <div className="bg-gray-800/50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-yellow-400">{unlockedAchievements.size}</p>
                <p className="text-xs text-gray-400">Achievements</p>
              </div>
            </div>
            
            {/* Query History */}
            <div className="mb-6">
              <h3 className="font-bold mb-3 flex items-center gap-2"><History size={18} /> Recent Queries</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {queryHistory.slice(-10).reverse().map((entry, i) => (
                  <div key={i} className={`p-2 rounded-lg text-sm font-mono ${entry.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs ${entry.success ? 'text-green-400' : 'text-red-400'}`}>
                        {entry.success ? '✓' : '✗'} {entry.context}
                      </span>
                      <span className="text-xs text-gray-500">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-gray-300 truncate">{entry.sql}</p>
                  </div>
                ))}
                {queryHistory.length === 0 && <p className="text-gray-500 text-sm">No queries yet</p>}
              </div>
            </div>
            
            {/* Change Password Section */}
            <div className="mb-4">
              <button
                onClick={() => {
                  setShowChangePassword(!showChangePassword);
                  setChangePasswordError('');
                  setChangePasswordSuccess('');
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="w-full py-2 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded-lg text-gray-300 font-medium flex items-center justify-center gap-2 text-sm"
              >
                🔑 {showChangePassword ? 'Cancel' : 'Change Password'}
              </button>
              
              {showChangePassword && (
                <div className="mt-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Current Password</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                      />
                      {/* Password Strength Meter */}
                      {newPassword && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-600 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-300 ${
                                  getPasswordStrength(newPassword).color === 'red' ? 'bg-red-500' :
                                  getPasswordStrength(newPassword).color === 'orange' ? 'bg-orange-500' :
                                  getPasswordStrength(newPassword).color === 'yellow' ? 'bg-yellow-500' :
                                  'bg-green-500'
                                }`}
                                style={{ width: `${getPasswordStrength(newPassword).percent}%` }}
                              />
                            </div>
                            <span className={`text-xs ${
                              getPasswordStrength(newPassword).color === 'red' ? 'text-red-400' :
                              getPasswordStrength(newPassword).color === 'orange' ? 'text-orange-400' :
                              getPasswordStrength(newPassword).color === 'yellow' ? 'text-yellow-400' :
                              'text-green-400'
                            }`}>
                              {getPasswordStrength(newPassword).label}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                      />
                      {confirmPassword && newPassword && (
                        <p className={`text-xs mt-1 ${confirmPassword === newPassword ? 'text-green-400' : 'text-red-400'}`}>
                          {confirmPassword === newPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                        </p>
                      )}
                    </div>
                    
                    {changePasswordError && (
                      <p className="text-red-400 text-xs">{changePasswordError}</p>
                    )}
                    {changePasswordSuccess && (
                      <p className="text-green-400 text-xs">{changePasswordSuccess}</p>
                    )}
                    
                    <button
                      onClick={handleChangePassword}
                      disabled={!currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                      className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white text-sm font-medium transition-all"
                    >
                      Update Password
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Sync Profile Section */}
            <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
              <p className="text-xs text-gray-400 mb-2">📱 Sync profile across devices:</p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const userData = localStorage.getItem(`sqlquest_user_${currentUser}`);
                    if (userData) {
                      const exportData = {
                        username: currentUser,
                        data: JSON.parse(userData),
                        exportedAt: new Date().toISOString()
                      };
                      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `sqlquest_${currentUser}_profile.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }
                  }}
                  className="flex-1 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 rounded-lg text-blue-400 font-medium text-xs"
                >
                  📤 Export Profile
                </button>
                <label className="flex-1 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/50 rounded-lg text-green-400 font-medium text-xs cursor-pointer flex items-center justify-center">
                  📥 Import Profile
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                          try {
                            const importData = JSON.parse(event.target.result);
                            if (importData.username && importData.data) {
                              // Check if importing for current user or different user
                              if (importData.username === currentUser) {
                                localStorage.setItem(`sqlquest_user_${currentUser}`, JSON.stringify(importData.data));
                                // Reload user session
                                window.location.reload();
                              } else {
                                if (confirm(`This profile is for "${importData.username}". Import and switch to this user?`)) {
                                  localStorage.setItem(`sqlquest_user_${importData.username}`, JSON.stringify(importData.data));
                                  localStorage.setItem('sqlquest_user', importData.username);
                                  window.location.reload();
                                }
                              }
                            } else {
                              alert('Invalid profile file');
                            }
                          } catch (err) {
                            alert('Error reading profile file');
                          }
                        };
                        reader.readAsText(file);
                      }
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400 font-medium flex items-center justify-center gap-2"
            >
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>
      )}
      
      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowApiKeyModal(false)}>
          <div className="bg-gray-900 rounded-2xl border border-purple-500/30 p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">🔑 AI Settings</h2>
              <button onClick={() => setShowApiKeyModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            
            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-300">
                <strong>Current Mode:</strong> {useAI ? '🤖 AI Tutor (Real Claude)' : '📚 Static Content'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {useAI ? 'Using your Claude API key for personalized tutoring' : 'Using pre-written lesson content (no API key required)'}
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Claude API Key</label>
              <input
                type="password"
                placeholder="sk-ant-api03-..."
                defaultValue={apiKey}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none text-sm font-mono"
                id="api-key-input"
              />
              <p className="text-xs text-gray-500 mt-2">
                Get your API key from <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">console.anthropic.com</a>
              </p>
            </div>
            
            <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-xs text-yellow-300">
                ⚠️ Your API key is stored locally in your browser and sent directly to Anthropic. It never touches our servers.
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const input = document.getElementById('api-key-input');
                  saveApiKey(input?.value || '');
                }}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium"
              >
                {apiKey ? 'Update Key' : 'Save Key'}
              </button>
              {apiKey && (
                <button
                  onClick={() => saveApiKey('')}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400"
                >
                  Remove
                </button>
              )}
            </div>
            
            {!useAI && (
              <p className="text-xs text-center text-gray-500 mt-4">
                Without an API key, you'll still get great lessons with our static content!
              </p>
            )}
          </div>
        </div>
      )}
      
      <header className="bg-black/30 border-b border-purple-500/30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center"><Database size={24} /></div>
            <div><h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">SQL Quest</h1><p className="text-xs text-gray-400">Real Data • Real SQL</p></div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2"><Flame className={streak > 0 ? 'text-orange-400' : 'text-gray-600'} size={18} /><span className="font-bold">{streak}</span></div>
            <div className="flex gap-1">{[1,2,3].map(i => <Heart key={i} size={16} className={i <= lives ? 'text-red-500 fill-red-500' : 'text-gray-600'} />)}</div>
            <div className="w-28"><XPBar current={xp} max={nextLevel.minXP} level={currentLevel} /></div>
            <button 
              onClick={() => setShowApiKeyModal(true)} 
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 ${useAI ? 'bg-green-500/20 border border-green-500/50 text-green-400' : 'bg-gray-700/50 border border-gray-600 text-gray-400 hover:border-purple-500/50'}`}
              title={useAI ? "AI Mode Active - Click to manage" : "Click to add API key for AI mode"}
            >
              {useAI ? '🤖 AI On' : '⚡ Static'}
            </button>
            <button onClick={() => setShowProfile(true)} className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg border border-purple-500/30">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isGuest ? 'bg-yellow-500/50' : 'bg-gradient-to-br from-purple-500 to-pink-500'}`}>
                {isGuest ? '👤' : currentUser?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium hidden sm:inline">{isGuest ? 'Guest' : currentUser}</span>
              {isGuest && <span className="text-xs bg-yellow-500/30 text-yellow-400 px-1.5 py-0.5 rounded hidden sm:inline">unsaved</span>}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Guest Mode Banner */}
        {isGuest && (
          <div className="mb-4 p-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <AlertCircle size={20} className="text-yellow-400" />
              </div>
              <div>
                <p className="font-medium text-yellow-400">Playing as Guest</p>
                <p className="text-sm text-gray-400">Your progress won't be saved. Create a free account to keep it!</p>
              </div>
            </div>
            <button
              onClick={() => {
                setSignupPromptReason('banner');
                setShowSignupPrompt(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-medium text-white text-sm transition-all whitespace-nowrap"
            >
              Save Progress
            </button>
          </div>
        )}
        
        {/* Daily Challenge Banner */}
        {todaysChallenge && (
          <button
            onClick={openDailyChallenge}
            className={`w-full mb-4 p-3 rounded-xl border transition-all flex items-center justify-between ${
              isDailyCompleted 
                ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20' 
                : 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30 hover:from-yellow-500/30 hover:to-orange-500/30 animate-pulse'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDailyCompleted ? 'bg-green-500/30' : 'bg-yellow-500/30'}`}>
                {isDailyCompleted ? <CheckCircle size={20} className="text-green-400" /> : <Sun size={20} className="text-yellow-400" />}
              </div>
              <div className="text-left">
                <p className={`font-bold ${isDailyCompleted ? 'text-green-400' : 'text-yellow-400'}`}>
                  {isDailyCompleted ? '✓ Daily Challenge Complete!' : 
                   loadDailyProgress() ? '⏸️ Resume Daily Challenge' : '☀️ Daily Challenge Available!'}
                </p>
                <p className="text-sm text-gray-400">
                  {isDailyCompleted 
                    ? `New challenge in ${timeUntilReset.hours}h ${timeUntilReset.minutes}m` 
                    : loadDailyProgress()
                      ? `Progress saved - ${formatTime(loadDailyProgress()?.timer || 0)} elapsed`
                      : `"${todaysChallenge.core?.title || 'Daily Challenge'}" - Earn 50 XP`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {dailyStreak > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 rounded-full">
                  <Flame size={14} className="text-orange-400" />
                  <span className="text-orange-400 text-sm font-bold">{dailyStreak}</span>
                </div>
              )}
              <ChevronRight size={20} className="text-gray-400" />
            </div>
          </button>
        )}
        
        {/* Weekly Report Button */}
        {dailyChallengeHistory.length > 0 && (
          <button
            onClick={() => setShowWeeklyReport(true)}
            className="w-full mb-4 p-3 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-500/30">
                <BarChart3 size={20} className="text-blue-400" />
              </div>
              <div className="text-left">
                <p className="font-bold text-blue-400">📊 Weekly Progress Report</p>
                <p className="text-sm text-gray-400">View your stats, strengths & areas to improve</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </button>
        )}
        
        <div className="flex gap-2 mb-4 flex-wrap">
          {[{ id: 'learn', label: '🤖 AI Tutor' }, { id: 'exercises', label: '📝 Exercises' }, { id: 'challenges', label: '⚔️ Challenges' }, { id: 'achievements', label: '🏆 Stats' }, { id: 'leaderboard', label: '👑 Leaderboard' }].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === t.id ? 'bg-purple-600' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>{t.label}</button>
          ))}
        </div>

        {activeTab === 'learn' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Lesson List */}
            <div className="lg:col-span-1">
              <div className="bg-black/30 rounded-xl border border-cyan-500/30 p-4">
                <h2 className="font-bold mb-3 flex items-center gap-2">
                  <BookOpen size={18} className="text-cyan-400" /> AI Lessons
                </h2>
                <div className={`text-xs px-2 py-1 rounded mb-2 ${useAI ? 'bg-green-500/20 text-green-400' : 'bg-gray-700/50 text-gray-400'}`}>
                  {useAI ? '🤖 Real AI Tutor' : '📚 Static Mode'} 
                  <button onClick={() => setShowApiKeyModal(true)} className="ml-1 underline">change</button>
                </div>
                <p className="text-xs text-gray-400 mb-3">{completedAiLessons.size}/{aiLessons.length} completed</p>
                <div className="space-y-1">
                  {aiLessons.map((lesson, i) => {
                    const isCompleted = completedAiLessons.has(lesson.id);
                    const isActive = currentAiLesson === i && aiMessages.length > 0;
                    const isInProgress = currentAiLesson === i && aiMessages.length > 0 && !isCompleted;
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => startAiLesson(i)}
                        className={`w-full p-2 rounded-lg text-left transition-all text-sm ${
                          isActive
                            ? 'bg-cyan-500/30 border border-cyan-500'
                            : isCompleted
                              ? 'bg-green-500/10 border border-green-500/30'
                              : 'hover:bg-gray-700/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`font-mono text-xs ${isCompleted ? 'text-green-400' : 'text-cyan-400'}`}>#{lesson.id}</span>
                          <span className="flex-1 truncate">{lesson.title}</span>
                          {isCompleted && <CheckCircle size={14} className="text-green-400" />}
                          {isInProgress && <span className="text-xs text-yellow-400">●</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
                
                {/* Progress */}
                {aiMessages.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p className="text-xs text-gray-400 mb-2">Current Session</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-yellow-400">Coding:</span>
                        <span>{consecutiveCorrect}/3 🔥</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Total asked:</span>
                        <span>{aiQuestionCount} (✓{aiCorrectCount})</span>
                      </div>
                      {(aiLessonPhase === 'comprehension' || aiLessonPhase === 'comprehension_feedback' || comprehensionCount > 0) && (
                        <>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-purple-400">Concepts:</span>
                            <span>{comprehensionConsecutive}/3 🔥</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Total asked:</span>
                            <span>{comprehensionCount} (✓{comprehensionCorrect})</span>
                          </div>
                        </>
                      )}
                      {lessonAttempts > 0 && (
                        <div className="flex items-center justify-between text-orange-400 mt-2">
                          <span>Attempts:</span>
                          <span>{lessonAttempts + 1}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-700">
                      <p className="text-xs text-gray-500">Phase: {
                        aiLessonPhase === 'comprehension' ? '🧠 Concept Check' :
                        aiLessonPhase === 'comprehension_feedback' ? '📝 Review' :
                        aiLessonPhase
                      }</p>
                      {(aiLessonPhase === 'practice' || aiLessonPhase === 'feedback') && (
                        <p className="text-xs text-gray-600 mt-1">Get 3 correct in a row to advance!</p>
                      )}
                      {(aiLessonPhase === 'comprehension' || aiLessonPhase === 'comprehension_feedback') && (
                        <p className="text-xs text-gray-600 mt-1">Get 3 correct to complete lesson!</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className="lg:col-span-3 space-y-4">
              {aiMessages.length === 0 ? (
                <div className="bg-black/30 rounded-xl border border-cyan-500/30 p-8 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Zap size={40} className="text-white" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">AI SQL Tutor</h2>
                  <p className="text-gray-400 mb-6 max-w-md mx-auto">
                    Learn SQL interactively with your personal AI tutor. Each lesson includes teaching, examples, and practice questions with real-time feedback.
                  </p>
                  
                  {/* Show progress if user has completed lessons */}
                  {completedAiLessons.size > 0 && (
                    <div className="mb-6 p-4 bg-green-500/10 rounded-xl border border-green-500/30 max-w-md mx-auto">
                      <p className="text-green-400 font-medium mb-2">Welcome back! 🎉</p>
                      <p className="text-sm text-gray-400">
                        You've completed {completedAiLessons.size} of {aiLessons.length} lessons
                      </p>
                      <div className="w-full h-2 bg-gray-700 rounded-full mt-2 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-500" 
                          style={{ width: `${(completedAiLessons.size / aiLessons.length) * 100}%` }} 
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-3 justify-center flex-wrap">
                    {completedAiLessons.size > 0 && completedAiLessons.size < aiLessons.length ? (
                      <>
                        <button
                          onClick={() => {
                            // Find next incomplete lesson
                            const nextLesson = aiLessons.findIndex(l => !completedAiLessons.has(l.id));
                            startAiLesson(nextLesson >= 0 ? nextLesson : 0);
                          }}
                          className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-bold text-white hover:from-cyan-600 hover:to-blue-600 transition-all"
                        >
                          Continue Learning →
                        </button>
                        <button
                          onClick={() => startAiLesson(0)}
                          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-medium text-white transition-all"
                        >
                          Start Over
                        </button>
                      </>
                    ) : completedAiLessons.size >= aiLessons.length ? (
                      <>
                        <button
                          onClick={() => startAiLesson(0)}
                          className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-bold text-white hover:from-cyan-600 hover:to-blue-600 transition-all"
                        >
                          Review Lessons 🔄
                        </button>
                        <p className="w-full text-green-400 mt-2">🏆 All lessons completed!</p>
                      </>
                    ) : (
                      <button
                        onClick={() => startAiLesson(0)}
                        className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-bold text-white hover:from-cyan-600 hover:to-blue-600 transition-all"
                      >
                        Start Learning →
                      </button>
                    )}
                  </div>
                  
                  <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-left max-w-2xl mx-auto">
                    <div className="bg-gray-800/50 p-3 rounded-lg">
                      <p className="text-cyan-400 font-bold text-lg">10</p>
                      <p className="text-xs text-gray-400">Lessons</p>
                    </div>
                    <div className="bg-gray-800/50 p-3 rounded-lg">
                      <p className="text-green-400 font-bold text-lg">Interactive</p>
                      <p className="text-xs text-gray-400">Teaching</p>
                    </div>
                    <div className="bg-gray-800/50 p-3 rounded-lg">
                      <p className="text-yellow-400 font-bold text-lg">Real-time</p>
                      <p className="text-xs text-gray-400">Feedback</p>
                    </div>
                    <div className="bg-gray-800/50 p-3 rounded-lg">
                      <p className="text-purple-400 font-bold text-lg">+50 XP</p>
                      <p className="text-xs text-gray-400">Per Lesson</p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Lesson Header */}
                  <div className="bg-black/30 rounded-xl border border-cyan-500/30 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-cyan-400 mb-1">Lesson {aiLessons[currentAiLesson].id}</p>
                        <h2 className="text-xl font-bold">{aiLessons[currentAiLesson].title}</h2>
                        <p className="text-sm text-gray-400">{aiLessons[currentAiLesson].topic}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Streak indicator */}
                        {(aiLessonPhase === 'practice' || aiLessonPhase === 'feedback') && (
                          <div className="flex items-center gap-1">
                            {[0, 1, 2].map(i => (
                              <div key={i} className={`w-3 h-3 rounded-full ${i < consecutiveCorrect ? 'bg-green-500' : 'bg-gray-600'}`} />
                            ))}
                            <span className="text-xs text-gray-400 ml-1">🔥</span>
                          </div>
                        )}
                        {(aiLessonPhase === 'comprehension' || aiLessonPhase === 'comprehension_feedback') && (
                          <div className="flex items-center gap-1">
                            {[0, 1, 2].map(i => (
                              <div key={i} className={`w-3 h-3 rounded-full ${i < comprehensionConsecutive ? 'bg-purple-500' : 'bg-gray-600'}`} />
                            ))}
                            <span className="text-xs text-gray-400 ml-1">🧠</span>
                          </div>
                        )}
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          aiLessonPhase === 'intro' ? 'bg-blue-500/20 text-blue-400' :
                          aiLessonPhase === 'teaching' ? 'bg-cyan-500/20 text-cyan-400' :
                          aiLessonPhase === 'practice' ? 'bg-yellow-500/20 text-yellow-400' :
                          aiLessonPhase === 'feedback' ? 'bg-green-500/20 text-green-400' :
                          aiLessonPhase === 'comprehension' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-pink-500/20 text-pink-400'
                        }`}>
                          {aiLessonPhase === 'intro' ? '👋 Introduction' :
                           aiLessonPhase === 'teaching' ? '📖 Learning' :
                           aiLessonPhase === 'practice' ? '✍️ Practice' :
                           aiLessonPhase === 'feedback' ? '💬 Feedback' :
                           aiLessonPhase === 'comprehension' ? '🧠 Comprehension' :
                           '📝 Review'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Chat Messages */}
                  <div className="bg-black/30 rounded-xl border border-gray-700 p-4 h-80 overflow-y-auto">
                    <div className="space-y-4">
                      {aiMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] p-3 rounded-xl ${
                            msg.role === 'user' 
                              ? 'bg-purple-500/20 border border-purple-500/30' 
                              : 'bg-cyan-500/10 border border-cyan-500/30'
                          }`}>
                            {msg.role === 'assistant' && (
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                                  <Zap size={12} />
                                </div>
                                <span className="text-xs text-cyan-400 font-medium">AI Tutor</span>
                              </div>
                            )}
                            <div className="text-sm whitespace-pre-wrap">
                              {msg.content
                                .replace(/\*\*/g, '') // Remove markdown bold
                                .replace(/\*/g, '')   // Remove markdown italic
                                .split('```').map((part, j) => 
                                j % 2 === 1 ? (
                                  <pre key={j} className="bg-gray-900 text-green-400 p-2 rounded my-2 overflow-x-auto font-mono text-xs">
                                    {part.replace(/^sql\n?/, '')}
                                  </pre>
                                ) : (
                                  <span key={j}>
                                    {part.split(/(QUESTION:)/g).map((segment, k) => 
                                      segment === 'QUESTION:' ? (
                                        <span key={k} className="block mt-4 mb-2 text-yellow-400 font-bold text-base">📝 QUESTION:</span>
                                      ) : (
                                        <span key={k}>{segment}</span>
                                      )
                                    )}
                                  </span>
                                )
                              )}
                            </div>
                            {/* Show expected output inline for the last question */}
                            {msg.role === 'assistant' && i === aiMessages.length - 1 && (aiLessonPhase === 'practice' || aiLessonPhase === 'feedback') && !aiLoading && aiExpectedResult.rows.length > 0 && expectedResultMessageId === i && (
                              <div className="mt-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                                <p className="text-xs text-blue-300 font-medium mb-2">📋 Expected Output ({aiExpectedResult.rows.length} rows)</p>
                                <div className="overflow-auto max-h-32">
                                  <table className="min-w-full text-xs border border-blue-500/30">
                                    <thead className="bg-blue-500/20">
                                      <tr>
                                        {aiExpectedResult.columns.map((col, ci) => (
                                          <th key={ci} className="px-2 py-1 text-left font-medium text-blue-300 border-b border-blue-500/30">{col}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {aiExpectedResult.rows.slice(0, 5).map((row, ri) => (
                                        <tr key={ri} className="hover:bg-blue-500/10">
                                          {row.map((cell, ci) => (
                                            <td key={ci} className="px-2 py-1 border-b border-blue-500/20 text-gray-300">
                                              {cell === null ? <span className="text-gray-500 italic">NULL</span> : formatCell(cell)}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  {aiExpectedResult.rows.length > 5 && (
                                    <p className="text-xs text-blue-400 mt-1">+{aiExpectedResult.rows.length - 5} more rows</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {aiLoading && (
                        <div className="flex justify-start">
                          <div className="bg-cyan-500/10 border border-cyan-500/30 p-3 rounded-xl">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" />
                              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SQL Editor for Practice */}
                  {(aiLessonPhase === 'practice' || aiLessonPhase === 'feedback') && (
                    <div className="space-y-4">
                      {/* Submit Answer Section */}
                      <div className="bg-black/30 rounded-xl border border-green-500/30 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-green-300 text-sm">✍️ Submit Your Answer</h3>
                          <span className="text-xs text-gray-500">Use the SQL Sandbox below to test first!</span>
                        </div>
                        <p className="text-xs text-gray-400 mb-3">When you're confident in your answer, paste it here and submit for AI feedback.</p>
                        <textarea
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Paste your final SQL answer here..."
                          className="w-full h-20 p-3 font-mono text-sm bg-gray-900 text-green-400 rounded-lg border-2 border-gray-600 focus:border-green-500 focus:outline-none resize-none"
                          spellCheck={false}
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={runAiQuery}
                            disabled={aiLoading || !query.trim()}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <Play size={16} /> Test
                          </button>
                          <button
                            onClick={submitAiQuery}
                            disabled={aiLoading || !query.trim()}
                            className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <CheckCircle size={16} /> Submit Answer
                          </button>
                        </div>
                      </div>

                      {/* User's Result Table */}
                      {showAiComparison && (
                        <div className={`bg-black/30 rounded-xl border p-4 ${
                          aiUserResult.error 
                            ? 'border-red-500/30' 
                            : aiExpectedResult.rows.length === 0
                              ? 'border-blue-500/30'  // No expected to compare
                              : JSON.stringify(aiUserResult.rows) === JSON.stringify(aiExpectedResult.rows)
                                ? 'border-green-500/30'
                                : 'border-orange-500/30'
                        }`}>
                          <h3 className={`font-bold mb-3 text-sm flex items-center gap-2 ${
                            aiUserResult.error 
                              ? 'text-red-300' 
                              : aiExpectedResult.rows.length === 0
                                ? 'text-blue-300'
                                : JSON.stringify(aiUserResult.rows) === JSON.stringify(aiExpectedResult.rows)
                                  ? 'text-green-300'
                                  : 'text-orange-300'
                          }`}>
                            {aiUserResult.error ? (
                              <>❌ Error</>
                            ) : aiExpectedResult.rows.length === 0 ? (
                              <>📊 Your Output ({aiUserResult.rows.length} rows)</>
                            ) : JSON.stringify(aiUserResult.rows) === JSON.stringify(aiExpectedResult.rows) ? (
                              <>✅ Your Output - Correct! ({aiUserResult.rows.length} rows)</>
                            ) : (
                              <>⚠️ Your Output ({aiUserResult.rows.length} rows) - Check the differences</>
                            )}
                          </h3>
                          
                          {aiUserResult.error ? (
                            <div className="p-3 bg-red-500/10 rounded-lg">
                              <p className="text-red-400 text-sm font-mono">{aiUserResult.error}</p>
                            </div>
                          ) : aiUserResult.rows.length > 0 ? (
                            <div className="overflow-auto max-h-48">
                              <table className="min-w-full text-xs border border-gray-600">
                                <thead className={`${
                                  aiExpectedResult.rows.length === 0
                                    ? 'bg-blue-500/20'
                                    : JSON.stringify(aiUserResult.rows) === JSON.stringify(aiExpectedResult.rows)
                                      ? 'bg-green-500/20'
                                      : 'bg-orange-500/20'
                                }`}>
                                  <tr>
                                    {aiUserResult.columns.map((col, i) => (
                                      <th key={i} className="px-3 py-2 text-left font-medium text-gray-300 border-b border-gray-600">{col}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {aiUserResult.rows.slice(0, 10).map((row, i) => {
                                    const expectedRow = aiExpectedResult.rows[i];
                                    const noExpected = aiExpectedResult.rows.length === 0;
                                    const rowMatches = noExpected || (expectedRow && JSON.stringify(row) === JSON.stringify(expectedRow));
                                    return (
                                      <tr key={i} className={noExpected ? '' : (rowMatches ? 'bg-green-500/5' : 'bg-red-500/5')}>
                                        {row.map((cell, j) => {
                                          const cellMatches = noExpected || (expectedRow && String(cell) === String(expectedRow[j]));
                                          return (
                                            <td key={j} className={`px-3 py-1.5 border-b border-gray-700 ${cellMatches ? 'text-gray-300' : 'text-red-400'}`}>
                                              {cell === null ? <span className="text-gray-500 italic">NULL</span> : formatCell(cell)}
                                            </td>
                                          );
                                        })}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                              {aiUserResult.rows.length > 10 && (
                                <p className="text-xs text-gray-400 mt-2">Showing 10 of {aiUserResult.rows.length} rows</p>
                              )}
                            </div>
                          ) : (
                            <p className="text-gray-400 text-sm">Query returned no results.</p>
                          )}

                          {/* Comparison Summary */}
                          {!aiUserResult.error && aiExpectedResult.rows.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-700 text-xs">
                              <div className="flex gap-4">
                                <span className="text-gray-400">
                                  Expected: <span className="text-blue-400">{aiExpectedResult.rows.length} rows</span>
                                </span>
                                <span className="text-gray-400">
                                  Got: <span className={aiUserResult.rows.length === aiExpectedResult.rows.length ? 'text-green-400' : 'text-red-400'}>
                                    {aiUserResult.rows.length} rows
                                  </span>
                                </span>
                                {JSON.stringify(aiUserResult.rows) === JSON.stringify(aiExpectedResult.rows) && (
                                  <span className="text-green-400">✓ Perfect match!</span>
                                )}
                              </div>
                            </div>
                          )}
                          {!aiUserResult.error && aiExpectedResult.rows.length === 0 && aiUserResult.rows.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400">
                              Submit your answer for AI evaluation.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Chat Input */}
                  <div className="bg-black/30 rounded-xl border border-gray-700 p-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendAiMessage()}
                        placeholder={
                          aiLessonPhase === 'intro' ? "Say 'ready' to start learning..." :
                          aiLessonPhase === 'teaching' ? "Ask questions or say 'practice' when ready..." :
                          aiLessonPhase === 'practice' ? "Use the SQL Sandbox below, or ask for hints..." :
                          aiLessonPhase === 'feedback' ? "Continue or click 'Start Comprehension Check'..." :
                          aiLessonPhase === 'comprehension' ? "Explain the concept in your own words..." :
                          aiLessonPhase === 'comprehension_feedback' ? "Continue the conversation..." :
                          "Continue the conversation..."
                        }
                        disabled={aiLoading}
                        className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none disabled:opacity-50"
                      />
                      <button
                        onClick={sendAiMessage}
                        disabled={aiLoading || !aiInput.trim()}
                        className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-medium disabled:opacity-50 transition-all"
                      >
                        Send
                      </button>
                    </div>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {aiLessonPhase === 'intro' && (
                        <button onClick={() => sendQuickMessage("I'm ready to learn!", 'teaching')} className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400">
                          I'm ready! →
                        </button>
                      )}
                      {aiLessonPhase === 'teaching' && (
                        <>
                          <button onClick={() => { setAiInput("Can you give me an example?"); }} className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400">
                            Show example
                          </button>
                          <button onClick={() => sendQuickMessage("I'm ready to practice!", 'practice')} className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400">
                            Ready to practice →
                          </button>
                        </>
                      )}
                      {aiLessonPhase === 'practice' && (
                        <button onClick={() => { setAiInput("Can you give me a hint?"); }} className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400">
                          Get a hint 💡
                        </button>
                      )}
                      {aiLessonPhase === 'feedback' && consecutiveCorrect < 3 && (
                        <button onClick={() => sendQuickMessage("Give me another question!", 'practice')} className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400">
                          Next question →
                        </button>
                      )}
                      {aiLessonPhase === 'feedback' && consecutiveCorrect >= 3 && (
                        <button onClick={() => sendQuickMessage("I'm ready for the comprehension questions!", 'comprehension')} className="text-xs px-2 py-1 bg-purple-500/20 hover:bg-purple-500/30 rounded text-purple-400">
                          Start Comprehension Check 🧠
                        </button>
                      )}
                      {(aiLessonPhase === 'comprehension' || aiLessonPhase === 'comprehension_feedback') && (
                        <>
                          <span className="text-xs text-gray-500">
                            Streak: {comprehensionConsecutive}/3 🔥
                          </span>
                        </>
                      )}
                      {aiLessonPhase === 'comprehension_feedback' && comprehensionConsecutive < 3 && (
                        <button onClick={() => sendQuickMessage("Give me another concept question.", 'comprehension')} className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400">
                          Next concept question →
                        </button>
                      )}
                      {aiLessonPhase === 'comprehension_feedback' && comprehensionConsecutive >= 3 && (
                        <button 
                          onClick={() => {
                            // Complete the lesson
                            const lesson = aiLessons[currentAiLesson];
                            setXP(prev => prev + 50);
                            setCompletedAiLessons(prev => new Set([...prev, lesson.id]));
                            addToHistory(`Completed AI Lesson: ${lesson.title}`, true, 'ai-learning');
                            setAiMessages(prev => [...prev, { 
                              role: "assistant", 
                              content: `🎉 CONGRATULATIONS! You've completed "${lesson.title}"!\n\nYou earned 50 XP! ${currentAiLesson < aiLessons.length - 1 ? "\n\nReady for the next lesson? Click 'Next Lesson' to continue!\n\n💡 Tip: Check out the Exercises tab for more practice on this topic!" : "\n\nAmazing! You've completed all AI Tutor lessons!"}`
                            }]);
                          }} 
                          className="text-xs px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded text-white font-medium"
                        >
                          🎉 Complete Lesson!
                        </button>
                      )}
                      {completedAiLessons.has(aiLessons[currentAiLesson]?.id) && currentAiLesson < aiLessons.length - 1 && (
                        <button 
                          onClick={() => startAiLesson(currentAiLesson + 1)} 
                          className="text-xs px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded text-white font-medium"
                        >
                          Next Lesson →
                        </button>
                      )}
                      {/* Always show restart option */}
                      {aiLessonPhase !== 'intro' && (
                        <button onClick={() => startAiLesson(currentAiLesson, true)} className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-500">
                          ↺ Restart
                        </button>
                      )}
                    </div>
                  </div>

                  {/* SQL Sandbox - Always Available */}
                  <div className="bg-black/30 rounded-xl border border-purple-500/30 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-purple-300 text-sm flex items-center gap-2">
                        <Database size={16} /> SQL Sandbox
                      </h3>
                      <span className="text-xs text-gray-500">Test queries anytime • Table: {aiLessons[currentAiLesson]?.practiceTable}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Query Input */}
                      <div>
                        <textarea
                          value={sandboxQuery}
                          onChange={(e) => setSandboxQuery(e.target.value)}
                          onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runSandboxQuery(); }}}
                          placeholder="Write SQL here to explore the data... (Ctrl+Enter to run)"
                          className="w-full h-28 p-3 font-mono text-sm bg-gray-900 text-green-400 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none resize-none"
                          spellCheck={false}
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={runSandboxQuery}
                            disabled={!sandboxQuery.trim()}
                            className="flex-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <Play size={14} /> Run
                          </button>
                          {(aiLessonPhase === 'practice' || aiLessonPhase === 'feedback') && (
                            <button
                              onClick={copySandboxToAnswer}
                              disabled={!sandboxQuery.trim()}
                              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium text-sm disabled:opacity-50"
                              title="Copy to answer editor"
                            >
                              📋 Use as Answer
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Results */}
                      <div className="bg-gray-900/50 rounded-lg p-3 overflow-auto max-h-40">
                        {sandboxResult.error ? (
                          <div className="text-red-400 text-xs">
                            <p className="font-medium mb-1">❌ Error:</p>
                            <p className="font-mono">{sandboxResult.error}</p>
                          </div>
                        ) : sandboxResult.columns.length > 0 ? (
                          <div>
                            <p className="text-green-400 text-xs mb-2">✓ {sandboxResult.rows.length} rows</p>
                            <table className="min-w-full text-xs border border-gray-700">
                              <thead className="bg-gray-800">
                                <tr>
                                  {sandboxResult.columns.map((col, i) => (
                                    <th key={i} className="px-2 py-1 text-left font-medium text-gray-400 border-b border-gray-700">{col}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {sandboxResult.rows.slice(0, 5).map((row, i) => (
                                  <tr key={i} className="hover:bg-gray-800/50">
                                    {row.map((cell, j) => (
                                      <td key={j} className="px-2 py-1 border-b border-gray-800 text-gray-300">
                                        {cell === null ? <span className="text-gray-500">NULL</span> : formatCell(cell, 20)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {sandboxResult.rows.length > 5 && (
                              <p className="text-xs text-gray-500 mt-1">+{sandboxResult.rows.length - 5} more rows</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-xs">Run a query to see results here</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Quick table info */}
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <p className="text-xs text-gray-500 mb-1">Available columns:</p>
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          const lesson = aiLessons[currentAiLesson];
                          const ds = publicDatasets[lesson?.dataset || 'titanic'];
                          const table = ds?.tables[lesson?.practiceTable];
                          return table?.columns.map((col, i) => (
                            <span key={i} className="text-xs px-1.5 py-0.5 bg-gray-800 rounded text-gray-400 font-mono">{col}</span>
                          )) || null;
                        })()}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Exercises Tab */}
        {activeTab === 'exercises' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Lesson Selection Sidebar */}
            <div className="space-y-4">
              <div className="bg-black/30 rounded-xl border border-pink-500/30 p-4">
                <h2 className="font-bold mb-3 flex items-center gap-2 text-pink-400">
                  📚 Lessons
                </h2>
                <div className="space-y-2">
                  {aiLessons.map((lesson, idx) => {
                    const completedCount = lesson.exercises.filter((_, i) => 
                      completedExercises.has(`${lesson.id}-${i}`)
                    ).length;
                    const isComplete = completedCount === 5;
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => {
                          setSelectedExerciseLesson(idx);
                          setCurrentExerciseIndex(0);
                          setExerciseQuery('');
                          setShowExerciseResult(false);
                          setExerciseResult({ columns: [], rows: [], error: null });
                          // Load the appropriate dataset
                          if (db) {
                            if (lesson.practiceTable === 'passengers') loadDataset(db, 'titanic');
                            else if (lesson.practiceTable === 'movies') loadDataset(db, 'movies');
                            else if (lesson.practiceTable === 'employees') loadDataset(db, 'employees');
                            else loadDataset(db, 'ecommerce');
                          }
                        }}
                        className={`w-full p-3 rounded-lg text-left transition-all ${
                          selectedExerciseLesson === idx 
                            ? 'bg-pink-500/30 border border-pink-500' 
                            : 'hover:bg-gray-700/50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{lesson.title}</span>
                          {isComplete && <span className="text-green-400">✓</span>}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {[0, 1, 2, 3, 4].map(i => (
                            <div 
                              key={i} 
                              className={`w-2 h-2 rounded-full ${
                                completedExercises.has(`${lesson.id}-${i}`) 
                                  ? 'bg-green-500' 
                                  : 'bg-gray-600'
                              }`} 
                            />
                          ))}
                          <span className="text-xs text-gray-500 ml-1">{completedCount}/5</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Progress Summary */}
              <div className="bg-black/30 rounded-xl border border-gray-700 p-4">
                <h3 className="font-bold text-sm mb-2 text-gray-400">Overall Progress</h3>
                <div className="text-center">
                  <p className="text-3xl font-bold text-pink-400">
                    {completedExercises.size}/{aiLessons.length * 5}
                  </p>
                  <p className="text-xs text-gray-500">Exercises Completed</p>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all" 
                    style={{ width: `${(completedExercises.size / (aiLessons.length * 5)) * 100}%` }} 
                  />
                </div>
              </div>
            </div>

            {/* Exercise Area */}
            <div className="lg:col-span-3 space-y-4">
              {/* Lesson Header */}
              <div className="bg-black/30 rounded-xl border border-pink-500/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-bold text-pink-400">
                    {aiLessons[selectedExerciseLesson].title}
                  </h2>
                  <span className="text-sm text-gray-400">
                    Table: <code className="text-pink-300">{aiLessons[selectedExerciseLesson].practiceTable}</code>
                  </span>
                </div>
                <p className="text-gray-400 text-sm">{aiLessons[selectedExerciseLesson].topic}</p>
                
                {/* Exercise Progress Dots */}
                <div className="flex items-center gap-2 mt-4">
                  {aiLessons[selectedExerciseLesson].exercises.map((_, i) => {
                    const isCompleted = completedExercises.has(`${aiLessons[selectedExerciseLesson].id}-${i}`);
                    const isCurrent = i === currentExerciseIndex;
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          setCurrentExerciseIndex(i);
                          setExerciseQuery('');
                          setShowExerciseResult(false);
                          setExerciseResult({ columns: [], rows: [], error: null });
                        }}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold transition-all ${
                          isCompleted 
                            ? 'bg-green-500/30 text-green-400 border border-green-500' 
                            : isCurrent
                              ? 'bg-pink-500/30 text-pink-400 border border-pink-500 animate-pulse'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                      >
                        {isCompleted ? '✓' : i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Current Exercise */}
              <div className="bg-black/30 rounded-xl border border-purple-500/30 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-purple-400 font-medium">
                      Exercise {currentExerciseIndex + 1} of 5
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      aiLessons[selectedExerciseLesson].exercises[currentExerciseIndex].difficulty === 'easy' 
                        ? 'bg-green-500/20 text-green-400' 
                        : aiLessons[selectedExerciseLesson].exercises[currentExerciseIndex].difficulty === 'medium'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                    }`}>
                      {aiLessons[selectedExerciseLesson].exercises[currentExerciseIndex].difficulty === 'easy' ? '🟢 Easy' :
                       aiLessons[selectedExerciseLesson].exercises[currentExerciseIndex].difficulty === 'medium' ? '🟡 Medium' :
                       '🔴 Hard'}
                    </span>
                  </div>
                  {completedExercises.has(`${aiLessons[selectedExerciseLesson].id}-${currentExerciseIndex}`) && (
                    <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">✓ Completed</span>
                  )}
                </div>
                
                <h3 className="text-lg font-bold mb-4">
                  {aiLessons[selectedExerciseLesson].exercises[currentExerciseIndex].question}
                </h3>

                {/* Tables to Use (for JOIN exercises) */}
                {aiLessons[selectedExerciseLesson].joinTables && (
                  <div className="mb-4 p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                    <p className="text-xs text-cyan-300 font-medium mb-2">🔗 Tables to JOIN:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {Object.entries(aiLessons[selectedExerciseLesson].joinTables).map(([tableName, columns], i) => (
                        <div key={i} className="text-xs bg-gray-800/50 rounded p-2">
                          <span className="text-cyan-400 font-bold">{tableName}</span>
                          <span className="text-gray-400"> ({columns.join(', ')})</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">💡 Join key: <code className="text-cyan-300">customer_id</code></p>
                  </div>
                )}

                {/* Expected Output */}
                {db && (() => {
                  try {
                    const result = db.exec(aiLessons[selectedExerciseLesson].exercises[currentExerciseIndex].sql);
                    if (result.length > 0) {
                      return (
                        <div className="mb-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                          <p className="text-xs text-blue-300 font-medium mb-2">📋 Expected Output ({result[0].values.length} rows)</p>
                          <div className="overflow-auto max-h-40">
                            <table className="min-w-full text-xs border border-blue-500/30">
                              <thead className="bg-blue-500/20">
                                <tr>
                                  {result[0].columns.map((col, ci) => (
                                    <th key={ci} className="px-2 py-1 text-left font-medium text-blue-300 border-b border-blue-500/30">{col}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {result[0].values.slice(0, 5).map((row, ri) => (
                                  <tr key={ri} className="hover:bg-blue-500/10">
                                    {row.map((cell, ci) => (
                                      <td key={ci} className="px-2 py-1 border-b border-blue-500/20 text-gray-300">
                                        {cell === null ? <span className="text-gray-500 italic">NULL</span> : formatCell(cell, 30)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {result[0].values.length > 5 && (
                              <p className="text-xs text-blue-400 mt-1">+{result[0].values.length - 5} more rows</p>
                            )}
                          </div>
                        </div>
                      );
                    }
                  } catch (e) { return null; }
                  return null;
                })()}

                {/* Query Input */}
                <textarea
                  value={exerciseQuery}
                  onChange={(e) => setExerciseQuery(e.target.value)}
                  placeholder="Write your SQL query here..."
                  className="w-full h-28 p-3 font-mono text-sm bg-gray-900 text-green-400 rounded-lg border-2 border-gray-600 focus:border-pink-500 focus:outline-none resize-none"
                  spellCheck={false}
                />

                {/* Buttons */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => {
                      if (!exerciseQuery.trim() || !db) return;
                      try {
                        const result = db.exec(exerciseQuery);
                        setExerciseResult(result.length > 0 
                          ? { columns: result[0].columns, rows: result[0].values, error: null }
                          : { columns: [], rows: [], error: null });
                        setShowExerciseResult(true);
                      } catch (err) {
                        setExerciseResult({ columns: [], rows: [], error: err.message });
                        setShowExerciseResult(true);
                      }
                    }}
                    disabled={!exerciseQuery.trim()}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    <Play size={16} /> Test
                  </button>
                  <button
                    onClick={() => {
                      if (!exerciseQuery.trim() || !db) return;
                      try {
                        const userResult = db.exec(exerciseQuery);
                        const userValues = userResult.length > 0 ? JSON.stringify(userResult[0].values) : '[]';
                        
                        const expectedResult = db.exec(aiLessons[selectedExerciseLesson].exercises[currentExerciseIndex].sql);
                        const expectedValues = expectedResult.length > 0 ? JSON.stringify(expectedResult[0].values) : '[]';
                        
                        const isCorrect = userValues === expectedValues;
                        
                        setExerciseResult(userResult.length > 0 
                          ? { columns: userResult[0].columns, rows: userResult[0].values, error: null }
                          : { columns: [], rows: [], error: null });
                        setShowExerciseResult(true);
                        
                        if (isCorrect) {
                          const exerciseKey = `${aiLessons[selectedExerciseLesson].id}-${currentExerciseIndex}`;
                          if (!completedExercises.has(exerciseKey)) {
                            setCompletedExercises(prev => new Set([...prev, exerciseKey]));
                            setXP(prev => prev + 10);
                          }
                          
                          // Auto advance to next incomplete exercise
                          if (currentExerciseIndex < 4) {
                            setTimeout(() => {
                              setCurrentExerciseIndex(prev => prev + 1);
                              setExerciseQuery('');
                              setShowExerciseResult(false);
                              setExerciseResult({ columns: [], rows: [], error: null });
                            }, 1500);
                          }
                        }
                      } catch (err) {
                        setExerciseResult({ columns: [], rows: [], error: err.message });
                        setShowExerciseResult(true);
                      }
                    }}
                    disabled={!exerciseQuery.trim()}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle size={16} /> Submit Answer
                  </button>
                </div>

                {/* Result Display */}
                {showExerciseResult && (
                  <div className={`mt-4 p-4 rounded-lg border ${
                    exerciseResult.error 
                      ? 'bg-red-500/10 border-red-500/30' 
                      : (() => {
                          try {
                            const expectedResult = db.exec(aiLessons[selectedExerciseLesson].exercises[currentExerciseIndex].sql);
                            const expectedValues = expectedResult.length > 0 ? JSON.stringify(expectedResult[0].values) : '[]';
                            const userValues = exerciseResult.rows ? JSON.stringify(exerciseResult.rows) : '[]';
                            return userValues === expectedValues 
                              ? 'bg-green-500/10 border-green-500/30' 
                              : 'bg-orange-500/10 border-orange-500/30';
                          } catch { return 'bg-orange-500/10 border-orange-500/30'; }
                        })()
                  }`}>
                    {exerciseResult.error ? (
                      <p className="text-red-400 text-sm">❌ Error: {exerciseResult.error}</p>
                    ) : (() => {
                      try {
                        const expectedResult = db.exec(aiLessons[selectedExerciseLesson].exercises[currentExerciseIndex].sql);
                        const expectedValues = expectedResult.length > 0 ? JSON.stringify(expectedResult[0].values) : '[]';
                        const userValues = exerciseResult.rows ? JSON.stringify(exerciseResult.rows) : '[]';
                        const isCorrect = userValues === expectedValues;
                        
                        return (
                          <>
                            <p className={`text-sm font-bold mb-3 ${isCorrect ? 'text-green-400' : 'text-orange-400'}`}>
                              {isCorrect ? '✅ Correct! +10 XP' : '⚠️ Not quite right. Check your query.'}
                            </p>
                            <p className="text-xs text-gray-400 mb-2">Your Output ({exerciseResult.rows.length} rows):</p>
                            <div className="overflow-auto max-h-32">
                              <table className="min-w-full text-xs border border-gray-600">
                                <thead className="bg-gray-800">
                                  <tr>
                                    {exerciseResult.columns.map((col, ci) => (
                                      <th key={ci} className="px-2 py-1 text-left font-medium text-gray-300 border-b border-gray-600">{col}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {exerciseResult.rows.slice(0, 5).map((row, ri) => (
                                    <tr key={ri}>
                                      {row.map((cell, ci) => (
                                        <td key={ci} className="px-2 py-1 border-b border-gray-700 text-gray-300">
                                          {cell === null ? <span className="text-gray-500 italic">NULL</span> : formatCell(cell, 30)}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </>
                        );
                      } catch { return <p className="text-red-400 text-sm">Error checking result.</p>; }
                    })()}
                  </div>
                )}
              </div>

              {/* Table Schema Reference */}
              <div className="bg-black/30 rounded-xl border border-gray-700 p-4">
                <h3 className="font-bold text-sm mb-2 text-gray-400">📋 Available Tables & Columns</h3>
                {aiLessons[selectedExerciseLesson].joinTables ? (
                  <div className="space-y-3">
                    {Object.entries(aiLessons[selectedExerciseLesson].joinTables).map(([tableName, columns], i) => (
                      <div key={i} className="p-2 bg-gray-800/50 rounded-lg">
                        <p className="text-xs text-cyan-400 font-mono mb-1">{tableName}</p>
                        <div className="flex flex-wrap gap-1">
                          {columns.map((col, j) => (
                            <span key={j} className="text-xs px-1.5 py-0.5 bg-gray-700 rounded text-gray-300 font-mono">{col}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-yellow-400 mt-2">💡 Tip: Join tables using customer_id as the key</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {(() => {
                      const lesson = aiLessons[selectedExerciseLesson];
                      const tableName = lesson.practiceTable;
                      const ds = tableName === 'passengers' ? publicDatasets.titanic 
                               : tableName === 'movies' ? publicDatasets.movies
                               : tableName === 'employees' ? publicDatasets.employees
                               : publicDatasets.ecommerce;
                      const table = ds?.tables[tableName];
                      return table?.columns.map((col, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-gray-800 rounded text-gray-400 font-mono">{col}</span>
                      )) || null;
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'challenges' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Challenge List */}
            {!currentChallenge ? (
              <>
                <div className="lg:col-span-3">
                  {/* Header & Filters */}
                  <div className="bg-black/30 rounded-xl border border-orange-500/30 p-4 mb-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-bold text-orange-400">⚔️ SQL Challenges</h2>
                        <p className="text-gray-400 text-sm">LeetCode-style problems to test your skills</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">Solved: {solvedChallenges.size}/{challenges.length}</span>
                        <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500" style={{ width: `${(solvedChallenges.size / challenges.length) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                    
                    {/* Filters */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'easy', label: '🟢 Easy' },
                        { id: 'medium', label: '🟡 Medium' },
                        { id: 'hard', label: '🔴 Hard' },
                        { id: 'solved', label: '✅ Solved' },
                        { id: 'unsolved', label: '⬜ Unsolved' },
                      ].map(f => (
                        <button
                          key={f.id}
                          onClick={() => setChallengeFilter(f.id)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${challengeFilter === f.id ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Challenge Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getFilteredChallenges().map(c => {
                      const isSolved = solvedChallenges.has(c.id);
                      const diffColor = c.difficulty === 'Easy' ? 'text-green-400' : c.difficulty === 'Medium' ? 'text-yellow-400' : 'text-red-400';
                      return (
                        <button
                          key={c.id}
                          onClick={() => openChallenge(c)}
                          className={`p-4 rounded-xl border text-left transition-all hover:scale-[1.02] ${isSolved ? 'bg-green-500/10 border-green-500/50' : 'bg-gray-800/50 border-gray-700 hover:border-orange-500/50'}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-xs font-mono text-gray-500">#{c.id}</span>
                            <div className="flex items-center gap-2">
                              {isSolved && (
                                <span className="flex items-center gap-1 text-xs font-bold text-green-400 bg-green-500/20 px-2 py-0.5 rounded">
                                  <CheckCircle size={12} /> Solved
                                </span>
                              )}
                              <span className={`text-xs font-bold ${diffColor}`}>{c.difficulty}</span>
                            </div>
                          </div>
                          <h3 className={`font-bold mb-1 ${isSolved ? 'text-green-300' : 'text-white'}`}>{c.title}</h3>
                          <p className="text-xs text-gray-400 mb-2 line-clamp-2">{c.description.replace(/\*\*/g, '')}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs px-2 py-0.5 bg-gray-700 rounded text-gray-300">{c.category}</span>
                            {isSolved ? (
                              <span className="text-xs text-green-400">✓ +{c.xpReward} XP earned</span>
                            ) : (
                              <span className="text-xs text-yellow-400">+{c.xpReward} XP</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Challenge Detail View */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Back Button & Title */}
                  <div className="bg-black/30 rounded-xl border border-orange-500/30 p-4">
                    <button onClick={() => setCurrentChallenge(null)} className="text-sm text-orange-400 hover:text-orange-300 mb-3 flex items-center gap-1">
                      <ChevronLeft size={16} /> Back to Challenges
                    </button>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-mono text-gray-500">#{currentChallenge.id}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${currentChallenge.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' : currentChallenge.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                            {currentChallenge.difficulty}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-gray-700 rounded text-gray-300">{currentChallenge.category}</span>
                        </div>
                        <h2 className="text-2xl font-bold">{currentChallenge.title}</h2>
                      </div>
                      <div className="text-right">
                        <span className="text-yellow-400 font-bold">+{currentChallenge.xpReward} XP</span>
                        {solvedChallenges.has(currentChallenge.id) && <p className="text-green-400 text-sm">✅ Solved</p>}
                      </div>
                    </div>
                  </div>
                  
                  {/* Problem Description */}
                  <div className="bg-black/30 rounded-xl border border-gray-700 p-4">
                    <h3 className="font-bold mb-3 text-gray-300">📝 Problem</h3>
                    <div className="prose prose-invert prose-sm max-w-none">
                      {currentChallenge.description.split('**').map((part, i) => 
                        i % 2 === 1 ? <strong key={i} className="text-orange-400">{part}</strong> : <span key={i}>{part}</span>
                      )}
                    </div>
                    
                    <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                      <p className="text-xs text-gray-400 mb-1">Tables used:</p>
                      <div className="flex flex-wrap gap-2">
                        {currentChallenge.tables.map(t => (
                          <span key={t} className="text-sm font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">{t}</span>
                        ))}
                      </div>
                    </div>
                    
                    {/* Example */}
                    <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-500/20">
                      <p className="text-xs text-blue-300 font-medium mb-2">Example:</p>
                      <p className="text-sm text-gray-300"><strong>Input:</strong> {currentChallenge.example.input}</p>
                      <p className="text-sm text-gray-300 mt-1"><strong>Output:</strong> {currentChallenge.example.output}</p>
                    </div>
                  </div>
                  
                  {/* Expected Output */}
                  {challengeExpected.rows.length > 0 && (
                    <div className="bg-black/30 rounded-xl border border-blue-500/30 p-4">
                      <h3 className="font-bold mb-3 text-blue-300">📋 Expected Output ({challengeExpected.rows.length} rows)</h3>
                      <div className="overflow-auto max-h-48">
                        <table className="min-w-full text-xs border border-blue-500/30">
                          <thead className="bg-blue-500/20">
                            <tr>{challengeExpected.columns.map((c, i) => <th key={i} className="px-2 py-1 text-left font-medium text-blue-300 border-b border-blue-500/30">{c}</th>)}</tr>
                          </thead>
                          <tbody>
                            {challengeExpected.rows.slice(0, 15).map((row, i) => (
                              <tr key={i} className="hover:bg-blue-500/10">
                                {row.map((cell, j) => <td key={j} className="px-2 py-1 border-b border-blue-500/20 text-gray-300">{cell === null ? <span className="text-gray-500">NULL</span> : formatCell(cell)}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {challengeExpected.rows.length > 15 && <p className="text-xs text-blue-400 mt-1">Showing 15 of {challengeExpected.rows.length} rows</p>}
                      </div>
                    </div>
                  )}
                  
                  {/* SQL Editor */}
                  <div className="bg-black/30 rounded-xl border border-purple-500/30 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-gray-300">💻 Your Solution</h3>
                      <button onClick={() => setShowChallengeHint(!showChallengeHint)} className="text-sm text-yellow-400 hover:text-yellow-300">
                        {showChallengeHint ? '🙈 Hide Hint' : '💡 Show Hint'}
                      </button>
                    </div>
                    
                    {showChallengeHint && (
                      <div className="mb-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <p className="text-sm text-yellow-300">{currentChallenge.hint}</p>
                      </div>
                    )}
                    
                    <textarea
                      value={challengeQuery}
                      onChange={(e) => updateChallengeQuery(e.target.value)}
                      onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); submitChallenge(); }}}
                      placeholder="Write your SQL solution here..."
                      className="w-full h-40 p-3 font-mono text-sm bg-gray-900 text-green-400 rounded-lg border-2 border-gray-600 focus:border-purple-500 focus:outline-none resize-none"
                      spellCheck={false}
                    />
                    
                    <div className="flex gap-2 mt-3">
                      <button onClick={runChallengeQuery} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium flex items-center justify-center gap-2">
                        <Play size={16} /> Run
                      </button>
                      <button onClick={submitChallenge} className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg font-bold flex items-center justify-center gap-2">
                        <CheckCircle size={16} /> Submit
                      </button>
                    </div>
                  </div>
                  
                  {/* Result Status */}
                  {challengeStatus && (
                    <div className={`p-4 rounded-xl border ${challengeStatus === 'success' ? 'bg-green-500/10 border-green-500/50' : 'bg-red-500/10 border-red-500/50'}`}>
                      {challengeStatus === 'success' ? (
                        <div className="flex items-center gap-3">
                          <CheckCircle className="text-green-500" size={24} />
                          <div>
                            <p className="font-bold text-green-400">✅ Accepted!</p>
                            <p className="text-sm text-gray-400">Your solution is correct. +{currentChallenge.xpReward} XP</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <Target className="text-red-500" size={24} />
                          <div>
                            <p className="font-bold text-red-400">❌ Wrong Answer</p>
                            <p className="text-sm text-gray-400">Your output doesn't match the expected result. Try again!</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Your Output */}
                  {(challengeResult.columns.length > 0 || challengeResult.error) && (
                    <div className="bg-black/30 rounded-xl border border-green-500/30 p-4">
                      <h3 className="font-bold mb-3 text-green-300">📊 Your Output {challengeResult.rows?.length > 0 && `(${challengeResult.rows.length} rows)`}</h3>
                      <ResultsTable columns={challengeResult.columns} rows={challengeResult.rows} error={challengeResult.error} />
                    </div>
                  )}
                </div>
                
                {/* Sidebar - Schema */}
                <div className="space-y-4">
                  <div className="bg-black/30 rounded-xl border border-blue-500/30 p-4">
                    <h3 className="font-bold mb-3 text-blue-300">📋 Table Schema</h3>
                    {currentChallenge.tables.map(tableName => {
                      const ds = publicDatasets[currentChallenge.dataset];
                      const table = ds?.tables[tableName];
                      if (!table) return null;
                      return (
                        <div key={tableName} className="mb-4">
                          <p className="text-sm font-mono text-blue-400 font-bold">{tableName}</p>
                          <div className="mt-1 text-xs text-gray-400">
                            {table.columns.map((col, i) => (
                              <span key={col} className="inline-block mr-2 mb-1 px-1.5 py-0.5 bg-gray-800 rounded">{col}</span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Sample Data */}
                  <div className="bg-black/30 rounded-xl border border-gray-700 p-4">
                    <h3 className="font-bold mb-3 text-gray-300">📝 Sample Data</h3>
                    {currentChallenge.tables.map(tableName => {
                      const ds = publicDatasets[currentChallenge.dataset];
                      const table = ds?.tables[tableName];
                      if (!table) return null;
                      return (
                        <div key={tableName} className="mb-4">
                          <p className="text-xs font-mono text-gray-400 mb-2">{tableName} (first 3 rows)</p>
                          <div className="overflow-auto">
                            <table className="min-w-full text-xs border border-gray-700">
                              <thead className="bg-gray-800">
                                <tr>{table.columns.slice(0, 5).map((c, i) => <th key={i} className="px-1.5 py-1 text-left font-medium text-gray-400 border-b border-gray-700">{c}</th>)}</tr>
                              </thead>
                              <tbody>
                                {table.data.slice(0, 3).map((row, i) => (
                                  <tr key={i}>
                                    {row.slice(0, 5).map((cell, j) => <td key={j} className="px-1.5 py-1 border-b border-gray-800 text-gray-400">{cell === null ? 'NULL' : formatCell(cell, 15)}</td>)}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

                {activeTab === 'achievements' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {achievements.map(a => { const Icon = a.icon; const unlocked = unlockedAchievements.has(a.id); return (
                <div key={a.id} className={`p-4 rounded-xl border ${unlocked ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-gray-800/50 border-gray-700 opacity-60'}`}>
                  <div className="flex items-center gap-3"><div className={`w-12 h-12 rounded-full flex items-center justify-center ${unlocked ? 'bg-yellow-500/30' : 'bg-gray-700'}`}><Icon size={24} className={unlocked ? 'text-yellow-400' : 'text-gray-500'} /></div><div><h3 className="font-bold">{a.name}</h3><p className="text-xs text-gray-400">{a.desc}</p><p className="text-xs text-yellow-400">+{a.xp} XP</p></div></div>
                </div>
              );})}
            </div>
            <div className="bg-black/30 rounded-xl border border-purple-500/30 p-6">
              <h2 className="text-xl font-bold mb-4">📊 Your Stats</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-gray-800/50 p-4 rounded-lg text-center"><p className="text-3xl font-bold text-purple-400">{xp}</p><p className="text-sm text-gray-400">Total XP</p></div>
                <div className="bg-gray-800/50 p-4 rounded-lg text-center"><p className="text-3xl font-bold text-green-400">{queryCount}</p><p className="text-sm text-gray-400">Queries</p></div>
                <div className="bg-gray-800/50 p-4 rounded-lg text-center"><p className="text-3xl font-bold text-cyan-400">{completedAiLessons.size}/{aiLessons.length}</p><p className="text-sm text-gray-400">AI Lessons</p></div>
                <div className="bg-gray-800/50 p-4 rounded-lg text-center"><p className="text-3xl font-bold text-orange-400">{solvedChallenges.size}/{challenges.length}</p><p className="text-sm text-gray-400">Challenges</p></div>
                <div className="bg-gray-800/50 p-4 rounded-lg text-center"><p className="text-3xl font-bold text-yellow-400">{unlockedAchievements.size}/{achievements.length}</p><p className="text-sm text-gray-400">Achievements</p></div>
              </div>
            </div>
            
            {/* Challenge Progress */}
            <div className="bg-black/30 rounded-xl border border-orange-500/30 p-6">
              <h2 className="text-xl font-bold mb-4">⚔️ Challenge Progress</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/30">
                  <div className="flex items-center justify-between">
                    <span className="text-green-400 font-medium">Easy</span>
                    <span className="text-green-400">{challenges.filter(c => c.difficulty === 'Easy' && solvedChallenges.has(c.id)).length}/{challenges.filter(c => c.difficulty === 'Easy').length}</span>
                  </div>
                  <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: `${(challenges.filter(c => c.difficulty === 'Easy' && solvedChallenges.has(c.id)).length / challenges.filter(c => c.difficulty === 'Easy').length) * 100}%` }} />
                  </div>
                </div>
                <div className="bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/30">
                  <div className="flex items-center justify-between">
                    <span className="text-yellow-400 font-medium">Medium</span>
                    <span className="text-yellow-400">{challenges.filter(c => c.difficulty === 'Medium' && solvedChallenges.has(c.id)).length}/{challenges.filter(c => c.difficulty === 'Medium').length}</span>
                  </div>
                  <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-500" style={{ width: `${(challenges.filter(c => c.difficulty === 'Medium' && solvedChallenges.has(c.id)).length / challenges.filter(c => c.difficulty === 'Medium').length) * 100}%` }} />
                  </div>
                </div>
                <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/30">
                  <div className="flex items-center justify-between">
                    <span className="text-red-400 font-medium">Hard</span>
                    <span className="text-red-400">{challenges.filter(c => c.difficulty === 'Hard' && solvedChallenges.has(c.id)).length}/{challenges.filter(c => c.difficulty === 'Hard').length}</span>
                  </div>
                  <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500" style={{ width: `${(challenges.filter(c => c.difficulty === 'Hard' && solvedChallenges.has(c.id)).length / challenges.filter(c => c.difficulty === 'Hard').length) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>
            
            {/* AI Tutor Progress */}
            <div className="bg-black/30 rounded-xl border border-cyan-500/30 p-6">
              <h2 className="text-xl font-bold mb-4">🤖 AI Tutor Progress</h2>
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400">Lessons Completed</span>
                <span className="text-cyan-400 font-bold">{completedAiLessons.size}/{aiLessons.length}</span>
              </div>
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden mb-4">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500" 
                  style={{ width: `${(completedAiLessons.size / aiLessons.length) * 100}%` }} 
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {aiLessons.map(lesson => (
                  <div 
                    key={lesson.id} 
                    className={`p-2 rounded-lg text-center text-xs ${
                      completedAiLessons.has(lesson.id) 
                        ? 'bg-green-500/20 border border-green-500/30' 
                        : 'bg-gray-800/50 border border-gray-700'
                    }`}
                  >
                    <span className={completedAiLessons.has(lesson.id) ? 'text-green-400' : 'text-gray-500'}>
                      {completedAiLessons.has(lesson.id) ? '✓' : ''} L{lesson.id}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-black/30 rounded-xl border border-blue-500/30 p-6">
              <h2 className="text-xl font-bold mb-4">📦 Dataset Info</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(publicDatasets).map(([k, ds]) => { const Icon = ds.icon; const rows = Object.values(ds.tables).reduce((a,t) => a + t.data.length, 0); return (
                  <div key={k} className="bg-gray-800/50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2"><Icon size={20} className="text-purple-400" /><h3 className="font-bold">{ds.name}</h3></div>
                    <p className="text-sm text-gray-400 mb-2">{ds.description}</p>
                    <p className="text-xs text-gray-500">{Object.keys(ds.tables).length} table(s) • {rows} rows</p>
                  </div>
                );})}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="space-y-4">
            <div className="bg-black/30 rounded-xl border border-yellow-500/30 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2"><Crown className="text-yellow-400" /> Global Leaderboard</h2>
                <button onClick={() => loadLeaderboard().then(setLeaderboard)} className="text-sm text-purple-400 hover:text-purple-300">↻ Refresh</button>
              </div>
              
              {leaderboard.length > 0 ? (
                <div className="space-y-2">
                  {leaderboard.slice(0, 20).map((entry, i) => {
                    const isCurrentUser = entry.username === currentUser;
                    const rankColor = i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-500';
                    const RankIcon = i === 0 ? Crown : i === 1 ? Medal : i === 2 ? Award : null;
                    return (
                      <div key={entry.username} className={`flex items-center gap-4 p-4 rounded-xl ${isCurrentUser ? 'bg-purple-500/20 border border-purple-500/50' : 'bg-gray-800/50'}`}>
                        <div className={`w-10 h-10 flex items-center justify-center font-bold text-lg ${rankColor}`}>
                          {RankIcon ? <RankIcon size={24} /> : `#${i + 1}`}
                        </div>
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center font-bold">
                          {entry.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold">{entry.username} {isCurrentUser && <span className="text-purple-400 text-sm">(You)</span>}</p>
                          <p className="text-xs text-gray-400">{entry.solvedCount} challenges solved</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-purple-400">{entry.xp} XP</p>
                          <p className="text-xs text-gray-500">{levels.reduce((acc, l) => entry.xp >= l.minXP ? l : acc, levels[0]).name}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Crown className="mx-auto text-gray-600 mb-4" size={48} />
                  <p className="text-gray-400">No players yet. Be the first!</p>
                </div>
              )}
            </div>
            
            {/* Your Rank Card */}
            {currentUser && (
              <div className="bg-black/30 rounded-xl border border-purple-500/30 p-6">
                <h3 className="font-bold mb-4">📊 Your Standing</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-800/50 p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold text-yellow-400">#{leaderboard.findIndex(e => e.username === currentUser) + 1 || '-'}</p>
                    <p className="text-sm text-gray-400">Global Rank</p>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold text-purple-400">{xp}</p>
                    <p className="text-sm text-gray-400">Total XP</p>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold text-green-400">{solvedChallenges.size}</p>
                    <p className="text-sm text-gray-400">Challenges</p>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold text-blue-400">{queryCount}</p>
                    <p className="text-sm text-gray-400">Total Queries</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
