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
//   purchase_reason  (2026-11-23) after the checkout return, once the app
//                has SEEN the person become Pro or start a trial: "What made
//                you decide today?". Once ever. Never before payment, never
//                on the Pro modal or the payment-success modal.
//
// Rules for all three (brief docs/agent/fleet/E2-voice.md):
//   - one question, skippable, never a modal over a modal;
//   - never more than one prompt per session;
//   - never during a timed mock;
//   - never before the first solve, except `stuck` and `purchase_reason`
//     (a payment is its own reason; a buyer can arrive from a page with
//     nothing solved).
//
// Pure: no React, no storage. app.jsx reads/writes the records and asks
// these functions whether a prompt may show.

export const FEEDBACK_PROMPT_FLAGS = Object.freeze({
  exit_reason: 'exitReasonAsk',
  stuck: 'stuckAsk',
  day2: 'day2Ask',
  purchase_reason: 'purchaseReasonAsk',
});

export const FEEDBACK_PROMPT_KINDS = Object.freeze(Object.keys(FEEDBACK_PROMPT_FLAGS));

// localStorage keys (one record each; no fourth store of anything else).
export const FBP_SESSION_KEY = 'sqlquest_fbp_session_v1';   // { count, lastAt, promptIn }
export const FBP_EXIT_DAY_KEY = 'sqlquest_fbp_exit_day';     // 'YYYY-MM-DD' (local)
export const FBP_STUCK_IDS_KEY = 'sqlquest_fbp_stuck_ids';   // JSON array of challenge ids
export const FBP_DAY2_KEY = 'sqlquest_fbp_day2_at';          // ISO, once ever
export const FBP_PURCHASE_KEY = 'sqlquest_fbp_purchase_at';  // ISO, once ever
// { at, trigger } — written when the checkout return SEES Pro or a trial; the
// ask waits for a free moment (no modal up, a session with room) and dies
// after PURCHASE_PENDING_MAX_MS, when "today" no longer means anything.
export const FBP_PURCHASE_PENDING_KEY = 'sqlquest_fbp_purchase_pending';
// exit_reason answered or skipped: never asked again in this browser
// (2026-11-24, B1's read: one person answered the same card three times).
export const FBP_EXIT_DONE_KEY = 'sqlquest_fbp_exit_done_at'; // ISO

// A new session starts after an hour away — the same gap `second_session_7d`
// counts (docs/agent/metrics.md), so "the second session" means one thing.
export const SESSION_GAP_MS = 60 * 60 * 1000;
export const STUCK_NO_RUN_MS = 3 * 60 * 1000;
export const STUCK_WRONG_SUBMITS = 3;
export const DAY2_SESSION = 2;
export const FREE_TEXT_MAX = 300;
export const PURCHASE_PENDING_MAX_MS = 7 * 24 * 60 * 60 * 1000;
// What the checkout return saw. Nothing else may arm the ask.
export const PURCHASE_TRIGGERS = Object.freeze(['purchase_completed', 'trial_started']);
// How long the "thanks" line stays before the card is cleared.
export const PROMPT_THANKS_MS = 4000;

// Fixed answer lists. Ids are the data; labels are i18n keys under `feedback`.
export const EXIT_REASONS = Object.freeze([
  { id: 'too_expensive', label: 'exitTooExpensive', theme: 'price' },
  { id: 'not_ready', label: 'exitNotReady', theme: 'other' },
  { id: 'more_free', label: 'exitMoreFree', theme: 'free tier' },
  { id: 'not_what_i_need', label: 'exitNotWhatINeed', theme: 'other' },
  { id: 'other', label: 'exitOther', theme: 'other', text: true },
]);

