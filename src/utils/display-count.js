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
