// PostgreSQL mode — the spike's guards (2026-11-22, flag `postgresMode`).
// Plan and numbers: docs/plans/postgres-mode-2026-11-22.md.
//
//   1. the translator (src/utils/pg-translate.js), rule by rule, and the
//      rewrites executed on PGlite against the same rows on SQLite;
//   2. the allow-list (src/data/postgres-allowlist.json) is the one
//      scripts/pg/build-allowlist.mjs generates from a full run of the bank —
//      a bank, dataset or translator change that moves it fails here;
//   3. the CDN pins: exact version, jsDelivr, sha384 of every file equal to
//      the pinned devDependency's bytes;
//   4. flag off: the flag is false, app.js carries no PGlite and no
//      translator, and nothing in app.jsx reaches /pg-mode.js except the
//      toggle's own click (the runtime half — no request at all, the page
//      unchanged — is scripts/pg/headless-check.mjs);
//   5. hooks above the early returns.
//
// Breaks that proved them (commit message has the list): IFNULL rewrite
// dropped; the allow-list hand-edited; a pg-cdn hash changed by one char;
// the flag set true; pg-translate imported into app.jsx.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import Database from 'better-sqlite3';
import { PGlite } from '@electric-sql/pglite';
import {
  translateSqliteToPg, pgColumnType, pgTableSql, splitStatements, normalizePgValue,
  pgResultToSqlJs, pgExpectedSql, tokenize, PG_SESSION_SQL, PG_TEXT_PARSED_OIDS,
} from '../src/utils/pg-translate.js';
import { PGLITE_VERSION, PGLITE_BASE, PGLITE_FILES } from '../src/utils/pg-cdn.js';

const here = rel => fileURLToPath(new URL(rel, import.meta.url));
const read = rel => readFileSync(here(rel), 'utf8');
const tr = (sql, opts) => translateSqliteToPg(sql, opts).sql;

// ── 1. Translator ────────────────────────────────────────────────────────
describe('translator: functions', () => {
  it('IFNULL → COALESCE, INSTR → STRPOS', () => {
    expect(tr('SELECT IFNULL(a, 0), instr(name, \'x\') FROM t')).toBe("SELECT COALESCE(a, 0), STRPOS(name, 'x') FROM t");
  });
  it('ROUND(x, n) casts to numeric (Postgres has no round(double, int)); ROUND(x) untouched', () => {
    expect(tr('SELECT ROUND(AVG(x), 2), ROUND(y) FROM t')).toBe('SELECT ROUND(CAST(AVG(x) AS NUMERIC), 2), ROUND(y) FROM t');
  });
  it('GROUP_CONCAT → STRING_AGG with the default comma, the separator, DISTINCT', () => {
    expect(tr('SELECT GROUP_CONCAT(name) FROM t')).toBe("SELECT STRING_AGG(CAST(name AS TEXT), ',') FROM t");
    expect(tr("SELECT GROUP_CONCAT(name, '; ') FROM t")).toBe("SELECT STRING_AGG(CAST(name AS TEXT), '; ') FROM t");
    expect(tr('SELECT GROUP_CONCAT(DISTINCT name) FROM t')).toBe("SELECT STRING_AGG(DISTINCT CAST(name AS TEXT), ',') FROM t");
  });
  it('scalar MAX/MIN of two → GREATEST/LEAST; the aggregate untouched', () => {
    expect(tr('SELECT MAX(a, b), MIN(a, 0), MAX(c) FROM t')).toBe('SELECT GREATEST(a, b), LEAST(a, 0), MAX(c) FROM t');
  });
  it('strftime → to_char, letters in the format quoted', () => {
    expect(tr("SELECT strftime('%Y-%m', d) FROM t")).toBe("SELECT TO_CHAR(CAST(d AS TIMESTAMP), 'YYYY-MM') FROM t");
    expect(tr("SELECT strftime('%YW%d', d) FROM t")).toBe("SELECT TO_CHAR(CAST(d AS TIMESTAMP), 'YYYY\"W\"DD') FROM t");
    expect(tr("SELECT strftime('%w', d) FROM t")).toBe("SELECT CAST(EXTRACT(DOW FROM CAST(d AS TIMESTAMP)) AS INTEGER)::TEXT FROM t");
  });
  it('a strftime specifier with no same-output pattern is left alone (%W)', () => {
    expect(tr("SELECT strftime('%W', d) FROM t")).toBe("SELECT strftime('%W', d) FROM t");
  });
  it('date()/datetime() with modifiers: N days, start of month, an expression', () => {
    expect(tr("SELECT date(d, '-14 days') FROM t")).toBe("SELECT TO_CHAR((CAST(d AS TIMESTAMP) + INTERVAL '-14 days'), 'YYYY-MM-DD') FROM t");
    expect(tr("SELECT date(d, 'start of month') FROM t")).toBe("SELECT TO_CHAR(DATE_TRUNC('month', CAST(d AS TIMESTAMP)), 'YYYY-MM-DD') FROM t");
    expect(tr("SELECT date(d, '-' || n || ' days') FROM t")).toBe("SELECT TO_CHAR((CAST(d AS TIMESTAMP) + CAST('-' || n || ' days' AS INTERVAL)), 'YYYY-MM-DD') FROM t");
    expect(tr("SELECT datetime('2024-01-01 10:00:00', '+1 hour')")).toBe("SELECT TO_CHAR((TIMESTAMP '2024-01-01 10:00:00' + INTERVAL '+1 hours'), 'YYYY-MM-DD HH24:MI:SS')");
  });
  it('an unknown date modifier leaves the call alone', () => {
    expect(tr("SELECT date(d, 'weekday 0') FROM t")).toBe("SELECT date(d, 'weekday 0') FROM t");
  });
  it('julianday → epoch days (the same number SQLite returns)', () => {
    expect(tr('SELECT julianday(b) - julianday(a) FROM t'))
      .toBe('SELECT (EXTRACT(EPOCH FROM CAST(b AS TIMESTAMP)) / 86400.0 + 2440587.5) - (EXTRACT(EPOCH FROM CAST(a AS TIMESTAMP)) / 86400.0 + 2440587.5) FROM t');
  });
  it('CAST AS REAL → DOUBLE PRECISION; CAST AS INTEGER of arithmetic truncates, of text does not', () => {
    expect(tr('SELECT CAST(x AS REAL) FROM t')).toBe('SELECT CAST(x AS DOUBLE PRECISION) FROM t');
    expect(tr('SELECT CAST(a / 365 AS INTEGER) FROM t')).toBe('SELECT CAST(TRUNC(a / 365) AS INTEGER) FROM t');
    expect(tr("SELECT CAST(strftime('%Y', d) AS INTEGER) FROM t")).toBe("SELECT CAST(TO_CHAR(CAST(d AS TIMESTAMP), 'YYYY') AS INTEGER) FROM t");
    expect(tr('SELECT CAST(code AS INTEGER) FROM t')).toBe('SELECT CAST(code AS INTEGER) FROM t');
  });
  it('a function on a column of the same name (t.date) or a method call is not rewritten', () => {
    expect(tr('SELECT x.IFNULL(a, b)')).toBe('SELECT x.IFNULL(a, b)');
  });
});

