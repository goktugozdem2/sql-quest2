# SQL Quest vs ChatGPT — what the page may say (2026-10-03)

The rules behind `/vs-chatgpt/` (`scripts/build-vs-chatgpt.mjs`) and the
homepage block "Why not just ask ChatGPT?". Backlog plan:
`docs/plans/landing-comparison-2026-09-21.md`.

## Why this page, why now
- The homepage table answers "why not DataLemur / StrataScratch / LeetCode".
  Nothing on the site answered "why not just ask ChatGPT?", the question an
  AI-referred visitor brings (memory: GenAI recommendation channel; Bing's AI
  Performance panel counted 12.6K Copilot citations in the three months to
  2026-09-08).
- Search demand is small but present, all on Bing, 90 days to 2026-10-02:
  "sql query practice ai" (2 impressions, 1 click, position 6), "sqlquest.app
  learn sql with ai free" (4 / 1), "sql questions solver ai online free" (1),
  "leetcode sql practice platform features limitations ai" (1). Google: none.
  The page is for the AI-assistant door as much as for search.
- The plan said: ship before the hero CTA test arms (2026-10-04) or after its
  read, never across it. Shipped 2026-10-03.

## What the page does NOT claim, on purpose
ChatGPT's features, models, plans, limits and prices change every few weeks,
and no dated read of OpenAI's pages backs any of them here. So:
- No price, plan name, model name, message limit or "memory" claim
  (tests/vs-chatgpt.test.js fails on a non-SQL-Quest dollar figure, on
  `GPT-<n>`, `ChatGPT Plus/Pro/Team`, "message cap/limit", "hallucinat").
- No error-rate claim ("often wrong", "usually") — the test fails on it.
- No claim that a chat assistant cannot run code. Some can, on uploaded
  data. The page's argument does not depend on it: whatever runs, the
  question and the check come from the same place, so there is no answer key.
- The five example queries are our trap pages' own wrong queries
  (`src/data/sql-patterns.js`, run against `finans_fraud` by
  tests/sql-patterns.test.js). The page says so and never says an assistant
  wrote them.

## What the chat column does say, and why each line holds
| Row | Chat side | Why it is true of any chat assistant |
|---|---|---|
| Explain a concept | Yes, strongest here | concession |
| Write a query | Yes, at once | concession |
| A question with a checked answer | Only if you bring one | the assistant writes both question and check |
| Why your result is wrong | Reviews the query text it is shown | without an expected result there is nothing to diff |
| Weakest skill across weeks | No record of graded attempts, because nothing was graded | follows from the row above |
| Screen's clock | You set it up yourself | not a product feature of a chat |
| Cost | Many people already use one | concession |

The page opens with "What a chat assistant does better" (any dialect, your own
work queries, already open) and lists SQLite-only as our weakness. The test
pins that order.

## Measurement
- Door: `landing_view` on `/vs-chatgpt/` (track.js injected by the build).
- Clicks: `home_vs_chatgpt` (homepage block), `cta_vs_chatgpt_readiness`,
  `cta_vs_chatgpt_app` (`/app/?src=vs_chatgpt`).
- Guardrail: `home_door` must not fall below 51.9% (the block adds no button).
- Read 2026-10-24 (three weeks): Bing/Google impressions for the page from
  `bing_stats` / `gsc_daily`, its landing views, and home clicks on the block.
