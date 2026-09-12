// P1 (2026-09-12): the skill model — user_skill rows on the canonical nine,
// the weakest-skill picker, error patterns, the row_set diagnosis and the
// one-hint chooser. Pure logic against the LIVE bank where the pick depends
// on it, plus source guards on the wiring in app.jsx.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  buildUserSkill, levelFromMastery, toCanonicalSkill, isLegacyMasteryRecord, attemptSkills,
  highestSolvedDifficulty, nextDifficultyFor, pickNextBySkill,
} from '../src/utils/user-skill.js';
import { CANONICAL_SKILLS } from '../src/utils/skill-calc.js';
import {
  ERROR_PATTERNS, classifyErrorPatterns, recordErrorPatterns, patternCount, recentPatterns, describeErrorPatterns, emptyErrorStore, RECENT_CAP,
} from '../src/utils/error-patterns.js';
import { diagnoseResult, primaryHint } from '../src/utils/diagnose.js';
import { buildCurriculumOrder, makeChallengeComparator } from '../src/utils/challenge-order.js';

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

const BANK = [
  { id: 91, difficulty: 'Easy', skills: ['SELECT'], category: 'Basics' },
  { id: 92, difficulty: 'Easy', skills: ['WHERE'], category: 'Filtering' },
  { id: 6, difficulty: 'Medium', skills: ['INNER JOIN'], category: 'Joins' },
  { id: 19, difficulty: 'Medium', skills: ['LEFT JOIN'], category: 'Joins' },
  { id: 23, difficulty: 'Hard', skills: ['Window Functions'], category: 'Window Functions', freePreview: true },
  { id: 47, difficulty: 'Hard', skills: ['LAG', 'Window Functions'], category: 'Window Functions' },
  { id: 174, difficulty: 'Easy', skills: ['JOIN'], category: 'Joins' },
];

