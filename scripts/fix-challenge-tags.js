// Auto-fix skills[] tags on challenges based on what the solution SQL actually uses.
// Runs the same detection as validate-challenge-tags.js, then rewrites the `skills: [...]`
// array line for each challenge that needs corrections. Reports a diff-style summary.
//
// Applies two kinds of edits:
//   - Remove EXTRANEOUS skills (tag present, SQL doesn't use the construct)
//   - Add MISSING high-confidence tags (construct is obvious in SQL but not in skills[])
//
// Skips ambiguous MISSING cases (e.g., generic "Subquery" when CTE/Derived Table isn't in skills)
// — those get printed as "MANUAL" for human review.
//
// Usage: node scripts/fix-challenge-tags.js [--dry-run]

import fs from 'fs';
import path from 'path';

const __dirname = import.meta.dirname;
const filePath = path.join(__dirname, '..', 'src', 'data', 'challenges.js');
const dryRun = process.argv.includes('--dry-run');
let src = fs.readFileSync(filePath, 'utf8');

// Load challenges by evaluating the file
const fakeWindow = {};
new Function('window', src)(fakeWindow);
const challenges = fakeWindow.challengesData;

// --- EXTRANEOUS detectors: "does the SQL actually use this skill?" ---
// Returns true if the skill IS present, false if NOT, null to skip.
const USES = {
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
  'LEFT JOIN':          s => /\bLEFT\s+(?:OUTER\s+)?JOIN\b/.test(s),
  'RIGHT JOIN':         s => /\bRIGHT\s+(?:OUTER\s+)?JOIN\b/.test(s),
  'INNER JOIN':         s => /\bINNER\s+JOIN\b/.test(s),
  'JOIN':               s => /\bJOIN\b/.test(s),
  'UNION ALL':          s => /\bUNION\s+ALL\b/.test(s),
  'UNION':              s => /\bUNION\b/.test(s),
  'INTERSECT':          s => /\bINTERSECT\b/.test(s),
  'EXCEPT':             s => /\bEXCEPT\b/.test(s),
  'Derived Table':      s => /\bFROM\s*\(\s*SELECT\b/i.test(s),
  'EXISTS':             s => /\bEXISTS\s*\(/.test(s),
  'NOT EXISTS':         s => /\bNOT\s+EXISTS\s*\(/.test(s),
  'IN':                 s => /\bIN\s*\(/.test(s),
  'NOT IN':             s => /\bNOT\s+IN\s*\(/.test(s),
  'BETWEEN':            s => /\bBETWEEN\b/.test(s),
  'LIKE':               s => /\bLIKE\b/.test(s),
  'CASE':               s => /\bCASE\b/.test(s),
  'GROUP BY':           s => /\bGROUP\s+BY\b/.test(s),
  'HAVING':             s => /\bHAVING\b/.test(s),
  'DISTINCT':           s => /\bDISTINCT\b/.test(s),
  'COUNT DISTINCT':     s => /\bCOUNT\s*\(\s*DISTINCT\b/.test(s),
  'WHERE':              s => /\bWHERE\b/.test(s),
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
  'Date Functions':     s => /\b(STRFTIME|DATETIME|JULIANDAY)\s*\(/i.test(s),
  'strftime':           s => /\bSTRFTIME\s*\(/i.test(s),
  'JULIANDAY':          s => /\bJULIANDAY\s*\(/.test(s),
  'COALESCE':           s => /\bCOALESCE\s*\(/.test(s),
  'NULLIF':             s => /\bNULLIF\s*\(/.test(s),
  'IS NULL':            s => /\bIS\s+NULL\b/.test(s),
  'IS NOT NULL':        s => /\bIS\s+NOT\s+NULL\b/.test(s),
  'NULL Handling':      s => /\b(IS\s+NOT?\s+NULL|COALESCE|NULLIF|IFNULL)\b/.test(s),
  'ROUND':              s => /\bROUND\s*\(/.test(s),
  'CAST':               s => /\bCAST\s*\(/.test(s),
  // Skip these — they're meta-labels or too ambiguous to auto-detect
  'Calculated Column':  () => null,
  'Calculated Columns': () => null,
  'Comparison Operators': () => null,
  'Frame Clause':       () => null,
  'ROWS BETWEEN':       () => null,
  'Non-Equi Join':      () => null,
  'Self-Join':          () => null,  // Self-join detection requires same-table aliasing — skip
  'Self Join':          () => null,
  'Set Operations':     () => null,
  'Pattern Matching':   () => null,
  'ABS':                () => null,
  'COUNT':              () => null,  // overloaded — keep as-is
};

// --- MISSING rules: map from SQL-detected construct to canonical tag ---
// Ordered: if a more-specific tag (CTE) is present, don't also require the general (Subquery).
// Detect self-join: FROM <table> <alias1> ... JOIN <same_table> <alias2>
// The "alias" captures must not be SQL keywords that could follow a table name.
const SQL_KEYWORDS = new Set([
  'GROUP','ORDER','HAVING','WHERE','LIMIT','JOIN','ON','UNION','INTERSECT','EXCEPT',
  'AS','LEFT','RIGHT','INNER','OUTER','CROSS','FULL','WINDOW','QUALIFY','FETCH',
  'RETURNING','OFFSET','FROM','SELECT','WITH','USING','NATURAL'
]);
const isAlias = (tok) => tok && !SQL_KEYWORDS.has(tok.toUpperCase());
const detectsSelfJoin = (sol) => {
  // Try every FROM-JOIN pair by scanning with a global regex.
  const re = /FROM\s+(\w+)\s+(\w+)\b[\s\S]*?\bJOIN\s+(\w+)\s+(\w+)\b/gi;
  let m;
  while ((m = re.exec(sol)) !== null) {
    if (!isAlias(m[2]) || !isAlias(m[4])) continue;
    if (m[1].toUpperCase() === m[3].toUpperCase() && m[2].toUpperCase() !== m[4].toUpperCase()) return true;
  }
  return false;
};

const MUST_TAG = [
  { name: 'Self-Join',        patternFn: detectsSelfJoin,            acceptable: ['Self-Join','Self Join'] },
  { name: 'Window Functions', pattern: /\bOVER\s*\(/,                acceptable: ['Window Functions'] },
  { name: 'CTE',              pattern: /\bWITH\s+(?:RECURSIVE\s+)?\w+\s+AS\s*\(/, acceptable: ['CTE','Recursive CTE','WITH'] },
  { name: 'GROUP BY',         pattern: /\bGROUP\s+BY\b/,             acceptable: ['GROUP BY'] },
  { name: 'HAVING',           pattern: /\bHAVING\b/,                 acceptable: ['HAVING'] },
  { name: 'CASE',             pattern: /\bCASE\b/,                   acceptable: ['CASE','CASE WHEN'] },
  { name: 'JOIN',             pattern: /\bJOIN\b/,                   acceptable: ['JOIN','LEFT JOIN','RIGHT JOIN','INNER JOIN','FULL JOIN','CROSS JOIN','Self-Join','Self Join','JOINs','JOIN Tables'] },
  { name: 'UNION',            pattern: /\bUNION\b/,                  acceptable: ['UNION','UNION ALL'] },
  { name: 'String Functions', pattern: /\b(LOWER|UPPER|LENGTH|SUBSTR|TRIM|INSTR|REPLACE|GROUP_CONCAT)\s*\(/, acceptable: ['String Functions','LOWER','UPPER','LENGTH','SUBSTR','SUBSTRING','TRIM','INSTR','REPLACE','GROUP_CONCAT'] },
  { name: 'Date Functions',   pattern: /\b(STRFTIME|DATETIME|JULIANDAY)\s*\(/i, acceptable: ['Date Functions','strftime','JULIANDAY','DATE','DATETIME'] },
  { name: 'BETWEEN',          pattern: /\bBETWEEN\b/,                acceptable: ['BETWEEN'] },
  { name: 'LIKE',             pattern: /\bLIKE\b/,                   acceptable: ['LIKE','Pattern Matching'] },
  { name: 'DISTINCT',         pattern: /\bDISTINCT\b/,               acceptable: ['DISTINCT','COUNT DISTINCT'] },
  { name: 'EXISTS',           pattern: /\bEXISTS\s*\(/,              acceptable: ['EXISTS','NOT EXISTS'] },
  // Scalar subquery: (SELECT ...) in WHERE/SELECT/ON position. If CTE or Derived Table
  // is already tagged, that covers the concept — only flag if neither is present.
  { name: 'Subquery',         pattern: /\(\s*SELECT\b/i,             acceptable: ['Subquery','Subqueries','Correlated Subquery','Derived Table','CTE','Recursive CTE'] },
];

// Strip window-frame `ROWS BETWEEN ... AND ...` clauses so BETWEEN detection doesn't
// false-fire.
const stripFrames = (sol) => sol.replace(/\b(?:ROWS|RANGE)\s+BETWEEN\s+[\s\S]+?\bAND\s+[\s\S]+?\b(?:PRECEDING|FOLLOWING|ROW)\b/g, 'WINDOW_FRAME');

// --- Compute per-challenge skill correction ---
const corrections = [];
for (const c of challenges) {
  if (!c || !c.solution) continue;
  const sol = c.solution.toUpperCase();
  const solStripped = stripFrames(sol);
  const originalSkills = (c.skills || []).slice();
  const added = [];
  const removed = [];

  // EXTRANEOUS — remove
  const kept = originalSkills.filter(skill => {
    const check = USES[skill];
    if (check === undefined) return true;             // unknown — leave alone
    const result = check(sol);
    if (result === null) return true;                 // detector opted out
    if (result === false) {
      removed.push(skill);
      return false;
    }
    return true;
  });

  // MISSING — add (only high-confidence: the general canonical tags)
  const newSkills = kept.slice();
  for (const rule of MUST_TAG) {
    const hit = rule.patternFn ? rule.patternFn(solStripped) : rule.pattern.test(solStripped);
    if (hit) {
      const alreadyTagged = newSkills.some(s => rule.acceptable.includes(s));
      if (!alreadyTagged) {
        newSkills.push(rule.name);
        added.push(rule.name);
      }
    }
  }

  if (added.length === 0 && removed.length === 0) continue;
  corrections.push({ id: c.id, title: c.title, oldSkills: originalSkills, newSkills, added, removed });
}

console.log(`Plan: correct ${corrections.length} challenges\n`);
let adds = 0, removes = 0;
for (const c of corrections) {
  adds += c.added.length;
  removes += c.removed.length;
  const a = c.added.length ? ` +[${c.added.join(', ')}]` : '';
  const r = c.removed.length ? ` -[${c.removed.join(', ')}]` : '';
  console.log(`  #${c.id} ${c.title}${a}${r}`);
}
console.log(`\nTotal additions: ${adds}  Removals: ${removes}`);

if (dryRun) {
  console.log('\n(dry run — no file changes)');
  process.exit(0);
}

// --- Apply edits ---
// Rewrite each corrected challenge's `skills: [...]` line in the source.
// The source uses JSON-array style for skills. Match by id, then by skills line within that block.
let edited = 0;
for (const c of corrections) {
  // Find the block for this id
  const idPattern = new RegExp(`(id:\\s*${c.id},[\\s\\S]*?)(skills:\\s*\\[[^\\]]*\\])`);
  const match = src.match(idPattern);
  if (!match) {
    console.error(`  ! could not locate skills line for #${c.id}`);
    continue;
  }
  const oldLine = match[2];
  const newLine = `skills: ${JSON.stringify(c.newSkills)}`;
  src = src.replace(oldLine, newLine);
  edited++;
}

fs.writeFileSync(filePath, src, 'utf8');
console.log(`\nEdited ${edited} / ${corrections.length} challenges in ${filePath}`);
