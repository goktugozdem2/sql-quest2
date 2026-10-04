// Post-hire status and the First 90 Days track (2026-10-04,
// docs/plans/post-hire-track-2026-09-21.md).
//
// The status is a person's own answer — never inferred from behaviour. It is
// stored as the intent goal 'hired' through setUserIntent (the one writer of
// userData.intent), so a hired person stops being an interview person to
// interview-first (HIRING_INTENTS does not hold 'hired') and the Coach shows
// the track instead.

export const HIRED_INTENT = 'hired';

export function isHired(intentRecord) {
  return !!intentRecord && intentRecord.goal === HIRED_INTENT;
}

// The first ticket is free for everyone who says they got the job; the rest
// are Pro — the point of the track is that Pro still has a job after the
// interview. Solved tickets never lock.
export const FREE_TICKETS = 1;

export function ticketLocked({ index, isPro, solved }) {
  if (isPro || solved) return false;
  return index >= FREE_TICKETS;
}

// The offer question after `?outcome=passed`: asked once per outcome record.
export function shouldAskOffer({ outcome, intentRecord, alreadyAsked }) {
  return outcome === 'passed' && !isHired(intentRecord) && !alreadyAsked;
}
