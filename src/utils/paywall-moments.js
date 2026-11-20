// Paywall moments (PLAN item 3, 2026-10-17): every point where a free person
// meets a Pro feature says what Pro gives there and offers the way in.
//
// The audit (src/app.jsx, 2026-10-17) found, among the points where a free
// person meets Pro:
//   - three soft gates that named Pro and offered nothing but a ✕ on a
//     four-second toast — the 30-day path's days 11+, the Medium/Hard daily,
//     the Coach's Hard track rows (`showSoftProGate`);
//   - the 30-day path's Pro tiles rendered `disabled`, so the gate above
//     never even ran: a click on day 11 did nothing at all;
//   - a locked mock card whose body click did nothing (`canAccess && …`);
//   - two "Upgrade" links (the tutor's daily-cap line, the API-key dialog)
//     that went to the Profile tab instead of the plans;
//   - three modal openers with no reason (Profile's plan button, the
//     Interview tab's button, the Coach strip's 'generic') — they showed,
//     and logged, whatever reason the modal last held;
//   - reasons with no copy of their own (`interview_locked` fell through to
//     the generic headline), and a Hard headline that claimed what
//     "FAANG, Stripe, and JPMorgan ask", which no dated source says.
//
// This module is the copy for those reasons and the reason each soft gate
// passes to the modal. What is free does not change here. Behind
// `paywallMoments` (dark): flag off, every site behaves exactly as before.

// The soft gate → the modal reason its "See what Pro opens" button sends.
// `coach_track` reuses `hard_challenge` (it is a Hard challenge); the gate
// itself rides on `pro_modal_shown.gate`, so the Coach row is still read
// apart from the Practice tab's Hard banner.
export const SOFT_GATE_REASONS = Object.freeze({
  thirty_day: 'thirty_day',
  daily_difficulty: 'daily_difficulty',
  coach_track: 'hard_challenge',
});

// Reasons a person chose themselves (a button, not a wall). Before, these
// openers set no reason, so `pro_modal_shown.reason` inherited a stale one.
export const VOLUNTARY_REASONS = Object.freeze(['profile_plan', 'interview_tab', 'coach_strip']);

export const SOFT_GATE_ACTION_LABEL = 'See what Pro opens';

// How long a soft gate's toast stays when it carries the button. The plain
// toast's four seconds is too short to read two lines and decide.
export const SOFT_GATE_TOAST_MS = 9000;

export function softGateReason(gate, solvedCount = 0) {
  const type = SOFT_GATE_REASONS[gate];
  if (!type) return null;
  return { type, gate, topic: null, solvedCount };
}

export function paywallMomentCopy(type, { freeDays = 10, bank = '300+', hardCount = null } = {}) {
  switch (type) {
    case 'thirty_day':
      return {
        headline: 'The rest of the 30-day path.',
        lead: `Days 1–${freeDays} are yours.`,
        body: `Pro opens days ${freeDays + 1} to 30, all ${bank} challenges, the Hard set and the timed mocks. Everything you have already solved stays yours.`,
      };
    case 'daily_difficulty':
      return {
        headline: 'Medium and Hard, every day.',
        lead: 'The Easy daily stays free.',
        body: `Pro adds the Medium and Hard daily challenge, all ${bank} challenges and the timed mocks.`,
      };
    case 'hard_challenge':
      return {
        headline: 'The Hard set.',
        lead: hardCount
          ? `${hardCount} Hard challenges: window functions, CTE pipelines, gaps and islands.`
          : 'Window functions, CTE pipelines, gaps and islands.',
        body: `Pro opens every one of them, all ${bank} challenges and the timed mocks. Everything you have already solved stays yours.`,
      };
    case 'interview_locked':
    case 'interview_tab':
      return {
        headline: 'Sit the screen before you sit the screen.',
        lead: 'Timed and scored, like the real round.',
        body: 'Pro opens every mock in the bank, the Revolut and Capital One screen formats included, plus the Hard set and a higher daily tutor limit. The SQL Fundamentals Assessment stays free.',
      };
    default:
      return null;
  }
}
