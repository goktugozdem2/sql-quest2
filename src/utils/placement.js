// First-run placement — the pure half (P0-2 on the founder's 2026-09-12 list).
//
// Round 1 is the four recognition questions the quiz has had since 2026-08:
// what SELECT returns, which clause filters, what COUNT counts, what a JOIN
// is for. On 2026-08-14 the quiz stopped mapping 4/4 to 'advanced' — that
// mapping had made challenge 1 the front door for half of all first contacts
// and 75% of them never finished it (ledger: "placement quiz tops out at
// 'working', not 'advanced'", HIT). Recognising the basics is not
// interview-readiness.
//
// So readiness is now EARNED: a full score on round 1 opens a second round
// of four recognition questions on what an interview actually asks —
// window functions, a CTE, NULL comparison, the anti-join — and only a
// pass there (3 of 4) places someone on the interview-ready track. Anyone
// else lands where the cap put them. With `adaptive` off the result is
// byte-for-byte what the quiz returned before this module existed.
//
// Four tiers, four ids that already exist in FIRST_RUN_LEVELS:
//   brand-new → Foundations · basics → Intermediate ·
//   working → Advanced · advanced → Interview-ready

export const PLACEMENT_TIERS = Object.freeze({
  'brand-new': 'Foundations',
  basics: 'Intermediate',
  working: 'Advanced',
  advanced: 'Interview-ready',
});

export const ROUND1_FULL_SCORE = 4;
export const ROUND2_PASS_SCORE = 3;

const asObject = (v) => (v && typeof v === 'object' ? v : {});

/** Answered count and score for one round's questions against the answer map. */
export function scoreRound(questions, answers) {
  const qs = Array.isArray(questions) ? questions : [];
  const a = asObject(answers);
  let answered = 0;
  let score = 0;
  for (const q of qs) {
    if (!q || !a[q.id]) continue;
    answered += 1;
    const opt = (q.options || []).find(o => o && o.id === a[q.id]);
    score += (opt && Number(opt.points)) || 0;
  }
  return { answered, score, total: qs.length };
}

/** The level a round-1 score maps to — the 08-14 cap, unchanged. */
export function levelForRound1(score) {
  return score <= 1 ? 'brand-new' : score === 2 ? 'basics' : 'working';
}

/** With the second round: readiness needs a full round 1 AND a pass on round 2. */
export function levelForScores(score1, score2, adaptive) {
  if (!adaptive) return levelForRound1(score1);
  if (score1 < ROUND1_FULL_SCORE) return levelForRound1(score1);
  if (score2 === null || score2 === undefined) return 'working';
  return score2 >= ROUND2_PASS_SCORE ? 'advanced' : 'working';
}

/**
 * The whole quiz state from the answer map.
 * `complete` means a recommendation can be shown; while round 2 is open the
 * quiz is not complete until its four are answered.
 */
export function placementResult({ round1, round2, answers, adaptive = false }) {
  const r1 = scoreRound(round1, answers);
  const round2Active = !!adaptive && r1.answered === r1.total && r1.total > 0 && r1.score >= ROUND1_FULL_SCORE;
  if (!round2Active) {
    const levelId = levelForRound1(r1.score);
    return {
      total: r1.total,
      answeredCount: r1.answered,
      score: r1.score,
      score2: null,
      round2Active: false,
      round2Complete: false,
      complete: r1.answered === r1.total && r1.total > 0,
      levelId,
      tier: adaptive ? PLACEMENT_TIERS[levelId] : null,
    };
  }
  const r2 = scoreRound(round2, answers);
  const round2Complete = r2.answered === r2.total && r2.total > 0;
  const levelId = round2Complete ? levelForScores(r1.score, r2.score, true) : 'working';
  return {
    total: r1.total + r2.total,
    answeredCount: r1.answered + r2.answered,
    score: r1.score,
    score2: round2Complete ? r2.score : null,
    round2Active: true,
    round2Complete,
    complete: round2Complete,
    levelId,
    tier: PLACEMENT_TIERS[levelId],
  };
}

