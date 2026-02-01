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
  if (cell === null || cell === undefined) return 'NULL';
  
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

// Initialize Supabase client for Auth
const getSupabaseClient = () => {
  if (!isSupabaseConfigured() || !window.supabase) return null;
  if (!window._supabaseClient) {
    window._supabaseClient = window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY
    );
  }
  return window._supabaseClient;
};

// Password Reset Functions
const sendPasswordResetEmail = async (email) => {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase not configured');
  }
  
  const { data, error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname + '?reset=true'
  });
  
  if (error) throw error;
  return data;
};

const updatePasswordWithToken = async (newPassword) => {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase not configured');
  }
  
  const { data, error } = await client.auth.updateUser({
    password: newPassword
  });
  
  if (error) throw error;
  return data;
};

// Resend verification email
const resendVerificationEmail = async (email) => {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase not configured');
  }
  
  const { data, error } = await client.auth.resend({
    type: 'signup',
    email: email,
    options: {
      emailRedirectTo: window.location.origin + window.location.pathname + '?verified=true'
    }
  });
  
  if (error) throw error;
  return data;
};

// Check if this is an email verification callback
const checkEmailVerificationCallback = () => {
  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  
  // Check for verification token in URL
  if (params.get('verified') === 'true' || hashParams.get('type') === 'signup' || hashParams.get('type') === 'email') {
    return true;
  }
  return false;
};

// Check if this is a password reset callback
const checkPasswordResetCallback = () => {
  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  
  // Check for reset token in URL
  if (params.get('reset') === 'true' || hashParams.get('type') === 'recovery') {
    return true;
  }
  return false;
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
  console.log('Saving user data for:', username, { 
    proStatus: data?.proStatus, 
    proType: data?.proType,
    proExpiry: data?.proExpiry,
    email: data?.email // Log email for debugging
  });
  
  // Always save to localStorage first (for offline/fast access)
  try {
    localStorage.setItem(`sqlquest_user_${username}`, JSON.stringify(data));
    console.log('✓ Saved to localStorage');
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
        email: data.email || null, // Store email in dedicated column for easy lookup
        data: data,
        updated_at: new Date().toISOString()
      };
      
      console.log('☁️ Saving to cloud with email:', cloudData.email); // Debug log
      
      if (existing && existing.length > 0) {
        // Update existing user
        await supabaseFetch(`users?username=eq.${encodeURIComponent(username)}`, {
          method: 'PATCH',
          body: JSON.stringify(cloudData)
        });
        console.log('✓ Updated in cloud (PATCH)');
      } else {
        // Insert new user
        cloudData.created_at = new Date().toISOString();
        await supabaseFetch('users', {
          method: 'POST',
          body: JSON.stringify(cloudData)
        });
        console.log('✓ Inserted to cloud (POST)');
      }
      console.log('✓ Synced to cloud successfully');
    } catch (err) {
      console.error('Failed to sync to cloud:', err);
    }
  } else {
    console.log('⚠️ Supabase not configured - data saved locally only');
  }
  
  return true;
};

