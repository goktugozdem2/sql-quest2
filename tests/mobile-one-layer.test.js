// One layer at a time after a solve on phones — `mobileOneLayer` (2026-11-23,
// rank 3 of docs/plans/mobile-acquisition-2026-11-23.md). The walk at 390×844
// found five layers open at once after the first solve, with 24×24 and
// 9×16 px close targets. The `one` arm shows the ask, holds the rest until the
// next challenge opens, and gives every shown layer 44×44 close targets.
// Desktop and `control` keep today's behaviour.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  MOBILE_ONE_LAYER_ARMS, MOBILE_ONE_LAYER_MAX_WIDTH, ONE_LAYER_ASKS, ONE_LAYER_EXTRAS, ONE_LAYER_ORDER,
  ONE_LAYER_MIN_TARGET_PX,
  isNarrowTouch, mobileOneLayerArm, mobileOneLayerDecision, oneLayerPick, oneLayerRelease,
} from '../src/utils/mobile-one-layer.js';
import { firstScreenArm } from '../src/utils/first-screen.js';
import { companyAskArm } from '../src/utils/company-ask.js';
import { companyDirectArm } from '../src/utils/company-direct.js';
import { modalLayoutHashArm } from '../src/utils/modal-layout.js';
import { quotaWallHashArm } from '../src/utils/quota-wall-inline.js';

const here = (rel) => fileURLToPath(new URL(rel, import.meta.url));
const app = readFileSync(here('../src/app.jsx'), 'utf8');
const flags = readFileSync(here('../src/data/feature-flags.js'), 'utf8');

// mobileRunBar's arm (PR #271, not on main when this was written): the same
// construction with its own salt. Copied so the independence check runs now;
// once #271 lands, import `mobileRunBarArm` from src/utils/mobile-run-bar.js.
function mobileRunBarArm(aid) {
  let h = 2166136261;
  const s = `${String(aid)}:mobile_run_bar_v1`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return ['control', 'bar'][(h >>> 0) % 2];
}

const fnBody = (name) => {
  const a = app.indexOf(`function ${name}(`);
  return app.slice(a, app.indexOf('\n}\n', a));
};

describe('isNarrowTouch — the local copy of #271’s rule', () => {
  it('is true at a coarse pointer or under 768 px, false at 1280 with a fine pointer', () => {
    expect(isNarrowTouch({ coarse: true, width: 1280 })).toBe(true);
    expect(isNarrowTouch({ coarse: false, width: 390 })).toBe(true);
    expect(isNarrowTouch({ coarse: false, width: 767 })).toBe(true);
    expect(isNarrowTouch({ coarse: false, width: 768 })).toBe(false);
    expect(isNarrowTouch({ coarse: false, width: 1280 })).toBe(false);
    expect(isNarrowTouch({})).toBe(false);
    expect(MOBILE_ONE_LAYER_MAX_WIDTH).toBe(768);
  });
});

describe('the arm — 50/50 by aid, murmur-finalised, independent of every other two-arm test', () => {
  const N = 10000;
  const aids = Array.from({ length: N }, (_, i) => `aid-${i}-${(i * 7919) % 1000}`);
  it('is deterministic and one of the two arms', () => {
    expect(MOBILE_ONE_LAYER_ARMS).toEqual(['control', 'one']);
    expect(mobileOneLayerArm('x')).toBe(mobileOneLayerArm('x'));
  });
  it('splits within ±3 points of 50/50 over 10,000 aids', () => {
    const one = aids.filter((a) => mobileOneLayerArm(a) === 'one').length;
    expect(Math.abs(one / N - 0.5)).toBeLessThan(0.03);
  });
  const others = {
    mobileRunBarArm: (a) => mobileRunBarArm(a) === 'bar',
    firstScreenArm: (a) => firstScreenArm(a) === 'challenge',
    companyAskArm: (a) => companyAskArm(a) === 'ask',
    companyDirectArm: (a) => companyDirectArm(a) === 'direct',
    modalLayoutHashArm: (a) => modalLayoutHashArm(a) === 'plans_first',
    quotaWallHashArm: (a) => quotaWallHashArm(a) === 'inline',
  };
  for (const [name, isFirst] of Object.entries(others)) {
    it(`is independent of ${name} (agreement within 50 ± 3%)`, () => {
      let same = 0;
      for (const a of aids) if ((mobileOneLayerArm(a) === 'one') === isFirst(a)) same++;
      expect(Math.abs(same / N - 0.5)).toBeLessThan(0.03);
    });
  }
});

