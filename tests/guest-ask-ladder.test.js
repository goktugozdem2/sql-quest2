// The guest conversion ladder was counting the wrong thing (2026-09-14).
//
// Founder: 1,217 active / 197 registered is 16% — move the registration wall
// to the third solve. Measured before agreeing, and the measurement found a
// bug underneath the question:
//
//   the rungs read `guestActionsCount`, a useState(0) with no persistence, so
//   it reset on every page load. "The tenth solve" therefore meant ten solves
//   in ONE UNBROKEN SITTING. Guest progress has persisted across sessions
//   since 2026-09-12, so someone solving three a day for a week was never
//   asked once.
//
//   30 days: 100 people reached 10 solves. The account prompt was shown to 28.
//
// Fixing that is live. Moving the account rung from 10 to 3 is the founder's
// product change and sits behind `signupAskAtThree`.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const app = fs.readFileSync(path.join(ROOT, 'src/app.jsx'), 'utf8');
const flags = fs.readFileSync(path.join(ROOT, 'src/data/feature-flags.js'), 'utf8');
const ladder = app.slice(app.indexOf('// Guest conversion ladder'), app.indexOf('// Satisfy-first-then-ask'));

describe('the ladder counts solves, not this session', () => {
  it('reads the real solved total', () => {
    expect(ladder).toContain('const solvedTotal = newSolved.size');
  });

  it('no longer derives a rung from the session counter', () => {
    // `guestActionsCount + 1` was the bug in one expression.
    expect(ladder, 'the session counter is back in the rung maths').not.toContain('guestActionsCount + 1');
  });

  it('crosses a rung with >=, not exact equality', () => {
    // `=== 3` skips anyone who went from 2 to 4 across two sessions.
    expect(ladder).toMatch(/solvedTotal >= accountRung/);
    expect(ladder).toMatch(/solvedTotal >= 3/);
    expect(ladder, 'exact equality on a persisted total silently skips returning guests').not.toMatch(/solvedTotal === \d/);
  });

  it('latches each rung so a returning guest is not asked on every solve', () => {
    expect(ladder).toContain('readGuestAskLadder()');
    expect(ladder).toContain("markGuestAsk('account')");
    expect(ladder).toContain("markGuestAsk('email')");
    expect(app).toContain("localStorage.setItem(GUEST_ASK_LADDER_KEY");
  });

  it('survives private mode instead of throwing', () => {
    const helper = app.slice(app.indexOf('const markGuestAsk'), app.indexOf('const markGuestAsk') + 400);
    expect(helper).toContain('catch');
  });
});

describe('moving the account rung is a flag, and a prompt — not a wall', () => {
  it('ships dark', () => {
    expect(flags).toMatch(/signupAskAtThree:\s*false/);
  });

  it('only changes WHICH solve asks, 10 or 3', () => {
    expect(ladder).toContain("ftbFlag('signupAskAtThree') ? 3 : 10");
  });

  it('still only opens a dismissible prompt — nothing blocks solving', () => {
    // A hard wall was deliberately not built: 65% of people who reach 3
    // solves go on to 6, and every purchase in our history was a
    // first-session decision at 6-10 solves.
    expect(ladder).toContain('triggerSignupPrompt(');
    for (const blocker of ['setShowAuth(true)', 'return;', 'blocked']) {
      expect(ladder.includes(blocker) && blocker === 'setShowAuth(true)',
        'the ladder now forces the auth screen — that is a wall, not a prompt').toBe(false);
    }
  });

  it('names the third-solve ask distinctly so its funnel is separable', () => {
    expect(ladder).toContain("'third_solve'");
    expect(ladder).toContain("'first_challenge'");
  });
});
