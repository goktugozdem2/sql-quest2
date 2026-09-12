// Source guard for the one write that must never lie: the users upsert.
//
// 2026-09-08 08:53 UTC → 2026-09-12: a BEFORE INSERT trigger on public.users
// ran as anon and was denied EXECUTE on gen_ref_code(), so PostgREST returned
// 403 on every registered-user upsert. supabaseFetch logged it and returned
// null; _flushCloudSave read null as success; saveUserData({ force: true })
// — whose contract is "throws on failure" — resolved; 36 people were told
// their account was saved when no row existed, and 57 active accounts saved
// nothing to the cloud for four days. The database side is fixed in
// supabase/migrations/20260912100000_*.sql. This file pins the client side.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const src = readFileSync(fileURLToPath(new URL('../src/app.jsx', import.meta.url)), 'utf8');

function slice(from, to) {
  const s = src.indexOf(from);
  expect(s, `marker not found: ${from}`).toBeGreaterThan(-1);
  const e = src.indexOf(to, s);
  expect(e, `marker not found: ${to}`).toBeGreaterThan(s);
  return src.slice(s, e);
}

describe('cloud save contract (source guard on src/app.jsx)', () => {
  const flush = slice('const _flushCloudSave = async', 'const saveUserData = async');
  const fetchFn = slice('const supabaseFetch = async', '// ============ USER DATA FUNCTIONS');

  it('the users upsert asks supabaseFetch to throw on a rejected write', () => {
    expect(flush).toMatch(/users\?on_conflict=username/);
    expect(flush).toMatch(/throwOnError:\s*true/);
  });

  it('the users upsert payload does not carry created_at (merge-duplicates would overwrite it on every save)', () => {
    expect(flush).not.toMatch(/created_at\s*:/);
  });

  it('supabaseFetch rethrows on HTTP failure and on network failure when throwOnError is set', () => {
    expect(fetchFn).toMatch(/throwOnError/);
    expect(fetchFn).toMatch(/throw new Error\(`Supabase \$\{response\.status\}/);
    expect(fetchFn).toMatch(/if \(throwOnError\) throw err;/);
    // and never leaks the flag into fetch() options
    expect(fetchFn).toMatch(/const \{ throwOnError = false, \.\.\.fetchOptions \} = options;/);
  });
});
