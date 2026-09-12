// SQL Quest — interview archetypes
//
// WHAT THIS FILE IS (2026-09-08)
//
// An archetype is an EDITORIAL CLAIM, written down and signed: "this dataset
// is shaped like a particular kind of company's screen, and these named
// companies run that kind of screen." `src/utils/interview-prep.js` reads it
// to decide who may be offered an interview-prep flow. Nothing in here is
// computed and nothing in here is inferred — every line is something a person
// decided and put their name against.
//
// ── WHY IT REPLACED A COMPUTED BAR ───────────────────────────────────────────
//
// The first version of the eligibility bar asked a proxy question: what SHARE
// of the company tags on this dataset belong to this company? At ≥ 0.9 it
// separated "a set authored for this screen" from "the generic bank with a tag
// filter over it", and it did that correctly — but it asks the wrong thing,
// and it punished the honest case.
//
// The card-transaction ledger (accounts / merchants / transactions /
// chargebacks) is the shape of EVERY card issuer's analyst screen, not only
// Capital One's. Tag those same ten challenges for a second issuer and Capital
// One's share falls to 0.5, so under the old bar BOTH companies dropped out of
// the flow — the moment the content got more honest, the feature got worse.
// Exclusivity was never the question. The question is whether a person wrote
// down, and can defend, the claim that this data is shaped like that screen.
// That is what this file is.
//
// ── WHAT AN ARCHETYPE DOES NOT DO ────────────────────────────────────────────
//
// It does not describe any company's real process. It says what KIND of screen
// we believe a company runs, sourced from dated public reports, and the member
// record carries that source. The product's own copy has always said the mock
// is candidate-reported and not affiliated with anyone; nothing here weakens
// that, and `tests/interview-prep.test.js` fails the build on prediction
// wording in either language.
//
// It does not grant a challenge set. Membership makes a company OFFERABLE; the
// challenges they are handed are still the ones tagged for them in
// `src/data/challenge-companies.js` on the archetype's dataset. That is
// deliberate — see "the dataset is not the set" below.
//
// ── MODULE SHAPE, DELIBERATELY UNLIKE ITS NEIGHBOURS ─────────────────────────
//
// Every other file in `src/data/` is a classic script that assigns a
// `window.*` global and is concatenated into `public/data.js` by
// `scripts/data-files.js`. This one is an ES module with named exports,
// because `src/utils/interview-prep.js` imports it statically and it is a
// registry of a dozen lines, not a data blob the page needs on the window.
//
// **Do not add this file to `scripts/data-files.js`.** An `export` statement
// inside that concatenated classic script is a SyntaxError that would take
// every other data file down with it. `tests/interview-prep.test.js` asserts
// it stays out of that list.
//
// It lives in `src/data/` anyway because of what it is, not how it loads: it
// is content. Editing it is an editorial act with a checklist, not a refactor.

