#!/usr/bin/env node
// Record a check that has no result file of its own (scripts/smoke-test.js
// prints and exits): `node scripts/smoke/record.mjs <check> <exit code> <log file>`.
// Then `node scripts/smoke/record.mjs --verdict` reads every result, prints
// the classification, writes `failed` / `frontend_dead` to GITHUB_OUTPUT and
// exits 1 when anything failed. Both are one-liners the workflow used to
// inline; they live here so tests/smoke-workflow.test.js can hold them.
import fs from 'node:fs';
import { writeResult, readResults, classifyRun, CLASSES } from './lib.mjs';

export function batteryResult(check, exitCode, log, { advisory = false } = {}) {
  const lines = String(log || '').split('\n');
  const ok = Number(exitCode) === 0;
  // Exit 2 is the script's own "crashed" (no Chrome, no tab, socket lost);
  // exit 1 is a check that ran and failed. With `advisory` (env
  // SMOKE_BATTERY_ADVISORY=1 in the workflow) a failure is recorded as such
  // and does not fail the run — see classifyRun in lib.mjs for why.
  const crashed = Number(exitCode) === 2 || /Smoke test crashed/.test(log);
  return {
    check,
    ok,
    class: ok ? 'ok' : advisory ? CLASSES.ADVISORY : crashed ? CLASSES.INFRA : CLASSES.BUSINESS,
    detail: ok
      ? { summary: lines.filter(l => /passed$/.test(l.trim())).join(' ') }
      : { summary: lines.filter(l => /passed$/.test(l.trim())).join(' '), failed: lines.filter(l => /✗|crashed/.test(l)).slice(0, 12) },
  };
}

export function verdict(results, out = process.env.GITHUB_OUTPUT) {
  const r = classifyRun(results);
  if (out) {
    fs.appendFileSync(out, `failed=${r.failed.join(',')}\n`);
    fs.appendFileSync(out, `frontend_dead=${r.frontendDead ? 'true' : 'false'}\n`);
  }
  return r;
}

if (process.argv[1] && /record\.mjs$/.test(process.argv[1])) {
  if (process.argv[2] === '--verdict') {
    const r = verdict(readResults());
    console.log(JSON.stringify(r));
    process.exit(r.failed.length ? 1 : 0);
  } else {
    const [check, code, logFile] = process.argv.slice(2);
    const log = logFile && fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : '';
    const row = writeResult(batteryResult(check, code, log, { advisory: process.env.SMOKE_BATTERY_ADVISORY === '1' }));
    console.log(`${row.ok ? '✓' : '✗'} ${check} recorded (${row.class})`);
  }
}
