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

// Published 2026-11-22 by the founder's go in chat ("evet, /for-teams/ yayına
// al"). The 30-day kill rule of docs/plans/monetization-2026-09-24.md row 6
// starts that day: fewer than 3 team_interest rows by 2026-12-22 → drop it.
describe('/for-teams/ is published (founder, 2026-11-22)', () => {
  it('is indexable in source and in the built page', () => {
    expect(SRC).toContain('<meta name="robots" content="index, follow">');
    expect(SRC).not.toContain('content="noindex"');
    for (const f of ['public/for-teams/index.html', 'public/for-teams.html']) {
      expect(read(f), f).not.toContain('content="noindex"');
    }
  });

  it('is in the sitemap', () => {
    expect(read('public/sitemap.xml')).toContain('<loc>https://sqlquest.app/for-teams/</loc>');
  });

  it('the two instructor-facing pages link to it from their footers (an indexable page needs internal links)', () => {
    for (const f of ['src/after-bootcamp.html', 'src/after-the-sql-course.html']) {
      const html = read(f);
      const foot = html.slice(html.indexOf('<footer>'), html.indexOf('</footer>'));
      expect(foot, f).toContain('href="/for-teams/"');
    }
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

// New-content QA 2026-11-23, D7: the page was indexed with no JSON-LD at all.
// It now carries WebPage + BreadcrumbList + FAQPage, published by the one
// SQL Quest entity (#187). No Product or Offer, because it states no price.
// The FAQ schema must be the visible <details> text, word for word.
describe('/for-teams/ structured data', () => {
  const ORG_ID = 'https://sqlquest.app/#organization';
  const blocks = html => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(m => JSON.parse(m[1]));
  const nodes = html => blocks(html).flatMap(b => b['@graph'] || [b]);
  const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const squash = s => decode(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

  for (const f of ['src/for-teams.html', 'public/for-teams/index.html']) {
    it(`${f}: a WebPage, a BreadcrumbList and a FAQPage, and nothing that sells`, () => {
      const html = read(f);
      const types = nodes(html).map(n => n['@type']);
      expect(types).toEqual(expect.arrayContaining(['WebPage', 'BreadcrumbList', 'FAQPage']));
      expect(types).not.toContain('Product');
      expect(JSON.stringify(blocks(html))).not.toMatch(/"Offer"|"price"/);
      const page = nodes(html).find(n => n['@type'] === 'WebPage');
      expect(page.url).toBe('https://sqlquest.app/for-teams/');
      expect(page.publisher['@id']).toBe(ORG_ID);
      const crumbs = nodes(html).find(n => n['@type'] === 'BreadcrumbList').itemListElement;
      expect(crumbs.map(c => c.item)).toEqual(['https://sqlquest.app/', 'https://sqlquest.app/for-teams/']);
    });

    it(`${f}: the FAQ schema is the visible FAQ, verbatim and in order`, () => {
      const html = read(f);
      const visible = [...html.matchAll(/<details>\s*<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>\s*<\/details>/g)]
        .map(m => [squash(m[1]), squash(m[2])]);
      expect(visible.length).toBeGreaterThan(0);
      const faq = nodes(html).find(n => n['@type'] === 'FAQPage').mainEntity
        .map(q => [q.name, q.acceptedAnswer.text]);
      expect(faq).toEqual(visible);
    });
  }
});
