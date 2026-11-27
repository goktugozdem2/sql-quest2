// A runnable starter in the editor — `runnableStarter`, desktop A/B
// (2026-11-26). docs/reads/open-without-run-2026-11-25.md: 54% of human
// first opens never ran the challenge; on the prefilled #91 65% of runners ran
// inside a minute, on an empty editor 16%. The `starter` arm puts a real,
// runnable `SELECT * FROM <table> LIMIT 5;` in the editor; control keeps the
// grey placeholder. Metric: runnable_starter_split (docs/agent/metrics.md).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import Database from 'better-sqlite3';
import {
  RUNNABLE_STARTER_ARMS, RUNNABLE_STARTER_KEY, RUNNABLE_STARTER_TEST_ID, RUNNABLE_STARTER_MIN_WIDTH,
  runnableStarterArm, isDesktopScreen, runnableStarterSql, runnableStarterText, normalizeSqlForCompare,
  starterRevealsAnswer, isEmptyEditorOpen, normalizeRunnableStarterRecord, runnableStarterDecision, isUntouchedStarter,
} from '../src/utils/runnable-starter.js';
import { companyDirectArm } from '../src/utils/company-direct.js';
import { companyAskArm } from '../src/utils/company-ask.js';
import { firstScreenArm } from '../src/utils/first-screen.js';
import { mobileRunBarArm } from '../src/utils/mobile-run-bar.js';
import { mobileOneLayerArm } from '../src/utils/mobile-one-layer.js';
import { runSubmitNudgeArm } from '../src/utils/run-submit-nudge.js';
import { modalLayoutHashArm } from '../src/utils/modal-layout.js';
import { quotaWallHashArm } from '../src/utils/quota-wall-inline.js';
import { freeQuotaArm } from '../src/utils/free-quota-holdout.js';
import { challengeTablePlan } from '../src/utils/challenge-datasets.js';
import { resultsMatch } from '../src/utils/grade.js';

const here = (rel) => fileURLToPath(new URL(rel, import.meta.url));
const app = readFileSync(here('../src/app.jsx'), 'utf8');
const flags = readFileSync(here('../src/data/feature-flags.js'), 'utf8');
const i18n = readFileSync(here('../src/utils/i18n.js'), 'utf8');

// ── the live bank ───────────────────────────────────────────────────────
const sb = { window: { challengesData: [] }, console: { log() {}, warn() {} } };
vm.createContext(sb);
for (const f of [
  'datasets.js', 'challenges.js', 'finans-data.js', 'finans-fraud-data.js', 'neobank-data.js',
  'gayrimenkul-data.js', 'uretim-data.js', 'sector-challenges.js', 'debug-challenges.js',
]) vm.runInContext(readFileSync(here(`../src/data/${f}`), 'utf8'), sb);
const datasets = sb.window.publicDatasetsData;
const BANK = [
  ...sb.window.challengesData,
  ...(sb.window.sectorChallengesData || []),
  ...(sb.window.debugChallengesData || []),
];

