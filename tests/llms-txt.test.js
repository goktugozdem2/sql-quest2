// SQL Quest — llms.txt is generated from the bank, and cannot drift from it
//
// THE INCIDENT (2026-09-06)
//
// public/llms.txt was hand-written. By the time anyone re-read it, it said
// 10 skill categories (the radar has been 9 since the reshuffle), "200+"
// challenges split "140+ general + 60 sector" (the bank held 185 + 72),
// 13 companies (22 pages), and Pro at $19/month — the same stale figure
// CLAUDE.md carried until 2026-07-25, while the modal said $29. This is the
// one file an AI assistant reads when deciding whether to recommend the site,
// and the AI-recommendation channel is the only channel that has produced a
// paying user. Both payers came through it. It was quoting the wrong price.
//
// These tests run the real generator against the real bank into a temp path
// and recompute every count a second way, so a number in llms.txt can only
// be the bank's number. The pricing guard reads the Pro modal in app.jsx,
// because that is the surface that calls beginCheckout — prices live there,
// not in any doc.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PRICE_TABLE } from '../src/utils/regional-price.js';
import fs from 'node:fs';
import os from 'node:os';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildLlmsTxt, ENTRY_POINTS, FEATURED_COMPANIES, BUYER_QUESTIONS } from '../scripts/build-llms-txt.js';
import { CANONICAL_SKILLS } from '../src/utils/skill-calc.js';
import { bankCountLabel, freeTierSentence } from '../src/utils/display-count.js';
import { FREE_SOLVE_QUOTA, COMPANY_SET_FREE_COUNT } from '../src/utils/free-tier-boundary.js';
import { freeTierFlags } from './free-tier-state.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const read = (...p) => fs.readFileSync(join(ROOT, ...p), 'utf8');

// The retired 10-skill vocabulary. CLAUDE.md: never author a new reference
// to these. The old llms.txt listed all of them as "the skill radar".
const RETIRED_SKILL_NAMES = ['SELECT Basics', 'Filter & Sort', 'JOIN Tables', 'CASE Statements'];

let tmpDir;
let outPath;
let text;
let facts;

// Independent second read of the bank: same sandbox technique the browser
// bundle relies on, but none of the generator's own counting code.
let bank;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(join(os.tmpdir(), 'sqlquest-llms-'));
  outPath = join(tmpDir, 'llms.txt');
  ({ text, facts } = buildLlmsTxt({ rootDir: ROOT, outPath, generatedOn: '2026-09-06' }));

  const sandbox = { window: {}, console: { log() {}, warn() {}, error() {} } };
  for (const f of ['challenges.js', 'challenge-companies.js', 'exercises.js', 'lessons.js',
    'goals.js', 'sectors.js', 'sector-challenges.js']) {
    vm.runInNewContext(read('src', 'data', f), sandbox, { filename: f });
  }
  bank = sandbox.window;
});

