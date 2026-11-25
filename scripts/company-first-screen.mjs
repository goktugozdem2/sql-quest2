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
//     src/data/company-interviews.js); no format claim of its own.
//   - The free tier through freeSolvesLabel, the bank through the page facts'
//     bankCountLabel. Never a price.
//
// Injected after renderPage (which rewrites the page whole), between
// `company-first-screen:start/end` markers right under the hero. Idempotent.

import { freeSolvesLabel } from '../src/utils/display-count.js';
import { COMPANY_INTERVIEWS } from '../src/data/company-interviews.js';

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
  },
};

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const codeBlock = (sql, markLine = 0) => `<pre class="fm" style="margin:14px 0 0;padding:14px 16px;overflow-x:auto;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(10,10,25,.7);font-size:13px;line-height:1.7;color:#e2e8f0;">${
  sql.split('\n').map((l, i) => `<span style="display:inline-block;width:2.2em;color:${i + 1 === markLine ? '#c084fc' : '#5b6577'};user-select:none;">${i + 1}</span>${esc(l)}`).join('\n')
}</pre>`;

/** The block for one company, or '' when it has none. `f` is the page's facts(). */
export function firstScreenBlock(key, f, d = COMPANY_INTERVIEWS[key]) {
  const cfg = FIRST_SCREENS[key];
  if (!cfg || !d || !f || !f.first) return '';
  const src = d.sources && d.sources[cfg.sourceKey];
  if (!src) throw new Error(`[first-screen] ${key}: source ${cfg.sourceKey} is not on the page`);
  const door = encodeURIComponent(cfg.src);
  const name = esc(d.name);
  const lockedHard = f.hard - f.previews;
  const q1 = `/app/?challenge=${f.first.id}&amp;src=${door}`;
  const debug = `/app/?challenge=${cfg.debugId}&amp;src=${door}`;
  const readiness = `/sql-interview-readiness-test/?company=${key}&amp;src=${door}`;
  const row = 'margin:0;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:15px;line-height:1.7;color:#94a3b8;';
  return `<!-- company-first-screen:start -->
<section id="start" data-section="first-screen" style="border-top:1px solid rgba(255,255,255,.04);"><div class="sec" style="padding-top:28px;padding-bottom:40px;">
  <span class="sl">Start here</span>
  <div style="margin-top:12px;max-width:820px;">
    <p style="${row}"><strong style="color:#e2e8f0;">Question 1:</strong> <a href="${q1}" data-track="cta_first_question" style="color:#c084fc;">${esc(f.first.title)}</a> (${esc(f.first.difficulty)}): a count per row across a join, the base every per-account metric is built on.</p>
    <p style="${row}"><strong style="color:#e2e8f0;">Readiness:</strong> <a href="${readiness}" data-track="cta_first_readiness" style="color:#c084fc;">the ${name} readiness test</a>, ten questions, no sign-up, scored against this set's skill mix.</p>
    <p style="${row}border-bottom:none;"><strong style="color:#e2e8f0;">Pro, for this interview:</strong> the ${lockedHard} Hard questions in this set past the free preview, all ${esc(f.bank)} questions without the stop at ${esc(freeSolvesLabel())}, and the full mock interview bank.</p>
  </div>

  <div data-first-screen-debug="true" style="margin-top:28px;max-width:820px;padding:20px 22px;border:1px solid rgba(124,58,237,.22);border-radius:14px;background:rgba(124,58,237,.05);">
    <h2 class="fd" style="font-size:22px;font-weight:800;color:#e2e8f0;">Debug this query</h2>
    <p style="font-size:15px;line-height:1.75;color:#94a3b8;margin-top:10px;">${name}'s own Data Science hiring post says the technical interview goes through your submission: its logic, trade-offs and testing (<a href="${esc(src[1])}" rel="nofollow noopener" target="_blank" style="color:#94a3b8;">${esc(src[0])}, ${esc(src[2])}</a>). Testing your own SQL starts with reading a query that runs, returns a plausible number, and is wrong.</p>
    <p style="font-size:15px;line-height:1.75;color:#e2e8f0;margin-top:12px;"><strong>The ask:</strong> ${esc(cfg.ask)} The query below runs on our card ledger and answers ${cfg.brokenAnswer}. Find the line.</p>
    ${codeBlock(cfg.broken)}
    <details style="margin-top:14px;font-size:15px;line-height:1.75;color:#94a3b8;"><summary style="cursor:pointer;color:#e2e8f0;font-weight:700;">Show the bug</summary>
      <p style="margin-top:10px;">Line ${cfg.bugLine}: a WHERE on the right table of a LEFT JOIN. An account with no March transaction joins as NULL, the WHERE drops that row, and the account can never be counted as 0. The ledger has 200 accounts and 196 of them spent in March, so the answer is ${cfg.fixAnswer}, not ${cfg.brokenAnswer}. Move the date condition into the ON clause:</p>
      ${codeBlock(cfg.fix)}
    </details>
    <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-top:18px;">
      <a href="${debug}" class="btn bo" data-track="cta_first_debug">Fix the same bug in the app: question ${cfg.debugId}</a>
      <span style="font-size:13px;color:#8b98ab;">from our Debug set, not the ${name} set</span>
      <a href="/sql-debugging-practice/" style="font-size:14px;color:#94a3b8;">All Debug questions</a>
      <a href="/${cfg.trapSlug}/" style="font-size:14px;color:#94a3b8;">The trap, explained</a>
    </div>
  </div>
</div></section>
<!-- company-first-screen:end -->`;
}

const BLOCK_RE = /<!-- company-first-screen:start -->[\s\S]*?<!-- company-first-screen:end -->\n*/;

/** Insert (or replace) the block right after the hero section. No config → unchanged. */
export function withFirstScreen(html, key, f) {
  const clean = html.replace(BLOCK_RE, '');
  const block = firstScreenBlock(key, f);
  if (!block) return clean;
  const at = clean.indexOf('<section class="hero"');
  if (at < 0) return clean;
  const end = clean.indexOf('</section>', at);
  if (end < 0) return clean;
  const cut = end + '</section>'.length;
  return `${clean.slice(0, cut)}\n${block}${clean.slice(cut)}`;
}