describe('translator: LIKE, date columns, NULL order', () => {
  it("LIKE → ILIKE (SQLite's LIKE ignores ASCII case)", () => {
    expect(tr("SELECT * FROM t WHERE a LIKE '%x%' AND b NOT LIKE 'y%'")).toBe("SELECT * FROM t WHERE a ILIKE '%x%' AND b NOT ILIKE 'y%'");
  });
  it('a DATE column read as text gets a cast (substr, LIKE); other columns do not', () => {
    const dateColumns = new Set(['order_date']);
    expect(tr('SELECT SUBSTR(o.order_date, 1, 4), SUBSTR(name, 1, 2) FROM orders o', { dateColumns }))
      .toBe('SELECT SUBSTR(CAST(o.order_date AS TEXT), 1, 4), SUBSTR(name, 1, 2) FROM orders o');
    expect(tr("SELECT 1 FROM o WHERE order_date NOT LIKE '2025-%'", { dateColumns })).toBe("SELECT 1 FROM o WHERE CAST(order_date AS TEXT) NOT ILIKE '2025-%'");
  });
  it("ORDER BY items get SQLite's NULL placement unless they say their own", () => {
    expect(tr('SELECT a FROM t ORDER BY a, b DESC, c ASC NULLS LAST LIMIT 5'))
      .toBe('SELECT a FROM t ORDER BY a NULLS FIRST, b DESC NULLS LAST, c ASC NULLS LAST LIMIT 5');
    expect(tr('SELECT RANK() OVER (PARTITION BY d ORDER BY s DESC) FROM t'))
      .toBe('SELECT RANK() OVER (PARTITION BY d ORDER BY s DESC NULLS LAST) FROM t');
  });
  it('the app form (sqliteNullOrder: false) keeps Postgres\'s own NULL order', () => {
    expect(tr('SELECT a FROM t ORDER BY a DESC', { sqliteNullOrder: false })).toBe('SELECT a FROM t ORDER BY a DESC');
  });
  it('never touches string literals, quoted identifiers or comments', () => {
    const sql = "SELECT 'IFNULL(a,b) LIKE x ORDER BY y', \"strftime(\" FROM t -- ROUND(a, 2)\n/* GROUP_CONCAT(x) */";
    expect(tr(sql)).toBe(sql);
  });
  it('reports which rewrites it used; none for portable SQL', () => {
    expect(translateSqliteToPg('SELECT a, COUNT(*) FROM t GROUP BY a').rewrites).toEqual([]);
    expect(translateSqliteToPg('SELECT IFNULL(a, 0) FROM t ORDER BY a').rewrites).toEqual(['IFNULL→COALESCE', 'NULLS FIRST/LAST']);
  });
  it('tokenizes a doubled quote inside a literal as one string', () => {
    expect(tokenize("'it''s'").map(x => x.t)).toEqual(['str']);
  });
});