const loadUserData = async (username) => {
  console.log('Loading user data for:', username, 'Supabase configured:', isSupabaseConfigured());
  
  // Try cloud first if configured
  if (isSupabaseConfigured()) {
    try {
      const cloudData = await supabaseFetch(`users?username=eq.${encodeURIComponent(username)}`);
      console.log('Cloud data response:', cloudData);
      
      if (cloudData && cloudData.length > 0) {
        const userData = cloudData[0].data;
        console.log('Loaded userData from cloud:', { 
          proStatus: userData?.proStatus, 
          proType: userData?.proType,
          proExpiry: userData?.proExpiry 
        });
        // Also update localStorage with cloud data
        localStorage.setItem(`sqlquest_user_${username}`, JSON.stringify(userData));
        console.log('✓ Loaded from cloud and synced to localStorage');
        return userData;
      }
    } catch (err) {
      console.error('Failed to load from cloud:', err);
    }
  }
  
  // Fall back to localStorage
  try {
    const result = localStorage.getItem(`sqlquest_user_${username}`);
    console.log('Loaded from localStorage:', result ? 'found' : 'not found');
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

// Seed users for leaderboard (appear alongside real users)
const seedLeaderboardUsers = [
  // Top tier (3000-5500 XP)
  // 30% Instagram-style, 40% firstname+last3, 30% full name
  { username: 'sql_ninja42', xp: 5420, solvedCount: 48, isSeeded: true }, // Instagram style
  { username: 'yukiaka', xp: 5180, solvedCount: 45, isSeeded: true }, // firstname + last 3 (Yuki Tanaka)
  { username: 'dan.levy', xp: 4850, solvedCount: 42, isSeeded: true }, // Instagram style
  { username: 'hannaeller', xp: 4620, solvedCount: 40, isSeeded: true }, // firstname + last 3 (Hanna Mueller)
  { username: 'emremir', xp: 4350, solvedCount: 38, isSeeded: true }, // firstname + last 3 (Emre Demir)
  { username: 'query_master', xp: 4100, solvedCount: 36, isSeeded: true }, // Instagram style
  { username: 'marcorossi', xp: 3880, solvedCount: 34, isSeeded: true }, // full name
  { username: 'jasonler', xp: 3720, solvedCount: 33, isSeeded: true }, // firstname + last 3 (Jason Miller)
  { username: 'data_sarah', xp: 3540, solvedCount: 31, isSeeded: true }, // Instagram style
  { username: 'pabloandez', xp: 3280, solvedCount: 29, isSeeded: true }, // firstname + last 3 (Pablo Fernandez)
  { username: 'dmitryanov', xp: 3050, solvedCount: 27, isSeeded: true }, // firstname + last 3 (Dmitry Ivanov)
  
  // Mid-high tier (1500-3000 XP)
  { username: 'sophieyen', xp: 2940, solvedCount: 26, isSeeded: true }, // firstname + last 3 (Sophie Nguyen)
  { username: 'asli.codes', xp: 2780, solvedCount: 25, isSeeded: true }, // Instagram style
  { username: 'eriksson', xp: 2620, solvedCount: 24, isSeeded: true }, // firstname + last 3 (Erik Johansson)
  { username: 'giuliaari', xp: 2450, solvedCount: 22, isSeeded: true }, // firstname + last 3 (Giulia Ferrari)
  { username: 'weizhang', xp: 2280, solvedCount: 21, isSeeded: true }, // full name
  { username: 'mike_queries', xp: 2180, solvedCount: 20, isSeeded: true }, // Instagram style
  { username: 'annaova', xp: 2050, solvedCount: 19, isSeeded: true }, // firstname + last 3 (Anna Kuznetsova)
  { username: 'yonatansen', xp: 1920, solvedCount: 18, isSeeded: true }, // firstname + last 3 (Yonatan Rosen)
  { username: 'maria.sql', xp: 1780, solvedCount: 17, isSeeded: true }, // Instagram style
  { username: 'felixder', xp: 1650, solvedCount: 16, isSeeded: true }, // firstname + last 3 (Felix Schneider)
  { username: 'oliviason', xp: 1580, solvedCount: 15, isSeeded: true }, // firstname + last 3 (Olivia Johnson)
  
  // Mid tier (800-1500 XP)
  { username: 'jeroenerg', xp: 1450, solvedCount: 14, isSeeded: true }, // firstname + last 3 (Jeroen van den Berg)
  { username: 'elenakosta', xp: 1320, solvedCount: 13, isSeeded: true }, // full name
  { username: 'db_david', xp: 1280, solvedCount: 13, isSeeded: true }, // Instagram style
  { username: 'oksanaenko', xp: 1180, solvedCount: 12, isSeeded: true }, // firstname + last 3 (Oksana Shevchenko)
  { username: 'mehmetlik', xp: 1050, solvedCount: 11, isSeeded: true }, // firstname + last 3 (Mehmet Celik)
  { username: 'chloe.db', xp: 980, solvedCount: 10, isSeeded: true }, // Instagram style
  { username: 'kenjiuda', xp: 920, solvedCount: 10, isSeeded: true }, // firstname + last 3 (Kenji Matsuda)
  { username: 'emmason', xp: 890, solvedCount: 9, isSeeded: true }, // firstname + last 3 (Emma Thompson)
  { username: 'giorgidze', xp: 840, solvedCount: 9, isSeeded: true }, // firstname + last 3 (Giorgi Beridze)
  
  // Mid-low tier (400-800 XP)
  { username: 'sophie_vries', xp: 780, solvedCount: 8, isSeeded: true }, // Instagram style
  { username: 'nikolavic', xp: 720, solvedCount: 8, isSeeded: true }, // firstname + last 3 (Nikola Jovanovic)
  { username: 'carloseno', xp: 680, solvedCount: 7, isSeeded: true }, // firstname + last 3 (Carlos Moreno)
  { username: 'jameswright', xp: 620, solvedCount: 7, isSeeded: true }, // full name
  { username: 'andriyenko', xp: 560, solvedCount: 6, isSeeded: true }, // firstname + last 3 (Andriy Kovenko)
  { username: 'minjukim', xp: 520, solvedCount: 6, isSeeded: true }, // full name
  { username: 'sql_ivan', xp: 480, solvedCount: 5, isSeeded: true }, // Instagram style
  { username: 'avaams', xp: 450, solvedCount: 5, isSeeded: true }, // firstname + last 3 (Ava Williams)
  
  // Lower tier (50-400 XP) - easy to beat for new users
  { username: 'noahown', xp: 380, solvedCount: 4, isSeeded: true }, // firstname + last 3 (Noah Brown)
  { username: 'bella.garcia', xp: 320, solvedCount: 4, isSeeded: true }, // Instagram style
  { username: 'liamson', xp: 280, solvedCount: 3, isSeeded: true }, // firstname + last 3 (Liam Anderson)
  { username: 'rachelerg', xp: 240, solvedCount: 3, isSeeded: true }, // firstname + last 3 (Rachel Goldberg)
  { username: 'tom_devos', xp: 200, solvedCount: 2, isSeeded: true }, // Instagram style
  { username: 'aylinurk', xp: 160, solvedCount: 2, isSeeded: true }, // firstname + last 3 (Aylin Ozturk)
  { username: 'lucachi', xp: 120, solvedCount: 2, isSeeded: true }, // firstname + last 3 (Luca Bianchi)
  { username: 'alex.k', xp: 90, solvedCount: 1, isSeeded: true }, // Instagram style
  { username: 'yuliyayk', xp: 70, solvedCount: 1, isSeeded: true }, // firstname + last 3 (Yuliya Melnyk)
  { username: 'hansier', xp: 50, solvedCount: 1, isSeeded: true }, // firstname + last 3 (Hans Meier)
];

const loadLeaderboard = async () => {
  let realUsers = [];
  
  // If Supabase configured, load from cloud
  if (isSupabaseConfigured()) {
    try {
      const cloudUsers = await supabaseFetch('users?select=username,data&order=data->>xp.desc&limit=50');
      if (cloudUsers && cloudUsers.length > 0) {
        realUsers = cloudUsers.map(u => ({
          username: u.username,
          xp: u.data?.xp || 0,
          solvedCount: u.data?.solvedChallenges?.length || 0,
          timestamp: Date.now(),
          isSeeded: false
        }));
      }
    } catch (err) {
      console.error('Failed to load cloud leaderboard:', err);
    }
  }
  
  // Fall back to local leaderboard if no cloud users
  if (realUsers.length === 0) {
    try {
      const leaderboard = JSON.parse(localStorage.getItem('sqlquest_leaderboard') || '{}');
      realUsers = Object.values(leaderboard).map(u => ({ ...u, isSeeded: false }));
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      realUsers = [];
    }
  }
  
  // Merge real users with seed users (avoid duplicates by username)
  const realUsernames = new Set(realUsers.map(u => u.username.toLowerCase()));
  const filteredSeedUsers = seedLeaderboardUsers.filter(s => !realUsernames.has(s.username.toLowerCase()));
  
  // Combine and sort by XP
  return [...realUsers, ...filteredSeedUsers].sort((a, b) => b.xp - a.xp);
};

// ============ LOAD EXTERNAL DATA ============
// Data is loaded from separate files in /data folder
const publicDatasets = window.publicDatasetsData || {};
const challenges = window.challengesData || [];
const levels = window.gameLevels || [{ name: 'Novice', minXP: 0 }];
const achievements = window.gameAchievements || [];
const dailyChallenges = window.dailyChallengesData || [];
const mockInterviews = window.mockInterviewsData || [];
const interviewCategories = window.interviewCategories || [];

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

// Detect ALL SQL concepts used in a query (returns array)
const detectAllSqlConcepts = (sql) => {
  if (!sql) return [];
  const upperSql = sql.toUpperCase();
  const concepts = [];
  
  // Window Functions - specific types
  if (upperSql.includes('ROW_NUMBER(')) concepts.push('ROW_NUMBER');
  if (upperSql.includes('RANK(')) concepts.push('RANK');
  if (upperSql.includes('DENSE_RANK(')) concepts.push('DENSE_RANK');
  if (upperSql.includes('LAG(')) concepts.push('LAG');
  if (upperSql.includes('LEAD(')) concepts.push('LEAD');
  if (upperSql.includes('NTILE(')) concepts.push('NTILE');
  if (upperSql.includes('OVER(') || upperSql.includes('OVER (')) concepts.push('Window Functions');
  
  // JOINs
  if (upperSql.includes('LEFT JOIN') || upperSql.includes('LEFT OUTER JOIN')) concepts.push('LEFT JOIN');
  if (upperSql.includes('RIGHT JOIN')) concepts.push('RIGHT JOIN');
  if (upperSql.includes('FULL JOIN') || upperSql.includes('FULL OUTER JOIN')) concepts.push('FULL JOIN');
  if (upperSql.includes('CROSS JOIN')) concepts.push('CROSS JOIN');
  if ((upperSql.includes('INNER JOIN') || upperSql.includes(' JOIN ')) && !concepts.some(c => c.includes('JOIN'))) concepts.push('JOIN');
  
  // Subqueries
  if (upperSql.includes('(SELECT')) concepts.push('Subquery');
  if (upperSql.includes('WITH ') && upperSql.includes(' AS (')) concepts.push('CTE');
  if (upperSql.includes('EXISTS')) concepts.push('EXISTS');
  if (upperSql.includes('NOT EXISTS')) concepts.push('NOT EXISTS');
  
  // Aggregations
  if (upperSql.includes('COUNT(')) concepts.push('COUNT');
  if (upperSql.includes('SUM(')) concepts.push('SUM');
  if (upperSql.includes('AVG(')) concepts.push('AVG');
  if (upperSql.includes('MAX(')) concepts.push('MAX');
  if (upperSql.includes('MIN(')) concepts.push('MIN');
  
  // Grouping & Filtering
  if (upperSql.includes('GROUP BY')) concepts.push('GROUP BY');
  if (upperSql.includes('HAVING')) concepts.push('HAVING');
  if (upperSql.includes('WHERE')) concepts.push('WHERE');
  if (upperSql.includes('ORDER BY')) concepts.push('ORDER BY');
  if (upperSql.includes('LIMIT')) concepts.push('LIMIT');
  
  // Operators & Functions
  if (upperSql.includes('CASE WHEN') || upperSql.includes('CASE\n')) concepts.push('CASE WHEN');
  if (upperSql.includes('COALESCE')) concepts.push('COALESCE');
  if (upperSql.includes('NULLIF')) concepts.push('NULLIF');
  if (upperSql.includes('BETWEEN')) concepts.push('BETWEEN');
  if (upperSql.includes('LIKE')) concepts.push('LIKE');
  if (upperSql.includes('IN (')) concepts.push('IN');
  if (upperSql.includes('DISTINCT')) concepts.push('DISTINCT');
  if (upperSql.includes('UNION')) concepts.push('UNION');
  
  // Date/String functions
  if (upperSql.includes('STRFTIME') || upperSql.includes('DATE(') || upperSql.includes('DATETIME(')) concepts.push('Date Functions');
  if (upperSql.includes('SUBSTR') || upperSql.includes('UPPER(') || upperSql.includes('LOWER(') || upperSql.includes('TRIM(')) concepts.push('String Functions');
  if (upperSql.includes('ROUND(') || upperSql.includes('ABS(') || upperSql.includes('CAST(')) concepts.push('Math/Conversion');
  
  return [...new Set(concepts)]; // Remove duplicates
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

// Confetti Celebration Animation
function ConfettiAnimation({ onComplete, soundEnabled = true }) {
  const [particles, setParticles] = useState([]);
  
  useEffect(() => {
    // Generate confetti particles
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#ff69b4'];
    const newParticles = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 2,
      size: 8 + Math.random() * 8,
      rotation: Math.random() * 360
    }));
    setParticles(newParticles);
    
    // Play celebration sound if enabled
    if (soundEnabled) {
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1ubJOVlIJyd3qKkpGCdm58iI+RhXl0fYaMjoZ8dX6EjI6HfnV/hIuNh395gISKjIiBeoGFiouJgnyBhYqLiYJ8gYWJi4mCfIGFiYuJgnyBhYmLiYJ8gYWJi4mCfIGFiYuJgnyBhYmLiYJ8gYWJi4mCfIGFiYuJgnyBhYmLiYl/');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch (e) {}
    }
    
    // Remove after animation
    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 4000);
    
    return () => clearTimeout(timer);
  }, [onComplete, soundEnabled]);
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute animate-confetti"
          style={{
            left: `${p.x}%`,
            top: '-20px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
            transform: `rotate(${p.rotation}deg)`,
            animation: `confetti-fall ${p.duration}s ease-out ${p.delay}s forwards`
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
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

// Expected Output Preview for Weakness Training
function ExpectedOutputPreview({ db, solution }) {
  const [preview, setPreview] = React.useState(null);
  
  React.useEffect(() => {
    if (!db || !solution) return;
    try {
      const result = db.exec(solution);
      if (result.length > 0 && result[0].values.length > 0) {
        setPreview({
          cols: result[0].columns,
          rows: result[0].values.slice(0, 3),
          totalRows: result[0].values.length
        });
      }
    } catch (e) {
      console.log('Could not preview expected output:', e);
    }
  }, [db, solution]);
  
  if (!preview) return null;
  
  return (
    <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
      <h4 className="text-sm font-medium text-green-400 mb-2">
        ✅ Expected Output (first {Math.min(3, preview.totalRows)} of {preview.totalRows} rows)
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-green-500/30">
              {preview.cols.map((col, i) => (
                <th key={i} className="text-left p-1.5 text-green-400 font-medium">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row, ri) => (
              <tr key={ri} className="border-b border-gray-800">
                {row.map((cell, ci) => (
                  <td key={ci} className="p-1.5 text-gray-300 font-mono text-xs">
                    {cell === null ? 'NULL' : cell.toString()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {preview.totalRows > 3 && (
          <p className="text-gray-500 text-xs mt-1">...and {preview.totalRows - 3} more rows</p>
        )}
      </div>
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
  const [isSessionLoading, setIsSessionLoading] = useState(false); // Prevents save during load
  const [showAuth, setShowAuth] = useState(true);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authEmail, setAuthEmail] = useState(''); // For registration
  const [authError, setAuthError] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [queryHistory, setQueryHistory] = useState([]);
  const [showProfile, setShowProfile] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState(''); // Email for password reset
  const [resetSending, setResetSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false); // For password reset form after clicking email link
  const [newResetPassword, setNewResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  // Email verification state
  const [showVerificationPending, setShowVerificationPending] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationResent, setVerificationResent] = useState(false);
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
  
  // Mock Interview state
  const [showInterviews, setShowInterviews] = useState(false);
  const [activeInterview, setActiveInterview] = useState(null);
  const [interviewQuestion, setInterviewQuestion] = useState(0);
  const [interviewQuery, setInterviewQuery] = useState('');
  const [interviewResult, setInterviewResult] = useState({ columns: [], rows: [], error: null });
  const [interviewTimer, setInterviewTimer] = useState(0);
  const [interviewTotalTimer, setInterviewTotalTimer] = useState(0);
  const [interviewTimerActive, setInterviewTimerActive] = useState(false);
  const [interviewAnswers, setInterviewAnswers] = useState([]);
  const [interviewCompleted, setInterviewCompleted] = useState(false);
  const [interviewResults, setInterviewResults] = useState(null);
  const [interviewHintsUsed, setInterviewHintsUsed] = useState([]);
  const [showInterviewHint, setShowInterviewHint] = useState(false);
  const [showInterviewReview, setShowInterviewReview] = useState(null); // For reviewing past interviews
  const [interviewFilter, setInterviewFilter] = useState('all'); // all, easy, medium, hard, solved, unsolved
  const [interviewExpectedOutput, setInterviewExpectedOutput] = useState({ columns: [], rows: [] }); // Precomputed expected output
  
  // Interview Enhancement States
  const [retryMode, setRetryMode] = useState(false); // Retry only failed questions
  const [retryQuestions, setRetryQuestions] = useState([]); // List of failed question indices to retry
  const [timerWarning, setTimerWarning] = useState(null); // 'yellow' (30s), 'red' (10s), or null
  const [showInterviewAnalytics, setShowInterviewAnalytics] = useState(false); // Performance analytics modal
  const [practiceMode, setPracticeMode] = useState(false); // No timer, unlimited hints
  const [showConfetti, setShowConfetti] = useState(false); // Celebration animation
  const [showSolution, setShowSolution] = useState(false); // For practice mode - show solution
  
  // Daily Login Rewards
  const [loginStreak, setLoginStreak] = useState(0);
  const [lastLoginDate, setLastLoginDate] = useState(null);
  const [showLoginReward, setShowLoginReward] = useState(false);
  const [loginRewardAmount, setLoginRewardAmount] = useState(0);
  const [showLoginRewardClaimed, setShowLoginRewardClaimed] = useState(false);
  
  // Sound Effects
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('sqlquest_sound_enabled');
    return saved !== 'false'; // Default to true
  });
  
  // Learning Goals
  const [weeklyGoals, setWeeklyGoals] = useState([]);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  
  // Share & Certificates
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState(null);
  const [shareType, setShareType] = useState('progress'); // 'progress', 'streak', 'day', 'achievement'
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [certificateData, setCertificateData] = useState(null);
  
  // 30-Day Challenge State
  const [show30DayChallenge, setShow30DayChallenge] = useState(false);
  const [challengeProgress, setChallengeProgress] = useState({}); // { day1: { completed: true, score: 100, ... } }
  const [challengeStartDate, setChallengeStartDate] = useState(null);
  const [currentChallengeDay, setCurrentChallengeDay] = useState(null);
  const [showDayLesson, setShowDayLesson] = useState(false);
  const [dayLessonStep, setDayLessonStep] = useState('lesson'); // 'lesson', 'challenge', 'bonus', 'complete'
  const [dayQuery, setDayQuery] = useState('');
  const [dayResult, setDayResult] = useState({ columns: [], rows: [], error: null });
  const [dayHintUsed, setDayHintUsed] = useState(false);
  const [showDayHint, setShowDayHint] = useState(false);
  const [show30DayCertificate, setShow30DayCertificate] = useState(false);
  
  // Pro Subscription state
  const [userProStatus, setUserProStatus] = useState(false);
  const [proType, setProType] = useState(null); // 'monthly' or 'lifetime' or null
  const [proExpiry, setProExpiry] = useState(null);
  const [proAutoRenew, setProAutoRenew] = useState(true);
  const [showProModal, setShowProModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  
  const [interviewHistory, setInterviewHistory] = useState(() => {
    if (!currentUser) return [];
    const userData = JSON.parse(localStorage.getItem(`sqlquest_user_${currentUser}`) || '{}');
    return userData.interviewHistory || [];
  });
  
  // Saved interview progress (for resuming)
  const [savedInterviewProgress, setSavedInterviewProgress] = useState(() => {
    if (!currentUser) return null;
    const saved = localStorage.getItem(`sqlquest_interview_progress_${currentUser}`);
    return saved ? JSON.parse(saved) : null;
  });
  
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
  
  // Weakness Training State
  const [weaknessTracking, setWeaknessTracking] = useState({
    topics: {}, // { 'JOIN Tables': { level: 1, questions: {...}, ... } }
    lastRefresh: null,
    clearedTopics: [],
    totalCleared: 0
  });
  const [activeWeakness, setActiveWeakness] = useState(null); // Currently training weakness
  const [weaknessQuery, setWeaknessQuery] = useState('');
  const [weaknessResult, setWeaknessResult] = useState({ columns: [], rows: [], error: null });
  const [weaknessStatus, setWeaknessStatus] = useState(null); // 'success', 'error', null
  const [showWeaknessHint, setShowWeaknessHint] = useState(false);
  
  // Daily Challenge Timer & Hint State
  const [dailyTimer, setDailyTimer] = useState(0); // seconds elapsed
  const [dailyTimerActive, setDailyTimerActive] = useState(false);
  const [dailyHintUsed, setDailyHintUsed] = useState(false);
  const [dailyAnswerShown, setDailyAnswerShown] = useState(false);
  const [dailySolveTime, setDailySolveTime] = useState(null); // final solve time
  const [showWeeklyReport, setShowWeeklyReport] = useState(false);
  const [weakTopicForTutor, setWeakTopicForTutor] = useState(null); // Topic to practice in AI Tutor
  const [selectedChallengeReview, setSelectedChallengeReview] = useState(null); // For detailed challenge review
  
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
    
    // Check for email verification callback
    if (checkEmailVerificationCallback()) {
      console.log('Email verification callback detected');
      
      // Get the Supabase client and check the session
      const client = getSupabaseClient();
      if (client) {
        // Handle the auth state change
        client.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth event:', event, session?.user?.email);
          
          if (session?.user?.email) {
            const verifiedEmail = session.user.email.toLowerCase();
            
            // Find user by email and mark as verified
            if (isSupabaseConfigured()) {
              try {
                // Try dedicated email column first
                let users = await supabaseFetch(`users?email=eq.${encodeURIComponent(verifiedEmail)}`);
                if (!users || users.length === 0) {
                  // Fallback to data->>email
                  users = await supabaseFetch(`users?data->>email=eq.${encodeURIComponent(verifiedEmail)}`);
                }
                
                if (users && users.length > 0) {
                  const userData = users[0].data;
                  if (userData.emailVerified === false) {
                    userData.emailVerified = true;
                    await saveUserData(users[0].username, userData);
                    console.log('✅ Email verified for user:', users[0].username);
                  }
                }
              } catch (err) {
                console.error('Error updating verification status:', err);
              }
            }
            
            // Also check localStorage
            const allKeys = Object.keys(localStorage).filter(k => k.startsWith('sqlquest_user_'));
            for (const key of allKeys) {
              try {
                const data = JSON.parse(localStorage.getItem(key));
                if (data.email && data.email.toLowerCase() === verifiedEmail && data.emailVerified === false) {
                  data.emailVerified = true;
                  localStorage.setItem(key, JSON.stringify(data));
                  console.log('✅ Email verified in localStorage for:', key);
                }
              } catch (e) {}
            }
          }
        });
        
        // Also try to get current session immediately
        client.auth.getSession().then(async ({ data: { session } }) => {
          if (session?.user?.email) {
            const verifiedEmail = session.user.email.toLowerCase();
            console.log('Current session email:', verifiedEmail);
            
            // Update in Supabase
            if (isSupabaseConfigured()) {
              try {
                let users = await supabaseFetch(`users?email=eq.${encodeURIComponent(verifiedEmail)}`);
                if (!users || users.length === 0) {
                  users = await supabaseFetch(`users?data->>email=eq.${encodeURIComponent(verifiedEmail)}`);
                }
                
                if (users && users.length > 0) {
                  const userData = users[0].data;
                  if (userData.emailVerified === false) {
                    userData.emailVerified = true;
                    await saveUserData(users[0].username, userData);
                    console.log('✅ Email verified for user:', users[0].username);
                  }
                }
              } catch (err) {
                console.error('Error updating verification status:', err);
              }
            }
            
            // Update in localStorage
            const allKeys = Object.keys(localStorage).filter(k => k.startsWith('sqlquest_user_'));
            for (const key of allKeys) {
              try {
                const data = JSON.parse(localStorage.getItem(key));
                if (data.email && data.email.toLowerCase() === verifiedEmail && data.emailVerified === false) {
                  data.emailVerified = true;
                  localStorage.setItem(key, JSON.stringify(data));
                  console.log('✅ Email verified in localStorage');
                }
              } catch (e) {}
            }
          }
        });
      }
      
      alert('✅ Email verified successfully! You can now log in.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Check for password reset callback
    if (checkPasswordResetCallback()) {
      setShowResetPassword(true);
      setShowAuth(true);
      // Handle Supabase Auth session from URL hash
      const client = getSupabaseClient();
      if (client) {
        client.auth.onAuthStateChange((event, session) => {
          if (event === 'PASSWORD_RECOVERY') {
            setShowResetPassword(true);
          }
        });
      }
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

  // Check daily login reward and load goals when user logs in
  useEffect(() => {
    if (currentUser && !isGuest && !isSessionLoading) {
      // Small delay to ensure session is fully loaded
      setTimeout(() => {
        checkDailyLoginReward();
        setWeeklyGoals(loadWeeklyGoals());
      }, 500);
    }
  }, [currentUser, isGuest, isSessionLoading]);

  // Save user progress whenever key stats change
  useEffect(() => {
    if (currentUser && dbReady && !isSessionLoading && !isGuest) {
      (async () => {
        // Preserve existing passwordHash, salt, email, and emailVerified
        const existingData = await loadUserData(currentUser);
        const userData = {
          passwordHash: existingData?.passwordHash,
          salt: existingData?.salt,
          email: existingData?.email, // Preserve email for login/password reset
          emailVerified: existingData?.emailVerified !== false, // Preserve verification status (default to true for old accounts)
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
          // Pro Subscription data - IMPORTANT: preserve these!
          proStatus: userProStatus,
          proType: proType,
          proExpiry: proExpiry,
          proAutoRenew: proAutoRenew,
          // Interview history
          interviewHistory: interviewHistory,
          // 30-Day Challenge Progress
          thirtyDayProgress: challengeProgress,
          thirtyDayStartDate: challengeStartDate,
          // Weakness Tracking
          weaknessTracking: weaknessTracking,
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
  }, [xp, solvedChallenges, unlockedAchievements, queryCount, aiMessages, aiLessonPhase, currentAiLesson, completedAiLessons, comprehensionCount, comprehensionCorrect, consecutiveCorrect, comprehensionConsecutive, completedExercises, challengeQueries, completedDailyChallenges, dailyStreak, challengeAttempts, dailyChallengeHistory, weeklyReports, userProStatus, proType, proExpiry, proAutoRenew, interviewHistory, challengeProgress, challengeStartDate, weaknessTracking]);

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

  // Mock Interview Timer with warnings
  useEffect(() => {
    let interval;
    if (interviewTimerActive && activeInterview && !interviewCompleted) {
      interval = setInterval(() => {
        setInterviewTimer(prev => {
          const newTime = prev + 1;
          const currentQ = activeInterview.questions[interviewQuestion];
          if (!currentQ) return newTime;
          
          const timeRemaining = currentQ.timeLimit - newTime;
          
          // Timer warnings
          if (timeRemaining <= 10 && timeRemaining > 0) {
            setTimerWarning('red');
            // Play warning sound at 10 seconds
            if (timeRemaining === 10 && soundEnabled) {
              try {
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1ubJOVlIJyd3qKkpGCdm58iI+RhXl0fYaMjoZ8dX6EjI6HfnV/hIuNh395gISKjIiBeoGFiouJgnyBhYqLiYJ8gYWJi4mCfIGFiYuJgnyBhYmLiYJ8gYWJi4mCfIGFiYuJgnyBhYmLiYJ8gYWJi4mCfIGFiYuJgnyBhYmLiYJ8gYWJi4l/');
                audio.volume = 0.3;
                audio.play().catch(() => {});
              } catch (e) {}
            }
          } else if (timeRemaining <= 30 && timeRemaining > 10) {
            setTimerWarning('yellow');
            // Play warning sound at 30 seconds
            if (timeRemaining === 30 && soundEnabled) {
              try {
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1ubJOVlIJyd3qKkpGCdm58iI+RhXl0fYaMjoZ8dX6EjI6HfnV/hIuNh395gISKjIiBeoGFiouJgnyBhYqLiYJ8gYWJi4mCfIGFiYuJgnyBhYmLiYJ8gYWJi4mCfIGFiYuJgnyBhYmLiYJ8gYWJi4mCfIGFiYuJgnyBhYmLiYJ8gYWJi4l/');
                audio.volume = 0.2;
                audio.play().catch(() => {});
              } catch (e) {}
            }
          } else {
            setTimerWarning(null);
          }
          
          // Auto-submit if question time runs out
          if (newTime >= currentQ.timeLimit) {
            submitInterviewAnswer(true);
            setTimerWarning(null);
          }
          return newTime;
        });
        setInterviewTotalTimer(prev => {
          const newTotal = prev + 1;
          // Auto-complete if total time runs out
          if (newTotal >= activeInterview.totalTime) {
            completeInterview();
          }
          return newTotal;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [interviewTimerActive, activeInterview, interviewQuestion, interviewCompleted]);

  // Calculate expected output for current interview question
  useEffect(() => {
    if (!db || !activeInterview || interviewCompleted) {
      setInterviewExpectedOutput({ columns: [], rows: [] });
      return;
    }
    
    const currentQ = activeInterview.questions[interviewQuestion];
    if (!currentQ || !currentQ.dataset || !currentQ.solution) {
      setInterviewExpectedOutput({ columns: [], rows: [] });
      return;
    }
    
    try {
      // Load the dataset for the current question
      loadDataset(db, currentQ.dataset);
      
      // Small delay to ensure dataset is loaded
      setTimeout(() => {
        try {
          const result = db.exec(currentQ.solution);
          if (result && result.length > 0) {
            setInterviewExpectedOutput({ columns: result[0].columns, rows: result[0].values });
          } else {
            setInterviewExpectedOutput({ columns: [], rows: [] });
          }
        } catch (e) {
          console.error('Error executing solution:', e);
          setInterviewExpectedOutput({ columns: [], rows: [] });
        }
      }, 100);
    } catch (e) {
      console.error('Error loading dataset for expected output:', e);
      setInterviewExpectedOutput({ columns: [], rows: [] });
    }
  }, [db, activeInterview, interviewQuestion, interviewCompleted]);

  // Mock Interview Functions
  const startInterview = (interview, forceNew = false) => {
    if (!interview.isFree && !userProStatus) {
      setShowProModal(true);
      return;
    }
    
    // Check for saved progress (unless forcing new)
    if (!forceNew && savedInterviewProgress && savedInterviewProgress.interviewId === interview.id) {
      // Resume from saved progress
      setActiveInterview(interview);
      setInterviewQuestion(savedInterviewProgress.questionIndex);
      setInterviewQuery(savedInterviewProgress.currentQuery || '');
      setInterviewResult({ columns: [], rows: [], error: null });
      setInterviewTimer(savedInterviewProgress.questionTimer || 0);
      setInterviewTotalTimer(savedInterviewProgress.totalTimer || 0);
      setInterviewAnswers(savedInterviewProgress.answers || []);
      setInterviewCompleted(false);
      setInterviewResults(null);
      setInterviewHintsUsed(savedInterviewProgress.hintsUsed || []);
      setShowInterviewHint(false);
      setInterviewTimerActive(true);
      
      // Load the current question's dataset
      const currentQ = interview.questions[savedInterviewProgress.questionIndex];
      if (db && currentQ?.dataset) {
        loadDataset(db, currentQ.dataset);
      }
      return;
    }
    
    // Start fresh
    setActiveInterview(interview);
    setInterviewQuestion(0);
    setInterviewQuery('');
    setInterviewResult({ columns: [], rows: [], error: null });
    setInterviewTimer(0);
    setInterviewTotalTimer(0);
    setInterviewAnswers([]);
    setInterviewCompleted(false);
    setInterviewResults(null);
    setInterviewHintsUsed([]);
    setShowInterviewHint(false);
    setRetryMode(false);
    setRetryQuestions([]);
    setTimerWarning(null);
    setInterviewTimerActive(true);
    
    // Clear any saved progress for this interview
    if (savedInterviewProgress?.interviewId === interview.id) {
      localStorage.removeItem(`sqlquest_interview_progress_${currentUser}`);
      setSavedInterviewProgress(null);
    }
    
    // Load the first question's dataset
    if (db && interview.questions[0]?.dataset) {
      loadDataset(db, interview.questions[0].dataset);
    }
  };
  
  // Start Practice Mode - no timer, unlimited hints, can see solutions
  const startPracticeMode = (interview) => {
    if (!interview.isFree && !userProStatus) {
      setShowProModal(true);
      return;
    }
    
    setActiveInterview(interview);
    setInterviewQuestion(0);
    setInterviewQuery('');
    setInterviewResult({ columns: [], rows: [], error: null });
    setInterviewTimer(0);
    setInterviewTotalTimer(0);
    setInterviewAnswers([]);
    setInterviewCompleted(false);
    setInterviewResults(null);
    setInterviewHintsUsed([]);
    setShowInterviewHint(false);
    setRetryMode(false);
    setRetryQuestions([]);
    setTimerWarning(null);
    setPracticeMode(true); // Enable practice mode
    setShowSolution(false);
    setInterviewTimerActive(false); // No timer in practice mode
    
    // Load the first question's dataset
    if (db && interview.questions[0]?.dataset) {
      loadDataset(db, interview.questions[0].dataset);
    }
  };
  
  // Get peer comparison stats for an interview
  const getPeerComparison = (interviewId) => {
    // Generate simulated peer data based on difficulty
    const interview = mockInterviews.find(i => i.id === interviewId);
    if (!interview) return null;
    
    // Base stats vary by difficulty
    const difficultyMultiplier = {
      'Easy': { avgScore: 78, avgTime: 0.65, passRate: 82 },
      'Easy-Medium': { avgScore: 72, avgTime: 0.70, passRate: 74 },
      'Medium': { avgScore: 65, avgTime: 0.75, passRate: 62 },
      'Medium-Hard': { avgScore: 58, avgTime: 0.80, passRate: 48 },
      'Hard': { avgScore: 52, avgTime: 0.85, passRate: 35 }
    };
    
    const base = difficultyMultiplier[interview.difficulty] || difficultyMultiplier['Medium'];
    
    // Add some randomness for realism (seeded by interview id)
    const seed = interviewId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const variance = (seed % 10) - 5;
    
    return {
      avgScore: Math.max(40, Math.min(90, base.avgScore + variance)),
      avgTime: Math.round(interview.totalTime * base.avgTime),
      passRate: Math.max(25, Math.min(90, base.passRate + variance)),
      totalAttempts: 500 + (seed % 1000), // Simulated attempt count
    };
  };
  
  // Calculate user's percentile for an interview result
  const calculatePercentile = (userScore, peerAvgScore) => {
    // Simple percentile calculation based on how user compares to average
    // If user scored average, they're at 50th percentile
    // Each point above/below shifts percentile
    const diff = userScore - peerAvgScore;
    const percentile = Math.round(50 + (diff * 1.5));
    return Math.max(1, Math.min(99, percentile));
  };
  
  // Auto-save interview progress
  const saveInterviewProgress = () => {
    if (!currentUser || !activeInterview || interviewCompleted) return;
    
    const progress = {
      interviewId: activeInterview.id,
      interviewTitle: activeInterview.title,
      questionIndex: interviewQuestion,
      currentQuery: interviewQuery,
      questionTimer: interviewTimer,
      totalTimer: interviewTotalTimer,
      answers: interviewAnswers,
      hintsUsed: interviewHintsUsed,
      savedAt: new Date().toISOString()
    };
    
    localStorage.setItem(`sqlquest_interview_progress_${currentUser}`, JSON.stringify(progress));
    setSavedInterviewProgress(progress);
  };
  
  // Save progress when interview state changes
  useEffect(() => {
    if (activeInterview && !interviewCompleted && interviewTimerActive) {
      const saveInterval = setInterval(saveInterviewProgress, 5000); // Save every 5 seconds
      return () => clearInterval(saveInterval);
    }
  }, [activeInterview, interviewQuestion, interviewQuery, interviewTimer, interviewTotalTimer, interviewAnswers, interviewCompleted]);

  const runInterviewQuery = () => {
    if (!db || !interviewQuery.trim() || !activeInterview) return;
    try {
      const result = db.exec(interviewQuery);
      if (result.length > 0) {
        setInterviewResult({ columns: result[0].columns, rows: result[0].values, error: null });
      } else {
        setInterviewResult({ columns: [], rows: [], error: null });
      }
    } catch (err) {
      setInterviewResult({ columns: [], rows: [], error: err.message });
    }
  };

  const submitInterviewAnswer = (timedOut = false) => {
    if (!activeInterview) return;
    
    const currentQ = activeInterview.questions[interviewQuestion];
    let isCorrect = false;
    let score = 0;
    let expectedOutput = { columns: [], rows: [] };
    let userOutput = { columns: [], rows: [] };
    
    if (!timedOut && interviewQuery.trim()) {
      try {
        const userResult = db.exec(interviewQuery);
        const expectedResult = db.exec(currentQ.solution);
        
        // Store outputs for review
        if (userResult.length > 0) {
          userOutput = { columns: userResult[0].columns, rows: userResult[0].values };
        }
        if (expectedResult.length > 0) {
          expectedOutput = { columns: expectedResult[0].columns, rows: expectedResult[0].values };
        }
        
        const userRows = userResult.length > 0 ? JSON.stringify(userResult[0].values) : '[]';
        const expectedRows = expectedResult.length > 0 ? JSON.stringify(expectedResult[0].values) : '[]';
        
        isCorrect = userRows === expectedRows;
        if (isCorrect) {
          score = currentQ.points;
          // Deduct for hints used
          const hintsUsedCount = interviewHintsUsed.filter(h => h === interviewQuestion).length;
          score = Math.max(0, score - (hintsUsedCount * Math.floor(currentQ.points * 0.15)));
        }
      } catch (err) {
        isCorrect = false;
      }
    } else {
      // Get expected output even for skipped/timed out questions
      try {
        const expectedResult = db.exec(currentQ.solution);
        if (expectedResult.length > 0) {
          expectedOutput = { columns: expectedResult[0].columns, rows: expectedResult[0].values };
        }
      } catch (e) {}
    }
    
    const answer = {
      questionIndex: interviewQuestion,
      questionId: currentQ.id,
      questionTitle: currentQ.title,
      questionDescription: currentQ.description,
      difficulty: currentQ.difficulty,
      concepts: currentQ.concepts,
      userQuery: interviewQuery,
      correctSolution: currentQ.solution,
      hints: currentQ.hints,
      userOutput,
      expectedOutput,
      correct: isCorrect,
      score,
      maxScore: currentQ.points,
      timeUsed: interviewTimer,
      timeLimit: currentQ.timeLimit,
      timedOut,
      hintsUsed: interviewHintsUsed.filter(h => h === interviewQuestion).length
    };
    
    const newAnswers = [...interviewAnswers, answer];
    setInterviewAnswers(newAnswers);
    
    // Move to next question or complete
    if (interviewQuestion < activeInterview.questions.length - 1) {
      const nextQ = activeInterview.questions[interviewQuestion + 1];
      setInterviewQuestion(interviewQuestion + 1);
      setInterviewQuery('');
      setInterviewResult({ columns: [], rows: [], error: null });
      setInterviewTimer(0);
      setShowInterviewHint(false);
      setShowSolution(false); // Reset solution display for next question
      
      // Load next question's dataset if different
      if (db && nextQ.dataset) {
        loadDataset(db, nextQ.dataset);
      }
    } else {
      completeInterview(newAnswers);
    }
  };

  const completeInterview = (finalAnswers = interviewAnswers) => {
    setInterviewTimerActive(false);
    setInterviewCompleted(true);
    setTimerWarning(null); // Clear any timer warning
    
    // Clear saved progress
    if (currentUser) {
      localStorage.removeItem(`sqlquest_interview_progress_${currentUser}`);
      setSavedInterviewProgress(null);
    }
    
    const totalScore = finalAnswers.reduce((sum, a) => sum + a.score, 0);
    const maxScore = activeInterview.questions.reduce((sum, q) => sum + q.points, 0);
    const passed = (totalScore / maxScore * 100) >= activeInterview.passingScore;
    
    // Identify mistakes for study - include questionIndex for retry functionality
    const mistakes = finalAnswers
      .map((a, index) => ({ ...a, questionIndex: retryMode && retryQuestions[index] !== undefined ? retryQuestions[index] : index }))
      .filter(a => !a.correct)
      .map(a => ({
        questionIndex: a.questionIndex,
        questionTitle: a.questionTitle,
        questionDescription: a.questionDescription,
        concepts: a.concepts,
        difficulty: a.difficulty,
        userQuery: a.userQuery,
        correctSolution: a.correctSolution,
        hints: a.hints,
        userOutput: a.userOutput,
        expectedOutput: a.expectedOutput,
        timedOut: a.timedOut
      }));
    
    const scorePercent = Math.round(totalScore / maxScore * 100);
    
    const results = {
      id: Date.now(), // Unique ID for this result
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      interviewId: retryMode ? activeInterview.id.replace(' (Retry)', '') : activeInterview.id,
      interviewTitle: activeInterview.title.replace(' (Retry)', ''),
      interviewDifficulty: activeInterview.difficulty,
      totalScore,
      maxScore,
      percentage: scorePercent,
      scorePercent: scorePercent, // Alias for consistency
      timeUsed: interviewTotalTimer,
      totalTime: activeInterview.totalTime,
      passed,
      passingScore: activeInterview.passingScore,
      questionsCorrect: finalAnswers.filter(a => a.correct).length,
      questionsTotal: finalAnswers.length,
      questionResults: finalAnswers,
      mistakes, // Store mistakes for study
      studiedMistakes: [] // Track which mistakes user has studied
    };
    
    setInterviewResults(results);
    
    // Show confetti celebration if passed (not in practice mode)
    if (passed && !practiceMode) {
      setShowConfetti(true);
    }
    
    // Save to history (skip in practice mode)
    if (currentUser && !practiceMode) {
      const newHistory = [...interviewHistory, results];
      setInterviewHistory(newHistory);
      
      const userData = JSON.parse(localStorage.getItem(`sqlquest_user_${currentUser}`) || '{}');
      userData.interviewHistory = newHistory;
      
      // Award XP for completing interview
      const xpReward = passed ? 100 : 25;
      userData.xp = (userData.xp || 0) + xpReward;
      setXP(userData.xp);
      
      // Check interview achievements
      const hintsUsedCount = interviewHintsUsed.length;
      const timePercent = (interviewTotalTimer / activeInterview.totalTime) * 100;
      
      // First Interview
      if (!unlockedAchievements.has('first_interview')) {
        unlockAchievement('first_interview');
      }
      
      // Interview Pass
      if (passed && !unlockedAchievements.has('interview_pass')) {
        unlockAchievement('interview_pass');
      }
      
      // Perfect Score (100%)
      if (scorePercent === 100 && !unlockedAchievements.has('perfect_interview')) {
        unlockAchievement('perfect_interview');
      }
      
      // Speed Demon (passed in <50% time)
      if (passed && timePercent < 50 && !unlockedAchievements.has('speed_demon')) {
        unlockAchievement('speed_demon');
      }
      
      // No Hints (passed without hints)
      if (passed && hintsUsedCount === 0 && !unlockedAchievements.has('no_hints')) {
        unlockAchievement('no_hints');
      }
      
      // Comeback King (passed after failing same interview)
      const prevAttempts = interviewHistory.filter(h => h.interviewId === activeInterview.id);
      const hadFailure = prevAttempts.some(a => !a.passed);
      if (passed && hadFailure && !unlockedAchievements.has('comeback_king')) {
        unlockAchievement('comeback_king');
      }
      
      // Interview Marathon (3 interviews today)
      const today = new Date().toISOString().split('T')[0];
      const todayInterviews = [...interviewHistory, results].filter(h => h.date === today);
      if (todayInterviews.length >= 3 && !unlockedAchievements.has('interview_streak')) {
        unlockAchievement('interview_streak');
      }
      
      // All Interviews Passed
      const passedIds = new Set([...interviewHistory, results].filter(h => h.passed).map(h => h.interviewId));
      const allInterviewIds = mockInterviews.filter(i => i.isFree || userProStatus).map(i => i.id);
      if (allInterviewIds.every(id => passedIds.has(id)) && !unlockedAchievements.has('all_interviews')) {
        unlockAchievement('all_interviews');
      }
      
      saveUserData(currentUser, userData);
      
      // Update learning goals
      if (passed) {
        updateGoalProgress('interviews_pass', 1);
      }
      updateGoalProgress('xp_earn', xpReward);
    }
  };

  const closeInterview = (saveProgress = true) => {
    // Save progress before closing if interview is not completed
    if (saveProgress && activeInterview && !interviewCompleted && currentUser && !practiceMode) {
      saveInterviewProgress();
    }
    setActiveInterview(null);
    setInterviewCompleted(false);
    setInterviewResults(null);
    setInterviewTimerActive(false);
    setRetryMode(false);
    setRetryQuestions([]);
    setTimerWarning(null);
    setPracticeMode(false);
    setShowSolution(false);
    setShowConfetti(false);
  };
  
  const restartInterview = (interview) => {
    // Clear saved progress
    if (currentUser) {
      localStorage.removeItem(`sqlquest_interview_progress_${currentUser}`);
      setSavedInterviewProgress(null);
    }
    // Clear retry mode and practice mode
    setRetryMode(false);
    setRetryQuestions([]);
    setTimerWarning(null);
    setPracticeMode(false);
    setShowSolution(false);
    // Start fresh
    startInterview(interview, true);
  };

  const useInterviewHint = () => {
    setInterviewHintsUsed([...interviewHintsUsed, interviewQuestion]);
    setShowInterviewHint(true);
  };

  const canAccessInterview = (interview) => {
    return interview.isFree || userProStatus;
  };
  
  // Study a mistake with AI Tutor
  const studyMistakeWithAI = (mistake, resultId) => {
    // Mark mistake as studied
    if (currentUser && resultId) {
      const userData = JSON.parse(localStorage.getItem(`sqlquest_user_${currentUser}`) || '{}');
      const history = userData.interviewHistory || [];
      const resultIndex = history.findIndex(r => r.id === resultId);
      if (resultIndex >= 0) {
        if (!history[resultIndex].studiedMistakes) {
          history[resultIndex].studiedMistakes = [];
        }
        if (!history[resultIndex].studiedMistakes.includes(mistake.questionTitle)) {
          history[resultIndex].studiedMistakes.push(mistake.questionTitle);
        }
        userData.interviewHistory = history;
        saveUserData(currentUser, userData);
        setInterviewHistory(history);
      }
    }
    
    // Navigate to AI Tutor with the mistake
    setShowInterviewReview(null);
    setActiveTab('learn');
    
    // Find relevant lesson based on concepts
    const concept = mistake.concepts?.[0] || 'SELECT';
    const lessonIndex = getAiLessonForTopic(concept);
    setCurrentAiLesson(lessonIndex);
    setAiLessonPhase('intro');
    setAiMessages([{
      role: 'assistant',
      content: `👋 Let's review a question you missed in your interview!\n\n**Question:** ${mistake.questionTitle}\n\n${mistake.questionDescription?.replace(/\*\*(.*?)\*\*/g, '**$1**')}\n\n**Your answer:**\n\`\`\`sql\n${mistake.userQuery || '(No answer submitted)'}\n\`\`\`\n\n**Correct solution:**\n\`\`\`sql\n${mistake.correctSolution}\n\`\`\`\n\n**Why this works:**\nThe solution uses ${mistake.concepts?.join(', ')} to achieve the desired result. ${mistake.hints?.[0] || ''}\n\nWould you like me to explain this step by step, or shall we practice similar problems?`
    }]);
  };

  // Study a topic/concept with AI tutor (for clickable topic badges)
  const studyTopicWithAI = (topicName) => {
    // Close any open modals
    setShowProfile(false);
    setShowInterviewReview(null);
    
    // Navigate to AI Tutor
    setActiveTab('learn');
    
    // Find relevant lesson based on topic
    const lessonIndex = getAiLessonForTopic(topicName);
    setCurrentAiLesson(lessonIndex);
    setAiLessonPhase('intro');
    
    // Topic explanations mapping
    const topicExplanations = {
      'Filter and Sort': {
        intro: `📚 **Filter and Sort** is one of the most essential SQL skills!\n\n**WHERE Clause (Filtering)**\nThe WHERE clause filters rows based on conditions:\n\`\`\`sql\nSELECT * FROM employees WHERE salary > 50000;\nSELECT * FROM products WHERE category = 'Electronics';\n\`\`\`\n\n**ORDER BY Clause (Sorting)**\nORDER BY sorts results in ascending (ASC) or descending (DESC) order:\n\`\`\`sql\nSELECT * FROM employees ORDER BY salary DESC;\nSELECT * FROM products ORDER BY name ASC, price DESC;\n\`\`\`\n\n**Combining Both:**\n\`\`\`sql\nSELECT name, salary \nFROM employees \nWHERE department = 'Engineering'\nORDER BY salary DESC;\n\`\`\`\n\nWould you like to practice some filtering and sorting exercises?`,
      },
      'Aggregation Basics': {
        intro: `📚 **Aggregation Basics** - Calculating summaries from your data!\n\n**Common Aggregate Functions:**\n- \`COUNT()\` - Count rows\n- \`SUM()\` - Add up values\n- \`AVG()\` - Calculate average\n- \`MIN()\` / \`MAX()\` - Find smallest/largest\n\n**Examples:**\n\`\`\`sql\nSELECT COUNT(*) FROM employees;           -- Total employees\nSELECT AVG(salary) FROM employees;         -- Average salary\nSELECT MAX(salary) FROM employees;         -- Highest salary\nSELECT SUM(quantity) FROM orders;          -- Total items ordered\n\`\`\`\n\n**With GROUP BY:**\n\`\`\`sql\nSELECT department, AVG(salary) as avg_salary\nFROM employees\nGROUP BY department;\n\`\`\`\n\nWould you like to practice aggregation exercises?`,
      },
      'JOIN Tables': {
        intro: `📚 **JOIN Tables** - Combining data from multiple tables!\n\n**INNER JOIN** - Only matching rows from both tables:\n\`\`\`sql\nSELECT e.name, d.department_name\nFROM employees e\nINNER JOIN departments d ON e.dept_id = d.id;\n\`\`\`\n\n**LEFT JOIN** - All rows from left table + matches from right:\n\`\`\`sql\nSELECT c.name, o.order_id\nFROM customers c\nLEFT JOIN orders o ON c.id = o.customer_id;\n\`\`\`\n\n**RIGHT JOIN** - All rows from right table + matches from left\n\n**Key Points:**\n- Always specify the join condition with ON\n- Use table aliases (e, d, c, o) for cleaner code\n- LEFT JOIN is useful for finding records with no matches\n\nWould you like to practice JOIN exercises?`,
      },
      'Grouping with Conditions': {
        intro: `📚 **Grouping with Conditions** - Using GROUP BY with HAVING!\n\n**GROUP BY** groups rows with the same values:\n\`\`\`sql\nSELECT department, COUNT(*) as emp_count\nFROM employees\nGROUP BY department;\n\`\`\`\n\n**HAVING** filters groups (like WHERE, but for groups):\n\`\`\`sql\nSELECT department, AVG(salary) as avg_salary\nFROM employees\nGROUP BY department\nHAVING AVG(salary) > 60000;\n\`\`\`\n\n**WHERE vs HAVING:**\n- WHERE filters individual rows BEFORE grouping\n- HAVING filters groups AFTER grouping\n\n**Complete Example:**\n\`\`\`sql\nSELECT department, COUNT(*) as count, AVG(salary) as avg_sal\nFROM employees\nWHERE status = 'active'         -- Filter rows first\nGROUP BY department             -- Then group\nHAVING COUNT(*) > 5             -- Then filter groups\nORDER BY avg_sal DESC;          -- Finally sort\n\`\`\`\n\nWould you like to practice grouping exercises?`,
      },
      'Subqueries': {
        intro: `📚 **Subqueries** - Queries inside queries!\n\n**Scalar Subquery** (returns single value):\n\`\`\`sql\nSELECT name, salary\nFROM employees\nWHERE salary > (SELECT AVG(salary) FROM employees);\n\`\`\`\n\n**IN Subquery** (returns multiple values):\n\`\`\`sql\nSELECT name FROM customers\nWHERE id IN (SELECT customer_id FROM orders WHERE total > 1000);\n\`\`\`\n\n**EXISTS Subquery** (checks if rows exist):\n\`\`\`sql\nSELECT name FROM customers c\nWHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);\n\`\`\`\n\n**Correlated Subquery** (references outer query):\n\`\`\`sql\nSELECT name, salary, department\nFROM employees e1\nWHERE salary > (SELECT AVG(salary) FROM employees e2 \n                WHERE e2.department = e1.department);\n\`\`\`\n\nWould you like to practice subquery exercises?`,
      },
      'Window Functions': {
        intro: `📚 **Window Functions** - Powerful analytics over rows!\n\n**ROW_NUMBER()** - Assigns unique row numbers:\n\`\`\`sql\nSELECT name, salary,\n       ROW_NUMBER() OVER (ORDER BY salary DESC) as rank\nFROM employees;\n\`\`\`\n\n**RANK() / DENSE_RANK()** - Handle ties differently:\n\`\`\`sql\nSELECT name, salary,\n       RANK() OVER (ORDER BY salary DESC) as rank\nFROM employees;\n\`\`\`\n\n**PARTITION BY** - Window within groups:\n\`\`\`sql\nSELECT name, department, salary,\n       RANK() OVER (PARTITION BY department ORDER BY salary DESC)\nFROM employees;\n\`\`\`\n\n**Running Totals with SUM():**\n\`\`\`sql\nSELECT date, amount,\n       SUM(amount) OVER (ORDER BY date) as running_total\nFROM sales;\n\`\`\`\n\n**LAG/LEAD** - Access previous/next rows:\n\`\`\`sql\nSELECT month, revenue,\n       LAG(revenue) OVER (ORDER BY month) as prev_month\nFROM monthly_sales;\n\`\`\`\n\nWould you like to practice window function exercises?`,
      },
      'CTEs': {
        intro: `📚 **CTEs (Common Table Expressions)** - Named temporary result sets!\n\n**Basic CTE:**\n\`\`\`sql\nWITH high_earners AS (\n    SELECT * FROM employees WHERE salary > 80000\n)\nSELECT department, COUNT(*) as count\nFROM high_earners\nGROUP BY department;\n\`\`\`\n\n**Multiple CTEs:**\n\`\`\`sql\nWITH \n    dept_stats AS (\n        SELECT department, AVG(salary) as avg_sal\n        FROM employees GROUP BY department\n    ),\n    high_depts AS (\n        SELECT department FROM dept_stats\n        WHERE avg_sal > 70000\n    )\nSELECT e.name, e.salary, e.department\nFROM employees e\nWHERE e.department IN (SELECT department FROM high_depts);\n\`\`\`\n\n**Why use CTEs?**\n- Improve readability\n- Break complex queries into steps\n- Reuse the same subquery multiple times\n- Easier to debug and maintain\n\nWould you like to practice CTE exercises?`,
      },
      'CASE Statements': {
        intro: `📚 **CASE Statements** - Conditional logic in SQL!\n\n**Simple CASE:**\n\`\`\`sql\nSELECT name, salary,\n       CASE \n           WHEN salary >= 100000 THEN 'High'\n           WHEN salary >= 60000 THEN 'Medium'\n           ELSE 'Entry'\n       END as salary_level\nFROM employees;\n\`\`\`\n\n**CASE in Aggregations:**\n\`\`\`sql\nSELECT \n    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,\n    COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_count\nFROM users;\n\`\`\`\n\n**CASE with ORDER BY:**\n\`\`\`sql\nSELECT * FROM tasks\nORDER BY \n    CASE priority \n        WHEN 'high' THEN 1\n        WHEN 'medium' THEN 2\n        ELSE 3\n    END;\n\`\`\`\n\nWould you like to practice CASE statement exercises?`,
      },
      'String Functions': {
        intro: `📚 **String Functions** - Manipulating text in SQL!\n\n**Common Functions:**\n\`\`\`sql\n-- Change case\nSELECT UPPER(name), LOWER(email) FROM users;\n\n-- Extract parts\nSELECT SUBSTR(name, 1, 3) FROM users;  -- First 3 chars\n\n-- Get length\nSELECT name, LENGTH(name) FROM users;\n\n-- Concatenate\nSELECT first_name || ' ' || last_name as full_name FROM users;\n\n-- Trim whitespace\nSELECT TRIM(name) FROM users;\n\n-- Replace text\nSELECT REPLACE(phone, '-', '') FROM users;\n\`\`\`\n\n**Pattern Matching with LIKE:**\n\`\`\`sql\nSELECT * FROM users WHERE name LIKE 'J%';    -- Starts with J\nSELECT * FROM users WHERE email LIKE '%@gmail.com';\n\`\`\`\n\nWould you like to practice string function exercises?`,
      },
      'Date Functions': {
        intro: `📚 **Date Functions** - Working with dates and times!\n\n**SQLite Date Functions:**\n\`\`\`sql\n-- Extract parts\nSELECT strftime('%Y', order_date) as year FROM orders;\nSELECT strftime('%m', order_date) as month FROM orders;\nSELECT strftime('%d', order_date) as day FROM orders;\n\n-- Current date/time\nSELECT DATE('now');\nSELECT DATETIME('now');\n\n-- Date arithmetic\nSELECT DATE('now', '-7 days');   -- 7 days ago\nSELECT DATE('now', '+1 month');  -- 1 month from now\n\`\`\`\n\n**Filtering by Date:**\n\`\`\`sql\nSELECT * FROM orders\nWHERE order_date >= DATE('now', '-30 days');\n\nSELECT * FROM orders\nWHERE strftime('%Y', order_date) = '2024';\n\`\`\`\n\n**Grouping by Time Period:**\n\`\`\`sql\nSELECT strftime('%Y-%m', order_date) as month,\n       COUNT(*) as order_count\nFROM orders\nGROUP BY month;\n\`\`\`\n\nWould you like to practice date function exercises?`,
      }
    };
    
    // Normalize topic name for lookup
    const normalizedTopic = Object.keys(topicExplanations).find(
      key => key.toLowerCase() === topicName.toLowerCase() ||
             topicName.toLowerCase().includes(key.toLowerCase().split(' ')[0])
    );
    
    const explanation = topicExplanations[normalizedTopic] || {
      intro: `📚 **${topicName}** - Let's learn about this SQL concept!\n\nThis topic involves important SQL techniques. I'll help you understand it step by step.\n\nWhat would you like to know about ${topicName}? I can:\n- Explain the concept with examples\n- Show you common patterns\n- Give you practice problems\n- Answer specific questions\n\nJust ask!`
    };
    
    setAiMessages([{
      role: 'assistant',
      content: explanation.intro
    }]);
  };

  // ============ WEAKNESS TRAINING SYSTEM ============
  
  // Detect weaknesses from user history (interviews, daily challenges, 30-day progress)
  const detectWeaknesses = () => {
    const weaknessScores = {};
    
    // 1. Analyze interview mistakes (highest weight)
    interviewHistory.forEach(result => {
      if (result.mistakes) {
        result.mistakes.forEach(mistake => {
          const topic = mistake.questionTitle || mistake.concepts?.[0];
          if (topic) {
            if (!weaknessScores[topic]) {
              weaknessScores[topic] = { score: 0, sources: [], concepts: mistake.concepts || [] };
            }
            weaknessScores[topic].score += 3; // High weight for interview mistakes
            weaknessScores[topic].sources.push('interview');
          }
        });
      }
    });
    
    // 2. Analyze daily challenge history
    dailyChallengeHistory.forEach(challenge => {
      if (!challenge.warmupCorrect || challenge.hintUsed || challenge.answerShown) {
        const topic = challenge.topic;
        if (topic) {
          if (!weaknessScores[topic]) {
            weaknessScores[topic] = { score: 0, sources: [], concepts: challenge.concepts || [topic] };
          }
          if (!challenge.warmupCorrect) weaknessScores[topic].score += 1;
          if (challenge.hintUsed) weaknessScores[topic].score += 1.5;
          if (challenge.answerShown) weaknessScores[topic].score += 2;
          weaknessScores[topic].sources.push('daily');
        }
      }
    });
    
    // 3. Analyze 30-day challenge progress
    Object.entries(challengeProgress).forEach(([dayKey, progress]) => {
      if (progress && progress.hintUsed) {
        const dayNum = parseInt(dayKey.replace('day', ''));
        const dayData = window.sqlChallenge30Days?.find(d => d.day === dayNum);
        if (dayData) {
          const topic = dayData.title;
          if (!weaknessScores[topic]) {
            weaknessScores[topic] = { score: 0, sources: [], concepts: dayData.concepts || [] };
          }
          weaknessScores[topic].score += 1;
          weaknessScores[topic].sources.push('30day');
        }
      }
    });
    
    // Sort by score and get top weaknesses
    const sortedWeaknesses = Object.entries(weaknessScores)
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 5); // Keep top 5 for potential rotation
    
    return sortedWeaknesses;
  };
  
  // Get questions for a weakness topic from existing pools
  const getQuestionsForWeakness = (topicName, concepts) => {
    const questions = { easy: null, medium: null, hard: null };
    
    // Topic to category/keyword mapping (more comprehensive)
    const topicMappings = {
      'filter and sort': ['WHERE', 'ORDER BY', 'SELECT', 'filter', 'sort'],
      'aggregation basics': ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'aggregate', 'Aggregation', 'GROUP BY'],
      'aggregation': ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'aggregate', 'Aggregation', 'GROUP BY'],
      'join tables': ['JOIN', 'INNER JOIN', 'LEFT JOIN', 'join', 'Self-Join'],
      'join': ['JOIN', 'INNER JOIN', 'LEFT JOIN', 'join', 'Self-Join'],
      'grouping with conditions': ['GROUP BY', 'HAVING', 'group'],
      'group by': ['GROUP BY', 'HAVING', 'group', 'Aggregation'],
      'having': ['HAVING', 'GROUP BY'],
      'subqueries': ['Subquery', 'subqueries', 'nested', 'Correlated'],
      'subquery': ['Subquery', 'subqueries', 'nested', 'Correlated'],
      'window functions': ['Window', 'ROW_NUMBER', 'RANK', 'PARTITION', 'OVER', 'LAG', 'LEAD'],
      'window function': ['Window', 'ROW_NUMBER', 'RANK', 'PARTITION', 'OVER', 'LAG', 'LEAD'],
      'case statements': ['CASE', 'WHEN', 'conditional'],
      'string functions': ['String', 'LIKE', 'UPPER', 'LOWER', 'SUBSTR'],
      'date functions': ['Date', 'strftime', 'datetime'],
      'null handling': ['NULL', 'COALESCE', 'IFNULL'],
      'distinct': ['DISTINCT', 'unique'],
      'limit': ['LIMIT', 'TOP', 'OFFSET'],
      'select': ['SELECT', 'WHERE', 'ORDER BY'],
      'where': ['WHERE', 'filter', 'condition']
    };
    
    // Find matching keywords for this topic
    const topicLower = topicName.toLowerCase();
    let keywords = [];
    
    // Check direct mapping
    Object.entries(topicMappings).forEach(([topic, kws]) => {
      if (topicLower.includes(topic) || topic.includes(topicLower.split(' ')[0])) {
        keywords = [...keywords, ...kws];
      }
    });
    
    // Add concepts if provided
    if (concepts && concepts.length > 0) {
      keywords = [...keywords, ...concepts];
    }
    
    // Add the topic name words
    topicName.split(' ').forEach(word => {
      if (word.length > 2) keywords.push(word);
    });
    
    // Ensure we have some keywords
    if (keywords.length === 0) {
      keywords = ['SELECT', 'WHERE', 'GROUP BY'];
    }
    
    keywords = [...new Set(keywords.map(k => k.toLowerCase()))];
    
    // Get challenges from window (ensure we have latest data)
    const allChallenges = window.challengesData || challenges || [];
    
    console.log('Weakness Training - Looking for:', topicName);
    console.log('Keywords:', keywords);
    console.log('Total challenges available:', allChallenges.length);
    
    const conceptMatches = allChallenges.filter(c => {
      const category = (c.category || '').toLowerCase();
      const title = (c.title || '').toLowerCase();
      const description = (c.description || '').toLowerCase();
      
      return keywords.some(kw => 
        category.includes(kw) || 
        kw.includes(category.split(' ')[0]) ||
        title.includes(kw) || 
        description.includes(kw)
      );
    });
    
    console.log('Matching challenges found:', conceptMatches.length);
    
    // Categorize by difficulty (case insensitive)
    const getDifficulty = (c) => (c.difficulty || '').toLowerCase();
    const easyChallenges = conceptMatches.filter(c => getDifficulty(c) === 'easy');
    const mediumChallenges = conceptMatches.filter(c => getDifficulty(c) === 'medium');
    const hardChallenges = conceptMatches.filter(c => ['hard', 'medium-hard'].includes(getDifficulty(c)));
    
    console.log('Easy:', easyChallenges.length, 'Medium:', mediumChallenges.length, 'Hard:', hardChallenges.length);
    
    // Select questions (avoid already solved ones if possible)
    const selectQuestion = (pool) => {
      if (!pool || pool.length === 0) return null;
      const unsolved = pool.filter(q => !solvedChallenges.has(q.id));
      return unsolved.length > 0 ? unsolved[Math.floor(Math.random() * unsolved.length)] : 
             pool[Math.floor(Math.random() * pool.length)];
    };
    
    questions.easy = selectQuestion(easyChallenges);
    questions.medium = selectQuestion(mediumChallenges.length > 0 ? mediumChallenges : easyChallenges);
    questions.hard = selectQuestion(hardChallenges.length > 0 ? hardChallenges : mediumChallenges.length > 0 ? mediumChallenges : easyChallenges);
    
    // Fallback: if still no questions, pick any from the pool by difficulty
    if ((!questions.easy || !questions.medium || !questions.hard) && allChallenges.length > 0) {
      console.log('Using fallback - picking from all challenges');
      const easyPool = allChallenges.filter(c => getDifficulty(c) === 'easy');
      const medPool = allChallenges.filter(c => getDifficulty(c) === 'medium');
      const hardPool = allChallenges.filter(c => ['hard', 'medium-hard'].includes(getDifficulty(c)));
      
      if (!questions.easy) questions.easy = selectQuestion(easyPool);
      if (!questions.medium) questions.medium = selectQuestion(medPool.length > 0 ? medPool : easyPool);
      if (!questions.hard) questions.hard = selectQuestion(hardPool.length > 0 ? hardPool : medPool.length > 0 ? medPool : easyPool);
    }
    
    // Ultimate fallback: just pick any 3 challenges
    if ((!questions.easy || !questions.medium || !questions.hard) && allChallenges.length >= 3) {
      console.log('Using ultimate fallback - picking any challenges');
      const shuffled = [...allChallenges].sort(() => Math.random() - 0.5);
      if (!questions.easy) questions.easy = shuffled[0];
      if (!questions.medium) questions.medium = shuffled[1];
      if (!questions.hard) questions.hard = shuffled[2];
    }
    
    console.log('Final questions:', questions);
    
    return questions;
  };
  
  // Topic explanations for Level 1 (Concept Review)
  const getTopicExplanation = (topicName) => {
    const explanations = {
      'Filter and Sort': `## Filter and Sort

**WHERE Clause** filters rows based on conditions:
\`\`\`sql
SELECT * FROM employees WHERE salary > 50000;
SELECT * FROM products WHERE category = 'Electronics' AND price < 100;
\`\`\`

**ORDER BY** sorts results:
\`\`\`sql
SELECT * FROM employees ORDER BY salary DESC;
SELECT * FROM products ORDER BY category ASC, price DESC;
\`\`\`

**Key Points:**
- WHERE comes before ORDER BY
- Use AND/OR to combine conditions
- ASC (default) = ascending, DESC = descending`,

      'Aggregation Basics': `## Aggregation Functions

**COUNT()** - Count rows
**SUM()** - Add values
**AVG()** - Calculate average
**MIN() / MAX()** - Find extremes

\`\`\`sql
SELECT COUNT(*) FROM employees;
SELECT AVG(salary) FROM employees;
SELECT department, SUM(salary) FROM employees GROUP BY department;
\`\`\`

**Key Points:**
- Aggregates work on groups of rows
- Use with GROUP BY for per-group calculations
- NULL values are typically ignored`,

      'JOIN Tables': `## JOIN Operations

**INNER JOIN** - Only matching rows:
\`\`\`sql
SELECT e.name, d.dept_name
FROM employees e
INNER JOIN departments d ON e.dept_id = d.id;
\`\`\`

**LEFT JOIN** - All left + matching right:
\`\`\`sql
SELECT c.name, o.order_id
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id;
\`\`\`

**Key Points:**
- Always specify JOIN condition with ON
- Use table aliases for cleaner code
- LEFT JOIN shows NULLs for non-matches`,

      'Grouping with Conditions': `## GROUP BY with HAVING

**GROUP BY** groups rows:
\`\`\`sql
SELECT department, COUNT(*) as emp_count
FROM employees
GROUP BY department;
\`\`\`

**HAVING** filters groups:
\`\`\`sql
SELECT department, AVG(salary)
FROM employees
GROUP BY department
HAVING AVG(salary) > 60000;
\`\`\`

**WHERE vs HAVING:**
- WHERE filters rows BEFORE grouping
- HAVING filters groups AFTER grouping`,

      'Subqueries': `## Subqueries

**Scalar Subquery** (single value):
\`\`\`sql
SELECT name FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees);
\`\`\`

**IN Subquery** (multiple values):
\`\`\`sql
SELECT name FROM customers
WHERE id IN (SELECT customer_id FROM orders);
\`\`\`

**EXISTS Subquery:**
\`\`\`sql
SELECT name FROM customers c
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);
\`\`\``,

      'Window Functions': `## Window Functions

**ROW_NUMBER()** - Unique row numbers:
\`\`\`sql
SELECT name, ROW_NUMBER() OVER (ORDER BY salary DESC) as rank
FROM employees;
\`\`\`

**RANK() / DENSE_RANK()** - Handle ties:
\`\`\`sql
SELECT name, RANK() OVER (PARTITION BY dept ORDER BY salary DESC)
FROM employees;
\`\`\`

**Running Totals:**
\`\`\`sql
SELECT date, SUM(amount) OVER (ORDER BY date) as running_total
FROM sales;
\`\`\``,

      'CASE Statements': `## CASE Expressions

**Simple CASE:**
\`\`\`sql
SELECT name,
  CASE 
    WHEN salary >= 100000 THEN 'High'
    WHEN salary >= 60000 THEN 'Medium'
    ELSE 'Entry'
  END as level
FROM employees;
\`\`\`

**CASE in Aggregations:**
\`\`\`sql
SELECT 
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
  COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive
FROM users;
\`\`\``
    };
    
    // Find matching explanation or generate generic one
    const key = Object.keys(explanations).find(k => 
      topicName.toLowerCase().includes(k.toLowerCase().split(' ')[0]) ||
      k.toLowerCase().includes(topicName.toLowerCase().split(' ')[0])
    );
    
    return explanations[key] || `## ${topicName}

This topic involves important SQL concepts. Let's review the key points:

**Common Patterns:**
- Understand the syntax and when to use it
- Practice with simple examples first
- Build up to more complex queries

Complete Level 1 to move on to practice questions!`;
  };
  
  // Refresh weaknesses (weekly or on demand)
  const refreshWeaknesses = () => {
    const detectedWeaknesses = detectWeaknesses();
    const now = new Date().toISOString();
    
    // Keep currently active weaknesses that aren't mastered
    const currentTopics = { ...(weaknessTracking?.topics || {}) };
    const activeTopicNames = Object.keys(currentTopics).filter(t => currentTopics[t]?.currentLevel < 5);
    
    // Create new weakness tracking
    const newTopics = {};
    let count = 0;
    
    // First, keep active weaknesses (up to 3)
    activeTopicNames.forEach(topic => {
      if (count < 3) {
        newTopics[topic] = currentTopics[topic];
        count++;
      }
    });
    
    // Then add new weaknesses if we have room
    detectedWeaknesses.forEach(([topic, data]) => {
      if (count < 3 && !newTopics[topic]) {
        newTopics[topic] = {
          firstDetected: now,
          source: data.sources[0] || 'unknown',
          concepts: data.concepts,
          score: data.score,
          currentLevel: 1, // 1=Concept, 2=Easy, 3=Medium, 4=Hard, 5=Mastered
          levelProgress: { 1: false, 2: false, 3: false, 4: false },
          questions: getQuestionsForWeakness(topic, data.concepts),
          attempts: 0
        };
        count++;
      }
    });
    
    const newTracking = {
      ...weaknessTracking,
      topics: newTopics,
      lastRefresh: now
    };
    
    setWeaknessTracking(newTracking);
    
    // Save to user data
    if (currentUser) {
      const userData = JSON.parse(localStorage.getItem(`sqlquest_user_${currentUser}`) || '{}');
      userData.weaknessTracking = newTracking;
      saveUserData(currentUser, userData);
    }
    
    return newTracking;
  };
  
  // Check if weekly refresh is needed
  const checkWeeklyRefresh = () => {
    if (!weaknessTracking?.lastRefresh) {
      return true;
    }
    const lastRefresh = new Date(weaknessTracking.lastRefresh);
    const now = new Date();
    const daysSinceRefresh = (now - lastRefresh) / (1000 * 60 * 60 * 24);
    return daysSinceRefresh >= 7;
  };
  
  // Start training a weakness
  const startWeaknessTraining = (topicName) => {
    const weakness = weaknessTracking?.topics?.[topicName];
    if (!weakness) return;
    
    // Dynamically refresh questions when starting training
    const freshQuestions = getQuestionsForWeakness(topicName, weakness.concepts);
    
    // Update the weakness with fresh questions
    const newTracking = { ...weaknessTracking, topics: { ...(weaknessTracking?.topics || {}) } };
    newTracking.topics[topicName] = {
      ...newTracking.topics[topicName],
      questions: freshQuestions
    };
    setWeaknessTracking(newTracking);
    
    setActiveWeakness(topicName);
    setWeaknessQuery('');
    setWeaknessResult({ columns: [], rows: [], error: null });
    setWeaknessStatus(null);
    setShowWeaknessHint(false);
  };
  
  // Complete a level of weakness training
  const completeWeaknessLevel = (topicName, level, passed) => {
    const newTracking = { ...weaknessTracking, topics: { ...(weaknessTracking?.topics || {}) } };
    const weakness = newTracking.topics[topicName];
    
    if (!weakness) return;
    
    weakness.attempts++;
    
    if (passed) {
      weakness.levelProgress[level] = true;
      
      if (level === 4) {
        // Mastered! Remove from active weaknesses
        weakness.currentLevel = 5;
        newTracking.clearedTopics = [...(newTracking.clearedTopics || []), topicName];
        newTracking.totalCleared = (newTracking.totalCleared || 0) + 1;
        
        // Award bonus XP
        const bonusXP = 50;
        setXP(prev => prev + bonusXP);
        
        // Check if we need to add a new weakness
        const activeCount = Object.values(newTracking.topics).filter(t => t.currentLevel < 5).length;
        if (activeCount < 3) {
          const detectedWeaknesses = detectWeaknesses();
          const existingTopics = Object.keys(newTracking.topics);
          const newWeakness = detectedWeaknesses.find(([topic]) => !existingTopics.includes(topic));
          
          if (newWeakness) {
            const [topic, data] = newWeakness;
            newTracking.topics[topic] = {
              firstDetected: new Date().toISOString(),
              source: data.sources[0] || 'unknown',
              concepts: data.concepts,
              score: data.score,
              currentLevel: 1,
              levelProgress: { 1: false, 2: false, 3: false, 4: false },
              questions: getQuestionsForWeakness(topic, data.concepts),
              attempts: 0
            };
          }
        }
        
        // Remove mastered topic from active display
        delete newTracking.topics[topicName];
        setActiveWeakness(null);
        
        playSound('success');
      } else {
        // Move to next level
        weakness.currentLevel = level + 1;
        playSound('success');
      }
    } else {
      // Failed - stay on same level, can retry
      playSound('error');
    }
    
    setWeaknessTracking(newTracking);
    
    // Save to user data
    if (currentUser) {
      const userData = JSON.parse(localStorage.getItem(`sqlquest_user_${currentUser}`) || '{}');
      userData.weaknessTracking = newTracking;
      saveUserData(currentUser, userData);
    }
    
    // Reset UI state
    setWeaknessQuery('');
    setWeaknessResult({ columns: [], rows: [], error: null });
    setWeaknessStatus(null);
    setShowWeaknessHint(false);
  };
  
  // Run weakness training query
  const runWeaknessQuery = (question) => {
    if (!weaknessQuery.trim() || !db) return;
    
    try {
      const result = db.exec(weaknessQuery);
      if (result.length > 0) {
        setWeaknessResult({
          columns: result[0].columns,
          rows: result[0].values,
          error: null
        });
      } else {
        setWeaknessResult({ columns: [], rows: [], error: 'Query returned no results' });
      }
    } catch (error) {
      setWeaknessResult({ columns: [], rows: [], error: error.message });
    }
  };
  
  // Check weakness answer
  const checkWeaknessAnswer = (question, topicName, level) => {
    if (!weaknessQuery.trim() || !db) return;
    
    try {
      const userResult = db.exec(weaknessQuery);
      const solutionResult = db.exec(question.solution);
      
      // Compare results
      const userRows = userResult.length > 0 ? userResult[0].values : [];
      const solutionRows = solutionResult.length > 0 ? solutionResult[0].values : [];
      
      const isCorrect = JSON.stringify(userRows) === JSON.stringify(solutionRows) ||
                        (userRows.length === solutionRows.length && 
                         userRows.every((row, i) => JSON.stringify(row.sort()) === JSON.stringify(solutionRows[i].sort())));
      
      if (isCorrect) {
        setWeaknessStatus('success');
        setTimeout(() => {
          completeWeaknessLevel(topicName, level, true);
        }, 1500);
      } else {
        setWeaknessStatus('error');
      }
    } catch (error) {
      setWeaknessResult({ columns: [], rows: [], error: error.message });
      setWeaknessStatus('error');
    }
  };

  // ============ INTERVIEW ENHANCEMENT FUNCTIONS ============
  
  // Get interview recommendation based on user history
  const getInterviewRecommendation = () => {
    if (!interviewHistory || interviewHistory.length === 0) {
      // New user - recommend the free Data Analyst interview
      return {
        interview: mockInterviews.find(i => i.isFree) || mockInterviews[0],
        reason: "Start with our free Data Analyst interview to assess your skills!",
        type: 'new_user'
      };
    }
    
    // Analyze completed interviews
    const completedIds = new Set(interviewHistory.map(h => h.interviewId));
    const passedIds = new Set(interviewHistory.filter(h => h.passed).map(h => h.interviewId));
    const failedInterviews = interviewHistory.filter(h => !h.passed);
    
    // Get concept weaknesses from mistakes
    const conceptMistakes = {};
    interviewHistory.forEach(result => {
      (result.mistakes || []).forEach(mistake => {
        (mistake.concepts || []).forEach(concept => {
          conceptMistakes[concept] = (conceptMistakes[concept] || 0) + 1;
        });
      });
    });
    
    // Sort concepts by mistake count
    const weakConcepts = Object.entries(conceptMistakes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([concept]) => concept);
    
    // Priority 1: Retry failed interviews
    if (failedInterviews.length > 0) {
      const lastFailed = failedInterviews[failedInterviews.length - 1];
      const interview = mockInterviews.find(i => i.id === lastFailed.interviewId);
      if (interview && (interview.isFree || userProStatus)) {
        return {
          interview,
          reason: `Retry "${interview.title}" to improve your score from ${lastFailed.scorePercent}%`,
          type: 'retry_failed',
          weakConcepts
        };
      }
    }
    
    // Priority 2: Try interviews covering weak concepts
    const notCompletedInterviews = mockInterviews.filter(i => 
      !completedIds.has(i.id) && (i.isFree || userProStatus)
    );
    
    if (weakConcepts.length > 0 && notCompletedInterviews.length > 0) {
      // Find interview that covers weak concepts
      for (const interview of notCompletedInterviews) {
        const interviewConcepts = interview.questions.flatMap(q => q.concepts || []);
        const matchingConcepts = weakConcepts.filter(c => 
          interviewConcepts.some(ic => ic.toLowerCase().includes(c.toLowerCase()))
        );
        if (matchingConcepts.length > 0) {
          return {
            interview,
            reason: `Practice ${matchingConcepts.join(', ')} with "${interview.title}"`,
            type: 'improve_weakness',
            weakConcepts
          };
        }
      }
    }
    
    // Priority 3: Try next difficulty level
    const highestPassedDifficulty = interviewHistory
      .filter(h => h.passed)
      .reduce((max, h) => {
        const interview = mockInterviews.find(i => i.id === h.interviewId);
        if (!interview) return max;
        const difficultyOrder = { 'Easy': 1, 'Easy-Medium': 2, 'Medium': 3, 'Medium-Hard': 4, 'Hard': 5 };
        return Math.max(max, difficultyOrder[interview.difficulty] || 0);
      }, 0);
    
    const nextDifficultyInterview = notCompletedInterviews.find(i => {
      const difficultyOrder = { 'Easy': 1, 'Easy-Medium': 2, 'Medium': 3, 'Medium-Hard': 4, 'Hard': 5 };
      return (difficultyOrder[i.difficulty] || 0) === highestPassedDifficulty + 1;
    });
    
    if (nextDifficultyInterview) {
      return {
        interview: nextDifficultyInterview,
        reason: `Ready for a challenge? Try "${nextDifficultyInterview.title}"!`,
        type: 'next_level',
        weakConcepts
      };
    }
    
    // Priority 4: Any uncompleted interview
    if (notCompletedInterviews.length > 0) {
      return {
        interview: notCompletedInterviews[0],
        reason: `Try "${notCompletedInterviews[0].title}" - you haven't attempted it yet!`,
        type: 'new_interview',
        weakConcepts
      };
    }
    
    // All completed - suggest retry for better score
    const lowestScoreResult = [...interviewHistory].sort((a, b) => a.scorePercent - b.scorePercent)[0];
    const interview = mockInterviews.find(i => i.id === lowestScoreResult?.interviewId);
    if (interview) {
      return {
        interview,
        reason: `Improve your ${lowestScoreResult.scorePercent}% on "${interview.title}"`,
        type: 'improve_score',
        weakConcepts
      };
    }
    
    return null;
  };
  
  // Start retry mode - only failed questions from a previous attempt
  const startRetryMode = (result) => {
    if (!result || !result.mistakes || result.mistakes.length === 0) return;
    
    const interview = mockInterviews.find(i => i.id === result.interviewId);
    if (!interview) return;
    
    // Get indices of failed questions
    const failedIndices = result.mistakes.map(m => m.questionIndex);
    
    // Create a modified interview with only failed questions
    const retryInterview = {
      ...interview,
      title: `${interview.title} (Retry)`,
      questions: failedIndices.map((idx, newIdx) => ({
        ...interview.questions[idx],
        order: newIdx + 1,
        originalIndex: idx // Keep track of original index
      })),
      totalTime: Math.ceil(interview.totalTime * (failedIndices.length / interview.questions.length))
    };
    
    setRetryMode(true);
    setRetryQuestions(failedIndices);
    setActiveInterview(retryInterview);
    setInterviewQuestion(0);
    setInterviewQuery('');
    setInterviewResult({ columns: [], rows: [], error: null });
    setInterviewTimer(0);
    setInterviewTotalTimer(0);
    setInterviewAnswers([]);
    setInterviewCompleted(false);
    setInterviewResults(null);
    setInterviewHintsUsed([]);
    setShowInterviewHint(false);
    setTimerWarning(null);
    setInterviewTimerActive(true);
    setShowInterviewReview(null);
    
    // Load the first question's dataset
    if (db && retryInterview.questions[0]?.dataset) {
      loadDataset(db, retryInterview.questions[0].dataset);
    }
  };
  
  // Get interview performance analytics
  const getInterviewAnalytics = () => {
    if (!interviewHistory || interviewHistory.length === 0) {
      return {
        totalAttempts: 0,
        passRate: 0,
        avgScore: 0,
        totalTime: 0,
        conceptPerformance: {},
        improvementTrend: [],
        recentPerformance: []
      };
    }
    
    const totalAttempts = interviewHistory.length;
    const passedCount = interviewHistory.filter(h => h.passed).length;
    const passRate = Math.round((passedCount / totalAttempts) * 100);
    const avgScore = Math.round(interviewHistory.reduce((sum, h) => sum + (h.scorePercent || 0), 0) / totalAttempts);
    const totalTime = interviewHistory.reduce((sum, h) => sum + (h.timeUsed || 0), 0);
    
    // Concept performance tracking
    const conceptStats = {};
    interviewHistory.forEach(result => {
      // Count correct answers by concept
      (result.questionResults || []).forEach(qr => {
        (qr.concepts || []).forEach(concept => {
          if (!conceptStats[concept]) {
            conceptStats[concept] = { correct: 0, total: 0 };
          }
          conceptStats[concept].total++;
          if (qr.correct) {
            conceptStats[concept].correct++;
          }
        });
      });
    });
    
    // Calculate percentage for each concept
    const conceptPerformance = {};
    Object.entries(conceptStats).forEach(([concept, stats]) => {
      conceptPerformance[concept] = {
        percentage: Math.round((stats.correct / stats.total) * 100),
        correct: stats.correct,
        total: stats.total
      };
    });
    
    // Improvement trend (last 10 attempts)
    const improvementTrend = interviewHistory.slice(-10).map((h, i) => ({
      attempt: i + 1,
      score: h.scorePercent || 0,
      date: h.timestamp
    }));
    
    // Recent performance (last 5)
    const recentPerformance = interviewHistory.slice(-5).reverse().map(h => ({
      title: h.title || 'Unknown Interview',
      score: h.scorePercent || 0,
      passed: h.passed,
      date: h.timestamp,
      timeUsed: h.timeUsed || 0,
      mistakeCount: (h.mistakes || []).length
    }));
    
    return {
      totalAttempts,
      passRate,
      avgScore,
      totalTime,
      conceptPerformance,
      improvementTrend,
      recentPerformance
    };
  };

  const upgradeToProMock = (isLifetime = false) => {
    // In real app, this would handle payment
    // For demo, we'll just set pro status with expiry
    if (currentUser) {
      const userData = JSON.parse(localStorage.getItem(`sqlquest_user_${currentUser}`) || '{}');
      userData.proStatus = true;
      userData.proAutoRenew = !isLifetime; // Lifetime doesn't auto-renew
      
      if (isLifetime) {
        // Lifetime: set expiry far in future
        const expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 100);
        userData.proExpiry = expiry.toISOString();
        userData.proType = 'lifetime';
      } else {
        // Monthly: set expiry 30 days from now
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 30);
        userData.proExpiry = expiry.toISOString();
        userData.proType = 'monthly';
      }
      
      saveUserData(currentUser, userData);
      setUserProStatus(true);
      setProType(userData.proType);
      setProExpiry(userData.proExpiry);
      setProAutoRenew(userData.proAutoRenew);
      setShowProModal(false);
      console.log('Upgraded to Pro:', { proType: userData.proType, proExpiry: userData.proExpiry });
    }
  };
  
  const cancelProSubscription = () => {
    if (currentUser) {
      const userData = JSON.parse(localStorage.getItem(`sqlquest_user_${currentUser}`) || '{}');
      userData.proAutoRenew = false;
      saveUserData(currentUser, userData);
      setProAutoRenew(false);
    }
  };
  
  const reactivateProSubscription = () => {
    if (currentUser) {
      const userData = JSON.parse(localStorage.getItem(`sqlquest_user_${currentUser}`) || '{}');
      userData.proAutoRenew = true;
      // If expired, extend from now
      if (new Date(userData.proExpiry) < new Date()) {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 30);
        userData.proExpiry = expiry.toISOString();
        userData.proStatus = true;
        setUserProStatus(true);
        setProExpiry(userData.proExpiry);
      }
      saveUserData(currentUser, userData);
      setProAutoRenew(true);
    }
  };

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
    setIsSessionLoading(true); // Prevent save during load
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
      
      // Restore Pro Subscription status (synced from cloud)
      // Debug logging - can be removed in production
      console.log('Loading pro status:', { 
        proStatus: userData.proStatus, 
        proType: userData.proType, 
        proExpiry: userData.proExpiry,
        proAutoRenew: userData.proAutoRenew
      });
      
      const isLifetime = userData.proType === 'lifetime';
      const expiry = userData.proExpiry ? new Date(userData.proExpiry) : null;
      const isExpired = expiry ? expiry <= new Date() : true; // If no expiry, treat as expired (unless lifetime)
      
      if (userData.proStatus === true) {
        if (isLifetime) {
          // Lifetime subscription - always valid
          setUserProStatus(true);
          setProType('lifetime');
          setProExpiry(userData.proExpiry || null);
          setProAutoRenew(false);
          console.log('Pro status: Lifetime active');
        } else if (!isExpired) {
          // Monthly subscription - not expired
          setUserProStatus(true);
          setProType('monthly');
          setProExpiry(userData.proExpiry);
          setProAutoRenew(userData.proAutoRenew !== false);
          console.log('Pro status: Monthly active');
        } else if (userData.proAutoRenew) {
          // Expired but auto-renew is on - extend by 30 days
          const newExpiry = new Date();
          newExpiry.setDate(newExpiry.getDate() + 30);
          userData.proExpiry = newExpiry.toISOString();
          userData.proStatus = true;
          setUserProStatus(true);
          setProType('monthly');
          setProExpiry(userData.proExpiry);
          setProAutoRenew(true);
          // Save the renewed expiry to cloud
          saveUserData(username, userData);
          console.log('Pro status: Auto-renewed');
        } else {
          // Expired and no auto-renew
          setUserProStatus(false);
          setProType(null);
          setProExpiry(null);
          setProAutoRenew(false);
          console.log('Pro status: Expired');
        }
      } else {
        setUserProStatus(false);
        setProType(null);
        setProExpiry(null);
        setProAutoRenew(false);
        console.log('Pro status: Free plan');
      }
      
      // Restore Interview History (synced from cloud)
      setInterviewHistory(userData.interviewHistory || []);
      
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
      
      // Restore 30-Day Challenge progress
      setChallengeProgress(userData.thirtyDayProgress || {});
      setChallengeStartDate(userData.thirtyDayStartDate || null);
      
      // Restore Weakness Tracking
      if (userData.weaknessTracking) {
        setWeaknessTracking(userData.weaknessTracking);
      }
      
      setShowAuth(false);
      localStorage.setItem('sqlquest_user', username);
    } else {
      setCurrentUser(username);
      setShowAuth(false);
      localStorage.setItem('sqlquest_user', username);
    }
    setIsSessionLoading(false); // Allow saves now
  };

  // ============ SOUND EFFECTS ============
  const playSound = (type) => {
    if (!soundEnabled) return;
    
    const sounds = {
      success: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1ubJOVlIJyd3qKkpGCdm58iI+RhXl0fYaMjoZ8dX6EjI6HfnV/hIuNh395gISKjIiBeoGFiouJgnyBhYqLiYJ8gYWJi4mCfIGFiYuJgnyBhYmLiYJ8gYWJi4mCfIGFiYuJgnyBhYmLiYJ8gYWJi4mCfIGFiYuJgnyBhYmLiYl/',
      error: 'data:audio/wav;base64,UklGRl9vT19teleElFRzT19teleElFRzT19teleElFRzT19teleElFRzT19teleElFR/',
      click: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1ubJOVlIJyd3qKkpGCdm58iI+RhXl/',
      reward: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1ubJOVlIJyd3qKkpGCdm58iI+RhXl0fYaMjoZ8dX6EjI6HfnV/hIuNh395gISKjIiBeoGFiouJgnyBhYqLiYJ8gYWJi4mCfIGFiYuJgnyBhYmLiYJ8gYWJi4mCfIGFiYuJgnyBhYmLiYJ8gYWJi4mCfIGFiYuJgnyBhYmLiYmBhYqFbF1ubJOVlIJyd3qK/',
      warning: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1ubJOVlIJyd3qKkpGCdm58iI+RhXl0fYaMjoZ8dX6EjI6HfnV/hIuNh395gISKjIiBeoGFiouJgnyBhYqLiYJ8/'
    };
    
    try {
      const audio = new Audio(sounds[type] || sounds.click);
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (e) {}
  };
  
  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem('sqlquest_sound_enabled', newValue.toString());
    if (newValue) playSound('click');
  };

  // ============ DAILY LOGIN REWARDS ============
  const checkDailyLoginReward = () => {
    if (!currentUser || isGuest) return;
    
    const today = getTodayString();
    const userData = JSON.parse(localStorage.getItem(`sqlquest_user_${currentUser}`) || '{}');
    const lastLogin = userData.lastLoginDate;
    const currentStreak = userData.loginStreak || 0;
    
    // Already claimed today
    if (lastLogin === today) {
      setLoginStreak(currentStreak);
      setLastLoginDate(today);
      return;
    }
    
    // Check if streak continues or resets
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    let newStreak;
    if (lastLogin === yesterdayStr) {
      // Streak continues
      newStreak = currentStreak + 1;
    } else if (!lastLogin) {
      // First login ever
      newStreak = 1;
    } else {
      // Streak broken
      newStreak = 1;
    }
    
    // Calculate reward based on streak
    const baseReward = 10;
    const streakBonus = Math.min(newStreak - 1, 6) * 5; // Max +30 at day 7
    const milestoneBonus = newStreak % 7 === 0 ? 50 : 0; // Weekly milestone
    const totalReward = baseReward + streakBonus + milestoneBonus;
    
    setLoginStreak(newStreak);
    setLastLoginDate(today);
    setLoginRewardAmount(totalReward);
    setShowLoginReward(true);
  };
  
  const claimLoginReward = () => {
    if (!currentUser || isGuest) return;
    
    const today = getTodayString();
    const userData = JSON.parse(localStorage.getItem(`sqlquest_user_${currentUser}`) || '{}');
    
    // Award XP
    userData.xp = (userData.xp || 0) + loginRewardAmount;
    userData.loginStreak = loginStreak;
    userData.lastLoginDate = today;
    
    setXP(userData.xp);
    saveUserData(currentUser, userData);
    
    playSound('reward');
    setShowLoginReward(false);
    setShowLoginRewardClaimed(true);
    setTimeout(() => setShowLoginRewardClaimed(false), 2000);
  };

  // ============ LEARNING GOALS ============
  const getWeekStart = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.setDate(diff)).toISOString().split('T')[0];
  };
  
  const loadWeeklyGoals = () => {
    if (!currentUser || isGuest) return [];
    const userData = JSON.parse(localStorage.getItem(`sqlquest_user_${currentUser}`) || '{}');
    const weekStart = getWeekStart();
    
    // Reset goals if it's a new week
    if (userData.goalsWeekStart !== weekStart) {
      return [];
    }
    return userData.weeklyGoals || [];
  };
  
  const saveWeeklyGoals = (goals) => {
    if (!currentUser || isGuest) return;
    const userData = JSON.parse(localStorage.getItem(`sqlquest_user_${currentUser}`) || '{}');
    userData.weeklyGoals = goals;
    userData.goalsWeekStart = getWeekStart();
    saveUserData(currentUser, userData);
    setWeeklyGoals(goals);
  };
  
  const addGoal = (goalType, target) => {
    const newGoal = {
      id: Date.now(),
      type: goalType, // 'interviews_pass', 'challenges_solve', 'xp_earn', 'daily_streak'
      target: target,
      progress: 0,
      completed: false,
      createdAt: new Date().toISOString()
    };
    const newGoals = [...weeklyGoals, newGoal];
    saveWeeklyGoals(newGoals);
    playSound('click');
  };
  
  const updateGoalProgress = (goalType, amount) => {
    const updatedGoals = weeklyGoals.map(goal => {
      if (goal.type === goalType && !goal.completed) {
        const newProgress = goal.progress + amount;
        const completed = newProgress >= goal.target;
        if (completed && !goal.completed) {
          playSound('reward');
          // Award bonus XP for completing goal
          const bonusXP = goal.target * 5;
          setXP(prev => prev + bonusXP);
        }
        return { ...goal, progress: newProgress, completed };
      }
      return goal;
    });
    saveWeeklyGoals(updatedGoals);
  };
  
  const removeGoal = (goalId) => {
    const newGoals = weeklyGoals.filter(g => g.id !== goalId);
    saveWeeklyGoals(newGoals);
  };
  
  const getGoalLabel = (type) => {
    const labels = {
      'interviews_pass': 'Pass Interviews',
      'challenges_solve': 'Solve Challenges', 
      'xp_earn': 'Earn XP',
      'daily_streak': 'Daily Streak Days'
    };
    return labels[type] || type;
  };

  // ============ SHARE RESULTS ============
  const openShareModal = (result) => {
    setShareData(result);
    setShowShareModal(true);
  };
  
  const generateShareText = (result) => {
    const emoji = result.passed ? '🎉' : '💪';
    const appUrl = 'https://sql-quest2.vercel.app/';
    return `${emoji} I just ${result.passed ? 'passed' : 'completed'} the "${result.interviewTitle}" SQL interview with ${result.percentage}%!\n\nPractice SQL at ${appUrl}\n\n#SQLQuest #SQL #DataAnalytics`;
  };
  
  const shareToTwitter = (result) => {
    const text = encodeURIComponent(generateShareText(result));
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
    playSound('click');
  };
  
  const shareToLinkedIn = (result) => {
    const appUrl = 'https://sql-quest2.vercel.app/';
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(appUrl)}`, '_blank');
    playSound('click');
  };
  
  const copyShareLink = (result) => {
    const text = generateShareText(result);
    navigator.clipboard.writeText(text).then(() => {
      playSound('success');
      alert('Copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy');
    });
  };

  // ============ CERTIFICATES ============
  const openCertificateModal = (result) => {
    setCertificateData(result);
    setShowCertificateModal(true);
  };
  
  const generateCertificateHTML = (result) => {
    const date = new Date(result.timestamp || Date.now()).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    const certId = `SQLQ-${result.id || Date.now()}-${currentUser?.substring(0,4).toUpperCase() || 'USER'}`;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Open+Sans&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Open Sans', sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .certificate {
            background: linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%);
            width: 800px;
            padding: 60px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            position: relative;
            border: 8px solid #c9a227;
          }
          .certificate::before {
            content: '';
            position: absolute;
            top: 20px; left: 20px; right: 20px; bottom: 20px;
            border: 2px solid #c9a227;
            border-radius: 10px;
            pointer-events: none;
          }
          .logo { font-size: 24px; color: #6b21a8; margin-bottom: 10px; }
          h1 { 
            font-family: 'Playfair Display', serif;
            font-size: 42px; 
            color: #1a1a2e;
            margin-bottom: 10px;
          }
          .subtitle { color: #666; font-size: 14px; margin-bottom: 30px; letter-spacing: 3px; }
          .recipient { 
            font-family: 'Playfair Display', serif;
            font-size: 36px; 
            color: #6b21a8;
            margin: 20px 0;
            border-bottom: 2px solid #c9a227;
            padding-bottom: 10px;
            display: inline-block;
          }
          .achievement { font-size: 18px; color: #333; margin: 20px 0; }
          .interview-name { 
            font-size: 24px; 
            color: #16213e; 
            font-weight: bold;
            margin: 15px 0;
          }
          .score { 
            font-size: 48px; 
            color: #16a34a; 
            font-weight: bold;
            margin: 20px 0;
          }
          .date { color: #666; margin-top: 30px; font-size: 14px; }
          .cert-id { color: #999; font-size: 12px; margin-top: 10px; }
          .seal {
            position: absolute;
            bottom: 40px;
            right: 60px;
            width: 100px;
            height: 100px;
            background: linear-gradient(135deg, #c9a227 0%, #f4d03f 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            box-shadow: 0 4px 15px rgba(201, 162, 39, 0.4);
          }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="logo">🎓 SQL Quest Academy</div>
          <h1>Certificate of Achievement</h1>
          <div class="subtitle">THIS IS TO CERTIFY THAT</div>
          <div class="recipient">${currentUser || 'SQL Student'}</div>
          <div class="achievement">has successfully passed the</div>
          <div class="interview-name">${result.interviewTitle || 'SQL Interview'}</div>
          <div class="achievement">with a score of</div>
          <div class="score">${result.percentage}%</div>
          <div class="date">Awarded on ${date}</div>
          <div class="cert-id">Certificate ID: ${certId}</div>
          <div class="seal">✓</div>
        </div>
      </body>
      </html>
    `;
  };
  
  const downloadCertificate = (result) => {
    const html = generateCertificateHTML(result);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SQL_Quest_Certificate_${result.interviewTitle?.replace(/\s+/g, '_') || 'Interview'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    playSound('success');
  };
  
  const printCertificate = (result) => {
    const html = generateCertificateHTML(result);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
    playSound('click');
  };

  // ============ 30-DAY CHALLENGE FUNCTIONS ============
  // Use the complete 30-day data with 5 questions per day
  const thirtyDayData = window.sqlChallenge30Days || window.thirtyDayChallenge || { days: [], weeks: [], rewards: {} };
  
  // Ensure weeks data exists (from thirtyDayChallenge if not in sqlChallenge30Days)
  if (!thirtyDayData.weeks && window.thirtyDayChallenge?.weeks) {
    thirtyDayData.weeks = window.thirtyDayChallenge.weeks;
  }
  if (!thirtyDayData.rewards && window.thirtyDayChallenge?.rewards) {
    thirtyDayData.rewards = window.thirtyDayChallenge.rewards;
  }
  
  // Default rewards if not present
  thirtyDayData.rewards = thirtyDayData.rewards || { daily: 10, weekComplete: 50, challengeComplete: 500 };
  
  // State for current question index within a day (0-4 for 5 questions)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  const load30DayProgress = () => {
    if (!currentUser || isGuest) return {};
    const userData = JSON.parse(localStorage.getItem(`sqlquest_user_${currentUser}`) || '{}');
    return userData.thirtyDayProgress || {};
  };
  
  const save30DayProgress = (progress) => {
    if (!currentUser || isGuest) return;
    const userData = JSON.parse(localStorage.getItem(`sqlquest_user_${currentUser}`) || '{}');
    userData.thirtyDayProgress = progress;
    saveUserData(currentUser, userData);
    setChallengeProgress(progress);
  };
  
  const start30DayChallenge = () => {
    const startDate = new Date().toISOString().split('T')[0];
    if (currentUser && !isGuest) {
      const userData = JSON.parse(localStorage.getItem(`sqlquest_user_${currentUser}`) || '{}');
      userData.thirtyDayStartDate = startDate;
      userData.thirtyDayProgress = {}; // Reset progress on new start
      saveUserData(currentUser, userData);
    }
    setChallengeStartDate(startDate);
    setChallengeProgress({});
    playSound('success');
  };
  
  const get30DayStartDate = () => {
    if (!currentUser || isGuest) return null;
    const userData = JSON.parse(localStorage.getItem(`sqlquest_user_${currentUser}`) || '{}');
    return userData.thirtyDayStartDate || null;
  };
  
  const getCurrentDayNumber = () => {
    const startDate = challengeStartDate || get30DayStartDate();
    if (!startDate) return 0;
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffTime = now - start;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.min(Math.max(diffDays, 1), 30);
  };
  
  const isDayUnlocked = (dayNumber) => {
    // Day unlock rules:
    // 1. Day 1 is always available once challenge is started
    // 2. Day N (where N > 1) unlocks ONLY if:
    //    a) Day N-1 is COMPLETED, AND
    //    b) It's at least calendar day N since start (next day after completing)
    //
    // This ensures: complete Day 1 today → Day 2 unlocks tomorrow at midnight
    // If you miss a day, you fall behind and must catch up
    
    const startDate = challengeStartDate || get30DayStartDate();
    if (!startDate) return dayNumber === 1; // Before starting, only day 1 preview
    
    // Day 1 is always unlocked once started
    if (dayNumber === 1) return true;
    
    // Check if previous day is completed - REQUIRED
    const prevDayCompleted = challengeProgress[`day${dayNumber - 1}`]?.completed;
    if (!prevDayCompleted) return false;
    
    // Check if enough calendar days have passed since start
    // Day 2 requires calendar day 2, Day 3 requires calendar day 3, etc.
    const currentCalendarDay = getCurrentDayNumber();
    return dayNumber <= currentCalendarDay;
  };
  
  const getNextUnlockInfo = () => {
    // Find which day the user should work on next
    const startDate = challengeStartDate || get30DayStartDate();
    if (!startDate) return { status: 'not_started', message: 'Start the challenge to begin!' };
    
    // Find the first incomplete day
    let firstIncompleteDay = 31; // Default to "all done"
    for (let d = 1; d <= 30; d++) {
      if (!challengeProgress[`day${d}`]?.completed) {
        firstIncompleteDay = d;
        break;
      }
    }
    
    if (firstIncompleteDay > 30) {
      return { status: 'complete', day: 30, message: '🎉 Challenge Complete!' };
    }
    
    const currentCalendarDay = getCurrentDayNumber();
    
    // Check if this day is unlocked
    if (isDayUnlocked(firstIncompleteDay)) {
      return {
        status: 'available',
        day: firstIncompleteDay,
        message: `Day ${firstIncompleteDay} is ready!`
      };
    }
    
    // Day is locked - need to wait for tomorrow
    const daysUntilUnlock = firstIncompleteDay - currentCalendarDay;
    return {
      status: 'waiting',
      day: firstIncompleteDay,
      message: daysUntilUnlock === 1 
        ? `Day ${firstIncompleteDay} unlocks tomorrow at midnight`
        : `Day ${firstIncompleteDay} unlocks in ${daysUntilUnlock} days`
    };
  };
  
  const isDayCompleted = (dayNumber) => {
    return challengeProgress[`day${dayNumber}`]?.completed || false;
  };
  
  const getWeekProgress = (weekNum) => {
    const startDay = (weekNum - 1) * 7 + 1;
    const endDay = weekNum === 5 ? 30 : weekNum * 7;
    let completed = 0;
    let total = endDay - startDay + 1;
    
    for (let d = startDay; d <= endDay; d++) {
      if (isDayCompleted(d)) completed++;
    }
    
    return { completed, total, percentage: Math.round((completed / total) * 100) };
  };
  
  const openDayChallenge = (dayNumber, forceRestart = false) => {
    const startDate = challengeStartDate || get30DayStartDate();
    
    if (!startDate) {
      alert('Please start the 30-Day Challenge first!');
      return;
    }
    
    if (!isDayUnlocked(dayNumber)) {
      // Determine why it's locked
      const prevDayCompleted = dayNumber === 1 || challengeProgress[`day${dayNumber - 1}`]?.completed;
      if (!prevDayCompleted) {
        alert(`Day ${dayNumber} is locked!\n\nYou must complete Day ${dayNumber - 1} first.`);
      } else {
        const daysUntilUnlock = dayNumber - getCurrentDayNumber();
        if (daysUntilUnlock === 1) {
          alert(`Day ${dayNumber} unlocks tomorrow at midnight!\n\nYou've completed the previous day. Come back tomorrow to continue.`);
        } else {
          alert(`Day ${dayNumber} unlocks in ${daysUntilUnlock} days.\n\nKeep up with one challenge per day!`);
        }
      }
      return;
    }
    
    const dayData = thirtyDayData.days?.find(d => d.day === dayNumber);
    if (!dayData) {
      console.error('Day data not found for day', dayNumber);
      return;
    }
    
    setCurrentChallengeDay(dayData);
    setShowDayLesson(true);
    setCurrentQuestionIndex(0); // Reset to first question
    
    // If completed and not forcing restart, show review mode
    // If forcing restart or not completed, start fresh
    if (isDayCompleted(dayNumber) && !forceRestart) {
      setDayLessonStep('review');
    } else {
      setDayLessonStep('lesson');
    }
    
    setDayQuery('');
    setDayResult({ columns: [], rows: [], error: null });
    setDayHintUsed(false);
    setShowDayHint(false);
    
    // Load dataset for this day (default to titanic)
    if (db) {
      loadDataset(db, 'titanic');
    }
  };
  
  const restartDay = (dayNumber) => {
    openDayChallenge(dayNumber, true);
  };
  
  const runDayQuery = () => {
    if (!db || !dayQuery.trim()) return;
    try {
      const result = db.exec(dayQuery);
      if (result.length > 0) {
        setDayResult({ columns: result[0].columns, rows: result[0].values, error: null });
      } else {
        setDayResult({ columns: [], rows: [], error: null });
      }
    } catch (err) {
      setDayResult({ columns: [], rows: [], error: err.message });
    }
  };
  
  const checkDayAnswer = () => {
    if (!currentChallengeDay || !db) return false;
    
    // Get current question (from questions array or fallback to single challenge)
    const currentQuestion = currentChallengeDay.questions?.[currentQuestionIndex] || currentChallengeDay.challenge;
    if (!currentQuestion) return false;
    
    try {
      const userResult = db.exec(dayQuery);
      const expectedResult = db.exec(currentQuestion.solution);
      
      const userRows = userResult.length > 0 ? JSON.stringify(userResult[0].values) : '[]';
      const expectedRows = expectedResult.length > 0 ? JSON.stringify(expectedResult[0].values) : '[]';
      
      return userRows === expectedRows;
    } catch (err) {
      return false;
    }
  };
  
  const completeCurrentQuestion = () => {
    if (!currentChallengeDay) return;
    
    const currentQuestion = currentChallengeDay.questions?.[currentQuestionIndex] || currentChallengeDay.challenge;
    const dayNum = currentChallengeDay.day;
    const questionId = currentQuestion?.id || `day${dayNum}`;
    const points = currentQuestion?.points || 10;
    const hintPenalty = dayHintUsed ? Math.floor(points * 0.15) : 0;
    const earnedPoints = points - hintPenalty;
    
    // Get existing progress
    const existingProgress = challengeProgress[`day${dayNum}`] || { 
      questionsCompleted: [], 
      totalScore: 0, 
      completed: false 
    };
    
    // Add question to completed list if not already there
    if (!existingProgress.questionsCompleted?.includes(questionId)) {
      existingProgress.questionsCompleted = [...(existingProgress.questionsCompleted || []), questionId];
      existingProgress.totalScore = (existingProgress.totalScore || 0) + earnedPoints;
    }
    
    // Check if all questions for the day are completed
    const totalQuestions = currentChallengeDay.questions?.length || 1;
    const allCompleted = existingProgress.questionsCompleted.length >= totalQuestions;
    
    if (allCompleted) {
      existingProgress.completed = true;
      existingProgress.completedAt = new Date().toISOString();
      existingProgress.score = existingProgress.totalScore + thirtyDayData.rewards.daily;
    }
    
    const newProgress = { ...challengeProgress, [`day${dayNum}`]: existingProgress };
    save30DayProgress(newProgress);
    
    // Award XP for this question
    const newXP = xp + earnedPoints;
    setXP(newXP);
    
    // Reset hint for next question
    setDayHintUsed(false);
    setShowDayHint(false);
    setDayQuery('');
    setDayResult({ columns: [], rows: [], error: null });
    
    // Move to next question or complete day
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      playSound('success');
    } else {
      // All questions done - complete the day
      completeDayChallenge(false);
    }
    
    // Update goals
    updateGoalProgress('xp_earn', earnedPoints);
    updateGoalProgress('challenges_solve', 1);
    
    if (currentUser && !isGuest) {
      const userData = JSON.parse(localStorage.getItem(`sqlquest_user_${currentUser}`) || '{}');
      userData.xp = newXP;
      saveUserData(currentUser, userData);
    }
  };
  
  const completeDayChallenge = (bonusCompleted = false) => {
    if (!currentChallengeDay) return;
    
    const dayNum = currentChallengeDay.day;
    const basePoints = currentChallengeDay.challenge?.points || 20;
    const bonusPoints = bonusCompleted && currentChallengeDay.bonusChallenge ? currentChallengeDay.bonusChallenge.points : 0;
    const hintPenalty = dayHintUsed ? Math.floor(basePoints * 0.15) : 0;
    const totalPoints = basePoints + bonusPoints - hintPenalty + thirtyDayData.rewards.daily;
    
    const dayProgress = {
      completed: true,
      completedAt: new Date().toISOString(),
      score: totalPoints,
      hintUsed: dayHintUsed,
      bonusCompleted
    };
    
    const newProgress = { ...challengeProgress, [`day${dayNum}`]: dayProgress };
    save30DayProgress(newProgress);
    
    // Award XP
    const newXP = xp + totalPoints;
    setXP(newXP);
    
    // Check for week completion bonus
    const weekNum = Math.ceil(dayNum / 7);
    const weekProgress = getWeekProgress(weekNum);
    if (weekProgress.completed === weekProgress.total) {
      const weekBonus = thirtyDayData.rewards.weekComplete;
      setXP(prev => prev + weekBonus);
      playSound('reward');
    }
    
    // Check for 30-day completion
    const completedDays = Object.values(newProgress).filter(p => p.completed).length;
    if (completedDays === 30) {
      setShow30DayCertificate(true);
      const completionBonus = thirtyDayData.rewards.challengeComplete;
      setXP(prev => prev + completionBonus);
      setShowConfetti(true);
      
      // Unlock achievement
      if (!unlockedAchievements.has('sql_master_30')) {
        unlockAchievement('sql_master_30');
      }
    }
    
    // Update goals
    updateGoalProgress('xp_earn', totalPoints);
    updateGoalProgress('challenges_solve', 1);
    
    if (currentUser && !isGuest) {
      const userData = JSON.parse(localStorage.getItem(`sqlquest_user_${currentUser}`) || '{}');
      userData.xp = newXP;
      saveUserData(currentUser, userData);
    }
    
    playSound('success');
    setDayLessonStep('complete');
  };
  
  const generate30DayCertificateHTML = () => {
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    const totalScore = Object.values(challengeProgress).reduce((sum, p) => sum + (p.score || 0), 0);
    const certId = `SQLM-30DAY-${Date.now()}-${currentUser?.substring(0,4).toUpperCase() || 'USER'}`;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Open+Sans&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Open Sans', sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .certificate {
            background: linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%);
            width: 900px;
            padding: 60px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            position: relative;
            border: 10px solid #9333ea;
          }
          .certificate::before {
            content: '';
            position: absolute;
            top: 20px; left: 20px; right: 20px; bottom: 20px;
            border: 3px solid #9333ea;
            border-radius: 10px;
            pointer-events: none;
          }
          .badge { font-size: 60px; margin-bottom: 10px; }
          h1 { 
            font-family: 'Playfair Display', serif;
            font-size: 36px; 
            color: #9333ea;
            margin-bottom: 10px;
          }
          .title { font-size: 48px; color: #1a1a2e; font-weight: bold; margin: 20px 0; }
          .subtitle { color: #666; font-size: 14px; margin-bottom: 30px; letter-spacing: 3px; }
          .recipient { 
            font-family: 'Playfair Display', serif;
            font-size: 42px; 
            color: #9333ea;
            margin: 20px 0;
            border-bottom: 3px solid #c9a227;
            padding-bottom: 10px;
            display: inline-block;
          }
          .achievement { font-size: 18px; color: #333; margin: 15px 0; }
          .stats { display: flex; justify-content: center; gap: 40px; margin: 30px 0; }
          .stat { text-align: center; }
          .stat-value { font-size: 36px; font-weight: bold; color: #9333ea; }
          .stat-label { font-size: 14px; color: #666; }
          .date { color: #666; margin-top: 30px; font-size: 14px; }
          .cert-id { color: #999; font-size: 12px; margin-top: 10px; }
          .seal {
            position: absolute;
            bottom: 40px;
            right: 60px;
            width: 120px;
            height: 120px;
            background: linear-gradient(135deg, #9333ea 0%, #c026d3 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            color: white;
            box-shadow: 0 4px 15px rgba(147, 51, 234, 0.4);
          }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="badge">🏆</div>
          <h1>SQL Quest Academy</h1>
          <div class="title">30-Day SQL Master</div>
          <div class="subtitle">CERTIFICATE OF COMPLETION</div>
          <div class="achievement">This is to certify that</div>
          <div class="recipient">${currentUser || 'SQL Student'}</div>
          <div class="achievement">has successfully completed the</div>
          <div class="achievement" style="font-size: 24px; font-weight: bold; color: #1a1a2e;">
            Master SQL 30-Day Challenge
          </div>
          <div class="stats">
            <div class="stat">
              <div class="stat-value">30</div>
              <div class="stat-label">Days Completed</div>
            </div>
            <div class="stat">
              <div class="stat-value">${totalScore}</div>
              <div class="stat-label">Total XP Earned</div>
            </div>
            <div class="stat">
              <div class="stat-value">5</div>
              <div class="stat-label">Modules Mastered</div>
            </div>
          </div>
          <div class="date">Awarded on ${date}</div>
          <div class="cert-id">Certificate ID: ${certId}</div>
          <div class="seal">🎓</div>
        </div>
      </body>
      </html>
    `;
  };
  
  const download30DayCertificate = () => {
    const html = generate30DayCertificateHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SQL_Quest_30_Day_Master_Certificate.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    playSound('success');
  };

  // ============ SHAREABLE ASSETS FUNCTIONS ============
  // Note: showShareModal state is declared at the top with other state variables
  
  // Generate Progress Card HTML (for social sharing)
  const generateProgressCardHTML = () => {
    const completedDays = Object.values(challengeProgress).filter(p => p?.completed).length;
    const totalScore = Object.values(challengeProgress).reduce((sum, p) => sum + (p?.score || 0), 0);
    const progressPercent = Math.round((completedDays / 30) * 100);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta property="og:title" content="My SQL Quest Progress">
        <meta property="og:description" content="I've completed ${completedDays}/30 days of the SQL Master Challenge!">
        <meta property="og:image" content="https://sql-quest2.vercel.app/og-progress.png">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .card {
            width: 600px;
            background: linear-gradient(145deg, #1e1e3f 0%, #2d2d5a 100%);
            border-radius: 24px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            border: 2px solid rgba(147, 51, 234, 0.3);
          }
          .header {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 30px;
          }
          .logo { font-size: 48px; }
          .title { color: #fff; font-size: 28px; font-weight: 800; }
          .subtitle { color: #9ca3af; font-size: 14px; }
          .user-section {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 30px;
            padding: 20px;
            background: rgba(147, 51, 234, 0.1);
            border-radius: 16px;
            border: 1px solid rgba(147, 51, 234, 0.2);
          }
          .avatar {
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #9333ea 0%, #c026d3 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            color: white;
            font-weight: bold;
          }
          .user-info { flex: 1; }
          .username { color: #fff; font-size: 24px; font-weight: 700; }
          .level { color: #a855f7; font-size: 14px; }
          .progress-section { margin-bottom: 30px; }
          .progress-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
          }
          .progress-label { color: #9ca3af; font-size: 14px; }
          .progress-value { color: #a855f7; font-size: 14px; font-weight: 600; }
          .progress-bar {
            height: 12px;
            background: rgba(255,255,255,0.1);
            border-radius: 6px;
            overflow: hidden;
          }
          .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #9333ea 0%, #c026d3 50%, #f472b6 100%);
            border-radius: 6px;
            width: ${progressPercent}%;
          }
          .stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-bottom: 30px;
          }
          .stat {
            background: rgba(255,255,255,0.05);
            padding: 20px;
            border-radius: 16px;
            text-align: center;
          }
          .stat-icon { font-size: 24px; margin-bottom: 8px; }
          .stat-value { color: #fff; font-size: 28px; font-weight: 800; }
          .stat-label { color: #9ca3af; font-size: 12px; }
          .footer {
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid rgba(255,255,255,0.1);
          }
          .cta { color: #a855f7; font-size: 16px; font-weight: 600; }
          .url { color: #6b7280; font-size: 14px; margin-top: 8px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <div class="logo">🎯</div>
            <div>
              <div class="title">SQL Quest</div>
              <div class="subtitle">30-Day SQL Master Challenge</div>
            </div>
          </div>
          
          <div class="user-section">
            <div class="avatar">${(currentUser || 'U')[0].toUpperCase()}</div>
            <div class="user-info">
              <div class="username">${currentUser || 'SQL Learner'}</div>
              <div class="level">Level ${Math.floor(xp / 100) + 1} SQL Developer</div>
            </div>
          </div>
          
          <div class="progress-section">
            <div class="progress-header">
              <span class="progress-label">Challenge Progress</span>
              <span class="progress-value">${completedDays}/30 Days (${progressPercent}%)</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill"></div>
            </div>
          </div>
          
          <div class="stats">
            <div class="stat">
              <div class="stat-icon">🔥</div>
              <div class="stat-value">${streak}</div>
              <div class="stat-label">Day Streak</div>
            </div>
            <div class="stat">
              <div class="stat-icon">⚡</div>
              <div class="stat-value">${totalScore}</div>
              <div class="stat-label">Total XP</div>
            </div>
            <div class="stat">
              <div class="stat-icon">✅</div>
              <div class="stat-value">${completedDays * 5}</div>
              <div class="stat-label">Questions Solved</div>
            </div>
          </div>
          
          <div class="footer">
            <div class="cta">Join me in learning SQL! 🚀</div>
            <div class="url">sql-quest2.vercel.app</div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Generate Day Completion Card
  const generateDayCompletionCardHTML = (dayNumber) => {
    const dayData = thirtyDayData.days?.find(d => d.day === dayNumber);
    const dayProgress = challengeProgress[`day${dayNumber}`];
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .card {
            width: 500px;
            background: linear-gradient(145deg, #1e1e3f 0%, #2d2d5a 100%);
            border-radius: 24px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            text-align: center;
            border: 2px solid rgba(34, 197, 94, 0.3);
          }
          .celebration { font-size: 64px; margin-bottom: 20px; }
          .title { color: #22c55e; font-size: 32px; font-weight: 800; margin-bottom: 8px; }
          .day-title { color: #fff; font-size: 24px; font-weight: 600; margin-bottom: 20px; }
          .concepts {
            display: flex;
            justify-content: center;
            gap: 8px;
            flex-wrap: wrap;
            margin-bottom: 30px;
          }
          .concept {
            background: rgba(147, 51, 234, 0.2);
            color: #a855f7;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 14px;
          }
          .score-box {
            background: rgba(34, 197, 94, 0.1);
            border: 1px solid rgba(34, 197, 94, 0.3);
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 30px;
          }
          .score-value { color: #22c55e; font-size: 48px; font-weight: 800; }
          .score-label { color: #9ca3af; font-size: 14px; }
          .user {
            color: #fff;
            font-size: 18px;
            margin-bottom: 8px;
          }
          .footer {
            color: #6b7280;
            font-size: 14px;
          }
          .brand { color: #a855f7; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="celebration">🎉</div>
          <div class="title">Day ${dayNumber} Complete!</div>
          <div class="day-title">${dayData?.title || 'SQL Challenge'}</div>
          <div class="concepts">
            ${(dayData?.concepts || ['SQL']).map(c => `<span class="concept">${c}</span>`).join('')}
          </div>
          <div class="score-box">
            <div class="score-value">+${dayProgress?.score || 0} XP</div>
            <div class="score-label">Points Earned</div>
          </div>
          <div class="user">${currentUser || 'SQL Learner'}</div>
          <div class="footer">Learning SQL with <span class="brand">SQL Quest</span> 🎯</div>
        </div>
      </body>
      </html>
    `;
  };

  // Generate Streak Badge
  const generateStreakBadgeHTML = () => {
    // Dynamic theming based on streak level
    const streakTier = streak >= 100 ? 'legendary' : streak >= 30 ? 'master' : streak >= 14 ? 'expert' : streak >= 7 ? 'rising' : 'starter';
    
    const themes = {
      legendary: {
        emoji: '👑',
        title: 'LEGENDARY',
        gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
        glow: '#fbbf24',
        particles: '🌟',
        bgGradient: 'linear-gradient(135deg, #1a1a2e 0%, #2d1f0f 50%, #1a1a2e 100%)'
      },
      master: {
        emoji: '🏆',
        title: 'MASTER',
        gradient: 'linear-gradient(135deg, #a855f7 0%, #9333ea 50%, #7c3aed 100%)',
        glow: '#a855f7',
        particles: '✨',
        bgGradient: 'linear-gradient(135deg, #1a1a2e 0%, #1e1040 50%, #1a1a2e 100%)'
      },
      expert: {
        emoji: '🔥',
        title: 'ON FIRE',
        gradient: 'linear-gradient(135deg, #f87171 0%, #ef4444 50%, #dc2626 100%)',
        glow: '#ef4444',
        particles: '🔥',
        bgGradient: 'linear-gradient(135deg, #1a1a2e 0%, #2d1a1a 50%, #1a1a2e 100%)'
      },
      rising: {
        emoji: '⚡',
        title: 'RISING STAR',
        gradient: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%)',
        glow: '#3b82f6',
        particles: '⚡',
        bgGradient: 'linear-gradient(135deg, #1a1a2e 0%, #1a2540 50%, #1a1a2e 100%)'
      },
      starter: {
        emoji: '✨',
        title: 'GETTING STARTED',
        gradient: 'linear-gradient(135deg, #34d399 0%, #10b981 50%, #059669 100%)',
        glow: '#10b981',
        particles: '💫',
        bgGradient: 'linear-gradient(135deg, #1a1a2e 0%, #1a2e2a 50%, #1a1a2e 100%)'
      }
    };
    
    const theme = themes[streakTier];
    const completedDays = Object.values(challengeProgress).filter(p => p?.completed).length;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta property="og:title" content="${streak} Day Streak on SQL Quest!">
        <meta property="og:description" content="${currentUser || 'A learner'} is on a ${streak} day streak learning SQL!">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
          
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body { 
            font-family: 'Inter', sans-serif;
            background: ${theme.bgGradient};
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }
          
          /* Animated background particles */
          .particles {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            overflow: hidden;
          }
          
          .particle {
            position: absolute;
            font-size: 24px;
            animation: float 6s ease-in-out infinite;
            opacity: 0.6;
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
            10% { opacity: 0.6; }
            90% { opacity: 0.6; }
            100% { transform: translateY(-100px) rotate(360deg); opacity: 0; }
          }
          
          .card {
            width: 500px;
            background: linear-gradient(145deg, rgba(30, 30, 63, 0.95) 0%, rgba(45, 45, 90, 0.95) 100%);
            border-radius: 32px;
            padding: 48px;
            box-shadow: 
              0 0 0 2px rgba(255,255,255,0.1),
              0 25px 80px rgba(0,0,0,0.5),
              0 0 100px ${theme.glow}40;
            text-align: center;
            position: relative;
            backdrop-filter: blur(20px);
          }
          
          /* Animated border glow */
          .card::before {
            content: '';
            position: absolute;
            top: -3px;
            left: -3px;
            right: -3px;
            bottom: -3px;
            background: ${theme.gradient};
            border-radius: 34px;
            z-index: -1;
            animation: borderGlow 3s ease-in-out infinite;
          }
          
          @keyframes borderGlow {
            0%, 100% { opacity: 0.7; filter: blur(2px); }
            50% { opacity: 1; filter: blur(4px); }
          }
          
          .header {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin-bottom: 32px;
          }
          
          .logo { font-size: 32px; }
          .brand { 
            font-size: 20px; 
            font-weight: 700; 
            color: #fff;
            letter-spacing: -0.5px;
          }
          
          .badge-container {
            position: relative;
            width: 200px;
            height: 200px;
            margin: 0 auto 32px;
          }
          
          /* Rotating ring */
          .ring {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            border: 4px solid transparent;
            border-top-color: ${theme.glow};
            border-right-color: ${theme.glow}80;
            animation: spin 3s linear infinite;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .badge {
            position: absolute;
            top: 10px;
            left: 10px;
            width: calc(100% - 20px);
            height: calc(100% - 20px);
            background: linear-gradient(145deg, #1a1a3a 0%, #252550 100%);
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            box-shadow: 
              inset 0 4px 20px rgba(0,0,0,0.3),
              0 0 40px ${theme.glow}30;
          }
          
          .emoji { 
            font-size: 48px; 
            margin-bottom: 4px;
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
            animation: bounce 2s ease-in-out infinite;
          }
          
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
          
          .streak-value { 
            background: ${theme.gradient};
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-size: 56px; 
            font-weight: 900;
            line-height: 1;
            text-shadow: 0 4px 20px ${theme.glow}40;
          }
          
          .streak-label { 
            color: #9ca3af; 
            font-size: 14px; 
            font-weight: 700; 
            letter-spacing: 3px;
            margin-top: 4px;
          }
          
          .tier-badge {
            display: inline-block;
            background: ${theme.gradient};
            color: white;
            padding: 8px 24px;
            border-radius: 50px;
            font-size: 14px;
            font-weight: 800;
            letter-spacing: 2px;
            margin-bottom: 24px;
            box-shadow: 0 4px 20px ${theme.glow}40;
          }
          
          .user-section {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
            padding: 20px;
            background: rgba(255,255,255,0.03);
            border-radius: 16px;
            margin-bottom: 24px;
          }
          
          .avatar {
            width: 48px;
            height: 48px;
            background: ${theme.gradient};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            font-weight: 800;
            color: white;
          }
          
          .user-info { text-align: left; }
          .username { color: #fff; font-size: 18px; font-weight: 700; }
          .user-subtitle { color: #6b7280; font-size: 13px; }
          
          .stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 24px;
          }
          
          .stat {
            background: rgba(255,255,255,0.03);
            padding: 16px 8px;
            border-radius: 12px;
          }
          
          .stat-value { 
            color: #fff; 
            font-size: 24px; 
            font-weight: 800; 
          }
          .stat-label { 
            color: #6b7280; 
            font-size: 11px; 
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .footer {
            padding-top: 20px;
            border-top: 1px solid rgba(255,255,255,0.1);
          }
          
          .cta { 
            color: ${theme.glow}; 
            font-size: 16px; 
            font-weight: 700;
            margin-bottom: 8px;
          }
          
          .hashtags { 
            color: #6b7280; 
            font-size: 13px; 
          }
        </style>
      </head>
      <body>
        <!-- Floating particles -->
        <div class="particles">
          <div class="particle" style="left: 8%; animation-delay: 0s; animation-duration: 5s;">${theme.particles}</div>
          <div class="particle" style="left: 16%; animation-delay: 1s; animation-duration: 6s;">${theme.particles}</div>
          <div class="particle" style="left: 25%; animation-delay: 2s; animation-duration: 4.5s;">${theme.particles}</div>
          <div class="particle" style="left: 33%; animation-delay: 0.5s; animation-duration: 5.5s;">${theme.particles}</div>
          <div class="particle" style="left: 42%; animation-delay: 3s; animation-duration: 7s;">${theme.particles}</div>
          <div class="particle" style="left: 50%; animation-delay: 1.5s; animation-duration: 4s;">${theme.particles}</div>
          <div class="particle" style="left: 58%; animation-delay: 2.5s; animation-duration: 6.5s;">${theme.particles}</div>
          <div class="particle" style="left: 67%; animation-delay: 0.8s; animation-duration: 5.2s;">${theme.particles}</div>
          <div class="particle" style="left: 75%; animation-delay: 3.5s; animation-duration: 4.8s;">${theme.particles}</div>
          <div class="particle" style="left: 83%; animation-delay: 1.2s; animation-duration: 6.2s;">${theme.particles}</div>
          <div class="particle" style="left: 92%; animation-delay: 2.2s; animation-duration: 5.8s;">${theme.particles}</div>
          <div class="particle" style="left: 100%; animation-delay: 4s; animation-duration: 7.5s;">${theme.particles}</div>
        </div>
        
        <div class="card">
          <div class="header">
            <div class="logo">🎯</div>
            <div class="brand">SQL Quest</div>
          </div>
          
          <div class="badge-container">
            <div class="ring"></div>
            <div class="badge">
              <div class="emoji">${theme.emoji}</div>
              <div class="streak-value">${streak}</div>
              <div class="streak-label">DAY STREAK</div>
            </div>
          </div>
          
          <div class="tier-badge">${theme.title}</div>
          
          <div class="user-section">
            <div class="avatar">${(currentUser || 'U')[0].toUpperCase()}</div>
            <div class="user-info">
              <div class="username">${currentUser || 'SQL Learner'}</div>
              <div class="user-subtitle">Level ${Math.floor(xp / 100) + 1} SQL Developer</div>
            </div>
          </div>
          
          <div class="stats">
            <div class="stat">
              <div class="stat-value">${xp.toLocaleString()}</div>
              <div class="stat-label">Total XP</div>
            </div>
            <div class="stat">
              <div class="stat-value">${completedDays}</div>
              <div class="stat-label">Days Done</div>
            </div>
            <div class="stat">
              <div class="stat-value">${solvedChallenges.size}</div>
              <div class="stat-label">Solved</div>
            </div>
          </div>
          
          <div class="footer">
            <div class="cta">Join me in learning SQL! 🚀</div>
            <div class="hashtags">sql-quest2.vercel.app | #SQLQuest #${streak}DayStreak</div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Generate Achievement Badge
  const generateAchievementBadgeHTML = (achievementId) => {
    const achievements = {
      'first_query': { icon: '🎯', name: 'First Query', desc: 'Ran your first SQL query' },
      'perfect_10': { icon: '💯', name: 'Perfect 10', desc: 'Completed 10 challenges' },
      'week_warrior': { icon: '⚔️', name: 'Week Warrior', desc: '7-day streak achieved' },
      'sql_master_30': { icon: '🏆', name: 'SQL Master', desc: 'Completed 30-Day Challenge' },
      'speed_demon': { icon: '⚡', name: 'Speed Demon', desc: 'Solved in under 30 seconds' },
      'hint_free': { icon: '🧠', name: 'No Hints Needed', desc: 'Perfect score without hints' },
    };
    const achievement = achievements[achievementId] || { icon: '🏅', name: 'Achievement', desc: 'Unlocked!' };
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@600;700;800&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .badge-card {
            width: 400px;
            background: linear-gradient(145deg, #1e1e3f 0%, #2d2d5a 100%);
            border-radius: 24px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            border: 2px solid rgba(245, 158, 11, 0.4);
          }
          .icon { font-size: 80px; margin-bottom: 16px; }
          .name { color: #f59e0b; font-size: 28px; font-weight: 800; margin-bottom: 8px; }
          .desc { color: #9ca3af; font-size: 16px; margin-bottom: 24px; }
          .unlocked {
            background: rgba(245, 158, 11, 0.1);
            border: 1px solid rgba(245, 158, 11, 0.3);
            border-radius: 12px;
            padding: 12px 24px;
            color: #f59e0b;
            font-weight: 600;
            display: inline-block;
          }
          .user { color: #fff; font-size: 18px; margin-top: 20px; }
          .brand { color: #6b7280; font-size: 14px; margin-top: 8px; }
        </style>
      </head>
      <body>
        <div class="badge-card">
          <div class="icon">${achievement.icon}</div>
          <div class="name">${achievement.name}</div>
          <div class="desc">${achievement.desc}</div>
          <div class="unlocked">✓ Achievement Unlocked</div>
          <div class="user">${currentUser || 'SQL Learner'}</div>
          <div class="brand">SQL Quest 🎯</div>
        </div>
      </body>
      </html>
    `;
  };

  // Download shareable card as HTML
  const downloadShareCard = (type, data = null) => {
    let html, filename;
    
    switch(type) {
      case 'progress':
        html = generateProgressCardHTML();
        filename = 'SQL_Quest_Progress.html';
        break;
      case 'day':
        html = generateDayCompletionCardHTML(data || currentChallengeDay?.day || 1);
        filename = `SQL_Quest_Day_${data || currentChallengeDay?.day || 1}_Complete.html`;
        break;
      case 'streak':
        html = generateStreakBadgeHTML();
        filename = `SQL_Quest_${streak}_Day_Streak.html`;
        break;
      case 'achievement':
        html = generateAchievementBadgeHTML(data || 'first_query');
        filename = `SQL_Quest_Achievement_${data || 'badge'}.html`;
        break;
      case 'certificate':
        html = generate30DayCertificateHTML();
        filename = 'SQL_Quest_30_Day_Certificate.html';
        break;
      default:
        html = generateProgressCardHTML();
        filename = 'SQL_Quest_Share.html';
    }
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    playSound('success');
  };

  // Copy share text to clipboard
  const copyShareText = (type) => {
    const completedDays = Object.values(challengeProgress).filter(p => p?.completed).length;
    const appUrl = 'https://sql-quest2.vercel.app/';
    const texts = {
      progress: `🎯 I've completed ${completedDays}/30 days of the SQL Quest 30-Day Challenge!\n\n⚡ ${xp} XP earned\n🔥 ${streak} day streak\n\nJoin me in learning SQL!\n${appUrl}\n\n#SQLQuest #LearnSQL #30DayChallenge`,
      streak: `🔥 ${streak} Day Streak on SQL Quest!\n\nI'm on a roll learning SQL one day at a time.\n\nTry it yourself: ${appUrl}\n\n#SQLQuest #LearnSQL #CodingStreak`,
      day: `✅ Day ${currentChallengeDay?.day || 1} Complete on SQL Quest!\n\nToday I learned: ${currentChallengeDay?.concepts?.join(', ') || 'SQL'}\n\nStart your SQL journey: ${appUrl}\n\n#SQLQuest #LearnSQL #30DayChallenge`,
      certificate: `🏆 I just earned my SQL Quest 30-Day Master Certificate!\n\nAfter 30 days of dedicated practice, I've mastered SQL fundamentals.\n\nStart your own journey: ${appUrl}\n\n#SQLQuest #SQLMaster #30DayChallenge`
    };
    
    navigator.clipboard.writeText(texts[type] || texts.progress);
    playSound('click');
    alert('Share text copied to clipboard!');
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
      setAuthError('Please enter a username or email');
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
    
    const loginInput = authUsername.trim().toLowerCase();
    const isEmailLogin = loginInput.includes('@');
    
    let username = loginInput;
    let userData = null;
    
    // If logging in with email, find the username associated with that email
    if (isEmailLogin) {
      // Search for user by email in Supabase (check dedicated email column first, then data->email)
      if (isSupabaseConfigured()) {
        let users = await supabaseFetch(`users?email=eq.${encodeURIComponent(loginInput)}`);
        if (!users || users.length === 0) {
          // Fallback to data->>email for older accounts
          users = await supabaseFetch(`users?data->>email=eq.${encodeURIComponent(loginInput)}`);
        }
        if (users && users.length > 0) {
          username = users[0].username;
          userData = users[0].data;
        }
      }
      
      // Also check localStorage for email match
      if (!userData) {
        const allKeys = Object.keys(localStorage).filter(k => k.startsWith('sqlquest_user_'));
        for (const key of allKeys) {
          try {
            const data = JSON.parse(localStorage.getItem(key));
            if (data.email && data.email.toLowerCase() === loginInput) {
              username = key.replace('sqlquest_user_', '');
              userData = data;
              break;
            }
          } catch (e) {}
        }
      }
      
      if (!userData) {
        setAuthError('No account found with this email address');
        return;
      }
    } else {
      // Login with username
      if (loginInput.length < 3) {
        setAuthError('Username must be at least 3 characters');
        return;
      }
      userData = await loadUserData(username);
    }
    
    // Check if account is locked
    const lockStatus = checkLockoutStatus(username);
    if (lockStatus.locked) {
      setAuthError(lockStatus.message);
      return;
    }
    
    if (authMode === 'login') {
      if (!userData) {
        const attemptData = recordFailedAttempt(username);
        if (attemptData.permanentLock) {
          setAuthError('🔒 Account permanently locked due to too many failed attempts. Please contact the administrator.');
        } else if (attemptData.lockedUntil) {
          setAuthError(`🔒 Too many failed attempts. Account locked for 15 minutes. (Lockout ${attemptData.lockoutCount}/3)`);
        } else {
          const remaining = 5 - attemptData.attempts;
          setAuthError(`Invalid username/email or password. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`);
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
          setAuthError(`Invalid username/email or password. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`);
        }
        return;
      }
      
      // Check if email is verified
      if (userData.emailVerified === false) {
        // First, check if Supabase Auth says the user is verified
        let supabaseVerified = false;
        const client = getSupabaseClient();
        if (client && userData.email) {
          try {
            // Try to sign in with Supabase to check if email is confirmed
            const { data, error } = await client.auth.signInWithPassword({
              email: userData.email,
              password: authPassword
            });
            
            if (data?.user?.email_confirmed_at) {
              // User is verified in Supabase, update our database
              supabaseVerified = true;
              userData.emailVerified = true;
              await saveUserData(username, userData);
              console.log('✅ Email verification synced from Supabase Auth');
              
              // Sign out from Supabase Auth (we use our own session management)
              await client.auth.signOut();
            }
          } catch (err) {
            console.log('Supabase Auth check:', err.message);
          }
        }
        
        if (!supabaseVerified) {
          // Email not verified - show verification pending screen
          setVerificationEmail(userData.email);
          setShowVerificationPending(true);
          setAuthError('');
          return;
        }
      }
      
      // Successful login - reset attempts
      resetLoginAttempts(username);
    }
    
    if (authMode === 'register') {
      // For registration, use authUsername as the username (not email)
      const regUsername = authUsername.trim().toLowerCase();
      
      if (regUsername.length < 3) {
        setAuthError('Username must be at least 3 characters');
        return;
      }
      
      // Check if username already exists
      const existingUser = await loadUserData(regUsername);
      if (existingUser) {
        setAuthError('Username already exists');
        return;
      }
      
      // Validate email - mandatory
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!authEmail || !emailRegex.test(authEmail)) {
        setAuthError('Please enter a valid email address');
        return;
      }
      
      const emailLower = authEmail.trim().toLowerCase();
      
      // Check if email is already in use (Supabase - check dedicated column first, then data->email)
      if (isSupabaseConfigured()) {
        let existingEmail = await supabaseFetch(`users?email=eq.${encodeURIComponent(emailLower)}`);
        if (!existingEmail || existingEmail.length === 0) {
          // Fallback to data->>email for older accounts
          existingEmail = await supabaseFetch(`users?data->>email=eq.${encodeURIComponent(emailLower)}`);
        }
        if (existingEmail && existingEmail.length > 0) {
          setAuthError('This email is already registered. Please login or use a different email.');
          return;
        }
      }
      
      // Check if email is already in use (localStorage)
      const allKeys = Object.keys(localStorage).filter(k => k.startsWith('sqlquest_user_'));
      for (const key of allKeys) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (data.email && data.email.toLowerCase() === emailLower) {
            setAuthError('This email is already registered. Please login or use a different email.');
            return;
          }
        } catch (e) {}
      }
      
      const salt = generateSalt();
      const passwordHash = await hashPassword(authPassword, salt);
      const newUserData = {
        salt,
        passwordHash,
        email: emailLower, // Save email for password recovery (normalized to lowercase)
        emailVerified: false, // Must verify email before login
        xp: 0,
        streak: 0,
        queryCount: 0,
        solvedChallenges: [],
        unlockedAchievements: [],
        queryHistory: [],
        createdAt: Date.now()
      };
      await saveUserData(regUsername, newUserData);
      
      // Register with Supabase Auth - this sends the verification email
      let verificationEmailSent = false;
      try {
        const client = getSupabaseClient();
        if (client) {
          const { data, error } = await client.auth.signUp({
            email: emailLower,
            password: authPassword,
            options: {
              data: { username: regUsername },
              emailRedirectTo: window.location.origin + window.location.pathname + '?verified=true'
            }
          });
          
          if (error) {
            console.log('Supabase Auth signup error:', error.message);
          } else {
            console.log('Supabase Auth signup success, verification email sent');
            verificationEmailSent = true;
          }
        }
      } catch (authErr) {
        console.log('Supabase Auth signup error:', authErr.message);
      }
      
      // Show verification pending screen
      if (verificationEmailSent) {
        setVerificationEmail(emailLower);
        setShowVerificationPending(true);
        setAuthUsername('');
        setAuthPassword('');
        setAuthEmail('');
        setAuthError('');
        return; // Don't log in yet - wait for email verification
      } else {
        // If Supabase Auth failed, mark as verified and allow login (fallback)
        newUserData.emailVerified = true;
        await saveUserData(regUsername, newUserData);
        setAuthEmail(''); // Clear email field
        username = regUsername; // Set username for loadUserSession
      }
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
  const isDailyPracticeMode = completedDailyChallenges[todayString] === 'practice';
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
        // Stop timer immediately when correct answer is submitted
        setDailyTimerActive(false);
        setDailySolveTime(dailyTimer);
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
        
        {/* Email Verification Pending Screen */}
        {showVerificationPending && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-gray-900 to-green-900 rounded-2xl border border-green-500/50 p-8 w-full max-w-md">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-4xl">
                  📧
                </div>
                <h1 className="text-2xl font-bold text-green-400">Verify Your Email</h1>
                <p className="text-gray-400 mt-2">Almost there! Please check your inbox.</p>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
                <p className="text-gray-300 text-sm mb-3">
                  We've sent a verification email to:
                </p>
                <p className="text-green-400 font-medium text-center mb-3 break-all">
                  {verificationEmail}
                </p>
                <p className="text-gray-400 text-xs">
                  Click the link in the email to activate your account and start learning SQL!
                </p>
              </div>
              
              <div className="space-y-3">
                {!verificationResent ? (
                  <button
                    onClick={async () => {
                      setResendingVerification(true);
                      try {
                        await resendVerificationEmail(verificationEmail);
                        setVerificationResent(true);
                      } catch (err) {
                        alert('Failed to resend email: ' + err.message);
                      }
                      setResendingVerification(false);
                    }}
                    disabled={resendingVerification}
                    className="w-full py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg font-medium transition-all"
                  >
                    {resendingVerification ? 'Sending...' : "Didn't receive it? Resend Email"}
                  </button>
                ) : (
                  <p className="text-center text-green-400 text-sm py-3">
                    ✓ Verification email resent! Check your inbox.
                  </p>
                )}
                
                <button
                  onClick={() => {
                    setShowVerificationPending(false);
                    setVerificationEmail('');
                    setVerificationResent(false);
                    setAuthMode('login');
                  }}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-all"
                >
                  Back to Login
                </button>
              </div>
              
              <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-400 text-xs font-medium mb-1">📌 Tips:</p>
                <ul className="text-gray-400 text-xs space-y-1">
                  <li>• Check your spam/junk folder</li>
                  <li>• Make sure you entered the correct email</li>
                  <li>• The link expires in 24 hours</li>
                </ul>
              </div>
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
              <label className="block text-sm text-gray-400 mb-2">
                {authMode === 'login' ? 'Username or Email' : 'Username'}
              </label>
              <input
                type="text"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                placeholder={authMode === 'login' ? 'Enter username or email' : 'Choose a username'}
                autoComplete={authMode === 'login' ? 'username email' : 'username'}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              />
            </div>
            
            {/* Email field - only on register (mandatory) */}
            {authMode === 'register' && (
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="Enter your email"
                  autoComplete="email"
                  required
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Required for password recovery and login</p>
              </div>
            )}
            
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
              <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <p className="text-purple-400 text-sm font-medium mb-2">🔑 Password Reset</p>
                
                {!resetSent ? (
                  <>
                    <p className="text-gray-300 text-sm mb-3">
                      Enter your email address and we'll send you a link to reset your password.
                    </p>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none mb-3"
                    />
                    {resetError && (
                      <p className="text-red-400 text-xs mb-3">{resetError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={resetSending || !resetEmail}
                        onClick={async () => {
                          setResetSending(true);
                          setResetError('');
                          try {
                            await sendPasswordResetEmail(resetEmail);
                            setResetSent(true);
                          } catch (err) {
                            setResetError(err.message || 'Failed to send reset email. Please try again.');
                          }
                          setResetSending(false);
                        }}
                        className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-all"
                      >
                        {resetSending ? 'Sending...' : 'Send Reset Link'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowForgotPassword(false);
                          setResetEmail('');
                          setResetError('');
                        }}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="text-gray-500 text-xs mt-3">
                      Note: If you don't receive an email, check your spam folder or contact support.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-center py-4">
                      <div className="text-4xl mb-3">📧</div>
                      <p className="text-green-400 font-medium mb-2">Reset Link Sent!</p>
                      <p className="text-gray-300 text-sm mb-4">
                        We've sent a password reset link to <span className="text-purple-400">{resetEmail}</span>
                      </p>
                      <p className="text-gray-500 text-xs mb-4">
                        Click the link in the email to reset your password. The link will expire in 1 hour.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setShowForgotPassword(false);
                          setResetSent(false);
                          setResetEmail('');
                        }}
                        className="text-sm text-purple-400 hover:text-purple-300"
                      >
                        ← Back to login
                      </button>
                    </div>
                  </>
                )}
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
        
        {/* Password Reset Form - shown when user clicks reset link from email */}
        {showResetPassword && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-gray-900 to-purple-900 rounded-2xl border border-purple-500/50 p-8 w-full max-w-md">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
                  🔐
                </div>
                <h2 className="text-2xl font-bold">Reset Your Password</h2>
                <p className="text-gray-400 mt-2">Enter your new password below</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">New Password</label>
                  <input
                    type="password"
                    value={newResetPassword}
                    onChange={(e) => setNewResetPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmResetPassword}
                    onChange={(e) => setConfirmResetPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                
                {/* Password strength indicator */}
                {newResetPassword && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          getPasswordStrength(newResetPassword).color === 'red' ? 'bg-red-500' :
                          getPasswordStrength(newResetPassword).color === 'orange' ? 'bg-orange-500' :
                          getPasswordStrength(newResetPassword).color === 'yellow' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${getPasswordStrength(newResetPassword).percent}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${
                      getPasswordStrength(newResetPassword).color === 'red' ? 'text-red-400' :
                      getPasswordStrength(newResetPassword).color === 'orange' ? 'text-orange-400' :
                      getPasswordStrength(newResetPassword).color === 'yellow' ? 'text-yellow-400' :
                      'text-green-400'
                    }`}>
                      {getPasswordStrength(newResetPassword).label}
                    </span>
                  </div>
                )}
                
                {resetError && (
                  <p className="text-red-400 text-sm">{resetError}</p>
                )}
                
                <button
                  onClick={async () => {
                    setResetError('');
                    
                    if (!newResetPassword) {
                      setResetError('Please enter a new password');
                      return;
                    }
                    if (newResetPassword.length < 6) {
                      setResetError('Password must be at least 6 characters');
                      return;
                    }
                    if (newResetPassword !== confirmResetPassword) {
                      setResetError('Passwords do not match');
                      return;
                    }
                    
                    const strength = getPasswordStrength(newResetPassword);
                    if (strength.score < 3) {
                      setResetError('Please choose a stronger password');
                      return;
                    }
                    
                    try {
                      await updatePasswordWithToken(newResetPassword);
                      alert('Password updated successfully! You can now log in with your new password.');
                      setShowResetPassword(false);
                      setNewResetPassword('');
                      setConfirmResetPassword('');
                      // Clean up URL
                      window.history.replaceState({}, document.title, window.location.pathname);
                    } catch (err) {
                      setResetError(err.message || 'Failed to update password. Please try again.');
                    }
                  }}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-bold text-white transition-all"
                >
                  Update Password
                </button>
                
                <button
                  onClick={() => {
                    setShowResetPassword(false);
                    setNewResetPassword('');
                    setConfirmResetPassword('');
                    setResetError('');
                    window.history.replaceState({}, document.title, window.location.pathname);
                  }}
                  className="w-full py-2 text-gray-400 hover:text-white text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
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
      {showConfetti && <ConfettiAnimation onComplete={() => setShowConfetti(false)} soundEnabled={soundEnabled} />}
      
      {/* Daily Login Reward Modal */}
      {showLoginReward && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-yellow-900/90 to-orange-900/90 rounded-2xl border border-yellow-500/50 w-full max-w-md p-6 text-center animate-bounce-in">
            <div className="text-6xl mb-4">🎁</div>
            <h2 className="text-2xl font-bold text-yellow-400 mb-2">Daily Reward!</h2>
            <p className="text-gray-300 mb-4">Welcome back! You've logged in for</p>
            <div className="text-5xl font-bold text-white mb-2">{loginStreak} Day{loginStreak !== 1 ? 's' : ''}</div>
            <p className="text-yellow-400 text-sm mb-4">
              {loginStreak % 7 === 0 ? '🎉 Weekly Milestone Bonus!' : `${7 - (loginStreak % 7)} days until weekly bonus!`}
            </p>
            
            {/* Streak Progress */}
            <div className="flex justify-center gap-1 mb-6">
              {[1, 2, 3, 4, 5, 6, 7].map(day => (
                <div
                  key={day}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    (loginStreak % 7 || 7) >= day
                      ? 'bg-yellow-500 text-black'
                      : 'bg-gray-700 text-gray-500'
                  }`}
                >
                  {day === 7 ? '🎁' : day}
                </div>
              ))}
            </div>
            
            <div className="bg-black/30 rounded-xl p-4 mb-6">
              <p className="text-gray-400 text-sm">Your Reward</p>
              <p className="text-3xl font-bold text-green-400">+{loginRewardAmount} XP</p>
              {loginStreak > 1 && (
                <p className="text-xs text-yellow-400 mt-1">
                  Includes +{Math.min(loginStreak - 1, 6) * 5} streak bonus!
                </p>
              )}
            </div>
            
            <button
              onClick={claimLoginReward}
              className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 rounded-xl font-bold text-black text-lg"
            >
              Claim Reward! 🎉
            </button>
          </div>
        </div>
      )}
      
      {/* Login Reward Claimed Toast */}
      {showLoginRewardClaimed && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg z-50 animate-bounce">
          ✓ +{loginRewardAmount} XP Claimed!
        </div>
      )}
      
      {/* Learning Goals Modal */}
      {showGoalsModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowGoalsModal(false)}>
          <div className="bg-gray-900 rounded-2xl border border-purple-500/30 w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">🎯 Weekly Goals</h2>
              <button onClick={() => setShowGoalsModal(false)} className="text-gray-400 hover:text-white text-2xl">✕</button>
            </div>
            
            {/* Current Goals */}
            <div className="space-y-3 mb-6">
              {weeklyGoals.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No goals set yet. Add one below!</p>
              ) : (
                weeklyGoals.map(goal => (
                  <div 
                    key={goal.id} 
                    className={`p-4 rounded-xl border ${goal.completed ? 'bg-green-500/10 border-green-500/30' : 'bg-gray-800/50 border-gray-700'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium flex items-center gap-2">
                        {goal.completed && '✅'} {getGoalLabel(goal.type)}
                      </span>
                      {!goal.completed && (
                        <button
                          onClick={() => removeGoal(goal.id)}
                          className="text-gray-500 hover:text-red-400 text-sm"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${goal.completed ? 'bg-green-500' : 'bg-purple-500'}`}
                          style={{ width: `${Math.min((goal.progress / goal.target) * 100, 100)}%` }}
                        />
                      </div>
                      <span className={`text-sm font-medium ${goal.completed ? 'text-green-400' : 'text-gray-400'}`}>
                        {goal.progress}/{goal.target}
                      </span>
                    </div>
                    {goal.completed && (
                      <p className="text-xs text-green-400 mt-2">🎉 +{goal.target * 5} XP bonus earned!</p>
                    )}
                  </div>
                ))
              )}
            </div>
            
            {/* Add New Goal */}
            {weeklyGoals.filter(g => !g.completed).length < 3 && (
              <div className="border-t border-gray-700 pt-4">
                <p className="text-sm text-gray-400 mb-3">Add a new goal (max 3 active):</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => addGoal('interviews_pass', 2)}
                    className="p-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-sm"
                  >
                    💼 Pass 2 Interviews
                  </button>
                  <button
                    onClick={() => addGoal('challenges_solve', 5)}
                    className="p-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-sm"
                  >
                    🎯 Solve 5 Challenges
                  </button>
                  <button
                    onClick={() => addGoal('xp_earn', 500)}
                    className="p-3 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 rounded-lg text-sm"
                  >
                    ⭐ Earn 500 XP
                  </button>
                  <button
                    onClick={() => addGoal('daily_streak', 5)}
                    className="p-3 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded-lg text-sm"
                  >
                    🔥 5-Day Streak
                  </button>
                </div>
              </div>
            )}
            
            <button
              onClick={() => setShowGoalsModal(false)}
              className="w-full mt-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      {/* Share Results Modal */}
      {showShareModal && shareData && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowShareModal(false)}>
          <div className="bg-gray-900 rounded-2xl border border-blue-500/30 w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">📤 Share Your Result</h2>
              <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-white text-2xl">✕</button>
            </div>
            
            {/* Preview Card */}
            <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl p-4 mb-6 border border-purple-500/30">
              <div className="text-center">
                <div className="text-4xl mb-2">{shareData.passed ? '🎉' : '💪'}</div>
                <h3 className="font-bold text-lg">{shareData.passed ? 'Interview Passed!' : 'Interview Completed'}</h3>
                <p className="text-gray-400 text-sm">{shareData.interviewTitle}</p>
                <div className={`text-3xl font-bold mt-2 ${shareData.passed ? 'text-green-400' : 'text-yellow-400'}`}>
                  {shareData.percentage}%
                </div>
              </div>
            </div>
            
            {/* Share Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => shareToTwitter(shareData)}
                className="w-full py-3 bg-[#1DA1F2] hover:bg-[#1a8cd8] rounded-xl font-bold flex items-center justify-center gap-2"
              >
                🐦 Share on Twitter
              </button>
              <button
                onClick={() => shareToLinkedIn(shareData)}
                className="w-full py-3 bg-[#0A66C2] hover:bg-[#094d92] rounded-xl font-bold flex items-center justify-center gap-2"
              >
                💼 Share on LinkedIn
              </button>
              <button
                onClick={() => copyShareLink(shareData)}
                className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                📋 Copy to Clipboard
              </button>
            </div>
            
            <button
              onClick={() => setShowShareModal(false)}
              className="w-full mt-4 py-2 text-gray-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* Certificate Modal */}
      {showCertificateModal && certificateData && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowCertificateModal(false)}>
          <div className="bg-gray-900 rounded-2xl border border-yellow-500/30 w-full max-w-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">🎓 Your Certificate</h2>
              <button onClick={() => setShowCertificateModal(false)} className="text-gray-400 hover:text-white text-2xl">✕</button>
            </div>
            
            {/* Certificate Preview */}
            <div className="bg-gradient-to-br from-amber-100 to-amber-50 rounded-xl p-8 mb-6 text-center border-4 border-yellow-600">
              <div className="text-purple-600 font-bold mb-2">🎓 SQL Quest Academy</div>
              <h3 className="text-3xl font-serif font-bold text-gray-800 mb-4">Certificate of Achievement</h3>
              <p className="text-gray-600 mb-2">This is to certify that</p>
              <p className="text-2xl font-serif font-bold text-purple-700 mb-2">{currentUser}</p>
              <p className="text-gray-600 mb-2">has successfully passed the</p>
              <p className="text-xl font-bold text-gray-800 mb-2">{certificateData.interviewTitle}</p>
              <p className="text-gray-600 mb-1">with a score of</p>
              <p className="text-4xl font-bold text-green-600">{certificateData.percentage}%</p>
              <p className="text-gray-500 text-sm mt-4">
                {new Date(certificateData.timestamp || Date.now()).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric'
                })}
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => downloadCertificate(certificateData)}
                className="py-3 bg-green-600 hover:bg-green-700 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                💾 Download HTML
              </button>
              <button
                onClick={() => printCertificate(certificateData)}
                className="py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                🖨️ Print Certificate
              </button>
            </div>
            
            <button
              onClick={() => setShowCertificateModal(false)}
              className="w-full mt-4 py-2 text-gray-400 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      {/* 30-Day Challenge Modal */}
      {show30DayChallenge && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-900 rounded-2xl border border-purple-500/30 w-full max-w-6xl max-h-[95vh] overflow-y-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                  🗓️ Master SQL 30-Day Challenge
                </h2>
                <p className="text-gray-400 mt-1">Transform from SQL beginner to expert in 30 days</p>
              </div>
              <button 
                onClick={() => setShow30DayChallenge(false)} 
                className="text-gray-400 hover:text-white text-2xl"
              >✕</button>
            </div>
            
            {/* Start/Status Section */}
            {!(challengeStartDate || get30DayStartDate()) ? (
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-8 mb-6 text-center">
                <div className="text-6xl mb-4">🚀</div>
                <h3 className="text-2xl font-bold mb-3">Ready to Master SQL?</h3>
                <p className="text-gray-400 mb-6 max-w-xl mx-auto">
                  Join thousands of learners in our structured 30-day program. Each day unlocks new lessons 
                  and challenges that build on each other, taking you from basics to advanced analytics.
                </p>
                <div className="flex flex-wrap justify-center gap-4 mb-6">
                  <div className="bg-black/30 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-purple-400">30</div>
                    <div className="text-xs text-gray-500">Daily Lessons</div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-pink-400">5</div>
                    <div className="text-xs text-gray-500">Skill Modules</div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-orange-400">1000+</div>
                    <div className="text-xs text-gray-500">XP to Earn</div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-400">🎓</div>
                    <div className="text-xs text-gray-500">Certificate</div>
                  </div>
                </div>
                <button
                  onClick={start30DayChallenge}
                  className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-bold text-lg"
                >
                  Start Your 30-Day Journey! 🎯
                </button>
              </div>
            ) : (
              <>
                {/* Progress Overview */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl p-4 text-center border border-purple-500/30">
                    <div className="text-3xl font-bold text-purple-400">Day {getCurrentDayNumber()}</div>
                    <div className="text-sm text-gray-400">Current Day</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl p-4 text-center border border-green-500/30">
                    <div className="text-3xl font-bold text-green-400">
                      {Object.values(challengeProgress).filter(p => p?.completed).length}
                    </div>
                    <div className="text-sm text-gray-400">Days Completed</div>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-4 text-center border border-yellow-500/30">
                    <div className="text-3xl font-bold text-yellow-400">
                      {Object.values(challengeProgress).reduce((sum, p) => sum + (p?.score || 0), 0)}
                    </div>
                    <div className="text-sm text-gray-400">XP Earned</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl p-4 text-center border border-blue-500/30">
                    <div className="text-3xl font-bold text-blue-400">
                      {Math.round((Object.values(challengeProgress).filter(p => p?.completed).length / 30) * 100)}%
                    </div>
                    <div className="text-sm text-gray-400">Complete</div>
                  </div>
                </div>
                
                {/* Week Progress Bars */}
                <div className="mb-6">
                  <h3 className="font-bold mb-3">Weekly Progress</h3>
                  <div className="space-y-2">
                    {thirtyDayData.weeks?.map(week => {
                      const progress = getWeekProgress(week.id);
                      return (
                        <div key={week.id} className="flex items-center gap-3">
                          <span className="text-2xl">{week.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{week.title}</span>
                              <span className="text-xs text-gray-500">{progress.completed}/{progress.total}</span>
                            </div>
                            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full bg-gradient-to-r ${week.color} transition-all`}
                                style={{ width: `${progress.percentage}%` }}
                              />
                            </div>
                          </div>
                          {progress.percentage === 100 && <span className="text-green-400">✓</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
            
            {/* Days Grid */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h3 className="font-bold text-lg">📅 Your Journey</h3>
                {(challengeStartDate || get30DayStartDate()) && (() => {
                  const unlockInfo = getNextUnlockInfo();
                  return (
                    <span className={`text-sm px-3 py-1 rounded-full ${
                      unlockInfo.status === 'available' ? 'bg-green-500/20 text-green-400' :
                      unlockInfo.status === 'waiting' ? 'bg-yellow-500/20 text-yellow-400' :
                      unlockInfo.status === 'complete' ? 'bg-purple-500/20 text-purple-400' :
                      'text-gray-400'
                    }`}>
                      {unlockInfo.message}
                    </span>
                  );
                })()}
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2">
                {thirtyDayData.days?.map(day => {
                  const isUnlocked = isDayUnlocked(day.day);
                  const isCompleted = isDayCompleted(day.day);
                  const isNextToDo = isUnlocked && !isCompleted && (day.day === 1 || isDayCompleted(day.day - 1));
                  const weekColor = thirtyDayData.weeks?.find(w => w.id === day.week)?.color || 'from-gray-500 to-gray-600';
                  
                  // Calculate why day is locked
                  let lockReason = '';
                  if (!isUnlocked) {
                    const prevCompleted = day.day === 1 || challengeProgress[`day${day.day - 1}`]?.completed;
                    if (!prevCompleted) {
                      lockReason = `Complete Day ${day.day - 1} first`;
                    } else {
                      const daysUntil = day.day - getCurrentDayNumber();
                      lockReason = daysUntil === 1 ? 'Unlocks tomorrow' : `Unlocks in ${daysUntil} days`;
                    }
                  }
                  
                  return (
                    <button
                      key={day.day}
                      onClick={() => openDayChallenge(day.day)}
                      disabled={!isUnlocked}
                      className={`relative aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-bold transition-all ${
                        isCompleted 
                          ? 'bg-green-500/30 border-2 border-green-500 text-green-400 hover:bg-green-500/40' 
                          : isNextToDo
                            ? `bg-gradient-to-br ${weekColor} border-2 border-yellow-400 shadow-lg shadow-yellow-500/30 animate-pulse`
                            : isUnlocked
                              ? 'bg-gray-700 hover:bg-gray-600 border border-gray-600 hover:border-purple-500'
                              : 'bg-gray-800/50 text-gray-600 cursor-not-allowed opacity-50'
                      }`}
                      title={isUnlocked ? `Day ${day.day}: ${day.title}${isCompleted ? ' ✓ Completed' : isNextToDo ? ' ⭐ Do this next!' : ''}` : lockReason}
                    >
                      <span>{day.day}</span>
                      {isCompleted && <span className="absolute -top-1 -right-1 text-sm">✅</span>}
                      {isNextToDo && <span className="absolute -top-1 -right-1 text-sm">⭐</span>}
                      {!isUnlocked && <Lock size={10} className="absolute bottom-1 opacity-50" />}
                    </button>
                  );
                })}
              </div>
              
              {/* Legend */}
              <div className="flex gap-4 mt-3 text-xs text-gray-500 flex-wrap">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500/30 border border-green-500 rounded"></span> Completed</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-500 border-2 border-yellow-400 rounded"></span> Next to do</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-700 border border-gray-600 rounded"></span> Available</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-800/50 rounded opacity-50"></span> Locked</span>
              </div>
            </div>
            
            {/* Curriculum Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {thirtyDayData.weeks?.map(week => {
                const weekDays = thirtyDayData.days?.filter(d => d.week === week.id) || [];
                const progress = getWeekProgress(week.id);
                
                return (
                  <div key={week.id} className={`bg-gradient-to-br ${week.color.replace('from-', 'from-').replace('to-', 'to-')}/10 rounded-xl p-4 border border-gray-700`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">{week.icon}</span>
                      <div>
                        <h4 className="font-bold">{week.title}</h4>
                        <p className="text-xs text-gray-500">{week.subtitle}</p>
                      </div>
                      {progress.percentage === 100 && <span className="ml-auto text-green-400">✓</span>}
                    </div>
                    <div className="space-y-1 text-xs text-gray-400">
                      {weekDays.slice(0, 4).map(day => (
                        <div key={day.day} className="flex items-center gap-2">
                          <span className={isDayCompleted(day.day) ? 'text-green-400' : ''}>
                            {isDayCompleted(day.day) ? '✓' : '○'}
                          </span>
                          <span>Day {day.day}: {day.title}</span>
                        </div>
                      ))}
                      {weekDays.length > 4 && (
                        <div className="text-gray-500">+{weekDays.length - 4} more...</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <button
              onClick={() => setShow30DayChallenge(false)}
              className="w-full mt-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      {/* Day Lesson Modal */}
      {showDayLesson && currentChallengeDay && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-900 rounded-2xl border border-purple-500/30 w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gray-800/50 p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">
                    Day {currentChallengeDay.day}: {currentChallengeDay.title}
                  </h2>
                  <p className="text-sm text-gray-400">{currentChallengeDay.description}</p>
                </div>
                <button 
                  onClick={() => setShowDayLesson(false)} 
                  className="text-gray-400 hover:text-white"
                >✕</button>
              </div>
              
              {/* Step Indicator */}
              <div className="flex gap-2 mt-4">
                {['lesson', 'challenge', 'complete'].map((step, i) => (
                  <div 
                    key={step}
                    className={`flex-1 h-2 rounded ${
                      step === dayLessonStep ? 'bg-purple-500' :
                      (dayLessonStep === 'challenge' && step === 'lesson') || dayLessonStep === 'complete' ? 'bg-green-500' :
                      'bg-gray-700'
                    }`}
                  />
                ))}
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {dayLessonStep === 'lesson' && (
                <div className="prose prose-invert max-w-none">
                  <div 
                    className="lesson-content"
                    dangerouslySetInnerHTML={{ 
                      __html: (() => {
                        let content = currentChallengeDay.lesson?.content || '';
                        // First handle code blocks (triple backticks) - must come before single backticks
                        content = content.replace(/```sql\s*([\s\S]*?)```/g, '<pre class="bg-gray-900 p-4 rounded-lg overflow-x-auto my-4 border border-gray-700"><code class="text-green-400 font-mono text-sm">$1</code></pre>');
                        content = content.replace(/```\s*([\s\S]*?)```/g, '<pre class="bg-gray-900 p-4 rounded-lg overflow-x-auto my-4 border border-gray-700"><code class="text-gray-300 font-mono text-sm">$1</code></pre>');
                        // Handle inline code (single backticks)
                        content = content.replace(/`([^`\n]+)`/g, '<code class="bg-gray-800 px-2 py-0.5 rounded text-green-400 font-mono text-sm">$1</code>');
                        // Headers
                        content = content.replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-purple-400 mb-4">$1</h1>');
                        content = content.replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold text-cyan-400 mt-6 mb-3">$1</h2>');
                        content = content.replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold text-green-400 mt-4 mb-2">$1</h3>');
                        // Bold
                        content = content.replace(/\*\*(.*?)\*\*/g, '<strong class="text-yellow-300">$1</strong>');
                        // Lists
                        content = content.replace(/^- (.*$)/gm, '<li class="text-gray-300 ml-4">$1</li>');
                        content = content.replace(/^\* (.*$)/gm, '<li class="text-gray-300 ml-4">$1</li>');
                        // Paragraphs (double newlines)
                        content = content.replace(/\n\n/g, '</p><p class="text-gray-300 mb-4">');
                        // Wrap in paragraph
                        content = '<p class="text-gray-300 mb-4">' + content + '</p>';
                        return content;
                      })()
                    }} 
                  />
                  
                  {/* Tips */}
                  {currentChallengeDay.lesson?.tips && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mt-6">
                      <h3 className="font-bold text-yellow-400 mb-2">💡 Pro Tips</h3>
                      <ul className="space-y-2">
                        {currentChallengeDay.lesson.tips.map((tip, i) => (
                          <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                            <span className="text-yellow-400">•</span> {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <button
                    onClick={() => setDayLessonStep('challenge')}
                    className="w-full mt-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-bold"
                  >
                    Start Challenge →
                  </button>
                </div>
              )}
              
              {dayLessonStep === 'challenge' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Challenge Info */}
                  <div className="space-y-4">
                    {/* Question Progress Bar */}
                    {currentChallengeDay.questions && currentChallengeDay.questions.length > 1 && (
                      <div className="bg-gray-800/30 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-400">Question {currentQuestionIndex + 1} of {currentChallengeDay.questions.length}</span>
                          <span className="text-sm text-purple-400 font-medium">
                            {currentChallengeDay.questions[currentQuestionIndex]?.points || 10} pts
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {currentChallengeDay.questions.map((q, i) => (
                            <div
                              key={i}
                              className={`flex-1 h-2 rounded-full transition-all ${
                                challengeProgress[`day${currentChallengeDay.day}`]?.questionsCompleted?.includes(q.id)
                                  ? 'bg-green-500'
                                  : i === currentQuestionIndex
                                  ? 'bg-purple-500'
                                  : 'bg-gray-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Current Question */}
                    {(() => {
                      const currentQuestion = currentChallengeDay.questions?.[currentQuestionIndex] || currentChallengeDay.challenge;
                      if (!currentQuestion) return <p className="text-gray-500">No question available</p>;
                      
                      return (
                        <>
                          <div className="bg-gray-800/50 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-bold text-lg text-purple-400">
                                🎯 {currentQuestion.title}
                              </h3>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                currentQuestion.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                                currentQuestion.difficulty === 'easy-medium' ? 'bg-blue-500/20 text-blue-400' :
                                currentQuestion.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                currentQuestion.difficulty === 'medium-hard' ? 'bg-orange-500/20 text-orange-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {currentQuestion.difficulty || 'medium'}
                              </span>
                            </div>
                            <p className="text-gray-300" dangerouslySetInnerHTML={{
                              __html: (currentQuestion.description || '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-yellow-300">$1</strong>')
                            }} />
                            <div className="flex items-center gap-3 mt-3 text-sm text-gray-500">
                              <span>📊 Dataset: titanic</span>
                              <span>🎖️ {currentQuestion.points || 10} points</span>
                            </div>
                          </div>
                          
                          {/* Hints */}
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                setDayHintUsed(true);
                                setShowDayHint(!showDayHint);
                              }}
                              className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm"
                            >
                              💡 {showDayHint ? 'Hide Hint' : 'Show Hint'} {dayHintUsed && '(used)'}
                            </button>
                            <span className="text-xs text-gray-500">Concepts: {currentChallengeDay.concepts?.join(', ')}</span>
                          </div>
                          
                          {showDayHint && (
                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                              <p className="text-yellow-300 text-sm">
                                💡 {currentQuestion.hint || currentQuestion.hints?.[0] || 'Think about what the question is asking for.'}
                              </p>
                            </div>
                          )}
                          
                          {/* Table & Expected Result */}
                          <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700">
                            <div className="flex flex-wrap gap-4 text-xs">
                              <div className="flex-1 min-w-[200px]">
                                <span className="text-gray-500">📋 Table:</span>
                                <span className="text-purple-400 font-mono ml-1 font-bold">
                                  {currentQuestion.tableUsed || 'passengers'}
                                </span>
                              </div>
                              <div className="flex-1 min-w-[200px]">
                                <span className="text-gray-500">🎯 Output:</span>
                                {(() => {
                                  const solution = currentQuestion.solution;
                                  if (!db || !solution) return <span className="text-gray-600 ml-1">Loading...</span>;
                                  try {
                                    const result = db.exec(solution);
                                    if (result.length === 0) return <span className="text-gray-600 ml-1">Empty result</span>;
                                    const cols = result[0].columns;
                                    const rowCount = result[0].values.length;
                                    return (
                                      <>
                                        <span className="text-green-400 font-mono ml-1">{cols.join(', ')}</span>
                                        <span className="text-gray-600 ml-1">({rowCount} rows)</span>
                                      </>
                                    );
                                  } catch (e) {
                                    return <span className="text-gray-600 ml-1">Preview unavailable</span>;
                                  }
                                })()}
                              </div>
                            </div>
                            {/* Sample row preview */}
                            {(() => {
                              const solution = currentQuestion.solution;
                              if (!db || !solution) return null;
                              try {
                                const result = db.exec(solution);
                                if (result.length === 0 || result[0].values.length === 0) return null;
                                const rows = result[0].values.slice(0, 3);
                                const cols = result[0].columns;
                                return (
                                  <div className="mt-2 pt-2 border-t border-gray-700/50">
                                    <p className="text-gray-500 text-xs mb-1">Expected output preview:</p>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs font-mono">
                                        <thead>
                                          <tr className="border-b border-gray-700">
                                            {cols.map((col, i) => (
                                              <th key={i} className="text-left py-1 px-2 text-green-400">{col}</th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {rows.map((row, ri) => (
                                            <tr key={ri} className="border-b border-gray-800">
                                              {row.map((cell, ci) => (
                                                <td key={ci} className="py-1 px-2 text-gray-400">
                                                  {cell === null ? <span className="text-gray-600 italic">NULL</span> : String(cell).substring(0, 20)}
                                                </td>
                                              ))}
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                      {result[0].values.length > 3 && (
                                        <p className="text-gray-600 text-xs mt-1">...and {result[0].values.length - 3} more rows</p>
                                      )}
                                    </div>
                                  </div>
                                );
                              } catch (e) {
                                return null;
                              }
                            })()}
                          </div>
                        </>
                      );
                    })()}
                    
                    {/* Query Editor */}
                    <div>
                      <label className="text-sm text-gray-400 mb-2 block">Your SQL Query:</label>
                      <textarea
                        value={dayQuery}
                        onChange={(e) => setDayQuery(e.target.value)}
                        placeholder="Write your SQL query here..."
                        className="w-full h-32 bg-gray-900 border border-gray-700 rounded-lg p-3 text-green-400 font-mono text-sm focus:border-purple-500 focus:outline-none resize-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            runDayQuery();
                          }
                        }}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={runDayQuery}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium flex items-center gap-2"
                        >
                          <Play size={16} /> Run
                        </button>
                        <button
                          onClick={() => {
                            if (checkDayAnswer()) {
                              completeCurrentQuestion();
                            } else {
                              alert('Not quite right! Check your query and try again.');
                              playSound('error');
                            }
                          }}
                          disabled={!dayQuery.trim()}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-medium flex items-center gap-2"
                        >
                          <CheckCircle size={16} /> Submit Answer
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {dayResult.error && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                        <p className="text-red-400 font-mono text-sm">{dayResult.error}</p>
                      </div>
                    )}
                    
                    {dayResult.rows.length > 0 && (
                      <div className="bg-gray-800/50 rounded-xl p-4">
                        <p className="text-sm text-gray-400 mb-2">Query Result ({dayResult.rows.length} rows)</p>
                        <div className="overflow-x-auto max-h-64">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-700">
                                {dayResult.columns.map((col, i) => (
                                  <th key={i} className="px-3 py-2 text-left text-green-400 font-medium">{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {dayResult.rows.slice(0, 20).map((row, i) => (
                                <tr key={i} className="border-b border-gray-800">
                                  {row.map((cell, j) => (
                                    <td key={j} className="px-3 py-2 text-gray-300">{cell === null ? 'NULL' : String(cell)}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {dayResult.rows.length > 20 && (
                            <p className="text-xs text-gray-500 mt-2">Showing 20 of {dayResult.rows.length} rows</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {dayLessonStep === 'complete' && (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🎉</div>
                  <h2 className="text-3xl font-bold text-green-400 mb-2">Day {currentChallengeDay.day} Complete!</h2>
                  <p className="text-gray-400 mb-6">You've mastered {currentChallengeDay.title}</p>
                  
                  <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-6 max-w-md mx-auto mb-6">
                    <div className="text-4xl font-bold text-green-400">
                      +{challengeProgress[`day${currentChallengeDay.day}`]?.score || 0} XP
                    </div>
                    <p className="text-gray-400 text-sm mt-2">
                      {dayHintUsed ? 'Hint used (-15%)' : 'No hints used - Full points!'}
                    </p>
                  </div>
                  
                  {/* Share Achievement */}
                  <div className="mb-6">
                    <button
                      onClick={() => { setShareType('day'); setShowShareModal(true); }}
                      className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-lg font-medium text-sm"
                    >
                      📤 Share This Achievement
                    </button>
                  </div>
                  
                  {/* Next day info */}
                  {currentChallengeDay.day < 30 && (
                    <div className="mb-6 text-sm">
                      {isDayUnlocked(currentChallengeDay.day + 1) ? (
                        <p className="text-purple-400">✨ Day {currentChallengeDay.day + 1} is unlocked and waiting!</p>
                      ) : (
                        <p className="text-gray-500">🔒 Day {currentChallengeDay.day + 1} unlocks tomorrow at midnight</p>
                      )}
                    </div>
                  )}
                  
                  {currentChallengeDay.day === 30 && (
                    <div className="mb-6">
                      <p className="text-2xl text-yellow-400 font-bold">🏆 You've completed the 30-Day Challenge!</p>
                    </div>
                  )}
                  
                  <div className="flex gap-4 justify-center flex-wrap">
                    {currentChallengeDay.day < 30 && isDayUnlocked(currentChallengeDay.day + 1) && (
                      <button
                        onClick={() => openDayChallenge(currentChallengeDay.day + 1)}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-bold"
                      >
                        Start Day {currentChallengeDay.day + 1} →
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowDayLesson(false);
                        setShow30DayChallenge(true);
                      }}
                      className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold"
                    >
                      Back to Overview
                    </button>
                  </div>
                </div>
              )}
              
              {dayLessonStep === 'review' && (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">✅</div>
                  <h2 className="text-2xl font-bold text-green-400 mb-2">Day {currentChallengeDay.day} Completed!</h2>
                  <p className="text-gray-400 mb-2">You completed this day on {new Date(challengeProgress[`day${currentChallengeDay.day}`]?.completedAt).toLocaleDateString()}</p>
                  
                  {/* Score info */}
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 max-w-sm mx-auto mb-6">
                    <p className="text-green-400 font-bold text-2xl">+{challengeProgress[`day${currentChallengeDay.day}`]?.score || 0} XP</p>
                    <p className="text-gray-500 text-sm">
                      {challengeProgress[`day${currentChallengeDay.day}`]?.hintUsed ? 'Hint was used' : 'No hints used'}
                    </p>
                  </div>
                  
                  <div className="flex gap-4 justify-center flex-wrap">
                    <button
                      onClick={() => setDayLessonStep('lesson')}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold"
                    >
                      📚 Review Lesson
                    </button>
                    <button
                      onClick={() => restartDay(currentChallengeDay.day)}
                      className="px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-xl font-bold"
                    >
                      🔄 Restart Day
                    </button>
                    <button
                      onClick={() => setShowDayLesson(false)}
                      className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* 30-Day Completion Certificate Modal */}
      {show30DayCertificate && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-purple-500/30 w-full max-w-2xl p-6 text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent mb-2">
              Congratulations!
            </h2>
            <p className="text-xl text-gray-300 mb-6">You've completed the 30-Day SQL Master Challenge!</p>
            
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-6 mb-6 border border-purple-500/30">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-3xl font-bold text-purple-400">30</div>
                  <div className="text-sm text-gray-500">Days Completed</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-400">
                    {Object.values(challengeProgress).reduce((sum, p) => sum + (p?.score || 0), 0)}
                  </div>
                  <div className="text-sm text-gray-500">Total XP</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-yellow-400">🎓</div>
                  <div className="text-sm text-gray-500">SQL Master</div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4 justify-center flex-wrap">
              <button
                onClick={download30DayCertificate}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-bold"
              >
                💾 Download Certificate
              </button>
              <button
                onClick={() => { setShowShareModal(true); setShareType('certificate'); }}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-xl font-bold"
              >
                📤 Share Achievement
              </button>
              <button
                onClick={() => setShow30DayCertificate(false)}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={() => setShowShareModal(false)}>
          <div className="bg-gray-900 rounded-2xl border border-blue-500/30 w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                📤 Share Your Progress
              </h2>
              <button onClick={() => setShowShareModal(false)} className="text-gray-500 hover:text-white text-2xl">&times;</button>
            </div>
            
            {/* Share Type Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {[
                { id: 'progress', icon: '📊', label: 'Progress' },
                { id: 'streak', icon: '🔥', label: 'Streak' },
                { id: 'day', icon: '✅', label: 'Day Complete' },
                { id: 'certificate', icon: '🏆', label: 'Certificate' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setShareType(tab.id)}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                    shareType === tab.id 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
            
            {/* Preview */}
            <div className="bg-gray-800 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-400 mb-3">Preview:</p>
              {shareType === 'progress' && (
                <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-lg p-4 text-center">
                  <div className="text-4xl mb-2">🎯</div>
                  <div className="text-xl font-bold text-white">SQL Quest Progress</div>
                  <div className="text-purple-400 font-medium mt-2">
                    {Object.values(challengeProgress).filter(p => p?.completed).length}/30 Days Complete
                  </div>
                  <div className="flex justify-center gap-6 mt-4 text-sm">
                    <div><span className="text-yellow-400 font-bold">{xp}</span> XP</div>
                    <div><span className="text-orange-400 font-bold">{streak}</span> Streak</div>
                  </div>
                </div>
              )}
              {shareType === 'streak' && (() => {
                const streakTier = streak >= 100 ? 'legendary' : streak >= 30 ? 'master' : streak >= 14 ? 'expert' : streak >= 7 ? 'rising' : 'starter';
                const tierInfo = {
                  legendary: { emoji: '👑', title: 'LEGENDARY', color: 'from-yellow-600 to-amber-500', text: 'text-yellow-400' },
                  master: { emoji: '🏆', title: 'MASTER', color: 'from-purple-600 to-pink-500', text: 'text-purple-400' },
                  expert: { emoji: '🔥', title: 'ON FIRE', color: 'from-red-600 to-orange-500', text: 'text-red-400' },
                  rising: { emoji: '⚡', title: 'RISING STAR', color: 'from-blue-600 to-cyan-500', text: 'text-blue-400' },
                  starter: { emoji: '✨', title: 'GETTING STARTED', color: 'from-green-600 to-emerald-500', text: 'text-green-400' }
                }[streakTier];
                return (
                  <div className={`bg-gradient-to-br ${tierInfo.color} bg-opacity-20 rounded-lg p-6 text-center relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-black/40"></div>
                    <div className="relative z-10">
                      <div className="text-5xl mb-2 animate-bounce">{tierInfo.emoji}</div>
                      <div className={`text-5xl font-black ${tierInfo.text}`}>{streak}</div>
                      <div className="text-white font-bold text-sm tracking-widest mt-1">DAY STREAK</div>
                      <div className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-bold bg-white/10 ${tierInfo.text}`}>
                        {tierInfo.title}
                      </div>
                    </div>
                  </div>
                );
              })()}
              {shareType === 'day' && (
                <div className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 rounded-lg p-4 text-center">
                  <div className="text-4xl mb-2">✅</div>
                  <div className="text-xl font-bold text-green-400">Day {currentChallengeDay?.day || Object.values(challengeProgress).filter(p => p?.completed).length} Complete!</div>
                  <div className="text-gray-300 text-sm mt-1">{currentChallengeDay?.title || 'SQL Challenge'}</div>
                </div>
              )}
              {shareType === 'certificate' && (
                <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-lg p-4 text-center">
                  <div className="text-4xl mb-2">🏆</div>
                  <div className="text-xl font-bold text-purple-400">30-Day SQL Master</div>
                  <div className="text-gray-300 text-sm mt-1">Certificate of Completion</div>
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => downloadShareCard(shareType, shareType === 'day' ? (currentChallengeDay?.day || 1) : null)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-bold"
              >
                💾 Download Card
              </button>
              <button
                onClick={() => copyShareText(shareType)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-xl font-bold"
              >
                📋 Copy Text
              </button>
            </div>
            
            {/* Social Share Hint */}
            <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
              <p className="text-sm text-gray-400 text-center">
                💡 Download the card, then share on Twitter, LinkedIn, or your favorite platform!
              </p>
            </div>
            
            {/* Quick Social Links */}
            <div className="flex justify-center gap-4 mt-4">
              <a 
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                  shareType === 'progress' 
                    ? `🎯 I've completed ${Object.values(challengeProgress).filter(p => p?.completed).length}/30 days of the SQL Quest 30-Day Challenge!\n\n⚡ ${xp} XP earned\n\nJoin me! https://sql-quest2.vercel.app/\n\n#SQLQuest #LearnSQL #30DayChallenge`
                    : shareType === 'streak'
                    ? `🔥 ${streak} Day Streak on SQL Quest!\n\nLearning SQL one day at a time.\n\nTry it: https://sql-quest2.vercel.app/\n\n#SQLQuest #CodingStreak`
                    : shareType === 'certificate'
                    ? `🏆 I earned my SQL Quest 30-Day Master Certificate!\n\nStart your journey: https://sql-quest2.vercel.app/\n\n#SQLQuest #SQLMaster`
                    : `✅ Day ${currentChallengeDay?.day || 1} Complete on SQL Quest!\n\nStart learning: https://sql-quest2.vercel.app/\n\n#SQLQuest #LearnSQL`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#1DA1F2] hover:bg-[#1a8cd8] rounded-lg text-white font-medium text-sm"
              >
                🐦 Tweet
              </a>
              <a 
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://sql-quest2.vercel.app/')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#0A66C2] hover:bg-[#094d92] rounded-lg text-white font-medium text-sm"
              >
                💼 LinkedIn
              </a>
            </div>
          </div>
        </div>
      )}
      
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
            
            {(isDailyCompleted && !isDailyPracticeMode) ? (
              /* Detailed Completion Report */
              (() => {
                // Get today's completed challenge data
                const todayHistory = dailyChallengeHistory.find(h => h.date === todayString) || {};
                const solveTimeFormatted = todayHistory.solveTime ? formatTime(todayHistory.solveTime) : '--:--';
                const conceptsUsed = todayHistory.concepts || detectAllSqlConcepts(todaysChallenge.core?.solution) || [];
                const avgTime = todaysChallenge.avgSolveTime || 3;
                const wasFast = todayHistory.solveTime && todayHistory.solveTime < avgTime * 60;
                const wasHintUsed = todayHistory.hintUsed;
                const wasAnswerShown = todayHistory.answerShown;
                const warmupCorrect = todayHistory.warmupCorrect;
                const insightCorrect = todayHistory.insightCorrect;
                const xpEarned = todayHistory.xpEarned || 50;
                
                // Calculate score breakdown
                const scoreBreakdown = {
                  warmup: warmupCorrect ? 10 : 0,
                  core: wasAnswerShown ? 0 : (wasHintUsed ? 30 : 40),
                  insight: insightCorrect === true ? 10 : (insightCorrect === false ? 0 : 0),
                  speed: wasFast ? 5 : 0
                };
                const totalPossible = 65;
                const scorePercent = Math.round((xpEarned / totalPossible) * 100);
                
                // Concepts to study (based on the challenge topic)
                const relatedConcepts = {
                  'SELECT & WHERE': ['Filtering with AND/OR', 'NULL handling', 'LIKE patterns'],
                  'JOIN': ['INNER vs LEFT JOIN', 'Multiple table joins', 'Self joins'],
                  'GROUP BY': ['Aggregate functions', 'HAVING clause', 'GROUP BY multiple columns'],
                  'Subqueries': ['Correlated subqueries', 'IN vs EXISTS', 'Scalar subqueries'],
                  'CASE': ['CASE WHEN syntax', 'Nested CASE', 'CASE in aggregations'],
                  'Window Functions': ['ROW_NUMBER', 'RANK vs DENSE_RANK', 'LAG/LEAD', 'Running totals'],
                  'BETWEEN': ['Date ranges', 'Inclusive bounds', 'NOT BETWEEN'],
                  'Self JOIN': ['Employee-manager', 'Hierarchical data', 'Comparing rows'],
                  'UNION': ['UNION vs UNION ALL', 'Column alignment', 'Combining results'],
                  'HAVING': ['HAVING vs WHERE', 'Aggregate conditions', 'Multiple conditions'],
                  'ORDER BY': ['ASC/DESC', 'Multiple columns', 'NULL ordering'],
                  'NULL': ['IS NULL', 'COALESCE', 'IFNULL', 'NULL in comparisons'],
                  'EXISTS': ['EXISTS vs IN', 'NOT EXISTS', 'Correlated checks'],
                  'LAG/LEAD': ['Previous row', 'Next row', 'Offset values', 'Default values'],
                  'CTE': ['WITH clause', 'Multiple CTEs', 'Recursive CTEs'],
                  'RANK': ['RANK()', 'DENSE_RANK()', 'PARTITION BY', 'Top N per group'],
                  'Aggregates': ['COUNT', 'SUM', 'AVG', 'MIN/MAX', 'COUNT DISTINCT']
                };
                const topicsToStudy = relatedConcepts[todaysChallenge.topic] || ['Review SQL fundamentals'];
                
                return (
                  <div className="py-4">
                    {/* Header with celebration */}
                    <div className="text-center mb-6">
                      <div className="text-5xl mb-3">🎉</div>
                      <h3 className="text-2xl font-bold text-green-400 mb-1">Challenge Completed!</h3>
                      <p className="text-gray-400">Here's your performance breakdown</p>
                    </div>
                    
                    {/* Score Overview */}
                    <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-gray-400 text-sm">Total XP Earned</p>
                          <p className="text-3xl font-bold text-green-400">+{xpEarned} XP</p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-400 text-sm">Solve Time</p>
                          <p className="text-2xl font-mono text-yellow-400">{solveTimeFormatted}</p>
                          {wasFast && <p className="text-xs text-green-400">⚡ Faster than average!</p>}
                        </div>
                      </div>
                      
                      {/* Step Results */}
                      <div className="grid grid-cols-3 gap-2 mt-4">
                        <div className={`p-2 rounded-lg text-center ${warmupCorrect ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                          <p className="text-xs text-gray-400">Warm-up</p>
                          <p className={`font-bold ${warmupCorrect ? 'text-green-400' : 'text-red-400'}`}>
                            {warmupCorrect ? '✓' : '✗'}
                          </p>
                        </div>
                        <div className={`p-2 rounded-lg text-center ${wasAnswerShown ? 'bg-yellow-500/20' : wasHintUsed ? 'bg-blue-500/20' : 'bg-green-500/20'}`}>
                          <p className="text-xs text-gray-400">Challenge</p>
                          <p className={`font-bold ${wasAnswerShown ? 'text-yellow-400' : wasHintUsed ? 'text-blue-400' : 'text-green-400'}`}>
                            {wasAnswerShown ? '👁️' : wasHintUsed ? '💡' : '✓'}
                          </p>
                        </div>
                        <div className={`p-2 rounded-lg text-center ${insightCorrect === true ? 'bg-green-500/20' : insightCorrect === false ? 'bg-red-500/20' : 'bg-gray-700/50'}`}>
                          <p className="text-xs text-gray-400">Insight</p>
                          <p className={`font-bold ${insightCorrect === true ? 'text-green-400' : insightCorrect === false ? 'text-red-400' : 'text-gray-500'}`}>
                            {insightCorrect === true ? '✓' : insightCorrect === false ? '✗' : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Concepts Used */}
                    <div className="bg-gray-800/50 rounded-xl p-4 mb-4">
                      <h4 className="font-bold text-purple-400 mb-2 flex items-center gap-2">
                        <Code size={16} /> Concepts Practiced
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {conceptsUsed.length > 0 ? conceptsUsed.map((concept, i) => (
                          <span key={i} className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                            {concept}
                          </span>
                        )) : (
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                            {todaysChallenge.topic}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Topics to Study */}
                    <div className="bg-gray-800/50 rounded-xl p-4 mb-4">
                      <h4 className="font-bold text-blue-400 mb-2 flex items-center gap-2">
                        <BookOpen size={16} /> Related Topics to Explore
                      </h4>
                      <ul className="space-y-1">
                        {topicsToStudy.map((topic, i) => (
                          <li key={i} className="text-gray-300 text-sm flex items-center gap-2">
                            <span className="text-blue-400">→</span> {topic}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {/* Challenge Summary */}
                    <div className="bg-gray-800/50 rounded-xl p-4 mb-4">
                      <h4 className="font-bold text-gray-300 mb-2">📝 Challenge Summary</h4>
                      <p className="text-sm text-gray-400 mb-2"><strong>Title:</strong> {todaysChallenge.core?.title}</p>
                      <p className="text-sm text-gray-400 mb-2" dangerouslySetInnerHTML={{
                        __html: `<strong>Task:</strong> ${(todaysChallenge.core?.description || '').replace(/\*\*(.*?)\*\*/g, '<span class="text-yellow-400">$1</span>')}`
                      }} />
                      {todayHistory.userQuery && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">Your Solution:</p>
                          <pre className="bg-gray-900 p-2 rounded text-xs text-green-400 font-mono overflow-x-auto">{todayHistory.userQuery}</pre>
                        </div>
                      )}
                    </div>
                    
                    {/* Streak & Next Challenge */}
                    <div className="flex items-center justify-between p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl mb-4">
                      <div className="flex items-center gap-3">
                        <Flame size={24} className="text-orange-400" />
                        <div>
                          <p className="font-bold text-orange-400">{dailyStreak} day streak!</p>
                          <p className="text-xs text-gray-400">Keep it going!</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 text-sm">Next challenge in</p>
                        <p className="text-yellow-400 font-mono font-bold">{timeUntilReset.hours}h {timeUntilReset.minutes}m</p>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          // Reset daily challenge state for retry/practice
                          setDailyStep(0);
                          setWarmupAnswer(null);
                          setWarmupResult(null);
                          setInsightAnswer(null);
                          setInsightResult(null);
                          setCoreCompleted(false);
                          setDailyChallengeQuery('');
                          setDailyChallengeResult({ columns: [], rows: [], error: null });
                          setDailyChallengeStatus(null);
                          setDailyHintUsed(false);
                          setDailyAnswerShown(false);
                          setDailyTimer(0);
                          // Mark as practice mode (don't award XP again)
                          setCompletedDailyChallenges(prev => ({ ...prev, [todayString]: 'practice' }));
                        }}
                        className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold flex items-center justify-center gap-2"
                      >
                        🔄 Practice Again
                      </button>
                      <button
                        onClick={() => { setShareType('progress'); setShowShareModal(true); }}
                        className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-xl font-bold flex items-center justify-center gap-2"
                      >
                        📤 Share Progress
                      </button>
                    </div>
                  </div>
                );
              })()
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
                                    <td key={ci} className="py-1 px-2 text-gray-300">{formatCell(cell)}</td>
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
                    <p className="text-blue-400 text-sm mb-2">⏱️ Solved in {formatTime(dailySolveTime || dailyTimer)}</p>
                    <button onClick={() => {
                      if (todaysChallenge.insight) {
                        setDailyStep(2);
                        // Timer already stopped in submitDailyChallenge
                      } else {
                        // No insight check, complete directly
                        setDailyStep(3);
                        if (!isDailyCompleted && !isDailyPracticeMode) {
                          // Calculate XP: 0 if answer shown, -20% if hint used, full otherwise
                          const baseXP = 50;
                          const xpReward = dailyAnswerShown ? 0 : (dailyHintUsed ? Math.floor(baseXP * 0.8) : baseXP);
                          const newXP = xp + xpReward;
                          setXP(newXP);
                          const newCompleted = { ...completedDailyChallenges, [todayString]: true };
                          setCompletedDailyChallenges(newCompleted);
                          const newStreak = dailyStreak + 1;
                          setDailyStreak(newStreak);
                          
                          // Track daily challenge history with full details
                          const dailyHistory = {
                            date: todayString,
                            difficulty: selectedDailyDifficulty || todaysChallenge.difficulty,
                            topic: todaysChallenge.topic,
                            success: true,
                            warmupCorrect: warmupResult === 'correct',
                            coreCorrect: true,
                            insightCorrect: null, // No insight check
                            solveTime: dailySolveTime || dailyTimer,
                            hintUsed: dailyHintUsed,
                            answerShown: dailyAnswerShown,
                            xpEarned: xpReward,
                            // Enhanced details for review
                            challengeTitle: todaysChallenge.core?.title,
                            challengeDescription: todaysChallenge.core?.description,
                            userQuery: dailyChallengeQuery,
                            solution: todaysChallenge.core?.solution,
                            alternativeSolution: todaysChallenge.core?.alternativeSolution,
                            hint: todaysChallenge.core?.hint,
                            concepts: detectAllSqlConcepts(todaysChallenge.core?.solution),
                            dataset: todaysChallenge.core?.dataset,
                            warmup: todaysChallenge.warmup,
                            insight: todaysChallenge.insight
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
                          
                          // Update learning goals
                          updateGoalProgress('xp_earn', xpReward);
                          updateGoalProgress('daily_streak', 1);
                          updateGoalProgress('challenges_solve', 1);
                        } else if (isDailyPracticeMode) {
                          // Finished practicing - restore completed status to show report
                          setCompletedDailyChallenges(prev => ({ ...prev, [todayString]: true }));
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
                      if (!isDailyCompleted && !isDailyPracticeMode) {
                        // Calculate XP: 0 if answer shown, -20% if hint used, full otherwise
                        const baseXP = 50;
                        const xpReward = dailyAnswerShown ? 0 : (dailyHintUsed ? Math.floor(baseXP * 0.8) : baseXP);
                        const newXP = xp + xpReward;
                        setXP(newXP);
                        const newCompleted = { ...completedDailyChallenges, [todayString]: true };
                        setCompletedDailyChallenges(newCompleted);
                        const newStreak = dailyStreak + 1;
                        setDailyStreak(newStreak);
                        
                        // Track daily challenge history with full details
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
                          xpEarned: xpReward,
                          // Enhanced details for review
                          challengeTitle: todaysChallenge.core?.title,
                          challengeDescription: todaysChallenge.core?.description,
                          userQuery: dailyChallengeQuery,
                          solution: todaysChallenge.core?.solution,
                          alternativeSolution: todaysChallenge.core?.alternativeSolution,
                          hint: todaysChallenge.core?.hint,
                          concepts: detectAllSqlConcepts(todaysChallenge.core?.solution),
                          dataset: todaysChallenge.core?.dataset,
                          warmup: todaysChallenge.warmup,
                          insight: todaysChallenge.insight
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
                        
                        // Update learning goals
                        updateGoalProgress('xp_earn', xpReward);
                        updateGoalProgress('daily_streak', 1);
                        updateGoalProgress('challenges_solve', 1);
                      } else if (isDailyPracticeMode) {
                        // Finished practicing - restore completed status to show report
                        setCompletedDailyChallenges(prev => ({ ...prev, [todayString]: true }));
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => { setShowWeeklyReport(false); setSelectedChallengeReview(null); }}>
          <div className="bg-gray-900 rounded-2xl border border-blue-500/30 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            
            {/* Challenge Detail View */}
            {selectedChallengeReview ? (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <button onClick={() => setSelectedChallengeReview(null)} className="flex items-center gap-2 text-blue-400 hover:text-blue-300">
                    <ChevronLeft size={20} /> Back to Report
                  </button>
                  <button onClick={() => { setShowWeeklyReport(false); setSelectedChallengeReview(null); }} className="text-gray-400 hover:text-white text-2xl">×</button>
                </div>
                
                {/* Challenge Header */}
                <div className="bg-gray-800/50 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-bold text-yellow-400">{selectedChallengeReview.challengeTitle || selectedChallengeReview.topic}</h2>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      selectedChallengeReview.difficulty?.includes('Easy') ? 'bg-green-500/20 text-green-400' :
                      selectedChallengeReview.difficulty?.includes('Medium') ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>{selectedChallengeReview.difficulty}</span>
                  </div>
                  <p className="text-gray-400 text-sm">{selectedChallengeReview.date}</p>
                  <p className="text-gray-300 mt-2" dangerouslySetInnerHTML={{ __html: (selectedChallengeReview.challengeDescription || '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-yellow-300">$1</strong>') }} />
                </div>
                
                {/* Stats Row */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="bg-blue-500/20 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-blue-400">{formatTime(selectedChallengeReview.solveTime || 0)}</div>
                    <div className="text-xs text-gray-400">Solve Time</div>
                  </div>
                  <div className={`rounded-lg p-3 text-center ${selectedChallengeReview.xpEarned > 0 ? 'bg-yellow-500/20' : 'bg-gray-700/50'}`}>
                    <div className={`text-lg font-bold ${selectedChallengeReview.xpEarned > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>+{selectedChallengeReview.xpEarned || 0}</div>
                    <div className="text-xs text-gray-400">XP Earned</div>
                  </div>
                  <div className={`rounded-lg p-3 text-center ${selectedChallengeReview.hintUsed ? 'bg-orange-500/20' : 'bg-green-500/20'}`}>
                    <div className={`text-lg font-bold ${selectedChallengeReview.hintUsed ? 'text-orange-400' : 'text-green-400'}`}>{selectedChallengeReview.hintUsed ? 'Yes' : 'No'}</div>
                    <div className="text-xs text-gray-400">Hint Used</div>
                  </div>
                  <div className={`rounded-lg p-3 text-center ${selectedChallengeReview.answerShown ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                    <div className={`text-lg font-bold ${selectedChallengeReview.answerShown ? 'text-red-400' : 'text-green-400'}`}>{selectedChallengeReview.answerShown ? 'Yes' : 'No'}</div>
                    <div className="text-xs text-gray-400">Answer Shown</div>
                  </div>
                </div>
                
                {/* SQL Concepts Used */}
                {selectedChallengeReview.concepts && selectedChallengeReview.concepts.length > 0 && (
                  <div className="bg-purple-500/10 rounded-xl p-4 mb-4 border border-purple-500/30">
                    <h3 className="font-bold text-purple-400 mb-2">🧠 SQL Concepts in this Challenge</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedChallengeReview.concepts.map((concept, i) => (
                        <span key={i} className="px-2 py-1 bg-purple-500/30 rounded text-purple-300 text-sm">{concept}</span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Your Query vs Solution */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-800/50 rounded-xl p-4">
                    <h3 className="font-bold text-blue-400 mb-2">📝 Your Query</h3>
                    <pre className="bg-gray-900 p-3 rounded-lg text-sm text-blue-300 font-mono overflow-x-auto whitespace-pre-wrap">{selectedChallengeReview.userQuery || 'Not saved'}</pre>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4">
                    <h3 className="font-bold text-green-400 mb-2">✓ Solution</h3>
                    <pre className="bg-gray-900 p-3 rounded-lg text-sm text-green-300 font-mono overflow-x-auto whitespace-pre-wrap">{selectedChallengeReview.solution || 'Not available'}</pre>
                  </div>
                </div>
                
                {/* Alternative Solution */}
                {selectedChallengeReview.alternativeSolution && (
                  <div className="bg-gray-800/50 rounded-xl p-4 mb-4">
                    <h3 className="font-bold text-cyan-400 mb-2">🔄 Alternative Solution</h3>
                    <pre className="bg-gray-900 p-3 rounded-lg text-sm text-cyan-300 font-mono overflow-x-auto whitespace-pre-wrap">{selectedChallengeReview.alternativeSolution}</pre>
                  </div>
                )}
                
                {/* Hint */}
                {selectedChallengeReview.hint && (
                  <div className="bg-yellow-500/10 rounded-xl p-4 mb-4 border border-yellow-500/30">
                    <h3 className="font-bold text-yellow-400 mb-2">💡 Hint</h3>
                    <p className="text-yellow-200">{selectedChallengeReview.hint}</p>
                  </div>
                )}
                
                {/* 3-Step Results */}
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <h3 className="font-bold text-gray-300 mb-3">📊 Challenge Results</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className={`rounded-lg p-3 text-center ${selectedChallengeReview.warmupCorrect ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      <div className={`font-bold ${selectedChallengeReview.warmupCorrect ? 'text-green-400' : 'text-red-400'}`}>
                        {selectedChallengeReview.warmupCorrect ? '✓' : '✗'}
                      </div>
                      <div className="text-xs text-gray-400">Warmup</div>
                    </div>
                    <div className={`rounded-lg p-3 text-center ${selectedChallengeReview.coreCorrect ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      <div className={`font-bold ${selectedChallengeReview.coreCorrect ? 'text-green-400' : 'text-red-400'}`}>
                        {selectedChallengeReview.coreCorrect ? '✓' : '✗'}
                      </div>
                      <div className="text-xs text-gray-400">SQL Challenge</div>
                    </div>
                    <div className={`rounded-lg p-3 text-center ${
                      selectedChallengeReview.insightCorrect === null ? 'bg-gray-700/50' :
                      selectedChallengeReview.insightCorrect ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}>
                      <div className={`font-bold ${
                        selectedChallengeReview.insightCorrect === null ? 'text-gray-500' :
                        selectedChallengeReview.insightCorrect ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {selectedChallengeReview.insightCorrect === null ? '-' : selectedChallengeReview.insightCorrect ? '✓' : '✗'}
                      </div>
                      <div className="text-xs text-gray-400">Insight</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Main Report View */
              <div>
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
                  
                  // Concept breakdown from all challenges
                  const conceptPerf = {};
                  recentDaily.forEach(d => {
                    if (d.concepts) {
                      d.concepts.forEach(c => {
                        if (!conceptPerf[c]) conceptPerf[c] = { used: 0, success: 0 };
                        conceptPerf[c].used++;
                        if (d.coreCorrect) conceptPerf[c].success++;
                      });
                    }
                  });
                  
                  const conceptStats = Object.entries(conceptPerf)
                    .map(([concept, stats]) => ({
                      concept,
                      used: stats.used,
                      rate: stats.used > 0 ? Math.round((stats.success / stats.used) * 100) : 0
                    }))
                    .sort((a, b) => b.used - a.used)
                    .slice(0, 10);
                  
                  // Personal bests by difficulty
                  const personalBests = {};
                  recentDaily.forEach(d => {
                    const diff = d.difficulty || 'Unknown';
                    if (!personalBests[diff] || d.solveTime < personalBests[diff]) {
                      personalBests[diff] = d.solveTime;
                    }
                  });
                  
                  // Stats summary
                  const totalXP = recentDaily.reduce((sum, d) => sum + (d.xpEarned || 0), 0);
                  const avgSolveTime = recentDaily.length > 0 
                    ? Math.round(recentDaily.reduce((sum, d) => sum + (d.solveTime || 0), 0) / recentDaily.length)
                    : 0;
                  const hintsUsed = recentDaily.filter(d => d.hintUsed).length;
                  const noHelpChallenges = recentDaily.filter(d => !d.hintUsed && !d.answerShown).length;
                  
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
                      
                      {/* Personal Bests */}
                      {Object.keys(personalBests).length > 0 && (
                        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl p-4 border border-yellow-500/30">
                          <h3 className="font-bold text-yellow-400 mb-3 flex items-center gap-2">
                            <Trophy size={18} /> Personal Bests (This Week)
                          </h3>
                          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                            {Object.entries(personalBests).map(([diff, time]) => (
                              <div key={diff} className="bg-gray-800/50 rounded-lg p-3 text-center">
                                <div className="text-lg font-bold text-yellow-400">{formatTime(time || 0)}</div>
                                <div className="text-xs text-gray-400">{diff}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* SQL Concepts Breakdown */}
                      {conceptStats.length > 0 && (
                        <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/30">
                          <h3 className="font-bold text-purple-400 mb-3 flex items-center gap-2">
                            🧠 SQL Concepts Practiced
                          </h3>
                          <div className="grid grid-cols-2 gap-2">
                            {conceptStats.map(c => (
                              <div key={c.concept} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2">
                                <span className="text-gray-300 text-sm">{c.concept}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500 text-xs">×{c.used}</span>
                                  <span className={`text-sm font-medium ${c.rate >= 70 ? 'text-green-400' : c.rate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                    {c.rate}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
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
                      
                      {/* Recent Daily Challenges - Clickable for details */}
                      {recentDaily.length > 0 && (
                        <div className="bg-gray-800/50 rounded-xl p-4">
                          <h3 className="font-bold text-gray-300 mb-2">Recent Daily Challenges</h3>
                          <p className="text-xs text-gray-500 mb-3">Click on a challenge to see details</p>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {recentDaily.slice().reverse().map((d, i) => (
                              <div 
                                key={i} 
                                onClick={() => setSelectedChallengeReview(d)}
                                className="flex items-center justify-between text-sm py-3 px-3 border border-gray-700 rounded-lg cursor-pointer hover:bg-gray-700/50 hover:border-blue-500/50 transition-all"
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <span className="text-gray-500 w-24">{d.date}</span>
                                  <span className="text-gray-300 flex-1">{d.challengeTitle || d.topic}</span>
                                  <span className={`px-2 py-0.5 rounded text-xs ${
                                    d.difficulty?.includes('Easy') ? 'bg-green-500/20 text-green-400' :
                                    d.difficulty?.includes('Medium') ? 'bg-yellow-500/20 text-yellow-400' :
                                    'bg-red-500/20 text-red-400'
                                  }`}>{d.difficulty}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  {d.concepts && d.concepts.length > 0 && (
                                    <span className="text-purple-400 text-xs">{d.concepts.length} concepts</span>
                                  )}
                                  <span className="text-gray-400 w-12">{formatTime(d.solveTime || 0)}</span>
                                  <span className={`font-medium w-16 text-right ${d.xpEarned > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>+{d.xpEarned || 0} XP</span>
                                  <ChevronRight size={16} className="text-gray-500" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Interview Mistakes to Review */}
                      {interviewHistory.length > 0 && interviewHistory.some(h => h.mistakes && h.mistakes.length > 0) && (
                        <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
                          <h3 className="font-bold text-red-400 mb-3 flex items-center gap-2">
                            💼 Interview Questions to Review
                          </h3>
                          <div className="space-y-2">
                            {interviewHistory.slice().reverse()
                              .filter(h => h.mistakes && h.mistakes.some(m => !h.studiedMistakes?.includes(m.questionTitle)))
                              .slice(0, 3)
                              .map((result, ri) => (
                                <div key={ri} className="bg-gray-800/50 rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-300">{result.interviewTitle}</span>
                                    <span className="text-xs text-gray-500">{result.date}</span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {result.mistakes.filter(m => !result.studiedMistakes?.includes(m.questionTitle)).map((mistake, mi) => (
                                      <button
                                        key={mi}
                                        onClick={() => {
                                          studyTopicWithAI(mistake.questionTitle);
                                          setShowWeeklyReport(false);
                                        }}
                                        className="text-xs px-2 py-1 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30 hover:scale-105 transition-all flex items-center gap-1"
                                        title={`Click to learn about ${mistake.questionTitle}`}
                                      >
                                        🤖 {mistake.questionTitle}
                                      </button>
                                    ))}
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
                      
                      {/* Weekly Achievements */}
                      {recentDaily.length > 0 && (
                        <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700">
                          <h3 className="font-bold text-gray-300 mb-3 flex items-center gap-2">
                            <Award size={18} className="text-yellow-400" /> This Week's Achievements
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {noHelpChallenges > 0 && (
                              <span className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-full text-sm">
                                🎯 {noHelpChallenges} solved without help
                              </span>
                            )}
                            {recentDaily.some(d => d.difficulty?.includes('Hard')) && (
                              <span className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-full text-sm">
                                🔥 Completed Hard challenge!
                              </span>
                            )}
                            {dailyStreak >= 3 && (
                              <span className="px-3 py-1.5 bg-orange-500/20 text-orange-400 rounded-full text-sm">
                                🔥 {dailyStreak} day streak!
                              </span>
                            )}
                            {avgSolveTime > 0 && avgSolveTime < 120 && (
                              <span className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-full text-sm">
                                ⚡ Avg under 2 min!
                              </span>
                            )}
                            {conceptStats.length >= 5 && (
                              <span className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-full text-sm">
                                🧠 {conceptStats.length} concepts practiced
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Interview Modal */}
      {activeInterview && !interviewCompleted && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-purple-500/30 w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
            {/* Interview Header */}
            <div className={`bg-gray-800/50 p-4 border-b border-gray-700 ${!practiceMode && timerWarning === 'red' ? 'animate-pulse bg-red-900/30' : ''} ${practiceMode ? 'bg-gradient-to-r from-cyan-900/30 to-blue-900/30' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold">
                    {activeInterview.title} 
                    {retryMode && <span className="text-yellow-400 text-sm ml-2">(Retry Mode)</span>}
                    {practiceMode && <span className="text-cyan-400 text-sm ml-2">🧘 Practice Mode</span>}
                  </h2>
                  <span className="text-gray-400">Q{interviewQuestion + 1}/{activeInterview.questions.length}</span>
                </div>
                <div className="flex items-center gap-4">
                  {practiceMode ? (
                    /* Practice Mode - No timer pressure */
                    <div className="px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      ♾️ No Time Limit
                    </div>
                  ) : (
                    <>
                      {/* Question Timer with Warning */}
                      <div className={`px-3 py-1 rounded-lg font-mono transition-all ${
                        timerWarning === 'red' 
                          ? 'bg-red-500/30 text-red-400 border border-red-500 scale-110 animate-pulse' 
                          : timerWarning === 'yellow'
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                            : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        ⏱️ {formatTime(activeInterview.questions[interviewQuestion]?.timeLimit - interviewTimer)}
                        {timerWarning === 'red' && <span className="ml-1">⚠️</span>}
                      </div>
                      {/* Total Timer */}
                      <div className="px-3 py-1 bg-gray-700 rounded-lg text-gray-300 font-mono">
                        Total: {formatTime(activeInterview.totalTime - interviewTotalTimer)}
                      </div>
                    </>
                  )}
                  <button
                    onClick={() => {
                      if (practiceMode || confirm('Are you sure you want to quit? Your progress will be saved.')) {
                        closeInterview();
                      }
                    }}
                    className="text-gray-400 hover:text-red-400"
                  >
                    ✕ Quit
                  </button>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-3 flex gap-1">
                {activeInterview.questions.map((q, i) => (
                  <div
                    key={i}
                    className={`h-2 flex-1 rounded ${
                      i < interviewQuestion 
                        ? (interviewAnswers[i]?.correct ? 'bg-green-500' : (practiceMode ? 'bg-cyan-500' : 'bg-red-500'))
                        : i === interviewQuestion 
                          ? (practiceMode ? 'bg-cyan-500' : 'bg-purple-500')
                          : 'bg-gray-700'
                    }`}
                  />
                ))}
              </div>
            </div>
            
            {/* Interview Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {(() => {
                const currentQ = activeInterview.questions[interviewQuestion];
                
                // Get table schema for current question's dataset
                const datasetInfo = publicDatasets[currentQ.dataset];
                const usedTables = extractTablesFromSql(currentQ.solution, datasetInfo?.tables);
                
                return (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                    {/* Left: Question */}
                    <div className="space-y-4">
                      <div className="bg-gray-800/50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-bold text-purple-400">
                            Question {currentQ.order}: {currentQ.title}
                          </h3>
                          <span className={`px-2 py-1 rounded text-xs ${
                            currentQ.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                            currentQ.difficulty.includes('Medium') ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {currentQ.difficulty} • {currentQ.points} pts
                          </span>
                        </div>
                        <p className="text-gray-300" dangerouslySetInnerHTML={{ 
                          __html: currentQ.description.replace(/\*\*(.*?)\*\*/g, '<strong class="text-yellow-300">$1</strong>') 
                        }} />
                      </div>
                      
                      {/* Table Schema Reference */}
                      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
                        <h4 className="text-sm font-bold text-cyan-400 mb-3 flex items-center gap-2">
                          <Database size={16} /> Available Tables & Columns
                        </h4>
                        <div className="space-y-3 max-h-40 overflow-y-auto">
                          {datasetInfo && usedTables.length > 0 ? (
                            usedTables.map(tableName => {
                              const tableInfo = datasetInfo.tables[tableName];
                              return (
                                <div key={tableName} className="bg-gray-800/50 rounded-lg p-2">
                                  <p className="text-xs text-cyan-300 font-mono font-bold mb-1">{tableName}</p>
                                  <div className="flex flex-wrap gap-1">
                                    {tableInfo?.columns?.map((col, i) => (
                                      <span key={i} className="text-xs px-1.5 py-0.5 bg-gray-700 rounded text-gray-300 font-mono">{col}</span>
                                    ))}
                                  </div>
                                </div>
                              );
                            })
                          ) : datasetInfo ? (
                            Object.entries(datasetInfo.tables).slice(0, 2).map(([tableName, tableInfo]) => (
                              <div key={tableName} className="bg-gray-800/50 rounded-lg p-2">
                                <p className="text-xs text-cyan-300 font-mono font-bold mb-1">{tableName}</p>
                                <div className="flex flex-wrap gap-1">
                                  {tableInfo?.columns?.map((col, i) => (
                                    <span key={i} className="text-xs px-1.5 py-0.5 bg-gray-700 rounded text-gray-300 font-mono">{col}</span>
                                  ))}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-500 text-sm">Loading tables...</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Expected Output Preview - Using precomputed state */}
                      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                        <h4 className="text-sm font-bold text-green-400 mb-2 flex items-center gap-2">
                          🎯 Expected Output Preview
                        </h4>
                        {interviewExpectedOutput.rows.length > 0 ? (
                          <div className="overflow-x-auto max-h-32">
                            <table className="w-full text-xs font-mono">
                              <thead>
                                <tr className="border-b border-green-500/30">
                                  {interviewExpectedOutput.columns.map((col, i) => (
                                    <th key={i} className="text-left py-1 px-2 text-green-300">{col}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {interviewExpectedOutput.rows.slice(0, 3).map((row, ri) => (
                                  <tr key={ri} className="border-b border-gray-800">
                                    {row.map((cell, ci) => (
                                      <td key={ci} className="py-1 px-2 text-gray-300">{formatCell(cell)}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {interviewExpectedOutput.rows.length > 3 && (
                              <p className="text-xs text-gray-500 mt-1">...and {interviewExpectedOutput.rows.length - 3} more row(s)</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-xs">Loading expected output...</p>
                        )}
                      </div>
                      
                      {/* Hints */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <button
                          onClick={useInterviewHint}
                          disabled={interviewHintsUsed.filter(h => h === interviewQuestion).length >= currentQ.hints.length}
                          className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          💡 Hint ({interviewHintsUsed.filter(h => h === interviewQuestion).length}/{currentQ.hints.length})
                          {!practiceMode && <span className="text-xs ml-1 text-yellow-500">(-15% pts)</span>}
                        </button>
                        
                        {/* Practice Mode: Show Solution Button */}
                        {practiceMode && (
                          <button
                            onClick={() => setShowSolution(!showSolution)}
                            className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 ${
                              showSolution 
                                ? 'bg-cyan-500/30 border border-cyan-500 text-cyan-300' 
                                : 'bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-400'
                            }`}
                          >
                            {showSolution ? '🙈 Hide Solution' : '👀 Show Solution'}
                          </button>
                        )}
                        
                        <span className="text-xs text-gray-500">
                          Concepts: {currentQ.concepts.join(', ')}
                        </span>
                      </div>
                      
                      {showInterviewHint && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                          <p className="text-yellow-300 text-sm">
                            💡 {currentQ.hints[Math.min(interviewHintsUsed.filter(h => h === interviewQuestion).length - 1, currentQ.hints.length - 1)]}
                          </p>
                        </div>
                      )}
                      
                      {/* Practice Mode: Solution Display */}
                      {practiceMode && showSolution && (
                        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
                          <p className="text-xs text-cyan-400 mb-2">✨ Solution:</p>
                          <pre className="text-cyan-300 text-sm font-mono bg-black/30 p-2 rounded overflow-x-auto">
                            {currentQ.solution}
                          </pre>
                        </div>
                      )}
                      
                      {/* Query Editor */}
                      <div>
                        <label className="text-sm text-gray-400 mb-2 block">Your SQL Query:</label>
                        <textarea
                          value={interviewQuery}
                          onChange={(e) => setInterviewQuery(e.target.value)}
                          placeholder="Write your SQL query here..."
                          className={`w-full h-32 bg-gray-900 border rounded-lg p-3 text-green-400 font-mono text-sm focus:outline-none resize-none ${
                            practiceMode ? 'border-cyan-700 focus:border-cyan-500' : 'border-gray-700 focus:border-purple-500'
                          }`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                              runInterviewQuery();
                            }
                          }}
                        />
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <button
                            onClick={runInterviewQuery}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium flex items-center gap-2"
                          >
                            <Play size={16} /> Run (Ctrl+Enter)
                          </button>
                          <button
                            onClick={() => submitInterviewAnswer()}
                            disabled={!interviewQuery.trim()}
                            className={`px-4 py-2 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-medium flex items-center gap-2 ${
                              practiceMode 
                                ? 'bg-cyan-600 hover:bg-cyan-700' 
                                : 'bg-green-600 hover:bg-green-700'
                            }`}
                          >
                            <CheckCircle size={16} /> {practiceMode ? 'Check Answer' : 'Submit Answer'}
                          </button>
                          <button
                            onClick={() => {
                              setShowSolution(false);
                              submitInterviewAnswer(true);
                            }}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300"
                          >
                            {practiceMode ? 'Next Question →' : 'Skip →'}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right: Results */}
                    <div className="space-y-4">
                      {interviewResult.error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                          <p className="text-red-400 font-mono text-sm">{interviewResult.error}</p>
                        </div>
                      )}
                      
                      {interviewResult.rows.length > 0 && (
                        <div className="bg-gray-800/50 rounded-xl p-4">
                          <p className="text-sm text-gray-400 mb-2">Query Result ({interviewResult.rows.length} rows)</p>
                          <div className="overflow-x-auto max-h-64">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-gray-700">
                                  {interviewResult.columns.map((col, i) => (
                                    <th key={i} className="text-left py-2 px-3 text-purple-400">{col}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {interviewResult.rows.slice(0, 10).map((row, i) => (
                                  <tr key={i} className="border-b border-gray-800">
                                    {row.map((cell, j) => (
                                      <td key={j} className="py-2 px-3 text-gray-300">{formatCell(cell)}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {interviewResult.rows.length > 10 && (
                              <p className="text-xs text-gray-500 mt-2">Showing 10 of {interviewResult.rows.length} rows</p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {interviewResult.rows.length === 0 && !interviewResult.error && interviewQuery.trim() && (
                        <div className="bg-gray-800/50 rounded-xl p-4 text-center text-gray-400">
                          Click "Run" to test your query
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Interview Results Modal */}
      {interviewCompleted && interviewResults && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-purple-500/30 w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">
                {interviewResults.passed ? '🎉' : '💪'}
              </div>
              <h2 className={`text-3xl font-bold ${interviewResults.passed ? 'text-green-400' : 'text-yellow-400'}`}>
                {interviewResults.passed ? 'Interview Passed!' : 'Keep Practicing!'}
              </h2>
              <p className="text-gray-400 mt-2">{activeInterview?.title}</p>
            </div>
            
            {/* Score Summary */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                <div className={`text-3xl font-bold ${interviewResults.passed ? 'text-green-400' : 'text-yellow-400'}`}>
                  {interviewResults.percentage}%
                </div>
                <div className="text-xs text-gray-400">Final Score</div>
                <div className="text-xs text-gray-500">Pass: {interviewResults.passingScore}%</div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-blue-400">
                  {formatTime(interviewResults.timeUsed)}
                </div>
                <div className="text-xs text-gray-400">Time Used</div>
                <div className="text-xs text-gray-500">of {formatTime(interviewResults.totalTime)}</div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-green-400">
                  {interviewResults.questionsCorrect}
                </div>
                <div className="text-xs text-gray-400">Correct</div>
                <div className="text-xs text-gray-500">of {interviewResults.questionsTotal}</div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-red-400">
                  {interviewResults.mistakes?.length || 0}
                </div>
                <div className="text-xs text-gray-400">Mistakes</div>
                <div className="text-xs text-gray-500">to review</div>
              </div>
            </div>
            
            {/* XP Award */}
            {!practiceMode && (
              <div className={`rounded-xl p-4 mb-6 text-center ${interviewResults.passed ? 'bg-green-500/20 border border-green-500/30' : 'bg-yellow-500/20 border border-yellow-500/30'}`}>
                <span className={`text-2xl font-bold ${interviewResults.passed ? 'text-green-400' : 'text-yellow-400'}`}>
                  +{interviewResults.passed ? 100 : 25} XP
                </span>
                <span className="text-gray-400 ml-2">
                  {interviewResults.passed ? 'Interview Passed!' : 'For completing the interview'}
                </span>
              </div>
            )}
            
            {/* Practice Mode Notice */}
            {practiceMode && (
              <div className="rounded-xl p-4 mb-6 text-center bg-cyan-500/20 border border-cyan-500/30">
                <span className="text-lg text-cyan-400">
                  🧘 Practice Mode - No XP awarded, but great learning!
                </span>
              </div>
            )}
            
            {/* Peer Comparison - only for timed interviews */}
            {!practiceMode && (() => {
              const peerStats = getPeerComparison(interviewResults.interviewId);
              if (!peerStats) return null;
              const percentile = calculatePercentile(interviewResults.percentage, peerStats.avgScore);
              const fasterThanAvg = interviewResults.timeUsed < peerStats.avgTime;
              
              return (
                <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-xl p-4 mb-6">
                  <h3 className="font-bold text-purple-400 mb-3 flex items-center gap-2">
                    👥 How You Compare
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${percentile >= 50 ? 'text-green-400' : 'text-yellow-400'}`}>
                        Top {100 - percentile}%
                      </div>
                      <div className="text-xs text-gray-400">
                        Better than {percentile}% of users
                      </div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${interviewResults.percentage >= peerStats.avgScore ? 'text-green-400' : 'text-yellow-400'}`}>
                        {interviewResults.percentage >= peerStats.avgScore ? '+' : ''}{interviewResults.percentage - peerStats.avgScore}%
                      </div>
                      <div className="text-xs text-gray-400">
                        vs avg score ({peerStats.avgScore}%)
                      </div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${fasterThanAvg ? 'text-green-400' : 'text-blue-400'}`}>
                        {fasterThanAvg ? '⚡ Faster' : '🐢 Slower'}
                      </div>
                      <div className="text-xs text-gray-400">
                        Avg time: {formatTime(peerStats.avgTime)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-center text-sm text-gray-500">
                    Based on {peerStats.totalAttempts.toLocaleString()} attempts • {peerStats.passRate}% pass rate
                  </div>
                </div>
              );
            })()}
            
            {/* Mistakes to Review */}
            {interviewResults.mistakes && interviewResults.mistakes.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
                <h3 className="font-bold text-red-400 mb-3 flex items-center gap-2">
                  ❌ Questions to Review ({interviewResults.mistakes.length})
                </h3>
                <div className="space-y-3">
                  {interviewResults.mistakes.map((mistake, i) => (
                    <div key={i} className="bg-gray-800/50 rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 
                            className="font-medium text-gray-200 hover:text-blue-400 cursor-pointer transition-colors"
                            onClick={() => studyTopicWithAI(mistake.questionTitle)}
                            title={`Click to learn about ${mistake.questionTitle}`}
                          >
                            📚 {mistake.questionTitle}
                          </h4>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {mistake.concepts?.map((c, j) => (
                              <span 
                                key={j} 
                                className="text-xs px-1.5 py-0.5 bg-purple-500/30 text-purple-300 rounded cursor-pointer hover:bg-purple-500/50 transition-all"
                                onClick={() => studyTopicWithAI(c)}
                                title={`Click to learn about ${c}`}
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => studyTopicWithAI(mistake.questionTitle)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium flex items-center gap-1"
                        >
                          🤖 Study with AI
                        </button>
                      </div>
                      
                      {/* Show user's answer vs correct */}
                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                        <div className="bg-gray-900/50 rounded p-2">
                          <p className="text-gray-500 mb-1">Your Answer:</p>
                          <pre className="text-red-300 font-mono whitespace-pre-wrap">{mistake.userQuery || '(No answer)'}</pre>
                        </div>
                        <div className="bg-gray-900/50 rounded p-2">
                          <p className="text-gray-500 mb-1">Correct Solution:</p>
                          <pre className="text-green-300 font-mono whitespace-pre-wrap">{mistake.correctSolution}</pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Question Breakdown */}
            <div className="bg-gray-800/30 rounded-xl p-4 mb-6">
              <h3 className="font-bold mb-4">Question Breakdown</h3>
              <div className="space-y-2">
                {interviewResults.questionResults.map((qr, i) => {
                  return (
                    <div key={i} className="flex items-center justify-between py-2 px-3 bg-gray-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${qr.correct ? 'bg-green-500/30 text-green-400' : 'bg-red-500/30 text-red-400'}`}>
                          {qr.correct ? '✓' : '✗'}
                        </span>
                        <span className="text-gray-300">Q{i + 1}: {qr.questionTitle}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          qr.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                          qr.difficulty?.includes('Medium') ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>{qr.difficulty}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        {qr.timedOut && <span className="text-xs text-red-400">Timed out</span>}
                        {qr.hintsUsed > 0 && <span className="text-xs text-yellow-400">{qr.hintsUsed} hint(s)</span>}
                        <span className="text-gray-400 text-sm">{formatTime(qr.timeUsed)}</span>
                        <span className={`font-medium ${qr.correct ? 'text-green-400' : 'text-gray-500'}`}>
                          {qr.score}/{qr.maxScore}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-4 flex-wrap">
              {/* Share & Certificate buttons - only for passed interviews */}
              {interviewResults.passed && !practiceMode && (
                <>
                  <button
                    onClick={() => openShareModal(interviewResults)}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    📤 Share Result
                  </button>
                  <button
                    onClick={() => openCertificateModal(interviewResults)}
                    className="flex-1 py-3 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 rounded-xl font-bold flex items-center justify-center gap-2 text-black"
                  >
                    🎓 Get Certificate
                  </button>
                </>
              )}
              
              {/* Retry Failed Questions Only - only show if there are mistakes */}
              {interviewResults.mistakes && interviewResults.mistakes.length > 0 && !retryMode && (
                <button
                  onClick={() => startRetryMode(interviewResults)}
                  className="flex-1 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  🎯 Retry {interviewResults.mistakes.length} Failed Question{interviewResults.mistakes.length > 1 ? 's' : ''}
                </button>
              )}
              <button
                onClick={() => {
                  setRetryMode(false);
                  setRetryQuestions([]);
                  restartInterview(mockInterviews.find(i => i.id === interviewResults.interviewId) || activeInterview);
                }}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                🔄 {retryMode ? 'Full Interview' : 'Retry Interview'}
              </button>
              <button
                onClick={() => {
                  setRetryMode(false);
                  setRetryQuestions([]);
                  closeInterview(false);
                }}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold"
              >
                Back to Interviews
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interview Analytics Modal */}
      {showInterviewAnalytics && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowInterviewAnalytics(false)}>
          <div className="bg-gray-900 rounded-2xl border border-purple-500/30 w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            {(() => {
              const analytics = getInterviewAnalytics();
              
              return (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      📊 Interview Performance Analytics
                    </h2>
                    <button onClick={() => setShowInterviewAnalytics(false)} className="text-gray-400 hover:text-white text-2xl">✕</button>
                  </div>
                  
                  {analytics.totalAttempts === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-5xl mb-4">📝</div>
                      <h3 className="text-xl font-bold text-gray-400 mb-2">No interview data yet</h3>
                      <p className="text-gray-500">Complete some interviews to see your performance analytics!</p>
                    </div>
                  ) : (
                    <>
                      {/* Overview Stats */}
                      <div className="grid grid-cols-4 gap-4 mb-6">
                        <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl p-4 text-center border border-blue-500/30">
                          <div className="text-3xl font-bold text-blue-400">{analytics.totalAttempts}</div>
                          <div className="text-sm text-gray-400">Total Attempts</div>
                        </div>
                        <div className="bg-gradient-to-br from-green-500/20 to-cyan-500/20 rounded-xl p-4 text-center border border-green-500/30">
                          <div className="text-3xl font-bold text-green-400">{analytics.passRate}%</div>
                          <div className="text-sm text-gray-400">Pass Rate</div>
                        </div>
                        <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-4 text-center border border-yellow-500/30">
                          <div className="text-3xl font-bold text-yellow-400">{analytics.avgScore}%</div>
                          <div className="text-sm text-gray-400">Avg Score</div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-4 text-center border border-purple-500/30">
                          <div className="text-3xl font-bold text-purple-400">{formatTime(analytics.totalTime)}</div>
                          <div className="text-sm text-gray-400">Total Time</div>
                        </div>
                      </div>
                      
                      {/* SQL Concept Performance */}
                      <div className="mb-6">
                        <h3 className="font-bold mb-3 flex items-center gap-2">
                          💡 SQL Concept Performance
                        </h3>
                        <div className="bg-gray-800/50 rounded-xl p-4">
                          {Object.keys(analytics.conceptPerformance).length > 0 ? (
                            <div className="grid grid-cols-2 gap-3">
                              {Object.entries(analytics.conceptPerformance)
                                .sort((a, b) => b[1].percentage - a[1].percentage)
                                .map(([concept, data]) => (
                                  <div key={concept} className="flex items-center gap-3">
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-gray-300">{concept}</span>
                                        <span className={`text-sm font-medium ${
                                          data.percentage >= 80 ? 'text-green-400' :
                                          data.percentage >= 60 ? 'text-yellow-400' :
                                          'text-red-400'
                                        }`}>
                                          {data.percentage}% ({data.correct}/{data.total})
                                        </span>
                                      </div>
                                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                        <div 
                                          className={`h-full rounded-full transition-all ${
                                            data.percentage >= 80 ? 'bg-green-500' :
                                            data.percentage >= 60 ? 'bg-yellow-500' :
                                            'bg-red-500'
                                          }`}
                                          style={{ width: `${data.percentage}%` }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm">No concept data available yet</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Improvement Trend */}
                      {analytics.improvementTrend.length > 1 && (
                        <div className="mb-6">
                          <h3 className="font-bold mb-3 flex items-center gap-2">
                            📈 Score Trend (Last {analytics.improvementTrend.length} Attempts)
                          </h3>
                          <div className="bg-gray-800/50 rounded-xl p-4">
                            <div className="flex items-end gap-2 h-32">
                              {analytics.improvementTrend.map((item, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                                  <div 
                                    className={`w-full rounded-t transition-all ${
                                      item.score >= 70 ? 'bg-green-500' :
                                      item.score >= 50 ? 'bg-yellow-500' :
                                      'bg-red-500'
                                    }`}
                                    style={{ height: `${Math.max(item.score, 5)}%` }}
                                  />
                                  <span className="text-xs text-gray-500 mt-1">{item.score}%</span>
                                </div>
                              ))}
                            </div>
                            {/* Trend indicator */}
                            {analytics.improvementTrend.length >= 3 && (
                              <div className="mt-3 text-center">
                                {(() => {
                                  const recent = analytics.improvementTrend.slice(-3);
                                  const trend = recent[2].score - recent[0].score;
                                  if (trend > 10) return <span className="text-green-400">📈 Great improvement! +{trend}% over last 3 attempts</span>;
                                  if (trend > 0) return <span className="text-green-400">↗️ Slight improvement +{trend}%</span>;
                                  if (trend < -10) return <span className="text-red-400">📉 Scores dropping. Consider reviewing weak areas.</span>;
                                  return <span className="text-gray-400">→ Scores are stable</span>;
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Recent Performance */}
                      <div>
                        <h3 className="font-bold mb-3 flex items-center gap-2">
                          🕐 Recent Interviews
                        </h3>
                        <div className="space-y-2">
                          {analytics.recentPerformance.map((result, i) => (
                            <div key={i} className="bg-gray-800/50 rounded-lg p-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className={`text-xl ${result.passed ? '✅' : '❌'}`}></span>
                                <div>
                                  <div className="font-medium text-gray-200">{result.title}</div>
                                  <div className="text-xs text-gray-500">
                                    {result.date ? new Date(result.date).toLocaleDateString() : 'Unknown date'} • {formatTime(result.timeUsed)} • {result.mistakeCount} mistake{result.mistakeCount !== 1 ? 's' : ''}
                                  </div>
                                </div>
                              </div>
                              <div className={`text-xl font-bold ${
                                result.score >= 80 ? 'text-green-400' :
                                result.score >= 60 ? 'text-yellow-400' :
                                'text-red-400'
                              }`}>
                                {result.score}%
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  
                  <button
                    onClick={() => setShowInterviewAnalytics(false)}
                    className="w-full mt-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold"
                  >
                    Close
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Pro Upgrade Modal */}
      {showProModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowProModal(false)}>
          <div className="bg-gray-900 rounded-2xl border border-purple-500/30 w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            {!userProStatus ? (
              <>
                <div className="text-center mb-6">
                  <div className="text-5xl mb-4">⭐</div>
                  <h2 className="text-2xl font-bold text-purple-400">Upgrade to Pro</h2>
                  <p className="text-gray-400 mt-2">Unlock unlimited mock interviews and ace your SQL interviews!</p>
                </div>
                
                {/* Features */}
                <div className="bg-gray-800/50 rounded-xl p-4 mb-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-green-400" size={20} />
                    <span>Unlimited mock interviews</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-green-400" size={20} />
                    <span>All difficulty levels (Easy to FAANG)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-green-400" size={20} />
                    <span>Detailed performance analytics</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-green-400" size={20} />
                    <span>Study mistakes with AI Tutor</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-green-400" size={20} />
                    <span>New interviews added monthly</span>
                  </div>
                </div>
                
                {/* Pricing Options */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    onClick={() => upgradeToProMock(false)}
                    className="bg-gray-800/50 rounded-xl p-4 border-2 border-transparent hover:border-purple-500/50 text-left transition-all"
                  >
                    <div className="text-xl font-bold text-purple-400">$9.99/mo</div>
                    <div className="text-sm text-gray-400">Monthly</div>
                    <div className="text-xs text-gray-500 mt-1">Auto-renews monthly</div>
                  </button>
                  <button
                    onClick={() => upgradeToProMock(true)}
                    className="bg-purple-500/20 rounded-xl p-4 border-2 border-purple-500/50 text-left relative transition-all hover:bg-purple-500/30"
                  >
                    <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-green-500 rounded text-xs font-bold text-black">
                      BEST VALUE
                    </div>
                    <div className="text-xl font-bold text-purple-400">$49.99</div>
                    <div className="text-sm text-gray-400">Lifetime</div>
                    <div className="text-xs text-gray-500 mt-1">One-time payment</div>
                  </button>
                </div>
                
                <p className="text-center text-xs text-gray-500 mb-4">
                  Demo mode: Click a plan to unlock Pro features for free
                </p>
                
                <button
                  onClick={() => setShowProModal(false)}
                  className="w-full py-2 text-gray-400 hover:text-white"
                >
                  Maybe later
                </button>
              </>
            ) : (
              /* Subscription Management for Pro Users */
              <>
                <div className="text-center mb-6">
                  <div className="text-5xl mb-4">⭐</div>
                  <h2 className="text-2xl font-bold text-purple-400">Pro Subscription</h2>
                  <p className="text-green-400 mt-2">You're a Pro member!</p>
                </div>
                
                {/* Subscription Info */}
                <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-400">Status</span>
                    <span className="text-green-400 font-bold">Active</span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-400">Plan</span>
                    <span className="text-purple-400">
                      {proType === 'lifetime' ? 'Lifetime' : 'Monthly'}
                    </span>
                  </div>
                  {proExpiry && (
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-gray-400">
                        {proType === 'lifetime' ? 'Valid Until' : (proAutoRenew ? 'Renews On' : 'Expires On')}
                      </span>
                      <span className="text-gray-300">
                        {proType === 'lifetime' ? 'Forever' : new Date(proExpiry).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {proType !== 'lifetime' && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Auto-Renew</span>
                      <button
                        onClick={() => proAutoRenew ? cancelProSubscription() : reactivateProSubscription()}
                        className={`px-3 py-1 rounded text-sm ${proAutoRenew ? 'bg-green-500/20 text-green-400' : 'bg-gray-600 text-gray-400'}`}
                      >
                        {proAutoRenew ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Cancel/Downgrade Info */}
                {proType !== 'lifetime' && !proAutoRenew && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
                    <p className="text-yellow-400 text-sm">
                      ⚠️ Your subscription will not renew. You'll have Pro access until {new Date(proExpiry).toLocaleDateString()}.
                    </p>
                    <button
                      onClick={reactivateProSubscription}
                      className="mt-2 text-sm text-purple-400 hover:text-purple-300"
                    >
                      Reactivate auto-renew
                    </button>
                  </div>
                )}
                
                <button
                  onClick={() => setShowProModal(false)}
                  className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Interview History Review Modal */}
      {showInterviewReview && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowInterviewReview(null)}>
          <div className="bg-gray-900 rounded-2xl border border-purple-500/30 w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-purple-400">📊 Interview History</h2>
              <button onClick={() => setShowInterviewReview(null)} className="text-gray-400 hover:text-white text-2xl">×</button>
            </div>
            
            {interviewHistory.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">📋</div>
                <p className="text-gray-400">No completed interviews yet.</p>
                <p className="text-gray-500 text-sm mt-2">Complete your first mock interview to see your history here!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {interviewHistory.slice().reverse().map((result, i) => (
                  <div key={i} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-lg">{result.interviewTitle}</h3>
                        <p className="text-sm text-gray-400">{result.date} • {formatTime(result.timeUsed)}</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${result.passed ? 'text-green-400' : 'text-yellow-400'}`}>
                          {result.percentage}%
                        </div>
                        <div className={`text-xs ${result.passed ? 'text-green-400' : 'text-yellow-400'}`}>
                          {result.passed ? 'PASSED' : 'NOT PASSED'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Question Results */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                      <div className="bg-gray-700/50 rounded-lg p-2 text-center">
                        <div className="text-lg font-bold text-green-400">{result.questionsCorrect || result.questionResults?.filter(q => q.correct).length}</div>
                        <div className="text-xs text-gray-400">Correct</div>
                      </div>
                      <div className="bg-gray-700/50 rounded-lg p-2 text-center">
                        <div className="text-lg font-bold text-red-400">{result.mistakes?.length || 0}</div>
                        <div className="text-xs text-gray-400">Mistakes</div>
                      </div>
                      <div className="bg-gray-700/50 rounded-lg p-2 text-center">
                        <div className="text-lg font-bold text-purple-400">{result.studiedMistakes?.length || 0}</div>
                        <div className="text-xs text-gray-400">Reviewed</div>
                      </div>
                    </div>
                    
                    {/* Mistakes to Study */}
                    {result.mistakes && result.mistakes.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-400 mb-2">Questions to review:</p>
                        <div className="flex flex-wrap gap-2">
                          {result.mistakes.map((mistake, mi) => {
                            const isStudied = result.studiedMistakes?.includes(mistake.questionTitle);
                            return (
                              <button
                                key={mi}
                                onClick={() => studyTopicWithAI(mistake.questionTitle)}
                                className={`text-sm px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all cursor-pointer hover:scale-105 ${
                                  isStudied 
                                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                                    : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                                }`}
                                title={`Click to learn about ${mistake.questionTitle}`}
                              >
                                {isStudied ? '✓' : '🤖'} {mistake.questionTitle}
                                <span className="text-xs opacity-60">({mistake.concepts?.join(', ')})</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
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
            
            {/* Share Progress Section */}
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl">
              <h4 className="font-bold text-blue-400 mb-3 flex items-center gap-2">
                📤 Share Your Progress
              </h4>
              <p className="text-gray-400 text-sm mb-4">Show off your SQL skills and inspire others to learn!</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { setShowProfile(false); setShareType('progress'); setShowShareModal(true); }}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-medium text-sm"
                >
                  📊 Progress Card
                </button>
                <button
                  onClick={() => { setShowProfile(false); setShareType('streak'); setShowShareModal(true); }}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 rounded-lg font-medium text-sm"
                >
                  🔥 Streak Badge
                </button>
              </div>
              {Object.values(challengeProgress).filter(p => p?.completed).length === 30 && (
                <button
                  onClick={() => { setShowProfile(false); setShareType('certificate'); setShowShareModal(true); }}
                  className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 rounded-lg font-medium text-sm"
                >
                  🏆 30-Day Certificate
                </button>
              )}
            </div>
            
            {/* Subscription Section */}
            {!isGuest && (
              <div className="mb-6">
                <h3 className="font-bold mb-3 flex items-center gap-2">💳 Subscription</h3>
                <div className={`p-4 rounded-xl border ${userProStatus ? 'bg-gradient-to-r from-purple-500/10 to-yellow-500/10 border-purple-500/30' : 'bg-gray-800/50 border-gray-700'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {userProStatus ? (
                          <>
                            <span className="text-lg font-bold text-yellow-400">⭐ Pro</span>
                            <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400">
                              {proType === 'lifetime' ? 'Lifetime' : 'Monthly'}
                            </span>
                          </>
                        ) : (
                          <span className="text-lg font-bold text-gray-400">Free Plan</span>
                        )}
                      </div>
                      {userProStatus && (
                        <div className="text-sm text-gray-400">
                          {proType === 'lifetime' ? (
                            'Valid forever'
                          ) : proExpiry ? (
                            (() => {
                              const expiryDate = new Date(proExpiry);
                              const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
                              if (proAutoRenew) {
                                return `Renews on ${expiryDate.toLocaleDateString()} (${daysLeft} days)`;
                              } else {
                                return `Expires on ${expiryDate.toLocaleDateString()} (${daysLeft} days)`;
                              }
                            })()
                          ) : ''}
                        </div>
                      )}
                      {userProStatus && proType !== 'lifetime' && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500">Auto-renew:</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              proAutoRenew ? cancelProSubscription() : reactivateProSubscription();
                            }}
                            className={`px-2 py-0.5 rounded text-xs transition-all ${proAutoRenew ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-gray-600 text-gray-400 hover:bg-gray-500'}`}
                          >
                            {proAutoRenew ? 'ON' : 'OFF'}
                          </button>
                        </div>
                      )}
                      {!userProStatus && (
                        <p className="text-sm text-gray-500 mt-1">Upgrade to unlock all mock interviews</p>
                      )}
                    </div>
                    <button
                      onClick={() => setShowProModal(true)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                        userProStatus 
                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                          : 'bg-gradient-to-r from-purple-600 to-yellow-600 hover:from-purple-700 hover:to-yellow-700 text-white'
                      }`}
                    >
                      {userProStatus ? 'Manage' : 'Upgrade'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
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
            
            {/* Goals Button */}
            {!isGuest && (
              <button
                onClick={() => setShowGoalsModal(true)}
                className="relative px-2 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30"
                title="Weekly Goals"
              >
                🎯
                {weeklyGoals.filter(g => !g.completed).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full text-xs flex items-center justify-center">
                    {weeklyGoals.filter(g => !g.completed).length}
                  </span>
                )}
              </button>
            )}
            
            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              className={`px-2 py-1.5 rounded-lg text-lg ${soundEnabled ? 'bg-green-500/20 border border-green-500/30' : 'bg-gray-700/50 border border-gray-600'}`}
              title={soundEnabled ? 'Sound On' : 'Sound Off'}
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
            
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
        
        {/* 30-Day Challenge Banner */}
        {!isGuest && (
          <button
            onClick={() => {
              setShow30DayChallenge(true);
              setChallengeProgress(load30DayProgress());
              setChallengeStartDate(get30DayStartDate());
            }}
            className="w-full mb-4 p-4 bg-gradient-to-r from-purple-600/20 via-pink-500/20 to-orange-500/20 border border-purple-500/30 rounded-xl flex items-center justify-between hover:border-purple-500/50 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">🗓️</div>
              <div className="text-left">
                <h3 className="font-bold text-lg bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                  Master SQL 30-Day Challenge
                </h3>
                <p className="text-sm text-gray-400">
                  {challengeStartDate || get30DayStartDate() 
                    ? `Day ${getCurrentDayNumber()} of 30 • ${Object.values(challengeProgress).filter(p => p?.completed).length} days completed`
                    : "Transform from beginner to expert in 30 days"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {(challengeStartDate || get30DayStartDate()) && (
                <div className="hidden sm:flex gap-1">
                  {[1,2,3,4,5].map(week => {
                    const progress = getWeekProgress(week);
                    return (
                      <div 
                        key={week}
                        className={`w-3 h-8 rounded ${
                          progress.percentage === 100 ? 'bg-green-500' :
                          progress.percentage > 0 ? 'bg-purple-500' : 'bg-gray-700'
                        }`}
                        title={`Week ${week}: ${progress.percentage}%`}
                      />
                    );
                  })}
                </div>
              )}
              <ChevronRight size={24} className="text-purple-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        )}
        
        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { id: 'learn', label: '🤖 AI Tutor' }, 
            { id: 'weakness', label: '🎯 Weakness Training', badge: Object.values(weaknessTracking?.topics || {}).filter(t => t.currentLevel < 5).length },
            { id: 'exercises', label: '📝 Exercises' }, 
            { id: 'challenges', label: '⚔️ Challenges' }, 
            { id: 'interviews', label: '💼 Interviews' }, 
            { id: 'achievements', label: '🏆 Stats' }, 
            { id: 'leaderboard', label: '👑 Leaderboard' }
          ].map(t => (
            <button 
              key={t.id} 
              onClick={() => {
                setActiveTab(t.id);
                if (t.id === 'weakness' && checkWeeklyRefresh()) {
                  refreshWeaknesses();
                }
              }} 
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${activeTab === t.id ? 'bg-purple-600' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
              {t.label}
              {t.badge > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{t.badge}</span>
              )}
            </button>
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

        {/* Weakness Training Tab */}
        {activeTab === 'weakness' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Weakness List Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-black/30 rounded-xl border border-red-500/30 p-4">
                <h2 className="font-bold mb-3 flex items-center gap-2 text-red-400">
                  🎯 Your Weaknesses
                </h2>
                
                {/* Refresh Info */}
                <div className="text-xs text-gray-500 mb-3">
                  Last updated: {weaknessTracking.lastRefresh ? new Date(weaknessTracking.lastRefresh).toLocaleDateString() : 'Never'}
                  <button 
                    onClick={refreshWeaknesses}
                    className="ml-2 text-blue-400 hover:text-blue-300 underline"
                  >
                    Refresh
                  </button>
                </div>
                
                {/* Weakness Cards */}
                <div className="space-y-2">
                  {Object.entries(weaknessTracking?.topics || {}).filter(([_, w]) => w.currentLevel < 5).length === 0 ? (
                    <div className="text-center py-6">
                      <div className="text-4xl mb-2">🎉</div>
                      <p className="text-green-400 font-medium">No weaknesses detected!</p>
                      <p className="text-gray-500 text-sm mt-1">Complete more challenges to identify areas for improvement.</p>
                      <button
                        onClick={refreshWeaknesses}
                        className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm"
                      >
                        Scan for Weaknesses
                      </button>
                    </div>
                  ) : (
                    Object.entries(weaknessTracking?.topics || {})
                      .filter(([_, w]) => w.currentLevel < 5)
                      .map(([topic, weakness], i) => {
                        const progressPercent = ((weakness.currentLevel - 1) / 4) * 100;
                        const levelLabels = { 1: 'Concept Review', 2: 'Easy', 3: 'Medium', 4: 'Hard' };
                        return (
                          <button
                            key={topic}
                            onClick={() => startWeaknessTraining(topic)}
                            className={`w-full p-3 rounded-lg text-left transition-all ${
                              activeWeakness === topic 
                                ? 'bg-red-500/30 border border-red-500' 
                                : 'bg-gray-800/50 border border-gray-700 hover:border-red-500/50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">{topic}</span>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                weakness.currentLevel === 1 ? 'bg-blue-500/30 text-blue-300' :
                                weakness.currentLevel === 2 ? 'bg-green-500/30 text-green-300' :
                                weakness.currentLevel === 3 ? 'bg-yellow-500/30 text-yellow-300' :
                                'bg-red-500/30 text-red-300'
                              }`}>
                                Level {weakness.currentLevel}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mb-2">{levelLabels[weakness.currentLevel]}</div>
                            <div className="w-full bg-gray-700 rounded-full h-1.5">
                              <div 
                                className="bg-gradient-to-r from-red-500 to-green-500 h-1.5 rounded-full transition-all"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </button>
                        );
                      })
                  )}
                </div>
                
                {/* Stats */}
                {weaknessTracking.totalCleared > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Weaknesses Mastered:</span>
                      <span className="text-green-400 font-bold">{weaknessTracking.totalCleared}</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Level Legend */}
              <div className="bg-black/30 rounded-xl border border-gray-700 p-4">
                <h3 className="font-medium text-sm mb-3 text-gray-300">Mastery Ladder</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-blue-500/30 text-blue-300 flex items-center justify-center font-bold">1</span>
                    <span className="text-gray-400">Concept Review</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-green-500/30 text-green-300 flex items-center justify-center font-bold">2</span>
                    <span className="text-gray-400">Easy Question</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-yellow-500/30 text-yellow-300 flex items-center justify-center font-bold">3</span>
                    <span className="text-gray-400">Medium Question</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-red-500/30 text-red-300 flex items-center justify-center font-bold">4</span>
                    <span className="text-gray-400">Hard Question</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-purple-500/30 text-purple-300 flex items-center justify-center font-bold">✓</span>
                    <span className="text-gray-400">Mastered!</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Training Area */}
            <div className="lg:col-span-3">
              {!activeWeakness ? (
                <div className="bg-black/30 rounded-xl border border-gray-700 p-8 text-center">
                  <div className="text-6xl mb-4">🎯</div>
                  <h2 className="text-2xl font-bold mb-2">Weakness Training</h2>
                  <p className="text-gray-400 mb-6">
                    Select a weakness from the sidebar to start your personalized training session.
                  </p>
                  <div className="bg-gray-800/50 rounded-lg p-4 max-w-md mx-auto text-left">
                    <h3 className="font-medium text-yellow-400 mb-2">How it works:</h3>
                    <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
                      <li>Review the concept explanation (Level 1)</li>
                      <li>Solve an easy practice question (Level 2)</li>
                      <li>Tackle a medium difficulty question (Level 3)</li>
                      <li>Master a hard question (Level 4)</li>
                      <li>Weakness cleared! 🎉 (+50 XP bonus)</li>
                    </ol>
                  </div>
                </div>
              ) : (() => {
                const weakness = weaknessTracking?.topics?.[activeWeakness];
                if (!weakness) return null;
                
                const level = weakness.currentLevel;
                const levelLabels = { 1: 'Concept Review', 2: 'Easy Question', 3: 'Medium Question', 4: 'Hard Question' };
                
                // Get question - try from stored, if null, get fresh
                let question = level === 2 ? weakness.questions?.easy :
                               level === 3 ? weakness.questions?.medium :
                               level === 4 ? weakness.questions?.hard : null;
                
                // If no question found, try to get one dynamically
                if (!question && level >= 2) {
                  const freshQuestions = getQuestionsForWeakness(activeWeakness, weakness.concepts);
                  question = level === 2 ? freshQuestions.easy :
                             level === 3 ? freshQuestions.medium :
                             level === 4 ? freshQuestions.hard : null;
                }
                
                return (
                  <div className="bg-black/30 rounded-xl border border-red-500/30 p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <p className="text-red-400 text-sm font-medium">Training: {activeWeakness}</p>
                        <h2 className="text-2xl font-bold">{levelLabels[level]}</h2>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Progress</p>
                          <p className="text-lg font-bold text-yellow-400">Level {level}/4</p>
                        </div>
                        <button
                          onClick={() => setActiveWeakness(null)}
                          className="text-gray-400 hover:text-white text-2xl"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mb-6">
                      <div className="flex justify-between mb-1">
                        {[1, 2, 3, 4].map(l => (
                          <div 
                            key={l}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              l < level ? 'bg-green-500 text-white' :
                              l === level ? 'bg-yellow-500 text-black' :
                              'bg-gray-700 text-gray-500'
                            }`}
                          >
                            {l < level ? '✓' : l}
                          </div>
                        ))}
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                        <div 
                          className="bg-gradient-to-r from-yellow-500 to-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${((level - 1) / 4) * 100}%` }}
                        />
                      </div>
                    </div>
                    
                    {level === 1 ? (
                      /* Level 1: Concept Review */
                      <div>
                        <div className="bg-gray-800/50 rounded-xl p-6 mb-6 prose prose-invert max-w-none">
                          <div 
                            dangerouslySetInnerHTML={{ 
                              __html: getTopicExplanation(activeWeakness)
                                .replace(/## (.*)/g, '<h2 class="text-xl font-bold text-yellow-400 mb-3">$1</h2>')
                                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-cyan-400">$1</strong>')
                                .replace(/```sql\n([\s\S]*?)```/g, '<pre class="bg-gray-900 p-3 rounded-lg my-3 text-green-400 text-sm overflow-x-auto"><code>$1</code></pre>')
                                .replace(/\n/g, '<br/>')
                            }} 
                          />
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400 mb-4">Have you reviewed and understood the concepts above?</p>
                          <button
                            onClick={() => completeWeaknessLevel(activeWeakness, 1, true)}
                            className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl font-bold text-lg"
                          >
                            ✓ I Understand - Continue to Practice
                          </button>
                        </div>
                      </div>
                    ) : question ? (
                      /* Level 2-4: Practice Questions */
                      <div>
                        {/* Question */}
                        <div className="bg-gray-800/50 rounded-xl p-5 mb-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-lg text-yellow-400">{question.title}</h3>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              question.difficulty === 'easy' || question.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                              question.difficulty === 'medium' || question.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {question.difficulty}
                            </span>
                          </div>
                          <p className="text-gray-300" dangerouslySetInnerHTML={{
                            __html: (question.description || '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-cyan-400">$1</strong>')
                          }} />
                          
                          {/* Table Schema */}
                          {question.dataset && (
                            <div className="mt-4 bg-gray-800/50 rounded-lg p-4">
                              <h4 className="text-sm font-medium text-purple-400 mb-2">📊 Tables & Columns</h4>
                              <div className="space-y-2">
                                {(question.dataset === 'titanic' ? [
                                  { name: 'passengers', cols: 'passenger_id, survived, pclass, name, sex, age, sibsp, parch, ticket, fare, cabin, embarked' }
                                ] : question.dataset === 'ecommerce' ? [
                                  { name: 'orders', cols: 'order_id, customer_id, product, category, quantity, price, total, order_date, country, status' },
                                  { name: 'customers', cols: 'customer_id, name, email, city, country' }
                                ] : question.dataset === 'movies' ? [
                                  { name: 'movies', cols: 'movie_id, title, genre, year, rating, director_id, budget, revenue' },
                                  { name: 'directors', cols: 'director_id, name, birth_year, nationality' }
                                ] : question.dataset === 'employees' ? [
                                  { name: 'employees', cols: 'employee_id, name, department, salary, hire_date, manager_id' },
                                  { name: 'departments', cols: 'department_id, name, location, budget' }
                                ] : [{ name: question.dataset, cols: 'various columns' }]
                                ).map(table => (
                                  <div key={table.name} className="text-sm">
                                    <span className="text-yellow-400 font-mono">{table.name}</span>
                                    <span className="text-gray-400 ml-2">({table.cols})</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Expected Output Preview - computed inline */}
                          {question.solution && db && (
                            <ExpectedOutputPreview db={db} solution={question.solution} />
                          )}
                        </div>
                        
                        {/* Hint */}
                        {level === 2 && question.hints && (
                          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
                            <p className="text-blue-400 text-sm">💡 Hint: {question.hints[0]}</p>
                          </div>
                        )}
                        
                        {level === 3 && question.hints && (
                          <div className="mb-4">
                            <button
                              onClick={() => setShowWeaknessHint(!showWeaknessHint)}
                              className="text-blue-400 hover:text-blue-300 text-sm"
                            >
                              {showWeaknessHint ? '🙈 Hide Hint' : '💡 Show Hint'}
                            </button>
                            {showWeaknessHint && (
                              <div className="mt-2 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                                <p className="text-blue-400 text-sm">{question.hints[0]}</p>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {level === 4 && (
                          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                            <p className="text-red-400 text-sm">🔥 Final challenge! No hints available. Prove your mastery!</p>
                          </div>
                        )}
                        
                        {/* Query Editor */}
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-400 mb-2">Your Query:</label>
                          <textarea
                            value={weaknessQuery}
                            onChange={(e) => setWeaknessQuery(e.target.value)}
                            className="w-full h-32 bg-gray-900 border border-gray-700 rounded-lg p-3 font-mono text-sm text-green-400 focus:border-red-500 focus:outline-none"
                            placeholder="Write your SQL query here..."
                          />
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-3 mb-4">
                          <button
                            onClick={() => runWeaknessQuery(question)}
                            disabled={!weaknessQuery.trim()}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg font-medium"
                          >
                            ▶ Run Query
                          </button>
                          <button
                            onClick={() => checkWeaknessAnswer(question, activeWeakness, level)}
                            disabled={!weaknessQuery.trim()}
                            className="px-6 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 disabled:opacity-50 rounded-lg font-bold"
                          >
                            Submit Answer
                          </button>
                        </div>
                        
                        {/* Status Message */}
                        {weaknessStatus === 'success' && (
                          <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-4 text-center">
                            <p className="text-green-400 font-bold text-lg">✓ Correct! Moving to next level...</p>
                          </div>
                        )}
                        
                        {weaknessStatus === 'error' && (
                          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4">
                            <p className="text-red-400 font-bold">✗ Not quite right. Try again!</p>
                            <p className="text-gray-400 text-sm mt-1">Check your query and compare with the expected output.</p>
                          </div>
                        )}
                        
                        {/* Query Result */}
                        {weaknessResult.error && (
                          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4">
                            <p className="text-red-400 font-mono text-sm">{weaknessResult.error}</p>
                          </div>
                        )}
                        
                        {weaknessResult.rows.length > 0 && (
                          <div className="bg-gray-800/50 rounded-lg p-4">
                            <p className="text-gray-400 text-sm mb-2">Your Result ({weaknessResult.rows.length} rows):</p>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-gray-700">
                                    {weaknessResult.columns.map((col, i) => (
                                      <th key={i} className="text-left p-2 text-gray-400">{col}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {weaknessResult.rows.slice(0, 10).map((row, ri) => (
                                    <tr key={ri} className="border-b border-gray-800">
                                      {row.map((cell, ci) => (
                                        <td key={ci} className="p-2 text-gray-300">{cell?.toString() ?? 'NULL'}</td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {weaknessResult.rows.length > 10 && (
                                <p className="text-gray-500 text-xs mt-2">...and {weaknessResult.rows.length - 10} more rows</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* No question available */
                      <div className="text-center py-8">
                        <div className="text-4xl mb-4">🔍</div>
                        <p className="text-gray-400">No practice question available for this level.</p>
                        <button
                          onClick={() => completeWeaknessLevel(activeWeakness, level, true)}
                          className="mt-4 px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium"
                        >
                          Skip to Next Level
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
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

        {/* Interviews Tab */}
        {activeTab === 'interviews' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl border border-purple-500/30 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    💼 SQL Mock Interviews
                  </h2>
                  <p className="text-gray-400 mt-1">Practice with timed, real-world interview questions</p>
                </div>
                <div className="flex items-center gap-4">
                  {userProStatus ? (
                    <button
                      onClick={() => setShowProModal(true)}
                      className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg font-bold text-black hover:from-yellow-600 hover:to-orange-600 transition-all"
                    >
                      ⭐ PRO Member
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowProModal(true)}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-bold flex items-center gap-2"
                    >
                      <Zap size={18} /> Upgrade to Pro
                    </button>
                  )}
                </div>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 mt-4">
                <div className="bg-black/30 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-400">{interviewHistory.length}</div>
                  <div className="text-xs text-gray-400">Interviews Completed</div>
                </div>
                <div className="bg-black/30 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {interviewHistory.filter(i => i.passed).length}
                  </div>
                  <div className="text-xs text-gray-400">Passed</div>
                </div>
                <div className="bg-black/30 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-yellow-400">
                    {interviewHistory.length > 0 
                      ? Math.round(interviewHistory.reduce((s, i) => s + (i.percentage || i.scorePercent || 0), 0) / interviewHistory.length) 
                      : 0}%
                  </div>
                  <div className="text-xs text-gray-400">Avg Score</div>
                </div>
                <button 
                  onClick={() => setShowInterviewAnalytics(true)}
                  className="bg-black/30 hover:bg-black/50 rounded-lg p-3 text-center transition-all"
                >
                  <div className="text-2xl font-bold text-purple-400">📊</div>
                  <div className="text-xs text-gray-400">Analytics</div>
                </button>
              </div>
            </div>
            
            {/* Recommendation Banner */}
            {(() => {
              const recommendation = getInterviewRecommendation();
              if (!recommendation) return null;
              return (
                <div className="bg-gradient-to-r from-green-500/10 to-cyan-500/10 border border-green-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        {recommendation.type === 'new_user' ? '🚀' :
                         recommendation.type === 'retry_failed' ? '🔄' :
                         recommendation.type === 'improve_weakness' ? '💪' :
                         recommendation.type === 'next_level' ? '⬆️' : '✨'}
                      </div>
                      <div>
                        <h3 className="font-bold text-green-400">Recommended for You</h3>
                        <p className="text-sm text-gray-300">{recommendation.reason}</p>
                        {recommendation.weakConcepts && recommendation.weakConcepts.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            Focus areas: {recommendation.weakConcepts.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => startInterview(recommendation.interview)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium flex items-center gap-2"
                    >
                      <Play size={16} /> Start Now
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Free vs Pro Info */}
            {!userProStatus && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🎁</div>
                  <div>
                    <h3 className="font-bold text-yellow-400">Free Trial Available</h3>
                    <p className="text-sm text-gray-300">Try our SQL Fundamentals interview for free! Upgrade to Pro for unlimited access to all interviews.</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Saved Progress Banner */}
            {savedInterviewProgress && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">⏸️</div>
                    <div>
                      <h3 className="font-bold text-blue-400">Resume Interview</h3>
                      <p className="text-sm text-gray-300">
                        {savedInterviewProgress.interviewTitle} • Question {savedInterviewProgress.questionIndex + 1} • {formatTime(savedInterviewProgress.totalTimer)} elapsed
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const interview = mockInterviews.find(i => i.id === savedInterviewProgress.interviewId);
                        if (interview) startInterview(interview);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium"
                    >
                      Resume
                    </button>
                    <button
                      onClick={() => {
                        const interview = mockInterviews.find(i => i.id === savedInterviewProgress.interviewId);
                        if (interview) restartInterview(interview);
                      }}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
                    >
                      Restart
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Past Interviews with Mistakes */}
            {interviewHistory.length > 0 && interviewHistory.some(h => h.mistakes && h.mistakes.length > 0) && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <h3 className="font-bold text-red-400 mb-3 flex items-center gap-2">
                  📚 Questions to Review ({interviewHistory.reduce((sum, h) => sum + (h.mistakes?.filter(m => !h.studiedMistakes?.includes(m.questionTitle))?.length || 0), 0)} remaining)
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {interviewHistory.slice().reverse().filter(h => h.mistakes && h.mistakes.length > 0).slice(0, 3).map((result, ri) => (
                    <div key={ri} className="bg-gray-800/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-300">{result.interviewTitle} - {result.date}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${result.passed ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          {result.percentage}%
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {result.mistakes.map((mistake, mi) => {
                          const isStudied = result.studiedMistakes?.includes(mistake.questionTitle);
                          return (
                            <button
                              key={mi}
                              onClick={() => studyTopicWithAI(mistake.questionTitle)}
                              className={`text-xs px-2 py-1 rounded flex items-center gap-1 transition-all cursor-pointer hover:scale-105 ${
                                isStudied 
                                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                                  : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                              }`}
                              title={`Click to learn about ${mistake.questionTitle}`}
                            >
                              {isStudied ? '✓' : '🤖'} {mistake.questionTitle}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                {interviewHistory.filter(h => h.mistakes && h.mistakes.length > 0).length > 3 && (
                  <button
                    onClick={() => setShowInterviewReview('history')}
                    className="text-sm text-blue-400 hover:text-blue-300 mt-2"
                  >
                    View all past interviews →
                  </button>
                )}
              </div>
            )}

            {/* Interview Difficulty Filter */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'All', color: 'bg-orange-500' },
                { id: 'easy', label: 'Easy', color: 'bg-green-500' },
                { id: 'medium', label: 'Medium', color: 'bg-yellow-500' },
                { id: 'hard', label: 'Hard', color: 'bg-red-500' },
                { id: 'solved', label: 'Solved', color: 'bg-green-500', isCheck: true },
                { id: 'unsolved', label: 'Unsolved', color: 'bg-gray-500' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setInterviewFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    interviewFilter === f.id 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {f.isCheck ? (
                    <span className={`w-4 h-4 rounded flex items-center justify-center ${f.color} text-white text-xs`}>✓</span>
                  ) : (
                    <span className={`w-3 h-3 rounded-full ${f.color}`}></span>
                  )}
                  {f.label}
                </button>
              ))}
            </div>

            {/* Interview List */}
            <div className="grid gap-4">
              {mockInterviews.filter(interview => {
                const hasPassed = interviewHistory.some(h => h.interviewId === interview.id && h.passed);
                const hasAttempted = interviewHistory.some(h => h.interviewId === interview.id);
                
                switch (interviewFilter) {
                  case 'easy':
                    return interview.difficulty.toLowerCase().includes('easy');
                  case 'medium':
                    return interview.difficulty.toLowerCase().includes('medium');
                  case 'hard':
                    return interview.difficulty.toLowerCase().includes('hard');
                  case 'solved':
                    return hasPassed;
                  case 'unsolved':
                    return !hasPassed;
                  default:
                    return true;
                }
              }).map(interview => {
                const canAccess = canAccessInterview(interview);
                const completedCount = interviewHistory.filter(h => h.interviewId === interview.id).length;
                const bestScore = interviewHistory
                  .filter(h => h.interviewId === interview.id)
                  .reduce((best, h) => Math.max(best, h.percentage), 0);
                
                return (
                  <div
                    key={interview.id}
                    className={`bg-gray-800/50 rounded-xl border p-5 transition-all ${
                      canAccess 
                        ? 'border-gray-700 hover:border-purple-500/50 cursor-pointer hover:bg-gray-800/70' 
                        : 'border-gray-800 opacity-70'
                    }`}
                    onClick={() => canAccess && startInterview(interview)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold">{interview.title}</h3>
                          {interview.isFree && (
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                              FREE
                            </span>
                          )}
                          {!interview.isFree && !canAccess && (
                            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs font-medium flex items-center gap-1">
                              <Lock size={10} /> PRO
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            interview.difficulty.includes('Easy') ? 'bg-green-500/20 text-green-400' :
                            interview.difficulty.includes('Medium') ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {interview.difficulty}
                          </span>
                        </div>
                        
                        <p className="text-gray-400 text-sm mb-3">{interview.description}</p>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-500 flex items-center gap-1">
                            <Clock size={14} /> {Math.floor(interview.totalTime / 60)} min
                          </span>
                          <span className="text-gray-500 flex items-center gap-1">
                            <Target size={14} /> {interview.questionsCount} questions
                          </span>
                          <span className="text-gray-500">
                            Pass: {interview.passingScore}%
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-3">
                          {interview.skills.slice(0, 4).map((skill, i) => (
                            <span key={i} className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                              {skill}
                            </span>
                          ))}
                          {interview.skills.length > 4 && (
                            <span className="text-purple-400 text-xs">+{interview.skills.length - 4} more</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right ml-4">
                        {completedCount > 0 ? (
                          <div>
                            <div className="text-sm text-gray-400">Best Score</div>
                            <div className={`text-2xl font-bold ${bestScore >= interview.passingScore ? 'text-green-400' : 'text-yellow-400'}`}>
                              {bestScore}%
                            </div>
                            <div className="text-xs text-gray-500 mb-2">{completedCount} attempt{completedCount > 1 ? 's' : ''}</div>
                            <div className="flex gap-2">
                              <button
                                className="px-3 py-1.5 rounded-lg text-sm bg-purple-600 hover:bg-purple-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startInterview(interview);
                                }}
                              >
                                Retry
                              </button>
                              <button
                                className="px-3 py-1.5 rounded-lg text-sm bg-cyan-600/50 hover:bg-cyan-600 text-cyan-300"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startPracticeMode(interview);
                                }}
                                title="Practice without timer or scoring"
                              >
                                🧘 Practice
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <button
                              className={`px-4 py-2 rounded-lg font-medium ${
                                canAccess
                                  ? 'bg-purple-600 hover:bg-purple-700'
                                  : 'bg-gray-700 text-gray-400'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (canAccess) startInterview(interview);
                                else setShowProModal(true);
                              }}
                            >
                              {canAccess ? 'Start Interview' : 'Unlock Pro'}
                            </button>
                            {canAccess && (
                              <button
                                className="px-4 py-2 rounded-lg text-sm bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-400 border border-cyan-500/30"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startPracticeMode(interview);
                                }}
                                title="Practice without timer or scoring"
                              >
                                🧘 Practice Mode
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Interview History */}
            {interviewHistory.length > 0 && (
              <div className="bg-gray-800/30 rounded-xl border border-gray-700 p-5">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Clock size={18} /> Recent Attempts
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {interviewHistory.slice().reverse().slice(0, 10).map((result, i) => (
                    <div key={i} className="flex items-center justify-between py-2 px-3 bg-gray-800/50 rounded-lg">
                      <div>
                        <span className="font-medium">{result.interviewTitle}</span>
                        <span className="text-gray-500 text-sm ml-3">{result.date}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-gray-400 text-sm">{formatTime(result.timeUsed)}</span>
                        <span className={`font-bold ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
                          {result.percentage}%
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs ${result.passed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {result.passed ? 'PASSED' : 'FAILED'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
