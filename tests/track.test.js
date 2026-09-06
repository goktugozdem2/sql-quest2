// SQL Quest — landing-source attribution (the AI-assistant channel)
//
// THE DEFECT (measured 2026-09-06)
//
// The only channel that has produced a paying user — an AI assistant
// recommending the site — was invisible: zero arrivals stamped chatgpt /
// perplexity / gemini / copilot / claude in 60 days. ChatGPT appends
// ?utm_source=chatgpt.com and Perplexity sends a referrer, but src/track.js
// persisted nothing, and the app then stamped arrivalSrc='home' from the
// explicit /app/?src=home. Both payers read as 'home'.
//
// What these tests pin:
//   1. src/track.js, evaluated as the real ES5 script in node:vm, persists a
//      FIRST-TOUCH `sqlquest_landing_src` and never overwrites it.
//   2. Same-site referrers store nothing; stored values are labels and
//      hostnames only — never a path or a query string.
//   3. landing_view carries `utm` and `landingSrc`; localhost sends nothing.
//      `utm` on the row is cleaned the same way the persisted key is — the
//      2026-09-06 review caught the row carrying the raw path-and-query
//      value while storage held only the hostname.
//   4. The inline table in track.js and src/utils/landing-src.js cannot
//      drift: the table is parsed out of the file text and compared, and
//      both implementations are run over the same inputs.
//   5. app.jsx stamps `landingSrc` next to arrivalSrc at both metadata
//      sites and leaves the arrivalSrc stamp itself untouched.
//
// Independent of the network by construction: fetch is a stub in the vm
// context, and the vm has no real one.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URLSearchParams } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import {
  LANDING_SRC_KEY,
  LANDING_SRC_TABLE,
  classifyLandingSrc,
  persistLandingSrc,
} from '../src/utils/landing-src.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TRACK_JS = path.resolve(__dirname, '../src/track.js');
const APP_JSX = path.resolve(__dirname, '../src/app.jsx');
const trackSource = readFileSync(TRACK_JS, 'utf8');

const REAL_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';

