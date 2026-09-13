// Rounded-down marketing counts (founder, 2026-09-14) and the sign-in card
// that uses them.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { roundDownCount, companySetCount } from '../src/utils/display-count.js';
import { loadQuestionBank } from '../scripts/question-slugs.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');

describe('roundDownCount', () => {
  it('rounds down to the step with a plus, never up', () => {
    expect(roundDownCount(285, 100)).toBe('200+');
    expect(roundDownCount(299, 100)).toBe('200+');
    expect(roundDownCount(300, 100)).toBe('300+');
    expect(roundDownCount(34, 10)).toBe('30+');
    expect(roundDownCount(9, 10)).toBeNull();
    expect(roundDownCount(undefined, 100)).toBeNull();
  });

  it('on the live bank the sign-in card reads a true, rounded claim', () => {
    const { bank, tags } = loadQuestionBank();
    const q = roundDownCount(bank.length, 100);
    expect(Number(q.replace('+', ''))).toBeLessThanOrEqual(bank.length);
    const c = companySetCount(tags);
    expect(Number(roundDownCount(c, 10).replace('+', ''))).toBeLessThanOrEqual(c);
  });
});

describe('the sign-in card', () => {
  const app = fs.readFileSync(path.join(ROOT, 'src/app.jsx'), 'utf8');
  const block = app.slice(app.indexOf('{/* Social Proof'), app.indexOf("i18n_t('practice', 'practiceWithRealData')"));
  it('has no hard-coded count and no "forever"', () => {
    expect(block).toMatch(/roundDownCount\(/);
    expect(block).not.toMatch(/>\s*\d+\+?\s*</);
    expect(block).not.toMatch(/Forever|forever/);
  });
  it('copy exists in both languages', () => {
    const i18n = fs.readFileSync(path.join(ROOT, 'src/utils/i18n.js'), 'utf8');
    for (const k of ['statInterviewQuestions', 'statCompanySets', 'statCoachValue', 'statCoachLabel']) {
      expect((i18n.match(new RegExp(`\\b${k}: '`, 'g')) || []).length, k).toBe(2);
    }
    expect(i18n).not.toMatch(/practiceWithRealData: '[^']*forever/i);
  });
});
