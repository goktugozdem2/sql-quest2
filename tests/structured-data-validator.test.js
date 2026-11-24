import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  validateSite, validateHtml, countWarnings, readBaseline, compareToBaseline, builtPages,
} from '../scripts/structured-data.mjs';
import { OUT as VOCAB_FILE, VERSION } from '../scripts/vendor/vendor-schemaorg.mjs';

const ROOT = path.join(import.meta.dirname, '..');

// ---------------------------------------------------------------------------
// Every JSON-LD block on the built site, validated against schema.org and
// Google's rich-result rules by @adobe/structured-data-validator (2026-11-24,
// adopt-now #1 of the SEO/GEO tool shortlist). Offline: the vocabulary is the
// pinned copy in scripts/vendor/.
//
//   ERROR   → always fails. No baseline holds one.
//   WARNING → a ratchet against scripts/structured-data-baseline.txt, the same
//             shape as faq-schema-baseline.txt: no new warning, and a fixed
//             warning must leave the file.
//
// Not to be confused with tests/structured-data.test.js (C1, 2026-11-22): the
// hand-written strict gate on the 35 company/hub pages (FAQ equals visible
// FAQ, breadcrumb positions, canonical urls). This one is the library's
// schema.org + rich-result rules over every built page. They overlap only on
// breadcrumb names, and both should hold.
// ---------------------------------------------------------------------------
describe('structured data on the built site (public/)', () => {
  let issues;
  beforeAll(async () => { issues = await validateSite(ROOT); }, 120_000);

  it('the check actually reads the site — question pages included', () => {
    const withLd = builtPages(ROOT).filter(f => fs.readFileSync(f, 'utf8').includes('application/ld+json'));
    expect(withLd.length, 'fewer than 400 pages carry JSON-LD — did the walk break?').toBeGreaterThan(400);
    expect(withLd.filter(f => f.includes(`${path.sep}questions${path.sep}`)).length,
      'the generated /questions/ pages are not being scanned').toBeGreaterThan(250);
  });

  it('no JSON-LD block has an ERROR (required property missing, wrong type, unparseable block)', () => {
    const errors = issues.filter(i => i.severity === 'ERROR');
    const detail = errors.map(e => `  ${e.page}\n    ${e.path}: ${e.message}`).join('\n');
    expect(errors.length, errors.length === 0 ? '' :
      `${errors.length} structured-data ERROR(s). Fix the generator or the page — errors are never baselined:\n${detail}`).toBe(0);
  });

  it('no NEW warning — every warning is one the baseline already lists', () => {
    const { added } = compareToBaseline(countWarnings(issues), readBaseline());
    const detail = added.map(([k, n]) => `  +${n}  ${k.replace(/\t/g, '  ')}`).join('\n');
    expect(added.length, added.length === 0 ? '' :
      `${added.length} new structured-data warning(s). Fix them — do NOT add them to ` +
      `scripts/structured-data-baseline.txt:\n${detail}`).toBe(0);
  });

  it('the baseline only shrinks — a fixed warning must be deleted from it', () => {
    const { stale } = compareToBaseline(countWarnings(issues), readBaseline());
    const detail = stale.map(([k, n]) => `  -${n}  ${k.replace(/\t/g, '  ')}`).join('\n');
    expect(stale.length, stale.length === 0 ? '' :
      `${stale.length} baseline line(s) list more warnings than the site has. Delete or lower ` +
      `them in scripts/structured-data-baseline.txt:\n${detail}`).toBe(0);
  });

  it('the baseline names only pages that exist', () => {
    const gone = [...new Set([...readBaseline().keys()].map(k => k.split('\t')[0]))]
      .filter(p => !fs.existsSync(path.join(ROOT, p)));
    expect(gone, `baseline names deleted page(s): ${gone.join(', ')}`).toEqual([]);
  });
});

describe('the structured-data check itself is honest', () => {
  const page = ld => `<html><head><script type="application/ld+json">${ld}</script></head><body></body></html>`;
  const crumbs = items => JSON.stringify({
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, ...it })),
  });

  it('a clean BreadcrumbList passes with no issue', async () => {
    const r = await validateHtml(page(crumbs([
      { name: 'Home', item: 'https://sqlquest.app/' },
      { name: 'SQL Exercises', item: 'https://sqlquest.app/sql-exercises/' },
    ])));
    expect(r).toEqual([]);
  });

  it('a ListItem without a name is an ERROR', async () => {
    const r = await validateHtml(page(crumbs([
      { name: 'Home', item: 'https://sqlquest.app/' },
      { item: 'https://sqlquest.app/sql-exercises/' },
    ])));
    expect(r.filter(i => i.severity === 'ERROR').map(i => i.rule)).toContain('one-of:name|item.name');
  });

  it('an unparseable JSON-LD block is an ERROR', async () => {
    const r = await validateHtml(page('{"@context":"https://schema.org","@type":"WebPage",'));
    expect(r.some(i => i.severity === 'ERROR')).toBe(true);
  });

  it('a property schema.org does not define for the type is a WARNING', async () => {
    const r = await validateHtml(page(JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Course', name: 'x', description: 'y', courseMode: 'online',
    })));
    expect(r.map(i => `${i.severity} ${i.rule}`)).toContain('WARNING not-in-schema.org:courseMode');
  });

  it('runs on the pinned, vendored vocabulary — no network', () => {
    const vocab = JSON.parse(fs.readFileSync(VOCAB_FILE, 'utf8'));
    expect(vocab._version).toBe(VERSION);
    expect(vocab._source).toContain(`/releases/${VERSION}/`);
    const ids = new Set(vocab['@graph'].map(e => e['@id']));
    for (const id of ['schema:Course', 'schema:LearningResource', 'schema:BreadcrumbList', 'schema:courseMode']) {
      expect(ids.has(id), `${id} missing from the vendored vocabulary`).toBe(true);
    }
    // Stays under the 1 MB the laptop's pre-push redaction hook can scan.
    expect(fs.statSync(VOCAB_FILE).size).toBeLessThan(1_000_000);
  });
});
