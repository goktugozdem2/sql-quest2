// Review ask — who gets asked to say something public, and who never does.
//
// WHY THIS EXISTS (2026-09-07)
//
// 318 public profiles have been auto-published, `profile_link_copied` has
// never fired once, the referral functions have produced zero events in
// months, and the feedback table holds 5 rows. Nobody is asked, so nobody
// says anything, so Google and the AI assistants have nothing third-party to
// read — which matters because the AI-recommendation channel is the only one
// that has produced a paying user (payer #2, 2026-08-28, sent by Gemini).
// Directory and review sites are what those assistants cite.
//
// ── THE FOUR RULES, AND WHY THEY ARE IN CODE RATHER THAN IN SOMEONE'S HEAD ──
//
// 1. NEVER INCENTIVISE A REVIEW. No discount, no XP, no Pro days, no badge, no
//    streak credit, in exchange for a review — not even for "leaving one",
//    unconditional of sentiment. US FTC endorsement guidance (16 CFR Part 255)
//    treats an unstated material connection between a reviewer and a seller as
//    deceptive, and Trustpilot / G2 / AlternativeTo all prohibit incentivised
//    reviews outright in their terms. At 164 users a removed profile or a
//    "this business incentivises reviews" flag is not a setback we can absorb:
//    the listings exist precisely to be read by third parties, and a flagged
//    listing is worse than no listing. This is the one mistake here that
//    cannot be undone, so the module hands out no rewards of any kind and
//    `tests/review-ask.test.js` carries a source guard that fails the build if
//    an incentive word appears anywhere near the review copy.
//
// 2. NEVER SCRIPT WHAT SOMEONE SAYS. This module returns a decision and a list
//    of destinations. It returns no review text, no star rating, no suggested
//    wording, no "mention the Coach" nudge. The only pre-filled text the
//    product may attach to a share is a factual statement about the user's own
//    progress ("112 challenges solved"), never an opinion about us.
//
// 3. CONSENT TO BE QUOTED IS EXPLICIT AND SEPARATE. Anything we might put on
//    the site comes through the feedback flow's own checkbox (default off),
//    with the display name the person chooses and a stored consent timestamp
//    — see supabase/migrations/20260907_feedback_quote_consent.sql. Sending
//    feedback is not consent to be quoted, and this module never implies it
//    is.
//
// 4. ASK ONCE PER USER, EVER. A dismissal is permanent. Both flags are stored
//    BROWSER-scoped, not user-scoped: guest identity is a fresh `guest_<ts>`
//    on every load, so a user-keyed flag never dedupes for a guest and would
//    re-ask on every reload (the incident: sai was asked twice in two minutes
//    across the guest→signup boundary — see docs/data-driven-product.md §3).
//
// Plus one rule that is about honesty rather than law: NEVER ASK SOMEONE WHO
// JUST HIT A PAID WALL. Asking a person to praise us in public in the same
// session we told them to pay is both obnoxious and measurement poison — the
// paywall-surfaces read (docs/agent/ledger.md, Open) runs to 2026-09-20 over
// exactly that population.
//
// Pure. No React, no DOM, no storage, no clock of its own — `now` is an
// argument so every branch is assertable.

/**
 * Lifetime solves required before we ask.
 *
 * 15, from the bank's shape rather than a round number: ids 91-105 are the
 * beginner ladder (15 challenges, the block written to BE the on-ramp —
 * `FIRST_RUN_LEVELS` and `SQL_ROADMAP_STAGES[0]` both start at 91). A person
 * at 15 solves has finished everything that exists to teach them the site and
 * is now practising by choice. Below that, "was this useful?" is a question
 * about onboarding, not about the product.
 *
 * Measured against production on 2026-09-07 (challenge_solved, shared filters,
 * people by aid): 567 people have solved anything, 260 have 5+ (the `engaged`
 * mark), 139 have 10+, 92 have 15+, 36 have 25+. 5 would ask more than half of
 * everyone who ever ran a correct query; 25 would ask 36 people ever. 15 keeps
 * the ask rare and keeps it truthful.
 */
