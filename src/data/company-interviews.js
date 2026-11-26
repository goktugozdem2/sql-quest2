// Company interview pages built from ONE template (scripts/build-company-pages.mjs).
//
// Founder's SEO plan, 2026-09-13, P0.4–P0.5: "{Company} SQL Interview
// Questions" — format, the SQL that comes up, difficulty, sample questions,
// interactive practice, a Skillmap/readiness CTA — for the first twenty
// high-intent companies. Thirteen of the twenty already had pages that rank
// (Capital One, Stripe, JPMorgan, Amazon, Google, Meta, Uber, Airbnb, Netflix,
// Apple, Tesla, OpenAI, Anthropic); those keep their copy and get the
// template's shared modules injected. The seven below are generated whole.
//
// THE RULE THESE PAGES LIVE UNDER (tests/company-pages.test.js): a company page
// may state a round length, a platform or a process ONLY when it carries a
// dated "Sources:" line and sits in SOURCED_PAGES. Every format row here names
// its source keys, every source has a URL and the date it showed, and only
// sources that were actually fetched on 2026-09-13 are cited — facts seen only
// in a search-result snippet were left out (research notes:
// docs/reads/company-research-2026-09-13.md). Where sources disagree, the page
// says so. Sample question SHAPES are paraphrased, never copied, and each names
// the page it was paraphrased from. The practice questions on the page are
// SQL Quest challenges tagged in src/data/challenge-companies.js — ours, not
// the company's, and the page says that too.
//
// Two of the seven came back from research with "defer": Microsoft (the query
// "microsoft sql interview questions" is mostly SQL Server / DBA intent, and
// format sources disagree) and Bloomberg (data-role format thinly reported).
// The founder's list asked for them; they ship with the disagreement stated,
// a role-qualified title for Microsoft, and are the first candidates for the
// P4 prune rule if they earn no impressions by 2026-11-13.

