// The Revolut-shaped analyst set (sector-challenges.js 300-311) on the
// finans_neobank ledger, written 2026-09-12 from the tasks candidates report
// for the live SQL round (src/data/interview-archetypes.js). Every solution
// is executed against the ledger here; the shape of each result is what the
// description promises; the tags are Revolut's alone so the interview-prep
// registry's dataset-exclusivity bar can be met.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import Database from 'better-sqlite3';
import { CANONICAL_SKILLS } from '../src/utils/skill-calc.js';

const here = (rel) => fileURLToPath(new URL(rel, import.meta.url));
const IDS = Array.from({ length: 12 }, (_, i) => 300 + i);

function loadWindow(files) {
  const sb = { window: { challengesData: [] }, console: { log() {} } };
  vm.createContext(sb);
  for (const f of files) vm.runInContext(readFileSync(here(f), 'utf8'), sb);
  return sb.window;
}
const w = loadWindow(['../src/data/neobank-data.js', '../src/data/sector-challenges.js', '../src/data/challenge-companies.js']);
const ds = w.publicDatasetsData.finans_neobank;
const set = w.sectorChallengesData.filter(c => IDS.includes(c.id));

function openDb() {
  const db = new Database(':memory:');
  for (const [name, t] of Object.entries(ds.tables)) {
    const types = t.columns.map((_, i) => { const s = t.data.find(r => r[i] !== null)?.[i]; return typeof s === 'number' ? (Number.isInteger(s) ? 'INTEGER' : 'REAL') : 'TEXT'; });
    db.exec(`CREATE TABLE ${name} (${t.columns.map((c, i) => `${c} ${types[i]}`).join(', ')})`);
    const ins = db.prepare(`INSERT INTO ${name} VALUES (${t.columns.map(() => '?').join(',')})`);
    db.transaction(rows => rows.forEach(r => ins.run(r)))(t.data);
  }
  return db;
}
const db = openDb();
const run = (id) => db.prepare(set.find(c => c.id === id).solution).all();

describe('the set — twelve challenges, one dataset, one company', () => {
  it('exists in full, on the neobank ledger, tagged finans + neobank', () => {
    expect(set.map(c => c.id)).toEqual(IDS);
    for (const c of set) {
      expect(c.dataset, `#${c.id}`).toBe('finans_neobank');
      expect(c.sectorTags, `#${c.id}`).toEqual(['finans', 'neobank']);
      for (const tbl of c.tables) expect(Object.keys(ds.tables), `#${c.id} names table ${tbl}`).toContain(tbl);
      for (const k of ['title', 'description', 'hint', 'solution', 'title_tr', 'description_tr', 'hint_tr']) expect(typeof c[k], `#${c.id}.${k}`).toBe('string');
      expect(c.example && c.example_tr, `#${c.id} examples`).toBeTruthy();
      expect(['Easy', 'Medium', 'Hard']).toContain(c.difficulty);
      expect(c.xpReward).toBeGreaterThan(0);
    }
  });

  it('is tagged Revolut, and only Revolut, and clears the registry bar of eight', () => {
    const tagged = IDS.filter(id => (w.challengeCompanies[String(id)] || []).includes('Revolut'));
    expect(tagged.length).toBeGreaterThanOrEqual(8);
    expect(tagged).toEqual(IDS);
    for (const id of IDS) expect(w.challengeCompanies[String(id)]).toEqual(['Revolut']);
  });

  it('covers what the live round asks: window functions, a CTE, NULL handling, the anti-join, dates', () => {
    const skills = new Set(set.flatMap(c => c.skills));
    for (const s of ['Window Functions', 'CTE', 'NULL Handling', 'LEFT JOIN', 'strftime', 'julianday', 'CASE', 'COALESCE', 'HAVING', 'NTILE', 'LAG', 'ROW_NUMBER']) {
      expect(skills.has(s), `skill tag ${s}`).toBe(true);
    }
    const mix = set.reduce((m, c) => ((m[c.difficulty] = (m[c.difficulty] || 0) + 1), m), {});
    expect(mix).toEqual({ Easy: 1, Medium: 6, Hard: 5 });
    expect(CANONICAL_SKILLS).toContain('Window Functions');
  });

  it('every solution orders its result at the top level, so grading compares rows in sequence', () => {
    for (const c of set) expect(/ORDER BY [^)]*$/i.test(c.solution), `#${c.id} top-level ORDER BY`).toBe(true);
  });
});

