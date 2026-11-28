// The first-session tournament: profile first, then the stratum, then the
// draw inside the stratum (founder, chat, 2026-11-26: "kişinin profilini
// anlamadan onu bir gruba alamayız. profile göre gruba almalıyız").
// Pure half src/utils/tournament.js (buildVisitorProfile, tournamentStratum,
// stratumWeights, tournamentDraw, tournamentReason); registry
// src/data/tournament-arms.js (TOURNAMENT_STRATA, TOURNAMENT_STRATUM_WEIGHTS).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  TOURNAMENT_ARMS, TOURNAMENT_STRATA, TOURNAMENT_STRATUM_WEIGHTS, TOURNAMENT_MIN_EXPLORE,
} from '../src/data/tournament-arms.js';
import {
  buildVisitorProfile, normalizeVisitorProfile, profileDoor, tournamentStratum, stratumWeights,
  validStratumRouting, tournamentDraw, tournamentAssign, tournamentReason, tournamentEnrolment,
  tournamentAssignedPayload, normalizeTournamentRecord, enrichTournamentProfile, PROFILE_DOORS,
} from '../src/utils/tournament.js';
import { firstScreenArm } from '../src/utils/first-screen.js';
import { companyDirectArm } from '../src/utils/company-direct.js';
import { runnableStarterArm } from '../src/utils/runnable-starter.js';
import { freeQuotaArm } from '../src/utils/free-quota-holdout.js';
import { companyAskArm } from '../src/utils/company-ask.js';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const APP = fs.readFileSync(path.join(ROOT, 'src/app.jsx'), 'utf8');
const FLAGS = fs.readFileSync(path.join(ROOT, 'src/data/feature-flags.js'), 'utf8');

const hexAids = (n, seed = 7) => {
  let s = seed >>> 0;
  const next = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s; };
  return Array.from({ length: n }, () => Array.from({ length: 4 }, () => next().toString(16).padStart(8, '0')).join(''));
};
const AIDS = hexAids(12000);
const NOW = Date.parse('2026-12-11T10:00:00Z');
const desk = { viewportWidth: 1440, siteHost: 'sqlquest.app' };
const prof = (search, over = {}) => buildVisitorProfile({ search, ...desk, ...over });

