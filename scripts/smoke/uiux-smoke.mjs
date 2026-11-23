// The audit's critical checks as one ADVISORY smoke step (A4 brief, step 6).
// scripts/smoke-test.js runs it only with SMOKE_UIUX=1: the homepage, one
// company page and the challenge page, at 375 and 1366, checks U1 U2 U7 U8.
// It prints its result and never fails the run; making it blocking is the
// founder's call after a week of clean runs.
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const UIUX_SMOKE_SURFACES = Object.freeze(['/', '/capital-one-sql-interview/', 'app:challenge-result']);
export const UIUX_SMOKE_VIEWPORTS = Object.freeze(['phone-s', 'laptop']);
export const UIUX_SMOKE_CHECKS = Object.freeze(['U1', 'U2', 'U7', 'U8']);

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

export function uiuxSmokeArgs(base, out) {
  return [
    '--base', base,
    '--out', out,
    '--pages', UIUX_SMOKE_SURFACES.map(s => `^${escape(s)}$`).join('|'),
    '--viewports', UIUX_SMOKE_VIEWPORTS.join(','),
    '--themes', 'dark',
    '--checks', UIUX_SMOKE_CHECKS.join(','),
    '--concurrency', '3',
    '--no-shots',
  ];
}

export function summarizeUiux(result) {
  const f = (result && result.findings) || [];
  if (!f.length) return { clean: true, line: `uiux (advisory): 0 findings — ${UIUX_SMOKE_CHECKS.join(' ')} at ${UIUX_SMOKE_VIEWPORTS.join(', ')}` };
  const rows = f.slice(0, 8).map(x => `${x.check} ${x.page} ${x.viewport} ${x.selector} — ${x.detail}`);
  return { clean: false, line: `uiux (advisory): ${f.length} finding(s)\n    ` + rows.join('\n    ') };
}

export function runUiuxAdvisory(base) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'uiux-smoke-'));
  const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'uiux-audit.mjs');
  return new Promise((resolve) => {
    execFile(process.execPath, [script, ...uiuxSmokeArgs(base, out)], { timeout: 180000 }, (err) => {
      try {
        const r = JSON.parse(fs.readFileSync(path.join(out, 'findings.json'), 'utf8'));
        resolve(summarizeUiux(r));
      } catch (_) {
        resolve({ clean: null, line: `uiux (advisory): could not run — ${String(err && err.message || 'no findings.json').split('\n')[0]}` });
      }
    });
  });
}
