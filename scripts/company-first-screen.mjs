// The first screen of a company page: question 1, the readiness test, what Pro
// gives for this interview, and one "debug this query" item (C5, 2026-11-24).
//
// Why: 81% of company-page landers never open the app (C5 brief), and the
// Monzo SERP is held by a paginated question bank with no runnable SQL
// (docs/reads/competitors-2026-11-23.md, N5). The page answers with a query
// the reader can check, framed by the source the page already cites, and a
// link into the app's own Debug question on the same bug — no new grader.
//
// Rules this file keeps:
//   - Every app link carries `src=<door>` (here `company-monzo`). The hero
//     button keeps its own src so the series it feeds does not move.
//   - The debug query runs on the dataset the Monzo set runs on
//     (`finans_fraud`), and is not a Capital One mock question
//     (tests/company-first-screen.test.js runs it, the fix, every number, and
//     compares it against the mock's snippets).
//   - The frame cites only a source already on the page (`sources` in
//     src/data/company-interviews.js); no format claim of its own. A general
//     page with no `sources` (Wise) has no `sourceKey`; its one dated line is
//     pinned by its own test (`ownTest`) against the company dossier.
//   - This map is the ONLY home of a first screen. The generator strips the
//     block from every company page and puts back what this map says, so a
//     block hand-written into a page is deleted on the next run (Wise's was,
//     until 2026-11-27). tests/company-template.test.js fails on any page
//     the generator would change.
//   - The free tier through freeSolvesLabel, the bank through the page facts'
//     bankCountLabel. Never a price.
//
// Injected after renderPage (which rewrites the page whole), between
// `company-first-screen:start/end` markers right under the hero. Idempotent.

import { freeSolvesLabel } from '../src/utils/display-count.js';
import { COMPANY_INTERVIEWS, SOURCED_FORMATS } from '../src/data/company-interviews.js';

/** The page data for a key: a generated page's entry, an older page's sourced
 *  format, or (an older general page, Wise) just the name its config carries. */
export const pageData = key => COMPANY_INTERVIEWS[key] || SOURCED_FORMATS[key]
  || (FIRST_SCREENS[key] && FIRST_SCREENS[key].name ? { name: FIRST_SCREENS[key].name } : undefined);

