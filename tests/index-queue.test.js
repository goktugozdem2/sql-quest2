// The indexing queue (docs/plans/indexing-queue-2026-11-23.md): tier order,
// caps, the 14-day cooldown, /questions/ never to Bing, flag-gated pages,
// seo-prune, and a log that carries no e-mail. No network: liveCheck runs
// against a fake fetch.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import {
  evaluate, pickDay, planDays, allowance, validateLog, flagOn, s1Status, tierClass, sitewideDays,
  liveCheck, readRepo, GSC_DAILY_CAP, GSC_QUOTA, BING_HAND_CAP, COOLDOWN_DAYS, SITE,
} from '../scripts/index-queue.mjs';
import { pickSubmissions } from '../scripts/bing/submit.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const TIERS = JSON.parse(fs.readFileSync(new URL('../src/data/index-tiers.json', import.meta.url), 'utf8'));
const U = (p) => SITE + p;

// A small site: lastmods on distinct days so no day is "site-wide".
function site(entries) { return new Map(entries); }
const BASE = site([
  ['/', '2026-11-20'],
  ['/sql-exercises/', '2026-11-19'],
  ['/paypal-sql-interview/', '2026-11-18'],
  ['/challenges/joins/', '2026-11-17'],
  ['/blog/sql-anti-join/', '2026-11-16'],
  ['/sql-tools/', '2026-11-15'],
  ['/questions/weekend-logins/', '2026-11-14'],
  ['/questions/hires-per-year/', '2026-11-13'],
  ['/sql-debugging-practice/', '2026-11-12'],
  ['/vs-chatgpt/', '2026-11-11'],
  ['/stripe-sql-interview/', '2026-11-10'],
  ['/challenges/cte/', '2026-11-09'],
]);
const tiers = (extra = {}) => ({ ...TIERS, pending: [], ...extra });
const GREEN = { gsc: 'GREEN', bing: 'GREEN' };
const ctx = (over = {}) => ({ engine: 'gsc', date: '2026-11-24', sitemap: BASE, tiers: tiers(), prune: new Set(), flagsSource: '', log: { requests: [] }, status: null, s1: GREEN, ...over });
const paths = (list) => list.map(x => x.path);

describe('tiers', () => {
  it('ranks T1 money doors, then T2, T3, T4, and /questions/ last', () => {
    const { queued } = evaluate(ctx());
    const t = queued.map(q => q.tier);
    expect(t).toEqual([...t].sort((a, b) => a - b));
    expect(queued[0].path).toBe('/');
    expect(queued[1].path).toBe('/sql-exercises/');
    expect(queued.at(-1).path.startsWith('/questions/')).toBe(true);
  });

  it('classifies by the tier map: company/topic/vs pages are class 2, blog 3, tools 4, questions 5', () => {
    expect(tierClass('/', TIERS)).toBe(1);
    expect(tierClass('/capital-one-sql-interview/', TIERS)).toBe(1);
    expect(tierClass('/paypal-sql-interview/', TIERS)).toBe(2);
    expect(tierClass('/challenges/joins/', TIERS)).toBe(2);
    expect(tierClass('/vs-chatgpt/', TIERS)).toBe(2);
    expect(tierClass('/sql-not-in-null/', TIERS)).toBe(2);
    expect(tierClass('/blog/sql-anti-join/', TIERS)).toBe(3);
    expect(tierClass('/sql-tools/', TIERS)).toBe(4);
    expect(tierClass('/questions/weekend-logins/', TIERS)).toBe(5);
  });

  it('a pending page outranks an older class-2 page; an indexed class-2 page not pending drops to T4', () => {
    const status = { '/paypal-sql-interview/': { verdict: 'NEUTRAL', coverage_state: 'URL is unknown to Google' }, '/stripe-sql-interview/': { verdict: 'PASS', coverage_state: 'Submitted and indexed', last_crawled: '2026-11-01' } };
    const { queued } = evaluate(ctx({ status, tiers: tiers({ pending: [{ path: '/challenges/joins/', tier: 2, added: '2026-11-20', source: '#x' }] }) }));
    const byPath = Object.fromEntries(queued.map(q => [q.path, q]));
    expect(byPath['/challenges/joins/'].tier).toBe(2);
    expect(byPath['/paypal-sql-interview/'].tier).toBe(2);
    expect(byPath['/stripe-sql-interview/'].tier).toBe(4);
    expect(paths(queued).indexOf('/challenges/joins/')).toBeLessThan(paths(queued).indexOf('/paypal-sql-interview/'));
  });
});

