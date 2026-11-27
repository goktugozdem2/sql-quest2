// A guest who runs out of tutor calls (ai-tutor 429, plan 'guest') is asked
// to make an account. Until 2026-11-27 that ask opened the signup modal
// directly: no `signup_prompt_shown` row (so it never counted), and the
// generic "You're on fire! You've earned 0 XP and solved 0 challenges!" copy
// — seen by a stuck guest at 0 solves after four "show me the solution"
// clicks on 11-26 (A3, docs/reads/errors-2026-11-27.md). These pin the fix.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const app = fs.readFileSync(path.join(ROOT, 'src/app.jsx'), 'utf8');

describe('the tutor-limit signup ask', () => {
  it("goes through triggerSignupPrompt('ai_limit') on a guest 429, so it is counted", () => {
    const start = app.indexOf("if (data.plan === 'guest') {");
    expect(start).toBeGreaterThan(0);
    const branch = app.slice(start, app.indexOf('return `**AI Limit Reached**', start));
    expect(branch).toContain("triggerSignupPrompt('ai_limit')");
    expect(branch).not.toContain('setShowSignupPrompt(true)');
  });

  it('triggerSignupPrompt still records signup_prompt_shown with the reason', () => {
    const start = app.indexOf('const triggerSignupPrompt = (reason) => {');
    expect(start).toBeGreaterThan(0);
    const body = app.slice(start, start + 800);
    expect(body).toContain("trackActivationEvent('signup_prompt_shown', { promptReason: reason })");
  });

  it("gives ai_limit its own title and body, never the solve-count praise", () => {
    const modal = app.indexOf('{/* Guest Signup Prompt Modal */}');
    expect(modal).toBeGreaterThan(0);
    const head = app.slice(modal, app.indexOf('</h2>', modal));
    const ai = head.indexOf("signupPromptReason === 'ai_limit' ?");
    const praise = head.indexOf("'You\\'re on fire!'");
    expect(ai).toBeGreaterThan(0);
    expect(ai).toBeLessThan(praise);
    const body = app.slice(app.indexOf('</h2>', modal), app.indexOf('</p>', modal));
    const aiBody = body.indexOf("signupPromptReason === 'ai_limit'");
    expect(aiBody).toBeGreaterThan(0);
    expect(aiBody).toBeLessThan(body.indexOf("You've earned ${xp} XP"));
    expect(body).toContain('${TUTOR_FREE_DAILY_LIMIT} tutor calls a day');
  });
});