// ─────────────────────────── ADDING A MEMBER ────────────────────────────────
//
// MEMBERSHIP IS A CLAIM A PERSON MAKES AND SIGNS. A tag can never grant it; a
// script can never grant it; a company appearing in `challenge-companies.js`
// with fifty challenges and a mock is still not a member until a human adds it
// here and puts a date and a name on it. Everything below is checkable by the
// next person, which is the point.
//
//   1. SOURCE THE SCREEN FORMAT, CITABLY AND WITH DATES. Not "everyone knows
//      what a bank asks". The standard is the one `src/capital-one-sql-interview.html`
//      already meets: named public sources with the month and year on each one
//      (Blind candidate reports Dec 2021 / Nov 2022 / Jun 2025; prep guides
//      Aug 2025 – Feb 2026), phrased as "as described publicly in <month>", a
//      note where reports disagree, and an explicit line saying the company
//      does not publish the format. Put the digest in `screenSource` below. If
//      you cannot write that sentence, you do not have a member — you have a
//      guess about a company.
//
//   2. CONFIRM THE DATA SHAPE ACTUALLY MATCHES. Open the archetype's dataset
//      and the company's sourced format side by side. Does the screen run on
//      tables of this shape, at this grain, asking these operations? A retail
//      bank that screens on loan-book balance sheets does not belong in the
//      card-ledger archetype just because both are "finance". If the answer is
//      "close enough", the answer is no: write a second archetype instead, or
//      author the data. Record what you checked in `shapeNote`.
//
//   3. ADD THE PAGE SECTION. A member must have `src/<pageSlug>-sql-interview.html`
//      carrying a screen section built like Capital One's: what the format is,
//      what SQL it names, what costs points, and a sources line under it. The
//      prep flow points a person at a named company; the page is where they can
//      check what we are claiming and who said it. A member without that page
//      is a claim with nowhere to argue with it, and the registry test fails
//      the build for it rather than letting the company quietly disappear from
//      the picker.
//
//   4. THEN THE MECHANICS, which are the easy part and are all tested:
//      a mock in `src/data/mock-interviews.js` keyed to the exact company
//      string, every question on the archetype's dataset; at least
//      `MIN_TARGET_CHALLENGES` challenges on that dataset tagged for that exact
//      string in `src/data/challenge-companies.js`; and the company string
//      identical in all three places — the tag map, the mock's `company`, and
//      `company` here. Run `npm run test:run`.
//
//   5. TELL THE LEDGER. A second value in the `company` column of the prep
//      funnel is a pre-registered "stop and look" trigger in
//      `docs/agent/ledger.md`. Adding a member is what would cause it, so say
//      so in the same change.

