// Footer link to Datrick on every built marketing page (founder, 2026-11-20).
//
// SQL Quest is built by Datrick, Inc. (the legal name on Stripe and the
// policies). The founder asked for one link in the SQL Quest footer to
// Datrick's SQL Server → PostgreSQL migration page.
//
// The footers are not one template: ~70 hand-written pages, nine generators,
// some writing into src/ and some (the 307 question pages) straight into
// public/. So this runs as a build step AFTER every page exists and walks
// public/**: it adds one line just before </footer>, once (marker
// `data-partner="datrick"`), and never touches /app (the product, not a
// marketing page). No new colour: the line inherits the footer's own muted
// text and link colours.
//
// Undo: drop this step from `npm run build` and rebuild.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const PARTNER_URL = 'https://datrick.com/sql-server-to-postgresql-migration';
// Colour (A4 UI/UX audit, 2026-11-22): the line used to inherit the footer's
// text at opacity .55. Where a footer's text is the slate grey (#7f8da1 —
// every blog post and question page) that painted 2.50:1 on the page, under
// WCAG AA on 55 pages. It now takes DESIGN.md's --text-muted, #8A8E99, at
// full opacity: 5.9:1 on the near-black, still quieter than the links.
export const FOOTER_MUTED = '#8A8E99';
export const PARTNER_LINE =
  `<p data-partner="datrick" style="margin:18px auto 0;max-width:1000px;padding:0 24px;font-size:12px;color:${FOOTER_MUTED};text-align:center;">` +
  `SQL Quest is built by Datrick, Inc. · <a href="${PARTNER_URL}" style="color:inherit;text-decoration:underline;">SQL Server to PostgreSQL migration</a></p>`;

// Footer links on a phone (same audit): `.flk a` rendered 17 px tall on 60
// pages — under the 44 px tap target (the homepage sitemap footer, .fnav, too).
// One rule for every page, here, because
// the footers are not one template. Phones only; desktop is unchanged.
// Extended 2026-11-23 (A2 live QA): the homepage's `.flegal` links
// (Privacy, Terms, Refund) were 17 px tall and the Datrick link on this
// line 28–35 px on every page; both get the same 44 px box.
export const FOOTER_FIT_STYLE =
  '<style data-footer-fit>@media(max-width:600px){.flk{row-gap:0}.flk a{display:inline-flex;align-items:center;justify-content:center;min-height:44px;min-width:44px;padding:0 4px}.fnav a{display:flex;align-items:center;min-height:44px;padding:0}.flegal a{display:inline-flex;align-items:center;justify-content:center;min-height:44px;min-width:44px}[data-partner] a{display:inline-flex;align-items:center;min-height:44px}}</style>';

// The product shell and its legacy alias are not marketing pages.
const SKIP = new Set(['app.html', 'app/index.html']);

// The fit rule goes in <head>, never in the footer (html-validate, 2026-11-24):
// a <style> under <footer> is not permitted content in HTML, and it was the
// one error on 508 of the 515 built pages. Browsers applied it anyway; the
// rule's text and its place at the END of <head> (after every page style
// that sets .flk/.fnav) keep the cascade it had.
const FIT_RE = /<style data-footer-fit>[\s\S]*?<\/style>/g;

function withFitInHead(html) {
  const head = html.indexOf('</head>');
  if (head === -1) return html;
  const inHead = [...html.matchAll(FIT_RE)].find(m => m.index < head);
  if (inHead) {
    // Already in the head: keep its place (later build steps append their
    // own <style> before </head>), refresh its text, drop any body copy.
    const before = html.slice(0, inHead.index) + FOOTER_FIT_STYLE;
    return before + html.slice(inHead.index + inHead[0].length).replace(FIT_RE, '');
  }
  const out = html.replace(FIT_RE, '');
  const i = out.indexOf('</head>');
  return out.slice(0, i) + FOOTER_FIT_STYLE + out.slice(i);
}

export function withPartnerLink(html) {
  // A page built before this version carries an older line (or the fit rule
  // inside its footer): replace it in place, so a committed public/ page
  // never keeps it.
  const old = html.match(/<p data-partner="datrick"[\s\S]*?<\/p>/);
  let out;
  if (old) out = old[0] === PARTNER_LINE ? html : html.replace(old[0], PARTNER_LINE);
  else {
    const i = html.lastIndexOf('</footer>');
    if (i === -1) return html;
    out = html.slice(0, i) + PARTNER_LINE + html.slice(i);
  }
  return withFitInHead(out);
}

function* htmlFiles(dir, rel = '') {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const r = rel ? `${rel}/${d.name}` : d.name;
    if (d.isDirectory()) yield* htmlFiles(path.join(dir, d.name), r);
    else if (d.name.endsWith('.html')) yield r;
  }
}

export function applyPartnerLink(publicDir = path.join(ROOT, 'public')) {
  let added = 0, already = 0, noFooter = 0;
  for (const rel of htmlFiles(publicDir)) {
    if (SKIP.has(rel)) continue;
    const file = path.join(publicDir, rel);
    const html = fs.readFileSync(file, 'utf8');
    const out = withPartnerLink(html);
    if (out === html) { html.includes('data-partner="datrick"') ? already++ : noFooter++; continue; }
    if (html.includes('data-partner="datrick"')) {
      // /weekly/ is committed only after a deliberate `npm run build:weekly`
      // (CLAUDE.md), which builds it fresh; a plain build leaves it alone.
      if (rel === 'weekly.html' || rel.startsWith('weekly/')) { already++; continue; }
      already++;
    } else added++;
    fs.writeFileSync(file, out);
  }
  return { added, already, noFooter };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = applyPartnerLink();
  console.log(`[footer-partner-link] added ${r.added}, already ${r.already}, no footer ${r.noFooter}`);
}
