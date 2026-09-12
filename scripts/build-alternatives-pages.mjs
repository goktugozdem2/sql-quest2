#!/usr/bin/env node
/**
 * Neutral "alternatives" pages — /datalemur-alternatives/ and
 * /stratascratch-alternatives/ (founder's SEO plan 2026-09-13, P2.14).
 *
 * Every competitor fact comes from docs/reads/alternatives-facts-2026-09-13.md,
 * where each was read off the vendor's own page on 2026-09-13 with the URL
 * beside it. Nothing here is from memory. Prices carry the date on the page;
 * promotions are called promotions. Counts WE made from a vendor's data are not
 * quoted as their claims. SQL Quest's own numbers are computed from the bank at
 * build time, and the page says what SQL Quest is worse at.
 *
 * Writes src/<slug>.html. Run: node scripts/build-alternatives-pages.mjs
 * (part of `npm run build`; tests/alternatives-pages.test.js checks freshness).
 */

import fs from 'node:fs';
import path from 'node:path';
import { loadQuestionBank } from './question-slugs.mjs';
import { isFreePreview } from '../src/utils/challenge-order.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE = 'https://sqlquest.app';
const CHECKED = '2026-09-13';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function sqlQuestFacts() {
  const { bank } = loadQuestionBank();
  const free = bank.filter(c => c.difficulty !== 'Hard' || isFreePreview(c)).length;
  const companies = fs.readdirSync(path.join(ROOT, 'src')).filter(f => /-sql-interview\.html$/.test(f)).length;
  return { n: bank.length, free, companies };
}

