// ============================================================================
// FIXED CODE SNIPPETS FOR SQL QUEST
// ============================================================================

// ========== FIX 1: Tailwind Dynamic Classes in Blitz Mode ==========
// Location: Lines 17236-17247
// BEFORE (BROKEN):
{[
  { points: '10 pts', label: 'Easy', color: 'green' },
  { points: '20 pts', label: 'Medium', color: 'yellow' },
  { points: '30 pts', label: 'Hard', color: 'red' }
].map(d => (
  <div key={d.label} className={`bg-${d.color}-500/10 border border-${d.color}-500/30 rounded-lg p-3`}>

// AFTER (FIXED):
{[
  { points: '10 pts', label: 'Easy', color: 'green' },
  { points: '20 pts', label: 'Medium', color: 'yellow' },
  { points: '30 pts', label: 'Hard', color: 'red' }
].map(d => (
  <div key={d.label} className={`rounded-lg p-3 ${
    d.color === 'green' ? 'bg-green-500/10 border border-green-500/30' :
    d.color === 'yellow' ? 'bg-yellow-500/10 border border-yellow-500/30' :
    'bg-red-500/10 border border-red-500/30'
  }`}>
    <p className={`font-bold ${
      d.color === 'green' ? 'text-green-400' :
      d.color === 'yellow' ? 'text-yellow-400' :
      'text-red-400'
    }`}>{d.points}</p>
    <p className="text-xs text-gray-400">{d.label}</p>
  </div>
))}


// ========== FIX 2: Tailwind Dynamic Classes in Read/Explain Mode ==========
// Location: Lines 19277-19286
// BEFORE (BROKEN):
{[
  { label: 'Easy', xp: '10 XP', color: 'green', desc: 'Basic SELECT, WHERE, ORDER BY' },
  { label: 'Medium', xp: '20 XP', color: 'yellow', desc: 'GROUP BY, HAVING, subqueries' },
  { label: 'Hard', xp: '30 XP', color: 'red', desc: 'Window functions, CTEs, correlated' }
].map(d => (
  <div key={d.label} className={`bg-${d.color}-500/10 border border-${d.color}-500/30 rounded-lg p-3`}>

// AFTER (FIXED):
{[
  { label: 'Easy', xp: '10 XP', color: 'green', desc: 'Basic SELECT, WHERE, ORDER BY' },
  { label: 'Medium', xp: '20 XP', color: 'yellow', desc: 'GROUP BY, HAVING, subqueries' },
  { label: 'Hard', xp: '30 XP', color: 'red', desc: 'Window functions, CTEs, correlated' }
].map(d => (
  <div key={d.label} className={`rounded-lg p-3 ${
    d.color === 'green' ? 'bg-green-500/10 border border-green-500/30' :
    d.color === 'yellow' ? 'bg-yellow-500/10 border border-yellow-500/30' :
    'bg-red-500/10 border border-red-500/30'
  }`}>
    <p className={`font-bold ${
      d.color === 'green' ? 'text-green-400' :
      d.color === 'yellow' ? 'text-yellow-400' :
      'text-red-400'
    }`}>{d.xp}</p>
    <p className="text-xs text-gray-400">{d.label}</p>
  </div>
))}


// ========== FIX 3: Speed Run Timer Cleanup ==========
// Location: Lines 2651-2670
// BEFORE (has dependency issue):
useEffect(() => {
  let interval;
  if (speedRunActive && speedRunTimer > 0) {
    interval = setInterval(() => {
      setSpeedRunTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          endSpeedRun();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }
  return () => clearInterval(interval);
}, [speedRunActive, speedRunTimer]); // speedRunTimer causes re-render every second

// AFTER (FIXED):
useEffect(() => {
  if (!speedRunActive) return;
  
  const interval = setInterval(() => {
    setSpeedRunTimer(prev => {
      if (prev <= 1) {
        endSpeedRun();
        return 0;
      }
      return prev - 1;
    });
  }, 1000);
  
  return () => {
    clearInterval(interval);
  };
}, [speedRunActive]); // Only depend on speedRunActive


// ========== FIX 4: Boss Battle Validation ==========
// Location: Around line 4025
// BEFORE (no validation):
const startBossBattle = (skillTopic) => {
  const bossQuestions = getChallengesForTopic(skillTopic, 'hard');
  const boss = {
    ...sqlBosses[skillTopic],
    currentHP: sqlBosses[skillTopic].maxHP,
    totalQuestions: bossQuestions.length,
    questionsRemaining: bossQuestions.length
  };
  setCurrentBoss(boss);

// AFTER (FIXED):
const startBossBattle = (skillTopic) => {
  const bossQuestions = getChallengesForTopic(skillTopic, 'hard');
  
  // Validate questions exist
  if (!bossQuestions || bossQuestions.length === 0) {
    console.error(`No ${skillTopic} questions available for boss battle`);
    setShowNotification({
      type: 'error',
      message: `No ${skillTopic} challenges available. Try a different skill!`
    });
    return;
  }
  
  const boss = {
    ...sqlBosses[skillTopic],
    currentHP: sqlBosses[skillTopic].maxHP,
    totalQuestions: bossQuestions.length,
    questionsRemaining: bossQuestions.length,
    questions: bossQuestions,
    skill: skillTopic
  };
  
  setCurrentBoss(boss);
  setBossBattleMode(true);
  playSound('boss-start');
};


// ========== FIX 5: Data Loading Check ==========
// Add near top of component (after state declarations)
const [dataLoaded, setDataLoaded] = useState(false);
const [dataError, setDataError] = useState(null);

// Add this useEffect
useEffect(() => {
  const checkData = () => {
    try {
      // Check if challenge data is loaded
      if (!window.challengesData || window.challengesData.length === 0) {
        console.warn('Challenge data not found on window object');
        setDataError('Challenge data not loaded');
        
        // Try to load from data.js if it exists
        const existingScript = document.querySelector('script[src*="data.js"]');
        if (!existingScript) {
          const script = document.createElement('script');
          script.src = '/data.js';
          script.async = true;
          script.onload = () => {
            if (window.challengesData) {
              setDataLoaded(true);
              setDataError(null);
            }
          };
          script.onerror = () => setDataError('Failed to load challenge data');
          document.body.appendChild(script);
        }
      } else {
        setDataLoaded(true);
      }
    } catch (error) {
      console.error('Error checking data:', error);
      setDataError(error.message);
    }
  };
  
  checkData();
}, []);


// ========== FIX 6: Exercise Navigation Safety ==========
// Location: Around line 18680
// BEFORE (potential array access error):
<h3 className="text-lg font-bold mb-4">
  {aiLessons[selectedExerciseLesson].exercises[currentExerciseIndex].question}
</h3>

// AFTER (FIXED):
{(() => {
  const currentLesson = aiLessons[selectedExerciseLesson];
  if (!currentLesson) {
    console.error('Lesson not found:', selectedExerciseLesson);
    return <p className="text-red-400">Error: Lesson not found</p>;
  }
  
  const currentExercise = currentLesson.exercises[currentExerciseIndex];
  if (!currentExercise) {
    console.error('Exercise not found:', currentExerciseIndex);
    return <p className="text-red-400">Error: Exercise not found</p>;
  }
  
  return (
    <h3 className="text-lg font-bold mb-4">
      {currentExercise.question}
    </h3>
  );
})()}


// ========== FIX 7: Explain Query AI Error Handling ==========
// Location: Lines 2890-2918
// BEFORE (minimal error handling):
try {
  const resp = await callAI([
    { role: 'user', content: `SQL Query:\n${explainQuery.query}...` }
  ], 'You are a SQL teacher...');
  
  if (resp && typeof resp === 'string') {
    const jsonMatch = resp.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      aiScore = parsed.score;
      aiFeedback = parsed.feedback + (parsed.missing ? ` Missing: ${parsed.missing}` : '');
    }
  }
} catch (error) {
  console.error('AI eval error:', error);
}

// AFTER (FIXED):
let aiEvaluationFailed = false;
try {
  const resp = await callAI([
    { role: 'user', content: `SQL Query:\n${explainQuery.query}\n\nStudent's explanation:\n"${explainAnswer}"\n\nCorrect explanation: "${explainQuery.explanation}"\n\nRate the student's explanation from 0-100 on accuracy and completeness. Respond ONLY with JSON: {"score": <number>, "feedback": "<1-2 sentence feedback>", "missing": "<what they missed, if anything>"}` }
  ], 'You are a SQL teacher evaluating a student\'s ability to explain what a SQL query does. Be encouraging but accurate. If they got the gist right, give at least 60. Focus on whether they understand the query\'s PURPOSE and KEY operations.');
  
  if (resp && typeof resp === 'string') {
    const jsonMatch = resp.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Validate score is a number between 0-100
        if (typeof parsed.score === 'number' && parsed.score >= 0 && parsed.score <= 100) {
          aiScore = Math.round(parsed.score);
          aiFeedback = parsed.feedback || 'AI evaluation completed';
          
          if (parsed.missing && parsed.missing.trim()) {
            aiFeedback += ` Missing: ${parsed.missing}`;
          }
        } else {
          console.warn('Invalid AI score:', parsed.score);
          aiEvaluationFailed = true;
        }
      } catch (parseError) {
        console.error('Failed to parse AI JSON response:', parseError);
        aiEvaluationFailed = true;
      }
    } else {
      console.warn('No JSON found in AI response');
      aiEvaluationFailed = true;
    }
  } else {
    console.warn('Invalid AI response format');
    aiEvaluationFailed = true;
  }
} catch (error) {
  console.error('AI evaluation failed:', error);
  aiEvaluationFailed = true;
}

// If AI evaluation failed, fall back to keyword scoring only
if (aiEvaluationFailed) {
  console.log('Falling back to keyword-only scoring');
  aiScore = null;
  aiFeedback = '';
}


// ========== FIX 8: Daily Workout Date Comparison ==========
// Location: Around line 17436
// BEFORE:
disabled={lastWorkoutDate === new Date().toDateString() && workoutCompleted}

// AFTER (FIXED):
{(() => {
  const today = new Date().toDateString();
  const isCompletedToday = lastWorkoutDate === today && workoutCompleted;
  
  return (
    <button
      onClick={startDailyWorkout}
      disabled={isCompletedToday}
      className={`w-full py-2 rounded-lg font-medium text-sm ${
        isCompletedToday
          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
          : 'bg-green-600 hover:bg-green-700 text-white'
      }`}
    >
      {isCompletedToday ? '✓ Completed Today' : '▶ Start Workout'}
    </button>
  );
})()}


// ========== BONUS: Add Loading State for Modes ==========
// Add this before rendering mode content

// For Blitz Mode
{!dataLoaded && practiceSubTab === 'speed-run' && (
  <div className="max-w-4xl mx-auto">
    <div className="bg-black/30 rounded-xl border border-yellow-500/30 p-8 text-center">
      <div className="animate-spin text-6xl mb-4">⏳</div>
      <p className="text-gray-400">Loading challenges...</p>
      {dataError && (
        <p className="text-red-400 text-sm mt-2">{dataError}</p>
      )}
    </div>
  </div>
)}

// For Train Mode
{!dataLoaded && practiceSubTab === 'skill-forge' && (
  <div className="max-w-4xl mx-auto">
    <div className="bg-black/30 rounded-xl border border-orange-500/30 p-8 text-center">
      <div className="animate-spin text-6xl mb-4">⏳</div>
      <p className="text-gray-400">Loading training data...</p>
      {dataError && (
        <p className="text-red-400 text-sm mt-2">{dataError}</p>
      )}
    </div>
  </div>
)}


// ========== BONUS: Error Boundary Component ==========
// Add this near the top of the file, after imports

class ModeErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Mode error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-500/10 rounded-xl border border-red-500/30 p-8 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold mb-2 text-red-400">Something went wrong</h2>
            <p className="text-gray-400 mb-4">
              {this.state.error?.message || 'An error occurred in this mode'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-xl font-bold"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Then wrap each mode in the error boundary:
<ModeErrorBoundary>
  {activeTab === 'quests' && practiceSubTab === 'speed-run' && (
    // ... speed run content
  )}
</ModeErrorBoundary>