describe('the arm — 50/50 by aid, murmur-finalised, independent of every other two-arm test', () => {
  const N = 10000;
  const aids = Array.from({ length: N }, (_, i) => `aid-${i}-${(i * 7919) % 1000}`);
  it('is deterministic and one of the two arms', () => {
    expect(RUNNABLE_STARTER_TEST_ID).toBe('runnable_starter_v1');
    expect(RUNNABLE_STARTER_ARMS).toEqual(['control', 'starter']);
    expect(runnableStarterArm('x')).toBe(runnableStarterArm('x'));
    for (const a of aids.slice(0, 50)) expect(RUNNABLE_STARTER_ARMS).toContain(runnableStarterArm(a));
  });
  it('splits within ±3 points of 50/50 over 10,000 aids', () => {
    const starter = aids.filter((a) => runnableStarterArm(a) === 'starter').length;
    expect(Math.abs(starter / N - 0.5)).toBeLessThan(0.03);
  });
  // The parity trap (CLAUDE.md): without the finalizer this arm would agree
  // with another FNV `% 2` test on 0% or 100% of aids. companyDirectOpen is
  // the other test in the desktop open → first-run cell; the read is 2×2.
  const others = {
    companyDirectArm: (a) => companyDirectArm(a) === 'direct',
    companyAskArm: (a) => companyAskArm(a) === 'ask',
    firstScreenArm: (a) => firstScreenArm(a) === 'challenge',
    mobileRunBarArm: (a) => mobileRunBarArm(a) === 'bar',
    mobileOneLayerArm: (a) => mobileOneLayerArm(a) === 'one',
    runSubmitNudgeArm: (a) => runSubmitNudgeArm(a) === 'nudge',
    modalLayoutHashArm: (a) => modalLayoutHashArm(a) === 'plans_first',
    quotaWallHashArm: (a) => quotaWallHashArm(a) === 'inline',
    // #384, the free-quota holdout, armed on the same new people (A1 on #384).
    freeQuotaArm: (a) => freeQuotaArm(a) === 'holdout',
  };
  for (const [name, isFirst] of Object.entries(others)) {
    it(`is independent of ${name} (agreement within 50 ± 3%)`, () => {
      let same = 0;
      for (const a of aids) if ((runnableStarterArm(a) === 'starter') === isFirst(a)) same++;
      expect(Math.abs(same / N - 0.5)).toBeLessThan(0.03);
    });
  }
  it('each 2×2 cell with companyDirectOpen holds about a quarter', () => {
    const cells = {};
    for (const a of aids) {
      const k = `${runnableStarterArm(a)}/${companyDirectArm(a)}`;
      cells[k] = (cells[k] || 0) + 1;
    }
    expect(Object.keys(cells)).toHaveLength(4);
    for (const n of Object.values(cells)) expect(Math.abs(n / N - 0.25)).toBeLessThan(0.02);
  });
});

describe('eligibility — a desktop screen and an empty-editor open', () => {
  it('desktop is ≥ 1024 wide with a fine pointer', () => {
    expect(RUNNABLE_STARTER_MIN_WIDTH).toBe(1024);
    expect(isDesktopScreen({ width: 1280, finePointer: true })).toBe(true);
    expect(isDesktopScreen({ width: 1024, finePointer: true })).toBe(true);
    expect(isDesktopScreen({ width: 1023, finePointer: true })).toBe(false);
    expect(isDesktopScreen({ width: 390, finePointer: true })).toBe(false);
    expect(isDesktopScreen({ width: 1366, finePointer: false })).toBe(false); // a touch laptop / tablet
    expect(isDesktopScreen({})).toBe(false);
  });
  const c105 = { id: 105, tables: ['employees', 'departments'], solution: 'SELECT e.name, d.name FROM employees e JOIN departments d ON e.dept_id = d.id' };
  it('an empty-editor open: no solve, no draft, not #91, not a Debug item', () => {
    expect(isEmptyEditorOpen({ challenge: c105, savedQuery: '', solvedCount: 0 })).toBe(true);
    expect(isEmptyEditorOpen({ challenge: { ...c105, id: 91 }, solvedCount: 0 })).toBe(false);
    expect(isEmptyEditorOpen({ challenge: c105, savedQuery: 'SELECT 1', solvedCount: 0 })).toBe(false);
    expect(isEmptyEditorOpen({ challenge: c105, savedQuery: '   ', solvedCount: 0 })).toBe(true);
    expect(isEmptyEditorOpen({ challenge: c105, solvedCount: 1 })).toBe(false);
    expect(isEmptyEditorOpen({ challenge: c105, solvedCount: 0, debugItem: true })).toBe(false);
    expect(isEmptyEditorOpen({ challenge: { id: 7, tables: [] }, solvedCount: 0 })).toBe(false);
    expect(isEmptyEditorOpen({})).toBe(false);
  });
  it('a challenge whose answer the starter would be is never eligible', () => {
    const giveaway = { id: 9, tables: ['orders'], solution: 'select *\n  from orders\n limit 5 ;' };
    expect(starterRevealsAnswer(giveaway)).toBe(true);
    expect(starterRevealsAnswer({ ...giveaway, solution: 'SELECT * FROM orders' })).toBe(true);
    expect(isEmptyEditorOpen({ challenge: giveaway, solvedCount: 0 })).toBe(false);
    expect(starterRevealsAnswer(c105)).toBe(false);
  });
});

