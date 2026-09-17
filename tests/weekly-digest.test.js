import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const fn = fs.readFileSync(join(ROOT, 'supabase/functions/weekly-digest/index.ts'), 'utf8');

// The founder's directive (2026-09-17): ask every person their goal. The
// weekly digest is the one channel that reaches the registered people who
// were never asked in the app (docs/plans/goal-capture-2026-09-17.md). The
// sender runs on Deno and the founder deploys it, so the guards live here as
// source checks in the activated-note style: the block exists, it is
// conditional on no goal, it carries the three `goal=` links, and it says
// nothing about a price or an unlimited anything.
//
// The gate is a pure function; it is lifted out of the TypeScript source and
// exercised on real shapes of users.data, so "no goal on record" is a tested
// definition rather than a comment.
const between = (src, start, end) => src.slice(src.indexOf(start), src.indexOf(end, src.indexOf(start)));
const goalOnRecordSrc = between(fn, 'function goalOnRecord(', '\n}\n') + '\n}';
const goalOnRecord = new Function(
  `${goalOnRecordSrc.replace('(userData: any): boolean', '(userData)')}; return goalOnRecord;`
)();
const blockSrc = between(fn, 'function goalAskBlock(', '\n}\n');

describe('weekly-digest: the goal question above the report', () => {
  it('asks only a person with no goal on record — intake goal, Coach goal or prep target count as one', () => {
    expect(goalOnRecord(null)).toBe(false);
    expect(goalOnRecord({})).toBe(false);
    expect(goalOnRecord({ weeklyReports: [{}], dailyStreak: 3 })).toBe(false);
    expect(goalOnRecord({ intake: { goal: null, skipped: ['goal', 'date', 'role'] } })).toBe(false);
    expect(goalOnRecord({ coachState: null })).toBe(false);
    expect(goalOnRecord({ prepTarget: { company: '', date: null } })).toBe(false);

    expect(goalOnRecord({ intake: { goal: 'interview' } })).toBe(true);
    expect(goalOnRecord({ intake: { goal: 'learning' } })).toBe(true);
    expect(goalOnRecord({ coachState: { goalId: 'fundamentals' } })).toBe(true);
    expect(goalOnRecord({ prepTarget: { company: 'Snowflake' } })).toBe(true);
    expect(goalOnRecord({ prepTarget: { date: '2026-10-02' } })).toBe(true);
    // Defensive: if a later client persists the post-solve ask, it is honoured.
    expect(goalOnRecord({ intent: 'job_ready' })).toBe(true);
    expect(goalOnRecord({ userIntent: 'interview' })).toBe(true);
    expect(goalOnRecord({ intent: 'exploring' })).toBe(false);
  });

  it('the block is wired conditionally, above the report, and stamped on the sent row', () => {
    expect(fn).toContain('const askGoal = !goalOnRecord(userData)');
    expect(fn).toContain("${askGoal ? goalAskBlock() : ''}");
    // Above the report: the block precedes the hero <h1>.
    expect(fn.indexOf("${askGoal ? goalAskBlock() : ''}")).toBeLessThan(fn.indexOf('${hero}</h1>'));
    // The existing sent row carries goalAsked — no new event, no new table.
    expect(fn).toContain('meta: { goalAsked: askGoal }');
    expect(fn).toMatch(/meta: ok \? \{ \.\.\.\(args\.meta \|\| \{\}\) \}/);
    expect(fn).toContain('goalAsked: askGoal })');
    expect((fn.match(/from\('email_events'\)/g) || []).length).toBe(1);
  });

  it('asks one question with three plain links, each carrying goal= and the digest_goal utm', () => {
    expect(blockSrc).toContain('One question from me: what are you preparing for?');
    for (const goal of ['interview', 'job_ready', 'learning']) {
      expect(blockSrc, goal).toContain(`link('${goal}',`);
    }
    expect(blockSrc).toContain("utm(`/app/?src=digest_goal&goal=${goal}`, 'digest_goal')");
    expect((blockSrc.match(/link\('/g) || []).length).toBe(3);
  });

  it('is in the founder voice without a second sign-off, and mentions no price, no Pro, nothing unlimited', () => {
    expect(blockSrc).toMatch(/I build SQL Quest/);
    expect(blockSrc).not.toMatch(/Founder, SQL Quest|Göktuğ/);
    expect(fn).not.toMatch(/unlimited/i);
    expect(fn).not.toMatch(/\$\d/);
    expect(blockSrc).not.toMatch(/\bPro\b|upgrade|checkout|trial/i);
  });
});
