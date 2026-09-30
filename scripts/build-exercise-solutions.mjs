#!/usr/bin/env node
/**
 * /sql-exercises/ — the two generated blocks (2026-09-30).
 *
 * Spec: docs/plans/seo-october-2026-09-29.md §1 and
 * docs/plans/bing-growth-2026-09-30.md lever 1. The page's title has promised
 * "With Solutions" since 09-07 and showed none; "sql practice exercises with
 * solutions" and "sql practice problems" are the queries that click.
 *
 *   <!-- solutions:start --> … <!-- solutions:end -->
 *     "SQL exercises with solutions": five worked exercises. Title,
 *     difficulty, tables and the QUERY come from the bank — the query is the
 *     challenge's own reference solution, laid out by formatSqlForDisplay
 *     (whitespace only, never a token). The task sentence and the "why it
 *     works" paragraph are written here.
 *
 *   <!-- topic-traps:start --> … <!-- topic-traps:end -->
 *     one sentence per topic of the #by-topic grid naming the trap its
 *     exercises teach, linked to the trap page where one exists (five of nine).
 *
 * What may be published here, and what may not (tests/exercise-solutions.test.js
 * holds every line of this):
 *   - Easy or Medium only — a Hard solution is what Pro sells;
 *   - a core challenge on a classic dataset — never a sector challenge, never
 *     the Revolut set (300–311), never one tagged for a signed archetype
 *     member (Capital One, Revolut: sets authored for that company);
 *   - never a query a mock interview asks for;
 *   - never the challenge's hint text;
 *   - the /questions/ pages still publish no solution at all — this section
 *     is the one place, for these five.
 *
 * The page is hand-written; this script owns only the text between its
 * markers. Run: node scripts/build-exercise-solutions.mjs (part of
 * `npm run build`, before build-static-pages.js copies the page to public/).
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { loadQuestionBank, questionSlugs } from './question-slugs.mjs';
import { formatSqlForDisplay } from '../src/utils/sql-format.js';
import { SQL_PATTERNS } from '../src/data/sql-patterns.js';
import { archetypeMemberCompanies, INTERVIEW_ARCHETYPES } from '../src/data/interview-archetypes.js';

const ROOT = path.resolve(import.meta.dirname, '..');
export const PAGE = path.join(ROOT, 'src/sql-exercises.html');
export const APP_SRC = 'sql-exercises-solutions';
export const REVOLUT_SET = [300, 311];

/** One exercise per kind, in the order a learner meets the ideas. */
export const SOLVED_EXERCISES = [
  {
    id: 94,
    kind: 'filter-sort',
    label: 'Filtering and sorting',
    task: 'From the movies table, list the title, year, rating and genre of every movie rated above 7.5 and released between 2010 and 2016, both years included. Highest rating first.',
    why: 'WHERE keeps a row only when both conditions hold, and BETWEEN includes both of its ends, so 2010 and 2016 are in. ORDER BY runs after the filter, so only the rows that survived are sorted, and DESC puts the highest rating at the top.',
  },
  {
    id: 107,
    kind: 'group-having',
    label: 'GROUP BY and HAVING',
    task: 'Find the genres that have at least 5 movies and an average rating above 6.5. Show the genre, its movie count, its average rating to two decimals and its total revenue, best-rated genre first.',
    why: 'WHERE cannot see COUNT(*) or AVG(rating): it runs before the rows are grouped. HAVING runs after GROUP BY, so it can drop a whole genre by its size and its average. The same two aggregates sit in the SELECT list, which makes the result easy to check by eye.',
  },
  {
    id: 106,
    kind: 'join',
    label: 'JOIN',
    task: 'Show every customer with their membership, the number of orders they placed and the amount they spent, including the customers who never ordered (0 for both). Biggest spender first, then by name.',
    why: 'LEFT JOIN keeps every customer and fills the order columns with NULL where nothing matches. COUNT(o.order_id) skips those NULLs and returns 0, where COUNT(*) would count the empty row as 1. SUM over no orders is NULL, so COALESCE turns it into 0.',
  },
  {
    id: 111,
    kind: 'cte',
    label: 'CTE',
    task: "In a CTE named dept_stats, work out each department's headcount and its average salary, rounded. Then list the departments from it, highest average salary first.",
    why: 'WITH gives the grouped query a name, and the final SELECT reads from dept_stats as if it were a table. It runs the same as a subquery in FROM; the gain is that each step has a name and the query reads top to bottom. A later step that needs the same figures reuses the name instead of repeating the query.',
  },
  {
    id: 112,
    kind: 'window',
    label: 'Window function',
    task: 'Number the employees inside each department by salary, the highest paid as 1, with the name breaking ties. Show name, department, salary and row_num, sorted by department and then by row_num.',
    why: 'ROW_NUMBER() numbers rows without collapsing them, so every employee stays in the result. PARTITION BY department restarts the count in each department, and the ORDER BY inside OVER decides who gets 1. The name in that ORDER BY breaks salary ties, so the numbering is the same on every run.',
  },
];
export const KINDS = ['filter-sort', 'group-having', 'join', 'cte', 'window'];

