// Goal measure (2026-09-17, the founder's directive: ask the goal, measure
// where the person stands ON THAT GOAL, show it honestly, plan it). The ten
// questions and the scoring live in src/data/readiness-questions.js and are
// shared with the public /sql-interview-readiness-test/ page; the app asks
// them behind `goalMeasure`. The guards below pin: the module scores exactly
// as the page's inline script does, the company weights equal the company
// pages' own numbers, the stored record keeps the page's shape, the floors
// touch skipIf only, and app.jsx keeps the flag dark, the copy honest, and
// the Pro words out.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  QUESTIONS, READINESS_SKILLS, READINESS_RECORD_KEY, GOAL_MEASURE_FRESH_DAYS,
  canonicalSkillsOf, taggedChallengesFor, companySkillWeights, equalWeights,
  scoreReadiness, summarizeScores, weakestSkills, readinessRecordFrom, readReadinessRecord,
} from '../src/data/readiness-questions.js';
import { QUESTIONS as PAGE_QUESTIONS, buildData } from '../scripts/build-readiness-test.mjs';
import { loadBank, facts } from '../scripts/build-company-pages.mjs';
import { CANONICAL_SKILLS } from '../src/utils/skill-calc.js';
import { seedFloorsFromReadiness, seedFloorsFor, FIRST_RUN_PLACEMENT_SOURCES, levelForReadiness } from '../src/utils/placement.js';
import { applySeedFloors } from '../src/utils/coach.js';

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
const NOW = Date.UTC(2026, 8, 17, 12, 0, 0);

// The public page's own scoring, copied verbatim from the inline script in
// scripts/build-readiness-test.mjs — the oracle the module must equal.
function pageScore(answers, weights) {
  const per = {};
  QUESTIONS.forEach((q, k) => { per[q.skill] = per[q.skill] || { right: 0, total: 0 }; per[q.skill].total++; if (answers[k]) per[q.skill].right++; });
  const skills = Object.keys(per);
  const score = s => Math.round(100 * per[s].right / per[s].total);
  let wsum = 0, acc = 0;
  skills.forEach(s => { const w = weights[s] || 0; wsum += w; acc += w * score(s); });
  const overall = wsum ? Math.round(acc / wsum) : Math.round(skills.reduce((a, s) => a + score(s), 0) / skills.length);
  const weakest = skills.slice().sort((a, b) => score(a) - score(b) || (weights[b] || 0) - (weights[a] || 0))[0];
  return { overall, weakest, scores: Object.fromEntries(skills.map(s => [s, score(s)])) };
}

