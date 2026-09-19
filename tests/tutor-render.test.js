import { describe, it, expect } from 'vitest';
import { parseTutorContent, asciiSql } from '../src/utils/tutor-render.js';
import fs from 'node:fs';

// Founder QA 2026-09-19, round 3, items 1–3.
const codeOf = (b) => b.filter(x => x.type === 'code').map(x => x.code);
const textOf = (b) => b.filter(x => x.type !== 'code').map(x => x.parts.map(p => p.v).join('')).join('\n');

describe('tutor text rendering', () => {
  it('keeps * inside fenced code: COUNT(*) stays COUNT(*)', () => {
    const b = parseTutorContent('Use this:\n```sql\nSELECT COUNT(*) FROM t WHERE a >= 2\n```\nDone.');
    expect(codeOf(b)).toEqual(['SELECT COUNT(*) FROM t WHERE a >= 2']);
  });
  it('keeps * inside inline code and in plain text', () => {
    const b = parseTutorContent('Write `COUNT(*)` not COUNT(col) — 3 * 4 is fine');
    const parts = b[0].parts;
    expect(parts.find(p => p.t === 'code').v).toBe('COUNT(*)');
    expect(textOf(b)).toContain('3 * 4');
  });
  it('turns typographic operators in code back to ASCII', () => {
    const b = parseTutorContent('```\nWHERE x ≥ 5 AND y ≤ 3 AND z ≠ 1 AND n = “a”\n```');
    expect(codeOf(b)[0]).toBe('WHERE x >= 5 AND y <= 3 AND z <> 1 AND n = "a"');
    expect(asciiSql('a ≥ b')).toBe('a >= b');
  });
  it('renders headings as heading blocks, without the #', () => {
    const b = parseTutorContent('## What Your Query Did\nYou filtered too much.\n### **The Fix**');
    expect(b[0]).toEqual({ type: 'heading', parts: [{ t: 'text', v: 'What Your Query Did' }] });
    expect(b[2].type).toBe('heading');
    expect(textOf(b)).not.toMatch(/#/);
  });
  it('bold is bold, and the ** markers are gone', () => {
    const b = parseTutorContent('**The rule** — read the threshold.');
    expect(b[0].parts[0]).toEqual({ t: 'bold', v: 'The rule' });
  });
  it('drops the language tag of a fence', () => {
    expect(codeOf(parseTutorContent('```SQL\nSELECT 1\n```'))).toEqual(['SELECT 1']);
  });
  it('the app renders tutor messages through TutorText, and nowhere strips * from a message', () => {
    const app = fs.readFileSync(new URL('../src/app.jsx', import.meta.url), 'utf8');
    expect(app).not.toMatch(/content\s*\n?\s*\.replace\(\/\\\*\\\*\/g, ''\)\s*\/\/ Remove markdown bold/);
    expect(app).not.toMatch(/\.replace\(\/\\\*\/g, ''\)\s*\/\/ Remove markdown italic/);
    expect((app.match(/<TutorText /g) || []).length).toBeGreaterThanOrEqual(2);
  });
});

describe('single-star italic (round 4, item 6)', () => {
  const parts = (t) => parseTutorContent(t)[0].parts;
  it('*after* is italic', () => {
    expect(parts('Filter *after* grouping.')).toEqual([
      { t: 'text', v: 'Filter ' }, { t: 'em', v: 'after' }, { t: 'text', v: ' grouping.' },
    ]);
  });
  it('COUNT(*), 3 * 4 and a*b stay literal', () => {
    for (const t of ['Use COUNT(*) here', 'so 3 * 4 = 12', 'a*b and c*d']) {
      expect(parts(t).every(p => p.t !== 'em'), t).toBe(true);
    }
  });
  it('bold still wins over italic', () => {
    expect(parts('**The rule** is *simple*.').map(p => p.t)).toEqual(['bold', 'text', 'em', 'text']);
  });
});
