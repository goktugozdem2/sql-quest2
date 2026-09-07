// Interview prep — a named company, a date, and what to do between now and it.
//
// WHY THIS EXISTS (2026-09-08)
//
// Two of the three people who have ever paid were preparing for one named
// company's screen. Yesterday the content for it shipped: a landing page, ten
// Capital One-tagged challenges on the `finans_fraud` card ledger, and a
// 70-minute CodeSignal-style mock. What did not ship was the way in. A person
// who knows "I am interviewing at Capital One in five days" could not say so
// anywhere in the product: the company chip is buried among the difficulty
// filters, the goal picker offers three goals and none of them is a company,
// and the codebase had no concept of a date at all.
//
// ── SHIPPED OFF ──────────────────────────────────────────────────────────────
//
// FEATURE_FLAGS.features.interviewCountdown = false. The card renders on the
// Interview Prep tab and on the first-run path for the same population the
// open "paywall surfaces" ledger claim is reading until 2026-09-20. One
// surface, one change at a time (docs/data-driven-product.md P7). The flag
// flips after that read lands, and the flip — not the merge — dates every
// event in the claim.
//
// ── WHAT THIS MODULE REFUSES TO DO ───────────────────────────────────────────
//
// 1. IT NEVER PREDICTS AN OUTCOME. `companyReadiness` returns "how much of
//    what we have for this target you have done", and nothing else. It is not
//    a probability of passing, it is not calibrated against any real hiring
//    decision, and there is no data in this product from which such a thing
//    could be built — nobody has ever told us whether they got the job. The
//    copy in both languages says what the number is measured from, and
//    `tests/interview-prep.test.js` fails the build on prediction words in
//    either language.
//
// 2. IT NEVER OFFERS A TARGET WE DO NOT HAVE CONTENT FOR. 23 companies carry
//    tags in src/data/challenge-companies.js and 22 of them are tag filters
//    over the generic bank — the same ecommerce and employees challenges,
//    sliced 23 ways. Showing a "Stripe readiness: 64" over challenges written
//    about an online store would claim a specificity we do not have. The list
//    is still computed from the data on every call — there is no allow-list in
//    this file — but one of its inputs is now editorial: an ARCHETYPE, the
//    signed claim in src/data/interview-archetypes.js that a dataset is shaped
//    like a particular kind of company's screen. A tag can never grant
//    membership; a person writes it down, with a dated source, or the company
//    is not offerable.
//
// 3. IT NEVER DESCRIBES ANY COMPANY'S REAL PROCESS. The mock is built from
//    what candidates report, says so in its own description, and this module
//    only ever refers to "the mock" — never to what the company actually does.
//
// Pure. No React, no DOM, no storage, no clock of its own — `now` is an
// argument so every branch is assertable. Fails closed on malformed input and
// on an unusable clock, the same posture as src/utils/review-ask.js.

import { SKILL_TO_RADAR, mapTopicToSkill } from './skill-calc.js';
import { makeChallengeComparator, pickTopNWith } from './challenge-order.js';
import { challengeMatchesSkill, DRILL_TARGET } from './skill-drill.js';
import { INTERVIEW_ARCHETYPES } from '../data/interview-archetypes.js';

// ───────────────────────────── the eligibility bar ──────────────────────────

/**
 * How many challenges must exist on the target's own data shape.
 *
 * 8, from the mock rather than from a round number: the Capital One mock runs
 * 14 questions, 6 of them written SQL. A prep flow that hands someone fewer
 * challenges than the written half of the assessment has nothing to spread
 * across the days before it. Ten exist today (ids 275-284), so the bar has
 * two spare — and a company page that loses content below this line stops
 * being offered rather than degrading quietly into a thin plan.
 */
export const MIN_TARGET_CHALLENGES = 8;

// WHAT USED TO BE HERE, AND WHY IT IS GONE (2026-09-08).
//
// `MIN_DATASET_EXCLUSIVITY = 0.9`: the share of the company tags on a dataset
// that had to belong to the target. It was measured, not asserted — company-tag
// pairs per dataset in the live bank sat at 100% (finans_fraud, uretim_
// industrial, finans_banking) or at 56% and below (titanic, movies, employees,
// ecommerce), and 0.9 sat inside that empty gap. As a separator of "authored
// for this screen" from "the generic bank with a tag filter over it", it
// worked.
//
// It asked the wrong question. The card-transaction ledger is the shape of
// EVERY card issuer's analyst screen; tag the same ten challenges for a second
// issuer and the first one's share falls to 0.5, so BOTH dropped out — the bar
// punished the content getting more honest. Exclusivity was a proxy for an
// editorial judgement, and the judgement is now written down where it can be
// argued with: src/data/interview-archetypes.js.
//
// The old bar's genuine catch is unaffected. Its nearest miss was Snowflake on
// `titanic` — 14 tagged challenges, 56% share, and a house dataset holding
// challenge 1 from the beginner ladder. Snowflake is refused now for a better
// reason than a share: nobody has written down a claim that `titanic` is
// shaped like Snowflake's screen, and no one could.

