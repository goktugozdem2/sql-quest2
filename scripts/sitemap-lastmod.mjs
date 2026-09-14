#!/usr/bin/env node
/**
 * `<lastmod>` that means something (2026-09-14).
 *
 * The sitemap's dates were hand-maintained and had stopped moving: on
 * 2026-09-14, after thirty company pages and the homepage changed, every one
 * of the 316 entries still read `2026-09-13` and the homepage read
 * `2026-09-12`. Meanwhile build-question-pages.mjs stamped TODAY on all 299
 * question pages on every build, changed or not. So the file was wrong in both
 * directions at once: silent about pages that had changed, and shouting about
 * pages that had not.
 *
 * A lastmod that is always today is worth less than no lastmod at all —
 * Google says it ignores the field on sitemaps whose dates it cannot trust,
 * and a file that claims 299 pages changed every deploy is exactly that.
 *
 * So: hash the BUILT page. If the bytes changed since the last run, the date
 * moves; otherwise it stays where it was. The hashes live in
 * src/data/sitemap-lastmod.json, committed, so the answer does not depend on
 * what happens to be in public/ on this machine.
 *
 * This is only sound because the build is deterministic — two builds of the
 * same source produce byte-identical pages (verified 2026-09-14: a rebuild
 * leaves the working tree clean). `cachebust.js` writes a changing `?v=` only
 * into public/app.html, which is noindex and not in the sitemap. If a build
 * step ever starts stamping a date or a random id into a page, this file will
 * bump that page every deploy and be back to lying — check here first.
 *
 * Runs last in `npm run build`, after cachebust.
 *
 * Usage:  node scripts/sitemap-lastmod.mjs          → update sitemap + manifest
 *         node scripts/sitemap-lastmod.mjs --check  → report, change nothing
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUB = path.join(ROOT, 'public');
const SITEMAP = path.join(PUB, 'sitemap.xml');
export const MANIFEST = path.join(ROOT, 'src/data/sitemap-lastmod.json');
const SITE = 'https://sqlquest.app';

export const today = (now = new Date()) => now.toISOString().slice(0, 10);

/** public file that serves this site path, or null. Mirrors Vercel's cleanUrls. */
export function fileFor(urlPath, exists = p => fs.existsSync(p)) {
  const clean = decodeURIComponent(urlPath.split('#')[0].split('?')[0]);
  const dirIndex = path.join(PUB, clean, 'index.html');
  if (exists(dirIndex)) return dirIndex;
  const flat = path.join(PUB, `${clean.replace(/\/$/, '')}.html`);
  if (clean !== '/' && exists(flat)) return flat;
  return null;
}

const hash = buf => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);

/** Every `<url>` block's path and the lastmod it currently carries. */
export function readEntries(xml) {
  const out = [];
  for (const m of xml.matchAll(/<url>[\s\S]*?<\/url>/g)) {
    const loc = (m[0].match(/<loc>([^<]+)<\/loc>/) || [])[1];
    if (!loc) continue;
    out.push({
      path: loc.replace(SITE, '') || '/',
      lastmod: (m[0].match(/<lastmod>([^<]+)<\/lastmod>/) || [])[1] || null,
      block: m[0],
    });
  }
  return out;
}

/**
 * The date each path should carry.
 *
 * @param entries  from readEntries
 * @param hashes   {path: hash} of the built pages now
 * @param manifest {path: {hash, lastmod}} from the last run (may be empty)
 * @param baseline {path: 'YYYY-MM-DD'} only used to seed a missing manifest:
 *                 the date of the last commit that touched each BUILT page,
 *                 which is when it actually last changed (public/ is committed
 *                 and the build is deterministic)
 * @returns {dates: {path: lastmod}, changed: [paths], seeded: boolean}
 */
