# Gate decisions (A0) — append only

The founder audits the gate here. The brief is `A0-gate.md`. Each row has:
the date (UTC), the PR, the decision (merged / held / rejected / reverted),
the reason in one line, and the risk sentence.

| date | PR | decision | reason | risk |
|---|---|---|---|---|
| 2026-11-22 | #135 | already merged | Merged 10:24 UTC by the founder's account before this pass; A1 MERGE on record. Logged for the audit trail. | Phone header layout; a regression shows on the first phone visit and the smoke header check. |
| 2026-11-22 | #136 | already merged | Merged 10:25 UTC by the founder's account before this pass; A1 MERGE on record. | Footer wrap on 24 pages; worst case is sideways scroll on a phone, seen in the next A2 overflow pass. |
| 2026-11-22 | #132 | already merged | Merged 10:57 UTC by the founder's account before this pass; A1 MERGE on record. | Five new Easy challenges; a wrong reference solution blocks a solve, and `tests/challenges-320-324.test.js` runs each one. |
| 2026-11-22 | #131 | merged | Docs only (fleet queue, A0/A4 briefs, this log). The CLAUDE.md lines record the founder's own delegation quote and keep every held kind. `verify` green; Vercel red is the Hobby rate cap; deploys after the reset. | None for a person: no page, app or test change. If the delegation text is wrong, the founder edits one file. |
| 2026-11-22 | #140 | merged | Docs only (C3 backlink queue). A1 MERGE on head b43f4d9. Merging sends nothing: six hand sends stay with the founder, targets 4–6 behind their check list. Deploys after the reset. | None on the site. The risk is outward and sits with the founder at send time, not at merge. |
| 2026-11-22 | #134 | merged | A1 MERGE on 2c6cdfb. A0 merged origin/main in (133a627): vs-sqlzoo takes 99 Easy + 34 company pages, ledger keeps both claims, output rebuilt. Build clean, 2,913 tests, lint 0 errors, `verify` green. Deploys after the reset. | A wrong format fact on /chime-sql-interview/ misleads a candidate; every fact traces to three dated PracHub reports A1 re-fetched. Page only, no app path, a revert PR undoes it. |
| 2026-11-22 | #142 | merged | A1 MERGE on bd8d8db. Test edits generalise the dated-read guard to a READS registry, none removed. A0 merged origin/main in (45120de) after #134: branch copy, main's 34 company pages, both ledger claims. Build clean, 2,926 tests, lint 0 errors, `verify` green. Deploys after the reset. | A stale competitor price on five comparison pages; each price rests on the laptop's 11-22 read, which no cloud session could re-fetch. Seen only by a reader or the vendor, a revert PR undoes it. |