describe('the profile — one door at a time', () => {
  const cases = [
    // [what, search, extra inputs, door, interviewTarget, itSignal, company]
    ['a company page', '?src=capital-one-sql-interview', {}, 'company_page', true, 'company_page', 'capital-one'],
    ['a ?company= link', '?company=Revolut&goal=interview', {}, 'company_link', true, 'company_link', 'revolut'],
    ['the readiness test (with its company)', '?src=readiness&company=Capital%20One&challenge=276', {}, 'readiness', true, 'readiness_door', 'capital-one'],
    ['the Capital One blog', '?challenge=276&src=blog-capital-one', {}, 'blog', true, 'capital_one_blog', 'capital-one'],
    ['a blog with a ?company=', '?company=Revolut&goal=interview&src=blog-revolut', {}, 'blog', true, 'company_link', 'revolut'],
    ['a stored readiness result, homepage door', '?src=home', { readinessRecord: { at: 1, overall: 55 } }, 'homepage', true, 'readiness_result', null],
    ['sql-exercises', '?src=sql-exercises', {}, 'sql_exercises', false, null, null],
    ['a topic page', '?src=challenges-window-functions', {}, 'topic', false, null, null],
    ['a trap page', '?src=sql-not-in-null', {}, 'topic', false, null, null],
    ['a question page', '?challenge=91&src=question-second-highest-salary', {}, 'question', false, null, null],
    ['a blog post', '?src=blog-joins', {}, 'blog', false, null, null],
    ['the homepage', '?src=home', {}, 'homepage', false, null, null],
    ['an AI assistant (stored landing source)', '?src=home', { landingSrc: 'ai:chatgpt' }, 'ai', false, null, null],
    ['an AI assistant straight to /app/ (utm)', '?utm_source=chatgpt.com', {}, 'ai', false, null, null],
    ['an AI assistant to a company page', '?src=amazon-sql-interview', { landingSrc: 'ai:perplexity' }, 'ai', true, 'company_page', 'amazon'],
    ['another page', '?src=vs-datalemur', {}, 'other_page', false, null, null],
    ['a sector link', '?sector=finance', {}, 'other_page', false, null, null],
    ['an external referrer', '', { referrer: 'https://www.google.com/search?q=sql' }, 'referrer', false, null, null],
    ['nothing at all', '', {}, 'direct_unknown', false, null, null],
  ];
  for (const [what, search, extra, door, it_, sig, company] of cases) {
    it(`${what} → door ${door}, interview-target ${it_}`, () => {
      const p = prof(search, extra);
      expect(p.door).toBe(door);
      expect(p.interviewTarget).toBe(it_);
      expect(p.itSignal).toBe(sig);
      expect(p.company).toBe(company);
      expect(PROFILE_DOORS).toContain(p.door);
    });
  }

  it('a same-site referrer is not a door, and a referrer never carries its path', () => {
    expect(prof('', { referrer: 'https://sqlquest.app/sql-exercises/' }).door).toBe('direct_unknown');
    const p = prof('', { referrer: 'https://example.org/private/path?q=secret' });
    expect(p.doorSrc).toBe('ref:example.org');
    expect(JSON.stringify(p)).not.toMatch(/secret|private/);
  });

  it('a src that is not a slug is not stored as typed', () => {
    const p = prof('?src=' + encodeURIComponent('hello world <script>'));
    expect(p.door).toBe('other_page');
    expect(p.doorSrc).toBe('unrecognised');
  });

  it('device bands, language, timezone bucket, landing-before, readiness band, country and price region', () => {
    expect(prof('', { viewportWidth: 390 }).device).toBe('phone');
    expect(prof('', { viewportWidth: 800 }).device).toBe('tablet');
    expect(prof('', { viewportWidth: 1366 }).device).toBe('desktop');
    expect(prof('', { viewportWidth: 0 }).device).toBe(null);
    expect(prof('', { navigatorLanguage: 'tr-TR' }).language).toBe('tr');
    expect(prof('?lang=en', { navigatorLanguage: 'tr-TR' }).language).toBe('en');
    expect(prof('', {}).language).toBe(null);
    expect(prof('', { tzOffsetEastMin: -300 }).tzBucket).toBe('americas');
    expect(prof('', { tzOffsetEastMin: 60 }).tzBucket).toBe('europe_africa');
    expect(prof('', { tzOffsetEastMin: 330 }).tzBucket).toBe('gulf_south_asia');
    expect(prof('', { tzOffsetEastMin: 480 }).tzBucket).toBe('east_asia_oceania');
    expect(prof('', { tzOffsetEastMin: null }).tzBucket).toBe(null);
    expect(prof('', { bootKeys: ['sqlquest_aid'] }).landingBefore).toBe(true);
    expect(prof('', { bootKeys: [] }).landingBefore).toBe(false);
    expect(prof('', { readinessRecord: { overall: 20 } }).readinessBand).toBe('low');
    expect(prof('', { readinessRecord: { overall: 69 } }).readinessBand).toBe('mid');
    expect(prof('', { readinessRecord: { overall: 85 } }).readinessBand).toBe('high');
    expect(prof('', { country: 'in' })).toMatchObject({ country: 'IN', priceRegion: 'india' });
    expect(prof('', { country: 'US' })).toMatchObject({ country: 'US', priceRegion: 'default' });
    expect(prof('', { country: null })).toMatchObject({ country: null, priceRegion: null });
  });

  it('carries no PII: a fixed set of fields, no aid, no zone name, no full URL', () => {
    const p = prof('?src=capital-one-sql-interview&aid=0123456789abcdef0123456789abcdef', {
      landingSrc: 'ai:chatgpt', navigatorLanguage: 'en-US', tzOffsetEastMin: -300, country: 'US',
      referrer: 'https://chatgpt.com/c/abc?prompt=my-name-is', bootKeys: ['sqlquest_aid'],
    });
    expect(Object.keys(p).sort()).toEqual(['company', 'country', 'device', 'door', 'doorSrc', 'interviewTarget', 'itSignal',
      'landingBefore', 'landingSrc', 'language', 'priceRegion', 'readinessBand', 'tzBucket', 'v'].sort());
    const json = JSON.stringify(p);
    expect(json).not.toMatch(/0123456789abcdef|America\/|prompt|my-name/);
  });

  it('a stored profile is whitelisted field by field', () => {
    const p = normalizeVisitorProfile({ ...prof('?src=home'), email: 'a@b.c', username: 'ada', device: 'fridge' });
    expect(p).not.toHaveProperty('email');
    expect(p).not.toHaveProperty('username');
    expect(p.device).toBe(null);
    expect(normalizeVisitorProfile({ door: 'nope' })).toBe(null);
  });
});

