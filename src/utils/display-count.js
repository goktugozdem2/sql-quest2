import { FREE_SOLVE_QUOTA, COMPANY_SET_FREE_COUNT } from './free-tier-boundary.js';

// Marketing counts on in-app surfaces are shown rounded DOWN with a "+",
// never exact (founder, 2026-09-14): 285 challenges read "200+", 30 company
// sets read "30+". Rounding down keeps the claim true as the bank changes
// and stops a screen going stale the way the sign-in card's "80+" did.
export function roundDownCount(n, step) {
  const v = Number(n);
  const s = Number(step);
  if (!Number.isFinite(v) || !Number.isFinite(s) || s <= 0 || v < s) return null;
  return `${Math.floor(v / s) * s}+`;
}

// The size of the whole challenge bank, wherever it is said in a sentence —
// every static page, llms.txt, JSON-LD, meta/OG text, the generators, and the
// app's own marketing copy (founder, 2026-09-24: "299 soruysa rakamı yuvarla",
// round it; a rounded number is easier to take in). Floor to 50, never up:
// 304 → "300+", 349 → "300+", 350 → "350+". Fifty rather than the sign-in
// card's old hundred because at 299 the hundred-step said "200+", a third
// below the truth. ONE rule: scripts/build-*.mjs, build-llms-txt.js and
// app.jsx all call this, and tests/site-counts.test.js fails a page that
// states the exact total or any "N+" that is not this function's output.
// Exact counts stay exact where exactness is the point — a free count, the
// Easy/Medium/Hard split, a topic page's own population, a list's badge.
export const BANK_COUNT_STEP = 50;
export function bankCountLabel(n) {
  return roundDownCount(n, BANK_COUNT_STEP);
}

// Company practice sets: distinct company names tagged in challengeCompanies.
export function companySetCount(companyMap) {
  const names = new Set();
  for (const list of Object.values(companyMap || {})) {
    for (const n of Array.isArray(list) ? list : []) names.add(String(n).toLowerCase());
  }
  return names.size;
}

// ── What the free tier is, said one way (2026-09-26) ──────────────────────
// Under `freeQuota` there is no "N free challenges" any more: a free account
// gets FREE_SOLVE_QUOTA challenge solves (any Easy or Medium, or a Hard
// preview), and the lessons, warm-ups, the daily challenge, the Coach and the
// Skillmap stay free; a solved challenge stays open. Under `companySetGate`
// a signed company set (Capital One, Revolut) frees its first
// COMPANY_SET_FREE_COUNT in the company view. Both numbers live in
// src/utils/free-tier-boundary.js, the module the gates read; the generators
// and the app say them through these helpers, and tests/site-counts.test.js
// fails a page that states any other free count.

export { FREE_SOLVE_QUOTA, COMPANY_SET_FREE_COUNT };

/** "10 free challenge solves" */
export function freeSolvesLabel() {
  return `${FREE_SOLVE_QUOTA} free challenge solves`;
}

/** The whole free tier in one sentence, English: "10 free challenge solves, plus … — Pro opens all 300+." */
export function freeTierSentence(bankCount) {
  const bank = bankCountLabel(bankCount);
  return `${freeSolvesLabel()}, plus the lessons, warm-ups and the daily challenge${bank ? ` — Pro opens all ${bank}` : ''}.`;
}

/** The same sentence in Turkish. */
export function freeTierSentenceTr(bankCount) {
  const bank = bankCountLabel(bankCount);
  return `İlk ${FREE_SOLVE_QUOTA} challenge çözümü ücretsiz; dersler, ısınmalar ve günlük soru da ücretsiz${bank ? ` — Pro ${bank} sorunun tamamını açar` : ''}.`;
}
