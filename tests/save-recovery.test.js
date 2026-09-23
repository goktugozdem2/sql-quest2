// Save recovery (2026-09-24). The regression guard refused a real save on
// 09-23 (solved 8 -> 4): the cloud kept 8, and the stale tab would have been
// refused on every autosave after it. A refusal now merges the tab's copy
// into the cloud row and saves that. The merge must never shrink the cloud,
// or the guard refuses the recovery too.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { mergeProgress } from '../src/utils/progress-merge.js';

const app = fs.readFileSync(path.join(import.meta.dirname, '..', 'src/app.jsx'), 'utf8');

describe('the recovery merge only grows the cloud row', () => {
  const cloud = { username: 'u', xp: 550, solvedChallenges: [91, 92, 93, 94, 95, 96, 97, 98], challengeAttempts: [{ challengeId: 91, timestamp: 1 }] };
  const staleTab = { username: 'u', xp: 425, solvedChallenges: [91, 92, 93, 101], challengeAttempts: [{ challengeId: 101, timestamp: 5 }] };
  const { merged, summary } = mergeProgress(cloud, staleTab, { challenges: [{ id: 101, difficulty: 'Easy' }] });
  it('keeps every cloud solve and adds the tab\'s new one', () => {
    expect(merged.solvedChallenges).toEqual(expect.arrayContaining([91, 92, 93, 94, 95, 96, 97, 98, 101]));
    expect(summary.newSolves).toBe(1);
  });
  it('never lowers XP or the solved count below the cloud (the guard would refuse it)', () => {
    expect(merged.xp).toBeGreaterThanOrEqual(cloud.xp);
    expect(merged.solvedChallenges.length).toBeGreaterThanOrEqual(cloud.solvedChallenges.length);
  });
  it('keeps the tab\'s attempts', () => {
    expect(merged.challengeAttempts.map(a => a.challengeId)).toEqual([91, 101]);
  });
});

describe('wiring (source guards)', () => {
  it('the refusal carries the refused data to the component', () => {
    expect(app).toMatch(/new CustomEvent\('sq:save-refused', \{ detail: \{ username, data, message/);
  });
  it('recovers once per session: fetch the cloud row, merge, save, reload', () => {
    const i = app.indexOf('const saveRecoveryTriedRef = useRef(false);');
    const body = app.slice(i, i + 2600);
    expect(body).toMatch(/if \(saveRecoveryTriedRef\.current \|\| !detail\.username \|\| !detail\.data\) return;/);
    expect(body).toMatch(/fetchAccountRow\(username\)/);
    expect(body).toMatch(/mergeProgress\(withLocalAccountKeys\(username, cloud\), detail\.data/);
    expect(body).toMatch(/_flushCloudSave\(username, merged\)/);
    expect(body).toMatch(/'save_recovered'/);
    expect(body).toMatch(/'save_recovery_failed'/);
  });
});
