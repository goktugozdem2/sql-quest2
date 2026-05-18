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
        const text = document.body.textContent || '';
        const navTabs = Array.from(document.querySelectorAll('button'))
          .filter(b => /^(🧭|📝|💼|🏅|👤)/.test(b.textContent?.trim() || ''))
          .map(b => b.textContent.trim());
        return /Find your SQL starting point/i.test(text)
          && /Answer 4 quick questions/i.test(text)
          && /Placement quiz/i.test(text)
          && !/Practice business SQL/i.test(text)
          && navTabs.length === 0;
      })()`);
    if (simpleStartState) pass('first-run screen stays simple before placement');
    else fail('first-run screen stays simple before placement', 'goal choices or main nav visible on first-run screen');

    await cdp(tab, 'Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 1200,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await cdp(tab, 'Page.reload', { ignoreCache: true });
    await new Promise(r => setTimeout(r, 3500));
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
    await new Promise(r => setTimeout(r, 3500));

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
          hasLesson: /SQL from scratch/i.test(text) && /SELECT \\*/i.test(text) && /FROM passengers/i.test(text),
          hasTopicId: /F1\\.1/i.test(text),
          hasLessonPath: /Run this in the lesson/i.test(text),
          hasChallengeOption: /Skip to first challenge/i.test(text),
          removedAmbiguousCta: !/Practice this query/i.test(text)
        };
      })()`);
    if (zeroLessonState.recommendedZero && zeroLessonState.hasLesson && zeroLessonState.hasTopicId && zeroLessonState.hasLessonPath && zeroLessonState.hasChallengeOption && zeroLessonState.removedAmbiguousCta) {
      pass('placement quiz routes unsure players to lesson-first onboarding');
    } else {
      fail('placement quiz routes unsure players to lesson-first onboarding', JSON.stringify(zeroLessonState));
    }

    const firstQueryState = await evalInPage(tab, `
      (async () => {
        const b = Array.from(document.querySelectorAll('button')).find(b => /skip to first challenge/i.test(b.textContent || ''));
        b?.click();
        await new Promise(r => setTimeout(r, 900));
        const text = document.body.textContent || '';
        const navTabs = Array.from(document.querySelectorAll('button'))
          .filter(b => /^(🧭|📝|💼|🏅|👤)/.test(b.textContent?.trim() || ''))
          .map(b => b.textContent.trim());
        return {
          hasChallenge: /Your First Query/i.test(text),
          hasFirstRunBanner: /Solve your first SQL challenge/i.test(text),
          hasLessonsOption: /Go to lessons/i.test(text),
          navTabs
        };
      })()`);
    if (firstQueryState.hasChallenge) pass('explicit challenge skip opens first query challenge');
    else fail('explicit challenge skip opens first query challenge', 'Your First Query not visible after challenge-skip CTA');
    if (firstQueryState.hasFirstRunBanner && firstQueryState.hasLessonsOption && firstQueryState.navTabs.length === 0) pass('first challenge keeps simplified shell with lessons option');
    else fail('first challenge keeps simplified shell with lessons option', `banner=${firstQueryState.hasFirstRunBanner} lessons=${firstQueryState.hasLessonsOption} navTabs=${firstQueryState.navTabs.join(',')}`);

    const wrongFirstAttemptState = await evalInPage(tab, `
      (async () => {
        const editor = document.querySelector('.CodeMirror')?.CodeMirror;
        if (!editor) return { hasEditor: false };
        editor.setValue('SELECT name\\nFROM passengers\\nLIMIT 10;');
        await new Promise(r => setTimeout(r, 300));
        document.querySelector('[data-onboarding="submit"]')?.click();
        await new Promise(r => setTimeout(r, 1000));
        const text = document.body.textContent || '';
        const navTabs = Array.from(document.querySelectorAll('button'))
          .filter(b => /^(🧭|📝|💼|🏅|👤)/.test(b.textContent?.trim() || ''))
          .map(b => b.textContent.trim());
        return {
          hasEditor: true,
          hasFirstRunBanner: /Solve your first SQL challenge/i.test(text),
          hasLegacyModal: /Welcome to SQL Quest|What's your SQL experience/i.test(text),
          navTabs
        };
      })()`);
    if (wrongFirstAttemptState.hasEditor && wrongFirstAttemptState.hasFirstRunBanner && !wrongFirstAttemptState.hasLegacyModal && wrongFirstAttemptState.navTabs.length === 0) {
      pass('wrong first attempt stays in simplified first-run flow');
    } else {
      fail('wrong first attempt stays in simplified first-run flow', `editor=${wrongFirstAttemptState.hasEditor} banner=${wrongFirstAttemptState.hasFirstRunBanner} legacy=${wrongFirstAttemptState.hasLegacyModal} navTabs=${(wrongFirstAttemptState.navTabs || []).join(',')}`);
    }

    const roadmapAfterFirstSolveState = await evalInPage(tab, `
      (async () => {
        const editor = document.querySelector('.CodeMirror')?.CodeMirror;
        if (!editor) return { hasEditor: false };
        editor.setValue('SELECT *\\nFROM passengers\\nLIMIT 10;');
        await new Promise(r => setTimeout(r, 300));
        document.querySelector('[data-onboarding="submit"]')?.click();
        await new Promise(r => setTimeout(r, 2200));
        const coachButton = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === '🧭 Coach');
        coachButton?.click();
        await new Promise(r => setTimeout(r, 700));
        const text = document.body.textContent || '';
        const navTabs = Array.from(document.querySelectorAll('button'))
          .filter(b => /^(🧭|📝|💼|🏅|👤)/.test(b.textContent?.trim() || ''))
          .map(b => b.textContent.trim());
        return {
          hasEditor: true,
          editorValue: editor.getValue(),
          hasAccepted: /accepted|correct|first challenge solved/i.test(text),
          hasWrong: /not quite|wrong|expected/i.test(text),
          firstRunCompleted: localStorage.getItem('sqlquest_first_run_completed_v1'),
          navTabs,
          hasRoadmap: /Your SQL Roadmap/i.test(text),
          hasCurrentStep: /Current step/i.test(text),
          hasStartNext: /Start next step/i.test(text),
          hasFoundations: /Foundations/i.test(text),
          hasFiltering: /Filtering and Sorting/i.test(text)
        };
      })()`);
    if (
      roadmapAfterFirstSolveState.hasEditor
      && roadmapAfterFirstSolveState.firstRunCompleted === 'true'
      && roadmapAfterFirstSolveState.navTabs.includes('🧭 Coach')
      && roadmapAfterFirstSolveState.hasRoadmap
      && roadmapAfterFirstSolveState.hasCurrentStep
      && roadmapAfterFirstSolveState.hasStartNext
      && roadmapAfterFirstSolveState.hasFoundations
      && roadmapAfterFirstSolveState.hasFiltering
    ) {
      pass('first solved challenge unlocks adaptive SQL roadmap');
    } else {
      fail('first solved challenge unlocks adaptive SQL roadmap', JSON.stringify(roadmapAfterFirstSolveState));
    }

    const roadmapContinueState = await evalInPage(tab, `
      (async () => {
        const startButton = Array.from(document.querySelectorAll('button')).find(b => /start next step/i.test(b.textContent || ''));
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
        return {
          clicked: !!startButton,
          hasPanel: !!panel,
          hasFocusMode: panel?.dataset.foundationFocusMode === 'true' && !!document.querySelector('[data-foundation-focus-shell="true"]'),
          hasPassiveRoadmap: !!roadmap && /SQL path/i.test(text) && /Locked/i.test(text),
          roadmapIsLeftOfLesson: !!rect && !!roadmapRect && roadmapRect.left < rect.left,
          panelNearViewport: !!rect && rect.top < window.innerHeight * 0.65,
          scrollY: window.scrollY,
          hasBuiltInLesson: /Built-in lesson\\. No AI needed/i.test(text),
          hasLessonTitle: /Read a table before writing SQL/i.test(text),
          hasTopicId: /F1\\.1/i.test(text),
          starterQueryHiddenUntilNeeded: !/Starter query/i.test(text),
          hasSchemaInspection: !!document.querySelector('[data-foundation-schema-inspection="true"]') && /Inspect the data first/i.test(text),
          hasExercises: /Hands-on exercises/i.test(text) && /Identify the table/i.test(text),
          hasWorkspace: !!document.querySelector('[data-foundation-workspace="true"]') && /Exercise workspace/i.test(text),
          hasHintAndAnswer: /Take hint/i.test(text) && /Show answer/i.test(text),
          hasLockedCta: /Finish 8 exercises to continue/i.test(text),
          fitsViewport: document.documentElement.scrollWidth <= window.innerWidth,
          navTabs,
          hidesDashboardExtras: !/Pick a goal to get started|Focus Tracks|AI SQL Tutor/i.test(text),
          hidesAiAlternative: !/Ask AI about this/i.test(text),
          hidesChallengeEscape: !/Try challenge/i.test(text)
        };
      })()`);
    if (
      roadmapContinueState.clicked
      && roadmapContinueState.hasPanel
      && roadmapContinueState.hasFocusMode
      && roadmapContinueState.hasPassiveRoadmap
      && roadmapContinueState.roadmapIsLeftOfLesson
      && roadmapContinueState.panelNearViewport
      && roadmapContinueState.hasBuiltInLesson
      && roadmapContinueState.hasLessonTitle
      && roadmapContinueState.hasTopicId
      && roadmapContinueState.starterQueryHiddenUntilNeeded
      && roadmapContinueState.hasSchemaInspection
      && roadmapContinueState.hasExercises
      && roadmapContinueState.hasWorkspace
      && roadmapContinueState.hasHintAndAnswer
      && roadmapContinueState.hasLockedCta
      && roadmapContinueState.fitsViewport
      && roadmapContinueState.navTabs.length === 0
      && roadmapContinueState.hidesDashboardExtras
      && roadmapContinueState.hidesAiAlternative
      && roadmapContinueState.hidesChallengeEscape
    ) {
      pass('roadmap continue opens simplified foundations lesson focus');
    } else {
      fail('roadmap continue opens simplified foundations lesson focus', JSON.stringify(roadmapContinueState));
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
        const schemaClicked = clickButton(text => /A table/i.test(text) && /stores passenger records/i.test(text));
        await wait(250);
        const nextExercise1 = clickButton(text => /next exercise/i.test(text));
        await wait(250);
        return { schemaClicked, nextExercise1 };
      })()`);
    await cdp(tab, 'Page.reload', { ignoreCache: true });
    await new Promise(r => setTimeout(r, 3500));

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
        const persistedAfterReload = /Find a column/i.test(persistedText) && /1\\/8/i.test(persistedText);
        const columnClicked = clickButton(text => /name/i.test(text) && /field stored/i.test(text));
        await wait(250);
        const nextExercise2 = clickButton(text => /next exercise/i.test(text));
        await wait(250);
        const tableClicked = clickButton(text => /FROM passengers/i.test(text) && /chooses the table/i.test(text));
        await wait(250);
        const nextExercise3 = clickButton(text => /next exercise/i.test(text));
        await wait(250);
        const limitClicked = clickButton(text => /LIMIT 10/i.test(text) && /first 10 rows/i.test(text));
        await wait(250);
        const nextExercise4 = clickButton(text => /next exercise/i.test(text));
        await wait(250);
        const readOnlyClicked = clickButton(text => /No, SELECT only reads data/i.test(text));
        await wait(250);
        const nextExercise5 = clickButton(text => /next exercise/i.test(text));
        await wait(250);
        for (const label of ['SELECT *', 'FROM passengers', 'LIMIT 10']) {
          const block = buttons().find(b => b.dataset.foundationPracticeBlock && (b.textContent || '').trim() === label);
          block?.click();
          await wait(100);
        }
        const orderChecked = clickButton(text => /check order/i.test(text));
        await wait(250);
        const nextExercise6 = clickButton(text => /next exercise/i.test(text));
        await wait(250);
        const sequenceStep1Checked = clickButton(text => /check query/i.test(text));
        await wait(600);
        const sequenceMovedToStep2 = /Step 2 of 2/i.test(document.body.textContent || '');
        const sequenceTextarea = document.querySelector('textarea[data-foundation-practice-query="f1-limit-sequence"]');
        if (sequenceTextarea) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
          setter.call(sequenceTextarea, 'SELECT *\\nFROM passengers\\nLIMIT 10');
          sequenceTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
        await wait(250);
        const sequenceStep2Checked = clickButton(text => /check query/i.test(text));
        await wait(600);
        const nextExercise7 = clickButton(text => /next exercise/i.test(text));
        await wait(250);
        const queryChecked = clickButton(text => /check query/i.test(text));
        await wait(600);
        const beforeNextText = document.body.textContent || '';
        const foundationEvents = JSON.parse(localStorage.getItem('sqlquest_foundation_events_v1') || '[]');
        const persistedPractice = JSON.parse(localStorage.getItem('sqlquest_foundation_practice_v1') || '{}');
        const nextButton = buttons().find(b => /next: choose columns/i.test(b.textContent || ''));
        const nextUnlocked = !!nextButton && !nextButton.disabled;
        nextButton?.click();
        await new Promise(r => setTimeout(r, 500));
        const text = document.body.textContent || '';
        const panel = document.querySelector('[data-roadmap-target="foundations-lesson"]');
        return {
          persistedAfterReload,
          savedActiveLesson: localStorage.getItem('sqlquest_foundation_active_lesson_v1'),
          savedPracticeLesson: (() => { try { return JSON.parse(localStorage.getItem('sqlquest_foundation_practice_v1') || '{}').lessonId || null; } catch (_) { return 'parse-error'; } })(),
          firstRunCompleted: localStorage.getItem('sqlquest_first_run_completed_v1'),
          savedUser: localStorage.getItem('sqlquest_user'),
          textSample: persistedText.slice(0, 220),
          columnClicked,
          nextExercise2,
          tableClicked,
          nextExercise3,
          limitClicked,
          nextExercise4,
          readOnlyClicked,
          nextExercise5,
          orderChecked,
          nextExercise6,
          sequenceStep1Checked,
          sequenceMovedToStep2,
          sequenceStep2Checked,
          nextExercise7,
          queryChecked,
          hasLessonRecap: /Lesson recap/i.test(beforeNextText),
          hasXpFeedback: /\\+5 XP earned/i.test(beforeNextText),
          hasLiveChecklist: /Output returns 10 rows/i.test(beforeNextText),
          hasChallengeBridge: /Try a real challenge/i.test(beforeNextText),
          persistedPracticeComplete: persistedPractice.lessonId === '1' && Object.keys(persistedPractice.completed || {}).length >= 8,
          hasAnalyticsLog: foundationEvents.some(e => e.event === 'exercise_completed' && e.metadata?.exerciseId === 'f1-run-query'),
          nextUnlocked,
          clicked: !!nextButton,
          hasPanel: !!panel,
          hasSecondLesson: /Choose only the columns you need/i.test(text),
          hasTopicId: /F2\\.1/i.test(text),
          hasColumnQuery: /SELECT name, age\\s+FROM passengers\\s+LIMIT 10/i.test(text),
          hasExercises: /Hands-on exercises/i.test(text) && /Pick the query that shows fewer columns/i.test(text),
          hasLockedCta: /Finish 5 exercises to continue/i.test(text)
        };
      })()`);
    if (
      foundationPersistenceSetupState.schemaClicked
      && foundationPersistenceSetupState.nextExercise1
      && foundationsSecondLessonState.persistedAfterReload
      && foundationsSecondLessonState.columnClicked
      && foundationsSecondLessonState.nextExercise2
      && foundationsSecondLessonState.tableClicked
      && foundationsSecondLessonState.nextExercise3
      && foundationsSecondLessonState.limitClicked
      && foundationsSecondLessonState.nextExercise4
      && foundationsSecondLessonState.readOnlyClicked
      && foundationsSecondLessonState.nextExercise5
      && foundationsSecondLessonState.orderChecked
      && foundationsSecondLessonState.nextExercise6
      && foundationsSecondLessonState.sequenceStep1Checked
      && foundationsSecondLessonState.sequenceMovedToStep2
      && foundationsSecondLessonState.sequenceStep2Checked
      && foundationsSecondLessonState.nextExercise7
      && foundationsSecondLessonState.queryChecked
      && foundationsSecondLessonState.hasLessonRecap
      && foundationsSecondLessonState.hasXpFeedback
      && foundationsSecondLessonState.hasLiveChecklist
      && foundationsSecondLessonState.hasChallengeBridge
      && foundationsSecondLessonState.persistedPracticeComplete
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
          stayedInRoadmap: /Your SQL Roadmap/i.test(text) && !/Your First Query/i.test(text)
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
          hasNextCta: /Next: combine filters/i.test(text)
        };
      })()`);
    if (
      filteringBuiltInState.clicked
      && filteringBuiltInState.hasPanel
      && filteringBuiltInState.hasLessonTitle
      && filteringBuiltInState.hasTopicId
      && filteringBuiltInState.hasTinyAction
      && filteringBuiltInState.hasNextCta
    ) {
      pass('next roadmap stage uses built-in micro lesson');
    } else {
      fail('next roadmap stage uses built-in micro lesson', JSON.stringify(filteringBuiltInState));
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
          hasLessonTitle: /Read a table before writing SQL/i.test(text)
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
    await new Promise(r => setTimeout(r, 3500));
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
