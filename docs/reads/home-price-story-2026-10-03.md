# The 10-03 reads: the homepage and the price story (written 2026-10-04)

Two ledger claims from 2026-09-12 with a 2026-10-03 read: "the homepage,
company-first" (`home_door`) and "the price story: page and modal tell it the
same way" (`modal_click_rate`). Founder's item 15: home → app must not fall
below 51.9%; modal → checkout must rise from 3.4% — if the second falls,
revert both the page and the modal.

## The price story — HIT on clicks, MISS on the plan mix

Milestone ask (`reason = milestone_solves`), people by aid, internal out,
2026-09-12 12:00 → 10-03, a click = `pro_plan_clicked` or
`pro_checkout_clicked` after the person was shown:

| window | shown | clicked | rate |
|---|---|---|---|
| 09-12 → 09-28 | 142 | 11 | 7.7% |
| 09-29 → 10-03 | 36 | 3 | 8.3% |
| **21 days** | **178** | **14** | **7.9%** |

Baseline 3.4% (203 → 7), target ≥ 5%: **HIT**, and it held after the 09-29
flags. Across every ask reason: 233 shown, 20 clicked (8.6%); the free-quota
wall 61 → 11 (18.0%).

Plan mix of clicks, all reasons, same window: **monthly 19 people, annual 2,
quarterly 2** (a leftover link). Target "annual ≥ half of plan clicks":
**MISS**, far under the third that the claim's falsification names. That
falsification's action — drop "most people choose this" — was already taken on
09-21. Purchases in the window (stripe webhook, `pro_purchase_completed`): 1
annual, 1 monthly, 2 without a plan field.

**Decision.** The backlog's open half of `pricing-modal-annual` — frame the
annual card by the job search and default the homepage pricing link to
`plan=annual` — is **not built**. Nine in ten choosers take monthly; the
objective counts payers, not revenue; pushing the larger upfront price at the
one step that already converts best risks the count for the amount. Revisit
only if the trial (on since 10-01) changes the mix: read the plan of
`pro_trial_started` on 10-22 with `trial_funnel`.

What the mix does say: the money is monthly, and a monthly payer whose
interview is over cancels (sabar2001, 09-23). That is the post-hire track's
case (`post-hire-track-2026-09-21.md`), next in the backlog.

## The homepage — FLAT, inside its ±3-point band

`landing_view` page=home → events after it, people by aid, 09-13 → 10-03:

| window | landed | opened app | solved one | reached six |
|---|---|---|---|---|
| 09-13 → 09-26 | 321 | 53.9% | 26.5% | 12.1% |
| 09-27 → 10-03 | 79 | 34.2% | 15.2% | 3.8% |
| **21 days** | **400** | **50.0%** | **24.3%** | **10.5%** |

Baseline (09-06 → 09-12): opened 51.9%, solved one 23.8%, six 10.3%. Target:
opened ≥ 55%, solved one ≥ 28%. Both moves are inside ±3 points → the claim's
own falsification: **the homepage was never the constraint; stop rewriting
it.** Verdict FLAT.

The last week's fall is mostly mix, not the page. Google landers 127 → 21
(the brand-search fall from 09-27), and Google landers open the app at 65%;
the week was carried by direct arrivals (26, 15% open — the class with the
crawler share) and ChatGPT (14, 36%). Within Google the rate also slipped
(65% → 43%, n = 21), unreadable at that n. Six-solves also carries the free
quota from 09-26 (asks at 10).

Item 15's revert condition is about the modal falling; it rose (3.4% →
7.9%). **No revert.** The home → app line (51.9%) is crossed by 1.9 points
over 21 days, inside noise; it is watched again with the hero CTA test
(armed 10-04, randomised) and the /vs-chatgpt/ block (10-03).
