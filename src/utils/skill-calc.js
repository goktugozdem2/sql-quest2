// Skill level calculation — pure function extracted from app.jsx so it can be
// unit tested without mounting React. All inputs are arguments; no closure
// state. The 10 canonical radar skills are the single source of truth.
//
// Scoring is weighted across five signals:
//   - Success rate (45% — the main thing)
//   - Difficulty curve (25% — did you tackle hard problems)
//   - Completion rate (15% — % of available problems solved, stale-decayed)
//   - Speed (15% — nullable; reallocates when no timing data)
//   - Hint penalty (flat deduction, capped at 20)
//
// Confidence dampener: with < 4 data points, score is linearly damped toward 0
// so one lucky solve doesn't read as mastery.

const CANONICAL_SKILLS = [
  'SELECT Basics', 'Filter & Sort', 'Aggregation', 'GROUP BY',
  'JOIN Tables', 'Subqueries', 'String Functions', 'Date Functions',
  'CASE Statements', 'Window Functions'
];

// Per-signal half-life in days. Reviews decay fastest because spaced repetition
// is a forgetting check by design. Boss wins stay fresher. Completion is the
// slowest because "I solved this once" is more persistent knowledge.
const HALF_LIVES = {
  challengeAttempt: 30,
  dailyChallenge: 30,
  interview: 30,
  review: 14,       // spaced repetition — forgetting is the point
  boss: 45,         // boss wins stay fresher
  weakness: 30,
  completion: 60    // solved once counts longer
};

const SKILL_TO_RADAR = {
  // SELECT Basics
  'SELECT': 'SELECT Basics', 'SELECT Basics': 'SELECT Basics',
  'DISTINCT': 'SELECT Basics',
  // Filter & Sort
  'WHERE': 'Filter & Sort', 'Filter & Sort': 'Filter & Sort',
  'ORDER BY': 'Filter & Sort', 'LIMIT': 'Filter & Sort',
  'NULL Handling': 'Filter & Sort',
  'LIKE': 'Filter & Sort', 'BETWEEN': 'Filter & Sort',
  'IN': 'Filter & Sort', 'NOT IN': 'Filter & Sort',
  'IS NULL': 'Filter & Sort', 'IS NOT NULL': 'Filter & Sort',
  'AND': 'Filter & Sort', 'OR': 'Filter & Sort',
  'COALESCE': 'Filter & Sort', 'NULLIF': 'Filter & Sort',
  // Aggregation
  'Aggregation': 'Aggregation', 'Aggregates': 'Aggregation',
  'COUNT': 'Aggregation', 'COUNT DISTINCT': 'Aggregation',
  'SUM': 'Aggregation', 'AVG': 'Aggregation',
  'MIN': 'Aggregation', 'MAX': 'Aggregation',
  // GROUP BY
  'GROUP BY': 'GROUP BY', 'HAVING': 'GROUP BY',
  // JOIN Tables
  'JOIN': 'JOIN Tables', 'JOIN Tables': 'JOIN Tables', 'JOINs': 'JOIN Tables',
  'LEFT JOIN': 'JOIN Tables', 'RIGHT JOIN': 'JOIN Tables',
  'INNER JOIN': 'JOIN Tables', 'FULL JOIN': 'JOIN Tables',
  'CROSS JOIN': 'JOIN Tables', 'Self-Join': 'JOIN Tables',
  'Self Join': 'JOIN Tables', 'Non-Equi Join': 'JOIN Tables',
  // Subqueries (include CTEs, set ops, EXISTS — they're the "compose queries" skill)
  'Subquery': 'Subqueries', 'Subqueries': 'Subqueries',
  'Correlated Subquery': 'Subqueries',
  'CTE': 'Subqueries', 'Recursive CTE': 'Subqueries',
  'Derived Table': 'Subqueries',
  'EXISTS': 'Subqueries', 'NOT EXISTS': 'Subqueries',
  'UNION': 'Subqueries', 'UNION ALL': 'Subqueries',
  'INTERSECT': 'Subqueries', 'EXCEPT': 'Subqueries',
  'Set Operations': 'Subqueries',
  // String Functions
  'String Functions': 'String Functions', 'Strings': 'String Functions',
  'GROUP_CONCAT': 'String Functions',
  // Date Functions
  'Date Functions': 'Date Functions', 'Dates': 'Date Functions',
  // CASE Statements
  'CASE': 'CASE Statements', 'CASE Statements': 'CASE Statements',
  'Expressions': 'CASE Statements',
  // Window Functions — every window variant routes here
  'Window Functions': 'Window Functions', 'Window Function': 'Window Functions',
  'Windows': 'Window Functions',
  'ROW_NUMBER': 'Window Functions', 'RANK': 'Window Functions',
  'DENSE_RANK': 'Window Functions', 'PERCENT_RANK': 'Window Functions',
  'NTILE': 'Window Functions', 'LAG': 'Window Functions', 'LEAD': 'Window Functions',
  'FIRST_VALUE': 'Window Functions', 'LAST_VALUE': 'Window Functions',
  'PARTITION BY': 'Window Functions',
  'Frame Clause': 'Window Functions', 'ROWS BETWEEN': 'Window Functions'
  // Note: math/conversion functions (ROUND, ABS, CAST) intentionally not mapped —
  // they're not a canonical skill and shouldn't dilute other signals.
};

