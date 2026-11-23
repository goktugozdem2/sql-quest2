# Competitor and market watch — 2026-11-22 (B6, run 1)

Agent B6, cloud session. Broad first run: nine competitors, thirteen money
queries, user sentiment, and a routing table. Docs only. No page changes here;
pages are C2's and C5's job through their own PRs.

## How this was read (read before quoting anything)

- **Direct fetch is blocked in the cloud session.** `curl` and WebFetch fail
  DNS for every competitor host (same as `competitor-facts-2026-11-22.md`).
  Pages were read through the **Apify web-fetch connector** (public pages,
  no login), by B6 and two reader agents, all on 2026-11-22. Each row names
  the URL. "Partial" means the static render left parts out.
- **SERP notes come from the session's WebSearch tool, not Google.** It is a
  US-only engine of its own; treat order as indicative, never as a Google
  rank. Our GSC/Bing positions stay the laptop's read.
- **Review and Reddit/Blind/HN signal comes from search-result titles and
  summaries only.** No usernames, no quotes. Third-party "reviews" written by
  a competitor (PracHub, Dataford, DataLemur, StrataScratch blogs) are marked
  as such and carry no weight.
- **Usable on pages** follows the CLAUDE.md rule: only a fact read on the
  vendor's own page today, with its URL. A row marked *partial* or
  *self-contradicting* is not usable on a page as a number.

---

## 1. What each competitor offers today

