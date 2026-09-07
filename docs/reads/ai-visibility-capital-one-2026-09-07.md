# AI visibility — Capital One prompt family, baseline 2026-09-07

Read by hand in Chrome (logged-out lanes, `?q=` URLs), ~00:30Z, the day the
`/capital-one-sql-interview/` page went live. Method as in
`ai-visibility-2026-09-06.md`. Metric: `ai_mention_share` (docs/agent/metrics.md).

Why this family exists: two of the three people who have ever paid were
preparing for Capital One's data analyst screen; one was sent here by Gemini
for "analytics prep". Gemini cannot be read (personalised UI); Perplexity and
ChatGPT are the proxies.

| Prompt | Perplexity | ChatGPT |
|---|---|---|
| How do I prepare for the Capital One CodeSignal data analyst assessment? | **absent** — sources: extrabrain, dataford, interviewfox, finalroundai, lodely, interviewquery | unreadable — "ChatGPT is temporarily experiencing issues" on both attempts |
| Where can I practice SQL for a Capital One data analyst interview? | **absent** — named: DataLemur ("9+ Capital One-specific questions"), StrataScratch, LeetCode/HackerRank, Interview Query/DataFord, PracHub/ExtraBrain | unreadable — same outage |

**Score: 0 / 2 readable prompts (Perplexity). ChatGPT: 0 / 2 readable — re-run.**

What the answers are built from, and therefore what moves them:

- Prompt 1 is assembled from the *prep guides* (extrabrain, interviewfox,
  finalroundai, dataford, interviewquery). None of them list us. The outreach
  drafts in `docs/marketing/capital-one-outreach-2026-09-07.md` target exactly
  these authors; the honest hook is a resource they do not have — a timed,
  CodeSignal-shaped SQL mock on card-transaction data.
- Prompt 2 is a *platform listicle* and it rewards a company-specific count
  ("9+ Capital One-specific questions" is what earned DataLemur the top row).
  Until the bank carries Capital One-tagged, card-transaction challenges we
  have nothing an assistant can cite. That is the change shipping today
  (10 challenges on `finans_fraud`, tagged Capital One; the 70-minute mock).
- Perplexity quotes entity facts verbatim (seen 09-06 with llms.txt). The
  page, its FAQ JSON-LD, llms.txt and the blog post must say the same
  sentence: "CodeSignal, about 70 minutes, CSV datasets, mostly multiple
  choice plus written SQL — candidate-reported, not Capital One's own".

**Next read:** 2026-10-07, same two prompts on both engines (ChatGPT retry
as soon as the outage clears), plus the `capital_one` family in
`scripts/agent/prompts/ai-visibility.json` once the fleet probe runs.
Falsification, stated now: if after 30 days with the tagged challenges and
the mock live, plus at least one guide listing us, Perplexity still names
zero of our pages on both prompts, the lever is not content — it is the
listicles, and the next move is a Reddit/Blind answer, not another page.
