# Ledger — did the change do what it said?

Every entry starts as a claim made at merge time and ends as a verdict measured
on the read date. The verifier (`scripts/agent/tasks/verify.md`) appends the
verdict; nobody edits a claim after the fact.

**Why this file is the point of the whole agent system.** Without it the fleet
only produces more pull requests, and "we shipped a lot" is not the same as
"the numbers moved". The ledger is also the input that lets triage rank work:
if content fixes keep moving numbers, do more; if they do not, stop.

## Verdicts

| verdict | meaning |
|---|---|
| `HIT` | reached or beat the target |
| `MOVED` | moved in the right direction, short of target |
| `FLAT` | inside noise |
| `MISS` | moved the wrong way |
| `UNREADABLE` | n too small, or the window is confounded — say why |
| `UNDEFINED` | the metric is not in `docs/agent/metrics.md`; nothing was measured |

`UNREADABLE` is a real and frequent outcome at this scale. It is not a failure
of the verifier and must never be rounded to `FLAT`.

---

## Open

### offer gate stops trusting a stale proStatus flag
- **Claimed** 2026-08-07
- **Metric** `engaged_never_asked` — baseline **47** (19 active in 30d, 28 dormant)
- **Also** `pro_modal_shown` where `staleProRecovered = true` — baseline **0**, flag born 08-07
- **Target** engaged_never_asked falls by at least 4 among 30d-active users
- **Read on** 2026-08-21
- **Scope, stated in advance:** this recovers the 4 whose trial expiry has
  already passed (apriwaymw, thurai, jhn_vinz, subhan — verified against the
  live rows). It does NOT reach adinajoshi (104 solves), rohit_7350, rodcr or
  mlun, whose expiry is still in the future because the client-side auto-renew
  at app.jsx:13526 keeps extending it with no payment. Closing that is a
  business decision about cutting access, not a bug fix, and is not in this
  change. Do not read a miss on those four as a failure of this one.
- **Also note:** 28 of the 47 are dormant. No in-app trigger can reach them —
  that was the email channel's job, and email is measured dead (9 arrivals,
  0 solves, ever). The addressable population is 19, not 47.
- **Verdict** _pending_

### placement quiz tops out at 'working', not 'advanced'
- **Claimed** 2026-08-14
- **Metric** `first_contact_share(1)` — baseline **50.7%** (68 of 134 first contacts)
- **Also** `challenge_solve_through(91)` — baseline **69%** on only 35 openers,
  starved because the quiz was routing its traffic to challenge 1
- **Target** challenge 1 falls below 15% of first contacts; 91 recovers enough
  traffic (>=35 openers/week) for its layout fix to actually get tested
- **Read on** 2026-08-21
- **Change** `app.jsx` quiz mapping: 4/4 now scores `working` instead of
  `advanced`. The four questions test recognition; `advanced` is still
  reachable, but only by explicit self-selection via "I already know my level"
  on the same screen.
- **Verified end-to-end before merge:** answering 4/4 opens #99 (was challenge
  1); picking "Already interview-ready" by hand still opens challenge 1.
- **What would falsify the diagnosis:** if challenge 1's share stays above 40%,
  the quiz was not the route and something else is feeding it. If 91's
  solve-through is still ~69% once its traffic returns, the layout fix did not
  work and the FLAT verdict was generous.
- **Verdict** _pending_

### instrument the paid walls before moving them
- **Claimed** 2026-08-15
- **Metric** `lock_reach_rate` — baseline **unknown, and that is the point**.
  Five paid walls (Hard challenges, both interview gates, the 30-day limit,
  daily difficulty) have existed for months and never emitted an event.
- **Also** `targeted_lock_share` — baseline unknown
- **Target** none. This is a measurement-only change; a target would be
  inventing a number to hit.
- **Read on** 2026-08-22 (one week of collection)
- **Decision it feeds:** the 2026-08-14 packaging call — move the wall off
  content and onto targeting. Competitors give Hard away (DataLemur serves a
  logged-out visitor the full Hard problem, hint, schema and editor, verified
  that day), while LeetCode monetises company tags and frequency data, which
  its own users name as the only part worth paying for. That is the Coach's
  axis and we give it away. Before unlocking Hard, we need to know how many
  people the current wall actually stops — 41 people opened a Hard challenge in
  30 days, but nothing recorded how many were turned away.
