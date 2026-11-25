// The in-app interview asks (2026-11-25): least_ready and the one outcome
// flow (#369's F1 merged into #367's outcome_debrief). Pure rules in
// src/utils/interview-asks.js + the two new kinds in feedback-prompts.js;
// the wiring in app.jsx is pinned by the source guards at the bottom.
import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import {
  LEAST_READY_TRIGGERS, LEAST_READY_TAB_MIN_SOLVES, OUTCOME_ASK_KEY, OUTCOME_ASK_SURFACES,
  OUTCOME_ASK_TRIGGERS, DATE_PASSED_MAX_DAYS, RETURN_DAYS, OUTCOME_ASK_REPEAT_DAYS,
  daysSinceDate, canShowLeastReady, leastReadyExtra, outcomeAskTrigger, canShowOutcomeAsk,
  outcomeAnswerEvent, afterOutcome, canShowDebrief, debriefTriggerFor,
} from '../src/utils/interview-asks.js';
import {
  FEEDBACK_PROMPT_FLAGS, FEEDBACK_PROMPT_KINDS, FEEDBACK_PROMPT_I18N_KEYS, FEEDBACK_THEMES,
  LEAST_READY_OPTIONS, PROMPT_OPTIONS, PROMPT_COPY, FBP_LEAST_READY_KEY,
  nextSessionRecord, markPromptShown, promptDoneKey, promptSlot, buildPromptSubmission,
  pickPromptExtra, suggestTheme,
} from '../src/utils/feedback-prompts.js';
import { daysUntil } from '../src/utils/interview-prep.js';
import { t, setLang } from '../src/utils/i18n.js';

const DAY = 86400000;
const NOW = Date.UTC(2026, 10, 25, 12, 0, 0);
const fresh = () => nextSessionRecord(null, NOW);
const iso = (ms) => new Date(ms).toISOString();
const dateAgo = (n) => new Date(NOW - n * DAY).toISOString().slice(0, 10);

describe('daysSinceDate agrees with interview-prep daysUntil (one frame)', () => {
  it('is the negation of daysUntil, null on garbage', () => {
    for (const n of [-3, 0, 1, 14, 15, 40]) expect(daysSinceDate(dateAgo(n), NOW) + daysUntil(dateAgo(n), NOW)).toBe(0);
    expect(daysSinceDate('2026-02-31', NOW)).toBe(null);
    expect(daysSinceDate('soon', NOW)).toBe(null);
    expect(daysSinceDate(null, NOW)).toBe(null);
  });
});