// Evaluate the real tracker against a stubbed browser. Returns the storage
// it wrote to and every fetch it attempted.
function runTracker({
  hostname = 'sqlquest.app',
  pathname = '/',
  search = '',
  referrer = '',
  store = new Map(),
  userAgent = REAL_UA,
} = {}) {
  const calls = [];
  const ctx = {
    localStorage: {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: k => { store.delete(k); },
    },
    location: { hostname, pathname, search, href: `https://${hostname}${pathname}${search}` },
    document: { referrer, addEventListener() {} },
    navigator: { userAgent, webdriver: false },
    fetch: (url, opts) => {
      calls.push({ url, body: JSON.parse(opts.body), headers: opts.headers });
      return Promise.resolve({ ok: true });
    },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(trackSource, ctx, { filename: 'track.js' });
  return { store, calls, ctx };
}

const landingViewOf = calls => calls.find(c => c.body.event === 'landing_view');
const metaOf = call => JSON.parse(call.body.metadata);

describe('src/track.js — first-touch landing source', () => {
  it('stores ai:chatgpt from ?utm_source=chatgpt.com (what ChatGPT actually appends)', () => {
    const { store } = runTracker({ search: '?utm_source=chatgpt.com' });
    expect(store.get(LANDING_SRC_KEY)).toBe('ai:chatgpt');
  });

  it('stores ai:perplexity from a perplexity.ai referrer with no utm', () => {
    const { store } = runTracker({ referrer: 'https://www.perplexity.ai/search/best-sql-practice-sites-abc123' });
    expect(store.get(LANDING_SRC_KEY)).toBe('ai:perplexity');
  });

  it('never overwrites the first touch — a later visit from elsewhere keeps the original', () => {
    const store = new Map([[LANDING_SRC_KEY, 'ai:chatgpt']]);
    runTracker({ store, referrer: 'https://www.perplexity.ai/' });
    expect(store.get(LANDING_SRC_KEY)).toBe('ai:chatgpt');
    runTracker({ store, search: '?utm_source=newsletter' });
    expect(store.get(LANDING_SRC_KEY)).toBe('ai:chatgpt');
  });

  it('stores nothing for a same-site referrer, an own-host referrer, or no signal at all', () => {
    expect(runTracker({ referrer: 'https://sqlquest.app/sql-exercises/' }).store.has(LANDING_SRC_KEY)).toBe(false);
    expect(runTracker({ referrer: 'https://www.sqlquest.app/' }).store.has(LANDING_SRC_KEY)).toBe(false);
    expect(runTracker({ hostname: 'preview.vercel.app', referrer: 'https://preview.vercel.app/x' }).store.has(LANDING_SRC_KEY)).toBe(false);
    expect(runTracker({ referrer: '' }).store.has(LANDING_SRC_KEY)).toBe(false);
  });

  it('stores hostnames only — a referrer path or query never reaches storage', () => {
    const { store } = runTracker({ referrer: 'https://example.com/some/path?q=my%20prompt#frag' });
    expect(store.get(LANDING_SRC_KEY)).toBe('ref:example.com');
    const utm = runTracker({ search: '?utm_source=some.site/with/path?x=1' }).store.get(LANDING_SRC_KEY);
    expect(utm).toBe('utm:some.site');
    expect(utm).not.toMatch(/[/?#]/);
  });

  it('classifies an unknown utm_source as utm:<value>, lowercased and capped at 40 chars', () => {
    const long = 'MyVeryLongNewsletterCampaignNameThatGoesOnAndOnForever';
    const { store } = runTracker({ search: `?utm_source=${long}&utm_medium=email` });
    expect(store.get(LANDING_SRC_KEY)).toBe('utm:' + long.toLowerCase().slice(0, 40));
  });

  it('prefers the explicit param over the referrer, and utm_source over ref over src', () => {
    expect(runTracker({ search: '?utm_source=chatgpt.com', referrer: 'https://www.google.com/' }).store.get(LANDING_SRC_KEY)).toBe('ai:chatgpt');
    expect(runTracker({ search: '?ref=tina_huang&src=foo' }).store.get(LANDING_SRC_KEY)).toBe('utm:tina_huang');
    expect(runTracker({ search: '?src=copilot' }).store.get(LANDING_SRC_KEY)).toBe('ai:copilot');
  });
});

describe('src/track.js — landing_view row', () => {
  it('carries utm and landingSrc alongside the existing ref', () => {
    const { calls } = runTracker({ search: '?utm_source=chatgpt.com', referrer: 'https://chatgpt.com/' });
    const view = landingViewOf(calls);
    expect(view).toBeTruthy();
    expect(view.body.reason).toBe('landing');
    const meta = metaOf(view);
    expect(meta.landingSrc).toBe('ai:chatgpt');
    expect(meta.utm).toBe('chatgpt.com');
    expect(meta.ref).toBe('https://chatgpt.com/');
    expect(meta.page).toBe('home');
    expect(meta.aid).toMatch(/^[0-9a-f]{32}$/);
  });

  it('reports the FIRST touch on the row, not this view — a returning ChatGPT visitor arriving via Google still reads ai:chatgpt', () => {
    const store = new Map([[LANDING_SRC_KEY, 'ai:chatgpt']]);
    const { calls } = runTracker({ store, referrer: 'https://www.google.com/', pathname: '/sql-exercises/' });
    const meta = metaOf(landingViewOf(calls));
    expect(meta.landingSrc).toBe('ai:chatgpt');
    expect(meta.utm).toBeNull();
    expect(meta.page).toBe('sql-exercises');
  });

  it('cleans utm on the row exactly like the persisted key — never a path, query, scheme or casing', () => {
    // The row-level field is the one place an assistant share URL could
    // smuggle a prompt through: storage was cleaned, the row was not.
    const { store, calls } = runTracker({ search: '?utm_source=some.site/with/path?x=1' });
    const meta = metaOf(landingViewOf(calls));
    expect(meta.utm).toBe('some.site');
    expect(meta.utm).not.toMatch(/[/?#]/);
    expect(store.get(LANDING_SRC_KEY)).toBe('utm:' + meta.utm);

    const shouted = metaOf(landingViewOf(runTracker({ search: '?utm_source=https%3A%2F%2FWWW.ChatGPT.com%2Fshare%2Fabc%3Fq%3Dmy%2520prompt' }).calls));
    expect(shouted.utm).toBe('chatgpt.com');
    expect(shouted.landingSrc).toBe('ai:chatgpt');

    // A cta_* click carries the same cleaned value, so the ordering of
    // persist-then-send does not matter for the row.
    const { ctx, calls: clicks } = runTracker({ search: '?utm_source=some.site/with/path?x=1' });
    ctx.sqTrack('cta_hero_primary', { href: '/app/?src=home' });
    const cta = clicks.find(c => c.body.event === 'cta_hero_primary');
    expect(metaOf(cta).utm).toBe('some.site');
  });

  it('writes null landingSrc and null utm when there is no signal, never "unknown"', () => {
    const meta = metaOf(landingViewOf(runTracker().calls));
    expect(meta.landingSrc).toBeNull();
    expect(meta.utm).toBeNull();
  });

  it('sends nothing on localhost (the mute stays exactly as it was) but still persists locally', () => {
    for (const hostname of ['localhost', '127.0.0.1', '[::1]']) {
      const { calls, store } = runTracker({ hostname, search: '?utm_source=chatgpt.com' });
      expect(calls).toHaveLength(0);
      expect(store.get(LANDING_SRC_KEY)).toBe('ai:chatgpt');
    }
  });

  it('sends nothing for a crawler', () => {
    const { calls } = runTracker({ userAgent: 'Mozilla/5.0 (compatible; Google-InspectionTool/1.0)' });
    expect(calls).toHaveLength(0);
  });
});

describe('src/utils/landing-src.js — classification', () => {
  const cases = [
    // [source, referrer, expected]
    ['chatgpt.com', '', 'ai:chatgpt'],
    ['ChatGPT', '', 'ai:chatgpt'],
    [null, 'https://chat.openai.com/c/abc', 'ai:chatgpt'],
    [null, 'https://www.perplexity.ai/', 'ai:perplexity'],
    [null, 'https://gemini.google.com/app', 'ai:gemini'],
    [null, 'https://bard.google.com/', 'ai:gemini'],
    ['copilot', '', 'ai:copilot'],
    [null, 'https://copilot.microsoft.com/', 'ai:copilot'],
    [null, 'https://www.bing.com/chat?q=x', 'ai:copilot'],
    [null, 'https://www.bing.com/search?q=sql', 'search:bing'],
    [null, 'https://claude.ai/chat/123', 'ai:claude'],
    [null, 'https://www.google.com/', 'search:google'],
    [null, 'https://www.google.co.uk/', 'search:google'],
    [null, 'https://www.google.com.tr/', 'search:google'],
    [null, 'https://mail.google.com/', 'ref:mail.google.com'],
    [null, 'https://duckduckgo.com/?q=sql', 'search:ddg'],
    [null, 'https://old.reddit.com/r/SQL/', 'social:reddit'],
    [null, 'https://www.linkedin.com/feed/', 'social:linkedin'],
    [null, 'https://lnkd.in/abc', 'social:linkedin'],
    [null, 'https://t.co/abc', 'social:x'],
    [null, 'https://x.com/someone/status/1', 'social:x'],
    [null, 'https://twitter.com/someone', 'social:x'],
    [null, 'https://l.facebook.com/l.php?u=x', 'social:facebook'],
    [null, 'https://news.ycombinator.com/item?id=1', 'social:hn'],
    [null, 'https://user:pw@some-blog.example.org:8443/post/1', 'ref:some-blog.example.org'],
    ['newsletter', '', 'utm:newsletter'],
    ['  Some Campaign!  ', '', 'utm:some-campaign'],
    [null, 'https://sqlquest.app/', null],
    [null, 'https://app.sqlquest.app/', null],
    [null, 'not a url', null],
    [null, '', null],
    [null, null, null],
    [null, 'android-app://com.google.android.googlequicksearchbox/', 'ref:com.google.android.googlequicksearchbox'],
  ];

  it.each(cases)('source=%j referrer=%j → %j', (source, referrer, expected) => {
    expect(classifyLandingSrc({ source, referrer, siteHost: 'sqlquest.app' })).toBe(expected);
  });

  it('treats the page\'s own host as same-site (localhost in dev, a preview deployment)', () => {
    expect(classifyLandingSrc({ referrer: 'http://localhost:4321/', siteHost: 'localhost' })).toBeNull();
    expect(classifyLandingSrc({ referrer: 'https://sq-preview.vercel.app/x', siteHost: 'sq-preview.vercel.app' })).toBeNull();
    // ...but the same host seen from production is a real external referrer.
    expect(classifyLandingSrc({ referrer: 'https://sq-preview.vercel.app/x', siteHost: 'sqlquest.app' })).toBe('ref:sq-preview.vercel.app');
  });

  it('persistLandingSrc: first touch wins, null stores nothing, a throwing store is survivable', () => {
    const m = new Map();
    const store = { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) };
    expect(persistLandingSrc(store, null)).toBeNull();
    expect(m.has(LANDING_SRC_KEY)).toBe(false);
    expect(persistLandingSrc(store, 'ai:gemini')).toBe('ai:gemini');
    expect(persistLandingSrc(store, 'ai:chatgpt')).toBe('ai:gemini');
    expect(m.get(LANDING_SRC_KEY)).toBe('ai:gemini');
    const throwing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
    expect(persistLandingSrc(throwing, 'ai:chatgpt')).toBeNull();
  });
});

describe('two copies, one table — track.js and landing-src.js cannot drift', () => {
  it('the LANDING_SRC_TABLE literal inside src/track.js equals the module export', () => {
    const m = /\/\/ LANDING_SRC_TABLE:begin[^\n]*\n\s*var LANDING_SRC_TABLE = (\[[\s\S]*?\n\s*\]);\s*\n\s*\/\/ LANDING_SRC_TABLE:end/.exec(trackSource);
    expect(m, 'track.js must carry the table between the :begin/:end markers').toBeTruthy();
    const inline = vm.runInNewContext(m[1]);
    expect(inline).toEqual(LANDING_SRC_TABLE);
  });

  it('every table label is one of the documented families', () => {
    for (const [, label] of LANDING_SRC_TABLE) {
      expect(label).toMatch(/^(ai|search|social):[a-z]+$/);
    }
    // The five assistants the read named are all reachable.
    const labels = new Set(LANDING_SRC_TABLE.map(r => r[1]));
    for (const ai of ['ai:chatgpt', 'ai:perplexity', 'ai:gemini', 'ai:copilot', 'ai:claude']) {
      expect(labels.has(ai)).toBe(true);
    }
  });

  it('the tracker and the helper classify the same inputs identically', () => {
    const inputs = [
      { search: '?utm_source=chatgpt.com', referrer: '' },
      { search: '?utm_source=copilot', referrer: 'https://www.google.com/' },
      { search: '?utm_source=My%20Campaign%2Fx', referrer: '' },
      { search: '', referrer: 'https://www.perplexity.ai/search/x' },
      { search: '', referrer: 'https://www.bing.com/chat' },
      { search: '', referrer: 'https://www.bing.com/' },
      { search: '', referrer: 'https://www.google.com.tr/' },
      { search: '', referrer: 'https://gemini.google.com/' },
      { search: '', referrer: 'https://old.reddit.com/r/SQL' },
      { search: '', referrer: 'https://some-blog.example.org/p/1?u=2' },
      { search: '', referrer: 'https://sqlquest.app/' },
      { search: '', referrer: 'garbage' },
      { search: '', referrer: '' },
    ];
    for (const { search, referrer } of inputs) {
      const { store } = runTracker({ search, referrer });
      const utm = new URLSearchParams(search).get('utm_source');
      const expected = classifyLandingSrc({ source: utm, referrer, siteHost: 'sqlquest.app' });
      expect(store.get(LANDING_SRC_KEY) ?? null, `search=${search} referrer=${referrer}`).toBe(expected);
    }
  });
});

describe('src/app.jsx — stamps landingSrc next to arrivalSrc, leaves arrivalSrc alone', () => {
  const appSource = readFileSync(APP_JSX, 'utf8');

  it('imports the shared helper and stamps the key at module load when /app/ is the first touch', () => {
    expect(appSource).toMatch(/import \{ classifyLandingSrc, LANDING_SRC_KEY \} from '\.\/utils\/landing-src\.js';/);
    expect(appSource).toMatch(/if \(!localStorage\.getItem\(LANDING_SRC_KEY\)\) \{/);
    expect(appSource).toMatch(/localStorage\.setItem\(LANDING_SRC_KEY, String\(landingSrc\)\.slice\(0, 64\)\)/);
  });

  it('feeds the app-side classifier utm_source and the referrer only — not the ?src door, not the ?ref code', () => {
    const block = /classifyLandingSrc\(\{([\s\S]*?)\}\)/.exec(appSource);
    expect(block).toBeTruthy();
    expect(block[1]).toMatch(/source: params\.get\('utm_source'\)/);
    expect(block[1]).toMatch(/referrer: document\.referrer/);
    expect(block[1]).not.toMatch(/params\.get\('src'\)|params\.get\('ref'\)/);
  });

  it('every metadata site that reads sqlquest_arrival_src also carries landingSrc', () => {
    const readers = appSource.split('\n')
      .map((line, i) => ({ line, n: i + 1 }))
      .filter(({ line }) => /arrivalSrc:.*sqlquest_arrival_src/.test(line));
    expect(readers.length).toBeGreaterThanOrEqual(2);
    const lines = appSource.split('\n');
    for (const { n } of readers) {
      // landingSrc sits within the next dozen lines of the same object literal.
      const window = lines.slice(n, n + 14).join('\n');
      expect(window, `no landingSrc near the arrivalSrc read at app.jsx:${n}`).toMatch(/landingSrc: .*LANDING_SRC_KEY/);
    }
  });

  it('the arrivalSrc first-touch stamp is unchanged — the home door keeps its meaning', () => {
    expect(appSource).toContain("if (!localStorage.getItem('sqlquest_arrival_src')) {");
    expect(appSource).toContain("const explicitSrc = params.get('src') || params.get('utm_source');");
    expect(appSource).toContain("const arrivalSrc = explicitSrc || derivedSrc || referrerSrc;");
    expect(appSource).toContain("localStorage.setItem('sqlquest_arrival_src', String(arrivalSrc).slice(0, 64));");
    // arrivalSrc is never derived from the landing key, and vice versa.
    expect(appSource).not.toMatch(/sqlquest_arrival_src'[^\n]*LANDING_SRC_KEY|LANDING_SRC_KEY[^\n]*sqlquest_arrival_src/);
  });
});
