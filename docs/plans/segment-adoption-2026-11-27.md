# The canonical segment — adoption by the senders (2026-11-27)

The founder asked "müşteri segmentasyonunu nasıl sağlıyoruz". The honest
answer on 2026-11-27 was: in five places that do not agree. This PR makes
ONE segment (`segmentOf` in `src/utils/segment.js`), stamps its label on
every client event (`seg`, `segV`) and stores it on the account
(`users.data.segment = { seg, at, v }`). It does **not** touch an edge
function. This file is the map for the later PR that switches the senders.

## The segment

First match wins; the order is #409's (`docs/reads/funnel-by-segment-2026-11-26.md`):
an interview target outranks anything said later.

| # | seg | Rule |
|---|---|---|
| 1 | `at_work` | intent `hired` (past the interview) |
| 2 | `interview_dated` | `prepTarget.date` today or later |
| 3 | `interview_company` | `prepTarget.company`, or the first-open door named a company (company page, `?company=`, readiness link with a company, Capital One blog) |
| 4 | `interview_general` | intent `interview`, Coach goal `interview-prep`, or an interview door with no company (readiness) |
| 5 | `at_work` | intent `at_work` (#376, dark until it ships) |
| 6 | `job_ready` | intent `job_ready` |
| 7 | `learner` | intent `learning` |
| 8 | `job_ready` / `learner` | no stated intent (or `exploring`): Coach goal `analyst-day-one` / `fundamentals` |
| 9 | `unknown` | none of the above |

`dims` (device, region, level, company, daysToDate, solves, pro) stay in the
browser. Only the label leaves, on events and on the account.

## Where `users.data.segment` is and is not

- Written by the client's autosave for every person with a row (guests
  included); `at` = when the label last changed.
- A row that has not saved since the deploy has **no** `segment`. A sender
  that switches must fall back to its own rule for a missing field until
  coverage is read (below), never to "skip".
- The label lags a change made on another device until that device saves.

## The senders, one by one

| Sender | Audience today (its own rule) | In segment terms | Switch? |
|---|---|---|---|
| `goal-note` (manual) | registered, has email, **no** goal: `hasGoal()` = intent in interview/job_ready/learning/hired, or a prepTarget company/date; company from `arrivalSrc company:X` | `segment.seg = 'unknown'` (a company door already lands in `interview_company`, so those people stop counting as goal-less — the note's company line becomes the `interview_company` variant) | Yes: `seg === 'unknown'` replaces `hasGoal()`; keep the `arrivalSrc` company read for the copy |
| `weekly-digest` (Mon cron) | active that week; opens with the goal question when `hasGoal()` is false | the question goes to `seg === 'unknown'`; "One thing this week" can lead with the date for `interview_dated` | Yes, same `hasGoal()` copy → `seg` |
| `interview-outcome-note` (manual) | `prepTarget.date` 1–14 days **past**, no outcome | none: a past date is not a segment (`interview_dated` needs today or later). The person falls back to rules 3–9 | **No.** Keep `prepTarget.date`; the segment cannot express "after the date" |
| `prep-plan-note` (not deployed) | `prepTarget.date` in the future, ≤ MAX_DAYS_OUT | `seg === 'interview_dated'` (+ its own day cap) | Yes, but it still reads `prepTarget` for the date and company in the copy |
| `activated-note` (manual) | registered, 6+ distinct solves, never paid; company line from `prepTarget.company` | any seg; split the copy by seg (interview_* lead with the screen, `learner` gets no Pro pitch — #409: learners 0 of 82) | Partly: add `seg` as the copy key and as an exclusion for `learner` (a decision for the founder, not a default) |
| `checkout-abandon` (daily cron) | clicked checkout / saw the modal 24–72 h ago, no purchase | any seg; the event rows now carry `seg` directly | Copy only: the note can name the interview for `interview_*`. Audience unchanged |
| `lapsed-pro` (not scheduled) | expired Pro, 5+ solves | any seg | No audience change; copy rewrite is already the founder's call |
| `welcome-back` / `skill-decay` / `streak-reminder` (crons) | activity and XP rules | any seg | No. Behavioural, not who-they-are. Report their sends by seg instead |
| `trial-reminder-cron`, `capture-email-drip` | trial expiry; email captures (no account) | trial: any seg; captures: no `users` row, no seg | No |

## Order of the switch PR

1. **Coverage read first.** Two weeks after this deploy: the share of
   registered rows active since 11-27 that carry `users.data.segment`, and
   the share of client rows with `seg` (`segment_mix`'s `unstamped` should
   be ~0). Below 90% on active rows → do not switch.
2. **Agreement read.** For those rows, `segment.seg` against each sender's
   own rule (e.g. `goal-note`'s `hasGoal()` false ⇔ `seg = 'unknown'`).
   List every disagreement; each is either a sender bug or a segment rule
   to change (a new `segV`).
3. Then one PR per sender, `goal-note` + `weekly-digest` first (same
   `hasGoal()` block, inlined in both — keep them in sync), with `?dry=1`
   output before and after attached. Deploys are the founder's.

Nothing here changes who receives mail until that PR, and that PR needs the
founder's go (outward email).
