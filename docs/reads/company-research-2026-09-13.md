# Company SQL interview research — seven candidates for SQL Quest landing pages

All sources accessed 2026-09-13 unless noted. "Page date" is what the page itself showed; relative dates ("updated 3 months ago") are reproduced as shown.

## Read these caveats first

- **InterviewQuery (interviewquery.com), Dataford, datainterview.com, Glassdoor, 1point3acres and Medium blocked fetches** (HTTP 429 or 403) for the whole session. Anything attributed to them below comes from the **search-result snippet only** and is marked *(snippet, not fetched)*. Treat it as weaker evidence. Before publishing, re-verify those points in a browser.
- **DataLemur's company-tagged questions come with no dates or candidate trail.** The site says they are "similar to" questions asked at the company. Use them to show the *shape* of a question, not as proof the company asked it. StrataScratch tags are a bit stronger, because its blog posts say which role a question came from. The strongest sources are first-person candidate reports: Blind, Exponent "experiences", GeeksforGeeks interview experiences.
- **Exponent's per-company SQL question lists for Goldman Sachs and DoorDash return "no results found"** even though they rank in search. They show up as demand signals but contain nothing.
- Prep-site "guides" (Exponent/Aced, PracHub, OphyAI, InterviewQuery) say they aggregate candidate reports. Several of them repeat each other's wording, so agreement between them does not count as independent confirmation.

---

## Microsoft

### 1. Demand check
a. **Dedicated pages: yes.** Pages seen in results:
- https://datalemur.com/blog/microsoft-sql-interview-questions (page date May 8, 2025)
- https://www.stratascratch.com/blog/microsoft-sql-interview-questions (Oct 30, 2023)
- https://interviewquery.com/interview-experiences/microsoft/data-analyst (snippet, not fetched; titled "2025 Guide")
- https://www.tryexponent.com/guides/microsoft-data-scientist-interview ("updated 3 months ago")
- https://datalemur.com/blog/microsoft-data-science-interview (May 8, 2025)

b. **Incumbent:** DataLemur ranks first on both the plain query and the exact-match query. No site owns it outright.

c. **Collision: YES, severe.** The exact-match search `"microsoft sql interview questions"` returned SQL Server / DBA pages in the top 8: adaface.com (MS SQL interview questions to hire DBAs), codemag.com (SQL Server interview questions), hirist.tech, scholarhat.com, StrataScratch's "MS SQL" post, and a Microsoft Q&A thread. To most searchers "Microsoft SQL" means SQL Server, so this query mostly carries DBA/T-SQL intent, not "interviewing at Microsoft".

### 2. Interview format (DS / DA roles)
| Fact | What sources say | Source (page date) |
|---|---|---|
| Roles where SQL is tested | Data Analyst, Data Scientist, BI. SQL is asked "almost always" | DataLemur blog (May 8, 2025); InterviewQuery (snippet) |
| Stages (DS) | Recruiter screen (30 min) → technical screen (45 min: SQL, stats, ML fundamentals) → final loop of 4–5 rounds of 45–60 min in one day | Exponent DS guide (updated ~3 months ago, "by Microsoft candidates") |
| Stages (DS, alternate) | Recruiter 30–45 min → technical screen 45–60 min (SQL, Python, stats, probability) → onsite 3–5 h → final 1–2 h | DataLemur DS guide (May 8, 2025) |
| Online assessment | **Sources disagree.** InterviewQuery (snippet): a 2.5-hour Codility test. DataLemur DS guide: CodeSignal used for a "Data Science Framework Assessment". Exponent: no OA mentioned, live coding only. | as listed |
| Live vs async | Technical screen and loop are live (Exponent). OA, where reported, is async. | Exponent; InterviewQuery (snippet) |
| DA screen tool | "one or two SQL problems", likely on HackerRank or CoderPad | InterviewQuery DA page (snippet, not fetched). Not independently confirmed. |
| SQL vs other | Loop has a dedicated coding round (Python and/or SQL) alongside ML, experimentation, business case and behavioral rounds. Exponent: experimentation/causal inference weighs about as much as ML. Senior loops still test SQL (InterviewQuery snippet). | Exponent; InterviewQuery (snippet) |
| KQL | datainterview.com (snippet, not fetched): KQL (Kusto) sometimes appears alongside SQL for DA roles. | snippet only |
| Duration of SQL portion | not reliably reported | — |

### 3. SQL topics (ranked by how often sources mention them)
1. Joins, including multi-table and self-joins (DataLemur, StrataScratch, Exponent, InterviewQuery snippet)
2. Aggregation / GROUP BY (all sources)
3. Window functions (Exponent, InterviewQuery snippet; RANK vs DENSE_RANK as a concept question at DataLemur)
4. CTEs / subqueries (Exponent, StrataScratch)
5. CASE WHEN / conditional aggregation (StrataScratch)
6. Filtering / pattern matching (LIKE) (DataLemur)
7. Performance / query optimisation (Exponent, InterviewQuery snippet)

