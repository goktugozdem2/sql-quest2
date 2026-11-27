// Tournament arms B (single path, "Tek Yol") and D (interview sprint) — the
// pure half. Plan: docs/plans/first-session-tournament-2026-11-26.md §3 (B)
// and §4 (D); the roadmap is docs/plans/personalized-roadmap-2026-11-26.md
// (src/utils/personal-roadmap.js, `buildRoadmap`, the same engine in both
// arms). Founder's go on the copy: orchestrator-decisions 2026-11-26.
//
// What lives here (app.jsx only decides WHEN):
//   - pathUiFlags(): every switch the arms flip in the app. Null, A_control
//     or an unbuilt arm → every switch off, so control and unenrolled people
//     see today's product byte for byte (tests/single-path.test.js).
//   - arm B's ladder: four questions, three rungs, `fast` up / `solved` same
//     / `stuck` down, picked in the ladder's own curriculum order through
//     pickNextChallengeWith (never raw bank order, fragile area 4); the tier
//     comes from levelForLadder (src/utils/placement.js).
//   - the plan both arms show: the roadmap frozen at build time (N stays put),
//     B's ladder questions in front of it, `k/N`, and Next = the next step
//     that is not Pro-only (a quota-gated step is NOT skipped: opening it is
//     today's quota wall, the plan's line in its slot).
//   - arm D's sprint: company (one tap, or the door's), length (7 / 14 / no
//     date), the day count. A learner ("Just learning", or "Not sure yet"
//     without an interview signal) gets a fundamentals sprint. Its own field —
//     never prepTarget.date (deadlineOffer and the interview-outcome note read
//     that one).
//
// Pure and side-effect free: storage, clock, bank and locks are passed in.

import { buildCurriculumOrder, pickNextChallengeWith } from './challenge-order.js';
import { FREE_SOLVE_QUOTA } from './free-tier-boundary.js';
import { PLACEMENT_TIERS, levelForLadder } from './placement.js';
import { challengeMatchesSkill } from './skill-drill.js';
import { SESSION_GAP_MS } from './feedback-prompts.js';

export const SINGLE_PATH_ARM = 'B_single_path';
export const SPRINT_ARM = 'D_interview_sprint';
export const PATH_ARMS = Object.freeze([SINGLE_PATH_ARM, SPRINT_ARM]);
export const SINGLE_PATH_KEY = 'sqlquest_single_path_v1';
export const PATH_STATE_VERSION = 1;

// ── the ladder (arm B, plan §3.2) ──────────────────────────────────────────
export const LADDER_LENGTH = 4;
/** Rung 0 basics, rung 1 joins + grouping (Easy first), rung 2 window + CTE. Pick order. */
export const LADDER_RUNGS = Object.freeze([
  Object.freeze([91, 93, 95, 97, 92]),
  Object.freeze([100, 105, 176, 107, 106]),
  Object.freeze([168, 171, 179, 163, 112]),
]);
/** `fast` = solved, ≤ 1 wrong, no hint, no reveal, inside T(rung) seconds (plan §1c: about p75 of solvers). */
export const LADDER_FAST_SECS = Object.freeze([150, 300, 420]);
/** B3: the step-down line appears after this many wrong submits … */
export const LADDER_STUCK_WRONGS = 3;
/** … or this many seconds without a solve (6 min at rung 0, 10 at rungs 1–2). */
export const LADDER_STUCK_SECS = Object.freeze([360, 600, 600]);
export const LADDER_OUTCOMES = Object.freeze(['fast', 'solved', 'stuck']);
export const LADDER_ORDER = buildCurriculumOrder(LADDER_RUNGS.map(ids => ({ challengeIds: [...ids] })));
/**
 * After the ladder, the plan line stays the only navigation until this many
 * plan steps are done (or the person opens "All steps", or the plan has no
 * free step left). Walk fix B3, 2026-11-26: the tab row and the guest banner
 * coming back with the plan broke the single focus the moment it appeared.
 */
export const PLAN_FOCUS_STEPS = 3;

// ── the sprint (arm D, plan §4) ─────────────────────────────────────────────
/** One tap: 7 days, 14 days, or no date (null — the roadmap's default sprint by level). */
export const SPRINT_LENGTHS = Object.freeze([7, 14]);
export const SPRINT_GOALS = Object.freeze(['interview', 'learning']);
/**
 * Walk fix D1 (2026-11-26): with no readiness band, D's level is ASSUMED
 * (the roadmap's interview default, Intermediate) and the why-line says so;
 * the first SPRINT_PROBE_STEPS plan steps solved are read with the ladder's
 * own thresholds (ladderOutcome at each question's rung, levelForLadder) and
 * the plan is re-laid from that level, the two done steps leading it.
 */
export const SPRINT_PROBE_STEPS = 2;
const DAY_MS = 86400000;

const isNum = v => typeof v === 'number' && Number.isFinite(v);
const toSet = (v) => (v && typeof v.has === 'function' ? v : new Set(Array.isArray(v) ? v : []));

/** Is this tournament behaviour one of the plan arms (B, D)? */
export function isPathArm(behaviour) {
  return PATH_ARMS.includes(behaviour);
}

// ───────────────────────────── the state ────────────────────────────────────

export function emptyPathState() {
  return {
    v: PATH_STATE_VERSION,
    ladder: { outcomes: [], rung: 0, current: null, setAside: [], done: false, levelId: null, endedAt: null },
    sprint: null,
    plan: null,
    doneLog: [],
    tabsOpenedAt: null,
    // The first session (walk fix round 2): the last touch, and when it ended.
    sessionLastAt: null,
    firstSessionEndedAt: null,
  };
}

const cleanIds = (v) => (Array.isArray(v) ? v.map(Number).filter(n => Number.isInteger(n) && n > 0) : []);
const clampRung = (r) => (Number.isInteger(r) ? Math.max(0, Math.min(LADDER_RUNGS.length - 1, r)) : 0);

