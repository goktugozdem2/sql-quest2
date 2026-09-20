#!/usr/bin/env node
/**
 * QA harness: a signed-in Pro learner in the local build, hermetic.
 * Same preamble as scripts/ph-gallery/capture.mjs — every request that would
 * leave the machine is answered in-page, so nothing is written to production.
 *
 * Usage: npm run dev (public/ on :4321), then
 *   node scripts/qa/pro-mock.mjs <scenario> [--width=1470 --height=660]
 * Scenarios are functions below; each prints JSON and may write
 * scripts/qa/out/<name>.png.
 */
import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const URL = process.env.QA_URL || 'http://127.0.0.1:4321';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9300 + (process.pid % 500);
const OUT = path.join(import.meta.dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const W = Number(arg('width', 1470)); const H = Number(arg('height', 660));

let ws; let msgId = 0; const pending = new Map();
const cdp = (method, params) => new Promise(res => { const id = ++msgId; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
const wait = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => { http.get(u, r => { let b = ''; r.on('data', c => b += c); r.on('end', () => res(JSON.parse(b))); }).on('error', rej); });
async function ev(expr) {
  const r = await cdp('Runtime.evaluate', { expression: `(async () => { try { return { ok: 1, v: await (${expr}) }; } catch (e) { return { ok: 0, e: String(e && e.stack || e) }; } })()`, awaitPromise: true, returnByValue: true });
  const x = r.result?.value || {}; if (!x.ok) throw new Error(x.e || 'eval failed'); return x.v;
}
async function shot(name) { const r = await cdp('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(r.data, 'base64')); }

const U = 'qa_pro';
const data = {
  proStatus: true, proType: 'annual', proExpiry: new Date(Date.now() + 300 * 86400000).toISOString(),
  // --solved=a,b,c mirrors a real account's progress (the founder's test2 by
  // default) so Learning Path locks can be read the way he sees them.
  solvedChallenges: (arg('solved', '1,2,3,4,6,7,8,9,10,12,13,14,15,16,17,5,11,18,19,20,21,22,23,24,26,28,37,38,39,35,29,30,31,32,33,34,25,118,45,46,103,116,42,57,66,122,91,92,93,94,95,96,112,97,119,64,120,36,53,43,56,106,227,206,207,208,235,244,247,249,108,63,146,164,166,167,137,41,65,157,136,143,132,239,170')).split(',').map(Number),
  challengeAttempts: [], xp: 26257,
  // An older FAILED Capital One sitting, so a later Revolut sitting can prove
  // the recommendation follows the latest one (founder QA 2026-09-20, item 4).
  interviewHistory: process.argv.includes('--seed-history') ? [{
    id: 1, date: '2026-09-18', timestamp: '2026-09-18T10:00:00.000Z', interviewId: 'capital-one-codesignal',
    interviewTitle: 'Capital One Data Analyst — CodeSignal-Style Mock', totalScore: 20, maxScore: 149,
    percentage: 13, scorePercent: 13, passed: false, questionsCorrect: 1, questionsTotal: 14,
    questionResults: [{ correct: false, userQuery: 'select 1', concepts: ['ROUND'], questionTitle: 'Old' }], mistakes: [], studiedMistakes: [],
  }] : [], coachState: { goalId: 'fundamentals', startedAt: '2026-04-17T13:18:17.571Z', stepsCompleted: ['f-4', 'f-6', 'f-8', 'f-9'] },
  hasSeenOnboarding: true, firstRunCompleted: true, lastActive: Date.now(), createdAt: Date.now() - 30 * 86400000,
};
const preamble = `(() => {
  window.__log = [];
  const _d = console.debug.bind(console); console.debug = (...a) => { try { window.__log.push(a.map(String).join(' ')); } catch (_) {} _d(...a); };
  window.__row = ${JSON.stringify({ username: U, data })};
  try {
    if (!sessionStorage.getItem('qa_seeded')) {
      localStorage.clear();
      const seed = ${JSON.stringify({
        sqlquest_user: U, [`sqlquest_user_${U}`]: JSON.stringify(data),
        sqlquest_first_run_completed_v1: 'true', sqlquest_onboarding_v1: 'completed',
        sqlquest_app_tour_v1: 'completed_1', sqlquest_first_entry_tour_v1: 'completed_1',
        sqlquest_challenges_entry_tour_v1: 'completed_1', sqlquest_lang: 'en',
        sqlquest_signup_at: String(Date.now() + 3600000),
        ...(process.argv.includes('--no-target') ? {} : { sqlquest_prep_target_v1: JSON.stringify({ company: 'Capital One', date: null }) }),
      })};
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v);
      sessionStorage.setItem('qa_seeded', '1');
    }
  } catch (_) {}
  const real = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = String(input && input.url ? input.url : input);
    if (/supabase|functions\\/v1|vercel-insights|va\\.vercel|\\/api\\//i.test(url)) {
      const J = { 'Content-Type': 'application/json' };
      if (/rpc\\/sq_save_user/.test(url)) return new Response('', { status: 204, headers: J });
      if (/users_public\\?/.test(url)) return new Response(JSON.stringify([window.__row]), { status: 200, headers: J });
      return new Response('[]', { status: 200, headers: J });
    }
    return real(input, init);
  };
  try { navigator.sendBeacon = () => true; } catch (_) {}
})();`;

const click = (re) => `(() => { const b = [...document.querySelectorAll('button')].find(b => ${re}.test(b.textContent.trim())); if (b) b.click(); return !!b; })()`;

const SCENARIOS = {
  // Fail a mock, then read what the list recommends.
  async recommend_after() {
    const id = arg('id', 'revolut-analytics-screen');
    await cdp('Page.navigate', { url: `${URL}/app/?interview=${id}` });
    await wait(6000);
    return ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const click = (re) => { const b = [...document.querySelectorAll('button')].find(b => re.test(b.textContent.trim())); if (b) b.click(); return !!b; };
      for (let i = 0; i < 10; i++) {
        const opt = document.querySelector('[data-testid^="interview-mcq-option-"]');
        if (opt) { opt.click(); await w(150); document.querySelector('[data-testid="interview-mcq-submit"]').click(); }
        else if (document.querySelector('[data-testid="interview-skip"]')) { document.querySelector('[data-testid="interview-skip"]').click(); await w(200); document.querySelector('[data-testid="interview-skip-yes"]')?.click(); }
        await w(500);
        if (!click(/^Next question/)) { click(/^See results/); await w(800); break; }
        await w(500);
      }
      const score = [...document.querySelectorAll('div')].map(d => d.textContent).find(t => /Final Score/.test(t || ''))?.slice(0, 40) || null;
      document.querySelector('[data-testid="interview-back-to-list"]')?.click(); await w(1500);
      const rec = [...document.querySelectorAll('h3')].find(h => /Recommended/.test(h.textContent));
      return { score, recommendation: rec ? rec.closest('div').parentElement.innerText.replace(/\\s+/g, ' ').slice(0, 240) : null };
    })()`);
  },
  // Question body: the query block and inline code, for one question of a mock.
  async question_body() {
    const id = arg('id', 'revolut-analytics-screen');
    const skip = Number(arg('skipTo', 0));
    await cdp('Page.navigate', { url: `${URL}/app/?interview=${id}` });
    await wait(6000);
    return ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < ${skip}; i++) {
        const o = document.querySelector('[data-testid^="interview-mcq-option-"]');
        if (o) { o.click(); await w(150); document.querySelector('[data-testid="interview-mcq-submit"]').click(); }
        else { document.querySelector('[data-testid="interview-skip"]')?.click(); await w(200); document.querySelector('[data-testid="interview-skip-yes"]')?.click(); }
        await w(500);
        [...document.querySelectorAll('button')].find(b => /^Next question/.test(b.textContent.trim()))?.click();
        await w(600);
      }
      const pre = document.querySelector('[data-testid="interview-code-snippets"] pre');
      const desc = document.querySelector('[data-testid="interview-question"] p');
      return {
        q: document.querySelector('[data-testid="interview-question"] h3')?.textContent,
        snippetLabel: document.querySelector('[data-testid="interview-code-snippets"] p')?.textContent || null,
        snippetLen: pre ? pre.textContent.trim().length : 0,
        snippetHead: pre ? pre.textContent.trim().slice(0, 60) : null,
        descHasBacktick: /\`/.test(desc?.textContent || ''),
        descCodeTags: desc ? desc.querySelectorAll('code').length : 0,
        descText: (desc?.textContent || '').slice(0, 130),
      };
    })()`);
  },
  // Walk a mock's MCQs, answering the first option each time; report the
  // verdict, the explanation and the schema panel for the first question.
  async mock_walk() {
    const id = arg('id', 'revolut-analytics-screen');
    await cdp('Page.navigate', { url: `${URL}/app/?interview=${id}` });
    await wait(6000);
    return ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const out = { header: document.querySelector('[data-testid="interview-content"]')?.previousElementSibling?.innerText.replace(/\\s+/g, ' ').slice(0, 120), schema: document.querySelector('[data-testid="interview-schema"]')?.innerText.replace(/\\s+/g, ' ').slice(0, 160), steps: [] };
      for (let i = 0; i < 3; i++) {
        const q = document.querySelector('[data-testid="interview-question"] h3')?.textContent;
        const opt = document.querySelector('[data-testid^="interview-mcq-option-"]');
        if (!opt) { out.steps.push({ q, note: 'not an MCQ' }); break; }
        opt.click(); await w(200);
        document.querySelector('[data-testid="interview-mcq-submit"]').click(); await w(600);
        const verdict = [...document.querySelectorAll('.fixed h3')].map(h => h.textContent).pop();
        const expl = document.querySelector('[data-testid="interview-mcq-explanation"]')?.innerText.replace(/\\s+/g, ' ').slice(0, 140) || null;
        out.steps.push({ q, verdict, expl });
        [...document.querySelectorAll('button')].find(b => /^Next question/.test(b.textContent.trim()))?.click(); await w(600);
      }
      return out;
    })()`);
  },
  // Sit a mock: answer Q1 wrong, skip the rest, then read the recommendation
  // banner's focus areas (must come from this sitting, submitted misses only).
  async focus_after_sitting() {
    const id = arg('id', 'sql-fundamentals-free');
    await cdp('Page.navigate', { url: `${URL}/app/?interview=${id}` });
    await wait(6000);
    return ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const click = (re) => { const b = [...document.querySelectorAll('button')].find(b => re.test(b.textContent.trim())); if (b) b.click(); return !!b; };
      const cm = document.querySelector('.sql-cm-editor .CodeMirror').CodeMirror;
      cm.setValue('SELECT name FROM employees'); await w(200);
      document.querySelector('[data-testid="interview-submit-answer"]').click(); await w(600);
      const wrongTitle = document.querySelector('[data-testid="interview-feedback-diagnosis"]')?.textContent || null;
      click(/^Next question/); await w(500);
      for (let i = 0; i < 3; i++) {
        if (!document.querySelector('[data-testid="interview-skip-yes"]')) { document.querySelector('[data-testid="interview-skip"]')?.click(); await w(250); }
        document.querySelector('[data-testid="interview-skip-yes"]')?.click(); await w(450);
        click(i < 2 ? /^Next question/ : /^See results/); await w(600);
      }
      document.querySelector('[data-testid="interview-back-to-list"]')?.click(); await w(1500);
      const rec = [...document.querySelectorAll('h3')].find(h => /Recommended/.test(h.textContent));
      const box = rec ? rec.closest('div').parentElement : null;
      return { wrongTitle, recommendation: box ? box.innerText.replace(/\\s+/g, ' ').slice(0, 260) : null };
    })()`);
  },
  // The in-app company view: does it say where the set came from?
  async company_banner() {
    const company = arg('company', 'Stripe');
    await cdp('Page.navigate', { url: `${URL}/app/?company=${encodeURIComponent(company)}` });
    await wait(7000);
    return ev(`({ user: localStorage.getItem('sqlquest_user'), guest: /Playing as Guest/.test(document.body.innerText), provenance: document.querySelector('[data-testid="company-set-provenance"]')?.textContent || null })`);
  },
  // The Learning Path as a signed-in account sees it: every stage, and
  // whether it reads as locked (founder QA 2026-09-20, item 3).
  async path_locks() {
    await cdp('Page.navigate', { url: `${URL}/app/` });
    await wait(7000);
    await shot('path-locks');
    return ev(`(() => {
      const cards = [...document.querySelectorAll('button, div')].filter(el => /Data Cleanup Logic|Multi-Step Queries|CTEs|Window Functions|Joining Tables|Filtering and Sorting|Aggregations/.test(el.textContent || '') && el.children.length < 12);
      const seen = new Map();
      for (const el of cards) {
        const name = (el.textContent.match(/Data Cleanup Logic|Multi-Step Queries|CTEs|Window Functions|Joining Tables|Filtering and Sorting|Aggregations/) || [])[0];
        if (!name || seen.has(name)) continue;
        seen.set(name, {
          locked: /🔒|Locked/i.test(el.textContent) || el.getAttribute('aria-disabled') === 'true' || (el.tagName === 'BUTTON' && el.disabled),
          text: el.textContent.replace(/\\s+/g, ' ').slice(0, 110),
        });
      }
      return { user: localStorage.getItem('sqlquest_user'), guest: /Playing as Guest/.test(document.body.innerText), stages: Object.fromEntries(seen) };
    })()`);
  },
  // Does a ?challenge= / ?company= link land where it promises, signed in?
  async deeplink_lands() {
    const path = arg('path', '/app/?challenge=23');
    await cdp('Page.navigate', { url: `${URL}${path}` });
    await wait(8000);
    return ev(`({
      user: localStorage.getItem('sqlquest_user'),
      guest: /Playing as Guest/.test(document.body.innerText),
      editorOpen: !!document.querySelector('.sql-cm-editor'),
      heading: (document.querySelector('[data-onboarding="run"]') ? [...document.querySelectorAll('h2')].map(h => h.textContent.trim()).filter(Boolean)[0] : null),
      idLine: [...document.querySelectorAll('span')].map(s => s.textContent.trim()).find(t => /^#\\d+ of \\d+/.test(t)) || null,
      listCount: document.querySelectorAll('[data-onboarding="challenge-card"], button h3').length,
      text: document.body.innerText.replace(/\\s+/g, ' ').slice(0, 400),
      log: (window.__log || []).filter(l => /deep|challenge_started|lock_reached/i.test(l)).slice(0, 8),
      href: location.href,
      param: new URLSearchParams(location.search).get('challenge'),
      inBank: !!(window.challengesData || []).find(c => c.id === 23),
    })`);
  },
  // Founder QA 2026-09-20: a deep link opened while signed in must keep the
  // session. Reports who the app thinks you are right after the load.
  async deeplink_session() {
    const path = arg('path', '/app/?challenge=23');
    await cdp('Page.navigate', { url: `${URL}${path}` });
    await wait(1200);
    const early = await ev(`({ guestBanner: /Playing as Guest/.test(document.body.innerText), login: /Log in/.test(document.body.innerText) })`);
    await wait(5000);
    const late = await ev(`({
      guestBanner: /Playing as Guest/.test(document.body.innerText),
      login: /Log in/.test(document.body.innerText),
      savedUser: localStorage.getItem('sqlquest_user'),
      guestKeys: Object.keys(localStorage).filter(k => /^sqlquest_user_guest_/.test(k)).length,
      pro: /PRO|Pro Member/i.test(document.body.innerText.slice(0, 2000)),
      openedChallenge: (() => { const h = [...document.querySelectorAll('h2')].find(x => x.className.includes('fd') || x.previousElementSibling?.textContent?.includes('#')); return document.querySelector('.sql-cm-editor') ? (document.querySelector('[data-onboarding="submit"]') ? ([...document.querySelectorAll('h2')].map(x => x.textContent).find(t => t && t.length < 80) || 'editor open') : null) : null; })(),
      tab: document.querySelector('[data-testid="interview-question"]') ? 'interview' : null,
      solves: (JSON.parse(localStorage.getItem('sqlquest_user_qa_pro') || '{}').solvedChallenges || []).length,
    })`);
    await shot('deeplink');
    return { early, late };
  },
  // Live round: the explanation box, its button, and the saved note on the results screen.
  async approach() {
    await cdp('Page.navigate', { url: `${URL}/app/?interview=capital-one-live-sql` });
    await wait(6000);
    return ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const box = document.querySelector('[data-testid="interview-approach"] textarea');
      if (!box) return { error: 'no box' };
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      setter.call(box, 'Aggregate transactions and chargebacks per account first, then LEFT JOIN both to flagged accounts so nothing fans out.');
      box.dispatchEvent(new Event('input', { bubbles: true })); await w(100);
      document.querySelector('[data-testid="interview-approach-feedback"]').click(); await w(1500);
      const reply = document.querySelector('[data-testid="interview-approach-reply"]')?.innerText || null;
      const cm = document.querySelector('.sql-cm-editor .CodeMirror').CodeMirror; cm.setValue('SELECT 1'); await w(100);
      document.querySelector('[data-testid="interview-submit-answer"]').click(); await w(500);
      for (let i = 0; i < 3; i++) {
        [...document.querySelectorAll('button')].find(b => /^Next question/.test(b.textContent.trim()))?.click(); await w(400);
        document.querySelector('[data-testid="interview-skip"]')?.click(); await w(200);
        document.querySelector('[data-testid="interview-skip-yes"]')?.click(); await w(400);
      }
      [...document.querySelectorAll('button')].find(b => /^See results/.test(b.textContent.trim()))?.click(); await w(800);
      const review = document.querySelector('[data-testid="interview-approach-review"]')?.innerText || null;
      return { reply, review: review && review.slice(0, 300) };
    })()`);
  },
  // The Interview tab's target pin for a Capital One learner.
  async pin() {
    await cdp('Page.navigate', { url: `${URL}/app/?interview=sql-fundamentals-free` });
    await wait(5000);
    return ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      window.confirm = () => true;
      const quit = [...document.querySelectorAll('button')].find(b => /Quit/.test(b.textContent)); if (quit) quit.click();
      await w(600);
      const tab = [...document.querySelectorAll('button')].find(b => /Interview/i.test(b.textContent) && b.textContent.length < 30); if (tab) tab.click();
      await w(1200);
      const pin = document.querySelector('[data-interview-target]');
      return pin ? { sub: pin.querySelector('p')?.textContent, text: pin.innerText.replace(/\\s+/g, ' ').slice(0, 400) } : { error: 'no pin', tabs: [...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(t => t.length < 25).slice(0, 20) };
    })()`);
  },
  // Challenge 170 with DENSE_RANK and no PARTITION: the verdict, the Help
  // panel's position and its opener.
  async help170() {
    await cdp('Page.navigate', { url: `${URL}/app/?challenge=170` });
    await wait(5000);
    return ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const cm = document.querySelector('.sql-cm-editor .CodeMirror').CodeMirror;
      cm.setValue('SELECT name, department, salary, DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS salary_rank FROM employees ORDER BY salary DESC, name');
      await w(200);
      document.querySelector('[data-onboarding="submit"]').click(); await w(1200);
      const headline = document.querySelector('p.font-bold.text-orange-300')?.textContent;
      const help = [...document.querySelectorAll('button')].find(b => /Help|Hide/.test(b.textContent) && b.title && /AI help/i.test(b.title));
      help.click(); await w(600);
      const panel = document.querySelector('[data-testid="inline-ai-help"]');
      const dxPanel = document.querySelector('p.font-bold.text-orange-300')?.closest('.rounded-xl');
      const out = [...document.querySelectorAll('h3')].find(h => /Your Output/.test(h.textContent));
      return {
        headline,
        panelTitle: panel?.querySelector('h3')?.textContent,
        opener: panel?.querySelector('[data-testid="tutor-text"]')?.innerText,
        panelBelowDiagnosis: !!(panel && dxPanel && (dxPanel.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING)),
        panelAboveOutput: !!(panel && out && (panel.compareDocumentPosition(out) & Node.DOCUMENT_POSITION_FOLLOWING)),
      };
    })()`);
  },
  // Open a mock by id and report its shape as the runner shows it.
  async open_mock() {
    const id = arg('id', 'capital-one-live-sql');
    await cdp('Page.navigate', { url: `${URL}/app/?interview=${id}` });
    await wait(6000);
    await shot(`open-${id}`);
    return ev(`({ header: document.querySelector('[data-testid="interview-content"]')?.previousElementSibling?.innerText.replace(/\\s+/g, ' ').slice(0, 160), q: document.querySelector('[data-testid="interview-question"] h3')?.textContent, locked: /Unlock|Upgrade/.test(document.body.innerText.slice(0, 3000)) && !document.querySelector('[data-testid="interview-question"]') })`);
  },
  // Walk Capital One to Q6 answering A each time; record the overlay's box
  // for every MCQ, and Q6's question-card box before and after a pick.
  async c1_overlay() {
    await cdp('Page.navigate', { url: `${URL}/app/?interview=capital-one-codesignal` });
    await wait(6000);
    const boxes = [];
    for (let i = 0; i < 8; i++) {
      const q = await ev(`document.querySelector('[data-testid="interview-question"] h3')?.textContent || null`);
      const before = await ev(`(() => { const el = document.querySelector('[data-testid="interview-question"]'); const r = el && el.getBoundingClientRect(); return r ? Math.round(r.top) : null; })()`);
      const layout = await ev(`(() => { const pane = document.querySelector('[data-testid="interview-content"]'); const hdr = pane && pane.previousElementSibling; return { paneTop: pane && Math.round(pane.getBoundingClientRect().top), paneScroll: pane && pane.scrollTop, hdrH: hdr && Math.round(hdr.getBoundingClientRect().height), hdrText: hdr && hdr.innerText.replace(/\\s+/g, ' ').slice(0, 160) }; })()`);
      await ev(`(() => { const o = document.querySelector('[data-testid^="interview-mcq-option-"]'); if (o) o.click(); return true; })()`);
      await wait(200);
      const after = await ev(`(() => { const el = document.querySelector('[data-testid="interview-question"]'); const r = el && el.getBoundingClientRect(); return r ? Math.round(r.top) : null; })()`);
      await ev(`(() => { const b = document.querySelector('[data-testid="interview-mcq-submit"]'); if (b) b.click(); return true; })()`);
      await wait(500);
      const ov = await ev(`(() => { const d = [...document.querySelectorAll('.fixed.inset-0 > div')].find(e => /Next question|See results/.test(e.innerText)); if (!d) return null; const r = d.getBoundingClientRect(); return { top: Math.round(r.top), h: Math.round(r.height) }; })()`);
      if (i === 5) await shot('c1-q6-overlay');
      boxes.push({ q, cardTopBeforePick: before, cardTopAfterPick: after, overlay: ov, layout });
      await ev(click('/^Next question/'));
      await wait(600);
    }
    return boxes;
  },
  // Practice mode: Q11 shows its trap note and the original title.
  async c1_practice_note() {
    await cdp('Page.navigate', { url: `${URL}/app/?interview=capital-one-codesignal` });
    await wait(6000);
    return ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      // leave the timed run, open the same mock in practice mode
      window.confirm = () => true;
      const quit = [...document.querySelectorAll('button')].find(b => /Quit/.test(b.textContent)); if (quit) quit.click();
      await w(800);
      const tab = [...document.querySelectorAll('button')].find(b => /Interview/i.test(b.textContent) && b.textContent.length < 30); if (tab) tab.click();
      await w(800);
      const card = [...document.querySelectorAll('h3')].find(h => /Capital One/.test(h.textContent));
      const root = card && card.closest('.rounded-xl');
      const practice = root && [...root.querySelectorAll('button')].find(b => /Practice/.test(b.textContent));
      if (!practice) return { error: 'no practice button', cards: [...document.querySelectorAll('h3')].map(h => h.textContent).slice(0, 12) };
      practice.click(); await w(1500);
      for (let i = 0; i < 10; i++) {
        const next = [...document.querySelectorAll('button')].find(b => /^Next Question →$/.test(b.textContent.trim()));
        if (next) next.click(); await w(400);
        const n2 = [...document.querySelectorAll('button')].find(b => /^Next question →$/.test(b.textContent.trim()));
        if (n2) n2.click(); await w(400);
      }
      return { title: document.querySelector('[data-testid="interview-question"] h3')?.textContent, note: document.querySelector('[data-testid="interview-practice-note"]')?.textContent || null };
    })()`);
  },
};