describe('least_ready', () => {
  const base = { flagOn: true, sessionRec: fresh(), inTimedMock: false, solvedCount: 4, doneAt: null };
  it('mock_results: a first full sitting, never a retry', () => {
    expect(LEAST_READY_TRIGGERS).toEqual(['mock_results', 'interview_tab']);
    expect(canShowLeastReady({ ...base, trigger: 'mock_results' })).toBe(true);
    expect(canShowLeastReady({ ...base, trigger: 'mock_results', retry: true })).toBe(false);
  });
  it('interview_tab: an interview person, 3+ solves, no finished mock, nothing else asking there', () => {
    const tab = { ...base, trigger: 'interview_tab', interviewPerson: true, completedMocks: 0 };
    expect(LEAST_READY_TAB_MIN_SOLVES).toBe(3);
    expect(canShowLeastReady(tab)).toBe(true);
    expect(canShowLeastReady({ ...tab, interviewPerson: false })).toBe(false);
    expect(canShowLeastReady({ ...tab, completedMocks: 1 })).toBe(false);
    expect(canShowLeastReady({ ...tab, solvedCount: 2 })).toBe(false);
    expect(canShowLeastReady({ ...tab, otherAskOnTab: true })).toBe(false);
  });
  it('the common rules: flag strictly true, one ask a session, never in a mock, 1+ solve, once per browser', () => {
    const m = { ...base, trigger: 'mock_results' };
    expect(canShowLeastReady({ ...m, flagOn: 'true' })).toBe(false);
    expect(canShowLeastReady({ ...m, flagOn: false })).toBe(false);
    expect(canShowLeastReady({ ...m, sessionRec: markPromptShown(fresh()) })).toBe(false);
    expect(canShowLeastReady({ ...m, inTimedMock: true })).toBe(false);
    expect(canShowLeastReady({ ...m, solvedCount: 0 })).toBe(false);
    expect(canShowLeastReady({ ...m, doneAt: '2026-11-25T10:00:00Z' })).toBe(false);
    expect(canShowLeastReady({ ...m, trigger: 'day2' })).toBe(false);
  });
  it('one done key shared by both triggers', () => {
    expect(promptDoneKey('least_ready')).toBe(FBP_LEAST_READY_KEY);
    expect(FBP_LEAST_READY_KEY).toBe('sqlquest_fbp_least_ready_at');
  });
  it('the plan\'s eight fixed answers, `other` takes a line, themes from the fixed list', () => {
    expect(LEAST_READY_OPTIONS.map(o => o.id)).toEqual(['time_pressure', 'window_functions', 'joins_aggregation', 'business_question', 'explaining', 'edge_cases', 'no_interview', 'other']);
    expect(LEAST_READY_OPTIONS.filter(o => o.text).map(o => o.id)).toEqual(['other']);
    for (const o of LEAST_READY_OPTIONS) expect(FEEDBACK_THEMES).toContain(suggestTheme('least_ready', o.id));
    expect(PROMPT_OPTIONS.least_ready).toBe(LEAST_READY_OPTIONS);
  });
  it('writes the answer id (as `answerId`, the metric reads it) and the mock context, never a date', () => {
    const extra = leastReadyExtra({ results: { interviewId: 'sql-fundamentals-free', passed: false, percentage: 62, date: '2026-11-25' }, company: ' Capital One ', daysOut: 9 });
    expect(extra).toEqual({ interviewId: 'sql-fundamentals-free', passed: false, percentage: 62, company: 'Capital One', daysOut: 9 });
    const sub = buildPromptSubmission({ kind: 'least_ready', trigger: 'mock_results', answerId: 'time_pressure', extra });
    expect(sub.message).toBe('time_pressure');
    expect(sub.context).toMatchObject({ kind: 'least_ready', trigger: 'mock_results', answer: 'time_pressure', answerId: 'time_pressure', themeHint: 'interview format', interviewId: 'sql-fundamentals-free', passed: false, percentage: 62, company: 'Capital One', daysOut: 9 });
    expect(JSON.stringify(sub)).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(buildPromptSubmission({ kind: 'least_ready', answerId: 'other', text: ' case study round ' }).message).toBe('other: case study round');
    expect(buildPromptSubmission({ kind: 'least_ready', answerId: 'vibes' })).toBe(null);
  });
});

describe('the extra-context whitelist', () => {
  it('drops unknown keys, dates, emails and objects', () => {
    expect(pickPromptExtra('least_ready', { interviewId: 'x', date: '2026-11-25', email: 'a@b.c', company: 'a@b.c', daysOut: 3, nested: { a: 1 } }))
      .toEqual({ interviewId: 'x', daysOut: 3 });
    expect(pickPromptExtra('outcome_debrief', { outcome: 'failed', company: '2026-12-01 Stripe', daysSince: 2, surface: 'coach', prepDate: '2026-11-20' }))
      .toEqual({ outcome: 'failed', daysSince: 2, surface: 'coach' });
    expect(pickPromptExtra('exit_reason', { company: 'x' })).toEqual({});
    expect(pickPromptExtra('least_ready', null)).toEqual({});
  });
});

