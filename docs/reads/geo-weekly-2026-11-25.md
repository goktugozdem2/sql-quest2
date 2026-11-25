# GEO read — 2026-11-25 (G1, Wednesday run 2)

**Share of voice, against 2026-11-22 (`docs/reads/geo-2026-11-22.md`).**

| engine / proxy | 2026-11-22 | 2026-11-25 | change |
|---|---|---|---|
| **Perplexity** (named or cited) | 3 of 5 answered (prompts 1–5), named in 1 | **unread, 0 of 5 answered** | no read |
| **Search proxy top 10** (WebSearch; ChatGPT / Copilot pool) | 0 of 15 | **1 of 15** (#8), on the wrong host | +1, see below |
| **Google top 10** (`gsc_daily` [date,query] slice, 28 d; Gemini pool) | 5 of 15 direct, + #4 near | **5 of 15 direct** (#1, #3, #5, #6, #9), + #2 and #4 near | flat |
| **`ai:*` landings, 30 d** (people by `aid`) | 99 | **100** | +1 |

- **Perplexity was not read this week.** This was the first week of the rotation (`orchestrator-decisions.md`, 2026-11-22: 5 prompts a week, so this week is #6–#10). The first query, #6, opened on "Sign in to continue using Perplexity" before any answer showed, with no anonymous queries left this time. Per the brief, the engine stopped there: no sign-in, no retry. Prompts #6–#10 are **unread, not misses**. The rotation needs a way past the wall, or Perplexity drops out of the weekly read (FOUNDER below).
- **The search-proxy hit sits on the wrong host.** For #8 ("SQL practice site with an AI tutor that explains my mistakes"), the proxy's result list holds `sql-quest2.vercel.app/llms.txt`. Its summary names SQL Quest as one of two matches, next to DataCamp, and quotes our "explains WHY your query is wrong" line. The citation is the Vercel host, not `sqlquest.app`.
  - That host serves the whole site with a 200 and no redirect (checked 2026-11-25: `/`, `/sql-exercises/`, `/llms.txt`, `/robots.txt`).
  - HTML pages carry `canonical` → `sqlquest.app`. `llms.txt` is plain text, so it has no canonical, which is why it gets indexed under the Vercel name.
  - This is the open C1 item (BACKLOG "301 `sql-quest2.vercel.app` → `sqlquest.app`"). It now also touches a panel prompt.
- **GSC windows overlap almost completely.** Last week's window was 28 d to about 11-21, this week's is 28 d to 11-23 (the newest date in `gsc_daily`). A flat 5/15 is expected. Movement shows in the 7-day columns below.

**How it was measured.**
- **Perplexity:** perplexity.ai in the built-in browser, not signed in, 2026-11-25. One query (#6), stopped at the wall.
- **Search proxy:** WebSearch (the session's US search tool), one query per prompt, 2026-11-25. A prompt counts if a sqlquest.app (or our Vercel) URL is in the result list. It is not literally Bing.
- **Google:** `gsc_daily`, the [date,query] slice only (`page IS NULL`). Slices are never summed. Impression-weighted position.
  - Each prompt is matched to last week's query where that query still has impressions, so the two weeks compare. Otherwise it uses the matching query with the most impressions.
  - "Direct" means a query in the prompt's own intent. "Near" means a related query, such as "datalemur vs stratascratch" for "DataLemur alternatives".
- **Bing console:** `bing_stats`, query slice, weekly buckets to 2026-11-20 (never read as days). Context only, not in the share line.
- **ChatGPT, Gemini, Claude and Copilot themselves were not measured.** They need the founder's sign-in.

## Per prompt

Search-proxy competitors are the products the result list and its summary name. Google positions are 28 d, with the last 7 days vs the 7 days before in brackets.

| # | prompt | Pplx | in search top 10 | competitors in the search proxy | Google, matched query (28 d) [7 d / prior 7 d] | change since 11-22 |
|---|---|---|---|---|---|---|
| 1 | best website to practice SQL for data analyst interviews | not in rotation | no | StrataScratch, DataLemur, Interview Query, LeetCode, HackerRank, SQLBolt, SQLZoo; lists: interviewquery, kdnuggets, analyticsinsight, positioniseverything, boot.dev | "best sql practice website" **9.8** (25 imp) [10.1 / 10.7]; "sql practice websites" 9.3 [9.1]. Last week's query ("best platform for sql practice") is under 3 imp now | flat; Bing "best sites for sql interview practice" pos 4 (3 imp) |
| 2 | SQL interview practice like LeetCode but for data analysts | not in rotation | no | DataLemur, StrataScratch, Interview Query, LeetCode, HackerRank, Exponent | near: "stratascratch vs datalemur" 3.9, "datalemur vs stratascratch" 5.1; "stratascratch vs leetcode" 13.3 [**7.4** / 20.9] | near match improving |
| 3 | how to prepare for the Capital One data analyst SQL assessment | not in rotation | no | Interview Query, DataLemur, Dataford; Glassdoor, Blind, 1point3acres threads | "capital one data analytics assessment" **6.5** [4.7]; "capital one codesignal" 8.5 [6.9 / 10.5]; "capital one data analyst assessment" 5.2 [3.0] | flat to better |
| 4 | DataLemur alternatives | not in rotation | no (results are unrelated products plus a Semrush / alternativeto page) | StrataScratch, Mode (Semrush) | no "datalemur alternatives" query; near: "datalemur vs stratascratch" 5.1. Head "datalemur" 6.7 (3,322 imp, navigational) | flat |
| 5 | StrataScratch alternatives | not in rotation | no (results are unrelated products) | — | "stratascratch alternatives" **1.0** (8 imp) | flat |
| 6 | how to practice SQL window functions for interviews | **unread (sign-in wall)** | no | DataLemur, DataDriven, Educative, StrataScratch, LearnSQL; posts on dev.to, Medium, TDS, KDnuggets | "window functions in sql practice" **5.3** [6.3]; the bigger "sql window functions practice" 11.1 [**7.2** / 17.2] | flat; the head query is climbing |
| 7 | free SQL practice with real interview-style questions | not in rotation | no | DataLemur, Dataquest, Exponent, LearnSQL, Toptal, roadmap.sh, DataCamp, a GitHub Pages set | "sql practice questions" 52.4 [29.5 / 66.0]; "free sql practice platform" 9.2. Bing "sql practice questions" **5.7 (390 imp**, was 5.0 / 273) | Google miss; Bing door bigger |
| 8 | SQL practice site with an AI tutor that explains my mistakes | not in rotation | **yes**: `sql-quest2.vercel.app/llms.txt` (named in the summary) | DataCamp, ExplainS (research), sql-tutor (GitHub), DBeaver | none: no matching query | **new hit**, wrong host |
| 9 | how to prepare for a Revolut data analyst SQL interview | **unread** | no | Interview Query; Glassdoor, AmbitionBox, Scribd | "revolut sql interview questions" **2.4** [5.3 / 1.0] | slipped from 1.1, still top 3 |
| 10 | where to practice SQL for a Meta data scientist interview | **unread** | no | DataLemur, StrataScratch, LeetCode, Interview Query, LearnSQL, Exponent; Blind threads | "meta sql interview questions" **20.5** [23.5 / 13.6] | no better (was 20.1) |
| 11 | timed SQL mock interview online | not in rotation | no | dbSyntax, DataDriven, Exponent, Dataford, Coddy, InterviewBit, igotanoffer, 365 Data Science | no matching query. `/sql-mock-interview/` (C2, built 11-22) has 1 impression so far, first seen 11-23 | page live, not ranking yet |
| 12 | how do I find my weak areas in SQL | not in rotation | no | LearnSQL (assessment), The Pivot Wave, JobCannon, Coursera, Analytics Vidhya | "sql assessment platform" 21.5 [24.3 / 12.7] | flat, noisy (was 24; 13 imp) |
| 13 | 2-week SQL interview prep plan | not in rotation | no | Exponent, Coursera, DataDriven, LearnSQL, Educative, Interview Query, HackerNoon | no matching query. `/sql-interview-prep-plan/` (built 11-22) has no impressions yet | page live, not ranking yet |
| 14 | SQL practice after a bootcamp, to get interview-ready | not in rotation | no | LearnSQL, Exponent, Educative, DataCamp, Udemy, CodeSignal, zerotomastery | none | flat |
| 15 | (TR) SQL mülakatına hazırlanmak için en iyi site | not in rotation | no | DataCamp TR, Guru99 TR, Techcareer, JobCannon TR; the summary names StrataScratch, LeetCode, HackerRank, Interview Query, DataLemur | no "mülakat" query; "sql öğren" 6.5 (2 imp, not the intent) | flat |

**New names in the proxy since 11-22:** DataDriven (datadriven.io) now holds window-function practice pages (#6) as well as mocks and plans. dbSyntax keeps a timed-mocks section (#11). An "AI SQL tutor" search (#8) still finds no dedicated competitor page, only DataCamp's blog and research prototypes. That slot is still open.

## What assistants send (first-party, `ai_landings_month`)

People in the 30 days to 2026-11-25 whose events carry an `ai:*` `landingSrc`, counted by `metadata.aid` (never username), first source and first page.
- **Excluded first:** the bot flags (`bot`, `uaBot`), the bot viewports (incl. `desktop:1024x1024`), `ref:aocr.org`, internal usernames, the UTC landing crawler (a `landing_view` in `tz=UTC` with no `app_opened`) and the founder's 11-24 walk.
- **What the exclusions removed:** none of the 100 matched any of them. The topic-page and app-only crawlers carry no `landingSrc`, so they cannot reach this count.

| source | people | opened the app | ran a query | first 7 d / prior 7 d | `/questions/*` first | `home` first |
|---|---|---|---|---|---|---|
| ai:chatgpt | 80 | 41 | 12 | 14 / 14 | 19 | 19 |
| ai:gemini | 18 | 9 | 5 | 4 / 5 | 0 | 1 |
| ai:perplexity | 1 | 1 | 1 | — | 0 | 0 |
| ai:claude | 1 | 0 | 0 | — | 0 | 1 |
| **total** | **100** | 51 | 18 | 18 / 20 | 19 | 21 |

- **Flat against 99 last week.** The two windows share 27 of 30 days, so this was expected.
- **ChatGPT's first pages:** home, then `/sql-exercises/` (9), question pages (19 in all), `/sql-quiz/` (5, 3 of them this week), `/turkce-sql-ogren/` (4) and the company pages (12 company or blog first pages).
- **Gemini's first pages:** company and blog pages (6) and comparison pages (3).
- **Read it as a floor.** Gemini often strips the referrer, and Copilot is not stamped.

## Plumbing check (no code change this week)

- **robots.txt** (live, 2026-11-25): GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended and bingbot are all `Allow: /`. `/sql-mock-interview/` answers 200 to the GPTBot, PerplexityBot and ClaudeBot user agents.
- **llms.txt** (live): the "Questions people ask, and the page that answers" block from the 11-22 PR is served. It includes `/sql-mock-interview/` (#11) and `/sql-interview-prep-plan/` (#13).
- **The Vercel host.** The one plumbing gap found this run is the open C1 item, now with a panel citation behind it. It is a `vercel.json` host redirect, gated on the Supabase Auth Site URL check that the BACKLOG line names. G1 does not take it from C1.

## Off-site (for C3)

New lists the search proxy cites for #1 this week, each fetched 2026-11-25 and searched for "SQL Quest" / "sqlquest":

| source | cited for | names us? |
|---|---|---|
| analyticsinsight.net/photo/best-sql-interview-preparation-platforms | #1, #2 | no (DataLemur, StrataScratch, LeetCode, HackerRank, SQLBolt) |
| positioniseverything.net/10-best-platforms-to-practice-sql-choose-by-your-goal/ | #1 | no (ten platforms, none of them us) |
| dbsyntax.pages.dev timed mocks | #11 | not readable (timed out). It is a competitor's own page, not a list |

The 11-22 lists (boot.dev, interviewquery, kdnuggets and others) are unchanged as citations and were not re-fetched.

## The top three gaps

1. **The Vercel host is cited instead of sqlquest.app** for the AI-tutor prompt (#8). It is the only proxy hit of the week, and it credits a duplicate host that also serves stale copy elsewhere (competitors reads of 11-22 to 11-24). C1 owns the redirect, so it is raised in BACKLOG.
2. **#8, the AI-tutor intent, still has no page**, yet it is the one prompt where a search summary names us unprompted. C2's page would give that citation a sqlquest.app URL to land on.
3. **`/meta-sql-interview/` sits at 20.5 (#10)** and the Turkish interview intent (#15) has no page. Both are unchanged C2 items.

## FOUNDER

- **Perplexity.** The anonymous allowance ran out on the first query this week, so the weekly rotation cannot run. Choose one: (a) Perplexity leaves the weekly read and joins the monthly signed-in list below; (b) you run the week's 5 prompts yourself in a private window. This week's 5 are #6–#10 in `docs/agent/fleet/G1-geo.md`. Either choice needs a dated note on the panel.
- **The monthly signed-in check (from 11-22) is still open:** #1, #3, #5, #8 and #15 in ChatGPT, Gemini, Claude and Copilot, recorded in `docs/reads/geo-<date>-founder.md`. Copilot's November citation count comes from Bing Webmaster → AI Performance.