/**
 * Lifetime solves below which no readiness number is produced at all.
 *
 * 5 — the canonical `engaged` mark (docs/data-driven-product.md §2). Below it
 * `calculateSkillLevels` is still inside its confidence dampener (full weight
 * needs 4 data points per skill), so every part of the score would be noise
 * wearing two significant figures. `null` is the honest output and the UI
 * renders the invitation to start instead of a number.
 */
export const MIN_EVIDENCE_SOLVES = 5;

// ───────────────────────────── the readiness weights ────────────────────────

/**
 * The three parts, and why they weigh what they weigh.
 *
 *   coverage 0.45 — the target's own challenges, solved. The most specific
 *     evidence that exists: these are the only challenges in the product
 *     written on the target's data shape. It is the largest weight because it
 *     is the only part that cannot be earned anywhere else.
 *
 *   skills 0.30 — the radar, weighted by what the target set actually demands.
 *     Broader evidence and less specific: a strong Window Functions score was
 *     earned on movies and employees data, not on a card ledger. It is here
 *     because a person who has never opened a target challenge is still not
 *     starting from zero, and pretending otherwise would send an experienced
 *     analyst back through three Easy warm-ups.
 *
 *   mock 0.25 — the closest thing in the product to the shape of the screen
 *     (timed, mixed multiple-choice and written SQL, one sitting). Smallest of
 *     the three because it is ONE sitting: a single score carries a single
 *     day's variance, and weighting it heavier would make the number swing on
 *     one bad afternoon.
 *
 * When the mock has not been taken its weight is REALLOCATED across the other
 * two rather than scored 0 — the same treatment skill-calc gives its nullable
 * speed signal. Scoring an untaken mock as zero would cap every free user at
 * 75 for a reason that has nothing to do with their SQL (the mock is
 * `isFree: false`), which turns a readiness number into a paywall lever. It is
 * not one. `parts.mock.counted === false` is carried out to the UI so the card
 * says the mock is not counted, rather than hiding a reallocation.
 */
export const READINESS_WEIGHTS = Object.freeze({ coverage: 0.45, skills: 0.30, mock: 0.25 });

// ───────────────────────────── the plan ─────────────────────────────────────

/**
 * The furthest ahead a day-by-day plan is written.
 *
 * 21. Ten target challenges plus a handful of drills is about three weeks of
 * honest work; spreading it over 90 days produces a calendar of mostly empty
 * days, which is a fiction with a UI around it. Past this the plan covers the
 * next 21 days and says so, and `beyondPlanDays` carries the remainder.
 */
export const MAX_PLAN_DAYS = 21;

/** Weak demanded skills that earn drills, and how many challenges each gets. */
export const PLAN_DRILL_SKILLS = 3;
export const PLAN_DRILL_PER_SKILL = 2;

export const PREP_PLAN_STATUS = Object.freeze({
  OK: 'ok',                     // days remain, there is work to place in them
  TODAY: 'today',               // the interview is today — one list, no calendar
  PAST: 'past',                 // the stored date is behind us
  NOTHING_LEFT: 'nothing_left', // every target challenge solved, mock taken
  UNAVAILABLE: 'unavailable',   // malformed input or an unusable clock
});

const DAY_MS = 24 * 60 * 60 * 1000;

// ───────────────────────────── small helpers ────────────────────────────────

const isFiniteNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const toFiniteNumber = (v) => (isFiniteNumber(v) ? v : null);

/**
 * Raw challenge tags → the 9 canonical radar skills.
 *
 * The THREE-NAMESPACE rule (CLAUDE.md, "Skill radar"): `challenge.skills` and
 * `challenge.category` are RAW tags ("LEFT JOIN", "ROW_NUMBER", "GROUP BY +
 * Date Functions"), while `skillLevels` is keyed by the 9 canonical names.
 * Comparing one to the other silently matches nothing — it is what broke
 * mastery_check on "JOIN Tables" and retrieval_check on "CASE Statements".
 * Every tag in this file goes through here first.
 */
function resolveToCanonical(raw) {
  if (!raw) return null;
  return SKILL_TO_RADAR[raw] || SKILL_TO_RADAR[mapTopicToSkill(raw)] || null;
}