Difficulty: mostly medium. The DataLemur set mixes easy filters and concept questions with medium aggregation. StrataScratch rates its Microsoft question Medium.

### 4. Sample question shapes (paraphrased)
1. Purchases table (user, date, product, price): find users with more than 10 purchases in a single month. — https://datalemur.com/blog/microsoft-sql-interview-questions
2. Purchases (customer, product, amount) + product catalog (product, category): find cloud customers who bought from every product category. This is relational division via COUNT(DISTINCT) = total categories. — https://datalemur.com/questions/supercloud-customer
3. User dimension, account dimension (paying yes/no) and daily downloads fact table: per date, compare downloads by paying vs non-paying users and keep dates where non-paying is higher. — https://www.stratascratch.com/blog/microsoft-sql-interview-questions
4. Clicks table and conversions table, both keyed by user/product/date: compute click-through-to-conversion rate by product category. — https://datalemur.com/blog/microsoft-sql-interview-questions
5. Chat message metadata (sender, receiver, sent date): find the top senders in a month. — https://datalemur.com/blog/microsoft-data-science-interview

### 5. Domain data shape
Sources support **product purchases / cloud product categories (Azure)**, **app downloads by paying vs free accounts**, and **messaging activity (Teams)**. InterviewQuery (snippet) mentions telemetry anomaly detection and retention. DataLemur's DS guide explicitly says its examples are generic, not Azure/Xbox/Office telemetry. Xbox and Office usage data are not supported by any source I could read.

**Recommendation:** Do not publish as "Microsoft SQL Interview Questions". The query is taken over by SQL Server/DBA intent, and the format facts conflict on the key point (Codility vs CodeSignal vs no OA). A role-qualified title such as "Microsoft Data Scientist SQL Interview" could work later.

---

## DoorDash

### 1. Demand check
a. **Dedicated pages: yes, many.**
- https://datalemur.com/blog/doordash-sql-interview-questions (May 8, 2025)
- https://www.stratascratch.com/blog/doordash-sql-interview-questions (last updated Mar 6, 2026)
- https://nathanrosidi.medium.com/doordash-sql-interview-questions-509e1dfbb1fb (Medium; not fetched)
- https://nextleap.app/interview-preparation/sql/questions/company/doordash
- https://www.interviewquery.com/p/doordash-analytics-case-study (snippet, not fetched)

Also seen: an Exponent SQL list (empty), a Glassdoor question page, a 1point3acres thread, PracHub.

b. **Incumbent:** split between DataLemur and StrataScratch. StrataScratch's page is the most recently updated and the most detailed, with seven questions tagged to DoorDash's data.

c. **Collision: No.** `doordash sql` returns interview pages plus DoorDash's own engineering blog post on SQL dialect translation. That post is not a product that competes for the query.

### 2. Interview format (Data Scientist, Analytics)
DoorDash has the most consistently reported format of the seven companies.

| Fact | What sources say | Source (date) |
|---|---|---|
| Roles | Data Science, Data Engineering, Data Analytics | DataLemur (May 8, 2025) |
| Stages | Recruiter screen → 60-min technical screen → final round of 4 interviews (cross-functional, HM, DS) | Exponent DS guide (updated ~2 months ago; "candidate reports") |
| Stages (alt) | Recruiter 30–45 min → technical 60 min → onsite 4–6 interviews | Prepfully (Oct 2025) |
| Technical screen split | **30 min SQL + 30 min product/marketplace case.** SQL is 50% of the screen. | Exponent guide; Exponent experience report; Blind (Jul 27, 2022) |
| Number of SQL questions | **4 questions in 30 minutes**, increasing difficulty | Exponent experience (submitted ~5 months ago; interview ~2 years earlier); Blind (2022): 4 solved in 24 min |
| Code execution | Code is **not run**; an executing environment may not be provided | Blind (2022); Exponent guide |
| Grading | Correctness only. One interviewer said explanations did not matter. | Exponent experience report |
| Docs allowed | Candidates may use internet/documentation | Prepfully (Oct 2025) |
| Live vs async | Live | all |
| Platform name | not reliably reported | — |
| Onsite SQL | "more SQL/analytics problems" in the onsite | Prepfully |

