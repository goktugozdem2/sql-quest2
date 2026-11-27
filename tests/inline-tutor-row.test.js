// The challenge page's inline tutor input row on a phone (A2, 2026-11-25).
//
// Live walk after the 11-25 deploy: at 375 px and 320 px, opening the tutor
// on a challenge (Help, or the 💬 widget's new "tutor" link from #234) put
// the input, "Show me the answer" (socraticLadder) and Send in one flex row.
// An <input> keeps its intrinsic ~196 px width inside a flex row, so the row
// ran to 456 px: Send sat off screen and the whole page scrolled sideways
// (document 456 px wide at 375). The row now wraps and the input keeps a
// 12rem floor, so the buttons drop to a second line instead.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const app = fs.readFileSync(path.join(ROOT, 'src/app.jsx'), 'utf8');

const PLACEHOLDER = 'placeholder="Ask about this challenge..."';

function inputRow() {
  const at = app.indexOf(PLACEHOLDER);
  const open = app.lastIndexOf('<div className=', at);
  const close = app.indexOf('</div>', at);
  return { at, row: app.slice(open, app.indexOf('>', open) + 1), input: app.slice(app.lastIndexOf('<input', at), app.indexOf('/>', at)), body: app.slice(open, close) };
}

describe('inline tutor input row fits a phone', () => {
  it('the row exists once, with the input, the bypass button and Send', () => {
    expect(app.split(PLACEHOLDER).length - 1).toBe(1);
    const { body } = inputRow();
    expect(body).toContain('data-testid="tutor-bypass"');
    expect(body).toContain('Send');
  });

  it('the row wraps, so the buttons drop to a second line instead of running off screen', () => {
    const { row } = inputRow();
    expect(row).toContain('data-testid="inline-tutor-input-row"');
    expect(row).toMatch(/className="[^"]*\bflex-wrap\b/);
  });

  it('the input keeps a width floor, so it does not shrink to nothing when the buttons share its line', () => {
    const { input } = inputRow();
    expect(input).toMatch(/className="[^"]*\bflex-1\b/);
    expect(input).toMatch(/className="[^"]*\bmin-w-\[12rem\]/);
  });
});
