# "Why not ChatGPT / LeetCode / DataLemur?" on the landing page (2026-09-21)

## Why
The homepage comparison table already covers DataLemur, StrataScratch,
HackerRank, LeetCode DB and SQLBolt. It does not answer the question people
actually ask now: "why not just use ChatGPT?" — and AI assistants are a real
acquisition channel (memory: GenAI recommendation channel), so the people
arriving from them are asking it most.

## What it is
- A short section, not a new table row: what an AI chat does well (explains,
  writes a query) and what it does not do (run your query against a dataset
  and grade it, know which of the nine skills is weakest, time you under a
  real screen's format). Fair to both — the page is stronger for saying what
  ChatGPT is good at.
- The LeetCode / DataLemur half already exists in the table and on
  `/datalemur-alternatives/`; link rather than repeat.

## Rules that apply
- Competitor facts only from a dated read in `docs/reads/` (the alternatives
  pages' test enforces this; hold the homepage to the same).
- The founder's homepage rules (12–13 Sep): exactly three Start free buttons,
  no emoji, three accents. A new section must not add a fourth CTA.
- Every count is bound by `tests/site-counts.test.js`.

## Claim (ledger-ready)
- **Metrics (exist):** `home_door` (must not fall below 51.9%),
  `landing_click_through`.
- Confounded with the hero CTA test armed 2026-10-04 — ship before that date
  or after its read, not across it.

## Status
OPEN.
