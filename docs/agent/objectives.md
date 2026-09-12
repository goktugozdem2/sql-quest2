# Objectives

Read this at the start of every session, before the ledger. The ledger holds
claims; this holds what the claims are *for*. One objective at a time.

---

## O1 — 50 paying customers per month by 2026-12-08

**Set by the founder 2026-09-09.** Ninety days from that date.

### Where we start

Measured 2026-09-09 against the live database, 30-day window, internal
accounts excluded, money read only from `pro_events` where
`event='pro_purchase_completed' AND reason='stripe_webhook'`:

| | |
|---|---|
| **Paying customers, last 30 days** | **2** |
| Paying customers, last 90 days | 4 |
| Paying customers, ever | 4 |
| People reaching the app | 2,203 |
| App opens | 1,676 |
| Signups | 169 |
| People shown a Pro modal | 193 |
| Of those, clicked checkout | 5 |

So the objective is **25× in 90 days**, from a base of four customers in the
product's history.

### What 50/month decomposes into

Two rates carry everything, and both are measured:

- **signup → payer: 2 / 169 = 1.2%**
- **shown → click: 4.3%** (60-day window: 282 shown, 12 clicked) and
  **click → pay: 33%** (4 of 12). The second is healthy; the first is the
  broken link, and it is what `paywall_ask_efficiency` exists to move.

Three ways to reach 50, using only measured rates:

| Route | What it needs | Verdict |
|---|---|---|
| **Traffic only** — rates unchanged | 169 → **4,200 signups/month** (25×), i.e. ~55,000 people/month against 2,203 today | Not reachable in 90 days by any lever we have |
| **Conversion only** — traffic unchanged | signup→payer 1.2% → **30%**. Nothing in the funnel supports a 25× conversion step | Not real |
| **Both** — the only honest route | signup→payer 1.2% → **5%** (4×, twice what the paywall claim targets) **and** signups 169 → **1,000/month** (6×) | Hard, and this is the one to plan against |

**The plain statement: 50/month needs roughly 6× the traffic AND the paywall
work landing at double its own target.** Signups did grow +94% in the 30 days
to 09-08 — real, and the fastest we have gone — but 6× in 90 days means
holding roughly that rate for three consecutive months while the base grows.

### Why this is written down anyway

A number this far out is not a forecast, it is a direction with arithmetic
attached. Written like this it produces a **reading** at each checkpoint
instead of a vague sense of having fallen short — we will know which of the
two factors failed, and by how much, which is the thing that changes what we
do next.

### Checkpoints — a trajectory, not a hope

Even growth to 25× is ~2.9× per month. Compounding from 2:

| Date | Payers / 30d | Signups / 30d | signup→payer |
|---|---|---|---|
| 2026-09-09 (day 0) | 2 | 169 | 1.2% |
| **2026-10-09** (day 30) | **6** | 340 | 1.8% |
| **2026-11-08** (day 60) | **17** | 600 | 2.8% |
| **2026-12-08** (day 90) | **50** | 1,000 | 5.0% |

Read on those three dates. Each reads **both** columns, because the whole
point is knowing which factor is missing.

### Falsification, stated in advance

- **Day 30 below 4 payers AND signups below 250** → neither factor is moving
  and 50 is not the right target. Reset it at day 30 to what the trajectory
  actually supports rather than carrying a number nobody believes for another
  60 days.
- **Signups on trajectory, payers not** → the constraint is the paywall.
  Everything goes to `paywall_ask_efficiency` and the moment/audience work in
  `docs/plans/signup-to-subscriber-2026-09-08.md`.
- **Payers converting, signups not** → the constraint is traffic. The
  2026-09-08 keyword read is the map: our long tail is company-specific
  fintech interview queries, and 81% of clicks are still our own brand name.
- **Neither** → the objective was the wrong shape and the honest move is to
  say so and pick a different one, not to extend the deadline.

### Correction, 2026-09-09: what a purchase actually looks like

Measured against all four purchases in the product's history
(`docs/reads/purchase-timing-2026-09-09.md`): **every one was a first-session
decision, made with ten solves or fewer, between 14 minutes and 5 hours after
the buyer's first tracked event.** Their present-day solve counts of 24-39
were earned *after* paying.

Both purchases since 2026-07-23 came from the **milestone modal's 6-solve
rung**, first session, 31 seconds and 7 minutes from modal to payment. That
rung shipped on 07-23 and is the only paywall change in our history that has
been followed by a sale.

Three consequences for the decomposition above:

- The signup→payer rate of 1.2% is not a nurture rate. It is a rate at which
  arriving visitors decide inside one sitting.
- `paywall_ask_efficiency` keeps its billing, but **not aimed where the plan
  aims it.** The surface with a track record is the milestone ladder's first
  rung at six solves, not the Hard lock and not the returning engaged
  account. Nothing has ever been sold to a user with a month of history.
- The counter-example is decisive rather than merely absent. Our deepest
  non-payer has 149 solves and told us in writing he is learning for his CV
  with no deadline. Depth without a deadline does not buy.

The 09-20 / 09-29 / 11-24 reads stand. What changes is where to look first
when they come back flat: at whether the six-solve rung still fires and still
converts, before concluding anything about the lock surfaces.