describe('schema, statements, results', () => {
  it('types a column from all its values', () => {
    expect(pgColumnType([1, 2, null])).toBe('INTEGER');
    expect(pgColumnType([1, 7.5])).toBe('DOUBLE PRECISION');
    expect(pgColumnType([1, 3000000000])).toBe('BIGINT');
    expect(pgColumnType(['2024-01-01', null])).toBe('DATE');
    expect(pgColumnType(['2024-01-01 10:00:00', '2024-01-02T10:00:00.000Z'])).toBe('TIMESTAMP');
    expect(pgColumnType(['1931', '2001'])).toBe('INTEGER');
    expect(pgColumnType(['99693450.00000'])).toBe('DOUBLE PRECISION');
    expect(pgColumnType(['01234', '10001'])).toBe('TEXT'); // a zip keeps its zero
    expect(pgColumnType(['a', 1])).toBe('TEXT');
  });
  it('escapes quotes in the INSERTs', () => {
    expect(pgTableSql('t', { columns: ['n'], data: [["O'Dwyer"]] })).toContain("('O''Dwyer')");
  });
  it('splits a script on semicolons outside literals', () => {
    expect(splitStatements("INSERT INTO a VALUES (1, 'x;y'); SELECT 1;  ")).toEqual(["INSERT INTO a VALUES (1, 'x;y')", 'SELECT 1']);
  });
  it('turns Postgres exact numbers and booleans into the values sql.js hands over', () => {
    expect(normalizePgValue('3.5000000000000000', 1700)).toBe(3.5);
    expect(normalizePgValue(42n, 20)).toBe(42);
    expect(normalizePgValue(true, 16)).toBe(1);
    expect(normalizePgValue('2024-01-05', 1082)).toBe('2024-01-05');
    expect(pgResultToSqlJs({ fields: [{ name: 'n', dataTypeID: 20 }], rows: [[7n]] })).toEqual({ columns: ['n'], values: [[7]] });
  });
  it('the app grades with the reference as written when it runs as written, else the rewrite in Postgres order', () => {
    const c = { solution: 'SELECT IFNULL(a, 0) FROM t ORDER BY a' };
    expect(pgExpectedSql(c, 'asis', new Set())).toBe(c.solution);
    expect(pgExpectedSql(c, 'rewrite', new Set())).toBe('SELECT COALESCE(a, 0) FROM t ORDER BY a');
    expect(pgExpectedSql(c, null, new Set())).toBe(null);
  });
});

describe('the rewrites give SQLite\'s answer on Postgres', () => {
  let pg;
  let lite;
  const table = { columns: ['id', 'd', 'name', 'x'], data: [[1, '2024-01-31', 'Ann', 2.675], [2, '2024-03-01', null, null], [3, '2023-12-15', 'bob', 1.5]] };
  beforeAll(async () => {
    pg = await PGlite.create({ parsers: Object.fromEntries(PG_TEXT_PARSED_OIDS.map(o => [o, v => v])) });
    await pg.exec(PG_SESSION_SQL);
    await pg.exec(pgTableSql('t', table));
    lite = new Database(':memory:');
    lite.exec('CREATE TABLE t (id INTEGER, d TEXT, name TEXT, x REAL)');
    const ins = lite.prepare('INSERT INTO t VALUES (?, ?, ?, ?)');
    for (const r of table.data) ins.run(r);
  }, 60000);
  afterAll(async () => { await pg?.close(); lite?.close(); });
  const both = async sql => {
    const want = lite.prepare(sql).raw().all();
    const got = pgResultToSqlJs(await pg.query(tr(sql, { dateColumns: new Set(['d']) }), [], { rowMode: 'array' })).values;
    return { want, got };
  };
  for (const sql of [
    "SELECT id, strftime('%Y-%m', d), date(d, '+1 day'), date(d, 'start of month') FROM t ORDER BY id",
    "SELECT id, CAST(julianday('2024-06-01') - julianday(d) AS INTEGER) FROM t ORDER BY id",
    'SELECT id, IFNULL(name, \'?\'), INSTR(IFNULL(name, \'\'), \'o\') FROM t ORDER BY id',
    "SELECT id FROM t WHERE name LIKE 'B%' ORDER BY id",
    'SELECT name FROM t ORDER BY name',
    'SELECT name FROM t ORDER BY name DESC',
    "SELECT GROUP_CONCAT(name, '|') FROM (SELECT name FROM t WHERE name IS NOT NULL ORDER BY id)",
    'SELECT SUBSTR(d, 1, 7) FROM t ORDER BY id',
  ]) {
    it(sql, async () => {
      const { want, got } = await both(sql);
      expect(got).toEqual(want);
    });
  }
});

