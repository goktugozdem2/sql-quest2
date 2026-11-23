# C7 — Question mining (Reddit and Q&A as a research source)

**Lane:** read what people actually ask about SQL, and make sure SQL Quest has a good answer for each recurring question.

**Part of the SEO loop** (`SEO-loop.md`): stage 2 (find demand). Hand clusters to C1 as BACKLOG lines with the evidence; C1 decides what gets built.

C7 **posts nothing anywhere**. The founder's Reddit account is banned, and no agent posts to communities. Reddit, Stack Overflow, Quora, Hacker News and similar sites are **read-only research sources** for C7.

**Cadence:** daily (runs before C6, so C6 gets fresh input).
**Judged by:**
- the share of mined question clusters that have a good answer on the site (target: every cluster asked ≥ 3 times in 30 days);
- impressions on the queries those answers target (laptop GSC read, monthly).

Founder's order, 2026-11-22: "Reddit'i source olarak görüp, aslında araştırma konusu olan SQL hakkında herhangi bir konuda içeriğimiz olması iyi olur. Çalışmaya başla."

## Sources (read only), in this order

Orchestrator decision, 2026-11-22, sent to C7 during run 1 after the first sources proved closed:

1. **WebSearch titles and snippets** for `site:reddit.com/r/SQL`, `r/learnSQL`, `r/dataengineering`, `site:stackoverflow.com [sql]` and similar, recent results first. Titles are a demand signal only; nothing is fetched or copied.
2. **The Stack Exchange API** (`api.stackexchange.com/2.3/questions?tagged=sql&site=stackoverflow&sort=creation`) and **HN Algolia** (`hn.algolia.com/api/v1/search?query=sql%20interview`). Try each once per run and record the result in the read.
3. **Quora, Hacker News and the sqlite.org forum** through WebSearch restricted to those domains. These answered in run 1, but mostly with older threads, so they show that a question shape exists and recurs, not how often it was asked this month.
4. **Laptop only, filled by the laptop loop:** GSC question-shaped queries (`gsc_daily`), the questions people type to the tutor (`tutor_events`), and `feedback` verbatims. These are the only recent counts we can get; a cloud run leaves this section to the laptop and says so in its read.

**What cloud runs can't reach (measured 2026-11-22, run 1):** reddit.com and stackoverflow.com refuse Anthropic's agents. WebSearch returns no results from either domain and refuses a domain filter on them, and the fetch tool and the sandbox proxy refuse reddit.com and api.stackexchange.com. hn.algolia.com doesn't resolve in the cloud environment. Never route around a site's own block. Record what was tried and continue with the sources that answer.

**Counts follow the source.** A cluster's number is the threads found in this run's sources. Call it a 30-day count only when the source is dated, which today means the laptop's GSC and `tutor_events` reads.

Titles and short summaries are enough as demand signals. Never log in, never scrape behind auth, and never collect usernames.

## The run

1. **Mine** the last 7 days of questions (30 days on the first run). Keep only real SQL questions: how to write X, why does Y return Z, interview prep for company or topic W, which practice site, dialect differences.
2. **Cluster** them into question shapes. For example:
   - "UPDATE with a JOIN";
   - "delete duplicates but keep one";
   - "running total resets per group";
   - "what is on the Capital One SQL assessment";
   - "LEFT JOIN turns into INNER after WHERE".

   Count how many times each was asked, with links to the threads as evidence. Save the clusters in `docs/reads/questions-<date>.md`, links included, never usernames.
3. **Map each cluster to our coverage.** Look in the pages, the blog, the topic hubs, the FAQs, the trap pages and the challenges.
   - **Covered well:** nothing to do.
   - **Covered but not answered directly:** C7 adds the answer to the **existing** page. That means an FAQ entry, a short section or a worked example on the page that owns the topic (the FAQ JSON-LD must match the visible FAQ). This is C7's own output.
   - **A missing topic:** a BACKLOG line plus an entry at the top of C6's backlog in the latest `docs/reads/topic-coverage-*.md`, with the cluster's evidence. C6 builds it.
   - **A company question:** goes to C5 the same way.
   - **A practice gap:** a question shape we have no challenge for goes to B3 or C6.
4. **Ship one PR a run.** It holds the day's read plus the answers added to existing pages:
   - every query shown runs in a test on our data;
   - one direct answer per question, in our own words.

## Rules

- **No copying.** Never paste a Reddit or Stack Overflow answer or question text onto a page. Answer in our own words, with our own worked SQL.
- **No people.** Never name a person or a username, and never quote a post. Thread links appear only in `docs/reads/`, never on the site.
- **No frequency claims on the site.** "Asked N times on Reddit" stays in the read. Pages never say "most asked".
- **No new pages from C7.** New pages are C6's or C5's job, inside their weekly budget, so C7 can't create thin pages.
- **The founder's lane.** "Which practice site" questions are evidence for C2's comparison pages. C7 never answers them on Reddit, because nobody posts.
- **The quality pipeline:** Q1 (content QA) → A1 → A0. Generated pages change through their generators.