### 3. SQL topics (ranked)
1. Window functions: ranking (DENSE_RANK), FIRST_VALUE, NTILE, LEAD/LAG (Exponent, StrataScratch, Prepfully, DataLemur, experience report)
2. Date/time arithmetic: intervals, EXTRACT, month bucketing (StrataScratch, Prepfully, DataLemur)
3. Aggregation / GROUP BY / HAVING (all)
4. CTEs (Exponent, experience report, StrataScratch)
5. Joins, including LEFT vs INNER silently dropping rows (Exponent, StrataScratch)
6. Ratios/percentages with casting (StrataScratch)
7. Top-N per group (Exponent: top customer per month)
8. First-event per entity (StrataScratch: first order, first delivery rating)
9. NULL handling for cancelled/incomplete orders (StrataScratch)
10. Percentiles (PERCENTILE_DISC) and correlation (StrataScratch)

Difficulty: reported as **medium**, delivered fast (4 questions in 30 min). StrataScratch adds a few hard ones (percentiles, correlation).

### 4. Sample question shapes (paraphrased)
1. Deliveries table with order-placed, predicted-delivery and actual-delivery timestamps: for each month (YYYY-MM), the share of orders delivered more than 20 minutes after prediction. — https://www.stratascratch.com/blog/doordash-sql-interview-questions
2. Orders table (customer, restaurant, order total, timestamp): split restaurants into percentile buckets by monthly revenue and return the bottom 2%. — same
3. Orders table: top customer per month. Then repeat after excluding high-frequency customers (30+ orders in a month). Then high-frequency customers' share of total sales. — https://www.tryexponent.com/guides/doordash-data-scientist-interview
4. Orders + deliveries + customers: rate of bad experiences (late, missing, cancelled) among new customers' orders in their first 14 days. — https://datalemur.com/blog/doordash-sql-interview-questions
5. Deliveries with driver, completion time and rating: share of drivers whose first completed delivery got the lowest rating. — https://www.stratascratch.com/blog/doordash-sql-interview-questions

### 5. Domain data shape
Well supported: **orders** (customer, restaurant/merchant, totals, tip, discount, refund), **deliveries** (predicted vs actual timestamps, status), **dashers/drivers** (distance, rating, daily duration), **restaurants**. The case round is marketplace-framed (customer / dasher / merchant), e.g. cold food on arrival (Exponent experience).

**Recommendation:** Publish. Demand is clear, there is no collision, and the format is consistently reported (30-min, 4-question, non-executing SQL half of a 60-min screen), which makes an honest, specific page possible.

---

## LinkedIn

### 1. Demand check
a. **Dedicated pages: yes.**
- https://datalemur.com/blog/linkedin-sql-interview-questions (Apr 12, 2025)
- https://www.stratascratch.com/blog/linkedin-data-scientist-interview-questions/ (Oct 30, 2023)
- https://www.interviewquery.com/interview-guides/linkedin-data-scientist (snippet, not fetched)
- https://www.tryexponent.com/guides/linkedin-data-analyst-interview ("updated 4 months ago")
- https://prachub.com/interview-guide/linkedin-data-scientist-interview-guide (published Mar 17, 2026; updated Sep 3, 2026)

b. **Incumbent:** DataLemur (blog plus a company-tagged question page in the top results).

c. **Collision: partial, but not a data product.** `linkedin sql interview questions` is flooded with **linkedin.com/posts and /pulse articles**: generic "top 50 SQL questions" posts that are hosted on LinkedIn rather than about LinkedIn. About half of the top 10 results were linkedin.com posts. This dilutes the intent and will make ranking harder.

### 2. Interview format (DS / DA)
| Fact | What sources say | Source (date) |
|---|---|---|
| Roles | Data Analytics, Data Science, Data Engineering | DataLemur (Apr 2025) |
| DS technical screen | About 45 min: **SQL for 15–20 min, 2–3 problems, in a non-executable CoderPad editor**, plus 15–20 min of product-sense questions | Dan Lee, Medium / DataInterview (snippet; page not fetched, date not visible) |
| Python/R | Unlike most companies, LinkedIn may also ask data manipulation in Python or R | same (snippet) |
| DS screens (older) | Two technical screens: one SQL screen-share (two intermediate questions with follow-ups) and one case study. Onsite: intermediate SQL, R/Python, stats, A/B testing. | Blind (Feb 2018). Old; use only as corroboration. |
| DS (2026 aggregate) | Recruiter 20–30 → HM 30–60 → technical screen(s) 45–60 → loop of 4–5 × 45–60. Screens pair SQL with a case or with stats. Of 58 catalogued questions, **17% data manipulation (SQL/Python)** and 48% analytics/experimentation. | PracHub (updated Sep 3, 2026) |
| Staff DS | 6 rounds over 4 weeks. SQL was one part of one onsite round (simple outer join + counting) alongside Python. Stats/ML dominated. | SQLPad (Apr 29, 2024), single candidate |
| DA | Recruiter → HM → same-day final loop of 2–3 h (technical, culture, stakeholder). Technical round uses a shared editor or SQL tool with 2–3 small business tables. | Exponent DA guide (updated ~4 months ago) |
| Take-home | One Glassdoor question page describes a take-home on social-network data | Glassdoor (snippet, not fetched; date not visible) |
| Live vs async | Screens live; one take-home reported | as above |

