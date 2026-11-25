// PostgreSQL mode — ONE PGlite instance per browser session (2026-11-25).
//
// The spike booted a new instance for every challenge: 1.1–1.7 s per switch
// and, in the spike's Linux read, renderer peaks of 1.2–1.4 GB because a
// closed instance's WASM memory is not handed back promptly
// (docs/plans/postgres-mode-2026-11-22.md, "Why not yet", item 1). Here the
// instance is booted once; each challenge's tables live in their own schema
// (`c<id>`), the search_path points at it, and the previous challenge's
// schema is dropped when the next one is prepared. A switch costs the table
// load (5–60 ms), and memory holds at one instance.
//
// Every statement is queued (one at a time): a Submit runs the person's
// query and then the reference, and a challenge switch must not drop a
// schema under a query that is still running.
//
// Pure of the browser: `create` builds the PGlite instance, so the vitest
// suite drives this with the npm PGlite and the entry with the CDN one.
import { challengeTablePlan } from '../utils/challenge-datasets.js';
import { pgLoadSql, pgResultToSqlJs, splitStatements, PG_SESSION_SQL } from '../utils/pg-translate.js';

export const schemaFor = id => `c${String(id).replace(/[^0-9A-Za-z_]/g, '_')}`;

const READ_ONLY = /^\s*(SELECT|WITH|VALUES|TABLE|EXPLAIN|SHOW)\b/i;

export function createPgSession({ create, datasets }) {
  let pgPromise = null;
  let creates = 0;
  let active = null; // { id, schema, ready: Promise }
  const loadMs = {};
  let queue = Promise.resolve();
  const serial = fn => {
    const next = queue.then(fn, fn);
    queue = next.catch(() => {});
    return next;
  };

  const instance = () => {
    if (!pgPromise) {
      creates += 1;
      pgPromise = (async () => {
        const pg = await create();
        await pg.exec(PG_SESSION_SQL);
        return pg;
      })();
      pgPromise.catch(() => { pgPromise = null; });
    }
    return pgPromise;
  };

  // The challenge's schema, loaded once; the previous one dropped.
  function prepare(challenge) {
    if (active && active.id === challenge.id) return active.ready;
    const prev = active;
    const schema = schemaFor(challenge.id);
    const ready = serial(async () => {
      const pg = await instance();
      const t0 = Date.now();
      if (prev) await pg.exec(`DROP SCHEMA IF EXISTS ${prev.schema} CASCADE`).catch(() => {});
      await pg.exec(`DROP SCHEMA IF EXISTS ${schema} CASCADE; CREATE SCHEMA ${schema}; SET search_path TO ${schema};`);
      await pg.exec(pgLoadSql(challengeTablePlan(challenge, datasets()), datasets()));
      loadMs[challenge.id] = Date.now() - t0;
      return pg;
    });
    active = { id: challenge.id, schema, ready };
    ready.catch(() => { if (active && active.ready === ready) active = null; });
    return ready;
  }

  // Run a script on the challenge's schema. A script that writes runs in a
  // transaction that is rolled back, so the next run starts from the same
  // rows (what the SQLite path gets by reloading the dataset).
  async function exec(challenge, sql) {
    await prepare(challenge);
    const schema = schemaFor(challenge.id);
    return serial(async () => {
      if (!active || active.id !== challenge.id) throw new Error('the challenge changed');
      const pg = await instance();
      await pg.exec(`SET search_path TO ${schema}`);
      const stmts = splitStatements(sql);
      const writes = stmts.some(s => !READ_ONLY.test(s));
      if (writes) await pg.exec('BEGIN');
      try {
        let res = null;
        for (const s of stmts) res = await pg.query(s, [], { rowMode: 'array' });
        return res ? pgResultToSqlJs(res) : { columns: [], values: [] };
      } finally {
        if (writes) await pg.exec('ROLLBACK').catch(() => {});
      }
    });
  }

  return {
    prepare,
    exec,
    // What the memory walk and the tests read.
    instancesCreated: () => creates,
    liveInstances: () => (pgPromise ? 1 : 0),
    activeSchema: () => (active ? active.schema : null),
    loadMs: () => ({ ...loadMs }),
    close: async () => {
      const p = pgPromise;
      pgPromise = null;
      active = null;
      if (p) await (await p).close();
    },
  };
}
