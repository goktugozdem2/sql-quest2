// First 90 Days (2026-10-04): the post-hire status and ticket exercises.
// Pins: every ticket's expected figures are recomputed from the dataset by
// its reference query (a data change that moves a figure fails here); the
// grader's tolerance rule; the classic wrong answer to the risk-tier ticket
// (join fan-out) fails; a table dump fails; feedback never leaks a value; the
// status and the lock; no reference query reaches the bundle's UI; and the
// new hooks sit above the component's early returns.
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import Database from 'better-sqlite3';
import { TICKETS, TICKET_MAX_ROWS, TICKET_DATASETS } from '../src/data/tickets.js';
import { gradeTicket, ticketFeedback, numberMatches, textMatches } from '../src/utils/ticket-grade.js';
import { isHired, ticketLocked, shouldAskOffer, FREE_TICKETS, HIRED_INTENT } from '../src/utils/post-hire.js';
import { HIRING_INTENTS } from '../src/utils/interview-nav.js';

const read = (rel) => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const dbs = {};
beforeAll(() => {
  const sb = { window: {}, console: { log() {} } };
  vm.createContext(sb);
  vm.runInContext(read('src/data/neobank-data.js'), sb);
  vm.runInContext(read('src/data/finans-fraud-data.js'), sb);
  for (const key of TICKET_DATASETS) {
    const ds = sb.window.publicDatasetsData[key];
    const db = new Database(':memory:');
    for (const [name, t] of Object.entries(ds.tables)) {
      const types = t.columns.map((_, i) => { const v = t.data[0]?.[i]; return typeof v === 'number' ? (Number.isInteger(v) ? 'INTEGER' : 'REAL') : 'TEXT'; });
      db.exec(`CREATE TABLE ${name} (${t.columns.map((c, i) => `${c} ${types[i]}`).join(', ')})`);
      const ins = db.prepare(`INSERT INTO ${name} VALUES (${t.columns.map(() => '?').join(',')})`);
      db.transaction(rows => rows.forEach(r => ins.run(r)))(t.data);
    }
    dbs[key] = db;
  }
});
const run = (key, sql) => dbs[key].prepare(sql.replace(/;\s*$/, '')).raw(true).all();

describe('tickets — the data', () => {
  it('ids are unique, every ticket has a person, a request, a reply prompt and at least one figure', () => {
    expect(new Set(TICKETS.map(t => t.id)).size).toBe(TICKETS.length);
    for (const t of TICKETS) {
      expect(t.from && t.request && t.reply && t.due, t.id).toBeTruthy();
      expect((t.expect.numbers.length + t.expect.text.length), t.id).toBeGreaterThan(0);
      for (const f of [...t.expect.numbers, ...t.expect.text]) expect(f.label, t.id).toMatch(/^the /);
    }
  });

  it('every reference query passes its own ticket on the dataset (the figures are the data’s)', () => {
    for (const t of TICKETS) {
      const g = gradeTicket(run(t.dataset, t.reference), t.expect);
      expect(g, t.id).toMatchObject({ passed: true, missing: [] });
    }
  });

  it('the risk-tier ticket rejects the join fan-out answer (chargebacks counted through the transactions join)', () => {
    const t = TICKETS.find(x => x.id === 't-chargeback-tier');
    const fanOut = "SELECT m.risk_tier, ROUND(100.0 * COUNT(c.chargeback_id) / COUNT(t.txn_id), 2) FROM merchants m JOIN transactions t ON t.merchant_id = m.merchant_id LEFT JOIN chargebacks c ON c.merchant_id = m.merchant_id GROUP BY m.risk_tier";
    expect(gradeTicket(run(t.dataset, fanOut), t.expect).passed).toBe(false);
  });

  it('the referral ticket rejects an answer that kept the never-verified users', () => {
    const t = TICKETS.find(x => x.id === 't-referral-kyc');
    const keptNulls = "SELECT referred_by IS NOT NULL, ROUND(AVG(COALESCE(julianday(kyc_verified_at), julianday('2026-09-01')) - julianday(signup_date)), 2) FROM users GROUP BY 1";
    expect(gradeTicket(run(t.dataset, keptNulls), t.expect).passed).toBe(false);
  });

  it('a dump of the table is not an answer, even when the figures are somewhere in it', () => {
    const t = TICKETS.find(x => x.id === 't-open-chargebacks');
    const rows = run(t.dataset, 'SELECT * FROM transactions');
    expect(rows.length).toBeGreaterThan(TICKET_MAX_ROWS);
    expect(gradeTicket(rows, t.expect)).toMatchObject({ passed: false, tooManyRows: true });
  });
});