/** Accept a Set, an array, or nothing. Never throws. */
function toIdSet(solved) {
  if (solved && typeof solved.has === 'function' && typeof solved.forEach === 'function') return solved;
  const out = new Set();
  if (Array.isArray(solved)) for (const id of solved) out.add(id);
  return out;
}

/** The single dataset a mock runs on, or null when it runs on more than one. */
function mockDataset(mock) {
  const questions = Array.isArray(mock?.questions) ? mock.questions : [];
  if (questions.length === 0) return null;
  const seen = new Set();
  for (const q of questions) {
    if (!q || typeof q.dataset !== 'string' || q.dataset.length === 0) return null;
    seen.add(q.dataset);
    if (seen.size > 1) return null;
  }
  return seen.size === 1 ? [...seen][0] : null;
}

/** The company tags for a challenge id, as an array. Never throws. */
function tagsForId(companyMap, id) {
  const raw = companyMap?.[String(id)];
  return Array.isArray(raw) ? raw.filter(c => typeof c === 'string' && c.length > 0) : [];
}

// ───────────────────────────── eligibility ──────────────────────────────────

/**
 * Tagged challenge ids per (dataset, company). Computed once per call.
 *
 * Duplicate-id safe: the bank can hold the same challenge twice after an HMR
 * reload appends sector-challenges.js a second time.
 */
function indexTaggedIds(bank, companyMap) {
  const idsByDatasetCompany = new Map();     // `${dataset} ${company}` → id[]
  const seenIds = new Set();
  for (const ch of bank) {
    if (!ch || typeof ch.dataset !== 'string' || !isFiniteNumber(ch.id)) continue;
    if (seenIds.has(ch.id)) continue;
    seenIds.add(ch.id);
    for (const company of tagsForId(companyMap, ch.id)) {
      const key = `${ch.dataset} ${company}`;
      if (!idsByDatasetCompany.has(key)) idsByDatasetCompany.set(key, []);
      idsByDatasetCompany.get(key).push(ch.id);
    }
  }
  return idsByDatasetCompany;
}

/**
 * The mock this company can actually sit for this archetype: keyed to their
 * exact name, and running on the archetype's own dataset and nothing else.
 *
 * A mock that hops between datasets is a general interview with a company
 * label on it, not a screen shape. The seven other mocks in the bank are keyed
 * 'General', 'Big Tech', 'FAANG', 'Fintech' and so on; no archetype member will
 * ever carry one of those strings, so they cannot leak in.
 */
function sittableMock(mocks, company, dataset) {
  for (const mock of mocks) {
    if (typeof mock?.company !== 'string' || mock.company.trim() !== company) continue;
    if (mockDataset(mock) !== dataset) continue;
    return mock;
  }
  return null;
}

/**
 * Which companies may be offered a prep flow.
 *
 * COMPUTED, but from editorial input. Three conjuncts:
 *
 *   1. The company is a DECLARED MEMBER of an archetype in
 *      src/data/interview-archetypes.js — a written, signed, dated claim that
 *      the archetype's dataset is shaped like that company's screen. A tag can
 *      never grant this. Neither can a mock. A person writes it down, or the
 *      company is not offerable; the checklist for writing it down is in that
 *      file.
 *   2. A mock keyed to that exact company name exists and runs on the
 *      archetype's dataset, and only that dataset — the company can sit it.
 *   3. At least MIN_TARGET_CHALLENGES challenges on that dataset are tagged for
 *      that company. Membership decides WHO is offered a flow; the tags decide
 *      WHICH challenges they get, because a dataset can hold work that is not
 *      the archetype's screen (finans_fraud also carries the fraud-detection
 *      track, ids 270-274 — see `excludesOnDataset` in the registry). Counting
 *      the company's own set rather than the whole dataset is the stronger bar:
 *      the set is a subset of the dataset, and it is what the plan is built
 *      from.
 *
 * WHAT CONJUNCT 1 REPLACED: a computed exclusivity share, ≥ 0.9 of the company
 * tags on the dataset. See the note where MIN_DATASET_EXCLUSIVITY used to be.
 * The consequence that matters: co-tagging the target set for a second DECLARED
 * MEMBER no longer removes the first one. Two card issuers sitting the same
 * ledger is the honest case, and it used to empty the picker.
 *
 * Today exactly one company clears all three, and a test asserts the registry
 * holds exactly one archetype and one member — so a second is a reviewed diff
 * rather than a drift.
 *
 * @param {Array} bank            window.challengesData (sector challenges appended)
 * @param {Object} companyMap     window.challengeCompanies — id(string) → company[]
 * @param {Array} mocks           window.mockInterviewsData
 * @param {Array} [archetypes]    the registry; injectable for tests only — every
 *                                production caller passes three arguments
 * @returns {Array<{company:string,mockId:string,dataset:string,archetypeId:string,
 *                  challengeIds:number[],challengeCount:number}>}
 *          sorted by company name; [] on anything malformed.
 */
