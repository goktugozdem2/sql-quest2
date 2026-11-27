// scripts/scorecard-weekly.sql (A01, 2026-11-25): the weekly scorecard on
// bot-filtered people. Two kinds of guard:
//   1. source guards — the four queries share ONE exclusion block, money is
//      read from the webhook only, trials and payments stay separate, and no
//      query selects an identifier;
//   2. execution — every query runs on PGlite (real Postgres, in process)
//      over a seeded fixture whose answer was computed by hand, so a syntax
//      error or a broken filter fails by name.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const SQL = fs.readFileSync(new URL('../scripts/scorecard-weekly.sql', import.meta.url), 'utf8');

/** The file's queries, keyed by number, each runnable on its own. */
export function queries(text) {
  const parts = text.split(/^-- ===== Query (\d+):.*$/m);
  const out = {};
  for (let i = 1; i < parts.length; i += 2) out[parts[i]] = parts[i + 1];
  return out;
}
const Q = queries(SQL);
const stripComments = (s) => s.replace(/--[^\n]*/g, '');
const base = (q) => {
  const a = q.indexOf('-- base:begin');
  const b = q.indexOf('-- base:end');
  if (a < 0 || b < a) throw new Error('base markers missing');
  return q.slice(a, b);
};

describe('scorecard-weekly.sql — source guards', () => {
  it('has the four queries', () => {
    expect(Object.keys(Q)).toEqual(['1', '2', '3', '4']);
  });

  it('queries 1, 2 and 4 carry the identical exclusion block', () => {
    expect(base(Q['2'])).toBe(base(Q['1']));
    expect(base(Q['4'])).toBe(base(Q['1']));
  });

  it('the exclusion block holds every README rule 2 filter', () => {
    const b = stripComments(base(Q['1']));
    expect(b).toContain("'^(test|qa_|fabletest|linktest|internalroutine|sqlquest$|elena$)'");
    expect(b).toContain("'363dfb2bc1314757acc88c8438c4d2ea'");
    for (const vp of ['tablet:800x600', 'desktop:1280x1200', 'desktop:1919x992', 'desktop:1024x1024']) {
      expect(b).toContain(`'${vp}'`);
    }
    expect(b).toMatch(/aocr/);
    expect(b).toMatch(/m->>'bot'/);
    for (const rule of ['app1lang', 'topic1lang', 'prestamp_fp', 'utc1280', 'cn_app', 'utc_landing', 'cn_reader', 'langs2', 'google_ua', 'google_ua:notebooklm']) {
      expect(b).toContain(`'${rule}'`);
    }
    expect(b).toContain("m->>'ua' ~ '(GoogleOther|Google-NotebookLM)'");
    expect(b).toContain("(e.metadata #>> '{}')::jsonb");
    expect(b).toContain("COALESCE(x.m->>'aid', e.username)");
  });

  it('money is the webhook only, and trials and payments are separate columns', () => {
    const q = stripComments(Q['1']);
    expect(q).toMatch(/e\.reason = 'stripe_webhook'/);
    expect(q).toMatch(/FILTER \(WHERE e\.event = 'pro_trial_started'\)\s+AS trials/);
    expect(q).toMatch(/FILTER \(WHERE e\.event = 'pro_purchase_completed'\) AS payments/);
  });

  it('no query selects an identifier (the repo is public; aggregates only)', () => {
    for (const k of ['1', '2', '4']) {
      const last = stripComments(Q[k]).split(/\)\s*SELECT/i).pop();
      expect(last).not.toMatch(/\b(username|pid|aid|email)\b\s*(,|$|AS)/im);
    }
    const mrr = stripComments(Q['3']);
    expect(mrr.split(/FROM live l WHERE/).pop()).not.toMatch(/\busername\b/);
  });
});

// ---- execution on PGlite ------------------------------------------------
// Week W-2 = the second complete ISO week before this one (its 7-day runway
// is complete); W-1 = the last complete week. Times are offsets from W-2's
// Tuesday 10:00 UTC, so the fixture never depends on today's date.
const T = (h) => `(date_trunc('week', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' - interval '13 days' + interval '10 hours' + interval '${h} hours')`;
const ev = (event, reason, username, h, meta) =>
  `('${event}', '${reason}', ${username ? `'${username}'` : 'null'}, ${T(h)}, '${JSON.stringify(meta).replace(/'/g, "''")}'::jsonb)`;

