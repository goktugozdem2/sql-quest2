// Run is not Submit — a one-line nudge after a new person's Run (2026-11-23).
//
// ── What was measured (docs/reads/onboarding-2026-11-23.md) ─────────────────
// First app opens 11-09 → 11-23, people by aid, bots and the topic-page
// crawler out: 143 people ran a query. Their first run was Run for 100 and
// Submit for 41. Of the Submit-first people 90% solved and none left without
// graded feedback. Of the Run-first people 72% solved, and 21 left having
// never been graded at all — no solve, no wrong result, no SQL error. That is
// two thirds of everyone who ran and did not solve (21 of 32).
//
// The walk showed why on challenge 91, the first screen for most new people:
// Run on the empty editor writes the starter (#101) — `SELECT * FROM
// passengers LIMIT 10;`, which is the whole answer — and shows a table that
// is identical to the Expected Output under it. Nothing on the screen says
// the challenge is not complete until Submit is pressed.
//
// ── The test ────────────────────────────────────────────────────────────────
// Behind `runSubmitNudge`, a person with ZERO solves whose Run returns rows on
// a challenge they have not solved is assigned an arm once (murmur-finalised
// hash of the aid, `run_submit_nudge_assigned`). Arm `nudge` gets one line in
// the Your Output panel: "This matches the expected output. Press Submit to
// complete the challenge." when it does, else "Run only shows your output.
// Submit checks it against the expected output." Arm `control` sees today's
// panel. Nothing is asked, gated or priced, and nothing changes before the
// first run, so `open_to_first_run` (read to 12-20) is untouched.
//
// Read: `first_solve_10m` measured from assignment, by arm (the
// `company_direct_split` shape). Ledger: "Run is not Submit".

export const RUN_SUBMIT_NUDGE_TEST_ID = 'run_submit_nudge_v1';
export const RUN_SUBMIT_NUDGE_ARMS = ['control', 'nudge'];
export const RUN_SUBMIT_NUDGE_KEY = 'sqlquest_run_submit_nudge_v1';

export const RUN_SUBMIT_NUDGE_COPY = Object.freeze({
  match: 'This matches the expected output. Press Submit to complete the challenge.',
  check: 'Run only shows your output. Submit checks it against the expected output.',
});

// FNV-style hash with the murmur3 finalizer (CLAUDE.md "A/B hash trap"):
// without the finalizer the low bit is the parity of the characters' sum and
// every two-arm test salted this way is a mirror of every other one.
export function runSubmitNudgeArm(aid) {
  let h = 2166136261;
  const s = `${String(aid)}:${RUN_SUBMIT_NUDGE_TEST_ID}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return RUN_SUBMIT_NUDGE_ARMS[(h >>> 0) % RUN_SUBMIT_NUDGE_ARMS.length];
}

export function normalizeRunSubmitNudgeRecord(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return RUN_SUBMIT_NUDGE_ARMS.includes(raw.arm) ? { arm: raw.arm, at: Number(raw.at) || 0 } : null;
}

// Who is in the test at this Run. Only the first solve: a person with any
// solve is outside it, so the 1 → 3 and 3 → 6 reads (B1) are untouched.
export function runSubmitNudgeEligible({
  flagOn = false,
  solvedCount = 0,
  challengeSolved = false,
  hasRows = false,
  error = null,
  mutates = false,
} = {}) {
  if (!flagOn) return false;
  if (solvedCount > 0 || challengeSolved) return false;
  if (error || !hasRows) return false;
  if (mutates) return false; // a write challenge's Run output is not its graded result
  return true;
}

// The arm for this browser: the stored one wins (sticky), else the hash.
// `assign` is true only the first time, so the assignment event is written once.
export function runSubmitNudgeDecision({ eligible = false, stored = null, aid = null } = {}) {
  if (!eligible) return { arm: null, assign: false, show: false };
  const rec = normalizeRunSubmitNudgeRecord(stored);
  if (rec) return { arm: rec.arm, assign: false, show: rec.arm === 'nudge' };
  if (!aid) return { arm: null, assign: false, show: false };
  const arm = runSubmitNudgeArm(aid);
  return { arm, assign: true, show: arm === 'nudge' };
}

export function runSubmitNudgeKind(matches) {
  return matches ? 'match' : 'check';
}