### 3. SQL topics (ranked)
1. Joins, including outer joins (Dan Lee snippet, Exponent, SQLPad, StrataScratch, PracHub)
2. Aggregation / GROUP BY / HAVING / COUNT DISTINCT (Exponent, DataLemur, PracHub)
3. Window functions / ranking (Dan Lee snippet, PracHub, DataLemur)
4. Date arithmetic, e.g. within N days of signup (Exponent)
5. CTEs / subqueries (PracHub, StrataScratch)
6. Funnels / conversion (PracHub)
7. NULL handling (PracHub)
8. String matching on skill lists (DataLemur)

Difficulty: reported as **easy-to-medium, "intermediate"**. The Exponent DA guide stresses fundamentals over complex techniques.

### 4. Sample question shapes (paraphrased)
1. Candidate-skills table (candidate, skill; one row per skill): return candidates who have all three of a required set of skills. — https://datalemur.com/questions/matching-skills
2. Profiles table (profile, followers, employer) and companies table (company, followers): find people with more followers than their employer. — https://datalemur.com/blog/linkedin-sql-interview-questions
3. Projects (budget, start, end), employee-project link table, and employees (annual salary): flag projects whose prorated salary cost exceeds budget. — https://www.stratascratch.com/blog/linkedin-data-scientist-interview-questions/
4. Users (signup date, country) and subscriptions (plan, start date): count premium signups within 30 days of joining, by country. — https://www.tryexponent.com/guides/linkedin-data-analyst-interview
5. Social graph edges: find the two most-connected users who are not connected to each other (reported take-home). — Glassdoor question page via search snippet: https://www.glassdoor.com/Interview/Business-acumen-question-SQL-data-questions-to-test-the-data-analysis-skills-There-was-a-takehome-assignment-where-I-was-QTN_1974232.htm (not fetched)

### 5. Domain data shape
Supported: **connections/social graph**, **job applications per user per month**, **profiles and company followers**, **candidate skills**, **premium subscription funnels** (Exponent, PracHub). Feed engagement is not specifically supported by the sources I could read.

**Recommendation:** Publish, but at lower priority than DoorDash. Demand is real and the format is reasonably documented, but the SERP is crowded with generic linkedin.com posts, and the most specific format source (15–20 min SQL in CoderPad) could not be fetched and dated.

---

## Bloomberg

### 1. Demand check
a. **Dedicated pages: yes.**
- https://datalemur.com/blog/bloomberg-sql-interview-questions (Apr 17, 2025)
- https://datalemur.com/questions/sql-bloomberg-stock-min-max-1
- https://www.interviewquery.com/interview-guides/bloomberg-lp-data-analyst (snippet, not fetched)
- https://dataford.io/interview-guides/bloomberg/data-engineer (snippet, not fetched; "2026")
- https://medium.com/@lozhihao/ace-the-data-science-interview-day-32-bloomberg-sql-interview-question-a1189e0be8b3 (a walkthrough of the DataLemur question)

Also seen: a Glassdoor single-question page and a YouTube DataLemur walkthrough.

b. **Incumbent:** DataLemur (two of the top results).

c. **Collision: partial.** `bloomberg sql` returns **Bloomberg Query Language (BQL)** pages and the **Power Query Bloomberg Data and Analytics connector**, which now accepts SQL. With "interview questions" appended, the SERP is interview-intent. Low risk on the long query, real on the short one.

### 2. Interview format
| Fact | What sources say | Source (date) |
|---|---|---|
| DA stages | Application → online assessment (logic, English, Excel) → recruiter call → final round of 3–4 interviews including a **30–60 min data exercise on a messy financial-filings/corporate dataset** | OphyAI (updated Jun 3, 2026) |
| DA stages (alt) | HR → team leader (technical + business case) → team manager → possibly local manager | Glassdoor DA pages (snippet, not fetched) |
| Technical interview | About 1 h with an analyst or data team member, Python or SQL, possibly in a shared editor | InterviewQuery DA (snippet, not fetched) |
| Platform | HackerRank is reported for the **software-engineering** phone screen (code not run). It is **not reliably reported for data roles.** | interviewing.io / InterviewQuery (snippets) |
| DE | HR → two technical rounds → behavioral. First technical mixes DB discussion with Python. SQL depth not detailed. | InterviewQuery DE (snippet, not fetched) |
| SQL vs other | Glassdoor snippets: technical tests cover SQL, basic stats and Python/Pandas. OphyAI: "basic SQL and Excel". | as listed |
| Difficulty rating | Glassdoor DA 2.6–3.1 / 5 (varies by country page) | snippets |
| Duration of SQL portion | not reliably reported | — |

