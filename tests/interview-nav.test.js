import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { shouldShowInterviewNav, interviewNavReason, HIRING_INTENTS, INTERVIEW_GOAL_ID } from '../src/utils/interview-nav.js';

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

describe('shouldShowInterviewNav — the two structural rules', () => {
  const eligible = { flagOn: true, solvedCount: 1, intent: 'interview' };

  it('flag off → never, whatever else is true', () => {
    expect(shouldShowInterviewNav({ ...eligible, flagOn: false, hasInterviewHistory: true })).toBe(false);
  });

  it('zero solves → never, even with intent, history, goal and company arrival', () => {
    expect(shouldShowInterviewNav({
      flagOn: true, solvedCount: 0, intent: 'interview', hasInterviewHistory: true,
      goalId: INTERVIEW_GOAL_ID, arrivalSrc: 'company:capital-one',
    })).toBe(false);
    expect(shouldShowInterviewNav({ ...eligible, solvedCount: undefined })).toBe(false);
    expect(shouldShowInterviewNav({ ...eligible, solvedCount: 'nope' })).toBe(false);
  });

  it('declared hiring intent shows it; learning does not', () => {
    expect(shouldShowInterviewNav({ ...eligible, intent: 'interview' })).toBe(true);
    expect(shouldShowInterviewNav({ ...eligible, intent: 'job_ready' })).toBe(true);
    expect(shouldShowInterviewNav({ ...eligible, intent: 'learning' })).toBe(false);
    expect(shouldShowInterviewNav({ ...eligible, intent: null })).toBe(false);
    expect([...HIRING_INTENTS].sort()).toEqual(['interview', 'job_ready']);
  });

  it('interview history, the interview goal, or a company arrival each suffice on their own', () => {
    const base = { flagOn: true, solvedCount: 3, intent: 'learning' };
    expect(shouldShowInterviewNav({ ...base, hasInterviewHistory: true })).toBe(true);
    expect(shouldShowInterviewNav({ ...base, goalId: INTERVIEW_GOAL_ID })).toBe(true);
    expect(shouldShowInterviewNav({ ...base, goalId: 'fundamentals' })).toBe(false);
    expect(shouldShowInterviewNav({ ...base, arrivalSrc: 'company:stripe' })).toBe(true);
    expect(shouldShowInterviewNav({ ...base, arrivalSrc: 'blog:sql-joins' })).toBe(false);
  });

  it('nobody else gets it', () => {
    expect(shouldShowInterviewNav({ flagOn: true, solvedCount: 40 })).toBe(false);
  });
});

describe('interviewNavReason — one word, strongest signal first', () => {
  it('ranks history > intent > goal > company', () => {
    const all = { intent: 'interview', hasInterviewHistory: true, goalId: INTERVIEW_GOAL_ID, arrivalSrc: 'company:x' };
    expect(interviewNavReason(all)).toBe('history');
    expect(interviewNavReason({ ...all, hasInterviewHistory: false })).toBe('intent');
    expect(interviewNavReason({ ...all, hasInterviewHistory: false, intent: 'learning' })).toBe('goal');
    expect(interviewNavReason({ ...all, hasInterviewHistory: false, intent: null, goalId: null })).toBe('company');
    expect(interviewNavReason({})).toBe(null);
  });
});

describe('source guards — the entry, the events, the copy', () => {
  const app = read('../src/app.jsx');
  const i18n = read('../src/utils/i18n.js');
  const flags = read('../src/data/feature-flags.js');

  it('the primary nav renders the Interview tab through shouldShowInterviewNav', () => {
    // applyIntentRouting must be a component-scope function. On 2026-09-11 it
    // was written inside getUserIntent's body after the return — unreachable —
    // so the modal's call threw a swallowed ReferenceError; found in the
    // preview on 09-12, the evening before the flip.
    const gi = app.indexOf('const getUserIntent = () => {');
    const ar = app.indexOf('const applyIntentRouting = (', gi);
    expect(gi).toBeGreaterThan(-1);
    expect(ar).toBeGreaterThan(gi);
    expect(app.slice(gi, ar)).toMatch(/\n  \};\n/);
    expect(app).not.toMatch(/source \}\);\n  \};\n  \};/);
    expect(app).toMatch(/const showInterviewNav = shouldShowInterviewNav\(\{/);
    expect(app).toMatch(/flagOn: !!window\.FF\?\.feature\('intentRouting'\)/);
    expect(app).toMatch(/data-onboarding="nav-trials"/);
    // the grid grows to three columns only when the tab is there
    expect(app).toMatch(/showInterviewNav \? 'grid-cols-3' : 'grid-cols-2'/);
    // Learning Path must not light up while the Interview tab is active
    expect(app).toMatch(/activeTab !== 'quests' && activeTab !== 'trials'/);
  });

  it('every mock event carries the mock id', () => {
    const started = app.match(/trackActivationEvent\('interview_started', \{[\s\S]*?\}\);/g) || [];
    expect(started.length).toBe(2); // resume + fresh
    for (const s of started) expect(s).toMatch(/interviewId: interview\.id/);
    const completed = app.match(/trackActivationEvent\('interview_completed', \{[\s\S]*?\}\);/g) || [];
    expect(completed.length).toBe(1);
    expect(completed[0]).toMatch(/interviewId: activeInterview\.id/);
  });

  it('the tab view event exists once per day and every known entrance is tagged', () => {
    expect(app).toMatch(/trackActivationEvent\('interview_tab_viewed', \{/);
    expect(app).toMatch(/sqlquest_interview_view_\$\{day\}/);
    for (const entry of ['nav', 'deeplink', 'onboarding', 'guest_shell']) {
      expect(app, `entry tag missing: ${entry}`).toMatch(new RegExp(`interviewEntryRef\\.current = '${entry}'`));
    }
  });

  it('the nav copy is translated in both languages and the flag still exists', () => {
    expect((i18n.match(/interviewSub: '/g) || []).length).toBe(2);
    expect(flags).toMatch(/intentRouting: (true|false),/);
  });

  it('the target pin goes through the registry, never through a company string alone', () => {
    // The pinned mock is whatever findTarget returns — the registry's three
    // conjuncts — so a company with no sourced screen can never be pinned.
    expect(app).toMatch(/match = findTarget\(company, challenges, window\.challengeCompanies \|\| \{\}, mockInterviews\)/);
    expect(app).toMatch(/data-interview-target=\{m\.id\}/);
    expect(app).toMatch(/data-interview-target="none"/);
    // the pinned mock is not listed twice
    expect(app).toMatch(/if \(interviewTarget\.mock && interview\.id === interviewTarget\.mock\.id\) return false;/);
    // the view event carries the pin
    expect(app).toMatch(/targetMockId: interviewTarget\.mock \? interviewTarget\.mock\.id : null,/);
    for (const key of ['targetPinTitle', 'targetPinSub', 'noTargetTitle', 'noTargetSub', 'noTargetCta']) {
      expect((i18n.match(new RegExp(`${key}: '`, 'g')) || []).length, `${key} in both languages`).toBe(2);
    }
  });
});
