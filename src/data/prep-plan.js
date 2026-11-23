// /sql-interview-prep-plan/ (C2, 2026-11-22). The G1 GEO read of 2026-11-22
// (docs/reads/geo-2026-11-22.md, panel prompt #13 "2-week SQL interview prep
// plan"): no page on the site answered it; only the Amazon page carried a
// 2-week plan, and the search proxy's top 10 was Exponent, Coursera,
// datadriven.io and LearnSQL. Ledger: "two buyer-question pages: a 2-week
// prep plan and a timed mock".
//
// Rendered by scripts/build-prep-plan-page.mjs to src/sql-interview-prep-plan.html.
// The questions on each skill day are NOT listed here: the generator picks
// them from the live bank (planDays), so the plan follows the bank and the
// learning path's order. tests/prep-plan.test.js pins how they are picked.
//
// Rules this content keeps (CLAUDE.md):
//   - no claim about how often anything is asked, and no company names;
//   - what is free is said with freeTierSentence (src/utils/display-count.js);
//   - the bank's size only through bankCountLabel; no price figure.

import { freeTierSentence } from '../utils/display-count.js';

export const PLAN_SLUG = 'sql-interview-prep-plan';
export const PLAN_PUBLISHED = '2026-11-22';
export const PLAN_TITLE = '2-Week SQL Interview Prep Plan, Day by Day | SQLQuest.app';
export const PLAN_H1 = 'A 2-week SQL interview prep plan, day by day';
export const PLAN_DESCRIPTION = 'A 2-week SQL interview prep plan: one of the nine SQL skills a day, Easy to Hard questions linked for each, a readiness test first and a timed mock near the end.';
export const PLAN_APP_SRC = 'prep-plan';

/** Where to read more on a skill: its topic page (Querying Basics has none; /sql-exercises/ lists it by topic). */
export const SKILL_TOPIC_PAGE = {
  'Querying Basics': '/sql-exercises/',
  'Aggregation & Grouping': '/challenges/aggregation/',
  'Joins': '/challenges/joins/',
  'Conditional Logic': '/challenges/case-when/',
  'NULL Handling': '/challenges/null-handling/',
  'String Functions': '/challenges/string-functions/',
  'Date Functions': '/challenges/date-functions/',
  'Subqueries & CTEs': '/challenges/subqueries/',
  'Window Functions': '/challenges/window-functions/',
};

/** One line per skill day: what the day is for. Plain description, no rates. */
export const SKILL_FOCUS = {
  'Querying Basics': 'SELECT, WHERE, ORDER BY and LIMIT, until reading a table and filtering it takes no thought. Every other day builds on this one.',
  'Aggregation & Grouping': 'COUNT, SUM and AVG per group, and HAVING to filter the groups. Say the grain of the result (one row per what?) before you write it.',
  'Joins': 'INNER and LEFT JOIN, and what happens to the rows that have no match. Count the rows before and after each join.',
  'Conditional Logic': 'CASE WHEN to label, bucket and pivot rows. The first branch that matches wins, and a CASE with no ELSE returns NULL.',
  'NULL Handling': 'IS NULL, COALESCE, and what NULL does to a comparison, a count and an average.',
  'String Functions': 'Cleaning and matching text: TRIM, LOWER, SUBSTR, LIKE, and joining text with ||.',
  'Date Functions': 'Truncating to a month, the days between two dates, and ranges that include their last day.',
  'Subqueries & CTEs': 'A value from a subquery, a filter from one, and a long query broken into named CTE steps.',
  'Window Functions': 'ROW_NUMBER, RANK, running totals and LAG: a value per row computed over a group, without collapsing the rows.',
};

/** Days after the nine skill days. `kind` tells the generator what to link; {traps} and {readiness} are
 * the number of trap pages and readiness questions, filled in by the generator. */
export const CLOSING_DAYS = [
  { kind: 'traps', h: 'The {traps} SQL traps',
    p: 'Read the {traps} trap pages. Each one is a query that runs, returns a plausible number and is wrong, with the fix beside it. Run each wrong query in your head before you read why.' },
  { kind: 'coach', h: 'Your two weakest skills',
    p: 'Open the Coach. Its Skillmap now has nine days of your solves behind it; spend the day on the two lowest skills, on the questions the Coach picks next.' },
  { kind: 'mock', h: 'A timed mock interview',
    p: 'Sit one mock as if it were the screen: one clock, no other tabs, no hints. The SQL Fundamentals Assessment is free; a Pro mock matches a role or a company.' },
  { kind: 'review', h: 'Review the mock',
    p: 'Read the one-sentence diagnosis under each wrong answer, then retry only the questions you missed. Re-solve any plan question you could not finish.' },
  { kind: 'retest', h: 'Retake the readiness test, then rest',
    p: 'Take the {readiness} questions again and compare the Skillmap with day 0. Stop there: the day before the interview is for sleep, not a new topic.' },
];

/** The FAQ, visible and JSON-LD alike. A function: the free-tier answer is said by freeTierSentence. */
export const planFaq = ({ bankCount }) => [
  ['Is two weeks enough to prepare for a SQL interview?',
    'Two weeks is enough to work through the nine skills an interview draws on once each, practise the traps and sit a timed mock. It is not enough to learn SQL from zero; if day 1 feels new, start with the lessons in the app and stretch the plan.'],
  ['How long does each day take?',
    'A skill day is three questions, Easy, Medium and Hard. Give each question up to twenty minutes before you open a hint, so a day fits in an evening.'],
  ['What if I already know some of these skills?',
    'Take the readiness test on day 0. It scores you per skill; on a day whose skill you already pass, solve only the Hard question and spend the rest of the hour on your weakest skill.'],
  ['Which parts of the plan are free?',
    `The readiness test, the trap pages and the question pages are free to read. In the app: ${freeTierSentence(bankCount)} The Coach, the Skillmap and the SQL Fundamentals mock are free too; the other mocks are Pro.`],
  ['Which SQL dialect does the plan use?',
    'The questions run on SQLite in your browser. Joins, GROUP BY, CTEs and window functions are written the same way in PostgreSQL, MySQL and Snowflake, and each challenge in the app lists the functions that differ, dates first.'],
];
