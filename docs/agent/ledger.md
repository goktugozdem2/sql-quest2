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

### hand-written founder check-ins replace the automated engagement email
- **Claimed** 2026-08-21 (design: `cgozdemm-main-design-20260818-013802.md`)
- **Metric** `outreach_replies` — baseline **0** (never sent before today)
- **Target** 3 replies from the first 10 hand-written emails
- **Read on** 2026-09-01
- **Falsification, stated in advance:** fewer than 2 replies from 10 means the
  problem is not the channel or the wording — these users do not want to talk
  to us, and the paywall decision gets made from behavioural data alone.
- **Send log:**
  - 2026-08-21 · Digvijay (guest, feedback #4/#5, schema-columns report) —
    reply confirming the bug + fix shipped, one question
  - 2026-08-21 · sagepati (feedback #3, layout overload) — honest no-fix-yet,
    one question (what were you trying to do)
- **Verdict** _pending_

### schema columns on the challenge card (first-run shell had none)
- **Claimed** 2026-08-21
- **Change** `app.jsx` ~32022: the always-rendered "Tables used" card now lists
  each table's columns as chips. Root cause: the schema sidebar is gated behind
  `!showFirstRunSimpleShell`, and `isFirstRunUser = zero solves` — so the
  coldest users were the only ones who could not see any table's columns, on
  any viewport, and could not graduate out of the shell without the solve the
  missing schema was blocking. Reported by feedback #4/#5 (2026-08-18, mobile
  guest, 384px): "I dont see the input table columns".
- **Metric** `challenge_solve_through(99)` — baseline **46%** (39/85 openers,
  window 08-14→08-21). 99 is the front door (47.2% of first contacts) and its
  prompt names specific output columns, so it is the challenge most starved by
  the missing schema.
- **Also** `challenge_solve_through(91)` — baseline **73%** (47/64). And
  `mobile_give_up_rate`, direction only (band data thin).
- **Target** 99 as first contact reaches >=55%. Falsification: if 99 does not
  move, the missing schema was not the binding constraint on the front door
  and the next candidate is prompt complexity, not information access.
- **Read on** 2026-08-29
- **Confound, stated in advance:** the read window opens the same day two
  founder replies (Digvijay, sagepati) may go out — different surface, no
  overlap expected, but noted.
- **Verdict** _pending_


---

## Closed

### instrument the paid walls before moving them — **HIT**
- **Claimed** 2026-08-15 · **Read** 2026-08-21, one day early at the founder's
  request (6 of 7 collection days), by hand — verifier still not installed
- **Claim as made:** measurement-only; `lock_reach_rate` and
  `targeted_lock_share` baselines unknown, no target on purpose. Decision it
  feeds: the 2026-08-14 packaging call — move the wall off content and onto
  targeting (competitors give Hard away; LeetCode monetises company targeting).
- **Measured** (excluding the founder-test aid): **16 people** collided with a
  paid wall in 6 days, all on `challenge_hard` — 12 via `soft_toast` (browse),
  4 via `company_modal` (inside a deliberately-chosen company filter).
  47 raw events for those 16 people: the multi-fire defect (~3 events per
  click, 192ms apart) is real — **count people, never hits** until fixed.
- **`targeted_lock_share`:** 4/16 (25%) in company context. Weakest-skill
  match: 0 by exact string; **2/16 after resolving `category` through
  SKILL_TO_RADAR by hand** (both Joins). Combined targeted share ~25-37%.
  That is **LOW** — most wall-hitters are browsing the Hard list and bumping
  into locks, not arriving with specific intent.
- **But the targeted minority carries all the money signal.** The only Stripe
  checkout arrival ever measured (chaand, 08-18, monthly) was a wall-hitter:
  wall → offer → plan click → Stripe, end-to-end. 10 of 16 wall-hitters saw
  the offer afterward; 1 clicked.
- **The free-preview finding, the sharpest in the read:** **15 of 16 people
  hit a wall with all 6 free Hard previews untouched** — the previews are
  invisible where the collision happens. Exactly 1 person had used all 6 and
  came back for more; that profile is the strongest buy signal in the data.
- **Verdict** HIT — the instrumentation shipped, survived a week, and answered
  the question it was built to answer.
- **Decision, per the rule stated in advance:** the share is low, so **moving
  the wall now changes nothing** — people must first be LED to targeted
  moments. Build order confirmed: (1) surface the 6 free Hard previews at the
  collision point and in the Coach, (2) radar "remaining X are Hard"
  indicator, (3) only then revisit wall placement. Also fix the multi-fire
  before the next read.
- **Carried-forward exclusions:** founder-test aid
  `4a07da304d844d2e96795d4151699219` (the 08-15 verification click) and
  browse-session aid `d937d99161eb470a8ff28cce04f668eb` (08-21, Digvijay
  repro: `app_opened`, `challenge_opened` #91, first-run tour events — no lock
  clicks). Deploy was confirmed 08-16 against the production bundle.


### placement quiz tops out at 'working', not 'advanced' — **HIT**
- **Claimed** 2026-08-14 · **Read** 2026-08-21, on the date, by hand (verifier
  still not installed)
- **Claim as made:** `first_contact_share(1)` baseline **50.7%**, target below
  15%. Also `challenge_solve_through(91)` baseline 69% on 35 openers, target
  91 recovers >=35 openers/week.
- **Measured** (window 08-14 12:00Z → 08-21): challenge 1 first-contact share
  **50.7% → 8.6%** (14 of 163). Challenge 91: **64 openers** in the week
  (target >=35) at **73% solve-through** (47/64), up from the 66-69% band.
- **Verdict** HIT on both. The falsification test failed to fire: the share did
  not stay above 40%, so the quiz WAS the route feeding challenge 1 — the
  08-14 diagnosis was correct.
- **Read** The front door is now challenge **99** at **47.2%** of first
  contacts, converting **46%** as a first contact (39/85). Better than
  challenge 1's 24%, and consistent with the known "easy in context, hard as
  first contact" pattern already recorded in the working-track reorder entry.
  99-as-front-door is now the single worst conversion point among high-traffic
  challenges and is the natural next content fix — a follow-up, not a revert.

### offer gate stops trusting a stale proStatus flag — **UNREADABLE**
- **Claimed** 2026-08-07 · **Read** 2026-08-21, on the date, by hand (verifier
  still not installed)
- **Claim as made:** `engaged_never_asked` baseline **47**, target falls by at
  least 4 among 30d-active users. Scope stated in advance: recovers only the 4
  users whose trial expiry had already passed (apriwaymw, thurai, jhn_vinz,
  subhan); does not reach the auto-renew four.
- **Measured** `staleProRecovered` fired **0** times in 14 days. But all four
  in-scope users have emitted **zero events since 2026-07-10** — none returned
  at any point in the measurement window, so the gate never had a chance to
  fire. `engaged_never_asked` moved 47 → **53**, but the engaged denominator
  grew 127 → 152 over the same days; the raw count cannot carry a verdict.
- **Verdict** UNREADABLE — zero exposure, not zero effect. Per this file's own
  rule, not rounded to FLAT.
- **Read** The mechanism is deployed and untested by reality. It stays in place
  at no cost; if any of the four ever returns, the flag will show it. The real
  finding is about the segment: users whose trial expired in early July and
  who have been gone 6+ weeks are unreachable by any in-app change — that was
  the stated case for `lapsed-pro`, which remains deliberately unscheduled.
  No re-read date; the flag is its own tripwire.

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

