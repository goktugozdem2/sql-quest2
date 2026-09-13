// One assessment, not two (founder's list, 2026-09-14): a readiness-test
// result placed the person already, so the first-run quiz must not ask again
// and the intake must not re-ask a company the journey already carries.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { placementFromReadiness, levelForReadiness, PLACEMENT_TIERS, FIRST_RUN_PLACEMENT_SOURCES, READINESS_MAX_AGE_DAYS, readFirstRunPlacement, coachPlacementFor } from '../src/utils/placement.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const app = fs.readFileSync(path.join(ROOT, 'src/app.jsx'), 'utf8');
const NOW = Date.parse('2026-09-14T12:00:00Z');
const store = obj => ({ getItem: k => (k === 'sqlquest_readiness_v1' && obj ? JSON.stringify(obj) : null) });
const rec = (over, extra = {}) => ({ at: NOW - 3600_000, company: 'Capital One', overall: over, weakest: 'Conditional Logic', scores: { 'Window Functions': 100, 'Subqueries & CTEs': 100, Joins: 100 }, ...extra });

describe('a readiness result maps onto the placement tiers', () => {
  it('keeps the 2026-08-14 cap: recognition alone never reads interview-ready', () => {
    expect(levelForReadiness(20, {})).toBe('brand-new');
    expect(levelForReadiness(45, {})).toBe('basics');
    expect(levelForReadiness(70, {})).toBe('working');
    // high overall, but the interview skills are not clean → capped
    expect(levelForReadiness(90, { 'Window Functions': 50, 'Subqueries & CTEs': 100 })).toBe('working');
    expect(levelForReadiness(90, { 'Window Functions': 100, 'Subqueries & CTEs': 100 })).toBe('advanced');
    expect(levelForReadiness(undefined, {})).toBeNull();
  });

  it('reads a fresh record and refuses a stale or malformed one', () => {
    const p = placementFromReadiness(store(rec(71, { scores: { 'Window Functions': 50 } })), NOW);
    expect(p).toMatchObject({ level: 'working', tier: PLACEMENT_TIERS.working, overall: 71, company: 'Capital One', weakest: 'Conditional Logic' });
    expect(placementFromReadiness(store(rec(71, { at: NOW - (READINESS_MAX_AGE_DAYS + 1) * 86400000 })), NOW)).toBeNull();
    expect(placementFromReadiness(store({ overall: 80 }), NOW)).toBeNull();
    expect(placementFromReadiness(store(null), NOW)).toBeNull();
    expect(placementFromReadiness({ getItem: () => '{broken' }, NOW)).toBeNull();
  });

  it('the written record is one readFirstRunPlacement accepts, and the Coach then skips its own check', () => {
    expect(FIRST_RUN_PLACEMENT_SOURCES).toContain('first_run_readiness_test');
    const written = { source: 'first_run_readiness_test', firstRunLevel: 'working', placedAt: '2026-09-14T12:00:00.000Z' };
    const back = readFirstRunPlacement({ getItem: () => JSON.stringify(written) });
    expect(back).toMatchObject({ level: 'working', source: 'first_run_readiness_test' });
    const decided = coachPlacementFor({ trust: true, firstRun: back, cold: true, placementIds: [91, 92] });
    expect(decided.placement.skipped).toBe(true);
    expect(decided.placement.skippedBy).toBe('first_run_quiz');
  });
});

describe('the app wiring', () => {
  it('applies the readiness placement once, never over an existing one, and only before a first solve', () => {
    const at = app.indexOf('const readinessPlacementRef');
    expect(at).toBeGreaterThan(0);
    const block = app.slice(at, at + 2200);
    expect(block).toMatch(/if \(readFirstRunPlacement\(localStorage\)\) return;/);
    expect(block).toMatch(/firstRunCompleted \|\| firstRunLevel \|\| solvedChallenges\.size > 0/);
    expect(block).toMatch(/source: 'first_run_readiness_test'/);
    expect(block).toMatch(/completeFirstRun\(goal, placed\.level\)/);
  });

  it('the intake skips a company or date the journey already carries', () => {
    const at = app.indexOf('const answerIntake');
    const block = app.slice(at, at + 1400);
    expect(block).toMatch(/next === 'company' && prepTarget\.company/);
    expect(block).toMatch(/next === 'date' && prepTarget\.date/);
  });
});
