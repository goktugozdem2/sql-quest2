// SQL Quest — the review ask
//
// WHY THESE TESTS EXIST
//
// 2026-09-07: 318 public profiles auto-published, `profile_link_copied` never
// fired once, referral functions at zero events for months, 5 rows in the
// feedback table. The product never asks anyone to say anything, so nothing
// third-party exists for Google or an AI assistant to read — and the
// AI-recommendation channel is the only one that has produced a paying user.
//
// The ask itself is easy. The rules around it are the part that can end badly,
// and they are the part a test can hold:
//
//   * NEVER INCENTIVISE. FTC 16 CFR Part 255 treats an unstated material
//     connection between reviewer and seller as deceptive, and Trustpilot, G2
//     and AlternativeTo all forbid incentivised reviews outright. At 164 users
//     a flagged listing is not recoverable, and the listings exist precisely
//     to be read by third parties. The source guard at the bottom of this file
//     fails the build if an incentive word reaches the review copy.
//   * ONCE PER USER, EVER, and a dismissal is permanent.
//   * NEVER after a paid wall in the same session.
//   * NO INVENTED URLS. A guessed review link 404s in front of the one person
//     in a hundred willing to write something.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  shouldAskForReview,
  reviewPlatforms,
  enabledReviewPlatforms,
  REVIEW_ASK_REASONS,
  REVIEW_ASK_MIN_SOLVES,
  REVIEW_ASK_MIN_ACTIVE_DAYS,
  REVIEW_ASK_PROMPT_COOLDOWN_DAYS,
} from '../src/utils/review-ask.js';

const p = (rel) => fileURLToPath(new URL(rel, import.meta.url));
const appSource = readFileSync(p('../src/app.jsx'), 'utf8');
const i18nSource = readFileSync(p('../src/utils/i18n.js'), 'utf8');
const reviewAskSource = readFileSync(p('../src/utils/review-ask.js'), 'utf8');
const listingPack = readFileSync(p('../docs/marketing/listing-pack.md'), 'utf8');

const NOW = 1_757_246_400_000; // 2026-09-07T12:00:00Z, fixed
const DAY = 24 * 60 * 60 * 1000;

/** A person who qualifies on every axis. Each test breaks exactly one thing. */
const eligible = () => ({
  flagEnabled: true,
  solves: 20,
  activeDays: 3,
  askedAt: null,
  dismissedAt: null,
  lastPromptAt: null,
  hitPaidWallThisSession: false,
});

describe('shouldAskForReview — the happy path', () => {
  it('asks a user past both thresholds who has never been asked', () => {
    expect(shouldAskForReview(eligible(), NOW))
      .toEqual({ ask: true, reason: REVIEW_ASK_REASONS.ELIGIBLE });
  });

  it('asks exactly at the thresholds, not one above them', () => {
    const at = { ...eligible(), solves: REVIEW_ASK_MIN_SOLVES, activeDays: REVIEW_ASK_MIN_ACTIVE_DAYS };
    expect(shouldAskForReview(at, NOW).ask).toBe(true);
  });
});

describe('shouldAskForReview — the feature flag', () => {
  it('never asks while the flag is off, however eligible the user is', () => {
    const s = { ...eligible(), solves: 500, activeDays: 90, flagEnabled: false };
    expect(shouldAskForReview(s, NOW))
      .toEqual({ ask: false, reason: REVIEW_ASK_REASONS.FLAG_OFF });
  });

  it('treats a missing flag as off — an unset flag is not consent to ship', () => {
    const s = { ...eligible() };
    delete s.flagEnabled;
    expect(shouldAskForReview(s, NOW).reason).toBe(REVIEW_ASK_REASONS.FLAG_OFF);
  });

  it('ships OFF: feature-flags.js has reviewAsk false', () => {
    const flags = readFileSync(p('../src/data/feature-flags.js'), 'utf8');
    expect(flags).toMatch(/reviewAsk:\s*false/);
  });
});