/** A stored state, whitelisted field by field; anything unreadable → the empty state. */
export function normalizePathState(raw) {
  const base = emptyPathState();
  if (!raw || typeof raw !== 'object') return base;
  const l = raw.ladder && typeof raw.ladder === 'object' ? raw.ladder : {};
  const outcomes = Array.isArray(l.outcomes) ? l.outcomes.filter(o => o && LADDER_OUTCOMES.includes(o.outcome) && Number.isInteger(Number(o.challengeId))).slice(0, LADDER_LENGTH).map(o => ({
    q: Number(o.q) || 0,
    rung: clampRung(Number(o.rung)),
    challengeId: Number(o.challengeId),
    outcome: o.outcome,
    secs: isNum(Number(o.secs)) ? Math.max(0, Math.round(Number(o.secs))) : null,
    wrongs: isNum(Number(o.wrongs)) ? Math.max(0, Math.round(Number(o.wrongs))) : 0,
    hint: o.hint === true,
  })) : [];
  const cur = l.current && typeof l.current === 'object' && Number.isInteger(Number(l.current.challengeId))
    ? { challengeId: Number(l.current.challengeId), rung: clampRung(Number(l.current.rung)), openedAt: isNum(Number(l.current.openedAt)) ? Number(l.current.openedAt) : null }
    : null;
  const done = l.done === true || outcomes.length >= LADDER_LENGTH;
  base.ladder = {
    outcomes,
    rung: clampRung(Number(l.rung)),
    current: done ? null : cur,
    setAside: cleanIds(l.setAside),
    done,
    levelId: PLACEMENT_TIERS[l.levelId] ? l.levelId : (done ? levelForLadder(outcomes) : null),
    endedAt: isNum(Number(l.endedAt)) && Number(l.endedAt) > 0 ? Number(l.endedAt) : null,
  };
  base.sprint = normalizeSprint(raw.sprint);
  base.plan = normalizePlan(raw.plan);
  base.doneLog = Array.isArray(raw.doneLog) ? raw.doneLog.filter(d => d && (Number.isInteger(Number(d.id)) || typeof d.id === 'string') && typeof d.day === 'string').slice(-200).map(d => ({ id: typeof d.id === 'string' && !/^\d+$/.test(d.id) ? d.id : Number(d.id), day: d.day.slice(0, 10) })) : [];
  base.tabsOpenedAt = isNum(Number(raw.tabsOpenedAt)) && Number(raw.tabsOpenedAt) > 0 ? Number(raw.tabsOpenedAt) : null;
  base.sessionLastAt = isNum(Number(raw.sessionLastAt)) && Number(raw.sessionLastAt) > 0 ? Number(raw.sessionLastAt) : null;
  base.firstSessionEndedAt = isNum(Number(raw.firstSessionEndedAt)) && Number(raw.firstSessionEndedAt) > 0 ? Number(raw.firstSessionEndedAt) : null;
  return base;
}

// ───────────────────────────── the switches ─────────────────────────────────

/**
 * Every switch the arms flip in app.jsx. `behaviour` is tournamentBehaviour()
 * of the person's arm: null outside the tournament, 'A_control' for control
 * AND for an arm whose `built` marker is false. Anything but a built B / D →
 * every switch false (today's product).
 *
 *   state       — normalizePathState(...)
 *   hasChallenge — a challenge is open (D's sprint screen waits for none)
 */
export function pathUiFlags({ behaviour = null, state = null, hasChallenge = false } = {}) {
  const off = {
    arm: null, active: false, ladderActive: false, hideTabs: false, extendShell: false,
    showPlanLine: false, suppressAsks: false, suppressNextStrip: false, sprintSetup: false,
    starterPrefill: false, companyDirect: false, holdLayers: false, fixedRunBar: false, sprint: false,
    holdSignupAsks: false, hideGuestBanner: false, suppressTour: false, hideCoachPlan: false, hideGoalPicker: false, layerQueue: false,
  };
  if (!isPathArm(behaviour)) return off;
  const s = state && state.v ? state : normalizePathState(state);
  if (behaviour === SINGLE_PATH_ARM) {
    const ladderActive = !s.ladder.done;
    const tabsOpen = pathTabsOpen(s, { arm: behaviour });
    return {
      ...off,
      arm: behaviour,
      active: true,
      ladderActive,
      // No tabs and no menu on the ladder, nor for the first plan steps
      // after it: the plan line is the only navigation (plan §3.5).
      hideTabs: !tabsOpen,
      hideGuestBanner: !tabsOpen,
      // The first-run shell (no header stats, no challenge-list buttons) runs
      // to the same point, so the plan line is the only way on (walk fix B3).
      extendShell: !tabsOpen,
      // Sign-up / save prompts are held on the ladder; at most one is asked
      // when it ends (walk fix B1).
      holdSignupAsks: ladderActive,
      // The "Take tour" prompt never shows in B's first session (walk fix B2).
      suppressTour: true,
      showPlanLine: !ladderActive && !!s.plan,
      // One plan on screen: once the plan line shows, the Coach's own
      // "Your {company} plan" card stays away (walk fix round 2, as D3 for D).
      hideCoachPlan: !ladderActive && !!s.plan,
      // The intent modal and the company ask are questions; "seçenek tanımadan".
      suppressAsks: ladderActive,
      // One button after a solve, on the ladder and on the plan.
      suppressNextStrip: true,
      starterPrefill: true,
      companyDirect: true,
      holdLayers: ladderActive,
      // One layer at a time, one per solve, for the whole first session
      // (pathLayerDecide; walk fix round 2).
      layerQueue: pathInFirstSession(s),
      // Phones keep Run / Submit fixed at the bottom (the `bar` arm's
      // behaviour, today's first screen for half of phones) — one bar, never two.
      fixedRunBar: true,
    };
  }
  // D — the sprint screen first; tabs after the first day's count or the first solve of day 2.
  const setUp = !!(s.sprint && s.sprint.setAt);
  const tabsOpen = setUp && pathTabsOpen(s, { arm: behaviour });
  return {
    ...off,
    arm: behaviour,
    active: true,
    sprint: true,
    hideTabs: !tabsOpen,
    // The guest banner and the tour wait with the tabs (B's walk fixes, D too).
    hideGuestBanner: !tabsOpen,
    suppressTour: true,
    // One plan on screen: while the sprint line shows, the Coach's own
    // "Your {company} plan" card stays away (walk fix D3).
    hideCoachPlan: setUp && !!s.plan,
    // The sprint IS the goal: no "Pick a goal" and no Focus Tracks beside it
    // on the Learning Path tab (walk fix round 2).
    hideGoalPicker: setUp && !!s.plan,
    extendShell: !tabsOpen,
    showPlanLine: setUp && !!s.plan,
    suppressAsks: !tabsOpen,
    suppressNextStrip: true,
    sprintSetup: !setUp && !hasChallenge,
    starterPrefill: true,
    // The sprint screen comes first; the company's question 1 opens after it.
    companyDirect: false,
    holdLayers: !tabsOpen,
    // One layer at a time, one per solve, for the whole first session
    // (pathLayerDecide; walk fix round 2).
    layerQueue: pathInFirstSession(s),
    fixedRunBar: true,
  };
}

