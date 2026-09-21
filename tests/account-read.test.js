// Account reads (2026-09-22). The anon key could list the whole users_public
// view in one request. The client now reads ONE row through
// rpc/sq_load_account, and the view is closed to anon in step 2.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const app = fs.readFileSync(join(ROOT, 'src/app.jsx'), 'utf8');
const mig = fs.readFileSync(join(ROOT, 'supabase/migrations/20260922120000_account_read_one_row.sql'), 'utf8');

describe('the client reads one account row at a time', () => {
  it('the session load and the existence check go through rpc/sq_load_account', () => {
    const fn = app.slice(app.indexOf('const fetchAccountRow = async (username) => {'), app.indexOf('const fetchAccountRows = async (query) => {'));
    // Since 2026-09-23 through withTokenFallback, carrying p_token.
    expect(fn).toContain("withTokenFallback('rpc/sq_load_account', withToken({ p_username: username }, sessionTokenFor(username)))");
    expect(fn).toContain('isMissingServerSide(err)');
    expect(app).toContain(': await fetchAccountRow(username);');
    expect(app).toContain('fetchAccountRow(savedUser).then(');
  });

  it('users_public is read only inside that 404 fallback', () => {
    const calls = [...app.matchAll(/fetchAccountRows\(/g)].length;
    expect(calls, 'the one fallback call').toBe(1);
    const fallback = app.slice(app.indexOf('const fetchAccountRow = async (username) => {'), app.indexOf('const fetchAccountRows = async (query) => {'));
    expect(fallback).toContain('fetchAccountRows(`select=username,data&username=eq.');
  });

  it('nothing lists accounts: no unfiltered or ordered read of users_public', () => {
    expect(app).not.toMatch(/fetchAccountRows\('select=[^']*order=/);
    expect(app).not.toMatch(/users_public\?select=[^`'"]*order=/);
  });
});

describe('the database side', () => {
  it('sq_load_account returns at most one row, with owner rights, to anon', () => {
    expect(mig).toMatch(/create or replace function public\.sq_load_account\(p_username text\)/);
    expect(mig).toMatch(/security definer/);
    expect(mig).toMatch(/where v\.username = p_username\s+limit 1;/);
    expect(mig).toContain('grant execute on function public.sq_load_account(text) to anon, authenticated;');
  });
  it('the leaderboard view is dropped with the board (2026-09-22)', () => {
    const drop = fs.readFileSync(join(ROOT, 'supabase/migrations/20260922140000_drop_leaderboard_public.sql'), 'utf8');
    expect(drop).toContain('drop view if exists public.leaderboard_public;');
  });
  it('step 2 revokes the view from anon, with a rollback beside it', () => {
    const off = fs.readFileSync(join(ROOT, 'supabase/manual/20260922b_users_public_anon_off.sql'), 'utf8');
    expect(off).toContain('revoke select on public.users_public from anon, authenticated;');
    expect(fs.existsSync(join(ROOT, 'supabase/manual/20260922b_users_public_anon_off_rollback.sql'))).toBe(true);
  });
});

describe('the save refuses a wipe (2026-09-22)', () => {
  const guard = fs.readFileSync(join(ROOT, 'supabase/migrations/20260922160000_save_regression_guard.sql'), 'utf8');
  it('the thresholds are the written ones', () => {
    expect(guard).toMatch(/old_solved >= 3 and new_solved < old_solved \* 0\.8/);
    expect(guard).toMatch(/old_xp >= 100 and new_xp < old_xp \* 0\.8/);
    expect(guard).toMatch(/raise exception 'regression refused/);
  });
  it('the guard sits before the update, after the row is locked', () => {
    const lock = guard.indexOf('for update;');
    const check = guard.indexOf('regression guard');
    const update = guard.indexOf('update public.users');
    expect(lock).toBeGreaterThan(-1);
    expect(check).toBeGreaterThan(lock);
    expect(update).toBeGreaterThan(check);
  });
  it('the client reports a refusal as save_refused', () => {
    expect(app).toContain("new CustomEvent('sq:save-refused'");
    expect(app).toContain("trackActivationEvent('save_refused'");
  });
});
