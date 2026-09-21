// The readiness check — ten recognition questions across the Skillmap, and
// the arithmetic that turns answers into a per-skill score, an overall score
// weighted by a company's tagged-set skill mix, and the weakest skill.
//
// ONE module, TWO readers (2026-09-17, the founder's directive: ask the goal,
// measure where the person is ON THAT GOAL, show it honestly, plan it):
//   - scripts/build-readiness-test.mjs inlines QUESTIONS into the public
//     /sql-interview-readiness-test/ page, whose own script scores the answers
//     with the formula below — the page is byte-identical to what it was
//     before this module existed (tests/company-template.test.js binds the
//     committed page to the generator);
//   - src/app.jsx asks the same ten questions in the app, right after the
//     onboarding intake (behind `goalMeasure`), and scores them with
//     `scoreReadiness` — the same numbers the page would have produced.
//
// The weights are a company's tagged-set composition: for each skill the
// check covers, the share of that company's tagged challenges that resolve
// to it (`companySkillWeights`). It is a weighting of OUR set, not a
// measurement of the company's interview, and every surface that shows the
// number says so. Never a pass prediction — tests/interview-prep.test.js
// keeps the prediction words out of the copy on every surface.
//
// This is NOT in scripts/data-files.js (the concatenated window-global data
// bundle) — it is an ES module, imported.

import { SKILL_TO_RADAR, mapTopicToSkill } from '../utils/skill-calc.js';

// Ten questions. Every answer was worked by hand against the SQL shown; the
// explanations say why, so a wrong answer still teaches the point.
export const QUESTIONS = [
  {
    skill: 'Joins',
    q: 'customers has 3 rows (Ana, Ben, Cy). orders has 3 rows: two for Ana, one for Ben, none for Cy. What does this return?',
    sql: 'SELECT c.name, COUNT(o.id) AS orders\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nGROUP BY c.name;',
    options: ['3 rows — Cy has 0', '2 rows — Cy is missing', '3 rows — Cy has 1', '3 rows — Cy has NULL'],
    answer: 0,
    why: 'The LEFT JOIN keeps Cy with NULLs on the orders side, and COUNT(o.id) skips NULLs, so Cy counts 0. COUNT(*) would have said 1.',
  },
  {
    skill: 'Joins',
    q: 'orders: (1, amount 100), (2, amount 50). order_items: two items for order 1, one for order 2. What is the result?',
    sql: 'SELECT SUM(o.amount)\nFROM orders o\nJOIN order_items i ON i.order_id = o.id;',
    options: ['150', '250', '300', 'An error'],
    answer: 1,
    why: 'The join repeats order 1 once per item, so its 100 is summed twice: 100 + 100 + 50 = 250. This fan-out is a classic wrong answer in analytics rounds; aggregate before joining.',
  },
  {
    skill: 'Window Functions',
    q: 'You need each employee\'s salary rank within their department. Ties share a rank and the next rank has no gap. Which expression?',
    sql: null,
    options: ['DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC)', 'RANK() OVER (ORDER BY salary DESC)', 'ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC)', 'DENSE_RANK() OVER (ORDER BY dept, salary DESC)'],
    answer: 0,
    why: 'PARTITION BY restarts the ranking per department; DENSE_RANK gives ties the same rank without gaps. RANK leaves gaps, ROW_NUMBER breaks ties arbitrarily, and the last option ranks across all departments.',
  },
  {
    skill: 'Window Functions',
    q: 'daily_sales(day, revenue). Which expression gives each day\'s change versus the previous day?',
    sql: null,
    options: ['revenue - LAG(revenue) OVER (ORDER BY day)', 'revenue - LEAD(revenue) OVER (ORDER BY day)', 'revenue - MAX(revenue) OVER (ORDER BY day)', 'SUM(revenue) OVER (ORDER BY day) - revenue'],
    answer: 0,
    why: 'LAG looks one row back in the window order. LEAD looks forward, the MAX version compares with the running maximum, and the last one is the running total of the days before. The first day comes back NULL — say so in an interview.',
  },
  {
    skill: 'Aggregation & Grouping',
    q: 'Which query returns departments with more than 5 employees?',
    sql: null,
    options: ['SELECT dept FROM employees GROUP BY dept HAVING COUNT(*) > 5', 'SELECT dept FROM employees WHERE COUNT(*) > 5 GROUP BY dept', 'SELECT dept, COUNT(*) > 5 FROM employees GROUP BY dept', 'SELECT dept FROM employees GROUP BY dept WHERE COUNT(*) > 5'],
    answer: 0,
    why: 'WHERE filters rows before grouping, so it cannot see COUNT(*). HAVING filters the groups after they are formed. The third option returns every department with a true/false column.',
  },
  {
    skill: 'Aggregation & Grouping',
    q: 'payments has three rows: (user 1, 10), (user 1, NULL), (user 2, 20). What does this return?',
    sql: 'SELECT COUNT(*), COUNT(amount), AVG(amount)\nFROM payments;',
    options: ['3, 3, 10', '3, 2, 10', '3, 2, 15', '2, 2, 15'],
    answer: 2,
    why: 'COUNT(*) counts rows (3); COUNT(amount) and AVG(amount) ignore the NULL, so the average is (10 + 20) / 2 = 15, not 30 / 3.',
  },
  {
    skill: 'Subqueries & CTEs',
    q: 'Find customers whose total spend is above the average customer\'s total spend. Which query is correct?',
    sql: null,
    options: [
      'WITH t AS (SELECT customer_id, SUM(amount) AS total FROM orders GROUP BY customer_id) SELECT customer_id FROM t WHERE total > (SELECT AVG(total) FROM t)',
      'SELECT customer_id FROM orders GROUP BY customer_id HAVING SUM(amount) > AVG(amount)',
      'SELECT customer_id FROM orders WHERE SUM(amount) > AVG(amount) GROUP BY customer_id',
      'SELECT customer_id, AVG(SUM(amount)) FROM orders GROUP BY customer_id',
    ],
    answer: 0,
    why: 'The average has to be taken over per-customer totals, so the totals are computed first (the CTE) and averaged second. The HAVING version compares a customer\'s total with their own average order, and nesting aggregates is not allowed.',
  },
  {
    skill: 'NULL Handling',
    q: 'users.referrer_id holds 5, 7, NULL and NULL. What does this return?',
    sql: 'SELECT COUNT(*) FROM users\nWHERE referrer_id <> 5;',
    options: ['1', '2', '3', '4'],
    answer: 0,
    why: 'NULL <> 5 is unknown, not true, so both NULL rows are filtered out; only the 7 survives. To keep them: WHERE referrer_id <> 5 OR referrer_id IS NULL.',
  },
  {
    skill: 'Date Functions',
    q: 'orders.created_at is a TIMESTAMP. Which filter returns every order placed in March 2026, and nothing else?',
    sql: null,
    options: ["created_at >= '2026-03-01' AND created_at < '2026-04-01'", "created_at BETWEEN '2026-03-01' AND '2026-03-31'", "EXTRACT(MONTH FROM created_at) = 3", "created_at LIKE '2026-03%'"],
    answer: 0,
    why: 'The half-open range includes all of 31 March. BETWEEN stops at midnight on the 31st, the EXTRACT version matches March of every year, and LIKE on a timestamp depends on the dialect\'s text conversion.',
  },
  {
    skill: 'Conditional Logic',
    q: 'In PostgreSQL, which expression gives the share of orders with status \'refunded\' as a decimal?',
    sql: null,
    options: ["AVG(CASE WHEN status = 'refunded' THEN 1.0 ELSE 0 END)", "COUNT(CASE WHEN status = 'refunded' THEN 1 END) / COUNT(*)", "SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) / COUNT(*)", "COUNT(status = 'refunded') / COUNT(*)"],
    answer: 0,
    why: 'Averaging a 1.0/0 flag is the share, as a decimal. The next two divide integers, which truncates to 0 in PostgreSQL, and COUNT(status = \'refunded\') counts every non-NULL comparison, true or false.',
  },
];

