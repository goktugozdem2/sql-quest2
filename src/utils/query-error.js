// Classify a thrown SQLite error into a coarse bucket for aggregation.
//
// WHY THIS EXISTS
// ---------------
// submitChallenge wraps grading in a try/catch. A query that fails to PARSE
// throws, so it never reaches the setChallengeAttempts call — meaning every
// syntax error a user hits has been invisible: not an attempt, not in the
// radar, not countable. The raw message carries the detail, but raw SQLite
// strings ("near \"SEPARATOR\": syntax error") don't group, so we tag a class
// alongside them.
//
// The buckets are chosen for what they'd change:
//   dialect_mismatch — the user wrote valid SQL for another engine. This is a
//     CONTENT bug on our side: the challenge never says which engine grades
//     it. Serge, our first annual subscriber, lost ~45 minutes to exactly
//     this on challenge 4 (GROUP_CONCAT with MySQL's ORDER BY / SEPARATOR)
//     on 2026-07-26 — a challenge whose own blurb sells GROUP_CONCAT as a
//     Google interview question, which is precisely what primes MySQL.
//   no_such_column — very often CTE/derived-table scoping, i.e. a teachable
//     moment the product should catch rather than a typo.
//   syntax / no_such_table / no_such_function / ambiguous_column — ordinary.
//
// If dialect_mismatch turns out to be common, the fix is a dialect note on
// the challenge, not better error copy.

// Constructs that are valid in MySQL or Postgres and rejected by SQLite.
// Ordered most-specific first; the first hit wins.
// NOTE on STRING_AGG: it is a real function in SQLite 3.44+, so a local
// better-sqlite3 (3.53) accepts it. The browser runs sql.js 1.8.0, which
// ships an older SQLite that does not — so in production it throws and this
// marker fires. Don't "fix" it after testing against a modern local engine.
const DIALECT_MARKERS = [
  /near "SEPARATOR"/i,        // MySQL GROUP_CONCAT(... SEPARATOR ', ')
  /no such function: STRING_AGG/i,   // Postgres
  /no such function: LISTAGG/i,      // Oracle / Snowflake
  /no such function: IFNULL|no such function: NVL/i,
  /no such function: DATE_FORMAT/i,  // MySQL
  /no such function: TO_CHAR/i,      // Postgres / Oracle
  /no such function: GETDATE|no such function: TOP/i, // SQL Server
  /near "LIMIT".*OFFSET|no such function: NOW/i,
  /no such function: CONCAT_WS/i,
  /near "ILIKE"/i,            // Postgres
  /unrecognized token: ":"/i, // Postgres `col::text` — SQLite reports the
                              // stray colon as an unrecognized token, NOT as
                              // `near "::"`. Confirmed against the engine.
];

/**
 * @param {string} message raw error text from sql.js
 * @returns {'dialect_mismatch'|'no_such_column'|'no_such_table'|'no_such_function'|'ambiguous_column'|'syntax'|'other'}
 */
export function classifyQueryError(message) {
  const msg = String(message == null ? '' : message);
  if (!msg.trim()) return 'other';

  // Dialect first: these also match syntax/no-such-function, but the dialect
  // reading is the actionable one.
  for (const re of DIALECT_MARKERS) if (re.test(msg)) return 'dialect_mismatch';

  if (/no such column/i.test(msg)) return 'no_such_column';
  if (/no such table/i.test(msg)) return 'no_such_table';
  if (/no such function/i.test(msg)) return 'no_such_function';
  if (/ambiguous column name/i.test(msg)) return 'ambiguous_column';
  if (/syntax error/i.test(msg)) return 'syntax';
  return 'other';
}
