#!/usr/bin/env node
/**
 * The topic-learn pilot (2026-11-23): two practice topic pages,
 * /challenges/window-functions/ and /challenges/cte/, get three blocks above
 * their challenge lists — "Learn it in 3 minutes" (plain words, the syntax,
 * one worked example on a tiny table with its result, one common mistake),
 * "Now try it" (an Easy → Medium → Hard ladder from the bank, picked in
 * curriculum order), and "The next step" (the readiness test, the company
 * sets that weigh the topic, the free tier said the gate's way).
 *
 * The seven other hand-written topic pages are the comparison group and are
 * not touched. Content: src/data/topic-learn.js. Guards:
 * tests/topic-learn-pilot.test.js. Idempotent: everything sits between the
 * topic-learn markers, inserted once right after the hero.
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadQuestionBank, questionSlugs } from './question-slugs.mjs';
import { COMPANIES } from './build-company-crosslinks.mjs';
import { challengeMatchesSkill } from '../src/utils/skill-drill.js';
import { makeChallengeComparator, isFreePreview } from '../src/utils/challenge-order.js';
import { SQL_ROADMAP_CHALLENGE_ORDER } from '../src/data/roadmap-stages.js';
import { freeTierSentence } from '../src/utils/display-count.js';
import { TOPIC_LEARN } from '../src/data/topic-learn.js';

const ROOT = path.resolve(import.meta.dirname, '..');
export const START = '<!-- topic-learn:start -->';
export const END = '<!-- topic-learn:end -->';
export const SDK_URL = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js';

const solutionOf = c => String(c.solution || '');

// Which bank challenges teach the page's topic. The window page is the
// canonical skill; the CTE page's population is "the reference solution opens
// a WITH" (TOPIC_PAGES in tests/site-counts.test.js), narrowed to the
// canonical Subqueries & CTEs skill so a ladder step is a CTE question first.
export const LADDER_POOL = {
  'window-functions': c => challengeMatchesSkill(c, 'Window Functions'),
  cte: c => /\bWITH\b/i.test(solutionOf(c)) && challengeMatchesSkill(c, 'Subqueries & CTEs'),
};

/**
 * Easy, Medium, Hard — each the first of its difficulty in CURRICULUM order
 * (src/utils/challenge-order.js), never raw id order. On the Hard pool the
 * free previews go first (`previewsFirst`, the option written for an
 * all-Hard list), so a cold visitor's third step is one they can open.
 */
export function pickLadder(slug, bank, order = SQL_ROADMAP_CHALLENGE_ORDER) {
  const pool = bank.filter(LADDER_POOL[slug]);
  return ['Easy', 'Medium', 'Hard'].map(difficulty => {
    const list = pool.filter(c => c.difficulty === difficulty)
      .sort(makeChallengeComparator(order, { previewsFirst: difficulty === 'Hard' }));
    if (!list.length) throw new Error(`topic-learn: no ${difficulty} challenge for ${slug}`);
    return list[0];
  });
}

/** Free / Free preview / Pro, the same labels the page's own cards use. */
export function accessOf(c) {
  if (c.difficulty !== 'Hard') return { cls: 'free', label: 'Free', playable: true };
  if (isFreePreview(c)) return { cls: 'free', label: 'Free preview', playable: true };
  return { cls: 'pro', label: 'Pro', playable: false };
}

/**
 * Company sets that weigh the topic: of each company's tagged challenges,
 * the share that belongs to the topic. Sets of five or more only, top three.
 */
