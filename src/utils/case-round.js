// A mock whose first N questions are free (2026-11-22, the Metrics & Case
// Round, lanes C5/B3).
//
// The company-set gate's shape applied to a mock: a free person sits the
// first `freeQuestionCount` questions as a timed, scored run of their own,
// and the run ends on the Pro modal (reason 'case_round'). Pro sits all of
// it. Nothing here changes a price or a flag: it reads the mock's own field.
//
// Pure, so tests/metrics-case-round.test.js can pin it without React.

export const CASE_ROUND_MOCK_ID = 'metrics-case-round';

/** How many leading questions are free, 0 when the mock has no preview. */
export function freePreviewCount(interview) {
  const n = Number(interview && interview.freeQuestionCount);
  const total = Array.isArray(interview && interview.questions) ? interview.questions.length : 0;
  if (!Number.isInteger(n) || n <= 0 || total === 0) return 0;
  return Math.min(n, total);
}

/** True when this person can start the mock at all (whole or preview). */
export function canStartMock(interview, isPro) {
  if (!interview) return false;
  return !!interview.isFree || !!isPro || freePreviewCount(interview) > 0;
}

/**
 * The run this person gets. Pro, a free mock, or a mock with no preview: the
 * mock as it is. Otherwise a copy cut to the free questions, carrying
 * `previewOf` so the runner knows to end on the Pro modal. The id stays the
 * mock's own, so saved progress, history and events keep one key.
 */
export function mockRunFor(interview, isPro) {
  const free = freePreviewCount(interview);
  if (!interview || interview.isFree || isPro || free === 0 || free >= interview.questions.length) {
    return { interview, preview: false };
  }
  const total = interview.questions.length;
  const questions = interview.questions.slice(0, free);
  return {
    interview: {
      ...interview,
      questions,
      questionsCount: free,
      totalTime: questions.reduce((s, q) => s + (Number(q.timeLimit) || 0), 0) || interview.totalTime,
      previewOf: { total, free },
    },
    preview: true,
  };
}

/**
 * Saved progress resumes only into a run that still holds its question.
 * A person who saved question 7 as Pro and is now free gets the 3-question
 * preview: resuming at 7 would open on a question the run does not have.
 * Start fresh instead (A1 on #174, 2026-11-22).
 */
export function canResumeProgress(progress, run) {
  if (!progress || !run || progress.interviewId !== run.id) return false;
  const n = Array.isArray(run.questions) ? run.questions.length : 0;
  const i = progress.questionIndex;
  const answered = Array.isArray(progress.answers) ? progress.answers.length : 0;
  return Number.isInteger(i) && i >= 0 && i < n && answered <= n;
}

/** The Pro modal reason a finished preview opens with. */
export function previewEndReason(interview, { solvedCount = 0 } = {}) {
  const p = interview && interview.previewOf;
  if (!p) return null;
  return {
    type: 'case_round',
    topic: interview.title || null,
    interviewId: interview.id || null,
    freeCount: p.free,
    total: p.total,
    solvedCount,
  };
}
