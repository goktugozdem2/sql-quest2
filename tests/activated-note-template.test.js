// activated-note — the React Email template, rendered as real letters
// (2026-11-25).
//
// emails/activated-note.tsx is rendered at build time by
// scripts/build-emails.mjs into supabase/functions/activated-note/
// template.generated.ts; letter.ts fills its slots per recipient. These tests
// render two letters the way the edge function does and hold them to the
// email voice rule (CLAUDE.md) and to what the live site says.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderActivatedNote, SUBJECTS, fillTemplate } from '../supabase/functions/activated-note/letter.ts';
import { ACTIVATED_NOTE_HTML, ACTIVATED_NOTE_TEXT, ACTIVATED_NOTE_SLOTS } from '../supabase/functions/activated-note/template.generated.ts';
import { TRIAL_DAYS } from '../src/utils/checkout-session.js';
import { TEMPLATES, renderTemplateModule } from '../scripts/build-emails.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// What index.ts passes: the same utm() shape and the unsubscribe function URL.
const CTA = 'https://sqlquest.app/app/?src=activated_note&pro=1&utm_source=email&utm_campaign=activated_note';
const unsubFor = token => `https://example.supabase.co/functions/v1/email-unsubscribe?ut=${token}`;

// Two synthetic recipients (no customer data): one with a weak skill and a
// named company, one with neither.
const A = { username: 'maya_k', solves: 14, weakest: 'Window Functions', company: 'Capital One' };
const B = { username: 'dev_arun', solves: 7, weakest: null, company: null };
const a = renderActivatedNote(A, { cta: CTA, unsub: unsubFor('tok-a') });
const b = renderActivatedNote(B, { cta: CTA, unsub: unsubFor('tok-b') });

