// P3.20 (interview goal onboarding: company + level) and P3.21 (company
// practice-set match), SEO plan 2026-09-13.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { companySet, companySetMatch, SET_MATCH_MIN_SOLVES } from '../src/utils/company-set-match.js';
import { INTAKE_COMPANIES, intakeStepsFor, nextIntakeStep, buildIntakeRecord, intakeEventPayload } from '../src/utils/onboarding-intake.js';
import { loadQuestionBank } from '../scripts/question-slugs.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const app = fs.readFileSync(path.join(ROOT, 'src/app.jsx'), 'utf8');
const i18n = fs.readFileSync(path.join(ROOT, 'src/utils/i18n.js'), 'utf8');
const NOW = Date.parse('2026-09-13T12:00:00Z');

const bank = [
  { id: 1, title: 'A', difficulty: 'Easy', skills: ['LEFT JOIN'], category: 'JOIN' },
  { id: 2, title: 'B', difficulty: 'Medium', skills: ['ROW_NUMBER'], category: 'Window Functions' },
  { id: 3, title: 'C', difficulty: 'Hard', skills: ['ROW_NUMBER'], category: 'Window Functions' },
  { id: 4, title: 'D', difficulty: 'Hard', skills: ['GROUP BY'], category: 'Aggregation', freePreview: true },
  { id: 9, title: 'Z', difficulty: 'Easy', skills: ['SELECT'], category: 'SELECT' },
];
const map = { 1: ['Acme'], 2: ['Acme'], 3: ['Acme', 'Other'], 4: ['Acme'] };

describe('company practice-set match', () => {
  it('orders the set Easy → Medium → free Hard previews → locked Hard', () => {
    expect(companySet('acme', bank, map).map(c => c.id)).toEqual([1, 2, 4, 3]);
  });

  it('says nothing below the evidence bar or for a company with no set', () => {
    expect(companySetMatch({ company: 'Acme', bank, companyMap: map, solvedIds: [1, 2, 9], skillLevels: {} })).toBeNull();
    expect(companySetMatch({ company: 'Nobody', bank, companyMap: map, solvedIds: [1, 2, 3, 4, 9], skillLevels: {} })).toBeNull();
    expect(SET_MATCH_MIN_SOLVES).toBe(5);
  });

  it('is half coverage, half skill level weighted by the set, and points at the weakest demanded skill', () => {
    const solved = [1, 9, 100, 101, 102];
    const m = companySetMatch({ company: 'Acme', bank, companyMap: map, solvedIds: solved, skillLevels: { Joins: 80, 'Window Functions': 20, 'Aggregation & Grouping': 50 } });
    expect(m.total).toBe(4);
    expect(m.solved).toBe(1);
    expect(m.coverage).toBe(25);
    // weights: Joins 1, Window 2, Aggregation 1 → (80 + 40 + 50) / 4 = 42.5
    expect(m.skills).toBe(43);
    expect(m.score).toBe(Math.round(25 * 0.5 + 42.5 * 0.5));
    expect(m.weakest.skill).toBe('Window Functions');
    // next: unsolved FREE challenge on the weakest skill — 2, never the locked Hard 3
    expect(m.next.id).toBe(2);
  });

  it('works on the live bank for every intake company', () => {
    const { bank: live, tags } = loadQuestionBank();
    for (const c of INTAKE_COMPANIES) {
      expect(companySet(c, live, tags).length, c).toBeGreaterThan(0);
    }
  });
});

describe('intake — company and level for an interview goal', () => {
  it('an interview adds company after goal and level after date; other goals are unchanged', () => {
    expect(intakeStepsFor('interview')).toEqual(['goal', 'company', 'date', 'level', 'role']);
    expect(intakeStepsFor('job')).toEqual(['goal', 'date', 'role']);
    expect(nextIntakeStep('goal', 'interview')).toBe('company');
    expect(nextIntakeStep('date', 'interview')).toBe('level');
    expect(nextIntakeStep('goal', 'general')).toBe('date');
  });

  it('records a known company and level, drops unknown ones, and never writes them for other goals', () => {
    const r = buildIntakeRecord({ goal: 'interview', company: 'Stripe', level: 'mid' }, NOW);
    expect(r.company).toBe('Stripe');
    expect(r.level).toBe('mid');
    expect(buildIntakeRecord({ goal: 'interview', company: 'Initech', level: 'wizard' }, NOW)).toMatchObject({ company: null, level: null });
    const job = buildIntakeRecord({ goal: 'job', company: 'Stripe', level: 'mid' }, NOW);
    expect('company' in job).toBe(false);
    expect(intakeEventPayload(r, { now: NOW }).company).toBe('Stripe');
  });

  it('the intake company list is exactly the app\'s ?company= VALID list', () => {
    const m = app.match(/const VALID = \[([\s\S]*?)\];/);
    const valid = [...m[1].replace(/\/\/.*$/gm, '').matchAll(/'([^']+)'/g)].map(x => x[1]).sort();
    expect([...INTAKE_COMPANIES].sort()).toEqual(valid);
  });

  it('the company answer writes prepTarget; level lands on userGoals', () => {
    const at = app.indexOf('const completeIntake = (draft) =>');
    const block = app.slice(at, at + 5000);
    expect(block).toMatch(/record\.company \? \{ company: record\.company \} : \{\}/);
    expect(block).toMatch(/level: record\.level/);
  });
});

describe('the Coach card', () => {
  it('is behind companySetMatch (=== true), skips archetype companies, and never says readiness', () => {
    const at = app.indexOf('data-testid="company-set-match"');
    const before = app.slice(at - 2500, at);
    expect(before).toMatch(/window\.FF\?\.feature\?\.\('companySetMatch'\) === true/);
    expect(before).toMatch(/if \(findTarget\(prepTarget\.company/);
    const blocks = i18n.split('    companySetMatch: {').slice(1).map(b => b.slice(0, b.indexOf('\n    },')));
    expect(blocks.length).toBe(2);
    for (const b of blocks) {
      expect(b).not.toMatch(/readiness|hazırlık|pass|chance|geçme|şans/i);
      expect(b).toMatch(/whatItIs: '/);
    }
  });

  it('the flag ships off', () => {
    const flags = fs.readFileSync(path.join(ROOT, 'src/data/feature-flags.js'), 'utf8');
    expect(flags).toMatch(/companySetMatch: false,/);
  });
});
