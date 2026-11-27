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
import crypto from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { TOURNAMENT_ARMS, TOURNAMENT_STRATA } from '../src/data/tournament-arms.js';
import {
  posteriors, decide, armsFromRows, simulate, stratumPosteriors, routeStrata, poststratifiedPosteriors,
} from '../scripts/tournament-posteriors.mjs';

const SQL = fs.readFileSync(new URL('../scripts/tournament-read.sql', import.meta.url), 'utf8');
const PEOPLE = fs.readFileSync(new URL('../scripts/tournament-people.sql', import.meta.url), 'utf8');
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
  it('has the four queries (4 = the decision table per stratum)', () => {
    expect(Object.keys(Q)).toEqual(['1', '2', '3', '4']);
  });

  it('every query — and the people file — carries scorecard-weekly.sql\'s human filter, byte for byte', () => {
    expect(scorecardHumans.length).toBeGreaterThan(1000);
    for (const k of ['1', '2', '3', '4']) expect(humans(Q[k])).toBe(scorecardHumans);
    expect(humans(PEOPLE)).toBe(scorecardHumans);
  });

  it('queries 1, 2 and 4 and the people file share one cohort block', () => {
    const block = between(Q['1'], '-- tournament:begin', '-- tournament:end');
    expect(block).toMatch(/AS stratum/);
    expect(between(Q['2'], '-- tournament:begin', '-- tournament:end')).toBe(block);
    expect(between(Q['4'], '-- tournament:begin', '-- tournament:end')).toBe(block);
    expect(between(PEOPLE, '-- tournament:begin', '-- tournament:end')).toBe(block);
  });

  it('query 4\'s strata mirror TOURNAMENT_STRATA', () => {
    const block = between(Q['4'], '-- tournament-strata:begin', '-- tournament-strata:end');
    expect([...block.matchAll(/\('([A-Z]{2}-[A-Z])'\)/g)].map(m => m[1])).toEqual([...TOURNAMENT_STRATA]);
  });

  it('the people file names nobody: a hashed 8-character person, never pid / aid / username', () => {
    const select = PEOPLE.slice(PEOPLE.lastIndexOf('SELECT'));
    expect(select).toMatch(/left\(encode\(sha256\(convert_to\(p\.pid, 'UTF8'\)\), 'hex'\), 8\)\s+AS person/);
    expect(select).not.toMatch(/AS (pid|aid|username|email)\b/);
  });

  it('the registry VALUES mirror src/data/tournament-arms.js (every arm that has started, its version, start, control, active)', () => {
    const want = TOURNAMENT_ARMS.filter(a => a.startDate).map(a =>
      `('${a.id}', ${a.armVersion}, timestamptz '${a.startDate} 00:00+00', ${a.permanent === true}, ${a.status === 'active'})`);
    for (const text of [Q['1'], Q['2'], Q['3'], Q['4'], PEOPLE]) {
      const block = between(text, '-- tournament-registry:begin', '-- tournament-registry:end');
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
// The registry's start (2026-12-12) is after today in the fixture's clock, so
// the test moves `since` and the start dates 60 days back.
const LAUNCH = "timestamptz '2026-12-12 00:00+00'";
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
  opened('a1', 'home'), assigned('a1', 'A_control', 0, T0, {
    fqArm: 'quota', stratum: 'NI-D', weightsVersion: 0,
    weights: { A_control: 0.333, B_single_path: 0.333, D_interview_sprint: 0.333 },
    profile: { v: 1, door: 'homepage', doorSrc: 'home', company: null, interviewTarget: false, itSignal: null, landingSrc: 'search:bing',
      device: 'desktop', country: 'DE', priceRegion: 'default', language: 'de', tzBucket: 'europe_africa', landingBefore: true, readinessBand: null },
    reason: 'not interview-target (door: homepage) · desktop → stratum NI-D; equal weights A/B/D; hash draw 0.12 → A',
  }),
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
  opened('a3', 'capital-one-sql-interview'), assigned('a3', 'A_control', 0, T0, {
    fqArm: 'quota', stratum: 'IT-D', weightsVersion: 0,
    weights: { A_control: 0.333, B_single_path: 0.333, D_interview_sprint: 0.333 },
    profile: { v: 1, door: 'company_page', doorSrc: 'capital-one-sql-interview', company: 'capital-one', interviewTarget: true,
      itSignal: 'company_page', landingSrc: null, device: 'desktop', country: null, priceRegion: null, language: 'en',
      tzBucket: 'americas', landingBefore: true, readinessBand: null },
    reason: 'interview-target (Capital One page) · desktop → stratum IT-D; equal weights A/B/D; hash draw 0.05 → A',
  }),
  row('challenge_first_run', 'activation_funnel', 'guest', at(0.5), { ...base, aid: 'a3', challengeId: 91, via: 'run' }),
  row('content_lock_reached', 'activation_funnel', 'guest', at(24), { ...base, aid: 'a3', wall: 'free_quota' }),
  solved('a3', 91, 1), solved('a3', 92, 2), solved('a3', 93, 3), solved('a3', 94, 4), solved('a3', 95, 5), solved('a3', 96, 24 * 8),
  // b1 — B: 7 solves, the first at 20 min; a plan click; later carries the
  // `alice` username too (alice is credited to a1, the earlier t0); one later
  // row stamped with another arm (the health query's mismatch).
  // b1 arrived on the homepage but holds a readiness result: its profile made
  // it interview-target, so its LOGGED stratum (IT-D) differs from the one
  // the door alone would give (NI-D) — the read must take the logged one.
  opened('b1', 'home', 0, T0 - 24), assigned('b1', 'B_single_path', 0, T0 - 24, { stratum: 'IT-D', weightsVersion: 0 }),
  ...[91, 92, 93, 94, 95, 96, 97].map((cid, i) => solved('b1', cid, 0.34 + i, T0 - 24)),
  row('pro_plan_clicked', 'activation_funnel', 'alice', at(26, T0 - 24), { ...base, aid: 'b1', tArm: 'A_control' }),
  // b2 — B, assigned two days ago: not eligible yet.
  opened('b2', 'home', 0, 48), assigned('b2', 'B_single_path', 0, 48), solved('b2', 91, 1, 48),
  // b3 — B, a stamped bot: never a person.
  opened('b3', 'home', 0, T0, { wd: true }), assigned('b3', 'B_single_path'),
  // d1 — D, no solves; a second tournament_assigned row (a dup).
  opened('d1', 'company:Stripe'), assigned('d1', 'D_interview_sprint'), assigned('d1', 'A_control', 5),
  // r1 — B, a phone, in NI-M under a ROUTED weights version 1 (80/10/10):
  // query 4 reads NI-M at version 1 only, so a2 (version 0) drops out there.
  opened('r1', 'home', 0, T0, { viewport: 'mobile:390x844' }),
  assigned('r1', 'B_single_path', 0, T0, { viewport: 'mobile:390x844', stratum: 'NI-M', weightsVersion: 1,
    weights: { A_control: 0.1, B_single_path: 0.8, D_interview_sprint: 0.1 } }),
  ...[91, 92, 93, 94, 95, 96].map((cid, i) => solved('r1', cid, 1 + i)),
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
    for (const k of ['1', '2', '3', '4']) {
      const rows = await run(k);
      expect(rows.length).toBeGreaterThan(0);
      for (const r of rows) {
        for (const col of Object.keys(r)) expect(['pid', 'username', 'aid', 'email']).not.toContain(col);
        for (const v of Object.values(r)) expect(['a1', 'a2', 'a3', 'b1', 'b2', 'b3', 'd1', 'r1', 'alice', 'tx']).not.toContain(v);
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
    expect(Number(b.assigned)).toBe(3);        // b1 b2 r1
    expect(Number(b.eligible_7d)).toBe(2);     // b2 is two days old
    expect(Number(b.six_7d)).toBe(2);
    expect(Number(b.solve_10m_pct)).toBe(0);
    expect(Number(b.plan_click_7d_pct)).toBe(50);
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
    expect(Number(get('fq_arm', 'none', 'B_single_path').eligible_7d)).toBe(2);
    // stratum: the logged one (a1 NI-D, a3 IT-D, r1 NI-M), else door + viewport
    // (a2 phone from home → NI-M, d1 company:Stripe → IT-D, b1 home → NI-D).
    expect(Number(get('stratum', 'IT-D', 'A_control').eligible_7d)).toBe(1);
    expect(Number(get('stratum', 'IT-D', 'D_interview_sprint').eligible_7d)).toBe(1);
    expect(Number(get('stratum', 'NI-D', 'A_control').six_7d)).toBe(1);
    expect(Number(get('stratum', 'NI-M', 'A_control').eligible_7d)).toBe(1);
    expect(Number(get('stratum', 'NI-M', 'B_single_path').six_7d)).toBe(1);
    expect(Number(get('stratum', 'IT-D', 'B_single_path').six_7d)).toBe(1);   // b1: logged, not its door
    expect(Number(get('stratum', 'NI-D', 'B_single_path').eligible_7d)).toBe(0); // only b2, not yet eligible; b1 is not here
    expect(Number(get('segment', 'interview_target', 'B_single_path').eligible_7d)).toBe(1);
  });

  it('query 4: per stratum × active arm, at the stratum\'s CURRENT weights version', async () => {
    const rows = await run('4');
    expect(rows).toHaveLength(TOURNAMENT_STRATA.length * 3);
    const get = (st, arm) => rows.find(r => r.stratum === st && r.arm === arm);
    expect(rows.filter(r => r.stratum === 'IT-D').map(r => r.arm)).toEqual(['A_control', 'B_single_path', 'D_interview_sprint']);
    // IT-D: a3 (6th solve on day 8) and d1 (no solves)
    expect(Number(get('IT-D', 'A_control').eligible_7d)).toBe(1);
    expect(Number(get('IT-D', 'A_control').six_7d)).toBe(0);
    expect(Number(get('IT-D', 'D_interview_sprint').eligible_7d)).toBe(1);
    // b1 by its logged stratum (a six-solver), not by its homepage door
    expect(Number(get('IT-D', 'B_single_path').eligible_7d)).toBe(1);
    expect(Number(get('IT-D', 'B_single_path').alpha)).toBe(2);
    expect(Number(get('IT-D', 'B_single_path').beta)).toBe(1);
    // NI-D: a1 (six) on A; b2 (not eligible yet) on B
    expect(Number(get('NI-D', 'A_control').six_7d)).toBe(1);
    expect(Number(get('NI-D', 'B_single_path').assigned)).toBe(1);
    expect(Number(get('NI-D', 'B_single_path').eligible_7d)).toBe(0);
    expect(Number(get('NI-D', 'A_control').share_pct)).toBe(50);
    expect(Number(get('NI-D', 'B_single_path').share_pct)).toBe(50);
    expect(Number(get('NI-D', 'A_control').expected_share_pct)).toBe(33.3);
    expect(get('NI-D', 'B_single_path').expected_share_pct).toBe(null);   // b2's row logged no weights
    // NI-M: routed version 1 — r1 only; a2 (version 0) is not in the restarted counts
    expect(Number(get('NI-M', 'B_single_path').weights_v)).toBe(1);
    expect(Number(get('NI-M', 'B_single_path').six_7d)).toBe(1);
    expect(Number(get('NI-M', 'B_single_path').expected_share_pct)).toBe(80);
    expect(Number(get('NI-M', 'A_control').assigned)).toBe(0);
    // IT-M: nobody yet, every arm listed at zero
    expect(rows.filter(r => r.stratum === 'IT-M').every(r => Number(r.assigned) === 0 && Number(r.weights_v) === 0)).toBe(true);
  });

  it('tournament-people.sql: one row per assigned human, named by a hash, with the profile, the reason and the progress', async () => {
    const rows = (await db.query(runnable(PEOPLE))).rows;
    expect(rows).toHaveLength(7);                         // a1 a2 a3 b1 b2 d1 r1 — not the bot, the internal, the pre-since
    const hash = (id) => crypto.createHash('sha256').update(id).digest('hex').slice(0, 8);
    for (const r of rows) {
      expect(r.person).toMatch(/^[0-9a-f]{8}$/);
      for (const v of Object.values(r)) expect(['a1', 'a2', 'a3', 'b1', 'b2', 'd1', 'r1', 'alice', 'guest']).not.toContain(v);
    }
    const by = (id) => rows.find(r => r.person === hash(id));
    const a3 = by('a3');
    expect(a3).toMatchObject({ stratum: 'IT-D', arm: 'A_control', door: 'company_page', company: 'capital-one',
      interview_target: true, it_signal: 'company_page', device: 'desktop', tz_bucket: 'americas', landing_before: true,
      fq_arm: 'quota', eligible_7d: true, first_run: true, solves_7d: 5, quota_wall_7d: true, trial_30d: false });
    expect(a3.reason).toMatch(/^interview-target \(Capital One page\) · desktop → stratum IT-D/);
    expect(Number(a3.first_solve_min)).toBe(60);
    const a1 = by('a1');
    expect(a1).toMatchObject({ stratum: 'NI-D', country: 'DE', price_region: 'default', language: 'de', solves_7d: 6, trial_30d: true, paid_30d: true });
    expect(Number(a1.first_solve_min)).toBe(6);
    const d1 = by('d1');
    expect(d1).toMatchObject({ stratum: 'IT-D', arm: 'D_interview_sprint', first_run: false, door: null, reason: null });
    expect(d1.first_solve_min).toBe(null);
    expect(by('b2').eligible_7d).toBe(false);
    expect(by('r1')).toMatchObject({ stratum: 'NI-M', weights_v: 1, solves_7d: 6 });
    expect(by('b1')).toMatchObject({ stratum: 'IT-D', plan_click_7d: true });
    // newest first
    expect(rows[0].person).toBe(hash('b2'));
  });

  it('query 3: raw vs human, the shares, the duplicate and the mismatched stamp', async () => {
    const rows = await run('3');
    const by = Object.fromEntries(rows.map(r => [r.arm, r]));
    expect(Number(by.A_control.assigned_raw)).toBe(4);       // a1 a2 a3 + internal tx
    expect(Number(by.A_control.assigned_human)).toBe(3);
    expect(Number(by.B_single_path.assigned_raw)).toBe(4);   // b1 b2 r1 + bot b3
    expect(Number(by.B_single_path.assigned_human)).toBe(3);
    expect(Number(by.A_control.human_share_pct)).toBe(42.9);
    expect(Number(by.D_interview_sprint.human_share_pct)).toBe(14.3);
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

describe('tournament-posteriors.mjs --strata — per stratum, routing, the post-stratified pool', () => {
  // query 4's shape: one row per stratum × arm
  const cell = (stratum, arm, n, k) => ({ stratum, arm, is_control: arm === 'A_control', eligible_7d: n, six_7d: k });
  const strataRows = (itd, nid = [19, 19, 19], n = 120) => [
    cell('IT-D', 'A_control', n, itd[0]), cell('IT-D', 'B_single_path', n, itd[1]), cell('IT-D', 'D_interview_sprint', n, itd[2]),
    cell('NI-D', 'A_control', 400, nid[0] * 3), cell('NI-D', 'B_single_path', 400, nid[1] * 3), cell('NI-D', 'D_interview_sprint', 400, nid[2] * 3),
  ];

  it('P(best in stratum) sums to 1 inside each stratum and finds a clear winner', () => {
    const post = stratumPosteriors(strataRows([10, 40, 12]));
    for (const st of ['IT-D', 'NI-D']) {
      const sum = post.filter(p => p.stratum === st).reduce((a, p) => a + p.pBestInStratum, 0);
      expect(sum).toBeCloseTo(1, 6);
    }
    expect(post.find(p => p.stratum === 'IT-D' && p.arm === 'B_single_path').pBestInStratum).toBeGreaterThan(0.99);
    expect(stratumPosteriors(strataRows([10, 40, 12]))).toEqual(post);   // seeded
  });

  it('routes only at P(best) ≥ 0.95 on two consecutive reads with ≥ 100 per arm, winner at 80%, the rest explores', () => {
    const first = routeStrata(stratumPosteriors(strataRows([10, 40, 12])));
    const itd = first.find(v => v.stratum === 'IT-D');
    expect(itd.verdict).toMatch(/^route candidate: B_single_path/);
    expect(first.find(v => v.stratum === 'NI-D').verdict).toMatch(/^explore \(no arm/);
    const second = routeStrata(stratumPosteriors(strataRows([10, 40, 12])), { previous: first });
    const routed = second.find(v => v.stratum === 'IT-D');
    expect(routed.verdict).toMatch(/^ROUTE to B_single_path/);
    expect(routed.proposedWeights).toEqual({ B_single_path: 0.8, A_control: 0.1, D_interview_sprint: 0.1 });
    // …but not under 100 per arm in the stratum, however clear.
    const thin = routeStrata(stratumPosteriors(strataRows([2, 30, 3], undefined, 99)));
    expect(thin.find(v => v.stratum === 'IT-D').verdict).toMatch(/^explore \(equal weights; every arm needs ≥ 100/);
    // …and a different leader last week resets the count.
    const flip = routeStrata(stratumPosteriors(strataRows([10, 12, 40])), { previous: first });
    expect(flip.find(v => v.stratum === 'IT-D').verdict).toMatch(/^route candidate: D_interview_sprint/);
  });

  it('the post-stratified pool weights each stratum by its people and feeds decide()', () => {
    const rows = strataRows([19, 19, 19], [19, 19, 19]);
    const pool = poststratifiedPosteriors(rows);
    expect(pool.map(p => p.arm)).toEqual(['A_control', 'B_single_path', 'D_interview_sprint']);
    expect(pool[0].eligible).toBe(520);
    for (const p of pool.filter(x => !x.isControl)) expect(Math.abs(p.pBetterThanControl - 0.5)).toBeLessThan(0.05);
    // NI-D is 1,200 of 1,560 people: a stratum mean of 0.1583 (IT-D) and 0.1425 (NI-D) pool to their weighted mean.
    expect(pool[0].postMean).toBeCloseTo((360 / 1560) * (20 / 122) + (1200 / 1560) * (58 / 402), 2);
    const out = decide(pool);
    expect(out[0].verdict).toMatch(/^control/);
    expect(out[1].verdict).toMatch(/^continue|^wait/);
  });
});
