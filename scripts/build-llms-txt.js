// scripts/build-llms-txt.js — render public/llms.txt from the live content bank.
//
// 2026-09-06: llms.txt was hand-written and had drifted on every number it
// carried. It said 10 skill categories (the radar has been 9 since the
// reshuffle shipped), "200+" challenges split "140+ general + 60 sector"
// (the bank held 185 + 72), 13 companies (22 pages), and Pro at $19/month
// (the modal has said $29 since at least 2026-07-25 — the same stale figure
// CLAUDE.md once carried). This file is the one an AI assistant reads when
// it decides whether to recommend the site, and the AI-recommendation channel
// is the only one that has produced paying users, so the numbers it quotes
// have to be the bank's numbers.
//
// Prose lives in src/llms.template.md (curated by hand — the differentiator
// paragraphs, pricing, who-it-is-for). Every count is a {{placeholder}}
// filled here from src/data/*, src/utils/* and public/sitemap.xml, so the
// file cannot drift from the content again. A placeholder with no value, or
// a value with no placeholder, throws — silently emitting "{{hardCount}}" to
// a crawler would be worse than failing the build.
//
// Pricing is the one thing kept as template text: the source of truth is the
// Pro modal in src/app.jsx, and tests/llms-txt.test.js greps that modal for
// the same three price strings so the two cannot disagree.
//
// 2026-09-06 review: public/llms-full.txt, the hand-written long form served
// from the same root, was deleted the same day. It carried every stale
// figure above ($19, 200+, 60+, 13 companies, the retired 10-skill names)
// plus a page of per-company counts "as of April 2026", and nothing on the
// site or in robots.txt linked to it — so the reader this file exists for
// could fetch the wrong price one URL over. llms.txt is now the only
// machine-readable summary. If a long form is wanted back, it is a second
// template rendered through renderTemplate() below, never a hand-typed
// file; tests/llms-txt.test.js fails if the old path reappears.
//
// Runs in `npm run build` after build-static-pages.js. Run directly:
//   node scripts/build-llms-txt.js

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CANONICAL_SKILLS } from '../src/utils/skill-calc.js';
import { isFreePreview } from '../src/utils/challenge-order.js';
import { bankCountLabel, freeTierSentence, FREE_SOLVE_QUOTA, COMPANY_SET_FREE_COUNT } from '../src/utils/display-count.js';
import { archetypeMemberCompanies } from '../src/data/interview-archetypes.js';
import SKELETONS from '../src/utils/skeletons.js';
import { llmsEntryPoint } from './build-debug-pages.mjs';

const __dirname = import.meta.dirname;
const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://sqlquest.app';

// The data files assign onto `window` (they are concatenated into /data.js
// for the browser), so they are evaluated in a sandbox the same way
// scripts/build-weekly.js does. Order matters: sector-challenges.js appends
// itself onto window.challengesData at module init, which is exactly what the
// app sees — so `challengesData` below is the FULL bank, general + sector.
const BANK_FILES = [
  'challenges.js',
  'challenge-companies.js',
  'exercises.js',
  'lessons.js',
  'goals.js',
  'sectors.js',
  'sector-challenges.js',
];

