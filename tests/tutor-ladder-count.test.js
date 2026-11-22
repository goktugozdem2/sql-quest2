// The ladder's request number counts the silent first read (2026-11-22).
// docs/reads/tutor-ladder-2026-11-22.md: after a diagnosis opener the tutor
// answered rung 1 silently, then the person's first typed question was sent
// as rung 1 again — the clause (rung 2) came only on their second question.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ladderRequestNumber } from '../src/utils/tutor-context.js';

const app = fs.readFileSync(path.join(import.meta.dirname, '..', 'src/app.jsx'), 'utf8');

describe('ladderRequestNumber', () => {
  const opener = { role: 'assistant', content: 'Wrong row count.' };
  it('the first request is 1', () => {
    expect(ladderRequestNumber([], 0)).toBe(1);
    expect(ladderRequestNumber([opener], 0)).toBe(1);
  });
  it('after the silent first read was answered, the first typed question is rung 2', () => {
    const afterSilent = [opener, { role: 'assistant', content: 'rung-1 answer' }];
    expect(ladderRequestNumber(afterSilent, 1)).toBe(2);
  });
  it('typed turns and silent answers add up', () => {
    const msgs = [opener, { role: 'assistant', content: 'r1' }, { role: 'user', content: 'why?' }, { role: 'assistant', content: 'r2' }];
    expect(ladderRequestNumber(msgs, 1)).toBe(3);
  });
  it('without a silent read it counts typed turns only (the hint chain)', () => {
    expect(ladderRequestNumber([{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }])).toBe(2);
  });
  it('ignores junk counts', () => {
    expect(ladderRequestNumber(null, -3)).toBe(1);
    expect(ladderRequestNumber([], NaN)).toBe(1);
  });
});

describe('the inline panel feeds the silent count', () => {
  it('builds the context with the silent count', () => {
    expect(app).toContain('buildChallengeTutorContext(userMessage, inlineAiMessages, { silentAnswered: inlineSilentAnsweredRef.current })');
    expect(app).toContain('const hintRequestNumber = ladderRequestNumber(priorMessages, silentAnswered);');
  });
  it('counts a silent request only when the tutor answered it', () => {
    expect(app).toMatch(/if \(response\) \{\n\s*if \(opts\.silent\) inlineSilentAnsweredRef\.current \+= 1;/);
  });
  it('resets the count when the panel opens and when the challenge changes', () => {
    expect(app).toMatch(/setInlineAiMessages\(\[\{ role: 'assistant', content: opener \}\]\);\n\s*inlineSilentAnsweredRef\.current = 0;/);
    expect(app).toMatch(/setInlineAiMessages\(\[\]\);\n\s*inlineSilentAnsweredRef\.current = 0;/);
  });
  it('the ref sits with the panel state, above the early returns', () => {
    const ref = app.indexOf('const inlineSilentAnsweredRef = useRef(0);');
    const early = app.indexOf('if (!dbReady) return');
    expect(ref).toBeGreaterThan(0);
    expect(early === -1 || ref < early).toBe(true);
  });
});
