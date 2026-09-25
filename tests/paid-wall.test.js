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
    // 6 since 2026-09-20: openProForLockedMock labels its wall too.
    expect(labelled.length, 'a gate stopped labelling its wall').toBe(6);
    expect(/wall: companyFilter \? 'company_modal' : 'preview_dialog'/.test(app),
      'the old inline wall label is back — it cannot express cold_start').toBe(false);
  });

  it('the only gate that asks without diverting is the deliberate Unlock Pro click', () => {
    expect((app.match(/const openProForLockedMock = \(interview\) => \{/g) || []).length).toBe(1);
    const at = app.indexOf('const openProForLockedMock = (interview) => {');
    const fn = app.slice(at, at + 700);
    expect(fn).toContain("trackLockReached('interview'");
    expect(fn).toContain("setProModalReason({ type: 'interview_locked'");
    expect(fn).not.toContain('openColdStartInstead(');
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
      // EXEMPT (2026-09-20, founder QA round 7): openProForLockedMock is not
      // a collision — it is the person pressing "Unlock Pro" on a locked mock
      // card, i.e. asking for the price. The cold-start rule is "never SELL
      // before the first solve", and it kept refusing buyers: a zero-solve
      // account could not reach the plans from any entry point. Every other
      // gate still diverts first, and the gate's own dialog now carries an
      // "Unlock Pro anyway" door with its own reason.
      const before = app.slice(Math.max(0, m.index - 600), m.index);
      if (before.includes('const openProForLockedMock')) continue;
      // EXEMPT (2026-09-25, founder): the SQL trap page's "question N of our
      // … mock" link. The visitor asked for the timed screen, so the answer
      // is the price with the trap as context. Only that branch is exempt:
      // the rest of the same gate must still divert before its own ask.
      if (after.slice(0, ask).includes("type: 'pattern_mock'")) {
        // wider window: the pattern branch is long, and the rest of the gate
        // must be in view or this check passes vacuously (caught 2026-09-25).
        const rest = app.slice(m.index, m.index + 4000).slice(ask + 1);
        const ask2 = rest.search(/setShowProModal\(true\)|showSoftProGate\(/);
        const divert2 = rest.indexOf('openColdStartInstead(');
        if (ask2 !== -1 && (divert2 === -1 || divert2 > ask2)) offenders.push(app.slice(0, m.index).split('\n').length);
        continue;
      }
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
