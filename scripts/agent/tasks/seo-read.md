<!-- allowed-paths: docs/reads/ -->

You are running unattended on a schedule. Produce the weekly SEO read.

**You may only create ONE file, `docs/reads/seo-YYYY-MM-DD.md`. Touch nothing else.**
No pages, no sitemap, no internal links, no app code. This is a sensor, like
`weekly-read`: if a page is an orphan or a door is dead, write it in the report
— the fix belongs to `seo-page` or the human. Line 1 is enforced: `run.sh`
exports it and `guard.sh` fails the run on any file outside `docs/reads/`. A
sensor that fixes things stops being trusted as a sensor.

## Why this task exists

Measured 2026-09-06, last 28 days, `app_opened` people by arrival door,
internal accounts excluded: SEO pages brought **609 of 1047** app arrivals
(58%) — hub/landing 370 people (32% went on to solve), company pages 158
(23%), blog 37 (**5%** — blog traffic does not convert to practice),
comparison 26 (23%), sector 18 (11%). `home` 268 (34%), direct/unstamped 160
(13%). One page, `sql-exercises`, carried **252 people = 41% of all SEO
arrivals**. The README's gate ("the first funnel-sourced payment") was met
twice, 2026-08-23 and 2026-09-01. Multiplying traffic multiplies whatever the
funnel does, so rank doors by **solvers produced, not arrivals** — in July the
untagged door was the biggest and converted at 11% against home's 48%. Cite
the numbers above as the baseline; invent no others.

## Data access

Supabase MCP `execute_sql`. Every trap below has bitten a previous read:

- `pro_events.metadata` is double-encoded: `((metadata #>> '{}')::jsonb)->>'key'`.
- Shared filters from `docs/agent/metrics.md` in every query, plus
  `arrivalSrc <> 'verify-test'` (instrumentation rows).
- **People, not events.** `app_opened` fires on every load. Identity is
  `COALESCE(((metadata #>> '{}')::jsonb)->>'aid', username)`; `aid` was born
  2026-07-28 (the event itself 2026-07-11). Before the stamp, every
  `app_opened` row is username `'guest'` with no `aid`, so `COALESCE`
  collapses the whole pre-07-28 stretch into ONE person named `guest`, while
  the solves of that stretch are keyed `guest_<ts>` and never join. On
  `landing_view` the username is the constant `'guest'` too (it once read as
  "1 distinct user" for weeks): join on `aid` only. The shared username
  filters see nothing on either event, so internal browsers are excluded by
  `aid` — the registry's `internal` CTE plus the ledger's contaminated aids —
  which is how the 2026-09-06 baseline was computed; without them the
  founder's own sessions sit in the denominator as arrivals that never solve.
- Localhost traffic before 2026-09-03 sits inside `(none)`, ~5 people/week.

## What to report

Last 28 days against the prior 28. State the delta and whether it is readable.