// ── 2. The allow-list is the generated one ──────────────────────────────
describe('the allow-list', () => {
  const list = JSON.parse(read('../src/data/postgres-allowlist.json'));
  it('names the pinned PGlite and only bank challenges, each asis or rewrite', () => {
    expect(list.pglite).toBe(PGLITE_VERSION);
    const sb = { window: { challengesData: [] }, console: { log() {}, warn() {} } };
    vm.createContext(sb);
    for (const f of ['challenges.js', 'sector-challenges.js']) vm.runInContext(read(`../src/data/${f}`), sb);
    const ids = new Set(sb.window.challengesData.map(c => c.id));
    expect(list.bankSize).toBe(ids.size);
    for (const [id, v] of Object.entries(list.challenges)) {
      expect(ids.has(Number(id)), `#${id}`).toBe(true);
      expect(['asis', 'rewrite']).toContain(v);
    }
    expect(Object.keys(list.challenges).length).toBeGreaterThan(0.9 * ids.size);
  });
  it('equals a fresh run of every reference solution on SQLite and PGlite', async () => {
    const { runBank } = await import('../scripts/pg/run-bank.mjs');
    const { results, bankSize } = await runBank();
    const ON = new Set(['unchanged', 'rewritten', 'rounding', 'text_numbers']);
    const fresh = {};
    for (const r of results) if (ON.has(r.status)) fresh[r.id] = r.status === 'unchanged' ? 'asis' : 'rewrite';
    expect(bankSize).toBe(list.bankSize);
    expect(fresh).toEqual(list.challenges);
    expect(results.filter(r => ON.has(r.status) && r.appRuns === false).map(r => r.id)).toEqual([]);
  }, 180000);
});

