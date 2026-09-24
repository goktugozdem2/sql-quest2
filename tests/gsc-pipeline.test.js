// The Google Search Console pipeline (2026-09-25): auth, fetch, inspect,
// report, and the two workflows. No network: every call goes through a fake
// fetch. The real calls were run by hand against the live API the same day.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { generateKeyPairSync } from 'node:crypto';
import { readServiceAccount, getAccessToken, googleFetch, GSC_PROPERTY } from '../scripts/gsc/auth.mjs';
import { dateWindows, toRecord, fetchSlice, upsertRows, SLICES, ROW_LIMIT } from '../scripts/gsc/fetch.mjs';
import { parseSitemap, pickBatch, toStatus, summarize, renderReport } from '../scripts/gsc/inspect.mjs';
import { weeks, aggregate, buildReport, renderMarkdown } from '../scripts/gsc/report.mjs';

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
const KEY = JSON.stringify({ type: 'service_account', client_email: 'sa@x.iam.gserviceaccount.com', private_key: privateKey, token_uri: 'https://oauth2.googleapis.com/token' });
const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) });

describe('auth', () => {
  it('the property is the domain property, never the URL one', () => {
    expect(GSC_PROPERTY).toBe('sc-domain:sqlquest.app');
  });

  it('reads the key from the environment only, and says nothing of it on failure', () => {
    expect(() => readServiceAccount({})).toThrow(/GSC_SA_KEY is not set/);
    expect(() => readServiceAccount({ GSC_SA_KEY: '{nope' })).toThrow(/not valid JSON/);
    expect(() => readServiceAccount({ GSC_SA_KEY: '{"type":"user"}' })).toThrow(/not a service-account key/);
  });

  it('signs a JWT and exchanges it; a refused exchange never echoes the key', async () => {
    let sent = null;
    const ok = await getAccessToken({ env: { GSC_SA_KEY: KEY }, fetchImpl: async (u, o) => { sent = String(o.body); return json(200, { access_token: 't' }); } });
    expect(ok.token).toBe('t');
    expect(sent).toContain('grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer');
    const err = await getAccessToken({ env: { GSC_SA_KEY: KEY }, fetchImpl: async () => json(400, { error: 'invalid_grant' }) }).catch(e => e);
    expect(err.message).toMatch(/token exchange failed: HTTP 400 invalid_grant/);
    expect(err.message).not.toContain('PRIVATE KEY');
  });

  it('retries 429 and 5xx with backoff, fails at once on 403', async () => {
    let calls = 0;
    const flaky = async () => (++calls < 3 ? json(calls === 1 ? 429 : 503, {}) : json(200, { ok: 1 }));
    const realSetTimeout = globalThis.setTimeout;
    globalThis.setTimeout = (fn) => realSetTimeout(fn, 0);
    try {
      expect(await googleFetch('https://x/y', { token: 't', fetchImpl: flaky })).toEqual({ ok: 1 });
      expect(calls).toBe(3);
      let n = 0;
      const err = await googleFetch('https://x/y', { token: 't', fetchImpl: async () => { n++; return json(403, { error: 'forbidden' }); } }).catch(e => e);
      expect(err.status).toBe(403);
      expect(n).toBe(1);
    } finally {
      globalThis.setTimeout = realSetTimeout;
    }
  });
});

