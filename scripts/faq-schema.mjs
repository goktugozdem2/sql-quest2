// FAQPage structured data must describe questions that are actually on the page.
//
// WHY THIS EXISTS (2026-09-08)
//
// Google's FAQPage guidance is explicit: the marked-up question and answer
// content must be visible to the user on the source page. Marking up Q&A that
// appears nowhere is grounds for losing rich results, and — more to the point
// for us — it is the copy an AI assistant reads. Perplexity quoted llms.txt
// back verbatim on 2026-09-06; JSON-LD is read the same way. A page whose
// schema answers questions the page does not contain is a page telling
// assistants something we never wrote.
//
// Found while fixing the two Turkish posts: their JSON-LD FAQ and their
// visible FAQ were entirely DIFFERENT question sets. The survey that followed
// found 103 such questions across 24 pages, the worst of them being the
// homepage, which declares nine.
//
// WHAT COUNTS AS "ON THE PAGE". Only the ld+json blocks are stripped before
// searching. Everything else counts — including a JS template that renders the
// FAQ client-side, which is how the 23 company pages do it (their questions
// live in a `const FQ` array). Google renders JS before indexing, so those are
// genuinely present and must not be flagged; an earlier draft of this check
// stripped all <script> and produced 345 false positives.

import fs from 'fs';
import path from 'path';

export const FAQ_DIRS = ['src', 'src/blog', 'src/challenges'];

const LD_BLOCK = /<script[^>]*type=["']application\/ld\+json["'][\s\S]*?<\/script>/gi;
const QUESTION = /"@type"\s*:\s*"Question"\s*,\s*"name"\s*:\s*"((?:[^"\\]|\\.)*)"/g;

/** Lowercase, drop everything that is not a letter or digit, collapse spaces.
 *  Unicode-aware so Turkish (ı, ş, ğ, ö, ü, ç) compares correctly. */
export const normalise = s => String(s).toLowerCase().normalize('NFC')
  .replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();

export function htmlPages(root) {
  const out = [];
  for (const dir of FAQ_DIRS) {
    const abs = path.join(root, dir);
    if (!fs.existsSync(abs)) continue;
    for (const f of fs.readdirSync(abs)) if (f.endsWith('.html')) out.push(`${dir}/${f}`);
  }
  return out.sort();
}

/** The question names a page's FAQPage schema declares. */
export function schemaQuestions(html) {
  const out = [];
  for (const block of html.matchAll(LD_BLOCK)) {
    for (const m of block[0].matchAll(QUESTION)) {
      out.push(m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
    }
  }
  return out;
}

/** The page with its structured data and comments removed. */
export function pageBody(html) {
  return html.replace(LD_BLOCK, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
}

/** [{ page, question }] for every schema question absent from the page. */
export function findViolations(root) {
  const rows = [];
  for (const page of htmlPages(root)) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    const questions = schemaQuestions(html);
    if (!questions.length) continue;
    const body = normalise(pageBody(html));
    for (const q of questions) if (!body.includes(normalise(q))) rows.push({ page, question: q });
  }
  return rows;
}

export const keyOf = v => `${v.page}\t${v.question}`;

export function readBaseline(root) {
  const file = path.join(root, 'scripts', 'faq-schema-baseline.txt');
  if (!fs.existsSync(file)) return new Set();
  return new Set(
    fs.readFileSync(file, 'utf8').split('\n')
      .map(l => l.replace(/\r$/, ''))
      .filter(l => l && !l.startsWith('#')),
  );
}
