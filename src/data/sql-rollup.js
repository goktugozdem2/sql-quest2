// /sql-rollup-interview-questions/ (2026-11-22). GSC, 28 days to 2026-11-22:
// "rollup interview questions" had 657 impressions, 0 clicks, position 8.9,
// and Google showed /questions/recursive-team-size-rollup/ for it — a
// recursive-CTE question page that does not answer the query. No page on the
// site targeted rollups. Ledger: "a page for rollup interview questions".
//
// Rendered by scripts/build-rollup-page.mjs to src/sql-rollup-interview-questions.html
// (then copied to public/ by build-static-pages.js like every src page).
//
// Rules this content keeps (CLAUDE.md, SEO operating rules):
//   - every SQLite query here runs on the bank's own dataset in
//     tests/sql-rollup.test.js, which pins the rows the page shows;
//   - no query is a bank challenge's reference solution or a mock's answer
//     (the same test compares them token for token);
//   - no claim about how often anything is asked, and no company names.
//
// The `standard` queries (GROUP BY ROLLUP / CUBE / GROUPING SETS) cannot run
// in SQLite, the app's engine. They were run once on PostgreSQL 18 with the
// same rows loaded (2026-11-22, by hand) and returned the same result as the
// SQLite form beside them; the test pins that each one uses the clause its
// question is about, and that the SQLite form does not.

export const ROLLUP_SLUG = 'sql-rollup-interview-questions';
export const ROLLUP_PUBLISHED = '2026-11-22';
export const ROLLUP_TITLE = 'SQL Rollup Interview Questions With Worked Answers | SQLQuest.app';
export const ROLLUP_H1 = 'SQL rollup interview questions: subtotals, grand totals, ROLLUP and CUBE';
export const ROLLUP_DESCRIPTION = 'Five SQL rollup interview questions worked on real tables: subtotals and grand totals with ROLLUP, CUBE and GROUPING SETS, the UNION ALL form, and a tree rollup.';
export const ROLLUP_APP_SRC = 'rollup-interview-questions';
/** The challenge the page's Practice button opens: an Easy, playable free — a
 * share of the grand total. (Not 27, the bank's UNION ALL total-row question:
 * its tables are employees + customers but its dataset is ecommerce, which has
 * no employees table, so on a cold start the app cannot compute its expected
 * result — seen 2026-11-22 in the visual check, reported, not fixed here.) */
export const ROLLUP_CTA_CHALLENGE = 169;

/** What each grouping clause produces for (a, b). */
export const GROUPING_CLAUSES = [
  ['GROUP BY ROLLUP (a, b)', '(a, b), (a), ()', 'Detail rows, a subtotal per a, and the grand total. The order of the columns sets the hierarchy.'],
  ['GROUP BY CUBE (a, b)', '(a, b), (a), (b), ()', 'Every combination: subtotals in both directions, like the margins of a cross-tab.'],
  ['GROUP BY GROUPING SETS ((a), (b), ())', '(a), (b), ()', 'Exactly the groupings you list, and nothing else.'],
];

/** Which engines have which clause. Only syntax, no claim about anyone's interview. */
export const DIALECTS = [
  ['PostgreSQL, SQL Server, Oracle, Snowflake', '`ROLLUP`, `CUBE`, `GROUPING SETS` and `GROUPING()`, written as on this page.'],
  ['MySQL', 'Writes ROLLUP as `GROUP BY a, b WITH ROLLUP`.'],
  ['SQLite', 'None of them. Build each level with its own GROUP BY and stack the levels with UNION ALL. SQL Quest runs SQLite in your browser, so every result table on this page comes from the UNION ALL form.'],
];

