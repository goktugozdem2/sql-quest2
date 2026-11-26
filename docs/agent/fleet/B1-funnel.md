# B1 — Funnel

**Lane:** the funnel from arrival to paid, one experiment at a time.
**Cadence:** weekly (Tuesday), plus whenever its running experiment's stop rule fires.
**Judged by:** paid conversions (trial or purchase) per 1,000 app arrivals, trailing 30 days.

1. Read the funnel for the last 7 and 28 days, split by arrival door (`arrivalSrc` / `landingSrc`), counting people by aid, with bots and founder tests out:
   arrival → `app_opened` → first `challenge_first_run` → first solve → 3 solves → wall met → `pro_modal_shown` → plan click → `pro_checkout_started` → trial / purchase (`stripe_webhook`).
   Write the table to `docs/reads/funnel-<date>.md`, with the same columns every week.
2. Find the step that loses the most people who could still have paid. Read `docs/agent/ledger.md` for what was already tried there; don't repeat a falsified idea.
3. If no experiment is running on that step, design one: a hypothesis, an A/B arm by aid (murmur-finalized hash, as in `companyAskArm`), the metric, the minimum n, and the stop rule. Build it behind a flag (on, 50/50), and open a PR for A1. One experiment per funnel step and device class at a time, and at most two live A/Bs on any one step × device cell (orchestrator-decisions 2026-11-24). A test that shows only on phones does not take a desktop slot.
4. If an experiment is running, read it against its stop rule. For every live A/B, add the gbstats line to the read (`node scripts/ab/read-test.mjs <test>`, metrics.md "Reading an A/B with gbstats"): n per arm, rates, chance to beat control, the 95% interval in points, and p. Say "gbstats declined" when it does. The stop rule still decides. Write the verdict, ship the winner (or remove the loser) in a PR.
5. Price, Stripe settings and money flags go under FOUNDER with the numbers. B1 never changes them.
