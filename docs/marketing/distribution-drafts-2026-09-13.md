# Distribution drafts: Reddit (P2.16) and the LinkedIn loop (P2.17)

**Written 2026-09-13. Drafts only.** Nothing here has been posted, and nothing
here will be posted unless Göktuğ posts it. Every post and comment below
is outward-facing and goes out under the founder's name, so the founder reads each one before it
goes anywhere and changes anything that does not sound right.

**Facts these drafts use, and nothing else:** 299 challenges; 226 free (every
Easy and Medium plus 6 Hard previews; the bank is 94 Easy / 126 Medium / 79
Hard); 30 company pages; the 10-question readiness test with no signup at
`/sql-interview-readiness-test/`; question pages at `/questions/<slug>/`; topic
pages at `/challenges/<topic>/`; Pro at $29/mo or $99/yr. There are no user
counts, no testimonials and no outcomes in these drafts. Do not add any.

**Every technical claim was checked against the live question page it links
to** (`public/questions/<slug>/index.html`, built 2026-09-13). The claims that
come from the company pages come from `src/data/company-interviews.js` and the
research notes in `docs/reads/company-research-2026-09-13.md`. The founder
should read those notes before signing Reddit post 6 or LinkedIn
post 2.

---

## Attribution: read this before you add a single link

Use **`?utm_source=<channel>-<slug>`**, not `?src=`, on every link to a static
page (question pages, topic pages, the readiness test). This was checked in
`src/track.js`, and the reason is specific:

- Every `landing_view` row carries `utm`, which is **this view's
  `utm_source`**, cleaned. `src` does not reach that field. On a static page
  `src` is only a fallback for the first-touch `landingSrc`, and it is only read
  when `utm_source` is missing.
- `landingSrc` is **first touch**. Someone who has visited before keeps their
  old label, so a per-post read must use the row's `utm` field, not
  `landingSrc`.
- In the app, `?src=` is the `arrivalSrc` door series that the open ledger
  claims read. None of these drafts link into `/app/`, so none of them touch it.
- Rules for the value: lowercase, no dots, 40 characters or fewer. It is cut at
  the first `/ ? #` and anything that isn't `[a-z0-9._-]` becomes `-`. A bare
  `utm_source=linkedin` works, but the slug is lost, so always add the slug.
- The readiness test hands off to `/app/?src=readiness`. A person who clicks
  from a post and then solves in the app can be joined through `aid`. The door
  label on their app events will say `readiness`, not LinkedIn.

The read, per post (people, not events; metadata is double-encoded):

```sql
select ((metadata #>> '{}')::jsonb)->>'utm'                        as post,
       count(distinct ((metadata #>> '{}')::jsonb)->>'aid')       as people,
       count(*)                                                  as views
from pro_events
where event = 'landing_view'
  and reason = 'landing'
  and ((metadata #>> '{}')::jsonb)->>'utm' ~ '^(linkedin|reddit)-'
group by 1
order by 1;
```

**Flag:** `docs/agent/metrics.md` has no metric for per-post social clicks.
Until one is added, with a kill criterion written before the first post goes
out, this read is exploratory. It cannot support a ledger claim, because the
verdict would be UNDEFINED.

---

## Reddit (P2.16)

### Rules first, and what could not be checked

**I could not verify any subreddit's current rules.** Both `www.reddit.com` and
`old.reddit.com` refused the fetch from this machine on 2026-09-13. Everything
in the table below is how these communities have *typically* worked, going by
general knowledge up to my training cutoff. It is not a reading of the current
sidebar. **Before posting or commenting anywhere, the founder opens that
subreddit's sidebar and its pinned rules post and reads them in full.** Where
the sidebar disagrees with this table, the sidebar is right.

| Subreddit | Fit | Typical self-promotion norm (unverified, check the sidebar) |
|---|---|---|
| r/SQL | Best fit for the technical posts (NOT IN, frames, top-N) | Technical questions and explanations are welcome. Posts that exist to advertise a product usually get removed. Links to your own tool are sometimes tolerated inside a genuinely useful answer, if you disclose. Some flair may be required. |
| r/learnSQL | Beginner-to-intermediate explanations, "how do I practice" threads | Usually more open to resources than r/SQL. A post that is only a link still reads as an ad. |
| r/dataanalysis | Conditional aggregation, date bucketing, running totals framed as analyst work | Usually cautious about promotion. Career and interview questions may be sent to a dedicated thread. |
| r/analytics | Analyst-framed patterns (MAU, pivots) | Historically strict about vendor posts. Check for a weekly or megathread for career questions. |
| r/datascience | Weak fit for posts. Interview questions have tended to go to a weekly "Entering & Transitioning" thread. | Historically strict: no self-promotion outside designated threads. Comment in the weekly thread only, and only when asked. |
| r/cscareerquestions | Comments only, on "SQL screen next week" threads | Historically strict on self-promotion and on links to your own product. Answer the question and leave SQL Quest out unless the person asks for tools. |
| r/dataengineering | Comments only (anti-join and NULL semantics come up in pipeline threads) | Has tended to have explicit rules on vendor and self-promotion, often requiring disclosure or limiting it to certain threads. Read carefully. |

Reddit-wide, and these are not subreddit-specific:

- **Never ask anyone to upvote, and never post or vote from a second account.**
  That is vote manipulation under Reddit's site-wide rules, and it gets domains
  banned, not just posts.
- Reddit's long-standing guidance is that most of an account's activity should
  not be about its own product. A common rule of thumb is roughly nine parts
  contribution to one part self-reference. Treat that as a floor, not a quota.
