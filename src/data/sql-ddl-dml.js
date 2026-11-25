// /sql-ddl-dml-practice/ (C6, 2026-11-25): the guide to the state-graded
// DDL/DML set. Page: scripts/build-ddl-dml-page.mjs. Tests:
// tests/sql-ddl-dml-page.test.js.
//
// Every statement on the page lives here and is run by the test on a FRESH
// copy of the `ecommerce` dataset (the app's loader: a column's type comes
// from the first row's value), section `setup` first, then the step's `sql`,
// then its `check`. A step's `result` (or `error`) is what the page prints and
// what the test pins, so the page cannot show a number the engine does not
// return. Change a statement here and the test tells you the new result.
//
// The examples use their own scratch tables (review_summary, product_rating,
// customer_tier, review_flags) or tables no state challenge grades
// (reviews), so the page never prints a challenge's reference answer.
//
// `practice` lists challenge ids per section. The generator links only the
// ids present in the live bank as state-graded challenges, so an id from an
// unmerged set (355-359 before #298) renders nothing, never a dead link.
//
// No claim about how often any of this is asked in interviews.

export const DDL_DML_SLUG = 'sql-ddl-dml-practice';
export const DDL_DML_PUBLISHED = '2026-11-25';
export const DDL_DML_APP_SRC = 'topic-ddl-dml';
export const DDL_DML_DATASET = 'ecommerce';
export const DDL_DML_TITLE = 'SQL DDL/DML Practice: INSERT, UPDATE, DELETE, UPSERT | SQLQuest.app';
export const DDL_DML_H1 = 'SQL DDL and DML practice: INSERT, UPDATE, DELETE, UPSERT, ALTER, CREATE INDEX';
export const DDL_DML_DESCRIPTION = 'What INSERT, UPDATE, DELETE, UPSERT, ALTER TABLE and CREATE INDEX do in SQLite, the one trap in each, and practice graded on what your tables hold.';

export const DDL_DML_INTRO = [
  'A SELECT reads data. The statements on this page change it: DML (INSERT, UPDATE, DELETE, UPSERT) changes rows, and DDL (CREATE TABLE, ALTER TABLE, CREATE INDEX) changes the tables themselves. Each one runs without complaint when it is wrong, so the skill is knowing what the table holds afterwards.',
  'Every statement below ran on SQLite against a fresh copy of the practice shop’s `reviews` and `customers` tables, and the result under it is the one SQLite returned. Each section ends with the one trap that statement is known for, run the same way, and links to practice graded on the state your statements leave behind.',
];

