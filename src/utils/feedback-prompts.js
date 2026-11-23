// Feedback capture points 2, 3 and 4 (E2, 2026-11-22).
//
// The 💬 widget (capture point 1) waits to be found. These three ask one
// question at the moment a reason exists, and write it to the SAME table
// through the SAME anon insert (`public.feedback`, INSERT-only for anon, no
// read-back). The kind and trigger ride in `context.kind` / `context.trigger`,
// so there is no migration and nothing a `users` trigger calls is touched.
//
//   exit_reason  the Pro modal (incl. the quota wall) closed with no plan
//                click. Once a day per browser. Shown AFTER the close, never
//                in front of or over the plans. Never names a price.
//   stuck        a challenge open 3+ minutes with no run, or 3 wrong
//                submits. Once per challenge. The only ask allowed before
//                the first solve.
//   day2         the second session's first screen. Once ever.
//
// Rules for all three (brief docs/agent/fleet/E2-voice.md):
//   - one question, skippable, never a modal over a modal;
//   - never more than one prompt per session;
//   - never during a timed mock;
//   - never before the first solve, except `stuck`.
//
// Pure: no React, no storage. app.jsx reads/writes the records and asks
// these functions whether a prompt may show.

export const FEEDBACK_PROMPT_FLAGS = Object.freeze({
  exit_reason: 'exitReasonAsk',
  stuck: 'stuckAsk',
  day2: 'day2Ask',
});

export const FEEDBACK_PROMPT_KINDS = Object.freeze(Object.keys(FEEDBACK_PROMPT_FLAGS));

// localStorage keys (one record each; no fourth store of anything else).
export const FBP_SESSION_KEY = 'sqlquest_fbp_session_v1';   // { count, lastAt, promptIn }
export const FBP_EXIT_DAY_KEY = 'sqlquest_fbp_exit_day';     // 'YYYY-MM-DD' (local)
export const FBP_STUCK_IDS_KEY = 'sqlquest_fbp_stuck_ids';   // JSON array of challenge ids
export const FBP_DAY2_KEY = 'sqlquest_fbp_day2_at';          // ISO, once ever

// A new session starts after an hour away — the same gap `second_session_7d`
// counts (docs/agent/metrics.md), so "the second session" means one thing.
export const SESSION_GAP_MS = 60 * 60 * 1000;
export const STUCK_NO_RUN_MS = 3 * 60 * 1000;
export const STUCK_WRONG_SUBMITS = 3;
export const DAY2_SESSION = 2;
export const FREE_TEXT_MAX = 300;

// Fixed answer lists. Ids are the data; labels are i18n keys under `feedback`.
export const EXIT_REASONS = Object.freeze([
  { id: 'too_expensive', label: 'exitTooExpensive', theme: 'price' },
  { id: 'not_ready', label: 'exitNotReady', theme: 'other' },
  { id: 'more_free', label: 'exitMoreFree', theme: 'free tier' },
  { id: 'not_what_i_need', label: 'exitNotWhatINeed', theme: 'other' },
  { id: 'other', label: 'exitOther', theme: 'other', text: true },
]);

// The daily read's fixed theme list (brief, step 2). Extend only on purpose.
export const FEEDBACK_THEMES = Object.freeze([
  'content gap', 'bug', 'confusing UI', 'price', 'free tier',
  'interview format', 'missing company', 'performance', 'praise', 'other',
]);

// i18n keys the three prompts read (both languages must carry every one).
export const FEEDBACK_PROMPT_I18N_KEYS = Object.freeze([
  'exitQ', 'exitTooExpensive', 'exitNotReady', 'exitMoreFree', 'exitNotWhatINeed', 'exitOther',
  'exitOtherPlaceholder',
  'stuckPromptQ', 'stuckPromptPlaceholder',
  'day2Q', 'day2Placeholder',
  'promptSkip', 'promptSend', 'promptThanks',
]);