// One row per tool. `free`, `paid`, `bank`, `dialects` are the vendor's own
// wording where quoted. `favour` is what a fair page concedes.
export function tools(sq) {
  return {
    datalemur: {
      name: 'DataLemur', url: 'https://datalemur.com/', src: 'https://datalemur.com/pricing',
      free: 'Free questions and a free SQL tutorial; the number of free questions is not stated',
      paid: '$15/month, $60/year, or $300 one-time (coaching call, signed book, lifetime access)',
      bank: '"100+ SQL Interview questions" on the monthly and yearly plans; "250+ interview questions" with lifetime access',
      dialects: 'PostgreSQL 14, MySQL',
      best: 'Company-attributed SQL interview questions with hints and written solutions, from the author of Ace the Data Science Interview, at the lowest monthly price here.',
      favour: ['The cheapest paid interview-practice plan on this page', 'Python, statistics and ML questions as well as SQL', 'Both PostgreSQL and MySQL in the editor', 'Discussion and submissions tabs on each question'],
      instead: 'you want AI feedback, a timed mode or a very large bank — none of the three is on its pages.',
    },
    stratascratch: {
      name: 'StrataScratch', url: 'https://www.stratascratch.com/', src: 'https://platform.stratascratch.com/pricing',
      free: 'Free plan with "75+" coding questions (all languages), free SQL and Python learning paths, "No credit card required"',
      paid: '$19/month; $97.30/year or $202.30 lifetime on a 30%-off promotion running on the day (list $139 and $289); 5-day money-back guarantee',
      bank: '"1000+ coding questions (SQL, Python, R)"; "500+ ML, stats, system design questions"',
      dialects: 'Postgres, MySQL, MSSQL, Oracle (plus Pandas, Polars, PySpark, R)',
      best: 'Data science, ML and AI engineering candidates who want SQL and Python alongside concept questions, take-home projects and AI mock interviews.',
      favour: ['The largest coding bank of the SQL-first tools here', 'The widest dialect choice: four SQL engines plus Pandas, Polars, PySpark and R', 'User solutions and community discussion', 'A lifetime option and a 5-day refund'],
      instead: 'you only need SQL and want most of the practice free — the free plan is "75+" questions across every language.',
    },
    leetcode: {
      name: 'LeetCode (SQL 50 and Database set)', url: 'https://leetcode.com/studyplan/top-sql-50/', src: 'https://leetcode.com/subscribe/',
      free: 'The SQL 50 study plan ("50 essential SQL questions", every one free when we checked) and part of the Database set; running code needs an account',
      paid: 'Premium $35/month or $159/year ("Prices are marked in USD")',
      bank: '"50 essential SQL questions" in SQL 50, "Basic to intermediate SQL topics"; a larger Database problem set, much of it Premium',
      dialects: 'MySQL, MS SQL Server, PostgreSQL, Oracle (plus Pandas)',
      best: 'People already using LeetCode for coding interviews who want a free, structured 50-question SQL plan in the same place.',
      favour: ['SQL 50 costs nothing', 'Four SQL dialects', 'A very large community and discussion on every problem', 'Company tags and timed interview simulations with Premium'],
      instead: 'you want explanations of why a query is wrong, or practice beyond basic-to-intermediate without Premium.',
    },
    hackerrank: {
      name: 'HackerRank (SQL track)', url: 'https://www.hackerrank.com/domains/sql', src: 'https://www.hackerrank.com/',
      free: 'Free with an account ("Create a free account")',
      paid: 'No candidate price on the practice pages',
      bank: 'Subdomains from Basic Select to Advanced Join; no total stated on the page',
      dialects: 'MySQL, Oracle, T-SQL, DB2',
      best: 'Free, short graded SQL exercises, skill certificates, and practice on the platform many employers use for screening.',
      favour: ['Free to practise', 'Four engines including Oracle and DB2', 'Certification', 'The same platform many screens run on'],
      instead: 'you are past the basics and want interview-shaped analytics questions rather than short exercises.',
    },
    sqlpad: {
      name: 'SQLPad', url: 'https://sqlpad.io/', src: 'https://sqlpad.io/pricing/',
      free: 'A sample question runs without logging in ("You can practice this sample without logging in"); most of the list is locked',
      paid: 'SQL & R plan $99/month, or $79/month on quarterly billing; one-time annual pass $599',
      bank: '"230+ Interview-style coding questions"; "23+ Company-focused question sets"',
      dialects: 'Postgres, MySQL (plus Python, R)',
      best: 'SQL plus R and Python practice with company-focused sets, for people comfortable with a course-style price.',
      favour: ['You can run SQL before creating an account', 'R support, which is rare', 'Company-focused sets', 'A one-time annual pass'],
      instead: 'price matters — it is the most expensive SQL plan on this page.',
    },
    analystbuilder: {
      name: 'Analyst Builder', url: 'https://www.analystbuilder.com/', src: 'https://www.analystbuilder.com/pricing',
      free: 'Free plan, "$0 forever", "no card needed", with free questions and explanation videos',
      paid: '$34/month or $249/year',
      bank: '"200+ Practice questions built to mirror the real job" ("100+ technical", "100+ general")',
      dialects: 'MySQL, PostgreSQL, MSSQL (plus Python, R)',
      best: 'Aspiring data analysts who want courses (SQL, Excel, Tableau, Power BI, Python) and practice questions on one subscription.',
      favour: ['A permanent free plan', 'A video explanation for each question', 'Three SQL dialects', 'Full courses beyond SQL'],
      instead: 'you want to drill SQL interview questions specifically rather than learn the analyst toolkit.',
    },
    interviewquery: {
      name: 'Interview Query', url: 'https://www.interviewquery.com/', src: 'https://www.interviewquery.com/pricing',
      free: '"Take the data science challenge for free!"; free-tier contents not stated',
      paid: 'Not shown when we checked — the pricing page did not render prices',
      bank: '"1000+ authentic questions" on the pricing page, "500+ real questions" on the homepage',
      dialects: 'Not stated',
      best: 'Data science candidates who want SQL next to product sense, statistics, ML, take-homes and company interview guides.',
      favour: ['Broad data-science coverage beyond SQL', 'Company interview guides', 'Take-home challenges', 'Peer mock interviews, an AI interviewer and human coaching'],
      instead: 'you need a clear price before signing up, or SQL-only depth.',
    },
    sqlquest: {
      name: 'SQL Quest', url: `${SITE}/`, src: `${SITE}/`, ours: true,
      free: `${sq.free} of ${sq.n} questions (every Easy and Medium plus the Hard previews) run free in the browser with no signup; the Coach, the Skillmap and a daily AI tutor allowance are free`,
      paid: 'Pro $29/month or $99/year',
      bank: `${sq.n} SQL questions; company practice sets on ${sq.companies} company pages`,
      dialects: 'SQLite, in the browser',
      best: 'SQL interview practice that finds your weakest skill — a Skillmap across nine SQL skills — and builds the next question around it, with a diagnosis of which rows a wrong answer got wrong.',
      favour: [`A free tier of ${sq.free} questions that needs no account`, 'Wrong answers are diagnosed, not just marked', 'Practice ordered by your weakest skill', 'A free readiness test and free query tools'],
      against: ['A smaller bank than StrataScratch, LeetCode or DataInterview', 'SQL only: no Python, R or ML questions', 'One dialect (SQLite), where others offer four', 'A younger product with a smaller community'],
      instead: 'you need Python or ML prep, or to practise in a specific dialect such as SQL Server or Oracle.',
    },
    beginners: {
      name: 'SQLBolt, SQLZoo and PostgreSQL Exercises', url: 'https://sqlbolt.com/', src: 'https://pgexercises.com/',
      free: 'No price, paywall or signup shown on any of the three',
      paid: 'None shown',
      bank: 'SQLBolt: lessons 1–18 with an exercise each; SQLZoo: numbered tutorials plus assessments of "15 questions graded easy, medium and hard"; PostgreSQL Exercises: one dataset from simple selects to recursive queries',
      dialects: 'SQLBolt and SQLZoo: not stated for the in-browser engine; PostgreSQL Exercises: real PostgreSQL',
      best: 'Learning SQL from zero, before interview practice makes sense.',
      favour: ['No account and no cost', 'The gentlest on-ramp on this page', 'PostgreSQL Exercises runs real Postgres under an open licence'],
      instead: 'you already know SQL and are preparing for an interview.',
    },
  };
}