export function eligibleTargets(bank, companyMap, mocks, archetypes = INTERVIEW_ARCHETYPES) {
  if (!Array.isArray(bank) || !Array.isArray(mocks)) return [];
  if (!companyMap || typeof companyMap !== 'object') return [];
  if (!Array.isArray(archetypes) || archetypes.length === 0) return [];

  const idsByDatasetCompany = indexTaggedIds(bank, companyMap);

  const out = [];
  const claimed = new Set();
  for (const archetype of archetypes) {
    const dataset = typeof archetype?.dataset === 'string' ? archetype.dataset.trim() : '';
    if (!dataset) continue;

    for (const member of (Array.isArray(archetype.members) ? archetype.members : [])) {
      const company = typeof member?.company === 'string' ? member.company.trim() : '';
      if (!company || claimed.has(company)) continue;         // conjunct 1

      const mock = sittableMock(mocks, company, dataset);
      if (!mock) continue;                                    // conjunct 2

      const ids = idsByDatasetCompany.get(`${dataset} ${company}`) || [];
      if (ids.length < MIN_TARGET_CHALLENGES) continue;       // conjunct 3

      claimed.add(company);
      out.push({
        company,
        mockId: typeof mock.id === 'string' ? mock.id : null,
        dataset,
        archetypeId: typeof archetype.id === 'string' ? archetype.id : null,
        challengeIds: ids.slice().sort((a, b) => a - b),
        challengeCount: ids.length,
      });
    }
  }

  return out.sort((a, b) => a.company.localeCompare(b.company));
}

/** The eligible target with this company name, or null. Case-insensitive. */
export function findTarget(company, bank, companyMap, mocks, archetypes = INTERVIEW_ARCHETYPES) {
  if (typeof company !== 'string' || company.trim().length === 0) return null;
  const wanted = company.trim().toLowerCase();
  return eligibleTargets(bank, companyMap, mocks, archetypes)
    .find(t => t.company.toLowerCase() === wanted) || null;
}

/**
 * Everything the registry CLAIMS that the data does not back, as sentences.
 *
 * `eligibleTargets` fails closed: a member whose mock has gone missing simply
 * stops appearing, which is right at runtime and wrong at review time. A
 * written claim that has quietly stopped being true is the failure mode this
 * whole change introduces, so it gets a validator, and
 * `tests/interview-prep.test.js` fails the build on a non-empty result.
 *
 * The realistic ways it goes wrong, all covered here: somebody re-runs
 * scripts/augment-companies.mjs and the manual tags are dropped (the header of
 * challenge-companies.js says "preserve on regeneration", which is a comment,
 * not a mechanism); a dataset is renamed; a mock's `company` drifts from the
 * tag string by a space or a capital; a member is declared before the content
 * for them exists.
 *
 * NOT covered here, because this module is browser-pure and cannot read the
 * filesystem: whether each member has `src/<pageSlug>-sql-interview.html`. The
 * test checks that one.
 *
 * @returns {string[]} empty when every claim is backed by the data
 */
