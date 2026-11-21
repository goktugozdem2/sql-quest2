// React loads from unpkg with an exact version (2026-10-13). A range URL
// (`react@18`) answers with a redirect to the resolved version, which a CDN
// caches only briefly, so every cold visitor paid one more round trip before
// the app could boot. The smoke runs of 10-10 (deeplink_session, the app still
// on its loading screen) and 10-12 (interactive, shell at 9,969 ms against a
// usual 643-1,999 ms) both missed their window on a slow boot. The pin is the
// version the tests run against (node_modules), so local and live React agree.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = new URL('../', import.meta.url).pathname;
const html = fs.readFileSync(ROOT + 'src/app.html', 'utf8');

describe('React loads from an exact version, the one the tests run on', () => {
  for (const pkg of ['react', 'react-dom']) {
    it(`${pkg}: every unpkg URL is ${pkg}@<installed version>, never a range`, () => {
      const version = require(`${pkg}/package.json`).version;
      const urls = [...html.matchAll(new RegExp(`https://unpkg\\.com/${pkg}@([^/"]+)/`, 'g'))].map(m => m[1]);
      expect(urls.length, `${pkg} preload + script`).toBe(2);
      for (const v of urls) expect(v).toBe(version);
    });
  }
});

// 2026-11-22: every third-party file the app boots on is pinned to an exact
// version AND carries Subresource Integrity. Before this, lucide loaded as
// `lucide@latest` and supabase-js as `@2` — any publish of either changed
// the code every visitor ran, and a CDN compromise of any of the sixteen
// files would have run in the page that holds the session. With SRI the
// browser refuses bytes that differ from the hash. To bump a version: change
// the URL, recompute (openssl dgst -sha384 -binary | openssl base64 -A),
// and change the hash — a preload must carry the same hash as its script.
// .js / .css only: the sql.js .wasm preload is fetched by sql.js itself,
// which cannot pass a hash — its loader script carries one instead.
const CDN = /https:\/\/(?:unpkg\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net)\/[^"]+\.(?:js|css)(?=")/;
const tags = [...html.matchAll(/<(?:script|link)\b[^>]*>/g)].map(m => m[0]).filter(t => CDN.test(t));
const urlOf = t => t.match(CDN)[0];

describe('every CDN file is an exact version with Subresource Integrity', () => {
  it('there are CDN tags to check (not vacuous)', () => {
    expect(tags.length).toBeGreaterThanOrEqual(16);
  });

  it('no URL names a moving version (@latest, @2, @18)', () => {
    // Every URL on a CDN host, not only the .js/.css ones — a bare package
    // URL (`/npm/@supabase/supabase-js@2`) has no extension at all.
    const all = [...html.matchAll(/https:\/\/(?:unpkg\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net)\/[^"\s]+/g)].map(m => m[0]);
    const moving = all.filter(u => /@latest\b/.test(u) || /@\d+(?:\.\d+)?(?=\/|$)/.test(u) || /\/npm\/(?:@[^/]+\/)?[^/@]+@[^/]+$/.test(u));
    expect(moving).toEqual([]);
  });

  it('every tag carries a sha384 integrity and crossorigin="anonymous"', () => {
    const bad = tags.filter(t => !/\bintegrity="sha384-[A-Za-z0-9+/]{64}"/.test(t) || !/\bcrossorigin="anonymous"/.test(t));
    expect(bad).toEqual([]);
  });

  it('a preload carries the same hash as the tag that uses it', () => {
    const hash = t => t.match(/integrity="([^"]+)"/)[1];
    for (const pre of tags.filter(t => /rel="preload"/.test(t))) {
      const user = tags.find(t => t !== pre && urlOf(t) === urlOf(pre));
      expect(user, urlOf(pre)).toBeTruthy();
      expect(hash(user), urlOf(pre)).toBe(hash(pre));
    }
  });

  it("the app's dynamic sql.js loader carries its own integrity", () => {
    const app = fs.readFileSync(ROOT + 'src/app.jsx', 'utf8');
    const at = app.indexOf("script.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js'");
    expect(at).toBeGreaterThan(0);
    expect(app.slice(at, at + 400)).toMatch(/script\.integrity = 'sha384-[A-Za-z0-9+/]{64}'/);
    expect(app.slice(at, at + 400)).toMatch(/script\.crossOrigin = 'anonymous'/);
  });
});