1. **Per-door table.** Copy this; do not rewrite it from memory. It is the
   registry's `door_solve_rate` — same identity, same `internal` CTE, same
   contaminated-aid predicate — with a window column and the family and
   cluster roll-ups added, so its numbers are comparable to the baseline.

   ```sql
   WITH ev AS (
     SELECT COALESCE(((metadata #>> '{}')::jsonb)->>'aid', username) AS pid, event, created_at,
            COALESCE(((metadata #>> '{}')::jsonb)->>'arrivalSrc', '(none)') AS door,
            ((metadata #>> '{}')::jsonb)->>'challengeId' AS cid,
            CASE WHEN created_at >= now() - interval '28 days' THEN 'last28' ELSE 'prior28' END AS win
     FROM pro_events
     WHERE event IN ('app_opened','challenge_solved')
       -- never before the aid stamp: pre-07-28 app_opened rows are one person named 'guest'
       AND created_at >= greatest(now() - interval '56 days', timestamptz '2026-07-28')
       AND COALESCE(((metadata #>> '{}')::jsonb)->>'arrivalSrc','') <> 'verify-test' AND <shared filters>),
   internal AS (   -- registry rule: a browser that ever wrote a row under an internal username, on any event
     SELECT DISTINCT ((metadata #>> '{}')::jsonb)->>'aid' AS pid
     FROM pro_events
     WHERE NOT (<shared filters>) AND ((metadata #>> '{}')::jsonb)->>'aid' IS NOT NULL),
   people AS (SELECT DISTINCT ON (win, pid) win, pid, door FROM ev        -- one row per person per window;
              WHERE event = 'app_opened'                                   -- the door is their first app_opened
                AND pid NOT IN (SELECT pid FROM internal)
                AND pid <> ALL (:contaminated_aids)                        -- the list in docs/agent/ledger.md
              ORDER BY win, pid, created_at),
   solves AS (SELECT win, pid, count(DISTINCT cid) AS solves FROM ev WHERE event = 'challenge_solved' GROUP BY 1, 2)
   SELECT p.win, p.door,
          -- best-sql-practice-sites is hub-landing, not comparison: the 09-06 baseline (hub 370 / comparison 26)
          -- only reproduces with it there, and seo-page calls it a hub page. Move it and the first report prints
          -- a fake -46/+42 delta and comparison reads as the best-converting family.
          CASE WHEN p.door = 'home' THEN 'home'
               WHEN p.door ~ '^(company|sector|ref):' THEN split_part(p.door, ':', 1)
               WHEN p.door ~ '^blog(-|$)' THEN 'blog'
               WHEN p.door ~ '^vs-' OR p.door IN ('sql-practice-comparison','datalemur-karsilastirma') THEN 'comparison'
               WHEN p.door IN ('email','(none)') THEN p.door ELSE 'hub-landing' END AS family,
          -- lower(): the stamp keeps ?company= as typed (company:Snowflake); a lowercase list matched nothing
          CASE WHEN lower(p.door) IN ('company:stripe','company:plaid','company:ramp','company:revolut',
                                      'company:wise','company:jpmorgan','company:morgan-stanley') THEN 'fintech'
               WHEN lower(p.door) IN ('company:snowflake','company:databricks','company:nvidia') THEN 'datainfra'
               WHEN lower(p.door) IN ('company:amazon','company:google','company:meta','company:apple','company:netflix') THEN 'faang'
               WHEN p.door IN ('analyst-interview','sql-interview-prep','after-the-sql-course','after-bootcamp','sql-for-the-ai-era') THEN 'query-space'
               WHEN p.door LIKE 'company:%' THEN 'company-other' END AS cluster,
          count(*) AS arrivals,
          count(*) FILTER (WHERE s.solves >= 1) AS solvers,
          count(*) FILTER (WHERE s.solves >= 5) AS reached_5
   FROM people p LEFT JOIN solves s USING (win, pid)
   GROUP BY 1, 2, 3, 4 ORDER BY p.win, solvers DESC, arrivals DESC;
   ```

   Report the family roll-up and the **top 15 raw doors, ranked by solvers**.
   `reached_5` is 5+ distinct challenges *inside the window* — a floor on the
   canonical **engaged** (5+ lifetime), because guests have no `users` row;
   call it "reached 5 in-window". **The prior window is not readable until
   the 2026-09-21 run.** `now() - 56 days` reaches before the `aid` stamp on
   every earlier Monday; the `greatest(...)` gate trims that stretch off
   rather than letting `COALESCE` fold it into one arrival named `guest`
   (ungated, the first run's delta would have printed 1 → 1045). When the
   gate has trimmed anything, print `last28` only, with the line "no
   readable prior window until the 2026-09-21 run" — a hedge under a printed
   delta does not stop the delta being read. The 09-21 run's prior window is
   27 days, not 28; say so on that run.
2. **Concentration.** Over `last28` rows whose family is not `home`, `(none)`,
   `email` or `ref`, the top raw door's share of SEO arrivals — 41% on
   `sql-exercises` today. **Flag any single page above 35%**: one lost
   ranking would take a third of the SEO funnel with it.
3. **Landing view → app click-through per page.** Run the registry's
   **`landing_click_through` SQL from `docs/agent/metrics.md` verbatim** —
   it is the definition `verify` measures under that name, so a rewrite here
   produces a column called `click_through_pct` that means something else.
   An earlier draft of this step did exactly that: it joined any `app_opened`
   since `:since` regardless of order or distance (a browser that opened the
   app and later read a page counted as clicked through), had no `:until`,
   and dropped the `internal` CTE — the shared username filters are a no-op
   on `app_opened`. Parameters: `:until = now() - interval '7 days'` (the
   registry requires it at least 7 days back, so every view has its full
   window), `:since = :until - interval '28 days'`, `:contaminated_aids` from
   the ledger. Report the new-visitor read (`WHERE NOT v.returning`
   uncommented) as the comparable number, the all-in read beside it.

   One predicate to add inside the `views` subquery, because of the tracking
   hole on the four main pages:

   ```sql
   AND (((metadata #>> '{}')::jsonb)->>'page'
          NOT IN ('home','after-the-sql-course','after-bootcamp','sql-for-the-ai-era')
        OR created_at >= timestamptz '2026-09-06')
   ```

   **`landing_view` on `home`, `after-the-sql-course`, `after-bootcamp` and
   `sql-for-the-ai-era` has a hole in it**: tracked 2026-07-28..08-04 (the
   `home` rows there include the 08-03 GSC crawler burst), untracked
   08-05..09-05 — the injector skipped any page mentioning "/track.js" in a
   comment — and live again from 2026-09-06. Read those four from 09-06 only;
   a `min(created_at)` of 07-28 on `home` is the pre-gap build, not a
   baseline. The first clean 7-day read for them is 2026-09-13; until
   2026-10-04 there is no full 28-day window and the read is "baseline
   forming" — say so. A burst of one-view aids sharing a timezone is a
   crawler past the UA filter (47 aids, all America/Los_Angeles, 08-03).
4. **Cluster read.** From step 1's `cluster` column, `last28` only: arrivals,
   solvers, reached_5 and **reached_5 per live page** — pages counted from
   `src/` at run time (`ls src/*-sql-interview.html`), not doors that got
   traffic; a page with zero arrivals is still a page. Membership is
   `COMPANIES` in `scripts/build-company-crosslinks.mjs`; if it disagrees with
   the CASE, the script wins and you note the drift. Baseline: fintech/data
   (Revolut 33, Snowflake 27, Wise 14, Stripe 14) and the `analyst-interview`
   query space (12 — the GenAI channel; payer #2 was sent by Gemini for
   "analytics prep") are the working clusters.
5. **Orphan check.** Read-only. A sitemap entry is discovery, not a crawl
   signal: the four fintech pages sat unindexed for a week with zero inbound
   links while Bing reported the sitemap healthy.

   ```bash
   for u in $(grep -oE '<loc>[^<]+</loc>' public/sitemap.xml | sed -E 's#</?loc>##g; s#^https://sqlquest.app##'); do
     [ "$u" = "/" ] && continue
     own="src/${u#/}"; own="${own%/}.html"; [ "$u" = "/blog/" ] && own=src/blog/index.html
     n=$(grep -lE "href=\"(https://sqlquest.app)?${u}\"" src/*.html src/blog/*.html 2>/dev/null | grep -vxF "$own" | wc -l)
     [ "$n" -eq 0 ] && echo "ORPHAN $u"
   done
   ```

   List every orphan and the delta against the previous `seo-*.md` read
   (2026-09-06: one, `/sql-for-the-ai-era/`). The Turkish sector pages,
   `/challenges/*` and the legal pages have no `src/` source (committed files
   under `public/`; the nav links sectors as `/app.html?sector=…`) — if they
   appear, say so: `seo-page` cannot edit them, only the human can.
6. **Next page candidate.** One paragraph, ranked by reached_5 per page from
   step 4, naming the cluster and the gap. If the top door is over the 35%
   line, a candidate that diversifies the hub family outranks one more company
   page. A **recommendation only** — `seo-page` decides, and may decide not to.

## The honesty rules

- **Check when a door was born before comparing it.** `ref:` fallback
  2026-07-24, `aid` 2026-07-28, `app_opened` 2026-07-11, homepage
  `landing_view` 2026-09-06 after a 08-05..09-05 hole. Birth is **the first
  day with 5+ rows** — the query in the registry's shared traps — never
  `min(created_at)`: `created_at` is client-supplied, and one skewed clock
  put an `app_opened` at 2026-03-11, four months before the event existed.
  A door that went 0 → 40 because its stamp started existing is not growth.
- **`home` is a mix** of true-direct and AI-assistant recommendations — AI
  apps strip referrers, so `ref:chatgpt.com` never fires for them. Do not
  attribute `home` movement to brand or SEO alone.
- A door under 12 arrivals gets counts, not a percentage: "not readable yet,
  needs N more days", never 2 of 7.
- **Say what you could not read.** GSC is not available to the fleet — no
  API access — so impressions, rankings and search click-through are
  unknowable here; do not guess at them, and do not read an arrivals drop as
  "ranking lost" when it could be seasonality, a core update or a removed
  link. Whether Google has crawled a new page is invisible from SQL; Bing and
  IndexNow likewise. Vercel Analytics is Hobby, no custom events; do not cite it.

## Output

Write `docs/reads/seo-YYYY-MM-DD.md`. Lead with the three doors that moved and
why, then the tables, then "what I could not read and why". "Same as last
week, no new orphans, no page over 35%" is a successful run — a quiet sensor
is the finding. If something is broken, write it in the report; do not fix it.

Do not open a pull request yourself — the runner does that.
