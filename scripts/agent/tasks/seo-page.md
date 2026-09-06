<!-- allowed-paths: src/!(app|blog/*|data/*).html:public/sitemap.xml -->
You are running unattended on a schedule. Propose at most ONE new practice-entry
page — a door into the app — chosen from what the existing doors measure.

**You may create exactly one new `src/SLUG.html`; edit `src/index.html` ONLY to
add that page's nav-dropdown and footer links; edit ONE hub page
(`src/sql-interview-prep.html`, `src/best-sql-practice-sites.html`, or the
cluster's closest sibling) to link it; and add ONE `<url>` with `lastmod` to
`public/sitemap.xml`. Nothing else.** Not `src/app.jsx`, not `src/app.html`
(the app shell), not `src/data/`, not a blog post under `src/blog/`. The
`allowed-paths` header on line 1 is the wall for all four — `guard.sh` fails
the run on any file outside it; a plain `src/*.html` glob used to admit the
shell and the blog, which is why the pattern names them. This spec enforces
the finer boundary (one page, one hub, one sitemap entry), and the guard
discards the run if you cross either.

## Why this task exists, and why it is one page a week

The README gated an SEO task on "the first funnel-sourced payment"; that gate
was met twice, payers on 2026-08-23 and 2026-09-01, both funnel-sourced. In the
28 days to 2026-09-06 (people, first-touch `arrivalSrc`, internal accounts
excluded) SEO pages were 609 of 1,047 app arrivals (58%): hub/landing pages
370 people with 32% going on to solve, company pages 158 at 23%, comparison
pages 26 at 23%, sector pages 18 at 11%, blog 37 at 5%. `home` was 268 at 34%,
direct/unstamped 160 at 13%. One page, `sql-exercises`, brought 252 people —
41% of all SEO arrivals — so the door portfolio is one page wide. One page a
week, never more: a burst of thin near-duplicate pages is what doorway-page
penalties are written for, and every URL costs the human a manual GSC indexing
request from a quota of about 10 a day.

## Step 1 — pick from data, not from a keyword list

Read the newest `docs/reads/seo-*.md` if one exists. Otherwise run the door
read yourself, with the **`door_solve_rate` SQL from `docs/agent/metrics.md`
verbatim** — `:since = now() - interval '28 days'`, `:until = now()`,
`:contaminated_aids` from `docs/agent/ledger.md`. Copy it; do not rewrite it
from memory. Two of its parts look optional and are not: the `internal` CTE
(any browser that ever wrote a row under an internal username) and the
`pid <> ALL (:contaminated_aids)` predicate. `app_opened` writes username
`guest`, so the shared username filters see nothing on the arrival row; a
query without those two parts keeps every founder browsing session as an
arrival that never solves, under-reports the solve rate of whichever doors
the founder came through, and is not comparable to the 2026-09-06 baseline
above, which was computed with them. The registry also carries the traps —
double-encoded `metadata`, identity as `COALESCE(aid, username)` because a
guest arrives and solves before they have a username — so it is the one
place to read.

`arrivalSrc` is first-touch — a returning visitor keeps the door that acquired
them — so `people` counts acquisition, not visits. `company:X` doors are
company pages, bare slugs hub/landing pages, `ref:host` not a page of ours.
Group doors into clusters by hand and rank clusters by **`reached_5` people
per page**, never by total: `sql-exercises` wins every total-based ranking
alone and would have you writing exercise pages forever. Today's working clusters
are the fintech/data company pages (Revolut 33, Snowflake 27, Wise 14, Stripe
14) and the analyst/analytics-prep query space (`analyst-interview`, 12 —
payer #2 was sent there by Gemini for "analytics prep"). Then the hard rules,
each of which is a measured number:

- **Never a blog post.** Blog arrivals solve at 5% against 23-32% for entry
  pages. A post is read; a door is practised.
- **Never a slug that exists** — `ls src/*.html`, `grep '<loc>' public/sitemap.xml`.
  A second page on the same query cannibalises the first.
- **A company page needs tags you may not add.** The `?company=Name` door
  filters the app on `src/data/challenge-companies.js`, outside your paths; an
  untagged company lands on an empty list, the page promising what the app
  does not deliver. Only a company already tagged there is eligible — today
  every tagged company has a page, so say so and pick from the analyst space.
- **One page a week.** `git log --since='7 days ago' --grep='agent(seo-page)'`
  non-empty means exit, whatever the data says.

**Exit without a page** — and say why in the final message — when no cluster
has at least 2 pages at 25% solve or better, or when the last page this task
shipped has not reached 20 arrivals yet. Find that page by the file it added,
not by its commit message — the runner titles every commit
`agent(seo-page): automated proposal <stamp>` and the PR the same, so neither
carries the slug:

```bash
git log --since='60 days ago' --grep='agent(seo-page)' --diff-filter=A --name-only --pretty=format: -- 'src/*.html'
```

That prints the `src/SLUG.html` each merged run added; strip the path and
`.html` and that SLUG is the door to look up in the door read. A page written
before the previous one has been read is a page written blind. A run that
proposes nothing is a successful run.

## Step 2 — clone a sibling, fill it with real content

Read two siblings first — the two closest pages in the chosen cluster (analyst
space: `sql-interview-questions-data-analyst.html` and `sql-interview-prep.html`;
company: two from the same sector). Keep the head's shape exactly:
`<script src="/ref-track.js">` first in `<head>`, `<title>`, meta description,
`<link rel="canonical">` to `https://sqlquest.app/SLUG/`, the OG/Twitter block,
and `<script defer src="/_vercel/insights/script.js"></script>` —
`scripts/build-static-pages.js` anchors the first-party tracker on that exact
tag, and a page without it is as invisible as the blog was for a month.

**Make the page its own door.** Every `/app/` link on it carries `?src=SLUG`,
SLUG being exactly the page's slug: `track.js` stamps `landing_view` with
`page = slug`, the app stamps `arrivalSrc = src`, and the two sides of the
funnel join only when the strings match. The analyst page tags
`?src=analyst-interview` from `/sql-interview-questions-data-analyst/`, so its
views and its arrivals cannot be joined by name — do not repeat that. A company
page instead links `/app/?company=Name` and the app derives `company:Name`;
copy the sibling's form, never mix the two.

The body is specific or it is nothing. Name the matching challenges by id from
`src/data/challenges.js` (`skills`, `category`, `difficulty`) and, for a
company, `src/data/challenge-companies.js`; count from the data — "N
questions, M free", free = Easy + Medium + Hard with `freePreview: true`, Hard
being Pro-locked otherwise (the Wise page's "10 questions, 8 free" was
computed). No invented company facts: describe the SQL patterns the page
practises, never what a company's loop contains. No keyword stuffing —
`<meta name="keywords">` is the sibling's shape, not a list to grow. Turkish
copy only where the sibling has it; company pages have none. One `<h1>`.

## Step 3 — links in the same commit

An orphan page does not get crawled on a domain with this little authority.
The four fintech pages sat unindexed for a week behind a healthy sitemap
because nothing linked to them; `stripe-sql-interview`, linked from seven
places, was indexed on both engines. So, in this commit:

1. `src/index.html` — one link in the nav dropdown (near line 485) in the
   matching column, one in the footer (near line 939) in the matching group.
2. The hub — a card in `src/sql-interview-prep.html` in the section that
   matches the page's job (company: its sector group), or the closest sibling.
3. Company page only: run `node scripts/build-company-crosslinks.mjs`. It is
   idempotent, and its `COMPANIES` map is outside your paths so it cannot learn
   the new slug — expect no diff; if it rewrites pages you did not create,
   `git checkout` them (21 rewritten pages plus yours brushes the guard's
   25-file cap). Give the new page its own `<!-- related-companies -->` strip
   by hand in the sibling's shape, and link it from one sibling OUTSIDE those
   markers — inside, the next run deletes it.

Then confirm `grep -l 'href="/SLUG/"' src/*.html | wc -l` is at least 3 —
`index.html` counts once however many links it holds, so the hub and a sibling
are both needed. Fewer is a failed run: delete the page and exit.

## Step 4 — verify before you finish

- `npm run test:run` passes.
- `git diff --stat` and `git status --short` show only: the new page,
  `src/index.html`, one hub or sibling page, `public/sitemap.xml`.
- The page has exactly one `<h1>` (`grep -c '<h1' src/SLUG.html`), a
  `<title>`, a canonical matching its sitemap `<loc>`, a meta description, and
  the insights tag.
- The sitemap entry is `<loc>https://sqlquest.app/SLUG/</loc>`, `<lastmod>`
  today, `<changefreq>monthly</changefreq>`, `<priority>0.9</priority>`.
  `npm run indexnow` submits only URLs whose `lastmod` is inside 7 days.

## Step 5 — the claim, and the three things only the human can do

Leave the tree clean apart from the edits; the runner opens the PR. Your final
message is the PR body, so carry the ledger block in the runner's shape:

    - **Metric** door_solve_rate (`docs/agent/metrics.md`), door `SLUG` — baseline 0, born at merge
    - **Target** 20+ app arrivals AND 25%+ of them solve, within 14 days of indexing
    - **Read on** <merge + 21 days: 7 for indexing to take, 14 of window>

State the falsification now, so the verdict cannot be argued later: under 20
arrivals means not indexed or not ranking — the human checks GSC, and this
task writes no further page into that cluster until one ranks; 20 or more at
under 15% solve means the page promises something the app does not deliver —
fix the page, not the cluster.

Then the human's list, in order, because the fleet cannot do these:

1. **Nothing to register for the page itself.** Since 2026-09-06
   `scripts/build-static-pages.js` discovers every `src/*.html` at build (the
   hand-kept `rootPages` list it replaced once let a new page ship as a 404
   behind a valid sitemap entry). Company page only: add the company to
   `COMPANIES` in `scripts/build-company-crosslinks.mjs` and re-run it, and
   tag its challenges in `src/data/challenge-companies.js` — both outside the
   fleet's paths, which is why company pages are a human-assisted pick.
2. `npm run indexnow` after the deploy that carries the new `lastmod`.
3. GSC → URL Inspection → Request Indexing for the one URL (about 10 a day;
   the 11th says "Quota Exceeded", the only proof the earlier ones took).

Say which cluster you chose and the per-page numbers that chose it, the
challenge ids the page cites, and the inbound-link count. If you exited
without a page, the numbers that said no are the whole message.