/**
 * Has the tab row come back? Arm B: never on the ladder; after it, once the
 * reveal was recorded (`tabsOpenedAt`: "All steps", the plan's free steps ran
 * out) or PLAN_FOCUS_STEPS plan steps are logged done.
 */
export function pathTabsOpen(state, { arm = SINGLE_PATH_ARM } = {}) {
  const s = state && state.v ? state : normalizePathState(state);
  if (arm === SPRINT_ARM) return sprintTabsOpen(s);
  if (arm !== SINGLE_PATH_ARM) return false;
  if (!s.ladder.done) return false;
  return !!s.tabsOpenedAt || s.doneLog.length >= PLAN_FOCUS_STEPS;
}

// ─────────────────── one layer at a time, the first session ─────────────────
//
// Walk fix round 2 (2026-11-26): at B's 7th solve the 6-solve Pro modal, an
// achievement toast with its share card and the "What held you back?" survey
// opened at once; from the first plan step on the archetype card and an
// achievement toast showed together. For arms B and D, the WHOLE first
// session runs one queue:
//   - priority: the Pro / plan_end ask > save / sign-up > achievement >
//     archetype (the Skillmap card) > survey;
//   - at most one layer per solve: the first granted shows, everything else
//     that solve raises is dropped (state cleared), never stacked or queued
//     for later;
//   - a toast never sits on a modal; the exit survey never shows;
//   - the solve's asks land 1.5–1.8 s after it, so the solve's slot waits
//     PATH_LAYER_SETTLE_MS before it grants anything but the Pro ask;
//   - the Pro ask is never dropped (it is the money ask, and the quota wall is
//     a gate), nor is a modal the person opened themselves: either takes the
//     slot whenever it opens, and whatever else is up is dropped.
// A new challenge open starts a fresh slot. On B's ladder the achievement /
// archetype layers are held (neither shown nor dropped) and compete at the
// ladder's end.

/** The session gap — the one `second_session_7d` and the feedback prompts use. */
export const PATH_SESSION_GAP_MS = SESSION_GAP_MS;
/** The layers, by tier, highest first. */
export const PATH_LAYER_TIERS = Object.freeze([
  // The Pro / plan_end ask, and a modal the person opened themselves (Save
  // Progress, the profile's save, the account after a purchase): never dropped.
  Object.freeze(['pro_modal', 'user_modal']),
  // The automatic save / sign-up asks (and the intent question, an ask too).
  Object.freeze(['signup_prompt', 'soft_email', 'intent_ask']),
  Object.freeze(['achievement', 'level_up', 'milestone_toast', 'milestone_share', 'streak_card']),
  Object.freeze(['radar_pop']),
  Object.freeze(['feedback_prompt']),
]);
export const PATH_LAYER_ORDER = Object.freeze(PATH_LAYER_TIERS.flat());
/**
 * The sign-up prompt's reasons that are the person's own doing (Save
 * Progress, the profile's save, the account after a purchase, the tutor's
 * guest limit on a question they asked): a `user_modal`, never dropped.
 * Every other reason is an automatic ask (`signup_prompt`).
 */
export const PATH_USER_SIGNUP_REASONS = Object.freeze(['banner', 'profile', 'pro_purchase', 'ai_limit']);
/** Held, not shown and not dropped, while B's ladder runs. */
export const PATH_LAYER_HELD_ON_LADDER = Object.freeze([...PATH_LAYER_TIERS[2], ...PATH_LAYER_TIERS[3]]);
/** Never dropped: when one is up it is the layer, and the rest are dropped. */
export const PATH_LAYER_KEEP = Object.freeze([...PATH_LAYER_TIERS[0]]);
/** Never in the first session. */
export const PATH_LAYER_NEVER = Object.freeze([...PATH_LAYER_TIERS[4]]);
/** After a solve, nothing but the Pro ask is granted before this (the asks fire at 1.5–1.8 s). */
export const PATH_LAYER_SETTLE_MS = 2400;

/** A fresh slot: at a solve (`settle`) or at a challenge open (`open`). */
export function pathLayerSlot(phase = 'open') {
  return { phase: phase === 'settle' ? 'settle' : 'open', granted: null, consumed: false };
}

const layerRank = (id) => PATH_LAYER_ORDER.indexOf(id);

/**
 * The one layer to render now, the layers to drop, and the slot after.
 *   active      — ids of the layers whose state is set
 *   slot        — pathLayerSlot(...) as updated by earlier calls
 *   holdExtras  — B's ladder: achievement / archetype layers wait
 */
