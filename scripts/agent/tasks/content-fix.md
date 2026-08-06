You are running unattended on a schedule. Improve the single worst-performing
challenge description in the bank.

**You may only edit `src/data/challenges.js`, and only the text fields of ONE
challenge.** Specifically: `description`, `description_tr`, `hint`, `hint_tr`,
`example`, `example_tr`. You must NOT change `id`, `difficulty`, `solution`,
`tables`, `skills`, `category`, `dataset`, or `xpReward`, and you must not touch
any other challenge or any other file.

Changing the solution or the difficulty is a curriculum decision, not a copy
fix. Those belong to a human.

## Step 1 — pick the target from live data

Supabase MCP `execute_sql`. Use the query in `scripts/funnel-report.sql` §9c —
it is already correct, including the paired numerator, the shared 2026-07-18
window, and the internal-account filter. Copy it; do not rewrite it from memory.

Pick the challenge with the **lowest solve-through among those with at least 12
openers**, skipping any whose description was already edited in the last 14 days
(`git log --since='14 days ago' -p -- src/data/challenges.js` will show you).

If every qualifying challenge was recently edited, or none is below 70%
solve-through, **make no change and exit**. A run that proposes nothing is a
successful run. Do not lower the bar to have something to do.

## Step 2 — diagnose before you write

Read the challenge's `description` and its `solution` side by side and find the
specific mismatch. The known failure mode, which cost this project its worst
challenge, is a description that **names output column aliases as if they
already exist in the table**. Challenge 1 asked for `total` and `survivors`,
which the user has to create with `AS`; nothing said so, so the obvious query
errored and the error explained nothing. 24% solve-through against 73% for the
challenge written to be first.

Look for that shape, and for: tables referenced that are not in `tables[]`,
required ordering or limits that are implied but never stated, and expected
output columns that the description never names.

Also check `challenge_errored` rows for that id — the error text tells you what
people actually typed.

## Step 3 — rewrite

Keep the voice of the surrounding challenges. Read three neighbours first.

- State plainly which columns come from the table and which the user must build.
- Name the expected output columns exactly as the grader expects them.
- State ordering and limits if the solution depends on them.
- Backticks render as `<code>` and `**bold**` renders as bold — both work in
  descriptions. Use backticks for column and table names.
- **Write the Turkish fields too.** `description_tr` and `hint_tr` are not
  optional; a half-translated challenge is worse than an untranslated one.

## Step 4 — verify before you finish

- `npm run test:run` must pass.
- Re-read your new description against `solution` and confirm a competent
  beginner could produce that exact query from your text alone.
- Confirm your diff touches exactly one challenge. `git diff --stat` should show
  only `src/data/challenges.js`.

## Step 5 — write the rationale

Put it in the file? No. Leave the working tree clean apart from the edit. The
runner opens the PR; state your reasoning in the final message instead:
which challenge, its measured solve-through and opener count, the specific
defect you found, and what you changed. Quote the old and new description.

If you could not find a concrete defect — the numbers are bad but the wording
looks fine — say so and change nothing. "The content is fine, the placement is
wrong" is a real and useful answer, and placement is not yours to change.