describe('shouldAskForReview — eligibility thresholds', () => {
  it('does not ask below the solve threshold', () => {
    const s = { ...eligible(), solves: REVIEW_ASK_MIN_SOLVES - 1 };
    expect(shouldAskForReview(s, NOW))
      .toEqual({ ask: false, reason: REVIEW_ASK_REASONS.TOO_FEW_SOLVES });
  });

  it('does not ask a one-session user, however many they solved', () => {
    // 92 people have 15+ solves; 75 of those also came back a second day. The
    // 17 the day-gate drops did everything in one sitting and never returned.
    const s = { ...eligible(), solves: 200, activeDays: 1 };
    expect(shouldAskForReview(s, NOW))
      .toEqual({ ask: false, reason: REVIEW_ASK_REASONS.TOO_FEW_ACTIVE_DAYS });
  });

  it('treats missing counts as zero rather than as passing', () => {
    const s = { ...eligible() };
    delete s.solves;
    expect(shouldAskForReview(s, NOW).reason).toBe(REVIEW_ASK_REASONS.TOO_FEW_SOLVES);
  });

  it('the thresholds are the ones justified from the bank: 15 solves, 2 days', () => {
    // 15 = the size of the beginner ladder (ids 91-105), the block written to
    // BE the on-ramp. A change here is a change to who gets asked, and should
    // be argued in the commit, not slipped in.
    expect(REVIEW_ASK_MIN_SOLVES).toBe(15);
    expect(REVIEW_ASK_MIN_ACTIVE_DAYS).toBe(2);
  });
});

describe('shouldAskForReview — once per user, ever', () => {
  it('never asks twice', () => {
    const s = { ...eligible(), askedAt: NOW - 400 * DAY };
    expect(shouldAskForReview(s, NOW))
      .toEqual({ ask: false, reason: REVIEW_ASK_REASONS.ALREADY_ASKED });
  });

  it('a prior ask outranks growing eligibility — no re-ask at a bigger number', () => {
    const s = { ...eligible(), solves: 5000, activeDays: 365, askedAt: NOW - 999 * DAY };
    expect(shouldAskForReview(s, NOW).ask).toBe(false);
  });

  it('a dismissal is permanent, not a snooze', () => {
    const s = { ...eligible(), dismissedAt: NOW - 5 * 365 * DAY };
    expect(shouldAskForReview(s, NOW))
      .toEqual({ ask: false, reason: REVIEW_ASK_REASONS.DISMISSED });
  });

  it('reports dismissal ahead of everything else, so no later gate can revive it', () => {
    // Branch order matters: if the flag is ever flipped, or a threshold is
    // lowered, someone who said no must still not be asked.
    const s = { ...eligible(), dismissedAt: NOW, askedAt: NOW, hitPaidWallThisSession: true };
    expect(shouldAskForReview(s, NOW).reason).toBe(REVIEW_ASK_REASONS.DISMISSED);
  });
});

describe('shouldAskForReview — never after a paid wall', () => {
  it('does not ask in a session where the user hit a wall', () => {
    const s = { ...eligible(), hitPaidWallThisSession: true };
    expect(shouldAskForReview(s, NOW))
      .toEqual({ ask: false, reason: REVIEW_ASK_REASONS.PAID_WALL_THIS_SESSION });
  });

  it('asks again in a later session, once the flag has reset', () => {
    // The flag is session-scoped by construction (a ref, cleared on reload) —
    // this pins that a wall is not a permanent disqualification.
    const s = { ...eligible(), hitPaidWallThisSession: false };
    expect(shouldAskForReview(s, NOW).ask).toBe(true);
  });

  it('outranks the thresholds: a wall-hitter is not asked even at 500 solves', () => {
    const s = { ...eligible(), solves: 500, activeDays: 50, hitPaidWallThisSession: true };
    expect(shouldAskForReview(s, NOW).reason).toBe(REVIEW_ASK_REASONS.PAID_WALL_THIS_SESSION);
  });
});