const PAGES = {
  'datalemur-alternatives': {
    subject: 'datalemur',
    title: 'DataLemur Alternatives (2026): SQL Interview Practice Sites Compared',
    h1: 'DataLemur alternatives',
    description: 'A neutral comparison of DataLemur alternatives for SQL interview practice — StrataScratch, LeetCode SQL 50, HackerRank, SQLPad, Analyst Builder, Interview Query, SQL Quest — with prices and free tiers read off each site on 2026-09-13.',
    why: 'DataLemur is a good product at a low price. People look for alternatives for one of four reasons: they want more questions, a bigger free tier, Python or ML practice alongside SQL, or feedback on why a query is wrong. The table says which alternative answers which.',
    order: ['stratascratch', 'leetcode', 'sqlquest', 'hackerrank', 'analystbuilder', 'sqlpad', 'interviewquery', 'beginners'],
    pick: [
      ['More questions and Python', 'stratascratch'],
      ['Free and structured', 'leetcode'],
      ['A diagnosis of your weakest skill, mostly free', 'sqlquest'],
      ['The analyst toolkit beyond SQL', 'analystbuilder'],
      ['Data science breadth and company guides', 'interviewquery'],
    ],
  },
  'stratascratch-alternatives': {
    subject: 'stratascratch',
    title: 'StrataScratch Alternatives (2026): SQL Interview Practice Sites Compared',
    h1: 'StrataScratch alternatives',
    description: 'A neutral comparison of StrataScratch alternatives for SQL interview practice — DataLemur, LeetCode SQL 50, HackerRank, SQLPad, Analyst Builder, Interview Query, SQL Quest — with prices and free tiers read off each site on 2026-09-13.',
    why: 'StrataScratch has the biggest coding bank of the SQL-first sites and the widest choice of dialects. People look for alternatives when they want a lower price, a bigger free tier for SQL alone, a narrower SQL focus, or practice that tells them which skill to fix first. The table says which alternative answers which.',
    order: ['datalemur', 'leetcode', 'sqlquest', 'hackerrank', 'analystbuilder', 'sqlpad', 'interviewquery', 'beginners'],
    pick: [
      ['The lowest paid price', 'datalemur'],
      ['Free and structured', 'leetcode'],
      ['A diagnosis of your weakest skill, mostly free', 'sqlquest'],
      ['The analyst toolkit beyond SQL', 'analystbuilder'],
      ['Data science breadth and company guides', 'interviewquery'],
    ],
  },
};

