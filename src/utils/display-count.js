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

// Company practice sets: distinct company names tagged in challengeCompanies.
export function companySetCount(companyMap) {
  const names = new Set();
  for (const list of Object.values(companyMap || {})) {
    for (const n of Array.isArray(list) ? list : []) names.add(String(n).toLowerCase());
  }
  return names.size;
}
