// A company arrival gets a first question to press (2026-11-20, funnel plan
// item 5). Of 149 search arrivals from a company page in 35 days, 63 opened
// no challenge: the company banner said "pick any one to start" and the set's
// list sat ~1,000px down. The banner now carries one button that opens the
// set's first open, unsolved challenge in CURRICULUM order.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadQuestionBank } from '../scripts/question-slugs.mjs';
import { buildCurriculumOrder, pickNextChallengeWith } from '../src/utils/challenge-order.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = readFileSync(join(ROOT, 'src/app.jsx'), 'utf8');

function liveOrder() {
  const src = readFileSync(join(ROOT, 'src/data/roadmap-stages.js'), 'utf8');
  const block = src.slice(src.indexOf('const SQL_ROADMAP_STAGES'), src.indexOf('const SQL_ROADMAP_CHALLENGE_ORDER'));
  const stages = [...block.matchAll(/challengeIds:\s*\[([^\]]*)\]/g)]
    .map(m => ({ challengeIds: m[1].split(',').map(s => Number(s.trim())).filter(Number.isInteger) }));
  return buildCurriculumOrder(stages);
}

let bank;
beforeAll(() => {
  const { bank: b, tags } = loadQuestionBank();
  bank = b.map(c => ({ ...c, companies: tags[c.id] || [] }));
});

describe('the company banner button', () => {
  const fnStart = app.indexOf('const companyBannerNext = () =>');
  const fn = app.slice(fnStart, app.indexOf('\n  };', fnStart));

  it('picks through the curriculum picker with the list rows\' three locks — never raw order', () => {
    expect(fnStart).toBeGreaterThan(-1);
    expect(fn).toContain('pickNextChallenge(scoped');
    expect(fn).not.toMatch(/challenges\.find\(|scoped\.find\(|scoped\[0\]/);
    expect(fn).toContain('!solvedChallenges.has(c.id)');
    expect(fn).toContain("isContentLocked('challenge', c)");
    expect(fn).toContain('companySetGate(');
    expect(fn).toContain('quotaGate(');
  });

  it('renders inside the company banner and opens the pick, stamped company_banner', () => {
    const banner = app.slice(app.indexOf("You're practicing {companyFilter} SQL questions."), app.indexOf('{/* Header & Filters */}'));
    expect(banner).toContain('data-testid="company-banner-start"');
    expect(banner).toContain("openChallenge(next, { openedFrom: 'company_banner' })");
    expect(banner).toContain('companyBannerNext()');
  });

  it('on the live bank, a cold visitor to Wise, Revolut and Capital One is handed an Easy first', () => {
    const order = liveOrder();
    for (const company of ['Wise', 'Revolut', 'Capital One']) {
      const scoped = bank.filter(c => c.companies.includes(company));
      expect(scoped.length, company).toBeGreaterThan(3);
      const pick = pickNextChallengeWith(order, scoped, c => c.difficulty !== 'Hard');
      expect(pick, company).not.toBeNull();
      expect(pick.difficulty, `${company}: ${pick.id} ${pick.title}`).toBe('Easy');
    }
  });
});