const FOUNDER_IN_SUBJECT = /SQL Quest's founder|I build SQL Quest|person who builds SQL Quest/;
const unescape = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
// The words a reader sees in the HTML part: no tags, no CSS, no hidden preheader padding.
const visible = html => unescape(html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
const hrefs = html => [...html.matchAll(/href="([^"]*)"/g)].map(m => unescape(m[1]));

describe('activated-note template: two recipients, two letters', () => {
  it('names the founder in the subject — every variant, and both letters', () => {
    for (const s of SUBJECTS) expect(s(12)).toMatch(FOUNDER_IN_SUBJECT);
    expect(a.subject).toMatch(FOUNDER_IN_SUBJECT);
    expect(b.subject).toMatch(FOUNDER_IN_SUBJECT);
  });

  it('never sends byte-identical bodies: the HTML and the text both differ, by the person', () => {
    expect(a.html).not.toBe(b.html);
    expect(a.text).not.toBe(b.text);
    expect(a.text).toContain('Hi maya_k,');
    expect(b.text).toContain('Hi dev_arun,');
    expect(a.text).toContain('Window Functions');
    expect(a.text).toContain('Capital One');
    expect(a.html).toContain('<strong>Window Functions</strong>');
    expect(b.text).not.toContain('Window Functions is');
    // the hand-written-to-a-short-list line is in every letter
    for (const l of [a, b]) expect(l.text).toMatch(/not from a sequence|writing this myself|writing to you directly/);
    for (const l of [a, b]) expect(l.text).toMatch(/Göktuğ\s+Founder, SQL Quest/);
  });

  it('has one CTA, and it opens the Pro modal: src=activated_note&pro=1 with the utm', () => {
    for (const l of [a, b]) {
      const app = hrefs(l.html).filter(h => h.includes('/app/'));
      expect(app).toEqual([CTA]);
      const u = new URL(app[0]);
      expect(u.searchParams.get('src')).toBe('activated_note');
      expect(u.searchParams.get('pro')).toBe('1');
      expect(u.searchParams.get('utm_campaign')).toBe('activated_note');
      expect(l.text).toContain(CTA);
    }
  });

  it('carries the person’s own unsubscribe link in both parts', () => {
    expect(hrefs(a.html)).toContain(unsubFor('tok-a'));
    expect(hrefs(b.html)).toContain(unsubFor('tok-b'));
    expect(a.text).toMatch(new RegExp(`Unsubscribe\\s+${unsubFor('tok-a').replace(/[.?]/g, '\\$&')}`));
    expect(b.text).toContain(unsubFor('tok-b'));
    expect(a.html).not.toContain('tok-b');
  });

  it('ships a plain-text part: words only, every slot filled', () => {
    for (const l of [a, b]) {
      expect(l.text.length).toBeGreaterThan(400);
      expect(l.text).not.toMatch(/<[a-z!/]/i);
      expect(l.text).not.toMatch(/\{\{|\}\}/);
      expect(l.html).not.toMatch(/\{\{|\}\}/);
      expect(l.html.startsWith('<!DOCTYPE html')).toBe(true);
    }
  });

  it('states no price or discount; the only offer is the trial, in the modal’s own day count', () => {
    for (const l of [a, b]) {
      for (const words of [l.text, visible(l.html), l.subject]) {
        expect(words).not.toMatch(/[$€£₹]\s?\d|\d\s?(USD|EUR|GBP|INR)\b/i);
        expect(words).not.toMatch(/\d+\s?%|discount|coupon|promo|save \d|off your|half price|lifetime|unlimited/i);
        expect(words).not.toMatch(/\/\s?(mo|month|yr|year)\b|per (month|year)|a (month|year)\b/i);
        // every "N days" in the letter is the live trial's length
        for (const [, n] of words.matchAll(/(\d+) days?\b/g)) expect(Number(n)).toBe(TRIAL_DAYS);
        for (const [, n] of words.matchAll(/day (\d+)\b/g)) expect(Number(n)).toBe(TRIAL_DAYS);
      }
    }
  });

  it('escapes what a person typed into their own account', () => {
    const l = renderActivatedNote({ username: 'x<img src=y>', solves: 9, weakest: null, company: 'A&B "Bank"' }, { cta: CTA, unsub: unsubFor('t') });
    expect(l.html).not.toContain('<img src=y>');
    expect(l.html).toContain('x&lt;img src=y&gt;');
    expect(l.html).toContain('<strong>A&amp;B &quot;Bank&quot;</strong>');
    expect(l.text).toContain('Hi x<img src=y>,'); // the text part is text
  });

  it('refuses a fill that would leave a slot behind', () => {
    const values = Object.fromEntries(ACTIVATED_NOTE_SLOTS.map(s => [s, 'v']));
    expect(() => fillTemplate(ACTIVATED_NOTE_HTML, values)).not.toThrow();
    const missing = { ...values };
    delete missing.opener;
    expect(() => fillTemplate(ACTIVATED_NOTE_HTML, missing)).toThrow(/opener/);
    expect(() => fillTemplate(ACTIVATED_NOTE_TEXT + ' {{stray}}', values)).toThrow(/stray/);
  });
});

describe('activated-note template: build output', () => {
  it('the committed template.generated.ts is what the .tsx renders today (no drift)', async () => {
    const t = TEMPLATES.find(x => x.out.endsWith('activated-note/template.generated.ts'));
    const committed = fs.readFileSync(join(ROOT, t.out), 'utf8');
    expect(await renderTemplateModule(t), 'run `node scripts/build-emails.mjs`').toBe(committed);
  });

  it('every slot is in both parts, and the accent appears once (the CTA)', () => {
    for (const s of ACTIVATED_NOTE_SLOTS) {
      expect(ACTIVATED_NOTE_HTML).toContain(`{{${s}}}`);
      if (s !== 'preview') expect(ACTIVATED_NOTE_TEXT).toContain(`{{${s}}}`);
    }
    expect((ACTIVATED_NOTE_HTML.match(/#FFE34D/gi) || []).length).toBe(1);
  });

  it('keeps React and React Email out of the function and the app', () => {
    const fnDir = join(ROOT, 'supabase/functions/activated-note');
    for (const f of fs.readdirSync(fnDir)) {
      const src = fs.readFileSync(join(fnDir, f), 'utf8');
      expect(src, f).not.toMatch(/from ['"](react|react-dom|@react-email\/[\w-]+)['"]/);
    }
    const app = fs.readFileSync(join(ROOT, 'src/app.jsx'), 'utf8');
    expect(app).not.toMatch(/@react-email|emails\/activated-note/);
    const pkg = JSON.parse(fs.readFileSync(join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.dependencies?.['@react-email/components']).toBeUndefined();
    expect(pkg.devDependencies['@react-email/components']).toMatch(/^\d+\.\d+\.\d+$/); // exact pin
    expect(pkg.scripts.build).toContain('node scripts/build-emails.mjs');
  });
});
