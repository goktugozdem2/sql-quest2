// Interview-first (2026-09-17) — the frame in
// docs/plans/interview-first-2026-09-17.md, points 1 and 2.
//
// Point 1: an interview person sees the plan first and none of the game
// surfaces. ONE predicate (src/utils/interview-first.js), ONE helper in
// app.jsx (`interviewFirstOn(surface)`), and exactly the surfaces named here.
// Everyone else sees today's product byte for byte, so the guards below are
// mostly about what is NOT touched.
//
// Point 2: a plan for every company. `findPlanTarget` offers a second tier —
// any company with MIN_TAGGED_CHALLENGES tagged challenges gets a plan and a
// note, never a readiness number. Rule 2 in interview-prep.js stands for the
// number; these tests pin that it still does.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { isInterviewPerson, interviewFirstReason, INTERVIEW_FIRST_REASONS } from '../src/utils/interview-first.js';
import { interviewNavReason, shouldShowInterviewNav } from '../src/utils/interview-nav.js';
import {
  findTarget, findPlanTarget, planTargets, taggedTargets, taggedTargetNote,
  planToDate, companyReadiness, MIN_TAGGED_CHALLENGES, TARGET_KIND, PREP_PLAN_STATUS,
} from '../src/utils/interview-prep.js';
import { pickProMockId, DEFAULT_PRO_MOCK_ID } from '../src/utils/free-tier-boundary.js';
import { challengeMatchesSkill } from '../src/utils/skill-drill.js';

const p = (rel) => fileURLToPath(new URL(rel, import.meta.url));
const appSource = readFileSync(p('../src/app.jsx'), 'utf8');
const flagsSource = readFileSync(p('../src/data/feature-flags.js'), 'utf8');
const i18nSource = readFileSync(p('../src/utils/i18n.js'), 'utf8');
const moduleSource = readFileSync(p('../src/utils/interview-first.js'), 'utf8');

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

// ───────────────────────────── the predicate ─────────────────────────────────

describe('isInterviewPerson — who the frame applies to', () => {
  it('nobody, by default', () => {
    expect(isInterviewPerson()).toBe(false);
    expect(isInterviewPerson({})).toBe(false);
    expect(interviewFirstReason({})).toBeNull();
  });

  it('declared intent interview or job_ready', () => {
    expect(interviewFirstReason({ intent: 'interview' })).toBe('intent');
    expect(interviewFirstReason({ intent: 'job_ready' })).toBe('intent');
    expect(isInterviewPerson({ intent: 'learning' })).toBe(false);
    expect(isInterviewPerson({ intent: 'exploring' })).toBe(false);
  });

  it('a countdown date, or a countdown company', () => {
    expect(interviewFirstReason({ prepTarget: { date: '2026-10-01', company: null } })).toBe('date');
    expect(interviewFirstReason({ prepTarget: { date: null, company: 'Snowflake' } })).toBe('target');
    expect(isInterviewPerson({ prepTarget: { date: '', company: '   ' } })).toBe(false);
    expect(isInterviewPerson({ prepTarget: { date: null, company: null } })).toBe(false);
  });

  it('the interview-prep Coach goal, and no other goal', () => {
    expect(interviewFirstReason({ coachGoalId: 'interview-prep' })).toBe('goal');
    expect(isInterviewPerson({ coachGoalId: 'fundamentals' })).toBe(false);
    expect(isInterviewPerson({ coachGoalId: 'analyst-day-one' })).toBe(false);
  });

  it('a company-page arrival, and no other arrival', () => {
    expect(interviewFirstReason({ arrivalSrc: 'company:Snowflake' })).toBe('company');
    expect(isInterviewPerson({ arrivalSrc: 'home' })).toBe(false);
    expect(isInterviewPerson({ arrivalSrc: 'sector:finance' })).toBe(false);
  });

  it('any interview history — an array with rows, or a boolean', () => {
    expect(interviewFirstReason({ interviewHistory: [{ interviewId: 'x' }] })).toBe('history');
    expect(interviewFirstReason({ interviewHistory: true })).toBe('history');
    expect(isInterviewPerson({ interviewHistory: [] })).toBe(false);
    expect(isInterviewPerson({ interviewHistory: false })).toBe(false);
  });

  it('fails closed on malformed input', () => {
    expect(isInterviewPerson({ intent: 42, prepTarget: 'x', coachGoalId: {}, arrivalSrc: [], interviewHistory: 'yes' })).toBe(false);
    expect(isInterviewPerson(null)).toBe(false);
  });

  it('every reason it can return is in the published list', () => {
    const seen = new Set([
      interviewFirstReason({ interviewHistory: true }),
      interviewFirstReason({ intent: 'interview' }),
      interviewFirstReason({ coachGoalId: 'interview-prep' }),
      interviewFirstReason({ arrivalSrc: 'company:Wise' }),
      interviewFirstReason({ prepTarget: { date: '2026-10-01' } }),
      interviewFirstReason({ prepTarget: { company: 'Wise' } }),
    ]);
    expect([...seen].sort()).toEqual([...INTERVIEW_FIRST_REASONS].sort());
  });
});