export function companiesForTopic(slug, bank, tags) {
  const inTopic = new Set(bank.filter(LADDER_POOL[slug]).map(c => c.id));
  const out = [];
  for (const [key, { name }] of Object.entries(COMPANIES)) {
    if (!fs.existsSync(path.join(ROOT, 'src', `${key}-sql-interview.html`))) continue;
    const ids = Object.entries(tags)
      .filter(([, list]) => Array.isArray(list) && list.some(n => String(n).toLowerCase() === name.toLowerCase()))
      .map(([id]) => Number(id));
    if (ids.length < 5) continue;
    const hits = ids.filter(id => inTopic.has(id)).length;
    out.push({ key, name, share: hits / ids.length, hits, total: ids.length });
  }
  return out.filter(c => c.hits > 0)
    .sort((a, b) => b.share - a.share || b.hits - a.hits || a.key.localeCompare(b.key))
    .slice(0, 3);
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const KEYWORDS = /^(SELECT|FROM|WHERE|GROUP|BY|ORDER|PARTITION|OVER|AS|WITH|AND|OR|NOT|IN|ON|JOIN|LEFT|DESC|ASC|HAVING|SUM|COUNT|AVG|LAG|LEAD|ROW_NUMBER|RANK|DENSE_RANK|CREATE|TABLE|INSERT|INTO|VALUES|TEXT|INTEGER)$/i;
/** The brand SQL palette: keywords blue, strings green, numbers orange, comments muted. */
export function highlight(sql) {
  const re = /(--[^\n]*)|('(?:[^']|'')*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]+)|([\s\S])/g;
  let out = '';
  for (const m of sql.matchAll(re)) {
    if (m[1]) out += `<span class="tl-c">${esc(m[1])}</span>`;
    else if (m[2]) out += `<span class="tl-s">${esc(m[2])}</span>`;
    else if (m[3]) out += `<span class="tl-n">${esc(m[3])}</span>`;
    else if (m[4]) out += KEYWORDS.test(m[4]) ? `<span class="tl-k">${esc(m[4])}</span>` : esc(m[4]);
    else out += esc(m[5]);
  }
  return out;
}

