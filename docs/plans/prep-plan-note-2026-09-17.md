# prep-plan-note — the plan follows the person out of the app (2026-09-17)

Interview-first, point 3 (`docs/plans/interview-first-2026-09-17.md`). Built
dark. **Not deployed. Not scheduled. Sending is the founder's decision and
nothing in the repo schedules it** — no pg_cron row, no config entry, no
scheduled task. This document holds the claim so the ledger can take it
when the founder decides.

## What it does

`supabase/functions/prep-plan-note/` is an edge function that, when run,
mails a person who has a date on `userData.prepTarget` one note in the
founder's voice:

- the days to the date and the company they named (or "your interview"),
- the lowest line on their Skillmap, by name,
- today's three items from **the same plan the Interview Prep card draws**
  — `planToDate` in `src/utils/interview-prep.js`, imported by relative path
  into `plan.ts`, never re-implemented — each with one deep link
  (`/app/?src=prep_note&challenge=<id>`, mock:
  `/app/?src=prep_note&interview=<id>`, utm campaign `prep_plan_note`),
  and "(Pro)" after an item the free tier does not open. That bracket is
  the only place the word appears. No price, no pitch, no follow-up.
- signed `Göktuğ / Founder, SQL Quest`, reply-to goktug@datrick.com, and a
  line saying it is written by hand to a couple of dozen people — which at
  this audience size is true.

Two subjects, chosen by a hash of the username so a batch never reads as
one mailing and a dry run is idempotent:

- `From SQL Quest's founder — 9 days to your Snowflake screen`
  (`… to your interview` with no company)
- `I build SQL Quest — your plan for the next 9 days`
  (`… your plan for tomorrow` at one day)

Two openers, same rule. Bodies differ by the person's numbers anyway; the
openers make sure no two are byte-identical even when the numbers match.

The target is resolved the way the frame's point 2 asks: a signed archetype
member (Capital One, Revolut) gets the archetype plan with its mock; any
other named company gets a plan built from that company's tagged
challenges and the person's own gaps, with no mock and the body saying
"not <company>'s process"; no company at all gets drills on the person's
weakest skills. All three go through `planToDate`; only the *target* input
differs.

## The audience, in prose

Every registered account (`users` rows whose username does not start with
`guest_` — guests have no row and no channel) that:

1. is not an internal account (`isInternalAccount`, the inlined block:
   test/demo/qa patterns, `sqlquest`, `elena`, `fabletest*`, `linktest*`,
   `internalroutine*`, `@datrick.com` / `@example.com` / `@mailtest.com`);
2. has not opted out (`userData.emailOptOut !== true`);
3. has an email address on the row;
4. has `userData.prepTarget.date` in the future and at most **45 days**
   out, counted by `daysUntil` in the app's own UTC calendar-day frame —
   today counts as not future, so the morning of the interview is quiet;
5. has not received this template in the last **2 days**
   (`email_events`, template `prep_plan_note`, event `sent`);
6. has received it fewer than **5 times** ever — a cooldown only spaces
   sends, it never stops them (CLAUDE.md, the skill-decay 07-28 lesson),
   so the ceiling is what ends the series for someone who never comes
   back;
7. has not been mailed by **any other campaign in the last 24 hours**
   (`email_events`, event `sent`, template ≠ `prep_plan_note`).

Plus: a plan with at least one item. A note with nothing to say is not
sent (counted as `date_out_of_window_or_no_items` in the dry run).

Cap **40 per run**, soonest date first. A `sent` row goes to
`email_events` with the `resend_id` (so resend-webhook can attribute the
engagement) and the numbers in `meta`; a `pro_events` row
`prep_note_sent {company, daysOut, items, proItems, archetype}` with
`reason='email'` is written per successful send.

## Deploy and dry run — the founder's commands

```
supabase functions deploy prep-plan-note
curl -s "https://<project>.supabase.co/functions/v1/prep-plan-note?dry=1" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | jq .
```

The dry run returns `candidates`, `batch`, `cap`, `skippedWhy` (a count per
reason), a `preview` row per person (username, company, days out, weakest
skill, the subject, the three items with their Pro flag and URL, sends so
far) and one full `sample` (subject + HTML). It sends nothing and writes
nothing. Dropping `?dry=1` sends the batch.

