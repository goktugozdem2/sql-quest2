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
//   least_ready  (2026-11-25) "Which part of the real interview do you feel
//                least ready for?" — on a mock's results screen (first full
//                sitting) or on the Interview tab (an interview person who
//                has never finished a mock). Once per browser across both.
//   outcome_debrief (2026-11-25) "What do you wish you had practised more?"
//                after an interview the person says did not go their way —
//                the in-app outcome ask or the ?outcome=failed door.
//                Gates for both new kinds: src/utils/interview-asks.js.
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
  least_ready: 'leastReadyAsk',
  outcome_debrief: 'outcomeDebriefAsk',
});

export const FEEDBACK_PROMPT_KINDS = Object.freeze(Object.keys(FEEDBACK_PROMPT_FLAGS));

// localStorage keys (one record each; no fourth store of anything else).
export const FBP_SESSION_KEY = 'sqlquest_fbp_session_v1';   // { count, lastAt, promptIn }
export const FBP_EXIT_DAY_KEY = 'sqlquest_fbp_exit_day';     // 'YYYY-MM-DD' (local)
export const FBP_STUCK_IDS_KEY = 'sqlquest_fbp_stuck_ids';   // JSON array of challenge ids
export const FBP_DAY2_KEY = 'sqlquest_fbp_day2_at';          // ISO, once ever
// exit_reason answered or skipped: never asked again in this browser
// (2026-11-24, B1's read: one person answered the same card three times).
export const FBP_EXIT_DONE_KEY = 'sqlquest_fbp_exit_done_at'; // ISO
// least_ready answered or skipped, from either place: never asked again in
// this browser (docs/plans/interview-prep-feedback-2026-11-25.md).
export const FBP_LEAST_READY_KEY = 'sqlquest_fbp_least_ready_at'; // ISO

// A new session starts after an hour away — the same gap `second_session_7d`
// counts (docs/agent/metrics.md), so "the second session" means one thing.
export const SESSION_GAP_MS = 60 * 60 * 1000;
export const STUCK_NO_RUN_MS = 3 * 60 * 1000;
export const STUCK_WRONG_SUBMITS = 3;
export const DAY2_SESSION = 2;
export const FREE_TEXT_MAX = 300;
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

// least_ready (2026-11-25): the plan's eight fixed answers. `no_interview`
// is there on purpose — most mock sitters sat the free fundamentals mock and
// several are not preparing for one; without it the list assumes an
// interview they don't have.
export const LEAST_READY_OPTIONS = Object.freeze([
  { id: 'time_pressure', label: 'lrTimePressure', theme: 'interview format' },
  { id: 'window_functions', label: 'lrWindowFunctions', theme: 'content gap' },
  { id: 'joins_aggregation', label: 'lrJoinsAggregation', theme: 'content gap' },
  { id: 'business_question', label: 'lrBusinessQuestion', theme: 'interview format' },
  { id: 'explaining', label: 'lrExplaining', theme: 'interview format' },
  { id: 'edge_cases', label: 'lrEdgeCases', theme: 'content gap' },
  { id: 'no_interview', label: 'lrNoInterview', theme: 'other' },
  { id: 'other', label: 'lrOther', theme: 'other', text: true },
]);

// The fixed-answer kinds and their lists. A kind not here is one line of text.
export const PROMPT_OPTIONS = Object.freeze({
  exit_reason: EXIT_REASONS,
  least_ready: LEAST_READY_OPTIONS,
});

// The question and the line's placeholder, per kind (i18n keys under `feedback`).
export const PROMPT_COPY = Object.freeze({
  exit_reason: { q: 'exitQ', placeholder: 'exitOtherPlaceholder' },
  stuck: { q: 'stuckPromptQ', placeholder: 'stuckPromptPlaceholder' },
  day2: { q: 'day2Q', placeholder: 'day2Placeholder' },
  least_ready: { q: 'leastReadyQ', placeholder: 'leastReadyOtherPlaceholder' },
  outcome_debrief: { q: 'debriefQ', placeholder: 'debriefPlaceholder' },
});

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
  'leastReadyQ', 'lrTimePressure', 'lrWindowFunctions', 'lrJoinsAggregation', 'lrBusinessQuestion',
  'lrExplaining', 'lrEdgeCases', 'lrNoInterview', 'lrOther', 'leastReadyOtherPlaceholder',
  'debriefQ', 'debriefPlaceholder',
  'outcomeAskQ', 'outcomeAskPassed', 'outcomeAskFailed', 'outcomeAskNotYet',
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

