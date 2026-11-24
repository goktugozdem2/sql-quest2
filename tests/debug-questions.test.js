// The Debug question type (design PR #248, 2026-11-23): "An AI assistant wrote
// this for the task below. It returns the wrong answer."
//
// Pins: the two new bug kinds (fire / no-fire), the twelve items (fields, mix,
// SQLite only, every item run BOTH ways through the app's own grader), the
// flag (off: nothing joins the bank, no page links), no /questions/ page, the
// Capital One mock kept out, the pure half (prefill, spot, stats), and the
// app wiring (prefill before the starter, the quota wall still first, hooks
// above the early returns).
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import Database from 'better-sqlite3';
import { resultsMatch } from '../src/utils/grade.js';
import { diagnoseResult } from '../src/utils/diagnose.js';
import { ERROR_PATTERNS, classifyErrorPatterns } from '../src/utils/error-patterns.js';
import {
  isDebugChallenge, debugQuestionsOn, brokenQueryFor, debugEditorValue, emptyDebugStats,
  recordDebugSpot, recordDebugFix, debugStatsSummary, debugBugLine, isBugLine,
} from '../src/utils/debug-questions.js';
import { quotaGate, FREE_SOLVE_QUOTA } from '../src/utils/free-tier-boundary.js';
import { SQL_PATTERNS } from '../src/data/sql-patterns.js';
import { loadQuestionBank, isQuestionPageItem, questionSlugs } from '../scripts/question-slugs.mjs';
import { readFlags, debugFlagOn, loadDebugItems, debugItemForTrap, withAiSection, AI_PAGES } from '../scripts/debug-discovery.mjs';
import { renderPattern } from '../scripts/build-pattern-pages.mjs';
import { dataFiles } from '../scripts/data-files.js';

const read = rel => readFileSync(fileURLToPath(new URL(`../${rel}`, import.meta.url)), 'utf8');

function loadData(flagValue) {
  const sb = { window: { location: { search: '' } }, URLSearchParams: globalThis.URLSearchParams, console: { log() {} } };
  vm.createContext(sb);
  for (const f of ['feature-flags.js', 'datasets.js', 'challenges.js', 'challenge-companies.js', 'sector-challenges.js']) {
    vm.runInContext(read(`src/data/${f}`), sb);
  }
  if (flagValue !== undefined) sb.window.FEATURE_FLAGS.features.debugQuestions = flagValue;
  vm.runInContext(read('src/data/debug-challenges.js'), sb);
  return sb.window;
}

const W = loadData();
const items = W.debugChallengesData;
const datasets = W.publicDatasetsData;
const IDS = Array.from({ length: 12 }, (_, i) => 331 + i);
const byId = id => items.find(c => c.id === id);

const dbs = {};
function dbFor(key) {
  if (dbs[key]) return dbs[key];
  const db = new Database(':memory:');
  for (const [name, t] of Object.entries(datasets[key].tables)) {
    const types = t.columns.map((_, i) => {
      const s = t.data[0]?.[i];
      return typeof s === 'number' ? (Number.isInteger(s) ? 'INTEGER' : 'REAL') : 'TEXT';
    });
    db.exec(`CREATE TABLE ${name} (${t.columns.map((c, i) => `${c} ${types[i]}`).join(', ')})`);
    const ins = db.prepare(`INSERT INTO ${name} VALUES (${t.columns.map(() => '?').join(',')})`);
    db.transaction(rows => rows.forEach(r => ins.run(r.map(v => (v === undefined ? null : v)))))(t.data);
  }
  return (dbs[key] = db);
}
// Graded the way the app grades: value arrays, the reference's columns and ORDER BY.
function grades(c, sql) {
  const db = dbFor(c.dataset);
  const ref = db.prepare(c.solution);
  const expected = ref.raw().all();
  const columns = ref.columns().map(col => col.name);
  const got = db.prepare(sql.replace(/;\s*$/, '')).raw().all();
  return resultsMatch(got, expected, c.solution, columns);
}
const sqlOnly = q => q.split('\n').map(l => l.replace(/--.*$/, '').trimEnd());

