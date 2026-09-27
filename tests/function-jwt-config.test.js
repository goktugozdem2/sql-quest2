// A gated sender receives SENDER_SECRET, which is not a JWT. If the gateway's
// JWT check is on, the request dies before the function's own gate ("Invalid
// JWT"). That happened on 2026-09-27 when a sender was deployed without
// --no-verify-jwt. supabase/config.toml now carries the setting, and this
// binds every gated sender and webhook to it.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const config = fs.readFileSync(join(ROOT, 'supabase/config.toml'), 'utf8');
const fnDir = join(ROOT, 'supabase/functions');

const verifyJwtOff = (slug) =>
  new RegExp(`\\[functions\\.${slug.replace(/[-]/g, '\\-')}\\]\\s*\\n\\s*verify_jwt\\s*=\\s*false`).test(config);

describe('functions that must not sit behind the gateway JWT check', () => {
  const gated = fs.readdirSync(fnDir).filter((slug) => {
    const file = join(fnDir, slug, 'index.ts');
    return fs.existsSync(file) && /service role required/.test(fs.readFileSync(file, 'utf8'));
  });

  it('finds the gated senders (not vacuous)', () => {
    expect(gated.length).toBeGreaterThanOrEqual(8);
    expect(gated).toContain('activated-note');
    expect(gated).toContain('trial-reminder-cron');
  });

  it.each(gated)('%s has verify_jwt = false in supabase/config.toml', (slug) => {
    expect(verifyJwtOff(slug), slug).toBe(true);
  });

  it.each(['stripe-webhook', 'resend-webhook'])('%s (signature-checked webhook) has verify_jwt = false', (slug) => {
    expect(verifyJwtOff(slug), slug).toBe(true);
  });
});
