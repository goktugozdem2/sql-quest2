// Feedback capture points 2-4 (E2, 2026-11-22): exit_reason, stuck, day2.
// Pure rules in src/utils/feedback-prompts.js; the wiring in app.jsx is
// pinned by source guards below.
import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import {
  FEEDBACK_PROMPT_FLAGS, FEEDBACK_PROMPT_KINDS, FEEDBACK_PROMPT_I18N_KEYS, FEEDBACK_THEMES,
  EXIT_REASONS, SESSION_GAP_MS, STUCK_NO_RUN_MS, STUCK_WRONG_SUBMITS, DAY2_SESSION,
  nextSessionRecord, sessionHasRoom, markPromptShown,
  canShowExitReason, stuckTrigger, canShowStuck, canShowDay2,
  buildPromptSubmission, suggestTheme, localDay,
  FBP_EXIT_DAY_KEY, FBP_EXIT_DONE_KEY, FBP_DAY2_KEY, PROMPT_THANKS_MS,
  promptDoneKey, mayRecordAnswer, markPromptAnswered,
} from '../src/utils/feedback-prompts.js';
import { t, setLang } from '../src/utils/i18n.js';

const T0 = new Date(2026, 10, 22, 12, 0, 0).getTime();
const fresh = () => nextSessionRecord(null, T0); // session 1, no prompt yet

describe('sessions and the one-prompt-per-session cap', () => {
  it('counts a new session only after an hour away (the second_session_7d gap)', () => {
    const s1 = fresh();
    expect(s1).toEqual({ count: 1, lastAt: T0, promptIn: null });
    expect(nextSessionRecord(s1, T0 + SESSION_GAP_MS).count).toBe(1);
    expect(nextSessionRecord(s1, T0 + SESSION_GAP_MS + 1).count).toBe(2);
    expect(SESSION_GAP_MS).toBe(60 * 60 * 1000);
  });

  it('a garbage stored record starts over at session 1', () => {
    expect(nextSessionRecord({ count: 'x' }, T0).count).toBe(1);
    expect(nextSessionRecord('nope', T0).count).toBe(1);
  });

  it('after one prompt the session has no room; the next session does', () => {
    const shown = markPromptShown(fresh());
    expect(sessionHasRoom(fresh())).toBe(true);
    expect(sessionHasRoom(shown)).toBe(false);
    const later = nextSessionRecord(shown, T0 + SESSION_GAP_MS + 1);
    expect(sessionHasRoom(later)).toBe(true);
  });
});

describe('exit_reason', () => {
  const base = { flagOn: true, closedVia: 'button', planClicked: false, checkoutPending: false, solvedCount: 3, inTimedMock: false, sessionRec: fresh(), lastExitDay: null, now: T0 };
  it('shows after a plain close with no plan click', () => {
    expect(canShowExitReason(base)).toBe(true);
    for (const via of ['backdrop', 'escape', 'maybe_later']) expect(canShowExitReason({ ...base, closedVia: via })).toBe(true);
  });
  it('never after a plan click or with a checkout pending', () => {
    expect(canShowExitReason({ ...base, planClicked: true })).toBe(false);
    expect(canShowExitReason({ ...base, checkoutPending: true })).toBe(false);
  });
  it('never after a free-path pick (that is an answer already)', () => {
    expect(canShowExitReason({ ...base, closedVia: 'free_path_daily' })).toBe(false);
  });
  it('at most once a local day', () => {
    expect(canShowExitReason({ ...base, lastExitDay: localDay(T0) })).toBe(false);
    expect(canShowExitReason({ ...base, lastExitDay: localDay(T0 - 86400000) })).toBe(true);
  });
  it('flag off, before the first solve, in a mock, or a spent session: no', () => {
    expect(canShowExitReason({ ...base, flagOn: false })).toBe(false);
    expect(canShowExitReason({ ...base, flagOn: 'true' })).toBe(false);
    expect(canShowExitReason({ ...base, solvedCount: 0 })).toBe(false);
    expect(canShowExitReason({ ...base, inTimedMock: true })).toBe(false);
    expect(canShowExitReason({ ...base, sessionRec: markPromptShown(fresh()) })).toBe(false);
  });
  it('the fixed five answers, Other takes text, none names a price', () => {
    expect(EXIT_REASONS.map(r => r.id)).toEqual(['too_expensive', 'not_ready', 'more_free', 'not_what_i_need', 'other']);
    expect(EXIT_REASONS.filter(r => r.text).map(r => r.id)).toEqual(['other']);
  });
});

