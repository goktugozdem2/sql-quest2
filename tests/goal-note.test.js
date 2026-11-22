import { describe, it, expect, beforeAll } from 'vitest';
import { transformWithOxc } from 'vite';
import { shouldArmGoalNoteDateAsk, shouldRenderGoalNoteDateAsk } from '../src/utils/goal-note-date-ask.js';
import fs from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FN_PATH = join(ROOT, 'supabase/functions/goal-note/index.ts');
const fn = fs.readFileSync(FN_PATH, 'utf8');
const digest = fs.readFileSync(join(ROOT, 'supabase/functions/weekly-digest/index.ts'), 'utf8');
const app = fs.readFileSync(join(ROOT, 'src/app.jsx'), 'utf8');

// The one-time founder note to everyone with no goal on the row
// (docs/plans/goal-capture-2026-09-17.md, door 5). The sender runs on Deno
// and is founder-triggered, so the guards live here as source checks: the
// audience rules, the once-ever ceiling, the cap, the voice rule (founder in
// the subject, hand-written to a short list, one question, never
// byte-identical bodies, nothing about the paid plan), and the copy of the
// digest's goalOnRecord that must not drift.
const between = (src, start, end) => src.slice(src.indexOf(start), src.indexOf(end, src.indexOf(start)));

describe('goal-note: the one-time letter to everyone with no goal on record', () => {
  it('exists, is not scheduled, and reads the dry-run and limit switches', () => {
    expect(fs.existsSync(FN_PATH)).toBe(true);
    expect(fn).toMatch(/NOT scheduled/);
    expect(fn).toContain("searchParams.get('dry') === '1'");
    expect(fn).toContain("searchParams.get('limit')");
    expect(fn).toContain('Math.min(runMax, Math.floor(limitParam))');   // limit only lowers the cap
    expect(fn).toContain("const runMax = mode === 'new' ? MAX_PER_RUN_NEW : MAX_PER_RUN");
    // No cron file or schedule reference anywhere in the function directory.
    const files = fs.readdirSync(join(ROOT, 'supabase/functions/goal-note'));
    expect(files).toEqual(['index.ts']);
  });

  it('names all seven audience conditions', () => {
    // 1. registered
    expect(fn).toContain(".not('username', 'like', 'guest_%')");
    // 2. has an email
    expect(fn).toContain(".not('email', 'is', null)");
    expect(fn).toContain("if (!email || !email.includes('@'))");
    // 3. not internal — the broad matcher incl. the three internal domains
    expect(fn).toContain('isInternalAccount(username, email)');
    expect(fn).toContain("u === 'elena'");
    expect(fn).toContain("e.endsWith('@datrick.com')");
    expect(fn).toContain("e.endsWith('@example.com')");
    expect(fn).toContain("e.endsWith('@mailtest.com')");
    // 4. not opted out
    expect(fn).toContain('userData.emailOptOut === true');
    // 5. no goal on record
    expect(fn).toContain('if (goalOnRecord(userData))');
    // 6. active in the last 60 days, lastActive in either shape
    expect(fn).toMatch(/const ACTIVE_DAYS = 60\b/);
    expect(fn).toContain('if (lastActive < activeSince)');
    expect(fn).toContain("typeof v === 'number'");
    expect(fn).toContain('Date.parse(v)');
    // 7. never received this template, and no other campaign in 48h
    expect(fn).toContain(".eq('template', TEMPLATE)");
    expect(fn).toContain('userData.goalNoteAt');
    expect(fn).toMatch(/const QUIET_HOURS = 48\b/);
    expect(fn).toContain('recentlyMailed.has(username)');
  });

  it('is once per user ever, capped at 60 a run, most recently active first', () => {
    expect(fn).toMatch(/const MAX_LIFETIME_SENDS = 1\b/);
    expect(fn).toContain('(lifetime.get(username) || 0) >= MAX_LIFETIME_SENDS');
    expect(fn).toMatch(/const MAX_PER_RUN = 60\b/);
    expect(fn).toContain('audience.sort((a, b) => b.lastActive - a.lastActive)');
    expect(fn).toContain('const batch = due.slice(0, cap)');
    expect(fn).toContain('let due = audience');
    expect(fn).toMatch(/const TEMPLATE = 'goal_note'/);
  });

  it('handles both lastActive shapes', () => {
    const src = between(fn, 'const activeAt = ', '\n}\n') + '\n}';
    const activeAt = new Function(`${src.replace('(d: any): number', '(d)')}; return activeAt;`)();
    expect(activeAt({ lastActive: 1758000000000 })).toBe(1758000000000);
    expect(activeAt({ lastActive: '1758000000000' })).toBe(1758000000000);
    expect(activeAt({ lastActive: '2026-09-16T10:00:00.000Z' })).toBe(Date.parse('2026-09-16T10:00:00.000Z'));
    expect(activeAt({ lastActive: 'garbage' })).toBe(0);
    expect(activeAt({})).toBe(0);
    expect(activeAt(null)).toBe(0);
  });

  it('keeps the email voice rule: founder in every subject, two of them, by hash', () => {
    const subjectsSrc = between(fn, 'const SUBJECTS = [', ']');
    const subjects = [...subjectsSrc.matchAll(/^\s*['"](.+)['"],?$/gm)].map(m => m[1]);
    expect(subjects).toEqual([
      'A question from the person who builds SQL Quest',
      "SQL Quest's founder here — one question",
    ]);
    for (const s of subjects) expect(s).toMatch(/founder|person who builds/i);
    expect(fn).toContain('SUBJECTS[hash(username) % SUBJECTS.length]');
  });

  it('asks one question with three plain goal links carrying src=goal_note and the goal_note utm', () => {
    expect(fn).toContain("goalLink('interview', 'An interview', mode)");
    expect(fn).toContain("goalLink('job_ready', 'Getting job-ready', mode)");
    expect(fn).toContain("goalLink('learning', 'SQL in general', mode)");
    expect(fn).toContain("utm(`/app/?src=goal_note&goal=${goal}${mode === 'new' ? '&m=new' : ''}`, TEMPLATE)");
    expect(fn).toContain("const LINKS = linksFor('backlog')");
    // Exactly three goal links per body; no other CTA.
    expect((fn.match(/goalLink\('/g) || []).length).toBe(3);
    expect(fn).not.toMatch(/pro=1/);
    // The app records the goal from the link.
    expect(app).toContain("intakeGoalForIntent(params.get('goal'))");
    expect(app).toContain("source: 'link'");
  });

  it('says it is written by hand to a short list, says the answer changes the Coach, promises no follow-up, signs off', () => {
    expect(fn).toMatch(/writing this myself to a short list/);
    expect(fn).toMatch(/writing to each of you one at a time/);
    expect((fn.match(/what the Coach puts in front of you/g) || []).length).toBe(2);   // once per variant
    expect(fn).toContain("I won't send another one of these.");
    expect(fn).toContain('You will not get a second one of these from me.');
    expect((fn.match(/Founder, SQL Quest/g) || []).length).toBe(2);   // one sign-off per mode, shared by both of its variants
    expect(fn).toContain("const REPLY_TO = 'goktug@datrick.com'");
    expect(fn).toContain('replyTo: REPLY_TO');
  });

  it('two body wordings, chosen by a second hash, never byte-identical', () => {
    expect(fn).toContain("const VARIANTS = ['A', 'B'] as const");
    expect(fn).toContain('hash(`${username}:body`)');
    expect(fn).toContain("variant === 'A'");
    // Rendered A and B for the same person differ.
    const a = between(fn, "variant === 'A'\n    ? `", '`\n    : `');
    const b = between(fn, "`\n    : `", '`\n  return');
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(200);
    expect(b.length).toBeGreaterThan(200);
  });

  it('personalises with one real number and omits the sentence at zero', () => {
    expect(fn).toContain('solves > 0');
    expect(fn).toContain("? ` You have solved ${solves}");
    expect(fn).toContain(": ''");
  });

  it('no pitch: nothing about the paid plan, no price, nothing unlimited', () => {
    expect(fn).not.toMatch(/\bPro\b/);
    expect(fn).not.toMatch(/unlimited/i);
    // A dollar sign before a digit is a price; interpolations and regex anchors are not.
    expect(fn).not.toMatch(/\$\s?\d/);
    expect(fn).not.toMatch(/\$99|\$29|\$199/);
    expect(fn).not.toMatch(/\/mo\b|a month|a year|checkout|upgrade/i);
  });

  it('logs the sent row with resend_id and the product-side event', () => {
    expect(fn).toContain("event: ok ? 'sent' : 'send_failed', resend_id: resendId");
    expect(fn).toContain('meta: { mode, variant: c.variant, solves: c.solves }');
    expect(fn).toContain("event: 'goal_note_sent'");
    expect(fn).toContain("reason: 'email'");
    expect(fn).toContain('metadata: { mode, solves: c.solves, variant: c.variant }');
    expect(fn).toContain('goalNoteAt: new Date().toISOString()');
  });

  it('carries the digest\'s goalOnRecord verbatim', () => {
    const here = between(fn, 'function goalOnRecord(', '\n}\n') + '\n}';
    const there = between(digest, 'function goalOnRecord(', '\n}\n') + '\n}';
    expect(here).toBe(there);
    expect(fn).toMatch(/COPIED VERBATIM from supabase\/functions\/weekly-digest\/index\.ts/);
    // And it behaves as the digest's test says it does.
    const goalOnRecord = new Function(`${here.replace('(userData: any): boolean', '(userData)')}; return goalOnRecord;`)();
    expect(goalOnRecord({})).toBe(false);
    expect(goalOnRecord({ intent: 'exploring' })).toBe(false);
    expect(goalOnRecord({ intake: { goal: 'interview' } })).toBe(true);
    expect(goalOnRecord({ coachState: { goalId: 'fundamentals' } })).toBe(true);
    expect(goalOnRecord({ prepTarget: { date: '2026-10-02' } })).toBe(true);
  });

  it('only the service role may call it — the anon key is public (2026-09-17)', () => {
    expect(fn).toContain("service role required");
    expect(fn).toContain("!accepted.includes(given)");
    // The gate sits before any query.
    expect(fn.indexOf('service role required')).toBeLessThan(fn.indexOf('createClient('));
  });

  it('never mails the three the founder wrote to by hand on 09-12', () => {
    for (const u of ['alexis_montesdeoca', 'harinivr02', 'rereremin']) expect(fn).toContain(`'${u}'`);
    expect(fn).toContain("skip('founder_mailed')");
  });
});

// ── mode=new: the same question to people who just signed up (2026-11-22) ──
// The function's declarations (everything above Deno.serve) are transpiled
// with Vite's own TS transform and run here, so the window, the clock and the
// copy are tested as the function computes them, not as a pattern.
let mod;
beforeAll(async () => {
  const head = fn.slice(0, fn.indexOf('Deno.serve(')).replace(/^import .*$/m, '');
  const { code } = await transformWithOxc(head, 'goal-note.ts');
  mod = new Function(`${code}
    return { createdAtMs, signupWindowSkip, sendWindow, companyFromArrival, SUBJECTS_NEW, subjectForNew,
      renderNewBody, renderBody, variantFor, MAX_PER_RUN, MAX_PER_RUN_NEW, NEW_MIN_AGE_HOURS, NEW_MAX_AGE_HOURS,
      NEW_MIN_HOURS_AFTER_SIGNUP, FALLBACK_UTC_HOUR, SEND_LOCAL_HOURS, fetchAllRows };`)();
});

const H = 3600000;
const NOW = Date.parse('2026-11-22T12:00:00Z');
const PRICE_WORDS = /\$\s?\d|unlimited|\/mo\b|a month|a year|checkout|upgrade|trial|discount|% off/i;
const PRICE = { test: (x) => PRICE_WORDS.test(x) || /\bPro\b/.test(x) };   // the plan's name is case-sensitive ("lapsed-pro" is a function)
const priceFree = (x) => expect(PRICE.test(x), x.slice(0, 120)).toBe(false);

describe('goal-note mode=new: new registrants, once, at their morning', () => {
  it('is a mode of the same sender: same template, same gate, no second function, no cron', () => {
    expect(fn).toContain("const mode: Mode = url.searchParams.get('mode') === 'new' ? 'new' : 'backlog'");
    expect((fn.match(/const TEMPLATE = /g) || []).length).toBe(1);
    expect(fs.readdirSync(join(ROOT, 'supabase/functions/goal-note'))).toEqual(['index.ts']);
    // No SQL file anywhere schedules it: the cron line lives in the PR, for the founder.
    const sqlFiles = [];
    const walk = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = join(dir, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith('.sql')) sqlFiles.push(p); } };
    walk(join(ROOT, 'supabase'));
    for (const f of sqlFiles) expect(fs.readFileSync(f, 'utf8'), f).not.toMatch(/cron\.schedule\([\s\S]{0,600}goal-note/);
  });

  it('reads the sign-up time from users.data.createdAt in both shapes, never users.created_at', () => {
    expect(mod.createdAtMs({ createdAt: 1763800000000 })).toBe(1763800000000);
    expect(mod.createdAtMs({ createdAt: '1763800000000' })).toBe(1763800000000);
    expect(mod.createdAtMs({ createdAt: '2026-11-20T09:00:00.000Z' })).toBe(Date.parse('2026-11-20T09:00:00.000Z'));
    expect(mod.createdAtMs({ createdAt: 'garbage' })).toBe(0);
    expect(mod.createdAtMs({})).toBe(0);
    expect(mod.createdAtMs(null)).toBe(0);
    expect(fn).toContain('const createdMs = createdAtMs(userData)');
    expect(fn).not.toMatch(/select\([^)]*created_at/);
    expect(fn).not.toMatch(/\.(gte|lte|gt|lt)\('created_at'[^)]*\)\s*\n?\s*\.(?:not|range)/);   // no users.created_at filter
  });

  it('takes people who signed up 24 to 72 hours ago, never under 12', () => {
    expect(mod.NEW_MIN_AGE_HOURS).toBe(24);
    expect(mod.NEW_MAX_AGE_HOURS).toBe(72);
    expect(mod.NEW_MIN_HOURS_AFTER_SIGNUP).toBe(12);
    const at = (h) => mod.signupWindowSkip(NOW - h * H, NOW);
    expect(at(1)).toBe('too_new');
    expect(at(11.9)).toBe('too_new');
    expect(at(23.9)).toBe('too_new');
    expect(at(24)).toBeNull();
    expect(at(48)).toBeNull();
    expect(at(72)).toBeNull();
    expect(at(72.1)).toBe('too_old');
    expect(at(400)).toBe('too_old');
    expect(mod.signupWindowSkip(0, NOW)).toBe('no_created_at');
    // The 12-hour floor holds on its own, even under a window that starts at 0.
    const loose = { minAge: 0, maxAge: 72, floor: mod.NEW_MIN_HOURS_AFTER_SIGNUP };
    expect(mod.signupWindowSkip(NOW - 11 * H, NOW, loose)).toBe('too_new');
    expect(mod.signupWindowSkip(NOW - 13 * H, NOW, loose)).toBeNull();
    // The window replaces the backlog's activity test in this mode only.
    expect(fn).toContain("if (mode === 'new') {\n        const why = signupWindowSkip(createdMs, nowMs)");
    expect(fn).toContain("} else if (lastActive < activeSince) { skip('inactive'); continue }");
  });

  it('keeps every other audience rule for the new mode', () => {
    // The shared checks sit before the mode branch, so both modes run them.
    const loop = between(fn, 'for (const row of (rows || []))', 'audience.push(');
    const branch = loop.indexOf("if (mode === 'new')");
    for (const check of ["skip('no_email')", "skip('internal')", "skip('founder_mailed')", "skip('opted_out')", "skip('goal_on_record')"]) {
      expect(loop.indexOf(check), check).toBeGreaterThan(-1);
      expect(loop.indexOf(check), check).toBeLessThan(branch);
    }
    // And the once-ever and quiet checks after it, outside it.
    const after = loop.slice(loop.indexOf("} else if (lastActive < activeSince)"));
    expect(after).toContain("(lifetime.get(username) || 0) >= MAX_LIFETIME_SENDS) { skip('already_sent')");
    expect(after).toContain("if (userData.goalNoteAt) { skip('already_sent')");
    expect(after).toContain("if (recentlyMailed.has(username)) { skip('quiet_window')");
    // Each shared check is the whole condition, not one a mode test can
    // narrow (A1, 2026-11-22: `if (mode !== 'new' && …)` in front of the
    // internal or the lifetime check passed every guard above).
    expect(loop).toContain("if (isInternalAccount(username, email)) { skip('internal'); continue }");
    expect(after).toContain("if ((lifetime.get(username) || 0) >= MAX_LIFETIME_SENDS) { skip('already_sent'); continue }");
    expect(after).toContain("if (userData.goalNoteAt) { skip('already_sent'); continue }");
    // The loop reads `mode` exactly once: the sign-up window branch.
    expect((loop.match(/\bmode\b/g) || []).length).toBe(1);
  });

  it('is once per person ever across both modes', () => {
    // One template for both modes, and the lifetime read never filters by mode.
    const lifetimeQuery = between(fn, "const already = await fetchAllRows(", 'const lifetime');
    expect(lifetimeQuery).toContain(".eq('template', TEMPLATE)");
    expect(lifetimeQuery).not.toMatch(/mode/);
    expect(fn).not.toMatch(/TEMPLATE\s*=\s*mode|template:\s*mode|`goal_note_\$\{mode/);
    expect(fn).toContain('template: TEMPLATE, subject, html');
    // The row stamp is written by every send, whatever the mode.
    expect(fn).toContain('goalNoteAt: new Date().toISOString()');
  });

  it('sends at 09:xx-10:xx local from the stamped zone, else on the 14:xx UTC run', () => {
    expect(mod.SEND_LOCAL_HOURS).toEqual([9, 10]);
    expect(mod.FALLBACK_UTC_HOUR).toBe(14);
    // Istanbul is UTC+3.
    expect(mod.sendWindow('Europe/Istanbul', new Date('2026-11-22T06:30:00Z'))).toEqual({ tz: 'Europe/Istanbul', hour: 9, due: true });
    expect(mod.sendWindow('Europe/Istanbul', new Date('2026-11-22T07:59:00Z')).due).toBe(true);
    expect(mod.sendWindow('Europe/Istanbul', new Date('2026-11-22T08:00:00Z')).due).toBe(false);   // 11:00
    expect(mod.sendWindow('Europe/Istanbul', new Date('2026-11-22T05:59:00Z')).due).toBe(false);   // 08:59
    // Los Angeles in November is UTC-8; India is UTC+5:30.
    expect(mod.sendWindow('America/Los_Angeles', new Date('2026-11-22T17:15:00Z'))).toEqual({ tz: 'America/Los_Angeles', hour: 9, due: true });
    expect(mod.sendWindow('Asia/Kolkata', new Date('2026-11-22T04:00:00Z'))).toEqual({ tz: 'Asia/Kolkata', hour: 9, due: true });
    expect(mod.sendWindow('Asia/Kolkata', new Date('2026-11-22T14:00:00Z')).due).toBe(false);   // 19:30 there
    // No zone, or one Intl rejects: 14:xx UTC only.
    expect(mod.sendWindow(null, new Date('2026-11-22T14:20:00Z'))).toEqual({ tz: null, hour: 14, due: true });
    expect(mod.sendWindow(null, new Date('2026-11-22T13:59:00Z')).due).toBe(false);
    expect(mod.sendWindow(null, new Date('2026-11-22T09:30:00Z')).due).toBe(false);
    expect(mod.sendWindow('Not/AZone', new Date('2026-11-22T14:05:00Z'))).toEqual({ tz: null, hour: 14, due: true });
    // The zone comes from the person's own activation events (streak-reminder's method).
    expect(fn).toContain(".eq('reason', 'activation_funnel')");
    expect(fn).toContain(".in('username', audience.map(c => c.username))");
    expect(fn).toContain("due = audience.filter(c => c.due)");
    expect(fn).toContain('const batch = due.slice(0, cap)');
  });

  it('reads every row past the PostgREST cap: users, past sends, the quiet window, the zones (A1, 2026-11-22)', async () => {
    // A fake server that holds `total` rows and answers at most `cap` per call,
    // whatever range is asked, as PostgREST's max-rows does.
    const server = (total, cap) => {
      const calls = [];
      const page = async (from, to) => {
        calls.push([from, to]);
        const end = Math.min(to + 1, from + cap, total);
        return { data: Array.from({ length: Math.max(0, end - from) }, (_, i) => ({ n: from + i })), error: null };
      };
      return { page, calls };
    };
    for (const [total, cap] of [[2345, 1000], [2345, 500], [999, 1000], [1000, 1000], [0, 1000]]) {
      const { page } = server(total, cap);
      const rows = await mod.fetchAllRows(page);
      expect(rows.length, `${total}/${cap}`).toBe(total);
      expect(new Set(rows.map(r => r.n)).size).toBe(total);   // no row twice
    }
    // An error stops the run: a sender that cannot see past sends must not send.
    await expect(mod.fetchAllRows(async () => ({ data: null, error: new Error('boom') }))).rejects.toThrow('boom');
    // Every list read goes through it, in a stable order; no single capped read is left.
    expect(fn).toMatch(/const rows = await fetchAllRows\(\(from, to\) => supabase\s*\.from\('users'\)[\s\S]*?\.order\('username', \{ ascending: true \}\)\s*\.range\(from, to\)\)/);
    // Each read checked inside its own statement, so one read's order cannot vouch for another's.
    const stmt = (start) => between(fn, start, '.range(from, to))') + '.range(from, to))';
    expect(stmt('const already = await fetchAllRows(')).toContain(".order('id', { ascending: true })");
    expect(stmt('const recent = await fetchAllRows(')).toContain(".order('id', { ascending: true })");
    expect(stmt('const evRows = await fetchAllRows(')).toContain(".order('created_at', { ascending: false })");
    expect(fn).not.toMatch(/\.range\(0, \d+\)|\.limit\(\d+\)/);
    expect(fn).not.toMatch(/const \{ data: (rows|already|recent|evRows)/);
  });

  it('caps the new mode at 20 a run and keeps 60 for the backlog; ?limit= only lowers', () => {
    expect(mod.MAX_PER_RUN).toBe(60);
    expect(mod.MAX_PER_RUN_NEW).toBe(20);
    expect(fn).toContain('Number.isFinite(limitParam) && limitParam > 0 ? Math.min(runMax, Math.floor(limitParam)) : runMax');
  });

  it('names the founder in every subject, three phrasings by hash', () => {
    expect(mod.SUBJECTS_NEW).toHaveLength(3);
    for (const s of mod.SUBJECTS_NEW) {
      expect(s).toMatch(/founder|I build SQL Quest|person who builds SQL Quest/i);
      priceFree(s);
    }
    const seen = new Set(Array.from({ length: 40 }, (_, i) => mod.subjectForNew(`user${i}`)));
    expect(seen.size).toBe(3);
    expect(mod.subjectForNew('alice')).toBe(mod.subjectForNew('alice'));   // deterministic: the dry run previews the send
  });

  it('two body wordings that differ, and no two bodies in a batch are identical', () => {
    const args = { username: 'alice', solves: 4, company: null };
    const a = mod.renderNewBody({ ...args, variant: 'A' });
    const b = mod.renderNewBody({ ...args, variant: 'B' });
    expect(a).not.toBe(b);
    // Not one shared paragraph between the variants except greeting, links and sign-off.
    const paras = (html) => [...html.matchAll(/<p style="[^"]*">([\s\S]*?)<\/p>/g)].map(m => m[1]);
    const shared = paras(a).filter(p => paras(b).includes(p));
    expect(shared.every(p => /^Hi alice,$|goal_note&goal=|Göktuğ/.test(p)), shared.join('\n')).toBe(true);
    const batch = ['ana', 'ben', 'cem', 'dia', 'eli', 'fay', 'gus', 'hal'].map(u =>
      mod.renderNewBody({ username: u, solves: 3, company: null, variant: mod.variantFor(u) }));
    expect(new Set(batch).size).toBe(batch.length);
  });

  it('never claims to be typed by hand: a cron sends it (orchestrator rule, 2026-11-22)', () => {
    const HAND = /writing this myself|by hand|one at a time|writing to each of you|I(?:'m| am) writing (?:this|to you)/i;
    for (const v of ['A', 'B']) {
      for (const company of [null, 'Stripe']) {
        for (const solves of [0, 1, 6]) {
          const html = mod.renderNewBody({ username: 'alice', solves, company, variant: v });
          expect(html, `${v}/${company}/${solves}`).not.toMatch(HAND);
          // 24 to 72 hours can cross a Monday: "this week" would be false (A1, 2026-11-22).
          expect(html, `${v}/${company}/${solves}`).not.toMatch(/this week/i);
        }
      }
    }
    for (const s of mod.SUBJECTS_NEW) expect(s).not.toMatch(HAND);
    // The true claims it makes instead: replies reach the founder's own inbox.
    expect(fn).toContain("const REPLY_TO = 'goktug@datrick.com'");
    expect(fn).toContain('replyTo: REPLY_TO');
  });

  it('keeps the voice: the founder set it up, replies reach the founder inbox, one question, the reply line, no sequence, signed', () => {
    for (const v of ['A', 'B']) {
      const html = mod.renderNewBody({ username: 'alice', solves: 2, company: null, variant: v });
      expect(html).toMatch(/I set this up so I can ask every new person one question|I wanted every new person to get one question from me/);
      expect(html).toMatch(/comes to my own inbox|land in my own inbox/);
      expect((html.match(/\?<\/strong>/g) || []).length).toBe(1);   // one question
      expect(html).toContain("If it's an interview, reply with the company and the date. I read every reply.");
      expect(html).toContain("I won't send another one of these.");
      expect(html).toContain('Göktuğ<br><span style="color:#6b7280;">Founder, SQL Quest</span>');
    }
  });

  it('three one-click answers carrying src=goal_note and m=new', () => {
    const html = mod.renderNewBody({ username: 'alice', solves: 0, company: null, variant: 'A' });
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
    expect(hrefs).toEqual([
      'https://sqlquest.app/app/?src=goal_note&goal=interview&m=new&utm_source=email&utm_campaign=goal_note',
      'https://sqlquest.app/app/?src=goal_note&goal=job_ready&m=new&utm_source=email&utm_campaign=goal_note',
      'https://sqlquest.app/app/?src=goal_note&goal=learning&m=new&utm_source=email&utm_campaign=goal_note',
    ]);
    // The backlog letter's links are unchanged: no m=new.
    const old = mod.renderBody({ username: 'alice', solves: 0, variant: 'A' });
    expect(old).toContain('/app/?src=goal_note&goal=interview&utm_source=email');
    expect(old).not.toContain('m=new');
  });

  it('one specific fact: the company page they came through, else the solve count, else nothing', () => {
    const withCo = mod.renderNewBody({ username: 'a', solves: 5, company: 'Capital One', variant: 'A' });
    expect(withCo).toContain('You came in through our Capital One page');
    expect(withCo).not.toContain('You have solved');
    const withSolves = mod.renderNewBody({ username: 'a', solves: 5, company: null, variant: 'B' });
    expect(withSolves).toContain('You have solved 5 challenges since you joined');
    const one = mod.renderNewBody({ username: 'a', solves: 1, company: null, variant: 'B' });
    expect(one).toContain('You have solved 1 challenge since');
    const none = mod.renderNewBody({ username: 'a', solves: 0, company: null, variant: 'A' });
    expect(none).not.toMatch(/came in through|You have solved/);
  });

  it('takes the company from arrivalSrc only when it is a plain name (it is visitor text)', () => {
    expect(mod.companyFromArrival('company:Capital One')).toBe('Capital One');
    expect(mod.companyFromArrival('company:JPMorgan')).toBe('JPMorgan');
    expect(mod.companyFromArrival("company:McDonald's")).toBe("McDonald's");
    expect(mod.companyFromArrival('company:<img src=x onerror=alert(1)>')).toBeNull();
    expect(mod.companyFromArrival('company:"><a href="https://evil">')).toBeNull();
    expect(mod.companyFromArrival('company:')).toBeNull();
    expect(mod.companyFromArrival('company:' + 'x'.repeat(41))).toBeNull();
    expect(mod.companyFromArrival('ref:google.com')).toBeNull();
    expect(mod.companyFromArrival('home')).toBeNull();
    expect(mod.companyFromArrival(null)).toBeNull();
  });

  it('no pitch: no price, nothing about the paid plan, in any subject or body', () => {
    for (const v of ['A', 'B']) {
      for (const company of [null, 'Stripe']) {
        const html = mod.renderNewBody({ username: 'alice', solves: 7, company, variant: v });
        priceFree(html);
      }
    }
    priceFree(fn);
  });

  it('logs the sent row with resend_id and meta {mode, variant, solves}, and goal_note_sent {mode}', () => {
    expect(fn).toContain("event: ok ? 'sent' : 'send_failed', resend_id: resendId");
    expect(fn).toContain('meta: { mode, variant: c.variant, solves: c.solves }');
    expect(fn).toContain("event: 'goal_note_sent'");
    expect(fn).toContain('metadata: { mode, solves: c.solves, variant: c.variant }');
  });

  it('the dry run renders both variants for the first candidate and lists the audience with skip reasons', () => {
    const dryBlock = between(fn, 'if (dry) {', 'let sent = 0');
    expect(dryBlock).toContain('skipped: skips');
    expect(dryBlock).toContain('preview: audience.map(');
    expect(dryBlock).toContain("dueNow: c.due");
    expect(dryBlock).toContain("A: bodyOf(first, 'A')");
    expect(dryBlock).toContain("B: bodyOf(first, 'B')");
    expect(dryBlock).not.toMatch(/sendAndLog|\.insert\(|\.update\(/);   // a dry run writes nothing
    expect(fn).toContain('skips.not_send_hour = notDue');
  });

  it('the service-role gate is unchanged and still first', () => {
    expect(fn.indexOf('service role required')).toBeLessThan(fn.indexOf("searchParams.get('mode')"));
    expect(fn).toContain("const accepted = [senderSecret, serviceKey].filter(s => s.length >= 32).map(s => `Bearer ${s}`)");
  });
});

describe('the goal-note date ask in the app (flag goalNoteDateAsk, dark)', () => {
  const flags = fs.readFileSync(join(ROOT, 'src/data/feature-flags.js'), 'utf8');

  it('ships dark', () => {
    expect(flags).toMatch(/\n\s+goalNoteDateAsk: false,/);
  });

  it('arms only behind the flag, only on the email\'s goal=interview answer, only with no date', () => {
    const base = { flagOn: true, src: 'goal_note', goal: 'interview', recordedIntent: 'interview', prepDate: null };
    expect(shouldArmGoalNoteDateAsk(base)).toBe(true);
    expect(shouldArmGoalNoteDateAsk({ ...base, flagOn: false })).toBe(false);
    expect(shouldArmGoalNoteDateAsk({ ...base, flagOn: undefined })).toBe(false);
    expect(shouldArmGoalNoteDateAsk({ ...base, goal: 'job_ready', recordedIntent: 'job_ready' })).toBe(false);
    expect(shouldArmGoalNoteDateAsk({ ...base, goal: 'learning', recordedIntent: 'learning' })).toBe(false);
    expect(shouldArmGoalNoteDateAsk({ ...base, recordedIntent: 'learning' })).toBe(false);   // a declared goal stands
    // An earlier interview goal on record does not turn another answer into one.
    expect(shouldArmGoalNoteDateAsk({ ...base, goal: 'learning' })).toBe(false);
    expect(shouldArmGoalNoteDateAsk({ ...base, goal: 'job_ready' })).toBe(false);
    expect(shouldArmGoalNoteDateAsk({ ...base, src: 'digest_goal' })).toBe(false);
    expect(shouldArmGoalNoteDateAsk({ ...base, src: null })).toBe(false);
    expect(shouldArmGoalNoteDateAsk({ ...base, prepDate: '2026-12-01' })).toBe(false);
    expect(shouldArmGoalNoteDateAsk()).toBe(false);
  });

  it('renders only while armed, with no date, behind the flag, never over the intake', () => {
    const base = { flagOn: true, armed: true, prepDate: null, intakeOpen: false };
    expect(shouldRenderGoalNoteDateAsk(base)).toBe(true);
    expect(shouldRenderGoalNoteDateAsk({ ...base, flagOn: false })).toBe(false);
    expect(shouldRenderGoalNoteDateAsk({ ...base, armed: false })).toBe(false);
    expect(shouldRenderGoalNoteDateAsk({ ...base, prepDate: '2026-12-01' })).toBe(false);
    expect(shouldRenderGoalNoteDateAsk({ ...base, intakeOpen: true })).toBe(false);
  });

  it('is wired in app.jsx: armed in the ?goal= hook after the goal is recorded, inline, through the intake date writer', () => {
    // Armed inside the link hook, after the intent is recorded, from the flag.
    const hook = between(app, "const goalId = intakeGoalForIntent(params.get('goal'));", 'linkGoalRef.current = {');
    expect(hook.indexOf("setUserIntent(g.intent, 'link')")).toBeLessThan(hook.indexOf('shouldArmGoalNoteDateAsk('));
    expect(hook).toContain("flagOn: window.FF?.feature?.('goalNoteDateAsk') === true, src, goal: g.intent, recordedIntent: intent, prepDate: prepTarget.date");
    // The arrival event carries the email's mode.
    expect(hook).toContain("m: params.get('m') || null");
    // Rendered only through the visibility helper, inline (no overlay), and
    // the date goes through the same writer the intake's date step feeds.
    expect(app).toContain("flagOn: window.FF?.feature?.('goalNoteDateAsk') === true,\n    armed: !!goalNoteDateAsk,");
    const render = between(app, '{goalNoteDateAskVisible && (() => {', '})()}');
    expect(render).toContain('data-testid="goal-note-date-ask"');
    expect(render).toContain('type="date"');
    expect(render).toContain('data-testid="goal-note-date-skip"');
    expect(render).not.toMatch(/fixed|inset-0|z-50|role="dialog"/);
    expect(render).not.toContain('#FFE34D');   // a form control, not a CTA (DESIGN.md)
    expect(app).toContain('setPrepPreference({ date: goalNoteDateInput });');
    expect(app).toContain("trackActivationEvent('goal_note_date_set', { m: goalNoteDateAsk?.m || null, daysOut: daysUntil(goalNoteDateInput, Date.now()) });");
    // The hooks sit above the early returns (CLAUDE.md, fragile area 1).
    expect(app.indexOf('const goalNoteDateAskShownRef = useRef(false);')).toBeLessThan(app.indexOf('  if (showAuth) {'));
  });
});
