// On a phone the exit-reason / day-2 prompt card sits above the 💬 bubble
// (2026-11-23). The bubble lifts to bottom:80px under 768px (to clear the
// challenge Run/Submit bar); the card was also at 80px (bottom-20), so the
// 44px bubble covered the right edge of the card's Send button (A2 live QA).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const css = fs.readFileSync(path.join(ROOT, 'src/input.css'), 'utf8');
const built = fs.readFileSync(path.join(ROOT, 'public/styles.css'), 'utf8');
const app = fs.readFileSync(path.join(ROOT, 'src/app.jsx'), 'utf8');

const phoneBlock = /@media \(max-width: 768px\) \{([\s\S]*?)\n\}/.exec(css)?.[1] || '';
const px = (sel) => Number(new RegExp(sel.replace(/[[\]"=.]/g, (c) => '\\' + c) + '\\s*\\{\\s*bottom:\\s*(\\d+)px').exec(phoneBlock)?.[1]);

describe('feedback prompt card vs the 💬 bubble on a phone', () => {
  it('the card sits at least the bubble\'s 44px height above it', () => {
    const fab = px('.sq-feedback-fab');
    const slot = px('[data-feedback-prompt-slot="global"]');
    expect(fab).toBeGreaterThan(0);
    expect(slot - fab).toBeGreaterThanOrEqual(44);
  });
  it('the built CSS carries the rule after the bottom-20 utility, so it wins', () => {
    const i = built.indexOf('[data-feedback-prompt-slot=global]{bottom:');
    expect(i).toBeGreaterThan(built.indexOf('.bottom-20{'));
  });
  it('the slot the rule targets still exists in the app', () => {
    expect(app).toContain('data-feedback-prompt-slot="global"');
  });
});