// 2026-11-24 (docs/reads/funnel-2026-11-24.md §1): one feedback_prompt_shown,
// three exit answers. The card came back after every Pro modal close and
// asked again. These pin "once answered or skipped, never again in this
// browser" and "one show records one answer".
describe('exit_reason: answered or skipped is the end of it', () => {
  const base = { flagOn: true, closedVia: 'button', planClicked: false, checkoutPending: false, solvedCount: 6, inTimedMock: false, sessionRec: fresh(), lastExitDay: null, now: T0 };
  const DAY = 86400000;

  // A browser: localStorage, the rows written to `feedback`, the shown events,
  // and the prompt on screen — driven only through the pure rules app.jsx uses.
  function browser() {
    const store = new Map();
    const rows = [];
    const shown = [];
    let prompt = null;
    let session = fresh();
    return {
      store, rows, shown,
      get prompt() { return prompt; },
      newSession(now) { session = nextSessionRecord(session, now); },
      closeModal(now) {
        if (prompt) return false; // a card already up is the same show
        const ok = canShowExitReason({ ...base, sessionRec: session, now,
          lastExitDay: store.get(FBP_EXIT_DAY_KEY) || null, doneAt: store.get(FBP_EXIT_DONE_KEY) || null });
        if (!ok) return false;
        store.set(FBP_EXIT_DAY_KEY, localDay(now));
        session = markPromptShown(session);
        prompt = { kind: 'exit_reason', trigger: 'pro_modal_closed', challengeId: null };
        shown.push(now);
        return true;
      },
      answer(id) {
        if (!mayRecordAnswer(prompt)) return false;
        rows.push(buildPromptSubmission({ kind: prompt.kind, trigger: prompt.trigger, answerId: id }));
        store.set(promptDoneKey(prompt.kind), 'answered');
        prompt = markPromptAnswered(prompt, T0);
        return true;
      },
      skip() { if (prompt) store.set(promptDoneKey(prompt.kind), 'skipped'); prompt = null; },
      clearAfterThanks() { if (prompt && prompt.answered) prompt = null; },
    };
  }

  it('answered: never shown again, the next day or the next session', () => {
    const b = browser();
    expect(b.closeModal(T0)).toBe(true);
    expect(b.answer('too_expensive')).toBe(true);
    b.clearAfterThanks();
    for (let d = 1; d <= 30; d++) {
      b.newSession(T0 + d * DAY);
      expect(b.closeModal(T0 + d * DAY), `day ${d}`).toBe(false);
    }
    expect(b.shown).toHaveLength(1);
  });

  it('skipped: never shown again either', () => {
    const b = browser();
    expect(b.closeModal(T0)).toBe(true);
    b.skip();
    b.newSession(T0 + 2 * DAY);
    expect(b.closeModal(T0 + 2 * DAY)).toBe(false);
    expect(b.store.get(FBP_EXIT_DONE_KEY)).toBe('skipped');
  });

  it('the rule itself: a done record blocks the ask on any later day', () => {
    expect(canShowExitReason({ ...base, doneAt: '2026-11-23T10:00:00.000Z' })).toBe(false);
    expect(canShowExitReason({ ...base, doneAt: '2026-11-23T10:00:00.000Z', lastExitDay: localDay(T0 - 7 * DAY) })).toBe(false);
    expect(canShowExitReason({ ...base, doneAt: null })).toBe(true);
  });

  it('one show records one answer, however often the card comes back', () => {
    // The person of 11-23: answered, met two more modals (the card re-mounts
    // after each close), answered again twice.
    const b = browser();
    b.closeModal(T0);
    expect(b.answer('too_expensive')).toBe(true);
    expect(b.closeModal(T0 + 60000)).toBe(false);
    expect(b.answer('too_expensive')).toBe(false);
    expect(b.answer('other')).toBe(false);
    expect(b.rows).toHaveLength(1);
    expect(b.shown).toHaveLength(1);
    expect(mayRecordAnswer(null)).toBe(false);
    expect(mayRecordAnswer({ kind: 'nope' })).toBe(false);
    expect(mayRecordAnswer({ kind: 'day2' })).toBe(true);
    expect(mayRecordAnswer(markPromptAnswered({ kind: 'day2' }))).toBe(false);
  });

  it('day2 is remembered under its own once-ever key; stuck per challenge at show', () => {
    expect(promptDoneKey('exit_reason')).toBe(FBP_EXIT_DONE_KEY);
    expect(promptDoneKey('day2')).toBe(FBP_DAY2_KEY);
    expect(promptDoneKey('stuck')).toBe(null);
    expect(FBP_EXIT_DONE_KEY).not.toBe(FBP_EXIT_DAY_KEY);
    expect(PROMPT_THANKS_MS).toBeGreaterThan(0);
  });
});