const CSS = `*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{background:#06060f;color:#e2e8f0;font-family:'DM Sans',sans-serif;line-height:1.65}
a{color:#c084fc;text-decoration:none}a:hover{text-decoration:underline}.fd{font-family:'Space Grotesk',sans-serif}
.nav{border-bottom:1px solid rgba(255,255,255,.06)}.ni{max-width:1100px;margin:0 auto;padding:14px 24px;display:flex;align-items:center;justify-content:space-between}
.wrap{max-width:960px;margin:0 auto;padding:36px 24px 64px}.crumb{font-size:13px;color:#8b98ab;margin-bottom:14px}.crumb a{color:#8b98ab}
h1{font-size:clamp(30px,4.4vw,46px);font-weight:800;line-height:1.12;margin-bottom:14px}h2{font-size:23px;font-weight:800;margin:44px 0 12px}h3{font-size:18px;font-weight:800;margin-bottom:6px}
p{color:#94a3b8;font-size:16px}.lede{font-size:17px;max-width:760px}
.disc{margin:18px 0;padding:14px 18px;border:1px solid rgba(124,196,255,.25);background:rgba(124,196,255,.06);border-radius:12px;font-size:14px;color:#cbd5e1}
.tw{overflow-x:auto;border:1px solid rgba(255,255,255,.08);border-radius:12px}table{border-collapse:collapse;width:100%;min-width:820px;font-size:13.5px}
th,td{padding:10px 12px;text-align:left;vertical-align:top;border-bottom:1px solid rgba(255,255,255,.06)}th{color:#e2e8f0;font-weight:700;background:rgba(255,255,255,.03)}td{color:#94a3b8}td:first-child{color:#e2e8f0;font-weight:700;white-space:nowrap}
tr.ours td{background:rgba(124,58,237,.06)}
.tool{background:rgba(10,10,25,.55);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:20px 22px;margin:14px 0}
.tool ul{margin:8px 0 0 18px;color:#94a3b8;font-size:15px}.tool li{margin:3px 0}.src{font-size:12px;color:#8b98ab;margin-top:10px}
.pick{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}.pick a{display:block;background:rgba(10,10,25,.5);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:14px 16px;color:#e2e8f0}
.pick a span{display:block;font-size:13px;color:#94a3b8}.pick a:hover{text-decoration:none;border-color:rgba(124,58,237,.35)}
.btn{display:inline-flex;border-radius:12px;font-weight:700;padding:12px 22px;font-size:15px;background:#FFE34D;color:#0E0F13}.btn:hover{text-decoration:none}
.faq h3{font-size:16px;margin:18px 0 6px}.rel{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}.rel a{border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:10px 14px;font-size:14px;color:#94a3b8}
.ft{border-top:1px solid rgba(255,255,255,.06);padding:30px 24px;text-align:center;font-size:13px;color:#7f8da1}`;

