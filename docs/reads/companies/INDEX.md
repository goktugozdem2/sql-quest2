# Company interview dossiers — index

Owned by R1 (`docs/agent/fleet/R1-company-research.md`). One dossier per
company in this folder, `<slug>.md`: format rows with dated sources, topic
counts ("N of M reports", never "most asked"), paraphrased question shapes,
role variants, a confidence per fact. A dossier older than 60 days is due for
a refresh. A low-confidence fact never reaches a page.

Older per-run reads (not dossiers; pages cite them today):
`docs/reads/company-research-2026-09-13.md` (DoorDash, Goldman Sachs,
Walmart, TikTok, LinkedIn, Microsoft, Bloomberg), `-09-14.md` (Amazon, Meta),
`-11-20.md` (PayPal, Coinbase, Monzo; Robinhood, Klarna, Adyen deferred),
`-11-22.md` (Chime; Nubank, N26 deferred). A company whose only read is one of
these shows "none" below, with the read in the last column.

## The 34 page companies (`COMPANIES`, `scripts/build-company-crosslinks.mjs`)

Impressions / clicks: gsc_daily page slice, 28 days to 2026-11-21.

| company | sector | dossier | confidence of the format | 28-day imp / clk | what is new / older read |
|---|---|---|---|---|---|
| Capital One | fintech | **2026-11-22** | high (DA screen shape) | 106 / 9 (+ blog 658 / 39) | CodeSignal's own help page: DAA = 70 min, 14 quiz + 1 coding, CSV in any tool, 200–600, retake 2× in 180 days; DS gets 4 Python tasks / 90 min; BA gets cases. Our mock is 12 + 2. |
| Revolut | fintech | **2026-11-22** | medium (four-question SQL round) | 205 / 36 | Second family confirms the four-question round (PracHub, Feb 2026); new shapes: CTR from an event log, define-a-metric, fraud rules; Revolut's careers page names the stage order. |
| Stripe | fintech | **2026-11-22** | high (live SQL in DS/DA loops; DS take-home) | 69 / 4 | First dated sources: three candidate reports; HM first round; one-week DS take-home. The page can become sourced. |
| Wise | fintech | **2026-11-22** | high (analyst take-home, first-party) | 206 / 53 | wise.jobs documents the analyst case: 7 days, ~2 h, ≤ 3 h. No source for a "30-minute SQL interview". |
| JPMorgan | fintech | **2026-11-22** | low (nothing page-ready) | 56 / 3 | Only generic first-party lines; the JPMC application PDF (HireVue / HackerRank) needs a hand read. |
| PayPal | fintech | none | — | 0 / 0 | read 2026-11-20 (page cites it) |
| Coinbase | fintech | none | — | 0 / 0 | read 2026-11-20 |
| Monzo | fintech | none | — | 0 / 0 | read 2026-11-20 |
| Chime | fintech | none | — | 0 / 0 | read 2026-11-22 |
| Plaid | fintech | **2026-11-22** | low (nothing page-ready) | 14 / 1 | No candidate report opened (IQ 429, 1point3acres 403). First-party: every data posting names SQL (dbt, Redshift; fraud/credit DS). PracHub template shapes only. |
| Ramp | fintech | **2026-11-22** | medium (live SQL round in DA/AE loops) | 31 / 3 | Two dated candidate sources: IQ DA reports Q4 2025 (take-home case + panel, SQL date wrangling) / Q1 2026; DataDriven AE thread Aug 2026 (live CodeSignal, 8 SQL Qs). One more source → sourceable. |
| Goldman Sachs | fintech | **2026-11-22** | high for the engineering Analyst track (OA without SQL; SQL inside live mixed rounds); none for data analyst | 5 / 0 | Three readable reports (GfG 2024, GfG campus 2023, lets-code Summer Analyst Jul 2025) agree. All are engineering "Analysts" (the corporate title). No data-analyst report could be read (IQ, Dataford, AmbitionBox, naukri refused). goldmansachs.com still 403. |
| Morgan Stanley | fintech | **2026-11-22** | low (nothing page-ready) | 49 / 2 | Only opened SQL-test report: GfG DE 2021 (2 h HackerRank with an SQL section). First-party: video interviews in screening, interview types generic. DA reports are Glassdoor/IQ, unreadable. |
| Bloomberg | fintech | none | — | 1 / 0 | read 2026-09-13 (stale) |
| Amazon | bigtech | **2026-11-22** | first-party (BIE stages, OA, loop) + medium (3 SQL problems per hour) | 123 / 5 | Amazon's own BIE prep page: OA with two SQL parts (7 days), 60-min phone screen, five 55-min interviews; not on our page. New shapes: share-vs-company-benchmark YoY (PracHub BIE Sep 2026); BA screen with 3 SQL (PracHub Jul 2026). |
| Google | bigtech | **2026-11-22** | high (SQL early in analyst-type loops); no dialect | 75 / 2 | SQL sits in the first technical round of Engineering Analyst / product DS / BI analyst loops (3 reports); one 2026 report: five SQL questions per round in a shared Google Doc. Three 2026 DS loops had **no SQL**. "BigQuery" has no opened source. |
| Meta | bigtech | **2026-11-22** | high (DS screen: SQL + product case); DE count contested | 90 / 7 | First DS sources: 3 reports (Jun 2025, Aug 2025, Sep 2026) — one 45-min screen, 1–2 SQL questions, define the metric first. The page's DE "3 SQL + 2 Python" and "not runnable" are now contested by a 2026 guide (5 + 5, test cases). |
| Apple | bigtech | none | — | 46 / 5 | no read |
| Netflix | bigtech | none | — | 29 / 1 | no read |
| LinkedIn | bigtech | none | — | 20 / 0 | read 2026-09-13 (stale) |
| Microsoft | bigtech | none | — | 17 / 0 | read 2026-09-13 (stale) |
| Uber | consumer | none | — | 20 / 2 | no read |
| Airbnb | consumer | none | — | 25 / 0 | no read |
| Shopify | consumer | **2026-11-22** | first-party (stages) + high (live SQL screen in DS loop) | 75 / 7 | Shopify's own DS posting: Life Story → OA + craft assessment → craft interviews that can include exploring a dataset with SQL. 3 DS reports (2026) with a live SQL screen; 3 reports where you explain results (PM, charts). The page can become sourced. |
| Spotify | consumer | none | — | 21 / 1 | no read |
| DoorDash | consumer | none | — | 10 / 1 | read 2026-09-13 (stale) |
| Walmart | consumer | none | — | 11 / 2 | read 2026-09-13 (stale) |
| TikTok | consumer | none | — | 51 / 0 | read 2026-09-13 (stale) |
| NVIDIA | datainfra | none | — | 27 / 0 | no read |
| Databricks | datainfra | **2026-11-22** | first-party for SWE and SA (no SQL round named); none for DS/analyst | 84 / 4 | Databricks' April 2025 prep PDFs: SWE = CoderPad, 4–6 one-hour panels; SA = coding in Python/Scala DataFrames + presentation. No readable data-role report (1point3acres 403). Keep general; "Spark SQL" title is unsourced. |
| Snowflake | datainfra | **2026-11-22** | first-party for engineering only (SQL not mentioned); none for analyst roles | 132 / 10 | Demand is dialect intent ("snowflake sql practice", all 11 clicks). Analyst reports are on Glassdoor/Blind/IQ, unreadable. Recommendation: no format section. |
| OpenAI | ailab | none | — | 22 / 4 | no read |
| Anthropic | ailab | none | — | 26 / 2 | no read |
| Tesla | industrial | none | — | 74 / 3 | no read |

