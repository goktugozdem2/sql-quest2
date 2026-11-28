// The canonical segment (src/utils/segment.js, 2026-11-27): one label per
// person, the #409 segment table made executable, stamped on every event.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  SEGMENTS, SEGMENT_VERSION, segmentOf, segmentEventStamp, nextSegmentRecord, pickSegmentProfile, skillmapBand,
} from '../src/utils/segment.js';
import { buildVisitorProfile } from '../src/utils/tournament.js';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const APP = fs.readFileSync(path.join(ROOT, 'src/app.jsx'), 'utf8');

const NOW = Date.UTC(2026, 10, 27, 12); // 2026-11-27 12:00 UTC
const companyPage = buildVisitorProfile({ search: '?src=stripe-sql-interview', viewportWidth: 1280 });
const companyLink = buildVisitorProfile({ search: '?company=Capital%20One', viewportWidth: 390 });
const readinessNoCo = buildVisitorProfile({ search: '', readinessRecord: { overall: 55 } });
const exercises = buildVisitorProfile({ search: '?src=sql-exercises', viewportWidth: 1280, country: 'IN' });
const seg = (o) => segmentOf({ now: NOW, ...o });

describe('segmentOf — every segment', () => {
  it('interview_dated: a date today or later', () => {
    const r = seg({ prepTarget: { company: 'Stripe', date: '2026-12-04' } });
    expect(r.seg).toBe('interview_dated');
    expect(r.dims.daysToDate).toBe(7);
    expect(r.why).toBe('interview date in 7 days');
    expect(seg({ prepTarget: { date: '2026-11-27' } }).seg).toBe('interview_dated');
  });
  it('a past date is no date', () => {
    const r = seg({ prepTarget: { date: '2026-11-20' }, intent: 'learning' });
    expect(r.seg).toBe('learner');
    expect(r.dims.daysToDate).toBe(null);
  });
  it('interview_company: a named company, or a company door', () => {
    expect(seg({ prepTarget: { company: 'Capital One' } })).toMatchObject({ seg: 'interview_company', dims: { company: 'capital-one' } });
    const page = seg({ profile: companyPage });
    expect(page.seg).toBe('interview_company');
    expect(page.dims.company).toBe('stripe');
    expect(page.why).toMatch(/company door \(company_page: stripe\)/);
    expect(seg({ profile: companyLink }).seg).toBe('interview_company');
  });
  it('interview_general: interview intent, the interview-prep goal, or an interview door without a company', () => {
    expect(seg({ intent: 'interview' }).seg).toBe('interview_general');
    expect(seg({ goal: 'interview-prep' }).seg).toBe('interview_general');
    expect(seg({ profile: readinessNoCo })).toMatchObject({ seg: 'interview_general', why: 'arrived through an interview door (readiness_result)' });
  });
  it('at_work: said so, or hired', () => {
    expect(seg({ intent: 'at_work' }).seg).toBe('at_work');
    expect(seg({ intent: 'hired' })).toMatchObject({ seg: 'at_work', why: 'said they got the job (hired)' });
  });
  it('job_ready and learner: from the stated intent, else the Coach goal', () => {
    expect(seg({ intent: 'job_ready' }).seg).toBe('job_ready');
    expect(seg({ intent: 'learning' }).seg).toBe('learner');
    expect(seg({ goal: 'analyst-day-one' }).seg).toBe('job_ready');
    expect(seg({ goal: 'fundamentals' }).seg).toBe('learner');
    expect(seg({ intent: 'exploring', goal: 'fundamentals' }).seg).toBe('learner');
  });
  it('unknown: nothing said, no interview door', () => {
    expect(seg({}).seg).toBe('unknown');
    expect(seg({ profile: exercises }).seg).toBe('unknown');
    expect(seg({ intent: 'exploring' }).why).toBe('said: just exploring');
  });
  it('every label is reachable and every answer has a one-line why', () => {
    const cases = [
      { prepTarget: { date: '2026-12-01' } }, { prepTarget: { company: 'Meta' } }, { intent: 'interview' },
      { intent: 'job_ready' }, { intent: 'at_work' }, { intent: 'learning' }, {},
    ];
    const got = cases.map(c => seg(c));
    expect(got.map(r => r.seg)).toEqual(SEGMENTS);
    for (const r of got) expect(r.why).toMatch(/^[^\n]{8,120}$/);
  });
});

describe('segmentOf — priority order (#409: an interview target outranks what was said later)', () => {
  it('hired beats a date', () => {
    expect(seg({ intent: 'hired', prepTarget: { date: '2026-12-01', company: 'Meta' } }).seg).toBe('at_work');
  });
  it('a date beats a company', () => {
    expect(seg({ prepTarget: { date: '2026-12-01', company: 'Meta' } }).seg).toBe('interview_dated');
  });
  it('a company beats a stated interview, job-ready or learning intent', () => {
    for (const intent of ['interview', 'job_ready', 'learning', 'at_work']) {
      expect(seg({ intent, profile: companyPage }).seg).toBe('interview_company');
    }
  });
  it('a stated interview beats at_work, job_ready and learning goals', () => {
    expect(seg({ intent: 'interview', goal: 'fundamentals' }).seg).toBe('interview_general');
  });
  it('at_work beats job_ready, which beats learner; a stated intent beats the Coach goal', () => {
    expect(seg({ intent: 'at_work', goal: 'analyst-day-one' }).seg).toBe('at_work');
    expect(seg({ intent: 'job_ready', goal: 'fundamentals' }).seg).toBe('job_ready');
    expect(seg({ intent: 'learning', goal: 'analyst-day-one' }).seg).toBe('learner');
  });
});