export function pathLayerDecide({ active = [], slot = null, holdExtras = false } = {}) {
  const s = slot && typeof slot === 'object' ? slot : pathLayerSlot('open');
  const known = [...new Set(active)].filter(id => layerRank(id) >= 0).sort((a, b) => layerRank(a) - layerRank(b));
  const drop = known.filter(id => PATH_LAYER_NEVER.includes(id));
  const live = known.filter(id => !PATH_LAYER_NEVER.includes(id) && !(holdExtras && PATH_LAYER_HELD_ON_LADDER.includes(id)));
  const keep = live.find(id => PATH_LAYER_KEEP.includes(id));
  if (keep) {
    return { show: keep, drop: [...drop, ...live.filter(id => !PATH_LAYER_KEEP.includes(id))], slot: s.granted === keep ? s : { ...s, granted: keep } };
  }
  if (s.phase === 'settle') return { show: null, drop, slot: s };
  if (s.granted) {
    // The granted layer has closed: the slot is spent until the next solve or open.
    const spent = s.consumed || !live.includes(s.granted);
    const show = spent ? null : s.granted;
    return { show, drop: [...drop, ...live.filter(id => id !== show)], slot: spent && !s.consumed ? { ...s, consumed: true } : s };
  }
  const top = live[0] || null;
  return { show: top, drop: [...drop, ...live.slice(1)], slot: top ? { ...s, granted: top } : s };
}

/**
 * Advance the first-session record at a touch (load, challenge open, submit).
 * The first session ends at the first gap of PATH_SESSION_GAP_MS; it never
 * comes back.
 */
export function pathSessionTouch(state, now) {
  const s = normalizePathState(state);
  if (!isNum(now) || s.firstSessionEndedAt) return s;
  if (s.sessionLastAt && now - s.sessionLastAt > PATH_SESSION_GAP_MS) return { ...s, firstSessionEndedAt: s.sessionLastAt };
  return { ...s, sessionLastAt: now };
}

/** Still in the arm's first session? */
export function pathInFirstSession(state) {
  const s = state && state.v ? state : normalizePathState(state);
  return !s.firstSessionEndedAt;
}

// ───────────────────────────── the ladder ───────────────────────────────────

/** The rung a challenge belongs to: its ladder rung, else by its skills (plan §3.4). */
export function rungForChallenge(challenge) {
  if (!challenge) return 0;
  const id = Number(challenge.id);
  for (let r = 0; r < LADDER_RUNGS.length; r++) if (LADDER_RUNGS[r].includes(id)) return r;
  if (challenge.difficulty === 'Hard') return 2;
  const has = (s) => { try { return challengeMatchesSkill(challenge, s); } catch { return false; } };
  if (has('Window Functions') || has('Subqueries & CTEs')) return 2;
  if (has('Joins') || has('Aggregation & Grouping') || has('Conditional Logic')) return 1;
  return 0;
}

/** fast / solved / stuck for one ladder question. */
export function ladderOutcome({ solved = false, wrongs = 0, hint = false, revealed = false, secs = null, rung = 0 } = {}) {
  if (!solved) return 'stuck';
  const t = LADDER_FAST_SECS[clampRung(rung)];
  if ((Number(wrongs) || 0) <= 1 && !hint && !revealed && isNum(secs) && secs <= t) return 'fast';
  return 'solved';
}

/** fast → up one rung, solved → same rung, stuck → down one (0 is the floor, 2 the top). */
export function nextRung(rung, outcome) {
  const r = clampRung(rung);
  if (outcome === 'fast') return Math.min(LADDER_RUNGS.length - 1, r + 1);
  if (outcome === 'stuck') return Math.max(0, r - 1);
  return r;
}

/** Should B3's step-down line show? 3 wrong submits, or the rung's timer, with no solve. */
export function ladderStuck({ wrongs = 0, secs = 0, rung = 0 } = {}) {
  return (Number(wrongs) || 0) >= LADDER_STUCK_WRONGS || (isNum(secs) && secs >= LADDER_STUCK_SECS[clampRung(rung)]);
}

/**
 * Record a ladder question being opened (the first open of q). Question 1 is
 * whatever opened first — #91, or a deep link's challenge — and the ladder
 * starts at that challenge's rung.
 */
export function ladderOpen(state, challenge, now) {
  const s = normalizePathState(state);
  if (s.ladder.done || !challenge) return s;
  const id = Number(challenge.id);
  if (s.ladder.current && s.ladder.current.challengeId === id) return s;
  if (s.ladder.outcomes.some(o => o.challengeId === id)) return s;
  const first = s.ladder.outcomes.length === 0 && !s.ladder.current;
  const rung = first ? rungForChallenge(challenge) : s.ladder.rung;
  return { ...s, ladder: { ...s.ladder, rung, current: { challengeId: id, rung, openedAt: isNum(now) ? now : null } } };
}

/**
 * Resolve the current ladder question. Returns { state, step } — `step` is the
 * event payload (q, rung, outcome, …) or null when nothing was current.
 */
export function ladderResolve(state, { challengeId, outcome, secs = null, wrongs = 0, hint = false, now = null } = {}) {
  const s = normalizePathState(state);
  const cur = s.ladder.current;
  if (s.ladder.done || !cur || cur.challengeId !== Number(challengeId) || !LADDER_OUTCOMES.includes(outcome)) return { state: s, step: null };
  const step = {
    q: s.ladder.outcomes.length + 1,
    rung: cur.rung,
    challengeId: cur.challengeId,
    outcome,
    secs: isNum(secs) ? Math.round(secs) : null,
    wrongs: Number(wrongs) || 0,
    hint: !!hint,
  };
  const outcomes = [...s.ladder.outcomes, step];
  const done = outcomes.length >= LADDER_LENGTH;
  const rung = nextRung(cur.rung, outcome);
  const ladder = {
    ...s.ladder,
    outcomes,
    rung,
    current: null,
    setAside: outcome === 'stuck' ? [...new Set([...s.ladder.setAside, cur.challengeId])] : s.ladder.setAside,
    done,
    levelId: done ? levelForLadder(outcomes) : null,
    endedAt: done && isNum(now) ? now : null,
  };
  return { state: { ...s, ladder }, step: { ...step, nextRung: rung, done, levelId: ladder.levelId } };
}

/**
 * The next ladder question, in the ladder's own curriculum order. After a
 * `fast` at rung 2 the next item is the next Medium of that rung (plan §3.2).
 * Falls back down the rungs; null when nothing is left.
 */
