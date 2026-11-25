# Stripe — SQL interview dossier

**Dossier date:** 2026-11-22 (R1, first run). **Refresh by:** 2027-01-21.
**Page:** `/stripe-sql-interview/` — today a general page: "we have no dated
public source for how Stripe runs its SQL round". This dossier gives it one.

## Demand (gsc_daily / bing_stats, read 2026-11-22)

28 days to 2026-11-21: page 69 impressions / 4 clicks / position 4.2. Query
slice, 90 days: "stripe sql interview questions" 39 · 8 · 3.1; "stripe data
analyst interview" 1 · 0 · 26. Bing, 90 days: "sql practice for stripe
interview questions" 4 · 1.

## Sources

Read 2026-11-22 (research helper; R1 re-opened S1 and confirmed it).
WebFetch unless marked Apify.

| id | source | URL | date shown | type | fetched |
|---|---|---|---|---|---|
| S1 | PracHub — Stripe Data Scientist, "SQL ETL case study under time pressure" | https://prachub.com/interview-experiences/stripe-data-scientist-interview-experience-sql-etl-case-study-under-time-pressure | interview Oct 2025; published 2026-08-25 | candidate report | 200 |
| S2 | PracHub — Stripe Data Scientist, "Phone screen, then a three-question take-home under a week" | https://prachub.com/interview-experiences/stripe-data-scientist-interview-experience-phone-screen-then-a-three-question-take-home-under-a-week | interview Oct 2025; published 2026-08-25 | candidate report | 200 |
| S3 | PracHub — Stripe Data Scientist, "Rejected for 'not detailed enough' after a full onsite loop" | https://prachub.com/interview-experiences/stripe-data-scientist-interview-experience-rejected-for-not-detailed-enough-after-a-full-onsite-loop | interview Oct 2025; published 2026-08-25 | candidate report | 200 |
| S4 | PracHub — Stripe Data Scientist, "The interviewer kept calling it 'terrific'…" | https://prachub.com/interview-experiences/stripe-data-scientist-interview-experience-the-interviewer-kept-calling-it-terrific-then-came-the-rejection | interview Nov 2025; published 2026-08-25 | candidate report | 200 |
| S5 | PracHub — Stripe Data Analyst, "Five-round onsite…" | https://prachub.com/interview-experiences/stripe-data-analyst-interview-experience-five-round-onsite-ends-in-a-respectful-rejection | interview Oct 2025; published 2026-08-25 | candidate report — **body gated (sign-in); only title and tags read** (Onsite, Take-home Project, five rounds) | 200 |
| S6 | aced.io — Stripe interview process | https://www.aced.io/blog/stripe-interview-process | "Last updated 2 months ago" on 2026-11-22 | prep guide | 200 (tryexponent 301 → aced.io) |
| S7 | "Stripe AMER/EMEA Eng Candidate Recruiting Resource" (Google Doc export) | https://docs.google.com/document/d/1zvJkO2c7GzukHG-_oqc5wbOLajpuh5FjbmZPcZPU1o0/export?format=pdf | footer "Last updated Jun 27, 2025" | looks Stripe-authored but is **engineering-only and not on stripe.com — provenance unverified**; do not cite on a page | 200 |
| S8 | Interview Query — Stripe Data Analyst guide, with one full candidate report ("Data Analyst · Interviewed Q4 2026", AI-anonymised by the site) | https://www.interviewquery.com/interview-guides/stripe-data-analyst | "Updated 2 days ago" on 2026-11-22 | prep guide + candidate report | Apify 200 (WebFetch 429) |
| S9 | Interview Query — Stripe Data Scientist guide (report "DS · Interviewed Q4 2026") | https://www.interviewquery.com/interview-guides/stripe-data-scientist | "Updated 10 hours ago" on 2026-11-22 | prep guide + candidate report | Apify 200 |
| S10 | Interview Query — Stripe Data Engineer guide (report "Staff DE · Interviewed Q4 2026") | https://www.interviewquery.com/guides/stripe-data-engineer | "Updated 3 days ago" on 2026-11-22 | prep guide + candidate report | Apify 200 |
| S11 | **A reconciliation round reported by a candidate (2026-10, one report).** Added 2026-11-23 (B3, IR-1). Unattributed by the founder's promise: no name, no role detail, no words from the report here or on any page. | — not public; reported to us directly | round reported 2026-10-12 | candidate report (private) | — |

Not usable: Blind (402) — snippets mention a data "bug squash" round (SQL
handed over, find the logical bugs) and a first-round SQL CoderPad interview;
Glassdoor (not attempted); 1point3acres (login wall); datavidhya,
datadriven.io, datainterview.com, PracHub guide (snippets only);
medium.com/acing-ai (403).

## Format

