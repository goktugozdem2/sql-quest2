// scripts/tournament-read.sql + scripts/tournament-posteriors.mjs — the
// first-session tournament's weekly read (2026-11-26, PR 1 of 4, shipped
// before any arm changes behaviour; metric first_session_tournament).
//   1. source guards — the human filter is scorecard-weekly.sql's, byte for
//      byte; the cohort block is one block; the registry VALUES mirror
//      src/data/tournament-arms.js;
//   2. execution on PGlite over a fixture whose answer was worked by hand;
//   3. the posteriors and the rules.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { TOURNAMENT_ARMS } from '../src/data/tournament-arms.js';
import { posteriors, decide, armsFromRows, simulate } from '../scripts/tournament-posteriors.mjs';

const SQL = fs.readFileSync(new URL('../scripts/tournament-read.sql', import.meta.url), 'utf8');
const SCORECARD = fs.readFileSync(new URL('../scripts/scorecard-weekly.sql', import.meta.url), 'utf8');

function queries(text) {
  const parts = text.split(/^-- ===== Query (\d+):.*$/m);
  const out = {};
  for (let i = 1; i < parts.length; i += 2) out[parts[i]] = parts[i + 1];
  return out;
}
const Q = queries(SQL);
const between = (s, a, b) => {
  const i = s.indexOf(a);
  const j = s.indexOf(b, i);
  if (i < 0 || j < i) throw new Error(`markers missing: ${a} / ${b}`);
  return s.slice(i + a.length, j);
};
const scorecardHumans = (() => {
  const base = between(SCORECARD, '-- base:begin', '-- base:end');
  return base.slice(base.indexOf('evp AS ('), base.indexOf('clean AS ('));
})();
const humans = (q) => {
  const b = between(q, '-- humans:begin', '-- humans:end');
  return b.slice(b.indexOf('evp AS ('));
};

describe('tournament-read.sql — source guards', () => {
  it('has the three queries', () => {
    expect(Object.keys(Q)).toEqual(['1', '2', '3']);
  });

  it('every query carries scorecard-weekly.sql\'s human filter, byte for byte', () => {
    expect(scorecardHumans.length).toBeGreaterThan(1000);
    for (const k of ['1', '2', '3']) expect(humans(Q[k])).toBe(scorecardHumans);
  });

  it('queries 1 and 2 share one cohort block', () => {
    expect(between(Q['2'], '-- tournament:begin', '-- tournament:end')).toBe(between(Q['1'], '-- tournament:begin', '-- tournament:end'));
  });

  it('the registry VALUES mirror src/data/tournament-arms.js (every arm that has started, its version, start, control, active)', () => {
    const want = TOURNAMENT_ARMS.filter(a => a.startDate).map(a =>
      `('${a.id}', ${a.armVersion}, timestamptz '${a.startDate} 00:00+00', ${a.permanent === true}, ${a.status === 'active'})`);
    for (const k of ['1', '2', '3']) {
      const block = between(Q[k], '-- tournament-registry:begin', '-- tournament-registry:end');
      const rows = block.split('\n').slice(1).map(l => l.trim().replace(/,$/, '')).filter(l => l.startsWith('('));
      expect(rows).toEqual(expect.arrayContaining(want));
      // Anything else is an OLDER version of a registered arm, kept so its
      // final numbers stay readable — never an unknown arm.
      for (const extra of rows.filter(r => !want.includes(r))) {
        const [, id, v] = extra.match(/^\('([^']+)', (\d+),/) || [];
        const entry = TOURNAMENT_ARMS.find(a => a.id === id);
        expect(entry, extra).toBeTruthy();
        expect(Number(v)).toBeLessThan(entry.armVersion);
      }
    }
  });

  it('money is the webhook only, trials and payments separate, the shared "guest" name never bridges', () => {
    const q = Q['1'];
    expect(q).toMatch(/w\.reason = 'stripe_webhook'/);
    expect(q).toMatch(/AS trials_30d/);
    expect(q).toMatch(/AS paid_30d/);
    expect(q).not.toMatch(/trials_30d \+|\+ paid_30d/);
    expect(q).toMatch(/e\.username <> 'guest'/);
  });

});

