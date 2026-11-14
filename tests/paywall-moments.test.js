// Paywall moments (PLAN item 3; src/utils/paywall-moments.js). Pins: each
// soft gate passes its own reason; the copy never claims "Unlimited", a
// company's interview or a free count; the flag gates every new behaviour
// in app.jsx, so flag off is the product as it was; no Upgrade link sends a
// person to the Profile tab while the flag is on; the dead surfaces (the
// 30-day Pro tile, the locked mock card) reach the modal.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  SOFT_GATE_REASONS, VOLUNTARY_REASONS, SOFT_GATE_ACTION_LABEL, SOFT_GATE_TOAST_MS,
  softGateReason, paywallMomentCopy,
} from '../src/utils/paywall-moments.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const app = fs.readFileSync(path.join(ROOT, 'src/app.jsx'), 'utf8');
const flags = fs.readFileSync(path.join(ROOT, 'src/data/feature-flags.js'), 'utf8');

describe('the soft gates', () => {
  it('each gate maps to a modal reason and carries itself', () => {
    expect(softGateReason('thirty_day', 7)).toEqual({ type: 'thirty_day', gate: 'thirty_day', topic: null, solvedCount: 7 });
    expect(softGateReason('daily_difficulty')).toMatchObject({ type: 'daily_difficulty', gate: 'daily_difficulty' });
    expect(softGateReason('coach_track')).toMatchObject({ type: 'hard_challenge', gate: 'coach_track' });
    expect(softGateReason('nope')).toBeNull();
    expect(Object.keys(SOFT_GATE_REASONS).sort()).toEqual(['coach_track', 'daily_difficulty', 'thirty_day']);
  });

  it('every gate named in the module is passed by a showSoftProGate call in app.jsx', () => {
    for (const gate of Object.keys(SOFT_GATE_REASONS)) {
      expect(app, gate).toMatch(new RegExp(`showSoftProGate\\([\\s\\S]{0,700}?'${gate}'\\s*\\)`));
    }
  });

  it('the toast stays long enough to read and decide', () => {
    expect(SOFT_GATE_TOAST_MS).toBeGreaterThanOrEqual(8000);
    expect(SOFT_GATE_ACTION_LABEL).toBe('See what Pro opens');
  });
});

describe('the copy', () => {
  const types = ['thirty_day', 'daily_difficulty', 'hard_challenge', 'interview_locked', 'interview_tab'];
  const all = types.map(t => paywallMomentCopy(t, { freeDays: 10, bank: '300+', hardCount: 120 }));

  it('every reason with a moment has headline, lead and body; the rest fall through', () => {
    for (const c of all) {
      expect(c.headline).toBeTruthy();
      expect(c.lead).toBeTruthy();
      expect(c.body).toBeTruthy();
    }
    for (const t of ['generic', 'rate_limit', 'profile_plan', 'coach_strip', 'milestone_solves', undefined]) {
      expect(paywallMomentCopy(t)).toBeNull();
    }
  });

  it('says what the gates say, and nothing the site may not', () => {
    const text = all.map(c => `${c.headline} ${c.lead} ${c.body}`).join(' ');
    expect(text).not.toMatch(/unlimited/i);
    expect(text).not.toMatch(/free forever|\b\d+ free\b|every easy and medium/i);
    expect(text).not.toMatch(/FAANG|most[- ]asked|ask(s|ed)? in (their|the) interview/i);
    expect(text).not.toMatch(/\bradar\b/i);
    expect(paywallMomentCopy('thirty_day', { freeDays: 10 }).lead).toBe('Days 1–10 are yours.');
    expect(paywallMomentCopy('thirty_day', { freeDays: 10 }).body).toMatch(/days 11 to 30/);
    expect(paywallMomentCopy('hard_challenge', { hardCount: 120 }).lead).toMatch(/^120 Hard challenges/);
    expect(paywallMomentCopy('hard_challenge').lead).not.toMatch(/\d/);
  });

  it('the app feeds the bank size from bankCountLabel and the free days from the constant', () => {
    expect(app).toMatch(/paywallMomentCopy\(proModalReason\?\.type, \{\s*freeDays: THIRTY_DAY_FREE_LIMIT,\s*bank: bankCountLabel\(/);
  });
});

describe('the flag', () => {
  it('ships dark', () => {
    expect(flags).toMatch(/\bpaywallMoments: false,/);
  });

  it('every new behaviour in app.jsx sits behind it', () => {
    // The copy, the toast button, the 30-day tile, the mock card, the two
    // tutor links, the three named openers: nine reads of the flag.
    const reads = app.match(/ftbFlag\('paywallMoments'\)/g) || [];
    expect(reads.length).toBeGreaterThanOrEqual(9);
    expect(app).toMatch(/const paywallMomentCopyNow = ftbFlag\('paywallMoments'\)/);
    expect(app).toMatch(/const reason = ftbFlag\('paywallMoments'\) && gate \? softGateReason\(gate/);
  });

  it('flag on, the tutor links open the plans; flag off, the Profile tab as before', () => {
    const tutorLinks = app.match(/if \(ftbFlag\('paywallMoments'\)\) \{ setProModalReason\(\{ type: 'rate_limit'[^}]*\}\); setShowProModal\(true\); \}\s*else setActiveTab\('hero'\);/g) || [];
    expect(tutorLinks.length).toBe(2);
  });

  it('the voluntary openers name their reason', () => {
    for (const r of VOLUNTARY_REASONS) expect(app, r).toMatch(new RegExp(`'${r}'`));
  });

  it('the 30-day Pro tile is clickable and the locked mock card opens the plans', () => {
    expect(app).toMatch(/disabled=\{!isUnlocked && !\(isProLocked && ftbFlag\('paywallMoments'\)\)\}/);
    expect(app).toMatch(/onClick=\{\(\) => canAccess \? startInterview\(interview\) : \(ftbFlag\('paywallMoments'\) && openProForLockedMock\(interview\)\)\}/);
  });

  it('the soft-gate button is the accent CTA in the palette, never an off-palette yellow', () => {
    const i = app.indexOf('data-testid="soft-gate-action"');
    const block = app.slice(i, i + 600);
    expect(block).toMatch(/bg-\[#FFE34D\]/);
    expect(block).not.toMatch(/bg-yellow-\d00/);
  });

  it('pro_modal_shown carries the gate', () => {
    expect(app).toMatch(/gate: proModalReason\?\.gate \|\| null,/);
  });
});
