# Company SQL interview research: Chime (built); Nubank, N26 (deferred)

Research of 2026-11-22 by agent C1 (three research agents, one per company).
Every source cited on a page was fetched that day. The session's own WebFetch
could not resolve these hosts (outside the cloud session's network allowlist);
every "FETCHED" page below came through the Apify web-fetch connector, with the
HTTP status it returned. Search results came from WebSearch. The Chime brand
accent is from memory, not fetched.

Why these three (orchestrator, 2026-11-22): company pages are the best money
door (2.3% trial-or-paid per arrival vs 0.5% for `/sql-exercises/`,
`docs/plans/monetization-ideas-2026-11-22.md` §1f); the winners are consumer
fintech with a big candidate pool and no SQL incumbent (Revolut, Wise); a
search found no DataLemur page for any of the three.

## Read these caveats first

- **Blocked or unusable:** Glassdoor (DNS, then the classifier refused the
  fetch), 1point3acres (login wall on interview details), Prepfully (not
  found for these companies). Everything attributed to Glassdoor below is
  *(snippet, not fetched)* and is not used on any page.
- **Dataford, Interview Query, dev.to/PipeCode guides were fetched and
  rejected as format sources.** None cites a source. Dataford's Chime, Nubank
  and N26 pages each contradict themselves (round counts vs FAQ durations),
  and the N26 one is written in the first person as if N26 were speaking.
  Interview Query's Chime guide is boilerplate (2nd-highest salary, generic
  four stages). The dev.to post is marketing for a prep product with invented
  schemas.
- **PracHub "interview-experiences" pages are first-person candidate reports,
  edited by PracHub**, with an interview month and a publish date. We cite
  both, the same way the 11-20 read did for PayPal and Coinbase.
- **Exponent/Aced ee3798 (Chime senior DS)** shows only relative dates
  ("submitted 5 months ago") and its technical block repeats one answer three
  times. It fails the dated-source rule and is not used.
- **Search volume is not measured.** "Demand" means dedicated pages exist in
  results, the same proxy as the 09-13 and 11-20 reads.

---

## Chime

### 1. Demand check
a. **Dedicated SQL pages from the two main SQL-prep sites: none.**
- datalemur.com/blog/chime-sql-interview-questions: **404** (fetched).
- stratascratch.com/blog/chime-sql-interview-questions: **404** (fetched).
- What ranks for `chime sql interview questions`: dev.to/PipeCode, Glassdoor
  reviews, Exponent ee3798, three 1point3acres threads, three PracHub
  candidate reports, Interview Query's Chime hub, Dataford DA/BI guides.
- `chime data analyst interview`: Glassdoor, four 1point3acres threads,
  Exponent, Interview Query DA and DS, Dataford, dev.to.

b. **Incumbent:** none for SQL. Aggregators and thin generated guides. The
same vacuum Revolut and Wise sat in.

c. **Collision: yes on the short query, no on the interview query.**
`chime sql` returns the CHIME radio telescope's `chimedb`, Amazon Chime SDK
query docs, and generic SQL docs; the bank shows up only through a PracHub
question at positions 2–3. `chime sql interview questions` and
`chime data analyst interview` resolve cleanly to the bank. The title must
carry "Interview".