// ── execution ────────────────────────────────────────────────────────────────
// The registry's start (2026-12-10) is after today in the fixture's clock, so
// the test moves `since` and the start dates 60 days back.
const LAUNCH = "timestamptz '2026-12-10 00:00+00'";
const runnable = (q) => q.split(LAUNCH).join("(now() - interval '60 days')");
const T0 = 40 * 24; // hours ago: every eligible person's t0
const at = (hAfterT0, t0 = T0) => `now() - interval '${t0 - hAfterT0} hours'`;
const row = (event, reason, username, when, meta) =>
  `('${event}', '${reason}', ${username ? `'${username}'` : 'null'}, ${when}, '${JSON.stringify(meta)}'::jsonb)`;
const base = { tz: 'Europe/Berlin', landingSrc: 'search:bing' };
const assigned = (aid, arm, h = 0, t0 = T0, extra = {}) => row('tournament_assigned', 'activation_funnel', 'guest', at(h, t0),
  { ...base, aid, test: 'first_session_tournament_v1', arm, armVersion: 1, round: 1, viewport: 'desktop:1366x768', ...extra });
const opened = (aid, arrivalSrc, h = 0, t0 = T0, extra = {}) => row('app_opened', 'activation_funnel', 'guest', at(h - 0.01, t0), { ...base, aid, arrivalSrc, ...extra });
const solved = (aid, cid, h, t0 = T0, username = 'guest') => row('challenge_solved', 'activation_funnel', username, at(h, t0), { ...base, aid, challengeId: cid });

const ROWS = [
  // a1 — control, quota arm, home door: 6 distinct solves in 7 d (one repeat),
  // first inside 10 min, back on day 2; trial then payment as `alice`.
  opened('a1', 'home'), assigned('a1', 'A_control', 0, T0, { fqArm: 'quota' }),
  solved('a1', 91, 0.1), solved('a1', 92, 1), solved('a1', 92, 2), solved('a1', 93, 3),
  solved('a1', 94, 30, T0, 'alice'), solved('a1', 95, 31, T0, 'alice'), solved('a1', 96, 32, T0, 'alice'),
  row('pro_trial_started', 'stripe_webhook', 'alice', at(72), {}),
  row('pro_purchase_completed', 'stripe_webhook', 'alice', at(24 * 10), { amount_cents: 2900 }),
  // a2 — control, holdout arm, phone: 5 solves, one at 5 min; a quota-wall
  // modal (but the holdout is never in the wall's denominator).
  opened('a2', 'home', 0, T0, { viewport: 'mobile:390x844' }),
  assigned('a2', 'A_control', 0, T0, { fqArm: 'holdout', viewport: 'mobile:390x844' }),
  solved('a2', 91, 0.08), solved('a2', 92, 1), solved('a2', 93, 2), solved('a2', 94, 3), solved('a2', 95, 4),
  row('pro_modal_shown', 'activation_funnel', 'guest', at(5), { ...base, aid: 'a2', reason: 'free_quota' }),
  // a3 — control, quota arm, Capital One page: interview_target; meets the
  // quota wall on day 1; 6 solves but the 6th on day 8 (not inside 7 d).
  opened('a3', 'capital-one-sql-interview'), assigned('a3', 'A_control', 0, T0, { fqArm: 'quota' }),
  row('content_lock_reached', 'activation_funnel', 'guest', at(24), { ...base, aid: 'a3', wall: 'free_quota' }),
  solved('a3', 91, 1), solved('a3', 92, 2), solved('a3', 93, 3), solved('a3', 94, 4), solved('a3', 95, 5), solved('a3', 96, 24 * 8),
  // b1 — B: 7 solves, the first at 20 min; a plan click; later carries the
  // `alice` username too (alice is credited to a1, the earlier t0); one later
  // row stamped with another arm (the health query's mismatch).
  opened('b1', 'home', 0, T0 - 24), assigned('b1', 'B_single_path', 0, T0 - 24),
  ...[91, 92, 93, 94, 95, 96, 97].map((cid, i) => solved('b1', cid, 0.34 + i, T0 - 24)),
  row('pro_plan_clicked', 'activation_funnel', 'alice', at(26, T0 - 24), { ...base, aid: 'b1', tArm: 'A_control' }),
  // b2 — B, assigned two days ago: not eligible yet.
  opened('b2', 'home', 0, 48), assigned('b2', 'B_single_path', 0, 48), solved('b2', 91, 1, 48),
  // b3 — B, a stamped bot: never a person.
  opened('b3', 'home', 0, T0, { wd: true }), assigned('b3', 'B_single_path'),
  // d1 — D, no solves; a second tournament_assigned row (a dup).
  opened('d1', 'company:Stripe'), assigned('d1', 'D_interview_sprint'), assigned('d1', 'A_control', 5),
  // x1 — assigned before `since`: outside every read.
  opened('x1', 'home', 0, 70 * 24), assigned('x1', 'A_control', 0, 70 * 24), solved('x1', 91, 1, 70 * 24),
  // tx — an internal account: never a person.
  row('app_opened', 'activation_funnel', 'test_x', at(0), { ...base, aid: 'tx' }),
  row('tournament_assigned', 'activation_funnel', 'test_x', at(0), { ...base, aid: 'tx', arm: 'A_control', armVersion: 1 }),
];

