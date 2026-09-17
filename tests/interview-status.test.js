// Interview-first status strip (2026-09-18).
//
// The founder's model, verbatim: "mülakat amaçlı kişilere hizmet edeceğiz —
// kime mülakat olacak, ne zaman olacak, şu anki durum ne, hedefe ne kadar
// var". Four fields, always visible, for an interview person: WHO (company),
// WHEN (date → days), WHERE I AM (the honest number we have), HOW FAR (what
// the plan puts between them and the date). One line under the header, above
// the tab strip, on every tab. Dark under `interviewFirst` — the seventh
// pinned call site of the one helper.
//
// Unit tests on the pure model for every WHERE branch and every count; source
// guards for what the strip must and must not be.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  interviewStatusModel, defaultItemLocked, STATUS_WHERE_KIND, STATUS_URGENT_DAYS, STATUS_CHECK_FRESH_DAYS,
} from '../src/utils/interview-first.js';
import { findPlanTarget, planToDate, daysUntil, companyReadiness, PREP_PLAN_STATUS } from '../src/utils/interview-prep.js';
import { readReadinessRecord, READINESS_RECORD_KEY } from '../src/data/readiness-questions.js';

const p = (rel) => fileURLToPath(new URL(rel, import.meta.url));
const appSource = readFileSync(p('../src/app.jsx'), 'utf8');
const i18nSource = readFileSync(p('../src/utils/i18n.js'), 'utf8');

let bank; let companyMap; let mocks;
beforeAll(async () => {
  globalThis.window = globalThis.window || {};
  await import('../src/data/challenges.js');
  await import('../src/data/sector-challenges.js');
  await import('../src/data/challenge-companies.js');
  await import('../src/data/mock-interviews.js');
  bank = globalThis.window.challengesData;
  companyMap = globalThis.window.challengeCompanies;
  mocks = globalThis.window.mockInterviewsData;
});

