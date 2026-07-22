// SQL Quest — Coach goal registry
// Each goal is a hand-crafted curriculum the deterministic progress engine
// walks. The engine reads `curriculum` in order and emits the next step the
// user hasn't completed yet. `skipIf` clauses drive adaptivity: a step with
// `skipIf: { skill: 'Querying Basics', gte: 70 }` is auto-completed if the
// user's radar already shows 70+ on that skill.
//
// Phase 2 (shipped):
//   - ONE goal (SQL Fundamentals Mastery)
//   - Step types: lesson, challenge, drill, mastery_check, retrieval_check
//
// Step type schemas:
//   lesson:            { id, type: 'lesson', lessonId }                                    // opens Socratic lesson
//   challenge:         { id, type: 'challenge', challengeId }                              // deep-links to Practice
//   drill:             { id, type: 'drill', skill }                                        // fires existing skill drill
//   mastery_check:     { id, type: 'mastery_check', skill, minSolves, minDifficulty? }    // gate on post-start solves
//   retrieval_check:   { id, type: 'retrieval_check', sourceLessonId, skill?,             // gate on lesson-+N-days later re-solve
//                        minDaysSince?, challengeId? }
//
// Any step can include `skipIf: { skill, gte }` for radar-driven skipping.
//
// Spec of record: docs/superpowers/specs/2026-04-16-ai-tutor-coach-design.md

