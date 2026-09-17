import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'supabase/functions/prep-plan-note');
const read = (f) => fs.readFileSync(join(DIR, f), 'utf8');
const fn = read('index.ts');
const plan = read('plan.ts');
const all = fn + '\n' + plan;
const app = fs.readFileSync(join(ROOT, 'src/app.jsx'), 'utf8');

// Interview-first point 3 (docs/plans/interview-first-2026-09-17.md): "the
// plan follows the person out of the app." The sender runs on Deno, is not
// scheduled and is founder-triggered, so the guards live here as source
// checks: the seven audience conditions, the caps, the voice rule (founder in
// the subject, written by hand to a short list, signed), no price and no
// pitch, and — the one that matters most — that the three items come from
// `planToDate` in src/utils/interview-prep.js and not from a second planner.
describe('prep-plan-note: the plan follows the person out of the app', () => {
  it('exists as an edge function with a pure plan half', () => {
    expect(fs.existsSync(join(DIR, 'index.ts'))).toBe(true);
    expect(fs.existsSync(join(DIR, 'plan.ts'))).toBe(true);
    expect(fs.existsSync(join(DIR, 'globals.ts'))).toBe(true);
    expect(fn).toContain("const TEMPLATE = 'prep_plan_note'");
    expect(fn).toContain('Deno.serve(');
  });

  it('names all seven audience conditions in the filter', () => {
    // 1. registered — guests have no row and no channel
    expect(fn).toContain(".not('username', 'like', 'guest_%')");
    // 2. not internal — the broad inlined block, elena included
    expect(fn).toContain('isInternalAccount(username, email)');
    expect(fn).toContain("u === 'elena'");
    expect(fn).toContain("e.endsWith('@datrick.com')");
    // 3. not opted out
    expect(fn).toContain('userData.emailOptOut === true');
    // 4. an email address
    expect(fn).toContain("email.includes('@')");
    // 5. a date in the future and at most 45 days out, in the app's own frame
    expect(plan).toMatch(/const MAX_DAYS_OUT = 45\b/);
    expect(plan).toContain('daysOut < 1 || daysOut > MAX_DAYS_OUT');
    expect(plan).toContain('daysUntil(date, now)');
    expect(fn).toContain("typeof userData?.prepTarget?.date !== 'string'");
    // 6. spacing and a lifetime ceiling on THIS template
    expect(fn).toMatch(/const SPACING_DAYS = 2\b/);
    expect(fn).toMatch(/const MAX_LIFETIME_SENDS = 5\b/);
    expect(fn).toContain('recentlyNoted.has(username)');
    expect(fn).toContain('>= MAX_LIFETIME_SENDS');
    expect(fn).toContain(".eq('template', TEMPLATE)");
    // 7. quiet if any OTHER campaign mailed them in the last 24h
    expect(fn).toMatch(/const QUIET_HOURS = 24\b/);
    expect(fn).toContain(".neq('template', TEMPLATE)");
    expect(fn).toContain('recentlyMailed.has(username)');
  });

  it('drains in a small batch, soonest date first, and has a dry run that sends nothing', () => {
    const cap = Number(/const MAX_PER_RUN = (\d+)/.exec(fn)[1]);
    expect(cap).toBeLessThanOrEqual(40);
    expect(fn).toContain('a.note.daysOut - b.note.daysOut');
    expect(fn).toContain("searchParams.get('dry') === '1'");
    // The dry branch returns before the send loop is reached.
    expect(fn.indexOf('if (dry) {')).toBeGreaterThan(0);
    expect(fn.indexOf('if (dry) {')).toBeLessThan(fn.indexOf('await sendAndLog('));
  });

  it('keeps the email voice rule: founder in every subject, written by hand, signed', () => {
    const subjectBlock = fn.slice(fn.indexOf('const SUBJECTS = ['), fn.indexOf('const pick = '));
    const subjects = [...subjectBlock.matchAll(/`([^`]*)`/g)].map(m => m[1]).filter(s => /SQL Quest/.test(s));
    expect(subjects.length).toBe(2);
    for (const s of subjects) expect(s).toMatch(/founder|I build SQL Quest/);
    expect(subjects.some(s => s.startsWith("From SQL Quest's founder —"))).toBe(true);
    expect(subjects.some(s => s.startsWith('I build SQL Quest —'))).toBe(true);
    expect(fn).toMatch(/writing this myself|written by hand/);
    expect(fn).toContain('couple of dozen');
    expect(fn).toContain('Founder, SQL Quest');
    expect(fn).toContain("const REPLY_TO = 'goktug@datrick.com'");
    expect(fn).toContain("const FROM = 'Göktuğ at SQL Quest <noreply@sqlquest.app>'");
  });

  it('carries no price, no pitch, no "unlimited" — Pro appears only as "(Pro)" after a locked item', () => {
    expect(all).not.toMatch(/\$\d/);
    expect(all).not.toMatch(/\$29|\$49|\$99|\$199/);
    expect(all).not.toMatch(/unlimited/i);
    expect(fn).toContain("it.pro ? ' (Pro)' : ''");
    // Inside the rendered email (item line + body), the bare word never appears.
    const body = fn.slice(fn.indexOf('const itemLine'), fn.indexOf('Deno.serve('));
    expect(body.replace(/\(Pro\)/g, '')).not.toMatch(/\bPro\b/);
    expect(body).not.toMatch(/upgrade|checkout|pro=1/i);
  });

  it('reuses planToDate and daysUntil from src/utils/interview-prep.js — never a second planner', () => {
    expect(plan).toMatch(/import \{[^}]*\bplanToDate\b[^}]*\} from '\.\.\/\.\.\/\.\.\/src\/utils\/interview-prep\.js'/s);
    expect(plan).toMatch(/import \{[^}]*\bdaysUntil\b[^}]*\} from '\.\.\/\.\.\/\.\.\/src\/utils\/interview-prep\.js'/s);
    expect(plan).toContain('planToDate({');
    expect(plan).toContain('findTarget(');
    // No local function whose name carries "plan", and no local daysUntil.
    expect(all).not.toMatch(/function\s+\w*[pP]lan\w*\s*\(/);
    expect(all).not.toMatch(/(?:const|let|var)\s+\w*[pP]lan\w*\s*=\s*(?:async\s*)?(?:\(|function)/);
    expect(all).not.toMatch(/function\s+daysUntil|const\s+daysUntil\s*=/);
    // The bank is the live one, sector challenges appended, as the app loads it.
    expect(plan).toContain("import '../../../src/data/challenges.js'");
    expect(plan).toContain("import '../../../src/data/sector-challenges.js'");
    expect(plan).toContain("import '../../../src/data/challenge-companies.js'");
    expect(plan).toContain("import '../../../src/data/mock-interviews.js'");
    // and `window` exists before those evaluate.
    expect(plan.indexOf("import './globals.ts'")).toBeLessThan(plan.indexOf("import '../../../src/data/challenges.js'"));
  });

  it('mirrors the app: the lock rule, and deep links the app already handles', () => {
    expect(plan).toContain("c.difficulty === 'Hard' && c.freePreview !== true");
    expect(plan).toContain('m.isFree !== true');
    expect(app).toContain("case 'challenge': return item?.difficulty === 'Hard' && !item?.freePreview;");
    expect(app).toContain("case 'interview': return !item?.isFree;");
    expect(plan).toContain('/app/?src=prep_note&challenge=');
    expect(plan).toContain('/app/?src=prep_note&interview=');
    expect(app).toContain("urlParams.get('challenge')");
    expect(app).toContain("urlParams.get('interview')");
    expect(fn).toContain('utm(it.path, TEMPLATE)');
  });

  it('logs a sent row with the resend_id and a prep_note_sent product event', () => {
    expect(fn).toContain("from('email_events').insert({");
    expect(fn).toContain('resend_id: resendId');
    expect(fn).toContain("event: ok ? 'sent' : 'send_failed'");
    expect(fn).toContain("from('pro_events').insert({");
    expect(fn).toContain("event: 'prep_note_sent'");
    expect(fn).toContain("reason: 'email'");
    for (const k of ['company: c.note.company', 'daysOut: c.note.daysOut', 'items: c.note.items.length', 'proItems: c.note.proItems']) {
      expect(fn).toContain(k);
    }
  });

  it('is not scheduled anywhere — sending is the founder\'s decision', () => {
    expect(fn).toContain('NOT SCHEDULED');
    const migrations = fs.readdirSync(join(ROOT, 'supabase/migrations')).filter(f => f.endsWith('.sql'));
    for (const m of migrations) {
      expect(fs.readFileSync(join(ROOT, 'supabase/migrations', m), 'utf8')).not.toContain('prep-plan-note');
    }
    const cfg = fs.readFileSync(join(ROOT, 'supabase/config.toml'), 'utf8');
    expect(cfg).not.toContain('prep-plan-note');
  });
});

// 2026-09-17: the stages moved out of app.jsx into src/data/roadmap-stages.js
// so the note's plan sorts by the SAME curriculum order the app's card does.
// An empty map fell to difficulty-then-id, which can hand out challenge 1.
describe('prep-plan-note: the plan sorts by the app\'s curriculum order', () => {
  it('imports SQL_ROADMAP_CHALLENGE_ORDER from src/data/roadmap-stages.js and passes it', () => {
    expect(plan).toContain("import { SQL_ROADMAP_CHALLENGE_ORDER } from '../../../src/data/roadmap-stages.js'");
    expect(plan).toContain('curriculumOrder: SQL_ROADMAP_CHALLENGE_ORDER,');
    expect(plan, 'the empty map is back').not.toContain('curriculumOrder: new Map()');
    expect(fs.existsSync(join(ROOT, 'src/data/roadmap-stages.js'))).toBe(true);
    expect(app).toContain("import { SQL_ROADMAP_STAGES, SQL_ROADMAP_CHALLENGE_ORDER } from './data/roadmap-stages.js';");
    expect(app, 'app.jsx still defines its own copy of the stages').not.toContain('const SQL_ROADMAP_STAGES = [');
  });
});
