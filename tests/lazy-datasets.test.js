// Sector datasets on demand — flag lazySectorData (2026-11-24).
//
// The five sector datasets are ~half of data.js gzipped. With the flag on the
// bundler leaves them out of data.js and writes each to public/data/<file>;
// the app fetches one the first time something needs it. This file pins:
//   1. the loader (src/utils/lazy-datasets.js): once-only, resolves when the
//      dataset registered, a failure is never cached (the next call retries);
//   2. missingLazyKeys against the LIVE bank: for every challenge, daily, mock
//      question and ticket, the lazy keys it waits for are exactly the sector
//      datasets its full-data table plan loads;
//   3. the bundle: flag off, data.js is the pre-flag bundle byte for byte;
//      flag on, the five are out and the manifest is in, once;
//   4. source guards: every table build waits for a missing sector dataset,
//      every run handler is held while one is on its way, nothing else reads
//      window.publicDatasetsData, and the hooks sit above the early returns.
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { execSync } from 'node:child_process';
import {
  LAZY_DATASET_FILES,
  createDatasetLoader,
  missingLazyKeys,
  injectScript,
} from '../src/utils/lazy-datasets.js';
import { challengeTablePlan } from '../src/utils/challenge-datasets.js';
import { dataFiles, combineDataFiles } from '../scripts/data-files.js';
import { TICKETS } from '../src/data/tickets.js';

const here = rel => fileURLToPath(new URL(rel, import.meta.url));
const readData = file => readFileSync(here(`../src/data/${file}`), 'utf8');
const LAZY_KEYS = Object.keys(LAZY_DATASET_FILES);

// ── 1. the loader ─────────────────────────────────────────────────────────
describe('createDatasetLoader', () => {
  const manifest = { sector_a: { src: '/data/a.js?v=1', tables: ['t'] } };
  const setup = ({ register = true, fail = false } = {}) => {
    const datasets = { core: { tables: {} } };
    const loadScript = vi.fn(() => new Promise((resolve, reject) => {
      setTimeout(() => {
        if (fail) return reject(new Error('network'));
        if (register) datasets.sector_a = { icon: 'Building2', tables: { t: { columns: ['x'], data: [[1]] } } };
        resolve();
      }, 0);
    }));
    const onLoaded = vi.fn();
    const loader = createDatasetLoader({ manifest, getDatasets: () => datasets, loadScript, onLoaded });
    return { datasets, loadScript, onLoaded, loader };
  };

  it('injects once for concurrent calls and resolves when the dataset registered', async () => {
    const { loader, loadScript, onLoaded, datasets } = setup();
    expect(loader.needsLoad('sector_a')).toBe(true);
    const p1 = loader.ensureDataset('sector_a');
    const p2 = loader.ensureDataset('sector_a');
    expect(p2).toBe(p1);
    expect(loader.inFlight()).toEqual(['sector_a']);
    await expect(p1).resolves.toBe('sector_a');
    expect(loadScript).toHaveBeenCalledTimes(1);
    expect(loadScript).toHaveBeenCalledWith('/data/a.js?v=1');
    expect(datasets.sector_a).toBeTruthy();
    expect(onLoaded).toHaveBeenCalledTimes(1);
    expect(loader.inFlight()).toEqual([]);
    // Present now: a later call loads nothing.
    await loader.ensureDataset('sector_a');
    expect(loadScript).toHaveBeenCalledTimes(1);
    expect(loader.needsLoad('sector_a')).toBe(false);
  });

  it('never loads a dataset that is present or not lazy, and does nothing without a manifest', async () => {
    const { loader, loadScript } = setup();
    await expect(loader.ensureDataset('core')).resolves.toBe('core');
    await expect(loader.ensureDataset('unknown')).resolves.toBe('unknown');
    expect(loadScript).not.toHaveBeenCalled();
    const off = createDatasetLoader({ manifest: null, getDatasets: () => ({}), loadScript });
    expect(off.needsLoad('finans_fraud')).toBe(false);
    await off.ensureDatasets(LAZY_KEYS);
    expect(loadScript).not.toHaveBeenCalled();
  });

  it('rejects when the script ran but did not register the dataset, and retries on the next call', async () => {
    const { loader, loadScript, onLoaded } = setup({ register: false });
    await expect(loader.ensureDataset('sector_a')).rejects.toThrow(/did not load/);
    expect(loader.inFlight()).toEqual([]);
    await expect(loader.ensureDataset('sector_a')).rejects.toThrow();
    expect(loadScript).toHaveBeenCalledTimes(2);
    expect(onLoaded).not.toHaveBeenCalled();
  });

  it('a network failure is not cached: the next call injects again', async () => {
    const { loader, loadScript } = setup({ fail: true });
    await expect(loader.ensureDataset('sector_a')).rejects.toThrow('network');
    await expect(loader.ensureDataset('sector_a')).rejects.toThrow('network');
    expect(loadScript).toHaveBeenCalledTimes(2);
  });
});

