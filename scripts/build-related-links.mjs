/**
 * Related links — contextual internal links for thinly linked pages
 * (C1, 2026-11-22).
 *
 * CLAUDE.md, "Search-engine indexing": on a domain with this little authority
 * a page with few internal links does not get crawled, whatever the sitemap
 * says. scripts/seo/inbound-links.mjs counts, for every sitemap URL, the
 * distinct built pages that link to it in their own content (nav, footer and
 * the footer link strips removed). The 2026-11-22 count found:
 *   /weekly/ 0 · /datalemur-karsilastirma/ 0 · /stratascratch-alternatives/ 2
 *   and six more pages linked from only one or two non-question pages
 *   (/learn-sql-for-beginners/, /after-bootcamp/, /after-the-sql-course/,
 *   /sql-for-the-ai-era/, /blog/validate-ai-generated-sql/,
 *   /challenges/string-functions/), plus the four newer fintech company pages
 *   (PayPal, Coinbase, Chime, Monzo) and /sql-rollup-interview-questions/,
 *   reached mostly from each other and from /questions/.
 * Before → after: docs/reads/internal-links-2026-11-22.md.
 *
 * Each entry below is a SOURCE page and the links it gains, written as one
 * short line in the page's own language, placed right before its <footer>
 * between `related-links:start/end` markers. The block is rewritten on every
 * build, so edit this registry, never the block. Every target must be a
 * sitemap page and relevant to the source; tests/internal-links.test.js
 * checks both and fails a sitemap page (outside /questions/) that fewer than
 * two pages link to.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const START = '<!-- related-links:start -->';
export const END = '<!-- related-links:end -->';

/** source file (under src/) → { lang, lead, links: [[href, text], …] } */
export const RELATED = {
  'challenges/index.html': { lead: 'Also practise', links: [
    ['/weekly/', 'this week\'s SQL challenge'],
    ['/learn-sql-for-beginners/', 'SQL for complete beginners'],
    ['/sql-rollup-interview-questions/', 'ROLLUP and GROUPING SETS interview questions'],
  ] },
  'sql-quiz.html': { lead: 'Next', links: [
    ['/weekly/', 'try this week\'s SQL challenge'],
    ['/learn-sql-for-beginners/', 'start from zero with SQL for beginners'],
  ] },
  'blog/index.html': { lead: 'More to read and practise', links: [
    ['/weekly/', 'the weekly SQL challenge'],
    ['/sql-for-the-ai-era/', 'SQL for the AI era'],
    ['/blog/validate-ai-generated-sql/', 'how to check AI-generated SQL'],
  ] },
  // Not src/sql-tools.html: build-sql-tools.mjs writes that page whole and
  // tests/sql-tools.test.js pins it to the generator's output.
  'blog/sql-for-ai-company-interviews.html': { lead: 'Checking SQL an assistant wrote?', links: [
    ['/blog/validate-ai-generated-sql/', 'how to validate AI-generated SQL'],
    ['/sql-for-the-ai-era/', 'why SQL still matters in the AI era'],
  ] },
  'sql-tutorial.html': { lead: 'Where to go from here', links: [
    ['/learn-sql-for-beginners/', 'SQL for complete beginners'],
    ['/challenges/string-functions/', 'string function exercises'],
    ['/after-the-sql-course/', 'finished a SQL course? what to practise next'],
  ] },
  'learn-sql-for-beginners.html': { lead: 'Already past the basics', links: [
    ['/after-the-sql-course/', 'after the SQL course: what to practise next'],
    ['/after-bootcamp/', 'after a data bootcamp: interview-ready SQL'],
  ] },
  'best-sql-practice-sites.html': { lead: 'Compare in detail', links: [
    ['/datalemur-alternatives/', 'DataLemur alternatives'],
    ['/stratascratch-alternatives/', 'StrataScratch alternatives'],
    ['/after-the-sql-course/', 'after a SQL course'],
    ['/after-bootcamp/', 'after a data bootcamp'],
  ] },
  'vs-stratascratch.html': { lead: 'Weighing more than two options', links: [
    ['/stratascratch-alternatives/', 'every StrataScratch alternative, side by side'],
  ] },
  'vs-datalemur.html': { lead: 'Weighing more than two options', links: [
    ['/datalemur-alternatives/', 'every DataLemur alternative, side by side'],
    ['/datalemur-karsilastirma/', 'bu karşılaştırma Türkçe'],
  ] },
  'sql-cheat-sheet.html': { lead: 'Practise what is on this sheet', links: [
    ['/challenges/string-functions/', 'string function exercises'],
    ['/sql-rollup-interview-questions/', 'ROLLUP and GROUPING SETS questions'],
  ] },
  'blog/sql-group-by-tutorial.html': { lead: 'One step past GROUP BY', links: [
    ['/sql-rollup-interview-questions/', 'ROLLUP and GROUPING SETS interview questions'],
  ] },
  'fraud-analytics-sql.html': { lead: 'Fintech company guides', links: [
    ['/paypal-sql-interview/', 'PayPal'],
    ['/coinbase-sql-interview/', 'Coinbase'],
    ['/chime-sql-interview/', 'Chime'],
    ['/monzo-sql-interview/', 'Monzo'],
  ] },
  'blog/sql-for-fraud-analytics.html': { lead: 'Practise it for a fintech interview', links: [
    ['/fraud-analytics-sql/', 'fraud analytics SQL exercises'],
    ['/paypal-sql-interview/', 'PayPal'],
    ['/coinbase-sql-interview/', 'Coinbase'],
    ['/chime-sql-interview/', 'Chime'],
    ['/monzo-sql-interview/', 'Monzo'],
  ] },
  'turkce-sql-ogren.html': { lead: 'Karşılaştırma', links: [
    ['/datalemur-karsilastirma/', 'SQL Quest ve DataLemur, Türkçe karşılaştırma'],
  ] },
  'blog/sql-join-nedir.html': { lead: 'Hangi platformda çalışmalı', links: [
    ['/datalemur-karsilastirma/', 'SQL Quest ve DataLemur karşılaştırması'],
  ] },
  'blog/sql-cte-nedir.html': { lead: 'Hangi platformda çalışmalı', links: [
    ['/datalemur-karsilastirma/', 'SQL Quest ve DataLemur karşılaştırması'],
  ] },
  // /for-teams/ (published 2026-11-22, #188): the two pages written for
  // bootcamp and course graduates are the ones their instructors read.
  'after-bootcamp.html': { lead: 'Teaching a data cohort', links: [
    ['/for-teams/', 'SQL interview practice for your whole cohort'],
  ] },
  'after-the-sql-course.html': { lead: 'Running a SQL course', links: [
    ['/for-teams/', 'seats for your students'],
  ] },
};

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function block({ lead, links }) {
  const a = links.map(([href, text]) => `<a href="${href}" style="color:#c084fc;text-decoration:none;font-weight:600;">${esc(text)}</a>`).join(' · ');
  return `${START}
<p data-crosslink="related" style="max-width:760px;margin:32px auto;padding:0 20px;font-size:14px;line-height:1.8;color:#94a3b8;">${esc(lead)}: ${a}.</p>
${END}`;
}

/** Insert or replace the block in a page, right before its first <footer. */
export function withRelated(html, entry) {
  const a = html.indexOf(START);
  if (a >= 0) {
    const b = html.indexOf(END, a);
    if (b < 0) throw new Error('related-links: start marker without end marker');
    return html.slice(0, a) + block(entry) + html.slice(b + END.length);
  }
  const f = html.indexOf('<footer');
  if (f < 0) throw new Error('related-links: page has no <footer> to anchor on');
  return `${html.slice(0, f)}${block(entry)}\n${html.slice(f)}`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let changed = 0;
  for (const [rel, entry] of Object.entries(RELATED)) {
    const file = path.join(ROOT, 'src', rel);
    const before = fs.readFileSync(file, 'utf8');
    const after = withRelated(before, entry);
    if (after !== before) { fs.writeFileSync(file, after); changed++; }
  }
  console.log(`related-links: ${Object.keys(RELATED).length} pages, ${changed} changed`);
}