describe('the outcome ask: who, and why', () => {
  it('date_passed: the date fell 1–14 days ago', () => {
    expect(DATE_PASSED_MAX_DAYS).toBe(14);
    expect(outcomeAskTrigger({ prepDate: dateAgo(1), now: NOW })).toBe('date_passed');
    expect(outcomeAskTrigger({ prepDate: dateAgo(14), now: NOW })).toBe('date_passed');
    expect(outcomeAskTrigger({ prepDate: dateAgo(0), now: NOW })).toBe(null);
    expect(outcomeAskTrigger({ prepDate: dateAgo(-5), now: NOW })).toBe(null);
    expect(outcomeAskTrigger({ prepDate: dateAgo(15), now: NOW })).toBe(null);
  });
  it('return_21d: interview / job_ready declared 21+ days ago, nothing ahead, no outcome since', () => {
    expect(RETURN_DAYS).toBe(21);
    const r = { intent: 'interview', intentAt: iso(NOW - 21 * DAY), now: NOW };
    expect(outcomeAskTrigger(r)).toBe('return_21d');
    expect(outcomeAskTrigger({ ...r, intent: 'job_ready' })).toBe('return_21d');
    expect(outcomeAskTrigger({ ...r, intent: 'learning' })).toBe(null);
    expect(outcomeAskTrigger({ ...r, intentAt: iso(NOW - 20 * DAY) })).toBe(null);
    expect(outcomeAskTrigger({ ...r, intentAt: null })).toBe(null);
    expect(outcomeAskTrigger({ ...r, prepDate: dateAgo(-3) })).toBe(null);      // the interview is still ahead
    expect(outcomeAskTrigger({ ...r, prepOutcomeAt: iso(NOW - 2 * DAY) })).toBe(null);
    expect(outcomeAskTrigger({ ...r, prepOutcomeAt: iso(NOW - 30 * DAY) })).toBe('return_21d'); // an outcome from before the intent
  });
  it('a stale date (15+ days) falls back to the intent rule', () => {
    expect(outcomeAskTrigger({ prepDate: dateAgo(40), intent: 'interview', intentAt: iso(NOW - 60 * DAY), now: NOW })).toBe('return_21d');
  });
  const base = { flagOn: true, trigger: 'date_passed', hired: false, inTimedMock: false, sessionRec: fresh(), lastShownAt: null, now: NOW };
  it('shows with the flag, a trigger, room in the session; never hired, never in a mock', () => {
    expect(canShowOutcomeAsk(base)).toBe(true);
    expect(canShowOutcomeAsk({ ...base, flagOn: 'true' })).toBe(false);
    expect(canShowOutcomeAsk({ ...base, trigger: null })).toBe(false);
    expect(canShowOutcomeAsk({ ...base, hired: true })).toBe(false);
    expect(canShowOutcomeAsk({ ...base, inTimedMock: true })).toBe(false);
    expect(canShowOutcomeAsk({ ...base, sessionRec: markPromptShown(fresh()) })).toBe(false);
  });
  it('once per 30 days', () => {
    expect(OUTCOME_ASK_REPEAT_DAYS).toBe(30);
    expect(canShowOutcomeAsk({ ...base, lastShownAt: iso(NOW - 29 * DAY) })).toBe(false);
    expect(canShowOutcomeAsk({ ...base, lastShownAt: iso(NOW - 30 * DAY) })).toBe(true);
  });
});

describe('the outcome ask: the answer and what follows (one flow)', () => {
  it('the answer is interview_outcome with source in_app, the integer days, never the date', () => {
    const ev = outcomeAnswerEvent({ outcome: 'failed', surface: 'coach', trigger: 'date_passed', company: 'Revolut', prepDate: dateAgo(3), now: NOW });
    expect(ev).toEqual({ outcome: 'failed', source: 'in_app', surface: 'coach', trigger: 'date_passed', company: 'Revolut', daysSince: 3 });
    expect(JSON.stringify(ev)).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(outcomeAnswerEvent({ outcome: 'moved', surface: 'interview_tab', trigger: 'return_21d', now: NOW })).toMatchObject({ outcome: 'moved', daysSince: null, company: null });
    expect(outcomeAnswerEvent({ outcome: 'great', surface: 'coach', trigger: 'date_passed', now: NOW })).toBe(null);
    expect(OUTCOME_ASK_SURFACES).toEqual(['coach', 'interview_tab']);
    expect(OUTCOME_ASK_TRIGGERS).toEqual(['date_passed', 'return_21d']);
  });
  it('passed → the existing offer ask; failed → the debrief; moved → nothing', () => {
    expect(afterOutcome({ outcome: 'passed', debriefOn: true })).toBe('offer');
    expect(afterOutcome({ outcome: 'passed', debriefOn: true, offerAsked: true })).toBe('none');
    expect(afterOutcome({ outcome: 'passed', debriefOn: true, hired: true })).toBe('none');
    expect(afterOutcome({ outcome: 'failed', debriefOn: true })).toBe('debrief');
    expect(afterOutcome({ outcome: 'failed', debriefOn: false })).toBe('none');
    expect(afterOutcome({ outcome: 'moved', debriefOn: true })).toBe('none');
  });
  it('the debrief continues the card in the same session; the link door needs room of its own', () => {
    const spent = markPromptShown(fresh());
    expect(debriefTriggerFor('coach')).toBe('outcome_coach');
    expect(debriefTriggerFor('interview_tab')).toBe('outcome_tab');
    expect(debriefTriggerFor('practice')).toBe(null);
    expect(canShowDebrief({ flagOn: true, trigger: 'outcome_coach', sessionRec: spent, inTimedMock: false, continuesAsk: true })).toBe(true);
    expect(canShowDebrief({ flagOn: true, trigger: 'outcome_coach', sessionRec: spent, inTimedMock: false })).toBe(false);
    expect(canShowDebrief({ flagOn: true, trigger: 'outcome_link', sessionRec: spent, inTimedMock: false, continuesAsk: true })).toBe(false);
    expect(canShowDebrief({ flagOn: true, trigger: 'outcome_link', sessionRec: fresh(), inTimedMock: false })).toBe(true);
    expect(canShowDebrief({ flagOn: true, trigger: 'outcome_link', sessionRec: fresh(), inTimedMock: true })).toBe(false);
    expect(canShowDebrief({ flagOn: false, trigger: 'outcome_tab', sessionRec: fresh(), inTimedMock: false, continuesAsk: true })).toBe(false);
    expect(canShowDebrief({ flagOn: true, trigger: null, sessionRec: fresh(), inTimedMock: false })).toBe(false);
  });
  it('the debrief writes its line with the outcome, never the date; empty writes nothing', () => {
    const sub = buildPromptSubmission({ kind: 'outcome_debrief', trigger: 'outcome_tab', text: 'window functions under time', extra: { outcome: 'failed', company: 'Stripe', daysSince: 4, surface: 'interview_tab' } });
    expect(sub).toMatchObject({ message: 'window functions under time', topic: 'outcome_debrief', context: { kind: 'outcome_debrief', trigger: 'outcome_tab', outcome: 'failed', company: 'Stripe', daysSince: 4, surface: 'interview_tab', themeHint: 'content gap' } });
    expect(buildPromptSubmission({ kind: 'outcome_debrief', trigger: 'outcome_link', text: '  ' })).toBe(null);
    expect(promptDoneKey('outcome_debrief')).toBe(null); // once per answer, not once ever: a later interview may fail too
  });
});