- **What the read decides:** if `targeted_lock_share` is high, the wall is
  landing at real intent and the targeting axis is worth building. If it is
  low, people are bumping into walls at random and moving the wall changes
  nothing until something leads them there first.
- **Verified before merge:** clicking a locked Hard as a guest emits
  `surface=challenge_hard, wall=soft_toast, weakestSkill=Querying Basics,
  freeHardPreviewsUnsolved=6` with the full auto-stamp.
- **EXCLUDE from the read — test contamination.** That verification ran against
  localhost, but the local build points at the production Supabase, so the test
  click landed in the live table: `aid 4a07da304d844d2e96795d4151699219`,
  username `guest_1786791768093`, 2026-08-15 11:03:15Z. It is currently the
  ONLY `content_lock_reached` row, so a naive read on 08-22 would report a
  founder's own test as the sole user who ever hit a paywall. Filter that aid.
- **Deploy confirmed** 2026-08-16: the production bundle at sqlquest.app/app.js
  contains `content_lock_reached`, `pro_plan_clicked` and `staleProRecovered`,
  so the collection window really is open.
- **Verdict** _pending_

---

## Closed

### challenge-1 rewrite + recommendation routing — **MISS**
- **Claimed** 2026-08-05 · **Read** 2026-08-14 (2 days late; verifier not yet installed)
- **Measured** solve-through **31% pre → 25% post** (45→75 openers). Target was >=40%.
- **Measured** first-contact share **35.1% → 50.7%** (39 → 68 first-contacts). Target was "falls toward zero".
- **Verdict** MISS on both. The share moved the *wrong way*: challenge 1 is now
  the front door for **half** of all first contacts, up from a third.
- **Read** The rewrite and the routing fix were both real, and the routing bug
  was real — but neither fed this. Root cause found 2026-08-14 by walking the
  live flow: the 4-question placement quiz scores 4/4 as `advanced`
  (`app.jsx:19530`), and the advanced first-run track is `[1, 6, 7, 10]`.
  55 of the 68 post-fix first-contacts arrive directly after `coach_tab_viewed`,
  which is the quiz screen. The quiz asks recognition questions — what SELECT
  returns, which clause filters, what COUNT counts, what a JOIN is for — and
  anyone who has read one tutorial answers all four. Challenge 1 then demands
  *production*: a GROUP BY with aliases. Recognition is being treated as
  interview-readiness, and 75% of the people it routes there do not finish.
- **Next** Fix the quiz-to-level mapping, not challenge 1. A 4/4 on recognition
  is `working` at most. This is a one-line threshold change plus a re-read.

### first-run layout + Run/Submit pinned on mobile — **FLAT**
- **Claimed** 2026-08-07 · **Read** 2026-08-14
- **Measured** challenge 91 solve-through **66% pre → 69% post** (21/32 → 24/35).
  Target was >=80%.
- **Verdict** FLAT. A 3-point move on ~35 openers is inside noise; do not read
  it as an improvement.
- **Read** The layout fix is verified to work mechanically — one click puts the
  editor, Run and Submit on a 375x812 screen — but 91's traffic **collapsed**
  from 42 first-contacts to 14 over the same period, because the quiz now sends
  those users to challenge 1 instead. The fix may be fine; it barely got tested.
  Re-read after the quiz threshold is corrected.

### working-track reorder: #99 before #100 — **HIT**
- **Claimed** 2026-08-07 · **Read** 2026-08-14
- **Measured** #100 first-contacts **20 → 0**. #99 took the slot with 28.
- **Verdict** HIT. #100 no longer appears as anyone's first challenge.
- **Read** The intended change landed exactly. But the replacement is only
  partly better: #99 as a *first* challenge runs **37% solve-through** (14/38),
  against #100's 25%. #99 measures 85% mid-curriculum, so this is the same
  lesson as #100 — a challenge that is easy in context is hard as a first
  contact. Worth a follow-up, not a revert.

