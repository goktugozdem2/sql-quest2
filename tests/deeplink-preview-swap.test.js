// A zero-solve visitor deep-linking to a locked Hard gets a free Hard preview
// of the same kind, not the cold-start dialog's Easy starter (2026-11-22).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { previewSwapFor } from '../src/utils/paid-wall.js';

const bank = [
  { id: 1, difficulty: 'Hard', category: 'Window Functions', skills: ['ROW_NUMBER', 'PARTITION BY'] },
  { id: 2, difficulty: 'Hard', category: 'CTE', skills: ['WITH', 'JOIN'], freePreview: true },
  { id: 3, difficulty: 'Hard', category: 'Window Functions', skills: ['RANK', 'PARTITION BY'], freePreview: true },
  { id: 4, difficulty: 'Medium', category: 'Window Functions', skills: ['PARTITION BY'], freePreview: true },
  { id: 5, difficulty: 'Hard', category: 'CTE + JOIN', skills: ['WITH'] },
];

describe('previewSwapFor', () => {
  it('picks the free Hard preview sharing the most with the target', () => {
    expect(previewSwapFor(bank[0], bank, []).id).toBe(3);
    expect(previewSwapFor(bank[4], bank, []).id).toBe(2);
  });
  it('never a Medium, never the target, never a solved one; null when none is left', () => {
    expect(previewSwapFor(bank[0], bank, [3]).id).toBe(2);
    expect(previewSwapFor(bank[0], bank, new Set([2, 3]))).toBeNull();
    expect(previewSwapFor(bank[2], bank, [])).toEqual(bank[1]);
  });
});

describe('the app wires it to deep links only', () => {
  const app = fs.readFileSync(new URL('../src/app.jsx', import.meta.url), 'utf8');
  it('the ?challenge= resolver marks its open as a deep link', () => {
    expect(app).toMatch(/setTimeout\(\(\) => openChallenge\(target, \{ fromDeepLink: true \}\), 100\);/);
  });
  it('the swap runs before the cold-start dialog, for Hard, at cold start, from a link', () => {
    const i = app.indexOf("if (opts && opts.fromDeepLink && challenge.difficulty === 'Hard' && isColdStart(practiceSolveCount))");
    const j = app.indexOf('if (openColdStartInstead(challenge.id)) return;');
    expect(i).toBeGreaterThan(0);
    expect(j).toBeGreaterThan(i);
    expect(app.slice(i, j)).toMatch(/trackActivationEvent\('deeplink_preview_swap'/);
    expect(app.slice(i, j)).toMatch(/!isContentLocked\('challenge', swap\)/);
  });
  it('the editor says what happened', () => {
    expect(app).toMatch(/data-testid="deeplink-swap-note"/);
  });
});