describe('one flow over a month, driven through the pure rules', () => {
  // A browser with a date that passed yesterday, the flag on.
  function browser() {
    let session = fresh();
    const rec = {};
    const events = [];
    let card = null;
    let prompt = null;
    return {
      events, rec,
      get card() { return card; }, get prompt() { return prompt; },
      newSession(now) { session = nextSessionRecord(session, now); card = null; prompt = null; },
      open(surface, ctx, now) {
        if (card || prompt) return false;
        const trigger = outcomeAskTrigger({ ...ctx, prepOutcomeAt: rec.answeredAt || null, now });
        if (!canShowOutcomeAsk({ flagOn: true, trigger, sessionRec: session, lastShownAt: rec.shownAt || null, now })) return false;
        session = markPromptShown(session);
        rec.shownAt = iso(now);
        card = { trigger, surface };
        events.push(['outcome_ask_shown', { surface, trigger }]);
        return true;
      },
      answer(outcome, ctx, now) {
        const ev = outcomeAnswerEvent({ outcome, surface: card.surface, trigger: card.trigger, prepDate: ctx.prepDate, now });
        events.push(['interview_outcome', ev]);
        if (outcome !== 'moved') rec.answeredAt = iso(now);
        const next = afterOutcome({ outcome, debriefOn: true });
        if (next === 'debrief') {
          const trig = debriefTriggerFor(card.surface);
          if (canShowDebrief({ flagOn: true, trigger: trig, sessionRec: session, inTimedMock: false, continuesAsk: true })) {
            prompt = { kind: 'outcome_debrief', trigger: trig };
            events.push(['feedback_prompt_shown', prompt]);
          }
        }
        return next;
      },
    };
  }

  it('failed: one card, one interview_outcome, one debrief in the same card, then silence', () => {
    const b = browser();
    const ctx = { prepDate: dateAgo(1) };
    expect(b.open('coach', ctx, NOW)).toBe(true);
    expect(b.open('interview_tab', ctx, NOW)).toBe(false);   // the same card, not a second one
    expect(b.answer('failed', ctx, NOW)).toBe('debrief');
    expect(b.prompt).toEqual({ kind: 'outcome_debrief', trigger: 'outcome_coach' });
    expect(promptSlot(b.prompt)).toBe('inline');
    // The app takes the date off the record after an answer: later sessions see none.
    for (let d = 1; d <= 40; d++) { b.newSession(NOW + d * DAY); expect(b.open('coach', { prepDate: null }, NOW + d * DAY), `day ${d}`).toBe(false); }
    expect(b.events.map(e => e[0])).toEqual(['outcome_ask_shown', 'interview_outcome', 'feedback_prompt_shown']);
  });

  it('not yet (return_21d): asked again only after 30 days', () => {
    const b = browser();
    const ctx = { intent: 'job_ready', intentAt: iso(NOW - 25 * DAY) };
    expect(b.open('interview_tab', ctx, NOW)).toBe(true);
    expect(b.answer('moved', ctx, NOW)).toBe('none');
    b.newSession(NOW + 29 * DAY);
    expect(b.open('interview_tab', ctx, NOW + 29 * DAY)).toBe(false);
    b.newSession(NOW + 30 * DAY);
    expect(b.open('interview_tab', ctx, NOW + 30 * DAY)).toBe(true);
  });

  it('passed (return_21d): the offer ask, and the intent rule stays quiet after', () => {
    const b = browser();
    const ctx = { intent: 'interview', intentAt: iso(NOW - 22 * DAY) };
    expect(b.open('coach', ctx, NOW)).toBe(true);
    expect(b.answer('passed', ctx, NOW)).toBe('offer');
    b.newSession(NOW + 31 * DAY);
    expect(b.open('coach', ctx, NOW + 31 * DAY)).toBe(false);
  });
});