describe('isInterviewPerson agrees with the Interview tab on every input the tab understands', () => {
  // The frame says the population is deliberately the nav's. Two definitions
  // would drift within a month, so the module REUSES interviewNavReason —
  // this asserts it, then checks the agreement on the full grid.
  it('reuses the nav helper rather than mirroring it', () => {
    expect(moduleSource).toContain("import { interviewNavReason } from './interview-nav.js'");
  });

  it('same answer on the grid of nav inputs, and the same reason word', () => {
    const intents = [null, 'interview', 'job_ready', 'learning', 'exploring', ''];
    const histories = [false, true];
    const goals = [null, 'interview-prep', 'fundamentals'];
    const arrivals = [null, 'home', 'company:Stripe', 'sector:finance'];
    let cases = 0;
    for (const intent of intents) for (const hasInterviewHistory of histories)
      for (const goalId of goals) for (const arrivalSrc of arrivals) {
        const navReason = interviewNavReason({ intent, hasInterviewHistory, goalId, arrivalSrc });
        const ours = interviewFirstReason({ intent, interviewHistory: hasInterviewHistory, coachGoalId: goalId, arrivalSrc });
        expect(ours, JSON.stringify({ intent, hasInterviewHistory, goalId, arrivalSrc })).toBe(navReason);
        // 2026-09-20: the TAB is open to everyone while the flag is on, so
        // the agreement is with the hiring signal (interviewNavReason), not
        // with the tab's visibility. Who the interview-first surfaces apply
        // to is unchanged — that is the point of keeping the two apart.
        expect(isInterviewPerson({ intent, interviewHistory: hasInterviewHistory, coachGoalId: goalId, arrivalSrc }))
          .toBe(navReason !== null);
        cases += 1;
      }
    expect(cases).toBe(intents.length * histories.length * goals.length * arrivals.length);
  });

  it('the tab is open to everyone, the frame is not', () => {
    expect(shouldShowInterviewNav({ flagOn: true, solvedCount: 0 })).toBe(true);
    expect(isInterviewPerson({ intent: 'learning' })).toBe(false);
    expect(isInterviewPerson({})).toBe(false);
  });

  it('and adds only the countdown target on top', () => {
    // Where the nav says no, only prepTarget can turn it into a yes.
    expect(interviewNavReason({ intent: 'learning' })).toBeNull();
    expect(interviewFirstReason({ intent: 'learning', prepTarget: { date: '2026-10-01' } })).toBe('date');
    expect(interviewFirstReason({ intent: 'learning', prepTarget: { company: 'Stripe' } })).toBe('target');
  });
});

// ───────────────────────────── the flag and the helper ──────────────────────

