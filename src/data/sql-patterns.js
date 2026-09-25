// SQL trap / pattern pages (founder's SEO task, 2026-09-25): one page per
// mistake that returns a wrong answer without an error. Rendered by
// scripts/build-pattern-pages.mjs to /<slug>/; every number on a page comes
// from a query in this file, and tests/sql-patterns.test.js runs every query
// against the finans_fraud dataset (src/data/finans-fraud-data.js) and fails
// if the dataset stops returning what the page says.
//
// The examples are NOT the Capital One mock's questions. The mock is a Pro
// product and two of the first three payers prepped for that screen, so the
// pages teach the same trap on the same dataset with a different question
// and different numbers; each page names the mock question that tests the
// trap without answering it. tests/sql-patterns.test.js fails if a page's
// query is the mock's own snippet.
//
// Company names appear only as "tested in our Capital One … mock" — never a
// claim about what a company asks (CLAUDE.md, SEO operating rules).
//
// `{year}` in a title is filled at build time from the build date.

export const PATTERN_DATASET = 'finans_fraud';
export const PATTERN_PUBLISHED = '2026-09-25';

export const SQL_PATTERNS = [
  {
    slug: 'sql-not-in-null',
    short: 'NOT IN with NULL',
    title: 'SQL NOT IN with NULL: Why Your Query Returns 0 Rows ({year})',
    h1: 'SQL NOT IN with NULL: why the query returns 0 rows',
    description: 'NOT IN against a subquery that holds one NULL returns no rows, and no error. A worked example on 76 chargebacks: 0 rows instead of 49, and two fixes that work.',
    trap: 'If the subquery behind NOT IN returns even one NULL, NOT IN is never true for any row, and the query quietly returns nothing.',
    task: 'Count the chargebacks that were opened on a day when no chargeback was resolved. The `chargebacks` table has 76 rows; 17 of them are still open, so their `resolved_at` is NULL.',
    wrong: {
      sql: "SELECT COUNT(*) AS chargebacks\nFROM chargebacks\nWHERE DATE(opened_at) NOT IN (\n  SELECT DATE(resolved_at) FROM chargebacks\n);",
      rows: [[0]],
      says: '0 — not a single chargeback.',
    },
    why: [
      '`x NOT IN (a, b, c)` means `x <> a AND x <> b AND x <> c`. When one of the values is NULL, that comparison is `x <> NULL`, which is UNKNOWN rather than TRUE — and TRUE AND UNKNOWN is UNKNOWN.',
      'WHERE keeps a row only when its condition is TRUE, so with a NULL anywhere in the list no row survives. The 17 open chargebacks put 17 NULLs into the subquery, and the answer drops to 0.',
      'Nothing warns you: the query runs, and 0 looks like a plausible count.',
    ],
    fixes: [
      {
        label: 'NOT EXISTS — ignores NULLs by construction',
        sql: "SELECT COUNT(*) AS chargebacks\nFROM chargebacks c\nWHERE NOT EXISTS (\n  SELECT 1 FROM chargebacks r\n  WHERE DATE(r.resolved_at) = DATE(c.opened_at)\n);",
        rows: [[49]],
      },
      {
        label: 'Keep NOT IN, but take the NULLs out of the subquery',
        sql: "SELECT COUNT(*) AS chargebacks\nFROM chargebacks\nWHERE DATE(opened_at) NOT IN (\n  SELECT DATE(resolved_at) FROM chargebacks\n  WHERE resolved_at IS NOT NULL\n);",
        rows: [[49]],
      },
    ],
    right: '49 chargebacks were opened on a day with no resolution.',
    facts: [
      { text: '76 rows', sql: 'SELECT COUNT(*) FROM chargebacks', expect: 76 },
      { text: '17 of them are still open', sql: 'SELECT COUNT(*) FROM chargebacks WHERE resolved_at IS NULL', expect: 17 },
    ],
    rule: 'Prefer NOT EXISTS for "rows with no match". If you use NOT IN, make sure the subquery cannot return NULL.',
    mock: { id: 'capital-one-codesignal', question: 'c1-m9', number: 9, name: 'Capital One CodeSignal-style mock' },
    challenges: [290, 190, 134, 132],
    related: ['sql-left-join-where-filter', 'sql-average-of-averages'],
    readMore: { href: '/blog/null-handling-mistakes/', text: 'Five NULL-handling mistakes, including COUNT and =' },
  },
  {
    slug: 'sql-join-fan-out',
    short: 'Join fan-out',
    title: 'SQL Join Fan-Out: Why SUM and COUNT Inflate After a JOIN ({year})',
    h1: 'SQL join fan-out: why SUM and COUNT inflate after a JOIN',
    description: 'Join a second table on the wrong key and every row repeats, so SUM and COUNT come back multiplied. A worked example: 78,986.43 of spend reported as 243,172.54, and the fix.',
    trap: 'Joining two child tables through their parent (instead of on the key that links them) repeats each row once per match, so every SUM and COUNT after the join is inflated.',
    task: 'Report card spend and the number of chargebacks for each merchant risk tier. `chargebacks` carries both `merchant_id` and `txn_id`, and the analyst joins it on `merchant_id`.',
    wrong: {
      sql: "SELECT m.risk_tier,\n       ROUND(SUM(t.amount), 2) AS spend,\n       COUNT(cb.chargeback_id) AS chargebacks\nFROM merchants m\nJOIN transactions t  ON t.merchant_id = m.merchant_id\nJOIN chargebacks cb  ON cb.merchant_id = m.merchant_id\nGROUP BY m.risk_tier\nORDER BY m.risk_tier;",
      rows: [['high', 243172.54, 878], ['low', 488731.16, 3829], ['medium', 344141.67, 2016]],
      columns: ['risk_tier', 'spend', 'chargebacks'],
      says: 'High-risk merchants appear to have 243,172.54 of spend and 878 chargebacks.',
    },
    why: [
      'Each transaction at a merchant is paired with every chargeback at that merchant, not with its own. Aurora Cafe, a high-risk merchant with 90 transactions and 5 chargebacks, becomes 450 joined rows where there should be 90.',
      'SUM then adds every transaction amount once per chargeback, and COUNT counts the pairs. Nothing about the result looks broken; the numbers are simply several times too large.',
      'The tell: a total that grows when you add a join that should only have added columns.',
    ],
    fixes: [
      {
        label: 'Join on the key that makes the rows one-to-one — the transaction',
        sql: "SELECT m.risk_tier,\n       ROUND(SUM(t.amount), 2) AS spend,\n       COUNT(cb.chargeback_id) AS chargebacks\nFROM merchants m\nJOIN transactions t      ON t.merchant_id = m.merchant_id\nLEFT JOIN chargebacks cb ON cb.txn_id = t.txn_id\nGROUP BY m.risk_tier\nORDER BY m.risk_tier;",
        rows: [['high', 78986.43, 10], ['low', 162994.39, 44], ['medium', 118985.05, 22]],
        columns: ['risk_tier', 'spend', 'chargebacks'],
      },
      {
        label: 'Or aggregate each child table first, then join the totals',
        sql: "WITH spend AS (\n  SELECT merchant_id, SUM(amount) AS spend\n  FROM transactions GROUP BY merchant_id\n), disputes AS (\n  SELECT merchant_id, COUNT(*) AS chargebacks\n  FROM chargebacks GROUP BY merchant_id\n)\nSELECT m.risk_tier,\n       ROUND(SUM(s.spend), 2) AS spend,\n       COALESCE(SUM(d.chargebacks), 0) AS chargebacks\nFROM merchants m\nJOIN spend s          ON s.merchant_id = m.merchant_id\nLEFT JOIN disputes d  ON d.merchant_id = m.merchant_id\nGROUP BY m.risk_tier\nORDER BY m.risk_tier;",
        rows: [['high', 78986.43, 10], ['low', 162994.39, 44], ['medium', 118985.05, 22]],
        columns: ['risk_tier', 'spend', 'chargebacks'],
      },
    ],
    right: 'High-risk merchants have 78,986.43 of spend across 262 transactions, and 10 chargebacks — the wrong query overstated spend about threefold.',
    facts: [
      { text: '262 transactions', sql: "SELECT COUNT(*) FROM transactions t JOIN merchants m ON m.merchant_id = t.merchant_id WHERE m.risk_tier = 'high'", expect: 262 },
      { text: 'becomes 450 joined rows where there should be 90', sql: "SELECT 'becomes ' || COUNT(*) || ' joined rows where there should be ' || (SELECT COUNT(*) FROM transactions WHERE merchant_id = 3) FROM transactions t JOIN chargebacks cb ON cb.merchant_id = t.merchant_id WHERE t.merchant_id = 3", expect: 'becomes 450 joined rows where there should be 90' },
      { text: 'Aurora Cafe, a high-risk merchant', sql: "SELECT name || ', a ' || risk_tier || '-risk merchant' FROM merchants WHERE merchant_id = 3", expect: 'Aurora Cafe, a high-risk merchant' },
    ],
    rule: 'Before trusting a SUM or COUNT after a join, check that the join did not change the row count of the table you are summing.',
    mock: { id: 'capital-one-codesignal', question: 'c1-m2', number: 2, name: 'Capital One CodeSignal-style mock' },
    alsoIn: { id: 'capital-one-live-sql', question: 'c1-q3', number: 1, name: 'Capital One live SQL round mock' },
    challenges: [291, 298, 273, 277],
    related: ['sql-average-of-averages', 'sql-left-join-where-filter'],
    readMore: { href: '/blog/sql-joins-explained/', text: 'SQL joins explained, with the row counts each join produces' },
  },
  {
    slug: 'sql-between-timestamp',
    short: 'BETWEEN on timestamps',
    title: 'SQL BETWEEN with Timestamps: Why the Last Day Goes Missing ({year})',
    h1: 'SQL BETWEEN with timestamps: why the last day goes missing',
    description: 'BETWEEN with a bare end date drops every row with a time on that last day. A worked example: March counted as 918 transactions instead of 960, and two filters that keep the whole day.',
    trap: 'When a column holds a time as well as a date, `BETWEEN \'…\' AND \'2026-03-31\'` stops at the first instant of March 31, so the whole last day is left out.',
    task: 'Count the card transactions in March 2026. `txn_at` is stored as a full ISO timestamp, such as `2026-03-31T23:06:59.458Z`.',
    wrong: {
      sql: "SELECT COUNT(*) AS transactions\nFROM transactions\nWHERE txn_at BETWEEN '2026-03-01' AND '2026-03-31';",
      rows: [[918]],
      says: '918 transactions.',
    },
    why: [
      'The upper bound `\'2026-03-31\'` has no time, so it compares as the very start of that day. `\'2026-03-31T09:14:…\'` sorts after `\'2026-03-31\'`, which puts every transaction on March 31 outside the range.',
      'The same happens with a real DATETIME column: a bare date means midnight. Here it costs 42 transactions — the entire last day of the month — with no error.',
    ],
    fixes: [
      {
        label: 'A half-open range: from the first day, up to (not including) the next month',
        sql: "SELECT COUNT(*) AS transactions\nFROM transactions\nWHERE txn_at >= '2026-03-01'\n  AND txn_at <  '2026-04-01';",
        rows: [[960]],
      },
      {
        label: 'Or compare the date part only',
        sql: "SELECT COUNT(*) AS transactions\nFROM transactions\nWHERE DATE(txn_at) BETWEEN '2026-03-01' AND '2026-03-31';",
        rows: [[960]],
      },
    ],
    right: 'March 2026 has 960 transactions.',
    facts: [
      { text: '42 transactions', sql: "SELECT COUNT(*) FROM transactions WHERE DATE(txn_at) = '2026-03-31'", expect: 42 },
      { text: '2026-03-31T23:06:59.458Z', sql: "SELECT MAX(txn_at) FROM transactions WHERE DATE(txn_at) = '2026-03-31'", expect: '2026-03-31T23:06:59.458Z' },
    ],
    rule: 'For time ranges, use `>= start AND < next_start`. It is correct for dates, timestamps and strings alike, and it can use an index on the column.',
    mock: { id: 'capital-one-codesignal', question: 'c1-m4', number: 4, name: 'Capital One CodeSignal-style mock' },
    alsoIn: { id: 'capital-one-codesignal', question: 'c1-m8', number: 8, name: 'Capital One CodeSignal-style mock' },
    challenges: [289, 278, 294, 284],
    related: ['sql-average-of-averages', 'sql-not-in-null'],
    readMore: null,
  },
  {
    slug: 'sql-average-of-averages',
    short: 'Average of averages',
    title: 'SQL Average of Averages: Why AVG of Group Rates Is Wrong ({year})',
    h1: 'SQL average of averages: why AVG of group rates is wrong',
    description: 'Averaging group averages gives a small group as much weight as a large one. A worked example: an overall chargeback rate reported as 13.10% when it is 3.51%, and the weighted fix.',
    trap: 'The average of group averages (or of group rates) is not the overall average: every group gets one vote however many rows it has.',
    task: 'Report the overall chargeback rate — chargebacks per transaction. A dashboard already shows the rate for each account status (active, flagged), and the analyst averages the two rates.',
    wrong: {
      sql: "SELECT ROUND(100 * AVG(rate), 2) AS chargeback_rate_pct\nFROM (\n  SELECT a.status,\n         1.0 * COUNT(cb.chargeback_id) / COUNT(*) AS rate\n  FROM transactions t\n  JOIN accounts a         ON a.account_id = t.account_id\n  LEFT JOIN chargebacks cb ON cb.txn_id = t.txn_id\n  GROUP BY a.status\n);",
      rows: [[13.1]],
      says: 'A 13.10% chargeback rate.',
    },
    breakdown: {
      caption: 'The two groups being averaged',
      sql: "SELECT a.status,\n       COUNT(*) AS transactions,\n       COUNT(cb.chargeback_id) AS chargebacks,\n       ROUND(100.0 * COUNT(cb.chargeback_id) / COUNT(*), 2) AS rate_pct\nFROM transactions t\nJOIN accounts a          ON a.account_id = t.account_id\nLEFT JOIN chargebacks cb ON cb.txn_id = t.txn_id\nGROUP BY a.status\nORDER BY a.status;",
      rows: [['active', 2109, 63, 2.99], ['flagged', 56, 13, 23.21]],
      columns: ['status', 'transactions', 'chargebacks', 'rate_pct'],
    },
    why: [
      'The flagged group has 56 transactions and the active group 2,109, but the outer AVG gives each group the same weight: (2.99% + 23.21%) / 2. The 56 flagged transactions decide half of the answer.',
      'The overall rate is total chargebacks over total transactions: 76 / 2,165. That is one division over all the rows, not an average of divisions.',
      'The gap depends on how uneven the groups are. On the same data, averaging resolution times across the five reason codes gives 21.30 days against a true 21.81 — close, because those groups are similar in size. The error is always there; skew decides how big it is.',
    ],
    fixes: [
      {
        label: 'One division over all the rows',
        sql: "SELECT ROUND(100.0 * COUNT(cb.chargeback_id) / COUNT(*), 2) AS chargeback_rate_pct\nFROM transactions t\nLEFT JOIN chargebacks cb ON cb.txn_id = t.txn_id;",
        rows: [[3.51]],
      },
      {
        label: 'Or keep the group table, and weight it: sum the parts, then divide',
        sql: "SELECT ROUND(100.0 * SUM(chargebacks) / SUM(transactions), 2) AS chargeback_rate_pct\nFROM (\n  SELECT a.status,\n         COUNT(*) AS transactions,\n         COUNT(cb.chargeback_id) AS chargebacks\n  FROM transactions t\n  JOIN accounts a          ON a.account_id = t.account_id\n  LEFT JOIN chargebacks cb ON cb.txn_id = t.txn_id\n  GROUP BY a.status\n);",
        rows: [[3.51]],
      },
    ],
    right: 'The overall chargeback rate is 3.51%.',
    facts: [
      { text: '76 / 2,165', sql: 'SELECT (SELECT COUNT(*) FROM chargebacks) || \' / \' || (SELECT COUNT(*) FROM transactions)', expect: '76 / 2165' },
      { text: '21.30 days against a true 21.81', sql: "SELECT ROUND(AVG(d), 2) || ' vs ' || (SELECT ROUND(AVG(julianday(resolved_at) - julianday(opened_at)), 2) FROM chargebacks WHERE resolved_at IS NOT NULL) FROM (SELECT reason_code, AVG(julianday(resolved_at) - julianday(opened_at)) AS d FROM chargebacks WHERE resolved_at IS NOT NULL GROUP BY reason_code)", expect: '21.3 vs 21.81' },
    ],
    rule: 'For an overall average or rate, divide totals: SUM(numerator) / SUM(denominator), or one AVG over the rows. Average the group results only when you want each group weighted equally — and say so.',
    mock: { id: 'capital-one-codesignal', question: 'c1-m11', number: 11, name: 'Capital One CodeSignal-style mock' },
    challenges: [280, 305, 293, 276],
    related: ['sql-join-fan-out', 'sql-between-timestamp'],
    readMore: null,
  },
  {
    slug: 'sql-left-join-where-filter',
    short: 'LEFT JOIN with a WHERE filter',
    title: 'SQL LEFT JOIN with a WHERE Filter: Why It Becomes an INNER JOIN ({year})',
    h1: 'SQL LEFT JOIN with a WHERE filter: why it becomes an INNER JOIN',
    description: 'A WHERE condition on the right table of a LEFT JOIN throws away the unmatched rows the LEFT JOIN kept. A worked example: 15 merchants returned instead of 25, and the fix.',
    trap: 'A filter on the right-hand table in WHERE removes the NULL rows a LEFT JOIN keeps, so the LEFT JOIN silently behaves like an INNER JOIN.',
    task: 'List every merchant with its number of open chargebacks, showing 0 where there are none. There are 25 merchants.',
    wrong: {
      sql: "SELECT m.merchant_id,\n       COUNT(cb.chargeback_id) AS open_chargebacks\nFROM merchants m\nLEFT JOIN chargebacks cb ON cb.merchant_id = m.merchant_id\nWHERE cb.status = 'open'\nGROUP BY m.merchant_id;",
      rowCount: 15,
      says: '15 rows — ten merchants are missing, and no merchant shows 0.',
    },
    why: [
      'The LEFT JOIN does keep all 25 merchants: a merchant with no matching chargeback gets one row with NULL in every `cb` column.',
      'WHERE runs after the join, and `NULL = \'open\'` is not TRUE, so those rows are dropped — along with every merchant whose chargebacks are all closed. What is left is exactly what an INNER JOIN would return.',
      'A condition on the right table belongs in the ON clause: there it decides which rows match, instead of which rows survive.',
    ],
    fixes: [
      {
        label: 'Move the right-table condition into ON',
        sql: "SELECT m.merchant_id,\n       COUNT(cb.chargeback_id) AS open_chargebacks\nFROM merchants m\nLEFT JOIN chargebacks cb\n       ON cb.merchant_id = m.merchant_id\n      AND cb.status = 'open'\nGROUP BY m.merchant_id;",
        rowCount: 25,
      },
      {
        label: 'Or filter the right table before joining it',
        sql: "SELECT m.merchant_id,\n       COUNT(o.chargeback_id) AS open_chargebacks\nFROM merchants m\nLEFT JOIN (\n  SELECT chargeback_id, merchant_id\n  FROM chargebacks WHERE status = 'open'\n) o ON o.merchant_id = m.merchant_id\nGROUP BY m.merchant_id;",
        rowCount: 25,
      },
    ],
    right: 'All 25 merchants come back; 10 of them with 0 open chargebacks.',
    facts: [
      { text: '25 merchants', sql: 'SELECT COUNT(*) FROM merchants', expect: 25 },
      { text: '10 of them with 0', sql: "SELECT COUNT(*) FROM (SELECT m.merchant_id, COUNT(cb.chargeback_id) AS c FROM merchants m LEFT JOIN chargebacks cb ON cb.merchant_id = m.merchant_id AND cb.status = 'open' GROUP BY m.merchant_id) WHERE c = 0", expect: 10 },
    ],
    rule: 'Conditions on the LEFT table go in WHERE; conditions on the RIGHT table go in ON. A WHERE on a right-table column is only right when you mean to drop the unmatched rows — then write an INNER JOIN.',
    mock: { id: 'capital-one-codesignal', question: 'c1-m10', number: 10, name: 'Capital One CodeSignal-style mock' },
    challenges: [19, 306, 278, 74],
    related: ['sql-not-in-null', 'sql-join-fan-out'],
    readMore: { href: '/blog/sql-joins-explained/', text: 'SQL joins explained' },
  },
];

/** Mock question id → the pattern page that explains its trap (the app's "read this trap" link). */
export const PATTERN_FOR_MOCK_QUESTION = Object.fromEntries(
  SQL_PATTERNS.flatMap(p => [p.mock, p.alsoIn].filter(Boolean).map(m => [m.question, p.slug]))
    .concat([['c1-m6', 'sql-join-fan-out']])   // Rank 1 by total spend: its wrong option is the fan-out total
);

/** Challenge id → the pattern pages that cite it (question pages link back). */
export const PATTERNS_FOR_CHALLENGE = SQL_PATTERNS.reduce((acc, p) => {
  for (const id of p.challenges) (acc[id] = acc[id] || []).push(p.slug);
  return acc;
}, {});

export function patternTitle(p, year = new Date().getFullYear()) {
  return p.title.replace('{year}', String(year));
}
