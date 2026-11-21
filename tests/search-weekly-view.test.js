// public.search_weekly (2026-11-22, BACKLOG item 9 / PLAN item 6): Google and
// Bing at the week, behind the same walls as their tables.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = p => fs.readFileSync(ROOT + p, 'utf8');
const MIG = 'supabase/migrations/20261122100000_search_weekly_view.sql';
const sql = read(MIG).split('\n').filter(l => !/^\s*--/.test(l)).join('\n');

describe('search_weekly — the migration', () => {
  it('runs as the reader (security_invoker), so gsc_daily / bing_stats RLS holds', () => {
    expect(sql).toMatch(/create or replace view public\.search_weekly with \(security_invoker = true\) as/);
  });

  it('is closed to anon and authenticated, open to metrics_reader only', () => {
    expect(sql).toMatch(/revoke all on public\.search_weekly from anon, authenticated;/);
    expect(sql).toMatch(/grant select on public\.search_weekly to metrics_reader;/);
    expect(sql).not.toMatch(/grant [^;]*search_weekly[^;]* to (anon|authenticated|public)\b/i);
  });

  it('reads both tables and never writes', () => {
    expect(sql).toMatch(/from public\.gsc_daily/);
    expect(sql).toMatch(/from public\.bing_stats/);
    expect(sql).not.toMatch(/\b(insert|update|delete|truncate|alter table|drop table)\b/i);
  });

  it('has its rollback and its rolled-back probe', () => {
    expect(read('supabase/manual/20261122_search_weekly_view_rollback.sql')).toMatch(/drop view if exists public\.search_weekly;/);
    const probe = read('supabase/manual/20261122_search_weekly_view_probe.sql');
    expect(probe.trim().endsWith('rollback;')).toBe(true);
    expect(probe).toMatch(/set local role anon;/);
  });
});

describe("search_weekly — Google's days land in Bing's Saturday → Friday week", () => {
  // The SQL: date + ((5 - dow + 7) % 7). Same arithmetic here, on real dates.
  const friday = iso => {
    const d = new Date(iso + 'T00:00:00Z');
    const add = (5 - d.getUTCDay() + 7) % 7;
    return new Date(d.getTime() + add * 86400000).toISOString().slice(0, 10);
  };
  it('the formula in the migration is the one tested here', () => {
    expect(sql).toMatch(/\(date \+ \(\(5 - extract\(dow from date\)::int \+ 7\) % 7\)\)::date as week_end/);
  });
  it('Saturday 11-14 … Friday 11-20 all key to Friday 2026-11-20', () => {
    for (const d of ['2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20']) {
      expect(friday(d), d).toBe('2026-11-20');
    }
    expect(friday('2026-11-21')).toBe('2026-11-27');
  });
});