Sources disagree on whether the analyst OA is Excel/logic-based (OphyAI) or code-based (InterviewQuery snippet).

### 3. SQL topics (ranked)
1. Aggregation by time period (monthly/daily averages) (DataLemur ×3)
2. Joins, INNER vs LEFT explained with examples (InterviewQuery snippet, DataLemur)
3. Window functions / ranking (DataLemur stock min-max, RANK vs DENSE_RANK)
4. Filtering with date windows (DataLemur)
5. NULL handling (InterviewQuery snippet: listed as a common pitfall)
6. Second-highest value (DataLemur)

Difficulty: **easy-to-medium**. The DataLemur Bloomberg question is Medium, and Glassdoor examples are basic (filter by last name).

### 4. Sample question shapes (paraphrased)
1. Daily stock prices (date, ticker, open, high, low, close): for each ticker, the month with the highest and the month with the lowest opening price. — https://datalemur.com/questions/sql-bloomberg-stock-min-max-1
2. Terminal sessions (user, session start, session end): users with more than 1,000 sessions in the past 12 months. — https://datalemur.com/blog/bloomberg-sql-interview-questions
3. Trades table (trade, symbol, trade date, volume): average daily trading volume per symbol. — same
4. Customers (city, country) + exchange data subscriptions (exchange, start, end, status): US customers with an active subscription to a given exchange started in the last 30 days. — same
5. Messy dataset of corporate filings: find errors and propose a quality check. This is a data exercise, not strictly SQL. — https://ophyai.com/blog/company-guides/bloomberg-interview-guide

### 5. Domain data shape
Supported: **daily prices (OHLC)**, **trades/volume**, **terminal sessions**, **exchange data subscriptions**, **financial filings / corporate reference data** (OphyAI).

**Recommendation:** Defer. Demand exists, but the data-role format is thinly and inconsistently reported (Excel/logic OA vs SQL screen), and Bloomberg's analyst loop leans on data-quality exercises more than SQL. An honest page would say mostly "not reliably reported".

---

## Goldman Sachs

### 1. Demand check
a. **Dedicated pages: yes.**
- https://datalemur.com/blog/goldman-sachs-sql-interview-questions (Mar 14, 2025)
- https://www.interviewquery.com/interview-guides/goldman-sachs-data-analyst (snippet, not fetched)
- https://www.interviewquery.com/interview-guides/goldman-sachs-business-intelligence (snippet, not fetched)
- https://www.tryexponent.com/questions?company=goldman-sachs&role=data-analyst&type=sql (ranks, but **empty**)
- https://www.glassdoor.com/Interview/write-a-sql-query-that-eliminates-duplicated-there-is-no-unique-index-identifier-of-any-kind-that-is-present-QTN_357090.htm (single question; not fetched)

Also seen: two LinkedIn posts titled Goldman Sachs SQL interview questions, and a Medium post.

b. **Incumbent:** DataLemur. InterviewQuery has several role guides.

c. **Collision: No.** `goldman sachs sql` returns interview pages plus a SQL Developer jobs listing.

### 2. Interview format
| Fact | What sources say | Source (date) |
|---|---|---|
| Overall pipeline | **HackerRank OA → HireVue (recorded video) → CoderPad technical → Superday** | Exponent blog (published ~2 years ago); InterviewQuery DE (snippet) |
| HireVue | About 15 min, AI-conducted and recorded, 5 behavioral questions | Exponent blog |
| HackerRank OA | Mostly engineering-framed: 2 DSA questions + MCQs, 90–120 min (180 with a math section). **SQL not mentioned.** | linkjob.ai (Sep 24, 2025); graduatesfirst (snippet) |
| Analyst (experienced, 2024) | OA 120 min (2 medium coding) → CoderPad 1 h (strings + data aggregation) → technical 1 h (**SQL: remove duplicate records**) → technical 1 h (**SQL on employees/salaries/departments**) → HR | GeeksforGeeks interview experience (2024), single candidate |
| DA | Live SQL or shared-screen exercise on joins, filters, aggregation, basic window functions, plus data-cleaning / reconciling-sources scenarios | InterviewQuery DA (snippet, not fetched) |
| DS | Technical round like the coding round, plus statistics; heavy on DSA and lighter on practical questions | Exponent blog |
| DE | CoderPad, SQL, Spark, system design, behavioral. SQL often about cleaning history tables and recovering the latest value. | InterviewQuery DE (snippet) |
| Live vs async | OA and HireVue async; CoderPad and Superday live | Exponent; GfG |
| Company-published | Goldman publishes a HackerRank guide at https://www.goldmansachs.com/careers/blog/guide-to-hackerrank (seen in results, **fetch returned 403**, so contents unverified) | — |
| SQL share / duration | not reliably reported for data roles specifically | — |

