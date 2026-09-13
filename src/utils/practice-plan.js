// The personalized plan, in one place (founder's list, 2026-09-14).
//
// The pieces already existed and were each behind their own flag — a
// countdown chip, a weakest-skill picker, a daily quota, a company set. What
// was missing is the sentence they make together: how long you have, what is
// weakest, what to solve today, and how much a day that is.
//
// Deliberately FREE-ONLY. Every question this plan names is one the person can
// open right now; nothing here reaches the Pro boundary, which is what keeps
// it out of the paywall experiments that own those flags. A locked challenge
// is never planned, never counted in `remaining`, and never divided into the
// daily number.
//
// Pure: no React, no storage, no clock of its own.

import { SKILL_TO_RADAR, mapTopicToSkill, CANONICAL_SKILLS } from './skill-calc.js';
import { isFreePreview } from './challenge-order.js';
import { dailyQuota } from './spaced-retrieval.js';

export const PLAN_TODAY_MAX = 3;
export const PLAN_WEAKEST_MAX = 3;
/** Below this many solves the radar is still noise; the plan says so instead of naming a weakest skill. */
export const PLAN_MIN_SOLVES_FOR_SKILLS = 3;

const resolve = raw => SKILL_TO_RADAR[raw] || SKILL_TO_RADAR[mapTopicToSkill(raw || '')] || null;
const skillsOf = c => [...new Set([...(c.skills || []), c.category].filter(Boolean).map(resolve).filter(Boolean))];
const playableFree = c => c.difficulty !== 'Hard' || isFreePreview(c);
const RANK = { Easy: 0, Medium: 1, Hard: 2 };

/** The challenges tagged for a company, or the whole bank when none is named. */
export function planScope(company, bank, companyMap) {
  const all = Array.isArray(bank) ? bank : [];
  if (!company || !companyMap) return { scope: all, company: null };
  const want = String(company).toLowerCase();
  const ids = new Set(
    Object.keys(companyMap)
      .filter(id => (companyMap[id] || []).some(n => String(n).toLowerCase() === want))
      .map(Number)
  );
  const scope = all.filter(c => ids.has(c.id));
  return scope.length ? { scope, company } : { scope: all, company: null };
}

/**
 * @returns {{company, daysLeft, weakest, today, remaining, quota, solvedInScope, totalInScope}}
 *   `weakest` is [] until PLAN_MIN_SOLVES_FOR_SKILLS solves; `today` is still
 *   filled (by difficulty) so the plan always answers "what now".
 */
export function buildPracticePlan({
  company = null,
  bank = [],
  companyMap = null,
  skillLevels = {},
  solvedIds = [],
  daysLeft = null,
} = {}) {
  const { scope, company: scopedCompany } = planScope(company, bank, companyMap);
  const solved = new Set(Array.from(solvedIds || []).map(Number));
  const free = scope.filter(playableFree);
  const unsolved = free.filter(c => !solved.has(c.id));
  const solvedInScope = free.length - unsolved.length;

  const levels = skillLevels && typeof skillLevels === 'object' ? skillLevels : {};
  const demanded = new Set(free.flatMap(skillsOf));
  const weakest = solved.size >= PLAN_MIN_SOLVES_FOR_SKILLS
    ? CANONICAL_SKILLS
      .filter(s => demanded.has(s))
      .map(s => ({ skill: s, level: Math.max(0, Math.min(100, Math.round(Number(levels[s]) || 0))) }))
      .sort((a, b) => a.level - b.level || CANONICAL_SKILLS.indexOf(a.skill) - CANONICAL_SKILLS.indexOf(b.skill))
      .slice(0, PLAN_WEAKEST_MAX)
    : [];

  // Today: the gentlest unsolved question on each weakest skill, in order,
  // then whatever is next by difficulty. Never the same challenge twice.
  const byEase = (a, b) => RANK[a.difficulty] - RANK[b.difficulty] || a.id - b.id;
  const today = [];
  const taken = new Set();
  for (const w of weakest) {
    const pick = unsolved
      .filter(c => !taken.has(c.id) && skillsOf(c).includes(w.skill))
      .sort(byEase)[0];
    if (pick) { today.push({ id: pick.id, title: pick.title, difficulty: pick.difficulty, skill: w.skill }); taken.add(pick.id); }
    if (today.length >= PLAN_TODAY_MAX) break;
  }
  for (const c of unsolved.slice().sort(byEase)) {
    if (today.length >= PLAN_TODAY_MAX) break;
    if (taken.has(c.id)) continue;
    today.push({ id: c.id, title: c.title, difficulty: c.difficulty, skill: skillsOf(c)[0] || null });
    taken.add(c.id);
  }

  const days = typeof daysLeft === 'number' && Number.isFinite(daysLeft) ? daysLeft : null;
  return {
    company: scopedCompany,
    daysLeft: days,
    weakest,
    today,
    remaining: unsolved.length,
    solvedInScope,
    totalInScope: free.length,
    quota: dailyQuota({ daysOut: days, remaining: unsolved.length }),
  };
}