- New or low-karma accounts are often filtered by AutoModerator on link posts.
  A removed post is not a reason to repost. Message the moderators or leave it.
- One post per subreddit every two weeks at most. Never cross-post the same text
  to several subreddits.

### The approach: value first

1. **Comments before posts.** For the first two weeks, answer existing threads
   (templates below) and post nothing. A post from an account with no history
   in that subreddit reads as a drive-by.
2. **The answer has to be complete without the link.** If deleting the SQL
   Quest sentence makes the comment worse, the comment was an ad. Rewrite it.
3. **Disclose only when SQL Quest is actually mentioned.** Use one plain line:
   *"Disclosure: I build SQL Quest, so weigh that accordingly."* Put it next to
   the mention, not in a footnote. If SQL Quest isn't mentioned, no disclosure
   is needed, and most comments should be like that.
4. **Alternatives first, fairly.** When someone asks for tools, name the ones
   that fit before ours and say what each is good at. Our own
   `/best-sql-practice-sites/` page ranks because it does this, and a Reddit
   comment that doesn't would contradict it.
5. **Never link-drop.** No bare URLs, no "check out my site", and no link on a
   question it doesn't answer.
6. **Reply to replies.** If someone pushes back on a technical point, answer the
   point. If they're right, say so in the thread.

### Six post drafts

Each one stands on its own with no link. Where a link would be acceptable, it
goes at the end with disclosure, and **only if that subreddit's rules allow it.
Otherwise post without it.**

---

#### Post 1: r/SQL

**Title:** `NOT IN plus one NULL in the subquery returns zero rows. Here's why, and the two safe rewrites.`

**Body:**

> A pattern that trips up people who otherwise write good SQL: "customers who never ordered."
>
> ```sql
> SELECT name FROM customers
> WHERE customer_id NOT IN (SELECT customer_id FROM orders);
> ```
>
> This works until `orders.customer_id` contains a single NULL. After that it returns nothing at all, with no error.
>
> The reason is three-valued logic. `x NOT IN (1, 2, NULL)` expands to `x <> 1 AND x <> 2 AND x <> NULL`. The last comparison is UNKNOWN, not TRUE. `TRUE AND UNKNOWN` is UNKNOWN, and WHERE keeps only TRUE rows. So no row ever qualifies.
>
> Two rewrites that don't care about NULLs:
>
> ```sql
> -- NOT EXISTS: checks whether a row exists, doesn't compare values
> SELECT c.name FROM customers c
> WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id);
>
> -- LEFT JOIN anti-join
> SELECT c.name FROM customers c
> LEFT JOIN orders o ON o.customer_id = c.customer_id
> WHERE o.customer_id IS NULL;
> ```
>
> If you have to keep NOT IN, add `WHERE customer_id IS NOT NULL` inside the subquery.
>
> In an interview, the query often matters less than being able to say *why* NOT IN is fragile. It's a short answer that shows you understand how SQL evaluates a predicate, not just its syntax.

**Link, if the sidebar allows it (end of post):**
`Disclosure: I build SQL Quest. There's a practice version of this one here if it's useful: https://sqlquest.app/questions/customers-without-orders/?utm_source=reddit-not-in`

---

#### Post 2: r/dataanalysis

**Title:** `Running totals: aggregate to the grain first, and write the window frame out`

**Body:**

> Two mistakes I keep seeing with cumulative sums, both silent.
>
> **1. The wrong grain.** `SUM(amount) OVER (ORDER BY txn_at)` on a transactions table gives you a running total after every single transaction. If the question is "cumulative spend by day," you want one row per day. Aggregate first, then take the window over the daily series:
>
> ```sql
> WITH daily AS (
>   SELECT date(txn_at) AS day, SUM(amount) AS daily_spend
>   FROM transactions
>   GROUP BY date(txn_at)
> )
> SELECT day, daily_spend,
>        SUM(daily_spend) OVER (
>          ORDER BY day
>          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
>        ) AS running_total
> FROM daily
> ORDER BY day;
> ```
>
> **2. Leaving the frame implicit.** With an ORDER BY and no frame, the default is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, not ROWS. On a column with duplicate values the two disagree. RANGE treats all rows that tie on the ORDER BY value as peers and adds them in together, so you get the same "running" total on several rows. After aggregating to a daily grain there are no ties, so the results match, but writing ROWS out makes the intent obvious to whoever reads the query next, including an interviewer.
>
> A good follow-up to practice: "and a 7-day rolling average." That's the same idea with `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW`, and it raises the question of what to do when days are missing.

**Link, if allowed:**
`Disclosure: I build SQL Quest. A practice version: https://sqlquest.app/questions/running-total-of-daily-card-spend/?utm_source=reddit-running-total`

---

#### Post 3: r/learnSQL

**Title:** `Top-N per group, step by step: why the window function can't go in WHERE, and what to do about ties`

**Body:**

