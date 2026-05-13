#!/usr/bin/env node
// Find challenges where the SOLUTION uses ORDER BY but the DESCRIPTION
// doesn't tell the user to order/sort. These create silent grader failures:
// student writes a correct SELECT, gets unordered rows, fails the check.

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

const win = {};
global.window = win;
eval(fs.readFileSync(path.join(root, 'src/data/challenges.js'), 'utf8').replace(/window\./g, 'win.'));

const challenges = win.challengesData;

// Match a real ORDER BY (not inside a window function OVER(...))
function solutionHasOrderBy(sol) {
  if (!sol) return null;
  const s = sol.toUpperCase();
  // Strip OVER (...) windows so we don't count their ORDER BY clauses
  const stripped = s.replace(/OVER\s*\([^)]*\)/g, '');
  if (!/\bORDER\s+BY\b/.test(stripped)) return null;
  // Extract the trailing ORDER BY clause (very crude — fine for diagnosis)
  const m = stripped.match(/ORDER\s+BY\s+([^)]+?)(?:\s+LIMIT\b|\s*$)/);
  return m ? m[1].trim() : 'present';
}

function descTellsToOrder(desc) {
  if (!desc) return false;
  const d = desc.toLowerCase();
  // Direct "order by" / "order the X by" / "ordered by"
  if (/\border(?:ed)?\s+(?:\w+\s+)*by\b/.test(d)) return true;
  // "sort by" / "sorted by"
  if (/\bsort(?:ed)?\s+by\b/.test(d)) return true;
  // "sort alphabetically" / "sort chronologically" / "sorted alphabetically"
  if (/\bsort(?:ed)?\s+(?:alphabetic|chronologic|numeric|ascend|descend)/.test(d)) return true;
  // "in ascending order" / "in descending order"
  if (/\bin\s+(?:ascending|descending)\s+order\b/.test(d)) return true;
  // "ascending/descending order"
  if (/\b(?:ascending|descending)\s+order\b/.test(d)) return true;
  return false;
}

function descTrTellsToOrder(desc_tr) {
  if (!desc_tr) return false;
  const d = desc_tr.toLowerCase();
  if (/sırala/.test(d)) return true;            // TR: "sırala" = sort
  if (/sıraya/.test(d)) return true;
  if (/azalan|artan/.test(d)) return true;      // descending / ascending
  return false;
}

const problems = [];

for (const ch of challenges) {
  const orderBy = solutionHasOrderBy(ch.solution);
  if (!orderBy) continue;
  const enSays = descTellsToOrder(ch.description);
  const trSays = descTrTellsToOrder(ch.description_tr);
  if (!enSays) {
    problems.push({
      id: ch.id,
      title: ch.title,
      orderByClause: orderBy,
      en_ok: enSays,
      tr_ok: trSays,
      desc_snippet: (ch.description || '').slice(0, 120) + '…',
    });
  }
}

console.log(`Scanned ${challenges.length} challenges`);
console.log(`Found ${problems.length} where solution ORDER BYs but English description doesn't say to:\n`);

for (const p of problems) {
  console.log(`─── ID ${p.id} — ${p.title}`);
  console.log(`    ORDER BY: ${p.orderByClause}`);
  console.log(`    EN tells to order? ${p.en_ok}    TR tells to order? ${p.tr_ok}`);
  console.log(`    EN desc: ${p.desc_snippet}`);
  console.log();
}

if (problems.length) process.exit(0);
