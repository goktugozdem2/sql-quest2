import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const fn = fs.readFileSync(join(ROOT, 'supabase/functions/activated-note/index.ts'), 'utf8');
const app = fs.readFileSync(join(ROOT, 'src/app.jsx'), 'utf8');

// Founder's week-2 item 8 (2026-09-12): one email to the activated
// non-payers, a single CTA. The sender runs on Deno and is founder-triggered,
// so the guards live here as source checks: the audience rules, the caps,
// the voice rule (founder in the subject, hand-written to a short list,
// never byte-identical bodies), and the CTA's landing in the app.
describe('activated-note: the second ask, in the founder voice', () => {
  it('targets the activated (six solves) who never paid, once, and never internal accounts', () => {
    expect(fn).toMatch(/const MIN_SOLVES = 6\b/);
    expect(fn).toContain('userData.activatedNoteAt');
    expect(fn).toContain("eq('event', 'pro_purchase_completed')");
    expect(fn).toContain("eq('reason', 'stripe_webhook')");
    expect(fn).toContain('userData.proStatus === true');
    expect(fn).toContain('userData.emailOptOut === true');
    expect(fn).toContain('isInternalAccount(username, email)');
    expect(fn).toContain("u === 'elena'");
  });

  it('drains in small batches and never stacks on another campaign', () => {
    const cap = Number(/const MAX_PER_RUN = (\d+)/.exec(fn)[1]);
    expect(cap).toBeLessThanOrEqual(50);
    expect(fn).toMatch(/const QUIET_DAYS = 7\b/);
    expect(fn).toContain('recentlyMailed.has(username)');
    expect(fn).toContain("searchParams.get('dry') === '1'");
  });

  it('keeps the email voice rule: founder in every subject, a short list named, one CTA, a sign-off', () => {
    const subjects = [...fn.matchAll(/`([^`]*SQL Quest[^`]*)`/g)].map(m => m[1]).filter(s => /founder|I build/i.test(s));
    expect(subjects.length).toBeGreaterThanOrEqual(3);
    expect(fn).toMatch(/short list|writing this myself|writing to you directly/);
    expect((fn.match(/href="\$\{cta\}"/g) || []).length).toBe(1);
    expect(fn).toContain('Founder, SQL Quest');
    expect(fn).toContain("const REPLY_TO = 'goktug@datrick.com'");
  });

  it('never claims an unlimited tutor or a lifetime plan', () => {
    expect(fn).not.toMatch(/unlimited/i);
    expect(fn).not.toMatch(/\$199|lifetime/i);
  });

  // 2026-10-01: the body said "$99 a year, or $29 a month" to a list that is
  // mostly in India, where the modal shows $9 / $39. No price in the email;
  // the offer it states is the trial, and only while the trial is on.
  it('states no price, and offers the trial exactly when the flag does', () => {
    const body = fn.slice(fn.indexOf('const OFFER_LINE'));
    expect(body).not.toMatch(/\$\s?\d/);
    const flags = fs.readFileSync(join(ROOT, 'src/data/feature-flags.js'), 'utf8');
    const trialOn = /^\s+checkoutTrial: true,/m.test(flags) && /^\s+checkoutSessions: true,/m.test(flags);
    const saysTrial = /7 days free/.test(fn);
    expect(saysTrial, 'the email offers the trial if and only if checkoutTrial is on').toBe(trialOn);
    if (trialOn) {
      expect(fn).toContain("const OFFER_LINE = 'It starts with 7 days free: a card is required, nothing is charged today, and cancelling before day 7 costs nothing.'");
      expect(fn).toContain('${OFFER_LINE}');
    }
  });

  it('the CTA opens the Pro modal in the app, and the app honours it once, never for Pro accounts', () => {
    expect(fn).toContain("utm('/app/?src=activated_note&pro=1', TEMPLATE)");
    expect(app).toContain("get('pro') === '1'");
    expect(app).toMatch(/'email_link'/);
    expect(app).toMatch(/'pricing_link'/);
    expect(app).toMatch(/proLinkFiredRef\.current = true/);
    expect(app).toMatch(/if \(userProStatus\) return;/);
    // The headline the modal shows for that reason is the homepage's promise.
    expect(app).toContain("proModalReason.type === 'email_link'");
  });
});

// freeQuota went live 2026-09-26: after ten solves the rest of the bank is
// Pro, so this email may not promise a free bank to people past ten.
describe('activated-note copy matches the free tier', () => {
  it('never promises that the free bank stays', () => {
    const src = fs.readFileSync(join(ROOT, 'supabase/functions/activated-note/index.ts'), 'utf8');
    expect(src).not.toMatch(/free bank is not going anywhere/i);
    expect(src).not.toMatch(/every (Easy|Medium)[^.]*free/i);
  });
  it('no scheduled sender promises a challenge count on the free tier', () => {
    const dir = join(ROOT, 'supabase/functions');
    for (const fn of fs.readdirSync(dir)) {
      const file = join(dir, fn, 'index.ts');
      if (!fs.existsSync(file)) continue;
      const src = fs.readFileSync(file, 'utf8');
      expect(src, fn).not.toMatch(/~?\d+ challenges\s+stay yours/i);
      expect(src, fn).not.toMatch(/free bank is not going anywhere/i);
    }
  });
});
