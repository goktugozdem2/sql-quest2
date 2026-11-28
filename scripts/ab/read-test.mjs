#!/usr/bin/env node
// Read one live A/B with GrowthBook's stats engine (builder, 2026-11-24).
//
// Two steps, because no database credential lives on this machine or in the
// repo (README rule 2: production is read through the Supabase MCP, read-only;
// never a service-role key here):
//
//   1. node scripts/ab/read-test.mjs companyDirectOpen
//        prints the read-only SQL for the test's arms. Run it through
//        mcp__supabase__execute_sql. It returns rows {arm, users, conversions}.
//   2. node scripts/ab/read-test.mjs companyDirectOpen --counts '<the rows as JSON>'
//        (or --counts-file rows.json, or the rows on stdin with --counts -)
//        pipes them into scripts/ab/read.py (gbstats) and prints the read.
//
//   node scripts/ab/read-test.mjs --list
//   --python <path>   the venv's python (default $AB_PYTHON, else python3);
//                     always run with -I. Install: scripts/ab/requirements.txt.
//   --since <ISO>     window start (default: the test's flip)
//   --format json     machine output from read.py
//   --secondary       read the test's secondary metric (the SQL's
//                     secondary_conversions column), where it has one
//
// The SQL is the metric exactly as docs/agent/metrics.md defines it, with the
// README step-2 population filters (internal names, stamped bots, crawler
// window sizes, the app1lang crawler, the founder's 2026-11-24 walk guests).
// A metric's definition changes in metrics.md first, then here (rule 6b).

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const INTERNAL_RE = '^(test|qa_|fabletest|linktest|internalroutine|sqlquest$|elena$)';
export const CRAWLER_VIEWPORTS = ['tablet:800x600', 'desktop:1280x1200', 'desktop:1919x992', 'desktop:1024x1024'];

/** The population CTEs every test shares: `ev` (clean events since the
 *  window minus a day) and `excluded` (people to drop). */
export function populationSql(since) {
  const vps = CRAWLER_VIEWPORTS.map((v) => `'${v}'`).join(', ');
  return `with ev as (
  select coalesce(((metadata #>> '{}')::jsonb)->>'aid', username) pid, event, created_at,
         (metadata #>> '{}')::jsonb m
  from pro_events
  where created_at >= timestamptz '${since}' - interval '1 day'
    and coalesce(username, '') !~* '${INTERNAL_RE}'
),
excluded as (
  /* stamped bots, crawler window sizes, referrer spam */
  select distinct pid from ev
  where coalesce(m->>'bot', '') not in ('', 'false')
     or m->>'viewport' in (${vps})
     or coalesce(m->>'ref', '') ilike '%aocr.org%'
  union
  /* app1lang / topic1lang crawler: first app_opened with no landingSrc,
     langs = 1, and no landing_view (C8 2026-11-24, README rule 2) */
  select f.pid from (
    select distinct on (pid) pid, m from ev where event = 'app_opened' order by pid, created_at
  ) f
  where coalesce(f.m->>'landingSrc', '') = '' and f.m->>'langs' = '1'
    and not exists (select 1 from ev l where l.pid = f.pid and l.event = 'landing_view')
  union
  /* the founder's walk guests, 2026-11-24 11:00-11:08 UTC */
  select distinct pid from ev
  where created_at >= timestamptz '2026-11-24 11:00:00+00' and created_at < timestamptz '2026-11-24 11:09:00+00'
    and m->>'tz' = 'Europe/Istanbul' and m->>'viewport' = 'mobile:375x812'
)`;
}