describe('injectScript', () => {
  const fakeDoc = () => {
    const appended = [];
    return {
      appended,
      createElement: () => ({ remove() { this.removed = true; } }),
      head: { appendChild: el => appended.push(el) },
    };
  };
  it('resolves on load', async () => {
    const doc = fakeDoc();
    const p = injectScript(doc, '/data/x.js?v=1');
    expect(doc.appended).toHaveLength(1);
    expect(doc.appended[0].src).toBe('/data/x.js?v=1');
    doc.appended[0].onload();
    await expect(p).resolves.toBe('/data/x.js?v=1');
  });
  it('rejects on error and removes the tag so a retry injects a fresh one', async () => {
    const doc = fakeDoc();
    const p = injectScript(doc, '/data/x.js');
    doc.appended[0].onerror();
    await expect(p).rejects.toThrow(/Could not load/);
    expect(doc.appended[0].removed).toBe(true);
  });
});

// ── 2. missingLazyKeys on the live bank ───────────────────────────────────
describe('missingLazyKeys — the live bank, mocks and tickets', () => {
  const sb = { window: { challengesData: [] }, console: { log() {}, warn() {} } };
  vm.createContext(sb);
  for (const f of [
    'datasets.js', 'challenges.js', ...Object.values(LAZY_DATASET_FILES), 'sector-challenges.js',
    'daily-challenges-new.js', 'mock-interviews.js',
  ]) vm.runInContext(readData(f), sb);
  const { publicDatasetsData: full, challengesData: bank, dailyChallengesData: daily, mockInterviewsData: mocks } = sb.window;
  const manifest = Object.fromEntries(LAZY_KEYS.map(k => [k, { src: `/data/${LAZY_DATASET_FILES[k]}`, tables: Object.keys(full[k].tables) }]));
  const core = Object.fromEntries(Object.entries(full).filter(([k]) => !LAZY_KEYS.includes(k)));
  const SOURCES = [
    ...bank.map(c => [`challenge #${c.id}`, c]),
    ...daily.map(d => [`daily ${d.id}`, d.core]),
    ...mocks.flatMap(m => (m.questions || []).filter(q => q.dataset).map((q, i) => [`mock ${m.id} q${i + 1}`, q])),
    ...TICKETS.map(t => [`ticket ${t.id}`, t]),
  ];

  it('every lazy key in LAZY_DATASET_FILES is a dataset its file registers', () => {
    for (const k of LAZY_KEYS) expect(full[k], k).toBeTruthy();
    for (const file of Object.values(LAZY_DATASET_FILES)) expect(dataFiles).toContain(file);
  });

  it('waits for exactly the sector datasets the full-data plan loads', () => {
    let sectorItems = 0;
    for (const [label, item] of SOURCES) {
      const planned = challengeTablePlan(item, full).map(s => s.dataset).filter(k => LAZY_KEYS.includes(k));
      const missing = missingLazyKeys(item, core, manifest);
      expect(new Set(missing), label).toEqual(new Set(planned));
      if (planned.length) sectorItems++;
    }
    // Sanity: the bank has sector items (the sector set, Capital One, Revolut).
    expect(sectorItems).toBeGreaterThan(30);
  });

  it('waits for nothing once the datasets are present, or without a manifest', () => {
    for (const [label, item] of SOURCES) {
      expect(missingLazyKeys(item, full, manifest), label).toEqual([]);
      expect(missingLazyKeys(item, core, null), label).toEqual([]);
    }
  });

  it('the Capital One mock waits for finans_fraud, the Revolut mock for finans_neobank', () => {
    const keysOf = id => [...new Set((mocks.find(m => m.id === id)?.questions || []).flatMap(q => missingLazyKeys(q, core, manifest)))];
    expect(keysOf('capital-one-codesignal')).toEqual(['finans_fraud']);
    expect(keysOf('revolut-analytics-screen')).toEqual(['finans_neobank']);
  });
});

