// A small, deterministic SQL layout for DISPLAY (2026-09-19, founder QA item
// 22: some reference solutions render as one long line and others as a
// formatted block). It never changes a token — only whitespace between them —
// and it leaves anything already laid out on several lines alone, because an
// author who broke the lines meant it.
//
// Rules, applied only at parenthesis depth 0 of each statement / subquery
// level and never inside quotes:
//   - a new line before each main clause (FROM, WHERE, GROUP BY, HAVING,
//     ORDER BY, LIMIT, UNION, the JOIN family, WINDOW)
//   - the SELECT list broken at its top-level commas, indented
//   - WITH … AS ( … ) bodies indented one level, one CTE per block

const CLAUSES = [
  'LEFT OUTER JOIN', 'RIGHT OUTER JOIN', 'FULL OUTER JOIN',
  'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'INNER JOIN', 'CROSS JOIN', 'JOIN',
  'GROUP BY', 'ORDER BY', 'UNION ALL', 'UNION', 'EXCEPT', 'INTERSECT',
  'FROM', 'WHERE', 'HAVING', 'LIMIT', 'WINDOW',
];

function tokenize(sql) {
  // Split into quoted strings, parens, commas and plain runs.
  const out = [];
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === ch && sql[j + 1] === ch) { j += 2; continue; }
        if (sql[j] === ch) break;
        j++;
      }
      out.push({ t: 'str', v: sql.slice(i, j + 1) });
      i = j + 1;
    } else if (ch === '(' || ch === ')' || ch === ',') {
      out.push({ t: ch, v: ch });
      i++;
    } else {
      let j = i;
      while (j < sql.length && !"'\"`(),".includes(sql[j])) j++;
      out.push({ t: 'txt', v: sql.slice(i, j) });
      i = j;
    }
  }
  return out;
}

/** Lay out one-line SQL for reading. Multi-line input is returned as is. */
export function formatSqlForDisplay(sql) {
  const src = String(sql || '').trim();
  if (!src || src.includes('\n')) return src;
  const toks = tokenize(src);
  const pad = (n) => '  '.repeat(n);
  // Each open paren remembers whether it holds a subquery (SELECT/WITH first).
  const stack = [];           // { sub: boolean, base: number }
  let depth = 0;              // indentation level of the current statement
  let inSelectList = false;   // between SELECT and its FROM, at this level
  const selectStack = [];
  let out = '';
  const clauseRe = new RegExp(`\\b(${CLAUSES.map(c => c.replace(/ /g, '\\s+')).join('|')})\\b`, 'gi');

  const emitText = (text) => {
    let s = text.replace(/\s+/g, ' ');
    // Inside a plain parenthesis — OVER (…), a function call, an IN list —
    // nothing breaks: ORDER BY inside OVER() is not a clause of the query.
    if (stack.length > 0 && !stack[stack.length - 1].sub) { out += s; return; }
    // Break before clauses; SELECT at the start of a (sub)statement opens a list.
    s = s.replace(clauseRe, (m, _k, off) => {
      const kw = m.replace(/\s+/g, ' ');
      if (/^FROM$/i.test(kw)) inSelectList = false;
      return `\n${pad(depth)}${kw}`;
    });
    s = s.replace(/\bSELECT\s+(DISTINCT\s+)?/gi, (m) => {
      inSelectList = true;
      return `${m.trim()}\n${pad(depth + 1)}`;
    });
    // Right after a line break the run's own leading space is noise.
    if (/\n *$/.test(out)) s = s.replace(/^ +/, '');
    out += s;
  };

  for (let k = 0; k < toks.length; k++) {
    const tk = toks[k];
    if (tk.t === 'str') { out += tk.v; continue; }
    if (tk.t === 'txt') { emitText(tk.v); continue; }
    if (tk.t === '(') {
      const next = toks.slice(k + 1).find(x => x.t !== 'txt' || x.v.trim());
      const sub = !!next && next.t === 'txt' && /^\s*(select|with)\b/i.test(next.v);
      stack.push({ sub, depth });
      selectStack.push(inSelectList);
      out += '(';
      if (sub) { depth += 1; inSelectList = false; out += `\n${pad(depth)}`; }
      continue;
    }
    if (tk.t === ')') {
      const top = stack.pop() || { sub: false, depth };
      if (top.sub) { depth = top.depth; out = out.replace(/\s+$/, ''); out += `\n${pad(depth)})`; }
      else out += ')';
      inSelectList = selectStack.pop() || false;
      continue;
    }
    if (tk.t === ',') {
      const inParen = stack.length > 0 && !stack[stack.length - 1].sub;
      if (!inParen && inSelectList) { out = out.replace(/\s+$/, ''); out += `,\n${pad(depth + 1)}`; }
      else if (!inParen && stack.length === 0 && /\bwith\b/i.test(out) && !inSelectList) { out = out.replace(/\s+$/, ''); out += ',\n'; }
      else out += ',';
      continue;
    }
  }
  return out
    .split('\n')
    .map(l => l.replace(/\s+$/, ''))
    .map((l, i, arr) => (i > 0 && /^\s*$/.test(l) ? null : l))
    .filter(l => l !== null)
    .join('\n')
    .replace(/\n\s*\n/g, '\n')
    .replace(/^\s+/, '')
    .replace(/[ \t]+,/g, ',')
    .replace(/,(\S)/g, ', $1')
    // The main SELECT after a WITH block starts its own line.
    .replace(/^( *)\) (SELECT(?: DISTINCT)?)$/gm, '$1)\n$1$2');
}
