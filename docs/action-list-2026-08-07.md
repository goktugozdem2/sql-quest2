# Action list — 2026-08-07

Everything below came out of the 08-05/08-07 sessions. Ordered by what blocks
what, not by size. Each item names the metric it moves and what gates it.

Companion doc: `~/.gstack/projects/goktugozdem2-sql-quest2/cgozdemm-main-design-20260806-093807.md`
(the scorecard and competitive read this list acts on).

---

## 0. Dated — has a real deadline

| # | Action | By | Why it can't slip |
|---|---|---|---|
| 0.1 | **Deploy the `stripe-webhook` `resend_id` fix** | **Aug 9** | First Pro renewal ever lands Aug 9. Fix is source-complete but undeployed. If it renews without it, the engagement is unattributable forever. |
| 0.2 | **Resolve the `guest_1783707523106` Stripe discrepancy** | Aug 9 | 3 `stripe_webhook` money events on 07-10 that you say are not in Stripe. Until this is closed you do not know whether you have 1 paying customer or 2 — the most basic number in the business. |
| 0.3 | Rotate the VPS password for `can@213.133.110.93` | now | It was pasted into a chat window; it is on disk in the session transcript. Deleting the message does not recall it. |

---

## 1. Funnel — one day of work, gated on nothing, highest leverage

Everything downstream is multiplied by this. #91 sits at 68% solve-through and
the mobile first screen offers no way to write SQL — the only above-fold button
is "Go to lessons", which navigates away.

| # | Action | Effort | Moves |
|---|---|---|---|
| 1.1 | First-run card CTA → **"Start writing →"** (scroll + focus the editor). Lessons link demoted to secondary text. | ~2h | #91 68% → 80% |
| 1.2 | Collapse that card to one line — it currently describes two buttons that are off-screen | ~1h | ~300px back; Run above fold |
| 1.3 | Sticky Run/Submit on mobile | ~3h | every Easy challenge, not just #91 |
| 1.4 | Add `viewport` to the `trackActivationEvent` auto-stamp | ~10m | makes "is this mobile?" answerable at all |
| 1.5 | `FIRST_RUN_LEVELS` `working` → `[98,99,100,105]` (COUNT before GROUP BY) | ~15m | #100 stops being a first challenge at 43% |
| 1.6 | Rewrite the "only site that explains WHY" claim — homepage + `/vs-datalemur/` + `/vs-stratascratch/` | ~2h | claim is refutable; DataCamp ships the same thing |

**1.6's replacement claim:** one-shot error explanation is table stakes now. What
is defensible is *"remembers where you got stuck and picks the next thing for
you"* — session memory + skill radar + adaptive sequencing. Neither DataCamp nor
DataLemur does that.

**If you only get one day, do 1.1 + 1.2 + 1.5.** They share a commit and they
are the ones capping every other number.

---

## 2. Demand evidence — the actual constraint (2/10)

| # | Action | Gate |
|---|---|---|
| 2.1 | **Follow up with `pupsiiik`** — one line, no question mark needed: *"No reply needed — just closing the loop: if it was the price, I'd rather know than guess."* | now |
| 2.2 | Show the offer to the **48 engaged users who have never seen it**. Measure that cohort alone. | after §1 |
| 2.3 | Read whatever replies arrive from the 19. **Currently 0 of 19 after 46 hours.** | Aug 12 |
| 2.4 | **Send no new email wave.** 19 emails produced 0 replies and 1 app return with 0 solves. `arrivalSrc='email'`: 9 arrivals, 0 solves, ever. | standing |

2.1 is the single highest-information action available. It discriminates between
"pricing problem" and "positioning problem" better than any further analysis,
and it costs one email.

---

## 3. Traffic — after §1, not before

Measured by first-touch source, engaged% (5+ solves):

- comparison/review pages — **20%** (46 arrivals, 9 engaged)
- company pages — **12%** aggregate
- `home` — 9% · `sql-exercises` — 8% · `learn-sql` — 8% · `email` — **0%**

| # | Action | Note |
|---|---|---|
| 3.1 | More **neutral multi-way comparison** pages ("we tested 5 platforms") | `sql-practice-comparison` 27%, `best-sql-practice-sites` 17% |
| 3.2 | More company pages — template + pipeline already exist | 22 live; marginal cost of #23 ≈ 0 |
| 3.3 | Reddit r/SQL, r/dataengineering — answer questions, do not link | also produces conversations, which §2 needs |
| 3.4 | LinkedIn — the voice doc exists and is unused. Today's challenge-1 finding is one post. | `~/.gstack/.../linkedin-voice.md` |

**Every new page ships with its internal links in the same commit.** Orphan
pages do not get crawled — the 4 fintech pages sat unindexed for a week proving it.

**Do not build:** generic "learn sql" content (8%), head-to-head `vs-X` pages
(`vs-stratascratch`: 10 arrivals, 0 engaged).

**Do not buy ads.** At $4.81 education CPC and current conversion, one customer
costs $6,000–24,000 against $99–199 of revenue. The conclusion survives a 10x
error in your favour.

---

## 4. Agent system

Built and pushed: `scripts/agent/` — runner, guard (7/7 tests), 2 tasks,
subscription auth, quiet hours, daily cap.

| # | Action | Note |
|---|---|---|
| 4.1 | Run `install-vps.sh` on the VPS, fill `.env`, `loginctl enable-linger` | your hands — needs credentials |
| 4.2 | Add the **`Measures:` header + verifier + `ledger.md`** | the loop-closer. Without it the fleet only produces more PRs |
| 4.3 | Trigger `run.sh weekly-read` manually once and read the PR | the prompt is the tuning surface, not the code |

4.2 has a customer waiting: something has to re-measure challenge 1 on Aug 12
and say whether the rewrite worked.

---

## 5. Read calendar — pre-registered, do not move

| Date | Read | Pre-written rule |
|---|---|---|
| Aug 11 | ER-1, AR-1 baseline, blog-quiz reach (§18c) | — |
| Aug 12 | **Challenge 1 re-measure** | Description rewritten *and* recommendation routing changed on 08-05, so the read is confounded by design. What you *can* read: does it still get first-contact traffic? It should not. |
| Aug 13 | **#91 re-measure** after §1 ships | 68% → 80% target |
| Aug 17 | ON-1r re-read | does 9.0x fall toward parity |
| Aug 20 | **Outreach verdict** | **If fewer than 2 of 19 replies name the Coach or adaptive sequencing as valuable, do NOT move the Coach behind the paywall.** The differentiator is not felt, and paywalling it would only cost reach. |

---

## 6. Housekeeping

- `sql-cte-nedir` GSC indexing request — was quota-blocked Aug 5
- Delete the elena Gmail draft if still present
- CLAUDE.md content-depth table carries a re-measure warning; it has gone stale twice

---

## What is deliberately NOT on this list

- New challenges. 177 of 257 have never been opened.
- More measurement infrastructure. It is 9/10 and it is not the constraint;
  building more of it is procrastination that feels like work.
- Repackaging or price changes. Gated on §2 — every packaging decision made
  before the replies land is a guess.
