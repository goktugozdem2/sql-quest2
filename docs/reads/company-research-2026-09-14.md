# Company format research — 2026-09-14 (Amazon, Meta)

Founder's list item 9: "strengthen company-specific content with dated sources
for interview-format claims." The seven pages generated on 09-13 carry sourced
format tables; the twenty-one older pages state no format at all. This is the
first pass at closing that, starting with the two highest-value sets: Amazon
(the only company set that has produced a payer — CLAUDE.md, free-tier
boundary) and Meta.

Rule applied, unchanged from 09-13: a page states a format specific only when
a source we **fetched ourselves** says it and that source carries a date.
Search-result snippets are not sources. Where a source gives a relative date,
the entry records what it said and the day we read it.

## Amazon — Business Intelligence Engineer

Fetched:

| Source | Date | Fetched? |
|---|---|---|
| [Blind — "Amazon Business Intelligence Engineer (BIE L5) Interview 2025"](https://www.teamblind.com/post/amazon-business-intelligence-engineer-bie-l5-interview-2025-jdr2idmd) | posted 14 Sep 2025, replies to 15 Oct 2025 | yes |
| [Exponent — Amazon BIE interview guide](https://www.tryexponent.com/guides/amazon-bie-interview) | shown as "updated 2 months ago" on 14 Sep 2026 | yes |

What they support: a ~30-minute recruiter screen, one or two technical phone
screens (the Blind report says 75 minutes each), a virtual onsite loop of about
five rounds (Blind: ~60 min each; Exponent: five to six rounds of 45 min to an
hour). Blind describes a "CoderPad-style" editor where the query often cannot
be executed. Exponent says to expect at least five questions across SQL,
Python, visualisation and business analytics in the technical screen, without
splitting out how many are SQL — so the page does not claim a SQL count.
Leadership Principles come up inside technical rounds, not only the behavioural
ones.

Rejected:

- **PracHub — Amazon BIE** — fetched, but carries no date and no sample size.
  Under the rule that is not a source, so nothing from it is on the page.
- **interviewquery — Amazon BI guide** — HTTP 429, never read. Not cited.
- Glassdoor, Medium, careerflow, interviewkickstart — snippets only, not
  fetched. Not cited.

## Meta — Data Engineer

Fetched:

| Source | Date | Fetched? |
|---|---|---|
| [Blind — "Meta Data Engineer 2025 Interview Experience"](https://www.teamblind.com/post/meta-data-engineer-2025-interview-experience-zuvy6qgj) | 5 Apr 2025 | yes |
| [Blind — "Meta Data Engineer: Technical Screen-Help"](https://www.teamblind.com/post/meta-data-engineer-technical-screen-help-6fy3wafy) | 17 Mar 2025 | yes |

Two independent candidate reports that agree on the screen: five problems,
three SQL and two Python. Schema is given and the code is not expected to be
runnable, in the screen and in the onsite (the April report adds that the
onsite also gives the expected output), and interviewers differ in how strict
they are about syntax. SQL is reported as medium: window functions,
subqueries, CTEs, date/time.

Neither report gives a length for the individual onsite rounds, so **the page
does not state one** — the row says that in as many words. The widely repeated
"45 minutes, 15 each of Python / SQL / data modelling / ETL" line came back
only as a search snippet; it is not on the page.

## What remains

Nineteen older pages still state no format: Airbnb, Anthropic, Apple,
Databricks, Google, JPMorgan, Morgan Stanley, Netflix, Nvidia, OpenAI, Plaid,
Ramp, Shopify, Snowflake, Spotify, Stripe, Tesla, Uber, Wise. They now say so
explicitly in the provenance note (commit ac78525) rather than leaving a
reader to guess, which is the honest holding position.

Stripe was the third candidate in this pass and is the first for the next one:
two promising guides (datainterview, dataford) both returned HTTP 429 and were
never read, so nothing from them was used. Do not write a Stripe format
section from the search snippets in this session's transcript — refetch.