// Kinds asked without a solve: `stuck` (the challenge page) and
// `outcome_debrief` (it asks about an interview the person just told us
// about, not about the product; the ?outcome door can arrive before the
// session's solves have loaded).
export const NO_SOLVE_KINDS = Object.freeze(['stuck', 'outcome_debrief']);

// Common gate: flag on, a session with room, not inside a mock, and (unless
// the kind is in NO_SOLVE_KINDS) at least one solve.
export function commonGate({ kind, flagOn, sessionRec, inTimedMock, solvedCount }) {
  if (flagOn !== true) return false;
  if (inTimedMock) return false;
  if (!sessionHasRoom(sessionRec)) return false;
  if (!NO_SOLVE_KINDS.includes(kind) && !(solvedCount >= 1)) return false;
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
  if (kind === 'least_ready') return FBP_LEAST_READY_KEY;
  return null;
}

// Where a prompt renders. `global` is the card above the 💬 button (the
// exit_reason / day2 slot, never while the Pro modal is up); `challenge` is
// the stuck card on the challenge page; `inline` is the screen that asked —
// least_ready on the mock results or the Interview tab, and the debrief in
// place of the in-app outcome card. Only the debrief after the
// ?outcome=failed link has no card to sit in, so it takes the global slot.
export function promptSlot(prompt) {
  if (!prompt || !FEEDBACK_PROMPT_KINDS.includes(prompt.kind)) return null;
  if (prompt.kind === 'stuck') return 'challenge';
  if (prompt.kind === 'least_ready') return 'inline';
  if (prompt.kind === 'outcome_debrief') return prompt.trigger === 'outcome_link' ? 'global' : 'inline';
  return 'global';
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
  if (kind === 'least_ready') return (LEAST_READY_OPTIONS.find(r => r.id === answerId) || {}).theme || 'other';
  if (kind === 'outcome_debrief') return 'content gap';
  return null;
}

export function cleanText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, FREE_TEXT_MAX);
}

// Extra context a kind may carry (2026-11-25). A whitelist, so a caller can
// never put a date, an email or a name on the row: integers, booleans and
// the ids/company the funnel events already carry. `daysOut` / `daysSince`
// are the integers, never the date (the prep_target_set rule).
export const PROMPT_EXTRA_KEYS = Object.freeze({
  least_ready: ['interviewId', 'passed', 'percentage', 'company', 'daysOut'],
  outcome_debrief: ['outcome', 'company', 'daysSince', 'surface'],
});

export function pickPromptExtra(kind, extra) {
  const keys = PROMPT_EXTRA_KEYS[kind];
  if (!keys || !extra || typeof extra !== 'object') return {};
  const out = {};
  for (const k of keys) {
    const v = extra[k];
    if (v === undefined) continue;
    if (v === null || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v))) out[k] = v;
    else if (typeof v === 'string' && !/\d{4}-\d{2}-\d{2}/.test(v) && !v.includes('@')) out[k] = v.slice(0, 80);
  }
  return out;
}

// The message column needs 1+ characters; a one-tap answer writes its id.
// Returns null when there is nothing to write (a free-text prompt sent empty).
export function buildPromptSubmission({ kind, trigger, answerId = null, text = '', challengeId = null, extra = null }) {
  if (!FEEDBACK_PROMPT_KINDS.includes(kind)) return null;
  const t = cleanText(text);
  let message;
  const options = PROMPT_OPTIONS[kind];
  if (options) {
    if (!options.some(r => r.id === answerId)) return null;
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
      // interview_prep_voice reads `answerId` (docs/agent/metrics.md).
      ...(kind === 'least_ready' ? { answerId } : {}),
      ...pickPromptExtra(kind, extra),
    },
  };
}
