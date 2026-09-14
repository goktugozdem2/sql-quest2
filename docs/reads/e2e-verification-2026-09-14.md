# The four unverified end-to-end paths, verified (2026-09-14)

Founder's list item 10: "finish the unverified end-to-end checks — Pro mocks,
sign-in, cross-device progress sync, recommendation updates after multiple
solves." Each was shipped and unit-tested; none had ever been exercised
through the built bundle in a browser.

`npm run e2e` (scripts/e2e-verify.mjs) now does it: **12 checks, all passing**
against the local preview. It is not part of `npm run smoke` because every
check needs seeded state — a Pro guest, a guest with fourteen solves — and the
smoke test is the cold-start guard; a seeded localStorage would quietly weaken
it.

## Hermetic by construction

The local app points at the **production** Supabase project, so a naive click
on "Log In" would send a real login attempt and write a real row. Before the
app boots, the harness replaces `window.fetch` with a recorder that answers
every Supabase call itself and lets nothing leave the machine — and it answers
the way production does: `account-login` → 401, `/rest/v1/users?` → 401
(closed to anon since the lockdown), `users_public` → the canned row,
`rpc/sq_save_user` → 204.

That faithfulness is load-bearing. The first version answered every call with
`200 []`, and the sign-in check failed: the client treated the function as
unavailable and fell back to the old table path. With production's own 401 the
fallback never triggers. **A lenient stub does not make a check pass — it
makes it lie in the other direction.**

## What the twelve checks establish

**Pro mocks.** A Pro user arriving on `/app/?interview=<mock>` — the link the
company pages use — lands **inside that mock**, by name, no further click. A
cold visitor on the same link meets the gate. A free user with fourteen solves
gets the gate and the free-mock nudge, never the paid mock's questions. All
three matter: the Pro check alone would pass just as happily if mocks were
ungated.

The first version of the Pro check asserted only that *a* question rendered,
and it passed while the harness was clicking the free mock's card — the trials
tab lists every mock, and the first "Start Interview" on the page belongs to
whichever card renders first. **A check that cannot tell the two mocks apart is
not a check.** It now asserts the heading equals the mock the link named.

**Sign-in.** The form posts to the `account-login` edge function, the password
goes nowhere else, and nothing reads the `users` table — which is 401 for anon
in production, so a client still reading it would be broken live and green in
a lenient harness.

**Cross-device progress sync.** A returning account loads its row from
`users_public` (5 reads, 0 from the table), and a state change produces one
write, through `rpc/sq_save_user`, with zero direct table writes. That is the
whole of what the client controls.

**Recommendations.** The plan card names three questions at 1, 6 and 14
solves — `[92,93,94]` → `[98,105,177]` → `[105,177,168]` — so it reads
progress rather than serving a fixed list, it never names a solved question,
and challenge 1 never appears. That last one is the 2026-08-05 raw-array trap:
challenge 1 is still the first Medium by id in the live bank (24%
solve-through), so anything reading raw order hands it out.

## The two halves a local harness cannot reach, and the live evidence

**A real password check.** Creating an account and typing a password are both
off-limits for the agent, so no test logs in. Production, read-only, last 24
hours: **5 `signup_completed`**, most recent 2026-09-13 17:47 UTC — real
accounts created and written through the new definer path after the lockdown —
22 `login_open`, most recent 2026-09-13 22:07 UTC, and
**`account_login_attempts` is empty: 0 lockout rows, 0 accounts locked.** No
failed-login storm, and the lockout is not misfiring on real users. The 11:00
`auth-health-check-after-lockdown` task is the standing read.

**A second real device reading the row back.** Also production, read-only:
**268 user rows saved in 24 hours, 13 of them registered accounts.** Writes are
flowing through `sq_save_user` since direct table access was closed.

## The bug this found, and the fix

The deep link did not open the mock. A returning visitor following
`/app/?interview=<mock>` landed on that mock's **card**, one click short of the
interview — a cold visitor's link resolved straight through, so it only showed
up for someone who had been to the site before.

Cause: the resolver called `startGuestMode()` and then fell through to
`startInterview` in the same tick, consuming its ref on the way past.
`startGuestMode` is async — it sets `currentUser` before awaiting
`loadUserSession` — so the mock reached `startInterview` while `userProStatus`
was still false and `solvedChallenges` still empty, and the ref was gone before
the session landed. Nothing errored and nothing was logged.

The fix is a `return` that keeps the ref, so the effect re-runs when
`isSessionLoading` flips back to false, which is the point where the plan is
actually known. Guest mode is started at most once per arrival
(`interviewGuestStartedRef`).

Measured, same harness, only the app changed:

| | before | after |
|---|---|---|
| auto-started | no | **yes** |
| landed on | the mock's card | **"Data Analyst Interview"** |

It matters because this is the company-page path —
`?interview=capital-one-codesignal` — and two of the first three payers came
through the Capital One screen.

Guards: `tests/interview-prep.test.js` carries a mutation-verified source guard
(reverting the `return` fails it by name), and `npm run e2e` asserts the mock's
identity end to end.
