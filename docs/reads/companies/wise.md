# Wise — SQL interview dossier

**Dossier date:** 2026-11-22 (R1, first run). **Refresh by:** 2027-01-21.
**Page:** `/wise-sql-interview/` — a general page ("no dated public source").

## Demand (gsc_daily / bing_stats, read 2026-11-22)

28 days to 2026-11-21: page 206 impressions / 53 clicks / position 3.6 — the
best-clicking company page after the Capital One blog. Query slice, 90 days:
"wise sql interview questions" 19 · 10 · 1.7. Bing, 90 days: **"30 min sql
interview with wise - what to expect"** 2 · 1; "practice sql for wise fintech
interview" 1 · 1.

## Sources

Read 2026-11-22 (research helper; R1 re-opened W3 and confirmed it).
WebFetch unless marked Apify.

| id | source | URL | date shown | type | fetched |
|---|---|---|---|---|---|
| W1 | wise.jobs — Step 2: Interview | https://wise.jobs/step-2-interview | none | first-party | 200 |
| W2 | wise.jobs — Interviews and application process | https://wise.jobs/interviews-and-application-process | none | first-party | 200 |
| W3 | wise.jobs — Analytics: Case Study | https://wise.jobs/analytics-case-study | none (linked blog posts up to 2026-10-27; footer © 2023) | first-party | 200 |
| W4 | wise.jobs — Using AI in our recruitment process | https://wise.jobs/using-ai-in-our-wise-recruitment-process | none | first-party | 200 |
| W7 | TransferWise Product Analyst job post (London), mirrored on startup.jobs | https://startup.jobs/product-analyst-transferwise-71219 | none; text says "TransferWise", "over 600 people" — old | first-party text, mirrored | Apify 200 (WebFetch 403) |
| W8 | Interview Query — Transferwise Data Scientist guide + one report ("Interviewed Q2 2026", AI-anonymised) | https://www.interviewquery.com/guides/transferwise-data-scientist | "Updated 5 months ago" on 2026-11-22 | prep guide + candidate report | Apify 200 |
| W9 | Interview Query — Transferwise Data Analyst guide | https://www.interviewquery.com/prep-guides/transferwise-data-analyst | none | prep guide, no report count | Apify 200 |
| W11 | Dataford — Wise Data Analyst guide | https://dataford.io/interview-guides/wise/data-analyst | updated 2026-10-08 | prep guide, cites nothing | Apify 200 |
| W12 | Dataford — Wise Product Analyst guide | https://dataford.io/interview-guides/wise/product-analyst | updated 2026-11-20 | prep guide, generic | Apify 200 |
| W13 | PracHub — Wise Data Scientist guide | https://prachub.com/interview-guide/wise-data-scientist-interview-questions-guide-2026 | updated 2026-09-24 | prep guide | 200 |
| W14 | TechPrep — Wise interview process | https://www.techprep.app/blog/wise-interview-process | none | prep guide, software engineers | 200 |
| W15 | ophyai — Wise interview guide | https://ophyai.com/blog/company-guides/wise-interview-guide | published 2026-03-20, updated 2026-10-09 | prep guide; says it read Wise's pages through search summaries | 200 |
| W16 | Indeed — Wise company Q&A | https://www.indeed.com/cmp/Wise-6/interviews?fjobtitle=Product+Analyst | answers dated 2023-01-25 and 2025-09-07 | Q&A, role unstated | Apify 200 |
| W17 | LeetCode Discuss — Wise interview experience | https://leetcode.com/discuss/post/7364263/wise-formerly-transferwise-interview-exp-zkny/ | 2025-11-21 | candidate report, software engineer (off-role) | Apify 200 |

Also read, no process detail: two wise.jobs blog posts on product analytics
(2026-07-22, 2026-10-14). Not usable: Glassdoor (not attempted; snippets
mention a live four-question SQL round in a shared document for a Senior Data
Analyst, Nov 2024, and a HackerRank SQL test for a Product Analyst);
interviewquery `/wise-data-analyst` slug (404).

## Format

| fact | sources | confidence |
|---|---|---|
| A recruiter or phone call comes first. | W1, W2, W7, W9, W11, W12, W15 | **high** (first-party) |
| Interviews default to Zoom; in person on request. | W1 | first-party, one page |
| The technical stage depends on the role — a case study, a take-home or a technical test, briefed by the recruiter. | W1 | first-party, one page |
| **Analyst take-home case study: 7 days to return it, about 2 hours suggested, no more than 3 hours in total**; clean the data, explore it, 2–3 visuals, prioritised customer-centred recommendations, a concise write-up for mixed audiences; scored on analysis, problem solving and presentation. **No SQL or tool named.** | W3 (first-party); W7 (old: one-week take-home), W9, W11, W15 | **high** |
| The take-home is defended / presented in the next interview. | W7, W4, W9, W15 | medium–high |
| AI may be used on a take-home if you say so; fully AI-generated work and live AI prompters in video interviews are not allowed. | W4 | first-party, one page |
| A separate SQL test or SQL round for analysts. | W16 (2023, role unstated), W9, W11, W12 | **low** — platform, length and live-vs-written not established |
| Data Scientist: online behavioural assessment → long multi-part HackerRank (coding, probability/stats, a notebook EDA + model task) → one live, mostly non-technical final. The Q2 2026 candidate named no SQL section. | W8, W13 | medium |
| **A ~30-minute SQL interview:** **no opened source describes one.** Every 30-minute round found is a recruiter / phone screen (W7, W14, W15; W17 for engineering). | — | do not state |
| W15 claims Wise publishes no limit on the case and estimates 3–6 hours — **contradicted by W3**. | W3 vs W15 | W3 wins (first-party) |

## Topics reported

M = 4 data-role sources with SQL topic content (W9, W11, W12, W13), **all
prep guides**:

- Joins — 3 of 4
- Window functions — 3 of 4
- Funnel or cohort — 2 of 4
- Debugging or optimising a given query — 2 of 4
- Deduplication, NULLs, ranking ties — 1 of 4
- SQL on the take-home's own dataset — 1 of 4

First-party (W7, old): analysts must be comfortable writing ad hoc SQL.

## Question shapes (paraphrased)

- **W3 (first-party):** a dataset set in Wise's business (transfers, fees,
  customer behaviour, FX): clean it, explore it, chart 2–3 views, recommend
  what to do first. A case, not a query.
- **W11 (a candidate line quoted by a prep guide):** given a SQL query, say
  what is wrong with it. Skill: reading and debugging SQL. Low.
- **W12 (unsourced):** where does conversion drop in an onboarding funnel —
  users and onboarding events. Low.

## Role variants

- **Data / Product Analyst:** recruiter → take-home case → case review →
  team and final interviews; an SQL test in some accounts (W3, W7, W9, W16).
- **Data Scientist:** behavioural assessment + long HackerRank with a notebook
  ML task + a non-technical final; SQL not named (W8, W13).
- **Analytics Engineer:** a team exists (wise.jobs blog, 2026-10-14); no
  interview source.

## What changed since the existing reads

There was no Wise read. New: Wise's own careers site documents the analyst
take-home (7 days, ~2 h, ≤ 3 h, the scoring) — the first first-party format
fact we can cite for any fintech page. The searched "30-minute SQL interview"
is not documented by any source; the 30-minute round on record is the
recruiter / phone screen.
