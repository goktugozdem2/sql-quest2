// scripts/experiments-live.sql (B2, 2026-11-28): the live experiments, one
// query per test, for the founder's experiments page. Two kinds of guard:
//   1. source guards — every query carries scorecard-weekly.sql's human
//      filter byte for byte (the `base` block, incl. the a2a2% QA-aid rule
//      and the bot stamps), and no query selects an identifier;
//   2. execution — every query runs on PGlite (real Postgres, in process)
//      over a seeded fixture whose answer was computed by hand.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const SQL = fs.readFileSync(new URL('../scripts/experiments-live.sql', import.meta.url), 'utf8');
const SCORECARD = fs.readFileSync(new URL('../scripts/scorecard-weekly.sql', import.meta.url), 'utf8');

function queries(text) {
  const parts = text.split(/^-- ===== Query (\d+):.*$/m);
  const out = {};
  for (let i = 1; i < parts.length; i += 2) out[parts[i]] = parts[i + 1];
  return out;
}
const Q = queries(SQL);
const SC = queries(SCORECARD);
const stripComments = (s) => s.replace(/--[^\n]*/g, '');
const base = (q) => {
  const a = q.indexOf('-- base:begin');
  const b = q.indexOf('-- base:end');
  if (a < 0 || b < a) throw new Error('base markers missing');
  return q.slice(a, b);
};
const TESTS = { 1: 'free_quota_arm_assigned', 2: 'runnable_starter_assigned', 3: 'mobile_run_bar_assigned',
  4: 'company_direct_assigned', 5: 'tournament_assigned' };

describe('experiments-live.sql — source guards', () => {
  it('has one query per live test', () => {
    expect(Object.keys(Q)).toEqual(['1', '2', '3', '4', '5']);
    for (const [k, event] of Object.entries(TESTS)) expect(Q[k]).toContain(`event = '${event}'`);
  });

  it("every query's human filter is scorecard-weekly.sql's, byte for byte", () => {
    const scBase = base(SC['1']);
    for (const k of Object.keys(Q)) expect(base(Q[k]), `query ${k}`).toBe(scBase);
  });

  it('the shared filter still holds the QA-aid prefix, the bot stamps and the double-decoded metadata', () => {
    const b = stripComments(base(Q['1']));
    expect(b).toContain("m->>'aid' LIKE 'a2a2%'");
    expect(b).toMatch(/m->>'bot'/);
    expect(b).toContain("m->>'uaBot' = 'true'");
    expect(b).toContain("(e.metadata #>> '{}')::jsonb");
    expect(b).toContain("COALESCE(x.m->>'aid', e.username)");
  });

  it('the experiment reads only human rows (clean), never the raw evp', () => {
    for (const k of Object.keys(Q)) {
      const after = stripComments(Q[k].slice(Q[k].indexOf('-- base:end')));
      expect(after, `query ${k}`).not.toMatch(/\bFROM evp\b/);
      expect(after, `query ${k}`).toMatch(/FROM clean WHERE event = /);
    }
  });

  it('no query selects an identifier (aggregates only)', () => {
    for (const k of Object.keys(Q)) {
      const last = stripComments(Q[k]).split(/\)\s*SELECT/i).pop();
      expect(last).not.toMatch(/\b(username|pid|aid|email)\b\s*(,|$|AS)/im);
    }
  });
});

// ---- execution on PGlite ------------------------------------------------
// D(d, h) = d days before today's UTC midnight, plus h hours.
const D = (d, h) => `(date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' - interval '${d} days' + interval '${h} hours')`;
const ev = (event, reason, username, at, meta) =>
  `('${event}', '${reason}', ${username ? `'${username}'` : 'null'}, ${at}, to_jsonb('${JSON.stringify(meta).replace(/'/g, "''")}'::text))`;
const HUMAN = { langs: 3, landingSrc: 'search:google', tz: 'Europe/London', viewport: 'desktop:1440x900' };
const open = (aid, at, extra = {}) => ev('app_opened', 'activation_funnel', null, at, { aid, ...HUMAN, ...extra });
const act = (event, aid, at, meta = {}) => ev(event, 'activation_funnel', null, at, { aid, ...meta });