### 2. Interview format (data roles)
| Fact | What sources say | Source (page date) |
|---|---|---|
| Technical screen (DS) | "one hour of SQL and one hour of a case study". SQL on "a transaction table and a user table"; "If you're fast you'll probably get through 5-6 questions". Timestamps, so "you need to use date_trunc". First questions basic, "a few CTEs"; then "dense_rank(), lag(), and sum()" with a rolling window. Case: an Excel file of metrics (revenue, profit, LTV, cost, CPA), launch or not. Tagged medium. No platform named; not said whether code ran. | PracHub candidate report, interview Oct 2025 (published 25 Aug 2026) |
| HM screen (DS) | Recruiter screen, then "a one-hour session split into two parts, 30 minutes chatting about my background and 30 minutes writing SQL". Tables "users and transactions"; no schema given, the candidate ran `SELECT *` to see the columns (so the query ran). Prompt: "what's the early signal to predict user retention", metric left to the candidate. "They don't do a take-home anymore"; next step the virtual onsite. Tagged easy; rejected. | PracHub candidate report, interview Nov 2025 (published 25 Aug 2026) |
| SWE (data-engineering-leaning) | SQL questions "very basic and explicitly did not include window functions"; greedy-style algorithm problems; easy; no offer. | PracHub candidate report, reported Oct 2025 (published 17 Sep 2026) |
| PracHub Chime DS guide | **404** | — |
| Analyst process, 4 stages, SQL test or take-home | Interview Query DA guide (published 27 Mar 2026), unsourced boilerplate | **not used** |
| 7 rounds, 4–6 weeks, SQL + viz take-home | Dataford DA guide (updated 7 Oct 2026), unsourced, self-contradicting | **not used** |
| "SQL involved date calculation, and aggregation" | Exponent ee3798, relative dates only | **not used** |
| "most difficult questions in the SQL round were about window functions"; video call with screen share | Glassdoor | *(snippet, not fetched)* |
| "project discussion, AB testing case, and complex SQL questions" (analytics phone screen) | 1point3acres 1123317, summary line only, no date | **not used** |

**Where sources differ.** One DS report puts SQL in a two-hour technical
screen with a case; the other puts 30 minutes of it inside the hiring-manager
screen. They are different stages of possibly different loops, and the page
states both. No fetched source names a tool or describes a data analyst loop;
the page says so.

### 3. SQL topics (fetched sources only)
1. Timestamps truncated to a day or month before grouping (Oct 2025 report)
2. Layered CTEs (Oct 2025 report)
3. Ranking with ties, DENSE_RANK (Oct 2025 report)
4. The previous row, LAG (Oct 2025 report)
5. Rolling sums over a window (Oct 2025 report)
6. Defining a retention metric from users and transactions, schema unseen (Nov 2025 report)
7. Basic joins and aggregation, no window functions (SWE report)

Difficulty: medium (Oct 2025 technical screen), easy (Nov 2025 HM screen),
easy (SWE). The page says all three and that the easy one ended in a
rejection.

### 4. Sample question shapes (paraphrased)
1. Users + transactions with a full timestamp: daily or monthly metrics, which
   needs the timestamp truncated first. (Oct 2025 report)
2. Same two tables: rank with ties kept, compare a row with the one before it,
   a rolling sum. (Oct 2025 report)
3. Users + transactions, no schema: the early behaviour that predicts a user
   is retained. Define it, then write it. (Nov 2025 report)

### 5. Domain data shape and the practice set
The sources describe users and transactions, nothing more. Our nearest
honest fit is `finans_fraud` (cardholders and card transactions, timestamps)
plus the e-commerce customers/orders tables for retention. Chime is a
consumer debit-card bank, so card transactions are the right flavour; there
is no direct-deposit or paycheck table and the page claims none.

The Chime set, 16 challenges, one line of reasoning each (also in
`src/data/company-interviews.js`, `NEW_COMPANY_TAG_REASONS.Chime`):

| id | diff | why it is in the set |
|---|---|---|
| 289 | Easy | transaction timestamps bucketed to a day — the "date_trunc" step |
| 275 | Easy | month-level metric per account from a timestamp |
| 277 | Easy | users joined to their transactions, grouped by sign-up month |
| 174 | Easy | the users ⨝ transactions join with a filter, the basic opener |
| 175 | Easy | users with no transactions survive a LEFT JOIN — the retention denominator |
| 291 | Medium | per-user totals across two child tables without the fan-out |
| 292 | Medium | ranking with ties on transaction counts |
| 160 | Medium | RANK vs DENSE_RANK side by side — the tie rule the report names |
| 172 | Medium | LAG: each transaction against the one before it |
| 294 | Medium | a running SUM over daily spend |
| 278 | Medium | inactivity in the last 14 days — the churn side of retention |
| 121 | Medium | users active in more than one month — a simple retention signal |
| 283 | Hard | a rolling 30-day sum per account |
| 284 | Hard | time from first to second transaction — an early-retention signal |
| 88 | Hard | retention by sign-up cohort |
| 50 | Hard | a 7-day rolling average over a timestamped series |