export const DDL_DML_SECTIONS = [
  {
    id: 'insert-select',
    kind: 'DML',
    h2: 'INSERT … SELECT: copy rows from a query',
    what: 'INSERT … SELECT writes the rows a query returns into another table, in one statement. Name the target columns: SQLite matches the SELECT’s columns to them by position, never by name.',
    setup: 'CREATE TABLE review_summary (product TEXT PRIMARY KEY, review_count INTEGER, avg_stars REAL);',
    steps: [
      {
        kind: 'right',
        label: 'One summary row per product',
        sql: 'INSERT INTO review_summary (product, review_count, avg_stars)\nSELECT product, COUNT(*), ROUND(AVG(stars), 2)\nFROM reviews\nGROUP BY product;',
        check: 'SELECT product, review_count, avg_stars FROM review_summary ORDER BY product;',
        result: { columns: ['product', 'review_count', 'avg_stars'], rows: [['Desk Lamp', 3, 3.33], ['Laptop Pro', 4, 3.25], ['Monitor 27inch', 1, 5], ['Monitor Stand', 2, 4], ['Office Chair', 3, 2.67], ['USB-C Hub', 3, 3.67], ['Wireless Mouse', 2, 3]] },
      },
      {
        kind: 'trap',
        label: 'No column list, and the SELECT’s columns in another order',
        sql: 'INSERT INTO review_summary\nSELECT product, ROUND(AVG(stars), 2), COUNT(*)\nFROM reviews\nGROUP BY product;',
        check: 'SELECT product, review_count, avg_stars FROM review_summary ORDER BY product;',
        result: { columns: ['product', 'review_count', 'avg_stars'], rows: [['Desk Lamp', 3.33, 3], ['Laptop Pro', 3.25, 4], ['Monitor 27inch', 5, 1], ['Monitor Stand', 4, 2], ['Office Chair', 2.67, 3], ['USB-C Hub', 3.67, 3], ['Wireless Mouse', 3, 2]] },
      },
    ],
    trap: 'Without a column list, the averages land in `review_count` and the counts in `avg_stars`. SQLite raises no error: a column’s type is a preference, not a rule, so 3.33 sits happily in an INTEGER column. Always write the column list.',
    practice: [325],
  },
  {
    id: 'update',
    kind: 'DML',
    h2: 'UPDATE with a correlated subquery: values from another table',
    what: 'UPDATE changes columns in the rows its WHERE picks; with no WHERE it changes every row. To take a new value from another table, a correlated subquery looks it up for each row being updated.',
    setup: "CREATE TABLE product_rating (product TEXT PRIMARY KEY, stars REAL);\nINSERT INTO product_rating VALUES ('Desk Lamp', 3.5), ('Laptop Pro', 3.0), ('Webcam HD', 4.2), ('Wireless Mouse', 3.5);",
    steps: [
      {
        kind: 'right',
        label: 'Refresh each rating, only where reviews exist',
        sql: 'UPDATE product_rating\nSET stars = (SELECT ROUND(AVG(r.stars), 2) FROM reviews r\n             WHERE r.product = product_rating.product)\nWHERE EXISTS (SELECT 1 FROM reviews r\n              WHERE r.product = product_rating.product);',
        check: 'SELECT product, stars FROM product_rating ORDER BY product;',
        result: { columns: ['product', 'stars'], rows: [['Desk Lamp', 3.33], ['Laptop Pro', 3.25], ['Webcam HD', 4.2], ['Wireless Mouse', 3]] },
      },
      {
        kind: 'alt',
        label: 'The same update with UPDATE … FROM (SQLite 3.33 and later, PostgreSQL)',
        sql: 'UPDATE product_rating\nSET stars = s.avg_stars\nFROM (SELECT product, ROUND(AVG(stars), 2) AS avg_stars\n      FROM reviews GROUP BY product) AS s\nWHERE s.product = product_rating.product;',
        check: 'SELECT product, stars FROM product_rating ORDER BY product;',
        result: { columns: ['product', 'stars'], rows: [['Desk Lamp', 3.33], ['Laptop Pro', 3.25], ['Webcam HD', 4.2], ['Wireless Mouse', 3]] },
      },
      {
        kind: 'trap',
        label: 'The subquery with no WHERE on the UPDATE',
        sql: 'UPDATE product_rating\nSET stars = (SELECT ROUND(AVG(r.stars), 2) FROM reviews r\n             WHERE r.product = product_rating.product);',
        check: 'SELECT product, stars FROM product_rating ORDER BY product;',
        result: { columns: ['product', 'stars'], rows: [['Desk Lamp', 3.33], ['Laptop Pro', 3.25], ['Webcam HD', null], ['Wireless Mouse', 3]] },
      },
    ],
    trap: 'Webcam HD has no reviews, so its subquery returns no row, which UPDATE reads as NULL: a 4.2 rating is wiped. The outer UPDATE has no WHERE, so it touches every row, matched or not. Limit it with WHERE EXISTS, or use the UPDATE … FROM form, which only touches rows the join finds.',
    practice: [326],
  },
  {
    id: 'delete',
    kind: 'DML',
    h2: 'DELETE: remove rows, and check before you do',
    what: 'DELETE removes the rows its WHERE picks. Run the same WHERE as a SELECT COUNT(*) first: the number it returns is the number of rows you are about to lose.',
    steps: [
      {
        kind: 'right',
        label: 'First, count what the WHERE picks',
        sql: '',
        check: "SELECT COUNT(*) AS to_delete FROM reviews WHERE review_date < '2024-02-05';",
        result: { columns: ['to_delete'], rows: [[5]] },
      },
      {
        kind: 'right',
        label: 'Then delete exactly those rows',
        sql: "DELETE FROM reviews WHERE review_date < '2024-02-05';",
        check: 'SELECT COUNT(*) AS reviews_left FROM reviews;',
        result: { columns: ['reviews_left'], rows: [[13]] },
      },
      {
        kind: 'trap',
        label: 'A DELETE whose WHERE was lost',
        sql: 'DELETE FROM reviews;',
        check: 'SELECT COUNT(*) AS reviews_left FROM reviews;',
        result: { columns: ['reviews_left'], rows: [[0]] },
      },
      {
        kind: 'safety',
        label: 'The safety net: inside a transaction, ROLLBACK undoes it',
        sql: 'BEGIN;\nDELETE FROM reviews;\nROLLBACK;',
        check: 'SELECT COUNT(*) AS reviews_left FROM reviews;',
        result: { columns: ['reviews_left'], rows: [[18]] },
      },
    ],
    trap: 'A DELETE with no WHERE is valid SQL and empties the table: all 18 reviews are gone, with no warning. Count first, and on a database you cannot rebuild, run the DELETE inside BEGIN so ROLLBACK can still take it back. The other silent DELETE bug is a NOT IN over a list holding a NULL, which removes nothing at all.',
    trapLink: { href: '/sql-not-in-null/', text: 'Why NOT IN with a NULL matches nothing' },
    practice: [327, 356, 358],
  },
  {
    id: 'upsert',
    kind: 'DML',
    h2: 'UPSERT: insert, or update the row that is already there',
    what: 'INSERT … ON CONFLICT (column) DO UPDATE inserts each row, and when one would break a PRIMARY KEY or UNIQUE constraint it updates the existing row instead. `excluded` names the row that tried to go in.',
    setup: 'CREATE TABLE customer_tier (customer_id INTEGER PRIMARY KEY, membership TEXT NOT NULL);\nINSERT INTO customer_tier SELECT customer_id, membership FROM customers WHERE customer_id <= 3;',
    steps: [
      {
        kind: 'right',
        label: 'Customer 2 moves to Gold, customer 4 is new',
        sql: "INSERT INTO customer_tier (customer_id, membership)\nVALUES (2, 'Gold'), (4, 'Silver')\nON CONFLICT (customer_id) DO UPDATE SET membership = excluded.membership;",
        check: 'SELECT customer_id, membership FROM customer_tier ORDER BY customer_id;',
        result: { columns: ['customer_id', 'membership'], rows: [[1, 'Gold'], [2, 'Gold'], [3, 'Gold'], [4, 'Silver']] },
      },
      {
        kind: 'trap',
        label: 'A conflict target with no UNIQUE constraint behind it',
        sql: "INSERT INTO customer_tier (customer_id, membership)\nVALUES (2, 'Gold'), (4, 'Silver')\nON CONFLICT (membership) DO UPDATE SET membership = excluded.membership;",
        error: 'ON CONFLICT clause does not match any PRIMARY KEY or UNIQUE constraint',
      },
    ],
    trap: 'The column in ON CONFLICT ( … ) must be the one a PRIMARY KEY or UNIQUE constraint guards; that is the only way the database knows two rows are “the same row”. Point it anywhere else and the whole statement fails. To add to a stored value instead of replacing it, write SET col = col + excluded.col.',
    practice: [328, 359],
  },
  {
    id: 'create-table',
    kind: 'DDL',
    h2: 'CREATE TABLE with constraints: a table that refuses bad rows',
    what: 'Constraints make the table check every row it is given: PRIMARY KEY and UNIQUE for duplicates, NOT NULL for missing values, CHECK for a rule, REFERENCES for a row that must exist in another table. A foreign key has to point at a PRIMARY KEY or UNIQUE column; our practice copy of `reviews` declares neither, so the setup adds one.',
    setup: 'CREATE UNIQUE INDEX reviews_review_id ON reviews (review_id);',
    steps: [
      {
        kind: 'right',
        label: 'Foreign keys on, then a flag for a review that does not exist',
        sql: "PRAGMA foreign_keys = ON;\nCREATE TABLE review_flags (\n  flag_id INTEGER PRIMARY KEY,\n  review_id INTEGER NOT NULL REFERENCES reviews (review_id),\n  reason TEXT NOT NULL CHECK (reason IN ('spam', 'abuse', 'off-topic'))\n);\nINSERT INTO review_flags (flag_id, review_id, reason) VALUES (1, 999, 'spam');",
        error: 'FOREIGN KEY constraint failed',
      },
      {
        kind: 'right',
        label: 'A reason the CHECK does not allow',
        sql: "PRAGMA foreign_keys = ON;\nCREATE TABLE review_flags (\n  flag_id INTEGER PRIMARY KEY,\n  review_id INTEGER NOT NULL REFERENCES reviews (review_id),\n  reason TEXT NOT NULL CHECK (reason IN ('spam', 'abuse', 'off-topic'))\n);\nINSERT INTO review_flags (flag_id, review_id, reason) VALUES (2, 9, 'boring');",
        error: 'CHECK constraint failed',
      },
      {
        kind: 'trap',
        label: 'The same table and row, foreign keys left off',
        sql: "CREATE TABLE review_flags (\n  flag_id INTEGER PRIMARY KEY,\n  review_id INTEGER NOT NULL REFERENCES reviews (review_id),\n  reason TEXT NOT NULL CHECK (reason IN ('spam', 'abuse', 'off-topic'))\n);\nINSERT INTO review_flags (flag_id, review_id, reason) VALUES (1, 999, 'spam');",
        check: 'SELECT flag_id, review_id, reason FROM review_flags;',
        result: { columns: ['flag_id', 'review_id', 'reason'], rows: [[1, 999, 'spam']] },
      },
    ],
    trap: 'SQLite accepts a REFERENCES clause and then ignores it until the connection runs PRAGMA foreign_keys = ON, so a flag for review 999 goes in. PostgreSQL, and MySQL on InnoDB, always enforce a foreign key; in SQLite, turn it on per connection.',
    practice: [329],
  },
  {
    id: 'alter-table',
    kind: 'DDL',
    h2: 'ALTER TABLE ADD COLUMN, then the backfill',
    what: 'ALTER TABLE … ADD COLUMN adds a column to every existing row, holding its DEFAULT, or NULL when there is none. A new column that needs real values takes a second statement: an UPDATE that fills it, the backfill.',
    steps: [
      {
        kind: 'right',
        label: 'Add a review count to customers, then fill it',
        sql: 'ALTER TABLE customers ADD COLUMN review_count INTEGER NOT NULL DEFAULT 0;\nUPDATE customers\nSET review_count = (SELECT COUNT(*) FROM reviews r\n                    WHERE r.customer_id = customers.customer_id);',
        check: 'SELECT review_count, COUNT(*) AS customers FROM customers GROUP BY review_count ORDER BY review_count;',
        result: { columns: ['review_count', 'customers'], rows: [[0, 8], [2, 6], [3, 2]] },
      },
      {
        kind: 'trap',
        label: 'The column added, the backfill forgotten',
        sql: 'ALTER TABLE customers ADD COLUMN review_count INTEGER NOT NULL DEFAULT 0;',
        check: 'SELECT review_count, COUNT(*) AS customers FROM customers GROUP BY review_count ORDER BY review_count;',
        result: { columns: ['review_count', 'customers'], rows: [[0, 16]] },
      },
      {
        kind: 'trap',
        label: 'NOT NULL with no DEFAULT',
        sql: 'ALTER TABLE customers ADD COLUMN review_count INTEGER NOT NULL;',
        error: 'Cannot add a NOT NULL column with default value NULL',
      },
    ],
    trap: 'After the ALTER alone, every customer reads 0 reviews. That 0 looks like data and is not: eight customers have written reviews. A DEFAULT keeps old rows valid; only the backfill makes them true. And SQLite refuses a NOT NULL column with no DEFAULT outright, because the existing rows would have nothing to hold.',
    practice: [357],
  },
  {
    id: 'create-index',
    kind: 'DDL',
    h2: 'CREATE INDEX: when the index is used, and when it is not',
    what: 'An index keeps a column’s values sorted with a pointer to each row, so a filter on it can jump to the rows instead of reading the whole table. EXPLAIN QUERY PLAN shows which one SQLite chose: SEARCH uses an index, SCAN reads every row.',
    setup: 'CREATE INDEX reviews_product_date ON reviews (product, review_date);',
    steps: [
      {
        kind: 'right',
        label: 'Filter on the first column of the index, then the second',
        sql: '',
        check: "EXPLAIN QUERY PLAN\nSELECT review_id, stars FROM reviews\nWHERE product = 'Laptop Pro' AND review_date >= '2024-02-07';",
        result: { columns: ['detail'], rows: [['SEARCH reviews USING INDEX reviews_product_date (product=? AND review_date>?)']] },
      },
      {
        kind: 'trap',
        label: 'Filter on the second column alone',
        sql: '',
        check: "EXPLAIN QUERY PLAN\nSELECT review_id, stars FROM reviews\nWHERE review_date >= '2024-02-07';",
        result: { columns: ['detail'], rows: [['SCAN reviews']] },
      },
    ],
    trap: 'A two-column index is sorted by its first column, then by the second inside each value of the first. A filter on review_date alone cannot use it, like a phone book sorted by surname cannot find everyone called Anna. Put the column you filter on with = first, the range column after it.',
    trapLink: { href: '/sql-query-optimizer/', text: 'Check a slow query with the free SQL query optimizer' },
    practice: [355],
  },
];

