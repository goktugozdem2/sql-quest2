# Goal tracker — G0

The one place that says where the current objective stands today. G0 rewrites
the "Today" block on every run and appends to the other sections. The brief is
`docs/agent/fleet/G0-goal.md`; the objective is `docs/agent/objectives.md`.

---

## Objective: O2, 10 paying customers per 30 days by 2027-02-08

### Today (G0, 2026-11-23, cloud run)

**No new O2 number since 11-22.** B2's daily row (11-23 plan, row 3) was not
written. Every value below is a day old. This run read no production data.

| | Value | As of | Source |
|---|---|---|---|
| Payers / 30 d | **2** | 2026-11-22 16:37Z | B2, objectives.md day-12 row |
| Six-solvers / 30 d | **64** | 2026-11-22 | B2 (B1 reproduces 63) |
| Six → payer rate | 3.1–4.7% | 2026-11-22 | B2 |
| Active paying subscribers | 5 (one monthly renews 11-23) | 2026-11-22 | B2 (`users.data`, not Stripe) |
| Trials in flight | 1 (monthly, ends 11-24) | 2026-11-22 | B2 |
| Days left | **77** (day 13 of 90) | | |
| Next checkpoint | **2026-12-10: 4 payers / 30 d**, 17 days away, 3 purchases short | | objectives.md |

### The gap

- **To 12-10:** only the 11-21 annual is inside that window. Reaching 4 needs
  **3 more first purchases or trial conversions in 18 days**. The last 30 days
  produced 3.
- **To 02-08:** 10 payers a month at today's 3–4% rate needs **~250–330
  six-solvers a month**. Today there are 64, so **×3.9–5.2 short**.
- **The short factor is six-solvers, not the rate after them.** B1's split
  (`docs/reads/funnel-2026-11-22.md`) of the 223 → 64 fall:
  - **~62% volume (L1):** fewer people solve anything. The Bing →
    `/sql-exercises/` door alone is about half of the whole drop (Bing clicks
    292/wk → 21/wk, an impression collapse, not CTR).
  - **~38% the 1 → 6 rate (L3):** it fell from 42% to 26%. Part of it came
    from the `weakSkillNext` handoff, reverted 11-22 (#90). The 10-19 / 10-26
    trough is unexplained.
- **Google is flat** (125–211 clicks a week). It is the floor, not the lever.
- **New on 11-23, L4: India's checkout clicks never convert.** B1's read
  (#208, open) found India is 17 of the 46 people who clicked through to
  checkout in 90 days. Since 10-08, 8 new India-priced people reached a
  Stripe session; none trialled or paid, and none left a decline. They come
  back 21–39 s after the click. The data cannot say why (no UPI/RuPay, a card
  blocked for international use, or no card for a trial). The founder's
  15-minute read of those 8 sessions in Stripe decides the fix. A third of
  the people who reach checkout are on this path, so it is the cheapest lever
  on the 12-10 checkpoint.
- **New on 11-23, L1: Bing's index is RED.** S1's first sentinel run (#203)
  found 833 URLs in Bing's index against a sitemap of 429 (1.94×, red line
  1.3). This fits B1's reading that `/questions/` entered Bing's index while
  clicks fell. #72's bingbot noindex (read 2027-01-08) is the bet on it.

### What the target needs, per lever (planning line, not a forecast)

| Lever | Now | Line for 12-10 | Line for 02-08 |
|---|---|---|---|
| L1 first solvers / 30 d | 222 | ≥ 300 | ≥ 700 |
| L3 1 → 6 (14 d) | 26% | ≥ 36% (the pre-trough level) | ≥ 40% |
| Six-solvers / 30 d | 64 | ≥ 110 | ≥ 280 |
| L4 six → payer | 3–4.7% | hold ≥ 3% | hold ≥ 3.5% |
| Payers / 30 d | 2 | **4** | **10** |

---

## Active bets

Each bet is a merged or soon-merged change with a lever, an expected effect and
a read date. G0 closes a bet only on its read.

| # | Bet | Lever | PR | Expected | Read | Status |
|---|---|---|---|---|---|---|
| 1 | `weakSkillNext` reverted, so the post-solve next step is the ladder again | L3 | #90 | 1 → 6 back to ≥ 36% for the 11-23 → 12-06 cohorts | B1, 11-24 and 12-01 | merged 11-22 |
| 2 | Account ask at 3 solves | L3/L4 | #98 | 3 → 6 does not fall below ~44% among people asked | B1, 12-01 | merged 11-22 |
| 3 | `/sql-exercises/` copy + live counts; site-wide claim guards | L1 | #160, #162 | Bing door impressions stop falling (the cause is not proven to be copy) | C1, 12-14 | **merged 11-23** (#160, #162); deploys on the next Vercel slot |
| 4 | Related links for 15 thin pages | L1 | #163 | ≥ 12 of 15 crawled by Bing after the deploy | C1, 12-20 | **merged 11-23**; the baseline read (C1 row) is still missing |
| 5 | Bingbot noindex on `/questions/` | L1 | #72 | Bing's crawl returns to the money pages | C1, 2027-01-08 | merged 11-20 |
| 6 | Exit-reason ask after a closed modal or wall | L4 (learning) | #155 | reasons for ≥ 10 of the next ~20 expired checkouts | E2, 12-20 | still open 11-23; flag ON after merge (orchestrator) |
| 7 | Company arrival opens question 1, 50/50 | L2 | #156 | company-door `open_to_first_run` up; stop rule in the PR | B5, per PR | still open 11-23; flag ON after merge (orchestrator) |

## Closed bets (what each ruled out)

| Date | Bet | Verdict | What it ruled out or proved |
|---|---|---|---|
| 2026-11-22 | `weakSkillNext` handoff (09-30) | MISS, reverted | The next-quest takers halved (51–58% → 26–34%) under it. One cause of the rate drop, but not all of it: the 10-05 cohort was under it and still reached six at 40%. |
| 2026-11-22 | Activated-note email (09-12, 10-01) | closed by its own falsification | 80 mailed: 2 came back, 1 plan click, 0 paid. This segment is not mailed again. |
| 2026-11-22 | Hero CTA arm "Test My SQL Skills" | MISS (B2) | 8.7% solved-one against control's 13.3%. |

---

## Run notes

- **2026-11-23.** The scheduled 03:48 UTC run wrote its plan but could not
  push: a fresh routine session has no repository and no GitHub tools, so the
  push was refused with 403. A re-run at 07:07 stopped for the same reason.
  The daily task now fires into the session that holds the repository. This
  run was done there, by hand, at ~07:30 UTC.

## Daily log

| Date | Payers / 30 d | Six-solvers / 30 d | Short lever | Rows planned | Rows shipped (previous plan) | Plan |
|---|---|---|---|---|---|---|
| 2026-11-22 | 2 | 64 | L1 (volume), then L3 | 6 | first run | `2026-11-23.md` |
| 2026-11-23 | 2 (a day old) | 64 (a day old) | L1, with L4 (India checkout) new | 6 | 1 shipped, 2 partial, 2 not started, 1 due 11-24 | `2026-11-24.md` |

## Weekly

The first week section is written Monday 2026-11-30.
