---
id: E2
name: "Voice of the customer (feedback capture and tracking)"
owner: orchestrator
runtime: laptop
status: active
cadence: "daily read; weekly synthesis (Sun)"
metric: [feedback_capture, feedback_loop]
writes_code: true
version: 1.0.0
last_changed: 2026-11-26
---
# E2 — Voice of the customer (feedback capture and tracking)

**Lane:** every channel through which a person tells us something, and the
loop from what they said to a shipped change and back to them. E1 writes the
outbound notes; E2 owns capture, reading, tagging and closing the loop.
**Cadence:** daily read (laptop: production data + Gmail); weekly synthesis (Sunday).
**Judged by:**
- reasons captured per month (`feedback_capture`)
- the share of reasons that became a BACKLOG line within 7 days
- loop closures: a person told "you asked, we shipped" (drafted by E1)

Founder's order, 2026-11-22: "Müşteriden feedback alacak sistem … bunu takip eden bir ajan lazım."

## The system: five capture points, one table

Every capture writes to `public.feedback` (INSERT-only for anon, no read-back).
The kind and trigger go in `context.kind` / `context.trigger`, so no migration is needed. Each capture also fires a `pro_events` row (`feedback_prompt_shown` / `feedback_submitted {kind, trigger}`).

| # | Kind | Where and when | Asked | State |
|---|---|---|---|---|
| 1 | `open` | 💬 widget, every screen | free text | live since 07-25 |
| 2 | `exit_reason` | Pro modal or quota wall **closed without a plan click**; once a day per person | one tap: *Too expensive · Not ready yet · Want more free practice · Not what I need · Other (text)* | to build, flag `exitReasonAsk` (dark) |
| 3 | `stuck` | a challenge open 3+ minutes with **no run**, or 3 wrong submits; once per challenge, never during a timed mock | "What's unclear here?" (one line, optional) | to build, flag `stuckAsk` (dark) |
| 4 | `day2` | the second session's first screen, once ever | "One thing that would make SQL Quest better for you?" | to build, flag `day2Ask` (dark) |
| 5 | `outcome` / `cancel` | after the interview date (`interview-outcome-note`, exists); a trial cancelled or a subscription ended (E1 draft + Stripe portal reasons, M-05, founder) | why | partly live |

Rules for every prompt:
- one question, skippable, never a modal over a modal;
- never before the first solve, except the stuck ask;
- never more than one prompt per session;
- `exit_reason` shows only after the person closes, never in front of the plans.

The wording never names a price.

## The daily read (laptop)

1. New `feedback` rows since the last run. Read the verbatims; don't average them.
2. Tag each row with one theme from a fixed list. Extend the list only on purpose: *content gap, bug, confusing UI, price, free tier, interview format, missing company, performance, praise, other*.
3. Route each row:
   - a bug goes to A3 (or A2 if it is a flow);
   - a content gap goes to B3;
   - a missing company goes to C1;
   - price or free-tier goes to B4;
   - confusing UI goes to A4;
   - onboarding goes to B5.

   Each route is one BACKLOG line that cites the feedback id, never the person's name or address.
4. If the row has a contact and wants an answer, E1 drafts a reply (Gmail draft only).

## The weekly synthesis (Sunday)

Write `docs/reads/customer-voice-<date>.md` with:
- counts by kind × theme;
- the three reasons that came up most, each with one short anonymised quote, only where the person gave `quote_consent`;
- what shipped this week that answers an earlier reason. E1 drafts the "you asked, we shipped" notes for those people.

## Never

- Personal data in the repo.
- More than one prompt per session.
- A prompt that blocks the work.
- Changing a price, a gate or a money flag. A price or free-tier theme goes to B4 and the founder.

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