/**
 * The #by-topic grid's nine topics, in the grid's order: [topic page, name,
 * the trap, trap-page slug or null]. `{…}` marks the words that carry the link.
 */
export const TOPIC_TRAPS = [
  ['/challenges/window-functions/', 'Window Functions', 'ROW_NUMBER, RANK and DENSE_RANK give three different answers when two rows tie, and a top-N query is only right with the one the question meant.', null],
  ['/challenges/joins/', 'Joins', 'A {filter on the right-hand table in WHERE} turns a LEFT JOIN back into an INNER JOIN and drops the rows the LEFT JOIN was there to keep.', 'sql-left-join-where-filter'],
  ['/challenges/cte/', 'CTEs', 'A SUM taken after a join that repeats rows is inflated — the {join fan-out} — so aggregate each table in its own CTE first, then join the totals.', 'sql-join-fan-out'],
  ['/challenges/subqueries/', 'Subqueries', 'A subquery compared with = has to return one value; when it returns several rows the comparison is an error in some databases and a silently wrong answer in others.', null],
  ['/challenges/aggregation/', 'Aggregation & Grouping', 'The {average of group averages} is not the overall average unless every group is the same size.', 'sql-average-of-averages'],
  ['/challenges/case-when/', 'Conditional Logic', 'A CASE with no ELSE returns NULL for every row no branch matched, and the first WHEN that matches wins, so the order of the branches is part of the logic.', null],
  ['/challenges/date-functions/', 'Date Functions', '{BETWEEN with a bare date as its upper bound} stops at midnight and loses the last day of the range.', 'sql-between-timestamp'],
  ['/challenges/null-handling/', 'NULL Handling', '{NOT IN returns no rows at all} once the list it checks holds a single NULL.', 'sql-not-in-null'],
  ['/challenges/string-functions/', 'String Functions', 'Values that look equal are not: a trailing space or a capital letter makes = fail, so TRIM and LOWER come before the comparison.', null],
];

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// The page's own syntax classes (.qk keyword, .qs string, .qn number) — the
// brand SQL palette, already in its <style>. Function names are keywords
// here, as in the page's hand-written sample.
const KEYWORDS = new Set(('SELECT FROM WHERE AND OR NOT IN EXISTS JOIN LEFT INNER ON AS GROUP BY ORDER HAVING WITH ' +
  'COUNT SUM AVG MIN MAX ROUND COALESCE IS NULL BETWEEN DESC ASC LIMIT CASE WHEN THEN ELSE END DISTINCT UNION ' +
  'OVER PARTITION ROW_NUMBER RANK DENSE_RANK LAG LEAD').split(' '));
export function highlight(sql) {
  const out = [];
  const re = /('(?:[^']|'')*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)|(\s+)|(.)/g;
  let m;
  while ((m = re.exec(sql))) {
    if (m[1]) out.push(`<span class="qs">${esc(m[1])}</span>`);
    else if (m[2]) out.push(`<span class="qn">${esc(m[2])}</span>`);
    else if (m[3]) out.push(KEYWORDS.has(m[3].toUpperCase()) ? `<span class="qk">${esc(m[3])}</span>` : esc(m[3]));
    else out.push(esc(m[4] || m[5]));
  }
  return out.join('');
}