> "Top 3 merchants per category by spend" is one of the most common shapes in analyst SQL questions. It usually goes wrong in the same place.
>
> **Why you can't write `WHERE ROW_NUMBER() OVER (...) <= 3`:** WHERE runs before window functions are computed. The rank doesn't exist yet when the filter runs. So you compute it in one step and filter in the next:
>
> ```sql
> WITH spend AS (
>   SELECT m.category, m.name, SUM(t.amount) AS total_spend, m.merchant_id
>   FROM transactions t JOIN merchants m ON m.merchant_id = t.merchant_id
>   GROUP BY m.merchant_id, m.category, m.name
> ),
> ranked AS (
>   SELECT *, ROW_NUMBER() OVER (
>            PARTITION BY category
>            ORDER BY total_spend DESC, merchant_id
>          ) AS rn
>   FROM spend
> )
> SELECT category, name, total_spend, rn
> FROM ranked
> WHERE rn <= 3;
> ```
>
> **Ties are the real question.** If two merchants have the same total:
> - `ROW_NUMBER` picks one arbitrarily unless you add a tie-breaker (hence `merchant_id` above).
> - `RANK` keeps both and skips the next number: 1, 2, 2, 4.
> - `DENSE_RANK` keeps both and doesn't skip: 1, 2, 2, 3.
>
> "Top 3 positions" and "top 3 spend levels" are different questions. Ask which one is meant, or say which one you assumed. In an interview, that sentence counts for as much as the query.

**Link, if allowed:**
`Disclosure: I build SQL Quest. Practice version: https://sqlquest.app/questions/top-3-merchants-per-category-by-spend/?utm_source=reddit-top-n`

---

#### Post 4: r/analytics

**Title:** `SUM(CASE WHEN ...) is a pivot table. Conditional aggregation in one query.`

**Body:**

> If you've ever exported to a spreadsheet just to build a pivot, conditional aggregation does it in SQL in one pass.
>
> Say you want each genre split into hits, moderate performers and flops by revenue:
>
> ```sql
> SELECT genre,
>        SUM(CASE WHEN revenue_millions > 100 THEN 1 ELSE 0 END)              AS hits,
>        SUM(CASE WHEN revenue_millions BETWEEN 10 AND 100 THEN 1 ELSE 0 END) AS moderate,
>        SUM(CASE WHEN revenue_millions < 10 THEN 1 ELSE 0 END)               AS flops,
>        COUNT(revenue_millions)                                               AS total
> FROM movies
> GROUP BY genre
> ORDER BY hits DESC;
> ```
>
> Things worth noticing:
>
> - Each CASE works as a counter inside the aggregate. Swap `1` for `amount` and you get conditional *sums*, e.g. revenue from completed orders vs refunded ones.
> - `COUNT(revenue_millions)` skips NULLs, while `COUNT(*)` doesn't. A row with NULL revenue falls into none of the three buckets, so if you used `COUNT(*)` as the total, the buckets wouldn't add up to it. Decide which total you mean.
> - Watch the boundaries. `> 100` and `BETWEEN 10 AND 100` don't overlap, but `BETWEEN` includes both ends, so a value of exactly 10 or 100 needs a deliberate home.
> - A few engines have shortcuts (`FILTER (WHERE ...)` in Postgres, `COUNTIF` in BigQuery). CASE works everywhere, which is why it's the safe interview answer.

**Link, if allowed:**
`Disclosure: I build SQL Quest. Practice version: https://sqlquest.app/questions/conditional-counting-with-case/?utm_source=reddit-case-pivot`

---

#### Post 5: r/SQL or r/dataanalysis (pick one, never both)

**Title:** `Monthly active users in SQL: COUNT(DISTINCT), the month bucket, and the months your GROUP BY won't show you`

**Body:**

