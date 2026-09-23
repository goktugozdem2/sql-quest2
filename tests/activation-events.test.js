// The two events the 2026-09-23 scorecard needed (docs/agent/scorecard.md):
// the first run on a challenge (92% of opens that never became a solve had no
// submit at all) and opening the challenge hint. Source guards: both doors
// into running a query mark the first run, and the hint button records the
// open, not the close.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const app = fs.readFileSync(path.join(import.meta.dirname, '..', 'src/app.jsx'), 'utf8');
const body = name => { const i = app.indexOf(`const ${name} = () => {`); return app.slice(i, i + 400); };

describe('activation events', () => {
  it('Run and Submit both mark the first run', () => {
    expect(body('runChallengeQuery')).toContain("markChallengeFirstRun('run')");
    expect(body('submitChallenge')).toContain("markChallengeFirstRun('submit')");
  });
  it('the first run is sent once per challenge', () => {
    expect(app).toMatch(/firstRunSentRef\.current\.has\(id\)\) return;/);
    expect(app).toMatch(/trackActivationEvent\('challenge_first_run', \{ challengeId: id, via, secondsOpen/);
  });
  it('the hint button records an open, never a close', () => {
    expect(app).toMatch(/if \(!showChallengeHint && currentChallenge\) trackActivationEvent\('challenge_hint_opened'/);
  });
});

describe('the receipt-email step is visible in the data (2026-09-23)', () => {
  it('records the step when it is shown, and a close with a plan pending', () => {
    expect(app).toMatch(/setCheckoutPendingPlan\(plan\);\n\s*trackActivationEvent\('checkout_email_step_shown', \{ plan \}\);/);
    expect(app).toMatch(/emailStepPending: checkoutPendingPlan \|\| null/);
  });
});