describe('stuck', () => {
  it('fires after 3 minutes with no run, or at the third wrong submit', () => {
    expect(STUCK_NO_RUN_MS).toBe(180000);
    expect(STUCK_WRONG_SUBMITS).toBe(3);
    expect(stuckTrigger({ msOpen: STUCK_NO_RUN_MS - 1, hasRun: false, wrongSubmits: 0 })).toBe(null);
    expect(stuckTrigger({ msOpen: STUCK_NO_RUN_MS, hasRun: false, wrongSubmits: 0 })).toBe('no_run_3m');
    expect(stuckTrigger({ msOpen: STUCK_NO_RUN_MS * 5, hasRun: true, wrongSubmits: 0 })).toBe(null);
    expect(stuckTrigger({ msOpen: 0, hasRun: true, wrongSubmits: 2 })).toBe(null);
    expect(stuckTrigger({ msOpen: 0, hasRun: true, wrongSubmits: 3 })).toBe('wrong_3');
  });
  const base = { flagOn: true, challengeId: 91, askedIds: [], trigger: 'no_run_3m', solved: false, inTimedMock: false, sessionRec: fresh() };
  it('is the one ask allowed before the first solve', () => {
    expect(canShowStuck(base)).toBe(true);
  });
  it('once per challenge (ids compared as strings)', () => {
    expect(canShowStuck({ ...base, askedIds: [91] })).toBe(false);
    expect(canShowStuck({ ...base, askedIds: ['91'] })).toBe(false);
    expect(canShowStuck({ ...base, askedIds: [92] })).toBe(true);
  });
  it('never in a timed mock, on a solved challenge, without a trigger, or in a spent session', () => {
    expect(canShowStuck({ ...base, inTimedMock: true })).toBe(false);
    expect(canShowStuck({ ...base, solved: true })).toBe(false);
    expect(canShowStuck({ ...base, trigger: null })).toBe(false);
    expect(canShowStuck({ ...base, sessionRec: markPromptShown(fresh()) })).toBe(false);
    expect(canShowStuck({ ...base, flagOn: false })).toBe(false);
  });
});

describe('day2', () => {
  const s2 = nextSessionRecord(fresh(), T0 + SESSION_GAP_MS + 1);
  const base = { flagOn: true, sessionRec: s2, askedAt: null, solvedCount: 2, inTimedMock: false, challengeOpen: false, overlayOpen: false };
  it('shows on the second session only', () => {
    expect(DAY2_SESSION).toBe(2);
    expect(canShowDay2(base)).toBe(true);
    expect(canShowDay2({ ...base, sessionRec: fresh() })).toBe(false);
    expect(canShowDay2({ ...base, sessionRec: nextSessionRecord(s2, T0 + 3 * SESSION_GAP_MS) })).toBe(false);
  });
  it('once ever', () => {
    expect(canShowDay2({ ...base, askedAt: '2026-11-21T10:00:00Z' })).toBe(false);
  });
  it('on the first screen only: nothing open over or in front of it', () => {
    expect(canShowDay2({ ...base, challengeOpen: true })).toBe(false);
    expect(canShowDay2({ ...base, overlayOpen: true })).toBe(false);
    expect(canShowDay2({ ...base, inTimedMock: true })).toBe(false);
  });
  it('never before the first solve', () => {
    expect(canShowDay2({ ...base, solvedCount: 0 })).toBe(false);
  });
});