//
// ─────────────────── CANDIDATES CHECKED AND REJECTED, 2026-09-08 ───────────────
//
// Searched for a second card issuer whose screen could be sourced to the bar
// above, because the card ledger already fits any of them and the data cost
// would be zero. None clears it today:
//
//   American Express — aggregator guides (interviewquery, dataford, prepfully,
//     exponent) describe "a time-boxed online assessment covering SQL, coding
//     and logical reasoning" with no duration, no question count and no
//     platform. The one dated candidate report found (GeeksforGeeks, updated
//     15 Jan 2025) is campus hiring for a Data Science role on Unstop: 60
//     questions across numerical, logical and coding, no SQL section named and
//     no time limit. Not the same screen, and not specific enough to state.
//   Discover — guide prose only: "an online coding challenge or a take-home
//     assignment". No platform, no duration, no count.
//   Synchrony, Chime — nothing role-specific. The "70 to 80 minutes, four to
//     six questions" that surfaces against Synchrony is Capital One's figure
//     restated by a guide, which is exactly the contamination this checklist
//     exists to keep out of the file.
//
// Capital One clears the bar because three Blind posts give a duration, a
// question count, a platform and the data shape in candidates' own words, and
// four dated guides corroborate them. That is the difference between a member
// and a guess, and it is why the second member is not written here yet.
// Re-check when a card issuer's screen surfaces in candidate reports rather
// than in guides quoting each other.
//
// ─────────────── CHECKED AGAIN BY TRAFFIC, 2026-09-12 (not a member) ───────────
//
// Ranked by 30-day landings on our own company pages: Revolut 59 (14.4% CTR),
// Snowflake 53, Stripe 31, Amazon 30, Wise 21. Searched for a sourced screen
// for the top three; none clears the checklist today, each for a stated reason:
//
//   Revolut — the closest, and since the evening of 2026-09-12 the screen IS
//     quotable with a quarter on it. Read in a browser (WebFetch returned
//     429): interviewquery "Revolut Data Analyst Interview Guide 2026",
//     https://www.interviewquery.com/interview-guides/revolut-data-analyst,
//     "synthesized from 27 candidate reports", reports stamped "Interviewed
//     Q3 2026". Two rounds, both SQL: (1) an online HackerRank screen —
//     "60 minutes, with two SQL questions and several" multiple-choice items
//     per one report, "SQL coding with multiple-choice questions" per
//     another (the older guide said 30 minutes; the 2026 reports say 60);
//     (2) a live coding session, "four sequential questions on a set of
//     interconnected tables (users, transactions, events, subscriptions)" —
//     "monthly active users with completed transactions, users in the top
//     10% by transaction volume, joins, aggregations, CTEs, filtering, and
//     date logic", with "window functions, cohort or funnel questions, and
//     conversion rates" named by a second candidate; a third lists
//     "joins, GROUP BY, WHERE vs HAVING, aggregations, NULL handling/COALESCE,
//     CTEs". That is step 1 of the checklist, unsigned: a person still has
//     to put their name on `declaredBy`. Data shape: until 2026-09-12 the
//     26 Revolut-tagged challenges sat on `ecommerce`
//     (18), `finans_fraud` (5) and `employees` (3) — a neobank screen runs on
//     users / transactions / currencies / top-ups, and that ledger did not
//     exist in the bank. Written the same day: `finans_neobank`
//     (src/data/neobank-data.js, from scripts/generate-neobank-ledger.js —
//     240 users, 12 currencies, top_ups and transactions with simulated
//     balances, validated by scripts/validate-neobank-ledger.mjs). That is
//     step 2 of the checklist done in advance. What still stands between
//     Revolut and membership: at least 8 challenges on `finans_neobank`
//     shaped like the four live-session tasks above and tagged Revolut, a
//     mock keyed to the exact name that mirrors the 60-minute two-SQL screen,
//     the page section — and the signature. None of those is a tag or a
//     script; the challenges and the mock are a day's content work.
//     DONE later the same day (2026-09-12): the twelve challenges (300-311),
//     the mock (`revolut-analytics-screen`), the page section with its
//     sources. What remains is the signature — see PENDING_INTERVIEW_ARCHETYPES
//     at the bottom of this file.
//   Stripe — guides and one Blind thread describe a CoderPad SQL round and a
//     take-home report inside a five-round loop; no duration, no count, no
//     table shape. Tags: `ecommerce` 27, `finans_fraud` 6.
//   Wise — a HackerRank screen of three tasks (an algorithm question, one SQL
//     join/aggregation query, a REST filtering task) per one guide, i.e. an
//     engineering screen with one SQL item; nothing analyst-specific. Tags:
//     `ecommerce` 10, `finans_fraud` 6.
//
// What the product does for these three meanwhile is written in the Interview
// tab's target pin (src/app.jsx, `interviewTarget`): it names the count of
// challenges carrying their tag and opens them, and says in so many words that
// no sourced screen format exists. The next member needs a person to read the
// Glassdoor / Blind reports in a browser, write the dated digest, and author
// the ledger the screen runs on.
/**
 * THE REGISTRY. One archetype, one member, today — and that is asserted by a
 * test, so growing it is a deliberate, reviewed diff rather than a drift.
 */
