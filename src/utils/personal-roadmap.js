// The personal roadmap — a profile in, an ordered plan out (2026-11-26).
//
// docs/plans/personalized-roadmap-2026-11-26.md is the spec; this is its pure
// half. The founder (chat, 2026-11-26): every interview-prep person gets a
// roadmap from what they are preparing for, the sector, their level, the one
// topic they want, and whether there is a deadline — "tamamiyle
// kişiselleştirilmiş".
//
// TWO LAYERS, and this file is only the first one.
//   1. PERSONALIZATION — what the plan contains is computed from the profile.
//      Deterministic, rule-based, the same in every tournament arm.
//   2. EXPERIMENT — how the profile is captured and how the plan is shown
//      (arm B infers it from the door and the 4-question ladder, arm D asks
//      company in one tap, arm C uses the readiness test). That lives in the
//      arms (docs/plans/first-session-tournament-2026-11-26.md), not here.
// The personalization slices (a company × a level × a focus) are far too
// small to A/B one by one at ~23 new people a day, so this engine is rules,
// and it is judged at arm level (metric `plan_steps_done_7d`).
//
// WHAT IT REUSES, AND THE RULES IT INHERITS
//   - challenge-order.js: every pick and every sort goes through
//     `makeChallengeComparator` over the curriculum order. Never raw bank
//     order (fragile area 4: the raw bank's first Medium is challenge 1).
//   - interview-prep.js: `findPlanTarget` decides archetype vs tagged
//     (≥ MIN_TAGGED_CHALLENGES). A tagged target gets a plan and the honest
//     `taggedTargetNote`, never a readiness number.
//   - free-tier-boundary.js: FREE_SOLVE_QUOTA (10) stays the first wall; the
//     company-set gate's free three (`companySetFreeIds`); `pickProMockId`
//     and FREE_MOCK_ID for the mock steps.
//   - skill-drill.js `challengeMatchesSkill`: the one skill matcher, so
//     "Querying Basics" means basic-only (the 2026-09-19 rule) here too.
//   - placement.js: the four level ids and `levelForReadiness`.
//   - spaced-retrieval.js: INTERVALS_DAYS for the review inserts, WEAK_BELOW.
//   - interview-prep.js MAX_PLAN_ITEMS_PER_DAY (3) as the desktop daily cap.
//
// WHAT IT NEVER DOES
//   - It writes nothing: no storage, no `prepTarget`, no clock, no random.
//     A default sprint length is a number in the result, never a date
//     anywhere (arm D must not write prepTarget.date — deadlineOffer and the
//     interview-outcome note would read it).
//   - It never puts a Pro-only step (a locked Hard, a company-set-gated item,
//     a Pro mock) in front of the person's 10th free solve.
//
// Not wired into app.jsx in this PR: arms B and D call it.

import { CANONICAL_SKILLS } from './skill-calc.js';
import { makeChallengeComparator, isFreePreview } from './challenge-order.js';
import { challengeMatchesSkill } from './skill-drill.js';
import {
  findPlanTarget,
  taggedTargetNote,
  MAX_PLAN_ITEMS_PER_DAY,
  TARGET_KIND,
} from './interview-prep.js';
import {
  FREE_SOLVE_QUOTA,
  FREE_MOCK_ID,
  COMPANY_SET_FREE_COUNT,
  companySetFreeIds,
  pickProMockId,
} from './free-tier-boundary.js';
import { PLACEMENT_TIERS, levelForReadiness } from './placement.js';
import { INTERVALS_DAYS, WEAK_BELOW } from './spaced-retrieval.js';
import { SQL_ROADMAP_CHALLENGE_ORDER } from '../data/roadmap-stages.js';

// ───────────────────────────── the constants ────────────────────────────────

/** A plan is never shorter: the 10 free solves plus two, so the wall is always inside it. */
export const MIN_ROADMAP_STEPS = FREE_SOLVE_QUOTA + 2;

