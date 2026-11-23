// Run stays on screen on phones — `mobileRunBar` (2026-11-23, rank 1 of
// docs/plans/mobile-acquisition-2026-11-23.md). On a phone, open → first run
// was 20% against 59% on desktop; Run sat below the first screen on every
// challenge and fully under the keyboard. The bar arm pins Run / Submit to
// the viewport below `md`; desktop and the control arm keep today's bar.
//
// Also QA D3 (docs/reads/new-content-qa-2026-11-23.md): Run and Submit were
// 40 px tall on a phone; they are at least 44 px below `md`, in both arms.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import Database from 'better-sqlite3';
import {
  MOBILE_RUN_BAR_ARMS, MOBILE_RUN_BAR_STORAGE_KEY, MOBILE_RUN_BAR_MAX_WIDTH,
  isNarrowTouch, mobileRunBarArm, mobileRunBarDecision, runBarLabel, keyboardOffset,
} from '../src/utils/mobile-run-bar.js';
import { firstScreenArm } from '../src/utils/first-screen.js';
import { companyAskArm } from '../src/utils/company-ask.js';
import { companyDirectArm } from '../src/utils/company-direct.js';
import { modalLayoutHashArm } from '../src/utils/modal-layout.js';
import { quotaWallHashArm } from '../src/utils/quota-wall-inline.js';
import { starterHintFor, starterSqlFromHint } from '../src/utils/starter-query.js';
import { challengeTablePlan } from '../src/utils/challenge-datasets.js';

const here = (rel) => fileURLToPath(new URL(rel, import.meta.url));
const app = readFileSync(here('../src/app.jsx'), 'utf8');
const css = readFileSync(here('../src/input.css'), 'utf8');
const flags = readFileSync(here('../src/data/feature-flags.js'), 'utf8');
const i18n = readFileSync(here('../src/utils/i18n.js'), 'utf8');
const scrollFn = (() => {
  const a = app.indexOf('const scrollToChallengeEditor = () => {');
  return app.slice(a, app.indexOf('\n  };', a));
})();

// The bar's JSX: from the comment above it to the Submit button.
const barBlock = (() => {
  const a = app.indexOf('{/* Sticky on mobile, normal flow from md up.');
  const b = app.indexOf('data-onboarding="submit"', a);
  return app.slice(a, app.indexOf('</button>', b));
})();
// Today's bar, byte for byte (main on 2026-11-23). The control arm, the flag
// off and every desktop keep exactly this.
const CONTROL_CLASS = 'sticky bottom-0 z-20 flex gap-2 mt-3 border-t border-[#2A2E38] bg-[#16181F] py-3 md:static md:border-0 md:bg-transparent md:py-0';

