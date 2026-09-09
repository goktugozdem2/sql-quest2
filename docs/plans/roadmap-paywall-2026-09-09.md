# Proposal: goal → personalised roadmap → 10 free → subscription

**Founder's proposal, 2026-09-09.** Reasoning as stated: buyers purchase after
solving very few challenges, so getting used to a large free bank makes the
decision easy to defer. Therefore: capture a goal, generate a roadmap fitted
to it, keep the first ten steps free, then ask for the subscription.

The premise is **correct and newly measured**, and the design has one half
that should be built and one half whose arithmetic does not work as stated.

---

## The premise is right

Both halves of it, measured 2026-09-09:

- **Buyers decide early.** All four purchases in the product's history
  happened in the buyer's first session, with 0, 6, 6 and 10 solves. The
  6-solve milestone modal produced every sale since it shipped on 07-23.
- **Free content does substitute for paid.** Our deepest non-payer has 149
  solves and wrote to us this week saying he will buy Pro "once I've cleared
  all the medium grade exercises." He has 54 Mediums left. The free bank is
  the reason he has not bought, in his own words.

That is exactly the mechanism the proposal targets. It is not a hunch.

## Why the wall cannot deliver O1 on its own

The wall's ceiling is set by how many people reach it, and that number is
small:

| | |
|---|---|
| People who have **ever** reached 10 solves | 153 |
| Of those, paid | **3 (2.0%)** |
| People reaching 10 solves in the last 30 days | **94** |

A hard wall at ten free solves is met by roughly **94 people a month**. For
O1's fifty payers a month to come from that wall, it would have to convert at
**53%**. At a very optimistic 10% — five times today's rate at that depth —
it yields **9 payers a month**.

The wall is not the constraint. The funnel above it is:

| Stage, 30 days, people by `aid` | |
|---|---|
| Entered the app | 1,148 |
| Opened a challenge | 663 |
| Solved one | 314 |
| Solved six | 149 |
| Solved ten | **94** |

Moving 94 upward is worth more than any conversion rate applied to it. This
is the same conclusion `docs/reads/purchase-timing-2026-09-09.md` reached from
the purchase side, arrived at again from the pricing side.

## The cost that has to be priced in

**Our best acquisition doors sell the size of the free bank.** Measured over
the same 30 days, by first-solve rate and by six-solvers produced:

| Door | People | Solved 1 | Reached 6 |
|---|---|---|---|
| `/sql-exercises/` | 276 | 36.6% | **55** |
| homepage | 302 | 35.1% | 46 |
| `/best-sql-practice-sites/` | 50 | 42.0% | 11 |

`/sql-exercises/` is our single best door and it outproduces the homepage on
fewer visitors. Its title is literally *"SQL Exercises — 287 Problems With
Solutions (219 Free)"*. The comparison pages that rank well do so by being
truthfully more generous than the alternatives. **Capping free at ten changes
what those pages are allowed to say**, and they are the pages feeding the
funnel the wall depends on. That is not a reason not to do it; it is a cost
that has to be in the decision.

## The design that keeps both

Separate what is free from what is *sequenced*:

- **The bank stays free.** 219 free exercises remains true, the SEO asset and
  the comparison pages keep their claim, and `/sql-exercises/` keeps working.
- **The path is the product.** Goal capture → a roadmap fitted to that goal →
  first ten steps free → subscription for the rest of the path, the Hard bank,
  and the tutor.

Sell the *sequence*, not the *problems*. Someone who wants to grind the free
bank unaided still can, and still tells people we are generous. Someone who
wants to be told what to do next — which is what a person with a deadline is
actually buying — pays at step ten. It also answers the one thing hakko504
asked for without asking: he does not know where he stands or what to do next.

This is a genuinely different product from "10 free then pay", and it is the
version that does not put the acquisition channel at risk.

## What blocks it, and for how long

**Nothing monetisation-adjacent ships before 2026-09-29** (`objectives.md`).
`purchases` is a directional guardrail on both the 09-20 paywall-surfaces read
and the 09-29 cold-start read. A hard wall at ten solves would make both
unreadable, and the cold-start change is nine days old.

The 105-opener read on **09-13** covers the activation stretch this proposal
also touches. So:

- **Now → 09-13:** nothing ships into activation or the paywall.
- **Now → 09-29:** build the **goal → roadmap** half. It is not a paywall
  change, it is the thing the roadmap-reachability defect already argues for
  (the current roadmap covers 38 of 287 challenges and pins to a seven-item
  list when finished), and it must exist before any wall can sit on it.
- **After 09-29:** ship the wall as a claim with a stated target and
  falsification, **to a slice of new users rather than everyone**, so the
  acquisition cost is measured rather than assumed.

## The claim to write when it ships

- **Metric** wall-met → paid, among new users assigned to the slice.
- **Baseline** 2.0% of people who reach ten solves have ever paid (n=153).
- **Target** ≥ 8% at n ≥ 100 met-walls.
- **Guardrail, and this is the one that matters** six-solve rate for the slice
  must not fall more than 10% relative to control. If capping free content
  suppresses activation, the wall costs more than it earns and the funnel
  table above says we cannot afford that.
- **Falsification** below 4% → the wall converts no better than the milestone
  modal already does, and free-content substitution was not the binding
  reason people do not buy.