// ─── 1. the two new bug kinds ──────────────────────────────────────────────
describe('error-patterns: fan_out and date_upper_bound', () => {
  const expected = { columns: ['name', 'spent'], rows: [['a', 10], ['b', 20]] };
  const inflated = diagnoseResult({ columns: ['name', 'spent'], rows: [['a', 20], ['b', 60]] }, expected);

  it('fan_out fires on an aggregate over two joins, and not when each child is aggregated first', () => {
    expect(Object.keys(ERROR_PATTERNS)).toContain('fan_out');
    const fan = 'SELECT c.name, SUM(o.total) AS spent FROM customers c JOIN orders o ON o.customer_id = c.id JOIN reviews r ON r.customer_id = c.id GROUP BY c.name';
    expect(classifyErrorPatterns(inflated, fan)).toContain('fan_out');
    const pre = 'WITH s AS (SELECT customer_id, SUM(total) AS spent FROM orders GROUP BY customer_id) SELECT c.name, s.spent FROM customers c JOIN s ON s.customer_id = c.id JOIN reviews r ON r.customer_id = c.id GROUP BY c.name';
    expect(classifyErrorPatterns(inflated, pre)).not.toContain('fan_out');
    const oneJoin = 'SELECT c.name, SUM(o.total) AS spent FROM customers c JOIN orders o ON o.customer_id = c.id GROUP BY c.name';
    expect(classifyErrorPatterns(inflated, oneJoin)).not.toContain('fan_out');
  });

  it('date_upper_bound fires on a bare-date BETWEEN / <= upper bound, and not on a strict next-day bound', () => {
    expect(Object.keys(ERROR_PATTERNS)).toContain('date_upper_bound');
    const short = diagnoseResult({ columns: ['d', 'n'], rows: [['2024-03-01', 4]] }, { columns: ['d', 'n'], rows: [['2024-03-01', 4], ['2024-03-07', 2]] });
    expect(classifyErrorPatterns(short, "SELECT DATE(login_at) d, COUNT(*) n FROM logins WHERE login_at BETWEEN '2024-03-01' AND '2024-03-07' GROUP BY 1")).toContain('date_upper_bound');
    expect(classifyErrorPatterns(short, "SELECT DATE(login_at) d, COUNT(*) n FROM logins WHERE login_at <= '2024-03-07' GROUP BY 1")).toContain('date_upper_bound');
    expect(classifyErrorPatterns(short, "SELECT DATE(login_at) d, COUNT(*) n FROM logins WHERE login_at >= '2024-03-01' AND login_at < '2024-03-08' GROUP BY 1")).not.toContain('date_upper_bound');
    expect(classifyErrorPatterns(short, "SELECT d, n FROM t WHERE DATE(login_at) BETWEEN '2024-03-01' AND '2024-03-07'")).not.toContain('date_upper_bound');
  });
});