export const REVIEW_ASK_MIN_SOLVES = 15;

/**
 * Distinct active days required.
 *
 * 2, because one long session is enthusiasm and a return is value. Adding this
 * gate to the 15-solve rule takes the eligible population from 92 people to 75
 * — it costs 17 people, all of whom did everything in a single sitting and
 * never came back, which is precisely the person whose "was it useful?" answer
 * we would not want to publish anyway.
 */
export const REVIEW_ASK_MIN_ACTIVE_DAYS = 2;

/**
 * Days that must have passed since we last asked this person for ANYTHING
 * else (a Pro offer, a goal picker, a rating). Ask fatigue is real and stacked
 * asks read as a shakedown. 7 days.
 */
export const REVIEW_ASK_PROMPT_COOLDOWN_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Every branch has a name so the tests and the analytics can say the same
 * word. `review_ask_shown` carries `reason: 'eligible'`; the not-shown reasons
 * are what a future read uses to answer "why is nobody being asked?" without
 * guessing.
 */
export const REVIEW_ASK_REASONS = Object.freeze({
  ELIGIBLE: 'eligible',
  NO_STATE: 'no_state',
  FLAG_OFF: 'flag_off',
  DISMISSED: 'dismissed',
  ALREADY_ASKED: 'already_asked',
  PAID_WALL_THIS_SESSION: 'paid_wall_this_session',
  PROMPT_COOLDOWN: 'prompt_cooldown',
  TOO_FEW_SOLVES: 'too_few_solves',
  TOO_FEW_ACTIVE_DAYS: 'too_few_active_days',
});

const toFiniteNumber = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/**
 * @typedef {Object} ReviewAskState
 * @property {boolean} flagEnabled              FEATURE_FLAGS.features.reviewAsk
 * @property {number}  solves                   lifetime distinct solved challenges
 * @property {number}  activeDays               distinct days with recorded activity
 * @property {number|null} [askedAt]            epoch ms the card was first shown, ever
 * @property {number|null} [dismissedAt]        epoch ms the user dismissed it, ever
 * @property {number|null} [lastPromptAt]       epoch ms of the last OTHER ask
 * @property {boolean} [hitPaidWallThisSession] a content_lock_reached fired this session
 */

/**
 * Decide whether to show the review card.
 *
 * Branch order is deliberate: the two permanent consent gates (dismissed,
 * already asked) are evaluated before anything that could change with time, so
 * that no future threshold tweak can resurrect an ask for someone who already
 * said no. Fails CLOSED on anything malformed — the cost of a missed ask is
 * one fewer review; the cost of a wrong ask is asking a person who told us not
 * to.
 *
 * @param {ReviewAskState} state
 * @param {number} now epoch ms
 * @returns {{ ask: boolean, reason: string }}
 */
