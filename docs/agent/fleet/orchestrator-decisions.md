# Orchestrator decisions — delegated by the founder (append only)

**Founder, 2026-11-22:** "Benden karar isteme, top sende."

From that date, product decisions that agents would otherwise put to the founder are made by the orchestrator: the main loop, or the cloud session coordinating the fleet. Each decision is written down here with its reason and a rule for reversing it. A0 applies them in the daily pass.

**What the delegation cannot cover.** Some actions are not decisions at all: they need the founder's own credentials or his own hand. The laptop loop does them where its permissions allow, and they are never asked of the founder in chat. They are:
- deploying edge functions;
- applying migrations or writing to the production DB;
- changing settings in the Stripe, GSC or Bing dashboards;
- sending an email *as written by the founder*. A personal plan that says "I wrote this for you" must really be sent by him, or the sentence is false.

Prices are not changed by an agent.

| date | decision | reason | reverse if |
|---|---|---|---|
| 2026-11-22 | **`exitReasonAsk` ON** after #155 merges. It shows only after the Pro modal or the quota wall is closed with no plan click, at most once a day. | 17 of ~20 Stripe sessions expired unpaid in 30 days, and we know the reason for none of them. The ask comes after the close, so it cannot block a purchase. | Plan clicks per modal shown fall by more than 20% relative over 14 days against the 14 days before. Then turn it OFF the same day. |
| 2026-11-22 | **`day2Ask` ON** after #155 merges. | Returns fell from 23% to 4–7% (funnel read 11-22). We need the reason from the people who do come back. It shows once ever, on the second session. | `second_session_7d` or day-3 return drops more than 3 points over 14 days. |
| 2026-11-22 | **`stuckAsk` waits until 2026-12-20.** | It fires on a challenge with no run, so it would move `open_to_first_run`. That is B5's `companyDirectOpen` metric, and #99/#101 are also being read on it until 12-20. Turning it on now would confound both reads. | — |
| 2026-11-22 | **`companyDirectOpen` ON at 50/50** after #156 merges. The arms are murmur-hashed, and the stop rule and minimum n are in the PR. | Company pages are the best money door (2.3% trial-or-paid per arrival), and 81% of their landers never open the app. | The PR's own stop rule. |
| 2026-11-22 | **No 10th Skillmap axis for DDL/DML for now.** The challenges are tagged `DDL/DML` and left unmapped on the radar. | The nine axes are the interview-skill brand across the homepage, the Coach mock, goals and the readiness test. DDL/DML is tested less in analyst screens, and an axis changes every one of those surfaces. | Revisit when DDL/DML has ≥ 15 challenges and 28 days of solve data. |
| 2026-11-22 | **No holdout on the personal prep plan.** Everyone with an interview goal gets it. | At 15–30 people a week a 20% holdout has no statistical power, and every withheld person is a possible payer. The read uses reply rate, the reasons people give, and a before/after cohort comparison, and it says it is confounded. | After 8 weeks, if trial-or-paid among drafted people is no better than the pre-programme cohort, the founder's time goes elsewhere. |
| 2026-11-22 | **The 320 px width counts as a full row** in the UI/UX matrix (the Galaxy S9+ descriptor, 320×658). Critical findings there block, the same as at 375. | Small Androids and zoomed iPhones render at 320. Several of our buyers came from India, where small Android phones are common. | — |