export function pickLadderQuestion(state, bank, { solved = new Set(), isLocked = () => false } = {}) {
  const s = normalizePathState(state);
  if (s.ladder.done) return null;
  const solvedSet = toSet(solved);
  const asked = new Set([...s.ladder.outcomes.map(o => o.challengeId), ...s.ladder.setAside]);
  const last = s.ladder.outcomes[s.ladder.outcomes.length - 1] || null;
  const preferMedium = !!(last && last.outcome === 'fast' && last.rung === LADDER_RUNGS.length - 1);
  const open = (rungIds) => (c) => rungIds.includes(c.id) && !solvedSet.has(c.id) && !asked.has(c.id) && !isLocked(c);
  for (let r = s.ladder.rung; r >= 0; r--) {
    const ids = LADDER_RUNGS[r];
    if (preferMedium && r === s.ladder.rung) {
      const med = pickNextChallengeWith(LADDER_ORDER, bank, c => open(ids)(c) && c.difficulty === 'Medium');
      if (med) return med;
    }
    const pick = pickNextChallengeWith(LADDER_ORDER, bank, open(ids));
    if (pick) return pick;
  }
  for (let r = s.ladder.rung + 1; r < LADDER_RUNGS.length; r++) {
    const pick = pickNextChallengeWith(LADDER_ORDER, bank, open(LADDER_RUNGS[r]));
    if (pick) return pick;
  }
  return null;
}

/** "Finding your level · question q of 4". */
export function ladderQuestionNumber(state) {
  const s = normalizePathState(state);
  return Math.min(LADDER_LENGTH, s.ladder.outcomes.length + 1);
}

// ───────────────────────────── the roadmap input ────────────────────────────

/** 'capital-one' → a known company name (case-insensitive over `names`), else null. */
export function companyFromSlug(slug, names = []) {
  if (!slug) return null;
  const s = String(slug).toLowerCase();
  const key = (n) => String(n).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return (names || []).find(n => key(n) === s) || null;
}

/**
 * The profile buildRoadmap reads, from the tournament record's profile (the
 * door, the company, the device), arm B's ladder tier and arm D's sprint.
 * Never a date: D's length rides as `deadlineDays` (a number).
 */
export function roadmapProfileFor({ arm = null, visitor = null, state = null, solvedIds = [], isPro = false, companies = [] } = {}) {
  const s = normalizePathState(state);
  const v = visitor && typeof visitor === 'object' ? visitor : {};
  const device = v.device === 'phone' ? 'mobile' : v.device === 'tablet' ? 'tablet' : 'desktop';
  const doorCompany = companyFromSlug(v.company, companies);
  const out = { solvedIds: [...toSet(solvedIds)], isPro: !!isPro, device };
  if (arm === SPRINT_ARM) {
    // D: the sprint's company and length; a learner's sprint is the
    // fundamentals goal (goal 'learning'), never a company-only plan.
    const sp = s.sprint || {};
    if (sp.company) out.company = sp.company;
    out.goal = sp.goal === 'learning' && !sp.company ? 'learning' : 'interview';
    if (isNum(sp.days)) out.deadlineDays = sp.days;
    // The level: the readiness test's band, else the one the first two plan
    // steps measured (D1); else none — the roadmap assumes, and says so.
    if (v.readinessBand) out.level = v.readinessBand === 'high' ? 'working' : v.readinessBand === 'mid' ? 'basics' : 'brand-new';
    else if (sp.levelId) out.level = sp.levelId;
    return out;
  }
  if (s.ladder.levelId) out.level = s.ladder.levelId;
  if (doorCompany) out.company = doorCompany;
  if (v.interviewTarget) out.goal = 'interview';
  return out;
}

// ───────────────────────────── the plan ─────────────────────────────────────

const stepKey = (st) => (st.kind === 'mock' ? `m:${st.mockId}` : `c:${st.challengeId}`);

function normalizePlan(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.steps) || !raw.steps.length) return null;
  const steps = raw.steps.map(st => {
    if (!st || typeof st !== 'object') return null;
    if (st.kind === 'mock' && typeof st.mockId === 'string') return { kind: 'mock', mockId: st.mockId.slice(0, 80), proOnly: st.proOnly === true, part: typeof st.part === 'string' ? st.part : 'mock', day: Number(st.day) || 1 };
    const id = Number(st.challengeId);
    if (!Number.isInteger(id)) return null;
    return { kind: 'challenge', challengeId: id, proOnly: st.proOnly === true, part: typeof st.part === 'string' ? st.part : 'free', day: Number(st.day) || 1, difficulty: typeof st.difficulty === 'string' ? st.difficulty : null };
  }).filter(Boolean);
  if (!steps.length) return null;
  return {
    builtAt: isNum(Number(raw.builtAt)) ? Number(raw.builtAt) : null,
    steps,
    length: steps.length,
    dailyCount: Number(raw.dailyCount) || 2,
    planDays: Number(raw.planDays) || 1,
    deadlineDays: Number(raw.deadlineDays) || null,
    wallAt: Number.isInteger(raw.wallAt) ? raw.wallAt : null,
    why: Array.isArray(raw.why) ? raw.why.filter(w => typeof w === 'string').slice(0, 3).map(w => w.slice(0, 240)) : [],
    profile: raw.profile && typeof raw.profile === 'object' ? raw.profile : null,
    assumedLevel: raw.assumedLevel === true,
    resizedFrom: Number.isInteger(raw.resizedFrom) && raw.resizedFrom > 0 ? raw.resizedFrom : null,
  };
}

/**
 * The plan the person sees, frozen at build time so N stays put:
 *   1. B only: the ladder's solved questions, in the order asked;
 *   2. the roadmap's steps (built with the solved ids, so nothing solved
 *      comes back);
 *   3. B's set-aside ladder questions, returning before the part past the
 *      wall (after the free mock that sits at the wall; they are free).
 * `wallAt` is recomputed over the whole list: the step that is the quota-th
 * solve when the plan is followed (null when there is no quota: Pro, holdout).
 */
