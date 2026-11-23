// Fleet watch: the hourly tripwire's rules (scripts/fleet/watch.mjs). The
// thresholds come from the 11-22 deploy outage: 88 deployments in a day,
// 69 rate-limited main commits, fixes undeployed for 19 h.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { evaluate, THRESHOLDS } from '../scripts/fleet/watch.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const healthy = { prsLastHour: 3, deploysToday: 20, strandedCommits: 0, smokeLastRuns: ['success', 'failure', 'success'] };

describe('fleet watch rules', () => {
  it('a healthy hour raises nothing', () => {
    expect(evaluate(healthy)).toEqual([]);
  });
  it('the 11-22 day raises the deploy-budget and rate-limit alerts', () => {
    const day = { ...healthy, deploysToday: 88, strandedCommits: 69 };
    const a = evaluate(day);
    expect(a.some(l => /88 Vercel deployments/.test(l))).toBe(true);
    expect(a.some(l => /rate-limited/.test(l))).toBe(true);
  });
  it('a PR flood and three failed smokes each raise one line', () => {
    expect(evaluate({ ...healthy, prsLastHour: THRESHOLDS.prsPerHour + 1 })).toHaveLength(1);
    expect(evaluate({ ...healthy, smokeLastRuns: ['failure', 'failure', 'failure', 'success'] })).toHaveLength(1);
    expect(evaluate({ ...healthy, smokeLastRuns: ['failure', 'success', 'failure'] })).toEqual([]);
  });
  it('alerts at 80% of the Hobby cap, not at 100', () => {
    expect(THRESHOLDS.deploysPerDay).toBeLessThanOrEqual(80);
  });
  it('the workflow runs it hourly and can only write issues', () => {
    const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/fleet-watch.yml'), 'utf8');
    expect(wf).toMatch(/cron: '\d+ \* \* \* \*'/);
    expect(wf).toContain('node scripts/fleet/watch.mjs');
    expect(wf).toContain('issues: write');
    expect(wf).not.toMatch(/contents: write/);
  });
});
