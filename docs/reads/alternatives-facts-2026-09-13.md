# Competitor facts for the "DataLemur alternatives" / "StrataScratch alternatives" pages

Fetched 2026-09-13. Every fact below comes from a page loaded on that date; the
URL is given for each. Where something was not on a fetched page it says
**not stated**; where a page could not be loaded it says **not fetched**.
Nothing here is from memory or from search snippets.

## How the pages were fetched (read this before quoting)

- **Static HTML (curl) / WebFetch** worked for DataLemur, SQLPad, the Mode
  tutorial (now ThoughtSpot), SQLZoo, SQLBolt, pgexercises, Analyst Builder and
  the StrataScratch homepage.
- **Bot-blocked for curl and WebFetch** (403 or 429): LeetCode, the StrataScratch
  pricing page, Interview Query, DataInterview. These were loaded in a real
  browser (the Claude Browser pane) on the same date instead.
- **Geography.** The browser loads came from the founder's machine (DataInterview
  rendered class times in GMT+3). LeetCode states "Prices are marked in USD". The
  other vendors show `$` without naming a currency; Analyst Builder's embedded
  plan data says `currencyCode:"USD"`. If a vendor localises prices by country,
  a US visitor may see different numbers. Re-check from a US connection before
  publishing if that matters.
- Discounts that were live on the day are recorded as shown (StrataScratch "30%
  off", SQLPad and DataLemur strikethrough prices). They are promotions and will
  go stale; date them on the page.
- A few numbers are **counted by us from the page's own data** rather than stated
  by the vendor (marked "counted"). Do not present those as vendor claims.

---

## Summary table

| Tool | Free tier (as shown) | Paid price(s) as shown | Question count (vendor wording) | SQL dialects / engines | Company-tagged | Mock / timed | AI feedback / hints |
|---|---|---|---|---|---|---|---|
| **DataLemur** | Free questions exist (listing is public; "Free SQL Tutorial for Data Analytics", "Free 9-Day Data Interview Crash Course"). Free count **not stated**. Signup-to-run **not verified**. | $15 monthly; $60 yearly ("$5 per month", struck-through $180); $300 one-time "1:1 Coaching + Signed Book + Lifetime Access" | "100+ SQL Interview questions, from companies like Facebook, Google, and Amazon"; "70+ Data Science interview questions"; lifetime tier: "250+ interview questions" | PostgreSQL 14, MySQL (editor selector on a question page) | Yes — every listed question carries a company | Only in the $300 package: "do a mock FAANG technical interview" on a 1-hour call. No timed mode stated. | "multiple hints and full solutions"; "Gimme a Hint" button. No AI feature stated. |
| **StrataScratch** | "$0 … Access to limited features", "50 AI credits/mo"; Coding Questions free: "75+"; free SQL and Python learning paths "160+ questions each". "No credit card required". Signup-to-run **not verified**. | Monthly "$19/mo"; Yearly "$8.11/mo … Billed annually as $97.30 (30% off $139)"; Lifetime "$202.30 … One-time payment, no renewals (30% off $289)". 5-day money-back guarantee. | "1000+ coding questions (SQL, Python, R)"; "500+ ML, stats, system design questions"; "200+ companies represented" | Postgres, MySQL, MSSQL, Oracle (plus Pandas, Polars, PySpark, R) — filter on /coding | Yes — Company column on every question | "AI Mock Interviews" (Premium only); homepage: "timed sessions with detailed feedback on code and communication" | "AI chat assistant for hints and guidance"; "AI Guidance for problem-solving help" (Premium); "Hints, videos, and full solutions" |
| **LeetCode (Database / SQL 50)** | Database set: 323 problems, **105 free / 218 premium (counted)**. SQL 50 study plan: **all 50 free (counted)**. Running code requires an account: "You need to log in / sign up to run or submit". | Monthly "$35/mo" (struck-through $39); Yearly "$13.25/mo", "billed yearly ($159)", "previously sold for $299". "Prices are marked in USD". | SQL 50: "50 essential SQL questions", "Basic to intermediate SQL topics", "Best for 1 month of prep time". Database tab: "0/323 Solved". | MySQL, MS SQL Server, PostgreSQL, Oracle (+ Pandas) | Premium: "Company-Specific Interview Questions … Sort by role, time, or frequency" | Premium: "Interview Simulations … Choose a company, get a timed question" | "Ask Leet … your coding agent"; "Premium members get 500 extra monthly credits … plus up to 30 solution analysis per day" |
| **HackerRank (SQL domain)** | Homepage: "Create a free account". No price shown on the SQL practice pages. A challenge page shows "Please signup or login in order to view this challenge". | No candidate price shown on the pages fetched | Not stated on page; the track API returned **58 SQL challenges (counted)** | DB2, MySQL, Oracle, T-SQL (challenge API language list; "DB2" visible in editor) | Not stated | Homepage: "An AI Mock Interviewer can help you prepare" | Homepage: "Our AI Tutor helps developers learn as they go" (enterprise section) |
| **Interview Query** | "Take the data science challenge for free!" Free tier contents **not stated**. | **Not fetched** — the pricing page stayed on "Loading pricing options" in two loads. See notes. | Pricing page: "1000+ authentic questions"; homepage: "over 500+ real questions" and "500+ interview questions with solutions" (the two pages disagree) | Not stated ("Interview IDE … in-browser code editor") | Company guides: "over 6000+ top tech companies"; "check if we have questions for your company" | "Mock Interviews … with peers and mentors"; "AI Interviewer — Practice interviews with an AI interviewer and get instant feedback"; Coaching | AI Interviewer (above); "Adaptive Content" |
| **SQLPad** | Anonymous playground: "You can practice this sample without logging in." Question list: **47 of 230 without a lock icon for a logged-out visitor (counted)**. | SQL & R: $99/month monthly, $79/month on quarterly billing ("3 months SQL plan: $237"); Python: $129 / $99; AI: $199 / $149. Annual passes (one-time, 12 months): SQL & R $599 (struck $1188), Python $799 (struck $1549), AI $999 (struck $2399). | "230+ Interview-style coding questions"; "23+ Company-focused question sets" | "Practice engines: Postgres, MySQL, Python, R" | Yes — "By Company" menu, 23 companies | AI plan: "AI Mock Interview (4 sessions/month)"; AI Annual: "30 AI Mock Interview Tokens" | AI tools are resume/cover-letter and mock interview; no AI hints stated |
| **Mode SQL Tutorial** | mode.com/sql-tutorial now 301-redirects to thoughtspot.com/sql-tutorial. No price or signup gate shown; the tutorial pages do not use the word "free". | None shown | Lesson counts: "Basic SQL (15)", "Intermediate SQL (20)", "SQL Analytics Training (8)", "Advanced SQL (9)" | Not stated | No | No | No |
| **SQLZoo** | No price, paywall or signup gate shown (a "Log in" link exists; wiki). | None shown | 0–12 numbered tutorials; "Each assessment includes 15 questions graded easy, medium and hard." | In-browser engine not stated (reference pages cover MySQL, Oracle, SQL Server, DB2, Postgres, Ingres) | No | "Tutorial Quizzes … multiple choice" | No |
| **SQLBolt** | No price, login or signup link on the page | None shown | "SQL Lesson 1" … "SQL Lesson 18" plus "Lesson X" and two intermediate topics; "Each lesson … end[s] with an interactive exercise" | Not stated (teaches "the common SQL language standard") | No | No | No |
| **PostgreSQL Exercises** | No price, login or signup link on the page; "Site content licensed under CC BY-SA 3.0" | None shown | Not stated; categories Basic, Joins and Subqueries, Modifying data, Aggregates, Date, String, Recursive | PostgreSQL (About page: technologies used) | No | No | No |
| **Analyst Builder** | "Free … $0 forever … Get started, no card needed". Free plan data: "Access to Free Questions", "Practice Easy, Medium, and Hard Technical Questions", "Code in Python, MySQL, PostgreSQL, MSSQL, and R", "Full Explanation Videos for each Question". Free count not stated. | Monthly "$34 / mo"; Yearly "$20.75 / mo … billed annually", "Save $159" (plan data: 24900 USD cents per year = $249) | "200+ Practice questions built to mirror the real job"; "100+ technical questions"; "100+ general questions" | MySQL, PostgreSQL, MSSQL (+ Python, R) | Not stated | Not stated | Paid: "Integrated AI for Better & Faster Learning"; homepage: "Alyx AI — Get instant guidance whenever you're stuck" |
| **DataInterview** | No free tier on the pricing page | Monthly: Course $37, Course + AI $57, Career Pro $87, Live Membership $297, Live + Coaching $497. Annual: Course $20/mo "Billed $240/year"; Course + AI $30/mo "$360/year"; Career Pro $60/mo "$720/year"; Live $108/mo "$1,297/year"; Live + Coaching $208/mo "$2,497/year". | "4,000+ Interview Questions"; "700+ Coding Problems" | "A browser-based Python and SQL editor"; dialect not stated | Question list shows a Company column; Career Pro adds Google / OpenAI prep courses | Course + AI: "AI mock interviews (a behavioral interview round with an AI interviewer and rubric-scored feedback)"; Live + Coaching: "Mock interview or career strategy" | Course + AI: "AI tutor on every coding question … ask for hints, debug your code"; "Rubric-scored answer feedback" |

---

## Per-tool notes

### 1. DataLemur
Sources: https://datalemur.com/pricing, https://datalemur.com/,
https://datalemur.com/questions, https://datalemur.com/questions/sql-histogram-tweets,
https://datalemur.com/sql-tutorial — all fetched 2026-09-13.

- Pricing page, verbatim: Monthly "$15"; Yearly "$60" with "$5 per month",
  "$180" struck through, "BEST VALUE!"; "1:1 Coaching + Signed Book + Lifetime
  Access" "$300", described as "Lifetime access to DataLemur's 250+ interview
  questions + everything you'd get in the yearly subscription".
- The yearly and monthly tiers list "100+ SQL Interview questions, from companies
  like Facebook, Google, and Amazon, with multiple hints and full solutions!" and
  "70+ Data Science interview questions that span Statistics, Probability, and
  Machine Learning". Yearly adds the "Ace the Data Job Hunt" video course.
- The public questions listing returned 106 items to a logged-out request (54
  SQL, 39 Python, the rest statistics/ML/probability) — **counted**. The data does
  not show which are free, so no free count can be quoted.
- Question page tabs: "Question", "Solution", "Discussion", "Submissions"; button
  "Gimme a Hint"; editor dropdown "PostgreSQL 14" / "MySQL"; "Run Code" / "Submit".
- No AI feature and no timed mode on any fetched page.
- **Best for:** people who want company-attributed SQL interview questions with
  hints and written solutions from the author of *Ace the Data Science Interview*,
  at a low monthly price.
- **In its favour:** the lowest monthly price of the paid interview-practice tools
  here ($15); an author with a published interview book (the pricing page says
  the book "features 201+ Data Science Interview Questions" and DataLemur lets
  readers practise them); both PostgreSQL and MySQL in the editor; Python,
  statistics and ML questions as well as SQL; per-question discussion and
  submissions tabs; a free SQL tutorial.

### 2. StrataScratch
Sources: https://www.stratascratch.com/ (curl, 2026-09-13);
https://platform.stratascratch.com/pricing and https://platform.stratascratch.com/coding
(browser, 2026-09-13; www.stratascratch.com/pricing 301s to the platform URL and
returned 429 to curl and WebFetch).

- Banner on the day: "30% off Yearly and Lifetime plans — applied automatically at
  checkout, no code needed."
- Plans verbatim: Free "$0", "Access to limited features", "50 AI credits/mo".
  Monthly "$19/mo", "Billed monthly, cancel anytime", "1,000 AI credits/mo".
  Yearly "$8.11/mo", "Billed annually as $97.30 (30% off $139)". Lifetime
  "$202.30", "One-time payment, no renewals (30% off $289)", "25,000 credits —
  never expire". "All paid plans include a 5-day money-back guarantee."
- "Every paid plan includes full access to questions, solutions, projects, hints,
  and grading. Only billing and AI credits differ."
- Free vs Premium table: Coding Questions "75+" vs "1000+"; Solutions, Hints &
  Walkthroughs "75+" vs ✓; User Solutions "75+" vs ✓; AI Mock Interviews "—" vs ✓;
  AI Guidance "—" vs ✓; Learning Paths (SQL & Python) ✓ on both.
- FAQ: "AI Mock Interviews are interactive coding sessions with an AI interviewer
  that asks questions, reviews your solution, and gives feedback." Top-up credits
  "$5 per 1,000 credits".
- /coding page: "1,000+ real questions across SQL, Python, statistics, ML and
  more"; Analytical "671 questions", Algorithm "70", Visualization "100", Concept
  "463"; language options Postgres, MySQL, MSSQL, Oracle, Pandas, Polars, PySpark,
  R; each row shows a company (e.g. Meta, Amazon, Google) and a "PRO" marker on
  premium rows.
- Homepage: "750,000+ members"; "Start Coding Free", "No credit card required".
- **Best for:** candidates for data science, ML and AI engineering roles who want
  SQL and Python practice alongside concept questions, take-home projects and AI
  mock interviews.
- **In its favour:** the largest coding bank of the SQL-first tools here
  ("1000+ coding questions"); the widest SQL dialect choice (Postgres, MySQL,
  MSSQL, Oracle) plus Pandas, Polars, PySpark and R; company tags; user solutions
  and discussion boards; a lifetime option; a 5-day refund; free SQL and Python
  learning paths; take-home projects in cloud notebooks.

### 3. LeetCode — Database problem set, SQL 50, Premium
Sources (browser, 2026-09-13; curl and WebFetch returned 403):
https://leetcode.com/subscribe/, https://leetcode.com/studyplan/top-sql-50/,
https://leetcode.com/problemset/database/, https://leetcode.com/problems/combine-two-tables/

- Premium verbatim: Monthly "billed monthly", "$39" struck, "$35 /mo". Yearly
  "billed yearly ($159)", "Our most popular plan previously sold for $299 and is
  now only $13.25/month", "$24.91" struck, "$13.25 /mo". "Prices are marked in USD".
- Premium features listed: "Ask Leet", "Company-Specific Interview Questions",
  "Lightning Judge", "Access to Premium Content", "Autocomplete", "Debugger",
  "Interview Simulations … Choose a company, get a timed question", "Cloud
  Storage", "Unlimited Playgrounds".
- SQL 50: "Crack SQL Interview in 50 Qs", "Basic to intermediate SQL topics",
  "50 essential SQL questions", "Best for 1 month of prep time". Related plan:
  "Advanced SQL 50 — 50 Advanced SQL Problems" (its premium status not checked).
- **Counted** via LeetCode's own question-list data, loaded from the Database
  page: 323 Database problems, 105 free and 218 premium; SQL 50 has 0 premium
  questions of 50.
- Dialects on a problem page: MySQL, MS SQL Server, PostgreSQL, Oracle, Pandas.
- Logged-out problem page: "You need to log in / sign up to run or submit".
- **Best for:** people already using LeetCode for coding interviews who want a
  free, structured 50-question SQL plan in the same place.
- **In its favour:** SQL 50 is entirely free; more than 100 free database
  problems; four SQL dialects plus Pandas; a very large community (the SQL 50
  page shows a weekly ranking); company tags and timed simulations with Premium.

### 4. HackerRank — SQL domain
Sources: https://www.hackerrank.com/ (curl), https://www.hackerrank.com/domains/sql
and https://www.hackerrank.com/challenges/revising-the-select-query/problem (browser),
2026-09-13.

- SQL page: subdomains "Basic Select", "Advanced Select", "Aggregation", "Basic
  Join", "Advanced Join", "Alternative Queries"; skills "SQL (Basic)", "SQL
  (Intermediate)", "SQL (Advanced)"; rows show "Max Score" and "Success Rate".
- No price anywhere on the practice pages. Homepage: "Create a free account";
  "Over 26 million developers have joined the HackerRank community to certify
  their skills, practice interviewing, and discover relevant jobs. An AI Mock
  Interviewer can help you prepare".
- **Counted** from HackerRank's track API: 58 SQL challenges. Languages for a SQL
  challenge: db2, mysql, oracle, tsql.
- A logged-out challenge page shows "Please signup or login in order to view this
  challenge".
- A cookie banner was left untouched.
- **Best for:** learners who want free, short graded SQL exercises and HackerRank's
  skill certificates (a "Certify" section sits in the site nav).
- **In its favour:** free to practise; four engines including Oracle and DB2;
  certification; the same platform many employers use for screening.

### 5. Interview Query
Sources (browser, 2026-09-13; curl and WebFetch returned 429):
https://www.interviewquery.com/pricing, https://www.interviewquery.com/

- **Price: not fetched.** The pricing page showed only "Loading pricing options"
  in two loads (the browser logged certificate errors on some third-party
  resources). Its pricing API did respond, and it returned both "control" and
  "experiment" price variants, so prices look A/B-tested. No price should be
  quoted until a page shows one.
- Pricing page copy: "Prepare with 1000+ authentic questions posed by recruiters";
  "6000+ guides detailing what to expect from the hiring processes"; "9 distinct
  learning paths and 350+ lessons"; "Tackle 50+ real take-home challenges";
  "Mock Interviews … with peers and mentors from our community"; Coaching.
- Homepage copy: "over 500+ real questions from the biggest data companies";
  "Access 500+ interview questions with solutions"; "Interview IDE … in-browser
  code editor"; "AI Interviewer — Practice interviews with an AI interviewer and
  get instant feedback"; "Take the data science challenge for free!"
- The two pages disagree (1000+ vs 500+). Quote neither without saying which page.
- **Best for:** data science candidates who want SQL questions next to product
  sense, statistics, ML and take-home prep, plus company interview guides.
- **In its favour:** broad data-science coverage beyond SQL; company guides;
  take-homes; human coaching and peer mock interviews.

### 6. SQLPad (sqlpad.io)
Sources: https://sqlpad.io/pricing/, https://sqlpad.io/, https://sqlpad.io/questions/
(curl, 2026-09-13).

- Pricing page, quarterly toggle selected by default ("Quarterly billing selected.
  Better value while you prepare."): SQL & R "$99" struck, "$79 /month"; Python
  "$129" struck, "$99 /month"; AI "$199" struck, "$149 /month". The ROI widget
  lists "3 months SQL plan: $237", "3 months Python plan: $297", "3 months AI plan:
  $447". "SQLPad starts at only $79/mo". Reading the page, $99 / $129 / $199 are
  the monthly-billing prices.
- Annual Pass: "One Payment, One Year of Access", "No recurring charges". SQL & R
  Annual "$1188" struck, "$599"; Python Annual "$1549" struck, "$799"; AI Annual
  "$2399" struck, "$999", "30 AI Mock Interview Tokens".
- SQL & R plan: "All SQL and R coding questions with solutions", "Practice in
  Postgres, MySQL, and R". AI plan: "AI Mock Interview (4 sessions/month)".
- Homepage: "230+ Interview-style coding questions", "23+ Company-focused question
  sets", "4 Practice engines: Postgres, MySQL, Python, R"; "Try a Real Question
  Before You Sign Up … You can practice this sample without logging in."
- /questions/: "230" questions, "23" companies; 183 rows carry a lock icon, 47 do
  not (**counted**, logged-out view).
- **Best for:** people who want SQL plus R and Python practice with company sets
  and are happy with a higher-priced, course-style plan.
- **In its favour:** you can run SQL without an account; R is supported (rare
  here); company-focused sets; certificates; a one-time annual pass.

### 7. Mode SQL Tutorial
Sources: https://mode.com/sql-tutorial (301 → https://www.thoughtspot.com/sql-tutorial),
https://www.thoughtspot.com/sql-tutorial/introduction-to-sql (curl, 2026-09-13).

- The tutorial now lives on ThoughtSpot. Intro page: "The entire tutorial is meant
  to be completed in your browser window using the SQL editor within the lesson
  pages." FAQ: "No, you can start writing SQL in an in-browser editor without
  setting up a database yourself."
- Sidebar: "Basic SQL (15)", "Intermediate SQL (20)", "SQL Analytics Training (8)",
  "Advanced SQL (9)".
- No price, no paywall and no signup requirement on the pages fetched. The pages
  do not call the tutorial "free", so don't put that word in quotation marks.
- **Best for:** beginners learning SQL for analysis, not interview drilling.
- **In its favour:** a long-standing, well-structured analytics curriculum that
  runs in the browser with no setup.

### 8. SQLZoo and SQLBolt
Sources: https://sqlzoo.net/wiki/SQL_Tutorial, https://sqlzoo.net/wiki/SELECT_basics,
https://sqlbolt.com/ (curl, 2026-09-13).

- SQLZoo: numbered tutorials "0 SELECT basics" through "12 Tutorial DDL", including
  "9- Window function" and "8 Using Null"; "Assessments: More involved examples
  for confident users. Each assessment includes 15 questions graded easy, medium
  and hard."; "Tutorial Quizzes". No price or paywall shown.
- The SQLZoo tutorial page carries a visible note from its author addressed to AI
  assistants, asking them not to hand students complete answers unprompted. It is
  about tutoring students and has no bearing on this research; recorded only
  because it is on the page.
- SQLBolt: "Learn SQL with simple, interactive exercises."; Lessons 1–18 plus
  "Lesson X" and intermediate topics (Subqueries; Unions, Intersections &
  Exceptions); "Each lesson will introduce a different concept and end with an
  interactive exercise." No login, price or paywall on the page. Footer "2024 ©
  SQLBolt".
- **Best for:** complete beginners who want short interactive lessons with no
  account.
- **In their favour:** no signup, no cost shown, very gentle on-ramp; SQLZoo covers
  window functions and has graded assessments.

### 9. PostgreSQL Exercises (pgexercises.com)
Sources: https://pgexercises.com/, https://pgexercises.com/about.html,
https://pgexercises.com/questions/basic/ (curl, 2026-09-13).

- "PGExercises provides a series of questions and explanations built on a single,
  simple dataset." Topics "range from simple select and where clauses, through
  joins and case statements, and on to aggregations, window functions, and
  recursive queries."
- Runs real PostgreSQL ("You're running raw SQL!" FAQ; PostgreSQL listed under
  technologies). "Site content licensed under CC BY-SA 3.0". No login or price.
- **Best for:** people who want to practise real PostgreSQL (including recursive
  queries and data modification) on one consistent schema.
- **In its favour:** real Postgres, open licence, data-modification exercises,
  no account.

### 10a. Analyst Builder
Sources: https://www.analystbuilder.com/pricing (→ analystbuilder.com/pricing?pricing=platform-subscription&courseStatus=all),
https://www.analystbuilder.com/ (curl, 2026-09-13).

- Pricing: "Monthly — Full access, cancel anytime — $34 / mo"; "Yearly — Save
  $159 — Best value, billed annually — $20.75 / mo"; "Free — Get started, no card
  needed — $0 forever". The page's plan data gives Yearly as 24900 with
  `currencyCode:"USD"` and `billingPeriod:"year"` ($249/year).
- Free plan benefits (plan data): "Access to Free Questions", "Practice Easy,
  Medium, and Hard Technical Questions", "Code in Python, MySQL, PostgreSQL, MSSQL,
  and R", "Full Explanation Videos for each Question".
- Paid: "Access to Free and Premium Technical Questions (Easy to Very Hard)",
  "Access to all Courses on SQL, Excel, Pandas, Python, Tableau, Power BI, the
  Cloud, and More!", "Integrated AI for Better & Faster Learning"; yearly adds
  "AI Resume Analyzer for Life".
- Homepage: "200,000+ happy learners"; "200+ Practice questions built to mirror the
  real job"; "100+ technical questions with real datasets, real-world coding
  challenges, and a built-in code editor"; "100+ general questions that help you
  prepare for data analysts interviews"; "Alyx AI"; a Discord community.
- **Best for:** aspiring data analysts who want courses (SQL, Excel, Tableau,
  Power BI, Python) and practice questions on one subscription.
- **In its favour:** a permanent free plan; video explanations for each question;
  three SQL dialects; full courses and certificates.

### 10b. DataInterview
Source: https://www.datainterview.com/pricing (browser, 2026-09-13; curl and WebFetch
returned 429). Homepage not separately fetched.

- Tiers and prices as listed in the table (monthly view, then the Annual toggle).
  "Save up to 64%". FAQ: "Annual plans are charged upfront".
- Course tier: "20+ expert-led courses — Data, ML/AI & Quant", "Unlimited coding
  practice", "4,000+ interview questions", "Detailed solutions in text & video",
  "Lifetime Slack community access".
- FAQ: "A browser-based Python and SQL editor with 700+ coding problems."
  "Course + AI … an AI tutor on every coding question, interview question, and
  course lesson — ask for hints, debug your code … AI mock interviews (a
  behavioral interview round with an AI interviewer and rubric-scored feedback at
  the end)."
- No free tier on the pricing page. The bottom CTA reads "Get started — $20/mo,
  Billed yearly".
- **Best for:** data science and ML candidates who want courses, a large mixed
  question bank and optional live classes or coaching.
- **In its favour:** a very large mixed question bank ("4,000+"); live
  instructor-led classes and 1:1 coaching tiers; a Slack community.

---

## What a fair comparison should concede

- **Bank size.** StrataScratch ("1000+ coding questions"), LeetCode (323 Database
  problems), DataInterview ("4,000+ interview questions", mixed topics) and SQLPad
  ("230+") all state more questions than a small bank. Say so plainly.
- **Dialects.** StrataScratch (Postgres, MySQL, MSSQL, Oracle), LeetCode (MySQL, MS
  SQL Server, PostgreSQL, Oracle) and HackerRank (MySQL, Oracle, T-SQL, DB2) all
  offer more engines than a single-dialect tool. DataLemur offers PostgreSQL 14
  and MySQL.
- **Beyond SQL.** StrataScratch, DataLemur, Interview Query, DataInterview, SQLPad
  and Analyst Builder all cover Python (and some R, ML, statistics). A reader who
  needs Python interview prep is better served there.
- **Community.** LeetCode (discussion, weekly ranking), StrataScratch ("user
  solutions and community discussion boards"), DataLemur ("Discussion" and
  "Submissions" tabs), Analyst Builder (Discord), DataInterview (Slack).
- **Price.** DataLemur ($15/mo) and StrataScratch ($19/mo; $97.30/yr on the day's
  promotion) are cheap. LeetCode's SQL 50 and HackerRank's SQL track cost nothing.
  SQLZoo, SQLBolt, pgexercises and the Mode/ThoughtSpot tutorial show no price.
- **Provenance.** DataLemur and StrataScratch tag every question with a company.
  Neither page explains how the attribution was verified, so a comparison page
  should not call anyone's tags "verified". That applies to SQL Quest's too.
- **Money-back / lifetime.** StrataScratch has a lifetime plan and a 5-day refund.
  DataLemur has a one-time $300 lifetime-plus-coaching package.

## Not fetched / not verified

- Interview Query prices (page never rendered them; the API shows A/B variants).
- Whether DataLemur and StrataScratch let a logged-out visitor run a query (not
  tested; the browser session was stopped before that check).
- DataLemur's free-question count and StrataScratch's exact free SQL count (the
  vendor states "75+" free coding questions across all languages, not SQL alone).
- DataInterview homepage; Interview Query SQL dialect; the premium status of
  LeetCode's "Advanced SQL 50".
