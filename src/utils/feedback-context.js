/**
 * Feedback context — what the 💬 widget attaches when it is opened on a
 * challenge (E2, IR-2, 2026-11-23; flag `feedbackContext`).
 *
 * WHY: twice a guest sent "what's my mistake?" through the widget with no
 * contact details — the latest on 2026-11-19, from someone who arrived on the
 * /sql-exercises/ solutions. The row carried no challenge, no query and no
 * diagnosis, so the founder could not answer, and the person never learned
 * that the box is not a help desk. Two halves fix it:
 *   1. the row's existing `context` jsonb column gets the challenge id, the
 *      last query (truncated) and the last diagnosis kind;
 *   2. the widget shows one line pointing at the tutor, which answers now.
 *
 * Pure: no React, no window, no storage. app.jsx feeds it state.
 */

/** About 1,000 characters of the query — enough to read the mistake, small
 * enough that a pasted dump cannot crowd the row. */
export const FEEDBACK_QUERY_MAX = 1000;

/** The i18n keys (section `feedback`) the tutor line uses. */
export const FEEDBACK_CONTEXT_I18N_KEYS = ['tutorLineBefore', 'tutorLineLink', 'tutorLineAfter'];

/**
 * True only when the challenge editor is actually on screen. `currentChallenge`
 * survives a switch to another tab of the app (the stuck prompt learned this,
 * A1 2026-11-22), and the mock is a global overlay, so all four must hold.
 */
export function isChallengeScreen({ activeTab, practiceSubTab, challenge, inMock = false } = {}) {
  return activeTab === 'quests'
    && practiceSubTab === 'challenges'
    && !!challenge
    && challenge.id != null
    && !inMock;
}

/** Trim and cut a query to `max` characters. Returns { text, truncated, length }. */
export function truncateQuery(query, max = FEEDBACK_QUERY_MAX) {
  const s = typeof query === 'string' ? query.trim() : '';
  const limit = Number.isFinite(max) && max > 0 ? Math.floor(max) : FEEDBACK_QUERY_MAX;
  if (s.length <= limit) return { text: s, truncated: false, length: s.length };
  return { text: s.slice(0, limit), truncated: true, length: s.length };
}

/**
 * The keys merged into the feedback row's `context`, or null when the widget
 * was not opened on a challenge (or the flag is off). Flat keys so a read is
 * `context->>'challengeId'`. The query is never sent to pro_events: the event
 * carries the id only (see feedbackEventContext).
 */
export function buildFeedbackChallengeContext({
  flagOn,
  activeTab,
  practiceSubTab,
  challenge,
  inMock = false,
  query,
  diagnosis,
  status,
} = {}) {
  if (flagOn !== true) return null;
  if (!isChallengeScreen({ activeTab, practiceSubTab, challenge, inMock })) return null;
  const q = truncateQuery(query);
  return {
    challengeId: challenge.id,
    challengeStatus: typeof status === 'string' ? status : null,
    lastQuery: q.text || null,
    queryTruncated: q.truncated,
    queryLength: q.length,
    diagnosisKind: (diagnosis && typeof diagnosis.kind === 'string') ? diagnosis.kind : null,
  };
}

/** What `feedback_submitted` carries from it: the id and the kind, never the query. */
export function feedbackEventContext(ctx) {
  if (!ctx) return { challengeId: null, diagnosisKind: null };
  return { challengeId: ctx.challengeId ?? null, diagnosisKind: ctx.diagnosisKind ?? null };
}