export function loadBank(rootDir = ROOT) {
  const sandbox = { window: {}, console: { log() {}, warn() {}, error() {} } };
  for (const file of BANK_FILES) {
    const src = fs.readFileSync(path.join(rootDir, 'src', 'data', file), 'utf8');
    vm.runInNewContext(src, sandbox, { filename: file });
  }
  return sandbox.window;
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export function readTitle(file) {
  if (!file || !fs.existsSync(file)) return null;
  const m = fs.readFileSync(file, 'utf8').match(/<title>([^<]*)<\/title>/i);
  if (!m) return null;
  // src/weekly.html is itself a template — its <title> reads "{{WEEK_LABEL}}"
  // until scripts/build-weekly.js renders it — so a title that still carries
  // braces is not a title; fall through to the next candidate (the built copy).
  if (m[1].includes('{{')) return null;
  return decodeEntities(m[1])
    .replace(/\s+/g, ' ')
    .replace(/\s*[|—–-]\s*SQL Quest\s*$/i, '')
    .trim();
}

// Which source file carries a sitemap URL's <title>. Root pages and blog
// posts have a src/ file (build-static-pages.js copies them); the sector
// landings, the Turkish landing, the challenge topic pages and the legal
// pages exist only under public/, so fall back there.
export function titleCandidates(rootDir, urlPath) {
  const p = urlPath.replace(/^\/+/, '');
  if (p === '') return [path.join(rootDir, 'src', 'index.html')];
  if (p.endsWith('.html')) {
    return [path.join(rootDir, 'src', p), path.join(rootDir, 'public', p)];
  }
  const slug = p.replace(/\/+$/, '');
  const out = [];
  if (slug === 'blog') {
    out.push(path.join(rootDir, 'src', 'blog', 'index.html'));
  } else if (slug.startsWith('blog/')) {
    out.push(path.join(rootDir, 'src', 'blog', `${slug.slice('blog/'.length)}.html`));
  } else if (!slug.includes('/')) {
    out.push(path.join(rootDir, 'src', `${slug}.html`));
  }
  out.push(path.join(rootDir, 'public', slug, 'index.html'));
  // Legal pages are built only as public/<slug>.html and served at /<slug>/.
  out.push(path.join(rootDir, 'public', `${slug}.html`));
  return out;
}

export function pageGroup(urlPath) {
  const p = urlPath.replace(/^\/+|\/+$/g, '');
  if (p === '') return 'Home';
  if (p.endsWith('.html') || ['privacy', 'terms', 'refund'].includes(p)) return 'Legal';
  if (p === 'blog' || p.startsWith('blog/')) return 'Blog';
  if (p.startsWith('challenges/')) return 'Challenge topic pages';
  if (p.endsWith('-sql-interview')) return 'Company SQL interview pages';
  if (p.startsWith('vs-') || p === 'datalemur-karsilastirma' ||
      p === 'sql-practice-comparison' || p === 'best-sql-practice-sites') {
    return 'Comparisons';
  }
  if (['finans-sql', 'gayrimenkul-sql', 'uretim-sql', 'turkce-sql-ogren'].includes(p)) {
    return 'Industry tracks and Turkish';
  }
  return 'Guides and hubs';
}

const GROUP_ORDER = [
  'Home',
  'Guides and hubs',
  'Comparisons',
  'Company SQL interview pages',
  'Industry tracks and Turkish',
  'Challenge topic pages',
  'Blog',
  'Legal',
];

// Titles that must not be read from a built page. /weekly/ rotates every
// Monday and its built <title> names the current pick ("Week 2026-W36: …");
// llms.txt is rebuilt on deploy, not on Monday, so quoting the pick would be
// wrong most of the time. Describe the rotation instead.
const TITLE_OVERRIDES = {
  '/weekly/': 'SQL Quest Weekly Challenge — a new challenge every Monday, past weeks archived',
};

export function readSitemapPages(rootDir = ROOT) {
  const xml = fs.readFileSync(path.join(rootDir, 'public', 'sitemap.xml'), 'utf8');
  const pages = [];
  const re = /<loc>\s*([^<]+?)\s*<\/loc>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const url = m[1];
    const urlPath = url.startsWith(SITE) ? url.slice(SITE.length) || '/' : url;
    let title = TITLE_OVERRIDES[urlPath] || null;
    for (const candidate of title ? [] : titleCandidates(rootDir, urlPath)) {
      title = readTitle(candidate);
      if (title) break;
    }
    pages.push({ url, path: urlPath, title: title || urlPath, group: pageGroup(urlPath) });
  }
  return pages;
}

// llms.txt spec (https://llmstxt.org; reference parser AnswerDotAI/llms-txt):
// every line of an H2 section is `- [name](url)` with optional `: notes`, and
// free prose goes only between the summary and the first H2.
// scripts/llms-txt-spec.mjs checks the whole file; tests/llms-txt.test.js runs it.
export function linkName(title) {
  return String(title).replace(/\s*\|\s*SQL ?Quest(?:\.app)?\s*$/i, '').replace(/\[/g, '(').replace(/\]/g, ')').trim();
}
export function fileLink(name, url, notes) {
  return `- [${linkName(name)}](${url})${notes ? `: ${notes}` : ''}`;
}

