// The Bing Webmaster Tools pipeline (2026-10-01): client, fetch, inspect,
// submit, report, the workflow and the migration. No network: every call
// goes through a fake fetch built from the API's documented JSON samples.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { bingCall, parseBingDate, readKey, BING_SITE, BING_API } from '../scripts/bing/api.mjs';
import { toStatRecord, toSiteRecord, toCrawlRecord, dedupe, topPages, run as runFetch } from '../scripts/bing/fetch.mjs';
import { parseSitemapEntries, pickBatch, toUrlStatus, classify, summarize, renderReport, run as runInspect, DAILY_LIMIT, MIN_INTERVAL_MS, CONCURRENCY } from '../scripts/bing/inspect.mjs';
import { allowance, pickSubmissions, run as runSubmit, COOLDOWN_DAYS, MAX_PER_RUN, STATUS_MAX_AGE_DAYS } from '../scripts/bing/submit.mjs';
import { parseSubmissionLog } from '../scripts/bing/seed-submissions.mjs';
import { weeks, aggregate, buildReport, renderMarkdown, DOOR } from '../scripts/bing/report.mjs';

const KEY = 'abcdef0123456789abcdef0123456789';
const res = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) });
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
// "/Date(ms-0700)/" for a calendar day in the API's zone (midnight Pacific).
const bingDay = (day) => `/Date(${Date.parse(`${day}T07:00:00Z`)}-0700)/`;

describe('the client', () => {
  it('the site is the https URL with its slash; the endpoint is the JSON one', () => {
    expect(BING_SITE).toBe('https://sqlquest.app/');
    expect(BING_API).toBe('https://ssl.bing.com/webmaster/api.svc/json');
  });

  it('reads the key from the environment only', () => {
    expect(() => readKey({})).toThrow(/BING_WMT_KEY is not set/);
    expect(() => readKey({ BING_WMT_KEY: 'has spaces and !' })).toThrow(/does not look like/);
    expect(readKey({ BING_WMT_KEY: ` ${KEY}\n` })).toBe(KEY);
  });

  it('a WCF date is read as the day in the offset it carries, not the UTC day', () => {
    // 2011-09-16 00:00 at -0700 is the sample in the API reference.
    expect(parseBingDate('/Date(1316156400000-0700)/')).toEqual({ at: '2011-09-16T07:00:00.000Z', date: '2011-09-16' });
    // 23:30 Pacific is already the next day in UTC — the bucket is still the Pacific day.
    expect(parseBingDate(`/Date(${Date.parse('2026-09-28T06:30:00Z')}-0700)/`).date).toBe('2026-09-27');
    // What the live API sends: midnight UTC, no offset (2026-09-28).
    expect(parseBingDate('/Date(1790553600000)/')).toEqual({ at: '2026-09-28T00:00:00.000Z', date: '2026-09-28' });
  });

  it("WCF's empty date and a missing value are null", () => {
    expect(parseBingDate('/Date(-62135568000000)/')).toBeNull();
    expect(parseBingDate(null)).toBeNull();
    expect(parseBingDate('2026-09-01')).toBeNull();
  });

  it('GET puts the parameters and the key in the query and unwraps d', async () => {
    let seen = null;
    const d = await bingCall('GetUrlInfo', { key: KEY, params: { siteUrl: BING_SITE, url: 'https://sqlquest.app/sql-exercises/' }, fetchImpl: async (u, o) => { seen = { u, o }; return res(200, { d: { HttpStatus: 200 } }); } });
    expect(d).toEqual({ HttpStatus: 200 });
    const url = new URL(seen.u);
    expect(url.pathname).toBe('/webmaster/api.svc/json/GetUrlInfo');
    expect(url.searchParams.get('siteUrl')).toBe(BING_SITE);
    expect(url.searchParams.get('url')).toBe('https://sqlquest.app/sql-exercises/');
    expect(url.searchParams.get('apikey')).toBe(KEY);
    expect(seen.o.method).toBe('GET');
  });

  it('the documented JSON-quoted form quotes every string but siteUrl', async () => {
    let seen = null;
    await bingCall('GetUrlInfo', { key: KEY, quote: true, params: { siteUrl: BING_SITE, url: 'https://sqlquest.app/' }, fetchImpl: async (u) => { seen = new URL(u); return res(200, { d: null }); } });
    expect(seen.searchParams.get('url')).toBe('"https://sqlquest.app/"');
    expect(seen.searchParams.get('siteUrl')).toBe(BING_SITE);
  });

  it('POST sends the body as JSON and only the key in the query', async () => {
    let seen = null;
    await bingCall('SubmitUrlBatch', { key: KEY, body: { siteUrl: BING_SITE, urlList: ['https://sqlquest.app/a/'] }, fetchImpl: async (u, o) => { seen = { u, o }; return res(200, { d: null }); } });
    expect(seen.o.method).toBe('POST');
    expect(JSON.parse(seen.o.body)).toEqual({ siteUrl: BING_SITE, urlList: ['https://sqlquest.app/a/'] });
    expect([...new URL(seen.u).searchParams.keys()]).toEqual(['apikey']);
  });

  it("an API refusal carries Bing's message and never the key, even when the body echoes it", async () => {
    const err = await bingCall('GetQueryStats', { key: KEY, params: { siteUrl: BING_SITE }, fetchImpl: async () => res(400, { ErrorCode: 3, Message: `InvalidApiKey ${KEY}` }) }).catch(e => e);
    expect(err.message).toBe('Bing GetQueryStats → HTTP 400: InvalidApiKey [key]');
    expect(err.code).toBe(3);
    expect(err.message).not.toContain(KEY);
    expect(err.message).not.toContain('apikey');
  });

  it('retries 429 and 5xx, fails at once on 400', async () => {
    const real = globalThis.setTimeout;
    globalThis.setTimeout = (fn) => real(fn, 0);
    try {
      let calls = 0;
      const flaky = async () => (++calls < 3 ? res(calls === 1 ? 429 : 503, '') : res(200, { d: [1] }));
      expect(await bingCall('GetCrawlStats', { key: KEY, fetchImpl: flaky })).toEqual([1]);
      expect(calls).toBe(3);
      let n = 0;
      await bingCall('GetCrawlStats', { key: KEY, fetchImpl: async () => { n++; return res(400, { ErrorCode: 14, Message: 'NotAuthorized' }); } }).catch(() => {});
      expect(n).toBe(1);
    } finally { globalThis.setTimeout = real; }
  });
});