/** Core steps a plan may hold, by level. A beginner's plan is short; a phone's is shortest. */
export const LENGTH_CAP_BY_LEVEL = Object.freeze({
  'brand-new': 15,
  basics: 20,
  working: 25,
  advanced: 30,
});

/**
 * Days a plan is sized for when the person gave no date. A NUMBER, never a
 * stored date. Chosen so the first six solves fall inside the first 2–3 days
 * (10 of 12 buyers bought at ≥ 6 solves, median 1.3 days after the first
 * open — docs/reads/funnel-by-segment-2026-11-26.md).
 */
export const DEFAULT_SPRINT_DAYS_BY_LEVEL = Object.freeze({
  'brand-new': 14,
  basics: 14,
  working: 10,
  advanced: 10,
});

/** The share of each difficulty in a plan, by level — the ramp. */
export const DIFFICULTY_MIX_BY_LEVEL = Object.freeze({
  'brand-new': Object.freeze({ Easy: 0.7, Medium: 0.3, Hard: 0 }),
  basics: Object.freeze({ Easy: 0.4, Medium: 0.5, Hard: 0.1 }),
  working: Object.freeze({ Easy: 0.15, Medium: 0.55, Hard: 0.3 }),
  advanced: Object.freeze({ Easy: 0, Medium: 0.45, Hard: 0.55 }),
});

/** Daily caps: interview-prep's three on a desktop; two on a phone (0 of 84 phone arrivals reached 6 solves). */
export const DAILY_CAP_BY_DEVICE = Object.freeze({ desktop: MAX_PLAN_ITEMS_PER_DAY, tablet: MAX_PLAN_ITEMS_PER_DAY, mobile: 2 });

/** The pace never drops below this: six solves inside the first three days. */
export const MIN_DAILY = 2;

/** The share of the free part a focus skill is guaranteed. */
export const FOCUS_SHARE = 0.3;

/** How much harder a weak skill pulls: weight × (1 + WEAKNESS_PULL × (100 − score)/100). */
export const WEAKNESS_PULL = 1;

/** Goal → the Coach goal whose `skillsTargeted` is the mix when no company or sector is known. */
export const GOAL_TO_COACH_GOAL = Object.freeze({
  interview: 'interview-prep',
  job_ready: 'analyst-day-one',
  learning: 'fundamentals',
});

/** Sector id (src/data/sectors.js) → the dataset-name prefix its challenges run on. */
export const SECTOR_DATASET_PREFIX = Object.freeze({
  finans: 'finans_',
  gayrimenkul: 'gayrimenkul_',
  uretim: 'uretim_',
  'e-ticaret': 'ecommerce',
});

const DIFFS = ['Easy', 'Medium', 'Hard'];
const DIFF_RANK = { Easy: 0, Medium: 1, Hard: 2 };
const LEVELS = Object.keys(PLACEMENT_TIERS);
const GOALS = Object.keys(GOAL_TO_COACH_GOAL);

// ───────────────────────────── small helpers ────────────────────────────────

const isNum = v => typeof v === 'number' && Number.isFinite(v);
const str = v => (typeof v === 'string' && v.trim() ? v.trim() : null);

function toIdSet(ids) {
  if (ids && typeof ids.has === 'function' && typeof ids.forEach === 'function') return new Set(ids);
  return new Set(Array.isArray(ids) ? ids.map(Number) : []);
}

/** Largest-remainder split of `n` over weights; ties go to the earlier key. Deterministic. */
export function apportion(n, weights) {
  const keys = Object.keys(weights).filter(k => weights[k] > 0);
  const total = keys.reduce((s, k) => s + weights[k], 0);
  const out = Object.fromEntries(Object.keys(weights).map(k => [k, 0]));
  if (!(n > 0) || total <= 0) return out;
  const raw = keys.map(k => ({ k, v: (n * weights[k]) / total }));
  let used = 0;
  for (const r of raw) { out[r.k] = Math.floor(r.v); used += out[r.k]; }
  const rest = raw.slice().sort((a, b) => (b.v - Math.floor(b.v)) - (a.v - Math.floor(a.v)) || keys.indexOf(a.k) - keys.indexOf(b.k));
  for (let i = 0; used < n && rest.length; i = (i + 1) % rest.length) { out[rest[i].k] += 1; used += 1; }
  return out;
}