Overlap with the other fintech sets (Jaccard): Monzo 0.23, Coinbase 0.28,
Capital One 0.28, PayPal 0.10, Revolut 0.13. It is not Monzo's set renamed. A guard now
holds every new set under 0.5 against every other company's set.

**Verdict: BUILD.** Three fetched, dated first-person reports from late 2025,
two of them data science and specific (tables, topics, timing); no SQL
incumbent; the interview query has no collision. Risks: every source is one
candidate's account on one aggregator; no analyst-loop source; demand is a
proxy. Put it under the P4 prune rule: no impressions eight weeks after
indexing → noindex.

---

## Nubank

### 1. Demand check
- datalemur.com/blog/nubank-sql-interview-questions: **404** (fetched).
- stratascratch.com/blog/nubank-sql-interview-questions: **404** (fetched).
- interviewquery.com/interview-guides/nubank: **404** (fetched).
- Top results for `nubank sql interview questions`: Dataford DS/DA/BA guides,
  Glassdoor (.ca, .com.mx, .co.in), interviewpal. `nubank entrevista sql`:
  Glassdoor and Indeed BR/MX, building.nubank.com/tag/sql/.
- **Collision on `nubank sql`:** CockroachDB and Datomic case studies,
  Nubank's engineering SQL tag, job postings. Stack content competes with
  interview intent.
- **Language and pool:** Nubank hires across Brazil, Mexico and Colombia
  ("more than 127 million customers across Brazil, Mexico, and Colombia",
  Greenhouse board text, fetched). Candidate reports are mostly on Glassdoor
  .com.br / .com.mx, in Portuguese or Spanish. An English page serves a
  minority of the real candidates.

### 2. Interview format (fetched, first-party)
| Fact | Source (page date) |
|---|---|
| Analytics Engineer: eight steps — application, technical assessment, remote interview, case study, presentation, People interview, debrief, offer. Step 2: "an online practical test involving writing SQL queries and other programming exercises", "precisely 120 minutes", one week to start, no pause or retake, any language. Case ~7 days by email; presentation 5 + 50 + 5 min. No platform, no SQL topics. | building.nu.com, AE hiring process (published 6 Oct 2021, modified 23 Jan 2024) |
| AE, 2026: "The hiring process includes live data modeling case studies"; efficient queries that respect partitioning; Spark/Scala, Databricks. Conflicts with the 2021/2024 take-home description. | building.nu.com, "A day in the life of an Analytics Engineer" (7 May 2026) |
| Data Scientist: TA interview, then three technical interviews (live-coding basics, modelling, business analysis), leadership, offer. **No SQL stage named.** | building.nu.com, DS hiring process (published 19 Dec 2019, modified 2 Oct 2024) |
| Business Analyst: a live case interview (breakeven maths). **No SQL.** | building.nu.com, "Crack the case" (11 Nov 2024) |
| "SQL and python (use hackerrank to study for this)"; DS final with SQL | Glassdoor *(snippet, not fetched)* |

**Verdict: DEFER.** Nubank's own posts put SQL in exactly one role,
Analytics Engineer, and that role's test has no stated topics, and its 2026
post describes live data-modelling cases our bank does not practise. The DS
and BA posts have no SQL stage, so a "Nubank SQL interview" page would be
sourced for the role least served by our content. The pool searches mostly
in Portuguese and Spanish, and the short query is stack content. A third set
drawn from the same card ledger as Monzo and Chime would also be thin.
Revisit if (a) a fetched, dated candidate report shows SQL in a Nubank
analyst or DS loop, or (b) we build Portuguese company pages.

---

## N26

### 1. Demand check
- datalemur.com/blog/n26-sql-interview-questions: **404** (fetched).
- stratascratch.com/blog/n26-sql-interview-questions: **404** (fetched).
- Top results for `n26 sql interview questions` and `n26 data analyst
  interview`: Glassdoor reviews, Dataford guides, generic DataCamp lists, the
  InsideN26 Medium post. Long-tail review pages, no dedicated guide.
