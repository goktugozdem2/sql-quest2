// `challenge_left` (2026-11-24, from B1's read docs/reads/funnel-2026-11-24.md
// §4 and signal 2). In the 28 days to 11-24, 225 of 631 new app openers
// opened a challenge and never ran it, and 73–80% of them left no event after
// the open. This event records how such an open ended, so the next
// experiment on open → run knows whether it was a bounce or a give-up.
//
// One event per challenge open (`challenge_opened`), sent when the person
// leaves the challenge without having run or submitted anything:
//   navigate  the challenge page left the screen inside the app (back to the
//             list, another tab of the app);
//   hidden    the browser tab went hidden or the page was unloaded
//             (`visibilitychange` → hidden, `pagehide`). A person who comes
//             back and runs shows a `challenge_first_run` after it;
//   switch    another challenge was opened over it.
//
// Fields are counts and flags only. Never the query text, never anything
// personal: `typed` is the number of characters the person inserted in the
// editor (deletions are not subtracted), never what they were.
//
// Pure: no React, no DOM, no storage. app.jsx keeps one open record in a ref
// and asks these functions what to do with it. Metric: `open_to_run_exit`
// (docs/agent/metrics.md).

export const CHALLENGE_LEFT_EVENT = 'challenge_left';
export const CHALLENGE_LEFT_HOWS = Object.freeze(['navigate', 'hidden', 'switch']);
// The keys the event carries, and nothing else (the shared stamps that
// trackActivationEvent adds — tz, viewport, intent, aid — are not ours).
export const CHALLENGE_LEFT_FIELDS = Object.freeze([
  'challengeId', 'ms_on_page', 'typed', 'scrolled', 'hint_opened', 'device_class', 'how',
]);

// The same bands as trackActivationEvent's `viewport` stamp.
export function deviceClassFor(width) {
  const w = Number(width);
  if (!Number.isFinite(w) || w <= 0) return null;
  return w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop';
}

export function startOpen(challengeId, now = Date.now()) {
  if (challengeId == null) return null;
  return { challengeId, openedAt: now, typed: 0, scrolled: false, hintOpened: false, ran: false, seen: false, sent: false };
}

// The editor changed by the person's hand: count inserted characters only.
export function noteTyped(open, prevText, nextText) {
  if (!open) return open;
  const added = String(nextText || '').length - String(prevText || '').length;
  return added > 0 ? { ...open, typed: open.typed + added } : open;
}

export function noteFlag(open, flag) {
  if (!open || !['scrolled', 'hintOpened', 'ran', 'seen'].includes(flag) || open[flag] === true) return open;
  return { ...open, [flag]: true };
}

// Which way the person left, given the challenge on screen now (null when no
// challenge page is on screen). Null while the open is still on screen.
export function leaveHowForView(open, viewId) {
  if (!open) return null;
  if (viewId != null && String(viewId) === String(open.challengeId)) return null;
  return viewId == null ? 'navigate' : 'switch';
}

// Send only for an open the person saw, never ran, and has not been sent for.
export function shouldSendLeft(open, how) {
  if (!open || open.sent === true || open.ran === true || open.seen !== true) return false;
  return CHALLENGE_LEFT_HOWS.includes(how);
}

export function markSent(open) {
  return open ? { ...open, sent: true } : open;
}

export function challengeLeftPayload(open, { how, now = Date.now(), width = null } = {}) {
  return {
    challengeId: open.challengeId,
    ms_on_page: Math.max(0, Math.round(now - open.openedAt)),
    typed: open.typed,
    scrolled: open.scrolled === true,
    hint_opened: open.hintOpened === true,
    device_class: deviceClassFor(width),
    how,
  };
}