// ── 3. the bundle ─────────────────────────────────────────────────────────
describe('combineDataFiles — the data.js text', () => {
  // The bundler's loop as it was before the flag existed (scripts/bundle-data.js
  // at f8a91be9), kept here verbatim so the flag-off bundle cannot drift.
  const legacyBundle = () => {
    let combined = '// SQL Quest - Bundled Data Files\n';
    for (const file of dataFiles) {
      combined += `\n// === ${file} ===\n`;
      combined += readData(file);
      combined += '\n';
    }
    return combined;
  };

  it('flag off: byte for byte the pre-flag bundle', () => {
    const { text, missing } = combineDataFiles(readData);
    expect(missing).toEqual([]);
    expect(text === legacyBundle()).toBe(true);
  });

  it('flag on: the five files are out, the manifest is in once, in their place', () => {
    const manifest = { finans_fraud: { src: '/data/finans-fraud-data.js?v=abc', tables: ['transactions'] } };
    const { text, included } = combineDataFiles(readData, { lazyFiles: new Set(Object.values(LAZY_DATASET_FILES)), manifest });
    for (const file of Object.values(LAZY_DATASET_FILES)) {
      expect(text).not.toContain(`// === ${file} ===`);
      expect(included).not.toContain(file);
    }
    expect(text.split('window.LAZY_DATASETS =').length - 1).toBe(1);
    expect(text).toContain(JSON.stringify(manifest));
    expect(text.indexOf('// === sectors.js ===')).toBeLessThan(text.indexOf('window.LAZY_DATASETS'));
    expect(text.indexOf('window.LAZY_DATASETS')).toBeLessThan(text.indexOf('// === sector-challenges.js ==='));
    expect(text).not.toContain('publicDatasetsData.finans_fraud =');
  });

  it('the flag exists and is off (a missing key reads TRUE in window.FF)', () => {
    const sandbox = { window: { location: { search: "" } }, console: { log() {} }, URLSearchParams: globalThis.URLSearchParams };
    vm.runInNewContext(readData('feature-flags.js'), sandbox);
    expect(sandbox.window.FEATURE_FLAGS.features).toHaveProperty('lazySectorData', false);
  });
});

