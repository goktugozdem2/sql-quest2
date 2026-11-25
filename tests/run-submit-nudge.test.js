// Run is not Submit — a one-line nudge after a zero-solve person's Run (B5, 2026-11-23).
// Pure half: src/utils/run-submit-nudge.js. Wiring: src/app.jsx.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import {
  RUN_SUBMIT_NUDGE_COPY, runSubmitNudgeArm, runSubmitNudgeDecision,
  runSubmitNudgeEligible, runSubmitNudgeKind, normalizeRunSubmitNudgeRecord,
} from '../src/utils/run-submit-nudge.js';
import { firstScreenArm } from '../src/utils/first-screen.js';
import { companyAskArm } from '../src/utils/company-ask.js';
import { companyDirectArm } from '../src/utils/company-direct.js';
import { quotaWallHashArm } from '../src/utils/quota-wall-inline.js';
import { modalLayoutHashArm } from '../src/utils/modal-layout.js';

const APP = fs.readFileSync(new URL('../src/app.jsx', import.meta.url), 'utf8');
const FLAGS = fs.readFileSync(new URL('../src/data/feature-flags.js', import.meta.url), 'utf8');

const aidIn = (arm) => { for (let i = 0; i < 1000; i++) { const a = `aid-${i}`; if (runSubmitNudgeArm(a) === arm) return a; } throw new Error('no aid'); };
const NUDGE = aidIn('nudge');
const CONTROL = aidIn('control');
const OK = { flagOn: true, solvedCount: 0, challengeSolved: false, hasRows: true, error: null, mutates: false };

describe('the arm', () => {
  it('is stable per aid and splits about evenly', () => {
    expect(runSubmitNudgeArm('x')).toBe(runSubmitNudgeArm('x'));
    let nudge = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) if (runSubmitNudgeArm(`p${i}`) === 'nudge') nudge++;
    expect(nudge / n).toBeGreaterThan(0.46);
    expect(nudge / n).toBeLessThan(0.54);
  });

  // The A/B hash trap (CLAUDE.md): without the murmur finalizer a two-arm
  // FNV split is the exact mirror of every other one.
  const others = {
    'first screen': (a) => firstScreenArm(a) === 'challenge',
    'company ask': (a) => companyAskArm(a) === 'ask',
    'company direct': (a) => companyDirectArm(a) === 'direct',
    'quota wall inline': (a) => quotaWallHashArm(a) === 'inline',
    'modal layout': (a) => modalLayoutHashArm(a) === 'plans_first',
  };
  for (const [name, inOther] of Object.entries(others)) {
    it(`is independent of the ${name} test`, () => {
      let same = 0;
      const n = 4000;
      for (let i = 0; i < n; i++) {
        const a = `p${i}`;
        if ((runSubmitNudgeArm(a) === 'nudge') === inOther(a)) same++;
      }
      expect(same / n).toBeGreaterThan(0.45);
      expect(same / n).toBeLessThan(0.55);
    });
  }
});

describe('who is in the test', () => {
  it('a zero-solve person whose Run returned rows on an unsolved challenge', () => {
    expect(runSubmitNudgeEligible(OK)).toBe(true);
  });
  it('nobody while the flag is off', () => {
    expect(runSubmitNudgeEligible({ ...OK, flagOn: false })).toBe(false);
    expect(runSubmitNudgeEligible()).toBe(false);
  });
  it('only the first solve: anyone with a solve is outside (B1 reads 1 → 3 and 3 → 6)', () => {
    expect(runSubmitNudgeEligible({ ...OK, solvedCount: 1 })).toBe(false);
    expect(runSubmitNudgeEligible({ ...OK, challengeSolved: true })).toBe(false);
  });
  it('not on an SQL error, an empty result or a write challenge', () => {
    expect(runSubmitNudgeEligible({ ...OK, error: 'no such table: x' })).toBe(false);
    expect(runSubmitNudgeEligible({ ...OK, hasRows: false })).toBe(false);
    expect(runSubmitNudgeEligible({ ...OK, mutates: true })).toBe(false);
  });
});