describe('tournament-read.sql — runs on Postgres over a hand-worked fixture', () => {
  let db;
  const run = async (k) => (await db.query(runnable(Q[k]))).rows;

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      CREATE TABLE public.pro_events (event text, reason text, username text, created_at timestamptz, metadata jsonb);
      SET TIME ZONE 'UTC';
    `);
    await db.exec(`INSERT INTO public.pro_events VALUES ${ROWS.join(',\n')};`);
  }, 60_000);
  afterAll(async () => { await db?.close(); });

  it('no query returns an identifier (aggregates only)', async () => {
    for (const k of ['1', '2', '3']) {
      const rows = await run(k);
      expect(rows.length).toBeGreaterThan(0);
      for (const r of rows) {
        for (const col of Object.keys(r)) expect(['pid', 'username', 'aid', 'email']).not.toContain(col);
        for (const v of Object.values(r)) expect(['a1', 'a2', 'a3', 'b1', 'b2', 'b3', 'd1', 'alice', 'tx']).not.toContain(v);
      }
    }
  });

  it('query 1: one row per registered arm, control first', async () => {
    const rows = await run('1');
    expect(rows.map(r => r.arm)).toEqual(['A_control', 'B_single_path', 'D_interview_sprint']);
    expect(rows[0].is_control).toBe(true);
  });

  it('query 1: control — 3 eligible humans, 1 six-solver, the guardrails and the money', async () => {
    const a = (await run('1'))[0];
    expect(Number(a.assigned)).toBe(3);
    expect(Number(a.eligible_7d)).toBe(3);
    expect(Number(a.six_7d)).toBe(1);
    expect(Number(a.six_7d_pct)).toBe(33.3);
    expect(Number(a.alpha)).toBe(2);
    expect(Number(a.beta)).toBe(3);
    expect(Number(a.post_mean)).toBe(0.4);
    expect(Number(a.solve_10m_pct)).toBe(66.7);
    expect(Number(a.second_7d_pct)).toBe(66.7);
    expect(Number(a.quota_eligible_7d)).toBe(2);
    expect(Number(a.quota_wall_7d_pct)).toBe(50);
    expect(Number(a.plan_click_7d_pct)).toBe(0);
    expect(Number(a.eligible_30d)).toBe(3);
    expect(Number(a.trials_30d)).toBe(1);
    expect(Number(a.paid_30d)).toBe(1);
  });

  it('query 1: B — the bot and the not-yet-eligible are out; alice\'s money stays with a1', async () => {
    const b = (await run('1'))[1];
    expect(Number(b.assigned)).toBe(2);
    expect(Number(b.eligible_7d)).toBe(1);
    expect(Number(b.six_7d)).toBe(1);
    expect(Number(b.solve_10m_pct)).toBe(0);
    expect(Number(b.plan_click_7d_pct)).toBe(100);
    expect(Number(b.trials_30d)).toBe(0);
    expect(Number(b.paid_30d)).toBe(0);
  });

  it('query 1: D — counted by the FIRST assignment row', async () => {
    const d = (await run('1'))[2];
    expect(Number(d.assigned)).toBe(1);
    expect(Number(d.six_7d)).toBe(0);
  });

  it('query 2: the segment, device and fqArm splits', async () => {
    const rows = await run('2');
    const get = (split, value, arm) => rows.find(r => r.split === split && r.value === value && r.arm === arm);
    expect(Number(get('segment', 'interview_target', 'A_control').eligible_7d)).toBe(1);
    expect(Number(get('segment', 'other', 'A_control').eligible_7d)).toBe(2);
    expect(Number(get('segment', 'other', 'A_control').six_7d)).toBe(1);
    expect(Number(get('segment', 'interview_target', 'D_interview_sprint').eligible_7d)).toBe(1);
    expect(Number(get('device', 'mobile', 'A_control').eligible_7d)).toBe(1);
    expect(Number(get('device', 'desktop', 'A_control').eligible_7d)).toBe(2);
    expect(Number(get('fq_arm', 'quota', 'A_control').eligible_7d)).toBe(2);
    expect(Number(get('fq_arm', 'holdout', 'A_control').eligible_7d)).toBe(1);
    expect(Number(get('fq_arm', 'none', 'B_single_path').eligible_7d)).toBe(1);
  });

  it('query 3: raw vs human, the shares, the duplicate and the mismatched stamp', async () => {
    const rows = await run('3');
    const by = Object.fromEntries(rows.map(r => [r.arm, r]));
    expect(Number(by.A_control.assigned_raw)).toBe(4);       // a1 a2 a3 + internal tx
    expect(Number(by.A_control.assigned_human)).toBe(3);
    expect(Number(by.B_single_path.assigned_raw)).toBe(3);   // b1 b2 + bot b3
    expect(Number(by.B_single_path.assigned_human)).toBe(2);
    expect(Number(by.A_control.human_share_pct)).toBe(50);
    expect(Number(by.D_interview_sprint.human_share_pct)).toBe(16.7);
    expect(Number(by.A_control.expected_share_pct)).toBe(33.3);
    expect(Number(by.D_interview_sprint.people_with_dup_rows)).toBe(1);
    expect(Number(by.B_single_path.people_tarm_mismatch)).toBe(1);
    expect(Number(by.A_control.people_tarm_mismatch)).toBe(0);
  });
});

describe('tournament-posteriors.mjs — the posteriors and the rules', () => {
  const rows = (a, b, d, n = 160) => [
    { arm: 'A_control', is_control: true, eligible_7d: n, six_7d: a, solve_10m_pct: 23 },
    { arm: 'B_single_path', is_control: false, eligible_7d: n, six_7d: b, solve_10m_pct: 24 },
    { arm: 'D_interview_sprint', is_control: false, eligible_7d: n, six_7d: d, solve_10m_pct: 22 },
  ];

  it('is seeded: the same counts give the same numbers', () => {
    expect(posteriors(rows(19, 25, 12))).toEqual(posteriors(rows(19, 25, 12)));
  });

  it('equal arms sit near 0.5 / 0.5; a clear winner near 1, a clear loser near the worst', () => {
    const eq = posteriors(rows(19, 19, 19));
    for (const p of eq.filter(x => !x.isControl)) {
      expect(Math.abs(p.pBetterThanControl - 0.5)).toBeLessThan(0.03);
      expect(Math.abs(p.pWorstAmongChallengers - 0.5)).toBeLessThan(0.03);
    }
    const clear = posteriors(rows(19, 40, 8));
    expect(clear[1].pBetterThanControl).toBeGreaterThan(0.99);
    expect(clear[2].pWorstAmongChallengers).toBeGreaterThan(0.99);
    expect(clear[0].postMean).toBeCloseTo(20 / 162, 6);
  });

  it('the gate holds every verdict until each challenger has 150 eligible', () => {
    const out = decide(posteriors(rows(19, 40, 8, 149)));
    expect(out[1].verdict).toMatch(/^wait/);
    expect(out[2].verdict).toMatch(/^wait/);
  });

  it('eliminates at P(worst) ≥ 0.80; promotes only on the second consecutive read ≥ 0.95', () => {
    const now = decide(posteriors(rows(19, 40, 8)));
    expect(now[2].verdict).toMatch(/^ELIMINATE/);
    expect(now[1].verdict).toMatch(/^promote candidate/);
    const next = decide(posteriors(rows(19, 40, 8)), { previous: now });
    expect(next[1].verdict).toMatch(/^PROMOTE/);
    expect(now[0].verdict).toMatch(/^control/);
  });

  it('harm stop: solve_10m 10 points under control at ≥ 100 each, before the gate', () => {
    const r = rows(19, 19, 19, 120);
    r[2].solve_10m_pct = 12;
    expect(decide(posteriors(r))[2].verdict).toMatch(/^HARM STOP/);
  });

  it('refuses counts that cannot be right', () => {
    expect(() => armsFromRows([{ arm: 'A', eligible_7d: 3, six_7d: 4 }])).toThrow(/bad counts/);
    expect(() => posteriors([{ arm: 'B', is_control: false, eligible_7d: 3, six_7d: 1 }])).toThrow(/no control/);
  });

  it('reproduces the plan §5.5 table\'s shape (three arms, 150 each)', () => {
    const worse = simulate({ n: 150, rates: [0.118, 0.118, 0.07], runs: 200, draws: 1500 });
    expect(worse.eliminationFires).toBeGreaterThan(0.6);
    expect(worse.onTrueWorst).toBeGreaterThan(0.6);
  }, 30_000);
});
