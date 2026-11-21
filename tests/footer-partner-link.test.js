// The Datrick link in the footer (founder, 2026-11-20): one line before
// </footer> on every built marketing page, never on /app, added once.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { withPartnerLink, PARTNER_URL } from '../scripts/footer-partner-link.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUB = path.join(ROOT, 'public');

function* htmlFiles(dir, rel = '') {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const r = rel ? `${rel}/${d.name}` : d.name;
    if (d.isDirectory()) { if (r !== 'weekly') yield* htmlFiles(path.join(dir, d.name), r); }
    else if (d.name.endsWith('.html')) yield r;
  }
}

describe('Datrick footer link', () => {
  it('every built page with a footer carries exactly one link to the migration page, inside the footer', () => {
    let pages = 0;
    for (const rel of htmlFiles(PUB)) {
      if (rel === 'app.html' || rel.startsWith('app/')) continue;
      // The weekly pages are date-stamped and never committed (CLAUDE.md), so
      // the committed copy is whatever an older build left; the build adds the
      // line to them like every other page.
      if (rel === 'weekly.html') continue;
      const html = fs.readFileSync(path.join(PUB, rel), 'utf8');
      if (!html.includes('</footer>')) continue;
      pages++;
      const hits = html.split(`href="${PARTNER_URL}"`).length - 1;
      expect(hits, rel).toBe(1);
      const at = html.indexOf(`href="${PARTNER_URL}"`);
      expect(html.lastIndexOf('<footer', at), rel).toBeGreaterThan(-1);
      expect(html.indexOf('</footer>', at), rel).toBeGreaterThan(at);
    }
    expect(pages).toBeGreaterThan(400);
  });

  it('never on the app', () => {
    for (const f of ['app.html', 'app/index.html']) {
      const p = path.join(PUB, f);
      if (fs.existsSync(p)) expect(fs.readFileSync(p, 'utf8'), f).not.toContain(PARTNER_URL);
    }
  });

  it('is idempotent, needs a footer, and adds no colour of its own', () => {
    const page = '<body><footer><p>x</p></footer></body>';
    const once = withPartnerLink(page);
    expect(withPartnerLink(once)).toBe(once);
    expect(withPartnerLink('<body>no footer</body>')).toBe('<body>no footer</body>');
    expect(once).not.toMatch(/#[0-9a-f]{3,6}/i);
  });

  it('runs in the build after every page generator', () => {
    const build = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts.build;
    const at = build.indexOf('footer-partner-link');
    expect(at).toBeGreaterThan(build.indexOf('build-question-pages'));
    expect(at).toBeGreaterThan(build.indexOf('build-static-pages'));
    // /weekly/ is built on demand (2026-11-22): its own script runs the
    // footer after it, so a refreshed archive carries the link too.
    const weekly = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts['build:weekly'];
    expect(weekly.indexOf('footer-partner-link')).toBeGreaterThan(weekly.indexOf('build-weekly'));
    expect(build, 'the date-stamped weekly pages stay out of the everyday build').not.toMatch(/build-weekly/);
  });
});
