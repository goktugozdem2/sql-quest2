// The Coach page, made real (2026-09-12, P0-4). The landing mockup
// (scripts/coach-mock-snippet.html) is embedded in two ad pages and promises a
// goal, a step counter, a NAMED next challenge with difficulty and topics, an
// "up next" line and a 9-axis radar. These guards pin the live tab to that
// promise, and pin the two things that must NOT have changed: what the card
// offers (the engine and the handler) and the paywall-surfaces stamping.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
const app = read('../src/app.jsx');
const i18n = read('../src/utils/i18n.js');
const mock = read('../scripts/coach-mock-snippet.html');

// The Coach block: from the full-shell gate to the countdown marker.
const coachStart = app.indexOf("activeTab === 'guide' && currentUser && !showSimpleLearningShell");
const coachEnd = app.indexOf('── Interview countdown', coachStart);
const coach = app.slice(coachStart, coachEnd);

describe('Coach page — what the mockup promises is on the live tab', () => {
  it('locates the Coach block', () => {
    expect(coachStart).toBeGreaterThan(-1);
    expect(coachEnd).toBeGreaterThan(coachStart);
  });

  it('shows "Step N of M" next to the percentage, exact for curriculum steps only', () => {
    expect(coach).toMatch(/data-testid="coach-step-counter"/);
    expect(coach).toMatch(/i18n_t\('coach', 'stepOf', \{ n: stepPos \+ 1, m: curriculum\.length \}\)/);
    expect(coach).toMatch(/stepPos >= 0 \? i18n_t\('coach', 'stepOf'/);
  });

  it('names the next challenge or lesson, with difficulty, topics and XP', () => {
    expect(coach).toMatch(/stepType === 'challenge' && \(stepChallenge\s*\n?\s*\? `\$\{i18n_t\('coachNext', 'challenge'\)\} · \$\{localizeChallenge\(stepChallenge, cardLang\)\.title\}`/);
    expect(coach).toMatch(/stepType === 'lesson' && \(stepLesson/);
    expect(coach).toMatch(/data-testid="coach-step-chips"/);
    expect(coach).toMatch(/stepChallenge\.skills/);
    expect(coach).toMatch(/i18n_t\('coach', 'xpChip', \{ n: stepChallenge\.xpReward \}\)/);
    // no invented minutes anywhere on the card or the mockup
    expect(coach).not.toMatch(/~\d+ min/);
    expect(mock).not.toMatch(/~\d+ min/);
  });

  it('shows the following curriculum step as "up next", display only', () => {
    expect(coach).toMatch(/data-testid="coach-up-next"/);
    expect(coach).toMatch(/const upNext = stepPos >= 0 \? \(curriculum\[stepPos \+ 1\] \|\| null\) : null;/);
    // not a button: the Coach gives one answer, and this is a preview of the next one
    const upStart = coach.indexOf('data-testid="coach-up-next"');
    const upNextBlock = coach.slice(upStart, coach.indexOf('</p>', upStart));
    expect(upNextBlock).not.toMatch(/onClick/);
  });

  it('renders the 9-axis radar from state the solves already computed — never the expensive recompute', () => {
    expect(coach).toMatch(/data-testid="coach-radar-panel"/);
    expect(coach).toMatch(/<SkillRadar skills=\{normalized\} size=\{240\}/);
    expect(coach).toMatch(/radarNormalizeSkills\(weaknessTracking\?\.skillLevels \|\| \{\}\)/);
    // the panel itself never calls the recompute (the countdown block below it does, behind its flag)
    const panel = coach.slice(coach.indexOf('── Skill radar on the Coach'));
    expect(panel).not.toMatch(/calculateSkillLevelsFromPerformance\(/);
    expect(coach).toMatch(/i18n_t\('coach', 'streakDays', \{ n: dailyStreak \|\| 0 \}\)/);
  });

  it('keeps the countdown card inside the Coach tab, after the radar', () => {
    // tests/interview-prep.test.js pins the countdown to the Coach; this pins its order
    const radarAt = app.indexOf('data-testid="coach-radar-panel"', coachStart);
    const countdownAt = app.indexOf("window.FF?.feature?.('interviewCountdown') === true && (() => {", coachStart);
    expect(radarAt).toBeGreaterThan(coachStart);
    expect(countdownAt).toBeGreaterThan(radarAt);
  });

  it('does not change what the card offers: engine call, handler and preview stamping are untouched', () => {
    expect(coach).toMatch(/onClick=\{\(\) => handleCoachStepStart\(next\.step\)\}/);
    expect(coach).toMatch(/const isHardPreview = stepType === 'challenge' && next\.step\.reason === HARD_PREVIEW_MARKER;/);
    expect(coach).toMatch(/if \(isHardPreview\) coachPreviewOfferRef\.current\.shown = true;/);
    expect(app).toMatch(/openedFrom: 'preview_coach'/);
  });

  it('measures the click: coach_step_started, with the step, never the outcome', () => {
    expect(app).toMatch(/trackActivationEvent\('coach_step_started', \{/);
    const at = app.indexOf("trackActivationEvent('coach_step_started'");
    const block = app.slice(at, at + 400);
    expect(block).toMatch(/preview: step\.reason === HARD_PREVIEW_MARKER/);
  });

  it('copy exists in both languages', () => {
    for (const key of ['stepOf', 'upNext', 'xpChip', 'skillRadar', 'radarOverall', 'weakestThree', 'radarEmpty', 'streakDays', 'solvesCount']) {
      expect((i18n.match(new RegExp(`\\b${key}: '`, 'g')) || []).length, `${key} in EN and TR`).toBe(2);
    }
  });
});