describe('what gets written', () => {
  it('exit_reason writes the answer id (and the Other line)', () => {
    const a = buildPromptSubmission({ kind: 'exit_reason', trigger: 'pro_modal_closed', answerId: 'too_expensive' });
    expect(a.message).toBe('too_expensive');
    expect(a.context).toMatchObject({ kind: 'exit_reason', trigger: 'pro_modal_closed', answer: 'too_expensive', themeHint: 'price' });
    expect(buildPromptSubmission({ kind: 'exit_reason', answerId: 'other', text: '  need SQL Server  ' }).message).toBe('other: need SQL Server');
    expect(buildPromptSubmission({ kind: 'exit_reason', answerId: 'other' }).message).toBe('other');
    expect(buildPromptSubmission({ kind: 'exit_reason', answerId: 'free_money' })).toBe(null);
  });
  it('stuck and day2 write nothing when the line is empty, and cap the length', () => {
    expect(buildPromptSubmission({ kind: 'stuck', trigger: 'wrong_3', text: '   ' })).toBe(null);
    const s = buildPromptSubmission({ kind: 'stuck', trigger: 'wrong_3', text: 'which date column?', challengeId: 91 });
    expect(s).toMatchObject({ message: 'which date column?', topic: 'stuck', context: { kind: 'stuck', trigger: 'wrong_3', challengeId: 91, themeHint: 'content gap' } });
    expect(buildPromptSubmission({ kind: 'day2', text: 'x'.repeat(900) }).message.length).toBe(300);
    expect(buildPromptSubmission({ kind: 'open', text: 'hi' })).toBe(null);
  });
  it('theme hints come from the fixed list', () => {
    for (const r of EXIT_REASONS) expect(FEEDBACK_THEMES).toContain(suggestTheme('exit_reason', r.id));
    expect(FEEDBACK_THEMES).toContain(suggestTheme('stuck'));
    expect(suggestTheme('day2')).toBe(null);
  });
});

describe('copy: English and Turkish, one line, no price', () => {
  afterAll(() => setLang('en'));
  const read = (lang) => { setLang(lang); return Object.fromEntries(FEEDBACK_PROMPT_I18N_KEYS.map(k => [k, t('feedback', k)])); };
  it('every key exists in both languages and Turkish is its own', () => {
    const en = read('en');
    const tr = read('tr');
    for (const k of FEEDBACK_PROMPT_I18N_KEYS) {
      expect(en[k], k).not.toBe(k);
      expect(tr[k], k).not.toBe(k);
      expect(tr[k], k).not.toBe(en[k]);
    }
    for (const r of EXIT_REASONS) expect(FEEDBACK_PROMPT_I18N_KEYS).toContain(r.label);
  });
  it('no price, no currency, no newline', () => {
    for (const lang of ['en', 'tr']) {
      for (const [k, v] of Object.entries(read(lang))) {
        expect(v, `${lang}.${k}`).not.toMatch(/[$€£₺]|\d|\bPro\b|USD|price|fiyat/i);
        expect(v, `${lang}.${k}`).not.toMatch(/\n/);
      }
    }
  });
});