describe('mobileOneLayerDecision — assigned once, at a solve, only on a narrow touch screen', () => {
  const aidIn = (arm) => { for (let i = 0; i < 1000; i++) { const a = `p-${i}`; if (mobileOneLayerArm(a) === arm) return a; } throw new Error('no aid'); };
  const NONE = { arm: null, assign: false, show: false };
  it('flag off: nothing assigned, nothing shown, whatever is stored', () => {
    expect(mobileOneLayerDecision({ flagOn: false, narrowTouch: true, aid: aidIn('one'), atSolve: true })).toEqual(NONE);
    expect(mobileOneLayerDecision({ flagOn: false, narrowTouch: true, stored: { arm: 'one' } })).toEqual(NONE);
  });
  it('a desktop solver is never assigned', () => {
    expect(mobileOneLayerDecision({ flagOn: true, narrowTouch: false, aid: aidIn('one'), atSolve: true })).toEqual(NONE);
  });
  it('a challenge open reads the record but never assigns', () => {
    expect(mobileOneLayerDecision({ flagOn: true, narrowTouch: true, aid: aidIn('one'), atSolve: false })).toEqual(NONE);
  });
  it('a solve on a phone assigns by the hash; `one` shows, `control` does not', () => {
    expect(mobileOneLayerDecision({ flagOn: true, narrowTouch: true, aid: aidIn('one'), atSolve: true })).toEqual({ arm: 'one', assign: true, show: true });
    expect(mobileOneLayerDecision({ flagOn: true, narrowTouch: true, aid: aidIn('control'), atSolve: true })).toEqual({ arm: 'control', assign: true, show: false });
  });
  it('a stored arm is sticky and never re-announced; a `one` person on a desktop gets today’s layers', () => {
    expect(mobileOneLayerDecision({ flagOn: true, narrowTouch: true, stored: { arm: 'control' }, aid: aidIn('one'), atSolve: true })).toEqual({ arm: 'control', assign: false, show: false });
    expect(mobileOneLayerDecision({ flagOn: true, narrowTouch: true, stored: { arm: 'one' }, aid: aidIn('control') })).toEqual({ arm: 'one', assign: false, show: true });
    expect(mobileOneLayerDecision({ flagOn: true, narrowTouch: false, stored: { arm: 'one' }, atSolve: true })).toEqual({ arm: 'one', assign: false, show: false });
  });
});

