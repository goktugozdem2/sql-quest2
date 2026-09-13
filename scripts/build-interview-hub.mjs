#!/usr/bin/env node
/**
 * The interview hub's company grid, generated from the one registry
 * (founder's list, 2026-09-14: "reconcile the hub's '30 tracks' claim with
 * its 23 listed companies" and "generate these from shared data").
 *
 * The hub had been hand-maintained: the seven company pages shipped on
 * 09-13 never reached it, so the page claimed 30 tracks above a list of 23
 * and the new pages had no inbound link from the hub that is supposed to
 * carry them. The grid is now rendered from COMPANIES in
 * scripts/build-company-crosslinks.mjs — the same registry the cross-link
 * strips use — so a company added there cannot be missing here.
 *
 * Editorial copy is preserved: a company already on the page keeps the
 * description it had; a new one gets the registry's line until someone
 * writes a better one.
 *
 * Writes src/sql-interview-prep.html between the markers, and keeps the
 * page's stated count in step. Idempotent.
 *
 * Run: node scripts/build-interview-hub.mjs   (part of `npm run build`)
 */

import fs from 'node:fs';
import path from 'node:path';
import { COMPANIES } from './build-company-crosslinks.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const HUB = path.join(ROOT, 'src/sql-interview-prep.html');
export const START = '<!-- company-grid:start -->';
export const END = '<!-- company-grid:end -->';

// Editorial group order and labels. Every sector in the registry must appear
// here or the build fails — a new sector must be placed on purpose.
export const GROUPS = [
  ['bigtech', 'FAANG &amp; Big Tech'],
  ['consumer', 'Marketplaces &amp; Consumer'],
  ['datainfra', 'Streaming &amp; Data Infrastructure'],
  ['fintech', 'Finance &amp; Fintech'],
  ['ailab', 'AI Labs'],
  ['industrial', 'Hardware &amp; Industrial'],
];

const esc = s => String(s).replace(/&(?!(amp|lt|gt|quot|#39);)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The description each company currently shows on the hub, by slug. */
export function existingDescriptions(html) {
  const out = {};
  for (const m of html.matchAll(/<a class="cc" href="\/([a-z0-9-]+)-sql-interview\/"><p class="t">([^<]*)<\/p><p class="d">([^<]*)<\/p><\/a>/g)) {
    out[m[1]] = { title: m[2], desc: m[3] };
  }
  return out;
}

export function grid(companies = COMPANIES, existing = {}) {
  const sectors = new Set(Object.values(companies).map(c => c.sector));
  for (const s of sectors) {
    if (!GROUPS.some(([id]) => id === s)) throw new Error(`sector "${s}" has no group in build-interview-hub.mjs`);
  }
  const parts = [];
  for (const [sector, label] of GROUPS) {
    const slugs = Object.keys(companies).filter(k => companies[k].sector === sector);
    if (!slugs.length) continue;
    parts.push(`  <p class="group-label">${label}</p>`);
    parts.push('  <div class="cg">');
    for (const slug of slugs) {
      const c = companies[slug];
      const was = existing[slug];
      const title = was ? was.title : c.name;
      const desc = was ? was.desc : c.desc;
      parts.push(`    <a class="cc" href="/${slug}-sql-interview/"><p class="t">${esc(title)}</p><p class="d">${esc(desc)}</p></a>`);
    }
    parts.push('  </div>');
  }
  return parts.join('\n');
}

export function render(html, companies = COMPANIES) {
  const existing = existingDescriptions(html);
  const body = grid(companies, existing);
  const n = Object.keys(companies).length;
  let out = html;
  if (out.includes(START)) {
    out = out.replace(new RegExp(`${START}[\\s\\S]*?${END}`), `${START}\n${body}\n  ${END}`);
  } else {
    // First run: replace everything from the first group label to the last
    // card grid with the generated block.
    const first = out.indexOf('  <p class="group-label">');
    const lastGrid = out.lastIndexOf('  </div>', out.indexOf('</section>', first));
    if (first < 0 || lastGrid < 0) throw new Error('hub: could not find the company grid to replace');
    out = `${out.slice(0, first)}${START}\n${body}\n  ${END}${out.slice(lastGrid + '  </div>'.length)}`;
  }
  // The page's own count, wherever it states one.
  out = out.replace(/\b\d+ company-specific question (sets|tracks)\b/g, `${n} company-specific question $1`);
  out = out.replace(/from the \d+ tracks above/g, `from the ${n} tracks above`);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const html = fs.readFileSync(HUB, 'utf8');
  const out = render(html);
  fs.writeFileSync(HUB, out);
  console.log(`[interview-hub] ${Object.keys(COMPANIES).length} companies in the grid`);
}
