// Mobile navigation and CTA visibility (founder's list, 2026-09-14).
//
// Measured on the live preview at 402x874 (iPhone 17 Pro CSS pixels) before
// the fix:
//   - Practice / Interview Prep / Pricing were display:none. The two things
//     people come to the site for had no door on a phone.
//   - The hero's "Start free" sat at y=731 of an 874px viewport — the last
//     thing above the fold, after a 208px paragraph.
//   - In the app, the feedback bubble (fixed bottom-4 right-4, z-40) covered
//     the right 27px of the challenge screen's sticky Submit button (z-20).
//
// After: nav row at y=100, "Start free" at 539-585, bubble at 750-794 with
// the action bar at 809-874. These are source guards on the three fixes; they
// fail if someone deletes the rule that makes each one true.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

const home = read('src/index.html');
const mobileBlock = home.slice(home.indexOf('@media(max-width:768px){'), home.indexOf('.cm-wrap{'));

describe('phone nav row', () => {
  it('exposes Practice and Interview Prep outside the hidden .nl links', () => {
    const row = home.match(/<div class="mnav">[\s\S]*?<\/div>/);
    expect(row, 'the .mnav row is gone').toBeTruthy();
    expect(row[0]).toContain('/sql-exercises/');
    expect(row[0]).toContain('/sql-interview-prep/');
  });

  it('is hidden by default and shown only on a phone', () => {
    // The base rule must come BEFORE the media query: same specificity, so a
    // later `display:none` would win and hide the row on phones too.
    const base = home.indexOf('.mnav{display:none}');
    const query = home.indexOf('@media(max-width:768px){');
    expect(base).toBeGreaterThan(-1);
    expect(base).toBeLessThan(query);
    expect(mobileBlock).toMatch(/\.mnav\{display:flex/);
  });

  it('sits outside .ni, which is a space-between flex row', () => {
    expect(home).toMatch(/<\/div>\s*<div class="mnav">[\s\S]*?<\/div>\s*<\/nav>/);
  });
});

describe('hero CTA above the fold on a phone', () => {
  it('orders the CTA ahead of the long paragraph', () => {
    expect(mobileBlock).toContain('.hl>.hcta{order:4');
    expect(mobileBlock).toContain('.hl>.hstory{order:5');
  });

  it('clears the fixed nav, which is taller now', () => {
    // Banner (36) + .ni (64) + .mnav (36) = 136. The eyebrow rendered behind
    // the nav at 104.
    const m = mobileBlock.match(/\.hero>\.sec\{[^}]*padding-top:(\d+)px !important/);
    expect(m, 'the hero lost its mobile padding override').toBeTruthy();
    expect(Number(m[1])).toBeGreaterThanOrEqual(136);
  });
});

describe('no overlay covers the challenge screen controls', () => {
  it('lifts the feedback bubble above the sticky Run / Submit bar on a phone', () => {
    expect(read('src/app.jsx')).toContain('sq-feedback-fab fixed bottom-4 right-4 z-40');
    const css = read('src/input.css');
    const block = css.slice(css.indexOf('.sq-feedback-fab'));
    const m = block.match(/bottom:\s*(\d+)px/);
    expect(m, 'the .sq-feedback-fab clearance rule is gone').toBeTruthy();
    // The bar measured 65px tall; anything less and the bubble is back on top
    // of Submit.
    expect(Number(m[1])).toBeGreaterThan(65);
  });
});
