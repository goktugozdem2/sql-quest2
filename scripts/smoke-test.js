#!/usr/bin/env node
/**
 * Browser smoke test — runs a battery of checks against a local dev
 * server to catch regressions that unit tests can't reach (React
 * rendering, tab navigation, Coach engine integration, notifications).
 *
 * Usage:
 *   1. Start the server: `npm run dev` (python serves public/ on :4321)
 *      OR `npm run dev:vite` (Vite on :5173)
 *   2. Run: `node scripts/smoke-test.js [http://localhost:4321]`
 *
 * Exits non-zero if any check fails. Designed for CI / pre-push hook.
 *
 * Requires: Google Chrome installed at the macOS default location.
 * Uses Chrome's remote debugging protocol via a fresh headless instance.
 */

import { spawn } from 'child_process';
import http from 'http';

const URL = process.argv[2] || 'http://127.0.0.1:4321';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9222;

const checks = [];
const pass = (name) => { checks.push({ name, ok: true }); };
const fail = (name, why) => { checks.push({ name, ok: false, why }); };

async function evalInPage(tab, expr) {
  const res = await cdp(tab, 'Runtime.evaluate', {
    expression: `(async () => { try { const r = await (${expr}); return { ok: true, value: r }; } catch(e) { return { ok: false, err: String(e) }; } })()`,
    awaitPromise: true,
    returnByValue: true,
  });
  const r = res.result?.value || {};
  if (!r.ok) throw new Error(r.err || 'eval failed');
  return r.value;
}

let msgId = 0;
const pending = new Map();
let ws;

function cdp(tabId, method, params) {
  const id = ++msgId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function getJSON(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    }).on('error', reject);
  });
}