// ── 4. source guards over app.jsx ─────────────────────────────────────────
describe('app.jsx — every reader waits for a missing sector dataset', () => {
  const src = readFileSync(here('../src/app.jsx'), 'utf8');
  const fnBody = (decl, len = 1200) => {
    const i = src.indexOf(decl);
    expect(i, decl).toBeGreaterThan(-1);
    return src.slice(i, i + len);
  };
  const earlyReturn = src.indexOf('if (!dbReady) return (');

  it('only app.jsx and PostgreSQL mode read window.publicDatasetsData', () => {
    const out = execSync('grep -rl "publicDatasetsData" src --exclude-dir=data', { cwd: here('..'), encoding: 'utf8' })
      .split('\n').filter(Boolean).sort();
    expect(out).toEqual(['src/app.jsx', 'src/pg-mode/entry.js', 'src/utils/lazy-datasets.js']);
    // In app.jsx: the one `publicDatasets` binding, the daily card (core
    // datasets only — checked below), and comments.
    const code = src.split('\n').filter(l => l.includes('window.publicDatasetsData') && !l.trim().startsWith('//'));
    expect(code.map(l => l.trim())).toEqual([
      'const publicDatasets = window.publicDatasetsData || {};',
      'const datasetInfo = window.publicDatasetsData?.[todaysChallenge.core.dataset];',
    ]);
  });

  it('no daily challenge runs on a sector dataset (the daily card reads the global directly)', () => {
    const sb = { window: {} };
    vm.runInNewContext(readData('daily-challenges-new.js'), sb);
    for (const d of sb.window.dailyChallengesData) expect(LAZY_KEYS, d.id).not.toContain(d.core.dataset);
  });

  it('tables are built only in loadDataset, which waits for a missing sector dataset first', () => {
    // (The CSV upload builds the person's own table — not a dataset.)
    expect(src.split('CREATE TABLE ${tableName} (${tableData.columns').length - 1).toBe(1);
    const body = fnBody('const loadDataset = (database, key, onlyTables = null) => {', 1600);
    expect(body.indexOf('sectorDatasetLoader.needsLoad(key)')).toBeGreaterThan(-1);
    expect(body.indexOf('sectorDatasetLoader.needsLoad(key)')).toBeLessThan(body.indexOf('CREATE TABLE'));
    expect(body).toContain('deferLazyLoad(database, [key]');
  });

  it('loadChallengeDatasets waits before it plans (the plan needs the data)', () => {
    const body = fnBody('const loadChallengeDatasets = (database, challenge) => {', 600);
    expect(body.indexOf('lazyKeysFor(challenge)')).toBeGreaterThan(-1);
    expect(body.indexOf('lazyKeysFor(challenge)')).toBeLessThan(body.indexOf('challengeTablePlan('));
  });

  // Every handler that executes a query on a sql.js database built from the
  // datasets is held while a sector dataset is on its way.
  const HANDLERS = [
    'const runSpeedRunQuery = () => {',
    'const submitSpeedRunAnswer = () => {',
    'const runInterviewQuery = () => {',
    'const submitInterviewAnswer = (timedOut = false, opts = {}) => {',
    'const runDayQuery = () => {',
    'const runAiQuery = () => {',
    'const runSandboxQuery = () => {',
    'const submitAiQuery = async () => {',
    'const submitExercise = () => {',
    'const runQuery = (customQuery, context = \'practice\') => {',
    'const runDailyChallengeQuery = () => {',
    'const submitDailyChallenge = () => {',
    'const runChallengeQuery = () => {',
    'const runChallengeQueryPg = async (submit) => {',
    'const submitChallenge = () => {',
    'const runTicket = (submit) => {',
    'const runFoundationPracticeQuery = (lessonId, exercise, shouldCheck = false) => {',
  ];
  it.each(HANDLERS)('%s is held before its first query', decl => {
    const body = fnBody(decl, 4000);
    const guard = body.indexOf('lazyDatasetsBusy(');
    expect(guard, decl).toBeGreaterThan(-1);
    const firstRun = Math.min(...['.exec(', 'ticketDbFor(', 'SQLQuestPg.', 'runStateAttempt(', 'gradeStateChallenge(', 'runChallengeQuery()']
      .map(m => body.indexOf(m)).filter(i => i > 0));
    expect(guard, decl).toBeLessThan(firstRun);
  });

  it('every function that runs a query is in the guarded list', () => {
    const decls = [...src.matchAll(/^ {2}const ((?:run|submit)[A-Za-z]*) = (?:async )?\(/gm)].map(m => m[1]);
    const guarded = HANDLERS.map(h => h.match(/const (\w+)/)[1]);
    const runsQuery = decls.filter(name => {
      const body = fnBody(`const ${name} = `, 2500);
      return /\b(db|tdb)\.exec\(/.test(body.slice(0, body.indexOf('\n  };\n') > 0 ? body.indexOf('\n  };\n') : body.length));
    });
    for (const name of runsQuery) expect(guarded, name).toContain(name);
  });

  it('the state, refs and prefetch effect sit above the early returns', () => {
    for (const marker of [
      'const [lazyDatasetTick, setLazyDatasetTick] = useState(0);',
      'const [lazyDatasetStatus, setLazyDatasetStatus] = useState(null);',
      'const lazyLoadsRef = useRef([]);',
      'requestLazyDatasets([\n      ...lazyKeysFor(currentChallenge),',
    ]) {
      const i = src.indexOf(marker);
      expect(i, marker).toBeGreaterThan(-1);
      expect(i, marker).toBeLessThan(earlyReturn);
    }
  });

  it('the expected-output backfill re-runs when a dataset arrives', () => {
    expect(src).toContain('}, [db, currentChallenge, lazyDatasetTick]);');
  });

  it('the loading line renders in the main app and offers a retry', () => {
    const i = src.indexOf('data-testid="lazy-dataset-status"');
    expect(i).toBeGreaterThan(earlyReturn);
    expect(src.slice(i, i + 1600)).toContain('onClick={retryLazyDatasets}');
  });
});
