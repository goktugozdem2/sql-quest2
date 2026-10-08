// Bot signals on the app's events (2026-10-07; docs/reads/p1-guardrail-bing-2026-10-07.md).
// Pins: the user-agent rule is the landing tracker's, character for
// character; hard signals drop the event, the crawler fingerprints stamp it;
// the stamp never removes a person whose landing source is known; the UA
// string itself is never stored; and app.jsx applies all of it.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { BOT_UA_RE, SOFT_FINGERPRINTS, botSignals, botDecision } from '../src/utils/bot-signals.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';

describe('bot signals', () => {
  it('the UA rule is the landing tracker’s, character for character', () => {
    const track = read('src/track.js');
    const m = /return (\/bot\|crawl[^\n]*\/i)\s*\n?\s*\.test\(navigator\.userAgent/.exec(track);
    expect(m, 'isBot() regex in src/track.js').toBeTruthy();
    expect(m[1]).toBe(String(BOT_UA_RE));
  });

  it('webdriver or a self-declared bot UA is hard: the event is not written', () => {
    expect(botDecision(botSignals({ userAgent: CHROME, webdriver: true }))).toEqual({ write: false, stamp: null });
    expect(botDecision(botSignals({ userAgent: 'Mozilla/5.0 (compatible; GPTBot/1.2)' }))).toEqual({ write: false, stamp: null });
    expect(botDecision(botSignals({ userAgent: 'Mozilla/5.0 HeadlessChrome/129' })).write).toBe(false);
    expect(botDecision(botSignals({ userAgent: CHROME, webdriver: false })).write).toBe(true);
  });

  it('the crawler fingerprints are soft: written and stamped, never with a landing source', () => {
    expect(botSignals({ userAgent: CHROME, viewport: 'desktop:1919x992', landingSrc: null }).soft).toBe('vp1919x992');
    expect(botSignals({ userAgent: CHROME, viewport: 'desktop:1919x992', landingSrc: 'search:google' }).soft).toBe(null);
    expect(botSignals({ userAgent: CHROME, viewport: 'desktop:1920x1080', tz: 'America/Los_Angeles', landingSrc: '' }).soft).toBe('la1920x1080');
    expect(botSignals({ userAgent: CHROME, viewport: 'desktop:1920x1080', tz: 'Europe/Istanbul', landingSrc: '' }).soft).toBe(null);
    expect(botSignals({ userAgent: CHROME, viewport: 'desktop:1280x720', tz: 'UTC' }).soft).toBe('utc1280x720');
    expect(botDecision(botSignals({ userAgent: CHROME, viewport: 'desktop:1919x992' }))).toEqual({ write: true, stamp: 'vp1919x992' });
    expect(botDecision(botSignals({ userAgent: CHROME, viewport: 'desktop:1440x900', landingSrc: 'search:bing' }))).toEqual({ write: true, stamp: null });
    for (const f of SOFT_FINGERPRINTS) expect(f.since, f.id).toMatch(/^2026-\d\d-\d\d$/);
  });

  it('keeps only coarse signals, never the UA string', () => {
    const s = botSignals({ userAgent: CHROME, webdriver: false, languages: ['en-US', 'en'] });
    expect(s).toEqual({ hard: false, soft: null, wd: false, uaBot: false, langs: 2 });
    expect(JSON.stringify(s)).not.toContain('Mozilla');
  });
});

describe('app.jsx applies it', () => {
  const app = read('src/app.jsx');
  it('the writer drops a hard bot before it writes anything', () => {
    const w = app.slice(app.indexOf('const writeProEvent = (event, reason, metadata = {}) => {'), app.indexOf("supabaseFetch('pro_events'", app.indexOf('const writeProEvent = (event, reason, metadata = {}) => {')));
    expect(w).toContain('if (hardBotBrowser()) return;');
    expect(w.indexOf('if (ANALYTICS_MUTED)')).toBeLessThan(w.indexOf('if (hardBotBrowser()) return;'));
  });
  it('the smoke test names itself, and only its hermetic preamble does', () => {
    expect(app).toContain('if (window.__SQLQUEST_SMOKE__ === true) return false;');
    expect(read('scripts/smoke/lib.mjs')).toContain('window.__SQLQUEST_SMOKE__ = true;');
    expect(read('src/track.js')).not.toContain('__SQLQUEST_SMOKE__');
  });
  it('the activation tracker stamps the fingerprint and gives app_opened the coarse signals', () => {
    const t = app.slice(app.indexOf('const trackActivationEvent = (event, metadata = {}, options = {}) => {'), app.indexOf('// A save the server refused as a regression'));
    expect(t).toContain('const decision = botDecision(signals);');
    expect(t).not.toContain('if (!decision.write) return;'); // the drop is the writer's, after the localhost mute
    expect(t).toContain('if (decision.stamp) payload.bot = decision.stamp;');
    expect(t).toMatch(/if \(event === 'app_opened' && signals\) Object\.assign\(payload, \{ wd: signals\.wd, uaBot: signals\.uaBot, langs: signals\.langs \}\);/);
    expect(t.indexOf('botDecision(signals)')).toBeLessThan(t.indexOf("writeProEvent(event, 'activation_funnel', payload)"));
  });
});
