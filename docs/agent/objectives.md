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

---

## How to add an objective

One at a time. It needs: a number, a date, the measured starting point, the
decomposition into rates that already exist as metrics, checkpoints, and what
we would conclude at each. An objective without a falsification is a slogan.
