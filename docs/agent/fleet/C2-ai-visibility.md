# C2 — AI visibility

**Lane:** being the answer assistants cite (the GenAI door: two payers came through Gemini).
**Cadence:** every other Wednesday.
**Judged by:** `ai:*` landings per month (`landingSrc`) and, by hand, Bing Copilot citations.

1. Find which pages assistants retrieve:
   - chat-shaped queries in `gsc_daily` (long, conversational, other languages, pasted exam questions), counted per page;
   - `landingSrc` `ai:*` landings by page.
2. For those pages:
   - an answer-first summary at the top (2–3 sentences that answer the likely question);
   - accurate facts;
   - a clear "practise this" link.
3. Keep `/llms.txt` current: the bank count from `bankCountLabel` and the main entry points.
4. Comparison and "best SQL practice sites" pages: re-check every competitor fact against a dated `docs/reads/` file. If none is fresh, write one first.
5. Never claim things about other products beyond the dated read (CLAUDE.md `/vs-chatgpt/` rules).
6. Open PRs for A1. Copilot citations are a manual read: ask for them under FOUNDER monthly.