export const COMPANY_INTERVIEWS = {
  doordash: {
    name: 'DoorDash',
    sector: 'consumer',
    crosslinkDesc: 'Orders and deliveries, 4 SQL questions in 30 minutes, window functions',
    accent: '#FF3008',
    title: 'DoorDash SQL Interview Questions — Orders, Deliveries & the 30-Minute SQL Half',
    description: 'DoorDash SQL interview questions: how the data science technical screen runs as candidates report it, the SQL it tests (window functions, date math, aggregation), and practice on order and delivery data. Sourced and dated.',
    hero: 'Candidates describe a 60-minute technical screen split into a SQL half and a marketplace case — several short SQL questions against the clock, on order and delivery tables. Practise that shape here, on data that looks like it.',
    dataShape: 'orders (customer, restaurant, totals, timestamps), deliveries (predicted vs actual delivery time, status) and dashers (ratings, distance)',
    format: [
      ['Roles where SQL is tested', 'Data Science, Analytics and Data Engineering.', ['datalemur-dd']],
      ['Stages', 'Recruiter screen, a 60-minute technical screen, then a final round of about four interviews (cross-functional, hiring manager, data science).', ['exponent-dd']],
      ['The technical screen', 'Reported as roughly 30 minutes of SQL and 30 minutes of a product or marketplace case. One candidate report describes four SQL questions of rising difficulty in the SQL half.', ['exponent-dd', 'blind-dd']],
      ['Environment', 'Candidates report the SQL is written live and not executed, so correctness has to be reasoned, not tested by running it. The tool is not named in any source we could read.', ['blind-dd', 'exponent-dd']],
    ],
    reportedTopics: ['Window functions (ranking, LAG/LEAD, first value per group)', 'Date and time arithmetic (month buckets, intervals, lateness)', 'Aggregation with GROUP BY and HAVING', 'CTEs to stage a multi-step answer', 'Joins, and the rows a LEFT vs INNER join silently drops', 'Ratios and percentages (with casting)', 'Top-N and first event per customer or driver'],
    difficulty: 'Reported as medium, delivered fast: the pressure is the clock, not the trick.',
    shapes: [
      ['Deliveries with predicted and actual delivery timestamps: for each month, the share of orders that arrived more than 20 minutes late.', 'stratascratch-dd'],
      ['Orders by customer and month: the top customer each month, then the same after excluding very frequent customers, then those customers\' share of total sales.', 'exponent-dd'],
      ['New customers\' orders in their first 14 days: the rate of bad experiences (late, missing or cancelled).', 'datalemur-dd'],
      ['Drivers and their completed deliveries with ratings: the share of drivers whose first delivery got the lowest rating.', 'stratascratch-dd'],
    ],
    sources: {
      'exponent-dd': ['Exponent — DoorDash Data Scientist interview guide (candidate reports)', 'https://www.tryexponent.com/guides/doordash-data-scientist-interview', 'updated mid-2026'],
      'blind-dd': ['Blind — DoorDash data science phone screen thread', null, '27 Jul 2022'],
      'stratascratch-dd': ['StrataScratch — DoorDash SQL interview questions', 'https://www.stratascratch.com/blog/doordash-sql-interview-questions', 'updated 6 Mar 2026'],
      'datalemur-dd': ['DataLemur — DoorDash SQL interview questions', 'https://datalemur.com/blog/doordash-sql-interview-questions', '8 May 2025'],
    },
  },

  'goldman-sachs': {
    name: 'Goldman Sachs',
    sector: 'fintech',
    crosslinkDesc: 'Deduplication, latest record per key, running totals',
    accent: '#7399C6',
    title: 'Goldman Sachs SQL Interview Questions — Dedup, Latest Record & Running Totals',
    description: 'Goldman Sachs SQL interview questions: the analyst process as candidates report it, where SQL shows up (the live technical rounds, not the algorithm test), and practice on deduplication, latest-record and running-total patterns.',
    hero: 'The reported pipeline starts with an algorithm-heavy online test and a recorded video interview; the SQL arrives in the live technical rounds — removing duplicates, recovering the latest value, aggregating across two or three tables.',
    dataShape: 'client transactions by asset type, trades by client segment, and salary or position history with effective dates',
    format: [
      ['Overall pipeline', 'An online assessment, a recorded video interview, a live coding round, then a final "Superday".', ['exponent-gs']],
      ['The online assessment', 'Reported as mostly data-structures and algorithms with multiple choice; SQL is not mentioned in the reports we could read.', ['linkjob-gs']],
      ['Where SQL appears', 'One 2024 analyst report describes two hour-long technical rounds with SQL: removing duplicate records from a table with no unique key, and salary questions across employees, salary history and departments.', ['gfg-gs']],
      ['Reported difficulty', 'Easy-to-medium SQL inside a process whose early rounds lean on algorithms.', ['gfg-gs', 'exponent-gs']],
    ],
    reportedTopics: ['Deduplication and keeping one copy', 'Latest record per key (window functions or a self-join)', 'Joins across two or three tables', 'Aggregation — and HAVING vs WHERE', 'Running totals', 'Top-N groups (e.g. departments by average salary)', '"Currently active" logic with start and end dates'],
    difficulty: 'Reported as easy-to-medium SQL; the harder filter is the algorithm test before it.',
    shapes: [
      ['A table with accidental duplicate rows and no unique key: remove the extras and keep one copy of each.', 'gfg-gs'],
      ['Employees, salary history with start and end dates, and departments: current salary for active employees, then the top three departments by average salary.', 'gfg-gs'],
      ['Sales by product and date: a running total of sales per product by month.', 'datalemur-gs'],
      ['Client trades with a client segment: the monthly average trade amount per segment.', 'datalemur-gs'],
    ],
    sources: {
      'exponent-gs': ['Exponent — Goldman Sachs interview process guide', null, 'published 2024'],
      'linkjob-gs': ['LinkJob — Goldman Sachs HackerRank assessment notes', null, '24 Sep 2025'],
      'gfg-gs': ['GeeksforGeeks — Goldman Sachs Analyst interview experience (experienced hire)', 'https://www.geeksforgeeks.org/interview-experiences/goldman-sachs-interview-experience-analyst-full-time-experienced-2024/', '2024'],
      'datalemur-gs': ['DataLemur — Goldman Sachs SQL interview questions', 'https://datalemur.com/blog/goldman-sachs-sql-interview-questions', '14 Mar 2025'],
    },
  },

  walmart: {
    name: 'Walmart',
    sector: 'consumer',
    crosslinkDesc: 'Retail joins, top product per region, latest record',
    accent: '#0071CE',
    title: 'Walmart SQL Interview Questions — Retail Joins, HAVING & Top-N per Region',
    description: 'Walmart SQL interview questions: the data analyst loop as candidates report it, the SQL it leans on (joins, HAVING, top-N per group, latest record), and practice on orders, products and categories. Sourced, with the disagreements stated.',
    hero: 'Candidates describe a recruiter screen and a virtual panel where the technical round is SQL-heavy and changes requirements as you go — joins across retail tables, thresholds with HAVING, the top product per region.',
    dataShape: 'orders and sales by product, category and region, inventory and restock events, and customer transactions',
    format: [
      ['Data analyst stages', 'A recruiter screen, then a virtual final panel of four or five rounds — technical, business, behavioural and hiring manager — over two to six weeks.', ['exponent-wm']],
      ['The technical round', 'Live and SQL-heavy; queries are built up as the interviewer changes the requirement. Python is less common and mostly in data-science-leaning roles.', ['exponent-wm']],
      ['Online assessment', 'Sources disagree: one 2021 candidate reply describes a HackerRank assessment that was SQL only; other guides describe SQL plus Python.', ['blind-wm']],
      ['Round length', 'Panel slots are reported at 45–60 minutes; the length of the SQL part alone is not reliably reported.', ['exponent-wm']],
    ],
    reportedTopics: ['Joins across several tables', 'Aggregation with GROUP BY and HAVING (revenue thresholds)', 'Window functions', 'Top-N per group (top product per region)', 'Latest record per user', 'CTEs and subqueries', 'Date logic (since last restock, days out of stock)'],
    difficulty: 'Foundational for entry analyst roles (two or three tables); reported as medium for data science and engineering.',
    shapes: [
      ['Transactions by user and product: for each user\'s most recent purchase day, how many products they bought that day.', 'datalemur-wm'],
      ['Sales and restock events per product: total sales for each product since its most recent restock.', 'exponent-wm'],
      ['Daily inventory levels: products that were out of stock on 15 or more days last month (illustrative, not candidate-attributed).', 'dea-wm'],
    ],
    sources: {
      'exponent-wm': ['Exponent — Walmart Data Analyst interview guide (by Walmart Labs candidates)', 'https://www.tryexponent.com/guides/walmart-data-analyst-interview', 'updated mid-2026'],
      'blind-wm': ['Blind — Walmart data analyst assessment thread', null, '10 Jun 2021'],
      'datalemur-wm': ['DataLemur — histogram of users and purchases (Walmart-tagged)', 'https://datalemur.com/questions/histogram-users-purchases', 'undated'],
      'dea-wm': ['Data Engineer Academy — Walmart advanced SQL question', 'https://dataengineeracademy.com/blog/walmart-advance-sql-question/', '24 Mar 2026'],
    },
  },

  // 2026-11-23: rewritten from the R1 dossier docs/reads/companies/tiktok.md
  // (sources read 2026-11-23). Out, as unsourced or single-source: "Data
  // Analyst" in the roles row (the cited DataLemur blog names DS and DE), the
  // HackerRank row (one guide; another says SQLPad), the 2022 Blind analyst
  // row (one report, no URL, unreadable now), the ranked topic list (no
  // counts), the difficulty grade (snippets never opened), "two sources
  // agree". In: the read-or-debug row (medium, two reports).
  tiktok: {
    name: 'TikTok',
    accessed: '23 Nov 2026',
    sector: 'consumer',
    crosslinkDesc: 'Engagement, day-2 activation, top video per user per day',
    accent: '#25F4EE',
    title: 'TikTok SQL Interview Questions — Engagement, Activation & Window Functions',
    description: 'TikTok SQL interview questions: what candidates and prep guides report about the data-science and data-engineering screens, including being asked to read or debug an existing query, and practice on engagement-shaped data.',
    hero: 'Candidates place SQL in TikTok\'s data-science process, and two recent reports describe being handed an existing query to read or debug rather than writing one from scratch. Practise joins, window functions and day-level activation questions here.',
    topicsLabel: 'Named in the sources, with counts',
    dataShape: 'what the prep guides\' practice questions use — videos (uploads, likes, dates), user interactions, and sign-up and confirmation events; no candidate report we could read describes the tables',
    format: [
      ['Roles the sources cover', 'Data Scientist and Data Engineer. We found no readable candidate report for a data-analyst loop, so this page describes none.', ['datalemur-tt', 'prachub-tt-ds-jun26', 'prachub-tt-de-sep25']],
      ['Data science stages', 'Recruiter screen, a hiring-manager screen, a loop of three or four rounds of about 45 minutes each (product sense, A/B testing, SQL, machine learning) plus behavioural rounds, then a final manager conversation; all virtual.', ['aced-tt', 'datalemur-ds-tt', 'prepfully-tt']],
      ['Read or debug a query', 'Two candidate reports describe being given an existing query instead of a blank editor: a data scientist (June 2026) was asked to explain what a query does and what it returns, and a data engineer (September 2025) to find and fix the bug in a pre-written daily-active-users query.', ['prachub-tt-ds-jun26', 'prachub-tt-de-sep25']],
      ['Platform', 'Sources disagree: one 2025 guide names HackerRank for the data-science screen, another guide says SQLPad, so this page names neither.', ['datalemur-ds-tt', 'prepfully-tt']],
    ],
    reportedTopics: ['Reading or debugging an existing query — 2 of the 3 candidate reports that describe the SQL', 'Window functions, such as each user\'s top item per day with a tie rule — both practice guides', 'Date logic: extracting a day or month and grouping by it — both practice guides'],
    difficulty: 'Not reliably reported, so this page does not grade it.',
    shapes: [
      ['Given a query, explain what it does and what it returns.', 'prachub-tt-ds-jun26'],
      ['A pre-written query meant to count daily active users has a bug: find it and fix it.', 'prachub-tt-de-sep25'],
      ['Sign-ups and text confirmations: users who did not confirm on day 1 but did on day 2.', 'datalemur-tt'],
      ['Videos with uploads and likes: each user\'s most-liked video per day, the earliest upload winning ties.', 'datalemur-tt'],
    ],
    sources: {
      'prachub-tt-ds-jun26': ['PracHub — TikTok Data Scientist: medium SQL and background follow-ups (candidate report, Jun 2026)', 'https://prachub.com/interview-experiences/tiktok-data-scientist-interview-experience-medium-sql-and-background-follow-ups-a9c0708de6', '5 Sep 2026'],
      'prachub-tt-de-sep25': ['PracHub — TikTok Data Engineer (USDS): a final round that ended before any SQL was written (candidate report, Sep 2025)', 'https://prachub.com/interview-experiences/tiktok-data-engineer-interview-experience-recruiter-chaos-and-a-final-round-that-ended-before-i-wrote-any-sql', '25 Aug 2026'],
      'aced-tt': ['Aced (formerly Exponent) — TikTok Data Scientist interview guide', 'https://www.aced.io/guides/tiktok-data-scientist-interview', 'shown as "updated 4 days ago" on 23 Nov 2026'],
      'datalemur-ds-tt': ['DataLemur — TikTok Data Scientist interview guide', 'https://datalemur.com/blog/tiktok-data-scientist-interview-guide', '5 Jan 2025'],
      'prepfully-tt': ['Prepfully — TikTok Data Scientist interview process (prep guide; names no sources)', 'https://prepfully.com/interview-guides/tiktok-data-scientist-interview-process', 'undated, read 23 Nov 2026'],
      'datalemur-tt': ['DataLemur — TikTok SQL interview questions (practice questions; covers Data Science and Data Engineering)', 'https://datalemur.com/blog/tiktok-sql-interview-questions', '5 Jan 2025'],
    },
  },

  linkedin: {
    name: 'LinkedIn',
    sector: 'bigtech',
    crosslinkDesc: 'Joins and HAVING, "has all three skills", within N days of signup',
    accent: '#0A66C2',
    title: 'LinkedIn SQL Interview Questions — Joins, HAVING & Signup Funnels',
    description: 'LinkedIn SQL interview questions: the data analyst and data science loops as candidates report them, the SQL that comes up (joins, HAVING, window functions, dates within N days of signup) and practice on matching data.',
    hero: 'Reported LinkedIn SQL rounds stress fundamentals over tricks — joins across two or three small business tables, "has every required skill", counts within N days of sign-up.',
    dataShape: 'profiles and company followers, candidate skills, job applications, and premium subscriptions after sign-up',
    format: [
      ['Roles', 'Data Analytics, Data Science and Data Engineering.', ['datalemur-li']],
      ['Data analyst loop', 'Recruiter screen, hiring-manager conversation, then a same-day final loop of two to three hours (technical, culture, stakeholder). The technical round uses a shared editor or SQL tool with two or three small business tables.', ['exponent-li']],
      ['Data science loop', 'Recruiter, hiring manager, one or two technical screens of 45–60 minutes that pair SQL with a case or statistics, then a loop of four or five rounds. In one 2026 catalogue of 58 questions, about 17% were data manipulation in SQL or Python.', ['prachub-li']],
      ['Emphasis', 'Fundamentals rather than advanced techniques; one staff-level report describes SQL as a small part of one onsite round.', ['exponent-li', 'sqlpad-li']],
    ],
    reportedTopics: ['Joins, including outer joins', 'Aggregation, COUNT DISTINCT and HAVING', 'Window functions and ranking', 'Date arithmetic (within N days of sign-up)', 'CTEs and subqueries', 'Funnels and conversion', 'NULL handling'],
    difficulty: 'Reported as easy-to-medium, "intermediate".',
    shapes: [
      ['Candidate skills, one row per skill: candidates who have all three of a required set of skills.', 'datalemur-q-li'],
      ['Profiles with follower counts and an employer, companies with follower counts: people with more followers than their employer.', 'datalemur-li'],
      ['Users with a sign-up date and country, subscriptions with a start date: premium sign-ups within 30 days of joining, by country.', 'exponent-li'],
    ],
    sources: {
      'exponent-li': ['Exponent — LinkedIn Data Analyst interview guide', 'https://www.tryexponent.com/guides/linkedin-data-analyst-interview', 'updated 2026'],
      'prachub-li': ['PracHub — LinkedIn Data Scientist interview guide', 'https://prachub.com/interview-guide/linkedin-data-scientist-interview-guide', 'updated 3 Sep 2026'],
      'sqlpad-li': ['SQLPad — LinkedIn Staff Data Scientist interview experience', null, '29 Apr 2024'],
      'datalemur-li': ['DataLemur — LinkedIn SQL interview questions', 'https://datalemur.com/blog/linkedin-sql-interview-questions', '12 Apr 2025'],
      'datalemur-q-li': ['DataLemur — matching skills question', 'https://datalemur.com/questions/matching-skills', 'undated'],
    },
  },

  microsoft: {
    name: 'Microsoft',
    sector: 'bigtech',
    crosslinkDesc: 'Data scientist and analyst SQL, joins, "bought from every category"',
    accent: '#00A4EF',
    title: 'Microsoft SQL Interview Questions for Data Scientists & Analysts',
    description: 'Microsoft SQL interview questions for data scientist and data analyst roles — not SQL Server administration. How the loop runs as candidates report it, where sources disagree, the SQL it tests, and practice sets that match.',
    hero: 'This page is about SQL in Microsoft\'s data scientist and analyst interviews — joins, aggregation, window functions and "customers who bought from every category" — not SQL Server administration questions.',
    dataShape: 'product purchases and cloud product categories, app downloads by paying vs free accounts, and messaging activity',
    format: [
      ['Roles', 'Data Analyst, Data Scientist and BI roles; SQL is described as almost always tested.', ['datalemur-ms']],
      ['Data science stages', 'A recruiter screen of about 30 minutes, a 45-minute technical screen (SQL, statistics, ML fundamentals), then a final loop of four or five rounds of 45–60 minutes in one day.', ['exponent-ms']],
      ['Online assessment', 'Sources disagree. One guide describes a data science assessment on CodeSignal; another describes live coding only, with no online assessment. We could not confirm either.', ['datalemur-ds-ms', 'exponent-ms']],
      ['What the loop weighs', 'A dedicated coding round (SQL and/or Python) sits beside ML, experimentation, a business case and behavioural rounds.', ['exponent-ms']],
    ],
    reportedTopics: ['Joins, including multi-table and self-joins', 'Aggregation with GROUP BY', 'Window functions (RANK vs DENSE_RANK)', 'CTEs and subqueries', 'CASE and conditional aggregation', 'Filtering and pattern matching'],
    difficulty: 'Mostly medium, with easy filter and concept questions mixed in.',
    shapes: [
      ['Purchases by user and date: users with more than ten purchases in a single month.', 'datalemur-ms'],
      ['Purchases by customer and product plus a product catalogue with categories: customers who bought from every category.', 'datalemur-q-ms'],
      ['Users, paying and non-paying accounts, and daily downloads: dates on which non-paying users downloaded more than paying ones.', 'stratascratch-ms'],
    ],
    sources: {
      'exponent-ms': ['Exponent — Microsoft Data Scientist interview guide (by Microsoft candidates)', 'https://www.tryexponent.com/guides/microsoft-data-scientist-interview', 'updated mid-2026'],
      'datalemur-ms': ['DataLemur — Microsoft SQL interview questions and data science guide', 'https://datalemur.com/blog/microsoft-sql-interview-questions', '8 May 2025'],
      'datalemur-ds-ms': ['DataLemur — Microsoft data science interview guide', 'https://datalemur.com/blog/microsoft-data-science-interview', '8 May 2025'],
      'datalemur-q-ms': ['DataLemur — supercloud customer question', 'https://datalemur.com/questions/supercloud-customer', 'undated'],
      'stratascratch-ms': ['StrataScratch — Microsoft SQL interview questions', 'https://www.stratascratch.com/blog/microsoft-sql-interview-questions', '30 Oct 2023'],
    },
  },

  // 2026-11-23: rewritten from the R1 dossier docs/reads/companies/bloomberg.md
  // (sources read 2026-11-23). Out: the two data-analyst rows (one prep guide
  // that names no sources — low), "prices, trades and sessions" as a reported
  // fact (it is DataLemur's practice set), the ranked topic list and two topics
  // from snippets never opened, the difficulty grade. The one data-engineering
  // screen report (B1) is low and stays off the page.
  bloomberg: {
    name: 'Bloomberg',
    accessed: '23 Nov 2026',
    sector: 'fintech',
    crosslinkDesc: 'Time-bucketed aggregation, prices and trades, ranking',
    accent: '#F6A100',
    title: 'Bloomberg SQL Interview Questions — Prices, Trades & Time Buckets',
    description: 'Bloomberg SQL interview questions: what is and is not reliably reported about the data-role SQL round, and practice on time-bucketed financial SQL.',
    hero: 'Bloomberg\'s data-role SQL format is thinly reported, and this page says so: no candidate report we could read describes the data-analyst SQL round. What is here is practice on time-bucketed financial SQL, built from our bank and a public practice guide, not from reports of Bloomberg\'s questions.',
    topicsLabel: 'In one public practice guide, not candidate reports',
    dataShape: 'what DataLemur\'s Bloomberg-tagged practice questions use — daily prices, trades and volume, terminal sessions and exchange data subscriptions; no candidate report we could read describes the tables',
    format: [
      ['Data analyst process', 'One prep guide describes the data-analyst stages, but it names no sources and no candidate report we could read confirms them, so this page does not state them.', ['ophyai-bb']],
      ['SQL screen for data roles', 'Not reliably reported. The assessment platform reported for Bloomberg is for software-engineering phone screens, not data roles, so this page names none.', []],
    ],
    reportedTopics: ['Aggregation by time period (monthly and daily averages)', 'Window functions and ranking', 'Date-window filters (the last 30 days)', 'Second-highest value', 'HAVING on a count threshold'],
    difficulty: 'Not reliably reported, so this page does not grade it.',
    shapes: [
      ['Terminal sessions by user: the users with more than 1,000 sessions in a year.', 'datalemur-bb'],
      ['Trades by symbol and date: the average daily trading volume per symbol.', 'datalemur-bb'],
      ['Customers and exchange data subscriptions with start dates and status: US customers with an active subscription started in the last 30 days.', 'datalemur-bb'],
    ],
    sources: {
      'ophyai-bb': ['OphyAI — Bloomberg interview guide (prep guide; names no sources)', 'https://ophyai.com/blog/company-guides/bloomberg-interview-guide', 'updated 6 Nov 2026'],
      'datalemur-bb': ['DataLemur — Bloomberg SQL interview questions (its own practice questions)', 'https://datalemur.com/blog/bloomberg-sql-interview-questions', '17 Apr 2025'],
    },
  },
  // 2026-11-20 — research notes: docs/reads/company-research-2026-11-20.md.
  paypal: {
    name: 'PayPal',
    // The day the sources were fetched (the page's "Accessed" line).
    accessed: '20 Nov 2026',
    sector: 'fintech',
    crosslinkDesc: 'Payments and fraud, conditional sums, WHERE vs ON',
    accent: '#003087',
    title: 'PayPal SQL Interview Questions — Payments & Fraud',
    description: 'PayPal SQL interview questions: analyst and data scientist rounds as candidates report them, the SQL they test, and practice on payment data. Sourced and dated.',
    hero: 'Candidate reports from 2023 to 2025 put SQL in every PayPal data loop they describe — a HackerRank assessment for an analyst intern, a one-hour phone round, an onsite round of three SQL questions — next to rounds on fraud and risk. Practise that shape here, on payment data.',
    dataShape: 'payments between users (payer, recipient, amount), account transactions (deposits and withdrawals), and card transactions with merchants and risk flags',
    format: [
      ['Roles where SQL is tested', 'Data Science, Data Engineering and Data Analytics.', ['datalemur-pp']],
      ['Data scientist process', 'A prep guide describes four to five rounds over three to four weeks, including a live SQL and Python round of 45–60 minutes on a shared screen. The guide does not say where its round descriptions come from.', ['prachub-guide-pp']],
      ['Phone rounds', 'One data scientist report (interview December 2025) describes a 15-minute recruiter call, then two one-hour phone rounds: SQL and Python with a short case, then statistics and causal inference. Its one SQL question carried many filter conditions, and where each sat — WHERE or the join\'s ON — mattered.', ['prachub-phone-pp']],
      ['Onsite', 'Another data scientist report (interview July 2025) describes three back-to-back onsite rounds: two on fraud and risk decisions, one of three SQL questions in which the interviewer asked for conditional aggregation with CASE WHEN rather than a plain sum.', ['prachub-onsite-pp']],
      ['Data analyst intern', 'A 2023 report describes a one-hour HackerRank assessment (ten multiple-choice questions across ML, SQL, probability and statistics, plus one Python question), then a technical round with one SQL query in a HackerRank editor, and a hiring-manager round with SQL the candidate called medium to tough.', ['gfg-pp']],
      ['What is not settled', 'The reports span 2023 to 2025, intern to experienced, and different teams; no source states one format for every PayPal data role. Only the intern report says the code was run (against test cases).', []],
    ],
    reportedTopics: ['Conditional aggregation (CASE WHEN inside SUM or COUNT)', 'Aggregates in HAVING', 'Joins, and filters in WHERE vs ON', 'Ranking with ties (average transaction per user)', 'Funnels and conversion rates', 'Transaction-flow and segmentation analysis', 'Anomaly and data-quality checks on transactions'],
    // The one line on a metrics or case round, from the sources above
    // (scripts/build-company-pages.mjs, caseRoundLine).
    caseRound: { note: 'One data scientist report describes onsite rounds on fraud and risk decisions, one of them a fraud-labelling case; another puts a short case inside a phone round.', sources: ['prachub-onsite-pp', 'prachub-phone-pp'] },
    difficulty: 'Reported as medium in a July 2025 onsite and hard, by the candidate\'s own account, in a December 2025 phone round; the 2023 intern report calls the hiring-manager SQL medium to tough.',
    shapes: [
      ['Deposits and withdrawals per account: each account\'s closing balance.', 'datalemur-q-pp'],
      ['Payments from one user to another: how many pairs of users have sent money in both directions.', 'datalemur-pp'],
      ['Users with sign-up dates and their transactions: total and average spend per user, only for users with at least two transactions.', 'datalemur-pp'],
    ],
    sources: {
      'datalemur-pp': ['DataLemur — PayPal SQL interview questions', 'https://datalemur.com/blog/paypal-sql-interview-questions', '7 Jan 2025'],
      'datalemur-q-pp': ['DataLemur — final account balance question (PayPal-tagged)', 'https://datalemur.com/questions/final-account-balance', 'undated'],
      'gfg-pp': ['GeeksforGeeks — PayPal Data Analyst Intern interview experience (off-campus, 2023)', 'https://www.geeksforgeeks.org/?p=980248', '16 Mar 2023'],
      'prachub-onsite-pp': ['PracHub — PayPal Data Scientist onsite, three back-to-back rounds (candidate report, interview Jul 2025)', 'https://prachub.com/interview-experiences/paypal-data-scientist-interview-experience-three-back-to-back-onsite-rounds-and-a-sql-standoff', '24 Aug 2026'],
      'prachub-phone-pp': ['PracHub — PayPal Data Scientist, two phone rounds (candidate report, interview Dec 2025)', 'https://prachub.com/interview-experiences/paypal-data-scientist-interview-experience-two-brutal-phone-rounds-on-sql-python-and-airport-causal-inference', '25 Aug 2026'],
      'prachub-guide-pp': ['PracHub — PayPal Data Scientist interview guide', 'https://prachub.com/interview-guide/paypal-data-scientist-interview-guide', 'updated 3 Nov 2026'],
    },
  },

  coinbase: {
    name: 'Coinbase',
    // The day the sources were fetched (the page's "Accessed" line).
    accessed: '20 Nov 2026',
    sector: 'fintech',
    crosslinkDesc: 'Crypto trades, 30-day activity, 7-day retention, cohorts',
    accent: '#0052FF',
    title: 'Coinbase SQL Interview Questions — Trades & Retention',
    description: 'Coinbase SQL interview questions: the data science loop as candidates report it, the SQL it tests (30-day activity, retention) and practice. Sourced and dated.',
    hero: 'Two data scientist reports from 2025 each describe two SQL questions on users and their trades — who is active in the last 30 days, 7-day retention, time from adoption to first transaction — with the interviewer pressing on how each metric is defined.',
    dataShape: 'crypto trades (user, asset, volume, time), sign-ups and first trades, and user transactions with an adoption time and a region',
    format: [
      ['Roles where SQL is tested', 'Data Science, Analytics and Data Engineering.', ['datalemur-cb']],
      ['Overall process', 'A prep guide describes a 30-minute recruiter screen, a 30-minute online assessment for all candidates, a final round of four 60-minute interviews over Google Meet, then a work trial — a case on a dataset, presented to a panel.', ['aced-cb']],
      ['The SQL round', 'One senior data scientist report (interview March 2025) calls the SQL and data analysis round the most important: two questions written in CoderPad, on trades and sign-ups, with follow-ups on how retention should be defined.', ['prachub-sr-cb']],
      ['Onsite', 'Another data scientist report (interview October 2025) describes an onsite with a case study, two SQL questions — the second in three parts — and a live Python round of exploratory analysis and modelling on a dataset.', ['prachub-ds-cb']],
      ['Where sources differ', 'The guide describes the data science round as a conversation plus a whiteboard part; the March 2025 report names CoderPad. Neither report says whether the SQL was run. A second guide lists more rounds, including an AI-led behavioural screen for some 2025–2026 candidates.', ['aced-cb', 'prachub-sr-cb', 'prachub-guide-cb']],
    ],
    reportedTopics: ['Time-window filters (the last 30 days)', 'COUNT DISTINCT and choosing the denominator', 'Retention and cohort timing (7-day retention)', 'Rates (adoption, transaction rate)', 'Time between events (adoption to first transaction)', 'First event per user, compared with later rows', 'Running and cumulative sums', 'Layered CTEs and window functions'],
    caseRound: { note: 'Both data scientist reports describe a case next to the SQL, and follow-ups on how a metric such as retention is defined; a prep guide describes a work-trial case presented to a panel.', sources: ['prachub-sr-cb', 'prachub-ds-cb', 'aced-cb'] },
    difficulty: 'Reported as medium by one candidate and hard by another; the medium report says the SQL itself was not especially hard and the interviewer weighed the reasoning.',
    shapes: [
      ['Trades by user, time, volume and asset: the share of users with three or more trades in the last 30 days.', 'prachub-sr-cb'],
      ['Users with a sign-up date and their trades: 7-day retention — and whether day zero is the sign-up or the first trade.', 'prachub-sr-cb'],
      ['User transactions with an adoption time and regions: adoption and transaction rates, the time from adoption to first transaction, and transactions made outside the region of the user\'s first one.', 'prachub-ds-cb'],
      ['Trades by currency and day: daily volume per currency and the change from the day before.', 'datalemur-cb'],
    ],
    sources: {
      'aced-cb': ['Aced (formerly Exponent) — Coinbase interview process', 'https://www.aced.io/blog/coinbase-interview-process', 'shown as "last updated 2 months ago" on 20 Nov 2026'],
      'prachub-sr-cb': ['PracHub — Coinbase Senior Data Scientist interview experience (candidate report, interview Mar 2025)', 'https://prachub.com/interview-experiences/coinbase-senior-data-scientist-interview-experience-sql-a-b-test-design-and-a-btc-volatility-case', '25 Aug 2026'],
      'prachub-ds-cb': ['PracHub — Coinbase Data Scientist onsite (candidate report, interview Oct 2025)', 'https://prachub.com/interview-experiences/coinbase-data-scientist-interview-experience-case-study-sql-and-a-live-python-eda-round', '25 Aug 2026'],
      'prachub-guide-cb': ['PracHub — Coinbase Data Scientist interview guide', 'https://prachub.com/interview-guide/coinbase-data-scientist-interview-guide', 'updated 3 Nov 2026'],
      'datalemur-cb': ['DataLemur — Coinbase SQL interview questions', 'https://datalemur.com/blog/coinbase-sql-interview-questions', '20 Feb 2025'],
    },
  },

  monzo: {
    name: 'Monzo',
    // The day the sources were fetched (the page's "Accessed" line).
    accessed: '20 Nov 2026',
    sector: 'fintech',
    crosslinkDesc: 'Take-home SQL or Python on a business question, then a review of your logic',
    accent: '#FF4F40',
    title: 'Monzo SQL Interview Questions — Take-Home and Review',
    // #209's `publishes`: the sources are Monzo's own posts, so the page must not
    // open with "Monzo does not publish the format" (R1 batch 5).
    publishes: 'Monzo publishes how its data interviews run, in posts on its own blog, and this page is built from them.',
    description: 'Monzo SQL interview: the data take-home as Monzo itself describes it, the review that follows, and practice on neobank ledger data. Sourced and dated.',
    hero: 'Monzo\'s own hiring posts describe the SQL as a take-home, not a live test: a business question answered in SQL or Python in your own time, then an interview that walks through your logic, trade-offs and testing. Practise that shape here, on data that looks like a bank account\'s ledger.',
    dataShape: 'accounts (signup date, plan, country), card transactions (merchant, category, amount, status, timestamps), transfers in and out between customers, and money moved into and out of savings pots',
    format: [
      ['Roles where SQL is tested', 'Data Science (the take-home is written in SQL or Python) and Analytics Engineering (Monzo names its stack as dbt, BigQuery, Looker, SQL and some Python).', ['monzo-ds-2026', 'monzo-ae-2026']],
      ['Stages (Data Science, 2026)', 'A 15-minute recruiter call, a 45-minute initial call with a senior or lead data scientist, a technical screen, then final interviews of 2–3 hours: an open-ended case study and a behavioural interview. Senior and lead roles may add a leadership interview.', ['monzo-ds-2026']],
      ['Where the SQL is', 'In the technical screen, as a take-home coding task: clear, sensible SQL or Python that answers business questions with data, done in your own time rather than live in front of a panel. Monzo lists the technical screen as one hour; the post does not say how that hour divides between the task and the interview.', ['monzo-ds-2026']],
      ['The review', 'A technical interview with a data science manager or lead goes through the submission — its logic, trade-offs and testing — then an analytical discussion (experimentation, success metrics) and a communication part (explaining results, spotting misleading charts). Monzo says it is less about trivia than about reasoning.', ['monzo-ds-2026']],
      ['Time limit', 'The 2026 post sets none; the 2022 post says the take-home had no time limit and usually ended in a slide deck. The Analytics Engineering post gives its take-home one week.', ['monzo-ds-2026', 'monzo-data-2022', 'monzo-ae-2026']],
      ['How it has changed', 'The 2022 post describes a ~30-minute recruiter call and a take-home presented as slides; the 2026 Data Science post a 15-minute call and a technical interview on the code. A data scientist who joined in 2022 describes his take-home as metric formulation with extensive SQL and data visualisation.', ['monzo-data-2022', 'monzo-ds-2026', 'monzo-joiner-2022']],
      ['Environment', 'Monzo\'s analytics run on BigQuery, dbt and Looker. None of the sources we could read says which tool the take-home itself is done in.', ['monzo-ae-2026', 'monzo-joiner-2022']],
    ],
    reportedTopics: ['Turning a stakeholder\'s question into a metric, then into SQL', 'Metrics over a period: counts, rates and ratios with GROUP BY', 'Readable, testable SQL you can defend line by line', 'Experiment and success-metric reasoning on top of the query', 'Data modelling into clean tables (Analytics Engineering)', 'Explaining a result to a non-technical reader'],
    caseRound: { note: 'Monzo\'s own posts describe an open-ended case study in the final interviews and a review that covers success metrics; a data scientist who joined in 2022 describes a take-home on metric formulation.', sources: ['monzo-ds-2026', 'monzo-joiner-2022'] },
    difficulty: 'No source we could read grades it; Monzo describes the bar as clear, sensible code and sound reasoning rather than trivia, and the 2022 post set no time limit on the take-home.',
    shapes: [
      ['A data request arrives in plain business language: decide what to measure, write the SQL (or Python) that answers it, and present the finding so a non-technical reader can act on it.', 'monzo-ds-2026'],
      ['Formulate a metric for an area of the product, compute it with SQL, and show it as a chart.', 'monzo-joiner-2022'],
      ['In the follow-up, defend your own submission: why this join or filter, what you assumed about the data, how you checked the numbers.', 'monzo-ds-2026'],
      ['Analytics Engineering: model raw data into tables others will query, pragmatic rather than over-engineered, and explain the modelling trade-offs.', 'monzo-ae-2026'],
    ],
    sources: {
      'monzo-ds-2026': ['Monzo blog — Interviewing for Data Science at Monzo (Monzo\'s recruiting team)', 'https://monzo.com/blog/interviewing-for-data-science-at-monzo', '27 Apr 2026'],
      'monzo-ae-2026': ['Monzo blog — Interviewing for Analytics Engineering at Monzo (Monzo\'s recruiting team)', 'https://monzo.com/blog/interviewing-for-analytics-engineering-at-monzo', '25 May 2026'],
      'monzo-data-2022': ['Monzo blog — Data hiring at Monzo: the interview process', 'https://monzo.com/blog/2022/03/21/data-hiring-at-monzo', '21 Mar 2022'],
      'monzo-joiner-2022': ['Monzo blog — Joining Monzo as a data scientist (first-person account)', 'https://monzo.com/blog/2022/05/18/joining-monzo-as-a-data-scientist', '17 May 2022'],
    },
  },

  // 2026-11-22 — research notes: docs/reads/company-research-2026-11-22.md
  // (Nubank and N26 researched the same day and deferred, with reasons).
  chime: {
    name: 'Chime',
    // The day the sources were fetched (the page's "Accessed" line).
    accessed: '22 Nov 2026',
    sector: 'fintech',
    crosslinkDesc: 'Users and transactions: timestamps, rolling sums, a retention signal',
    accent: '#1EC677',
    title: 'Chime SQL Interview Questions — Users & Retention',
    description: 'Chime SQL interview questions: data scientist screens as candidates report them, the SQL they test (timestamps, windows, retention) and practice. Sourced and dated.',
    hero: 'Two data scientist reports from late 2025 describe Chime\'s SQL on two tables, users and transactions: timestamps to truncate, CTEs, then ranking, the row before and a rolling sum — and, in one hiring-manager screen, a retention question with no schema given. Practise that shape here, on a card-transaction ledger.',
    dataShape: 'users and their transactions, with the transaction time stored as a full timestamp',
    format: [
      ['Roles where SQL is tested', 'Two of the reports are for Data Scientist; a third, for a software engineering role leaning toward data engineering, also had SQL.', ['prachub-ts-ch', 'prachub-hm-ch', 'prachub-swe-ch']],
      ['Technical screen', 'One data scientist report (interview October 2025) describes a technical screen of one hour of SQL and one hour of a business case on a spreadsheet of metrics. The candidate wrote that a fast candidate gets through five or six SQL questions in the hour.', ['prachub-ts-ch']],
      ['Hiring-manager screen', 'Another data scientist report (interview November 2025) describes a recruiter screen, then a one-hour hiring-manager screen split in two: 30 minutes on background, 30 minutes writing SQL. The candidate was told Chime no longer gives a take-home and the next step was the virtual onsite.', ['prachub-hm-ch']],
      ['The data', 'Both data scientist reports describe two tables, users and transactions. In the hiring-manager screen no schema was given: the candidate queried the rows first to learn the columns, then had to define a retention metric before writing it.', ['prachub-ts-ch', 'prachub-hm-ch']],
      ['Software engineering role', 'A report for a software role leaning toward data engineering (October 2025) calls the SQL very basic and says it did not include window functions.', ['prachub-swe-ch']],
      ['What is not settled', 'All three are single candidate reports from late 2025. None names the coding tool, and none describes a data analyst loop; no source we could read states one format for every Chime data role.', []],
    ],
    reportedTopics: ['Timestamps truncated to a day or month before grouping', 'Layered CTEs', 'Ranking with ties kept', 'Comparing a row with the one before it', 'Rolling sums over a window', 'Defining a retention metric from users and transactions', 'Basic joins and aggregation (the software engineering report)'],
    caseRound: { note: 'One data scientist report describes an hour of business case on a spreadsheet of metrics next to the SQL hour; another, a retention metric the candidate had to define before writing it.', sources: ['prachub-ts-ch', 'prachub-hm-ch'] },
    difficulty: 'Reported as medium in the October 2025 technical screen and easy in the November 2025 hiring-manager screen, which ended in a rejection; the software engineering report calls its SQL easy.',
    shapes: [
      ['Users and their transactions, the transaction time a full timestamp: metrics per day or month, which means truncating the timestamp first.', 'prachub-ts-ch'],
      ['The same two tables: rank with ties kept, compare each row with the one before it, and a rolling sum over a window.', 'prachub-ts-ch'],
      ['Users and transactions with no schema given: what early behaviour signals that a user will be retained — define the metric, then write the SQL.', 'prachub-hm-ch'],
    ],
    sources: {
      'prachub-ts-ch': ['PracHub — Chime Data Scientist technical screen, SQL and a business case (candidate report, interview Oct 2025)', 'https://prachub.com/interview-experiences/chime-data-scientist-interview-experience-sql-and-a-business-case-in-one-technical-screen', '25 Aug 2026'],
      'prachub-hm-ch': ['PracHub — Chime Data Scientist hiring-manager screen, a retention question with no schema (candidate report, interview Nov 2025)', 'https://prachub.com/interview-experiences/chime-data-scientist-interview-experience-a-schema-less-sql-retention-question-in-the-hm-screen', '25 Aug 2026'],
      'prachub-swe-ch': ['PracHub — Chime Software Engineer, basic SQL without window functions (candidate report, Oct 2025)', 'https://prachub.com/interview-experiences/chime-software-engineer-interview-basic-sql-without-window-functions-e4b3c47621', '17 Sep 2026'],
    },
  },
};

