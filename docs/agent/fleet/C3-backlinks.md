---
id: C3
name: "Backlinks & distribution"
owner: orchestrator
runtime: laptop
status: reduced
cadence: "twice a week (Mon, Thu) since 2026-11-25"
metric: [external_links]
writes_code: false
version: 1.0.0
last_changed: 2026-11-26
---
# C3 — Backlinks & distribution

> **Cadence 2026-11-25 (investor 90-day plan, A10): twice a week (Mon, Thu)**, aimed at the lists assistants cite and data newsletters; live-link check each run.

**Lane:** earned links and mentions. Never bought, never spammed.
**Cadence:** twice a week, Mon and Thu (since 2026-11-25; was daily from the founder's 2026-11-22 ask), in small batches: 2–3 new targets a run into the open queue, plus a check of which links went live. **Laptop**, because it creates Gmail drafts. If the founder has sent nothing from the queue for 7 days, stop adding targets; until he sends, only check live links.
**Judged by:** links earned per month (live links found pointing at sqlquest.app).

1. Find 2–3 targets a day (5–8 on the first run of a week) where a link genuinely helps the reader:
   - GitHub "awesome" SQL / data-interview lists;
   - bootcamp and university course resource pages;
   - data-career newsletters that take tool tips;
   - recent Q&A threads where a worked SQL answer helps (answer first, link only if it's the best next step);
   - communities whose rules allow tools.

   Check each one's rules and its last activity date.
2. For each target, write in `docs/outreach/queue-<week>.md`, one file per week (Monday's date); append to it:
   - what it is, why it fits, and the exact page we'd suggest;
   - a draft in the founder's voice (CLAUDE.md Email voice, plus linkedin-voice.md for social);
   - for a PR to a GitHub list, the exact diff text.

   Never write anyone's personal email address in the repo. Store a role address or a contact page only.
3. Gmail: create drafts for email targets. Never send.
4. GitHub list PRs are outward posts. Leave them under FOUNDER with the ready text; don't open them.
5. Check last month's queue: which links went live (search for them), and mark them in the file.
6. Docs PR, self-merged.

## Changelog

- 1.0.0 (2026-11-26) — versioned for the skills loop: front-matter added.

## Target types (orchestrator, 2026-11-28)

Three runs in a row found no email target for the money pages: every page about those interviews is a competitor's or a candidate thread. From 2026-11-30, in this order:
1. **Educators who already teach the mistake one of our trap pages shows** (`/sql-not-in-null/` etc.); offer the trap page, never a sales page.
2. **Maintained university guides with a team inbox** (MIT CAPD, Northwestern research computing); offer `/sql-exercises/`.
3. Money-page targets only when one actually appears (a thread or list that names Capital One / Revolut prep).
A linkable practice dataset is B3's item, not C3's (decision row 2026-11-28).
