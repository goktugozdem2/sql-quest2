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
