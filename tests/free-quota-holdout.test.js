// The free-quota holdout — a 50/50 test of `freeQuota` on new visitors
// (founder's written go, 2026-11-25). Pure half: src/utils/free-quota-holdout.js.
// Wiring: src/app.jsx (module-load enrolment, freeQuotaOn(), writeProEvent).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  FREE_QUOTA_ARMS, FREE_QUOTA_HOLDOUT_KEY, FREE_QUOTA_HOLDOUT_START, FREE_QUOTA_HOLDOUT_END,
  FREE_QUOTA_HOLDOUT_START_ISO, FREE_QUOTA_HOLDOUT_END_ISO, FREE_QUOTA_HOLDOUT_READ_DATE, PRE_APP_KEYS,
  freeQuotaArm, hasPriorAppUse, normalizeFreeQuotaRecord, freeQuotaEnrolment, enrolledArm,
  freeQuotaHoldoutActive, freeQuotaEffective, freeQuotaEventStamp,
} from '../src/utils/free-quota-holdout.js';
import { quotaGate, milestoneTier, FREE_SOLVE_QUOTA } from '../src/utils/free-tier-boundary.js';
import { firstScreenArm } from '../src/utils/first-screen.js';
import { companyAskArm } from '../src/utils/company-ask.js';
import { quotaWallHashArm } from '../src/utils/quota-wall-inline.js';
import { modalLayoutHashArm } from '../src/utils/modal-layout.js';
import { companyDirectArm } from '../src/utils/company-direct.js';
import { runSubmitNudgeArm } from '../src/utils/run-submit-nudge.js';
import { mobileRunBarArm } from '../src/utils/mobile-run-bar.js';
import { mobileOneLayerArm } from '../src/utils/mobile-one-layer.js';
import { FREE_QUOTA_HOLDOUT_KEY as SMOKE_FQ_KEY, FREE_QUOTA_OUT_OF_TEST, firstScreenArmPreamble } from '../scripts/smoke/lib.mjs';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const APP = read('src/app.jsx');
const FLAGS = read('src/data/feature-flags.js');

const IN_WINDOW = FREE_QUOTA_HOLDOUT_START + 3 * 86400000;
const aidIn = (arm) => { for (let i = 0; i < 1000; i++) { const a = `aid-${i}`; if (freeQuotaArm(a) === arm) return a; } throw new Error('no aid'); };
const HOLD_AID = aidIn('holdout');
const QUOTA_AID = aidIn('quota');
const enrolled = (arm) => ({ status: 'enrolled', arm, firstOpenAt: IN_WINDOW, announced: true });

// The homepage hero CTA test lives in src/track.js (a classic script); its
// hash is lifted out so independence is checked against the real function.
const ctaArmIndex = (() => {
  const src = read('src/track.js');
  const id = src.match(/var CTA_TEST_ID = '([^']+)';/)[1];
  const arms = (src.match(/var CTA_ARMS = \[([\s\S]*?)\n\s*\];/)[1].match(/\[/g) || []).length;
  const body = src.match(/function ctaArmIndex\(id\) \{([\s\S]*?)\n {2}\}/)[1];
  return new Function('id', `var CTA_TEST_ID = ${JSON.stringify(id)}; var CTA_ARMS = { length: ${arms} };${body}`);
})();

