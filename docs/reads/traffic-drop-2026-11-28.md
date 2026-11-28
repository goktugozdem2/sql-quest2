# Why did traffic halve? — C8, 2026-11-28 (Sat)

The orchestrator asked one question today. Two reads agree on the size of the
drop. Human first app opens were 621 in the last 30 days against 1,117 a
month in the 60 days before (`docs/reads/segment-profiles-2026-11-28.md`).
People active in 30 days went from 1,423 to 735 (PR #458's usage-line read).
This read splits that drop by channel, week by week from 2026-09-01, checks
the obvious causes against their dates, and separates the real drop from
measurement.

Read-only: Supabase MCP `execute_sql` (`pro_events`, `gsc_daily`,
`bing_site_daily`, `bing_stats`, `bing_crawl_daily`), and `git log` on
origin/main. Counts only.

## The answer

1. **The drop is real, not a filter effect.** People who ran a query are
   the measure no bot fakes, and they halved: 491 in the four weeks from
   09-07 against 245 in the four weeks from 10-26. That is a 50% fall with
   **no filter at all**; the raw count is 492 → 249.
   - With the old (stamp-era) filter, first opens still fell 40% on the
     orchestrator's windows (2,318 → 1,397 a month). On today's filter they
     fell 44% (1,112 → 617).
   - The 11-xx rules (`app1lang`, `langs2`, `utc_landing`, `google_ua`,
     `1024x1024`) took at most about 13 humans a month out of the last 30
     days. That is the runners they caught (about 6) at the human run rate of
     45%, and it is **≤ 3% of the drop**.
   - The only measurement effect of any size runs the other way. September's
     "no source" openers ran a query at 22%, against 45–49% for everyone
     else, so about 110 of them per four weeks look like crawler residue that
     the filter still lets through. Taking them out of the baseline makes the
     opener drop 50% instead of 54%. It does not change the story.
   - **Real: about 90% or more. Measurement: under 10%.**
2. **Most of the drop is Bing and the search engines built on it.** That
   means Bing itself plus Yahoo, DuckDuckGo, Ecosia and Copilot.
   - Bing-family first opens fell **515 → 111** (four weeks against four
     weeks). That is 60% of the opener drop, **75% of the runner drop**
     (240 → 56) and 68% of the six-solver drop (110 → 16).
   - Nearly all of it came through one door: `/sql-exercises/`. Its
     Bing-family first opens fell 425 → 67. Bing alone went 318 → 53, Yahoo
     78 → 9 and the other engines 29 → 5.
   - Cause: Bing lost rank across the site from late September, with a step
     on 10-17 (`docs/reads/bing-drop-2026-11-22.md`). "sql practice" fell
     from 2,188 impressions to 70 (position 8 → 10, off page one), "sql
     practice questions" from position 4.3 to 7.0, and "sql exercises" from
     3 to 7.
   - Google moved the other way on the same page (`/sql-exercises/` Google
     clicks 31 → 56), so the page itself did not get worse.
3. **Second: the homepage lost Google brand searches.**
   - Homepage-door first opens fell 196 → 31 (25% of the drop). Google → home
     alone went 102 → 15.
   - The homepage's rank held: "sql quest" sat at position 1.4–1.8 and
     "sqlquest" at 1.3. **Fewer people searched for us by name.** Brand-query
     clicks ran about 50 a week (08-31 → 09-21), stepped down in the week of
     09-28, and have run about 13 a week since 10-12.
   - These were new browsers, not people coming back: 10 of 115 carried the
     landing's `returning` flag, and 40% of them solved.
   - This is the footprint of word of mouth and of AI assistants naming us
     (CLAUDE.md: an assistant hides its referral as `home`). **No cause is
     shown.** No repo change lines up with 09-28, and there is no prior-year
     data to test a September term-start bump.
4. **Third: Google lost the comparison page.**
   - `/best-sql-practice-sites/` fell from position 6.5 to 8.3 on Google.
     Its clicks went 87 → 25 (four weeks against four weeks).
   - The comparison/learn door lost 75 first opens (11% of the drop). Google
     alone went 71 → 18.
5. **Company pages, topic and question pages, blog, readiness, AI and email
   did not fall.**
   - Company-door first opens: 163 → 144. Google → company held at 110 → 110.
   - Topic pages: 94 → 113.
   - AI (`ai:*`): 54 → 49.
   - Google as a whole is flat: about 700 clicks a month (Sep 706, Oct 667,
     Nov 611 in 26 days). Its losses on the homepage and the comparison page
     were offset by topic pages, Wise, and the Capital One CodeSignal blog
     post (10 → 43 clicks).

## 1. Human first opens by source, per week

Human = Query 1's `person` rule in `scripts/scorecard-weekly.sql` (main,
2026-11-28). Source = the `landingSrc` of the person's first `app_opened`,
which exists from 2026-09-06, so the week of 08-31 is all "none". Weeks start
Monday (UTC). **11-23 is a partial week: 6 days, to 11-28 ~12:00 UTC.**

