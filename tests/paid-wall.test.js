import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { paidWallFor, isColdStart, COLD_START_SOLVE_THRESHOLD } from '../src/utils/paid-wall.js';

const ROOT = join(import.meta.dirname, '..');
const app = readFileSync(join(ROOT, 'src', 'app.jsx'), 'utf8');

describe('isColdStart — the shapes the call sites actually hold', () => {
  it('is true only below the threshold', () => {
    expect(isColdStart(0)).toBe(true);
    expect(isColdStart(COLD_START_SOLVE_THRESHOLD)).toBe(false);
    expect(isColdStart(1)).toBe(false);
    expect(isColdStart(112)).toBe(false);
  });

  it('reads a Set, which is what solvedChallenges is', () => {
    expect(isColdStart(new Set())).toBe(true);
    expect(isColdStart(new Set([91]))).toBe(false);
    expect(isColdStart([])).toBe(true);
    expect(isColdStart([91, 92])).toBe(false);
  });

  // A suppressed wall is a revenue decision. If the count is unreadable we
  // must NOT silently divert everyone — fail towards the existing behaviour.
  it('fails towards showing the wall when the count is unreadable', () => {
    expect(isColdStart(null)).toBe(false);
    expect(isColdStart(undefined)).toBe(false);
    expect(isColdStart(NaN)).toBe(false);
    expect(isColdStart({})).toBe(false);
    expect(isColdStart('3')).toBe(false);
  });
});

describe('paidWallFor — which wall a locked click raises', () => {
  it('Pro never meets a wall at all', () => {
    expect(paidWallFor({ isPro: true, solved: new Set(), companyFilter: 'Snowflake' })).toBe('none');
  });

  // The exact 2026-09-07 incident: aid 2eb0db72, /snowflake-sql-interview/,
  // challenge 89, solvedCount 0 → got the buyable company modal.
  it('cold start beats the company modal — intent does not license the ask', () => {
    expect(paidWallFor({ solved: new Set(), companyFilter: 'Snowflake' })).toBe('cold_start');
    expect(paidWallFor({ solved: 0, companyFilter: 'Capital One' })).toBe('cold_start');
  });

  it('once they have solved something the old routing is unchanged', () => {
    expect(paidWallFor({ solved: new Set([91]), companyFilter: 'Snowflake' })).toBe('company_modal');
    expect(paidWallFor({ solved: new Set([91]) })).toBe('preview_dialog');
    expect(paidWallFor({ solved: 19, companyFilter: null })).toBe('preview_dialog');
  });

  it('takes no arguments without throwing', () => {
    expect(paidWallFor()).toBe('preview_dialog');
  });
});

describe('source guard — every paid wall diverts before it sells', () => {
  it('all four gate sites label the wall through the resolver', () => {
    // challenge_hard, interview x2, thirty_day, daily_difficulty.
    const labelled = app.match(/wall: paidWallFor\(/g) || [];
    expect(labelled.length, 'a gate stopped labelling its wall').toBe(5);
    expect(/wall: companyFilter \? 'company_modal' : 'preview_dialog'/.test(app),
      'the old inline wall label is back — it cannot express cold_start').toBe(false);
  });

  it('every trackLockReached is followed by a cold-start check before any ask', () => {
    // Walk each gate: from the trackLockReached call to the next thing that
    // asks for money, there must be an openColdStartInstead in between.
    const offenders = [];
    const re = /trackLockReached\(/g;
    let m;
    while ((m = re.exec(app)) !== null) {
      const after = app.slice(m.index, m.index + 1400);
      const ask = after.search(/setShowProModal\(true\)|showSoftProGate\(/);
      if (ask === -1) continue;                       // this gate never asks
      const divert = after.indexOf('openColdStartInstead(');
      if (divert === -1 || divert > ask) {
        offenders.push(app.slice(0, m.index).split('\n').length);
      }
    }
    expect(offenders, `gate(s) at line ${offenders.join(', ')} ask for money without checking for a cold start first`).toEqual([]);
  });

  it('the cold-start route does not stamp openedFrom', () => {
    // preview_open_to_solve (ledger, read 2026-09-20) counts stamped opens.
    // A starter opened from the cold-start dialog is not a preview-surface
    // open; stamping it would forge rows into a pre-registered metric.
    const fn = app.slice(app.indexOf('const openStarterFromColdStart'));
    const body = fn.slice(0, fn.indexOf('\n  };'));
    expect(body).toContain('openChallenge(starter)');
    expect(body, 'the cold-start route stamps openedFrom — it would pollute preview_open_to_solve').not.toContain('openedFrom');
  });

  it('the cold-start dialog offers no Pro path', () => {
    const start = app.indexOf("{coldStart ? (");
    const end = app.indexOf(') : allBeaten ? (', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const branch = app.slice(start, end);
    expect(branch, 'the cold-start branch links to the Pro modal').not.toContain('openProFromPreviewCatcher');
    expect(branch, 'the cold-start branch mentions unlocking Pro').not.toMatch(/unlockHard|unlockAllPro/);
    expect(branch).toContain('coldStartCta');
  });

  it('the starter is picked in curriculum order, never off the raw array', () => {
    // The 2026-08-05 raw-array trap: the first Medium by id is challenge 1.
    const idx = app.indexOf('const starter = coldStart');
    const pick = app.slice(idx, idx + 400);
    expect(pick).toContain('SQL_ROADMAP_CHALLENGE_ORDER');
    expect(pick).toContain('!isContentLocked(');
    expect(pick, 'a cold-start user must never be routed to a locked challenge').toContain('!solvedChallenges.has(');
  });
});

describe('copy — the cold-start dialog exists in both languages and sells nothing', () => {
  const i18n = readFileSync(join(ROOT, 'src', 'utils', 'i18n.js'), 'utf8');
  for (const key of ['coldStartTitle', 'coldStartLine', 'coldStartCta']) {
    it(`${key} is defined twice (en + tr)`, () => {
      expect((i18n.match(new RegExp(`${key}:`, 'g')) || []).length).toBe(2);
    });
  }
  it('neither language quotes a price in the cold-start copy', () => {
    const lines = i18n.split('\n').filter(l => /coldStart(Title|Line|Cta):/.test(l));
    expect(lines.length).toBe(6);
    for (const l of lines) expect(l, `price in cold-start copy: ${l.trim()}`).not.toMatch(/\$\d/);
  });
});