// ─── 2. the twelve items ───────────────────────────────────────────────────
describe('the twelve Debug items', () => {
  it('are ids 331-342, once each, type debug, with every field the app and the spec read', () => {
    expect(items.map(c => c.id).sort((a, b) => a - b)).toEqual(IDS);
    for (const c of items) {
      expect(c.type, `#${c.id}`).toBe('debug');
      for (const k of ['title', 'description', 'hint', 'solution', 'title_tr', 'description_tr', 'hint_tr', 'slug', 'category', 'brokenQuery', 'brokenQuery_tr', 'bugKind', 'bugNote', 'bugNote_tr']) {
        expect(typeof c[k], `#${c.id}.${k}`).toBe('string');
        expect(c[k].length, `#${c.id}.${k}`).toBeGreaterThan(0);
      }
      expect(c.example?.output && c.example_tr?.output, `#${c.id} examples`).toBeTruthy();
      expect(c.xpReward).toBeGreaterThan(0);
      expect(Array.isArray(c.skills) && c.skills.length > 0).toBe(true);
      expect(Object.keys(datasets), `#${c.id} dataset`).toContain(c.dataset);
      for (const t of c.tables) expect(Object.keys(datasets[c.dataset].tables), `#${c.id} ${t}`).toContain(t);
    }
  });

  it('mix 4 Easy, 5 Medium, 3 Hard', () => {
    const n = d => items.filter(c => c.difficulty === d).length;
    expect([n('Easy'), n('Medium'), n('Hard')]).toEqual([4, 5, 3]);
  });

  it('name their bug with a key of error-patterns, and point bugLines at real SQL lines', () => {
    for (const c of items) {
      expect(Object.keys(ERROR_PATTERNS), `#${c.id}`).toContain(c.bugKind);
      const lines = c.brokenQuery.split('\n');
      expect(c.bugLines.length, `#${c.id}`).toBeGreaterThan(0);
      for (const l of c.bugLines) {
        expect(Number.isInteger(l) && l >= 1 && l <= lines.length, `#${c.id} line ${l}`).toBe(true);
        expect(lines[l - 1].trim().startsWith('--'), `#${c.id} line ${l} is a comment`).toBe(false);
      }
    }
    expect(items.some(c => c.bugKind === 'fan_out')).toBe(true);
    expect(items.some(c => c.bugKind === 'date_upper_bound')).toBe(true);
  });

  it('carry a Turkish brokenQuery: the same SQL on the same lines, only the comments translated', () => {
    for (const c of items) {
      expect(sqlOnly(c.brokenQuery_tr), `#${c.id}`).toEqual(sqlOnly(c.brokenQuery));
      expect(c.brokenQuery_tr, `#${c.id}`).not.toBe(c.brokenQuery);
      expect(/--/.test(c.brokenQuery_tr), `#${c.id} has a comment`).toBe(true);
    }
  });

  it('are SQLite only: no DATE_TRUNC, ILIKE, :: casts or INTERVAL', () => {
    for (const c of items) {
      for (const q of [c.brokenQuery, c.solution]) expect(q, `#${c.id}`).not.toMatch(/DATE_TRUNC|ILIKE|::|\bINTERVAL\b/i);
    }
  });

  for (const id of IDS) {
    it(`#${id}: the AI's query runs and is graded WRONG; the reference fix is graded right`, () => {
      const c = byId(id);
      expect(() => dbFor(c.dataset).prepare(c.brokenQuery.replace(/;\s*$/, '')).raw().all()).not.toThrow();
      expect(grades(c, c.brokenQuery), `#${id} broken query passes`).toBe(false);
      expect(grades(c, c.brokenQuery_tr), `#${id} Turkish broken query passes`).toBe(false);
      expect(grades(c, c.solution), `#${id} fix fails`).toBe(true);
      expect(dbFor(c.dataset).prepare(c.solution).raw().all().length, `#${id} empty expected output`).toBeGreaterThan(0);
    });
  }

  it('link a trap page only where one exists, and the six trap-page patterns are covered', () => {
    const slugs = SQL_PATTERNS.map(p => p.slug);
    for (const c of items) if (c.trap) expect(slugs, `#${c.id}`).toContain(c.trap);
    for (const s of slugs) expect(items.filter(c => c.trap === s).length, s).toBe(1);
    expect(items.some(c => c.bugKind === 'missing_group_by')).toBe(true);
  });

  it('do not reuse the Capital One mock: other datasets, and no query equal to a mock question', () => {
    const sb = { window: {}, console: { log() {} } };
    vm.createContext(sb);
    vm.runInContext(read('src/data/mock-interviews.js'), sb);
    const squash = s => String(s || '').replace(/--.*$/gm, ' ').replace(/;\s*$/, '').replace(/\s+/g, ' ').trim().toLowerCase();
    const theirs = new Set();
    for (const m of sb.window.mockInterviewsData.filter(x => /capital-one/.test(x.id))) {
      for (const q of m.questions) [...(q.codeSnippets || []).map(s => s.sql), q.verify?.sql, q.solution].filter(Boolean).forEach(x => theirs.add(squash(x)));
    }
    expect(theirs.size).toBeGreaterThan(0);
    for (const c of items) {
      expect(c.dataset, `#${c.id}`).not.toBe('finans_fraud');
      for (const q of [c.brokenQuery, c.solution]) expect(theirs.has(squash(q)), `#${c.id}`).toBe(false);
    }
  });

  it('two items carry company tags — TikTok and Shopify — each citing a dossier that exists', () => {
    const tagged = items.filter(c => c.companyTags);
    expect(tagged.map(c => Object.keys(c.companyTags)).flat().sort()).toEqual(['Shopify', 'TikTok']);
    for (const c of tagged) {
      for (const [co, cite] of Object.entries(c.companyTags)) {
        const file = cite.split(' ')[0];
        expect(file, co).toBe(`docs/reads/companies/${co.toLowerCase()}.md`);
        expect(existsSync(fileURLToPath(new URL(`../${file}`, import.meta.url))), file).toBe(true);
      }
    }
  });

  it('never collide with an id already in the bank', () => {
    const bankIds = new Set(loadData(false).challengesData.map(c => c.id));
    for (const id of IDS) expect(bankIds.has(id), `#${id}`).toBe(false);
  });
});