describe('where each prompt renders', () => {
  it('least_ready and the in-app debrief inline; the link debrief in the global slot; the rest unchanged', () => {
    expect(promptSlot({ kind: 'least_ready', trigger: 'mock_results' })).toBe('inline');
    expect(promptSlot({ kind: 'least_ready', trigger: 'interview_tab' })).toBe('inline');
    expect(promptSlot({ kind: 'outcome_debrief', trigger: 'outcome_tab' })).toBe('inline');
    expect(promptSlot({ kind: 'outcome_debrief', trigger: 'outcome_coach' })).toBe('inline');
    expect(promptSlot({ kind: 'outcome_debrief', trigger: 'outcome_link' })).toBe('global');
    expect(promptSlot({ kind: 'stuck', trigger: 'wrong_3' })).toBe('challenge');
    expect(promptSlot({ kind: 'exit_reason', trigger: 'pro_modal_closed' })).toBe('global');
    expect(promptSlot({ kind: 'day2', trigger: 'second_session' })).toBe('global');
    expect(promptSlot(null)).toBe(null);
    expect(promptSlot({ kind: 'nope' })).toBe(null);
  });
});

describe('copy: both languages, no price, no digits', () => {
  afterAll(() => setLang('en'));
  const keys = ['leastReadyQ', 'debriefQ', 'outcomeAskQ', 'outcomeAskPassed', 'outcomeAskFailed', 'outcomeAskNotYet', 'leastReadyOtherPlaceholder', 'debriefPlaceholder', ...LEAST_READY_OPTIONS.map(o => o.label)];
  it('every key is in the shared key list and in both languages', () => {
    for (const k of keys) expect(FEEDBACK_PROMPT_I18N_KEYS).toContain(k);
    for (const kind of ['least_ready', 'outcome_debrief']) {
      expect(FEEDBACK_PROMPT_KINDS).toContain(kind);
      expect(FEEDBACK_PROMPT_I18N_KEYS).toContain(PROMPT_COPY[kind].q);
      expect(FEEDBACK_PROMPT_I18N_KEYS).toContain(PROMPT_COPY[kind].placeholder);
    }
    setLang('en'); const en = keys.map(k => t('feedback', k));
    setLang('tr'); const tr = keys.map(k => t('feedback', k));
    keys.forEach((k, i) => { expect(en[i], k).not.toBe(k); expect(tr[i], k).not.toBe(k); expect(tr[i], k).not.toBe(en[i]); });
    expect(en[0]).toBe('Which part of the real interview do you feel least ready for?');
    expect(en[1]).toBe('What do you wish you had practised more?');
    expect(en[2]).toBe('Did your interview happen?');
  });
});