export const TESTS = {
  companyDirectOpen: {
    flag: 'companyDirectOpen',
    metric: 'company_direct_split: first_solve_10m from assignment',
    secondary: 'company_direct_split: first run within 10 minutes of assignment',
    ledger: 'a company arrival opens question 1 (`companyDirectOpen`, A/B)',
    since: '2026-11-23T00:00:00Z',
    control: 'list',
    arms: ['list', 'direct'],
    sql: (since) => `${populationSql(since)},
arm as (
  select distinct on (pid) pid, m->>'arm' arm, created_at t0
  from ev where event = 'company_direct_assigned' and created_at >= timestamptz '${since}'
  order by pid, created_at
)
select a.arm, count(*) users,
  count(*) filter (where exists (
    select 1 from ev e where e.pid = a.pid and e.event = 'challenge_solved'
      and e.created_at >= a.t0 and e.created_at <= a.t0 + interval '10 minutes')) conversions,
  count(*) filter (where exists (
    select 1 from ev e where e.pid = a.pid and e.event = 'challenge_first_run'
      and e.created_at >= a.t0 and e.created_at <= a.t0 + interval '10 minutes')) secondary_conversions
from arm a
where a.pid not in (select pid from excluded)
  and a.t0 < now() - interval '10 minutes'   /* a full 10-minute window */
group by a.arm order by a.arm;`,
  },
  mobileOneLayer: {
    flag: 'mobileOneLayer',
    metric: 'second_solve_same_session, mobile band',
    ledger: 'One layer at a time after a solve on phones (`mobileOneLayer`)',
    since: '2026-11-24T00:00:00Z',
    control: 'control',
    arms: ['control', 'one'],
    sql: (since) => `${populationSql(since)},
arm as (
  select distinct on (pid) pid, m->>'arm' arm, created_at t0
  from ev where event = 'mobile_one_layer_assigned' and created_at >= timestamptz '${since}'
  order by pid, created_at
),
fs as (
  select * from (
    select distinct on (pid) pid, created_at t1, m->>'challengeId' cid, split_part(m->>'viewport', ':', 1) band
    from ev where event = 'first_challenge_solved' order by pid, created_at
  ) x where t1 < now() - interval '1 hour'
),
pop as (
  select a.pid, a.arm, fs.t1, fs.cid from arm a join fs using (pid)
  where fs.band = 'mobile' and a.t0 <= fs.t1 + interval '1 minute'
    and a.pid not in (select pid from excluded)
),
seq as (
  select e.pid, e.created_at, e.event, e.m->>'challengeId' cid,
         e.created_at - lag(e.created_at) over (partition by e.pid order by e.created_at) gap
  from ev e join pop p using (pid) where e.created_at >= p.t1
),
brk as (select pid, min(created_at) tbreak from seq where gap > interval '30 minutes' group by pid),
second as (
  select distinct s.pid from seq s join pop p using (pid) left join brk b using (pid)
  where s.event = 'challenge_solved' and s.cid is distinct from p.cid
    and (b.tbreak is null or s.created_at < b.tbreak)
)
select p.arm, count(*) users, count(second.pid) conversions
from pop p left join second using (pid)
group by p.arm order by p.arm;`,
  },
  mobileRunBar: {
    flag: 'mobileRunBar',
    metric: 'open_to_first_run, mobile band, by arm',
    ledger: 'Run stays on screen on phones (`mobileRunBar`)',
    since: null, // dark on 2026-11-24: pass --since <flip> once it is on
    control: 'control',
    arms: ['control', 'bar'],
    sql: (since) => `${populationSql(since)},
arm as (
  select distinct on (pid) pid, m->>'arm' arm, m->>'challengeId' cid, created_at t0,
         split_part(m->>'viewport', ':', 1) band
  from ev where event = 'mobile_run_bar_assigned' and created_at >= timestamptz '${since}'
  order by pid, created_at
)
select a.arm, count(*) users,
  count(*) filter (where exists (
    select 1 from ev e where e.pid = a.pid and e.event = 'challenge_first_run'
      and e.m->>'challengeId' = a.cid and e.created_at >= a.t0)) conversions
from arm a
where a.band = 'mobile' and a.pid not in (select pid from excluded)
group by a.arm order by a.arm;`,
  },
};