describe('source guard: the flag is dark and ONE helper reads it', () => {
  it('feature-flags.js has interviewFirst false, and says where the frame is', () => {
    expect(flagsSource).toMatch(/interviewFirst:\s*false/);
    const at = flagsSource.indexOf('interviewFirst: false');
    const comment = flagsSource.slice(Math.max(0, at - 2200), at);
    expect(comment).toContain('docs/plans/interview-first-2026-09-17.md');
    expect(comment).toContain('2026-09-21');
  });

  it('the helper exists once, reads the flag default-OFF, and reads the predicate', () => {
    expect(appSource.split('const interviewFirstOn = ').length - 1).toBe(1);
    const at = appSource.indexOf('const interviewFirstOn = ');
    const def = appSource.slice(at, at + 300);
    expect(def).toMatch(/window\.FF\?\.feature\?\.\('interviewFirst'\)\s*===\s*true/);
    expect(def).toContain('interviewFirstReasonNow !== null');
    expect(appSource).toContain("import { interviewFirstReason } from './utils/interview-first.js';");
    expect(appSource.split('interviewFirstReason(').length - 1, 'the predicate is evaluated in one place').toBe(1);
  });

  it('the predicate is fed the same inputs the Interview tab reads, plus prepTarget', () => {
    const at = appSource.indexOf('const interviewFirstReasonNow = interviewFirstReason({');
    const call = appSource.slice(at, at + 400);
    expect(call).toContain('intent: interviewNavInputs.intent');
    expect(call).toContain('coachGoalId: interviewNavInputs.goalId');
    expect(call).toContain('arrivalSrc: interviewNavInputs.arrivalSrc');
    expect(call).toContain('prepTarget,');
    expect(call).toContain('interviewHistory,');
  });

  it('nothing else in app.jsx reads the flag directly', () => {
    expect(appSource.split("'interviewFirst'").length - 1, "a second reader of the flag").toBe(1);
  });

  it('exactly these call sites, by surface name — pinned', () => {
    const sites = [...appSource.matchAll(/interviewFirstOn\('([a-z_]+)'\)/g)].map(m => m[1]).sort();
    expect(sites).toEqual([
      'achievement_toast',
      'coach_card_above',
      'coach_card_below',
      'daily_reward',
      'header_game_cluster',
      'session',
      'status_strip',      // 2026-09-18: the four-field status strip, every tab
    ]);
    // …and no call without a surface label, which is how a fifth surface
    // would slip in unnamed.
    expect(appSource.split('interviewFirstOn(').length - 1).toBe(sites.length);
  });

  it('fires interview_first_applied {reason} once a session, from an effect', () => {
    const at = appSource.indexOf("'interview_first_applied'");
    expect(at).toBeGreaterThan(-1);
    const region = appSource.slice(at - 500, at + 120);
    expect(region).toContain('interviewFirstAppliedRef.current = true');
    expect(region).toContain("interviewFirstOn('session')");
    expect(region).toMatch(/\{ reason: interviewFirstReasonNow \}/);
  });
});

// ───────────────────────────── the four surfaces ────────────────────────────