export function composePathPlan({ roadmap, ladder = null, lead = [], solved = [], solvedCount = null, quota = FREE_SOLVE_QUOTA, quotaOn = true, now = null } = {}) {
  if (!roadmap || !Array.isArray(roadmap.steps)) return null;
  const solvedSet = toSet(solved);
  const seen = new Set();
  const steps = [];
  const push = (st) => { const k = stepKey(st); if (seen.has(k)) return; seen.add(k); steps.push(st); };
  // D: the steps that must lead, solved or not — the company link's opened
  // question (walk fix D2), then the two the level was read from (D1).
  for (const id of cleanIds(lead)) push({ kind: 'challenge', challengeId: id, proOnly: false, part: 'lead', day: 1, difficulty: null });
  const asked = ladder && Array.isArray(ladder.outcomes) ? ladder.outcomes : [];
  for (const o of asked) {
    if (o.outcome !== 'stuck' && solvedSet.has(o.challengeId)) push({ kind: 'challenge', challengeId: o.challengeId, proOnly: false, part: 'ladder', day: 1, difficulty: null });
  }
  for (const st of roadmap.steps) {
    if (st.kind === 'mock') push({ kind: 'mock', mockId: st.mockId, proOnly: !!st.proOnly, part: 'mock', day: st.day || 1 });
    else push({ kind: 'challenge', challengeId: st.challengeId, proOnly: !!st.proOnly, part: st.part || 'free', day: st.day || 1, difficulty: st.difficulty || null });
  }
  const setAside = ladder && Array.isArray(ladder.setAside) ? ladder.setAside : [];
  const back = setAside.filter(id => !seen.has(`c:${id}`) && !solvedSet.has(id));
  if (back.length) {
    // Before the part past the wall, after the free mock that sits at the wall.
    let at = steps.findIndex(st => st.part === 'after_wall');
    if (at < 0) at = steps.findIndex(st => st.kind === 'mock' && st.proOnly);
    if (at < 0) at = steps.length;
    const ins = back.map(id => ({ kind: 'challenge', challengeId: id, proOnly: false, part: 'set_aside', day: (steps[Math.max(0, at - 1)] || {}).day || 1, difficulty: null }));
    ins.forEach(st => seen.add(stepKey(st)));
    steps.splice(at, 0, ...ins);
  }
  const wallAt = planWallAt(steps, { solved: solvedSet, solvedCount, quota, quotaOn });
  return {
    builtAt: isNum(now) ? now : null,
    steps,
    length: steps.length,
    dailyCount: roadmap.dailyCount,
    planDays: roadmap.planDays,
    deadlineDays: roadmap.profile ? roadmap.profile.deadlineDays : null,
    wallAt,
    why: Array.isArray(roadmap.why) ? roadmap.why.slice(0, 3) : [],
    profile: roadmap.profile || null,
    assumedLevel: false,
  };
}

/** 1-based index of the step that is the quota-th solve (free steps and already-solved count). */
export function planWallAt(steps, { solved = [], solvedCount = null, quota = FREE_SOLVE_QUOTA, quotaOn = true } = {}) {
  if (!quotaOn) return null;
  const solvedSet = toSet(solved);
  const inPlanSolved = steps.filter(st => st.kind === 'challenge' && solvedSet.has(st.challengeId)).length;
  let n = Math.max(0, (isNum(solvedCount) ? solvedCount : solvedSet.size) - inPlanSolved);
  if (n >= quota) return 0;
  for (let i = 0; i < steps.length; i++) {
    const st = steps[i];
    if (st.kind !== 'challenge') continue;
    if (solvedSet.has(st.challengeId) || !st.proOnly) n += 1;
    if (n >= quota) return i + 1;
  }
  return null;
}

/**
 * Walk fix round 2 (D): a re-plan keeps the plan's length. The person was
 * told N ("0/14"); D's level re-plan after step 2 grew it to 16 and the header
 * jumped 2/14 → 2/16. The re-laid plan is fitted to `n`:
 *   - longer: steps are taken off its tail — never a lead step (the link's
 *     question, the two the level was read from), never a solved one, never
 *     the mock;
 *   - shorter: the previous plan's steps it no longer holds (unsolved, in
 *     their old order) fill it, before the part past the wall.
 * Only if it still cannot reach `n` does the length change, and the plan
 * says so (`resizedFrom`, the why-line "Plan updated for your level: N steps").
 */
export function fitPlanToLength(plan, n, { previous = null, solved = [], solvedCount = null, quota = FREE_SOLVE_QUOTA, quotaOn = true } = {}) {
  if (!plan || !Array.isArray(plan.steps) || !(Number.isInteger(n) && n > 0)) return plan;
  if (plan.steps.length === n) return { ...plan, resizedFrom: null };
  const solvedSet = toSet(solved);
  const steps = plan.steps.slice();
  const fixed = (st) => st.part === 'lead' || st.kind === 'mock' || (st.kind === 'challenge' && solvedSet.has(st.challengeId));
  for (let i = steps.length - 1; i >= 0 && steps.length > n; i--) {
    if (!fixed(steps[i])) steps.splice(i, 1);
  }
  if (steps.length < n && previous && Array.isArray(previous.steps)) {
    const have = new Set(steps.map(stepKey));
    const back = previous.steps.filter(st => !have.has(stepKey(st)) && !(st.kind === 'challenge' && solvedSet.has(st.challengeId)));
    let at = steps.findIndex(st => st.part === 'after_wall');
    if (at < 0) at = steps.findIndex(st => st.kind === 'mock' && st.proOnly);
    if (at < 0) at = steps.length;
    const ins = back.slice(0, n - steps.length);
    steps.splice(at, 0, ...ins);
  }
  const wallAt = planWallAt(steps, { solved: solvedSet, solvedCount, quota, quotaOn });
  return { ...plan, steps, length: steps.length, wallAt, resizedFrom: steps.length === n ? null : n };
}

/** Is a step done? A challenge solved, a mock sat. */
export function stepDone(step, { solved = [], mocksDone = [] } = {}) {
  if (!step) return false;
  if (step.kind === 'mock') return toSet(mocksDone).has(step.mockId);
  return toSet(solved).has(step.challengeId);
}

/** k of N. */
export function planProgress(plan, ctx = {}) {
  const steps = plan && Array.isArray(plan.steps) ? plan.steps : [];
  return { k: steps.filter(st => stepDone(st, ctx)).length, n: steps.length };
}

