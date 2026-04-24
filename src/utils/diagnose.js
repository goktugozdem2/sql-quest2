// Wrong-answer diagnostics.
//
// When a student submits a query that fails the grader, the existing UX just
// says "wrong, try again." A real SQL tutor looks at WHAT came back, compares
// it to what was expected, and explains the specific gap in plain English:
// - "You returned 12 rows but the expected output has 4. Your query is likely
//   missing a GROUP BY."
// - "Column order is different. Your SELECT lists 'name' before 'department'
//   but the expected output has them in the other order."
// - "Values match but the sort is different. Add ORDER BY to fix."
//
// This utility is a pure function: (userResult, expectedResult) -> diagnosis.
// No React, no DOM. Testable in isolation. Returns a structured diagnosis
// the UI can render however it wants.

/**
 * Produce a structured diagnosis comparing the user's query output to the
 * expected output. Returns null when the two match exactly (success).
 *
 * Result shapes:
 *   user     : { columns: string[], rows: Array<Array<any>> }
 *   expected : { columns: string[], rows: Array<Array<any>> }
 *
 * Diagnosis shape:
 *   {
 *     kind:     'column_count' | 'column_name' | 'row_count' | 'sort_order'
 *             | 'null_mismatch' | 'cell_values' | 'empty_result'
 *             | 'runtime_error' | 'identical',
 *     headline: string,            // one-line summary for the UI header
 *     details:  string,            // one-paragraph explanation
 *     hints:    string[],          // 1-3 concrete actionable nudges
 *     preview:  { userSample, expectedSample }  // optional row-level comparison
 *   }
 */