| Competitor | Bank (vendor wording, URL) | Company pages | AI | Mocks / timed | Dialects · Python | Solutions | Price (vendor page) | New in last 60 days |
|---|---|---|---|---|---|---|---|---|
| **DataLemur** | Questions list shows SQL, Python, Stats, ML, Probability, every row company-tagged. Tag counts on the page: Window Functions 38, CTE/Subquery 40, Joins 12, Null Handling 7 ([/questions](https://datalemur.com/questions), 200) | Fintech rows on the list: Stripe (Repeated Payments, Hard), PayPal (Final Account Balance), JPMorgan (2), Robinhood, Visa (stats), Capital One (**Python only**, "Base 13 Conversion"). Blog guides rank for Capital One, Stripe, PayPal, Amazon, Meta, Google (SERP §2) | Not seen on the list page | Not seen | Not re-read (09-13: PostgreSQL 14, MySQL) · Python yes | Not re-read | $15/mo · $60/yr · $300 one-time (`monetization-competitors-2026-11-22.md`, same day) | Nothing dated on the list page |
| **StrataScratch** | "1000+ real coding and concept questions"; "750,000+ members" ([home](https://www.stratascratch.com/), 200). Coding tab: Analytical 759, Algorithm 120 (New), ML Coding 52 (New), Stats 50, Visualization 100, Concept 590; "Debug-AI-Code" mode, 63 questions ([/coding](https://platform.stratascratch.com/coding), 200) | Company and role "loops", "+ 60 more". First coding page shows no Capital One, Revolut, Wise, Stripe, PayPal, Chime or Monzo; total count not stated | **AI Interviewer** (timed, scored mocks), AI Evaluator, **StrataAI tutor** | Yes, AI Interviewer | Default filter Postgres; others not in the static render · pandas yes | Many rows marked PRO | $24/mo · $139/yr · $289 lifetime, 5-day refund (same-day read) | **"Meet StrataAI: Your Built-In Coding Tutor", blog dated 2026-10-27**; "New AI Engineering Prep"; Algorithm and ML Coding marked New |
| **LeetCode (Database)** | SQL 50: "Crack SQL Interview in 50 Qs", "50 essential SQL questions", "Basic to intermediate", "Best for 1 month of prep time" ([/studyplan/top-sql-50](https://leetcode.com/studyplan/top-sql-50/), 200) | "Company-Specific Interview Questions … Sort by role, time, or frequency" (Premium) | "Ask Leet" coding agent, marked New, undated; Premium "500 extra monthly credits", "up to 30 solution analysis per day" | "Interview Simulations … Choose a company, get a timed question" | Not stated on these pages | "Some of these solutions are only available to premium subscribers" | **Partial:** struck-through $39/mo and $299/yr; current price rendered as "-/mo" ([/subscribe](https://leetcode.com/subscribe/), 200). Meta: "Black Friday Sale … $30 off on Annual Subscription with code THANKS2026". **Still not usable on pages** | Black Friday promo; Ask Leet (undated) |
| **Interview Query** | Self-contradicting: "1000+ authentic questions" ([/pricing](https://www.interviewquery.com/pricing)) vs "over 500+ real questions" ([home](https://www.interviewquery.com/)); "6000+ guides" | "Company Guides … over 6000+ top tech companies". Capital One hub links 17 role guides, published 2026-03-17 ([/interview-guides/capital-one](https://www.interviewquery.com/interview-guides/capital-one), 200). Revolut, Stripe, PayPal, Chime DA guides rank (SERP) | AI interviews: 3/mo (Coder), 10/mo (Premium) | Peer mocks; AI interviewer | Not stated · pandas yes | "Answer explanations + walkthroughs" on Premium | **Partial / self-contradicting:** Coder $10/mo billed yearly; Premium $17/mo billed yearly "Save 78%"; same page also "Get Premium, $199/yr … or $79/mo". Monthly and lifetime toggles did not render; trial answer did not render ([/pricing](https://www.interviewquery.com/pricing), 200 on retry) | Nothing dated |
| **HackerRank (SQL)** | Count not rendered (cookie wall). Subdomains: Basic Select, Advanced Select, Aggregation, Basic Join, Advanced Join, Alternative Queries ([/domains/sql](https://www.hackerrank.com/domains/sql), 200, partial) | Not stated | Homepage is hiring-side: "Chakra", "AI-led Screen … agentic interviewer" ([home](https://www.hackerrank.com/), 200) | Candidate mocks not stated | Not stated | Not stated | No candidate price shown | Hiring-side AI interviewer. Note: it is the **test platform** candidates report for Revolut, Wise and Stripe screens (§2), not a prep competitor for them |
| **PracHub** | "18,000+ candidate-reported interview questions from 800+ companies"; body "Browse all 982 companies" ([home](https://prachub.com/), 200) | Candidate-report pages rank for Revolut (×2), Chime (×4), Stripe, PayPal (SERP) | "AI Mentor, 50 Sessions a Day"; "Practice in Claude Code & Codex" | Not stated | Not stated | "Most questions are free to browse and practice"; Premium unlocks full walkthroughs and model solutions | $27.99/mo (struck $34.99) · $119.99/yr ("$10.00/mo") · **$399 lifetime** (home pricing block; [/pricing](https://prachub.com/pricing) rendered "Loading…") | Reports labelled "Nov '26"; "New interview reports are added every week". Publishes many "X vs Y" and "X alternatives" pages (SERP §3) |
| **Aced (formerly Exponent)** | tryexponent.com now redirects to **aced.io**. "3,000+ verified interview questions"; SQL course "98 lessons", "9 modules", "Updated Nov 2026", practice 14 Easy / 31 Medium / 14 Hard ([/courses/sql-interviews](https://www.tryexponent.com/courses/sql-interviews) → aced.io, 200) | Company guides exist; count not stated; no fintech named | **"New: AI feedback on your interviews"**; AI interviewer graded on rubrics; AI coach "Ace" ([aced.io](https://www.aced.io/), 200) | AI mocks (Expert AI), 5 peer mocks/mo free | Not stated | "Expert solutions"; many lessons Free, rest members-only | Basic $0 · Pro **$12/mo** (struck $79) · Expert AI **$20/mo** (struck $99); 5-day refund; billing period of the shown price not clear in the static render ([/upgrade](https://www.aced.io/upgrade), 200). Old /pricing is 404 | **Rebrand to Aced**; AI interview feedback; SQL course updated Nov 2026 |
| **Dataford** | "51,000+ real interview questions", "86,000+ interview guides", "15,000+ companies", "80+ tech roles" ([home](https://dataford.io/), 200) | Capital One DA guide "Updated Sep 13, 2026": four rounds, OA described as "CodeSignal … 70- to 80-minute", "14 multiple-choice data interpretation questions and a complex SQL query", "Weighting based on 14 reported loops" ([/interview-guides/capital-one/data-analyst](https://dataford.io/interview-guides/capital-one/data-analyst), 200). Also Wells Fargo, Discover, U.S. Bank, JPMorganChase; Chime DA/BI guides rank | "AI Mock Interviews", timed and AI-graded; SQL Playground | Yes | Not stated · pandas yes | Full plan and model answers behind sign-up; "Step-by-step solutions for every question" (paid) | $29/mo (struck $39) · **$99/yr ($8.25/mo)**, a variant $89/yr; Lifetime tagged New (price not rendered); 48-hour refund; a pricing cookie names an India discount ([home](https://dataford.io/), [/pricing](https://dataford.io/pricing), 200) | 1:1 coaching (New); interview experiences (New); Lifetime (New) |
| **letsdatascience** | "1,634 SQL and Python problems"; "15 industry datasets, from banking to healthcare" ([home](https://letsdatascience.com/), 200) | Company pages rank for Capital One, Stripe, PayPal, Google (SERP). Capital One: 10 problems (5 SQL, 5 pandas), card and loan themed, all Pro ([/problems/companies/capitalone](https://letsdatascience.com/problems/companies/capitalone), 200) | **"LDS Mentor"** with a Socratic Learn Mode and an Interview Mode; step-by-step execution visualizer; runs in the browser | Interview Mode | Not stated · pandas yes | Free: 250 problems (126 SQL); Pro: "Full datasets, grading, solutions" | Free · Pro **$14.99/mo · $119.99/yr** ([/pricing](https://letsdatascience.com/pricing), 200) | Nothing dated |

### What the table says, in one paragraph

Every serious competitor now ships an **AI tutor or AI interviewer**
(StrataAI 10-27, Aced AI feedback, LDS Socratic mentor, Dataford and Interview
Query AI mocks, LeetCode Ask Leet). Our "AI coach" is no longer a category of
one. **Prices cluster at $10–$15 a month on annual billing**, most with a
struck-through anchor and "Save 70–79%"; Dataford's annual is **$99, the same
as ours**. Three sell lifetime (StrataScratch $289, PracHub $399, Dataford
new). **Fintech company coverage is thin and aggregator-shaped**: DataLemur
has blog lists, letsdatascience has paid 10–16-problem company sets, Interview
Query and Dataford have generated guides, PracHub has candidate reports. Nobody
in the set has a timed, company-shaped SQL mock for Capital One, Revolut or
Wise.

---

## 2. SERP notes (WebSearch, US, 2026-11-22)

`sqlquest.app` appeared in **none** of the 13 result lists below. One
`sql-quest2.vercel.app` URL appeared for a comparison query (§3); see item 3
of the routing table.

| Query | Who shows, by page type | Notes |
|---|---|---|
| sql interview questions | Listicles: DataCamp, Indeed (IN, IE), Coursera (GB, CA), Adaface, Toptal, Built In, Simplilearn, Monster, Educative, freeCodeCamp, CodeSignal blog, Dataquest, databasestar, roadmap.sh, hackr.io | No practice platform in the list. Pure editorial SERP |
| sql practice questions | LearnSQL blog, PDFs and Scribd uploads, LinkedIn Learning, W3Schools exercises, GitHub notes, a 135-question free course site, CodeSignal, **Exponent SQL Foundations lesson** | Low-authority PDFs rank: the query is weakly served |
| sql interview questions for data analyst | Coursera, Indeed (CA, IN), LearnSQL, **Exponent blog**, WashU/Rochester careers blogs, Built In, Dataquest, DataCamp, **DataLemur blog**, **Interview Query /p/ page**, Interview Kickstart | Practice platforms rank with blog posts, not app pages |
| Capital One sql interview questions | **DataLemur blog (#1)**, Glassdoor ×12, **letsdatascience company page**, dev.to, Exponent blog, 1point3acres, **Interview Query guide** | Follow-up "Capital One codesignal data analyst assessment": IQ DA guide, Blind ×5, Glassdoor, 1point3acres, linkjob.ai, **Dataford DA guide** |
| Revolut sql interview questions | Glassdoor ×7, **Interview Query DA/DE guides ×6**, **PracHub candidate reports ×2**, AmbitionBox | No DataLemur, no StrataScratch. Same vacuum the 09-13 read found |
| Wise sql interview questions data analyst | Glassdoor ×8, DataLemur **WiseTech** (name collision), Exponent blog, Indeed, Coursera, IQ "Wise Skulls" (collision), Dataquest | **No page about Wise's SQL screen ranks at all.** Candidates report HackerRank SQL, 3–4 questions, ~60 minutes (snippets, not fetched) |
| Stripe sql interview questions | **DataLemur blog**, Glassdoor, **letsdatascience**, IQ ×4, Blind ×4, dev.to, mockquestions, **PracHub category** | Crowded |
| PayPal sql interview questions | **DataLemur blog**, **letsdatascience**, IQ ×2, Glassdoor, **StrataScratch blog**, **PracHub**, spam mirrors | Crowded |
| Chime sql interview questions | dev.to, Glassdoor ×3, Exponent/Aced experience, 1point3acres ×3, **PracHub ×4**, IQ ×3, **Dataford DA/BI** | No DataLemur/StrataScratch (C1 confirmed 404s today) |
| Monzo sql interview questions | **Prepfully ×5**, Glassdoor ×6, interviewpal, **Monzo's own blog ×2**, Exponent | No practice platform. First-party sources exist |
| Amazon sql interview questions | Internshala, VisualCV, IQ ×2, LearnSQL, DataLemur, StrataScratch, Interview Kickstart, Glassdoor, LeetCode discuss, Medium, Scribd | Crowded; low priority for us |
| Meta sql interview questions | LearnSQL, IQ, Medium (bigtechinterviews), DataLemur, Glassdoor ×4, Exponent, 1point3acres, dev.to | Crowded |
| Google sql interview questions | DataLemur ×3, IQ ×3, StrataScratch, Interview Kickstart ×3, letsdatascience, codewars, Exponent | Crowded. IQ also ranks "From 10,000 Interview Transcripts" (`/sql-prep`) |

**Pattern.** On FAANG queries, five incumbents (DataLemur, IQ, StrataScratch,
LearnSQL, Interview Kickstart) hold the page. On consumer-fintech queries
(Revolut, Wise, Chime, Monzo) **no practice platform holds a strong page**;
the SERP is Glassdoor, IQ boilerplate, PracHub reports, Dataford guides and
the company's own blog. This matches what C5 already measured (Revolut and
Wise convert). Capital One sits between: DataLemur's blog is first, and the
assessment query is Blind/Glassdoor plus two generated guides.

---

## 3. What their users say (search titles and summaries only)

Praise patterns:
- **DataLemur**: focused, cheap, interview-shaped; every question has a hint
  and a written solution; good first pick for analyst roles (roundups,
  vendor-neutral and vendor-written alike).
- **StrataScratch**: biggest bank, real company questions, SQL + Python.
- **LeetCode SQL 50**: the free, structured starting point.
- **Dataford**: company-specific guides, step-by-step SQL solutions
  (Trustpilot page exists, unverified reviews; a Medium comparison).
- **Interview Query**: real questions and detailed solutions; free weekly
  question email (Pathrise review, Blind threads).

Complaint patterns:
- **Paywalls on solutions and the good questions.** "Aggressive paywall"
  is the most repeated StrataScratch complaint in roundups; LeetCode, IQ and
  PracHub keep model solutions Premium. Blind shows people **splitting a
  StrataScratch lifetime** between buyers.
- **"Too pricey for what it is"**: the r/SQL thread comparing LeetCode,
  DataLemur, StrataScratch, IQ asks whether any paid tier is worth it.
- **LeetCode SQL is too basic for interview-level SQL** (Blind).
- **Narrow coverage**: Dataford good for SQL, thin on product sense and
  behavioural (Medium comparison).
- **Prep that under-shoots the real test**: a Capital One candidate report
  says the prep materials gave a false sense of security; the test was harder
  and more abstract (snippet, not fetched).
- **Interface surprise on timed tests**: Capital One candidates mention the
  CodeSignal CSV/spreadsheet interface eating time (snippets, not fetched).

New entrants seen (Product Hunt listings, undated in results): **PrepSQL**
(daily practice, company-style questions, AI mock interviews), **QueryPro**
(AI tutor), **DataDriven** (AI mock with hire/no-hire verdict, data
engineering, listing "1mo ago"), **PrepLoop**, **SQL IQ**. All small.

Stale facts **about us** in circulation (search summaries of third-party and
preview pages): "Pro at $19/month", "200+ challenges", "10 SQL categories",
"Updated May 2026". Sources: alternativeto.net listing, the founder's dev.to
post, and **`sql-quest2.vercel.app` pages, which are indexed** (homepage,
`/learn-sql/`, `/practice-sql-no-setup/`, `/best-sql-practice-sites/`,
`/sql-practice-comparison/`, `/llms.txt`). `vercel.json` redirects
`www.sqlquest.app` but has no rule for the `sql-quest2.vercel.app` host.

---

## 4. Routing table — top 10 by expected money per hour

Ranking logic: money comes from interview-intent people on company doors
(C5 measured 2.3% trial-or-paid per arrival vs 0.5% elsewhere). An item ranks
high when it touches a door that already converts, is cheap, or removes a
wrong statement that costs trust at the moment of purchase.

| # | Finding | Change that could bring a customer | Lane | Why this rank |
|---|---|---|---|---|
| 1 | Capital One assessment SERP is Blind, Glassdoor and two generated guides (IQ, Dataford "Updated Sep 13"). Nobody offers a timed rehearsal of the reported shape. We do (the 70-min mock) | On the Capital One blog guide (the door, 641 imp/39 clicks) add a "what candidates report about the assessment" block from **fetched** dated reports, ending on the mock and question 1. Target the query "capital one codesignal data analyst assessment" in the title/H2 | **C5** | Our best payer signal, an existing door, a unique product answer. Hours, not days |
| 2 | Wise: no page about Wise's SQL screen ranks; DataLemur's result is WiseTech; our Wise page has no sourced format section (0 mentions of the screen shape) | Source Wise's format (fetched reports, dated) and add the "How the interview runs (sourced)" section, plus a "4 questions, 60 minutes" practice set from Wise-tagged challenges. Title keeps "Wise" + "data analyst" to dodge WiseTech | **C5** (B3 for the set) | Wise is our top-CTR company page (27%) on an empty SERP |
| 3 | `sql-quest2.vercel.app` is indexed with old copy ($19, 200+, 10 categories, May 2026) | Add a host redirect `sql-quest2.vercel.app` → `https://sqlquest.app/:path*` in `vercel.json`. **First** check Supabase Auth Site URL / redirect URLs (`src/data/config.js` comments still name the vercel.app host) so sign-in callbacks do not break | **C1** | 15 minutes; stops a wrong $19 price reaching buyers and assistants |
| 4 | Our comparison copy says "no other platform has it" / "the only platform reviewed with … an AI Coach" (`/best-sql-practice-sites/`, `/sql-practice-comparison/`). Today StrataScratch ships StrataAI tutor (10-27) and an AI Interviewer, LDS a Socratic mentor, Aced AI feedback | Re-word the exclusivity to what stays true and specific (the wrong-answer diagnosis tied to the nine-skill Skillmap, the company mocks), with this read as the dated source. Add Aced, Dataford, LDS, PracHub rows only from §1 | **C2** | A false "only" on the page assistants cite is a trust and citation risk; cheap copy fix |
| 5 | Revolut: SERP is IQ boilerplate + PracHub reports describing a four-question live SQL round (Feb 2026). Our page is sourced | The page cites no PracHub report today (grep, 0). Add the two reports (fetched, with interview month and publish date) to Revolut's sources, and surface the Revolut mock above the fold | **C5** | Converting door; incremental, low effort |
| 6 | Monzo: no practice platform ranks; Monzo's own blog and Prepfully hold the SERP. Our page already cites four Monzo blog posts | The title already leads with "Monzo SQL Interview Questions". Put question 1 and the readiness test above the fold; C1 checks why the page does not show for the query (indexing or rank) | **C5** / C1 | Empty SERP + first-party sourcing already done |
| 7 | Price landscape: $10–15/mo annual-equivalent is the cluster; Dataford annual = $99 = ours; three sell lifetime; LeetCode Black Friday $30 off annual (code THANKS2026) | Dated input for B4's monthly pricing read; Black Friday week is 11-27. **No price change by any agent** | **B4** | Context for a founder-held money decision |
| 8 | Complaint: model solutions behind paywalls (StrataScratch, LeetCode, IQ, PracHub) | State plainly, from `freeTierSentence`, what a free account sees after a wrong answer (the diagnosis), on company and comparison pages. No competitor named in that sentence | **C2** / C5 | Turns a known objection into a reason to start free; copy only |
| 9 | Topic demand from candidate reports: cohort retention and funnel conversion (Revolut, Chime "schema-less retention" HM screen), weighted averages and margins (Capital One), median (Google), non-equi joins (Amazon) | A cohort-retention + funnel-conversion topic funnel (guide → hub → questions) | **C6** (C7 to confirm demand on Reddit) | Feeds the fintech doors with the exact skills they test |
| 10 | AI mock interviewer is table stakes across the set; a Stripe report stresses follow-up questions | Product idea: one follow-up question after a correct mock answer ("now handle ties / NULLs"), graded by the existing diagnosis. Orchestrator decides | **backlog** | Real differentiator gap, but a build, not copy; lowest money per hour |

Also routed, not ranked:
- **C3**: alternativeto.net listing and the dev.to post state $19 / 200+ /
  10 categories. Queue a founder update (outward, so founder's hand).
- **C7**: cluster "is X premium worth it / which SQL practice site" (r/SQL,
  Blind) is recurring; `/best-sql-practice-sites/` is the answer page.
- **B6 next runs**: G2/Trustpilot pages for StrataScratch and DataLemur were
  not found by search; try the URLs directly through the connector. LeetCode
  current prices and IQ monthly/lifetime need a rendered read (browser or
  `wait`).

## 5. Not read, and why

- HackerRank SQL question count (cookie wall), PracHub `/pricing` and Stripe
  category (rendered a loader / the landing page), LeetCode current price
  ("-/mo"), Interview Query monthly and lifetime prices and trial answer,
  Dataford lifetime price, Aced billing period. All partial renders through
  the connector; not filled from memory or snippets.
- DataLemur pricing was not re-fetched; the same-day read
  `monetization-competitors-2026-11-22.md` covers it.
- Glassdoor, Blind and 1point3acres content is used **only** as search
  snippets to describe SERP shape and complaint patterns. None of it is
  usable as a format fact on a page until fetched and dated by C5.