describe('the solutions, run against the ledger', () => {
  it('300 — August 2026 card spend by category: ten categories, none null, sorted by spend', () => {
    const rows = run(300);
    expect(rows.length).toBe(10);
    expect(rows.every(r => r.merchant_category !== null && r.payments > 0)).toBe(true);
    for (let i = 1; i < rows.length; i++) expect(rows[i].spend_gbp).toBeLessThanOrEqual(rows[i - 1].spend_gbp);
  });

  it('301 — MAU: one row per month from 2025-06 to 2026-08, people not events', () => {
    const rows = run(301);
    expect(rows.map(r => r.month)).toEqual(['2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08']);
    expect(rows.every(r => r.active_users > 0 && r.active_users <= 240)).toBe(true);
    const events = db.prepare("SELECT COUNT(*) AS n FROM transactions WHERE status='completed' AND strftime('%Y-%m', ts)='2026-08'").get().n;
    expect(rows.at(-1).active_users).toBeLessThan(events);
  });

  it('302 — top decile by completed volume: a tenth of the ranked users, descending', () => {
    const rows = run(302);
    const ranked = db.prepare("SELECT COUNT(DISTINCT user_id) AS n FROM transactions WHERE status='completed'").get().n;
    expect(rows.length).toBe(Math.ceil(ranked / 10));
    for (let i = 1; i < rows.length; i++) expect(rows[i].volume_gbp).toBeLessThanOrEqual(rows[i - 1].volume_gbp);
    expect(rows.every(r => typeof r.country === 'string' && typeof r.plan === 'string')).toBe(true);
  });

  it('303 — cohort activation: every signup month, users sum to 240, pct in [0, 100]', () => {
    const rows = run(303);
    expect(rows.reduce((s, r) => s + r.users, 0)).toBe(240);
    expect(rows.length).toBe(15);
    for (const r of rows) {
      expect(r.activated).toBeLessThanOrEqual(r.users);
      expect(r.activation_pct).toBeGreaterThanOrEqual(0);
      expect(r.activation_pct).toBeLessThanOrEqual(100);
      expect(Math.abs(r.activation_pct - Math.round(1000 * r.activated / r.users) / 10)).toBeLessThan(0.11);
    }
  });

  it('304 — top-up methods by plan: HAVING keeps only pairs with 20+ top-ups', () => {
    const rows = run(304);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every(r => r.top_ups >= 20)).toBe(true);
    const all = db.prepare('SELECT COUNT(*) AS n FROM (SELECT u.plan, t.method FROM top_ups t JOIN users u ON u.user_id = t.user_id GROUP BY u.plan, t.method)').get().n;
    expect(rows.length).toBeLessThan(all);
  });

  it('305 — decline rate by plan: four plans, declines within attempts, insufficient within declines', () => {
    const rows = run(305);
    expect(rows.map(r => r.plan).sort()).toEqual(['metal', 'plus', 'premium', 'standard']);
    for (const r of rows) {
      expect(r.declined).toBeLessThanOrEqual(r.attempts);
      expect(r.insufficient_funds).toBeLessThanOrEqual(r.declined);
      expect(r.decline_rate_pct).toBeGreaterThanOrEqual(0);
    }
    for (let i = 1; i < rows.length; i++) expect(rows[i].decline_rate_pct).toBeLessThanOrEqual(rows[i - 1].decline_rate_pct);
  });

  it('306 — the anti-join: users with no transfer_out row, and none of them has one', () => {
    const rows = run(306);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(240);
    const senders = new Set(db.prepare("SELECT DISTINCT user_id FROM transactions WHERE type='transfer_out'").all().map(r => r.user_id));
    expect(rows.some(r => senders.has(r.user_id))).toBe(false);
    expect(rows.length + senders.size).toBe(240);
  });

  it('307 — FX take rate: one row per bought currency, bps consistent with the sums', () => {
    const rows = run(307);
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.exchanges).toBeGreaterThan(0);
      expect(Math.abs(r.fee_bps - Math.round(100000 * r.fees_gbp / r.volume_gbp) / 10)).toBeLessThan(0.2);
    }
  });

  it('308 — MoM growth: fifteen months, first prev/growth NULL, the rest consistent with LAG', () => {
    const rows = run(308);
    expect(rows.length).toBe(15);
    expect(rows[0].prev_volume_gbp).toBeNull();
    expect(rows[0].growth_pct).toBeNull();
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].prev_volume_gbp).toBe(rows[i - 1].volume_gbp);
      expect(Math.abs(rows[i].growth_pct - Math.round(1000 * (rows[i].volume_gbp - rows[i].prev_volume_gbp) / rows[i].prev_volume_gbp) / 10)).toBeLessThan(0.11);
    }
  });

  it('309 — days to KYC: every country, verified + unverified = users, 22 unverified in total', () => {
    const rows = run(309);
    expect(rows.length).toBe(12);
    expect(rows.reduce((s, r) => s + r.unverified_users, 0)).toBe(22);
    expect(rows.reduce((s, r) => s + r.verified_users + r.unverified_users, 0)).toBe(240);
    expect(rows.every(r => r.avg_days_to_kyc >= 0)).toBe(true);
  });

  it('310 — top 3 categories per country: at most three per country, rn 1..3 in order', () => {
    const rows = run(310);
    const per = rows.reduce((m, r) => ((m[r.country] = (m[r.country] || 0) + 1), m), {});
    expect(Object.values(per).every(n => n <= 3)).toBe(true);
    expect(Object.keys(per).length).toBe(12);
    for (const r of rows) expect([1, 2, 3]).toContain(r.rn);
  });

  it('311 — referred vs organic: two rows, 41 + 199 users, no NULL averages', () => {
    const rows = run(311);
    expect(rows.map(r => r.source).sort()).toEqual(['organic', 'referred']);
    expect(rows.reduce((s, r) => s + r.users, 0)).toBe(240);
    expect(rows.find(r => r.source === 'referred').users).toBe(41);
    expect(rows.every(r => r.avg_first_month_gbp !== null && r.never_transacted <= r.users)).toBe(true);
  });
});