export function renderAlternatives(slug) {
  const pg = PAGES[slug];
  const sq = sqlQuestFacts();
  const T = tools(sq);
  const subject = T[pg.subject];
  const url = `${SITE}/${slug}/`;
  const list = pg.order.map(k => [k, T[k]]);
  const faq = [
    [`What is the best free alternative to ${subject.name}?`, `For a structured free plan, LeetCode's SQL 50 (it needs an account to run code). For the largest free tier that needs no account, SQL Quest: ${sq.free} of its ${sq.n} questions run free in the browser. For learning from zero, SQLBolt or SQLZoo.`],
    [`Is there an alternative to ${subject.name} with Python questions?`, pg.subject === 'stratascratch' ? 'DataLemur, SQLPad, Analyst Builder and Interview Query all cover Python as well as SQL, according to their own pages. SQL Quest and HackerRank\'s SQL track are SQL only.' : 'StrataScratch has the largest Python bank alongside SQL. SQLPad, Analyst Builder and Interview Query also cover Python, according to their own pages. SQL Quest is SQL only.'],
    ['How were these prices checked?', `Each price and free tier was read off the vendor's own pricing page on ${CHECKED}, and the page is linked under each tool. Prices change and some sites localise them, so check the vendor's page before you pay. Promotions running on the day are labelled as promotions.`],
    ['Who wrote this comparison?', 'The team that builds SQL Quest, which is one of the alternatives listed. That is why the SQL Quest section lists what it is worse at, and why no competitor fact on this page is from memory.'],
  ];
  const ld = [
    { '@context': 'https://schema.org', '@type': 'Article', headline: pg.title, description: pg.description, url, datePublished: CHECKED, dateModified: CHECKED, author: { '@type': 'Organization', name: 'SQL Quest', url: `${SITE}/` } },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'SQL Quest', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Comparisons', item: `${SITE}/sql-practice-comparison/` },
      { '@type': 'ListItem', position: 3, name: pg.h1, item: url },
    ] },
    { '@context': 'https://schema.org', '@type': 'ItemList', name: pg.h1, itemListElement: list.map(([, t], i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, url: t.url })) },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];
  const row = (k, t) => `<tr${t.ours ? ' class="ours"' : ''}><td>${esc(t.name)}</td><td>${esc(t.free)}</td><td>${esc(t.paid)}</td><td>${esc(t.bank)}</td><td>${esc(t.dialects)}</td></tr>`;
  const card = (k, t) => `  <section class="tool" id="${k}">
    <h3 class="fd">${esc(t.name)}${t.ours ? ' <span style="font-size:12px;color:#7CC4FF;font-weight:700;">— ours</span>' : ''}</h3>
    <p><strong style="color:#e2e8f0;">Best for:</strong> ${esc(t.best)}</p>
    <ul>${t.favour.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
    ${t.against ? `<p style="margin-top:10px;"><strong style="color:#e2e8f0;">Where it is weaker:</strong></p><ul>${t.against.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
    <p style="margin-top:10px;"><strong style="color:#e2e8f0;">Look elsewhere if</strong> ${esc(t.instead)}</p>
    <p class="src">${t.ours ? `Our figures are counted from the question bank when this page is built.` : `Source: <a href="${t.src}" rel="nofollow noopener">${esc(t.src.replace(/^https?:\/\//, ''))}</a>, checked ${CHECKED}.`}</p>
  </section>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <!-- GENERATED by scripts/build-alternatives-pages.mjs from docs/reads/alternatives-facts-2026-09-13.md — do not edit. -->
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(pg.title)}</title>
  <meta name="description" content="${esc(pg.description)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="SQL Quest">
  <meta property="og:title" content="${esc(pg.title)}">
  <meta property="og:description" content="${esc(pg.description)}">
  <meta property="og:image" content="${SITE}/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
