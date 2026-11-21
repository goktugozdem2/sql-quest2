// The header's Pro button (M-04, docs/plans/monetization-ideas-2026-11-22.md).
// Person-opened modals click a plan 2-10x as often as automatic asks, and a
// free person had no Pro entry in the header. Pins: who sees it (non-Pro,
// 3+ solves, not in the first-run/lesson shells, flag on), what it says, the
// reason it opens the modal under, the events, and that it lives in the
// header beside the identity chip and never for a Pro person.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { headerProCta, HEADER_PRO_MIN_SOLVES, HEADER_PRO_REASON } from '../src/utils/paywall-moments.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const app = fs.readFileSync(path.join(ROOT, 'src/app.jsx'), 'utf8');
const flags = fs.readFileSync(path.join(ROOT, 'src/data/feature-flags.js'), 'utf8');
const header = app.slice(app.indexOf('<header className="bg-black/30'), app.indexOf('</header>'));

const base = { flagOn: true, isPro: false, solves: 3, trialOn: true, firstRunShell: false };

describe('headerProCta — who sees the button', () => {
  it('a free person with three solves sees "Try Pro free" when the trial is offered', () => {
    expect(headerProCta(base)).toEqual({ label: 'Try Pro free', shortLabel: 'Try Pro', reason: 'header' });
  });
  it('without the trial offer it says "Pro" and promises nothing free', () => {
    const c = headerProCta({ ...base, trialOn: false });
    expect(c.label).toBe('Pro');
    expect(c.shortLabel).toBe('Pro');
    expect(JSON.stringify(c)).not.toMatch(/free/i);
  });
  it('nobody under three solves sees it', () => {
    expect(HEADER_PRO_MIN_SOLVES).toBe(3);
    for (const solves of [0, 1, 2, undefined, null, 'x']) expect(headerProCta({ ...base, solves }), String(solves)).toBeNull();
    expect(headerProCta({ ...base, solves: 40 })).not.toBeNull();
  });
  it('never for Pro, never in the first-run shell, never with the flag off', () => {
    expect(headerProCta({ ...base, isPro: true })).toBeNull();
    expect(headerProCta({ ...base, firstRunShell: true })).toBeNull();
    expect(headerProCta({ ...base, flagOn: false })).toBeNull();
    expect(headerProCta()).toBeNull();
  });
  it('the copy never claims "Unlimited"', () => {
    for (const trialOn of [true, false]) expect(JSON.stringify(headerProCta({ ...base, trialOn }))).not.toMatch(/unlimited/i);
  });
});

describe('app.jsx wiring', () => {
  it('the flag exists and ships on (a UX change, no price)', () => {
    expect(flags).toMatch(/\n\s*headerProButton: true,/);
    expect(app).toContain("window.FF?.feature?.('headerProButton') === true");
  });
  it('is computed above the early returns, from the live inputs', () => {
    const at = app.indexOf('const headerPro = headerProCta({');
    expect(at).toBeGreaterThan(-1);
    expect(at).toBeLessThan(app.indexOf('  if (showAuth) {'));
    const call = app.slice(at, at + 400);
    expect(call).toContain('isPro: !!userProStatus');
    expect(call).toContain('solves: practiceSolveCount');
    expect(call).toContain('trialOn: trialOfferOn');
    expect(call).toContain('firstRunShell: showSimpleLearningShell');
  });
  it('the button sits in the header, before the identity chip, rendered only when the helper says so', () => {
    const at = header.indexOf('data-testid="header-pro"');
    expect(at).toBeGreaterThan(-1);
    expect(at).toBeLessThan(header.indexOf('data-testid="header-identity"'));
    expect(header.slice(Math.max(0, at - 300), at)).toContain('{headerPro && (');
  });
  it('opens the modal under reason `header` and logs the press', () => {
    expect(HEADER_PRO_REASON).toBe('header');
    const at = header.indexOf('data-testid="header-pro"');
    const btn = header.slice(at, header.indexOf('</button>', at));
    expect(btn).toContain("trackActivationEvent('header_pro_clicked', { solves: practiceSolveCount");
    expect(btn).toContain('setProModalReason({ type: headerPro.reason');
    expect(btn).toContain('setShowProModal(true)');
    expect(btn, 'accent only because it is a primary CTA').toContain("background: '#FFE34D'");
  });
  it('fires header_pro_shown once per person', () => {
    expect(app).toMatch(/trackActivationEvent\('header_pro_shown', \{[^}]*\}, \{ onceKey: 'header_pro_shown' \}\)/);
  });
  it('the `header` reason reads the pricing_link headline, not the generic fallback', () => {
    expect(app).toContain("proModalReason.type === 'pricing_link' || proModalReason.type === 'header'");
  });
});
