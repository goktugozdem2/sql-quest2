# Query review — paste a work query, get a review (2026-09-21)

Part of `post-hire-track-2026-09-21.md`.

## Why
Once hired, the useful question is no longer "is this right against a
reference?" but "is this query I wrote at work correct, readable and safe?".
There is no reference to diff against — only the query.

## What it is
- A box: paste a query (and optionally the schema). Get a review: likely
  defects (fan-out joins, NOT IN over a nullable column, bare-date upper bounds,
  average of averages — the patterns `diagnose.js` and the Capital One MCQs
  already name), readability, and one suggested rewrite.
- The static half comes from `src/utils/sql-tools.js` (checker / explainer /
  optimizer, already live on the free tools pages). The tutor adds the
  judgement.

## What it does not change
- The tutor's daily caps (`supabase/functions/ai-tutor`). A review is a tutor
  call and counts as one.
- Never call it "unlimited" (site-wide rule).

## Risk — privacy
A work query can carry a company's schema, table names and literal customer
values. **The pasted query is never stored server-side and never written to
`pro_events`** — events carry length and rule hits, not text. Say so next to
the box. This is the condition for building it at all.

Not stored is not the whole story (founder, 2026-09-21): the query still goes
to the AI provider to be reviewed. So, before the box ships:
- **The privacy policy says it plainly** (`/privacy/`): pasted queries are
  sent to our model provider for the review and are not retained by SQL
  Quest. The same sentence sits next to the box.
- **No third-party analytics sees it** — not Vercel Analytics, not any
  session tool, not error reporting payloads. The pasted text is excluded
  everywhere, not just from `pro_events`.

## Claim (ledger-ready)
- **Metric:** `query_review_use` — Hired users running at least one review a
  week. **Not in `docs/agent/metrics.md`**; define at build start.

## Status
OPEN.