| fact | sources | confidence |
|---|---|---|
| **SQL is tested live in Data Scientist and Data Analyst loops.** | S1 (Zoom, whiteboard SQL, technical screen), S3 (SQL inside a metric-case round), S8 report (live round) | **high** (3 reports, Oct 2025 – Q4 2026, two sites) |
| The first round is a **hiring-manager / "experience and goals" conversation, no coding**. | S3, S4 (~30 min), S9 report, S8 report | **high** |
| **Data Scientist take-home:** S2 — one week, 4–6 hours suggested, three questions (two prediction, one open-ended), SQL or Python allowed, a deck or document plus code; S3 — predict target users, meant to take under 6 hours. | S2, S3, S4 (listed, not reached), S6 (prep) | **high** that it exists; details single-report |
| A presentation of the take-home in a later round. | S3, S4, S6 | medium |
| **The SQL sits inside a metric / business question**, and choosing the metric was the hard part. | S3, S8 report | medium |
| Data Analyst: a take-home or analysis project exists (S8 synthesis: ~3-hour analysis + written report). | S5 tags, S8 | medium |
| Platform for the DA SQL round: **HackerRank**, a round called "Data Manipulation", 45 min with ~25 min for 4 SQL + metric questions. | S8 report only | low — word as one candidate's report |
| S1's round ran out of time; the interviewer switched to asking for the approach. | S1 | low |
| DS onsite: HM, business partner, presentation, stats, product case, SQL-in-case. | S3 | low |
| **2026-11-23 — a reconciliation round** (a reconciliation round reported by a candidate, 2026-10, one report): three tables — two partner reporting tables (transaction-level rows from partner A and from partner B) and one expectations table holding what was expected from **both** partners. Task: reconcile — the transactions missing from a partner's report, and the ones a partner reported that were not expected. The approach the report credits: confirm the join key is unique first, compare in both directions, and narrow the expectations to the partner being reconciled; leaving that narrowing out is the common slip. Role and platform not recorded here. | S11 | **low** (n = 1, private, unverifiable; agrees in shape with S10's data-engineer reconciliation round) — never on a page as a format fact; it feeds practice card 330 (tagged Stripe; the card's own text never names the company) |
| No multiple choice reported anywhere. | — | — |
| Dialect: not stated. Bug-squash round for data roles: **not confirmed** (snippet only). | — | — |

## Topics reported

M = 10 public sources read; only five carry SQL content (S1, S3, S8, S9, S10). S11 (private, one report) is counted separately and never added to M.

- Choosing or defining a metric alongside the SQL — 2 of 10 (S3, S8)
- Approval / decline rates by day (conditional aggregation) — 1 of 10 (S8)
- Chargeback rate from payments joined to disputes over a trailing window — 1 of 10 (S8)
- ETL design and rerun / edge-case robustness (idempotency) — 1 of 10 (S1)
- Explaining an abnormal metric, then querying it — 1 of 10 (S3)
- Reconciling mismatched records between two sources (data engineer) — 1 of 10 (S10, synthesis); plus S11, one private report of a partner-reconciliation round (2026-10)

## Question shapes (paraphrased)

- Each day's **approval share and decline share** from a payments table
  (merchant, amount, status, time). Skill: GROUP BY date, conditional
  aggregation. (S8)
- **Merchants ranked by chargeback rate over the last 30 days**: payments
  joined to disputes. Skill: join, ratio, date window, ranking. (S8)
- For a business case, **design an ETL** and defend that it still gives the
  right answer on a rerun or an edge case. Skill: SQL transforms,
  idempotency. (S1)
- **Design a metric** for a product, explain why it moved abnormally, then
  write the SQL. Skill: metric design, aggregation. (S3)
- Data engineer: **find and explain the records that do not match** between
  two sources. Skill: anti-join both ways / full-outer reconciliation. (S10)
- **Reconcile two partners' settlement reports against one expectations
  table** that covers both partners: what each partner left out, and what it
  reported that was not expected from it. Skill: key uniqueness, anti-join
  in both directions, filtering the expectations to one partner. (S11; our
  practice card is 330, "Reconcile Two Payment Partners' Reports", on our
  own synthetic tables)

## Role variants

- **Data Scientist:** HM behavioural → technical case (ML + product sense,
  SQL inside it) → take-home → presentation + onsite (stats, case,
  business partner) (S2, S3, S4, S9).
- **Data Analyst:** recruiter / experience-and-goals → a live SQL + metrics
  round (HackerRank in one report) → take-home or business case → a later
  stage of several short rounds (S5, S8).
- **Data Engineer:** multi-part live coding (orders and shipping-cost logic,
  or parsing JSON/CSV); one report adds an SQL round and a reconciliation
  round; staff level adds ledger system design (S10).

## What changed since the existing reads

**2026-11-23 (B3, IR-1):** S11 added — a reconciliation round reported by a
candidate (2026-10, one report). It does not change the format confidence
(the live SQL rows stay high); it adds one low-confidence question shape and
challenge 330, tagged Stripe. On any page it may appear only as "a
reconciliation round reported by a candidate".

**2026-11-22:**

There was no Stripe read. The page's "no dated public source" line is now
out of date: three dated candidate reports put live SQL in the DS and DA
loops (high), the first round is a no-coding HM conversation (high), and the
DS loop has a one-week take-home (high, details single-report). Everything
platform- or length-specific is single-source and stays out of a page or is
worded as one report.
