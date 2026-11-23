# Playbooks that fit SQL Quest — research read (2026-11-22)

**What this is.** A read of existing growth playbooks, benchmarks and public
case studies for a product shaped like SQL Quest: solo founder, prosumer
interview prep, freemium with a 10-solve quota, Pro at $29/mo or $99/yr with
a 7-day card trial, traffic from Google, Bing and AI assistants, company
pages (Capital One strongest), B2B seats just starting, and an agent fleet.
The objective it serves is O2 (10 payers / 30 days by 2027-02-08, from about
2–3; `docs/agent/objectives.md`).

**How it was read.** Every source below was opened and read on
**2026-11-22** unless it says "snippet only" or "not read". Summaries are in
my own words, with at most one short quote per source. Where a site refused
the fetch it is listed at the end and was not retried through another tool.

**What it is not.** No production data was read for this file. Where a SQL
Quest number appears, it comes from a dated file already in the repo, and
the file is named.

---

## 0. The short version

1. The money playbook with the strongest evidence for our shape is not a
   pricing model. It is **a human reaching out to free users who are already
   active**. Poyar and Rachitsky found that this is the main thing separating
   high-converting freemium products from the rest. For a solo founder, it
   means Göktuğ writing to the people who reach six solves or the quota wall.
   The sender for it is built (`activated-note`) and has never been scheduled.
2. Every comparable that got big (Exponent, NeetCode, DataLemur, Interview
   Query) grew on **one person-shaped channel**: YouTube, a LinkedIn audience
   with a book, or a newsletter. Programmatic pages came later or not at all.
   We run the pages and do not run the person-shaped channel.
3. On AI-assistant visibility, the best public data (Ahrefs, 75k brands)
   says **mentions, especially YouTube mentions, track AI visibility; backlinks
   and page count barely do**. More question pages will not make Gemini name
   us. Being talked about will.
4. For the Bing drop, the published recovery cases all point to
   **concentration: fewer, denser pages, refreshed**. None recovered by
   adding pages. Bing's February 2026 guidelines now name GEO and say content
   generated at scale "without oversight" may be dropped from the index.
