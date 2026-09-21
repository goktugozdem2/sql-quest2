<!-- allowed-paths: src/data/feature-flags.js:public/data.js:public/app.js:docs/agent/flag-queue.md:docs/agent/ledger.md -->

You are running unattended on a schedule for SQL Quest. Your job: flip AT
MOST ONE feature-flag row, exactly as `docs/agent/flag-queue.md` allows, or
change nothing. A run that changes nothing is a successful run — say why and
stop.

Read first: `CLAUDE.md`, then `docs/agent/flag-queue.md` (the rules and the
queue), then `src/data/feature-flags.js`.

Data access: the Supabase MCP `execute_sql` (read-only), as the `verify`
and `weekly-read` tasks use it. `pro_events.metadata` is double-encoded JSON text: read a
key with `((metadata #>> '{}')::jsonb)->>'key'`; the person id is the `aid`
key inside metadata. Internal accounts to exclude everywhere: usernames
test2, sqlquest, elena, and patterns fabletest%, linktest%, internalroutine%.
Never write to the production database. Never touch the `users` table.

Steps:

1. Take the first row in "The queue" whose Status is `queued` or `needs Go`.
   - `needs Go` with no `Go: <date>` in the row → stop. Write nothing.
2. Check rule 1: the Log's last `Flipped` date is at least 7 days before
   today (UTC). If not → stop, write nothing.
3. Check rule 2: today is on or after the row's Earliest (for "flip #N + 7 d",
   the Log's date for row N plus 7 days). If not → stop, write nothing.
4. Check rule 3 (skip for row 1): `first_solve_10m` as defined in
   `docs/agent/metrics.md` over the 7 days since the last flip vs the 7 days
   before it. If it fell by more than 3 points → do NOT flip; add the two
   numbers and their n to the row's Status cell as `halted <date>: <a>% → <b>%
   (n <x> / <y>)` and stop. That one edit is the whole change.
5. Flip: in `src/data/feature-flags.js` change that row's flag(s) from `false`
   to `true`, and add one comment line to each flag's block:
   `// Flipped <date> by flag-flip (docs/agent/flag-queue.md row <#>).`
   Change nothing else in that file.
6. `npm run build`. Confirm `public/data.js` contains `<flag>:!0` for each
   flipped flag. If the build changed files outside the allowed paths, stop
   and report — do not commit around it.
7. In the queue, set the row's Status to `PR open <date>`. Do NOT fill the
   Log's Flipped cell: the flip is the founder's merge, not this PR; write
   `pending merge` there with today's date.
8. In `docs/agent/ledger.md`, in the flag's existing claim, add one bullet
   directly above its `- **Verdict**` line:
   `- **Flip proposed** <date> by flag-flip, PR pending; Flipped at = the merge time, Read = merge + <the claim's own window>.`
   Edit no other text in the ledger.

Your final message (it becomes the PR's log) says, in Turkish, in under 120
words: which row, which flag(s), the guardrail numbers (or "row 1, no
guardrail"), and the ledger claim's metric and read window.

Never flip more than one row. Never touch a money row without its Go. Never
revert a flag. Never edit rules or other rows of the queue.