export function archetypeProblems(bank, companyMap, mocks, archetypes = INTERVIEW_ARCHETYPES) {
  if (!Array.isArray(bank) || bank.length === 0) return ['bank: not an array of challenges'];
  if (!Array.isArray(mocks)) return ['mocks: not an array'];
  if (!companyMap || typeof companyMap !== 'object') return ['companyMap: not an object'];
  if (!Array.isArray(archetypes) || archetypes.length === 0) return ['registry: no archetypes declared'];

  const problems = [];
  const idsByDatasetCompany = indexTaggedIds(bank, companyMap);

  const datasetSize = new Map();
  const seenIds = new Set();
  for (const ch of bank) {
    if (!ch || typeof ch.dataset !== 'string' || !isFiniteNumber(ch.id) || seenIds.has(ch.id)) continue;
    seenIds.add(ch.id);
    datasetSize.set(ch.dataset, (datasetSize.get(ch.dataset) || 0) + 1);
  }

  const seenArchetypeIds = new Set();
  const companyToArchetype = new Map();

  for (const archetype of archetypes) {
    const id = typeof archetype?.id === 'string' ? archetype.id.trim() : '';
    const where = id || '(unnamed archetype)';
    if (!id) problems.push(`${where}: no id`);
    else if (seenArchetypeIds.has(id)) problems.push(`${id}: declared twice`);
    seenArchetypeIds.add(id);

    for (const field of ['label', 'claim', 'whyThisDataset']) {
      const v = archetype?.[field];
      if (typeof v !== 'string' || v.trim().length === 0) {
        problems.push(`${where}: ${field} is missing — an archetype nobody wrote down is not a claim`);
      }
    }

    const dataset = typeof archetype?.dataset === 'string' ? archetype.dataset.trim() : '';
    if (!dataset) {
      problems.push(`${where}: no dataset`);
    } else if (!datasetSize.has(dataset)) {
      problems.push(`${where}: dataset "${dataset}" is not in the challenge bank`);
    } else if (datasetSize.get(dataset) < MIN_TARGET_CHALLENGES) {
      problems.push(
        `${where}: dataset "${dataset}" carries ${datasetSize.get(dataset)} challenges, `
        + `under the ${MIN_TARGET_CHALLENGES} bar`,
      );
    }

    const members = Array.isArray(archetype?.members) ? archetype.members : [];
    if (members.length === 0) {
      problems.push(`${where}: no members — an archetype with nobody in it offers nobody`);
    }

    for (const member of members) {
      const company = typeof member?.company === 'string' ? member.company.trim() : '';
      if (!company) { problems.push(`${where}: a member with no company name`); continue; }
      const at = `${where}/${company}`;

      const prior = companyToArchetype.get(company.toLowerCase());
      if (prior) problems.push(`${at}: already a member of "${prior}" — a company belongs to one archetype`);
      else companyToArchetype.set(company.toLowerCase(), where);

      for (const field of ['pageSlug', 'declaredOn', 'declaredBy', 'screenSource', 'shapeNote']) {
        const v = member?.[field];
        if (typeof v !== 'string' || v.trim().length === 0) {
          problems.push(`${at}: ${field} is missing — membership is a claim somebody signs`);
        }
      }

      if (!dataset) continue;
      if (!sittableMock(mocks, company, dataset)) {
        problems.push(`${at}: no mock keyed to this exact name running on "${dataset}" — nothing to sit`);
      }
      const ids = idsByDatasetCompany.get(`${dataset} ${company}`) || [];
      if (ids.length < MIN_TARGET_CHALLENGES) {
        problems.push(
          `${at}: ${ids.length} tagged challenges on "${dataset}", under the ${MIN_TARGET_CHALLENGES} bar`,
        );
      }
    }
  }

  return problems;
}

/**
 * What the target's own challenge set actually demands, in canonical skills.
 *
 * Weight is the number of target challenges that demand the skill — deduped
 * per challenge, so a challenge tagged ["Window Functions", "ROW_NUMBER",
 * "PARTITION BY"] counts once for Window Functions and does not out-vote three
 * separate challenges. This is the same dedupe skill-calc does in SOURCE 1,
 * and for the same reason.
 *
 * @returns {Array<{skill:string,challenges:number,share:number}>} desc by weight
 */
export function targetDemandedSkills(target, bank) {
  if (!target || !Array.isArray(target.challengeIds) || !Array.isArray(bank)) return [];
  const wanted = new Set(target.challengeIds);
  const counts = new Map();
  let considered = 0;

  for (const ch of bank) {
    if (!ch || !wanted.has(ch.id)) continue;
    wanted.delete(ch.id);                                    // duplicate-id safe
    considered += 1;
    const canonical = new Set();
    for (const tag of [...(Array.isArray(ch.skills) ? ch.skills : []), ch.category]) {
      const k = resolveToCanonical(tag);
      if (k) canonical.add(k);
    }
    for (const k of canonical) counts.set(k, (counts.get(k) || 0) + 1);
  }

  if (considered === 0) return [];
  return [...counts.entries()]
    .map(([skill, challenges]) => ({ skill, challenges, share: challenges / considered }))
    .sort((a, b) => (b.challenges - a.challenges) || a.skill.localeCompare(b.skill));
}

// ───────────────────────────── readiness ────────────────────────────────────

/**
 * How much of what we have for this target the user has done. 0-100, plus the
 * parts it was built from, so the card can show the working rather than a
 * mystery number.
 *
 * **This is not a probability of passing anything.** See the header.
 *
 * Returns `null` — never a flattering number — when there is not enough
 * evidence to say anything: an ineligible or missing target, fewer than
 * MIN_EVIDENCE_SOLVES lifetime solves, or a target whose challenges are not in
 * the bank we were handed.
 *
 * @param {Object}   args
 * @param {Object}   args.skillLevels  canonical skill → 0-100 (calculateSkillLevels output)
 * @param {Set|Array} args.solvedIds   lifetime solved challenge ids
 * @param {Object}   args.target       an entry from eligibleTargets()
 * @param {Array}    args.bank         window.challengesData
 * @param {Object|null} args.mockResult `{ taken:boolean, scorePercent:number }` — the BEST
 *                                      attempt at target.mockId, or null/absent for never taken
 * @returns {{score:number, parts:Object, weightsUsed:Object, evidence:Object}|null}
 */
