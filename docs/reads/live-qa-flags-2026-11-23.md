# Live QA — the three flags turned on 2026-11-23 (A2)

**When:** 2026-11-23, 11:05–11:15 UTC, against https://sqlquest.app, after the
10:50–11:01 deploys of #155, #156, #157 and 12a576fe (#226).
**Build checked:** `/app/` serving `app.js?v=b6f3284f`, `data.js?v=0b970588`;
the served `data.js` carries `exitReasonAsk:!0`, `day2Ask:!0`,
`companyDirectOpen:!0`.
**How:** headless Chrome over CDP (`scripts/smoke/lib.mjs`: `launchChrome`
on a random port, `HERMETIC_PREAMBLE`), a fresh profile per persona, guests
seeded from the local blob the way `scripts/smoke-test.js` and
`scripts/smoke/uiux-audit.mjs` seed them. Every backend call was answered
in-page: no guest row, no `pro_events`, no `feedback` row, no checkout. No
plan card was clicked. Events were read from the muted analytics line the
preamble rebuilds from each intercepted `/pro_events` POST.

## Verdicts

| Flag | Verdict | One line |
|---|---|---|
| `exitReasonAsk` | **OK** | Asked once after a close with no plan click, from the header modal and from the quota wall; never while the plans are open; not again that day. |
| `day2Ask` | **OK** (one layout nit) | Shows on session 2, once ever; on phones the 💬 button covers the right edge of its Send button. |
| `companyDirectOpen` | **OK** | `direct` arm lands in question 1, `list` arm unchanged; deep links and warm guests stay out of the test; the 10/10 quota holds. |

No rollback needed. No uncaught exception or console error on any run.

## 1. exitReasonAsk

Guest with 3 solves (91–93), 1366×800.