// ── 3. CDN pins ─────────────────────────────────────────────────────────
describe('PGlite comes from an exact version on jsDelivr, every file with SRI', () => {
  const pkg = JSON.parse(read('../package.json'));
  it('the devDependency is pinned exactly, to the version the app loads', () => {
    expect(pkg.devDependencies['@electric-sql/pglite']).toBe(PGLITE_VERSION);
    expect(JSON.parse(read('../node_modules/@electric-sql/pglite/package.json')).version).toBe(PGLITE_VERSION);
    expect(PGLITE_BASE).toBe(`https://cdn.jsdelivr.net/npm/@electric-sql/pglite@${PGLITE_VERSION}/dist/`);
  });
  for (const [k, f] of Object.entries(PGLITE_FILES)) {
    it(`${k}: ${f.path} hash and size match the npm bytes`, () => {
      const buf = readFileSync(here(`../node_modules/@electric-sql/pglite/dist/${f.path}`));
      expect(f.sha384).toBe(`sha384-${createHash('sha384').update(buf).digest('base64')}`);
      expect(f.bytes).toBe(buf.length);
    });
  }
  it('the engine fetches every file with its integrity, nothing by bare URL', () => {
    const entry = read('../src/pg-mode/entry.js');
    expect(entry).toMatch(/fetch\(PGLITE_BASE \+ file\.path, \{ integrity: file\.sha384/);
    expect(entry.match(/fetchChecked\(PGLITE_FILES\.(js|wasm|initdb|data)\)/g)).toHaveLength(4);
    expect(entry).not.toMatch(/import\(\s*['"`]https?:/);
  });
});

// ── 4. Flag off ─────────────────────────────────────────────────────────
describe('flag off: no PGlite in the bundle, nothing loads', () => {
  const app = read('../src/app.jsx');
  it('postgresMode ships false (a missing flag would read true)', () => {
    const sb = { window: { location: { search: '' } }, URLSearchParams: globalThis.URLSearchParams, console: { log() {} } };
    vm.createContext(sb);
    vm.runInContext(read('../src/data/feature-flags.js'), sb);
    expect(sb.window.FEATURE_FLAGS.features.postgresMode).toBe(false);
  });
  it('app.jsx imports none of the engine', () => {
    expect(app).not.toMatch(/from ['"][^'"]*(pg-translate|pg-cdn|pg-mode|@electric-sql)/);
  });
  it('the built app.js carries no PGlite and no translator; pg-mode.js does', () => {
    const built = read('../public/app.js');
    for (const marker of [/electric-sql/i, /pglite/i, /SQLQuestPgBundle/, /julianday→epoch/, /CAST AS INTEGER→TRUNC/]) expect(built).not.toMatch(marker);
    expect(existsSync(here('../public/pg-mode.js'))).toBe(true);
    const engine = read('../public/pg-mode.js');
    expect(engine).toMatch(/cdn\.jsdelivr\.net\/npm\/@electric-sql\/pglite@/);
    expect(engine).toMatch(/julianday→epoch/);
  });
  it('/pg-mode.js is reached only through the toggle', () => {
    expect(app.match(/['"`]\/pg-mode\.js/g)).toHaveLength(1); // one string literal; comments may name it
    const load = app.indexOf("s.src = '/pg-mode.js'");
    expect(app.lastIndexOf('const loadPgBundle = () => {', load)).toBeGreaterThan(load - 400);
    // loadPgBundle is called once, inside pickSqlEngine, after the postgres check
    const calls = [...app.matchAll(/loadPgBundle\(\)/g)].map(m => m.index);
    expect(calls).toHaveLength(1);
    const pick = app.indexOf('const pickSqlEngine = async (engine) => {');
    expect(calls[0]).toBeGreaterThan(pick);
    expect(app.slice(pick, calls[0])).toMatch(/if \(engine !== 'postgres' \|\| !currentChallenge\) \{ setPgMode\(null\); return; \}/);
    // pickSqlEngine: the toggle's onClick, and the challenge-change effect gated on the flag
    expect(app.match(/pickSqlEngine\(/g)).toHaveLength(2);
    expect(app).toMatch(/if \(postgresModeOn && sqlEngine === 'postgres' && currentChallenge && pgMode\?\.forId !== currentChallenge\.id\) pickSqlEngine\('postgres'\)/);
    expect(app).toMatch(/onClick=\{\(\) => pickSqlEngine\(k\)\}/);
  });
  it('the toggle renders only under the flag, and Run/Submit leave SQLite only when PostgreSQL is ready', () => {
    const at = app.indexOf('data-testid="sql-engine-toggle"');
    expect(app.slice(at - 200, at)).toMatch(/\{postgresModeOn && \(/);
    expect(app).toMatch(/const pgActive = postgresModeOn && sqlEngine === 'postgres' && pgMode\?\.phase === 'ready'/);
    expect(app).toMatch(/const runChallengeQuery = \(\) => \{\n\s+if \(pgActive\) \{ runChallengeQueryPg\(false\); return; \}/);
    expect(app).toMatch(/const submitChallenge = \(\) => \{\n\s+if \(pgActive\) \{ runChallengeQueryPg\(true\); return; \}/);
  });
  it('a PostgreSQL verdict is never recorded: no attempt, solve or XP write in its path', () => {
    const start = app.indexOf('const runChallengeQueryPg = async (submit) => {');
    const body = app.slice(start, app.indexOf('const submitChallenge = () => {', start));
    for (const w of ['setChallengeAttempts', 'setSolvedChallenges', 'setXP', 'trackActivationEvent(\'challenge_', 'saveUserData']) expect(body).not.toContain(w);
  });
});

// ── 5. Hooks above the early returns ───────────────────────────────────
describe('hooks sit above the early returns', () => {
  const app = read('../src/app.jsx');
  it("useState('sqlite'), the pg refs and the challenge-change effect come before if (showAuth)", () => {
    const early = app.indexOf('  if (showAuth) {');
    expect(early).toBeGreaterThan(0);
    for (const hook of ["useState('sqlite')", 'const pgBundleRef = useRef(null);', "pickSqlEngine('postgres');\n  }, [currentChallenge?.id]);"]) {
      const at = app.indexOf(hook);
      expect(at, hook).toBeGreaterThan(0);
      expect(at, hook).toBeLessThan(early);
    }
  });
});
