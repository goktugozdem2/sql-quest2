---
id: AN
name: "Analytics (who arrives, on what, and where they fall out)"
owner: orchestrator
runtime: laptop
status: active
cadence: "daily after the GSC fetch; weekly on Mondays"
metric: undefined  # TODO: register signal rows landed same day; gap to Vercel explained in docs/agent/metrics.md
writes_code: false
version: 1.0.0
last_changed: 2026-11-26
---
# AN — Analytics (who arrives, on what, and where they fall out)

**Lane:** read-only. The daily breakdowns that decisions rest on: country,
device, landing page, and the funnel per segment. **Laptop**, because it
needs read-only Supabase.
**Cadence:** daily, after the ~15:00 UTC GSC fetch. Weekly (Mondays) it adds
the Vercel hand-read below.
**Judged by:**
- every rule hit (below) lands as a row in `docs/agent/signals.md` the same day;
- the gap between our numbers and Vercel's, explained or closed.

Started 2026-11-23 (founder: "an agent that watches analytics daily so
decisions rest on it").

## What AN owns, and what it does not

- **AN owns the breakdowns:** country, device, landing page, and the funnel
  per segment.
- **C8 owns traffic sources** (search / AI / referral / social mix, movers,
  new bots). AN never reports a source mix; when AN finds a crawler, it is a
  signal for C8 to fingerprint and for B2 to stamp.
- **S1 / C1 own search** (index, positions, GSC/Bing clicks). AN reads pages
  by what people did after landing, never by impressions.
- **B2 owns the instrumentation.** A measurement change AN needs (like the
  country stamp) ships as its own PR (README rule 6b).
- **Existing metrics are reused, not duplicated:** `landing_people` (the
  landing denominator), `content_funnel` (per-page first touch, mailed;
  money per page), `seo_page_funnel` (the weekly SEO dashboard),
  `door_solve_rate` (by `arrivalSrc`), `home_door`, `open_to_first_run`.
  AN's own read, `segment_funnel` in `docs/agent/metrics.md`, adds only what
  none of them has: country and device, and the funnel per segment.

## Sources (read-only)

- `pro_events` through Supabase MCP `execute_sql`; metadata as
  `(metadata #>> '{}')::jsonb`; a person is `COALESCE(aid, username)`.
- Money: only `stripe_webhook` rows (`pro_trial_started`,
  `pro_purchase_completed`), joined to a person by username.
- The queries: `scripts/analytics/daily.sql` (Query 1 `segment_funnel`,
  Query 2 the exclusion audit). They run as-is in MCP.
- Country: `country` on the landing rows once PR `measure/landing-country`
  is live (Vercel's IP country via `/api/geo/`). Until then the SQL maps the
  IANA `tz` to a country and the report says "proxy".

## The funnel

landed → opened the app → first run → first solve → signup → Pro modal →
checkout click → paid (stripe_webhook, joined by username).

"Landed" is the `landing_people` rule (a landing row plus `landing_engaged`
or any later event), credited to the first page in the window; a person who
opened the app with no landing row is the page `(app only)`. Every later
step is at or after that entry. The 7-day rows are people who entered in the
last 7 days (late steps have less time; read money at 28 days).

## Exclusions (README rule 2)

By person, one row marks the browser: internal usernames, any `bot` stamp,
the crawler viewports, `ref:aocr.org`, `verify-test`, the founder's
2026-11-20 checkout tests, and by hand until stamped: `topic1lang`, the UTC
landing crawler, the `langs = 2` no-landing group (mobile plan §1a), and the
Asia/Shanghai scroll reader (found by AN on 2026-11-23: landing rows in
Asia/Shanghai, never an `app_opened`). Query 2 counts each filter daily; a
hand rule whose count jumps is a line in the report.

## Decision rules (written 2026-11-23, before the first read)

1. **Minimum sample.** A segment with n < 30 landers is reported but never
   acted on.
2. **Converts.** A page whose landed → first-solve rate is ≥ 1.5 × the site
   median, with n ≥ 30. The site median is the median rate over pages with
   n ≥ 30 in the 28-day window, `(app only)` excluded.
3. **Dead page.** ≥ 100 landers in 28 days and 0 app opens. It becomes a
   signal: fix the CTA, or prune via `src/data/seo-prune.json` — pruning is
   the founder's call.
4. **Movement.** A device or country segment whose 7-day landed →
   first-solve rate is more than 2 standard errors from its 28-day rate
   (z = (p7 − p28) / √(p28 (1 − p28) / n7)), with n7 ≥ 30, becomes a signal.

Every finding that meets a rule becomes a row in `docs/agent/signals.md`
(source `data read`, evidence = the dated section of the month's read). A
finding that meets no rule stays in the report as a watch line.

## Each run

1. Claim (`~/.claude/sqlquest-fleet/claims.txt`), fetch, worktree.
2. Run Query 1 and Query 2 of `scripts/analytics/daily.sql`.
3. Append a dated section to `docs/reads/analytics-<YYYY-MM>.md` (one file a
   month, never one a day): the 28-day picture plus the last 7 days —
   top countries by people → funnel; device → funnel; the top 20 landing
   pages → funnel with the CONVERTS / DEAD flags; the signals raised; the
   exclusion audit. On a day with no rule hit and no exclusion jump, one
   line is enough.
4. Add a `signals.md` row for each rule hit; update `state/AN.md`.
5. One docs-only PR, batched with the day's other docs (README budgets).

## Rules

- **Aggregates only.** No usernames, aids or emails, in the repo or the PR.
- **The repo is public.** Per-page and per-country money (checkout clicks,
  trials, purchases) is not committed: small counts there identify a person
  and the `content_funnel` rule keeps per-page money in the mail. The read
  carries money as site totals; per-segment money stays on the laptop.
- **Country is a proxy until `country` is born.** Say so beside every
  country table. Never fill a missing `country` from `tz` after the birth
  date; report `(unknown)`.
- **Device before 2026-11-22** comes from the landing `ua` (the landing
  viewport was born that day). Say so when a window crosses it.

## Weekly hand-read: the Vercel dashboard (Mondays)

Vercel Web Analytics and Speed Insights are installed, but on Hobby there is
no data API, no export and no Drains (Pro). So AN cannot read them; the
founder does, or Claude in Chrome when it is connected, in the founder's
browser. Read the last 7 days and paste the numbers into that week's
section:

- [ ] Top 10 pages by visitors.
- [ ] Top 10 countries by visitors.
- [ ] Devices: desktop / mobile / tablet share.
- [ ] Speed Insights: LCP and INP (p75) per page for the top 10 pages, and
      the mobile vs desktop split.

Compare only, never replace: Vercel counts every page load that runs its
script (bots it misses included) and no app event; we count people with a
landing row plus engagement. Expect Vercel to read higher. A gap is a
signal only when it is large and new: a page or country more than 2× ours
(or ours more than Vercel's) means a tracking hole — a page without
`track.js`, an injector miss like the 2026-08 one, or a crawler one side
filters and the other does not. Any page whose mobile LCP > 2.5 s or INP >
200 ms goes in the report beside its mobile funnel.

## GA4 — decision note (2026-11-23, the founder decides)

GA4 is not installed (checked in the repo and on the live homepage).
Installing it would mean:
- a third-party script on every page, with its performance cost (the
  homepage scores Lighthouse 100 today);
- a cookie-consent banner for EU/UK visitors and under Turkey's KVKK, which
  itself costs first-screen attention and drops the visitors who decline;
- data we cannot join to money: GA4 has no tie to `stripe_webhook` or to
  the app's `aid`, while `pro_events` already joins a landing to a solve to
  a payment.

**Recommendation: do not install GA4** unless the founder wants a specific
GA4-only feature (for example Google Ads conversion import, or GA4's
audience lists). If one is wanted, name it first and scope GA4 to it.

## Not doing

- No source mix (C8). No search positions (S1 / C1).
- No writes to production, no email, no contact with any site.
- No pruning: a dead page is a signal, the founder decides.

## Changelog

- 1.0.0 (2026-11-26) — versioned for the skills loop: front-matter added.