export const ROLLUP_QUESTIONS = [
  {
    id: 'grand-total',
    h: 'Revenue per category, with a grand total row',
    dataset: 'ecommerce',
    task: 'From `orders`, show the revenue of completed orders for each `category`, and one more row with the revenue of all categories together. Put the total last.',
    clause: 'ROLLUP',
    standard: "SELECT CASE WHEN GROUPING(category) = 1 THEN 'All categories'\n            ELSE category END AS category,\n       ROUND(SUM(total), 2) AS revenue\nFROM orders\nWHERE status = 'completed'\nGROUP BY ROLLUP (category)\nORDER BY GROUPING(category), category;",
    sqlite: "WITH done AS (\n  SELECT category, total FROM orders WHERE status = 'completed'\n)\nSELECT category, revenue FROM (\n  SELECT category, ROUND(SUM(total), 2) AS revenue, 0 AS is_total\n  FROM done\n  GROUP BY category\n  UNION ALL\n  SELECT 'All categories', ROUND(SUM(total), 2), 1\n  FROM done\n)\nORDER BY is_total, category;",
    columns: ['category', 'revenue'],
    rows: [['Electronics', 4799.75], ['Furniture', 3171.76], ['All categories', 7971.51]],
    why: [
      'ROLLUP with one column adds exactly one row: the group-by-nothing row, whose `category` is NULL. `GROUPING(category)` is 1 on that row and 0 on the others, which is how the query labels it and sorts it last.',
      'The SQLite form says the same thing in two halves: one SELECT per level, stacked with UNION ALL. The filter lives in the CTE so both halves read the same 37 completed orders; filter only one half and the total stops matching the rows above it.',
    ],
  },
  {
    id: 'subtotals',
    h: 'Monthly revenue by category, with a subtotal per month',
    dataset: 'ecommerce',
    task: 'Show completed-order revenue for each month and category, a subtotal row after each month, and a grand total at the bottom.',
    clause: 'ROLLUP',
    standard: "WITH m AS (\n  SELECT SUBSTR(order_date, 1, 7) AS month, category, total\n  FROM orders\n  WHERE status = 'completed'\n)\nSELECT CASE WHEN GROUPING(month) = 1 THEN 'All months' ELSE month END AS month,\n       CASE WHEN GROUPING(category) = 1 THEN 'All categories'\n            ELSE category END AS category,\n       ROUND(SUM(total), 2) AS revenue\nFROM m\nGROUP BY ROLLUP (month, category)\nORDER BY GROUPING(month), month, GROUPING(category), category;",
    sqlite: "WITH m AS (\n  SELECT SUBSTR(order_date, 1, 7) AS month, category, total\n  FROM orders\n  WHERE status = 'completed'\n)\nSELECT month, category, revenue FROM (\n  SELECT month, category, ROUND(SUM(total), 2) AS revenue, 0 AS lvl\n  FROM m GROUP BY month, category\n  UNION ALL\n  SELECT month, 'All categories', ROUND(SUM(total), 2), 1\n  FROM m GROUP BY month\n  UNION ALL\n  SELECT 'All months', 'All categories', ROUND(SUM(total), 2), 2\n  FROM m\n)\nORDER BY lvl = 2, month, lvl, category;",
    columns: ['month', 'category', 'revenue'],
    rows: [
      ['2024-01', 'Electronics', 2749.88], ['2024-01', 'Furniture', 1721.93], ['2024-01', 'All categories', 4471.81],
      ['2024-02', 'Electronics', 2049.87], ['2024-02', 'Furniture', 1449.83], ['2024-02', 'All categories', 3499.7],
      ['All months', 'All categories', 7971.51],
    ],
    why: [
      '`ROLLUP (month, category)` is a hierarchy read left to right: (month, category), then (month), then (). So you get a subtotal per month but no subtotal per category across months. Swap the two columns and you get the other hierarchy.',
      'Three levels means three SELECTs in SQLite. The `lvl` column is what keeps each subtotal under its own month and the grand total at the bottom; sorting on the label text alone would put "All categories" above "Electronics".',
    ],
  },
  {
    id: 'cube',
    h: 'The same report with totals in both directions',
    dataset: 'ecommerce',
    task: 'Now the report also needs each category\'s revenue across both months, as a cross-tab would show in its bottom margin.',
    clause: 'CUBE',
    standard: "WITH m AS (\n  SELECT SUBSTR(order_date, 1, 7) AS month, category, total\n  FROM orders\n  WHERE status = 'completed'\n)\nSELECT CASE WHEN GROUPING(month) = 1 THEN 'All months' ELSE month END AS month,\n       CASE WHEN GROUPING(category) = 1 THEN 'All categories'\n            ELSE category END AS category,\n       ROUND(SUM(total), 2) AS revenue\nFROM m\nGROUP BY CUBE (month, category)\nORDER BY GROUPING(month), month, GROUPING(category), category;",
    sqlite: "WITH m AS (\n  SELECT SUBSTR(order_date, 1, 7) AS month, category, total\n  FROM orders\n  WHERE status = 'completed'\n)\nSELECT month, category, revenue FROM (\n  SELECT month, category, ROUND(SUM(total), 2) AS revenue, 0 AS g_month, 0 AS g_cat\n  FROM m GROUP BY month, category\n  UNION ALL\n  SELECT month, 'All categories', ROUND(SUM(total), 2), 0, 1\n  FROM m GROUP BY month\n  UNION ALL\n  SELECT 'All months', category, ROUND(SUM(total), 2), 1, 0\n  FROM m GROUP BY category\n  UNION ALL\n  SELECT 'All months', 'All categories', ROUND(SUM(total), 2), 1, 1\n  FROM m\n)\nORDER BY g_month, month, g_cat, category;",
    columns: ['month', 'category', 'revenue'],
    rows: [
      ['2024-01', 'Electronics', 2749.88], ['2024-01', 'Furniture', 1721.93], ['2024-01', 'All categories', 4471.81],
      ['2024-02', 'Electronics', 2049.87], ['2024-02', 'Furniture', 1449.83], ['2024-02', 'All categories', 3499.7],
      ['All months', 'Electronics', 4799.75], ['All months', 'Furniture', 3171.76], ['All months', 'All categories', 7971.51],
    ],
    why: [
      'CUBE over two columns is four groupings: both, month only, category only, none. That is two more rows than the ROLLUP above, the per-category totals, and nothing else changes.',
      'In SQLite each grouping is one more UNION ALL branch, so CUBE over n columns costs 2ⁿ branches. The two flag columns play the part of `GROUPING()`: they sort the rows and never appear in the output.',
    ],
  },
  {
    id: 'grouping-sets',
    h: 'Headcount by department and by hire year, in one result',
    dataset: 'employees',
    task: 'From `employees`, return headcount and payroll per `department`, per hire year, and for the whole company, in one result, without the department-by-year combinations.',
    clause: 'GROUPING SETS',
    standard: "WITH e AS (\n  SELECT department, SUBSTR(hire_date, 1, 4) AS hire_year, salary\n  FROM employees\n)\nSELECT CASE WHEN GROUPING(department) = 0 THEN 'department'\n            WHEN GROUPING(hire_year) = 0 THEN 'hire_year'\n            ELSE 'total' END AS dimension,\n       CASE WHEN GROUPING(department) = 0 THEN department\n            WHEN GROUPING(hire_year) = 0 THEN hire_year\n            ELSE 'All employees' END AS grp,\n       COUNT(*) AS headcount,\n       SUM(salary) AS payroll\nFROM e\nGROUP BY GROUPING SETS ((department), (hire_year), ())\nORDER BY dimension, grp;",
    sqlite: "WITH e AS (\n  SELECT department, SUBSTR(hire_date, 1, 4) AS hire_year, salary\n  FROM employees\n)\nSELECT 'department' AS dimension, department AS grp,\n       COUNT(*) AS headcount, SUM(salary) AS payroll\nFROM e GROUP BY department\nUNION ALL\nSELECT 'hire_year', hire_year, COUNT(*), SUM(salary)\nFROM e GROUP BY hire_year\nUNION ALL\nSELECT 'total', 'All employees', COUNT(*), SUM(salary)\nFROM e\nORDER BY dimension, grp;",
    columns: ['dimension', 'grp', 'headcount', 'payroll'],
    rows: [
      ['department', 'Engineering', 18, 1567000], ['department', 'Finance', 7, 534000], ['department', 'HR', 8, 479000],
      ['department', 'Marketing', 8, 490000], ['department', 'Sales', 9, 568000],
      ['hire_year', '2016', 1, 80000], ['hire_year', '2017', 4, 403000], ['hire_year', '2018', 5, 485000],
      ['hire_year', '2019', 10, 842000], ['hire_year', '2020', 12, 826000], ['hire_year', '2021', 11, 640000],
      ['hire_year', '2022', 7, 362000],
      ['total', 'All employees', 50, 3638000],
    ],
    why: [
      'GROUPING SETS is the general form: ROLLUP and CUBE are shorthands for particular lists of sets. Here neither fits, because the two dimensions are not a hierarchy and the cross of them is not wanted.',
      'The two groupings share no column, so a `dimension` column says which one each row belongs to. In SQLite the three branches can be sorted directly, because the ORDER BY of a UNION ALL may name its output columns.',
    ],
  },
  {
    id: 'tree',
    h: 'A rollup up a tree: payroll under each top-level manager',
    dataset: 'employees',
    task: '`employees.manager_id` points at each person\'s manager. For every person who reports to no one, show how many people sit in their tree (themselves included), the tree\'s payroll, and how many levels it goes down.',
    clause: 'RECURSIVE',
    standard: null,
    sqlite: "WITH RECURSIVE org AS (\n  SELECT emp_id, name AS head, salary, 0 AS depth\n  FROM employees\n  WHERE manager_id IS NULL\n  UNION ALL\n  SELECT e.emp_id, org.head, e.salary, org.depth + 1\n  FROM employees e\n  JOIN org ON e.manager_id = org.emp_id\n)\nSELECT head, COUNT(*) AS people, SUM(salary) AS payroll, MAX(depth) AS levels\nFROM org\nGROUP BY head\nORDER BY payroll DESC;",
    columns: ['head', 'people', 'payroll', 'levels'],
    rows: [
      ['Eva Martinez', 17, 1452000, 2], ['Paul Thompson', 7, 534000, 1], ['Carol Williams', 8, 490000, 1],
      ['Jack Anderson', 8, 479000, 1], ['Grace Lee', 8, 468000, 1], ['Ulysses Cook', 1, 115000, 0],
      ['Jason Roberts', 1, 100000, 0],
    ],
    why: [
      'ROLLUP totals up the columns you group by. A hierarchy stored as a parent pointer has no column for "everyone under this person", so the tree has to be walked first: the anchor starts at the 7 people with no manager, and each round adds the next level down while carrying the head\'s name along. After that it is an ordinary GROUP BY.',
      'The trees do not match the departments. Engineering has 18 people but Eva Martinez\'s tree has 17, because Ulysses Cook reports to no one; Sales has 9 and Grace Lee\'s tree 8, because Jason Roberts reports to no one either. Both answers are right; they answer different questions, so say which one the interviewer asked for.',
      'This query runs unchanged in PostgreSQL. SQL Server and Oracle write plain `WITH`, without `RECURSIVE`. Rolling up to every manager at every level, not only the top, is the harder version: practise it on Recursive Team Size Rollup below.',
    ],
  },
];