describe('the app wiring (source guards)', () => {
  const app = fs.readFileSync(new URL('../src/app.jsx', import.meta.url), 'utf8');
  const flags = fs.readFileSync(new URL('../src/data/feature-flags.js', import.meta.url), 'utf8');
  const cardStart = app.indexOf('function FeedbackPromptCard(');
  const card = app.slice(cardStart, app.indexOf('function FeedbackWidget(', cardStart));
  const hooksStart = app.indexOf('// ── Feedback capture points 2-4 (E2, 2026-11-22)');
  const hooks = app.slice(hooksStart, app.indexOf('const runChallengeQuery = () => {', hooksStart));
  const dismissStart = app.indexOf('const dismissProModal = (via) => {');
  const dismiss = app.slice(dismissStart, app.indexOf('const beginCheckout = (plan) => {', dismissStart));

  // exitReasonAsk and day2Ask ON 2026-11-23 (orchestrator-decisions 2026-11-22);
  // stuckAsk stays dark until 2026-12-20. Any other state fails here.
  const FLAG_STATE = { exitReasonAsk: true, stuckAsk: false, day2Ask: true };

  it('three flags in their decided state, read strictly through ftbFlag', () => {
    for (const [kind, flag] of Object.entries(FEEDBACK_PROMPT_FLAGS)) {
      expect(FEEDBACK_PROMPT_KINDS).toContain(kind);
      expect(FLAG_STATE, flag).toHaveProperty(flag);
      expect(flags, flag).toMatch(new RegExp(`\\n\\s*${flag}: ${FLAG_STATE[flag]},`));
    }
    expect(hooks).toContain('const fbFlag = (kind) => ftbFlag(FEEDBACK_PROMPT_FLAGS[kind]);');
  });

  it('the hooks sit above the showAuth / dbReady early returns', () => {
    expect(hooksStart).toBeGreaterThan(0);
    expect(hooksStart).toBeLessThan(app.indexOf('  if (showAuth) {'));
    expect(hooksStart).toBeLessThan(app.indexOf('  if (!dbReady) return ('));
  });

  it('every gate goes through the pure rules', () => {
    expect(hooks).toContain('canShowExitReason({');
    expect(hooks).toContain('canShowStuck({');
    expect(hooks).toContain('canShowDay2({');
  });

  it('a prompt counts as shown only once it is on screen (IntersectionObserver)', () => {
    const show = hooks.slice(hooks.indexOf('const fbShowPrompt = '), hooks.indexOf('const fbMarkSeen = '));
    const seen = hooks.slice(hooks.indexOf('const fbMarkSeen = '), hooks.indexOf('const fbSkipPrompt = '));
    expect(show).toContain('setFbPrompt(');
    expect(show).not.toMatch(/markPromptShown|feedback_prompt_shown|FBP_STUCK_IDS_KEY/);
    expect(seen).toMatch(/markPromptShown\([\s\S]*FBP_STUCK_IDS_KEY[\s\S]*feedback_prompt_shown/);
    expect(card).toMatch(/new IntersectionObserver\([\s\S]*isIntersecting[\s\S]*onSeen\(\)/);
    expect(card).toContain('ref={rootRef}');
    expect((app.match(/onSeen=\{fbMarkSeen\}/g) || []).length).toBe(3);
  });

  it('a card re-mounted on its thanks (answered) never counts as shown again', () => {
    // A1 on #227: after #286 the card re-mounts with `answered` when a Pro
    // modal closes. That card was already seen; it must not fire onSeen, and
    // fbMarkSeen must refuse an answered prompt even if it were called.
    const seen = hooks.slice(hooks.indexOf('const fbMarkSeen = '), hooks.indexOf('const fbSkipPrompt = '));
    expect(card).toMatch(/if \(!el \|\| !onSeen \|\| answered\) return;/);
    expect(seen).toMatch(/if \(!p \|\| p\.answered\) return;/);
    // And the same prompt seen twice (re-mount before an answer) counts once.
    expect(seen).toMatch(/if \(fbSeenRef\.current === key\) return;\s*\n\s*fbSeenRef\.current = key;/);
  });

  it('exit_reason is asked only after the plans close, and a plan click blocks it', () => {
    expect(dismiss.indexOf('setShowProModal(false);')).toBeGreaterThan(0);
    expect(dismiss.indexOf('maybeAskExitReason(')).toBeGreaterThan(dismiss.indexOf('setShowProModal(false);'));
    expect(app).toMatch(/const beginCheckout = \(plan\) => \{\s*\n\s*proModalPlanClickedRef\.current = true;/);
    expect(app).toMatch(/proModalPlansSeenRef\.current = false;\s*\n\s*proModalPlanClickedRef\.current = false;/);
    expect(hooks).toContain('planClicked: proModalPlanClickedRef.current');
    // The global slot never renders while the modal is up.
    expect(app).toContain("{fbPrompt && fbPrompt.kind !== 'stuck' && !showProModal && (");
  });

  it('stuck renders on the challenge page for its own challenge, one card per trigger', () => {
    expect(app).toContain("{fbPrompt?.kind === 'stuck' && fbPrompt.trigger === 'no_run_3m' && fbPrompt.challengeId === currentChallenge.id && (");
    expect(app).toContain("{fbPrompt?.kind === 'stuck' && fbPrompt.trigger === 'wrong_3' && fbPrompt.challengeId === currentChallenge.id && (");
    expect(hooks).toContain('hasRun: firstRunSentRef.current.has(id)');
    expect(hooks).toContain('wrongSubmits: wrongAttemptCount');
  });

  it('the no-run timer asks only while the challenge is on screen', () => {
    // currentChallenge survives a switch to another tab of the app, and a
    // hidden browser tab still fires timers: an unseen card would spend the
    // session's one ask and inflate feedback_prompt_shown (A1, 2026-11-22).
    const timer = hooks.slice(hooks.indexOf('const t = setTimeout(() => {'), hooks.indexOf('STUCK_NO_RUN_MS + 500'));
    expect(timer).toContain("document.visibilityState !== 'visible'");
    expect(timer).toContain('!document.querySelector(\'[data-testid="challenge-result-anchor"]\')');
    expect(timer.indexOf('return;')).toBeLessThan(timer.indexOf('fbTryStuck('));
  });

  it('timed mock is read from the interview state', () => {
    expect(hooks).toContain('const fbInTimedMock = () => !!activeInterview && !interviewCompleted;');
  });

  it('rows go through the widget insert into `feedback` with kind and trigger, nothing else', () => {
    expect(hooks).toMatch(/await submitFeedback\(\{[^}]*kind: prompt\.kind, trigger: prompt\.trigger/);
    expect(hooks).not.toMatch(/rest\/v1\/|supabaseFetch|rpc\//);
    expect(app).toMatch(/context: \{\s*\n\s*topic: topic \|\| null,[\s\S]{0,300}kind: kind \|\| 'open',\s*\n\s*trigger: trigger \|\| null,/);
    expect(app).toMatch(/trackActivationEvent\('feedback_submitted', \{[\s\S]{0,200}kind: kind \|\| 'open',\s*\n\s*trigger: trigger \|\| null,/);
  });

  // 2026-11-24: the card re-mounted after a Pro modal close came back as a
  // fresh question and wrote a second (and third) answer row.
  it('an answer is recorded once, then the card shows thanks and is cleared', () => {
    const send = hooks.slice(hooks.indexOf('const fbSendPrompt = async'), hooks.indexOf('// 2 — exit_reason'));
    expect(send.indexOf('mayRecordAnswer(prompt)')).toBeGreaterThan(0);
    expect(send.indexOf('mayRecordAnswer(prompt)')).toBeLessThan(send.indexOf('await submitFeedback('));
    expect(send.indexOf('fbAnsweredRef.current = prompt;')).toBeLessThan(send.indexOf('await submitFeedback('));
    expect(send).toMatch(/if \(!ok\)[\s\S]*?fbMarkDone\(prompt\.kind\);[\s\S]*?markPromptAnswered\(p\)[\s\S]*?PROMPT_THANKS_MS/);
    // Every slot hands the prompt's answered state to the card, and the card
    // opens on the thanks when it is set.
    expect(app.match(/<FeedbackPromptCard [^>]*answered=\{!!fbPrompt\.answered\}/g) || []).toHaveLength(3);
    expect(app.match(/<FeedbackPromptCard /g) || []).toHaveLength(3);
    expect(card).toContain("React.useState(answered ? 'done' : 'idle')");
  });

  it('answered or skipped is remembered in the browser, and the exit gate reads it', () => {
    const skip = hooks.slice(hooks.indexOf('const fbSkipPrompt = () => {'), hooks.indexOf('const fbAnsweredRef'));
    expect(skip).toContain('fbMarkDone(fbPrompt.kind)');
    expect(hooks).toMatch(/const fbMarkDone = \(kind\) => \{\s*\n\s*const key = promptDoneKey\(kind\);/);
    expect(hooks).toContain('doneAt: (() => { try { return localStorage.getItem(FBP_EXIT_DONE_KEY); }');
  });

  it('the card is not a modal and never uses the accent', () => {
    expect(card.length).toBeGreaterThan(200);
    expect(card).not.toMatch(/FFE34D|F5C518|accent|fixed inset-0|role="dialog"|aria-modal/i);
    expect(card).toContain("tt('promptSkip')");
  });
});
