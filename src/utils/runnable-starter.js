// A runnable starter in the editor — `runnableStarter`, a desktop A/B
// (builder, 2026-11-26; founder in chat: "gelen kişiyi bir şekilde içeride
// tutalım").
//
// ── What was measured ───────────────────────────────────────────────────────
// docs/reads/open-without-run-2026-11-25.md: of 511 human first challenge
// opens in 28 days, 54% never ran that challenge. On the prefilled #91, 63 of
// 97 runners (65%) ran inside a minute; on an empty editor 22 of 139 (16%)
// did, after ~3 minutes of writing. The 11-22 change that makes Run on an
// empty editor run the starter was used twice in 28 days: the starter is a
// grey placeholder, so the editor still looks empty and nobody presses Run
// before writing.
//
// ── The test ────────────────────────────────────────────────────────────────
// Behind `runnableStarter` (off by default). Population: a DESKTOP screen
// (innerWidth ≥ 1024 and a fine pointer — phones' open → first-run cell is
// full, orchestrator 2026-11-24) and a challenge open that would show an
// empty editor (no solve yet, no saved draft, not #91, not a Debug item).
// The arm is assigned once per browser, by a hash of the aid, at the first
// such open, and written once as `runnable_starter_assigned {arm, test,
// challengeId, viewport}`.
//   control — today: the grey "Start here: SELECT * FROM t LIMIT 5;"
//             placeholder (Run on the empty editor runs it).
//   starter — the editor holds real text: one comment line saying to press
//             Run, then `SELECT * FROM <first table> LIMIT 5;`. One grey line
//             near Run says the same. The text is selected on focus while it
//             is untouched, so the first keystroke replaces it.
// Grading is untouched: Submit on the untouched starter is graded like any
// query, and the app forces it wrong if it ever matched (never a solve).
// Metric: `runnable_starter_split` (docs/agent/metrics.md, PR #401).
//
// Pure and import-free.

export const RUNNABLE_STARTER_TEST_ID = 'runnable_starter_v1';
export const RUNNABLE_STARTER_ARMS = ['control', 'starter'];
export const RUNNABLE_STARTER_KEY = 'sqlquest_runnable_starter_v1';
// The `desktop:` band of the viewport stamp (app.jsx trackActivationEvent).
export const RUNNABLE_STARTER_MIN_WIDTH = 1024;
// #91 opens prefilled for a person with no solves (ZERO_SQL_FIRST_QUERY).
export const PREFILLED_CHALLENGE_IDS = [91];

const COMMENT = {
  en: '-- Press Run to see the data first, then replace these lines with your query.',
  tr: "-- Önce veriyi görmek için Çalıştır'a bas, sonra bu satırları kendi sorgunla değiştir.",
};

/**
 * The arm for an aid. FNV-style hash salted with this test's id PLUS the
 * murmur3 finalizer (the construction of `companyAskArm`). Without the
 * finalizer the low bit is the parity of the characters' sum, and a two-arm
 * `% 2` would mirror every other two-arm test (CLAUDE.md, A/B hash trap).
 */
export function runnableStarterArm(aid) {
  let h = 2166136261;
  const s = `${String(aid)}:${RUNNABLE_STARTER_TEST_ID}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return RUNNABLE_STARTER_ARMS[(h >>> 0) % RUNNABLE_STARTER_ARMS.length];
}

/** A desktop screen: at least 1024 px wide AND a fine pointer. */
export function isDesktopScreen({ width = null, finePointer = false } = {}) {
  const w = Number(width);
  return finePointer === true && Number.isFinite(w) && w >= RUNNABLE_STARTER_MIN_WIDTH;
}

/** The runnable SQL statement, without the comment. */
export function runnableStarterSql(table) {
  return `SELECT * FROM ${String(table)} LIMIT 5;`;
}

/** The editor text in the `starter` arm: the comment line, then the query. */
export function runnableStarterText(table, lang = 'en') {
  return `${COMMENT[lang] || COMMENT.en}\n${runnableStarterSql(table)}`;
}

/**
 * SQL reduced for comparison: comments out, whitespace collapsed, trailing
 * semicolons dropped, lower case.
 */
export function normalizeSqlForCompare(sql) {
  return String(sql || '')
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/;+\s*$/, '')
    .trim()
    .toLowerCase();
}

/**
 * True when the starter would give the answer away: the reference solution
 * is (or sits inside) the starter text. Such a challenge never gets the
 * starter in either arm's test population.
 */
export function starterRevealsAnswer(challenge) {
  const table = challenge?.tables?.[0];
  const sol = normalizeSqlForCompare(challenge?.solution);
  if (!table || !sol) return false;
  return normalizeSqlForCompare(runnableStarterText(table)).includes(sol);
}

/**
 * Would this open show an empty editor that the starter can fill?
 *   challenge   — the challenge being opened
 *   savedQuery  — the person's saved draft for it ('' when none)
 *   solvedCount — the person's solves
 *   debugItem   — the open is a Debug item that prefills the AI's query
 */
export function isEmptyEditorOpen({ challenge = null, savedQuery = '', solvedCount = 0, debugItem = false } = {}) {
  if (!challenge || !Array.isArray(challenge.tables) || !challenge.tables[0]) return false;
  if (PREFILLED_CHALLENGE_IDS.includes(challenge.id)) return false;
  if (debugItem === true) return false;
  if (solvedCount !== 0) return false;
  if (typeof savedQuery === 'string' && savedQuery.trim()) return false;
  return !starterRevealsAnswer(challenge);
}

/** The stored record, or an empty one. */
export function normalizeRunnableStarterRecord(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return { arm: RUNNABLE_STARTER_ARMS.includes(r.arm) ? r.arm : null };
}

/**
 * What to do at a challenge open.
 *   flagOn    — `runnableStarter` === true
 *   desktop   — isDesktopScreen(...) right now
 *   emptyOpen — isEmptyEditorOpen(...) for this open
 *   stored    — the parsed localStorage record, or null
 *   aid       — the anon id
 * Returns { arm, assign, prefill }:
 *   arm     — the person's arm (stored, or assigned now), or null
 *   assign  — write the record and fire `runnable_starter_assigned` now
 *   prefill — put the runnable starter in the editor on this open
 * Sticky: an arm on record is kept and never re-announced. Nobody is
 * assigned outside the population; flag off, nothing happens and the record
 * is left alone.
 */
export function runnableStarterDecision({ flagOn = false, desktop = false, emptyOpen = false, stored = null, aid = null } = {}) {
  if (!flagOn) return { arm: null, assign: false, prefill: false };
  const inPopulation = desktop === true && emptyOpen === true;
  const rec = normalizeRunnableStarterRecord(stored);
  if (rec.arm) return { arm: rec.arm, assign: false, prefill: rec.arm === 'starter' && inPopulation };
  if (!inPopulation || !aid) return { arm: null, assign: false, prefill: false };
  const arm = runnableStarterArm(aid);
  return { arm, assign: true, prefill: arm === 'starter' };
}

/** The editor still holds the starter exactly as placed. */
export function isUntouchedStarter(query, starterText) {
  if (typeof starterText !== 'string' || !starterText) return false;
  return typeof query === 'string' && query.trim() === starterText.trim();
}
