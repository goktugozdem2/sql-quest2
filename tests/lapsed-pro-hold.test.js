// lapsed-pro is held (2026-11-22, BACKLOG item 21): its copy says "Your SQL
// Quest Pro trial ended N days ago", false for part of its audience. A real
// send is refused before anything is read or mailed; ?dry=1 still previews.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

const src = fs.readFileSync(new URL('../supabase/functions/lapsed-pro/index.ts', import.meta.url), 'utf8');

describe('lapsed-pro is held until its copy is rewritten', () => {
  it('a non-dry request returns 423 held before the client, the audience or Resend', () => {
    const hold = src.indexOf("error: 'held'");
    expect(hold, 'the hold block').toBeGreaterThan(0);
    expect(src.slice(hold - 200, hold)).toMatch(/if \(!dry\) \{/);
    expect(src.slice(hold, hold + 300)).toMatch(/status: 423/);
    // Nothing that reads users or sends mail comes before it.
    expect(src.indexOf('createClient(', src.indexOf('Deno.serve'))).toBeGreaterThan(hold);
    expect(src.indexOf('api.resend.com', src.indexOf('Deno.serve'))).toSatisfy(i => i === -1 || i > hold);
  });

  it('the hold comes after the service-role gate (an anon call still gets 401)', () => {
    expect(src.indexOf("'service role required'")).toBeLessThan(src.indexOf("error: 'held'"));
  });

  it('the copy that caused the hold is still the copy (remove the hold with it)', () => {
    // When this fails, the copy changed: delete the hold block and this file.
    expect(src).toMatch(/trial ended/i);
  });
});