describe('source guard: the four surfaces, and only those', () => {
  it('(a) no daily-reward surface — but the streak is still recorded', () => {
    // 2026-09-21: the Daily Reward modal is gone for everyone (the streak
    // card replaced it). What stays interview-first is the XP handout: the
    // card does not slide in, and the claim does nothing, for an interview
    // person. The practice streak itself is recorded first, unconditionally.
    const at = appSource.indexOf('const recordDailyActivity = () => {');
    const body = appSource.slice(at, appSource.indexOf('\n  };\n', at));
    const guardAt = body.indexOf('dailyRewardOn()');
    const openAt = body.indexOf("setStreakCardPending(true)");
    expect(guardAt).toBeGreaterThan(-1);
    expect(openAt).toBeGreaterThan(guardAt);
    expect(body.indexOf('setDailyStreak(newStreak)')).toBeLessThan(guardAt);
    expect(body.indexOf('setLastStreakDay(today)')).toBeLessThan(guardAt);

    const claim = appSource.slice(appSource.indexOf('const claimDailyReward = () => {'), appSource.indexOf('const claimDailyReward = () => {') + 700);
    const cGuard = claim.indexOf('if (!dailyRewardOn()) return;');
    expect(cGuard).toBeGreaterThan(-1);
    expect(claim.indexOf('setXP(')).toBeGreaterThan(cGuard);

    // the helper is the surface's single reader
    expect(appSource).toContain("function dailyRewardOn() { return !interviewFirstOn('daily_reward'); }");
    // the visit check opens nothing at all any more
    const vAt = appSource.indexOf('const checkDailyLoginReward = () => {');
    const visit = appSource.slice(vAt, appSource.indexOf('\n  };\n', vAt));
    expect(visit).not.toMatch(/setStreakCardOpen\(|setShowLoginReward/);
    expect(visit).toContain('setLoginStreak(newStreak)');
  });

  it('(b) the achievement toast does not render — the award still happens', () => {
    const render = appSource.slice(appSource.indexOf('{showAchievement && !showSoftEmailCapture'));
    expect(render.slice(0, 200)).toContain("!interviewFirstOn('achievement_toast')");
    // unlockAchievement is untouched: it still adds the id, the XP, the sound.
    const unlock = appSource.slice(appSource.indexOf("if (ach) { setUnlockedAchievements(prev => new Set([...prev, id]))"), appSource.indexOf("if (ach) { setUnlockedAchievements(prev => new Set([...prev, id]))") + 300);
    expect(unlock).toContain('setXP(prev => prev + ach.xp)');
    expect(unlock).toContain('setShowAchievement(ach)');
    expect(unlock).not.toContain('interviewFirstOn');
  });

  it('(c) the header hides the lives and the coin, keeps the streak and the identity', () => {
    const header = appSource.slice(appSource.indexOf('<header className="bg-black/30'), appSource.indexOf('</header>'));
    const gate = header.indexOf("!interviewFirstOn('header_game_cluster')");
    expect(gate).toBeGreaterThan(-1);
    const gated = header.slice(gate, header.indexOf('</>', gate));
    expect(gated).toContain('title="Lives"');
    expect(gated).toContain('title="XP"');
    expect(gated).toContain('PixelHeart');
    expect(gated).toContain('PixelCoin');
    // The streak is drawn OUTSIDE the gate (before it), the identity too.
    expect(header.indexOf('<PixelFlame')).toBeLessThan(gate);
    expect(header.indexOf('data-testid="header-identity"')).toBeGreaterThan(gate);
    expect(header.slice(header.indexOf('data-testid="header-identity"') - 800)).not.toContain('interviewFirstOn');
  });

  it('(d) the countdown card has one render function and two mount points on the Coach', () => {
    expect(appSource.split('const renderInterviewPrepCard = ').length - 1).toBe(1);
    expect(appSource.split('<InterviewPrepCard').length - 1).toBe(1);
    expect(appSource.split('renderInterviewPrepCard()').length - 1).toBe(2);
    const coach = appSource.slice(
      appSource.indexOf("{activeTab === 'guide' && currentUser && !showSimpleLearningShell"),
      appSource.indexOf('{/* Interviews Tab */}'),
    );
    const above = coach.indexOf("interviewFirstOn('coach_card_above') && renderInterviewPrepCard()");
    const below = coach.indexOf("!interviewFirstOn('coach_card_below') && renderInterviewPrepCard()");
    const nextStep = coach.indexOf("i18n_t('coachNext', 'label')");
    expect(above).toBeGreaterThan(-1);
    expect(below).toBeGreaterThan(-1);
    expect(nextStep).toBeGreaterThan(-1);
    expect(above, 'the interview-first mount is above the next-step card').toBeLessThan(nextStep);
    expect(below, "the default mount keeps the card's 2026-09-08 place below it").toBeGreaterThan(nextStep);
    // The function itself still honours the countdown flag default-OFF.
    const fn = appSource.slice(appSource.indexOf('const renderInterviewPrepCard = '));
    expect(fn.slice(0, 200)).toMatch(/window\.FF\?\.feature\?\.\('interviewCountdown'\) !== true\) return null/);
  });

  it('the landing tab is already the Coach — no redirect was added', () => {
    expect(appSource).toContain("const [activeTab, setActiveTab] = useState('guide');");
    expect(appSource).not.toMatch(/interviewFirstOn\([^)]*\)[^\n]*setActiveTab\(/);
  });
});

