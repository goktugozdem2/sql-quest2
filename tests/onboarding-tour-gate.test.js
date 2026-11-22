// The 6-step challenge tour never opens on a challenge already solved
// (A2 live QA, 2026-11-22). Since the first screen became challenge 91 (#99),
// the first solve is what ends the first-run shell, and the tour's effect —
// gated only on that shell — fired 600 ms after the win: "Read the problem"
// on the solved challenge, stacked over the intent ask and the archetype
// card. scripts/smoke-test.js checks the same thing in the browser.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

const src = fs.readFileSync('src/app.jsx', 'utf8');

function tourEffect() {
  const fire = src.indexOf('setTimeout(() => setShowOnboardingTour(true), 600)');
  expect(fire, 'the tour auto-start effect').toBeGreaterThan(0);
  const start = src.lastIndexOf('useEffect(() => {', fire);
  const end = src.indexOf(']);', fire);
  return { body: src.slice(start, fire), deps: src.slice(src.lastIndexOf('}, [', end), end + 3) };
}

describe('the challenge tour auto-start', () => {
  it('returns early on a challenge the person has already solved, before the timer', () => {
    const { body } = tourEffect();
    expect(body).toMatch(/if \(solvedChallenges\.has\(currentChallenge\.id\)\) return;/);
  });

  it('re-runs when the solved set changes (otherwise the guard reads a stale set)', () => {
    const { deps } = tourEffect();
    expect(deps).toContain('solvedChallenges');
  });

  it('keeps the existing gates: first-run shell, deep links, the stored completion', () => {
    const { body } = tourEffect();
    expect(body).toContain('if (showFirstRunSimpleShell) return;');
    expect(body).toContain('if (hasContentDeepLink) return;');
    expect(body).toContain("localStorage.getItem('sqlquest_onboarding_v1')");
  });
});
