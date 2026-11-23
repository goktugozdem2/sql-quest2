// The goal-note date ask (2026-11-22, flag `goalNoteDateAsk`, dark).
//
// The goal-note email (supabase/functions/goal-note, `?mode=new` and the
// backlog run) ends in three one-click answers. When the answer is
// `goal=interview` and the person has no interview date on record, the app
// asks one more thing, inline and skippable: "When is it?". The date goes to
// the same store and through the same writer as the intake's date step
// (`prepTarget.date`, `setPrepPreference`), so the countdown card, the status
// strip and the outcome note all read it with no change.
//
// Pure half: when to arm the ask on arrival, and when to render it.
// Guards: tests/goal-note.test.js.

// Armed only by the email's own link, only for an interview answer, and only
// when the goal recorded after the click is an interview (a declared goal is
// never overwritten by a link, so a person who already said "learning" is not
// asked for an interview date).
export function shouldArmGoalNoteDateAsk({ flagOn, src, goal, recordedIntent, prepDate } = {}) {
  if (flagOn !== true) return false;
  if (src !== 'goal_note') return false;
  if (goal !== 'interview') return false;
  if (recordedIntent !== 'interview') return false;
  if (prepDate) return false;
  return true;
}

// Rendered while armed, while no date is on record, and never while the
// intake is on screen (its own date step asks the same question).
export function shouldRenderGoalNoteDateAsk({ flagOn, armed, prepDate, intakeOpen } = {}) {
  return flagOn === true && !!armed && !prepDate && !intakeOpen;
}
