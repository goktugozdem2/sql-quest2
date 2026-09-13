// The personalized plan (founder's list, 2026-09-14): countdown, weakest
// skills, today's questions, a realistic daily load — free questions only, so
// the plan never leans on the paywall the flagged surfaces are measuring.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildPracticePlan, planScope, PLAN_TODAY_MAX, PLAN_MIN_SOLVES_FOR_SKILLS } from '../src/utils/practice-plan.js';
import { loadQuestionBank } from '../scripts/question-slugs.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const app = fs.readFileSync(path.join(ROOT, 'src/app.jsx'), 'utf8');

const bank = [
  { id: 1, title: 'Easy join', difficulty: 'Easy', skills: ['LEFT JOIN'], category: 'JOIN' },
  { id: 2, title: 'Medium window', difficulty: 'Medium', skills: ['ROW_NUMBER'], category: 'Window Functions' },
  { id: 3, title: 'Locked hard', difficulty: 'Hard', skills: ['ROW_NUMBER'], category: 'Window Functions' },
  { id: 4, title: 'Free hard preview', difficulty: 'Hard', skills: ['GROUP BY'], category: 'Aggregation', freePreview: true },
  { id: 5, title: 'Other easy', difficulty: 'Easy', skills: ['SELECT'], category: 'SELECT' },
];
const map = { 1: ['Acme'], 2: ['Acme'], 3: ['Acme'], 4: ['Acme'] };
const levels = { Joins: 80, 'Window Functions': 20, 'Aggregation & Grouping': 55, 'Querying Basics': 90 };
const solved = [1, 90, 91];

describe('the plan', () => {
  it('scopes to the company set, and falls back to the bank when the company has none', () => {
    expect(planScope('acme', bank, map).scope.map(c => c.id)).toEqual([1, 2, 3, 4]);
    expect(planScope('Nobody', bank, map).scope.length).toBe(bank.length);
    expect(planScope(null, bank, map).company).toBeNull();
  });

  it('never names or counts a locked question', () => {
    const p = buildPracticePlan({ company: 'Acme', bank, companyMap: map, skillLevels: levels, solvedIds: solved });
    expect(p.today.map(t => t.id)).not.toContain(3);
    expect(p.totalInScope).toBe(3);          // 1, 2, 4 — the locked Hard is out
    expect(p.remaining).toBe(2);             // 1 is solved
    expect(p.solvedInScope).toBe(1);
  });

  it('leads with the weakest demanded skill and fills to three', () => {
    const p = buildPracticePlan({ company: 'Acme', bank, companyMap: map, skillLevels: levels, solvedIds: solved });
    expect(p.weakest[0].skill).toBe('Window Functions');
    expect(p.today[0].skill).toBe('Window Functions');
    expect(p.today.length).toBeLessThanOrEqual(PLAN_TODAY_MAX);
    expect(new Set(p.today.map(t => t.id)).size).toBe(p.today.length);
  });

  it('says nothing about weak skills below the evidence bar, but still plans today', () => {
    const p = buildPracticePlan({ company: 'Acme', bank, companyMap: map, skillLevels: levels, solvedIds: [1] });
    expect(solved.length).toBeGreaterThanOrEqual(PLAN_MIN_SOLVES_FOR_SKILLS);
    expect(p.weakest).toEqual([]);
    expect(p.today.length).toBeGreaterThan(0);
  });

  it('turns the date into a daily number, and holds its tongue without one', () => {
    const withDate = buildPracticePlan({ company: 'Acme', bank, companyMap: map, skillLevels: levels, solvedIds: solved, daysLeft: 1 });
    expect(withDate.quota).toMatchObject({ daysOut: 1, remaining: 2, perDay: 2 });
    expect(buildPracticePlan({ company: 'Acme', bank, companyMap: map, skillLevels: levels, solvedIds: solved }).quota).toBeNull();
  });

  it('works on the live bank for a real company', () => {
    const { bank: live, tags } = loadQuestionBank();
    const p = buildPracticePlan({ company: 'Capital One', bank: live, companyMap: tags, skillLevels: {}, solvedIds: [], daysLeft: 12 });
    expect(p.company).toBe('Capital One');
    expect(p.today.length).toBe(PLAN_TODAY_MAX);
    expect(p.quota.perDay).toBeGreaterThan(0);
  });
});

describe('the card', () => {
  it('sits at the top of the Coach tab, opens a question, and is not behind a flag', () => {
    const at = app.indexOf('data-testid="practice-plan"');
    expect(at).toBeGreaterThan(0);
    const before = app.slice(at - 3000, at);
    expect(before).toMatch(/buildPracticePlan\(\{/);
    expect(before).not.toMatch(/window\.FF\?\.feature\?\.\('[a-zA-Z]+'\) === true[\s\S]{0,400}data-testid="practice-plan"/);
    expect(app.slice(at, at + 3000)).toMatch(/data-plan-item=\{item\.id\}/);
    // above the roadmap, which is the rest of the Coach tab
    expect(app.indexOf('{renderSqlRoadmap()}', at)).toBeGreaterThan(at);
  });
  it('copy exists in both languages', () => {
    const i18n = fs.readFileSync(path.join(ROOT, 'src/utils/i18n.js'), 'utf8');
    for (const k of ['titleCompany', 'daysLeft', 'perDay', 'weakest', 'today', 'remaining', 'needSolves']) {
      expect((i18n.match(new RegExp(`\\b${k}: '`, 'g')) || []).length, k).toBeGreaterThanOrEqual(2);
    }
  });
});
