// A zero-solve visitor deep-linking to a locked Hard gets a free Hard preview
// of the same kind, not the cold-start dialog's Easy starter (2026-11-22).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { previewSwapFor, previewSwapMatch, SWAP_GENERIC_TAGS } from '../src/utils/paid-wall.js';
import { SKILL_TO_RADAR, mapTopicToSkill } from '../src/utils/skill-calc.js';

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
  // QA 2026-11-23, D2: at 375 px the note rendered under the problem and the
  // hint button, so the visitor read a different question before the reason.
  it('the note renders ABOVE the problem statement, not inside the editor', () => {
    const note = app.indexOf('data-testid="deeplink-swap-note"');
    const problem = app.indexOf('data-onboarding="problem">');
    const editor = app.indexOf('data-onboarding="editor">');
    expect(note).toBeGreaterThan(0);
    expect(problem).toBeGreaterThan(note);
    expect(editor).toBeGreaterThan(problem);
  });
  it('"same kind" is said only for a sameKind match; otherwise "a different question"', () => {
    const i = app.indexOf('data-testid="deeplink-swap-note"');
    const block = app.slice(i, i + 900);
    expect(block).toMatch(/deepLinkSwapNote\.sameKind\s*\?/);
    expect(block).toMatch(/This is a different question/);
    expect(block).not.toMatch(/of the same kind/);
    expect(app).toMatch(/sameKind: match\.sameKind, shared: match\.shared/);
  });
});

// ── The live bank (QA 2026-11-23, D2) ───────────────────────────────────────
// 318 and 319, linked from their /questions/ pages, swapped to #86 "Multi-CTE
// Revenue Pipeline" on SELECT/CTE/JOIN/GROUP BY overlap and were labelled
// "of the same kind". A sameKind swap must now share a defining tag — one
// that is not generic, and that resolves to a canonical skill other than
// Querying Basics — or the match must be flagged as a different question.
describe('the live bank: the swap for the 318/319 question-page links', () => {
  const sb = { window: { challengesData: [] }, console: { log() {} } };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(new URL('../src/data/challenges.js', import.meta.url), 'utf8'), sb);
  const live = sb.window.challengesData;
  const canon = t => SKILL_TO_RADAR[t] || SKILL_TO_RADAR[mapTopicToSkill(t)] || null;
  const parts = c => [...(c.skills || []), c.category].filter(Boolean)
    .flatMap(t => String(t).split(/[/+,]/)).map(t => t.trim()).filter(Boolean);

  for (const id of [318, 319]) {
    it(`${id}: the substitute shares a specific canonical skill, or is called different`, () => {
      const target = live.find(c => c.id === id);
      expect(target.difficulty).toBe('Hard');
      expect(target.freePreview).toBeFalsy();
      const m = previewSwapMatch(target, live, []);
      expect(m && m.swap).toBeTruthy();
      expect(m.swap.freePreview).toBe(true);
      expect(m.swap.difficulty).toBe('Hard');
      if (m.sameKind) {
        expect(m.shared.length).toBeGreaterThan(0);
        for (const tag of m.shared) {
          expect(SWAP_GENERIC_TAGS.has(tag.toLowerCase())).toBe(false);
          expect(parts(target).map(t => t.toLowerCase()).concat(parts(target).map(canon).filter(Boolean).map(s => s.toLowerCase()))).toContain(tag.toLowerCase());
          expect(parts(m.swap).map(t => t.toLowerCase()).concat(parts(m.swap).map(canon).filter(Boolean).map(s => s.toLowerCase()))).toContain(tag.toLowerCase());
          expect(canon(tag)).toBeTruthy();
          expect(canon(tag)).not.toBe('Querying Basics');
        }
      } else {
        expect(m.shared).toEqual([]);
      }
    });
  }

  it('319 (LAG over login dates) gets a LAG preview; 318 (gaps and islands) is told it is a different question', () => {
    const m319 = previewSwapMatch(live.find(c => c.id === 319), live, []);
    expect(m319.sameKind).toBe(true);
    expect(m319.shared).toContain('LAG');
    const m318 = previewSwapMatch(live.find(c => c.id === 318), live, []);
    expect(m318.sameKind).toBe(false);
  });

  // A1 review 2026-11-24: #29 and #80 matched #24 on the raw category
  // "Window Function" — the singular spelling of the canonical skill every
  // free Hard preview carries, so the note read "also uses Window Function".
  it('no locked Hard is called "the same kind" on a spelling of a tag every preview carries', () => {
    const previews = live.filter(c => c.freePreview && c.difficulty === 'Hard');
    const universalCanon = [...new Set(previews.flatMap(c => parts(c).map(canon).filter(Boolean)))]
      .filter(s => previews.every(c => parts(c).map(canon).includes(s)));
    expect(universalCanon).toContain('Window Functions');
    const norm = s => s.toLowerCase().replace(/s$/, '');
    for (const target of live.filter(c => c.difficulty === 'Hard' && !c.freePreview)) {
      const m = previewSwapMatch(target, live, []);
      if (!m || !m.sameKind) continue;
      for (const tag of m.shared) {
        expect(universalCanon.map(norm), `#${target.id} -> #${m.swap.id} on "${tag}"`).not.toContain(norm(tag));
      }
    }
  });

  it('a broad tag alone never makes "the same kind" (the #86 match)', () => {
    const m = previewSwapMatch(live.find(c => c.id === 318), live, []);
    if (m.swap.id === 86) expect(m.sameKind).toBe(false);
    const broad = { id: -1, difficulty: 'Hard', category: 'CTE', skills: ['SELECT', 'CTE', 'JOIN', 'GROUP BY', 'Window Functions'] };
    expect(previewSwapMatch(broad, live, []).sameKind).toBe(false);
  });
});