// The SQL Quest challenges tagged to each new company, chosen against the
// topics and data shape the sources above report — one line of reasoning per
// group, in src/data/challenge-companies.js. Balanced Easy → Hard on purpose:
// a free visitor must be able to start the set. The Revolut set (300-311)
// stays Revolut-only by rule (tests/revolut-challenges.test.js).
export const NEW_COMPANY_TAGS = {
  DoorDash: [138, 147, 174, 175, 75, 118, 162, 172, 173, 126, 153, 12, 20, 50, 84, 88, 26, 60],
  'Goldman Sachs': [144, 145, 177, 41, 183, 162, 107, 16, 294, 275, 293, 73, 48, 89, 24, 216],
  Walmart: [105, 158, 176, 188, 37, 66, 157, 162, 154, 121, 71, 20, 61, 12, 64, 86],
  TikTok: [175, 176, 138, 124, 139, 162, 160, 126, 172, 60, 88, 82, 67, 40, 9, 84],
  LinkedIn: [174, 175, 158, 188, 170, 106, 107, 159, 114, 149, 121, 161, 77, 17, 23, 74],
  Microsoft: [105, 138, 128, 179, 113, 14, 121, 157, 66, 111, 112, 77, 82, 61, 23, 31],
  Bloomberg: [275, 288, 289, 202, 211, 282, 292, 294, 281, 160, 163, 217, 283, 299, 216, 89],
  // 2026-11-20. PayPal: payments and fraud — conditional sums, a LEFT JOIN
  // whose filter placement changes the answer (280), ties in a rank (292),
  // HAVING, anomaly and velocity rules, a funnel. Coinbase: activity windows,
  // retention cohorts, first-to-next event timing, running sums — on the
  // e-commerce and card ledgers (we have no trades table). Monzo: a bank
  // ledger — period metrics, dormancy, shares, rolling and cumulative spend.
  // The Revolut set (300-311) stays Revolut-only.
  PayPal: [286, 287, 276, 285, 175, 280, 281, 290, 291, 292, 157, 270, 271, 297, 298, 82],
  Coinbase: [138, 147, 277, 275, 289, 121, 126, 172, 173, 162, 88, 60, 284, 11, 68, 84],
  Monzo: [275, 289, 288, 285, 176, 295, 278, 282, 293, 294, 157, 283, 299, 296, 88, 86],
  // 2026-11-22. Chime: users and transactions — timestamps truncated, CTEs,
  // ties, the row before, rolling sums, a retention signal. One line per id
  // in NEW_COMPANY_TAG_REASONS below.
  Chime: [289, 275, 277, 174, 175, 291, 292, 160, 172, 294, 278, 121, 283, 284, 88, 50],
};

