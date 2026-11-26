# P1 — Partnerships & B2B (institutions that buy for many people)

> **Cadence reduced 2026-11-25 (investor 90-day plan, A11): weekly, replies first.** 7 sends / 0 human replies — B2B is not proven. No new targets beyond 2 a week; the 2026-12-22 check (≥ 3 `team_interest` rows, today 0) decides whether the lane continues.

**Lane:** organisations that put SQL Quest in front of many learners, or pay
for seats. That includes bootcamps, university courses and career centres,
data-career programmes, training companies, corporate L&D, and communities
with a learning budget. P1 runs the pipeline end to end, up to the send
button; the founder sends every message and runs every call.
**Laptop**: P1 reads Gmail for replies and writes Gmail drafts.
**Cadence:** daily. A small batch, plus pipeline upkeep.
**Judged by:**
- replies per message the founder sent;
- partners live: a link, a cohort using the app, or a signed seat deal;
- seats paid. Team seats count toward the objective and are reported
  separately (founder, 2026-09-26).

**Split with C3.** C3 wants a link on a page. P1 wants a relationship: a
cohort, a course, a seat deal, a co-branded track. When a C3 target is really
a partner, it moves to P1.

## What already exists (read before the first run)

- `docs/outreach/teams-2026-09-26.md`: 40 organisations with organisational
  contact routes, a seat offer as two price options for the founder, and five
  A-priority drafts. **Nothing was sent.**
- `/for-teams/` (`src/for-teams.html`) records `team_interest {seats,
  email?}`. It is noindex and linked from nowhere until the founder publishes
  it.
- Row 6 of `docs/plans/monetization-2026-09-24.md` holds the seat
  hypothesis and its kill rule.
- `scripts/footer-partner-link.mjs`: the partner link in the footer.

## The pipeline

Keep it in two places:

- **In the repo (public):** `docs/outreach/partners.md`, one row per
  organisation. Columns: organisation, type, why they fit (with the page
  read and its date), the public organisational route (contact page,
  partnership page or generic inbox), stage, next step, date.
- **Outside the repo:** `~/.claude/sqlquest-partners.json`, holding any
  named contact person and the Gmail draft and thread IDs. **Never put a
  personal name or a personal email address in the repo.**

Stages: `found → qualified → draft ready → sent (founder) → replied → call →
pilot → paid / partner live → lost (with why)`.

## Each daily run

1. **Replies first.** Search Gmail for threads with every organisation at
   stage `sent` or later. Summarise each reply into the pipeline row. Draft
   the founder's answer as a Gmail reply-draft that answers their question
   and proposes one next step. Never send.
2. **Qualify 2–3 new organisations a day** (5–8 on Mondays):
   - The public page shows they teach SQL, analytics or data-interview
     prep.
   - They run cohorts or courses now; the page carries a recent date.
   - A partnership, B2B or "for employers" route exists.

   Priority A goes to organisations where SQL is central and cohorts are
   large, or where the learners match our buyers. Those buyers are
   interview-bound analysts: fintech, Capital One-style screens, career
   switchers.
3. **Draft 1–2 messages a day** for `qualified` A-rows:
   - Gmail drafts in the founder's voice. The subject names the founder,
     and the message is one specific fact about them plus one question
     (CLAUDE.md Email voice).
   - For educators, use the "Hocamız" register in linkedin-voice.md when
     the message goes out on LinkedIn.
   - What to offer:
     - free cohort access to try, with the size stated;
     - a co-branded company set;
     - the readiness test as a placement tool for their intake;
     - the seat offer **only if the founder has picked a price option**.
       Until then, offer the free cohort pilot.

   No byte-identical bodies. Never more than the founder can send in a day.
4. **The pilot kit.** When an organisation reaches `call`, prepare a
   one-page pilot plan in `docs/outreach/pilots/<org-slug>.md`. It covers
   the cohort size, which goal and company set to use, the 4-week success
   metric (solves per learner, second-session rate) and what the founder
   offers after. Anything that needs code goes in as a BACKLOG line for the
   owning lane: a cohort code, a team dashboard, seat billing.
5. **Weekly (Monday): `docs/reads/partners-<date>.md`.** Write the
   pipeline counts by stage, replies and their reasons (no names), and what
   to change in the pitch.

## Rules

- Never send, post, call or sign anything; never accept terms.
- Prices and seat billing are the founder's (money rule). P1 may only quote
  an option the founder has already chosen.
- Organisational contact routes only. Never scrape personal emails and
  never guess addresses.
- If the founder has sent nothing for 7 days, stop drafting new messages.
  Keep qualifying and answering replies, and say so in the report: the
  bottleneck is sends, not targets.
- Docs PRs are self-merged. Code goes to the owning lane through BACKLOG,
  never from P1.
