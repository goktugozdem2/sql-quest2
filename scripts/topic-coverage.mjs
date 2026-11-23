#!/usr/bin/env node
// Topic coverage: how many challenges in the bank actually USE each SQL topic
// in their reference solution (C6, 2026-11-22).
//
// "Use" means a parsed statement or clause, never a word: comments and string
// literals are stripped first, the solution is split into statements on
// top-level semicolons, and each statement is classified by its leading
// keyword (a WITH prefix is looked through). So a description that says
// "update the report" or a literal 'DELETE' in a CASE counts for nothing.
//
// Sources, all bundled by scripts/data-files.js:
//   bank   — challenges.js ∪ sector-challenges.js, by id (the same union the
//            question pages use: loadQuestionBank in question-slugs.mjs)
//   mocks  — every mock interview question with a written solution
//   daily  — the daily challenges' core solutions
//   30-day — the 30-day challenge's questions with a solution
// The headline table counts the bank: a challenge counts once per topic.
//
//   node scripts/topic-coverage.mjs          # Markdown table
//   node scripts/topic-coverage.mjs --json   # machine-readable

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';
import { loadQuestionBank } from './question-slugs.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');

/** Remove comments and the contents of string literals; keep identifiers. */
export function stripSql(sql) {
  let out = '';
  const s = String(sql || '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '-' && s[i + 1] === '-') { while (i < s.length && s[i] !== '\n') i++; out += '\n'; continue; }
    if (ch === '/' && s[i + 1] === '*') { i += 2; while (i < s.length && !(s[i] === '*' && s[i + 1] === '/')) i++; i++; out += ' '; continue; }
    if (ch === "'") { i++; while (i < s.length) { if (s[i] === "'" && s[i + 1] === "'") { i += 2; continue; } if (s[i] === "'") break; i++; } out += "''"; continue; }
    out += ch;
  }
  return out;
}

/** Split stripped SQL on semicolons at parenthesis depth 0 (and outside BEGIN…END of a trigger). */
export function splitStatements(sql) {
  const s = stripSql(sql);
  const parts = [];
  let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ';' && depth === 0) { if (cur.trim()) parts.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

/** Statement kind from its leading keyword(s); a WITH prefix is looked through. */
export function statementKind(stmt) {
  const t = stmt.replace(/\s+/g, ' ').trim().toUpperCase();
  if (/^WITH\b/.test(t)) {
    // the main statement follows the CTE list; find a top-level DML keyword after a closing paren
    let depth = 0;
    for (let i = 0; i < t.length; i++) {
      if (t[i] === '(') depth++;
      else if (t[i] === ')') depth--;
      else if (depth === 0) {
        const m = /^(INSERT|UPDATE|DELETE|REPLACE|SELECT)\b/.exec(t.slice(i));
        if (m && i > 0 && /[\s)]/.test(t[i - 1])) return m[1];
      }
    }
    return 'SELECT';
  }
  const m = /^(CREATE\s+(?:TEMP\s+|TEMPORARY\s+)?(?:UNIQUE\s+)?(?:TABLE|INDEX|VIEW|TRIGGER)|ALTER\s+TABLE|DROP\s+\w+|INSERT|UPDATE|DELETE|REPLACE|MERGE|BEGIN|COMMIT|END|ROLLBACK|SAVEPOINT|RELEASE|EXPLAIN|PRAGMA|SELECT|VALUES)\b/.exec(t);
  if (!m) return 'OTHER';
  return m[1].replace(/\s+/g, ' ').replace(/ (TEMP|TEMPORARY|UNIQUE) /, ' ');
}

const kinds = stmts => stmts.map(statementKind);
const code = stmts => stmts.join(' ;\n').toUpperCase();