/**
 * The step Next opens: the first step not done and not Pro-only for this
 * person. A quota-gated step is NOT passed over — opening it is today's quota
 * wall. `isProOnly(step)` re-checks live (a Pro person has none).
 */
export function nextPlanStep(plan, { solved = [], mocksDone = [], isProOnly = (st) => !!st.proOnly } = {}) {
  const steps = plan && Array.isArray(plan.steps) ? plan.steps : [];
  for (let i = 0; i < steps.length; i++) {
    const st = steps[i];
    if (stepDone(st, { solved, mocksDone })) continue;
    if (isProOnly(st)) continue;
    return { index: i, step: st };
  }
  return null;
}

/** The plan-end card: steps remain, and every one left is Pro-only. */
export function planEnded(plan, ctx = {}) {
  const { k, n } = planProgress(plan, ctx);
  return n > 0 && k < n && !nextPlanStep(plan, ctx);
}

/** The ids of the plan's challenges, as strings (metrics.md `plan_steps_done_7d` reads `?`). */
export function planIdList(plan) {
  const steps = plan && Array.isArray(plan.steps) ? plan.steps : [];
  return steps.map(st => (st.kind === 'mock' ? `mock:${st.mockId}` : String(st.challengeId)));
}

/** `tournament_plan_shown` payload. */
export function planShownPayload(plan, { arm = null, recompute = false, k = 0 } = {}) {
  if (!plan) return null;
  const p = plan.profile || {};
  return {
    arm,
    length: plan.length,
    dailyCount: plan.dailyCount,
    wallAt: plan.wallAt,
    planDays: plan.planDays,
    k,
    planIds: planIdList(plan),
    proSteps: plan.steps.filter(st => st.proOnly).length,
    recompute: !!recompute,
    profile: {
      scope: p.scope || null, targetKind: p.targetKind || null, company: p.company || null,
      level: p.level || null, levelSource: p.levelSource || null, tier: p.tier || null,
      goal: p.goal || null, goalSource: p.goalSource || null,
      focus: p.focus || null, focusSource: p.focusSource || null,
      deadlineDays: p.deadlineDays || null, deadlineSource: p.deadlineSource || null,
      device: p.device || null,
    },
  };
}

/** Record a plan step done today (D's daily count; the done event). Idempotent per id. */
export function logStepDone(state, { id, day } = {}) {
  const s = normalizePathState(state);
  if (id == null || typeof day !== 'string') return s;
  if (s.doneLog.some(d => String(d.id) === String(id))) return s;
  return { ...s, doneLog: [...s.doneLog, { id, day: day.slice(0, 10) }] };
}

// ───────────────────────────── the sprint (D) ───────────────────────────────

export function normalizeSprint(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const days = SPRINT_LENGTHS.includes(Number(raw.days)) ? Number(raw.days) : null;
  const company = typeof raw.company === 'string' && raw.company.trim() ? raw.company.trim().slice(0, 60) : null;
  const startDay = typeof raw.startDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.startDay) ? raw.startDay : null;
  const setAt = isNum(Number(raw.setAt)) && Number(raw.setAt) > 0 ? Number(raw.setAt) : null;
  if (!setAt || !startDay) return null;
  return {
    company,
    companySource: ['door', 'tap', 'undecided', 'learning', 'skipped'].includes(raw.companySource) ? raw.companySource : null,
    goal: company ? 'interview' : (SPRINT_GOALS.includes(raw.goal) ? raw.goal : 'learning'),
    days,
    daysSource: ['tap', 'no_date', 'skipped'].includes(raw.daysSource) ? raw.daysSource : null,
    startDay,
    setAt,
    probe: Array.isArray(raw.probe) ? raw.probe.filter(o => o && LADDER_OUTCOMES.includes(o.outcome) && Number.isInteger(Number(o.challengeId))).slice(0, SPRINT_PROBE_STEPS).map(o => ({
      challengeId: Number(o.challengeId),
      rung: clampRung(Number(o.rung)),
      outcome: o.outcome,
      secs: isNum(Number(o.secs)) && o.secs !== null ? Math.max(0, Math.round(Number(o.secs))) : null,
      wrongs: isNum(Number(o.wrongs)) ? Math.max(0, Math.round(Number(o.wrongs))) : 0,
      hint: o.hint === true,
    })) : [],
    levelId: PLACEMENT_TIERS[raw.levelId] ? raw.levelId : null,
  };
}

/** Where D's level comes from: the readiness band, the two-step probe, or an assumption. */
export function sprintLevelSource({ visitor = null, state = null } = {}) {
  const s = normalizePathState(state);
  if (visitor && visitor.readinessBand) return 'readiness';
  if (s.sprint && s.sprint.levelId) return 'sprint_probe';
  return 'assumed';
}

/**
 * Stamp a D plan with where its level came from: `assumedLevel` (the why-line
 * says it, the probe runs) or the profile's real `levelSource` (the roadmap
 * calls any level it is handed "stated").
 */
export function sprintPlanMarks(plan, { visitor = null, state = null } = {}) {
  if (!plan) return plan;
  const source = sprintLevelSource({ visitor, state });
  if (source === 'assumed') return { ...plan, assumedLevel: true };
  return { ...plan, assumedLevel: false, profile: plan.profile ? { ...plan.profile, levelSource: source } : plan.profile };
}

/**
 * Record a solved plan step toward D's level probe. Returns { state, levelId }:
 * `levelId` is set on the solve that completes the probe (re-plan then).
 * A no-op once the level is known (band or probe) or for a step already read.
 */
export function sprintProbeRecord(state, { visitor = null, challenge = null, wrongs = 0, hint = false, secs = null } = {}) {
  const s = normalizePathState(state);
  if (!s.sprint || !challenge || sprintLevelSource({ visitor, state: s }) !== 'assumed') return { state: s, levelId: null };
  const id = Number(challenge.id);
  if (s.sprint.probe.length >= SPRINT_PROBE_STEPS || s.sprint.probe.some(o => o.challengeId === id)) return { state: s, levelId: null };
  const rung = rungForChallenge(challenge);
  const outcome = ladderOutcome({ solved: true, wrongs, hint, secs: isNum(secs) ? secs : null, rung });
  const probe = [...s.sprint.probe, { challengeId: id, rung, outcome, secs: isNum(secs) ? Math.round(secs) : null, wrongs: Number(wrongs) || 0, hint: !!hint }];
  const levelId = probe.length >= SPRINT_PROBE_STEPS ? levelForLadder(probe) : null;
  return { state: { ...s, sprint: { ...s.sprint, probe, levelId } }, levelId };
}