/** Every number the prose states, with the query that proves it. */
export const ROLLUP_FACTS = [
  { text: 'the same 37 completed orders', dataset: 'ecommerce', sql: "SELECT COUNT(*) FROM orders WHERE status = 'completed'", expect: 37 },
  { text: 'starts at the 7 people with no manager', dataset: 'employees', sql: 'SELECT COUNT(*) FROM employees WHERE manager_id IS NULL', expect: 7 },
  { text: 'Engineering has 18 people', dataset: 'employees', sql: "SELECT COUNT(*) FROM employees WHERE department = 'Engineering'", expect: 18 },
  { text: 'because Ulysses Cook reports to no one', dataset: 'employees', sql: "SELECT COUNT(*) FROM employees WHERE name = 'Ulysses Cook' AND department = 'Engineering' AND manager_id IS NULL", expect: 1 },
  { text: 'Sales has 9', dataset: 'employees', sql: "SELECT COUNT(*) FROM employees WHERE department = 'Sales'", expect: 9 },
  { text: 'because Jason Roberts reports to no one either', dataset: 'employees', sql: "SELECT COUNT(*) FROM employees WHERE name = 'Jason Roberts' AND department = 'Sales' AND manager_id IS NULL", expect: 1 },
  { text: 'a GROUP BY manager_id over this table already has a NULL group of 7 people', dataset: 'employees', sql: 'SELECT COUNT(*) FROM employees WHERE manager_id IS NULL', expect: 7 },
];