// ───────────────────────────── the tagged tier ──────────────────────────────

describe('findPlanTarget — a plan for every company, a number for the signed ones', () => {
  it('a signed archetype comes back as the existing target, kind archetype', () => {
    const t = findPlanTarget('Capital One', bank, companyMap, mocks);
    expect(t).not.toBeNull();
    expect(t.kind).toBe(TARGET_KIND.ARCHETYPE);
    expect(t).toEqual(findTarget('Capital One', bank, companyMap, mocks));
    expect(t.mockId).toBe('capital-one-codesignal');
  });

  it('an unsigned company with enough tags comes back tagged, with the generic Pro mock and the note', () => {
    const t = findPlanTarget('snowflake', bank, companyMap, mocks);   // case-insensitive
    expect(t).not.toBeNull();
    expect(t.company).toBe('Snowflake');
    expect(t.kind).toBe(TARGET_KIND.TAGGED);
    expect(t.challengeIds.length).toBeGreaterThanOrEqual(MIN_TAGGED_CHALLENGES);
    expect(t.challengeCount).toBe(t.challengeIds.length);
    expect(t.mockId).toBe(pickProMockId(mocks, null));
    expect(t.mockId).toBe(DEFAULT_PRO_MOCK_ID);
    expect(t.note).toBe(`Built from the ${t.challengeCount} questions tagged Snowflake and your weakest skills — not Snowflake's process.`);
    expect(t.note).toBe(taggedTargetNote('Snowflake', t.challengeCount));
    expect(t.archetypeId).toBeUndefined();
  });

  it('every challenge in a tagged target carries that company tag and exists in the bank', () => {
    const ids = new Set(bank.map(c => c.id));
    for (const t of taggedTargets(bank, companyMap, mocks)) {
      for (const id of t.challengeIds) {
        expect(ids.has(id), `${t.company}: ${id} not in the bank`).toBe(true);
        expect((companyMap[String(id)] || []).map(c => c.trim())).toContain(t.company);
      }
    }
  });

  it('the ≥ 5 threshold: four tags is nothing, five is a plan', () => {
    const map = {};
    const ids = bank.slice(0, 5).map(c => c.id);
    ids.slice(0, 4).forEach(id => { map[String(id)] = ['Four Co']; });
    ids.forEach(id => { map[String(id)] = [...(map[String(id)] || []), 'Five Co']; });
    expect(findPlanTarget('Four Co', bank, map, mocks)).toBeNull();
    const five = findPlanTarget('Five Co', bank, map, mocks);
    expect(five).not.toBeNull();
    expect(five.kind).toBe('tagged');
    expect(five.challengeIds).toEqual(ids.slice().sort((a, b) => a - b));
    expect(MIN_TAGGED_CHALLENGES).toBe(5);
  });

  it('the picker lists the signed targets first, then the tagged ones by count', () => {
    const list = planTargets(bank, companyMap, mocks);
    const signed = list.filter(t => t.kind === 'archetype');
    const tagged = list.filter(t => t.kind === 'tagged');
    expect(signed.length).toBe(2);                     // Capital One, Revolut
    expect(tagged.length).toBeGreaterThan(20);
    expect(list.slice(0, signed.length).every(t => t.kind === 'archetype')).toBe(true);
    for (let i = 1; i < tagged.length; i++) {
      expect(tagged[i - 1].challengeCount).toBeGreaterThanOrEqual(tagged[i].challengeCount);
    }
    // A signed member is never ALSO offered as a tagged target.
    const signedNames = new Set(signed.map(t => t.company));
    expect(tagged.some(t => signedNames.has(t.company))).toBe(false);
    // Measured 2026-09-17: all 30 tagged companies clear the bar.
    expect(list.length).toBe(30);
  });

  it('unknown, empty and malformed names give null', () => {
    expect(findPlanTarget('Nobody Inc', bank, companyMap, mocks)).toBeNull();
    expect(findPlanTarget('', bank, companyMap, mocks)).toBeNull();
    expect(findPlanTarget(null, bank, companyMap, mocks)).toBeNull();
    expect(findPlanTarget('Snowflake', null, companyMap, mocks)).toBeNull();
    expect(taggedTargets(bank, null, mocks)).toEqual([]);
  });
});