export function diagnoseResult(user, expected, userError = null) {
  // 1. Runtime error — query didn't execute at all
  if (userError) {
    return {
      kind: 'runtime_error',
      headline: 'Your query threw a SQL error',
      details: `The database couldn't run your query. Error: ${String(userError).slice(0, 200)}`,
      hints: sqlErrorHints(userError),
    };
  }

  // 2. Both empty — user returned nothing, expected also empty (rare but possible)
  if ((!user || !user.rows || user.rows.length === 0) &&
      (!expected || !expected.rows || expected.rows.length === 0)) {
    return {
      kind: 'empty_result',
      headline: 'Your query returned no rows',
      details: 'Both your query and the solution produce zero rows. If the challenge expects data, your FROM table or WHERE clause is probably filtering everything out.',
      hints: [
        'Check that your table name matches the schema exactly (case-sensitive in some setups).',
        'Remove your WHERE clause temporarily to see if the table has any data.',
        'Look at the Expected Output preview to see how many rows you should return.',
      ],
    };
  }

  // 3. User returned nothing but expected has rows — total miss
  if (!user || !user.rows || user.rows.length === 0) {
    return {
      kind: 'empty_result',
      headline: 'Your query returned no rows',
      details: `Expected ${expected.rows.length} row${expected.rows.length === 1 ? '' : 's'} but your query returned none. Your WHERE clause or JOIN is filtering out everything.`,
      hints: [
        'Remove your WHERE clause and re-run. If you suddenly get rows, your filter is too strict.',
        'If you used JOIN, try LEFT JOIN to see what matches vs misses.',
        'Check column names — a typo in a WHERE clause silently matches nothing.',
      ],
    };
  }

  // 4. Column count mismatch
  if (user.columns.length !== expected.columns.length) {
    return {
      kind: 'column_count',
      headline: `Wrong number of columns — expected ${expected.columns.length}, got ${user.columns.length}`,
      details: `The grader compares column-by-column. Your SELECT returned ${user.columns.length} column${user.columns.length === 1 ? '' : 's'} but the expected output has ${expected.columns.length}. Re-read the challenge description — it usually lists every column you need.`,
      hints: [
        `Expected columns (in order): ${expected.columns.join(', ')}`,
        `Your columns: ${user.columns.join(', ')}`,
        user.columns.length < expected.columns.length
          ? 'You\'re missing columns. Add them to your SELECT.'
          : 'You have extra columns. Remove the ones not asked for.',
      ],
    };
  }

  // 5. Column names differ (same count, different names OR different order)
  const namesMatch = user.columns.every((c, i) => c === expected.columns[i]);
  if (!namesMatch) {
    const diffs = [];
    for (let i = 0; i < user.columns.length; i++) {
      if (user.columns[i] !== expected.columns[i]) {
        diffs.push(`position ${i + 1}: expected "${expected.columns[i]}", got "${user.columns[i]}"`);
      }
    }
    return {
      kind: 'column_name',
      headline: 'Column names or order don\'t match',
      details: `You have the right number of columns, but the names or positions are different. The grader matches exactly — alias with AS to rename, or reorder your SELECT to match.`,
      hints: [
        `Expected order: ${expected.columns.join(', ')}`,
        `Your order: ${user.columns.join(', ')}`,
        diffs.length <= 3
          ? `Differences: ${diffs.slice(0, 3).join(' · ')}`
          : `${diffs.length} columns differ — check your SELECT order and aliases.`,
      ],
    };
  }

  // 6. Row count mismatch
  if (user.rows.length !== expected.rows.length) {
    const extra = user.rows.length > expected.rows.length;
    return {
      kind: 'row_count',
      headline: `Wrong number of rows — expected ${expected.rows.length}, got ${user.rows.length}`,
      details: extra
        ? `You returned ${user.rows.length - expected.rows.length} extra row${user.rows.length - expected.rows.length === 1 ? '' : 's'}. Likely missing a GROUP BY, WHERE, HAVING, or DISTINCT.`
        : `You're missing ${expected.rows.length - user.rows.length} row${expected.rows.length - user.rows.length === 1 ? '' : 's'}. Likely a WHERE clause that's filtering out too many rows, or a JOIN losing matches.`,
      hints: extra
        ? [
            'If the challenge says "per category", you need GROUP BY category.',
            'If you expect unique values, try SELECT DISTINCT or add a HAVING filter.',
            'Check for implicit cross-joins — forgetting an ON clause in JOIN multiplies rows.',
          ]
        : [
            'If you used INNER JOIN, try LEFT JOIN — you may be filtering out rows with NULL matches.',
            'Check your WHERE conditions — an AND chain can eliminate more rows than intended.',
            'NULL values: WHERE column = NULL is always false. Use IS NULL.',
          ],
    };
  }

  // At this point: same columns in same order, same row count.
  // Now check if the VALUES match.

  // 7. Sort order issue — same rows, different order
  const userValues = JSON.stringify(user.rows);
  const expectedValues = JSON.stringify(expected.rows);
  if (userValues !== expectedValues) {
    // Check if the multisets are equal (same rows, different order)
    const userSorted = JSON.stringify([...user.rows].sort());
    const expectedSorted = JSON.stringify([...expected.rows].sort());

    if (userSorted === expectedSorted) {
      return {
        kind: 'sort_order',
        headline: 'All your rows are correct — just sorted differently',
        details: 'The values match exactly, but the order differs. The grader is strict about order. Add or fix your ORDER BY to match the challenge\'s required sort.',
        hints: [
          'Re-read the challenge description — it usually says "Sort by X descending" or similar.',
          'If sorting by a computed column (COUNT, SUM, etc.), reference it in ORDER BY.',
          'Watch for tie-breakers: "Sort by total DESC, then name ASC" means two ORDER BY clauses.',
        ],
      };
    }

    // 8. NULL mismatch — user has NULL where expected has a value (or vice versa)
    let nullMismatchCount = 0;
    let nonNullMismatchCount = 0;
    const maxCheck = Math.min(user.rows.length, expected.rows.length);
    for (let i = 0; i < maxCheck; i++) {
      for (let j = 0; j < user.columns.length; j++) {
        const uv = user.rows[i][j];
        const ev = expected.rows[i][j];
        const uNull = (uv === null || uv === undefined);
        const eNull = (ev === null || ev === undefined);
        if (uNull !== eNull) nullMismatchCount++;
        else if (!uNull && uv !== ev) nonNullMismatchCount++;
      }
    }

    if (nullMismatchCount > 0 && nullMismatchCount >= nonNullMismatchCount) {
      return {
        kind: 'null_mismatch',
        headline: 'Your NULL handling is off',
        details: `${nullMismatchCount} cell${nullMismatchCount === 1 ? '' : 's'} differ because of NULL handling. You\'re returning NULL where a value is expected, or vice versa.`,
        hints: [
          'SUM() and AVG() skip NULLs — use COALESCE(column, 0) to treat NULL as 0.',
          'COUNT(column) skips NULLs; COUNT(*) does not.',
          'If you need to include NULL groups in GROUP BY output, they should appear naturally. If missing, a WHERE clause probably excluded them.',
        ],
      };
    }

    // 9. Cell values wrong — same shape, same columns, same row count, same sort, values differ
    // Show a sample of the diff for user insight.
    const firstDiffRow = findFirstDifferingRow(user.rows, expected.rows);
    const preview = firstDiffRow !== -1 ? {
      rowIndex: firstDiffRow,
      userRow: user.rows[firstDiffRow],
      expectedRow: expected.rows[firstDiffRow],
      columns: user.columns,
    } : null;

    return {
      kind: 'cell_values',
      headline: 'Right shape, but the values are different',
      details: 'Your columns, row count, and order all match — but the actual values differ. Look at the first differing row below. Usually this is a calculation issue, a missing CASE branch, or a wrong aggregation.',
      hints: [
        'If averaging, AVG() skips NULLs — use SUM()/COUNT(*) if you want NULLs as 0.',
        'If counting, COUNT(column) skips NULLs but COUNT(*) counts all rows.',
        'ROUND precision matters: ROUND(x, 1) vs ROUND(x, 2) gives different values.',
        'Check your CASE WHEN branches — did you cover all the conditions in the challenge?',
      ],
      preview,
    };
  }

  // 10. Identical — shouldn't happen in the wrong path, but handle gracefully
  return {
    kind: 'identical',
    headline: 'Your output matches the expected result',
    details: 'If this is showing after a failed submit, something unusual happened — try submitting again.',
    hints: [],
  };
}