describe('shouldAskForReview — the do-not-stack-asks cooldown', () => {
  it('waits when the product asked this person something else yesterday', () => {
    const s = { ...eligible(), lastPromptAt: NOW - 1 * DAY };
    expect(shouldAskForReview(s, NOW))
      .toEqual({ ask: false, reason: REVIEW_ASK_REASONS.PROMPT_COOLDOWN });
  });

  it('still waits one millisecond before the cooldown expires', () => {
    const s = { ...eligible(), lastPromptAt: NOW - (REVIEW_ASK_PROMPT_COOLDOWN_DAYS * DAY) + 1 };
    expect(shouldAskForReview(s, NOW).reason).toBe(REVIEW_ASK_REASONS.PROMPT_COOLDOWN);
  });

  it('asks once the cooldown has exactly elapsed', () => {
    const s = { ...eligible(), lastPromptAt: NOW - REVIEW_ASK_PROMPT_COOLDOWN_DAYS * DAY };
    expect(shouldAskForReview(s, NOW).ask).toBe(true);
  });

  it('a prompt stamped in the future counts as recent, not as ancient', () => {
    // A device with a wrong clock must not become a reason TO ask.
    const s = { ...eligible(), lastPromptAt: NOW + 30 * DAY };
    expect(shouldAskForReview(s, NOW).reason).toBe(REVIEW_ASK_REASONS.PROMPT_COOLDOWN);
  });

  it('an unusable clock fails closed', () => {
    const s = { ...eligible(), lastPromptAt: NOW - 90 * DAY };
    expect(shouldAskForReview(s, NaN).reason).toBe(REVIEW_ASK_REASONS.PROMPT_COOLDOWN);
    expect(shouldAskForReview(s, undefined).reason).toBe(REVIEW_ASK_REASONS.PROMPT_COOLDOWN);
  });
});

describe('shouldAskForReview — malformed input', () => {
  it.each([null, undefined, 'nope', 42, []])('fails closed on %p', (bad) => {
    const r = shouldAskForReview(bad, NOW);
    expect(r.ask).toBe(false);
    // An array is an object; it just has no flag, so it lands on flag_off.
    expect([REVIEW_ASK_REASONS.NO_STATE, REVIEW_ASK_REASONS.FLAG_OFF]).toContain(r.reason);
  });

  it('every branch returns a reason string that is in the registry', () => {
    const known = new Set(Object.values(REVIEW_ASK_REASONS));
    const cases = [
      null,
      { ...eligible(), flagEnabled: false },
      { ...eligible(), dismissedAt: NOW },
      { ...eligible(), askedAt: NOW },
      { ...eligible(), hitPaidWallThisSession: true },
      { ...eligible(), lastPromptAt: NOW },
      { ...eligible(), solves: 0 },
      { ...eligible(), activeDays: 0 },
      eligible(),
    ];
    for (const c of cases) {
      const r = shouldAskForReview(c, NOW);
      expect(typeof r.reason).toBe('string');
      expect(known.has(r.reason), `unregistered reason: ${r.reason}`).toBe(true);
    }
  });

  it('covers every reason in the registry with at least one reachable case', () => {
    const seen = new Set([
      shouldAskForReview(null, NOW).reason,
      shouldAskForReview({ ...eligible(), flagEnabled: false }, NOW).reason,
      shouldAskForReview({ ...eligible(), dismissedAt: NOW }, NOW).reason,
      shouldAskForReview({ ...eligible(), askedAt: NOW }, NOW).reason,
      shouldAskForReview({ ...eligible(), hitPaidWallThisSession: true }, NOW).reason,
      shouldAskForReview({ ...eligible(), lastPromptAt: NOW }, NOW).reason,
      shouldAskForReview({ ...eligible(), solves: 1 }, NOW).reason,
      shouldAskForReview({ ...eligible(), activeDays: 1 }, NOW).reason,
      shouldAskForReview(eligible(), NOW).reason,
    ]);
    expect([...Object.values(REVIEW_ASK_REASONS)].filter(r => !seen.has(r))).toEqual([]);
  });
});