// ─── 3. the flag ───────────────────────────────────────────────────────────
describe('debugQuestions: off by default, and off means nowhere', () => {
  // Flipped ON 2026-11-23 (orchestrator-decisions.md). What must hold either
  // way: the key is an explicit boolean, never missing (a missing key reads
  // TRUE in FF), and debugFlagOn() agrees with it.
  it('is an explicit boolean key (a missing key reads TRUE in FF), and the reader agrees with it', () => {
    expect(typeof readFlags().features.debugQuestions).toBe('boolean');
    expect(debugFlagOn()).toBe(readFlags().features.debugQuestions);
    expect(debugQuestionsOn({ features: {} })).toBe(false);
    expect(debugQuestionsOn({ features: { debugQuestions: true } })).toBe(true);
  });

  it('off: no item joins the bank or the company map; on: all twelve do, with their tags', () => {
    const off = loadData(false);
    expect(off.challengesData.some(c => IDS.includes(c.id))).toBe(false);
    expect(off.challengeCompanies[338]).toBeUndefined();
    const on = loadData(true);
    expect(on.challengesData.filter(c => IDS.includes(c.id))).toHaveLength(12);
    expect(on.challengeCompanies[338]).toEqual(['Shopify']);
    expect(on.challengeCompanies[339]).toEqual(['TikTok']);
  });

  it('the data bundle loads the file after the bank and the flags', () => {
    expect(dataFiles.indexOf('debug-challenges.js')).toBeGreaterThan(dataFiles.indexOf('sector-challenges.js'));
    expect(dataFiles.indexOf('debug-challenges.js')).toBeGreaterThan(dataFiles.indexOf('feature-flags.js'));
    expect(dataFiles.indexOf('debug-challenges.js')).toBeGreaterThan(dataFiles.indexOf('challenge-companies.js'));
  });
});

// ─── 4. no /questions/ page ────────────────────────────────────────────────
describe('no /questions/ page for a Debug item in v1', () => {
  it('the page filter drops type debug, and the generator and its sitemap block use it', () => {
    expect(isQuestionPageItem({ id: 1 })).toBe(true);
    expect(isQuestionPageItem({ id: 331, type: 'debug' })).toBe(false);
    const { bank } = loadQuestionBank();
    expect(bank.some(c => c.type === 'debug' || IDS.includes(c.id))).toBe(false);
    const gen = read('scripts/build-question-pages.mjs');
    expect(gen).toMatch(/loaded\.bank\.filter\(isQuestionPageItem\)/);
    const slugs = questionSlugs([...bank, ...items].filter(isQuestionPageItem));
    for (const id of IDS) expect(slugs.has(id), `#${id}`).toBe(false);
  });

  it('the committed sitemap has no Debug slug', () => {
    const xml = read('public/sitemap.xml');
    for (const c of items) expect(xml, c.slug).not.toContain(`/${c.slug}/`);
  });
});