describe('the decision', () => {
  it('assigns once from the hash, and only the nudge arm shows', () => {
    expect(runSubmitNudgeDecision({ eligible: true, aid: NUDGE })).toEqual({ arm: 'nudge', assign: true, show: true });
    expect(runSubmitNudgeDecision({ eligible: true, aid: CONTROL })).toEqual({ arm: 'control', assign: true, show: false });
  });
  it('a stored arm wins and is never re-announced', () => {
    expect(runSubmitNudgeDecision({ eligible: true, aid: CONTROL, stored: { arm: 'nudge', at: 1 } })).toEqual({ arm: 'nudge', assign: false, show: true });
    expect(runSubmitNudgeDecision({ eligible: true, aid: NUDGE, stored: { arm: 'control', at: 1 } })).toEqual({ arm: 'control', assign: false, show: false });
  });
  it('nothing outside the test, and nothing without an aid', () => {
    expect(runSubmitNudgeDecision({ eligible: false, aid: NUDGE })).toEqual({ arm: null, assign: false, show: false });
    expect(runSubmitNudgeDecision({ eligible: true, aid: null })).toEqual({ arm: null, assign: false, show: false });
  });
  it('ignores a malformed stored record', () => {
    expect(normalizeRunSubmitNudgeRecord({ arm: 'quiz' })).toBe(null);
    expect(normalizeRunSubmitNudgeRecord('nudge')).toBe(null);
    expect(runSubmitNudgeDecision({ eligible: true, aid: NUDGE, stored: { arm: 'x' } }).assign).toBe(true);
  });
});

describe('the line', () => {
  it('says Submit completes it, and claims a match only on a match', () => {
    expect(runSubmitNudgeKind(true)).toBe('match');
    expect(runSubmitNudgeKind(false)).toBe('check');
    expect(RUN_SUBMIT_NUDGE_COPY.match).toMatch(/matches the expected output/);
    expect(RUN_SUBMIT_NUDGE_COPY.match).toMatch(/Submit/);
    expect(RUN_SUBMIT_NUDGE_COPY.check).toMatch(/Submit checks it/);
    expect(RUN_SUBMIT_NUDGE_COPY.check).not.toMatch(/match/);
  });
  it('asks nothing and mentions no price or Pro', () => {
    for (const t of Object.values(RUN_SUBMIT_NUDGE_COPY)) {
      expect(t).not.toMatch(/\?|Pro\b|\$|upgrade|sign ?up/i);
    }
  });
});

describe('wiring in app.jsx', () => {
  it('the flag ships dark and is read with === true (a missing key reads TRUE)', () => {
    expect(FLAGS).toMatch(/runSubmitNudge:\s*false,/);
    expect(APP).toContain("window.FF?.feature?.('runSubmitNudge') === true");
  });

  it('the state hook sits above the showAuth / dbReady early returns', () => {
    const hook = APP.indexOf('const [runSubmitNudge, setRunSubmitNudge] = useState(null);');
    expect(hook).toBeGreaterThan(0);
    expect(hook).toBeLessThan(APP.indexOf('  if (showAuth) {'));
    expect(hook).toBeLessThan(APP.indexOf('  if (!dbReady) return ('));
  });

  it('Run notes the nudge on both its success and its error path', () => {
    const start = APP.indexOf('const runChallengeQuery = () => {');
    const end = APP.indexOf('const noteRunSubmitNudge = (rows, error) => {');
    const body = APP.slice(start, end);
    expect(body).toContain('noteRunSubmitNudge(result.length > 0 ? result[0].values : [], null);');
    expect(body).toContain('noteRunSubmitNudge([], err.message);');
  });

  it('the handler grades with the same resultsMatch as Submit and writes both events', () => {
    const start = APP.indexOf('const noteRunSubmitNudge = (rows, error) => {');
    const body = APP.slice(start, APP.indexOf('const submitChallenge = () => {', start));
    expect(body).toContain('resultsMatch(rows, challengeExpected.rows, currentChallenge.solution, challengeExpected.columns)');
    expect(body).toContain("trackActivationEvent('run_submit_nudge_assigned'");
    expect(body).toContain("trackActivationEvent('run_submit_nudge_shown'");
    expect(body).toContain('solvedCount: solvedChallenges.size');
    // never a raw-order pick (CLAUDE.md fragile area 4)
    expect(body).not.toMatch(/challenges\.find\(/);
  });

  it('Submit clears the line, and it renders only for the open challenge', () => {
    const start = APP.indexOf('const submitChallenge = () => {');
    expect(APP.slice(start, start + 1200)).toContain('setRunSubmitNudge(null);');
    expect(APP).toMatch(/runSubmitNudge && runSubmitNudge\.challengeId === currentChallenge\?\.id && !challengeStatus/);
    expect(APP).toContain('data-testid="run-submit-nudge"');
  });

  it('uses no accent colour (DESIGN.md: #FFE34D only on CTAs, scores, medals, streaks, wins)', () => {
    const i = APP.indexOf('data-testid="run-submit-nudge"');
    const tag = APP.slice(i - 20, i + 300);
    expect(tag).not.toMatch(/yellow|FFE34D/i);
  });
});
