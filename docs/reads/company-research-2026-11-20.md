# Company SQL interview research — PayPal, Coinbase, Monzo (built); Robinhood, Klarna, Adyen (deferred)

Research of 2026-11-20 by two research agents; every source cited on a page was fetched that day. PayPal's fourth sample shape (a rides table) was dropped before shipping: it could not be confirmed as a PayPal question. Brand accents are from memory, not fetched.

# Company SQL interview research — Robinhood, Coinbase, PayPal

All sources were accessed on 2026-11-20 unless noted. "Page date" is the date the page itself showed. Relative dates such as "updated 2 months ago" are copied as shown, together with the day I read them.

## Read these caveats first

- **Blocked all session:** InterviewQuery (429), datainterview.com (429), 1point3acres (403), Glassdoor (403), AmbitionBox (403) and LeetCode Discuss (403). **Blind now returns HTTP 402 (paywall)** on post and company pages. That is new since 2026-09-13, when Blind was usable, so Blind can no longer serve as a fetched source. Anything attributed to these sites below is *(snippet, not fetched)* and is not used in the data entries.
- **The richest first-person material for Robinhood and Coinbase sits on 1point3acres.** There are six or more 2025–26 Robinhood data-science phone-screen threads and eight or more Coinbase threads. I could read only their titles. That is the single biggest gap, and a human with a browser can close it.
- **PracHub "interview-experiences" pages are first-person candidate reports** with editing by PracHub ("Curated and edited by PracHub"). Each shows an interview month and a publish date, and I cite both. PracHub "interview-guide" pages are the site's own editorial. They state formats with "usually"/"typically" and cite no outside source. I use them only for process outlines and say "a prep guide" on the page.
- **tryexponent.com/blog/* now 301-redirects to aced.io.** Exponent's Coinbase process page is cited at its current aced.io URL. The Robinhood Exponent guide was read as Yale SOM's republication, which says it "was originally published on Exponent" and was "created with the help of a Robinhood interviewer".
- **DataLemur's company-tagged questions have no dates or candidate trail.** As before, they show the *shape* of a question, not proof that the company asked it.
- **Calibration against Wise and Revolut.** All three companies have a dedicated DataLemur page, plus InterviewQuery and PracHub pages. One search (`datalemur Revolut OR Wise SQL interview questions`) found **no** DataLemur page for Revolut or Wise. So "more pages like Wise and Revolut" is not a clean analogy. These SERPs have a strong incumbent that the two winners may not have had. On 2026-09-09 (`docs/reads/company-page-candidates-2026-09-09.md`) Robinhood was rejected for exactly this reason: six fresh incumbents, including DataLemur.
- **Content fit (from the repo, not the web).** The bank has no brokerage or trades table and no crypto table. Its fintech shapes are `finans_banking` (FDIC), `finans_fraud` (card transactions, merchants, chargebacks, fraud) and `finans_neobank`, whose 300–311 set is Revolut-only by rule. PayPal maps onto `finans_fraud` honestly. Coinbase and Robinhood pages would be topic practice ("tagged by topic … not modelled on X's interview"), the same way the DoorDash page uses generic challenges.
- **Search volume is not measured.** "Demand" below means dedicated pages exist in results, which is the same proxy the 09-13 read used. GSC cannot show volume for companies we have no page for.

---

## PayPal

### 1. Demand check
a. **Dedicated pages: yes.**
- https://datalemur.com/blog/paypal-sql-interview-questions (page date "Updated on January 7, 2025"; title "11 PayPal SQL Interview Questions")
- https://www.interviewquery.com/interview-guides/paypal-data-analyst *(snippet, not fetched)*, plus InterviewQuery Data Engineer and Product Analyst guides *(snippet)*
- https://prachub.com/interview-guide/paypal-data-scientist-interview-guide (published 3/17/2026, "Updated Nov 3, 2026")
- https://letsdatascience.com/problems/companies/paypal *(snippet: 8 SQL + 8 Python practice problems)*
- Several auto-generated spam pages titled "paypal sql interview question" (sales.communityimpact.com, irc.pcper.com). Junk, but a sign that somebody thinks the keyword is worth farming.

b. **Incumbent:** DataLemur ranks first for both `paypal sql interview questions` and the exact-match query.

c. **Collision: partial, on the short query only.** `"paypal sql"` returns data-connector products: CData SQL Gateway/ODBC, Invantive, KingswaySoft JDBC, Zapier/Pipedream PayPal→SQL Server, and a Databricks PayPal connector. The full interview query is clean.

### 2. Interview format (data roles)
| Fact | What sources say | Source (page date) |
|---|---|---|
| Roles where SQL is tested | Data Science, Data Engineering, Data Analytics | DataLemur blog (7 Jan 2025) |
| DS process outline | 4–5 rounds over ~3–4 weeks. Recruiter 20–30 min; HM 30–60 min; **SQL + Python 45–60 min, live, shared screen / collaborative coding**; stats/experimentation 45–60; business case 45–60 (verbal); behavioural 30–60. No take-home mentioned. Cites no outside source. | PracHub guide (updated 3 Nov 2026) |
| DS phone rounds | 15-min recruiter call → two **1-hour phone rounds**: (1) SQL + Python + case, (2) stats/causal inference. **One SQL question** with many filter conditions; WHERE-vs-ON placement mattered. Candidate called it "really hard". Platform not named. | PracHub candidate report, interview Dec 2025 (published 25 Aug 2026) |
| DS onsite | **3 back-to-back rounds**: risk/fraud accept-or-decline; resume + fraud-labelling case + unsupervised learning; **SQL, 3 questions**. The interviewer rejected a SUM answer and wanted a CASE WHEN conditional aggregate. An aggregate in HAVING was questioned. Rated medium. Platform not named; whether code ran not stated. | PracHub candidate report, interview Jul 2025 (published 24 Aug 2026) |
| DA intern (India, off-campus) | **HackerRank OA, 1 hour**: 10 MCQs (ML, SQL, probability, stats) + 1 Python. Technical round: one SQL query **in a HackerRank IDE** (passed all test cases), plus follow-ups. HM round same day: SQL "medium to tough". | GeeksforGeeks (Last Updated 16 Mar 2023) |
| First round all SQL, HackerRank, ~45 min (Bengaluru) | *(snippet, not fetched — Glassdoor)* | — |
| "Simple" SQL on a transactions table (DA 2); ROW_NUMBER vs DENSE_RANK; median of a column; "how would you detect fraudulent transactions" | *(snippets, not fetched — Glassdoor / InterviewQuery)* | — |
| Process "2–3 rounds over one to two weeks" | *(snippet, not fetched — InterviewQuery DA guide)*. **Disagrees** with PracHub's 4–5 rounds over 3–4 weeks. | — |

The three fetched first-person reports agree that SQL is a dedicated, live part of every loop they describe, and two of the three set it beside fraud and risk rounds. They disagree on everything else (round count, length, platform), because they cover different roles, years and probably countries. The data entry says so in a "What is not settled" row.

### 3. SQL topics (by how many fetched sources mention them)
1. Conditional aggregation / CASE WHEN (PracHub onsite; DataLemur final-balance shape)
2. Aggregation with HAVING (PracHub onsite; DataLemur "at least two transactions")
3. Joins and filter placement, WHERE vs ON (PracHub phone; PracHub guide)
4. Window functions / ranking with ties (DataLemur average-per-user rank; PracHub guide)
5. Funnels and conversion (DataLemur click→account setup; PracHub guide)
6. Transaction-flow, segmentation, anomaly and data-quality checks (PracHub guide only)

Difficulty: medium (Jul 2025 onsite) to hard (Dec 2025 phone, the candidate's own word). The 2023 intern report says "medium to tough". The PracHub guide's own bank is 28% Easy / 51% Medium / 21% Hard (its labels, not an interview statistic, so not used on the page).

### 4. Sample question shapes (paraphrased)
1. Deposits and withdrawals per account → each account's closing balance. https://datalemur.com/questions/final-account-balance (Easy, undated)
2. Payments payer→recipient → number of user pairs who have sent money both ways. https://datalemur.com/blog/paypal-sql-interview-questions (the question page https://datalemur.com/questions/money-transfer-relationships is paywalled; Medium)
3. Users (sign-up date) + transactions → per-user total and average, users with ≥2 transactions only. DataLemur blog
4. Ad clicks + account setups → daily click-to-setup conversion over one week. DataLemur blog (not used in the entry)
5. Rides with riders, drivers and status → top orders and cancellation rate under several filters, with WHERE vs ON as the trap. PracHub phone report. **Note:** the candidate's interviewer was from a team the report calls the "airport team", and the case is rides-shaped, which is odd for PayPal. It is sourced, so it is kept, but it is the shape a human should look at first.

### 5. Domain data shape
Supported: **P2P payments** (payer, recipient, amount), **account transactions** (deposits/withdrawals, balances), **transactions with fraud flags**, **merchant/product revenue** and **ad click → account setup** funnels. All of these come from DataLemur and the fraud/risk rounds in the onsite report. This is the best fit of the three with what the bank already has (`finans_fraud`: merchants, chargebacks, fraud patterns). Before tagging, check the Capital One set (275–284) rules, since Goldman and Bloomberg already reuse parts of it.

**Verdict: BUILD (first of the three).** Demand is clear, and the interview query has no collision (the short query is connector products). There are three fetched first-person reports from 2023–2025 plus a dated guide. The fraud and payments shape fits our existing content, so the practice set is not a doorway. The page must say the reports disagree on format by role and year.

---

## Coinbase

### 1. Demand check
a. **Dedicated pages: yes.**
- https://datalemur.com/blog/coinbase-sql-interview-questions (page date "Updated on February 20, 2025")
- InterviewQuery: data analyst, data scientist, data engineer, business intelligence guides *(snippets, not fetched)*
- https://prachub.com/interview-guide/coinbase-data-scientist-interview-guide (published 3/17/2026, "Updated Nov 3, 2026")
- https://prachub.com/companies/coinbase/categories/data-manipulation-sql-python (updated 10.13.2025; four SQL-tagged DS questions)
- datainterview.com Coinbase DA/DS guides, dataford.io, datadriven.io (DE) *(snippets, not fetched)*
- 1point3acres: 8+ data-analyst/data-science threads *(titles only)*

b. **Incumbent:** DataLemur ranks first on the exact-match query. InterviewQuery holds several slots.

c. **Collision: partial, on the short query.** `"coinbase sql"` is dominated by **Coinbase Developer Platform's SQL API** (docs.cdp.coinbase.com/data/sql-api, SQL over onchain Base data, "CoinbaSeQL"), plus CData/dlt connectors. That is a real Coinbase product with SQL in its name, the Shopify/BigQuery pattern the 09-08 read warned about, but only on the two-word query. `"coinbase sql interview questions"` returned interview pages only.

### 2. Interview format (data roles)
| Fact | What sources say | Source (page date) |
|---|---|---|
| Roles | Data Science, Analytics, Data Engineering | DataLemur (20 Feb 2025) |
| Overall process | ~6–8 weeks. Recruiter screen 30 min → **30-min online assessment for all candidates** → final round of **four 60-min one-on-ones over Google Meet** (plus a 30-min behavioural with the HM) → **work trial**: a take-home case presented on a video call, ~15 min presentation + questions. DS round = "conversational interview and a whiteboard portion"; prepare SQL, data manipulation, A/B testing. | Aced (formerly Exponent) Coinbase interview process ("Last updated 2 months ago", read 20 Nov 2026) |
| DS SQL round (senior) | HR 30 min → **SQL + data analysis (the "most important round"): 2 questions, written in CoderPad** → stats/experiment (conversational) → product case → HM. About 4 weeks. Whether the code ran is not stated. Rated medium. The candidate says the SQL was not especially hard; reasoning mattered. | PracHub candidate report, interview Mar 2025 (published 25 Aug 2026) |
| DS onsite | Case study (A/B test for personalised email) + **2 SQL questions** (the second in three parts) + **live Python EDA** (explore a dataset, build and evaluate a model). Rated hard. Platform not named. | PracHub candidate report, interview Oct 2025 (published 25 Aug 2026) |
| DS process (guide) | Recruiter ~30 → structured OA ~30 (logical/verbal/numerical/culture) → **AI behavioural screen for some 2025–26 pipelines** → HM/technical screen 30–45 live → live coding 45–60 (SQL with multiple CTEs, pandas) → product case 45–60 → culture fit → presentation (some candidates). Cites no outside source. | PracHub guide (updated 3 Nov 2026) |
| DA phone screen: 60 min, SQL + Python function questions | *(snippet, not fetched — 1point3acres thread 1121750)* | — |
| DA: live round, hard questions on flight data, window functions over multi-leg journeys | *(snippet, not fetched — InterviewQuery DA)* | — |
| DS: six rounds incl. "communication and organization" and presentation | *(snippet, not fetched — InterviewQuery)* | — |

**Disagreements:** Aced describes a whiteboard and a conversational DS round, while the March 2025 report names CoderPad. PracHub's guide adds an AI-led behavioural screen that Aced does not mention. Both first-person reports agree on **two SQL questions** in the SQL part, on user and trade/transaction tables, with metric-definition follow-ups. Neither says whether the code was executed.

### 3. SQL topics (ranked)
1. Rates and denominators: share of users, adoption rate, transaction rate (both PracHub reports)
2. Time windows: last 30 days, 7-day retention (PracHub senior)
3. Retention and cohort definition, i.e. from sign-up or from first trade (PracHub senior; PracHub guide)
4. Time between events and first event per user (PracHub DS onsite)
5. Running / cumulative sums ("sum of values ≤ each row's value", PracHub DS onsite)
6. Window functions and layered CTEs (PracHub guide; DataLemur day-over-day volume)
7. Joins, grouped sums, LIKE filters (DataLemur)

Difficulty: medium (senior, Mar 2025) to hard (DS onsite, Oct 2025). The guide's own bank is 19/63/18% E/M/H (its labels, not used).

### 4. Sample question shapes (paraphrased)
1. Trades (user, time, volume, asset) → share of users with ≥3 trades in the last 30 days. PracHub senior report
2. Users (sign-up date) + trades → 7-day retention, and whether day 0 is the sign-up or the first trade. PracHub senior report
3. User transactions (region, adoption time, transaction time, transaction region) → adoption and transaction rates, time from adoption to first transaction, and transactions outside the region of the user's first one. PracHub DS onsite report
4. A column of integer ids → for each row, the sum of all values ≤ its own. PracHub DS onsite report (not used; abstract)
5. Trades by currency and day → daily volume per currency and the change from the day before. DataLemur blog
6. Customers (country) + transactions (coin, volume, date) → Bitcoin volume by country for one month. DataLemur blog (not used)

### 5. Domain data shape
Supported: **trades** (user, asset/currency, volume, time), **sign-ups → first trade** (retention), **transactions with adoption time and region**, and **customer country + coin volume**. Onchain/blockchain data is not supported by any interview source; it belongs to the CDP SQL API collision, not the interview. We have no crypto or trades dataset, so the practice set would be topic-tagged (retention, 30-day activity, rates, running sums), and the page must say so.

**Verdict: BUILD (second).** Demand is clear. There are two fetched first-person data-scientist reports from 2025 that agree on the SQL part's size and subject, plus a dated Exponent/Aced process page. The collision is limited to the short query. Lower priority than PayPal for two reasons: no domain dataset behind it, and data-analyst format detail exists only in snippets.

---

## Robinhood

### 1. Demand check
a. **Dedicated pages: yes, and the most of the three.**
- https://datalemur.com/blog/robinhood-sql-interview-questions (page date "Updated on May 6, 2025")
- InterviewQuery: data analyst, data scientist (two URLs), data engineer *(snippets, not fetched)*
- https://prachub.com/interview-guide/robinhood-data-scientist-interview-questions-guide-2026 ("Updated · 2026-09-24")
- https://prachub.com/companies/robinhood (updated 10.28.2026; 21 experiences claimed, one of them data science)
- datainterview.com DA/DS guides, dataford.io, letsdatascience (5 SQL + 11 Python), dev.to DE guide *(snippets, not fetched)*
- https://cdo.som.yale.edu/blog/2025/09/12/get-a-job-at-robinhood-interview-process-and-top-questions/ (Exponent republication)
- 1point3acres: 7+ data-science / analytics-engineer phone-screen threads *(titles only)*

b. **Incumbent:** DataLemur first, with InterviewQuery and datainterview close behind. The 2026-09-09 SERP test counted **six fresh SQL-titled incumbents** and rejected Robinhood for that reason.

c. **Collision: minor.** `"robinhood sql"` is mostly interview prep. Dune and Allium document SQL tables for **Robinhood Chain** (an EVM chain), and there is an unrelated R package. Not a product that takes over the query.

### 2. Interview format (data roles)
| Fact | What sources say | Source (page date) |
|---|---|---|
| Roles | Data Science, Data Engineering, Data Analytics | DataLemur (6 May 2025) |
| Process | "Standardized … the same for all interviewees regardless of role or team": recruiter screen → technical screen (**engineering only**) → final round of **45–60 min** interviews; ~4–6 weeks. DS: 1–2 case studies, experiments, statistics; prepare SQL, Python, product metrics. CodeSignal is named for the engineering screen only. | Exponent guide via Yale SOM CDO (URL date 12 Sep 2025; "created with the help of a Robinhood interviewer") |
| Intern DS technical screen | **45 min: four SQL + two Python questions**, all given up front. The first SQL question: transfers by bank (detail below). The candidate did not finish. Platform and live-vs-async not stated. Rated hard. | PracHub candidate report, interview Oct 2026 (published 12 Nov 2026). **Note:** PracHub's guide lists the same report as published 2026-10-01, which conflicts with the report page. I cite the report page. |
| Full-time DS onsite | "Standard virtual onsite"; experimentation round (fractional shares, sample size); **timed coding round** (ran out of time). No SQL detail. | PracHub candidate report, interview Oct 2025 (published 25 Aug 2026) |
| DS process (guide) | Recruiter → technical assessment (SQL-focused, "reported") → live coding + case → virtual onsite; 4 rounds over ~3–5 weeks. Says outright: "No official company page is cited". | PracHub guide (updated 24 Sep 2026) |
| Full-time DS phone screens: SQL + metric diagnosis + funding-rate case; SQL + incentive case; "similar to Meta" | *(snippets, not fetched — 1point3acres threads 1124959, 1122993, 1116284)* | — |
| Tech screen = 1 Python + 2 SQL; "two Robinhood tables and a bunch of window functions" | *(snippets, not fetched — Glassdoor)* | — |
| Onsite of four: Product Analytics, Product Jam, SQL + Python, Experimentation | *(snippet, not fetched — InterviewQuery)* | — |
| Technical screen "one hour with a data scientist" | *(snippet, not fetched — InterviewQuery)* | — |

The only fetched first-person account with SQL detail is an **intern** screen. The full-time analyst and DS SQL screen (length, platform, question count) appears only in snippets, and Exponent says its technical screen applies to engineering roles.

### 3. SQL topics
1. Window functions: LAG day-over-day change, top stock per month (DataLemur; Glassdoor snippet)
2. Joins where one user maps to several bank ids (PracHub intern)
3. Two-step aggregation, max per user then sum per bank (PracHub intern)
4. Ranking / top-N (DataLemur top-3 cities; PracHub intern ranking follow-up)
5. Consecutive-day streaks (Exponent/Yale)
6. Rolling totals, period-over-period, cohorts/retention, dedup within groups (PracHub guide)

Difficulty: not consistently reported. The intern screen was "hard" mostly for its pace. DataLemur's Robinhood-tagged completed-trades question is Easy. The onsite report rates the round easy.

### 4. Sample question shapes (paraphrased)
1. Fund transfers (user, bank, amount, direction) + banks (bank, user, name) → each user's largest transfer at each bank, summed by bank name, and the bank with the top total. PracHub intern report
2. Trade orders (status) + users (city) → the three cities with the most completed orders. https://datalemur.com/questions/completed-trades (Easy, undated)
3. Daily volume by stock → day-over-day % change for the most-traded stock. DataLemur blog
4. Trades by user and day → users who traded on three consecutive days. Exponent/Yale
5. Order placements with partial fills (Python, not SQL) → fill rate per order and its drivers. PracHub intern report (not used)

### 5. Domain data shape
Supported: **trade orders** (status, price, quantity), **daily volume per symbol**, **fund transfers to and from linked banks**, **users by city / sign-up**, and **partial order fills**. The bank has no brokerage data.

**Verdict: DEFER.** Demand is the strongest of the three, but deferral is still right:
1. The full-time data-role SQL screen cannot be sourced from anything fetched today. The one first-person SQL account is an intern screen, and the 1point3acres threads that would settle it are unreadable without a browser.
2. The 2026-09-09 read already rejected Robinhood for six fresh incumbents, and nothing since changes that.
3. No trades or transfers data backs the practice set.

A sourced draft is in the entries file under `DEFERRED_DRAFTS` so it can ship quickly if (1) is closed by hand.

---

## Summary

| Company | Demand | Incumbent | Collision | Platform | Duration | Top 3 topics | Verdict |
|---|---|---|---|---|---|---|---|
| PayPal | yes | DataLemur | short query only (data connectors) | HackerRank (2023 DA intern); others not named | 1-h OA (intern); 1-h phone rounds; guide 45–60 min | conditional aggregation, HAVING, joins/WHERE vs ON | **BUILD (1st)** |
| Coinbase | yes | DataLemur, InterviewQuery | short query only (CDP SQL API) | CoderPad (senior DS, Mar 2025); guide says whiteboard | 30-min OA; 4 × 60-min finals; 2 SQL questions per SQL part | rates/denominators, time windows, retention | **BUILD (2nd)** |
| Robinhood | yes (most) | DataLemur + 5 fresh others | minor (Robinhood Chain on Dune) | not reported for data roles in fetched sources | intern screen 45 min (4 SQL + 2 Python); finals 45–60 min | window functions, joins, two-step aggregation | **DEFER** |

## Re-verify in a browser before publishing
1. **PayPal shape 4 (rides/cancellation)**: confirm on the PracHub page that it really was a PayPal interview, or drop it.
2. **GeeksforGeeks URL**: it was fetched as `https://www.geeksforgeeks.org/?p=980248`. Replace it with the canonical slug the page resolves to.
3. **Aced (Coinbase)**: shows only "Last updated 2 months ago". Record the absolute date if the page exposes one.
4. **Robinhood (to lift the deferral)**: read 1point3acres threads 1124959, 1127814, 1125421, 1134080 and Glassdoor's DS reviews for the full-time SQL screen's length, platform and question count.
5. **Accent hexes** (#003087 PayPal, #0052FF Coinbase, #00C805 Robinhood) are from memory. Robinhood's 2024 rebrand may make its neon "Robin" green the current primary.
6. **InterviewQuery's PayPal "2–3 rounds, 1–2 weeks"** contradicts PracHub's 4–5 rounds. If InterviewQuery can be read, the PayPal process row should state the disagreement with both sources.

---

# Company SQL interview research: Monzo, Klarna, Adyen

All sources were accessed 2026-11-20 unless noted. "Page date" is the date the page itself showed. A source marked *(snippet, not fetched)* was seen only in a search-result snippet. It is not used in any data entry and must be re-verified in a browser before use.

## Read these caveats first

- **Blocked today.** These sites refused every fetch: Glassdoor (403, every mirror tried), Interview Query (429), CleverPrep (429), Jointaro (429), Dataford (429), letsdatascience (403), Blind (402), The Muse (403). Prepfully answers 200, but its question pages render with JavaScript and the HTML has no question text. That is the same blocking pattern the 2026-09-13 read hit. The Chrome extension was not connected, so I could not do a browser read either.
- **Most first-person candidate material for all three companies is on Glassdoor.** I did not find a single Reddit, GeeksforGeeks or Medium experience post. A Blind post for Klarna exists but is paywalled. The `site:reddit.com` searches returned no Reddit threads. So the candidate trail is snippet-only for every company here.
- **Prior reads in this repo already looked at these names.**
  - `docs/reads/company-page-candidates-2026-09-09.md` rejected Adyen ("DataLemur present, and it outranks us everywhere") and Klarna ("Exponent maintains a 2026 edition"). It chose Monzo as the "Revolut clone" bet, then said not to write it until there was consumer-neobank content that is not Revolut's.
  - `docs/reads/company-page-serp-test-2026-09-10.md` measured that B2B fintech pages (Ramp, Plaid) get about one click a month, while consumer fintech (Revolut, Wise) works.
  - Both findings are re-checked below. Two facts have changed since then. `finans_neobank` now exists and is company-neutral, though the Revolut set 300–311 stays Revolut-only. And Exponent's Klarna page now holds one PM question and no SQL.
- **The absolute demand for a named query is small, even on our winners.** Our own `gsc_daily` (read-only, 2026-11-20):

  | Query | Impressions | Clicks | Average position | Dates |
  |---|---|---|---|---|
  | "revolut sql interview questions" | 87 | 32 | 2.3 | 07-24 → 11-19 |
  | "wise sql interview questions" | 19 | 10 | 1.9 | 11-04 → 11-19 |

  The rest of those pages' traffic is long-tail. Expect a new page in this cluster to be worth tens of clicks a month, not hundreds. No query containing monzo, klarna or adyen with interview intent appears in `gsc_daily` or `bing_stats`. That is expected, because we have no page for them.

---

## Monzo

### 1. Demand check
a. **Dedicated "Monzo SQL interview" pages: none.**
- DataLemur `/blog/monzo-sql-interview-questions` and StrataScratch `/blog/monzo-sql-interview-questions` both return 404.
- Neither the exact-match search nor the plain search turns up a SQL-titled prep page.
- What does rank:
  - Monzo's own hiring posts (three, below)
  - Glassdoor reviews
  - Prepfully. Its Monzo Data Scientist page header reads "results 21 to 30 of 253" for 2026 (fetched), so candidates are submitting Monzo DS questions.
  - Greenhouse job listings

b. **Incumbent:** none for SQL. Monzo's own blog is the top result for the interview-format query.

c. **Collision: no.** "Monzo" means only the bank.

This is the same vacuum Revolut and Wise sat in. DataLemur has no `/blog/revolut-…` or `/blog/wise-…` page either (both 404 today), and those are our two best fintech pages. The risk is the one the 09-09 read stated: zero incumbents may mean zero demand. The UK candidate pool and the consumer-fintech segment argue the other way.

### 2. Interview format (Data Science, Analytics Engineering)
Monzo publishes its own process. That makes it the best-sourced of the three, but every fetched source is first-party, with no independent candidate report.

| Fact | What sources say | Source (page date) |
|---|---|---|
| Stages, DS (2026) | Recruiter call 15 min → initial call 45 min (senior or lead DS) → technical screen ("1 hour") → final interviews 2–3 h (case study + behavioural) → decision. Senior and lead roles may add a leadership or technical-leadership interview. | monzo.com/blog/interviewing-for-data-science-at-monzo (27 Apr 2026) |
| Where SQL is | Technical screen, part 1: a **take-home** coding task, "clear, sensible SQL or Python", answering business questions with data, in the candidate's own time, not live | same |
| How "1 hour" splits | **Not stated.** It is listed against the technical screen as a whole. | same |
| The review | Technical interview with a DS manager or lead covers the submission (logic, trade-offs, testing), then an analytical discussion (experimentation, success metrics), then communication (explaining results, spotting misleading visuals). Described as less about trivia. | same |
| Case study | Open-ended product or business scenario. No code is mentioned. | same |
| Stages, data (2022) | Recruiter ~30 min → initial call → take-home (**no time limit**, usually delivered as a slide deck, may get a follow-up review) → final: case study (document shared, prep time, then talk-through) + business-fit interview → decision within about a week, with a Bar Raiser reviewing | monzo.com/blog/2022/03/21/data-hiring-at-monzo (21 Mar 2022) |
| Joiner's account (2022) | Take-home on **metric formulation, with extensive SQL and data visualisation** → data case study interview → collaboration interview | monzo.com/blog/2022/05/18/joining-monzo-as-a-data-scientist (17 May 2022; the URL says 18) |
| Stages, Analytics Engineering (2026) | Recruiter 30 min → initial call 45 min → **take-home (1 week)** → case study 1 h → behavioural 1 h. Stack: "DBT, BigQuery, Looker, SQL, and some Python." | monzo.com/blog/interviewing-for-analytics-engineering-at-monzo (25 May 2026) |
| Tool for the take-home | **Not stated** in any fetched source. BigQuery is Monzo's stack (AE post; joiner post). | — |
| Take-home is in BigQuery and focuses on readable, maintainable SQL | Glassdoor, French-language review | *(snippet, not fetched)* |
| Take-home gives two datasets and basic SQL questions; the follow-up asked whether the query could be optimised | Glassdoor | *(snippet, not fetched)* |
| AE final round included live SQL debugging | Glassdoor | *(snippet, not fetched)* |
| Senior Data Analyst posting: 30-min recruiter call, 45-min initial call, take-home; team uses dbt and BigQuery SQL | Greenhouse posting | *(snippet, not fetched; the posting link now resolves to the listings page)* |
| "Typical transaction amount for customers with more than 10 purchases in the last 90 days" (DS) | Prepfully | *(snippet, not fetched; page is JavaScript-rendered)* |

**Where sources disagree.** The recruiter call shrank from about 30 minutes (2022) to 15 minutes (2026, DS). The take-home's output changed from a slide deck (2022) to code reviewed in a technical interview (2026). The data entry states both, with dates.

### 3. SQL topics
No fetched source lists SQL topics. What they describe:
- turning a request into a metric and then into code
- metric formulation with SQL and visualisation
- defending logic, trade-offs and testing
- experimentation and success metrics
- data modelling (AE)

Snippet-only additions, not used: window functions vs aggregation (Prepfully), query optimisation (Glassdoor), readable and maintainable SQL in BigQuery (Glassdoor).

Difficulty: not graded anywhere. Monzo frames the bar as clear, sensible code and reasoning, not trivia.

### 4. Sample question shapes (paraphrased)
**No fetched source gives a concrete Monzo SQL question.** The shapes in the entry are the *task* shapes Monzo describes:
1. A plain-language data request: decide the metric, write the SQL or Python, present the finding to a non-technical reader. (monzo-ds-2026)
2. Formulate a metric for a product area, compute it in SQL, chart it. (monzo-joiner-2022)
3. Defend your own submission in the follow-up: joins, filters, assumptions, checks. (monzo-ds-2026)
4. AE: model raw data into usable tables, pragmatically, and explain the trade-offs. (monzo-ae-2026)

### 5. Domain data shape
The sources do not describe Monzo's tables. The entry's `dataShape` describes generic neobank tables: accounts, card transactions with merchant and category, customer-to-customer transfers, savings-pot moves. It makes no claim that these are Monzo's tables, and it maps onto `finans_neobank` (users, top-ups, transactions, p2p pairs, FX, fees). "Pots" is a Monzo product term. It sits in `dataShape` as flavour, and no Monzo challenge exists for it yet.

### 6. What has to happen before shipping
- **Practice set.** Monzo has zero tagged challenges. The Revolut set (300–311) is Revolut-only by rule, so a Monzo set needs either tags on company-neutral `finans_neobank` / `card_analytics` challenges, with one line of reasoning each, or new challenges. Without it the page's practice block is empty or a doorway onto Revolut's content, which is exactly what the 09-09 read warned against.
- **Format sources.** Add the page to `SOURCED_PAGES`.
- **Browser check.** Read 3–5 Glassdoor Monzo data reviews and record dates. If they confirm the BigQuery take-home and the optimisation follow-up, those can become sourced rows and real SQL shapes.

**Verdict: BUILD.** The format is the best-sourced of the three: four fetched, dated first-party posts, 2022–2026, with the change over time stated. The take-home-then-review shape is specific and unlike any page we have. It is consumer fintech with no SQL incumbent, the Revolut/Wise pattern. The risks:
- demand is unproven
- every fetched source is Monzo's own, with no fetched candidate report
- the practice set must be authored first

Put it under the P4 prune rule: if it has no impressions eight weeks after indexing, noindex it.

---

## Klarna

### 1. Demand check
a. **Dedicated "Klarna SQL interview" pages: none from the SQL-prep incumbents.**
- DataLemur `/blog/klarna-sql-interview-questions`: 404.
- StrataScratch: 404.
- Exponent (`tryexponent.com/questions?company=klarna` now 301s to aced.io): **one** Klarna question, "Why do you want to be a Product Manager?" ("62 months ago"; page "Last updated Nov 2026", fetched). The 09-09 read's "Exponent maintains a 2026 edition" no longer describes anything SQL.
- What ranks:
  - Interview Query **role guides**: data analyst, data scientist, data engineer, product analyst, growth marketing analyst *(snippet, not fetched — 429)*
  - CleverPrep data analyst and data engineer pages *(snippet, not fetched — 429)*
  - Prepfully (JavaScript-rendered)
  - NoraHQ Klarna DS guide (fetched)
  - many Glassdoor reviews

This is the "demand visible, SQL shelf empty" pattern the 09-10 read accepted for Siemens.

b. **Incumbent:** none SQL-specific. Interview Query owns the role queries.

c. **Collision: no.** "Klarna" means only the company.

### 2. Interview format (Data Analyst / Data Scientist)
| Fact | What sources say | Source (page date) |
|---|---|---|
| Stages, DS | Logical-reasoning / cognitive test (~15–30 min) → recruiter screen (~30 min) → ML case study / take-home (~7 days, "10+ hours") → technical interview with live coding (~60–90 min) → behavioural / Klarna fit (~45–60 min). Typical 4–6 rounds. | NoraHQ Klarna DS guide (6 Jul 2026), a prep-site aggregation of candidate quotes |
| SQL in the DS process | Only as one example prompt in the live technical round. No platform, count or length. | same |
| Online logic test(s) before technical rounds | Several Glassdoor reviews (2018–2026) | *(snippet, not fetched)* |
| Skills test of **3 SQL problems** (joins, CTEs, window functions), then a round reviewing the candidate's SQL | Glassdoor, **data engineer** review | *(snippet, not fetched)* |
| "Easy SQL coding tasks" after a phone screen | Glassdoor, analytics or data-science candidate, Berlin | *(snippet, not fetched)* |
| Analyst: 3-round process; product analyst told to prepare a business case with transaction and growth projections | Glassdoor | *(snippet, not fetched)* |
| DA process spans 10–12 question topics; SQL "very high" ask chance | Interview Query DA guide | *(snippet, not fetched; and a frequency claim we could not use anyway)* |
| "Write a SQL query to find top-performing merchants" | CleverPrep DA page | *(snippet, not fetched)* |

### 3. SQL topics
Fetched: none specific. Snippet-only: joins, CTEs, window functions; duplicate-key joins and rolling averages (Prepfully DS); query optimisation.

### 4. Sample question shapes
None from a fetched source.

### 5. Domain data shape
BNPL fits our data well: orders split into instalments, merchants, repayment schedules, late payments. But no fetched source describes Klarna's interview data.

**Verdict: DEFER.** There is demand: five Interview Query role guides and an empty SQL shelf. But the data-role SQL format cannot be sourced from anything fetched today. The only fetched process source (NoraHQ, 6 Jul 2026) is a prep-site aggregation for the DS role, where SQL is one line inside a live technical round. Every analyst-specific SQL fact (the 3-problem skills test, the code-review round, the logic test) is a Glassdoor or Interview Query snippet, and the most concrete one is from a data-engineer review. A page today would have to say "format not reported" in most rows.

**Re-open when** someone reads 4–6 Klarna analyst and DS reviews on Glassdoor in a browser (with dates) and the Interview Query DA guide. If at least two independent dated reports describe the SQL test, Klarna becomes buildable, and it is consumer fintech with no SQL incumbent.

---

## Adyen

### 1. Demand check
a. **Dedicated pages: yes.**
- https://datalemur.com/blog/adyen-sql-interview-questions: "9 Adyen SQL Interview Questions (Updated 2025)", page date "Updated on January 19, 2025". Fetched.
- Interview Query Adyen guides for data analyst, product analyst, data engineer and data scientist *(snippet, not fetched — 429)*
- letsdatascience.com/problems/companies/adyen (10 SQL + 10 Python problems) *(snippet, not fetched — 403)*
- dataford.io Adyen DA guide *(snippet, not fetched — 429)*

b. **Incumbent: DataLemur.** It ranks first for "adyen sql interview questions". This is the "occupied ground" case in the 09-10 read.

c. **Collision: no.** But Adyen is **B2B payments**, the segment the 09-10 read measured at about one click a month for Ramp and Plaid.

### 2. Interview format (Data Analyst / Data Scientist)
| Fact | What sources say | Source (page date) |
|---|---|---|
| Stages (all roles, first-party) | Application review (reply within five business days) → recruiter screen → team interview → **skills assessment: a technical skills test or a case-study presentation, depending on role** → leadership interview → final interview with a Management Board or Global Leadership member | careers.adyen.com/faqs ("How we hire"). **No page date shown**; footer © 2026. Fetched. |
| Data roles / SQL / platform | Not mentioned on the first-party page | same |
| SQL tested for which roles | DataLemur says Adyen "almost always" evaluates **Data Science and Data Engineering** candidates on SQL. No candidate trail, no method. | DataLemur (19 Jan 2025) |
| Adyen's internal data | DataLemur says SQL runs against an internal graph database, linking an Adyen engineering post. Not about the interview. | same |
| **HackerRank** test of SQL + Python, 1.5–2 h, no LLM help (2023 DA review); "3 SQL questions … almost all easy" (2023); HackerRank SQL + a database-knowledge technical interview (2025) | Glassdoor | *(snippet, not fetched)* |
| DA: 4 rounds including an hour-long case study (Amsterdam, Sep 2024); case on banking-network performance; A/B testing and authorisation-rate case; take-home case of 5–6 h (2026) | Glassdoor | *(snippet, not fetched)* |
| DA: recruiter or HM call → SQL + Python assessment → team interviews on past work and Adyen's business model; 3–6 rounds | Interview Query DA guide | *(snippet, not fetched)* |
| DS: 30-min first round with two data scientists → take-home (Feb 2023); a week-long HackerRank task; older (~2019) Codility test | Glassdoor | *(snippet, not fetched)* |

**Where sources disagree** (snippet level only): HackerRank (2023–2025) vs Codility (~2019). Take-home case vs timed online test.

### 3. SQL topics
DataLemur, fetched, with no provenance:
- per-merchant monthly revenue
- average transaction amount per merchant
- daily volume per merchant and month
- payment volume by hour
- customer totals via a join
- UNION vs UNION ALL
- normalisation and foreign-key concepts

Snippet-only: data-validation checks before reporting (Dataford), authorisation rate (Glassdoor).

### 4. Sample question shapes (paraphrased; from DataLemur only)
1. Transactions (merchant, date, amount): each merchant's revenue per month.
2. Transactions: average amount per hour of the day, rounded.
3. Customers + transactions: per customer, transaction count and total, sorted.

DataLemur says these are "similar to" questions asked. They show a shape, not proof.

### 5. Domain data shape
Merchant payments: transactions by merchant, payment method, authorisation result, hour and day; authorisation rate. It fits `card_analytics` well.

**Verdict: DEFER.**
- **Demand is real but occupied.** DataLemur (Jan 2025) ranks first, plus four Interview Query guides.
- **The segment is B2B payments,** which we have measured as not converting.
- **The data-role SQL format is only partly sourced.** The fetched first-party page confirms only "a technical skills test or a case study, depending on role", undated. Every concrete fact (HackerRank, SQL + Python, length, 3 questions) is a Glassdoor or Interview Query snippet.

A page today would carry one first-party stage row and DataLemur's unsourced "almost always". That is thinner than Bloomberg, which is already a prune candidate.

**Re-open if** a browser read confirms the HackerRank SQL + Python test in two or more dated DA reviews **and** the Monzo page shows the European cluster holds beyond Revolut and Wise.

---

## Fetched today (2026-11-20)

| Source | Page date | Used for |
|---|---|---|
| monzo.com/blog/interviewing-for-data-science-at-monzo | 27 Apr 2026 | Monzo entry |
| monzo.com/blog/interviewing-for-analytics-engineering-at-monzo | 25 May 2026 | Monzo entry |
| monzo.com/blog/2022/03/21/data-hiring-at-monzo | 21 Mar 2022 | Monzo entry |
| monzo.com/blog/2022/05/18/joining-monzo-as-a-data-scientist | 17 May 2022 | Monzo entry |
| prepfully.com/interview-questions/monzo/data-scientist?page=3 | 2026 header only | demand signal (253 DS questions) |
| monzo.com homepage CSS | — | accent `--color-brand: #ff4f40` |
| datalemur.com/blog/adyen-sql-interview-questions | 19 Jan 2025 | Adyen notes |
| careers.adyen.com/faqs | none shown (© 2026) | Adyen notes |
| interview.norahq.com/…/klarna-data-scientist-interview-guide-2026 | 6 Jul 2026 | Klarna notes |
| aced.io/questions?company=klarna (Exponent redirect) | "Last updated Nov 2026" | Klarna demand check |
| 404 checks: DataLemur monzo / klarna / wise / revolut; StrataScratch monzo / klarna / adyen; Exponent guides for klarna / adyen / monzo | — | demand checks |
