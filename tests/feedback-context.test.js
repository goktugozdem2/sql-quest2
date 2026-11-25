// IR-2 (E2, 2026-11-23): the 💬 widget, opened on a challenge, attaches the
// challenge id, the last query (truncated) and the last diagnosis kind, and
// points at the tutor. Pure rules in src/utils/feedback-context.js; the
// wiring in app.jsx is pinned by source guards below.
import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import {
  FEEDBACK_QUERY_MAX, FEEDBACK_CONTEXT_I18N_KEYS,
  isChallengeScreen, truncateQuery, buildFeedbackChallengeContext, feedbackEventContext,
} from '../src/utils/feedback-context.js';
import { t, setLang } from '../src/utils/i18n.js';

const ON = { activeTab: 'quests', practiceSubTab: 'challenges', challenge: { id: 107 } };

describe('the challenge screen', () => {
  it('is the quests tab, the challenges sub-tab, a challenge, and no mock', () => {
    expect(isChallengeScreen(ON)).toBe(true);
    expect(isChallengeScreen({ ...ON, activeTab: 'guide' })).toBe(false);
    expect(isChallengeScreen({ ...ON, practiceSubTab: 'exercises' })).toBe(false);
    expect(isChallengeScreen({ ...ON, challenge: null })).toBe(false);
    expect(isChallengeScreen({ ...ON, challenge: {} })).toBe(false);
    expect(isChallengeScreen({ ...ON, inMock: true })).toBe(false);
    expect(isChallengeScreen()).toBe(false);
  });
});

describe('the query is truncated', () => {
  it('keeps a short query whole, trimmed', () => {
    expect(truncateQuery('  SELECT 1  ')).toEqual({ text: 'SELECT 1', truncated: false, length: 8 });
  });
  it('cuts at about 1,000 characters and says so', () => {
    expect(FEEDBACK_QUERY_MAX).toBe(1000);
    const long = 'SELECT ' + 'x, '.repeat(800);
    const r = truncateQuery(long);
    expect(r.text.length).toBe(1000);
    expect(r.truncated).toBe(true);
    expect(r.length).toBe(long.trim().length);
    expect(truncateQuery('a'.repeat(1000)).truncated).toBe(false);
    expect(truncateQuery('a'.repeat(1001)).truncated).toBe(true);
  });
  it('a missing or non-string query is empty, not a crash', () => {
    expect(truncateQuery(null)).toEqual({ text: '', truncated: false, length: 0 });
    expect(truncateQuery(42)).toEqual({ text: '', truncated: false, length: 0 });
  });
});

describe('what the row carries', () => {
  const base = { flagOn: true, ...ON, query: 'SELECT * FROM orders', diagnosis: { kind: 'row_set', headline: 'x' }, status: 'wrong' };
  it('on a challenge: id, query, diagnosis kind, status', () => {
    expect(buildFeedbackChallengeContext(base)).toEqual({
      challengeId: 107, challengeStatus: 'wrong', lastQuery: 'SELECT * FROM orders',
      queryTruncated: false, queryLength: 20, diagnosisKind: 'row_set',
    });
  });
  it('the query in the row is never longer than the cap', () => {
    const ctx = buildFeedbackChallengeContext({ ...base, query: 'S'.repeat(5000) });
    expect(ctx.lastQuery.length).toBe(FEEDBACK_QUERY_MAX);
    expect(ctx.queryTruncated).toBe(true);
    expect(ctx.queryLength).toBe(5000);
  });
  it('off a challenge screen, with the flag off, or in a mock: nothing', () => {
    expect(buildFeedbackChallengeContext({ ...base, activeTab: 'guide' })).toBe(null);
    expect(buildFeedbackChallengeContext({ ...base, practiceSubTab: 'speed-run' })).toBe(null);
    expect(buildFeedbackChallengeContext({ ...base, challenge: null })).toBe(null);
    expect(buildFeedbackChallengeContext({ ...base, inMock: true })).toBe(null);
    expect(buildFeedbackChallengeContext({ ...base, flagOn: false })).toBe(null);
    expect(buildFeedbackChallengeContext({ ...base, flagOn: 'true' })).toBe(null);
  });
  it('no diagnosis and no query yet: the id still lands', () => {
    const ctx = buildFeedbackChallengeContext({ ...base, query: '', diagnosis: null, status: null });
    expect(ctx).toMatchObject({ challengeId: 107, lastQuery: null, diagnosisKind: null, challengeStatus: null });
  });
  it('the event gets the id and the kind, never the query', () => {
    const ev = feedbackEventContext(buildFeedbackChallengeContext(base));
    expect(ev).toEqual({ challengeId: 107, diagnosisKind: 'row_set' });
    expect(feedbackEventContext(null)).toEqual({ challengeId: null, diagnosisKind: null });
  });
});

describe('copy: English and Turkish', () => {
  afterAll(() => setLang('en'));
  const read = (lang) => { setLang(lang); return FEEDBACK_CONTEXT_I18N_KEYS.map(k => t('feedback', k)).join(''); };
  it('every key exists in both languages', () => {
    for (const lang of ['en', 'tr']) {
      setLang(lang);
      for (const k of FEEDBACK_CONTEXT_I18N_KEYS) expect(t('feedback', k), `${lang}.${k}`).not.toBe(k);
    }
  });
  it('the line reads as the founder wrote it, in both languages', () => {
    expect(read('en')).toBe('This box goes to the founder. For help with this query, the tutor answers right now.');
    expect(read('tr')).toBe('Bu kutu kurucuya gider. Bu sorguyla ilgili yardım için tutor hemen cevap verir.');
  });
});

