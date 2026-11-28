// The 💬 widget's reply expectation (E2, 2026-11-23): a reply promise when an
// email came with the message, one muted line when a question came without
// one. Pure rules in src/utils/feedback-reply.js; the widget is pinned by
// source guards below.
import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import {
  QUESTION_OPENERS, looksLikeQuestion, hasReplyEmail, showReplyHint, sentConfirmationKind,
} from '../src/utils/feedback-reply.js';
import { t, setLang } from '../src/utils/i18n.js';

describe('what counts as a question', () => {
  it('a "?" anywhere', () => {
    expect(looksLikeQuestion('the date filter drops a day?')).toBe(true);
    expect(looksLikeQuestion('Is there a refund policy? thanks')).toBe(true);
  });
  it('an opening how / why / what / nasıl / neden, in any case', () => {
    expect(QUESTION_OPENERS).toEqual(['how', 'why', 'what', 'nasıl', 'nasil', 'neden']);
    for (const m of ['How do I reset my streak', 'why is 91 marked wrong', 'WHAT does Pro add',
      'nasıl iptal ederim', 'Nasıl iptal ederim', 'NASIL iptal ederim', 'nasil iptal ederim', 'Neden yanlış', '  what now']) {
      expect(looksLikeQuestion(m), m).toBe(true);
    }
  });
  it('not a statement, and not a word that only starts like an opener', () => {
    for (const m of ['', '   ', null, 'Great app', 'The query works', 'whatever, it is fine', 'Howard here', 'Whyte', 'nasılsa çözdüm']) {
      expect(looksLikeQuestion(m), String(m)).toBe(false);
    }
  });
});

describe('what counts as an email', () => {
  it('something mailable, trimmed', () => {
    expect(hasReplyEmail('  ada@example.org ')).toBe(true);
    expect(hasReplyEmail('ada@example')).toBe(false);
    expect(hasReplyEmail('ada')).toBe(false);
    expect(hasReplyEmail('')).toBe(false);
    expect(hasReplyEmail(null)).toBe(false);
  });
});

describe('the two rules', () => {
  it('the hint shows for a question with no email, and only then', () => {
    expect(showReplyHint({ message: 'how do I cancel', contact: '' })).toBe(true);
    expect(showReplyHint({ message: 'how do I cancel', contact: 'not an email' })).toBe(true);
    expect(showReplyHint({ message: 'how do I cancel', contact: 'ada@example.org' })).toBe(false);
    expect(showReplyHint({ message: 'love it', contact: '' })).toBe(false);
  });
  it('the reply-by-email line needs an email in the contact field', () => {
    expect(sentConfirmationKind({ contact: 'ada@example.org' })).toBe('reply_by_email');
    expect(sentConfirmationKind({ contact: '' })).toBe('default');
    expect(sentConfirmationKind({ contact: '@ada' })).toBe('default');
  });
});

describe('copy: English and Turkish', () => {
  afterAll(() => setLang('en'));
  // A1 REVISE on #241 (2026-11-24): the thank-you promised "I reply within
  // one working day. — Göktuğ", a service commitment in the founder's name
  // that nobody had agreed to. It now says only where a reply would go.
  it('the thank-you says where a reply would go; the hint points at the email field', () => {
    setLang('en');
    expect(t('feedback', 'thanksReply')).toBe('Thanks — we read every message. Any reply goes to the email you left.');
    expect(t('feedback', 'replyHint')).toBe('Want a reply? Add your email above.');
    setLang('tr');
    expect(t('feedback', 'thanksReply')).toMatch(/e-posta/i);
    expect(t('feedback', 'thanksReply')).not.toBe('Thanks — we read every message. Any reply goes to the email you left.');
    expect(t('feedback', 'replyHint')).toMatch(/e-posta/i);
    expect(t('feedback', 'replyHint')).not.toBe('Want a reply? Add your email above.');
  });
  it('promises no reply time and is not signed by a person, in either language', () => {
    for (const lang of ['en', 'tr']) {
      setLang(lang);
      const line = t('feedback', 'thanksReply');
      expect(line).not.toMatch(/working day|business day|\bhours?\b|within|iş günü|saat|içinde/i);
      expect(line).not.toMatch(/Göktuğ|Goktug|founder|kurucu/i);
      expect(line).not.toMatch(/\bI reply\b|\bI'll\b|yazarım/);
    }
  });
});

describe('the widget wiring (source guards)', () => {
  const app = fs.readFileSync(new URL('../src/app.jsx', import.meta.url), 'utf8');
  const wStart = app.indexOf('function FeedbackWidget(');
  const widget = app.slice(wStart, app.indexOf('function ReviewAskCard(', wStart));
  const hint = widget.slice(widget.indexOf('{showReplyHint({ message, contact }) && ('), widget.indexOf('data-testid="feedback-reply-hint"') + 120);
  const sendFn = widget.slice(widget.indexOf('const send = async () => {'), widget.indexOf('// z-[10001]'));

  it('the hint renders below the email field it points at ("above")', () => {
    const email = widget.indexOf("placeholder={i18n_t('feedback', 'emailPlaceholder')}");
    const hintAt = widget.indexOf('data-testid="feedback-reply-hint"');
    expect(email).toBeGreaterThan(0);
    expect(hintAt).toBeGreaterThan(email);
    expect(hintAt).toBeLessThan(widget.indexOf('data-testid="feedback-quote-consent"'));
    expect(hint).toContain("i18n_t('feedback', 'replyHint')");
  });

  it('the hint never blocks Send and never uses the accent', () => {
    expect(widget).toContain("disabled={!message.trim() || state === 'sending'}");
    expect(widget).not.toMatch(/disabled=\{[^}]*showReplyHint/);
    expect(sendFn).not.toMatch(/if \([^)]*showReplyHint[^)]*\) return/);
    expect(hint).not.toMatch(/FFE34D|F5C518/i);
    expect(hint).toContain("color: '#8A8E99'");
  });

  it('the sent state shows the reply-by-email line only when the message went with an email', () => {
    expect(sendFn).toContain('const replyKind = sentConfirmationKind({ contact });');
    // decided before the field is cleared
    expect(sendFn.indexOf('const replyKind')).toBeLessThan(sendFn.indexOf("setContact('')"));
    expect(sendFn).toContain('setSentKind(replyKind);');
    expect(widget).toMatch(/sentKind === 'reply_by_email' \? \(\s*<p[^>]*data-testid="feedback-thanks-reply">\{i18n_t\('feedback', 'thanksReply'\)\}/);
  });

  it('the row and feedback_submitted say whether it read as a question and whether the hint showed', () => {
    expect(sendFn).toContain('questionLike: looksLikeQuestion(body),');
    expect(sendFn).toContain('replyHintShown: showReplyHint({ message: body, contact }),');
    const submitStart = app.indexOf('const submitFeedback = async ({');
    const submit = app.slice(submitStart, app.indexOf("trackActivationEvent('feedback_failed'", submitStart));
    expect(submit).toContain('questionLike = null, replyHintShown = null }) => {');
    expect(submit.split("questionLike: typeof questionLike === 'boolean' ? questionLike : null,").length - 1).toBe(2);
    const ev = submit.slice(submit.indexOf("trackActivationEvent('feedback_submitted'"));
    expect(ev).toContain('gaveContact: !!contact,');
    expect(ev).toContain("questionLike: typeof questionLike === 'boolean'");
  });
});
