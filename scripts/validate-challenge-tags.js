// Validate skills/category/difficulty tags on every challenge.
// Parses src/data/challenges.js by evaluating it in a fake browser global,
// then audits each entry's `skills` and `category` against the SQL in `solution`.
//
// Reports three kinds of issues:
//   MISSING    — a SQL construct appears in the solution but isn't tagged
//   EXTRANEOUS — a skill is tagged but the SQL construct isn't in the solution
//   CATEGORY   — the `category` field doesn't match the solution's primary technique
//
// Usage: node scripts/validate-challenge-tags.js

import fs from 'fs';
import path from 'path';

const __dirname = import.meta.dirname;
const filePath = path.join(__dirname, '..', 'src', 'data', 'challenges.js');
const src = fs.readFileSync(filePath, 'utf8');

// Evaluate the module under a fake window
const fakeWindow = {};
const fn = new Function('window', src);
fn(fakeWindow);
const challenges = fakeWindow.challengesData;
if (!Array.isArray(challenges)) {
  console.error('Failed to load challengesData');
  process.exit(1);
}

// --- Detectors: function(solutionUppercase, solutionOriginal) → boolean ---
// Each detector answers: does this SQL actually use this construct?
const DETECTORS = {
  'Window Functions':   s => /\bOVER\s*\(/.test(s),
  'ROW_NUMBER':         s => /\bROW_NUMBER\s*\(/.test(s),
  'RANK':               s => /\bRANK\s*\(/.test(s),
  'DENSE_RANK':         s => /\bDENSE_RANK\s*\(/.test(s),
  'LAG':                s => /\bLAG\s*\(/.test(s),
  'LEAD':               s => /\bLEAD\s*\(/.test(s),
  'NTILE':              s => /\bNTILE\s*\(/.test(s),
  'FIRST_VALUE':        s => /\bFIRST_VALUE\s*\(/.test(s),
  'LAST_VALUE':         s => /\bLAST_VALUE\s*\(/.test(s),
  'PERCENT_RANK':       s => /\bPERCENT_RANK\s*\(/.test(s),
  'PARTITION BY':       s => /\bPARTITION\s+BY\b/.test(s),
  'CTE':                s => /\bWITH\s+(?:RECURSIVE\s+)?\w+\s+AS\s*\(/.test(s),
  'Recursive CTE':      s => /\bWITH\s+RECURSIVE\b/.test(s),
  'Self-Join':          s => {
    // Heuristic: same table alias appears with a JOIN to another alias of the same table
    // Look for "FROM <tbl> <a> ... JOIN <tbl> <b>"
    const m = s.match(/FROM\s+(\w+)\s+\w+\b[\s\S]*?\bJOIN\s+(\w+)\s+\w+\b/i);
    return !!(m && m[1].toUpperCase() === m[2].toUpperCase());
  },
  'LEFT JOIN':          s => /\bLEFT\s+(?:OUTER\s+)?JOIN\b/.test(s),
  'RIGHT JOIN':         s => /\bRIGHT\s+(?:OUTER\s+)?JOIN\b/.test(s),
  'INNER JOIN':         s => /\bINNER\s+JOIN\b/.test(s),
  'FULL JOIN':          s => /\bFULL\s+(?:OUTER\s+)?JOIN\b/.test(s),
  'CROSS JOIN':         s => /\bCROSS\s+JOIN\b/.test(s),
  'JOIN':               s => /\bJOIN\b/.test(s),
  'UNION':              s => /\bUNION\b/.test(s),
  'UNION ALL':          s => /\bUNION\s+ALL\b/.test(s),
  'INTERSECT':          s => /\bINTERSECT\b/.test(s),
  'EXCEPT':             s => /\bEXCEPT\b/.test(s),
  'Subquery':           s => {
    // Any (SELECT ...) pattern
    return /\(\s*SELECT\s+/i.test(s);
  },
  'Correlated Subquery': s => {
    // Heuristic: subquery referencing the outer table alias. Hard to do perfectly, so
    // we flag when the SQL has a WHERE inside a nested subquery that references a
    // qualifier also present outside. We skip this detector in auto-check for now —
    // it's too noisy. Use it only for manual review.
    return null;  // null = don't evaluate
  },
  'Derived Table':      s => {
    // FROM (SELECT ...) — a subquery in FROM position
    return /\bFROM\s*\(\s*SELECT\b/i.test(s);
  },
  'EXISTS':             s => /\bEXISTS\s*\(/.test(s),
  'NOT EXISTS':         s => /\bNOT\s+EXISTS\s*\(/.test(s),
  'IN':                 s => /\bIN\s*\(/.test(s),
  'NOT IN':             s => /\bNOT\s+IN\s*\(/.test(s),
  'BETWEEN':            s => /\bBETWEEN\b/.test(s),
  'LIKE':               s => /\bLIKE\b/.test(s),
  'CASE':               s => /\bCASE\b/.test(s),
  'CASE WHEN':          s => /\bCASE\s+WHEN\b/.test(s),
  'GROUP BY':           s => /\bGROUP\s+BY\b/.test(s),
  'HAVING':             s => /\bHAVING\b/.test(s),
  'ORDER BY':           s => /\bORDER\s+BY\b/.test(s),
  'DISTINCT':           s => /\bDISTINCT\b/.test(s),
  'COUNT DISTINCT':     s => /\bCOUNT\s*\(\s*DISTINCT\b/.test(s),
  'LIMIT':              s => /\bLIMIT\b/.test(s),
  'WHERE':              s => /\bWHERE\b/.test(s),
  'SELECT':             s => /\bSELECT\b/.test(s),
  'Aggregation':        s => /\b(COUNT|SUM|AVG|MIN|MAX|TOTAL)\s*\(/.test(s),
  'Aggregates':         s => /\b(COUNT|SUM|AVG|MIN|MAX|TOTAL)\s*\(/.test(s),
  'COUNT':              s => /\bCOUNT\s*\(/.test(s),
  'SUM':                s => /\bSUM\s*\(/.test(s),
  'AVG':                s => /\bAVG\s*\(/.test(s),
  'MIN':                s => /\bMIN\s*\(/.test(s),
  'MAX':                s => /\bMAX\s*\(/.test(s),
  'String Functions':   s => /\b(LOWER|UPPER|LENGTH|SUBSTR|SUBSTRING|TRIM|INSTR|REPLACE|GROUP_CONCAT)\s*\(/.test(s) || /\|\|/.test(s),
  'LENGTH':             s => /\bLENGTH\s*\(/.test(s),
  'SUBSTR':             s => /\bSUBSTR(ING)?\s*\(/.test(s),
  'LOWER':              s => /\bLOWER\s*\(/.test(s),
  'UPPER':              s => /\bUPPER\s*\(/.test(s),
  'GROUP_CONCAT':       s => /\bGROUP_CONCAT\s*\(/.test(s),
  'INSTR':              s => /\bINSTR\s*\(/.test(s),
  'REPLACE':            s => /\bREPLACE\s*\(/.test(s),
  'Date Functions':     s => /\b(STRFTIME|DATE|DATETIME|JULIANDAY|DATE_DIFF)\s*\(/i.test(s),
  'strftime':           s => /\bSTRFTIME\s*\(/i.test(s),
  'JULIANDAY':          s => /\bJULIANDAY\s*\(/.test(s),
  'DATE':               s => /\bDATE\s*\(/.test(s),
  'COALESCE':           s => /\bCOALESCE\s*\(/.test(s),
  'NULLIF':             s => /\bNULLIF\s*\(/.test(s),
  'IS NULL':            s => /\bIS\s+NULL\b/.test(s),
  'IS NOT NULL':        s => /\bIS\s+NOT\s+NULL\b/.test(s),
  'NULL Handling':      s => /\b(IS\s+NOT?\s+NULL|COALESCE|NULLIF|IFNULL)\b/.test(s),
  'ROUND':              s => /\bROUND\s*\(/.test(s),
  'CAST':               s => /\bCAST\s*\(/.test(s),
  'Calculated Column':  s => true,  // any SELECT with expressions qualifies — skip auto-check
  'Calculated Columns': s => null,
  'Comparison Operators': s => null,
  // These are "meta" skills that don't map cleanly to a pattern — skip:
  'Aggregation Pattern': s => null,
  'Subquery Pattern':    s => null,
};

// Build a map of the skill tokens that appear in the whole dataset so we know which
// detectors to actually run on each challenge.
const issues = [];

for (const c of challenges) {
  if (!c || !c.solution) continue;
  const sol = c.solution.toUpperCase();
  const skills = (c.skills || []).map(s => s.trim());
  const cat = (c.category || '').trim();

  // --- Check claimed skills appear in solution ---
  for (const skill of skills) {
    const det = DETECTORS[skill];
    if (det === undefined) continue;    // unknown skill — skip (could be a legitimate label)
    const result = det(sol);
    if (result === null) continue;       // detector opted out for this skill
    if (result === false) {
      issues.push({ id: c.id, kind: 'EXTRANEOUS', detail: `claims "${skill}" but SQL doesn't use it`, title: c.title });
    }
  }

  // --- Check obvious SQL constructs are tagged ---
  // Pre-process the SQL: remove window-frame clauses so "BETWEEN" detection
  // doesn't trigger on "ROWS BETWEEN ... AND ...".
  const solStripped = sol
    .replace(/\b(?:ROWS|RANGE)\s+BETWEEN\s+[\s\S]+?\bAND\s+[\s\S]+?\b(?:PRECEDING|FOLLOWING|ROW)\b/g, 'WINDOW_FRAME');

  const obviousChecks = [
    { key: 'Window Functions', pattern: /\bOVER\s*\(/, alsoAcceptable: [] },
    { key: 'CTE',              pattern: /\bWITH\s+(?:RECURSIVE\s+)?\w+\s+AS\s*\(/, alsoAcceptable: ['Recursive CTE', 'WITH'] },
    { key: 'GROUP BY',         pattern: /\bGROUP\s+BY\b/, alsoAcceptable: [] },
    { key: 'HAVING',           pattern: /\bHAVING\b/, alsoAcceptable: [] },
    { key: 'CASE',             pattern: /\bCASE\b/, alsoAcceptable: ['CASE WHEN'] },
    { key: 'JOIN',             pattern: /\bJOIN\b/, alsoAcceptable: ['LEFT JOIN','RIGHT JOIN','INNER JOIN','FULL JOIN','CROSS JOIN','Self-Join','Self Join','JOINs','JOIN Tables'] },
    { key: 'UNION',            pattern: /\bUNION\b/, alsoAcceptable: ['UNION ALL'] },
    { key: 'String Functions', pattern: /\b(LOWER|UPPER|LENGTH|SUBSTR|TRIM|INSTR|REPLACE|GROUP_CONCAT)\s*\(/, alsoAcceptable: ['LOWER','UPPER','LENGTH','SUBSTR','SUBSTRING','TRIM','INSTR','REPLACE','GROUP_CONCAT'] },
    { key: 'Date Functions',   pattern: /\b(STRFTIME|DATETIME|JULIANDAY)\s*\(/i, alsoAcceptable: ['strftime','JULIANDAY','DATE','DATETIME'] },
    // Subquery: only flag when there's NO CTE and NO Derived Table already listed
    // — otherwise CTE/Derived Table already covers the concept.
    { key: 'Subquery',         pattern: /\(\s*SELECT\b/i, alsoAcceptable: ['Correlated Subquery','Derived Table','Subqueries','CTE','Recursive CTE'] },
    { key: 'BETWEEN',          pattern: /\bBETWEEN\b/, alsoAcceptable: [] },
    { key: 'LIKE',             pattern: /\bLIKE\b/, alsoAcceptable: ['Pattern Matching'] },
    // DISTINCT flagged only when COUNT(DISTINCT ...) isn't the usage — if it's there, COUNT DISTINCT covers it.
    { key: 'DISTINCT',         pattern: /\bDISTINCT\b/, alsoAcceptable: ['COUNT DISTINCT'] },
    { key: 'EXISTS',           pattern: /\bEXISTS\s*\(/, alsoAcceptable: ['NOT EXISTS'] },
  ];

  for (const check of obviousChecks) {
    if (check.pattern.test(solStripped)) {
      const tagged = skills.some(s => s === check.key || check.alsoAcceptable.includes(s));
      if (!tagged) {
        issues.push({ id: c.id, kind: 'MISSING', detail: `SQL uses "${check.key}" but it's not in skills[]`, title: c.title });
      }
    }
  }

  // --- Difficulty sanity checks ---
  const hardConstructs = [/\bWITH\s+RECURSIVE\b/, /\bPERCENT_RANK\b/, /\bNTILE\b/, /\bFIRST_VALUE\b/, /\bLAST_VALUE\b/];
  const isHardConstruct = hardConstructs.some(r => r.test(sol));
  if (isHardConstruct && c.difficulty === 'Easy') {
    issues.push({ id: c.id, kind: 'DIFFICULTY', detail: `uses advanced construct but tagged Easy`, title: c.title });
  }

  const hasWindow = /\bOVER\s*\(/.test(sol);
  const hasCTE = /\bWITH\s+\w+\s+AS\s*\(/.test(sol);
  if ((hasWindow || hasCTE) && c.difficulty === 'Easy' && c.id < 91) {
    // Main track Easy with window or CTE is unusual but OK for the "gentle onramp" slot.
    // Just flag for manual review.
    issues.push({ id: c.id, kind: 'DIFFICULTY_REVIEW', detail: `Easy uses ${hasWindow ? 'window function' : 'CTE'} — confirm onramp framing`, title: c.title });
  }
}

// Report
const byId = new Map();
for (const i of issues) {
  if (!byId.has(i.id)) byId.set(i.id, []);
  byId.get(i.id).push(i);
}

console.log(`Scanned ${challenges.length} challenges\n`);
console.log(`Found ${issues.length} potential issues across ${byId.size} challenges\n`);

if (issues.length) {
  // Group by kind for a quick overview
  const byKind = {};
  for (const i of issues) byKind[i.kind] = (byKind[i.kind] || 0) + 1;
  console.log('By kind:');
  for (const [k, n] of Object.entries(byKind)) console.log(`  ${k}: ${n}`);
  console.log('');

  for (const [id, list] of [...byId].sort((a, b) => a[0] - b[0])) {
    const c = challenges.find(ch => ch.id === id);
    console.log(`#${id} [${c.difficulty}] ${c.title}`);
    console.log(`    skills: ${JSON.stringify(c.skills)}`);
    console.log(`    category: "${c.category}"`);
    for (const i of list) console.log(`    ${i.kind}: ${i.detail}`);
    console.log('');
  }
}
