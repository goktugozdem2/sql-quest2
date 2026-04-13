/**
 * Pure functions for the Socratic AI Tutor phase machine.
 * Extracted for testability — no React state, no side effects.
 */

/**
 * Regex to detect "I don't know" variants.
 * Used at ATTEMPT and DISCOVER phases to route to REVEAL.
 */
export const IDK_REGEX = /\b(idk|don'?t know|no idea|i can'?t|not sure|no clue|help me|i'?m lost|i give up|show me)\b/i;

/**
 * Detect if a response contains SQL keywords (student is thinking in SQL).
 */
export const SQL_KEYWORD_REGEX = /\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|JOIN|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|COUNT|SUM|AVG|MIN|MAX|DISTINCT|LIMIT|OFFSET|AS|AND|OR|NOT|IN|BETWEEN|LIKE|IS NULL|UNION)\b/i;

/**
 * Determine the next phase in the Socratic tutor flow.
 *
 * @param {string} currentPhase - Current phase name
 * @param {string} userMessage - The user's message text
 * @param {object} state - Current state: { discoverRounds, consecutiveCorrect, comprehensionConsecutive }
 * @returns {{ nextPhase: string, stateUpdates: object }} - Next phase and any state changes
 */
export function getNextPhase(currentPhase, userMessage, state = {}) {
  const { discoverRounds = 0, consecutiveCorrect = 0, comprehensionConsecutive = 0 } = state;
  const isIdk = IDK_REGEX.test(userMessage);

  switch (currentPhase) {
    case 'hook':
      return { nextPhase: 'probe', stateUpdates: {} };

    case 'probe':
      return { nextPhase: 'attempt', stateUpdates: {} };

    case 'attempt':
      if (isIdk) {
        return {
          nextPhase: 'reveal',
          stateUpdates: { skippedAttempt: true, studentHistory: 'needed_full_reveal' }
        };
      }
      return {
        nextPhase: 'discover',
        stateUpdates: { attemptSQL: userMessage, discoverRounds: 0, studentHistory: 'nailed_attempt' }
      };

    case 'discover': {
      const newRounds = discoverRounds + 1;
      if (newRounds >= 2 || isIdk) {
        return {
          nextPhase: 'reveal',
          stateUpdates: {
            discoverRounds: newRounds,
            studentHistory: newRounds >= 1 ? 'struggled_discover' : undefined
          }
        };
      }
      return {
        nextPhase: 'discover',
        stateUpdates: { discoverRounds: newRounds }
      };
    }

    case 'reveal':
      return { nextPhase: 'practice', stateUpdates: {} };

    case 'practice':
      return { nextPhase: 'feedback', stateUpdates: {} };

    case 'feedback':
      if (consecutiveCorrect >= 3) {
        return { nextPhase: 'mastery', stateUpdates: {} };
      }
      return { nextPhase: 'practice', stateUpdates: {} };

    case 'mastery':
      // Stay in mastery until [RESULT:mastery] is parsed from AI response
      return { nextPhase: 'mastery', stateUpdates: {} };

    case 'comprehension':
      return { nextPhase: 'comprehension_feedback', stateUpdates: {} };

    case 'comprehension_feedback':
      if (comprehensionConsecutive >= 3) {
        return { nextPhase: 'comprehension_feedback', stateUpdates: {} };
      }
      return { nextPhase: 'comprehension', stateUpdates: {} };

    default:
      return { nextPhase: currentPhase, stateUpdates: {} };
  }
}

/**
 * Analyze student signals from their response.
 *
 * @param {string} message - The student's message
 * @param {object} context - { phaseStartTime, expectedQuery }
 * @returns {object} - Signal analysis
 */
export function analyzeStudentSignals(message, context = {}) {
  const { phaseStartTime = Date.now(), expectedQuery = '' } = context;
  const responseTime = Date.now() - phaseStartTime;

  return {
    isShort: message.length < 10,
    containsSQL: SQL_KEYWORD_REGEX.test(message),
    isIdk: IDK_REGEX.test(message),
    askedQuestion: message.trim().endsWith('?'),
    responseTimeSec: Math.round(responseTime / 1000),
    isSlowResponse: responseTime > 60000,
    isCopyPaste: expectedQuery && message.trim().toLowerCase() === expectedQuery.trim().toLowerCase(),
    engagement: message.length < 10 ? 'low' : message.length < 50 ? 'medium' : 'high',
    sqlFluency: SQL_KEYWORD_REGEX.test(message) ? 'attempting_sql' : 'plain_english',
  };
}

/**
 * Determine adaptive difficulty based on student history.
 *
 * @param {string} studentHistory - 'nailed_attempt' | 'struggled_discover' | 'needed_full_reveal'
 * @param {number} questionCount - Number of practice questions answered so far
 * @returns {string} - Difficulty level: 'easy' | 'easy-medium' | 'medium' | 'hard'
 */
export function getAdaptiveDifficulty(studentHistory, questionCount) {
  if (studentHistory === 'nailed_attempt') {
    return questionCount < 2 ? 'medium' : 'hard';
  }
  if (studentHistory === 'needed_full_reveal') {
    return questionCount < 2 ? 'easy' : 'easy-medium';
  }
  // struggled_discover (default)
  return questionCount < 2 ? 'easy' : 'medium';
}
