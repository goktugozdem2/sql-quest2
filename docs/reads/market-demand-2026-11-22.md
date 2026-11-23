# Demand and market read: SQL vs adjacent skills, competitor prices, gaps (2026-11-22)

Web research only, read 2026-11-22. No customer data used. Each fact comes
from a page opened today; the URL is in the source list (S1, S2, …). Facts
seen only in search snippets are marked **snippet only** and are not used for
conclusions. 403 and 429 answers were not retried with another tool (see §6).

Confidence: **High** means a primary or vendor page, read directly, with a
clear method or price. **Medium** means read directly, but the method is thin,
the sample small, or the page ambiguous. **Low** means indirect, inferred or
partial.

This read does not repeat `docs/reads/monetization-competitors-2026-11-22.md`
(DataLemur and StrataScratch prices) or `playbooks-research-2026-11-22.md`
(comparables, B2B2C). Those figures are cited from there.

---

## 1. Demand: SQL vs adjacent skills in hiring (2025–2026)

### 1.1 Job-posting studies

None of these is a census. Each one counts mentions in postings (required and
nice-to-have together). They measure how often a skill is **named in a
posting**, not how often it is tested in an interview.

**Data analyst, 365 Data Science (S1).** "The Data Analyst Job Market in
2026", published 28 Apr 2026. 1,000 Indeed USA postings, narrowed to 855; the
collection dates are not stated. Confidence: **Medium** (vendor study, method
partly stated).

| Skill | Share of postings |
|---|---|
| SQL | 52.9% |
| Excel | 50.5% of postings that mention MS Office (not of all postings) |
| Python | 31.2% |
| Power BI | 29% |
| Tableau | 26.2% |
| R | 24.9% |
| Data visualisation (generic) | 20.7% |
| Statistical analysis | 11.9% |
| SAS | 11.8% |
| ETL | 9.2% |
| Machine learning | 7.4% |
| GCP | 6.9% |
| Azure | 4.1% |
| AWS | 2.9% |
| Looker | 2.6% |

**Data analyst, InterviewStack.io (S2).** Dev.to post, May 2026: 2,585 active
"Data Analyst" postings on one job board, with synonyms merged. The country
and dates are not stated. Confidence: **Medium-low**, because the author sells
interview prep and the sample is one board.

| Skill | Share of postings |
|---|---|
| SQL | 72% |
| Python | 53% |
| Power BI | 40% |
| Tableau | 40% |
| Statistics | 38% |
| Excel | 35% |
| A/B testing | 7% |

R is not reported separately.

**Data scientist, 365 Data Science (S3).** Published 28 Apr 2026. 1,000
Monster postings, narrowed to 827; the country is not stated. Confidence:
**Medium**.

| Skill | Share of postings |
|---|---|
| Machine learning | 69.3% |
| Python | 56.7% |
| R | 33% |
| SQL | 30.4% |
| AWS | 19.7% |
| Statistics (as a required background) | 17.2% |
| Azure | 14.3% |
| Spark | 11.7% |
| Tableau | 11.5% |
| Excel | 10.1% |
| Power BI | 9.1% |

The page says Python was 78% and SQL 60% "last year". A halving of SQL in one
year is implausible, so treat the year-on-year change as **Low**.

**BI and business analytics roles, Vancouver (S4).** SFU "Business Analytics
Skills Snapshot", 2026-09-22. 29 core postings, mostly from LinkedIn, in Metro
Vancouver. It calls itself "a one-day directional snapshot". Confidence:
**Low**, because n=29.

| Skill | Postings | Share |
|---|---|---|
| SQL | 23 of 29 | 79% |
| Power BI | 23 of 29 | 79% |
| Python and/or R | 14 of 29 | 48% |
| Excel + Power Query | 13 of 29 | 45% |
| DAX | 5 of 29 | 17% |

**Product analyst:** no posting study isolating this title was found and
opened. Gap in this read.

