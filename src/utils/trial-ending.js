// The last 48 hours of a Stripe trial: when the charge comes, what it is, and
// what Pro still holds (M-10, docs/plans/monetization-ideas-2026-11-22.md).
//
// Of the 8 trials since 2026-10-01 that reached day 7, 4 cancelled during
// the week (two around day 2, after 15 and 23 solves) and 2 of the 4 that
// reached the charge failed it (`invoice.payment_failed`, subscription_cycle);
// one is still lost. Stripe's own reminder email is on, but in the app nothing
// said the date, the amount, or what was still ahead. A card that needed a
// top-up, or a person who did not see what was left, met the charge cold.
//
// The person is in a Stripe trial when the webhook wrote `proTrial: true` and
// `proTrialEnd` (an ISO date) on their record (supabase/functions/
// stripe-webhook/index.ts). The old in-app trial (`proType === 'trial'`) has
// its own banner and is not this. The price comes from planPrices(region)
// (src/utils/regional-price.js) — never a literal — and the plan is the one
// the trial will bill (`proType`: monthly | annual).
//
// Pure: the clock, the prices and the counts are passed in.

export const TRIAL_ENDING_WINDOW_MS = 48 * 3600 * 1000;

export function trialEndingLine({
  proTrial = false,
  proTrialEnd = null,
  plan = null,
  prices = null,
  hardLeft = 0,
  mockTitle = null,
  now = Date.now(),
  timeZone = undefined,
} = {}) {
  if (proTrial !== true || !proTrialEnd) return null;
  const end = new Date(proTrialEnd).getTime();
  if (!Number.isFinite(end)) return null;
  const left = end - now;
  if (left <= 0 || left > TRIAL_ENDING_WINDOW_MS) return null;
  const endsOn = new Date(end).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone });
  const price = plan === 'annual' ? prices?.annual : plan === 'monthly' ? prices?.monthly : null;
  const period = plan === 'annual' ? 'year' : 'month';
  const lead = price
    ? `Your free week ends on ${endsOn}. Then ${price}/${period}.`
    : `Your free week ends on ${endsOn}.`;
  const held = [];
  const n = Number(hardLeft) || 0;
  if (n > 0) held.push(`${n} Hard challenge${n === 1 ? '' : 's'} you haven't solved`);
  held.push(mockTitle ? `the ${mockTitle}` : 'every timed mock');
  const ahead = `Still ahead in Pro: ${held.join(', ')}.`;
  return { endsOn, lead, ahead, hoursLeft: Math.ceil(left / 3600000) };
}