describe('fetch', () => {
  const today = new Date('2026-09-25T06:00:00Z');

  it('daily: the 7 days ending yesterday', () => {
    expect(dateWindows({ today })).toEqual([{ start: '2026-09-18', end: '2026-09-24' }]);
  });

  it('backfill: 16 months back, month by month, the last chunk ending yesterday', () => {
    const w = dateWindows({ backfill: true, today });
    expect(w[0]).toEqual({ start: '2025-05-01', end: '2025-05-31' });
    expect(w).toHaveLength(17);
    expect(w[w.length - 1]).toEqual({ start: '2026-09-01', end: '2026-09-24' });
    for (let i = 1; i < w.length; i++) expect(w[i].start > w[i - 1].end).toBe(true);
  });

  it('three slices, each with date; the absent dimension is NULL', () => {
    expect(SLICES.map(s => s.dimensions)).toEqual([['date', 'query'], ['date', 'page'], ['date', 'query', 'page']]);
    const row = { keys: ['2026-09-20', 'sql cte'], clicks: 2, impressions: 40, ctr: 0.05, position: 7.25 };
    expect(toRecord(row, SLICES[0])).toEqual({ date: '2026-09-20', query: 'sql cte', page: null, clicks: 2, impressions: 40, ctr: 0.05, position: 7.25 });
    expect(toRecord({ keys: ['2026-09-20', 'https://sqlquest.app/'] }, SLICES[1])).toMatchObject({ query: null, page: 'https://sqlquest.app/' });
    expect(toRecord({ keys: ['2026-09-20', 'q', 'https://p/'] }, SLICES[2])).toMatchObject({ query: 'q', page: 'https://p/' });
  });

  it('pages with rowLimit 25000 and startRow until a short page', async () => {
    const bodies = [];
    const fetchImpl = async (u, o) => {
      const b = JSON.parse(o.body); bodies.push(b);
      const n = b.startRow === 0 ? ROW_LIMIT : 3;
      return json(200, { rows: Array.from({ length: n }, (_, i) => ({ keys: ['2026-09-20', `q${b.startRow + i}`], clicks: 0, impressions: 1 })) });
    };
    const rows = await fetchSlice({ token: 't', slice: SLICES[0], window: { start: '2026-09-18', end: '2026-09-24' }, fetchImpl });
    expect(rows).toHaveLength(ROW_LIMIT + 3);
    expect(bodies.map(b => b.startRow)).toEqual([0, ROW_LIMIT]);
    expect(bodies[0]).toMatchObject({ rowLimit: 25000, dimensions: ['date', 'query'], dataState: 'all', type: 'web' });
  });

  it('upserts in batches on the (date, query, page) key with the service role', async () => {
    const calls = [];
    const fetchImpl = async (u, o) => { calls.push({ u, o }); return json(201, {}); };
    const rows = Array.from({ length: 2500 }, (_, i) => ({ date: '2026-09-20', query: `q${i}`, page: null, clicks: 0, impressions: 1, ctr: 0, position: 1 }));
    expect(await upsertRows(rows, { url: 'https://p.supabase.co', serviceKey: 'srv', fetchImpl })).toBe(2500);
    expect(calls).toHaveLength(3);
    expect(calls[0].u).toBe('https://p.supabase.co/rest/v1/gsc_daily?on_conflict=date,query,page');
    expect(calls[0].o.headers.prefer).toContain('resolution=merge-duplicates');
    expect(calls[0].o.headers.authorization).toBe('Bearer srv');
  });
});

describe('inspect', () => {
  it('reads the sitemap and inspects never-checked URLs first, then the stalest', () => {
    const urls = parseSitemap('<urlset><url><loc>https://a/</loc></url><url><loc> https://b/ </loc></url><url><loc>https://c/</loc></url></urlset>');
    expect(urls).toEqual(['https://a/', 'https://b/', 'https://c/']);
    expect(pickBatch(urls, { 'https://a/': '2026-09-20T00:00:00Z', 'https://c/': '2026-09-01T00:00:00Z' }, 2)).toEqual(['https://b/', 'https://c/']);
  });

  it('maps the inspection result, and reports not-indexed and 30-day-stale', () => {
    const now = new Date('2026-09-25T00:00:00Z');
    const rec = toStatus('https://a/', { inspectionResult: { indexStatusResult: { verdict: 'PASS', coverageState: 'Submitted and indexed', indexingState: 'INDEXING_ALLOWED', lastCrawlTime: '2026-08-01T00:00:00Z' } } }, now);
    expect(rec).toMatchObject({ url: 'https://a/', verdict: 'PASS', last_crawled: '2026-08-01T00:00:00Z' });
    const sum = summarize([rec, { url: 'https://b/', verdict: 'NEUTRAL', coverage_state: 'Discovered - currently not indexed', last_crawled: null }], now);
    expect(sum.indexed).toBe(1);
    expect(sum.notIndexed.map(r => r.url)).toEqual(['https://b/']);
    expect(sum.stale.map(r => r.url)).toEqual(['https://a/', 'https://b/']);
    expect(renderReport(sum)).toMatch(/1 of 2 inspected URLs indexed/);
  });
});

