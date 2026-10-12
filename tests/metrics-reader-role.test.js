// metrics_reader (2026-10-11): the read-only login a cloud session uses for
// metric reads. supabase/migrations/20261011100000_metrics_reader_role.sql
// creates it; supabase/manual/20261011_metrics_reader_probe.sql proves it on a
// database (run on a local Postgres 16 replica: reads pro_events and the
// stripped account view, denied public.users and account_sessions, no write
// grant). This file guards the SQL itself, so a later edit cannot widen the
// role without a test going red.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = p => fs.readFileSync(ROOT + p, 'utf8');
const MIGRATION = 'supabase/migrations/20261011100000_metrics_reader_role.sql';
const sql = read(MIGRATION);
const code = sql.replace(/--.*$/gm, '');

// The keys public.users.data carries that no metric needs and no reader may see.
export const PRIVATE_KEYS = ['passwordHash', 'salt', 'email', 'unsubToken', 'stripeCustomerId', 'stripeSessionId', 'stripeSubscriptionId'];
// Tables that hold credentials, sessions or raw addresses.
export const NEVER_GRANTED = ['users', 'account_sessions', 'account_login_attempts', 'guest_secrets', 'session_token_misses', 'email_captures'];

const analyticsTables = () => {
  const m = /analytics_tables text\[\] := array\[([\s\S]*?)\]/.exec(code);
  return m ? [...m[1].matchAll(/'([a-z_]+)'/g)].map(x => x[1]) : [];
};

describe('metrics_reader: read-only, analytics only, no credentials', () => {
  it('grants nothing but SELECT and USAGE', () => {
    const grants = [...code.matchAll(/grant\s+([a-z, ]+?)\s+on\s/gi)].map(m => m[1].trim().toLowerCase());
    expect(grants.length).toBeGreaterThan(0);
    for (const g of grants) expect(['select', 'usage']).toContain(g);
    expect(code).not.toMatch(/\b(insert|update|delete|truncate)\b[^;]*\bto metrics_reader/i);
    expect(code).not.toMatch(/grant\s+all/i);
  });

  it('never names a credential table in its grant list, and reads accounts only through metrics.users', () => {
    const tables = analyticsTables();
    expect(tables).toContain('pro_events');
    for (const t of NEVER_GRANTED) expect(tables, t).not.toContain(t);
    expect(code).not.toMatch(/on\s+public\.users\s+to/i);
    expect(code).not.toMatch(/on\s+(table\s+)?users\s+to/i);
  });

  it('metrics.users strips every private key', () => {
    const view = /create or replace view metrics\.users[\s\S]*?from public\.users u;/.exec(code)?.[0] || '';
    expect(view).not.toBe('');
    for (const k of PRIVATE_KEYS) expect(view, k).toContain(`- '${k}'`);
    expect(code).toMatch(/revoke all on metrics\.users from public, anon, authenticated/);
  });

  it('the role cannot log in until a password is set by hand, and carries no password in git', () => {
    expect(code).toMatch(/create role metrics_reader nologin/);
    expect(code).toMatch(/nobypassrls/);
    expect(code).not.toMatch(/password\s+'/i);
  });

  it('read-only by default, bounded statements, metrics schema first on the path', () => {
    expect(code).toMatch(/set default_transaction_read_only = on/);
    expect(code).toMatch(/set statement_timeout = '60s'/);
    expect(code).toMatch(/set search_path = metrics, public/);
  });

  it('ships with its rollback and a probe that checks grants, not an insert', () => {
    const rollback = read('supabase/manual/20261011_metrics_reader_rollback.sql');
    expect(rollback).toMatch(/drop role metrics_reader/);
    expect(rollback).toMatch(/drop policy metrics_reader_select/);
    const probe = read('supabase/manual/20261011_metrics_reader_probe.sql');
    expect(probe).toMatch(/^rollback;\s*$/m);
    expect(probe).toMatch(/has_table_privilege\('metrics_reader', c\.oid, 'INSERT, UPDATE, DELETE, TRUNCATE'\)/);
    expect(probe).toMatch(/data \? 'passwordHash'/);
  });
});
