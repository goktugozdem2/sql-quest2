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
export const FOOTER_FIT_STYLE =
  '<style data-footer-fit>@media(max-width:600px){.flk{row-gap:0}.flk a{display:inline-flex;align-items:center;justify-content:center;min-height:44px;min-width:44px;padding:0 4px}.fnav a{display:flex;align-items:center;min-height:44px;padding:0}}</style>';

// Links in running text (A4, Lighthouse a11y 2026-11-25): axe's
// link-in-text-block failed on 92 pages. The purple link (#c084fc) sits at
// 1.03:1 against the grey body text around it, so colour was the only cue.
// Every unclassed link inside a paragraph, list item or table cell, and every
// bare link in a `footer.ft` row, gets an underline. Classed links (buttons:
// .bp, .bo, .btn …) and anything inside <nav> or <header> keep their look; a
// card or pill link carries an inline `text-decoration:none`, which still
// wins. No colour changes, so nothing new enters the palette. Same reason as
// the footer fit for living here: the pages are not one template.
export const LINK_CUE_STYLE =
  '<style data-link-cue>:is(p,li,dd,td,blockquote,figcaption)>a:not([class]):not(nav *):not(header *),footer.ft>a:not([class]){text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px}</style>';

// The product shell and its legacy alias are not marketing pages.
const SKIP = new Set(['app.html', 'app/index.html']);

export function withPartnerLink(html) {
  // A page built before this version carries an older line (or no footer
  // fit, or no link cue): replace it in place, so a committed public/ page
  // never keeps it.
  const want = LINK_CUE_STYLE + FOOTER_FIT_STYLE + PARTNER_LINE;
  const old = html.match(/(?:<style data-link-cue>[\s\S]*?<\/style>)?(?:<style data-footer-fit>[\s\S]*?<\/style>)?<p data-partner="datrick"[\s\S]*?<\/p>/);
  if (old) return old[0] === want ? html : html.replace(old[0], want);
  const i = html.lastIndexOf('</footer>');
  if (i === -1) return html;
  return html.slice(0, i) + want + html.slice(i);
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