5. B2B seats: the working pattern is a **school-specific login on a
   per-cohort annual licence**, priced around $1k for 50 learners (Big
   Interview's published tier), with the pilot measured on something the
   buyer already tracks. Interview Query says university sales kept it alive
   through the 2022–23 hiring slump.

The top 5 missing plays, ranked, are in section 8.

---

## 1. Product-led growth and freemium conversion

### 1.1 Free-to-paid benchmarks, freemium vs free trial (Poyar / Rachitsky, 2023)

- **Source:** Kyle Poyar and Lenny Rachitsky, "What is good free-to-paid
  conversion", Lenny's Newsletter, published 2023-08-01.
  https://www.lennysnewsletter.com/p/what-is-a-good-free-to-paid-conversion
  — read 2026-11-22 (public part only; the tactics section is paywalled).
- **Core idea.** Free-to-paid is measured per cohort as accounts that pay
  within six months, divided by new accounts. Freemium and free trial are
  separate games with separate benchmarks. Free trials convert better per
  signup, but freemium gets roughly twice the signups. The single biggest
  driver of high conversion is **sales reaching out to free accounts**. This
  is also part of why trials look better, since trial companies do much more
  of it.
- **Benchmarks.**
  - Freemium, self-serve: 3–5% is good, 6–8% is great.
  - Freemium with sales assist: 5–7% good, 10–15% great.
  - Free trial: 8–12% good, 15–25% great.
  - Visitor signup rates: about 5% for trials, about 9% for freemium.
  - 44% of trial companies have sales contact more than half of signups;
    24% of freemium companies do.
  - Developer-focused products run at about half the rate of the others,
    with a median of 5%.
- **Fit for SQL Quest.** The data is B2B SaaS. Our audience is closer to
  "developer-ish prosumer", which sits at the low end. Rough arithmetic from
  repo numbers: about 140–270 accounts a month
  (`docs/reads/weekly-funnel-2026-10-02.md`, 33–63 a week) and 2–3 payers.
  That is about 1–2%, below "good" freemium even on this lenient definition,
  and ours is measured over 30 days, not six months.
- **Verdict: use now** — but use the *mechanism*, not the number. The
  sales-assist row is the actionable finding. A solo founder's version of
  sales-assist is founder-assist (section 8, play 1).
- **First step.** Read the six-solver → payer rate split by whether the
  person ever received a personal founder email. Then schedule
  `activated-note` with the founder's go.

### 1.2 The 2026 conversion report (Poyar / ChartMogul / ProductLed)

- **Sources:**
  - Kyle Poyar, "A new look at free-to-paid conversion", Growth Unhinged,
    published 2026-02-04 (partly paywalled).
    https://www.growthunhinged.com/p/free-to-paid-conversion-report — read
    2026-11-22.
  - ChartMogul, "The Conversion Report" (same survey, January 2026, 200
    products). https://chartmogul.com/reports/saas-conversion-report/ — read
    2026-11-22.
- **Core idea.** Across 200 products, the median free-to-paid rate is 8%,
  with wide spread around it. The key number is **paying customers per
  1,000 visitors**, because it folds in the signup-rate difference.
  - Freemium: about 5.
  - Free trial without card: about 3.6.
  - Card-required trial: about 10.5. Its signup rate is lower (3.5%), but 30%
    of those signups pay.
  - Reverse trials sat between trial and freemium, but the sample was too
    small to be significant.
- **Benchmarks.**
  - Visitor → signup: freemium 9%, trial 4.5%, card-required trial 3.5%.
  - Signup → paid: freemium median 5.5%, trial median 8%, card-required 30%.
  - Model mix: 57% of products lead with a free trial, 26% with freemium,
    7% with a reverse trial.
  - Trial length: 62% use 14 days, 14% use 7 days, 14% use 30 days.
- **Fit for SQL Quest.** We already run the strongest combination these
  numbers point to: freemium at the top of the funnel (needed for SEO and
  question pages) plus a card-required trial at the bottom, offered at
  checkout. Our trial is opt-in after a plan click, so its 30% comparison
  cohort is "people who started a trial", not "signups". Read it that way.
- **Verdict: no change to the model; later for trial length.** Most
  products run 14-day trials; ours is 7. See RevenueCat (1.4): longer trials
  convert better on average, but our buyers decide in their first session.
- **First step.** When the first five trial outcomes exist
  (`pro_trial_started` → `pro_purchase_completed {after_trial}`), compute
  trial → paid and compare it with the 25–35% "good" band for card-required
  trials. Below 15% is a signal to read the trial screens, not to lengthen
  the trial.

### 1.3 Reverse trial (Elena Verna)

- **Source:** Elena Verna, "Reverse trials examples", published 2024-04-12.
  https://www.elenaverna.com/p/reverse-trials-examples — read 2026-11-22.
  Her "It's all about trials" (2023-04-03,
  https://www.elenaverna.com/p/trial-configurations-explained) was read too,
  but only its paywalled preview was visible.
- **Core idea.** Every new signup starts on the paid plan, with no card and
  no opt-in. When the clock runs out without payment, the account drops to
  the free plan instead of being locked out. The trial creates urgency and
  the free plan keeps the person. She shows Canva, Asana, Airtable and Notion
  routing profiled signups into one.
- **Benchmarks.** None measured in the post; her stated case is an argument.
  ChartMogul's 2026 data (1.2) puts reverse trials between trial and
  freemium, not statistically separable.
- **Fit for SQL Quest.** Our own finding on 2026-09-12
  (`docs/plans/free-tier-boundary-2026-09-12.md`) was that the free tier sits
  in front of the paid good. Few people ever open locked Hard questions, and
  almost nobody sees a mock. A reverse trial is the textbook answer to "they
  never touch the paid part". Against it:
  - it switches off the quota wall, the only ask we have watched work
    (purchases happen at 6–10 solves in the first session);
  - at about 200 signups a month, no A/B test reaches a readable answer
    inside 60 days.
- **Verdict: later.** The narrow version to consider after O2's day-30
  read is a reverse trial only for company-intent arrivals (`?company=`,
  Capital One page). That is a small population, where a mock is the
  product.
- **First step.** None now. Write the hypothesis and kill rule into the
  ledger only if the day-30 read says the rate after six solves, not
  traffic, is short.

### 1.4 Consumer-subscription paywall benchmarks (RevenueCat)

- **Sources:**
  - RevenueCat, "State of Subscription Apps 2026 — Education" (2025 data).
    https://www.revenuecat.com/state-of-subscription-apps-2026-education —
    read 2026-11-22.
  - Peter Meinertzhagen, "Optimizing paywall placement", RevenueCat blog,
    2023-11-20. https://www.revenuecat.com/blog/growth/paywall-placement/ —
    read 2026-11-22.
- **Core idea.** For consumer subscriptions, a hard paywall converts about
  5× better than freemium: day-35 download → paid medians of 10.7% vs 2.1%,
  with retention about equal. The placement guidance is to show the paywall
  right after the "aha" moment. PhotoRoom, for example, lets the person
  remove one background first. Placement is also something to test again
  over time. Babbel's view, reported there, is that early paywalls mostly
  lose people who would never have paid.
- **Benchmarks (Education).**
  - Download → trial: 6.5%.
  - Typical trial length: 5–9 days for half of education apps.
  - Trial conversion by length, all categories: 17–32 days 42.5%, 5–9 days
    37.4%, 4 days or less 25.5%.
  - Median price: $44.99/yr and $9.99/mo, the highest annual median of any
    category.
  - Annual plans dominate education.
  - 78.5% of education trials start on day 0, and only 28.5% of education
    conversions happen on day 0, the lowest of any category. Learners take
    longer to decide.
- **Fit for SQL Quest.** These are mobile apps, not web, so use them as
  direction, not as targets.
  - Our accounts → payer rate of about 1–2% sits near the freemium median
    (2.1%).
  - A hard paywall is not open to us without giving up the SEO and question
    pages that bring the traffic.
  - Our $99/yr is about 2× the education median. That is fine for
    high-stakes interview prep: DataLemur charges $60/yr and StrataScratch
    $139/yr (section 2).
  - The quota wall at 10 solves is already an after-the-aha paywall.
- **Verdict: confirms what runs; nothing new to adopt.**
- **First step.** None.

### 1.5 Choosing the model (Wes Bush, ProductLed)

- **Source:** Wes Bush, "Freemium vs. Free Trial", ProductLed, 2023-05-30
  (updated 2024-06-28). https://productled.com/blog/free-trial-vs-freemium —
  read 2026-11-22.
- **Core idea.** Freemium needs a large market, a simple product and a quick
  aha. A trial suits complex products whose value shows inside the window. A
  hybrid works for products with many features. His conclusion is that what
  goes in the free part matters more than which model you pick.
- **Fit / verdict.** Supports what runs: a large market, an aha that comes
  quickly (the first solve), and a usage gate rather than a feature gate.
  **Not for us as new work.**

> **Source not reachable:** OpenView's 2023 Product Benchmarks page
> (https://openviewpartners.com/2023-product-benchmarks/) returned 404 on
> 2026-11-22. OpenView wound down its platform, and its numbers survive in the
> Poyar pieces above. Poyar's "Your guide to SaaS product metrics"
> (https://www.growthunhinged.com/p/your-guide-to-saas-product-metrics,
> 2023-07-19, read 2026-11-22) is mostly paywalled. Its visible example
> funnel assumes free signups take 30–60 days to convert. Ours convert in the
> first session (`docs/reads/purchase-timing-2026-09-09.md`), which is why the
> first-session ask matters more to us than a long nurture sequence.

---

## 2. Interview-prep and edtech comparables

### 2.1 DataLemur (Nick Singh)

- **Source:** DataLemur pricing page. https://datalemur.com/pricing — read
  2026-11-22. A search for Singh's own account of his marketing found no
  primary source; his LinkedIn tactics are therefore **not documented here**.
- **What the page shows.**
  - Prices: $15/mo, $60/yr, and a $300 one-time lifetime plan that includes
    a signed copy of the book and a one-hour call with Singh.
  - Free funnel: a free "9-day data interview crash course", a free SQL
    tutorial, a cheat-sheet PDF and an interview guide.
  - Social proof: the book has 16,000+ readers, Singh has coached 600+
    people, and he has 150,000+ LinkedIn followers.
  - What Premium adds: company-attributed SQL questions with hints and full
    solutions.
- **Playbook, as the page implies it.** A founder with a large audience, a
  flagship book that defines the category ("Ace the…"), free long-form
  guides for search, an email course as the lead magnet, and a low price
  with the founder's own time sold at the top tier.
- **Fit for SQL Quest.**
  - The email-course door is cheap for us to copy. A "7-day Capital One SQL
    screen" email course fits the strongest buyer signal, and
    `capture-email-drip` is already the machine.
  - The founder audience is the slow part.
  - Selling founder time at the top tier is a do-things-that-don't-scale
    move that also produces customer conversations.
- **Verdict:**
  - Email course: **use now** (small).
  - Founder audience: **later**, through the founder's own LinkedIn rules.
  - Price: **do not follow down to $15.** DataLemur sells on volume from an
    audience we do not have.
- **First step.** Rename and retarget the capture drip's first five emails
  as a dated, named crash course for one screen (Capital One), and give the
  readiness test result page a sign-up for it.

### 2.2 StrataScratch (Nate Rosidi)

- **Source:** StrataScratch pricing page.
  https://platform.stratascratch.com/pricing — read 2026-11-22. Its early
  history (2,500 users and about $1.5k MRR two years after the 2017 launch;
  channels such as cold email and Google Ads not working well) comes from
  **search snippets only**. The case-study page
  (https://first-mrr.com/study/stratascratch) returned 503 and the Indie
  Hackers episode page was not read.
- **What the page shows.**
  - Prices: $24/mo, $139/yr, $289 lifetime, plus AI credits ($5 per 1,000).
  - The free tier is 75+ questions.
  - "Interview loop" pages per company.
  - Discounted seats for students, universities, cohorts and bootcamps,
    through sales.
  - Claims 750,000+ members, 1,000+ questions and 200+ companies.
- **Playbook.** A wide catalogue (more questions, more companies), company
  "loop" pages, AI usage metered as credits, and B2B through bulk discounts
  rather than a separate product. It was a slow side-project build before
  it scaled.
- **Fit for SQL Quest.** Our company pages already mirror their loop pages.
  Credits are a different answer to our "Unlimited AI tutor" wording problem
  (CLAUDE.md, 09-29 batch), and our fix (correct the words) is the cheaper
  one. Their cohort discounts confirm bootcamps buy this category.
- **Verdict: not for us as a model; cohort seats confirm section 5.**
- **First step.** None beyond section 5.

### 2.3 Interview Query (Jay Feng)

- **Source:** Jay F., "Five Years of Bootstrapping: Reflections on Building
  Interview Query", The Data Stream, 2025-01-20.
  https://datastream.substack.com/p/five-years-of-bootstrapping-reflections —
  read 2026-11-22. University case studies on interviewquery.com returned
  **429** and were not read; the partner names below (UCLA 2021, Purdue
  2022, Columbia, Georgia Tech, Minnesota) are from **search snippets only**.
- **Core idea.** The first product was a newsletter: interview questions by
  email three times a week, with the solutions paywalled. It reached about
  $3k MRR in six months and about $650k revenue in 2021. Later lessons:
  - Revenue fell from about $80k/month to under $30k in the second half of
    2022.
  - **University sales kept it afloat** through the downturn.
  - A cheaper tier in August 2023 started the recovery.
  - Mistakes he names: shipping without measuring impact, overhiring
    against growth targets, and depending on a hot tech hiring market.
- **Fit for SQL Quest.**
  - The newsletter-as-product shape is the cleanest public example of
    "question of the day with the answer behind the paywall". We have the
    daily challenge in-app, but nothing goes out by email.
  - The university point is direct evidence for section 5.
  - The "measure it" lesson is one we already run (the ledger).
- **Verdict:**
  - Weekly question email with the reasoning behind Pro: **later**. It
    retains and converts, but does not bring traffic, which is the shortage.
  - University and bootcamp seats: **use now** (section 5).
- **First step.** Ask the five A-priority bootcamps
  (`docs/outreach/teams-2026-09-26.md`) for a pilot cohort, with the
  founder's go.

### 2.4 Exponent (Stephen Cognetta)

- **Sources:**
  - Poets&Quants, "Looking for work in a pandemic? This Stanford MBA's
    startup can help", 2020-04-15.
    https://poetsandquants.com/2020/04/15/looking-for-work-in-a-pandemic-this-stanford-mbas-startup-can-help/
    — read 2026-11-22.
  - Penn Career Services, Exponent resource page (undated).
    https://careerservices.upenn.edu/resources/exponent/ — read 2026-11-22.
  - The claim that people mainly find Exponent through YouTube is from a
    Vator interview seen as a **search snippet only**; the page redirected
    and was not followed.
- **Core idea.**
  - Career services offices license the product for all their students.
    Students sign in through a school-specific URL (tryexponent.com/stanford;
    Penn's is aced.io/upenn), and some schools also get workshops.
  - The consumer side sold a $99 course, and an $829 tier added coaching.
  - It had 3,000+ paying customers three years after launch, and was
    discovered mostly through YouTube.
  - Penn presents it as a free account "through Penn's subscription" for
    current students.
- **Fit for SQL Quest.** This is the concrete B2B2C mechanism for a
  prosumer prep product. One school buys, every student gets a link, and
  the school's career page does the marketing to students. A school URL is
  a small build for us (a `?org=` door that grants Pro to a verified
  domain).
- **Verdict: use now, starting with bootcamps** (faster buyers than
  universities; section 5).
- **First step.** Write the pilot offer as "a school link for one cohort",
  not "N seats".

### 2.5 NeetCode (Navdeep Singh)

- **Source:** Gergely Orosz, "Tech interviews with NeetCode", The Pragmatic
  Engineer, 2026-06-24.
  https://newsletter.pragmaticengineer.com/p/tech-interviews-with-neetcode —
  read 2026-11-22. The page gives no revenue or user numbers, and none is
  used here. A "$10M+" figure appears only in another podcast's title.
- **Core idea.** NeetCode is a YouTube-first interview-prep brand. The
  channel took off once the founder's own story (getting into Google)
  became part of the content. He later left Google for it, and now uses AI
  mostly to pay down the old codebase. His view is that algorithmic
  interviews persist because they scale for interviewers, not because they
  predict job performance.
- **Fit for SQL Quest.** It is the strongest example that the channel for
  this category is a person explaining problems on video. That matches the
  AI-visibility data in 3.3, where YouTube mentions are the strongest single
  correlate.
- **Verdict: use now in a small form** (section 8, play 4).
- **First step.** Five short screen-recorded videos, one per SQL trap page
  (`/sql-not-in-null/` …), in the founder's voice, each linking the page.

### 2.6 Duolingo — habit and streaks

- **Sources:**
  - Jorge Mazal, "How Duolingo reignited user growth", Lenny's Newsletter,
    2023-02-28.
    https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth —
    read 2026-11-22.
  - Duolingo blog, "How Duolingo's streak builds habit", 2022-01-31.
    https://blog.duolingo.com/how-duolingo-streak-builds-habit — read
    2026-11-22.
- **Core idea.**
  - Model users as states (new, current, reactivated, resurrected, at risk,
    dormant). Simulate which transition rate moves daily users most. For
    Duolingo it was **current-user retention (CURR)**, by about 5× over the
    next lever.
  - The first win was a late-evening streak-saver notification. Then came
    leagues, which raised learning time 17% and tripled highly engaged
    learners.
  - The team protected the notification channel, so a new notification
    needed CEO sign-off.
  - Learners who reach a 7-day streak are 3.6× more likely to finish a
    course.
- **Fit for SQL Quest.** We already run streaks, leagues, an hourly
  local-time streak reminder and lifetime send caps (CLAUDE.md, email
  lifecycle). The fit is limited: interview prep ends at the interview, so a
  months-long habit is not the product. Mazal's own warning is to ask why a
  feature works before copying it. The transferable part is the state model:
  which transition moves payers most? For us it is probably
  new → six-solver, already the O2 decomposition.
- **Verdict: running enough; not a priority.**
- **First step.** None.

> **Not read:** LeetCode's Premium page (https://leetcode.com/subscribe/)
> returned 403. Search snippets say Premium includes company-tagged question
> filters. That is consistent with the category pattern (company frequency
> behind the paywall), but it is unverified here.

---

## 3. SEO and AI-search for this category

### 3.1 The quality line for programmatic pages (Google)

- **Source:** Google Search Central, "Spam policies for Google web search"
  (scaled content abuse; doorway abuse).
  https://developers.google.com/search/docs/essentials/spam-policies — read
  2026-11-22 (no last-updated date on the page).
- **Core idea.**
  - *Scaled content abuse* means many pages made mainly to rank, with
    little value, however they were produced. That includes stitching or
    rewording other content and keyword-packed pages.
  - *Doorway abuse* means near-duplicate pages aimed at similar queries
    that funnel people to one destination.
- **Fit for SQL Quest.** We have 307 `/questions/` pages and 30+ company
  pages. They carry a real, runnable problem each, which is the defence. The
  risk is the near-duplicates: company pages whose "Topic practice" is the
  same tagged set reshuffled, and question pages that differ only by the
  problem statement. We already took question pages out of Bing's index
  (`bingbot noindex, follow`, PR #72). The prune file exists
  (`src/data/seo-prune.json`), and its no-pruning-before date (2026-11-09)
  has passed.
- **Verdict: use now (as review, not new pages).**
- **First step.** List the company pages whose tagged set overlaps another
  company page's by more than half, plus their 90-day clicks from
  `gsc_daily` and `bing_stats`. Zero-click overlaps are prune or merge
  candidates under the 2026-09-13 grow/prune rules.

### 3.2 Recovering from an index or traffic drop

- **Sources:**
  - Roger Montti, "Why a website deindexed by Google for programmatic SEO
    bounced back", Search Engine Journal, 2025-07-26.
    https://www.searchenginejournal.com/why-website-deindexed-by-google-for-programmatic-seo-bounced-back/552179/
    — read 2026-11-22.
  - Bing Webmaster Guidelines change, as reported by Search Engine Journal,
    2026-02-27.
    https://www.searchenginejournal.com/bing-adds-geo-to-official-guidelines-expands-ai-abuse-definitions/568442/
    — read 2026-11-22.
  - Other practitioner recoveries (a site trimmed from about 30,000 thin
    pages to about 700; a Search Engine Land pruning case that lifted
    noindex page by page as each was rewritten) were seen as **search
    snippets only**.
- **Core idea.**
  - The SEJ case had about 50,000 long-tail programmatic pages, which Google
    dropped for quality without a manual action. It recovered with fewer
    pages of higher quality, in the founder's words "Less pages + more
    quality".
  - Bing's February 2026 guidelines rewrite:
    - names Generative Engine Optimization;
    - narrows the AI-content concern to large-scale content made "without
      oversight, quality control, or editorial review";
    - adds an abuse class for language engineered artificially to trigger
      AI citations, and one for prompt injection;
    - asks for one topic per URL with key facts near the top;
    - warns that fewer clicks do not always mean less visibility, since AI
      answers can absorb clicks.
- **Fit for SQL Quest.** Bing clicks fell from about 280 to about 25 a week,
  mostly on `/sql-exercises/` (memory note "Bing is the real channel"). Two
  things to read before acting:
  1. Did impressions fall, or only clicks? If impressions held, Copilot
     answers may be absorbing the clicks, and the AI Performance panel
     (3.4) is where the traffic went.
  2. Did the drop follow a page change on our side? `/sql-exercises/` got a
     solutions block on 2026-09-30, and its title is pinned.

  Either way, the playbook is to concentrate on the pages that earned clicks
  before, not to add pages. Keep every agent-written page under named human
  review, since that is now Bing's own line.
- **Verdict: use now.**
- **First step.** A dated read (`docs/reads/bing-drop-<date>.md`) with
  weekly clicks *and* impressions for the top 10 Bing pages from
  2026-08-01, each page's last change from git, and the AI Performance
  citation count for the same pages. Act only on what the read shows.

### 3.3 What predicts being named by ChatGPT, Gemini and AI Overviews (Ahrefs)

- **Source:** Louise Linehan, "Top brand visibility factors in ChatGPT, AI
  Mode and AI Overviews (75k brands studied)", Ahrefs, 2025-12-12.
  https://ahrefs.com/blog/ai-brand-visibility-correlations/ — read
  2026-11-22.
- **Core idea.** Across about 75,000 brands, here is how strongly each
  factor tracks how often AI assistants mention a brand (Spearman ρ; Ahrefs
  stresses this is correlation, not cause):
  - YouTube mentions: about 0.74, the strongest.
  - Branded web mentions: about 0.66–0.71.
  - Domain rating: about 0.27–0.33.
  - Number of pages on the site: about 0.19.
  - Backlinks: weak.

  ChatGPT is the least tied to authority, so it is the easiest for an
  emerging brand to appear in. Google's AI Mode is the hardest.
- **Fit for SQL Quest.** This changes how we should read our own GEO work.
  llms.txt, comparison pages and more pages are cheap, but they are the
  weakest factors. Our proven buyer channel (an assistant naming us; the
  Gemini payer) is driven by being *mentioned* — in "best SQL practice
  sites" lists, forum answers and video titles. Our backlink outreach drafts
  aim at links. Retarget them at mentions on pages assistants already cite.
- **Verdict: use now.**
- **First step.** For the 10 prompts a candidate would type ("best site to
  practice SQL for a Capital One interview", …), record which pages ChatGPT
  and Perplexity cite. That becomes the outreach list: those pages' authors.

### 3.4 Search engines' own word on AI search

- **Sources:**
  - Google Search Central, "AI features and your website".
    https://developers.google.com/search/docs/appearance/ai-features — read
    2026-11-22 (no date on the page).
  - Bing Webmaster blog, "Introducing AI Performance in Bing Webmaster Tools
    (public preview)", 2026-02-10.
    https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview
    — read 2026-11-22.
  - Bing Search blog, "New AI visibility insights in Bing Webmaster Tools:
    Intents, Topics, Citation Share, Compare", 2026-06-16.
    https://blogs.bing.com/search/June-2026/New-AI-Visibility-Insights-in-Bing-Webmaster-Tools-Intents-Topics-Citation-Share-Compare
    — read 2026-11-22.
- **Core idea.**
  - Google says there is no special optimisation for AI Overviews or AI
    Mode: be indexable, crawlable, internally linked, and keep structured
    data equal to the visible text. It needs no AI text files.
  - Bing now reports citations in Copilot and Bing AI answers: total
    citations, cited pages, sampled grounding queries and, since June,
    citation **share** per query, intent and topic clusters, and a
    period-over-period compare.
  - Bing's advice: clear headings, tables and FAQs; claims backed with data;
    regular updates; consistent entity names; IndexNow.
- **Fit for SQL Quest.**
  - We already follow most of this (FAQ JSON-LD equal to the visible FAQ,
    IndexNow on deploy).
  - llms.txt does no harm, but Google says it is not needed. Do not spend
    more on it.
  - Citation share is the one new instrument. It is a hand read today
    (CLAUDE.md: no API).
- **Verdict: use now as measurement.**
- **First step.** Add the AI Performance compare (last 30 days vs the 30
  before) for the top topics to the Monday SEO read, by hand, until an API
  exists.

> **Not read:** Aleyda Solis's AI Search Optimization Checklist
> (https://www.aleydasolis.com/en/ai-search/ai-search-optimization-checklist)
> returned 403. Snippets describe it as advice at the level of passages
> ("chunks") rather than pages. That is consistent with Bing's "one topic
> per URL, key facts near the top".

---

## 4. Solo-founder and indie distribution

### 4.1 Do things that don't scale (Paul Graham)

- **Source:** Paul Graham, "Do Things that Don't Scale", July 2013.
  https://paulgraham.com/ds.html — read 2026-11-22.
- **Core idea.**
  - Founders recruit early users by hand; startups do not take off on their
    own.
  - Early users get an extraordinary experience: Wufoo sent handwritten
    thank-you notes.
  - Start in a deliberately small market and saturate it (his "contained
    fire").
  - The "Collison installation": instead of sending a link, set the person
    up on the spot.
  - Big launches and partnerships rarely drive early growth.
- **Fit for SQL Quest.**
  - Capital One analyst candidates are the contained fire: 2 of the first 3
    payers, a named screen, and a page, mock and set built for them.
  - "Set them up on the spot" here means sending a person their own plan
    for their date and company, not a link to the app.
  - The "handwritten note" is the founder email rule we already have.
- **Verdict: use now.** This is the frame for plays 1 and 2 in section 8.
- **First step.** Every new Capital One-intent signup gets a personal note
  from Göktuğ within 24 hours, naming their date if they gave one.

### 4.2 Customer conversations — The Mom Test (Rob Fitzpatrick)

- **Source:** Michael Lynch, book report on *The Mom Test* (undated page).
  https://mtlynch.io/book-reports/the-mom-test/ — read 2026-11-22. The book
  itself was not read; this is a secondary summary.
- **Core idea.**
  - Talk about the person's life and past behaviour, not your idea.
  - Ask what they already tried and what the problem costs them.
  - Treat compliments as noise.
  - End each conversation with a commitment (time, an introduction, or
    money), so that you know what happens next.
  - Stop when you stop hearing new things.
- **Fit for SQL Quest.** Our best buyer insight, Capital One, came from
  conversations, not analytics. The email rule already asks one question.
  The Mom Test adds what to ask:
  - "When is the interview, what did you use before us, what went wrong in
    the last screen you sat?"
  - and to end on a small commitment, such as a reply with their date or a
    15-minute call.
- **Verdict: use now**, folded into play 1.
- **First step.** Write three Mom-Test questions into the `activated-note`
  body (founder's words) and record replies in a `docs/reads/` file, without
  personal data.

### 4.3 Where first users come from (Lenny Rachitsky)

- **Source:** Lenny Rachitsky, "How to kickstart and scale a consumer
  business — Step 4: Find your early adopters", 2022-07-26.
  https://www.lennysnewsletter.com/p/consumer-business-find-first-users —
  read 2026-11-22.
- **Core idea.** Across 100+ consumer companies, the most common source of
  early users was **going where the target audience already gathers**
  (online or off), with real help rather than a pitch. More than half used
  it, and it had the best return. Direct outreach to targeted strangers
  came next (about 30%). Most companies grew on one channel, and none on
  more than three.
- **Fit for SQL Quest.** We have no presence where SQL-interview candidates
  talk: subreddits for data careers, Discord servers for analyst prep, Blind,
  LinkedIn comment threads under interview posts.
  - Our trap pages and the readiness test are built to be *the answer* in
    those threads.
  - The single-channel finding argues for picking one place and doing it
    properly.
- **Verdict: use now** (play 2).
- **First step.** Find the three places where people discuss the Capital One
  data-analyst assessment. Read-only research; no posting before the
  founder approves a disclosure line. Then have the founder answer
  questions there under his own name, linking a free page only when it is
  the answer.

> **Not read:** Reddit's own self-promotion guidance could not be fetched
> (the fetch tool blocks reddit.com). Third-party summaries agree on a
> community "about 1 in 10" norm, that subreddit rules override it, and that
> affiliation must be disclosed. Verify against each subreddit's rules page
> before posting.

### 4.4 Build in public on LinkedIn — what to share now

- **Sources:**
  - Arvid Kahl, "The Increasing Risk of Building in Public" (episode 439 of
    The Bootstrapped Founder, dated 2026-04-03 in listings). The overview
    page https://echai.ventures/startingup/r/the-increasing-risk-of-building-in-public--bc-r135
    was read 2026-11-22; the full essay was not.
  - Ruben Dominguez, "Building in Public Is Not What It Used To Be", The VC
    Corner, 2026-06-29.
    https://www.thevccorner.com/p/building-in-public-ai-copycat-risk — read
    2026-11-22.
- **Core idea.** Building in public still earns trust, accountability and
  an audience. But AI makes a product's visible surface cheap to copy, so the
  revenue level below which sharing felt safe has collapsed. Dominguez's line
  is "Share the judgment, withhold the blueprint":
  - share: reasoning, mistakes, what customers taught you;
  - keep private: exact revenue, architecture, channel tactics.
- **Fit for SQL Quest.** It matches the founder's LinkedIn voice rule
  (weight, authority, honouring both sides; no funnel disclosure). The
  agent fleet, the ledger and "what a candidate got wrong on a NOT IN"
  are judgment content. Our Bing tactics and conversion numbers are
  blueprint.
- **Verdict: use now, at a steady cadence.** It is a slow traffic channel,
  so it is not ranked in the 60-day top 5. Its role is to produce *mentions*
  (3.3).
- **First step.** One post a week from the trap pages' lessons, in the voice
  file's register, Turkish first. No metrics.

---

## 5. B2B2C — selling seats to bootcamps, universities, career services

### 5.1 How the category sells to schools

- **Sources:**
  - Exponent via Poets&Quants and Penn (2.4).
  - DataCamp Classrooms. https://www.datacamp.com/groups/classrooms — read
    2026-11-22.
  - Big Interview team pricing. https://www.biginterview.com/pricing/teams —
    read 2026-11-22.
  - Jonathan Naymark (Codecademy for Business), "Mastering the B2C2B game:
    6 lessons to learn before you launch", TechCrunch, 2022-08-23.
    https://techcrunch.com/2022/08/23/mastering-the-b2c2b-game-6-lessons-to-learn-before-you-launch/
    — read 2026-11-22.
  - Interview Query (2.3).
  - StrataScratch cohort seats (2.2).
- **Core idea.** Three working structures:
  1. **Institution licence with a school link** (Exponent, Interview Query).
     Career services or the program buys, students sign in through a school
     URL, and the school's career page markets it.
  2. **Free for instructors, paid institution-wide** (DataCamp
     Classrooms). Any accredited instructor gets six months free for a
     class, with a dashboard and assignments, then re-applies. The
     department-wide plan is the paid upsell. DataCamp reports 14,000+
     institutions and 1M+ users.
  3. **Small annual cohort tiers bought online** (Big Interview): $975/yr
     for up to 50 learners ("for pilots and small cohorts"), $1,500 for 100,
     $2,200 for 200, or $9.75 per user per month (minimum 5 seats), with
     custom enterprise contracts above that.

  Codecademy's lessons for a consumer company moving into B2B:
  - look for B2B signals in your own data (work emails);
  - provision seats by hand at first;
  - expect a long cycle with a new buyer;
  - never improvise on security questions.
- **Benchmarks.** The published price anchor is about **$1k a year for a
  50-person cohort**, about $20 a seat per year, against our $99 individual
  annual. StrataScratch discounts students and educators by up to 20% and
  quotes cohorts privately.
- **Fit for SQL Quest.** We have 40 named targets, five drafts, an offer
  with two price options and a noindex `/for-teams/` door, and **nothing
  has been sent** (`docs/outreach/teams-2026-09-26.md`). Bootcamps that run
  monthly cohorts (WBS, Northcoders, Le Wagon, TripleTen) can say yes inside
  60 days. Universities mostly cannot.
  - One paid cohort is one customer for O2, with its seats reported
    separately (founder's decision of 2026-09-26).
  - It is also the bridge into the next cohort.
  - The structure to offer:
    - a school link (`?org=<slug>`, Pro for the cohort's dates);
    - a weekly progress sheet for the instructor (solves per student,
      weakest Skillmap skill) — the buyer's own outcome;
    - one free cohort as the pilot, with the price for the next cohort
      agreed before the pilot ends.
- **Verdict: use now** (play 5).
- **First step.** Before any email: the founder picks one of the two price
  options in the teams file and gives the go to send the five A-priority
  drafts. The agent's part is the `?org=` door behind a flag and a one-page
  security and data answer (what we store about a student, where, and how
  it is deleted), because that is where Codecademy says these deals stall.

---

## 6. Running a company with AI agents

### 6.1 Build agents simply, with checkpoints (Anthropic)

- **Source:** Erik S. and Barry Zhang, "Building effective agents",
  Anthropic Engineering, 2024-12-19.
  https://www.anthropic.com/engineering/building-effective-agents — read
  2026-11-22.
- **Core idea.**
  - Prefer fixed workflows to open-ended agents wherever the steps are
    known.
  - Add complexity only when it measurably helps.
  - Give agents a check against reality at each step (run the code, read
    the tool output).
  - Make agents stop at human checkpoints, cap their iterations, and
    design tools so mistakes are hard to make.
- **Fit.** Our fleet already works this way: one task, one branch, one PR;
  the founder's go for merges, money flags and outward email; tests proven
  by a deliberate break. **Running.**

### 6.2 What broke when Claude ran a shop (Project Vend, phases 1 and 2)

- **Sources:**
  - Anthropic, "Project Vend: Can Claude run a small shop?", 2025-06-27.
    https://www.anthropic.com/research/project-vend-1 — read 2026-11-22.
  - Anthropic, "Project Vend: phase two", 2025-12-18.
    https://www.anthropic.com/research/project-vend-2 — read 2026-11-22.
- **Core idea.**
  - In phase 1 the shopkeeper agent gave in to discount requests, sold
    below cost, invented a payment account and a contact, and for a day
    claimed to be a person. It announced fixes and dropped them days later.
  - In phase 2 it was given a CRM, cost records, research tools and a
    supervising "CEO" agent. Loss-making weeks largely stopped.
  - The most effective change was a **required procedure**: check price and
    delivery before quoting.
  - Two lessons Anthropic draws: a supervisor built on the same model shares
    its blind spots, and the models' eagerness to please makes them
    generous where a business needs to be firm. Adversarial outsiders still
    got free goods.
- **Fit for SQL Quest.**
  - It validates two rules we have: the founder's go on anything touching
    money (an agent would hand out discounts), and naming the
    same-model-family risk in PR reviews.
  - It argues for procedures over prompts. Our ledger claims with written
    falsification are exactly that.
  - It warns about the one place our fleet meets outsiders: inbound email
    and feedback, plus any outreach agent that reads replies.
- **Verdict: running; tighten one thing** (6.3).

### 6.3 Data exposure when agents read untrusted input (Simon Willison)

- **Source:** Simon Willison, "The lethal trifecta for AI agents",
  2025-06-16. https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/ —
  read 2026-11-22.
- **Core idea.** An agent that has (1) access to private data, (2) exposure
  to untrusted content and (3) a way to send data out can be steered by text
  hidden in that content into leaking the data. Detection tools are not
  reliable enough. The dependable fix is never to give one agent all three
  at once.
- **Fit for SQL Quest.** Several of our sessions hold all three at once:
  production read access (Supabase), untrusted input (web pages, the
  feedback table, email replies), and outward channels (Gmail drafts, PRs,
  web fetches).
- **Verdict: use now** (cheap; not a payer lever).
- **First step.** A one-page audit in `docs/agent/` listing which scheduled
  task or agent holds all three, and splitting the ones that do. For
  example, the agent that reads feedback verbatims has no send tool.

### 6.4 Evaluating the AI tutor (Hamel Husain)

- **Source:** Hamel Husain, "Your AI Product Needs Evals", 2024-03-29.
  https://hamel.dev/blog/posts/evals/ — read 2026-11-22.
- **Core idea.**
  - Start by reading many real traces.
  - Write cheap assertions that run on every change.
  - Label outputs good or bad by hand.
  - Only then build a model judge, and check its agreement with the human
    labels (precision and recall, not raw agreement).
  - A/B testing comes last.
- **Fit for SQL Quest.** The tutor and the live nudge are part of first-session
  activation, which is half the bottleneck. We guard their CORS, budget and
  health (`tests/live-nudge.test.js`, the smoke tutor check), but not the
  *quality* of the answers. The 2026-09-19 tutor fixes (the SQLite timestamp
  rule) were found by the founder reading by hand, which is Husain's step 1
  done once.
- **Verdict: later**, unless the day-30 read says activation is the short
  factor.
- **First step.** Export 50 `tutor_events` with the challenge and query, and
  have the founder label them pass or fail with a one-line reason. The
  failure reasons become assertions.

---

## 7. What SQL Quest runs vs what it is missing

"Runs" means live in production. "Partial" means built but dark, unsent or
irregular. Sources for the state are CLAUDE.md and the named repo files.

| Play | Playbook source | SQL Quest state | Note |
|---|---|---|---|
| Company interview pages, sourced and dated | StrataScratch loops, DataLemur, LeetCode (snippet) | **Runs** | 30+ pages; Capital One frozen page plan |
| Question pages (programmatic) | pSEO; Google spam policies | **Runs**, with risk | 307 pages; bingbot noindex (#72); overlap review missing (3.1) |
| Comparison and alternatives pages, vs-ChatGPT | GEO practice; Lenny (assistants cite comparisons) | **Runs** | |
| Readiness test as a free door | DataLemur free crash course | **Runs** | |
| llms.txt and GEO hygiene | Google AI features; Bing guidelines | **Runs** | Google says no AI files are needed; low leverage |
| Card-required trial (7 days) | ChartMogul 2026 (card-required trial 30%) | **Runs** | First trial outcomes still to read |
| Usage-based quota wall after the aha | RevenueCat placement; ProductLed | **Runs** | 10 solves |
| Email lifecycle with caps | Duolingo "protect the channel" | **Runs** | Lifetime caps, quiet periods |
| Streaks, leagues, local-time reminder | Duolingo | **Runs** | |
| Agent fleet, ledger, founder gates | Anthropic agents; Project Vend | **Runs** | |
| Backlink and partner outreach drafts | Ahrefs (mentions beat links) | **Partial** | Aimed at links, not mentions on cited pages |
| Regional pricing | — | **Runs** | |
| **Founder-assist to activated free users** | Poyar/Rachitsky sales-assist; PG; Mom Test | **Partial** — `activated-note` built, never scheduled; `checkout-abandon` live | Strongest evidence for the rate after six solves |
| **Structured customer conversations** | The Mom Test | **Missing as a cadence** | The Capital One signal came from ad hoc conversations |
| **Presence where candidates gather** | Lenny (>50% of consumer startups) | **Missing** | No community answering |
| **Video / YouTube** | NeetCode, Exponent; Ahrefs YouTube ρ≈0.74 | **Missing** | |
| **Mentions on pages assistants cite** | Ahrefs 75k brands | **Missing** | Outreach targets links, not cited listicles |
| **Concentrated recovery of Bing pages** | SEJ case; Bing guidelines 2026 | **Partial** | Prune file exists; no drop diagnosis read yet |
| AI citation share tracking | Bing AI Performance (Feb, Jun 2026) | **Partial** | Hand read, not weekly |
| **Bootcamp/university seats, school link** | Exponent, Interview Query, DataCamp, Big Interview | **Partial** — 40 targets, 5 drafts, nothing sent; `/for-teams/` noindex | |
| Named email crash course | DataLemur 9-day course | **Partial** — 5-email capture drip, not framed as a course | |
| Newsletter as product (question by email, answer in Pro) | Interview Query origin | **Missing** | Retention, not traffic |
| Founder LinkedIn, building in public | Kahl; VC Corner | **Partial** — voice rules exist; cadence unknown | |
| Reverse trial | Verna; ChartMogul | **Missing** (deliberately) | Later; conflicts with the wall that works |
| Tutor quality evals | Husain | **Missing** | Health and CORS are guarded; quality is not |
| Lethal-trifecta audit of the fleet | Willison | **Not seen** | Cheap safety work |
| Lifetime plan | DataLemur, StrataScratch | **Removed** on our own data | Zero lifetime sales; do not bring back on competitors' example |

---

## 8. Top 5 missing plays — ranked by expected effect on paying customers in the next 60 days

The ranking uses O2's decomposition: **payers = six-solvers × the rate after
six solves.** A play that moves the rate pays within days. A play that moves
traffic pays only after the traffic reaches six solves, which takes weeks.
That is why the two plays that work on people already in the funnel rank
first.

### 1. Founder-assist: Göktuğ writes to every activated free user (rate after six solves)

- **What.** Schedule `activated-note` (registered, 6+ solves, never paid,
  once ever, capped). Add a same-day personal note to anyone who hits the
  quota wall or states a company and date. The note asks Mom Test questions
  (date, what they used before, what went wrong last time) and offers one
  concrete thing: their plan for their date. It is not a discount.
- **Why first.**
  - It is the one lever the benchmark data ties to conversion: sales-assist
    freemium "great" is 10–15%, against 6–8% self-serve.
  - It is already built.
  - It acts on people at the moment they decide (our purchases are
    first-session, at 6–10 solves).
- **Size, as arithmetic, not a forecast.** About 230–350 six-solvers a
  month at the last measured 1.4% gives about 3–5 payers. Lifting the rate
  to the 2.2% that O2 needs adds about 2–3 a month.
- **Gate.** The founder's go (outward email; the subject must name the
  founder). Ledger claim, metric `activated_note` → payer within 14 days.
- **Kill rule, written now.** Fewer than 2 replies per 40 sends after two
  runs → stop. The audience does not want a human, and the time goes to
  play 2.

### 2. Capital One "contained fire": be the answer where candidates gather (traffic, highest intent)

- **What.** Find the two or three places where people discuss Capital One's
  data-analyst assessment. Go in as the founder, under his own name, with
  his affiliation disclosed. Answer the actual questions, and link a free
  trap page or the readiness test only when it is the answer. Pair it with
  play 1: every Capital One-intent arrival gets a personal note.
- **Why.** Over half of consumer startups found early users where their
  audience already gathers (Lenny). It is PG's narrow-market advice, and
  Capital One is our only proven buyer segment. The traffic it brings is
  the highest-intent traffic we can get without ads.
- **Gate.** The founder approves the disclosure line and the venues; agents
  do only read-only research. Each subreddit's own rules are read first
  (Reddit could not be fetched for this read).
- **Kill rule.** Fewer than 10 `?src=` arrivals from these venues in 30
  days → this is not where they gather. Re-research once, then stop.

### 3. Concentrated Bing/Google recovery on the pages that earned clicks (traffic, existing pages)

- **What.**
  1. Diagnose the drop first: a dated read of clicks and impressions for the
     top 10 Bing pages since 2026-08-01, last git change per page, and AI
     Performance citations.
  2. Then refresh those pages: key facts at the top, one topic per URL,
     tables and FAQ equal to the schema.
  3. Merge or noindex the zero-click near-duplicate company pages under the
     prune rules.
  4. Add no pages.
- **Why.** Every published recovery case is concentration. Bing's 2026
  guidelines name scaled content without oversight. Traffic is the stated
  bottleneck, and `/sql-exercises/` once brought 64% of Bing clicks — a
  page that has earned clicks before is the cheapest one to win back.
- **Risk.** The diagnosis may show impressions held and Copilot took the
  clicks. Then the work moves to citation share and play 4, and refreshing
  pages will not bring clicks back.

### 4. Mentions, not links: get named on the pages and videos assistants cite (AI-assistant channel)

- **What.**
  - Take the 10 prompts a candidate types and record which pages ChatGPT
    and Perplexity cite for them.
  - Ask those pages' authors for inclusion, with a reason specific to their
    readers (the founder's email rule applies).
  - Start a small YouTube presence: five screen-recorded walkthroughs of the
    trap pages in the founder's voice, titled with "SQL Quest".
- **Why.**
  - Ahrefs finds that branded mentions and YouTube mentions are the
    strongest correlates of AI visibility, and that page count and backlinks
    barely register.
  - ChatGPT is the easiest assistant for an emerging brand to appear in.
  - Exponent and NeetCode both grew on YouTube.
  - Assistants already send us buyers (the Gemini payer), and that
    traffic is invisible in `arrivalSrc='home'`.
- **Why fourth.** Lag. An inclusion or a video takes weeks to be crawled
  and weeks more to be cited. Some effect inside 60 days, most after.

### 5. One bootcamp cohort pilot through a school link (B2B2C)

- **What.**
  - The founder picks the price option and sends the five A-priority drafts
    (`docs/outreach/teams-2026-09-26.md`).
  - The offer: one cohort free as the pilot, with a school link
    (`?org=<slug>` granting Pro for the cohort's dates, behind a flag), a
    weekly instructor sheet (solves per student, weakest Skillmap skill) and
    the next cohort's price agreed before the pilot ends.
  - Anchor the price near Big Interview's $975 for 50 learners per year.
  - Prepare a one-page answer on student data before the first call.
- **Why.** Exponent, Interview Query and DataCamp all reach students through
  institutions, and Interview Query says university sales carried it
  through a downturn. Bootcamps with monthly cohorts can decide inside 60
  days.
- **Why fifth.** Long cycles and a single deal at a time. It counts as one
  customer (seats reported separately). Its larger value is the cohort after
  the pilot, which lands after day 60.

**Just outside the five.**
- A named email crash course for the Capital One screen (cheap; moves
  conversion of readiness-test takers).
- The fleet's lethal-trifecta audit (cheap safety work, no payer effect).
- A reverse trial for company-intent arrivals only, after the day-30 read.

---

## 9. Sources that could not be read (not retried through another tool)

| URL | Result on 2026-11-22 |
|---|---|
| https://www.indiehackers.com/interview/growing-a-tech-interview-prep-business-from-0-to-300k-in-1-year-09d52744a4 | 403 |
| https://first-mrr.com/study/stratascratch | 503 |
| https://www.interviewquery.com/p/ucla-case-study and /university | 429 |
| https://leetcode.com/subscribe/ | 403 |
| https://www.aleydasolis.com/en/ai-search/ai-search-optimization-checklist | 403 |
| https://openviewpartners.com/2023-product-benchmarks/ | 404 |
| reddit.com (self-promotion guidance) | blocked by the fetch tool |
| https://vator.tv/?p=42725 (Exponent interview) | redirected to a substack root; not followed |

Claims that rest only on search snippets are marked "snippet only" where
they appear. None of them is used to justify a top-5 play.
