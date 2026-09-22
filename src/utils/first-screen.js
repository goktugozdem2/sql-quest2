// The first screen test — quiz or challenge (2026-09-23).
//
// ── What was measured ───────────────────────────────────────────────────────
// First app open 2026-08-24 → 09-20, 1,533 people: 646 (42%) never opened a
// challenge. Every new visitor lands on the Learning Path tab, whose first
// screen is "Find your SQL starting point" — a four-question placement quiz.
// 406 of the 646 saw that screen in their first minute; 15 finished the quiz.
// On mobile 64% never open a challenge (140 people), on desktop 40%. The
// quiz asks for four answers before the product shows anything it does;
// nothing on it is SQL the visitor writes.
//
// ── The test ────────────────────────────────────────────────────────────────
// Behind `firstScreenChallenge`, a first-run visitor on the start screen is
// split by a hash of their anonymous id: arm `quiz` sees today's screen, arm
// `challenge` is put straight into challenge 91 ("start from zero") in the
// editor — the same door the quiz's "Start from zero" choice opens with the
// lesson skipped. The arm is sticky per browser (localStorage) and per aid
// (the hash), and it is written once as `first_screen_assigned {arm}` so the
// read has a denominator for both arms.
//
// Read: `first_solve_10m` by arm (docs/agent/metrics.md, `first_screen_split`).
// Ledger: "the first screen is a challenge, not a quiz".

export const FIRST_SCREEN_TEST_ID = 'first_screen_v1';
export const FIRST_SCREEN_ARMS = ['quiz', 'challenge'];
export const FIRST_SCREEN_STORAGE_KEY = 'sqlquest_first_screen_v1';

// Same FNV-style hash as the homepage CTA test in src/track.js, salted with
// this test's id so the two tests' arms are independent.
export function firstScreenArm(aid) {
  let h = 2166136261;
  const s = `${String(aid)}:${FIRST_SCREEN_TEST_ID}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return FIRST_SCREEN_ARMS[h % FIRST_SCREEN_ARMS.length];
}

// Whether to assign (and, for the challenge arm, act) now. Everything that is
// already a decision the visitor made — a deep link to a challenge, a level
// they chose, the intake or the zero-SQL lesson on screen — wins over the test.
export function firstScreenDecision({
  flagOn = false,
  onStartScreen = false,
  showingOtherStep = false,
  levelChosen = false,
  stored = null,
  aid = null,
} = {}) {
  if (!flagOn || !onStartScreen || showingOtherStep || levelChosen) return { assign: false, arm: null, act: false };
  if (stored && FIRST_SCREEN_ARMS.includes(stored.arm)) {
    // Assigned on an earlier visit: keep the arm, never re-announce it, and
    // do not push a returning quiz-arm visitor anywhere. A challenge-arm
    // visitor back on the start screen (they left the challenge unsolved)
    // goes back into it: that is what the arm is.
    return { assign: false, arm: stored.arm, act: stored.arm === 'challenge' };
  }
  if (!aid) return { assign: false, arm: null, act: false };
  const arm = firstScreenArm(aid);
  return { assign: true, arm, act: arm === 'challenge' };
}
