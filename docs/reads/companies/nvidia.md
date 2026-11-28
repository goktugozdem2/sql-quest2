# NVIDIA — SQL interview dossier

**Dossier date:** 2026-11-25 (R1, batch 6). **Refresh by:** 2027-01-24.
**Page:** `/nvidia-sql-interview/` — a general page ("no duration, no
platform, no stage list"). **Verdict of this run: stays general.** No
readable candidate report for a data role exists in the sources that open;
the readable NVIDIA reports are engineering, QA, TPM and product roles.
**Demand:** 27 impressions / 0 clicks in 28 days to 2026-11-21 (INDEX).

## Sources

Read with WebFetch on 2026-11-25; NVIDIA's Workday job search by a plain
curl POST/GET to its public JSON endpoint. No other fetcher, no cache, no
archive.

| id | source | URL | date shown | type | fetched |
|---|---|---|---|---|---|
| V1 | PracHub list, NVIDIA, all roles | https://prachub.com/interview-experiences?company=NVIDIA | — | list | 200 — 20 of 30 shown: 12 SWE, 4 QA, 3 embedded, 1 solutions architect; **no data role** |
| V2 | aced.io list, NVIDIA × data-scientist | https://www.aced.io/experiences?company=nvidia&role=data-scientist | — | list | 200 — **no exact match**; similar rows are TPM, PM, SWE, MLOps |
| V3 | aced.io: NVIDIA Data Product Manager | https://www.aced.io/experiences/nvidia-product-manager-interview-45ee6d | interview Sep 2025 (per the list) | candidate report | 200 — phone call with a VP, then a virtual loop (engineer, PM, researcher, HM); **no SQL** |
| V4 | NVIDIA job postings (Workday `NVIDIAExternalCareerSite`): Senior Data Scientist – Finance (JR2015085); Senior Data Scientist, Data Quality and AI Evaluation (JR2028769); Principal Data Scientist – Cloud Gaming and AI (JR2019886) | https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite/job/US-CA-Santa-Clara/Senior-Data-Scientist---Finance_JR2015085 (and the other two) | start dates 2026-11-19 | first-party postings; no interview process described | 200 |
| V5 | DataLemur: NVIDIA SQL interview questions | https://datalemur.com/blog/nvidia-sql-interview-questions | updated 2025-01-20 | practice guide; says NVIDIA asks SQL in DS / DE / DA interviews, **no source** | 200 |
| V6 | datadriven.io: NVIDIA data engineer guide | https://datadriven.io/companies/nvidia/data-engineer | "Published/Updated 2026-04-20" in the header, "Updated Sep 23, 2026" in the stack section (conflicting) | prep guide; loop not sourced, round mix "inferred from 9 job descriptions" | 200 |
| V7 | PracHub question: fastest crossing per car from bridge IoT logs (Data Scientist) | https://prachub.com/interview-questions/find-the-fastest-bridge-crossing-and-its-car-from-iot-traffic-logs | 2026-11-25 | question-bank item tagged NVIDIA; **not marked as candidate-reported**, no interview date | 200 |

Refused or not usable (each final for this run):
- **Interview Query** — not attempted for NVIDIA after a 429 on Netflix in
  this run.
- **Dataford** NVIDIA DS guide — not attempted after a 429 on Netflix.
- **Glassdoor** — not attempted (403 in earlier runs). It is where nearly
  every NVIDIA data-scientist search result points.
- **Snippet-only, not sources:** "a technical round with a mix of SQL,
  probability and ML" and "time-series feature-engineering curveballs"
  (Glassdoor DS, 2025), "three video interviews" (Interview Query DA), "the
  onsite SQL was harder than basic" (Interview Query DE), a GPU-workload
  telemetry SQL sample (Dataford). None was opened; none is used.

## Format

| fact | sources | confidence |
|---|---|---|
| Any data-role SQL round: stages, length, platform, dialect, take-home | — | **none** |
| NVIDIA's own data-scientist postings ask for SQL with Python, and name Databricks, Spark and Delta Lake in the stack (Nov 2026). The job's stack, not the interview's dialect. | V4 (3 postings) | first-party (postings) |
| Data product manager (Sep 2025): VP phone call, then a four-interviewer virtual loop; no SQL. | V3 | low (and not a data role) |

## Topics reported

No readable candidate report with SQL in it: **no topic count**.

Practice sets, not reports: DataLemur (V5) — revenue per product line,
average GPU temperature per model, click-through rate per product from
views and clicks, monthly quantity per product, customers with a given
interest; datadriven (V6) — peak concurrency from job intervals, per-group
date gaps, top 2 sellers per marketplace (DENSE_RANK).

## Question shapes (paraphrased)

Candidate-reported: **none**.
Question bank, not counted (V7): from bridge entry/exit sensor logs plus
cars and bridges tables, find the single fastest crossing (length ÷ travel
time), skipping crossings with no exit, with a deterministic tie-break.
Tests timestamp arithmetic, NULL handling, casting before division and
ORDER BY tie-breakers. *Bank: no travel-time / speed item. Low priority:
not a report.*

## Role variants

- **Data scientist, data analyst, data engineer, BI:** nothing readable.
- Postings (V4) put SQL next to Python, Databricks and Spark for data
  scientists in finance, AI evaluation and cloud gaming.

## What changed

No earlier NVIDIA read existed; this is the first.

## Recommendations for the page (for C1; nothing here edits a page)

- **Keep the page general.** Nothing clears "low".
- **Unsourced claims on the existing page** (`src/nvidia-sql-interview.html`):
  1. `<meta name="description">`, `og:description`, `twitter:description`:
     "Practice the SQL patterns **NVIDIA screens for** in data science and
     analytics interviews" — no source says what NVIDIA screens for.
     Suggest "Practice SQL on telemetry and hardware data: …".
  2. JSON-LD `Course.description`: "matching the patterns **NVIDIA screens
     for** in data analyst, data scientist, and analytics engineer
     interviews" — same problem; three roles no source covers.
  3. Hero: "NVIDIA's data teams live inside telemetry and supply-chain
     firehoses — **its interviews screen for exactly that**." The disclaimer
     two lines below says the page has no source for NVIDIA's round. Drop
     the second half.
  4. FAQ "Does this page know…": the stale "such as the Capital One page"
     sentence (INDEX run notes, batch 5).
  This is the same pattern R1 flagged on Tesla (batch 5); #237 fixed Tesla.
- FOUNDER: one Glassdoor NVIDIA data-scientist review would be the first
  readable data-role report.
