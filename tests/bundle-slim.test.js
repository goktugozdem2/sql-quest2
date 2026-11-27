// The app bundle slim (2026-11-27). public/app.js had reached 436 kB gzipped
// against a 442 kB budget. Two page registries rode along in it for a few
// values: src/data/company-interviews.js (every sourced format row, ~15.7 kB
// gzipped, for one Set of 15 names) and src/data/sql-patterns.js (the trap
// pages' copy and queries, for a slug → mock map). The app now imports a
// generated slice of each (scripts/build-app-data-slices.mjs →
// src/data/app-data-slices.js). The weekly report's last inline date helpers
// were replaced by the util's own exports.
//
// This file keeps all of it from coming back: the slice must equal what the
// registries say, the app must not import the registries, and no util export
// may be re-declared inline in app.jsx beyond the mirrors that were already
// there on 2026-11-27.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { renderAppDataSlices } from '../scripts/build-app-data-slices.mjs';
import { SOURCED_COMPANY_NAMES as REGISTRY_NAMES } from '../src/data/company-interviews.js';
import { SQL_PATTERNS, PATTERN_FOR_MOCK_QUESTION as REGISTRY_TRAP_MAP } from '../src/data/sql-patterns.js';
import { SOURCED_COMPANY_NAMES, SQL_PATTERN_LINKS, PATTERN_FOR_MOCK_QUESTION } from '../src/data/app-data-slices.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const app = read('src/app.jsx');

describe('the generated data slices equal their registries', () => {
  it('src/data/app-data-slices.js is what the generator writes now (run node scripts/build-app-data-slices.mjs)', () => {
    expect(read('src/data/app-data-slices.js')).toBe(renderAppDataSlices());
  });

  it('SOURCED_COMPANY_NAMES is the registry set', () => {
    expect([...SOURCED_COMPANY_NAMES].sort()).toEqual([...REGISTRY_NAMES].sort());
  });

  it('SQL_PATTERN_LINKS carries every trap page with its slug, short name and mock references', () => {
    expect(SQL_PATTERN_LINKS.map(p => p.slug)).toEqual(SQL_PATTERNS.map(p => p.slug));
    for (const p of SQL_PATTERNS) {
      const row = SQL_PATTERN_LINKS.find(r => r.slug === p.slug);
      expect(row.short, p.slug).toBe(p.short);
      expect(row.mock, p.slug).toEqual(p.mock);
      expect(row.alsoIn, p.slug).toEqual(p.alsoIn);
    }
  });

  it('PATTERN_FOR_MOCK_QUESTION is the registry map', () => {
    expect(PATTERN_FOR_MOCK_QUESTION).toEqual(REGISTRY_TRAP_MAP);
  });

  it('npm run build:jsx writes the slices before vite builds the app', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.scripts['build:jsx']).toMatch(/^node scripts\/build-app-data-slices\.mjs && vite build/);
  });
});

describe('app.jsx does not pull page registries into the bundle', () => {
  it('imports neither company-interviews.js nor sql-patterns.js', () => {
    expect(app).not.toMatch(/from '\.\/data\/company-interviews\.js'/);
    expect(app).not.toMatch(/from '\.\/data\/sql-patterns\.js'/);
    expect(app).toContain("from './data/app-data-slices.js';");
  });
});

// util export name → declared at column 0 or inside the component as
// `const NAME =` / `function NAME(` in app.jsx without importing it.
const UTIL_DIR = path.join(ROOT, 'src/utils');
const utilExports = () => {
  const names = new Map();
  for (const f of fs.readdirSync(UTIL_DIR).filter(f => f.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(UTIL_DIR, f), 'utf8');
    for (const m of src.matchAll(/^export (?:async )?(?:const|let|function\*?) ([A-Za-z_$][\w$]*)/gm)) names.set(m[1], f);
    for (const m of src.matchAll(/^export \{([^}]*)\}/gm)) {
      for (const part of m[1].split(',')) {
        const name = part.trim().split(/\s+as\s+/).pop();
        if (name && name !== 'default') names.set(name, f);
      }
    }
  }
  return names;
};
const importedNames = new Set(
  [...app.matchAll(/^import\s*\{([^}]*)\}\s*from/gms)]
    .flatMap(m => m[1].split(',').map(s => s.trim().split(/\s+as\s+/).pop()).filter(Boolean)),
);
const inlineMirrors = () => {
  const out = [];
  for (const [name, file] of utilExports()) {
    if (name.length < 5 || importedNames.has(name)) continue;
    if (new RegExp(`^(?:const|let|function) ${name}\\b`, 'm').test(app)) out.push(`${file}:${name}`);
  }
  return out.sort();
};

describe('inline mirrors of src/utils do not grow back', () => {
  // The mirrors still in app.jsx on 2026-11-27 (each a top-level copy of a
  // tested util). Shrink this list by importing; never add to it.
  const KNOWN = [
    'account-access.js:withLocalAccountKeys',
    'challenge-helpers.js:calculateRecommendedDifficulty',
    'challenge-helpers.js:checkIfStruggling',
    'challenge-helpers.js:getPasswordStrength',
    'challenge-helpers.js:pickNextChallenge',
    'challenge-helpers.js:simpleHash',
    'formatters.js:formatCell',
    'formatters.js:formatTime',
    'formatters.js:highlightSQL',
    'sql-analysis.js:detectAllSqlConcepts',
    'sql-analysis.js:detectSqlTopic',
    'sql-analysis.js:extractTablesFromSql',
    'streak-freeze.js:dateNDaysBefore',
    'streak-freeze.js:daysBetweenDateStrings',
  ];

  it('no util export is re-declared in app.jsx beyond the known list (and the list is current)', () => {
    expect(inlineMirrors()).toEqual([...KNOWN].sort());
  });

  it('the removed mirrors stay removed: getTopicStats, getAiLessonForTopic, the _wr week helpers', () => {
    for (const name of ['getTopicStats', 'getAiLessonForTopic', '_wrGetWeekStart', '_wrGetWeekEnd', '_wrFormatDate', '_wrEntryTs']) {
      expect(app, name).not.toMatch(new RegExp(`\\b(?:const|function) ${name}\\b`));
    }
  });

  it('the week-boundary render sites use weekly-report.js', () => {
    expect(app).toMatch(/import \{[^}]*\bgetIsoWeekStart\b[^}]*\bformatDate as formatWeekDate\b[^}]*\bentryTs as weekEntryTs\b[^}]*\} from '\.\/utils\/weekly-report\.js';/);
  });
});