### 3. SQL topics (ranked)
1. Deduplication / latest record per key (Glassdoor snippet, GfG 2024, InterviewQuery DE snippet, DataLemur)
2. Joins across 2–3 tables (GfG, InterviewQuery DA snippet, DataLemur)
3. Aggregation / GROUP BY / HAVING vs WHERE (DataLemur, GfG)
4. Window functions: running totals, latest-value recovery (DataLemur, InterviewQuery snippets)
5. Top-N (top 3 departments by average salary) (GfG)
6. Date-range "currently active" logic with start/end dates (GfG, DataLemur)
7. UNION / INTERSECT (GfG snippet on SQL set operations)
8. CTR ratios (DataLemur)

Difficulty: **easy-to-medium SQL** inside a process whose OA and CoderPad rounds are DSA-heavy.

### 4. Sample question shapes (paraphrased)
1. Table with accidental duplicate rows and no unique key: remove the extras and keep one copy of each. — GfG 2024: https://www.geeksforgeeks.org/interview-experiences/goldman-sachs-interview-experience-analyst-full-time-experienced-2024/ ; Glassdoor question page (snippet)
2. Employees (dept), salary history (salary, start, end) and departments: current salary for active employees, then the top 3 departments by average salary. — same GfG page
3. Sales (product, sale date, amount): running total of sales per product by month. — https://datalemur.com/blog/goldman-sachs-sql-interview-questions
4. Client transactions (client, date, asset type, amount invested): total invested per client per asset type per month. — same
5. Trades (client, date, client segment retail/corporate/institutional, amount): monthly average trade amount by segment. — same

### 5. Domain data shape
Supported: **client transactions by asset type**, **trades by client segment**, **salary history with effective dates**. Risk data is **not** supported by any source I read.

**Recommendation:** Publish, with honest framing. There is demand and no collision, and it sits in the finance family SQL Quest already covers. The page must say plainly that the HackerRank OA is reported as algorithm-heavy and that SQL shows up in the live technical rounds.

---

## Walmart

### 1. Demand check
a. **Dedicated pages: yes, the most crowded of the seven.**
- https://www.interviewquery.com/p/walmart-sql-interview-questions (snippet, not fetched; "2025")
- https://www.tryexponent.com/guides/walmart-data-analyst-interview ("updated 4 months ago")
- https://datalemur.com/questions/histogram-users-purchases
- https://sqlpad.io/questions/walmart/
- https://dataengineeracademy.com/blog/walmart-advance-sql-question/ (Mar 24, 2026)

Also seen: nextleap.app, entri.app ("30 Walmart SQL Interview Questions"), Dataford DA guide, Medium walkthroughs.

b. **Incumbent:** none dominant. InterviewQuery has two pages ranking; DataLemur and Exponent are close.

c. **Collision: No data product.** The short query `walmart sql` does return **Kaggle "Walmart sales dataset" SQL portfolio projects** (GitHub, GeeksforGeeks, Medium) and walmart.com SQL book listings. That is portfolio intent, not interview intent. With "interview questions" appended, the SERP is clean.

### 2. Interview format
| Fact | What sources say | Source (date) |
|---|---|---|
| Roles | Data Analyst, Data Engineer, BI Developer, Data Scientist | InterviewQuery (snippets) |
| DA stages | Recruiter screen (30–45 min) → virtual final panel of 4–5 rounds, 45–60 min each (technical, business, behavioral, HM). 2–6 weeks total. | Exponent DA guide (updated ~4 months ago, "by Walmart Labs candidates") |
| DA technical | Live, SQL-heavy. Queries written incrementally as requirements change. Python/Pandas less common and mostly in DS-leaning roles. | Exponent DA guide; InterviewQuery DA (snippet) |
| Platform | **HackerRank** assessment, "SQL only" per a reply (Blind, Jun 10, 2021). InterviewQuery (snippet): candidates describe a HackerRank with SQL and Python, 1–2 LeetCode-style problems, and a **CoderPad** exercise on transaction data. InterviewQuery DS (snippet): live or SQLPad-style environment. | as listed |
| DS | At least one round dedicated to SQL. A 2025 candidate reported 5 rounds (Python, SQL, case, DS technical, HM) with SQL at LeetCode easy/medium level. Possible take-home (forecasting/ML). | InterviewQuery DS (snippet, not fetched) |
| Live vs async | HackerRank OA async; panel live | as above |
| Duration of SQL round | 45–60 min panel slots (Exponent). The SQL-specific length is not reliably reported. | — |

