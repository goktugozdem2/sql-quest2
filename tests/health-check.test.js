// The SQL Interview Health Check (2026-11-25) — /sql-interview-readiness-test/.
//
// Founder: the check exists to learn the person's real goal and hand back a
// roadmap that fits it. These tests pin:
//   1. the goal and role lists map onto the app's own stores (intake goal,
//      intent, INTAKE_ROLES) so the plan link lands with the goal set;
//   2. the items follow the goal (selectQuestions), the extra items are right
//      (the debug item is RUN in SQLite), and no item makes a frequency claim;
//   3. the roadmap (buildHealthRoadmap): unit, order, no repeats, Pro marked;
//   4. the readiness number only for a signed archetype company;
//   5. the share code carries scores, company and role only;
//   6. the page runs the module's own functions, events never carry the date;
//   7. every company page sends people in with src=company-<slug>;
//   8. the app's link door completes the intake from the check's record.
// The whole check is DARK behind the build-time flag `healthCheck` (PR #349
// review), so these tests read the flag-ON render, never the committed page;
// tests/health-check-flag.test.js pins what each flag state writes.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  QUESTIONS, READINESS_SKILLS, HEALTH_GOALS, READINESS_ROLES, EXTRA_QUESTIONS, SHARE_SKILLS,
  selectQuestions, applyRoleWeights, encodeShareCode, decodeShareCode, healthDaysOut, buildHealthRoadmap, equalWeights,
} from '../src/data/readiness-questions.js';
import { INTAKE_ROLES, intakeGoalFor } from '../src/utils/onboarding-intake.js';
import { CANONICAL_SKILLS } from '../src/utils/skill-calc.js';
import { SQL_PATTERNS } from '../src/data/sql-patterns.js';
import { INTERVIEW_ARCHETYPES } from '../src/data/interview-archetypes.js';
import { SQL_ROADMAP_CHALLENGE_ORDER } from '../src/data/roadmap-stages.js';
import { makeChallengeComparator } from '../src/utils/challenge-order.js';
import { buildData, render, renderHealthCheck, inlineFn, TRAP_FOR_SKILL, ARCHETYPE_MOCKS, ARCHETYPE_SLUGS } from '../scripts/build-readiness-test.mjs';
import { loadBank, readinessBlock } from '../scripts/build-company-pages.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const DATA = buildData();
const PAGE = render(DATA, { healthCheck: true });   // the flag-ON page
const ALL = [...QUESTIONS, ...EXTRA_QUESTIONS];

describe('1. the goal and the role map onto the app\'s own stores', () => {
  it('every goal names a live intake goal and that goal\'s intent', () => {
    expect(HEALTH_GOALS.map(g => g.id)).toEqual(['interview', 'first-job', 'move-up', 'ai-sql', 'learn']);
    for (const g of HEALTH_GOALS) {
      const intake = intakeGoalFor(g.intakeGoal);
      expect(intake, g.id).toBeTruthy();
      expect(intake.intent, g.id).toBe(g.intent);
    }
  });
  it('every role maps to an INTAKE_ROLES id and leans only canonical skills, by at most 1.5×', () => {
    expect(READINESS_ROLES.map(r => r.id)).toEqual(['data-analyst', 'analytics-engineer', 'data-engineer', 'data-scientist', 'ai-ml-engineer']);
    for (const r of READINESS_ROLES) {
      expect(INTAKE_ROLES, r.id).toContain(r.intakeRole);
      for (const [k, m] of Object.entries(r.lean)) {
        expect(CANONICAL_SKILLS, r.id).toContain(k);
        expect(m >= 1 && m <= 1.5, `${r.id}/${k}`).toBe(true);
      }
    }
    expect(new Set(READINESS_ROLES.map(r => r.code)).size).toBe(READINESS_ROLES.length);
  });
  it('a role multiplies; it never invents a weight the base does not have', () => {
    const base = { Joins: 10, 'Window Functions': 0, 'Aggregation & Grouping': 20 };
    expect(applyRoleWeights(base, 'data-analyst', READINESS_ROLES)).toEqual({ Joins: 12.5, 'Window Functions': 0, 'Aggregation & Grouping': 30 });
    expect(applyRoleWeights(base, 'data-scientist', READINESS_ROLES)['Window Functions']).toBe(0);
    expect(applyRoleWeights(base, 'nope', READINESS_ROLES)).toEqual(base);
    expect(applyRoleWeights(base, 'nope', READINESS_ROLES)).not.toBe(base);
  });
});