const TOPIC_TO_SKILL_MAPPING = {
  'Filter and Sort': 'Filter & Sort',
  'Filter & Sort': 'Filter & Sort',
  'WHERE': 'Filter & Sort',
  'ORDER BY': 'Filter & Sort',
  'Aggregation': 'Aggregation',
  'Aggregation Basics': 'Aggregation',
  'COUNT': 'Aggregation',
  'SUM': 'Aggregation',
  'AVG': 'Aggregation',
  'GROUP BY': 'GROUP BY',
  'HAVING': 'GROUP BY',
  'JOIN': 'JOIN Tables',
  'JOIN Tables': 'JOIN Tables',
  'INNER JOIN': 'JOIN Tables',
  'LEFT JOIN': 'JOIN Tables',
  'Subquery': 'Subqueries',
  'Subqueries': 'Subqueries',
  'String': 'String Functions',
  'String Functions': 'String Functions',
  'Date': 'Date Functions',
  'Date Functions': 'Date Functions',
  'CASE': 'CASE Statements',
  'CASE Statements': 'CASE Statements',
  'Window': 'Window Functions',
  'Window Functions': 'Window Functions',
  'SELECT': 'SELECT Basics',
  'SELECT Basics': 'SELECT Basics'
};

const mapTopicToSkill = (topicName) => {
  if (!topicName) return null;
  if (TOPIC_TO_SKILL_MAPPING[topicName]) return TOPIC_TO_SKILL_MAPPING[topicName];
  const topicLower = topicName.toLowerCase();
  for (const [key, value] of Object.entries(TOPIC_TO_SKILL_MAPPING)) {
    if (topicLower.includes(key.toLowerCase())) return value;
  }
  return null;
};

// Curry a decay function for a given half-life and clock reading.
// Passing `now` in makes the function deterministic for tests.
const makeTimeDecay = (halfLifeDays, now) => (timestamp) => {
  if (!timestamp) return 0.5; // unknown date gets half weight
  const ageMs = now - new Date(timestamp).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return Math.pow(0.5, ageDays / halfLifeDays);
};

