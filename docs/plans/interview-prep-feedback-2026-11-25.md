# Interview-prep feedback: what people are least ready for, and how it went (2026-11-25)

Founder (11-25): "mülakat hazırlığı için feedback almaya çalış".

This plan is docs only. It adds no code, no flag and no metric. The metric
proposed below ships in its own PR first (fleet README rule 6b); the code
follows in a separate PR behind two dark flags.

## Why now, in numbers (read 2026-11-25, read-only, internal accounts excluded)

| Fact | Value |
|---|---|
| People who completed a mock in the last 30 days | 13, **all on the free `sql-fundamentals-free`**; 0 on any other mock |
| `interview_outcome` events, ever | **0** |
| `outcome_note_sent` events, ever | **0** (the sender has never run) |
| Rows with a `prepTarget.date` | 7, of which **1 is a registered account** |
| People with `interview_tab_viewed`, last 30 days | 111 (bots not filtered; an upper bound) |
| `feedback` rows ever that say what someone is preparing for | 0 (the three asked prompts ask about price, being stuck and day 2) |

So we know which company people name and which mock they sit. We do not know
which part of the interview they fear, and we have never learned how a single
interview went. The hand-written channel (E1) is where every interview report
so far has come from, and it reaches only people with an email who reply.

## The rule this plan keeps

`src/utils/feedback-prompts.js` already sets the rules, and this plan adds
no new ones:
- one question, skippable;
- one prompt a session at most (`sessionHasRoom`);
- never during a timed mock (`fbInTimedMock`);
- never a modal, and never while the Pro modal is up (the slot at the
  `fbPrompt && … && !showProModal` render);
- written through `submitFeedback` into `public.feedback` with
  `context.kind` / `context.trigger`. No migration, and nothing a `users`
  trigger calls.

**No fourth ask on a screen that already has one.** `exit_reason` follows the
Pro modal, and `day2` sits on the second session's first screen. Neither
place gets anything new. The two new kinds share the same `fbPrompt` slot, so
two cards can never show at once. Whichever prompt reaches a session first
takes it.

## Where to ask, and the one question in each place

### 1. After a mock's results screen (`least_ready`, trigger `mock_results`)

- **Where:** the results view (`interviewCompleted && interviewResults`,
  src/app.jsx). The card goes inline under the score row and above
  "Questions to Review". It is not a modal and does not cover the Retry or
  Back buttons.
- **When:**
  - only on a first full sitting (`retry: false`), never in retry mode;
  - the person has at least 1 solve (the common gate);
  - nothing has been asked this session.
  It shows whether the mock was passed or failed: a pass doesn't tell us
  what they feel unready for.
- **Question:** "Which part of the real interview do you feel least ready
  for?"
- **Answers:** one tap, from fixed ids. `answerId` is the data and the
  labels are i18n keys, the `EXIT_REASONS` pattern.

  | id | label (EN) | theme hint |
  |---|---|---|
  | `time_pressure` | Writing correct SQL against the clock | interview format |
  | `window_functions` | Window functions and ranking | content gap |
  | `joins_aggregation` | Joins and GROUP BY without double counting | content gap |
  | `business_question` | Turning the business question into a query | interview format |
  | `explaining` | Explaining my approach out loud | interview format |
  | `edge_cases` | NULLs, dates and edge cases | content gap |
  | `no_interview` | I'm not preparing for an interview | other |
  | `other` | Something else (one line of text, ≤ 300 chars) | other |

  `no_interview` is there on purpose. Twelve of the thirteen mock sitters
  sat the free fundamentals mock, and several of them declared `learning`
  or `exploring`. Without that option, the answer list would assume an
  interview they don't have.
- **Context written to the row:** `interviewId`, `passed`, `percentage`,
  `company` (from `prepTarget`, or null), and `daysOut` (an integer, null
  when there is no date). Never the date itself (the `prep_target_set` rule).

### 2. After the interview date passes (`outcome_debrief`, trigger `outcome_link` or `outcome_tab`)