export function companyReadiness({ skillLevels, solvedIds, target, bank, mockResult } = {}) {
  if (!target || !Array.isArray(target.challengeIds) || target.challengeIds.length === 0) return null;
  if (!Array.isArray(bank) || bank.length === 0) return null;

  const solved = toIdSet(solvedIds);
  // No solves at all is no evidence at all. Below the engaged mark the radar
  // is still inside its confidence dampener, so a number here would be noise.
  if (solved.size < MIN_EVIDENCE_SOLVES) return null;

  const demanded = targetDemandedSkills(target, bank);
  if (demanded.length === 0) return null;   // the target's ids are not in this bank

  // ── part 1: coverage of the target's own set ──
  const total = target.challengeIds.length;
  let targetSolved = 0;
  for (const id of target.challengeIds) if (solved.has(id)) targetSolved += 1;
  const coverageScore = (targetSolved / total) * 100;

  // ── part 2: the radar, weighted by what the set demands ──
  const levels = (skillLevels && typeof skillLevels === 'object') ? skillLevels : {};
  let weightSum = 0;
  let levelSum = 0;
  const demandedDetail = demanded.map(d => {
    const level = Math.max(0, Math.min(100, toFiniteNumber(levels[d.skill]) ?? 0));
    weightSum += d.challenges;
    levelSum += d.challenges * level;
    return { skill: d.skill, challenges: d.challenges, level };
  });
  const skillsScore = weightSum > 0 ? levelSum / weightSum : 0;

  // ── part 3: the mock ──
  const mockTaken = mockResult?.taken === true && toFiniteNumber(mockResult?.scorePercent) !== null;
  const mockScore = mockTaken ? Math.max(0, Math.min(100, mockResult.scorePercent)) : 0;

  // Reallocate the mock's weight when it has not been taken (see
  // READINESS_WEIGHTS). Never score an untaken Pro-gated mock as a zero.
  // Rounded to 4 places: these weights are rendered as percentages on the
  // card, and 0.39999999999999997 is not a thing to show a person.
  const round4 = (n) => Math.round(n * 10000) / 10000;
  const weightsUsed = mockTaken
    ? { ...READINESS_WEIGHTS }
    : (() => {
        const rest = READINESS_WEIGHTS.coverage + READINESS_WEIGHTS.skills;
        return {
          coverage: round4(READINESS_WEIGHTS.coverage / rest),
          skills: round4(READINESS_WEIGHTS.skills / rest),
          mock: 0,
        };
      })();

  const raw = (coverageScore * weightsUsed.coverage)
            + (skillsScore * weightsUsed.skills)
            + (mockScore * weightsUsed.mock);

  return {
    score: Math.round(Math.max(0, Math.min(100, raw))),
    parts: {
      coverage: {
        solved: targetSolved,
        total,
        score: Math.round(coverageScore),
        weight: weightsUsed.coverage,
        counted: true,
      },
      skills: {
        score: Math.round(skillsScore),
        weight: weightsUsed.skills,
        counted: true,
        demanded: demandedDetail,
      },
      mock: {
        mockId: target.mockId || null,
        taken: mockTaken,
        score: mockTaken ? Math.round(mockScore) : null,
        weight: weightsUsed.mock,
        counted: mockTaken,
      },
    },
    weightsUsed,
    evidence: { solves: solved.size, targetSolves: targetSolved },
  };
}

/** Coarse bucket for the analytics payload — never the raw score. */
export function readinessBucket(score) {
  const n = toFiniteNumber(score);
  if (n === null) return 'none';
  if (n < 25) return '0-24';
  if (n < 50) return '25-49';
  if (n < 75) return '50-74';
  return '75-100';
}

// ───────────────────────────── the date ─────────────────────────────────────

/**
 * Whole days from `now` to a `YYYY-MM-DD` calendar date. Negative when the
 * date has passed, 0 when it is today.
 *
 * Both sides are reduced to UTC midnight before subtracting, so the answer is
 * a count of calendar days rather than of 24-hour periods — an interview
 * "tomorrow" reads 1 whether it is now 09:00 or 23:59. ONE frame is used
 * throughout this module, deliberately: mixing a locally-computed
 * `daysRemaining` with UTC-stamped plan days is how a plan ends up one day out
 * of step with the calendar it is drawn on.
 *
 * Returns null on a malformed date or an unusable clock — the callers treat
 * null as "no date set", never as "today".
 */