// ─── 5. discovery, behind the flag ─────────────────────────────────────────
describe('discovery on the static site renders only with the flag on', () => {
  const { bank } = loadQuestionBank();
  const slugs = questionSlugs(bank);

  it('flag off renders nothing; the built pages match the committed flag', () => {
    const on = debugFlagOn();
    for (const p of SQL_PATTERNS) {
      expect(debugItemForTrap(p.slug, { flagOn: false, items })).toBeNull();
      const built = `public/${p.slug}/index.html`;
      const want = on && !!debugItemForTrap(p.slug, { flagOn: true, items });
      expect(read(built).includes('Fix this bug yourself'), built).toBe(want);
    }
    for (const p of AI_PAGES) {
      const html = read(`public/${p.file}`);
      expect((html.match(/debug-discovery:start/g) || []).length, p.file).toBe(on ? 1 : 0);
      const stripped = html.replace(/<!-- debug-discovery:start -->[\s\S]*?<!-- debug-discovery:end -->/g, '');
      expect(withAiSection(stripped, { flagOn: false, items, anchor: p.anchor, src: p.src })).toBe(stripped);
    }
  });

  it('flag on: a trap page links only a non-Hard Debug item (a Hard is Pro and swaps a cold visitor)', () => {
    const linked = SQL_PATTERNS.map(p => [p.slug, debugItemForTrap(p.slug, { flagOn: true, items })?.id ?? null]);
    expect(Object.fromEntries(linked)).toEqual({
      'sql-not-in-null': 335,
      'sql-join-fan-out': null,
      'sql-between-timestamp': 331,
      'sql-average-of-averages': null,
      'sql-left-join-where-filter': 336,
    });
    for (const p of AI_PAGES) {
      const once = withAiSection(read(`public/${p.file}`), { flagOn: true, items, anchor: p.anchor, src: p.src });
      const ids = [...once.matchAll(/data-track="cta_ai_debug"/g)].length;
      expect(ids, p.file).toBe(3);
      expect(once, p.file).not.toContain('(Hard)');
    }
  });

  it('flag on: each trap page names its question, and each AI page gets the section once', () => {
    for (const p of SQL_PATTERNS) {
      const item = debugItemForTrap(p.slug, { flagOn: true, items });
      if (!item) continue;
      const html = renderPattern(p, { slugs, bank, debugItem: item });
      expect(html).toContain(`Fix this bug yourself: <a href="/app/?challenge=${item.id}&amp;src=pattern-debug-${p.slug}"`);
      expect(html).toContain(`question ${item.id}</a>`);
      expect(renderPattern(p, { slugs, bank })).not.toContain('Fix this bug yourself');
    }
    for (const p of AI_PAGES) {
      const html = read(`public/${p.file}`);
      expect(html.includes(p.anchor), `${p.file} anchor`).toBe(true);
      const once = withAiSection(html, { flagOn: true, items, anchor: p.anchor, src: p.src });
      expect(once).toContain('Fix a query an AI wrote');
      expect(withAiSection(once, { flagOn: true, items, anchor: p.anchor, src: p.src })).toBe(once);
    }
  });
});