### 1.2 Stack Overflow Developer Survey 2025 (S5)

Confidence: **High** (primary source). The survey's population is
developers, not analysts, and the page has no data-scientist segment.

| Group | SQL | Python | JavaScript | PostgreSQL (databases section) |
|---|---|---|---|---|
| All respondents | 58.6% | 57.9% | 66% | 55.6% |
| Professional developers | 61.3% | 54.8% | 68.8% | 58.2% |

The page says Python "saw a 7 percentage point increase from 2024 to 2025".

### 1.3 BLS Occupational Outlook Handbook, 2025–35 projections (S6–S8)

Confidence: **High**. BLS has no "data analyst" occupation; analysts are
spread across these three and others.

| Occupation | Median pay (May 2025) | Jobs (2025) | Growth 2025–35 | Openings per year |
|---|---|---|---|---|
| Data scientists | $120,230 | 275,600 | **+35%** (+95,400) | ~24,800 |
| Operations research analysts | $88,940 | 113,100 | +12% (+13,500) | ~7,500 |
| Market research analysts | $78,760 | 952,700 | +7% | ~82,000 |

BLS's data-scientist page names no languages. It mentions "data-oriented
programming languages" and "statistical, database, and other software".

### 1.4 Demand ranking of the adjacent skills for analyst roles

This is my synthesis of S1, S2 and S4. Confidence: **Medium** on the order,
**Low** on the gaps between neighbours.

1. **SQL** is the anchor: 53–79% of analyst postings, first or tied first in
   every analyst study.
