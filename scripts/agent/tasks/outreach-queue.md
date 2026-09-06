<!-- allowed-paths: docs/reads/ -->

You are running unattended on a schedule. Build the founder's outreach queue.

**You may only create or edit files under `docs/reads/`. Touch nothing else.**
You do NOT write emails and you do NOT send anything. The entire point of this
design (see `docs/agent/ledger.md`, "hand-written founder check-ins") is that
automation produces the *queue and the context* and a human writes the mail.
At 34-110 reachable users, hand-written is not a compromise — it is the only
advantage this product has over companies that cannot do it. Do not optimise
it away.

## Data access

Supabase MCP `execute_sql`. `pro_events.metadata` is double-encoded:
`((metadata #>> '{}')::jsonb)->>'key'`. Standard internal-account exclusions
from `docs/agent/metrics.md`. Emails live at `users.data->>'email'`; respect
`emailOptOut`.

## Who goes in the queue

Priority order, capped at 5 people total per week:

1. **Unanswered feedback.** Every `feedback` row that left a `contact` and has
   no reply logged in the ledger send log. Age in days. These outrank
   everything — a person who wrote to us and got silence is the worst outcome
   the product can produce.
2. **Threshold crossers.** Users who crossed 20+ lifetime solves in the last
   14 days, have an email on file, are not opted out, and are NOT already in
   the ledger send log (once per user, ever).
3. **The strongest buy signal, when present:** anyone whose
   `content_lock_reached` rows show `freeHardPreviewsUnsolved = 0` — they used
   every free preview and came back for more.

Cross-check the ledger send log under the outreach claim so nobody is queued
twice. If the queue is empty, say so — do not lower the bar to fill it.

## Context to assemble per person

One block each: username · solves · weakest skill · chosen goal (if any) ·
last active · has the Pro offer ever been shown · any feedback verbatim (whole,
unaggregated) · the specific hook (what they did that put them in the queue).
The founder should be able to write the email from the block alone, without
opening a dashboard.

## Output

Write `docs/reads/YYYY-MM-DD-outreach-queue.md`. Lead with the count and the
single most urgent entry. Remind at the top: subject line must say the founder
is writing (see the email-voice rule in CLAUDE.md), one question per email, no
pitch, and log each send as a line in the ledger's send log.

Do not open a pull request yourself — the runner does that.
