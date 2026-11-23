// The quota wall asks once a day, then waits inline (M-07,
// docs/plans/monetization-ideas-2026-11-22.md) — an A/B by aid. Pins: the
// arm is a murmur-finalised hash independent of the other live tests; the
// inline arm opens the modal on the first hit of the day only, control on
// every hit; every hit still writes content_lock_reached with `modal`; the
// inline card offers the trial (by the person's click) and the modal's own
// free roads back; the day is stamped when the modal shows.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  quotaWallArm, quotaWallHashArm, quotaWallShowsModal, quotaInlineCopy,
  QUOTA_WALL_TEST_ID, QUOTA_WALL_ARMS, QUOTA_WALL_DAY_KEY,
} from '../src/utils/quota-wall-inline.js';
import { firstScreenArm } from '../src/utils/first-screen.js';
import { companyAskArm } from '../src/utils/company-ask.js';
import { modalLayoutHashArm } from '../src/utils/modal-layout.js';
import { TRIAL_DAYS } from '../src/utils/checkout-session.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const app = fs.readFileSync(path.join(ROOT, 'src/app.jsx'), 'utf8');
const flags = fs.readFileSync(path.join(ROOT, 'src/data/feature-flags.js'), 'utf8');

describe('the arm', () => {
  it('flag off or no aid → control, for everyone', () => {
    expect(quotaWallArm({ flagOn: false, aid: 'abc' })).toBe('control');
    expect(quotaWallArm({ flagOn: true, aid: null })).toBe('control');
    expect(quotaWallArm()).toBe('control');
    expect(QUOTA_WALL_TEST_ID).toBe('quota_wall_inline_v1');
    expect(QUOTA_WALL_ARMS).toEqual(['inline', 'control']);
  });
  it('sticky and about half and half', () => {
    let inline = 0;
    for (let i = 0; i < 4000; i++) {
      const a = `aid-${i}`;
      expect(quotaWallArm({ flagOn: true, aid: a })).toBe(quotaWallHashArm(a));
      if (quotaWallHashArm(a) === 'inline') inline++;
    }
    expect(inline / 4000).toBeGreaterThan(0.45);
    expect(inline / 4000).toBeLessThan(0.55);
  });
  it('independent of the first-screen, company-ask and modal-layout tests (the A/B hash trap)', () => {
    const n = 4000;
    const agree = { first: 0, ask: 0, layout: 0 };
    for (let i = 0; i < n; i++) {
      const a = `p${i}`;
      const mine = quotaWallHashArm(a) === 'inline';
      if (mine === (firstScreenArm(a) === 'challenge')) agree.first++;
      if (mine === (companyAskArm(a) === 'ask')) agree.ask++;
      if (mine === (modalLayoutHashArm(a) === 'plans_first')) agree.layout++;
    }
    for (const [k, v] of Object.entries(agree)) {
      expect(v / n, k).toBeGreaterThan(0.45);
      expect(v / n, k).toBeLessThan(0.55);
    }
  });
});

describe('when the modal shows', () => {
  it('control: every hit', () => {
    expect(quotaWallShowsModal({ arm: 'control', lastModalDay: '2026-11-22', today: '2026-11-22' })).toBe(true);
    expect(quotaWallShowsModal({ arm: 'control', lastModalDay: null, today: '2026-11-22' })).toBe(true);
  });
  it('inline: the first hit of the day → modal; a second hit the same day → inline; the next day → modal again', () => {
    expect(quotaWallShowsModal({ arm: 'inline', lastModalDay: null, today: '2026-11-22' })).toBe(true);
    expect(quotaWallShowsModal({ arm: 'inline', lastModalDay: '2026-11-22', today: '2026-11-22' })).toBe(false);
    expect(quotaWallShowsModal({ arm: 'inline', lastModalDay: '2026-11-22', today: '2026-11-23' })).toBe(true);
  });
  it('no day known → the modal (never silence by accident)', () => {
    expect(quotaWallShowsModal({ arm: 'inline', lastModalDay: '2026-11-22', today: null })).toBe(true);
    expect(quotaWallShowsModal()).toBe(true);
  });
});