function resultTable(columns, rows, attrs = '') {
  const cell = v => (v === null ? '<td class="tl-null">NULL</td>' : `<td>${esc(v)}</td>`);
  return `<div class="tl-table"${attrs}><table><thead><tr>${columns.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(cell).join('')}</tr>`).join('')}</tbody></table></div>`;
}

const STYLE = `<style data-topic-learn>
    .tl{--tl-surface:#16181F;--tl-surface2:#1F222B;--tl-border:#2A2E38;--tl-text:#F2F0EA;--tl-muted:#8A8E99;--tl-accent:#FFE34D;--tl-ink:#0E0F13}
    .tl{text-align:left;scroll-margin-top:90px}.tl-in{margin-top:56px}
    .tl h2{font-size:clamp(22px,2.8vw,30px);font-weight:800;margin-bottom:14px;text-align:left;color:var(--tl-text)}
    .tl p{font-size:15px;line-height:1.75;color:#94a3b8;margin:0 0 14px;max-width:none;text-align:left}
    .tl .tl-eyebrow{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--tl-muted);margin-bottom:8px}
    .tl h3{font-size:17px;font-weight:700;color:var(--tl-text);margin:28px 0 10px;text-align:left}
    .tl code{background:var(--tl-surface2);color:var(--tl-text);padding:1px 5px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:13px}
    .tl pre{background:var(--tl-surface);border:1px solid var(--tl-border);border-radius:10px;padding:16px;margin:12px 0;overflow-x:auto;font-family:'JetBrains Mono',monospace;font-size:13px;line-height:1.6;color:var(--tl-text)}
    .tl pre code{background:none;padding:0;font-size:13px}
    .tl-k{color:#7CC4FF;font-weight:700}.tl-s{color:#B5E48C}.tl-n{color:#FFB86C}.tl-c{color:#8A8E99;font-style:italic}
    .tl-table{overflow-x:auto;margin:12px 0;border:1px solid var(--tl-border);border-radius:10px;max-width:100%}
    .tl-table table{border-collapse:collapse;font-family:'JetBrains Mono',monospace;font-size:13px;min-width:100%}
    .tl-table th,.tl-table td{padding:7px 12px;text-align:left;border-bottom:1px solid var(--tl-border);white-space:nowrap;color:var(--tl-text)}
    .tl-table th{color:var(--tl-muted);font-weight:700;background:var(--tl-surface)}
    .tl-table tr:last-child td{border-bottom:none}.tl-null{color:var(--tl-muted)!important;font-style:italic}
    .tl-box{background:var(--tl-surface);border:1px solid var(--tl-border);border-radius:10px;padding:18px;margin:16px 0}
    .tl-box p{margin-bottom:10px}
    .tl-btn{font:inherit;font-size:14px;font-weight:700;color:var(--tl-text);background:transparent;border:1px solid var(--tl-border);border-radius:6px;padding:8px 14px;cursor:pointer;text-decoration:none;display:inline-block}
    .tl-btn:hover{border-color:var(--tl-muted);text-decoration:none}
    .tl-cta{font-size:15px;font-weight:800;color:var(--tl-ink);background:var(--tl-accent);border:none;border-radius:6px;padding:11px 20px;display:inline-block;text-decoration:none}
    .tl-cta:hover{text-decoration:none;filter:brightness(1.05)}
    .tl-editor{width:100%;min-height:150px;background:var(--tl-surface2);color:var(--tl-text);border:1px solid var(--tl-border);border-radius:10px;padding:14px;font-family:'JetBrains Mono',monospace;font-size:13px;line-height:1.6;resize:vertical}
    .tl [hidden]{display:none!important}.tl-editor:focus{outline:2px solid #7CC4FF;outline-offset:1px}
    .tl-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:10px 0}
    .tl-status{font-size:13px;color:var(--tl-muted)}.tl-err{color:#FF6B6B}
    .tl-ladder{list-style:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin:18px 0;padding:0}
    .tl-step{background:var(--tl-surface);border:1px solid var(--tl-border);border-radius:10px;padding:18px;display:flex;flex-direction:column;gap:10px}
    .tl-step h3{margin:0;font-size:16px}.tl-step h3 a{color:var(--tl-text)}
    .tl-step .tl-step-n{font-size:12px;color:var(--tl-muted);font-weight:700;letter-spacing:.06em;text-transform:uppercase}
    .tl-step .tl-go{margin-top:auto}
    .tl-next{list-style:none;padding:0;margin:14px 0}
    .tl-next li{padding:12px 0;border-bottom:1px solid var(--tl-border);font-size:15px;line-height:1.7;color:#94a3b8}
    .tl-next li:last-child{border-bottom:none}.tl-next a{font-weight:700}
  </style>`;

// The "Edit and run" box. Nothing loads until the button is pressed: sql.js
// (the app's own CDN build, 1.8.0) is fetched on the first click only, so the
// page's first paint and LCP do not change. Text kept free of counts on
// purpose (tests/site-counts.test.js reads inline script text as prose).
const RUNNER = `<script>
(function () {
  var SDK = '${SDK_URL}';
  var loading = null;
  function sdk() {
    if (loading) return loading;
    loading = new Promise(function (ok, fail) {
      if (window.initSqlJs) return ok(window.initSqlJs);
      var s = document.createElement('script');
      s.src = SDK; s.async = true; s.crossOrigin = 'anonymous';
      s.onload = function () { ok(window.initSqlJs); };
      s.onerror = function () { loading = null; fail(new Error('Could not load the SQL engine. Check the connection and try again.')); };
      document.head.appendChild(s);
    }).then(function (init) {
      return init({ locateFile: function (f) { return SDK.replace(/[^/]*$/, '') + f; } });
    });
    return loading;
  }
  function cell(v) {
    var td = document.createElement('td');
    if (v === null) { td.className = 'tl-null'; td.textContent = 'NULL'; } else td.textContent = String(v);
    return td;
  }
  function render(out, res) {
    out.innerHTML = '';
    if (!res.length) { out.innerHTML = '<p class="tl-status">The query ran and returned no rows.</p>'; return; }
    var r = res[res.length - 1];
    var wrap = document.createElement('div'); wrap.className = 'tl-table';
    var t = document.createElement('table');
    var hr = document.createElement('tr');
    r.columns.forEach(function (c) { var th = document.createElement('th'); th.textContent = c; hr.appendChild(th); });
    var th = document.createElement('thead'); th.appendChild(hr); t.appendChild(th);
    var tb = document.createElement('tbody');
    r.values.forEach(function (row) { var tr = document.createElement('tr'); row.forEach(function (v) { tr.appendChild(cell(v)); }); tb.appendChild(tr); });
    t.appendChild(tb); wrap.appendChild(t); out.appendChild(wrap);
  }
  document.querySelectorAll('[data-tl-example]').forEach(function (box) {
    var open = box.querySelector('[data-tl-open]');
    var panel = box.querySelector('[data-tl-panel]');
    var ed = box.querySelector('textarea');
    var run = box.querySelector('[data-tl-run]');
    var reset = box.querySelector('[data-tl-reset]');
    var status = box.querySelector('[data-tl-status]');
    var out = box.querySelector('[data-tl-out]');
    var setup = box.getAttribute('data-setup');
    var original = ed.value;
    open.addEventListener('click', function () {
      panel.hidden = false; open.hidden = true; ed.focus();
      sdk().catch(function () {});
    });
    run.addEventListener('click', function () {
      status.className = 'tl-status'; status.textContent = 'Running…';
      sdk().then(function (SQL) {
        var db = new SQL.Database();
        try {
          db.run(setup);
          render(out, db.exec(ed.value));
          status.textContent = 'Ran on the table above. Change the query and run it again.';
        } finally { db.close(); }
      }).catch(function (e) {
        status.className = 'tl-status tl-err';
        status.textContent = (e && e.message) ? e.message : String(e);
      });
    });
    reset.addEventListener('click', function () {
      ed.value = original; out.innerHTML = ''; status.className = 'tl-status'; status.textContent = 'Back to the original query.';
    });
  });
})();
</script>`;

export function renderLearnBlock(slug, bank, qslugs, tags, bankCount) {
  const L = TOPIC_LEARN[slug];
  const ladder = pickLadder(slug, bank);
  const companies = companiesForTopic(slug, bank, tags);
  const src = `topic-learn-${slug}`;
  // The window page is full-width sections (.content); the CTE page is one
  // centred column (.wrap), where the blocks sit inside it.
  const inWrap = PAGE_ANCHOR[slug].inWrap;
  const cls = inWrap ? 'tl tl-in' : 'content tl';
  const pad = inWrap ? '' : ' style="padding-top:0"';
  const steps = ladder.map((c, i) => {
    const a = accessOf(c);
    const q = qslugs.get(c.id);
    const diff = c.difficulty.toLowerCase();
    const title = q ? `<a href="/questions/${q}/">${esc(c.title)}</a>` : esc(c.title);
    // The accent goes on exactly one control: the first step's button.
    const go = a.playable
      ? `<a href="/app/?challenge=${c.id}&amp;src=${src}" class="${i === 0 ? 'tl-cta' : 'tl-btn'} tl-go" data-track="learn_ladder_click" data-track-step="${diff}" data-track-challenge="${c.id}" data-track-topic="${slug}">${i === 0 ? 'Start with this one →' : 'Solve it in the browser →'}</a>`
      : `<a href="/questions/${q}/" class="tl-btn tl-go" data-track="learn_ladder_click" data-track-step="${diff}" data-track-challenge="${c.id}" data-track-topic="${slug}" data-track-access="pro">Read the question (Pro to solve) →</a>`;
    return `      <li class="tl-step" data-ladder-step="${diff}" data-challenge-id="${c.id}">
        <span class="tl-step-n">Step ${i + 1}</span>
        <div><span class="tag ${diff}">${c.difficulty}</span> <span class="tag ${a.cls}">${a.label}</span></div>
        <h3>${title}</h3>
        ${go}
      </li>`;
  }).join('\n');
  const companyLinks = companies.map(c => `<a href="/${c.key}-sql-interview/" data-track="learn_next_step" data-track-target="company-${c.key}" data-track-topic="${slug}">${esc(c.name)}</a>`);
  const companyLine = companyLinks.length
    ? `<li data-next="companies">Company sets where ${esc(L.noun)} questions carry the most weight: ${companyLinks.join(', ')}. Each page lists the set and the topics it leans on.</li>`
    : '';
  const fix = L.mistake.fix
    ? `\n      <pre><code>${highlight(L.mistake.fix)}</code></pre>\n      ${resultTable(L.mistake.fixColumns, L.mistake.fixRows)}`
    : '';
  return `${START}
<section class="${cls}" id="learn" data-topic-learn="${slug}">
  <p class="tl-eyebrow">Learn it in 3 minutes</p>
  <h2 class="fd">${esc(L.heading)}</h2>
  ${L.plain.map(p => `<p>${p}</p>`).join('\n  ')}
  <h3>The syntax</h3>
  <pre><code>${highlight(L.syntax)}</code></pre>
  <h3>A worked example</h3>
  <p>${esc(L.tableNote)} The table <code>${esc(L.table)}</code>:</p>
  ${resultTable(L.tableColumns, L.tableRows)}
  <p>${esc(L.task)}</p>
  <div class="tl-box" data-tl-example data-setup="${esc(L.setup)}">
    <pre><code>${highlight(L.query)}</code></pre>
    <p class="tl-status">Result:</p>
    ${resultTable(L.columns, L.rows)}
    <p>${L.reading}</p>
    <button type="button" class="tl-btn" data-tl-open>Edit and run this query</button>
    <div data-tl-panel hidden>
      <textarea class="tl-editor" spellcheck="false" aria-label="SQL query">${esc(L.query)}</textarea>
      <div class="tl-row">
        <button type="button" class="tl-btn" data-tl-run data-track="learn_example_run" data-track-topic="${slug}">Run</button>
        <button type="button" class="tl-btn" data-tl-reset>Reset</button>
        <span class="tl-status" data-tl-status aria-live="polite">Runs in your browser on the table above.</span>
      </div>
      <div data-tl-out></div>
    </div>
  </div>
  <h3>A common mistake: ${esc(L.mistake.title.charAt(0).toLowerCase() + L.mistake.title.slice(1))}</h3>
  <p>${L.mistake.body}</p>${fix}
  <p><a href="${L.mistake.link.href}" data-track="learn_next_step" data-track-target="mistake" data-track-topic="${slug}">${esc(L.mistake.link.label)} →</a></p>
</section>
<section class="${cls}" id="practice-ladder"${pad}>
  <p class="tl-eyebrow">Now try it</p>
  <h2 class="fd">Three steps, from Easy to Hard</h2>
  <p>Real questions from the bank, in the order the learning path takes them. Each opens in the browser with the dataset loaded.</p>
  <ol class="tl-ladder">
${steps}
  </ol>
</section>
<section class="${cls}" id="next-step"${pad}>
  <p class="tl-eyebrow">The next step</p>
  <h2 class="fd">From one topic to the interview</h2>
  <ul class="tl-next">
    <li data-next="readiness"><a href="/sql-interview-readiness-test/" data-track="learn_next_step" data-track-target="readiness" data-track-topic="${slug}">Take the SQL interview readiness test →</a> Ten questions, no signup: it scores all nine skills and names the weakest.</li>
    ${companyLine}
    <li data-next="free-tier">${esc(freeTierSentence(bankCount))} <a href="/#pricing" data-track="learn_next_step" data-track-target="pricing" data-track-topic="${slug}">See the plans →</a></li>
  </ul>
</section>
${RUNNER}
${END}`;
}

// Where the block goes the first time: right after the hero's call to action,
// above every existing challenge list.
export const PAGE_ANCHOR = {
  'window-functions': { after: 'class="cta-main">Start Practicing Free →</a>\n</div>\n', inWrap: false },
  cte: { after: 'class="cta">Start Practicing Free →</a>\n', inWrap: true },
};

/** Insert the block after the page's anchor (first run) or replace it (every run after). */
export function injectLearnBlock(html, block, slug) {
  const re = new RegExp(`${START}[\\s\\S]*?${END}`);
  let out;
  if (re.test(html)) out = html.replace(re, () => block);
  else {
    const anchor = PAGE_ANCHOR[slug].after;
    const at = html.indexOf(anchor);
    if (at < 0) throw new Error(`topic-learn: anchor not found on ${slug}`);
    const end = at + anchor.length;
    out = `${html.slice(0, end)}${block}\n${html.slice(end)}`;
  }
  return withLearnStyleInHead(out);
}

// The block's <style> lives in <head> (html-validate, #333: a <style> under
// <body> or a <div> is not permitted content). One copy, refreshed each run.
const STYLE_RE = /<style data-topic-learn>[\s\S]*?<\/style>\n?/g;
export function withLearnStyleInHead(html) {
  const out = html.replace(STYLE_RE, '');
  const i = out.indexOf('</head>');
  if (i < 0) return out;
  return `${out.slice(0, i)}${STYLE}\n${out.slice(i)}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { bank, tags } = loadQuestionBank();
  const qslugs = questionSlugs(bank);
  const { collectBankFacts } = await import('./build-llms-txt.js');
  const bankCount = collectBankFacts(ROOT).challengeCount;
  for (const slug of Object.keys(TOPIC_LEARN)) {
    const file = path.join(ROOT, 'src/challenges', `${slug}.html`);
    const before = fs.readFileSync(file, 'utf8');
    const after = injectLearnBlock(before, renderLearnBlock(slug, bank, qslugs, tags, bankCount), slug);
    if (after !== before) fs.writeFileSync(file, after);
  }
  console.log(`[topic-learn] ${Object.keys(TOPIC_LEARN).join(', ')}`);
}
