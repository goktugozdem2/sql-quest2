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

const saveUserData = async (username, data) => {
  try {
    localStorage.setItem(`sqlquest_user_${username}`, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error('Failed to save user data:', err);
    return false;
  }
};

const loadUserData = async (username) => {
  try {
    const result = localStorage.getItem(`sqlquest_user_${username}`);
    return result ? JSON.parse(result) : null;
  } catch (err) {
    console.error('Failed to load user data:', err);
    return null;
  }
};

const saveToLeaderboard = async (username, xp, solvedCount) => {
  try {
    const leaderboard = JSON.parse(localStorage.getItem('sqlquest_leaderboard') || '{}');
    leaderboard[username] = { username, xp, solvedCount, timestamp: Date.now() };
    localStorage.setItem('sqlquest_leaderboard', JSON.stringify(leaderboard));
    return true;
  } catch (err) {
    console.error('Failed to save to leaderboard:', err);
    return false;
  }
};

const loadLeaderboard = async () => {
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
  const [showAuth, setShowAuth] = useState(true);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [queryHistory, setQueryHistory] = useState([]);
  const [showProfile, setShowProfile] = useState(false);
  
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

  // Check for existing session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('sqlquest_user');
    if (savedUser) {
      loadUserSession(savedUser);
    }
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
  }, [xp, solvedChallenges, unlockedAchievements, queryCount, aiMessages, aiLessonPhase, currentAiLesson, completedAiLessons, comprehensionCount, comprehensionCorrect, consecutiveCorrect, comprehensionConsecutive, completedExercises, challengeQueries]);

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
    
    const userData = await loadUserData(authUsername.trim().toLowerCase());
    
    if (authMode === 'login') {
      if (!userData) {
        setAuthError('Invalid username or password');
        return;
      }
      const isValid = await verifyPassword(authPassword, userData.salt, userData.passwordHash);
      if (!isValid) {
        setAuthError('Invalid username or password');
        return;
      }
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
      await saveUserData(authUsername.trim().toLowerCase(), newUserData);
    }
    
    await loadUserSession(authUsername.trim().toLowerCase());
    setAuthError('');
    setAuthPassword('');
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
    localStorage.removeItem('sqlquest_user');
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

  const getAISystemPrompt = (lesson, phase) => {
    const tableInfo = lesson.practiceTable === 'passengers' 
      ? `Table: passengers (passenger_id, survived, pclass, name, sex, age, sibsp, parch, fare, embarked) - Titanic passenger data. survived: 0=died, 1=survived. pclass: 1=first, 2=second, 3=third class.`
      : lesson.practiceTable === 'movies'
      ? `Table: movies (id, title, year, genre, rating, votes, revenue_millions, runtime, director) - Top 100 movies with ratings and box office.`
      : lesson.practiceTable === 'employees'
      ? `Table: employees (emp_id, name, department, position, salary, hire_date, manager_id, performance_rating) - 50 company employees.`
      : `Table: orders (order_id, customer_id, product, category, quantity, price, order_date, country) and customers (customer_id, name, email, join_date, membership, total_orders)`;

    return `You are an expert SQL tutor teaching a beginner.

Lesson: "${lesson.title}" - ${lesson.topic}
Concepts: ${lesson.concepts.join(", ")}
${tableInfo}

RULES: No markdown (**). Use CAPS for emphasis. Keep under 80 words. Use "QUESTION:" prefix.

Phase: ${phase}
${phase === 'intro' ? 'Introduce topic briefly. Ask if ready.' : ''}
${phase === 'teaching' ? 'Teach with ONE example. Ask if ready to practice.' : ''}
${phase === 'practice' ? `
MANDATORY: Your response MUST contain this EXACT tag with a valid SQL query:
[EXPECTED_SQL]SELECT ... FROM passengers ...[/EXPECTED_SQL]

The query inside MUST be the CORRECT ANSWER to the question you ask.
Example for "count passengers by class":
[EXPECTED_SQL]SELECT pclass, COUNT(*) FROM passengers GROUP BY pclass[/EXPECTED_SQL]

DO NOT forget the [EXPECTED_SQL] tag. Ask a DIFFERENT question each time.
` : ''}
${phase === 'feedback' ? 'Say "Correct!" or "Not quite" first. Brief explanation. NO [EXPECTED_SQL] in feedback.' : ''}
${phase === 'comprehension' ? `Conceptual question about: ${lesson.concepts.join(", ")}. Explain in own words, no code.` : ''}
${phase === 'comprehension_feedback' ? 'Say "Correct!" or "Not quite". Brief if wrong.' : ''}`;
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
      getAISystemPrompt(lesson, 'intro')
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

    // Try real AI first
    const conversationHistory = [
      ...aiMessages.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: message }
    ];
    
    let response = await callAI(conversationHistory, getAISystemPrompt(lesson, targetPhase));
    
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
    } else if (aiLessonPhase === 'practice') {
      newPhase = 'feedback';
      setAiQuestionCount(prev => prev + 1);
    } else if (aiLessonPhase === 'feedback') {
      if (consecutiveCorrect >= 3) {
        newPhase = 'comprehension';
        setComprehensionConsecutive(0);
        setAiExpectedResult({ columns: [], rows: [] });
        setAiExpectedQuery('');
      } else {
        newPhase = 'practice';
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
    if (newPhase === 'practice') {
      setAiExpectedResult({ columns: [], rows: [] });
      setAiExpectedQuery('');
      setExpectedResultMessageId(-1);
      setAiUserResult({ columns: [], rows: [], error: null });
      setResults({ columns: [], rows: [], error: null });
      setQuery('');
      setShowAiComparison(false);
    }

    // Try real AI first
    const conversationHistory = [
      ...aiMessages.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: userMessage }
    ];
    
    let response = await callAI(conversationHistory, getAISystemPrompt(lesson, newPhase));
    
    // Fall back to static content if AI not available
    if (!response) {
      const questionIdx = newPhase === 'practice' ? aiQuestionCount % 3 : comprehensionCount % 3;
      
      if (newPhase === 'feedback') {
        // Check if user's SQL is correct by comparing with expected
        const userSql = (userMessage || '').toLowerCase().replace(/\s+/g, ' ').trim();
        const expectedSql = (aiExpectedQuery || '').toLowerCase().replace(/\s+/g, ' ').trim();
        const isCorrect = expectedSql && userSql === expectedSql;
        if (isCorrect) {
          response = "Correct! Great job! You've got it. Ready for the next question?";
          setAiCorrectCount(prev => prev + 1);
          setConsecutiveCorrect(prev => prev + 1);
        } else {
          response = `Not quite. The correct answer was:\n\n${aiExpectedQuery || 'SELECT * FROM passengers LIMIT 3'}\n\nLet's try another question!`;
          setConsecutiveCorrect(0);
        }
      } else if (newPhase === 'comprehension_feedback') {
        if ((userMessage || '').length > 20) {
          response = "That's right! Good explanation. You understand the concept well.";
          setComprehensionCorrect(prev => prev + 1);
          setComprehensionConsecutive(prev => prev + 1);
        } else {
          response = "Could you explain a bit more? Try to be more detailed in your answer.";
          setComprehensionConsecutive(0);
        }
      } else {
        response = getStaticResponse(lesson.id, newPhase, questionIdx);
      }
    } else {
      // AI responded - check for correct/incorrect feedback
      if (newPhase === 'feedback' || aiLessonPhase === 'practice') {
        const respLower = response.toLowerCase();
        if (respLower.includes('correct') || respLower.includes('great job') || respLower.includes('well done') || respLower.includes('perfect')) {
          setAiCorrectCount(prev => prev + 1);
          setConsecutiveCorrect(prev => prev + 1);
        } else if (respLower.includes('not quite') || respLower.includes('incorrect') || respLower.includes('try again')) {
          setConsecutiveCorrect(0);
        }
      }
      if (newPhase === 'comprehension_feedback' || aiLessonPhase === 'comprehension') {
        const respLower = response.toLowerCase();
        if (respLower.includes("that's right") || respLower.includes("correct") || respLower.includes("well explained") || respLower.includes("exactly")) {
          setComprehensionCorrect(prev => prev + 1);
          setComprehensionConsecutive(prev => prev + 1);
        } else if (respLower.includes('not quite') || respLower.includes('incorrect')) {
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
      const conversationHistory = [
        ...aiMessages.map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: evalMessage }
      ];

      const response = await callAI(
        conversationHistory,
        getAISystemPrompt(lesson, 'feedback')
      );

      // Handle AI response or fall back to static
      let feedbackResponse = response;
      if (!feedbackResponse) {
        // Static fallback
        if (isCorrect) {
          feedbackResponse = "Correct! Great job! Your query returned the expected results. Ready for the next question?";
        } else if (hasExpected) {
          feedbackResponse = "Not quite right. Your query ran but didn't return the expected results. Check the expected output and try again, or click 'Next Question' to continue.";
        } else {
          feedbackResponse = "Your query executed successfully! Let's move on to the next question.";
        }
      }

      // Track consecutive correct
      const respLower = (feedbackResponse || '').toLowerCase();
      if (isCorrect || respLower.includes('correct') || respLower.includes('great job') || respLower.includes('well done') || respLower.includes('perfect') || respLower.includes("that's right")) {
        setAiCorrectCount(prev => prev + 1);
        setConsecutiveCorrect(prev => prev + 1);
      } else if (respLower.includes('not quite') || respLower.includes('incorrect') || respLower.includes('not correct')) {
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
      
      // Send error to AI
      const errorMessage = `I tried this query but got an error:\n\`\`\`sql\n${query}\n\`\`\`\nError: ${err.message}`;
      setAiMessages(prev => [...prev, { role: "user", content: errorMessage }]);
      setAiLoading(true);

      const lesson = aiLessons[currentAiLesson];
      const conversationHistory = [
        ...aiMessages.map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: errorMessage }
      ];

      const response = await callAI(
        conversationHistory,
        getAISystemPrompt(lesson, 'feedback') + "\nThe student's query had an error. Help them understand what went wrong."
      );

      const errorResponse = response || `There's a syntax error in your query. The error message says: "${err.message}"\n\nCommon issues:\n- Missing asterisk (*) after SELECT\n- Typos in table or column names\n- Missing quotes around text values\n\nTry fixing the error and submit again!`;
      
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
      
      if (userValues === expectedValues) {
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
            </div>
            
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
                }}
                className="text-purple-400 hover:text-purple-300 font-medium"
              >
                {authMode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
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
                {currentUser?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-bold">{currentUser}</h3>
                <p className="text-purple-300">{currentLevel.name} • {xp} XP</p>
              </div>
            </div>
            
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
              <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-xs font-bold">
                {currentUser?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium hidden sm:inline">{currentUser}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4">
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