/** The sprint as set on the sprint screen. `days` null = no date. Never a date field. */
export function startSprint({ company = null, companySource = null, goal = null, days = null, daysSource = null, today, now } = {}) {
  return normalizeSprint({ company, companySource, goal, days, daysSource, startDay: today, setAt: now });
}

const dayNumber = (ymd) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ''));
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / DAY_MS : null;
};

/** Day d of the sprint (1 on the start day), by the app's calendar day. */
export function sprintDay(sprint, today) {
  const a = dayNumber(sprint && sprint.startDay);
  const b = dayNumber(today);
  if (a === null || b === null) return 1;
  return Math.max(1, b - a + 1);
}

/** Plan steps done on a calendar day. */
export function doneOnDay(state, day) {
  const s = normalizePathState(state);
  return s.doneLog.filter(d => d.day === day).length;
}

/**
 * The day strip's model: "Day d of D · n today". D is the sprint's length,
 * else the plan's own length in days; n = today's count still to do.
 */
export function sprintDayModel(state, { today } = {}) {
  const s = normalizePathState(state);
  if (!s.sprint || !s.plan) return null;
  const d = sprintDay(s.sprint, today);
  const total = s.sprint.days || s.plan.deadlineDays || s.plan.planDays || 14;
  const daily = s.plan.dailyCount || 2;
  const doneToday = doneOnDay(s, today);
  const days = [];
  for (let i = 1; i <= total; i++) {
    const ymdN = dayNumber(s.sprint.startDay) + (i - 1);
    const ymd = new Date(ymdN * DAY_MS).toISOString().slice(0, 10);
    const n = s.doneLog.filter(x => x.day === ymd).length;
    days.push({ day: i, done: n, met: n >= daily, today: i === d, past: i < d });
  }
  return { day: Math.min(d, total), total, over: d > total, daily, doneToday, leftToday: Math.max(0, daily - doneToday), days };
}

/** D's tab rule: open after the first day's count is done, or at the first solve of day 2. */
export function sprintTabsOpen(state) {
  const s = state && state.v ? state : normalizePathState(state);
  if (s.tabsOpenedAt) return true;
  if (!s.sprint || !s.plan) return false;
  const daily = s.plan.dailyCount || 2;
  if (s.doneLog.filter(x => x.day === s.sprint.startDay).length >= daily) return true;
  return s.doneLog.some(x => x.day !== s.sprint.startDay);
}

// ───────────────────────────── the words ────────────────────────────────────

/** i18n key of a placement tier's name (tournamentPath.tier*). */
export const TIER_KEYS = Object.freeze({
  'brand-new': 'tierFoundations',
  basics: 'tierIntermediate',
  working: 'tierAdvanced',
  advanced: 'tierReady',
});

const TR_TIERS = { 'brand-new': 'Temel', basics: 'Orta', working: 'İleri', advanced: 'Mülakata hazır' };

/**
 * "Why this plan", 2–3 lines. English is the engine's own `why` (it names the
 * person's inputs); Turkish is built from the same profile fields. No line
 * names Pro (the engine's rule, test-pinned there and here).
 */
export function pathWhyLines(plan, lang = 'en') {
  if (!plan) return [];
  const lines = pathWhyLinesRaw(plan, lang);
  if (plan.resizedFrom) {
    // Round 2: the re-plan could not keep N — say so, with the new length.
    const n = plan.length || (plan.steps || []).length;
    lines.push(lang === 'tr' ? `Plan seviyene göre güncellendi: ${n} adım.` : `Plan updated for your level: ${n} steps.`);
  }
  if (!plan.assumedLevel || !lines.length) return lines;
  // D1: the level was not measured — the sizing line says it was assumed.
  const p = plan.profile || {};
  const days = p.deadlineDays || plan.planDays;
  const assumed = lang === 'tr'
    ? `${days} gün, günde ${plan.dailyCount}. Seviyeni ${TR_TIERS[p.level] || 'Orta'} varsaydık; ilk iki cevabın bunu düzeltecek.`
    : `${days} days, ${plan.dailyCount} a day. We assumed ${p.tier || 'Intermediate'}; your first two answers will adjust it.`;
  return [...lines.slice(0, lines.length - 1), assumed];
}

function pathWhyLinesRaw(plan, lang) {
  if (lang !== 'tr') return (plan.why || []).slice(0, 3);
  const p = plan.profile || {};
  const out = [];
  if (p.scope === 'company' && p.targetKind === 'archetype') out.push(`${p.company} için hazırladığımız set ve onun zamanlı mülakatı üzerine kuruldu.`);
  else if (p.scope === 'company') out.push(`${p.company} etiketli sorulardan ve en zayıf becerilerinden kuruldu — şirketin kendi süreci değil.`);
  else if (p.scope === 'sector') out.push('Geldiğin sektörün veri setleri üzerine kuruldu.');
  else out.push(p.goal === 'interview' ? 'Bir SQL mülakatının istediği becerileri kapsar.' : p.goal === 'job_ready' ? 'İlk analist işinin istediği becerileri kapsar.' : 'Sağlam bir SQL temelinin becerilerini kapsar.');
  if (p.focus) out.push(`${p.focus} en çok yer alan konu: şimdiye kadarki en zayıf becerin.`);
  const tier = TR_TIERS[p.level] || '';
  out.push(p.deadlineSource === 'stated'
    ? `Mülakatına ${p.deadlineDays} gün: günde ${plan.dailyCount}, ${tier} seviyene göre.`
    : `Tarih verilmedi; ${tier} seviyen için ${p.deadlineDays} günlük bir sprint olarak boyutlandı: günde ${plan.dailyCount}.`);
  return out.slice(0, 3);
}