describe('report', () => {
  it('ends the week on the last date in the data', () => {
    expect(weeks('2026-09-23')).toEqual({ cur: { start: '2026-09-17', end: '2026-09-23' }, prev: { start: '2026-09-10', end: '2026-09-16' } });
  });

  it('weights position by impressions', () => {
    const m = aggregate([
      { date: '2026-09-20', page: '/p', clicks: 1, impressions: 90, position: 10 },
      { date: '2026-09-21', page: '/p', clicks: 0, impressions: 10, position: 20 },
    ], 'page', { start: '2026-09-17', end: '2026-09-23' });
    expect(m.get('/p').position).toBeCloseTo(11);
  });

  it('finds movers, new queries, top-20 without clicks, 10–20, and company pages', () => {
    const P = 'https://sqlquest.app';
    const pageRows = [
      { date: '2026-09-12', page: `${P}/stripe-sql-interview/`, clicks: 0, impressions: 30, position: 9 },
      { date: '2026-09-20', page: `${P}/stripe-sql-interview/`, clicks: 1, impressions: 30, position: 5 },
      { date: '2026-09-12', page: `${P}/blog/x/`, clicks: 0, impressions: 30, position: 5 },
      { date: '2026-09-20', page: `${P}/blog/x/`, clicks: 0, impressions: 30, position: 12 },
    ];
    const queryRows = [
      { date: '2026-09-20', query: 'new one', clicks: 0, impressions: 4, position: 30 },
      { date: '2026-09-12', query: 'datalemur', clicks: 0, impressions: 50, position: 7 },
      { date: '2026-09-20', query: 'datalemur', clicks: 0, impressions: 60, position: 7 },
      { date: '2026-09-20', query: 'sql cte', clicks: 1, impressions: 20, position: 14 },
    ];
    const r = buildReport({ queryRows, pageRows, lastDate: '2026-09-23' });
    expect(r.risers.map(x => x.page)).toEqual([`${P}/stripe-sql-interview/`]);
    expect(r.fallers.map(x => x.page)).toEqual([`${P}/blog/x/`]);
    expect(r.newQueries.map(q => q.key)).toEqual(['sql cte', 'new one']);   // by impressions
    expect(r.noClickTop20.map(q => q.key)).toEqual(['datalemur']);
    expect(r.tenToTwenty.map(q => q.key)).toEqual(['sql cte']);
    expect(r.companyCur).toMatchObject({ pages: 1, impressions: 30, clicks: 1 });
    expect(renderMarkdown(r)).toMatch(/## Company pages/);
  });
});

describe('the workflows', () => {
  const daily = fs.readFileSync(new URL('../.github/workflows/gsc-fetch.yml', import.meta.url), 'utf8');
  const weekly = fs.readFileSync(new URL('../.github/workflows/gsc-weekly.yml', import.meta.url), 'utf8');

  it('daily at 06:00 UTC, runnable by hand, backfill on request', () => {
    expect(daily).toContain("cron: '0 6 * * *'");
    expect(daily).toContain('workflow_dispatch:');
    expect(daily).toContain("inputs.backfill && '--backfill'");
  });

  it('weekly on Mondays: inspect, then the report', () => {
    expect(weekly).toContain("cron: '0 5 * * 1'");
    expect(weekly).toContain('scripts/gsc/inspect.mjs');
    expect(weekly).toContain('scripts/gsc/report.mjs');
  });

  it('keys stay in the environment: never written to a file, never echoed', () => {
    for (const wf of [daily, weekly]) {
      expect(wf).toContain('GSC_SA_KEY: ${{ secrets.GSC_SA_KEY }}');
      expect(wf).not.toMatch(/echo[^\n]*secrets\.|>\s*\S*\.json|GOOGLE_APPLICATION_CREDENTIALS/);
    }
  });

  it('a failed run opens (or comments on) an issue', () => {
    for (const wf of [daily, weekly]) expect(wf).toMatch(/if: failure\(\)[\s\S]*notify-failure\.sh/);
  });

  it('no service-account key is committed anywhere in scripts/gsc', () => {
    for (const f of fs.readdirSync(new URL('../scripts/gsc/', import.meta.url))) {
      expect(fs.readFileSync(new URL(`../scripts/gsc/${f}`, import.meta.url), 'utf8')).not.toContain('BEGIN PRIVATE KEY');
    }
  });
});
