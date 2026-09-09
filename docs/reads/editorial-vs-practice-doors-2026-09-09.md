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

---

## Open questions and requirements before any of the three publish

Ordered by whether they block. Everything in the first two groups is a
requirement this repo already enforces or a fact nobody has established yet.

### Blocking — cannot publish until answered

1. **Do the three ClaudeQuest URLs exist?**
   `/blog/practice-ai-prompting-with-feedback`, `/guides/mcp-tool-design`,
   `/guides/agentic-architecture`. An editorial link to a 404 is worse than no
   link, and it is the one thing the whole cross-domain rationale rests on.
2. **Has every SQL example been run in SQLite?** The pack's own rule 8 says to
   do this. It says to; it does not say it was done. Our datasets are SQLite,
   and `julianday`, `strftime` and `INSTR` behave differently elsewhere.
3. **Who is the author byline?** The pack proposes `SQLQuest Editorial Team`
   for the Article schema. There is no editorial team — there is one founder.
   Our whole outreach voice rule exists because the founder writing personally
   is the advantage we have. A fictional team is a small lie in structured data
   that a reader can check against the About page.
4. **Which repo publishes these?** The pack sits in a Playground checkout. The
   live site builds from `src/` in this repo. Somebody has to port them, and
   the port is where the guards below apply.
5. **What is the read date and what would count as failure?** Without a claim
   in the ledger these are three pages nobody ever judges. Proposed baseline is
   in the table above: editorial doors convert at ~9% first-solve.

### Requirements this repo enforces automatically

6. **Internal links in the same commit.** CLAUDE.md's orphan rule, learned the
   hard way: four fintech pages sat unindexed on both engines with a healthy
   sitemap because nothing linked to them. The pack says to link from
   `/sql-for-the-ai-era/` "only if the links improve the reader's next step" —
   that is good editorial instinct and it loses to the orphan rule. Ship the
   homepage nav/footer entry and the hub link in the same commit or the pages
   do not get crawled.
7. **Sitemap entry, then `npm run indexnow`.** And the GSC submission needs the
   full `https://sqlquest.app/sitemap.xml`, not `sitemap.xml`.
8. **`scripts/build-static-pages.js` must inject `track.js`.** Confirm on the
   built copies, not the sources. The injector's presence check has silently
   skipped four pages before, costing 29 days of tracking on the homepage.
9. **The FAQ guard.** All three drafts carry FAQ blocks.
   `tests/faq-schema.test.js` ratchets against
   `scripts/faq-schema-baseline.txt`, and the baseline can only shrink. New
   pages must either satisfy it or be a deliberate baseline entry.
10. **The counts guard.** If any draft states a challenge count, exercise
    count, or "N free", `tests/site-counts.test.js` will check it against the
    live bank. It has caught stale numbers that had already spread to 21 files.

### Attribution and measurement

11. **Per-article `src` tag, not `utm_source=blog`.** Detailed above. Decide the
    three slugs now so they are stable from the first day of traffic.
12. **Does "assisted signup" exist as a metric?** The pack lists it as a success
    signal. We do not measure it. Either define it in
    `docs/agent/metrics.md` before publishing or drop it from the plan.
13. **Is `editorial_claudequest_click` a `[data-track]` click?** Only those
    reach `pro_events`. Anything routed through `trackLanding` is still
    Vercel-only and therefore discarded on Hobby — that is how five landing
    events were silently lost for months.

### Editorial judgment — the founder's calls, not mine

14. **Cannibalisation.** We already have `/sql-for-the-ai-era/`,
    `/blog/sql-for-ai-company-interviews`, and `/blog/sql-for-fraud-analytics`.
    Do the three new pieces take queries from those, or add to them?
15. **Three at once, or spaced?** Three articles landing the same day from a
    site with 46 blog arrivals a quarter is a visible pattern.
16. **Turkish versions?** `/turkce-sql-ogren/` ranks 11.5 and we already run
    Turkish blog posts. AI+SQL is a thinner Turkish query space, but the
    decision should be made rather than defaulted.
17. **Is ClaudeQuest linking back?** The pack forbids copying the articles
    there, which is right. Reciprocal editorial links between two sites owned
    by the same company are still a pattern search engines model. One-directional
    is safer, and worth stating explicitly rather than leaving to whoever writes
    ClaudeQuest's pages.
18. **Anthropic trademark, consistently.** The drafts carry a clear
    no-affiliation line. We also run `/anthropic-sql-interview/`. Whatever the
    standard is, it should be the same on both.

### Not verified here

19. The ClaudeQuest URLs, the production behaviour of `/app.html?…` redirects,
    and current rankings for the three target queries. All three need a live
    check, and I did not fetch production.
