# Company pages and mocks: what is sourced, what is topic practice (2026-09-21)

Covers two ideas: "Company pages split: sourced format vs topic practice" and
"Company mocks section with only sourced mocks".

## Why
A candidate reads a company page to learn how *that* company interviews.
Of 30 company pages, 11 carry a dated source for the format (measured
2026-09-21, `data-provenance`); the other 19 are general practice on the
kind of data the company works with. Of the
10 mocks on the Interview tab, three are built from sources (Capital One
CodeSignal, Capital One Live SQL, Revolut); seven are generic — and one of
them is titled "FAANG-Style SQL Interview", which reads as company-specific
without a source behind it.

## Already shipped (partial)
- Every company page carries a provenance note under the hero
  (`provenanceBlock` in `scripts/build-company-pages.mjs`,
  `data-provenance="sourced|general"`).
- In the app, a company set says whether it was authored for the company or
  matched by topic (`companySetSourced` / `companySetMatched`), and the
  company-set gate only applies to authored sets (M1, amended 2026-09-20).

## Shipped 2026-09-21 (founder's additions)
- **Interview tab in two sections.** "Company mocks" lists only mocks marked
  `sourced: true` (Capital One ×2, Revolut); the other seven sit under
  "General practice — not modelled on any one company".
- **"FAANG-Style SQL Interview" → "Hard SQL Interview"**, company `General`.
- **"Top 10 Most-Asked SQL Questions" → "Ten Classic SQL Interview
  Patterns"**, company `General`. Its description had claimed "hundreds of
  interview reports from Meta, Google, Amazon, Netflix and Stripe"; no such
  source exists in `docs/reads/`. It now names the ten real patterns it holds
  and says it is general practice. The title's "Most-Asked" was the same
  unsourced frequency claim, so it went too. One question's
  "the single most common FAANG SQL pattern" became "a classic interview
  pattern" (EN and TR). The unused `interviewCategories` labels were fixed so
  they cannot bring the claims back.
- Guards: `tests/company-pages.test.js` — exactly the sourced mocks carry
  `sourced: true`; no unsourced mock names a big-tech company, "interview
  reports" or "most-asked" in its title, company or description (EN and TR);
  the tab renders the two sections from that flag.

## What is left
1. **Pages:** turn the note into structure — a "How the interview runs
   (sourced)" section only where sources exist, and a separately headed
   "Topic practice" section for the challenge list on every page.
2. ~~Interview tab: two sections~~ — shipped 2026-09-21, above.

## What it does not change
- No new format claim without a dated source (`tests/company-pages.test.js`).
- Company-page counts are bound by `tests/site-counts.test.js`; the build
  will force any count that moves.

## Claim (ledger-ready)
- **Metrics (exist):** `company_page_door`, `interview_prep_funnel` (split by
  company — never summed).
- **Expectation:** trust, not volume — the read is that door rates do not
  fall. This is a correctness change first.

## Status
PARTIAL — provenance and the Interview tab's two sections shipped; the
company pages' two-section structure is open.
