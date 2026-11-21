// The last 48 hours of a Stripe trial (M-10,
// docs/plans/monetization-ideas-2026-11-22.md). Pins: the line exists only
// inside the last 48 h of a Stripe trial (`proTrial` + `proTrialEnd`), never
// for a paid plan or the old in-app trial; the price comes from planPrices,
// never a literal; the wiring reads the webhook's fields and the flag; the
// event fires; "Manage plan" goes to the Stripe portal.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { trialEndingLine, TRIAL_ENDING_WINDOW_MS } from '../src/utils/trial-ending.js';
import { planPrices } from '../src/utils/regional-price.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const app = fs.readFileSync(path.join(ROOT, 'src/app.jsx'), 'utf8');
const flags = fs.readFileSync(path.join(ROOT, 'src/data/feature-flags.js'), 'utf8');
const webhook = fs.readFileSync(path.join(ROOT, 'supabase/functions/stripe-webhook/index.ts'), 'utf8');

const NOW = Date.parse('2026-11-22T12:00:00Z');
const H = 3600 * 1000;
const at = h => new Date(NOW + h * H).toISOString();
const base = { proTrial: true, plan: 'monthly', prices: planPrices('default'), hardLeft: 78, mockTitle: null, now: NOW, timeZone: 'UTC' };

describe('trialEndingLine — when', () => {
  it('shows inside the last 48 hours', () => {
    expect(TRIAL_ENDING_WINDOW_MS).toBe(48 * H);
    expect(trialEndingLine({ ...base, proTrialEnd: at(30) })).not.toBeNull();
    expect(trialEndingLine({ ...base, proTrialEnd: at(47.9) })).not.toBeNull();
    expect(trialEndingLine({ ...base, proTrialEnd: at(0.5) })).not.toBeNull();
  });
  it('not earlier than 48 hours, not after the end', () => {
    expect(trialEndingLine({ ...base, proTrialEnd: at(49) })).toBeNull();
    expect(trialEndingLine({ ...base, proTrialEnd: at(72) })).toBeNull();
    expect(trialEndingLine({ ...base, proTrialEnd: at(80) })).toBeNull();
    expect(trialEndingLine({ ...base, proTrialEnd: at(-1) })).toBeNull();
  });
  it('never for someone who is not in a Stripe trial', () => {
    expect(trialEndingLine({ ...base, proTrial: false, proTrialEnd: at(30) })).toBeNull();
    expect(trialEndingLine({ ...base, proTrialEnd: null })).toBeNull();
    expect(trialEndingLine({ ...base, proTrialEnd: 'not a date' })).toBeNull();
    expect(trialEndingLine()).toBeNull();
  });
});

describe('trialEndingLine — what it says', () => {
  it('names the date and the monthly price from planPrices', () => {
    const l = trialEndingLine({ ...base, proTrialEnd: '2026-11-23T18:00:00Z' });
    expect(l.lead).toBe(`Your free week ends on Monday, November 23. Then ${planPrices('default').monthly}/month.`);
    expect(l.lead).toContain('$29/month');
    expect(l.hoursLeft).toBe(30);
  });
  it('the annual price and the India price come from the table too', () => {
    expect(trialEndingLine({ ...base, plan: 'annual', proTrialEnd: at(30) }).lead).toContain(`${planPrices('default').annual}/year`);
    expect(trialEndingLine({ ...base, plan: 'monthly', prices: planPrices('IN'), proTrialEnd: at(30) }).lead).toContain(`${planPrices('IN').monthly}/month`);
  });
  it('an unknown plan says the date and no price', () => {
    const l = trialEndingLine({ ...base, plan: 'trial', proTrialEnd: at(30) });
    expect(l.lead).toMatch(/^Your free week ends on \w+day, \w+ \d+\.$/);
  });
  it('says what is still ahead — the Hard count and the company mock, or every mock', () => {
    expect(trialEndingLine({ ...base, proTrialEnd: at(30) }).ahead).toBe("Still ahead in Pro: 78 Hard challenges you haven't solved, every timed mock.");
    expect(trialEndingLine({ ...base, hardLeft: 1, mockTitle: 'Revolut Data Analyst — HackerRank-Style SQL Screen', proTrialEnd: at(30) }).ahead)
      .toBe("Still ahead in Pro: 1 Hard challenge you haven't solved, the Revolut Data Analyst — HackerRank-Style SQL Screen.");
    expect(trialEndingLine({ ...base, hardLeft: 0, proTrialEnd: at(30) }).ahead).toBe('Still ahead in Pro: every timed mock.');
  });
  it('never claims "Unlimited" and carries no literal price', () => {
    const l = trialEndingLine({ ...base, proTrialEnd: at(30) });
    expect(JSON.stringify(l)).not.toMatch(/unlimited/i);
    const src = fs.readFileSync(path.join(ROOT, 'src/utils/trial-ending.js'), 'utf8');
    expect(src).not.toMatch(/\$\d/);
  });
});

describe('app.jsx wiring', () => {
  it('reads the two fields the webhook writes for a Stripe trial', () => {
    expect(webhook).toContain('userData.proTrial = true;');
    expect(webhook).toContain('userData.proTrialEnd = expiry.toISOString();');
    expect(app).toContain('setStripeTrialEnd(userData.proTrial === true && userData.proTrialEnd ? userData.proTrialEnd : null);');
    expect(app).toContain('setStripeTrialEnd(fresh.proTrial === true && fresh.proTrialEnd ? fresh.proTrialEnd : null);');
  });
  it('the flag exists, ships on, and gates the line', () => {
    expect(flags).toMatch(/\n\s*trialEndingLine: true,/);
    const at = app.indexOf('const trialEnding = ');
    expect(at).toBeGreaterThan(-1);
    expect(at).toBeLessThan(app.indexOf('  if (showAuth) {'));
    const block = app.slice(at, at + 700);
    expect(block).toContain("window.FF?.feature?.('trialEndingLine') === true && userProStatus && stripeTrialEnd");
    expect(block).toContain('prices: planPrices(priceRegion)');
    expect(block).toContain('plan: proType');
  });
  it('renders on the Coach and the challenge list only, with the event and the portal link', () => {
    expect(app).toContain("const trialEndingOnSurface = !!trialEnding && (activeTab === 'guide' || (activeTab === 'quests' && !currentChallenge));");
    expect(app).toMatch(/trackActivationEvent\('trial_day5_shown', \{[^}]*\}, \{ onceKey: `trial_day5_shown_\$\{day\}` \}\)/);
    const r = app.indexOf('data-testid="trial-ending-line"');
    expect(r).toBeGreaterThan(-1);
    expect(app.slice(r - 200, r)).toContain('{trialEndingOnSurface && (');
    const card = app.slice(r, app.indexOf('</div>', r));
    expect(card).toContain('href={getManageSubscriptionHref(currentUser, proType)}');
    expect(card).toContain('Manage plan');
    expect(card, 'information, not an ask: no accent').not.toContain('#FFE34D');
  });
});
