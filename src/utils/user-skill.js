// user_skill — one row per canonical skill: mastery, attempts, last seen.
//
// The founder's P1 (2026-09-12): "a skill tag on every challenge, and a
// mastery score per tag: user_skill(user_id, tag, mastery, attempts,
// last_seen)". The tags already exist (`challenge.skills` + `category`,
// resolved to the NINE canonical radar skills by skill-calc.js), and the
// mastery number already exists (`calculateSkillLevels` → 0–100 per
// canonical skill, the radar). What did not exist was the row: attempts and
// last-seen per skill lived in `skillMastery`, a THIRD vocabulary of
// fourteen retired names that only the lessons ever wrote to — challenge
// attempts never reached it, so the tutor's "weakest skills" and the
// notifications' "rust" were read off a record that was mostly empty.
//
// This module builds the row from what is already measured:
//   mastery   — the radar number for that skill (skillLevels), 0–100
//   attempts  — challenge attempts whose tags resolve to the skill
//   correct   — of those, the successes
//   lastSeen  — the latest such attempt (ms epoch), or null
//   hintsUsed — hints across those attempts
//   level     — 1–5 from mastery, the shape the old consumers read
//
// Keys are the canonical nine and nothing else. The record is stored on the
// user blob (`userData.skillMastery`) — the same field, new keys — so every
// device and the server-side readers see the same rows; a separate table
// would only duplicate `users.data`, which the email senders already read.
//
// Also here: the next-challenge picker the P1 list asks for — weakest tag,
// one difficulty above what the person has shown on it. Pure; the raw-array
// trap (`src/utils/challenge-order.js`) is respected by taking a comparator.

import { CANONICAL_SKILLS, SKILL_TO_RADAR, mapTopicToSkill } from './skill-calc.js';
import { challengeMatchesSkill, pickWeakestSkill } from './skill-drill.js';

const DIFF_ORDER = ['Easy', 'Medium', 'Hard'];

/** 1–5 from a 0–100 mastery, the scale the tutor and notifications read. */
export function levelFromMastery(mastery) {
  const m = Number(mastery);
  if (!Number.isFinite(m) || m <= 0) return 1;
  if (m >= 85) return 5;
  if (m >= 70) return 4;
  if (m >= 50) return 3;
  if (m >= 30) return 2;
  return 1;
}

/** A raw tag (challenge skill, category, lesson topic, legacy key) → canonical, or null. */
export function toCanonicalSkill(tag) {
  if (typeof tag !== 'string' || !tag) return null;
  if (CANONICAL_SKILLS.includes(tag)) return tag;
  if (SKILL_TO_RADAR && SKILL_TO_RADAR[tag]) return SKILL_TO_RADAR[tag];
  return mapTopicToSkill(tag) || null;
}

/**
 * Is a saved mastery record in the OLD fourteen-name vocabulary? True when
 * any key is not one of the canonical nine. A canonical record is the
 * derived row and must never be folded back in as input (double counting).
 */
export function isLegacyMasteryRecord(record) {
  if (!record || typeof record !== 'object') return false;
  const keys = Object.keys(record);
  if (keys.length === 0) return false;
  return keys.some(k => !CANONICAL_SKILLS.includes(k));
}

function attemptTs(a) {
  if (!a) return 0;
  if (typeof a.timestamp === 'number') return a.timestamp;
  if (a.timestamp) { const t = new Date(a.timestamp).getTime(); if (Number.isFinite(t)) return t; }
  if (a.date) { const t = new Date(a.date).getTime(); if (Number.isFinite(t)) return t; }
  return 0;
}

function emptyRow() {
  return { level: 1, mastery: 0, correctCount: 0, totalAttempts: 0, lastPracticed: null, hintsUsed: 0 };
}

/** The canonical skills an attempt exercised — from its topics, else from the challenge it names. */
export function attemptSkills(attempt, challengeById) {
  const tags = [];
  if (attempt) {
    if (Array.isArray(attempt.topics)) tags.push(...attempt.topics);
    else if (attempt.topic) tags.push(attempt.topic);
  }
  if (tags.length === 0 && attempt && challengeById) {
    const c = challengeById.get(attempt.challengeId);
    if (c) tags.push(...(c.skills || []), c.category);
  }
  const out = new Set();
  for (const t of tags) { const k = toCanonicalSkill(t); if (k) out.add(k); }
  return out;
}

/**
 * The rows. `legacy` is an old-vocabulary record (the fourteen retired keys)
 * whose lesson-only counts are folded in through the same mapping, so nobody
 * loses the hints and attempts the lessons recorded before this existed.
 */
