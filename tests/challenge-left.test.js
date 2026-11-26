// `challenge_left` (2026-11-24): one event per challenge open when the person
// leaves without a run. Pure rules in src/utils/challenge-left.js; the wiring
// in app.jsx is pinned by source guards below. Metric `open_to_run_exit`.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import {
  CHALLENGE_LEFT_EVENT, CHALLENGE_LEFT_HOWS, CHALLENGE_LEFT_FIELDS,
  deviceClassFor, startOpen, noteTyped, noteFlag, leaveHowForView,
  shouldSendLeft, markSent, challengeLeftPayload,
} from '../src/utils/challenge-left.js';

const T0 = 1_795_000_000_000;

// A page driven only through the pure rules app.jsx uses: one open record,
// the events it would send.
function page() {
  let open = null;
  const sent = [];
  let editor = '';
  const send = (how, now) => {
    if (!shouldSendLeft(open, how)) return;
    open = markSent(open);
    sent.push(challengeLeftPayload(open, { how, now, width: 375 }));
  };
  return {
    sent,
    get open() { return open; },
    openChallenge(id, now) { if (open && !open.sent && open.challengeId !== id) send('switch', now); open = noteFlag(startOpen(id, now), 'seen'); editor = ''; },
    type(text) { open = noteTyped(open, editor, text); editor = text; },
    run() { open = noteFlag(open, 'ran'); },
    view(viewId, now) { const how = leaveHowForView(open, viewId); if (how) send(how, now); },
    hide(now) { send('hidden', now); },
  };
}

describe('challenge_left fires once per open', () => {
  it('a hidden tab, then pagehide, then the list: one event', () => {
    const p = page();
    p.openChallenge(91, T0);
    p.hide(T0 + 40_000);       // visibilitychange → hidden
    p.hide(T0 + 40_010);       // pagehide right after
    p.view(null, T0 + 50_000); // back to the list on return
    expect(p.sent).toHaveLength(1);
    expect(p.sent[0]).toMatchObject({ challengeId: 91, how: 'hidden', ms_on_page: 40_000, device_class: 'mobile' });
  });

  it('navigate and switch are named; each open gets its own event', () => {
    const p = page();
    p.openChallenge(91, T0);
    p.openChallenge(92, T0 + 5_000);   // opened another over it
    p.view(null, T0 + 9_000);          // back to the list
    expect(p.sent.map(e => [e.challengeId, e.how])).toEqual([[91, 'switch'], [92, 'navigate']]);
  });

  it('an open never seen on screen sends nothing', () => {
    const open = startOpen(5, T0);
    expect(shouldSendLeft(open, 'navigate')).toBe(false);
    expect(shouldSendLeft(noteFlag(open, 'seen'), 'navigate')).toBe(true);
    expect(shouldSendLeft(noteFlag(open, 'seen'), 'bogus')).toBe(false);
    expect(shouldSendLeft(markSent(noteFlag(open, 'seen')), 'hidden')).toBe(false);
  });

  it('still on screen is not a leave', () => {
    const open = startOpen(91, T0);
    expect(leaveHowForView(open, 91)).toBe(null);
    expect(leaveHowForView(open, '91')).toBe(null);
    expect(leaveHowForView(open, null)).toBe('navigate');
    expect(leaveHowForView(open, 92)).toBe('switch');
    expect(leaveHowForView(null, null)).toBe(null);
  });
});

describe('never after a run or a submit', () => {
  it('a run on the open silences every way out', () => {
    const p = page();
    p.openChallenge(91, T0);
    p.type('SELECT 1');
    p.run();
    p.hide(T0 + 1_000);
    p.view(null, T0 + 2_000);
    expect(p.sent).toHaveLength(0);
    for (const how of CHALLENGE_LEFT_HOWS) expect(shouldSendLeft(p.open, how)).toBe(false);
  });

  it('a run on one open does not silence the next open', () => {
    const p = page();
    p.openChallenge(91, T0);
    p.run();
    p.openChallenge(92, T0 + 3_000);
    p.view(null, T0 + 6_000);
    expect(p.sent.map(e => e.challengeId)).toEqual([92]);
  });
});

