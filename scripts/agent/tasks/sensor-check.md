<!-- allowed-paths: docs/reads/ -->

You are running unattended on a schedule. Audit the sensors, not the product.

**You may only create or edit files under `docs/reads/`. Touch nothing else.**
No app code, no SQL scripts, no config. You propose nothing and fix nothing —
you report which measurements are lying, so no other agent (or human) builds
on a broken number.

## Why this task exists

Every failure class below was found the hard way, in production, by hand:

- `landing_view` counted "1 distinct user" for weeks because its username is
  the constant `'guest'` — identity lives in `aid`, not username.
- `content_lock_reached` fired ~3 events per click (192ms apart) from a
  re-render, tripling every hit count.
- `staleProRecovered` sat at 0 for 14 days — which turned out to mean "no
  exposure", not "no effect", but nobody was watching.
- The founder's own localhost sessions write to the production database.
  Known contaminated aids: `4a07da304d844d2e96795d4151699219`,
  `d937d99161eb470a8ff28cce04f668eb` — and any new ones logged in
  `docs/agent/ledger.md`.
- Events born mid-window read as fake regressions or fake launches in any
  week-over-week comparison.

## Data access

Supabase MCP `execute_sql`. `pro_events.metadata` is double-encoded jsonb:
`((metadata #>> '{}')::jsonb)->>'key'`, never `metadata->>'key'`. Apply the
standard internal-account exclusions from `docs/agent/metrics.md`.

## The checks

1. **Zeros that must stay zero, and zeros that must not.**
   `feedback_failed` > 0 in the last 7 days = someone tried to reach us and
   could not; flag loudly. `pro_plan_clicked`, `feedback_submitted`,
   `content_lock_reached` at zero for 7+ days = either the funnel died or the
   sensor did; say which is more likely and why.
2. **Multi-fire.** Any event where one user emitted 3+ rows inside 2 seconds
   in the last 7 days. Report events/person ratios. Anything above ~1.5 means
   hit-counts on that event are inflated — name the affected metrics.
3. **Broken identity.** Any event whose distinct-username count over 7 days is
   1 while its row count is 20+. That is a constant-username event; person
   counts on it must use `aid`.
4. **Birth dates.** The birth query in the registry's shared traps — first
   day with 5+ rows per event. Not `min(created_at)`: it is client-supplied,
   and a single skewed clock dates `app_opened` to 2026-03-11 when it was
   born 2026-07-11. List every event born inside the last 14 days — these
   poison any week-over-week comparison that includes them — and any event
   whose `min(created_at)` sits more than a week before its 5-row birth,
   which is a clock-skew row that will fool anyone still using `min()`.
5. **Contamination sweep.** Rows in the last 7 days carrying any aid flagged
   in `docs/agent/ledger.md`. Report count and which metrics they touch.
6. **Ledger discipline.** Any `## Open` entry in `docs/agent/ledger.md` whose
   read date is today or past, still marked `_pending_`. Any entry naming a
   metric absent from `docs/agent/metrics.md` (that read will come back
   `UNDEFINED` — better to know now).

## Output

Write `docs/reads/YYYY-MM-DD-sensors.md`. Lead with a one-line status:
`ALL CLEAR` or `N sensors need attention`. Then one short section per failed
check — what is wrong, which metrics it poisons, what the fix would be (do not
make the fix). If everything passes, the whole report can be five lines; a
quiet report is a successful report.

Do not open a pull request yourself — the runner does that.
