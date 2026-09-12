# The free tier is not too big. It is in front of the paid good.

Written 2026-09-12, answering the founder's "we give away too much — how do we
steer people to pay?". Every number below was measured that day against the
live database (30 days, people by `aid`, internal accounts excluded).
Re-measure before quoting.

Status: BUILT 2026-09-12, all five dark behind flags (`companySetGate`,
`goalWallEarly`, `deadlineOffer`, `quietEarlyAsks`, `mockDoor` in
`src/data/feature-flags.js`; pure half `src/utils/free-tier-boundary.js`;
guards `tests/free-tier-boundary.test.js`). Nothing here flips before
2026-09-29 — `purchases` is a directional guardrail on the 09-20 and 09-29
reads (objectives.md, "The constraint that outranks the objective"). Flip
calendar by scheduled task, one surface per read: 09-29 M4 · 10-06 M3 ·
10-12 M2 + M5 · 10-14 M1 (after the 10-13 intent-routing read on
`reach_6_rate`, which M1 moves for company arrivals by design). Ledger
claims: "company sets: three free, then Pro", "the interview-prep goal meets
the wall at step 4", "the six-solve ask speaks to the deadline", "quiet the
asks that have never sold", "the mocks get a door".

---

## What free actually is, and what of it is used

| Free today | Used in 30 days |
|---|---|
| 226 of 299 challenges: all 94 Easy, all 126 Medium, 6 Hard previews | Easy solved by 297 people, Medium by 181 |
| Coach, goal picker, roadmap, lessons, placement | Coach tab viewed by 891 |
| AI tutor 20 calls/day (guest 5) | the free cap was hit by **5 people** |
| 1 of 8 mock interviews | the Interview tab was reached by **3 people** |
| Warm-up | 333 people |

| Pro today | Reached by free users in 30 days |
|---|---|
| 73 locked Hard challenges | a Hard was **opened** by 63 of 695 openers (9%); a wall was hit by 86 |
| 7 mock interviews | 3 people saw the tab; **0 of the 79 interview-intent people** |
| AI tutor 50/75/100 per day | nobody reaches the free cap, so nobody wants this |
| Daily difficulties, warm-up bank, 30-day challenge | no wall event exists for any of them |

**The paid good is not being given away. It is not being reached.** Hard and
the mocks sit behind the free content along every path, so the only people who
meet the wall are the ones who wander into the Hard list on their own.

## Who would a content cut hit

Solves per person, 30 days: 165 people at 1–5, 112 at 6–19, 47 at 20–39,
11 at 40+. A "first 20 Medium free" cap touches 58 people a month; "first 40"
touches 11. Those are our deepest free learners, and the purchase-timing read
(docs/reads/purchase-timing-2026-09-09.md) says depth without a deadline does
not buy — the 149-solve non-payer is learning for his CV. Meanwhile **every
payer decided at 6–10 solves in their first session**, and each of them needed
those free solves to reach the ask at all. Cutting Easy/Medium shrinks the
164-a-month reaching six solves, the only denominator that has ever produced
money, to punish people who were never going to pay. Do not do it.

## Where the boundary is wrong

**1. Company sets are mostly free.** A company-page arrival is the
highest-intent door we have (169 people/month; 11% hit a wall vs 6.5% from
the homepage) and the page promises "<Company>'s SQL questions". What they get:

| Set | free / locked |
|---|---|
| Snowflake | 53 / 42 |
| Stripe | 23 / 12 |
| Revolut | 21 / 17 |
| Plaid | 25 / 9 · Ramp 23 / 9 · Capital One 19 / 6 · Tesla 18 / 5 · JPMorgan 16 / 3 · Wise 13 / 3 |
| **Amazon** | **10 / 24** |

Amazon is the one set that is mostly Pro — and it produced a payer
(sergelafarge, $99 annual) and a checkout click (chaand). Stripe's arrival gets
23 free Stripe questions and never needs Pro; harinivr02 came via
`company:Stripe`, solved 6, clicked, and did not pay.

**2. The interview-prep goal puts the wall at step 11.** Steps 1–10 are
free (Easy/Medium and one Hard preview); the first locked Hard is step 11; the
goal contains **no mock interview at all**. A first session does not reach
step 11. Of 79 interview-intent people, 39 reached six solves and were asked,
**68 never opened a Hard challenge**, 0 opened a mock. The person who came for
an interview leaves without ever seeing what Pro is.

**3. Half the asks are spent where nothing has ever sold.** `generic` modal at
≤3 solves (25 people), `company_hard` at an average of 1.8 solves (12),
`milestone_streak` (13): 50 people a month, 0 sales in the product's history,
and they burn the surface (1.9 shows per person; 43 people asked 3+ times).
Only `milestone_solves` has ever sold, and it sells in the first session
(119 of 171 shows are first-session; 4 of the 7 clicks).

