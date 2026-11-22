// The quota wall asks once a day, then waits inline (M-07,
// docs/plans/monetization-ideas-2026-11-22.md) — an A/B by aid.
//
// 142 people met the 10-solve wall from 09-26 to 11-21: median 3 lock hits
// each, 53% saw the Pro modal three or more times, and the wall's
// `modal_dismissed` rows outnumber its people 3 : 1. Asked a third time, a
// person learns to swat (the tier-10 lesson: 72% closed it in under 3 s).
//
// Arm `inline`: the first wall hit of the person's day opens the modal as
// today; a later hit the same day opens a small non-blocking card instead —
// "10 free solves used", the trial button (which opens the same modal, by the
// person's own click) and the same two free roads back the modal offers
// (today's daily, the Coach). Arm `control`: the modal on every hit, as today.
// `content_lock_reached` still fires on every hit, now with `modal` and
// `quotaWallArm`. Behind `quotaWallInline`: flag off, everyone is `control`.
//
// The hash is the FNV + murmur3-finalizer construction of companyAskArm and
// modalLayoutHashArm (CLAUDE.md, "A/B hash trap"): without the finalizer a
// two-arm split mirrors the first-screen test's arms for every aid.
//
// Pure: the day is passed in.

import { TRIAL_DAYS } from './checkout-session.js';

export const QUOTA_WALL_TEST_ID = 'quota_wall_inline_v1';
export const QUOTA_WALL_ARMS = ['inline', 'control'];
export const QUOTA_WALL_DAY_KEY = 'sqlquest_quota_wall_modal_day';

export function quotaWallHashArm(aid) {
  let h = 2166136261;
  const s = `${String(aid)}:${QUOTA_WALL_TEST_ID}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return QUOTA_WALL_ARMS[(h >>> 0) % QUOTA_WALL_ARMS.length];
}

export function quotaWallArm({ flagOn = false, aid = null } = {}) {
  if (!flagOn || !aid) return 'control';
  return quotaWallHashArm(aid);
}

/** Does THIS wall hit open the modal? Control: always. Inline: the first hit of the day. */
export function quotaWallShowsModal({ arm = 'control', lastModalDay = null, today = null } = {}) {
  if (arm !== 'inline') return true;
  if (!today) return true;
  return lastModalDay !== today;
}

/** The inline card's words. The trial is promised only when it is on offer. */
export function quotaInlineCopy({ quota = 10, trialOn = false } = {}) {
  return {
    lead: `${quota} free solves used.`,
    cta: trialOn ? `Try Pro free for ${TRIAL_DAYS} days` : 'See what Pro opens',
  };
}
