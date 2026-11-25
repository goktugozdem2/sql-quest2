// PostgreSQL mode — the ship shape's guards (2026-11-25, flag `postgresMode`,
// still false). Plan, walk checklist and the flip/revert rule:
// docs/plans/postgres-mode-flip-2026-11-25.md. The spike's guards stay in
// tests/postgres-mode.test.js.
//
//   1. ONE PGlite instance per session (src/pg-mode/session.js): five
//      challenge switches boot one instance, leave one challenge schema, and
//      each challenge sees only its own tables; a write is rolled back; a
//      person's `SET search_path` does not strand the next run.
//   2. The opt-in gate (src/utils/postgres-mode-gate.js): under 768 px, a
//      device that reports under 4 GB, or a touch-first device (iPad), the
//      switch does not render — and
//      app.jsx reads the gate inside `postgresModeOn`, so the effect, Run
//      and Submit are gated with it.
//   3. The events postgres_mode_use reads exist where the metric says, and
//      none of them is a `challenge_` event (a verdict is never a solve).
//   4. app.js still carries no engine: the session lives in pg-mode.js.
//
// Breaks that proved them (the commit lists them): the previous schema's
// DROP removed; a new instance per challenge; the width floor set to 360;
// `pgModeFits` taken out of `postgresModeOn`; the coarse-pointer line
// removed from pgModeFits.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { createPgSession, schemaFor } from '../src/pg-mode/session.js';
import { pgModeFits, pgFailReason, PG_MODE_EVENTS, PG_MODE_MIN_WIDTH } from '../src/utils/postgres-mode-gate.js';
import { PG_TEXT_PARSED_OIDS } from '../src/utils/pg-translate.js';
import { loadBank } from '../scripts/pg/run-bank.mjs';

const here = rel => fileURLToPath(new URL(rel, import.meta.url));
const read = rel => readFileSync(here(rel), 'utf8');

// ── 1. One instance, a schema per challenge ─────────────────────────────
describe('one PGlite instance per session, a schema per challenge', () => {
  const { datasets, bank } = loadBank();
  const byId = id => bank.find(c => c.id === id);
  let created = 0;
  let session;
  const parsers = Object.fromEntries(PG_TEXT_PARSED_OIDS.map(o => [o, v => v]));
  beforeAll(() => {
    session = createPgSession({
      datasets: () => datasets,
      create: async () => { created += 1; return PGlite.create({ parsers }); },
    });
  });
  afterAll(async () => { await session?.close(); });

  const one = async (c, sql) => (await session.exec(c, sql)).values;
  const challengeSchemas = c => one(c, "SELECT nspname FROM pg_namespace WHERE nspname ~ '^c[0-9]+$' ORDER BY 1");

  it('five switches boot one instance and leave one challenge schema', async () => {
    for (const id of [99, 118, 285, 110, 300, 99]) {
      const c = byId(id);
      expect(c, `#${id}`).toBeTruthy();
      expect(await one(c, 'SELECT 1')).toEqual([[1]]);
      expect(await challengeSchemas(c), `after #${id}`).toEqual([[schemaFor(id)]]);
      expect(session.activeSchema()).toBe(schemaFor(id));
    }
    expect(created).toBe(1);
    expect(session.instancesCreated()).toBe(1);
    expect(session.liveInstances()).toBe(1);
  }, 120000);

  it("each challenge sees only its own tables (118's orders are gone on 99)", async () => {
    const c118 = byId(118);
    expect((await one(c118, 'SELECT COUNT(*) > 0 FROM orders'))[0][0]).toBe(1);
    const c99 = byId(99);
    await one(c99, 'SELECT 1');
    const where = await one(c99, "SELECT table_schema FROM information_schema.tables WHERE table_name = 'orders'");
    expect(where.flat().filter(s => s !== schemaFor(99))).toEqual([]);
  }, 60000);

  it('a write is rolled back: the next run sees the same rows', async () => {
    const c = byId(99);
    const [[before]] = await one(c, 'SELECT COUNT(*) FROM employees');
    expect(before).toBeGreaterThan(0);
    expect(await one(c, 'DELETE FROM employees; SELECT COUNT(*) FROM employees')).toEqual([[0]]);
    expect(await one(c, 'SELECT COUNT(*) FROM employees')).toEqual([[before]]);
  }, 60000);

  it("a person's SET search_path does not strand the next run", async () => {
    const c = byId(99);
    await one(c, 'SET search_path TO public; SELECT 1');
    expect((await one(c, 'SELECT COUNT(*) > 0 FROM employees'))[0][0]).toBe(1);
  }, 60000);
});

