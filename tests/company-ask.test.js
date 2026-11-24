// The company ask — one inline question after the first solve (founder's
// plan, 2026-09-25, P0 items 1–3 and 9).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import {
  COMPANY_ASK_ARMS, COMPANY_ASK_UNDECIDED, companyAskArm, companyAskDecision,
  normalizeCompanyAskRecord, matchCompanies, isCompanyAskAnswer, emptyCompanyAskRecord,
  COMPANY_ASK_DATE_NONE, INTERVIEW_DATE_MAX_DAYS, interviewDateBounds, isValidInterviewDate,
  companyAskDateDecision, interviewDateEventPayload,
} from '../src/utils/company-ask.js';
import { ONE_LAYER_ASKS, oneLayerPick } from '../src/utils/mobile-one-layer.js';
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
  it('offers all thirty-four companies, prefix matches first', () => {
    expect(INTAKE_COMPANIES).toHaveLength(34);
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
  const keys = ['question', 'placeholder', 'undecided', 'skip', 'noMatch', 'done', 'seePlan', 'seeInterview', 'undecidedDone',
    'dateQuestion', 'dateSave', 'dateNone', 'dateSaved'];
  it('en and tr', () => {
    expect(blocks).toHaveLength(2);
    for (const b of blocks) for (const k of keys) expect(b).toMatch(new RegExp(`\\n\\s+${k}: '`));
  });
});

// ── The interview date follow-up (2026-11-24) ─────────────────────────────
// 2026-11-24 22:00 UTC: late in the day on purpose, so a local-vs-UTC slip
// in the bounds would show.
const NOW = Date.UTC(2026, 10, 24, 22, 0, 0);

describe('the date follow-up — bounds', () => {
  it('min is today and max is today + 365, and exactly those validate', () => {
    const { min, max } = interviewDateBounds(NOW);
    expect(min).toBe('2026-11-24');
    expect(max).toBe('2027-11-24');
    expect(INTERVIEW_DATE_MAX_DAYS).toBe(365);
    expect(isValidInterviewDate(min, NOW)).toBe(true);
    expect(isValidInterviewDate(max, NOW)).toBe(true);
    expect(isValidInterviewDate('2026-11-23', NOW)).toBe(false);   // yesterday
    expect(isValidInterviewDate('2027-11-25', NOW)).toBe(false);   // day 366
  });
  it('rejects what is not a calendar day', () => {
    for (const v of ['', null, undefined, '2026-02-31', '24/11/2026', 'tomorrow', COMPANY_ASK_DATE_NONE]) {
      expect(isValidInterviewDate(v, NOW)).toBe(false);
    }
  });
});

describe('the date follow-up — when it is asked', () => {
  it('only after a company: never after "not sure yet", a skip or junk', () => {
    expect(companyAskDateDecision({ answer: 'Capital One', now: NOW })).toBe(true);
    expect(companyAskDateDecision({ answer: COMPANY_ASK_UNDECIDED, now: NOW })).toBe(false);
    expect(companyAskDateDecision({ answer: null, now: NOW })).toBe(false);
    expect(companyAskDateDecision({ answer: 'Not A Company Inc', now: NOW })).toBe(false);
  });
  it('never twice: a date, "no date yet" or a skip on the record ends it', () => {
    for (const dateAnswer of ['date', 'none', 'skipped']) {
      expect(companyAskDateDecision({ answer: 'Revolut', record: { arm: 'ask', asks: 1, dateAnswer }, now: NOW })).toBe(false);
    }
    expect(companyAskDateDecision({ answer: 'Revolut', record: { arm: 'ask', asks: 1, dateAnswer: null }, now: NOW })).toBe(true);
  });
  it('never over a date already on record (today or later); a past date is stale and is asked over', () => {
    expect(companyAskDateDecision({ answer: 'Revolut', knownDate: '2026-11-24', now: NOW })).toBe(false);
    expect(companyAskDateDecision({ answer: 'Revolut', knownDate: '2027-03-01', now: NOW })).toBe(false);
    expect(companyAskDateDecision({ answer: 'Revolut', knownDate: '2026-10-01', now: NOW })).toBe(true);
  });
  it('the record keeps the date answer, and a bad one is dropped', () => {
    expect(normalizeCompanyAskRecord({ dateAnswer: 'skipped', dateAnsweredAt: 'x' })).toMatchObject({ dateAnswer: 'skipped', dateAnsweredAt: 'x' });
    expect(normalizeCompanyAskRecord({ dateAnswer: '2026-12-01' }).dateAnswer).toBe(null);
  });
});