describe('the queue — fixed priority, one layer at a time', () => {
  const ALL = ['streak_card', 'milestone_share', 'radar_pop', 'level_up', 'achievement', 'intent_ask', 'soft_email'];
  it('the order is the asks (company ask, soft email, intent), then achievement, level up, Skillmap card, share bar, streak card', () => {
    expect(ONE_LAYER_ASKS).toEqual(['company_ask', 'soft_email', 'intent_ask']);
    expect(ONE_LAYER_EXTRAS).toEqual(['achievement', 'level_up', 'radar_pop', 'milestone_share', 'streak_card']);
    expect(ONE_LAYER_ORDER).toEqual([...ONE_LAYER_ASKS, ...ONE_LAYER_EXTRAS]);
  });
  it('the ask wins over everything, in the solve moment and after', () => {
    expect(oneLayerPick({ active: ALL, hold: true })).toBe('soft_email');
    expect(oneLayerPick({ active: ALL.filter((x) => x !== 'soft_email'), hold: true })).toBe('intent_ask');
    expect(oneLayerPick({ active: ['achievement', 'intent_ask'], hold: false })).toBe('intent_ask');
  });
  it('nothing of tier 3 shows while the solve hold is on', () => {
    expect(oneLayerPick({ active: ONE_LAYER_EXTRAS, hold: true })).toBe(null);
  });
  it('a toast never stacks over a modal', () => {
    expect(oneLayerPick({ active: ONE_LAYER_EXTRAS, hold: false, modalOpen: true })).toBe(null);
  });
  it('without hold or modal, tier 3 goes one at a time in order', () => {
    const shown = [];
    let active = [...ONE_LAYER_EXTRAS].reverse();
    while (active.length) {
      const top = oneLayerPick({ active });
      shown.push(top);
      active = active.filter((x) => x !== top);
    }
    expect(shown).toEqual(ONE_LAYER_EXTRAS);
  });
  it('one layer at a time: the pick is a single id from the active set, for every subset', () => {
    for (let mask = 1; mask < 1 << ALL.length; mask++) {
      const active = ALL.filter((_, i) => mask & (1 << i));
      for (const hold of [true, false]) {
        const top = oneLayerPick({ active, hold });
        if (top !== null) expect(active).toContain(top);
        const visible = active.filter((id) => id === top);
        expect(visible.length).toBeLessThanOrEqual(1);
      }
    }
  });
  it('unknown ids are ignored', () => {
    expect(oneLayerPick({ active: ['pro_modal', 'confetti'] })).toBe(null);
  });
  it('the release keeps the first held layer and drops the rest; asks are never dropped', () => {
    expect(oneLayerRelease(['radar_pop', 'achievement', 'milestone_share', 'intent_ask']))
      .toEqual({ keep: 'achievement', drop: ['radar_pop', 'milestone_share'] });
    expect(oneLayerRelease([])).toEqual({ keep: null, drop: [] });
  });
});

