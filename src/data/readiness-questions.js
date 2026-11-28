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
    why: 'The join repeats order 1 once per item, so its 100 is summed twice: 100 + 100 + 50 = 250. That is join fan-out: aggregate before joining, or the totals inflate.',
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

// ── The SQL Interview Health Check (2026-11-25) ─────────────────────────────
//
// Founder, 2026-11-25: the check exists to learn the person's real goal and
// hand back a roadmap that fits it; the score alone is not the product. So:
//   1. GOAL FIRST — what they prepare for (HEALTH_GOALS), the role
//      (READINESS_ROLES), optionally the date or the weeks they have.
//   2. THE ITEMS FOLLOW THE GOAL — `selectQuestions` swaps items of the core
//      ten for the goal and role (a fundamentals item for a first job or
//      general learning; a "find the bug in this AI-written query" item for
//      SQL-with-AI or an AI/ML engineer). Always ten items.
//   3. THE RESULT IS A ROADMAP — `buildHealthRoadmap`: weeks (days when the
//      date is close), each naming the skill to work on and the SQL Quest
//      challenges for it in curriculum order, the topic and trap pages, and a
//      mock at the end of an interview roadmap; Pro items marked as Pro.
//   4. THE NUMBER — a company-weighted readiness number only for a signed
//      archetype company (`isArchetypeSlug`), the rule interview-prep.js keeps;
//      every other company gets the roadmap and the skill picture, with the
//      plain SQL score, never a company score.
//
// The goal maps onto the app's own goal stores: `intent` is the value
// setUserIntent writes and the `?goal=` link door reads; `intakeGoal` is the
// onboarding intake's goal id (and through it the Coach goal); `intakeRole`
// is an INTAKE_ROLES id for userGoals.role. tests/health-check.test.js binds
// all three to src/utils/onboarding-intake.js.
//
// A role MULTIPLIES the base weights (a company's tagged-set shares, or equal
// weights) — it never creates a weight the company's set does not have. The
// leans are our editorial emphasis for the work each role does, not a
// measurement of any interview, and the page says so. No frequency claims.
//
// The functions marked INLINED are copied into the public page with
// Function#toString (scripts/build-readiness-test.mjs), so they stay
// self-contained: no imports, no outer references — everything comes in as
// arguments. tests/health-check.test.js pins that.

export const HEALTH_GOALS = [
  { id: 'interview', label: 'An interview at a specific company', intent: 'interview', intakeGoal: 'interview' },
  { id: 'first-job', label: 'Landing my first data job', intent: 'job_ready', intakeGoal: 'job' },
  { id: 'move-up', label: 'Moving up in a data role', intent: 'job_ready', intakeGoal: 'job' },
  { id: 'ai-sql', label: 'Using SQL with AI tools at work', intent: 'job_ready', intakeGoal: 'job' },
  { id: 'learn', label: 'Learning SQL in general', intent: 'learning', intakeGoal: 'general' },
];

export const READINESS_ROLES = [
  { id: 'data-analyst', code: 'da', label: 'Data analyst', intakeRole: 'analyst', lean: { 'Aggregation & Grouping': 1.5, Joins: 1.25, 'Conditional Logic': 1.25, 'Date Functions': 1.25 } },
  { id: 'analytics-engineer', code: 'ae', label: 'Analytics engineer', intakeRole: 'engineer', lean: { 'Subqueries & CTEs': 1.5, Joins: 1.5, 'Window Functions': 1.25, 'NULL Handling': 1.25 } },
  { id: 'data-engineer', code: 'de', label: 'Data engineer', intakeRole: 'engineer', lean: { Joins: 1.5, 'NULL Handling': 1.5, 'Date Functions': 1.25, 'Subqueries & CTEs': 1.25 } },
  { id: 'data-scientist', code: 'ds', label: 'Data scientist', intakeRole: 'data_scientist', lean: { 'Window Functions': 1.5, 'Aggregation & Grouping': 1.25, 'Subqueries & CTEs': 1.25, 'Conditional Logic': 1.25 } },
  { id: 'ai-ml-engineer', code: 'ai', label: 'AI/ML engineer', intakeRole: 'engineer', lean: { 'NULL Handling': 1.5, Joins: 1.5, 'Aggregation & Grouping': 1.25, 'Subqueries & CTEs': 1.25 } },
];

