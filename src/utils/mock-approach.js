// "Explain your approach" — which mock questions carry the box.
//
// A live SQL round grades the reasoning as much as the query, so a written
// question in a mock that practises a live / talk-through round carries an
// "Explain your approach" box (a free-text note the tutor reads back in 2–3
// sentences; never points). The flag lives ON THE QUESTION
// (`question.explainApproach: true`, src/data/mock-interviews.js), not on the
// mock: the same mock can hold multiple-choice items, which never get the
// box, and one flag per question is what the spec asked for
// (docs/plans/explain-approach-mocks-2026-09-21.md).
//
// Where the box is OFF on purpose — a written question in a mock whose dated
// source says the round is a timed online test with no talking (the Capital
// One CodeSignal screen, the Revolut HackerRank screen): adding it there
// would train the wrong format. Those questions carry a comment in the data
// file saying so; tests/mock-approach.test.js pins the split.

import { isMcqQuestion } from './mock-interview.js';

/** True when this question shows the approach box. MCQ never does. */
export function explainsApproach(question) {
  if (!question || isMcqQuestion(question)) return false;
  return question.explainApproach === true;
}

/** Ids of the mocks with at least one approach-enabled question. */
export function approachEnabledMockIds(interviews) {
  return (interviews || [])
    .filter(mi => (mi.questions || []).some(explainsApproach))
    .map(mi => mi.id);
}

/**
 * The `mock_approach_submitted` event, fired once per WRITTEN answer in an
 * approach-enabled question (submit, skip or time-out alike) so that the
 * metric `approach_box_use` has its denominator: `chars` is the length of
 * the trimmed note, 0 when the person wrote nothing. Returns null for a
 * question that has no box, so the caller fires nothing.
 */
export function approachSubmittedEvent(interview, question, approachText) {
  if (!interview || !explainsApproach(question)) return null;
  const text = typeof approachText === 'string' ? approachText.trim() : '';
  return {
    interviewId: interview.id,
    questionId: question.id,
    chars: text.length,
    hasApproach: text.length > 0,
  };
}
