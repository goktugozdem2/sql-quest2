// The SQL Interview Health Check ships DARK (PR #349, A1/Q1 REVISE item 1).
//
// `healthCheck` in src/data/feature-flags.js is a build-time flag for two
// generators and one app door. Off must be today's site, byte for byte:
//   - scripts/build-readiness-test.mjs writes the readiness test from
//     scripts/readiness-test-legacy.mjs (origin/main's render, unchanged);
//   - scripts/build-company-pages.mjs keeps today's readiness-block copy and
//     links on every company page;
//   - app.jsx's `?goal=` door ignores the check's date and role.
// On writes the Health Check and the src=company-<slug> door.
//
// The flip PR sets the flag, re-runs both generators and `npm run build`;
// section 2 fails until the committed pages match the flag.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { buildData, render, renderHealthCheck } from '../scripts/build-readiness-test.mjs';
import { renderLegacy, legacyData, LEGACY_FANOUT_WHY } from '../scripts/readiness-test-legacy.mjs';
import { HEALTH_CHECK_ON, healthCheckHref, healthCheckLabel, readinessBlock } from '../scripts/build-company-pages.mjs';
import { QUESTIONS } from '../src/data/readiness-questions.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const FLAGS = read('src/data/feature-flags.js');
const DATA = buildData();
const OFF = render(DATA, { healthCheck: false });
const ON = render(DATA, { healthCheck: true });
const COMPANY_PAGES = fs.readdirSync(path.join(ROOT, 'src')).filter(f => /-sql-interview\.html$/.test(f));
const blockOf = html => html.slice(html.indexOf('<!-- company-readiness:start -->'), html.indexOf('<!-- company-readiness:end -->'));