describe('app.jsx — the gates, the targets, desktop and the flag', () => {
  it('the flag is an explicit boolean (ON 2026-11-24 by decision row; off is the revert)', () => {
    expect(flags).toMatch(/\n\s*mobileOneLayer: (true|false),/);
  });
  it('the hooks sit above the early returns (fragile area 1)', () => {
    const hooks = app.indexOf('const [oneLayerOn, setOneLayerOn] = useState(false);');
    const release = app.indexOf('const { drop } = oneLayerRelease(oneLayerActive);');
    expect(hooks).toBeGreaterThan(0);
    expect(release).toBeGreaterThan(hooks);
    const early = Math.min(app.indexOf('\n  if (showAuth) {'), app.indexOf('\n  if (!dbReady) return ('));
    expect(release).toBeLessThan(early);
  });
  it('the arm is assigned at the correct submit, before the celebrations are set', () => {
    const at = app.indexOf('armOneLayerAtSolve(currentChallenge.id);');
    const success = app.indexOf("setChallengeStatus('success');");
    expect(at).toBeGreaterThan(success);
    expect(at).toBeLessThan(app.indexOf('setRadarPop({', success));
    expect(app).toMatch(/trackActivationEvent\('mobile_one_layer_assigned', \{ arm: decision\.arm/);
  });
  it('every post-solve layer is gated through oneLayerOk with its own id', () => {
    expect(app).toContain("!interviewFirstOn('achievement_toast') && oneLayerOk('achievement') && <AchievementPopup");
    expect(app).toContain("{showLevelUp && oneLayerOk('level_up') && <LevelUpBanner");
    expect(app).toContain("{radarPop && oneLayerOk('radar_pop') && <RadarPopToast");
    expect(app).toContain("{milestoneShare && oneLayerOk('milestone_share') && (() => {");
    expect(app).toContain("{showIntentAsk && !showSoftEmailCapture && oneLayerOk('intent_ask') && (");
    expect(app).toContain("{showSoftEmailCapture && oneLayerOk('soft_email') && (");
    expect(app).toMatch(/if \(oneLayerOn && oneLayerTop !== 'streak_card'\) return undefined;/);
  });
  it('flag off, control and desktop: oneLayerOn stays false, so every gate passes (today’s render)', () => {
    // Tournament arm B (2026-11-26) holds the extras on its ladder, and arms
    // B / D run their own one-layer queue in the first session (walk fix
    // round 2); outside the arms every switch is false
    // (tests/single-path.test.js) and the gate is today's.
    expect(app).toContain('const oneLayerOk = (id) => (pathUi.layerQueue ? pathLayerOk(id) : ((pathUi.holdLayers || pathHeldRelease) && ONE_LAYER_EXTRAS.includes(id) ? false : (!oneLayerOn || oneLayerTop === id)));');
    // oneLayerOn is only ever set from a decision's `show`, which is false
    // with the flag off, in control, and off a narrow touch screen.
    const sets = app.match(/setOneLayerOn\(([^)]*)\)/g);
    expect(sets).toEqual(['setOneLayerOn(decision.show)', 'setOneLayerOn(decision.show)']);
    // The decision reads the flag, never a hard-coded true.
    expect(app.match(/flagOn: ftbFlag\('mobileOneLayer'\)/g)).toHaveLength(2);
  });
  it('desktop untouched: the big targets are only ever switched on by oneLayerOn', () => {
    expect(app.match(/bigTargets=\{oneLayerOn\}/g)).toHaveLength(3);
    expect(app).not.toMatch(/bigTargets=\{true\}/);
    for (const name of ['AchievementPopup', 'RadarPopToast', 'MilestoneShareBar']) {
      expect(fnBody(name)).toMatch(/bigTargets = false/);
    }
  });
  it(`every close target on a shown layer is at least ${ONE_LAYER_MIN_TARGET_PX}×${ONE_LAYER_MIN_TARGET_PX} in the arm`, () => {
    expect(ONE_LAYER_MIN_TARGET_PX).toBe(44);
    // Tailwind: w-11 / h-11 = 2.75rem = 44 px; min-*-[44px] literal.
    const radar = fnBody('RadarPopToast');
    expect(radar).toMatch(/bigTargets\s*\?\s*'absolute top-0 right-0 w-11 h-11 /);
    expect(radar.match(/\$\{bigTargets \? ' min-h-\[44px\]' : ''\}/g)).toHaveLength(2);
    const ach = fnBody('AchievementPopup');
    expect(ach).toMatch(/\{bigTargets && \(\s*<button[^>]*onClick=\{onClose\}[^>]*className="min-w-\[44px\] min-h-\[44px\]/);
    const share = fnBody('MilestoneShareBar');
    expect(share).toMatch(/onDismiss\(\); \}\}[^>]*\$\{bigTargets \? ' min-w-\[44px\] min-h-\[44px\]/);
    expect(share.match(/\$\{bigTargets \? ' min-h-\[44px\]' : ''\}/g)).toHaveLength(4);
    // The asks and the streak card, inline in the component body.
    expect(app).toContain("className={`w-full text-left p-3 transition-colors${oneLayerOn ? ' min-h-[44px]' : ''}`}");
    expect(app).toContain("className={`w-full text-center text-xs mt-3 underline${oneLayerOn ? ' min-h-[44px]' : ''}`}");
    expect(app).toContain("className={`w-full mt-3 py-2 text-gray-400 hover:text-[#F2F0EA] text-sm transition-all${oneLayerOn ? ' min-h-[44px]' : ''}`}");
    expect(app).toContain("className={`text-sm leading-none px-1${oneLayerOn ? ' min-w-[44px] min-h-[44px] flex items-center justify-center' : ''}`}");
  });
  it('control keeps today’s class strings byte for byte', () => {
    const radar = fnBody('RadarPopToast');
    expect(radar).toContain(": 'absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-200 text-base rounded-full hover:bg-white/5'}");
    expect(fnBody('AchievementPopup')).toContain(": 'fixed top-3 right-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-[#F2F0EA] px-3 py-2 rounded-lg shadow-lg animate-bounce z-50 flex items-center gap-2 text-sm'}");
  });
});