> MAU looks like a one-liner, and it hides three decisions.
>
> ```sql
> SELECT strftime('%Y-%m', ts) AS month,
>        COUNT(DISTINCT user_id) AS active_users
> FROM transactions
> WHERE status = 'completed'
> GROUP BY month
> ORDER BY month;
> ```
>
> (SQLite syntax. It's `DATE_TRUNC('month', ts)` in Postgres and Snowflake, `FORMAT_DATE` or `DATE_TRUNC` in BigQuery.)
>
> **1. People, not rows.** `COUNT(*)` counts transactions. `COUNT(DISTINCT user_id)` counts people. Mixing the two up is the most common wrong answer.
>
> **2. The definition of "active."** Does a declined transaction count? A login with no purchase? The filter is part of the metric. Say it out loud before you write it.
>
> **3. Months that don't exist.** GROUP BY only returns months that have rows. If a month had no completed transactions, it's simply missing, not shown as zero. A chart built on that output quietly skips the gap. The fix is to generate the months (a calendar table, or a recursive CTE) and LEFT JOIN the counts onto it, with `COALESCE(active_users, 0)`.
>
> The third one is the follow-up question that separates "wrote a query" from "built a metric someone can trust."

**Link, if allowed:**
`Disclosure: I build SQL Quest. Practice version: https://sqlquest.app/questions/monthly-active-users/?utm_source=reddit-mau`

---

#### Post 6: r/learnSQL

**Title:** `I read public SQL interview-prep guides for seven companies. These six patterns kept coming up.`

**Before posting:** this post says the founder read the sources. The research
was done on 2026-09-13 for the company pages. Read
`docs/reads/company-research-2026-09-13.md` and the sources it cites first. If
you haven't read them yourself, change the title to "public guides for seven
companies list these patterns" and drop the first person.

**Body:**

> While writing interview pages for DoorDash, Goldman Sachs, Walmart, TikTok, LinkedIn, Microsoft and Bloomberg, I went through the public prep guides for each. Nearly all of these were the ones written up openly by DataLemur, plus a few others. The companies differ, but the same few patterns kept showing up in the topics reported. If you're short on time, this is a reasonable checklist:
>
> 1. **Top-N per group.** Rank inside a partition, filter in an outer query, and have an answer ready for ties (ROW_NUMBER vs RANK vs DENSE_RANK).
> 2. **Rows a join silently drops.** LEFT vs INNER, and the anti-join ("users who never did X"), where NOT EXISTS is safer than NOT IN if NULLs are possible.
> 3. **Running totals and rolling windows.** Aggregate to the right grain first, and know the difference between a ROWS and a RANGE frame.
> 4. **Conditional aggregation.** `SUM(CASE WHEN ...)` for pivots, rates and "share of" questions, with a cast before you divide.
> 5. **Date bucketing and date windows.** Monthly or daily grouping, "within N days of signup," and the months with no rows.
> 6. **NULL handling.** COUNT(col) vs COUNT(*), NULLs in NOT IN, and COALESCE where a missing value should be zero.
>
> None of these are exotic. The questions are hard because each one has one quiet trap, and the interviewer is watching for whether you mention it.
>
> Happy to go deeper on any of them in the comments.

**Link:** none in the post. If someone asks for practice resources in the
comments, use template 1 below.

---

### Ten comment templates

Adapt every one to the thread. Never paste one twice word for word. Where SQL
Quest isn't named, there is nothing to disclose.

**1. "Best site to practice SQL for interviews?"**

> Depends a bit on where you're starting and what the interview is.
> - **DataLemur**: questions curated with company sourcing, built by the author of *Ace the Data Science Interview*. Strong for a final cram on real-style questions.
> - **StrataScratch**: a very large bank that covers SQL and Python together. Good if the role is data science.
> - **LeetCode's SQL 50 study plan**: a tight, well-known set. Good for fundamentals and for getting used to the format, especially if you're also doing LeetCode for coding rounds.
> - **HackerRank**: free, and it has a SQL certification if a credential helps you.
>
> I build SQL Quest, so weigh this accordingly. It's aimed at the step before the cram. You get a map of which SQL skills are weak, and a wrong answer gets a diagnosis instead of just "incorrect." Most of it is free (226 of 299 challenges). A lot of people pair one question bank with something that shows them *why* they got it wrong.

**2. "How do I get better at window functions?"**

> What helped most people I've seen get unstuck is learning them as three separate ideas instead of one syntax blob:
> 1. **PARTITION BY** is GROUP BY that doesn't collapse rows. Write the GROUP BY version first, then the window version, and compare the outputs.
> 2. **ORDER BY inside OVER** turns an aggregate into a running one. That's where running totals and LAG/LEAD come from.
> 3. **The frame** (`ROWS BETWEEN ...`) decides which rows count. Know that the default with an ORDER BY is RANGE, not ROWS.
>
> Then drill the four shapes that come up constantly: top-N per group, running total, previous-row comparison (LAG), and the difference between RANK and DENSE_RANK. And remember you can't filter on a window function in WHERE. Wrap it in a CTE.
>
> Any practice bank with a window-functions section works for this (LeetCode, DataLemur, StrataScratch all have them).

*(If asked for a specific place, add: "Disclosure: I build SQL Quest. It has a window-functions practice set that starts at Easy: https://sqlquest.app/challenges/window-functions/?utm_source=reddit-comment-window")*

**3. "I finished a SQL course but freeze on interview questions"**

> Very normal. Courses teach one clause at a time, and interview questions combine three or four ideas in one query. The freeze is usually a decomposition problem, not a knowledge problem.
>
> Before writing anything: (1) what is one row of the output? (2) what grain do I need to aggregate to first? (3) which rows might a join drop? Write those three answers as comments, then build the query in CTE steps, one idea per CTE.
>
> Practice on medium questions and resist jumping to hard ones. Most screens are won or lost on mediums done cleanly, with the edge cases mentioned out loud.

**4. "Is LeetCode SQL 50 enough?"**

> For a lot of analyst screens it covers the core well: joins, aggregation, subqueries, some window functions. Where people tend to find gaps is (a) explaining edge cases (NULLs, ties, missing dates), which a pass/fail judge doesn't push you on, and (b) business-framed questions with a messier schema.
>
> A reasonable plan: finish SQL 50, then do a handful of business-style questions (DataLemur and StrataScratch both have them), and for every one ask yourself "what breaks if there's a NULL or a tie here?"

**5. "DataLemur vs StrataScratch, which one to pay for?"**

> Honest answer: they serve different people. DataLemur is the more curated of the two, with company-sourced questions and solution explanations, and it suits SQL-focused analyst prep. StrataScratch is much bigger and covers Python too, which matters if the role is data science. Both have a free sample. Do a few questions on each before paying, and pay for one, not both.
>
> (I build a different tool in this space, SQL Quest, so I'm not neutral. But for this specific choice, that's how I'd split it.)

**6. "I have a SQL screen in a week, what should I focus on?"**

> One week: don't try to cover everything. Prioritize the patterns that come up most and have a trap:
> 1. Top-N per group (and ties)
> 2. LEFT vs INNER join, and "X who never did Y"
> 3. Running totals / LAG
> 4. SUM(CASE WHEN ...) for rates and pivots
> 5. Date bucketing (monthly, within N days)
> 6. NULLs in COUNT and NOT IN
>
> Do 2 or 3 per day at medium difficulty, out loud, as if someone were watching. On the last day, redo the ones you got wrong, not new ones.

*(If they ask how to find their weak spot: "Disclosure: I build SQL Quest. We have a free 10-question readiness test, no signup, that shows which of nine SQL skills to fix first: https://sqlquest.app/sql-interview-readiness-test/?utm_source=reddit-comment-week")*

**7. "Free place to practice SQL without installing a database?"**

> A few good options that run in the browser: **SQLBolt** and **SQLZoo** for learning the basics interactively, **HackerRank** for free practice problems, and **LeetCode**'s free SQL problems. If you want a real database locally later, SQLite is a single file and takes a minute to set up.
>
> Disclosure: I build SQL Quest, which also runs in the browser with no setup and no signup. Every Easy and Medium challenge is free there.

**8. "How do I know if I'm ready for a SQL interview?"**

> A practical test: take a medium question you haven't seen and give yourself 20 minutes. Can you (1) state the output grain before writing, (2) write it in CTE steps, (3) name one edge case (NULL, tie, missing date, duplicate) and handle it? If you do all three on most mediums across joins, aggregation and window functions, you're in good shape for most analyst screens.
>
> What usually reveals "not ready" isn't a topic you've never seen. It's one skill you're consistently weaker at, hidden behind an average.

*(If they ask for a tool: "Disclosure: I build SQL Quest. Its readiness test is 10 questions, no signup, and scores each of nine skills separately: https://sqlquest.app/sql-interview-readiness-test/?utm_source=reddit-comment-ready")*

**9. "What's the difference between RANK, DENSE_RANK and ROW_NUMBER?"** *(no mention of SQL Quest)*

> With scores 90, 85, 85, 80:
> - `ROW_NUMBER`: 1, 2, 3, 4. Always unique. Which tied row gets 2 is arbitrary unless you add a tie-breaker to ORDER BY.
> - `RANK`: 1, 2, 2, 4. Ties share a rank and the next number is skipped.
> - `DENSE_RANK`: 1, 2, 2, 3. Ties share a rank and nothing is skipped.
>
> Rule of thumb: "top 3 rows, exactly 3" → ROW_NUMBER with a tie-breaker. "Top 3 positions, ties take up seats" → RANK. "Top 3 distinct values" → DENSE_RANK. If a question says "top N" and doesn't say how to handle ties, ask, or state your assumption.

**10. "Why does my NOT IN query return nothing?"** *(no mention of SQL Quest)*

> Almost certainly a NULL in the subquery. `x NOT IN (1, 2, NULL)` means `x <> 1 AND x <> 2 AND x <> NULL`, and `x <> NULL` is UNKNOWN, so the whole condition is never TRUE and every row is filtered out.
>
> Fix it either way:
> ```sql
> WHERE NOT EXISTS (SELECT 1 FROM t2 WHERE t2.id = t1.id)
> ```
> or keep NOT IN and add `WHERE id IS NOT NULL` inside the subquery. NOT EXISTS is the habit worth building, because it doesn't care about NULLs at all.

---

## LinkedIn content loop (P2.17)

### The weekly loop: a template to repeat

| Day | Slot | Source material | Link (at most one) | utm_source |
|---|---|---|---|---|
| **Monday** | One SQL interview pattern | A free question page on `/questions/<slug>/`. Pick the pattern, the trap, and what to say out loud. | That question page | `linkedin-<pattern>` |
| **Wednesday** | A build-in-public note | A decision or a lesson from this week's commits, ledger or reads. A principle, not a funnel. | Usually none. If one, a page that shows the thing. | `linkedin-bip-<topic>` if linked |
| **Friday** | A readiness test / Skillmap insight | How the readiness test or the Skillmap works and why. Once `readiness_completed` has enough rows, a measured pattern **read from the data, never guessed**. | `/sql-interview-readiness-test/` | `linkedin-ready-<topic>` |

Rules for every post in the loop (from `linkedin-voice.md`):

- Turkish first, then `———`, then English. The English keeps the weight of the
  Turkish and is not a loose paraphrase.
- Full sentences, not staccato bullets. One or two facts at most.
- No hustle ("I did X, Y happened"), no funnel disclosure (no user counts,
  conversion rates or revenue), no "bile" framing, no applause lines.
- Honour both sides. Competitors, guide authors and the candidate reading the
  post are treated with respect, never as material.
- Close with the compact positioning line. To keep the one-URL rule, the
  closing line names **SQL Quest** without the domain. The one URL is the
  tracked link.
- Hashtags: none, or `#buildinpublic` on Wednesdays only.
- Best time for Turkish LinkedIn, per the voice file: 19:00–22:00.
- Friday posts **do not report readiness-test results** until
  `readiness_completed` has been read (metric `readiness_funnel`). Until then,
  Fridays explain design choices, as posts 3 and 6 do.
- Self-check before each post: the checklist at the bottom of
  `linkedin-voice.md`.

### Six ready posts (two weeks of the loop)

---

#### Post 1: Monday, week 1: top-N per group

**Link:** `https://sqlquest.app/questions/top-3-merchants-per-category-by-spend/?utm_source=linkedin-top-n`
**Measurement:** `utm = 'linkedin-top-n'` on `landing_view`, distinct `aid`.

```
SQL mülakatlarında en sık karşılaşılan kalıplardan biri, grup başına ilk N sorusudur.

Soru çoğu zaman sade görünür: "Her kategoride en çok harcama alan üç işyerini listeleyin."

Pek çok aday aynı yerde takılır. Pencere fonksiyonu WHERE içinde kullanılamaz; çünkü WHERE, pencere fonksiyonları hesaplanmadan önce çalışır.

Doğru kurgu üç adımdan oluşur. Önce her işyeri için tek bir satıra toplarsınız. Ardından bir CTE içinde ROW_NUMBER() OVER (PARTITION BY category ORDER BY total_spend DESC) ile sıralarsınız. Son olarak dış sorguda sıra numarası üçe eşit ya da küçük olanları filtrelersiniz.

Mülakatta asıl farkı yaratan ise beraberlik sorusudur. İki işyeri aynı tutarda harcama aldıysa ne olacak? ROW_NUMBER ikisinden birini keser; RANK ikisini de alır ve sonraki sırada boşluk bırakır; DENSE_RANK boşluk bırakmaz. Hangisini neden seçtiğinizi söyleyebilmek, sorgunun kendisi kadar değerlidir.

Soruyu tarayıcıda, kurulum ve kayıt gerektirmeden çözebilirsiniz →
https://sqlquest.app/questions/top-3-merchants-per-category-by-spend/?utm_source=linkedin-top-n

SQL Quest — Kişiselleştirilmiş SQL mülakat pratiği.

———

One of the most common patterns in SQL interviews is top-N per group.

The question usually looks simple: "List the three merchants with the highest spend in each category."

Many candidates stall in the same place. A window function cannot sit inside WHERE, because WHERE is evaluated before window functions are computed.

The right structure has three steps. First, aggregate to one row per merchant. Then rank inside a CTE with ROW_NUMBER() OVER (PARTITION BY category ORDER BY total_spend DESC). Finally, filter for rank three or below in the outer query.

What truly sets an answer apart is the question of ties. If two merchants took exactly the same spend, what happens? ROW_NUMBER cuts one of them; RANK keeps both and leaves a gap after them; DENSE_RANK leaves no gap. Being able to explain which one you chose, and why, is worth as much as the query itself.

You can solve it in the browser, with no setup and no signup →
https://sqlquest.app/questions/top-3-merchants-per-category-by-spend/?utm_source=linkedin-top-n

SQL Quest — Personalized SQL interview practice.
```

---

#### Post 2: Wednesday, week 1 (build in public): a format is never stated without a source

**Link:** none, by design.
**Measurement:** none. This post is not a click post. If the founder adds a
link, use a company page with `?utm_source=linkedin-bip-sources`.
**Before posting:** the post thanks DataLemur by name. That is accurate: 12 of
the source citations in `src/data/company-interviews.js` are datalemur.com,
more than every other source combined. Keep it only if the founder is
comfortable naming them. Tagging DataLemur's company page is optional.

```
SQL Quest'te şirket bazlı SQL mülakat sayfaları hazırlıyoruz. Bu sayfaları yazarken kendimize koyduğumuz bir kural var; bu hafta onu paylaşmak istiyorum.

Bir sayfa, bir şirketin mülakat süreci hakkında bilgi veriyorsa — kaç aşamalı olduğu, hangi platformun kullanıldığı, ne kadar sürdüğü — o bilginin tarihli bir kaynağı sayfada yer almak zorundadır. Yalnızca bir arama sonucunun özetinde görülen bilgi hiç yazılmaz. Kaynaklar birbiriyle çelişiyorsa sayfa bunu açıkça söyler. Bu kuralı yazılı bir niyet olarak bırakmadık; kaynak göstermeden süreç bilgisi veren bir sayfa yayına çıkamıyor.

Bunu önemsememizin nedeni basit. Bu sayfaları okuyan kişi çoğu zaman gerçek bir mülakata günler kala okuyor. Ona tahmini bir bilgiyi kesinmiş gibi sunmak yardım etmek değil, yanıltmaktır.

Bu sayfalarda en çok başvurduğumuz kaynak, DataLemur'un açık olarak yayımladığı şirket bazlı mülakat rehberleri oldu. Aynı alanda çalışıyoruz; yine de bu emeği, adaylar için bu kadar açık ve özenle yazılmış bir birikimi teslim etmek gerekir. Kaynağı doğru göstermek, o emeğe duyulan saygının da bir parçasıdır.

SQL Quest — Kişiselleştirilmiş SQL mülakat pratiği.

———

At SQL Quest, we write company-specific SQL interview pages. There is a rule we hold ourselves to while writing them, and I want to share it this week.

If a page says anything about a company's interview process — how many rounds, which platform, how long it runs — that statement must carry a dated source on the page. Anything seen only in a search-result snippet is not written at all. Where sources disagree, the page says so. We did not leave this as an intention: a page that describes a process without a source cannot ship.

The reason is simple. The person reading these pages is often a few days away from a real interview. Presenting a guess to them as fact is not help; it is misdirection.

The source we relied on most was the company interview guides DataLemur publishes openly. We work in the same space, and that is exactly why the work deserves to be acknowledged: a body of writing this open and this careful, made for candidates. Citing a source properly is part of respecting that work.

SQL Quest — Personalized SQL interview practice.

#buildinpublic
```

---

#### Post 3: Friday, week 1: one score is not enough

**Link:** `https://sqlquest.app/sql-interview-readiness-test/?utm_source=linkedin-ready-skillmap`
**Measurement:** `utm = 'linkedin-ready-skillmap'` on `landing_view`, then
`readiness_started` / `readiness_completed` joined on `aid`.

```
Bir SQL mülakatına hazırlanan kişinin en çok ihtiyaç duyduğu şey tek bir puan değildir; hangi konuda puan kaybedeceğini bilmektir.

Genel ortalaması iyi görünen bir aday, tek bir becerideki açığı yüzünden mülakatın en belirleyici sorusunda takılabilir. Ortalama, o açığı gizler.

SQL mülakat hazırlık testimizi bu yüzden tek bir sonuçla bitirmiyoruz. On sorudan oluşan ve kayıt gerektirmeyen test; birleştirmeler, pencere fonksiyonları, gruplama, alt sorgular ve NULL yönetimi dahil dokuz beceri için ayrı ayrı bir Skillmap çıkarıyor ve önce hangisine çalışılması gerektiğini söylüyor.

Hedef bir şirket seçildiğinde genel puan, o şirket için hazırladığımız pratik setinde her becerinin ne ağırlıkta yer aldığına göre hesaplanıyor. Burada açık olmak gerekir: bu, şirketin mülakatının bir ölçümü değil, bizim pratik setimizin bileşimidir. Sonuç ekranı da bunu belirtiyor.

On soru bir mülakatın yerini tutmaz. Ama nereden başlayacağını bilmek, kalan zamanı doğru kullanmanın ilk adımıdır.

On soruluk testi buradan çözebilirsiniz →
https://sqlquest.app/sql-interview-readiness-test/?utm_source=linkedin-ready-skillmap

SQL Quest — Kişiselleştirilmiş SQL mülakat pratiği.

———

What someone preparing for a SQL interview needs most is not a single score. It is knowing where they will lose points.

A candidate whose overall average looks strong can still stall on the question that decides the interview, because of a gap in one skill. An average hides that gap.

That is why our SQL interview readiness test does not end with a single number. Ten questions, no signup, and a Skillmap that scores nine skills separately — joins, window functions, aggregation, subqueries, NULL handling among them — and names the one to work on first.

When you choose a target company, the overall score is weighted by how much each skill appears in the practice set we built for that company. It is worth being clear about this: it reflects the composition of our practice set, not a measurement of the company's interview. The result screen says so.

Ten questions do not replace an interview. But knowing where to begin is the first step to using the time you have well.

You can take the ten-question test here →
https://sqlquest.app/sql-interview-readiness-test/?utm_source=linkedin-ready-skillmap

SQL Quest — Personalized SQL interview practice.
```

---

#### Post 4: Monday, week 2: NOT IN and a single NULL

**Link:** `https://sqlquest.app/questions/customers-without-orders/?utm_source=linkedin-not-in`
**Measurement:** `utm = 'linkedin-not-in'` on `landing_view`, distinct `aid`.

```
SQL mülakatlarında sık sorulan bir soru: "Hiç sipariş vermemiş müşterileri listeleyin."

Akla gelen ilk yanıt genellikle NOT IN ile yazılır ve çoğu zaman doğru sonuç verir. Ta ki alt sorgu tek bir NULL değer döndürene kadar. O andan itibaren sorgu hiçbir hata vermeden, hiç satır döndürmez.

Nedeni SQL'in üç değerli mantığıdır. "x NOT IN (1, 2, NULL)" ifadesi, "x <> 1 VE x <> 2 VE x <> NULL" anlamına gelir. Son karşılaştırmanın sonucu doğru ya da yanlış değil, bilinmeyendir. WHERE yalnızca doğru olan satırları tuttuğu için hiçbir satır koşulu sağlayamaz.

Güvenli yol NOT EXISTS'tir. NOT EXISTS değerleri karşılaştırmaz, yalnızca eşleşen bir satırın var olup olmadığına bakar; NULL onu etkilemez. LEFT JOIN ile kurulan ve eşleşmeyen satırları IS NULL ile ayıklayan yapı da aynı güvenceyi verir.

Mülakatta çoğu zaman sorgunun kendisinden çok, NOT IN'in neden kırılgan olduğunu açıklayabilmek değerlidir. Bu kısa açıklama, SQL'in bir koşulu nasıl değerlendirdiğini bildiğinizi gösterir.

Soruyu tarayıcıda, kayıt gerektirmeden çözebilirsiniz →
https://sqlquest.app/questions/customers-without-orders/?utm_source=linkedin-not-in

SQL Quest — Kişiselleştirilmiş SQL mülakat pratiği.

———

A question that comes up often in SQL interviews: "List the customers who have never placed an order."

The first answer that comes to mind is usually written with NOT IN, and most of the time it returns the right result. Until the subquery returns a single NULL. From that moment, the query returns no rows at all, and raises no error.

The reason is SQL's three-valued logic. "x NOT IN (1, 2, NULL)" means "x <> 1 AND x <> 2 AND x <> NULL". The last comparison is neither true nor false; it is unknown. Because WHERE keeps only rows that are true, no row can ever qualify.

The safe path is NOT EXISTS. It does not compare values; it only checks whether a matching row exists, and a NULL cannot affect that. A LEFT JOIN that keeps unmatched rows and filters them with IS NULL gives the same guarantee.

In an interview, being able to explain why NOT IN is fragile is often worth more than the query itself. That short explanation shows you understand how SQL evaluates a condition.

You can solve it in the browser, with no signup →
https://sqlquest.app/questions/customers-without-orders/?utm_source=linkedin-not-in

SQL Quest — Personalized SQL interview practice.
```

---

#### Post 5: Wednesday, week 2 (build in public): a bug we fixed once, and that came back four times

**Link:** none, by design.
**Measurement:** none. This is not a click post.
**Source:** CLAUDE.md, "Challenge recommendation ordering — the raw-array
trap (fixed 2026-08-05)", and `src/utils/challenge-order.js`. The post uses no
solve-through numbers on purpose (voice file: no funnel disclosure).

```
Bu hafta, ürün geliştirirken öğrendiğimiz ve üzerinde durmaya değer bulduğumuz bir dersi paylaşmak istiyorum.

SQL Quest'in soru bankası tarihsel olarak ileri seviye mülakat sorularıyla başlıyor; yeni başlayanlar için yazılan sorular listenin daha ilerisinde yer alıyor. Öğrenme yollarımız bunu doğru biliyordu. Ancak "sıradaki soru" önerisi yapan dört ayrı noktada, sistem listeyi baştan tarayıp ilk uygun soruyu seçiyordu. Sonuç olarak orta seviyeye yeni geçen bir kullanıcıya, önerilen bir sonraki adım olarak bankanın en zor karşılanan sorularından biri gösteriliyordu.

Bizi asıl düşündüren şu oldu: aynı hatayı daha önce bir kez bulmuş ve o noktada düzeltmiştik. Düzeltmeyi bir kurala dönüştürmediğimiz için hata, kodun başka dört yerinde yeniden ortaya çıktı.

Bugün sıralama tek bir yerde tanımlı; bütün öneri noktaları oradan okuyor. Bir test de ham liste sırasına dayanan bir seçimin koda geri dönmesini engelliyor.

Bir hatayı düzeltmek ile o hatanın bir daha yazılamayacağı bir yapı kurmak arasında fark var. Kullanıcının karşısına çıkan her öneri, bu farkın ciddiye alınmasını hak ediyor.

SQL Quest — Kişiselleştirilmiş SQL mülakat pratiği.

———

This week I want to share a lesson from building the product that we think is worth dwelling on.

SQL Quest's question bank historically begins with advanced interview questions; the ones written for newcomers sit further down the list. Our learning paths knew this. But in four separate places that suggest a "next question", the system scanned the list from the top and picked the first match. As a result, someone who had just moved up to medium difficulty was shown, as their recommended next step, one of the questions in the bank people found hardest to finish.

What stayed with us was this: we had found the same mistake once before and fixed it in that one place. Because we never turned the fix into a rule, the mistake grew back in four other places.

Today the ordering is defined in one place, and every recommendation reads from it. A test stops any selection based on raw list order from returning to the code.

Fixing a bug is different from building a structure in which that bug can no longer be written. Every recommendation a learner sees deserves to have that difference taken seriously.

SQL Quest — Personalized SQL interview practice.

#buildinpublic
```

---

#### Post 6: Friday, week 2: after the score, one first step

**Link:** `https://sqlquest.app/sql-interview-readiness-test/?utm_source=linkedin-ready-first-step`
**Measurement:** `utm = 'linkedin-ready-first-step'` on `landing_view`, then
`readiness_plan_clicked` joined on `aid`. The plan click is the step this post
is about.
**Checked:** `scripts/build-readiness-test.mjs`. The plan link opens the gentlest
free challenge on the weakest skill, and prefers the chosen company's own set
when it has one.

```
Bir hazırlık testinin değeri, verdiği puandan çok, puandan sonra ne yapılacağını söyleyebilmesindedir.

SQL mülakat hazırlık testimizi bitiren kişiye uzun bir çalışma listesi vermiyoruz. Tek bir ilk adım öneriyoruz: en zayıf çıkan becerideki en yumuşak ücretsiz soru. Bir hedef şirket seçildiyse, o soru mümkün olduğunca o şirket için hazırladığımız setten geliyor.

Bu tercihin arkasında basit bir gözlem var. Zayıf olduğunu yeni öğrendiği bir konuya en zor soruyla başlayan kişi, çoğu zaman çalışmayı değil kendini sorgulamaya başlar. Aynı konuya çözebileceği bir soruyla giren kişi ise bir sonraki adımı atacak zemini bulur.

Mülakata kalan süre kısa olduğunda insan her şeyi aynı anda toparlamak ister. Oysa en çok kazandıran genellikle en zayıf halkadan, doğru seviyede başlamaktır.

On soruluk, kayıt gerektirmeyen testi buradan çözebilirsiniz →
https://sqlquest.app/sql-interview-readiness-test/?utm_source=linkedin-ready-first-step

SQL Quest — Kişiselleştirilmiş SQL mülakat pratiği.

———

The value of a readiness test lies less in the score it gives than in whether it can say what to do after the score.

We do not hand someone who finishes our SQL interview readiness test a long study list. We suggest a single first step: the gentlest free question in the skill that came out weakest. If a target company was chosen, that question comes from the set we built for that company wherever possible.

Behind that choice is a simple observation. Someone who meets a newly revealed weak spot with the hardest question often starts to question themselves rather than the material. Someone who enters the same topic through a question they can solve finds the footing for the next step.

When an interview is close, the instinct is to cover everything at once. What usually pays off most is starting at the weakest link, at the right level.

You can take the ten-question test, with no signup, here →
https://sqlquest.app/sql-interview-readiness-test/?utm_source=linkedin-ready-first-step

SQL Quest — Personalized SQL interview practice.
```

---

### After the first two weeks: filling the loop

- **Monday pool** (free Medium question pages, checked 2026-09-13):
  `running-total-of-daily-card-spend` (frame and grain),
  `conditional-counting-with-case` (pivot),
  `monthly-active-users` (people vs rows, empty months),
  `rank-vs-dense-rank-side-by-side` (ties). Before writing, open the page and
  quote only what it says.
- **Wednesday:** take it from the week's commits and reads. Before writing, check
  the post against "no funnel disclosure". A lesson or a principle goes in. A
  conversion rate stays out.
- **Friday:** stay with design choices until `readiness_funnel` has been read.
  After that, one measured observation per post, with n stated, and never a
  number that hasn't been queried.