describe('the starter text', () => {
  it('is a comment line telling them to press Run, then SELECT * FROM <table> LIMIT 5;', () => {
    const t = runnableStarterText('transactions');
    const [comment, sql] = t.split('\n');
    expect(comment).toMatch(/^-- Press Run to see the data first/);
    expect(sql).toBe('SELECT * FROM transactions LIMIT 5;');
    expect(runnableStarterSql('transactions')).toBe(sql);
    expect(runnableStarterText('transactions', 'tr').split('\n')[0]).toMatch(/^-- .*Çalıştır/);
    expect(runnableStarterText('transactions', 'xx')).toBe(t);
  });
  it('normalises comments, case, whitespace and semicolons away', () => {
    expect(normalizeSqlForCompare(runnableStarterText('t'))).toBe('select * from t limit 5');
    expect(normalizeSqlForCompare('/* x */ SELECT\n*  FROM t;;')).toBe('select * from t');
  });
  it('untouched = the text exactly as placed (surrounding whitespace aside)', () => {
    const t = runnableStarterText('orders');
    expect(isUntouchedStarter(t, t)).toBe(true);
    expect(isUntouchedStarter(`${t}\n`, t)).toBe(true);
    expect(isUntouchedStarter(`${t}\nSELECT 1;`, t)).toBe(false);
    expect(isUntouchedStarter(t, null)).toBe(false);
    expect(isUntouchedStarter('', t)).toBe(false);
  });
});

describe('the starter never reveals an answer — over the live bank', () => {
  it('the bank is loaded (core, sector, Debug)', () => {
    expect(sb.window.challengesData.length).toBeGreaterThan(300);
    expect((sb.window.sectorChallengesData || []).length).toBeGreaterThan(50);
  });
  it('no eligible challenge has a reference solution inside its starter text', () => {
    const leaks = [];
    let eligible = 0;
    for (const c of BANK) {
      if (!isEmptyEditorOpen({ challenge: c, savedQuery: '', solvedCount: 0 })) continue;
      eligible++;
      const starter = normalizeSqlForCompare(runnableStarterText(c.tables[0]));
      const sol = normalizeSqlForCompare(c.solution);
      if (!sol || starter.includes(sol)) leaks.push(c.id);
    }
    expect(leaks).toEqual([]);
    expect(eligible).toBeGreaterThan(300);
  });
  it("the starter's rows never match any eligible challenge's expected rows (resultsMatch, the grader's rule)", () => {
    const matches = [];
    let compared = 0;
    for (const c of BANK) {
      if (!isEmptyEditorOpen({ challenge: c, savedQuery: '', solvedCount: 0 })) continue;
      if (!datasets[c.dataset] || c.grade === 'state' || c.mutates) continue;
      const db = new Database(':memory:');
      for (const step of challengeTablePlan(c, datasets)) {
        for (const [name, t] of Object.entries(datasets[step.dataset].tables)) {
          if (step.tables && !step.tables.includes(name)) continue;
          const types = t.columns.map((_, i) => {
            const s = t.data[0]?.[i];
            return typeof s === 'number' ? (Number.isInteger(s) ? 'INTEGER' : 'REAL') : 'TEXT';
          });
          db.exec(`DROP TABLE IF EXISTS ${name}`);
          db.exec(`CREATE TABLE ${name} (${t.columns.map((col, i) => `${col} ${types[i]}`).join(', ')})`);
          const ins = db.prepare(`INSERT INTO ${name} VALUES (${t.columns.map(() => '?').join(',')})`);
          db.transaction((rows) => rows.forEach((r) => ins.run(r.map((v) => (v === undefined ? null : v)))))(t.data);
        }
      }
      const user = db.prepare(runnableStarterSql(c.tables[0])).raw().all();
      const st = db.prepare(c.solution.trim().replace(/;\s*$/, ''));
      const expected = st.raw().all();
      if (resultsMatch(user, expected, c.solution, st.columns().map((x) => x.name))) matches.push(c.id);
      compared++;
      db.close();
    }
    expect(matches).toEqual([]);
    expect(compared).toBeGreaterThan(300);
  });
});

