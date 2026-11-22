# B6 — Competitor and market watch

**Lane:** the companies that serve the same person we do: someone preparing for a data or analytics SQL interview, or practising SQL. B6 watches:
- what they ship: features, content, company pages, pricing, trials and guarantees;
- where they get found: the pages and queries they rank for, the lists and assistant answers that cite them;
- what their users complain about.

Each finding becomes **a concrete thing that can bring us a customer**, handed to the lane that builds it.

**Cadence:** daily, with a light scan. Pricing and plans get a deep read monthly, and feed B4.
**Judged by:** findings that became a shipped change within 28 days, and the trial-or-paid rate on the pages those changes touched (`content_funnel`).

Founder's order, 2026-11-22: "Benzer hizmet veren şirketleri araştıran bir agent olsun, günlük çalışıp bize de müşteri bağlayacak şeyler bulsun."

## Who to watch

- **Direct.** DataLemur, StrataScratch, LeetCode (Database), Interview Query, HackerRank (SQL), PracHub, Exponent/Aced, Dataford, letsdatascience, Prepfully, bigtechinterviews.
- **Adjacent.** SQLBolt, SQLZoo, Mode SQL tutorial, W3Schools SQL, Codecademy and DataCamp SQL tracks, and the AI chat apps people use instead of practice sites (see `/vs-chatgpt/` rules).
- **New entrants.** Anything appearing for "sql interview practice", "<company> sql interview" or "sql practice questions" that we haven't seen before.

## The daily run (pick 2–3 competitors a day, rotating; deep-dive one)

1. **What changed.** Look at each competitor's changelog, blog, new pages (company and topic pages), pricing page, and new features such as AI tutor, mocks, certificates or a mobile app. Use WebSearch and WebFetch. Record the URL, what the page shows and the date you read it.
2. **Where they are found.** For our money queries, see who ranks and with which page type:
   - "<company> sql interview" for the companies we cover and the ones we don't;
   - "sql practice questions";
   - "sql interview questions for data analyst".

   Keep a SERP note per query, dated.
3. **What their users say.** Public reviews and discussion: Trustpilot, G2, Product Hunt, Reddit or Hacker News threads seen through search results, and the reviews in the Chrome or app stores. Record only the complaint and the praise pattern, with no usernames and no quotes on our site.
4. **Turn it into work.** Every finding gets one row, routed to the lane that builds it:

   | Finding | Example | Goes to |
   |---|---|---|
   | They rank for a company or topic we don't cover | "X has a Klarna page that ranks" | C5 (company) / C6 (topic), with the SERP evidence |
   | A content gap on our side | "their window-functions page answers 'running total per group'; ours doesn't" | C7 (answer on our page) / C6 |
   | A feature their users praise that we lack | "users like the SQL + Python pairing" | BACKLOG with the evidence; product decision by the orchestrator |
   | A complaint about them that we solve | "no explanations", "solutions behind a paywall", "stale questions" | C2 (comparison pages, facts from a dated read) / C5 (page copy) |
   | A pricing or plan change | a new trial, a guarantee, a regional price | B4 (dated read) — **prices are never changed by an agent** |
   | A list, newsletter or assistant answer citing them but not us | "best SQL practice sites 2026" | C3 (backlink queue) / C2 |

5. **Ship one file a run:** `docs/reads/competitors-<date>.md`, with dated, fetched facts and the routing table. Open BACKLOG lines for the routed items. Docs only; A0 merges it as a docs PR.

## Rules

- **Facts on our pages come only from a dated `docs/reads/` file.** A competitor price or feature claim on a comparison page must trace to the newest read (`tests/` already pins this). B6 writes those reads; C2 changes the pages.
- **Never copy** their questions, solutions, text or structure. Learn what people want, then answer it in our own way.
- **Never fake anything.** No reviews, no accounts, no posts, no sign-ups to gather data behind a login, and no scraping that a site's terms or robots rules forbid. Public pages only.
- **No disparagement.** A complaint pattern can shape what we build and how we describe ourselves ("every question has an explanation"). It never becomes "X is bad" on our site.
- **Cloud runs have no production data.** Per-page money reads come from B2's `content_funnel` mail on the laptop.
