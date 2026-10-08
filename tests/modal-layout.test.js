// The Pro modal's order (PLAN item 2, 2026-10-08; src/utils/modal-layout.js).
// Pins: the flag off is today's modal for everyone; the split is half and
// half, sticky, and independent of the first-screen and company-ask tests
// (the A/B hash trap); the feature list is ONE render placed above the plans
// for control and below the currency note for plans_first; the arm rides on
// the modal and plan events; the arm memo sits above the early returns.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { MODAL_LAYOUT_ARMS, modalLayoutArm, modalLayoutHashArm, plansFirst } from '../src/utils/modal-layout.js';
import { firstScreenArm } from '../src/utils/first-screen.js';
import { companyAskArm } from '../src/utils/company-ask.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const app = read('src/app.jsx');
const hex = i => i.toString(16).padStart(32, '0');

describe('the arm', () => {
  it('flag off, or no aid: control for everyone', () => {
    for (let i = 0; i < 200; i++) expect(modalLayoutArm({ flagOn: false, aid: hex(i) })).toBe('control');
    expect(modalLayoutArm({ flagOn: true, aid: null })).toBe('control');
    expect(plansFirst('control')).toBe(false);
    expect(plansFirst('plans_first')).toBe(true);
  });

  it('flag on: half and half, the same answer every time for one aid', () => {
    let pf = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) if (modalLayoutArm({ flagOn: true, aid: hex(i) }) === 'plans_first') pf++;
    expect(pf / n).toBeGreaterThan(0.46);
    expect(pf / n).toBeLessThan(0.54);
    expect(modalLayoutHashArm('abc')).toBe(modalLayoutHashArm('abc'));
    expect(MODAL_LAYOUT_ARMS).toEqual(['plans_first', 'control']);
  });

  it('is independent of the first-screen and company-ask tests', () => {
    const n = 3000;
    let sameFs = 0, sameCa = 0;
    for (let i = 0; i < n; i++) {
      const a = `p${i}`;
      const pf = modalLayoutHashArm(a) === 'plans_first';
      if (pf === (firstScreenArm(a) === 'challenge')) sameFs++;
      if (pf === (companyAskArm(a) === 'ask')) sameCa++;
    }
    for (const same of [sameFs, sameCa]) {
      expect(same / n).toBeGreaterThan(0.45);
      expect(same / n).toBeLessThan(0.55);
    }
  });
});

describe('app.jsx wiring', () => {
  it('the flag is on only with the flip on the record (founder\u2019s go, 2026-10-08)', () => {
    const on = /\n\s*modalPlansFirst: true,/.test(read('src/data/feature-flags.js'));
    if (on) {
      expect(read('docs/agent/flag-queue.md')).toMatch(/\| 14 `modalPlansFirst` \| \*\*on 2026-10-08\*\*/);
      expect(read('docs/agent/ledger.md')).toMatch(/\*\*Flipped\*\* 2026-10-08 \(founder's go/);
    } else {
      expect(read('src/data/feature-flags.js')).toMatch(/\n\s*modalPlansFirst: false,/);
    }
  });

  it('one feature list, rendered above the plans for control and after the currency note for plans_first', () => {
    expect((app.match(/renderProFeatureList\(/g) || []).length).toBe(2);
    const control = app.indexOf("{!modalPlansFirstNow && renderProFeatureList('p-4 mb-6')}");
    const firstCard = app.indexOf('data-testid="plan-terms-monthly"');
    const currency = app.indexOf('data-testid="billed-currency"');
    const pf = app.indexOf("{modalPlansFirstNow && renderProFeatureList('p-4 mb-6 mt-4')}");
    expect(control).toBeGreaterThan(0);
    expect(control).toBeLessThan(firstCard);
    expect(pf).toBeGreaterThan(currency);
    expect(app).toContain('What you get with Pro:');
    expect((app.match(/What you get with Pro:/g) || []).length).toBe(1);
  });

  it('the arm is decided once, above the early returns, and rides on the modal and plan events', () => {
    const memo = app.indexOf('const modalLayout = useMemo(() => {');
    expect(memo).toBeGreaterThan(0);
    expect(memo).toBeLessThan(app.indexOf('\n  if (showAuth) {\n'));
    expect(app.slice(memo, memo + 300)).toContain("window.FF?.feature?.('modalPlansFirst') === true");
    const shown = app.slice(app.indexOf("trackActivationEvent('pro_modal_shown', {"), app.indexOf("trackActivationEvent('pro_modal_shown', {") + 1400);
    expect(shown).toMatch(/\n\s*modalLayout,/);
    const plan = app.slice(app.indexOf("trackActivationEvent('pro_plan_clicked', {"), app.indexOf("trackActivationEvent('pro_plan_clicked', {") + 200);
    expect(plan).toMatch(/\n\s*modalLayout,/);
  });
});