function formatPageList(pages) {
  const byGroup = new Map();
  for (const p of pages) {
    if (!byGroup.has(p.group)) byGroup.set(p.group, []);
    byGroup.get(p.group).push(p);
  }
  const blocks = [];
  for (const group of GROUP_ORDER) {
    const list = byGroup.get(group);
    if (!list || !list.length) continue;
    // One H2 per group: a bold group label inside a file list is not allowed.
    blocks.push(`## Pages: ${group}\n\n` + list.map(p => fileLink(p.title, p.url)).join('\n'));
  }
  return blocks.join('\n\n');
}

// Company pages are discovered from src/*-sql-interview.html — the same rule
// build-static-pages.js uses to decide what gets published — so a new company
// page is counted the moment it exists. The display name comes from the
// page's own <title> ("Morgan Stanley SQL Interview Questions — …" →
// "Morgan Stanley"); the slug would give "Morgan-stanley" and "Jpmorgan".
export function readCompanyPages(rootDir = ROOT, challengeCompanies = {}) {
  const tagged = {};
  for (const id of Object.keys(challengeCompanies)) {
    for (const name of challengeCompanies[id]) tagged[name] = (tagged[name] || 0) + 1;
  }
  const taggedLower = Object.fromEntries(Object.entries(tagged).map(([k, v]) => [k.toLowerCase(), v]));

  return fs.readdirSync(path.join(rootDir, 'src'))
    .filter(f => /-sql-interview\.html$/.test(f))
    .sort()
    .map(f => {
      const slug = f.slice(0, -'.html'.length);
      const title = readTitle(path.join(rootDir, 'src', f)) || '';
      const fromTitle = title.match(/^(.+?)\s+SQL\b/);
      const name = fromTitle
        ? fromTitle[1].trim()
        : slug.replace(/-sql-interview$/, '').split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
      return {
        slug,
        name,
        url: `${SITE}/${slug}/`,
        taggedChallenges: taggedLower[name.toLowerCase()] || 0,
      };
    });
}

function countDiagnosisKinds(rootDir) {
  const src = fs.readFileSync(path.join(rootDir, 'src', 'utils', 'diagnose.js'), 'utf8');
  const kinds = new Set();
  const re = /kind:\s*'([a-z_]+)'/g;
  let m;
  while ((m = re.exec(src)) !== null) kinds.add(m[1]);
  // 'identical' is the success shape, not a failure category.
  kinds.delete('identical');
  return kinds.size;
}

