// The Coach's Debug door (orchestrator 2026-11-25, flag `coachDebugDoor`).
//
// Why it exists: the Debug set (331-342), the DDL/DML items and the Stripe
// card got ~0 opens in their first days because nobody was shown a door.
// The 11-25 investigation found the deep links and the logging working; the
// Practice list shows only the current learning-path stage, the Debug chip
// sits ~940 px down (0 clicks in 14 days), and the Coach tab is where people
// are (`coach_tab_viewed` 1,027 people in 14 days vs `nav_practice` 21).
// So: ONE card near the top of the Coach (under "Your plan", above the
// roadmap; see the placement note in app.jsx), "Fix a query an AI
// wrote", whose button opens the next unsolved Debug item.
//
// The pick never reads raw challenge order (CLAUDE.md, "the raw-array trap";
// src/utils/challenge-order.js): it goes through the curriculum comparator,
// so the first Easy Debug item comes before a Medium, by curriculum position
// then difficulty then id. It prefers an item the person is ALLOWED to open
// (the caller's `isLocked` is the app's own lock test: Hard/Pro and the free
// quota). When every unsolved item is locked, the card still points at the
// first unsolved one, marked `locked`, and the click goes through
// openChallenge, which meets the wall exactly as any other open does.
//
// Pure: no window, no React. The app passes the flags, the bank, the solved
// set and the lock test. Guards: tests/coach-debug-door.test.js.

import { isDebugChallenge } from './debug-questions.js';
import { pickNextChallengeWith } from './challenge-order.js';

/** The flag is on only when it is literally true (a missing key reads true in FF). */
export const coachDebugDoorOn = (flags) =>
  !!(flags && flags.features && flags.features.coachDebugDoor === true);

function toSolvedSet(solved) {
  if (solved && typeof solved.has === 'function') return solved;
  return new Set(Array.isArray(solved) ? solved : []);
}

/**
 * The card's model, or null when the card is hidden.
 *
 * Hidden when: either flag is off; the person is hired (the First 90 Days
 * card owns the Coach for them); the person has no solve yet (the first-run
 * path owns that moment); there is no Debug item in the bank; every Debug
 * item is solved.
 *
 * @param {object} args
 * @param {boolean} args.doorOn      coachDebugDoor === true
 * @param {boolean} args.debugOn     debugQuestions === true
 * @param {Array}   args.challenges  the live bank (Debug items join it only while debugQuestions is on)
 * @param {Set|Array} args.solved    solved challenge ids
 * @param {number}  args.solveCount  the person's challenge solves
 * @param {Map}     args.order       buildCurriculumOrder(...) — the app's SQL_ROADMAP_CHALLENGE_ORDER
 * @param {(c:object)=>boolean} [args.isLocked] the app's lock test for an unsolved item
 * @param {boolean} [args.hired]
 * @returns {null | { challenge: object, locked: boolean, total: number, solved: number }}
 */
export function coachDebugDoorModel({
  doorOn = false,
  debugOn = false,
  challenges = [],
  solved = null,
  solveCount = 0,
  order = new Map(),
  isLocked = () => false,
  hired = false,
} = {}) {
  if (doorOn !== true || debugOn !== true) return null;
  if (hired === true) return null;
  if (!(Number(solveCount) >= 1)) return null;
  const set = (challenges || []).filter(isDebugChallenge);
  if (set.length === 0) return null;
  const solvedSet = toSolvedSet(solved);
  const unsolved = set.filter(c => !solvedSet.has(c.id));
  if (unsolved.length === 0) return null;
  const lockTest = typeof isLocked === 'function' ? isLocked : () => false;
  const allowed = pickNextChallengeWith(order, unsolved, c => !lockTest(c));
  const challenge = allowed || pickNextChallengeWith(order, unsolved, () => true);
  return {
    challenge,
    locked: !allowed,
    total: set.length,
    solved: set.length - unsolved.length,
  };
}
