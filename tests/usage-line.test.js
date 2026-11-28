// The homepage usage line (src/index.html, data-testid="usage-line") —
// 2026-11-28, after A2 found it eight weeks stale under a title that said
// "refreshed every Friday" (docs/reads/live-qa-2026-11-28.md §8).
//
// The line now states its own date, and its numbers come from a dated read,
// docs/reads/usage-line-<YYYY-MM-DD>.md, written by B2 from
// scripts/usage-line.sql. The guards compare files, never the clock, so CI
// does not turn red on its own over a weekend:
//   1. the line's numbers are the numbers of the read dated the line's date;
//   2. the line's date is at most 21 days older than the newest read
//      (a newer read that never reached the page fails);
//   3. the line promises no cadence ("every Friday");
//   4. the SQL's exclusion block is the scorecard's, byte for byte, and the
//      query runs on Postgres over a small fixture.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const HOME = fs.readFileSync(path.join(ROOT, 'src/index.html'), 'utf8');
const READS = path.join(ROOT, 'docs/reads');
const USAGE_SQL = fs.readFileSync(path.join(ROOT, 'scripts/usage-line.sql'), 'utf8');
const SCORECARD_SQL = fs.readFileSync(path.join(ROOT, 'scripts/scorecard-weekly.sql'), 'utf8');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 86_400_000;
export const MAX_LAG_DAYS = 21;

