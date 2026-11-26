// The first-session tournament, PR 1 of 4 (2026-11-26): registry,
// enrolment, assignment, the event and the stamps. Pure half
// src/utils/tournament.js; registry src/data/tournament-arms.js; wiring
// src/app.jsx (module-load enrolment, writeProEvent, tournament_assigned).
// Plan: docs/plans/first-session-tournament-2026-11-26.md.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  TOURNAMENT_TEST_ID, TOURNAMENT_ARMS, TOURNAMENT_CONTROL_ID, TOURNAMENT_STATUSES, TOURNAMENT_LAUNCH_DATE,
  activeTournamentArms, tournamentArmById,
} from '../src/data/tournament-arms.js';
import {
  TOURNAMENT_KEY, tournamentHash, tournamentAssign, tournamentPriorAppUse, tournamentExclusion,
  normalizeTournamentRecord, tournamentEnrolment, adoptAccountRecord, enrolledTournamentArm,
  tournamentEffectiveArm, tournamentBehaviour, tournamentSupersedes, tournamentEventStamp,
  shouldAnnounceTournament, tournamentAssignedPayload,
} from '../src/utils/tournament.js';
import { PRE_APP_KEYS, FREE_QUOTA_HOLDOUT_KEY, freeQuotaArm } from '../src/utils/free-quota-holdout.js';
import { firstScreenArm } from '../src/utils/first-screen.js';
import { companyAskArm } from '../src/utils/company-ask.js';
import { companyDirectArm } from '../src/utils/company-direct.js';
import { runnableStarterArm } from '../src/utils/runnable-starter.js';
import { mobileRunBarArm } from '../src/utils/mobile-run-bar.js';
import { mobileOneLayerArm } from '../src/utils/mobile-one-layer.js';
import { modalLayoutHashArm } from '../src/utils/modal-layout.js';
import { runSubmitNudgeArm } from '../src/utils/run-submit-nudge.js';
import { quotaWallHashArm } from '../src/utils/quota-wall-inline.js';
import { TOURNAMENT_KEY as SMOKE_T_KEY, TOURNAMENT_OUT_OF_TEST, firstScreenArmPreamble } from '../scripts/smoke/lib.mjs';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const APP = read('src/app.jsx');
const FLAGS = read('src/data/feature-flags.js');

// Production aids are 32 hex characters (src/utils/anon-id.js); a seeded
// generator keeps the sample the same on every run.
const hexAids = (n, seed = 1) => {
  let s = seed >>> 0;
  const next = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s; };
  return Array.from({ length: n }, () => Array.from({ length: 4 }, () => next().toString(16).padStart(8, '0')).join(''));
};
const AIDS = hexAids(12000);
const NOW = Date.parse('2026-12-11T10:00:00Z');
const aidFor = (armId) => AIDS.find(a => tournamentAssign(a).id === armId);

