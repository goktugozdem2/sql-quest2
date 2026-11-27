// The free-quota holdout — a 50/50 test of `freeQuota` on new visitors
// (founder's written go in chat, 2026-11-25: "Full holdout (Recommended)").
//
// ── Why ────────────────────────────────────────────────────────────────────
// Day-0 solvers who come back within 7 days fell from 44.3% to 23.7% on the
// deploy that flipped six flags at once (2026-09-25 22:41 UTC). Four of the
// six are cleared on the data; `freeQuota` is the strongest suspect and the
// only one that reaches every free person — the "N of 10 free solves used"
// counter, the Coach strip line, the wall at ten. But 78% of the lost
// returns are 1–9-solve people who never met the wall on day 0, so only a
// randomised holdout can say whether the quota cost them
// (docs/reads/returns-0926-flags-2026-11-25.md, PR #383; PR #382).
//
// ── The test ───────────────────────────────────────────────────────────────
// A browser whose FIRST app open falls inside the enrolment window is split
// by a hash of its anonymous id: `quota` keeps today's free tier, `holdout`
// gets the pre-2026-09-26 one — no quota wall, no counter, the old in-app
// wording (every `freeQuota` branch in app.jsx reads OFF for it). Everything
// else is unchanged in both arms: the Hard lock, Pro content, the tutor's
// daily cap, the company-set gate.
//
// Only new people are enrolled. A browser that already holds app state when
// this code first runs (a guest, an account, any app key) is recorded as
// `returning` and keeps the quota for good, so nobody gains or loses access
// mid-way. A signed-in account created before the window keeps the quota on
// any browser. The decision is written ONCE per browser
// (`sqlquest_free_quota_holdout_v1`) and never revisited.
//
// The hash is the FNV + murmur3-finalizer construction of companyAskArm
// (CLAUDE.md, "A/B hash trap"): without the finalizer a two-arm split is the
// first-screen test's arms flipped, for every aid.
//
// Pure: the clock, storage keys, the aid and the flag are passed in.
//
// Flag: `freeQuotaHoldout` (src/data/feature-flags.js). Off → nobody is
// enrolled and an enrolled holdout browser gets the quota back (the kill
// switch). Metric `free_quota_holdout` (docs/agent/metrics.md); ledger
// "the free-quota holdout".

export const FREE_QUOTA_HOLDOUT_TEST_ID = 'free_quota_holdout_v1';
export const FREE_QUOTA_ARMS = ['quota', 'holdout'];
export const FREE_QUOTA_HOLDOUT_KEY = 'sqlquest_free_quota_holdout_v1';

// The enrolment window: four weeks, read on the 7th day after it closes.
// Fixed constants, not "from deploy". Moved twice: from 11-26 on 2026-11-26
// (A1's REVISE on #384), and from 11-27 on 2026-11-27 (A0: the 11-27 start
// had already passed before merge). Enrolment is 2026-11-28 → 2026-12-25
// inclusive (end below is exclusive), the arm-balance check 2026-12-04, the
// halfway money read 2026-12-12, the read 2027-01-02. If the merge slips past
// 11-28, the code is simply not live until it lands — move all of them in one
// commit (and the ledger + metrics.md) to keep four full weeks; the test pins
// the start so a start already in the past fails loudly. A browser whose
// first app open is outside the window is never enrolled.
export const FREE_QUOTA_HOLDOUT_START_ISO = '2026-11-28T00:00:00Z';
export const FREE_QUOTA_HOLDOUT_END_ISO = '2026-12-26T00:00:00Z';   // exclusive
export const FREE_QUOTA_HOLDOUT_READ_DATE = '2027-01-02';
export const FREE_QUOTA_HOLDOUT_START = Date.parse(FREE_QUOTA_HOLDOUT_START_ISO);
export const FREE_QUOTA_HOLDOUT_END = Date.parse(FREE_QUOTA_HOLDOUT_END_ISO);

// Keys a browser can hold before its first app open: the landing tracker's
// (src/track.js) and the static pages' own (the TR banner, the free SQL
// tools, the quiz, the readiness test, /for-teams/). Anything else under
// `sqlquest_` was written by the app, so the browser has been here before.
// tests/free-quota-holdout.test.js binds this list to what the pages write.
export const PRE_APP_KEYS = Object.freeze([
  'sqlquest_aid',
  'sqlquest_landing_src',
  'sqlquest_tr_banner_dismissed',
  'sqlquest_tool_query',
  'sqlquest_quiz_state_v1',
  'sqlquest_readiness_v1',
  'sqlquest_team_interest_v1',
  // The landing tracker's country cache (2026-11-27, PR #277). It lives in
  // sessionStorage only (track.js and the app's regional price alike), so it
  // never reaches hasPriorAppUse's localStorage keys; listed because a page
  // writes it, which is what this list records.
  'sqlquest_geo_country',
]);

const STATUSES = ['enrolled', 'returning', 'outside_window'];