// One line of reasoning per tagged challenge, for sets from 2026-11-22 on:
// why this challenge practises what the company's sources report. A set
// without a line for every id, or one that copies another company's set
// (Jaccard ≥ 0.5), fails tests/company-set-distinct.test.js — that is how a
// name-swapped doorway would look.
export const NEW_COMPANY_TAG_REASONS = {
  Chime: {
    289: 'transaction timestamps bucketed to a day — the truncate-then-group step both DS reports start with',
    275: 'a month-level metric per account from a timestamp',
    277: 'users joined to their transactions and grouped by sign-up month',
    174: 'the users-to-transactions join with a filter, the basic opener',
    175: 'users with no transactions survive a LEFT JOIN — the denominator of any retention rate',
    291: 'per-user totals across two child tables without the join fan-out',
    292: 'ranking on transaction counts when ties are kept',
    160: 'RANK against DENSE_RANK side by side — the tie rule the October 2025 report names',
    172: 'each transaction compared with the one before it',
    294: 'a running sum over daily spend',
    278: 'no transactions in the last 14 days — the churn side of retention',
    121: 'users active in more than one month — a simple retention signal',
    283: 'a rolling 30-day sum per account',
    284: 'time from first to second transaction — an early-retention signal',
    88: 'retention by sign-up cohort',
    50: 'a 7-day rolling average over a timestamped series',
  },
};

