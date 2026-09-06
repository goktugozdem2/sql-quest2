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
import SKELETONS from '../src/utils/skeletons.js';

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
  return out;
}

export function pageGroup(urlPath) {
  const p = urlPath.replace(/^\/+|\/+$/g, '');
  if (p === '') return 'Home';
  if (p.endsWith('.html')) return 'Legal';
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
    blocks.push(`**${group}**\n` + list.map(p => `- ${p.title} — ${p.url}`).join('\n'));
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

export function templateValues(facts, generatedOn) {
  return {
    generatedOn,
    challengeCount: facts.challengeCount,
    coreChallengeCount: facts.coreChallengeCount,
    sectorChallengeCount: facts.sectorChallengeCount,
    easyCount: facts.easyCount,
    mediumCount: facts.mediumCount,
    hardCount: facts.hardCount,
    freePreviewCount: facts.freePreviewCount,
    freeChallengeCount: facts.freeChallengeCount,
    companyPageCount: facts.companies.length,
    companies: facts.companies.map(c => c.name).join(', '),
    companyList: facts.companies
      .map(c => `- ${c.name} — ${c.taggedChallenges} tagged challenges — ${c.url}`)
      .join('\n'),
    sectorCount: facts.sectors.length,
    sectorList: facts.sectors
      .map(s => `- ${s.name} — ${s.challengeCount} challenges — ${s.url}${s.attribution ? ` — data: ${s.attribution}` : ''}`)
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

export function buildLlmsTxt({
  rootDir = ROOT,
  outPath = path.join(ROOT, 'public', 'llms.txt'),
  generatedOn = gitCommitDate(rootDir),
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
