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

## Shipped 2026-09-29 (founder's go, backlog item #3)
- **Pages, two sections.** Every sourced page's format rows now sit under
  the heading **"How the interview runs (sourced)"** (`formatSection` on the
  seven template pages and the Amazon/Meta injections; the Revolut page's own
  rounds section was relabelled from "The Two SQL Rounds"). No general page
  carries the heading — it has nothing sourced to put there. Nothing new is
  claimed; the rows and `Sources:` lines are the ones that already existed.
- **"Topic practice" on every page** (`topicPracticeBlock` /
  `withTopicPractice` in `scripts/build-company-pages.mjs`, same
  `company-topics` markers as the old strip, now a headed `<section
  id="topic-practice">` right after the challenge cards): the full tagged
  question list, the skill drill links, and one sentence saying what the set
  is, in three honest versions —
  - signed archetype (Revolut; Capital One once its freeze lifts): the app's
    `companySetSourced` line + "In the app's Revolut set the first 3 are free
    to try." (companySetGate, live 2026-09-26);
  - sourced, not signed (the seven template pages, Amazon, Meta): the app's
    `companySetMatched` line, read from `src/utils/i18n.js`;
  - general (19 pages): "These are SQL Quest challenges tagged by topic from
    the 300+ bank, not modelled on {Company}'s interview — we have no dated
    public source for it, so this is general practice on the kind of data
    {Company} works with." The app's matched line says "topics candidates
    report for {company}", which a page that has just said it holds no source
    cannot repeat — the app copy for unsourced companies is a separate item.
- **Capital One is skipped** (`SKIP_UNTIL_READ` in the generator) and pinned
  to git HEAD + a content hash by `tests/company-sections.test.js` until the
  2026-10-12 read (docs/plans/capital-one-2026-10-12.md); the blog post too.
- Guards: `tests/company-sections.test.js` — exactly one "Topic practice"
  heading per page; the format heading only on `SOURCED_SLUGS`; the archetype
  sentence only on the signed pages; the sentence equals what the generator
  and the app's i18n say. Proven by five deliberate breaks (commit message).

## What is left
1. ~~Pages: two sections~~ — shipped 2026-09-29, above. Capital One joins on
   or after 2026-10-12: remove it from `SKIP_UNTIL_READ`, delete the frozen
   block in `tests/company-sections.test.js`, rerun the build chain.
2. ~~Interview tab: two sections~~ — shipped 2026-09-21, above.
3. The app's `companySetMatched` line ("topics candidates report for
   {company}") shows for every unsigned company, sourced or not; the pages
   now say "tagged by topic" where no source exists. Decide whether the app
   should split the same way.

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
SHIPPED 2026-09-29 for 29 of 30 pages — provenance, the Interview tab's two
sections, and the company pages' two-section structure. Capital One follows
after its 2026-10-12 read. Read: `company_page_door` does not fall.