describe('carries no query text, nothing personal', () => {
  it('exactly the seven fields; typed is a count of inserted characters', () => {
    const p = page();
    p.openChallenge(91, T0);
    p.type("SELECT email FROM users WHERE name = 'Ayşe'");
    p.type("SELECT email FROM users");     // a deletion does not subtract
    p.view(null, T0 + 12_345);
    const e = p.sent[0];
    expect(Object.keys(e).sort()).toEqual([...CHALLENGE_LEFT_FIELDS].sort());
    expect(e.typed).toBe("SELECT email FROM users WHERE name = 'Ayşe'".length);
    const json = JSON.stringify(e);
    for (const bit of ['SELECT', 'email', 'users', 'Ayşe']) expect(json).not.toContain(bit);
    expect(e).toMatchObject({ scrolled: false, hint_opened: false, how: 'navigate', ms_on_page: 12_345 });
  });

  it('flags and device class', () => {
    const o = noteFlag(noteFlag(noteFlag(startOpen(1, T0), 'seen'), 'scrolled'), 'hintOpened');
    expect(challengeLeftPayload(o, { how: 'hidden', now: T0, width: 1280 })).toMatchObject({ scrolled: true, hint_opened: true, device_class: 'desktop' });
    expect([deviceClassFor(375), deviceClassFor(800), deviceClassFor(1440), deviceClassFor(0), deviceClassFor(null)]).toEqual(['mobile', 'tablet', 'desktop', null, null]);
    expect(noteFlag(o, 'query')).toBe(o);
    expect(CHALLENGE_LEFT_EVENT).toBe('challenge_left');
  });
});

describe('the app wiring (source guards)', () => {
  const app = fs.readFileSync(new URL('../src/app.jsx', import.meta.url), 'utf8');
  const start = app.indexOf('// ── challenge_left (2026-11-24)');
  const block = app.slice(start, app.indexOf('const openChallenge = (challenge, opts = {}) => {', start));

  it('the hooks sit above the showAuth / dbReady early returns', () => {
    expect(start).toBeGreaterThan(0);
    expect(start).toBeLessThan(app.indexOf('  if (showAuth) {'));
    expect(start).toBeLessThan(app.indexOf('  if (!dbReady) return ('));
  });

  it('the event carries only the pure payload, sent with keepalive', () => {
    const calls = app.match(/trackActivationEvent\(CHALLENGE_LEFT_EVENT,[^\n]*/g) || [];
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatch(/^trackActivationEvent\(CHALLENGE_LEFT_EVENT, challengeLeftPayload\(open, \{ how, now: Date\.now\(\), width: [^}]*\}\), \{ keepalive: true \}\);$/);
    expect(app).not.toMatch(/'challenge_left'/);
    // keepalive reaches the fetch
    expect(app).toContain("writeProEvent(event, 'activation_funnel', payload, { keepalive: options.keepalive === true });");
    expect(app).toContain('...(opts && opts.keepalive === true ? { keepalive: true } : {}),');
  });

  it('every run and submit path marks the open as run', () => {
    const mark = app.slice(app.indexOf('const markChallengeFirstRun = (via) => {'), app.indexOf('const markChallengeFirstRun = (via) => {') + 400);
    expect(mark.indexOf("chLeftNote('ran')")).toBeGreaterThan(0);
    expect(mark.indexOf("chLeftNote('ran')")).toBeLessThan(mark.indexOf('firstRunSentRef.current.has(id)) return;'));
  });

  it('a send needs the pure gate; the exits are hidden, pagehide, the view and a new open', () => {
    expect(block).toMatch(/const chLeftSend = \(how\) => \{\s*\n\s*const open = chLeftRef\.current;\s*\n\s*if \(!shouldSendLeft\(open, how\)\) return;\s*\n\s*chLeftRef\.current = markSent\(open\);/);
    expect(block).toContain("document.visibilityState === 'hidden' && onScreen()) chLeftSendRef.current('hidden')");
    expect(block).toContain("window.addEventListener('pagehide', onPageHide);");
    expect(block).toContain('const how = leaveHowForView(open, chLeftView);');
    expect(block).toContain("if (prev) chLeftSend('switch');");
    expect(app).toMatch(/trackActivationEvent\('challenge_opened', \{[\s\S]{0,400}?\}\);\s*\n\s*chLeftBegin\(challenge\.id\);/);
  });

  it('works for a guest: nothing in it reads who the person is', () => {
    expect(block.length).toBeGreaterThan(500);
    expect(block).not.toMatch(/isGuest|currentUser|isPro\b|userEmail/);
  });

  it('the hint toggle and the inline Help both mark hint_opened', () => {
    expect(app).toContain("onClick={() => { if (!showChallengeHint) chLeftNote('hintOpened');");
    expect(app).toMatch(/setShowInlineAiHelp\(true\);\s*\n\s*chLeftNote\('hintOpened'\);/);
  });

  it('typed is counted from the editor change, never stored as text', () => {
    expect(app).toContain('onChange={val => { chLeftRef.current = noteTyped(chLeftRef.current, challengeQuery, val); updateChallengeQuery(val); }}');
  });
});
