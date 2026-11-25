// The tutor's guest limit cannot be reset by renaming the guest (2026-11-23).
// The per-plan buckets are keyed on the username the browser sends, so a
// client that sends a fresh `guest_…` name on every call never met a limit:
// unlimited billed Claude calls (user report 2026-09-15, inbox review 11-23).
// ai-tutor now also counts guests per hashed network address, before any
// Claude call, on both the RPC and the fallback path. These pin that shape.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const fn = fs.readFileSync(path.join(ROOT, 'supabase/functions/ai-tutor/index.ts'), 'utf8');

describe('ai-tutor guest network bucket', () => {
  it('has a per-address daily limit above the per-guest one', () => {
    const ip = Number(/export const GUEST_IP_DAILY_LIMIT = (\d+);/.exec(fn)?.[1]);
    const guest = Number(/guest:\s*(\d+),/.exec(fn)?.[1]);
    expect(ip).toBeGreaterThan(guest);
    expect(ip).toBeLessThanOrEqual(100);
  });

  it('keys the bucket on a hash of the forwarded address, never the raw IP or the client username', () => {
    expect(fn).toMatch(/crypto\.subtle\.digest\("SHA-256"/);
    expect(fn).toContain('guestIpBucket(req.headers.get("x-forwarded-for"))');
    expect(fn).not.toMatch(/`guestip_\$\{ip\}`/);
    expect(fn).not.toMatch(/guestIpBucket\([^)]*username/);
  });

  it('checks and counts guests before the first Claude call, on every path', () => {
    const check = fn.indexOf('if (isGuest) {\n      const ipBucket = await guestIpBucket(');
    const firstClaude = fn.indexOf('await callClaude(');
    const rpc = fn.indexOf('rpc("increment_ai_usage"');
    expect(check).toBeGreaterThan(0);
    expect(check).toBeLessThan(firstClaude);
    expect(check).toBeLessThan(rpc);
    expect(fn.slice(check, rpc)).toMatch(/\n\s*if \(ipCount >= GUEST_IP_DAILY_LIMIT\) \{\n\s*return new Response\([\s\S]{0,400}?status: 429/);
  });
});
