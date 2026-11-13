// Question pages (/questions/<slug>/) and the generated topic pages — SEO plan
// 2026-09-13, P1.7–P1.9. What must never drift:
//   - one page per challenge in the bank, and the sitemap lists exactly those;
//   - no reference solution is ever published on a question page, and a Pro
//     challenge's hint stays in the app;
//   - the files on disk are what the generators produce today (a stale page
//     after a bank edit fails here, not in Search Console a month later);
//   - every link the pages make into /questions/ resolves.
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadQuestionBank, questionSlugs, slugify } from '../scripts/question-slugs.mjs';
import { renderTopic, EXTRA_TOPIC_SPECS } from '../scripts/build-topic-extra.mjs';
import { isFreePreview } from '../src/utils/challenge-order.js';
import { readPrune } from '../scripts/apply-seo-prune.mjs';
import { questionSnippet, questionTask, isSpecSentence, QUESTION_TITLE_MAX, QUESTION_DESC_MIN, QUESTION_DESC_MAX } from '../scripts/build-question-pages.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const QDIR = path.join(ROOT, 'public/questions');
let bank; let slugs;

beforeAll(() => {
  bank = loadQuestionBank().bank;
  slugs = questionSlugs(bank);
});

const pageOf = c => fs.readFileSync(path.join(QDIR, slugs.get(c.id), 'index.html'), 'utf8');
const norm = s => s.replace(/\s+/g, ' ').trim();
const plainHint = s => String(s).replace(/\*\*|`/g, '').replace(/\s+/g, ' ').trim();

describe('question slugs', () => {
  it('are unique, URL-safe and cover every challenge', () => {
    const all = [...slugs.values()];
    expect(all.length).toBe(bank.length);
    expect(new Set(all).size).toBe(all.length);
    for (const s of all) expect(s).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it('slugify drops punctuation and accents', () => {
    expect(slugify("Second-Highest Salary (DENSE_RANK)")).toBe('second-highest-salary-dense-rank');
    expect(slugify("Customers' Café Orders")).toBe('customers-cafe-orders');
  });
});

describe('question pages', () => {
  it('one page per challenge plus the hub, nothing else', () => {
    const dirs = fs.readdirSync(QDIR).filter(f => fs.statSync(path.join(QDIR, f)).isDirectory());
    expect(dirs.sort()).toEqual([...slugs.values()].sort());
    expect(fs.existsSync(path.join(QDIR, 'index.html'))).toBe(true);
  });

  it('never publishes a reference solution', () => {
    const leaks = [];
    for (const c of bank) {
      const sol = norm(String(c.solution || ''));
      if (sol.length < 40) continue;
      const html = norm(pageOf(c).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/<[^>]+>/g, ' '));
      if (html.includes(sol.slice(0, 60))) leaks.push(c.id);
    }
    expect(leaks).toEqual([]);
  });

  it('shows the hint only for challenges a free user can play', () => {
    const wrong = [];
    for (const c of bank) {
      const free = c.difficulty !== 'Hard' || isFreePreview(c);
      const html = pageOf(c);
      const proLine = html.includes('This is a Pro challenge');
      if (free === proLine) wrong.push(c.id);
      if (!free && c.hint && c.hint.length > 30 && !String(c.description).includes(c.hint.slice(0, 30)) && html.includes(c.hint.slice(0, 30).replace(/&/g, '&amp;'))) wrong.push(c.id);
    }
    expect(wrong).toEqual([]);
  });

  it('each page has a canonical to itself, the app link for its own id, and both JSON-LD blocks', () => {
    for (const c of bank) {
      const html = pageOf(c);
      const slug = slugs.get(c.id);
      expect(html).toContain(`<link rel="canonical" href="https://sqlquest.app/questions/${slug}/">`);
      expect(html).toContain(`/app/?challenge=${c.id}&amp;src=question-${slug}`);
      expect(html).toContain('"@type":"BreadcrumbList"');
      expect(html).toContain('"@type":"LearningResource"');
    }
  });

  it('the sitemap lists exactly the question pages and the hub', () => {
    const xml = fs.readFileSync(path.join(ROOT, 'public/sitemap.xml'), 'utf8');
    const listed = [...xml.matchAll(/<loc>https:\/\/sqlquest\.app\/questions\/([^<]*)<\/loc>/g)].map(m => m[1]);
    const pruned = new Set(readPrune(ROOT).noindex);
    const want = ['', ...[...slugs.values()].map(s => `${s}/`)].filter(x => !pruned.has(`/questions/${x}`));
    expect(listed.sort()).toEqual(want.sort());
  });

  it('every /questions/ link on the site resolves', () => {
    const files = [
      ...fs.readdirSync(path.join(ROOT, 'src')).filter(f => f.endsWith('.html')).map(f => path.join(ROOT, 'src', f)),
      ...fs.readdirSync(path.join(ROOT, 'src/challenges')).map(f => path.join(ROOT, 'src/challenges', f)),
    ];
    const bad = [];
    for (const f of files) {
      for (const m of fs.readFileSync(f, 'utf8').matchAll(/href="\/questions\/([a-z0-9-]+)\/"/g)) {
        if (!fs.existsSync(path.join(QDIR, m[1], 'index.html'))) bad.push(`${path.basename(f)} → ${m[1]}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

// The snippet template (2026-11-13), after the pre-registered 10-27 read:
// 4,490 impressions at position 7.6, 0.65% CTR (seo-october plan §3). Read
// 2026-12-15 on the same 28-day window: CTR >= 1.5% at unchanged position.
describe('question page snippet', () => {
  const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const head = html => {
    const h = html.slice(0, html.indexOf('</head>'));
    const get = re => { const m = re.exec(h); return m ? decode(m[1]) : null; };
    return {
      title: get(/<title>([^<]*)<\/title>/), description: get(/<meta name="description" content="([^"]*)"/),
      og: get(/<meta property="og:title" content="([^"]*)"/), ogDesc: get(/<meta property="og:description" content="([^"]*)"/),
    };
  };

  it('every page carries the brand and fits the visible window', () => {
    const bad = [];
    for (const c of bank) {
      const h = head(pageOf(c));
      if (!h.title || h.title.length > QUESTION_TITLE_MAX || !h.title.endsWith(' | SQLQuest.app')) bad.push(`#${c.id} title: ${h.title}`);
      if (!h.description || h.description.length < QUESTION_DESC_MIN || h.description.length > QUESTION_DESC_MAX) bad.push(`#${c.id} description (${h.description && h.description.length}): ${h.description}`);
      if (h.og !== h.title || h.ogDesc !== h.description) bad.push(`#${c.id} og fields differ from the snippet`);
    }
    expect(bad, bad.slice(0, 10).join('\n')).toEqual([]);
  });

  it('is what the template produces, and never states a free count or quotes the hint or solution', () => {
    const bad = [];
    for (const c of bank) {
      const { title, description } = questionSnippet(c);
      const h = head(pageOf(c));
      if (h.title !== title || h.description !== description) bad.push(`#${c.id} built page is stale`);
      if (/\d+\+?\s+free\b|\bfree\b/i.test(`${title} ${description}`)) bad.push(`#${c.id} says free: ${description}`);
      const sol = norm(String(c.solution || ''));
      if (sol.length >= 20 && norm(description).includes(sol.slice(0, 20))) bad.push(`#${c.id} quotes the solution`);
      if (c.hint && c.hint.length > 30 && description.includes(plainHint(c.hint).slice(0, 30))) bad.push(`#${c.id} quotes the hint`);
    }
    expect(bad, bad.slice(0, 10).join('\n')).toEqual([]);
  });

  it('never leads with a column list, an ordering rule or an operator aside', () => {
    expect(isSpecSentence('Show emp_a, emp_b, department, hire_year.')).toBe(true);
    expect(isSpecSentence('Sort by avg_rating descending.')).toBe(true);
    expect(isSpecSentence('Order by udi.')).toBe(true);
    expect(isSpecSentence('The < trick is the standard way to deduplicate pairs in a self join.')).toBe(true);
    expect(isSpecSentence('Produce exactly these 5 output columns, in this order:')).toBe(true);
    expect(isSpecSentence('Find movie genres that have at least 5 movies AND an average rating above 6.5.')).toBe(false);
    expect(isSpecSentence('Which merchants generate disputes?')).toBe(false);
    const leads = bank.map(c => [c.id, questionTask(c)]).filter(([, t]) => isSpecSentence(t) && !t.startsWith('Practice '));
    expect(leads).toEqual([]);
  });
});

describe('generated topic pages', () => {
  it('src/challenges/<slug>.html is what the generator writes today', () => {
    for (const slug of Object.keys(EXTRA_TOPIC_SPECS)) {
      const onDisk = fs.readFileSync(path.join(ROOT, 'src/challenges', `${slug}.html`), 'utf8');
      expect(onDisk, `${slug} is stale — run node scripts/build-topic-extra.mjs`).toBe(renderTopic(slug, bank, slugs));
    }
  });

  it('every section is big enough to be worth a heading', () => {
    for (const [slug, spec] of Object.entries(EXTRA_TOPIC_SPECS)) {
      const pop = bank.filter(spec.population);
      for (const [id, pred] of Object.entries(spec.sections)) {
        expect(pop.filter(pred).length, `${slug}#${id}`).toBeGreaterThanOrEqual(5);
      }
    }
  });
});