describe('segmentOf — dims', () => {
  it('device, region, level, company, daysToDate, solves, pro', () => {
    const r = seg({ profile: exercises, solves: 7, proStatus: true, level: 'working' });
    expect(r.dims).toEqual({ device: 'desktop', region: 'india', level: 'working', company: null, daysToDate: null, solves: 7, pro: true });
  });
  it('the app\'s india price wins over the profile; no placement → the Skillmap band', () => {
    const r = seg({ priceRegion: 'india', mastery: { Joins: { mastery: 80, attempts: 3 }, 'Window Functions': { mastery: 60, attempts: 1 }, 'NULL Handling': { mastery: 0, attempts: 0 } } });
    expect(r.dims.region).toBe('india');
    expect(r.dims.level).toBe('skillmap_high');
    expect(skillmapBand({})).toBe(null);
    expect(skillmapBand({ Joins: { mastery: 10, attempts: 2 } })).toBe('low');
  });
});

describe('the event stamp — the label only, never PII', () => {
  it('a known label → { seg, segV }; anything else → nothing', () => {
    expect(segmentEventStamp('interview_company')).toEqual({ seg: 'interview_company', segV: SEGMENT_VERSION });
    expect(segmentEventStamp(null)).toEqual({});
    expect(segmentEventStamp('capital-one')).toEqual({});
  });
  it('no company, date, country or profile field ever reaches the stamp', () => {
    const r = seg({ profile: companyLink, prepTarget: { company: 'Capital One', date: '2026-12-10' }, proStatus: true, solves: 9 });
    const stamp = segmentEventStamp(r.seg);
    expect(Object.keys(stamp).sort()).toEqual(['seg', 'segV']);
    const text = JSON.stringify(stamp);
    expect(SEGMENTS).toContain(stamp.seg);
    for (const leak of ['capital', '2026', 'phone', '"company"', '"IN"', 'door', 'daysToDate']) expect(text).not.toContain(leak);
  });
});

describe('the record and the profile', () => {
  it('the record changes only when the label does', () => {
    const a = nextSegmentRecord(null, 'learner', NOW);
    expect(a).toEqual({ seg: 'learner', at: new Date(NOW).toISOString(), v: 1 });
    expect(nextSegmentRecord(a, 'learner', NOW + 1e6)).toBe(a);
    expect(nextSegmentRecord(a, 'job_ready', NOW + 1e6).seg).toBe('job_ready');
    expect(nextSegmentRecord(a, 'nope', NOW)).toBe(a);
  });
  it('the tournament\'s profile wins; else stored once; upgraded once by a later interview door', () => {
    expect(pickSegmentProfile({ tournamentProfile: companyPage, stored: exercises, current: exercises })).toEqual({ profile: companyPage, write: null });
    expect(pickSegmentProfile({ current: exercises })).toEqual({ profile: exercises, write: exercises });
    expect(pickSegmentProfile({ stored: exercises, current: buildVisitorProfile({}) })).toEqual({ profile: exercises, write: null });
    expect(pickSegmentProfile({ stored: exercises, current: companyLink })).toEqual({ profile: companyLink, write: companyLink });
    expect(pickSegmentProfile({ stored: companyPage, current: companyLink })).toEqual({ profile: companyPage, write: null });
  });
});

describe('app.jsx wiring', () => {
  const early = APP.indexOf('  if (showAuth) {');
  const noDb = APP.indexOf('  if (!dbReady) return (');

  it('writeProEvent stamps the segment label on every row', () => {
    const at = APP.indexOf('const writeProEvent = (event, reason, metadata = {}, opts = {}) => {');
    const body = APP.slice(at, APP.indexOf('\n  };', at));
    expect(body).toMatch(/metadata: JSON\.stringify\(\{ \.\.\.metadata, [^\n]*\.\.\.segmentEventStamp\(SEGMENT_SEG\), aid: getAnonId\(\) \}\)/);
  });
  it('the label is read at module load with no flag in the way (works with the tournament off)', () => {
    const a = APP.indexOf('let SEGMENT_SEG = null;');
    const block = APP.slice(a, APP.indexOf('// Module-load URL-param capture.', a));
    expect(a).toBeGreaterThan(APP.indexOf('let TOURNAMENT_RECORD = null;'));
    expect(block).toMatch(/SEGMENT_SEG = segmentOf\(/);
    expect(block).toMatch(/readBootProfile\(\)/);
    expect(block).not.toMatch(/FF\?\.feature|firstSessionTournament/);
  });
  it('the recompute hook sits above the early returns and follows intent, prepTarget and the Coach goal', () => {
    const hook = APP.indexOf('const [segmentRecord, setSegmentRecord] = useState(null);');
    expect(hook).toBeGreaterThan(0);
    expect(early).toBeGreaterThan(0);
    expect(noDb).toBeGreaterThan(0);
    expect(hook).toBeLessThan(early);
    expect(hook).toBeLessThan(noDb);
    const effect = APP.slice(hook, APP.indexOf('}, [', hook) + 120);
    expect(effect).toMatch(/SEGMENT_SEG = seg;/);
    expect(effect).toMatch(/\}, \[currentUser, intentRecord\?\.goal, prepTarget\.company, prepTarget\.date, coachState\?\.goalId\]\);/);
  });
  it('the record rides the save as userData.segment', () => {
    expect(APP).toMatch(/\{ segment: nextSegmentRecord\(existingData\?\.segment \|\| null, segmentRecord\.seg\) \}/);
    expect(APP).toMatch(/dailyRewardClaimedDate, pathState, segmentRecord\]\);/);
  });
});
