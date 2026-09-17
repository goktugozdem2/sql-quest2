// The recommended path — the stages of the Learning Path, and the curriculum
// order every "what should I do next" pick sorts by.
//
// Moved out of src/app.jsx on 2026-09-17 so that code which is not the app can
// read the SAME map: supabase/functions/prep-plan-note/plan.ts builds the
// email's three items with `planToDate`, and until this file existed it had to
// pass an empty curriculum order — the comparator then fell to difficulty and
// id, which for a Snowflake plan can hand out challenge 1 (the 24% opener the
// raw bank puts first; src/utils/challenge-order.js has the incident). The
// app, the tests that parse the stages out of source (tests/roadmap.test.js,
// tests/challenge-order.test.js, tests/interview-prep.test.js) and the edge
// function now all read this one file.
//
// Pure data plus one derived Map. No window, no DOM. It is NOT in
// scripts/data-files.js on purpose: data.js is a concatenation of window-
// globals, and this is an ES module the bundlers import.
//
// Authoring rules (tests/roadmap.test.js enforces them): every stage's
// authored ids stay first in their authored order; `v2Only` stages exist only
// under `roadmapV2`; `skills` + `maxDifficulty` bound what src/utils/roadmap.js
// may append. FIRST_RUN_LEVELS and the Coach placement both start at 91, and
// SQL_ROADMAP_STAGES[0] is [91, 92] — challenge 1 is never a first contact.

import { buildCurriculumOrder } from '../utils/challenge-order.js';

