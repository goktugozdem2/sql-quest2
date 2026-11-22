# Competitor facts on the comparison pages — audit, 2026-11-22

Agent C2 (AI visibility), cloud session. Purpose: every competitor fact on
`/best-sql-practice-sites/`, `/sql-practice-comparison/`, the `vs-*` pages,
`/datalemur-alternatives/` and `/stratascratch-alternatives/` checked against
a dated read, and every read older than 60 days re-fetched before a page
changes.

## What could be fetched today

**Nothing from this session.** Every competitor host failed DNS resolution
from the cloud container (`getaddrinfo ENOTFOUND`, the environment's network
allowlist): leetcode.com, www.hackerrank.com, www.interviewquery.com,
datalemur.com, platform.stratascratch.com, sqlpad.io, www.analystbuilder.com,
www.datainterview.com, pgexercises.com, www.thoughtspot.com, sqlzoo.net.
Plain `curl` failed the same way. No fact below comes from a search snippet
or from memory.

The one fresh source is `docs/reads/monetization-competitors-2026-11-22.md`,
read the same day on the vendors' own pricing pages from the laptop session:
**DataLemur** (unchanged since 2026-09-13) and **StrataScratch** (changed).
LeetCode answered 403 there too and is marked "not usable on pages" in it.

## Age of the newest read, per competitor

| Competitor | Newest read | Age on 2026-11-22 | Status |
|---|---|---|---|
| DataLemur | monetization-competitors-2026-11-22 | 0 days | fresh |
| StrataScratch | monetization-competitors-2026-11-22 | 0 days | fresh — **prices changed** |
| SQLBolt | sqlbolt-2026-11-19 | 3 days | fresh |
| LeetCode | alternatives-facts-2026-09-13 | 70 days | **stale, re-fetch blocked** |
| HackerRank | alternatives-facts-2026-09-13 | 70 days | **stale, re-fetch blocked** |
| SQLZoo | alternatives-facts-2026-09-13 | 70 days | stale, re-fetch blocked |
| Interview Query | alternatives-facts-2026-09-13 (no price ever read) | 70 days | stale, re-fetch blocked |
| SQLPad | alternatives-facts-2026-09-13 | 70 days | stale, re-fetch blocked |
| Analyst Builder | alternatives-facts-2026-09-13 | 70 days | stale, re-fetch blocked |
| DataInterview | alternatives-facts-2026-09-13 | 70 days | stale, re-fetch blocked |
| Mode / ThoughtSpot tutorial | alternatives-facts-2026-09-13 | 70 days | stale, re-fetch blocked |
| PostgreSQL Exercises | alternatives-facts-2026-09-13 | 70 days | stale, re-fetch blocked |

## StrataScratch — what changed (from monetization-competitors-2026-11-22)

| | 2026-09-13 read (and the pages' 2026-09-07 copy) | 2026-11-22 read |
|---|---|---|
| Monthly | $19/mo | **$24/mo** (1,000 AI credits/mo) |
| Yearly | $97.30/yr ("$8.11/mo", 30% off $139) | **$139/yr** ("$11.58/mo", "Save 52%") |
| Lifetime | $202.30 (30% off $289) | **$289**, banner "30% off Lifetime plans" with a code |
| Free | "$0", 50 AI credits/mo, "75+" coding questions | $0, no card, 50 AI credits/mo (question count not re-read) |
| Refund | 5-day money-back | 5-day money-back |
| Students | up to 20% off | up to 20% off |

Every page now quotes $24 / $139 / $289 "as listed 2026-11-22". The "75+"
free-question figure was not re-read, so it stays on the pages with its
2026-09-07 date.

## Fixed on the pages (all from a dated read)

1. **StrataScratch prices** on `/vs-stratascratch/`, `/sql-practice-comparison/`,
   `/best-sql-practice-sites/`, `/datalemur-alternatives/`,
   `/stratascratch-alternatives/` (the last two through
   `scripts/build-alternatives-pages.mjs`, whose tools now carry a `checked`
   date that names their read). The vs-stratascratch price FAQ said annual
   was "within $2 at StrataScratch's promo price"; it is now "SQL Quest is
   $40 cheaper annually, StrataScratch $5 cheaper monthly".
2. **"Verified provenance"** — removed from all four hand-written pages
   (about 25 places, JSON-LD and visible FAQ together). The 2026-09-13 read
   says: "Neither page explains how the attribution was verified, so a
   comparison page should not call anyone's tags 'verified'." Also removed:
   "there's high confidence it actually was" (DataLemur) and "the actual
   question Meta asked in 2024 … with high confidence" (StrataScratch). Now:
   "company-tagged", "a company on every question", and DataLemur's own
   words, "from companies like Facebook, Google, and Amazon".
3. **Codecademy Pro "~$25-40/mo"** on `/sql-practice-comparison/` — no read
   has ever held it; the price is removed, the product name stays.
4. **llms.txt** — the template claimed DataLemur, StrataScratch, HackerRank,
   LeetCode and SQLBolt have no AI coach, no hints and no adaptive feature
   ("No" in every row), that "every other SQL practice site on the internet
   just says Incorrect", and that StrataScratch "tells you incorrect without
   explanation". The 2026-09-13 read records StrataScratch's "AI chat
   assistant for hints and guidance", LeetCode's "Ask Leet", HackerRank's "AI
   Mock Interviewer", DataLemur's "Gimme a Hint". The grid and those
   sentences are gone; the section now states what the comparisons concede,
   from the reads, and links each comparison page with one line.

## Left as is, flagged for the laptop re-read

These facts are on the pages from the 2026-09-13 (or 2026-09-07) read and
could not be re-fetched. None is known to be wrong; each is older than 60
days.

- LeetCode Premium "$35/mo, $159/yr" (`/vs-leetcode-sql/` says "May 2026";
  `/best-sql-practice-sites/`, `/sql-practice-comparison/`, both
  alternatives pages). The 2026-11-22 read could not load LeetCode (403).
- LeetCode SQL 50 "free", HackerRank "free with an account", SQLPad,
  Analyst Builder, Interview Query, DataInterview, SQLZoo, Mode, pgexercises
  rows on the two alternatives pages.
- StrataScratch "75+" free questions, "1000+ coding questions".
- `/best-sql-practice-sites/` LeetCode "roughly 250 SQL problems" and
  `/sql-practice-comparison/` "~250+ SQL problems … Free tier ~50-80" — the
  2026-09-13 read counted 323 in the Database set, 105 of them free. Not changed here because
  the review block is scored prose and the count needs the vendor page.

**Next step (laptop, browser):** load the URLs listed in
`alternatives-facts-2026-09-13.md` §1–10b, write
`docs/reads/competitor-facts-<date>.md` with the same table shape, then bump
each tool's `checked` in `scripts/build-alternatives-pages.mjs` and add the
file to `READS`.
