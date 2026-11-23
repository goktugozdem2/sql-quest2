// Guard on .github/workflows/uiux-daily.yml (A4's daily cross-browser audit).
// The job runs against production every day, so what it must never do is
// written here: it is scheduled, hermetic, installs both engines, keeps its
// report 14 days, touches one labelled issue, prints no secret, and is
// advisory (no rollback, no deploy, no other job depends on it).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

const src = fs.readFileSync(new URL('../.github/workflows/uiux-daily.yml', import.meta.url), 'utf8');
// Comments explain; the guard reads what runs.
const code = src.split('\n').filter(l => !/^\s*#/.test(l)).join('\n');

describe('uiux-daily.yml', () => {
  it('runs at 05:40 UTC daily and by hand', () => {
    expect(code).toMatch(/schedule:\s*\n\s*- cron: '40 5 \* \* \*'/);
    expect(code).toMatch(/\n\s*workflow_dispatch:/);
    expect(code).not.toMatch(/\n\s*(push|pull_request|workflow_run):/);
  });
  it('is hermetic: both flags set, the device matrix against production', () => {
    expect(code).toMatch(/UIUX_HERMETIC: '1'/);
    expect(code).toMatch(/SMOKE_HERMETIC: '1'/);
    expect(code).toMatch(/UIUX_URL: https:\/\/sqlquest\.app/);
    expect(code).toMatch(/uiux-audit\.mjs --base "\$UIUX_URL" --matrix devices/);
  });
  it('installs a pinned Playwright and both engines, with their system deps', () => {
    expect(code).toMatch(/PLAYWRIGHT_VERSION: \d+\.\d+\.\d+/);
    expect(code).toMatch(/npx playwright install --with-deps chromium webkit/);
    expect(code).toMatch(/\bnpm ci\b/);
  });
  it('keeps the report and screenshots for 14 days, even when a step fails', () => {
    expect(code).toMatch(/actions\/upload-artifact@v4[\s\S]*?path: uiux-out[\s\S]*?retention-days: 14/);
    expect(code).toMatch(/if: always\(\)\s*\n\s*uses: actions\/upload-artifact/);
  });
  it('touches one issue, and a job failure comments on it', () => {
    expect(code).toMatch(/uiux-issue\.mjs --findings uiux-out\/findings\.json\s*\n?\s*--previous uiux-last\/findings\.json/);
    expect(code).toMatch(/if: failure\(\)[\s\S]*uiux-issue\.mjs --failure/);
    const issue = fs.readFileSync(new URL('../scripts/smoke/uiux-issue.mjs', import.meta.url), 'utf8');
    expect(issue).toMatch(/export const LABEL = 'uiux-audit'/);
  });
  it('prints no secret: only the workflow token, passed by env, never echoed', () => {
    const secrets = [...code.matchAll(/\$\{\{\s*secrets\.([A-Z_]+)/g)].map(m => m[1]);
    expect(secrets).toEqual([]);
    expect(code).not.toMatch(/echo[^\n]*(TOKEN|SECRET|KEY)/i);
    expect(code).not.toMatch(/set -x/);
    for (const line of code.split('\n').filter(l => /github\.token/.test(l))) expect(line).toMatch(/^\s*GH_TOKEN: \$\{\{ github\.token \}\}$/);
    const issue = fs.readFileSync(new URL('../scripts/smoke/uiux-issue.mjs', import.meta.url), 'utf8');
    expect(issue).not.toMatch(/console\.\w+\([^)]*process\.env\.GH_TOKEN/);
  });
  it('is advisory: least permissions, no rollback, no deploy, no write to the repo', () => {
    expect(code).toMatch(/permissions:\s*\n\s*contents: read\s*\n\s*issues: write\s*\n/);
    expect(code).not.toMatch(/rollback|vercel|supabase functions deploy|git push|contents: write/i);
  });
  it('the harness refuses a production base without UIUX_HERMETIC=1', () => {
    const audit = fs.readFileSync(new URL('../scripts/smoke/uiux-audit.mjs', import.meta.url), 'utf8');
    expect(audit).toMatch(/const refusal = hermeticRefusal\(opts\.base\);\s*\n\s*if \(refusal\) \{ console\.error\(refusal\); process\.exit\(2\); \}/);
    // And the stubs it relies on: Supabase, edge functions (the tutor), /api/, analytics.
    expect(audit).toMatch(/const HERMETIC_ROUTE = \/supabase\\\.co\|functions\\\/v1\|vercel-insights\|va\\\.vercel\|clarity\\\.ms\|googletagmanager\|google-analytics\|\\\/api\\\/\|\\\/_vercel\\\/\//);
    expect(audit).toMatch(/await ctx\.addInitScript\(HERMETIC_PREAMBLE\);/);
  });
});
