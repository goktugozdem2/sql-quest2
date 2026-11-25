# Claude for Startups: form answers (draft, 2026-11-25)

Nothing here has been submitted. The founder submits at
https://www.claude.com/programs/startups after checking the credit is still
offered (one report says it was paused on 2026-10-09). Field names vary;
match each answer to the live form.

**Company:** SQL Quest (Datrick, Inc.)
**Website:** https://sqlquest.app
**Stage:** Pre-seed, self-funded, revenue-generating
**Founders:** 1

**What are you building? (short)**
Personalized SQL interview practice. An AI tutor, built on Claude, reads each
wrong query, says why it is wrong, and coaches the person to the fix without
handing over the answer.

**How do you use Claude?**
Claude is the tutor. Three calls in the product:
- the inline tutor on every challenge: it gets the person's query, a
  diagnosis of what their result got wrong (missing rows, wrong values, wrong
  grain), their weak skills and their interview date, and answers in steps:
  the defect, then the clause, then the full query only if asked;
- a live nudge while the person is typing, when a run shows a known mistake
  pattern;
- "Study with AI" after a mock interview, opened on the exact mistake.
Every call carries SQLite rules so the tutor never suggests syntax our engine
rejects.

**What would the credits change?**
Today Pro users have a daily cap on tutor calls, and free users get a small
one. Credits let us raise the free cap, where most people decide whether to
pay, and test a longer Socratic dialogue that costs more tokens per session.

**Traction (optional field)**
`[LAPTOP]` registered accounts, solves last 30 days, active subscribers.
Read from `scripts/funnel-report.sql` and Stripe on the day of submission.
