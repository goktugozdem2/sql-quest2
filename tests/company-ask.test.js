// The company ask — one inline question after the first solve (founder's
// plan, 2026-09-25, P0 items 1–3 and 9).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import {
  COMPANY_ASK_ARMS, COMPANY_ASK_UNDECIDED, companyAskArm, companyAskDecision,
  normalizeCompanyAskRecord, matchCompanies, isCompanyAskAnswer, emptyCompanyAskRecord,
} from '../src/utils/company-ask.js';
import { INTAKE_COMPANIES } from '../src/utils/onboarding-intake.js';
import { firstScreenArm } from '../src/utils/first-screen.js';

// An aid in each arm, found rather than hard-coded, so the tests do not
// depend on which way one particular string hashes.
const aidIn = (arm) => { for (let i = 0; i < 1000; i++) { const a = `aid-${i}`; if (companyAskArm(a) === arm) return a; } throw new Error('no aid'); };
const ASK = aidIn('ask');
const CONTROL = aidIn('control');

describe('the arm', () => {
  it('is stable per aid and splits about evenly', () => {
    expect(companyAskArm('x')).toBe(companyAskArm('x'));
    const n = 2000;
    let ask = 0;
    for (let i = 0; i < n; i++) if (companyAskArm(`p${i}`) === 'ask') ask++;
    expect(ask / n).toBeGreaterThan(0.45);
    expect(ask / n).toBeLessThan(0.55);
  });

  it('is independent of the first-screen test', () => {
    let same = 0;
    const n = 2000;
    for (let i = 0; i < n; i++) {
      const a = `p${i}`;
      if ((companyAskArm(a) === 'ask') === (firstScreenArm(a) === 'challenge')) same++;
    }
    expect(same / n).toBeGreaterThan(0.45);
    expect(same / n).toBeLessThan(0.55);
  });
});

describe('when it asks', () => {
  const at = (solves, record = null, extra = {}) => companyAskDecision({ flagOn: true, solves, record, aid: ASK, ...extra });

  it('off by default: nothing, no assignment', () => {
    expect(companyAskDecision({ solves: 1, aid: ASK })).toEqual({ assign: false, arm: null, ask: false, askNumber: 0 });
  });

  it('assigns at the first solve only — someone with prior solves is never in the test', () => {
    expect(at(1)).toMatchObject({ assign: true, arm: 'ask', ask: true, askNumber: 1 });
    expect(at(2)).toMatchObject({ assign: false, arm: null, ask: false });
    expect(at(40)).toMatchObject({ assign: false, arm: null, ask: false });
    expect(companyAskDecision({ flagOn: true, solves: 1, aid: null })).toMatchObject({ assign: false, ask: false });
  });

  it('control is assigned and never asked', () => {
    const d = companyAskDecision({ flagOn: true, solves: 1, aid: CONTROL });
    expect(d).toMatchObject({ assign: true, arm: 'control', ask: false });
    const later = companyAskDecision({ flagOn: true, solves: 3, aid: CONTROL, record: { arm: 'control', asks: 0 } });
    expect(later.ask).toBe(false);
  });

  it('unanswered: asked again at the third solve, then silent', () => {
    const afterFirst = { arm: 'ask', asks: 1, answer: null };
    expect(at(2, afterFirst).ask).toBe(false);
    expect(at(3, afterFirst)).toMatchObject({ ask: true, askNumber: 2, assign: false });
    const afterSecond = { arm: 'ask', asks: 2, answer: null };
    for (const n of [3, 4, 5, 10, 100]) expect(at(n, afterSecond).ask).toBe(false);
  });

  it('an answer — a company or "not sure yet" — ends it', () => {
    expect(at(3, { arm: 'ask', asks: 1, answer: 'Stripe' }).ask).toBe(false);
    expect(at(3, { arm: 'ask', asks: 1, answer: COMPANY_ASK_UNDECIDED }).ask).toBe(false);
  });

  it('never asks for a company already on record', () => {
    expect(at(1, null, { knownCompany: 'Capital One' })).toMatchObject({ assign: true, ask: false });
  });
});