export const SQL_ROADMAP_STAGES = [
  {
    id: 'foundations',
    title: 'Foundations',
    level: 'Start from zero',
    summary: 'Tables, rows, columns, SELECT, FROM, and LIMIT.',
    lessonIds: [1, 2],
    roadmapLessonIds: [1, 2],
    requiredChallengeCount: 0,
    challengeIds: [91, 92],
    // Canonical skills this stage teaches, and the hardest difficulty it may
    // ACQUIRE. Curated ids above are exempt from the ceiling; this bounds only
    // what src/utils/roadmap.js appends. See that file for why.
    skills: ["Querying Basics"],
    maxDifficulty: 'Easy',
    outcomes: ['Read a table', 'Choose columns', 'Run a safe small query'],
  },
  {
    id: 'filtering',
    title: 'Filtering and Sorting',
    level: 'Beginner',
    summary: 'WHERE, comparisons, AND / OR, IN, LIKE, ORDER BY, and LIMIT.',
    lessonIds: [3, 4, 5],
    roadmapLessonIds: ['filtering-where', 'filtering-logic'],
    challengeIds: [93, 94, 95, 96, 97, 102],
    // Canonical skills this stage teaches, and the hardest difficulty it may
    // ACQUIRE. Curated ids above are exempt from the ceiling; this bounds only
    // what src/utils/roadmap.js appends. See that file for why.
    skills: ["Querying Basics"],
    maxDifficulty: 'Easy',
    outcomes: ['Filter rows', 'Combine conditions', 'Sort top results'],
  },
  {
    id: 'aggregates',
    title: 'Counting and Grouping',
    level: 'Beginner+',
    summary: 'COUNT, SUM, AVG, MIN, MAX, GROUP BY, and HAVING.',
    lessonIds: [6, 7, 8],
    roadmapLessonIds: ['aggregates-count', 'aggregates-group'],
    challengeIds: [98, 99, 100, 107],
    // Canonical skills this stage teaches, and the hardest difficulty it may
    // ACQUIRE. Curated ids above are exempt from the ceiling; this bounds only
    // what src/utils/roadmap.js appends. See that file for why.
    skills: ["Aggregation & Grouping"],
    maxDifficulty: 'Medium',
    outcomes: ['Summarize rows', 'Group categories', 'Filter groups'],
  },
  {
    id: 'joins',
    title: 'Joining Tables',
    level: 'Intermediate',
    summary: 'INNER JOIN, LEFT JOIN, aliases, and unmatched rows.',
    lessonIds: [9],
    roadmapLessonIds: ['joins-inner', 'joins-left'],
    challengeIds: [105, 106, 19, 34],
    // Canonical skills this stage teaches, and the hardest difficulty it may
    // ACQUIRE. Curated ids above are exempt from the ceiling; this bounds only
    // what src/utils/roadmap.js appends. See that file for why.
    skills: ["Joins"],
    maxDifficulty: 'Medium',
    outcomes: ['Connect tables', 'Keep unmatched records', 'Avoid duplicate surprises'],
  },
  {
    id: 'cleanup',
    title: 'Data Cleanup Logic',
    level: 'Intermediate',
    summary: 'NULL handling, calculated columns, CASE WHEN, dates, and text patterns.',
    lessonIds: [],
    roadmapLessonIds: ['cleanup-null-case', 'cleanup-text-dates'],
    challengeIds: [103, 104, 109, 110, 37, 57],
    // Canonical skills this stage teaches, and the hardest difficulty it may
    // ACQUIRE. Curated ids above are exempt from the ceiling; this bounds only
    // what src/utils/roadmap.js appends. See that file for why.
    skills: ["Conditional Logic", "NULL Handling"],
    maxDifficulty: 'Medium',
    outcomes: ['Handle NULL safely', 'Create labels', 'Calculate useful fields'],
  },
  // Two of the nine canonical skills had no stage at all until 2026-09-09, so
  // the recommended path could never route anyone to String or Date work no
  // matter how weak their radar showed it. Both now have a topic page and a
  // full challenge set behind them; these are the stages that reach them.
  // No lessonIds yet — getSqlRoadmapState treats an empty lesson list as a
  // zero-lesson goal, so the stage completes on its first solve.
  {
    id: 'strings',
    // Gated by FEATURE_FLAGS.features.roadmapV2 — with the flag off this
    // stage is filtered out entirely, so nothing renders an empty stage.
    v2Only: true,
    title: 'Working With Text',
    level: 'Intermediate',
    summary: 'SUBSTR, INSTR, REPLACE, TRIM, LIKE patterns, and splitting fields apart.',
    lessonIds: [],
    roadmapLessonIds: [],
    challengeIds: [],
    // Canonical skills this stage teaches, and the hardest difficulty it may
    // ACQUIRE. Curated ids above are exempt from the ceiling; this bounds only
    // what src/utils/roadmap.js appends. See that file for why.
    skills: ["String Functions"],
    maxDifficulty: 'Medium',
    outcomes: ['Pull a field out of a string', 'Normalise messy text', 'Match a shape'],
  },
  {
    id: 'dates',
    // Gated by FEATURE_FLAGS.features.roadmapV2 — with the flag off this
    // stage is filtered out entirely, so nothing renders an empty stage.
    v2Only: true,
    title: 'Dates and Time',
    level: 'Intermediate',
    summary: 'Date parts, ranges, truncation, and answering "per month" honestly.',
    lessonIds: [],
    roadmapLessonIds: [],
    challengeIds: [],
    // Canonical skills this stage teaches, and the hardest difficulty it may
    // ACQUIRE. Curated ids above are exempt from the ceiling; this bounds only
    // what src/utils/roadmap.js appends. See that file for why.
    skills: ["Date Functions"],
    maxDifficulty: 'Medium',
    outcomes: ['Filter a date range', 'Group by month', 'Measure a span'],
  },
  {
    id: 'subqueries',
    title: 'Multi-Step Queries',
    level: 'Intermediate+',
    summary: 'Subqueries, derived tables, EXISTS / IN, and readable query decomposition.',
    lessonIds: [10],
    roadmapLessonIds: ['subqueries-compare', 'subqueries-derived'],
    challengeIds: [108, 115, 31, 33, 35],
    // Canonical skills this stage teaches, and the hardest difficulty it may
    // ACQUIRE. Curated ids above are exempt from the ceiling; this bounds only
    // what src/utils/roadmap.js appends. See that file for why.
    skills: ["Subqueries & CTEs"],
    maxDifficulty: 'Medium',
    outcomes: ['Compare to averages', 'Use query results inside queries', 'Break analysis into steps'],
  },
  {
    id: 'ctes',
    title: 'CTEs and Pipelines',
    level: 'Advanced',
    summary: 'WITH clauses, multi-step analysis, recursive patterns, and reusable stages.',
    lessonIds: [],
    roadmapLessonIds: ['ctes-with', 'ctes-recursive'],
    challengeIds: [111, 43, 44, 79],
    // Canonical skills this stage teaches, and the hardest difficulty it may
    // ACQUIRE. Curated ids above are exempt from the ceiling; this bounds only
    // what src/utils/roadmap.js appends. See that file for why.
    skills: ["Subqueries & CTEs"],
    maxDifficulty: 'Medium',
    outcomes: ['Name intermediate results', 'Build readable pipelines', 'Handle hierarchy problems'],
  },
  {
    id: 'windows',
    title: 'Window Functions',
    level: 'Advanced',
    summary: 'ROW_NUMBER, RANK, LAG, LEAD, running totals, and rolling analysis.',
    lessonIds: [],
    roadmapLessonIds: ['windows-rank', 'windows-compare'],
    challengeIds: [112, 23, 24, 47, 50, 67, 73],
    // Canonical skills this stage teaches, and the hardest difficulty it may
    // ACQUIRE. Curated ids above are exempt from the ceiling; this bounds only
    // what src/utils/roadmap.js appends. See that file for why.
    skills: ["Window Functions"],
    maxDifficulty: 'Medium',
    outcomes: ['Rank within groups', 'Compare neighboring rows', 'Calculate running metrics'],
  },
];

// challengeId → (stageIndex * 1000) + position. First stage wins if an id is
// listed twice (buildCurriculumOrder). Not exported as a plain object because
// every consumer already speaks Map (`makeChallengeComparator`, `planToDate`).
export const SQL_ROADMAP_CHALLENGE_ORDER = buildCurriculumOrder(SQL_ROADMAP_STAGES);