describe('caps', () => {
  it('GSC: at most 8 a day, 2 of Google\'s ~10 kept back', () => {
    expect(GSC_DAILY_CAP).toBe(8);
    expect(GSC_QUOTA - GSC_DAILY_CAP).toBe(2);
    const day = pickDay(ctx());
    expect(day.picks.length).toBe(8);
    expect(day.waiting.length).toBeGreaterThan(0);
  });

  it('GSC: requests already logged today count against the cap', () => {
    const log = { requests: [1, 2, 3].map(i => ({ url: U(`/blog/x${i}/`), engine: 'gsc', date: '2026-11-24T09:00:00Z', by: 'founder', result: 'requested' })) };
    expect(pickDay(ctx({ log })).picks.length).toBe(5);
  });

  it('GSC: a Quota Exceeded today stops the day', () => {
    const log = { requests: [{ url: U('/'), engine: 'gsc', date: '2026-11-24', by: 'laptop-agent', result: 'quota_exceeded' }] };
    const d = pickDay(ctx({ log }));
    expect(d.picks).toEqual([]);
    expect(d.stop).toMatch(/Quota Exceeded/);
  });

  it('GSC: the next batch waits 24 h after the last request (a rolling window, not a calendar day)', () => {
    const log = { requests: [{ url: U('/blog/a/'), engine: 'gsc', date: '2026-11-23T20:00:00Z', by: 'founder', result: 'requested' }] };
    expect(allowance({ engine: 'gsc', date: '2026-11-24', log, now: '2026-11-24T08:00:00Z' }).cap).toBe(0);
    expect(allowance({ engine: 'gsc', date: '2026-11-24', log, now: '2026-11-24T20:30:00Z' }).cap).toBe(8);
  });

  it('Bing by hand: T1 changed today only, at most 10', () => {
    expect(BING_HAND_CAP).toBe(10);
    const sm = site([...BASE, ['/', '2026-11-24'], ['/paypal-sql-interview/', '2026-11-24']]);
    const d = pickDay(ctx({ engine: 'bing', sitemap: sm }));
    expect(paths(d.picks)).toEqual(['/']);
    expect(d.held.find(h => h.path === '/sql-exercises/').reason).toMatch(/not today/);
  });

  it('a 7-day plan never puts more than the cap on a day nor a URL twice', () => {
    const plan = planDays(ctx(), 7);
    const all = plan.flatMap(d => paths(d.picks));
    expect(new Set(all).size).toBe(all.length);
    for (const d of plan) expect(d.picks.length).toBeLessThanOrEqual(GSC_DAILY_CAP);
  });
});

describe('the 14-day cooldown', () => {
  const req = (p, date, result = 'requested') => ({ url: U(p), engine: 'gsc', date, by: 'founder', result });

  it('a URL requested 13 days ago is held; 14 days ago it may go again if it changed since', () => {
    expect(COOLDOWN_DAYS).toBe(14);
    const sm = site([...BASE, ['/', '2026-11-22']]);
    const held = evaluate(ctx({ sitemap: sm, log: { requests: [req('/', '2026-11-11')] } })).held.find(h => h.path === '/');
    expect(held.reason).toMatch(/cooldown/);
    const back = evaluate(ctx({ sitemap: sm, log: { requests: [req('/', '2026-11-10')] } }));
    expect(paths(back.queued)).toContain('/');
  });

  it('past the cooldown, an unchanged page is still held', () => {
    const r = evaluate(ctx({ log: { requests: [req('/', '2026-11-01')] }, sitemap: site([...BASE, ['/', '2026-10-30']]) }));
    expect(r.held.find(h => h.path === '/').reason).toMatch(/unchanged/);
  });

  it('a refusal (Quota Exceeded) is not a request and starts no cooldown', () => {
    const r = evaluate(ctx({ log: { requests: [req('/', '2026-11-20', 'quota_exceeded')] } }));
    expect(paths(r.queued)).toContain('/');
  });

  it('the cooldown is per engine', () => {
    const sm = site([...BASE, ['/', '2026-11-24']]);
    const r = evaluate(ctx({ engine: 'bing', sitemap: sm, log: { requests: [req('/', '2026-11-20')] } }));
    expect(paths(r.queued)).toContain('/');
  });
});