export function parseArgs(argv) {
  const out = { test: null, secondary: false, counts: null, countsFile: null, python: null, since: null, format: 'text', list: false, help: false };
  const needs = (i, flag) => {
    if (i + 1 >= argv.length) throw new Error(`${flag} needs a value`);
    return argv[i + 1];
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--list') out.list = true;
    else if (a === '-h' || a === '--help') out.help = true;
    else if (a === '--secondary') out.secondary = true;
    else if (a === '--counts') out.counts = needs(i, a), i++;
    else if (a === '--counts-file') out.countsFile = needs(i, a), i++;
    else if (a === '--python') out.python = needs(i, a), i++;
    else if (a === '--since') out.since = needs(i, a), i++;
    else if (a === '--format') {
      out.format = needs(i, a); i++;
      if (!['text', 'json'].includes(out.format)) throw new Error(`--format is text or json, got ${out.format}`);
    } else if (a.startsWith('-')) throw new Error(`unknown option ${a}`);
    else if (out.test) throw new Error(`one test id at a time (got ${out.test} and ${a})`);
    else out.test = a;
  }
  if (out.since && !/^\d{4}-\d{2}-\d{2}([T ][\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/.test(out.since)) {
    throw new Error(`--since must be an ISO date or timestamp, got ${out.since}`);
  }
  if (out.counts && out.countsFile) throw new Error('give --counts or --counts-file, not both');
  return out;
}

export function getTest(id) {
  const t = TESTS[id];
  if (!t) throw new Error(`unknown test ${id}; known: ${Object.keys(TESTS).join(', ')}`);
  return t;
}

/** The SQL for a test, for the window starting at `since` (or the flip). */
export function sqlFor(id, since) {
  const t = getTest(id);
  const start = since || t.since;
  if (!start) throw new Error(`${id} has no flip date on record: pass --since <ISO> once it is on`);
  return t.sql(start);
}

/** Rows from the MCP (array of {arm, users, conversions}, numbers or strings)
 *  → the payload read.py takes. Rejects arms the test does not have.
 *  `secondary` reads the `secondary_conversions` column instead. */
export function buildPayload(id, rows, since, { secondary = false } = {}) {
  const t = getTest(id);
  if (secondary && !t.secondary) throw new Error(`${id} has no secondary metric`);
  const col = secondary ? 'secondary_conversions' : 'conversions';
  const list = Array.isArray(rows) ? rows : rows?.result ?? rows?.rows;
  if (!Array.isArray(list)) throw new Error('counts must be a JSON array of {arm, users, conversions}');
  const arms = list.map((r) => {
    if (!t.arms.includes(r.arm)) throw new Error(`arm ${JSON.stringify(r.arm)} is not an arm of ${id} (${t.arms.join(', ')})`);
    if (r[col] === undefined) throw new Error(`row for arm ${r.arm} has no ${col} column`);
    return { arm: r.arm, users: Number(r.users), conversions: Number(r[col]) };
  });
  for (const name of t.arms) {
    if (!arms.some((a) => a.arm === name)) arms.push({ arm: name, users: 0, conversions: 0 });
  }
  return { test: id, metric: secondary ? t.secondary : t.metric, window: `since ${since || t.since}`, control: t.control, arms };
}

function runPython(python, payload, format) {
  const res = spawnSync(python, ['-I', path.join(HERE, 'read.py'), '--format', format], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
  });
  if (res.error) throw new Error(`could not run ${python}: ${res.error.message}. Pass --python <venv>/bin/python (scripts/ab/requirements.txt).`);
  process.stdout.write(res.stdout);
  process.stderr.write(res.stderr);
  return res.status ?? 1;
}

function main(argv) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (e) {
    console.error(`read-test: ${e.message}`);
    return 2;
  }
  if (args.help || (!args.test && !args.list)) {
    const src = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1);
    const header = src.slice(0, src.findIndex((l) => !l.startsWith('//')));
    console.log(header.map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
    return args.help ? 0 : 2;
  }
  if (args.list) {
    for (const [id, t] of Object.entries(TESTS)) {
      console.log(`${id.padEnd(18)} ${t.arms.join(' vs ').padEnd(16)} ${t.metric}  (since ${t.since || 'not flipped'})`);
    }
    return 0;
  }
  try {
    getTest(args.test);
    if (!args.counts && !args.countsFile) {
      console.error(`-- ${args.test}: ${getTest(args.test).metric}. Read-only; run via mcp__supabase__execute_sql,`);
      console.error(`-- then: node scripts/ab/read-test.mjs ${args.test} --counts '<rows JSON>'`);
      console.log(sqlFor(args.test, args.since));
      return 0;
    }
    const raw = args.countsFile ? fs.readFileSync(args.countsFile, 'utf8') : args.counts === '-' ? fs.readFileSync(0, 'utf8') : args.counts;
    const payload = buildPayload(args.test, JSON.parse(raw), args.since, { secondary: args.secondary });
    return runPython(args.python || process.env.AB_PYTHON || 'python3', payload, args.format);
  } catch (e) {
    console.error(`read-test: ${e.message}`);
    return 2;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
