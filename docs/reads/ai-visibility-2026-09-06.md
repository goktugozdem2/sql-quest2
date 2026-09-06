# AI-visibility read — 2026-09-06 (manual baseline, consumer UIs)

**How this was measured.** Six prompts from the fleet panel
(`scripts/agent/prompts/ai-visibility.json`: #1, #4, #10, #18, #22, #7) were
asked in the assistants' own web UIs from the founder's Chrome, one fresh
thread per prompt, on 2026-09-06 22:40-23:10Z. This is a *direction* read,
not the fleet's neutral API read: Perplexity and ChatGPT were logged out
(neutral); Gemini's UI could not be driven by the automation and Claude
answered from the founder's account memory ("And you built the one…"), so
neither counts. The fleet's `ai-visibility` task (Tue 03:30, API, keys in
the VPS `.env`) replaces this the week it is installed.

## Mention table

| prompt | family | Perplexity | ChatGPT | Gemini | Claude |
|---|---|---|---|---|---|
| Where can I practice SQL for data analyst interviews? | practice_where | no | no | n/m | not sent |
| Best free sites to practice SQL for a data analyst job interview | practice_where | no | no | n/m | — |
| What are good alternatives to DataLemur for SQL practice? | alternatives | **yes, #4** (source: our vs-datalemur page) | no | n/m | — |
| Is there a SQL practice site with an AI tutor that explains why my query is wrong? | ai_tutor | **yes, #1** | **yes, #1** ("probably the closest match") | n/m | yes, #1 (personalised — void) |
| Adaptive SQL practice site that tracks my weak skills and picks the next exercise | ai_tutor | **yes, #1** ("Top pick") | **yes, #1** ("My pick: start with SQL Quest") | n/m | — |
| Veri analisti mülakatı için SQL pratiği nerede yapabilirim? | practice_where (tr) | no (our page cited as a *source*, name not given) | no | n/m | — |

n/m = not measurable today. `ai_mention_share` baseline, neutral lanes only:
**Perplexity 3/6, ChatGPT 2/6.** By family: ai_tutor **4/4** across both
lanes, alternatives 1/2, practice_where **0/6**.

## What the answers cite

- On the differentiator prompts both engines cite **our own pages** —
  Perplexity's "10-axis skill radar" and "200+ challenges" are verbatim from
  the stale hand-written `llms.txt` (9 skills, 257 challenges in the bank).
  The source file is read word for word; the generated `llms.txt` shipping
  with this commit is what they will read next.
- On the generic prompts the sources are **DataCamp, LinkedIn articles,
  DataQuest, practicetestgeeks, Reddit** — third-party listicles. We appear
  in none of them. That is the gap: the assistants do not invent
  recommendations, they relay what the listicles say.
- Competitor set on generic prompts, every time: DataLemur, StrataScratch,
  LeetCode, HackerRank, SQLBolt, SQLZoo, Mode, then a long tail (PGExercises,
  Kaggle, W3Schools, Interview Query, SQL-Practice.online).

## What it means

1. The channel is real and specific: when the question is "AI tutor" or
   "adaptive", we are the answer on two neutral engines. That is the
   positioning to keep saying, on our pages and in listings.
2. "Where do I practice SQL" is the big query space and we are absent from
   it because we are absent from the third-party lists it is built from.
   Levers, in order: directory listings (AlternativeTo, SaaSHub, G2),
   Reddit threads answered by the founder (community-queue), and one
   comparison page that names the standard set fairly and is cite-able.
3. Turkish: our page is read but not named — the Turkish pages need an
   explicit "SQL Quest" self-mention with the fact the model can quote.

## Next read

Fleet `ai-visibility`, first API run after install (needs GEMINI / OPENAI /
PERPLEXITY / ANTHROPIC keys). Compare per family, not the total: the panel
is 9 practice_where / 8 alternatives / 8 ai_tutor prompts.