/**
 * Items outside the core ten, swapped in by goal and role. Each answer was
 * worked by hand and the SQL ones are run in tests/health-check.test.js.
 * `replaces` is the index in QUESTIONS the item takes the place of — chosen
 * so the skill coverage of the remaining nine stays the same.
 */
export const EXTRA_QUESTIONS = [
  {
    id: 'basics-top-n',
    skill: 'Querying Basics',
    replaces: 3, // the LAG item: Window Functions keeps the DENSE_RANK one
    when: { goals: ['first-job', 'learn'] },
    q: 'products(name, price) has no ties on price. Which query returns the three most expensive products?',
    sql: null,
    options: ['SELECT name, price FROM products ORDER BY price DESC LIMIT 3', 'SELECT name, price FROM products ORDER BY price LIMIT 3', 'SELECT name, MAX(price) FROM products LIMIT 3', 'SELECT name, price FROM products WHERE price = MAX(price) LIMIT 3'],
    answer: 0,
    why: 'Sort high to low, then keep three rows. Ascending order returns the cheapest three, MAX(price) collapses the table to one row, and an aggregate cannot sit in WHERE.',
  },
  {
    id: 'debug-ai-left-join',
    skill: 'Joins',
    kind: 'debug',
    replaces: 1, // the fan-out item: Joins keeps two items
    when: { goals: ['ai-sql'], roles: ['ai-ml-engineer'] },
    q: 'An AI assistant wrote this to count each customer\'s paid orders, customers with none included as 0. Customers with no paid orders are missing from the result. Which fix is right?',
    sql: "SELECT c.id, c.name, COUNT(*) AS paid_orders\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nWHERE o.status = 'paid'\nGROUP BY c.id, c.name;",
    options: [
      "Move o.status = 'paid' into the ON clause and count o.id instead of *",
      'Change the LEFT JOIN to an INNER JOIN',
      "Move o.status = 'paid' into the ON clause and keep COUNT(*)",
      'Group by c.name only',
    ],
    answer: 0,
    why: 'A WHERE on the right-hand table drops the NULL rows the LEFT JOIN kept, so it acts as an inner join. In the ON clause the filter keeps every customer, and COUNT(o.id) gives 0 where COUNT(*) would count the NULL row as 1.',
  },
];

/** INLINED. The ten items for a goal and role: the core ten with the matching extras swapped in. */
export function selectQuestions({ goal, role } = {}, core, extras) {
  const out = (core || []).slice();
  for (const x of extras || []) {
    const w = x.when || {};
    const hit = (w.goals || []).indexOf(goal) >= 0 || (w.roles || []).indexOf(role) >= 0;
    if (hit && x.replaces >= 0 && x.replaces < out.length) out[x.replaces] = x;
  }
  return out;
}

/**
 * INLINED. Base weights leaned by a role. An unknown or empty role returns a
 * copy of the base unchanged. A base weight of 0 stays 0.
 */
export function applyRoleWeights(base, roleId, roles) {
  const out = {};
  const b = base && typeof base === 'object' ? base : {};
  const role = (roles || []).find(r => r.id === roleId) || null;
  for (const s of Object.keys(b)) {
    const w = Number(b[s]) || 0;
    const m = role && role.lean[s] ? role.lean[s] : 1;
    out[s] = Math.round(w * m * 100) / 100;
  }
  return out;
}

/** Every skill a share code can carry, in code order: the core seven, then the extras' own. */
export const SHARE_SKILLS = [...READINESS_SKILLS, ...EXTRA_QUESTIONS.map(x => x.skill).filter(s => !READINESS_SKILLS.includes(s))];

/**
 * INLINED. The share code for `?r=`: one character per skill in `skills`
 * order — the score in tens (0–9, `a` = 100, `-` = not asked) — then
 * `_<company slug>` and `_<role code>`, each empty when absent. Scores,
 * company and role only: no answers, no name, no date, no aid.
 */
export function encodeShareCode({ scores, company, role }, skills, roles) {
  const s = scores && typeof scores === 'object' ? scores : {};
  const digits = skills.map(k => {
    if (!(k in s)) return '-';
    const v = Math.max(0, Math.min(100, Math.round((Number(s[k]) || 0) / 10) * 10));
    return v === 100 ? 'a' : String(v / 10);
  }).join('');
  const co = typeof company === 'string' && /^[a-z0-9-]{1,40}$/.test(company) ? company : '';
  const r = (roles || []).find(x => x.id === role);
  return digits + '_' + co + '_' + (r ? r.code : '');
}

