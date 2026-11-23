# Fleet scorecard — 2026-W48 (first weekly D2 retro, Monday 2026-11-23)

**Window:** 2026-11-16 00:00 → 2026-11-23 07:00 UTC. All activity actually falls
between 11-19 and 11-23. The fleet itself started on 11-22 at 07:09 UTC (#119),
so this is one day of fleet work plus three days of the founder-led main
session before it. Read every rate below with that in mind. The two-week
"noop → pause" rule (README, Performance) cannot fire yet.

**Sources:** `gh` (149 PRs opened in the window, comments, check rollups, 488
workflow runs, 122 commits on `main` with their Vercel statuses, GitHub
deployments), the laptop run log `~/.claude/sqlquest-fleet/state.json` (45 runs,
36 founder-queue items; aggregated here, no customer names copied), and one
read of the live homepage. Gmail was not opened. The cloud runtime keeps no
run log, so for cloud lanes "runs" is unknown and PRs stand in for it.

**Same model family.** D2, A1, A0 and every author are one model family. The
rule-6d sample in §5 and the review findings in §3 share their blind spots.
The founder's skim is the only outside look this week.

---

## The three lines for the founder

1. **Shipped:** 114 PRs merged (63 with code), 42 production deploys, 0 reverts.
2. **Moved:** nothing on O2 yet. Payers / 30 d went 3 → 2 on 11-22 when an
   October payment left the window, and 0 purchases, trials or checkout clicks
   have happened since 11-21. The paywall work that went live on 11-22 at
   06:51 UTC has its reads due later.
3. **Needs you:** production has not deployed since **11-22 12:15 UTC**. The
   live homepage is byte-identical to the build *before* #146. Separately,
   **26 PRs carry an A1 MERGE and wait on A0**, and 23 of them are drafts that
   no lane is trusted to merge (rule 6c). Skim the 14 money/auth/`supabase/`
   PRs listed in §5 that merged with no outside look; #117 edited the
   session-token-cut SQL.

---

## 1. Per agent

"Runs" comes from the laptop log. Cloud lanes have no log, so they show "—".
"Fleet era" means PRs #119–#214.

| Agent | Runtime | Runs | PRs opened | Merged | Share | Judged by (brief) | This week, in one line |
|---|---|---|---|---|---|---|---|
| Main session (pre-fleet) | laptop | — | 53 (#66–#118) | 53 | 100% | — | Paywall, checkout, trial and diagnosis work; 43 code PRs. Merged with no A1 (A1 did not exist yet), median 18 min open → merge. |
| Orchestrator (laptop) | laptop | 6 | 23 | 21 | 91% | — | Fleet rules, briefs, two Vercel fixes (#125 caused the stranding, #204/#180 fixed it on paper but have not deployed). |
| Orchestrator (cloud) | cloud | — | 10 | 9 | 90% | — | Briefs for E2, B5, C5, C6, C7, B6, Q1 and the G1 goal owner: 7 new lanes in one afternoon. |
| A0 gate | cloud | — | 2 | 2 | 100% | reverts of PRs it merged (0) | 8 merges logged in `decisions.md` on 11-22, then **no pass since 12:35 UTC on 11-22** (≈ 18.5 h). Reverts: 0. |
| A1 reviewer | both | 7 (laptop) | 0 | — | — | reverts (0); prod bugs in approved code | Gave a verdict on 42 PRs: 41 MERGE on the first verdict, 1 REVISE (#172), 0 REJECT. On 9 of them A1 pushed its own fix and approved that head (§6). |
| A2 live QA | both | 2 | 5 | 5 | 100% | prod bugs people report first; smoke green | Caught the 375 px header overflow from #108 (#135) and the footer scroll on 25 pages (#136). The best value per run this week. |
| A3 errors | laptop | 3 | 3 | 2 | 67% | `feedback_failed` = 0; new errors handled in a day | Found the 10:00 mail crons timing out together (0 welcome-back / skill-decay sent on 11-22). The fix is a founder SQL item. |
| A4 UI/UX | cloud | — | 9 | 4 | 44% | critical findings → 0 | Critical 56 → 0 (app 14 → 0, marketing 14 → 0 on the merged half). 5 more have A1 MERGE and wait. #144 and #146 are merged but **not live**. |
| B1 funnel | laptop | 4 | 3 | 2 | 67% | trial-or-paid per 1,000 arrivals | Why six-solvers fell 209 → 57; India checkout: 17 clickers → 1, and UPI can't work on a USD subscription session (#208, waiting). |
| B2 measurement | laptop | 1 | 1 | 1 | 100% | overdue ledger reads (target 0) | O2 day-0 row written (2 payers); 19 overdue verdicts closed. |
| B3 content | cloud | — | 1 | 1 | 100% | solve-through on new questions | 5 Easy on-ramps (320–324). Q1 later found a wrong example in 323 (#167, still open). |
| B5 onboarding | cloud | — | 1 | 0 | 0% | `open_to_first_run` | `companyDirectOpen` A/B (#156) has A1 MERGE and waits on A0. **0 merged.** |
| B6 competitors | both | 1 | 2 | 0 | 0% | findings shipped within 28 d | Two dated market reads, both open drafts. **0 merged; output is docs only.** |
| C1 search | both | 2 | 7 | 3 | 43% | organic clicks / week | Rollup page, Chime page, bingbot robots fix (#138). 4 SEO PRs wait. |
| C2 AI visibility | laptop | 2 | 3 | 1 | 33% | `ai:*` landings / month | Answer-first summaries (#142). The prep-plan and mock pages (#191) wait. |
| C3 backlinks | both | 2 | 3 | 2 | 67% | live links earned / month | 4 Gmail drafts, **0 sent, 0 live links**. |
| C4 build in public | laptop | 1 | 1 | 1 | 100% | posts the founder sent | 2 bilingual drafts. Sent count is not in the log. |
| C5 revenue content | cloud | — | 2 | 0 | 0% | trials per 1,000 landers on its pages | Revolut guide and the metrics case round both wait. **0 merged.** |
| C6 topics | cloud | — | 2 | 0 | 0% | `topic_funnel` | State-graded DML set (#172): 4 QA FAILs, then PASS. Both PRs wait. **0 merged.** |
| C7 questions | cloud | — | 1 | 0 | 0% | share of mined clusters answered | 5 question shapes answered on 3 pages (#178), waiting. **0 merged.** |
| C8 traffic sources | laptop | 1 | 1 | 1 | 100% | share of arrivals with a known source | Showed that the aocr.org referrer is a crawler. |
| E1 customers | laptop | 4 | 0 | — | — | replies per sent draft | 7 drafts (2 runs), 2 noop runs. Sent: not recorded. **Only drafts.** |
| E1/E2 code (#155, #157) | cloud | — | 2 | 0 | 0% | reasons captured / month | Feedback asks and goal-note, both with A1 MERGE, waiting. Two orchestrator decisions (`exitReasonAsk`, `day2Ask`) are blocked behind #155. |
| G1 GEO | laptop | 1 | 2 | 1 | 50% | share of voice | Baseline (§5 flags its denominator). The entity fix (#187) waits. |
| P1 partnerships | laptop | 2 | 2 | 1 | 50% | replies per sent message | 5 drafts; 2 sent on 11-22 per the log; 0 replies yet. |
| Q1 content QA | cloud | — | 2 | 0 | 0% | defects found after merge (0) | Did its job: 4 FAILs on #172 before merge, and a defect found after merge in #132. |
| R1 company research | both | 4 (+1 unlogged) | 5 | 3 | 60% | — (brief has no number) | Coverage 19 / 34 companies. Produced 4 founder hand-read asks. |
| S1 SEO sentinel | laptop | 1 | 1 | 1 | 100% | days from anomaly to flag | Its first run found the #125 stranding (F2). High value. |
| Unlabelled (#173, #175) | cloud | — | 2 | 0 | 0% | — | Content-funnel measurement and a PostgreSQL spike: large, dark, unowned. |

**Candidates to pause or merge into another lane** (0 merged output, or only
unsent drafts): **B6, C5, C6, C7, B5** (0 merged), **E1, C3** (drafts only,
none confirmed sent), and the two unlabelled cloud PRs. For B5, C5, C6 and C7
the cause is the A0 queue, not the work: A1 said MERGE on all of them. B6, E1
and C3 are different. Their output has no consumer until someone acts: the
founder's send, or a lane that reads B6's notes.

**Tokens.** Only 11 laptop runs logged tokens: 141k–293k per run, ~220k on
average. Tokens per merged PR cannot be computed for most lanes, and not at
all for the cloud.

---

## 2. DORA-style

| Measure | This week | How it was counted |
|---|---|---|
| **Deploy frequency** | **42 production deploys**: 14 on 11-20, 24 on 11-21, 4 on 11-22, **0 since 11-22 12:15 UTC** | Vercel status "Deployment has completed" on `main` commits |
| Main commits not deployed | 69 of 122 (57%) were rate-limited; 4 cancelled from the dashboard; 4 skipped by the ignored-build step | same |
| **Lead time, open → merge** | median **1 min** over all 114. Pre-fleet: 18 min. Fleet docs self-merges: 15 s. **A1-reviewed path: 52 min** (15 PRs) | `createdAt` → `mergedAt` |
| **Lead time, merge → live** | from about 1 min (11-21 evening) to **still not live after 18.6 h** (#144, #146, #180, #204) | merge time vs the next successful deploy |
| **Reverts** | **0** | commit titles on `main` |
| **Change-failure rate** | **4 of 63 code PRs (6%)**; 3 of 63 (5%) without the probable one | a later PR fixes a defect it shipped |
| **Time to restore** | median **≈ 18 h**; 2 of 4 failures **still open** | defect live → fix live |
| CI (`verify`) | green on the final head of **every** merged PR. 3 red PR runs, all pre-fleet, fixed before merge. 1 red run of the new content-funnel workflow on a branch (#173) | `gh run list` |
| Smoke | 8 red pushes, 7 of them on 11-22 08:15–11:43: "deploy not live after 604 s" plus two real checks (the first-screen arm, and the 375 px header from #108). **No rollback fired**, because `DEPLOY_LIVE=false`. Green again from the 12:14 deploy | Smoke workflow logs |

**The four change failures:**

| Shipped in | Defect | Live from | Fix | Restored |
|---|---|---|---|---|
| #108 "Try Pro" in the header | header ran 62 px off a 375 px phone | 11-22 06:51 | #135 (A2) | 11-22 12:15 — **5.4 h** |
| #73 Datrick footer link (probable cause, not proven) | 25 pages scrolled sideways on a phone | 11-21 18:02 | #136 (A2) | 11-22 12:15 — **18.2 h** |
| #125 ignored-build step | #144 and #146 merged and never deployed (S1 F2) | 11-22 12:19 | #204, #180 | **open, ≥ 18.6 h**: both fixes merged, but their own deploys were rate-limited |
| #132 Easy challenges | challenge 323's example misstates the logins table | 11-22 12:15 | #167 (Q1), draft | **open, ≥ 18.8 h** |

**The 11-21/22 Vercel rate-limit incident.** Hobby allows 100 deployments a
day (`api-deployments-free-per-day`), and branch previews count. On 11-21 the
repo created **88 deployments: 58 previews (66%) and 30 production**. There
were three stale windows:

- 11-21 23:02 → 11-22 06:51 (**7.8 h**). 14 merges waited (#103–#116), 8 of them paywall, trial or checkout changes.
- 11-22 07:29 → 12:15 (**4.8 h**).
- 11-22 12:19 → now (**≥ 18.7 h, open**). The two fixes for the cause are merged, but nothing has pushed to `main` since 20:23, so nothing has deployed them.

Since a rate-limited deploy is never retried (README, Budgets), the next
push to `main` is what restores production. `#180` turns off branch deploys
for 36 prefixes, but it has not been through a single day in production yet.

---

## 3. Bottlenecks

**A0's merge queue: 35 open PRs.**

- **26 have an A1 MERGE and wait on A0.** 23 of them are drafts: B5, C5, C6, C7, A4, E1/E2, Q1, B6, the G1 goal owner, and the two unlabelled PRs. 3 are not drafts: #187, #188, #191.
- The oldest, #145, has waited since 11-22 11:27 UTC (≈ 19.5 h).
- **Rule 6c blocks all 23 drafts.** A0 may not merge a lane's drafts until the lane is marked trusted in `orchestrator-decisions.md`, and **no lane is marked trusted**.
- Two orchestrator decisions are waiting on that queue: `exitReasonAsk` and `day2Ask` (on #155), and `companyDirectOpen` (on #156).
- **9 more have no review:** 8 laptop docs-only PRs (#206–#208, #210–#214), which the laptop may merge itself under rule 6, and #209 (code, for A1).

**The founder queue: 36 items** (`state.json`, titles grouped, no names).

| Kind | Items |
|---|---|
| Search-console hand actions (Bing inspection, submit, Site Explorer, GSC request indexing, the Copilot count) | 8 |
| Outreach sends (P1, C3, the premium-mock asks, list PRs, the alternativeto listing) | 8 |
| DB / cron / migration / function deploy (A3) | 6 |
| Research hand-reads behind a 403 or login (R1 ×4, the monthly G1 panel) | 5 |
| Stripe dashboard checks (subscribers, a failed annual charge, India sessions, a trial's day-7 charge on 11-25) | 4 |
| Decisions (the quota rule, the Capital One mock format, the activated-note segment) | 3 |
| Tooling (redaction hook on bundles) | 2 |

- **Age.** 25 of the items carry no date. All were written on 11-22 or 11-23, so the queue is 0–1 days old.
- **The quota decision is the oldest item underneath.** It is the "10-09 rule", **45 days past its date**.
- **There is no done marker.** At least one item is stale: P1's two sends are listed as pending, but the 11-23 P1 run says they went out on 11-22.
- **R1 is the biggest single source of founder asks** (4 hand-reads), then C3 (4 send items).

**Drafts produced vs sent** (from `state.json` only):

| Lane | Drafts | Sent (per the log) |
|---|---|---|
| E1 | 7 | not recorded (the 11-23 run says "0 replies yet to 11-22 notes") |
| P1 | 5 | 2 |
| C3 | 4 | 0 |
| C4 | 1 Gmail draft + 2 posts | not recorded |
| **Total** | **≈ 17 Gmail drafts** | **2 confirmed** |

**Vercel deploy budget.**

- The cap was hit twice in 24 h, and 57% of `main` commits did not deploy.
- The README's "about 15 merges a day" did not hold: there were **67 merges on 11-22** and 40 on 11-21.
- A0 applied the 15 cap to code PRs only (#154 holds #145, #147 and #149 "for budget"). Docs merges ran without a limit, and each one is a push to `main` that spends a production deployment. So the cap protected nothing.

---

## 4. Objective link (O2: 10 payers / 30 d by 2027-02-08)

- **Measured this week:** payers / 30 d = 3 at 11-22 09:29Z, then **2** from 16:37Z. Six-solvers / 30 d = 64. The 12-10 checkpoint needs **4**, which means 3 new purchases or after-trial conversions by 12-10. E1 on 11-23: **0 purchases, trials or checkout clicks since 11-21.**
- **Could move O2, and is live** (deployed on 11-22 06:51–12:15, reads still to come):
  - the main session's paywall and trial work (#95, #98–#101, #104, #108, #110–#114, #117–#118);
  - #135, which made the new "Try Pro" header button usable on a phone;
  - #136, the company-page footer (company pages are the best money door).
  - #117/#118 (the failed-charge fix, session recovery) are code-half only. They need the founder's migration and function deploy.
- **Could move O2, and is stuck:**
  - #156 `companyDirectOpen` (company arrivals open question 1);
  - #155 exit-reason ask (why 17 of ~20 Stripe sessions expired);
  - B1's India checkout read (#208), which names a payment-method dead end;
  - E1's trial and premium-mock drafts, which need the founder's send.
- **Could not move O2 this week, by design:**
  - R1 dossiers (input for content);
  - C3 backlinks (0 sent);
  - C4 drafts;
  - G1's baseline;
  - B6 reads;
  - the 33 orchestrator docs PRs (fleet infrastructure);
  - A3 (it found lost lifecycle mail, which matters for returns, but the fix is the founder's SQL).
- **Honest read:** this week's fleet output was mostly infrastructure, research and code waiting in a queue. The work that can reach a payer is either already live from the pre-fleet session, or stuck behind A0, rule 6c and the deploy budget.

---

## 5. The rule-6d sample

**Pick:** Python `random.Random(20261123).sample(...)` over the 114 PRs merged
in the window, sorted by number. **Seed: `20261123`** → **#139, #154, #185.**

All three are docs-only, so the sample says little about code risk. For the
founder's skim, the PRs that matter more are below the sample.

| PR | What it changed | Risk | Looks right? |
|---|---|---|---|
| **#139** A2 brief, one line | A2 measures horizontal overflow against the viewport it set, never `innerWidth`; every element's right edge must be ≤ that width. | None for a person. If it were wrong, A2 would miss overflow again, as it did with #108. | **Yes.** The fix matches the cause #135 documented. |
| **#154** A0 gate log, second pass | Logs the merges of #141, #143, #144 and #146, and holds #145, #147, #149 and #150 "for today's merge budget (15)". | Audit-trail only. But two of its lines are now false: "Deploys after the reset" for #144 and #146 (never deployed, §2), and the budget it protects was spent by uncounted docs merges. | **Mostly.** The record is accurate for its moment; its assumption about deploys did not hold. |
| **#185** G1 GEO baseline read | Baseline: Perplexity "named or cited in **3 of 15**". Perplexity answered only 5; the other 10 were not read. | The denominator mixes unread prompts with absent answers. When the sign-in wall lifts, share of voice could appear to jump from 20% with no real change. It is 3 of 5 answered (60%), with 10 unknown. | **Revise the wording** in the next G1 run. Self-merged under the docs-only rule, correctly. |

**For the founder's skim instead (outside the random sample).** 14 PRs merged
this week touch money, auth or `supabase/`, and none had a look from outside
the model family. All were merged by the pre-fleet main session (11-20 →
11-22 07:06), before rule 6d existed:

- money: #66, #70, #71, #95, #100, #111, #113, #114, #117, #118;
- `supabase/` functions or migrations: #86, #87, #88;
- auth: the #91 test.

Read **#117** first. It edits `supabase/manual/20260925b_session_token_cut.sql`,
and CLAUDE.md reserves the session-token cut to you. Then read **#118**
(checkout recovery, three functions).

---

## 6. Recommendations (ranked, at most five)

No metric or scorer change is in this PR (rule 6b). Each item names who
decides.

1. **Restore production and drain the queue today** (orchestrator + A0).
   - One push to `main` deploys #144, #146, #180 and #204.
   - Then let A0 run its 3-hourly pass. Today it merges nothing for 18 h when a cloud session is not open.
   - In `orchestrator-decisions.md`, decide which lanes are trusted under rule 6c. A4 has 4 clean merges and 5 more A1 MERGEs, so trust it. Keep C6 supervised: it took 4 QA FAILs before #172 passed.
   - Until that is done, the 23 drafts are stock, not output.
2. **Cap pushes to `main`, not merges** (cap change; orchestrator).
   - Count every push: docs, code and merges of main into branches.
   - Batch the laptop's docs-only PRs into one daily docs merge, and keep `main` pushes at or under about 15 a day until #180 has one full day in production.
   - Add the hardening plan's 80% budget alert.
3. **Slow down the lanes with no consumer** (lanes to pause, merge or re-cadence; orchestrator).
   - **C7 merges into C6.** C7 exists to feed C6, and both are daily.
   - **B6 goes daily → weekly** and feeds B4's monthly plan.
   - **C3 adds no targets, and P1 adds no drafts,** until the founder sends what is queued. C3's own 7-day rule and P1's 11-29 rule already point this way; apply them now.
   - **C5 and C6 hold new PRs** while their first PRs wait in the queue.
   - Reason: 7 lanes were added in one afternoon, and the gates (Q1 → A1 → A0) and the founder's sends are the bottleneck, not authoring.
4. **Brief fixes** (orchestrator, docs).
   - **(a) A1 must not approve its own commit.** On 9 of 42 PRs (#132, #134, #155, #157, #174, #175, #176, #187, #188), A1 pushed a fix and said MERGE on that head. That is rule 6b's "never grade yourself" in another form. A1 should say REVISE and leave the fix to the author, or a second reviewer should approve that commit.
   - **(b) The log.** `state.json` logs no cloud runs, missed R1 batch 3, has no `sent` field on drafts and no done or date field on 25 of the 36 founder items. Add `sent` and `done`, plus a cloud run line in the PR body that the laptop copies.
   - **(c) D2's own brief and the README** name `docs/agent/fleet-scorecard.md` and a self-merge, while this run was told `scorecard-2026-W48.md` and no merge. Pick one.
   - **(d) Give R1 a number.** Its brief has none, and it drives the most founder hand-reads.
5. **Playbook note: "merged is not deployed, and drafted is not sent."**
   - This week 114 PRs merged, yet production has been frozen for 18 h.
   - 17 drafts were written and 2 are confirmed sent.
   - A fleet's throughput is set by its deploy budget, its review gate and the founder's sends, not by how many agents run. Judge each lane by what reached a person, and measure lead time to *live*, not to merge.
   - (This is for `docs/playbook/`; not edited here.)

*Not done by this PR:* no brief, cadence, cap or decision file was changed.
Each item above is for the orchestrator to take, or reject, in its own PR.
