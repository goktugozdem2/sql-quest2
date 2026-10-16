// The tutor's atomic rate limit (2026-10-16). rpc/increment_ai_usage was
// never created in production (every ai-tutor call: HTTP 404, then the
// read-then-write fallback). The old definition (ai-usage-setup.sql) could not
// limit: at count = limit it stopped counting and returned was_limited=false.
// The behaviour is proven on a real Postgres by
// supabase/manual/increment-ai-usage-replica-test.sql (run against the old
// definition it fails: "call 4 should be limited"). These pin the migration's
// shape so a later edit cannot quietly undo either half.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const sql = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20261016100000_increment_ai_usage.sql'), 'utf8');
const fn = fs.readFileSync(path.join(ROOT, 'supabase/functions/ai-tutor/index.ts'), 'utf8');

describe('increment_ai_usage', () => {
  it('counts only below the limit, in one statement, and reports a refusal', () => {
    expect(sql).toMatch(/on conflict \(username, date\) do update[\s\S]*where ai_usage\.call_count < p_daily_limit[\s\S]*returning call_count into v_count;/);
    expect(sql).toMatch(/if v_count is null then[\s\S]*'was_limited', true/);
    expect(sql).not.toMatch(/WHEN ai_usage\.call_count < p_daily_limit THEN ai_usage\.call_count \+ 1\s*ELSE ai_usage\.call_count/i);
  });

  it('only the service role may call it', () => {
    expect(sql).toMatch(/revoke all on function public\.increment_ai_usage\(text, date, text, int\) from public, anon, authenticated;/);
    expect(sql).toMatch(/grant execute on function public\.increment_ai_usage\(text, date, text, int\) to service_role;/);
  });

  it('matches what ai-tutor sends and reads', () => {
    expect(fn).toMatch(/rpc\("increment_ai_usage", \{\s*p_username: rateLimitUsername,\s*p_date: today,\s*p_plan_type: planType,\s*p_daily_limit: dailyLimit,/);
    expect(fn).toContain('const { new_count, was_limited } = upsertResult;');
    expect(fs.existsSync(path.join(ROOT, 'supabase/manual/increment-ai-usage-replica-test.sql'))).toBe(true);
  });
});
