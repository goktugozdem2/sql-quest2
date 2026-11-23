// The mock list and a mock in progress fit a phone (A4 UI/UX audit,
// 2026-11-22). At 375 px the Interview tab scrolled 37 px sideways — each
// mock card was one unwrapped flex row — and a timed mock's "✕ Quit" sat
// at x 402–432, past the window's overflow-hidden edge: the only way out
// of a timed mock, unreachable. Measured by `npm run uiux` (U1, U2, U5);
// this guard pins the wrapping that fixed it.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/app.jsx', import.meta.url), 'utf8');
const classOf = (marker) => {
  const i = app.indexOf(marker);
  expect(i, marker).toBeGreaterThan(-1);
  const tag = app.slice(app.lastIndexOf('<', i), app.indexOf('>', i) + 1);
  const m = tag.match(/className="([^"]+)"/);
  return m ? m[1].split(/\s+/) : [];
};

describe('mock cards stack on a phone', () => {
  it('the card row is a column below sm and a row from sm', () => {
    const c = classOf('data-testid="mock-card-row"');
    expect(c).toContain('flex-col');
    expect(c).toContain('sm:flex-row');
  });
  it('the text column can shrink, and its badge and meta rows wrap', () => {
    const seg = app.slice(app.indexOf('data-testid="mock-card-row"'), app.indexOf('{/* Interview History */}'));
    expect(seg).toContain('className="flex-1 min-w-0"');
    expect(seg).toContain('className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2"');
    expect(seg).toContain('className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"');
    expect(seg).not.toContain('className="text-right ml-4"');
  });
});

describe('a mock in progress keeps Quit on screen', () => {
  it('the header wraps, and Quit sits in the wrapping group', () => {
    expect(classOf('data-testid="interview-header"')).toContain('flex-wrap');
    const header = app.slice(app.indexOf('data-testid="interview-header"'), app.indexOf('{/* Progress Bar */}'));
    expect(header).toContain('data-testid="interview-quit"');
    expect(header).toContain('className="flex flex-wrap items-center gap-2 sm:gap-4 ml-auto"');
  });
});
