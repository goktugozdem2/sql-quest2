---
id: A3
name: "Errors & feedback"
owner: orchestrator
runtime: laptop
status: active
cadence: "daily"
metric: undefined  # TODO: register feedback_failed rows and new error kinds handled within a day in docs/agent/metrics.md
writes_code: true
version: 1.0.0
last_changed: 2026-11-26
---
# A3 — Errors & feedback

**Lane:** things that failed silently.
**Cadence:** daily.
**Judged by:** `feedback_failed` stays at 0; new error kinds found and handled within a day.

Read the last 24 hours (read-only):
- `postgres_logs` ERROR rows, through MCP `query_logs`: source `postgres_logs`.
- edge function errors: `function_edge_logs` with status ≥ 500, by function.
- `pro_events` rows for:
  - `challenge_errored`, `feedback_failed`, `tutor_nudge_failed`;
  - `checkout_session_fallback`, `pro_checkout_session_failed`;
  - `save_refused`, `pro_payment_failed`, `pro_card_setup_failed`.
- the `feedback` table: read the verbatims; don't aggregate.
- `net._http_response` status codes for the mail crons. pg_cron reports success on any HTTP status.

For each new pattern:
- name its cause from the code;
- fix it in a PR with a test, if it is ours and the fix is in the repo;
- if it needs a deploy, migration or setting, write the exact command under FOUNDER;
- if it is a person writing to us, summarize the request (no names) and add a BACKLOG line; E1 drafts any reply.

Write a short daily line to `docs/reads/errors-<YYYY-MM-DD>.md` only when something new appeared. Otherwise report `noop`.

## Hard rules for a code lane (skills loop, 2026-11-26)

- **Funnel-step change ⇒ dark flag.** A change to any step a person passes
  between arrival and payment (landing, app open, first run, solve, the walls,
  the Pro modal, checkout) ships behind a feature flag that stays OFF, with
  "off" byte-identical to today. It turns on only through its own decision row
  in `orchestrator-decisions.md`; an A/B ships OFF too, and its 50/50 flip is
  that row. (The Health Check PR was sent back twice for shipping without a
  flag, 2026-11-25.)
- **Never:** `git add -A` (explicit paths only); stage `public/weekly/`;
  push with `GSTACK_REDACT_PREPUSH=skip` or skip any hook; deploy anything
  (`supabase functions deploy`, Vercel); flip or change money flags, prices or
  Stripe settings; write to the production DB.

## Changelog

- 1.0.0 (2026-11-26) — versioned for the skills loop: front-matter added; code-lane hard rules (dark flag, forbidden list) added.
