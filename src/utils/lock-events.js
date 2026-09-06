// Dedupe for `content_lock_reached`.
//
// WHY THIS FILE EXISTS (2026-09-06, paywall-surfaces T3)
//
// The 2026-08-21 lock read (docs/agent/ledger.md, "instrument the paid walls")
// found 47 raw `content_lock_reached` rows for 16 people: one click on a
// locked Hard row wrote ~3 events, 192ms apart. The read survived only because
// it counted people, never hits — every per-hit number from that event is
// inflated by roughly 3x until the deploy that ships this file.
//
// The rule: one event per user+challenge per 2 seconds. The scope is
// deliberately PER CHALLENGE — a user who clicks two different locked rows
// inside 2s has two real intents and gets two events. The window is short on
// purpose: a genuine second click on the same locked row 3s later is a second
// collision and should count.
//
// This is a pure function over caller-owned state so app.jsx can keep one
// store per session in a `useRef` and the rule stays unit-testable without
// React. Fails OPEN: anything malformed (no state, no key, bad clock) emits —
// a dedupe bug must never make a real collision disappear.

export const LOCK_EVENT_WINDOW_MS = 2000;

/**
 * Build the dedupe key for one person + one challenge. `user` is the username
 * when signed in, otherwise the anonymous `aid` — the same identity rule the
 * event itself is stitched by (see writeProEvent in app.jsx).
 *
 * @param {string|null|undefined} user username or aid
 * @param {number|string} challengeId
 * @returns {string}
 */
export function lockEventKey(user, challengeId) {
  const who = user == null || user === '' ? 'guest' : String(user);
  return `${who}:${challengeId}`;
}

/**
 * Decide whether a lock event for `key` should be written now.
 *
 * Returns true — and records `nowMs` for `key` — when there has been no
 * emission for that key inside the last `windowMs`. Returns false otherwise,
 * WITHOUT touching the recorded timestamp, so a burst cannot extend its own
 * window (three hits at 0/192/384ms all anchor to 0; a fourth at 2100ms
 * emits).
 *
 * `state` is a plain object or a Map the caller owns; keys are whatever
 * `lockEventKey` produced.
 *
 * @param {Record<string, number>|Map<string, number>} state
 * @param {string} key
 * @param {number} nowMs
 * @param {number} [windowMs]
 * @returns {boolean}
 */
export function shouldEmitLockEvent(state, key, nowMs, windowMs = LOCK_EVENT_WINDOW_MS) {
  // Fail open on anything we cannot reason about.
  if (state == null || typeof state !== 'object') return true;
  if (typeof key !== 'string' || key === '') return true;
  if (typeof nowMs !== 'number' || !Number.isFinite(nowMs)) return true;
  const win = typeof windowMs === 'number' && Number.isFinite(windowMs) && windowMs > 0
    ? windowMs
    : LOCK_EVENT_WINDOW_MS;

  const isMap = typeof state.get === 'function' && typeof state.set === 'function';
  const last = isMap ? state.get(key) : (Object.prototype.hasOwnProperty.call(state, key) ? state[key] : undefined);

  if (typeof last === 'number' && Number.isFinite(last)) {
    const elapsed = nowMs - last;
    // A negative elapsed means the clock went backwards (NTP step, manual
    // change). Treat it as "no recent emission" rather than suppressing for
    // however long the jump was.
    if (elapsed >= 0 && elapsed < win) return false;
  }

  if (isMap) state.set(key, nowMs); else state[key] = nowMs;
  return true;
}