export function collectBankFacts(rootDir = ROOT) {
  const bank = loadBank(rootDir);
  const challenges = bank.challengesData;
  const sectorChallenges = bank.sectorChallengesData;
  const sectorIds = new Set(sectorChallenges.map(c => c.id));

  // Per-dataset split of the sector bank. The finans track is two datasets
  // (27 on FDIC BankFind, 5 on a synthetic fraud ledger) and the pages quote
  // both figures — tests/site-counts.test.js binds "N on FDIC" to this.
  const datasets = {};
  for (const c of sectorChallenges) {
    if (!c.dataset) throw new Error(`sector challenge ${c.id} has no dataset`);
    datasets[c.dataset] = (datasets[c.dataset] || 0) + 1;
  }

  const byDifficulty = { Easy: 0, Medium: 0, Hard: 0 };
  for (const c of challenges) {
    if (!(c.difficulty in byDifficulty)) throw new Error(`challenge ${c.id} has unknown difficulty "${c.difficulty}"`);
    byDifficulty[c.difficulty]++;
  }
  const freePreviewCount = challenges.filter(isFreePreview).length;

  const companies = readCompanyPages(rootDir, bank.challengeCompanies);

  // A sector counts once it ships with a dataset (challenge_id_range set);
  // sectors.js also lists placeholders with no data yet, which must not be
  // advertised.
  const sectors = bank.CANONICAL_SECTORS
    .filter(s => Array.isArray(s.challenge_id_range))
    .map(s => ({
      id: s.id,
      name: s.en,
      url: `${SITE}${s.landing_path}/`,
      attribution: s.attribution || '',
      challengeCount: sectorChallenges.filter(c => Array.isArray(c.sectorTags) && c.sectorTags.includes(s.id)).length,
    }));

  const lessonIds = Object.keys(bank.lessonContentData);
  const lessonTitles = bank.aiLessonsData
    .filter(l => lessonIds.includes(String(l.id)))
    .map(l => l.title);

  const goals = bank.coachGoals.map(g => ({
    id: g.id,
    name: g.name,
    steps: g.curriculum.length,
    hours: g.estimatedHours,
  }));

  return {
    challengeCount: challenges.length,
    coreChallengeCount: challenges.filter(c => !sectorIds.has(c.id)).length,
    sectorChallengeCount: sectorChallenges.length,
    easyCount: byDifficulty.Easy,
    mediumCount: byDifficulty.Medium,
    hardCount: byDifficulty.Hard,
    freePreviewCount,
    // Mirrors isContentLocked in app.jsx: Hard is Pro-gated unless flagged
    // freePreview; everything else is free regardless of sector.
    freeChallengeCount: byDifficulty.Easy + byDifficulty.Medium + freePreviewCount,
    companies,
    sectors,
    datasets,
    lessonCount: lessonIds.length,
    lessonTitles,
    goals,
    skills: [...CANONICAL_SKILLS],
    diagnosisKindCount: countDiagnosisKinds(rootDir),
    skeletonCount: Object.keys(SKELETONS).length,
    pages: readSitemapPages(rootDir),
  };
}

// The doors an assistant should send someone through, one line each (C2,
// 2026-11-22). Every path except /app/ must be on the sitemap, or the build
// fails: a stale entry point in llms.txt is a dead link an assistant quotes.
export const ENTRY_POINTS = [
  ['/app/', 'The practice app. No signup: the first challenge runs in the browser, and the Coach picks the next one from your Skillmap.'],
  ['/sql-interview-readiness-test/', 'Ten questions, no signup: a Skillmap across the nine skills and the one to fix first, optionally weighted for a named company.'],
  ['/sql-interview-prep/', 'The interview hub: every company interview page, grouped by sector.'],
  ['/sql-interview-prep-plan/', 'A 2-week SQL interview prep plan: one of the nine skills a day, Easy to Hard questions linked for each, the readiness test first and a timed mock near the end.'],
  ['/sql-mock-interview/', 'Timed SQL mock interviews in the browser: what each mock is (questions, minutes, pass mark), which one is free and which are Pro, and how to rehearse a timed screen.'],
  ['/sql-exercises/', 'SQL exercises by topic, with five worked solutions and the trap on each topic.'],
  ['/questions/', 'Every challenge in the bank as its own page: the prompt, the tables and the skills it measures.'],
  ['/sql-practice-comparison/', 'How SQL Quest compares with DataLemur, StrataScratch, LeetCode and HackerRank, with each competitor fact dated.'],
  ['/best-sql-practice-sites/', 'Five SQL practice sites reviewed side by side, including where each beats SQL Quest.'],
  ['/vs-chatgpt/', 'Why practise on questions with a fixed expected result instead of asking a chat assistant to grade you.'],
  ['/sql-tools/', 'Free in-browser SQL tools: a checker, an explainer and an optimizer.'],
  // /sql-debugging-practice/ exists only while features.debugQuestions is true.
  ...llmsEntryPoint(),
];