**And it is firing.** Over the 30 days to 2026-09-09, 138 new people reached
six distinct solves and **135 of them (98%) were asked**; 5 clicked, 2 paid.
The ask machinery has no leak. So the binding constraint on the payer column
is the 138 — not the 98%, and not the wording of the modal.

**O1 restated in the terms the data supports:** fifty payers a month needs
about **3,450 people reaching six solves a month**, against 138 today. That
is the same 25× the traffic arithmetic already gave, now anchored to a
mechanism we have watched work rather than to an abstract signup→payer rate.
It also says which 25× to chase: not visitors, not signups, but **people who
get to their sixth solve**. Activation is the objective's real denominator.

Measured the same day, people by `aid` over 30 days: 1,148 entered the app,
663 opened a challenge, **314 solved one**, 149 reached six. Two halvings,
and the sharper one is 663→314 — 349 people who clicked into a challenge and
never produced a correct query. After the first solve the funnel holds (1→2
is 82%, 2→3 is 89%). Everything hard happens before the first correct query,
which is exactly where the **09-13 105-opener read** is pointed.

(An earlier version of this paragraph cited "5,069 accounts with zero solves".
4,989 of those are `guest_*` rows and guests get a new identity per page load,
so it was a page-load count. Only 79 registered accounts have never solved.)

### What serves it, and what does not

Claims currently pointed at O1, with their own read dates:

| Claim | Reads | Serves |
|---|---|---|
| paywall surfaces (preview/lock) | 2026-09-20 | signup→payer |
| cold start | 2026-09-29 | signup→payer (and the ordering: never sell before value) |
| paywall ask efficiency | 2026-11-24 | signup→payer — the main lever |
| goal-setting: marker or cause | 2026-11-24 | signup→payer, observation only |
| review ask | 2026-10-08 | traffic, via third-party text |
| blog + comparison practice exits | 2026-10-08 | traffic composition |
| 105 opener | 2026-09-13 | activation, upstream of both |

**Does not serve it, and must not be started for it:** ads (settled
2026-09-08 on arithmetic — ~$24/month at our volume, against a paywall we are
trying to make work); discounts (our four buyers were deadline-driven, not
price-shopping); more FAANG company pages (2026-09-08: their query space
belongs to Redshift and BigQuery, not to us).

### The constraint that outranks the objective

**Nothing monetisation-adjacent ships before 2026-09-29.** `purchases` is a
directional guardrail on both the 09-20 and 09-29 claims, and moving who sees
a paywall makes both unreadable. An objective is not a reason to break the
read calendar — if it were, the objective would be unmeasurable too.

### Correction, 2026-09-12: the baseline was measured during an outage

From 2026-09-08 08:53Z the database rejected every registered-user write —
no account could be created and no registered account could save (ledger:
"users writes restored"). The 09-09 starting row above was read inside that
window. Its "Signups 169" counts `signup_completed` events, and every one of
those after the break is a person who finished the form and got no account;
measured 2026-09-12, that is 36 people. Nothing above changes shape, but two
things follow for the reads:

- The first days of the objective produced zero accounts **by construction**,
  not by demand. At the day-30 read, treat 09-08 08:53Z → the apply time as a
  hole in the signups column and say so; do not read the recovery week after
  it as growth.
- The people-reaching-six-solves denominator is unaffected (it is read from
  `pro_events`), which is one more reason it is the honest denominator.

### The path, written 2026-09-12 (day 3)

What it takes, in the order it has to happen, each line tied to a read:

1. **A product that can take a signup.** Restored 2026-09-12 10:58Z after four
   dark days. Read the postgres error log weekly; nothing below is readable
   while writes fail.
2. **Activation is the denominator: people reaching six solves, 164 in the
   30 days to today.** The sharpest halving is opened → first correct query
   (663 → 314). Levers with dates: the 105 opener (reads 09-13), the
   `intentRouting` flip (09-13, reads 10-13), cold start (09-29), the
   onboarding intake in front of the quiz (built 09-12, flips 09-16, reads
   09-30 on `first_run_reach`), adaptive placement behind it (built 09-12,
   flips 10-01, reads 10-15 on the interview-ready opener), and the goal-picker gap (68.6% vs 35.2%,
   confounded by self-selection — the intake is the first design for it,
   optional by instruction).
3. **Traffic goes where the users already come from: Bing.** The
   `/sql-exercises/` title (reads 10-09), the competitor pages and indexing
   (10-12), and the free half of the backlink plan, shipped. The other half
   is founder outreach. On Google the one target is `/sql-exercises/` at
   position 24.5.
4. **Monetisation, only from 09-29, only where it has sold:** the six-solve
   rung, first session. The interview-intent majority (228 of 317 declarers)
   and the Capital One signal say what Pro should buy: a timed mock of the
   real screen behind the countdown card (`interviewCountdown` after the
   09-20 read; price the mock after 09-29).
5. **Founder-only:** write to the 22 interview-history accounts; backlink
   outreach T1–T3; close PR #38.

The arithmetic has not changed: 50 payers needs about 3,450 six-solvers a
month at today's 1.4% rung-to-pay, or 1,000 at a 5% rung that nothing yet
supports. Day 30 resets the number to what the trajectory supports — the
rule is written above and is not renegotiated on the day.

---

## How to add an objective

One at a time. It needs: a number, a date, the measured starting point, the
decomposition into rates that already exist as metrics, checkpoints, and what
we would conclude at each. An objective without a falsification is a slogan.
