// SQL Quest — content_lock_reached dedupe
//
// THE DEFECT (2026-08-21 lock read, docs/agent/ledger.md)
//
// One click on a locked Hard row wrote ~3 `content_lock_reached` rows, 192ms
// apart: 47 raw events for 16 people. Every per-hit metric on that event was
// ~3x inflated; the read only held up because it counted people.
//
// The rule these tests pin: at most one event per user+challenge per 2s,
// scope PER CHALLENGE — a different locked challenge inside the window is a
// second real intent and must still fire. And the helper fails OPEN: a
// malformed input emits rather than swallowing a real collision.

import { describe, it, expect } from 'vitest';
import {
  shouldEmitLockEvent,
  lockEventKey,
  LOCK_EVENT_WINDOW_MS,
} from '../src/utils/lock-events.js';

const T0 = 1_757_100_000_000; // an arbitrary fixed epoch-ms

describe('shouldEmitLockEvent', () => {
  it('emits on the first call for a key and records the timestamp', () => {
    const state = {};
    expect(shouldEmitLockEvent(state, 'u:11', T0)).toBe(true);
    expect(state['u:11']).toBe(T0);
  });

  it('suppresses a second call inside 2s — the 192ms multi-fire', () => {
    const state = {};
    expect(shouldEmitLockEvent(state, 'u:11', T0)).toBe(true);
    expect(shouldEmitLockEvent(state, 'u:11', T0 + 192)).toBe(false);
    expect(shouldEmitLockEvent(state, 'u:11', T0 + 384)).toBe(false);
    expect(shouldEmitLockEvent(state, 'u:11', T0 + 1999)).toBe(false);
  });

  it('emits again once 2s have passed', () => {
    const state = {};
    expect(shouldEmitLockEvent(state, 'u:11', T0)).toBe(true);
    expect(shouldEmitLockEvent(state, 'u:11', T0 + 192)).toBe(false);
    expect(shouldEmitLockEvent(state, 'u:11', T0 + LOCK_EVENT_WINDOW_MS)).toBe(true);
    expect(state['u:11']).toBe(T0 + LOCK_EVENT_WINDOW_MS);
    // A genuine second click 3s after the last EMISSION is a second collision.
    expect(shouldEmitLockEvent(state, 'u:11', T0 + LOCK_EVENT_WINDOW_MS + 3000)).toBe(true);
  });

  it('a suppressed hit does not extend the window — bursts anchor to the emission', () => {
    const state = {};
    shouldEmitLockEvent(state, 'u:11', T0);
    shouldEmitLockEvent(state, 'u:11', T0 + 1500);   // suppressed
    expect(state['u:11']).toBe(T0);                  // timestamp untouched
    // 2.1s after the emission, only 600ms after the suppressed hit: emits.
    expect(shouldEmitLockEvent(state, 'u:11', T0 + 2100)).toBe(true);
  });

  it('keys are independent — a different locked challenge inside 2s still fires', () => {
    const state = {};
    expect(shouldEmitLockEvent(state, 'u:11', T0)).toBe(true);
    expect(shouldEmitLockEvent(state, 'u:23', T0 + 100)).toBe(true);
    expect(shouldEmitLockEvent(state, 'u:11', T0 + 200)).toBe(false);
    expect(shouldEmitLockEvent(state, 'u:23', T0 + 300)).toBe(false);
  });

  it('keys are independent across people on the same challenge', () => {
    const state = {};
    expect(shouldEmitLockEvent(state, lockEventKey('ana', 11), T0)).toBe(true);
    expect(shouldEmitLockEvent(state, lockEventKey('ben', 11), T0 + 50)).toBe(true);
  });

  it('respects the windowMs parameter', () => {
    const state = {};
    expect(shouldEmitLockEvent(state, 'u:11', T0, 500)).toBe(true);
    expect(shouldEmitLockEvent(state, 'u:11', T0 + 400, 500)).toBe(false);
    expect(shouldEmitLockEvent(state, 'u:11', T0 + 500, 500)).toBe(true);
    // The default is the documented 2s constant.
    expect(LOCK_EVENT_WINDOW_MS).toBe(2000);
    const s2 = {};
    shouldEmitLockEvent(s2, 'u:11', T0);
    expect(shouldEmitLockEvent(s2, 'u:11', T0 + 1999)).toBe(false);
    expect(shouldEmitLockEvent(s2, 'u:11', T0 + 2000)).toBe(true);
  });

  it('accepts a Map as the state store', () => {
    const state = new Map();
    expect(shouldEmitLockEvent(state, 'u:11', T0)).toBe(true);
    expect(state.get('u:11')).toBe(T0);
    expect(shouldEmitLockEvent(state, 'u:11', T0 + 10)).toBe(false);
    expect(shouldEmitLockEvent(state, 'u:11', T0 + 2500)).toBe(true);
    expect(state.get('u:11')).toBe(T0 + 2500);
  });

  it('emits when the clock went backwards instead of suppressing for the jump', () => {
    const state = {};
    shouldEmitLockEvent(state, 'u:11', T0);
    expect(shouldEmitLockEvent(state, 'u:11', T0 - 60_000)).toBe(true);
    expect(state['u:11']).toBe(T0 - 60_000);
  });

  it('fails open on malformed input — a dedupe bug must never drop a real collision', () => {
    expect(shouldEmitLockEvent(null, 'u:11', T0)).toBe(true);
    expect(shouldEmitLockEvent(undefined, 'u:11', T0)).toBe(true);
    expect(shouldEmitLockEvent({}, '', T0)).toBe(true);
    expect(shouldEmitLockEvent({}, null, T0)).toBe(true);
    expect(shouldEmitLockEvent({}, 'u:11', NaN)).toBe(true);
    expect(shouldEmitLockEvent({}, 'u:11', undefined)).toBe(true);
    // A corrupt stored value is ignored, not trusted.
    const state = { 'u:11': 'not-a-number' };
    expect(shouldEmitLockEvent(state, 'u:11', T0)).toBe(true);
    expect(state['u:11']).toBe(T0);
  });

  it('does not read inherited object keys as prior emissions', () => {
    const state = {};
    // 'constructor' etc. exist on Object.prototype; they are not timestamps.
    expect(shouldEmitLockEvent(state, 'constructor', T0)).toBe(true);
    expect(shouldEmitLockEvent(state, 'constructor', T0 + 10)).toBe(false);
  });
});

describe('lockEventKey', () => {
  it('formats as user:challengeId', () => {
    expect(lockEventKey('goktug', 11)).toBe('goktug:11');
    expect(lockEventKey('4a07da30', 23)).toBe('4a07da30:23');
  });

  it('falls back to guest when no username or aid is available', () => {
    expect(lockEventKey(null, 11)).toBe('guest:11');
    expect(lockEventKey(undefined, 11)).toBe('guest:11');
    expect(lockEventKey('', 11)).toBe('guest:11');
  });
});