describe('runnableStarterDecision — sticky, assigned once, only in the population', () => {
  const aidIn = (arm) => { for (let i = 0; i < 1000; i++) { const a = `p-${i}`; if (runnableStarterArm(a) === arm) return a; } throw new Error('no aid'); };
  const IN = { flagOn: true, desktop: true, emptyOpen: true };
  it('flag off: nothing assigned or prefilled, whatever is stored', () => {
    expect(runnableStarterDecision({ ...IN, flagOn: false, aid: aidIn('starter') })).toEqual({ arm: null, assign: false, prefill: false });
    expect(runnableStarterDecision({ ...IN, flagOn: false, stored: { arm: 'starter' } })).toEqual({ arm: null, assign: false, prefill: false });
  });
  it('a phone or tablet, or an open that is not an empty editor, is never assigned', () => {
    expect(runnableStarterDecision({ ...IN, desktop: false, aid: aidIn('starter') })).toEqual({ arm: null, assign: false, prefill: false });
    expect(runnableStarterDecision({ ...IN, emptyOpen: false, aid: aidIn('starter') })).toEqual({ arm: null, assign: false, prefill: false });
    expect(runnableStarterDecision({ ...IN, aid: null })).toEqual({ arm: null, assign: false, prefill: false });
  });
  it('first eligible open assigns by the hash; starter prefills, control does not', () => {
    expect(runnableStarterDecision({ ...IN, aid: aidIn('starter') })).toEqual({ arm: 'starter', assign: true, prefill: true });
    expect(runnableStarterDecision({ ...IN, aid: aidIn('control') })).toEqual({ arm: 'control', assign: true, prefill: false });
  });
  it('a stored arm is kept and never re-announced; it prefills only inside the population', () => {
    expect(runnableStarterDecision({ ...IN, stored: { arm: 'control' }, aid: aidIn('starter') })).toEqual({ arm: 'control', assign: false, prefill: false });
    expect(runnableStarterDecision({ ...IN, stored: { arm: 'starter' }, aid: aidIn('control') })).toEqual({ arm: 'starter', assign: false, prefill: true });
    expect(runnableStarterDecision({ ...IN, desktop: false, stored: { arm: 'starter' } })).toEqual({ arm: 'starter', assign: false, prefill: false });
    expect(runnableStarterDecision({ ...IN, emptyOpen: false, stored: { arm: 'starter' } })).toEqual({ arm: 'starter', assign: false, prefill: false });
  });
  it('a junk record reads as no record', () => {
    expect(normalizeRunnableStarterRecord({ arm: 'bar' })).toEqual({ arm: null });
    expect(normalizeRunnableStarterRecord(null)).toEqual({ arm: null });
    expect(runnableStarterDecision({ ...IN, stored: { arm: 'x' }, aid: aidIn('starter') }).assign).toBe(true);
  });
});