describe('the app wiring (source guards)', () => {
  const app = fs.readFileSync(new URL('../src/app.jsx', import.meta.url), 'utf8');
  const flags = fs.readFileSync(new URL('../src/data/feature-flags.js', import.meta.url), 'utf8');
  const start = app.indexOf('// ── The in-app interview asks (2026-11-25)');
  const block = app.slice(start, app.indexOf('const renderProFeatureList', start));
  const door = app.slice(app.indexOf('// ── The outcome from a link (2026-09-19)'), app.indexOf('// ── The goal from a link'));

  it('both flags ship OFF, read strictly through ftbFlag / fbFlag', () => {
    expect(FEEDBACK_PROMPT_FLAGS.least_ready).toBe('leastReadyAsk');
    expect(FEEDBACK_PROMPT_FLAGS.outcome_debrief).toBe('outcomeDebriefAsk');
    expect(flags).toMatch(/\n\s*leastReadyAsk: false,/);
    expect(flags).toMatch(/\n\s*outcomeDebriefAsk: false,/);
    expect(block).toContain("flagOn: ftbFlag('outcomeDebriefAsk')");
    expect(block).toContain("flagOn: fbFlag('least_ready')");
  });

  it('every hook of the block sits above the showAuth / dbReady early returns', () => {
    expect(start).toBeGreaterThan(0);
    const lastHook = start + block.lastIndexOf('useEffect(');
    expect(lastHook).toBeLessThan(app.indexOf('  if (showAuth) {'));
    expect(lastHook).toBeLessThan(app.indexOf('  if (!dbReady) return ('));
    expect(door).toContain('const outcomeLinkDebriefRef = useRef(null);');
  });

  it('every gate goes through the pure rules; the ask spends the session\'s one ask', () => {
    for (const fn of ['outcomeAskTrigger({', 'canShowOutcomeAsk({', 'outcomeAnswerEvent({', 'afterOutcome({', 'canShowDebrief({', 'canShowLeastReady({']) expect(block, fn).toContain(fn);
    const tryAsk = block.slice(block.indexOf('const tryOutcomeAsk'), block.indexOf('const answerOutcomeAsk'));
    expect(tryAsk).toMatch(/if \(!ok\) return false;[\s\S]*markPromptShown\([\s\S]*writeOutcomeAskRec\(\{ shownAt[\s\S]*outcome_ask_shown/);
    expect(tryAsk).toContain("trackActivationEvent('outcome_ask_shown', { surface, trigger });");
    expect(tryAsk).toContain('if (!surface || outcomeAsk || fbPrompt) return false;');
  });

  it('the answer writes the existing interview_outcome from the pure payload, nothing else', () => {
    const ans = block.slice(block.indexOf('const answerOutcomeAsk'), block.indexOf('const skipOutcomeAsk'));
    expect(ans).toContain("trackActivationEvent('interview_outcome', ev);");
    expect(ans).not.toMatch(/prepTarget\.date[^,)]*\}/); // the date never rides in an event
    expect(ans).toContain("offerAskSourceRef.current = 'outcome_in_app';");
    expect(ans).toContain('setOfferAskOpen(true);');
    expect(ans.indexOf("next === 'offer'")).toBeLessThan(ans.indexOf("next === 'debrief'"));
  });

  it('the ?outcome=failed door arms the debrief; it shows only after the session loads', () => {
    expect(door).toContain("if (outcome === 'failed') outcomeLinkDebriefRef.current = {");
    expect(door).not.toMatch(/fbShowPrompt\(/);
    expect(block).toContain("fbShowPrompt('outcome_debrief', 'outcome_link', null, pending);");
  });

  it('least_ready: results screen only on a first sitting, inline, above the review list', () => {
    expect(block).toContain('retry: !!retryMode,');
    const results = app.slice(app.indexOf('{/* Interview Results Modal */}'));
    const card = results.indexOf('data-testid="least-ready-results"');
    expect(card).toBeGreaterThan(0);
    expect(card).toBeLessThan(results.indexOf('Questions to Review ('));
    expect(card).toBeLessThan(results.indexOf("Retry Interview"));
  });

  it('leaving the screen that asked is a skip, told apart by via', () => {
    expect(block).toContain("if (fbPrompt.answered) setFbPrompt(null); else fbSkipPrompt('left');");
    expect(app).toContain("...(typeof via === 'string' ? { via } : {})");
  });

  it('the two mount points, one render function, the card is never a modal and never the accent', () => {
    expect(app.match(/\{renderInterviewAsks\('coach'\)\}/g) || []).toHaveLength(1);
    expect(app.match(/\{renderInterviewAsks\('interview_tab'\)\}/g) || []).toHaveLength(1);
    const render = block.slice(block.indexOf('const renderInterviewAsks'));
    expect(render).not.toMatch(/FFE34D|fixed inset-0|role="dialog"|aria-modal/i);
  });

  it('events carry no date: OUTCOME_ASK_KEY holds timestamps in the browser only', () => {
    expect(OUTCOME_ASK_KEY).toBe('sqlquest_outcome_ask_v1');
    const shown = block.match(/trackActivationEvent\('outcome_ask_(shown|skipped)', \{[^}]*\}/g) || [];
    expect(shown).toHaveLength(2);
    for (const s of shown) expect(s).not.toMatch(/date|At\b|iso/i);
  });
});
