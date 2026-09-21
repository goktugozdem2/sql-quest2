# Account data out of one JSON blob (2026-09-22)

**Roadmap, not urgent** (the database is 62 MB). Founder's framing: the
single-blob architecture is the common root of two problems.

## The two problems
1. **Write volume.** Every client save rewrites the whole `users.data` blob —
   up to 500 attempts, query history, reports — for a one-field change.
   pg_stat_statements since 2026-01-20: ~2.8 GB of WAL from those upserts.
2. **Last writer wins.** Two writers of one blob (a guest session and the
   account, two tabs, two devices) overwrite each other's work. The
   guest-over-account bug of 2026-09 is this shape; `progress-merge.js`
   (2026-09-12) patches it at login by merging, but any path that writes
   without merging can still clobber.

## What it is
Append-only facts in their own tables, keyed by account:
- `challenge_attempts (username, challenge_id, success, ts, …)` — insert only
- `solves (username, challenge_id, first_solved_at)` — unique pair, insert-if-absent
- `mock_sittings (username, interview_id, ts, score, …)`
`users.data` keeps small, genuinely scalar state (settings, streak markers).
Inserts cannot overwrite each other, so the merge problem disappears for the
facts that matter, and a save writes a row, not a blob.

## Order
Only after `account-session-tokens-2026-09-22.md` — new tables written by
the anon key would repeat the write hole. Then: dual-write, backfill from the
blobs, move readers table by table (skill radar, Coach, senders), stop
writing the fields into the blob.

## Status
OPEN — roadmap.