export const DDL_DML_DIALECT = 'Everything here runs on SQLite. INSERT, UPDATE, DELETE and CREATE TABLE are written the same way in PostgreSQL, MySQL and Snowflake. The upsert is where they part: PostgreSQL uses the same ON CONFLICT … DO UPDATE, MySQL writes ON DUPLICATE KEY UPDATE, and SQL Server, Snowflake and BigQuery use MERGE.';

/** FAQ, plain text (the visible copy and the JSON-LD are the same strings). */
export function ddlDmlFaq({ freeSolves, hasLockedHard }) {
  return [
    ['What is the difference between DDL and DML?', 'DDL (data definition language) changes the structure: CREATE TABLE, ALTER TABLE, CREATE INDEX, DROP. DML (data manipulation language) changes the rows inside it: INSERT, UPDATE, DELETE and the upsert. A SELECT reads data and changes neither.'],
    ['How are DDL and DML practice questions graded?', 'On what your tables hold after your statements run, not on a query’s output. Every attempt starts from a fresh copy of the data, so a wrong DELETE costs nothing: run it again. Statements the task does not need, such as DROP TABLE, are refused before anything runs.'],
    ['Can I break the practice database?', 'No. Each run and each submit gets its own fresh copy of the tables, which is thrown away afterwards. Nothing you run changes the data you or anyone else practises on next.'],
    ['Which SQL dialect do the questions use?', DDL_DML_DIALECT],
    ['Are the DDL and DML questions free?', `Easy and Medium ones count toward the ${freeSolves}${hasLockedHard ? '; the Hard one is Pro' : ''}. They count as solves on your profile and do not move a Skillmap axis.`],
  ];
}