/** The skills the ten questions cover, in order of first appearance — the page's own `skills` order. */
export const READINESS_SKILLS = [...new Set(QUESTIONS.map(q => q.skill))];

/** Where the public test and the in-app check both store the result. */
export const READINESS_RECORD_KEY = 'sqlquest_readiness_v1';
/** A result younger than this is shown back instead of asking again (in-app check). */
export const GOAL_MEASURE_FRESH_DAYS = 7;

const resolveSkill = raw => SKILL_TO_RADAR[raw] || SKILL_TO_RADAR[mapTopicToSkill(raw || '')] || null;

/** A challenge's canonical skills — `skills` tags plus `category`, deduped, unresolvable ones dropped. */
export function canonicalSkillsOf(challenge) {
  const c = challenge || {};
  return [...new Set([...(c.skills || []), c.category].filter(Boolean).map(resolveSkill).filter(Boolean))];
}

/** The challenges tagged with a company name (case-insensitive) — the same set `facts()` in build-company-pages.mjs uses. */
export function taggedChallengesFor(tags, challenges, name) {
  if (!name || !tags || typeof tags !== 'object') return [];
  const byId = new Map();
  for (const c of challenges || []) if (c && c.id != null) byId.set(Number(c.id), c);
  const wanted = String(name).toLowerCase();
  return Object.keys(tags)
    .filter(id => (Array.isArray(tags[id]) ? tags[id] : []).some(n => String(n).toLowerCase() === wanted))
    .map(id => byId.get(Number(id)))
    .filter(Boolean);
}

/**
 * A company's skill mix as weights over `skills`: for each skill, the share
 * (0–100, rounded) of the company's tagged challenges that resolve to it.
 * The same numbers the company page shows; `n` is the tagged count.
 * Returns `n: 0` and all-zero weights for a company with no tagged set —
 * callers fall back to equal weights.
 */
