// A company-page arrival opens question 1 — an A/B (B5, 2026-11-22).
// Pure half: src/utils/company-direct.js. Wiring: src/app.jsx.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import {
  COMPANY_DIRECT_ARMS, COMPANY_DIRECT_KEY, companyDirectArm, companyDirectDecision,
  normalizeCompanyDirectRecord, isCompanyListArrival,
} from '../src/utils/company-direct.js';
import { firstScreenArm } from '../src/utils/first-screen.js';
import { companyAskArm } from '../src/utils/company-ask.js';
import { quotaWallHashArm } from '../src/utils/quota-wall-inline.js';
import { modalLayoutHashArm } from '../src/utils/modal-layout.js';

const APP = fs.readFileSync(new URL('../src/app.jsx', import.meta.url), 'utf8');
const FLAGS = fs.readFileSync(new URL('../src/data/feature-flags.js', import.meta.url), 'utf8');

const aidIn = (arm) => { for (let i = 0; i < 1000; i++) { const a = `aid-${i}`; if (companyDirectArm(a) === arm) return a; } throw new Error('no aid'); };
const DIRECT = aidIn('direct');
const LIST = aidIn('list');

describe('the arm', () => {
  it('is stable per aid and splits about evenly', () => {
    expect(companyDirectArm('x')).toBe(companyDirectArm('x'));
    let direct = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) if (companyDirectArm(`p${i}`) === 'direct') direct++;
    expect(direct / n).toBeGreaterThan(0.46);
    expect(direct / n).toBeLessThan(0.54);
  });

  // The A/B hash trap (CLAUDE.md): without the murmur finalizer a two-arm
  // FNV split is the exact mirror of every other one.
  const others = {
    'first screen': (a) => firstScreenArm(a) === 'challenge',
    'company ask': (a) => companyAskArm(a) === 'ask',
    'quota wall inline': (a) => quotaWallHashArm(a) === 'inline',
    'modal layout': (a) => modalLayoutHashArm(a) === 'plans_first',
  };
  for (const [name, inOther] of Object.entries(others)) {
    it(`is independent of the ${name} test`, () => {
      let same = 0;
      const n = 4000;
      for (let i = 0; i < n; i++) {
        const a = `p${i}`;
        if ((companyDirectArm(a) === 'direct') === inOther(a)) same++;
      }
      expect(same / n).toBeGreaterThan(0.45);
      expect(same / n).toBeLessThan(0.55);
    });
  }
});

describe('which arrival counts', () => {
  it('a company link without its own challenge or mock', () => {
    expect(isCompanyListArrival('?company=Wise&goal=interview')).toBe(true);
    expect(isCompanyListArrival('?company=Capital%20One&challenge=275&goal=interview')).toBe(false);
    expect(isCompanyListArrival('?company=Wise&interview=capital-one-codesignal')).toBe(false);
    expect(isCompanyListArrival('?src=home')).toBe(false);
    expect(isCompanyListArrival('?company=')).toBe(false);
    expect(isCompanyListArrival(undefined)).toBe(false);
  });
});

describe('the decision', () => {
  const cold = (extra = {}) => companyDirectDecision({ flagOn: true, arrival: true, aid: DIRECT, solvedCount: 0, nextId: 175, ...extra });

  it('flag off: nothing, nobody assigned', () => {
    expect(companyDirectDecision({ arrival: true, aid: DIRECT, nextId: 175 })).toEqual({ assign: false, arm: null, open: false });
  });

  it('not a company arrival: nothing', () => {
    expect(cold({ arrival: false })).toEqual({ assign: false, arm: null, open: false });
  });

  it('a cold arrival is assigned; direct opens question 1', () => {
    expect(cold()).toEqual({ assign: true, arm: 'direct', open: true });
  });

  it('list is assigned and never opens anything', () => {
    expect(cold({ aid: LIST })).toEqual({ assign: true, arm: 'list', open: false });
    expect(cold({ aid: LIST, record: { arm: 'list' } })).toEqual({ assign: false, arm: 'list', open: false });
  });

  it('someone with solves is never assigned and never sent straight in', () => {
    expect(cold({ solvedCount: 1 })).toEqual({ assign: false, arm: null, open: false });
    expect(cold({ solvedCount: 4, record: { arm: 'direct' } })).toEqual({ assign: false, arm: 'direct', open: false });
  });

  it('the stored arm wins over the hash, and is not re-assigned', () => {
    expect(cold({ aid: LIST, record: { arm: 'direct' } })).toEqual({ assign: false, arm: 'direct', open: true });
  });

  it('nothing to open (every question locked) opens nothing — but the person is still counted', () => {
    expect(cold({ nextId: null })).toEqual({ assign: true, arm: 'direct', open: false });
  });

  it('no aid: not in the test', () => {
    expect(cold({ aid: null })).toEqual({ assign: false, arm: null, open: false });
  });

  it('a garbled record reads as none', () => {
    expect(normalizeCompanyDirectRecord({ arm: 'everything' })).toEqual({ arm: null });
    expect(normalizeCompanyDirectRecord('x')).toEqual({ arm: null });
    expect(COMPANY_DIRECT_ARMS).toEqual(['direct', 'list']);
  });
});

describe('the wiring in app.jsx', () => {
  const start = APP.indexOf('const pendingCompanyDirectRef');
  const block = APP.slice(start, APP.indexOf('}, [isSessionLoading, currentUser]);', start));

  it('ships dark, read only as === true', () => {
    expect(FLAGS).toMatch(/companyDirectOpen:\s*false,/);
    expect(block).toContain("window.FF?.feature?.('companyDirectOpen') === true");
  });

  it('waits for the session and the guest before deciding (the deep-link rule)', () => {
    expect(block).toContain('shouldWaitForSession(');
    expect(block).toMatch(/if \(!currentUser\) return;/);
    expect(block.indexOf('if (!currentUser) return;')).toBeLessThan(block.indexOf('companyDirectDecision('));
  });

  it('opens what the banner opens, through openChallenge, with its own openedFrom', () => {
    expect(block).toContain('companyBannerNext()');
    expect(block).toContain("openChallenge(next, { openedFrom: 'company_direct' })");
    expect(block).toContain('solvedCount: solvedChallenges.size');
  });

  it('writes the assignment once, with the test id and the arm', () => {
    expect(block).toContain(`localStorage.setItem(COMPANY_DIRECT_KEY`);
    expect(block).toMatch(/trackActivationEvent\('company_direct_assigned'[\s\S]*onceKey: 'company_direct_assigned'/);
    expect(COMPANY_DIRECT_KEY).toBe('sqlquest_company_direct_v1');
  });

  it('sits above the early returns (hooks rule)', () => {
    expect(start).toBeGreaterThan(0);
    expect(start).toBeLessThan(APP.indexOf('if (showAuth) {'));
  });
});