async function main() {
  const name = process.argv[2];
  if (!SCENARIOS[name]) { console.error(`scenarios: ${Object.keys(SCENARIOS).join(', ')}`); process.exit(2); }
  const chrome = spawn(CHROME, [`--remote-debugging-port=${PORT}`, '--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars', `--user-data-dir=/tmp/chrome-qa-${Date.now()}`, 'about:blank'], { stdio: 'ignore' });
  try {
    for (let i = 0; i < 40; i++) { try { if ((await getJSON(`http://127.0.0.1:${PORT}/json`)).length) break; } catch (_) {} await wait(200); }
    const tab = (await getJSON(`http://127.0.0.1:${PORT}/json`)).find(t => t.type === 'page');
    const WebSocket = (await import('ws')).WebSocket;
    ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
    ws.on('message', d => { const m = JSON.parse(d.toString()); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result || m); pending.delete(m.id); } });
    await cdp('Page.enable', {}); await cdp('Runtime.enable', {});
    await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    await cdp('Page.addScriptToEvaluateOnNewDocument', { source: preamble });
    console.log(JSON.stringify(await SCENARIOS[name](), null, 2));
  } finally { try { ws.close(); } catch (_) {} chrome.kill('SIGKILL'); }
}
main().catch(e => { console.error(e); process.exit(1); });
