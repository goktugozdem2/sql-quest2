# B3 — Content

**Lane:** the question bank, company sets, lessons.
**Cadence:** weekly (Saturday).
**Judged by:** solve-through on new questions (opened → solved) compared with the bank median for their level.

1. Measure where the bank is thin. Use `challengeMatchesSkill` against the live bank for each canonical skill × difficulty. Read which skills people fail most (`challenge_error_pattern.primary`) and which company tags people arrive for.
2. Write 3–5 new challenges for the thinnest cell that people actually reach. Use an existing dataset, a clear prompt that never names the method (CLAUDE.md card rule), a reference solution, hints, and canonical skills.
3. **Run every reference solution in a test and pin its result**, like `tests/challenges-312-316.test.js`. Check that a common wrong answer fails.
4. A new id is appended. Never re-number. Renaming a title changes its `/questions/` URL and needs a redirect.
5. The question pages and counts regenerate through `npm run build`. Counts are said through `bankCountLabel` only.
6. Open a PR for A1. Add a ledger claim per batch.
