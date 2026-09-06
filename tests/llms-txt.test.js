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
import fs from 'node:fs';
import os from 'node:os';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildLlmsTxt } from '../scripts/build-llms-txt.js';
import { CANONICAL_SKILLS } from '../src/utils/skill-calc.js';

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

    expect(text).toContain(`**${all.length} hands-on SQL challenges**`);
    expect(text).toContain(`${easy} Easy, ${medium} Medium, ${hard} Hard`);
    expect(text).toContain(`Adds all ${hard} Hard challenges`);
  });

  it('free previews and the free tier mirror isContentLocked (Hard is Pro unless freePreview)', () => {
    const all = bank.challengesData;
    const previews = all.filter(c => c.freePreview === true && c.difficulty === 'Hard').length;
    expect(previews).toBeGreaterThan(0);
    const free = all.filter(c => c.difficulty !== 'Hard').length + previews;

    expect(facts.freePreviewCount).toBe(previews);
    expect(facts.freeChallengeCount).toBe(free);
    expect(text).toContain(`**${free} of those are free**`);
    expect(text).toContain(`${previews} free Hard previews`);
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
      expect(text).toContain(`- ${c.name} — ${c.taggedChallenges} tagged challenges — ${c.url}`);
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
    expect(text).toContain(`a skill radar over **${CANONICAL_SKILLS.length} skills**`);
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

    const start = text.indexOf('## Pricing');
    const end = text.indexOf('\n## ', start + 1);
    pricing = text.slice(start, end);
  });

  it('finds all three plans in the modal', () => {
    expect(Object.keys(modal).sort()).toEqual(['Annual', 'Lifetime', 'Monthly']);
  });

  it('quotes each plan at the modal price, with its billing unit', () => {
    expect(pricing).toContain(`$${modal.Monthly}/month`);
    expect(pricing).toContain(`$${modal.Annual}/year`);
    expect(pricing).toContain(`$${modal.Lifetime} lifetime`);
  });

  it('quotes no dollar figure the modal does not carry', () => {
    const quoted = [...pricing.matchAll(/\$(\d+)/g)].map(m => m[1]);
    expect(quoted.length).toBeGreaterThanOrEqual(3);
    for (const q of quoted) expect(Object.values(modal), `$${q}`).toContain(q);
    expect(text).not.toMatch(/\$19(?!\d)/);   // the stale monthly price; $199 lifetime must still pass
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
      expect(html, `${file}: ${plan}`).toContain(`$${modal[plan]}${unit}`);
    }
    const quoted = [...html.matchAll(/\$(\d+)/g)].map(m => m[1]);
    expect(quoted.length).toBeGreaterThanOrEqual(3);
    for (const q of quoted) expect(Object.values(modal), `${file}: $${q}`).toContain(q);
    expect(html).not.toMatch(/\$19(?!\d)/);
  });

  it('the Pricing section links a legal page that exists and is on the sitemap', () => {
    const m = /Full terms: https:\/\/sqlquest\.app\/([a-z]+\.html)/.exec(pricing);
    expect(m).toBeTruthy();
    expect(m[1] in LEGAL_PAGES).toBe(true);
    expect(facts.pages.map(p => p.path)).toContain(`/${m[1]}`);
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
