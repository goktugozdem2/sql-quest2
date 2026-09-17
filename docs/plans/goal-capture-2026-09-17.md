# Goal capture — four doors for one question (2026-09-17)

Interview-first (`docs/plans/interview-first-2026-09-17.md`), the founder's
question of the day: "şu ana kadar hedefi olmayanlardan nasıl alacağız
hedefi — bu konu önemli." Every real payer had said "interview" before they
paid; modal → plan click was 9.3% with that answer and **0 of 81** with no
answer. A person we have not asked is a person the product cannot route.

## Where the goal lives today (and where it does not)

The post-solve ask writes the answer to **localStorage only** —
`sqlquest_user_intent` and `sqlquest_intent_asked` (src/app.jsx,
`getUserIntent`). It is never copied to `users.data`; the autosave block
carries `coachState`, `goals`, `intake` and `prepTarget`, not the intent
key. So on the server (every email sender, every SQL read over the row) the
raw answer is invisible, and "has a goal on record" has to be read from the
three fields that do reach the row:

| field on `users.data` | written by | means |
|---|---|---|
| `intake.goal` | onboarding intake (flag `onboardingIntake`, flips 09-16) | the same question, asked at the door |
| `coachState.goalId` | Coach goal picker / intake mapping | a curriculum goal (Fundamentals, Analyst Day-One, Interview Prep) |
| `prepTarget.company` / `.date` | countdown card, intake, `?src=readiness` hook | a target — a company or a date |

`intent` / `userIntent` on the row are read defensively by the digest and are
always absent today. Someone who answered "just exploring" is
indistinguishable from someone never asked, server-side, and will be asked
again by the digest; that is one line in an email they already get. If the
in-app work persists the ask to the row, `goalOnRecord` in
`supabase/functions/weekly-digest/index.ts` starts honouring it with no
change (tests/weekly-digest.test.js pins the shape).