To run it every other day, the founder would add a pg_cron row with a
full `https://` URL (scheme-less URLs kill pg_net with a misleading
"Out of memory" — CLAUDE.md, Email lifecycle). Not done here on purpose.

## What was verified, and what was not

Verified locally (Deno 2.7.14 on this machine):

- `deno check` passes for `index.ts` and `plan.ts`; the relative imports
  into `src/utils` and `src/data` resolve, and the browser data modules
  evaluate under Deno with the `window` shim in `globals.ts` (299
  challenges, 9 mocks, 218 company-map entries loaded).
- The full `?dry=1` path was run against a mock PostgREST server with
  thirteen fake rows covering every skip reason and four candidates
  (archetype at 1 day with the mock in slot three and "(Pro)" on it,
  an unsigned company at 3 days, an archetype at 9 days, no company at 12
  days). Every skip reason fired once, the order was soonest-first, both
  subjects rendered.
- `tests/prep-plan-note.test.js` (source guards, activated-note style).

Not verified — cannot be from the agent's seat:

- **Nothing was run against production.** No deploy, no real dry run, no
  send. The real audience size is unknown until the founder runs `?dry=1`.
- Whether `supabase functions deploy` bundles the relative imports that
  reach outside `supabase/functions/` (`../../../src/...`). The CLI walks
  the import graph from the entrypoint and these are ordinary relative
  ESM specifiers inside the repo, so it should; if the deploy refuses
  them, the fix is an import map or a copy step, not a re-implementation.
- The `pro_events` insert shape `(event, username, reason, metadata)` is
  taken from claim-referral-reward's corrected insert; not exercised.

## Known gap — item order inside a set

`planToDate` sorts through the curriculum comparator, which takes the
roadmap order map (`SQL_ROADMAP_CHALLENGE_ORDER`). That map is built in
`src/app.jsx` and is not importable here, so the function passes an empty
map: the comparator then orders by difficulty, then id — Easy before
Medium before Hard, never the raw FAANG order, but *within* a difficulty
the lowest id wins. For an unsigned company whose tagged set includes
challenge 1 (Snowflake does), 1 can be the third Medium item where the
card would have placed roadmap members first. Fix: move
`SQL_ROADMAP_STAGES` to `src/data/` so both the app and this function
read one map. `app.jsx` is another agent's file today, so it is noted,
not done.

## Ledger-ready claim

```
### prep-plan-note — the plan follows the person out of the app
Claimed 2026-09-17 · NOT SCHEDULED · NOT DEPLOYED
Change: supabase/functions/prep-plan-note (index.ts + plan.ts + globals.ts),
  tests/prep-plan-note.test.js. Every other day at most, to a registered
  person with a date ≤ 45 days out: days to the date, company, weakest
  skill, today's three items from planToDate with one deep link each,
  "(Pro)" on locked items and nothing else about Pro. Founder subject,
  hand-written register, signed. Max 5 per person ever, 40 per run,
  quiet 24h after any other campaign.
Why: every purchase came from someone preparing for a named interview.
  The plan exists in the app; the person with a date is the one we lose
  between sessions. This is the plan reaching them where they are.
Metric: `returned_48h` for template prep_plan_note (funnel-report §5-6),
  plus `prep_plan_item_opened` with arrival src=prep_note within 48h of
  a `prep_note_sent` row (join on username; pro_events reason='email').
Baseline: structurally 0 — the template has never been sent.
Target: ≥ 30% of recipients open a plan item within 48h, at n ≥ 20
  recipients.
Falsification: < 15% at n ≥ 30 → the email is noise to a person who
  already has the app open; unschedule it, keep the code dark.
Confounds: the 09-21 batch (interviewFirst + the countdown card +
  deadlineOffer/freeQuota) changes what a recipient lands on; a recipient
  who arrives after 09-21 sees a different app than one who arrives
  before. Read the two windows separately; do not pool them.
Read: 21 days after the founder schedules it. Nothing schedules it.
Verdict: _pending_
```
