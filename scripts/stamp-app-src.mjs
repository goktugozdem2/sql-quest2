// Every link from a content page into the app carries an attribution door
// (2026-11-22, B2 content-funnel order).
//
// The app stamps first-touch `arrivalSrc` from `?src=` (or `utm_source`),
// else derives `company:<x>` / `sector:<x>` from a deep link (src/app.jsx,
// the module-load block). A link with none of those arrives as `(none)` or
// `ref:<host>`, so the page that sent the person is lost. On 2026-11-22, 114
// built files carried such links: the topic hubs' nav "Practice" button, the
// Turkish pages, the fraud and sector landings (`?ref=lp_*`, which is the
// REFERRAL-code parameter, not a door), the KPI page, three blog posts.
//
// This step runs over the BUILT pages in public/ after every generator, so a
// page from any generator, or a hand-written one, gets the same rule without
// each source learning it. It changes only hrefs that have no door:
//
//   - `src` or `utm_source` present         → left alone (the page chose).
//   - `company` or `sector` present          → left alone: the app derives
//     `company:<x>` / `sector:<x>`, and open reads key on it
//     (`company_set_wall`, the PayPal/Coinbase/Monzo claim). Adding a `src`
//     would rename those doors mid-flight, because an explicit src wins.
//   - `signin=1`                             → a log-in link, not an arrival.
//   - the app shell itself (app.html)        → its own canonical link.
//
// Everything else gets `src=<door>`, where <door> is the src the page already
// uses most on its other /app/ links (one door per page), else the page's own
// slug in the site's existing shape: `<slug>` for a root page, `home` for /,
// `blog-<slug>`, `challenges-<slug>`, `question-<slug>`.
//
// public/weekly/ and weekly.html are left to `npm run build:weekly`, which
// runs this step too: `npm run build` must not touch them (CLAUDE.md, staging
// rule). Idempotent: a second run changes nothing.
//
// Guard: tests/app-link-src.test.js.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const HREF_RE = /(href\s*=\s*)(["'])((?:https:\/\/sqlquest\.app)?\/app(?:\/|\.html)?(?:[?#][^"']*)?)\2/g;
export const DOOR_PARAMS = ['src', 'utm_source', 'company', 'sector'];
export const APP_SHELL = new Set(['app.html', 'app/index.html']);
export const WEEKLY = /^weekly(\.html$|\/)/;

const decode = (q) => q.replace(/&amp;/g, '&');

export function hrefParams(href) {
  const noHash = href.split('#')[0];
  const q = noHash.includes('?') ? noHash.slice(noHash.indexOf('?') + 1) : '';
  return new URLSearchParams(decode(q));
}

/** True when the app can attribute an arrival through this href. */
export function hasDoor(href) {
  const p = hrefParams(href);
  return DOOR_PARAMS.some(k => (p.get(k) || '').trim() !== '');
}

export function isExempt(href) {
  return hrefParams(href).get('signin') === '1';
}

/** The door for a page from its path under public/ (posix separators). */
export function doorForPath(rel) {
  const p = rel.replace(/\\/g, '/').replace(/(^|\/)index\.html$/, '').replace(/\.html$/, '').replace(/\/+$/, '');
  if (p === '') return 'home';
  const parts = p.split('/');
  if (parts[0] === 'blog') return parts.length > 1 ? `blog-${parts.slice(1).join('-')}` : 'blog';
  if (parts[0] === 'challenges') return parts.length > 1 ? `challenges-${parts.slice(1).join('-')}` : 'challenges';
  if (parts[0] === 'questions') return parts.length > 1 ? `question-${parts.slice(1).join('-')}` : 'questions';
  return parts.join('-');
}

/** The src the page already uses most on its /app/ links, or null. */
export function dominantSrc(html) {
  const counts = new Map();
  for (const m of html.matchAll(HREF_RE)) {
    const s = hrefParams(m[3]).get('src');
    // A template placeholder (`${…}`) is not a door.
    if (s && /^[a-z0-9:_-]+$/i.test(s)) counts.set(s, (counts.get(s) || 0) + 1);
  }
  let best = null;
  for (const [s, n] of counts) if (!best || n > best[1] || (n === best[1] && s < best[0])) best = [s, n];
  return best ? best[0] : null;
}

export function withSrc(href, door) {
  const [beforeHash, ...hashParts] = href.split('#');
  const hash = hashParts.length ? `#${hashParts.join('#')}` : '';
  const amp = beforeHash.includes('&amp;') ? '&amp;' : '&';
  const sep = beforeHash.includes('?') ? (beforeHash.endsWith('?') ? '' : amp) : '?';
  return `${beforeHash}${sep}src=${encodeURIComponent(door)}${hash}`;
}

/** Stamp one page's HTML. Returns { html, stamped }. */
export function stampHtml(html, rel) {
  const door = dominantSrc(html) || doorForPath(rel);
  let stamped = 0;
  const out = html.replace(HREF_RE, (whole, attr, quote, href) => {
    if (hasDoor(href) || isExempt(href)) return whole;
    stamped++;
    return `${attr}${quote}${withSrc(href, door)}${quote}`;
  });
  return { html: out, stamped };
}

export function shouldVisit(rel) {
  const r = rel.replace(/\\/g, '/');
  return r.endsWith('.html') && !APP_SHELL.has(r) && !WEEKLY.test(r);
}

export function listPages(root, { includeWeekly = false } = {}) {
  const out = [];
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, ent.name);
      const rel = path.relative(root, abs).replace(/\\/g, '/');
      if (ent.isDirectory()) walk(abs);
      else if (rel.endsWith('.html') && !APP_SHELL.has(rel) && (includeWeekly || !WEEKLY.test(rel))) out.push(rel);
    }
  };
  walk(root);
  return out.sort();
}

export function run({ root = 'public', weekly = false, log = console.log } = {}) {
  let pages = 0, links = 0;
  const files = weekly
    ? listPages(root, { includeWeekly: true }).filter(r => WEEKLY.test(r))
    : listPages(root);
  for (const rel of files) {
    const abs = path.join(root, rel);
    const before = fs.readFileSync(abs, 'utf8');
    const { html, stamped } = stampHtml(before, rel);
    if (stamped) {
      fs.writeFileSync(abs, html);
      pages++;
      links += stamped;
    }
  }
  log(`[stamp-app-src] ${links} app links given a src on ${pages} page${pages === 1 ? '' : 's'}${weekly ? ' (weekly)' : ''}`);
  return { pages, links };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  run({ weekly: process.argv.includes('--weekly') });
}
