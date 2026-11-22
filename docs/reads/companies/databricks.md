# Databricks — SQL interview dossier

**Dossier date:** 2026-11-22 (R1, batch 4; the run crossed midnight UTC).
**Refresh by:** 2027-01-21.
**Page:** `/databricks-sql-interview/` — a general page ("we have no dated
public source for how Databricks runs its SQL round"). Its title and meta
frame it as "Spark SQL & Data Engineering". **Verdict of this run: still
general.** Databricks publishes its processes for engineering and Solutions
Architect roles, and neither names a SQL round. No readable candidate report
describes a SQL round for a data scientist or analyst.
**Demand:** 84 impressions / 4 clicks in 28 days to 2026-11-21 (INDEX).

## Sources

Read on 2026-11-22/23 with WebFetch, except D5 (the public Greenhouse
job-board API, read with a plain curl GET).

| id | source | URL | date shown | type | fetched |
|---|---|---|---|---|---|
| D1 | Databricks: "Clear interview process and insider insights" (careers interview prep) | https://www.databricks.com/company/careers/interview-prep | none (© 2026) | **first-party** | 200 |
| D2 | Databricks: Engineering interview prep PDF (Back-End and Front-End/Full-Stack Software Engineer) | https://www.databricks.com/sites/default/files/2025-04/engineering-careers-site-interview-prep-april-2025-002.pdf | April 2025 | **first-party** | 200 (PDF, read as page images) |
| D3 | Databricks: Field Engineering interview prep PDF (Solutions Architect) | https://www.databricks.com/sites/default/files/2025-04/field-engineering-careers-site-interview-prep-april-2025-002.pdf | April 2025 | **first-party** | 200 (PDF, read as page images) |
| D4 | Databricks job postings: Senior Data Scientist (id 5634684002, first published 2026-05-27) and Data Science Intern 2027 (id 6866538002) | https://boards-api.greenhouse.io/v1/boards/databricks/jobs/5634684002 · …/6866538002 | as listed; both updated 2026-11-19 | first-party (job text, not the interview) | 200 |
| D5 | Databricks job board, all postings | https://boards-api.greenhouse.io/v1/boards/databricks/jobs | read 2026-11-23 | first-party | 200 — data titles: Data Scientist (Senior, Staff ×3), DS manager, DS intern; **no Data Analyst or Analytics Engineer opening** |
| D6 | DataDriven: Databricks Data Engineer interview guide | https://datadriven.io/companies/databricks/interview | updated 2026-09-23 | prep guide listing 5 reported items + 1 candidate report (Jan 2026) | 200 |
| D7 | PracHub: Databricks Data Scientist interview guide 2026 | https://prachub.com/interview-guide/databricks-data-scientist-interview-questions-guide-2026 | 2026-09-22 | prep guide; says the stages are "what candidates describe, not a published process", no counts or dates | 200 |
| D8 | PracHub: "Databricks Solutions Architect interview" article | https://prachub.com/resources/databricks-solutions-architect-interview-technical-discovery-dataframe-tasks-and-the-presentation | 2026-09-08 | prep article citing D3 + one Jul 2025 report + one May 2026 upcoming-round post | 200 |
| D9 | PracHub: Databricks interview experiences (29; 20 visible) | https://prachub.com/interview-experiences?company=Databricks | — | candidate reports | 200 — all visible ones are SWE, MLE or FDE; **no data-role report** |

Refused or not usable:
- 1point3acres thread 1113750 ("Finance and SQL Data Analyst") — not
  fetched; 1point3acres answered **403** to the Shopify thread earlier in
  this run, a site-wide refusal. FOUNDER hand read: this is the only
  analyst-titled Databricks SQL report seen.
- dev.to "Databricks data scientist interview experience" (an
  interview-assistance account) — **404**.
- Glassdoor — not attempted. Its DS snippets ("40 min SQL + 10 min stats",
  "1 SQL interview" in a loop of 3) are **snippets, not sources**.
- Interview Query Databricks guide — not attempted (429 in batches 2–3).

## Format

| fact | sources | confidence |
|---|---|---|
| **Company-wide stages:** recruiter call → a pre-onsite screen (hiring-manager screen, technical assessment or skill evaluation) → onsite loop of four to six interviews → a presentation for some roles (go-to-market, executive) → references → offer. Typically two to three months. All virtual on Google Meet unless told otherwise. | D1 | **first-party** |
| **Software engineering:** recruiter 30 min → technical screen 1 h → team matching → panel of 4–6 one-hour interviews (coding, algorithms, system programming, architecture, domain deep dive, cross-functional) → hiring committee. CoderPad. **No SQL round named.** | D2 | **first-party** |
| **Solutions Architect:** recruiter 30 min → hiring manager 1 h → technical screen 1 h (data storage, pipelines, scaling, cloud architecture) → coding assignment (**DataFrame operations in Python or Scala**) → panel of 2–3 one-hour interviews → 1-hour presentation on a hypothetical customer scenario. **No SQL round named.** | D3 | **first-party** |
| The SA coding assignment came as a CodeSignal test of three Python/PySpark questions with about a week to submit. | D8 (relaying one Jul 2025 report) | low |
| **Data scientist postings ask for SQL** ("proficiency in SQL" with Spark/Hadoop; "work with data in SQL and Python" for interns). This describes the job, not the interview. | D4 | first-party, job text |
| Data engineer loop: recruiter ~30 min → technical phone screen ~60 min → onsite of about 4–5 hours with system design, a Spark deep dive, SQL, coding and behavioural. The guide is inconsistent about the onsite count. | D6 | low (guide) |
| Data scientist loop: five stages over 4–6 weeks; SQL-style exercises on ranking/dedup, running totals, period-over-period and cohorts, which can also come in Python. | D7 | low (guide, no candidate trail) |
| **Dialect:** D6 says Spark SQL or Databricks SQL, with standard SQL accepted. No candidate report confirms it. | D6 | low |

## Topics reported

M = 1 dated candidate report with SQL content: D6 relays a 2025 London
take-home, "a multi-join assessment with window functions", and an L4 2025
onsite item it attributes to DataLemur, a paid bank. The Jan 2026 report in
D6 names no SQL topic. **Too thin to count topics.** The guides (D6, D7)
list window functions, top-N per group, gaps-and-islands, period-over-period
and cohorts as their own claims.

## Question shapes (paraphrased)

- **Last N per user (D6, via DataLemur, L4 2025 onsite):** for each user,
  their three most recent jobs and statuses by launch date. Skills:
  ROW_NUMBER partitioned by user. *Bank: top-N-per-group exists (e.g. 20,
  "Top Spender Per Country"). Not page-ready: the attribution runs
  through a paid bank.*
- **Multi-join take-home (D6, 2025, London):** a pipeline-themed
  assessment with joins and window functions; no item detail.
- **YTD spend threshold (D7 bank, not candidate-attributed):** weekly count
  of customers whose year-to-date spend crosses a threshold. Skills: running
  SUM, first week over the line. Low; listed only as a B3 idea.

## Role variants

- **Software engineer:** algorithmic and systems; no SQL (D2).
- **Solutions Architect:** technical screen on data architecture; coding in
  Python/Scala DataFrames; presentation (D3).
- **Data scientist:** postings require SQL (D4); no readable candidate
  report describes the round.
- **Data engineer:** a SQL round is plausible (D6) but rests on a guide.
- **Data analyst / analytics engineer:** no open posting on 2026-11-23 (D5)
  and no readable report.

## What changed

No earlier Databricks read existed; this is the first.

## Recommendations for the page (for C2 / C1; nothing here edits a page)

- **Keep it general.** Nothing about a Databricks SQL round clears medium.
- One first-party line is safe and useful: "Databricks publishes its
  interview steps for engineers and Solutions Architects (April 2025). Neither
  names a SQL round. The Solutions Architect coding task is DataFrame work
  in Python or Scala." That sets expectations honestly for the people who
  land on this page.
- **Check the framing.** The title "Practice Spark SQL & Data Engineering"
  implies a SQL round that no source shows. A data-science posting asking
  for SQL is the most we have. The page's own SQL is SQLite in the browser,
  so "Spark SQL" in the title is also a dialect promise.
- Demand on this page is likely dialect and product intent ("databricks sql"),
  like Snowflake's. C1 should read the query slice before investing.
- FOUNDER: one hand read of the 1point3acres "Finance and SQL Data Analyst"
  thread (403 to agents) would show whether an analyst SQL round exists.
