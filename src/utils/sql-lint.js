// SQL lint patterns — added May 2026 for the Live Tutor.
//
// Pure heuristic-driven static analysis on the user's in-progress SQL.
// We deliberately use regex over a real parser: a tiny, fast, dependency-
// free check that misses some cases but never crashes. The Live Tutor
// surfaces the first warning as a friendly nudge under the editor while
// the student types — pre-submit, before they hit a confusing failure.
//
// Patterns covered (5):
//   1. Integer division     →  /1000000  →  truncates fractional part
//   2. JOIN without ON      →  Cartesian product
//   3. = NULL / != NULL     →  always returns unknown
//   4. Aggregate in WHERE   →  belongs in HAVING
//   5. Bare aggregate hint  →  SELECT mixes aggregate + non-aggregate w/o GROUP BY
//
// Returns an array of { kind, severity, message, offset? } objects. Empty
// array when nothing matches. Each kind is stable so the UI can dedupe and
// users can dismiss "this kind for this challenge" persistently.
//
// Tested in tests/sql-lint.test.js.

const COMMENT_RE = /--.*$/gm;
const BLOCK_COMMENT_RE = /\/\*[\s\S]*?\*\//g;

// Strip comments + collapse whitespace before linting. Keeps the original
// indices roughly stable for offset reporting.
function clean(sql) {
  return sql.replace(BLOCK_COMMENT_RE, ' ').replace(COMMENT_RE, '');
}

/**
 * Run all lint patterns over a SQL string.
 * @param {string} sql The user's current query (in-progress is fine).
 * @returns {Array<{kind:string, severity:'warning'|'info', message:string, offset?:number}>}
 */
