// scripts/aar-weekly.sql (2026-10-11): acquisition · activation · retention,
// last 7 days vs the 7 before. Its numbers were checked on a seeded local
// Postgres replica (every row equal to the hand-computed answer); this file
// keeps the filters that make a first-contact read honest from being dropped.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

const sql = fs.readFileSync(new URL('../scripts/aar-weekly.sql', import.meta.url), 'utf8').replace(/--.*$/gm, '');

describe('aar-weekly.sql keeps the first-contact filters', () => {
  it('drops internal accounts and stamped bots wherever it reads events', () => {
    expect(sql.match(/!~\* '\^\(test\|qa_\|fabletest\|linktest\|internalroutine\|sqlquest\$\)'/g)?.length).toBe(2);
    expect(sql.match(/m->>'bot' is null/g)?.length).toBe(2);
  });

  it('drops the two known crawler shapes (empty landingSrc + LA/1920x1080 or UTC/1280x720)', () => {
    expect(sql).toMatch(/coalesce\(m->>'landingSrc', ''\) = ''/);
    expect(sql).toMatch(/m->>'tz' = 'America\/Los_Angeles' and m->>'viewport' = 'desktop:1920x1080'/);
    expect(sql).toMatch(/m->>'tz' = 'UTC' and m->>'viewport' = 'desktop:1280x720'/);
  });

  it('reads first_solve_10m on new people only, and second_session_7d on cohorts with 7 days of runway', () => {
    expect(sql).toMatch(/first_solve <= p\.t0 \+ interval '10 minutes'/);
    expect(sql).toMatch(/t - interval '14 days', t - interval '7 days'|t - interval '14 days' as a, t - interval '7 days' as b/);
    expect(sql).toMatch(/e\.created_at <= h\.t0 \+ interval '7 days'/);
  });

  it('counts money only from the webhook', () => {
    expect(sql).toMatch(/e\.event = 'pro_purchase_completed' and e\.reason = 'stripe_webhook'/);
  });
});