describe('what is never queued', () => {
  it('/questions/ is never queued for Bing', () => {
    const sm = site([...BASE, ['/questions/weekend-logins/', '2026-11-24']]);
    const r = evaluate(ctx({ engine: 'bing', sitemap: sm, tiers: tiers({ t1: [...TIERS.t1, '/questions/weekend-logins/'], pending: [{ path: '/questions/weekend-logins/', tier: 1, added: '2026-11-24', source: '#x' }] }) }));
    expect(paths(r.queued).filter(p => p.startsWith('/questions/'))).toEqual([]);
    expect(r.held.find(h => h.path === '/questions/weekend-logins/').reason).toBe('questions-never-bing');
  });

  it('the Bing API submitter never sends a /questions/ page either', () => {
    const now = new Date('2026-11-23T07:30:00Z');
    const entries = [{ url: U('/questions/weekend-logins/'), lastmod: '2026-11-20' }, { url: U('/paypal-sql-interview/'), lastmod: '2026-11-20' }];
    const status = Object.fromEntries(entries.map(e => [e.url, { url: e.url, last_crawled: null, checked_at: '2026-11-22T07:00:00Z' }]));
    expect(pickSubmissions({ entries, status, now }).map(p => p.url)).toEqual([U('/paypal-sql-interview/')]);
  });

  it('/questions/ is never queued for Bing on the live repo either', () => {
    const repo = readRepo(ROOT);
    const date = [...repo.sitemap.values()].sort().at(-1);
    const r = evaluate({ ...repo, engine: 'bing', date, s1: GREEN });
    expect(paths(r.queued).filter(p => p.startsWith('/questions/'))).toEqual([]);
  });

  it('a flag-gated page is never queued while its flag is off, on either engine', () => {
    for (const engine of ['gsc', 'bing']) {
      const sm = site([...BASE, ['/sql-debugging-practice/', '2026-11-24']]);
      const r = evaluate(ctx({ engine, sitemap: sm, flagsSource: 'window.FEATURE_FLAGS = { debugQuestions: false };' }));
      expect(paths(r.queued)).not.toContain('/sql-debugging-practice/');
      expect(r.held.find(h => h.path === '/sql-debugging-practice/').reason).toBe('flag-off:debugQuestions');
    }
    const on = evaluate(ctx({ flagsSource: '  debugQuestions: true, // on' }));
    expect(paths(on.queued)).toContain('/sql-debugging-practice/');
  });

  it('a missing flag key reads OFF here (unlike the app preview)', () => {
    expect(flagOn('window.FEATURE_FLAGS = {};', 'debugQuestions')).toBe(false);
    expect(flagOn('debugQuestions: true', 'debugQuestions')).toBe(true);
    expect(flagOn('noDebugQuestions: true', 'debugQuestions')).toBe(false);
  });

  it('a URL in seo-prune.json is never queued', () => {
    const r = evaluate(ctx({ prune: new Set(['/sql-exercises/']) }));
    expect(paths(r.queued)).not.toContain('/sql-exercises/');
    expect(r.held.find(h => h.path === '/sql-exercises/').reason).toBe('in-seo-prune');
  });

  it('a page GSC shows indexed with a crawl on or after its lastmod is not requested', () => {
    const status = { '/': { verdict: 'PASS', coverage_state: 'Submitted and indexed', last_crawled: '2026-11-21T03:00:00Z' } };
    const r = evaluate(ctx({ status }));
    expect(r.held.find(h => h.path === '/').reason).toMatch(/^indexed, crawled/);
  });

  it('while S1 is RED on an engine, T3/T4 wait; T1/T2 still go', () => {
    const r = evaluate(ctx({ s1: { gsc: 'RED', bing: 'GREEN' } }));
    expect(r.queued.every(q => q.tier <= 2)).toBe(true);
    expect(r.held.some(h => /S1 RED/.test(h.reason))).toBe(true);
    expect(s1Status('- **Status:** Google GREEN · Bing RED')).toEqual({ gsc: 'GREEN', bing: 'RED', known: true });
    expect(s1Status('no status line')).toMatchObject({ gsc: 'RED', bing: 'RED', known: false });
  });

  // Orchestrator, 2026-11-23: a footer change is not worth Google quota on an
  // indexed T1 page either; T1 is re-requested only after its own change.
  it('a site-wide lastmod (a footer change) is not a reason to request ANY indexed page, T1 included', () => {
    const sm = new Map([...BASE].map(([p]) => [p, '2026-11-23']));
    expect(sitewideDays(sm).has('2026-11-23')).toBe(true);
    const status = Object.fromEntries([...sm.keys()].map(p => [p, { verdict: 'PASS', coverage_state: 'Submitted and indexed', last_crawled: '2026-11-01' }]));
    const r = evaluate(ctx({ sitemap: sm, status }));
    expect(r.queued).toEqual([]);
  });

  it('a T1 page with its own change (not a site-wide day) is still queued', () => {
    const sm = new Map([...BASE].map(([p]) => [p, '2026-11-23']));
    sm.set('/sql-exercises/', '2026-11-24');
    const status = Object.fromEntries([...sm.keys()].map(p => [p, { verdict: 'PASS', coverage_state: 'Submitted and indexed', last_crawled: '2026-11-01' }]));
    const r = evaluate(ctx({ sitemap: sm, status }));
    expect(paths(r.queued)).toEqual(['/sql-exercises/']);
  });

  it('a pending page behind a live marker waits until the marker is seen live', () => {
    const t = tiers({ pending: [{ path: '/challenges/cte/', tier: 2, added: '2026-11-23', source: '#260', gate: { liveMarker: 'topic-learn:start' } }] });
    const status = { '/challenges/cte/': { verdict: 'PASS', coverage_state: 'Submitted and indexed', last_crawled: '2026-11-12' } };
    const sm = new Map([...BASE].map(([p]) => [p, '2026-11-23']));
    const off = evaluate(ctx({ sitemap: sm, tiers: t, status }));
    expect(paths(off.queued)).not.toContain('/challenges/cte/');
    const on = evaluate(ctx({ sitemap: sm, tiers: t, status, live: { '/challenges/cte/': { problems: [], markerSeen: { 'topic-learn:start': true } } } }));
    expect(paths(on.queued)).toContain('/challenges/cte/');
  });
});