- **Collision on `n26 sql`:** mixed (a Metabase case study, the 2018 data
  team post, job postings, a tutorial on an N26 CSV export). Not strong.

### 2. Interview format
| Fact | Basis |
|---|---|
| Codility SQL test, 1 hour, CTE / window functions / grouping / UNION ALL | Glassdoor *(snippet, not fetched)* |
| HR → Codility → team rounds; 45-minute rounds; AE final on dbt and modelling | Glassdoor *(snippet, not fetched)* |
| 5 rounds, 4–6 weeks; SQL focus CTEs, window functions, GROUP BY | Dataford N26 DA (updated 17 Aug 2026) — unsourced, first-person as N26, says 5 and 7 reports in different places. **Not used.** |
| Data team of 14 in three sub-teams; analytics team runs SQL classes for staff | n26.com blog, "Introducing the data team at N26" (4 Sep 2018) — not an interview fact |
| Data science at N26 (team, Python, financial crime) | medium.com/insiden26 (2 Sep 2019) — nothing on hiring |
| Data analyst posting n26.com/en-eu/careers/positions/8187984 | **404** (expired) |

**Verdict: DEFER.** Every specific format fact (Codility, one hour, the topic
list) is snippet-only. There is no first-party hiring post and no fetched
candidate report. A general page ("tagged by topic, not modelled on N26's
interview") is possible but would rest on thin demand with nothing to say
that a candidate cannot read on Glassdoor. Close it with a browser: read 3–5
Glassdoor N26 data reviews in a laptop session, record dates in a new
`docs/reads/` file, and the Codility rows become sourceable.

---

## Fetched today (2026-11-22)

- https://prachub.com/interview-experiences/chime-data-scientist-interview-experience-sql-and-a-business-case-in-one-technical-screen (200)
- https://prachub.com/interview-experiences/chime-data-scientist-interview-experience-a-schema-less-sql-retention-question-in-the-hm-screen (200)
- https://prachub.com/interview-experiences/chime-software-engineer-interview-basic-sql-without-window-functions-e4b3c47621 (200)
- https://prachub.com/interview-guide/chime-data-scientist-interview-guide (404)
- https://www.tryexponent.com/experiences/chime-senior-data-scientist-interview-ee3798 (200, relative dates, not used)
- https://www.interviewquery.com/interview-guides/chime-data-analyst (200, not used)
- https://www.dataford.io/interview-guides/chime/data-analyst (200, not used)
- https://dev.to/gowthampotureddi/chime-data-engineering-interview-questions-full-prep-guide-3kof (200, not used)
- https://www.1point3acres.com/interview/thread/1123317 (200, login wall, not used)
- https://datalemur.com/blog/chime-sql-interview-questions (404)
- https://www.stratascratch.com/blog/chime-sql-interview-questions (404)
- https://building.nu.com/pt-br/what-is-the-hiring-process-like-for-analytics-engineers-at-nubank/ (200)
- building.nu.com "A day in the life of an Analytics Engineer" (200)
- building.nu.com Data Science hiring process (200)
- building.nu.com "Crack the case… Business Analysis role (Part 1)" (200)
- https://www.dataford.io/interview-guides/nubank/data-analyst (200, not used)
- https://job-boards.greenhouse.io/nubank/jobs/7943730 (redirect to board, no openings)
- https://www.interviewquery.com/interview-guides/nubank (404)
- https://datalemur.com/blog/nubank-sql-interview-questions (404)
- https://www.stratascratch.com/blog/nubank-sql-interview-questions (404)
- https://www.dataford.io/interview-guides/n26/data-analyst (200, not used)
- https://n26.com/en-eu/blog/introducing-the-data-team-at-n26 (200)
- medium.com/insiden26 "A peek into Data Science at N26" (200)
- https://n26.com/en-eu/careers/positions/8187984 (404)
- https://datalemur.com/blog/n26-sql-interview-questions (404)
- https://www.stratascratch.com/blog/n26-sql-interview-questions (404)