describe('planToDate on a tagged target — tagged questions, weakest-skill drills, the generic mock', () => {
  const now = Date.UTC(2026, 8, 17, 12);

  it('every item is a tagged challenge, a drill on a demanded skill, or the generic mock', () => {
    const target = findPlanTarget('Stripe', bank, companyMap, mocks);
    const skillLevels = { 'Window Functions': 20, 'Joins': 80, 'Aggregation & Grouping': 30 };
    const plan = planToDate({ target, readiness: null, skillLevels, solvedIds: [], bank, daysRemaining: 10, now });
    expect(plan.status).toBe(PREP_PLAN_STATUS.OK);
    const tagged = new Set(target.challengeIds);
    const items = plan.days.flatMap(d => d.items);
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      if (item.kind === 'target') expect(tagged.has(item.challengeId), `${item.challengeId} is not tagged Stripe`).toBe(true);
      else if (item.kind === 'drill') {
        const ch = bank.find(c => c.id === item.challengeId);
        expect(tagged.has(item.challengeId)).toBe(false);
        expect(challengeMatchesSkill(ch, item.skill)).toBe(true);
      } else if (item.kind === 'mock') expect(item.interviewId).toBe(DEFAULT_PRO_MOCK_ID);
      else throw new Error(`unexpected item kind ${item.kind}`);
    }
    expect(plan.totals.mock).toBe(1);
  });

  it('the drills go to the weakest DEMANDED skills from skillLevels, not to everything at zero', () => {
    const target = findPlanTarget('Stripe', bank, companyMap, mocks);
    const strong = {};
    for (const s of ['Querying Basics', 'Aggregation & Grouping', 'Joins', 'Subqueries & CTEs', 'Conditional Logic', 'Window Functions', 'String Functions', 'Date Functions', 'NULL Handling']) strong[s] = 95;
    const plan = planToDate({ target, readiness: null, skillLevels: strong, solvedIds: [], bank, daysRemaining: 10, now });
    expect(plan.totals.drills).toBe(0);
    const weak = { ...strong, 'Window Functions': 10 };
    const plan2 = planToDate({ target, readiness: null, skillLevels: weak, solvedIds: [], bank, daysRemaining: 10, now });
    const drillSkills = new Set(plan2.days.flatMap(d => d.items).filter(i => i.kind === 'drill').map(i => i.skill));
    expect([...drillSkills]).toEqual(['Window Functions']);
  });

  it('without skillLevels the old behaviour holds (every demanded skill at 0)', () => {
    const target = findPlanTarget('Stripe', bank, companyMap, mocks);
    const plan = planToDate({ target, readiness: null, solvedIds: [], bank, daysRemaining: 10, now });
    expect(plan.totals.drills).toBeGreaterThan(0);
  });
});