describe('tickets — the grader', () => {
  it('tolerance, percent as a fraction, numeric strings, text case', () => {
    const pct = { value: 2.46, tol: 0.05, percent: true };
    expect(numberMatches(2.46, pct)).toBe(true);
    expect(numberMatches(2.5, pct)).toBe(true);
    expect(numberMatches(0.0246, pct)).toBe(true);
    expect(numberMatches('2.46%', pct)).toBe(true);
    expect(numberMatches(2.6, pct)).toBe(false);
    expect(numberMatches(0.0246, { value: 2.46, tol: 0.05 })).toBe(false);
    expect(numberMatches(19, { value: 19, tol: 0 })).toBe(true);
    expect(numberMatches(20, { value: 19, tol: 0 })).toBe(false);
    expect(textMatches(' Insufficient_Funds ', { value: 'insufficient_funds' })).toBe(true);
    expect(textMatches('insufficient', { value: 'insufficient_funds' })).toBe(false);
  });

  it('feedback names what is missing by label and never prints a value', () => {
    for (const t of TICKETS) {
      const g = gradeTicket([[0]], t.expect);
      const msg = ticketFeedback(g);
      for (const f of t.expect.numbers) expect(msg, t.id).not.toContain(String(f.value));
      for (const f of t.expect.text) expect(msg.toLowerCase(), t.id).not.toContain(String(f.value).toLowerCase());
      expect(msg).toMatch(/Still missing: the /);
    }
    expect(ticketFeedback(gradeTicket([], TICKETS[0].expect))).toMatch(/no rows/);
  });
});

describe('post-hire status and lock', () => {
  it('hired is its own intent, outside the hiring intents, set only by the person', () => {
    expect(HIRED_INTENT).toBe('hired');
    expect(HIRING_INTENTS.has(HIRED_INTENT)).toBe(false);
    expect(isHired({ goal: 'hired' })).toBe(true);
    expect(isHired({ goal: 'interview' })).toBe(false);
    expect(isHired(null)).toBe(false);
  });

  it('the first ticket is free; the rest are Pro; solved never locks', () => {
    expect(FREE_TICKETS).toBe(1);
    expect(ticketLocked({ index: 0, isPro: false, solved: false })).toBe(false);
    expect(ticketLocked({ index: 1, isPro: false, solved: false })).toBe(true);
    expect(ticketLocked({ index: 1, isPro: true, solved: false })).toBe(false);
    expect(ticketLocked({ index: 3, isPro: false, solved: true })).toBe(false);
  });

  it('the offer question: only after outcome=passed, once, never to someone already hired', () => {
    expect(shouldAskOffer({ outcome: 'passed', intentRecord: null, alreadyAsked: false })).toBe(true);
    expect(shouldAskOffer({ outcome: 'failed', intentRecord: null, alreadyAsked: false })).toBe(false);
    expect(shouldAskOffer({ outcome: 'passed', intentRecord: { goal: 'hired' }, alreadyAsked: false })).toBe(false);
    expect(shouldAskOffer({ outcome: 'passed', intentRecord: null, alreadyAsked: true })).toBe(false);
  });
});

describe('app.jsx wiring', () => {
  const app = read('src/app.jsx');
  it('the First 90 hooks sit above the early returns', () => {
    const hooks = app.indexOf('const [activeTicketId, setActiveTicketId] = useState(null);');
    expect(hooks).toBeGreaterThan(0);
    expect(hooks).toBeLessThan(app.indexOf('\n  if (showAuth) {\n'));
    expect(hooks).toBeLessThan(app.indexOf('\n  if (!dbReady) return ('));
  });

  it('tickets run on their own database per dataset, never the shared db', () => {
    const body = app.slice(app.indexOf('const runTicket = (submit) =>'), app.indexOf('const reviewTicketReply'));
    expect(body).toContain('ticketDbFor(ticket.dataset)');
    expect(body).not.toMatch(/\bdb\.exec\(/);
    expect(app).toContain('sqlCtorRef.current = SQL;');
  });

  it('the status goes through setUserIntent, the card and the overlays are mounted, the modal has its reason', () => {
    expect(app).toContain('setUserIntent(HIRED_INTENT, source);');
    expect(app).toContain('{hired && renderFirst90Card()}');
    expect(app).toContain('{renderTicketOverlay()}');
    expect(app).toContain('{renderOfferAsk()}');
    expect(app).toContain("proModalReason.type === 'post_hire'");
    expect(app).toContain('ticketLog: ticketLog,');
  });

  it('a hired person never gets the first-run shell (the placement quiz)', () => {
    expect(app).toContain('const isFirstRunUser = !firstRunCompleted && solvedChallenges.size === 0 && !isHired(intentRecord);');
  });

  it('no reference query is rendered: the UI never reads ticket.reference', () => {
    expect(app).not.toMatch(/\bticket\.reference\b|\bt\.reference\b/);
  });
});
