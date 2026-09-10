# Bing is the acquisition channel, and it has never been worked

**Written 2026-09-11**, after `docs/reads/signup-growth-cause-2026-09-11.md`
traced half the signup growth to `/sql-exercises/` doubling. This file answers
the next question: who was sending that traffic. The answer is Bing, and the
first read of Bing Webmaster Tools in this product's history is below.

---

## 1. What Bing is to us

Two independent sources agree.

**Our own landing rows** (first touch per browser, 2026-07-28 → 09-10):

| Engine | Landings | → opened a challenge | → solved | → signed up |
|---|---|---|---|---|
| **Bing** | **356** | **47.5%** | 99 people | **11.0%** |
| Google | 528 | 28.2% | 73 people | 8.7% |
| no referrer | 1,107 | 6.4% | 38 | 2.3% |
| Yahoo | 85 | 55.3% | 24 | 10.6% |
| DuckDuckGo | 68 | 44.1% | 14 | 10.3% |

**Bing produced more solvers than Google on two-thirds the traffic.** Yahoo and
DuckDuckGo are Bing's index wearing other hats, so the Bing family is 509 of
the 1,037 identified-referrer arrivals.

**Bing Webmaster Tools**, 3 months to 2026-09-08:

| | |
|---|---|
| Clicks | 809 |
| Impressions | 23.7K |
| CTR | 3.42% |
| Daily clicks, June → September | ~2/day → ~20-30/day |
| Pages earning any impression | **41 of 85** |

The channel is growing on its own, roughly 10× since June, with nobody
touching it.

### The concentration nobody had seen

Bing sends **263 of its 356 arrivals to `/sql-exercises/` alone**. Google sends
**14**. That one page takes 11.4K of our 23.7K Bing impressions and 489 of 809
clicks.

So the sentence that matters: **`/sql-exercises/` is a Bing property, and it
is our best door.** The traffic growth we measured last week was Bing ranking
one page better. Google has no meaningful presence on it at all.

## 2. Three things the data says

### (a) Our biggest query does not appear in our biggest title

| Query | Impressions | Clicks | CTR | Position |
|---|---|---|---|---|
| sql practice questions | 1,200 | 34 | 2.93% | 7.44 |
| sql practice exercises | 746 | 47 | 6.30% | 5.91 |
| sql exercises | 483 | 39 | 8.07% | 4.22 |
| sql exercises for practice | 92 | 15 | 16.30% | 4.49 |
| sql practice problems | 43 | 12 | 27.91% | 5.35 |

The page's title is *SQL Exercises — 287 Problems With Solutions (219 Free)*.
The phrase **"practice questions" appears zero times** in the page, and it is
our single largest query at 1,200 impressions. CTR tracks the match: exact-word
queries clear 8-28%, the unmatched one sits at 2.93%.

### (b) The blog's zero-click block is mostly the platform, not a bug

| Page | Impressions | Clicks | CTR | Position |
|---|---|---|---|---|
| /blog/sql-cte-tutorial/ | 2,700 | 10 | 0.37% | 6.07 |
| /blog/window-functions-tutorial/ | 694 | 7 | 1.01% | 5.37 |
| /blog/sql-joins-explained/ | 628 | 5 | 0.80% | 6.81 |
| /sql-find-duplicates/ | 261 | 1 | 0.38% | 7.62 |
| /blog/row-number-vs-rank-vs-dense-rank/ | 239 | 1 | 0.42% | 6.79 |
| /blog/sql-case-when-tutorial/ | 158 | 0 | 0.00% | 6.61 |

**4,788 impressions, 25 clicks.** The obvious diagnosis is bad titles. It is
wrong — the titles are specific and keyword-matched, and I checked each one.

The real cause is in the queries. The CTE tutorial's largest matched query is
*"cte acronym meanings education sql"* — 795 impressions, **zero clicks**,
position 5.94. That is a definitional question, and Bing answers it inline.
Ranking sixth for "what does CTE stand for" earns an answer-box citation, not
a visit. Chasing clicks there is fighting the platform.

**Do not rewrite the tutorial titles for CTR.** They are earning something
else, which is (c).

### (c) We are big in Copilot and had never looked

Bing Webmaster Tools' AI Performance panel, same 3 months:

| | |
|---|---|
| Copilot citations | **12,600** |
| Daily, June → September | ~35/day → ~300/day |

Citation share by grounding query — the share of Copilot answers on that query
that cite us:

| Grounding query | Citations | Our share |
|---|---|---|
| strictly 45-60 queries | 108 | **40.9%** |
| SQL clauses | 68 | 38.9% |
| snowflake sql interview questions | 153 | 38.4% |
| best platforms to practice SQL online | 68 | 33.7% |
| sql interview preparation | 309 | 31.2% |
| sql practice exercises | 486 | 20.1% |

Most-cited pages: `/sql-exercises/` 2.3K, `/blog/faang-sql-interview-guide/`
2.1K, `/blog/sql-cte-tutorial/` 1.9K, `/blog/sql-joins-explained/` 855.