| Source | 08-31 | 09-07 | 09-14 | 09-21 | 09-28 | 10-05 | 10-12 | 10-19 | 10-26 | 11-02 | 11-09 | 11-16 | 11-23* |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Google | – | 98 | 101 | 116 | 69 | 95 | 64 | 78 | 73 | 58 | 72 | 94 | 78 |
| Bing | – | 51 | 106 | 132 | 109 | 75 | 67 | 44 | 35 | 26 | 20 | 14 | 9 |
| referral (mostly Yahoo, which is Bing) | 1 | 37 | 27 | 37 | 28 | 21 | 13 | 9 | 5 | 11 | 11 | 10 | 8 |
| other search (DDG, Brave, …) | – | 7 | 8 | 15 | 5 | 7 | 5 | 11 | 5 | 1 | 0 | 1 | 0 |
| AI (`ai:*`, Copilot, …) | – | 8 | 10 | 18 | 18 | 5 | 4 | 7 | 14 | 16 | 12 | 7 | 12 |
| email (`utm:email`) | 2 | 4 | 4 | 2 | 1 | 1 | 2 | 2 | 3 | 2 | 1 | 7 | 6 |
| social | – | 2 | 0 | 2 | 1 | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| none / direct | 227 | 64 | 45 | 67 | 44 | 101 | 28 | 20 | 14 | 17 | 22 | 15 | 25 |
| **all** | **230** | **271** | **301** | **389** | **275** | **306** | **183** | **171** | **150** | **131** | **138** | **148** | **138** |
| of them ran a query | 90 | 102 | 107 | 163 | 119 | 110 | 86 | 75 | 67 | 54 | 58 | 66 | 68 |

The step is between the week of 10-05 (306) and the week of 10-12 (183).
After that it slides to about 140 a week.

### The same people by door (`arrivalSrc` of the first open)