/** The usage line's numbers and dates, parsed out of the homepage. */
export function parseUsageLine(html) {
  const m = html.match(/<p data-testid="usage-line"([^>]*)>([\s\S]*?)<\/p>/);
  if (!m) throw new Error('usage-line paragraph not found');
  const [, attrs, body] = m;
  const title = (attrs.match(/title="([^"]*)"/) || [])[1] || '';
  const nums = [...body.matchAll(/<span class="fm"[^>]*>([\d,]+)<\/span>\s*([a-z0-9 ]+?)(?=\s*(?:·|<|$))/g)]
    .map(([, n, label]) => ({ n: Number(n.replace(/,/g, '')), label: label.trim() }));
  const asOf = body.match(/as of (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2}), (\d{4})/);
  const measured = title.match(/Measured (\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})/);
  const iso = (y, mon, d) => `${y}-${String(MONTHS.indexOf(mon) + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return {
    title,
    body,
    solutions: nums.find((x) => x.label === 'accepted solutions')?.n,
    people: nums.find((x) => x.label === 'people last 30 days')?.n,
    asOf: asOf ? iso(asOf[3], asOf[1], asOf[2]) : null,
    measured: measured ? iso(measured[3], measured[2], measured[1]) : null,
  };
}

/** Every docs/reads/usage-line-<date>.md, newest first, with its two numbers. */
export function usageReads(dir = READS) {
  return fs.readdirSync(dir)
    .map((f) => f.match(/^usage-line-(\d{4}-\d{2}-\d{2})\.md$/))
    .filter(Boolean)
    .map(([f, date]) => {
      const text = fs.readFileSync(path.join(dir, f), 'utf8');
      const num = (k) => Number((text.match(new RegExp(`^${k}: (\\d+)$`, 'm')) || [])[1]);
      return { file: f, date, solutions: num('accepted_solutions'), people: num('people_30d') };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** Days the line's date trails the newest read (negative = line is newer). */
export const lagDays = (lineDate, readDate) => (Date.parse(readDate) - Date.parse(lineDate)) / DAY_MS;

describe('homepage usage line — states its date, carries a dated read', () => {
  const line = parseUsageLine(HOME);
  const reads = usageReads();

  it('has both numbers, a visible "as of" date and the same date in the title', () => {
    expect(Number.isFinite(line.solutions)).toBe(true);
    expect(Number.isFinite(line.people)).toBe(true);
    expect(line.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(line.measured).toBe(line.asOf);
  });

  it('promises no refresh cadence', () => {
    expect(line.title + line.body).not.toMatch(/every (friday|week)|weekly|refreshed/i);
  });

  it('there is a dated read, and each one carries both numbers', () => {
    expect(reads.length).toBeGreaterThan(0);
    for (const r of reads) {
      expect(Number.isFinite(r.solutions), `${r.file}: accepted_solutions`).toBe(true);
      expect(Number.isFinite(r.people), `${r.file}: people_30d`).toBe(true);
    }
  });

  it('the line\'s numbers are the read of the line\'s date', () => {
    const r = reads.find((x) => x.date === line.asOf);
    expect(r, `no docs/reads/usage-line-${line.asOf}.md`).toBeTruthy();
    expect(line.solutions).toBe(r.solutions);
    expect(line.people).toBe(r.people);
  });

  it(`the line is at most ${MAX_LAG_DAYS} days older than the newest read`, () => {
    expect(lagDays(line.asOf, reads[0].date)).toBeLessThanOrEqual(MAX_LAG_DAYS);
  });

  it('lagDays: the guard\'s arithmetic', () => {
    expect(lagDays('2026-11-28', '2026-12-19')).toBe(21);
    expect(lagDays('2026-11-28', '2026-12-20')).toBe(22);
    expect(lagDays('2026-11-28', '2026-11-28')).toBe(0);
  });
});

// ---- the SQL -------------------------------------------------------------
const base = (q) => {
  const a = q.indexOf('-- base:begin');
  const b = q.indexOf('-- base:end');
  if (a < 0 || b < a) throw new Error('base markers missing');
  return q.slice(a, b);
};

describe('scripts/usage-line.sql', () => {
  it('carries the scorecard\'s exclusion block byte for byte', () => {
    const firstScorecardQuery = SCORECARD_SQL.split(/^-- ===== Query 2:/m)[0];
    expect(base(USAGE_SQL)).toBe(base(firstScorecardQuery));
  });

  it('selects aggregates only (the repo is public)', () => {
    const last = USAGE_SQL.replace(/--[^\n]*/g, '').split(/\)\s*SELECT/i).pop();
    expect(last).not.toMatch(/\b(username|pid|aid|email)\b\s*(,|$|AS)/im);
  });

  let db;
  const ev = (event, reason, username, hoursAgo, meta) =>
    `('${event}', '${reason}', ${username ? `'${username}'` : 'null'}, now() - interval '${hoursAgo} hours', '${JSON.stringify(meta)}'::jsonb)`;
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      CREATE TABLE public.pro_events (event text, reason text, username text, created_at timestamptz, metadata jsonb);
      SET TIME ZONE 'UTC';
      INSERT INTO public.pro_events VALUES
        ${[
    // a person: two solves (one a re-solve) this week
    ev('landing_view', 'landing', null, 5, { aid: 'p1', page: 'home', tz: 'Asia/Kolkata' }),
    ev('app_opened', 'activation_funnel', null, 4.9, { aid: 'p1', langs: 3, landingSrc: 'search:google', tz: 'Asia/Kolkata' }),
    ev('challenge_solved', 'activation_funnel', null, 4.8, { aid: 'p1', challengeId: 91 }),
    ev('challenge_solved', 'activation_funnel', null, 4.7, { aid: 'p1', challengeId: 91 }),
    // a person who solved 60 days ago and only read a landing page since: a solution, not one of the 30-day people
    ev('app_opened', 'activation_funnel', null, 24 * 60, { aid: 'p2', langs: 3, landingSrc: 'search:bing', tz: 'Europe/Berlin' }),
    ev('challenge_solved', 'activation_funnel', null, 24 * 60 - 1, { aid: 'p2', challengeId: 92 }),
    ev('landing_view', 'landing', null, 2, { aid: 'p2', page: 'blog/x', tz: 'Europe/Berlin' }),
    // internal account: out of both numbers
    ev('app_opened', 'activation_funnel', 'test7', 3, { aid: 'i1', langs: 3 }),
    ev('challenge_solved', 'activation_funnel', 'test7', 2.9, { aid: 'i1', challengeId: 91 }),
    // a bot by fingerprint (utc1280): out of people_30d, in people_30d_internal_out
    ev('app_opened', 'activation_funnel', null, 3, { aid: 'b1', tz: 'UTC', viewport: 'desktop:1280x720', landingSrc: 'search:google' }),
    ev('challenge_solved', 'activation_funnel', null, 2.9, { aid: 'b1', challengeId: 93 }),
  ].join(',\n        ')};
    `);
  }, 60_000);
  afterAll(async () => { await db?.close(); });

  it('runs on Postgres and counts the fixture by hand', async () => {
    const [r] = (await db.query(USAGE_SQL)).rows;
    expect(Number(r.accepted_solutions)).toBe(3); // p1 ×2, p2 ×1
    expect(Number(r.solutions_internal_out)).toBe(4); // + the bot
    expect(Number(r.people_30d)).toBe(1); // p1 only
    expect(Number(r.people_30d_internal_out)).toBe(2); // p1 + the bot
  });
});
