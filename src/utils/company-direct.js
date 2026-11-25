// A company-page arrival opens question 1 — an A/B (B5, onboarding, 2026-11-22).
//
// The hero of 31 company pages says "Solve <Company> question 1 now: <title>
// — free, no sign-up" (M-02). The link is `/app/?company=<Company>&goal=
// interview`, which lands on the Challenges list: tabs, the guest notice, the
// company banner's heading, a four-line provenance note, a four-line quota
// note, and then "Start with question 1: <title>" — the same promise, a
// second time, to press again. Walked headless 2026-11-22
// (docs/reads/onboarding-walk-2026-11-22.md): the general company door is the
// only door of five that needs two presses before the editor, and at 375 px
// the second button sits at the fold under ~16 lines of text. Capital One's
// hero already deep-links its question (`challenge=275`) and needs one.
//
// Arm `direct`: a person who has solved nothing and arrives with `?company=`
// (no `?challenge=`, no `?interview=`) lands in the question the banner
// would open — `companyBannerNext` in app.jsx, the set's first open unsolved
// challenge in curriculum order behind the Hard, company-set and quota
// locks. Arm `list`: today's list and banner, byte for byte. Nothing is
// asked, nothing is gated, no lock or quota moves: the direct arm opens the
// exact challenge the banner button opens, through the same openChallenge.
//
// Assignment happens once per browser, at the first cold company arrival
// while `companyDirectOpen` is on, and is written as
// `company_direct_assigned` so both arms have a denominator. Later arrivals
// read the stored arm; only a person with zero solves is ever sent straight
// in (someone with solves gets the list, whatever the arm).
//
// Hash: FNV + murmur3 finalizer, as companyAskArm — without the finalizer a
// two-arm split mirrors every other two-arm test's arms (CLAUDE.md, the A/B
// hash trap). tests/company-direct.test.js checks independence against the
// four other two-arm tests.
//
// Pure: no window, no DOM.

export const COMPANY_DIRECT_TEST_ID = 'company_direct_v1';
export const COMPANY_DIRECT_ARMS = ['direct', 'list'];
export const COMPANY_DIRECT_KEY = 'sqlquest_company_direct_v1';

export function companyDirectArm(aid) {
  let h = 2166136261;
  const s = `${String(aid)}:${COMPANY_DIRECT_TEST_ID}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return COMPANY_DIRECT_ARMS[(h >>> 0) % COMPANY_DIRECT_ARMS.length];
}

/** The stored record, or an empty one. */
export function normalizeCompanyDirectRecord(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return { arm: COMPANY_DIRECT_ARMS.includes(r.arm) ? r.arm : null };
}

/**
 * The params that make a company arrival: `?company=` without a challenge
 * or a mock of its own (those links already open something).
 */
export function isCompanyListArrival(search) {
  try {
    const p = new globalThis.URLSearchParams(search || '');
    return !!p.get('company') && !p.has('challenge') && !p.has('interview');
  } catch (_) { return false; }
}

/**
 * What to do at a company arrival, once the session (a resumed guest's
 * record included) has loaded.
 *
 *   flagOn       — FF `companyDirectOpen` === true
 *   arrival      — isCompanyListArrival(location.search) AND the company resolved
 *   aid          — the browser's anon id
 *   record       — the stored record (normalizeCompanyDirectRecord)
 *   solvedCount  — the person's solves (0 = cold)
 *   nextId       — the id companyBannerNext() returns, or null
 *
 * Returns { assign, arm, open }: write `company_direct_assigned` now; the
 * person's arm (or null when not in the test); open `nextId` now.
 */
export function companyDirectDecision({ flagOn = false, arrival = false, aid = null, record = null, solvedCount = 0, nextId = null } = {}) {
  const none = { assign: false, arm: null, open: false };
  if (!flagOn || !arrival) return none;
  const cold = solvedCount === 0;
  let { arm } = normalizeCompanyDirectRecord(record);
  let assign = false;
  if (!arm) {
    // Only a cold arrival joins the test, so both arms are the same people.
    if (!cold || !aid) return none;
    arm = companyDirectArm(aid);
    assign = true;
  }
  return { assign, arm, open: arm === 'direct' && cold && nextId != null };
}