| Door | 08-31 | 09-07 | 09-14 | 09-21 | 09-28 | 10-05 | 10-12 | 10-19 | 10-26 | 11-02 | 11-09 | 11-16 | 11-23* |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/sql-exercises/` | 78 | 80 | 130 | 171 | 124 | 113 | 89 | 62 | 39 | 43 | 35 | 24 | 14 |
| homepage | 76 | 82 | 47 | 47 | 20 | 11 | 12 | 12 | 6 | 6 | 13 | 6 | 20 |
| company pages | 33 | 35 | 40 | 45 | 43 | 46 | 21 | 30 | 43 | 30 | 30 | 41 | 29 |
| topic pages (`challenges-*`) | 0 | 12 | 14 | 32 | 36 | 63 | 16 | 24 | 35 | 19 | 26 | 33 | 25 |
| question pages | 0 | 0 | 4 | 9 | 6 | 22 | 4 | 5 | 8 | 2 | 4 | 5 | 8 |
| comparison / learn (`best-`, `vs-`, `learn-`, …) | 13 | 28 | 27 | 39 | 20 | 17 | 24 | 16 | 6 | 13 | 7 | 13 | 12 |
| trap pages and tools (`pattern-`, `sql-*`) | 6 | 5 | 6 | 5 | 8 | 10 | 5 | 6 | 2 | 7 | 7 | 5 | 6 |
| blog | 2 | 3 | 1 | 2 | 1 | 8 | 3 | 0 | 0 | 0 | 1 | 2 | 1 |
| readiness test | 0 | 0 | 0 | 1 | 0 | 1 | 0 | 0 | 1 | 0 | 0 | 1 | 0 |
| email | 2 | 4 | 4 | 2 | 1 | 1 | 2 | 2 | 3 | 2 | 1 | 7 | 6 |
| no door | 19 | 21 | 28 | 31 | 15 | 13 | 7 | 11 | 7 | 9 | 12 | 9 | 11 |
| other | 1 | 1 | 0 | 5 | 1 | 1 | 0 | 3 | 0 | 0 | 2 | 2 | 6 |

### Share of the drop: four weeks from 09-07 against four weeks from 10-26

The drop is 1,236 → 567, which is −669.

| Channel | Before | After | Change | Share of the drop |
|---|---|---|---|---|
| **Bing family** (Bing, Yahoo, DDG, Ecosia, Copilot) | 515 | 111 | −404 | **60%** |
| none / direct | 221 | 68 | −153 | 23% |
| Google | 384 | 297 | −87 | 13% |
| other search (Brave, …) | 35 | 7 | −28 | 4% |
| referral (sites, after Yahoo is taken out) | 29 | 22 | −7 | 1% |
| AI | 41 | 49 | +8 | — |
| email | 11 | 13 | +2 | — |

Quality of the people lost (ran a query / solved six or more):
- Bing family: 240 / 110 before, 56 / 16 after.
- Google: 159 / 61 before, 119 / 22 after.
- none: 49 / 15 before, 33 / 12 after.
- The six-solver column after 10-26 is a floor, since those people have had
  less time to reach six.
- **The Bing people were the best-converting traffic we had.**

| Door | Before | After | Change | Share |
|---|---|---|---|---|
| `/sql-exercises/` | 505 | 141 | −364 | **54%** |
| homepage | 196 | 31 | −165 | **25%** |
| comparison / learn | 114 | 39 | −75 | 11% |
| no door | 95 | 37 | −58 | 9% |
| company pages | 163 | 144 | −19 | 3% |
| topic pages | 94 | 113 | +19 | — |
| question pages | 19 | 19 | 0 | — |
| trap pages, blog, readiness, email, other | 50 | 43 | −7 | 1% |

Door × source behind the three big doors (four weeks against four weeks):
- `/sql-exercises/`: Bing 318 → 53, Yahoo 78 → 9, other search 29 → 5,
  none 38 → 18, Google 29 → 37 (up).
- Homepage: Google 102 → 15, none 34 → 4, AI 21 → 6, Bing 19 → 3,
  Brave 10 → 0.
- Comparison / learn: Google 71 → 18, AI 12 → 2, none 18 → 8, Bing 12 → 9.
- Company pages: Google 110 → 110, none 30 → 11, Bing 14 → 11, AI 4 → 8.

On the orchestrator's windows (last 30 days against the 60 before, given a
month: 1,112 → 617, −495):
- Bing −222 (45%);
- none −222 (45%; inflated, because the 60-day window opens before
  `landingSrc` existed);
- referral (Yahoo) −43;
- other search −28;
- Google +1, AI +12, email +8.

## 2. Human landing people, per week

These are people with a `landing_view` on a static page. "Opened" means they
also had an `app_opened` in the same week. The homepage `landing_view` was
broken from 08-05 to 09-05 (CLAUDE.md), so the homepage row starts at 09-07.

| Source | 09-07 | 09-14 | 09-21 | 09-28 | 10-05 | 10-12 | 10-19 | 10-26 | 11-02 | 11-09 | 11-16 | 11-23* |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Google | 193 | 186 | 238 | 154 | 215 | 173 | 184 | 179 | 165 | 193 | 220 | 191 |
| Bing | 77 | 144 | 206 | 168 | 145 | 100 | 79 | 63 | 47 | 34 | 30 | 20 |
| AI | 24 | 26 | 33 | 29 | 16 | 9 | 19 | 22 | 33 | 28 | 20 | 18 |
| referral | 55 | 52 | 65 | 60 | 49 | 38 | 25 | 24 | 22 | 16 | 21 | 15 |
| none | 544 | 357 | 141 | 131 | 224 | 445 | 218 | 166 | 196 | 204 | 234 | 176 |
| **all** | **908** | **777** | **713** | **560** | **665** | **776** | **545** | **464** | **470** | **480** | **529** | **423** |

| Page cluster (people / opened) | 09-07 | 09-21 | 10-05 | 10-19 | 11-02 | 11-16 | 11-23* |
|---|---|---|---|---|---|---|---|
| `/sql-exercises/` | 122 / 92 | 297 / 205 | 200 / 122 | 122 / 75 | 76 / 47 | 48 / 30 | 37 / 25 |
| homepage | 191 / 102 | 166 / 97 | 88 / 43 | 81 / 30 | 62 / 26 | 71 / 30 | 78 / 36 |
| company pages | 109 / 37 | 97 / 51 | 88 / 31 | 76 / 33 | 85 / 39 | 136 / 44 | 85 / 36 |
| topic pages | 30 / 12 | 63 / 43 | 47 / 34 | 42 / 30 | 45 / 23 | 64 / 40 | 49 / 27 |
| comparison / learn | 117 / 41 | 106 / 54 | 82 / 21 | 88 / 22 | 84 / 17 | 73 / 20 | 47 / 17 |
| question pages | 315 / 0 | 38 / 15 | 132 / 15 | 90 / 8 | 71 / 8 | 77 / 7 | 61 / 11 |
| blog | 34 / 4 | 31 / 3 | 40 / 5 | 39 / 3 | 44 / 4 | 43 / 5 | 39 / 3 |
| readiness | 6 / 0 | 10 / 3 | 20 / 4 | 20 / 0 | 6 / 0 | 21 / 6 | 32 / 3 |

- Google landings are flat (165–238 a week). The fall is in Bing landings
  (206 → 20) and in the homepage (about 170 → 70).
- The homepage still sends about 45% of its landers into the app (53% in
  September). Fewer people reach it; the page did not stop working.
- The "none" landing rows hold crawler residue the filter does not catch:
  question pages 315 (09-07), 251 (09-14) and 317 (10-12) with 0–6 openers.
  Never read "none: landed on a page" as people in a week like that
  (papercut).

## 3. The console side

**Google (`gsc_daily` page slice, clicks a week; 11-23 runs to the table's
last day):**

| Cluster | 08-31 | 09-07 | 09-14 | 09-21 | 09-28 | 10-05 | 10-12 | 10-19 | 10-26 | 11-02 | 11-09 | 11-16 | 11-23* |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| homepage | 55 | 60 | 60 | 66 | 25 | 33 | 15 | 16 | 16 | 16 | 23 | 18 | 9 |
| comparison / learn | 20 | 37 | 30 | 40 | 20 | 20 | 23 | 20 | 10 | 14 | 19 | 17 | 21 |
| company | 39 | 33 | 44 | 44 | 33 | 42 | 36 | 47 | 51 | 31 | 38 | 52 | 27 |
| `/sql-exercises/` | 4 | 2 | 11 | 7 | 11 | 20 | 18 | 22 | 15 | 17 | 13 | 11 | 7 |
| topic | 1 | 7 | 11 | 17 | 13 | 15 | 19 | 18 | 29 | 18 | 24 | 32 | 15 |
| blog | 11 | 14 | 12 | 14 | 12 | 21 | 18 | 12 | 18 | 10 | 34 | 27 | 17 |
| **all pages** | **132** | **155** | **181** | **211** | **126** | **163** | **141** | **153** | **156** | **125** | **174** | **177** | **116** |

Brand queries (`sql quest`, `sqlquest`, `quest sql`), clicks a week:
- 30 → 54 (08-03 → 09-07);
- 51 (09-21), 18 (09-28), 28, 13, 12, 8, 14, 20, 16, 6 (to 11-23).

Positions for the pages that lost the most Google clicks (four weeks from
09-07 against four weeks from 10-26):
- Homepage: page-level position 3.2 → 8.0, but the brand queries held 1.3–1.8
  while their impressions fell 221 → 69. The lower page position is a
  different query mix, not a rank loss.
- `/best-sql-practice-sites/`: position 6.5 → 8.3, clicks 87 → 25.
- Revolut: position 6.2 → 4.5, clicks 48 → 35. Snowflake: 6.0 → 6.0,
  clicks 22 → 10.
- Gainers: Wise (28 → 58), the Capital One CodeSignal post (10 → 43),
  `/sql-exercises/` (31 → 56), `/challenges/cte/` (6 → 24).

**Bing:**
- `bing_site_daily` clicks a week: 121, 136, 214, **292** (09-21), 230, 196,
  139, 91, 76, 55, 35, 53, 11 (partial).
- `/sql-exercises/` (`bing_stats` page slice, weeks ending): 227 clicks at
  3,686 impressions (10-02) → **13 at 446** (11-20). Position 6 → 9.
- Its head queries (the three weeks to 10-08 against the three weeks to
  11-26), as impressions and position:
  - "sql practice": 2,188 → 70 impressions, position 8 → 10;
  - "sql practice questions": 507 → 222, position 4.3 → 7.0;
  - "sql exercises": 169 → 52, position 3 → 7;
  - "sql practice exercises": 186 → 101, position 2 → 4.3.

## 4. The suspected causes, with dates

| Cause | Date | Lines up? | Verdict |
|---|---|---|---|
| #72: bingbot noindex on the 307 `/questions/` pages | 2026-11-20 | No. Bing fell from 10-02, and the step was 10-17. Question pages drew 1 Bing impression ever, and the question door is flat (19 → 19). | **Not a cause.** |
| #74 titles (4 pages), #65 `/sql-exercises/` title | 11-21, 11-20 | No. Both came after the fall. `/sql-exercises/` Bing kept sliding (23 → 13) in the buckets around them; #65 reads on 12-12. | **Not a cause.** Too early to judge either way. |
| SEO prune (`src/data/seo-prune.json`) | — | The `noindex` list is empty; nothing was pruned. | **Not a cause.** |
| robots.txt `Disallow: /app/?` (09-23) → Bing indexes the blocked app URLs | 09-23 | Yes. Bing clicks peaked the week it shipped. `blocked_by_robots` went 0 → 853 and `in_index` 163 → 856, both rising every week (C1, `bing-drop-2026-11-22.md`). #138 (11-22) let bingbot fetch the app URLs. `blocked_by_robots` held at 853 on 11-25 and 11-26, the first two days without a rise. | **Leading hypothesis for Bing, not confirmed.** The founder's Site Explorer check is still open. |
| The 09-30 `/sql-exercises/` title (86 → 67 characters) and the five worked solutions | 09-30 | Partly. Bing would have recrawled it before the 10-17 step. But untouched blog and tool pages fell on Bing in the same weeks, and the same version rose on Google. | Possible for "sql practice" alone. Not the site-wide fall. |
| A Bing-wide change | October | No public confirmation. Google is flat, which rules out a fall in demand for the topic. | Not shown, not excluded. |
| Ranking changes on Google | — | Homepage brand position steady (demand, not rank). `/best-sql-practice-sites/` 6.5 → 8.3. | Real, small: about −13 first opens a week. |
| Seasonality | — | GSC history starts 2026-03, so there is no prior-year week to compare. Google clicks are flat Sep → Nov, and a seasonal fall would show there too. | Not seasonality for Bing. A September term-start bump in brand searches cannot be tested. |
| Measurement: new human-filter rules | 11-23 → 11-27 | The rules catch about 0.3% runners. In the last 30 days they took about 6 runners, so about 13 people. September's "none" openers ran at 22%, against about 45%. Raw runners with no filter fell the same 50%. | **Under 10% of the drop. The drop is real.** |

## 5. Three actions to win traffic back

All three fit the 11-28 decision that company pages come first until
2027-01-15. Only the first is content; the second is technical SEO and a
founder check; the third is one page.

1. **Company pages: depth, links and indexing.** Owners: C5 / R1 for depth
   (Amazon / Stripe / Meta first), C1 for links, S1 for indexing.
   - Company pages are the one door that held on Google: about 36 first
     opens a week (43, 30, 30, 41). The 11-28 decision targets +20% by
     01-15, which is **about +7 first opens a week**.
   - Link to the money pages from the Google pages that are gaining: the
     Capital One CodeSignal post, `/challenges/cte/`,
     `/challenges/aggregation/`, `/challenges/subqueries/` and Wise.
   - Request indexing for PayPal and Coinbase when their cooldowns end
     (from 12-07).
   - **How we'd know in 2 weeks:**
     - GSC impressions on the company cluster at or above 540 a week (the
       week of 11-16) on the weeks of 11-30 and 12-07;
     - the four new pages (PayPal, Coinbase, Monzo, Chime) showing
       impressions;
     - company-door first opens only as a check. At about 36 a week, ±12,
       two weeks cannot show +7.
2. **Bing: settle the app-URL hypothesis and let #138 work.** Owners: S1,
   with C1 for any follow-up and the founder for Bing Webmaster Tools.
   - This is the biggest block lost. `/sql-exercises/` Bing-family first
     opens ran about 106 a week in September and are about 17 now. Getting
     back half of that is **+40 first opens a week**, but only if the
     hypothesis is right. Realistic: +15–25 a week within 4–8 weeks.
   - Do not touch `/sql-exercises/`'s title or copy before #65's 12-12 read.
   - **How we'd know in 2 weeks:**
     - `blocked_by_robots` falls below 800, from 853 and flat since 11-25;
     - the `/sql-exercises/` Bing bucket shows more than 800 impressions (446
       in the bucket to 11-20);
     - if `blocked_by_robots` is still rising on 12-12, the hypothesis is
       wrong.
3. **Brand and AI: re-run the assistant panel and refresh
   `/best-sql-practice-sites/`.** Owner: G1 (GEO, weekly), with C2 for the
   page.
   - Brand searches fell from about 50 clicks a week to about 13, and
     Google → homepage first opens from about 26 a week to about 4. The
     comparison page that assistants cite lost 1.8 positions on Google.
   - Expected: **+5–10 first opens a week** if the page regains position 6.5
     and assistants keep naming us.
   - This is one page, after the week's company work, so it does not break
     the company-first priority.
   - **How we'd know in 2 weeks:**
     - GSC position for `/best-sql-practice-sites/` at 7 or better;
     - brand-query impressions back above 50 a week (31–61 now);
     - the G1 panel naming SQL Quest at least as often as in its last run.

## 6. Today's indexing list (for the founder or the laptop session)

These come from `node scripts/index-queue.mjs --engine gsc --live` and
`--engine bing --live`, run 2026-11-28 about 12:00 UTC. The queue had no
index status, so its "already indexed after lastmod" step was skipped.

- **GSC: 0 now.** The last batch (8 URLs) went in at 11-27 23:41–23:48 UTC,
  and the 24-hour rule holds until **11-28 23:48 UTC**.
- After that, 1 URL: `https://sqlquest.app/sql-for-the-ai-era/` (T4). The
  live check passed.
