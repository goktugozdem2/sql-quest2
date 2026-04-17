// SQL Quest — Coach goal registry
// Each goal is a hand-crafted curriculum the deterministic progress engine
// walks. The engine reads `curriculum` in order and emits the next step the
// user hasn't completed yet. `skipIf` clauses drive adaptivity: a step with
// `skipIf: { skill: 'SELECT Basics', gte: 70 }` is auto-completed if the
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
      'SELECT Basics', 'Filter & Sort', 'Aggregation', 'GROUP BY',
      'JOIN Tables', 'Subqueries', 'CASE Statements',
    ],
    // Ordered curriculum. Authors: when renumbering step ids, prefer adding new
    // ids over in-place renames — renames lose progress for in-flight users.
    curriculum: [
      // SELECT Basics arc
      { id: 'f-1',  type: 'lesson',    lessonId: 2,                 skipIf: { skill: 'SELECT Basics', gte: 70 } },  // "SELECT Statement"
      { id: 'f-2',  type: 'challenge', challengeId: 91 },   // "Your First Query" (beginner)
      { id: 'f-3',  type: 'challenge', challengeId: 92 },   // "Pick Your Columns"

      // Filter & Sort arc
      { id: 'f-4',  type: 'lesson',    lessonId: 3,                 skipIf: { skill: 'Filter & Sort', gte: 70 } },  // "Filtering with WHERE"
      { id: 'f-5',  type: 'challenge', challengeId: 93 },   // "Filter with WHERE"
      { id: 'f-6',  type: 'lesson',    lessonId: 5,                 skipIf: { skill: 'Filter & Sort', gte: 70 } },  // "Sorting Results"
      { id: 'f-7',  type: 'challenge', challengeId: 97 },   // "Sorting and Limiting"
      { id: 'f-8',  type: 'drill',     skill: 'Filter & Sort' },

      // Aggregation + GROUP BY arc
      { id: 'f-9',  type: 'lesson',    lessonId: 6,                 skipIf: { skill: 'Aggregation', gte: 70 } },     // "Aggregate Functions"
      { id: 'f-10', type: 'challenge', challengeId: 98 },   // "Counting Rows"
      { id: 'f-11', type: 'challenge', challengeId: 99 },   // "SUM, AVG, MIN, MAX"
      { id: 'f-12', type: 'lesson',    lessonId: 7,                 skipIf: { skill: 'GROUP BY', gte: 70 } },        // "GROUP BY"
      { id: 'f-13', type: 'challenge', challengeId: 100 },  // "GROUP BY Basics"
      { id: 'f-14', type: 'lesson',    lessonId: 8,                 skipIf: { skill: 'GROUP BY', gte: 70 } },        // "HAVING Clause"
      { id: 'f-15', type: 'challenge', challengeId: 108 },  // "GROUP BY + HAVING"
      { id: 'f-16', type: 'drill',     skill: 'GROUP BY' },

      // JOIN arc
      { id: 'f-17', type: 'lesson',    lessonId: 9,                 skipIf: { skill: 'JOIN Tables', gte: 70 } },     // "JOIN Basics"
      { id: 'f-18', type: 'challenge', challengeId: 106 },  // "Your First JOIN"
      { id: 'f-19', type: 'challenge', challengeId: 107 },  // "LEFT JOIN: Keep Everyone"
      { id: 'f-20', type: 'drill',     skill: 'JOIN Tables' },

      // CASE + Subqueries arc (Advanced Queries lesson covers both)
      { id: 'f-21', type: 'lesson',    lessonId: 10,                skipIf: { skill: 'CASE Statements', gte: 70 } }, // "Advanced Queries"
      { id: 'f-22', type: 'challenge', challengeId: 110 },  // "Introduction to CASE WHEN"
      { id: 'f-23', type: 'challenge', challengeId: 109 },  // "Simple Subquery: Above Average"

      // Capstone drill
      { id: 'f-24', type: 'drill',     skill: 'Aggregation' },

      // Phase 2 gates — produce-not-recognize. Mastery checks require fresh
      // post-start solves on core skills; retrieval check forces a spaced
      // re-engagement with GROUP BY a day after the lesson.
      { id: 'f-25', type: 'mastery_check',   skill: 'GROUP BY',    minSolves: 3, minDifficulty: 'Medium' },
      { id: 'f-26', type: 'retrieval_check', sourceLessonId: 7,    skill: 'GROUP BY', minDaysSince: 1 },
      { id: 'f-27', type: 'mastery_check',   skill: 'JOIN Tables', minSolves: 2, minDifficulty: 'Medium' },
    ],
    // Exit criteria: all targeted skills at intermediate (50+) plus modest
    // challenge volume. Phase 2 will add mastery_check requirements for
    // "produce cold" gating per the Produce-Not-Recognize thesis.
    exitCriteria: {
      skillThresholds: {
        'SELECT Basics': 50,
        'Filter & Sort': 50,
        'Aggregation': 50,
        'GROUP BY': 50,
        'JOIN Tables': 50,
        'Subqueries': 45,
        'CASE Statements': 45,
      },
      challengesSolved: { Easy: 5, Medium: 2 },
    },
  },
];