describe('the date follow-up — the event carries no date', () => {
  it('a date → daysOut and source, and nothing that looks like a date', () => {
    const p = interviewDateEventPayload('2026-12-01', NOW);
    expect(p).toEqual({ daysOut: 7, source: 'company_ask' });
    expect(JSON.stringify(p)).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });
  it('"no date yet" → none: true; anything invalid → no event', () => {
    expect(interviewDateEventPayload(COMPANY_ASK_DATE_NONE, NOW)).toEqual({ none: true, source: 'company_ask' });
    expect(interviewDateEventPayload('2028-01-01', NOW)).toBe(null);
    expect(interviewDateEventPayload('', NOW)).toBe(null);
  });
});

describe('the date follow-up — the app wiring (source guards)', () => {
  const app = fs.readFileSync(new URL('../src/app.jsx', import.meta.url), 'utf8');
  const start = app.indexOf('const renderCompanyAsk = () => {');
  const block = app.slice(start, app.indexOf('// ── Onboarding intake (P0-1', start));
  const answer = app.slice(app.indexOf('const answerCompanyAsk = (value) => {'), start);

  it('the follow-up is decided only inside the company answer, from the pure decision', () => {
    expect(app.match(/companyAskDateDecision\(/g)).toHaveLength(1);
    expect(answer).toContain('const askDate = companyAskDateDecision({ answer: value, knownDate: prepTarget.date || null, record: companyAskRecord');
    expect(answer).toContain("dateStep: askDate ? 'ask' : null");
  });
  it('a date lands in prepTarget.date through the intake writer; the event is the pure payload', () => {
    expect(answer).toContain('if (value !== COMPANY_ASK_DATE_NONE) setPrepPreference({ date: value });');
    expect(answer).toContain("trackActivationEvent('interview_date_captured', payload);");
    expect(app.match(/trackActivationEvent\('interview_date_captured'/g)).toHaveLength(1);
  });
  it('a skip is recorded, so it is never asked again', () => {
    expect(answer).toContain("dateAnswer: 'skipped'");
    expect(answer).toMatch(/trackActivationEvent\('intake_skipped', \{ step: 'interview_date', surface: 'post_solve'/);
  });
  it('the date input is bounded and inline — not a modal, no accent', () => {
    expect(block).toContain('type="date" data-company-ask-date="true"');
    expect(block).toContain('min={min} max={max}');
    expect(block).toContain('interviewDateBounds(Date.now())');
    expect(block).toContain('data-company-ask-date-none');
    expect(block).toContain('data-company-ask-date-skip');
    expect(block).not.toMatch(/fixed inset-0|role="dialog"|aria-modal|#FFE34D/);
  });
  it('the hook sits above the early returns (fragile area 1)', () => {
    const hook = app.indexOf("const [companyAskDateInput, setCompanyAskDateInput] = useState('');");
    const early = Math.min(app.indexOf('\n  if (showAuth) {'), app.indexOf('\n  if (!dbReady) return ('));
    expect(hook).toBeGreaterThan(0);
    expect(hook).toBeLessThan(early);
  });
  it('a sign-in keeps the date answer, so a new browser does not ask again', () => {
    expect(app).toContain('dateAnswer: acct.dateAnswer || local?.dateAnswer || null');
  });
});

describe('the date follow-up — phones, mobileOneLayer arm `one`', () => {
  const app = fs.readFileSync(new URL('../src/app.jsx', import.meta.url), 'utf8');
  it('the company ask is a tier-2 ask, ahead of the soft email and the intent question', () => {
    expect(ONE_LAYER_ASKS).toEqual(['company_ask', 'soft_email', 'intent_ask']);
    expect(oneLayerPick({ active: ['soft_email', 'company_ask', 'achievement'], hold: true })).toBe('company_ask');
    expect(oneLayerPick({ active: ['soft_email', 'achievement'], hold: true })).toBe('soft_email');
  });
  it('the line and its date step are one layer: pending until the date step resolves, gated by oneLayerOk', () => {
    expect(app).toContain("&& (!companyAsk.answered || companyAsk.dateStep === 'ask'));");
    expect(app).toContain("companyAskPending && 'company_ask',");
    expect(app).toContain("if (pending && !oneLayerOk('company_ask')) return null;");
  });
});
