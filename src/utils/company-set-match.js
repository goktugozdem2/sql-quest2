// Company practice-set match — founder's SEO plan P3.21, 2026-09-13.
//
// For a named company WITHOUT a signed interview archetype (every company
// except the ones src/utils/interview-prep.js offers a readiness score for),
// how well does this user's Skillmap match the skills that company's SQL Quest
// practice set leans on, and how much of the set have they solved?
//
// Deliberately NOT called readiness. interview-prep.js refuses to put a
// readiness number over a tag filter of the generic bank, and that rule
// stands. This is the same arithmetic the public readiness test uses on its
// result card ("a weighting of our set, not a measurement of {Company}'s
// interview"), carried into the app with the same wording, so a readiness-test
// arrival (?src=readiness sets prepTarget.company) finds the number continued
// rather than reinvented. It never predicts an outcome.
//
// Pure: no React, no storage, no clock.

import { SKILL_TO_RADAR, mapTopicToSkill } from './skill-calc.js';
import { isFreePreview } from './challenge-order.js';

export const SET_MATCH_MIN_SOLVES = 5;
export const SET_MATCH_WEIGHTS = Object.freeze({ coverage: 0.5, skills: 0.5 });

const DIFF = { Easy: 0, Medium: 1, Hard: 2 };
const resolve = raw => SKILL_TO_RADAR[raw] || SKILL_TO_RADAR[mapTopicToSkill(raw || '')] || null;
const skillsOf = c => [...new Set([...(c.skills || []), c.category].filter(Boolean).map(resolve).filter(Boolean))];
const playableFree = c => c.difficulty !== 'Hard' || isFreePreview(c);

/** The challenges a company is tagged on, Easy → Hard (free previews before locked Hard), then id. */
export function companySet(company, bank, companyMap) {
  if (!company || !Array.isArray(bank) || !companyMap) return [];
  const want = String(company).toLowerCase();
  const byId = new Map(bank.map(c => [c.id, c]));
  return Object.keys(companyMap)
    .filter(id => (companyMap[id] || []).some(n => String(n).toLowerCase() === want))
    .map(id => byId.get(Number(id)))
    .filter(Boolean)
    .sort((a, b) => (DIFF[a.difficulty] * 2 + (a.difficulty === 'Hard' && !isFreePreview(a) ? 1 : 0))
      - (DIFF[b.difficulty] * 2 + (b.difficulty === 'Hard' && !isFreePreview(b) ? 1 : 0)) || a.id - b.id);
}

/**
 * @returns {null | {company, total, solved, coverage, skills, score, weakest, next, demanded}}
 *   null when there is no set or fewer than SET_MATCH_MIN_SOLVES lifetime solves.
 */
export function companySetMatch({ company, bank, companyMap, skillLevels, solvedIds } = {}) {
  const set = companySet(company, bank, companyMap);
  if (set.length === 0) return null;
  const solved = new Set(Array.from(solvedIds || []).map(Number));
  if (solved.size < SET_MATCH_MIN_SOLVES) return null;

  const counts = {};
  for (const c of set) for (const s of skillsOf(c)) counts[s] = (counts[s] || 0) + 1;
  const levels = skillLevels && typeof skillLevels === 'object' ? skillLevels : {};
  const level = s => Math.max(0, Math.min(100, Number(levels[s]) || 0));
  const demanded = Object.entries(counts)
    .map(([skill, n]) => ({ skill, challenges: n, level: level(skill) }))
    .sort((a, b) => b.challenges - a.challenges || a.skill.localeCompare(b.skill));
  const wsum = demanded.reduce((a, d) => a + d.challenges, 0);
  const skills = wsum ? demanded.reduce((a, d) => a + d.challenges * d.level, 0) / wsum : 0;
  const solvedInSet = set.filter(c => solved.has(c.id)).length;
  const coverage = (100 * solvedInSet) / set.length;
  const score = Math.round(coverage * SET_MATCH_WEIGHTS.coverage + skills * SET_MATCH_WEIGHTS.skills);

  // The weakest skill the set actually asks for (ignoring Querying Basics when
  // anything else is demanded), then the first unsolved free challenge in the
  // set that exercises it — or, failing that, the first unsolved free one.
  const pool = demanded.filter(d => d.skill !== 'Querying Basics');
  const weakest = (pool.length ? pool : demanded).slice().sort((a, b) => a.level - b.level || b.challenges - a.challenges)[0] || null;
  const unsolvedFree = set.filter(c => !solved.has(c.id) && playableFree(c));
  const nextC = (weakest && unsolvedFree.find(c => skillsOf(c).includes(weakest.skill))) || unsolvedFree[0] || null;

  return {
    company,
    total: set.length,
    solved: solvedInSet,
    coverage: Math.round(coverage),
    skills: Math.round(skills),
    score: Math.max(0, Math.min(100, score)),
    weakest: weakest ? { skill: weakest.skill, level: weakest.level } : null,
    next: nextC ? { id: nextC.id, title: nextC.title, difficulty: nextC.difficulty } : null,
    demanded,
  };
}