/** Smooth weighted round-robin: a sequence of `n` keys, spread by weight. Deterministic. */
export function weightedSequence(n, weights) {
  const keys = Object.keys(weights).filter(k => weights[k] > 0);
  if (!(n > 0) || keys.length === 0) return [];
  const total = keys.reduce((s, k) => s + weights[k], 0);
  const cur = Object.fromEntries(keys.map(k => [k, 0]));
  const seq = [];
  for (let i = 0; i < n; i++) {
    let best = null;
    for (const k of keys) {
      cur[k] += weights[k];
      if (best === null || cur[k] > cur[best] + 1e-12) best = k;
    }
    cur[best] -= total;
    seq.push(best);
  }
  return seq;
}

function sectorOfChallenge(c, sector) {
  const prefix = SECTOR_DATASET_PREFIX[sector];
  if (!prefix || typeof c?.dataset !== 'string') return false;
  return prefix.endsWith('_') ? c.dataset.startsWith(prefix) : c.dataset === prefix;
}

/** The pool's skill mix, counted the way `challengeMatchesSkill` counts. */
function skillMix(pool) {
  const out = {};
  for (const s of CANONICAL_SKILLS) out[s] = 0;
  for (const c of pool) for (const s of CANONICAL_SKILLS) if (challengeMatchesSkill(c, s)) out[s] += 1;
  return out;
}

// ───────────────────────────── the profile ──────────────────────────────────

/**
 * Every dimension resolved, with where it came from. Unknown dimensions fall
 * back by the rules in the plan doc §2, and the source says which rule fired.
 *
 * @param {Object} profile
 *   company       string|null  — typed, tapped, or from the door (?company=, a company page)
 *   sector        sector id    — ?sector= door / industry answer (finans, gayrimenkul, uretim, e-ticaret)
 *   level         level id     — ladder or placement ('brand-new'|'basics'|'working'|'advanced')
 *   readiness     {overall, scores} — the readiness test (arm C); gives level + skill scores
 *   skillScores   {canonical skill: 0–100} — ladder or radar
 *   focus         canonical skill the person said they want
 *   deadlineDays  number       — days to their interview, if THEY gave one
 *   goal          'interview'|'job_ready'|'learning'
 *   device        'desktop'|'mobile'|'tablet'
 *   solvedIds     ids already solved; solvedCount (defaults to solvedIds' size)
 *   isPro         boolean
 */