describe('the shared questions module', () => {
  it('is the page\'s question set, re-exported unchanged', () => {
    expect(PAGE_QUESTIONS).toBe(QUESTIONS);
    expect(QUESTIONS.length).toBe(10);
    for (const q of QUESTIONS) {
      expect(q.options.length, q.q).toBe(4);
      expect(CANONICAL_SKILLS, q.q).toContain(q.skill);
    }
    expect(READINESS_SKILLS).toEqual(['Joins', 'Window Functions', 'Aggregation & Grouping', 'Subqueries & CTEs', 'NULL Handling', 'Date Functions', 'Conditional Logic']);
    expect(READINESS_RECORD_KEY).toBe('sqlquest_readiness_v1');
    expect(GOAL_MEASURE_FRESH_DAYS).toBe(7);
  });

  it('the generator inlines the module, not a copy — the built page carries every question verbatim', () => {
    const page = read('../src/sql-interview-readiness-test.html');
    for (const q of QUESTIONS) expect(page).toContain(JSON.stringify(q.q));
    const script = read('../scripts/build-readiness-test.mjs');
    expect(script).toContain("from '../src/data/readiness-questions.js'");
    expect(script).not.toMatch(/export const QUESTIONS = \[/);
  });

  it('company weights equal the company pages\' own share-of-set numbers, for every company the page lists', () => {
    const bank = loadBank();
    const all = [...bank.byId.values()];
    const data = buildData();
    expect(Object.keys(data.companies).length).toBeGreaterThanOrEqual(30);
    for (const [slug, c] of Object.entries(data.companies)) {
      const f = facts(bank, c.name);
      const w = companySkillWeights({ tags: bank.tags, challenges: all, name: c.name });
      expect(w.n, slug).toBe(f.n);
      for (const s of READINESS_SKILLS) {
        expect(w.weights[s], `${slug}/${s}`).toBe((f.dist.find(d => d.skill === s) || { share: 0 }).share);
      }
      expect(w.weights).toEqual(c.weights);
    }
    // an unknown company has no set and no weights → the caller falls back
    expect(companySkillWeights({ tags: bank.tags, challenges: all, name: 'Nowhere Inc' })).toEqual({ n: 0, weights: Object.fromEntries(READINESS_SKILLS.map(s => [s, 0])) });
    expect(taggedChallengesFor(bank.tags, all, 'snowflake').length).toBe(facts(bank, 'Snowflake').n);
    expect(canonicalSkillsOf({ skills: ['LEFT JOIN', 'ROW_NUMBER'], category: 'Window Functions' })).toEqual(['Joins', 'Window Functions']);
  });

  it('scores exactly as the page does — equal weights and company weights, over a spread of answer patterns', () => {
    const bank = loadBank();
    const all = [...bank.byId.values()];
    const snow = companySkillWeights({ tags: bank.tags, challenges: all, name: 'Snowflake' }).weights;
    const patterns = [
      Array(10).fill(true),
      Array(10).fill(false),
      [true, false, true, false, true, false, true, false, true, false],
      [false, true, false, true, false, true, false, true, false, true],
      [true, true, false, false, true, true, false, true, true, true],
      [false, false, true, true, false, false, true, false, false, false],
      [true, false, false, false, false, false, false, false, false, false],
    ];
    for (const weights of [equalWeights(), snow]) {
      for (const p of patterns) {
        const mine = scoreReadiness(p, { weights });
        const page = pageScore(p, weights);
        expect({ overall: mine.overall, weakest: mine.weakest, scores: mine.scores }, JSON.stringify(p)).toEqual(page);
        expect(mine.answered).toBe(10);
        // and showing a stored result back gives the same number and weakest
        expect(summarizeScores(mine.scores, weights)).toEqual({ overall: page.overall, weakest: page.weakest });
      }
    }
    // no weights argument = equal weights, the page's "no company" branch
    const p = patterns[2];
    expect(scoreReadiness(p).overall).toBe(pageScore(p, equalWeights()).overall);
    expect(scoreReadiness([true, true]).answered).toBe(2);
  });

  it('names the two weakest with their scores, lowest first, ties to the heavier weight', () => {
    const scores = { Joins: 100, 'Window Functions': 0, 'Aggregation & Grouping': 50, 'NULL Handling': 0 };
    expect(weakestSkills(scores, 2, { 'NULL Handling': 20, 'Window Functions': 5 })).toEqual([{ skill: 'NULL Handling', score: 0 }, { skill: 'Window Functions', score: 0 }]);
    expect(weakestSkills(scores, 2)).toEqual([{ skill: 'Window Functions', score: 0 }, { skill: 'NULL Handling', score: 0 }]);
    expect(weakestSkills(null)).toEqual([]);
  });

  it('writes the record in the page\'s shape — at, company, overall, weakest, scores — and nothing else', () => {
    const rec = readinessRecordFrom({ company: 'Snowflake', overall: 43, weakest: 'Window Functions', scores: { Joins: 50 }, now: NOW });
    expect(Object.keys(rec)).toEqual(['at', 'company', 'overall', 'weakest', 'scores']);
    expect(rec).toEqual({ at: NOW, company: 'Snowflake', overall: 43, weakest: 'Window Functions', scores: { Joins: 50 } });
    expect(readinessRecordFrom({ overall: 10, weakest: 'Joins', scores: {} , now: NOW }).company).toBeNull();
    // the page's own write, character for character
    const page = read('../scripts/build-readiness-test.mjs');
    expect(page).toContain("localStorage.setItem('sqlquest_readiness_v1', JSON.stringify({ at: Date.now(), company: co ? co.name : null, overall, weakest, scores:");
  });

  it('reads a fresh record back and refuses a stale, missing or malformed one', () => {
    const store = (v) => ({ getItem: (k) => (k === READINESS_RECORD_KEY ? v : null) });
    const fresh = JSON.stringify({ at: NOW - 3 * 86400000, company: null, overall: 60, weakest: 'Joins', scores: { Joins: 50, 'NULL Handling': 100 } });
    expect(readReadinessRecord(store(fresh), { now: NOW })).toMatchObject({ overall: 60, weakest: 'Joins', ageDays: 3, company: null });
    expect(readReadinessRecord(store(JSON.stringify({ at: NOW - 8 * 86400000, overall: 60, scores: {} })), { now: NOW })).toBeNull();
    expect(readReadinessRecord(store(JSON.stringify({ at: NOW - 8 * 86400000, overall: 60, scores: {} })), { now: NOW, maxAgeDays: 30 })).not.toBeNull();
    expect(readReadinessRecord(store(null), { now: NOW })).toBeNull();
    expect(readReadinessRecord(store('nope'), { now: NOW })).toBeNull();
    expect(readReadinessRecord(store(JSON.stringify({ at: NOW, overall: 'x', scores: {} })), { now: NOW })).toBeNull();
    expect(readReadinessRecord(store(JSON.stringify({ at: NOW + 60000, overall: 5, scores: {} })), { now: NOW })).toBeNull();
  });
});

describe('the check is a placement, and its floors touch skipIf only', () => {
  it('is a first-run placement source the trust path reads', () => {
    expect(FIRST_RUN_PLACEMENT_SOURCES).toContain('first_run_goal_measure');
  });

  it('raises the tier floors by what was evidenced: 100 → 70, 50 → 60, 0 → nothing', () => {
    const floors = seedFloorsFromReadiness('basics', { Joins: 100, 'Window Functions': 0, 'Aggregation & Grouping': 50, 'NULL Handling': 100 });
    expect(floors).toEqual({ 'Querying Basics': 70, Joins: 70, 'Aggregation & Grouping': 60, 'NULL Handling': 70 });
    expect(floors['Window Functions']).toBeUndefined();
    // never lower than the tier's own floor
    expect(seedFloorsFromReadiness('working', { Joins: 50 }).Joins).toBe(60);
    expect(seedFloorsFromReadiness('advanced', { Joins: 0 })).toEqual(seedFloorsFor('advanced'));
    expect(seedFloorsFromReadiness('brand-new', {})).toEqual({});
    expect(seedFloorsFromReadiness('brand-new', { Joins: 'x', 'NULL Handling': 100 })).toEqual({ 'NULL Handling': 70 });
  });

  it('the floors reach skipIf through applySeedFloors and never lower a measured level', () => {
    const seed = { source: 'goal_measure', level: 'basics', floors: seedFloorsFromReadiness('basics', { Joins: 100 }) };
    expect(applySeedFloors({ Joins: 20, 'Window Functions': 80 }, seed)).toEqual({ Joins: 70, 'Window Functions': 80, 'Querying Basics': 70 });
    expect(applySeedFloors({ Joins: 90 }, seed)).toEqual({ Joins: 90, 'Querying Basics': 70 });
  });

  it('the level a result places at is the readiness test\'s own mapping', () => {
    expect(levelForReadiness(20, {})).toBe('brand-new');
    expect(levelForReadiness(43, {})).toBe('basics');
    expect(levelForReadiness(70, {})).toBe('working');
    expect(levelForReadiness(90, { 'Window Functions': 100, 'Subqueries & CTEs': 100 })).toBe('advanced');
  });
});

describe('source guards — app.jsx keeps the measure dark, honest, and quiet about Pro', () => {
  const app = read('../src/app.jsx');
  const flags = read('../src/data/feature-flags.js');
  const i18n = read('../src/utils/i18n.js');
  const blockStart = app.indexOf('── Goal measure (2026-09-17, behind `goalMeasure`)');
  const blockEnd = app.indexOf('── Onboarding intake (P0-1, 2026-09-12)', blockStart);
  const block = app.slice(blockStart, blockEnd);

  it('locates the block and the flag, off', () => {
    expect(blockStart).toBeGreaterThan(-1);
    expect(blockEnd).toBeGreaterThan(blockStart);
    expect(flags).toMatch(/goalMeasure: false,/);
    expect(app).toMatch(/const goalMeasureOn = \(\) => window\.FF\?\.feature\?\.\('goalMeasure'\) === true;/);
    // every surface reads the flag through the one helper (plus the placement-hook gate)
    expect(app.split(".feature?.('goalMeasure')").length - 1).toBe(2);
    expect(app.split(".feature('goalMeasure')").length - 1).toBe(0);
  });

  it('renders after the intake on the start screen, before the quiz, and in the overlay — one render function', () => {
    expect(block).toMatch(/const showGoalMeasureOnStart = goalMeasureOn\(\) && showFirstRunStart && !showZeroSqlLesson && !showIntake\s*\n\s*&& isIntakeComplete\(intakeRecord\) && !!intakeRecord\?\.goal && !goalMeasureStatus;/);
    const intakeAt = app.indexOf(') : showIntake ? (\n                  renderOnboardingIntake()');
    const measureAt = app.indexOf(') : showGoalMeasureOnStart ? (\n                  renderGoalMeasure()', intakeAt);
    const quizAt = app.indexOf('data-onboarding="first-run-placement"', measureAt);
    expect(intakeAt).toBeGreaterThan(-1);
    expect(measureAt).toBeGreaterThan(intakeAt);
    expect(quizAt).toBeGreaterThan(measureAt);
    expect(app.split('renderGoalMeasure()').length - 1).toBe(2);   // the start screen and the overlay
    expect(app.split('const renderGoalMeasure = ').length - 1).toBe(1);
  });

  it('asks the page\'s questions, scores with the shared module, and weights by the company\'s set', () => {
    expect(app).toMatch(/import \{ QUESTIONS as READINESS_QUESTIONS, READINESS_SKILLS, READINESS_RECORD_KEY, companySkillWeights, scoreReadiness, summarizeScores, weakestSkills, readinessRecordFrom, readReadinessRecord \} from '\.\/data\/readiness-questions\.js';/);
    expect(block).toMatch(/scoreReadiness\(goalMeasure\.correct, \{ weights: goalMeasure\.weights \}\)/);
    expect(block).toMatch(/companySkillWeights\(\{ tags: window\.challengeCompanies \|\| \{\}, challenges: bank, name: company \}\)/);
    expect(block).toMatch(/return w\.n > 0 \? \{ n: w\.n, weights: w\.weights \} : null;/);
  });

  it('stores the result in the page\'s key and shape, mirrors it to the account, and seeds floors only', () => {
    expect(block).toMatch(/readinessRecordFrom\(\{ company: ctx\.company, overall: result\.overall, weakest: result\.weakest, scores: result\.scores \}\)/);
    expect(block).toMatch(/localStorage\.setItem\(READINESS_RECORD_KEY, JSON\.stringify\(record\)\)/);
    expect(block).toMatch(/userData\.readiness = record;/);
    expect(app).toMatch(/readiness: readinessRecord,/);
    expect(block).toMatch(/seedFloors: \{ source: 'goal_measure', level, floors: seedFloorsFromReadiness\(level, result\.scores\), at \}/);
    // never the radar: nothing here writes skillLevels or weaknessTracking
    expect(block).not.toMatch(/setWeaknessTracking|skillLevels\s*[:=]/);
  });

  it('a fresh stored result is shown back, not asked again, and the placement hook stands down', () => {
    expect(block).toMatch(/const stored = goalMeasureFromStored\(\);/);
    expect(block).toMatch(/readinessPlacementRef\.current = true;\s*\n\s*setGoalMeasure\(stored\);/);
    expect(block).toMatch(/readReadinessRecord\(localStorage\)/);
    // the ?src=readiness placement hook waits for the goal flow when it is on
    expect(app).toMatch(/if \(window\.FF\?\.feature\?\.\('goalMeasure'\) === true && !!window\.FF\?\.feature\('onboardingIntake'\) && !goalMeasureStatus\) return;/);
  });

  it('"Build my plan" is the placement, lands an interview person on the Coach, and adds no door', () => {
    expect(block).toMatch(/findPlanTarget\(ctx\.company, bank, window\.challengeCompanies \|\| \{\}, mockInterviews\)/);
    expect(block).toMatch(/const level = levelForReadiness\(result\.overall, result\.scores\) \|\| 'basics';/);
    expect(block).toMatch(/completeFirstRun\('interview', level\);/);
    expect(block).toMatch(/startFirstRunPath\(ctx\.goal === 'interview' \? 'interview' : 'zero', level\);/);
    expect(block).toMatch(/source: 'first_run_goal_measure'/);
    expect(block).toMatch(/setActiveTab\('guide'\);/);
    // the plan card's own mounts are the only ones; the measure opens no challenge or mock itself
    expect(block).not.toMatch(/openChallenge\(|startInterview\(|openPrepItem\(/);
  });

  it('fires its own events, and never the ones that give other funnels their meaning', () => {
    for (const ev of ['goal_measure_started', 'goal_measure_completed', 'goal_measure_skipped', 'goal_measure_plan_clicked']) {
      expect(block, ev).toContain(`trackActivationEvent('${ev}'`);
    }
    expect(block).toMatch(/trackActivationEvent\('goal_measure_completed', \{\s*\n\s*goal: ctx\.goal, company: ctx\.company, source: ctx\.source,\s*\n\s*overall: result\.overall, weakest: result\.weakest, answered: result\.answered/);
    for (const ev of ['goal_selected', 'prep_target_set', 'readiness_completed', 'readiness_started']) {
      expect(block, `${ev} must not fire from the measure`).not.toContain(`'${ev}'`);
    }
    // the per-question answers never leave the browser
    expect(block).not.toMatch(/correct: goalMeasure\.correct|answers:/);
  });

  it('never mentions Pro, a price, or checkout', () => {
    expect(block).not.toMatch(/\bPro\b|beginCheckout|pro_modal|price|\$\d/);
    for (const ns of i18n.split('    goalMeasure: {').slice(1).map(b => b.slice(0, b.indexOf('\n    },')))) {
      expect(ns).not.toMatch(/\bPro\b|\$\d|checkout/i);
    }
  });

  it('the skip is a real affordance, the result shows the gap and the disclaimer', () => {
    expect(block).toMatch(/data-goal-measure-skip="true"/);
    expect(block).toMatch(/data-goal-measure-build="true"/);
    expect(block).toMatch(/data-testid="goal-measure-gap"/);
    expect(block).toMatch(/data-testid="goal-measure-disclaimer"/);
    const blocks = i18n.split('    goalMeasure: {').slice(1).map(b => b.slice(0, b.indexOf('\n    },')));
    expect(blocks.length, 'goalMeasure namespace in EN and TR').toBe(2);
    expect(blocks[0]).toContain("resultCompany: 'On the skills the {company} set asks for, you are at {n}/100.'");
    expect(blocks[0]).toContain("resultGeneral: 'On the nine SQL skills you are at {n}/100.'");
    // the public test's own sentence, verbatim
    expect(blocks[0]).toMatch(/a weighting of our set, not a measurement of \{company\}\\'s interview/);
    expect(blocks[1]).toMatch(/bizim setimizin ağırlıklandırması; \{company\} mülakatının ölçümü değil/);
    for (const key of ['eyebrow', 'title', 'sub', 'count', 'correct', 'wrong', 'next', 'finish', 'skip', 'resultCompany', 'resultGeneral', 'weakest',
      'disclaimerCompany', 'disclaimerGeneral', 'stored', 'storedToday', 'skillmap', 'build', 'buildSub']) {
      for (const b of blocks) expect(b, `${key} in both languages`).toMatch(new RegExp(`\\b${key}: '`));
    }
  });

  it('D — the ?goal= link writes the intent the intake\'s way, never over a declared one, and tags its source', () => {
    expect(block).toMatch(/const goalId = intakeGoalForIntent\(params\.get\('goal'\)\);/);
    expect(block).toMatch(/if \(!had \|\| had === 'exploring'\) \{\s*\n\s*localStorage\.setItem\('sqlquest_user_intent', g\.intent\);\s*\n\s*localStorage\.setItem\('sqlquest_intent_asked', '1'\);\s*\n\s*trackActivationEvent\('intent_captured', \{ intent: g\.intent, source: 'link', src/);
    expect(block).toMatch(/applyIntentRouting\(g\.intent, 'link'\);/);
    expect(block).toMatch(/intent = had;\s*\/\/ a declared goal is never overwritten/);
    expect(block).toMatch(/goalSource: 'link'/);
    expect(block).toMatch(/if \(companyFilter && !prepTarget\.company\) setPrepPreference\(\{ company: companyFilter \}\);/);
    // the source enum the routing event carries
    expect(app).toMatch(/const applyIntentRouting = \(intent, source = 'ask'\) =>/);
    expect(app).toContain("applyIntentRouting(g.intent, 'link')");
  });

});