// The buyer questions G1 measures every week (docs/agent/fleet/G1-geo.md,
// the fixed prompt panel), each with the page that answers it (G1,
// 2026-11-22). An assistant reads llms.txt to decide where to send a person;
// this block says it in the person's own words. `panel` is the prompt's
// number in the brief, and every one of the 15 must be here (llms-txt.test.js).
// Every path must be on the sitemap, or the build fails. Where no page answers
// a prompt squarely, the line names the closest page and says what it holds —
// never more (docs/reads/geo-2026-11-22.md lists those as page gaps for C2).
export const BUYER_QUESTIONS = [
  { panel: 1, q: 'What is the best website to practice SQL for data analyst interviews?', paths: ['/best-sql-practice-sites/', '/sql-interview-questions-data-analyst/'],
    a: 'Five practice sites reviewed side by side, SQL Quest among them and disclosed as ours, and analyst interview questions by experience level.' },
  { panel: 2, q: 'Is there SQL interview practice like LeetCode, but for data analysts?', paths: ['/vs-leetcode-sql/'],
    a: 'LeetCode SQL against SQL Quest: SQL as one track of a coding platform, or a SQL-only product built around analyst interview questions.' },
  { panel: 3, q: 'How do I prepare for the Capital One data analyst SQL assessment?', paths: ['/blog/capital-one-codesignal-data-analyst-assessment/', '/capital-one-sql-interview/'],
    a: 'What candidates report about the CodeSignal-style assessment, with dated sources, and a practice set plus timed mocks on a synthetic card-transactions ledger.' },
  { panel: 4, q: 'What are the alternatives to DataLemur?', paths: ['/datalemur-alternatives/'],
    a: 'The alternatives side by side, with each competitor fact taken from that site\'s own pages and dated.' },
  { panel: 5, q: 'What are the alternatives to StrataScratch?', paths: ['/stratascratch-alternatives/'],
    a: 'The same comparison from StrataScratch\'s side.' },
  { panel: 6, q: 'How do I practice SQL window functions for interviews?', paths: ['/challenges/window-functions/', '/blog/window-functions-tutorial/'],
    a: 'Runnable window-function challenges from Easy to Hard, and a tutorial on RANK, LAG and running totals.' },
  { panel: 7, q: 'Where can I practice SQL free, on real interview-style questions?', paths: ['/sql-exercises/'],
    a: 'Exercises by topic with five worked solutions; the free tier is said in one sentence under "Facts" above.' },
  { panel: 8, q: 'Is there a SQL practice site with an AI tutor that explains my mistakes?', paths: ['/', '/vs-chatgpt/'],
    a: 'In the app a wrong query gets a diagnosis that names the gap (missing rows, wrong values, wrong grain), and the AI tutor reads that diagnosis before it answers; the second page explains why a fixed expected result matters when an AI explains your SQL.' },
  { panel: 9, q: 'How do I prepare for a Revolut data analyst SQL interview?', paths: ['/revolut-sql-interview/'],
    a: 'The rounds candidates report, with dated sources, a tagged practice set on a neobank ledger and a timed mock.' },
  { panel: 10, q: 'Where can I practice SQL for a Meta data scientist interview?', paths: ['/meta-sql-interview/'],
    a: 'Meta-tagged practice problems on product-analytics tables.' },
  { panel: 11, q: 'Where can I take a timed SQL mock interview online?', paths: ['/sql-mock-interview/', '/capital-one-sql-interview/', '/revolut-sql-interview/'],
    a: 'A timed SQL mock in the browser: one clock, a limit per question, your rows checked and a score at the end. One mock is free; the company mocks (Capital One, Revolut) are Pro.' },
  { panel: 12, q: 'How do I find my weak areas in SQL?', paths: ['/sql-interview-readiness-test/', '/sql-quiz/'],
    a: 'Ten questions, no signup: a Skillmap across the nine skills and the one to fix first; or a five-minute adaptive level quiz.' },
  { panel: 13, q: 'Is there a 2-week SQL interview prep plan?', paths: ['/sql-interview-prep-plan/', '/sql-interview-prep/'],
    a: 'A 2-week plan, day by day: one of the nine SQL skills a day with questions linked for each, a readiness test first and a timed mock near the end; the interview hub has every company page.' },
  { panel: 14, q: 'Where do I practice SQL after a bootcamp, to get interview-ready?', paths: ['/after-bootcamp/'],
    a: 'For bootcamp graduates: interview-level questions and the Coach that finds the gap the course left.' },
  { panel: 15, q: 'SQL mülakatına hazırlanmak için en iyi site hangisi?', paths: ['/turkce-sql-ogren/'],
    a: 'Turkish landing page; the app and the Coach answer in Turkish when you write Turkish.' },
];