describe('the registry', () => {
  it('launches with three active arms — A control (permanent, slot 0), B, D — and C queued', () => {
    expect(TOURNAMENT_TEST_ID).toBe('first_session_tournament_v1');
    expect(activeTournamentArms().map(a => a.id)).toEqual(['A_control', 'B_single_path', 'D_interview_sprint']);
    const c = tournamentArmById('C_proof_first');
    expect(c.status).toBe('queued');
    expect(c.slot).toBe(null);
    const a = tournamentArmById(TOURNAMENT_CONTROL_ID);
    expect(a.permanent).toBe(true);
    expect(a.slot).toBe(0);
    expect(TOURNAMENT_ARMS.filter(x => x.permanent)).toHaveLength(1);
  });

  it('every arm has the fields the read and the reports use', () => {
    const ids = new Set();
    for (const arm of TOURNAMENT_ARMS) {
      expect(ids.has(arm.id)).toBe(false);
      ids.add(arm.id);
      expect(TOURNAMENT_STATUSES).toContain(arm.status);
      expect(typeof arm.label).toBe('string');
      expect(arm.hypothesis.length).toBeGreaterThan(30);
      expect(Number.isInteger(arm.armVersion) && arm.armVersion >= 1).toBe(true);
      if (arm.status === 'active') {
        expect(arm.startDate).toMatch(/^\d{4}-\d\d-\d\d$/);
        expect(arm.startDate >= TOURNAMENT_LAUNCH_DATE).toBe(true);
        expect(Number.isInteger(arm.round) && arm.round >= 1).toBe(true);
      }
    }
    const slots = activeTournamentArms().map(x => x.slot);
    expect(new Set(slots).size).toBe(slots.length);
  });

  it('PR 1 builds no arm: B and D run control\'s behaviour, nothing supersedes the first-session A/Bs', () => {
    expect(tournamentArmById('B_single_path').built).toBe(false);
    expect(tournamentArmById('D_interview_sprint').built).toBe(false);
    for (const arm of TOURNAMENT_ARMS) {
      expect(tournamentBehaviour(arm.id)).toBe(TOURNAMENT_CONTROL_ID);
      expect(tournamentSupersedes(arm.id)).toBe(false);
    }
    expect(tournamentBehaviour(null)).toBe(null);
    // …and once an arm's PR marks it built, it runs itself and supersedes.
    const built = TOURNAMENT_ARMS.map(a => (a.id === 'B_single_path' ? { ...a, built: true } : a));
    expect(tournamentBehaviour('B_single_path', built)).toBe('B_single_path');
    expect(tournamentSupersedes('B_single_path', built)).toBe(true);
    expect(tournamentSupersedes('A_control', built)).toBe(false);
  });
});

