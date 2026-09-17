// Every email sender refuses anything but the service role (2026-09-17).
//
// Found after the first ten goal-note sends: all nine senders answered the
// ANON key — the one in every browser — with 200, dry run and send alike, and
// five pg_cron jobs were calling them with it. The gate is one block, pasted
// per function like the rest of the inlined plumbing; this test fails when a
// sender ships without it, or with it placed after the client is created.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const FN = path.join(ROOT, 'supabase/functions');
const senders = fs.readdirSync(FN).filter(d => {
  const p = path.join(FN, d, 'index.ts');
  // Webhooks are authenticated by the caller's signature, not by our key.
  return fs.existsSync(p) && /RESEND_API_KEY/.test(fs.readFileSync(p, 'utf8')) && !/-webhook$/.test(d);
});

describe('email senders are service-role only', () => {
  it('finds the senders', () => {
    expect(senders.length).toBeGreaterThanOrEqual(10);
  });
  for (const d of senders) {
    it(`${d} carries the gate before any query`, () => {
      const src = fs.readFileSync(path.join(FN, d, 'index.ts'), 'utf8');
      expect(src, `${d}: no caller gate`).toContain("service role required");
      expect(src).toContain("Deno.env.get('SENDER_SECRET')");
      expect(src).toContain("!accepted.includes(given)");
      const gateAt = src.indexOf('service role required');
      // Inside the handler, before the first awaited call — helpers defined
      // above the handler only run when the handler calls them.
      const serveAt = src.indexOf('Deno.serve(');
      const firstAwait = src.indexOf('await ', serveAt);
      expect(serveAt).toBeGreaterThan(-1);
      expect(gateAt, `${d}: gate must be inside the handler`).toBeGreaterThan(serveAt);
      expect(gateAt, `${d}: gate must run before the first awaited call`).toBeLessThan(firstAwait);
    });
  }
  it('the cron rewrite names every anon-key job', () => {
    const sql = fs.readFileSync(path.join(ROOT, 'supabase/manual/20260917_cron_service_role.sql'), 'utf8');
    for (const j of ['checkout-abandon', 'skill-decay', 'streak-reminder', 'weekly-digest', 'welcome-back-daily']) {
      expect(sql).toContain(`'${j}'`);
    }
    expect(sql).toContain('vault.decrypted_secrets');
  });
});