/**
 * Find the index of the first row where user[i] differs from expected[i].
 * Returns -1 if all rows match up to the min length.
 */
function findFirstDifferingRow(userRows, expectedRows) {
  const minLen = Math.min(userRows.length, expectedRows.length);
  for (let i = 0; i < minLen; i++) {
    if (JSON.stringify(userRows[i]) !== JSON.stringify(expectedRows[i])) {
      return i;
    }
  }
  return -1;
}

/**
 * Produce targeted hints for common SQL error messages. SQLite's error
 * text is obscure — translating to plain English saves students 10-30
 * minutes of Googling per error.
 */
function sqlErrorHints(error) {
  const msg = String(error).toLowerCase();
  const hints = [];

  if (msg.includes('no such column')) {
    hints.push('A column name in your query doesn\'t exist. Check spelling and table aliases.');
    hints.push('If using JOINs, remember columns need table prefixes (e.g. t1.column1).');
  } else if (msg.includes('no such table')) {
    hints.push('A table name is wrong. Look at the schema panel for the exact table name.');
  } else if (msg.includes('syntax error') || msg.includes('near ')) {
    hints.push('SQL syntax error — usually a missing comma, unbalanced parenthesis, or misspelled keyword.');
    hints.push('Common culprits: missing FROM, forgotten quotes around strings, unclosed CASE WHEN.');
  } else if (msg.includes('ambiguous')) {
    hints.push('A column name exists in multiple tables. Qualify it with a table alias (e.g. t1.column1).');
  } else if (msg.includes('misuse of aggregate')) {
    hints.push('Aggregates like COUNT, SUM, AVG must appear in SELECT or HAVING, not in WHERE.');
    hints.push('If you need to filter on an aggregate, use HAVING after GROUP BY.');
  } else if (msg.includes('group by')) {
    hints.push('Every non-aggregated column in SELECT must also appear in GROUP BY.');
  } else {
    hints.push('Read the error carefully — it usually points at the offending keyword or column.');
  }

  return hints.slice(0, 3);
}

/**
 * One-line summary of the diagnosis for compact displays (toast, tooltip).
 */
export function diagnosisShort(diagnosis) {
  if (!diagnosis) return '';
  return diagnosis.headline;
}

export default diagnoseResult;
