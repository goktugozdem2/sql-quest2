// Why the Pro modal gets closed — source guards (2026-09-14).
//
// Measured over the 30 days to 2026-09-14: 209 people were shown the Pro
// modal and 7 clicked a plan. 3.3%, flat for at least three weeks, so the
// modal is not broken — it does not work. And nothing in the product could
// say why, because `modal_dismissed` was fired with no payload at all.
//
// One of the four close paths ("Maybe later", in the email-capture step)
// fired nothing, so even the dismissal COUNT was short of the truth. A
// funnel step that undercounts its own exits is worse than one with no
// instrumentation, because the number looks real.
//
// `dismissProModal(via)` is now the only way the modal closes, and it records
// via / msOpen / sawPlans. These tests fail if a fifth close path appears
// without going through it, or if the payload is quietly dropped.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.resolve(import.meta.dirname, '../src/app.jsx'), 'utf8');

describe('every way out of the Pro modal is counted', () => {
  it('no close path fires modal_dismissed by hand any more', () => {
    // The raw call is what left three paths with no payload and one with no
    // event. dismissProModal is the only caller now.
    const raw = [...src.matchAll(/trackProEvent\(\s*'modal_dismissed'/g)];
    expect(raw.length, `${raw.length} hand-rolled modal_dismissed calls — route them through dismissProModal`).toBe(1);
    const at = src.indexOf("trackProEvent('modal_dismissed'");
    const helper = src.indexOf('const dismissProModal');
    expect(at).toBeGreaterThan(helper);
    expect(at - helper).toBeLessThan(400); // the one call is inside the helper
  });

  it('no close path closes the modal without saying so', () => {
    // setShowProModal(false) outside the helper is a silent exit. The three
    // legitimate ones are the helper itself and the two places that close it
    // on success (purchase restored, deep-link handoff) — those are not
    // dismissals and are allowed, so this pins the count rather than zero.
    const closes = [...src.matchAll(/setShowProModal\(false\)/g)].length;
    expect(closes, 'a new setShowProModal(false) appeared — is it a dismissal? route it through dismissProModal').toBe(3);
  });

  it('records the three things that separate the hypotheses', () => {
    const helper = src.slice(src.indexOf('const dismissProModal'), src.indexOf('const dismissProModal') + 500);
    for (const key of ['via', 'msOpen', 'sawPlans']) {
      expect(helper, `dismissProModal no longer records ${key}`).toContain(key);
    }
  });

  it('each close path names itself, and they are distinct', () => {
    const vias = [...src.matchAll(/dismissProModal\('([a-z_]+)'\)/g)].map(m => m[1]);
    expect(vias.length, 'expected four close paths').toBe(4);
    expect(new Set(vias).size, `two paths share a name: ${vias.join(', ')}`).toBe(4);
    expect(vias.sort()).toEqual(['backdrop', 'button', 'escape', 'maybe_later']);
  });

  it('the plan cards are marked so "did they ever see a price" is answerable', () => {
    expect(src, 'the [data-pro-plans] hook is gone — sawPlans will be false for everyone').toContain('data-pro-plans');
    expect(src).toContain("document.querySelector('[data-pro-plans]')");
  });

  it('the open stamp resets every time the modal opens', () => {
    // Without the reset, msOpen measures time since the FIRST open of the
    // session and every later number is nonsense.
    const eff = src.slice(src.indexOf('if (!showProModal) return;'), src.indexOf('if (!showProModal) return;') + 300);
    expect(eff).toContain('proModalOpenedAtRef.current = Date.now()');
    expect(eff).toContain('proModalPlansSeenRef.current = false');
  });
});