window.coachGoals = [
  {
    id: 'fundamentals',
    name: 'SQL Fundamentals Mastery',
    tagline: 'Rock-solid foundation across the 10 core SQL skills',
    estimatedHours: 15,
    emoji: '📚',
    skillsTargeted: [
      'Querying Basics', 'Aggregation & Grouping',
      'Joins', 'Subqueries & CTEs', 'Conditional Logic',
    ],
    // Ordered curriculum. Authors: when renumbering step ids, prefer adding new
    // ids over in-place renames — renames lose progress for in-flight users.
    // Curriculum notes: practice challenges get skipIf too (Phase 3). After
    // the placement check calibrates the radar, strong users skip straight
    // to the weak-skill drills + mastery gates instead of grinding through
    // Easy practice they've already mastered. Thresholds are softer than
    // lesson skipIfs (gte 60) — a placement-calibrated 60 means "you can
    // write this without a reference," which is enough to skip Easy practice.
    curriculum: [
      // SELECT Basics arc
      { id: 'f-1',  type: 'lesson',    lessonId: 2,                 skipIf: { skill: 'Querying Basics', gte: 70 } },  // "SELECT Statement"
      { id: 'f-2',  type: 'challenge', challengeId: 91,             skipIf: { skill: 'Querying Basics', gte: 60 } },   // "Your First Query" (beginner)
      { id: 'f-3',  type: 'challenge', challengeId: 92,             skipIf: { skill: 'Querying Basics', gte: 60 } },   // "Pick Your Columns"

      // Filter & Sort arc
      { id: 'f-4',  type: 'lesson',    lessonId: 3,                 skipIf: { skill: 'Querying Basics', gte: 70 } },  // "Filtering with WHERE"
      { id: 'f-5',  type: 'challenge', challengeId: 93,             skipIf: { skill: 'Querying Basics', gte: 60 } },   // "Filter with WHERE"
      { id: 'f-6',  type: 'lesson',    lessonId: 5,                 skipIf: { skill: 'Querying Basics', gte: 70 } },  // "Sorting Results"
      { id: 'f-7',  type: 'challenge', challengeId: 97,             skipIf: { skill: 'Querying Basics', gte: 60 } },   // "Sorting and Limiting"
      { id: 'f-8',  type: 'drill',     skill: 'Querying Basics',      skipIf: { skill: 'Querying Basics', gte: 75 } },

      // Aggregation + GROUP BY arc
      { id: 'f-9',  type: 'lesson',    lessonId: 6,                 skipIf: { skill: 'Aggregation & Grouping', gte: 70 } },     // "Aggregate Functions"
      { id: 'f-10', type: 'challenge', challengeId: 98,             skipIf: { skill: 'Aggregation & Grouping', gte: 60 } },     // "Counting Rows"
      { id: 'f-11', type: 'challenge', challengeId: 99,             skipIf: { skill: 'Aggregation & Grouping', gte: 60 } },     // "SUM, AVG, MIN, MAX"
      { id: 'f-12', type: 'lesson',    lessonId: 7,                 skipIf: { skill: 'Aggregation & Grouping', gte: 70 } },        // "GROUP BY"
      { id: 'f-13', type: 'challenge', challengeId: 100,            skipIf: { skill: 'Aggregation & Grouping', gte: 60 } },        // "GROUP BY Basics"
      { id: 'f-14', type: 'lesson',    lessonId: 8,                 skipIf: { skill: 'Aggregation & Grouping', gte: 70 } },        // "HAVING Clause"
      { id: 'f-15', type: 'challenge', challengeId: 108,            skipIf: { skill: 'Aggregation & Grouping', gte: 70 } },        // "GROUP BY + HAVING"
      { id: 'f-16', type: 'drill',     skill: 'Aggregation & Grouping',           skipIf: { skill: 'Aggregation & Grouping', gte: 75 } },

      // JOIN arc
      { id: 'f-17', type: 'lesson',    lessonId: 9,                 skipIf: { skill: 'Joins', gte: 70 } },     // "JOIN Basics"
      { id: 'f-18', type: 'challenge', challengeId: 106,            skipIf: { skill: 'Joins', gte: 60 } },     // "Your First JOIN"
      { id: 'f-19', type: 'challenge', challengeId: 107,            skipIf: { skill: 'Joins', gte: 70 } },     // "LEFT JOIN: Keep Everyone"
      { id: 'f-20', type: 'drill',     skill: 'Joins',        skipIf: { skill: 'Joins', gte: 75 } },

      // CASE + Subqueries arc (Advanced Queries lesson covers both)
      { id: 'f-21', type: 'lesson',    lessonId: 10,                skipIf: { skill: 'Conditional Logic', gte: 70 } }, // "Advanced Queries"
      { id: 'f-22', type: 'challenge', challengeId: 110,            skipIf: { skill: 'Conditional Logic', gte: 60 } }, // "Introduction to CASE WHEN"
      { id: 'f-23', type: 'challenge', challengeId: 109,            skipIf: { skill: 'Subqueries & CTEs', gte: 60 } },      // "Simple Subquery: Above Average"

      // Capstone drill
      { id: 'f-24', type: 'drill',     skill: 'Aggregation & Grouping' },

      // Phase 2 gates — produce-not-recognize. Mastery checks require fresh
      // post-start solves on core skills; retrieval check forces a spaced
      // re-engagement with GROUP BY a day after the lesson.
      { id: 'f-25', type: 'mastery_check',   skill: 'Aggregation & Grouping',    minSolves: 3, minDifficulty: 'Medium' },
      { id: 'f-26', type: 'retrieval_check', sourceLessonId: 7,    skill: 'Aggregation & Grouping', minDaysSince: 1 },
      { id: 'f-27', type: 'mastery_check',   skill: 'Joins', minSolves: 2, minDifficulty: 'Medium' },
    ],
    // Exit criteria: all targeted skills at intermediate (50+) plus modest
    // challenge volume. Phase 2 will add mastery_check requirements for
    // "produce cold" gating per the Produce-Not-Recognize thesis.
    exitCriteria: {
      skillThresholds: {
        'Querying Basics': 50,
        'Aggregation & Grouping': 50,
        'Joins': 50,
        'Subqueries & CTEs': 45,
        'Conditional Logic': 45,
      },
      challengesSolved: { Easy: 5, Medium: 2 },
    },
  },

  // ── Analyst Day-One ────────────────────────────────────────────
  // The goal for someone who just got the data-analyst job and needs
  // to survive their first week. The curriculum skips the syntax
  // basics (skipIf gated) and drills the patterns real analyst work
  // actually uses: basic reporting, NULL handling, pivots with CASE,
  // top-N per group, rolling metrics (cumsum, moving average, YoY),
  // retention, cohort analysis, sessionization. Exit criteria demand
  // intermediate-to-strong radar on the skills that show up daily:
  // Window Functions, JOINs, GROUP BY.
  {
    id: 'analyst-day-one',
    name: 'Analyst Day-One',
    tagline: "Survive your first week on the job. Real analyst patterns, not textbook exercises.",
    estimatedHours: 20,
    emoji: '💼',
    skillsTargeted: [
      'Aggregation & Grouping', 'Joins', 'Window Functions',
      'Conditional Logic', 'Date Functions', 'Subqueries & CTEs',
    ],
    curriculum: [
      // Phase A — Reporting basics (assumed known, skip-if gated for experienced analysts)
      { id: 'd1-1',  type: 'lesson',    lessonId: 7,  skipIf: { skill: 'Aggregation & Grouping', gte: 60 } },     // GROUP BY refresher
      { id: 'd1-2',  type: 'lesson',    lessonId: 8,  skipIf: { skill: 'Aggregation & Grouping', gte: 60 } },     // HAVING
      { id: 'd1-3',  type: 'challenge', challengeId: 6 },   // "Full Survival Dashboard by Class" — daily reporting shape

      // Phase B — JOINs + NULL handling (where real analyst queries break)
      { id: 'd1-4',  type: 'lesson',    lessonId: 9,  skipIf: { skill: 'Joins', gte: 60 } },
      { id: 'd1-5',  type: 'challenge', challengeId: 19 },  // "Customers Who Never Ordered" — LEFT JOIN + IS NULL
      { id: 'd1-6',  type: 'challenge', challengeId: 34 },  // "LEFT JOIN NULL Semantics: Inactive Customers"
      { id: 'd1-7',  type: 'challenge', challengeId: 25 },  // "Fare Imputation Analysis" — COALESCE, NULL
      { id: 'd1-8',  type: 'drill',     skill: 'Joins' },

      // Phase C — Pivots + CASE (Tableau/Looker queries live here)
      { id: 'd1-9',  type: 'lesson',    lessonId: 10, skipIf: { skill: 'Conditional Logic', gte: 60 } },
      { id: 'd1-10', type: 'challenge', challengeId: 14 },  // "Pivot: Order Status by Country"
      { id: 'd1-11', type: 'challenge', challengeId: 7 },   // "Genre Financial Report" — CASE + HAVING

      // Phase D — Top-N per group (the most-asked pattern in analyst interviews)
      { id: 'd1-12', type: 'challenge', challengeId: 20 },  // "Top Spender Per Country"
      { id: 'd1-13', type: 'challenge', challengeId: 23 },  // "Salary Rank Within Department"
      { id: 'd1-14', type: 'challenge', challengeId: 29 },  // "Nth Highest Salary per Department"
      { id: 'd1-15', type: 'mastery_check', skill: 'Window Functions', minSolves: 2, minDifficulty: 'Hard' },

      // Phase E — Time-series patterns (every dashboard has these)
      { id: 'd1-16', type: 'challenge', challengeId: 24 },  // "Running Total Revenue"
      { id: 'd1-17', type: 'challenge', challengeId: 22 },  // "Moving Average with Dynamic Window"
      { id: 'd1-18', type: 'challenge', challengeId: 30 },  // "Year-over-Year Growth"
      { id: 'd1-19', type: 'drill',     skill: 'Window Functions' },

      // Phase F — Retention, cohorts, sessionization (the "hard analyst" tier)
      { id: 'd1-20', type: 'challenge', challengeId: 26 },  // "Detect Repeat Buyers Within 7 Days"
      { id: 'd1-21', type: 'challenge', challengeId: 11 },  // "Cumulative Distinct Customers Over Time"
      { id: 'd1-22', type: 'challenge', challengeId: 9 },   // "Order Sessionization by Customer"

      // Phase G — Capstone gates (produce cold after spaced practice)
      { id: 'd1-23', type: 'mastery_check',   skill: 'Window Functions', minSolves: 3, minDifficulty: 'Hard' },
      { id: 'd1-24', type: 'retrieval_check', sourceLessonId: 10,        skill: 'Conditional Logic', minDaysSince: 1 },
      { id: 'd1-25', type: 'mastery_check',   skill: 'Joins',      minSolves: 2, minDifficulty: 'Medium' },
    ],
    exitCriteria: {
      skillThresholds: {
        'Aggregation & Grouping': 65,
        'Joins': 60,
        'Window Functions': 55,
        'Conditional Logic': 55,
        'Subqueries & CTEs': 50,
      },
      challengesSolved: { Medium: 5, Hard: 3 },
    },
  },

  // ── SQL Interview Prep ─────────────────────────────────────────
  // Built from a real request. Our first annual subscriber wrote in prepping
  // for an Amazon BIE loop and a Capital One analytics role, asked which Hard
  // sets to run for CTEs / JOINs / window functions — and the Coach had no
  // answer, because interview prep was in the marketing copy but not in this
  // registry. This is that curriculum, made adaptive.
  //
  // Design note, learned from his account: he had 24 solves, all Easy and
  // Medium, and exactly ONE window-function solve. People asking for "the
  // Hard sets" are usually standing at the entrance of the skill, not
  // halfway up. Dropping them into a multi-CTE pipeline means fighting four
  // patterns at once and concluding they're bad at SQL. So Phase A is three
  // Mediums that every Hard step below assumes — skipIf'd at 55 so anyone
  // who genuinely is past them never sees them.
  //
  // Ordering within each ladder is deliberate: one new idea per rung.
  {
    id: 'interview-prep',
    name: 'SQL Interview Prep',
    tagline: 'The Hard patterns FAANG and fintech loops actually ask — drilled until you can produce them cold.',
    estimatedHours: 25,
    emoji: '🎯',
    skillsTargeted: [
      'Window Functions', 'Joins', 'Subqueries & CTEs',
      'Aggregation & Grouping', 'Conditional Logic', 'Date Functions',
    ],
    curriculum: [
      // Phase A — the rungs the Hard bank silently assumes
      { id: 'iv-1',  type: 'challenge', challengeId: 114, skipIf: { skill: 'Joins', gte: 55 } },              // Self-Join: Employee and Manager
      { id: 'iv-2',  type: 'challenge', challengeId: 115, skipIf: { skill: 'Subqueries & CTEs', gte: 55 } },  // Subquery in FROM (Derived Table)
      { id: 'iv-3',  type: 'challenge', challengeId: 163, skipIf: { skill: 'Window Functions', gte: 55 } },   // Second-Highest Earner (ROW_NUMBER)
      { id: 'iv-4',  type: 'lesson',    lessonId: 10,     skipIf: { skill: 'Conditional Logic', gte: 60 } },  // Advanced Queries (CASE + subqueries)

      // Phase B — Window functions. Highest-leverage area in every data loop:
      // rank-within-group, running totals and period-over-period are asked in
      // some form in almost all of them.
      { id: 'iv-5',  type: 'challenge', challengeId: 23 },  // Salary Rank Within Department — the base shape
      { id: 'iv-6',  type: 'challenge', challengeId: 47 },  // Lead-Lag Gap — LAG/LEAD
      { id: 'iv-7',  type: 'challenge', challengeId: 71 },  // Top-N per Category — the single most-asked pattern
      { id: 'iv-8',  type: 'challenge', challengeId: 50 },  // 7-Day Rolling Average — frame clauses
      { id: 'iv-9',  type: 'challenge', challengeId: 84 },  // Month-over-Month Growth — LAG + dates
      { id: 'iv-10', type: 'challenge', challengeId: 73 },  // Dedup with ROW_NUMBER — the practical one
      { id: 'iv-11', type: 'drill',     skill: 'Window Functions' },
      { id: 'iv-12', type: 'mastery_check', skill: 'Window Functions', minSolves: 3, minDifficulty: 'Hard' },

      // Phase C — JOINs beyond the inner join. Anti-joins and non-equi joins
      // are where candidates who "know JOINs" come apart.
      { id: 'iv-13', type: 'challenge', challengeId: 17 },  // Earning More Than Manager — self-join
      { id: 'iv-14', type: 'challenge', challengeId: 74 },  // Anti-Join Pipeline — LEFT JOIN + IS NULL
      { id: 'iv-15', type: 'challenge', challengeId: 21 },  // Similar Salaries — non-equi join
      { id: 'iv-16', type: 'challenge', challengeId: 79 },  // CLV Pipeline — multi-join + NTILE segmentation
      { id: 'iv-17', type: 'drill',     skill: 'Joins' },
      { id: 'iv-18', type: 'mastery_check', skill: 'Joins', minSolves: 2, minDifficulty: 'Hard' },

      // Phase D — CTEs, single → multi → recursive
      { id: 'iv-19', type: 'challenge', challengeId: 76 },  // Department Budget — one clean CTE
      { id: 'iv-20', type: 'challenge', challengeId: 86 },  // Multi-CTE Revenue Pipeline
      { id: 'iv-21', type: 'challenge', challengeId: 88 },  // Customer Retention Cohort — close to a real Amazon ask
      { id: 'iv-22', type: 'challenge', challengeId: 81 },  // Recursive Org Chart Traversal
      { id: 'iv-23', type: 'mastery_check', skill: 'Subqueries & CTEs', minSolves: 2, minDifficulty: 'Hard' },

      // Phase E — signature patterns. Each has a recognisable name in loops;
      // knowing the name is half of answering fast.
      { id: 'iv-24', type: 'challenge', challengeId: 13 },  // Cumulative Revenue Share (Pareto)
      { id: 'iv-25', type: 'challenge', challengeId: 9 },   // Order Sessionization
      { id: 'iv-26', type: 'challenge', challengeId: 68 },  // Engagement Streaks — gaps and islands
      { id: 'iv-27', type: 'challenge', challengeId: 72 },  // Median Without PERCENTILE — the classic trick

      // Phase F — spaced retrieval. Two days after the concepts land, produce
      // cold. Safe to gate on lesson 10 even though iv-4 is skippable: the
      // engine treats a radar-skipped source lesson as the learning event.
      { id: 'iv-28', type: 'retrieval_check', sourceLessonId: 10, skill: 'Conditional Logic', minDaysSince: 2 },
    ],
    // Deliberately harder than analyst-day-one, and gated on Hard volume:
    // interview readiness is about producing under pressure, not coverage.
    exitCriteria: {
      skillThresholds: {
        'Window Functions': 70,
        'Joins': 65,
        'Subqueries & CTEs': 60,
      },
      challengesSolved: { Medium: 3, Hard: 8 },
    },
  },
];