export const FIRST_SCREENS = {
  monzo: {
    src: 'company-monzo',
    dataset: 'finans_fraud',
    // The source the frame cites; must be a key of the page's own `sources`.
    sourceKey: 'monzo-ds-2026',
    // The app's Debug question with the same bug (src/data/debug-challenges.js).
    debugId: 336,
    trapSlug: 'sql-left-join-where-filter',
    ask: 'How many card accounts made no transaction in March 2026?',
    broken: [
      'SELECT COUNT(*) AS accounts_with_no_march_spend',
      'FROM (',
      '  SELECT a.account_id, COUNT(t.txn_id) AS march_txns',
      '  FROM accounts a',
      '  LEFT JOIN transactions t ON t.account_id = a.account_id',
      "  WHERE t.txn_at >= '2026-03-01' AND t.txn_at < '2026-04-01'",
      '  GROUP BY a.account_id',
      ')',
      'WHERE march_txns = 0;',
    ].join('\n'),
    bugLine: 6,
    fix: [
      'SELECT COUNT(*) AS accounts_with_no_march_spend',
      'FROM (',
      '  SELECT a.account_id, COUNT(t.txn_id) AS march_txns',
      '  FROM accounts a',
      '  LEFT JOIN transactions t',
      '         ON t.account_id = a.account_id',
      "        AND t.txn_at >= '2026-03-01' AND t.txn_at < '2026-04-01'",
      '  GROUP BY a.account_id',
      ')',
      'WHERE march_txns = 0;',
    ].join('\n'),
    // What each query returns, and the facts the copy states. The test runs them.
    brokenAnswer: 0,
    fixAnswer: 4,
    facts: [
      { text: '200 accounts', sql: 'SELECT COUNT(*) || \' accounts\' FROM accounts', expect: '200 accounts' },
      { text: '196 of them', sql: "SELECT COUNT(DISTINCT account_id) || ' of them' FROM transactions WHERE txn_at >= '2026-03-01' AND txn_at < '2026-04-01'", expect: '196 of them' },
    ],
    // What question 1 measures (founder rule 2026-10-05: what, never how).
    firstMeasures: 'a count per row across a join, the base every per-account metric is built on.',
    frame: (src, name) => `${name}'s own Data Science hiring post says the technical interview goes through your submission: its logic, trade-offs and testing (<a href="${esc(src[1])}" rel="nofollow noopener" target="_blank" style="color:#94a3b8;">${esc(src[0])}, ${esc(src[2])}</a>). Testing your own SQL starts with reading a query that runs, returns a plausible number, and is wrong.`,
    bugText: cfg => `Line ${cfg.bugLine}: a WHERE on the right table of a LEFT JOIN. An account with no March transaction joins as NULL, the WHERE drops that row, and the account can never be counted as 0. The ledger has 200 accounts and 196 of them spent in March, so the answer is ${cfg.fixAnswer}, not ${cfg.brokenAnswer}. Move the date condition into the ON clause:`,
  },

  // Amazon (C5, 2026-11-26). An older, hand-written page: the block goes in
  // through the same marker pair, after olderPage. Question 1 stays the
  // hero's (#19, its series is pinned by tests/company-hero-cta.test.js); the
  // block's "Start with" is #131, the first shape in the BIE round reported
  // to us (docs/reads/amazon-bie-candidate-report-2026-10-21.md). The frame
  // cites that report's follow-up, COUNT(*) against COUNT(column).
  amazon: {
    src: 'company-amazon',
    dataset: 'ecommerce',
    sourceKey: 'reported-amzn',
    firstId: 131,
    firstLabel: 'Start with',
    firstMeasures: 'a row compared against its own group\'s average. It is the first shape in the round reported to us (sourced below).',
    // The app's Debug item on the same COUNT(*) against COUNT(column)
    // difference, on another dataset (titanic). No trap page covers it.
    debugId: 334,
    debugSameBug: 'the same COUNT(*) against COUNT(column) difference, on another dataset',
    debugButton: 'Fix the same mistake in the app',
    dataLabel: 'our e-commerce sample data',
    trapSlug: null,
    ask: 'What is the average number of orders per customer, counting a customer who never ordered as 0?',
    broken: [
      'SELECT ROUND(AVG(order_count), 2) AS avg_orders_per_customer',
      'FROM (',
      '  SELECT c.customer_id, COUNT(*) AS order_count',
      '  FROM customers c',
      '  LEFT JOIN orders o ON o.customer_id = c.customer_id',
      '  GROUP BY c.customer_id',
      ');',
    ].join('\n'),
    bugLine: 3,
    fix: [
      'SELECT ROUND(AVG(order_count), 2) AS avg_orders_per_customer',
      'FROM (',
      '  SELECT c.customer_id, COUNT(o.order_id) AS order_count',
      '  FROM customers c',
      '  LEFT JOIN orders o ON o.customer_id = c.customer_id',
      '  GROUP BY c.customer_id',
      ');',
    ].join('\n'),
    brokenAnswer: 2.88,
    fixAnswer: 2.5,
    facts: [
      { text: '16 customers', sql: "SELECT COUNT(*) || ' customers' FROM customers", expect: '16 customers' },
      { text: '40 orders', sql: "SELECT COUNT(*) || ' orders' FROM orders", expect: '40 orders' },
      { text: '6 of them', sql: "SELECT COUNT(*) || ' of them' FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id)", expect: '6 of them' },
    ],
    frame: (src, name) => `In the Business Intelligence Engineer round reported to us (<a href="#src-reported-amzn" style="color:#94a3b8;">${esc(src[0])}, ${esc(src[2])}</a>), each SQL problem was followed by questions about the query, and one was COUNT(*) against COUNT(column). After a LEFT JOIN that difference is not a style point. It changes the number.`,
    bugText: cfg => `Line ${cfg.bugLine}: COUNT(*) counts rows, and a LEFT JOIN gives a customer with no orders one row, padded with NULLs. The 6 of them who never ordered each count as 1. The data has 16 customers and 40 orders, so the answer is ${cfg.fixAnswer}, not ${cfg.brokenAnswer}. Count a column from the right table, which is NULL on that padded row:`,
    // The Amazon-tagged set in the app, and the closest Pro mock, named honestly.
    setLink: true,
    mock: {
      id: 'faang-sql-interview',
      label: 'the Hard SQL Interview mock',
      note: '50 minutes, five written questions, including the second-highest salary, consecutive orders and the longest-tenured employee per department. It is a general mock, not modelled on Amazon; it is the closest we have to the ranking and streak shapes the Amazon reports describe.',
    },
  },

  // Wise (C5, 2026-11-25, #361). An older, general page (no sourced format, so
  // no `sources` and no sourceKey): the frame's one dated line is Dataford's
  // guide in docs/reads/companies/wise.md (W11). The debug query returns one
  // row per home currency, so its numbers are checked by its own test, not by
  // the scalar brokenAnswer/fixAnswer loop in tests/company-first-screen.test.js.
  // Moved here verbatim from the hand-written block on 2026-11-27.
  wise: {
    name: 'Wise',
    ownTest: 'tests/wise-first-screen.test.js',
    src: 'company-wise',
    dataset: 'finans_neobank',
    firstId: 285,
    firstLabel: 'Start with',
    firstMeasures: 'joins and aggregation on a card ledger. Every per-country number on a money-movement ledger starts there.',
    // A Hard, so Pro: the button says so (the Wise test pins it).
    debugId: 341,
    debugNote: '(Hard, Pro)',
    trapSlug: 'sql-average-of-averages',
    broken: [
      'SELECT home_currency,',
      '       ROUND(AVG(avg_fee), 2) AS avg_fee_gbp',
      'FROM (',
      '  SELECT u.home_currency, t.user_id, AVG(t.fee_gbp) AS avg_fee',
      '  FROM transactions t',
      '  JOIN users u ON u.user_id = t.user_id',
      "  WHERE t.type = 'fx_exchange' AND t.status = 'completed'",
      '  GROUP BY u.home_currency, t.user_id',
      ')',
      'GROUP BY home_currency',
      'ORDER BY home_currency;',
    ].join('\n'),
    bugLine: 4,
    fix: [
      'SELECT u.home_currency,',
      '       ROUND(AVG(t.fee_gbp), 2) AS avg_fee_gbp',
      'FROM transactions t',
      'JOIN users u ON u.user_id = t.user_id',
      "WHERE t.type = 'fx_exchange' AND t.status = 'completed'",
      'GROUP BY u.home_currency',
      'ORDER BY u.home_currency;',
    ].join('\n'),
    proText: (f, name) => `the ${f.hard - f.previews} Hard challenges in the ${name} set, the Hard Debug challenges like the one below, all ${esc(f.bank)} challenges without the stop at ${esc(freeSolvesLabel())}, and the full mock interview bank, timed and scored.`,
    frame: () => 'Wise does not publish its SQL questions. One prep guide quotes a candidate for a Wise data-analyst role who was handed a SQL query and asked what was wrong with it (Dataford\'s Wise Data Analyst guide, updated 8 Oct 2026, read 22 Nov 2026). One report is not a format, but reading a query someone else wrote is a skill you can practise.',
    askText: () => 'the average fee, in GBP, on a completed currency exchange, for each customer\'s home currency. The query below runs on our synthetic multi-currency ledger (240 users, 12 currencies) and returns a plausible number for every currency. Four of the five are wrong. Find the lines.',
    bugText: () => 'Lines 4 and 8: the inner query averages per user, and line 2 then averages those averages. A user with one exchange weighs as much as a user with ten, so the answer is an average per customer, not per exchange. PLN users made 30 completed exchanges: the query says 0.65, the real average fee is 1.07. Average the exchanges directly:',
  },

  // Snowflake (C5, 2026-11-28). An older, general page: no sourced format, so
  // no sourceKey; the frame cites the two dated reports in
  // docs/reads/companies/snowflake.md (S3, S4), pinned by its own test. The
  // dossier read no analyst-round source, so the page still states no format.
  // "Start with" is #23, a free Hard preview: a rank inside each department,
  // the step before the nth-highest-salary shape both reports name. The hero
  // button keeps #117 (its series is pinned by the hero CTA test).
  snowflake: {
    name: 'Snowflake',
    ownTest: 'tests/snowflake-first-screen.test.js',
    src: 'company-snowflake',
    dataset: 'employees',
    firstId: 23,
    firstLabel: 'Start with',
    firstMeasures: 'a rank inside each department. The nth-highest salary is the one shape both readable Snowflake reports name (cited below), and this is the step before it. A Hard preview, so it opens inside the free tier.',
    // The app's Debug item on the same join duplication, on another dataset
    // (ecommerce). A Hard, so Pro: the button says so.
    debugId: 340,
    debugNote: '(Hard, Pro)',
    proText: (f, name) => `the ${f.hard - f.previews} Hard challenges in the ${name} set past its Hard previews, the Hard Debug challenges like the one below, all ${esc(f.bank)} challenges without the stop at ${esc(freeSolvesLabel())}, and the full mock interview bank, timed and scored.`,
    debugSameBug: 'the same join that repeats rows, on orders and reviews',
    trapSlug: 'sql-join-fan-out',
    dataLabel: 'our employees sample data',
    ask: 'How many employees manage at least one person?',
    broken: [
      'SELECT COUNT(*) AS managers',
      'FROM employees m',
      'JOIN employees e ON e.manager_id = m.emp_id;',
    ].join('\n'),
    bugLine: 3,
    fix: [
      'SELECT COUNT(*) AS managers',
      'FROM employees m',
      'WHERE EXISTS (',
      '  SELECT 1 FROM employees e',
      '  WHERE e.manager_id = m.emp_id',
      ');',
    ].join('\n'),
    brokenAnswer: 43,
    fixAnswer: 6,
    facts: [
      { text: '50 employees', sql: "SELECT COUNT(*) || ' employees' FROM employees", expect: '50 employees' },
      { text: '7 with no manager', sql: "SELECT COUNT(*) || ' with no manager' FROM employees WHERE manager_id IS NULL", expect: '7 with no manager' },
    ],
    mock: {
      id: 'faang-sql-interview',
      label: 'the Hard SQL Interview mock',
      note: '50 minutes, five written questions, including the second-highest salary and customers who ordered on consecutive days. It is a general mock, not modelled on Snowflake; it is the closest we have to the ranking and consecutive-day shapes the reports describe.',
    },
    frame: () => 'Snowflake does not publish its SQL questions, and we could not read any report of its analyst round. Two dated reports from its data-engineering interviews name the shapes: an employee who earns more than their manager, a self-join on the manager id (<a href="https://datadriven.io/companies/snowflake/interview" rel="nofollow noopener" target="_blank" style="color:#94a3b8;">DataDriven\'s Snowflake data engineer guide</a>, updated 23 Sep 2026, read 22 Nov 2026), and the employees on at least one project, without listing anyone twice (<a href="https://www.geeksforgeeks.org/?p=1054489" rel="nofollow noopener" target="_blank" style="color:#94a3b8;">a 2023 campus report on GeeksforGeeks</a>, updated 31 Aug 2023, read 22 Nov 2026). Two reports are not a format. Both shapes meet at one trap: a join that repeats a row, and a count that believes it.',
    bugText: cfg => `Line ${cfg.bugLine}: the join makes one row per report, not one per manager. The data has 50 employees and 7 with no manager, so the other 43 are reports, and COUNT(*) counts every one of them. ${cfg.brokenAnswer} is the number of people who have a manager. The answer is ${cfg.fixAnswer}. Ask whether a person has at least one report, which never repeats a row:`,
  },
};

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const codeBlock = (sql, markLine = 0) => `<pre class="fm" style="margin:14px 0 0;padding:14px 16px;overflow-x:auto;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(10,10,25,.7);font-size:13px;line-height:1.7;color:#e2e8f0;">${
  sql.split('\n').map((l, i) => `<span style="display:inline-block;width:2.2em;color:${i + 1 === markLine ? '#c084fc' : '#5b6577'};user-select:none;">${i + 1}</span>${esc(l)}`).join('\n')
}</pre>`;

