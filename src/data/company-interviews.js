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

  tiktok: {
    name: 'TikTok',
    sector: 'consumer',
    crosslinkDesc: 'Engagement, day-2 activation, top video per user per day',
    accent: '#25F4EE',
    title: 'TikTok SQL Interview Questions — Engagement, Activation & Window Functions',
    description: 'TikTok SQL interview questions: the data science and analyst screens as candidates report them (live, on HackerRank), the SQL they test (joins, window functions, day-2 activation), and practice on engagement-shaped data.',
    hero: 'Two sources three years apart agree on a live SQL screen on HackerRank — joins and window functions, activation and engagement questions, ties broken the way the prompt says.',
    dataShape: 'videos (uploads, likes, dates), user interactions, sign-up and confirmation events, and creator cohorts',
    format: [
      ['Roles', 'Data Scientist, Data Analyst and Data Engineer.', ['datalemur-tt']],
      ['Data science stages', 'Recruiter screen, a hiring-manager screen, a technical loop of three or four rounds of about 45 minutes each plus behavioural rounds, then a final manager conversation; all virtual.', ['exponent-tt']],
      ['Technical screen', 'A 45–60 minute screen on HackerRank covering SQL alongside statistics and probability.', ['datalemur-tt']],
      ['Data analyst screen', 'A 2022 candidate report describes a 30-minute live HackerRank screen: standard joins and window functions plus a short case.', ['blind-tt']],
    ],
    reportedTopics: ['Joins across users, videos and events', 'Window functions (top video per user per day)', 'Aggregation with filtering', 'Date logic (confirmed on day 2, per-day grouping)', 'Ranking and top-N', 'Rates (activation, engagement)', 'Tie-breaking rules'],
    difficulty: 'Reported as medium, with some reports of medium-to-hard.',
    shapes: [
      ['Sign-ups and text confirmations: users who did not confirm on day 1 but did on day 2.', 'datalemur-q-tt'],
      ['The same two tables: the overall activation rate — the share of sign-ups ever confirmed.', 'datalemur-tt'],
      ['Videos with uploads and likes: each user\'s most-liked video per day, the earliest upload winning ties.', 'datalemur-tt'],
    ],
    sources: {
      'exponent-tt': ['Exponent — TikTok Data Scientist interview guide', 'https://www.tryexponent.com/guides/tiktok-data-scientist-interview', 'updated mid-2026'],
      'datalemur-tt': ['DataLemur — TikTok SQL interview questions and data science guide', 'https://datalemur.com/blog/tiktok-sql-interview-questions', '5 Jan 2025'],
      'datalemur-q-tt': ['DataLemur — second-day confirmation question', 'https://datalemur.com/questions/second-day-confirmation', 'undated'],
      'blind-tt': ['Blind — TikTok data analyst screen report', null, '6 Feb 2022'],
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

  bloomberg: {
    name: 'Bloomberg',
    sector: 'fintech',
    crosslinkDesc: 'Time-bucketed aggregation, prices and trades, ranking',
    accent: '#F6A100',
    title: 'Bloomberg SQL Interview Questions — Prices, Trades & Time Buckets',
    description: 'Bloomberg SQL interview questions: what candidates report about the data analyst process (including a data exercise on a messy dataset), what is not reliably reported, and practice on time-bucketed financial SQL.',
    hero: 'Bloomberg\'s data-role SQL format is thinly reported, and this page says so. What is reported: a final round with a data exercise on a messy financial dataset, and SQL shaped around prices, trades and sessions by time period.',
    dataShape: 'daily prices, trades and volume, terminal sessions, exchange data subscriptions, and financial filings',
    format: [
      ['Data analyst stages', 'An application, an online assessment (logic, English, Excel), a recruiter call, then a final round of three or four interviews that includes a 30–60 minute data exercise on a messy corporate-filings dataset.', ['ophyai-bb']],
      ['SQL screen for data roles', 'Not reliably reported. The assessment platform reported for Bloomberg is for software-engineering phone screens, not data roles, so this page names none.', []],
      ['What the analyst round weighs', 'Reported as basic SQL and Excel alongside data-quality judgement — finding errors and proposing checks.', ['ophyai-bb']],
    ],
    reportedTopics: ['Aggregation by time period (monthly and daily averages)', 'Joins, INNER vs LEFT', 'Window functions and ranking', 'Date-window filters', 'NULL handling', 'Second-highest value'],
    difficulty: 'Easy-to-medium.',
    shapes: [
      ['Daily stock prices by ticker: for each ticker, the month with the highest and the month with the lowest opening price.', 'datalemur-q-bb'],
      ['Trades by symbol and date: the average daily trading volume per symbol.', 'datalemur-bb'],
      ['Customers and exchange data subscriptions with start dates and status: US customers with an active subscription started in the last 30 days.', 'datalemur-bb'],
    ],
    sources: {
      'ophyai-bb': ['OphyAI — Bloomberg interview guide', 'https://ophyai.com/blog/company-guides/bloomberg-interview-guide', 'updated 3 Jun 2026'],
      'datalemur-bb': ['DataLemur — Bloomberg SQL interview questions', 'https://datalemur.com/blog/bloomberg-sql-interview-questions', '17 Apr 2025'],
      'datalemur-q-bb': ['DataLemur — stock min/max question (Bloomberg-tagged)', 'https://datalemur.com/questions/sql-bloomberg-stock-min-max-1', 'undated'],
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
};