| Step | Result |
|---|---|
| Header "Try Pro" → modal | `pro_modal_shown {reason: header}`, both plan cards, **no prompt rendered while the modal is open** |
| "Maybe later" | `modal_dismissed {via: button}` → `feedback_prompt_shown {kind: exit_reason, trigger: pro_modal_closed}`; card at bottom-right (x 970–1350, y 498–720), "What held you back?" + five answers + Skip, no price named; `sqlquest_fbp_exit_day = 2026-11-23` |
| Skip → reopen → close | nothing asked (session's one prompt spent, day key set) |
| New session (> 1 h gap forced), same day → open → Escape/close | nothing asked: the day key alone holds it (session had room: `promptIn 1`, `count 2`) |

Quota wall: guest at 10/10 (91–100), `/app/?challenge=101` →
`content_lock_reached {surface: challenge_quota, challengeId: 101}`,
`pro_modal_shown {reason: free_quota}`, counter "10 of 10 free solves used",
both plans. "Maybe later" → `feedback_prompt_shown {kind: exit_reason,
trigger: quota_wall_closed}`; the challenge did **not** open behind it (no
editor, list shown). At 375 px every answer chip is fully clickable (hit-test
on each chip's left, centre and right lands on the chip).

Not walked: the "after a plan click, never ask" branch (it needs a plan click,
which starts a real checkout); it is pinned by `canShowExitReason`'s
`planClicked` guard and `tests/feedback-prompts.test.js`.

## 2. day2Ask

Guest with 3 solves, `sqlquest_fbp_session_v1 = {count: 1, lastAt: now − 2 h}`
(the record `nextSessionRecord` advances; `SESSION_GAP_MS` is one hour).

| Step | Result |
|---|---|
| Load `/app/` | session → 2, `feedback_prompt_shown {kind: day2, trigger: second_session}`, "One thing that would make SQL Quest better for you?" + text field + Send + Skip; `sqlquest_fbp_day2_at` set |
| Reload in the same session | nothing |
| Session record forced back to `count 1` + old `lastAt` (a re-counted session 2) | nothing — the once-ever key holds |
| Session 3 | nothing |
| Fresh visitor, zero solves, forced session 2 | nothing (the common gate needs a solve) |

**Layout nit (not a rollback):** on phones the global prompt slot
(`fixed left-4 right-4 bottom-20`) overlaps the 💬 feedback button
(`.sq-feedback-fab`). `elementFromPoint` 4 px inside the right edge of the
day2 card's **Send** button returns the 💬 button ("Send feedback or ask a
question") at 375, 390 and 414 px; its left and centre are the card's own.
The screenshot at 375 shows "Sen" with the bubble on top. Send still works
from its centre. Smallest fix: lift the slot above the FAB on phones (for
example `bottom-24`), or give the card the FAB's width as right padding, with
a hit-test like the one above in the uiux checks. The exit_reason card's
chips are clear at 375; its "Other" text field + Send would sit where day2's
does and was not walked.

## 3. companyDirectOpen

aids chosen with the app's own `companyDirectArm` (FNV + murmur3):
`a2a2…0000` → `direct`, `a2a2…0001` → `list`, written to `sqlquest_aid`
before load; fresh storage otherwise.

| URL | `direct` arm | `list` arm |
|---|---|---|
| `/app/?src=capital-one-sql-interview&company=Capital%20One` (the page's nav "Start Free" and final CTA) | `company_direct_assigned {arm: direct, nextId: 275}` → `challenge_opened {openedFrom: company_direct, 275}`; editor open on "Monthly Spend Per Account" | `company_direct_assigned {arm: list, nextId: 275}`; list with "You're practicing Capital One SQL questions." banner; nothing opened |
| Capital One **hero** `…&challenge=275&…` | opens 275, **no assignment** (deep link stays outside the test) | same |
| Wise hero `/app/?company=Wise&goal=interview` | assigned `direct`, opens 136 "Country Codes in Uppercase" | assigned `list`, list + banner |
| Capital One arrival as a guest at 10/10 | **not assigned, nothing opened**, list shown | same |
| Capital One arrival at 375 px | assigned `direct`, opens 275 | — |

The free quota holds: a warm guest is never in the test
(`companyDirectDecision` needs zero solves), and the decision waits for the
resumed guest's record before it reads the solve count.

Not walked: a guest with zero challenge solves whose quota is spent through
mock answers (`practiceSolves` counts both) — the `direct` arm would hand
`openChallenge` an unsolved challenge, and the quota lock inside it is what
must hold. Rare; worth one smoke step.

## 4. Layout and console on /app/

| Width | Persona | Elements past the set width | Errors |
|---|---|---|---|
| 375 (mobile emulation) | fresh visitor | 0 (scrollWidth 375) | 0 |
| 375 | guest, 3 solves, day2 card showing | 0 | 0 |
| 1366 | fresh visitor | 0 | 0 |
| 1366 | guest, 3 solves, day2 card showing | 0 | 0 |

Measured against the width set, element by element (`getBoundingClientRect().right`),
not `innerWidth` (A2 brief). Across all five runs (31 recorded checks, 31 pass): zero
`Runtime.exceptionThrown`, zero `console.error`, zero `Log` errors.

## 5. Events from real traffic (read-only, 11:14 UTC)

`pro_events` since 10:50 UTC: **0 rows of any event** — the last row in the
table is 10:45:37 UTC. So: `feedback_prompt_shown` 0, `feedback_prompt_skipped`
0, `company_direct_assigned` 0, `challenge_opened {openedFrom:
company_direct}` 0; `feedback` table 0 rows since the deploy (last row
2026-11-19). Filters prepared: `metadata.bot is null` and the shared
internal-account filter of `docs/agent/metrics.md`.

This is quiet traffic, not a broken pipe: the last 30 hours ran 33–277 rows
and 3–31 people an hour (10:00 had 47 rows from 9 people), and gaps of
48–65 minutes with no row at all happened eight times in the last 14 days.
The hermetic runs above show the new build POSTing each new event to
`/pro_events` in the right shape. **Re-read after 13:00 UTC**; if
`app_opened` resumes and `company_direct_assigned` stays at 0 while company
arrivals (`arrivalSrc` = a company page) come in, that is a bug.

```sql
select event, coalesce(m->>'kind', m->>'arm', m->>'openedFrom') k, m->>'trigger' trig,
       count(*) rows, count(distinct coalesce(m->>'aid', username)) people
from (select event, username, ((metadata #>> '{}')::jsonb) m from pro_events
      where created_at >= '2026-11-23 10:50+00') e
where m->>'bot' is null
  and username !~* '^(test|demo|admin|qa)[0-9]*$' and username <> 'sqlquest'
  and username not ilike '%fabletest%' and username not ilike 'linktest%'
  and username not ilike 'internalroutine%' and username <> 'elena'
  and (event in ('feedback_prompt_shown','feedback_prompt_skipped','company_direct_assigned')
       or (event = 'challenge_opened' and m->>'openedFrom' = 'company_direct'))
group by 1,2,3 order by 1,2,3;
```

## Paths checked

`/app/` (fresh, 3-solve guest, 10-solve guest) at 1366 and 375;
`/app/?challenge=101`; `/app/?src=capital-one-sql-interview&company=Capital%20One`;
`/app/?company=Capital%20One&challenge=275&src=capital-one-sql-interview&goal=interview`;
`/app/?company=Wise&goal=interview`. Screenshots stay in the session
scratchpad (`a2qa/shots/`), not in git.