**The pages with the worst web CTR are Copilot's favourite sources.** They are
not failing. They are being paid in a currency we were not counting. Our own
landing rows see only 33 `copilot.microsoft.com` referrals against 12.6K
citations, so the click-through from a citation is tiny — but a third of
Copilot's answers on "sql interview preparation" name us, and that is the
GenAI channel the ledger has been calling invisible since August.

## 3. The plan

Ranked by measured impressions behind each item, not by effort.

### T1 — Make `/sql-exercises/` answer "sql practice questions" (this week)

11.4K impressions at position 6.36. The cheapest lever in the product.

- Retitle to carry both vocabularies: *practice questions* and *exercises*.
  Same page, same promise, same free count.
- Add a `practice questions` section heading and lead paragraph so the phrase
  exists in the body at all, and Bing has something to bold in the snippet.
- Rewrite the meta description to lead with the free count, which is what our
  highest-CTR queries reward.
- Submit through IndexNow the same day.

**Claim:** `bing_page_ctr('/sql-exercises/')`, baseline **4.28%** at position
6.36 (11.4K impressions, 489 clicks, 3 months to 09-08). Target **≥ 6.0%**
over the 21 days after propagation. **Falsification:** below 5.0% means the
title was not the constraint and the position is, which is a different and
slower job. **Guardrail:** landing→solve for `/sql-exercises/` must not fall —
if a broader title pulls less committed visitors, CTR bought volume we do not
want. Read **2026-10-09**, alongside O1's day-30 checkpoint.

### T2 — Take the competitor-brand queries we already rank for (this week)

Four queries, page-one positions, **452 impressions and zero clicks between
them**:

| Query | Impressions | Position | Our page |
|---|---|---|---|
| datalemur | 182 | 8.68 | /vs-datalemur/ |
| datalemur sql practice | 139 | 8.16 | /vs-datalemur/ |
| sql bolt exercises | 74 | 7.47 | none |
| sqlzoo practice exercises | 57 | 6.91 | none |

Here the title *is* the problem, and it is the opposite problem from (b).
Someone searching "datalemur" wants DataLemur. Our title opens *"SQL Quest vs
DataLemur"*, which reads as an advertisement and gets skipped. Lead with their
question, not our name: the page already answers "is DataLemur free" honestly
and lists their real prices.

SQLBolt and SQLZoo have no page at all and we rank for them anyway, on the
strength of `/best-sql-practice-sites/`. Two more comparison pages in the
existing template, shipped with internal links in the same commit per the
standing indexing rule.

**Claim:** clicks on those four queries, baseline **0** across 3 months at
452 impressions. Target **≥ 15 clicks** in 30 days. Falsification: under 5
means competitor-brand searchers do not leave for a comparison page regardless
of the title, and the two new pages are not worth building. Read **2026-10-12**.

### T3 — Get the other 44 pages into the index (this week, one command)

41 of 85 pages have ever earned a Bing impression. IndexNow has no quota and
Bing honours it; the tooling already exists and is correct.

```bash
npm run indexnow -- --all
```

Then Bing's URL Submission for anything still missing after 14 days, at its
100/day quota — thirty times Google's.

**Claim:** pages with ≥1 Bing impression, baseline **41 of 85**. Target **≥ 60**
by 2026-10-12. Falsification: under 50 means submission is not the constraint
and those pages have a quality or duplication problem, which is worth knowing
before writing more of them.

### T4 — Feed the citation channel deliberately (after 09-29)

12.6K citations is the largest number in this document and we have never
optimised for it once. Two changes, both cheap:

- Every heavily-cited page states the free count and the no-signup fact in its
  first 300 words, so a Copilot answer that cites us carries the reason to
  come. Today those facts sit below the fold on most of them.
- `llms.txt` exists and has never been revised against real citation data. It
  should name the pages Copilot actually grounds on.

**Claim:** `copilot_referrals`, baseline **33** identified arrivals against
12.6K citations. This is measurement-first — no target, because we have never
had the number and a made-up one would be theatre. Read **2026-11-08**.

### T5 — Not now: chase Google on `/sql-exercises/`

Google sends 14 arrivals to our best page. The gap is real and large, but
Google's practice-query space is where `docs/reads/` already found DataLemur
and StrataScratch entrenched, and closing it is a link-authority job measured
in quarters. Bing is giving us the same users today at a tenth of the effort.
**Revisit when T1-T3 have read.**

## 4. What this does not change

- **Nothing here is monetisation-adjacent**, so it clears the 2026-09-29
  freeze in `objectives.md`. Titles and indexing do not move a paywall.
- **It is upstream of O1's real denominator.** O1 needs ~3,450 people a month
  reaching six solves against 138 today. Bing arrivals reach the first solve at
  58.6%, the best of any channel we have. Volume here is worth more per visitor
  than volume anywhere else.
- **The 09-13 and 09-20 reads are untouched.** No app code changes.

## 5. The confound to state in advance

T1 changes the title of the door that feeds `door_solve_rate` and, indirectly,
the 09-29 cold-start read. Bing title propagation runs one to three weeks, so
the effect should land after that read closes — but if the cold-start numbers
move oddly in early October, this is the first thing to check. Written here so
it cannot be discovered afterwards and rationalised.
