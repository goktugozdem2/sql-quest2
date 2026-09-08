# Signup → subscriber

Written 2026-09-08. Every number here was measured that day against the live
database; re-measure before quoting any of them.

## Where the funnel actually breaks

| Step | 30 days | Health |
|---|---|---|
| Signups | 155 | Good — +94% over the prior 30 |
| Engaged (5+ solves) | 100 (64.5%) | Good — up 9.5 points |
| Shown a Pro modal | 186 people | — |
| **Clicked checkout** | **5 (2.7%)** | **This is the whole problem** |
| Paid | 2 | Fine as a share of clicks |

Over 60 days the same shape, with more room to read: **282 people shown, 12
clicked (4.3%), 4 paid — 33% of clickers pay.**

The top of the funnel is growing and its quality is improving. The bottom
converts at a third, which is healthy. **One link is broken, and it is
shown → click.** Every move below aims at that number and nothing else.

## Why it breaks — three measured causes

**1. We ask the wrong people.** Of the 384 people with a recorded intent,
over 60 days:

| intent | shown | clicked |
|---|---|---|
| `interview` | 41 | **4** |
| `job_ready` | 48 | **2** |
| `learning` | 41 | **0** |
| none captured | 52 | **0** |

93 people shown, zero clicks, no exception. Half our asks are spent on people
who did not come to buy — not bad users, people who came to learn.

**2. We ask at the wrong moment.** The trigger is a solve-count milestone, and
solve count does not predict clicking: clickers averaged **11.4** solves,
everyone shown averaged **13.4**. What predicts it is wanting a specific thing
and being blocked. Payer #2, in his own words: *"wanted to unlock the harder
questions"*, *"Have an interview coming up so I needed the practice."*
Payer #3 went from modal to purchase in **32 seconds**.

**3. We burn the surface.** 1.91 shows per person; **43 people saw it three or
more times, one person eight times**, and 95% dismiss.

## The goal finding — and the trap inside it

Among engaged users (5+ solves), over 90 days:

| | Has a Coach goal | No goal |
|---|---|---|
| People | 75 | 216 |
| Shown the modal | 52 | 78 |
| Clicked | 3 (5.8%) | 6 (7.7%) |
| **Paid** | **3** | **0** |

Goal-setting does **not** predict clicking — the rates are the same, and the
no-goal group clicks slightly more. It predicts **finishing**: 3 of 3 clickers
with a goal paid; 0 of 6 without one did.

**n = 3. That is not significance, it is a direction** (Fisher exact on 3/3 vs
0/6 gives p ≈ 0.08). It is worth acting on only because it agrees with two
independent things: the intent table above, and what the one payer we
interviewed actually said.

**And the trap.** The obvious move — make the other 216 set a goal so they
qualify — would destroy the signal it is built on. Today a goal means *"I
chose this deliberately"*. Make it a step on the way to checkout and it starts
meaning *"I clicked past a gate"*, and the correlation goes with it. The goal
is most likely a **marker** of having a real deadline, not a **cause** of
paying. Pushing everyone through it manufactures markers, not payers.

So: never make a goal a prerequisite for being offered Pro. Ask goal-less
engaged users to set one because the Coach works better with one — which is
its own product argument — and then watch whether the correlation survives the
larger population. That is a separate claim, below.

## What Pro actually is — read this before writing any offer

**The Coach, the goal picker and the roadmap are FREE.** Nothing in
`isContentLocked` gates them (`src/app.jsx`, and CLAUDE.md's pricing section
says it outright: "Free includes the Coach"). Pro adds unlimited AI tutor,
Hard challenges, the full mock-interview bank, all Daily difficulties, the
full warm-up bank and the 30-day challenge.

So **"pay and we will build you a roadmap for your goal" is selling something
we already give away**, and a user who takes that offer and finds the plan was
free would be right to feel cheated.

The honest version is stronger anyway: *the plan is free; the last part of it
is not.* An interview-prep goal routes into Hard challenges and the full mock
bank, both Pro. Show a goal-holder their own remaining path with the locked
steps visible and the sentence writes itself — it is about their interview,
not about our feature list.

## The four moves, in order

### 1. Ask the right people — ship after 2026-09-29
- Never show the milestone modal to `learning` intent.
- No intent captured? Ask for the intent, not for money.
- **Frequency cap: two shows per person, ever.**

### 2. Ask at the right moment — design after the 2026-09-20 read
Move the trigger off solve-count milestones and onto being blocked. That
surface is exactly what the paywall-surfaces claim is measuring right now;
its read tells us what the right moment is. **Do not design this before that
read lands** — we would be guessing at the thing we are currently measuring.

### 3. Match the offer to the intent — claim written now, ships with move 1
All three named payers chose short horizons (2 monthly, 1 annual), which fits
a deadline-driven need. The modal opens with a feature list. For an
interview-intent user it should open with their remaining path and where it
stops.

### 4. Learn why they say no — **not blocked, start now**
96 named accounts dismissed the modal in the last 30 days; all 96 have an
email, 65 are engaged non-payers, 4 opted out. None of them carries a Pro flag,
so this list does not overlap the 50 accounts that lost bug-granted Pro on
09-07 — they are disjoint populations and must not get the same email.

This is the only move available today, and it is what turns moves 1-3 from
guesses into reasons.

## What we will not do

- **Discounts.** Never tested, and the one thing we know about our buyers is
  that they are deadline-driven, not price-shopping.
- **More modal volume.** 95% dismiss; more shows burn the surface faster.
- **Ads.** Settled 2026-09-08 on arithmetic: ~4,700 pageviews/month is roughly
  $24/month at a generous $5 RPM, against a paywall we are actively trying to
  make work and an AI-recommendation channel that produced a paying customer.

## The arithmetic, honestly

At 4.3% shown→click and 33% click→pay, 282 shows produce 4 payers per 60 days.
Doubling the click rate at the same volume gives ~7. **But n = 12 clicks**, so
any target has to be read over at least eight weeks, and move 1 will *reduce*
the number of shows by design — the number to read is clicks, never shows.