// ── 2. The opt-in gate ──────────────────────────────────────────────────
describe('the switch shows only where an instance fits', () => {
  it('768 px and up; phones never', () => {
    expect(PG_MODE_MIN_WIDTH).toBe(768);
    for (const width of [320, 375, 414, 767]) expect(pgModeFits({ width }), `${width}`).toBe(false);
    for (const width of [768, 1024, 1366]) expect(pgModeFits({ width }), `${width}`).toBe(true);
    expect(pgModeFits({})).toBe(false);
  });
  it('a device that reports under 4 GB does not get it; one that reports nothing is judged by width', () => {
    expect(pgModeFits({ width: 1366, deviceMemory: 2 })).toBe(false);
    expect(pgModeFits({ width: 1366, deviceMemory: 4 })).toBe(true);
    expect(pgModeFits({ width: 1366, deviceMemory: undefined })).toBe(true);
  });
  it('a touch-first device (iPad, Android tablet) waits with the phones, whatever its width', () => {
    expect(pgModeFits({ width: 1024, coarsePointer: true })).toBe(false);
    expect(pgModeFits({ width: 820, coarsePointer: true, deviceMemory: 8 })).toBe(false);
    expect(pgModeFits({ width: 1024, coarsePointer: false })).toBe(true);
  });
  it('app.jsx folds the gate into postgresModeOn, so the toggle, the effect, Run and Submit share it', () => {
    const app = read('../src/app.jsx');
    expect(app).toMatch(/const postgresModeOn = window\.FF\?\.feature\?\.\('postgresMode'\) === true\n\s+&& pgModeFits\(\{ width: window\.innerWidth, deviceMemory: navigator\.deviceMemory, coarsePointer: !!window\.matchMedia\?\.\('\(pointer: coarse\)'\)\?\.matches \}\);/);
    expect(app).toMatch(/import \{[^}]*pgModeFits[^}]*\} from '\.\/utils\/postgres-mode-gate\.js';/);
  });
  it('the default engine stays SQLite', () => {
    expect(read('../src/app.jsx')).toContain("const [sqlEngine, setSqlEngine] = useState('sqlite');");
  });
});

// ── 3. Events ───────────────────────────────────────────────────────────
describe('the postgres_mode_* events', () => {
  const app = read('../src/app.jsx');
  it('every event name is postgres_mode_*, never a challenge_ event', () => {
    for (const name of Object.values(PG_MODE_EVENTS)) expect(name).toMatch(/^postgres_mode_[a-z_]+$/);
  });
  it('each is fired from the app, and the metric names each one', () => {
    const metrics = read('../docs/agent/metrics.md');
    for (const [key, name] of Object.entries(PG_MODE_EVENTS)) {
      expect(app, key).toContain(`trackActivationEvent(PG_MODE_EVENTS.${key},`);
      expect(metrics, name).toContain(name);
    }
    expect(metrics).toMatch(/^## `postgres_mode_use`/m);
  });
  it('the submit event rides the verdict path that records nothing', () => {
    const start = app.indexOf('const runChallengeQueryPg = async (submit) => {');
    const body = app.slice(start, app.indexOf('const submitChallenge = () => {', start));
    expect(body).toContain('trackActivationEvent(PG_MODE_EVENTS.submitted, { challengeId: currentChallenge.id, verdict });');
  });
  it('a failure is stored as a short reason, never the message or a query', () => {
    expect(pgFailReason('PGlite pglite.wasm: HTTP 403')).toBe('HTTP 403');
    expect(pgFailReason("Failed to execute 'fetch': The resource has been blocked (integrity)")).toBe('integrity');
    expect(pgFailReason('engine did not load')).toBe('engine_script');
    expect(pgFailReason('Failed to fetch')).toBe('network');
    expect(pgFailReason('relation "secret_table" does not exist')).toBe('other');
  });
});

// ── 4. app.js carries no engine ─────────────────────────────────────────
describe('the session ships in pg-mode.js, not app.js', () => {
  it('app.jsx does not import the session; the engine does', () => {
    expect(read('../src/app.jsx')).not.toMatch(/from ['"][^'"]*pg-mode\/session/);
    expect(read('../src/pg-mode/entry.js')).toMatch(/import \{ createPgSession \} from '\.\/session\.js';/);
    expect(read('../src/pg-mode/entry.js')).not.toMatch(/new Map\(\)/);
  });
  it('the built app.js has no session code (the bundle in git; CI tests before it builds)', () => {
    expect(read('../public/app.js')).not.toMatch(/DROP SCHEMA|createPgSession/);
    expect(read('../src/pg-mode/session.js')).toMatch(/DROP SCHEMA IF EXISTS \$\{prev\.schema\} CASCADE/);
  });
});