describe('the stratum — interview-target × desktop / phone+tablet', () => {
  it('maps every combination, and an unreadable device reads as desktop', () => {
    expect(TOURNAMENT_STRATA).toEqual(['IT-D', 'IT-M', 'NI-D', 'NI-M']);
    expect(tournamentStratum(prof('?src=capital-one-sql-interview'))).toBe('IT-D');
    expect(tournamentStratum(prof('?company=Revolut', { viewportWidth: 390 }))).toBe('IT-M');
    expect(tournamentStratum(prof('?company=Revolut', { viewportWidth: 800 }))).toBe('IT-M');
    expect(tournamentStratum(prof('?src=sql-exercises'))).toBe('NI-D');
    expect(tournamentStratum(prof('?src=home', { viewportWidth: 375 }))).toBe('NI-M');
    expect(tournamentStratum(prof('?src=home', { viewportWidth: null }))).toBe('NI-D');
    expect(tournamentStratum(null)).toBe('NI-D');
  });

  it('the enrolment takes the stratum from the profile, and the record keeps the profile', () => {
    const p = prof('?company=Revolut', { viewportWidth: 390 });
    const r = tournamentEnrolment({ flagOn: true, aid: AIDS[0], now: NOW, profile: p }).record;
    expect(r.stratum).toBe('IT-M');
    expect(r.profile).toEqual(normalizeVisitorProfile(p));
    expect(r.arm).toBe(tournamentAssign(AIDS[0], TOURNAMENT_ARMS, { stratum: 'IT-M' }).id);
    // …and survives storage.
    expect(normalizeTournamentRecord(JSON.parse(JSON.stringify(r)))).toEqual(r);
  });
});

