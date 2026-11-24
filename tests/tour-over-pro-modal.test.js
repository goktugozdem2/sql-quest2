// No onboarding tour renders over the Pro modal (payment test, 2026-11-23,
// docs/reads/payment-test-2026-11-23.md). A guest with a solve who opened
// the Challenges tab and then a locked Hard — or pressed the header's Pro
// button — met the Pro modal with the Challenges tour's "STEP 1 OF 5"
// tooltip (z 9999) on top of it: beside the plans on a desktop, pinned
// across the bottom of a 375 px phone over the trial terms and the rest of
// the modal. Every <OnboardingTour> render must wait for the modal to close.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

const src = fs.readFileSync('src/app.jsx', 'utf8');

// The JSX condition that guards each `<OnboardingTour` element: the text
// from the nearest `{` that opens a `… && (` block up to the element.
function tourGuards() {
  const guards = [];
  let at = src.indexOf('<OnboardingTour');
  while (at !== -1) {
    const open = src.lastIndexOf('\n      {', at);
    guards.push(src.slice(open, at).trim());
    at = src.indexOf('<OnboardingTour', at + 1);
  }
  return guards;
}

describe('onboarding tours and the Pro modal', () => {
  it('finds every tour render (first entry, Challenges entry, challenge, app)', () => {
    expect(tourGuards().length).toBe(4);
  });

  it('every tour render is gated on the Pro modal being closed', () => {
    for (const guard of tourGuards()) {
      expect(guard, guard.slice(0, 120)).toMatch(/&& !showProModal && \($/);
    }
  });
});