export function resolveProfile(profile = {}, bank = [], opts = {}) {
  const p = profile && typeof profile === 'object' ? profile : {};
  const readiness = p.readiness && typeof p.readiness === 'object' ? p.readiness : null;

  // ── target: company (archetype | tagged) → sector → none ──
  const company = str(p.company);
  const target = company
    ? findPlanTarget(company, bank, opts.companyMap || {}, opts.mocks || [], opts.archetypes)
    : null;
  const sector = SECTOR_DATASET_PREFIX[str(p.sector)] ? str(p.sector) : null;
  const scope = target ? 'company' : sector ? 'sector' : 'goal';

  // ── goal: stated → interview when a company or a date was given → by level ──
  let goal = GOALS.includes(p.goal) ? p.goal : null;
  let goalSource = goal ? 'stated' : null;
  if (!goal && (company || isNum(p.deadlineDays))) { goal = 'interview'; goalSource = 'inferred_company_or_date'; }

  // ── level: stated → readiness band → default by goal ──
  let level = LEVELS.includes(p.level) ? p.level : null;
  let levelSource = level ? 'stated' : null;
  if (!level && readiness) {
    level = levelForReadiness(readiness.overall, readiness.scores);
    if (level) levelSource = 'readiness';
  }
  if (!level) {
    level = goal === 'interview' ? 'basics' : 'brand-new';
    levelSource = 'default';
  }
  if (!goal) {
    goal = (level === 'working' || level === 'advanced') ? 'job_ready' : 'learning';
    goalSource = 'inferred_level';
  }

  // ── skill scores: stated → readiness ──
  const scoresIn = (p.skillScores && typeof p.skillScores === 'object') ? p.skillScores
    : (readiness && readiness.scores && typeof readiness.scores === 'object') ? readiness.scores : {};
  const skillScores = {};
  for (const s of CANONICAL_SKILLS) if (isNum(Number(scoresIn[s])) && scoresIn[s] !== null && scoresIn[s] !== '') skillScores[s] = Math.max(0, Math.min(100, Number(scoresIn[s])));

  // ── focus: stated → weakest scored skill → none ──
  let focus = CANONICAL_SKILLS.includes(p.focus) ? p.focus : null;
  let focusSource = focus ? 'stated' : null;
  if (!focus) {
    const scored = CANONICAL_SKILLS.filter(s => s in skillScores && s !== 'Querying Basics');
    if (scored.length) {
      focus = scored.slice().sort((a, b) => skillScores[a] - skillScores[b] || CANONICAL_SKILLS.indexOf(a) - CANONICAL_SKILLS.indexOf(b))[0];
      if (skillScores[focus] >= WEAK_BELOW) focus = null;   // nothing weak: no focus to push
      else focusSource = 'weakest';
    }
  }

  // ── deadline: stated days → default sprint by level (a number, never a date) ──
  const stated = isNum(p.deadlineDays) && p.deadlineDays >= 1 ? Math.round(p.deadlineDays) : null;
  const deadlineDays = stated || DEFAULT_SPRINT_DAYS_BY_LEVEL[level];
  const deadlineSource = stated ? 'stated' : 'default_by_level';

  const device = Object.prototype.hasOwnProperty.call(DAILY_CAP_BY_DEVICE, p.device) ? p.device : 'desktop';

  return {
    company: target ? target.company : company,
    target,
    scope,
    sector,
    goal,
    goalSource,
    level,
    levelSource,
    tier: PLACEMENT_TIERS[level],
    skillScores,
    focus,
    focusSource,
    deadlineDays,
    deadlineSource,
    device,
    isPro: p.isPro === true,
  };
}

// ───────────────────────────── the roadmap ──────────────────────────────────

/**
 * @param {Object} profile  see resolveProfile
 * @param {Array}  bank     window.challengesData (sector + Debug appended)
 * @param {Object} opts
 *   companyMap        window.challengeCompanies
 *   mocks             window.mockInterviewsData
 *   goals             window.coachGoals (skillsTargeted per goal)
 *   curriculumOrder   Map from buildCurriculumOrder (default SQL_ROADMAP_CHALLENGE_ORDER)
 *   archetypes        injectable registry (tests only)
 *   quota             FREE_SOLVE_QUOTA unless a test says otherwise
 *   quotaOn           the freeQuota flag (default true — it is on)
 *   companySetGateOn  the companySetGate flag (default true — it is on)
 * @returns {{steps:Array, length:number, dailyCount:number, planDays:number,
 *            overrunsDeadline:boolean, wallAt:number|null, why:string[],
 *            summary:string, profile:Object}}
 */
