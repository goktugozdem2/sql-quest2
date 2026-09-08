import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Edge functions write to tables they cannot see at build time, and PostgREST
// rejects an unknown column with PGRST204 — a runtime 400 that surfaces as a
// silent no-op wherever the caller ignores `{ error }`.
//
// That class of bug bit FIVE times in one feature, found 2026-09-08:
//   • users.personal_ref_code            — queried by two functions, never created
//   • get_my_referral_stats()            — called by two functions, never created
//   • userData.personalRefCode           — stamped by the client after its only save
//   • the derived code scheme            — collided on 13 of 348 accounts
//   • referrals.referrer_username        — inserted by track-referral, never created
//   • pro_events {event_type, plan_type, amount_cents}
//                                        — `referrals` columns, copy-pasted into
//                                          the Pro-grant audit row
//
// The last two would have broken every referral row and every Pro-grant audit
// the moment those functions were next deployed. Nothing caught them, because
// nothing compared the code to the schema.
//
// This file is that comparison. The schema below was READ FROM THE LIVE
// DATABASE on 2026-09-08 via information_schema.columns. It is a snapshot, not
// a source of truth: when you add a column, add it here in the same commit, or
// this test will fail on correct code and you will learn to distrust it.
// ---------------------------------------------------------------------------
const SCHEMA = {
  // measured 2026-09-08
  referrals: [
    'id', 'ref_code', 'event_type', 'username', 'email', 'plan_type',
    'amount_cents', 'user_agent', 'referrer_url', 'ip_hash', 'metadata',
    'created_at',
    // added by supabase/migrations/20260908c_referrals_referrer_username.sql
    'referrer_username',
  ],
  pro_events: ['id', 'event', 'username', 'reason', 'metadata', 'created_at'],
  users: [
    'username', 'password_hash', 'salt', 'data', 'created_at', 'updated_at',
    'email',
    // added by supabase/migrations/20260908_referral_personal_codes.sql
    'personal_ref_code',
  ],
  feedback: [
    'id', 'username', 'message', 'contact', 'screen', 'context', 'created_at',
    'quote_consent', 'quote_name', 'quote_consent_at',
  ],
  public_profiles: [
    'handle', 'display_name', 'skills', 'total_solves', 'streak', 'xp',
    'archetype_name', 'archetype_emoji', 'ownership_hash', 'updated_at',
    'created_at',
  ],
};

const FUNCTIONS = ['track-referral', 'my-referral-stats', 'claim-referral-reward', 'referrals-summary'];

// Walk from the `{` after .insert(/.update( to its matching `}` and read the
// keys at depth 1. Regex alone cannot do this — the payloads nest.
function payloadKeys(src, openIdx) {
  let depth = 0, i = openIdx;
  const keys = [];
  let buf = '';
  for (; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') { depth++; if (depth === 1) { buf = ''; continue; } }
    if (ch === '}') { depth--; if (depth === 0) break; }
    if (depth === 1) buf += ch;
  }
  // strip nested braces/brackets and strings, then take `key:` at top level
  const flat = buf.replace(/\{[^{}]*\}/g, '{}').replace(/'[^']*'/g, "''");
  for (const m of flat.matchAll(/(?:^|,)\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/g)) keys.push(m[1]);
  return keys;
}

function writesIn(src) {
  const out = [];
  const froms = [...src.matchAll(/\.from\('([a-z_]+)'\)/g)];
  for (let i = 0; i < froms.length; i++) {
    // A payload belongs to the NEAREST preceding .from(), so the window ends
    // at the next one. Scanning a fixed number of characters instead pairs an
    // insert with whatever .from() happened to appear earlier in the file —
    // which is how the first version of this guard reported `referrals`
    // columns as `users` columns.
    const start = froms[i].index;
    const end = i + 1 < froms.length ? froms[i + 1].index : src.length;
    const window = src.slice(start, end);
    for (const op of ['insert', 'update', 'upsert']) {
      const at = window.indexOf(`.${op}({`);
      if (at === -1) continue;
      out.push({ table: froms[i][1], op, keys: payloadKeys(window, at + op.length + 1) });
    }
  }
  return out;
}

function selectsIn(src) {
  const out = [];
  for (const m of src.matchAll(/\.from\('([a-z_]+)'\)\s*\.select\('([^']*)'\)/g)) {
    out.push({ table: m[1], cols: m[2].split(',').map(c => c.trim()).filter(c => c && c !== '*') });
  }
  return out;
}

describe('edge functions only touch columns that exist', () => {
  for (const fn of FUNCTIONS) {
    const path = join(import.meta.dirname, '..', 'supabase', 'functions', fn, 'index.ts');
    if (!existsSync(path)) continue;
    const src = readFileSync(path, 'utf8');

    it(`${fn}: every inserted/updated column exists`, () => {
      const bad = [];
      for (const w of writesIn(src)) {
        const known = SCHEMA[w.table];
        if (!known) continue; // table not in the snapshot — nothing to assert
        for (const k of w.keys) {
          if (!known.includes(k)) bad.push(`${w.op} into ${w.table}: "${k}"`);
        }
      }
      expect(bad, `PostgREST would reject these with PGRST204:\n  ${bad.join('\n  ')}`).toEqual([]);
    });

    it(`${fn}: every selected column exists`, () => {
      const bad = [];
      for (const s of selectsIn(src)) {
        const known = SCHEMA[s.table];
        if (!known) continue;
        for (const c of s.cols) {
          if (!known.includes(c)) bad.push(`select ${c} from ${s.table}`);
        }
      }
      expect(bad, bad.join('\n')).toEqual([]);
    });
  }

  it('the Pro-grant audit row is checked, not swallowed', () => {
    // supabase-js RESOLVES with { error } on a rejected insert — it does not
    // throw — so a try/catch around it inspects nothing. This granted Pro days
    // with no record of who got them for as long as the column names were wrong.
    const src = readFileSync(join(import.meta.dirname, '..', 'supabase', 'functions', 'claim-referral-reward', 'index.ts'), 'utf8');
    expect(src).toMatch(/const \{ error: auditErr \} = await supabase\.from\('pro_events'\)\.insert/);
    expect(src).toMatch(/if \(auditErr\)/);
  });

  it('the migration adding referrals.referrer_username exists', () => {
    const m = join(import.meta.dirname, '..', 'supabase', 'migrations', '20260908c_referrals_referrer_username.sql');
    expect(existsSync(m), 'track-referral writes referrer_username; without this migration deploying it breaks every referral row').toBe(true);
    expect(readFileSync(m, 'utf8')).toMatch(/add column if not exists referrer_username/i);
  });
});