describe('the search box', () => {
  it('offers all thirty companies, prefix matches first', () => {
    expect(INTAKE_COMPANIES).toHaveLength(30);
    expect(matchCompanies('')).toHaveLength(6);
    expect(matchCompanies('cap')[0]).toBe('Capital One');
    expect(matchCompanies('one')).toContain('Capital One');
    expect(matchCompanies('STR')[0]).toBe('Stripe');
    expect(matchCompanies('zzz')).toEqual([]);
  });

  it('accepts only a listed company or "not sure yet"', () => {
    expect(isCompanyAskAnswer('Revolut')).toBe(true);
    expect(isCompanyAskAnswer(COMPANY_ASK_UNDECIDED)).toBe(true);
    expect(isCompanyAskAnswer('Acme')).toBe(false);
    expect(isCompanyAskAnswer('')).toBe(false);
  });

  it('a stored record is normalised, never trusted', () => {
    expect(normalizeCompanyAskRecord({ arm: 'hacked', asks: -3, answer: 5 })).toEqual(emptyCompanyAskRecord());
    expect(COMPANY_ASK_ARMS).toEqual(['ask', 'control']);
  });
});

describe('the app wiring (source guards)', () => {
  const app = fs.readFileSync(new URL('../src/app.jsx', import.meta.url), 'utf8');
  const flags = fs.readFileSync(new URL('../src/data/feature-flags.js', import.meta.url), 'utf8');
  const start = app.indexOf('const renderCompanyAsk = () => {');
  const block = app.slice(start, app.indexOf('// ── Onboarding intake (P0-1', start));

  it('is off by default and read strictly', () => {
    expect(flags).toMatch(/\n\s*intakeAfterFirstSolve: false,/);
    expect(app).toContain("flagOn: window.FF?.feature?.('intakeAfterFirstSolve') === true");
  });

  it('is inline in the success panel, not a modal', () => {
    expect(app).toMatch(/\{renderCompanyAsk\(\)\}\s*\n\s*\{\/\* Review ask/);
    expect(block).not.toMatch(/fixed inset-0|role="dialog"|aria-modal/);
  });

  it('skippable, with "not sure yet", and the answer lands in prepTarget.company', () => {
    expect(block).toContain('data-company-ask-skip');
    expect(block).toContain('data-company-ask-undecided');
    expect(app).toContain('setPrepPreference({ company: value });');
  });

  it('shows what the answer did: the plan and the Interview tab', () => {
    expect(block).toContain("setActiveTab('guide')");
    expect(block).toContain("setActiveTab('trials')");
  });

  it('one event per step, with the step named (item 9)', () => {
    for (const ev of ['intake_shown', 'intake_answered', 'intake_skipped']) {
      expect(app).toMatch(new RegExp(`trackActivationEvent\\('${ev}', \\{ step: 'company', surface: 'post_solve'`));
    }
    expect(app).toContain("trackActivationEvent('company_ask_assigned'");
  });

  it('one question, not two: the first-solve intent modal stays shut while the line shows', () => {
    expect(app).toMatch(/if \(companyAskShowingRef\.current\) \{\s*\n\s*trackActivationEvent\('intent_ask_suppressed'/);
    expect(app).toContain('companyAskShowingRef.current = true;');
  });

  it('the record rides the autosave and comes back on sign-in', () => {
    expect(app).toMatch(/goalProfile, companyAskRecord, prepTarget/);
    expect(app).toContain('userData.companyAsk && typeof userData.companyAsk');
  });
});

describe('every label exists in both languages', () => {
  const i18n = fs.readFileSync(new URL('../src/utils/i18n.js', import.meta.url), 'utf8');
  const blocks = i18n.split('    companyAsk: {').slice(1).map(b => b.slice(0, b.indexOf('\n    },')));
  const keys = ['question', 'placeholder', 'undecided', 'skip', 'noMatch', 'done', 'seePlan', 'seeInterview', 'undecidedDone'];
  it('en and tr', () => {
    expect(blocks).toHaveLength(2);
    for (const b of blocks) for (const k of keys) expect(b).toMatch(new RegExp(`\\n\\s+${k}: '`));
  });
});
