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
    // Compute extra/missing rows by exact-row multiset diff.
    // 'Extra' = rows present in user but not in expected (or in excess of multiplicity).
    // 'Missing' = rows present in expected but not in user.
    const { extraRows, missingRows } = diffRowsAsMultisets(user.rows, expected.rows);
    const preview = (extraRows.length > 0 || missingRows.length > 0) ? {
      extraRows: extraRows.slice(0, 5),   // cap at 5 for UI density
      extraTotal: extraRows.length,
      missingRows: missingRows.slice(0, 5),
      missingTotal: missingRows.length,
      columns: user.columns,
    } : null;
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
      preview,
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
      // Compute position-shift diffs: for each row in user, where would it
      // need to go to land in the expected position? Cap to first 5 mismatched
      // rows for UI density. Stable across duplicate rows (uses first-match).
      const positionDiffs = computePositionDiffs(user.rows, expected.rows).slice(0, 5);
      return {
        kind: 'sort_order',
        headline: 'All your rows are correct — just sorted differently',
        details: 'The values match exactly, but the order differs. The grader is strict about order. Add or fix your ORDER BY to match the challenge\'s required sort.',
        hints: [
          'Re-read the challenge description — it usually says "Sort by X descending" or similar.',
          'If sorting by a computed column (COUNT, SUM, etc.), reference it in ORDER BY.',
          'Watch for tie-breakers: "Sort by total DESC, then name ASC" means two ORDER BY clauses.',
        ],
        preview: positionDiffs.length > 0 ? {
          positionDiffs,
          columns: user.columns,
        } : null,
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
        details: `${nullMismatchCount} cell${nullMismatchCount === 1 ? '' : 's'} differ because of NULL handling. You're returning NULL where a value is expected, or vice versa.`,
        hints: [
          'SUM() and AVG() skip NULLs — use COALESCE(column, 0) to treat NULL as 0.',
          'COUNT(column) skips NULLs; COUNT(*) does not.',
          'If you need to include NULL groups in GROUP BY output, they should appear naturally. If missing, a WHERE clause probably excluded them.',
        ],
      };
    }

    // 9. Cell values wrong — same shape, same columns, same row count, same sort, values differ.
    // Build full per-row diff with column-level flags, then keep backward-
    // compat fields (rowIndex/userRow/expectedRow) pointing at the first.
    const allDiffs = findAllDifferingRows(user.rows, expected.rows);
    const cappedDiffs = allDiffs.slice(0, 5);   // UI shows up to 5
    const firstDiffRow = allDiffs.length > 0 ? allDiffs[0].rowIndex : -1;
    const preview = firstDiffRow !== -1 ? {
      // Back-compat: callers/tests still reference these top-level fields.
      rowIndex: firstDiffRow,
      userRow: user.rows[firstDiffRow],
      expectedRow: expected.rows[firstDiffRow],
      columns: user.columns,
      // V1 enhancement: every differing row + which columns differ on each.
      rowDiffs: cappedDiffs,
      totalDiffRows: allDiffs.length,
    } : null;

    const headline = allDiffs.length === 1
      ? 'Right shape, but 1 row has wrong values'
      : `Right shape, but ${allDiffs.length} rows have wrong values`;

    // Smart pattern detection — added May 2026 after Elena hit the
    // SQLite integer-division trap on Challenge #214 and reported it as
    // "the rounds are wrong." When the majority of mismatched cells show
    // user=floor(expected), it's almost certainly that pattern.
    const baseHints = [
      'If averaging, AVG() skips NULLs — use SUM()/COUNT(*) if you want NULLs as 0.',
      'If counting, COUNT(column) skips NULLs but COUNT(*) counts all rows.',
      'ROUND precision matters: ROUND(x, 1) vs ROUND(x, 2) gives different values.',
      'Check your CASE WHEN branches — did you cover all the conditions in the challenge?',
    ];
    const integerDivPattern = detectIntegerDivisionPattern(allDiffs);
    const hints = integerDivPattern
      ? [
          '⚠️ Looks like SQLite integer division. Your values appear to be floor()-ed versions of the expected values — fractional parts dropped. In SQLite, `X / Y` returns an integer when BOTH operands are integers. Fix: add `.0` to one side. Example: `SUM(amount) / 1000000.0` (not `/ 1000000`).',
          'Same trap with `100` for percentages: write `100.0 * SUM(x) / COUNT(*)` so the multiplication produces a float before division.',
          ...baseHints,
        ]
      : baseHints;

    return {
      kind: 'cell_values',
      headline,
      details: integerDivPattern
        ? 'Your columns, row count, and order all match — but the values look like SQLite did integer division. Read the first hint below.'
        : 'Your columns, row count, and order all match — but the actual values differ. Each differing row is shown below with the wrong cells highlighted. Usually this is a calculation issue, a missing CASE branch, or a wrong aggregation.',
      hints,
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
 * Find every row index where userRows[i] differs from expectedRows[i],
 * with per-column boolean flags marking which cells are wrong.
 *
 * Returns: Array<{ rowIndex, userRow, expectedRow, diffCols }>
 *   diffCols[j] = true when userRow[j] differs from expectedRow[j]
 *
 * Used by the V1 wrong-answer diff visualization (Elena's "I have the
 * output but can't find the mistake" feedback, May 2026).
 */
function findAllDifferingRows(userRows, expectedRows) {
  const out = [];
  const minLen = Math.min(userRows.length, expectedRows.length);
  for (let i = 0; i < minLen; i++) {
    if (JSON.stringify(userRows[i]) !== JSON.stringify(expectedRows[i])) {
      const userRow = userRows[i];
      const expectedRow = expectedRows[i];
      const diffCols = userRow.map((_, j) =>
        JSON.stringify(userRow[j]) !== JSON.stringify(expectedRow[j])
      );
      out.push({ rowIndex: i, userRow, expectedRow, diffCols });
    }
  }
  return out;
}

/**
 * Heuristic: the majority of mismatched cells follow user = floor(expected),
 * meaning the user's query did integer division and dropped the fractional
 * part. Common cause: writing `1000000` instead of `1000000.0`, or `100`
 * instead of `100.0` in a percentage formula.
 *
 * Returns true when at least 50% of numeric mismatches match the pattern
 * AND there's at least one mismatch. Conservative — false positives here
 * would distract from the real cause, so we require strong signal.
 *
 * Added May 2026 after Elena hit this on Challenge #214 ("Trust and
 * Savings Banks"); she perceived it as "the rounds are wrong" but the
 * grader was correct — her query had `/ 1000000` (integer).
 */
function detectIntegerDivisionPattern(rowDiffs) {
  if (!rowDiffs || rowDiffs.length === 0) return false;
  let hits = 0;
  let numericMismatches = 0;
  for (const diff of rowDiffs) {
    diff.diffCols.forEach((isWrong, ci) => {
      if (!isWrong) return;
      const u = diff.userRow[ci];
      const e = diff.expectedRow[ci];
      if (typeof u !== 'number' || typeof e !== 'number') return;
      numericMismatches++;
      // user = floor(expected) AND expected has fractional part
      if (Number.isInteger(u) && !Number.isInteger(e) && u === Math.floor(e)) {
        hits++;
      }
    });
  }
  return numericMismatches >= 1 && hits / numericMismatches >= 0.5;
}

/**
 * Compute extra/missing rows when row count differs. Operates on the
 * row arrays as multisets — same row appearing twice in user but once in
 * expected counts as one 'extra'.
 *
 * Returns: { extraRows: Array<{rowIndex, row}>, missingRows: Array<{rowIndex, row}> }
 *   extraRows have user-side rowIndex; missingRows have expected-side rowIndex.
 */
function diffRowsAsMultisets(userRows, expectedRows) {
  // Count expected rows by their JSON serialization.
  const expectedCounts = new Map();
  expectedRows.forEach((row, i) => {
    const key = JSON.stringify(row);
    if (!expectedCounts.has(key)) expectedCounts.set(key, { count: 0, firstIndex: i });
    expectedCounts.get(key).count++;
  });

  // Walk user rows. If we 'used up' an expected count, the row is matched.
  // Otherwise it's extra.
  const extraRows = [];
  const userMatched = new Array(userRows.length).fill(false);
  const expectedConsumed = new Map();   // key -> consumed count
  userRows.forEach((row, i) => {
    const key = JSON.stringify(row);
    const slot = expectedCounts.get(key);
    const consumed = expectedConsumed.get(key) || 0;
    if (slot && consumed < slot.count) {
      expectedConsumed.set(key, consumed + 1);
      userMatched[i] = true;
    } else {
      extraRows.push({ rowIndex: i, row });
    }
  });

  // Walk expected rows; any expected row not consumed is missing.
  const missingRows = [];
  const expectedRemaining = new Map();
  expectedCounts.forEach((slot, key) => {
    const consumed = expectedConsumed.get(key) || 0;
    expectedRemaining.set(key, slot.count - consumed);
  });
  expectedRows.forEach((row, i) => {
    const key = JSON.stringify(row);
    const remaining = expectedRemaining.get(key) || 0;
    if (remaining > 0) {
      missingRows.push({ rowIndex: i, row });
      expectedRemaining.set(key, remaining - 1);
    }
  });

  return { extraRows, missingRows };
}

/**
 * For sort_order diagnoses (same multisets, different order): for each
 * mismatched user row, find what expected position it should be at.
 *
 * Returns: Array<{ userRowIndex, expectedRowIndex, row }>
 *   ordered by userRowIndex; only includes positions where user[i] != expected[i].
 *   Stable across duplicate rows (uses first unmatched expected slot).
 */
function computePositionDiffs(userRows, expectedRows) {
  const out = [];
  // Track which expected indices are already 'claimed' by an earlier match.
  const expectedClaimed = new Array(expectedRows.length).fill(false);
  for (let i = 0; i < userRows.length; i++) {
    const userKey = JSON.stringify(userRows[i]);
    if (i < expectedRows.length && userKey === JSON.stringify(expectedRows[i])) {
      // Already in correct position — skip.
      expectedClaimed[i] = true;
      continue;
    }
    // Find first unclaimed expected slot with same row content.
    let target = -1;
    for (let j = 0; j < expectedRows.length; j++) {
      if (!expectedClaimed[j] && JSON.stringify(expectedRows[j]) === userKey) {
        target = j;
        break;
      }
    }
    if (target !== -1) {
      expectedClaimed[target] = true;
      out.push({ userRowIndex: i, expectedRowIndex: target, row: userRows[i] });
    }
  }
  return out;
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