describe('the inline card\'s words', () => {
  it('promises the trial only when it is offered; no "Unlimited"', () => {
    expect(quotaInlineCopy({ quota: 10, trialOn: true })).toEqual({ lead: '10 free solves used.', cta: `Try Pro free for ${TRIAL_DAYS} days` });
    expect(quotaInlineCopy({ quota: 10, trialOn: false }).cta).toBe('See what Pro opens');
    expect(JSON.stringify(quotaInlineCopy({ trialOn: true }))).not.toMatch(/unlimited/i);
  });
});

describe('app.jsx wiring', () => {
  it('the flag exists and is on; the arm is read once, above the early returns', () => {
    expect(flags).toMatch(/\n\s*quotaWallInline: true,/);
    const at = app.indexOf('const quotaWallArmNow = useMemo(');
    expect(at).toBeGreaterThan(-1);
    expect(at).toBeLessThan(app.indexOf('  if (showAuth) {'));
    expect(app.slice(at, at + 300)).toContain("quotaWallArm({ flagOn: window.FF?.feature?.('quotaWallInline') === true, aid: getAnonId() })");
  });
  it('one function presents every quota-wall hit, and it stamps the day when the modal shows', () => {
    const at = app.indexOf('const presentQuotaWall = (reason, showModal = quotaWallModalNow()) => {');
    expect(at).toBeGreaterThan(-1);
    const fn = app.slice(at, app.indexOf('\n  };', at));
    const modalBranch = fn.slice(fn.indexOf('if (showModal) {'), fn.indexOf('return;'));
    expect(modalBranch, 'the day stamp is gone — the inline arm would never reach its inline card').toContain('localStorage.setItem(quotaWallDayKey(), getTodayString())');
    expect(modalBranch).toContain('setShowProModal(true)');
    expect(fn).toContain('setQuotaInline({ ...reason, quotaWallArm: quotaWallArmNow })');
    expect(fn).toContain("trackActivationEvent('quota_wall_inline_shown'");
    expect(app).toContain(`const quotaWallDayKey = () => \`\${QUOTA_WALL_DAY_KEY}_\${currentUser || 'guest'}\`;`);
    expect(QUOTA_WALL_DAY_KEY).toBe('sqlquest_quota_wall_modal_day');
    expect((app.match(/presentQuotaWall\((?:withDebugLock\()?\{ type: 'free_quota'/g) || []).length).toBe(2);
    expect(app, 'a free_quota modal opened around presentQuotaWall').not.toMatch(/setProModalReason\(\{ type: 'free_quota'/);
  });
  it('every hit still writes content_lock_reached, with modal and the arm', () => {
    const at = app.indexOf("trackLockReached('challenge_quota', {");
    const meta = app.slice(at, app.indexOf('});', at));
    expect(meta).toContain('modal: quotaModal,');
    expect(meta).toContain('quotaWallArm: quotaWallArmNow,');
    expect(app.slice(at - 120, at)).toContain('const quotaModal = quotaWallModalNow();');
  });
  it('pro_modal_shown carries the arm and the inline door', () => {
    const at = app.indexOf("trackActivationEvent('pro_modal_shown', {");
    const meta = app.slice(at, at + 2500);
    expect(meta).toContain("quotaWallArm: proModalReason?.quotaWallArm || null,");
    expect(meta).toContain("via: proModalReason?.via || null,");
  });
  it('the inline card: not a dialog, the trial opens the modal by click, the modal\'s free roads back', () => {
    const at = app.indexOf('data-testid="quota-wall-inline"');
    expect(at).toBeGreaterThan(-1);
    const card = app.slice(at, app.indexOf('})()}', at));
    expect(card).not.toMatch(/role="dialog"|fixed inset-0/);
    expect(card).toContain("setProModalReason({ ...reason, via: 'inline' })");
    expect(card).toContain('setShowProModal(true)');
    expect(card).toContain('quotaFreePaths({ dailyDone: isDailyCompleted })');
    expect(card).toContain("trackActivationEvent('quota_wall_free_path', { to: path.to, used: quotaInline.used, quota: quotaInline.quota, via: 'inline' })");
    expect(app.slice(at - 300, at)).toContain('{quotaInline && !showProModal && (() => {');
  });
});