The door already exists. `?outcome=passed|failed|moved` records
`interview_outcome` and takes the past date off the record, and
`?outcome=passed` already opens the offer ask (`shouldAskOffer`,
`sqlquest_offer_asked`). So:

| Outcome | What follows | Why |
|---|---|---|
| `passed` | **nothing new.** The offer ask keeps the slot. | It already asks one question here, and a second would be the stacking this plan rules out. |
| `failed` | **one question:** "What do you wish you had practised more?" Text, one line, ≤ 300 chars. | This is the only answer that tells us what the product missed. The email's "reply and name the question" reaches only people who write back. |
| `moved` | nothing. The Interview tab already asks for the new date. | — |

The row's `context` carries `outcome`, `company` and `daysSince`, never the
date.

**The reach problem, stated plainly.** Today this door reaches no one. The
sender has never run, and only one registered account holds a date. Two
things fix that, and neither is code:
1. The founder runs `interview-outcome-note` (dry run first, `?dry=1`). It
   is the only route to learning whether anyone passed.
2. Dates get collected. That is the job of the goal-note date ask and the
   intake. Until more people give a date, the outcome series stays near zero
   whatever the app does.

**An in-app twin of the email (trigger `outcome_tab`).** A person whose
`prepTarget.date` passed 1–14 days ago, with no `prepTarget.outcome`, sees
the same three buttons on the Interview tab. They are inline in place of the
countdown card, which has nothing left to count. The click calls the door's
own handler, so it writes `interview_outcome {source: 'tab'}`, stores
`prepTarget.outcome` and clears the date. `failed` then gets the question
above. This reaches guests and people without an email, whom the sender
cannot. It is asked once per date, like the email, and the two are deduped
by `prepTarget.outcome`: whichever arrives first answers it.

### 3. On the Interview tab (`least_ready`, trigger `interview_tab`)

- **Who:** an interview person (`isInterviewPerson`: a company or date on
  `prepTarget`, or interview intent) who has **never completed a mock** and
  has 3+ solves. Someone who sat a mock is asked at place 1 instead.
- **What:** the same question and the same answer ids as place 1, so the
  two triggers can be read side by side.
- **Where:** one inline card under the status strip on the Interview tab,
  and only when the tab has no other card asking something (the date ask,
  the outcome twin).
- **Once per browser, across both triggers.** One done key,
  `sqlquest_fbp_least_ready_at`, is shared by places 1 and 3 and added to
  `promptDoneKey`. A person tells us what they're least ready for once, not
  once per screen.

## Events (reused, not new)

No new event names. These are the three that `feedback_capture` already reads:
- `feedback_prompt_shown {kind, trigger}`, with kind `least_ready` or
  `outcome_debrief`;
- `feedback_submitted {kind}`;
- `feedback_prompt_skipped {kind, trigger}`.

Plus the existing `interview_outcome {outcome, source, src, company,
daysSince}`, which gains one `source` value: `'tab'` beside `'link'`.

## Flags (new, dark; not money surfaces)

- `leastReadyAsk`: places 1 and 3. Off until A1 confirms the card never
  sits over the plans or the results' buttons.
- `outcomeDebriefAsk`: the `failed` follow-up and the Interview-tab outcome
  twin.

The following are untouched: `exitReasonAsk`, `day2Ask`, `stuckAsk` (which
waits until 12-20), and the offer ask. The new kinds go into
`FEEDBACK_PROMPT_FLAGS`, so the common gate and the session rule apply
without new gating code.

## The metric: `interview_prep_voice` (proposed; registered in its own PR first, rule 6b)

The text below is meant to go into `docs/agent/metrics.md` in a separate PR,
**before** the code PR. The author of the code does not write the metric
that judges it.