async function main() {
  console.log(`Smoke test → ${URL}`);
  const chrome = spawn(CHROME, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--user-data-dir=/tmp/chrome-smoke-' + Date.now(),
    URL + '/app.html',
  ], { stdio: 'ignore' });

  // Wait for Chrome debug port
  for (let i = 0; i < 30; i++) {
    try {
      const tabs = await getJSON(`http://127.0.0.1:${DEBUG_PORT}/json`);
      if (tabs.length > 0) break;
    } catch (_) {}
    await new Promise(r => setTimeout(r, 200));
  }

  const tabs = await getJSON(`http://127.0.0.1:${DEBUG_PORT}/json`);
  const tab = tabs.find(t => t.type === 'page');
  if (!tab) throw new Error('no tab');

  const WebSocket = (await import('ws')).WebSocket;
  ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.id && pending.has(msg.id)) {
      const { resolve } = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg.result || msg);
    }
  });

  // Wait for app to render
  await new Promise(r => setTimeout(r, 3000));

  // ── Checks ────────────────────────────────────────────────────
  try {
    const boot = await evalInPage(tab, `{ hasSQLQuest: typeof window.SQLQuest, hasReact: typeof window.React, goalsCount: (window.coachGoals || []).length, challengesCount: (window.challengesData || []).length, lessonsCount: (window.aiLessonsData || []).length }`);
    if (boot.hasSQLQuest === 'function') pass('window.SQLQuest is a function');
    else fail('window.SQLQuest is a function', `got ${boot.hasSQLQuest}`);
    if (boot.hasReact === 'object') pass('window.React is an object');
    else fail('window.React is an object', `got ${boot.hasReact}`);
    if (boot.goalsCount >= 2) pass(`${boot.goalsCount} coach goals loaded`);
    else fail('at least 2 coach goals', `got ${boot.goalsCount}`);
    if (boot.challengesCount >= 100) pass(`${boot.challengesCount} challenges loaded`);
    else fail('at least 100 challenges', `got ${boot.challengesCount}`);
    if (boot.lessonsCount >= 10) pass(`${boot.lessonsCount} AI lessons loaded`);
    else fail('at least 10 AI lessons', `got ${boot.lessonsCount}`);

    // Render-state check — fresh headless Chrome has no logged-in user,
    // so we either land on a guest auth screen or see a "continue as
    // guest" path. Check for EITHER the tabs (logged-in) OR the auth
    // surface (guest). Both are valid boot states.
    const renderState = await evalInPage(tab, `
      (() => {
        const tabs = Array.from(document.querySelectorAll('button')).filter(b => /^(🧭|📝|💼|🏅|👤)/.test(b.textContent?.trim() || '')).map(b => b.textContent.trim());
        const hasAuth = !!Array.from(document.querySelectorAll('h1,h2,h3,button')).find(el => /sign\\s*in|sign\\s*up|create account|get started/i.test(el.textContent || ''));
        const hasFirstRun = !!Array.from(document.querySelectorAll('h1,h2,h3,p,button')).find(el => /find your SQL starting point|answer 4 quick questions|start from zero|know select\\s*\\/\\s*where|already interview-ready/i.test(el.textContent || ''));
        const hasLoading = !!document.querySelector('.loading-container');
        return { tabs, hasAuth, hasFirstRun, hasLoading };
      })()`);
    if (!renderState.hasLoading) pass('app has moved past the loading screen');
    else fail('app has moved past the loading screen', 'still showing loading-container');

    const hasAppUI = renderState.tabs.length >= 5 || renderState.hasAuth || renderState.hasFirstRun;
    if (hasAppUI) pass(`app shell rendered (tabs=${renderState.tabs.length} / hasAuth=${renderState.hasAuth} / hasFirstRun=${renderState.hasFirstRun})`);
    else fail('app shell rendered', 'no tabs, no auth surface, and no first-run assessment');

    // If we did land on the logged-in shell, check the Coach tab.
    // Otherwise skip — the auth flow requires real credentials we don't
    // have in CI.
    if (renderState.tabs.includes('🧭 Coach')) {
      const coachClick = await evalInPage(tab, `
        (async () => {
          const b = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === '🧭 Coach');
          b?.click();
          await new Promise(r => setTimeout(r, 300));
          return Array.from(document.querySelectorAll('button')).find(b => b.className?.includes('bg-purple-600 shadow-lg'))?.textContent?.trim();
        })()`);
      if (coachClick === '🧭 Coach') pass('Coach tab activates on click');
      else fail('Coach tab activates on click', `got ${coachClick}`);
    } else {
      pass('(skipped logged-in Coach check — no session)');
    }

    const simpleStartState = await evalInPage(tab, `
      (async () => {
        const wait = ms => new Promise(r => setTimeout(r, ms));
        const text = document.body.textContent || '';
        const navTabs = Array.from(document.querySelectorAll('button'))
          .filter(b => /^(🧭|📝|💼|🏅|👤)/.test(b.textContent?.trim() || ''))
          .map(b => b.textContent.trim());
        const primaryTabs = Array.from(document.querySelectorAll('[data-primary-learning-tabs="true"] button'))
          .map(b => (b.textContent || '').replace(/\\s+/g, ' ').trim());
        const challengesButton = Array.from(document.querySelectorAll('[data-primary-learning-tabs="true"] button'))
          .find(b => /Challenges/i.test((b.textContent || '').trim()));
        challengesButton?.click();
        await wait(400);
        const challengeText = document.body.textContent || '';
        const allChallengesButton = Array.from(document.querySelectorAll('button'))
          .find(b => /^All challenges$/i.test((b.textContent || '').trim()));
        allChallengesButton?.click();
        await wait(300);
        const allChallengeText = document.body.textContent || '';
        const learningPathButton = Array.from(document.querySelectorAll('[data-primary-learning-tabs="true"] button'))
          .find(b => /Learning Path/i.test((b.textContent || '').trim()));
        learningPathButton?.click();
        await wait(400);
        const backText = document.body.textContent || '';
        return {
          hasStart: /Find your SQL starting point/i.test(text),
          hasIntro: /Step\\s+1\\s+of\\s+4/i.test(text)
            && /Start with Learning Path/i.test(text)
            && /guided route/i.test(text)
            && /Skip tour/i.test(text)
            && /Next/i.test(text),
          hasPrompt: /Answer 4 quick questions/i.test(text),
          hasQuiz: /Placement quiz/i.test(text),
          hidesGoalChoices: !/Practice business SQL/i.test(text),
          legacyNavCount: navTabs.length,
          primaryTabs,
          switchedToChallenges: !/Find your SQL starting point/i.test(challengeText)
            && /Challenges|All Challenges|Start Challenge/i.test(challengeText),
          hasUnlockedPathPicker: /Practice by Learning Path/i.test(challengeText)
            && /Everything is unlocked for practice/i.test(challengeText)
            && /Foundations/i.test(challengeText)
            && /Window Functions/i.test(challengeText),
          allChallengesShowsAllWithoutChip: /showing\\s+239\\s+of\\s+239\\s+challenges/i.test(allChallengeText)
            && !/Path:\\s*All challenges/i.test(allChallengeText),
          hidesNestedChallengeFork: !/Welcome! Let's start your SQL journey|Start Learning Path|Jump to First Challenge/i.test(challengeText),
          returnedToLearningPath: /Find your SQL starting point/i.test(backText),
          challengeTextSample: challengeText.slice(0, 220),
          backTextSample: backText.slice(0, 220)
        };
      })()`);
    if (
      simpleStartState.hasStart
      && simpleStartState.hasIntro
      && simpleStartState.hasPrompt
      && simpleStartState.hasQuiz
      && simpleStartState.hidesGoalChoices
      && simpleStartState.legacyNavCount === 0
      && simpleStartState.primaryTabs.length === 2
      && /Learning Path/i.test(simpleStartState.primaryTabs[0])
      && /Challenges/i.test(simpleStartState.primaryTabs[1])
      && simpleStartState.switchedToChallenges
      && simpleStartState.hasUnlockedPathPicker
      && simpleStartState.allChallengesShowsAllWithoutChip
      && simpleStartState.hidesNestedChallengeFork
      && simpleStartState.returnedToLearningPath
    ) pass('first-run screen shows only Learning Path and Challenges tabs before placement');
    else fail('first-run screen shows only Learning Path and Challenges tabs before placement', JSON.stringify(simpleStartState));

    await cdp(tab, 'Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 1200,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await cdp(tab, 'Page.reload', { ignoreCache: true });
    await new Promise(r => setTimeout(r, 5000));
    const mobileFirstRunLayout = await evalInPage(tab, `
      (() => {
        const text = document.body.textContent || '';
        const viewportWidth = window.innerWidth;
        const documentWidth = document.documentElement.scrollWidth;
        return {
          hasQuiz: /Find your SQL starting point/i.test(text) && /Placement quiz/i.test(text),
          fitsViewport: documentWidth <= viewportWidth,
          viewportWidth,
          documentWidth
        };
      })()`);
    if (mobileFirstRunLayout.hasQuiz && mobileFirstRunLayout.fitsViewport) pass('first-run placement fits mobile viewport');
    else fail('first-run placement fits mobile viewport', `quiz=${mobileFirstRunLayout.hasQuiz} viewport=${mobileFirstRunLayout.viewportWidth} document=${mobileFirstRunLayout.documentWidth}`);

    await cdp(tab, 'Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp(tab, 'Page.reload', { ignoreCache: true });
    await new Promise(r => setTimeout(r, 5000));

    const zeroLessonState = await evalInPage(tab, `
      (async () => {
        const unsureButtons = Array.from(document.querySelectorAll('button')).filter(b => /not sure yet/i.test(b.textContent || ''));
        unsureButtons.forEach(b => b.click());
        await new Promise(r => setTimeout(r, 300));
        const afterQuizText = document.body.textContent || '';
        const recommendedZero = /Recommended start/i.test(afterQuizText) && /Start from zero/i.test(afterQuizText);
        const b = Array.from(document.querySelectorAll('button')).find(b => /start here/i.test(b.textContent || ''));
        b?.click();
        await new Promise(r => setTimeout(r, 500));
        const text = document.body.textContent || '';
        return {
          recommendedZero,
          hasLesson: /Learn SQL with HR data/i.test(text) && /Default: HR employee data/i.test(text) && /SELECT \\*/i.test(text) && /FROM employees/i.test(text),
          hasTopicId: /F1\\.1/i.test(text),
          hasLessonPath: /Start Lesson 1/i.test(text),
          hasDatasetPicker: /Dataset/i.test(text) && /HR default/i.test(text) && /E-commerce/i.test(text),
          hidesChallengeOption: !/Skip to first challenge|Try challenge/i.test(text),
          removedAmbiguousCta: !/Practice this query|Choose another level/i.test(text)
        };
      })()`);
    if (zeroLessonState.recommendedZero && zeroLessonState.hasLesson && zeroLessonState.hasTopicId && zeroLessonState.hasLessonPath && zeroLessonState.hasDatasetPicker && zeroLessonState.hidesChallengeOption && zeroLessonState.removedAmbiguousCta) {
      pass('placement quiz routes unsure players to lesson-first onboarding');
    } else {
      fail('placement quiz routes unsure players to lesson-first onboarding', JSON.stringify(zeroLessonState));
    }

    const lessonStartState = await evalInPage(tab, `
      (async () => {
        const startButton = Array.from(document.querySelectorAll('button')).find(b => /start lesson 1/i.test(b.textContent || ''));
        startButton?.click();
        await new Promise(r => setTimeout(r, 700));
        const text = document.body.textContent || '';
        const panel = document.querySelector('[data-roadmap-target="foundations-lesson"]');
        const roadmap = document.querySelector('[data-foundation-focus-roadmap="true"]');
        const rect = panel?.getBoundingClientRect();
        const roadmapRect = roadmap?.getBoundingClientRect();
        const navTabs = Array.from(document.querySelectorAll('button'))
          .filter(b => /^(🧭|📝|💼|🏅|👤)/.test(b.textContent?.trim() || ''))
          .map(b => b.textContent.trim());
        const primaryTabs = Array.from(document.querySelectorAll('[data-primary-learning-tabs="true"] button'))
          .map(b => (b.textContent || '').replace(/\\s+/g, ' ').trim());
        const primaryTabsNode = document.querySelector('[data-primary-learning-tabs="true"]');
        const tabsTopBeforeChallenge = primaryTabsNode?.getBoundingClientRect().top ?? null;
        const tabsDocumentTopBeforeChallenge = tabsTopBeforeChallenge == null ? null : tabsTopBeforeChallenge + window.scrollY;
        const challengesTab = Array.from(document.querySelectorAll('[data-primary-learning-tabs="true"] button'))
          .find(b => /Challenges/i.test((b.textContent || '').trim()));
        challengesTab?.click();
        await new Promise(r => setTimeout(r, 500));
        const tabsTopAfterChallenge = document.querySelector('[data-primary-learning-tabs="true"]')?.getBoundingClientRect().top ?? null;
        const tabsDocumentTopAfterChallenge = tabsTopAfterChallenge == null ? null : tabsTopAfterChallenge + window.scrollY;
        const guestBanner = document.querySelector('[data-guest-mode-banner="true"]');
        const guestBannerTop = guestBanner?.getBoundingClientRect().top ?? null;
        const challengeText = document.body.textContent || '';
        const hasAdjacentChallengeRoadmap = !!document.querySelector('[data-lesson-challenge-roadmap="true"]')
          && /You are practicing beside Lesson 1/i.test(challengeText)
          && /Back to Learning Path/i.test(challengeText);
        const learningPathTab = Array.from(document.querySelectorAll('[data-primary-learning-tabs="true"] button'))
          .find(b => /Learning Path/i.test((b.textContent || '').trim()));
        learningPathTab?.click();
        await new Promise(r => setTimeout(r, 500));
        const primaryLearningShell = document.querySelector('[data-primary-learning-tabs="true"]')?.dataset.primaryLearningShell;
        return {
          clicked: !!startButton,
          firstRunCompleted: localStorage.getItem('sqlquest_first_run_completed_v1'),
          hasPanel: !!panel,
          hasFocusMode: panel?.dataset.foundationFocusMode === 'true' && !!document.querySelector('[data-foundation-focus-shell="true"]') && !!document.querySelector('[data-lesson-one-shell="true"]'),
          hasLessonOnePrimaryShell: primaryLearningShell === 'lesson-one',
          hasPassiveRoadmap: !!roadmap && /SQL path/i.test(text) && /Locked/i.test(text),
          hasAdjacentChallengeRoadmap,
          roadmapIsLeftOfLesson: !!rect && !!roadmapRect && roadmapRect.left < rect.left,
          panelNearViewport: !!rect && rect.top < window.innerHeight * 0.65,
          scrollY: window.scrollY,
          hasBuiltInLesson: /Built-in lesson\\. No AI needed/i.test(text),
          hasLessonTitle: /Read an HR table before writing SQL/i.test(text),
          hasLessonGoal: !!document.querySelector('[data-foundation-lesson-goal="true"]') && /Goal: learn how to read a table with SELECT, FROM, and LIMIT/i.test(text) && /In real work, your first SQL task/i.test(text),
          hasDatasetPicker: /Dataset/i.test(text) && /HR default/i.test(text) && /E-commerce/i.test(text),
          hasTopicId: /F1\\.1/i.test(text),
          hasConceptMap: !!document.querySelector('[data-foundation-concept-map="true"]')
            && /Concept map/i.test(text)
            && /Table/i.test(text)
            && /Row/i.test(text)
            && /Column/i.test(text)
            && /SELECT/i.test(text)
            && /FROM/i.test(text)
            && /LIMIT/i.test(text)
            && !!document.querySelector('[data-foundation-concept-status="current"]')
            && !!document.querySelector('[data-foundation-concept-status="locked"]'),
          starterQueryHiddenUntilNeeded: !/Starter query/i.test(text),
          hasVisualIntro: !!document.querySelector('[data-foundation-visual-intro="true"]') && /Visual model|First safe read/i.test(text),
          hasVisualLabels: !!document.querySelector('[data-foundation-visual-label="table"]') && !!document.querySelector('[data-foundation-visual-column="true"]') && !!document.querySelector('[data-foundation-visual-row="true"]'),
          hasSchemaInspection: !!document.querySelector('[data-foundation-schema-inspection="true"]') && /Inspect the data first/i.test(text),
          hasExercises: /Hands-on exercises/i.test(text) && /Identify the table/i.test(text),
          hasStepBrief: !!document.querySelector('[data-foundation-step-brief="true"]') && /Real data task|Look for the dataset name/i.test(text),
          hasSimplifiedFirstStep: !!document.querySelector('[data-foundation-workspace="true"]') && !/Exercise workspace/i.test(text),
          hasHintAndAnswer: /Take hint/i.test(text) && /Show answer/i.test(text),
          hasLockedCta: /Finish 9 exercises to continue/i.test(text),
          fitsViewport: document.documentElement.scrollWidth <= window.innerWidth,
          challengeTabKeepsTabsStable: tabsDocumentTopBeforeChallenge != null
            && tabsDocumentTopAfterChallenge != null
            && Math.abs(tabsDocumentTopAfterChallenge - tabsDocumentTopBeforeChallenge) <= 2,
          guestBannerStaysBelowTabs: guestBannerTop == null
            || (tabsTopAfterChallenge != null && guestBannerTop > tabsTopAfterChallenge),
          tabsTopBeforeChallenge,
          tabsTopAfterChallenge,
          tabsDocumentTopBeforeChallenge,
          tabsDocumentTopAfterChallenge,
          guestBannerTop,
          navTabs,
          primaryTabs,
          hidesDashboardExtras: !/Pick a goal to get started|Focus Tracks|AI SQL Tutor/i.test(text),
          hidesAiAlternative: !/Ask AI about this/i.test(text),
          hidesChallengeEscape: !/Try challenge/i.test(text)
        };
      })()`);
    if (
      lessonStartState.clicked
      && lessonStartState.firstRunCompleted === 'true'
      && lessonStartState.hasPanel
      && lessonStartState.hasFocusMode
      && lessonStartState.hasLessonOnePrimaryShell
      && lessonStartState.hasPassiveRoadmap
      && lessonStartState.hasAdjacentChallengeRoadmap
      && lessonStartState.roadmapIsLeftOfLesson
      && lessonStartState.panelNearViewport
      && lessonStartState.hasBuiltInLesson
      && lessonStartState.hasLessonTitle
      && lessonStartState.hasLessonGoal
      && lessonStartState.hasDatasetPicker
      && lessonStartState.hasTopicId
      && lessonStartState.hasConceptMap
      && lessonStartState.starterQueryHiddenUntilNeeded
      && lessonStartState.hasVisualIntro
      && lessonStartState.hasVisualLabels
      && lessonStartState.hasSchemaInspection
      && lessonStartState.hasExercises
      && lessonStartState.hasStepBrief
      && lessonStartState.hasSimplifiedFirstStep
      && lessonStartState.hasHintAndAnswer
      && lessonStartState.hasLockedCta
      && lessonStartState.fitsViewport
      && lessonStartState.challengeTabKeepsTabsStable
      && lessonStartState.guestBannerStaysBelowTabs
      && lessonStartState.navTabs.length === 0
      && lessonStartState.primaryTabs.length === 2
      && lessonStartState.hidesDashboardExtras
      && lessonStartState.hidesAiAlternative
      && lessonStartState.hidesChallengeEscape
    ) {
      pass('start lesson opens simplified foundations focus');
    } else {
      fail('start lesson opens simplified foundations focus', JSON.stringify(lessonStartState));
    }

    const foundationPersistenceSetupState = await evalInPage(tab, `
      (async () => {
        const wait = ms => new Promise(r => setTimeout(r, ms));
        const buttons = () => Array.from(document.querySelectorAll('button'));
        const clickButton = (matcher) => {
          const button = buttons().find(b => matcher(b.textContent || '', b));
          button?.click();
          return !!button;
        };
        const wrongColumnClicked = clickButton(text => /A column/i.test(text) && /Columns are fields like/i.test(text));
        await wait(250);
        const wrongFeedbackShown = /Columns are the smaller field names under employees/i.test(document.body.textContent || '');
        const weakness = JSON.parse(localStorage.getItem('sqlquest_foundation_weakness_v1') || '{}');
        const weaknessTracked = weakness.lessonId === '1' && weakness.firstWeakness === 'data-model' && (weakness.counts?.['data-model'] || 0) >= 1;
        const firstHintClicked = clickButton(text => /take hint/i.test(text));
        await wait(150);
        const secondHintClicked = clickButton(text => /next hint/i.test(text));
        await wait(150);
        const progressiveHintShown = /Hint 2\\/2/i.test(document.body.textContent || '') && /employees is above them/i.test(document.body.textContent || '');
        const schemaClicked = clickButton(text => /A table/i.test(text) && /stores employee records/i.test(text));
        await wait(250);
        const takeawayShown = /Takeaway/i.test(document.body.textContent || '') && /table is the whole dataset/i.test(document.body.textContent || '');
        const nextExercise1 = clickButton(text => /next exercise/i.test(text));
        await wait(250);
        return { wrongColumnClicked, wrongFeedbackShown, weaknessTracked, firstHintClicked, secondHintClicked, progressiveHintShown, schemaClicked, takeawayShown, nextExercise1 };
      })()`);
    await cdp(tab, 'Page.reload', { ignoreCache: true });
    await new Promise(r => setTimeout(r, 5000));

    const foundationsSecondLessonState = await evalInPage(tab, `
      (async () => {
        const wait = ms => new Promise(r => setTimeout(r, ms));
        const buttons = () => Array.from(document.querySelectorAll('button'));
        const clickButton = (matcher) => {
          const button = buttons().find(b => matcher(b.textContent || '', b));
          button?.click();
          return !!button;
        };
        const persistedText = document.body.textContent || '';
        const persistedAfterReload = /Find a column/i.test(persistedText) && /1\\/9/i.test(persistedText);
        const hasResumeCard = !!document.querySelector('[data-foundation-resume-card="true"]')
          && /Continue exactly where you left off/i.test(persistedText)
          && /Lesson 1, Exercise 2: Find a column/i.test(persistedText)
          && /Continue here/i.test(persistedText);
        const columnClicked = clickButton(text => /name/i.test(text) && /field stored/i.test(text));
        await wait(250);
        const nextExercise2 = clickButton(text => /next exercise/i.test(text));
        await wait(250);
        const previewChecked = clickButton(text => /check query/i.test(text));
        await wait(600);
        const previewCompleted = /Output returns 3 rows/i.test(document.body.textContent || '') && /Correct\\. You previewed a small slice/i.test(document.body.textContent || '');
        const nextExercise3 = clickButton(text => /next exercise/i.test(text));
        await wait(250);
        const classifySelect = document.querySelector('[data-foundation-classify-item="select"][data-foundation-classify-category="columns"]');
        const classifyFrom = document.querySelector('[data-foundation-classify-item="from"][data-foundation-classify-category="table"]');
        const classifyLimit = document.querySelector('[data-foundation-classify-item="limit"][data-foundation-classify-category="rows"]');
        classifySelect?.click();
        await wait(100);
        classifyFrom?.click();
        await wait(100);
        classifyLimit?.click();
        await wait(100);
        const tableClicked = clickButton(text => /check matches/i.test(text));
        await wait(250);
        const classifyCompleted = /Correct\\. You can now read the three-line query/i.test(document.body.textContent || '');
        const nextExercise4 = clickButton(text => /next exercise/i.test(text));
        await wait(250);
        const limitDiagnosticClicked = clickButton(text => /check query/i.test(text));
        await wait(600);
        const limitDiagnosticShown = /Change LIMIT 5 to LIMIT 10/i.test(document.body.textContent || '')
          && /Keep SELECT \\* and FROM employees the same/i.test(document.body.textContent || '');
        const limitTextarea = document.querySelector('textarea[data-foundation-practice-query="f1-limit-choice"]');
        if (limitTextarea) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
          setter.call(limitTextarea, 'SELECT *\\nFROM employees\\nLIMIT 10');
          limitTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
        await wait(250);
        const limitClicked = clickButton(text => /check query/i.test(text));
        await wait(600);
        const limitCompleted = /Correct\\. LIMIT 10 keeps the result small/i.test(document.body.textContent || '') && /Output returns 10 rows/i.test(document.body.textContent || '');
        const nextExercise5 = clickButton(text => /next exercise/i.test(text));
        await wait(250);
        const readOnlyClicked = clickButton(text => /No, SELECT only reads data/i.test(text));
        await wait(250);
        const nextExercise6 = clickButton(text => /next exercise/i.test(text));
        await wait(250);
        for (const label of ['SELECT *', 'FROM employees', 'LIMIT 10']) {
          const block = buttons().find(b => b.dataset.foundationPracticeBlock && (b.textContent || '').trim() === label);
          block?.click();
          await wait(100);
        }
        const orderChecked = clickButton(text => /check order/i.test(text));
        await wait(250);
        const nextExercise7 = clickButton(text => /next exercise/i.test(text));
        await wait(250);
        const sequenceStep1Checked = clickButton(text => /check query/i.test(text));
        await wait(600);
        const sequenceMovedToStep2 = /Step 2 of 2/i.test(document.body.textContent || '');
        const sequenceTextarea = document.querySelector('textarea[data-foundation-practice-query="f1-limit-sequence"]');
        if (sequenceTextarea) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
          setter.call(sequenceTextarea, 'SELECT *\\nFROM employees\\nLIMIT 10');
          sequenceTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
        await wait(250);
        const sequenceStep2Checked = clickButton(text => /check query/i.test(text));
        await wait(600);
        const nextExercise8 = clickButton(text => /next exercise/i.test(text));
        await wait(250);
        const capstoneUiBeforeSubmit = !!document.querySelector('[data-foundation-capstone="true"]') && /Capstone checklist/i.test(document.body.textContent || '');
        const capstoneTextarea = document.querySelector('textarea[data-foundation-practice-query="f1-run-query"]');
        if (capstoneTextarea) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
          setter.call(capstoneTextarea, 'SELECT *\\nFROM employees\\nLIMIT 10');
          capstoneTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
        await wait(250);
        const queryChecked = clickButton(text => /submit capstone|check query/i.test(text));
        await wait(600);
        const foundationEvents = JSON.parse(localStorage.getItem('sqlquest_foundation_events_v1') || '[]');
        const spacedReview = JSON.parse(localStorage.getItem('sqlquest_foundation_spaced_review_v1') || '{}');
        const foundationMilestone = JSON.parse(localStorage.getItem('sqlquest_foundation_milestone_v1') || '{}');
        const persistedPractice = JSON.parse(localStorage.getItem('sqlquest_foundation_practice_v1') || '{}');
        const persistedPracticeMap = JSON.parse(localStorage.getItem('sqlquest_foundation_practices_v1') || '{}');
        const restoredPracticeMap = JSON.parse(localStorage.getItem('sqlquest_foundation_practices_v1') || '{}');
        const textBeforeReview = document.body.textContent || '';
        const hasSpacedReview = /Review scheduled/i.test(textBeforeReview)
          && /Come back tomorrow: SELECT, FROM, LIMIT/i.test(textBeforeReview)
          && spacedReview.lessonId === '1'
          && spacedReview.status === 'scheduled'
          && !!spacedReview.dueAt;
        const hasFoundationMilestone = !!document.querySelector('[data-foundation-milestone="true"]')
          && /Milestone unlocked/i.test(textBeforeReview)
          && /First SQL Query/i.test(textBeforeReview)
          && /Lesson 1 complete/i.test(textBeforeReview)
          && foundationMilestone.id === 'foundation-lesson-1-first-query'
          && !!foundationMilestone.earnedAt;
        const hasWeaknessReview = /Review before Lesson 2/i.test(textBeforeReview) && /Review table, row, and column/i.test(textBeforeReview);
        const redoWeakStep = clickButton(text => /redo weak step/i.test(text));
        await wait(250);
        const reviewOpenedWeakStep = /Identify the table/i.test(document.body.textContent || '') && /Step 1 of 9/i.test(document.body.textContent || '');
        const reviewCorrectClicked = clickButton(text => /A table/i.test(text) && /stores employee records/i.test(text));
        await wait(300);
        const weaknessAfterReview = JSON.parse(localStorage.getItem('sqlquest_foundation_weakness_v1') || '{}');
        const reviewedWeakness = !!weaknessAfterReview.reviewedAt;
        const beforeNextText = document.body.textContent || '';
        const roadmapContinueButton = buttons().find(b => /continue to lesson 2|continue learning path/i.test(b.textContent || ''));
        const repeatLessonButton = buttons().find(b => /repeat lesson 1/i.test(b.textContent || ''));
        const challengeBridgeButton = buttons().find(b => /try a real challenge/i.test(b.textContent || ''));
        const nextUnlocked = !!roadmapContinueButton && !roadmapContinueButton.disabled;
        roadmapContinueButton?.click();
        await new Promise(r => setTimeout(r, 500));
        const text = document.body.textContent || '';
        const panel = document.querySelector('[data-roadmap-target="foundations-lesson"]');
        return {
          persistedAfterReload,
          hasResumeCard,
          savedActiveLesson: localStorage.getItem('sqlquest_foundation_active_lesson_v1'),
          savedPracticeLesson: (() => { try { return JSON.parse(localStorage.getItem('sqlquest_foundation_practice_v1') || '{}').lessonId || null; } catch (_) { return 'parse-error'; } })(),
          firstRunCompleted: localStorage.getItem('sqlquest_first_run_completed_v1'),
          savedUser: localStorage.getItem('sqlquest_user'),
          textSample: persistedText.slice(0, 220),
          columnClicked,
          nextExercise2,
          previewChecked,
          previewCompleted,
          tableClicked,
          classifyCompleted,
          nextExercise3,
          nextExercise4,
          limitDiagnosticClicked,
          limitDiagnosticShown,
          limitClicked,
          limitCompleted,
          nextExercise5,
          readOnlyClicked,
          nextExercise6,
          orderChecked,
          nextExercise7,
          sequenceStep1Checked,
          sequenceMovedToStep2,
          sequenceStep2Checked,
          nextExercise8,
          hasCapstoneUi: capstoneUiBeforeSubmit,
          queryChecked,
          hasLessonRecap: /Checkpoint complete: read a table/i.test(textBeforeReview),
          hasTakeaway: /Takeaway/i.test(textBeforeReview) && /safely inspect a SQL table/i.test(textBeforeReview),
          hasFirstQueryWin: /You just ran your first real SQL query/i.test(textBeforeReview),
          hasXpFeedback: /\\+5 XP earned/i.test(textBeforeReview),
          hasLiveChecklist: /Output returns 10 rows/i.test(textBeforeReview),
          hasSpacedReview,
          hasFoundationMilestone,
          hasWeaknessReview,
          redoWeakStep,
          reviewOpenedWeakStep,
          reviewCorrectClicked,
          reviewedWeakness,
          hasRoadmapContinue: /Continue to Lesson 2/i.test(beforeNextText),
          hasRepeatLesson: !!repeatLessonButton,
          hasNoChallengeBridge: !challengeBridgeButton && !/Try a real challenge/i.test(beforeNextText),
          persistedPracticeComplete: persistedPractice.lessonId === '1' && Object.keys(persistedPractice.completed || {}).length >= 9,
          persistedPracticeMapComplete: Object.keys(persistedPracticeMap['1']?.completed || {}).length >= 9,
          restoredPracticeMapComplete: Object.keys(restoredPracticeMap['1']?.completed || {}).length >= 9,
          hasAnalyticsLog: foundationEvents.some(e => e.event === 'exercise_completed' && e.metadata?.exerciseId === 'f1-run-query')
            && foundationEvents.some(e => e.event === 'milestone_unlocked' && e.metadata?.milestoneId === 'foundation-lesson-1-first-query'),
          nextUnlocked,
          clicked: !!roadmapContinueButton,
          hasPanel: !!panel,
          hasSecondLesson: /Choose only the columns you need/i.test(text),
          hasTopicId: /F2\\.1/i.test(text),
          hasColumnQuery: /SELECT name, age\\s+FROM passengers\\s+LIMIT 10/i.test(text),
          hasExercises: /Hands-on exercises/i.test(text) && /Pick the query that shows fewer columns/i.test(text),
          hasLockedCta: /Finish 5 exercises to continue/i.test(text)
        };
      })()`);
    if (
      foundationPersistenceSetupState.wrongColumnClicked
      && foundationPersistenceSetupState.wrongFeedbackShown
      && foundationPersistenceSetupState.weaknessTracked
      && foundationPersistenceSetupState.firstHintClicked
      && foundationPersistenceSetupState.secondHintClicked
      && foundationPersistenceSetupState.progressiveHintShown
      && foundationPersistenceSetupState.schemaClicked
      && foundationPersistenceSetupState.takeawayShown
      && foundationPersistenceSetupState.nextExercise1
      && foundationsSecondLessonState.persistedAfterReload
      && foundationsSecondLessonState.hasResumeCard
      && foundationsSecondLessonState.columnClicked
      && foundationsSecondLessonState.nextExercise2
      && foundationsSecondLessonState.previewChecked
      && foundationsSecondLessonState.previewCompleted
      && foundationsSecondLessonState.tableClicked
      && foundationsSecondLessonState.classifyCompleted
      && foundationsSecondLessonState.nextExercise3
      && foundationsSecondLessonState.nextExercise4
      && foundationsSecondLessonState.limitDiagnosticClicked
      && foundationsSecondLessonState.limitDiagnosticShown
      && foundationsSecondLessonState.limitClicked
      && foundationsSecondLessonState.limitCompleted
      && foundationsSecondLessonState.nextExercise5
      && foundationsSecondLessonState.readOnlyClicked
      && foundationsSecondLessonState.nextExercise6
      && foundationsSecondLessonState.orderChecked
      && foundationsSecondLessonState.nextExercise7
      && foundationsSecondLessonState.sequenceStep1Checked
      && foundationsSecondLessonState.sequenceMovedToStep2
      && foundationsSecondLessonState.sequenceStep2Checked
      && foundationsSecondLessonState.nextExercise8
      && foundationsSecondLessonState.hasCapstoneUi
      && foundationsSecondLessonState.queryChecked
      && foundationsSecondLessonState.hasLessonRecap
      && foundationsSecondLessonState.hasTakeaway
      && foundationsSecondLessonState.hasFirstQueryWin
      && foundationsSecondLessonState.hasXpFeedback
      && foundationsSecondLessonState.hasLiveChecklist
      && foundationsSecondLessonState.hasSpacedReview
      && foundationsSecondLessonState.hasFoundationMilestone
      && foundationsSecondLessonState.hasWeaknessReview
      && foundationsSecondLessonState.redoWeakStep
      && foundationsSecondLessonState.reviewOpenedWeakStep
      && foundationsSecondLessonState.reviewCorrectClicked
      && foundationsSecondLessonState.reviewedWeakness
      && foundationsSecondLessonState.hasRoadmapContinue
      && foundationsSecondLessonState.hasRepeatLesson
      && foundationsSecondLessonState.hasNoChallengeBridge
      && foundationsSecondLessonState.persistedPracticeComplete
      && foundationsSecondLessonState.persistedPracticeMapComplete
      && foundationsSecondLessonState.restoredPracticeMapComplete
      && foundationsSecondLessonState.hasAnalyticsLog
      && foundationsSecondLessonState.nextUnlocked
      && foundationsSecondLessonState.clicked
      && foundationsSecondLessonState.hasPanel
      && foundationsSecondLessonState.hasSecondLesson
      && foundationsSecondLessonState.hasTopicId
      && foundationsSecondLessonState.hasColumnQuery
      && foundationsSecondLessonState.hasExercises
      && foundationsSecondLessonState.hasLockedCta
    ) {
      pass('foundations exercises unlock the second lesson');
    } else {
      fail('foundations exercises unlock the second lesson', JSON.stringify(foundationsSecondLessonState));
    }

    const foundationsCompleteState = await evalInPage(tab, `
      (async () => {
        const wait = ms => new Promise(r => setTimeout(r, ms));
        const buttons = () => Array.from(document.querySelectorAll('button'));
        const clickButton = (matcher) => {
          const button = buttons().find(b => matcher(b.textContent || '', b));
          button?.click();
          return !!button;
        };
        const choiceClicked = clickButton(text => /SELECT name, age FROM passengers LIMIT 10/i.test(text) && /only two columns/i.test(text));
        await wait(250);
        const nextExercise1 = clickButton(text => /next exercise/i.test(text));
        await wait(250);
        const commaClicked = clickButton(text => /A comma/i.test(text));
        await wait(250);
        const nextExercise2 = clickButton(text => /next exercise/i.test(text));
        await wait(250);
        const outputClicked = clickButton(text => /Only name and age/i.test(text));
        await wait(250);
        const nextExercise3 = clickButton(text => /next exercise/i.test(text));
        await wait(250);
        for (const label of ['SELECT name, age', 'FROM passengers', 'LIMIT 10']) {
          const block = buttons().find(b => b.dataset.foundationPracticeBlock && (b.textContent || '').trim() === label);
          block?.click();
          await wait(100);
        }
        const orderChecked = clickButton(text => /check order/i.test(text));
        await wait(250);
        const nextExercise4 = clickButton(text => /next exercise/i.test(text));
        await wait(250);
        const textarea = document.querySelector('textarea[data-foundation-practice-query="f2-edit-query"]');
        if (textarea) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
          setter.call(textarea, 'SELECT name, age\\nFROM passengers\\nLIMIT 10');
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
        await wait(250);
        const queryChecked = clickButton(text => /check query/i.test(text));
        await wait(600);
        const beforeCompleteText = document.body.textContent || '';
        const completeButton = buttons().find(b => /complete foundations/i.test(b.textContent || ''));
        const completeUnlocked = !!completeButton && !completeButton.disabled;
        completeButton?.click();
        await new Promise(r => setTimeout(r, 700));
        const text = document.body.textContent || '';
        return {
          choiceClicked,
          nextExercise1,
          commaClicked,
          nextExercise2,
          outputClicked,
          nextExercise3,
          orderChecked,
          nextExercise4,
          queryEdited: !!textarea,
          queryChecked,
          hasLessonRecap: /Lesson recap/i.test(beforeCompleteText),
          hasXpFeedback: /\\+5 XP earned/i.test(beforeCompleteText),
          completeUnlocked,
          clicked: !!completeButton,
          panelGone: !document.querySelector('[data-roadmap-target="foundations-lesson"]'),
          hasFilteringCurrent: /Current step\\s*Filtering and Sorting/i.test(text),
          hasFoundationsDone: /Foundations[\\s\\S]{0,300}Done/i.test(text),
          hasReviewButton: /Review lessons/i.test(text),
          stayedInRoadmap: /Your SQL Learning Path/i.test(text) && !/Your First Query/i.test(text)
        };
      })()`);
    if (
      foundationsCompleteState.choiceClicked
      && foundationsCompleteState.nextExercise1
      && foundationsCompleteState.commaClicked
      && foundationsCompleteState.nextExercise2
      && foundationsCompleteState.outputClicked
      && foundationsCompleteState.nextExercise3
      && foundationsCompleteState.orderChecked
      && foundationsCompleteState.nextExercise4
      && foundationsCompleteState.queryEdited
      && foundationsCompleteState.queryChecked
      && foundationsCompleteState.hasLessonRecap
      && foundationsCompleteState.hasXpFeedback
      && foundationsCompleteState.completeUnlocked
      && foundationsCompleteState.clicked
      && foundationsCompleteState.panelGone
      && foundationsCompleteState.hasFilteringCurrent
      && foundationsCompleteState.hasFoundationsDone
      && foundationsCompleteState.hasReviewButton
      && foundationsCompleteState.stayedInRoadmap
    ) {
      pass('foundations exercises complete in roadmap without challenge jump');
    } else {
      fail('foundations exercises complete in roadmap without challenge jump', JSON.stringify(foundationsCompleteState));
    }

    const filteringBuiltInState = await evalInPage(tab, `
      (async () => {
        const startButton = Array.from(document.querySelectorAll('button')).find(b => /start next step/i.test(b.textContent || ''));
        startButton?.click();
        await new Promise(r => setTimeout(r, 700));
        const text = document.body.textContent || '';
        return {
          clicked: !!startButton,
          hasPanel: !!document.querySelector('[data-roadmap-target="foundations-lesson"]'),
          hasLessonTitle: /Keep only the rows you need/i.test(text),
          hasTopicId: /W1\\.1/i.test(text),
          hasTinyAction: /WHERE age > 30/i.test(text),
          hasPractice: /Hands-on exercises/i.test(text) && /Find the filter clause/i.test(text),
          hasPracticeCount: /Exercise 1 of 6/i.test(text),
          hasSpecificRecapReady: /Checkpoint complete: filter rows/i.test(text) || /Find the filter clause/i.test(text),
          hasSequentialGate: /Finish 6 exercises to continue/i.test(text)
        };
      })()`);
    if (
      filteringBuiltInState.clicked
      && filteringBuiltInState.hasPanel
      && filteringBuiltInState.hasLessonTitle
      && filteringBuiltInState.hasTopicId
      && filteringBuiltInState.hasTinyAction
      && filteringBuiltInState.hasPractice
      && filteringBuiltInState.hasPracticeCount
      && filteringBuiltInState.hasSpecificRecapReady
      && filteringBuiltInState.hasSequentialGate
    ) {
      pass('next roadmap stage uses built-in filtering lesson and exercises');
    } else {
      fail('next roadmap stage uses built-in filtering lesson and exercises', JSON.stringify(filteringBuiltInState));
    }

    const foundationsReviewState = await evalInPage(tab, `
      (async () => {
        const reviewButton = Array.from(document.querySelectorAll('button')).find(b => /review lessons/i.test(b.textContent || ''));
        reviewButton?.click();
        await new Promise(r => setTimeout(r, 500));
        const text = document.body.textContent || '';
        return {
          clicked: !!reviewButton,
          hasPanel: !!document.querySelector('[data-roadmap-target="foundations-lesson"]'),
          hasTopicId: /F1\\.1/i.test(text),
          hasLessonTitle: /Read an HR table before writing SQL/i.test(text)
        };
      })()`);
    if (
      foundationsReviewState.clicked
      && foundationsReviewState.hasPanel
      && foundationsReviewState.hasTopicId
      && foundationsReviewState.hasLessonTitle
    ) {
      pass('completed foundations lesson can be reviewed');
    } else {
      fail('completed foundations lesson can be reviewed', JSON.stringify(foundationsReviewState));
    }

    await evalInPage(tab, `
      (() => {
        const now = Date.now();
        localStorage.setItem('sqlquest_foundation_active_lesson_v1', '1');
        localStorage.setItem('sqlquest_foundation_spaced_review_v1', JSON.stringify({
          lessonId: '1',
          topic: 'SELECT FROM LIMIT',
          scheduledAt: new Date(now - 48 * 60 * 60 * 1000).toISOString(),
          dueAt: new Date(now - 60 * 1000).toISOString(),
          status: 'scheduled'
        }));
        location.reload();
        return true;
      })()`);
    await new Promise(r => setTimeout(r, 5000));
    const dueReviewEntryState = await evalInPage(tab, `
      (async () => {
        const wait = ms => new Promise(r => setTimeout(r, ms));
        const beforeText = document.body.textContent || '';
        const openButton = Array.from(document.querySelectorAll('[data-foundation-review-entry="true"] button, [data-foundation-spaced-review="true"] button'))
          .find(b => /open review/i.test(b.textContent || ''));
        openButton?.click();
        await wait(400);
        const review = JSON.parse(localStorage.getItem('sqlquest_foundation_spaced_review_v1') || '{}');
        const afterText = document.body.textContent || '';
        return {
          hasDueEntry: !!document.querySelector('[data-foundation-review-entry="true"]')
            && /Review due now/i.test(beforeText)
            && /Lesson 1 recall/i.test(beforeText),
          hasDueCompletionCard: !!document.querySelector('[data-foundation-spaced-review="true"][data-foundation-review-due="true"]')
            && /Refresh Lesson 1: SELECT, FROM, LIMIT/i.test(beforeText),
          clicked: !!openButton,
          statusStarted: review.status === 'due_started' && !!review.reviewStartedAt,
          stayedInLesson: /Read an HR table before writing SQL/i.test(afterText) && /SELECT, FROM, LIMIT/i.test(afterText)
        };
      })()`);
    if (
      dueReviewEntryState.hasDueEntry
      && dueReviewEntryState.hasDueCompletionCard
      && dueReviewEntryState.clicked
      && dueReviewEntryState.statusStarted
      && dueReviewEntryState.stayedInLesson
    ) {
      pass('lesson 1 spaced review shows due entry point');
    } else {
      fail('lesson 1 spaced review shows due entry point', JSON.stringify(dueReviewEntryState));
    }

    const ecommerceFoundationState = await evalInPage(tab, `
      (async () => {
        localStorage.clear();
        localStorage.setItem('sqlquest_onboarding_completed', 'true');
        location.href = ${JSON.stringify(URL + '/app.html')};
        return true;
      })()`);
    await new Promise(r => setTimeout(r, 5000));
    const ecommerceLessonState = await evalInPage(tab, `
      (async () => {
        const wait = ms => new Promise(r => setTimeout(r, ms));
        const unsureButtons = Array.from(document.querySelectorAll('button')).filter(b => /not sure yet/i.test(b.textContent || ''));
        unsureButtons.forEach(b => b.click());
        await wait(300);
        const startButton = Array.from(document.querySelectorAll('button')).find(b => /start here/i.test(b.textContent || ''));
        startButton?.click();
        await wait(500);
        const defaultPreviewText = document.body.textContent || '';
        const ecommerceButton = Array.from(document.querySelectorAll('button')).find(b => /E-commerce/i.test(b.textContent || '') && /orders/i.test(b.textContent || ''));
        ecommerceButton?.click();
        await wait(500);
        const previewText = document.body.textContent || '';
        const lessonButton = Array.from(document.querySelectorAll('button')).find(b => /start lesson 1/i.test(b.textContent || ''));
        lessonButton?.click();
        await wait(700);
        const lessonText = document.body.textContent || '';
        return {
          reloaded: !!${JSON.stringify(ecommerceFoundationState)},
          hasHrDefaultPreview: /Learn SQL with HR data/i.test(defaultPreviewText) && /FROM employees/i.test(defaultPreviewText) && /HR default/i.test(defaultPreviewText),
          switchedDataset: !!ecommerceButton,
          hasEcommercePreview: /Learn SQL with E-commerce data/i.test(previewText) && /FROM orders/i.test(previewText),
          openedLesson: !!lessonButton && !!document.querySelector('[data-roadmap-target="foundations-lesson"]'),
          hasOrdersLesson: /Read E-commerce data before writing SQL/i.test(lessonText) && /orders table/i.test(lessonText) && /FROM orders/i.test(lessonText),
          hasSectorColumns: /product/i.test(lessonText) && /category/i.test(lessonText) && /total/i.test(lessonText)
        };
      })()`);
    if (
      ecommerceLessonState.reloaded
      && ecommerceLessonState.hasHrDefaultPreview
      && ecommerceLessonState.switchedDataset
      && ecommerceLessonState.hasEcommercePreview
      && ecommerceLessonState.openedLesson
      && ecommerceLessonState.hasOrdersLesson
      && ecommerceLessonState.hasSectorColumns
    ) {
      pass('dataset picker switches the first foundations lesson');
    } else {
      fail('dataset picker switches the first foundations lesson', JSON.stringify(ecommerceLessonState));
    }

    // Regression: older builds could persist sqlquest_user=guest_... and then
    // reload it as a normal saved user, bypassing the new level assessment.
    await evalInPage(tab, `
      (async () => {
        localStorage.setItem('sqlquest_user', 'guest_legacy_smoke');
        localStorage.setItem('sqlquest_user_guest_legacy_smoke', JSON.stringify({
          username: 'guest_legacy_smoke',
          isGuest: true,
          solvedChallenges: [],
          challengeAttempts: []
        }));
        location.reload();
        return true;
      })()`);
    await new Promise(r => setTimeout(r, 5000));
    const legacyGuestState = await evalInPage(tab, `
      (() => {
        const text = document.body.textContent || '';
        return {
          savedUser: localStorage.getItem('sqlquest_user'),
          hasFirstRun: /Find your SQL starting point|Answer 4 quick questions|Start from zero|Know SELECT\\s*\\/\\s*WHERE|Already interview-ready/i.test(text)
        };
      })()`);
    if (legacyGuestState.hasFirstRun && legacyGuestState.savedUser !== 'guest_legacy_smoke') {
      pass('legacy saved guest lands on first-run assessment');
    } else {
      fail('legacy saved guest lands on first-run assessment', `savedUser=${legacyGuestState.savedUser} hasFirstRun=${legacyGuestState.hasFirstRun}`);
    }

  } finally {
    ws.close();
    chrome.kill();
  }

  // ── Report ────────────────────────────────────────────────────
  console.log('');
  let failed = 0;
  for (const c of checks) {
    if (c.ok) console.log(`  ✓ ${c.name}`);
    else { console.log(`  ✗ ${c.name} — ${c.why}`); failed++; }
  }
  console.log(`\n${checks.length - failed}/${checks.length} passed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error('Smoke test crashed:', e); process.exit(2); });
