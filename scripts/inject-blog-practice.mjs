#!/usr/bin/env node
/**
 * Blog → practice (founder's SEO plan, 2026-09-13, P0.6: "a visitor from
 * search should not end up reading a blog post"). Every post gets one box
 * right under its meta line: practise the topic in the browser, or check
 * interview readiness. Idempotent (markers). Measured reason: editorial doors
 * converted at ~9% to a first solve against 29–37% for practice-shaped doors
 * (docs/reads/editorial-vs-practice-doors-2026-09-09.md).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'src/blog');
const START = '<!-- blog-practice:start -->';
const END = '<!-- blog-practice:end -->';

// slug fragment → [topic page, label]; first match wins.
const TOPIC = [
  [/window|rank|running-total/, ['/challenges/window-functions/', 'window function']],
  [/cte|recursive/, ['/challenges/cte/', 'CTE']],
  [/join|anti-join/, ['/challenges/joins/', 'JOIN']],
  [/group-by|where-vs-having/, ['/challenges/aggregation/', 'GROUP BY']],
  [/case-when/, ['/challenges/case-when/', 'CASE WHEN']],
  [/null/, ['/challenges/null-handling/', 'NULL handling']],
  [/capital-one/, ['/capital-one-sql-interview/', 'Capital One']],
  [/fraud/, ['/fraud-analytics-sql/', 'fraud analytics']],
];

let n = 0;
for (const f of fs.readdirSync(DIR).filter(x => x.endsWith('.html') && x !== 'index.html')) {
  const slug = f.replace(/\.html$/, '');
  const file = path.join(DIR, f);
  let html = fs.readFileSync(file, 'utf8');
  html = html.replace(new RegExp(`${START}[\\s\\S]*?${END}\\n?`), '');
  const tr = /-nedir$/.test(slug);
  const [href, label] = (TOPIC.find(([re]) => re.test(slug)) || [null, ['/sql-exercises/', 'SQL']])[1];
  const box = tr
    ? `${START}
  <p style="margin:18px 0 26px;padding:14px 18px;border:1px solid rgba(124,58,237,.3);border-radius:12px;background:rgba(124,58,237,.07);font-size:15px;line-height:1.7;">Okumak yerine yazarak öğren: <a href="${href}" data-track="cta_blog_practice" style="color:#c084fc;font-weight:700;">tarayıcıda pratik yap →</a> · <a href="/sql-interview-readiness-test/" data-track="cta_blog_readiness" style="color:#c084fc;font-weight:700;">mülakata ne kadar hazırsın?</a></p>
  ${END}`
    : `${START}
  <p style="margin:18px 0 26px;padding:14px 18px;border:1px solid rgba(124,58,237,.3);border-radius:12px;background:rgba(124,58,237,.07);font-size:15px;line-height:1.7;">Skip ahead to practice: <a href="${href}" data-track="cta_blog_practice" style="color:#c084fc;font-weight:700;">solve ${label} questions in the browser →</a> · or <a href="/sql-interview-readiness-test/" data-track="cta_blog_readiness" style="color:#c084fc;font-weight:700;">check your SQL interview readiness</a> (10 questions, no signup).</p>
  ${END}`;
  const meta = html.indexOf('<div class="article-meta">');
  let at = -1;
  if (meta >= 0) at = html.indexOf('</div>', meta) + '</div>'.length;
  else { const h1 = html.indexOf('</h1>'); if (h1 >= 0) at = h1 + '</h1>'.length; }
  if (at < 0) { console.warn(`  no anchor in ${f}`); continue; }
  html = html.slice(0, at) + '\n  ' + box + html.slice(at);
  fs.writeFileSync(file, html);
  n++;
}
console.log(`[blog-practice] ${n} posts`);
