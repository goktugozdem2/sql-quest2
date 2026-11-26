// The first-session tournament — who enters, which arm, and what is stamped
// (plan: docs/plans/first-session-tournament-2026-11-26.md §2; metric
// `first_session_tournament`; registry src/data/tournament-arms.js).
//
// ── Who is "new" (exactly) ─────────────────────────────────────────────────
// A browser enters at its FIRST app open, decided once at module load in
// app.jsx before the app writes any key of its own:
//   - "first app open" = the browser holds no app key: hasPriorAppUse() from
//     the freeQuota holdout (#384, src/utils/free-quota-holdout.js) — reused,
//     not copied — over every localStorage key, with this test's own key
//     taken out. The landing tracker's and static pages' keys
//     (PRE_APP_KEYS) do not count, so a landing visit before /app/ is still
//     new; any other `sqlquest_` key means the app has run here before.
//   - a browser with app state is recorded `returning` (no arm, no event).
//   - a first open on a mock link (`?interview=`) is `excluded_interview_link`
//     and one on a profile (`?profile=` or `/u/<handle>`) is
//     `excluded_profile` (plan §2.1): no arm, no event.
// The record is written ONCE and a stored record always wins — nobody is
// re-armed, whatever the flag or the registry later says. The record also
// rides the account (`userData.tournament`); an account's own record wins
// over a browser's on sign-in (adoptAccountRecord), so a person keeps one
// arm across devices.
//
// After assignment two more people are taken out of the arm's BEHAVIOUR
// (tournamentEffectiveArm), never out of the read (intent to treat):
//   - a signed-in account created before this browser's assignment (an old
//     account on a new browser: a returning person);
//   - `hired` intent (they are past the interview; the Coach opens on First
//     90 Days).
//
// ── Which arm ──────────────────────────────────────────────────────────────
// FNV over `${aid}:first_session_tournament_v1`, then the murmur3 finalizer
// (CLAUDE.md, "A/B hash trap"; the companyDirectArm pattern). The index is
// h % (number of ACTIVE arms), equal weights, over the active arms in slot
// order. Queued, eliminated and promoted arms are never assigned.
//
// ── What an arm does in PR 1 ───────────────────────────────────────────────
// Nothing different: B and D are `built: false` in the registry, so
// tournamentBehaviour() resolves them to A_control. The assignment, the
// record, the event and the stamps all work, so the plumbing can be walked
// with the flag on in a preview (an A/A of the whole pipeline).
//
// Pure: storage, clock, aid, URL and flag are passed in.

import {
  TOURNAMENT_TEST_ID, TOURNAMENT_ARMS, TOURNAMENT_CONTROL_ID,
  activeTournamentArms, tournamentArmById,
} from '../data/tournament-arms.js';
import { hasPriorAppUse } from './free-quota-holdout.js';

export const TOURNAMENT_KEY = 'sqlquest_tournament_v1';
export const TOURNAMENT_RECORD_STATUSES = Object.freeze([
  'enrolled', 'returning', 'excluded_interview_link', 'excluded_profile',
]);