The sources agree on platform (HackerRank) only partly: Blind says SQL only, InterviewQuery says SQL plus Python.

### 3. SQL topics (ranked)
1. Joins, multi-table (Exponent, InterviewQuery snippets ×2)
2. Aggregation / GROUP BY / HAVING, e.g. revenue threshold (Exponent, DataLemur, DEA)
3. Window functions (Exponent, InterviewQuery DS snippet)
4. Top-N per group (InterviewQuery snippet: top product per region; DEA: top customers)
5. Latest record per user (DataLemur)
6. CTEs / subqueries (InterviewQuery snippet)
7. Date logic, e.g. since last restock or out-of-stock days (Exponent, DEA)
8. Query optimisation (InterviewQuery DS snippet, DEA)

Difficulty: entry level is foundational (2–3 tables). DS/DE is reported as **medium, "not analyst-level"** (InterviewQuery DS snippet).

### 4. Sample question shapes (paraphrased)
1. Transactions (user, product, spend, timestamp): for each user's most recent transaction date, the number of products bought that day. — https://datalemur.com/questions/histogram-users-purchases
2. Sales and restock events per product: total sales for each product since its most recent restock. — https://www.tryexponent.com/guides/walmart-data-analyst-interview
3. Orders/sales by region and product: top-selling product in each region by revenue over the past month. — InterviewQuery (snippet, not fetched): https://www.interviewquery.com/p/walmart-sql-interview-questions
4. Daily inventory levels per product: products out of stock on 15 or more days in the past month. — https://dataengineeracademy.com/blog/walmart-advance-sql-question/ (illustrative, **not** candidate-attributed)
5. Phone call log (caller, recipient, timestamp): callers whose first and last call of a day went to the same person. Posted as a Walmart Labs senior DA question on a code-sharing site with no date. — https://www.mycompiler.io/view/5wmsyWj4TsZ (weak provenance)

### 5. Domain data shape
Supported: **orders/sales by product, category and region**, **inventory/restock and out-of-stock days**, **store revenue**, **customer transactions**. Supply chain and eCommerce experimentation appear only in InterviewQuery framing (snippet).

**Recommendation:** Publish. Demand is strong with no single owner, there is no product collision on the interview query, and the retail data shape is a good fit for challenges. The page should state the HackerRank SQL-only vs SQL+Python disagreement.

---

## TikTok

### 1. Demand check
a. **Dedicated pages: yes.**
- https://www.interviewquery.com/p/tiktok-sql-interview-questions (snippet, not fetched)
- https://datalemur.com/blog/tiktok-sql-interview-questions (Jan 5, 2025)
- https://datalemur.com/questions/second-day-confirmation
- https://www.tryexponent.com/guides/tiktok-data-scientist-interview ("updated 3 months ago")
- https://medium.com/@lozhihao/ace-the-data-science-interview-day-22-tiktok-sql-interview-question-feec271b47d6

Also seen: IGotAnOffer (403), Prepfully, a Nick Singh LinkedIn post, a StrataScratch YouTube video.

b. **Incumbent:** InterviewQuery ranks first on the exact query, with DataLemur holding two positions right behind. It is a split.

c. **Collision: No.** `tiktok sql` returns interview pages plus noise: forensic SQL queries, an ERP integration doc, and a Hightouch sync page. No competing data product.

### 2. Interview format
| Fact | What sources say | Source (date) |
|---|---|---|
| Roles | Data Scientist, Data Analyst, Data Engineer | InterviewQuery (snippet); DataLemur |
| DS stages | Recruiter screen (~30 min) → HM screen → technical loop of 3–4 rounds (~45 min each) + 1–2 behavioral → final HM. 3 weeks to 2 months. All virtual. | Exponent DS guide (updated ~3 months ago; candidate reports + 1 TikTok DS) |
| DS stages (alt) | Recruiter 30–45 min → **technical screen 45–60 min, 1–2 rounds, on HackerRank** (SQL, data structures, probability, stats) → onsite of two 45-min virtual interviews (product analytics, case, behavioral) | DataLemur DS guide (updated Jan 5, 2025) |
| DA stages | HR → technical → technical → manager → team head. Live SQL. One reported round had **five SQL exercises**; a second technical sometimes adds a medium Python problem. | InterviewQuery DA (snippet, not fetched) |
| DA screen | **30-min live HackerRank** screen: standard joins and window functions, plus a basic case study | Blind (Feb 6, 2022) |
| Take-home | Possible product-analytics take-home (unconfirmed) | Exponent |
| Difficulty | Coding questions described as LeetCode medium-to-hard SQL or Python. Glassdoor DA 3/5. | InterviewQuery (snippets) |
| SQL vs other | DS loop covers SQL, product sense, A/B testing, stats, ML, and sometimes DSA. DataLemur's 22-question guide has only 2 of 22 as SQL. | Exponent; DataLemur DS guide |
| Live vs async | Live | all |

