// One stylesheet of layout fixes on every built marketing page (A4 UI/UX
// audit, 2026-11-22). The pages are not one template — ~70 hand-written
// files and nine generators, each with its own <style> — so a fix that
// belongs to all of them is added here, once, after every page exists,
// the way footer-partner-link.mjs adds the footer line.
//
// What it fixes (each measured by `npm run uiux`, baseline 2026-11-22):
// (The nav button's colour is fixed at its source instead — see
// tests/uiux-nav.test.js — because the pages' `.bp` is not one colour.)
// - Nav links and buttons under 44 px tall on a phone (U3: the brand link
//   36 px, "Start Free →" 38 px, on ~59 pages), and the outline button
//   `.btn.bo` at 42 px everywhere. Sizes only; nothing hides or shows.
//
// Idempotent (marker `data-phone-fit`), never on /app (the product), and
// /weekly/ is left to its deliberate `npm run build:weekly`, which runs this
// step too.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const PHONE_FIT_STYLE =
  '<style data-phone-fit>' +
  '.btn.bo{min-height:44px}' +
  '@media(max-width:600px){.ni a,.ni .bp,.nl .btn{min-height:44px}}' +
  '</style>';

const SKIP = new Set(['app.html', 'app/index.html']);

export function withPhoneFit(html) {
  const old = html.match(/<style data-phone-fit>[\s\S]*?<\/style>/);
  if (old) return old[0] === PHONE_FIT_STYLE ? html : html.replace(old[0], PHONE_FIT_STYLE);
  const i = html.indexOf('</head>');
  if (i === -1) return html;
  return html.slice(0, i) + PHONE_FIT_STYLE + html.slice(i);
}

function* htmlFiles(dir, rel = '') {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const r = rel ? `${rel}/${d.name}` : d.name;
    if (d.isDirectory()) yield* htmlFiles(path.join(dir, d.name), r);
    else if (d.name.endsWith('.html')) yield r;
  }
}

export function applyPhoneFit(publicDir = path.join(ROOT, 'public'), { weekly = false } = {}) {
  let added = 0, same = 0;
  for (const rel of htmlFiles(publicDir)) {
    if (SKIP.has(rel)) continue;
    if (!weekly && (rel === 'weekly.html' || rel.startsWith('weekly/'))) continue;
    const file = path.join(publicDir, rel);
    const html = fs.readFileSync(file, 'utf8');
    const out = withPhoneFit(html);
    if (out === html) { same++; continue; }
    fs.writeFileSync(file, out);
    added++;
  }
  return { added, same };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = applyPhoneFit(undefined, { weekly: process.argv.includes('--weekly') });
  console.log(`[phone-fit] written ${r.added}, unchanged ${r.same}`);
}
