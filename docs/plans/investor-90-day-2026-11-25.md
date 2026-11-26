# Investor 90-day plan — 2026-11-25 → 2027-02-23

Source: the founder's action list in the due-diligence answers doc (Drive,
"SQLQuest — Yatırımcı Due Diligence | 57 Soru — Yanıtlar", 2026-11-25),
adopted by the founder in chat ("başlat") with the orchestrator's
corrections below. Goal: prove willingness to pay and sustainable
acquisition — not more features.

| # | Action | Owner | Window | Status 11-25 |
|---|---|---|---|---|
| A01 | Weekly scorecard on bot-filtered people: source, country, landing page, activation, 6 solves, checkout, trial, payment, refund; trial and payment separate; raw vs human visitors kept apart | B2 (Fridays) + orchestrator | by 12-05 | started |
| A02 | Stripe reconciliation (M1 test?, M7 double subscription, failed charges, refunds); full cost table (Claude, Supabase, Vercel, Apify, VPS, domain, APIs, founder hours); CAC cash vs full | founder (+ template by orchestrator) | by 12-10 | founder |
| A03 | ≥ 10 candidate/customer interviews; 3 verified success stories (or say there are none) | founder + E1 (invites as drafts) | by 01-15 | drafts exist |
| A04 | freeQuota 50/50 holdout (#384): verify live, fixed assignment, 4 weeks + 7 days, CI and arm balance | orchestrator / B1 | read 12-31 (shifts with merge date) | built |
| A05 | The 67% who open and never run: editor, first query, sample data, mobile friction — only independently randomised changes until the holdout reads | orchestrator + B1 | to 12-31 | in flight (#366, #243, #373) |
| A06 | One-time Interview Pass ($49–79, 60–90 days) vs subscription — designed now, launched after the holdout, one price first, rules written before | orchestrator (design) + founder (price go) | design by 12-10, test Jan | started |
| A07 | Payments: verify the India fix on real charges, checkout abandon, self-serve card update (M-01 live 11-25), cancellation reasons (#242 deploy + Stripe setting) | founder + orchestrator | by 12-15 | partly done |
| A08 | $149 live expert mock — interviews only, no build | founder | — | parked |
| A09 | Stop bulk thin content; strengthen the seven money company pages | C5, R1 (refocused); C6, C7 paused | Dec–Feb | applied 11-25 |
| A10 | Google practice/interview clusters (verify volume), Bing drop, backlinks and assistant-cited lists; Feb target Google 1,500 + Bing 600 clicks/month (proposal) | C1, S1, C3, G1 | Dec–Feb | ongoing; keyword tool = founder's budget call |
| A11 | Park B2B, Python, career platform until demand is proven | P1 weekly | check 12-22 | applied 11-25 |

**Checkpoints:** 12-10 O2 (4 payments; < 3 payments AND < 200 six-solvers → re-set the objective) · 12-22 B2B (≥ 3 `team_interest`) · 12-31 holdout · 01-09 6 payments · 02-08 10 new payments in 30 days · 02-23 investor review.

**Orchestrator corrections to the founder's list:**
1. "The existing 3 team_interest threshold": production holds **0** rows; read it as "reaches 3".
2. The 12-month scenario assumes 0.5% visitor→purchase, ~10× today's 0.05%; rebuild the model once the rate has moved 2–3×.
3. 7-day return ≥ 40% only holds if the holdout shows the quota caused the drop (pre-09-26: 45%); otherwise 30% is realistic.
4. The effort split applies to the agent fleet as well: content, research and partnership lanes are cut (see the briefs), which also cuts Claude spend.
5. **Vercel Hobby is for non-commercial use**; a site taking payments should be on Pro ($20/month) — founder's call, high priority under A02.