- Everything else is in cooldown (31) or held as a site-wide change only
  (409).
- PayPal and Coinbase were requested 11-23 and 11-27, so their 14-day
  cooldowns end 12-07 and 12-11.
- **Bing by hand: 0.** No T1 page changed today.
- Requesting indexing does not fix a rank. None of the three actions above
  needs an extra request today.

## FOUNDER

- **Bing Webmaster Tools → Site Explorer → the `app` folder:** note the
  "Blocked by robots.txt" and "Indexed" counts. This is the one check that
  settles action 2 (`bing-drop-2026-11-22.md` section 5, still not done).
- GSC after 23:48 UTC tonight: `/sql-for-the-ai-era/`.

## Method notes

- **Person:** `coalesce(metadata.aid, username)`, metadata read as
  `(metadata #>> '{}')::jsonb`.
- **Human:** the `person` block of `scripts/scorecard-weekly.sql` as on
  main, unchanged.
- **"Old filter":** internal, founder, bot stamp, the viewport list and
  `ref_spam` only. It keeps every rule added on 11-23 → 11-27 (`app1lang`,
  `topic1lang`, `prestamp_fp`, `utc1280`, `cn_app`, `utc_landing`,
  `cn_reader`, `google_ua`, `langs2`) as human.
- **First open:** the person's first `app_opened` ever. Source = its
  `landingSrc`. Door = its `arrivalSrc`, grouped as in the segment-profiles
  read, with question, topic and comparison pages split out.
- **Ran:** any `challenge_first_run` or `challenge_solved`, at any time.
- **GSC:** page slice (`query IS NULL`), or the query slice for the brand
  rows. Never summed across slices.
- **Bing:** `bing_stats` buckets are the seven days ending on their date.
