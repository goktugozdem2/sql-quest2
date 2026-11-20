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
export const PARTNER_LINE =
  `<p data-partner="datrick" style="margin:18px auto 0;max-width:1000px;padding:0 24px;font-size:12px;opacity:.55;text-align:center;">` +
  `SQL Quest is built by Datrick, Inc. · <a href="${PARTNER_URL}" style="color:inherit;text-decoration:underline;">SQL Server to PostgreSQL migration</a></p>`;

// The product shell and its legacy alias are not marketing pages.
const SKIP = new Set(['app.html', 'app/index.html']);

export function withPartnerLink(html) {
  if (html.includes('data-partner="datrick"')) return html;
  const i = html.lastIndexOf('</footer>');
  if (i === -1) return html;
  return html.slice(0, i) + PARTNER_LINE + html.slice(i);
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
    fs.writeFileSync(file, out);
    added++;
  }
  return { added, already, noFooter };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = applyPartnerLink();
  console.log(`[footer-partner-link] added ${r.added}, already ${r.already}, no footer ${r.noFooter}`);
}