describe('isNarrowTouch — the same rule as scrollToChallengeEditor', () => {
  it('is true at a coarse pointer or a phone width, false at 1280 with a fine pointer', () => {
    expect(isNarrowTouch({ coarse: true, width: 1280 })).toBe(true);
    expect(isNarrowTouch({ coarse: false, width: 390 })).toBe(true);
    expect(isNarrowTouch({ coarse: false, width: 767 })).toBe(true);
    expect(isNarrowTouch({ coarse: false, width: 768 })).toBe(false);
    expect(isNarrowTouch({ coarse: false, width: 1280 })).toBe(false);
    expect(isNarrowTouch({})).toBe(false);
    expect(MOBILE_RUN_BAR_MAX_WIDTH).toBe(768);
  });
  it('scrollToChallengeEditor uses the same coarse-or-under-768 rule', () => {
    expect(scrollFn).toMatch(/\(pointer: coarse\)'\)\?\.matches\s*\|\|\s*window\.innerWidth < 768/);
  });
});

describe('the arm — 50/50 by aid, murmur-finalised, independent of every other two-arm test', () => {
  const N = 10000;
  const aids = Array.from({ length: N }, (_, i) => `aid-${i}-${(i * 7919) % 1000}`);
  it('is deterministic and one of the two arms', () => {
    expect(mobileRunBarArm('x')).toBe(mobileRunBarArm('x'));
    expect(MOBILE_RUN_BAR_ARMS).toEqual(['control', 'bar']);
    for (const a of aids.slice(0, 50)) expect(MOBILE_RUN_BAR_ARMS).toContain(mobileRunBarArm(a));
  });
  it('splits within ±3 points of 50/50 over 10,000 aids', () => {
    const bar = aids.filter((a) => mobileRunBarArm(a) === 'bar').length;
    expect(Math.abs(bar / N - 0.5)).toBeLessThan(0.03);
  });
  // The parity trap: without the finalizer the low bit is the parity of the
  // characters' sum, so this arm would agree with another FNV `% 2` test on
  // 0% or 100% of aids. Independent tests agree on about half.
  const others = {
    firstScreenArm: (a) => firstScreenArm(a) === 'challenge',
    companyAskArm: (a) => companyAskArm(a) === 'ask',
    companyDirectArm: (a) => companyDirectArm(a) === 'direct',
    modalLayoutHashArm: (a) => modalLayoutHashArm(a) === 'plans_first',
    quotaWallHashArm: (a) => quotaWallHashArm(a) === 'inline',
  };
  for (const [name, isFirst] of Object.entries(others)) {
    it(`is independent of ${name} (agreement within 50 ± 3%)`, () => {
      let same = 0;
      for (const a of aids) if ((mobileRunBarArm(a) === 'bar') === isFirst(a)) same++;
      expect(Math.abs(same / N - 0.5)).toBeLessThan(0.03);
    });
  }
});

describe('mobileRunBarDecision — sticky, assigned once, only on a narrow touch screen', () => {
  const aidIn = (arm) => { for (let i = 0; i < 1000; i++) { const a = `p-${i}`; if (mobileRunBarArm(a) === arm) return a; } throw new Error('no aid'); };
  it('flag off: nothing assigned, nothing shown, whatever is stored', () => {
    expect(mobileRunBarDecision({ flagOn: false, narrowTouch: true, aid: aidIn('bar') })).toEqual({ arm: null, assign: false, show: false });
    expect(mobileRunBarDecision({ flagOn: false, narrowTouch: true, stored: { arm: 'bar' } })).toEqual({ arm: null, assign: false, show: false });
  });
  it('a desktop opener is never assigned', () => {
    expect(mobileRunBarDecision({ flagOn: true, narrowTouch: false, aid: aidIn('bar') })).toEqual({ arm: null, assign: false, show: false });
  });
  it('first open on a phone assigns by the hash; the bar arm shows, control does not', () => {
    expect(mobileRunBarDecision({ flagOn: true, narrowTouch: true, aid: aidIn('bar') })).toEqual({ arm: 'bar', assign: true, show: true });
    expect(mobileRunBarDecision({ flagOn: true, narrowTouch: true, aid: aidIn('control') })).toEqual({ arm: 'control', assign: true, show: false });
  });
  it('a stored arm is kept and never re-announced, even if the hash says otherwise', () => {
    expect(mobileRunBarDecision({ flagOn: true, narrowTouch: true, stored: { arm: 'control' }, aid: aidIn('bar') })).toEqual({ arm: 'control', assign: false, show: false });
    expect(mobileRunBarDecision({ flagOn: true, narrowTouch: true, stored: { arm: 'bar' }, aid: aidIn('control') })).toEqual({ arm: 'bar', assign: false, show: true });
    // A bar-arm person on a desktop later: the arm stays, the bar does not show.
    expect(mobileRunBarDecision({ flagOn: true, narrowTouch: false, stored: { arm: 'bar' } })).toEqual({ arm: 'bar', assign: false, show: false });
  });
  it('a junk record is ignored; no aid means no assignment', () => {
    expect(mobileRunBarDecision({ flagOn: true, narrowTouch: true, stored: { arm: 'zzz' }, aid: aidIn('bar') }).assign).toBe(true);
    expect(mobileRunBarDecision({ flagOn: true, narrowTouch: true, stored: null, aid: null })).toEqual({ arm: null, assign: false, show: false });
  });
});

describe('runBarLabel — only a first-contact person on an empty editor with a starter', () => {
  const starterSql = starterSqlFromHint(starterHintFor('orders'));
  it('returns the i18n key in the one case it is for', () => {
    expect(runBarLabel({ solvedCount: 0, editorEmpty: true, starterSql })).toBe('runBarFirstHint');
  });
  it('is null with a saved query, after any solve, and with no starter hint', () => {
    expect(runBarLabel({ solvedCount: 0, editorEmpty: false, starterSql })).toBe(null);
    expect(runBarLabel({ solvedCount: 1, editorEmpty: true, starterSql })).toBe(null);
    expect(runBarLabel({ solvedCount: 0, editorEmpty: true, starterSql: starterSqlFromHint(null) })).toBe(null);
    expect(runBarLabel({ solvedCount: 0, editorEmpty: true, starterSql: '' })).toBe(null);
  });
  it('has its copy in English and Turkish, and the Turkish names the Turkish button', () => {
    expect(i18n).toContain("runBarFirstHint: 'Tap Run to see the table'");
    expect(i18n).toContain("runBarFirstHint: 'Tabloyu görmek için Çalıştır\\'a dokun'");
    expect(i18n).toContain("run: 'Çalıştır'");
  });
});

describe('keyboardOffset — sit above the keyboard where visualViewport is supported', () => {
  it('lifts by the part of the layout viewport the keyboard covers', () => {
    expect(keyboardOffset({ innerWidth: 390, innerHeight: 844, vvHeight: 508, vvOffsetTop: 0 })).toBe(336);
    expect(keyboardOffset({ innerWidth: 390, innerHeight: 844, vvHeight: 508, vvOffsetTop: 100 })).toBe(236);
  });
  it('is 0 with no keyboard, with no visualViewport, and at md and up', () => {
    expect(keyboardOffset({ innerWidth: 390, innerHeight: 844, vvHeight: 844 })).toBe(0);
    expect(keyboardOffset({ innerWidth: 390, innerHeight: 844, vvHeight: null })).toBe(0);
    expect(keyboardOffset({ innerWidth: 1280, innerHeight: 800, vvHeight: 400 })).toBe(0);
  });
});

describe('the app wiring (source guards)', () => {
  it('the flag exists and ships off', () => {
    expect(flags).toMatch(/\n\s+mobileRunBar: false,/);
    expect(app).toContain("flagOn: ftbFlag('mobileRunBar')");
  });
  it('the decision hooks sit above the `if (showAuth)` and `if (!dbReady) return` early returns', () => {
    const showAuth = app.indexOf('\n  if (showAuth) {');
    const dbReady = app.indexOf('\n  if (!dbReady) return');
    expect(showAuth).toBeGreaterThan(0);
    expect(dbReady).toBeGreaterThan(0);
    for (const marker of [
      'const [mobileRunBarShown, setMobileRunBarShown] = useState(false);',
      'const [runBarKeyboardOffset, setRunBarKeyboardOffset] = useState(0);',
      'const decision = mobileRunBarDecision({',
      'const mobileRunBarRef = useCallback(',
    ]) {
      const at = app.indexOf(marker);
      expect(at, marker).toBeGreaterThan(0);
      expect(at, marker).toBeLessThan(showAuth);
      expect(at, marker).toBeLessThan(dbReady);
    }
  });
  it('fires mobile_run_bar_assigned {arm} only on assignment, after storing the arm', () => {
    const a = app.indexOf('const decision = mobileRunBarDecision({');
    const block = app.slice(a, app.indexOf('setMobileRunBarShown(decision.show);', a));
    expect(block).toMatch(/if \(decision\.assign\) \{[\s\S]*MOBILE_RUN_BAR_STORAGE_KEY[\s\S]*trackActivationEvent\('mobile_run_bar_assigned', \{ arm: decision\.arm/);
    expect(app.match(/'mobile_run_bar_assigned'/g)).toHaveLength(1);
    expect(MOBILE_RUN_BAR_STORAGE_KEY).toBe('sqlquest_mobile_run_bar_v1');
  });
  it('desktop and the control arm keep today\'s bar: the class string is unchanged and the fixed one is the bar arm\'s only', () => {
    expect(barBlock).toContain(`: '${CONTROL_CLASS}'`);
    expect(barBlock).toMatch(/className=\{mobileRunBarShown\s*\?\s*'fixed /);
    const barClass = /\? '(fixed [^']+)'/.exec(barBlock)[1];
    // From md up the fixed bar is the same static, borderless, unpadded row.
    for (const c of ['md:static', 'md:border-0', 'md:bg-transparent', 'md:px-0', 'md:py-0', 'md:flex-nowrap']) {
      expect(barClass.split(' ')).toContain(c);
    }
    expect(barClass).toContain('pb-[max(12px,env(safe-area-inset-bottom))]');
    // The keyboard lift and the body attribute only exist in the bar arm.
    expect(barBlock).toContain('ref={mobileRunBarShown ? mobileRunBarRef : undefined}');
    expect(barBlock).toMatch(/style=\{mobileRunBarShown && runBarKeyboardOffset > 0 \?/);
    // The label is the bar arm's, hidden from md up, never in the accent.
    expect(barBlock).toMatch(/\{mobileRunBarShown && \(\(\) => \{/);
    expect(barBlock).toMatch(/data-testid="run-bar-label" className="basis-full text-xs text-gray-400 md:hidden"/);
  });
  it('the CSS for the fixed bar applies below md only, and keeps the bubble and the prompt slot clear of it', () => {
    const block = /@media \(max-width: 767px\) \{([\s\S]*?)\n\}/.exec(css)?.[1] || '';
    expect(block).toContain('body[data-run-bar="fixed"] {');
    const n = (sel) => Number(new RegExp(sel + '\\s*\\{\\s*bottom:\\s*calc\\((\\d+)px').exec(block)?.[1]);
    const fab = n('body\\[data-run-bar="fixed"\\] \\.sq-feedback-fab');
    const slot = n('body\\[data-run-bar="fixed"\\] \\[data-feedback-prompt-slot="global"\\]');
    const pad = Number(/padding-bottom:\s*calc\((\d+)px/.exec(block)?.[1]);
    // The tallest bar: 12 + 16 label + 8 gap + 44 button + 12 = 92.
    expect(pad).toBeGreaterThanOrEqual(92);
    expect(fab).toBeGreaterThanOrEqual(pad);
    expect(slot - fab).toBeGreaterThanOrEqual(44);
    // No rule for the fixed bar outside that block.
    const rules = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(block, '');
    expect(rules.includes('data-run-bar')).toBe(false);
  });
  it('the editor is never focused on touch (the scrollToChallengeEditor rule stands)', () => {
    expect(scrollFn).toMatch(/if \(!isTouch\) \{\s*const cm = [^\n]+\n\s*try \{ cm\?\.CodeMirror\?\.focus\(\)/);
    expect(scrollFn.match(/\.focus\(\)/g)).toHaveLength(1);
    const hooks = app.slice(app.indexOf('const [mobileRunBarShown'), app.indexOf('const mobileRunBarRef'));
    expect(hooks).not.toMatch(/\.focus\(/);
  });
});

describe('QA D3: Run and Submit are at least 44 px tall below md, in both arms', () => {
  it('both buttons carry min-h-[44px], reset from md up', () => {
    for (const which of ['run', 'submit']) {
      const tag = new RegExp(`data-onboarding="${which}" className="([^"]+)"`).exec(barBlock)?.[1] || '';
      expect(tag.split(' '), which).toContain('min-h-[44px]');
      expect(tag.split(' '), which).toContain('md:min-h-0');
    }
    // One button element each, so the class is the same in both arms.
    expect(barBlock.match(/data-onboarding="run"/g)).toHaveLength(1);
    expect(barBlock.match(/data-onboarding="submit"/g)).toHaveLength(1);
  });
});

// The rank-1 promise is "one tap on Run shows a table" for a first-contact
// opener on an empty editor: Run runs `SELECT * FROM <tables[0]> LIMIT 5;`.
// That has to hold for every challenge in the bank, on its own dataset.
describe('every challenge in the bank: the starter on tables[0] runs on its dataset', () => {
  const sb = { window: { challengesData: [] }, console: { log() {}, warn() {} } };
  vm.createContext(sb);
  for (const f of ['datasets.js', 'finans-data.js', 'finans-fraud-data.js', 'gayrimenkul-data.js',
    'neobank-data.js', 'uretim-data.js', 'challenges.js', 'sector-challenges.js']) {
    vm.runInContext(readFileSync(here(`../src/data/${f}`), 'utf8'), sb);
  }
  const { publicDatasetsData: datasets, challengesData: bank } = sb.window;
  // The app's loader: the challenge's own dataset, plus any listed table that
  // lives in another dataset (challengeTablePlan, app.jsx loadChallengeDatasets).
  const dbs = {};
  const dbFor = (c) => {
    const plan = challengeTablePlan(c, datasets);
    const key = JSON.stringify(plan);
    if (dbs[key]) return dbs[key];
    const db = new Database(':memory:');
    for (const step of plan) {
      for (const [name, t] of Object.entries(datasets[step.dataset].tables)) {
        if (step.tables && !step.tables.includes(name)) continue;
        db.exec(`CREATE TABLE IF NOT EXISTS ${name} (${t.columns.map((col) => `"${col}"`).join(', ')})`);
        const ins = db.prepare(`INSERT INTO ${name} VALUES (${t.columns.map(() => '?').join(',')})`);
        db.transaction((rows) => rows.forEach((r) => ins.run(r.map((v) => (v === undefined ? null : v)))))(t.data);
      }
    }
    return (dbs[key] = db);
  };
  it('the bank loaded', () => {
    expect(bank.length).toBeGreaterThan(300);
  });
  it('the starter returns rows for every challenge', () => {
    const failures = [];
    for (const c of bank) {
      const sql = starterSqlFromHint(starterHintFor(c.tables?.[0] || 'table_name'));
      try {
        if (!datasets[c.dataset]) throw new Error(`no dataset ${c.dataset}`);
        const rows = dbFor(c).prepare(sql).all();
        if (!rows.length) throw new Error('no rows');
      } catch (e) {
        failures.push(`#${c.id} ${c.tables?.[0]}: ${e.message}`);
      }
    }
    expect(failures).toEqual([]);
  });
});

// A1 review of #271 (2026-11-24): the post-solve share bar is fixed at
// bottom-4 / z-50 and covered Run and Submit for up to 12 s in the bar arm.
it('the share bar lifts above the fixed Run bar on a phone', () => {
  const app = readFileSync(new URL('../src/app.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/input.css', import.meta.url), 'utf8');
  expect(app).toMatch(/function MilestoneShareBar[\s\S]{0,800}className="sq-share-bar fixed bottom-4/);
  expect(css).toMatch(/body\[data-run-bar="fixed"\] \.sq-share-bar \{\s*bottom: calc\(104px \+ env\(safe-area-inset-bottom\)\);/);
});
