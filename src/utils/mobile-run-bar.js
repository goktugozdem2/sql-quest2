// Run stays on screen on phones — `mobileRunBar` (2026-11-23, rank 1 of
// docs/plans/mobile-acquisition-2026-11-23.md).
//
// ── What was measured ───────────────────────────────────────────────────────
// People who came from a page or a source, 28 days to 2026-11-23, bots and
// internal accounts out: a challenge opened → a first run is 59% on desktop
// (263 / 449) and 20% on mobile (7 / 35). On an empty-editor deep link the
// mobile figure is 2 of 23. The 390×844 walk (W1, W2) found why: the Run /
// Submit bar is `sticky bottom-0`, and sticky only holds inside its own card,
// which starts below the fold — Run sat at y = 839–879 on #91 and further
// down on #105. With the keyboard up it is fully hidden.
//
// ── The test ────────────────────────────────────────────────────────────────
// Behind `mobileRunBar` (off by default), a person who opens a challenge on a
// narrow touch screen is assigned an arm once, by a hash of their aid:
// `bar` pins the Run / Submit bar to the bottom of the viewport (above the
// keyboard where `visualViewport` says where it is), `control` keeps today's
// sticky bar. Written once as `mobile_run_bar_assigned {arm}` so both arms
// have a denominator. Read: `open_to_first_run`, mobile band, by arm
// (docs/agent/metrics.md); ledger "Run stays on screen on phones".
//
// Pure and import-free, so tests (and, if ever needed, a page script) can use
// it as is.

export const MOBILE_RUN_BAR_TEST_ID = 'mobile_run_bar_v1';
export const MOBILE_RUN_BAR_ARMS = ['control', 'bar'];
export const MOBILE_RUN_BAR_STORAGE_KEY = 'sqlquest_mobile_run_bar_v1';
// Tailwind's `md` breakpoint. The fixed bar exists only below it; from `md`
// up the bar is today's `md:static` row, in both arms.
export const MOBILE_RUN_BAR_MAX_WIDTH = 768;

/**
 * A narrow touch screen: a coarse pointer, or a viewport under 768 px.
 * The same rule `scrollToChallengeEditor` in app.jsx uses to decide not to
 * focus the editor (focusing raises the keyboard over Run), so the two
 * cannot disagree about what a phone is.
 */
export function isNarrowTouch({ coarse = false, width = null } = {}) {
  if (coarse === true) return true;
  const w = Number(width);
  return Number.isFinite(w) && w > 0 && w < MOBILE_RUN_BAR_MAX_WIDTH;
}

/**
 * The arm for an aid. FNV-style hash salted with this test's id, PLUS the
 * murmur3 finalizer (the construction of `companyAskArm`). Without the
 * finalizer the hash's low bit is the parity of the characters' sum, so a
 * two-arm `% 2` would be the exact opposite of every other two-arm test's
 * arm for the same aid (CLAUDE.md, "A/B hash trap").
 */
export function mobileRunBarArm(aid) {
  let h = 2166136261;
  const s = `${String(aid)}:${MOBILE_RUN_BAR_TEST_ID}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return MOBILE_RUN_BAR_ARMS[(h >>> 0) % MOBILE_RUN_BAR_ARMS.length];
}

/**
 * What to do when a challenge opens.
 *
 *   flagOn       — `mobileRunBar`
 *   narrowTouch  — isNarrowTouch(...) for this screen
 *   stored       — the parsed localStorage record, or null
 *   aid          — the anonymous id
 *
 * Returns { arm, assign, show }:
 *   arm     — the person's arm (stored, or assigned now), or null
 *   assign  — write the record and fire `mobile_run_bar_assigned` now
 *   show    — render the fixed bar on this screen
 *
 * Sticky: an arm on record is kept and never re-announced. Nobody is
 * assigned off a narrow touch screen (a desktop opener is not in the test's
 * population), and with the flag off nothing is assigned or shown — the
 * stored record is left alone for when it comes back on.
 */
export function mobileRunBarDecision({ flagOn = false, narrowTouch = false, stored = null, aid = null } = {}) {
  if (!flagOn) return { arm: null, assign: false, show: false };
  if (stored && MOBILE_RUN_BAR_ARMS.includes(stored.arm)) {
    return { arm: stored.arm, assign: false, show: stored.arm === 'bar' && narrowTouch === true };
  }
  if (narrowTouch !== true || !aid) return { arm: null, assign: false, show: false };
  const arm = mobileRunBarArm(aid);
  return { arm, assign: true, show: arm === 'bar' };
}

/**
 * The one line above Run in the bar arm, as an i18n key under `practice`
 * (EN "Tap Run to see the table", TR "Tabloyu görmek için Run'a dokun"), or
 * null. Only for a first-contact person (no solve yet) on an empty editor
 * that has a runnable starter — the case where one tap on Run shows the
 * table (`runChallengeQuery` runs the starter since 2026-11-22).
 * `starterSql` is `starterSqlFromHint(challengeStarterHint)`.
 */
export function runBarLabel({ solvedCount = 0, editorEmpty = false, starterSql = null } = {}) {
  if (solvedCount !== 0) return null;
  if (editorEmpty !== true) return null;
  if (typeof starterSql !== 'string' || !starterSql.trim()) return null;
  return 'runBarFirstHint';
}

/**
 * How far the bar must lift to sit above the on-screen keyboard: the part of
 * the layout viewport the visual viewport no longer covers at the bottom.
 * 0 when there is no `visualViewport`, when nothing is covered, or at `md`
 * and up (the bar is static there and must not move).
 */
export function keyboardOffset({ innerWidth = 0, innerHeight = 0, vvHeight = null, vvOffsetTop = 0 } = {}) {
  if (!(innerWidth > 0) || innerWidth >= MOBILE_RUN_BAR_MAX_WIDTH) return 0;
  if (!Number.isFinite(vvHeight) || !(innerHeight > 0)) return 0;
  const covered = innerHeight - (vvHeight + (Number.isFinite(vvOffsetTop) ? vvOffsetTop : 0));
  return covered > 1 ? Math.round(covered) : 0;
}