export function companySkillWeights({ tags, challenges, name, skills = READINESS_SKILLS } = {}) {
  const tagged = taggedChallengesFor(tags, challenges, name);
  const counts = {};
  for (const c of tagged) {
    for (const k of canonicalSkillsOf(c)) counts[k] = (counts[k] || 0) + 1;
  }
  const weights = {};
  for (const s of skills) weights[s] = tagged.length ? Math.round((100 * (counts[s] || 0)) / tagged.length) : 0;
  return { n: tagged.length, weights };
}

/** Equal weights — what the public page uses with no company picked. */
export function equalWeights(skills = READINESS_SKILLS) {
  return Object.fromEntries(skills.map(s => [s, 1]));
}

/**
 * Score a set of answers exactly as the public page does.
 * `correct` is an array parallel to `questions`: true / false / undefined.
 * Per-skill score = round(100 · right / asked). Overall = the weighted mean
 * over the skills asked (or the plain mean when every weight is 0). Weakest =
 * the lowest score, ties broken by the higher weight, then question order.
 */
export function scoreReadiness(correct, { questions = QUESTIONS, weights = null } = {}) {
  const w = weights && typeof weights === 'object' ? weights : equalWeights([...new Set(questions.map(q => q.skill))]);
  const per = {};
  const answers = Array.isArray(correct) ? correct : [];
  questions.forEach((q, k) => {
    per[q.skill] = per[q.skill] || { right: 0, total: 0 };
    per[q.skill].total++;
    if (answers[k]) per[q.skill].right++;
  });
  const skills = Object.keys(per);
  const score = s => Math.round((100 * per[s].right) / per[s].total);
  let wsum = 0;
  let acc = 0;
  skills.forEach(s => { const x = w[s] || 0; wsum += x; acc += x * score(s); });
  const overall = wsum ? Math.round(acc / wsum) : Math.round(skills.reduce((a, s) => a + score(s), 0) / skills.length);
  const weakest = skills.slice().sort((a, b) => score(a) - score(b) || (w[b] || 0) - (w[a] || 0))[0];
  const scores = Object.fromEntries(skills.map(s => [s, score(s)]));
  const answered = answers.filter(v => v !== undefined && v !== null).length;
  return { overall, weakest, scores, skills, answered };
}

/**
 * Overall and weakest from stored per-skill scores — the same arithmetic as
 * `scoreReadiness`, for a result shown back (re-weighted to the goal's company).
 */
export function summarizeScores(scores, weights = null) {
  const s = scores && typeof scores === 'object' ? scores : {};
  const skills = Object.keys(s).filter(k => Number.isFinite(Number(s[k])));
  if (skills.length === 0) return { overall: 0, weakest: null };
  const w = weights && typeof weights === 'object' ? weights : equalWeights(skills);
  let wsum = 0;
  let acc = 0;
  skills.forEach(k => { const x = w[k] || 0; wsum += x; acc += x * Number(s[k]); });
  const overall = wsum ? Math.round(acc / wsum) : Math.round(skills.reduce((a, k) => a + Number(s[k]), 0) / skills.length);
  const weakest = skills.slice().sort((a, b) => Number(s[a]) - Number(s[b]) || (w[b] || 0) - (w[a] || 0))[0];
  return { overall, weakest };
}

/** The lowest `n` skills with their scores, for "Weakest: Window Functions (0), NULL Handling (50)". */
export function weakestSkills(scores, n = 2, weights = null) {
  const s = scores && typeof scores === 'object' ? scores : {};
  const w = weights && typeof weights === 'object' ? weights : {};
  return Object.keys(s)
    .sort((a, b) => Number(s[a]) - Number(s[b]) || (w[b] || 0) - (w[a] || 0))
    .slice(0, n)
    .map(skill => ({ skill, score: Number(s[skill]) }));
}

/** The record the public page writes — the SAME shape, so `?src=readiness` and the placement hook keep working. */
export function readinessRecordFrom({ company = null, overall, weakest, scores, now = Date.now() } = {}) {
  return {
    at: Number(now),
    company: typeof company === 'string' && company ? company : null,
    overall: Number(overall),
    weakest: typeof weakest === 'string' ? weakest : null,
    scores: { ...(scores || {}) },
  };
}

/**
 * The stored result, or null when there is none, it is malformed, or it is
 * older than `maxAgeDays`. Returns the record plus `ageDays`.
 */
export function readReadinessRecord(storage, { now = Date.now(), maxAgeDays = GOAL_MEASURE_FRESH_DAYS } = {}) {
  let rec;
  try {
    const raw = storage && storage.getItem(READINESS_RECORD_KEY);
    rec = raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
  if (!rec || typeof rec !== 'object') return null;
  const at = Number(rec.at);
  if (!Number.isFinite(at)) return null;
  const overall = Number(rec.overall);
  if (!Number.isFinite(overall)) return null;
  if (!rec.scores || typeof rec.scores !== 'object') return null;
  const ageDays = (Number(now) - at) / 86400000;
  if (!(ageDays >= 0) || ageDays > maxAgeDays) return null;
  return {
    at,
    company: typeof rec.company === 'string' ? rec.company : null,
    overall,
    weakest: typeof rec.weakest === 'string' ? rec.weakest : null,
    scores: { ...rec.scores },
    ageDays: Math.floor(ageDays),
  };
}
