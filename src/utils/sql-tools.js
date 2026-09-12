/**
 * SQL query analysis for the free tools — /sql-query-explainer/,
 * /sql-query-checker/ and /sql-query-optimizer/ (founder's SEO plan
 * 2026-09-13, P2.15: link-magnet tools).
 *
 * Pure, static, no database: the query is never run and never leaves the
 * browser. Everything here reads the TEXT of a query, after comments and
 * string literals are masked, so a keyword inside 'quotes' or -- a comment
 * never fires a rule. That is also the honest limit, and the pages say it:
 * this finds the mistakes that are visible in the text (NOT IN over a
 * nullable subquery, a window function in WHERE, a column that is neither
 * grouped nor aggregated), not the ones that only show up in the data.
 *
* scripts/build-sql-tools.mjs inlines this file into the three pages, so it
 * must stay dependency-free and must not use `import`.
 */

// ── masking ────────────────────────────────────────────────────────────────
// Replace comments with spaces and string/identifier literals with same-length
// placeholders, so offsets still line up with the original text.
export function maskSql(sql) {
  const s = String(sql || '');
  let out = '';
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    const next = s[i + 1];
    if (ch === '-' && next === '-') {
      const end = s.indexOf('\n', i);
      const stop = end < 0 ? s.length : end;
      out += ' '.repeat(stop - i);
      i = stop;
    } else if (ch === '/' && next === '*') {
      const end = s.indexOf('*/', i + 2);
      const stop = end < 0 ? s.length : end + 2;
      out += s.slice(i, stop).replace(/[^\n]/g, ' ');
      i = stop;
    } else if (ch === "'" || ch === '"' || ch === '`') {
      let j = i + 1;
      while (j < s.length) {
        if (s[j] === ch && s[j + 1] === ch) { j += 2; continue; }
        if (s[j] === ch) break;
        j++;
      }
      const stop = Math.min(j + 1, s.length);
      // strings become 's…', quoted identifiers become i…i, same length
      const fill = ch === "'" ? 's' : 'i';
      out += (ch === "'" ? "'" : fill) + fill.repeat(Math.max(0, stop - i - 2)) + (stop - i >= 2 ? (ch === "'" ? "'" : fill) : '');
      i = stop;
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

// Blank everything inside parentheses (keeping the parens), so a top-level
// regex never matches inside a subquery or a function call.
export function topLevel(masked) {
  let depth = 0;
  let out = '';
  for (const ch of masked) {
    if (ch === '(') { out += depth === 0 ? '(' : ' '; depth++; continue; }
    if (ch === ')') { depth = Math.max(0, depth - 1); out += depth === 0 ? ')' : ' '; continue; }
    out += depth > 0 && ch !== '\n' ? ' ' : ch;
  }
  return out;
}

const squash = s => s.replace(/\s+/g, ' ').trim();

// The main SELECT (after any WITH … list) as [start, end) offsets on the mask.
function mainSelect(masked) {
  const top = topLevel(masked);
  const m = /\bSELECT\b/i.exec(top);
  return m ? m.index : -1;
}


// Split the top-level main query into clause bodies (original text).
export function clausesOf(sql) {
  const masked = maskSql(sql);
  const top = topLevel(masked);
  const start = mainSelect(masked);
  if (start < 0) return {};
  const re = /\b(SELECT|FROM|WHERE|GROUP\s+BY|HAVING|WINDOW|ORDER\s+BY|LIMIT|OFFSET|UNION(?:\s+ALL)?|INTERSECT|EXCEPT)\b/gi;
  re.lastIndex = start;
  const marks = [];
  let m;
  while ((m = re.exec(top))) marks.push({ name: m[1].toUpperCase().replace(/\s+/g, ' '), at: m.index, body: m.index + m[0].length });
  const out = {};
  for (let k = 0; k < marks.length; k++) {
    const { name, body } = marks[k];
    if (/^(UNION|INTERSECT|EXCEPT)/.test(name)) { out.SETOP = name; break; }
    if (out[name] !== undefined) continue;
    const end = k + 1 < marks.length ? marks[k + 1].at : sql.length;
    const trail = (/;\s*$/.exec(masked.slice(body, end)) || [''])[0].length;
    out[name] = { text: sql.slice(body, end - trail), masked: masked.slice(body, end - trail), at: body };
  }
  return out;
}

// Split a clause body on top-level commas.
export function splitTopCommas(text, masked) {
  const top = topLevel(masked);
  const parts = [];
  let last = 0;
  for (let i = 0; i < top.length; i++) {
    if (top[i] === ',') { parts.push({ text: text.slice(last, i), masked: masked.slice(last, i) }); last = i + 1; }
  }
  parts.push({ text: text.slice(last), masked: masked.slice(last) });
  return parts.filter(p => p.text.trim());
}

export function cteNames(sql) {
  const top = topLevel(maskSql(sql));
  const m = /^\s*WITH\s+(?:RECURSIVE\s+)?/i.exec(top);
  if (!m) return [];
  const names = [];
  const re = /(?:^|,)\s*([A-Za-z_]\w*)\s*(?:\([^)]*\)\s*)?AS\s*\(/gi;
  const head = top.slice(m.index + m[0].length, mainSelect(maskSql(sql)));
  const re2 = new RegExp(re.source, 'gi');
  let x;
  while ((x = re2.exec(head))) names.push(x[1]);
  return names;
}

const AGG = /\b(COUNT|SUM|AVG|MIN|MAX|GROUP_CONCAT|STRING_AGG|ARRAY_AGG|LISTAGG|STDDEV\w*|VARIANCE|MEDIAN|PERCENTILE_\w+|BOOL_(?:AND|OR))\s*\(/i;
const WINDOW_FN = /\b(ROW_NUMBER|RANK|DENSE_RANK|NTILE|PERCENT_RANK|CUME_DIST|LAG|LEAD|FIRST_VALUE|LAST_VALUE|NTH_VALUE)\s*\(|\bOVER\s*\(/i;

function balance(masked) {
  let depth = 0;
  for (const ch of masked) {
    if (ch === '(') depth++;
    if (ch === ')') { depth--; if (depth < 0) return -1; }
  }
  return depth;
}

function unterminatedString(sql) {
  const s = String(sql);
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === '-' && s[i + 1] === '-') { const e = s.indexOf('\n', i); i = e < 0 ? s.length : e; continue; }
    if (ch === '/' && s[i + 1] === '*') { const e = s.indexOf('*/', i + 2); if (e < 0) return 'comment'; i = e + 2; continue; }
    if (ch === "'") {
      let j = i + 1;
      while (j < s.length && !(s[j] === "'" && s[j + 1] !== "'")) { if (s[j] === "'" && s[j + 1] === "'") j++; j++; }
      if (j >= s.length) return 'string';
      i = j + 1; continue;
    }
    i++;
  }
  return null;
}

// Where a rule's lesson lives on the site.
export const LEARN = {
  not_in_null: ['/blog/sql-anti-join/', 'Anti-joins: NOT EXISTS vs NOT IN'],
  equals_null: ['/blog/is-null-vs-equals-null/', 'IS NULL vs = NULL'],
  window_in_where: ['/challenges/ranking-functions/', 'Ranking functions practice'],
  aggregate_in_where: ['/blog/where-vs-having/', 'WHERE vs HAVING'],
  having_non_aggregate: ['/blog/where-vs-having/', 'WHERE vs HAVING'],
  not_grouped: ['/challenges/aggregation/', 'GROUP BY practice'],
  left_join_where: ['/blog/left-join-vs-inner-join/', 'LEFT JOIN vs INNER JOIN'],
  implicit_cross_join: ['/challenges/joins/', 'JOIN practice'],
  integer_division: ['/challenges/aggregation/', 'Aggregation practice'],
  limit_without_order: ['/challenges/ranking-functions/', 'Top-N queries'],
  correlated_select: ['/challenges/window-functions/', 'Window functions practice'],
  repeated_subquery: ['/challenges/cte/', 'CTE practice'],
  count_for_existence: ['/challenges/subqueries/', 'Subquery practice'],
};

// ── checker ────────────────────────────────────────────────────────────────
// Correctness issues: things that return the wrong rows or fail to run.
export function checkQuery(sql) {
  const issues = [];
  const add = (kind, severity, message, fix) => issues.push({ kind, severity, message, fix, learn: LEARN[kind] || null });
  const text = String(sql || '');
  if (!text.trim()) return issues;
  const masked = maskSql(text);

  const open = unterminatedString(text);
  if (open) add('syntax_unterminated', 'error', `There is an unterminated ${open === 'string' ? "string literal (a ' with no closing ')" : 'block comment (/* with no */)'}.`, open === 'string' ? "Close the quote. A quote inside a string is written twice: 'O''Brien'." : 'Close the comment with */.');
  const bal = balance(masked);
  if (bal !== 0) add('syntax_parens', 'error', bal < 0 ? 'There is a closing parenthesis with no matching opening one.' : `${bal === 1 ? 'One parenthesis is' : `${bal} parentheses are`} opened and never closed.`, 'Count the brackets around each function call and subquery.');
  if (/,\s*\bFROM\b/i.test(masked)) add('syntax_trailing_comma', 'error', 'A comma sits right before FROM, so the SELECT list ends in an empty column.', 'Delete the last comma in the SELECT list.');
  if (/\bSELECT\s*,/i.test(masked)) add('syntax_leading_comma', 'error', 'The SELECT list starts with a comma.', 'Delete the comma after SELECT.');

  if (/\bNOT\s+IN\s*\(\s*SELECT\b/i.test(masked)) {
    add('not_in_null', 'warning', 'NOT IN (SELECT …) returns no rows at all if the subquery returns a single NULL.', 'Use NOT EXISTS (SELECT 1 FROM … WHERE inner.key = outer.key), or add WHERE key IS NOT NULL inside the subquery.');
  }
  if (/(?:=|<>|!=)\s*NULL\b/i.test(masked) && !/\bSET\b[^;]*=\s*NULL\b/i.test(masked)) {
    add('equals_null', 'error', '= NULL and <> NULL are never true: comparing anything to NULL gives NULL, so the filter drops every row.', 'Write IS NULL or IS NOT NULL.');
  }

  // Look at every SELECT block, not just the main one.
  const blocks = selectBlocks(text, masked);
  for (const b of blocks) {
    const c = b.clauses;
    if (c.WHERE && WINDOW_FN.test(c.WHERE.masked)) {
      add('window_in_where', 'error', 'A window function is used in WHERE. WHERE runs before window functions are computed, so this fails.', 'Compute the window in a CTE or subquery, then filter on its alias in the outer query: WITH r AS (SELECT …, ROW_NUMBER() OVER (…) AS rn FROM t) SELECT * FROM r WHERE rn <= 3.');
    }
    if (c.WHERE && AGG.test(c.WHERE.masked) && !/\(\s*SELECT\b/i.test(c.WHERE.masked)) {
      add('aggregate_in_where', 'error', 'An aggregate (COUNT, SUM, AVG…) is used in WHERE. WHERE filters rows before grouping, so aggregates are not available there.', 'Move the condition to HAVING, after GROUP BY.');
    }
    if (c.HAVING && !c['GROUP BY'] && !AGG.test(c.HAVING.masked)) {
      add('having_non_aggregate', 'warning', 'HAVING is used without GROUP BY and without an aggregate — it is doing WHERE\'s job.', 'Use WHERE for row filters; keep HAVING for conditions on aggregates.');
    }
    if (c['GROUP BY'] && c.SELECT) {
      const groupKeys = splitTopCommas(c['GROUP BY'].text, c['GROUP BY'].masked).map(p => squash(p.text).toLowerCase());
      const positional = groupKeys.every(k => /^\d+$/.test(k));
      if (!positional) {
        for (const item of splitTopCommas(c.SELECT.text, c.SELECT.masked)) {
          const expr = squash(item.text.replace(/^\s*DISTINCT\s+/i, ''));
          const maskedExpr = squash(item.masked.replace(/^\s*DISTINCT\s+/i, ''));
          if (!expr || expr === '*' || AGG.test(maskedExpr) || WINDOW_FN.test(maskedExpr)) continue;
          const bare = expr.replace(/\s+(?:AS\s+)?[A-Za-z_]\w*$/i, m => (/^\s+(?:AS\s+)?(?:END)$/i.test(m) ? m : '')).trim();
          const alias = (expr.match(/\s+(?:AS\s+)?([A-Za-z_]\w*)$/i) || [])[1];
          const cands = [bare, expr, alias, bare.split('.').pop()].filter(Boolean).map(x => x.toLowerCase());
          if (/^'.*'$|^-?\d+(\.\d+)?$/.test(bare)) continue; // literal
          const matched = groupKeys.some(k => cands.includes(k) || cands.includes(k.split('.').pop()));
          if (!matched) {
            add('not_grouped', 'error', `"${bare}" is in SELECT but is neither in GROUP BY nor inside an aggregate. PostgreSQL rejects this; MySQL and SQLite return an arbitrary value from each group.`, `Add ${bare} to GROUP BY, or wrap it in an aggregate such as MAX(${bare}).`);
            break;
          }
        }
      }
    }
    if (c.FROM && !/\bJOIN\b/i.test(c.FROM.masked)) {
      const tables = splitTopCommas(c.FROM.text, c.FROM.masked);
      if (tables.length > 1 && !(c.WHERE && /\b\w+\.\w+\s*=\s*\w+\.\w+/.test(c.WHERE.masked))) {
        add('implicit_cross_join', 'error', `FROM lists ${tables.length} tables separated by commas with no join condition, which is a cross join: every row of one paired with every row of the other.`, 'Write an explicit JOIN … ON a.key = b.key.');
      }
    }
    if (c.FROM && c.WHERE) {
      const lefts = [...c.FROM.masked.matchAll(/\bLEFT\s+(?:OUTER\s+)?JOIN\s+([A-Za-z_][\w.]*)(?:\s+(?:AS\s+)?([A-Za-z_]\w*))?/gi)]
        .map(m => (m[2] && !/^(ON|USING)$/i.test(m[2]) ? m[2] : m[1].split('.').pop()));
      for (const a of lefts) {
        const re = new RegExp(`\\b${a}\\.\\w+\\s*(?:=|<>|!=|>=|<=|>|<|\\bIN\\b|\\bLIKE\\b|\\bBETWEEN\\b)`, 'i');
        const nullOk = new RegExp(`\\b${a}\\.\\w+\\s+IS\\s+(?:NOT\\s+)?NULL`, 'i');
        if (re.test(c.WHERE.masked) && !nullOk.test(c.WHERE.masked)) {
          add('left_join_where', 'warning', `WHERE filters on a column of ${a}, the right side of a LEFT JOIN. Rows with no match have NULL there, fail the filter, and disappear — the LEFT JOIN becomes an INNER JOIN.`, `Move that condition into the ON clause of the LEFT JOIN on ${a}, or write INNER JOIN if that is what you meant.`);
          break;
        }
      }
    }
    if (c.LIMIT && !c['ORDER BY']) {
      add('limit_without_order', 'warning', 'LIMIT without ORDER BY returns whichever rows the database reads first. The result can change between runs.', 'Add ORDER BY (with a tie-breaker column) before LIMIT.');
    }
  }
  if (/\b(?:COUNT|SUM)\s*\([^()]*\)\s*\/\s*(?:COUNT|SUM)\s*\(/i.test(masked) && !/\b1\.0\s*\*|\*\s*1\.0\b|\bCAST\s*\(|::\s*(?:numeric|float|decimal|real)|\b100\.0\b/i.test(masked)) {
    add('integer_division', 'warning', 'COUNT(…) / COUNT(…) divides two integers. In PostgreSQL and SQLite that truncates — a 0.4 rate comes back as 0.', 'Multiply by 1.0 first (1.0 * COUNT(a) / COUNT(b)) or CAST one side to a decimal.');
  }
  return dedupe(issues);
}

function dedupe(list) {
  const seen = new Set();
  return list.filter(x => (seen.has(x.kind) ? false : seen.add(x.kind)));
}

// Every SELECT … block (the main query, each CTE body, each subquery), with
// its clauses parsed at its own depth.
export function selectBlocks(text, masked = maskSql(text)) {
  const out = [];
  const re = /\bSELECT\b/gi;
  let m;
  while ((m = re.exec(masked))) {
    // the block ends at the ) that closes the paren the SELECT sits in
    let depth = 0;
    let end = masked.length;
    for (let i = m.index; i < masked.length; i++) {
      if (masked[i] === '(') depth++;
      else if (masked[i] === ')') { if (depth === 0) { end = i; break; } depth--; }
      else if (masked[i] === ';' && depth === 0) { end = i; break; }
    }
    const t = text.slice(m.index, end);
    const c = clausesOf(t);
    out.push({ at: m.index, text: t, clauses: c });
  }
  return out;
}

// ── optimizer ──────────────────────────────────────────────────────────────
// Performance and clarity suggestions. None of these change the result.
export function optimizeQuery(sql) {
  const tips = [];
  const add = (kind, impact, message, fix) => tips.push({ kind, impact, message, fix, learn: LEARN[kind] || null });
  const text = String(sql || '');
  if (!text.trim()) return tips;
  const masked = maskSql(text);
  const blocks = selectBlocks(text, masked);

  if (blocks.some(b => b.clauses.SELECT && /(^|,)\s*(?:\w+\.)?\*\s*($|,)/.test(topLevel(b.clauses.SELECT.masked)) && !/\bCOUNT\s*\(\s*\*\s*\)/i.test(b.clauses.SELECT.masked.replace(/(?:\w+\.)?\*\s*,?/, 'x')))) {
    add('select_star', 'medium', 'SELECT * reads every column, including ones you do not use, and breaks when the table gains a column.', 'List the columns you need. In a CTE it also documents what the next step reads.');
  }
  for (const b of blocks) {
    const w = b.clauses.WHERE;
    if (!w) continue;
    if (/\b(?:YEAR|MONTH|DAY|DATE|LOWER|UPPER|TRIM|SUBSTR|SUBSTRING|strftime|DATE_TRUNC|CAST|COALESCE|EXTRACT)\s*\([^()]*\b[A-Za-z_]\w*(?:\.\w+)?[^()]*\)\s*(?:=|>=|<=|>|<|\bBETWEEN\b|\bIN\b)/i.test(w.masked)) {
      add('non_sargable', 'high', 'A function is wrapped around a column in WHERE (for example YEAR(order_date) = 2024 or LOWER(email) = …). The database has to compute it for every row and cannot use an index on that column.', "Compare the bare column to a range instead: order_date >= '2024-01-01' AND order_date < '2025-01-01'. For case-insensitive lookups, store or index the lowered value.");
      break;
    }
  }
  if (/\bLIKE\s+'%/i.test(text.replace(/--.*$/gm, ''))) {
    add('leading_wildcard', 'high', "LIKE '%…' starts with a wildcard, so no ordinary index can help; every row is scanned.", "Anchor the pattern at the start ('abc%') if the data allows, or use full-text search for contains-style lookups.");
  }
  if (blocks.some(b => b.clauses.SELECT && /^\s*DISTINCT\b/i.test(b.clauses.SELECT.masked) && b.clauses.FROM && /\bJOIN\b/i.test(b.clauses.FROM.masked))) {
    add('distinct_join', 'medium', 'SELECT DISTINCT on top of a JOIN usually hides a fan-out: the join multiplied rows and DISTINCT removes the copies after the work is done.', 'Find the join that repeats rows and fix the grain — aggregate the many-side first, or use EXISTS when you only need to know a match exists.');
  }
  if (/\bUNION\b(?!\s+ALL)/i.test(masked)) {
    add('union_all', 'medium', 'UNION removes duplicates, which means a sort or hash over the whole result.', 'If the two halves cannot overlap (or duplicates are fine), use UNION ALL.');
  }
  const orEq = /\b([A-Za-z_][\w.]*)\s*=\s*[^\s()]+\s+OR\s+\1\s*=\s*/i;
  if (orEq.test(masked)) {
    add('or_to_in', 'low', 'The same column is compared with = several times joined by OR.', 'Write col IN (a, b, c): shorter, and easier for the planner.');
  }
  if (/\bNOT\s+IN\s*\(\s*SELECT\b/i.test(masked)) {
    add('not_in_subquery', 'medium', 'NOT IN (SELECT …) is often planned worse than NOT EXISTS, and it returns nothing if the subquery yields a NULL.', 'Rewrite as NOT EXISTS (SELECT 1 FROM … WHERE inner.key = outer.key).');
  }
  if (/\b(?:COUNT)\s*\(\s*\*\s*\)\s*\)?\s*(?:>\s*0|>=\s*1)/i.test(masked) && /\(\s*SELECT\s+COUNT\s*\(/i.test(masked)) {
    add('count_for_existence', 'medium', '(SELECT COUNT(*) …) > 0 counts every matching row just to learn whether one exists.', 'Use EXISTS (SELECT 1 …), which stops at the first match.');
  }
  for (const b of blocks) {
    const s = b.clauses.SELECT;
    if (s && /\(\s*SELECT\b/i.test(s.masked) && /\(\s*SELECT[\s\S]*?\bWHERE\b[\s\S]*?\b\w+\.\w+\s*=\s*\w+\.\w+/i.test(s.masked)) {
      add('correlated_select', 'high', 'A correlated subquery sits in the SELECT list, so it runs once per outer row.', 'Join to a pre-aggregated CTE (GROUP BY the key once), or use a window function such as SUM(x) OVER (PARTITION BY key).');
      break;
    }
  }
  const subs = [...masked.matchAll(/\(\s*(SELECT\b[^()]*(?:\([^()]*\)[^()]*)*)\)/gi)].map(m => squash(m[1]).toLowerCase()).filter(x => x.length > 25);
  if (subs.some((x, i) => subs.indexOf(x) !== i)) {
    add('repeated_subquery', 'medium', 'The same subquery appears more than once.', 'Name it once in a WITH clause (a CTE) and reference it by name.');
  }
  for (const b of blocks) {
    const h = b.clauses.HAVING;
    if (h && b.clauses['GROUP BY']) {
      const parts = h.masked.split(/\bAND\b/i);
      if (parts.some(p => p.trim() && !AGG.test(p) && /\b[A-Za-z_][\w.]*\s*(?:=|<>|>|<|IN\b|LIKE\b)/i.test(p))) {
        add('having_non_aggregate', 'medium', 'A condition in HAVING does not use an aggregate, so it could filter rows before grouping instead of after.', 'Move that condition to WHERE; the GROUP BY then has fewer rows to group.');
        break;
      }
    }
  }
  for (const b of blocks) {
    if (b.at > 0 && b.clauses['ORDER BY'] && !b.clauses.LIMIT && masked.slice(0, b.at).trim().endsWith('(')) {
      add('order_in_subquery', 'low', 'ORDER BY inside a subquery or CTE without LIMIT is usually ignored — only the outer query\'s ORDER BY decides the final order.', 'Remove it, or move it to the outer query.');
      break;
    }
  }
  return dedupe(tips);
}

// ── explainer ──────────────────────────────────────────────────────────────
// Clause-by-clause, in the order the database evaluates them.
const LOGICAL = [
  ['WITH', 'Named steps (CTEs)'],
  ['FROM', 'Pick the rows to start from'],
  ['WHERE', 'Filter rows'],
  ['GROUP BY', 'Collapse rows into groups'],
  ['HAVING', 'Filter groups'],
  ['SELECT', 'Compute the output columns'],
  ['WINDOW', 'Named windows'],
  ['ORDER BY', 'Sort the result'],
  ['LIMIT', 'Keep the first rows'],
  ['OFFSET', 'Skip rows'],
];

function describeFrom(text, masked) {
  const t = squash(text);
  const joins = [...masked.matchAll(/\b((?:LEFT|RIGHT|FULL|INNER|CROSS)(?:\s+OUTER)?\s+)?JOIN\b/gi)].map(m => squash((m[1] || 'INNER ') + 'JOIN').toUpperCase());
  const first = (t.match(/^([A-Za-z_][\w.]*|\()/) || [])[1];
  const bits = [];
  if (first === '(') bits.push('Starts from a subquery (a derived table), which is computed first.');
  else if (first) bits.push(`Starts from ${first}.`);
  const kinds = {
    'INNER JOIN': 'keeps only rows with a match on both sides',
    'LEFT JOIN': 'keeps every row from the left side; unmatched right-side columns come back as NULL',
    'LEFT OUTER JOIN': 'keeps every row from the left side; unmatched right-side columns come back as NULL',
    'RIGHT JOIN': 'keeps every row from the right side',
    'RIGHT OUTER JOIN': 'keeps every row from the right side',
    'FULL JOIN': 'keeps unmatched rows from both sides',
    'FULL OUTER JOIN': 'keeps unmatched rows from both sides',
    'CROSS JOIN': 'pairs every row with every row',
  };
  for (const j of joins) bits.push(`${j} ${kinds[j] || ''}.`.replace(' .', '.'));
  if (joins.length) bits.push('A join can repeat rows when one side has several matches — check the grain before aggregating.');
  return bits.join(' ');
}

export function explainQuery(sql) {
  const text = String(sql || '');
  const masked = maskSql(text);
  if (!/\bSELECT\b/i.test(masked)) return { steps: [], summary: 'Paste a SELECT query to see it explained.' };
  const c = clausesOf(text);
  const steps = [];
  const ctes = cteNames(text);
  if (ctes.length) steps.push({ clause: 'WITH', title: LOGICAL[0][1], text: `Defines ${ctes.length === 1 ? 'one named step' : `${ctes.length} named steps`} — ${ctes.join(', ')} — that the main query reads like tables. They run top to bottom, and a later one can read an earlier one.${/\bWITH\s+RECURSIVE\b/i.test(masked) ? ' RECURSIVE means one of them reads itself, repeating until it adds no rows.' : ''}` });
  for (const [name, title] of LOGICAL.slice(1)) {
    const cl = c[name];
    if (!cl) continue;
    const t = squash(cl.text);
    let why = '';
    if (name === 'FROM') why = describeFrom(cl.text, cl.masked);
    if (name === 'WHERE') why = `Keeps only rows where ${t}. Runs before grouping, so it cannot use aggregates or window functions.${/\bIS\s+NULL\b/i.test(cl.masked) ? ' IS NULL keeps rows where the value is missing.' : ''}${/\b(?:NOT\s+)?EXISTS\s*\(/i.test(cl.masked) ? ' EXISTS checks whether a matching row exists and stops at the first one.' : ''}${/\bIN\s*\(\s*SELECT\b/i.test(cl.masked) ? ' IN (SELECT …) compares against the list the subquery returns.' : ''}`;
    if (name === 'GROUP BY') why = `One output row per distinct ${splitTopCommas(cl.text, cl.masked).length > 1 ? 'combination of' : 'value of'} ${t}. Every other column in SELECT must be aggregated.`;
    if (name === 'HAVING') why = `Keeps only groups where ${t}. This is the filter that can use COUNT, SUM and the other aggregates.`;
    if (name === 'SELECT') {
      const items = splitTopCommas(cl.text, cl.masked).map(p => squash(p.text));
      const notes = [];
      if (/^\s*DISTINCT\b/i.test(cl.masked)) notes.push('DISTINCT removes duplicate output rows.');
      if (AGG.test(cl.masked)) notes.push('Aggregates (COUNT, SUM, AVG…) are computed per group, or over all rows when there is no GROUP BY.');
      if (/\bOVER\s*\(/i.test(cl.masked)) notes.push('OVER (…) makes a window function: it computes across related rows but, unlike GROUP BY, keeps every row. PARTITION BY restarts the calculation per group; ORDER BY inside OVER sets the running order.');
      if (/\b(?:ROW_NUMBER|RANK|DENSE_RANK)\s*\(/i.test(cl.masked)) notes.push('ROW_NUMBER numbers rows with no ties; RANK gives ties the same number and skips; DENSE_RANK gives ties the same number without skipping.');
      if (/\b(?:LAG|LEAD)\s*\(/i.test(cl.masked)) notes.push('LAG and LEAD read the previous or next row in the window order.');
      if (/\bCASE\b/i.test(cl.masked)) notes.push('CASE WHEN turns conditions into values — a label per row, or with SUM/COUNT a conditional count.');
      if (/\bCOALESCE\s*\(/i.test(cl.masked)) notes.push('COALESCE returns the first non-NULL argument.');
      if (/\(\s*SELECT\b/i.test(cl.masked)) notes.push('A subquery in SELECT runs for each output row when it refers to the outer query (correlated).');
      why = (items.length === 1 && /^(?:\w+\.)?\*$/.test(items[0])
        ? `Returns every column${items[0] === '*' ? '' : ` of ${items[0].split('.')[0]}`}. ${notes.join(' ')}`
        : `Returns ${items.length === 1 ? 'one column' : `${items.length} columns`}: ${items.slice(0, 6).join('; ')}${items.length > 6 ? '; …' : ''}. ${notes.join(' ')}`).trim();
    }
    if (name === 'ORDER BY') why = `Sorts by ${t}. ${/\bDESC\b/i.test(cl.masked) ? 'DESC means largest first. ' : ''}This is the only clause that can use the SELECT aliases in every database.`;
    if (name === 'LIMIT') why = `Returns at most ${t} row${t === '1' ? '' : 's'}.${c['ORDER BY'] ? '' : ' There is no ORDER BY, so which rows is not guaranteed.'}`;
    if (name === 'OFFSET') why = `Skips the first ${t} rows.`;
    if (name === 'WINDOW') why = `Defines a named window reused by OVER clauses: ${t}.`;
    steps.push({ clause: name, title, text: why });
  }
  if (c.SETOP) steps.push({ clause: c.SETOP, title: 'Combine with another query', text: `${c.SETOP} stacks the result of a second SELECT under this one. ${/ALL/.test(c.SETOP) ? 'UNION ALL keeps duplicates.' : c.SETOP === 'UNION' ? 'UNION removes duplicates.' : ''}`.trim() });
  const shape = [];
  if (ctes.length) shape.push(`${ctes.length} CTE${ctes.length > 1 ? 's' : ''}`);
  if (c.FROM && /\bJOIN\b/i.test(c.FROM.masked)) shape.push('joins');
  if (c['GROUP BY']) shape.push('grouping');
  if (/\bOVER\s*\(/i.test(masked)) shape.push('window functions');
  if (/(?<!\bAS\s*)\(\s*SELECT\b/i.test(masked)) shape.push('subqueries');
  const summary = `A ${shape.length ? `query with ${shape.join(', ')}` : 'single-table query'}, read in the order the database runs it — which is not the order it is written: FROM and WHERE come before SELECT, and ORDER BY comes last.`;
  return { steps, summary, ctes: cteBodies(text).map(b => ({ name: b.name, steps: explainQuery(b.body).steps })) };
}

// Each CTE's name and body text, in order.
export function cteBodies(sql) {
  const text = String(sql || '');
  const masked = maskSql(text);
  const head = /^\s*WITH\s+(?:RECURSIVE\s+)?/i.exec(masked);
  if (!head) return [];
  const out = [];
  const re = /([A-Za-z_]\w*)\s*(?:\([^()]*\)\s*)?AS\s*(?:(?:NOT\s+)?MATERIALIZED\s*)?\(/gy;
  let i = head[0].length;
  for (;;) {
    re.lastIndex = i;
    const m = re.exec(masked);
    if (!m) break;
    let depth = 1;
    let j = m.index + m[0].length;
    for (; j < masked.length && depth > 0; j++) {
      if (masked[j] === '(') depth++;
      else if (masked[j] === ')') depth--;
    }
    out.push({ name: m[1], body: text.slice(m.index + m[0].length, j - 1) });
    const comma = /^\s*,\s*/.exec(masked.slice(j));
    if (!comma) break;
    i = j + comma[0].length;
  }
  return out;
}