describe('the arm', () => {
  it('is stable per aid and splits about evenly', () => {
    expect(freeQuotaArm('x')).toBe(freeQuotaArm('x'));
    let hold = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) if (freeQuotaArm(`p${i}`) === 'holdout') hold++;
    expect(hold / n).toBeGreaterThan(0.46);
    expect(hold / n).toBeLessThan(0.54);
    expect(FREE_QUOTA_ARMS).toEqual(['quota', 'holdout']);
  });

  // The A/B hash trap (CLAUDE.md): an FNV two-arm split without the murmur3
  // finalizer is the exact mirror of every other one.
  const others = {
    'first screen': (a) => firstScreenArm(a) === 'challenge',
    'company ask': (a) => companyAskArm(a) === 'ask',
    'quota wall inline': (a) => quotaWallHashArm(a) === 'inline',
    'modal layout': (a) => modalLayoutHashArm(a) === 'plans_first',
    'company direct': (a) => companyDirectArm(a) === 'direct',
    'run/submit nudge': (a) => runSubmitNudgeArm(a) === 'nudge',
    'mobile run bar': (a) => mobileRunBarArm(a) === 'bar',
    'mobile one layer': (a) => mobileOneLayerArm(a) === 'one',
  };
  for (const [name, inOther] of Object.entries(others)) {
    it(`is independent of the ${name} test`, () => {
      let same = 0;
      const n = 4000;
      for (let i = 0; i < n; i++) {
        const a = `p${i}`;
        if ((freeQuotaArm(a) === 'holdout') === inOther(a)) same++;
      }
      expect(same / n).toBeGreaterThan(0.45);
      expect(same / n).toBeLessThan(0.55);
    });
  }

  it('is independent of the homepage CTA test (five arms, src/track.js)', () => {
    let ctl = 0;
    let holdInCtl = 0;
    for (let i = 0; i < 6000; i++) {
      const a = `p${i}`;
      if (ctaArmIndex(a) !== 0) continue;
      ctl++;
      if (freeQuotaArm(a) === 'holdout') holdInCtl++;
    }
    expect(ctl).toBeGreaterThan(900);
    expect(holdInCtl / ctl).toBeGreaterThan(0.44);
    expect(holdInCtl / ctl).toBeLessThan(0.56);
  });
});

describe('the window', () => {
  it('is four weeks, read on the 7th day after it closes', () => {
    expect(FREE_QUOTA_HOLDOUT_START).toBe(Date.parse(FREE_QUOTA_HOLDOUT_START_ISO));
    expect(FREE_QUOTA_HOLDOUT_END - FREE_QUOTA_HOLDOUT_START).toBe(28 * 86400000);
    expect(Date.parse(`${FREE_QUOTA_HOLDOUT_READ_DATE}T00:00:00Z`) - FREE_QUOTA_HOLDOUT_END).toBe(7 * 86400000);
    expect(FREE_QUOTA_HOLDOUT_END_ISO).toMatch(/^\d{4}-\d\d-\d\dT00:00:00Z$/);
  });
});