/** The block for one company, or '' when it has none. `f` is the page's facts(). */
export function firstScreenBlock(key, f, d = pageData(key)) {
  const cfg = FIRST_SCREENS[key];
  if (!cfg || !d || !f || !f.first) return '';
  const src = cfg.sourceKey ? d.sources && d.sources[cfg.sourceKey] : null;
  if (cfg.sourceKey && !src) throw new Error(`[first-screen] ${key}: source ${cfg.sourceKey} is not on the page`);
  if (!cfg.sourceKey && !cfg.ownTest) throw new Error(`[first-screen] ${key}: a frame with no sourceKey needs an ownTest that pins its source`);
  const door = encodeURIComponent(cfg.src);
  const name = esc(d.name);
  const lockedHard = f.hard - f.previews;
  const first = cfg.firstId ? (f.ordered || []).find(c => c.id === cfg.firstId) : f.first;
  if (!first) throw new Error(`[first-screen] ${key}: first question ${cfg.firstId} is not in the ${d.name} set`);
  const q1 = `/app/?challenge=${first.id}&amp;src=${door}`;
  const set = `/app/?company=${encodeURIComponent(d.name)}&amp;goal=interview&amp;src=${door}`;
  const mock = cfg.mock ? `/app/?interview=${encodeURIComponent(cfg.mock.id)}&amp;src=${door}` : null;
  const debug = `/app/?challenge=${cfg.debugId}&amp;src=${door}`;
  const readiness = `/sql-interview-readiness-test/?company=${key}&amp;src=${door}`;
  const row = 'margin:0;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:15px;line-height:1.7;color:#94a3b8;';
  return `<!-- company-first-screen:start -->
<section id="start" data-section="first-screen" style="border-top:1px solid rgba(255,255,255,.04);"><div class="sec" style="padding-top:28px;padding-bottom:40px;">
  <span class="sl">Start here</span>
  <div style="margin-top:12px;max-width:820px;">
    <p style="${row}"><strong style="color:#e2e8f0;">${esc(cfg.firstLabel || 'Question 1')}:</strong> <a href="${q1}" data-track="cta_first_question" style="color:#c084fc;">${esc(first.title)}</a> (${esc(first.difficulty)}): ${esc(cfg.firstMeasures)}</p>${cfg.setLink ? `
    <p style="${row}"><strong style="color:#e2e8f0;">The set:</strong> <a href="${set}" data-track="cta_first_set" style="color:#c084fc;">all ${f.n} ${name}-tagged challenges in the app</a> (${f.easy ? `${f.easy} Easy, ` : ''}${f.medium} Medium, ${f.hard} Hard), picked because their SQL matches the shapes the sources report, not questions ${name} has asked.</p>` : ''}
    <p style="${row}"><strong style="color:#e2e8f0;">Readiness:</strong> <a href="${readiness}" data-track="cta_first_readiness" style="color:#c084fc;">the ${name} readiness test</a>, ten questions, no sign-up, scored against this set's skill mix.</p>
    <p style="${row}border-bottom:none;"><strong style="color:#e2e8f0;">Pro, for this interview:</strong> ${cfg.proText ? cfg.proText(f, name) : `the ${lockedHard} Hard questions in this set past the free preview, all ${esc(f.bank)} questions without the stop at ${esc(freeSolvesLabel())}, and the full mock interview bank.`}${mock ? ` Closest to this interview: <a href="${mock}" data-track="cta_first_mock" style="color:#c084fc;">${esc(cfg.mock.label)} (Pro)</a>, ${esc(cfg.mock.note)}` : ''}</p>
  </div>

  <div data-first-screen-debug="true" style="margin-top:28px;max-width:820px;padding:20px 22px;border:1px solid rgba(124,58,237,.22);border-radius:14px;background:rgba(124,58,237,.05);">
    <h2 class="fd" style="font-size:22px;font-weight:800;color:#e2e8f0;">Debug this query</h2>
    <p style="font-size:15px;line-height:1.75;color:#94a3b8;margin-top:10px;">${cfg.frame(src, name)}</p>
    <p style="font-size:15px;line-height:1.75;color:#e2e8f0;margin-top:12px;"><strong>The ask:</strong> ${cfg.askText ? cfg.askText(cfg) : `${esc(cfg.ask)} The query below runs on ${esc(cfg.dataLabel || 'our card ledger')} and answers ${cfg.brokenAnswer}. Find the line.`}</p>
    ${codeBlock(cfg.broken)}
    <details style="margin-top:14px;font-size:15px;line-height:1.75;color:#94a3b8;"><summary style="cursor:pointer;color:#e2e8f0;font-weight:700;">Show the bug</summary>
      <p style="margin-top:10px;">${cfg.bugText(cfg)}</p>
      ${codeBlock(cfg.fix)}
    </details>
    <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-top:18px;">
      <a href="${debug}" class="btn bo" data-track="cta_first_debug">${esc(cfg.debugButton || 'Fix the same bug in the app')}: question ${cfg.debugId}${cfg.debugNote ? ` ${esc(cfg.debugNote)}` : ''}</a>
      <span style="font-size:13px;color:#8b98ab;">from our Debug set, not the ${name} set${cfg.debugSameBug ? `: ${esc(cfg.debugSameBug)}` : ''}</span>
      <a href="/sql-debugging-practice/" style="font-size:14px;color:#94a3b8;">All Debug questions</a>${cfg.trapSlug ? `
      <a href="/${cfg.trapSlug}/" style="font-size:14px;color:#94a3b8;">The trap, explained</a>` : ''}
    </div>
  </div>
</div></section>
<!-- company-first-screen:end -->`;
}