// ---------------------------------------------------------------------------
// Sourced formats for pages that predate the template (founder's list item 9,
// 2026-09-14).
//
// The twenty-one older pages state no format at all — correct since the
// 2026-09-07 incident, but it leaves the highest-intent companies with less
// than the seven generated pages carry. These entries give an older page the
// same sourced format section, injected by scripts/build-company-pages.mjs,
// and move its slug into SOURCED_SLUGS.
//
// Same rule as above and no softer: every row cites keys that resolve to a
// dated source that was actually FETCHED on the research date. Sources read
// only as a search-result snippet are not here. Where a source gives a
// relative date ("updated 2 months ago"), the entry records what it said and
// the day we read it, not a guess. Research notes:
// docs/reads/company-research-2026-09-14.md.
//
// Adding a company: research, then an entry here, then
// `node scripts/build-company-pages.mjs`. The guard in
// tests/company-pages.test.js will start holding the page to rule 1 the
// moment its slug appears, so the entry has to be right before it ships.
// ---------------------------------------------------------------------------
export const SOURCED_FORMATS = {
  amazon: {
    name: 'Amazon',
    role: 'Business Intelligence Engineer / data analytics roles',
    format: [
      ['Stages', 'A recruiter screen of about 30 minutes, one or two technical phone screens, then a virtual onsite loop of about five rounds.', ['blind-amzn', 'exponent-amzn']],
      ['Round length', 'One candidate report puts the technical phone screens at 75 minutes each and the onsite rounds at roughly 60 minutes. A prep guide describes the onsite as five to six rounds of 45 minutes to an hour.', ['blind-amzn', 'exponent-amzn']],
      ['Environment', 'The same report describes SQL written on a "CoderPad-style" editor where you often cannot execute the query, so correctness has to be reasoned rather than run.', ['blind-amzn']],
      ['What the SQL round covers', 'Joins, window functions and ranking, with follow-ups on edge cases; the guide says to expect at least five questions across SQL, Python, visualisation and business analytics in the technical screen, without splitting out how many are SQL.', ['blind-amzn', 'exponent-amzn']],
      ['Alongside the SQL', 'Leadership Principles come up throughout, including inside technical rounds — not only in the behavioural ones.', ['exponent-amzn', 'blind-amzn']],
      // 2026-10-21: one round reported to us by email (docs/reads/amazon-bie-candidate-report-2026-10-21.md).
      ['A round reported to us', 'A Business Intelligence Engineer candidate described a 60-minute technical and behavioural round in October 2026: three SQL problems, each followed by questions about the query and changes to it — why a self-join, what a JOIN with no type performs, COUNT(*) against COUNT(column), ROW_NUMBER against RANK and DENSE_RANK, and how duplicate rows change a streak. The shapes: employees paid above their department\'s average; reviewers who rated the same title exactly twice with the second rating higher; users with three or more consecutive login days, with the streak\'s start and length.', ['reported-amzn']],
    ],
    sources: {
      'blind-amzn': ['Blind — "Amazon Business Intelligence Engineer (BIE L5) Interview 2025" (candidate report, replies to 15 Oct 2025)', 'https://www.teamblind.com/post/amazon-business-intelligence-engineer-bie-l5-interview-2025-jdr2idmd', '14 Sep 2025'],
      'exponent-amzn': ['Exponent — Amazon Business Intelligence Engineer interview guide', 'https://www.tryexponent.com/guides/amazon-bie-interview', 'shown as "updated 2 months ago" on 14 Sep 2026'],
      // `direct`: told to us, not published — the page says so and names no one.
      'reported-amzn': ['A Business Intelligence Engineer candidate, by email to SQL Quest (name withheld at their request)', null, '21 Oct 2026', 'direct'],
    },
  },
  // 2026-11-23: the data-scientist screen added and the data-engineer rows
  // softened where 2026 sources contest them (R1 dossier
  // docs/reads/companies/meta.md, sources read 2026-11-22/23). Only rows the
  // dossier rates high or medium; the two Blind reports were read on
  // 2026-09-14 and not re-read (Blind answered 402 in November).
  meta: {
    name: 'Meta',
    role: 'Data Scientist (product analytics) and Data Engineer',
    accessed: '22 Nov 2026',
    format: [
      ['Data scientist screen', 'One technical screen holds the SQL and a product or analytics case together, with one or two SQL questions. Two reports put the whole screen at 45 minutes; a third describes a 30-minute SQL call followed by a product case on the same tables.', ['prachub-meta-ds-aug25', 'prachub-meta-ds-sep26', 'aced-meta-ds-exp', 'aced-meta-ds']],
      ['Define the metric first', 'Data-scientist candidates describe being asked to define the metric before writing the query — which denominator (events or users), which window, what counts as performance.', ['prachub-meta-ds-aug25', 'prachub-meta-ds-sep26', 'aced-meta-ds-exp']],
      ['The clock', 'Time is the reported difficulty: one candidate calls the SQL fairly simple and still spent about 20 minutes on it, another did not finish both SQL questions, a third names time pressure as the hard part.', ['prachub-meta-ds-aug25', 'prachub-meta-ds-sep26', 'prachub-meta-ds-jul26']],
      ['Data scientist loop', 'The full loop is reported to include a separate SQL interview beside product cases, statistics and a behavioural round.', ['aced-meta-ds', 'aced-meta-ds-exp']],
      ['Data engineer screen', 'SQL and Python in the same screen. Sources disagree on the count: three SQL and two Python in both 2025 reports, three and three or five and five in a 2026 guide, one and one in a Senior+ report from September 2026 — so this page does not state one.', ['blind-meta-apr25', 'blind-meta-mar25', 'aced-meta-de', 'prachub-meta-de-sep26']],
      ['Does the code run?', 'Sources disagree. A 2025 report says the code is not expected to run in the screen or the onsite; a 2026 guide says solutions are checked against test cases.', ['blind-meta-apr25', 'aced-meta-de']],
      ['Data engineer onsite', 'Described as several rounds spanning product sense, data modelling, SQL, Python and behavioural. No candidate report gives a length for the individual rounds, so this page does not state one.', ['blind-meta-apr25', 'aced-meta-de']],
      ['What the SQL covers', 'Across six candidate reports from both tracks, the SQL named is joins (four reports), date logic such as trailing windows and signup cohorts (four), conditional aggregation and ratios (three), window functions (three) and CTEs or subqueries (two). No report names a dialect.', ['blind-meta-mar25', 'prachub-meta-ds-aug25', 'prachub-meta-ds-sep26', 'prachub-meta-ds-jul26', 'aced-meta-ds-exp']],
    ],
    sources: {
      'prachub-meta-ds-aug25': ['PracHub — Meta Senior Data Scientist, L5 product analytics: a 45-minute SQL and A/B test screen (candidate report, interview Aug 2025)', 'https://prachub.com/interview-experiences/meta-senior-data-scientist-interview-experience-45-minute-sql-and-a-b-test-screen-for-l5-product-analytics', '25 Aug 2026'],
      'prachub-meta-ds-sep26': ['PracHub — Meta Senior Data Scientist: product sense plus two SQL questions (candidate report, interview Sep 2026)', 'https://prachub.com/interview-experiences/meta-senior-data-scientist-interview-experience-notification-product-sense-plus-two-sql-questions-rejected', '12 Nov 2026'],
      'prachub-meta-ds-jul26': ['PracHub — Meta Data Scientist: timed SQL cases and A/B experiment design (candidate report, Jul 2026)', 'https://prachub.com/interview-experiences/meta-data-scientist-interview-timed-sql-cases-and-a-b-experiment-design-c96ea68fd2', '4 Sep 2026'],
      'aced-meta-ds-exp': ['Aced (formerly Exponent) — Meta Data Scientist interview experiences (candidate reports; the dated ones submitted Jul and Aug 2026)', 'https://www.aced.io/guides/meta-data-scientist-interview/experiences', 'submitted 6 Jul and 9 Aug 2026'],
      'aced-meta-ds': ['Aced (formerly Exponent) — Meta Data Scientist interview guide', 'https://www.aced.io/guides/meta-data-scientist-interview', 'shown as "updated 3 days ago" on 22 Nov 2026'],
      'blind-meta-apr25': ['Blind — "Meta Data Engineer 2025 Interview Experience" (candidate report, E4 offer; read 14 Sep 2026)', 'https://www.teamblind.com/post/meta-data-engineer-2025-interview-experience-zuvy6qgj', '5 Apr 2025'],
      'blind-meta-mar25': ['Blind — "Meta Data Engineer: Technical Screen-Help" (poster plus two replying candidates; read 14 Sep 2026)', 'https://www.teamblind.com/post/meta-data-engineer-technical-screen-help-6fy3wafy', '17 Mar 2025'],
      'aced-meta-de': ['Aced (formerly Exponent) — Meta Data Engineer interview guide', 'https://www.aced.io/guides/meta-data-engineer-interview', 'shown as "updated 3 days ago" on 22 Nov 2026'],
      'prachub-meta-de-sep26': ['PracHub — Meta Senior+ Data Engineer: leadership and fullstack phone screen (candidate report, interview Sep 2026)', 'https://prachub.com/interview-experiences/meta-seniorplus-data-engineer-interview-experience-leadership-and-fullstack-phone-screen-rejected-over-not-enough-impact', '19 Sep 2026'],
    },
  },
  // 2026-11-23: Apple becomes a sourced page on the R1 batch-5 dossier
  // (docs/reads/companies/apple.md, sources read 2026-11-23). Only the rows it
  // rates medium: the data-scientist screen pairs SQL with Python (two 2026
  // reports), hiring-manager rounds can carry no SQL (two reports), the loop
  // varies by team (a recruiter's word + a guide). Not stated, as low or
  // conflicting: a platform, a question count, a length, anything for analysts.
  apple: {
    name: 'Apple',
    role: 'Data Scientist',
    accessed: '23 Nov 2026',
    format: [
      ['Data scientist screen', 'Two 2026 candidate reports describe a technical screen that pairs SQL with a short Python task. In one (September 2026) it ran live with the hiring manager.', ['prachub-apple-ds-sep26', 'prachub-apple-ds-may26']],
      ['Rounds without SQL', 'Two candidates describe hiring-manager rounds that were product and metrics work with no SQL: A/B testing and channel attribution in one, churn, profit and lifetime value in the other.', ['aced-apple-ds-exp']],
      ['It varies by team', 'A recruiter told one data-scientist candidate that the roles share one job family and the team is assigned after the interviews; a data-analyst prep guide says its description reflects one team\'s structure. Expect the loop to differ from team to team.', ['prachub-apple-ds-oct25', 'aced-apple-da']],
      ['Not stated here', 'How many SQL questions the screen holds (the two reports disagree), how long it runs, the tool and the dialect, and anything about the data-analyst, BI or analytics-engineer loops: no source we could read states them reliably, so this page does not.', []],
    ],
    sources: {
      'prachub-apple-ds-sep26': ['PracHub — Apple Data Scientist: exploring employee and audit tables with the hiring manager (candidate report, interview Sep 2026)', 'https://prachub.com/interview-experiences/apple-data-scientist-interview-experience-exploring-employee-and-audit-tables-with-the-hiring-manager', '28 Sep 2026'],
      'prachub-apple-ds-may26': ['PracHub — Apple Data Scientist: telemetry design, a presentation, and an onsite that never happened (candidate report, interview May 2026)', 'https://prachub.com/interview-experiences/apple-data-scientist-interview-experience-telemetry-design-a-presentation-and-an-onsite-that-never-happened', '12 Nov 2026'],
      'aced-apple-ds-exp': ['Aced (formerly Exponent) — Apple Data Scientist interview experiences (two candidate reports, interviews Sep 2025 and Mar 2026)', 'https://www.aced.io/guides/apple-data-scientist-interview/experiences', 'submitted 3 Apr and 14 Jun 2026'],
      'prachub-apple-ds-oct25': ['PracHub — Apple Data Scientist: a quick HR call just to schedule the minicase (candidate report, interview Oct 2025)', 'https://prachub.com/interview-experiences/apple-data-scientist-interview-experience-a-quick-hr-call-just-to-schedule-the-minicase', '25 Aug 2026'],
      'aced-apple-da': ['Aced (formerly Exponent) — Apple Data Analyst interview guide (says it reflects one team)', 'https://www.aced.io/guides/apple-data-analyst-interview-guide', 'shown as "updated 4 days ago" on 23 Nov 2026'],
    },
  },
  // 2026-11-23: Shopify becomes a sourced page (R1 dossier
  // docs/reads/companies/shopify.md, sources read 2026-11-22/23). Shopify's own
  // posting names the stages, so the section opens with `publishes` instead of
  // "does not publish the format". Not stated, on the dossier's advice: the
  // screen's length, a platform, a dialect, a question count (all low or none).
  shopify: {
    name: 'Shopify',
    role: 'Data Scientist',
    accessed: '22 Nov 2026',
    publishes: 'Shopify publishes the stages of its data-science interview, not the format of its SQL round.',
    format: [
      ['Stages (Shopify\'s own words)', 'Shopify\'s data-science posting lists a Life Story conversation, then an online assessment followed by a craft assessment, then craft interviews. Depending on the role, a craft interview can include exploring a dataset using SQL, a deep dive on past projects, a design critique, or working a problem with the interviewer. The posting asks for a strong command of SQL.', ['shopify-ds-posting']],
      ['The SQL screen', 'Three data-scientist candidates in 2026 describe a live SQL technical screen. It is announced as SQL and Python: two ran as both, and one ran as SQL only although the candidate had been told to expect both.', ['prachub-shop-jan26', 'prachub-shop-jul26', 'aced-shop-l5']],
      ['Ask before you write', 'Two reports describe joins across several tables, and both stress pinning down what the question means before writing — in one, "over time" turned out to mean a running total, which the candidate learned late.', ['prachub-shop-jan26', 'aced-shop-l5']],
      ['Explaining the result', 'Three 2026 reports describe explaining results to a non-technical audience: presenting the SQL results to a product manager at the end of the screen, reading charts and an A/B test result aloud in a phone screen, and finding the cause of a spike in a time series in an onsite round.', ['prachub-shop-jan26', 'prachub-shop-oct26', 'prachub-shop-apr26']],
      ['Not stated here', 'How long the SQL screen runs, the tool it is written in and the SQL dialect: no source we could read states them reliably, so this page does not.', []],
    ],
    sources: {
      'shopify-ds-posting': ['Shopify careers — Staff Product Data Scientists posting (first-party; the posting carries no date)', 'https://www.shopify.com/careers/staff-product-data-scientists-multiple-roles_362ecbdc-924e-4b3b-92b1-d57c8eed4263', 'live on 22 Nov 2026'],
      'prachub-shop-jan26': ['PracHub — Shopify Data Scientist: a SQL-only screen on five tables (candidate report, interview Jan 2026)', 'https://prachub.com/interview-experiences/shopify-data-scientist-interview-experience-sql-only-screen-five-tables-and-a-passive-interviewer', '25 Aug 2026'],
      'prachub-shop-jul26': ['PracHub — Shopify Data Scientist: guided SQL and Python screening (candidate report, Jul 2026)', 'https://prachub.com/interview-experiences/shopify-data-scientist-interview-guided-sql-and-python-screening-fad4d661fa', '4 Sep 2026'],
      'aced-shop-l5': ['Aced (formerly Exponent) — Shopify Senior Data Scientist (L5) interview experience (candidate report, interview about Apr 2026)', 'https://www.aced.io/experiences/shopify-senior-data-scientist-interview-82404e', 'shown as "8 months ago" on 22 Nov 2026'],
      'prachub-shop-oct26': ['PracHub — Shopify Senior Data Scientist: online assessment, then a chart-reading phone screen (candidate report, interview Oct 2026)', 'https://prachub.com/interview-experiences/shopify-senior-data-scientist-interview-experience-online-assessment-then-a-chart-reading-phone-screen', '12 Nov 2026'],
      'prachub-shop-apr26': ['PracHub — Shopify Data Scientist onsite: a data-viz case, a marketplace case and the Life Story (candidate report, interview Apr 2026)', 'https://prachub.com/interview-experiences/shopify-data-scientist-interview-experience-data-viz-case-app-store-marketplace-case-and-life-story', '25 Aug 2026'],
    },
  },
};

// Every company with a dated source for its own process — the two registries
// above. The app reads this to say, in its company view, whether a set is
// matched to what candidates report or is general topic practice; the page
// generator's SOURCED_SLUGS adds the two signed archetypes to the same lists.
export const SOURCED_COMPANY_NAMES = new Set([
  ...Object.values(COMPANY_INTERVIEWS).map(c => c.name),
  ...Object.values(SOURCED_FORMATS).map(c => c.name),
]);