describe('who has been here before', () => {
  it('pre-app keys alone (a landing visit) are a new person', () => {
    expect(hasPriorAppUse([])).toBe(false);
    expect(hasPriorAppUse([...PRE_APP_KEYS])).toBe(false);
    expect(hasPriorAppUse(['sqlquest_aid', FREE_QUOTA_HOLDOUT_KEY, 'other_site_key'])).toBe(false);
  });

  it('any key the app writes is a returning browser', () => {
    for (const k of ['sqlquest_guest_user', 'sqlquest_user', 'sqlquest_user_guest_1', 'sqlquest_first_screen_v1', 'sqlquest_arrival_src', 'sqlquest_lang', 'sqlquest_funnel_first_open_guest']) {
      expect(hasPriorAppUse(['sqlquest_aid', k]), k).toBe(true);
    }
  });

  // PRE_APP_KEYS must hold every key a page outside the app can write, or a
  // landing visitor would be filed as returning (never enrolled), and no app
  // key, or a returning browser would be re-armed.
  it('PRE_APP_KEYS is exactly what the pages outside the app can write', () => {
    const files = [];
    const walk = (dir) => {
      for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
        const rel = path.join(dir, e.name);
        if (e.isDirectory()) walk(rel);
        else if (e.name.endsWith('.html') && rel !== path.join('src', 'app.html')) files.push(rel);
      }
    };
    walk('src');
    files.push('src/track.js', 'src/blog-quiz.js');
    for (const f of fs.readdirSync(path.join(ROOT, 'scripts'))) if (/^build-.*\.(mjs|js)$/.test(f)) files.push(path.join('scripts', f));
    const seen = new Set();
    for (const f of files) {
      for (const m of read(f).matchAll(/(?<![@\w])sqlquest_[a-z0-9_]+/g)) seen.add(m[0]);
    }
    // Read by the pages (to say "welcome back"), never written by them.
    const readOnly = new Set(['sqlquest_user']);
    for (const k of seen) {
      if (readOnly.has(k)) continue;
      expect(PRE_APP_KEYS, `${k} is written outside the app`).toContain(k);
    }
    for (const k of PRE_APP_KEYS) expect(seen.has(k), `${k} is no longer written by any page`).toBe(true);
    for (const f of files) expect(read(f), f).not.toMatch(/setItem\(\s*['"]sqlquest_user['"]/);
  });
});

describe('enrolment — once per browser, new people only', () => {
  it('a new browser in the window is enrolled with its hash arm', () => {
    const d = freeQuotaEnrolment({ flagOn: true, aid: HOLD_AID, now: IN_WINDOW, priorAppUse: false });
    expect(d.write).toEqual({ status: 'enrolled', arm: 'holdout', firstOpenAt: IN_WINDOW, announced: false });
    expect(d.record).toEqual(d.write);
    expect(freeQuotaEnrolment({ flagOn: true, aid: QUOTA_AID, now: IN_WINDOW }).record.arm).toBe('quota');
  });

  it('a browser with app state is never enrolled: returning, today\'s quota', () => {
    const d = freeQuotaEnrolment({ flagOn: true, aid: HOLD_AID, now: IN_WINDOW, priorAppUse: true });
    expect(d.write).toEqual({ status: 'returning', arm: null, firstOpenAt: null, announced: false });
    expect(enrolledArm(d.record)).toBe(null);
  });

  it('a stored record always wins — nobody is re-armed', () => {
    // returning stays returning, even on a later open that looks new
    const ret = { status: 'returning', arm: null, firstOpenAt: null };
    expect(freeQuotaEnrolment({ flagOn: true, record: ret, aid: HOLD_AID, now: IN_WINDOW, priorAppUse: false })).toEqual({ write: null, record: { ...ret, announced: false } });
    // an arm is kept whatever the aid hashes to now
    const q = enrolled('quota');
    expect(freeQuotaEnrolment({ flagOn: true, record: q, aid: HOLD_AID, now: IN_WINDOW }).record.arm).toBe('quota');
    expect(freeQuotaEnrolment({ flagOn: true, record: q, aid: HOLD_AID, now: IN_WINDOW }).write).toBe(null);
    // after the window closes an enrolled browser keeps its arm
    expect(freeQuotaEnrolment({ flagOn: true, record: enrolled('holdout'), aid: QUOTA_AID, now: FREE_QUOTA_HOLDOUT_END + 86400000 }).record.arm).toBe('holdout');
    // outside_window stays outside
    const out = { status: 'outside_window', arm: null, firstOpenAt: FREE_QUOTA_HOLDOUT_START - 1 };
    expect(freeQuotaEnrolment({ flagOn: true, record: out, aid: HOLD_AID, now: IN_WINDOW }).write).toBe(null);
  });

  it('a first open outside the window is recorded and never enrolled', () => {
    for (const now of [FREE_QUOTA_HOLDOUT_START - 1, FREE_QUOTA_HOLDOUT_END, FREE_QUOTA_HOLDOUT_END + 86400000]) {
      const d = freeQuotaEnrolment({ flagOn: true, aid: HOLD_AID, now, priorAppUse: false });
      expect(d.write).toEqual({ status: 'outside_window', arm: null, firstOpenAt: now, announced: false });
    }
    expect(freeQuotaEnrolment({ flagOn: true, aid: HOLD_AID, now: FREE_QUOTA_HOLDOUT_START }).record.status).toBe('enrolled');
  });

  it('flag off: nothing is written and nobody is enrolled', () => {
    expect(freeQuotaEnrolment({ flagOn: false, aid: HOLD_AID, now: IN_WINDOW })).toEqual({ write: null, record: null });
    expect(freeQuotaEnrolment({ aid: HOLD_AID, now: IN_WINDOW })).toEqual({ write: null, record: null });
  });

  it('no aid or no clock: nothing written', () => {
    expect(freeQuotaEnrolment({ flagOn: true, aid: null, now: IN_WINDOW })).toEqual({ write: null, record: null });
    expect(freeQuotaEnrolment({ flagOn: true, aid: HOLD_AID, now: null })).toEqual({ write: null, record: null });
  });

  it('an unreadable record is treated as none', () => {
    for (const bad of [null, 'x', {}, { status: 'enrolled', arm: 'coin' }, { status: 'maybe' }]) {
      expect(normalizeFreeQuotaRecord(bad)).toBe(null);
    }
  });
});

describe('what each arm meets', () => {
  const base = { quotaFlagOn: true, holdoutFlagOn: true };

  it('holdout: freeQuota reads OFF — no wall at any count, no counter, the tenth-solve ask back', () => {
    const on = freeQuotaEffective({ ...base, record: enrolled('holdout') });
    expect(on).toBe(false);
    // the wall (quotaGate) and the row locks
    expect(quotaGate({ flagOn: on, solvedCount: 37 }).gated).toBe(false);
    expect(quotaGate({ flagOn: on, solvedCount: FREE_SOLVE_QUOTA }).gated).toBe(false);
    // the milestone ladder is the pre-09-26 one (tier 10 not skipped)
    expect(milestoneTier(10, { quotaOn: on })).toBe(10);
  });

  it('quota (control): today, unchanged', () => {
    const on = freeQuotaEffective({ ...base, record: enrolled('quota') });
    expect(on).toBe(true);
    expect(quotaGate({ flagOn: on, solvedCount: FREE_SOLVE_QUOTA }).gated).toBe(true);
    expect(quotaGate({ flagOn: on, solvedCount: 9 }).gated).toBe(false);
    expect(milestoneTier(10, { quotaOn: on })).toBe(0);
  });

  it('not in the test (returning, outside the window, no record): today', () => {
    for (const record of [null, { status: 'returning', arm: null }, { status: 'outside_window', arm: null, firstOpenAt: 1 }]) {
      expect(freeQuotaEffective({ ...base, record })).toBe(true);
    }
  });

  it('the holdout flag gates it: off → a holdout browser gets the quota back', () => {
    expect(freeQuotaEffective({ quotaFlagOn: true, holdoutFlagOn: false, record: enrolled('holdout') })).toBe(true);
    expect(freeQuotaHoldoutActive({ flagOn: false, record: enrolled('holdout') })).toBe(false);
    // and the quota flag itself still rules everyone
    expect(freeQuotaEffective({ quotaFlagOn: false, holdoutFlagOn: true, record: enrolled('quota') })).toBe(false);
  });

  it('an account created before the window keeps the quota on a holdout browser', () => {
    const before = new Date(FREE_QUOTA_HOLDOUT_START - 86400000).toISOString();
    expect(freeQuotaHoldoutActive({ flagOn: true, record: enrolled('holdout'), signedIn: true, accountCreatedAt: before })).toBe(false);
    expect(freeQuotaHoldoutActive({ flagOn: true, record: enrolled('holdout'), signedIn: true, accountCreatedAt: FREE_QUOTA_HOLDOUT_START - 1 })).toBe(false);
    // a holdout guest who registers carries a fresh createdAt: still holdout
    expect(freeQuotaHoldoutActive({ flagOn: true, record: enrolled('holdout'), signedIn: true, accountCreatedAt: IN_WINDOW + 60000 })).toBe(true);
    // an account still loading (no createdAt yet) does not take it away
    expect(freeQuotaHoldoutActive({ flagOn: true, record: enrolled('holdout'), signedIn: true, accountCreatedAt: null })).toBe(true);
    // a guest is never judged by an account date
    expect(freeQuotaHoldoutActive({ flagOn: true, record: enrolled('holdout'), signedIn: false, accountCreatedAt: before })).toBe(true);
  });

  it('every row from an enrolled browser carries fqArm; nobody else\'s does', () => {
    expect(freeQuotaEventStamp({ flagOn: true, record: enrolled('holdout') })).toEqual({ fqArm: 'holdout' });
    expect(freeQuotaEventStamp({ flagOn: true, record: enrolled('quota') })).toEqual({ fqArm: 'quota' });
    expect(freeQuotaEventStamp({ flagOn: true, record: { status: 'returning', arm: null } })).toEqual({});
    expect(freeQuotaEventStamp({ flagOn: false, record: enrolled('holdout') })).toEqual({});
  });
});

describe('the wiring in app.jsx', () => {
  it('the flag ships ON with the founder\'s go', () => {
    expect(FLAGS).toMatch(/^\s+freeQuotaHoldout: true,/m);
  });

  it('every freeQuota read goes through freeQuotaOn() — none reads the bare flag', () => {
    const bare = APP.match(/ftbFlag\('freeQuota'\)/g) || [];
    expect(bare).toHaveLength(1);
    expect(APP).toMatch(/const freeQuotaOn = \(\) => freeQuotaEffective\(\{\n\s+quotaFlagOn: ftbFlag\('freeQuota'\),\n\s+holdoutFlagOn: ftbFlag\('freeQuotaHoldout'\),\n\s+record: FQ_HOLDOUT_RECORD,/);
    expect(APP).not.toMatch(/FF\?\.feature\?\.\('freeQuota'\)/);
    // the surfaces the holdout must not see
    expect(APP).toMatch(/\{freeQuotaOn\(\) && !isPro \? \(\n\s+<span data-testid="free-quota-counter">/);
    expect(APP).toMatch(/const quota = quotaGate\(\{ flagOn: freeQuotaOn\(\), isPro, solvedCount: solvedChallenges\.size, alreadySolved: solvedChallenges\.has\(challenge\.id\) \}\);/);
    expect(APP).toMatch(/freeQuotaOn\(\) \? 'coachStripLineQuota' : 'coachStripLine'/);
    expect(APP).toMatch(/freeQuotaOn\(\) \? 'remainingQuota' : 'remaining'/);
  });

  it('enrolment runs at module load, before the app writes any key', () => {
    const block = APP.indexOf('let FQ_HOLDOUT_RECORD = null;');
    expect(block).toBeGreaterThan(-1);
    const firstWrite = APP.indexOf('localStorage.setItem(');
    const ownWrite = APP.indexOf('localStorage.setItem(FREE_QUOTA_HOLDOUT_KEY, JSON.stringify(decision.write))');
    expect(ownWrite).toBe(firstWrite);
    expect(block).toBeLessThan(APP.indexOf("const lang = params.get('lang');"));
    const src = APP.slice(block, block + 1600);
    expect(src).toMatch(/for \(let i = 0; i < localStorage\.length; i\+\+\) keys\.push\(localStorage\.key\(i\)\);/);
    expect(src.indexOf('keys.push')).toBeLessThan(src.indexOf('getAnonId()'));
    expect(src).toMatch(/priorAppUse: hasPriorAppUse\(keys\)/);
  });

  it('writeProEvent stamps fqArm on every row, and the assignment is announced once', () => {
    // (the tournament's tArm stamp rides beside it from 2026-11-26)
    expect(APP).toMatch(/metadata: JSON\.stringify\(\{ \.\.\.metadata, \.\.\.fqEventStamp\(\),( \.\.\.tEventStamp\(\),)? aid: getAnonId\(\) \}\)/);
    expect(APP).toMatch(/trackActivationEvent\('free_quota_arm_assigned', \{ testId: FREE_QUOTA_HOLDOUT_TEST_ID, arm: rec\.arm,/);
    expect(APP).toMatch(/if \(!rec \|\| rec\.status !== 'enrolled' \|\| rec\.announced\) return;/);
  });

  it('its hooks sit above the early returns', () => {
    const early = APP.indexOf('  if (showAuth) {');
    expect(APP.indexOf('const fqAccountCreatedAt = useMemo(')).toBeLessThan(early);
    expect(APP.indexOf("trackActivationEvent('free_quota_arm_assigned'")).toBeLessThan(early);
  });

  it('the smoke battery stays out of the test (the quota wall check must see the wall)', () => {
    expect(SMOKE_FQ_KEY).toBe(FREE_QUOTA_HOLDOUT_KEY);
    expect(normalizeFreeQuotaRecord(FREE_QUOTA_OUT_OF_TEST)).toEqual({ status: 'returning', arm: null, firstOpenAt: null, announced: false });
    for (const arm of ['quiz', 'challenge']) {
      const store = {};
      new Function('localStorage', firstScreenArmPreamble(arm))({ setItem: (k, v) => { store[k] = v; } });
      const rec = JSON.parse(store[FREE_QUOTA_HOLDOUT_KEY]);
      expect(freeQuotaEnrolment({ flagOn: true, record: rec, aid: HOLD_AID, now: IN_WINDOW }).write).toBe(null);
      expect(freeQuotaEffective({ quotaFlagOn: true, holdoutFlagOn: true, record: rec })).toBe(true);
    }
  });
});
