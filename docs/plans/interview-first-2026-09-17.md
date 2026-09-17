# Interview-first — the frame everything else sits in (2026-09-17)

**Founder, 2026-09-16/17:** "Ödeyenler hep mülakata hazırlanan kişiler.
Kimse oyun oynamıyor, para kazanma peşinde. Mülakat amaçlı olan kişilere
yapışmalıyız: mülakat ne zaman, hangi şirketle, eksik konular neler, nelere
çalışması lazım — buna göre bir plan, kişiyi planı uygulamaya itmek,
plandaki bazı şeyler Pro'da. SEO long-tail, uygulamanın yönlendirmesi,
raporlar — hepsi bu çerçevede olsun."

## What the money says

Every real purchase in the product's history (`pro_purchase_completed`,
`reason='stripe_webhook'`, internal excluded — 3 people):

| | intent | arrival | bought |
|---|---|---|---|
| sergelafarge | interview | `company:Amazon` | 10th solve, modal, 3 min |
| sab3r | interview | home | 6th solve, modal, 7 min |
| jeromezhao | never asked | home | 6th solve, modal, 32 s (cancelling) |

Modal → plan click, 30 days to 09-15: interview **9.3%** (4/43), job_ready
3.7%, learning 2.7%, **no intent 0/81**. The game layer (daily reward,
coins, lives, leagues, achievements) has **no instrumentation at all** — we
cannot show that nobody plays; we can show that only interview people pay.

## The rule

**SQL Quest is interview preparation for people who are job-hunting.** The
person we build for has a date (or will have one), a company (or a role),
and a gap. Everything is judged by whether it moves that person from
"arrived" to "on a plan" to "paid for the part of the plan that is Pro".

Applied:

1. **Product.** A person with interview/job_ready intent or a date sees the
   plan first (company, date, weakest skills, today's three items) and none
   of the game surfaces (daily-reward calendar, achievement toasts, coins,
   lives). The game stays for everyone else; it is hidden, not deleted.
   Flag `interviewFirst`, flips 2026-09-21 with the countdown card.
2. **The plan is for every company.** Two signed archetypes (Capital One,
   Revolut) cannot serve Snowflake 37 / Revolut 36 / Wise 18 / Stripe 15
   arrivals a month. A plan for an unsigned company is built from that
   company's tagged challenges + the person's weakest skills + the generic
   Pro mock, and the card says so ("built from the N questions tagged
   Snowflake — not Snowflake's process"). The readiness *number* stays
   archetype-only (interview-prep.js rule 2 stands); the *plan* does not
   need a number.
3. **The plan follows the person out of the app.** `prep-plan-note`: every
   other day, to a person with a date, "N days to X — today's three".
   Built dark; sending is the founder's decision.
4. **SEO.** Long-tail queries are prioritised by interview intent first
   (`<company> sql interview questions`, `sql interview <role>`,
   `<pattern> sql interview question`), traffic second. A query that brings
   learners is worth less than a query that brings a candidate with a date.
   `docs/plans/seo-interview-longtail-2026-09-17.md` holds the queue.
5. **Reports.** The Friday funnel leads with the interview cohort
   (intent interview/job_ready, or a date, or a `company:` arrival):
   arrivals → plan → Pro item met → paid. The all-people funnel is the
   second table, not the first. The Monday SEO read scores queries by the
   intent split above.

## What this does not change

- Prices, the free/Pro boundary, and the flip calendar (09-21, 09-29,
  09-30, 10-12, 10-14) — those claims read as written.
- Easy/Medium stay free (the denominator the one working ask has).
- The learning goals, lessons and the game for people who are not
  job-hunting. Nothing is removed; it is taken out of the interview
  person's way.

## Reads this creates or changes

- `interview_prep_funnel` (metrics.md) becomes the primary product read
  from 09-21; `interview_cohort_funnel` (new, Friday task) is the weekly
  line.
- The `intentRouting` read (10-16) is now the read of the interview-first
  batch, not of the tab alone; its ledger entry says so.
