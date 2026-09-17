import { describe, it, expect } from 'vitest';
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
    expect(fn).toContain('Math.min(MAX_PER_RUN, Math.floor(limitParam))');   // limit only lowers the cap
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
    expect(fn).toContain('audience.slice(0, cap)');
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
    expect(fn).toContain("goalLink('interview', 'An interview')");
    expect(fn).toContain("goalLink('job_ready', 'Getting job-ready')");
    expect(fn).toContain("goalLink('learning', 'SQL in general')");
    expect(fn).toContain('utm(`/app/?src=goal_note&goal=${goal}`, TEMPLATE)');
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
    expect((fn.match(/Founder, SQL Quest/g) || []).length).toBe(1);   // one sign-off, shared by both variants
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
    expect(fn).toContain('meta: { solves: c.solves, variant: c.variant }');
    expect(fn).toContain("event: 'goal_note_sent'");
    expect(fn).toContain("reason: 'email'");
    expect(fn).toContain('metadata: { solves: c.solves, variant: c.variant }');
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