The sources agree on HackerRank (DataLemur 2025, Blind 2022) and on live SQL. Round counts differ by role and source.

### 3. SQL topics (ranked)
1. Joins, multi-table (Exponent, Blind, InterviewQuery snippets, DataLemur)
2. Window functions (Blind, InterviewQuery snippets, DataLemur: top video per user per day)
3. Aggregation / GROUP BY + filtering (InterviewQuery snippet, DataLemur)
4. Date logic, e.g. day-2 confirmation or per-day grouping (DataLemur, InterviewQuery snippet)
5. Ranking / top-N (DataLemur: top 5 users by likes)
6. Cohort segmentation / creator retention (InterviewQuery snippet)
7. Rates/percentages, e.g. activation rate (DataLemur)
8. Tie-breaking (DataLemur: first uploaded wins)

Difficulty: **medium**, with some reports of medium-to-hard. The DataLemur signup-confirmation question is rated Easy.

### 4. Sample question shapes (paraphrased)
1. Signups (email id, user, signup date) + text confirmations (email id, action confirmed/not, action date): users who did not confirm on day 1 but did on day 2. — https://datalemur.com/questions/second-day-confirmation
2. Same two tables: overall activation rate (share of signups ever confirmed), rounded. — https://datalemur.com/blog/tiktok-sql-interview-questions
3. Videos (user, video, upload date, likes): each user's most-liked video per day, earliest upload winning ties. — same
4. Users + videos: power users with 1,000+ uploads, ordered by upload count. — same
5. Creator activity over time: compare engagement or retention across creator cohorts using window functions. — InterviewQuery (snippet, not fetched): https://www.interviewquery.com/p/tiktok-sql-interview-questions

### 5. Domain data shape
Supported: **videos** (duration, likes, upload date), **user interactions** (watched duration, likes), **signup/confirmation events**, **creator cohorts/retention** (InterviewQuery snippet). Monetization signals are mentioned only in InterviewQuery framing.

**Recommendation:** Publish. There is clear demand, no collision, and two independent sources a few years apart (Blind 2022, DataLemur 2025) agree on a live HackerRank SQL screen.

---

## Summary

| Company | Demand | Incumbent | Collision | Platform | Duration | Top 3 topics | Recommend |
|---|---|---|---|---|---|---|---|
| Microsoft | yes | DataLemur | **yes: SQL Server / DBA intent fills the exact query** | disputed: Codility OA (IQ snippet) vs CodeSignal (DataLemur) vs live-only (Exponent) | tech screen 45 min; loop 4–5 × 45–60 min | joins, aggregation, window functions | **no** (as "Microsoft SQL…"; maybe role-qualified later) |
| DoorDash | yes | DataLemur / StrataScratch (split) | no | live, non-executing editor (name not reported) | 30-min SQL (4 Qs) inside a 60-min screen | window functions, date/time, aggregation | **yes** |
| LinkedIn | yes | DataLemur | partial: SERP crowded by generic linkedin.com posts | CoderPad, non-executable (snippet); shared editor (Exponent) | 45-min screen, SQL 15–20 min (2–3 Qs) | joins, aggregation/HAVING, window functions | **yes** (lower priority) |
| Bloomberg | yes | DataLemur | partial: BQL / Bloomberg Data & Analytics SQL connector on short query | not reliably reported for data roles | ~1 h technical; 30–60 min data exercise | time-bucketed aggregation, joins, window/ranking | **no** (defer; format too thin) |
| Goldman Sachs | yes | DataLemur | no | HackerRank OA (DSA-heavy) → HireVue → CoderPad → Superday | OA 90–120 min; CoderPad/technical 1 h | deduplication/latest record, joins, aggregation | **yes** |
| Walmart | yes | none dominant (InterviewQuery ×2) | no product (short query pulls Kaggle Walmart-dataset projects) | HackerRank (SQL-only vs SQL+Python disputed); CoderPad reported | panel 4–5 × 45–60 min | joins, aggregation/HAVING, window functions | **yes** |
| TikTok | yes | InterviewQuery / DataLemur (split) | no | HackerRank, live | DS screen 45–60 min; DA screen 30 min | joins, window functions, aggregation | **yes** |