describe('assignment — by aid, murmur-finalised, ACTIVE arms only, equal weights', () => {
  it('is deterministic per aid', () => {
    for (const a of AIDS.slice(0, 50)) expect(tournamentAssign(a).id).toBe(tournamentAssign(a).id);
    expect(tournamentAssign(null)).toBe(null);
    expect(tournamentAssign('')).toBe(null);
  });

  it('splits within ±2.5 points of 1/3 over 12,000 aids, and only into active arms', () => {
    const counts = {};
    for (const a of AIDS) { const id = tournamentAssign(a).id; counts[id] = (counts[id] || 0) + 1; }
    expect(Object.keys(counts).sort()).toEqual(['A_control', 'B_single_path', 'D_interview_sprint']);
    for (const n of Object.values(counts)) expect(Math.abs(n / AIDS.length - 1 / 3)).toBeLessThan(0.025);
  });

  it('never assigns a queued, eliminated or promoted arm', () => {
    // D eliminated, C takes its slot: D is never assigned again, C is.
    const replaced = TOURNAMENT_ARMS.map(a => {
      if (a.id === 'D_interview_sprint') return { ...a, status: 'eliminated', endDate: '2027-01-22' };
      if (a.id === 'C_proof_first') return { ...a, status: 'active', slot: 2, startDate: '2027-01-29', round: 2 };
      return a;
    });
    const seen = new Set(AIDS.slice(0, 3000).map(a => tournamentAssign(a, replaced).id));
    expect([...seen].sort()).toEqual(['A_control', 'B_single_path', 'C_proof_first']);
    // Queued C is never handed out by today's registry.
    expect(AIDS.some(a => tournamentAssign(a).id === 'C_proof_first')).toBe(false);
    // An arm marked active without a slot is not assignable either.
    const noSlot = TOURNAMENT_ARMS.map(a => (a.id === 'C_proof_first' ? { ...a, status: 'active' } : a));
    expect(activeTournamentArms(noSlot).map(a => a.id)).not.toContain('C_proof_first');
  });

  // The A/B hash trap (CLAUDE.md): every arm of the tournament must hold the
  // same share inside each arm of every other test. Without the murmur3
  // finalizer the low bits follow the character sum, and the cells skew.
  const others = {
    'first screen': (a) => firstScreenArm(a),
    'company ask': (a) => companyAskArm(a),
    'company direct': (a) => companyDirectArm(a),
    'runnable starter': (a) => runnableStarterArm(a),
    'mobile run bar': (a) => mobileRunBarArm(a),
    'mobile one layer': (a) => mobileOneLayerArm(a),
    'modal layout': (a) => modalLayoutHashArm(a),
    'run/submit nudge': (a) => runSubmitNudgeArm(a),
    'quota wall inline': (a) => quotaWallHashArm(a),
    'freeQuota holdout': (a) => freeQuotaArm(a),
  };
  for (const [name, otherArm] of Object.entries(others)) {
    it(`is independent of the ${name} test (each cell holds 1/6 ± 2 points)`, () => {
      const cells = {};
      for (const a of AIDS) {
        const k = `${tournamentAssign(a).id}|${otherArm(a)}`;
        cells[k] = (cells[k] || 0) + 1;
      }
      expect(Object.keys(cells)).toHaveLength(6);
      for (const n of Object.values(cells)) expect(Math.abs(n / AIDS.length - 1 / 6)).toBeLessThan(0.02);
    });
  }

  // At three slots h % 3 hides the trap; a fourth slot (plan §2.1, by
  // decision row at 30 openers a day) makes it h % 4, whose low bit IS the
  // parity of the characters' sum without the finalizer.
  it('stays independent when a fourth slot opens (h % 4)', () => {
    const four = TOURNAMENT_ARMS.map(a => (a.id === 'C_proof_first' ? { ...a, status: 'active', slot: 3, startDate: '2027-02-01', round: 2 } : a));
    for (const [name, otherArm] of Object.entries(others)) {
      const cells = {};
      for (const a of AIDS) {
        const k = `${tournamentAssign(a, four).id}|${otherArm(a)}`;
        cells[k] = (cells[k] || 0) + 1;
      }
      expect(Object.keys(cells), name).toHaveLength(8);
      for (const n of Object.values(cells)) expect(Math.abs(n / AIDS.length - 1 / 8), name).toBeLessThan(0.02);
    }
  });

  it('is also independent of sequential, non-hex ids (the parity trap)', () => {
    const seq = Array.from({ length: 9000 }, (_, i) => `aid-${i}`);
    const cells = {};
    for (const a of seq) {
      const k = `${tournamentAssign(a).id}|${firstScreenArm(a)}`;
      cells[k] = (cells[k] || 0) + 1;
    }
    for (const n of Object.values(cells)) expect(Math.abs(n / seq.length - 1 / 6)).toBeLessThan(0.025);
    expect(tournamentHash('x')).toBe(tournamentHash('x'));
  });
});

