// One brand, and the token that is actually ours (2026-09-14).
//
// THE COLLISION, which is the whole reason this file is careful:
// `sql-quest.app` is a DIFFERENT product with our name — "SQLQuest — Master
// SQL Through Detective Investigations", a SQL mobile game on iOS and Android
// (docs/reads/google-position-2026-09-11.md §4). Their name is the no-space
// form. So "SQLQuest" on its own does not distinguish us from them; it is the
// string we share. **`SQLQuest.app` is distinctive and `SQLQuest` is not**,
// and the difference is entirely the ".app". Never drop it from a title or an
// H1 to save characters.
//
// The split these tests enforce:
//   - machine-facing identity (every <title>, the homepage H1, JSON-LD) may
//     use SQLQuest.app, and every page must carry the brand somewhere;
//   - prose stays "SQL Quest", which is readable and is what 81% of our
//     Google clicks already search for.
//
// Measured before the change: 381 titles "… | SQL Quest", 37 "SQL Quest — …",
// and **18 with no brand at all** — the topic, tools and alternatives pages.
// Those eighteen were the real gap, not a second spelling.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUB = path.join(ROOT, 'public');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

function builtPages() {
  const out = [];
  const walk = dir => {
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (f === 'index.html') out.push(p);
    }
  };
  walk(PUB);
  return out.map(p => ({
    file: path.relative(PUB, p),
    title: (fs.readFileSync(p, 'utf8').slice(0, 4000).match(/<title>([^<]*)<\/title>/) || [])[1] || '',
  }));
}

const pages = builtPages();

describe('every page carries the brand', () => {
  it('is not vacuous — there are pages to check', () => {
    expect(pages.length).toBeGreaterThan(400);
  });

  it('no title ships without the name on it', () => {
    const naked = pages.filter(p => !/SQL ?Quest/i.test(p.title)).map(p => `${p.file}: ${p.title}`);
    expect(naked, `titles with no brand:\n${naked.slice(0, 20).join('\n')}`).toEqual([]);
  });

  // 2026-09-14, founder's call: the whole site moved off "| SQL Quest" to the
  // domain form. The readable name survives in prose and in the logo; a TITLE
  // is machine-facing and carries the token that is only ours.
  it('every title uses the domain form', () => {
    const old = pages.filter(p => !/SQLQuest\.app/.test(p.title)).map(p => `${p.file}: ${p.title}`);
    expect(old, `titles still on the shared spelling:\n${old.slice(0, 20).join('\n')}`).toEqual([]);
  });

  it('og:title, twitter:title and og:site_name agree with it', () => {
    const bad = [];
    for (const { file } of pages) {
      const html = fs.readFileSync(path.join(PUB, file), 'utf8').slice(0, 8000);
      for (const m of html.matchAll(/(?:property|name)="(og:title|twitter:title|og:site_name)"\s+content="([^"]*)"/g)) {
        if (/SQL Quest/.test(m[2])) bad.push(`${file} ${m[1]}: ${m[2]}`);
      }
    }
    expect(bad, `social metadata still on the shared spelling:\n${bad.slice(0, 15).join('\n')}`).toEqual([]);
  });

  it('a title that uses the no-space form uses the domain form, never bare "SQLQuest"', () => {
    // Bare "SQLQuest" is the other product's exact name. If a title says it,
    // it must be as SQLQuest.app.
    const bare = pages
      .filter(p => /SQLQuest/.test(p.title) && !/SQLQuest\.app/.test(p.title))
      .map(p => `${p.file}: ${p.title}`);
    expect(bare, `bare "SQLQuest" is the collision string:\n${bare.join('\n')}`).toEqual([]);
  });
});

describe('the homepage claims the distinctive token', () => {
  const home = read('src/index.html');

  it('the title leads with SQLQuest.app', () => {
    const title = (home.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
    expect(title.startsWith('SQLQuest.app')).toBe(true);
  });

  it('the H1 carries it too', () => {
    const h1 = (home.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '';
    expect(h1).toContain('SQLQuest.app');
  });

  it('JSON-LD claims every spelling someone might search', () => {
    for (const form of ['SQLQuest.app', 'SQLQuest', 'sqlquest.app']) {
      expect(home, `alternateName is missing ${form}`).toContain(`"${form}"`);
    }
  });
});

describe('prose keeps the readable form', () => {
  // The body copy of the marketing pages. A generated page is checked through
  // its generator by the tests above; this is about what a reader sees.
  const files = fs.readdirSync(path.join(ROOT, 'src')).filter(f => f.endsWith('.html'));

  it('no page writes bare "SQLQuest" in visible copy', () => {
    const bad = [];
    for (const f of files) {
      const src = read(`src/${f}`)
        // JSON-LD alternateName and the app shell's JS identifier are not prose.
        .replace(/<script[\s\S]*?<\/script>/g, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/SQLQuest\.app/g, '');
      for (const m of src.matchAll(/SQLQuest/g)) {
        bad.push(`src/${f} @${m.index}`);
      }
    }
    expect(bad, `bare "SQLQuest" in prose — the readable form is "SQL Quest":\n${bad.join('\n')}`).toEqual([]);
  });
});