export function daysUntil(isoDate, now) {
  if (typeof isoDate !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) return null;
  const y = Number(m[1]); const mo = Number(m[2]); const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const targetMs = Date.UTC(y, mo - 1, d);
  // Reject a date that rolled over (2026-02-31 → March 3).
  const back = new Date(targetMs);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null;

  const nowMs = toFiniteNumber(now);
  if (nowMs === null) return null;
  const nd = new Date(nowMs);
  if (Number.isNaN(nd.getTime())) return null;
  const todayMs = Date.UTC(nd.getUTCFullYear(), nd.getUTCMonth(), nd.getUTCDate());
  return Math.round((targetMs - todayMs) / DAY_MS);
}

/** `YYYY-MM-DD` for `now` plus `offsetDays`, in the same UTC frame. */
function stampDate(now, offsetDays) {
  const nd = new Date(now + (offsetDays * DAY_MS));
  const y = nd.getUTCFullYear();
  const mo = String(nd.getUTCMonth() + 1).padStart(2, '0');
  const d = String(nd.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

// ───────────────────────────── the plan ─────────────────────────────────────

/**
 * What to do between now and the date.
 *
 * The unsolved target challenges first, in CURRICULUM order — never raw id
 * order (src/utils/challenge-order.js carries the incident: the raw bank is
 * FAANG-ordered, so the first Medium by id is challenge 1, our worst challenge
 * at 24% solve-through, and it became "what's next" for every Medium solver in
 * four separate places). Then drills: up to PLAN_DRILL_PER_SKILL unsolved
 * non-target challenges for each of the PLAN_DRILL_SKILLS weakest skills the
 * target set actually demands, again through the comparator. Then the mock, on
 * the last planned day, if it has not been taken — a 70-minute timed sitting
 * is a dress rehearsal, and a dress rehearsal goes at the end.
 *
 * Every edge case is a named status rather than an empty list with a shrug:
 *
 *   daysRemaining < 0   → PAST. The stored date is behind us; the UI asks for
 *                         a new one. No plan is produced — silently rolling a
 *                         passed date forward would be inventing an interview.
 *   daysRemaining === 0 → TODAY. One list, no calendar, and **no drills and no
 *                         mock**: only the target challenges still unsolved.
 *                         Telling someone to sit a 70-minute timed rehearsal
 *                         and six general drills on the morning of their
 *                         interview is bad advice with a progress bar on it.
 *   daysRemaining === 1 → one working day (today), with the mock on it. The
 *                         day before is exactly when a dress rehearsal helps.
 *   > MAX_PLAN_DAYS     → at most MAX_PLAN_DAYS days are planned and
 *                         `beyondPlanDays` says how much time is left over.
 *   more days than work → the plan shrinks to the number of days there is
 *                         actually work for, rather than padding a calendar
 *                         with empty days to reach the date.
 *   nothing target-left → NOTHING_LEFT: no unsolved target challenge and no
 *                         mock outstanding. Drills may still be returned in
 *                         `days` — they are general practice, and the status
 *                         is what tells the UI the target-specific work is
 *                         done rather than the plan being broken.
 *   malformed / no clock→ UNAVAILABLE, empty lists.
 *
 * @param {Object} args
 * @param {Object} args.target        an entry from eligibleTargets()
 * @param {Object|null} args.readiness companyReadiness() output; its skills part
 *                                     supplies the levels the drills are chosen from
 * @param {Set|Array} args.solvedIds  lifetime solved challenge ids
 * @param {Array} args.bank           window.challengesData
 * @param {number} args.daysRemaining from daysUntil()
 * @param {number} args.now           epoch ms
 * @param {Map}   [args.curriculumOrder] app.jsx's SQL_ROADMAP_CHALLENGE_ORDER
 * @returns {{status:string, daysRemaining:number|null, planDays:number, beyondPlanDays:number,
 *            today:Array, days:Array, totals:Object}}
 */
export function planToDate({ target, readiness, solvedIds, bank, daysRemaining, now, curriculumOrder } = {}) {
  const empty = (status) => ({
    status,
    daysRemaining: toFiniteNumber(daysRemaining),
    planDays: 0,
    beyondPlanDays: 0,
    today: [],
    days: [],
    totals: { targetRemaining: 0, drills: 0, mock: 0 },
  });

  if (!target || !Array.isArray(target.challengeIds)) return empty(PREP_PLAN_STATUS.UNAVAILABLE);
  if (!Array.isArray(bank) || bank.length === 0) return empty(PREP_PLAN_STATUS.UNAVAILABLE);
  const days = toFiniteNumber(daysRemaining);
  const nowMs = toFiniteNumber(now);
  if (days === null || nowMs === null) return empty(PREP_PLAN_STATUS.UNAVAILABLE);
  if (days < 0) return empty(PREP_PLAN_STATUS.PAST);

  const solved = toIdSet(solvedIds);
  const order = (curriculumOrder instanceof Map) ? curriculumOrder : new Map();
  const comparator = makeChallengeComparator(order);
  const targetIds = new Set(target.challengeIds);

  // ── the target's own unsolved challenges, in curriculum order ──
  const seen = new Set();
  const targetItems = bank
    .filter(c => {
      if (!c || !targetIds.has(c.id) || solved.has(c.id) || seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    })
    .sort(comparator)
    .map(c => ({
      kind: 'target',
      challengeId: c.id,
      title: c.title || null,
      difficulty: c.difficulty || null,
      skill: null,
    }));

  // On the day itself there is no room for anything but the target set.
  const isToday = days === 0;

  // ── drills for the weakest DEMANDED skills ──
  // The levels come from the readiness parts so the drill choice and the
  // number on the card are computed from one radar reading, not two.
  const demanded = Array.isArray(readiness?.parts?.skills?.demanded)
    ? readiness.parts.skills.demanded
    : targetDemandedSkills(target, bank).map(d => ({ ...d, level: 0 }));

  const weakest = demanded
    .filter(d => toFiniteNumber(d.level) !== null && d.level < DRILL_TARGET)
    .sort((a, b) => (a.level - b.level) || a.skill.localeCompare(b.skill))
    .slice(0, PLAN_DRILL_SKILLS);

  const drillItems = [];
  const drilled = new Set();
  for (const { skill } of (isToday ? [] : weakest)) {
    const picks = pickTopNWith(
      order,
      bank,
      c => c
        && !targetIds.has(c.id)           // the target set is not a drill; it is the plan
        && !solved.has(c.id)
        && !drilled.has(c.id)
        && challengeMatchesSkill(c, skill),
      PLAN_DRILL_PER_SKILL,
    );
    for (const c of picks) {
      drilled.add(c.id);
      drillItems.push({
        kind: 'drill',
        challengeId: c.id,
        title: c.title || null,
        difficulty: c.difficulty || null,
        skill,
      });
    }
  }

  // ── the mock ──
  const mockDone = readiness?.parts?.mock?.taken === true;
  const mockItem = (!isToday && !mockDone && target.mockId)
    ? { kind: 'mock', interviewId: target.mockId, challengeId: null, title: null, difficulty: null, skill: null }
    : null;

  const work = [...targetItems, ...drillItems];
  if (work.length === 0 && !mockItem) {
    return { ...empty(PREP_PLAN_STATUS.NOTHING_LEFT), daysRemaining: days };
  }

  // ── spread it ──
  // Never pad a calendar: with 13 items and 90 days the plan is 13 days long
  // and `beyondPlanDays` carries the other 77, rather than drawing a month of
  // empty boxes to reach the date.
  const windowDays = Math.max(1, Math.min(isToday ? 1 : days, MAX_PLAN_DAYS));
  const planDays = Math.max(1, Math.min(windowDays, work.length || 1));
  const beyondPlanDays = Math.max(0, days - planDays);
  const perDay = Math.ceil(work.length / planDays) || 1;

  const dayList = [];
  for (let i = 0; i < planDays; i++) {
    const slice = work.slice(i * perDay, (i + 1) * perDay);
    dayList.push({ dayIndex: i, date: stampDate(nowMs, i), items: slice });
  }
  // The dress rehearsal goes on the last planned day, which on a one-day plan
  // is today — that is the honest answer when the interview is tomorrow.
  if (mockItem) dayList[dayList.length - 1].items.push(mockItem);

  const targetLeft = targetItems.length === 0 && !mockItem;
  return {
    status: targetLeft
      ? PREP_PLAN_STATUS.NOTHING_LEFT
      : (isToday ? PREP_PLAN_STATUS.TODAY : PREP_PLAN_STATUS.OK),
    daysRemaining: days,
    planDays,
    beyondPlanDays,
    today: dayList[0].items,
    days: dayList,
    totals: {
      targetRemaining: targetItems.length,
      drills: drillItems.length,
      mock: mockItem ? 1 : 0,
    },
  };
}
