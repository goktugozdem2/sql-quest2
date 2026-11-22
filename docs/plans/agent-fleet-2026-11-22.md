# The agent fleet — who does what, and in what order (2026-11-22)

The founder asked for a full plan of the agents that keep SQL Quest improving
and tested. The agents are added last, in the phases at the bottom. Until
then, the main loop (laptop session plus `sqlquest-autodev-loop`) does all of
it one task at a time. The fleet moves to the 64 GB VPS as the final step.

## Rules every agent follows

- **One job, one owner.** Two agents never edit the same surface. Each agent
  has a lane (below), and anything outside its lane goes to the main loop as
  a BACKLOG line.
- **Proof before merge.** Every change needs:
  - a test proven by a deliberate break;
  - build, test and lint passing;
  - a headless check when the change is visible;
  - a ledger claim with a metric, a baseline, a target, a falsification
    written in advance, and a read date.
- **Reviewer gate.** No agent PR merges without the reviewer agent's MERGE.
  The reviewer is the same model family as the authors, so a subtle money or
  auth change is also flagged for the founder.
- **Deploy budget.** Vercel Hobby limits builds per day (hit 2026-11-22).
  Agents batch small changes and merge at most ~15 PRs a day across the
  fleet. Docs-only PRs are combined.
- **Outward actions stay with the founder.** This covers emails, posts, DMs,
  link requests, edge-function deploys, production DB writes, prices and
  Stripe settings. Agents draft and queue; the founder sends or runs.
- **No customer data in the repo.** Production numbers come from read-only
  Supabase, with bots excluded (CLAUDE.md fingerprints).

## The roster

### A. Quality — keeps what is live working

