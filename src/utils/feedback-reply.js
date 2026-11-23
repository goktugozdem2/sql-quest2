// The 💬 widget's reply expectation (E2, 2026-11-23).
//
// Measured before this: 8 real rows since July, 3 with a way to answer them,
// and nobody was told whether or when a reply would come. Two rules, both
// copy only — sending is never blocked:
//
//   1. A message sent WITH an email gets "Thanks — we read every message.
//      Any reply goes to the email you left." instead of the generic
//      thank-you. It promises no reply and no reply time, and it is not
//      signed by the founder (A1 REVISE on #241, 2026-11-24).
//   2. A message that looks like a question, with no email, shows one muted
//      line before sending: "Want a reply? Add your email above."
//
// Pure: no React, no storage. app.jsx's FeedbackWidget calls these.

// Opening words that make a message a question even without a "?".
// English and Turkish (the app's two languages). Lower-cased with the Turkish
// locale first, so "NASIL" and "Nasıl" both read as "nasıl"; "nasil" covers a
// keyboard without Turkish letters.
export const QUESTION_OPENERS = Object.freeze(['how', 'why', 'what', 'nasıl', 'nasil', 'neden']);

const OPENER_RE = new RegExp(`^(${QUESTION_OPENERS.join('|')})(?![a-zçğıöşü])`);

export function looksLikeQuestion(text) {
  const s = String(text || '').trim();
  if (!s) return false;
  if (s.includes('?')) return true;
  let lower;
  try { lower = s.toLocaleLowerCase('tr-TR'); } catch (_) { lower = s.toLowerCase(); }
  return OPENER_RE.test(lower);
}

// The contact field is free text (type=email, but nothing enforces it). Only
// something that can be mailed counts as "we can reply".
export function hasReplyEmail(contact) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(contact || '').trim());
}

// Rule 2: show the hint only for a question with no email in the field.
export function showReplyHint({ message, contact }) {
  return looksLikeQuestion(message) && !hasReplyEmail(contact);
}

// Rule 1: which confirmation the sent state shows.
export function sentConfirmationKind({ contact }) {
  return hasReplyEmail(contact) ? 'reply_by_email' : 'default';
}