/** The arm for an aid: FNV over `${aid}:${testId}`, murmur3-finalised. */
export function freeQuotaArm(aid) {
  let h = 2166136261;
  const s = `${String(aid)}:${FREE_QUOTA_HOLDOUT_TEST_ID}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return FREE_QUOTA_ARMS[(h >>> 0) % FREE_QUOTA_ARMS.length];
}

/** Has the app run in this browser before? `keys` = every localStorage key. */
export function hasPriorAppUse(keys) {
  if (!Array.isArray(keys)) return false;
  return keys.some(k => typeof k === 'string'
    && k.startsWith('sqlquest_')
    && k !== FREE_QUOTA_HOLDOUT_KEY
    && !PRE_APP_KEYS.includes(k));
}

/** The stored record, or null when there is none (or it is unreadable). */
export function normalizeFreeQuotaRecord(raw) {
  if (!raw || typeof raw !== 'object' || !STATUSES.includes(raw.status)) return null;
  const arm = raw.status === 'enrolled' && FREE_QUOTA_ARMS.includes(raw.arm) ? raw.arm : null;
  if (raw.status === 'enrolled' && !arm) return null;
  const at = Number(raw.firstOpenAt);
  return {
    status: raw.status,
    arm,
    firstOpenAt: Number.isFinite(at) && at > 0 ? at : null,
    announced: raw.announced === true,
  };
}

/**
 * Decide, at the app's first open in this browser, whether it joins the
 * test. Called at module load, before the app writes anything.
 *
 *   flagOn       — FF `freeQuotaHoldout` === true
 *   record       — the stored record (any shape; normalised here)
 *   aid          — the browser's anonymous id
 *   now          — ms since epoch
 *   priorAppUse  — hasPriorAppUse(every localStorage key), read BEFORE the
 *                  app's own module-load writes
 *
 * Returns { write, record }: `write` is the record to store now (null =
 * store nothing), `record` the browser's record after this call (or null).
 * A stored record always wins: nobody is re-armed.
 */
export function freeQuotaEnrolment({ flagOn = false, record = null, aid = null, now = null, priorAppUse = false } = {}) {
  const stored = normalizeFreeQuotaRecord(record);
  if (stored) return { write: null, record: stored };
  if (!flagOn) return { write: null, record: null };
  const t = now == null ? NaN : Number(now);
  if (!Number.isFinite(t) || t <= 0) return { write: null, record: null };
  if (priorAppUse) {
    const r = { status: 'returning', arm: null, firstOpenAt: null, announced: false };
    return { write: r, record: r };
  }
  if (t < FREE_QUOTA_HOLDOUT_START || t >= FREE_QUOTA_HOLDOUT_END) {
    const r = { status: 'outside_window', arm: null, firstOpenAt: t, announced: false };
    return { write: r, record: r };
  }
  if (!aid) return { write: null, record: null };
  const r = { status: 'enrolled', arm: freeQuotaArm(aid), firstOpenAt: t, announced: false };
  return { write: r, record: r };
}

/** The arm this browser is in, or null when it is not in the test. */
export function enrolledArm(record) {
  const r = normalizeFreeQuotaRecord(record);
  return r && r.status === 'enrolled' ? r.arm : null;
}

/**
 * Should `freeQuota` read OFF for this person right now?
 *
 * Only for a browser enrolled in `holdout`, with the flag on. A signed-in
 * account whose own `createdAt` is before the window is a returning person
 * on a new browser: it keeps the quota. An unreadable `createdAt` does not
 * take the holdout away (the account loads after the first render, and a
 * holdout guest who registers carries a fresh one).
 */
export function freeQuotaHoldoutActive({ flagOn = false, record = null, signedIn = false, accountCreatedAt = null } = {}) {
  if (!flagOn) return false;
  if (enrolledArm(record) !== 'holdout') return false;
  if (signedIn && accountCreatedAt != null) {
    const created = typeof accountCreatedAt === 'number' ? accountCreatedAt : Date.parse(accountCreatedAt);
    if (Number.isFinite(created) && created < FREE_QUOTA_HOLDOUT_START) return false;
  }
  return true;
}

/**
 * What app.jsx's freeQuotaOn() returns: `freeQuota` as this person meets it.
 * The quota flag, unless the holdout is active for them. Every `freeQuota`
 * read in the app goes through this (source guard in the test).
 */
export function freeQuotaEffective({ quotaFlagOn = false, holdoutFlagOn = false, record = null, signedIn = false, accountCreatedAt = null } = {}) {
  if (quotaFlagOn !== true) return false;
  return !freeQuotaHoldoutActive({ flagOn: holdoutFlagOn, record, signedIn, accountCreatedAt });
}

/** The fields every pro_events row from an enrolled browser carries. */
export function freeQuotaEventStamp({ flagOn = false, record = null } = {}) {
  if (!flagOn) return {};
  const arm = enrolledArm(record);
  return arm ? { fqArm: arm } : {};
}