// ─── 6. the pure half ──────────────────────────────────────────────────────
describe('debug-questions.js', () => {
  const c = byId(335);

  it('prefills the AI query only when no draft is saved, in the person\'s language', () => {
    expect(debugEditorValue(c, '', 'en')).toBe(c.brokenQuery);
    expect(debugEditorValue(c, '   ', 'en')).toBe(c.brokenQuery);
    expect(debugEditorValue(c, undefined, 'tr')).toBe(c.brokenQuery_tr);
    expect(debugEditorValue(c, 'SELECT 1', 'en')).toBe('SELECT 1');
    expect(debugEditorValue({ id: 91 }, '', 'en')).toBeNull();
    expect(brokenQueryFor(c, 'es')).toBe(c.brokenQuery);
    expect(isDebugChallenge(c) && !isDebugChallenge({ id: 1 })).toBe(true);
  });

  it('scores only the first spot tap on an item, and never mutates', () => {
    const s0 = emptyDebugStats();
    const s1 = recordDebugSpot(s0, c, 2);
    expect(s0.spots).toEqual({});
    expect(s1.spots['335']).toEqual({ line: 2, correct: false });
    const s2 = recordDebugSpot(s1, c, 4);
    expect(s2.spots['335']).toEqual({ line: 2, correct: false });
    const s3 = recordDebugSpot(s0, c, 4);
    expect(s3.spots['335'].correct).toBe(true);
    expect(isBugLine(c, 4) && !isBugLine(c, 1)).toBe(true);
    expect(recordDebugSpot(s0, { id: 7 }, 1).spots).toEqual({});
  });

  it('fixes: attempted on any submit, solved sticky; the summary divides by what was attempted', () => {
    let s = recordDebugFix(emptyDebugStats(), c, false);
    s = recordDebugFix(s, c, true);
    s = recordDebugFix(s, c, false);
    s = recordDebugFix(s, byId(331), false);
    s = recordDebugSpot(s, c, 4);
    s = recordDebugSpot(s, byId(331), 1);
    expect(debugStatsSummary(s)).toEqual({ spotsAttempted: 2, spotsCorrect: 1, spotRate: 50, fixesAttempted: 2, fixesSolved: 1, fixRate: 50 });
    expect(debugStatsSummary(null)).toEqual({ spotsAttempted: 0, spotsCorrect: 0, spotRate: null, fixesAttempted: 0, fixesSolved: 0, fixRate: null });
  });

  it('the solve line names the bug and links its trap page where one exists', () => {
    expect(debugBugLine(c, 'en')).toEqual({ text: c.bugNote, trapHref: '/sql-not-in-null/' });
    expect(debugBugLine(c, 'tr').text).toBe(c.bugNote_tr);
    expect(debugBugLine(byId(332), 'en').trapHref).toBeNull();
    expect(debugBugLine({ id: 1 })).toBeNull();
  });

  it('a Debug solve counts toward the free quota like any challenge (quotaGate on the solved set)', () => {
    const solved = new Set([91, 92, 93, 94, 95, 96, 97, 98, 99, 331]);
    expect(solved.size).toBe(FREE_SOLVE_QUOTA);
    expect(quotaGate({ flagOn: true, isPro: false, solvedCount: solved.size, alreadySolved: solved.has(340) }).gated).toBe(true);
    expect(quotaGate({ flagOn: true, isPro: false, solvedCount: solved.size, alreadySolved: solved.has(331) }).gated).toBe(false);
  });
});

