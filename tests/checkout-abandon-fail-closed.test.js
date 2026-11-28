// checkout-abandon's per-person checks fail closed (A3, 2026-11-26).
//
// On 2026-11-23 at 15:00 UTC the read "has this person ever clicked a plan?"
// (pro_events, username + event) hit the 8 s statement timeout. The function
// destructured only `data`, so the error vanished and the person read as
// "never clicked" — eligible for an outward email the check exists to stop.
// pro_events has no username index (BACKLOG A3-5), so the timeout can recur.
//
// Rule pinned here: every gate read that decides whether to mail (or which
// link to send) treats an errored read as "blocked", never as "no rows".
// pending_subscriptions is left out on purpose: that table does not exist in
// production (404 on every call), so failing closed on it would stop the
// guest path entirely; that is a separate decision.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'supabase/functions/checkout-abandon/index.ts'), 'utf8');

describe('checkout-abandon: gate reads fail closed', () => {
  it('segment 2: an errored "clicked ever" read skips the person', () => {
    expect(src).toMatch(/const \{ data: clickedEver, error: clickedErr \} = await supabase/);
    expect(src).toMatch(/if \(clickedErr \|\| \(clickedEver && clickedEver\.length > 0\)\) \{ skipped2\+\+; continue \}/);
  });

  it('recovery link: an errored "trial or paid before" read counts as trial or paid', () => {
    expect(src).toMatch(/const \{ data: used, error: usedErr \} = await supabase/);
    expect(src).toMatch(/const trialOrPaidBefore = !!usedErr \|\| !!\(used && used\.length > 0\)/);
  });

  it('address checks: an errored once-ever or unsubscribe read blocks the address', () => {
    expect(src).toMatch(/if \(priorErr \|\| \(prior && prior\.length > 0\)\) return true/);
    expect(src).toMatch(/if \(capErr \|\| cap\?\.unsubscribed\) return true/);
  });

  it('no per-person read on pro_events drops its error (only `data` destructured)', () => {
    // A list read that errors returns no rows and so mails nobody (fail
    // closed by shape). A per-person read (`.eq('username', username)`) that
    // errors and returns no rows reads as "no history" — that one must take
    // `error` too.
    const dataOnly = /const \{ data: (\w+) \} = await supabase\s*\n\s*\.from\('pro_events'\)[\s\S]{0,160}?\.eq\('username', username\)/g;
    const offenders = [...src.matchAll(dataOnly)]
      .map((m) => m[1])
      // `expired` only picks which link to show; a miss keeps today's link.
      .filter((name) => name !== 'expired');
    expect(offenders).toEqual([]);
  });
});