Coverage on 2026-11-22: **15 of 34** with a dossier younger than 60 days (second batch: Plaid, Ramp, Morgan Stanley; third: Goldman Sachs, Amazon, Snowflake; fourth: Meta, Google, Shopify, Databricks).

## Companies with search demand and no page

Checked 2026-11-22: gsc_daily query slice (90 days) for about 60 large
employers without a page (Deloitte, Accenture, Booking, Lyft, Instacart, Salesforce,
Adobe, Oracle, IBM, Citi, Bank of America, Wells Fargo, Amex, Visa,
Mastercard, Nubank, N26, Klarna, Adyen, Robinhood, Block, Affirm, SoFi,
Intuit, Pinterest, eBay, Expedia, Zillow, the Big Four, McKinsey, Optum,
Target, Barclays, HSBC, Citadel, Discover, Synchrony, Fidelity, BlackRock and
others), plus bing_stats (90 days). **None has an interview-intent query.**
The only hits are dialect or noise ("oracle cte", "visa chargeback reason
code 76"). Caveat: GSC shows only queries we already rank for, so it is
blind to a company we have no page for. C7's clusters are the other source;
re-check monthly.

## Queue (next runs, 2–3 companies each)

1. ~~Goldman Sachs, Amazon, Snowflake~~: done 2026-11-22 (batch 3).
2. ~~Meta, Google, Databricks~~ + Shopify: done 2026-11-22 (batch 4).
3. **PayPal, Coinbase, Monzo, Chime** — convert the 11-20 / 11-22 reads into dossiers before they turn 60 days old (by 2027-01-19).
4. Then Tesla, TikTok, Apple, and the rest by impressions.
5. **Re-tries for batch 2** (when Interview Query stops answering 429): IQ Plaid DS/DA, IQ Morgan Stanley DA, Taro's Plaid DE report — each could lift a "low" dossier.
6. **Re-tries for batch 3:** a Goldman **data-analyst** report (IQ DA guide, Dataford, datainterview, Taro DE June 2025); Snowflake analyst / analytics-engineer reports (IQ Snowflake DA, datainterview). Until one opens, Goldman's DA row and Snowflake's analyst row stay empty.
7. **Re-tries for batch 4:** datainterview Google DA guide (429 ×2); 1point3acres Shopify and Databricks threads (403) — hand reads more likely to work.

## Run notes

- **2026-11-22, batch 4 (Meta, Google, Shopify, Databricks).** WebFetch and
  WebSearch only; the Greenhouse job-board API by plain curl. No Apify, no
  other fetcher, no cache or archive.
  - **403:** 1point3acres (site-wide; it holds three Shopify DS threads and
    the only Databricks analyst thread).
  - **429:** datainterview.com (Google DA guide; second run in a row).
  - **404 / 410:** a dev.to Databricks DS post; one Shopify DS posting.
  - **Not reachable:** Reddit (the agent's fetcher is refused by the site).
  - **Not attempted:** Glassdoor, Blind (402 last run), Interview Query
    (429 last two runs).
  - **Worked:** PracHub interview-experience pages (the richest source this
    run: 14 reports opened), aced.io guides and experience lists,
    prepfully.com, datadriven.io, shopify.com careers postings,
    shopify.engineering, databricks.com careers and its prep PDFs,
    metacareers.com. google.com careers pages answer 200 but render their
    content client-side, so nothing was readable.
  - Lesson: aced.io's `/experiences?company=<x>&role=<y>` filter and
    PracHub's `/interview-experiences?company=<X>` list dated candidate
    reports by role. Start there.
  - Two B3 shapes now appear at two companies each: a calendar/date-spine
    report (Google, Shopify) and a survey/event-rate with two denominators
    (Meta; Google's metric-definition rounds).
  - FOUNDER hand reads that would lift a dossier: the three 1point3acres
    Shopify DS threads (1161331, 1059600, 1058101) and the Databricks
    "Finance and SQL Data Analyst" thread (1113750).

- **2026-11-22, batch 2 (Plaid, Ramp, Morgan Stanley).**
  - Interview Query answered 429 to WebFetch on every page. Two Ramp guides
    were read through the Apify fetcher. After that, the session's
    permission classifier refused Apify for any page that had answered 403
    or 429, so the fallback is closed: do not plan on it.
  - LeetCode Discuss, Medium and 1point3acres answered 403; Dataford and
    Taro answered 429; Glassdoor and Blind are unusable as before.
  - Job boards (the Ashby public API) and GeeksforGeeks worked.
    morganstanley.com timed out in WebFetch and was read with a plain curl
    GET.
  - Expect B2B fintech and bank dossiers to stay "low" until a readable
    candidate source appears.
- **2026-11-22, batch 3 (Goldman Sachs, Amazon, Snowflake).** WebFetch
  and WebSearch only, with no Apify and no other fetcher (brief rule: a
  refusal is final for the run).
  - **403:** goldmansachs.com (second run), LeetCode Discuss, naukri.com
    Code360, AmbitionBox, Medium, igotanoffer.
  - **429:** Interview Query, Dataford, datainterview.com, Taro.
  - **402:** Blind (paywall).
  - Glassdoor was not attempted.
  - **Worked:** atoz.amazon (amazon.jobs 301s there; first-party BIE and
    university pages), careers.snowflake.com, GeeksforGeeks,
    lets-code.co.in, PracHub, aced.io (tryexponent.com 301s there),
    interviewing.io, datadriven.io, customcareer.miami.edu, careers.wing.vc.
  - Lesson: the company's own careers domain is worth one fetch even when
    the old URL looks dead. Amazon's moved and answered.
  - FOUNDER hand reads that would lift a dossier: Goldman's HackerRank guide
    (goldmansachs.com/careers/blog/guide-to-hackerrank) and one Glassdoor
    Goldman data-analyst and Snowflake analyst review each.
