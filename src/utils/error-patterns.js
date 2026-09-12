// Error patterns — what KIND of mistake a wrong submit was, remembered.
//
// The founder's P1 (2026-09-12): "record error patterns (extra_filter,
// null_handling, wrong_join_type, missing_group_by …) so the tutor can say
// 'this is the third time you have made this mistake'." The diff engine
// (src/utils/diagnose.js) already says what is wrong with the OUTPUT; this
// module names the habit behind it by reading the diagnosis together with
// the query, and keeps a small per-user ledger of them.
//
// Pure. Classification is a set of readable rules, not a model: every id
// below can be explained to the student in one sentence, which is the point
// of recording it. A wrong submit can carry more than one pattern.
//
// Store shape (userData.errorPatterns):
//   { counts: { [pattern]: n }, recent: [{ p, c, at }] }   recent is capped

export const ERROR_PATTERNS = {
  missing_group_by: 'aggregated without GROUP BY, or grouped by the wrong columns',
  cross_join: 'a JOIN without a matching ON multiplied the rows',
  extra_filter: 'a WHERE / HAVING condition removed rows that belong in the answer',
  missing_filter: 'rows that the question excludes were returned',
  wrong_join_type: 'an INNER JOIN dropped rows that needed a LEFT JOIN',
  null_handling: 'NULL was compared with = / <> or aggregated as if it were a value',
  sort_order: 'the rows are right but ORDER BY does not match the ask',
  integer_division: 'integer / integer dropped the fractional part',
  value_calc: 'the calculation or CASE logic produced the wrong values',
  wrong_rows: 'the right number of rows, but not these rows',
  column_set: 'the wrong set or order of columns',
  column_alias: 'the column names do not match the expected aliases',
  syntax_error: 'the query did not run',
  empty_result: 'the query returned nothing',
};

export const RECENT_CAP = 50;

const has = (re, q) => re.test(q);

/**
 * Pattern ids for one wrong submit. `diagnosis` is diagnoseResult()'s
 * output; `query` the student's SQL. Order is by confidence.
 */
export function classifyErrorPatterns(diagnosis, query = '', challenge = null) {
  if (!diagnosis || !diagnosis.kind) return [];
  const q = String(query || '').replace(/--.*$/gm, ' ').replace(/\s+/g, ' ').toLowerCase();
  const desc = String((challenge && challenge.description) || '').toLowerCase();
  const out = [];
  const push = (p) => { if (!out.includes(p)) out.push(p); };

  const hasAgg = has(/\b(count|sum|avg|min|max)\s*\(/, q);
  const hasGroupBy = has(/\bgroup\s+by\b/, q);
  const hasJoin = has(/\bjoin\b/, q);
  const hasOn = has(/\bon\b/, q) || has(/\busing\s*\(/, q);
  const hasLeft = has(/\b(left|right|full)\s+(outer\s+)?join\b/, q);
  const hasWhere = has(/\bwhere\b/, q);
  const hasHaving = has(/\bhaving\b/, q);
  const eqNull = has(/(=|<>|!=)\s*null\b/, q);
  const asksPer = /\b(per|each|every|by)\b/.test(desc) || /\bgroup\b/.test(desc);

  switch (diagnosis.kind) {
    case 'runtime_error':
      push('syntax_error');
      break;
    case 'empty_result':
      push('empty_result');
      if (eqNull) push('null_handling');
      if (hasWhere) push('extra_filter');
      break;
    case 'column_count':
      push('column_set');
      break;
    case 'column_name':
      push('column_alias');
      break;
    case 'row_count': {
      const extra = /extra row/i.test(diagnosis.details || '') || /got (\d+)/.test(diagnosis.headline || '') && rowsGot(diagnosis) > rowsExpected(diagnosis);
      if (extra) {
        if (hasJoin && !hasOn) push('cross_join');
        if (hasAgg && !hasGroupBy) push('missing_group_by');
        else if (asksPer && !hasGroupBy && !hasAgg) push('missing_group_by');
        if (out.length === 0) push('missing_filter');
      } else {
        if (hasJoin && !hasLeft) push('wrong_join_type');
        if (eqNull) push('null_handling');
        if (hasWhere || hasHaving) push('extra_filter');
        if (out.length === 0) push('extra_filter');
      }
      break;
    }
    case 'row_set':
      push('wrong_rows');
      if (hasJoin && !hasLeft) push('wrong_join_type');
      if (hasWhere) push('extra_filter');
      break;
    case 'sort_order':
      push('sort_order');
      break;
    case 'null_mismatch':
      push('null_handling');
      break;
    case 'cell_values':
      if (/integer division/i.test((diagnosis.details || '') + ' ' + ((diagnosis.hints || [])[0] || ''))) push('integer_division');
      push('value_calc');
      if (eqNull) push('null_handling');
      break;
    default:
      break;
  }
  return out;
}

function rowsGot(d) { const m = /got (\d+)/.exec(d.headline || ''); return m ? Number(m[1]) : 0; }
function rowsExpected(d) { const m = /expected (\d+)/.exec(d.headline || ''); return m ? Number(m[1]) : 0; }

export function emptyErrorStore() {
  return { counts: {}, recent: [] };
}

/** A new store with these patterns recorded for this challenge. Never mutates. */
export function recordErrorPatterns(store, patterns, challengeId, now = Date.now()) {
  const base = store && typeof store === 'object' ? store : emptyErrorStore();
  const counts = { ...(base.counts || {}) };
  const recent = Array.isArray(base.recent) ? base.recent.slice() : [];
  for (const p of patterns || []) {
    if (!ERROR_PATTERNS[p]) continue;
    counts[p] = (counts[p] || 0) + 1;
    recent.push({ p, c: challengeId ?? null, at: Number(now) });
  }
  while (recent.length > RECENT_CAP) recent.shift();
  return { counts, recent };
}

/** How many times this pattern has been recorded, all time. */
export function patternCount(store, pattern) {
  return Number(store && store.counts && store.counts[pattern]) || 0;
}

/** Patterns in the last N recorded wrong submits, most frequent first. */
export function recentPatterns(store, n = 10) {
  const recent = Array.isArray(store && store.recent) ? store.recent.slice(-n) : [];
  const tally = {};
  for (const r of recent) if (r && r.p) tally[r.p] = (tally[r.p] || 0) + 1;
  return Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([p, count]) => ({ pattern: p, count }));
}

const ORDINAL = ['first', 'second', 'third', 'fourth', 'fifth'];

/**
 * The lines the tutor's system prompt carries. Names the habit, the count,
 * and — for anything seen three times or more — tells the tutor to say so.
 */
export function describeErrorPatterns(store, currentPatterns = [], { recentN = 10 } = {}) {
  const lines = [];
  const rec = recentPatterns(store, recentN);
  if (rec.length > 0) {
    lines.push(`ERROR PATTERNS IN THE LAST ${recentN} WRONG SUBMITS: ` + rec.map(r => `${r.pattern} ×${r.count}`).join(', '));
  }
  for (const p of currentPatterns || []) {
    const n = patternCount(store, p);
    if (n >= 3) {
      lines.push(`REPEAT: ${p} (${ERROR_PATTERNS[p] || p}) — this is the ${ORDINAL[n - 1] || `${n}th`} time. Say so, plainly and kindly, and name the rule once.`);
    }
  }
  return lines;
}
