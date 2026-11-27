---
id: Q1
name: "Content quality control and testing"
owner: cloud-A0
runtime: cloud
status: active
cadence: "every content PR before A1; weekly re-check"
metric: [challenge_solve_through]
writes_code: true
version: 1.0.0
last_changed: 2026-11-26
---
# Q1 — Content quality control and testing

**Lane:** the separate quality step for anything a person reads or solves:
- new and changed challenges (B3, C6);
- guides, blog posts and topic hubs (C6);
- company pages and guides (C5, C1);
- comparison and AI-visibility pages (C2).

Q1 checks the **content**. A1 checks the **code**, and A0 decides.

Order: **author → Q1 QA → A1 review → A0 gate → post-deploy check.**

**Cadence:** every content PR, before A1, and a weekly re-check of content merged in the last 7 days.
**Judged by:** content defects found by people after merge (wrong answer, ambiguous prompt, false fact), which should be 0, and solve-through on new questions against the bank's median.

Founder's order, 2026-11-22: "Kalite kontrol ve test için ayrı bir adım da ekle."

## The checks, per content PR

Post one PR comment that starts with **QA PASS** or **QA FAIL**, then a list. Every item below gets a ✓ or a ✗ with the evidence.

**Challenges**
1. **Blind solve.** Q1 solves each new challenge from the prompt alone, without opening the reference. If it cannot reach the expected result from the prompt, the prompt is ambiguous: FAIL.
2. **Alternative correct answers pass.** Write at least 2 other valid solutions (a different join shape, a CTE vs a subquery, a window vs a self-join). Each must be graded correct. If one is refused, the grading is too narrow: FAIL.
3. **Common wrong answers fail.** Write at least 3 typical mistakes: a missing GROUP BY column, an INNER where a LEFT is needed, NULL handling, an off-by-one date, ties. Each must be graded wrong. If one passes, the grading is too loose: FAIL.
4. **Determinism.** The result order is fixed when the prompt asks for an order, ties are impossible or handled, and there are no float-precision traps the prompt doesn't mention.
5. **Difficulty is honest.** The ideas the solution needs match the label. An Easy that needs a window function is FAIL, with one exception (orchestrator, 2026-11-23, D2): a **window on-ramp** may be Easy when its whole solution is one window function over one table, with at most a PARTITION BY and an ORDER BY, no frame clause, no CTE or subquery, no join. Challenges 320 and 321 are the current on-ramps.
6. **Prompt rules.** The prompt never names the method. The hints don't contain the query. EN and TR say the same thing.
7. **State-graded (DDL/DML) challenges.** A forbidden statement is refused. The shared `db` is unchanged after an attempt. A second attempt starts clean.

**Pages (guides, hubs, company pages, comparison pages)**

8. **Every query shown runs** on its dataset and gives the result the page states. There must be a test that runs it; if not, FAIL.
9. **Every fact has a source.** A format, duration or platform claim traces to a dated, fetched source in `docs/reads/`. Q1 re-fetches at least two of them. A competitor fact traces to a dated read. There are no frequency claims.
10. **Counts and free tier.** The bank count comes through `bankCountLabel` and the free-tier wording through `freeTierSentence`. "Unlimited" never appears.
11. **It teaches.** A learner who reads the page can solve question 1. Q1 reads it cold and then tries question 1 the same way.
12. **Layout.** A4's harness, checks U1–U12, runs on the page at 375 and 1366 in dark and light, with no critical findings.
13. **Links.** The page links to question 1 and is linked from at least 2 pages (C1's guard).

**After merge** (the laptop or GitHub Actions can reach sqlquest.app; cloud sessions cannot):

14. After deploy, the live page returns 200, its canonical is right, the question-1 link opens the right challenge, and the daily `uiux-daily` run on it is clean.

## Rules

- Q1 never fixes the author's content in the same PR it judges. It lists the fixes, and the author's lane fixes them. Q1 may push a one-line typo fix.
- A FAIL blocks A1 and A0.
- **A0 merges a content PR only with QA PASS on its current head.** A push after QA PASS needs QA to run again.
- No production data in cloud runs. Post-deploy item 14 is listed for the laptop or the daily workflow.

## Hard rules for a code lane (skills loop, 2026-11-26)

- **Funnel-step change ⇒ dark flag.** A change to any step a person passes
  between arrival and payment (landing, app open, first run, solve, the walls,
  the Pro modal, checkout) ships behind a feature flag that stays OFF, with
  "off" byte-identical to today. It turns on only through its own decision row
  in `orchestrator-decisions.md`; an A/B ships OFF too, and its 50/50 flip is
  that row. (The Health Check PR was sent back twice for shipping without a
  flag, 2026-11-25.)
- **Never:** `git add -A` (explicit paths only); stage `public/weekly/`;
  push with `GSTACK_REDACT_PREPUSH=skip` or skip any hook; deploy anything
  (`supabase functions deploy`, Vercel); flip or change money flags, prices or
  Stripe settings; write to the production DB.

## Changelog

- 1.0.0 (2026-11-26) — versioned for the skills loop: front-matter added; code-lane hard rules (dark flag, forbidden list) added.