`?goal=` on arrival is the other agent's: `/app/?goal=interview|job_ready|
learning[&company=<Name>][&level=…]` records the goal on arrival when none is
recorded. The two doors below put that parameter where people already are.

## The four doors

| door | who builds | reaches | how |
|---|---|---|---|
| 1. First-run intake, goal required | in-app (other agent) | every new person at the door | the intake's goal step stops being skippable |
| 2. Returning in-app ask | in-app (other agent) | people already inside with no goal: **93 registered + 64 solving guests** never asked in the 30 days to 09-17 | the post-solve ask, re-shown to a returning person with `sqlquest_intent_asked` unset |
| 3. `?goal=interview` on the company pages | this change | **~175 company-page arrivals a month** | every `/app/?…company=<Name>…` CTA on the 30 company pages carries `&goal=interview` |
| 4. The digest's question | this change | the registered people the app never asked: **366 accounts with an email, 263 active in 60 days**; the digest mails the ones active last week | a block above the report, three links `/app/?src=digest_goal&goal=…`, only when `goalOnRecord()` is false |

Doors 1–2 catch people where they are asked anyway; 3 records the goal the
click already implies (a person on `/stripe-sql-interview/` who starts the
Stripe set is preparing for an interview, and the URL says so now); 4 is the
only channel that reaches a registered person who has stopped seeing the
in-app ask.

### Door 3 — what changed

- 168 hrefs across the 30 pages: 28 on the seven generated pages (four
  CTAs each — hero, readiness-block "Start the set", "Open all N", closing —
  from `scripts/build-company-pages.mjs`), 140 on the 23 older pages by hand
  (six each; Amazon, Google and Meta seven, Capital One five; the readiness block's "Start
  the set" on every page comes from the generator's `injectModules`).
  `src=` and `company=` are byte-identical to before; `goal=interview` is
  appended.
- Not changed: the question-card links (`/app/?src=<slug>&challenge=<id>`,
  no `company=`), the hub's five generic `/app/?src=sql-interview-prep`
  CTAs (its per-company links go to the company pages, not the app), the
  homepage, every title and H1. The readiness test's own plan link
  (`/app/?src=readiness&company=…`) lives in
  `scripts/build-readiness-test.mjs` — the other agent's file today — and
  still needs `&goal=interview`; it is the one link in the brief left undone.
- Guard: tests/company-pages.test.js, "every company-set link into the app
  declares the interview goal" — every `/app/?…company=` href on every page
  carries `goal=interview` exactly once, and the generator writes it on all
  four CTAs. tests/company-template.test.js keeps the seven pages equal to
  the generator.
- Incidental, same file: `injectModules` / `withProvenance` left one
  newline behind per run, so every rerun grew each of the 23 older pages by
  two blank lines (44 lines per run at HEAD; 130 accumulated). The strip
  now consumes the surrounding newlines and puts back exactly one blank
  line, and a second run is a no-op. Whitespace only.

### Door 4 — what changed, and the deploy step

`supabase/functions/weekly-digest/index.ts`:

- `goalOnRecord(userData)` — the table above.
- `goalAskBlock()` — sits between the "Week of" header and the hero line,
  so it opens the email. The text:

  > **One question from me: what are you preparing for?**
  > I build SQL Quest, and I would rather ask than guess from the data. You
  > have never told us what you practise for, and the answer changes what
  > the Coach puts in front of you next week. One click, nothing to fill in:
  > An interview · Getting job-ready · SQL in general

  Links: `/app/?src=digest_goal&goal=interview`, `…&goal=job_ready`,
  `…&goal=learning`, utm campaign `digest_goal`. Founder voice inside the
  digest, which carries no sign-off of its own — so none is added. No Pro,
  no price, nothing "unlimited" (tests/weekly-digest.test.js).
- The existing `sent` row on `email_events` gains `meta.goalAsked`
  (true/false); the dry run (`?dry=1`) lists `goalAsked` per would-send
  row. No new event, no new table. `sendAndLog` in this function gained an
  optional `meta` — it is one of the inlined shared blocks; the other
  senders do not need it and were not changed.

**Deploy — the founder's step, not done here:**

```
supabase functions deploy weekly-digest
```

Then, before Monday: `curl "$SUPABASE_URL/functions/v1/weekly-digest?dry=1"`
and read `goalAsked` across `wouldSend` — the expected share is most of the
list, since the row-level proxies only exist for people who took the intake
(flipped 09-16), picked a Coach goal, or set a date. The digest is on
pg_cron Mondays 09:00 UTC; the first send with the block is the first Monday
after the deploy.

## Reads

Per week, people (not events) with a goal captured, split by door:

| source | what fires |
|---|---|
| `ask` | `intent_captured {intent}` from the post-solve modal |
| `intake` | `intake_answered {step:'goal'}` — the intake writes the intent key directly, never `intent_captured` (metrics.md `intake_funnel`) |
| `returning` | the other agent's returning-ask event |
| `link` | the arrival hook's record on `?goal=` — the generated pages and every readiness-block CTA carry `src=<slug>-sql-interview`; the older pages' other CTAs carry `company=` only, and the arrival read keys on `company:` (`sqlquest_arrival_src`) |
| `digest` | the same hook with `src=digest_goal`; `email_events.meta.goalAsked` gives the denominator |

Denominator for the target: people with ≥ 1 solve in the week, split
has-goal / no-goal on the same proxies `goalOnRecord` reads plus the local
intent for the in-app half.

## Claim (ledger-ready — not written to the ledger by this change)

### Goal capture — four doors for one question — **OPEN**
- **Claimed** 2026-09-17 · **Read** 2026-10-12
- **Change** the goal question at four doors: intake (goal required),
  the returning in-app ask, `&goal=interview` on every company-set CTA on
  the 30 company pages, and a question block opening the weekly digest for
  anyone with no goal on the row.
- **Metric** `goal_capture_by_door` — people with a goal captured per week,
  by source `ask` / `intake` / `link` / `returning` / `digest`; and the
  share of people with ≥ 1 solve in a week who have a goal on record.
  Baseline **65%** among solvers (286 with / 157 without, 30 days to
  09-17); 93 registered + 64 solving guests never asked in that window.
- **Target** ≥ **70%** of people with ≥ 1 solve in a week have a goal on
  record by 2026-10-12.
- **Falsification** the `link` and `digest` doors together capture under
  **10 people in 3 weeks** → those doors are not where people are; drop
  them (the parameter and the block), and the remaining lift is the
  in-app doors' alone.
- **Confound** doors 1 and 2 flip on the in-app schedule, the digest block
  goes out with the founder's deploy, and door 3 is live at merge — read
  each source on its own start date; the summed rate is the only line that
  spans all four.