/** The 32-bit hash: FNV-1a-style over `${aid}:${testId}`, murmur3-finalised. */
export function tournamentHash(aid) {
  let h = 2166136261;
  const s = `${String(aid)}:${TOURNAMENT_TEST_ID}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** The registry entry an aid is assigned to, over the ACTIVE arms only. */
export function tournamentAssign(aid, arms = TOURNAMENT_ARMS) {
  const active = activeTournamentArms(arms);
  if (!active.length || aid == null || aid === '') return null;
  return active[tournamentHash(aid) % active.length];
}

/** Has the app run in this browser before? (the holdout's rule, this key out) */
export function tournamentPriorAppUse(keys) {
  if (!Array.isArray(keys)) return false;
  return hasPriorAppUse(keys.filter(k => k !== TOURNAMENT_KEY));
}

/**
 * Which deep link, if any, keeps a first open out of the tournament.
 * `?interview=` goes to the Pro modal or the free mock in every arm (today's
 * behaviour); `?profile=` / `/u/<handle>` came to view someone else.
 */
export function tournamentExclusion({ search = '', pathname = '' } = {}) {
  const has = (name) => new RegExp(`[?&]${name}(=|&|$)`).test(String(search || ''));
  if (has('interview')) return 'excluded_interview_link';
  if (has('profile') || /^\/u\/[^/]+/.test(String(pathname || ''))) return 'excluded_profile';
  return null;
}

/** The stored record, or null when there is none (or it is unreadable). */
export function normalizeTournamentRecord(raw, arms = TOURNAMENT_ARMS) {
  if (!raw || typeof raw !== 'object' || !TOURNAMENT_RECORD_STATUSES.includes(raw.status)) return null;
  if (raw.status !== 'enrolled') {
    return { status: raw.status, arm: null, armVersion: null, round: null, slot: null, assignedAt: null, announced: false };
  }
  // An enrolled record must name a known arm — any status, since a retired
  // arm's people keep their record (the read is by the arm they got).
  const entry = tournamentArmById(raw.arm, arms);
  if (!entry) return null;
  const at = Number(raw.assignedAt);
  const v = Number(raw.armVersion);
  const r = Number(raw.round);
  return {
    status: 'enrolled',
    arm: entry.id,
    armVersion: Number.isInteger(v) && v > 0 ? v : entry.armVersion,
    round: Number.isInteger(r) && r > 0 ? r : entry.round,
    slot: Number.isInteger(raw.slot) ? raw.slot : entry.slot,
    assignedAt: Number.isFinite(at) && at > 0 ? at : null,
    announced: raw.announced === true,
  };
}

/**
 * Decide, at the app's first open in this browser, whether it enters.
 * Called at module load, before the app writes anything.
 *
 *   flagOn       — FF `firstSessionTournament` === true
 *   record       — the stored record (any shape; normalised here)
 *   aid          — the browser's anonymous id
 *   now          — ms since epoch
 *   priorAppUse  — tournamentPriorAppUse(every localStorage key)
 *   search, pathname — window.location's, for the deep-link exclusions
 *
 * Returns { write, record }: `write` is the record to store now (null =
 * store nothing), `record` the browser's record after this call (or null).
 */
export function tournamentEnrolment({
  flagOn = false, record = null, aid = null, now = null, priorAppUse = false,
  search = '', pathname = '', arms = TOURNAMENT_ARMS,
} = {}) {
  const stored = normalizeTournamentRecord(record, arms);
  if (stored) return { write: null, record: stored };
  if (!flagOn) return { write: null, record: null };
  const t = now == null ? NaN : Number(now);
  if (!Number.isFinite(t) || t <= 0) return { write: null, record: null };
  if (priorAppUse) {
    const r = normalizeTournamentRecord({ status: 'returning' }, arms);
    return { write: r, record: r };
  }
  const excluded = tournamentExclusion({ search, pathname });
  if (excluded) {
    const r = normalizeTournamentRecord({ status: excluded }, arms);
    return { write: r, record: r };
  }
  const entry = tournamentAssign(aid, arms);
  if (!entry) return { write: null, record: null };
  const r = {
    status: 'enrolled',
    arm: entry.id,
    armVersion: entry.armVersion,
    round: entry.round,
    slot: entry.slot,
    assignedAt: t,
    announced: false,
  };
  return { write: r, record: r };
}

/**
 * Sign-in: the account's own enrolled record wins over this browser's — the
 * person was armed first there, and is never re-armed. Returns the record to
 * use and whether the browser's copy must be rewritten.
 */
export function adoptAccountRecord({ browserRecord = null, accountRecord = null, arms = TOURNAMENT_ARMS } = {}) {
  const acct = normalizeTournamentRecord(accountRecord, arms);
  const local = normalizeTournamentRecord(browserRecord, arms);
  if (!acct || acct.status !== 'enrolled') return { record: local, write: false };
  if (local && local.status === 'enrolled' && local.arm === acct.arm && local.armVersion === acct.armVersion) {
    return { record: local, write: false };
  }
  // Adopted: already announced on the device that assigned it.
  return { record: { ...acct, announced: true }, write: true };
}

/** The arm this browser's record names, or null when it is not enrolled. */
export function enrolledTournamentArm(record, arms = TOURNAMENT_ARMS) {
  const r = normalizeTournamentRecord(record, arms);
  return r && r.status === 'enrolled' ? r.arm : null;
}

/**
 * The arm this person is IN right now, or null (outside the tournament).
 * Flag off is the kill switch: everyone gets today's product.
 */
export function tournamentEffectiveArm({
  flagOn = false, record = null, signedIn = false, accountCreatedAt = null, intent = null, arms = TOURNAMENT_ARMS,
} = {}) {
  if (!flagOn) return null;
  const r = normalizeTournamentRecord(record, arms);
  if (!r || r.status !== 'enrolled') return null;
  if (intent === 'hired') return null;
  if (signedIn && accountCreatedAt != null && r.assignedAt != null) {
    const created = typeof accountCreatedAt === 'number' ? accountCreatedAt : Date.parse(accountCreatedAt);
    if (Number.isFinite(created) && created < r.assignedAt) return null;
  }
  return r.arm;
}

/**
 * The arm whose BEHAVIOUR to run: the arm itself once it is built, else
 * A_control (B and D in PR 1). null outside the tournament.
 */
export function tournamentBehaviour(armId, arms = TOURNAMENT_ARMS) {
  if (!armId) return null;
  const entry = tournamentArmById(armId, arms);
  if (!entry || entry.built !== true) return TOURNAMENT_CONTROL_ID;
  return entry.id;
}

/**
 * Does this person's arm replace the first-session A/Bs (firstScreen,
 * companyDirect, runnableStarter, mobileRunBar; plan §2.3)? Only a BUILT
 * challenger does — so in PR 1, never.
 */
export function tournamentSupersedes(armId, arms = TOURNAMENT_ARMS) {
  const b = tournamentBehaviour(armId, arms);
  return !!b && b !== TOURNAMENT_CONTROL_ID;
}

/** The fields every pro_events row from an enrolled browser carries. */
export function tournamentEventStamp({ flagOn = false, record = null, arms = TOURNAMENT_ARMS } = {}) {
  if (!flagOn) return {};
  const r = normalizeTournamentRecord(record, arms);
  return r && r.status === 'enrolled' ? { tArm: r.arm, tArmV: r.armVersion } : {};
}

/**
 * Should `tournament_assigned` fire now? Once per browser: an enrolled
 * record not yet announced, with the flag on.
 */
export function shouldAnnounceTournament({ flagOn = false, record = null, arms = TOURNAMENT_ARMS } = {}) {
  if (!flagOn) return false;
  const r = normalizeTournamentRecord(record, arms);
  return !!r && r.status === 'enrolled' && r.assignedAt != null && !r.announced;
}

/**
 * The `tournament_assigned` payload. trackActivationEvent adds viewport,
 * landingSrc, arrivalSrc (the door), tz and the bot stamp.
 */
export function tournamentAssignedPayload(record, arms = TOURNAMENT_ARMS) {
  const r = normalizeTournamentRecord(record, arms);
  if (!r || r.status !== 'enrolled') return null;
  return {
    test: TOURNAMENT_TEST_ID,
    arm: r.arm,
    armVersion: r.armVersion,
    round: r.round,
    slot: r.slot,
    firstOpenAt: r.assignedAt != null ? new Date(r.assignedAt).toISOString() : null,
  };
}