export function shouldAskForReview(state, now) {
  if (state == null || typeof state !== 'object') {
    return { ask: false, reason: REVIEW_ASK_REASONS.NO_STATE };
  }

  // Shipped OFF. FEATURE_FLAGS.features.reviewAsk stays false until the
  // paywall-surfaces read lands on 2026-09-20: that claim reads the behaviour
  // of people who hit a paid wall, and this card renders in the same
  // post-solve panel for the same population. One surface, one change at a
  // time (docs/data-driven-product.md P7).
  if (!state.flagEnabled) return { ask: false, reason: REVIEW_ASK_REASONS.FLAG_OFF };

  // Permanent, and first: a dismissal is forever. Not a snooze, not a
  // cooldown, not "we'll try again at 50 solves".
  if (toFiniteNumber(state.dismissedAt) !== null) {
    return { ask: false, reason: REVIEW_ASK_REASONS.DISMISSED };
  }

  // Permanent: once ever. Someone who saw the card and neither clicked nor
  // dismissed it has answered by not answering.
  if (toFiniteNumber(state.askedAt) !== null) {
    return { ask: false, reason: REVIEW_ASK_REASONS.ALREADY_ASKED };
  }

  // Never in the same session as a paid wall. Not "not on the same screen" —
  // not in the same session, because the sequence is what makes it grubby.
  if (state.hitPaidWallThisSession === true) {
    return { ask: false, reason: REVIEW_ASK_REASONS.PAID_WALL_THIS_SESSION };
  }

  // Don't stack asks. If the product already asked this person for something
  // in the last week, this one waits.
  const lastPrompt = toFiniteNumber(state.lastPromptAt);
  const nowMs = toFiniteNumber(now);
  if (lastPrompt !== null) {
    // An unusable clock is not permission to ask. Fail closed.
    if (nowMs === null) return { ask: false, reason: REVIEW_ASK_REASONS.PROMPT_COOLDOWN };
    const elapsed = nowMs - lastPrompt;
    // A negative elapsed means the prompt is stamped in the future (clock
    // step, or a device with a wrong date). Treat it as recent, not as
    // ancient — same fail-closed direction.
    if (elapsed < REVIEW_ASK_PROMPT_COOLDOWN_DAYS * DAY_MS) {
      return { ask: false, reason: REVIEW_ASK_REASONS.PROMPT_COOLDOWN };
    }
  }

  const solves = toFiniteNumber(state.solves) ?? 0;
  if (solves < REVIEW_ASK_MIN_SOLVES) {
    return { ask: false, reason: REVIEW_ASK_REASONS.TOO_FEW_SOLVES };
  }

  const activeDays = toFiniteNumber(state.activeDays) ?? 0;
  if (activeDays < REVIEW_ASK_MIN_ACTIVE_DAYS) {
    return { ask: false, reason: REVIEW_ASK_REASONS.TOO_FEW_ACTIVE_DAYS };
  }

  return { ask: true, reason: REVIEW_ASK_REASONS.ELIGIBLE };
}

/**
 * Where a review can go.
 *
 * URLs are only ever transcribed from docs/marketing/listing-pack.md, never
 * constructed. A guessed review URL is worse than a missing one: it 404s in
 * front of the one person in a hundred who was willing to write something.
 *
 * `enabled: false` entries render nothing. They are here so the destination
 * list is a single source of truth the founder can switch on by filling in a
 * URL, rather than a code change nobody remembers is needed.
 *
 * @returns {Array<{id:string,name:string,url:string|null,enabled:boolean,blockedOn:string|null}>}
 */
export function reviewPlatforms() {
  return [
    {
      id: 'trustpilot',
      name: 'Trustpilot',
      // Verified live 2026-09-03 (listing-pack.md, Trustpilot section): this
      // evaluate/ link renders "Rate Sqlquest / How would you rate your
      // experience?" and needs no business dashboard, which matters because
      // the sqlquest.app business unit is claimed under an email the founder
      // cannot currently log into.
      url: 'https://www.trustpilot.com/evaluate/sqlquest.app',
      enabled: true,
      blockedOn: null,
    },
    {
      id: 'alternativeto',
      name: 'AlternativeTo',
      // OFF: the application has not been submitted, so no product page and
      // therefore no review URL exists. Do NOT invent an
      // alternativeto.net/software/<slug>/ path — the slug is assigned at
      // submission. listing-pack.md ranks this priority 1 because
      // "alternatives to X" pages are what the AI assistants cite.
      url: null,
      enabled: false,
      blockedOn: 'Founder must submit SQL Quest via "Add an application" on alternativeto.net; the review URL only exists once the listing does.',
    },
    {
      id: 'g2',
      name: 'G2',
      // OFF: G2 needs a verified seller account, and reviews there require
      // LinkedIn-verified reviewers. listing-pack.md ranks it priority 4,
      // "worth it later, not first".
      url: null,
      enabled: false,
      blockedOn: 'Founder must complete G2 seller verification (sell.g2.com) before a product review URL exists.',
    },
  ];
}

/**
 * The subset that can actually be shown to a user today.
 * @returns {Array<{id:string,name:string,url:string,enabled:boolean}>}
 */
export function enabledReviewPlatforms() {
  return reviewPlatforms().filter(p => p.enabled && typeof p.url === 'string' && p.url.length > 0);
}