const ROWS = [
  // A — human: Google → company page → app → six solves on day 0 → returns day 2
  ev('landing_view', 'landing', null, 0, { aid: 'a1', page: 'wise-sql-interview', landingSrc: 'search:google', tz: 'Asia/Kolkata' }),
  ev('app_opened', 'activation_funnel', 'alice', 0.1, { aid: 'a1', landingSrc: 'search:google', langs: 3, tz: 'Asia/Kolkata' }),
  ...[1, 2, 3, 4, 5, 6].map((c) => ev('challenge_solved', 'activation_funnel', 'alice', 0.2 + c / 100, { aid: 'a1', challengeId: c })),
  ev('challenge_solved', 'activation_funnel', 'alice', 0.3, { aid: 'a1', challengeId: 1 }), // a re-solve is not depth
  ev('pro_modal_shown', 'activation_funnel', 'alice', 0.4, { aid: 'a1' }),
  ev('pro_checkout_clicked', 'activation_funnel', 'alice', 0.5, { aid: 'a1' }),
  ev('app_opened', 'activation_funnel', 'alice', 48, { aid: 'a1', landingSrc: 'search:google', langs: 3 }),
  // B — human: typed the homepage, opened the app, never solved
  ev('landing_view', 'landing', null, 1, { aid: 'b1', page: 'home', tz: 'America/New_York' }),
  ev('app_opened', 'activation_funnel', null, 1.1, { aid: 'b1', langs: 2, arrivalSrc: 'home', tz: 'America/New_York' }),
  // H — human: ChatGPT → blog → one solve on day 0, never back
  ev('landing_view', 'landing', null, 2, { aid: 'h1', page: 'blog/sql-joins-explained', landingSrc: 'ai:chatgpt', tz: 'Europe/London' }),
  ev('app_opened', 'activation_funnel', null, 2.1, { aid: 'h1', landingSrc: 'ai:chatgpt', langs: 2 }),
  ev('challenge_solved', 'activation_funnel', null, 2.2, { aid: 'h1', challengeId: 91 }),
  // not people
  ev('landing_view', 'landing', null, 3, { aid: 'c1', page: 'questions/x', viewport: 'tablet:800x600' }),       // viewport
  ev('app_opened', 'activation_funnel', null, 3, { aid: 'd1', langs: 1, arrivalSrc: 'stripe-sql-interview' }),  // app1lang
  ev('app_opened', 'activation_funnel', 'test_e', 3, { aid: 'e1', langs: 3 }),                                   // internal
  ev('landing_view', 'landing', null, 3, { aid: '363dfb2bc1314757acc88c8438c4d2ea', page: 'home' }),             // walk aid
  ev('landing_view', 'landing', null, 3, { aid: 'g1', page: 'blog/x', tz: 'UTC', landingSrc: 'search:bing' }),   // utc_landing:
  // the rule is dated (from 2026-11-22), and one later row marks the whole browser
  `('landing_view', 'landing', null, now() - interval '1 minute', '{"aid":"g1","page":"home","tz":"UTC"}'::jsonb)`,
  ev('landing_view', 'landing', null, 4, { aid: 'k1', page: 'home', bot: 'utc1280x720' }),                       // bot stamp
  ev('app_opened', 'activation_funnel', null, 4, { aid: 'u1', tz: 'UTC', viewport: 'desktop:1280x720', landingSrc: 'search:google' }), // utc1280, spoofed source
  ev('app_opened', 'activation_funnel', null, 4, { aid: 'n1', tz: 'Asia/Hong_Kong', viewport: 'desktop:1366x768', arrivalSrc: 'question' }), // cn_app
  // google_ua (C8 2026-11-25): Google's unstamped fetchers — LA zone, no source, no window size
  ev('landing_view', 'landing', null, 4, { aid: 'o1', page: 'questions/y', tz: 'America/Los_Angeles',
    ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GoogleOther) Chrome/141.0.7390.122 Safari/537.36' }),
  ev('landing_view', 'landing', null, 4, { aid: 'l1', page: 'sql-practice-comparison', tz: 'America/Los_Angeles', ua: 'Google-NotebookLM' }),
  // money (webhook rows carry a username, no aid; one is a JSON string, as in production)
  ev('pro_trial_started', 'stripe_webhook', 'alice', 5, { plan_type: 'monthly' }),
  ev('pro_trial_started', 'activation_funnel', 'alice', 5, { aid: 'a1' }), // client echo: never money
  `('pro_purchase_completed', 'stripe_webhook', 'alice', ${T(24 * 7 + 5)}, to_jsonb('{"amount_cents":2900,"plan_type":"monthly"}'::text))`,
  ev('pro_payment_failed', 'stripe_webhook', 'bob', 6, { invoice_id: 'in_1' }),
  ev('pro_payment_failed', 'stripe_webhook', 'bob', 6.1, { invoice_id: 'in_1' }), // 3DS retry, same invoice
  ev('pro_purchase_completed', 'stripe_webhook', 'test_e', 6, { amount_cents: 9900 }), // internal: never money
];

const USERS = [
  `('alice', '{"proStatus":true,"proType":"monthly","proAutoRenew":true,"proTrial":false,"stripeCustomerId":"cus_a","proExpiry":"2099-01-01T00:00:00Z"}')`,
  `('bob', '{"proStatus":true,"proType":"annual","proAutoRenew":true,"stripeCustomerId":"cus_b","proExpiry":4070908800000}')`,
  `('carol', '{"proStatus":true,"proType":"monthly","proAutoRenew":true,"proTrial":true,"stripeCustomerId":"cus_c","proExpiry":"2099-01-01T00:00:00Z"}')`,
  `('dave', '{"proStatus":true,"proType":"lifetime","proAutoRenew":false,"proExpiry":"2099-12-31T00:00:00Z"}')`,
  `('erin', '{"proStatus":true,"proType":"monthly","proAutoRenew":true,"stripeCustomerId":"cus_e","proExpiry":"2001-01-01T00:00:00Z"}')`,
  `('test_e', '{"proStatus":true,"proType":"annual","proAutoRenew":true,"stripeCustomerId":"cus_t","proExpiry":"2099-01-01T00:00:00Z"}')`,
];

describe('scorecard-weekly.sql — runs on Postgres over a hand-computed fixture', () => {
  let db;
  const run = async (k) => (await db.query(Q[k])).rows;

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      CREATE TABLE public.pro_events (event text, reason text, username text, created_at timestamptz, metadata jsonb);
      CREATE TABLE public.users (username text primary key, data jsonb);
      SET TIME ZONE 'UTC';
    `);
    await db.exec(`INSERT INTO public.pro_events VALUES ${ROWS.join(',\n')};`);
    await db.exec(`INSERT INTO public.users VALUES ${USERS.join(',\n')};`);
  }, 60_000);
  afterAll(async () => { await db?.close(); });

  it('query 1: eight ISO weeks, oldest first, latest runway incomplete', async () => {
    const rows = await run('1');
    expect(rows).toHaveLength(8);
    expect(rows[7].runway_complete).toBe(false);
    expect(rows[6].runway_complete).toBe(true);
  });

  it('query 1: raw vs human visitors on the fixture week', async () => {
    const w = (await run('1'))[6];
    expect(Number(w.raw_visitors)).toBe(13);
    expect(Number(w.human_visitors)).toBe(3);
    expect(Number(w.gap_pct)).toBe(76.9);
  });

  it('query 1: openers, activation, six-solvers and the day-0 return', async () => {
    const w = (await run('1'))[6];
    expect(Number(w.app_openers)).toBe(3);
    expect(Number(w.new_openers)).toBe(3);
    expect(Number(w.activated_7d)).toBe(2);
    expect(Number(w.solvers)).toBe(2);
    expect(Number(w.new_six_solvers)).toBe(1);
    expect(Number(w.day0_solvers)).toBe(2);
    expect(Number(w.returned_7d)).toBe(1);
    expect(Number(w.modal_people)).toBe(1);
    expect(Number(w.checkout_people)).toBe(1);
  });

  it('query 1: trials, payments and failed charges from the webhook only, never added', async () => {
    const rows = await run('1');
    expect(Number(rows[6].trials)).toBe(1);
    expect(Number(rows[6].payments)).toBe(0);
    expect(Number(rows[6].failed_charges)).toBe(1);
    expect(Number(rows[7].trials)).toBe(0);
    expect(Number(rows[7].payments)).toBe(1);
    expect(Number(rows[7].paid_usd)).toBe(29);
    expect(Number(rows[7].human_visitors)).toBe(0);
  });

  it('query 2: source, country and page group of the three people', async () => {
    const rows = await run('2');
    const wk = (await run('1'))[6].iso_week;
    const get = (dim, seg) => Number(rows.find((r) => r.iso_week === wk && r.dim === dim && r.seg === seg)?.people ?? 0);
    expect(get('source', 'search:google')).toBe(1);
    expect(get('source', 'ai')).toBe(1);
    expect(get('source', 'direct/home')).toBe(1);
    expect(get('page', 'company')).toBe(1);
    expect(get('page', 'home')).toBe(1);
    expect(get('page', 'blog')).toBe(1);
    expect(get('country', 'IN')).toBe(1);
    expect(get('country', 'US')).toBe(1);
    expect(get('country', 'GB')).toBe(1);
  });

  it('query 3: MRR counts paying subscribers only, at the price they pay', async () => {
    const [r] = await run('3');
    expect(Number(r.paying_subscribers)).toBe(2);
    expect(Number(r.monthly)).toBe(1);
    expect(Number(r.annual)).toBe(1);
    expect(Number(r.mrr_usd)).toBe(37.25); // 29 (webhook amount) + 99 / 12 (list price)
    expect(Number(r.in_trial)).toBe(1);
    expect(Number(r.other_live_pro)).toBe(1);
  });

  it('query 4: every excluded person is named by the rule that removed them', async () => {
    const wk = (await run('1'))[6].iso_week;
    const rows = (await run('4')).filter((r) => r.iso_week === wk);
    const by = Object.fromEntries(rows.map((r) => [r.bucket, Number(r.people)]));
    expect(by).toEqual({
      '(human)': 3, viewport: 1, app1lang: 1, internal: 1, founder: 1, utc_landing: 1, bot_stamp: 1, utc1280: 1, cn_app: 1,
      google_ua: 1, 'google_ua:notebooklm': 1,
    });
  });
});
