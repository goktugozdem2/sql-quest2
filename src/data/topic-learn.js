// "Learn it, then practise it, then the next step" on two topic pages — the
// pilot of 2026-11-23 (ledger: "learn → practice → next step on two topic
// pages"). scripts/build-topic-learn.mjs renders this into
// src/challenges/<slug>.html between the topic-learn markers; the seven other
// hand-written topic pages are the comparison group and carry none of it.
//
// Why on the practice pages and not as new tutorial pages: the tutorial posts
// rank on pages 2–5 behind W3Schools and GfG (sql-cte-tutorial: 5,848
// impressions, 9 clicks, position 22 in 90 days), while /challenges/
// window-functions/ (position 10, 50 clicks) and /challenges/cte/ (39 clicks)
// already win the click. And SEO rule 1 (Bing index bloat): no new pages.
//
// Every example here runs on its own tiny table. `rows` is what the query
// returns; tests/topic-learn-pilot.test.js runs `setup` + `query` in SQLite
// and fails when they disagree. None of these queries is, or may become, a
// bank challenge's reference solution (tested): the page teaches the idea on
// a table of its own and sends the visitor to the bank to do the real thing.
//
// Wording rules (CLAUDE.md): "a common mistake", never how often anything is
// asked in interviews; counts only through the display-count helpers.

export const TOPIC_LEARN = {
  'window-functions': {
    skill: 'Window Functions',
    noun: 'window function',
    heading: 'Window functions in plain words',
    plain: [
      'A window function computes something across a group of rows (a total, a rank, the previous value) and writes the answer onto every row. <code>GROUP BY</code> folds each group into one row; a window function keeps every row and adds a column.',
      '<code>PARTITION BY</code> says which rows belong together (the window restarts for each group). <code>ORDER BY</code> inside <code>OVER</code> says in what order to walk them, which is what makes a running total or a "previous row" possible.',
    ],
    syntax: 'function_name(column) OVER (\n  PARTITION BY group_column  -- optional: restart for each group\n  ORDER BY sort_column       -- optional: the order inside the group\n)',
    table: 'runs',
    tableNote: 'Weekly running distances for two runners.',
    setup: "CREATE TABLE runs (runner TEXT, week INTEGER, km INTEGER);\nINSERT INTO runs VALUES ('Ana', 1, 5), ('Ana', 2, 8), ('Ana', 3, 6), ('Ben', 1, 10), ('Ben', 2, 7);",
    tableColumns: ['runner', 'week', 'km'],
    tableRows: [['Ana', 1, 5], ['Ana', 2, 8], ['Ana', 3, 6], ['Ben', 1, 10], ['Ben', 2, 7]],
    task: 'For each runner, the distance so far and the change from the week before.',
    query: 'SELECT runner, week, km,\n       SUM(km) OVER (PARTITION BY runner ORDER BY week) AS km_so_far,\n       km - LAG(km) OVER (PARTITION BY runner ORDER BY week) AS change\nFROM runs\nORDER BY runner, week;',
    columns: ['runner', 'week', 'km', 'km_so_far', 'change'],
    rows: [['Ana', 1, 5, 5, null], ['Ana', 2, 8, 13, 3], ['Ana', 3, 6, 19, -2], ['Ben', 1, 10, 10, null], ['Ben', 2, 7, 17, -3]],
    reading: 'Every input row is still there. <code>km_so_far</code> restarts at Ben because of <code>PARTITION BY runner</code>, and <code>change</code> is NULL on each runner\'s first week: <code>LAG</code> has no earlier row to look at.',
    mistake: {
      title: 'Filtering on a window function in WHERE',
      body: '<code>WHERE ROW_NUMBER() OVER (…) = 1</code> fails with "misuse of window function": <code>WHERE</code> runs before any window is computed. Compute the window in a CTE (or a subquery) and filter on it in the outer query.',
      fix: 'WITH ranked AS (\n  SELECT runner, week, km,\n         ROW_NUMBER() OVER (PARTITION BY runner ORDER BY km DESC) AS rn\n  FROM runs\n)\nSELECT runner, week, km\nFROM ranked\nWHERE rn = 1\nORDER BY runner;',
      fixColumns: ['runner', 'week', 'km'],
      fixRows: [['Ana', 2, 8], ['Ben', 1, 10]],
      // No trap page covers this one yet; the ranking page is where the
      // rank-then-filter shape is practised.
      link: { href: '/challenges/ranking-functions/', label: 'Practise rank-then-filter on the ranking functions page' },
    },
  },
  cte: {
    skill: 'Subqueries & CTEs',
    noun: 'CTE',
    heading: 'CTEs in plain words',
    plain: [
      'A CTE (common table expression) gives a query a name for the length of one statement. You write <code>WITH name AS (…)</code> once, and the rest of the statement reads <code>name</code> as if it were a table.',
      'Two things make it worth it: a long query reads top to bottom in steps, and a result you need twice (a total and the average of that total) is computed once and used by name.',
    ],
    syntax: 'WITH first_step AS (\n  SELECT ...\n), second_step AS (\n  SELECT ... FROM first_step   -- a later CTE may read an earlier one\n)\nSELECT ... FROM second_step;',
    table: 'tickets',
    tableNote: 'Support tickets and the minutes each one took.',
    setup: "CREATE TABLE tickets (agent TEXT, minutes INTEGER);\nINSERT INTO tickets VALUES ('Ana', 30), ('Ana', 50), ('Ben', 20), ('Ben', 25), ('Ben', 15), ('Caro', 90);",
    tableColumns: ['agent', 'minutes'],
    tableRows: [['Ana', 30], ['Ana', 50], ['Ben', 20], ['Ben', 25], ['Ben', 15], ['Caro', 90]],
    task: 'The agents whose total minutes are above the average agent\'s total.',
    query: 'WITH per_agent AS (\n  SELECT agent, COUNT(*) AS tickets, SUM(minutes) AS minutes\n  FROM tickets\n  GROUP BY agent\n)\nSELECT agent, tickets, minutes\nFROM per_agent\nWHERE minutes > (SELECT AVG(minutes) FROM per_agent)\nORDER BY minutes DESC;',
    columns: ['agent', 'tickets', 'minutes'],
    rows: [['Caro', 1, 90], ['Ana', 2, 80]],
    reading: '<code>per_agent</code> is used twice: once as the rows to return and once inside the subquery that averages it (80, 60 and 90 average to about 76.7). Without the CTE the <code>GROUP BY</code> would have to be written out in both places.',
    mistake: {
      title: 'Joining two detail tables, then summing',
      body: 'Join orders and refunds to the same customer and every order repeats once per refund, so <code>SUM</code> and <code>COUNT</code> come back multiplied, with no error. Aggregate each table in its own CTE first, then join the totals, one row per key on each side.',
      fix: null,
      link: { href: '/sql-join-fan-out/', label: 'The join fan-out trap, worked through with real numbers' },
    },
  },
};

export const TOPIC_LEARN_SLUGS = Object.keys(TOPIC_LEARN);
