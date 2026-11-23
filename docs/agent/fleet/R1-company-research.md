# R1 — Company interview research (what each important company actually asks)

**Lane:** a dated, sourced dossier per company. For each one: the SQL screen's format (rounds, platform, timing), the reported topics, and the question *shapes* candidates describe. R1 publishes nothing itself. It feeds:
- **C1**: the company pages' sourced "How the interview runs" rows;
- **B3**: original challenges modelled on the reported shapes;
- **G1**: answers that assistants cite.

**Runtime:** laptop or cloud, wherever the open web answers. It needs no production data.
**Cadence:** daily, 2–3 companies a run, until every priority company has a dossier. After that, each dossier is refreshed when it turns 60 days old.
**Judged by:**
- the number of priority companies with a dossier younger than 60 days;
- facts that reached a company page or a challenge (cited by C1 or B3).

Founder, 2026-11-22: "bütün önemli şirketlerin interview sorularını araştırıp bulsun, taramaya şimdi başlasın".

**Split with C7.** C7 mines general SQL questions from Reddit and Q&A. R1 is per company and needs dated sources.

## Which companies, in order

1. **Buyer signal first.** Capital One (2 of the first 3 payers), Revolut, then the fintechs with pages: Stripe, Wise, PayPal, Coinbase, Monzo, Chime, Plaid, Ramp, JPMorgan, Goldman Sachs, Morgan Stanley.
2. **Companies with a page and no dossier younger than 60 days.** These are the 34 pages: `scripts/build-company-crosslinks.mjs` `COMPANIES`.
3. **Companies people search or ask about that have no page.** Find them in `gsc_daily` queries "<company> sql interview" (laptop) and in C7's clusters. Big analyst employers belong here too (Deloitte, Accenture, Booking, Uber, Lyft, DoorDash, Instacart, Salesforce, Adobe, Oracle and the like); only those where SQL screens are reported.

## The dossier: `docs/reads/companies/<slug>.md`

- **Format.** Each row is one fact: rounds, platform (CodeSignal, HackerRank, Karat, live), length, dialect, and whether there is a take-home. Every row needs a **dated source**: the URL, the date the source was published or the report was posted, and the date R1 read it.
- **Topics reported**, with how many independent sources mention each topic, e.g. "window functions — 4 of 7 reports". **Never** write "most asked" or a percentage of interviews (CLAUDE.md SEO rule). Counts of the reports R1 read are fine.
- **Question shapes.** Paraphrase each in R1's own words: the business question, the tables it implies, the skill it tests. **Never copy a question verbatim** from a paid bank (DataLemur, StrataScratch, LeetCode, Interview Query) or any other site. Quote at most one short phrase per source, with attribution.
- **Role variants.** Data analyst, data scientist, data engineer, BI: the screen differs.
- **Confidence.**
  - high: 3+ independent, recent sources agree;
  - medium: 2 sources;
  - low: a single report.

  A low-confidence fact never reaches a page.
- **Changes since the last dossier**, when this is a refresh.

## Sources, and the rules for them

- Usable sources:
  - the company's own careers and engineering pages (first);
  - Glassdoor and Blind interview reports, where they can be read without signing in;
  - Reddit, LeetCode Discuss and Medium posts by candidates;
  - YouTube video titles and descriptions;
  - the companies' assessment-vendor pages.
- **A fact seen only in a search snippet is not a source** (CLAUDE.md). Open the page.
- Never sign in, never get past a paywall, never collect personal data about candidates. Usernames stay out.
- Respect robots.txt and each site's terms. If a site refuses automated reads, use another source.
- **A refusal is final for that run.** If a page answers 403 or 429, do not fetch the same page through a different tool, proxy or scraper service (Apify and the like): that routes around the site's refusal. Write the site in INDEX.md's run notes, back off, and try again on a later run. If it is the only rich source, list it under FOUNDER for a hand read.

## Each run

1. Pick the next 2–3 companies from the priority list. The first run starts with Capital One, Revolut and Stripe.
2. Write or refresh their dossiers. Add one line per company to `docs/reads/companies/INDEX.md`: company, dossier date, confidence, and what is new.
3. Write BACKLOG lines for the lanes that use the dossier:
   - C1: a page fact that changed or is missing;
   - B3: a question shape the bank has no challenge for;
   - C1: a company with demand and no page.
4. Open one docs PR and merge it yourself with `mergeone.sh`. Never skip the redaction hook.
