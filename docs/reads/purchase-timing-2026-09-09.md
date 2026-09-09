# Every purchase we have ever had was a first-session decision

**Read 2026-09-09.** Prompted by hakko504's reply to the dismisser
outreach — the first reply that campaign has produced. Answering him turned
into a re-measurement of who actually buys, and the answer contradicts the
shape `docs/agent/objectives.md` currently plans against.

Money is read only from `pro_events` where `event='pro_purchase_completed'
AND reason='stripe_webhook'`. Four purchases exist in the product's history.
Everything below is four people. Say that out loud before using any of it.

---

## The measurement

| Payer | Solves before paying | Solves after | First event → paid |
|---|---|---|---|
| guest_1783707523106 | 0 | 0 | 34 min |
| sergelafarge | 10 | 29 | 5h 24m |
| sab3r | 6 | 18 | 1h 54m |
| jeromezhao | 6 | 31 | 14 min |

**All four bought inside their first session, with ten solves or fewer.**
The deepest engagement any of them had before paying was ten challenges.

## The mistake this corrects

Measured at read time, the four payers hold 0, 24, 37 and 39 solves, and a
depth histogram makes that look like a gate:

| Solves (today) | Users | Payers | Rate |
|---|---|---|---|
| 0 | 5,069 | 1 | 0.02% |
| 1-4 | 376 | 0 | 0% |
| 5-19 | 228 | 0 | 0% |
| 20-39 | 47 | 3 | 6.4% |
| 40+ | 24 | 0 | 0% |

Read that table on its own and you conclude that twenty solves is the
qualification for buying, and that the job is to push people to twenty.
**That conclusion is an artifact of measuring depth after the fact.** The
depth arrived *after* the purchase — 18 to 31 solves each, in the days
following. Sorting buyers by a number they earned by being buyers explains
nothing.

The 228 users sitting at 5-19 solves are in the same solve range all three
real payers were in at the moment they paid. Solve count does not separate
them. What separates them is that the payers decided on day one.

## Which surface actually sold

The event immediately preceding each purchase, with its `reason`:

| Payer | Arrival | Modal that preceded the sale | Modal → paid |
|---|---|---|---|
| guest_1783707523106 | (pre-instrumentation) | `activation_funnel` / generic | 55s to click |
| sergelafarge | `company:Amazon` | generic | — |
| sab3r | `home` | **`milestone_solves`, 6 solves** | 7 min |
| jeromezhao | `home` | **`milestone_solves`, 6 solves** | **31 seconds** |

The milestone ladder fires at 6 / 10 / 25 / 50 solves. **Its 6-solve rung
shipped on 2026-07-23** (`66942c5`, widening a trigger that had been leaving
23 of 34 engaged users between 5 and 9 solves unasked). Both purchases that
have happened since came through that rung, in the buyer's first session, at
exactly 6 solves.

Two of four is not proof, and the two sit on either side of a change made for
an unrelated reason, which is a weak natural experiment rather than a strong
one. But it is the only paywall change in the product's history that has been
followed by a sale, and it was followed by every sale.

## What this corrects about O1

O1's decomposition points `paywall_ask_efficiency` at asking **engaged users**
better — the returning account with a month of history. Nothing has ever been
sold that way. But it is not true, as a first pass at this data suggested,
that no purchase came from an in-product ask. Two of them came from exactly
that. The error is in the *when*, not the *whether*:

**The ask that converts fires in the first session, at the sixth solve,
before the buyer has any history to be engaged about.**

That reframes the lever without retiring it. Ask-efficiency work is right;
aiming it at the Hard lock and the returning user is what the evidence does
not support. The surface with a track record is the milestone ladder's first
rung, and the whole decision happens inside one sitting — 31 seconds from
modal to payment, in one case.

The traffic half keeps its weight too. Three of four arrivals are readable:
one via `company:Amazon`, two via `home`. The company-page hypothesis has one
purchase behind it; the homepage has two.

## The working path, measured end to end

Last 30 days, people by `aid`, internal accounts excluded:

| | |
|---|---|
| People who solved anything | 315 |
| **Saw the milestone modal** | **164** (85% of all 193 Pro-modal views) |
| Clicked checkout | 5 |
| Paid | 2 |

And the machinery is **healthy**, which is the thing worth knowing. Of the
people whose first tracked event falls in the window, **138 reached six
distinct solves and 135 of them — 98% — were asked.** Three leaked. There is
no bug to fix in the one path that has ever produced a sale.

**So the constraint is not the ask.** It is that only 138 new people reached
six solves in a month. At the observed 2-in-138, fifty payers a month needs
roughly **3,450 people reaching six solves every month**, twenty-five times
today. Against that: 5,069 accounts have **zero** solves, ever, and another
376 have one to four.

O1's payer column is an activation problem wearing a pricing problem's
clothes. The lever is the first six solves, and the 105-opener claim reading
on 09-13 is already pointed at exactly that stretch.

## A risk this sharpens, for the 09-29 read

The cold-start rule (`src/utils/paid-wall.js`, `COLD_START_SOLVE_THRESHOLD =
1`) diverts anyone with zero solves away from the buyable wall and into a
starter challenge. **One of our four payers bought with zero solves**, 34
minutes after arriving. Under the current rule that person is routed away
from the modal they bought from.

That trade is the cold-start claim's whole point and it was made knowingly —
38 people in 45 days met a wall having solved nothing, and selling to them
converted once. But the 09-29 read should look specifically for a zero-solve
purchase that did not happen, not only for the activation gain. The guest in
question logged four events total and never solved anything before or after
paying, so it may not be a pattern worth protecting; that is for the read to
say, not for this note.

## Falsification

The claim is that buying is a first-session decision. **One purchase, before
2026-11-24, by someone whose first tracked event is more than a day earlier
refutes it** — and would mean the lock surfaces and the returning-user ask
deserve the billing the plan already gives them. One sale is enough; four
out of four is a pattern thin enough that the fifth can break it.

The claim is *not* that in-product asks do not sell. They do: two of four
came from the milestone modal. Do not cite this note for that.

## Instrumentation notes

- `users.created_at` is a last-save timestamp, not a signup, and it produced
  **negative** signup→pay latencies for three of the four payers here. This
  is already documented in `docs/agent/metrics.md`; it bit again anyway. Use
  the first `pro_events` row as the arrival anchor.
- Arrival is proxied by that first row, which is sound for the three 2026-08
  and 2026-09 payers. For sergelafarge (2026-07-21) it predates some landing
  instrumentation, so their 5h 24m is a ceiling, not a measurement.

## The reachability finding this read replaces

While chasing the depth hypothesis I measured that the default Practice view
(`challengePathFilter` defaults to `'recommended'`) exposes only the current
roadmap stage — **38 challenge ids out of 287**, none of them sector
challenges, and the terminal state after finishing the roadmap pins to the
last stage's seven ids rather than opening up. 66% of all 299 engaged users'
solves land on those 38.

It is a real defect and it is worth fixing on its own merits. It is **not**
the constraint on revenue: the nine users who cleared 30+ of the 38 all found
their way off the roadmap without help, averaging 44 off-roadmap solves. The
stall is at 7.6 solves, far below the ceiling, so widening the ceiling does
not address it. Filed as a content bug, not a growth lever.
