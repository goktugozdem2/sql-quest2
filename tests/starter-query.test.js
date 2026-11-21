// The first click on an empty editor runs the starter (2026-11-22).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { starterHintFor, starterSqlFromHint, STARTER_PREFIX } from '../src/utils/starter-query.js';

describe('starter hint ↔ runnable SQL', () => {
  it('round-trips', () => {
    expect(starterHintFor('transactions')).toBe('Start here: SELECT * FROM transactions LIMIT 5;');
    expect(starterSqlFromHint(starterHintFor('transactions'))).toBe('SELECT * FROM transactions LIMIT 5;');
  });
  it('reads nothing else as SQL', () => {
    expect(starterSqlFromHint(null)).toBeNull();
    expect(starterSqlFromHint('Write your query here')).toBeNull();
    expect(starterSqlFromHint(`${STARTER_PREFIX}DROP TABLE x;`)).toBeNull();
  });
});

describe('the app: Run and Submit on the empty editor run the starter, never grade it', () => {
  const app = fs.readFileSync(new URL('../src/app.jsx', import.meta.url), 'utf8');
  const run = app.slice(app.indexOf('const runChallengeQuery = () => {'), app.indexOf('const submitChallenge = () => {'));
  const submit = app.slice(app.indexOf('const submitChallenge = () => {'), app.indexOf('const submitChallenge = () => {') + 600);
  it('the hint is built by starterHintFor', () => {
    expect(app).toMatch(/setChallengeStarterHint\(starterHintFor\(mainTable\)\);/);
  });
  it('Run fills the editor with the starter and runs it, recording via=starter', () => {
    expect(run).toMatch(/const starter = starterSqlFromHint\(challengeStarterHint\);/);
    expect(run).toMatch(/setChallengeQuery\(starter\);/);
    expect(run).toMatch(/via = 'starter';/);
    expect(run).toMatch(/db\.exec\(sql\)/);
    expect(run).not.toMatch(/db\.exec\(challengeQuery\)/);
  });
  it('Submit on the empty editor hands off to Run before any grading', () => {
    expect(submit).toMatch(/!challengeQuery\.trim\(\) && starterSqlFromHint\(challengeStarterHint\)\) \{ runChallengeQuery\(\); return; \}/);
  });
});
