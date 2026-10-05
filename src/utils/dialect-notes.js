// SQLite here, another engine on the day (founder review, 2026-10-05: "Senior
// bir aday bunu ilk sorguda fark eder ve 'bu benim mülakatım değil' der. En
// azından dialect'i açıkça belirt").
//
// Every query in SQL Quest runs on SQLite in the browser. Joins, GROUP BY,
// HAVING, CTEs and window functions are written the same way in PostgreSQL,
// MySQL and Snowflake; what differs is a handful of functions. These rows are
// the ones the bank actually uses (strftime, julianday, date modifiers, ROUND
// on a float, integer division, ||). ONE source: the app's challenge page and
// the company pages' topic block both render from it
// (tests/dialect-notes.test.js).
//
// Facts are the engines' own documented syntax, not product claims; keep each
// cell runnable as written.

export const DIALECTS = ['SQLite (here)', 'PostgreSQL', 'MySQL', 'Snowflake'];

export const DIALECT_ROWS = [
  {
    what: 'Month bucket',
    cells: ["strftime('%Y-%m', ts)", "to_char(ts, 'YYYY-MM')", "DATE_FORMAT(ts, '%Y-%m')", "TO_CHAR(ts, 'YYYY-MM')"],
  },
  {
    what: 'Days between two dates',
    cells: ['julianday(b) - julianday(a)', 'b::date - a::date', 'DATEDIFF(b, a)', "DATEDIFF('day', a, b)"],
  },
  {
    what: '14 days before a date',
    cells: ["date(ts, '-14 days')", "ts - INTERVAL '14 days'", 'ts - INTERVAL 14 DAY', "DATEADD('day', -14, ts)"],
  },
  {
    what: 'Round a computed average',
    cells: ['ROUND(AVG(x), 2)', 'ROUND(AVG(x)::numeric, 2)', 'ROUND(AVG(x), 2)', 'ROUND(AVG(x), 2)'],
  },
  {
    what: 'Integer ÷ integer',
    cells: ['7 / 2 = 3', '7 / 2 = 3', '7 / 2 = 3.5000', '7 / 2 = 3.500000'],
    note: 'Write 100.0 * a / b and the answer is the same on all four.',
  },
  {
    what: 'Join two strings',
    cells: ["a || ' ' || b", "a || ' ' || b", "CONCAT(a, ' ', b)", "a || ' ' || b"],
  },
];

// One sentence for a page that cannot carry the table.
export const DIALECT_SENTENCE = "Every query here runs on SQLite in your browser. Joins, GROUP BY, CTEs and window functions are written the same way in PostgreSQL, MySQL and Snowflake; dates are where they differ (SQLite's strftime('%Y-%m', ts) is to_char(ts, 'YYYY-MM') in PostgreSQL), and the app lists each difference beside every challenge.";