// purchase_reason answers. The ids are the data the 12-21 read counts.
export const PURCHASE_REASONS = Object.freeze([
  { id: 'interview_soon', label: 'purchaseInterview' },
  { id: 'company_sets', label: 'purchaseCompanySets' },
  { id: 'tutor', label: 'purchaseTutor' },
  { id: 'mock_interviews', label: 'purchaseMocks' },
  { id: 'other', label: 'purchaseOther', text: true },
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
  'purchaseQ', 'purchaseInterview', 'purchaseCompanySets', 'purchaseTutor', 'purchaseMocks',
  'purchaseOther', 'purchaseOtherPlaceholder',
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
  if (kind !== 'stuck' && kind !== 'purchase_reason' && !(solvedCount >= 1)) return false;
  return true;
}

// exit_reason: only after a CLOSE of the plans with no plan click, once a
// local day, and never again once answered or skipped (`doneAt`, read from
// FBP_EXIT_DONE_KEY). `closedVia` is dismissProModal's `via`; a free-path
// pick is an answer already (the person chose to keep practising), so it is
// not asked.
export function canShowExitReason({ flagOn, closedVia, planClicked, checkoutPending, solvedCount, inTimedMock, sessionRec, lastExitDay, doneAt = null, now = Date.now() }) {
  if (!commonGate({ kind: 'exit_reason', flagOn, sessionRec, inTimedMock, solvedCount })) return false;
  if (doneAt) return false;
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

// purchase_reason: the checkout return armed it (`pending`, a valid trigger,
// not older than a week), the person is Pro NOW (a trial counts — the app
// sets Pro on a trial start), never asked before, and nothing is open over
// or in front of it (the Pro modal, the payment-success modal, the signup
// prompt, the 💬 widget, another prompt). No solve needed.
export function isPurchasePending(pending, now = Date.now()) {
  if (!pending || typeof pending !== 'object') return false;
  if (!PURCHASE_TRIGGERS.includes(pending.trigger)) return false;
  if (!Number.isFinite(pending.at) || pending.at > now) return false;
  return now - pending.at <= PURCHASE_PENDING_MAX_MS;
}

export function canShowPurchaseReason({ flagOn, isPro, pending, askedAt, inTimedMock, sessionRec, overlayOpen, now = Date.now() }) {
  if (!commonGate({ kind: 'purchase_reason', flagOn, sessionRec, inTimedMock, solvedCount: 0 })) return false;
  if (isPro !== true) return false;
  if (askedAt) return false;
  if (!isPurchasePending(pending, now)) return false;
  if (overlayOpen) return false;
  return true;
}

// ── After an answer or a skip ───────────────────────────────────────────────
//
// The defect of 2026-11-23 (docs/reads/funnel-2026-11-24.md §1): the card's
// "thanks" lived only in the card's own state. The global slot hides the card
// while a Pro modal is up and re-mounts it after the close, so the card came
// back as a fresh question, and each answer wrote another row with no new
// `feedback_prompt_shown`. The answer now lives on the prompt itself, the
// card is cleared after the thanks, and the browser remembers it.

// The localStorage key that, once written, keeps a kind from ever being asked
// again in this browser. `stuck` is remembered per challenge at show time
// (FBP_STUCK_IDS_KEY), so it has none here.
export function promptDoneKey(kind) {
  if (kind === 'exit_reason') return FBP_EXIT_DONE_KEY;
  if (kind === 'day2') return FBP_DAY2_KEY;
  // purchase_reason: its once-ever key is already written at show (before
  // the card mounts), so this is belt and braces — an answer or a skip can
  // never leave it unset, and the show effect reads that key first.
  if (kind === 'purchase_reason') return FBP_PURCHASE_KEY;
  return null;
}

// One answer per show: a prompt already answered records nothing more.
export function mayRecordAnswer(prompt) {
  return !!prompt && FEEDBACK_PROMPT_KINDS.includes(prompt.kind) && prompt.answered !== true;
}

export function markPromptAnswered(prompt, now = Date.now()) {
  if (!prompt) return prompt;
  return { ...prompt, answered: true, answeredAt: now };
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
  if (kind === 'exit_reason' || kind === 'purchase_reason') {
    const list = kind === 'exit_reason' ? EXIT_REASONS : PURCHASE_REASONS;
    if (!list.some(r => r.id === answerId)) return null;
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