const NOW = Date.UTC(2026, 8, 18, 12);
const plus = (n) => {
  const d = new Date(NOW + n * 86400000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

const stripBody = () => {
  const start = appSource.indexOf('function InterviewStatusStrip(');
  expect(start).toBeGreaterThan(-1);
  const rest = appSource.slice(start);
  return rest.slice(0, rest.indexOf('\n}\n'));
};

// ───────────────────────────── the model ─────────────────────────────────────

describe('interviewStatusModel — WHO and WHEN', () => {
  it('nothing set: no company, no date, no plan; the event says so', () => {
    const m = interviewStatusModel({ prepTarget: { company: null, date: null }, solvedIds: [] });
    expect(m.who).toEqual({ company: null, hasCompany: false });
    expect(m.when).toEqual({ hasDate: false, days: null, urgent: false, past: false });
    expect(m.howFar).toBeNull();
    expect(m.event).toEqual({ hasCompany: false, hasDate: false, whereKind: 'coverage', proLeft: 0 });
  });

  it('fails closed on malformed input', () => {
    expect(interviewStatusModel().who.hasCompany).toBe(false);
    expect(interviewStatusModel(null).when.hasDate).toBe(false);
    expect(interviewStatusModel({ prepTarget: 'x', plan: 'y', solvedIds: 'z' }).howFar).toBeNull();
  });

  it('the company, trimmed; blank is no company', () => {
    expect(interviewStatusModel({ prepTarget: { company: ' Snowflake ' } }).who.company).toBe('Snowflake');
    expect(interviewStatusModel({ prepTarget: { company: '   ' } }).who.hasCompany).toBe(false);
  });

  it('the accent rule: urgent at ≤ 7 days and ≥ 0, never for a date behind us', () => {
    expect(STATUS_URGENT_DAYS).toBe(7);
    for (const d of [0, 1, 7]) expect(interviewStatusModel({ prepTarget: { date: plus(d) }, days: d }).when.urgent).toBe(true);
    for (const d of [8, 12, 30]) expect(interviewStatusModel({ prepTarget: { date: plus(d) }, days: d }).when.urgent).toBe(false);
    const past = interviewStatusModel({ prepTarget: { date: plus(-2) }, days: -2 });
    expect(past.when.urgent).toBe(false);
    expect(past.when.past).toBe(true);
    expect(past.when.days).toBe(-2);
  });

  it('a date without a usable day count reads as set-but-unknown', () => {
    const m = interviewStatusModel({ prepTarget: { date: 'not-a-date' }, days: daysUntil('not-a-date', NOW) });
    expect(m.when.hasDate).toBe(true);
    expect(m.when.days).toBeNull();
    expect(m.when.urgent).toBe(false);
  });
});

describe('interviewStatusModel — WHERE I AM, three branches, first that answers wins', () => {
  it('an archetype target with readiness → readiness N / 100', () => {
    const target = findPlanTarget('Capital One', bank, companyMap, mocks);
    const m = interviewStatusModel({
      prepTarget: { company: 'Capital One' }, target,
      readiness: { score: 43.4, parts: {} }, readinessRecord: { overall: 80 },
      solvedIds: [], plan: null,
    });
    expect(m.where).toEqual({ kind: STATUS_WHERE_KIND.READINESS, score: 43, total: 100 });
    expect(m.event.whereKind).toBe('readiness');
  });

  it('a tagged target never gets the readiness branch even if handed a readiness', () => {
    const target = findPlanTarget('Snowflake', bank, companyMap, mocks);
    const m = interviewStatusModel({ prepTarget: { company: 'Snowflake' }, target, readiness: { score: 90 }, solvedIds: [] });
    expect(m.where.kind).toBe(STATUS_WHERE_KIND.COVERAGE);
  });

  it('a fresh goal check → check score N / 100, with its age', () => {
    const target = findPlanTarget('Snowflake', bank, companyMap, mocks);
    const m = interviewStatusModel({ prepTarget: { company: 'Snowflake' }, target, readiness: null, readinessRecord: { overall: 56.6, ageDays: 3 }, solvedIds: [] });
    expect(m.where).toEqual({ kind: STATUS_WHERE_KIND.CHECK, score: 57, total: 100, ageDays: 3 });
    expect(m.event.whereKind).toBe('check');
  });

  it('the check is read with the strip\'s own freshness — 30 days, through readReadinessRecord', () => {
    expect(STATUS_CHECK_FRESH_DAYS).toBe(30);
    const store = new Map();
    const storage = { getItem: (k) => (store.has(k) ? store.get(k) : null) };
    store.set(READINESS_RECORD_KEY, JSON.stringify({ at: NOW - 20 * 86400000, overall: 61, scores: { Joins: 50 }, company: 'Snowflake' }));
    // The page's default (7 days) says stale; the strip's (30) says fresh.
    expect(readReadinessRecord(storage, { now: NOW })).toBeNull();
    const rec = readReadinessRecord(storage, { now: NOW, maxAgeDays: STATUS_CHECK_FRESH_DAYS });
    expect(rec).not.toBeNull();
    expect(rec.overall).toBe(61);
    store.set(READINESS_RECORD_KEY, JSON.stringify({ at: NOW - 31 * 86400000, overall: 61, scores: { Joins: 50 } }));
    expect(readReadinessRecord(storage, { now: NOW, maxAgeDays: STATUS_CHECK_FRESH_DAYS })).toBeNull();
    expect(appSource).toContain('readReadinessRecord(localStorage, { maxAgeDays: STATUS_CHECK_FRESH_DAYS })');
  });

  it('otherwise, set coverage: solved of the target\'s set', () => {
    const target = findPlanTarget('Snowflake', bank, companyMap, mocks);
    const ids = target.challengeIds;
    const none = interviewStatusModel({ prepTarget: { company: 'Snowflake' }, target, solvedIds: [] });
    expect(none.where).toEqual({ kind: STATUS_WHERE_KIND.COVERAGE, scoped: true, solved: 0, total: ids.length });
    const some = interviewStatusModel({ prepTarget: { company: 'Snowflake' }, target, solvedIds: new Set([ids[0], ids[1], 999999]) });
    expect(some.where.solved).toBe(2);
    expect(some.where.total).toBe(ids.length);
    expect(some.event.whereKind).toBe('coverage');
  });

  it('no target at all: solved so far over the bank', () => {
    const m = interviewStatusModel({ prepTarget: { company: null }, solvedIds: [1, 2, 3], bankSize: 299 });
    expect(m.where).toEqual({ kind: STATUS_WHERE_KIND.COVERAGE, scoped: false, solved: 3, total: 299 });
    expect(interviewStatusModel({ solvedIds: [1] }).where.total).toBeNull();
  });

  it('with real data: an archetype target under the evidence floor falls through to coverage', () => {
    const target = findPlanTarget('Capital One', bank, companyMap, mocks);
    const readiness = companyReadiness({ skillLevels: {}, solvedIds: [], target, bank, mockResult: null });
    expect(readiness).toBeNull();
    const m = interviewStatusModel({ prepTarget: { company: 'Capital One' }, target, readiness, solvedIds: [] });
    expect(m.where.kind).toBe('coverage');
    expect(m.where.total).toBe(target.challengeIds.length);
  });
});

describe('interviewStatusModel — HOW FAR, from the plan', () => {
  const build = (company, days, solvedIds = [], isPro = false, extra = {}) => {
    const target = findPlanTarget(company, bank, companyMap, mocks);
    const plan = planToDate({ target, readiness: null, solvedIds, bank, daysRemaining: days, now: NOW });
    const model = interviewStatusModel({ prepTarget: { company, date: plus(days) }, target, plan, solvedIds, isPro, days, mocks, ...extra });
    return { target, plan, model };
  };

  it('today = today\'s items; left = the scheduled items after today; deferred is carried', () => {
    const { plan, model } = build('Snowflake', 12);
    const scheduled = plan.days.flatMap(d => d.items).length;
    expect(model.howFar.today).toBe(plan.today.length);
    expect(model.howFar.left).toBe(scheduled - plan.today.length);
    expect(model.howFar.deferred).toBe(plan.totals.deferred);
    expect(model.howFar.status).toBe(PREP_PLAN_STATUS.OK);
    expect(scheduled).toBe(plan.totals.targetRemaining + plan.totals.drills + plan.totals.mock - plan.totals.deferred);
  });

  it('Pro = the scheduled items the free tier stops at: Hard without a preview, and a Pro mock', () => {
    const { plan, model } = build('Snowflake', 12);
    const scheduled = plan.days.flatMap(d => d.items);
    const expected = scheduled.filter(i => (i.kind === 'mock'
      ? !(mocks.find(m => m.id === i.interviewId) || {}).isFree
      : (i.difficulty === 'Hard' && !i.freePreview))).length;
    expect(model.howFar.pro).toBe(expected);
    expect(expected).toBeGreaterThan(0);          // Snowflake's set is mostly Hard
    expect(model.event.proLeft).toBe(expected);
  });

  it('a Pro user has no Pro count', () => {
    const { model } = build('Snowflake', 12, [], true);
    expect(model.howFar.pro).toBe(0);
    expect(model.event.proLeft).toBe(0);
    expect(model.howFar.left).toBeGreaterThan(0);
  });

  it('the caller\'s lock rule wins over the default', () => {
    const { model } = build('Snowflake', 12, [], false, { isItemLocked: () => true });
    expect(model.howFar.pro).toBe(model.howFar.today + model.howFar.left);
    const none = build('Snowflake', 12, [], false, { isItemLocked: () => false });
    expect(none.model.howFar.pro).toBe(0);
  });

  it('the default lock rule, on its own', () => {
    expect(defaultItemLocked({ kind: 'target', difficulty: 'Hard' })).toBe(true);
    expect(defaultItemLocked({ kind: 'target', difficulty: 'Hard', freePreview: true })).toBe(false);
    expect(defaultItemLocked({ kind: 'drill', difficulty: 'Medium' })).toBe(false);
    expect(defaultItemLocked({ kind: 'mock', interviewId: 'sql-fundamentals-free' }, { mocks })).toBe(false);
    expect(defaultItemLocked({ kind: 'mock', interviewId: 'faang-sql-interview' }, { mocks })).toBe(true);
    expect(defaultItemLocked({ kind: 'mock', interviewId: 'nope' }, { mocks })).toBe(true);
    expect(defaultItemLocked(null)).toBe(false);
  });

  it('solved items leave the count', () => {
    const target = findPlanTarget('Snowflake', bank, companyMap, mocks);
    const before = build('Snowflake', 30).model.howFar;
    const after = build('Snowflake', 30, target.challengeIds.slice(0, 5)).model.howFar;
    expect(after.today + after.left).toBeLessThan(before.today + before.left);
  });

  it('a date behind us, or no plan: HOW FAR is null and nothing is invented', () => {
    const target = findPlanTarget('Snowflake', bank, companyMap, mocks);
    const past = planToDate({ target, readiness: null, solvedIds: [], bank, daysRemaining: -1, now: NOW });
    expect(past.status).toBe(PREP_PLAN_STATUS.PAST);
    expect(interviewStatusModel({ prepTarget: { company: 'Snowflake', date: plus(-1) }, target, plan: past, days: -1 }).howFar).toBeNull();
    expect(interviewStatusModel({ prepTarget: { company: 'Snowflake' }, target, plan: null }).howFar).toBeNull();
    const unavailable = planToDate({ target: null, bank, daysRemaining: 3, now: NOW });
    expect(interviewStatusModel({ prepTarget: { date: plus(3) }, plan: unavailable, days: 3 }).howFar).toBeNull();
  });

  it('on the day itself: today\'s target items only, nothing left after', () => {
    const { plan, model } = build('Snowflake', 0);
    expect(plan.status).toBe(PREP_PLAN_STATUS.TODAY);
    expect(model.howFar.today).toBe(plan.today.length);
    expect(model.howFar.left).toBe(0);
    expect(model.when.urgent).toBe(true);
  });
});

// ───────────────────────────── source guards ─────────────────────────────────

describe('source guard: the strip in app.jsx', () => {
  it('is the seventh call site of the one helper, and the only reader of the model', () => {
    expect(appSource).toContain("const interviewStatusOn = interviewFirstOn('status_strip');");
    expect(appSource.split("interviewFirstOn('status_strip')").length - 1).toBe(1);
    expect(appSource).toContain("import { interviewStatusModel, STATUS_CHECK_FRESH_DAYS } from './utils/interview-first.js';");
    expect(appSource.split('interviewStatusModel(').length - 1).toBe(1);
  });

  it('the four cells, in the founder\'s order, each a button to the Coach', () => {
    const body = stripBody();
    const cells = [...body.matchAll(/<Cell id="([a-z]+)"/g)].map(m => m[1]);
    expect(cells).toEqual(['who', 'when', 'where', 'howfar']);
    expect(body).toContain('data-testid="interview-status"');
    expect(body).toContain('data-testid={`interview-status-${id}`}');
    expect(body).toContain('onClick={() => onCell && onCell(id)}');
    const handler = appSource.slice(appSource.indexOf('const onInterviewStatusCell = '), appSource.indexOf('const onInterviewStatusCell = ') + 900);
    expect(handler).toContain("setActiveTab('guide')");
    expect(handler).toContain('[data-testid="interview-prep-card"]');
    expect(handler).toContain("'interview-prep-target'");
    expect(handler).toContain("'interview-prep-date'");
    expect(handler).toContain("trackActivationEvent('interview_status_clicked', { cell })");
    // No new door into locked content, no modal.
    for (const forbidden of ['openChallenge(', 'startInterview(', 'setShowProModal(', 'setActiveInterview(', 'openPrepItem(']) {
      expect(handler, `${forbidden} in the strip's click handler`).not.toContain(forbidden);
    }
  });

  it('WHO and WHEN: the two links when unset', () => {
    const body = stripBody();
    expect(body).toContain("i18n_t('interviewStatus', 'nameCompany')");
    expect(body).toContain("i18n_t('interviewStatus', 'setDate')");
    expect(body).toContain('who.hasCompany');
  });

  it('the accent: exactly one #FFE34D, on the WHEN number, only when urgent', () => {
    const body = stripBody();
    expect(body.split('#FFE34D').length - 1).toBe(1);
    expect(body).toMatch(/color: accent \? '#FFE34D' : '#F2F0EA'/);
    expect(body).toContain('<Num accent={when.urgent}>');
    // Nowhere else in the strip does a Num get the accent except today.
    const accented = [...body.matchAll(/<Num accent(?:=\{[^}]*\})?>/g)].map(m => m[0]);
    expect(accented.sort()).toEqual(['<Num accent={when.urgent}>', '<Num accent>'].sort());
    const todayAt = body.indexOf('<Num accent>');
    expect(body.slice(todayAt - 60, todayAt)).toContain('when.days === 0');
  });

  it('numbers are Geist Mono, tabular', () => {
    const body = stripBody();
    expect(body).toContain('"Geist Mono"');
    expect(body).toContain("fontVariantNumeric: 'tabular-nums'");
  });

  it('mobile: two rows of two', () => {
    const body = stripBody();
    expect(body).toContain('grid grid-cols-2 md:grid-cols-4');
  });

  it('DESIGN.md tokens only', () => {
    const body = stripBody();
    const colours = new Set([...body.matchAll(/#[0-9A-Fa-f]{6}/g)].map(m => m[0].toUpperCase()));
    for (const c of colours) expect(['#16181F', '#2A2E38', '#F2F0EA', '#8A8E99', '#FFE34D'], `off-palette colour ${c}`).toContain(c);
  });

  it('never a modal, never a price, never "unlimited"', () => {
    const body = stripBody();
    expect(body).not.toMatch(/role="dialog"|fixed inset-0/);
    expect(body).not.toMatch(/\$\d|unlimited/i);
    const blocks = [...i18nSource.matchAll(/\n {4}interviewStatus: \{\n([\s\S]*?)\n {4}\},/g)].map(m => m[1]);
    expect(blocks.length).toBe(2);
    for (const b of blocks) expect(b).not.toMatch(/\$\d|unlimited|sınırsız|\/mo|\/yr/i);
  });

  it('the events: shown once a session with the four fields, clicked per cell', () => {
    const at = appSource.indexOf("trackActivationEvent('interview_status_shown', interviewStatus.event)");
    expect(at).toBeGreaterThan(-1);
    expect(appSource.slice(at - 400, at)).toContain('interviewStatusShownRef.current = true');
    // The payload is the model's event: {hasCompany, hasDate, whereKind, proLeft}.
    const m = interviewStatusModel({ prepTarget: { company: 'Wise', date: plus(3) }, days: 3, solvedIds: [] });
    expect(Object.keys(m.event).sort()).toEqual(['hasCompany', 'hasDate', 'proLeft', 'whereKind']);
  });

  it('the strip reads the same plan the card reads', () => {
    expect(appSource.split('buildInterviewPlan()').length - 1).toBe(2);
    const memo = appSource.slice(appSource.indexOf('const interviewStatus = useMemo('), appSource.indexOf('const interviewStatusShownRef'));
    expect(memo).toContain('built = buildInterviewPlan()');
    expect(memo).toContain("isContentLocked('interview'");
    expect(memo).toContain("isContentLocked('challenge'");
  });
});