describe('2. the items follow the goal, and every item is right', () => {
  it('always ten items; the core skill coverage survives every goal × role', () => {
    for (const g of HEALTH_GOALS) {
      for (const r of [null, ...READINESS_ROLES.map(x => x.id)]) {
        const sel = selectQuestions({ goal: g.id, role: r }, QUESTIONS, EXTRA_QUESTIONS);
        expect(sel.length, `${g.id}/${r}`).toBe(10);
        for (const s of READINESS_SKILLS) expect(sel.some(q => q.skill === s), `${g.id}/${r}/${s}`).toBe(true);
      }
    }
  });
  it('a first job or general learning gets the fundamentals item; SQL-with-AI or an AI/ML engineer gets the debug item; an interview gets the core ten', () => {
    const ids = sel => sel.map(q => q.id || null);
    expect(ids(selectQuestions({ goal: 'first-job' }, QUESTIONS, EXTRA_QUESTIONS))).toContain('basics-top-n');
    expect(ids(selectQuestions({ goal: 'learn' }, QUESTIONS, EXTRA_QUESTIONS))).toContain('basics-top-n');
    expect(ids(selectQuestions({ goal: 'ai-sql' }, QUESTIONS, EXTRA_QUESTIONS))).toContain('debug-ai-left-join');
    expect(ids(selectQuestions({ goal: 'interview', role: 'ai-ml-engineer' }, QUESTIONS, EXTRA_QUESTIONS))).toContain('debug-ai-left-join');
    expect(selectQuestions({ goal: 'interview', role: 'data-analyst' }, QUESTIONS, EXTRA_QUESTIONS)).toEqual(QUESTIONS);
  });
  it('every item: four options, an answer in range, a canonical skill, a reason', () => {
    for (const q of ALL) {
      expect(q.options.length, q.q).toBe(4);
      expect(new Set(q.options).size, q.q).toBe(4);
      expect(q.answer >= 0 && q.answer < 4, q.q).toBe(true);
      expect(CANONICAL_SKILLS, q.q).toContain(q.skill);
      expect(q.why.length, q.q).toBeGreaterThan(40);
    }
    expect(SHARE_SKILLS).toEqual([...READINESS_SKILLS, 'Querying Basics']);
  });
  it('no item claims how often something comes up in interviews (item review, 2026-11-25)', () => {
    for (const q of ALL) {
      const text = [q.q, q.why, ...q.options].join(' ');
      expect(text, q.q).not.toMatch(/\b(classic|most[- ]asked|commonly asked|frequently|often asked|every interview|favou?rite)\b/i);
    }
  });
  const db = () => {
    const d = new Database(':memory:');
    d.exec(`CREATE TABLE customers(id INTEGER, name TEXT);
      INSERT INTO customers VALUES (1,'Ana'),(2,'Ben'),(3,'Cy');
      CREATE TABLE orders(id INTEGER, customer_id INTEGER, status TEXT, amount INTEGER);
      INSERT INTO orders VALUES (1,1,'paid',10),(2,1,'refunded',5),(3,2,'refunded',7);
      CREATE TABLE products(name TEXT, price INTEGER);
      INSERT INTO products VALUES ('a',1),('b',5),('c',9),('d',7),('e',3);`);
    return d;
  };
  it('the debug item: the AI query loses customers, the right fix keeps them at 0, the near-miss counts 1', () => {
    const q = EXTRA_QUESTIONS.find(x => x.id === 'debug-ai-left-join');
    const d = db();
    const buggy = d.prepare(q.sql).all();
    expect(buggy.map(r => r.name)).toEqual(['Ana']);
    const fixed = d.prepare("SELECT c.id, c.name, COUNT(o.id) AS paid_orders FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'paid' GROUP BY c.id, c.name ORDER BY c.id").all();
    expect(fixed.map(r => r.paid_orders)).toEqual([1, 0, 0]);
    const nearMiss = d.prepare("SELECT c.id, COUNT(*) AS paid_orders FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'paid' GROUP BY c.id ORDER BY c.id").all();
    expect(nearMiss.map(r => r.paid_orders)).toEqual([1, 1, 1]);
    const inner = d.prepare("SELECT c.id FROM customers c JOIN orders o ON o.customer_id = c.id WHERE o.status = 'paid' GROUP BY c.id").all();
    expect(inner.length).toBe(1);
    expect(q.options[q.answer]).toMatch(/ON clause and count o\.id/);
  });
  it('the fundamentals item: only the keyed option returns the three most expensive', () => {
    const q = EXTRA_QUESTIONS.find(x => x.id === 'basics-top-n');
    const d = db();
    expect(d.prepare(q.options[0]).all().map(r => r.name)).toEqual(['c', 'd', 'b']);
    expect(d.prepare(q.options[1]).all().map(r => r.name)).toEqual(['a', 'e', 'b']);
    expect(d.prepare(q.options[2]).all().length).toBe(1);
    expect(() => d.prepare(q.options[3]).all()).toThrow();
    expect(q.answer).toBe(0);
  });
});

