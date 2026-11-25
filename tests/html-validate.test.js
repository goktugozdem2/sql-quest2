import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  validateSite, validateHtml, countIssues, readBaseline, compareToBaseline, builtPages,
} from '../scripts/html-validate.mjs';

const ROOT = path.join(import.meta.dirname, '..');

// ---------------------------------------------------------------------------
// Every built page (public/**/*.html, minus the weekly pages) parsed by
// html-validate (2026-11-24, "worth watching" on the SEO/GEO tool shortlist).
// Config and its reasons: scripts/html-validate.mjs. A RATCHET against
// scripts/html-validate-baseline.txt: no new error, and a fixed error must
// leave the file. The first run found 581 errors; the homepage's second
// <body> and stray </div> and the footer injector's <style> under <footer>
// (508 pages) were fixed in the same PR, leaving 70.
// ---------------------------------------------------------------------------
describe('HTML on the built site (public/)', () => {
  let issues;
  beforeAll(async () => { issues = await validateSite(ROOT); }, 120_000);

  it('the check actually reads the site — question pages included', () => {
    const pages = builtPages(ROOT);
    expect(pages.length, 'fewer than 450 built pages — did the walk break?').toBeGreaterThan(450);
    expect(pages.filter(f => f.includes(`${path.sep}questions${path.sep}`)).length,
      'the generated /questions/ pages are not being scanned').toBeGreaterThan(250);
    expect(pages.some(f => f.endsWith(`public${path.sep}index.html`)), 'the homepage is not scanned').toBe(true);
    expect(pages.some(f => f.includes(`${path.sep}weekly${path.sep}`)), 'public/weekly/ must be skipped').toBe(false);
  });

  it('no NEW html error — every error is one the baseline already lists', () => {
    const { added } = compareToBaseline(countIssues(issues), readBaseline());
    const at = new Map(issues.map(i => [`${i.page}\t${i.rule}\t${i.message}`, `${i.page}:${i.line}:${i.column}`]));
    const detail = added.map(([k, n]) => `  +${n}  ${at.get(k)}  ${k.split('\t').slice(1).join(': ')}`).join('\n');
    expect(added.length, added.length === 0 ? '' :
      `${added.length} new HTML error(s). Fix the generator or the source page — do NOT add them to ` +
      `scripts/html-validate-baseline.txt (node scripts/html-validate.mjs prints them all):\n${detail}`).toBe(0);
  });

  it('the baseline only shrinks — a fixed error must be deleted from it', () => {
    const { stale } = compareToBaseline(countIssues(issues), readBaseline());
    const detail = stale.map(([k, n]) => `  -${n}  ${k.replace(/\t/g, '  ')}`).join('\n');
    expect(stale.length, stale.length === 0 ? '' :
      `${stale.length} baseline line(s) list more errors than the site has. Delete or lower ` +
      `them in scripts/html-validate-baseline.txt:\n${detail}`).toBe(0);
  });

  it('the baseline names only pages that exist', () => {
    const gone = [...new Set([...readBaseline().keys()].map(k => k.split('\t')[0]))]
      .filter(p => !fs.existsSync(path.join(ROOT, p)));
    expect(gone, `baseline names deleted page(s): ${gone.join(', ')}`).toEqual([]);
  });
});

describe('the html check itself is honest', () => {
  const page = (body, head = '') =>
    `<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="utf-8"><title>x</title>${head}</head>\n<body>\n${body}\n</body>\n</html>\n`;
  const rules = async html => (await validateHtml(html)).map(i => i.rule);

  it('a clean page passes — and style-only habits (inline style, trailing space, text/javascript) are not errors', async () => {
    expect(await validateHtml(page(
      '<p style="color:red">x</p>   \n<img src="a.png" alt="a">\n<script type="text/javascript">1</script>',
    ))).toEqual([]);
  });
  it('a second <body> is an error', async () => {
    const r = await validateHtml(page('<p>x</p>').replace('<body>', '<body>\n<body>'));
    expect(r.length).toBeGreaterThan(0);
    expect(r.map(i => i.message).join('\n')).toMatch(/<body>/);
  });
  it('a second <head> is an error', async () => {
    expect(await rules(page('<p>x</p>').replace('</head>', '</head><head><title>y</title></head>')))
      .toContain('element-permitted-occurrences');
  });
  it('a duplicate id is an error', async () => {
    expect(await rules(page('<p id="a">x</p><p id="a">y</p>'))).toContain('no-dup-id');
  });
  it('a stray end tag and an unclosed element are errors', async () => {
    expect(await rules(page('<div>x</div></div>'))).toContain('close-order');
    expect(await rules(page('<div><p>x</div>'))).toContain('no-implicit-close');
  });
  it('an image without alt is an error', async () => {
    expect(await rules(page('<img src="a.png">'))).toContain('wcag/h37');
  });
  it('an invalid attribute value is an error', async () => {
    expect(await rules(page('<input type="nope" aria-label="x">'))).toContain('attribute-allowed-values');
  });
  it('a <style> under <footer> is an error (the footer injector, fixed 2026-11-24)', async () => {
    expect(await rules(page('<footer><style>p{}</style><p>x</p></footer>'))).toContain('element-permitted-content');
  });
});