export function buyerQuestionList(pages) {
  const onSitemap = new Set(pages.map(p => p.path));
  return BUYER_QUESTIONS.map(({ q, paths, a }) => {
    for (const p of paths) if (!onSitemap.has(p)) throw new Error(`llms.txt buyer question "${q}" links ${p}, which is not on the sitemap`);
    const [first, ...more] = paths.map(p => `${SITE}${p}`);
    return fileLink(q, first, more.length ? `${a} Also: ${more.join(' , ')}` : a);
  }).join('\n');
}

// Fintech and banking pages listed by name (C2, 2026-11-22). Chime is listed
// once its page exists (PR #134), so this needs no edit when it merges.
export const FEATURED_COMPANIES = ['Capital One', 'Revolut', 'Wise', 'Stripe', 'PayPal', 'Monzo', 'Chime'];
const FEATURED_OPTIONAL = new Set(['Chime']);

export function entryPointList(pages) {
  const onSitemap = new Set(pages.map(p => p.path));
  const titleOf = new Map(pages.map(p => [p.path, p.title]));
  return ENTRY_POINTS.map(([p, line]) => {
    if (p !== '/app/' && !onSitemap.has(p)) throw new Error(`llms.txt entry point ${p} is not on the sitemap`);
    return fileLink(p === '/app/' ? 'SQL Quest practice app' : titleOf.get(p) || p, `${SITE}${p}`, line);
  }).join('\n');
}

export function featuredCompanyList(companies, mockCompanies = archetypeMemberCompanies()) {
  const byName = new Map(companies.map(c => [c.name, c]));
  const lines = [];
  for (const name of FEATURED_COMPANIES) {
    const c = byName.get(name);
    if (!c) {
      if (FEATURED_OPTIONAL.has(name)) continue;
      throw new Error(`llms.txt featured company ${name} has no src/*-sql-interview.html page`);
    }
    const parts = [c.taggedChallenges > 0 ? `${c.taggedChallenges} tagged challenges` : 'practice mapped onto the sector track'];
    if (mockCompanies.includes(name)) parts.push(`a set authored for it (the first ${COMPANY_SET_FREE_COUNT} free to try) and a timed mock screen (Pro)`);
    lines.push(fileLink(c.name, c.url, parts.join(', ')));
  }
  return lines.join('\n');
}

export function templateValues(facts, generatedOn) {
  return {
    generatedOn,
    // 2026-09-24: the bank's size is said as a floor to 50 ("300+"), the one
    // rule every page follows — src/utils/display-count.js bankCountLabel. The
    // exact total stays in `facts` for the tests and the build log.
    challengeCountLabel: bankCountLabel(facts.challengeCount),
    coreChallengeCount: facts.coreChallengeCount,
    sectorChallengeCount: facts.sectorChallengeCount,
    easyCount: facts.easyCount,
    mediumCount: facts.mediumCount,
    hardCount: facts.hardCount,
    // 2026-11-22: freePreviewCount stays in the facts but leaves the template:
    // the quota sentence says "or a Hard preview" and counts none.
    // 2026-09-26 (freeQuota + companySetGate): the free tier is said as the
    // quota the gate reads, never as a count of free challenges — there is no
    // such count once the quota is on. facts.freeChallengeCount stays in the
    // facts (what a free solve can be spent on) for the tests.
    freeSolveQuota: FREE_SOLVE_QUOTA,
    // The one sentence every page uses for the free tier (display-count.js).
    freeTierSentence: freeTierSentence(facts.challengeCount),
    entryPoints: entryPointList(facts.pages),
    buyerQuestions: buyerQuestionList(facts.pages),
    featuredCompanyList: featuredCompanyList(facts.companies),
    companySetFreeCount: COMPANY_SET_FREE_COUNT,
    signedCompanySets: archetypeMemberCompanies().join(' and '),
    companyPageCount: facts.companies.length,
    taggedCompanyCount: facts.companies.filter(c => c.taggedChallenges > 0).length,
    companies: facts.companies.map(c => c.name).join(', '),
    companyList: facts.companies
      .map(c => fileLink(c.name, c.url, c.taggedChallenges > 0 ? `${c.taggedChallenges} tagged challenges` : 'no company-tagged challenges; the page maps the screen onto sector-track challenges'))
      .join('\n'),
    sectorCount: facts.sectors.length,
    sectorList: facts.sectors
      .map(s => fileLink(s.name, s.url, `${s.challengeCount} challenges${s.attribution ? ` — data: ${s.attribution}` : ''}`))
      .join('\n'),
    lessonCount: facts.lessonCount,
    lessonList: facts.lessonTitles.join(', '),
    goalCount: facts.goals.length,
    goalList: facts.goals
      .map(g => `  - ${g.name} — ${g.steps} steps${g.hours ? `, about ${g.hours} hours` : ''}`)
      .join('\n'),
    skillCount: facts.skills.length,
    skills: facts.skills.join(', '),
    diagnosisKindCount: facts.diagnosisKindCount,
    skeletonCount: facts.skeletonCount,
    pageList: formatPageList(facts.pages),
  };
}

