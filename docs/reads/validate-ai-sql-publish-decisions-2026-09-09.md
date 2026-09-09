# Validate AI-Generated SQL — publication decisions

Date decided: 2026-09-09  
Owner: Can Goktug Ozdem  
Page: `https://sqlquest.app/blog/validate-ai-generated-sql/`  
Objective served: O1, by adding a non-brand acquisition door and measuring whether it produces people who reach a first and sixth solve.

This file resolves the nineteen pre-publication questions in
`docs/reads/editorial-vs-practice-doors-2026-09-09.md`. It is a decision record,
not a retrospective claim that the page has already worked.

## Decisions

| # | Question | Decision and evidence |
|---|---|---|
| 1 | Do the three ClaudeQuest targets exist? | Yes. On 2026-09-09, `/blog/practice-ai-prompting-with-feedback`, `/guides/mcp-tool-design`, and `/guides/agentic-architecture` each returned HTTP 200. This first article uses only the first target. |
| 2 | Were the SQL examples run in SQLite? | Yes. All seven SQL blocks in the three-draft pack executed with the local SQLite CLI. Draft 1 has three executable queries. Draft 3's final failure-rate query correctly returned no rows because the fixture did not meet its `HAVING COUNT(*) >= 20` threshold. The pack contains no `julianday`, `strftime`, or `INSTR`. |
| 3 | Who is the author? | The visible byline and structured data use `Can Goktug Ozdem — Founder, SQL Quest`. Schema author type is `Person`; publisher remains the `SQL Quest` organization. This is a verifiable founder byline, not an invented editorial team. |
| 4 | Which repository publishes it? | `goktugozdem2/sql-quest2`, from the current `origin/main`. Source lives under `src/`; `public/` is build output. Publication is prepared in a clean worktree so the older, dirty local checkout is untouched. |
| 5 | When do we read it and what can falsify it? | Publish 2026-09-09. Index check 2026-09-16. First performance read 2026-10-07. Zero non-brand impressions by day 28 falsifies the acquisition/query hypothesis; do not clone or translate the page. One to 29 impressions is insufficient and gets a day-56 reread. Thirty or more impressions unlocks CTR, position, and query-alignment analysis. |
| 6 | How is orphaning prevented? | The same change adds the page to `/blog/` and links to it from `/sql-for-the-ai-era/`. The article also links to relevant SQLQuest guides. |
| 7 | How is discovery submitted? | Add the canonical URL to `public/sitemap.xml`, publish, run `npm run indexnow`, then submit the full sitemap URL `https://sqlquest.app/sitemap.xml` in Google Search Console. |
| 8 | Is first-party tracking present? | `scripts/build-static-pages.js` injects `/track.js` into the built copy. Verification must inspect `public/blog/validate-ai-generated-sql/index.html`, not only the source file. |
| 9 | Does FAQ markup match visible content? | Yes by construction. The four FAQ questions are visible on the page and use the same wording as the `FAQPage` schema. The existing FAQ ratchet must add zero violations. |
| 10 | Are product counts safe? | The article makes no challenge-bank or free-tier count claim. Dynamic product counts therefore cannot go stale on this page. |
| 11 | What is the stable source tag? | Every SQLQuest practice CTA uses `/app/?src=validate-ai-generated-sql`. It does not use a generic `utm_source=blog`. |
| 12 | Do we use “assisted signup”? | No. It is removed from this page's success definition because SQLQuest has no canonical assisted-signup metric. |
| 13 | How is the cross-product click recorded? | The ClaudeQuest link carries `data-track="editorial_claudequest_click"`. Built `/track.js` records `[data-track]` clicks to `pro_events` with `reason='landing'`, including page and destination. |
| 14 | Does this cannibalize an existing page? | No direct conflict was found. `/sql-for-the-ai-era/` owns the broad “SQL and AI” category; this page owns the task-specific intent “validate AI-generated SQL.” The later agent article should use “Analyze AI Agent Telemetry with SQL” and `/blog/ai-agent-telemetry-sql/` rather than another broad “SQL for AI” title. |
| 15 | Publish all three together? | No. Publish only this article on 2026-09-09. Hold the tutor and telemetry articles for separate weekly releases, tentatively 2026-09-17 and 2026-09-24, only after this page's indexing state is known. |
| 16 | Create a Turkish version now? | No. Add one only if English query data or Turkish GSC impressions show demand. A future Turkish article must answer Turkish search intent directly, not translate this page line by line. |
| 17 | Should ClaudeQuest link back? | Not mechanically. This series uses a one-way editorial SQLQuest → ClaudeQuest link. Any future return link needs its own reader reason; reciprocal sitewide or templated links are out. |
| 18 | What trademark language is used? | `SQL Quest is an independent learning product and is not affiliated with, endorsed by, or sponsored by Anthropic. Anthropic and Claude are trademarks of Anthropic PBC.` Standardizing older pages is separate cleanup. |
| 19 | What was checked live? | All three ClaudeQuest targets returned 200. `/app.html?src=validate_ai_generated_sql` returned 308 to `/app/?src=validate_ai_generated_sql` and preserved the query, but this page uses the canonical `/app/?src=validate-ai-generated-sql`. In GSC's 90-day exact-query filters, `validate ai generated sql`, `how to build an ai sql tutor`, and `sql for ai agents` each showed 0 clicks and 0 impressions. |

## Measurement contract

The article is an acquisition and GEO experiment, not the primary conversion
lever. The existing editorial baseline is about 9% first-solve; comparison and
company pages perform materially better. We will not call the article a success
from publication, indexing, or ranking alone.

- **Day 7, 2026-09-16:** indexed or not indexed.
- **Day 28, 2026-10-07:** non-brand impressions, clicks, query mix, and
  `editorial_claudequest_click` people.
- **After 30 attributed app opens:** below 5% first-solve means the CTA or
  practice handoff failed; 9% or more holds the current editorial baseline.
- **Practice click events:** `cta_practice_validate_ai_sql_mid` and
  `cta_practice_validate_ai_sql_end`; the nav keeps the existing `cta_blog`
  control event.
- **Activation outcome:** first solve is the leading product outcome. Reaching
  six solves is the objective-aligned denominator because the six-solve offer
  is the only paywall rung with observed purchases.
- **Separate GEO signal:** a verified AI citation or an arrival source recorded
  as `ai:*` is evidence of AI discovery. It does not replace GSC acquisition
  evidence.

## Release checklist

- [x] Source page exists at `src/blog/validate-ai-generated-sql.html`.
- [x] Blog hub and `/sql-for-the-ai-era/` link to the page.
- [x] Build generator copies the slug.
- [x] Sitemap contains the canonical URL with `2026-09-09` last modification.
- [x] All SQL examples execute in SQLite.
- [x] Full lint, test, build, and build validation pass.
- [x] Built page contains one H1, canonical metadata, matching FAQ schema,
  `/track.js`, the stable `src` tag, and the tracked ClaudeQuest link.
- [ ] Production URL returns 200 after deployment.
- [ ] `npm run indexnow` succeeds after the production URL is live.
- [ ] GSC receives the full sitemap URL and the article URL is inspected.
