import { describe, it, expect } from 'vitest';
import { getNextPhase } from '../src/utils/socratic-tutor.js';

describe('Socratic tutor phase transitions', () => {
  // --- HOOK ---
  it('hook → probe on any response', () => {
    const { nextPhase } = getNextPhase('hook', 'I would filter the list somehow');
    expect(nextPhase).toBe('probe');
  });

  it('hook → probe even on empty-ish response', () => {
    const { nextPhase } = getNextPhase('hook', 'ok');
    expect(nextPhase).toBe('probe');
  });

  // --- PROBE ---
  it('probe → attempt on any response', () => {
    const { nextPhase } = getNextPhase('probe', 'I have used SELECT before');
    expect(nextPhase).toBe('attempt');
  });

  // --- ATTEMPT ---
  it('attempt → discover when student submits SQL', () => {
    const { nextPhase, stateUpdates } = getNextPhase('attempt', 'SELECT * FROM passengers WHERE survived = 1');
    expect(nextPhase).toBe('discover');
    expect(stateUpdates.attemptSQL).toBe('SELECT * FROM passengers WHERE survived = 1');
    expect(stateUpdates.discoverRounds).toBe(0);
  });

  it('attempt → reveal when student says "I don\'t know"', () => {
    const { nextPhase, stateUpdates } = getNextPhase('attempt', "I don't know how to do this");
    expect(nextPhase).toBe('reveal');
    expect(stateUpdates.skippedAttempt).toBe(true);
    expect(stateUpdates.studentHistory).toBe('needed_full_reveal');
  });

  it('attempt → reveal on "idk"', () => {
    const { nextPhase } = getNextPhase('attempt', 'idk');
    expect(nextPhase).toBe('reveal');
  });

  it('attempt → reveal on "not sure"', () => {
    const { nextPhase } = getNextPhase('attempt', "I'm not sure what to write");
    expect(nextPhase).toBe('reveal');
  });

  it('attempt → reveal on "show me"', () => {
    const { nextPhase } = getNextPhase('attempt', 'just show me the answer');
    expect(nextPhase).toBe('reveal');
  });

  it('attempt → reveal on "i give up"', () => {
    const { nextPhase } = getNextPhase('attempt', 'i give up');
    expect(nextPhase).toBe('reveal');
  });

  it('attempt → discover on plain English (not idk)', () => {
    const { nextPhase } = getNextPhase('attempt', 'maybe I would use a filter keyword');
    expect(nextPhase).toBe('discover');
  });

  // --- DISCOVER ---
  it('discover → discover on first round', () => {
    const { nextPhase, stateUpdates } = getNextPhase('discover', 'I think WHERE?', { discoverRounds: 0 });
    expect(nextPhase).toBe('discover');
    expect(stateUpdates.discoverRounds).toBe(1);
  });

  it('discover → reveal after 2 rounds', () => {
    const { nextPhase, stateUpdates } = getNextPhase('discover', 'hmm still not sure', { discoverRounds: 1 });
    expect(nextPhase).toBe('reveal');
    expect(stateUpdates.studentHistory).toBe('struggled_discover');
  });

  it('discover → reveal immediately on idk', () => {
    const { nextPhase } = getNextPhase('discover', "I don't know, just tell me", { discoverRounds: 0 });
    expect(nextPhase).toBe('reveal');
  });

  // --- REVEAL ---
  it('reveal → practice on any response', () => {
    const { nextPhase } = getNextPhase('reveal', 'That makes sense, ready to practice');
    expect(nextPhase).toBe('practice');
  });

  // --- PRACTICE ---
  it('practice → feedback on any response', () => {
    const { nextPhase } = getNextPhase('practice', 'SELECT * FROM passengers WHERE survived = 1');
    expect(nextPhase).toBe('feedback');
  });

  // --- FEEDBACK ---
  it('feedback → practice when consecutiveCorrect < 3', () => {
    const { nextPhase } = getNextPhase('feedback', 'next question', { consecutiveCorrect: 2 });
    expect(nextPhase).toBe('practice');
  });

  it('feedback → mastery when consecutiveCorrect >= 3', () => {
    const { nextPhase } = getNextPhase('feedback', 'next', { consecutiveCorrect: 3 });
    expect(nextPhase).toBe('mastery');
  });

  it('feedback → mastery when consecutiveCorrect is 5', () => {
    const { nextPhase } = getNextPhase('feedback', 'ok', { consecutiveCorrect: 5 });
    expect(nextPhase).toBe('mastery');
  });

  // --- MASTERY ---
  it('mastery stays in mastery (waits for [RESULT:mastery] from AI)', () => {
    const { nextPhase } = getNextPhase('mastery', 'WHERE filters rows based on a condition');
    expect(nextPhase).toBe('mastery');
  });

  // --- Full flow test ---
  it('full Socratic flow: hook → probe → attempt → discover → reveal → practice → feedback → mastery', () => {
    let phase = 'hook';
    let state = { discoverRounds: 0, consecutiveCorrect: 0 };

    // hook → probe
    ({ nextPhase: phase } = getNextPhase(phase, 'I would look through the list'));
    expect(phase).toBe('probe');

    // probe → attempt
    ({ nextPhase: phase } = getNextPhase(phase, 'I know a bit of SQL'));
    expect(phase).toBe('attempt');

    // attempt → discover
    let result = getNextPhase(phase, 'SELECT * FROM passengers');
    phase = result.nextPhase;
    state = { ...state, ...result.stateUpdates };
    expect(phase).toBe('discover');

    // discover round 1 → discover
    result = getNextPhase(phase, 'maybe add WHERE?', state);
    phase = result.nextPhase;
    state = { ...state, ...result.stateUpdates };
    expect(phase).toBe('discover');

    // discover round 2 → reveal
    result = getNextPhase(phase, 'WHERE survived = 1?', state);
    phase = result.nextPhase;
    expect(phase).toBe('reveal');

    // reveal → practice
    ({ nextPhase: phase } = getNextPhase(phase, 'Got it, ready to practice'));
    expect(phase).toBe('practice');

    // practice → feedback
    ({ nextPhase: phase } = getNextPhase(phase, 'SELECT name FROM passengers WHERE survived = 1'));
    expect(phase).toBe('feedback');

    // feedback with 3 correct → mastery
    ({ nextPhase: phase } = getNextPhase(phase, 'next', { consecutiveCorrect: 3 }));
    expect(phase).toBe('mastery');
  });

  it('skip flow: attempt idk → reveal → practice', () => {
    let phase = 'hook';

    ({ nextPhase: phase } = getNextPhase(phase, 'sure'));
    expect(phase).toBe('probe');

    ({ nextPhase: phase } = getNextPhase(phase, 'never used SQL'));
    expect(phase).toBe('attempt');

    const result = getNextPhase(phase, "I don't know");
    phase = result.nextPhase;
    expect(phase).toBe('reveal');
    expect(result.stateUpdates.skippedAttempt).toBe(true);
    expect(result.stateUpdates.studentHistory).toBe('needed_full_reveal');

    ({ nextPhase: phase } = getNextPhase(phase, 'oh I see'));
    expect(phase).toBe('practice');
  });
});
