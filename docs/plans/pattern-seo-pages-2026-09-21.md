# Pattern pages for search: fan-out join, NOT IN with NULL, date boundary, average of averages (2026-09-21)

## Why
These four are the mistakes interviews are built to catch, and people search
for them by the symptom ("NOT IN returns no rows", "join doubles my sum").
We already own the explanations: each is a named diagnosis or a Capital One
MCQ — fan-out (Q11's reference fix), NOT IN over NULLs (c1-m9),
bare-date upper bound (`dateUpperBoundTrap` in `diagnose.js`), average of
averages (c1-m11).

## What it is
- One page per pattern: the symptom in the searcher's words, a tiny dataset,
  the wrong query and what it returns, why, the fix, and links to the
  challenges and question pages that exercise it.
- Generated, like the question and topic pages, so counts and links cannot
  drift.

## Rules that apply
- Ship with internal links in the same commit (homepage footer + the
  relevant hub) — an orphan page does not get crawled (the fintech-pages
  lesson).
- Never publish a challenge's reference solution on these pages
  (`tests/question-pages.test.js` rule).
- Request indexing on Bing (100/day) and Google (~10/day); run
  `npm run indexnow`.

## Claim (ledger-ready)
- **Metrics (exist):** `seo_page_funnel`, `question_page_door`; Bing first
  (memory: Bing is the real channel).
- Grow/prune rules already written: `seo-measurement-2026-09-13.md`.

## Status
OPEN.