describe('user_skill — one row per canonical skill, fed by attempts', () => {
  it('maps raw tags, legacy keys and lesson topics onto the canonical nine', () => {
    expect(toCanonicalSkill('Joins')).toBe('Joins');
    expect(toCanonicalSkill('LEFT JOIN')).toBe('Joins');
    expect(toCanonicalSkill('JOIN Tables')).toBe('Joins');
    expect(toCanonicalSkill('CTEs')).toBe('Subqueries & CTEs');
    expect(toCanonicalSkill('WHERE & Filtering')).toBe('Querying Basics');
    expect(toCanonicalSkill('CASE Statements')).toBe('Conditional Logic');
    expect(toCanonicalSkill('nonsense-tag-xyz')).toBeNull();
    expect(toCanonicalSkill(null)).toBeNull();
  });

  it('builds every canonical row, counts attempts/correct/hints per skill and keeps the latest timestamp', () => {
    const attempts = [
      { challengeId: 6, success: false, timestamp: 1000, topics: ['INNER JOIN'], hintsUsed: 1 },
      { challengeId: 6, success: true, timestamp: 2000, topics: ['INNER JOIN'] },
      { challengeId: 47, success: true, timestamp: 3000 }, // no topics → resolved from the bank
    ];
    const rows = buildUserSkill({ attempts, skillLevels: { Joins: 42, 'Window Functions': 71 }, allChallenges: BANK });
    expect(Object.keys(rows).sort()).toEqual([...CANONICAL_SKILLS].sort());
    expect(rows.Joins).toEqual({ level: 2, mastery: 42, correctCount: 1, totalAttempts: 2, lastPracticed: new Date(2000).toISOString(), hintsUsed: 1 });
    expect(rows['Window Functions']).toMatchObject({ level: 4, mastery: 71, totalAttempts: 1, correctCount: 1 });
    expect(rows['NULL Handling']).toEqual({ level: 1, mastery: 0, correctCount: 0, totalAttempts: 0, lastPracticed: null, hintsUsed: 0 });
  });

  it('folds an old fourteen-name record in once, through the same mapping', () => {
    const legacy = {
      'JOIN Tables': { level: 3, correctCount: 4, totalAttempts: 5, lastPracticed: '2026-09-01T00:00:00.000Z', hintsUsed: 2 },
      'CTEs': { level: 1, correctCount: 1, totalAttempts: 1, lastPracticed: null, hintsUsed: 0 },
      'UNION & Set Operations': { level: 1, correctCount: 0, totalAttempts: 0, lastPracticed: null, hintsUsed: 0 },
    };
    expect(isLegacyMasteryRecord(legacy)).toBe(true);
    const rows = buildUserSkill({ legacy, attempts: [{ challengeId: 6, success: true, timestamp: Date.parse('2026-09-10T00:00:00Z'), topics: ['JOIN'] }], allChallenges: BANK });
    expect(rows.Joins.totalAttempts).toBe(6);
    expect(rows.Joins.correctCount).toBe(5);
    expect(rows.Joins.hintsUsed).toBe(2);
    expect(rows.Joins.lastPracticed).toBe('2026-09-10T00:00:00.000Z');
    expect(rows['Subqueries & CTEs'].totalAttempts).toBe(1);
    // a canonical record is the derived row, never legacy input
    expect(isLegacyMasteryRecord(rows)).toBe(false);
    expect(isLegacyMasteryRecord({})).toBe(false);
  });

  it('levels: 1–5 from mastery', () => {
    expect([0, 29, 30, 49, 50, 69, 70, 84, 85, 100].map(levelFromMastery)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
    expect(attemptSkills({ topics: ['SELECT', 'ORDER BY'] }, new Map())).toEqual(new Set(['Querying Basics']));
  });
});

describe('the picker — weakest skill, one difficulty above what they have shown', () => {
  const order = buildCurriculumOrder([{ id: 's1', challengeIds: [91, 92, 174, 6, 19, 23, 47] }]);
  const comparator = makeChallengeComparator(order);

  it('one above the highest solved on the skill; Hard only once mastery reaches 50', () => {
    expect(nextDifficultyFor({ highestSolved: null, mastery: 10 })).toBe('Easy');
    expect(nextDifficultyFor({ highestSolved: 'Easy', mastery: 20 })).toBe('Medium');
    expect(nextDifficultyFor({ highestSolved: 'Medium', mastery: 40 })).toBe('Medium');
    expect(nextDifficultyFor({ highestSolved: 'Medium', mastery: 55 })).toBe('Hard');
    expect(nextDifficultyFor({ highestSolved: 'Hard', mastery: 90 })).toBe('Hard');
    expect(highestSolvedDifficulty('Joins', [{ challengeId: 174, success: true }, { challengeId: 6, success: false }], BANK)).toBe('Easy');
    expect(highestSolvedDifficulty('Joins', [], BANK)).toBeNull();
  });

  it('picks the weakest skill and the tier above, in curriculum order, never a solved or locked one', () => {
    const userSkill = buildUserSkill({ attempts: [{ challengeId: 174, success: true, timestamp: 1 }], skillLevels: { Joins: 25, 'Querying Basics': 80, 'Window Functions': 0 }, allChallenges: BANK });
    // Window Functions is 0 → "untouched", the weakest below target with data is Joins (25)
    const pick = pickNextBySkill({ userSkill, allChallenges: BANK, attempts: [{ challengeId: 174, success: true }], solved: new Set([174]), comparator });
    expect(pick.skill).toBe('Joins');
    expect(pick.difficulty).toBe('Medium');
    expect(pick.challenge.id).toBe(6);       // 6 before 19 in the curriculum
    expect(pick.reason).toBe('one_up');
    // with 6 solved and 19 locked, it falls back one tier down (Easy on Joins is solved) then to any
    const pick2 = pickNextBySkill({ userSkill, allChallenges: BANK, attempts: [{ challengeId: 174, success: true }], solved: new Set([174, 6]), comparator, isLocked: c => c.id === 19 });
    expect(pick2).toBeNull(); // nothing unsolved and unlocked on Joins
  });

  it('returns null with no skills, and excludes the challenge just solved', () => {
    expect(pickNextBySkill({ userSkill: {}, allChallenges: BANK })).toBeNull();
    const userSkill = buildUserSkill({ skillLevels: { 'Querying Basics': 10 }, allChallenges: BANK });
    const pick = pickNextBySkill({ userSkill, allChallenges: BANK, solved: new Set(), excludeId: 91, comparator });
    expect(pick.challenge.id).toBe(92);
  });
});

describe('error patterns — the habit behind a wrong submit, remembered', () => {
  const expected = { columns: ['dept', 'n'], rows: [['a', 2], ['b', 3]] };

  it('names missing GROUP BY, cross joins, join type and NULL comparisons from the diagnosis + query', () => {
    const extra = diagnoseResult({ columns: ['dept', 'n'], rows: [['a', 1], ['a', 1], ['b', 3]] }, expected);
    expect(classifyErrorPatterns(extra, 'SELECT dept, COUNT(*) AS n FROM t', { description: 'per department' })).toEqual(['missing_group_by']);
    expect(classifyErrorPatterns(extra, 'SELECT dept, n FROM t JOIN u', {})).toEqual(['cross_join']);
    expect(classifyErrorPatterns(extra, 'SELECT dept, n FROM t', {})).toEqual(['missing_filter']);
    const missing = diagnoseResult({ columns: ['dept', 'n'], rows: [['a', 2]] }, expected);
    expect(classifyErrorPatterns(missing, 'SELECT d.dept, COUNT(*) n FROM d JOIN e ON d.id = e.dept_id GROUP BY 1', {})).toEqual(['wrong_join_type']);
    expect(classifyErrorPatterns(missing, 'SELECT dept, n FROM t WHERE x = NULL', {})).toEqual(['null_handling', 'extra_filter']);
    const err = diagnoseResult(null, null, 'no such column: foo');
    expect(classifyErrorPatterns(err, 'SELECT foo', {})).toEqual(['syntax_error']);
    expect(classifyErrorPatterns(null, '', {})).toEqual([]);
  });

  it('records, caps, counts and describes — "third time" at three', () => {
    let store = emptyErrorStore();
    store = recordErrorPatterns(store, ['missing_group_by'], 45, 1000);
    store = recordErrorPatterns(store, ['missing_group_by', 'null_handling'], 46, 2000);
    store = recordErrorPatterns(store, ['missing_group_by'], 47, 3000);
    store = recordErrorPatterns(store, ['not_a_pattern'], 48, 4000);
    expect(patternCount(store, 'missing_group_by')).toBe(3);
    expect(patternCount(store, 'null_handling')).toBe(1);
    expect(patternCount(store, 'not_a_pattern')).toBe(0);
    expect(recentPatterns(store, 10)).toEqual([{ pattern: 'missing_group_by', count: 3 }, { pattern: 'null_handling', count: 1 }]);
    const lines = describeErrorPatterns(store, ['missing_group_by']);
    expect(lines[0]).toMatch(/ERROR PATTERNS IN THE LAST 10 WRONG SUBMITS: missing_group_by ×3, null_handling ×1/);
    expect(lines[1]).toMatch(/REPEAT: missing_group_by .* this is the third time/);
    expect(describeErrorPatterns(store, ['null_handling'])).toHaveLength(1);
    let big = emptyErrorStore();
    for (let i = 0; i < RECENT_CAP + 7; i++) big = recordErrorPatterns(big, ['sort_order'], i, i);
    expect(big.recent).toHaveLength(RECENT_CAP);
    expect(big.counts.sort_order).toBe(RECENT_CAP + 7);
    expect(Object.keys(ERROR_PATTERNS)).toContain('wrong_join_type');
  });
});

describe('diff engine — row_set is its own kind, and one hint per diagnosis', () => {
  it('right count, wrong rows → row_set with extra and missing rows, not cell_values', () => {
    const expected = { columns: ['name', 'city'], rows: [['ada', 'paris'], ['bob', 'rome'], ['cy', 'oslo']] };
    const user = { columns: ['name', 'city'], rows: [['ada', 'paris'], ['dan', 'lima'], ['eve', 'kiev']] };
    const d = diagnoseResult(user, expected);
    expect(d.kind).toBe('row_set');
    expect(d.preview.extraTotal).toBe(2);
    expect(d.preview.missingTotal).toBe(2);
    expect(d.headline).toMatch(/wrong rows/);
    // same rows, one wrong cell each → still cell_values
    const cells = diagnoseResult({ columns: ['name', 'city'], rows: [['ada', 'paris'], ['bob', 'roma'], ['cy', 'oslo']] }, expected);
    expect(cells.kind).toBe('cell_values');
    // a single-column result stays cell_values (a different value IS a different row there)
    const one = diagnoseResult({ columns: ['n'], rows: [[1], [5]] }, { columns: ['n'], rows: [[1], [2]] });
    expect(one.kind).toBe('cell_values');
  });

  it('primaryHint: one line, chosen by kind and by what the query actually says', () => {
    const expected = { columns: ['dept', 'n'], rows: [['a', 2], ['b', 3]] };
    const extra = diagnoseResult({ columns: ['dept', 'n'], rows: [['a', 1], ['a', 1], ['b', 3]] }, expected);
    expect(primaryHint(extra, { query: 'SELECT dept, COUNT(*) n FROM t' })).toMatch(/GROUP BY/);
    expect(primaryHint(extra, { query: 'SELECT dept, n FROM t JOIN u' })).toMatch(/ON clause/);
    const missing = diagnoseResult({ columns: ['dept', 'n'], rows: [['a', 2]] }, expected);
    expect(primaryHint(missing, { query: 'SELECT ... FROM a JOIN b ON a.id = b.id' })).toMatch(/LEFT JOIN/);
    expect(primaryHint(missing, { query: 'SELECT ... WHERE x = NULL' })).toMatch(/IS NULL/);
    const sorted = diagnoseResult({ columns: ['n'], rows: [[2], [1]] }, { columns: ['n'], rows: [[1], [2]] });
    expect(primaryHint(sorted, { description: 'Return the totals sorted by total descending.' })).toMatch(/ORDER BY total/);
    expect(primaryHint(null, {})).toBeNull();
    expect(typeof primaryHint(diagnoseResult(null, null, 'near "FORM": syntax error'), {})).toBe('string');
  });
});

describe('source guards — the P1 wiring in app.jsx', () => {
  const app = read('../src/app.jsx');
  const flags = read('../src/data/feature-flags.js');

  it('the mastery record is derived from attempts + the radar, never hand-written; the old key is written for readers', () => {
    expect(app).toMatch(/const \[skillMastery, setSkillMastery\] = useState\(\(\) => buildUserSkill\(\{ legacy: lessonSkillStats \}\)\);/);
    expect(app).toMatch(/const next = buildUserSkill\(\{\n\s+attempts: challengeAttempts,\n\s+skillLevels: weaknessTracking\?\.skillLevels \|\| \{\},/);
    expect(app).toMatch(/localStorage\.setItem\('sqlquest_skill_mastery', JSON\.stringify\(next\)\);/);
    // the fourteen retired names are gone from the state
    expect(app).not.toMatch(/'UNION & Set Operations': \{ level: 1/);
    expect(app).toMatch(/const k = toCanonicalSkill\(skillName\);\n\s+if \(!k\) return;/);
    expect(app).toMatch(/lessonSkillStats: lessonSkillStats,\n\s+errorPatterns: errorPatterns,/);
  });

  it('error patterns are recorded on both wrong paths and reach the tutor and the live nudge', () => {
    expect((app.match(/setErrorPatterns\(prev => recordErrorPatterns\(prev, patterns, currentChallenge\.id\)\)/g) || []).length).toBe(2);
    expect((app.match(/trackActivationEvent\('challenge_error_pattern'/g) || []).length).toBe(2);
    expect((app.match(/describeErrorPatterns\(errorPatterns, lastErrorPatternsRef\.current \|\| \[\]/g) || []).length).toBe(2);
    expect(app).toMatch(/STUDENT'S CURRENT QUERY \(exactly as written\)/);
    expect(app).toMatch(/MASTERY ON THIS CHALLENGE'S SKILLS/);
    expect(app).toMatch(/GOAL AND DEADLINE/);
    // one context builder, both tutor doors (the hint chain and the inline panel)
    expect((app.match(/buildChallengeTutorContext\(/g) || []).length).toBe(2);
    expect(app).toMatch(/const buildChallengeTutorContext = \(message, priorMessages/);
    expect(app).toMatch(/const inlineCtx = buildChallengeTutorContext\(userMessage, inlineAiMessages\);/);
    expect(app).toMatch(/const tutorCtx = buildChallengeTutorContext\(followUpMessage, challengeAiMessages, \{ includeDiagnosis: false \}\);/);
  });

  it('the inline panel opens on the diagnosis under the flag, and offers a bypass', () => {
    expect(app).toMatch(/const diagnosisOpener = ftbFlag\('socraticLadder'\) && challengeDiagnosis/);
    expect(app).toMatch(/trackActivationEvent\('inline_help_opened'/);
    expect(app).toMatch(/data-testid="tutor-bypass"/);
    expect(app).toMatch(/sendInlineAiMessage\('Show me the full solution and one line on why it works\.'\)/);
    // flag off, the panel keeps its no-solution rule
    expect(app).toMatch(/- Do NOT give the full solution\. Guide them to discover it\./);
  });

  it('the three visible changes are flagged and off; the skill filter is live', () => {
    for (const f of ['weakSkillNext', 'diagnosisHints', 'socraticLadder']) {
      expect(flags, f).toMatch(new RegExp(`^\\s+${f}: false,`, 'm'));
    }
    expect(app).toMatch(/const weakPick = ftbFlag\('weakSkillNext'\)/);
    expect(app).toMatch(/ftbFlag\('diagnosisHints'\) && challengeDiagnosis \? diagnosisShort\(challengeDiagnosis\) : i18n_t\('practice', 'wrongDesc'\)/);
    expect(app).toMatch(/const ladderOn = ftbFlag\('socraticLadder'\);/);
    expect(app).toMatch(/\.filter\(c => !skillFilter \|\| challengeMatchesSkill\(c, skillFilter\)\)/);
    expect(app).toMatch(/data-testid="skill-filter"/);
    // flag off, the tutor keeps its no-solution rule
    expect(app).toMatch(/1\. NEVER reveal the full solution query/);
  });

  it('/coach no longer 404s: it redirects to the app', () => {
    const vercel = JSON.parse(read('../vercel.json'));
    expect(vercel.redirects.some(r => r.source === '/coach/' && r.destination === '/app')).toBe(true);
  });
});