/** What `placement_completed` carries. Scores, never the answers. */
export function placementEventPayload(result, source = 'quiz') {
  const r = result || {};
  return {
    source,
    levelId: r.levelId || null,
    tier: r.levelId ? PLACEMENT_TIERS[r.levelId] || null : null,
    score1: typeof r.score === 'number' ? r.score : null,
    score2: typeof r.score2 === 'number' ? r.score2 : null,
    round2: !!r.round2Active,
  };
}

// ── The Coach stops asking twice (2026-09-12) ─────────────────────────────
// A first-run placement — the quiz, or a level picked by hand — IS a
// placement. Behind `coachTrustQuizPlacement`, a Coach goal started by
// someone the first run already placed does not get the Coach's own
// five-challenge placement check; the tier becomes seed floors that only the
// engine's skipIf clauses see (src/utils/coach.js applySeedFloors). The radar
// keeps showing what was measured, and graduation reads the radar.
//
// Floors sit exactly on the goals' skipIf thresholds (gte 60 / 70): a tier
// skips the intro lessons on what it evidences and nothing more. Challenges
// still gate; a floor never solves anything.

export const FIRST_RUN_PLACEMENT_SOURCES = Object.freeze([
  'first_run_placement_quiz',
  'first_run_manual_or_recommendation',
  'first_run_completed',
]);

export const COACH_SEED_FLOORS = Object.freeze({
  'brand-new': Object.freeze({}),
  basics: Object.freeze({ 'Querying Basics': 70 }),
  working: Object.freeze({ 'Querying Basics': 70, 'Aggregation & Grouping': 60, 'Joins': 60 }),
  advanced: Object.freeze({
    'Querying Basics': 70, 'Aggregation & Grouping': 70, 'Joins': 70,
    'Conditional Logic': 60, 'Subqueries & CTEs': 60, 'Window Functions': 60,
  }),
});

export function seedFloorsFor(levelId) {
  return { ...(COACH_SEED_FLOORS[levelId] || {}) };
}

/** The first-run placement this browser holds, or null. Reads the legacy onboarding record the quiz and the manual pick both write. */
export function readFirstRunPlacement(storage) {
  try {
    const raw = storage && storage.getItem('sqlquest_onboarding_data');
    if (!raw) return null;
    const rec = JSON.parse(raw);
    if (!rec || typeof rec !== 'object') return null;
    if (!FIRST_RUN_PLACEMENT_SOURCES.includes(rec.source)) return null;
    if (!PLACEMENT_TIERS[rec.firstRunLevel]) return null;
    return { level: rec.firstRunLevel, source: rec.source, placedAt: typeof rec.placedAt === 'string' ? rec.placedAt : null };
  } catch (_) {
    return null;
  }
}

/**
 * What a new Coach goal gets: the Coach's own placement (cold user), the
 * first-run placement honoured (trusted), or nothing (warm user).
 */
export function coachPlacementFor({ trust = false, firstRun = null, cold = false, placementIds = [], now = Date.now() } = {}) {
  const at = new Date(Number(now)).toISOString();
  if (trust && firstRun && PLACEMENT_TIERS[firstRun.level]) {
    return {
      placement: { challengeIds: placementIds, minAnswered: 5, skipped: true, skippedBy: 'first_run_quiz', level: firstRun.level, at },
      seedFloors: { source: 'first_run_quiz', level: firstRun.level, floors: seedFloorsFor(firstRun.level), at },
      skippedBy: 'first_run_quiz',
    };
  }
  if (cold) {
    return { placement: { challengeIds: placementIds, minAnswered: 5, skipped: false }, seedFloors: null, skippedBy: null };
  }
  return { placement: undefined, seedFloors: null, skippedBy: null };
}