describe('1. the flag exists, is read one way, and the app reads it strictly', () => {
  it('declared explicitly in features (the app\'s FF reads a MISSING key as true)', () => {
    expect(FLAGS).toMatch(/\n\s*healthCheck:\s*(true|false),/);
    expect(HEALTH_CHECK_ON).toBe(/\n\s*healthCheck:\s*true,/.test(FLAGS));
  });
  it('the app\'s ?goal= door takes the check\'s date and role only through ftbFlag(\'healthCheck\')', () => {
    const app = read('src/app.jsx');
    expect(app).toContain("if (src === 'readiness' && ftbFlag('healthCheck')) {");
    expect(app.match(/sqlquest_readiness_v1'\) \|\| 'null'\);\n\s*if \(rec && isValidIntakeDate\(rec\.date/g) || []).toHaveLength(1);
  });
});

describe('2. the committed pages are the flag\'s own render', () => {
  it('the readiness page', () => {
    expect(read('src/sql-interview-readiness-test.html'), 'run node scripts/build-readiness-test.mjs').toBe(HEALTH_CHECK_ON ? ON : OFF);
  });
  it('every company page\'s readiness block, nav and hero link', () => {
    for (const f of COMPANY_PAGES) {
      const slug = f.replace(/-sql-interview\.html$/, '');
      const html = read(`src/${f}`);
      const block = blockOf(html);
      expect(block, f).toContain(`href="${healthCheckHref(slug, HEALTH_CHECK_ON)}" class="btn bp" data-track="cta_readiness_`);
      expect(block, f).toMatch(HEALTH_CHECK_ON ? /SQL readiness — 10 minutes<\/a>/ : /">Check my [^<]+ readiness<\/a>/);
      for (const m of html.matchAll(/<a href="(\/sql-interview-readiness-test\/[^"]*)" class="btn b[po]"[^>]*>/g)) {
        expect(m[1], `${f}: ${m[0]}`).toBe(healthCheckHref(slug, HEALTH_CHECK_ON));
      }
    }
  });
});

describe('3. off is today\'s page; on is the Health Check', () => {
  it('off: the readiness test, its title, its plan link, its words', () => {
    expect(OFF).toBe(renderLegacy(legacyData(DATA)));
    expect(OFF).toContain('<title>SQL Interview Readiness Test — Free, 10 Questions, Your Skillmap | SQLQuest.app</title>');
    expect(OFF).toContain("+ '&goal=interview'");
    expect(OFF).not.toMatch(/Health Check|id="goal"|id="role"|readiness_shared|src=company-/);
    expect(OFF).toContain(JSON.stringify(LEGACY_FANOUT_WHY).slice(1, -1));
    // the shared item keeps its reviewed words for the app and the check
    expect(QUESTIONS[1].why).not.toBe(LEGACY_FANOUT_WHY);
  });
  it('off: the old data shape, key for key (companies {name,n,weights,next}, general {name,weights,next})', () => {
    const L = legacyData(DATA);
    for (const c of Object.values(L.companies)) expect(Object.keys(c)).toEqual(['name', 'n', 'weights', 'next']);
    expect(Object.keys(L.general)).toEqual(['name', 'weights', 'next']);
    expect(Object.keys(L)).toEqual(['companies', 'general']);
  });
  it('on: the Health Check', () => {
    expect(ON).toBe(renderHealthCheck(DATA));
    expect(ON).toMatch(/<title>SQL Interview Health Check[^<]*<\/title>/);
    expect(ON).toContain("+ '&goal=' + goalObj.intent");
  });
  it('company block: off is today\'s copy and link; on opens the check with src=company-<slug>', () => {
    const off = readinessBlock({ slug: 'capital-one', name: 'Capital One', src: 'capital-one' }, false);
    expect(off).toContain('<p style="font-size:15px;color:#94a3b8;max-width:620px;margin:0 auto 26px;line-height:1.75;">Ten questions, no signup. You get a readiness score');
    expect(off).toContain('<a href="/sql-interview-readiness-test/?company=capital-one" class="btn bp" data-track="cta_readiness_capital_one">Check my Capital One readiness</a>');
    expect(off).not.toMatch(/Health Check|src=company-/);
    const on = readinessBlock({ slug: 'capital-one', name: 'Capital One', src: 'capital-one' }, true);
    expect(on).toContain('<a href="/sql-interview-readiness-test/?company=capital-one&amp;src=company-capital-one" class="btn bp" data-track="cta_readiness_capital_one">Check your Capital One SQL readiness — 10 minutes</a>');
    expect(healthCheckLabel('X', false)).toBe('Check my X readiness');
  });
});

// Byte for byte against origin/main's generator output — the pages main
// serves today (main's own tests pin them to its generators). Runs only where
// origin/main is fetched and does not yet carry the flag, i.e. on this PR's
// branch; once merged, section 2 carries the promise.
const mainRef = (() => {
  try {
    execFileSync('git', ['rev-parse', '--verify', '-q', 'origin/main^{commit}'], { cwd: ROOT, stdio: 'pipe' });
    const flags = execFileSync('git', ['show', 'origin/main:src/data/feature-flags.js'], { cwd: ROOT, stdio: 'pipe' }).toString();
    return /\n\s*healthCheck:/.test(flags) ? null : 'origin/main';
  } catch (_) { return null; }
})();
const atMain = f => execFileSync('git', ['show', `${mainRef}:${f}`], { cwd: ROOT, stdio: 'pipe', maxBuffer: 64 * 1024 * 1024 }).toString();

describe.skipIf(!mainRef)('4. flag off = origin/main, byte for byte (pre-merge only)', () => {
  it('the readiness page off is origin/main\'s page', () => {
    expect(OFF === atMain('src/sql-interview-readiness-test.html'), 'merge origin/main, re-run the generator, compare').toBe(true);
  });
  it.skipIf(HEALTH_CHECK_ON)('every company page off is origin/main\'s page', () => {
    for (const f of COMPANY_PAGES) {
      let main;
      try { main = atMain(`src/${f}`); } catch (_) { continue; }   // a page newer than main
      expect(read(`src/${f}`) === main, f).toBe(true);
    }
  });
});
