// The app's primary tab row fits a 320 px phone (A4 UI/UX audit, issue #308,
// run 2026-11-25 16:25, U1 on the Galaxy S9+ row).
//
// Learning Path · Challenges · Interview sit in one row on every app screen
// (first run, challenge, list, quota wall, Pro modal, Interview tab, mock).
// The row was three equal tracks (`grid-cols-3` = minmax(0, 1fr)) with
// px-3 buttons and a nowrap label + count line. At 320 px each track is
// ~86 px, its content box ~62 px, and "Challenges" (77 px, 14 px bold) plus
// its count chip (36 px) held 135 px: the document ran 6-52 px sideways on
// all 12 app screens audited (24 criticals, both themes).
//
// Below sm the tracks are now sized to their content (minmax(min-content,
// 1fr)), the buttons use px-2 and the count chip wraps under the label.
// From sm up the row is the same grid-cols-3 / px-3 as before.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'src/app.jsx'), 'utf8');

function tabRow() {
  const i = SRC.indexOf('data-primary-learning-tabs="true"');
  expect(i, 'the primary tab row exists').toBeGreaterThan(-1);
  const j = SRC.indexOf("{activeTab === 'quests' && (", i);
  return SRC.slice(i, j);
}

describe('the primary tab row fits a 320 px phone', () => {
  const row = tabRow();
  const gridClass = row.match(/className=\{`mb-4 grid [^`]*`\}/)?.[0] || '';

  it('the three-tab row is content-sized below sm (never three 0-minimum tracks at 320)', () => {
    expect(gridClass).toContain("'grid-cols-[repeat(3,minmax(min-content,1fr))] sm:grid-cols-3'");
    expect(gridClass).not.toMatch(/\? 'grid-cols-3'/);
  });

  it('every tab button pads px-2 on a phone and px-3 from sm', () => {
    const buttons = row.match(/min-h-\[54px\][^`]*/g) || [];
    expect(buttons.length).toBe(3);
    for (const b of buttons) {
      expect(b).toMatch(/\bpx-2\b/);
      expect(b).toMatch(/\bsm:px-3\b/);
      expect(b).not.toMatch(/(^|\s)px-3\b/);
    }
  });

  it('the label + count line wraps instead of forcing one 135 px line', () => {
    const lines = row.match(/<span className="flex [^"]*justify-between[^"]*">/g) || [];
    expect(lines.length).toBe(3);
    for (const l of lines) expect(l).toContain('flex-wrap');
  });
});