export function renderTemplate(template, values) {
  const used = new Set();
  const out = template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`llms.template.md uses {{${key}}} but the generator has no value for it`);
    const v = values[key];
    if (v === undefined || v === null || v === '') throw new Error(`empty value for {{${key}}}`);
    used.add(key);
    return String(v);
  });
  const unused = Object.keys(values).filter(k => !used.has(k));
  if (unused.length) {
    throw new Error(`generator computes ${unused.join(', ')} but llms.template.md never uses ${unused.length === 1 ? 'it' : 'them'}`);
  }
  const leftover = out.match(/\{\{[^}]*\}\}/);
  if (leftover) throw new Error(`unfilled placeholder in output: ${leftover[0]}`);
  return out;
}

// Last commit date rather than the wall clock: the file changes when the
// content changes, and a rebuild of the same commit should say the same date.
export function gitCommitDate(rootDir = ROOT) {
  try {
    const d = execSync('git log -1 --format=%cs', { cwd: rootDir, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  } catch {
    // not a git checkout (e.g. a bare deploy tarball) — fall through
  }
  return new Date().toISOString().slice(0, 10);
}

// The newest page date the sitemap manifest holds (2026-11-22). The commit
// date was close but not stable: the file is built BEFORE its commit, so the
// first rebuild on the next day rewrote it — a dirty tree after every build
// (BACKLOG item 23). The manifest is source and moves only when a page's
// content does; the build runs this after sitemap-lastmod for that reason.
export function contentDate(rootDir = ROOT) {
  try {
    const m = JSON.parse(fs.readFileSync(path.join(rootDir, 'src', 'data', 'sitemap-lastmod.json'), 'utf8'));
    const dates = [];
    (function walk(o) {
      if (!o || typeof o !== 'object') return;
      if (typeof o.lastmod === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.lastmod)) dates.push(o.lastmod);
      for (const v of Object.values(o)) walk(v);
    })(m);
    if (dates.length) return dates.sort().pop();
  } catch {
    // no manifest — fall through
  }
  return gitCommitDate(rootDir);
}

export function buildLlmsTxt({
  rootDir = ROOT,
  outPath = path.join(ROOT, 'public', 'llms.txt'),
  generatedOn = contentDate(rootDir),
} = {}) {
  const template = fs.readFileSync(path.join(rootDir, 'src', 'llms.template.md'), 'utf8');
  const facts = collectBankFacts(rootDir);
  const text = renderTemplate(template, templateValues(facts, generatedOn));
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, text);
  return { text, facts, outPath };
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const { facts, outPath } = buildLlmsTxt();
  console.log(
    `[build-llms-txt] wrote ${path.relative(ROOT, outPath)} — ` +
    `${facts.challengeCount} challenges (${facts.easyCount}/${facts.mediumCount}/${facts.hardCount} E/M/H, ` +
    `${facts.freePreviewCount} free Hard previews), ${facts.companies.length} company pages, ` +
    `${facts.sectors.length} sectors, ${facts.lessonCount} lessons, ${facts.goals.length} goals, ` +
    `${facts.skills.length} skills, ${facts.pages.length} sitemap pages`
  );
}
