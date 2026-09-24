# SEO: authority, consistency, coverage (2026-09-22)

The founder's SEO read of 2026-09-22. Verdict: the content beats the
competition's and does not rank. The problem is not page quality; it is
authority, consistency and coverage.

## Where we stand (the read)
- "capital one sql interview": not in the first results — DataLemur, Exponent,
  InterviewQuery (two pages), Glassdoor, PracHub, linkjob rank.
- "revolut data analyst sql interview hackerrank": not present —
  InterviewQuery covers it with several role pages; interviewfox and
  finalroundai sit beside it.
- "sql interview practice with ai feedback": the homepage appears. We show
  up for the category, not for the company.
- Indexing is healthy (homepage, comparison pages, exercises, blog, CTE
  guide, interview hub).

## Done 2026-09-22 — consistency (items 1–5)
Body and link changes only; no titles, so the 2026-10-12 title read is not
disturbed.
1. **Homepage Capital One card** said "8 MCQ + 6 written SQL"; the mock is
   12 + 2 (70 min). Fixed, and both homepage mock cards are now bound to the
   mock data in `tests/site-counts.test.js` (mutation-checked).
2. **Counts.** The one live contradiction was vs-datalemur's meta description,
   "226-of-285" beside "226 of 299" in its body; the count sweep did not read
   the hyphenated form. Fixed, and every "N of M" / "N-of-M" free-share claim
   in any page — body, meta or JSON-LD — must now be the bank's own pair.
   "200+" and "12 Company-Specific Tracks" are not on any live page today
   (checked 2026-09-22 against every built page); if they still show in
   search, it is Google's cached copy and will refresh on recrawl.
   Two unsourced claims found beside them were rewritten: the hub's "curated
   based on analysis of real interview reports", and vs-datalemur's
   "patterned on real interviews" (19 of 30 company pages are general).
3. **The Turkish banner** is no longer in the English homepage's HTML. The
   geo script writes it only for a visitor from Türkiye; crawlers and
   everyone else get an empty placeholder.
4. **Unsourced frequency claims** — the same rule the mocks got on 09-21 —
   removed across the blog, the topic pages, the challenge text and the
   readiness test: "most-asked …", "by frequency", and invented rates
   ("~80% of mid-to-senior interviews", "70% of hard SQL interview questions at
   Meta, Google, Amazon", "34% of FAANG SQL questions", "About 90% of …",
   "Roughly 50–60% of …", "the #1 most-asked analytics question at Meta,
   Google, and Amazon"). Replacements say where a pattern sits ("classic",
   "core", "learn this first"), never a rate.
   **The FAANG guide's methodology described sources we cannot show** —
   Glassdoor/Blind cross-checks, a citation tracker, and "SQL Quest user
   surveys … about 40 responses". There were four subscribers and no survey.
   The section now says plainly what the guide is and is not, and that the
   earlier version was wrong. Its per-company format and topic claims were
   rewritten as general formats and as "each company's kind of data".
   Guard: `tests/seo-consistency.test.js`, over every page under `src/` and
   the product's challenge, mock and readiness text.
5. **One app URL.** `/app.html` already 308s to `/app/` (cleanUrls), and
   `/app/` carries the canonical and `noindex`. What was left: 93 links on
   40 pages pointed at the redirect. All now point at `/app/`; the guard
   fails on any new one.

## Item 6 — the open dataset (GitHub and Kaggle: published 2026-09-24)

**Kaggle, 2026-09-24**, from the founder's logged-in account:
https://www.kaggle.com/datasets/goktugozdem/card-transactions-synthetic-fraud-sql-practice
— public, CC0, the four CSVs, subtitle "200 accounts, 2,165 transactions,
planted fraud patterns for SQL practice", the README as description (links
to /fraud-analytics-sql/, the blog walkthrough and GitHub), tags SQL /
Finance / Banking / Tabular / Beginner. The GitHub README links it back.
Read in the weekly SEO file: referrals from kaggle.com and github.com.

**Published 2026-09-24 on the founder's go:**
https://github.com/goktugozdem2/card-transactions-sql-dataset — public,
CC0, homepage /fraud-analytics-sql/, topics sql / dataset / fraud-detection /
synthetic-data / sql-practice / csv / data-analytics. Re-scanned before
publishing: only reserved email domains (example.com, inbox.example,
mail.test) and RFC 5737 IPs. The blog post and the fraud landing link the
download; the blog's dataset sentence was corrected to the README's verified
counts (it said 2,000 transactions, "10+ txns in 5 min", "3-deep" chains).
Still owed: the fraud landing's "truth table" (10 fraud accounts, 3 geo
mismatches, amount ranges) has not been checked against the files — verify
before quoting it anywhere else. Kaggle needs the founder's account: upload
the same four CSVs + README and link the GitHub repo.

### Prepared 2026-09-22
`datasets/card-transactions/` — four CSVs (200 accounts, 25 merchants, 2,165
transactions, 76 chargebacks), README with verified counts, CC0 licence.
Regenerate with `node scripts/export-open-dataset.mjs`.
For publication the export remaps two things the app keeps as they are:
`inbox.dev` emails → `inbox.example` (`.dev` is a real TLD) and IPs → RFC 5737
documentation ranges, one-to-one.
**Publishing is the founder's step:** a public GitHub repo (the agent can
create it with `gh` on an explicit go) and a Kaggle dataset (needs the
founder's Kaggle account). The README links to sqlquest.app and the fraud
analytics post.

## Item 7 — the year in titles (after 2026-10-12)
Competitors put "2026" in titles; the Capital One page dates its body, not its
title. First change after the 10-12 title read, and only then — a title
change before it would confound the read.

## Item 8 — pattern pages (roadmap)
Folded into `pattern-seo-pages-2026-09-21.md`: the blog already covers NOT IN
with NULLs, WHERE vs ON, COUNT(*) vs COUNT(col). Each becomes a page for the
search as people type it ("not in null sql"), linked to the mock question
that tests it. AI2SQL opens pages on these searches.

## Item 9 — the live-round angle (roadmap)
A competitor writes that SQL rounds are becoming more conversational because
of AI assistants: the hard part moves to deciding what to compute and
defending it. The Live SQL Round mock and its "explain your approach" box
answer exactly that. One page that says so is an angle no competitor has.
Any claim about how rounds are changing needs a dated source in `docs/reads/`.

## Item 10 — the competitor map moved (roadmap)
interviewmaster.ai (voice AI interviewer) and sqlpad.io (AI mocks, 30 minutes
for $19.9) are the new group. The alternatives pages cover DataLemur and
StrataScratch. Rule stands: competitor facts only from a dated read — write
`docs/reads/competitors-<date>.md` first; the SQLPad row on the alternatives
pages is from an earlier read and predates its AI mock offer.

## The gate on new traffic
The homepage shows 1,195 active people in 30 days against 2 payments a month
— about two in a thousand. There is traffic; conversion is weak. The payment
path was fixed on 2026-09-20/21 (Stripe copy, currency note, webhook
lifecycle, Interview tab for everyone). Watch it for 2–3 weeks before
spending on new traffic; items 6–10 are cheap enough to prepare meanwhile.

## Order
1–5 done. 6 waits on the founder's publish step. 7 after 10-12. 8–10 roadmap.