/**
 * Compute skill levels (0-100) for each canonical skill from user performance inputs.
 *
 * @param {Object} inputs - User performance data
 * @param {Array} inputs.performanceEvents - Append-only log from boss/weakness/review events
 * @param {Set|Array} inputs.solvedChallenges - IDs of solved challenges
 * @param {Array} inputs.challengeAttempts - Challenge attempt records
 * @param {Array} inputs.dailyChallengeHistory - Daily challenge history
 * @param {Set|Array} inputs.warmUpAnswered - IDs of answered warm-up questions
 * @param {Set|Array} inputs.completedExercises - Completed AI lesson exercises
 * @param {Array} inputs.interviewHistory - Mock interview results
 *
 * @param {Object} [options]
 * @param {Array} [options.allChallenges] - All available challenges (for completion baseline)
 * @param {Array} [options.warmUpQuestions] - Warm-up question definitions
 * @param {Array} [options.aiLessons] - AI lesson definitions (for SOURCE 5 lookup)
 * @param {Object} [options.halfLives] - Override per-signal half-life days
 * @param {number} [options.now] - Clock reading in ms (for deterministic tests)
 * @param {number} [options.defaultActivityTs] - Fallback timestamp (ms) for ghost
 *   solves with no matching attempt record. Typically `user.lastActive`. Without
 *   this, pre-tracking solves collapse completion staleness to 0.5.
 *
 * @returns {Object} Map of skill name → level (0-100, integer)
 */