| # | Agent | Lane | Cadence | Output |
|---|---|---|---|---|
| A0 | **Gate** (added 2026-11-22, founder's delegation) | Decides the merge go in the founder's place: A1 MERGE + green CI + not a held kind (price, Stripe, money flag on, outward send, production write, token cut, guard removal) + its own risk sentence; logs `docs/agent/fleet/decisions.md`; reverts its own merge on a smoke failure. Brief: `docs/agent/fleet/A0-gate.md` | after every A1 verdict + every 3 h | merges, holds, the decision log |
| A1 | **Reviewer** | Reads every agent PR: correctness, CLAUDE.md fragile areas, DESIGN.md, money path, copy rules | every PR | MERGE / REVISE / REJECT comment; blocks merge on REJECT |
| A2 | **Live QA** | Walks sqlquest.app as a person: first challenge, quota wall, Pro modal, trial line, company pages, mobile + dark | daily | fix PR, or BACKLOG line with a screenshot |
| A3 | **Errors & feedback** | `postgres_logs` errors, edge-function logs, `challenge_errored`, `feedback` table, `tutor_nudge_failed`, `checkout_session_fallback` | daily | fix PR, or a founder note when it needs a deploy |
| A4 | **UI/UX** (added 2026-11-22, founder) | Every page and app screen at six viewports (375 → 1920) in dark and light: overflow, tap targets, type size, clipping, contrast, sticky bars over buttons, modals on short screens, focus, layout shift, DESIGN.md fonts and accent. Brief: `docs/agent/fleet/A4-uiux.md` | weekly, and after shared-layout PRs | a dated audit report + one fix PR per root cause |

### B. Product — turns data into the next change

| # | Agent | Lane | Cadence | Output |
|---|---|---|---|---|
| B1 | **Funnel** | Reads arrival → app → first solve → 3 solves → wall → modal → Stripe → trial → paid, every week by door. Finds the step that lost the most people. Runs one experiment there and owns the A/B arms and their stop rules. | weekly read, one experiment at a time | experiment PR + ledger claim; the funnel table in `docs/reads/` |
| B2 | **Measurement** | Ledger claims whose read date has passed; the Friday scorecard (`docs/agent/scorecard.md`) | Fridays | verdict PRs (HIT / MISS / UNREADABLE with numbers) |
| B3 | **Content** | Question bank gaps (String Functions 3 Hard, NULL Handling 4 Hard), company sets, lessons. Every solution is run and pinned by a test. | weekly | 3–5 questions per PR |
| B4 | **Money** | Re-reads the money funnel and competitor prices monthly; updates `docs/plans/monetization-ideas-*` | monthly | ranked plan doc; agent-shippable ideas go to B1 |

### C. Growth — brings people to the site

| # | Agent | Lane | Cadence | Output |
|---|---|---|---|---|
| C1 | **Search (SEO)** | `gsc_daily`, `bing_*`. Titles and snippets for pages with impressions but no clicks. Internal links for orphans. New pages only where a query already shows demand. Respects frozen pages and the prune calendar. | weekly (after the Monday SEO read) | page PRs + ledger claims; the indexing list for the founder (GSC needs the founder's Chrome) |
| C2 | **AI visibility** | The GenAI door: comparison and "best SQL practice" pages, `llms.txt`, answer-first summaries, Bing Copilot citation counts. Chat-shaped GSC queries show which pages assistants retrieve. | biweekly | page PRs; a citation read |
| C3 | **Backlinks & distribution** | Finds places where a link is earned, not bought: resource lists (GitHub "awesome" SQL lists, bootcamp and university course pages, data-career newsletters), Q&A threads where a worked answer helps, communities that allow tools. Checks each for relevance and rules, writes one personalised draft per target in the founder's voice. | weekly | a queue file (`docs/outreach/queue-*.md`) of targets + drafts; the founder sends; replies tracked by hand |
| C4 | **Build in public** | LinkedIn / X drafts from real shipped work and real numbers (linkedin-voice.md: Turkish first, `———`, English after) | weekly | drafts for the founder to post |

C3 never buys links, never mass-mails, never posts on its own, and never
fakes reviews or accounts. Search engines punish all of these, and they
would cost the domain more than they bring.

### E. Customers — talks to the people who pay or almost pay (added 2026-11-22, founder)

| # | Agent | Lane | Cadence | Output |
|---|---|---|---|---|
| E1 | **Customer satisfaction** | Reads the money events (`stripe_webhook` rows) and writes one hand-shaped note per person as a **Gmail draft**, never a send. **Bought or started a trial** → thank-you plus one question (what are you preparing for). **Mid-trial (day 4–5), active** → the charge date said plainly, plus what is missing. **Cancelled a trial** → why. **Abandoned at the last minute**: plan clicked, Stripe session expired, an email held, no trial or purchase after → what stopped you, only when `checkout-abandon` has not already mailed them (it mails once ever). Reads the in-app `feedback` table and email replies weekly, and turns the reasons into BACKLOG lines. | daily | Gmail drafts; a weekly "what customers said" read with reasons only, no names, in `docs/reads/` |

E1 rules:
- CLAUDE.md's Email voice:
  - the founder is in the subject;
  - the sign-off is "Göktuğ / Founder, SQL Quest";
  - the note says it was written by hand to a short list;
  - one question, no pitch, no sequence;
  - no two bodies are the same.
- Before drafting, search Gmail (sent and drafts) for the address, and skip anyone the founder already wrote to.
- Skip anyone who opted out (`emailOptOut`), internal accounts, and anyone without an address. A guest's last-minute exit has no address and gets nothing.
- Customer names and addresses never go into the repo. The dedupe log lives outside it (`~/.claude/sqlquest-cs-log.json`).
- Judged by: replies per draft sent, and reasons captured per month.

First pass 2026-11-22:
- Four drafts:
  - an annual purchase: thank-you + what are you preparing for;
  - an active monthly trial: charge date + what's missing;
  - two cancelled trials: why.
- One last-minute abandoner with an address was skipped; `checkout-abandon` had already mailed them.
- Five guest exits had no address.

### F. Customer voice and onboarding (added 2026-11-22, founder)

| # | Agent | Lane | Cadence | Output |
|---|---|---|---|---|
| E2 | **Voice of the customer** | five capture points into `feedback` (widget, exit reason at the paywall close, stuck on a challenge, day 2, outcome/cancel), daily tagging and routing, weekly synthesis, loop closure through E1. Brief: `docs/agent/fleet/E2-voice.md` | daily read, weekly synthesis | BACKLOG lines by owner lane; `docs/reads/customer-voice-<date>.md` |
| B5 | **Onboarding** | arrival → first run → first solve → 3 solves → account → day-2 return; one experiment at a time; owns the order of the first session. Brief: `docs/agent/fleet/B5-onboarding.md` | weekly (Thursday) | `docs/reads/onboarding-<date>.md`; one experiment PR |

### G. Revenue content (added 2026-11-22, founder)

| # | Agent | Lane | Cadence | Output |
|---|---|---|---|---|
| C5 | **Revenue content** | content that brings people who pay: improves the money pages that have landings, writes sourced company guides and pages in the converting archetype, fills company sets with B3. Judged on trials/purchases per 1,000 landings, never clicks. Brief: `docs/agent/fleet/C5-revenue-content.md` | daily, one asset | one PR a run; a kill rule read monthly with B4 |

### H. Topics (added 2026-11-22, founder)

| # | Agent | Lane | Cadence | Output |
|---|---|---|---|---|
| C6 | **Topics** | SQL topics we don't cover (DDL/DML first: 0 challenges on CREATE TABLE, indexes, views, UPSERT, transactions, JSON), daily research → questions → guide → hub → links; builds the state-graded challenge type DDL/DML needs. Brief: `docs/agent/fleet/C6-topics.md` | daily, one funnel step | one PR a run |

### D. Orchestration

| # | Agent | Lane | Cadence |
|---|---|---|---|
| D1 | **Main loop** (exists) | Picks the highest-impact task from data, hands it to the lane that owns it, keeps BACKLOG and the progress table, reports to the founder | every 30–60 min on the laptop; later on the VPS |
| D2 | **Weekly retro** | What shipped, what moved, which claims hit or missed, which agent produced nothing worth keeping (that agent is paused) | Mondays |

## Order of adding

1. **Phase 1, safety:** A1 Reviewer, A2 Live QA, A3 Errors & feedback.
   Merges are autonomous now, so the reviewer comes first.
2. **Phase 2, learning:** B2 Measurement, B1 Funnel. They decide what the
   rest works on.
3. **Phase 3, traffic:** C1 Search, C2 AI visibility, C3 Backlinks. C3 starts
   as a queue the founder works through. If the founder has no time to send,
   C3 stays paused; it is not automated.
4. **Phase 4, supply:** B3 Content, C4 Build in public, B4 Money, D2 Retro.
   E1 Customer satisfaction runs from 2026-11-22 (founder's request), first by hand in the main loop, then as its own daily agent.
5. **Move:** the fleet goes to the 64 GB VPS (checklist in local memory:
   repo, gh auth, Supabase link + read-only MCP, headless Chrome, lock file,
   `~/.claude` notes and skills).

## How an agent is judged

Each agent has one number it is answerable for, read in D2:

| Agent | Number |
|---|---|
| A0 | reverts of PRs it merged and incidents traced to them (should be 0); hours from A1 MERGE to merge |
| A1 | reverts of merged agent PRs (should be 0) |
| A2 | production bugs found by people before QA (should fall) |
| A3 | `feedback_failed` and unhandled error kinds (should stay 0) |
| A4 | critical + major UI/UX findings per audit run (`uiux_findings`, should reach 0 critical) |
| B5 | `open_to_first_run`, `first_solve_10m`, day-2 return |
| E2 | reasons captured per month (`feedback_capture`); reasons → BACKLOG within 7 days |
| C5 | trials + purchases per 1,000 landing people on the pages it made or changed (28 / 56 d) |
| C6 | topic-page arrivals who solve one of its questions (`topic_funnel`); solve-through on new questions |
| B1 | paid conversions per 1,000 arrivals |
| B2 | claims past their read date without a verdict (should be 0) |
| B3 | solve-through on new questions |
| C1 | organic clicks per week (GSC + Bing) |
| C2 | Copilot citations, and `ai:*` landings |
| C3 | links earned (live, followed or not) per month |
| C4 | posts sent and arrivals with a LinkedIn referrer |
| E1 | replies per draft the founder sent; reasons captured per month |

The objective all of them serve is O2: 10 paying customers per 30 days by
2027-02-08 (`docs/agent/objectives.md`).