describe('the app wiring (source guards)', () => {
  const app = fs.readFileSync(new URL('../src/app.jsx', import.meta.url), 'utf8');
  const flags = fs.readFileSync(new URL('../src/data/feature-flags.js', import.meta.url), 'utf8');
  const widgetStart = app.indexOf('function FeedbackWidget(');
  const widget = app.slice(widgetStart, app.indexOf('function ReviewAskCard', widgetStart));
  const ctxStart = app.indexOf('const feedbackChallengeCtxNow = () => buildFeedbackChallengeContext({');
  const ctxFn = app.slice(ctxStart, app.indexOf('});', ctxStart));
  const submitStart = app.indexOf('const submitFeedback = async (');
  const submit = app.slice(submitStart, app.indexOf('// Pro modal analytics', submitStart));
  const redirectStart = app.indexOf('const openTutorFromFeedback = () => {');
  const redirect = app.slice(redirectStart, app.indexOf('const sendInlineAiMessage = async', redirectStart));

  it('the flag is ON and read strictly through ftbFlag', () => {
    expect(flags).toMatch(/\n\s*feedbackContext: true,/);
    expect(ctxFn).toContain("flagOn: ftbFlag('feedbackContext'),");
  });

  it('context is built from the on-screen challenge state only', () => {
    expect(ctxStart).toBeGreaterThan(0);
    for (const k of ['activeTab,', 'practiceSubTab,', 'challenge: currentChallenge,', 'inMock: !!activeInterview,', 'query: challengeQuery,', 'diagnosis: challengeDiagnosis,']) {
      expect(ctxFn, k).toContain(k);
    }
  });

  it('the row gets it in the existing context column, only for the widget itself', () => {
    expect(submit).toContain("const fbChallengeCtx = (kind || 'open') === 'open' ? feedbackChallengeCtxNow() : null;");
    const context = submit.slice(submit.indexOf('context: {'), submit.indexOf('created_at:'));
    expect(context).toContain('...(fbChallengeCtx || {}),');
    // No migration: the context is in the jsonb column, not a new one.
    expect(submit).not.toMatch(/\n\s*challenge_id:|\n\s*last_query:/);
  });

  it('feedback_submitted carries the id, never the query', () => {
    const ev = submit.slice(submit.indexOf("trackActivationEvent('feedback_submitted'"), submit.indexOf('return true;'));
    expect(ev).toContain('...feedbackEventContext(fbChallengeCtx),');
    expect(ev).not.toMatch(/lastQuery|challengeQuery/);
  });

  it('the tutor line renders only when the widget is open on a challenge', () => {
    expect(app).toContain('tutorLine={showFeedback && !!feedbackChallengeCtxNow()}');
    expect(app).toContain('onTutor={openTutorFromFeedback}');
    expect(widget).toContain('{tutorLine && onTutor && (');
    // Above the textarea.
    expect(widget.indexOf('data-testid="feedback-tutor-line"')).toBeLessThan(widget.indexOf('<textarea'));
    for (const k of FEEDBACK_CONTEXT_I18N_KEYS) expect(widget).toContain(`i18n_t('feedback', '${k}')`);
  });

  it('the line never uses the accent', () => {
    const line = widget.slice(widget.indexOf('{tutorLine && onTutor && ('), widget.indexOf('<textarea'));
    expect(line.length).toBeGreaterThan(100);
    expect(line).not.toMatch(/FFE34D|F5C518|yellow|accent/i);
  });

  it('the link opens the existing inline Help and fires feedback_tutor_redirect', () => {
    expect(redirectStart).toBeGreaterThan(app.indexOf('const openInlineAiHelp = (challenge, userQuery) => {'));
    expect(redirect).toContain("trackActivationEvent('feedback_tutor_redirect', {");
    expect(redirect).toContain('setShowFeedback(false);');
    expect(redirect).toContain('openInlineAiHelp(currentChallenge, challengeQuery);');
  });

  it('no new hook: the widget keeps its hooks above its early return, the app above showAuth / dbReady', () => {
    const early = widget.indexOf('if (!open) {');
    expect(early).toBeGreaterThan(0);
    const after = widget.slice(early);
    expect(after).not.toMatch(/React\.use[A-Z]|\buse(State|Effect|Ref|Memo|Callback)\(/);
    // The app-level pieces are plain functions; if one ever becomes a hook it
    // must sit above the early returns.
    expect(ctxFn).not.toMatch(/\buse(State|Effect|Ref|Memo|Callback)\(/);
    expect(redirect).not.toMatch(/\buse(State|Effect|Ref|Memo|Callback)\(/);
    expect(ctxStart).toBeLessThan(app.indexOf('  if (showAuth) {'));
    expect(ctxStart).toBeLessThan(app.indexOf('  if (!dbReady) return ('));
    expect(redirectStart).toBeLessThan(app.indexOf('  if (showAuth) {'));
  });
});
