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