/** Bank challenges to practise on; their question pages link back here. */
export const ROLLUP_PRACTICE = [169, 276, 42, 44, 81];

export const ROLLUP_FAQ = [
  ['What is ROLLUP in SQL?', 'An extension of GROUP BY that adds subtotal rows and a grand total to the same result. GROUP BY ROLLUP (a, b) groups by (a, b), then by (a) alone, then by nothing, and stacks the three. The columns rolled away are NULL on the subtotal rows.'],
  ['What is the difference between ROLLUP and CUBE?', 'ROLLUP follows the column order as a hierarchy: for (a, b) it gives (a, b), (a) and the total. CUBE gives every combination: (a, b), (a), (b) and the total. With two columns CUBE adds the subtotals for b across all values of a.'],
  ['Does SQLite support ROLLUP?', 'No. SQLite has no ROLLUP, CUBE or GROUPING SETS. Write one SELECT per level, each with its own GROUP BY, stack them with UNION ALL, and add a column that sorts the total rows where you want them.'],
  ['How do I tell a subtotal row from a real NULL?', 'Use GROUPING(column): it is 1 when the column was rolled away on that row and 0 when the row really groups by it. COALESCE(column, \'Total\') is not safe, because a column that already holds NULLs gets two rows that look the same: a GROUP BY manager_id over this table already has a NULL group of 7 people.'],
  ['How do I write a rollup in MySQL?', 'GROUP BY a, b WITH ROLLUP gives the same levels as GROUP BY ROLLUP (a, b) in PostgreSQL, SQL Server, Oracle and Snowflake.'],
  ['How do I total up a hierarchy such as an org chart?', 'ROLLUP cannot do it, because the levels are rows linked by a parent column, not columns. Walk the tree with a recursive CTE that carries the root along, then GROUP BY the root, as in the last question on this page.'],
];