describe('the readiness NUMBER stays archetype-only', () => {
  it('app.jsx computes readiness only for kind archetype', () => {
    // 2026-09-18: the computation moved out of the render function into
    // buildInterviewPlan(), which the card and the status strip both read.
    const fn = appSource.slice(appSource.indexOf('const buildInterviewPlan = '));
    expect(fn.slice(0, 4000)).toMatch(/const readiness = \(target && target\.kind === TARGET_KIND\.ARCHETYPE\)\s*\n\s*\? companyReadiness\(/);
    expect(fn.slice(0, 4000)).toMatch(/skillLevels: readiness \? null : calculateSkillLevelsFromPerformance\(\)/);
  });

  it('the card renders the note for a tagged target and the score only in the other branch', () => {
    const start = appSource.indexOf('function InterviewPrepCard(');
    const body = appSource.slice(start, start + appSource.slice(start).indexOf('\n}\n'));
    const noteAt = body.indexOf('data-testid="interview-prep-tagged-note"');
    const scoreAt = body.indexOf('data-testid="interview-prep-score"');
    expect(noteAt).toBeGreaterThan(-1);
    expect(scoreAt).toBeGreaterThan(noteAt);
    expect(body.slice(noteAt - 400, noteAt)).toMatch(/\{isTagged \? \(/);
    expect(body.slice(noteAt, scoreAt)).toMatch(/\) : readiness \? \(/);
    expect(body).toContain("i18n_t('interviewPrep', 'taggedNote', { company, n: target.challengeCount })");
    // The picker: signed group, tagged group.
    expect(body).toContain("i18n_t('interviewPrep', 'groupSigned')");
    expect(body).toContain("i18n_t('interviewPrep', 'groupTagged')");
  });

  it('the EN copy IS the module note, and TR exists', () => {
    const blocks = [...i18nSource.matchAll(/\n {4}interviewPrep: \{\n([\s\S]*?)\n {4}\},/g)].map(m => m[1]);
    expect(blocks.length).toBe(2);
    const en = /taggedNote: "([^"]+)"/.exec(blocks[0]);
    expect(en).not.toBeNull();
    const rendered = en[1].replace(/\{n\}/g, '7').replace(/\{company\}/g, 'Wise');
    expect(rendered).toBe(taggedTargetNote('Wise', 7));
    expect(blocks[1]).toMatch(/taggedNote: '.*\{company\}.*\{n\}.*'/);
    for (const key of ['groupSigned', 'groupTagged']) {
      expect(blocks[0]).toContain(`${key}:`);
      expect(blocks[1]).toContain(`${key}:`);
    }
  });

  it('companyReadiness is never handed a tagged target by the card, even though it would count one', () => {
    // The function is target-agnostic on purpose (it reads challengeIds), so
    // the gate has to be at the call site — asserted above. This documents
    // the reason the gate exists.
    const target = findPlanTarget('Stripe', bank, companyMap, mocks);
    const r = companyReadiness({ skillLevels: {}, solvedIds: bank.slice(0, 6).map(c => c.id), target, bank, mockResult: null });
    expect(r === null || typeof r.score === 'number').toBe(true);
  });
});

describe('the events carry kind, and every Pro item still goes through the two doors', () => {
  it('prep_target_set carries kind at both sites, prep_plan_viewed at its one', () => {
    const lines = appSource.split('\n');
    const targetSet = lines.map((l, i) => (l.includes("'prep_target_set'") ? i : -1)).filter(i => i >= 0);
    expect(targetSet.length).toBe(2);
    for (const i of targetSet) {
      const region = lines.slice(i, i + 8).join('\n');
      expect(region).toMatch(/kind: (findPlanTarget\(|target \? target\.kind : null)/);
    }
    const viewedAt = appSource.indexOf("'prep_plan_viewed'");
    expect(appSource.slice(viewedAt, viewedAt + 200)).toContain('kind: target ? target.kind : null');
  });

  it('no new door into locked content: the card opens items through openPrepItem only', () => {
    const fn = appSource.slice(appSource.indexOf('const renderInterviewPrepCard = '));
    const body = fn.slice(0, fn.indexOf('\n  };\n'));
    expect(body).toContain('onOpenItem={openPrepItem}');
    for (const forbidden of ['setCurrentChallenge(', 'setActiveInterview(', 'setShowProModal(', 'startInterview(', 'openChallenge(']) {
      expect(body, `${forbidden} inside the card render — a second door`).not.toContain(forbidden);
    }
    const at = appSource.indexOf('const openPrepItem');
    const door = appSource.slice(at, at + 1200);
    expect(door).toContain('startInterview(');
    expect(door).toContain('openChallenge(');
  });
});