describe('reviewPlatforms — no invented URLs', () => {
  it('offers Trustpilot with the link verified in the listing pack', () => {
    const tp = reviewPlatforms().find(x => x.id === 'trustpilot');
    expect(tp.enabled).toBe(true);
    expect(tp.url).toBe('https://www.trustpilot.com/evaluate/sqlquest.app');
    // Bound to the doc, so the two cannot drift apart silently.
    expect(listingPack).toContain(tp.url);
  });

  it('keeps AlternativeTo and G2 off, with no URL, until the founder has an account', () => {
    for (const id of ['alternativeto', 'g2']) {
      const pl = reviewPlatforms().find(x => x.id === id);
      expect(pl, `${id} missing from the platform list`).toBeTruthy();
      expect(pl.enabled).toBe(false);
      expect(pl.url).toBeNull();
      // A placeholder without a stated blocker is a TODO nobody will find.
      expect(typeof pl.blockedOn).toBe('string');
      expect(pl.blockedOn.length).toBeGreaterThan(20);
    }
  });

  it('never hands the UI a disabled platform or a null URL', () => {
    for (const pl of enabledReviewPlatforms()) {
      expect(pl.enabled).toBe(true);
      expect(pl.url).toMatch(/^https:\/\//);
    }
    expect(enabledReviewPlatforms().length).toBeGreaterThan(0);
  });

  it('every URL in the module appears verbatim in docs/marketing/listing-pack.md', () => {
    // The rule the module states: transcribed, never constructed.
    const urls = reviewAskSource.match(/https:\/\/[^\s'")]+/g) || [];
    const offenders = urls.filter(u => !listingPack.includes(u));
    expect(offenders, `not in the listing pack — transcribe, don't invent:\n  ${offenders.join('\n  ')}`)
      .toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// SOURCE GUARD — no incentive may reach the review copy.
//
// This is the rule that cannot be undone if it is broken once: an incentivised
// review breaches FTC 16 CFR Part 255 and every platform's terms, and a
// flagged listing at our size is unrecoverable. So it is a build failure, not
// a code-review convention.
//
// Scope: user-visible copy only. The words appear all over the COMMENTS in
// these files, saying never to do this, and that is exactly where they should
// be. Comment lines are stripped before scanning; what is left is the strings
// a user can actually read.
// ---------------------------------------------------------------------------

const INCENTIVE_WORDS = [
  'discount', 'free month', 'free week', 'coupon', 'promo code',
  'reward', 'bonus', 'xp', 'pro days', 'in exchange', 'in return for',
  'gift', 'voucher', 'credit', 'giveaway', 'raffle',
  // Turkish, because the card ships in both languages and a guard that only
  // reads English would pass the exact copy it exists to stop.
  'indirim', 'kupon', 'ödül', 'hediye', 'bedava', 'karşılığında', 'çekiliş',
];

const incentiveHits = (text) => {
  const hay = text.toLowerCase();
  return INCENTIVE_WORDS.filter(w => {
    // \b does not work on Turkish letters in every engine; use explicit
    // non-letter boundaries instead.
    const re = new RegExp(`(^|[^\\p{L}])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\p{L}]|$)`, 'iu');
    return re.test(hay);
  });
};

/** Drop whole-line comments; leave code and string literals. */
const stripCommentLines = (block) => block
  .split('\n')
  .filter(line => {
    const t = line.trim();
    return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('*/'));
  })
  .join('\n');

/** The `review: { … }` namespace out of each language block in i18n.js. */
const i18nReviewBlocks = () => {
  const blocks = [];
  const re = /\n {4}review: \{\n([\s\S]*?)\n {4}\},/g;
  let m;
  while ((m = re.exec(i18nSource))) blocks.push(m[1]);
  return blocks;
};

describe('source guard: nothing is offered in exchange for a review', () => {
  it('the detector actually detects — a synthetic violation is caught', () => {
    // Without this, a broken regex would make every test below pass silently.
    expect(incentiveHits("Leave a review and get 50 XP")).toContain('xp');
    expect(incentiveHits('Değerlendirme yaz, indirim kazan')).toContain('indirim');
    expect(incentiveHits('Leave a public review')).toEqual([]);
  });

  it('finds the review copy in both languages before asserting on it', () => {
    const blocks = i18nReviewBlocks();
    expect(blocks.length, 'expected an EN and a TR review namespace').toBe(2);
    expect(blocks[0]).toContain('Leave a public review');
    expect(blocks[1]).toContain('değerlendirme');
  });

  it('i18n review copy names no incentive, in either language', () => {
    for (const block of i18nReviewBlocks()) {
      const hits = incentiveHits(stripCommentLines(block));
      expect(hits, `incentive word in review copy: ${hits.join(', ')}`).toEqual([]);
    }
  });

  it('the quote-consent copy names no incentive either', () => {
    // Consent to be quoted must be as unrewarded as the review itself.
    const keys = i18nSource.split('\n').filter(l => /quoteConsent|quoteName|placeholderReview/.test(l));
    expect(keys.length).toBeGreaterThanOrEqual(6); // 3 keys × 2 languages
    const hits = incentiveHits(stripCommentLines(keys.join('\n')));
    expect(hits, `incentive word in quote-consent copy: ${hits.join(', ')}`).toEqual([]);
  });

  it('the ReviewAskCard component renders no incentive', () => {
    const start = appSource.indexOf('function ReviewAskCard(');
    expect(start, 'ReviewAskCard not found in app.jsx').toBeGreaterThan(-1);
    const rest = appSource.slice(start);
    const end = rest.indexOf('\n}\n');
    const body = stripCommentLines(rest.slice(0, end));
    const hits = incentiveHits(body);
    expect(hits, `incentive word inside ReviewAskCard: ${hits.join(', ')}`).toEqual([]);
  });

  it('nothing near a review call site in app.jsx grants anything', () => {
    // ±12 lines around every review-copy call and every review handler: wide
    // enough to catch an `unlockAchievement()` or an `addXP()` bolted onto the
    // click, narrow enough that unrelated code does not trip it.
    const lines = appSource.split('\n');
    const anchors = [];
    lines.forEach((line, i) => {
      if (/i18n_t\('review'|onReviewAsk|onReviewPrivateNote|ReviewAskCard|review_ask_/.test(line)) anchors.push(i);
    });
    expect(anchors.length, 'no review call sites found — did the surface move?')
      .toBeGreaterThanOrEqual(8);

    const window = new Set();
    for (const a of anchors) {
      for (let i = Math.max(0, a - 12); i < Math.min(lines.length, a + 13); i++) window.add(i);
    }
    const region = stripCommentLines([...window].sort((x, y) => x - y).map(i => lines[i]).join('\n'));
    const hits = incentiveHits(region);
    expect(hits, `incentive word near the review surface: ${hits.join(', ')}`).toEqual([]);
  });

  it('no reward call is wired to the review actions', () => {
    // The specific shapes that would grant something in this codebase.
    const start = appSource.indexOf('const onReviewAskShown');
    const end = appSource.indexOf('// Feedback submission.');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const handlers = stripCommentLines(appSource.slice(start, end));
    for (const bad of ['unlockAchievement', 'setXp', 'addXP', 'grantPro', 'setUserProStatus', 'setProExpiry']) {
      expect(handlers.includes(bad), `${bad}() must never run from a review action`).toBe(false);
    }
  });
});

describe('source guard: the ask is a card in the post-solve panel, not a modal', () => {
  it('ReviewAskCard renders inline — no fixed overlay, no role="dialog"', () => {
    const start = appSource.indexOf('function ReviewAskCard(');
    const rest = appSource.slice(start);
    const body = rest.slice(0, rest.indexOf('\n}\n'));
    // A modal here would sit on top of the surface the open paywall-surfaces
    // claim is reading until 2026-09-20.
    expect(body).not.toMatch(/role="dialog"/);
    expect(body).not.toMatch(/aria-modal/);
    expect(body).not.toMatch(/fixed inset-0/);
    expect(body).toContain('data-testid="review-ask-card"');
  });

  it('the card is gated on the flag through shouldAskForReview, not rendered raw', () => {
    expect(appSource).toContain('computeReviewAskDecision');
    expect(appSource).toMatch(/flagEnabled:\s*window\.FF\?\.feature\?\.\('reviewAsk'\)\s*===\s*true/);
    // Rendered only when the decision says so, or while pinned to the panel
    // it was already shown on.
    expect(appSource).toMatch(/if \(\(!decision\.ask && !pinned\) \|\| !reviewPlatform\) return null;/);
  });

  it('the pin cannot outlive a dismissal', () => {
    // Mounting the card writes askedAt, which would unmount it a frame later,
    // so it is pinned to the challenge it appeared on (live browser check,
    // 2026-09-07). The pin must still yield to a dismissal instantly.
    expect(appSource).toMatch(/reviewAskPinnedTo === currentChallenge\?\.id/);
    expect(appSource).toMatch(/&& !reviewAskFlags\.dismissedAt;/);
  });

  it('a guest is never offered a profile link — the handle is a throwaway', () => {
    expect(appSource).toMatch(/onCopyLink=\{\(currentUser && !isGuest\) \? copyProfileLink : null\}/);
  });

  it('a paid wall in the session disables the ask through trackLockReached', () => {
    expect(appSource).toMatch(/hitPaidWallThisSessionRef\.current = true/);
    expect(appSource).toMatch(/hitPaidWallThisSession:\s*hitPaidWallThisSessionRef\.current === true/);
  });

  it('the once-ever flags are browser-scoped, not user-scoped', () => {
    // A user-keyed flag never dedupes for a guest (fresh guest_<ts> per load).
    expect(appSource).toMatch(/const REVIEW_ASK_KEY = 'sqlquest_review_ask_v1';/);
    expect(appSource).not.toMatch(/sqlquest_review_ask_v1_?\$\{/);
    expect(appSource).not.toMatch(/REVIEW_ASK_KEY \+ .*currentUser/);
  });

  it('all four review events are wired', () => {
    for (const ev of ['review_ask_shown', 'review_ask_clicked', 'review_ask_dismissed', 'review_private_note']) {
      expect(appSource.includes(`'${ev}'`), `${ev} is not emitted anywhere`).toBe(true);
    }
  });
});

describe('source guard: quote consent is explicit, separate and default-off', () => {
  it('the checkbox defaults to false and resets on every open', () => {
    expect(appSource).toMatch(/const \[quoteConsent, setQuoteConsent\] = React\.useState\(false\);/);
    expect(appSource).toMatch(/setQuoteConsent\(false\);/);
  });

  it('a name and a consent timestamp are only ever sent alongside a true consent', () => {
    expect(appSource).toMatch(/quoteName: quoteConsent \? \(quoteName\.trim\(\) \|\| null\) : null/);
    expect(appSource).toMatch(/quote_consent: quoteConsent === true \? true : null/);
    expect(appSource).toMatch(/quote_name: quoteConsent === true \? \(quoteName \|\| null\) : null/);
  });

  it('the migration exists, is additive, and adds no anon read path', () => {
    const mig = readFileSync(p('../supabase/migrations/20260907_feedback_quote_consent.sql'), 'utf8');
    expect(mig).toMatch(/add column if not exists quote_consent\s+boolean/);
    expect(mig).toMatch(/add column if not exists quote_name\s+text/);
    expect(mig).toMatch(/add column if not exists quote_consent_at\s+timestamptz/);
    // The INSERT-only posture is the whole security model of this table.
    expect(mig).not.toMatch(/for select/i);
    expect(mig).not.toMatch(/drop policy/i);
    expect(mig).not.toMatch(/disable row level security/i);
  });
});