const calculateSkillLevels = (inputs = {}, options = {}) => {
  const {
    performanceEvents = [],
    solvedChallenges = new Set(),
    challengeAttempts = [],
    dailyChallengeHistory = [],
    warmUpAnswered = new Set(),
    completedExercises = new Set(),
    interviewHistory = []
  } = inputs;

  const {
    allChallenges = [],
    warmUpQuestions = [],
    aiLessons = [],
    halfLives = HALF_LIVES,
    now = Date.now(),
    defaultActivityTs = null
  } = options;

  const solvedSet = solvedChallenges instanceof Set ? solvedChallenges : new Set(solvedChallenges);
  const warmUpSet = warmUpAnswered instanceof Set ? warmUpAnswered : new Set(warmUpAnswered);
  const exerciseSet = completedExercises instanceof Set ? completedExercises : new Set(completedExercises);

  const resolve = (raw) => SKILL_TO_RADAR[raw] || SKILL_TO_RADAR[mapTopicToSkill(raw || '')] || null;

  const data = {};
  CANONICAL_SKILLS.forEach(s => {
    data[s] = {
      totalChallenges: 0, solvedChallenges: 0,
      attempts: 0, successes: 0,
      hintAttempts: 0, answerShownAttempts: 0,
      difficultyPoints: 0, maxDifficultyPoints: 0,
      solveTimeRatios: [],
      dataPoints: 0,
      lastActivityAge: Infinity // days since most recent timestamped event
    };
  });

  const diffWeight = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
  const expectedTime = { 'Easy': 120, 'Medium': 180, 'Hard': 240 };

  // Per-signal decay helpers
  const decayChallenge = makeTimeDecay(halfLives.challengeAttempt, now);
  const decayDaily = makeTimeDecay(halfLives.dailyChallenge, now);
  const decayInterview = makeTimeDecay(halfLives.interview, now);
  const decayReview = makeTimeDecay(halfLives.review, now);
  const decayBoss = makeTimeDecay(halfLives.boss, now);
  const decayWeakness = makeTimeDecay(halfLives.weakness, now);

  // Track most recent activity per skill (for completion staleness decay)
  const trackActivity = (key, timestamp) => {
    if (!timestamp || !data[key]) return;
    const ageDays = (now - new Date(timestamp).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays >= 0 && ageDays < data[key].lastActivityAge) {
      data[key].lastActivityAge = ageDays;
    }
  };

  // ── SOURCE 1: Practice Challenges (totals + solved) ──
  allChallenges.forEach(ch => {
    const skills = ch.skills || [ch.category];
    const dw = diffWeight[ch.difficulty] || 2;
    skills.forEach(skill => {
      const key = resolve(skill);
      if (key && data[key]) {
        data[key].totalChallenges++;
        data[key].maxDifficultyPoints += dw;
      }
    });
  });

  // Build two maps from tracked attempts, BEFORE processing SOURCE 1, so
  // SOURCE 1 can dedupe against SOURCE 2.
  //
  //   latestSolveTs[challengeId] — most recent successful attempt timestamp.
  //     Used to backfill activity age onto solved-challenge records so fresh
  //     solves don't collapse to the Infinity/0.5 staleness floor.
  //
  //   successCreditedSkills[challengeId] — set of canonical skills already
  //     credited with a successful attempt by SOURCE 2. Prevents double-counting
  //     when SOURCE 1 now also credits the success signal.
  const latestSolveTs = {};
  const successCreditedSkills = {};
  challengeAttempts.forEach(a => {
    if (!a || !a.success) return;
    const ts = a.timestamp || a.date;
    if (ts) {
      const ms = new Date(ts).getTime();
      if (!latestSolveTs[a.challengeId] || ms > latestSolveTs[a.challengeId]) {
        latestSolveTs[a.challengeId] = ms;
      }
    }
    const rawTopics = Array.isArray(a.topics) && a.topics.length
      ? a.topics
      : (a.topic ? [a.topic] : []);
    rawTopics.forEach(t => {
      const k = resolve(t);
      if (!k) return;
      if (!successCreditedSkills[a.challengeId]) {
        successCreditedSkills[a.challengeId] = new Set();
      }
      successCreditedSkills[a.challengeId].add(k);
    });
  });

  solvedSet.forEach(challengeId => {
    const ch = allChallenges.find(c => c.id === challengeId);
    if (ch) {
      const skills = ch.skills || [ch.category];
      const dw = diffWeight[ch.difficulty] || 2;
      const solveTs = latestSolveTs[challengeId];
      const alreadyCredited = successCreditedSkills[challengeId] || null;
      skills.forEach(skill => {
        const key = resolve(skill);
        if (key && data[key]) {
          data[key].solvedChallenges++;
          data[key].difficultyPoints += dw;
          data[key].dataPoints++;

          // Credit the success signal. A challenge in solvedChallenges IS a
          // successful attempt — just one that predates attempt tracking or
          // was pruned. Without this, users with pre-tracking solves get
          // success=0 for 55% of their score, making 37 solves read as
          // "Beginner 25/100". Skip if SOURCE 2 already credited this exact
          // (challenge, skill) pair so we don't double-count.
          if (!alreadyCredited || !alreadyCredited.has(key)) {
            data[key].attempts += 1;
            data[key].successes += 1;
          }

          // Backfill activity timestamp from the successful attempt (if
          // logged), otherwise fall back to defaultActivityTs (typically
          // user.lastActive). Without either, lastActivityAge stays at
          // Infinity and completion decays to 0.5× for a user who played
          // yesterday — which is wrong.
          if (solveTs) {
            trackActivity(key, solveTs);
          } else if (defaultActivityTs) {
            trackActivity(key, defaultActivityTs);
          }
        }
      });
    }
  });

  // ── SOURCE 2: Challenge Attempts (success rate + hints, time-weighted) ──
  // An attempt may credit multiple skills (a CASE+GROUP BY challenge counts for
  // both). Prefer the `topics` array; fall back to legacy single `topic`.
  challengeAttempts.forEach(attempt => {
    const rawTopics = Array.isArray(attempt.topics) && attempt.topics.length
      ? attempt.topics
      : (attempt.topic ? [attempt.topic] : []);
    const keys = new Set();
    rawTopics.forEach(t => { const k = resolve(t); if (k && data[k]) keys.add(k); });
    if (keys.size === 0) return;

    const ts = attempt.timestamp || attempt.date;
    const decay = decayChallenge(ts);
    keys.forEach(key => {
      trackActivity(key, ts);
      data[key].attempts += decay;
      data[key].dataPoints += decay;
      if (attempt.success) {
        if (attempt.answerShown) {
          data[key].answerShownAttempts += decay;
        } else if (attempt.hintsUsed) {
          data[key].hintAttempts += decay;
          data[key].successes += 0.8 * decay;
        } else {
          data[key].successes += decay;
        }
      }
    });
  });

  // ── SOURCE 3: Daily Challenge History (time-weighted) ──
  dailyChallengeHistory.forEach(entry => {
    const key = resolve(entry.topic);
    if (key && data[key]) {
      const ts = entry.date || entry.timestamp;
      const decay = decayDaily(ts);
      trackActivity(key, ts);
      data[key].attempts += decay;
      data[key].dataPoints += decay;
      if (entry.success || entry.coreCorrect) {
        if (entry.answerShown) {
          data[key].answerShownAttempts += decay;
        } else if (entry.hintUsed) {
          data[key].hintAttempts += decay;
          data[key].successes += 0.8 * decay;
        } else {
          data[key].successes += decay;
        }
        if (entry.solveTime && entry.difficulty) {
          const expected = expectedTime[entry.difficulty] || 180;
          data[key].solveTimeRatios.push(Math.min(2, entry.solveTime / expected));
        }
      }
      const dw = diffWeight[entry.difficulty] || 2;
      if (entry.success || entry.coreCorrect) {
        data[key].difficultyPoints += dw * decay;
        data[key].maxDifficultyPoints += dw * decay;
      } else {
        data[key].maxDifficultyPoints += dw * decay;
      }
    }
  });

  // ── SOURCE 4: Warm-Up Quiz (per topic tag) ──
  warmUpQuestions.forEach(q => {
    const key = resolve(q.topic);
    if (key && data[key] && warmUpSet.has(q.id)) {
      data[key].attempts++;
      data[key].dataPoints += 0.5;
      data[key].successes++;
    }
  });

  // ── SOURCE 5: AI Lesson Exercises ──
  exerciseSet.forEach(exerciseKey => {
    const lessonId = String(exerciseKey).split('-')[0];
    const lesson = aiLessons.find(l => l.id === lessonId);
    if (lesson) {
      const key = resolve(lesson.topic || lesson.title || '');
      if (key && data[key]) {
        data[key].successes += 0.5;
        data[key].attempts += 0.5;
        data[key].dataPoints += 0.5;
      }
    }
  });

  // ── SOURCE 6: Interview History (time-weighted) ──
  interviewHistory.forEach(result => {
    if (result.questionResults) {
      const ts = result.date || result.timestamp;
      const decay = decayInterview(ts);
      result.questionResults.forEach(qr => {
        const key = resolve(qr.topic || qr.category || result.interviewTitle || '');
        if (key && data[key]) {
          trackActivity(key, ts);
          data[key].attempts += decay;
          data[key].dataPoints += 0.7 * decay;
          if (qr.correct) data[key].successes += decay;
        }
      });
    }
  });

  // ── SOURCE 7: Performance Events (boss/weakness/review) ──
  performanceEvents.forEach(ev => {
    const key = resolve(ev.skillKey);
    if (!key || !data[key]) return;
    trackActivity(key, ev.timestamp);

    if (ev.type === 'boss_defeat') {
      const decay = decayBoss(ev.timestamp);
      data[key].attempts += decay;
      data[key].successes += decay;
      data[key].difficultyPoints += 3 * decay;
      data[key].maxDifficultyPoints += 3 * decay;
      data[key].dataPoints += 1.5 * decay;
    } else if (ev.type === 'weakness_passed') {
      const decay = decayWeakness(ev.timestamp);
      const dw = ev.payload?.difficultyWeight || 2;
      const hintsUsed = ev.payload?.hintsUsed || 0;
      data[key].attempts += decay;
      data[key].difficultyPoints += dw * decay;
      data[key].maxDifficultyPoints += dw * decay;
      data[key].dataPoints += decay;
      if (hintsUsed > 0) {
        data[key].hintAttempts += decay;
        data[key].successes += 0.8 * decay;
      } else {
        data[key].successes += decay;
      }
      const timeTaken = ev.payload?.timeTaken || 0;
      if (timeTaken > 0) {
        const expected = 90;
        data[key].solveTimeRatios.push(Math.min(2, timeTaken / expected));
      }
    } else if (ev.type === 'weakness_failed') {
      const decay = decayWeakness(ev.timestamp);
      const dw = ev.payload?.difficultyWeight || 2;
      data[key].attempts += decay;
      data[key].maxDifficultyPoints += dw * decay;
      data[key].dataPoints += 0.5 * decay;
    } else if (ev.type === 'review_success') {
      const decay = decayReview(ev.timestamp);
      const quality = ev.payload?.quality || 4;
      const credit = quality === 5 ? 1 : quality === 4 ? 0.85 : 0.6;
      data[key].attempts += decay;
      data[key].successes += credit * decay;
      data[key].dataPoints += 0.5 * decay;
    } else if (ev.type === 'review_fail') {
      const decay = decayReview(ev.timestamp);
      data[key].attempts += decay;
      data[key].dataPoints += 0.5 * decay;
    }
  });

  // ── COMPUTE FINAL SCORES ──
  const skills = {};
  CANONICAL_SKILLS.forEach(skillName => {
    const d = data[skillName];

    // Signal 1: Completion rate with staleness decay.
    // If the skill has seen activity within `completion` half-life, keep full
    // weight. Otherwise decay the completion credit toward zero.
    let completionScore = 0;
    if (d.totalChallenges > 0) {
      const rawCompletion = (d.solvedChallenges / d.totalChallenges) * 100;
      const staleness = d.lastActivityAge === Infinity
        ? (d.solvedChallenges > 0 ? 0.5 : 0) // solved long ago with no activity trail
        : Math.pow(0.5, d.lastActivityAge / halfLives.completion);
      completionScore = rawCompletion * staleness;
    }

    const successScore = d.attempts > 0
      ? (d.successes / d.attempts) * 100
      : 0;

    const difficultyScore = d.maxDifficultyPoints > 0
      ? (d.difficultyPoints / d.maxDifficultyPoints) * 100
      : 0;

    // Speed is nullable — reallocate its weight when absent rather than
    // imputing 50 (which would drag confident skills toward the mean).
    let speedScore = null;
    if (d.solveTimeRatios.length > 0) {
      const avgRatio = d.solveTimeRatios.reduce((a, b) => a + b, 0) / d.solveTimeRatios.length;
      speedScore = Math.max(0, Math.min(100, (1.5 - avgRatio) / 1.5 * 100));
    }

    let hintPenalty = 0;
    if (d.attempts > 0) {
      const hintRate = d.hintAttempts / d.attempts;
      const answerRate = d.answerShownAttempts / d.attempts;
      hintPenalty = Math.min(20, (hintRate * 5) + (answerRate * 15));
    }

    let rawScore;
    if (speedScore !== null) {
      rawScore = (
        successScore * 0.45 +
        difficultyScore * 0.25 +
        completionScore * 0.15 +
        speedScore * 0.15
      );
    } else {
      rawScore = (
        successScore * 0.55 +
        difficultyScore * 0.28 +
        completionScore * 0.17
      );
    }
    rawScore -= hintPenalty;

    // Confidence: 4 data points to reach full weight.
    const confidence = Math.min(1, d.dataPoints / 4);
    const adjustedScore = rawScore * confidence;

    skills[skillName] = Math.round(Math.max(0, Math.min(100, adjustedScore)));
  });

  return skills;
};

export {
  CANONICAL_SKILLS,
  HALF_LIVES,
  SKILL_TO_RADAR,
  mapTopicToSkill,
  calculateSkillLevels
};