describe('the request log', () => {
  const ok = { requests: [{ url: U('/'), engine: 'gsc', date: '2026-11-24', by: 'founder', result: 'requested' }] };

  it('the committed log is valid and carries no e-mail address', () => {
    const log = JSON.parse(fs.readFileSync(new URL('../docs/agent/index-requests.json', import.meta.url), 'utf8'));
    expect(validateLog(log)).toEqual([]);
    expect(JSON.stringify(log)).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  });

  it('rejects an e-mail address anywhere, and any key beyond url/engine/date/by/result', () => {
    expect(validateLog(ok)).toEqual([]);
    expect(validateLog({ requests: [{ ...ok.requests[0], by: 'someone@example.com' }] }).join()).toMatch(/e-mail/);
    expect(validateLog({ requests: [{ ...ok.requests[0], note: 'x' }] }).join()).toMatch(/carries note/);
    expect(validateLog({ requests: [{ ...ok.requests[0], engine: 'yandex' }] }).join()).toMatch(/engine/);
  });
});

describe('live preconditions', () => {
  const page = (html, { status = 200, headers = {} } = {}) => async () => ({ status, ok: status === 200, headers: { get: (k) => headers[k.toLowerCase()] ?? null }, text: async () => html });
  const good = (p) => `<meta name="robots" content="index, follow"><link rel="canonical" href="${SITE}${p}"> topic-learn:start`;
  const now = Date.parse('2026-11-24T16:00:00Z');
  const deployedAt = '2026-11-24T10:00:00Z';

  it('passes a 200 page with a self canonical, in the sitemap, deployed over an hour ago', async () => {
    const r = await liveCheck('/a/', { engine: 'gsc', fetchImpl: page(good('/a/')), liveSitemap: new Map([['/a/', null]]), markers: ['topic-learn:start'], now, deployedAt });
    expect(r.problems).toEqual([]);
    expect(r.markerSeen['topic-learn:start']).toBe(true);
  });

  it('fails a redirect, a noindex for the engine, a foreign canonical, a missing sitemap entry, a fresh deploy', async () => {
    const sm = new Map([['/a/', null]]);
    expect((await liveCheck('/a/', { engine: 'gsc', fetchImpl: page('', { status: 308, headers: { location: '/b/' } }), liveSitemap: sm, now, deployedAt })).problems.join()).toMatch(/HTTP 308/);
    expect((await liveCheck('/a/', { engine: 'bing', fetchImpl: page(good('/a/') + '<meta name="bingbot" content="noindex, follow">'), liveSitemap: sm, now, deployedAt })).problems.join()).toMatch(/bingbot/);
    expect((await liveCheck('/a/', { engine: 'gsc', fetchImpl: page(good('/a/') + '<meta name="bingbot" content="noindex, follow">'), liveSitemap: sm, now, deployedAt })).problems).toEqual([]);
    expect((await liveCheck('/a/', { engine: 'gsc', fetchImpl: page(good('/a/'), { headers: { 'x-robots-tag': 'noindex' } }), liveSitemap: sm, now, deployedAt })).problems.join()).toMatch(/X-Robots-Tag/);
    expect((await liveCheck('/a/', { engine: 'gsc', fetchImpl: page(good('/b/')), liveSitemap: sm, now, deployedAt })).problems.join()).toMatch(/canonical/);
    expect((await liveCheck('/a/', { engine: 'gsc', fetchImpl: page(good('/a/')), liveSitemap: new Map(), now, deployedAt })).problems.join()).toMatch(/sitemap/);
    expect((await liveCheck('/a/', { engine: 'gsc', fetchImpl: page(good('/a/')), liveSitemap: sm, now, deployedAt: '2026-11-24T15:30:00Z' })).problems.join()).toMatch(/min ago/);
  });
});