export function buildUserSkill({ attempts = [], skillLevels = {}, allChallenges = [], legacy = null } = {}) {
  const byId = new Map((allChallenges || []).filter(Boolean).map(c => [c.id, c]));
  const rows = {};
  for (const s of CANONICAL_SKILLS) rows[s] = emptyRow();

  if (legacy && typeof legacy === 'object') {
    for (const [key, v] of Object.entries(legacy)) {
      const k = toCanonicalSkill(key);
      if (!k || !rows[k] || !v || typeof v !== 'object') continue;
      const r = rows[k];
      r.correctCount += Number(v.correctCount) || 0;
      r.totalAttempts += Number(v.totalAttempts) || 0;
      r.hintsUsed += Number(v.hintsUsed) || 0;
      const t = v.lastPracticed ? new Date(v.lastPracticed).getTime() : 0;
      if (Number.isFinite(t) && t > 0 && (!r.lastPracticed || t > new Date(r.lastPracticed).getTime())) {
        r.lastPracticed = new Date(t).toISOString();
      }
    }
  }

  for (const a of attempts || []) {
    if (!a) continue;
    const skills = attemptSkills(a, byId);
    if (skills.size === 0) continue;
    const ts = attemptTs(a);
    for (const k of skills) {
      const r = rows[k];
      if (!r) continue;
      r.totalAttempts += 1;
      if (a.success) r.correctCount += 1;
      r.hintsUsed += Number(a.hintsUsed) || 0;
      if (ts > 0 && (!r.lastPracticed || ts > new Date(r.lastPracticed).getTime())) {
        r.lastPracticed = new Date(ts).toISOString();
      }
    }
  }

  for (const s of CANONICAL_SKILLS) {
    const m = Number(skillLevels && skillLevels[s]);
    rows[s].mastery = Number.isFinite(m) ? Math.max(0, Math.min(100, Math.round(m))) : 0;
    rows[s].level = levelFromMastery(rows[s].mastery);
  }
  return rows;
}

/** The highest difficulty this person has SOLVED on a skill, or null. */
export function highestSolvedDifficulty(skill, attempts = [], allChallenges = []) {
  const byId = new Map((allChallenges || []).filter(Boolean).map(c => [c.id, c]));
  let best = -1;
  for (const a of attempts || []) {
    if (!a || !a.success) continue;
    if (!attemptSkills(a, byId).has(skill)) continue;
    const c = byId.get(a.challengeId);
    const d = DIFF_ORDER.indexOf((c && c.difficulty) || a.difficulty);
    if (d > best) best = d;
  }
  return best >= 0 ? DIFF_ORDER[best] : null;
}

/**
 * The difficulty to serve next on a skill: one above the highest they have
 * solved on it (nothing solved → Easy), capped so a Hard is only offered once
 * mastery has reached 50 — "one above" from a person who has just started is
 * still Easy, not a cliff.
 */
export function nextDifficultyFor({ highestSolved = null, mastery = 0 } = {}) {
  const i = highestSolved ? DIFF_ORDER.indexOf(highestSolved) : -1;
  let next = DIFF_ORDER[Math.min(DIFF_ORDER.length - 1, i + 1)];
  if (next === 'Hard' && !(Number(mastery) >= 50)) next = 'Medium';
  return next;
}

/**
 * Weakest tag, one difficulty above the person's level on it.
 *
 * `userSkill` is the record from buildUserSkill; `comparator` orders the
 * candidates (pass `makeChallengeComparator(...)` from challenge-order.js —
 * never raw id order). Falls back one difficulty down, then to any unsolved
 * challenge on the skill, so the pick is never empty while the skill has
 * unsolved content. Returns null only when it does.
 *
 * @returns {{ challenge, skill, difficulty, mastery, reason } | null}
 */
export function pickNextBySkill({ userSkill = {}, allChallenges = [], attempts = [], solved = new Set(), excludeId = null, comparator = null, isLocked = null } = {}) {
  const levels = {};
  for (const [k, v] of Object.entries(userSkill || {})) levels[k] = v && typeof v.mastery === 'number' ? v.mastery : 0;
  const skill = pickWeakestSkill(levels);
  if (!skill) return null;
  const solvedSet = solved instanceof Set ? solved : new Set(solved || []);
  const mastery = levels[skill] || 0;
  const want = nextDifficultyFor({ highestSolved: highestSolvedDifficulty(skill, attempts, allChallenges), mastery });
  const open = (allChallenges || []).filter(c => c && !solvedSet.has(c.id) && c.id !== excludeId
    && challengeMatchesSkill(c, skill) && !(typeof isLocked === 'function' && isLocked(c)));
  if (open.length === 0) return null;
  const sorter = typeof comparator === 'function' ? comparator : ((a, b) => a.id - b.id);
  const tiers = [want, DIFF_ORDER[Math.max(0, DIFF_ORDER.indexOf(want) - 1)], null];
  for (const tier of tiers) {
    const pool = tier ? open.filter(c => c.difficulty === tier) : open;
    if (pool.length > 0) {
      const challenge = pool.slice().sort(sorter)[0];
      return { challenge, skill, difficulty: challenge.difficulty, mastery, reason: tier === want ? 'one_up' : (tier ? 'same_tier' : 'any') };
    }
  }
  return null;
}