export function loadClassicDatasets() {
  const ctx = { window: {}, console: { log() {}, warn() {} } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/data/datasets.js'), 'utf8'), ctx);
  return ctx.window.publicDatasetsData || {};
}

export function loadMockSolutions() {
  const ctx = { window: {}, console: { log() {}, warn() {} } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/data/mock-interviews.js'), 'utf8'), ctx);
  return (ctx.window.mockInterviewsData || []).flatMap(m => m.questions || []).map(q => q.solution).filter(Boolean);
}

export const squash = s => String(s || '').replace(/\s+/g, '').replace(/;$/, '').toLowerCase();

/**
 * Why a challenge may NOT have its solution on the page — [] when it may.
 * The generator refuses to write on any reason; the test calls it too.
 */
export function publishProblems(c, { tags, datasets, mockSolutions, sectorIds, archetypes = INTERVIEW_ARCHETYPES }) {
  const problems = [];
  if (!c) return ['not in the bank'];
  if (c.difficulty !== 'Easy' && c.difficulty !== 'Medium') problems.push(`difficulty is ${c.difficulty} — only Easy and Medium solutions are published`);
  if (c.id >= REVOLUT_SET[0] && c.id <= REVOLUT_SET[1]) problems.push('belongs to the Revolut set (300–311)');
  if (sectorIds.has(c.id)) problems.push('is a sector-track challenge');
  if (!datasets[c.dataset]) problems.push(`dataset ${c.dataset} is not a classic dataset`);
  if (archetypes.some(a => a.dataset === c.dataset)) problems.push(`dataset ${c.dataset} is an interview archetype's`);
  const members = archetypeMemberCompanies(archetypes).map(s => s.toLowerCase());
  const authored = (tags[c.id] || []).filter(t => members.includes(String(t).toLowerCase()));
  if (authored.length) problems.push(`is tagged for a company-authored set (${authored.join(', ')})`);
  if (mockSolutions.some(s => squash(s) === squash(c.solution))) problems.push('its query is a mock interview answer');
  return problems;
}

export function loadContext() {
  const { bank, tags } = loadQuestionBank();
  const ctx = { window: {}, console: { log() {}, warn() {} } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/data/sector-challenges.js'), 'utf8'), ctx);
  return {
    bank, tags,
    slugs: questionSlugs(bank),
    datasets: loadClassicDatasets(),
    mockSolutions: loadMockSolutions(),
    sectorIds: new Set((ctx.window.sectorChallengesData || []).map(c => c.id)),
  };
}

/** The query exactly as the page shows it (before highlighting). */
export const displayedSql = c => `${formatSqlForDisplay(c.solution).replace(/;\s*$/, '')};`;

function schemaHtml(c, datasets) {
  const ds = datasets[c.dataset];
  return c.tables.map(t => `<span class="qk">${esc(t)}</span>(${esc(ds.tables[t].columns.join(', '))})`).join('<br>');
}

function exerciseHtml(spec, n, cx) {
  const c = cx.bank.find(x => x.id === spec.id);
  const problems = publishProblems(c, cx);
  if (problems.length) throw new Error(`build-exercise-solutions: #${spec.id} cannot be published — ${problems.join('; ')}`);
  const slug = cx.slugs.get(c.id);
  if (!slug) throw new Error(`build-exercise-solutions: #${spec.id} has no question page`);
  return `  <article class="sol" data-solution="${c.id}" data-kind="${spec.kind}">
    <p class="sample-tags"><span class="sample-tag sample-tag-c">${esc(c.difficulty)}</span><span class="sample-tag sample-tag-c">${esc(spec.label)}</span></p>
    <h3>${n}. ${esc(c.title)}</h3>
    <p>${esc(spec.task)}</p>
    <p class="label">Tables</p>
    <p class="schema">${schemaHtml(c, cx.datasets)}</p>
    <p class="label">Solution</p>
    <pre class="qe"><code>${highlight(displayedSql(c))}</code></pre>
    <p class="label">Why it works</p>
    <p>${esc(spec.why)}</p>
    <div class="sol-links"><a href="/app/?challenge=${c.id}&amp;src=${APP_SRC}" class="btn bo" data-track="cta_solution_app">Run it in the editor →</a><a href="/questions/${slug}/" data-track="cta_solution_question" style="color:#c084fc;font-size:14px;font-weight:600;">The question page: sample rows and related questions</a></div>
  </article>`;
}

export function renderSolutions(cx = loadContext()) {
  const kinds = SOLVED_EXERCISES.map(s => s.kind);
  if (kinds.length !== KINDS.length || KINDS.some((k, i) => kinds[i] !== k)) {
    throw new Error(`build-exercise-solutions: the section is exactly one exercise per kind (${KINDS.join(', ')})`);
  }
  return `
<!-- GENERATED by scripts/build-exercise-solutions.mjs — do not edit between the markers. -->
<section id="solutions"><div class="sec" style="padding-top:30px;padding-bottom:50px;">
  <div style="text-align:center;margin-bottom:32px;">
    <span class="sl" style="color:#8b98ab;">Worked solutions</span>
    <h2 class="st fd">SQL exercises with solutions</h2>
    <p style="font-size:16px;color:#94a3b8;margin:16px auto 0;max-width:680px;line-height:1.7;">Five exercises from the bank, solved in full: the task, the tables, the query and why it works. Each query is the exercise's reference solution and runs in the browser editor on the same data.</p>
  </div>
${SOLVED_EXERCISES.map((s, i) => exerciseHtml(s, i + 1, cx)).join('\n')}
  <p style="text-align:center;margin:24px auto 0;font-size:14px;color:#94a3b8;line-height:1.8;max-width:680px;">Every other exercise shows its worked solution in the app once you have solved it. <a href="/app/?src=${APP_SRC}" style="color:#c084fc;font-weight:600;">Open the exercise bank</a></p>
</div></section>
`;
}

export function renderTopicTraps() {
  const known = new Set(SQL_PATTERNS.map(p => p.slug));
  const items = TOPIC_TRAPS.map(([href, name, text, slug]) => {
    if (slug && !known.has(slug)) throw new Error(`build-exercise-solutions: no trap page /${slug}/`);
    if (!!slug !== /\{[^}]+\}/.test(text)) throw new Error(`build-exercise-solutions: "${name}" — a linked trap needs {link words}, an unlinked one has none`);
    const body = esc(text).replace(/\{([^}]+)\}/, (_, words) => `<a href="/${slug}/" data-track="cta_trap" style="color:#c084fc;font-weight:600;">${words}</a>`);
    return `    <li style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06);"><a href="${href}" style="color:#e2e8f0;font-weight:700;text-decoration:none;">${esc(name)}</a> — ${body}</li>`;
  });
  return `
  <!-- GENERATED by scripts/build-exercise-solutions.mjs — do not edit between the markers. -->
  <div id="topic-traps" style="max-width:860px;margin:32px auto 0;">
    <h3 class="fd" style="font-size:18px;font-weight:800;color:#f1f5f9;margin-bottom:8px;">The trap each topic's exercises teach</h3>
    <ul style="list-style:none;font-size:14px;color:#94a3b8;line-height:1.7;">
${items.join('\n')}
    </ul>
  </div>
  `;
}

export function replaceBlock(html, name, body) {
  const start = `<!-- ${name}:start -->`;
  const end = `<!-- ${name}:end -->`;
  const a = html.indexOf(start);
  const b = html.indexOf(end);
  if (a < 0 || b < a) throw new Error(`build-exercise-solutions: markers ${start} … ${end} not found in src/sql-exercises.html`);
  return html.slice(0, a + start.length) + body + html.slice(b);
}

export function renderPage(html, cx = loadContext()) {
  return replaceBlock(replaceBlock(html, 'solutions', renderSolutions(cx)), 'topic-traps', renderTopicTraps());
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const before = fs.readFileSync(PAGE, 'utf8');
  const after = renderPage(before);
  if (after !== before) fs.writeFileSync(PAGE, after);
  console.log(`sql-exercises: ${SOLVED_EXERCISES.length} worked solutions (${SOLVED_EXERCISES.map(s => `#${s.id}`).join(', ')}), ${TOPIC_TRAPS.length} topic lines${after === before ? ' — unchanged' : ''}`);
}
