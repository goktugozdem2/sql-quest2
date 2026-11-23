// The daily senders read users in pages (2026-11-23). One unpaged
// `select username, email, data` over every row with an email took 15–19 s;
// on 11-22 and 11-23 the 10:00 runs of skill-decay, welcome-back and
// streak-reminder hit the 8 s statement timeout together (500, no mail, while
// pg_cron said "succeeded"). Each sender carries the same inlined
// loadUsersWithEmail(); these pin it and forbid the unpaged read coming back.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SENDERS = ['skill-decay', 'welcome-back', 'streak-reminder'];
const src = (f) => fs.readFileSync(path.join(ROOT, 'supabase/functions', f, 'index.ts'), 'utf8');
const helperOf = (s) => /const USERS_PAGE = \d+\nasync function loadUsersWithEmail[\s\S]*?\n}\n/.exec(s)?.[0];

describe('daily senders read users in pages', () => {
  for (const f of SENDERS) {
    it(`${f}: users come from the paged helper, never one unpaged select`, () => {
      const s = src(f);
      expect(s).toContain('const users = await loadUsersWithEmail(supabase)');
      expect(s).toMatch(/\.order\('username'\)\s*\n\s*\.range\(from, from \+ USERS_PAGE - 1\)/);
      const unpaged = /\.select\('username, email, data'\)\s*\n\s*\.not\('email', 'is', null\)\s*\n\s*\n/;
      expect(s.replace(helperOf(s) || '', '')).not.toMatch(/\.select\('username, email, data'\)/);
      expect(s).not.toMatch(unpaged);
      expect(Number(/const USERS_PAGE = (\d+)/.exec(s)[1])).toBeLessThanOrEqual(500);
    });
  }
  it('the inlined helper is the same in all three senders', () => {
    const [a, ...rest] = SENDERS.map((f) => helperOf(src(f)));
    expect(a).toBeTruthy();
    for (const h of rest) expect(h).toBe(a);
  });
});
