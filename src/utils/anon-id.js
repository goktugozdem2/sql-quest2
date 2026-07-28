// Persistent anonymous id — the join key our funnel never had.
//
// THE DEFECT
// ----------
// Every event goes through writeProEvent, which stamps
// `username: currentUser || 'guest'`. For events that fire before the session
// settles — or on the return leg of a Stripe redirect — currentUser is empty,
// so they all land under the single literal string 'guest'. Measured over the
// 30 days to 2026-07-28:
//
//   app_opened              617 rows, 617 unjoinable  (100%)
//   returned_next_day       415 rows, 250 unjoinable  ( 60%)
//   signup_completed         52 rows,  25 unjoinable  ( 48%)
//   pro_purchase_completed    6 rows,   3 unjoinable  ( 50%)
//   pro_checkout_returned     2 rows,   2 unjoinable  (100%)
//   quiz_answered             2 rows,   2 unjoinable  (100%)
//
// The counts are real; the identities are gone. That is why hypothesis CO-1
// ("of the next 10 real pro_checkout_returned rows, zero are never_navigated")
// is unreadable — not merely low n, but every row that exists is anonymous.
// It is also why "how many arrivals leave without starting anything?" has no
// answer: app_opened is the declared funnel denominator and cannot be joined
// to a single downstream step.
//
// WHY NOT JUST FIX username
// -------------------------
// Because 520+ historical app_opened rows are labelled 'guest', and the
// Aug 3 cohort read compares against that series. Changing what username
// means mid-flight would put a discontinuity right before the read. This is
// purely additive: username keeps its current (broken) behaviour, and a
// stable id rides alongside in metadata where nothing depends on it yet.
//
// SCOPE
// -----
// A first-party random id in localStorage, used only to stitch this browser's
// own events together. Not a fingerprint, not shared with anyone, and it dies
// with the user clearing site data — which also means it over-counts people
// who clear storage or use two browsers. That is the honest limit: it makes
// events joinable WITHIN a browser, which is what every one of the broken
// events above actually needs.

export const ANON_ID_KEY = 'sqlquest_aid';

/** Random 128-bit id, hex. crypto.randomUUID where available. */
function mint(cryptoObj) {
  const c = cryptoObj;
  try {
    if (c && typeof c.randomUUID === 'function') return c.randomUUID().replace(/-/g, '');
  } catch (_) { /* fall through */ }
  try {
    if (c && typeof c.getRandomValues === 'function') {
      const buf = new Uint8Array(16);
      c.getRandomValues(buf);
      return Array.from(buf, b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (_) { /* fall through */ }
  // Last resort. Weaker, but an id that collides occasionally still beats
  // 617 rows sharing the string 'guest'.
  let out = '';
  for (let i = 0; i < 32; i++) out += Math.floor(Math.random() * 16).toString(16);
  return out;
}

/**
 * The stable id for this browser, minting and persisting one on first call.
 *
 * Never throws and never returns null — private-mode Safari and
 * storage-blocked embeds throw on localStorage access, and an analytics
 * helper must not be able to break a page. In that case the caller gets a
 * per-session id that is still useful for stitching one visit together.
 */
export function getAnonId(storage, cryptoObj) {
  const store = storage !== undefined
    ? storage
    : (typeof localStorage !== 'undefined' ? localStorage : null);
  const c = cryptoObj !== undefined
    ? cryptoObj
    : (typeof crypto !== 'undefined' ? crypto : null);

  try {
    const existing = store && store.getItem(ANON_ID_KEY);
    if (existing && /^[0-9a-f]{32}$/.test(existing)) return existing;
  } catch (_) { /* unreadable storage — fall through to mint */ }

  const fresh = mint(c);
  try { if (store) store.setItem(ANON_ID_KEY, fresh); } catch (_) { /* unwritable — id is session-scoped */ }
  return fresh;
}
