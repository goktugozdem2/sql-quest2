import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FN_PATH = join(ROOT, 'supabase/functions/interview-outcome-note/index.ts');
const fn = fs.readFileSync(FN_PATH, 'utf8');
const app = fs.readFileSync(join(ROOT, 'src/app.jsx'), 'utf8');

// The one question after the date (2026-09-19): once per date, to a person
// whose prepTarget.date has passed, how did it go — three links, a reply for
// anything else. The sender runs on Deno and is founder-triggered, so the
// guards live here as source checks; the date arithmetic is executed.
const between = (src, start, end) => src.slice(src.indexOf(start), src.indexOf(end, src.indexOf(start)));

describe('interview-outcome-note: the one question after the date', () => {
  it('exists, is not scheduled, and reads the dry-run and limit switches', () => {
    expect(fs.existsSync(FN_PATH)).toBe(true);
    expect(fn).toMatch(/NOT scheduled/);
    expect(fn).toContain("searchParams.get('dry') === '1'");
    expect(fn).toContain('Math.min(MAX_PER_RUN, Math.floor(limitParam))');
    expect(fs.readdirSync(join(ROOT, 'supabase/functions/interview-outcome-note'))).toEqual(['index.ts']);
  });

  it('names all eight audience conditions', () => {
    expect(fn).toContain(".not('username', 'like', 'guest_%')");                 // 1 registered
    expect(fn).toContain("if (!email || !email.includes('@'))");                 // 2 email
    expect(fn).toContain('isInternalAccount(username, email)');                  // 3 internal
    expect(fn).toContain("e.endsWith('@datrick.com')");
    expect(fn).toContain('userData.emailOptOut === true');                       // 4 opted out
    expect(fn).toMatch(/const MIN_DAYS_AFTER = 1\b/);                            // 5 the window
    expect(fn).toMatch(/const MAX_DAYS_AFTER = 14\b/);
    expect(fn).toContain("skip('date_not_passed')");
    expect(fn).toContain("skip('date_too_old')");
    expect(fn).toContain("if (target.outcome) { skip('outcome_recorded')");      // 6 answered
    expect(fn).toContain('userData.outcomeNoteFor === date');                    // 7 once per date
    expect(fn).toContain('askedFor.has(`${username}|${date}`)');
    expect(fn).toMatch(/const QUIET_HOURS = 24\b/);                              // 8 quiet
    expect(fn).toContain('recentlyMailed.has(username)');
    expect(fn).toMatch(/const MAX_PER_RUN = 20\b/);
    expect(fn).toMatch(/const TEMPLATE = 'interview_outcome_note'/);
  });

  it('counts calendar days since the date in the UTC frame, and rejects bad dates', () => {
    const src = between(fn, 'export const daysSince = ', '\n}\n') + '\n}';
    const daysSince = new Function(`${src.replace('export const', 'const').replace('(isoDate: unknown, now: number): number | null', '(isoDate, now)')}; return daysSince;`)();
    const now = Date.UTC(2026, 8, 19, 9, 0, 0);   // 2026-09-19 09:00Z
    expect(daysSince('2026-09-18', now)).toBe(1);
    expect(daysSince('2026-09-19', now)).toBe(0);
    expect(daysSince('2026-09-20', now)).toBe(-1);
    expect(daysSince('2026-09-05', now)).toBe(14);
    expect(daysSince('2026-02-31', now)).toBe(null);   // rolled over
    expect(daysSince('19/09/2026', now)).toBe(null);
    expect(daysSince(null, now)).toBe(null);
  });

  it('keeps the email voice rule: founder in every subject, by hash', () => {
    expect(fn).toContain("From SQL Quest's founder — how did the ${company ? `${company} screen` : 'interview'} go?");
    expect(fn).toContain("SQL Quest's founder here — one question, now that the date has passed");
    expect(fn).toContain('SUBJECTS[hash(username) % SUBJECTS.length]');
    expect(fn).toContain("const REPLY_TO = 'goktug@datrick.com'");
    expect(fn).toContain('replyTo: REPLY_TO');
    expect((fn.match(/Founder, SQL Quest/g) || []).length).toBe(1);
  });

  it('asks one question with exactly three outcome links the app records', () => {
    expect(fn).toContain("outcomeLink('passed', 'It went well')");
    expect(fn).toContain("outcomeLink('failed', 'Not this time')");
    expect(fn).toContain("outcomeLink('moved', 'It moved or has not happened')");
    expect(fn).toContain('utm(`/app/?src=outcome_note&outcome=${outcome}`, TEMPLATE)');
    expect((fn.match(/outcomeLink\('/g) || []).length).toBe(3);
    expect((fn.match(/How did it go\?/g) || []).length).toBe(2);   // once per wording
    // The app's door: records the click, takes the past date off, never the date in the event.
    expect(app).toContain("const outcome = params.get('outcome')");
    expect(app).toContain("if (!['passed', 'failed', 'moved'].includes(outcome)) return;");
    expect(app).toContain("trackActivationEvent('interview_outcome', {");
    expect(app).toContain("setPrepPreference({ date: null, outcome: { value: outcome, at: new Date().toISOString() } })");
    const door = between(app, "trackActivationEvent('interview_outcome', {", '});');
    expect(door).not.toMatch(/date:/);
    expect(door).toContain('daysSince:');
  });

  it('two wordings, never byte-identical, each promising no second note about this date', () => {
    expect(fn).toContain("const VARIANTS = ['A', 'B'] as const");
    expect(fn).toContain('hash(`${username}:body`)');
    const a = between(fn, "variant === 'A'\n    ? `", '`\n    : `');
    const b = between(fn, "`\n    : `", '`\n  return');
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(200);
    expect(b.length).toBeGreaterThan(200);
    expect(fn).toContain("I won't send another one of these about this date.");
    expect(fn).toContain('You will not get a second one of these about this date.');
  });

  it('no pitch: nothing about the paid plan, no price', () => {
    expect(fn).not.toMatch(/\bPro\b/);
    expect(fn).not.toMatch(/unlimited/i);
    expect(fn).not.toMatch(/\$\s?\d/);
    expect(fn).not.toMatch(/\/mo\b|a month|a year|checkout|upgrade/i);
  });

  it('logs the sent row with resend_id and the product-side event without the date', () => {
    expect(fn).toContain("event: ok ? 'sent' : 'send_failed', resend_id: resendId");
    expect(fn).toContain('meta: { company: c.note.company, date: c.note.date, daysSince: c.note.daysSince, variant: c.variant }');
    expect(fn).toContain("event: 'outcome_note_sent'");
    expect(fn).toContain("reason: 'email'");
    expect(fn).toContain('metadata: { company: c.note.company, daysSince: c.note.daysSince, variant: c.variant }');
    expect(fn).toContain('outcomeNoteFor: c.note.date');
  });

  it('only the service role may call it — the anon key is public (2026-09-17)', () => {
    expect(fn).toContain('service role required');
    expect(fn).toContain('!accepted.includes(given)');
    expect(fn.indexOf('service role required')).toBeLessThan(fn.indexOf('createClient('));
  });
});
