# The customer feedback system: what it is, what it should be (2026-11-23)

Founder (11-23): "müşteri feedback mekanizmamız nasıl, şu anda nasıl olmalı,
olması gerektiği gibi yap".

## Where it stands

| Channel | State on 11-23 | What it yields |
|---|---|---|
| 💬 widget on every screen → `feedback` table | 39 people opened it in 90 days; 4 submitted (10%). 8 real rows since July, 3 with contact. No row had the challenge or the query until #234. | A trickle. Two guests asked "what's my mistake?" with no way to reply. |
| Asked prompts (#155): exit reason after a closed Pro modal, day-2 | Live since 11-23 11:00 UTC; `stuck` waits until 12-20. | Not read yet. |
| Founder's personal notes (E1) and the replies | 7 threads in which users wrote back, almost all answered the same day. | **The richest channel:** interview reports, price, layout. |
| support@sqlquest.app | Routed to the founder; **no user has ever written to it.** | Nothing. |
| Cancellation reasons | Not captured anywhere. | Nothing. |
| Why people buy | Not asked. | Nothing. |
| Interview outcome (`interview-outcome-note`) | Sender built, not scheduled; 0 `interview_outcome` events. | Nothing. |
| Reading and triage | §16 of `funnel-report.sql`, "weekly". In practice nobody read the rows: a security report waited 69 days. | — |

**The two failures** are a channel nobody reads and a sender who never hears
back. Capture is not the bottleneck.

## What it should be

Five moments, one owner, one clock.

**1. Capture at the moments that matter, one question each:**

| Moment | Question | Where | State |
|---|---|---|---|
| Stuck on a challenge | the widget, with the challenge, query and diagnosis attached, and the tutor one tap away | 💬 widget | #234 |
| Closed the paywall without a plan | "What held you back?" | after the modal / quota wall | live (#155) |
| Came back the next day | the day-2 question | second session | live (#155) |
| **Bought** | "What made you decide today?" | after checkout returns | building (E2) |
| **Cancelled** | Stripe's cancellation reason + comment | Customer Portal → webhook | building (E2, held 6d) + a founder setting |
| After the interview | "How did it go?" | `interview-outcome-note` | built; the founder schedules it |

**2. Reply when there is a way to reply.** A widget message with an email
gets the line "I reply within one working day — Göktuğ". A question with no
email gets a nudge to leave one (E2, building).

**3. One owner and a clock (E1, daily):**
- every new row is read within 24 hours;
- a row with contact gets a Gmail draft reply the same day; the founder sends;
- **security or abuse goes first line in the founder's report, the same day;**
- a bug or a missing thing becomes a BACKLOG line with an `FB-<date>-<n>` id;
- every reply is logged locally (sent or not), never in the repo.

**4. Close the loop.** When a BACKLOG item that came from a person ships, E1
drafts a one-line "you asked, it's live" note to that person, if there is
contact. The inbox review found the layout reporter was never told.

**5. Read it weekly (B2, Fridays):**
- ask response rates, per prompt;
- widget open → submit;
- rows read within 24 h;
- replies drafted vs sent;
- items closed with the person.

Definitions: `feedback_loop` in `docs/agent/metrics.md` (separate PR, rule 6b).

## Founder steps

- **Stripe Customer Portal:** turn on "Collect cancellation reasons". Stripe
  sends `cancellation_details` only when the portal asks.
- Decide whether to schedule `interview-outcome-note`. It is the only route to
  learning whether anyone passed.
- Send the replies E1 drafts. A drafted reply nobody sends is the 69-day
  failure again.