describe('who enters — a new visitor\'s first app open, once', () => {
  const fresh = (over = {}) => tournamentEnrolment({ flagOn: true, record: null, aid: AIDS[0], now: NOW, priorAppUse: false, ...over });

  it('a fresh browser is enrolled, with the arm, version, round, slot and time', () => {
    const d = fresh();
    const entry = tournamentAssign(AIDS[0]);
    expect(d.write).toEqual({ status: 'enrolled', arm: entry.id, armVersion: entry.armVersion, round: entry.round, slot: entry.slot, assignedAt: NOW, announced: false });
    expect(d.record).toEqual(d.write);
  });

  it('a returning browser (any app key) is recorded returning: no arm, no event', () => {
    const d = fresh({ priorAppUse: true });
    expect(d.write.status).toBe('returning');
    expect(d.record.arm).toBe(null);
    expect(shouldAnnounceTournament({ flagOn: true, record: d.record })).toBe(false);
    expect(tournamentEventStamp({ flagOn: true, record: d.record })).toEqual({});
    expect(tournamentEffectiveArm({ flagOn: true, record: d.record })).toBe(null);
  });

  it('"new" is the holdout\'s rule: landing keys, the holdout record and this record do not count; any other app key does', () => {
    expect(tournamentPriorAppUse([])).toBe(false);
    expect(tournamentPriorAppUse([...PRE_APP_KEYS, FREE_QUOTA_HOLDOUT_KEY, TOURNAMENT_KEY, 'other_site'])).toBe(false);
    expect(tournamentPriorAppUse(['sqlquest_aid', 'sqlquest_user'])).toBe(true);
    expect(tournamentPriorAppUse(['sqlquest_guest_user'])).toBe(true);
    expect(tournamentPriorAppUse(['sqlquest_first_screen_v1'])).toBe(true);
    expect(tournamentPriorAppUse(null)).toBe(false);
  });

  it('a first open on a mock link or a profile never enters', () => {
    expect(tournamentExclusion({ search: '?interview=capital-one-codesignal&src=pattern-x' })).toBe('excluded_interview_link');
    expect(tournamentExclusion({ search: '?profile=ada' })).toBe('excluded_profile');
    expect(tournamentExclusion({ pathname: '/u/ada' })).toBe('excluded_profile');
    expect(tournamentExclusion({ search: '?company=Stripe&src=stripe-sql-interview', pathname: '/app/' })).toBe(null);
    expect(tournamentExclusion({ search: '?challenge=91' })).toBe(null);
    for (const [search, status] of [['?interview=x', 'excluded_interview_link'], ['?profile=x', 'excluded_profile']]) {
      const d = fresh({ search });
      expect(d.write.status).toBe(status);
      expect(enrolledTournamentArm(d.record)).toBe(null);
    }
  });

  it('a stored record always wins: never re-assigned, whatever the flag, the aid or the registry says', () => {
    const first = fresh().record;
    const other = AIDS.find(a => tournamentAssign(a).id !== first.arm);
    for (const flagOn of [true, false]) {
      const again = tournamentEnrolment({ flagOn, record: first, aid: other, now: NOW + 86400000, priorAppUse: true });
      expect(again.write).toBe(null);
      expect(again.record).toEqual(first);
    }
    // The arm is eliminated later: its people keep their record.
    const gone = TOURNAMENT_ARMS.map(a => (a.id === first.arm && !a.permanent ? { ...a, status: 'eliminated' } : a));
    expect(tournamentEnrolment({ flagOn: true, record: first, aid: other, now: NOW, arms: gone }).record.arm).toBe(first.arm);
    // A returning record also stays returning.
    const ret = { status: 'returning' };
    expect(tournamentEnrolment({ flagOn: true, record: ret, aid: other, now: NOW }).write).toBe(null);
  });

  it('flag off: nobody new is enrolled, and an enrolled browser gets today\'s product (the kill switch)', () => {
    expect(tournamentEnrolment({ flagOn: false, aid: AIDS[0], now: NOW })).toEqual({ write: null, record: null });
    const rec = fresh().record;
    expect(tournamentEffectiveArm({ flagOn: false, record: rec })).toBe(null);
    expect(tournamentEventStamp({ flagOn: false, record: rec })).toEqual({});
    expect(shouldAnnounceTournament({ flagOn: false, record: rec })).toBe(false);
  });

  it('no aid or no clock: nothing is written', () => {
    expect(fresh({ aid: null }).write).toBe(null);
    expect(fresh({ now: null }).write).toBe(null);
  });

  it('an unreadable record is ignored, an unknown arm is not trusted', () => {
    expect(normalizeTournamentRecord(null)).toBe(null);
    expect(normalizeTournamentRecord({ status: 'weird' })).toBe(null);
    expect(normalizeTournamentRecord({ status: 'enrolled', arm: 'Z_nope' })).toBe(null);
  });
});

