// The canonical segment (2026-11-27): ONE answer to "what kind of person is
// this?", computed the same way everywhere. Plan:
// docs/plans/segment-adoption-2026-11-27.md; metric `segment_mix`.
//
// Before this, segmentation lived in five places that never agreed: the
// tournament's first-open profile (only with its flag on), the stated intent,
// prepTarget, the Coach goal, and analysis-time SQL
// (docs/reads/funnel-by-segment-2026-11-26.md, #409). This module is the
// #409 segment table made executable, with its order kept: an interview
// target (a date, then a company) outranks everything a person said later,
// because that is the segment that pays (7 of 12 payers, 15% of openers).
//
// Rules, first match wins (each returns a one-line `why`):
//   1. intent `hired`                         → at_work      (past the interview)
//   2. prepTarget.date today or later         → interview_dated
//   3. a company: prepTarget.company, or the first-open door named one
//      (company page, ?company=, readiness link, Capital One blog)
//                                             → interview_company
//   4. intent `interview`, the interview-prep Coach goal, or an
//      interview-target door with no company  → interview_general
//   5. intent `at_work`                       → at_work
//   6. intent `job_ready`                     → job_ready
//   7. intent `learning`                      → learner
//   8. no stated intent (or `exploring`): the Coach goal —
//      analyst-day-one → job_ready, fundamentals → learner
//   9. otherwise                              → unknown
//
// It is a MEASUREMENT: nothing in the product branches on it. The event
// stamp is the label only (`seg`, `segV`); the company and the date stay in
// `dims`, which never leave the browser except in the person's own record.
//
// Pure: every input is passed in.

import { daysUntil } from './interview-prep.js';
import { profileReadinessBand } from './tournament.js';

export const SEGMENTS = Object.freeze([
  'interview_dated', 'interview_company', 'interview_general', 'job_ready', 'at_work', 'learner', 'unknown',
]);
export const SEGMENT_VERSION = 1;
/** The browser's last label, so the first event of a load carries it. */
export const SEGMENT_KEY = 'sqlquest_segment_v1';
/** The first-open profile when the tournament did not store one. */
export const SEGMENT_PROFILE_KEY = 'sqlquest_segment_profile_v1';

const LEVEL_IDS = ['brand-new', 'basics', 'working', 'advanced'];
const slug = (v) => {
  const s = String(v == null ? '' : v).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return s || null;
};

/** The Skillmap band from skillMastery rows: the mean of practised skills. */
export function skillmapBand(mastery) {
  if (!mastery || typeof mastery !== 'object') return null;
  const xs = Object.values(mastery)
    .filter(r => r && Number(r.attempts) > 0 && Number.isFinite(Number(r.mastery)))
    .map(r => Number(r.mastery));
  if (!xs.length) return null;
  return profileReadinessBand({ overall: xs.reduce((a, b) => a + b, 0) / xs.length });
}

/**
 * segmentOf({ profile, intent, prepTarget, goal, solves, mastery, proStatus,
 *             priceRegion, level, now }) → { seg, why, dims }
 *   profile     — buildVisitorProfile(…) from the first open, or null
 *   intent      — the stated goal string (userData.intent.goal), or null
 *   prepTarget  — { company, date }
 *   goal        — the Coach goal id (coachState.goalId), or null
 *   level       — the placement tier id (firstRunLevel), or null
 */
export function segmentOf({
  profile = null, intent = null, prepTarget = null, goal = null, solves = 0,
  mastery = null, proStatus = false, priceRegion = null, level = null, now = Date.now(),
} = {}) {
  const p = profile && typeof profile === 'object' ? profile : {};
  const pt = prepTarget && typeof prepTarget === 'object' ? prepTarget : {};
  const said = typeof intent === 'string' ? intent : null;
  const days = daysUntil(pt.date, now);
  const band = skillmapBand(mastery);
  const company = slug(pt.company) || (p.interviewTarget === true ? slug(p.company) : null);
  const dims = {
    device: p.device || null,
    region: priceRegion === 'india' ? 'india' : (p.priceRegion || priceRegion || null),
    level: LEVEL_IDS.includes(level) ? level : (band ? `skillmap_${band}` : null),
    company,
    daysToDate: days != null && days >= 0 ? days : null,
    solves: Number.isFinite(Number(solves)) ? Number(solves) : 0,
    pro: proStatus === true,
  };
  const out = (seg, why) => ({ seg, why, dims });

  if (said === 'hired') return out('at_work', 'said they got the job (hired)');
  if (dims.daysToDate != null) return out('interview_dated', `interview date in ${days} day${days === 1 ? '' : 's'}`);
  if (company) {
    return out('interview_company', slug(pt.company)
      ? `named a company to prepare for (${company})`
      : `arrived through a company door (${p.itSignal || p.door || 'company'}: ${company})`);
  }
  if (said === 'interview') return out('interview_general', 'said: preparing for an interview, no company or date');
  if (goal === 'interview-prep') return out('interview_general', 'chose the SQL Interview Prep goal');
  if (p.interviewTarget === true) return out('interview_general', `arrived through an interview door (${p.itSignal || p.door})`);
  if (said === 'at_work') return out('at_work', 'said: uses SQL at work');
  if (said === 'job_ready') return out('job_ready', 'said: getting job-ready');
  if (said === 'learning') return out('learner', 'said: learning SQL');
  if (goal === 'analyst-day-one') return out('job_ready', 'chose the Analyst Day-One goal');
  if (goal === 'fundamentals') return out('learner', 'chose the Fundamentals goal');
  return out('unknown', said === 'exploring' ? 'said: just exploring' : 'no stated goal and no interview door yet');
}

/** The label on every pro_events row. Nothing else of the segment leaves. */
export function segmentEventStamp(seg) {
  return SEGMENTS.includes(seg) ? { seg, segV: SEGMENT_VERSION } : {};
}

/** The record that rides the save: changes only when the label does. */
export function nextSegmentRecord(prev, seg, now = Date.now()) {
  if (!SEGMENTS.includes(seg)) return prev || null;
  if (prev && prev.seg === seg && prev.v === SEGMENT_VERSION) return prev;
  return { seg, at: new Date(now).toISOString(), v: SEGMENT_VERSION };
}

/**
 * Which first-open profile the segment reads: the tournament's (it is the
 * first open by construction), else the stored one, upgraded once when a
 * later open comes through an interview door the first did not.
 * Returns { profile, write } — `write` is what to store, or null.
 */
export function pickSegmentProfile({ tournamentProfile = null, stored = null, current = null } = {}) {
  if (tournamentProfile && tournamentProfile.door) return { profile: tournamentProfile, write: null };
  const s = stored && stored.door ? stored : null;
  if (!s) return { profile: current || null, write: current || null };
  if (current && current.interviewTarget === true && s.interviewTarget !== true) return { profile: current, write: current };
  return { profile: s, write: null };
}
