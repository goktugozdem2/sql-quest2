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
    expect(fn).toContain('$99 a year, or $29 a month');
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
