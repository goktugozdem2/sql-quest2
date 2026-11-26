# Anthropic — SQL interview dossier

**Dossier date:** 2026-11-25 (R1, batch 6). **Refresh by:** 2027-01-24.
**Page:** `/anthropic-sql-interview/` — a general page ("no duration, no
platform, no stage list"). **Verdict of this run: stays general for SQL;
one first-party fact is page-ready.** Three readable data-scientist reports
agree on a recruiter screen about *why Anthropic* and a mission / AI-safety
question later; **none describes a SQL question.** Anthropic's own candidate
guidance (first-party, dated) says how AI may be used in applications,
take-homes and live interviews.
**Demand:** 26 impressions / 2 clicks in 28 days to 2026-11-21 (INDEX).

## Sources

Read with WebFetch on 2026-11-25; the Greenhouse job-board API with a plain
curl GET. No other fetcher, no cache, no archive.

| id | source | URL | date shown | type | fetched |
|---|---|---|---|---|---|
| X1 | Anthropic: Guidance on candidates' AI usage | https://www.anthropic.com/candidate-ai-guidance | updated 2025-07-10 | **first-party** | 200 |
| X2 | Anthropic job postings (Greenhouse board `anthropic`): Data Scientist — Growth (5161402008), Product (5182605008), GTM (5196852008), Safeguards (5209196008); Data Engineer, Product (5448481008); Accounting Analytics & BI Engineer (5471539008) | https://boards-api.greenhouse.io/v1/boards/anthropic/jobs ; https://job-boards.greenhouse.io/anthropic/jobs/5161402008 (etc.) | updated 2026-08-21 → 2026-11-24 | first-party postings; no interview process described | 200 |
| X3 | PracHub: Anthropic DS, "A Recruiter Screen and Nonnegotiable Offer Terms" | https://prachub.com/interview-experiences/anthropic-data-scientist-interview-experience-a-recruiter-screen-and-nonnegotiable-offer-terms | interview Sep 2026; published 2026-09-28 | candidate report (full body; only the recruiter screen had happened) | 200 |
| X4 | aced.io: Anthropic Data Scientist, L4, US hybrid | https://www.aced.io/experiences/anthropic-data-scientist-interview-d3dfc1 | interview "5 months ago" on 2026-11-25 (≈ Jun 2026); page title says 2026 | candidate report | 200 |
| X5 | aced.io: Anthropic Data Scientist, L4, US onsite | https://www.aced.io/experiences/anthropic-data-scientist-interview-05afb6 | interview "a year ago" on 2026-11-25 (≈ late 2025); page title says 2025 | candidate report | 200 |
| X6 | aced.io: Anthropic Engineering Manager, Data Infrastructure | https://www.aced.io/experiences/anthropic-engineering-manager-interview-028476 | interview Apr 2026 (per the list) | candidate report — no SQL; recruiter 30 min, phone screen ~55 min, five-interview loop, **no take-home** | 200 |
| X7 | Codemia practice item: optimise a slow query on a messages table (Anthropic, Data Scientist, onsite) | https://codemia.io/practice/optimize-a-slow-query-on-messages-6 | updated 2025-08-13 | question-bank item; **not marked as candidate-reported** | 200 |
| X8 | PracHub list, Anthropic; PracHub company page; aced.io `role=data-scientist` | https://prachub.com/interview-experiences?company=Anthropic ; https://prachub.com/companies/anthropic | — | lists | 200 — PracHub: 20 of 49 shown, 1 DS (X3), the rest SWE; aced: no exact match in the filter (X4, X5 found through search) |

Refused or not usable (each final for this run):
- **Interview Query** (Anthropic DA / DS / DE guides) — not attempted after
  a 429 on Netflix in this run.
- **Glassdoor**, **Blind** — not attempted (403 / 402 in earlier runs).
- **Snippet-only, not sources:** "the SQL round focused on window queries"
  (Interview Query DE), "ethics questions in a data-focused round"
  (Exponent course page). None was opened; none is used.

## Format

| fact | sources | confidence |
|---|---|---|
| **Take-home assessments are done without AI unless Anthropic says otherwise; live interviews are done without AI assistance unless Anthropic says otherwise.** Using Claude to prepare (research, practice answers) is encouraged. | X1 | **first-party, dated** |
| Data scientist loops open with a recruiter screen built on **why Anthropic** (and why leave the current job). | X3, X4, X5 | **high** (3 of 3) |
| A later round asks about **AI safety / the mission** and expects specific examples. | X5 (final round), X4 (candidate tip) ; X3 asks for "why AI companies" at the recruiter stage | medium |
| DS (≈ Jun 2026): recruiter → **CodeSignal online assessment, one timed four-level coding question** → technical interview on fine-tuning an ML model. | X4 | low |
| DS (≈ late 2025): recruiter → technical interview: **compute a product's conversion rate from a given dataset** (tool not stated) → final round on AI safety. | X5 | low |
| DS (Sep 2026): after the recruiter screen, the candidate was told of a hiring-manager screen, **five onsite rounds** and a leadership screen. The candidate *expected* SQL in the onsite; no report confirms it. | X3 | low |
| Whether a SQL round exists, its length, platform, dialect | — | **none** |
| The data stack the roles name: every DS posting asks for **SQL with Python**; data-engineering and BI postings name **dbt, Airflow**, and Hex / Looker / Tableau / Streamlit. The job's stack, not the interview's dialect. | X2 (6 postings) | first-party (postings) |

## Topics reported

M = 1 readable report with a data-manipulation question (X5), and it names
no SQL. **No topic count is possible.**
- Conversion rate from a dataset — 1 of 3 DS reports (X5; language not stated)

Question bank, not reports: query performance on a messages table (X7).

## Question shapes (paraphrased)

Candidate-reported:
- **Conversion rate for a product (X5, DS, ≈ late 2025):** given a dataset
  of users and their steps, compute what share converted. Rate over the
  right denominator. *Covered: Order Funnel Conversion and the mock's CTR
  question; nothing new for B3.*
Question bank, not counted:
- **A slow query on messages (X7):** find the bottleneck and rewrite it.
  *The "read / fix this query" B3 shape from batch 5 (Shopify, TikTok)
  already covers the form; X7 is not a report, so it does not add a
  count.*

## Role variants

- **Data scientist:** recruiter (why Anthropic) → a coding OA or a
  technical data question → onsite with a mission / safety component.
  Whether SQL is tested live is unconfirmed.
- **Data engineer / analytics / BI:** no readable report. Postings: SQL,
  Python, dbt, Airflow.
- **Engineering manager, data infrastructure (X6):** no SQL; no take-home.

## What changed

No earlier Anthropic read existed; this is the first.

## Recommendations for the page (for C1; nothing here edits a page)

- **Keep the SQL part general.** Nothing about a SQL round clears "low".
- **Page-ready, first-party (X1, updated 2025-07-10):** one line in the FAQ
  or a short "What Anthropic says about its process" note: "Anthropic's
  candidate guidance asks for take-homes and live interviews without AI
  assistance unless it says otherwise." Link X1 with its date. This is
  Anthropic's own statement, not a claim about its SQL round.
- **Unsourced claims on the existing page** (`src/anthropic-sql-interview.html`):
  1. `<meta name="description">`, `og:description`, `twitter:description`:
     "Practice the SQL patterns **Anthropic screens for** in data and
     analytics interviews" — no source. Suggest "Practice SQL on API-usage
     and product data: …".
  2. JSON-LD `Course.description`: "matching the patterns **Anthropic
     screens for** in data analyst, data scientist, and analytics engineer
     interviews" — no source; no data-analyst report exists.
  3. Hero: "Anthropic's data work is API-usage analytics at scale" — an
     editorial claim about the company's data work; X2's postings span
     growth, product, GTM, safeguards, billing and finance. Suggest
     "practice on the kind of data an AI lab's product teams work with".
  4. FAQ "Does this page know…": the stale "such as the Capital One page"
     sentence (INDEX run notes, batch 5).