describe('the draw inside the stratum — weights', () => {
  const share = (stratum, routing) => {
    const c = {};
    for (const a of AIDS) { const id = tournamentAssign(a, TOURNAMENT_ARMS, { stratum, routing }).id; c[id] = (c[id] || 0) + 1; }
    return Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v / AIDS.length]));
  };

  it('the live table routes nothing yet: every stratum draws equally over the active arms', () => {
    expect(TOURNAMENT_STRATUM_WEIGHTS).toEqual({});
    for (const s of TOURNAMENT_STRATA) {
      const sw = stratumWeights(s);
      expect(sw.version).toBe(0);
      expect(sw.routed).toBe(false);
      const got = share(s);
      expect(Object.keys(got).sort()).toEqual(['A_control', 'B_single_path', 'D_interview_sprint']);
      for (const v of Object.values(got)) expect(Math.abs(v - 1 / 3)).toBeLessThan(0.02);
    }
  });

  it('every entry ever added to the live table is valid (≥ 20% explores, active arms only)', () => {
    for (const [s, entry] of Object.entries(TOURNAMENT_STRATUM_WEIGHTS)) {
      expect(TOURNAMENT_STRATA).toContain(s);
      expect(validStratumRouting(entry), s).toBe(true);
    }
  });

  const routed = { 'IT-D': { version: 1, since: '2027-03-05', decision: 'test', weights: { B_single_path: 0.8, A_control: 0.1, D_interview_sprint: 0.1 } } };

  it('an 80/20 routing: the routed stratum gets 80 / 10 / 10, the other strata stay equal', () => {
    const got = share('IT-D', routed);
    expect(Math.abs(got.B_single_path - 0.8)).toBeLessThan(0.015);
    expect(Math.abs(got.A_control - 0.1)).toBeLessThan(0.015);
    expect(Math.abs(got.D_interview_sprint - 0.1)).toBeLessThan(0.015);
    for (const s of ['IT-M', 'NI-D', 'NI-M']) {
      for (const v of Object.values(share(s, routed))) expect(Math.abs(v - 1 / 3)).toBeLessThan(0.02);
    }
    const d = tournamentDraw(AIDS[0], { stratum: 'IT-D', routing: routed });
    expect(d.weightsVersion).toBe(1);
    expect(d.routed).toBe(true);
    expect(d.weights).toEqual({ A_control: 0.1, B_single_path: 0.8, D_interview_sprint: 0.1 });
  });

  it('a routing that breaks the rules is ignored (the stratum draws equally)', () => {
    const bad = (weights, version = 1) => ({ 'IT-D': { version, weights } });
    for (const r of [
      bad({ B_single_path: 0.9, A_control: 0.05, D_interview_sprint: 0.05 }),   // < 20% explores
      bad({ B_single_path: 0.8, A_control: 0.2 }),                               // D left at 0
      bad({ B_single_path: 0.8, A_control: 0.1, C_proof_first: 0.1 }),           // C is not active
      bad({ B_single_path: 0.8, A_control: 0.1, D_interview_sprint: 0.1 }, 0),   // no version
    ]) {
      expect(validStratumRouting(r['IT-D'])).toBe(false);
      expect(stratumWeights('IT-D', { routing: r }).routed).toBe(false);
    }
    expect(validStratumRouting(routed['IT-D'])).toBe(true);
    expect(TOURNAMENT_MIN_EXPLORE).toBe(0.2);
  });

  it('the same aid can land in different arms in different strata: each stratum is its own salt, independent of the others', () => {
    const cells = {};
    for (const a of AIDS) {
      const k = `${tournamentAssign(a, TOURNAMENT_ARMS, { stratum: 'IT-D' }).id}|${tournamentAssign(a, TOURNAMENT_ARMS, { stratum: 'NI-D' }).id}`;
      cells[k] = (cells[k] || 0) + 1;
    }
    expect(Object.keys(cells)).toHaveLength(9);
    for (const n of Object.values(cells)) expect(Math.abs(n / AIDS.length - 1 / 9)).toBeLessThan(0.015);
  });

  const others = {
    'first screen': firstScreenArm, 'company direct': companyDirectArm, 'runnable starter': runnableStarterArm,
    'freeQuota holdout': freeQuotaArm, 'company ask': companyAskArm,
  };
  for (const s of TOURNAMENT_STRATA) {
    it(`inside ${s}, independent of the other two-arm tests (each cell 1/6 ± 2 points)`, () => {
      for (const [name, other] of Object.entries(others)) {
        const cells = {};
        for (const a of AIDS) {
          const k = `${tournamentAssign(a, TOURNAMENT_ARMS, { stratum: s }).id}|${other(a)}`;
          cells[k] = (cells[k] || 0) + 1;
        }
        expect(Object.keys(cells), name).toHaveLength(6);
        for (const n of Object.values(cells)) expect(Math.abs(n / AIDS.length - 1 / 6), name).toBeLessThan(0.02);
      }
    });
  }
});