describe('after assignment — who runs the arm, and the account', () => {
  const B = aidFor('B_single_path');
  const rec = tournamentEnrolment({ flagOn: true, aid: B, now: NOW }).record;

  it('the person is in the arm; an older account or `hired` intent takes them out of its behaviour', () => {
    expect(tournamentEffectiveArm({ flagOn: true, record: rec })).toBe('B_single_path');
    expect(tournamentEffectiveArm({ flagOn: true, record: rec, signedIn: true, accountCreatedAt: NOW + 60000 })).toBe('B_single_path');
    expect(tournamentEffectiveArm({ flagOn: true, record: rec, signedIn: true, accountCreatedAt: '2026-03-01T00:00:00Z' })).toBe(null);
    expect(tournamentEffectiveArm({ flagOn: true, record: rec, intent: 'hired' })).toBe(null);
    expect(tournamentEffectiveArm({ flagOn: true, record: rec, intent: 'interview' })).toBe('B_single_path');
  });

  it('the account\'s own record wins on sign-in, already announced; the same arm is left alone', () => {
    const acct = { ...rec, assignedAt: NOW - 5 * 86400000, announced: true };
    const other = tournamentEnrolment({ flagOn: true, aid: aidFor('D_interview_sprint'), now: NOW }).record;
    const adopted = adoptAccountRecord({ browserRecord: other, accountRecord: acct });
    expect(adopted.write).toBe(true);
    expect(adopted.record.arm).toBe('B_single_path');
    expect(adopted.record.announced).toBe(true);
    expect(adoptAccountRecord({ browserRecord: { status: 'returning' }, accountRecord: acct }).record.arm).toBe('B_single_path');
    expect(adoptAccountRecord({ browserRecord: rec, accountRecord: acct }).write).toBe(false);
    expect(adoptAccountRecord({ browserRecord: rec, accountRecord: null })).toEqual({ record: rec, write: false });
    expect(adoptAccountRecord({ browserRecord: rec, accountRecord: { status: 'returning' } }).write).toBe(false);
  });

  it('every row from an enrolled browser carries tArm / tArmV', () => {
    expect(tournamentEventStamp({ flagOn: true, record: rec })).toEqual({ tArm: 'B_single_path', tArmV: 1 });
  });
});

