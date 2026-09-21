// The leaderboard load (2026-09-22). Supabase warned the project was running
// out of Disk IO budget; the load was this read — every open session polled a
// 1.3 s full-table query every 30 seconds, on every tab. These pin the fix.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const app = fs.readFileSync(join(ROOT, 'src/app.jsx'), 'utf8');
const migration = fs.readFileSync(join(ROOT, 'supabase/migrations/20260922100000_leaderboard_public.sql'), 'utf8');

describe('the leaderboard loads only when someone is looking at it', () => {
  const at = app.indexOf("if (!currentUser || activeTab !== 'leaderboard') return undefined;");
  it('the polling effect is gated on the leaderboard tab', () => {
    expect(at).toBeGreaterThan(-1);
    const body = app.slice(at, at + 500);
    expect(body).toContain("document.visibilityState === 'hidden'");
    expect(body).toContain('setInterval(load, 60000)');
    expect(body).toContain('[currentUser, activeTab]');
  });
  it('no leaderboard reload runs on a 30-second timer anywhere', () => {
    expect(app).not.toMatch(/loadLeaderboard\(\)\.then\(setLeaderboard\);\s*\},\s*30000\)/);
  });
});

describe('the leaderboard reads three fields through an index', () => {
  const fn = app.slice(app.indexOf('const loadLeaderboard = async () => {'), app.indexOf('const loadLeaderboard = async () => {') + 2200);
  it('reads leaderboard_public, ordered numerically', () => {
    expect(fn).toContain("leaderboard_public?select=username,xp,solved&order=xp.desc.nullslast&limit=50");
  });
  it('never sorts xp as text again', () => {
    expect(app).not.toContain('order=data->>xp');
  });
  it('the view column and the index use the same expression', () => {
    expect(migration).toMatch(/on public\.users \(\(data -> 'xp'\) desc nulls last\)/);
    expect(migration).toMatch(/u\.data -> 'xp' as xp/);
    expect(migration).toContain('security_invoker = false');
    expect(migration).toContain('grant select on public.leaderboard_public to anon, authenticated');
  });
});