describe('the reason — a sentence on every assignment', () => {
  it('names the profile, the device, the stratum, the weights, the draw and the arm', () => {
    const r = tournamentEnrolment({ flagOn: true, aid: AIDS[1], now: NOW, profile: prof('?src=capital-one-sql-interview') }).record;
    const letter = r.arm.split('_')[0];
    expect(r.reason).toBe(`interview-target (Capital One page) · desktop → stratum IT-D; equal weights A/B/D; hash draw ${r.draw.toFixed(2)} → ${letter}`);
  });

  it('says why for every interview signal, and the door for everyone else', () => {
    const say = (search, extra = {}) => tournamentEnrolment({ flagOn: true, aid: AIDS[2], now: NOW, profile: prof(search, extra) }).record.reason;
    expect(say('?company=Revolut', { viewportWidth: 390 })).toMatch(/^interview-target \(\?company=Revolut link\) · phone → stratum IT-M; /);
    expect(say('?src=readiness&company=Capital%20One')).toMatch(/^interview-target \(readiness test for Capital One\) · desktop → stratum IT-D/);
    expect(say('?src=home', { readinessRecord: { overall: 80 } })).toMatch(/^interview-target \(readiness result on this browser\)/);
    expect(say('?src=sql-exercises')).toMatch(/^not interview-target \(door: sql-exercises\) · desktop → stratum NI-D/);
    expect(say('?src=home', { landingSrc: 'ai:gemini', viewportWidth: 800 })).toMatch(/^not interview-target \(door: AI assistant gemini\) · tablet → stratum NI-M/);
    expect(say('', { viewportWidth: null })).toMatch(/^not interview-target \(door: direct \/ unknown\) · device unknown, read as desktop → stratum NI-D/);
  });

  it('a routed stratum says so, winner first', () => {
    const routing = { 'IT-D': { version: 2, weights: { B_single_path: 0.8, A_control: 0.1, D_interview_sprint: 0.1 } } };
    const r = tournamentEnrolment({ flagOn: true, aid: AIDS[4], now: NOW, profile: prof('?src=capital-one-sql-interview'), routing }).record;
    expect(r.reason).toMatch(/; routed weights v2: B 80% \/ A 10% \/ D 10%; hash draw 0\.\d\d → [ABD]$/);
    expect(r.weightsVersion).toBe(2);
    expect(tournamentReason({})).toMatch(/stratum \?/);
  });

  it('tournament_assigned carries the stratum, the profile, the weights, the draw and the reason', () => {
    const r = tournamentEnrolment({ flagOn: true, aid: AIDS[5], now: NOW, profile: prof('?src=home', { viewportWidth: 390 }) }).record;
    const p = tournamentAssignedPayload(r);
    expect(p.stratum).toBe('NI-M');
    expect(p.profile.door).toBe('homepage');
    expect(p.weights).toEqual({ A_control: 0.333, B_single_path: 0.333, D_interview_sprint: 0.333 });
    expect(p.weightsVersion).toBe(0);
    expect(p.draw).toBeGreaterThanOrEqual(0);
    expect(p.draw).toBeLessThan(1);
    expect(p.reason).toBe(r.reason);
    expect(JSON.stringify(p).length).toBeLessThan(1500);
  });

  it('the country is filled in at announce time when /api/geo/ has answered — never the stratum', () => {
    const r = tournamentEnrolment({ flagOn: true, aid: AIDS[6], now: NOW, profile: prof('?src=home') }).record;
    const e = enrichTournamentProfile(r, { country: 'IN' });
    expect(e.profile).toMatchObject({ country: 'IN', priceRegion: 'india' });
    expect(e.stratum).toBe(r.stratum);
    expect(e.arm).toBe(r.arm);
    expect(e.reason).toBe(r.reason);
    expect(enrichTournamentProfile(e, { country: 'US' }).profile.country).toBe('IN');
    expect(enrichTournamentProfile(r, { country: null })).toBe(r);
  });
});

describe('app.jsx: the profile is read at the first open, before any key is written', () => {
  it('BOOT_KEYS is taken before the holdout block (which mints the aid)', () => {
    const boot = APP.indexOf('const BOOT_KEYS = (() => {');
    const holdout = APP.indexOf('let FQ_HOLDOUT_RECORD = null;');
    expect(boot).toBeGreaterThan(0);
    expect(boot).toBeLessThan(holdout);
  });

  it('the enrolment block builds the profile and passes it in; the announce fills the country', () => {
    const tour = APP.indexOf('let TOURNAMENT_RECORD = null;');
    const urlBlock = APP.indexOf('// Module-load URL-param capture.');
    const block = APP.slice(tour, urlBlock);
    expect(block).toMatch(/profile = buildVisitorProfile\(\{/);
    expect(block).toMatch(/bootKeys: BOOT_KEYS,/);
    expect(block).toMatch(/viewportWidth: window\.innerWidth,/);
    expect(block).toMatch(/sessionStorage\.getItem\('sqlquest_geo_country'\)/);
    expect(block).toMatch(/\n {6}profile,\n {4}\}\);/);
    const at = APP.indexOf("trackActivationEvent('tournament_assigned'");
    const effect = APP.slice(APP.lastIndexOf('useEffect(() => {', at), at);
    expect(effect).toMatch(/enrichTournamentProfile\(TOURNAMENT_RECORD, \{ country: sessionStorage\.getItem\('sqlquest_geo_country'\) \}\)/);
  });

  it('the flag still ships dark', () => {
    expect(FLAGS).toMatch(/\n {4}firstSessionTournament: false,\n/);
  });
});

describe('profileDoor is pure', () => {
  it('needs no browser', () => {
    expect(profileDoor({}).door).toBe('direct_unknown');
    expect(profileDoor({ src: 'stripe-sql-interview' })).toMatchObject({ door: 'company_page', company: 'stripe', interviewTarget: true });
  });
});