const realSetTimeout = globalThis.setTimeout;
const fast = async (fn) => { globalThis.setTimeout = (f) => realSetTimeout(f, 0); try { return await fn(); } finally { globalThis.setTimeout = realSetTimeout; } };
const throttle = () => res(400, { ErrorCode: 16, Message: 'ERROR!!! ThrottleHost' });

describe('the throttle', () => {

  it('Bing throttles with a 400, and that one 400 is waited out', async () => {
    let calls = 0;
    const waits = [];
    const out = await fast(() => bingCall('GetUrlInfo', { key: KEY, log: (m) => waits.push(m), fetchImpl: async () => (++calls <= 2 ? throttle() : res(200, { d: { IsPage: true } })) }));
    expect(out).toEqual({ IsPage: true });
    expect(calls).toBe(3);
    expect(waits).toEqual(['Bing GetUrlInfo: throttled, waiting 20 s (1/4)', 'Bing GetUrlInfo: throttled, waiting 40 s (2/4)']);
  });

  it("Bing's own passing fault (400 UnknownError) is waited out like a throttle", async () => {
    let calls = 0;
    const logs = [];
    const out = await fast(() => bingCall('GetUrlInfo', { key: KEY, log: (m) => logs.push(m), fetchImpl: async () => (++calls === 1 ? res(400, { ErrorCode: 0, Message: 'ERROR!!! UnknownError' }) : res(200, { d: { IsPage: true } })) }));
    expect(out).toEqual({ IsPage: true });
    expect(logs).toEqual(['Bing GetUrlInfo: transient error, waiting 20 s (1/4)']);
  });

  it('after the last wait it throws, marked as a throttle', async () => {
    let calls = 0;
    const err = await fast(() => bingCall('GetUrlInfo', { key: KEY, fetchImpl: async () => { calls++; return throttle(); } }).catch(e => e));
    expect(calls).toBe(5);
    expect(err.throttled).toBe(true);
    expect(err.message).toBe('Bing GetUrlInfo → HTTP 400: ERROR!!! ThrottleHost');
    const other = await bingCall('GetUrlInfo', { key: KEY, fetchImpl: async () => res(400, { ErrorCode: 3, Message: 'ERROR!!! InvalidApiKey' }) }).catch(e => e);
    expect(other.throttled).toBe(false);
  });

  it('the inspector stays under ten calls a minute and takes a daily slice that never nears the larger limit', () => {
    expect(CONCURRENCY).toBe(1);
    expect(60000 / MIN_INTERVAL_MS).toBeLessThan(10);
    // ~350 calls in a run met the second limit on 2026-10-01; a slice stays well under it …
    expect(DAILY_LIMIT).toBeLessThanOrEqual(200);
    // … and still turns a 600-URL sitemap over inside the submitter's freshness window.
    expect(Math.ceil(600 / DAILY_LIMIT)).toBeLessThanOrEqual(STATUS_MAX_AGE_DAYS);
    const wf = read('../.github/workflows/bing.yml');
    const minutes = Number(/\n {2}inspect:[\s\S]*?timeout-minutes: (\d+)/.exec(wf)[1]);
    expect(minutes * 60000).toBeGreaterThan(DAILY_LIMIT * MIN_INTERVAL_MS * 1.5);
  });

  it('a throttle that outlasts the waits ends the inspection cleanly: what was read is kept, the rest waits', async () => {
    const urls = ['a', 'b', 'c', 'd', 'e'].map(x => `https://sqlquest.app/${x}/`);
    const sitemap = `<urlset>${urls.map(u => `<url><loc>${u}</loc></url>`).join('')}</urlset>`;
    const written = [];
    let infoCalls = 0;
    const fetchImpl = async (u, o = {}) => {
      const url = new URL(u);
      if (url.pathname === '/sitemap.xml') return res(200, sitemap);
      if (url.hostname === 'ssl.bing.com') return (++infoCalls <= 3 ? res(200, { d: { LastCrawledDate: '/Date(1790553600000)/', HttpStatus: 0 } }) : throttle());
      if (o.method === 'POST') { written.push(...JSON.parse(o.body)); return res(201, ''); }
      return res(200, written);
    };
    const logs = [];
    const out = await fast(() => runInspect({ argv: [], env: { BING_WMT_KEY: KEY, SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_x' }, fetchImpl, log: (m) => logs.push(m), pace: 0 }));
    expect(out).toMatchObject({ inspected: 3, throttled: true });
    expect(written.map(r => r.url)).toEqual(urls.slice(0, 3));
    expect(logs).toContain('stopped early: throttled after 3 of 5 — the rest go first in the next run');
    // any other refusal is still an error
    const bad = async (u) => (new URL(u).pathname === '/sitemap.xml' ? res(200, sitemap) : new URL(u).hostname === 'ssl.bing.com' ? res(400, { ErrorCode: 3, Message: 'ERROR!!! InvalidApiKey' }) : res(200, []));
    await expect(runInspect({ argv: [], env: { BING_WMT_KEY: KEY, SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_x' }, fetchImpl: bad, log: () => {}, pace: 0 })).rejects.toThrow(/InvalidApiKey/);
  });

  it('a run inspects the daily slice unless told otherwise', async () => {
    const urls = Array.from({ length: DAILY_LIMIT + 30 }, (_, i) => `https://sqlquest.app/p${String(i).padStart(3, '0')}/`);
    const sitemap = `<urlset>${urls.map(u => `<url><loc>${u}</loc></url>`).join('')}</urlset>`;
    const mk = () => { let n = 0; return { count: () => n, fetchImpl: async (u) => (new URL(u).pathname === '/sitemap.xml' ? res(200, sitemap) : (n++, res(200, { d: null }))) }; };
    const env = { BING_WMT_KEY: KEY };
    const daily = mk(); await runInspect({ argv: ['--dry-run'], env, fetchImpl: daily.fetchImpl, log: () => {}, pace: 0 });
    expect(daily.count()).toBe(DAILY_LIMIT);
    const all = mk(); await runInspect({ argv: ['--dry-run', '--all'], env, fetchImpl: all.fetchImpl, log: () => {}, pace: 0 });
    expect(all.count()).toBe(urls.length);
    const few = mk(); await runInspect({ argv: ['--dry-run', '--limit', '7'], env, fetchImpl: few.fetchImpl, log: () => {}, pace: 0 });
    expect(few.count()).toBe(7);
  });
});

describe('fetch', () => {
  const q = { __type: 'QueryStats:#Microsoft.Bing.Webmaster.Api', AvgClickPosition: 18, AvgImpressionPosition: 17, Clicks: 15, Date: '/Date(1316156400000-0700)/', Impressions: 100, Query: 'sql exercises' };

  it('three slices on one table; the absent dimension is NULL; the page slice reads the URL out of Query', () => {
    expect(toStatRecord(q, 'query')).toEqual({ date: '2011-09-16', query: 'sql exercises', page: null, clicks: 15, impressions: 100, avg_click_position: 18, avg_impression_position: 17 });
    expect(toStatRecord({ ...q, Query: DOOR }, 'page')).toMatchObject({ query: null, page: DOOR });
    expect(toStatRecord(q, 'query_page', DOOR)).toMatchObject({ query: 'sql exercises', page: DOOR });
    // The live API sends -1 for a position it does not have.
    expect(toStatRecord({ ...q, AvgClickPosition: -1, AvgImpressionPosition: 3 }, 'query')).toMatchObject({ avg_click_position: null, avg_impression_position: 3 });
    expect(toStatRecord({ ...q, Date: null }, 'query')).toBeNull();
    expect(toStatRecord({ ...q, Query: '' }, 'query')).toBeNull();
  });

  it('site and crawl rows keep the day and the index count', () => {
    expect(toSiteRecord({ Clicks: 15, Date: '/Date(1316156400000-0700)/', Impressions: 100 })).toEqual({ date: '2011-09-16', clicks: 15, impressions: 100 });
    expect(toCrawlRecord({ AllOtherCodes: 0, BlockedByRobotsTxt: 0, Code2xx: 9998, Code301: 0, Code302: 0, Code4xx: 1, Code5xx: 1, ContainsMalware: 5, CrawlErrors: 0, CrawledPages: 0, Date: '/Date(1316156400000-0700)/', InIndex: 1000, InLinks: 2048 }))
      .toMatchObject({ date: '2011-09-16', in_index: 1000, in_links: 2048, code_2xx: 9998, code_4xx: 1, code_5xx: 1, contains_malware: 5 });
  });

  it('one record per key, the last wins — Postgres refuses a batch that names a key twice', () => {
    const rows = [{ date: 'd', query: 'a', page: null, clicks: 1 }, { date: 'd', query: 'a', page: null, clicks: 2 }, null];
    expect(dedupe(rows, r => `${r.date}|${r.query}`)).toEqual([{ date: 'd', query: 'a', page: null, clicks: 2 }]);
  });

  it('the pages asked for their queries are the most-seen in the last 35 days', () => {
    const today = new Date('2026-10-01T00:00:00Z');
    const rows = [
      { page: 'old', date: '2026-07-01', impressions: 9999 },
      { page: 'a', date: '2026-09-20', impressions: 50 }, { page: 'a', date: '2026-09-27', impressions: 60 },
      { page: 'b', date: '2026-09-27', impressions: 100 },
      { page: 'c', date: '2026-09-27', impressions: 10 },
    ];
    expect(topPages(rows, { n: 2, today })).toEqual(['a', 'b']);
  });

  it('a run writes five slices to three tables and calls GetPageQueryStats once per top page', async () => {
    const calls = [];
    const writes = {};
    const fetchImpl = async (u, o) => {
      const url = new URL(u);
      if (url.hostname === 'ssl.bing.com') {
        const method = url.pathname.split('/').pop();
        calls.push(method + (url.searchParams.get('page') ? ` ${url.searchParams.get('page')}` : ''));
        const day = bingDay('2026-09-27');
        if (method === 'GetRankAndTrafficStats') return res(200, { d: [{ Clicks: 5, Impressions: 80, Date: day }] });
        if (method === 'GetQueryStats') return res(200, { d: [{ Query: 'sql exercises', Clicks: 3, Impressions: 40, AvgClickPosition: 2, AvgImpressionPosition: 4, Date: day }] });
        if (method === 'GetPageStats') return res(200, { d: [{ Query: DOOR, Clicks: 3, Impressions: 40, AvgClickPosition: 2, AvgImpressionPosition: 4, Date: day }, { Query: 'https://sqlquest.app/', Clicks: 1, Impressions: 9, AvgClickPosition: 1, AvgImpressionPosition: 2, Date: day }] });
        if (method === 'GetPageQueryStats') return res(200, { d: [{ Query: 'q', Clicks: 1, Impressions: 2, AvgClickPosition: 1, AvgImpressionPosition: 1, Date: day }] });
        if (method === 'GetCrawlStats') return res(200, { d: [{ Date: day, InIndex: 270, CrawledPages: 12, CrawlErrors: 0 }] });
      }
      const table = url.pathname.split('/').pop();
      (writes[table] ||= []).push(...JSON.parse(o.body));
      expect(o.headers.apikey).toBe('sb_secret_x');
      return res(201, '');
    };
    const totals = await runFetch({ argv: [], env: { BING_WMT_KEY: KEY, SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_x' }, fetchImpl, log: () => {}, today: new Date('2026-10-01T00:00:00Z') });
    expect(totals).toEqual({ site: 1, query: 1, page: 2, query_page: 2, crawl: 1 });
    expect(calls.filter(c => c.startsWith('GetPageQueryStats'))).toEqual([`GetPageQueryStats ${DOOR}`, 'GetPageQueryStats https://sqlquest.app/']);
    expect(Object.keys(writes).sort()).toEqual(['bing_crawl_daily', 'bing_site_daily', 'bing_stats']);
    expect(writes.bing_stats).toHaveLength(5);
    expect(writes.bing_stats.every(r => r.fetched_at)).toBe(true);
    expect(writes.bing_crawl_daily[0].in_index).toBe(270);
  });
});

describe('inspect', () => {
  const xml = '<urlset><url><loc>https://sqlquest.app/</loc><lastmod>2026-09-30</lastmod></url><url>\n<loc> https://sqlquest.app/a/ </loc></url></urlset>';

  it('reads loc and lastmod per url', () => {
    expect(parseSitemapEntries(xml)).toEqual([{ url: 'https://sqlquest.app/', lastmod: '2026-09-30' }, { url: 'https://sqlquest.app/a/', lastmod: null }]);
  });

  it('never-checked URLs go first, then the stalest', () => {
    expect(pickBatch(['b', 'a', 'c'], { a: '2026-09-02T00:00:00Z', b: '2026-09-01T00:00:00Z' }, 2)).toEqual(['c', 'b']);
  });

  it('maps UrlInfo; no record and the empty WCF date both mean never crawled', () => {
    const now = new Date('2026-10-01T00:00:00Z');
    const rec = toUrlStatus('u', { AnchorCount: 50, DiscoveryDate: '/Date(1315349995266-0700)/', DocumentSize: 1200, HttpStatus: 200, IsPage: true, LastCrawledDate: '/Date(1316213995266-0700)/' }, now);
    expect(rec).toEqual({ url: 'u', http_status: 200, last_crawled: '2011-09-16T22:59:55.266Z', discovered: '2011-09-06T22:59:55.266Z', document_size: 1200, anchor_count: 50, is_page: true, checked_at: now.toISOString() });
    expect(toUrlStatus('u', null, now).last_crawled).toBeNull();
    expect(toUrlStatus('u', { LastCrawledDate: '/Date(-62135568000000)/', HttpStatus: 0 }, now).last_crawled).toBeNull();
  });

  it('never / error / stale / ok', () => {
    expect(classify(null)).toBe('never');
    expect(classify({ last_crawled: null, http_status: 0 })).toBe('never');
    expect(classify({ last_crawled: '2026-09-20T00:00:00Z', http_status: 404 })).toBe('error');
    expect(classify({ last_crawled: '2026-09-20T00:00:00Z', http_status: 200 }, '2026-09-30')).toBe('stale');
    expect(classify({ last_crawled: '2026-09-30T10:00:00Z', http_status: 200 }, '2026-09-30')).toBe('ok');
    expect(classify({ last_crawled: '2026-09-20T00:00:00Z', http_status: 200 }, null)).toBe('ok');
  });

  it('the report counts each group and lists what needs work', () => {
    const entries = [{ url: 'a', lastmod: '2026-09-30' }, { url: 'b', lastmod: null }, { url: 'c', lastmod: null }];
    const sum = summarize([
      { url: 'a', last_crawled: '2026-09-01T00:00:00Z', http_status: 200 },
      { url: 'b', last_crawled: null },
      { url: 'c', last_crawled: '2026-09-01T00:00:00Z', http_status: 200 },
    ], entries);
    expect([sum.ok.length, sum.stale.length, sum.never.length, sum.error.length]).toEqual([1, 1, 1, 0]);
    const md = renderReport(sum, { date: '2026-10-01' });
    expect(md).toContain('1 of 3 sitemap URLs crawled since they last changed; 1 crawled before; 1 never crawled; 0 answered with an error.');
    expect(md).toContain('| b | never |');
  });
});

describe('submit', () => {
  const now = new Date('2026-10-05T06:00:00Z');
  const entries = [
    { url: 'https://sqlquest.app/never/', lastmod: null },
    { url: 'https://sqlquest.app/stale/', lastmod: '2026-09-30' },
    { url: 'https://sqlquest.app/ok/', lastmod: '2026-09-01' },
    { url: 'https://sqlquest.app/broken/', lastmod: null },
    { url: 'https://sqlquest.app/just-sent/', lastmod: null },
  ];
  const status = {
    'https://sqlquest.app/stale/': { last_crawled: '2026-09-20T00:00:00Z', http_status: 200, checked_at: now.toISOString() },
    'https://sqlquest.app/ok/': { last_crawled: '2026-09-20T00:00:00Z', http_status: 200, checked_at: now.toISOString() },
    'https://sqlquest.app/broken/': { last_crawled: '2026-09-20T00:00:00Z', http_status: 500, checked_at: now.toISOString() },
    'https://sqlquest.app/never/': { last_crawled: null, checked_at: now.toISOString() },
    'https://sqlquest.app/just-sent/': { last_crawled: null, checked_at: now.toISOString() },
  };
  const lastSubmitted = { 'https://sqlquest.app/just-sent/': '2026-10-01T05:13:00Z' };

  it('the allowance is the smallest of the daily quota, the monthly quota and our cap', () => {
    expect(allowance({ DailyQuota: 100, MonthlyQuota: 2000 })).toBe(MAX_PER_RUN);
    expect(allowance({ DailyQuota: 7, MonthlyQuota: 2000 })).toBe(7);
    expect(allowance({ DailyQuota: 100, MonthlyQuota: 3 })).toBe(3);
    expect(allowance({ DailyQuota: 0, MonthlyQuota: 50 })).toBe(0);
    expect(allowance(null)).toBe(0);
    expect(allowance({ DailyQuota: 'x' })).toBe(0);
  });

  it('sends never-crawled, then crawled-before-the-change; never an ok page, an erroring page, or one sent inside the cooldown', () => {
    expect(pickSubmissions({ entries, status, lastSubmitted, now })).toEqual([
      { url: 'https://sqlquest.app/never/', reason: 'never' },
      { url: 'https://sqlquest.app/stale/', reason: 'stale' },
    ]);
    expect(COOLDOWN_DAYS).toBe(14);
    const later = new Date('2026-10-16T06:00:00Z');
    const recheck = Object.fromEntries(Object.entries(status).map(([u, r]) => [u, { ...r, checked_at: later.toISOString() }]));
    expect(pickSubmissions({ entries, status: recheck, lastSubmitted, now: later }).map(p => p.url)).toContain('https://sqlquest.app/just-sent/');
  });

  it('a URL whose own status row is old is not sent: "never crawled" read a week ago is not a fact today', () => {
    const old = { ...status, 'https://sqlquest.app/never/': { last_crawled: null, checked_at: '2026-09-28T06:00:00Z' } };
    expect(pickSubmissions({ entries, status: old, lastSubmitted, now }).map(p => p.url)).toEqual(['https://sqlquest.app/stale/']);
    expect(STATUS_MAX_AGE_DAYS).toBe(4);
    const missing = Object.fromEntries(Object.entries(status).filter(([u]) => u !== 'https://sqlquest.app/stale/'));
    expect(pickSubmissions({ entries, status: missing, lastSubmitted, now }).map(p => p.url)).toEqual(['https://sqlquest.app/never/']);
  });

  it('the limit cuts the list from the bottom, and zero sends nothing', () => {
    expect(pickSubmissions({ entries, status, lastSubmitted, now, limit: 1 }).map(p => p.reason)).toEqual(['never']);
    expect(pickSubmissions({ entries, status, lastSubmitted, now, limit: 0 })).toEqual([]);
  });

  const world = ({ statusRows, quota = { DailyQuota: 100, MonthlyQuota: 2000 } }) => {
    const seen = { submit: null, logged: null, calls: [] };
    const sitemap = `<urlset>${entries.map(e => `<url><loc>${e.url}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</url>`).join('')}</urlset>`;
    const fetchImpl = async (u, o = {}) => {
      const url = new URL(u);
      if (url.pathname === '/sitemap.xml') return res(200, sitemap);
      if (url.hostname === 'ssl.bing.com') {
        const method = url.pathname.split('/').pop();
        seen.calls.push(method);
        if (method === 'GetUrlSubmissionQuota') return res(200, { d: quota });
        if (method === 'SubmitUrlBatch') { seen.submit = JSON.parse(o.body); return res(200, { d: null }); }
      }
      if (url.pathname.endsWith('/bing_url_status')) return res(200, statusRows);
      if (url.pathname.endsWith('/bing_submissions')) {
        if (o.method === 'POST') { seen.logged = JSON.parse(o.body); return res(201, ''); }
        return res(200, Object.entries(lastSubmitted).map(([url2, submitted_at]) => ({ url: url2, submitted_at })));
      }
      throw new Error(`unexpected ${u.split('?')[0]}`);
    };
    return { seen, fetchImpl };
  };
  const env = { BING_WMT_KEY: KEY, SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_x' };
  const rows = Object.entries(status).map(([url, r]) => ({ url, ...r }));

  it('a run submits the picks in one batch and logs each with its reason', async () => {
    const { seen, fetchImpl } = world({ statusRows: rows });
    const out = await runSubmit({ argv: [], env, fetchImpl, log: () => {}, now });
    expect(out.submitted).toBe(2);
    expect(seen.submit).toEqual({ siteUrl: BING_SITE, urlList: ['https://sqlquest.app/never/', 'https://sqlquest.app/stale/'] });
    expect(seen.logged.map(r => [r.url, r.reason, r.submitted_at])).toEqual([
      ['https://sqlquest.app/never/', 'never', now.toISOString()],
      ['https://sqlquest.app/stale/', 'stale', now.toISOString()],
    ]);
  });

  it('a dry run and an empty quota call SubmitUrlBatch never', async () => {
    const dry = world({ statusRows: rows });
    expect((await runSubmit({ argv: ['--dry-run'], env, fetchImpl: dry.fetchImpl, log: () => {}, now })).picks).toHaveLength(2);
    expect(dry.seen.calls).toEqual(['GetUrlSubmissionQuota']);
    const empty = world({ statusRows: rows, quota: { DailyQuota: 0, MonthlyQuota: 500 } });
    expect((await runSubmit({ argv: [], env, fetchImpl: empty.fetchImpl, log: () => {}, now })).submitted).toBe(0);
    expect(empty.seen.calls).toEqual(['GetUrlSubmissionQuota']);
  });

  it('refuses to run on a URL status that is old or does not cover the sitemap', async () => {
    const old = world({ statusRows: rows.map(r => ({ ...r, checked_at: '2026-09-20T00:00:00Z' })) });
    await expect(runSubmit({ argv: [], env, fetchImpl: old.fetchImpl, log: () => {}, now })).rejects.toThrow(/from the last 4 days for 0 of 5 sitemap URLs — run scripts\/bing\/inspect\.mjs first/);
    const thin = world({ statusRows: rows.slice(0, 2) });
    await expect(runSubmit({ argv: [], env, fetchImpl: thin.fetchImpl, log: () => {}, now })).rejects.toThrow(/for 2 of 5/);
    expect(old.seen.calls).toEqual([]);
  });
});

describe('report', () => {
  it('the week ends on the last date in the data', () => {
    expect(weeks('2026-09-28')).toEqual({ cur: { start: '2026-09-22', end: '2026-09-28' }, prev: { start: '2026-09-15', end: '2026-09-21' } });
  });

  it('position is weighted by impressions', () => {
    const rows = [
      { date: '2026-09-27', page: 'p', clicks: 1, impressions: 90, avg_impression_position: 2 },
      { date: '2026-09-20', page: 'p', clicks: 0, impressions: 10, avg_impression_position: 12 },
    ];
    expect(aggregate(rows, 'page', { start: '2026-09-01', end: '2026-09-30' })[0]).toMatchObject({ clicks: 1, impressions: 100, position: 3 });
  });

  it("builds the site week, the index count, the door's share, and the two work lists", () => {
    const siteRows = [];
    for (let i = 0; i < 14; i++) siteRows.push({ date: `2026-09-${String(15 + i).padStart(2, '0')}`, clicks: i < 7 ? 2 : 3, impressions: 100 });
    const r = buildReport({
      siteRows,
      crawlRows: [{ date: '2026-09-21', in_index: 269, crawled_pages: 5, crawl_errors: 0, code_4xx: 0, code_5xx: 0 }, { date: '2026-09-28', in_index: 301, crawled_pages: 40, crawl_errors: 1, code_4xx: 1, code_5xx: 0 }],
      pageRows: [
        { date: '2026-09-27', page: DOOR, clicks: 16, impressions: 400, avg_impression_position: 6 },
        { date: '2026-09-27', page: 'https://sqlquest.app/silent/', clicks: 0, impressions: 60, avg_impression_position: 4 },
        { date: '2026-09-27', page: 'https://sqlquest.app/almost/', clicks: 9, impressions: 80, avg_impression_position: 14 },
        { date: '2026-09-27', page: 'https://sqlquest.app/tiny/', clicks: 0, impressions: 5, avg_impression_position: 3 },
      ],
      doorQueryRows: [{ date: '2026-09-27', query: 'sql exercises', page: DOOR, clicks: 10, impressions: 300, avg_impression_position: 5 }],
      statusRows: [{ url: 'https://sqlquest.app/never/', last_crawled: null }, { url: 'https://gone.example/', last_crawled: null }],
      entries: [{ url: 'https://sqlquest.app/never/', lastmod: null }],
    });
    expect(r.site).toEqual({ cur: { clicks: 21, impressions: 700 }, prev: { clicks: 14, impressions: 700 } });
    expect([r.crawlNow.in_index, r.crawlBefore.in_index]).toEqual([301, 269]);
    expect(r.door.share).toBeCloseTo(16 / 25);
    expect(r.noClickTop10.map(p => p.key)).toEqual(['https://sqlquest.app/silent/']);
    expect(r.tenToTwenty.map(p => p.key)).toEqual(['https://sqlquest.app/almost/']);
    expect(r.urls.never.map(u => u.url)).toEqual(['https://sqlquest.app/never/']);
    const md = renderMarkdown(r);
    expect(md).toContain('# Bing weekly — 2026-09-22 → 2026-09-28');
    expect(md).toContain("In Bing's index on 2026-09-28: **301** (269 on 2026-09-21) of 1 sitemap URLs.");
    expect(md).toContain('16 of 25 page clicks (64.0%)');
    expect(md).toContain('| /silent/ | 60 | 4.0 |');
    expect(md).toContain('| sql exercises | 300 | 10 | 5.0 |');
  });
});

describe('the workflow, the migration and the key', () => {
  const wf = read('../.github/workflows/bing.yml');
  const sql = read('../supabase/migrations/20261001100000_bing_tables.sql');

  const job = (name) => { const at = wf.indexOf(`\n  ${name}:\n`); const next = wf.slice(at + 1).search(/\n {2}[a-z-]+:\n/); return wf.slice(at, next === -1 ? wf.length : at + 1 + next); };

  it('fetch and a slice of the inspection daily, the report and the submission on Mondays, every job runnable by hand', () => {
    expect(job('fetch')).toContain("github.event.schedule == '30 6 * * *'");
    expect(job('inspect')).toContain("github.event.schedule == '45 6 * * *'");
    expect(job('report')).toContain("github.event.schedule == '15 7 * * 1'");
    expect(job('submit')).toContain("github.event.schedule == '30 7 * * 1'");
    for (const c of ['30 6 * * *', '45 6 * * *', '15 7 * * 1', '30 7 * * 1']) expect(wf).toContain(`- cron: '${c}'`);
    expect(wf).toContain('options: [verify, fetch, inspect, submit-dry-run, submit, report, seed-submissions]');
    for (const s of ['verify', 'fetch', 'inspect', 'submit', 'report', 'seed-submissions']) expect(job(s)).toContain(`scripts/bing/${s}.mjs`);
  });

  it('submission is its own Monday job, and a hand-started dry run sends nothing', () => {
    expect(job('inspect')).not.toContain('submit.mjs');
    expect(job('submit')).toContain("node scripts/bing/submit.mjs ${{ inputs.job == 'submit-dry-run' && '--dry-run' || '' }}");
    expect(job('seed-submissions')).toContain("inputs.job == 'seed-submissions'");
    expect(job('seed-submissions')).not.toContain('schedule');
    expect(job('seed-submissions')).not.toContain('BING_WMT_KEY');
  });

  it('the hand submissions are read from the log: one row per URL and day, dated, marked by_hand', () => {
    const rows = parseSubmissionLog("# log\nhttps://sqlquest.app/before-any-date/\n## 2026-09-23 (2, 'Success')\nhttps://sqlquest.app/a/\nhttps://sqlquest.app/b/\nnot a url\n## 2026-10-01 (2)\nhttps://sqlquest.app/a/\nhttps://sqlquest.app/a/\nhttps://example.com/x/\n");
    expect(rows).toEqual([
      { url: 'https://sqlquest.app/a/', submitted_at: '2026-09-23T12:00:00.000Z', reason: 'by_hand' },
      { url: 'https://sqlquest.app/b/', submitted_at: '2026-09-23T12:00:00.000Z', reason: 'by_hand' },
      { url: 'https://sqlquest.app/a/', submitted_at: '2026-10-01T12:00:00.000Z', reason: 'by_hand' },
    ]);
    const real = parseSubmissionLog(read('../docs/reads/bing-url-submissions.txt'));
    expect(real.length).toBeGreaterThanOrEqual(416);
    expect(new Set(real.map(r => r.submitted_at.slice(0, 10)))).toEqual(new Set(['2026-09-23', '2026-09-24', '2026-09-29', '2026-09-30', '2026-10-01']));
  });

  it('the key stays in the environment: never echoed, never written to a file', () => {
    expect(wf).toContain('BING_WMT_KEY: ${{ secrets.BING_WMT_KEY }}');
    expect(wf).not.toMatch(/echo[^\n]*secrets\.|>\s*\S*\.(json|txt|env)\b/);
    const gate = read('../scripts/bing/configured.sh');
    expect(gate).not.toMatch(/echo[^\n]*\$\{?BING_WMT_KEY/);
    for (const f of fs.readdirSync(new URL('../scripts/bing/', import.meta.url))) {
      const src = read(`../scripts/bing/${f}`);
      expect(src, f).not.toMatch(/apikey=[A-Za-z0-9]{16}/);
      // The key is never interpolated into a string or handed to a logger.
      expect(src, f).not.toMatch(/\$\{\s*(key|apiKey)\s*\}/);
      expect(src, f).not.toMatch(/console\.(log|error)\([^)\n]*,\s*(key|apiKey)\s*[,)]/);
    }
  });

  it('without the secret a schedule skips with a warning and a hand-started run fails', () => {
    const gate = read('../scripts/bing/configured.sh');
    expect(gate).toContain('on=false');
    expect(gate).toMatch(/workflow_dispatch[\s\S]*exit 1/);
    expect((wf.match(/if: steps\.cfg\.outputs\.on == 'true'/g) || []).length).toBe(4);
  });

  it('a failed run opens (or comments on) an issue with the Bing hint', () => {
    expect((wf.match(/if: failure\(\) \|\| cancelled\(\)/g) || []).length).toBe(4);
    for (const t of ['Bing fetch failed', 'Bing inspect failed', 'Bing submit failed', 'Bing weekly report failed']) expect(wf).toContain(`notify-failure.sh "${t}" "$RUN_URL" "$FAILURE_HINT"`);
    expect(wf).toMatch(/notify-failure\.sh "Bing fetch failed" "\$RUN_URL" "\$FAILURE_HINT"/);
    expect(read('../scripts/gsc/notify-failure.sh')).toContain('hint="${3:-');
  });

  it('five tables, service role only, with the slice key the upserts name', () => {
    for (const t of ['bing_site_daily', 'bing_stats', 'bing_crawl_daily', 'bing_url_status', 'bing_submissions']) {
      expect(sql).toContain(`create table if not exists public.${t}`);
      expect(sql).toMatch(new RegExp(`alter table public\\.${t}\\s+enable row level security`));
      expect(sql).toMatch(new RegExp(`revoke all on public\\.${t}\\s+from anon, authenticated`));
      expect(read('../supabase/manual/20261001_bing_tables_rollback.sql')).toContain(`drop table if exists public.${t}`);
    }
    expect(sql).not.toMatch(/create policy/i);
    expect(sql).toContain('unique nulls not distinct (date, query, page)');
    expect(sql).toContain('primary key (url, submitted_at)');
    expect(read('../scripts/bing/fetch.mjs')).toContain("'date,query,page'");
    expect(read('../scripts/bing/submit.mjs')).toContain("'url,submitted_at'");
  });
});
