# Review: the ClaudeQuest contextual authority content pack

**Reviewed 2026-09-09.** Source: `claudequest-contextual-authority-content-pack-2026-09-09.md`
(Playground checkout, not in this repo). Three drafted SQLQuest articles on
validating AI-generated SQL, building an AI SQL tutor, and SQL for AI agent
telemetry, each carrying one editorial link to ClaudeQuest.

**Verdict: the drafts are good and the stated goal is the wrong one.** Publish
them for the GenAI citation channel, not for conversion, and fix the CTA before
they go out.

---

## The pack's craft is not in question

Source ledger with real citations, a visible independence disclosure, an
explicit "no affiliation with Anthropic" line, one editorial cross-link rather
than a sitewide footer link, canonical staying on SQLQuest, FAQ blocks, and an
instruction to run every SQL example in SQLite before publishing. That is a
higher standard than most of what we already have live.

## The measured problem with its stated goal

The pack's primary goal is to "convert readers into SQLQuest practice". Measured
over 90 days, people by `aid`, by the door they arrived through:

| Door | People | Solved one | Reached six |
|---|---|---|---|
| `/blog/` posts | 46 | **8.7%** | 4.3% |
| how-to landing pages | 71 | **9.9%** | 4.2% |
| comparison pages | 133 | 30.1% | 15.8% |
| company pages | 309 | 29.4% | 11.0% |
| `/sql-exercises/` hub | 390 | 35.6% | 16.9% |
| homepage | 536 | 37.1% | 13.2% |

**Editorial content converts at roughly 9%. Every practice-shaped door converts
at 29-37%.** The gap holds across 117 people of editorial traffic, which is
thin but not nothing.

Being fair to the pack: this is not a defect in the writing. Blog and how-to
traffic is informational intent ("what is a CTE"), and comparison and company
traffic is decision intent ("where should I practice", "Amazon SQL interview").
Different intent should convert differently. And the blog's real problem is not
conversion but volume — **46 people in 90 days from every post combined.**

At current blog volume, three more articles plausibly bring ~45 people a
quarter, about 4 of whom solve anything and **under one** of whom reaches six
solves. Against O1's arithmetic (about 3,450 six-solves a month needed) that is
not a route, and the pack should not be sold as one.

## The reason to publish them anyway

The GenAI recommendation channel. AI assistants already send us buyers, and that
traffic hides inside `arrivalSrc=home` because there is no referrer. Articles
titled "How to Validate AI-Generated SQL" are exactly the shape an assistant
cites when someone asks whether they can trust a generated query. That is a
different mechanism from reader conversion, it is the one these three drafts are
actually built for, and it is not measurable by the table above.

Publish them for citation. Judge them on whether `sql-for-the-ai-era` and the
`(none)`/`home` doors grow, not on their own click-through.

## Two fixes before publishing

**1. The CTA loses per-article attribution.** The pack specifies
`/app.html?utm_source=blog&utm_medium=internal&utm_campaign=...`. Our arrival
tagging reads `params.get('src') || params.get('utm_source')` and stores the
first touch, so `utm_source=blog` stamps every one of the three articles as the
single bucket `blog` — which already exists and holds 7 people. `utm_medium`
and `utm_campaign` are read by nothing: Vercel Hobby has no UTM reporting, and
that is why the `src` convention exists.

Use `/app/?src=validate-ai-generated-sql` and the equivalent per article. Then
each shows up in the table above as its own row.

(Also prefer `/app/` over `/app.html`. Both work in production — `blog-cte`,
`blog-antijoin`, `blog-recursive` and `blog-runningtotal` all have live arrivals
through `/app.html?src=` — but on the local static preview server `/app.html?…`
redirects to `/app` and drops the query, so anything verified locally through
that form will look broken when it is not. `/app/?src=` keeps the query in both.)

**2. Three ClaudeQuest URLs must exist first.** The drafts link to
`/blog/practice-ai-prompting-with-feedback`, `/guides/mcp-tool-design` and
`/guides/agentic-architecture`. An editorial link to a 404 is worse than no
link. Confirm all three resolve before publishing; not verified here, because
checking means fetching production.

## What this does not change

`/sql-exercises/` remains our best door on both measures, and the comparison
pages are second. If the question is where an hour of content work returns most,
the answer is still those two page types, not a fourth editorial article.
