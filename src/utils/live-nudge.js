// The live tutor nudge — the AI sentence after a wrong submit (2026-10-03).
//
// Found on 2026-10-03: since at least April it had never reached a person.
// The client sent an `apikey` header the ai-tutor function's CORS list did not
// allow, so the browser dropped every request at the preflight: one
// `live_nudge` row in tutor_events in 60 days, and that one was the smoke
// check, which calls from Node where CORS does not exist. Every guest also
// shared one rate bucket per challenge (`guest_<challengeId>`), and the nudge
// carried the error-pattern line but nothing about the person.
//
// Pure half; app.jsx's requestSmartTutorNudge calls these.

// What the nudge fetch sends. tests/live-nudge.test.js binds this list to the
// edge function's Access-Control-Allow-Headers, so a header the server does
// not allow can never ship again.
export const NUDGE_HEADERS = Object.freeze(['Content-Type', 'Authorization']);

export function nudgeHeaders(anonKey) {
  const h = { 'Content-Type': 'application/json' };
  if (anonKey) h.Authorization = `Bearer ${anonKey}`;
  return h;
}

// The person's own id: a registered username or the browser's guest id —
// the same one callAI sends, so the server's per-person limits apply.
export function nudgeUsername(currentUser, guestId) {
  if (typeof currentUser === 'string' && currentUser) return currentUser;
  return typeof guestId === 'function' ? guestId() : (guestId || 'guest_anon');
}

// Budget: ~100 wrong submits a day (week to 2026-10-03) against a $10/month
// tutor workspace. At most two nudges per challenge open, the second only when
// the diagnosis changed kind — a person repeating the same mistake has already
// been told what it is.
export const NUDGE_MAX_PER_CHALLENGE = 2;

export function nudgeAllowed(state, challengeId, kind) {
  const s = state && state.challengeId === challengeId ? state : { challengeId, sent: 0, lastKind: null };
  if (s.sent >= NUDGE_MAX_PER_CHALLENGE) return { ok: false, reason: 'cap', next: s };
  if (s.sent > 0 && kind === s.lastKind) return { ok: false, reason: 'same_kind', next: s };
  return { ok: true, next: { challengeId, sent: s.sent + 1, lastKind: kind } };
}

// From buildChallengeTutorContext's parts, the lines about the PERSON:
// mastery on this challenge's skills, and goal / company / days to the date.
// The query and the diagnosis are already in the nudge; the REPEAT line comes
// from describeErrorPatterns.
export function personalNudgeLines(parts) {
  return (Array.isArray(parts) ? parts : []).filter(p => typeof p === 'string' && /^(MASTERY ON THIS CHALLENGE'S SKILLS|GOAL AND DEADLINE)/.test(p));
}