const ROWS = [
  // freeQuotaHoldout: h1 holdout, solves day 0, back on day 2 → returned
  open('h1', D(9, 10)),
  act('free_quota_arm_assigned', 'h1', D(9, 10), { arm: 'holdout' }),
  act('challenge_solved', 'h1', D(9, 10.1), { challengeId: 91 }),
  open('h1', D(7, 10)),
  // h2 quota, solves day 0, never back; h3 quota, assigned today (not matured)
  open('h2', D(9, 11)),
  act('free_quota_arm_assigned', 'h2', D(9, 11), { arm: 'quota' }),
  act('challenge_solved', 'h2', D(9, 11.1), { challengeId: 91 }),
  open('h3', D(0, 0)),
  act('free_quota_arm_assigned', 'h3', D(0, 0), { arm: 'quota' }),
  // runnableStarter: s1 starter ran it; s2 control ran another challenge; s3 control ran it
  open('s1', D(2, 10)),
  act('runnable_starter_assigned', 's1', D(2, 10), { arm: 'starter', challengeId: 105, viewport: 'desktop:1440x900' }),
  act('challenge_first_run', 's1', D(2, 10.1), { challengeId: 105, via: 'starter' }),
  open('s2', D(2, 10)),
  act('runnable_starter_assigned', 's2', D(2, 10), { arm: 'control', challengeId: 106, viewport: 'desktop:1440x900' }),
  act('challenge_first_run', 's2', D(2, 10.1), { challengeId: 107, via: 'run' }),
  open('s3', D(2, 10)),
  act('runnable_starter_assigned', 's3', D(2, 10), { arm: 'control', challengeId: 108, viewport: 'desktop:1440x900' }),
  act('challenge_first_run', 's3', D(2, 10.2), { challengeId: 108, via: 'run' }),
  // not people: a bot stamp, an A2 QA walk aid, a phone row in a desktop test
  open('s4', D(2, 10), { bot: 'true' }),
  act('runnable_starter_assigned', 's4', D(2, 10), { arm: 'starter', challengeId: 105, viewport: 'desktop:1440x900' }),
  open('a2a21128000000000000000000000001', D(2, 10)),
  act('runnable_starter_assigned', 'a2a21128000000000000000000000001', D(2, 10), { arm: 'starter', challengeId: 105, viewport: 'desktop:1440x900' }),
  act('challenge_first_run', 'a2a21128000000000000000000000001', D(2, 10.1), { challengeId: 105, via: 'run' }),
  open('s6', D(2, 10)),
  act('runnable_starter_assigned', 's6', D(2, 10), { arm: 'starter', challengeId: 105, viewport: 'mobile:390x844' }),
  // mobileRunBar: m1 is a walk guest of 2026-11-25 10:24–10:33 UTC (out); m2 bar ran it
  open('m1', `'2026-11-25 10:30+00'`, { viewport: 'mobile:375x812' }),
  act('mobile_run_bar_assigned', 'm1', `'2026-11-25 10:30+00'`, { arm: 'bar', challengeId: 105, viewport: 'mobile:375x812' }),
  open('m2', D(2, 12), { viewport: 'mobile:390x844' }),
  act('mobile_run_bar_assigned', 'm2', D(2, 12), { arm: 'bar', challengeId: 105, viewport: 'mobile:390x844' }),
  act('challenge_first_run', 'm2', D(2, 12.1), { challengeId: 105, via: 'run' }),
  // companyDirectOpen: c1 list solves in 6 minutes; c2 direct solves after 20
  open('c1', D(3, 10)),
  act('company_direct_assigned', 'c1', D(3, 10), { arm: 'list', company: 'Stripe' }),
  act('challenge_solved', 'c1', D(3, 10.1), { challengeId: 91 }),
  open('c2', D(3, 10)),
  act('company_direct_assigned', 'c2', D(3, 10), { arm: 'direct', company: 'Stripe' }),
  act('challenge_solved', 'c2', D(3, 10 + 20 / 60), { challengeId: 91 }),
];

describe('experiments-live.sql — runs on Postgres over a hand-computed fixture', () => {
  let db;
  const run = async (k) => {
    const rows = (await db.query(Q[k])).rows;
    return Object.fromEntries(rows.map((r) => [r.arm, r]));
  };
  const num = (v) => (v === null ? null : Number(v));

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      CREATE TABLE public.pro_events (event text, reason text, username text, created_at timestamptz, metadata jsonb);
      SET TIME ZONE 'UTC';
    `);
    await db.exec(`INSERT INTO public.pro_events VALUES ${ROWS.join(',\n')};`);
  }, 60_000);
  afterAll(async () => { await db?.close(); });

  it('freeQuotaHoldout: assigned, 7-day return of matured day-0 solvers, arm balance', async () => {
    const r = await run('1');
    expect(num(r.quota.assigned)).toBe(2);
    expect(num(r.quota.assigned_7d)).toBe(1);
    expect([num(r.quota.metric_n), num(r.quota.metric_k)]).toEqual([1, 0]);
    expect([num(r.holdout.metric_n), num(r.holdout.metric_k)]).toEqual([1, 1]);
    expect(num(r.holdout.rate)).toBe(100);
    // 2 vs 1 of 3: z = 0.577, two-sided p = 0.564
    expect(num(r.quota.balance_p)).toBeCloseTo(0.5637, 2);
  });

  it('runnableStarter: humans on desktop only; ran = first run on the assigned challenge', async () => {
    const r = await run('2');
    expect([num(r.starter.assigned), num(r.starter.metric_n), num(r.starter.metric_k)]).toEqual([1, 1, 1]);
    expect([num(r.control.assigned), num(r.control.metric_n), num(r.control.metric_k)]).toEqual([2, 2, 1]);
    // Wilson 95% on 1 / 2
    expect([num(r.control.rate), num(r.control.ci_low), num(r.control.ci_high)]).toEqual([50, 9.5, 90.5]);
    expect(num(r.starter.diff_pts)).toBe(50);
    // pooled z = 0.5 / sqrt(2/3 * 1/3 * 1.5) = 0.866 → p = 0.386
    expect(num(r.starter.p_two_sided)).toBeCloseTo(0.3865, 2);
    expect(r.control.p_two_sided).toBeNull();
  });

  it('mobileRunBar: the 11-25 walk guests are out', async () => {
    const r = await run('3');
    expect([num(r.bar.assigned), num(r.bar.metric_k)]).toEqual([1, 1]);
    expect(num(r.control.assigned)).toBe(0);
  });

  it('companyDirectOpen: a solve within 10 minutes of assignment', async () => {
    const r = await run('4');
    expect([num(r.list.metric_n), num(r.list.metric_k)]).toEqual([1, 1]);
    expect([num(r.direct.metric_n), num(r.direct.metric_k)]).toEqual([1, 0]);
  });

  it('firstSessionTournament: dark — every arm shows 0', async () => {
    const r = await run('5');
    expect(Object.keys(r).sort()).toEqual(['A_control', 'B_single_path', 'D_interview_sprint']);
    for (const a of Object.values(r)) {
      expect(num(a.assigned)).toBe(0);
      expect(a.rate).toBeNull();
    }
  });
});