export const INTERVIEW_ARCHETYPES = Object.freeze([
  Object.freeze({
    id: 'card-payments-analyst',
    label: 'Card and payments analyst screen',
    dataset: 'finans_fraud',

    /**
     * THE CLAIM. Card issuers screen analyst candidates on a card ledger:
     * accounts, merchants, transactions and chargebacks, asked at the grain of
     * "per cardholder per month", "share of total", "top N per group",
     * "the ones with nothing on the other side". The work is summarising a
     * transaction ledger correctly — the mistakes that cost points are a join
     * that fans out the thing being summed and a GROUP BY at the wrong grain,
     * not unusual syntax. Any company whose analyst screen is that, on data of
     * that shape, belongs here.
     */
    claim:
      "Card issuers screen analyst candidates on a card ledger — accounts, merchants, "
      + "transactions, chargebacks — asked at the grain of per-cardholder-per-month spend, "
      + "share of total, top-N per group and anti-joins. What costs points is fan-out and "
      + "the wrong GROUP BY grain, not exotic syntax.",

    /**
     * WHY THIS DATASET. `finans_fraud` is a synthetic card ledger generated by
     * `scripts/generate-fraud-transactions.js`: 200 accounts, ~2,165
     * transactions, merchants with categories, chargebacks — one row per
     * transaction with an ISO timestamp, and a genuine one-to-many between
     * accounts and transactions, which is where the fan-out mistake lives. The
     * ten card-analytics challenges on it (ids 275-284, `sectorTags` including
     * `card_analytics`) were written from the sourced Capital One format:
     * monthly spend, share of total, signup cohort, anti-join, top-N per group,
     * HAVING, conditional aggregation, LAG, rolling frame, first-to-second
     * latency. That is the claim above, in the bank.
     */
    whyThisDataset:
      "A synthetic card ledger (200 accounts, ~2,165 transactions, merchants with "
      + "categories, chargebacks) with a real one-to-many between accounts and "
      + "transactions — the grain and the fan-out the screen is testing. The ten "
      + "card-analytics challenges on it were written from the sourced format.",

    /**
     * THE DATASET IS NOT THE SET, and this is why the flow still reads tags.
     * `finans_fraud` also carries the fraud-detection track (ids 270-274:
     * 3-sigma outliers, velocity rules, impossible travel, shared device
     * fingerprints, a recursive chargeback chain — four Hard and a Medium).
     * That is a fraud-strategy job, not an analyst screen; handing it to
     * someone preparing for a card-analytics assessment would pad their plan
     * with five hard challenges nobody is going to ask them. So membership
     * decides WHO may be offered a flow, and the company's own tags on this
     * dataset decide WHICH challenges they get.
     */
    excludesOnDataset:
      "ids 270-274, the fraud-detection track on the same ledger — a fraud-strategy "
      + "job, not an analyst screen.",

    members: Object.freeze([
      Object.freeze({
        company: 'Capital One',
        pageSlug: 'capital-one',
        declaredOn: '2026-09-08',
        declaredBy: 'Göktuğ',
        screenSource:
          "As described publicly in September 2026: candidate reports on Blind "
          + "(Dec 2021, Nov 2022, Jun 2025) and interview-prep guides dated Aug 2025 – "
          + "Feb 2026 — a CodeSignal assessment of ~70 minutes, ~14-15 questions, mostly "
          + "multiple choice over provided CSV/Excel tables plus one or a few written SQL "
          + "questions. Reports disagree on the split and the page says so. Capital One "
          + "does not publish the format; every specific is candidate-reported. Full "
          + "citations: src/capital-one-sql-interview.html.",
        shapeNote:
          "The sourced guides name the operations directly — INNER/LEFT JOIN, GROUP BY "
          + "with COUNT/SUM/AVG/MIN/MAX, CTEs and subqueries, ROW_NUMBER/RANK/DENSE_RANK/"
          + "LAG/LEAD/SUM OVER, and date filtering by day/week/month/quarter/rolling "
          + "window — and describe account-, transaction- and product-shaped tables. That "
          + "is this ledger, at this grain. Checked 2026-09-08 against ids 275-284.",
      }),
    ]),
  }),
]);

/**
 * PENDING — written, backed by the data, and UNSIGNED (2026-09-12).
 *
 * Everything the checklist asks for a Revolut membership exists in the bank
 * tonight except the one thing a script may not supply: a person's name on
 * `declaredBy`. The twelve challenges on `finans_neobank` tagged Revolut
 * (ids 300-311), the mock keyed to the exact name and running on that ledger
 * (`revolut-analytics-screen`), the page section with its dated sources
 * (src/revolut-sql-interview.html) — all in place and pinned by
 * tests/revolut-mock.test.js, which validates THIS block against the live
 * data with a placeholder signature so the only thing left to change is the
 * signature.
 *
 * TO SIGN: fill `declaredOn` and `declaredBy`, move the archetype into
 * INTERVIEW_ARCHETYPES above, delete it from here, and update the
 * "exactly one archetype and one member today" assertion in
 * tests/interview-prep.test.js to two. Then tell the ledger: a second value
 * in the prep funnel's `company` column is its pre-registered stop-and-look.
 */