describe('tournament_assigned — once per browser', () => {
  const rec = tournamentEnrolment({ flagOn: true, aid: AIDS[3], now: NOW }).record;

  it('fires for a fresh enrolment and never after it is announced', () => {
    expect(shouldAnnounceTournament({ flagOn: true, record: rec })).toBe(true);
    expect(shouldAnnounceTournament({ flagOn: true, record: { ...rec, announced: true } })).toBe(false);
    const p = tournamentAssignedPayload(rec);
    expect(p).toEqual({
      test: 'first_session_tournament_v1', arm: rec.arm, armVersion: rec.armVersion, round: rec.round,
      slot: rec.slot, firstOpenAt: new Date(NOW).toISOString(),
    });
    expect(tournamentAssignedPayload({ status: 'returning' })).toBe(null);
  });

  it('app.jsx: one call site, after the session settles, marks the record announced before it sends, above the early returns', () => {
    const calls = APP.match(/trackActivationEvent\('tournament_assigned'/g) || [];
    expect(calls).toHaveLength(1);
    const at = APP.indexOf("trackActivationEvent('tournament_assigned'");
    const early = APP.indexOf('  if (showAuth) {');
    expect(early).toBeGreaterThan(0);
    expect(at).toBeLessThan(early);
    const effect = APP.slice(APP.lastIndexOf('useEffect(() => {', at), APP.indexOf('}, [isSessionLoading]);', at) + 30);
    expect(effect).toMatch(/if \(isSessionLoading\) return;/);
    expect(effect).toMatch(/shouldAnnounceTournament\(/);
    const mark = effect.indexOf('TOURNAMENT_RECORD = { ...TOURNAMENT_RECORD, announced: true };');
    expect(mark).toBeGreaterThan(0);
    expect(mark).toBeLessThan(effect.indexOf("trackActivationEvent('tournament_assigned'"));
    expect(effect).toMatch(/localStorage\.setItem\(TOURNAMENT_KEY/);
  });
});

describe('app.jsx wiring', () => {
  it('enrols at module load, after the holdout and before the URL-param block writes any key', () => {
    const holdout = APP.indexOf('let FQ_HOLDOUT_RECORD = null;');
    const tour = APP.indexOf('let TOURNAMENT_RECORD = null;');
    const urlBlock = APP.indexOf('// Module-load URL-param capture.');
    expect(holdout).toBeGreaterThan(0);
    expect(tour).toBeGreaterThan(holdout);
    expect(tour).toBeLessThan(urlBlock);
    const block = APP.slice(tour, urlBlock);
    expect(block).toMatch(/tournamentPriorAppUse\(keys\)/);
    expect(block).toMatch(/window\.FF\?\.feature\?\.\('firstSessionTournament'\) === true/);
    expect(block).toMatch(/search: window\.location\.search/);
    expect(block).toMatch(/pathname: window\.location\.pathname/);
  });

  it('writeProEvent stamps tArm on every row — challenge_solved, first_challenge_solved and the three money events included', () => {
    expect(APP).toMatch(/metadata: JSON\.stringify\(\{ \.\.\.metadata, \.\.\.fqEventStamp\(\), \.\.\.tEventStamp\(\), aid: getAnonId\(\) \}\)/);
    expect((APP.match(/supabaseFetch\('pro_events'/g) || [])).toHaveLength(1);
    for (const ev of ['challenge_solved', 'first_challenge_solved', 'pro_modal_shown', 'pro_plan_clicked', 'pro_checkout_clicked']) {
      expect(APP).toContain(`trackActivationEvent('${ev}'`);
    }
    expect(APP).toMatch(/writeProEvent\(event, 'activation_funnel', payload/);
  });

  it('the four first-session A/Bs step aside only for a built challenger', () => {
    for (const flag of ["ftbFlag('runnableStarter')", "!!window.FF?.feature('firstScreenChallenge')", "ftbFlag('mobileRunBar')", "window.FF?.feature?.('companyDirectOpen') === true"]) {
      expect(APP).toContain(`flagOn: ${flag} && !tournamentSupersedesNow(),`);
    }
  });

  it('the record rides the account and the account\'s record is adopted on load', () => {
    expect(APP).toMatch(/\.\.\.\(TOURNAMENT_RECORD && TOURNAMENT_RECORD\.status === 'enrolled' \? \{ tournament: TOURNAMENT_RECORD \} : \{\}\)/);
    expect(APP).toMatch(/adoptAccountRecord\(\{ browserRecord: TOURNAMENT_RECORD, accountRecord: userData\.tournament \}\)/);
  });

  it('the helpers later arm PRs read sit above the early returns', () => {
    const early = APP.indexOf('  if (showAuth) {');
    for (const h of ['const tournamentArm = () =>', 'const tournamentBehaviourNow = () =>', 'const tournamentSupersedesNow = () =>']) {
      const i = APP.indexOf(h);
      expect(i).toBeGreaterThan(0);
      expect(i).toBeLessThan(early);
    }
  });
});

describe('the flag ships dark', () => {
  it('firstSessionTournament is false in feature-flags.js', () => {
    expect(FLAGS).toMatch(/\n {4}firstSessionTournament: false,\n/);
  });
});

describe('the smoke battery stays out of the tournament', () => {
  it('its preamble writes the app\'s own "returning" record', () => {
    expect(SMOKE_T_KEY).toBe(TOURNAMENT_KEY);
    expect(normalizeTournamentRecord(TOURNAMENT_OUT_OF_TEST).status).toBe('returning');
    const store = {};
    new Function('localStorage', firstScreenArmPreamble('challenge'))({ setItem: (k, v) => { store[k] = v; } });
    const rec = JSON.parse(store[TOURNAMENT_KEY]);
    expect(tournamentEnrolment({ flagOn: true, record: rec, aid: AIDS[0], now: NOW }).write).toBe(null);
    expect(tournamentEffectiveArm({ flagOn: true, record: rec })).toBe(null);
  });
});