/**
 * INLINED. Decode `?r=`; null for anything malformed. The company is kept
 * only when `knownCompanies` (keyed by slug) has it; an unknown role code is
 * dropped; scores are 0–100 by construction.
 */
export function decodeShareCode(raw, skills, roles, knownCompanies) {
  if (typeof raw !== 'string' || raw.length > 80) return null;
  const parts = raw.split('_');
  if (parts.length !== 3) return null;
  const digits = parts[0];
  const co = parts[1];
  const rc = parts[2];
  if (digits.length !== skills.length || !/^[0-9a-]+$/.test(digits) || !/[0-9a]/.test(digits)) return null;
  const scores = {};
  skills.forEach((k, i) => { if (digits[i] !== '-') scores[k] = digits[i] === 'a' ? 100 : Number(digits[i]) * 10; });
  const company = /^[a-z0-9-]{1,40}$/.test(co) && knownCompanies && Object.prototype.hasOwnProperty.call(knownCompanies, co) ? co : null;
  const r = (roles || []).find(x => x.code === rc);
  return { scores, company, role: r ? r.id : null };
}

/** Whole days from today (UTC) to an ISO yyyy-mm-dd date; null when malformed. INLINED. */
export function healthDaysOut(iso, now) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const t = Date.parse(iso + 'T00:00:00Z');
  if (!Number.isFinite(t)) return null;
  const d = new Date(Number(now));
  const today = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((t - today) / 86400000);
}

/**
 * INLINED. The roadmap the check hands back.
 *
 * - `scores` per skill (0–100) and `weights` (company × role, already leaned)
 *   rank the skills by need = (100 − score) × (weight + 1); a perfect skill
 *   goes last.
 * - The unit is DAYS when `daysOut` is 0–14 (one step a day, at most 5),
 *   otherwise WEEKS: `floor(daysOut / 7)` clamped to 3–5, or 4 with no date.
 * - Step i works on the i-th neediest skill (cycling when there are more steps
 *   than skills that need work). Its items are the next unused challenges of
 *   `pools[skill]` — already in curriculum order, the company's set first —
 *   three a week or two a day; a skill scored 50+ skips Easy items.
 * - `pages[skill]` / `traps[skill]` ([href, label]) ride along when present.
 * - `mock` ({ href, label }) closes an interview roadmap; it is Pro.
 * Every item keeps its own `pro` flag; `freeItems` counts the rest.
 */
export function buildHealthRoadmap({ goal, scores, weights, daysOut, pools, pages, traps, mock } = {}) {
  const s = scores || {};
  const w = weights || {};
  const skills = Object.keys(s);
  if (skills.length === 0) return { unit: 'week', steps: [], mock: null, freeItems: 0 };
  const need = k => (100 - Number(s[k])) * ((Number(w[k]) || 0) + 1);
  const ranked = skills.slice().sort((a, b) => need(b) - need(a) || Number(s[a]) - Number(s[b]));
  const weak = ranked.filter(k => Number(s[k]) < 100);
  const order = weak.length ? weak : ranked;
  const dayMode = typeof daysOut === 'number' && daysOut >= 0 && daysOut <= 14;
  const n = dayMode ? Math.max(1, Math.min(5, daysOut || 1))
    : (typeof daysOut === 'number' && daysOut > 14 ? Math.max(3, Math.min(5, Math.floor(daysOut / 7))) : 4);
  const per = dayMode ? 2 : 3;
  const used = {};
  const steps = [];
  for (let i = 0; i < n; i++) {
    const skill = order[i % order.length];
    const pool = ((pools || {})[skill] || []).filter(c => !(Number(s[skill]) >= 50 && c.difficulty === 'Easy'));
    const items = [];
    for (const c of pool) {
      if (items.length >= per) break;
      if (used[c.id]) continue;
      used[c.id] = true;
      items.push(c);
    }
    steps.push({ n: i + 1, skill, score: Number(s[skill]), items, page: (pages || {})[skill] || null, trap: (traps || {})[skill] || null });
  }
  const withMock = goal === 'interview' && mock ? { href: mock.href, label: mock.label, pro: true } : null;
  let freeItems = 0;
  steps.forEach(st => st.items.forEach(c => { if (!c.pro) freeItems++; }));
  return { unit: dayMode ? 'day' : 'week', steps, mock: withMock, freeItems };
}