**4. The checkout cannot take the money of a growing share of the audience —
or they never tried.** 67 of 203 modal viewers are in India; the last three
people to reach Stripe were India, Russia, Mexico — 0 paid; the three US
arrivals before them all paid. **Checked in the Stripe dashboard 2026-09-12
(evening):** since 2026-09-01 the Payments list holds exactly one payment
(the 09-01 $29, succeeded) and **zero failed or incomplete payments**, so none
of the three ever submitted a card — Stripe creates the payment attempt on
submit, and there is none. They left the Checkout page (our
`pro_checkout_returned` rows say 24 s, 62 s and 25 min away) with the form
unfilled. That is abandonment at the price/card step, not a decline; the
merchant-of-record question (Paddle / Lemon Squeezy) stays a founder's
decision, now with weaker evidence for it and stronger evidence for asking
the three why.

**5. A false claim on the checkout surface.** "Unlimited AI Tutor" appears in
45 places; `supabase/functions/ai-tutor` caps Pro at 50 (monthly) / 75
(annual) / 100 (lifetime) calls a day. Nobody hits it, but it is a lie on the
surface where we ask for a card. Fix the words in the 09-29 batch: "50+ tutor
calls a day".

## The moves, in evidence order

Each is one flag, ships dark, flips on or after 2026-09-29, one surface per
read, `purchases` as the guardrail on all of them.

### M1 · Company sets: three free, then Pro (`companySetGate`)
The company filter view is the product the company page sold. First three
questions of the set free regardless of difficulty; from the fourth the wall,
with the count: "You solved 3 of Stripe's 35. The set and Stripe's mock are
Pro." The challenges stay reachable one by one from the general list — the
curated set is what is gated, honestly. Company pages change from "21 free" to
"3 free to try, 35 in the set" (count guards will force this).
- Metric: company-arrival people reaching the wall, clicks per person at the
  wall, purchases with `arrivalSrc` company. Baseline: 169 arrivals, 19 hit a
  wall, 2 clicked, 0 paid (30d to 09-12).
- Falsification: company-arrival reach-6 falls below 8% (21/169 today) with
  no purchase in 21 days → revert; the door was worth more open.

### M2 · Interview-prep goal: the wall at step 4, the mock at step 5 (`goalWallEarly`)
Reorder the goal so a first session meets the paid good: step 3 the free Hard
preview, step 4 a locked Hard (from the intake company when known), step 5 the
free mock, step 6 a Pro mock. The Coach card shows the locked step with the
lock visible — "the plan is free; the last part of it is not" (the
signup-to-subscriber plan's own line). Check `coach.js` condition 2 (free-user
mock handling) before touching the engine.
- Metric: interview-intent people who open a Hard or a mock in their first
  session. Baseline: 11 of 79 opened a Hard, 0 opened a mock.

### M3 · The 6-solve modal speaks to the deadline (`deadlineOffer`)
The intake (flips 09-16) yields `daysOut`. For a person with a date inside 45
days, the milestone modal leads with the date and offers the Hard set plus the
mock for the company they named, not the feature list. This is
`paywall_ask_efficiency`, aimed where the purchase-timing read says the sale
happens: first session, sixth solve, deadline in hand.
- Metric: clicks per person shown, split by `hasDate`. Baseline shown→click
  4.1% (203 → ~10).

### M4 · Stop the asks that have never sold (`quietEarlyAsks`)
`generic` at ≤3 solves, `company_hard` below 3 solves, `milestone_streak`:
replace with the free-preview nudge. The remaining ask lands once, at six
solves, on someone who has had value.
- Metric: shows per person (1.9 → ≤1.3), people asked 3+ times (43 → <10),
  clicks unchanged or up.

### M5 · Give the mocks a door
The free mock inside the interview-prep goal (M2), the company mock named at
the company wall (M1), and the company page CTA promising it. "Full mock
interview bank" stops being a bullet nobody has seen.

## What this buys, honestly

At today's traffic: company door 45 solvers/month at the wall, interview
intent 39 at the modal with a deadline offer. If the wall converts like the
Amazon set has and the deadline offer doubles the click rate, that is roughly
5–7 payers a month — the day-30 checkpoint (6), not the day-90 one (50). The
free-tier boundary gets us to the trajectory; the traffic gets us to fifty.
Nothing here replaces the 25× on people reaching six solves.

## Not doing

- Capping Easy/Medium for everyone (hits the wrong 58 people, shrinks the
  denominator).
- Bringing back the 7-day full-Pro trial (removed 2026-07-11 for the right
  reason: it gave the sprinter the whole paid good during their window).
- Discounts (buyers were deadline-driven, not price-shopping; the three US
  clickers all paid at $29).