afterAll(() => {
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('generator output', () => {
  it('writes the file to the requested path and returns the same text', () => {
    expect(fs.existsSync(outPath)).toBe(true);
    expect(fs.readFileSync(outPath, 'utf8')).toBe(text);
    expect(text.startsWith('# SQL Quest\n')).toBe(true);
  });

  it('leaves no {{placeholder}} unfilled', () => {
    expect(text.match(/\{\{[^}]*\}\}/g)).toBeNull();
  });

  it('stamps the generated-on date it was given', () => {
    expect(text).toContain('_Generated 2026-09-06 from the live content bank');
  });
});

describe('counts match the bank (recomputed independently)', () => {
  it('total challenges and the difficulty split', () => {
    const all = bank.challengesData;           // sector-challenges.js appends itself
    const ids = new Set(all.map(c => c.id));
    expect(ids.size, 'duplicate ids in the bank').toBe(all.length);

    // Second method for the split: count the literal difficulty strings in
    // the two source files, which shares no code with the vm read.
    const src = read('src', 'data', 'challenges.js') + read('src', 'data', 'sector-challenges.js');
    const literal = d => (src.match(new RegExp(`difficulty: "${d}"`, 'g')) || []).length;
    const easy = literal('Easy'), medium = literal('Medium'), hard = literal('Hard');
    expect(easy + medium + hard).toBe(all.length);

    expect(facts.challengeCount).toBe(all.length);
    expect(facts.easyCount).toBe(easy);
    expect(facts.mediumCount).toBe(medium);
    expect(facts.hardCount).toBe(hard);
    expect(facts.sectorChallengeCount).toBe(bank.sectorChallengesData.length);
    expect(facts.coreChallengeCount).toBe(all.length - bank.sectorChallengesData.length);

    // 2026-09-24: the total is said floored to 50 with a "+", never exact.
    expect(text).toContain(`**${bankCountLabel(all.length)} hands-on SQL challenges**`);
    expect(text).not.toMatch(new RegExp(`\\b${all.length}\\+? (?:hands-on|SQL|challenges)`));
    expect(text).toContain(`${easy} Easy, ${medium} Medium, ${hard} Hard`);
    expect(text).toContain(`including all ${hard} Hard challenges`);
  });

  it('free previews and the free tier mirror isContentLocked (Hard is Pro unless freePreview)', () => {
    const all = bank.challengesData;
    const previews = all.filter(c => c.freePreview === true && c.difficulty === 'Hard').length;
    expect(previews).toBeGreaterThan(0);
    const free = all.filter(c => c.difficulty !== 'Hard').length + previews;

    expect(facts.freePreviewCount).toBe(previews);
    expect(facts.freeChallengeCount).toBe(free);
    // 2026-11-22: the quota sentence says "or a Hard preview" and counts none
    // (the bank-wide count is the retired wording, site-counts R3).
    expect(text).toContain('or a Hard preview, so a free user');
    expect(text).not.toMatch(/one of \d+ Hard previews/);
  });

  // 2026-09-26: llms.txt is what an assistant reads when asked "is SQL Quest
  // free?". It says the free tier the way the gates decide it — the quota the
  // gate reads and the signed sets' free three — and is bound to the flags in
  // both states: never a count of free challenges once the quota is on, never
  // the quota before it.
  it('states the free tier the flags describe', () => {
    const { freeQuota, companySetGate } = freeTierFlags();
    const free = facts.freeChallengeCount;
    if (freeQuota) {
      expect(text).toContain(`**${FREE_SOLVE_QUOTA} free challenge solves**`);
      expect(text).not.toMatch(new RegExp(`\\b${free}\\b[^\\n]{0,40}\\bfree\\b|\\bfree\\b[^\\n]{0,40}\\b${free}\\b`, 'i'));
      expect(text).not.toMatch(/every Easy and Medium challenge (?:is|are) free|free Hard previews/);
    } else {
      expect(text).not.toContain(`${FREE_SOLVE_QUOTA} free challenge solves`);
    }
    if (companySetGate) expect(text).toContain(`Capital One and Revolut company sets the first ${COMPANY_SET_FREE_COUNT} are free to try`);
    else expect(text).not.toMatch(/company sets the first \d+ are free/);
  });

  it('company pages are exactly src/*-sql-interview.html, each linked', () => {
    const files = fs.readdirSync(join(ROOT, 'src')).filter(f => /-sql-interview\.html$/.test(f)).sort();
    expect(files.length).toBeGreaterThan(0);
    expect(facts.companies.map(c => c.slug + '.html')).toEqual(files);
    expect(text).toContain(`**${files.length} company interview pages**`);
    for (const f of files) {
      expect(text).toContain(`https://sqlquest.app/${f.slice(0, -'.html'.length)}/`);
    }
    // Names come from each page's own <title>, so multi-word companies keep
    // their casing ("Morgan Stanley", not "Morgan-stanley"; "JPMorgan").
    for (const c of facts.companies) {
      expect(c.name, c.slug).toMatch(/^[A-Z]/);
      expect(c.name).not.toMatch(/-/);
      // A prep page with no company tag (Capital One, 2026-09-07) must not read
      // "0 tagged challenges" to an LLM — the script words it as a sector-track page.
      const tagLine = c.taggedChallenges > 0
        ? `${c.taggedChallenges} tagged challenges`
        : 'no company-tagged challenges; the page maps the screen onto sector-track challenges';
      expect(text).toContain(`- ${c.name} — ${tagLine} — ${c.url}`);
    }
  });

  it('company tag counts match challenge-companies.js', () => {
    const tally = {};
    for (const id of Object.keys(bank.challengeCompanies)) {
      for (const name of bank.challengeCompanies[id]) tally[name] = (tally[name] || 0) + 1;
    }
    for (const c of facts.companies) {
      expect(c.taggedChallenges, c.name).toBe(tally[c.name] || 0);
    }
  });

  it('sectors are the ones that ship with data, with per-sector challenge counts', () => {
    const shipped = bank.CANONICAL_SECTORS.filter(s => Array.isArray(s.challenge_id_range));
    expect(shipped.length).toBeGreaterThan(0);
    expect(facts.sectors.map(s => s.id)).toEqual(shipped.map(s => s.id));
    expect(text).toContain(`**${shipped.length} industry tracks**`);
    let sum = 0;
    for (const s of shipped) {
      const n = bank.sectorChallengesData.filter(c => (c.sectorTags || []).includes(s.id)).length;
      sum += n;
      expect(text).toContain(`- ${s.en} — ${n} challenges — https://sqlquest.app${s.landing_path}/`);
    }
    // Every sector challenge belongs to exactly one shipped sector.
    expect(sum).toBe(bank.sectorChallengesData.length);
  });

  it('lessons and goals', () => {
    const lessonKeys = read('src', 'data', 'lessons.js').match(/^ {4}\d+: \{/gm) || [];
    expect(lessonKeys.length).toBe(Object.keys(bank.lessonContentData).length);
    expect(facts.lessonCount).toBe(lessonKeys.length);
    expect(text).toContain(`**${lessonKeys.length} Socratic lessons**`);

    expect(facts.goals.length).toBe(bank.coachGoals.length);
    expect(text).toContain(`**${bank.coachGoals.length} Coach goal paths**`);
    for (const g of bank.coachGoals) {
      expect(text).toContain(`- ${g.name} — ${g.curriculum.length} steps`);
    }
  });

  it('skills are the 9 canonical radar names and none of the retired ones', () => {
    expect(facts.skills).toEqual([...CANONICAL_SKILLS]);
    expect(text).toContain(`a Skillmap over **${CANONICAL_SKILLS.length} skills**`);
    for (const s of CANONICAL_SKILLS) expect(text).toContain(s);
    for (const retired of RETIRED_SKILL_NAMES) expect(text).not.toContain(retired);
    expect(text).not.toMatch(/\b10 (SQL )?(skill|categor)/i);
  });

  it('lists every sitemap URL, with a real title (not the URL) for each', () => {
    const xml = read('public', 'sitemap.xml');
    const locs = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map(m => m[1]);
    expect(locs.length).toBeGreaterThan(50);
    expect(facts.pages.length).toBe(locs.length);
    for (const url of locs) expect(text).toContain(` — ${url}`);
    for (const p of facts.pages) {
      expect(p.title, p.url).not.toBe(p.path);
      expect(p.title).not.toContain('{{');
      expect(p.title).not.toMatch(/SQL Quest\s*$/);   // suffix stripped
    }
  });
});

describe('pricing guard — llms.txt quotes the Pro modal in app.jsx, nothing else', () => {
  let modal;       // { Monthly: '29', Annual: '99', Lifetime: '199' }
  let pricing;     // the Pricing section of the output

  beforeAll(() => {
    const app = read('src', 'app.jsx');
    modal = {};
    // The price cards: a tabular-nums <div>$N</div> followed by its plan label.
    const re = /className="text-2xl font-bold"[^>]*>\$(\d+)<\/div>\s*<div[^>]*>(Monthly|Annual|Lifetime)<\/div>/g;
    for (const m of app.matchAll(re)) modal[m[2]] = m[1];
    // From 2026-09-26 the cards render from src/utils/regional-price.js.
    const reRegional = /className="text-2xl font-bold"[^>]*>\{shownPrices\.(monthly|annual)\}<\/div>\s*<div[^>]*>(Monthly|Annual)<\/div>/g;
    for (const m of app.matchAll(reRegional)) modal[m[2]] = String(PRICE_TABLE.default[m[1]]);

    const start = text.indexOf('## Pricing');
    const end = text.indexOf('\n## ', start + 1);
    pricing = text.slice(start, end);
  });

  it('finds the two plans in the modal', () => {
    // Lifetime was removed 2026-09-12 (zero purchases ever; it undercut two
    // years of annual). If a third card comes back, this list grows with it.
    expect(Object.keys(modal).sort()).toEqual(['Annual', 'Monthly']);
  });

  it('quotes each plan at the modal price, with its billing unit', () => {
    expect(pricing).toContain(`$${modal.Monthly}/month`);
    expect(pricing).toContain(`$${modal.Annual}/year`);
    expect(pricing).not.toMatch(/lifetime/i);
  });

  it('quotes no dollar figure the modal does not carry', () => {
    const quoted = [...pricing.matchAll(/\$(\d+)/g)].map(m => m[1]);
    expect(quoted.length).toBeGreaterThanOrEqual(2);
    for (const q of quoted) expect(Object.values(modal), `$${q}`).toContain(q);
    expect(text).not.toMatch(/\$19(?!\d)/);   // the stale monthly price
  });

  // 2026-09-06 review: the Pricing section hands an assistant
  // https://sqlquest.app/refund.html, and both legal pages still printed the
  // $19 monthly price one hop later. They live only under public/ (no src/
  // copy), so build-static-pages never touched them and no guard read them.
  // Every dollar figure on either page must be a modal price.
  const LEGAL_PAGES = {
    'refund.html': { Monthly: '/month', Annual: '/year', Lifetime: ' one-time' },
    'terms.html': { Monthly: '/mo', Annual: '/yr', Lifetime: ' one-time' },
  };

  it.each(Object.keys(LEGAL_PAGES))('public/%s quotes each plan at the modal price and nothing else', (file) => {
    const html = read('public', file);
    for (const [plan, unit] of Object.entries(LEGAL_PAGES[file])) {
      // A plan the modal no longer sells (Lifetime, removed 2026-09-12) must
      // carry no price on the legal pages at all — the loop below catches any
      // figure that is not a modal price.
      if (!modal[plan]) continue;
      expect(html, `${file}: ${plan}`).toContain(`$${modal[plan]}${unit}`);
    }
    const quoted = [...html.matchAll(/\$(\d+)/g)].map(m => m[1]);
    expect(quoted.length).toBeGreaterThanOrEqual(Object.keys(modal).length);
    for (const q of quoted) expect(Object.values(modal), `${file}: $${q}`).toContain(q);
    expect(html).not.toMatch(/\$19(?!\d)/);
  });

  it('the Pricing section links a legal page that exists and is on the sitemap', () => {
    // 2026-09-13: legal pages are linked in their served form (/refund/); the
    // .html spelling 308s, and Search Console listed it as "Page with redirect".
    const m = /Full terms: https:\/\/sqlquest\.app\/([a-z]+)\//.exec(pricing);
    expect(m).toBeTruthy();
    expect(`${m[1]}.html` in LEGAL_PAGES).toBe(true);
    expect(facts.pages.map(p => p.path)).toContain(`/${m[1]}/`);
  });
});

describe('llms.txt is the only machine-readable summary', () => {
  // 2026-09-06 review: public/llms-full.txt was a hand-written long form
  // served from the same root. It carried every stale figure the generator's
  // incident note lists ($19/month, 200+, 60+, 13 companies, the retired
  // 10-skill names) and nothing linked to it, so it was deleted rather than
  // patched. A long form, if wanted, is rendered through the generator —
  // this test fails the moment a hand-typed file reappears at the old path.
  it('public/llms-full.txt does not exist', () => {
    expect(fs.existsSync(join(ROOT, 'public', 'llms-full.txt'))).toBe(false);
  });

  it('no .txt under public/ carries the stale $19 price', () => {
    const txts = fs.readdirSync(join(ROOT, 'public')).filter(f => f.endsWith('.txt'));
    expect(txts).toContain('llms.txt');
    for (const f of txts) {
      expect(read('public', f), f).not.toMatch(/\$19(?!\d)/);
    }
  });
});

describe('template source guards', () => {
  const template = fs.readFileSync(join(ROOT, 'src', 'llms.template.md'), 'utf8');

  it('carries no hand-typed bank counts — those must be placeholders', () => {
    // "200+ challenges", "13 companies", "10 skills" are what the old file
    // rotted on. A number in front of these nouns has to come from the bank.
    const typed = template.match(/\b\d+\+?\s+(hands-on|challenges|companies|company pages|company interview|skills|lessons|sectors|industry tracks|goal paths)\b/gi);
    expect(typed).toBeNull();
    expect(template).not.toMatch(/\$19(?!\d)/);
  });

  it('mentions the comparison pages assistants cite, by name and by URL', () => {
    for (const name of ['DataLemur', 'StrataScratch']) {
      expect(template).toContain(name);
      expect(text).toContain(name);
    }
    expect(text).toContain('https://sqlquest.app/vs-datalemur/');
    expect(text).toContain('https://sqlquest.app/vs-stratascratch/');
  });

  it('states the AI-channel facts: free Coach, no signup, runs in the browser', () => {
    expect(text).toContain('The free tier includes the Coach.');
    expect(text).toContain('No signup to start.');
    expect(text).toContain('Queries run in the browser.');
  });
});

// 2026-11-22 (BACKLOG item 23): the build leaves the tree clean. llms.txt is
// dated by its newest page in the lastmod manifest and built after that
// manifest settles; the date-stamped /weekly/ archive has its own script.
describe('the build is stable across days', () => {
  it('llms.txt is dated by the newest lastmod in the manifest', async () => {
    const { contentDate } = await import('../scripts/build-llms-txt.js');
    const m = JSON.parse(fs.readFileSync(join(ROOT, 'src/data/sitemap-lastmod.json'), 'utf8'));
    const all = JSON.stringify(m).match(/"lastmod":"(\d{4}-\d{2}-\d{2})"/g).map(x => x.slice(11, 21)).sort();
    expect(contentDate(ROOT)).toBe(all[all.length - 1]);
  });

  it('build-llms-txt runs after sitemap-lastmod, and /weekly/ is not in the everyday build', () => {
    const { build } = JSON.parse(fs.readFileSync(join(ROOT, 'package.json'), 'utf8')).scripts;
    expect(build.indexOf('build-llms-txt')).toBeGreaterThan(build.indexOf('sitemap-lastmod'));
    expect(build).not.toMatch(/build-weekly/);
  });
});

// C2, 2026-11-22: the entry points, the fintech list, the free-tier sentence,
// and no claim about another product that no dated read supports.
describe('AI-visibility block (C2, 2026-11-22)', () => {
  it('lists every entry point once, with a one-line description, under Start here', () => {
    const start = text.slice(text.indexOf('## Start here'), text.indexOf('## Facts an assistant'));
    for (const [p] of ENTRY_POINTS) {
      const lines = start.split('\n').filter(l => l.startsWith(`- https://sqlquest.app${p} — `));
      expect(lines, p).toHaveLength(1);
      expect(lines[0].length, p).toBeGreaterThan(`- https://sqlquest.app${p} — `.length + 20);
    }
  });

  it('lists the fintech company pages that exist, with their tagged counts', () => {
    const block = text.slice(text.indexOf('## Fintech and banking'), text.indexOf('## Company-tagged'));
    for (const name of FEATURED_COMPANIES) {
      const c = facts.companies.find(x => x.name === name);
      if (!c) { expect(name).toBe('Chime'); continue; }   // the only optional one
      expect(block).toContain(`- ${name} — `);
      expect(block).toContain(c.url);
      if (c.taggedChallenges) expect(block).toContain(`- ${name} — ${c.taggedChallenges} tagged challenges`);
    }
  });

  it('says the free tier exactly the way freeTierSentence does', () => {
    expect(text).toContain(freeTierSentence(facts.challengeCount));
  });

  it('makes no blanket claim about other products', () => {
    const template = read('src', 'llms.template.md');
    for (const re of [/\bunlike every other\b/i, /\bevery other SQL practice site\b/i, /\bthe only SQL practice site\b/i,
      /\bmost competitors\b/i, /\bcompetitors don't have\b/i, /\bconvert at high rates\b/i, /#1 reason/i,
      /\bdo not exist on any other\b/i, /\|\s*No\s*\|\s*No\s*\|/, /\bmost common reason\b/i, /\bmost often\b/i]) {
      expect(template, String(re)).not.toMatch(re);
    }
  });
});


// G1, 2026-11-22: the fixed prompt panel in docs/agent/fleet/G1-geo.md is the
// set of buyer questions an assistant is asked. llms.txt answers each one with
// a page that exists, in the person's words. A panel prompt with no line here
// is a question llms.txt is silent on.
describe('buyer questions (G1, 2026-11-22)', () => {
  const PANEL_SIZE = 15;

  it('answers every panel prompt, once, in panel order', () => {
    expect(BUYER_QUESTIONS.map(b => b.panel)).toEqual(Array.from({ length: PANEL_SIZE }, (_, i) => i + 1));
  });

  it('the panel in the brief is the panel here', () => {
    const brief = read('docs', 'agent', 'fleet', 'G1-geo.md');
    const panel = brief.slice(brief.indexOf('## The prompt panel'), brief.indexOf('## Each Wednesday run'));
    const prompts = [...panel.matchAll(/^\d+\. (?:\(TR\) )?(.+)$/gm)].map(m => m[1].trim());
    expect(prompts).toHaveLength(PANEL_SIZE);
  });

  it('prints each question with its live links and a one-line answer, under its own heading', () => {
    const block = text.slice(text.indexOf('## Questions people ask'), text.indexOf('## Facts an assistant'));
    expect(block.length).toBeGreaterThan(0);
    const onSitemap = new Set(facts.pages.map(p => p.path));
    for (const { q, paths, a } of BUYER_QUESTIONS) {
      const lines = block.split('\n').filter(l => l.startsWith(`- **${q}** `));
      expect(lines, q).toHaveLength(1);
      for (const p of paths) {
        expect(onSitemap.has(p), p).toBe(true);
        expect(lines[0], q).toContain(`https://sqlquest.app${p}`);
      }
      expect(lines[0], q).toContain(` — ${a}`);
      expect(a.length, q).toBeGreaterThan(20);
    }
  });
});