// ─── 7. the app's wiring ───────────────────────────────────────────────────
describe('app.jsx wiring', () => {
  const app = read('src/app.jsx');
  const open = app.slice(app.indexOf('const openChallenge = (challenge, opts = {}) => {'));
  const openBody = open.slice(0, open.indexOf('\n  };\n'));

  it('openChallenge: the quota wall runs first, then the Debug prefill, before the first-run starter', () => {
    const iQuota = openBody.indexOf('const quota = quotaGate(');
    const iDebug = openBody.indexOf('debugEditorValue(challenge, savedQuery, lang)');
    const iStarter = openBody.indexOf('setChallengeStarterHint(starterHintFor(mainTable))');
    expect(iQuota).toBeGreaterThan(0);
    expect(iDebug).toBeGreaterThan(iQuota);
    expect(iStarter).toBeGreaterThan(iDebug);
    expect(openBody.slice(0, iQuota)).not.toMatch(/isDebugChallenge/);
    expect(openBody).toMatch(/if \(debugValue !== null\) \{\s*setChallengeQuery\(debugValue\);\s*\} else if \(!savedQuery && solvedChallenges\.size === 0 && challenge\.id === 91\)/);
  });

  it('the editor: line numbers and a gutterClick for Debug items only; the spot is recorded, never a gate', () => {
    expect(app).toMatch(/lineNumbers: !!lineNumbers/);
    expect(app).toMatch(/cm\.on\('gutterClick'/);
    expect(app).toMatch(/lineNumbers=\{isDebugChallenge\(currentChallenge\)\}/);
    expect(app).toContain('recordDebugSpot(debugStats, currentChallenge, line)');
    expect(app).toContain('data-testid="debug-reset"');
    expect(app).toContain("i18n_t('practice', 'debugFraming')");
    const submit = app.slice(app.indexOf('const submitChallenge = () => {'));
    expect(submit.slice(0, submit.indexOf('\n  };\n'))).not.toMatch(/debugStats\.spots/);
  });

  it('hooks sit above the early returns', () => {
    const iAuth = app.indexOf('  if (showAuth) {');
    for (const h of ['const [debugStats, setDebugStats] = useState(', 'const [debugFilter, setDebugFilter] = useState(']) {
      expect(app.indexOf(h), h).toBeGreaterThan(0);
      expect(app.indexOf(h), h).toBeLessThan(iAuth);
    }
  });

  it('debugStats rides the autosave and the load; the chip and the stats render only with the flag on', () => {
    expect(app).toMatch(/debugStats: debugStats,/);
    expect(app).toMatch(/userData\.debugStats && typeof userData\.debugStats === 'object'/);
    expect(app).toMatch(/\{DEBUG_QUESTIONS_ON && \(\s*<div[^>]*>\s*<span[^>]*>\{tPractice\('type'\)\}/);
    expect(app).toMatch(/DEBUG_QUESTIONS_ON && \(\(\) => \{\s*const ds = debugStatsSummary\(debugStats\);[\s\S]{0,400}data-testid="profile-debug"/);
    expect(app).toMatch(/DEBUG_QUESTIONS_ON && \(\(\) => \{\s*const ds = debugStatsSummary\(debugStats\);[\s\S]{0,400}data-testid="coach-debug-stats"/);
  });

  it('the framing line is an i18n key in English and Turkish', () => {
    const i18n = read('src/utils/i18n.js');
    expect(i18n).toContain("debugFraming: 'An AI assistant wrote this for the task below. It returns the wrong answer.'");
    expect(i18n).toContain("debugFraming: 'Bunu aşağıdaki görev için bir yapay zekâ asistanı yazdı. Yanlış sonuç döndürüyor.'");
    for (const k of ['debugReset', 'debugSpotPrompt', 'debugSpotRight', 'debugSpotWrong', 'debugBugWas', 'debugTrapLink', 'debugFilter', 'debugStatsTitle', 'debugStatsSpots', 'debugStatsFixes']) {
      expect(i18n.split(`${k}:`).length - 1, k).toBe(2);
    }
  });
});

// loadDebugItems is what the generators read; it must be the same twelve.
it('the generators read the same twelve items', () => {
  expect(loadDebugItems().map(c => c.id)).toEqual(items.map(c => c.id));
});

// A1 on #249 (2026-11-23): Speed Mode is live and picks at random from the
// whole bank with an empty editor, so with the flag on it served Debug items
// ("Find the line… fix it" over nothing) in about 30% of 10-question runs.
it('Speed Mode never serves a Debug item: every pool comes from the debug-free speedPool', () => {
  const app = read('src/app.jsx');
  const start = app.indexOf('const pickNextSpeedRunChallenge = ');
  expect(start).toBeGreaterThan(-1);
  const body = app.slice(start, app.indexOf('setSpeedRunCurrentChallenge(next)', start));
  expect(body).toMatch(/const speedPool = challenges\.filter\(c => !isDebugChallenge\(c\)\)/);
  expect(body).not.toMatch(/\bchallenges\.filter\(c => (?!!isDebugChallenge)/);
});

it('both debug-stats strings read as correct/total in Turkish', () => {
  const i18n = read('src/utils/i18n.js');
  expect(i18n).toContain("debugStatsSpots: 'Bulunan hatalar: {correct}/{n}'");
  expect(i18n).toContain("debugStatsFixes: 'Çözülen düzeltmeler: {solved}/{n}'");
});

// QA 2026-11-23: the Coach card's uppercase heading rendered "PRATIĞI" on a
// Turkish screen, because the page is lang="en" and CSS uppercases i → I.
// The heading carries the UI language so Turkish uppercases i → İ.
it('the uppercase debug-stats heading carries the UI language (TR: PRATİĞİ, not PRATIĞI)', () => {
  const app = read('src/app.jsx');
  expect(app).toMatch(/<p lang=\{getCurrentLang\(\)\} className="text-xs uppercase[^"]*"[^>]*>\{i18n_t\('practice', 'debugStatsTitle'\)\}/);
});
