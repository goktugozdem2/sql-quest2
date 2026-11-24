import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const fn = fs.readFileSync(join(ROOT, 'supabase/functions/activated-note/index.ts'), 'utf8');
// 2026-11-25: the letter moved out of index.ts — per-recipient copy in
// letter.ts, the layout and fixed sentences in a React Email template
// (emails/activated-note.tsx) rendered at build time into
// template.generated.ts. The guards below read whichever file now holds the
// thing they guard; tests/activated-note-template.test.js renders letters.
const letter = fs.readFileSync(join(ROOT, 'supabase/functions/activated-note/letter.ts'), 'utf8');
const tpl = fs.readFileSync(join(ROOT, 'emails/activated-note.tsx'), 'utf8');
const gen = fs.readFileSync(join(ROOT, 'supabase/functions/activated-note/template.generated.ts'), 'utf8');
const copy = [fn, letter, tpl].join('\n');
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
    const subjects = [...letter.matchAll(/`([^`]*SQL Quest[^`]*)`/g)].map(m => m[1]).filter(s => /founder|I build/i.test(s));
    expect(subjects.length).toBeGreaterThanOrEqual(3);
    expect(letter).toMatch(/short list|writing this myself|writing to you directly/);
    // one CTA: one ctaUrl href in the template, one in its render
    expect((tpl.match(/href=\{s\.ctaUrl\}/g) || []).length).toBe(1);
    expect((gen.match(/href=\\"\{\{ctaUrl\}\}\\"/g) || []).length).toBe(1);
    expect(tpl).toContain('Founder, SQL Quest');
    expect(fn).toContain("const REPLY_TO = 'goktug@datrick.com'");
  });

  // 2026-10-01: a dry run showed `weakest: null` for forty people out of
  // forty. The canonical skill record is rebuilt in the browser, so a lapsed
  // account still holds the old one; the Skillmap levels are the fallback.
  it('names the lowest practised skill from the canonical record, else from the Skillmap', async () => {
    // letter.ts is pure TypeScript, importable by Deno and by vitest alike.
    const { weakestSkill } = await import('../supabase/functions/activated-note/letter.ts');
    expect(fn).toContain("import { renderActivatedNote, weakestSkill } from './letter.ts'");
    // the canonical record, when it has numbers
    expect(weakestSkill({ skillMastery: { Joins: { mastery: 40 }, 'Window Functions': { mastery: 12 }, 'Querying Basics': { mastery: 80 } } })).toBe('Window Functions');
    // a lapsed account: the old fourteen-name record (no numeric mastery) + the Skillmap
    const lapsed = {
      skillMastery: { CTEs: { correct: 2 }, HAVING: { correct: 1 }, 'Window Functions': { correct: 0 } },
      weaknessTracking: { skillLevels: { Joins: 47, 'NULL Handling': 38, 'String Functions': 15, 'Window Functions': 28, 'Date Functions': 0 } },
    };
    expect(weakestSkill(lapsed)).toBe('String Functions');
    // a skill never practised (0) is not "the lowest line"; nothing under 70 is nothing to name
    expect(weakestSkill({ weaknessTracking: { skillLevels: { Joins: 0, 'Window Functions': 0 } } })).toBeNull();
    expect(weakestSkill({ weaknessTracking: { skillLevels: { Joins: 82, 'Querying Basics': 90 } } })).toBeNull();
    expect(weakestSkill({})).toBeNull();
    expect(weakestSkill({ skillMastery: 'x', weaknessTracking: { skillLevels: null } })).toBeNull();
    // a retired skill name is never named
    expect(weakestSkill({ weaknessTracking: { skillLevels: { 'JOIN Tables': 5, Joins: 60 } } })).toBe('Joins');
  });

  it('checks the once-ever mark again at the moment of sending', () => {
    const loop = fn.slice(fn.indexOf('for (const c of batch) {'));
    const recheck = loop.indexOf("select('marked:data->activatedNoteAt')");
    expect(recheck).toBeGreaterThan(-1);
    expect(loop.indexOf('if (fresh?.marked) { skipped++; continue }')).toBeGreaterThan(recheck);
    expect(loop.indexOf('sendAndLog(')).toBeGreaterThan(loop.indexOf('if (fresh?.marked)'));
  });

  it('never claims an unlimited tutor or a lifetime plan', () => {
    expect(copy).not.toMatch(/unlimited/i);
    expect(copy).not.toMatch(/\$199|lifetime/i);
  });

  // 2026-10-01: the body said "$99 a year, or $29 a month" to a list that is
  // mostly in India, where the modal shows $9 / $39. No price in the email;
  // the offer it states is the trial, and only while the trial is on.
  it('states no price, and offers the trial exactly when the flag does', () => {
    const body = tpl.slice(tpl.indexOf('export const OFFER_LINE'));
    expect(body).not.toMatch(/\$\s?\d/);
    expect(letter).not.toMatch(/\$\s?\d/);
    expect(gen).not.toMatch(/\$\s?\d/);
    const flags = fs.readFileSync(join(ROOT, 'src/data/feature-flags.js'), 'utf8');
    const trialOn = /^\s+checkoutTrial: true,/m.test(flags) && /^\s+checkoutSessions: true,/m.test(flags);
    const saysTrial = /7 days free/.test(copy + gen);
    expect(saysTrial, 'the email offers the trial if and only if checkoutTrial is on').toBe(trialOn);
    if (trialOn) {
      expect(tpl).toContain("export const OFFER_LINE = 'It starts with 7 days free: a card is required, nothing is charged today, and cancelling before day 7 costs nothing.'");
      expect(tpl).toContain('${OFFER_LINE}');
      expect(gen).toContain('It starts with 7 days free: a card is required');
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
    for (const src of [fn, letter, tpl, gen]) {
      expect(src).not.toMatch(/free bank is not going anywhere/i);
      expect(src).not.toMatch(/every (Easy|Medium)[^.]*free/i);
    }
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