export function lintSQL(sql) {
  if (!sql || typeof sql !== 'string') return [];
  const out = [];
  const text = clean(sql);

  // ─── 1. Integer division by literal ────────────────────────────────
  // Match `/ N` where N is a positive integer literal NOT followed by `.<digit>`.
  // Greedy regex backtracking is the trap — capture the WHOLE number
  // (including optional decimal) then skip if it has a dot. Skip small
  // divisors (n < 100) — those are usually intentional (halving, days/weeks).
  // The risky case is dividing by 100, 1000, 1000000 to convert units,
  // where losing the fractional part produces a clearly wrong number.
  const numRe = /\/\s*(\d+(?:\.\d*)?)/g;
  let m;
  while ((m = numRe.exec(text)) !== null) {
    if (m[1].includes('.')) continue;        // already a float literal
    const n = parseInt(m[1], 10);
    if (n < 100) continue;
    out.push({
      kind: 'integer_division',
      severity: 'warning',
      message: `Integer division: \`/ ${m[1]}\` will truncate the fractional part. Use \`${m[1]}.0\` for float division.`,
      offset: m.index,
      fix: `${m[1]}.0`,
    });
  }

  // ─── 2. JOIN without ON / USING ─────────────────────────────────────
  // Match the JOIN keyword, then look at the next ~200 chars for an ON
  // or USING clause. CROSS JOIN doesn't need one — keep it as an explicit
  // alternative so m[1] === 'CROSS JOIN' and the skip below works.
  const joinRe = /\b(CROSS\s+JOIN|INNER\s+JOIN|LEFT\s+(?:OUTER\s+)?JOIN|RIGHT\s+(?:OUTER\s+)?JOIN|FULL\s+(?:OUTER\s+)?JOIN|JOIN)\b/gi;
  while ((m = joinRe.exec(text)) !== null) {
    if (/CROSS/i.test(m[1])) continue;
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 250);
    // Look for ON or USING in the next clause. Either right after the
    // table name (with optional alias), or anywhere in the immediate
    // segment before another JOIN/WHERE/GROUP/ORDER/LIMIT/UNION.
    const segMatch = after.match(/^([\s\S]*?)(?=\bJOIN\b|\bWHERE\b|\bGROUP\s+BY\b|\bORDER\s+BY\b|\bLIMIT\b|\bUNION\b|;|$)/i);
    const seg = segMatch ? segMatch[1] : after;
    if (!/\bON\b/i.test(seg) && !/\bUSING\b/i.test(seg)) {
      out.push({
        kind: 'join_no_on',
        severity: 'warning',
        message: 'JOIN without ON clause produces a Cartesian product. Add `ON table1.col = table2.col`.',
        offset: m.index,
      });
      // Don't spam multiple warnings for nested JOINs that all share the issue.
      break;
    }
  }

  // ─── 3. = NULL  /  != NULL  /  <> NULL ───────────────────────────────
  // SQL is three-valued; any comparison with NULL returns unknown which
  // WHERE treats as false. Use IS NULL / IS NOT NULL.
  if (/(?:=|!=|<>)\s*NULL\b/i.test(text)) {
    out.push({
      kind: 'null_comparison',
      severity: 'warning',
      message: '`= NULL` (or `!= NULL`) always returns unknown — those rows get silently dropped. Use `IS NULL` or `IS NOT NULL`.',
    });
  }

  // ─── 4. Aggregate in WHERE clause ────────────────────────────────────
  // Match WHERE, then find the body up to the next clause (GROUP BY,
  // HAVING, ORDER BY, LIMIT, etc.) and look for COUNT/SUM/AVG/MIN/MAX(.
  const whereMatch = text.match(/\bWHERE\b([\s\S]*?)(?=\bGROUP\s+BY\b|\bHAVING\b|\bORDER\s+BY\b|\bLIMIT\b|\)|;|$)/i);
  if (whereMatch) {
    const body = whereMatch[1];
    if (/\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/i.test(body)) {
      out.push({
        kind: 'aggregate_in_where',
        severity: 'warning',
        message: 'Aggregates (COUNT/SUM/AVG/MIN/MAX) cannot appear in WHERE — they need HAVING after GROUP BY.',
      });
    }
  }

  // ─── 5. Mixing aggregate and bare column without GROUP BY ────────────
  // Heuristic: top-level SELECT contains an aggregate AND something that
  // looks like a bare column (identifier with optional table prefix), but
  // there's no GROUP BY anywhere. Skips when the query has a CTE wrapping
  // (recursive checks would be a real parser).
  const selectMatch = text.match(/\bSELECT\b([\s\S]*?)\bFROM\b/i);
  if (selectMatch) {
    const list = selectMatch[1];
    const hasAggregate = /\b(COUNT|SUM|AVG|MIN|MAX|GROUP_CONCAT|STRING_AGG|ARRAY_AGG)\s*\(/i.test(list);
    // Bare-column heuristic: identifier (optionally table.col), not wrapped
    // in any function call. Strip aggregate-call regions then scan for a
    // remaining bare ident.
    const stripped = list.replace(/\b\w+\s*\([^)]*\)/g, '');
    const hasBareColumn = /\b[a-zA-Z_]\w*(?:\s*\.\s*\w+)?\b/.test(stripped) &&
      !/^\s*\*\s*$/.test(stripped.trim());
    const hasGroupBy = /\bGROUP\s+BY\b/i.test(text);
    if (hasAggregate && hasBareColumn && !hasGroupBy) {
      // Only fire when the bare column looks like an actual identifier,
      // not a stray keyword. Very common false-positive: AS aliases.
      // Crude filter: require at least one bare ident NOT preceded by AS.
      const idents = stripped.match(/\b[a-zA-Z_]\w*\b/g) || [];
      const keywords = new Set([
        'AS', 'DISTINCT', 'ALL', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
        'AND', 'OR', 'NOT', 'NULL', 'TRUE', 'FALSE', 'IS', 'IN', 'BETWEEN',
        'LIKE', 'CAST',
      ]);
      const realIdents = idents.filter(i => !keywords.has(i.toUpperCase()));
      if (realIdents.length > 0) {
        out.push({
          kind: 'missing_group_by',
          severity: 'warning',
          message: 'Your SELECT mixes an aggregate (COUNT/SUM/etc.) with a non-aggregated column, but there\'s no GROUP BY. Add `GROUP BY <those columns>`.',
        });
      }
    }
  }

  return out;
}

/**
 * Convenience: returns true when the SQL has been idle for `thresholdMs`
 * milliseconds since `lastEditAt`. Pure helper — caller owns the timer.
 */
export function isIdle(lastEditAt, thresholdMs = 30000, now = Date.now()) {
  if (!lastEditAt) return false;
  return (now - lastEditAt) >= thresholdMs;
}

export default lintSQL;
