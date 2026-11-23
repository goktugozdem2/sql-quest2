// The Debug question type — the pure half (design PR #248, 2026-11-23).
//
// A Debug item is a challenge with `type: 'debug'` (src/data/debug-challenges.js):
// the editor opens on an AI's wrong query, the person may tap the line they
// think is wrong (the "spot" step, optional, scored only here), then fixes
// the query and submits it through the same grader as any challenge.
//
// debugStats (userData.debugStats, rides the autosave):
//   { spots: { [id]: { line, correct } },   the FIRST tap on an item only
//     fixes: { [id]: { attempted: true, solved: bool } } }
// Spot accuracy = spots correct ÷ items spotted. Fix rate = items solved ÷
// items with at least one submit. It is not a Skillmap axis (decision
// 2026-11-22): the skill credit comes from the item's own tags.

export const isDebugChallenge = (c) => !!(c && c.type === 'debug');

/** The flag is on only when it is literally true (a missing key reads true in FF). */
export const debugQuestionsOn = (flags) =>
  !!(flags && flags.features && flags.features.debugQuestions === true);

/** The AI's query in the person's language (same SQL, comments translated). */
export function brokenQueryFor(challenge, lang = 'en') {
  if (!isDebugChallenge(challenge)) return '';
  if (lang === 'tr' && challenge.brokenQuery_tr) return challenge.brokenQuery_tr;
  return challenge.brokenQuery || '';
}

/**
 * What the editor opens on. A saved draft always wins; the AI's query fills
 * the editor only when `challengeQueries[id]` holds nothing. Returns null for
 * a non-debug challenge, so the caller's own branches (the first-run starter)
 * run unchanged.
 */
export function debugEditorValue(challenge, savedQuery, lang = 'en') {
  if (!isDebugChallenge(challenge)) return null;
  const saved = typeof savedQuery === 'string' ? savedQuery : '';
  if (saved.trim()) return saved;
  return brokenQueryFor(challenge, lang);
}

/** Is a 1-based line one of the item's bug lines? */
export const isBugLine = (challenge, line) =>
  isDebugChallenge(challenge) && Array.isArray(challenge.bugLines) && challenge.bugLines.includes(Number(line));

export function emptyDebugStats() {
  return { spots: {}, fixes: {} };
}

function base(stats) {
  const s = stats && typeof stats === 'object' ? stats : {};
  return { spots: { ...(s.spots || {}) }, fixes: { ...(s.fixes || {}) } };
}

/**
 * Record a spot tap. Only the first tap on an item is scored — tapping every
 * line until one is right would make the number meaningless. Never mutates.
 */
export function recordDebugSpot(stats, challenge, line) {
  const next = base(stats);
  if (!isDebugChallenge(challenge)) return next;
  const key = String(challenge.id);
  if (next.spots[key]) return next;
  next.spots[key] = { line: Number(line), correct: isBugLine(challenge, line) };
  return next;
}

/** Record a submit (solved or not). Solved is sticky. Never mutates. */
export function recordDebugFix(stats, challenge, solved) {
  const next = base(stats);
  if (!isDebugChallenge(challenge)) return next;
  const key = String(challenge.id);
  const prev = next.fixes[key];
  next.fixes[key] = { attempted: true, solved: !!(solved || (prev && prev.solved)) };
  return next;
}

/** Totals for the profile and the Coach. Rates are null with no denominator. */
export function debugStatsSummary(stats) {
  const s = base(stats);
  const spots = Object.values(s.spots);
  const fixes = Object.values(s.fixes).filter(f => f && f.attempted);
  const spotsCorrect = spots.filter(x => x && x.correct).length;
  const fixesSolved = fixes.filter(f => f.solved).length;
  return {
    spotsAttempted: spots.length,
    spotsCorrect,
    spotRate: spots.length ? Math.round((100 * spotsCorrect) / spots.length) : null,
    fixesAttempted: fixes.length,
    fixesSolved,
    fixRate: fixes.length ? Math.round((100 * fixesSolved) / fixes.length) : null,
  };
}

/** The one line shown on a solve: what the bug was, and its trap page if any. */
export function debugBugLine(challenge, lang = 'en') {
  if (!isDebugChallenge(challenge)) return null;
  const text = (lang === 'tr' && challenge.bugNote_tr) ? challenge.bugNote_tr : (challenge.bugNote || '');
  if (!text) return null;
  return { text, trapHref: challenge.trap ? `/${challenge.trap}/` : null };
}
