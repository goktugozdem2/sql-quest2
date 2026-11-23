# Competitor and market watch — 2026-11-23 (B6, run 2)

Agent B6, cloud session. Run 1 (`docs/reads/competitors-2026-11-22.md`, PR
#179, not merged at the time of this read) covered nine competitors broadly.
Run 2 rotates to the three run 1 covered least: **Prepfully** (deep dive; it
holds the Monzo SERP), **Big Tech Interviews** and **LearnSQL.com** (never
read). It also re-checks the Interview Query Capital One guide, because the
Capital One assessment query is our #1 routed item and IQ moved there.

Docs only. No page changes here.

## How this was read

- Pages fetched through the Apify web-fetch connector on **2026-11-23,
  06:52–06:53 UTC**, public pages only, no login. Every fetch returned 200
  except one LearnSQL URL that is a real 404 (the course slug does not
  exist). **No 403 or 429 was met**, so the R1 rule (a refusal is final for
  the run) did not come into play. No site was fetched twice through
  different tools.
- SERP notes: the session's WebSearch tool (US engine, not Google). Order is
  indicative, never a Google rank.
- Sentiment: search titles and summaries only. No usernames, no quotes.
- Glassdoor, Blind and 1point3acres appear only as SERP shape. They are not
  page facts.

---

## 1. What changed since run 1, per competitor

### Interview Query — the Capital One DA guide moved and got an AI mock (biggest change)

| Fact | Source, read 2026-11-23 |
|---|---|
| New URL shape `/guides/<company>-<role>` (run 1 cited the `/interview-guides/capital-one` hub, published 2026-03-17) | [interviewquery.com/guides/capital-one-data-analyst](https://www.interviewquery.com/guides/capital-one-data-analyst), 200 |
| Title "Capital One Data Analyst Interview Guide 2026: Process & Questions"; meta names "the CodeSignal Excel and SQL assessment" | same page, `<title>` and meta description |
| "30 candidate reports · 29 practice questions · Updated 6 days ago (Nov 16, 2026)"; JSON-LD `dateModified` 2026-11-16 | same page |
| **"Practice this interview with AI"** button → `/ai-mock-interview?guide=capital-one-data-analyst`, placed above the fold and again in the process section | same page |
| Report list shows Q4 2024 → Q3 2026 entries, each with role, quarter and outcome; 22 more behind "Share your experience or subscribe" | same page |
| Topic mix it states: SQL 25%, Business case 20%, Analytics 15%, Behavioral 15%, Data viz 10%, Probability 10%, Product sense 5% | same page |
| FAQPage JSON-LD (process, rounds = 4, length = 6 weeks) | same page |
| The SERP for "capital one codesignal data analyst assessment" now shows this `/guides/` URL **twice** (plain and `?exp_page=1`) plus the older `/interview-guides/Capital-One-Data-Analyst` | WebSearch, 2026-11-23 |
| Same `/guides/` shape for Revolut DA (`?exp_page=1..3` paginated) | WebSearch "Revolut sql interview questions", 2026-11-23 |

What this means: on our best payer query, IQ now offers a dated,
report-backed page **and** an AI mock of the interview. Run 1 said "nobody
offers a timed rehearsal of the reported shape". That is still true for a
*timed, scored, assessment-shaped* SQL + data mock, but IQ's AI mock is now
one click from the top result. Our edge has to be stated as the specific
thing: 70 minutes, 14 questions, the reported format, on card and
transaction data.

### Prepfully (deep dive)

| Fact | Source, read 2026-11-23 |
|---|---|
| Positioning: "Aiming for a $300k–$800k+ tech offer?"; coaching marketplace first, question banks and guides second | [prepfully.com](https://prepfully.com/), 200 |
| "20K+ Sessions Completed", "4.8 Rating on Trustpilot", "2028+ Verified Coaches", "15K+ Candidates", "2028 coaches across 1661 companies", "20533 coaching sessions completed" | same |
| Coaching price is per session, set by coach. On the Meta DA coaches page: ten listings from **$99 to $279** a session (struck prices $119–$349), "First Session, $20 off" or "New Coach, $70 off", bulk discounts "Upto 6–17% Off". Banner: "Coach availability may be limited due to the holiday weekend" | [prepfully.com/coaches/meta/data-analyst](https://prepfully.com/coaches/meta/data-analyst), 200 |
| Question bank pages are **paginated and indexable per page**: title "All Monzo DS interview questions - 2026 - 71 to 80 of 253 (Page 8)"; "submitted by recent Monzo Data Scientist candidates … verified by Data Scientists at Monzo". The static render shows no question text, only the frame and links to unrelated guides | [prepfully.com/interview-questions/monzo/data-scientist?page=8](https://prepfully.com/interview-questions/monzo/data-scientist?page=8), 200 |
| New AI layer: "Your AI Wingman", "Interview Answer Review tooling … Company rubrics … Trained on 1mil+ answers" | same page header |
| No SQL practice environment, no runnable questions, no data-analyst Monzo set seen | the three pages above |

Read: Prepfully wins Monzo by **volume of paginated URLs** (the Monzo SERP
lists `?page=14`, `?page=45`, `?page=107`, `?page=130` …), not by SQL depth.
It is a coaching marketplace; a person who lands there for SQL finds no place
to run a query. Its price point ($99–$279 a session) makes our $29/month a
different category, not a competitor on price.

### Big Tech Interviews (first read)

| Fact | Source, read 2026-11-23 |
|---|---|
| "Master your SQL Interview"; "We've reviewed over 50,000 interviews"; "100+ Hand-Picked SQL Interview Questions", "100+ Step-by-Step Video Explanations", peer mocks, "Live Instructor Support" | [bigtechinterviews.com](https://bigtechinterviews.com/), 200; page `dateModified` 2026-01-25 |
| **Essentials $29.99/mo billed yearly at $359.99; Premium $79.99/mo billed yearly at $949.99.** Premium adds 1:1 SQL coaching and a resume makeover; peer mocks "up to 4 matches per month"; weekly email check-ins | [app.bigtechinterviews.com/premium](https://app.bigtechinterviews.com/premium), 200 (rendered). Monthly toggle not read |
| Blog guides: Amazon BA, Google DA, Amazon DS, "33 Must-Know Data Analyst SQL Interview Questions", window functions, CTEs, CASE WHEN, joins (titles say "2025") | homepage article list |
| Homepage footer carries an unrelated outbound link block (an astrology site in several languages) | homepage |

Read: small, older, video-first, and priced **above** us on annual
($359.99/yr vs our $99/yr). No AI, no company mock, no fintech. Not a
threat on our doors; useful only as a price anchor for B4.

### LearnSQL.com (first read)

| Fact | Source, read 2026-11-23 |
|---|---|
| Pricing is one-time, no subscription: **Individual course $39 lifetime; "All Forever" $599 lifetime, "all 82 present and future courses"**; free plan opens the free part of every course; no card for the free plan; B2B and student offers | [learnsql.com/pricing](https://learnsql.com/pricing/), 200 |
| LearnSQL's own blog post is **#1** for "sql practice questions" in today's result list, and a second LearnSQL post (functions practice) is #4 | WebSearch 2026-11-23 |
| `/course/sql-interview-questions/` is a 404; no interview course at that slug | [learnsql.com/course/sql-interview-questions/](https://learnsql.com/course/sql-interview-questions/), 404 |

Read: LearnSQL owns the generic practice query through blog posts and sells
courses, not interview prep. Its **one free course a month** play (seen in a
search summary, not fetched) is its acquisition engine.

### Not re-read today (run 1 is current)

DataLemur, StrataScratch, LeetCode, HackerRank, PracHub, Aced, Dataford,
letsdatascience. Next rotation: HackerRank's candidate side (cookie wall in
run 1), DataCamp, Codecademy, Mode.

---

## 2. SERP notes (WebSearch, US, 2026-11-23)

`sqlquest.app` appeared in **none** of the six lists, same as run 1.

| Query | Leaders today | Change vs run 1 (11-22) |
|---|---|---|
| capital one codesignal data analyst assessment | Blind ×4, Glassdoor ×9, **IQ `/guides/capital-one-data-analyst` ×2 + `/interview-guides/Capital-One-Data-Analyst`**, 1point3acres ×2, **quantvault.org** (new; describes a 4-question general coding assessment, conflicts with the DA reports) | IQ gained a second URL on the query with a page updated 11-16; Dataford's guide not in today's list; quantvault is new |
| Revolut sql interview questions | Glassdoor ×8, **IQ `/guides/revolut-data-analyst` ×4 (paginated)**, IQ DE guide ×2, the older IQ `/interview-guides/` DA page, **PracHub ×2** (both four-question SQL round reports), AmbitionBox | IQ switched to the new `/guides/` shape and takes four slots through pagination |
| Monzo sql interview questions | **Prepfully ×6 (paginated)**, Glassdoor ×6, interviewpal, **Monzo blog ×2** (analytics engineering, credit), Exponent | Prepfully up from 5 to 6 slots; no SQL practice platform |
| Wise sql interview questions data analyst | Glassdoor ×10, Indeed ×2, IQ "Wise Skulls", DataLemur WiseTech, Coursera, Dataquest, IQ TransferWise DS | Unchanged: no page about Wise's SQL screen ranks |
| sql practice questions | **LearnSQL blog #1 and #4**, archive.org PDF, LinkedIn Learning, Scribd, GitHub gist, DataCamp blog, W3Schools, UBC PDF, Exponent lesson, CodeSignal | Same editorial shape; LearnSQL leads |
| bigtechinterviews SQL questions | BTI appears only via its Medium posts; its own site not in the list | n/a (first read) |

**Pattern change.** IQ is scaling a **paginated, report-backed `/guides/`
template** with an AI mock button across company × role, and Prepfully
scales by paginating question banks. Both win fintech queries by URL count.
Our company pages are one URL each. We should not copy pagination. The
counter is depth on the one URL plus the interactive thing they lack: a
runnable, timed, company-shaped SQL mock.

---

## 3. What users say (search titles and summaries only)

New this run:
- **Capital One candidates** (reports aggregated on IQ's page, Q2–Q3 2026):
  the online assessment is spreadsheet-heavy; joining several CSVs and
  computing rates fast is the bottleneck, not SQL syntax; the take-home runs
  7–10 days and some report a Google Sheets interface; prep material
  under-shoots the real test. Pattern: **"I practised SQL; the test was
  data wrangling under a clock."**
- **Wise candidates** (Glassdoor snippets): live SQL in a shared doc, three
  to four questions; a HackerRank SQL test for product analysts. Unchanged
  from run 1, still not fetched.
- **Monzo** (Glassdoor snippets, Monzo blog): SQL live debugging; dbt and
  BigQuery modelling for analytics engineering. Monzo's own blog is the only
  first-party source and we already cite it.
- **Prepfully praise** (its own Trustpilot claim, not independently read):
  coaches from the target company. Complaint pattern in search results:
  price per session.
- **Big Tech Interviews**: praise is video explanations; no independent
  review surfaced.

Repeated from run 1, still true: paywalled solutions are the top complaint
across the set.

---

## 4. Progress on run 1's routed items (BACKLOG, PR #179)

PR #179 is not merged, so its BACKLOG section is not on `main` yet. Progress
seen on `main` between 11-22 and 11-23:

| # | Run 1 item | Lane | State on 2026-11-23 |
|---|---|---|---|
| 1 | Capital One assessment block on the blog guide | C5 | **Input ready, page unchanged.** R1's dossier `docs/reads/companies/capital-one.md` merged (#189). Today's read adds IQ's 11-16 guide and its AI mock (item N1 below). |
| 2 | Wise sourced format + 4-question / 60-minute set | C5 (+B3) | **Input ready, page unchanged.** `docs/reads/companies/wise.md` merged (#189). SERP still empty today. |
| 3 | 301 `sql-quest2.vercel.app` → `sqlquest.app` | C1 | **Open.** `vercel.json` has no host rule; `src/data/config.js` still names the vercel.app host as Auth Site URL. Vercel config work on 11-22 (#180, #204) was build-budget only. |
| 4 | Drop the AI-coach exclusivity on comparison pages | C2 | **Open, and more urgent.** `src/best-sql-practice-sites.html` lines 102 and 635 still say "the only platform reviewed with a wrong-answer diagnostic, an AI Coach and …". Today IQ ships an AI mock on the Capital One guide and Prepfully ships an "AI Wingman". |
| 5 | Revolut: cite the PracHub reports, mock above the fold | C5 | **In progress.** `docs/reads/companies/revolut.md` merged (#189); a branch `content/revenue-revolut-guide` was opened. Not merged. |
| 6 | Monzo: question 1 + readiness above the fold | C5 / C1 | **Open.** Prepfully went from 5 to 6 slots on the query (§2). |
| 7 | Price landscape for B4 | B4 | **Added to.** BTI and LearnSQL prices below (N4). |
| 8 | Say what a free account gets after a wrong answer | C2 / C5 | Open. |
| 9 | Cohort retention + funnel topic funnel | C6 | Open. |
| 10 | Mock follow-up question | backlog | Open. IQ's AI mock makes it more relevant, not more urgent. |
| C3 | alternativeto.net / dev.to stale facts | C3 | **Moved.** C3 run 2 (#190) corrected the alternativeto finding and queued a smaller fix for the founder's hand (`docs/outreach/queue-2026-11-26.md` §9). |

---

## 5. Routing table — new items only, ranked by expected money per hour

Ranking logic as in run 1: the Capital One and fintech doors convert (C5:
2.3% trial-or-paid per arrival vs 0.5% elsewhere), so items there rank
first; copy fixes beat builds.

| # | Finding | Change that could bring a customer | Lane | Why this rank |
|---|---|---|---|---|
| N1 | IQ's Capital One DA guide (updated 11-16) sits on our best payer query twice, with a "Practice this interview with AI" button above the fold | Merge into run-1 item 1: the blog guide's first screen names the format in one line from R1's dossier and offers **our** rehearsal by its specifics ("70 minutes, 14 questions, timed and scored, on card and transaction data"). Add `dateModified` and a visible "Updated" date to the post, since IQ shows one | **C5** | Same door as run-1 #1, one extra hour; it answers the competitor now standing on that query |
| N2 | Candidate pattern: the Capital One OA bottleneck is joining several CSVs and computing rates fast, not SQL syntax | Check that question 1–3 of the `capital-one-codesignal` mock and the blog guide say this in our words ("multi-file joins and rates under a clock"). If the mock lacks a multi-table rate question, B3 adds one from our own data | **C5** / B3 | Aligns our product promise to what payers face; low build cost if the mock already has it |
| N3 | Comparison pages: "the only platform … with … an AI Coach" now false in two more places (IQ AI mock, Prepfully AI Wingman) | Same fix as run-1 #4; this read adds two dated sources C2 can cite. Raise its priority above run-1 #5 | **C2** | False exclusivity on a page assistants cite; 30-minute copy fix |
| N4 | Prices: BTI Essentials **$359.99/yr**, Premium **$949.99/yr**; LearnSQL **$39 per course, $599 lifetime for 82 courses**; Prepfully **$99–$279 per coaching session** (Meta DA page) | Dated input for B4's monthly read. Our $99/yr sits at the low end of subscription prep and far under coaching. **No agent changes a price** | **B4** | Founder-held decision; context only |
| N5 | Monzo SERP is won by Prepfully's paginated DS question bank, with no runnable SQL; Monzo's blog says SQL live debugging matters | On `/monzo-sql-interview/`, a "debug this query" item (a broken query on our own data, the reader fixes it), framed by the Monzo blog citation already on the page. Ties to run-1 #6 | **C5** (B3 for the item) | Empty SERP for a practice platform; a feature Prepfully cannot show statically |
| N6 | IQ and Prepfully scale fintech queries by paginated URLs | **Do not paginate.** Instead C1 checks whether our Revolut and Monzo pages are indexed and what they rank for (GSC/Bing, laptop). If not indexed, request indexing | **C1** (laptop) | Measurement first; we cannot see GSC from the cloud |
| N7 | LearnSQL leads "sql practice questions" with a blog post; `/sql-exercises/` is our Bing door for the same intent | C6 compares our `/sql-exercises/` against the query's intent (beginner sets with real datasets, answers shown). No copying; adds only what our page lacks | **C6** | Big generic query, but low conversion intent; ranks below the fintech items |
| N8 | quantvault.org is new on the Capital One assessment SERP and describes a different (general coding) format | C5 notes the conflict on the blog guide in one line: the DA assessment candidates report is the data-analysis one, not the general coding one. Source: R1 dossier + IQ 11-16 | **C5** | Removes confusion for the exact buyer; minutes of work, folded into N1 |

Also noted, not routed:
- **Big Tech Interviews' homepage carries an unrelated multilingual outbound
  link block.** Not ours to act on; it explains nothing about the SQL
  market. Recorded so a later run does not read it as a partnership.
- **E1 / founder-led prep plan**: IQ shows report quarters and outcomes per
  candidate. Our edge is that the founder writes to people by hand. Nothing
  to build; recorded for E1's framing only.

## 6. Not read, and why

- Prepfully's Monzo question text (not in the static render), its pricing
  for SQL-specific coaches, and its Trustpilot page. Next run with `wait`.
- BTI's monthly price (toggle not read) and its free plan contents (FAQ
  answers collapsed).
- LearnSQL's interview-focused course, if any (the guessed slug is a 404;
  the course list was not fetched).
- Glassdoor, Blind, 1point3acres: search snippets only, never fetched (their
  terms), never used as a page fact.