export function localDay(now = Date.now()) {
  const d = new Date(now);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ── Sessions ────────────────────────────────────────────────────────────────

// Advance the session record on app open / return. `count` is the session
// number in this browser; `promptIn` is the session number a prompt showed in.
export function nextSessionRecord(prev, now = Date.now()) {
  const ok = prev && typeof prev === 'object' && Number.isFinite(prev.count) && Number.isFinite(prev.lastAt);
  if (!ok) return { count: 1, lastAt: now, promptIn: null };
  const isNew = now - prev.lastAt > SESSION_GAP_MS;
  return {
    count: isNew ? prev.count + 1 : prev.count,
    lastAt: now,
    promptIn: Number.isFinite(prev.promptIn) ? prev.promptIn : null,
  };
}

// True when no prompt has shown in the current session.
export function sessionHasRoom(rec) {
  if (!rec || !Number.isFinite(rec.count)) return false;
  return rec.promptIn !== rec.count;
}

export function markPromptShown(rec) {
  if (!rec || !Number.isFinite(rec.count)) return rec;
  return { ...rec, promptIn: rec.count };
}

// ── The three gates ─────────────────────────────────────────────────────────

// Common gate: flag on, a session with room, not inside a mock, and (unless
// the kind is `stuck`) at least one solve.
function commonGate({ kind, flagOn, sessionRec, inTimedMock, solvedCount }) {
  if (flagOn !== true) return false;
  if (inTimedMock) return false;
  if (!sessionHasRoom(sessionRec)) return false;
  if (kind !== 'stuck' && !(solvedCount >= 1)) return false;
  return true;
}

// exit_reason: only after a CLOSE of the plans with no plan click, once a
// local day. `closedVia` is dismissProModal's `via`; a free-path pick is an
// answer already (the person chose to keep practising), so it is not asked.
export function canShowExitReason({ flagOn, closedVia, planClicked, checkoutPending, solvedCount, inTimedMock, sessionRec, lastExitDay, now = Date.now() }) {
  if (!commonGate({ kind: 'exit_reason', flagOn, sessionRec, inTimedMock, solvedCount })) return false;
  if (planClicked || checkoutPending) return false;
  if (typeof closedVia !== 'string' || !closedVia || closedVia.startsWith('free_path')) return false;
  if (lastExitDay && lastExitDay === localDay(now)) return false;
  return true;
}

// Which stuck trigger has fired, if any. A run (or a submit) answers "no run";
// wrong submits count only wrong RESULTS (a syntax error is not a wrong answer).
export function stuckTrigger({ msOpen, hasRun, wrongSubmits }) {
  if ((wrongSubmits || 0) >= STUCK_WRONG_SUBMITS) return 'wrong_3';
  if (!hasRun && (msOpen || 0) >= STUCK_NO_RUN_MS) return 'no_run_3m';
  return null;
}

export function canShowStuck({ flagOn, challengeId, askedIds, trigger, solved, inTimedMock, sessionRec }) {
  if (!commonGate({ kind: 'stuck', flagOn, sessionRec, inTimedMock, solvedCount: 0 })) return false;
  if (challengeId == null || !trigger || solved) return false;
  const asked = Array.isArray(askedIds) ? askedIds.map(String) : [];
  if (asked.includes(String(challengeId))) return false;
  return true;
}

// day2: the second session, once ever, on the first screen — nothing open
// over or in front of it (no challenge, no modal, no other prompt).
export function canShowDay2({ flagOn, sessionRec, askedAt, solvedCount, inTimedMock, challengeOpen, overlayOpen }) {
  if (!commonGate({ kind: 'day2', flagOn, sessionRec, inTimedMock, solvedCount })) return false;
  if (askedAt) return false;
  if (!sessionRec || sessionRec.count !== DAY2_SESSION) return false;
  if (challengeOpen || overlayOpen) return false;
  return true;
}

// ── What is written ─────────────────────────────────────────────────────────

// A first guess at the theme for the daily read. The reader tags for real;
// this only saves a step on the fixed-answer rows.
export function suggestTheme(kind, answerId) {
  if (kind === 'exit_reason') return (EXIT_REASONS.find(r => r.id === answerId) || {}).theme || 'other';
  if (kind === 'stuck') return 'content gap';
  return null;
}

export function cleanText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, FREE_TEXT_MAX);
}

// The message column needs 1+ characters; a one-tap answer writes its id.
// Returns null when there is nothing to write (a free-text prompt sent empty).
export function buildPromptSubmission({ kind, trigger, answerId = null, text = '', challengeId = null }) {
  if (!FEEDBACK_PROMPT_KINDS.includes(kind)) return null;
  const t = cleanText(text);
  let message;
  if (kind === 'exit_reason') {
    if (!EXIT_REASONS.some(r => r.id === answerId)) return null;
    message = t ? `${answerId}: ${t}` : answerId;
  } else {
    if (!t) return null;
    message = t;
  }
  return {
    message,
    topic: kind,
    context: {
      kind,
      trigger: trigger || null,
      answer: answerId,
      challengeId: challengeId == null ? null : challengeId,
      themeHint: suggestTheme(kind, answerId),
    },
  };
}
