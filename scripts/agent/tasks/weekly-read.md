<!-- allowed-paths: docs/reads/ -->

You are running unattended on a schedule. Produce the weekly SQL Quest read.

**You may only create or edit files under `docs/reads/`. Touch nothing else.**
No app code, no SQL scripts, no config. If you find a bug, write it in the
report — do not fix it here.

## Data access

Supabase MCP `execute_sql`. Two traps that have bitten every previous read:

- `pro_events.metadata` is double-encoded jsonb. Read it as
  `((metadata #>> '{}')::jsonb)->>'key'` — never `metadata->>'key'`.
- Internal accounts inflate everything. Exclude in every query: username
  matching `^(test|demo|admin|qa)[0-9]*$`, `sqlquest`, `%fabletest%`,
  `linktest%`, `internalroutine%`, and email ending `@datrick.com`,
  `@example.com`, `@mailtest.com`. Also exclude `elena` — a personal contact of
  the founder's, and the highest-solve account on record, so she distorts any
  all-time engagement figure.

Read `docs/data-driven-product.md` first for the metric definitions. Use its
words: **engaged** = 5+ lifetime solves, **activated** = 5+ solves within 7 days
of first_seen, **paid** = a `stripe_webhook` purchase event.

## What to report

Compare the last 7 days against the 7 before it. For each number, state the
delta and whether it is readable.

1. Weekly engaged users (the north star), active users, new users.
2. Solves, challenge opens, next-day returns.
3. Purchase funnel: `pro_modal_shown` → `pro_plan_clicked` → purchases.
   Count **people, not events** — the project's P2 principle exists because
   event counts once made a broken checkout look like three conversions.
   Purchases use the `purchases` metric in `docs/agent/metrics.md`
   (`reason='stripe_webhook'` only — the client duplicate doubles revenue,
   and there is no event literally named `stripe_webhook`).
4. Engaged users who have never been shown the offer. This has been the stated
   constraint since July; report whether it is growing or shrinking.
5. `scripts/funnel-report.sql` §9c — the worst 5 challenges by solve-through,
   min 12 openers.
6. §16 — the feedback table verbatims. Do not aggregate them. If there are
   none, say so plainly; a channel nobody writes to is itself the finding.
7. **Arrival doors.** First-touch `arrivalSrc` of the week's first-contact
   users (distinct people, exclude username `guest` and internal accounts):

   ```sql
   with fc as (
     select distinct on (username) username,
            coalesce(((metadata #>> '{}')::jsonb)->>'arrivalSrc','(none)') as door
     from pro_events
     where event = 'first_challenge_started' and created_at >= :week_start
       and <shared filters>
     order by username, created_at
   )
   select door, count(*) from fc group by 1 order by 2 desc;
   ```

   Report: the top doors vs last week, the **`home` share trend** — `home` is
   a MIX of true-direct and AI-assistant recommendations (payer #2 confirmed
   in writing that "AI recommended me to the site"; AI apps strip referrers,
   so that channel is structurally invisible and `home` is its proxy) — and
   any door that appeared this week that did not exist last week (a
   `ref:m.facebook.com` showing up means someone shared a link somewhere).
   Do not attribute `home` growth to brand or SEO alone.

## The honesty rules

These are not optional. Previous reads went wrong in exactly these ways:

- **Check when an event was born before comparing it week over week.** Several
  events shipped mid-window, so a 5 → 33 jump is a birth, not a regression.
  Run the birth query from the registry's shared traps (first day with 5+
  rows) before you compare — not `min(created_at)`, which a single client
  with a wrong clock drags months early (`app_opened` reads as 2026-03-11;
  it was born 2026-07-11).
- **Never quote solve-through across difficulty bands as if comparable.** An
  Easy at 43% is a worse result than a Hard at 90%.
- **`opened` on emails is structurally zero** — open tracking is off at the send
  call. Do not report it as engagement. `returned_48h` is the email metric.
- If n is too small to read, write "not readable yet, needs N more days" rather
  than reporting a percentage of 4 people.

## Output

Write `docs/reads/YYYY-MM-DD-weekly.md`. Structure: the three numbers that moved
and why, then the tables, then a short "what I could not read and why" section.
Lead with what changed, not with methodology.

Do not open a pull request yourself — the runner does that.
