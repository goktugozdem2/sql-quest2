// One layer at a time after a solve on a phone — `mobileOneLayer`
// (2026-11-23, rank 3 of docs/plans/mobile-acquisition-2026-11-23.md).
//
// The walk at 390×844 (screenshot 07-after-submit) found five layers open at
// once after the first solve: the intent modal, the Skillmap "Explorer" card
// (RadarPopToast), the LEVEL UP overlay, the achievement toast and the
// achievement share bar — with close targets of 24×24 and 9×16 px. Mobile
// landers reach a first solve 2.6% of the time (AN, 28 days); the first solve
// is where a phone person decides to stay.
//
// Arm `one`, on a narrow touch screen only, shows the layers one at a time in
// a fixed priority:
//   1. the solve feedback itself (inline on the challenge page, never gated);
//   2. the ask — the company ask's inline line (with its date follow-up),
//      then the soft email capture, then the intent question;
//   3. everything else (achievement, level up, Skillmap card, share bar,
//      streak card): held from the solve until the next challenge opens; at
//      that open the first one still pending shows, the rest are dropped for
//      the session. A layer of tier 3 never renders over a modal.
// Every close target on a shown layer is at least 44×44 in this arm.
// Arm `control`, every desktop and the flag off: today's behaviour.
//
// Read: `second_solve_same_session`, mobile band, by arm
// (docs/agent/metrics.md); ledger "One layer at a time after a solve on
// phones". Pure and import-free.

export const MOBILE_ONE_LAYER_TEST_ID = 'mobile_one_layer_v1';
export const MOBILE_ONE_LAYER_ARMS = ['control', 'one'];
export const MOBILE_ONE_LAYER_STORAGE_KEY = 'sqlquest_mobile_one_layer_v1';
export const MOBILE_ONE_LAYER_MAX_WIDTH = 768;
// The smallest close target on a shown layer in the `one` arm (Apple HIG /
// WCAG 2.5.5). app.jsx writes it as Tailwind's `min-w-[44px] min-h-[44px]`.
export const ONE_LAYER_MIN_TARGET_PX = 44;

// Tier 2, in order: the asks. The soft email capture already sequenced ahead
// of the intent question on main; the order keeps that.
// `company_ask` (2026-11-24): the company ask's inline line — and its one
// follow-up, the interview date, which is the same layer, not a new one. It
// goes first: it is on screen at the solve itself, while the soft email
// modal arrives 1.5 s later (third solve), and a modal must not land on a
// field the person may be typing into. The email waits until the line is
// answered or skipped, or until the next challenge opens. The intent modal
// never meets it: it is suppressed on the solve the line shows.
export const ONE_LAYER_ASKS = ['company_ask', 'soft_email', 'intent_ask'];
// Tier 3, in order: the rest of the post-solve layers.
export const ONE_LAYER_EXTRAS = ['achievement', 'level_up', 'radar_pop', 'milestone_share', 'streak_card'];
export const ONE_LAYER_ORDER = [...ONE_LAYER_ASKS, ...ONE_LAYER_EXTRAS];

/**
 * A narrow touch screen: a coarse pointer, or a viewport under 768 px.
 * DUPLICATE of `isNarrowTouch` in src/utils/mobile-run-bar.js (PR #271, not
 * merged when this was written) — the same rule as `scrollToChallengeEditor`.
 * Fold into that one once both are on main.
 */
export function isNarrowTouch({ coarse = false, width = null } = {}) {
  if (coarse === true) return true;
  const w = Number(width);
  return Number.isFinite(w) && w > 0 && w < MOBILE_ONE_LAYER_MAX_WIDTH;
}

/**
 * The arm for an aid: FNV-style hash salted with this test's id, PLUS the
 * murmur3 finalizer (the construction of `companyAskArm`). Without the
 * finalizer the low bit is the parity of the characters' sum, and a two-arm
 * `% 2` would be the exact opposite of every other two-arm test (CLAUDE.md,
 * "A/B hash trap").
 */
export function mobileOneLayerArm(aid) {
  let h = 2166136261;
  const s = `${String(aid)}:${MOBILE_ONE_LAYER_TEST_ID}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return MOBILE_ONE_LAYER_ARMS[(h >>> 0) % MOBILE_ONE_LAYER_ARMS.length];
}

/**
 * Who is in the arm, and whether to assign now.
 *
 *   flagOn       — `mobileOneLayer`
 *   narrowTouch  — isNarrowTouch(...) for this screen
 *   stored       — the parsed localStorage record, or null
 *   aid          — the anonymous id
 *   atSolve      — true at a correct submit (the only moment a person is
 *                  assigned); false at a challenge open (read the record only)
 *
 * Returns { arm, assign, show }. Sticky: a stored arm is kept and never
 * re-announced. Nobody is assigned off a narrow touch screen, and with the
 * flag off nothing is assigned or shown.
 */
export function mobileOneLayerDecision({ flagOn = false, narrowTouch = false, stored = null, aid = null, atSolve = false } = {}) {
  if (!flagOn) return { arm: null, assign: false, show: false };
  if (stored && MOBILE_ONE_LAYER_ARMS.includes(stored.arm)) {
    return { arm: stored.arm, assign: false, show: stored.arm === 'one' && narrowTouch === true };
  }
  if (atSolve !== true || narrowTouch !== true || !aid) return { arm: null, assign: false, show: false };
  const arm = mobileOneLayerArm(aid);
  return { arm, assign: true, show: arm === 'one' };
}

const rank = (id) => ONE_LAYER_ORDER.indexOf(id);

/**
 * The one layer to render now, or null.
 *
 *   active     — ids of the layers whose state is set (any order; unknown
 *                ids are ignored)
 *   hold       — a solve happened and the next challenge has not opened yet
 *   modalOpen  — another modal is up (the Pro modal, the signup prompt)
 *
 * An ask always wins (priority 2). A tier-3 layer renders only when no ask is
 * up, no other modal is up and the hold is off — so a toast never stacks over
 * a modal, and nothing of tier 3 opens in the solve moment.
 */
export function oneLayerPick({ active = [], hold = false, modalOpen = false } = {}) {
  const known = [...new Set(active)].filter((id) => rank(id) >= 0).sort((a, b) => rank(a) - rank(b));
  const ask = known.find((id) => ONE_LAYER_ASKS.includes(id));
  if (ask) return ask;
  if (hold || modalOpen) return null;
  return known.find((id) => ONE_LAYER_EXTRAS.includes(id)) || null;
}

/**
 * At the next challenge open, the held tier-3 layers: the first by priority
 * is kept (it shows now, alone), the rest are dropped for the session.
 * Asks are never dropped here.
 */
export function oneLayerRelease(active = []) {
  const extras = [...new Set(active)].filter((id) => ONE_LAYER_EXTRAS.includes(id)).sort((a, b) => rank(a) - rank(b));
  return { keep: extras[0] || null, drop: extras.slice(1) };
}