export function buildRoadmap(profile = {}, bank = [], opts = {}) {
  const pool0 = Array.isArray(bank) ? bank : [];
  const r = resolveProfile(profile, pool0, opts);
  const order = opts.curriculumOrder instanceof Map ? opts.curriculumOrder : SQL_ROADMAP_CHALLENGE_ORDER;
  const cmp = makeChallengeComparator(order);
  const quota = isNum(opts.quota) && opts.quota > 0 ? opts.quota : FREE_SOLVE_QUOTA;
  const quotaOn = opts.quotaOn !== false && !r.isPro;
  const setGateOn = opts.companySetGateOn !== false && !r.isPro;

  const solved = toIdSet(profile?.solvedIds);
  const solvedCount = isNum(profile?.solvedCount) ? profile.solvedCount : solved.size;
  const quotaLeft = quotaOn ? Math.max(0, quota - solvedCount) : Infinity;

  // ── the candidate pool: unsolved, deduped, no Debug items (H2 owns those) ──
  const seen = new Set();
  const pool = pool0.filter(c => {
    if (!c || !isNum(c.id) || seen.has(c.id) || !Object.prototype.hasOwnProperty.call(DIFF_RANK, c.difficulty)) return false;
    seen.add(c.id);
    return c.type !== 'debug' && !solved.has(c.id);
  });

  // ── scope sets ──
  const targetIds = new Set(r.target ? r.target.challengeIds : []);
  const gatedSet = setGateOn && r.target?.kind === TARGET_KIND.ARCHETYPE;
  const setFree = gatedSet ? companySetFreeIds(pool0.filter(c => c && targetIds.has(c.id))) : null;
  const inScope = c => (r.scope === 'company' ? targetIds.has(c.id)
    : r.scope === 'sector' ? sectorOfChallenge(c, r.sector) : false);
  const proOnly = c => {
    if (r.isPro) return false;
    if (c.difficulty === 'Hard' && !isFreePreview(c)) return true;
    if (gatedSet && targetIds.has(c.id) && !setFree.has(c.id)) return true;
    return false;
  };

  // ── weights: the scope's skill mix × weakness, focus guaranteed ──
  const coachGoal = (Array.isArray(opts.goals) ? opts.goals : []).find(g => g && g.id === GOAL_TO_COACH_GOAL[r.goal]);
  const goalSkills = Array.isArray(coachGoal?.skillsTargeted) && coachGoal.skillsTargeted.length
    ? coachGoal.skillsTargeted.filter(s => CANONICAL_SKILLS.includes(s)) : CANONICAL_SKILLS.slice();
  const scopePool = pool0.filter(c => c && inScope(c));
  let base;
  if (scopePool.length) {
    base = skillMix(scopePool);
  } else {
    base = Object.fromEntries(CANONICAL_SKILLS.map(s => [s, goalSkills.includes(s) ? 1 : 0]));
  }
  // A beginner starts on the fundamentals' skills (and the focus), whatever the company.
  if (r.level === 'brand-new') {
    const fundamentals = (Array.isArray(opts.goals) ? opts.goals : []).find(g => g && g.id === 'fundamentals');
    const allowed = new Set([...(fundamentals?.skillsTargeted || ['Querying Basics', 'Aggregation & Grouping', 'Joins', 'Subqueries & CTEs', 'Conditional Logic']), r.focus].filter(Boolean));
    for (const s of CANONICAL_SKILLS) base[s] = allowed.has(s) ? Math.max(base[s], 1) : 0;
  }
  const weights = {};
  for (const s of CANONICAL_SKILLS) {
    const score = s in r.skillScores ? r.skillScores[s] : null;
    weights[s] = base[s] * (score === null ? 1 : 1 + WEAKNESS_PULL * (100 - score) / 100);
  }
  if (r.focus) {
    const others = CANONICAL_SKILLS.filter(s => s !== r.focus).reduce((sum, s) => sum + weights[s], 0);
    weights[r.focus] = Math.max(weights[r.focus], others * FOCUS_SHARE / (1 - FOCUS_SHARE), 1);
  }

  // ── length and pace ──
  const dailyCap = DAILY_CAP_BY_DEVICE[r.device];
  const lengthCap = r.device === 'mobile' ? MIN_ROADMAP_STEPS : LENGTH_CAP_BY_LEVEL[r.level];
  const coreN = Math.max(MIN_ROADMAP_STEPS, Math.min(r.deadlineDays * dailyCap, lengthCap));
  const mix = DIFFICULTY_MIX_BY_LEVEL[r.level];
  const allowedDiffs = DIFFS.filter(d => mix[d] > 0);
  const F = Math.min(coreN, quotaLeft);

  // ── picking ──
  const picked = new Set();
  const pickOne = (tries, freeOnly) => {
    for (const t of tries) {
      const hit = pool
        .filter(c => !picked.has(c.id)
          && (!freeOnly || !proOnly(c))
          && (t.diff === null ? allowedDiffs.includes(c.difficulty) : c.difficulty === t.diff)
          && (t.skill === null ? CANONICAL_SKILLS.some(s => weights[s] > 0 && challengeMatchesSkill(c, s)) : challengeMatchesSkill(c, t.skill))
          && (t.scoped === null || t.scoped === inScope(c)))
        .sort(cmp)[0];
      if (hit) return { c: hit, t };
    }
    return null;
  };
  const near = d => {
    const i = DIFFS.indexOf(d);
    return [DIFFS[i - 1], DIFFS[i + 1]].filter(x => x && allowedDiffs.includes(x));
  };

  const core = [];
  // The scope's own free items come first into the free part: on a signed
  // set the gate's own free three, at ANY level (they are the set's "free to
  // try", and above Easy the gate frees nothing else of it); else the first
  // free in-scope items at the level's difficulties, in curriculum order. A
  // company person always meets their company inside the free ten.
  const reserved = gatedSet
    ? pool.filter(c => setFree.has(c.id)).sort(cmp)
    : pool.filter(c => inScope(c) && !proOnly(c) && allowedDiffs.includes(c.difficulty)).sort(cmp);
  for (const c of reserved.slice(0, Math.min(COMPANY_SET_FREE_COUNT, F))) {
    picked.add(c.id);
    const s = CANONICAL_SKILLS.filter(k => weights[k] > 0 && challengeMatchesSkill(c, k))
      .sort((a, b) => weights[b] - weights[a] || CANONICAL_SKILLS.indexOf(a) - CANONICAL_SKILLS.indexOf(b))[0] || null;
    core.push({ c, skill: s, phase: 'free', setFree: gatedSet });
  }
  // The slots after the reserved items: a skill each (weights, focus
  // guaranteed) and a difficulty each (the level's ramp, Easy → Hard).
  const k = core.length;
  const diffCounts = apportion(coreN - k, mix);
  const diffSeq = DIFFS.flatMap(d => Array(diffCounts[d]).fill(d));
  const skillSeq = weightedSequence(coreN - k, weights);
  for (let i = k; i < coreN; i++) {
    const freeOnly = i < F;
    const skill = skillSeq[i - k];
    const diff = diffSeq[i - k];
    // Before the wall: the slot's skill first (weakness and focus), in scope first.
    // After the wall: the company's / sector's own set first, whatever the skill.
    const tries = freeOnly
      ? [
        { skill, diff, scoped: true }, { skill, diff, scoped: null },
        ...near(diff).map(d => ({ skill, diff: d, scoped: null })),
        { skill: null, diff, scoped: true }, { skill: null, diff, scoped: null },
        { skill: null, diff: null, scoped: null },
      ]
      : [
        { skill, diff, scoped: true }, { skill: null, diff, scoped: true }, { skill: null, diff: null, scoped: true },
        { skill, diff, scoped: null },
        ...near(diff).map(d => ({ skill, diff: d, scoped: null })),
        { skill: null, diff, scoped: null }, { skill: null, diff: null, scoped: null },
      ];
    const got = pickOne(tries, freeOnly);
    if (!got) break;
    picked.add(got.c.id);
    const s = got.t.skill || CANONICAL_SKILLS.filter(k => weights[k] > 0 && challengeMatchesSkill(got.c, k))
      .sort((a, b) => weights[b] - weights[a] || CANONICAL_SKILLS.indexOf(a) - CANONICAL_SKILLS.indexOf(b))[0] || null;
    core.push({ c: got.c, skill: s, phase: freeOnly ? 'free' : 'after_wall' });
  }

  // If the free bank ran out before the wall, nothing Pro-only may follow.
  const freeCount = core.filter(x => x.phase === 'free').length;
  const coreKept = freeCount < F ? core.filter(x => !proOnly(x.c)) : core;

  // ── order: the ramp (difficulty), then the curriculum, inside each part ──
  const byRamp = (a, b) => (DIFF_RANK[a.c.difficulty] - DIFF_RANK[b.c.difficulty]) || cmp(a.c, b.c);
  const ordered = [
    ...coreKept.filter(x => x.phase === 'free').sort(byRamp),
    ...coreKept.filter(x => x.phase !== 'free').sort(byRamp),
  ];

  const reasonFor = x => {
    if (x.setFree) return 'company_free';
    if (inScope(x.c)) return r.scope === 'company' ? 'company_set' : 'sector';
    if (x.skill && x.skill === r.focus) return r.focusSource === 'stated' ? 'focus' : 'weak_skill';
    return 'skill_mix';
  };
  const asStep = (x, kind = 'challenge', reason = null) => ({
    kind,
    challengeId: x.c.id,
    skill: x.skill,
    difficulty: x.c.difficulty,
    reason: reason || reasonFor(x),
    free: !proOnly(x.c),
    proOnly: proOnly(x.c),
    part: x.phase,
    day: null,
  });
  let steps = ordered.map(x => asStep(x));

  // ── pace ──
  const dailyCount = Math.max(MIN_DAILY, Math.min(dailyCap, Math.ceil(steps.length / r.deadlineDays)));

  // ── spaced-retrieval inserts: the focus skill, 3 / 7 / 14 days after its first planned day ──
  if (r.focus && (r.skillScores[r.focus] ?? 0) < WEAK_BELOW) {
    const firstFocus = steps.findIndex(s => s.skill === r.focus);
    if (firstFocus >= 0) {
      const dayF = Math.floor(firstFocus / dailyCount) + 1;
      const planDays0 = Math.ceil(steps.length / dailyCount);
      let inserted = 0;
      for (const gap of INTERVALS_DAYS) {
        const day = dayF + gap;
        if (day > Math.min(r.deadlineDays, planDays0)) break;
        const at = (day - 1) * dailyCount + inserted;
        const before = steps.slice(0, at).filter(s => s.skill === r.focus && s.kind === 'challenge');
        const ceiling = Math.max(...before.map(s => DIFF_RANK[s.difficulty]), 0);
        const hit = pool
          .filter(c => !picked.has(c.id) && !proOnly(c) && DIFF_RANK[c.difficulty] <= ceiling
            && allowedDiffs.includes(c.difficulty) && challengeMatchesSkill(c, r.focus))
          .sort(cmp)[0];
        if (!hit) break;
        picked.add(hit.id);
        steps.splice(at, 0, asStep({ c: hit, skill: r.focus, phase: 'review' }, 'review', 'retrieval'));
        inserted += 1;
      }
    }
  }

  // ── days ──
  steps.forEach((s, i) => { s.day = Math.floor(i / dailyCount) + 1; });
  const solveSteps = steps.length;
  const planDays = Math.ceil(solveSteps / dailyCount);

  // ── the wall: the step that is the quotaLeft-th free solve ──
  let wallAt = null;
  if (quotaOn) {
    if (quotaLeft === 0) wallAt = 0;
    else {
      let n = 0;
      for (let i = 0; i < steps.length; i++) {
        if (!steps[i].proOnly) n += 1;
        if (n === quotaLeft) { wallAt = i + 1; break; }
      }
    }
  }

  // ── mocks (interview goal): the free mock right after the wall, the Pro mock last ──
  const mockList = Array.isArray(opts.mocks) ? opts.mocks : [];
  if (r.goal === 'interview' && mockList.length) {
    const freeMock = mockList.find(m => m && m.id === FREE_MOCK_ID && m.isFree === true);
    const proMockId = r.target?.mockId || pickProMockId(mockList, r.company);
    if (freeMock) {
      const at = wallAt === null ? steps.length : wallAt;
      steps.splice(at, 0, { kind: 'mock', mockId: freeMock.id, skill: null, difficulty: null, reason: 'mock_free', free: true, proOnly: false, part: 'mock', day: steps[Math.max(0, at - 1)]?.day || 1 });
    }
    if (proMockId) {
      steps.push({ kind: 'mock', mockId: proMockId, skill: null, difficulty: null, reason: 'mock_pro', free: !!r.isPro, proOnly: !r.isPro, part: 'mock', day: steps[steps.length - 1]?.day || 1 });
    }
  }

  // ── what the person reads ──
  const byId = new Map(pool0.filter(c => c && isNum(c.id)).map(c => [c.id, c]));
  const solveSteps2 = steps.filter(s => s.kind !== 'mock');
  const scopedN = solveSteps2.filter(s => byId.has(s.challengeId) && inScope(byId.get(s.challengeId))).length;
  const why = [];
  if (r.scope === 'company' && r.target.kind === TARGET_KIND.ARCHETYPE) {
    why.push(`Built on our ${r.target.challengeCount}-question ${r.company} set${r.target.mockId ? ' and its timed mock' : ''}.`);
  } else if (r.scope === 'company') {
    why.push(taggedTargetNote(r.company, r.target.challengeCount));
  } else if (r.scope === 'sector') {
    why.push(r.company
      ? `We have fewer than 5 questions tagged ${r.company}, so this plan uses the ${r.sector === 'finans' ? 'finance' : r.sector} datasets.`
      : `Built on the ${r.sector === 'finans' ? 'finance' : r.sector} datasets you came in through.`);
  } else if (r.company) {
    why.push(`We have fewer than 5 questions tagged ${r.company}, so this plan covers the skills a ${r.goal === 'interview' ? 'SQL interview' : 'SQL job'} needs.`);
  } else {
    why.push(`Covers the skills a ${r.goal === 'interview' ? 'SQL interview' : r.goal === 'job_ready' ? 'first analyst job' : 'solid SQL foundation'} needs.`);
  }
  if (r.focus) {
    const nFocus = steps.filter(s => s.skill === r.focus).length;
    why.push(r.focusSource === 'stated'
      ? `${r.focus} comes up ${nFocus} times, because you said it is the topic to learn.`
      : `${r.focus} comes up ${nFocus} times: it was your weakest skill so far.`);
  }
  why.push(r.deadlineSource === 'stated'
    ? `${r.deadlineDays} days to your interview: ${dailyCount} a day, starting at ${steps[0]?.difficulty || 'Easy'} for your ${r.tier} level.`
    : `No date given, so it is sized as a ${r.deadlineDays}-day sprint for your ${r.tier} level: ${dailyCount} a day.`);
  const name = r.scope === 'company' ? `${r.company} prep` : r.scope === 'sector' ? `${r.sector === 'finans' ? 'Finance' : r.sector} SQL` : (coachGoal?.name || 'SQL plan');
  const summary = `Your plan: ${name} · ${steps.length} steps · ${dailyCount} a day`;

  return {
    steps,
    length: steps.length,
    dailyCount,
    planDays,
    overrunsDeadline: planDays > r.deadlineDays,
    wallAt: wallAt === null ? null : wallAt,
    why: why.slice(0, 3),
    summary,
    scopeShare: solveSteps2.length ? scopedN / solveSteps2.length : 0,
    profile: {
      company: r.company, scope: r.scope, targetKind: r.target?.kind || null, sector: r.sector,
      goal: r.goal, goalSource: r.goalSource, level: r.level, levelSource: r.levelSource, tier: r.tier,
      focus: r.focus, focusSource: r.focusSource, deadlineDays: r.deadlineDays, deadlineSource: r.deadlineSource,
      device: r.device,
    },
  };
}