> ## `interview_prep_voice`
>
> What people preparing for an interview tell us they are least ready for,
> and how the interview went. Kinds `least_ready` (triggers `mock_results`,
> `interview_tab`) and `outcome_debrief`; flags `leastReadyAsk`,
> `outcomeDebriefAsk`. Plan: docs/plans/interview-prep-feedback-2026-11-25.md.
>
> - **answer_rate[trigger]**: people with `feedback_submitted {kind}` ÷
>   people with `feedback_prompt_shown {kind, trigger}`, per trigger,
>   never pooled. A one-tap answer (`mock_results`, `interview_tab`) and a
>   typed one (`outcome_debrief`) are different asks.
> - **reasons[answerId]**: rows in `feedback` with `context->>'kind' =
>   'least_ready'`, counted by `context->>'answerId'` and split by
>   `context->>'trigger'`. Read the counts and the `other` text; never
>   average them.
> - **outcome_known**: people with `interview_outcome` (any source) ÷ people
>   whose `prepTarget.date` fell 1–14 days before the read. Report the
>   numerator by `source`.
> - Baseline: **undefined** for all three. The kinds do not exist before the
>   flag flips. `interview_outcome` has 0 rows ever (2026-11-25).
> - Filters: the shared filters and the fleet's bot list (README, Data).
>   A person is `coalesce(metadata->>'aid', username)`. `pro_events` has no
>   `aid` column; the aid rides in the double-encoded metadata (checked
>   2026-11-25: 3,981 of 3,994 rows in two days carry it). The same fix
>   applies to `feedback_capture`'s SQL, which reads a bare `aid`.
>
> ```sql
> with ev as (
>   select coalesce((metadata #>> '{}')::jsonb ->> 'aid', username) who, event,
>          (metadata #>> '{}')::jsonb ->> 'kind' kind,
>          (metadata #>> '{}')::jsonb ->> 'trigger' trig
>   from pro_events
>   where event in ('feedback_prompt_shown','feedback_submitted','feedback_prompt_skipped')
>     and (metadata #>> '{}')::jsonb ->> 'kind' in ('least_ready','outcome_debrief')
>     and created_at >= :from and created_at < :to
> )
> select kind, trig,
>        count(distinct who) filter (where event = 'feedback_prompt_shown')   shown,
>        count(distinct who) filter (where event = 'feedback_submitted')      answered,
>        count(distinct who) filter (where event = 'feedback_prompt_skipped') skipped
> from ev group by 1, 2 order by 1, 2;
>
> select context->>'trigger' trig, context->>'answerId' answer, count(*)
> from feedback
> where context->>'kind' = 'least_ready' and created_at >= :from and created_at < :to
> group by 1, 2 order by 1, 3 desc;
> ```
>
> Trap: `feedback_submitted` rows before the per-kind trigger existed carry no
> `trigger`. Join the answer to its show by `kind` and person, as
> `feedback_capture` does.

## The claim the code PR carries (written now, before any data)

- **Metric:** `interview_prep_voice.answer_rate[mock_results]`.
- **Target:** ≥ 30% of people shown answer within 28 days of the flip,
  with ≥ 10 shown. At 13 mock completers a month, the read can take the
  full 28 days.
- **Falsified if:** fewer than 3 answers from ≥ 10 shown (remove the card
  from the results screen), or more than half of the answers are
  `other` / `no_interview` (the list is wrong; rewrite it before reading
  anything into it).
- **Guardrail:** among mock completers, the share who press Retry or start
  a challenge within the session does not fall. A card on the results screen
  must not become the end of the visit.
- **What it buys:** the ranked `answerId` list goes into the weekly
  customer-voice read (E1, Sundays). Its top item becomes the next content
  or mock-format backlog line. Nothing else changes on the strength of it.

## The hand-written channel, alongside (E1)

On 2026-11-25, E1 drafted 9 founder notes with the same single question to
people active in the last 21 days who show interview intent (kind
`interview_prep_feedback`, logged on the laptop only). Their replies are
the qualitative half of this read, and the in-app answers are the counted
half. The weekly customer-voice read puts both on one list of reasons, with
no names.

## Founder steps

1. Send, edit or delete the 9 drafts (Gmail, kind
   `interview_prep_feedback`).
2. Decide whether to run `interview-outcome-note` (dry run first). Until it
   runs, or the in-app twin ships, `outcome_known` stays 0.
3. Nothing else: both flags are activation-side and A0 can flip them under
   the usual rules once A1 passes the PR.