// Each topic: a predicate over (statements, kinds, CODE uppercased without strings/comments).
export const TOPICS = [
  { id: 'create_table', label: 'CREATE TABLE, constraints', test: (s, k) => k.some(x => x === 'CREATE TABLE' || x === 'ALTER TABLE') },
  { id: 'index_plan', label: 'CREATE INDEX, query plans', test: (s, k) => k.some(x => x === 'CREATE INDEX' || x === 'EXPLAIN') },
  { id: 'views', label: 'Views', test: (s, k) => k.includes('CREATE VIEW') },
  { id: 'upsert', label: 'UPSERT (ON CONFLICT / REPLACE / MERGE)', test: (s, k, c) => k.includes('REPLACE') || k.includes('MERGE') || (k.includes('INSERT') && /\bON\s+CONFLICT\b|\bINSERT\s+OR\s+REPLACE\b/.test(c)) },
  { id: 'transactions', label: 'Transactions (BEGIN / COMMIT / ROLLBACK)', test: (s, k) => k.some(x => ['BEGIN', 'COMMIT', 'END', 'ROLLBACK', 'SAVEPOINT', 'RELEASE'].includes(x)) },
  { id: 'insert_values', label: 'INSERT … VALUES', test: (s, k) => s.some((x, i) => k[i] === 'INSERT' && !/\bSELECT\b/i.test(x)) },
  { id: 'insert_select', label: 'INSERT … SELECT', test: (s, k) => s.some((x, i) => k[i] === 'INSERT' && /\bSELECT\b/i.test(x)) },
  { id: 'update', label: 'UPDATE', test: (s, k) => k.includes('UPDATE') },
  { id: 'delete', label: 'DELETE', test: (s, k) => k.includes('DELETE') },
  { id: 'except', label: 'EXCEPT', test: (s, k, c) => /\bEXCEPT\b/.test(c) },
  { id: 'intersect', label: 'INTERSECT', test: (s, k, c) => /\bINTERSECT\b/.test(c) },
  { id: 'json', label: 'JSON functions', test: (s, k, c) => /\bJSON(?:B)?_\w+\s*\(|\bJSON\s*\(|->>?/.test(c) },
  { id: 'union', label: 'UNION / UNION ALL', test: (s, k, c) => /\bUNION\b/.test(c) },
  { id: 'recursive_cte', label: 'Recursive CTEs', test: (s, k, c) => /\bWITH\s+RECURSIVE\b/.test(c) },
  { id: 'pivot', label: 'Pivot (CASE inside an aggregate)', test: (s, k, c) => /\b(SUM|COUNT|AVG|MAX|MIN|TOTAL)\s*\(\s*(DISTINCT\s+)?CASE\b/.test(c) },
];

export function topicsOf(sql) {
  const stmts = splitStatements(sql);
  const k = kinds(stmts);
  const c = code(stmts);
  return TOPICS.filter(t => t.test(stmts, k, c)).map(t => t.id);
}

function loadOtherSources() {
  const ctx = { window: {}, console: { log() {}, warn() {} } };
  vm.createContext(ctx);
  for (const f of ['mock-interviews.js', 'daily-challenges-new.js', 'thirty-day-challenge.js', 'thirty-day-complete-1.js', 'thirty-day-complete-2.js']) {
    const p = path.join(ROOT, 'src/data', f);
    if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), ctx);
  }
  const w = ctx.window;
  const mocks = (w.mockInterviewsData || []).flatMap(m => (m.questions || []).filter(q => typeof q.solution === 'string').map(q => ({ id: `${m.id}/${q.id}`, solution: q.solution })));
  const daily = (w.dailyChallengesData || []).filter(d => typeof d.core?.solution === 'string').map(d => ({ id: `daily/${d.id}`, solution: d.core.solution }));
  const thirty = [];
  const walk = (o, at) => {
    if (!o || typeof o !== 'object') return;
    if (typeof o.solution === 'string' && /\bSELECT|INSERT|UPDATE|DELETE|CREATE\b/i.test(o.solution)) thirty.push({ id: at, solution: o.solution });
    for (const [k, v] of Object.entries(o)) if (v && typeof v === 'object') walk(v, `${at}/${k}`);
  };
  walk(w.sqlChallenge30Days, '30day');
  return { mocks, daily, thirty };
}

/** Coverage per topic: { rows: [{id,label,bank,bankIds,mocks,daily,thirty}], bankSize, zero: [labels] } */
export function measureCoverage() {
  const { bank } = loadQuestionBank();
  const other = loadOtherSources();
  const per = list => list.map(x => ({ id: x.id, topics: topicsOf(x.solution) }));
  const bankT = per(bank.filter(c => typeof c.solution === 'string'));
  const mocksT = per(other.mocks), dailyT = per(other.daily), thirtyT = per(other.thirty);
  const count = (list, tid) => list.filter(x => x.topics.includes(tid));
  const rows = TOPICS.map(t => ({
    id: t.id,
    label: t.label,
    bank: count(bankT, t.id).length,
    bankIds: count(bankT, t.id).map(x => x.id),
    mocks: count(mocksT, t.id).length,
    daily: count(dailyT, t.id).length,
    thirty: count(thirtyT, t.id).length,
  }));
  return {
    bankSize: bank.length,
    sourceSizes: { mocks: other.mocks.length, daily: other.daily.length, thirty: other.thirty.length },
    rows,
    zero: rows.filter(r => r.bank === 0).map(r => r.label),
  };
}

export function toMarkdown(cov) {
  const lines = [
    `Bank: ${cov.bankSize} challenges (distinct ids). Also scanned: ${cov.sourceSizes.mocks} mock questions, ${cov.sourceSizes.daily} daily cores, ${cov.sourceSizes.thirty} 30-day questions.`,
    '',
    '| Topic | Bank | Mocks | Daily | 30-day | Bank ids |',
    '|---|---:|---:|---:|---:|---|',
    ...cov.rows.map(r => `| ${r.label} | ${r.bank === 0 ? '**0**' : r.bank} | ${r.mocks} | ${r.daily} | ${r.thirty} | ${r.bankIds.length > 12 ? r.bankIds.slice(0, 12).join(', ') + ', …' : r.bankIds.join(', ') || '—'} |`),
    '',
    `Zero coverage in the bank: ${cov.zero.length ? cov.zero.join('; ') : 'none'}`,
  ];
  return lines.join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const cov = measureCoverage();
  console.log(process.argv.includes('--json') ? JSON.stringify(cov, null, 2) : toMarkdown(cov));
}
