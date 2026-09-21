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

## What is left
1. **Pages:** turn the note into structure — a "How the interview runs
   (sourced)" section only where sources exist, and a separately headed
   "Topic practice" section for the challenge list on every page.
2. **Interview tab:** two sections. "Company mocks" lists only mocks built
   from dated sources. "Practice mocks" lists the rest, and their titles stop
   naming companies they are not sourced from (rename "FAANG-Style").

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
PARTIAL — provenance shipped; the two-section structure is open.
