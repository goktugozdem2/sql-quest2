// The company page's hero names question 1 (M-02,
// docs/plans/monetization-ideas-2026-11-22.md).
//
// Company pages are the best money door per arrival (2.3% trial-or-paid vs
// 0.5% for /sql-exercises/, 45 days to 2026-11-22), but only 19% of the
// people who land on one open the app. The hero said "Start the <Company>
// set — free" and the first runnable question was not on screen. The hero
// button now names the question the app will hand them, and says it is free
// with no sign-up (a visitor starts as a guest).
//
// The question MUST be the one the app's company banner opens for a cold
// visitor (src/app.jsx `companyBannerNext`, 2026-11-20): the set's first
// unsolved challenge in CURRICULUM order (pickNextChallengeWith — never raw
// order, src/utils/challenge-order.js), behind the same locks — a Hard that
// is not a free preview is Pro, and under `companySetGate` only the first
// three of the set in the set's own order (companySetFreeIds) open from the
// company view. A cold visitor has solved nothing and is under the free
// quota, so those are the only two locks that apply.
//
// Pure: no window, no DOM. The page generator (scripts/build-company-pages.mjs)
// and tests/company-hero-cta.test.js both call it.

import { pickNextChallengeWith, isFreePreview } from './challenge-order.js';
import { companySetFreeIds } from './free-tier-boundary.js';

export function companyFirstQuestion({ order, scoped, setGateOn = true } = {}) {
  const pool = Array.isArray(scoped) ? scoped.filter(Boolean) : [];
  if (pool.length === 0) return null;
  const free = setGateOn ? companySetFreeIds(pool) : null;
  return pickNextChallengeWith(order || new Map(), pool, c =>
    !(c.difficulty === 'Hard' && !isFreePreview(c))
    && (!free || free.has(c.id))
  );
}

// The words on the button. Names the company, the question and that it costs
// nothing to start; never a count (counts come from helpers, and a hero
// button is not the place), never a frequency claim.
export function companyHeroCtaText(name, challenge) {
  if (!name) return null;
  if (!challenge || !challenge.title) return `Solve ${name} question 1 now — free, no sign-up`;
  return `Solve ${name} question 1 now: ${challenge.title} — free, no sign-up`;
}