${ld.map(o => `  <script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n')}
  <script defer src="/_vercel/insights/script.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Space+Grotesk:wght@600;700;800&display=swap" rel="stylesheet">
  <style>${CSS}</style>
</head>
<body>
<nav class="nav"><div class="ni"><a href="/" class="fd" style="color:#e2e8f0;font-weight:800;font-size:18px;">SQL Quest</a><a href="/sql-practice-comparison/" style="font-size:14px;">All comparisons</a></div></nav>
<main class="wrap">
  <p class="crumb"><a href="/">SQL Quest</a> › <a href="/sql-practice-comparison/">Comparisons</a> › ${esc(pg.h1)}</p>
  <h1 class="fd">${esc(pg.h1)}: SQL interview practice sites compared</h1>
  <p class="lede">${esc(pg.why)}</p>
  <p class="disc"><strong>Who wrote this:</strong> the team that builds SQL Quest, which is one of the alternatives below. Every price, free tier and question count for another site was read off that site's own page on ${CHECKED} and is linked beside it. Where a site did not state something, this page says so rather than guessing.</p>

  <h2 class="fd">${esc(subject.name)} in one paragraph</h2>
  <p>${esc(subject.best)} Pricing on ${CHECKED}: ${esc(subject.paid)}. Free: ${esc(subject.free)}. Engines: ${esc(subject.dialects)}. <a href="${subject.src}" rel="nofollow noopener">Source</a>.</p>
  <p style="margin-top:8px;">What it does well: ${esc(subject.favour.join('; '))}.</p>

  <h2 class="fd">Pick by what you need</h2>
  <div class="pick">${pg.pick.map(([need, k]) => `<a href="#${k}">${esc(need)}<span>${esc(T[k].name)}</span></a>`).join('')}</div>

  <h2 class="fd">The alternatives side by side</h2>
  <div class="tw"><table>
    <thead><tr><th>Site</th><th>Free tier</th><th>Paid (checked ${CHECKED})</th><th>Question bank, in the site's words</th><th>SQL engines</th></tr></thead>
    <tbody>${row(pg.subject, subject)}${list.map(([k, t]) => row(k, t)).join('')}</tbody>
  </table></div>
  <p style="font-size:13px;margin-top:8px;">Prices were seen from a connection outside the US; LeetCode states its prices are in USD, the others show $ without naming a currency. Promotions running on the day are labelled.</p>

  <h2 class="fd">Each alternative, honestly</h2>
${list.map(([k, t]) => card(k, t)).join('\n')}

  <div class="tool" style="margin-top:30px;text-align:center;">
    <p class="fd" style="font-size:20px;font-weight:800;color:#e2e8f0;margin-bottom:6px;">Not sure what you need yet?</p>
    <p style="margin-bottom:14px;">Ten questions, no signup: a Skillmap across joins, window functions, aggregation and the rest, and the one skill to fix first — whichever site you practise on afterwards.</p>
    <a class="btn" href="/sql-interview-readiness-test/" data-track="cta_alternatives_readiness_${pg.subject}">Check my interview readiness</a>
  </div>

  <section class="faq">
    <h2 class="fd">Questions</h2>
${faq.map(([q, a]) => `    <h3>${esc(q)}</h3>\n    <p>${esc(a)}</p>`).join('\n')}
  </section>

  <h2 class="fd">Related comparisons</h2>
  <div class="rel">
    <a href="/vs-${pg.subject}/">SQL Quest vs ${esc(subject.name)}</a>
    <a href="/${pg.subject === 'datalemur' ? 'stratascratch' : 'datalemur'}-alternatives/">${pg.subject === 'datalemur' ? 'StrataScratch' : 'DataLemur'} alternatives</a>
    <a href="/vs-leetcode-sql/">SQL Quest vs LeetCode SQL</a>
    <a href="/best-sql-practice-sites/">Best SQL practice sites</a>
    <a href="/sql-tools/">Free SQL tools</a>
  </div>
</main>
<footer class="ft">SQL Quest — personalized SQL interview practice · <a href="/sql-practice-comparison/">All comparisons</a> · <a href="/questions/">SQL interview questions</a> · <a href="/privacy/">Privacy</a></footer>
</body>
</html>
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const slug of Object.keys(PAGES)) fs.writeFileSync(path.join(ROOT, 'src', `${slug}.html`), renderAlternatives(slug));
  console.log(`[alternatives] ${Object.keys(PAGES).join(', ')}`);
}

export { PAGES };