export const PENDING_INTERVIEW_ARCHETYPES = Object.freeze([
  Object.freeze({
    id: 'neobank-analyst',
    label: 'Neobank analyst screen',
    dataset: 'finans_neobank',
    claim:
      "Consumer neobanks screen analyst candidates on a user-and-transaction ledger — "
      + "users with plans and referrals, top-ups, multi-currency transactions with a "
      + "status and a fee — asked as monthly active users, the top share of users by "
      + "volume, cohort activation, decline and take rates, and month-over-month "
      + "change. What costs points is counting transactions where users were asked "
      + "for, a status filter forgotten, and NULL treated as a value.",
    whyThisDataset:
      "A synthetic multi-currency neobank ledger (240 users across 12 countries, 12 "
      + "currencies, 1,153 top-ups, 3,433 transactions with statuses, fees, merchant "
      + "categories and p2p counterparties; src/data/neobank-data.js). The twelve "
      + "Revolut-tagged challenges on it (ids 300-311) were written from the sourced "
      + "task list: MAU with completed transactions, top 10% by volume, signup-cohort "
      + "activation, decline rate by plan, FX fee take rate, month-over-month growth, "
      + "KYC latency, top-N per country, referred vs organic.",
    excludesOnDataset: "none — every challenge on this ledger is analyst-screen shaped.",
    members: Object.freeze([
      Object.freeze({
        company: 'Revolut',
        pageSlug: 'revolut',
        declaredOn: null,
        declaredBy: null,
        screenSource:
          "As described publicly in September 2026: interviewquery's \"Revolut Data "
          + "Analyst Interview Guide 2026\", synthesised from 27 candidate reports "
          + "stamped Q3 2026. Two SQL rounds: an online HackerRank screen of about 60 "
          + "minutes with two written SQL questions plus multiple choice (an earlier "
          + "edition of the same guide said 30 minutes; the 2026 reports say 60), then "
          + "a live session of four sequential questions on interconnected users, "
          + "transactions, events and subscriptions tables — monthly active users with "
          + "completed transactions, users in the top 10% by transaction volume, joins, "
          + "CTEs, date logic, window functions, cohort and conversion analysis. "
          + "Revolut does not publish the format; every specific is candidate-reported. "
          + "Full citation: src/revolut-sql-interview.html.",
        shapeNote:
          "The sourced tasks run on users and transactions at the grain of per-user-"
          + "per-month, share of users, and per-plan rates; the ledger has both tables, "
          + "a status column for the 'completed' filters the reports stress, plans on "
          + "users (the subscriptions the live round names), and referrals. What the "
          + "ledger does not have is a product-events table, so an events funnel "
          + "question cannot be set on it; the twelve challenges avoid claiming one. "
          + "Checked 2026-09-12 against ids 300-311 and the mock.",
      }),
    ]),
  }),
]);

/** Every declared member company, across every archetype. Sorted, deduped. */
export function archetypeMemberCompanies(archetypes = INTERVIEW_ARCHETYPES) {
  const out = new Set();
  for (const a of Array.isArray(archetypes) ? archetypes : []) {
    for (const m of Array.isArray(a?.members) ? a.members : []) {
      if (typeof m?.company === 'string' && m.company.trim().length > 0) out.add(m.company.trim());
    }
  }
  return [...out].sort((a, b) => a.localeCompare(b));
}

/**
 * The archetype a company is a declared member of, plus that member record.
 * Case-insensitive on the company name — the tag map, the mock and this file
 * are required to agree exactly, but a lookup from a stored user preference
 * should not turn on capitalisation. Returns null for a non-member, which is
 * the answer for every company in the product except the ones listed above.
 */
export function archetypeForCompany(company, archetypes = INTERVIEW_ARCHETYPES) {
  if (typeof company !== 'string') return null;
  const wanted = company.trim().toLowerCase();
  if (wanted.length === 0) return null;
  for (const a of Array.isArray(archetypes) ? archetypes : []) {
    for (const m of Array.isArray(a?.members) ? a.members : []) {
      if (typeof m?.company === 'string' && m.company.trim().toLowerCase() === wanted) {
        return { archetype: a, member: m };
      }
    }
  }
  return null;
}
