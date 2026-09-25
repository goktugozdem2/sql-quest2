// /for-teams/ — the seat door (docs/plans/monetization-2026-09-24.md, row 6;
// outreach plan docs/outreach/teams-2026-09-26.md).
//
// The page is a TEST, not a product: one button that records `team_interest`
// with the seat count (and a work email only if the visitor typed one). Until
// the founder decides to publish it, it must stay out of every index:
// noindex, absent from the sitemap, linked from no other page. These tests pin
// that, pin the button to the [data-track] relay in src/track.js, and run the
// real tracker to prove the seat count actually reaches the row.
//
// Proven by deliberate breaks (2026-09-26): dropping the robots meta from
// src/for-teams.html fails "is noindex in source and in the built page";
// renaming data-track="team_interest" fails "the button is on the relay";
// reverting track.js's relay to `{ href }` only fails "relays seats and email".

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SRC = read('src/for-teams.html');

describe('/for-teams/ stays unpublished until the founder says so', () => {
  it('is noindex in source and in the built page', () => {
    expect(SRC).toContain('<meta name="robots" content="noindex">');
    for (const f of ['public/for-teams/index.html', 'public/for-teams.html']) {
      expect(read(f), f).toContain('<meta name="robots" content="noindex">');
    }
  });

  it('is not in the sitemap', () => {
    expect(read('public/sitemap.xml')).not.toContain('/for-teams');
  });

  it('no other page, generator or template links to it', () => {
    const offenders = [];
    const walk = dir => {
      for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
        const rel = path.join(dir, e.name);
        if (e.isDirectory()) walk(rel);
        else if (/\.(html|mjs|js|jsx|md|json|txt)$/.test(e.name) && rel !== path.join('src', 'for-teams.html')) {
          if (/href=["'][^"']*\/for-teams/.test(read(rel))) offenders.push(rel);
        }
      }
    };
    walk('src');
    walk('scripts');
    expect(offenders).toEqual([]);
  });

  it('states no price and no checkout', () => {
    expect(SRC).not.toMatch(/\$\s?\d/);
    expect(SRC).not.toMatch(/buy\.stripe\.com|beginCheckout|pro=1/);
  });
});

describe('the one button records team_interest through [data-track]', () => {
  it('the button is on the relay, with a seat count and no email by default', () => {
    const btn = SRC.match(/<button[^>]*id="team-interest"[^>]*>/);
    expect(btn, 'button#team-interest').toBeTruthy();
    expect(btn[0]).toContain('data-track="team_interest"');
    expect(btn[0]).toMatch(/data-track-seats="\d+"/);
    expect(btn[0]).not.toContain('data-track-email');
  });

  it('the built page carries the tracker', () => {
    expect(read('public/for-teams/index.html')).toContain('<script defer src="/track.js"></script>');
  });

  it('track.js relays seats (as a number) and email from data-track-* attributes', () => {
    const calls = [];
    const listeners = {};
    const store = new Map();
    const ctx = {
      localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
      location: { hostname: 'sqlquest.app', pathname: '/for-teams/', search: '', href: 'https://sqlquest.app/for-teams/' },
      document: {
        referrer: '', visibilityState: 'visible',
        addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
        removeEventListener() {},
      },
      navigator: { userAgent: 'Mozilla/5.0 (Macintosh) Chrome/128.0 Safari/537.36', webdriver: false },
      fetch: (url, opts) => { calls.push(JSON.parse(opts.body)); return Promise.resolve({ ok: true }); },
    };
    ctx.window = ctx;
    vm.createContext(ctx);
    vm.runInContext(read('src/track.js'), ctx, { filename: 'track.js' });

    const button = {
      dataset: { track: 'team_interest', trackSeats: '25', trackEmail: 'programs@example.edu' },
      getAttribute: () => null,
    };
    const target = { closest: sel => (sel === '[data-track]' ? button : null) };
    (listeners.click || []).forEach(fn => fn({ type: 'click', target }));

    const row = calls.find(c => c.event === 'team_interest');
    expect(row, 'a team_interest row').toBeTruthy();
    expect(row.reason).toBe('landing');
    const meta = JSON.parse(row.metadata);
    expect(meta.seats).toBe(25);
    expect(meta.email).toBe('programs@example.edu');
    expect(meta.page).toBe('for-teams');
    expect(meta.href).toBeNull();
  });
});
