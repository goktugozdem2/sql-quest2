<!-- allowed-paths: docs/agent/ledger.md -->

You are running unattended on a schedule. Close the loop on shipped changes:
measure whether they did what they claimed, and record the verdict.

**You may only edit `docs/agent/ledger.md`.** No app code, no SQL scripts, no
config, no metric definitions. If a metric is missing or a query is wrong,
write that in the ledger — do not fix it here.

## Step 1 — find what is due

Read `docs/agent/ledger.md`. Every entry under `## Open` has a **Read on** date.

Take only the entries whose read date is **today or earlier**. If none are due,
**make no change and exit** — a run that writes nothing is a successful run.
Do not measure something early to have output; an early read on a 7-day window
is an `UNREADABLE` you generated yourself.

## Step 2 — measure

Read `docs/agent/metrics.md`. It is the only source of metric definitions.

- If the entry's metric is **not** in that file, the verdict is `UNDEFINED`.
  Record it and move on. Do not invent a query. A number you improvised reads
  exactly like a measured one and will be trusted like one.
- Otherwise run the registry's SQL through the Supabase MCP `execute_sql`,
  substituting the entry's parameters.

Two checks before you believe any number:

1. **Event birth dates.** Use the birth query in the registry's shared traps
   — first day with 5+ rows — not `min(created_at)`. `created_at` is
   client-supplied, and one skewed clock put an `app_opened` at 2026-03-11,
   four months before the event existed; `min()` would pass a window
   reaching back to April as clean. If an event in your query was born
   inside the comparison window, the metric is `UNREADABLE` — say which
   event and when it shipped. A jump from 5 to 33 because the event started
   existing is not a result.
2. **n.** If either side of the comparison is under ~12 people, the verdict is
   `UNREADABLE`. State the actual n. Do not report a percentage of four people.

## Step 3 — write the verdict

Move the entry from `## Open` to `## Closed` and append:

```
- **Measured** <date> · <metric> = <value> (n=<n>), baseline <baseline>
- **Verdict** HIT | MOVED | FLAT | MISS | UNREADABLE | UNDEFINED
- **Read** <one or two sentences: what the number says, and what it does not>
```

Rules for the verdict line, all of which have bitten this project before:

- **Honour stated confounds.** If the entry names a confound, you may not
  report a clean causal read. Say which part is readable and which is not.
- **`UNREADABLE` is never rounded to `FLAT`.** They mean opposite things: one
  is "no signal available", the other is "signal available, no movement".
- **A metric with no pre-period cannot show a delta.** First read establishes a
  baseline. Say so; do not present it as an improvement.
- **Compare within a difficulty band.** An Easy at 43% is worse than a Hard at 90%.

If the result is `MISS` or `FLAT`, say plainly that the change did not work.
That is the outcome this file exists to capture — a ledger that only records
wins is a marketing document, and the next triage decision will be made on it.

## Step 4 — leave the rest alone

Entries not yet due stay in `## Open`, untouched. Do not reword them, do not
"tidy" baselines. A claim is evidence of what was believed at merge time; edit
it and the ledger stops being a record.

Do not open a pull request yourself — the runner does that.