describe('the app wires it the way the test reads', () => {
  const sliceFrom = (start, end) => {
    const a = app.indexOf(start);
    expect(a, start).toBeGreaterThan(-1);
    return app.slice(a, app.indexOf(end, a + start.length));
  };
  const open = sliceFrom('const openChallenge = (challenge, opts = {}) => {', 'setChallengeResult({ columns: [], rows: [], error: null });');
  const helper = sliceFrom('const runnableStarterOpen = (challenge, savedQuery) => {', 'const runnableStarterArmNow = () => {');
  const run = sliceFrom('const runChallengeQuery = () => {', 'const startTime = performance.now();');
  const submit = sliceFrom('const submitChallenge = () => {', 'const isFirstTry = !solvedChallenges.has(currentChallenge.id);');
  const firstRun = sliceFrom('const markChallengeFirstRun = (via, extra = {}) => {', '\n  };');

  it('the flag is an explicit boolean (ON at 50/50 from the flip, orchestrator row 2026-11-26)', () => {
    expect(flags).toMatch(/\n\s*runnableStarter: (true|false),\n/);
  });
  it('the starter goes in only in the empty-editor branch, after #91 and Debug, as real text', () => {
    const i91 = open.indexOf('challenge.id === 91');
    const iDebug = open.indexOf('debugValue !== null');
    const iRs = open.indexOf('runnableStarterOpen(challenge, savedQuery)');
    expect(i91).toBeGreaterThan(-1);
    expect(iDebug).toBeGreaterThan(-1);
    expect(iRs).toBeGreaterThan(i91);
    expect(iRs).toBeGreaterThan(iDebug);
    expect(open).toMatch(/if \(rs\.prefill\) \{\s*const text = runnableStarterText\(mainTable, lang\);\s*setChallengeRunnableStarter\(text\);\s*setChallengeQuery\(text\);/);
    // Control keeps the placeholder: the hint is set in both arms.
    expect(open).toMatch(/setChallengeStarterHint\(starterHintFor\(mainTable\)\);\s*\/\/ `runnableStarter`/);
    // Reset on every open.
    expect(open).toMatch(/setChallengeRunnableStarter\(null\);/);
  });
  it('assigns on a desktop screen with a fine pointer and fires runnable_starter_assigned once', () => {
    expect(helper).toMatch(/isDesktopScreen\(\{ width: window\.innerWidth, finePointer: !!window\.matchMedia\?\.\('\(pointer: fine\)'\)\?\.matches \}\)/);
    expect(helper).toMatch(/flagOn: ftbFlag\('runnableStarter'\)/);
    expect(helper).toMatch(/if \(decision\.assign\) \{[\s\S]*localStorage\.setItem\(RUNNABLE_STARTER_KEY/);
    expect(helper).toMatch(/trackActivationEvent\('runnable_starter_assigned', \{ arm: decision\.arm, test: RUNNABLE_STARTER_TEST_ID, challengeId: challenge\.id, viewport \}\)/);
    expect(RUNNABLE_STARTER_KEY).toBe('sqlquest_runnable_starter_v1');
  });
  it('challenge_first_run carries starterArm; the untouched starter run is via=starter', () => {
    expect(firstRun).toMatch(/starterArm: runnableStarterArmNow\(\)/);
    expect(run).toMatch(/else if \(isUntouchedStarter\(sql, challengeRunnableStarter\)\) \{[\s\S]*?via = 'starter';/);
    expect(run).toMatch(/markChallengeFirstRun\(via\);/);
  });
  it('Submit grades the untouched starter like any query and never as a solve', () => {
    expect(submit).toMatch(/const starterUntouched = isUntouchedStarter\(challengeQuery, challengeRunnableStarter\);/);
    expect(submit).toMatch(/markChallengeFirstRun\('submit', starterUntouched \? \{ starterUntouched: true \} : \{\}\);/);
    expect(submit).toMatch(/userResult = db\.exec\(challengeQuery\);/);
    expect(submit).toMatch(/if \(starterUntouched\) isSuccess = false;\s*$/);
  });
  it('the editor selects the untouched starter on focus', () => {
    expect(app).toMatch(/selectAllWhen=\{challengeRunnableStarter\}/);
    expect(app).toMatch(/cm\.on\('focus', \(\) => \{[\s\S]{0,200}cm\.getValue\(\) !== t[\s\S]{0,200}cm\.execCommand\('selectAll'\)/);
  });
  it('the line near Run is body type, grey, never the accent', () => {
    const m = app.match(/<p data-testid="runnable-starter-line" className="([^"]+)">\{i18n_t\('practice', 'runnableStarterLine'\)\}<\/p>/);
    expect(m).toBeTruthy();
    expect(m[1]).not.toMatch(/yellow|FFE34D|accent|font-mono/i);
    expect(i18n).toMatch(/runnableStarterLine: 'Press Run to see the data first\.'/);
    expect(i18n).toMatch(/runnableStarterLine: 'Önce veriyi görmek için Çalıştır\\'a bas\.'/);
  });
  it('the state lives above the showAuth / dbReady early returns', () => {
    const decl = app.indexOf('const [challengeRunnableStarter, setChallengeRunnableStarter] = useState(null);');
    expect(decl).toBeGreaterThan(-1);
    expect(decl).toBeLessThan(app.indexOf('if (showAuth) {'));
    expect(decl).toBeLessThan(app.indexOf('if (!dbReady) return'));
  });
});