export function resolveDates(entries, hashes, manifest, baseline = null, now = today()) {
  const seeded = !manifest || Object.keys(manifest).length === 0;
  const dates = {};
  const changed = [];
  for (const e of entries) {
    const h = hashes[e.path];
    // A path with no built file (an external or generated-elsewhere URL) keeps
    // whatever it had; we have nothing better to say about it.
    if (!h) { dates[e.path] = e.lastmod; continue; }
    if (seeded) {
      // First run: there is no history to compare bytes against, so take the
      // date git already knows — the last commit that touched this built page.
      // Setting everything to today instead would be the exact lie this file
      // exists to stop.
      const g = baseline && baseline[e.path];
      dates[e.path] = g || e.lastmod || now;
      if (g && g !== e.lastmod) changed.push(e.path);
      continue;
    }
    const prev = manifest[e.path];
    if (!prev) { dates[e.path] = now; changed.push(e.path); continue; }
    if (prev.hash === h) { dates[e.path] = prev.lastmod || e.lastmod || now; continue; }
    dates[e.path] = now;
    changed.push(e.path);
  }
  return { dates, changed, seeded };
}

export function applyDates(xml, dates) {
  return xml.replace(/<url>[\s\S]*?<\/url>/g, block => {
    const loc = (block.match(/<loc>([^<]+)<\/loc>/) || [])[1];
    const key = loc ? (loc.replace(SITE, '') || '/') : null;
    const d = key && dates[key];
    if (!d) return block;
    return block.includes('<lastmod>')
      ? block.replace(/<lastmod>[^<]*<\/lastmod>/, `<lastmod>${d}</lastmod>`)
      : block.replace(/(<loc>[^<]*<\/loc>)/, `$1\n    <lastmod>${d}</lastmod>`);
  });
}

/** The date of the last commit that touched each built page. */
function baselineDates(entries) {
  const out = {};
  for (const e of entries) {
    const file = fileFor(e.path);
    if (!file) continue;
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    try {
      const d = execFileSync('git', ['log', '-1', '--format=%cs', '--', rel], { cwd: ROOT }).toString().trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) out[e.path] = d;
    } catch { /* untracked or never committed: leave unset */ }
  }
  return out;
}

function main() {
  const check = process.argv.includes('--check');
  const xml = fs.readFileSync(SITEMAP, 'utf8');
  const entries = readEntries(xml);
  const hashes = {};
  let unbuilt = 0;
  for (const e of entries) {
    const file = fileFor(e.path);
    if (!file) { unbuilt++; continue; }
    hashes[e.path] = hash(fs.readFileSync(file));
  }
  let manifest = {};
  try { manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')).pages || {}; } catch { manifest = {}; }
  const seeding = Object.keys(manifest).length === 0;
  const { dates, changed, seeded } = resolveDates(entries, hashes, manifest, seeding ? baselineDates(entries) : null);

  if (check) {
    console.log(`[sitemap-lastmod] ${entries.length} urls, ${unbuilt} with no built file, ${changed.length} ${seeded ? 'corrected (seeding from git)' : 'changed'}`);
    for (const p of changed.slice(0, 20)) console.log(`    ${p}`);
    if (changed.length > 20) console.log(`    … and ${changed.length - 20} more`);
    return;
  }

  fs.writeFileSync(SITEMAP, applyDates(xml, dates));
  const pages = {};
  for (const e of entries) {
    if (!hashes[e.path]) continue;
    pages[e.path] = { hash: hashes[e.path], lastmod: dates[e.path] };
  }
  fs.writeFileSync(MANIFEST, `${JSON.stringify({
    note: 'Written by scripts/sitemap-lastmod.mjs. A page\'s date moves only when its built bytes change.',
    updated: today(),
    pages,
  }, null, 2)}\n`);
  console.log(`[sitemap-lastmod] ${seeded ? `first run: ${changed.length} of ${entries.length} dates corrected from git history` : `${changed.length} of ${entries.length} pages changed → ${today()}`}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