describe('3. the roadmap', () => {
  const pool = (skill, n, diff = 'Medium') => Array.from({ length: n }, (_, i) => ({ id: `${skill}-${i}`, title: `${skill} ${i}`, difficulty: i === 0 ? 'Easy' : diff, slug: 's', pro: diff === 'Hard' }));
  const pools = { Joins: pool('Joins', 8), 'Window Functions': pool('Window Functions', 8, 'Hard'), 'NULL Handling': pool('NULL Handling', 8) };
  const scores = { Joins: 50, 'Window Functions': 0, 'NULL Handling': 100 };
  it('weeks by default (4), weakest first, skills at 100 last, no item twice, Easy skipped at 50+', () => {
    const rm = buildHealthRoadmap({ goal: 'learn', scores, weights: equalWeights(Object.keys(scores)), daysOut: null, pools });
    expect(rm.unit).toBe('week');
    expect(rm.steps.map(s => s.skill)).toEqual(['Window Functions', 'Joins', 'Window Functions', 'Joins']);
    const ids = rm.steps.flatMap(s => s.items.map(c => c.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(rm.steps[1].items.some(c => c.difficulty === 'Easy')).toBe(false);
    expect(rm.steps[0].items.map(c => c.id)).toEqual(['Window Functions-0', 'Window Functions-1', 'Window Functions-2']);
    expect(rm.mock).toBeNull();
  });
  it('days when the date is close; 3–5 weeks from the time left; the mock closes only an interview roadmap, as Pro', () => {
    expect(buildHealthRoadmap({ goal: 'interview', scores, daysOut: 3, pools }).steps.length).toBe(3);
    expect(buildHealthRoadmap({ goal: 'interview', scores, daysOut: 3, pools }).unit).toBe('day');
    expect(buildHealthRoadmap({ goal: 'interview', scores, daysOut: 0, pools }).steps.length).toBe(1);
    expect(buildHealthRoadmap({ goal: 'interview', scores, daysOut: 14, pools }).unit).toBe('day');
    expect(buildHealthRoadmap({ goal: 'interview', scores, daysOut: 15, pools }).steps.length).toBe(3);
    expect(buildHealthRoadmap({ goal: 'interview', scores, daysOut: 70, pools }).steps.length).toBe(5);
    const mock = { href: '/m/', label: 'M' };
    expect(buildHealthRoadmap({ goal: 'interview', scores, pools, mock }).mock).toEqual({ href: '/m/', label: 'M', pro: true });
    expect(buildHealthRoadmap({ goal: 'first-job', scores, pools, mock }).mock).toBeNull();
  });
  it('the role/company weight breaks ties toward the skill that matters more', () => {
    const tie = { Joins: 50, 'NULL Handling': 50 };
    const rm = buildHealthRoadmap({ goal: 'learn', scores: tie, weights: { Joins: 1, 'NULL Handling': 1.5 }, pools });
    expect(rm.steps[0].skill).toBe('NULL Handling');
  });
  it('counts free items and keeps every Pro flag', () => {
    const rm = buildHealthRoadmap({ goal: 'learn', scores, pools });
    const all = rm.steps.flatMap(s => s.items);
    expect(rm.freeItems).toBe(all.filter(c => !c.pro).length);
    expect(all.some(c => c.pro)).toBe(true);
    expect(buildHealthRoadmap({ scores: {} }).steps).toEqual([]);
  });
});

describe('4. the page data: archetype numbers, curriculum order, honest Pro flags', () => {
  const data = DATA;
  const bank = loadBank();
  it('only the signed archetype companies carry a readiness number and a company mock', () => {
    const signed = INTERVIEW_ARCHETYPES.flatMap(a => a.members.map(m => m.pageSlug));
    expect([...ARCHETYPE_SLUGS].sort()).toEqual(signed.sort());
    expect(Object.keys(ARCHETYPE_MOCKS).sort()).toEqual(signed.sort());
    const mocks = read('src/data/mock-interviews.js');
    for (const id of Object.values(ARCHETYPE_MOCKS)) expect(mocks).toContain(`id: '${id}'`);
    for (const [slug, c] of Object.entries(data.companies)) {
      expect(c.archetype, slug).toBe(signed.includes(slug));
      expect(!!c.mock, slug).toBe(signed.includes(slug));
    }
    // the page: the company-weighted number only behind `arch`
    expect(PAGE).toContain('const base = arch ? co.weights : Object.fromEntries(skills.map(s => [s, 1]));');
    expect(PAGE).toContain("$('rlabel').textContent = arch ? co.name + ' Interview Readiness' : 'Your SQL score';");
  });
  it('every pool is in curriculum order, and a Pro flag is exactly a Hard that is not a free preview', () => {
    const cmp = makeChallengeComparator(SQL_ROADMAP_CHALLENGE_ORDER);
    const check = ids => {
      const list = ids.map(id => bank.byId.get(id));
      expect(list.every(Boolean)).toBe(true);
      expect(list.slice().sort(cmp).map(c => c.id)).toEqual(ids);
    };
    for (const ids of Object.values(data.general.pool)) check(ids);
    for (const c of Object.values(data.companies)) for (const ids of Object.values(c.pool)) check(ids);
    for (const [key, c] of Object.entries(data.CH)) {
      const id = c.id;
      expect(key).toBe('c' + id);
      const ch = bank.byId.get(Number(id));
      expect(c.pro, id).toBe(ch.difficulty === 'Hard' && ch.freePreview !== true);
    }
  });
  it('every trap page is a live pattern page', () => {
    for (const slug of Object.values(TRAP_FOR_SKILL)) expect(SQL_PATTERNS.some(p => p.slug === slug), slug).toBe(true);
  });
});

describe('5. the share code', () => {
  const companies = { 'capital-one': {} };
  it('round-trips scores, company and role; a skill not asked stays absent', () => {
    const scores = { Joins: 50, 'Window Functions': 100, 'NULL Handling': 0 };
    const code = encodeShareCode({ scores, company: 'capital-one', role: 'data-analyst' }, SHARE_SKILLS, READINESS_ROLES);
    expect(code).toBe('5a--0---_capital-one_da');
    expect(decodeShareCode(code, SHARE_SKILLS, READINESS_ROLES, companies)).toEqual({ scores, company: 'capital-one', role: 'data-analyst' });
  });
  it('refuses or clips what it does not know', () => {
    const d = c => decodeShareCode(c, SHARE_SKILLS, READINESS_ROLES, companies);
    expect(d(null)).toBeNull();
    expect(d('5a--0---')).toBeNull();
    expect(d('5a--0--_x_da')).toBeNull();
    expect(d('--------__')).toBeNull();
    expect(d('5a--0---_<script>_da').company).toBeNull();
    expect(d('5a--0---_unknown-co_zz')).toEqual({ scores: { Joins: 50, 'Window Functions': 100, 'NULL Handling': 0 }, company: null, role: null });
    expect(d('x'.repeat(81))).toBeNull();
  });
});

describe('6. the page runs the module, asks the goal first, and never sends the date', () => {
  it('is the Health Check render and inlines the module\'s functions verbatim', () => {
    expect(PAGE).toBe(renderHealthCheck(DATA));
    for (const fn of ['selectQuestions', 'applyRoleWeights', 'encodeShareCode', 'decodeShareCode', 'healthDaysOut', 'buildHealthRoadmap']) {
      const src = inlineFn(fn);
      expect(src.startsWith(`function ${fn}(`), fn).toBe(true);
      expect(PAGE, fn).toContain(src);
    }
  });
  it('the inlined functions are self-contained: evaluated alone they agree with the module', () => {
    const alone = name => new Function(`${inlineFn(name)}; return ${name};`)();
    expect(alone('applyRoleWeights')({ Joins: 2 }, 'data-engineer', READINESS_ROLES)).toEqual(applyRoleWeights({ Joins: 2 }, 'data-engineer', READINESS_ROLES));
    expect(alone('healthDaysOut')('2026-12-01', Date.UTC(2026, 10, 25, 15))).toBe(6);
    expect(healthDaysOut('2026-12-01', Date.UTC(2026, 10, 25, 15))).toBe(6);
    expect(healthDaysOut('12/01/2026', 0)).toBeNull();
    const args = { goal: 'interview', scores: { Joins: 0 }, pools: { Joins: [{ id: 1, difficulty: 'Medium', pro: false }] }, mock: { href: '/m/', label: 'M' } };
    expect(alone('buildHealthRoadmap')(args)).toEqual(buildHealthRoadmap(args));
    expect(alone('selectQuestions')({ goal: 'ai-sql' }, QUESTIONS, EXTRA_QUESTIONS)).toEqual(selectQuestions({ goal: 'ai-sql' }, QUESTIONS, EXTRA_QUESTIONS));
  });
  it('names and promises a health check, goal first', () => {
    expect(PAGE).toMatch(/<title>SQL Interview Health Check[^<]*<\/title>/);
    expect(PAGE).toContain('SQL Interview <span style="color:#FFE34D;">Health Check</span></h1>');
    expect(PAGE).toContain('Free · 10 minutes · no signup');
    const start = PAGE.slice(PAGE.indexOf('<section id="start"'), PAGE.indexOf('<section id="quiz"'));
    expect(start.indexOf('id="goal"')).toBeLessThan(start.indexOf('id="company"'));
    for (const r of READINESS_ROLES) expect(start).toContain(`<option value="${r.id}">`);
    expect(PAGE).toContain("if (!L.goal) { $('need').hidden = false;");
  });
  it('every readiness_* event carries the lens (goal, companySlug, role, daysOut, src) and never the date or an answer', () => {
    const script = PAGE.slice(PAGE.indexOf('<script>\nconst QUESTIONS'));
    const calls = [...script.matchAll(/track\('readiness_[a-z_]+'[^;]*;/g)].map(m => m[0]);
    expect(calls.length).toBeGreaterThanOrEqual(4);
    for (const c of calls) {
      expect(c, c).not.toMatch(/\$\('date'\)|answers|\.date\b/);
    }
    expect(script).toMatch(/const lens = \(\) => \{[\s\S]*?return \{ goal, companySlug, role, daysOut, src: SRC \};/);
    for (const e of ['readiness_started', 'readiness_completed', 'readiness_plan_clicked']) expect(calls.some(c => c.startsWith(`track('${e}'`) && /, L\)\)/.test(c)), e).toBe(true);
    expect(calls.some(c => c.startsWith("track('readiness_shared', { companySlug: L.companySlug, role: L.role, method })"))).toBe(true);
  });
  it('the result copy says what the page does (headless walk, 2026-11-25)', () => {
    // the start card does not promise that the goal/role stay local — the
    // readiness_* events carry them; only the answers to the items stay
    expect(PAGE).toContain('Your answers to the questions stay in this browser.');
    expect(PAGE).not.toContain('Your answers stay in this browser.');
    // "Built from your goal and your Skillmap." — a list, never "goal, Skillmap."
    const lede = new Function('roleObj', 'L', 'arch', 'co', PAGE.slice(PAGE.indexOf("  const from = ['your goal'"), PAGE.indexOf("  const item = c =>")).replace(/\$\('rmlede'\)\.textContent = /, 'return '));
    expect(lede(null, { daysOut: null }, false, null)).toMatch(/^Built from your goal and your Skillmap\. The skills that need the most work come first;/);
    expect(lede({ label: 'Data analyst' }, { daysOut: 30 }, true, { name: 'Capital One' })).toMatch(/^Built from your goal, your Skillmap, the Data analyst lean and the 30 days you have\. The skills come in order of the gap, weighted by how much of our Capital One set uses them;/);
  });
  it('the record keeps the app\'s shape and adds the person\'s own goal, date and role', () => {
    expect(PAGE).toContain("JSON.stringify({ at: Date.now(), company: co ? co.name : null, overall, weakest, scores: scoresObj, goal: goalObj.intakeGoal, healthGoal: L.goal, date: L.goal === 'interview' && L.daysOut !== null ? $('date').value : null, intakeRole: roleObj ? roleObj.intakeRole : null })");
  });
});

describe('7. every company page is a door into the check (flag on)', () => {
  const pages = fs.readdirSync(path.join(ROOT, 'src')).filter(f => /-sql-interview\.html$/.test(f));
  it('the readiness block\'s one accent button opens the check with src=company-<slug>', () => {
    expect(pages.length).toBeGreaterThanOrEqual(30);
    for (const f of pages) {
      const slug = f.replace(/-sql-interview\.html$/, '');
      const block = readinessBlock({ slug, name: 'X', src: `${slug}-sql-interview` }, true);
      expect(block, f).toContain(`href="/sql-interview-readiness-test/?company=${slug}&amp;src=company-${slug}" class="btn bp"`);
      expect(block, f).toMatch(/SQL readiness — 10 minutes<\/a>/);
      expect((block.match(/class="btn bp"/g) || []).length, f).toBe(1);
    }
  });
});

describe('8. the app completes the intake from the check\'s own answers', () => {
  it('the ?goal= link door reads date and role from the record only on src=readiness, validated, behind the flag', () => {
    const app = read('src/app.jsx');
    const at = app.indexOf("if (src === 'readiness' && ftbFlag('healthCheck')) {");
    expect(at).toBeGreaterThan(0);
    const block = app.slice(at, at + 600);
    expect(block).toContain("localStorage.getItem('sqlquest_readiness_v1')");
    expect(block).toContain('isValidIntakeDate(rec.date, Date.now())');
    expect(block).toContain('INTAKE_ROLES.includes(rec.intakeRole)');
    expect(app).toContain('date: checkDate, role: checkRole };');
    expect(app).toContain("completeIntake({ goal: link.goal, goalSource: 'link', company: link.company, level: link.level, date: link.date || null, role: link.role || null });");
  });
});
