// The Debug set inside Pro (founder 2026-11-23): Debug has no price of its
// own. Easy and Medium count toward the free solves, Hard is Pro like every
// Hard, a company-tagged item follows the company-set rule. Two pieces, both
// behind `debugQuestions`:
//   1. one line in the Pro modal's feature list, EN and TR via i18n;
//   2. the `debug_lock` label: a locked Debug item meets the same wall (same
//      reason `type`, same modal copy) but the events carry `debug_lock`.
import { describe, it, expect, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { t, setLang } from '../src/utils/i18n.js';
import {
  DEBUG_LOCK_REASON, withDebugLock, proModalReasonLabel, debugLockedAs,
} from '../src/utils/debug-questions.js';

const read = rel => readFileSync(fileURLToPath(new URL(`../${rel}`, import.meta.url)), 'utf8');
const app = read('src/app.jsx');
const flags = read('src/data/feature-flags.js');

const EN_LINE = 'Fix an AI-written query: the Debug set.';
const TR_LINE = "AI'ın yazdığı sorguyu düzelt: Debug seti.";

// A Debug Hard and a plain Hard, shaped like the bank's rows.
const debugHard = { id: 340, type: 'debug', difficulty: 'Hard', brokenQuery: 'SELECT 1' };
const plainHard = { id: 12, difficulty: 'Hard' };

/** The body of a top-level `const name = (...) => ...` in app.jsx, up to the next `\n  const `. */
function bodyOf(name) {
  const start = app.indexOf(`const ${name} = `);
  expect(start, `${name} exists in app.jsx`).toBeGreaterThan(-1);
  const end = app.indexOf('\n  const ', start + 10);
  return app.slice(start, end);
}

describe('the Pro modal Debug line: copy', () => {
  afterAll(() => setLang('en'));

  it('EN and TR exist with the founder-approved wording', () => {
    setLang('en');
    expect(t('pro', 'debugFeature')).toBe(EN_LINE);
    setLang('tr');
    // TR falls back to EN when the key is missing, so equality to the TR
    // string is the proof the Turkish key exists.
    expect(t('pro', 'debugFeature')).toBe(TR_LINE);
  });

  it('makes no interview, frequency, "unlimited" or price claim', () => {
    for (const line of [EN_LINE, TR_LINE]) {
      expect(line).not.toMatch(/interview|mülakat|unlimited|sınırsız|most[- ]asked|often|\$|\d/i);
    }
  });
});

describe('the Pro modal Debug line: renders only with the flag on', () => {
  const list = bodyOf('renderProFeatureList');

  it('the feature list adds the line through i18n, gated by DEBUG_QUESTIONS_ON', () => {
    expect(list).toContain(".concat(DEBUG_QUESTIONS_ON ? [i18n_t('pro', 'debugFeature')] : [])");
    // Never as a hard-coded string, and nowhere else in the app.
    expect(app).not.toContain(EN_LINE);
    expect((app.match(/i18n_t\('pro', 'debugFeature'\)/g) || []).length).toBe(1);
  });

  it('DEBUG_QUESTIONS_ON is the literal-true read of the flag, and the flag ships off', () => {
    expect(app).toContain('const DEBUG_QUESTIONS_ON = debugQuestionsOn(window.FEATURE_FLAGS);');
    expect(flags).toMatch(/\n\s*debugQuestions: false,/);
  });

  it('the line is not drawn in the accent (DESIGN.md: accent only on the primary CTA)', () => {
    expect(list).not.toContain('#FFE34D');
  });
});

describe('debug_lock: the pure half', () => {
  it('stamps a Debug item and keeps the wall underneath (modal copy unchanged)', () => {
    const quota = { type: 'free_quota', used: 10, quota: 10 };
    const stamped = withDebugLock(quota, debugHard);
    expect(stamped.type).toBe('free_quota');
    expect(stamped.used).toBe(10);
    expect(proModalReasonLabel(stamped)).toBe(DEBUG_LOCK_REASON);
    expect(DEBUG_LOCK_REASON).toBe('debug_lock');
    expect(debugLockedAs(stamped)).toBe('free_quota');
    expect(quota.debugLock).toBeUndefined(); // never mutates
  });

  it('a locked Debug Hard via the catcher reads debug_lock; a plain locked Hard keeps hard_challenge', () => {
    const r = { type: 'hard_challenge', topic: null, solvedCount: 3 };
    expect(proModalReasonLabel(withDebugLock(r, debugHard))).toBe('debug_lock');
    expect(proModalReasonLabel(withDebugLock(r, plainHard))).toBe('hard_challenge');
    expect(debugLockedAs(withDebugLock(r, plainHard))).toBeNull();
  });

  it('a plain item past the quota keeps free_quota; no item (a banner) keeps its reason', () => {
    expect(proModalReasonLabel(withDebugLock({ type: 'free_quota' }, plainHard))).toBe('free_quota');
    expect(proModalReasonLabel(withDebugLock({ type: 'hard_challenge' }, null))).toBe('hard_challenge');
    expect(proModalReasonLabel(null)).toBeNull();
    expect(proModalReasonLabel({})).toBeNull();
  });
});

describe('debug_lock: the app wiring', () => {
  it('pro_modal_shown, pro_plan_clicked, pro_checkout_clicked and pro_events read the label', () => {
    expect(app).toContain("const shownReason = proModalReasonLabel(proModalReason) || 'unknown';\n      trackActivationEvent('pro_modal_shown', {\n        reason: shownReason,");
    expect(app).toContain('        lockedAs: debugLockedAs(proModalReason),\n      });');
    expect(app).toContain("writeProEvent(event, proModalReasonLabel(proModalReason) || 'unknown', metadata);");
    const checkout = app.slice(app.indexOf("trackActivationEvent('pro_checkout_clicked'"));
    expect(checkout.slice(0, 400)).toContain('modalReason: proModalReasonLabel(proModalReason),');
    const plan = app.slice(app.indexOf("trackActivationEvent('pro_plan_clicked'"));
    expect(plan.slice(0, 600)).toContain('modalReason: proModalReasonLabel(proModalReason),');
    // No event left reading the raw type.
    expect(app).not.toMatch(/(modalReason|reason): proModalReason\?\.type \|\|/);
  });

  it('every wall in openChallenge passes the clicked item through withDebugLock', () => {
    const open = bodyOf('openChallenge');
    for (const type of ['company_hard', 'company_set']) {
      expect(open).toMatch(new RegExp(`setProModalReason\\(withDebugLock\\(\\{\\s*type: '${type}'[\\s\\S]*?\\}, challenge\\)\\)`));
    }
    const quotaWalls = open.match(/presentQuotaWall\([^\n]*/g) || [];
    expect(quotaWalls.length).toBe(2);
    for (const call of quotaWalls) expect(call).toMatch(/^presentQuotaWall\(withDebugLock\(\{ type: 'free_quota'.*\}, challenge\)/);
    // The lock rows (content_lock_reached) are untouched: no label in `wall`.
    expect(open).not.toContain("wall: 'debug_lock'");
  });

  it("the catcher's Pro path labels the item it was opened for; the Hard banner keeps hard_challenge", () => {
    const catcher = bodyOf('openProFromPreviewCatcher');
    expect(catcher).toContain('challenges.find(c => c.id === previewCatcher.challengeId)');
    expect(catcher).toContain("setProModalReason(withDebugLock({ type: 'hard_challenge', topic: null, solvedCount: solvedChallenges.size }, lockedItem));");
    // The lookup happens before the catcher state is cleared.
    expect(catcher.indexOf('lockedItem =')).toBeLessThan(catcher.indexOf('setPreviewCatcher(null)'));
    const banner = bodyOf('openProFromHardBanner');
    expect(banner).toContain("setProModalReason({ type: 'hard_challenge', topic: null, solvedCount: solvedChallenges.size });");
    expect(banner).not.toContain('withDebugLock');
  });

  it('the modal copy still keys on the wall type, never on the label', () => {
    expect(app).not.toMatch(/proModalReason\??\.type === 'debug_lock'/);
    expect(app).not.toMatch(/proModalReason\??\.debugLock/);
  });
});