export const BLOCK_RE = /<!-- company-first-screen:start -->[\s\S]*?<!-- company-first-screen:end -->\n*/;

// Where the block sits (live QA 2026-11-27, docs/reads/live-qa-2026-11-27.md
// note B): after the hero section it started at y 807 (Wise) / 780 (Amazon)
// on a 1366×800 desktop and ~1,000 px down on a phone, below the fold, so it
// was not a first screen. It now sits INSIDE the hero, right after the
// primary CTA row: the yellow button keeps its place (M-02 reads it on
// 12-20) and the block starts above the fold at 1366×800 and 375×812
// (measured in the PR). Without a hero CTA it falls back to after the hero.
const OPEN = '<section id="start" data-section="first-screen" style="border-top:1px solid rgba(255,255,255,.04);"><div class="sec" style="padding-top:28px;padding-bottom:40px;">';
const CLOSE = '</div></section>\n<!-- company-first-screen:end -->';

/** The block re-wrapped to sit inside the hero's own container. */
function inHero(block, centered) {
  if (!block.startsWith(`<!-- company-first-screen:start -->\n${OPEN}`) || !block.endsWith(CLOSE)) throw new Error('[first-screen] block wrapper changed; update OPEN/CLOSE');
  return block
    // contain:inline-size: the hero is a flex row with overflow:hidden, and
    // without it the <pre> would widen the hero to its longest line (640 px on
    // a 375 px phone) and the clipped overflow would hide the right edge.
    .replace(OPEN, `<div id="start" data-section="first-screen" style="text-align:left;width:100%;max-width:820px;contain:inline-size;margin:${centered ? '36px auto 0' : '28px 0 0'};">`)
    .replace(CLOSE, '</div>\n<!-- company-first-screen:end -->');
}

/** Insert (or replace) the block in the hero, right after the primary CTA row. No config → unchanged. */
export function withFirstScreen(html, key, f) {
  const clean = html.replace(BLOCK_RE, '');
  const block = firstScreenBlock(key, f);
  if (!block) return clean;
  const at = clean.indexOf('<section class="hero"');
  if (at < 0) return clean;
  const end = clean.indexOf('</section>', at);
  if (end < 0) return clean;
  const cta = clean.indexOf('data-track="cta_hero_primary"', at);
  if (cta > at && cta < end) {
    const rowEnd = clean.indexOf('</div>', cta) + '</div>'.length;
    const sec = clean.indexOf('<div class="sec"', at);
    const centered = sec > at && sec < cta && /text-align:center/.test(clean.slice(sec, clean.indexOf('>', sec)));
    return `${clean.slice(0, rowEnd)}\n${inHero(block, centered)}${clean.slice(rowEnd)}`;
  }
  const cut = end + '</section>'.length;
  return `${clean.slice(0, cut)}\n${block}${clean.slice(cut)}`;
}