2. **Excel**: 35–50% (S1's figure is out of MS Office mentions only).
3. **Python**: 31–53% for analysts, 57% for data scientists. It is the
   fastest-moving signal in the developer survey (+7 pts).
4. **Power BI**: 29–40% for analysts, 79% in BI-titled roles (small sample).
   It is ahead of Tableau in S1 and tied in S2.
5. **Tableau**: 26–40%.
6. **Statistics**: 12–38%; definitions differ widely between studies.
7. **R**: about 25% for analysts, 33% for data scientists.
8. **A/B testing** as a named skill: 7% of data-analyst postings (S2 only).

---

## 2. Competitors and what they charge (USD, read 2026-11-22)

### 2.1 Price table

Legend for "What it sells": P = practice (auto-graded unless noted), C =
courses, Cert = certificate, H = human mocks or coaching, R = resume review,
T = team/B2B plan, AI = AI interviewer or tutor.

| Product | Free | Monthly | Annual | One-time / lifetime | What it sells | Conf. |
|---|---|---|---|---|---|---|
| **DataLemur** | — | $15 | $60 | $300 (coaching + book + lifetime) | P, C, H (in the $300 tier) | High (from the existing 11-22 read) |
| **StrataScratch** | $0, 50 AI credits | $24 | $139 | $289 lifetime (30% code banner) | P (SQL, Python, ML), concept and "open product cases scored on structured thinking", T via sales (students up to 20% off) | High (from the existing read) + S9 |
| **Interview Query** | — | — | — | — | Not read: **429** today, here and in the earlier session | — |
| **LeetCode Premium** | — | — | — | — | Not read: **403** | — |
| **Aced (formerly Exponent)** | $0 (5 peer mocks/mo) | Pro $12/mo shown next to $79/mo ("Save 70%"); Expert (AI) $20/mo next to $99/mo | toggle present, totals not shown | none | C (SQL Interviews, Data Science, Product Analytics), P, peer mocks, AI (Expert), H sold separately (60-min sessions, prices not shown), university and business pages | Medium (the toggle state behind $12/$79 is unclear) — S10, S11, S12 |
| **DataCamp** | Basic $0 | Premium "$5/month, billed annually"; Teams $11/user/mo billed annually | not shown | — | C, P (exercises), Cert ("industry-leading certifications"), T, Enterprise; no interview prep mentioned. Page also shows unexplained "$13" and "$28" "Special Price" labels | **Low** (page ambiguous) — S13 |
| **Analyst Builder** (Alex Freberg) | $0 | $34 | $20.75/mo billed annually (≈$249/yr, my arithmetic) | none shown | P (technical questions), C (SQL, Excel, Pandas, Python, Tableau, Power BI), Cert | Medium — S14 |
| **Let's Data Science** (Python/pandas + SQL practice) | $0: 250 graded problems (124 Python) | $14.99 | $119.99 | none | P: 1,634 graded problems (814 Python, 820 SQL), C with certificates, AI mentor | Medium (how and where grading runs is not stated on the page; "Pyodide in browser" is **snippet only**) — S15 |
| **Maven Analytics** | $0 (assessments, portfolio) | $20 | $399/yr; Black Friday $239 first year | Lifetime offered, price not shown | C, graded skills assessments, badges and credentials, live workshops, T $39/seat/mo ($468/yr, 2-seat minimum), Enterprise | High — S16 |
| **Google Data Analytics Cert (Coursera)** | 7-day trial | $49/mo after trial (US/CA); "most learners pay less than $300" | Coursera Plus | — | C + Cert; 9 courses, "6 months at 10 hours a week"; course 9 covers job search and interviews with AI; 3,926,029 enrolled, 4.8 from 183,057 reviews | High — S17 |
| **Microsoft PL-300** (Power BI Data Analyst) | Free Microsoft practice assessment + exam sandbox | — | — | Exam fee "based on the country", not shown | Cert: 100-minute proctored exam, renews every 12 months via a free online assessment. MeasureUp practice test **403** (its $99 list price is snippet only) | High on facts read — S18 |
| **Wall Street Prep** | — | — | — | Premium Package **$499**; Excel Crash Course **$39**; private tutoring **$800/hour** | C (7 courses, ~46 h, Excel templates), Cert (final exams), optional resume inclusion; no guarantee stated on the page | High — S19, S20 |
| **Breaking Into Wall Street** | — | — | Platinum 1-year plan **$497/yr** | Platinum **$1,497** single payment ($997 Cyber Week to Nov 30); Premium $691 ($497 sale); IB Interview Guide $197 (17 Excel case studies); Excel & VBA $197; Core FM $297 | C with Excel case studies and "real-life modeling tests", Group Licenses (T), 90-day money-back guarantee | High — S21, S22, S23 |

### 2.2 Human mock interviews and coaching (Prepfully, Meta data-analyst coaches page)

Confidence: **High** for what is listed (S24). Ten coaches; the page shows two
prices per coach and does not label them. Session length is not stated.

| Coach role | Lower price | Higher price |
|---|---|---|
| Data Analyst @ Meta | $99 | $119 |
| Data Analyst @ Google | $119 | $139 |
| Product Analytics Manager @ Meta | $179 | $249 |
| Data Analyst @ Amazon | $219 | $239 |
| Product Data Analyst @ Meta | $279 | $349 |

Across all ten coaches the range is **$99–$279** on the lower price, or
$139–$349 if the second price is the one that applies.

### 2.3 Who sells what (from the rows above)

| What | Who |
|---|---|
| Practice only, or mostly practice | DataLemur, StrataScratch, Let's Data Science |
| Courses + practice | Analyst Builder, Aced, Maven, DataCamp |
| Certificates | Google/Coursera, DataCamp, Maven credentials, Wall Street Prep, Microsoft |
| Human mocks or coaching | DataLemur ($300 tier), Aced (separate), Prepfully (marketplace), Wall Street Prep tutoring ($800/h) |
| Resume | Wall Street Prep "resume inclusion" (only one seen); Breaking Into Wall Street lists resume editing with no price |
| Team / B2B | DataCamp, Maven, Breaking Into Wall Street, Aced (pages only), StrataScratch (sales) |

---

## 3. What this audience pays for

- **Practice subscriptions cluster at $12–$34 a month and $60–$249 a year**
  (§2.1). SQL Quest's $29 / $99 sits high on monthly and in the middle on
  annual. Confidence: High.
- **Human mock interviews:** **$99–$279 per session** with a data-analyst or
  product-analytics coach from a named company (S24, Prepfully).
  - Wall Street Prep tutoring is $800/hour (S19).
  - DataLemur bundles founder coaching into a $300 one-time tier (existing
    read).

  Confidence: High.
- **Certificates:**
  - Google Data Analytics on Coursera: $49/month, "less than $300" for most
    learners (S17).
  - Wall Street Prep's certification package: $499 one-time (S19).
  - The PL-300 exam fee was not read (country-priced, S18).

  Confidence: High for the first two.
- **Bootcamps:**
  - Course Report (updated 2025-10-24, S25): data-science bootcamps "$7,000
    to $18,000". Its two data-analytics programs are Ironhack $12,000
    (9 weeks) and Coding Temple $13,500 (10 weeks).
  - Noble Desktop (updated 2026-04-23, S26):
    - Noble's own certificate: $4,995–$5,000 (156 hours);
    - General Assembly Data Analytics Immersive: $16,500 (12 weeks);
    - Fullstack Academy: about $15,000;
    - short classes: $1,500–$2,000.

  Confidence: High that these are the listed prices. Noble is a seller, so
  read its framing with care.
- **Lifetime or one-time vs subscription** (all from today's reads):

  | Product | One-time or lifetime | Subscription alongside |
  |---|---|---|
  | StrataScratch | $289 lifetime, with a standing 30% code | yes |
  | DataLemur | $300 one-time (with coaching) | yes |
  | Breaking Into Wall Street | Platinum $1,497 ($997 on sale) | $497/yr plan |
  | Wall Street Prep | $499 one-time | no subscription seen |
  | Maven | lifetime offered, price hidden | yes |
  | Aced, Let's Data Science, Analyst Builder | none | subscription only |

  - Pattern: one-time pricing is the norm for finance-modelling prep and an
    add-on for SQL practice.
  - Whether buyers choose it cannot be read from the outside.
  - SQL Quest's own $199 lifetime sold zero (CLAUDE.md, internal).

  Confidence: High on what is offered, none on the uptake.

---

## 4. Gaps: which adjacent area has the weakest interactive, auto-graded practice

The method here is targeted searches plus the pages I opened. Absence of
evidence is not proof, so the conclusions are **Medium-low**.

| Area | Interactive auto-graded offers found today | Gap |
|---|---|---|
| **Power BI / DAX (PL-300)** | <ul><li>W3Schools: "multiple choice and fill in the blanks", 50 topics (S27).</li><li>Microsoft's free practice assessment and exam sandbox (S18).</li><li>MeasureUp and Udemy practice tests are multiple-choice (snippet only).</li><li>No product found where you write a DAX measure against a model and get it graded. Enterprise DNA's workouts page 404'd; SQLBI dax.do is a sandbox (snippet only).</li></ul> | **Weakest.** Demand: 29–40% of DA postings, 79% of the BI snapshot. It is a dated, named exam that renews yearly. The barrier is technical: there is no DAX engine in the browser, so grading would need a JS evaluator over a small model, or graded MCQ/scenario questions. |
| **Excel modelling tests (IB/PE/FP&A)** | <ul><li>SpreadsheetCenter: 160+ in-browser exercises, "everything is free right now", generic (S28).</li><li>JobTestPrep: interactive Gmetrix MS-Office-style simulations, one year or 100 uses, price not shown (S29).</li><li>Breaking Into Wall Street and Wall Street Prep sell video courses with downloadable Excel case studies and "modeling tests" ($39–$1,497), not graded in a browser (S19–S23).</li></ul> | **Very weak at the high end.** No in-browser, figure-graded IB modelling test was found. Willingness to pay is the highest seen: $497–$997 packages, $800/h tutoring. It is a different buyer from SQL Quest's. |
| **Statistics / A/B testing** | <ul><li>StrataScratch: concept questions and "open product cases scored on structured thinking" (S9).</li><li>Dataford, Testlify, Interview Query AI interviewers: **snippet only** (Dataford and Interview Query answered 429).</li></ul> | Medium. Most offers are free-text graded by AI. Numeric items (sample size, p-value, power, CI) could be auto-graded exactly; nobody was seen doing that as a product. |
| **Product-analytics case interviews** | <ul><li>Aced Product Analytics course (content not readable today, S10).</li><li>StrataScratch open product cases (S9).</li><li>Human coaches at $99–$279 (S24).</li></ul> | Weak by nature: answers are open-ended. The market serves it with humans and AI, and buyers pay for humans. |
| **Python / pandas** | <ul><li>Let's Data Science: 814 graded Python problems, $14.99/mo (S15).</li><li>StrataScratch: Python questions (S9).</li><li>Analyst Builder: Pandas courses (S14).</li></ul> | **Smallest gap**: it is contested. It is still the most transferable for SQL Quest (same buyer, Pyodide, output-table grading). Differentiation would come from company mocks, diagnosis and the Skillmap, not from the existence of practice. |

---

## 5. Three openings for SQL Quest (ranked)

1. **Python/pandas inside SQL Quest, same buyer.**
   - Demand is second only to SQL for analysts (31–53%, S1/S2) and leads
     for data scientists (57%, S3). Python is up 7 points among developers
     (S5).
   - The space is contested at $15–$34/mo (S14, S15, existing StrataScratch
     read). So it is a module and retention lever inside the current
     product, not a standalone app.
   - The playbook's test (10 questions plus a waitlist) fits.
   - Confidence: Medium.
2. **PL-300 / DAX graded practice.**
   - Power BI is in 29–40% of analyst postings and 79% of BI-titled roles
     (S1, S2, S4).
   - The exam is dated, named and renews every 12 months (S18).
   - The practice on the market is multiple-choice or fill-in (S27, S18);
     no write-and-grade DAX product was found.
   - Risk: building a DAX evaluator.
   - Confidence: Medium-low.
3. **A priced human or premium mock tier on top of the subscription.**
   - Buyers pay $99–$279 per session for an analyst mock (S24).
   - DataLemur's top tier is a $300 one-time with coaching (existing read).
   - Wall Street Prep charges $800/h (S19).
   - SQL Quest has no tier above $99/yr, and the founder-led session is the
     cheapest test (no build).
   - Confidence: Medium.

**Also strong but a different buyer:** Excel modelling tests. This is the
highest willingness to pay seen ($497–$1,497, S21–S23), and no in-browser
graded modelling test was found. It means a new audience (finance) and new
SEO.

---

## 6. Sources (all read 2026-11-22)

| # | URL | Supports |
|---|---|---|
| S1 | https://365datascience.com/career-advice/the-data-analyst-job-market/ | DA skill shares (Indeed US, n=855, 28 Apr 2026) |
| S2 | https://dev.to/gnana_6392e836fd500a957dc/data-analyst-skills-companies-want-in-2026-2500-posting-analysis-2518 | DA skill shares (n=2,585, May 2026, vendor author) |
| S3 | https://365datascience.com/career-advice/data-scientist-job-market/ | DS skill shares (Monster, n=827) |
| S4 | https://www.sfu.ca/~mjbrydon/other/Business%20Analytics%20Skills%20Snapshot.html | BI/BA snapshot, Vancouver, n=29, 2026-09-22 |
| S5 | https://survey.stackoverflow.co/2025/technology | SQL/Python usage, Python +7 pts |
| S6 | https://www.bls.gov/ooh/math/data-scientists.htm | DS pay, jobs, +35% 2025–35 |
| S7 | https://www.bls.gov/ooh/math/operations-research-analysts.htm | ORA +12% |
| S8 | https://www.bls.gov/ooh/business-and-financial/market-research-analysts.htm | MRA +7% |
| S9 | https://www.stratascratch.com/ | Python questions, concept and product cases, 1000+ questions, 750k members |
| S10 | https://www.aced.io/ (tryexponent.com 301s to aced.io) | Exponent renamed Aced; SQL, DS, Product Analytics courses |
| S11 | https://www.aced.io/upgrade | Aced plans $0 / $12 / $20 (vs $79 / $99), 5-day refund |
| S12 | https://www.aced.io/coaching | 60-min coaching, no prices shown |
| S13 | https://www.datacamp.com/pricing | DataCamp $5/mo billed annually, Teams $11 (ambiguous labels) |
| S14 | https://www.analystbuilder.com/pricing | $34/mo, $20.75/mo annual, Pandas/Excel/Power BI courses |
| S15 | https://letsdatascience.com/pricing | $14.99/mo, $119.99/yr, 814 Python + 820 SQL graded problems |
| S16 | https://mavenanalytics.io/pricing | $20/mo, $399/yr ($239 BF), Teams $39/seat/mo, lifetime exists |
| S17 | https://www.coursera.org/professional-certificates/google-data-analytics | $49/mo, <$300 typical, 3.9M enrolled |
| S18 | https://learn.microsoft.com/en-us/credentials/certifications/power-bi-data-analyst-associate/ | PL-300: 100 min, DAX/Power Query, 12-month renewal, free practice assessment, country-based fee |
| S19 | https://wallstreetprep.com/self-study-programs/premium-package | $499 package, $800/h tutoring |
| S20 | https://www.wallstreetprep.com/self-study-programs/excel-crash-course/ | Excel Crash Course $39 |
| S21 | https://breakingintowallstreet.com/breaking-into-wall-street-courses/ | Breaking Into Wall Street prices ($1,497 / $997 / $497/yr / $197 …) |
| S22 | https://breakingintowallstreet.com/pricing/ | 90-day guarantee, group licences |
| S23 | https://breakingintowallstreet.com/biws-platinum/ | Cyber Week $500 off Platinum |
| S24 | https://prepfully.com/coaches/meta/data-analyst | Human mock prices $99–$279 (or $139–$349) |
| S25 | https://coursereport.com/blog/data-science-bootcamp-cost-comparison | Bootcamps $7k–$18k; DA bootcamps $12,000 / $13,500 (updated 2025-10-24) |
| S26 | https://www.nobledesktop.com/blog/how-much-do-live-online-data-analytics-bootcamps-cost | DA certificate $5k, GA $16,500, Fullstack ~$15k (updated 2026-04-23) |
| S27 | https://www.w3schools.com/powerbi/powerbi_exercises.php | DAX exercises are MCQ and fill-in |
| S28 | https://spreadsheetcenter.com/ | 160+ in-browser Excel exercises, free |
| S29 | https://jobtestprep.com/advanced-excel-test | Interactive Gmetrix Excel simulations, one year / 100 uses |
| — | docs/reads/monetization-competitors-2026-11-22.md | DataLemur and StrataScratch prices (not re-fetched) |

### Not read (final, not retried through another tool)

| URL | Result |
|---|---|
| https://www.interviewquery.com/pricing | 429 (also 429 in the earlier session today) |
| https://leetcode.com/subscribe/ | 403 |
| https://www.measureup.com/microsoft-practice-test-pl-300-microsoft-power-bi-data-analyst.html | 403 |
| https://igotanoffer.com/en/mock-interviews/data-analysis | 403 |
| https://www.datainterview.com/pricing | 429 |
| https://dataford.io/pricing | 429 |
| https://interviewing.io/pricing | 404 |
| https://www.tryexponent.com/pricing → aced.io/pricing | 404 |
| https://www.wallstreetprep.com/self-study-programs/ | 404 |
| https://enterprisedna.co/workouts/dax | 404 |
| https://datanerd.tech/ | opened; no skill percentages on the landing page |
