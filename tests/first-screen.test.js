import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { join } from 'node:path';
import {
  firstScreenArm, firstScreenDecision, FIRST_SCREEN_ARMS, FIRST_SCREEN_STORAGE_KEY,
} from '../src/utils/first-screen.js';

const ROOT = join(import.meta.dirname, '..');
const app = fs.readFileSync(join(ROOT, 'src/app.jsx'), 'utf8');
const flags = fs.readFileSync(join(ROOT, 'src/data/feature-flags.js'), 'utf8');

describe('firstScreenArm', () => {
  it('is deterministic per aid', () => {
    expect(firstScreenArm('abc')).toBe(firstScreenArm('abc'));
  });
  it('splits roughly in half over 2,000 ids', () => {
    let challenge = 0;
    for (let i = 0; i < 2000; i++) if (firstScreenArm(`aid-${i}-${i * 7919}`) === 'challenge') challenge++;
    expect(challenge).toBeGreaterThan(900);
    expect(challenge).toBeLessThan(1100);
  });
  it('only returns a known arm', () => {
    for (let i = 0; i < 50; i++) expect(FIRST_SCREEN_ARMS).toContain(firstScreenArm(String(i)));
  });
});

describe('firstScreenDecision', () => {
  const base = { flagOn: true, onStartScreen: true, aid: 'x' };
  it('does nothing with the flag off', () => {
    expect(firstScreenDecision({ ...base, flagOn: false })).toEqual({ assign: false, arm: null, act: false });
  });
  it('does nothing off the start screen, over another step, or after a level choice', () => {
    expect(firstScreenDecision({ ...base, onStartScreen: false }).assign).toBe(false);
    expect(firstScreenDecision({ ...base, showingOtherStep: true }).assign).toBe(false);
    expect(firstScreenDecision({ ...base, levelChosen: true }).assign).toBe(false);
  });
  it('assigns once and acts only for the challenge arm', () => {
    const d = firstScreenDecision(base);
    expect(d.assign).toBe(true);
    expect(d.act).toBe(d.arm === 'challenge');
  });
  it('keeps a stored arm without re-assigning', () => {
    expect(firstScreenDecision({ ...base, stored: { arm: 'quiz' } })).toEqual({ assign: false, arm: 'quiz', act: false });
    expect(firstScreenDecision({ ...base, stored: { arm: 'challenge' } })).toEqual({ assign: false, arm: 'challenge', act: true });
  });
  it('never assigns without an id', () => {
    expect(firstScreenDecision({ ...base, aid: null }).assign).toBe(false);
  });
});

describe('wiring (source guards)', () => {
  it('is on (flipped 2026-09-26, ahead of the queue, founder\'s go)', () => {
    expect(flags).toMatch(/firstScreenChallenge:\s*true/);
  });
  it('app reads the flag through the pure decision and writes the assignment event', () => {
    expect(app).toMatch(/firstScreenDecision\(/);
    expect(app).toMatch(/feature\('firstScreenChallenge'\)/);
    expect(app).toMatch(/'first_screen_assigned'/);
    expect(app).toContain('FIRST_SCREEN_STORAGE_KEY');
    expect(FIRST_SCREEN_STORAGE_KEY).toBe('sqlquest_first_screen_v1');
  });
  it('the challenge arm opens the zero track with the lesson skipped', () => {
    expect(app).toMatch(/startFirstRunPath\('zero', 'brand-new', \{ skipLesson: true, source: 'first_screen_test' \}\)/);
  });
});
